// Verbatim from web/ref/HYPE-Monthly-Recap.html (lines 212-240) plus two
// small hover rules replacing the reference's non-standard `style-hover`
// attribute (Design Canvas-only; doesn't exist in real HTML/CSS).
export const CHROME_CSS = `
  html, body { margin: 0; padding: 0; background: #050505; }
  a { color: #39FF88; text-decoration: none; }
  a:hover { color: #F7F7F2; }
  *::-webkit-scrollbar { width: 0; height: 0; display: none; }
  @keyframes inA { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  @keyframes inB { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
  @keyframes upA { from { opacity: 0; transform: translateY(26px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes upB { from { opacity: 0; transform: translateY(26px) scale(.97); } to { opacity: 1; transform: none; } }
  @keyframes snapA { 0% { opacity: 0; transform: translateY(26px) scale(.9); } 70% { opacity: 1; transform: translateY(0) scale(1.03); } 100% { opacity: 1; transform: none; } }
  @keyframes snapB { 0% { opacity: 0; transform: translateY(26px) scale(.9); } 70% { opacity: 1; transform: translateY(0) scale(1.03); } 100% { opacity: 1; transform: none; } }
  @keyframes popA { 0% { opacity: 0; transform: scale(.4) rotate(-12deg); } 65% { opacity: 1; transform: scale(1.12) rotate(3deg); } 100% { opacity: 1; transform: none; } }
  @keyframes popB { 0% { opacity: 0; transform: scale(.4) rotate(-12deg); } 65% { opacity: 1; transform: scale(1.12) rotate(3deg); } 100% { opacity: 1; transform: none; } }
  @keyframes drawA { from { stroke-dashoffset: 1200; } to { stroke-dashoffset: 0; } }
  @keyframes drawB { from { stroke-dashoffset: 1200; } to { stroke-dashoffset: 0; } }
  @keyframes revealA { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes revealB { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
  @keyframes zoomA { from { transform: scale(1.12); } to { transform: scale(1); } }
  @keyframes zoomB { from { transform: scale(1.12); } to { transform: scale(1); } }
  @keyframes growA { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes growB { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes streakA { 0% { transform: translateX(-110%); opacity: 0; } 12% { opacity: 1; } 100% { transform: translateX(110%); opacity: 0; } }
  @keyframes streakB { 0% { transform: translateX(-110%); opacity: 0; } 12% { opacity: 1; } 100% { transform: translateX(110%); opacity: 0; } }
  @keyframes grain { 0% { transform: translate(0,0); } 25% { transform: translate(-3%,2%); } 50% { transform: translate(2%,-3%); } 75% { transform: translate(-2%,-2%); } 100% { transform: translate(0,0); } }
  @keyframes pulseGlow { 0%, 100% { opacity: .82; } 50% { opacity: 1; } }
  @keyframes drift { 0%, 100% { transform: translateY(0) rotate(-4deg); } 50% { transform: translateY(-9px) rotate(4deg); } }
  @keyframes spinSlow { from { transform: rotate(0); } to { transform: rotate(360deg); } }
  @keyframes eq { 0%, 100% { transform: scaleY(.35); } 50% { transform: scaleY(1); } }
  .hype-nav-btn:hover { color: #F7F7F2; }
  .hype-next-btn:hover { transform: translateY(-2px); }
`;
