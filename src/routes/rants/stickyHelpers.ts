import type { Rant } from "../../hooks/useRants";

// the 5-color cycle. defined as theme vars in index.css (single source of truth).
// order + length must match the server's PALETTE_SIZE so stored indices line up.
export const NOTE_COLORS = [
  "var(--sticky-note-yellow)",
  "var(--sticky-note-red)",
  "var(--sticky-note-green)",
  "var(--sticky-note-blue)",
  "var(--sticky-note-peach)",
] as const;

/** @description Clamps a number into the inclusive [lo, hi] range. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** @description Positive modulo so negative inputs still wrap into 0..n-1. */
export function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/** @description Cheap stable hash of a rant id - sums char codes. */
export function hashId(id: string): number {
  return id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

/** @description True if a page-space point falls inside the given element's box. */
export function pointInRect(x: number, y: number, rect: DOMRect | undefined): boolean {
  if (!rect) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * @description A rant's palette index. Uses the color locked at creation; for
 * legacy rows with none, derives it from the numeric id (monotonic + stable) so
 * it never shifts when other notes are deleted.
 */
export function colorIndexFor(rant: Rant): number {
  if (rant.colorIndex != null) return rant.colorIndex;
  const n = parseInt(rant.id, 10);
  return Number.isFinite(n) ? mod(n, NOTE_COLORS.length) : 0;
}

/**
 * @description Deterministic fallback placement for a rant that has never been
 * dropped (no stored pos). Same id always lands in the same spot/tilt so unplaced
 * notes don't jump on re-render. Returns 0-1 fractions of the canvas.
 */
export function seededLayout(id: string) {
  const h = hashId(id);
  return {
    xFrac: 0.06 + ((h * 7) % 70) / 100, // 0.06 - 0.76
    yFrac: 0.06 + ((h * 13) % 64) / 100, // 0.06 - 0.70
    tilt: (h % 13) - 6, // -6deg .. +6deg
  };
}
