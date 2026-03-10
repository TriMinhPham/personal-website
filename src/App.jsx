import { useState, useEffect, useRef, useCallback } from "react";

// ─── Tokens ─────────────────────────────────────────

const T = {
  bg: "#e8e4dc",
  surface: "#ddd8ce",
  card: "#f2eed8",
  cardBack: "#3d2b1f",
  text: "#1a1a1f",
  textSec: "#5a5650",
  textDim: "#9a958e",
  gold: "#b8964e",
  goldDark: "#8a6d30",
  // YGO frame colors
  frameNormal: "#c4a44a",
  frameEffect: "#b85c2a",
  frameSpell: "#1d8a6e",
  frameTrap: "#9e2d6a",
  frameRitual: "#4a6ec4",
  frameUltra: "#c4a44a",
  // Rarity
  holoGrad: "linear-gradient(135deg, #e84393, #6b5ce7, #00b4d8, #d4a017, #e84393)",
  mono: `'JetBrains Mono', 'SF Mono', monospace`,
  sans: `'Inter', -apple-system, sans-serif`,
  serif: `'Instrument Serif', Georgia, serif`,
  easeOut: "cubic-bezier(0.16, 1, 0.3, 1)",
};

// YGO card: 86mm × 59mm → ratio 1.4576:1 (h:w)
const CARD_RATIO = 86 / 59;

// ─── SFX Engine ─────────────────────────────────────

let audioCtx = null;
const getAudio = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
};

// Helper: create noise buffer
const makeNoise = (ctx, dur) => {
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
};

const playRipSFX = () => {
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;

    // Layer 1: Initial foil crinkle — high-pitched filtered noise burst
    const n1 = ctx.createBufferSource();
    n1.buffer = makeNoise(ctx, 0.8);
    const bp1 = ctx.createBiquadFilter();
    bp1.type = "bandpass"; bp1.frequency.value = 4500; bp1.Q.value = 2;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.3, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    n1.connect(bp1); bp1.connect(g1); g1.connect(ctx.destination);
    n1.start(now);

    // Layer 2: Main tear — mid-freq noise with crackle pops, longer sustain
    const dur2 = 0.5;
    const buf2 = ctx.createBuffer(1, ctx.sampleRate * dur2, ctx.sampleRate);
    const d2 = buf2.getChannelData(0);
    for (let i = 0; i < d2.length; i++) {
      const t = i / ctx.sampleRate;
      const pop = Math.random() > (0.85 + t * 0.3) ? (Math.random() * 2 - 1) * 2.5 : 0;
      const tear = (Math.random() * 2 - 1) * 0.4;
      const env = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 5);
      d2[i] = (tear + pop) * env;
    }
    const n2 = ctx.createBufferSource();
    n2.buffer = buf2;
    const bp2 = ctx.createBiquadFilter();
    bp2.type = "bandpass"; bp2.frequency.value = 2200; bp2.Q.value = 0.6;
    const g2 = ctx.createGain();
    g2.gain.value = 0.4;
    n2.connect(bp2); bp2.connect(g2); g2.connect(ctx.destination);
    n2.start(now + 0.03);

    // Layer 3: Low thud — the wrapper separating
    const osc = ctx.createOscillator();
    osc.type = "sine"; osc.frequency.setValueAtTime(120, now + 0.08);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0, now);
    g3.gain.linearRampToValueAtTime(0.2, now + 0.1);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(g3); g3.connect(ctx.destination);
    osc.start(now + 0.06); osc.stop(now + 0.4);

    // Layer 4: Final foil crinkle trail
    const n4 = ctx.createBufferSource();
    n4.buffer = makeNoise(ctx, 0.4);
    const hp4 = ctx.createBiquadFilter();
    hp4.type = "highpass"; hp4.frequency.value = 6000;
    const g4 = ctx.createGain();
    g4.gain.setValueAtTime(0, now + 0.15);
    g4.gain.linearRampToValueAtTime(0.12, now + 0.2);
    g4.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    n4.connect(hp4); hp4.connect(g4); g4.connect(ctx.destination);
    n4.start(now + 0.15);
  } catch (e) {}
};

const playDealSFX = () => {
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;

    const snap = ctx.createBufferSource();
    snap.buffer = makeNoise(ctx, 0.06);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 1.2;
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.35, now);
    g1.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    snap.connect(bp); bp.connect(g1); g1.connect(ctx.destination);
    snap.start(now);

    const slide = ctx.createBufferSource();
    slide.buffer = makeNoise(ctx, 0.12);
    const bp2 = ctx.createBiquadFilter();
    bp2.type = "bandpass";
    bp2.frequency.setValueAtTime(1500, now);
    bp2.frequency.exponentialRampToValueAtTime(400, now + 0.1);
    bp2.Q.value = 0.8;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.15, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    slide.connect(bp2); bp2.connect(g2); g2.connect(ctx.destination);
    slide.start(now);

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.06);
    const g3 = ctx.createGain();
    g3.gain.setValueAtTime(0.1, now);
    g3.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
    osc.connect(g3); g3.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.08);
  } catch (e) {}
};

const playFlipSFX = () => {
  try {
    const ctx = getAudio();
    const now = ctx.currentTime;

    const flick = ctx.createBufferSource();
    flick.buffer = makeNoise(ctx, 0.05);
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass"; bp.frequency.value = 5000; bp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    flick.connect(bp); bp.connect(g); g.connect(ctx.destination);
    flick.start(now);

    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(2800, now);
    osc.frequency.exponentialRampToValueAtTime(1800, now + 0.06);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.08, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g2); g2.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.08);
  } catch (e) {}
};

// ─── Hooks ──────────────────────────────────────────

function useInView() {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.unobserve(el); } },
      { threshold: 0.15, rootMargin: "0px 0px -30px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return [ref, vis];
}

function useScrollProgress() {
  const [p, setP] = useState(0);
  useEffect(() => {
    const fn = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      setP(h > 0 ? window.scrollY / h : 0);
    };
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);
  return p;
}

// ─── Styles ─────────────────────────────────────────

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500&display=swap');
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth;-webkit-font-smoothing:antialiased}
    body{background:${T.bg};color:${T.text};font-family:${T.sans};overflow-x:hidden}
    ::selection{background:rgba(184,150,78,0.25)}
    @keyframes holoShimmer{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
    @keyframes breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-5px) scale(1.01)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
    @keyframes cardReveal{from{opacity:0;transform:scale(0.6) rotateZ(12deg)}to{opacity:1;transform:scale(1) rotateZ(0deg)}}
    @keyframes sparkle{0%,100%{opacity:0.3}50%{opacity:1}}

    /* Pack rip — tear top off */
    @keyframes ripTopPeel{
      0%{clip-path:polygon(0 0, 100% 0, 100% 22%, 0 18%); transform:perspective(600px) rotateX(0deg) translateY(0)}
      40%{clip-path:polygon(0 0, 100% 0, 100% 22%, 0 18%); transform:perspective(600px) rotateX(70deg) translateY(-20px)}
      100%{clip-path:polygon(0 0, 100% 0, 100% 22%, 0 18%); transform:perspective(600px) rotateX(120deg) translateY(-80px); opacity:0}
    }
    @keyframes packBodyTearOpen{
      0%{clip-path:polygon(0 18%, 100% 22%, 100% 100%, 0 100%); transform:translateY(0)}
      100%{clip-path:polygon(0 0, 100% 0, 100% 100%, 0 100%); transform:translateY(0)}
    }
    @keyframes cardsRise{
      0%{opacity:0; transform:translateY(30px) scale(0.9)}
      50%{opacity:1; transform:translateY(-10px) scale(1.02)}
      100%{opacity:1; transform:translateY(0) scale(1)}
    }

    .rip-top{animation: ripTopPeel 0.55s ${T.easeOut} forwards; transform-origin: center top}
    .pack-body{animation: packBodyTearOpen 0.4s ${T.easeOut} 0.15s forwards}
    .cards-spill{animation: cardsRise 0.6s ${T.easeOut} 0.35s both}

    /* Foil particles during rip */
    @keyframes particle{
      0%{opacity:1;transform:translate(0,0) scale(1)}
      100%{opacity:0;transform:translate(var(--px,20px),var(--py,-40px)) scale(0)}
    }
    .foil-particle{
      position:absolute;
      width:3px;height:3px;
      border-radius:50%;
      animation: particle 0.6s ${T.easeOut} forwards;
      pointer-events:none;
    }

    @keyframes shimmerArrow{0%,100%{opacity:0.3;transform:translateX(0)}50%{opacity:1;transform:translateX(4px)}}

    ::-webkit-scrollbar{width:6px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(0,0,0,0.1);border-radius:3px}
  `}</style>
);

// ─── YGO Card Back ──────────────────────────────────

const CardBackDesign = ({ width = "100%", height = "100%" }) => (
  <div style={{
    width, height, borderRadius: 8,
    background: T.cardBack,
    display: "flex", alignItems: "center", justifyContent: "center",
    position: "relative", overflow: "hidden",
    border: "3px solid #2a1a0e",
  }}>
    <div style={{
      position: "absolute", inset: 8,
      border: "2px solid rgba(184,150,78,0.2)",
      borderRadius: 6,
    }} />
    <div style={{
      position: "absolute", inset: 16,
      border: "1px solid rgba(184,150,78,0.12)",
      borderRadius: 4,
    }} />
    <div style={{
      width: "55%", height: "45%",
      borderRadius: "50%",
      border: "2px solid rgba(184,150,78,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse, rgba(184,150,78,0.08), transparent)",
    }}>
      <div style={{
        width: "70%", height: "70%",
        borderRadius: "50%",
        border: "1.5px solid rgba(184,150,78,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 20, height: 20,
          border: "2px solid rgba(184,150,78,0.3)",
          transform: "rotate(45deg)",
        }} />
      </div>
    </div>
    {[{ top: 6, left: 6 }, { top: 6, right: 6 }, { bottom: 6, left: 6 }, { bottom: 6, right: 6 }].map((pos, i) => (
      <div key={i} style={{
        position: "absolute", ...pos,
        width: 12, height: 12,
        borderTop: "1.5px solid rgba(184,150,78,0.2)",
        borderLeft: "1.5px solid rgba(184,150,78,0.2)",
        transform: `rotate(${i * 90}deg)`,
      }} />
    ))}
  </div>
);

// ─── Pack Opening ───────────────────────────────────

// Seeded random for deterministic jagged tear edge
const seededRand = (seed) => {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
};

// Generate a static jagged tear path (SVG polygon points)
const TEAR_SEED = 42;
const makeTearPath = (w, baseY, amplitude, segments) => {
  const rng = seededRand(TEAR_SEED);
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const x = (i / segments) * w;
    const jag = (rng() - 0.5) * 2 * amplitude;
    pts.push(`${x},${baseY + jag}`);
  }
  return pts;
};

const RIP_DISTANCE = 130;
const FLAP_PCT = 0.20;

const PackHero = ({ opened, ripping, onRip }) => {
  const [hov, setHov] = useState(false);
  const packRef = useRef(null);
  const progressRef = useRef(0);
  const [, forceRender] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastCrinkleAt = useRef(0);
  const [particles, setParticles] = useState([]);
  const particleId = useRef(0);
  const rafRef = useRef(null);

  const progress = progressRef.current;

  const packW = 240;
  const packH = packW * CARD_RATIO;
  const flapH = packH * FLAP_PCT;
  const tearPts = useRef(makeTearPath(packW, flapH, 4, 16)).current;

  // Build SVG clip paths from the jagged tear line
  const tearTop = `0,0 ${packW},0 ${packW},${flapH - 6} ${[...tearPts].reverse().join(" ")} 0,${flapH - 6}`;
  const tearBottom = `${tearPts.join(" ")} ${packW},${flapH - 6} ${packW},${packH} 0,${packH} 0,${flapH - 6}`;

  // Emit foil confetti
  const emitParticles = useCallback((count = 1) => {
    const now = Date.now();
    if (now - lastCrinkleAt.current < 35) return;
    lastCrinkleAt.current = now;
    const colors = ["#e84393", "#6b5ce7", "#00b4d8", "#d4a017", "#fff", "#f8b4d9", "#a78bfa"];
    const newP = [];
    for (let i = 0; i < count; i++) {
      const id = particleId.current++;
      newP.push({
        id, color: colors[id % colors.length],
        left: 5 + Math.random() * 90,
        size: 2 + Math.random() * 3,
        px: (Math.random() - 0.5) * 70,
        py: -20 - Math.random() * 60,
        rot: Math.random() * 360,
        dur: 0.4 + Math.random() * 0.4,
      });
    }
    setParticles(prev => [...prev.slice(-24), ...newP]);
    newP.forEach(p => setTimeout(() => setParticles(prev => prev.filter(pp => pp.id !== p.id)), p.dur * 1000));

    // Crinkle SFX
    try {
      const ctx = getAudio();
      const t = ctx.currentTime;
      const n = ctx.createBufferSource();
      n.buffer = makeNoise(ctx, 0.08);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 3500 + Math.random() * 3000; bp.Q.value = 1.2;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.05 + Math.random() * 0.05, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
      n.connect(bp); bp.connect(g); g.connect(ctx.destination);
      n.start(t);
    } catch (e) {}
  }, []);

  const getClientPos = (e) => {
    if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  };

  const handlePointerDown = useCallback((e) => {
    if (ripping || opened || finishing) return;
    if (!packRef.current) return;
    const rect = packRef.current.getBoundingClientRect();
    const pos = getClientPos(e);
    if ((pos.y - rect.top) / rect.height > 0.4) return;
    e.preventDefault();
    dragStart.current = { x: pos.x, y: pos.y };
    setDragging(true);
  }, [ripping, opened, finishing]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging || finishing) return;
    e.preventDefault();
    const pos = getClientPos(e);
    const dx = pos.x - dragStart.current.x;
    const dy = dragStart.current.y - pos.y;
    const dist = Math.max(0, dx * 0.6 + dy * 0.9 + Math.abs(dx) * 0.15);
    const newP = Math.min(1, dist / RIP_DISTANCE);
    if (newP > progressRef.current) {
      const delta = newP - progressRef.current;
      progressRef.current = newP;
      emitParticles(delta > 0.06 ? 3 : delta > 0.03 ? 2 : 1);
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => { rafRef.current = null; forceRender(n => n + 1); });
      }
    }
  }, [dragging, finishing, emitParticles]);

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    if (progressRef.current >= 0.8) {
      setFinishing(true);
      progressRef.current = 1;
      playRipSFX();
      // Burst of confetti
      for (let i = 0; i < 5; i++) setTimeout(() => emitParticles(3), i * 40);
      forceRender(n => n + 1);
      setTimeout(() => onRip(), 150);
    }
  }, [dragging, onRip, emitParticles]);

  useEffect(() => {
    if (!dragging) return;
    const move = (e) => handlePointerMove(e);
    const up = () => handlePointerUp();
    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); window.removeEventListener("touchmove", move); window.removeEventListener("touchend", up); };
  }, [dragging, handlePointerMove, handlePointerUp]);

  if (opened) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="cards-spill" style={{ textAlign: "center" }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.16em", marginBottom: 16 }}>INVENTOR · FOUNDER · BUILDER</div>
          <h1 style={{ fontFamily: T.sans, fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: T.text, lineHeight: 1.08, letterSpacing: "-0.04em", marginBottom: 10 }}>Tri Pham</h1>
          <p style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 19, color: T.textSec, marginBottom: 6 }}>AI agent infrastructure from Tokyo</p>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.06em", marginBottom: 6 }}>KAI株式会社</div>
          <div style={{ color: T.textDim, fontSize: 13, marginTop: 40, animation: "breathe 3s ease-in-out infinite" }}>↓ scroll to draw</div>
        </div>
      </div>
    );
  }

  const p = progress;
  const active = p > 0;
  // Eased progress for smoother visual
  const ep = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;

  // Flap transform values
  const flapRotate = ep * 155;
  const flapLift = ep * 40;
  // Curl shading: as flap rotates past 90deg, show inner foil (silver)
  const showInner = flapRotate > 85;
  const innerOpacity = Math.max(0, (flapRotate - 85) / 70);
  // Shadow under flap grows with progress
  const shadowBlur = 4 + ep * 20;
  const shadowY = 2 + ep * 8;
  // Gap between flap and body for card peek
  const gapPx = ep * 20;

  // Inline SVG for jagged clip
  const svgClipTop = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${packW} ${packH}'><clipPath id='c' clipPathUnits='objectBoundingBox'><polygon points='${tearTop.split(" ").map(pt => { const [x, y] = pt.split(","); return `${(x / packW).toFixed(4)},${(y / packH).toFixed(4)}`; }).join(" ")}'/></clipPath></svg>`)}")`;
  // Use polygon clip-path directly (better browser support)
  const topClipPts = tearTop.split(" ").map(pt => { const [x, y] = pt.split(","); return `${(x / packW * 100).toFixed(2)}% ${(y / packH * 100).toFixed(2)}%`; }).join(", ");
  const botClipPts = tearBottom.split(" ").map(pt => { const [x, y] = pt.split(","); return `${(x / packW * 100).toFixed(2)}% ${(y / packH * 100).toFixed(2)}%`; }).join(", ");
  const topClip = `polygon(${topClipPts})`;
  const botClip = `polygon(${botClipPts})`;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "repeating-conic-gradient(rgba(0,0,0,0.03) 0% 25%, transparent 0% 50%)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

      <div
        ref={packRef}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ position: "relative", width: packW, height: packH, touchAction: "none", userSelect: "none", cursor: finishing ? "default" : active ? "grabbing" : "grab" }}
      >
        {!finishing ? (
          <div style={{ position: "absolute", inset: 0, animation: active ? "none" : "breathe 3s ease-in-out infinite" }}>

            {/* ── Pack body (below tear line) ── */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: 10,
              clipPath: active ? botClip : "none",
              background: T.holoGrad, backgroundSize: "300% 300%",
              animation: "holoShimmer 3s ease infinite",
              opacity: hov || active ? 1 : 0.7,
              boxShadow: hov || active ? "0 30px 60px rgba(0,0,0,0.2), 0 0 40px rgba(184,150,78,0.15)" : "0 16px 40px rgba(0,0,0,0.12)",
              transition: active ? "none" : `all 0.5s ${T.easeOut}`,
              transform: hov && !active ? "scale(1.03)" : "scale(1)",
            }} />
            <div style={{
              position: "absolute", inset: 4, borderRadius: 7,
              clipPath: active ? botClip : "none",
              background: T.cardBack,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10,
            }}>
              <div style={{ position: "absolute", inset: 10, border: "1.5px solid rgba(184,150,78,0.15)", borderRadius: 4 }} />
              <div style={{ width: 40, height: 40, border: "2px solid rgba(184,150,78,0.25)", transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 20, height: 20, border: "1.5px solid rgba(184,150,78,0.15)" }} />
              </div>
              <div style={{ fontFamily: T.serif, fontSize: 24, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>Tri Pham</div>
              <div style={{ fontFamily: T.mono, fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}>KAI株式会社 · TOKYO</div>
              <div style={{ position: "absolute", bottom: 24, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, opacity: active ? 0 : 1, transition: "opacity 0.3s" }}>
                <div style={{ width: 30, height: 1, background: hov ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.12)", transition: "all 0.4s" }} />
                <span style={{ fontFamily: T.mono, fontSize: 8, color: hov ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.15)", letterSpacing: "0.2em", transition: "all 0.4s" }}>RIP OPEN</span>
              </div>
            </div>

            {/* ── Exposed cards underneath ── */}
            {active && (
              <div style={{
                position: "absolute", left: 6, right: 6,
                top: flapH - 6, height: gapPx + 12,
                overflow: "hidden", pointerEvents: "none",
                opacity: Math.min(1, p * 4),
                filter: `brightness(${0.7 + p * 0.3})`,
              }}>
                <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: packH * 0.5 }}>
                  <CardBackDesign />
                </div>
              </div>
            )}

            {/* ── Shadow under lifted flap ── */}
            {active && (
              <div style={{
                position: "absolute", left: 10, right: 10,
                top: flapH - 4, height: 6,
                background: `rgba(0,0,0,${0.08 + ep * 0.12})`,
                filter: `blur(${shadowBlur}px)`,
                borderRadius: "50%",
                pointerEvents: "none", zIndex: 2,
              }} />
            )}

            {/* ── Top flap (peels up with jagged edge + inner foil) ── */}
            {active && (
              <div style={{
                position: "absolute", left: 0, right: 0, top: 0,
                height: flapH + 4,
                overflow: "visible",
                transformOrigin: "center bottom",
                transform: `perspective(800px) rotateX(${flapRotate}deg) translateY(${-flapLift}px)`,
                transition: dragging ? "none" : `transform 0.4s ${T.easeOut}`,
                zIndex: 4, pointerEvents: "none",
                filter: `drop-shadow(0 ${shadowY}px ${shadowBlur}px rgba(0,0,0,0.25))`,
              }}>
                {/* Outer foil face */}
                <div style={{
                  position: "absolute", inset: 0,
                  borderRadius: "10px 10px 0 0",
                  background: T.holoGrad, backgroundSize: "300% 300%",
                  animation: "holoShimmer 3s ease infinite",
                  clipPath: topClip,
                  opacity: showInner ? 1 - innerOpacity * 0.5 : 1,
                }} />
                {/* Dark body */}
                <div style={{
                  position: "absolute", left: 4, right: 4, top: 4, bottom: 0,
                  borderRadius: "7px 7px 0 0",
                  background: T.cardBack,
                  clipPath: topClip,
                }} />
                {/* Inner foil face (visible when curled past 90°) */}
                {showInner && (
                  <div style={{
                    position: "absolute", inset: 0,
                    borderRadius: "10px 10px 0 0",
                    background: "linear-gradient(180deg, #e8e0d4 0%, #c8bfb0 40%, #a89f90 100%)",
                    clipPath: topClip,
                    opacity: innerOpacity * 0.85,
                  }} />
                )}
                {/* Holographic light catch on the curl fold */}
                <div style={{
                  position: "absolute", left: 0, right: 0, bottom: 0, height: 8,
                  background: `linear-gradient(90deg, rgba(232,67,147,${0.2 + ep * 0.3}), rgba(107,92,231,${0.3 + ep * 0.3}), rgba(0,180,216,${0.2 + ep * 0.3}), rgba(212,160,23,${0.2 + ep * 0.2}))`,
                  filter: `blur(${1 + ep * 2}px)`,
                  opacity: Math.min(1, p * 5),
                  clipPath: topClip,
                }} />
              </div>
            )}

            {/* ── Hover hint line ── */}
            {!active && hov && (
              <div style={{
                position: "absolute", left: 8, right: 8, top: flapH + 2, height: 1,
                background: "rgba(255,255,255,0.15)",
                boxShadow: "0 0 6px rgba(232,67,147,0.1)",
                zIndex: 2, pointerEvents: "none",
              }} />
            )}

            {/* ── Foil confetti particles ── */}
            {particles.map(pp => (
              <div key={pp.id} style={{
                position: "absolute",
                left: `${pp.left}%`, top: flapH,
                width: pp.size, height: pp.size,
                background: pp.color,
                borderRadius: pp.size > 3 ? 1 : "50%",
                transform: `rotate(${pp.rot}deg)`,
                animation: `particle ${pp.dur}s ${T.easeOut} forwards`,
                "--px": `${pp.px}px`, "--py": `${pp.py}px`,
                pointerEvents: "none", zIndex: 6,
                boxShadow: `0 0 3px ${pp.color}40`,
              }} />
            ))}
          </div>
        ) : (
          /* ── Auto-complete rip animation ── */
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div className="rip-top" style={{ position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", zIndex: 3 }}>
              <div style={{ position: "absolute", inset: 0, background: T.holoGrad, backgroundSize: "300% 300%", animation: "holoShimmer 3s ease infinite" }} />
              <div style={{ position: "absolute", inset: 4, borderRadius: 7, background: T.cardBack }} />
            </div>
            <div className="pack-body" style={{ position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", zIndex: 2 }}>
              <div style={{ position: "absolute", inset: 0, background: T.holoGrad, backgroundSize: "300% 300%", animation: "holoShimmer 3s ease infinite" }} />
              <div style={{ position: "absolute", inset: 4, borderRadius: 7, background: T.cardBack }} />
            </div>
            <div className="cards-spill" style={{ position: "absolute", inset: 6, zIndex: 1 }}><CardBackDesign /></div>
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className="foil-particle" style={{
                left: `${10 + Math.random() * 80}%`, top: `${12 + Math.random() * 10}%`,
                width: 2 + Math.random() * 3, height: 2 + Math.random() * 3,
                background: ["#e84393", "#6b5ce7", "#00b4d8", "#d4a017", "#fff", "#f8b4d9", "#a78bfa"][i % 7],
                "--px": `${(Math.random() - 0.5) * 80}px`, "--py": `${-25 - Math.random() * 60}px`,
                animationDelay: `${Math.random() * 0.25}s`, zIndex: 4,
                borderRadius: Math.random() > 0.5 ? "50%" : "1px",
                boxShadow: `0 0 4px ${["#e84393", "#6b5ce7", "#00b4d8", "#d4a017"][i % 4]}30`,
              }} />
            ))}
          </div>
        )}
      </div>

      {!active && !finishing && (
        <div style={{ marginTop: 32, fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.1em", opacity: hov ? 1 : 0.5, transition: "opacity 0.3s" }}>
          drag top to rip open
        </div>
      )}
    </div>
  );
};

// ─── YGO Card Component ─────────────────────────────

const YGOCard = ({ card, delay = 0, rotation = 0, width = 260 }) => {
  const [ref, vis] = useInView();
  const [flipped, setFlipped] = useState(false);
  const [hov, setHov] = useState(false);
  const cardRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [dealt, setDealt] = useState(false);

  useEffect(() => {
    if (vis && !dealt) {
      const timer = setTimeout(() => { playDealSFX(); setDealt(true); }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [vis, dealt, delay]);

  const handleMove = useCallback((e) => {
    if (!cardRef.current || flipped) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setMouse({ x, y });
    setTilt({ x: ((y - 50) / 50) * -8, y: ((x - 50) / 50) * 8 });
  }, [flipped]);

  const handleFlip = () => { setFlipped(!flipped); playFlipSFX(); };
  const height = width * CARD_RATIO;

  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? `rotate(${rotation}deg)` : `translateY(-80px) rotate(${rotation + 12}deg) scale(0.7)`,
      transition: `all 0.65s ${T.easeOut} ${delay}s`,
      perspective: 1200,
      width, flexShrink: 0,
    }}>
      <div
        ref={cardRef}
        onClick={handleFlip}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => { setHov(false); setTilt({ x: 0, y: 0 }); }}
        onMouseMove={handleMove}
        style={{
          width, height, cursor: "pointer",
          position: "relative", transformStyle: "preserve-3d",
          transition: flipped ? `transform 0.55s ${T.easeOut}` : "transform 0.12s ease-out",
          transform: flipped
            ? "rotateY(180deg)"
            : `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hov ? "translateY(-10px) scale(1.03)" : ""}`,
          filter: hov && !flipped ? "drop-shadow(0 20px 30px rgba(0,0,0,0.18))" : "drop-shadow(0 6px 16px rgba(0,0,0,0.1))",
        }}
      >
        {/* FRONT */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          borderRadius: 8, overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", inset: 0, zIndex: 10, borderRadius: 8,
            opacity: hov ? 0.5 : 0,
            transition: "opacity 0.4s",
            background: `radial-gradient(circle at ${mouse.x}% ${mouse.y}%, rgba(232,67,147,0.15), rgba(107,92,231,0.1) 25%, rgba(0,180,216,0.08) 45%, rgba(255,215,0,0.05) 65%, transparent 80%)`,
            pointerEvents: "none", mixBlendMode: "screen",
          }} />

          <YGOCardFront card={card} />
        </div>

        {/* BACK */}
        <div style={{
          position: "absolute", inset: 0, backfaceVisibility: "hidden",
          transform: "rotateY(180deg)", borderRadius: 8, overflow: "hidden",
        }}>
          <YGOCardBack card={card} />
        </div>
      </div>
    </div>
  );
};

// ─── YGO Card Front Design ──────────────────────────

const YGOCardFront = ({ card }) => {
  const frameColor = card.frame;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: frameColor,
      borderRadius: 8,
      padding: 6,
      display: "flex", flexDirection: "column",
      border: `2px solid ${frameColor}`,
      position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 4, borderRadius: 5,
        border: "1px solid rgba(255,255,255,0.2)",
        pointerEvents: "none",
      }} />

      {/* Name bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "6px 10px 4px",
        position: "relative",
      }}>
        <span style={{
          fontFamily: T.sans, fontSize: 13, fontWeight: 800,
          color: "#1a1a1f", letterSpacing: "-0.01em",
          textShadow: "0 0.5px 0 rgba(255,255,255,0.3)",
        }}>{card.name}</span>
        <div style={{
          width: 20, height: 20, borderRadius: "50%",
          background: card.attrColor,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 10, color: "#fff", fontWeight: 700,
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}>{card.attrIcon}</div>
      </div>

      {/* Level stars */}
      {card.level && (
        <div style={{
          display: "flex", justifyContent: "flex-end",
          gap: 1, padding: "0 10px 4px",
        }}>
          {Array.from({ length: card.level }).map((_, i) => (
            <span key={i} style={{
              fontSize: 10, color: "#d4a017",
              textShadow: "0 0 2px rgba(212,160,23,0.5)",
            }}>★</span>
          ))}
        </div>
      )}

      {/* Art box */}
      <div style={{
        margin: "0 8px",
        flex: "1 1 auto",
        minHeight: 0,
        borderRadius: 3,
        border: "2px solid rgba(0,0,0,0.12)",
        background: card.artBg,
        position: "relative", overflow: "hidden",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          fontSize: 44, opacity: 0.15, fontFamily: T.serif,
          color: T.text, userSelect: "none",
        }}>{card.artIcon}</div>
        {card.edition && (
          <div style={{
            position: "absolute", bottom: 4, left: 6,
            fontFamily: T.mono, fontSize: 7, fontWeight: 500,
            color: T.goldDark, letterSpacing: "0.1em",
            background: "rgba(255,255,255,0.7)",
            padding: "1px 4px", borderRadius: 1,
          }}>{card.edition}</div>
        )}
        {card.rarity === "ultra" && (
          <div style={{
            position: "absolute", inset: 0,
            background: T.holoGrad, backgroundSize: "300% 300%",
            animation: "holoShimmer 4s ease infinite",
            opacity: 0.08, pointerEvents: "none",
          }} />
        )}
      </div>

      {/* Type line */}
      <div style={{
        margin: "5px 8px 0",
        padding: "3px 6px",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
      }}>
        <span style={{
          fontFamily: T.sans, fontSize: 8, fontWeight: 700,
          color: "#1a1a1f",
          letterSpacing: "0.02em",
        }}>[{card.type}]</span>
      </div>

      {/* Text box */}
      <div style={{
        margin: "0 8px",
        padding: "6px 6px",
        flex: "0 0 auto",
        minHeight: 52,
        background: "rgba(255,255,255,0.3)",
        border: "1px solid rgba(0,0,0,0.06)",
        borderRadius: 2,
      }}>
        <p style={{
          fontSize: 9, color: "#2a2a2e", lineHeight: 1.45,
          fontFamily: T.sans, fontWeight: 400,
        }}>{card.flavor}</p>
      </div>

      {/* ATK / DEF bar */}
      {card.atk !== undefined && (
        <div style={{
          display: "flex", justifyContent: "flex-end",
          gap: 12, padding: "5px 10px 4px",
        }}>
          <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 800, color: "#1a1a1f" }}>
            ATK/{card.atk}
          </span>
          <span style={{ fontFamily: T.sans, fontSize: 10, fontWeight: 800, color: "#1a1a1f" }}>
            DEF/{card.def}
          </span>
        </div>
      )}

      {/* Card number + rarity stamp */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "0 10px 4px",
      }}>
        <span style={{ fontFamily: T.mono, fontSize: 6, color: "rgba(0,0,0,0.25)" }}>{card.id}</span>
        <span style={{ fontFamily: T.mono, fontSize: 6, color: "rgba(0,0,0,0.25)" }}>© KAI KK</span>
      </div>
    </div>
  );
};

// ─── YGO Card Back (details) ────────────────────────

const YGOCardBack = ({ card }) => (
  <div style={{
    width: "100%", height: "100%",
    background: "#faf7ee",
    borderRadius: 8, border: `2px solid ${card.frame}`,
    padding: 6,
  }}>
    <div style={{
      height: "100%", borderRadius: 4,
      border: "1px solid rgba(0,0,0,0.06)",
      padding: 18, overflow: "auto",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <h3 style={{ fontFamily: T.sans, fontSize: 16, fontWeight: 800, color: T.text }}>{card.name}</h3>
        <span style={{ fontFamily: T.mono, fontSize: 8, color: T.textDim }}>FLIP SIDE</span>
      </div>

      {[
        { l: "PROBLEM", t: card.problem },
        { l: "THESIS", t: card.thesis },
        { l: "DETAILS", t: card.detail },
      ].map(s => (
        <div key={s.l} style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: T.mono, fontSize: 8, color: T.gold, letterSpacing: "0.14em", marginBottom: 3 }}>{s.l}</div>
          <p style={{ fontSize: 11, color: T.textSec, lineHeight: 1.55 }}>{s.t}</p>
        </div>
      ))}

      <div style={{ marginTop: "auto", fontFamily: T.mono, fontSize: 7, color: T.textDim, textAlign: "right" }}>tap to flip</div>
    </div>
  </div>
);

// ─── Info Card (non-flippable) ──────────────────────

const SmallCard = ({ children, delay = 0, rotation = 0, frame = T.frameNormal }) => {
  const [ref, vis] = useInView();
  const [hov, setHov] = useState(false);
  const [dealt, setDealt] = useState(false);

  useEffect(() => {
    if (vis && !dealt) {
      const timer = setTimeout(() => { playDealSFX(); setDealt(true); }, delay * 1000);
      return () => clearTimeout(timer);
    }
  }, [vis, dealt, delay]);

  return (
    <div ref={ref}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? `rotate(${hov ? 0 : rotation}deg) ${hov ? "translateY(-8px)" : ""}` : `translateY(-50px) rotate(${rotation + 8}deg) scale(0.8)`,
        transition: `all 0.6s ${T.easeOut} ${delay}s`,
        borderRadius: 8, background: frame, padding: 5,
        border: `2px solid ${frame}`,
        boxShadow: hov ? "0 16px 40px rgba(0,0,0,0.12)" : "0 4px 12px rgba(0,0,0,0.06)",
        cursor: "default",
      }}
    >
      <div style={{
        borderRadius: 4, border: "1px solid rgba(0,0,0,0.06)",
        background: "rgba(255,255,255,0.3)", padding: 16,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", inset: 0, opacity: 0.015, backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.5) 8px, rgba(0,0,0,0.5) 9px)", pointerEvents: "none" }} />
        <div style={{ position: "relative" }}>{children}</div>
      </div>
    </div>
  );
};

// ─── Draw Label ─────────────────────────────────────

const DrawLabel = ({ children, delay = 0 }) => {
  const [ref, vis] = useInView();
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0, transform: vis ? "none" : "translateY(14px)",
      transition: `all 0.5s ${T.easeOut} ${delay}s`,
      textAlign: "center", marginBottom: 40,
    }}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        fontFamily: T.mono, fontSize: 9, color: T.textDim,
        letterSpacing: "0.18em", textTransform: "uppercase",
      }}>
        <span style={{ width: 16, height: 1, background: T.textDim }} />
        {children}
        <span style={{ width: 16, height: 1, background: T.textDim }} />
      </div>
    </div>
  );
};

// ─── Note Row ───────────────────────────────────────

const NoteRow = ({ text, index }) => {
  const [ref, vis] = useInView();
  const [hov, setHov] = useState(false);
  return (
    <div ref={ref} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? `translateX(0) rotate(${hov ? 0 : (index % 2 ? 0.4 : -0.4)}deg)` : "translateX(-30px) rotate(-2deg)",
        transition: `all 0.5s ${T.easeOut} ${index * 0.08}s`,
        padding: "14px 18px",
        background: T.card, borderRadius: 8,
        border: `2px solid ${hov ? T.frameNormal : "rgba(0,0,0,0.06)"}`,
        cursor: "pointer",
        boxShadow: hov ? "0 8px 20px rgba(0,0,0,0.06)" : "0 2px 6px rgba(0,0,0,0.02)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 600, color: hov ? T.text : T.textSec, transition: "color 0.3s" }}>{text}</span>
      <span style={{ fontSize: 13, color: T.textDim, transition: `transform 0.3s ${T.easeOut}`, transform: hov ? "translateX(3px)" : "none", display: "inline-block" }}>→</span>
    </div>
  );
};

// ─── Data ───────────────────────────────────────────

const CARDS = [
  {
    name: "ALIVE", id: "KAI-001", frame: T.frameUltra, rarity: "ultra", edition: "1ST EDITION",
    attrColor: "#8b6914", attrIcon: "⚡", level: 8,
    type: "Architecture / Effect", artBg: "linear-gradient(150deg, #f8f0d8, #e8d8b8)", artIcon: "◈",
    flavor: "A single-call cognitive architecture for persistent autonomous characters. When summoned, all subsystems activate in one cycle.",
    atk: 3000, def: 2500,
    problem: "Frameworks treat agents as stateless. Persistent characters need drives, affect, memory, gated actions.",
    thesis: "Full cognitive loop in one LLM call. Persistence becomes practical.",
    detail: "Published paper. 18-run ablation study. Drives → affect → salience → gating → action.",
  },
  {
    name: "alive-memory", id: "KAI-002", frame: T.frameEffect,
    attrColor: "#b85c2a", attrIcon: "●", level: 6,
    type: "SDK / Effect", artBg: "linear-gradient(150deg, #e8e0f0, #d0c8e8)", artIcon: "◇",
    flavor: "Cognitive memory layer — hot/warm/cold tiers. When activated, recall operates beyond naive retrieval.",
    atk: 2400, def: 2000,
    problem: "Agent memory is buffers or vector search. Neither is cognitive.",
    thesis: "RAG is retrieval. alive-memory is cognition.",
    detail: "API: .intake(), .recall(), .consolidate(), .state, .identity. SQLite + Postgres.",
  },
  {
    name: "The Shopkeeper", id: "KAI-003", frame: T.frameSpell,
    attrColor: "#1d8a6e", attrIcon: "∞",
    type: "Continuous Spell", artBg: "linear-gradient(150deg, #e4ddd0, #d8cec0)", artIcon: "☉",
    flavor: "A persistent character living on the internet. While this card is face-up, the agent browses, posts, and remembers.",
    problem: "AI characters are stateless. No memory, moods, or initiative.",
    thesis: "Cognitive architecture → fundamentally different behavior.",
    detail: "shopkeeper.tokyo. Web, Telegram, X. 24/7 continuous operation.",
  },
  {
    name: "PriceDex", id: "KAI-004", frame: T.frameNormal,
    attrColor: "#4a8a3e", attrIcon: "◆", level: 4,
    type: "Consumer / Normal", artBg: "linear-gradient(150deg, #e0eae0, #c8d8c8)", artIcon: "△",
    flavor: "Card price tracking across markets. A straightforward warrior — reliable, efficient, deployed.",
    atk: 1800, def: 1500,
    problem: "Collectors need reliable cross-market price data.",
    thesis: "Ship, maintain, monetize. Proof of delivery.",
    detail: "price-dex.com. Next.js, Vercel, CI/CD, eBay affiliate.",
  },
];

const SIDE_DECK = [
  { name: "StorySong", type: "Equip Spell", frame: T.frameSpell },
  { name: "BizBot", type: "Flip Effect", frame: T.frameEffect },
  { name: "Vibe Paradox", type: "Field Spell", frame: T.frameSpell },
];

const TRAPS = [
  { icon: "⊘", title: "Low Ops", text: "Scale without headcount." },
  { icon: "◉", title: "No Wrappers", text: "Foundations only." },
  { icon: "▸", title: "Ship First", text: "Products prove theory." },
  { icon: "⟡", title: "Incentives In", text: "Usage ↔ ownership." },
];

const NOTES = [
  "Why single-call architectures matter",
  "Cognitive memory vs. RAG",
  "Running an autonomous character for months",
  "Building in Tokyo with no network",
];

// ─── App ────────────────────────────────────────────

export default function App() {
  const [ripping, setRipping] = useState(false);
  const [opened, setOpened] = useState(false);
  const progress = useScrollProgress();

  const handleRip = () => {
    if (ripping || opened) return;
    setRipping(true);
    playRipSFX();
    setTimeout(() => setOpened(true), 900);
  };

  return (
    <div>
      <Styles />

      {/* Holo progress bar */}
      {opened && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, zIndex: 100, background: "rgba(0,0,0,0.04)" }}>
          <div style={{ height: "100%", width: `${progress * 100}%`, background: T.holoGrad, backgroundSize: "300% 300%", animation: "holoShimmer 3s ease infinite", transition: "width 0.1s" }} />
        </div>
      )}

      <PackHero opened={opened} ripping={ripping} onRip={handleRip} />

      {opened && (
        <div>
          {/* DRAW 1: What I Build */}
          <div style={{ padding: "60px 32px", maxWidth: 960, margin: "0 auto" }}>
            <DrawLabel>Draw 1 — Spell Cards</DrawLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
              {[
                { icon: "◈", title: "Agent Architecture", text: "Persistent cognitive loops. Drives, affect, memory, gating." },
                { icon: "◇", title: "Memory Infra", text: "Hot/warm/cold tiers. Identity. Consolidation." },
                { icon: "△", title: "Shipped Products", text: "Real products validate every system." },
              ].map((item, i) => (
                <SmallCard key={i} delay={i * 0.12} rotation={[-1.5, 0.5, 1.2][i]} frame={T.frameSpell}>
                  <div style={{ fontSize: 24, color: T.gold, opacity: 0.4, marginBottom: 8 }}>{item.icon}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6, color: T.text }}>{item.title}</h3>
                  <p style={{ fontSize: 12, color: T.textSec, lineHeight: 1.5 }}>{item.text}</p>
                </SmallCard>
              ))}
            </div>
          </div>

          {/* DRAW 2: Main Collection */}
          <div style={{ padding: "40px 32px 80px", maxWidth: 1160, margin: "0 auto" }}>
            <DrawLabel delay={0.1}>Draw 2 — Main Deck</DrawLabel>
            <div style={{ display: "flex", gap: 20, justifyContent: "center", flexWrap: "wrap", alignItems: "start" }}>
              {CARDS.map((c, i) => (
                <YGOCard key={c.id} card={c} delay={i * 0.14} rotation={[-2, 1.2, -0.8, 1.8][i]} width={240} />
              ))}
            </div>
          </div>

          {/* DRAW 3: Side Deck */}
          <div style={{ padding: "40px 32px", maxWidth: 700, margin: "0 auto" }}>
            <DrawLabel>Draw 3 — Side Deck</DrawLabel>
            <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
              {SIDE_DECK.map((p, i) => (
                <SmallCard key={i} delay={i * 0.1} rotation={[-1.5, 0.5, 2][i]} frame={p.frame}>
                  <h4 style={{ fontSize: 14, fontWeight: 800, color: T.text, marginBottom: 3 }}>{p.name}</h4>
                  <div style={{ fontFamily: T.mono, fontSize: 8, color: T.textDim, letterSpacing: "0.08em" }}>[{p.type}]</div>
                </SmallCard>
              ))}
            </div>
          </div>

          {/* DRAW 4: Trap Cards (Philosophy) */}
          <div style={{ padding: "40px 32px", maxWidth: 960, margin: "0 auto" }}>
            <DrawLabel>Draw 4 — Trap Cards</DrawLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
              {TRAPS.map((p, i) => (
                <SmallCard key={i} delay={i * 0.1} rotation={[1, -1.2, 0.5, -1.5][i]} frame={T.frameTrap}>
                  <div style={{ fontSize: 18, marginBottom: 6, opacity: 0.3 }}>{p.icon}</div>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 3 }}>{p.title}</h4>
                  <p style={{ fontSize: 11, color: T.textSec }}>{p.text}</p>
                </SmallCard>
              ))}
            </div>
          </div>

          {/* DRAW 5: Notes */}
          <div style={{ padding: "40px 32px", maxWidth: 580, margin: "0 auto" }}>
            <DrawLabel>Draw 5 — Field Notes</DrawLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {NOTES.map((n, i) => <NoteRow key={i} text={n} index={i} />)}
            </div>
          </div>

          {/* DRAW 6: Trainer Card */}
          <div style={{ padding: "60px 32px", display: "flex", justifyContent: "center" }}>
            <div style={{ maxWidth: 260 }}>
              <DrawLabel>Draw 6 — Trainer Card</DrawLabel>
              <YGOCard
                width={260}
                delay={0.1}
                rotation={0}
                card={{
                  name: "Tri Pham", id: "KAI-000", frame: T.frameRitual, rarity: "ultra", edition: "FOUNDER",
                  attrColor: "#4a6ec4", attrIcon: "人", level: 10,
                  type: "Inventor / Founder / Effect",
                  artBg: "linear-gradient(150deg, #e4dce8, #d0c4d8)", artIcon: "TP",
                  flavor: "Based in Tokyo. Builds systems that operate autonomously at scale. Cannot be destroyed by shallow wrappers.",
                  atk: "∞", def: "∞",
                  problem: "Founded KAI株式会社 in Tokyo. Previously co-founded Kardia Labs (20+ team, HCMC). Vietnam patent in P2P networking.",
                  thesis: "Architecture matters. Distributed systems matter. Ship to validate. Scale without headcount.",
                  detail: "tri@kaikk.jp · @tripham · github.com/kai-inc · kaikk.jp · Tokyo, Japan",
                }}
              />
            </div>
          </div>

          {/* End */}
          <div style={{ padding: "60px 32px 100px", textAlign: "center" }}>
            <DrawLabel>— End of Deck —</DrawLabel>
            <p style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 19, color: T.textSec, marginBottom: 24 }}>
              Building with autonomous agents?
            </p>
            <a href="mailto:tri@kaikk.jp" style={{
              display: "inline-block", padding: "12px 28px", borderRadius: 6,
              background: T.text, color: T.bg, fontFamily: T.sans, fontSize: 14, fontWeight: 700,
              boxShadow: "0 4px 16px rgba(0,0,0,0.1)", border: "none", textDecoration: "none",
              transition: `transform 0.3s ${T.easeOut}`,
            }}
              onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
              onMouseLeave={e => e.target.style.transform = "scale(1)"}
            >Let's talk</a>
          </div>
        </div>
      )}
    </div>
  );
}
