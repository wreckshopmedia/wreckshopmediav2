import { useLayoutEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import styles from "./plant.module.css";

/** a leaf pinned to a fraction along the stem (0 = base, 1 = tip) */
export interface Leaf {
  /** 0-1 position along the stem path */
  at: number;
  /** resting rotation in degrees */
  rotate: number;
  /** size multiplier (leaf base shape is ~10x10 units) */
  scale?: number;
}

// default leaf silhouette - small pointed leaf around the origin (from the
// reference pen). swap for a curlier/rounder shape anytime.
const LEAF_D = "M0,0 Q5,-5 10,0 5,5 0,0z";

// a gently S-curved default stem, authored base-first (M at the bottom) so the
// pathLength draw grows UPWARD. local coordinate space is the viewBox below.
const DEFAULT_STEM = "M60 215 C 60 170 82 150 70 112 C 60 82 44 58 60 26";

const DEFAULT_LEAVES: Leaf[] = [
  { at: 0.32, rotate: -55, scale: 4.4 },
  { at: 0.5, rotate: 60, scale: 4 },
  { at: 0.66, rotate: -50, scale: 3.4 },
  { at: 0.8, rotate: 55, scale: 2.8 },
  { at: 0.92, rotate: -8, scale: 2.2 },
];

interface PlantProps {
  /** stem path data, authored base-first so it draws upward. */
  stem?: string;
  leaves?: Leaf[];
  /** flip to false to hold ungrown; set true to grow. defaults to grow on mount. */
  grow?: boolean;
  /** seconds for the stem to fully draw. */
  growDuration?: number;
  /** delay before growth starts (seconds). */
  delay?: number;
  stemColor?: string;
  leafColor?: string;
  stemWidth?: number;
  /** wraps the svg - position/size the plant from here. */
  className?: string;
}

interface PlacedLeaf extends Leaf {
  x: number;
  y: number;
}

/**
 * @description A single hand-placed plant that grows itself in: the stem draws
 * upward via Motion's pathLength, and each leaf pops in (scale 0->1) as the draw
 * reaches its spot along the stem. No randomness, no GSAP/DrawSVG - native Motion
 * only. Author the stem `d` base-first so it grows from the ground up.
 * @author Chris "Mo" Mochinski
 */
export function Plant({
  stem = DEFAULT_STEM,
  leaves = DEFAULT_LEAVES,
  grow = true,
  growDuration = 1,
  delay = 0,
  stemColor = "var(--light-brown)",
  leafColor = "var(--green)",
  stemWidth = 4,
  className,
}: PlantProps) {
  const stemRef = useRef<SVGPathElement>(null);
  const [placed, setPlaced] = useState<PlacedLeaf[]>([]);

  // measure the stem once mounted and pin each leaf to its point along the path
  useLayoutEffect(() => {
    const path = stemRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    setPlaced(
      leaves.map((leaf) => {
        const pt = path.getPointAtLength(leaf.at * total);
        return { ...leaf, x: pt.x, y: pt.y };
      }),
    );
  }, [stem, leaves]);

  return (
    <svg
      className={`${styles.plant} ${className ?? ""}`}
      viewBox="0 0 120 220"
      fill="none"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden>
      <motion.path
        ref={stemRef}
        d={stem}
        stroke={stemColor}
        strokeWidth={stemWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: grow ? 1 : 0 }}
        transition={{ duration: growDuration, delay, ease: "easeOut" }}
      />
      {placed.map((leaf, i) => (
        // static translate via group attr; scale/rotate animate on the leaf itself
        <g key={i} transform={`translate(${leaf.x} ${leaf.y})`}>
          <motion.path
            d={LEAF_D}
            fill={leafColor}
            initial={{ scale: 0 }}
            animate={{ scale: grow ? (leaf.scale ?? 1) : 0 }}
            // each leaf appears as the stem draw passes its position
            transition={{
              delay: delay + leaf.at * growDuration,
              type: "spring",
              stiffness: 300,
              damping: 12,
            }}
            style={{ rotate: leaf.rotate, transformBox: "fill-box", transformOrigin: "center" }}
          />
        </g>
      ))}
    </svg>
  );
}
