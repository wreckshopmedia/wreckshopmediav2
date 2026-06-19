import { useEffect, useRef, useState } from "react";
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

// parked x: shifted half its own width off the stage's left edge so the FRONT (cab)
// half hangs off-screen and only the rear + hopper show. on small/moderate screens
// the stage hugs the viewport, so this reads as "cut in half by the left edge." on
// ultrawide the stage anchors to the inset content edge, so the front progressively
// reveals into the growing left margin. tune this to move the cut line (0% = fully in).
const DOCK_X = "-50%";

// off-screen staging x: far enough left to clear the side margin on ANY monitor width
// (50vw always exceeds half the leftover margin), so the truck fully hides before driving.
const AWAY_X = "calc(-100% - 50vw)";

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
  const { compactorRef, setParked, hopperArmed, ingestNonce } = useTruck();

  const onRoute = pathname === TRUCK_ROUTE;
  const [driving, setDriving] = useState(false);
  const truckRef = useRef<HTMLDivElement>(null);

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
  }, [ingestNonce, animationsEnabled]);

  return (
    <div className={styles.stage} aria-hidden>
      <motion.div
        ref={truckRef}
        className={styles.truck}
        data-driving={driving || undefined}
        // heading drives wheel-spin direction: "in" rolls right (reversing in), "out"
        // rolls left (driving away). CSS flips the animation direction off this.
        data-heading={onRoute ? "in" : "out"}
        initial={{ x: AWAY_X }}
        animate={{ x: onRoute ? DOCK_X : AWAY_X }}
        transition={
          animationsEnabled
            ? onRoute
              ? // reverse IN: carry momentum, decelerate to a stop at the dock (ease-out)
                { duration: 1.2, ease: [0.22, 0.61, 0.36, 1] }
              : // drive AWAY: ease-IN so it pulls off slow then accelerates out, no snap
                { duration: 0.95, ease: [0.5, 0, 0.85, 0.35] }
            : { duration: 0 }
        }
        onAnimationStart={() => setDriving(true)}
        onAnimationComplete={() => {
          setDriving(false);
          setParked(onRoute); // hopper only opens once fully reversed in
        }}
        // data-armed rides on the truck so later CSS can react when a note's over the
        // hopper; compactorRef is pointed at the invisible hitbox rect inside the art.
        data-armed={hopperArmed || undefined}>
        <GarbageTruckArt className={styles.art} hitboxRef={compactorRef} />
      </motion.div>
    </div>
  );
}
