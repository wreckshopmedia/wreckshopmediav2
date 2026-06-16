import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import styles from "./plant.module.css";

// leaf silhouette - small pointed leaf anchored at its stem end (0,0)
const LEAF_D = "M0,0 Q5,-5 10,0 5,5 0,0z";

// local drawing space - stems grow upward from near the bottom
const VB_W = 120;
const VB_H = 220;

interface PlantProps {
  /** stem rise as a fraction of the canvas height. ~0.6 short, ~1 tall. */
  height?: number;
  /** how many leaves to scatter up the stem. */
  leafCount?: number;
  /** overall leaf size - gentle multiplier (1 = default, compressed so it scales softly). */
  leafSize?: number;
  /** stem stroke width. */
  stemWidth?: number;
  /** 0 = vibrant green + light stem; 1 = dead brown, skinny leaves, dark stem. */
  deadness?: number;
  /** seconds for the stem to draw fully (leaves time off this). lower = faster. */
  growDuration?: number;
  /** delay before growth starts (seconds). */
  delay?: number;
  /** false holds it ungrown; flip true to grow. defaults to grow on mount. */
  grow?: boolean;
  /** adjust the randomized shape - same seed = same plant. omit for a fresh one. */
  seed?: number;
  /** override the derived stem color if you want an exact one. */
  stemColor?: string;
  /**
   * Plant height - the size driver; width follows the viewBox aspect. Accepts any
   * CSS length string (`"90px"`, `"12dvh"`, `"clamp(56px, 11dvh, 120px)"`, etc.) or
   * a plain number (treated as px). Overrides the CSS default when set; omit to use
   * the stylesheet's responsive default or a `className`.
   */
  size?: number | string;
  /** wraps the svg - position/size the plant from here. */
  className?: string;
}

interface LeafSpec {
  at: number; // 0-1 along the stem
  rotate: number;
  sx: number;
  sy: number;
  fill: string;
  edge: string; // outline - the leaf's own color, slightly darkened
  vein: string; // midrib - a bit darker still
}

interface PlacedLeaf extends LeafSpec {
  x: number;
  y: number;
}

/** @description Deterministic PRNG (mulberry32) - same seed always replays. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** @description Darken an rgb(...) string by fraction t (0 = same, 1 = black). */
function darken(rgb: string, t: number): string {
  const m = rgb.match(/\d+/g);
  if (!m) return rgb;
  const [r, g, b] = m.map(Number);
  const f = 1 - t;
  return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** @description Mix two hex colors; t=0 is a, t=1 is b. */
function mixHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return `rgb(${Math.round(lerp(ar, br, t))}, ${Math.round(lerp(ag, bg, t))}, ${Math.round(lerp(ab, bb, t))})`;
}

/**
 * @description Catmull-Rom through points -> smooth cubic bezier path string.
 * Borrowed math from the reference pen so a few wobbly points become an organic
 * stem. Takes a flat [x0,y0,x1,y1,...] array.
 */
function solve(data: number[]): string {
  const size = data.length;
  const last = size - 4;
  let path = "M" + [data[0], data[1]];
  for (let i = 0; i < size - 2; i += 2) {
    const x0 = i ? data[i - 2] : data[0];
    const y0 = i ? data[i - 1] : data[1];
    const x1 = data[i];
    const y1 = data[i + 1];
    const x2 = data[i + 2];
    const y2 = data[i + 3];
    const x3 = i !== last ? data[i + 4] : x2;
    const y3 = i !== last ? data[i + 5] : y2;
    const cp1x = (-x0 + 6 * x1 + x2) / 6;
    const cp1y = (-y0 + 6 * y1 + y2) / 6;
    const cp2x = (x1 + 6 * x2 - x3) / 6;
    const cp2y = (y1 + 6 * y2 - y3) / 6;
    path += "C" + [cp1x, cp1y, cp2x, cp2y, x2, y2];
  }
  return path;
}

/**
 * @description One randomized plant that grows itself in: a wobbly stem draws
 * upward via Motion's pathLength, and a scatter of leaves (varied size, angle,
 * green) pop in as the draw passes each one. All randomness is seeded once per
 * mount, so it's stable across re-renders but unique per instance / per visit.
 * Props tune height, leaf density/size, stem thickness, grow speed, and
 * "deadness" (vibrant green -> skinny brown). No GSAP - native Motion only.
 * @author Chris "Mo" Mochinski
 */
export function Plant({
  height = 1,
  leafCount = 26,
  leafSize = 1,
  stemWidth = 6,
  deadness = 0,
  growDuration = 1.1,
  delay = 0,
  grow = true,
  seed,
  stemColor,
  size,
  className,
}: PlantProps) {
  const stemRef = useRef<SVGPathElement>(null);
  // lock the random seed once per mount (or honor an explicit seed)
  const [lockedSeed] = useState(() => seed ?? Math.floor(Math.random() * 1e9));
  const [placed, setPlaced] = useState<PlacedLeaf[]>([]);

  // wobbly stem path, regenerated only if the shape inputs change
  const stemD = useMemo(() => {
    const rng = makeRng(lockedSeed ^ 0x9e3779b9);
    const baseX = VB_W / 2 + (rng() - 0.5) * 22;
    const segments = 12;
    const rise = (VB_H - 28) * height;
    const dy = rise / segments;
    const pts: number[] = [baseX, VB_H - 6];
    let x = baseX;
    for (let i = 1; i <= segments; i++) {
      // wobble grows a touch toward the top so the tip can sway
      x += (rng() - 0.5) * 7 * (0.4 + i * 0.08);
      pts.push(x, VB_H - 6 - dy * i);
    }
    return solve(pts);
  }, [lockedSeed, height]);

  // leaf specs (size/angle/color), seeded so they don't reshuffle on re-render
  const leafSpecs = useMemo<LeafSpec[]>(() => {
    const rng = makeRng(lockedSeed);
    // leaves start just a little up the stem (not the root) through the tip
    const AT_MIN = 0.15;
    const AT_MAX = 1;
    // the deader it gets, the fewer leaves - sparser + scragglier. deeper now:
    // full deadness keeps only ~28% of the leaves (floored at 2).
    const effCount = Math.max(2, Math.round(leafCount * (1 - 0.72 * deadness)));
    const out: LeafSpec[] = [];
    for (let i = 0; i < effCount; i++) {
      let p = effCount > 1 ? i / (effCount - 1) : 0.5;
      // pull spacing toward the middle so leaves crowd the thick mid-section and
      // thin out at base + tip (denser middle, sparser ends)
      p = 0.5 + (p - 0.5) * (0.5 + 0.5 * Math.abs(p - 0.5) * 2);
      const at = Math.min(1, Math.max(0, AT_MIN + p * (AT_MAX - AT_MIN) + (rng() - 0.5) * 0.04));
      // size humps in the middle: small at base/tip, biggest through the bulge.
      // skew the peak slightly below center for a natural shape.
      const norm = (at - AT_MIN) / (AT_MAX - AT_MIN);
      const hump = Math.sin(Math.PI * Math.min(1, Math.max(0, norm)) ** 0.82);
      // LEAF_D points right (0deg), so -90 = straight up. fan leaves across the
      // upper arc to both sides. side mostly alternates but flips at random so
      // it's not a rigid left/right/left pattern; spread is biased toward more
      // upright (** > 1) and gets extra jitter so no two leaves share an angle.
      let side = i % 2 === 0 ? 1 : -1;
      if (rng() < 0.3) side = -side;
      const spread = 16 + rng() ** 1.35 * 90; // ~16 (steep up) .. ~106 (past horizontal)
      const rotate = -90 + side * spread + (rng() - 0.5) * 20;
      // leafSize is compressed (** 0.55) so it scales gently - 1 is unchanged,
      // but bigger values don't explode (3 -> ~1.8x, not 3x).
      const base = leafSize ** 0.55 * (0.32 + 0.78 * hump) * (0.82 + rng() * 0.4) * 4.6;
      const sx = base;
      // slightly skinnier as it dies (subtle now); a touch of per-leaf variance
      const sy = base * (1 - 0.25 * deadness) * (0.85 + rng() * 0.3);
      // muted sage-green family (lighter + far less saturated than kelly) so the
      // leaves sit in the site palette; deeper sage -> light sage per leaf. dead
      // lerps to a soft dry tan-brown rather than a harsh dark brown.
      const green = mixHex("#6f9452", "#bfd79d", rng());
      const dead = `rgb(${Math.round(150 + rng() * 34)}, ${Math.round(120 + rng() * 26)}, ${Math.round(80 + rng() * 22)})`;
      const fill = deadness <= 0 ? green : mixHex(rgbToHex(green), rgbToHex(dead), deadness);
      // outline + vein follow THIS leaf's color, just darkened (randomized a bit)
      const edge = darken(fill, 0.14 + rng() * 0.12); // ~14-26% darker
      const vein = darken(fill, 0.3 + rng() * 0.16); // ~30-46% darker
      out.push({ at, rotate, sx, sy, fill, edge, vein });
    }
    // draw base leaves first so upper leaves layer over them
    return out.sort((a, b) => a.at - b.at);
  }, [lockedSeed, leafCount, leafSize, deadness]);

  // stem goes from a muted sage-green (alive) to a soft brown (dead) by deadness
  const stem = stemColor ?? mixHex("#74965a", "#6b4d30", deadness);
  // unique filter id per instance so multiple plants on a page don't collide
  const shadowId = `leaf-shadow-${lockedSeed}`;

  // pin each leaf to its measured point along the rendered stem
  useLayoutEffect(() => {
    const path = stemRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    setPlaced(
      leafSpecs.map((leaf) => {
        const pt = path.getPointAtLength(leaf.at * total);
        return { ...leaf, x: pt.x, y: pt.y };
      }),
    );
  }, [stemD, leafSpecs]);

  return (
    <svg
      className={`${styles.plant} ${className ?? ""}`}
      // height drives the size (width follows the viewBox aspect); inline wins over
      // the stylesheet default. number -> px, string passes straight through.
      style={size != null ? { height: typeof size === "number" ? `${size}px` : size } : undefined}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      fill="none"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden>
      <defs>
        {/* subtle soft shadow so each leaf reads in front of the ones behind it */}
        <filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="-0.6" stdDeviation="0.3" floodColor="#13260f" floodOpacity="0.3" />
        </filter>
      </defs>
      <motion.path
        ref={stemRef}
        d={stemD}
        stroke={stem}
        strokeWidth={stemWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grow ? 1 : 0 }}
        transition={{ duration: growDuration, delay, ease: "easeOut" }}
      />
      {placed.map((leaf, i) => (
        // x/y/rotate are static; scaleX/scaleY animate the pop-in from the stem
        // attachment (originX:0 = leaf's anchor end, originY:0.5 = its midline)
        <motion.g
          key={i}
          style={{
            x: leaf.x,
            y: leaf.y,
            rotate: leaf.rotate,
            originX: 0,
            originY: 0.5,
            transformBox: "fill-box",
          }}
          initial={{ scaleX: 0, scaleY: 0 }}
          animate={{ scaleX: grow ? leaf.sx : 0, scaleY: grow ? leaf.sy : 0 }}
          transition={{
            delay: delay + leaf.at * growDuration,
            type: "spring",
            stiffness: 250,
            damping: 18,
          }}>
          {/* fill + thin outline (leaf-hued, darkened); non-scaling-stroke keeps
              the line crisp under the leaf's scale. midrib vein adds detail. */}
          <g filter={`url(#${shadowId})`}>
            <path
              d={LEAF_D}
              fill={leaf.fill}
              stroke={leaf.edge}
              strokeWidth={0.6}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M1,0 L8.5,0"
              stroke={leaf.vein}
              strokeWidth={0.7}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={0.4}
            />
          </g>
        </motion.g>
      ))}
    </svg>
  );
}

/** @description rgb(r,g,b) string -> #rrggbb for mixHex. */
function rgbToHex(rgb: string): string {
  const m = rgb.match(/\d+/g);
  if (!m) return "#000000";
  return "#" + m.slice(0, 3).map((v) => Number(v).toString(16).padStart(2, "0")).join("");
}
