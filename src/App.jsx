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

const TEAR_ZONE_PCT = 0.22; // top 22% of pack is the tear zone

const PackHero = ({ opened, ripping, onRip }) => {
  const [hov, setHov] = useState(false);
  const packRef = useRef(null);
  const [ripProgress, setRipProgress] = useState(0); // 0–1 interactive rip
  const [dragging, setDragging] = useState(false);
  const [finishing, setFinishing] = useState(false); // auto-complete animation
  const dragStartX = useRef(0);
  const lastParticleAt = useRef(0); // throttle particle spawns
  const [particles, setParticles] = useState([]);
  const particleId = useRef(0);

  // Spawn a foil particle at the tear front
  const spawnParticle = useCallback((x, y) => {
    const now = Date.now();
    if (now - lastParticleAt.current < 40) return;
    lastParticleAt.current = now;
    const id = particleId.current++;
    const colors = ["#e84393", "#6b5ce7", "#00b4d8", "#d4a017", "#fff"];
    setParticles(prev => [...prev.slice(-20), {
      id, x, y,
      color: colors[id % 5],
      px: (Math.random() - 0.5) * 50,
      py: -15 - Math.random() * 40,
    }]);
    // auto-remove after animation
    setTimeout(() => setParticles(prev => prev.filter(p => p.id !== id)), 600);
  }, []);

  // Play partial rip crinkle sound
  const playPartialRipSFX = useCallback(() => {
    try {
      const ctx = getAudio();
      const now = ctx.currentTime;
      const n = ctx.createBufferSource();
      n.buffer = makeNoise(ctx, 0.06);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass"; bp.frequency.value = 4000 + Math.random() * 2000; bp.Q.value = 1.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.08 + Math.random() * 0.06, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      n.connect(bp); bp.connect(g); g.connect(ctx.destination);
      n.start(now);
    } catch (e) {}
  }, []);

  const getPointerPos = useCallback((e) => {
    if (!packRef.current) return null;
    const rect = packRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  }, []);

  const handlePointerDown = useCallback((e) => {
    if (ripping || opened || finishing) return;
    const pos = getPointerPos(e);
    if (!pos) return;
    // Only start drag if pointer is in the tear zone (top ~22%)
    if (pos.y > pos.height * TEAR_ZONE_PCT) return;
    e.preventDefault();
    setDragging(true);
    dragStartX.current = pos.x;
    // If starting from middle/right, reset progress relative to start
    const startPct = Math.max(0, pos.x / pos.width);
    setRipProgress(startPct);
    playPartialRipSFX();
    spawnParticle(pos.x, pos.y);
  }, [ripping, opened, finishing, getPointerPos, playPartialRipSFX, spawnParticle]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging || finishing) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;
    const pct = Math.max(0, Math.min(1, pos.x / pos.width));
    // Only allow forward progress (no un-ripping)
    setRipProgress(prev => {
      const next = Math.max(prev, pct);
      if (next > prev + 0.02) {
        playPartialRipSFX();
        spawnParticle(pos.x, Math.min(pos.y, pos.height * TEAR_ZONE_PCT));
      }
      return next;
    });
  }, [dragging, finishing, getPointerPos, playPartialRipSFX, spawnParticle]);

  const handlePointerUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    // If past 90%, auto-complete the rip
    if (ripProgress >= 0.9) {
      setFinishing(true);
      playRipSFX();
      // Animate to 1.0
      setRipProgress(1);
      setTimeout(() => onRip(), 100);
    }
    // Otherwise, the tear stays where it is — user can grab again
  }, [dragging, ripProgress, onRip]);

  // Attach global move/up listeners when dragging
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => handlePointerMove(e);
    const up = () => handlePointerUp();
    window.addEventListener("mousemove", move, { passive: false });
    window.addEventListener("mouseup", up);
    window.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("touchend", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchmove", move);
      window.removeEventListener("touchend", up);
    };
  }, [dragging, handlePointerMove, handlePointerUp]);

  if (opened) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div className="cards-spill" style={{ textAlign: "center" }}>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.16em", marginBottom: 16 }}>
            INVENTOR · FOUNDER · BUILDER
          </div>
          <h1 style={{ fontFamily: T.sans, fontSize: "clamp(32px, 5vw, 52px)", fontWeight: 800, color: T.text, lineHeight: 1.08, letterSpacing: "-0.04em", marginBottom: 10 }}>
            Tri Pham
          </h1>
          <p style={{ fontFamily: T.serif, fontStyle: "italic", fontSize: 19, color: T.textSec, marginBottom: 6 }}>
            AI agent infrastructure from Tokyo
          </p>
          <div style={{ fontFamily: T.mono, fontSize: 10, color: T.textDim, letterSpacing: "0.06em", marginBottom: 6 }}>KAI株式会社</div>
          <div style={{ color: T.textDim, fontSize: 13, marginTop: 40, animation: "breathe 3s ease-in-out infinite" }}>↓ scroll to draw</div>
        </div>
      </div>
    );
  }

  // Compute interactive tear clip-paths
  // The tear line progresses left→right. The top flap peels up as it's torn.
  const tearX = ripProgress; // 0–1 horizontal progress
  // Jagged tear edge: slight wave on the tear line
  const tearY1 = 0.18; // left side tear height (percentage)
  const tearY2 = 0.22; // right side tear height
  const tearYAtProgress = tearY1 + (tearY2 - tearY1) * tearX;

  // Top flap: everything above the tear line, but only the torn portion (0 to tearX)
  // It peels upward proportionally
  const flapRotation = ripProgress * 70; // degrees
  const flapTranslateY = -ripProgress * 20; // px

  // Ripping state (interactive, not yet auto-completing)
  const isInteractive = ripProgress > 0 && !finishing;
  const showTear = ripProgress > 0;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", position: "relative",
    }}>
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "repeating-conic-gradient(rgba(0,0,0,0.03) 0% 25%, transparent 0% 50%)",
        backgroundSize: "24px 24px", pointerEvents: "none",
      }} />

      <div
        ref={packRef}
        onMouseDown={handlePointerDown}
        onTouchStart={handlePointerDown}
        style={{
          cursor: finishing ? "default" : ripProgress > 0 ? "grabbing" : "default",
          position: "relative",
          width: 240,
          height: 240 * CARD_RATIO,
          touchAction: "none", // prevent scroll on touch
          userSelect: "none",
        }}
      >
        {!finishing ? (
          <>
            {/* Main pack body (always visible) */}
            <div style={{
              position: "absolute", inset: 0,
              animation: showTear ? "none" : "breathe 3s ease-in-out infinite",
            }}>
              <div style={{
                position: "absolute", inset: 0, borderRadius: 10,
                background: T.holoGrad, backgroundSize: "300% 300%",
                animation: "holoShimmer 3s ease infinite",
                opacity: hov || showTear ? 1 : 0.7,
                boxShadow: hov || showTear
                  ? "0 30px 60px rgba(0,0,0,0.2), 0 0 40px rgba(184,150,78,0.15)"
                  : "0 16px 40px rgba(0,0,0,0.12)",
                transition: `all 0.5s ${T.easeOut}`,
                transform: hov && !showTear ? "scale(1.03)" : "scale(1)",
                // Clip: show everything below the tear line on the torn side
                clipPath: showTear
                  ? `polygon(0 ${tearY1 * 100}%, ${tearX * 100}% ${tearYAtProgress * 100}%, ${tearX * 100}% 100%, 0 100%)`
                  : "none",
              }} />

              <div style={{
                position: "absolute", inset: 4, borderRadius: 7,
                background: T.cardBack,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center", gap: 10,
                clipPath: showTear
                  ? `polygon(0 ${tearY1 * 100}%, ${tearX * 100}% ${tearYAtProgress * 100}%, ${tearX * 100}% 100%, 0 100%)`
                  : "none",
              }}>
                {!showTear && (
                  <>
                    <div style={{ position: "absolute", inset: 10, border: "1.5px solid rgba(184,150,78,0.15)", borderRadius: 4 }} />
                    <div style={{ width: 40, height: 40, border: "2px solid rgba(184,150,78,0.25)", transform: "rotate(45deg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <div style={{ width: 20, height: 20, border: "1.5px solid rgba(184,150,78,0.15)", transform: "rotate(0deg)" }} />
                    </div>
                    <div style={{ fontFamily: T.serif, fontSize: 24, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.02em" }}>Tri Pham</div>
                    <div style={{ fontFamily: T.mono, fontSize: 8, color: "rgba(255,255,255,0.3)", letterSpacing: "0.2em" }}>KAI株式会社 · TOKYO</div>
                  </>
                )}
              </div>

              {/* Cards peeking out from underneath as pack tears */}
              {showTear && (
                <div style={{
                  position: "absolute", inset: 6, zIndex: -1,
                  opacity: Math.min(1, ripProgress * 2),
                  transform: `translateY(${(1 - ripProgress) * 10}px)`,
                  transition: "opacity 0.2s, transform 0.2s",
                }}>
                  <CardBackDesign />
                </div>
              )}
            </div>

            {/* Untorn right portion of pack (when partially torn) */}
            {showTear && tearX < 1 && (
              <div style={{ position: "absolute", inset: 0 }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 10,
                  background: T.holoGrad, backgroundSize: "300% 300%",
                  animation: "holoShimmer 3s ease infinite",
                  clipPath: `polygon(${tearX * 100}% 0, 100% 0, 100% 100%, ${tearX * 100}% 100%)`,
                }} />
                <div style={{
                  position: "absolute", inset: 4, borderRadius: 7,
                  background: T.cardBack,
                  clipPath: `polygon(${tearX * 100}% 0, 100% 0, 100% 100%, ${tearX * 100}% 100%)`,
                }} />
              </div>
            )}

            {/* Torn top flap — peels upward as tear progresses */}
            {showTear && (
              <div style={{
                position: "absolute", inset: 0, zIndex: 3,
                transformOrigin: `${tearX * 50}% ${tearY1 * 100}%`,
                transform: `perspective(600px) rotateX(${flapRotation}deg) translateY(${flapTranslateY}px)`,
                transition: dragging ? "none" : `transform 0.3s ${T.easeOut}`,
                pointerEvents: "none",
              }}>
                <div style={{
                  position: "absolute", inset: 0, borderRadius: 10,
                  background: T.holoGrad, backgroundSize: "300% 300%",
                  animation: "holoShimmer 3s ease infinite",
                  clipPath: `polygon(0 0, ${tearX * 100}% 0, ${tearX * 100}% ${tearYAtProgress * 100}%, 0 ${tearY1 * 100}%)`,
                }} />
                <div style={{
                  position: "absolute", inset: 4, borderRadius: 7,
                  background: T.cardBack,
                  clipPath: `polygon(0 0, ${tearX * 100}% 0, ${tearX * 100}% ${tearYAtProgress * 100}%, 0 ${tearY1 * 100}%)`,
                }} />
              </div>
            )}

            {/* Tear line highlight — jagged glowing edge */}
            {showTear && (
              <div style={{
                position: "absolute",
                left: `${tearX * 100}%`,
                top: `${tearYAtProgress * 100}%`,
                width: 2, height: 8,
                background: "rgba(255,255,255,0.6)",
                boxShadow: "0 0 8px rgba(232,67,147,0.4), 0 0 16px rgba(107,92,231,0.3)",
                borderRadius: 1,
                transform: "translate(-50%, -50%)",
                zIndex: 5,
                pointerEvents: "none",
                opacity: dragging ? 1 : 0,
                transition: "opacity 0.3s",
              }} />
            )}

            {/* Interactive swipe zone indicator — shows on hover when not yet torn */}
            {!showTear && (
              <div
                onMouseEnter={() => setHov(true)}
                onMouseLeave={() => setHov(false)}
                style={{
                  position: "absolute", left: 0, right: 0, top: 0,
                  height: `${TEAR_ZONE_PCT * 100}%`,
                  zIndex: 10,
                  cursor: "grab",
                }}
              >
                {/* Animated tear line hint */}
                <div style={{
                  position: "absolute", left: 10, right: 10,
                  bottom: 0, height: 1,
                  background: hov ? "rgba(255,255,255,0.25)" : "transparent",
                  transition: "background 0.4s",
                  boxShadow: hov ? "0 0 8px rgba(232,67,147,0.15)" : "none",
                }} />
              </div>
            )}

            {/* Foil particles during interactive rip */}
            {particles.map(p => (
              <div key={p.id} className="foil-particle" style={{
                left: p.x, top: p.y,
                background: p.color,
                "--px": `${p.px}px`,
                "--py": `${p.py}px`,
                zIndex: 6,
              }} />
            ))}
          </>
        ) : (
          /* Auto-complete rip animation (finishing state) */
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            <div className="rip-top" style={{
              position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", zIndex: 3,
            }}>
              <div style={{
                position: "absolute", inset: 0,
                background: T.holoGrad, backgroundSize: "300% 300%",
                animation: "holoShimmer 3s ease infinite",
              }} />
              <div style={{ position: "absolute", inset: 4, borderRadius: 7, background: T.cardBack }} />
            </div>

            <div className="pack-body" style={{
              position: "absolute", inset: 0, borderRadius: 10, overflow: "hidden", zIndex: 2,
            }}>
              <div style={{
                position: "absolute", inset: 0,
                background: T.holoGrad, backgroundSize: "300% 300%",
                animation: "holoShimmer 3s ease infinite",
              }} />
              <div style={{ position: "absolute", inset: 4, borderRadius: 7, background: T.cardBack }} />
            </div>

            <div className="cards-spill" style={{ position: "absolute", inset: 6, zIndex: 1 }}>
              <CardBackDesign />
            </div>

            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="foil-particle" style={{
                left: `${15 + Math.random() * 70}%`,
                top: `${14 + Math.random() * 8}%`,
                background: ["#e84393", "#6b5ce7", "#00b4d8", "#d4a017", "#fff"][i % 5],
                "--px": `${(Math.random() - 0.5) * 60}px`,
                "--py": `${-20 - Math.random() * 50}px`,
                animationDelay: `${Math.random() * 0.2}s`,
                zIndex: 4,
              }} />
            ))}
          </div>
        )}
      </div>

      {!showTear && !finishing && (
        <div style={{
          marginTop: 32, fontFamily: T.mono, fontSize: 10,
          color: T.textDim, letterSpacing: "0.1em",
          opacity: hov ? 1 : 0.5, transition: "opacity 0.3s",
        }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <span style={{
              display: "inline-block",
              animation: hov ? "none" : "breathe 3s ease-in-out infinite",
            }}>
              swipe top edge to rip
            </span>
            {hov && <span style={{ animation: "shimmerArrow 1s ease-in-out infinite" }}>→</span>}
          </span>
        </div>
      )}

      {showTear && !finishing && (
        <div style={{
          marginTop: 32, fontFamily: T.mono, fontSize: 10,
          color: T.textDim, letterSpacing: "0.1em",
        }}>
          {ripProgress < 0.9 ? "keep going..." : "almost there..."}
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
