/**
 * @module viteSeoPlugin
 * @description Build-time SEO for a client-only SPA, no headless browser needed. Crawlers and
 * answer engines that skip JavaScript still get the right head for every route:
 *
 * - `index.html` gets the root route's tags (also in dev, between the seo markers)
 * - every other route gets its own `dist/<route>.html` copy of the shell with its own head.
 *   Netlify serves `about.html` at `/about` before the `_redirects` SPA fallback kicks in
 * - `404.html` + a generated `_redirects` give unknown URLs a real 404 status
 * - `sitemap.xml`, `robots.txt` and `llms.txt` are generated from the same config
 *
 * The page body gets baked in afterwards by scripts/prerender.mjs (Playwright).
 * @author Chris "Mo" Mochinski
 */
import fs from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig } from "vite";
import {
  LLMS_FACTS,
  NOT_FOUND_SEO,
  OG_IMAGE,
  OG_IMAGE_ALT,
  ORGANIZATION,
  PERSON,
  ROUTE_SEO,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_URL,
  X_HANDLE,
  toCanonicalUrl,
  type RouteSeo,
} from "../src/seo/seoConfig";

const HEAD_MARKER = "<!-- seo:head -->";
const BLOCK_START = "<!-- seo:start -->";
const BLOCK_END = "<!-- seo:end -->";
const BLOCK_PATTERN = /<!-- seo:start -->[\s\S]*?<!-- seo:end -->/;

/**
 * @description AI crawlers we explicitly welcome. `User-agent: *` already allows them, but naming
 * them documents intent and survives someone later adding a blanket disallow above.
 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "MistralAI-User",
];

/**
 * @description Escapes a string for use inside a double-quoted HTML attribute or text node.
 * @param value - Raw text.
 * @returns HTML-safe text.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * @description Builds the schema.org graph for a route: WebSite + Organization + Person are the
 * same on every page, plus one page node that ties them together.
 * @param route - The route being rendered.
 * @returns The JSON-LD object.
 */
function buildJsonLd(route: RouteSeo): Record<string, unknown> {
  const personId = `${SITE_URL}/#person`;
  const orgId = `${SITE_URL}/#organization`;
  const siteId = `${SITE_URL}/#website`;
  const url = toCanonicalUrl(route.path);

  const page: Record<string, unknown> = {
    "@type": route.pageType,
    "@id": `${url}#webpage`,
    url,
    name: route.title,
    description: route.description,
    isPartOf: { "@id": siteId },
    inLanguage: "en-US",
  };
  // ProfilePage is what Google wants for a page that's about one person
  if (route.pageType === "ProfilePage") page.mainEntity = { "@id": personId };
  else page.about = { "@id": orgId };

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": siteId,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        description: SITE_DESCRIPTION,
        publisher: { "@id": orgId },
        inLanguage: "en-US",
      },
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        description: SITE_DESCRIPTION,
        foundingDate: ORGANIZATION.foundingDate,
        email: PERSON.email,
        founder: { "@id": personId },
        sameAs: ORGANIZATION.sameAs,
      },
      {
        "@type": "Person",
        "@id": personId,
        name: PERSON.name,
        alternateName: PERSON.alternateName,
        jobTitle: PERSON.jobTitle,
        email: `mailto:${PERSON.email}`,
        url: toCanonicalUrl("/about"),
        sameAs: PERSON.sameAs,
        knowsAbout: PERSON.knowsAbout,
        worksFor: { "@id": orgId },
      },
      page,
    ],
  };
}

/**
 * @description Renders every head tag for one route.
 * @param route - The route being rendered.
 * @param hasOgImage - Whether the share image exists in public/.
 * @returns The HTML block, wrapped in seo markers so later passes can swap it.
 */
function buildHead(route: RouteSeo, hasOgImage: boolean): string {
  const isNotFound = route === NOT_FOUND_SEO;
  const url = toCanonicalUrl(route.path);
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  // `<` inside a script tag would let page copy close it early, so unicode-escape it
  const jsonLd = JSON.stringify(buildJsonLd(route)).replace(/</g, "\\u003c");

  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta name="robots" content="${route.index ? "index, follow, max-image-preview:large" : "noindex, follow"}" />`,
    `<meta property="og:type" content="${route.pageType === "ProfilePage" ? "profile" : "website"}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta name="twitter:card" content="${hasOgImage ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:site" content="${X_HANDLE}" />`,
    `<meta name="twitter:creator" content="${X_HANDLE}" />`,
    `<meta name="twitter:title" content="${title}" />`,
    `<meta name="twitter:description" content="${description}" />`,
  ];

  // a 404 has no single url to claim, so it skips canonical + og:url (the runtime hook agrees)
  if (!isNotFound) {
    tags.splice(2, 0, `<link rel="canonical" href="${url}" />`);
    tags.push(`<meta property="og:url" content="${url}" />`);
  }

  if (hasOgImage) {
    const image = `${SITE_URL}${OG_IMAGE.path}`;
    tags.push(
      `<meta property="og:image" content="${image}" />`,
      `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
      `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
      `<meta property="og:image:alt" content="${escapeHtml(OG_IMAGE_ALT)}" />`,
      `<meta name="twitter:image" content="${image}" />`,
    );
  }

  if (!isNotFound) tags.push(`<script type="application/ld+json">${jsonLd}</script>`);
  return [BLOCK_START, ...tags, BLOCK_END].join("\n    ");
}

/**
 * @description sitemap.xml for indexable routes only. Google ignores priority/changefreq these
 * days, so it's just loc + lastmod.
 * @param lastmod - ISO date stamped on every entry (build day).
 * @returns The XML document.
 */
function buildSitemap(lastmod: string): string {
  const urls = ROUTE_SEO.filter((route) => route.index)
    .map((route) => `  <url><loc>${toCanonicalUrl(route.path)}</loc><lastmod>${lastmod}</lastmod></url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/**
 * @description robots.txt: everyone welcome, AI crawlers named on purpose, sitemap linked.
 * @returns The robots.txt body.
 */
function buildRobots(): string {
  const aiBlocks = AI_CRAWLERS.map((bot) => `User-agent: ${bot}\nAllow: /`).join("\n\n");
  return `# answer engines very welcome here, come on in\nUser-agent: *\nAllow: /\n\n${aiBlocks}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

/**
 * @description llms.txt (llmstxt.org): a plain markdown briefing for LLMs that won't run our JS.
 * @returns The markdown body.
 */
function buildLlmsTxt(): string {
  const pages = ROUTE_SEO.filter((route) => route.index)
    .map((route) => `- [${route.label}](${toCanonicalUrl(route.path)}): ${route.description}`)
    .join("\n");
  const elsewhere = [...PERSON.sameAs, ...ORGANIZATION.sameAs].map((url) => `- ${url}`).join("\n");

  return [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    "The site is an intentionally playful, animation-heavy React single-page app, so this file is",
    "the fastest plain-text summary of who and what it's about.",
    "",
    "## Key facts",
    "",
    LLMS_FACTS.map((fact) => `- ${fact}`).join("\n"),
    "",
    "## Pages",
    "",
    pages,
    "",
    "## Elsewhere",
    "",
    elsewhere,
    "",
  ].join("\n");
}

/**
 * @description Vite plugin that wires up all of the above.
 * @returns The plugin.
 */
export function seoPlugin(): Plugin {
  let config: ResolvedConfig;
  let hasOgImage = false;
  const rootRoute = ROUTE_SEO.find((route) => route.path === "/");
  if (!rootRoute) throw new Error("seoConfig needs a '/' entry");

  return {
    name: "wreckshop-seo",

    configResolved(resolved) {
      config = resolved;
      hasOgImage = fs.existsSync(path.join(resolved.publicDir, OG_IMAGE.path));
    },

    transformIndexHtml(html) {
      if (!html.includes(HEAD_MARKER)) throw new Error(`index.html is missing ${HEAD_MARKER}`);
      return html.replace(HEAD_MARKER, () => buildHead(rootRoute, hasOgImage));
    },

    closeBundle() {
      // closeBundle also fires in dev for some setups - only write files for real builds
      if (config.command !== "build") return;
      const outDir = path.resolve(config.root, config.build.outDir);
      const shell = fs.readFileSync(path.join(outDir, "index.html"), "utf8");

      for (const route of ROUTE_SEO) {
        if (route.path === "/") continue;
        const html = shell.replace(BLOCK_PATTERN, () => buildHead(route, hasOgImage));
        fs.writeFileSync(path.join(outDir, `${route.path.slice(1)}.html`), html);
      }

      fs.writeFileSync(
        path.join(outDir, "404.html"),
        shell.replace(BLOCK_PATTERN, () => buildHead(NOT_FOUND_SEO, hasOgImage)),
      );
      // real routes are files (about.html etc) and Netlify serves files before redirect rules,
      // so this only catches unknown paths: 404 status + the SPA shell, which renders NotFound
      fs.writeFileSync(
        path.join(outDir, "_redirects"),
        "# generated by scripts/viteSeoPlugin.ts - edit there, not in dist\n/*  /404.html  404\n",
      );

      const today = new Date().toISOString().slice(0, 10);
      fs.writeFileSync(path.join(outDir, "sitemap.xml"), buildSitemap(today));
      fs.writeFileSync(path.join(outDir, "robots.txt"), buildRobots());
      fs.writeFileSync(path.join(outDir, "llms.txt"), buildLlmsTxt());

      config.logger.info(
        `[seo] ${ROUTE_SEO.length} route heads, sitemap, robots, llms.txt` +
          (hasOgImage ? "" : ` (no ${OG_IMAGE.path} yet, og:image skipped)`),
      );
    },
  };
}
