/**
 * @module Scribble
 * @description Hand-drawn marks that scribble themselves onto things. Two pen loops
 * share one draw-on/erase feel: ScribbleCircle (fixed square loops, the social icons)
 * and ScribbleOval (drawn at the target's real pixel size, the nav links). Plus
 * ScribbleHighlight, a highlighter swipe that marks the nav's current page.
 * @author Chris "Mo" Mochinski
 */
import { useEffect, useId, useRef, useState } from "react";
import { motion } from "motion/react";
import { clsx } from "clsx";
import styles from "./scribble.module.css";

/**
 * @description Shared pathLength/opacity timing - really fast scribble ON, a quicker
 * but lazier unwind OFF, with the stroke held opaque until it's nearly retracted.
 * `quick` swaps the lazy unwind for a fast erase, for when another mark takes over.
 */
function drawTransition(active: boolean, quick = false, delay = 0) {
  if (!active && quick) {
    return {
      pathLength: { duration: 0.14, ease: "easeIn" },
      opacity: { duration: 0.08, delay: 0.08 },
    } as const;
  }
  return {
    pathLength: {
      duration: active ? 0.2 : 0.55,
      ease: active ? "easeOut" : "easeInOut",
      delay: active ? delay : 0,
    },
    opacity: active ? { duration: 0.1, delay } : { duration: 0.16, delay: 0.38 },
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
  /** per-instance overrides, e.g. a highlighter's ink color */
  style?: React.CSSProperties;
  /** ScribbleOval: erase fast instead of the lazy unwind (another mark is taking over) */
  quickErase?: boolean;
  /** ScribbleOval / ScribbleHighlight: seconds to wait before drawing on */
  delay?: number;
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
const OVAL_STROKE = 1.5;

// oval wobble, all in real px so short and long words get the same hand-drawn feel
const OVAL_JITTER = 2.6; // how far each anchor drifts in or out of the clean shape
const OVAL_TILT_DEG = 3.5; // max lean either way, like a quick loop drawn on the fly
const OVAL_TAIL = 4.5; // how far the overshoot lands inside/outside the start
// squareness of the loop: 2 is a true (pointy-ended) ellipse, higher pushes it toward a
// rounded rectangle. 3 hugs a word's corners without ever reading as a box.
const OVAL_SQUARENESS = 3;
const OVAL_ANCHORS = 8; // points the pen passes through per lap - more = lumpier

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

/**
 * @description Builds a hand-drawn loop sized to a w x h box in real pixels. The base
 * shape is a superellipse (an oval nudged toward a rounded rectangle) so it hugs the
 * word instead of running out to pointy ends. The pen starts near the top, runs
 * clockwise through jittered anchors, and overshoots past its own start so the ends
 * cross. A smooth curve threads the anchors, and a slight lean sells the quick scrawl.
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

  // superellipse: raising cos/sin to 2/n flattens the sides and fills out the corners
  const exp = 2 / OVAL_SQUARENESS;
  const bend = (v: number) => Math.sign(v) * Math.abs(v) ** exp;
  // a point on the loop at angle t, pushed out by `off` px, then leaned by the tilt
  const at = (t: number, off: number) => {
    const x = (rx + off) * bend(Math.cos(t));
    const y = (ry + off) * bend(Math.sin(t));
    return [cx + x * cosT - y * sinT, cy + x * sinT + y * cosT];
  };

  const step = (2 * Math.PI) / OVAL_ANCHORS;
  const start = -Math.PI / 2 + (rand() - 0.5) * 0.6; // somewhere around the top
  const end = start + 2 * Math.PI;
  const overshoot = 0.5 + rand() * 0.45; // how far the pen runs past where it began
  const tailOff = rand() > 0.5 ? -OVAL_TAIL : OVAL_TAIL; // inside or outside the start line

  // anchors on the even grid between start and a full lap, skipping any that crowd the ends
  const angles = [start];
  for (let t = Math.ceil(start / step + 0.2) * step; t < end - step * 0.3; t += step) angles.push(t);
  angles.push(end, end + overshoot);
  // the lap's closing point only half-wobbles so the crossing stays tidy; the tail misses
  const last = angles.length - 1;
  const points = angles.map((t, i) =>
    at(t, i === last ? tailOff : i === last - 1 ? jitter() / 2 : jitter()),
  );

  // Catmull-Rom through the anchors, converted to cubic beziers. ghost points one step
  // past each end give the first and last segments a natural direction to leave/arrive.
  const all = [at(start - step, 0), ...points, at(end + overshoot + step, tailOff)];
  const fmt = (n: number) => n.toFixed(1);
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`;
  for (let i = 1; i < all.length - 2; i++) {
    const [p0, p1, p2, p3] = [all[i - 1], all[i], all[i + 1], all[i + 2]];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p2[0])} ${fmt(p2[1])}`;
  }
  return d;
}

/**
 * @description Tracks an svg's rendered px size so marks can be drawn at true scale
 * instead of stretched. The nav font is clamp()ed to the viewport, so it re-measures
 * whenever the box changes. Size stays null until the first real measurement.
 */
function useMeasuredBox() {
  const ref = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

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

  return [ref, size] as const;
}

/**
 * @description A hand-drawn oval that scribbles itself around a word. Rather than
 * stretching a square loop (which would fatten the stroke on the ends), it measures its
 * own box and draws the loop at true pixel size, so the line stays clean and even at
 * any width. Same draw-on/erase feel as ScribbleCircle; `variant` seeds the wobble.
 * @author Chris "Mo" Mochinski
 */
export function ScribbleOval({
  active,
  variant,
  className,
  quickErase,
  delay = 0,
}: ScribbleProps) {
  const [ref, size] = useMeasuredBox();

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
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: active ? 1 : 0, opacity: active ? 1 : 0 }}
          transition={drawTransition(active, quickErase, delay)}
        />
      )}
    </svg>
  );
}

// highlighter ink - see-through so the second pass builds up a darker band where it overlaps
const SWIPE_THICKNESS = 0.66; // main pass, as a fraction of the box height
const SWIPE_SLANT = 0.2; // chisel-tip lean of the ends, as a fraction of the stroke thickness
const SWIPE_OPACITY = 0.7;
const SWIPE_SECOND_OPACITY = 0.5;

/**
 * @description Outlines one chisel-tip highlighter stroke from x0 to x1, centered on
 * the line from y0 to y1. The ends lean like a real marker's slanted felt, and both long
 * edges bow a little so it never reads as a crisp UI box (or, worse, selected text).
 */
function chiselStroke(
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  thick: number,
  rand: () => number,
): string {
  const half = thick / 2;
  const slant = thick * SWIPE_SLANT;
  const bow = () => (rand() - 0.5) * thick * 0.3; // edge wobble, px
  const midX = (x0 + x1) / 2;
  const midY = (y0 + y1) / 2;
  const fmt = (n: number) => n.toFixed(1);
  // top edge left -> right, slanted right end, bottom edge right -> left, slanted left end
  return [
    `M${fmt(x0 + slant)} ${fmt(y0 - half)}`,
    `Q${fmt(midX)} ${fmt(midY - half + bow())} ${fmt(x1 + slant)} ${fmt(y1 - half)}`,
    `L${fmt(x1 - slant)} ${fmt(y1 + half)}`,
    `Q${fmt(midX)} ${fmt(midY + half + bow())} ${fmt(x0 - slant)} ${fmt(y0 + half)}`,
    "Z",
  ].join(" ");
}

/**
 * @description Builds one highlighter swipe across a w x h box: a fat main pass that
 * drifts a hair up or down as it goes (nobody highlights level), and a thinner, shorter
 * second pass slightly off-center, like going back over a spot.
 */
function swipePaths(w: number, h: number, seed: number): [string, string] {
  const rand = seededRandom(seed + 101);
  const drift = () => (rand() - 0.5) * h * 0.12;
  const cy = h / 2;
  const thick = h * SWIPE_THICKNESS;
  const slant = thick * SWIPE_SLANT;

  // inset by the slant so the leaning ends stay inside the box
  const main = chiselStroke(slant, w - slant, cy + drift(), cy + drift(), thick, rand);
  // the second pass sits above or below center and skips the very ends
  const side = (rand() > 0.5 ? 1 : -1) * thick * 0.3;
  const x0 = w * (0.05 + rand() * 0.08);
  const x1 = w * (0.84 + rand() * 0.1);
  const second = chiselStroke(x0, x1, cy + side + drift(), cy + side + drift(), thick * 0.5, rand);
  return [main, second];
}

/**
 * @description A highlighter swipe behind a word - marks "you are here" without looking
 * like the hover pen loop. A clip sweeps it on left to right (main pass, then a quick
 * second pass), and it simply fades on the way out, since you can't un-highlight. Ink
 * comes from `currentColor`, so the caller picks the marker; `variant` seeds the shape.
 * @author Chris "Mo" Mochinski
 */
export function ScribbleHighlight({
  active,
  variant,
  className,
  style,
  delay = 0,
}: ScribbleProps) {
  const [ref, size] = useMeasuredBox();
  const clipId = useId();
  const paths = size ? swipePaths(size.w, size.h, variant) : null;

  return (
    <svg
      ref={ref}
      className={clsx(styles.scribble, className)}
      style={style}
      viewBox={size ? `0 0 ${size.w} ${size.h}` : undefined}
      fill="none"
      aria-hidden>
      {size && paths && (
        <>
          <defs>
            {paths.map((_, i) => (
              <clipPath key={i} id={`${clipId}-${i}`}>
                {/* the "felt tip" - a rect that grows rightward to reveal the stroke */}
                <motion.rect
                  x={0}
                  y={0}
                  height={size.h}
                  initial={{ width: 0 }}
                  animate={{ width: active ? size.w : 0 }}
                  transition={
                    active
                      ? { duration: 0.32, delay: delay + i * 0.22, ease: "easeOut" }
                      : { duration: 0, delay: 0.25 } // reset only after the fade is done
                  }
                />
              </clipPath>
            ))}
          </defs>
          {paths.map((d, i) => (
            <motion.path
              key={i}
              d={d}
              fill="currentColor"
              clipPath={`url(#${clipId}-${i})`}
              initial={{ opacity: 0 }}
              animate={{
                opacity: active ? (i === 0 ? SWIPE_OPACITY : SWIPE_SECOND_OPACITY) : 0,
              }}
              transition={{ duration: active ? 0.05 : 0.25, delay: active ? delay + i * 0.22 : 0 }}
            />
          ))}
        </>
      )}
    </svg>
  );
}
