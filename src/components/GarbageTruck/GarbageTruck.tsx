import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { useRouteContext } from "../../context/routeContextIndex";
import { useReducedMotion } from "../../context/ReducedMotionContext";
import { useTruck } from "../../context/truckContextIndex";
import { GarbageTruckArt } from "./GarbageTruckArt";
import stevenSrc from "../../assets/steven-no-bg.png";
import hotdogSrc from "../../assets/hotdog-no-bg.png";
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

// the cab-window easter egg: roll #window-glass down (translateY, clipped by its frame so
// it tucks into the sill) to reveal a photo behind it. a full reveal on click, plus a
// randomized periodic "peek" (~halfway, ~1s hold) as a hint. distances in viewBox units
// (window is 136 tall). only visible on wide screens where the cab shows - rarity is free.
const WINDOW_FULL_DROP = 145; // click = full reveal: clears the whole opening

// ---- PEEK TUNING (the auto roll on the cycle) ----
// each is a [min, max] range, randomized per fire so no two peeks are identical. edit freely.
const WINDOW_PEEK_GAP_MS: [number, number] = [12_000, 22_000]; // wait BETWEEN peeks
const WINDOW_PEEK_DROP: [number, number] = [60, 76]; // how far down (~halfway of 136 = eyes)
const WINDOW_PEEK_DOWN_MS: [number, number] = [340, 460]; // roll-DOWN duration
const WINDOW_PEEK_HOLD_MS: [number, number] = [900, 1200]; // *** the PAUSE at the bottom ***
const WINDOW_PEEK_UP_MS: [number, number] = [340, 460]; // roll-UP duration

// ---- CLICK TUNING (the full reveal) ---- fixed ms, no jitter: down, pause, up.
const WINDOW_FULL_DOWN_MS = 560;
const WINDOW_FULL_HOLD_MS = 1100; // the PAUSE at the bottom on a click (shorter than before)
const WINDOW_FULL_UP_MS = 620;

// after a roll finishes (glass back up), how long before it's clickable / auto-peekable
// again - a small cooldown that kills spam-clicks and back-to-back rolls.
const WINDOW_COOLDOWN_MS = 400;

// the photos that randomly alternate in the window. the swap only happens while the glass
// is UP (hidden), so the change is never seen mid-reveal - just snaps behind closed glass.
// drop more in src/assets and add them here.
const WINDOW_PHOTOS = [stevenSrc, hotdogSrc];

/** @description Random float in a [min, max] range. Jitters the peek's timing + depth. */
const rand = ([min, max]: [number, number]) => min + Math.random() * (max - min);

/**
 * @description Rolls the cab window glass down by `drop` (viewBox units), holds, and rolls
 * back up. linear easing reads like a mechanical crank. timing is explicit so each peek
 * can be jittered and the click can get a longer, fuller reveal.
 */
function rollWindow(glass: Element, drop: number, downMs: number, holdMs: number, upMs: number) {
  const total = downMs + holdMs + upMs;
  return glass.animate(
    [
      { transform: "translateY(0)" },
      { transform: `translateY(${drop}px)`, offset: downMs / total },
      { transform: `translateY(${drop}px)`, offset: (downMs + holdMs) / total },
      { transform: "translateY(0)" },
    ],
    { duration: total, easing: "linear" },
  );
}

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

// whole turns the wheels roll across one drive (integer so each ends back at its rest
// offset). more turns = faster spin; tune to taste.
const WHEEL_TURNS = 3;

// each wheel rests at its own angle so the spokes aren't showroom-aligned. the offset is
// baked into the roll keyframes (start AND end here) and held via commitStyles - so it
// all lives in the `transform` property. that's the snap fix: there's no separate CSS
// `rotate` for the WAAPI transform to fight on the way in/out.
const WHEELS = [
  { sel: "#wheel-front", rest: 17 },
  { sel: "#wheel-mid", rest: -29 },
  { sel: "#wheel-rear", rest: 53 },
];

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
  // true while the window glass is mid-roll OR in its post-roll cooldown. the single guard
  // that prevents click/auto-peek collisions, spam clicks, and clicking while it's down.
  const windowBusyRef = useRef(false);

  // the photo currently behind the cab window. swapped (while the glass is up) by the peek
  // loop below so it randomly alternates without a visible snap mid-reveal.
  const [windowPhoto, setWindowPhoto] = useState(WINDOW_PHOTOS[0]);

  // preload all window photos so the first swap to a not-yet-shown one is instant (no flash
  // of an unloaded image when the glass rolls down on it).
  useEffect(() => {
    WINDOW_PHOTOS.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // roll the wheels through WHEEL_TURNS full turns on the SAME curve/duration as the
  // drive, so they decelerate with the truck (arrival) / accelerate with it (leaving)
  // instead of spinning at a constant rate and snap-stopping. integer turns end where
  // they began, so it clears seamlessly. fired from the drive's onAnimationStart.
  const rollWheels = () => {
    if (!animationsEnabled) return;
    const phase = onRoute ? DRIVE.in : DRIVE.out;
    const dir = onRoute ? 1 : -1;
    for (const { sel, rest } of WHEELS) {
      const wheel = truckRef.current?.querySelector(sel);
      if (!wheel) continue;
      const anim = wheel.animate(
        [
          { transform: `rotate(${rest}deg)` },
          { transform: `rotate(${rest + dir * WHEEL_TURNS * 360}deg)` },
        ],
        { duration: phase.ms, easing: cssBezier(phase.bezier), fill: "forwards" },
      );
      // bake the held end (visually = the rest offset) into inline style, then drop the
      // animation - so it persists without snapping to 0 and without animations piling up.
      anim.onfinish = () => {
        anim.commitStyles();
        anim.cancel();
      };
    }
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

  // cab-window easter egg. click = full reveal. while parked on /rants, a peek fires on a
  // randomized 12-22s gap (so it's not metronomic), rolling ~halfway with a jittered ~1s
  // hold to flash the eyes. just BEFORE each peek - while the glass is still up - we swap to
  // a random photo, so the alternation is hidden and only ever revealed already-changed.
  useEffect(() => {
    const root = truckRef.current;
    const frame = root?.querySelector<SVGGElement>("#WINDOW-GLASS-FRAME");
    if (!root || !frame || !animationsEnabled) return;

    // start clean (in case we re-entered /rants mid-roll from a prior visit)
    windowBusyRef.current = false;
    frame.style.pointerEvents = "auto";

    let peekTimer: number | undefined;

    // run one roll (down/hold/up) behind the busy guard. while busy: ref blocks new rolls
    // AND pointer-events:none makes the window physically un-clickable (the click can't even
    // fire). on the way back UP the photo swaps (hidden behind closed glass), then a short
    // cooldown lifts the lock and fires onDone.
    const doRoll = (drop: number, downMs: number, holdMs: number, upMs: number, onDone: () => void) => {
      const glass = root.querySelector("#window-glass");
      if (!glass || windowBusyRef.current) return;
      windowBusyRef.current = true;
      frame.style.pointerEvents = "none";
      const anim = rollWindow(glass, drop, downMs, holdMs, upMs);
      anim.onfinish = () => {
        // glass is fully up (covering) - swap to a DIFFERENT photo now, unseen, for next time
        setWindowPhoto((prev) => {
          const others = WINDOW_PHOTOS.filter((p) => p !== prev);
          return others[Math.floor(Math.random() * others.length)] ?? prev;
        });
        window.setTimeout(() => {
          windowBusyRef.current = false;
          frame.style.pointerEvents = "auto";
          onDone();
        }, WINDOW_COOLDOWN_MS);
      };
    };

    // the auto peek: wait a random gap, then (if idle) roll a jittered half-peek. the photo
    // swap happens on the roll-UP (in doRoll), so it's always hidden. reschedules itself.
    const scheduleNextPeek = () => {
      peekTimer = window.setTimeout(() => {
        if (windowBusyRef.current) {
          scheduleNextPeek(); // busy right now - just wait another gap
          return;
        }
        doRoll(
          rand(WINDOW_PEEK_DROP),
          rand(WINDOW_PEEK_DOWN_MS),
          rand(WINDOW_PEEK_HOLD_MS),
          rand(WINDOW_PEEK_UP_MS),
          scheduleNextPeek,
        );
      }, rand(WINDOW_PEEK_GAP_MS));
    };

    // manual click = full reveal. ignored while busy (no spam, no click-while-down). it
    // cancels the pending auto-peek and, when done, restarts the peek cadence fresh from now
    // - so an auto-roll never piles onto your manual one.
    const onClick = () => {
      if (windowBusyRef.current) return;
      if (peekTimer) clearTimeout(peekTimer);
      doRoll(WINDOW_FULL_DROP, WINDOW_FULL_DOWN_MS, WINDOW_FULL_HOLD_MS, WINDOW_FULL_UP_MS, scheduleNextPeek);
    };

    frame.addEventListener("click", onClick);
    if (onRoute) scheduleNextPeek();

    return () => {
      frame.removeEventListener("click", onClick);
      if (peekTimer) clearTimeout(peekTimer);
    };
  }, [onRoute, animationsEnabled]);

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
        <GarbageTruckArt className={styles.art} hitboxRef={compactorRef} photoSrc={windowPhoto} />
      </motion.div>
    </div>
  );
}
