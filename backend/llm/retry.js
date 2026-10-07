// Retries transient model/network failures (resets, timeouts, rate limits,
// 5xx) with backoff; anything else is thrown straight away.
export async function withRetry(fn, { tries = 5, label = "llm" } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = `${err.message} ${err.cause?.code ?? ""} ${err.status ?? ""}`;
      const transient = /fetch failed|ECONNRESET|ETIMEDOUT|EPIPE|socket|timeout|429|500|502|503|504|overloaded|unavailable|RESOURCE_EXHAUSTED/i.test(msg);
      if (!transient || attempt >= tries) throw err;
      // Rate limits say how long to back off ("retry in 27.6s" / retryDelay "27s").
      const asked = msg.match(/"retryDelay":\s*"([\d.]+)s"/i);
      const askedMs = asked ? parseFloat(asked[1]) * 1000 + 500 : 0;
      // A long ask (e.g. "retry in 17h") means a daily quota is gone — waiting won't help.
      if (askedMs > 90_000 || /PerDay/i.test(msg)) throw Object.assign(err, { quotaExhausted: true });
      const wait = Math.max(1500 * 2 ** (attempt - 1), askedMs);
      console.warn(`[${label}] attempt ${attempt} failed (${shortError(err)}); retrying in ${Math.round(wait / 1000)}s`);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
}

// Provider errors are often a whole JSON blob; keep the human part.
export function shortError(err) {
  const msg = String(err?.message ?? err);
  if (err?.quotaExhausted || /PerDay/i.test(msg)) return "the AI service's daily quota is used up";
  if (/429|RESOURCE_EXHAUSTED|quota/i.test(msg)) return "the AI service's rate limit was hit";
  if (/503|UNAVAILABLE|high demand|overloaded/i.test(msg)) return "the AI service is overloaded right now";
  const inner = msg.match(/"message":\s*"([^"]+)"/);
  return (inner ? inner[1] : msg).slice(0, 160);
}

// Runs fn over items in chunks with a small concurrency cap; results keep order.
export async function inChunks(items, size, concurrency, fn) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  const results = new Array(chunks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, chunks.length) }, async () => {
      while (next < chunks.length) {
        const k = next++;
        results[k] = await fn(chunks[k]);
      }
    })
  );
  return results.flat();
}

// True for failures caused by the AI service itself (down, overloaded,
// rate-limited, out of quota) rather than by our request.
export function isServiceError(err) {
  const msg = `${err?.message ?? ""} ${err?.cause?.code ?? ""} ${err?.status ?? ""}`;
  return !!err?.quotaExhausted || /fetch failed|ECONNRESET|ETIMEDOUT|EPIPE|socket|timeout|429|500|502|503|504|overloaded|unavailable|RESOURCE_EXHAUSTED|quota/i.test(msg);
}

// Describes photos in batches. A batch that still fails after retries is
// skipped (its photos get default descriptions) — unless every batch fails,
// in which case the error is thrown so a fallback provider can take over.
export async function describeInBatches(photos, size, concurrency, describeBatch, label) {
  let failures = 0, lastErr = null;
  const out = await inChunks(photos, size, concurrency, (batch) =>
    withRetry(() => describeBatch(batch), { label }).catch((err) => {
      failures++;
      lastErr = err;
      console.error(`[${label}] batch failed, skipping:`, shortError(err));
      return [];
    })
  );
  if (failures > 0 && out.length === 0) throw lastErr;
  return out;
}
