/**
 * @description Tiny GA4 loader. Injects gtag.js only in production builds with a measurement
 * ID set, so local dev never pollutes the numbers. SPA route changes are tracked by GA4's
 * enhanced measurement (history events), so there's no per-route wiring needed.
 * @author Chris "Mo" Mochinski
 */

const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const OPT_OUT_KEY = "wsm-no-track";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

/**
 * @description Reads (and updates) the per-browser opt-out. Visiting any page with `?notrack`
 * sets it, `?track` clears it - so Mo can exclude his own devices from the stats.
 */
function isOptedOut(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has("notrack")) localStorage.setItem(OPT_OUT_KEY, "1");
    if (params.has("track")) localStorage.removeItem(OPT_OUT_KEY);
    return localStorage.getItem(OPT_OUT_KEY) === "1";
  } catch {
    // storage blocked (private mode, etc) - just track normally
    return false;
  }
}

/**
 * @description Boots GA4 if we're in a prod build, have an ID, and this browser hasn't opted
 * out. Call once at startup; safe no-op otherwise.
 */
export function initAnalytics(): void {
  if (!import.meta.env.PROD || !MEASUREMENT_ID || isOptedOut()) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  // gtag.js needs the real `arguments` object pushed, not an array - classic Google weirdness
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params -- gtag.js only accepts Arguments objects
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", MEASUREMENT_ID);
}
