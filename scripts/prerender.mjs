/**
 * @module prerender
 * @description Post-build step: opens every route of the built site in headless Chromium and bakes
 * the rendered page body into that route's HTML file, so text-only fetchers (most AI answer
 * engines) can read real copy instead of an empty `<div id="root">`.
 *
 * The snapshot is wrapped in `.prerender-snapshot`, which index.html hides from paint. React's
 * createRoot swaps it out on boot, so humans see exactly what they saw before (same animations,
 * no flash) while the words are sitting right there in the HTML for anything that reads it.
 *
 * Runs with reduced motion forced so everything is captured in its settled state, and with every
 * non-local request blocked (no GA hits, no live rants baked in from the API).
 *
 * Non-fatal by default: if Chromium can't launch, the site still ships with its per-route heads.
 * Set PRERENDER_STRICT=1 to fail the build instead.
 * @author Chris "Mo" Mochinski
 */
import { execSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(ROOT, "dist");
const STRICT = process.env.PRERENDER_STRICT === "1";
const SHELL_ROOT = '<div id="root"></div>';

/** Extra wait after load so plants finish sprouting and anything async settles. */
const SETTLE_MS = Number(process.env.PRERENDER_SETTLE_MS ?? 1200);

/**
 * @description Launches Chromium, installing the slim headless shell first if it's missing (fresh
 * Netlify build images don't cache Playwright's browsers).
 * @returns {Promise<import("playwright").Browser>} The launched browser.
 */
async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch (error) {
    if (!String(error).includes("Executable doesn't exist")) throw error;
    console.log("[prerender] installing headless chromium (one-time per build machine)...");
    execSync("npx playwright install --only-shell chromium", { stdio: "inherit", cwd: ROOT });
    return chromium.launch();
  }
}

/**
 * @description Maps a route to the HTML file the SEO plugin wrote for it.
 * @param {string} route - Router path like "/about".
 * @returns {string} Absolute file path.
 */
function toFile(route) {
  return path.join(DIST, route === "/" ? "index.html" : `${route.slice(1)}.html`);
}

/**
 * @description Renders one route and returns its #root markup, trimmed for crawlers.
 * @param {import("playwright").Page} page - A prerender-configured page.
 * @param {string} url - Full local URL to load.
 * @returns {Promise<string>} Inner HTML of #root.
 */
async function captureRoot(page, url) {
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(SETTLE_MS);

  return page.evaluate(() => {
    const clone = document.getElementById("root")?.cloneNode(true);
    if (!(clone instanceof HTMLElement)) return "";
    // the truck + icons are ~200KB of path data that no text reader needs, and the snapshot is
    // invisible anyway, so svg and inline motion styles get stripped to keep every page lean
    clone.querySelectorAll("svg").forEach((svg) => svg.remove());
    clone.querySelectorAll("[style]").forEach((el) => el.removeAttribute("style"));
    return clone.innerHTML;
  });
}

/**
 * @description Prerenders every route the SEO plugin emitted, root last.
 * @returns {Promise<void>}
 */
async function main() {
  // the SEO plugin already wrote one html file per route, so the file list IS the route list
  // (and it works on any Node, no .ts import needed). 404.html stays an empty shell on purpose
  const files = await fs.readdir(DIST);
  const routes = files
    .filter((file) => file.endsWith(".html") && file !== "404.html")
    .map((file) => (file === "index.html" ? "/" : `/${file.replace(/\.html$/, "")}`))
    // root goes last: the preview server falls back to index.html, so snapshotting it first
    // would make every later route boot from a modified shell
    .sort((a, b) => Number(a === "/") - Number(b === "/"));

  const server = await preview({ root: ROOT, preview: { port: 4317, strictPort: false }, logLevel: "warn" });
  const origin = server.resolvedUrls?.local[0]?.replace(/\/$/, "");
  if (!origin) throw new Error("vite preview didn't report a local url");

  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    // anything off-box gets dropped: analytics, the rants API, fonts - none of it belongs in a snapshot
    await page.route("**/*", (route) =>
      new URL(route.request().url()).origin === origin ? route.fallback() : route.abort(),
    );

    for (const route of routes) {
      const file = toFile(route);
      const html = await fs.readFile(file, "utf8");
      if (!html.includes(SHELL_ROOT)) throw new Error(`${route}: #root isn't empty, already prerendered?`);

      const markup = await captureRoot(page, `${origin}${route}`);
      const snapshot = `<div id="root"><div class="prerender-snapshot">${markup}</div></div>`;
      await fs.writeFile(file, html.replace(SHELL_ROOT, () => snapshot));
      console.log(`[prerender] ${route.padEnd(10)} ${(Buffer.byteLength(markup) / 1024).toFixed(1)}KB`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

main().catch((error) => {
  console.error(`[prerender] ${STRICT ? "failed" : "skipped (site still ships fine)"}:`, error);
  process.exit(STRICT ? 1 : 0);
});
