/**
 * @module Scribble
 * @description Hand-drawn pen loops that scribble themselves around things. Two shapes
 * share one draw-on/erase feel: ScribbleCircle (fixed square loops, the social icons)
 * and ScribbleOval (drawn at the target's real pixel size, the nav links).
 * @author Chris "Mo" Mochinski
 */
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { clsx } from "clsx";
import styles from "./scribble.module.css";

/**
 * @description Shared pathLength/opacity timing - really fast scribble ON, a quicker
 * but lazier unwind OFF, with the stroke held opaque until it's nearly retracted.
 */
function drawTransition(active: boolean) {
  return {
    pathLength: { duration: active ? 0.2 : 0.55, ease: active ? "easeOut" : "easeInOut" },
    opacity: active ? { duration: 0.1 } : { duration: 0.16, delay: 0.38 },
  } as const;
}

// five hand-drawn-feeling rings so no two adjacent icons get an identical circle.
// each loop overshoots its own start point and wobbles its radius on purpose -
// drawn by a kid, not a compass. it stays wonky on hover (the off-kilter look is
// the whole charm); tilt + stroke-width jitter add extra per-icon variety.
const CIRCLE_PATHS = [
  "M50 9 C73 7 95 26 92 49 C94 73 71 95 47 92 C23 94 5 71 9 47 C6 25 27 6 52 11",
  "M52 11 C28 8 8 28 11 52 C8 74 30 95 51 90 C75 94 93 70 89 47 C93 24 72 7 49 12",
  "M48 10 C70 9 93 23 90 47 C95 71 70 96 46 91 C22 95 7 69 10 46 C7 26 25 8 50 13",
  "M50 12 C75 9 92 28 90 50 C92 72 70 94 48 91 C24 93 8 72 11 48 C7 27 28 9 53 9",
  "M51 8 C77 9 94 29 90 52 C93 75 68 96 45 90 C21 93 6 68 11 45 C8 23 27 6 49 13",
] as const;
const CIRCLE_TILT = [-6, 5, -3, 8, -9] as const; // deg, so even similar loops read distinct
const CIRCLE_WIDTH = [3, 2.7, 3.3, 2.9, 3.1] as const;

interface ScribbleProps {
  /** true draws the loop on, false erases it */
  active: boolean;
  /** picks the loop's personality so neighbors never match */
  variant: number;
  /** positioning, sizing and ink color come from the caller */
  className?: string;
}

/**
 * @description A deliberately imperfect, hand-drawn ring that scribbles itself around
 * an icon - FAST on hover (pathLength snaps on); on leave it erases quickly but the
 * stroke stays opaque until it's nearly retracted, THEN fades. `variant` picks one of
 * the loops so neighboring icons differ.
 * @author Chris "Mo" Mochinski
 */
export function ScribbleCircle({ active, variant, className }: ScribbleProps) {
  const i = variant % CIRCLE_PATHS.length;
  return (
    <motion.svg
      className={clsx(styles.scribble, className)}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
      style={{ rotate: CIRCLE_TILT[i] }}>
      <motion.path
        d={CIRCLE_PATHS[i]}
        stroke="currentColor"
        strokeWidth={CIRCLE_WIDTH[i]}
        strokeLinecap="round"
        initial={false}
        animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }}
        transition={drawTransition(active)}
      />
    </motion.svg>
  );
}

// oval stroke in real screen px - never scaled, so it's the same weight all the way around
const OVAL_STROKE = 1.8;

/** @description Tiny seeded PRNG (mulberry32) so each variant wobbles the same way every render. */
function seededRandom(seed: number): () => number {
  let a = seed * 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// oval wobble, all in real px so short and long words get the same hand-drawn feel
const OVAL_JITTER = 2.2; // how far each anchor drifts in or out of a true ellipse
const OVAL_TILT_DEG = 3; // max lean either way, like a quick loop drawn on the fly
const OVAL_TAIL = 3.5; // how far the overshoot lands inside/outside the start

/**
 * @description Builds a hand-drawn oval loop sized to a w x h box in real pixels. It
 * starts near the top, runs clockwise, and overshoots past its own start so the ends
 * cross, just like the circle loops. Seeded px-sized wobble, a slight lean and lumpy
 * handles keep it from reading as a perfect (or stretched) ellipse.
 */
function ovalPath(w: number, h: number, seed: number): string {
  const rand = seededRandom(seed + 1);
  const jitter = () => (rand() - 0.5) * 2 * OVAL_JITTER;
  const cx = w / 2;
  const cy = h / 2;
  // only half the jitter is padded - the svg is overflow: visible, so a wobble or the
  // tail poking a hair past the box is fine and keeps the loop roomy around the word
  const pad = OVAL_STROKE + OVAL_JITTER / 2;
  const rx = w / 2 - pad;
  const ry = h / 2 - pad;
  const tilt = ((rand() - 0.5) * 2 * OVAL_TILT_DEG * Math.PI) / 180;
  const cosT = Math.cos(tilt);
  const sinT = Math.sin(tilt);

  const start = -Math.PI / 2 + (rand() - 0.5) * 0.6; // somewhere around the top
  const overshoot = 0.55 + rand() * 0.35; // how far the pen runs past where it began
  const tailIn = rand() > 0.5 ? -OVAL_TAIL : OVAL_TAIL; // inside or outside the start line
  const angles = [start, 0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2, start + 2 * Math.PI + overshoot];
  // px offsets per anchor - the tail gets its deliberate miss, the rest just wobble
  const offsets = angles.map((_, i) => (i === angles.length - 1 ? tailIn : jitter()));
  // per-segment handle fudge so each quarter bulges or flattens a little
  const lumps = angles.map(() => 0.88 + rand() * 0.24);

  // a point on the wobbly ellipse at angle t, pushed out by `off` px, then leaned by tilt
  const lean = (x: number, y: number) => [cx + x * cosT - y * sinT, cy + x * sinT + y * cosT];
  const point = (t: number, off: number) => lean((rx + off) * Math.cos(t), (ry + off) * Math.sin(t));
  const tangent = (t: number, off: number) => {
    const dx = -(rx + off) * Math.sin(t);
    const dy = (ry + off) * Math.cos(t);
    return [dx * cosT - dy * sinT, dx * sinT + dy * cosT];
  };
  const fmt = (n: number) => n.toFixed(1);

  const [sx, sy] = point(angles[0], offsets[0]);
  let d = `M${fmt(sx)} ${fmt(sy)}`;
  for (let i = 1; i < angles.length; i++) {
    const t1 = angles[i - 1];
    const t2 = angles[i];
    // standard cubic-bezier arc handle length for a span of (t2 - t1) radians, lumped
    const k = (4 / 3) * Math.tan((t2 - t1) / 4) * lumps[i];
    const [x1, y1] = point(t1, offsets[i - 1]);
    const [dx1, dy1] = tangent(t1, offsets[i - 1]);
    const [x2, y2] = point(t2, offsets[i]);
    const [dx2, dy2] = tangent(t2, offsets[i]);
    d += ` C${fmt(x1 + dx1 * k)} ${fmt(y1 + dy1 * k)} ${fmt(x2 - dx2 * k)} ${fmt(y2 - dy2 * k)} ${fmt(x2)} ${fmt(y2)}`;
  }
  return d;
}

/**
 * @description A hand-drawn oval that scribbles itself around a word. Rather than
 * stretching a square loop (which would fatten the stroke on the ends), it measures its
 * own box and draws the loop at true pixel size, so the line stays clean and even at
 * any width. Same draw-on/erase feel as ScribbleCircle; `variant` seeds the wobble.
 * @author Chris "Mo" Mochinski
 */
export function ScribbleOval({ active, variant, className }: ScribbleProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  // the nav font is clamp()ed to the viewport, so re-measure whenever the box changes
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      className={clsx(styles.scribble, className)}
      viewBox={size ? `0 0 ${size.w} ${size.h}` : undefined}
      fill="none"
      aria-hidden>
      {size && (
        <motion.path
          d={ovalPath(size.w, size.h, variant)}
          stroke="currentColor"
          strokeWidth={OVAL_STROKE}
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }}
          transition={drawTransition(active)}
        />
      )}
    </svg>
  );
}
