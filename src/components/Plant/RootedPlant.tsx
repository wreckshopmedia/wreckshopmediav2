import { useLayoutEffect, useRef, useState, type ComponentProps, type CSSProperties } from "react";
import { getHillSurfaceY } from "../Logo/hillSurface";
import { Plant } from "./Plant";

interface RootedPlantProps extends ComponentProps<typeof Plant> {
  /**
   * Fallback only: how far below the canvas vertical center (50%) to root when the hill
   * can't be measured (logo not mounted, or the plant sits past the hill's ends). Number =
   * px, or any CSS length. Normally the plant roots on the measured hill line instead.
   */
  drop?: number | string;
  /**
   * Px to bury the stem base below the hill line. Plant's stem starts a few px above its
   * box bottom, so a small positive sink plants it IN the ground instead of on it.
   */
  sink?: number;
  /** Which edge the horizontal `offset` is measured from. */
  side?: "left" | "right";
  /** Horizontal distance from `side` to place the plant. Number = px, or any CSS length. */
  offset?: number | string;
}

/** @description Number -> px string; string passes straight through. */
function len(v: number | string): string {
  return typeof v === "number" ? `${v}px` : v;
}

/**
 * @description A Plant whose stem base roots exactly on the logo's flattened hill line at
 * its own x position. The hill is a wide dome, not a flat line, so a fixed drop floats
 * plants near the edges - this samples the real curve and re-measures on resize and
 * font load. Falls back to canvas center + `drop` if the hill can't be found. Keeps
 * Plant itself layout-free and CodePen-portable; other Plant props pass straight through.
 * @author Chris "Mo" Mochinski
 */
export function RootedPlant({
  drop = 0,
  sink = 3,
  side = "left",
  offset = 0,
  ...plant
}: RootedPlantProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [rootTop, setRootTop] = useState<number | null>(null);

  // layout effect so the measured spot lands before first paint - no hop from the fallback
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    /** @description Re-roots the plant on the hill line under its horizontal center. */
    const measure = () => {
      const parent = el.offsetParent;
      if (!parent) return;
      const box = el.getBoundingClientRect();
      const hillY = getHillSurfaceY(box.left + box.width / 2);
      setRootTop(hillY == null ? null : hillY - parent.getBoundingClientRect().top + sink);
    };

    measure();
    // viewport resizes move everything (nav font is cqi-sized, so the cluster shifts too);
    // fonts.ready catches the nav row growing once the webfont swaps in
    window.addEventListener("resize", measure);
    let alive = true;
    void document.fonts.ready.then(() => alive && measure());
    return () => {
      alive = false;
      window.removeEventListener("resize", measure);
    };
  }, [sink]);

  const style: CSSProperties = {
    position: "absolute",
    pointerEvents: "none",
    ...(rootTop == null
      ? { top: "50%", translate: `0 calc(-100% + ${len(drop)})` }
      : { top: `${rootTop}px`, translate: "0 -100%" }),
  };
  if (side === "right") style.right = len(offset);
  else style.left = len(offset);

  return (
    <div ref={ref} style={style}>
      <Plant {...plant} />
    </div>
  );
}
