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

### Easter eggs are a core value

Mo wants the site stuffed with **funky, weird easter eggs - and it's GOOD if they're rarely
stumbled upon.** Rarity is a feature, not a bug: reward the curious, the wide-screen users, the
people who click the thing nobody clicks. Don't gate delight behind common paths or water gags
down so everyone sees them. When a component has a hidden corner, a rare viewport, or an
overlooked element, that's an invitation - hide something silly there. Keep a running list here
as ideas land, and lean absurd (see the per-route ambitions: each route should do something
weird; rants is the current high-water mark).

### Garbage truck - window photo gag + roll-down (deferred)

The truck's cab window is a standalone `window-glass` group with the black interior behind it,
leaving a slot between them. The gag: drop a **tiny, intentionally-pixelated, ~20-year-old photo**
(inside joke) of a dude's face into that slot. How it works:

- **SVG `<image href>`** holds the photo (inject via `scripts/svg2jsx.mjs`, like the hopper-hitbox
  / swallow-layer - keep it a code/asset concern, not Figma art). `image-rendering: pixelated` so
  the browser never smooths the lo-fi crust (the crustiness is the point).
- **Paint order (back→front):** black interior → photo → glass → window trim/door edge. The glass
  must sit BEHIND the trim so it reads as rolling *into the door*, and the photo sits behind the
  glass so it's revealed as the glass drops.
- **Roll-down:** animate `#window-glass` translateY down (the `WINDOW-GLASS-FRAME` clip tucks it
  into the sill); click rolls it fully, a periodic ~20s low-amplitude peek flashes the face as a
  hint.
- **Naturally rare:** the window's on the cab, and the cab is the half that's cut off on most
  screens (truck docks half-left) - so it's only visible on wide/ultrawide. The rarity is free.

### Toggleable sound effects (absurdity mode)

Add a React sound library (e.g. Howler or use-sound) for optional, **toggle-on** sound effects -
truck engine/reverse beep on the rants route, a satisfying chomp/thunk when a note gets eaten,
etc. Off by default, opt-in for maximum absurdity. Build AFTER the truck visuals + animations are
done. Note: a sound lib is a new dependency, so clear it with Mo before adding.
