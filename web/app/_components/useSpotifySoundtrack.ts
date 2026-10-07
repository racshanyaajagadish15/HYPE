"use client";

import { useEffect, useRef, useState } from "react";

// Spotify's official Embed (iFrame) API: https://developer.spotify.com/documentation/embeds/references/iframe-api
// It plays through Spotify itself — the full track if the viewer is logged in
// to Spotify in this browser, otherwise Spotify's 30s preview — and needs no
// extra OAuth scope or Premium (the Web Playback SDK would need both).
type PlaybackUpdate = { data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number } };
type Controller = {
  loadUri(uri: string): void;
  play(): void;
  pause(): void;
  resume(): void;
  seek(seconds: number): void;
  destroy(): void;
  addListener(event: "ready" | "playback_update", cb: (e: PlaybackUpdate) => void): void;
};
type IFrameAPI = {
  createController(el: HTMLElement, opts: { uri: string; width?: number | string; height?: number | string }, cb: (c: Controller) => void): void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
    __hypeSpotifyApi?: Promise<IFrameAPI>;
  }
}

function loadApi(): Promise<IFrameAPI> {
  window.__hypeSpotifyApi ??= new Promise((resolve) => {
    window.onSpotifyIframeApiReady = resolve;
    const s = document.createElement("script");
    s.src = "https://open.spotify.com/embed/iframe-api/v1";
    s.async = true;
    document.body.appendChild(s);
  });
  return window.__hypeSpotifyApi;
}

export type SoundState = "off" | "loading" | "playing" | "blocked";

/**
 * Plays `trackId` in the background while `playing` is true; switching the id
 * switches the song (the same id carries on without restarting). Full-length
 * tracks start ~1/3 in so a 5s slide lands on the hook, not the intro.
 * Returns the state plus `kick()` — call it from a click if autoplay was blocked.
 */
export function useSpotifySoundtrack(trackId: string | null | undefined, playing: boolean, enabled: boolean) {
  const hostRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<Controller | null>(null);
  const uriRef = useRef<string | null>(null);
  const seekedRef = useRef<string | null>(null);
  const heardRef = useRef(false);
  const playingRef = useRef(playing);
  const [heard, setHeard] = useState(false);
  const [blockedUri, setBlockedUri] = useState<string | null>(null);
  const uri = trackId ? `spotify:track:${trackId}` : null;

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  // Create the player lazily, the first time sound is wanted.
  useEffect(() => {
    if (!enabled || !uri || ctrlRef.current || !hostRef.current) return;
    let cancelled = false;
    const host = hostRef.current;
    loadApi().then((api) => {
      if (cancelled) return;
      const el = document.createElement("div");
      host.appendChild(el);
      uriRef.current = uri;
      api.createController(el, { uri, width: 300, height: 80 }, (c) => {
        if (cancelled) return c.destroy();
        ctrlRef.current = c;
        c.addListener("ready", () => {
          if (playingRef.current) c.play();
        });
        c.addListener("playback_update", ({ data }) => {
          if (!data.isPaused && data.position > 0) {
            heardRef.current = true;
            setHeard(true);
          }
          const cur = uriRef.current;
          if (cur && seekedRef.current !== cur && data.duration > 60_000 && data.position < 5_000 && !data.isPaused) {
            seekedRef.current = cur;
            c.seek(Math.round((data.duration * 0.33) / 1000));
          }
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, uri]);

  // Switch songs between slides.
  useEffect(() => {
    const c = ctrlRef.current;
    if (!c || !enabled || !uri || uri === uriRef.current) return;
    uriRef.current = uri;
    c.loadUri(uri);
    if (playingRef.current) c.play();
  }, [uri, enabled]);

  // Follow play / pause / mute.
  useEffect(() => {
    const c = ctrlRef.current;
    if (!c) return;
    // play() for the first start (nothing to resume yet), resume() after a pause.
    if (enabled && playing) {
      if (heardRef.current) c.resume();
      else c.play();
    } else c.pause();
  }, [enabled, playing]);

  // If nothing is audible a few seconds after asking, the browser blocked autoplay.
  useEffect(() => {
    if (!enabled || heardRef.current) return;
    const t = setTimeout(() => {
      if (!heardRef.current) setBlockedUri(uri);
    }, 4000);
    return () => clearTimeout(t);
  }, [enabled, uri]);
  const state: SoundState = !enabled ? "off" : heard ? "playing" : blockedUri === uri ? "blocked" : "loading";

  useEffect(
    () => () => {
      ctrlRef.current?.destroy();
      ctrlRef.current = null;
    },
    []
  );

  const kick = () => {
    const c = ctrlRef.current;
    if (!c) return;
    if (uriRef.current !== uri && uri) {
      uriRef.current = uri;
      c.loadUri(uri);
    }
    c.play();
  };

  // Host element for the embed iframe — keep it inside the viewport (Spotify
  // won't initialise an off-screen embed); it can be invisible.
  return { hostRef, state, kick };
}
