/**
 * Garbage-truck SVG -> JSX converter.
 *
 * Regenerates src/components/GarbageTruck/GarbageTruckArt.tsx from the raw Figma
 * export (g-truck.svg). Run from the project root after any fresh export:
 *
 *   node scripts/svg2jsx.mjs
 *
 * What it does (the manual-conversion rules, automated + idempotent):
 *   - camelCases every hyphenated SVG attribute name for JSX (fill-rule -> fillRule)
 *   - drops the root width/height, adds a className passthrough, keeps the viewBox
 *   - strips Figma's drop-shadow filter (perf-costly on a moving element, off-style)
 *   - injects the invisible hopper-hitbox rect (Figma culls fully-transparent rects)
 *   - Prettier-formats so every element's attrs wrap onto their own lines (spelunkable)
 *
 * Treat GarbageTruckArt.tsx as GENERATED - re-run this rather than hand-editing it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { format } from "prettier";

const SRC = "src/components/GarbageTruck/g-truck.svg";
const OUT = "src/components/GarbageTruck/GarbageTruckArt.tsx";

let svg = readFileSync(SRC, "utf8").trim();

// strip xml prolog / comments / doctype if any slipped in
svg = svg
  .replace(/<\?xml[\s\S]*?\?>/g, "")
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/<!DOCTYPE[\s\S]*?>/g, "")
  .trim();

// kebab -> camel for ALL hyphenated attribute NAMES (not values, not data-/aria-)
const camel = (s) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
svg = svg.replace(/(\s)([a-zA-Z]+(?:-[a-zA-Z]+)+)=/g, (m, ws, name) => {
  if (/^(data|aria)-/.test(name)) return m; // keep these kebab (JSX allows them)
  return `${ws}${camel(name)}=`;
});

// namespaced colon attrs -> JSX form (defensive; export may not have them)
svg = svg.replace(/\sxlink:href=/g, " xlinkHref=").replace(/\sxml:space=/g, " xmlSpace=");
svg = svg.replace(/\sxmlns:xlink="[^"]*"/g, ""); // React doesn't need the xlink ns decl

// strip the Figma drop-shadow filter: an feGaussianBlur is perf-costly on a moving
// element and off-style for this flat cartoon (depth comes from the black backing).
svg = svg.replace(/\sfilter="url\(#filter0_d[^"]*\)"/g, "");
svg = svg.replace(/<filter\b[^>]*id="filter0_d[\s\S]*?<\/filter>/g, "");

// root <svg ...>: drop fixed width/height, add className passthrough, keep viewBox
svg = svg.replace(/<svg\b([^>]*)>/, (m, attrs) => {
  const cleaned = attrs.replace(/\swidth="[^"]*"/, "").replace(/\sheight="[^"]*"/, "");
  return `<svg className={className}${cleaned}>`;
});

// inject an empty swallow-layer as a sibling JUST BEFORE hopper-group, so tossed-note
// clones (appended at runtime) paint behind the hopper face but in front of the body -
// that's the "note disappears into the hopper" z-trick, via paint order alone.
svg = svg.replace(/(<g id="hopper-group")/, `<g id="swallow-layer" />\n$1`);

// inject the hopper-hitbox as first child of hopper-group (invisible -> paint order
// irrelevant). ref so the rants board can measure it. coords in the 1562x662 viewBox.
svg = svg.replace(
  /(<g id="hopper-group"[^>]*>)/,
  `$1\n<rect id="hopper-hitbox" ref={hitboxRef} x="1120" y="0" width="442" height="600" fillOpacity={0} />`,
);

const file = `import type { Ref } from "react";

interface GarbageTruckArtProps {
  className?: string;
  /** ref onto the invisible hopper-hitbox rect - sticky notes hit-test against this */
  hitboxRef: Ref<SVGRectElement>;
}

/**
 * @description The garbage truck artwork, mechanically converted from the Figma SVG
 * export (g-truck.svg) via scripts/svg2jsx.mjs - attrs camelCased for JSX, root sized
 * via CSS, drop-shadow filter stripped, and an invisible hopper-hitbox rect injected.
 * Group ids (truckbody-group, hopper-group, wheels-group + wheel-*, hopper-lever,
 * window-glass) are preserved so the parent can target them for animation. GENERATED:
 * re-run scripts/svg2jsx.mjs on a fresh export rather than hand-editing this file.
 * @author Chris "Mo" Mochinski
 */
export function GarbageTruckArt({ className, hitboxRef }: GarbageTruckArtProps) {
  return (
${svg}
  );
}
`;

// format so every element's attributes wrap onto their own lines - easy to spelunk,
// and idempotent (re-running the converter always yields the same tidy output).
const pretty = await format(file, { parser: "typescript", printWidth: 100 });
writeFileSync(OUT, pretty);
console.log("wrote", OUT, "(", (pretty.length / 1024).toFixed(0), "KB,", pretty.split("\n").length, "lines )");
