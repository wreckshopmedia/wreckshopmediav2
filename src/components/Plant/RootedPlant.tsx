import type { ComponentProps, CSSProperties } from "react";
import { Plant } from "./Plant";

interface RootedPlantProps extends ComponentProps<typeof Plant> {
  /**
   * How far below the canvas vertical center (50%) the stem BASE roots - i.e. the
   * hill line. Number = px, or any CSS length. Positive = down, negative = up. This
   * is the one knob you tune per surface (it was the old `--hill-drop`).
   */
  drop?: number | string;
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
 * @description A Plant pinned so its stem base roots on a horizontal line at the
 * canvas vertical center plus `drop` - the reusable hill-anchor. Center is the only
 * vertical reference that survives a viewport-height change (the canvas is centered),
 * so this stays put while edges move; `translate: -100%` base-aligns the plant so any
 * `size` roots on the same line. Keeps Plant itself layout-free and CodePen-portable;
 * all other Plant props pass straight through.
 * @author Chris "Mo" Mochinski
 */
export function RootedPlant({ drop = 0, side = "left", offset = 0, ...plant }: RootedPlantProps) {
  const style: CSSProperties = {
    position: "absolute",
    top: "50%",
    translate: `0 calc(-100% + ${len(drop)})`,
    pointerEvents: "none",
  };
  if (side === "right") style.right = len(offset);
  else style.left = len(offset);

  return (
    <div style={style}>
      <Plant {...plant} />
    </div>
  );
}
