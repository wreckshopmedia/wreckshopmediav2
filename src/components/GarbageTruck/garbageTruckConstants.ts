/**
 * @module garbageTruckConstants
 * @description Truck values shared outside the component (SiteLayout's trip home needs
 * the route + drive-off timing). Lives apart from GarbageTruck.tsx so Fast Refresh stays
 * happy - component files may only export components.
 * @author Chris "Mo" Mochinski
 */

// the route the truck is "for" - it reverses in here and drives away on leaving.
export const TRUCK_ROUTE = "/rants";

// the drive curves, shared so the WHEELS can roll on the EXACT same easing + duration
// as the truck body - that's what stops the wheels from outpacing the decelerating
// truck on arrival. bezier kept as a tuple: Motion's transition wants the array form,
// WAAPI wants a cubic-bezier() string (cssBezier in GarbageTruck.tsx).
export const DRIVE = {
  in: { ms: 1200, bezier: [0.22, 0.61, 0.36, 1] as const }, // reverse IN: decelerate to dock
  out: { ms: 950, bezier: [0.5, 0, 0.85, 0.35] as const }, // drive AWAY: accelerate off
};

// SiteLayout's trip home waits this long when leaving /rants so the truck fully clears
// the frame before the layout (and the truck with it) unmounts
export const TRUCK_EXIT_MS = DRIVE.out.ms;
