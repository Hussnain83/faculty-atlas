"use client";

import { useEffect, useRef } from "react";

const TOKENS = [
  "2026", "2025", "2024", "2019", "2012", "1998", "π", "Σ", "∫", "∂", "λ", "μ", "σ²", "∇", "Δ", "∞",
  "h=17", "h=24", "p<0.05", "r=0.82", "n=1,284", "IF 4.2", "Q1", "DOI", "10.1109", "10.1016", "et al.",
  "3.14159", "e≈2.718", "42", "128", "1,342", "ORCID", "arXiv", "x̄", "β₁", "χ²", "log n", "O(n²)", "f(x)",
];
const COLORS = ["#0C9AA6", "#5864EC", "#F2614C", "#EE9B12", "#0D1B2A"];

type Item = { t: string; x: number; y: number; z: number; s: number; a: number; c: string; ph: number; v: number };

/**
 * Research numbers that drift slowly upward behind the app, with a little mouse parallax.
 * Draws one still frame when the visitor prefers reduced motion.
 */
export function FloatingNumbers() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--f-mono") || "monospace";
    const mouse = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };
    let w = 0;
    let h = 0;
    let items: Item[] = [];
    let raf = 0;

    const spawn = (anywhere: boolean): Item => {
      const z = Math.random();
      return {
        t: TOKENS[Math.floor(Math.random() * TOKENS.length)],
        x: Math.random() * w,
        y: anywhere ? Math.random() * h : h + 40,
        z,
        s: 11 + 23 * z * z,
        a: 0.05 + 0.12 * z,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        ph: Math.random() * 6.28,
        v: 0.16 * (0.35 + z),
      };
    };

    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, (w * h) / 15000));
      items = Array.from({ length: n }, () => spawn(true));
    };

    const draw = (t: number) => {
      mouse.x += (mouse.tx - mouse.x) * 0.05;
      mouse.y += (mouse.ty - mouse.y) * 0.05;
      const px = mouse.x - 0.5;
      const py = mouse.y - 0.5;
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = "middle";
      for (const it of items) {
        if (!still) {
          it.y -= it.v;
          if (it.y < -40) Object.assign(it, spawn(false));
        }
        ctx.globalAlpha = it.a;
        ctx.fillStyle = it.c;
        ctx.font = `${it.z > 0.66 ? 600 : 500} ${it.s.toFixed(1)}px ${font}`;
        ctx.fillText(it.t, it.x + Math.sin(t * 0.00022 + it.ph) * 16 - px * it.z * 46, it.y - py * it.z * 46);
      }
      ctx.globalAlpha = 1;
    };

    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    const onMove = (e: PointerEvent) => {
      mouse.tx = e.clientX / window.innerWidth;
      mouse.ty = e.clientY / window.innerHeight;
    };
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        size();
        if (still) draw(0);
      }, 120);
    };

    size();
    if (still) draw(0);
    else raf = requestAnimationFrame(loop);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={ref} className="field-canvas" aria-hidden="true" />;
}
