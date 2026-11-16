import { HILL_ORIGIN_Y, HILL_SCALE_X, HILL_SCALE_Y, LOGO_VIEWBOX } from "./logoConstants";

const SAMPLE_COUNT = 240;

interface Pt {
  x: number;
  y: number;
}

// the hill's top curve in raw SVG user space - the art never changes, so sample it once
let cachedSurface: { path: SVGPathElement; pts: Pt[]; bbox: DOMRect } | null = null;

/**
 * @description Samples the hill path's top curve (skipping the flat base edge) in SVG user
 * space, sorted left to right. Cached per path element so remounts re-sample once.
 * @author Chris "Mo" Mochinski
 */
function sampleSurface(path: SVGPathElement): { pts: Pt[]; bbox: DOMRect } {
  if (cachedSurface?.path === path) return cachedSurface;
  const bbox = path.getBBox();
  const baseY = bbox.y + bbox.height - 0.5;
  const total = path.getTotalLength();
  const pts: Pt[] = [];
  for (let i = 0; i <= SAMPLE_COUNT; i++) {
    const p = path.getPointAtLength((total * i) / SAMPLE_COUNT);
    if (p.y < baseY) pts.push({ x: p.x, y: p.y }); // base edge is the hidden bottom, skip it
  }
  pts.sort((a, b) => a.x - b.x);
  cachedSurface = { path, pts, bbox };
  return cachedSurface;
}

/**
 * @description Screen-space y (client px) of the flattened hill's line at a given client x,
 * or null when the logo isn't mounted or x falls past the hill's ends. Only valid while the
 * hill is flat (every SiteLayout route). The flatten transform is rebuilt from the same
 * constants Logo animates with rather than read back from the DOM, since Safari is flaky
 * about reporting CSS transforms on inner SVG elements.
 * @author Chris "Mo" Mochinski
 */
export function getHillSurfaceY(clientX: number): number | null {
  const svg = document.getElementById("logo-svg");
  const path = svg?.querySelector<SVGPathElement>("#HILL path");
  if (!svg || !path) return null;

  const { pts, bbox } = sampleSurface(path);
  const [vbX, vbY, vbW, vbH] = LOGO_VIEWBOX;
  const rect = svg.getBoundingClientRect();

  // default preserveAspectRatio (xMidYMid meet) - uniform scale, centered leftover space
  const scale = Math.min(rect.width / vbW, rect.height / vbH);
  const offX = rect.left + (rect.width - vbW * scale) / 2;
  const offY = rect.top + (rect.height - vbH * scale) / 2;

  // transform-box: fill-box pivot, matching Logo's originX 50% / originY HILL_ORIGIN_Y
  const ox = bbox.x + bbox.width / 2;
  const oy = bbox.y + bbox.height * HILL_ORIGIN_Y;
  const toScreen = (p: Pt): Pt => ({
    x: offX + (ox + (p.x - ox) * HILL_SCALE_X - vbX) * scale,
    y: offY + (oy + (p.y - oy) * HILL_SCALE_Y - vbY) * scale,
  });

  for (let i = 1; i < pts.length; i++) {
    const a = toScreen(pts[i - 1]);
    const b = toScreen(pts[i]);
    if (clientX >= a.x && clientX <= b.x) {
      const t = b.x === a.x ? 0 : (clientX - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * t;
    }
  }
  return null;
}
