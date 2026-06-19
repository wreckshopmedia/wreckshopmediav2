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

## Ideas & to-do

Running list of intentions for the site - not yet built, don't lose these.

### The "things" vs "stuff" routes

The route names `things` and `stuff` are deliberately vague and Mo does not care that they're
misleading. One becomes **personal projects** (just a few examples, not exhaustive); the other
becomes a page about **what Mo uses and is proficient in** (tech/tools). Which name maps to
which page is **TBD** - decide later, don't assume.

### Credits & attributions section (on the "what I use" page)

Most of the site is original art, assets, and ideas, but Mo does use some tools and takes some
inspiration. The tech/proficiency page needs a small **credits & attributions** section to
acknowledge those. Keep a running list as components borrow ideas:

- **Plant component** - inspired by a CodePen project by **@Jimtonik** (https://codepen.io/Jimtonik).

Add to this list whenever a component leans on someone else's work, and surface it all in that
credits section when the page gets built.

### Garbage truck - window photo gag (deferred)

The garbage truck (rants route trash mechanic) has the cab window built as a standalone
`window-glass` group with the black interior behind it, leaving a slot between them. Mo wants to
drop a **tiny, intentionally-pixelated, ~20-year-old photo** (an inside joke with friends) into
that window space at some point - maybe triggered by some action. When building: render it in the
black-to-glass gap and set `image-rendering: pixelated` so the browser never smooths the lo-fi
look (the crustiness is the point). The window "roll-down" animation is still undecided.

### Toggleable sound effects (absurdity mode)

Add a React sound library (e.g. Howler or use-sound) for optional, **toggle-on** sound effects -
truck engine/reverse beep on the rants route, a satisfying chomp/thunk when a note gets eaten,
etc. Off by default, opt-in for maximum absurdity. Build AFTER the truck visuals + animations are
done. Note: a sound lib is a new dependency, so clear it with Mo before adding.
