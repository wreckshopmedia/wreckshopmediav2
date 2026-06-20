import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { useRouteContext } from "../../context/routeContextIndex";
import { useReducedMotion } from "../../context/ReducedMotionContext";
import { useTruck } from "../../context/truckContextIndex";
import { GarbageTruckArt } from "./GarbageTruckArt";
import styles from "./garbageTruck.module.css";

// the route the truck is "for" - it reverses in here and drives away on leaving.
const TRUCK_ROUTE = "/rants";

// the chomp: yank the pull-lever clockwise (to the right) around its pivot, hold at
// the pull while the packer "cycles", then release back to rest. positive = clockwise.
// pivot origin (1438 319 in viewBox units) is set in CSS via transform-box: view-box.
const CHOMP_KEYFRAMES = [
  { rotate: "0deg" },
  { rotate: "70deg", offset: 0.35 }, // quick pull to the right
  { rotate: "70deg", offset: 0.58 }, // hold the pull - the compaction beat
  { rotate: "0deg" }, // release back
];
const CHOMP_OPTIONS = { duration: 620, easing: "ease-in-out" } as const;

// a gentle whole-truck wobble synced to the chomp - the packer straining a little.
// applied to the SVG element (CSS px, predictable) so it's independent of the drive
// transform on the parent. small on purpose: a shimmy, not an earthquake.
const SHAKE_KEYFRAMES = [
  { transform: "translate(0, 0) rotate(0deg)" },
  { transform: "translate(-2px, 1px) rotate(-0.35deg)", offset: 0.12 },
  { transform: "translate(2px, -1px) rotate(0.35deg)", offset: 0.3 },
  { transform: "translate(-1.5px, 1px) rotate(-0.25deg)", offset: 0.5 },
  { transform: "translate(1.5px, -0.5px) rotate(0.2deg)", offset: 0.7 },
  { transform: "translate(0, 0) rotate(0deg)" },
];
const SHAKE_OPTIONS = { duration: 620, easing: "ease-out" } as const;

// the note-swallow: spawn a colored rect clone in #swallow-layer (which paints BEHIND
// the hopper face), then slide it down-left INTO the mouth while it shrinks to nothing
// and vanishes behind the hopper. all coords are viewBox units (the SVG is 1562x662).
const SWALLOW = { x: 1255, y: 20, size: 185 } as const;
// bottom-left transform-origin (Mo's idea): the note collapses toward its down-left
// corner, reading as "sucked into the mouth along the lip" rather than fading in place.
const SWALLOW_KEYFRAMES = [
  { transform: "translate(0, 0) scale(1) rotate(-4deg)", opacity: 1 },
  { transform: "translate(-18px, 78px) scale(0.5) rotate(-18deg)", opacity: 1, offset: 0.6 },
  { transform: "translate(-36px, 156px) scale(0) rotate(-30deg)", opacity: 0.85 },
];
const SWALLOW_OPTIONS = { duration: 540, easing: "cubic-bezier(0.45, 0, 0.7, 0.35)" } as const;
const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * @description Spawns a single note-clone (a colored rect) in the swallow-layer and
 * animates it being eaten - sliding into the hopper mouth, shrinking toward its
 * bottom-left, and vanishing behind the hopper face. Self-cleans on finish/cancel.
 */
function swallowNote(root: HTMLElement | null, color: string) {
  const layer = root?.querySelector("#swallow-layer");
  if (!layer) return;
  const note = document.createElementNS(SVG_NS, "rect");
  note.setAttribute("x", String(SWALLOW.x));
  note.setAttribute("y", String(SWALLOW.y));
  note.setAttribute("width", String(SWALLOW.size));
  note.setAttribute("height", String(SWALLOW.size));
  note.setAttribute("rx", "8");
  note.style.fill = color || "var(--sticky-note-yellow)";
  note.style.transformBox = "fill-box";
  note.style.transformOrigin = "0% 100%"; // bottom-left
  layer.appendChild(note);
  const anim = note.animate(SWALLOW_KEYFRAMES, SWALLOW_OPTIONS);
  const cleanup = () => note.remove();
  anim.onfinish = cleanup;
  anim.oncancel = cleanup;
}

// parked x: shifted half its own width off the stage's left edge so the FRONT (cab)
// half hangs off-screen and only the rear + hopper show. on small/moderate screens
// the stage hugs the viewport, so this reads as "cut in half by the left edge." on
// ultrawide the stage anchors to the inset content edge, so the front progressively
// reveals into the growing left margin. tune this to move the cut line (0% = fully in).
const DOCK_X = "-50%";

// off-screen staging x: far enough left to clear the side margin on ANY monitor width
// (50vw always exceeds half the leftover margin), so the truck fully hides before driving.
const AWAY_X = "calc(-100% - 50vw)";

// the drive curves, shared so the WHEELS can roll on the EXACT same easing + duration
// as the truck body - that's what stops the wheels from outpacing the decelerating
// truck on arrival. bezier kept as a tuple: Motion's transition wants the array form,
// WAAPI wants a cubic-bezier() string (cssBezier below).
const DRIVE = {
  in: { ms: 1200, bezier: [0.22, 0.61, 0.36, 1] as const }, // reverse IN: decelerate to dock
  out: { ms: 950, bezier: [0.5, 0, 0.85, 0.35] as const }, // drive AWAY: accelerate off
};
const cssBezier = (b: readonly number[]) => `cubic-bezier(${b[0]}, ${b[1]}, ${b[2]}, ${b[3]})`;

// whole turns the wheels roll across one drive - integer so they end where they started
// (seamless, no snap when the animation clears). more turns = faster spin; tune to taste.
const WHEEL_TURNS = 3;

/**
 * @description The persistent garbage truck. Lives up in SiteLayout (NOT inside the
 * rants route) so it survives route changes and can drive itself in/out independent
 * of which page is mounted. It reverses into frame from the bottom-left when you hit
 * /rants and pulls away when you leave. While parked, its hopper is the drop target
 * that swallows sticky notes (replacing the old corner trash can).
 *
 * The artwork is GarbageTruckArt (converted from Figma). Animations targeting its
 * group ids (wheel spin, lever chomp, glass roll-down, note swallow) come next - for
 * now it renders static while the stage/drive/hopper-hitbox are already live.
 * @author Chris "Mo" Mochinski
 */
export function GarbageTruck() {
  const { pathname } = useRouteContext();
  const { animationsEnabled } = useReducedMotion();
  const { compactorRef, setParked, hopperArmed, ingestNonce, ingestColor } = useTruck();

  const onRoute = pathname === TRUCK_ROUTE;
  const truckRef = useRef<HTMLDivElement>(null);

  // roll the wheels through WHEEL_TURNS full turns on the SAME curve/duration as the
  // drive, so they decelerate with the truck (arrival) / accelerate with it (leaving)
  // instead of spinning at a constant rate and snap-stopping. integer turns end where
  // they began, so it clears seamlessly. fired from the drive's onAnimationStart.
  const rollWheels = () => {
    if (!animationsEnabled) return;
    const phase = onRoute ? DRIVE.in : DRIVE.out;
    const end = (onRoute ? 1 : -1) * WHEEL_TURNS * 360;
    truckRef.current?.querySelectorAll("#wheel-front, #wheel-mid, #wheel-rear").forEach((w) =>
      w.animate([{ transform: "rotate(0deg)" }, { transform: `rotate(${end}deg)` }], {
        duration: phase.ms,
        easing: cssBezier(phase.bezier),
      }),
    );
  };

  // the instant we leave the route, lock the hopper so a note can't be tossed into a
  // departing truck. arrival re-opens it via onAnimationComplete below.
  useEffect(() => {
    if (!onRoute) setParked(false);
  }, [onRoute, setParked]);

  // chomp the lever each time a note is ingested. WAAPI (not CSS) so it reliably
  // re-fires on rapid tosses and settles back to rest. skip the initial mount (nonce
  // starts at 0) and honor reduced motion. querySelector is fine - the lever is a
  // stable, always-mounted node inside the truck SVG.
  useEffect(() => {
    if (ingestNonce === 0 || !animationsEnabled) return;
    const root = truckRef.current;
    root?.querySelector("#hopper-lever")?.animate(CHOMP_KEYFRAMES, CHOMP_OPTIONS);
    // shake the svg element itself (CSS px) so the wobble is independent of the
    // parent's drive transform and reads at a consistent amplitude on any screen.
    root?.querySelector("svg")?.animate(SHAKE_KEYFRAMES, SHAKE_OPTIONS);
    // the note disappearing into the hopper, in the tossed note's color.
    swallowNote(root, ingestColor);
  }, [ingestNonce, ingestColor, animationsEnabled]);

  return (
    <div className={styles.stage} aria-hidden>
      <motion.div
        ref={truckRef}
        className={styles.truck}
        initial={{ x: AWAY_X }}
        animate={{ x: onRoute ? DOCK_X : AWAY_X }}
        transition={
          animationsEnabled
            ? { duration: (onRoute ? DRIVE.in.ms : DRIVE.out.ms) / 1000, ease: (onRoute ? DRIVE.in : DRIVE.out).bezier }
            : { duration: 0 }
        }
        onAnimationStart={rollWheels}
        onAnimationComplete={() => setParked(onRoute)} // hopper only opens once reversed in
        // data-armed rides on the truck so later CSS can react when a note's over the
        // hopper; compactorRef is pointed at the invisible hitbox rect inside the art.
        data-armed={hopperArmed || undefined}>
        <GarbageTruckArt className={styles.art} hitboxRef={compactorRef} />
      </motion.div>
    </div>
  );
}
