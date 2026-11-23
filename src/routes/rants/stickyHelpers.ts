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

/**
 * @description The CSS var name of the pencil color for a given note background. The red
 * note gets a darker pencil since the default ink washes out on it at low opacity.
 */
export function inkFor(color: string): string {
  return color === NOTE_COLORS[1] ? "--color-text-sticky-note-red" : "--color-text-sticky-note";
}

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

/* ------------ NOTE TEXT SIZING ------------ */
/* shared by placed notes AND the compose pad, so what you type previews how the note
   will look once it's stuck. TODO revisit font sizes when more done */

/** @description Picks a font-size for the note text based on rant length. */
export function noteFontSize(len: number): string {
  if (len <= 12) return "30cqi"; // super short - go big
  if (len <= 30) return "21cqi";
  if (len <= 80) return "13cqi";
  if (len <= 140) return "11cqi";
  return "9.5cqi";
}

/**
 * @description Note text opacity change based on rant length.
 * shorter text = more see-through
 */
export function noteOpacity(len: number): number {
  if (len <= 12) return 0.7;
  if (len <= 30) return 0.8;
  if (len <= 80) return 0.9;
  if (len <= 140) return 1;
  return 1;
}

// the author signature tracks the body-text opacity but sits this much fainter at every
// length, so the name always reads a quiet step behind the rant itself.
const AUTHOR_OPACITY_OFFSET = 0.2;

/** @description Author signature opacity - the body-text opacity, a touch more see-through. */
export function noteAuthorOpacity(len: number): number {
  return noteOpacity(len) - AUTHOR_OPACITY_OFFSET;
}

/** @description Picks a line-height for the note text based on rant length. */
export function noteLineHeight(len: number): string {
  if (len <= 12) return "0.9em";
  if (len <= 30) return "1em";
  if (len <= 80) return "1em";
  if (len <= 140) return "1em";
  return "1.125em";
}

/**
 * @description Some typefaces are getting cut off on the edges. Larger = a little
 * padding, small = not needed. This is probably partially due to dynamic line
 * height. Note that this is INNER padding (on the text element itself).
 * > 🚗 PARKED, may need adjustments later but, for now, ret 0
 */
export function noteInnerPadding(len: number): string {
  if (len <= 12) return "0";
  if (len <= 30) return "0";
  if (len <= 80) return "0";
  if (len <= 140) return "0";
  return "0";
}
