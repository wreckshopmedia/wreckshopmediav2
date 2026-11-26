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
   will look once it's stuck. one table so size, line-height and ink fade always step
   together. no giant tier anymore - the top tier is the biggest text ever gets, and the
   steps are small so a note doesn't shrink and then sit there half empty. */

interface NoteTextTier {
  /** inclusive max rant length for this tier */
  maxLen: number;
  fontSize: string;
  lineHeight: string;
  opacity: number;
  /** inner padding on the text element - parked at 0, see noteInnerPadding */
  padding: string;
}

const NOTE_TEXT_TIERS: readonly NoteTextTier[] = [
  { maxLen: 28, fontSize: "21cqi", lineHeight: "1em", opacity: 0.8, padding: "0" },
  { maxLen: 50, fontSize: "17cqi", lineHeight: "1em", opacity: 0.85, padding: "0" },
  { maxLen: 80, fontSize: "14.5cqi", lineHeight: "1em", opacity: 0.9, padding: "0" },
  { maxLen: 115, fontSize: "12.5cqi", lineHeight: "1em", opacity: 0.95, padding: "0" },
  // smallest size new rants ever get - the pad caps input at 165 (MAX_RANT_LENGTH)
  { maxLen: 165, fontSize: "11.5cqi", lineHeight: "1em", opacity: 1, padding: "0" },
  // legacy only: rants posted back when the cap was 200, so they don't clip
  { maxLen: Infinity, fontSize: "10cqi", lineHeight: "1.05em", opacity: 1, padding: "0" },
];

/** @description The sizing tier a rant of this length falls into. */
function noteTextTier(len: number): NoteTextTier {
  return NOTE_TEXT_TIERS.find((t) => len <= t.maxLen) ?? NOTE_TEXT_TIERS[NOTE_TEXT_TIERS.length - 1];
}

/** @description Picks a font-size for the note text based on rant length. */
export function noteFontSize(len: number): string {
  return noteTextTier(len).fontSize;
}

/** @description Note text opacity based on rant length - shorter, bigger text reads fainter. */
export function noteOpacity(len: number): number {
  return noteTextTier(len).opacity;
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
  return noteTextTier(len).lineHeight;
}

/**
 * @description Some typefaces are getting cut off on the edges. Larger = a little
 * padding, small = not needed. This is probably partially due to dynamic line
 * height. Note that this is INNER padding (on the text element itself).
 * > 🚗 PARKED, may need adjustments later but, for now, every tier is 0
 */
export function noteInnerPadding(len: number): string {
  return noteTextTier(len).padding;
}
