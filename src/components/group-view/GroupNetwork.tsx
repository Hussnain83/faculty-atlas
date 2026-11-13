"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { colorsFor, initialsOf } from "@/components/ui/Avatar";
import type { GroupMember } from "@/components/group-view/types";

type Edge = { a: string; b: string; w: number };

/**
 * The 3D collaboration map from the prototype: member faces on a slowly turning sphere,
 * a hub for the group, and lines between members who published together.
 * Drag to turn, hover for details, click a face to open the profile.
 */
export function GroupNetwork({ members, edges, color, shortCode, papersOf }: { members: GroupMember[]; edges: Edge[]; color: string; shortCode: string; papersOf: Record<string, number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const canvas = canvasRef.current, tip = tipRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !tip || !ctx || members.length === 0) return;
    const css = getComputedStyle(document.documentElement);
    const col = css.getPropertyValue(`--${color}`).trim() || "#0C9AA6";
    const ink = "#0D1B2A", gold = "#EE9B12";
    const display = css.getPropertyValue("--f-display").trim() || "system-ui, sans-serif";
    const body = css.getPropertyValue("--f-body").trim() || "system-ui, sans-serif";
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const n = members.length;

    type Node = { m: GroupMember; x: number; y: number; z: number; img: HTMLImageElement | null; pair: [string, string]; X: number; Y: number; R: number; s: number; k: number; zd: number };
    const nodes: Node[] = members.map((m, i) => {
      const y = n > 1 ? 1 - ((i + 0.5) / n) * 2 : 0, r = Math.sqrt(1 - y * y), th = i * 2.39996;
      let img: HTMLImageElement | null = null;
      if (m.photoUrl) {
        img = new Image();
        img.src = m.photoUrl;
        if (still) img.onload = () => draw(performance.now());
      }
      return { m, x: Math.cos(th) * r, y: y * 0.9, z: Math.sin(th) * r, img, pair: colorsFor(m.name), X: 0, Y: 0, R: 0, s: 1, k: 0, zd: 0 };
    });
    const byId = new Map(nodes.map((q) => [q.m.id, q]));
    const links = edges.flatMap((e, i) => {
      const a = byId.get(e.a), b = byId.get(e.b);
      return a && b ? [{ a, b, w: e.w, off: (i * 0.37) % 1 }] : [];
    });

    let W = 0, H = 0, ry = 0.5, rx = -0.2, raf = 0;
    let drag: { x: number; y: number; moved: number; ry: number; rx: number } | null = null;
    let hover: Node | null = null;
    const t0 = still ? -1e7 : performance.now();

    const size = () => {
      const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.max(1, W * d);
      canvas.height = Math.max(1, H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };
    const ease = (v: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, v)), 3);
    const proj = (q: Node) => {
      const cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(rx), sx = Math.sin(rx);
      const x1 = q.x * cy + q.z * sy, z1 = -q.x * sy + q.z * cy, y1 = q.y * cx - z1 * sx, z2 = q.y * sx + z1 * cx;
      const R = Math.min(W * 0.4, H * 0.36), s = 900 / (900 + z2 * R);
      return [W / 2 + x1 * R * s, H / 2 - 14 + y1 * R * s, s, z2] as const;
    };
    const pill = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
      else ctx.rect(x, y, w, h);
    };
    const shortName = (name: string) => name.replace(/^(Dr\.|Prof\.)\s+/, "");

    function drawNode(q: Node) {
      if (q.k <= 0) return;
      const { X, Y, R } = q, fade = hover && hover !== q ? 0.55 : 1;
      ctx!.globalAlpha = q.k * fade;
      ctx!.save();
      ctx!.shadowColor = "rgba(13,27,42,.35)";
      ctx!.shadowBlur = 18 * q.s;
      ctx!.shadowOffsetY = 8 * q.s;
      ctx!.fillStyle = "#fff";
      ctx!.beginPath();
      ctx!.arc(X, Y, R + 4, 0, 6.283);
      ctx!.fill();
      ctx!.restore();
      ctx!.save();
      ctx!.beginPath();
      ctx!.arc(X, Y, R, 0, 6.283);
      ctx!.clip();
      const bg = ctx!.createLinearGradient(X - R, Y - R, X + R, Y + R);
      bg.addColorStop(0, q.pair[0]);
      bg.addColorStop(1, q.pair[1]);
      ctx!.fillStyle = bg;
      ctx!.fillRect(X - R, Y - R, 2 * R, 2 * R);
      if (q.img && q.img.complete && q.img.naturalWidth) ctx!.drawImage(q.img, X - R, Y - R, 2 * R, 2 * R);
      else {
        ctx!.fillStyle = "#fff";
        ctx!.font = `700 ${Math.round(R * 0.72)}px ${display}`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(initialsOf(q.m.name), X, Y + 1);
      }
      ctx!.restore();
      ctx!.lineWidth = q === hover ? 4 : 2.5;
      ctx!.strokeStyle = q.m.isLead ? gold : col;
      ctx!.beginPath();
      ctx!.arc(X, Y, R + 1.5, 0, 6.283);
      ctx!.stroke();
      if (q.s > 1.02 || q === hover || q.m.isLead) {
        const name = q.m.isLead ? `${shortName(q.m.name)} · Lead` : shortName(q.m.name);
        ctx!.font = `600 12px ${body}`;
        const tw = ctx!.measureText(name).width, ly = Y + R + 17;
        ctx!.fillStyle = "rgba(255,255,255,.92)";
        pill(X - tw / 2 - 9, ly - 11, tw + 18, 22, 11);
        ctx!.fill();
        ctx!.fillStyle = ink;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText(name, X, ly);
      }
      ctx!.globalAlpha = 1;
    }
    function drawHub(el: number) {
      const k = ease(el / 500);
      if (k <= 0) return;
      const X = W / 2, Y = H / 2 - 14, R = 32 * k;
      ctx!.globalAlpha = k;
      ctx!.save();
      ctx!.shadowColor = col;
      ctx!.shadowBlur = 30;
      const gr = ctx!.createRadialGradient(X - R * 0.35, Y - R * 0.35, 2, X, Y, Math.max(3, R));
      gr.addColorStop(0, "#ffffff");
      gr.addColorStop(0.38, col);
      gr.addColorStop(1, col);
      ctx!.fillStyle = gr;
      ctx!.beginPath();
      ctx!.arc(X, Y, R, 0, 6.283);
      ctx!.fill();
      ctx!.restore();
      ctx!.fillStyle = "#fff";
      ctx!.font = `800 17px ${display}`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";
      ctx!.fillText(shortCode, X, Y + 1);
      ctx!.globalAlpha = 1;
    }
    function draw(t: number) {
      const el = t - t0, cx0 = W / 2, cy0 = H / 2 - 14;
      ctx!.clearRect(0, 0, W, H);
      nodes.forEach((q, i) => {
        const [X, Y, s, z] = proj(q), k = ease((el - 250 - i * 110) / 650);
        q.k = k;
        q.s = s;
        q.zd = z;
        q.X = cx0 + (X - cx0) * k;
        q.Y = cy0 + (Y - cy0) * k;
        q.R = (q.m.isLead ? 34 : 27) * s * (0.4 + 0.6 * k);
      });
      ctx!.setLineDash([3, 6]);
      ctx!.lineWidth = 1.2;
      ctx!.strokeStyle = col;
      nodes.forEach((q) => {
        ctx!.globalAlpha = 0.28 * q.k * (hover && hover !== q ? 0.4 : 1);
        ctx!.beginPath();
        ctx!.moveTo(cx0, cy0);
        ctx!.lineTo(q.X, q.Y);
        ctx!.stroke();
      });
      ctx!.setLineDash([]);
      ctx!.lineCap = "round";
      const eStart = 500 + n * 110;
      links.forEach((e, i) => {
        const k = ease((el - eStart - i * 90) / 700);
        if (k <= 0) return;
        const on = hover && (e.a === hover || e.b === hover), dim = hover && !on, depth = ((e.a.zd + e.b.zd) / 2 + 1) / 2;
        ctx!.globalAlpha = dim ? 0.12 : Math.min(1, (0.35 + 0.55 * (1 - depth)) * (on ? 1.5 : 1));
        ctx!.lineWidth = Math.min(7, 1.4 + e.w * 1.5) * (on ? 1.4 : 1);
        ctx!.strokeStyle = on ? ink : col;
        ctx!.beginPath();
        ctx!.moveTo(e.a.X, e.a.Y);
        ctx!.lineTo(e.a.X + (e.b.X - e.a.X) * k, e.a.Y + (e.b.Y - e.a.Y) * k);
        ctx!.stroke();
        if (k >= 1 && !still) {
          const u = (el / 1700 + e.off) % 1;
          ctx!.globalAlpha = dim ? 0.2 : 0.95;
          ctx!.fillStyle = on ? ink : "#fff";
          ctx!.beginPath();
          ctx!.arc(e.a.X + (e.b.X - e.a.X) * u, e.a.Y + (e.b.Y - e.a.Y) * u, 2.2 + Math.min(4, e.w) * 0.6, 0, 6.283);
          ctx!.fill();
          ctx!.lineWidth = 1.5;
          ctx!.strokeStyle = on ? ink : col;
          ctx!.stroke();
        }
      });
      ctx!.globalAlpha = 1;
      const order = [...nodes].sort((a, b) => b.zd - a.zd);
      order.filter((q) => q.zd >= 0).forEach(drawNode);
      drawHub(el);
      order.filter((q) => q.zd < 0).forEach(drawNode);
    }

    const pick = (x: number, y: number) => {
      let best: Node | null = null, bz = 1e9;
      nodes.forEach((q) => {
        const dx = x - q.X, dy = y - q.Y;
        if (q.k > 0.5 && dx * dx + dy * dy <= (q.R + 5) ** 2 && q.zd < bz) {
          best = q;
          bz = q.zd;
        }
      });
      return best as Node | null;
    };
    const showTip = (h: Node | null) => {
      hover = h;
      canvas.style.cursor = h ? "pointer" : "grab";
      if (h) {
        tip.replaceChildren();
        const b = document.createElement("b");
        b.textContent = h.m.name;
        const s = document.createElement("span");
        const p = papersOf[h.m.id] ?? 0;
        s.textContent = `${h.m.title} · ${p} ${p === 1 ? "paper" : "papers"}`;
        tip.append(b, s);
        tip.style.left = `${h.X}px`;
        tip.style.top = `${h.Y - h.R - 12}px`;
      }
      tip.classList.toggle("on", !!h);
      if (still) draw(performance.now());
    };
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, moved: 0, ry, rx };
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch {}
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
        ry = drag.ry + dx * 0.008;
        rx = Math.max(-1.1, Math.min(1.1, drag.rx + dy * 0.006));
        if (drag.moved > 5 && hover) showTip(null);
        if (still) draw(performance.now());
        return;
      }
      const h = pick(x, y);
      if (h !== hover) showTip(h);
    };
    const onEnd = (e: PointerEvent) => {
      const moved = drag ? drag.moved : 99;
      drag = null;
      if (e.type === "pointerup" && moved < 6) {
        const r = canvas.getBoundingClientRect(), h = pick(e.clientX - r.left, e.clientY - r.top);
        if (h) router.push(`/people/${h.m.id}`);
      }
    };
    const onLeave = () => {
      if (!drag && hover) showTip(null);
    };
    const onResize = () => {
      size();
      if (still) draw(performance.now());
    };

    size();
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove, { passive: true });
    canvas.addEventListener("pointerup", onEnd);
    canvas.addEventListener("pointercancel", onEnd);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("resize", onResize);
    if (still) draw(performance.now());
    else {
      const loop = (t: number) => {
        if (!drag && !hover) ry += 0.0022;
        draw(t);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    }
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onEnd);
      canvas.removeEventListener("pointercancel", onEnd);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, [members, edges, color, shortCode, papersOf, router]);

  const linkCount = edges.length;
  return (
    <div className="net">
      {members.length === 0 ? (
        <div className="net-empty">The collaboration map appears once the group has members.</div>
      ) : (
        <canvas ref={canvasRef} role="img" aria-label={`Collaboration map: ${members.length} members, ${linkCount} co-author links`} />
      )}
      <div className="net-tip" ref={tipRef} aria-hidden="true" />
      {members.length > 0 && (
        <div className="net-legend">
          <span>
            <i className="lk" />
            Co-authored papers
          </span>
          <span>
            <i className="lk hub" />
            Group member
          </span>
          <span>Drag to turn · click a face</span>
        </div>
      )}
    </div>
  );
}
