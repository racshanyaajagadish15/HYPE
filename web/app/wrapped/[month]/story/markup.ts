// Transcribed directly from web/ref/HYPE-Monthly-Recap.html's <x-dc> template
// (the Design Canvas markup, lines ~242-562 of the extracted template) —
// sc-if -> ternary, sc-for -> .map().join(''), sc-camel-on-click ->
// data-action (wired via one delegated click handler in page.tsx),
// sc-camel-view-box/preserve-aspect-ratio -> viewBox/preserveAspectRatio.
// Keep this byte-faithful to the reference; only page.tsx's data changes.

import { renderVals } from "./design";

type Vals = ReturnType<typeof renderVals>;

function coverSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: clamp(380px, 64vh, 720px); display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(0, .85fr); align-items: center; gap: clamp(18px, 3vw, 56px);">
      <div style="position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: clamp(8px, 1vw, 16px); min-width: 0;">
        <div style="display: flex; align-items: center; gap: 12px; font-family: 'DM Mono', monospace; font-size: clamp(9px, .95vw, 11px); letter-spacing: .36em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .4s .08s both;">
          <span style="display: block; width: clamp(26px, 4vw, 64px); height: 2px; background: ${v.accent}; box-shadow: ${v.glowBox};"></span>
          <span>${v.brand} presents</span>
        </div>
        <div style="position: relative; width: 100%; animation: ${v.snap} .55s .18s cubic-bezier(.2,1.2,.3,1) both;">
          <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(28px, 5.2vw, 88px); line-height: .9; letter-spacing: -.045em; text-transform: uppercase; white-space: pre-line; max-width: 100%; overflow-wrap: normal; word-break: keep-all; hyphens: none; text-shadow: ${v.glowWhite};">${v.title}</div>
        </div>
        <div style="position: relative; display: inline-block; margin-top: 2px; animation: ${v.fadeIn} .45s .62s both;">
          <div style="position: relative; z-index: 2; font-family: 'Just Another Hand', cursive; font-size: clamp(19px, 2.20vw, 32px); line-height: 1; color: #F7F7F2; ">${v.subtitle}</div>
          <div style="position: absolute; left: 0; bottom: -10px; width: 100%; height: 2px; background: ${v.accent}; box-shadow: ${v.glowBox}; transform-origin: left center; animation: ${v.grow} .5s .74s cubic-bezier(.4,0,.2,1) both;"></div>
        </div>
        <div style="display: flex; align-items: center; gap: clamp(10px, 1.6vw, 22px); flex-wrap: wrap; margin-top: clamp(18px, 2.6vw, 34px); font-family: 'DM Mono', monospace; font-size: clamp(9px, .95vw, 11px); letter-spacing: .22em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .95s both;">
          <span style="color: #F7F7F2;">${v.handle}</span>
          <span style="color: ${v.accent};">◆</span>
          <span>${v.coverMeta}</span>
        </div>
      </div>
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 0;">
        <div style="position: relative; transform: rotate(4deg); animation: ${v.pop} .6s .5s cubic-bezier(.2,1.5,.4,1) both;">
          <div style="width: clamp(104px, 15vw, 210px); padding: 8px 8px 8px; background: #F7F7F2; box-shadow: 0 0 0 1px rgba(247,247,242,.28), 0 22px 46px rgba(0,0,0,.75);">
            <div style="aspect-ratio: 4/5; background-color: #151515; background-image: ${v.shot1}; background-size: cover; background-position: center; filter: ${v.photoFilter};"></div>
          </div>
          <div style="position: absolute; right: -14px; top: -12px; width: 66px; height: 18px; background: ${v.accent}; opacity: .88; transform: rotate(22deg); box-shadow: ${v.glowBox};"></div>
        </div>
        <div style="position: absolute; left: -14%; bottom: -8%; transform: rotate(-9deg); animation: ${v.pop} .6s .66s cubic-bezier(.2,1.5,.4,1) both;">
          <div style="width: clamp(72px, 9.5vw, 130px); padding: 6px; background: #F7F7F2; box-shadow: 0 0 0 1px rgba(247,247,242,.24), 0 18px 40px rgba(0,0,0,.75);">
            <div style="aspect-ratio: 1/1; background-color: #151515; background-image: ${v.shot2}; background-size: cover; background-position: center; filter: ${v.photoFilter};"></div>
          </div>
        </div>
        <div style="position: absolute; right: -2%; top: -14%; animation: ${v.pop} .5s .9s both;">
          <svg width="30" height="30" style="overflow: visible;"><path d="M15 0 V30 M0 15 H30" style="fill: none; stroke: #F7F7F2; stroke-width: 1.4; stroke-dasharray: 1200; animation: ${v.draw} .7s .9s both;"></path><circle cx="15" cy="15" r="5.5" style="fill: none; stroke: ${v.accent}; stroke-width: 1.4;"></circle></svg>
        </div>
      </div>
      <div style="position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: flex-end; gap: 10px; pointer-events: none;">
        <div style="font-family: 'Just Another Hand', cursive; font-size: clamp(12px, 1.26vw, 17px); line-height: 1; color: #A8A8A8; animation: ${v.fadeIn} .5s 1.1s both;">what even happened</div>
        <div style="width: clamp(30px, 5vw, 72px); height: 1px; margin-bottom: 7px; background: ${v.accent}; box-shadow: ${v.glowBox}; transform-origin: left center; animation: ${v.grow} .5s 1.2s both;"></div>
      </div>
    </div>`;
}

function statSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: clamp(360px, 62vh, 700px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(4px, .6vw, 10px); text-align: center;">
      <div style="font-family: 'DM Mono', monospace; font-size: clamp(10px, 1vw, 13px); letter-spacing: .34em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .06s both;">${v.kicker}</div>
      <div style="position: relative; display: inline-block; padding: clamp(10px, 2vw, 30px) clamp(44px, 7.5vw, 116px);">
        <svg viewBox="0 0 400 200" preserveAspectRatio="none" style="position: absolute; inset: -6% -5%; width: 110%; height: 112%; overflow: visible; animation: ${v.fadeIn} .3s .5s both;"><ellipse cx="200" cy="100" rx="196" ry="94" style="fill: none; stroke: ${v.accent}; stroke-width: 2; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 8px ${v.accentDim});"></ellipse></svg>
        <div style="position: relative; font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(72px, 14vw, 210px); line-height: .86; letter-spacing: -.05em; color: #F7F7F2; text-shadow: ${v.glowWhite}; animation: ${v.snap} .45s .12s cubic-bezier(.2,1.3,.3,1) both;">${v.statValue}</div>
      </div>
      <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(20px, 3.2vw, 46px); line-height: 1.02; letter-spacing: -.02em; text-transform: uppercase; max-width: 20ch; animation: ${v.fadeIn} .5s .26s both;">${v.statUnit}</div>
      <div style="position: relative; font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(17px, 1.87vw, 26px); color: ${v.accent}; text-shadow: ${v.glowText}; max-width: 24ch; padding-top: 10px; animation: ${v.fadeIn} .45s .95s both;">${v.caption}</div>
      ${
        v.hasShot1
          ? `<div style="position: absolute; right: 0%; bottom: 2%; transform: rotate(5deg); animation: ${v.pop} .6s .7s cubic-bezier(.2,1.5,.4,1) both;">
          <div style="width: clamp(86px, 11vw, 148px); padding: 6px; background: #F7F7F2; box-shadow: 0 18px 40px rgba(0,0,0,.7);">
            <div style="aspect-ratio: 1/1; background-image: ${v.shot1}; background-size: cover; background-position: center; filter: ${v.photoFilter};"></div>
          </div>
        </div>`
          : ""
      }
      <div style="position: absolute; left: 2%; top: 14%; animation: ${v.fadeIn} .4s .8s both;">
        <svg width="110" height="86" style="overflow: visible;"><path d="M4 4 L96 70" style="fill: none; stroke: #F7F7F2; stroke-width: 1.4; stroke-dasharray: 1200; animation: ${v.draw} .6s .8s both;"></path><rect x="92" y="66" width="8" height="8" style="fill: #F7F7F2;"></rect></svg>
      </div>
      <div style="position: absolute; left: 1%; top: 6%; font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(13px, 1.38vw, 18px); color: #F7F7F2; animation: ${v.fadeIn} .4s .72s both;">look at that</div>
      <div style="position: absolute; right: 8%; top: 10%; animation: ${v.pop} .5s 1.15s both;">
        <svg width="30" height="30" style="overflow: visible;"><path d="M15 0 V30 M0 15 H30" style="fill: none; stroke: ${v.accent}; stroke-width: 1.3; stroke-dasharray: 1200; animation: ${v.draw} .6s 1.15s both;"></path></svg>
      </div>
    </div>`;
}

function photoSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(20px, 3vw, 34px);">
      <div style="position: relative; z-index: 4; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .34em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .4s .05s both;">moment of the month</div>
      <div style="position: relative; transform: rotate(${v.rot1}); animation: ${v.up} .55s .14s cubic-bezier(.2,1.2,.3,1) both;">
        <div style="position: absolute; left: -20px; top: -10px; width: 76px; height: 20px; background: ${v.accent}; opacity: .88; transform: rotate(-26deg); box-shadow: ${v.glowBox}; z-index: 2;"></div>
        <div style="width: min(40vw, 35vh, 336px); max-width: 100%; background: #F7F7F2; padding: clamp(9px, 1.1vw, 14px) clamp(9px, 1.1vw, 14px) clamp(30px, 3.2vw, 46px); box-shadow: 0 0 0 1px rgba(247,247,242,.25), 0 26px 60px rgba(0,0,0,.8);">
          <div style="position: relative;">
          <div style="position: absolute; right: -20px; top: -11px; width: 76px; height: 20px; background: ${v.accent}; opacity: .88; transform: rotate(26deg); box-shadow: ${v.glowBox}; z-index: 2;"></div>
          <div role="img" aria-label="${v.caption}" style="height: min(44vh, 420px); width: 100%; position: relative; overflow: hidden; background-color: #151515;">
            <div style="width: 100%; height: 100%; background-image: ${v.shot1}; background-size: cover; background-position: center; filter: ${v.photoFilter}; animation: ${v.zoom} 7s cubic-bezier(.2,.7,.2,1) both;"></div>
            ${
              v.noShot1
                ? `<div style="position: absolute; inset: 0; background: #0B0B0D; background-image: repeating-linear-gradient(45deg, rgba(247,247,242,.08) 0 10px, transparent 10px 20px); display: grid; place-items: center;">
                <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: 12px; color: #A8A8A8;">photo goes here</div>
              </div>`
                : ""
            }
          </div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 4px; padding-top: 9px;">
            <div style="max-width: 100%; font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(14px, 1.49vw, 20px); color: #0B0B0D; line-height: 1.25; text-align: left;">${v.caption}</div>
            <div style="font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: .14em; color: #55534f; white-space: nowrap;">${v.photoMeta}</div>
          </div>
        </div>
      </div>
      <div style="position: absolute; right: 3%; top: 18%; text-align: center; animation: ${v.fadeIn} .45s .66s both;">
        <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(15px, 1.59vw, 22px); color: ${v.accent}; text-shadow: ${v.glowText}; ">this one &gt;&gt;&gt;</div>
        <svg width="84" height="66" style="overflow: visible;"><path d="M78 6 L10 58" style="fill: none; stroke: ${v.accent}; stroke-width: 1.6; filter: drop-shadow(0 0 6px ${v.accentDim}); stroke-dasharray: 1200; animation: ${v.draw} .6s .8s both;"></path><rect x="6" y="54" width="8" height="8" style="fill: ${v.accent}; box-shadow: ${v.glowBox};"></rect></svg>
      </div>
      <div style="position: absolute; left: 4%; bottom: 14%; animation: ${v.pop} .5s .9s both;">
        <svg width="28" height="28" style="overflow: visible;"><path d="M14 0 V28 M0 14 H28" style="fill: none; stroke: #F7F7F2; stroke-width: 1.3; stroke-dasharray: 1200; animation: ${v.draw} .6s .9s both;"></path></svg>
      </div>
      <div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .8s both;">${v.photoIndex}</div>
    </div>`;
}

function mosaicSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: clamp(360px, 60vh, 680px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(10px, 1.6vw, 24px);">
      <div style="display: flex; align-items: baseline; gap: 16px; flex-wrap: wrap; justify-content: center;">
        <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(23px, 3.4vw, 48px); text-transform: uppercase; letter-spacing: -.02em; animation: ${v.fadeIn} .45s .06s both;">${v.kicker}</div>
        <div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: ${v.accent};">${v.mosaicMeta}</div>
      </div>
      <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: clamp(12px, 2vw, 30px);">
        ${v.tiles
          .map(
            (tile: any) => `
          <div style="position: relative; transform: rotate(${tile.rot}); animation: ${v.pop} .55s ${tile.delay} cubic-bezier(.2,1.4,.4,1) both;">
            <div style="width: ${tile.w}; padding: 7px 7px 7px; background: #F7F7F2; box-shadow: ${tile.glow}, 0 20px 46px rgba(0,0,0,.75);">
              <div style="aspect-ratio: 1/1; overflow: hidden; background-color: #151515; background-image: ${tile.bg}; background-size: cover; background-position: center; filter: ${v.photoFilter};">
                ${
                  tile.noShot
                    ? `<div style="height: 100%; background: #0B0B0D; background-image: repeating-linear-gradient(45deg, rgba(247,247,242,.08) 0 9px, transparent 9px 18px); display: grid; place-items: center;">
                    <div style="font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: .2em; color: #A8A8A8;">${tile.slot}</div>
                  </div>`
                    : ""
                }
              </div>
            </div>
            <div style="display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-top: 7px;">
              <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(12px, 1.21vw, 17px); color: #F7F7F2; line-height: 1.25; text-align: left;">${tile.caption}</div>
              <div style="font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: .1em; color: #A8A8A8; white-space: nowrap;">${tile.date}</div>
            </div>
            ${
              tile.first
                ? `<div style="position: absolute; left: 14px; top: 14px; z-index: 3; font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: .22em; text-transform: uppercase; color: ${v.accent}; background: rgba(5,5,5,.72); border: 1px solid ${v.accent}; box-shadow: ${v.glowBox}; padding: 4px 8px;">this one</div>`
                : ""
            }
          </div>`
          )
          .join("")}
      </div>
      <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(14px, 1.49vw, 20px); color: #A8A8A8; animation: ${v.fadeIn} .45s .8s both;">keeping all of these forever</div>
    </div>`;
}

function chipsSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: clamp(360px, 60vh, 680px); display: flex; flex-direction: column; justify-content: center; gap: clamp(14px, 2vw, 26px); max-width: 1060px; margin: 0 auto;">
      <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap;">
        <div>
          <div style="font-family: 'DM Mono', monospace; font-size: clamp(10px, 1vw, 12px); letter-spacing: .34em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .06s both;">${v.kicker}</div>
          <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(32px, 5.4vw, 86px); line-height: .9; text-transform: uppercase; letter-spacing: -.005em; padding-top: 6px; animation: ${v.snap} .5s .12s cubic-bezier(.2,1.2,.3,1) both;">${v.chipsHead}</div>
        </div>
        <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(14px, 1.43vw, 19px); color: ${v.accent}; text-shadow: ${v.glowText}; max-width: 22ch; animation: ${v.fadeIn} .45s .7s both;">&lt; ${v.chipsNote}</div>
      </div>
      <div style="display: flex; flex-direction: column; gap: clamp(10px, 1.4vw, 18px);">
        ${v.chips
          .map(
            (chip: any) => `
          <div style="display: flex; align-items: center; gap: clamp(12px, 1.8vw, 24px); flex-wrap: wrap; animation: ${v.fadeIn} .45s ${chip.delay} both;">
            <div style="flex: 0 0 auto; font-family: 'Syne', sans-serif; font-weight: 800; font-size: ${chip.size}; text-transform: uppercase; letter-spacing: .01em; color: ${chip.ink}; text-shadow: ${chip.textGlow}; min-width: 0;">${chip.label}</div>
            <div style="flex: 1 1 120px; min-width: 90px; height: ${chip.barH}; background: rgba(247,247,242,.09); overflow: hidden;">
              <div style="height: 100%; width: ${chip.bar}; background: ${chip.fill}; box-shadow: ${chip.barGlow}; transform-origin: left center; animation: ${v.grow} .8s ${chip.delay} cubic-bezier(.2,.9,.2,1) both;"></div>
            </div>
            <div style="flex: 0 0 auto; font-family: 'DM Mono', monospace; font-size: clamp(11px, 1.1vw, 14px); color: #A8A8A8;">${chip.pct}</div>
          </div>`
          )
          .join("")}
      </div>
      <div style="position: absolute; right: 0%; top: 2%; animation: ${v.pop} .5s .9s both;">
        <svg width="46" height="46" style="overflow: visible;"><path d="M23 0 V46 M0 23 H46" style="fill: none; stroke: #F7F7F2; stroke-width: 1.3; stroke-dasharray: 1200; animation: ${v.draw} .6s .9s both;"></path></svg>
      </div>
    </div>`;
}

function trackSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: clamp(360px, 62vh, 700px); display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: clamp(20px, 3.4vw, 60px);">
      <div aria-hidden="true" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(80px, 15vw, 230px); line-height: .78; text-align: center; letter-spacing: -.01em; color: rgba(247,247,242,.05); white-space: pre-line; pointer-events: none;">ON
REPEAT</div>
      <div style="position: relative; flex: 0 0 auto; animation: ${v.up} .55s .12s cubic-bezier(.2,1.2,.3,1) both;">
        <div style="position: absolute; right: -10%; top: 14%; width: 42%; aspect-ratio: 1/1; border-radius: 50%; background: repeating-radial-gradient(circle, rgba(247,247,242,.14) 0 3px, rgba(0,0,0,.5) 3px 7px); animation: spinSlow 16s linear infinite;"></div>
        <div style="position: relative; width: clamp(190px, 28vw, 340px); aspect-ratio: 1/1; overflow: hidden; background-color: #151515; background-image: ${v.artBg}; background-size: cover; background-position: center; filter: ${v.photoFilter}; box-shadow: 0 0 0 2px ${v.accent}, ${v.glowBox}, 0 28px 60px rgba(0,0,0,.8); transform: rotate(-2deg); animation: ${v.reveal} .7s .2s cubic-bezier(.4,0,.2,1) both;">
          ${
            v.noArt
              ? `<div style="height: 100%; background-image: repeating-linear-gradient(45deg, rgba(247,247,242,.07) 0 12px, transparent 12px 24px); display: grid; place-items: center;">
              <div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .24em; color: #A8A8A8;">ALBUM ART</div>
            </div>`
              : ""
          }
        </div>
      </div>
      <div style="position: relative; flex: 1 1 320px; min-width: 260px; max-width: 560px; display: flex; flex-direction: column; gap: clamp(8px, 1.1vw, 14px);">
        <div style="display: flex; align-items: baseline; gap: 12px;">
          <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(30px, 3.6vw, 52px); color: ${v.accent}; text-shadow: ${v.glowText}; animation: ${v.snap} .5s .18s both;">01</div>
          <div style="font-family: 'DM Mono', monospace; font-size: clamp(10px, 1vw, 12px); letter-spacing: .3em; text-transform: uppercase; color: #A8A8A8;">${v.kicker}</div>
        </div>
        <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(32px, 5vw, 76px); line-height: .9; text-transform: uppercase; letter-spacing: -.01em; text-wrap: pretty; animation: ${v.snap} .5s .26s cubic-bezier(.2,1.2,.3,1) both;">${v.trackTitle}</div>
        <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap; animation: ${v.fadeIn} .45s .38s both;">
          <div style="font-size: clamp(14px, 1.5vw, 19px); font-weight: 500; color: #A8A8A8;">${v.trackArtist}</div>
          ${v.trackPlays ? `<div style="font-family: 'DM Mono', monospace; font-size: clamp(11px, 1.2vw, 14px); letter-spacing: .16em; text-transform: uppercase; color: ${v.accent}; border: 1px solid ${v.accent}; padding: 4px 12px; box-shadow: ${v.glowBox};">${v.trackPlays}</div>` : ""}
        </div>
        <div style="display: flex; align-items: flex-end; gap: 4px; height: 46px; animation: ${v.fadeIn} .45s .5s both;">
          ${v.bars
            .map(
              (bar: any) =>
                `<div style="width: 5px; height: ${bar.h}; background: ${v.accent}; opacity: .85; box-shadow: 0 0 8px ${v.accentDim}; transform-origin: bottom center; animation: eq ${bar.dur} ease-in-out ${bar.delay} infinite;"></div>`
            )
            .join("")}
        </div>
        <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(15px, 1.59vw, 21px); color: #F7F7F2; animation: ${v.fadeIn} .45s .66s both;">yeah… this one was on REPEAT</div>
        ${v.hasEmbed ? `<iframe src="${v.embedUrl}" title="preview" style="pointer-events: auto; position: relative; z-index: 8; width: 100%; max-width: 440px; height: 80px; border: 0; border-radius: 12px;" allow="encrypted-media"></iframe>` : ""}
        ${v.trackMeta ? `<div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .8s both;">${v.trackMeta}</div>` : ""}
      </div>
    </div>`;
}

function listSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: clamp(360px, 60vh, 680px); display: flex; flex-direction: column; justify-content: center; gap: clamp(8px, 1.2vw, 16px); max-width: 1000px; margin: 0 auto;">
      <div style="display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; flex-wrap: wrap;">
        <div>
          <div style="font-family: 'DM Mono', monospace; font-size: clamp(10px, 1vw, 12px); letter-spacing: .34em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .06s both;">${v.kicker}</div>
          <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(30px, 5vw, 76px); line-height: .9; text-transform: uppercase; padding-top: 4px; animation: ${v.snap} .5s .12s cubic-bezier(.2,1.2,.3,1) both;">${v.listHead}</div>
        </div>
        <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(14px, 1.43vw, 19px); color: #A8A8A8; animation: ${v.fadeIn} .45s .75s both;">${v.listNote}</div>
      </div>
      <div style="display: flex; flex-direction: column;">
        ${v.rows
          .map(
            (row: any) => `
          <div style="display: flex; align-items: baseline; gap: clamp(14px, 2.2vw, 30px); flex-wrap: wrap; padding: ${row.pad} 0; border-top: 1px solid rgba(247,247,242,.14); animation: ${v.fadeIn} .45s ${row.delay} both;">
            <div style="position: relative; flex: 0 0 auto; font-family: 'Syne', sans-serif; font-weight: 800; font-size: ${row.nSize}; line-height: .9; color: ${row.color}; text-shadow: ${row.glow};">${row.n}
              ${
                row.first
                  ? `<svg viewBox="0 0 200 140" preserveAspectRatio="none" style="position: absolute; inset: -24% -30%; width: 160%; height: 148%; overflow: visible;"><ellipse cx="100" cy="70" rx="97" ry="66" style="fill: none; stroke: ${v.accent}; stroke-width: 1.8; vector-effect: non-scaling-stroke; filter: drop-shadow(0 0 7px ${v.accentDim});"></ellipse></svg>`
                  : ""
              }
            </div>
            <div style="flex: 1 1 260px; min-width: 200px; display: flex; align-items: baseline; justify-content: space-between; gap: 14px; flex-wrap: wrap;">
              <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: ${row.tSize}; line-height: 1; text-transform: uppercase; letter-spacing: .005em; color: ${row.titleInk};">${row.title}</div>
              <div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .18em; text-transform: uppercase; color: #A8A8A8;">${row.sub}</div>
            </div>
          </div>`
          )
          .join("")}
      </div>
      <div style="position: absolute; right: 0%; top: 26%; font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(14px, 1.43vw, 19px); color: ${v.accent}; text-shadow: ${v.glowText}; animation: ${v.fadeIn} .45s .85s both;">the obsession ↑</div>
    </div>`;
}

function noteSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: clamp(340px, 58vh, 660px); display: flex; flex-direction: column; align-items: flex-start; justify-content: center; gap: clamp(10px, 1.4vw, 20px); max-width: 900px; margin: 0 auto;">
      <div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .34em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .08s both;">${v.kicker}</div>
      <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(15px, 1.54vw, 20px); color: #A8A8A8; animation: ${v.fadeIn} .45s .16s both;">honestly…</div>
      <div style="position: relative; font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(24px, 3.63vw, 53px); line-height: 1.3; color: #F7F7F2; text-wrap: pretty; animation: ${v.up} .55s .24s cubic-bezier(.2,1.1,.3,1) both;">${v.noteText}
        <div style="position: absolute; left: 0; bottom: -14px; width: 56%; height: 2px; background: ${v.accent}; box-shadow: ${v.glowBox}; transform-origin: left center; animation: ${v.grow} .5s .6s both;"></div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; padding-top: 18px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s 1s both;">
        <svg width="14" height="14" style="overflow: visible;"><rect x="2" y="2" width="9" height="9" transform="rotate(45 6.5 6.5)" style="fill: ${v.accent}; filter: drop-shadow(0 0 6px ${v.accentDim});"></rect></svg>
        <span style="white-space: nowrap;">— ${v.noteSign}</span>
      </div>
      ${
        v.hasShot1
          ? `<div style="position: absolute; right: -2%; bottom: 4%; transform: rotate(6deg); animation: ${v.pop} .6s .6s cubic-bezier(.2,1.5,.4,1) both;">
          <div style="width: clamp(80px, 10vw, 132px); padding: 6px; background: #F7F7F2; box-shadow: 0 16px 36px rgba(0,0,0,.75);">
            <div style="aspect-ratio: 1/1; background-image: ${v.shot1}; background-size: cover; background-position: center; filter: ${v.photoFilter};"></div>
          </div>
        </div>`
          : ""
      }
    </div>`;
}

function outroSlide(v: Vals) {
  return `
    <div style="position: relative; height: 100%; min-height: clamp(360px, 62vh, 700px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: clamp(16px, 2.4vw, 28px); text-align: center;">
      <div style="font-family: 'DM Mono', monospace; font-size: clamp(10px, 1vw, 12px); letter-spacing: .34em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .06s both;">${v.kicker}</div>
      <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(44px, 10vw, 152px); line-height: 1.04; white-space: pre; max-width: 100%; text-transform: uppercase; letter-spacing: -.01em; padding-bottom: .08em; text-shadow: ${v.glowWhite}; animation: ${v.snap} .55s .12s cubic-bezier(.2,1.25,.3,1) both;">${v.title}</div>
      <div style="font-family: 'DM Mono', monospace; letter-spacing: .04em; font-size: clamp(15px, 1.59vw, 21px); color: ${v.accent}; text-shadow: ${v.glowText}; max-width: 42ch; animation: ${v.fadeIn} .45s .34s both;">${v.caption}</div>
      <button data-action="share" aria-label="${v.shareLabel}" style="pointer-events: auto; position: relative; z-index: 8; margin-top: 12px; font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(15px, 1.7vw, 22px); letter-spacing: .08em; text-transform: uppercase; background: transparent; color: ${v.accent}; border: 2px solid ${v.accent}; border-radius: 999px; padding: 12px 30px 12px; cursor: pointer; transform: rotate(-2deg); box-shadow: ${v.glowBox}; text-shadow: ${v.glowText}; transition: transform .2s ease, box-shadow .2s ease; animation: ${v.pop} .55s .46s cubic-bezier(.2,1.5,.4,1) both;">✦ ${v.shareLabel} ✦</button>
      <div style="display: flex; align-items: center; gap: clamp(14px, 2.4vw, 34px); flex-wrap: wrap; justify-content: center; padding-top: 18px; font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .24em; text-transform: uppercase; color: #A8A8A8; animation: ${v.fadeIn} .45s .72s both;">
        ${v.outroStats.map((stat: any) => `<span>${stat.text}</span>`).join("")}
      </div>
      ${
        v.hasShot1
          ? `<div style="position: absolute; left: 1%; bottom: 5%; transform: rotate(-7deg); animation: ${v.pop} .6s .6s cubic-bezier(.2,1.5,.4,1) both;">
          <div style="width: clamp(86px, 11vw, 144px); padding: 6px; background: #F7F7F2; box-shadow: 0 18px 40px rgba(0,0,0,.75);">
            <div style="aspect-ratio: 4/5; background-image: ${v.shot1}; background-size: cover; background-position: center; filter: ${v.photoFilter};"></div>
          </div>
        </div>`
          : ""
      }
      <div style="position: absolute; right: 5%; top: 8%; animation: ${v.pop} .5s .8s both;">
        <svg width="56" height="56" style="overflow: visible;"><path d="M28 4 L28 19 M28 37 L28 52 M4 28 L19 28 M37 28 L52 28 M12 12 L22 22 M34 34 L44 44 M44 12 L34 22 M22 34 L12 44" style="fill: none; stroke: ${v.accent}; stroke-width: 2.8; stroke-linecap: round; filter: drop-shadow(0 0 7px ${v.accentDim}); stroke-dasharray: 1200; animation: ${v.draw} .7s .8s both;"></path></svg>
      </div>
      <div style="position: absolute; left: 8%; top: 12%; animation: ${v.pop} .5s .92s both;">
        <svg width="34" height="34" style="overflow: visible;"><path d="M17 0 V34 M0 17 H34" style="fill: none; stroke: ${v.accent}; stroke-width: 1.3; stroke-dasharray: 1200; animation: ${v.draw} .6s .92s both;"></path></svg>
      </div>
    </div>`;
}

function slideInner(v: Vals): string {
  if (v.isCover) return coverSlide(v);
  if (v.isStat) return statSlide(v);
  if (v.isPhoto) return photoSlide(v);
  if (v.isMosaic) return mosaicSlide(v);
  if (v.isChips) return chipsSlide(v);
  if (v.isTrack) return trackSlide(v);
  if (v.isList) return listSlide(v);
  if (v.isNote) return noteSlide(v);
  if (v.isOutro) return outroSlide(v);
  return "";
}

export function renderPage(v: Vals): string {
  return `
<div style="position: relative; width: 100%; min-height: 100vh; box-sizing: border-box; overflow: hidden; background: ${v.bg}; color: #F7F7F2; font-family: 'Space Grotesk', system-ui, sans-serif; transition: background-color .6s cubic-bezier(.2,.8,.2,1); display: grid; grid-template-rows: auto minmax(0, 1fr) auto;">

  <div style="position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: .5; background-image: linear-gradient(rgba(247,247,242,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(247,247,242,.05) 1px, transparent 1px); background-size: 72px 72px;"></div>
  <div style="position: absolute; inset: -20%; z-index: 0; pointer-events: none; opacity: .055; background-image: radial-gradient(rgba(255,255,255,.9) .6px, transparent .7px); background-size: 3px 3px; animation: grain 1.2s steps(3) infinite;"></div>
  <div style="position: absolute; inset: 0; z-index: 1; pointer-events: none; opacity: .5; background: radial-gradient(120% 80% at 50% 0%, ${v.accentWash} 0%, transparent 60%);"></div>
  <div style="position: absolute; left: 0; right: 0; top: 0; bottom: 0; z-index: 9; pointer-events: none; overflow: hidden;">
    <div style="position: absolute; top: 0; bottom: 0; width: 34%; background: linear-gradient(90deg, transparent, ${v.accentDim}, ${v.accent}, ${v.accentDim}, transparent); opacity: .5; filter: blur(6px); animation: ${v.streak} .62s cubic-bezier(.4,0,.1,1) both;"></div>
  </div>

  <div data-action="tap-back" style="position: absolute; left: 0; top: 0; bottom: 0; width: 20%; z-index: 3; cursor: w-resize;"></div>
  <div data-action="tap-next" style="position: absolute; right: 0; top: 0; bottom: 0; width: 80%; z-index: 3; cursor: e-resize;"></div>

  <div style="position: relative; z-index: 6; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: clamp(14px, 2vw, 26px) clamp(16px, 3vw, 44px) 4px; pointer-events: none;">
    <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
      <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(14px, 1.4vw, 18px); letter-spacing: .14em; text-transform: uppercase;">${v.brand}</div>
      <div style="font-family: 'Syne', sans-serif; font-weight: 800; font-size: clamp(14px, 1.4vw, 18px); letter-spacing: .14em; text-transform: uppercase; color: ${v.accent}; text-shadow: ${v.glowText};">RECAP</div>
    </div>
    <div style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .22em; text-transform: uppercase; color: #A8A8A8; white-space: nowrap;">${v.periodLabel}</div>
  </div>

  <div style="position: relative; z-index: 6; pointer-events: none; min-height: 0; padding: clamp(8px, 1.6vw, 22px) clamp(16px, 4vw, 64px) clamp(6px, 1.2vw, 16px); animation: ${v.fadeIn} .5s cubic-bezier(.2,.9,.2,1) both;">
    ${slideInner(v)}
  </div>

  <div style="position: relative; z-index: 7; display: flex; align-items: center; gap: clamp(10px, 2vw, 24px); flex-wrap: wrap; padding: clamp(6px, 1vw, 12px) clamp(16px, 3vw, 44px) clamp(14px, 2vw, 26px);">
    <div style="font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .18em; color: #F7F7F2;">${v.counterNow}</div>
    <div style="position: relative; flex: 1 1 140px; min-width: 100px; height: 1px; background: rgba(247,247,242,.18);">
      <div style="position: absolute; left: 0; top: 0; height: 1px; width: ${v.progress}; background: ${v.accent}; box-shadow: ${v.glowBox}; transition: width .5s cubic-bezier(.2,.9,.2,1);"></div>
      <div style="position: absolute; top: -3px; left: ${v.progress}; width: 7px; height: 7px; margin-left: -3.5px; border-radius: 50%; background: ${v.accent}; box-shadow: ${v.glowBox}; transition: left .5s cubic-bezier(.2,.9,.2,1); animation: pulseGlow 2s ease-in-out infinite;"></div>
    </div>
    <div style="font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: .18em; color: #A8A8A8;">${v.counterTotal}</div>
    <div style="display: flex; align-items: center; gap: 14px;">
      <button data-action="back" aria-label="Previous slide" class="hype-nav-btn" style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; border: 0; background: transparent; color: #A8A8A8; padding: 8px 2px; cursor: pointer; transition: color .2s ease;">Back</button>
      <button data-action="exit" aria-label="Exit recap" class="hype-nav-btn" style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; border: 0; background: transparent; color: #A8A8A8; padding: 8px 2px; cursor: pointer; transition: color .2s ease;">Exit</button>
      <button data-action="next" aria-label="Next slide" class="hype-next-btn" style="font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: .2em; text-transform: uppercase; background: transparent; color: ${v.accent}; border: 1px solid ${v.accent}; border-radius: 999px; padding: 8px 20px; cursor: pointer; box-shadow: ${v.glowBox}; transition: transform .2s ease, background-color .2s ease;">${v.nextLabel} →</button>
    </div>
  </div>

</div>`;
}
