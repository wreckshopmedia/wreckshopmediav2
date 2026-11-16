/** Per-route fade/fog for the boat + tree only - the hill/ground never gets touched. */
export interface LogoContentFx {
  opacity: number;
  /** blur radius in SVG viewBox units (~2 units per screen px at the nav size) */
  blur: number;
}

export const DEFAULT_LOGO_CONTENT_FX: LogoContentFx = { opacity: 1, blur: 0 };

// figma re-exported the art on a padded canvas, so this crops back to the original 381x615
// frame (min-x, min-y, width, height). hillSurface.ts maps screen coords through this too
export const LOGO_VIEWBOX = [40.03, 13.52, 381, 615] as const;

export const HILL_SCALE_X = 5; // how wide the hill spreads during the flatten
export const HILL_SCALE_Y = 0.25; // how flat the hill gets
export const HILL_ORIGIN_Y = 0.2; // flatten pivot, as a fraction of the hill's height
