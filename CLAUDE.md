# wreckshopmediav2 - Project Instructions

## Creative direction

Deliberately silly, weird, pointless-but-charming. Light cartoon / fluffy / pastel aesthetic
(sailboat-on-a-hill vibe). Weird in behavior, soft and bright in look. When proposing or
building anything, default to the whimsical/over-engineered-for-fun option over the sensible
one. Lean on Motion for playful physics; reuse existing toys (the rants sticky-note drag
engine, the per-route logo FX map).

## Layout: single viewport, no scroll

The site is designed to fit **entirely within one viewport with NO scrolling** on desktop and
tablet, down to roughly **768px**. Each route is one self-contained little viewport - keep it
SO SIMPLE. This is a hard constraint:

- Size layouts to the viewport with `clamp()` + `dvh`/`svh` so nothing overflows at any
  desktop/tablet shape. Never let content push past the fold above ~768px.
- A scrollbar appearing above 768px is a **layout bug to fix**, not something to accept.
- Normal scrolling is only allowed at the mobile breakpoint (~768px and below).
- Exception: some routes may **intentionally force a partial scroll** that nudges the
  nav/menu up or down in space as a deliberate motion effect. That is a controlled effect,
  NOT free overflow - still no scrollbars/overflow above 768px.

## Stack notes

React + TypeScript + Vite + Motion (`motion/react`). Shared UI lives in
`src/components/<Name>/` as a triad: `Name.tsx`, `name.module.css`, `nameIndex.ts` barrel.
Inline SVG (as `motion.svg`/`motion.path`) for anything animated - see `components/Logo`.
