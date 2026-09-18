// Small hand-drawn-style SVG accents — deliberately imperfect/wobbly path
// coordinates rather than clean geometry, to read as sketched, not vector art.

export function Star({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" fill="none" style={style}>
      <path
        d="M21 3 L25 17 L39 16 L27 25 L32 39 L21 30 L10 39 L15 25 L3 16 L17 17 Z"
        stroke="#171512"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="#ffe066"
      />
    </svg>
  );
}

export function Squiggle({ style, width = 90 }: { style?: React.CSSProperties; width?: number }) {
  return (
    <svg width={width} height="20" viewBox="0 0 90 20" fill="none" style={style}>
      <path
        d="M2 14 C 10 4, 18 20, 26 10 C 34 2, 42 18, 50 9 C 58 2, 66 18, 74 10 C 80 5, 84 12, 88 8"
        stroke="#171512"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

export function Arrow({ style }: { style?: React.CSSProperties }) {
  return (
    <svg width="60" height="50" viewBox="0 0 60 50" fill="none" style={style}>
      <path
        d="M4 8 C 20 6, 38 14, 48 32"
        stroke="#171512"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path d="M38 30 L48 34 L46 22" stroke="#171512" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

export function ScribbleCircle({ style, className }: { style?: React.CSSProperties; className?: string }) {
  return (
    <svg width="120" height="60" viewBox="0 0 120 60" fill="none" style={style} className={className}>
      <path
        d="M60 6 C 90 6, 114 18, 112 32 C 110 48, 78 56, 54 54 C 24 52, 4 40, 8 26 C 12 10, 40 4, 62 8"
        stroke="#171512"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
