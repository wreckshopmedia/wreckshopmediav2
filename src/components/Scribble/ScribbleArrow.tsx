import { useState } from "react";
import { motion } from "motion/react";
import type { Variants } from "motion/react";
import { clsx } from "clsx";
import styles from "./scribble.module.css";

/**
 * Centerline traces of Mo's four hand-drawn "?" + arrow doodles, in the units of his
 * original Figma frame (3860 x 800). Each is a single pen line so it can draw itself:
 * `q` is the question mark's curl, `dot` its dot, `line` the arrow shaft, `head` the
 * two barbs, `tip` where the arrowhead points (it becomes the anchor point), and
 * `qCenter` the ?'s middle, which it pivots on to stay upright and readable.
 */
const DOODLES = {
  // lazy swoop up and to the right, ? hanging back at the lower left
  swoop: {
    q: "M70 405 C70 380 95 360 125 357 C160 354 190 368 202 398 C212 425 200 455 180 478 C165 495 148 508 142 520",
    dot: [172, 580],
    qCenter: [136, 470],
    line: "M290 465 C380 470 470 425 540 365 C580 330 605 290 622 232",
    head: "M562 297 L622 230 L632 326",
    tip: [622, 230],
    height: 380,
  },
  // short straight dart pointing right, skinny ? behind it
  dart: {
    q: "M1173 350 C1180 330 1200 320 1222 322 C1245 326 1258 345 1255 372 C1250 410 1236 440 1232 475 C1230 505 1238 528 1250 548",
    dot: [1274, 606],
    qCenter: [1222, 465],
    line: "M1390 446 L1640 400",
    head: "M1522 366 L1640 398 L1540 452",
    tip: [1640, 398],
    height: 310,
  },
  // over-and-up L, like someone ruled a line straight up to the answer
  ell: {
    q: "M2150 488 C2155 455 2180 425 2215 418 C2250 412 2275 435 2278 470 C2282 500 2266 527 2252 552 C2238 580 2230 610 2240 650",
    dot: [2262, 713],
    qCenter: [2214, 565],
    line: "M2390 577 L2515 552 L2492 12",
    head: "M2455 172 L2490 8 L2537 120",
    tip: [2490, 8],
    height: 730,
  },
  // the panicked zigzag up and to the left, ? off to the right
  zigzag: {
    q: "M3728 438 C3770 432 3810 426 3848 428 C3850 455 3830 485 3800 505 C3765 528 3715 540 3690 562 C3668 582 3662 605 3683 626",
    dot: [3670, 728],
    qCenter: [3756, 580],
    line: "M3530 510 L3300 452 L3462 392 L3300 290 L3425 214 L3268 118 L3218 66",
    head: "M3265 172 L3214 64 L3310 108",
    tip: [3214, 64],
    height: 690,
  },
} as const;

type DoodleName = keyof typeof DOODLES;

/**
 * One nav link's doodle: which drawing, how big (in em, roughly its height), whether
 * it's mirrored (arrow flips, the ? stays readable), any extra lean, and where under the
 * word the tip lands (0 = word's left edge, 1 = right edge).
 */
interface DoodleSetup {
  doodle: DoodleName;
  sizeEm: number;
  mirror?: boolean;
  rotate?: number;
  anchorX: number;
}

// one per nav link, in nav order. left-side links get arrows coming from the lower left,
// right-side links from the lower right, so nothing ever crosses under the title.
const SETUPS: readonly DoodleSetup[] = [
  { doodle: "swoop", sizeEm: 2.4, anchorX: 0.35 }, // home
  { doodle: "ell", sizeEm: 3, anchorX: 0.5 }, // about
  { doodle: "dart", sizeEm: 2.2, rotate: -40, anchorX: 0.3 }, // contact
  { doodle: "zigzag", sizeEm: 3, anchorX: 0.65 }, // things
  { doodle: "ell", sizeEm: 3, mirror: true, anchorX: 0.5 }, // stuff
  { doodle: "swoop", sizeEm: 2.4, mirror: true, anchorX: 0.65 }, // rants
];

// global size dial for every doodle - bump it if they read too small on the real site
const DOODLE_SCALE = 1;
// pen weight in em, so it matches the hover/current loops at the clamped nav font
const DOODLE_STROKE_EM = 0.1;
const DOT_RADIUS_EM = 0.09;

// the drawing order: ? curl, its dot, the arrow shaft, then the barbs. [delay, duration]
const TIMING = {
  q: [0, 0.135],
  dot: [0.135, 0.035],
  line: [0.17, 0.12],
  head: [0.29, 0.07],
} as const;
const FADE_OUT = 0.12; // hover-off: a quick, plain fade
// click: the doodle blurs and dissolves instead - "never mind the ?, I picked it" - slow
// enough to read as its own beat while the pen loop circles the word
const PICK_OUT = 0.3;
const PICK_BLUR = "blur(4px)";

/**
 * @description Builds the variants for one piece of the doodle. On, it draws in its slot
 * of the sequence; off, everything fades together and only then resets its length, so
 * leaving a link never plays the drawing backwards. Picked holds the piece exactly as
 * drawn while the whole svg blurs out, then resets it once that's finished.
 */
function pieceVariants([delay, duration]: readonly [number, number]): Variants {
  return {
    on: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, duration, ease: "easeOut" },
        opacity: { delay, duration: 0.01 },
      },
    },
    off: {
      pathLength: 0,
      opacity: 0,
      transition: {
        opacity: { duration: FADE_OUT },
        pathLength: { duration: 0, delay: FADE_OUT },
      },
    },
    picked: {
      pathLength: 0,
      opacity: 0,
      transition: { duration: 0, delay: PICK_OUT },
    },
  };
}

const DOT_VARIANTS: Variants = {
  on: { opacity: 1, transition: { delay: TIMING.dot[0], duration: TIMING.dot[1] } },
  off: { opacity: 0, transition: { duration: FADE_OUT } },
  picked: { opacity: 0, transition: { duration: 0, delay: PICK_OUT } },
};

interface ScribbleArrowProps {
  /** true draws the doodle on, false fades it away */
  active: boolean;
  /** this link just got picked - blur the doodle away instead of the plain fade */
  picked: boolean;
  /** which nav slot this is - picks the doodle from SETUPS */
  variant: number;
  /** positioning comes from the caller (the anchor box the tip is placed in) */
  className?: string;
}

/**
 * @description A hand-drawn "?" and arrow pointing at a word, like someone deciding
 * between options in a notebook margin. Draws itself in order (the ? curl, its dot, the
 * arrow, the barbs) and fades away when you move off. When the link gets picked it blurs
 * and dissolves instead, since the question's been answered. Built from centerline traces
 * of Mo's own sketches, each nav slot with its own doodle, size, lean and direction.
 * @author Chris "Mo" Mochinski
 */
export function ScribbleArrow({ active, picked, variant, className }: ScribbleArrowProps) {
  // once picked, the svg stays dissolved until the next real hover. un-picking used to
  // snap it straight back to visible, which flashed whatever ink the pieces still held
  // on the page you just left (React's "adjust state on prop change" pattern again)
  // one resolved target, not two competing setters - a link can be picked AND hovered for
  // a render mid-navigation, and two ifs would ping-pong each other into a render loop
  const [dissolved, setDissolved] = useState(picked);
  const nextDissolved = active ? false : picked ? true : dissolved;
  if (nextDissolved !== dissolved) setDissolved(nextDissolved);
  const hidden = picked || dissolved;

  const setup = SETUPS[variant % SETUPS.length];
  const art = DOODLES[setup.doodle];

  // 100 viewBox units = 1em, so everything scales with the nav's clamped font size
  const k = (setup.sizeEm * DOODLE_SCALE * 100) / art.height;
  const stroke = (DOODLE_STROKE_EM * 100) / k; // back into art units so it lands at 0.1em
  const flip = setup.mirror ? -1 : 1;
  // right-to-left: move the tip to the origin, lean around it, mirror, then size it
  const transform = `scale(${k * flip} ${k}) rotate(${setup.rotate ?? 0}) translate(${-art.tip[0]} ${-art.tip[1]})`;
  // the lean and the mirror apply to the whole doodle, but the ? should stay upright and
  // readable - so undo both around its own center (inner transforms run first)
  const [qx, qy] = art.qCenter;
  const uprightQ = [
    setup.rotate ? `rotate(${-setup.rotate} ${qx} ${qy})` : "",
    setup.mirror ? `translate(${2 * qx} 0) scale(-1 1)` : "",
  ].join(" ");

  const pen = {
    stroke: "currentColor",
    strokeWidth: stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    fill: "none",
  } as const;

  return (
    <motion.svg
      className={clsx(styles.scribble, className)}
      style={{ left: `${setup.anchorX * 100}%` }}
      viewBox="0 0 100 100"
      aria-hidden
      // the blur lives on the svg itself (CSS filters on inner svg nodes are patchy).
      // picking blurs it out; the next hover snaps it back clean so the doodle is crisp.
      initial={false}
      animate={hidden ? { opacity: 0, filter: PICK_BLUR } : { opacity: 1, filter: "blur(0px)" }}
      transition={hidden ? { duration: PICK_OUT, ease: "easeOut" } : { duration: 0 }}>
      {/* plain g holds the static placement transform so Motion never touches it;
          the motion.g inside only orchestrates the variants */}
      <g transform={transform}>
        <motion.g initial="off" animate={active ? "on" : picked ? "picked" : "off"}>
          <g transform={uprightQ}>
            <motion.path d={art.q} {...pen} variants={pieceVariants(TIMING.q)} />
            <motion.circle
              cx={art.dot[0]}
              cy={art.dot[1]}
              r={(DOT_RADIUS_EM * 100) / k}
              fill="currentColor"
              variants={DOT_VARIANTS}
            />
          </g>
          <motion.path d={art.line} {...pen} variants={pieceVariants(TIMING.line)} />
          <motion.path d={art.head} {...pen} variants={pieceVariants(TIMING.head)} />
        </motion.g>
      </g>
    </motion.svg>
  );
}
