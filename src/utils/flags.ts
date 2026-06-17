/**
 * @description Local-only dev flags, read from Vite env (the VITE_* vars in
 * .env.local, which is gitignored via *.local). Each flag is a plain boolean -
 * the literal string "true" turns it on, anything else is off. Vite inlines these
 * at build time, so flipping one means restarting the dev server. Production builds
 * never define them, so every flag defaults off in the wild.
 * @author Chris "Mo" Mochinski
 */

/** @description Reads a VITE_ env string as a boolean - only the literal "true" is on. */
function flag(value: string | undefined): boolean {
  return value === "true";
}

/**
 * Tomato-tints the layout bounds (#site-layout / #nav-anchor / #main) so absolute
 * placement is visible at a glance. Reflected onto <html> by applyDevFlags below,
 * then styled globally in index.css.
 */
export const DEBUG_BOUNDS = flag(import.meta.env.VITE_DEBUG_BOUNDS);

/**
 * @description Reflects the active dev flags onto the document root as data-*
 * attributes so global CSS can react to them. Call once at startup. Flags that are
 * off simply leave their attribute absent, so the CSS never matches.
 */
export function applyDevFlags(): void {
  document.documentElement.toggleAttribute("data-debug-bounds", DEBUG_BOUNDS);
}
