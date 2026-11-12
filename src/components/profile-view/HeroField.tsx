"use client";

import { useEffect, useRef } from "react";

/** White research tokens drifting across the profile hero (the person's own years, venues and numbers). */
export function HeroField({ tokens }: { tokens: string[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || tokens.length === 0) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const font = getComputedStyle(document.documentElement).getPropertyValue("--f-mono") || "monospace";
    let w = 0, h = 0, raf = 0;
    type Item = { t: string; x: number; y: number; z: number; s: number; a: number; ph: number; v: number };
    let items: Item[] = [];
    const spawn = (anywhere: boolean): Item => {
      const z = Math.random();
      return { t: tokens[Math.floor(Math.random() * tokens.length)], x: Math.random() * w, y: anywhere ? Math.random() * h : h + 40, z, s: 12 + 26 * z * z, a: 0.28 + 0.47 * z, ph: Math.random() * 6.28, v: 0.2 * (0.35 + z) };
    };
    const size = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.max(1, w * dpr);
      canvas.height = Math.max(1, h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      items = Array.from({ length: Math.round(Math.min(70, (w * h) / 3800)) }, () => spawn(true));
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff";
      for (const it of items) {
        if (!still) {
          it.y -= it.v;
          if (it.y < -40) Object.assign(it, spawn(false));
        }
        ctx.globalAlpha = it.a;
        ctx.font = `${it.z > 0.66 ? 600 : 500} ${it.s.toFixed(1)}px ${font}`;
        ctx.fillText(it.t, it.x + Math.sin(t * 0.00022 + it.ph) * 16, it.y);
      }
      ctx.globalAlpha = 1;
    };
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };
    size();
    if (still) draw(0);
    else raf = requestAnimationFrame(loop);
    const onResize = () => size();
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [tokens]);
  return <canvas ref={ref} aria-hidden="true" />;
}
