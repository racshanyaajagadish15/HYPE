// Illustrations for the landing page's "how it works" steps.
// Pure SVG in the HYPE palette, so they scale with their frames and need no assets.

const SYNE = "var(--font-syne), 'Syne', sans-serif";
const MONO = "var(--font-dm-mono), 'DM Mono', monospace";

const fill = { position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" } as const;

// Polaroid 1: a retro sunset over the water.
export function SunsetPhoto() {
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" style={fill} aria-hidden="true">
      <defs>
        <linearGradient id="la-sun-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1B5C" />
          <stop offset=".45" stopColor="#B06CFF" />
          <stop offset=".75" stopColor="#FF4FD8" />
          <stop offset="1" stopColor="#FF9A5C" />
        </linearGradient>
        <linearGradient id="la-sun-disc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE14D" />
          <stop offset="1" stopColor="#FF7A3D" />
        </linearGradient>
        <linearGradient id="la-sun-sea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B1E6E" />
          <stop offset="1" stopColor="#0E0A1F" />
        </linearGradient>
        <clipPath id="la-sun-cut">
          <rect x="0" y="0" width="400" height="232" />
          <rect x="0" y="240" width="400" height="10" />
          <rect x="0" y="258" width="400" height="9" />
          <rect x="0" y="275" width="400" height="7" />
          <rect x="0" y="290" width="400" height="5" />
        </clipPath>
      </defs>
      <rect width="400" height="500" fill="url(#la-sun-sky)" />
      <circle cx="210" cy="300" r="120" fill="url(#la-sun-disc)" clipPath="url(#la-sun-cut)" />
      <rect y="300" width="400" height="200" fill="url(#la-sun-sea)" />
      <g fill="#FFE14D">
        <rect x="150" y="318" width="120" height="4" rx="2" opacity=".8" />
        <rect x="168" y="338" width="84" height="4" rx="2" opacity=".6" />
        <rect x="184" y="360" width="52" height="3" rx="1.5" opacity=".45" />
        <rect x="196" y="384" width="28" height="3" rx="1.5" opacity=".3" />
      </g>
      {/* palm */}
      <g fill="#0E0A1F">
        <path d="M62 500 C70 420 84 330 108 250 L116 252 C96 330 86 420 82 500 Z" />
        <path d="M112 250 C80 222 40 222 8 244 C44 236 78 240 110 256 Z" />
        <path d="M112 250 C92 210 58 192 24 196 C60 208 86 228 108 256 Z" />
        <path d="M112 250 C126 208 160 190 196 196 C160 206 134 226 116 256 Z" />
        <path d="M112 250 C148 230 190 234 222 260 C186 248 150 248 116 258 Z" />
        <path d="M112 250 C110 214 120 186 140 168 C128 196 122 222 116 254 Z" />
      </g>
      {/* birds */}
      <g fill="none" stroke="#2A1B5C" strokeWidth="3" strokeLinecap="round">
        <path d="M262 120 q8 -8 16 0 q8 -8 16 0" />
        <path d="M310 150 q6 -6 12 0 q6 -6 12 0" />
      </g>
    </svg>
  );
}

// Polaroid 2 (the keeper): a concert, lights up, hands up.
export function ConcertPhoto() {
  const confetti: [number, number, string][] = [
    [60, 90, "#FFE14D"], [120, 60, "#3DF5FF"], [300, 80, "#FF4FD8"], [340, 140, "#FFE14D"], [90, 170, "#FF4FD8"],
    [250, 40, "#FFE14D"], [180, 120, "#3DF5FF"], [360, 220, "#3DF5FF"], [40, 250, "#FFE14D"], [280, 190, "#FF4FD8"],
  ];
  return (
    <svg viewBox="0 0 400 500" preserveAspectRatio="xMidYMid slice" style={fill} aria-hidden="true">
      <defs>
        <radialGradient id="la-gig-bg" cx=".5" cy=".55" r=".7">
          <stop offset="0" stopColor="#4B1A6E" />
          <stop offset=".6" stopColor="#1A0F2E" />
          <stop offset="1" stopColor="#07060B" />
        </radialGradient>
        <linearGradient id="la-gig-beam-c" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3DF5FF" stopOpacity=".85" />
          <stop offset="1" stopColor="#3DF5FF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="la-gig-beam-p" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF4FD8" stopOpacity=".85" />
          <stop offset="1" stopColor="#FF4FD8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="la-gig-spot" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#FFF6C8" />
          <stop offset=".4" stopColor="#FFE14D" stopOpacity=".7" />
          <stop offset="1" stopColor="#FFE14D" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="500" fill="url(#la-gig-bg)" />
      <g style={{ mixBlendMode: "screen" }}>
        <path d="M40 0 L80 0 L250 420 L150 420 Z" fill="url(#la-gig-beam-c)" />
        <path d="M360 0 L320 0 L150 420 L250 420 Z" fill="url(#la-gig-beam-p)" />
        <path d="M190 0 L210 0 L290 420 L110 420 Z" fill="url(#la-gig-beam-c)" opacity=".5" />
      </g>
      <circle cx="200" cy="270" r="110" fill="url(#la-gig-spot)" />
      {/* performer */}
      <g fill="#07060B">
        <circle cx="200" cy="232" r="14" />
        <path d="M184 250 L216 250 L222 320 L178 320 Z" />
        <path d="M216 254 L250 210 L256 216 L222 266 Z" />
        <path d="M184 254 L160 290 L166 296 L190 266 Z" />
      </g>
      <rect x="140" y="320" width="120" height="10" fill="#07060B" />
      {confetti.map(([x, y, c], i) => (
        <rect key={i} x={x} y={y} width="8" height="4" rx="1" fill={c} transform={`rotate(${i * 37} ${x + 4} ${y + 2})`} />
      ))}
      {/* crowd */}
      <g fill="#07060B">
        <path d="M0 500 L0 400 C20 380 40 380 50 400 C60 370 90 370 100 398 C112 376 140 376 150 404 C166 380 190 380 200 402 C212 372 244 372 254 400 C266 380 290 380 300 404 C312 376 340 376 350 398 C362 380 390 380 400 396 L400 500 Z" />
        <path d="M68 388 L58 320 L64 316 L76 386 Z" />
        <circle cx="58" cy="316" r="7" />
        <path d="M226 382 L236 330 L244 332 L234 384 Z" />
        <circle cx="240" cy="326" r="7" />
        <path d="M326 384 L344 334 L351 337 L334 388 Z" />
        <circle cx="348" cy="332" r="7" />
        <path d="M120 386 L112 344 L119 342 L128 384 Z" />
        <rect x="104" y="326" width="16" height="22" rx="3" />
      </g>
      <rect x="107" y="329" width="10" height="16" rx="1.5" fill="#3DF5FF" opacity=".9" />
    </svg>
  );
}

// Vinyl label art for step 02.
export function AlbumCover() {
  return (
    <svg viewBox="0 0 100 100" style={fill} aria-hidden="true">
      <defs>
        <linearGradient id="la-cover" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE14D" />
          <stop offset=".5" stopColor="#FF4FD8" />
          <stop offset="1" stopColor="#B06CFF" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill="url(#la-cover)" />
      <g fill="none" stroke="#07060B" strokeOpacity=".22" strokeWidth="1.2">
        <circle cx="50" cy="50" r="40" />
        <circle cx="50" cy="50" r="32" />
        <circle cx="50" cy="50" r="24" />
      </g>
      <path d="M50 14 L54 26 L66 26 L56 33 L60 45 L50 38 L40 45 L44 33 L34 26 L46 26 Z" fill="#07060B" />
      <text x="50" y="70" textAnchor="middle" fill="#07060B" style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 13, letterSpacing: "-.02em" }}>HYPE</text>
      <text x="50" y="81" textAnchor="middle" fill="#07060B" style={{ fontFamily: MONO, fontSize: 5.5, letterSpacing: ".2em" }}>SIDE A</text>
    </svg>
  );
}

// Step 03: a finished story frame with tape, doodles and marker notes.
export function StoryScreen() {
  return (
    <svg viewBox="0 0 180 360" preserveAspectRatio="xMidYMid slice" style={fill} aria-hidden="true">
      <defs>
        <linearGradient id="la-story-bg" x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#2A1B5C" />
          <stop offset=".6" stopColor="#4B1A6E" />
          <stop offset="1" stopColor="#100E18" />
        </linearGradient>
        <clipPath id="la-story-photo"><rect x="0" y="0" width="112" height="140" /></clipPath>
        <clipPath id="la-story-photo2"><rect x="0" y="0" width="80" height="96" /></clipPath>
      </defs>
      <rect width="180" height="360" fill="url(#la-story-bg)" />
      <g fill="none" stroke="#F5F3FF" strokeOpacity=".06">
        {Array.from({ length: 18 }, (_, i) => <line key={i} x1="0" y1={i * 20 + 10} x2="180" y2={i * 20 + 10} />)}
      </g>

      <text x="16" y="44" fill="#F5F3FF" style={{ fontFamily: MONO, fontSize: 8, letterSpacing: ".3em" }}>YOUR</text>
      <text x="14" y="74" fill="#FFE14D" textLength="128" lengthAdjust="spacingAndGlyphs" style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 28 }}>OCTOBER</text>

      {/* main photo, taped */}
      <g transform="translate(26 96) rotate(-5)">
        <rect x="-6" y="-6" width="124" height="160" fill="#F5F3FF" />
        <g clipPath="url(#la-story-photo)">
          <rect width="112" height="140" fill="#FF9A5C" />
          <rect width="112" height="80" fill="#B06CFF" />
          <rect y="40" width="112" height="40" fill="#FF4FD8" />
          <circle cx="60" cy="86" r="30" fill="#FFE14D" />
          <rect y="86" width="112" height="54" fill="#2A1B5C" />
          <rect x="40" y="96" width="40" height="3" rx="1.5" fill="#FFE14D" opacity=".7" />
          <rect x="50" y="106" width="20" height="2" rx="1" fill="#FFE14D" opacity=".5" />
          <path d="M8 140 C12 116 16 96 24 76 L27 77 C21 96 18 116 16 140 Z" fill="#0E0A1F" />
          <path d="M26 76 C14 66 4 68 -4 74 C8 72 16 74 26 80 Z M26 76 C34 64 46 62 56 66 C44 68 34 72 27 80 Z" fill="#0E0A1F" />
        </g>
      </g>
      <rect x="62" y="84" width="44" height="14" fill="#3DF5FF" opacity=".75" transform="rotate(4 84 91)" />

      {/* second photo */}
      <g transform="translate(96 214) rotate(7)">
        <rect x="-5" y="-5" width="90" height="106" fill="#F5F3FF" />
        <g clipPath="url(#la-story-photo2)">
          <rect width="80" height="96" fill="#1A0F2E" />
          <path d="M10 0 L22 0 L52 96 L30 96 Z" fill="#3DF5FF" opacity=".55" />
          <path d="M70 0 L58 0 L28 96 L50 96 Z" fill="#FF4FD8" opacity=".55" />
          <circle cx="40" cy="56" r="20" fill="#FFE14D" opacity=".45" />
          <path d="M0 96 L0 78 C8 70 16 70 20 78 C26 68 36 68 40 78 C46 70 56 70 60 78 C66 68 76 70 80 76 L80 96 Z" fill="#07060B" />
        </g>
      </g>
      <rect x="112" y="204" width="34" height="12" fill="#FFE14D" opacity=".7" transform="rotate(-8 129 210)" />

      {/* doodles */}
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M150 34 L154 44 L164 46 L156 52 L158 62 L150 56 L142 62 L144 52 L136 46 L146 44 Z" stroke="#FF4FD8" strokeWidth="2" />
        <path d="M16 266 C26 258 34 274 44 266 C54 258 62 274 72 266" stroke="#3DF5FF" strokeWidth="2.2" />
        <path d="M30 228 C40 216 58 222 56 236 C54 248 36 250 30 240" stroke="#FFE14D" strokeWidth="1.8" />
        <path d="M58 236 L70 242 L62 250" stroke="#FFE14D" strokeWidth="1.8" />
      </g>
      <g fill="#FF4FD8" transform="rotate(-6 14 290)" style={{ fontFamily: MONO, fontSize: 11, fontWeight: 500 }}>
        <text x="14" y="290">best. month.</text>
        <text x="14" y="304">ever.</text>
      </g>

      {/* now playing chip */}
      <g transform="translate(12 314)">
        <rect width="156" height="32" rx="16" fill="#07060B" fillOpacity=".7" stroke="#3DF5FF" strokeOpacity=".5" />
        <circle cx="16" cy="16" r="10" fill="#FF4FD8" />
        <circle cx="16" cy="16" r="2.5" fill="#07060B" />
        <text x="32" y="14" fill="#F5F3FF" style={{ fontFamily: SYNE, fontWeight: 700, fontSize: 8 }}>Midnight Static</text>
        <text x="32" y="24" fill="#B9B4CC" style={{ fontFamily: MONO, fontSize: 6 }}>Neon Tides</text>
        <g fill="#3DF5FF">
          <rect x="126" y="12" width="2.5" height="10" rx="1" />
          <rect x="131" y="8" width="2.5" height="14" rx="1" />
          <rect x="136" y="14" width="2.5" height="8" rx="1" />
          <rect x="141" y="10" width="2.5" height="12" rx="1" />
        </g>
      </g>
    </svg>
  );
}
