import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "../lib/format";

/**
 * Animated hero background: drifting light, slow gold orbits, a shimmer across the
 * VALE wordmark and floating gold dust (canvas). Paused off-screen; static for reduced motion.
 */
export function HeroBackdrop() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || prefersReducedMotion()) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(1.5, window.devicePixelRatio || 1);
    let w = 0, h = 0, raf = 0, visible = true;
    // One pre-rendered glow sprite, stamped with drawImage — far cheaper than a gradient per dot per frame.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 32;
    const sc = sprite.getContext("2d")!;
    const g = sc.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(214,170,40,0.9)");
    g.addColorStop(0.35, "rgba(230,190,50,0.45)");
    g.addColorStop(1, "rgba(242,210,46,0)");
    sc.fillStyle = g;
    sc.fillRect(0, 0, 32, 32);
    type Mote = { x: number; y: number; r: number; vy: number; vx: number; ph: number; sp: number };
    let motes: Mote[] = [];
    const make = (y?: number): Mote => ({
      x: Math.random() * w,
      y: y ?? Math.random() * h,
      r: 3 + Math.random() * 8,
      vy: -(0.1 + Math.random() * 0.25),
      vx: (Math.random() - 0.5) * 0.12,
      ph: Math.random() * Math.PI * 2,
      sp: 0.6 + Math.random() * 1.4,
    });
    const resize = () => {
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = w < 640 ? 16 : 34;
      motes = Array.from({ length: n }, () => make());
    };
    resize();
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last) / 16;
      last = now;
      ctx.clearRect(0, 0, w, h);
      for (const m of motes) {
        m.y += m.vy * dt;
        m.x += m.vx * dt + Math.sin(now / 1800 + m.ph) * 0.08;
        if (m.y < -20) Object.assign(m, make(h + 20));
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin((now / 1000) * m.sp + m.ph));
        ctx.drawImage(sprite, m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }
      ctx.globalAlpha = 1;
      raf = visible ? requestAnimationFrame(tick) : 0;
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting && !document.hidden;
      if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    });
    io.observe(cv);
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* drifting light */}
      <div className="hero-blob hero-blob-a" />
      <div className="hero-blob hero-blob-b" />
      <div className="hero-blob hero-blob-c" />
      <canvas ref={canvas} className="absolute inset-0 size-full" />
    </div>
  );
}
