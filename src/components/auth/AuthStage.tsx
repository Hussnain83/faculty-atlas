"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { BrandMark } from "@/components/ui/BrandMark";
import { Icon } from "@/components/ui/Icon";

/**
 * Left side of the sign-in screens: a rotating 3D ring of profile cards.
 * The cards are decorative on purpose: no real names or photos are shown to signed-out visitors.
 */
const CARDS = [
  { c1: "#0C9AA6", c2: "#5864EC", tag: "AI · CV", papers: 24, h: 12 },
  { c1: "#F2614C", c2: "#EE9B12", tag: "CV", papers: 31, h: 17 },
  { c1: "#5864EC", c2: "#F2614C", tag: "DS", papers: 17, h: 9 },
  { c1: "#1FA872", c2: "#0C9AA6", tag: "AI · DS", papers: 28, h: 14 },
  { c1: "#EE9B12", c2: "#F2614C", tag: "LS", papers: 11, h: 6 },
  { c1: "#7A5CE0", c2: "#0C9AA6", tag: "AI", papers: 19, h: 10 },
];

export function AuthStage() {
  const stageRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    const deck = deckRef.current;
    if (!stage || !deck) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let a = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    };
    const frame = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      if (!still) a += 0.16;
      const k = Math.min(1, stage.clientWidth / 760);
      deck.style.transform = `scale(${k.toFixed(3)}) rotateX(${(-8 - cy * 14).toFixed(2)}deg) rotateY(${(a + cx * 40).toFixed(2)}deg)`;
      if (!still) raf = requestAnimationFrame(frame);
    };
    stage.addEventListener("pointermove", onMove, { passive: true });
    frame();
    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div className="auth-stage" ref={stageRef}>
      <Link className="brand auth-brand" href="/login" aria-label="Faculty Atlas">
        <BrandMark />
        <div>
          <b>Faculty Atlas</b>
          <small>Northfield University</small>
        </div>
      </Link>
      <div className="deck-wrap" aria-hidden="true">
        <div className="deck" ref={deckRef}>
          {CARDS.map((card, i) => (
            <div
              key={i}
              className="dcard"
              style={{
                ["--c1" as string]: card.c1,
                ["--c2" as string]: card.c2,
                transform: `rotateY(${(i * 360) / CARDS.length}deg) translateZ(300px)`,
              }}
            >
              <div className="dc-photo">
                <span className="dc-sil">
                  <svg viewBox="0 0 100 100" fill="currentColor">
                    <circle cx="50" cy="38" r="19" />
                    <path d="M14 100c2-24 17-36 36-36s34 12 36 36z" />
                  </svg>
                </span>
                <span className="dc-tag">{card.tag}</span>
              </div>
              <span className="dc-line" />
              <span className="dc-line s" />
              <div className="dc-stats">
                <span>
                  <b>{card.papers}</b>papers
                </span>
                <span>
                  <b>{card.h}</b>h-index
                </span>
              </div>
            </div>
          ))}
        </div>
        <span className="deck-floor" />
      </div>
      <div className="auth-copy">
        <h1>
          Every researcher,
          <br />
          beautifully on record.
        </h1>
        <p>Profiles, publications and research groups for Northfield University, in one place.</p>
        <ul className="auth-feats">
          <li>
            <Icon name="shield" />
            Only registered staff can join
          </li>
          <li>
            <Icon name="users" />
            You see the people in your groups
          </li>
          <li>
            <Icon name="file" />
            CVs and papers stay current
          </li>
        </ul>
      </div>
    </div>
  );
}
