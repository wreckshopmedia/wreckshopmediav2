/**
 * @module seoConfig
 * @description Single source of truth for everything crawlers and answer engines read: per-route
 * titles and descriptions, the site/person identity behind the JSON-LD, and the plain-language
 * facts that go into llms.txt. Pure data on purpose - the Vite build plugin (Node) and the
 * runtime head hook (browser) both import it, so no DOM or Vite-only APIs in here.
 * @author Chris "Mo" Mochinski
 */

/** @description Prod origin. Canonicals, sitemap and OG urls always point here, even in dev. */
export const SITE_URL = "https://wreckshopmedia.com";

export const SITE_NAME = "Wreck Shop Media";

/** @description Default description, used by the root route and the Organization schema. */
export const SITE_DESCRIPTION =
  'Wreck Shop Media is the tiny, deliberately weird web studio of Chris "Mo" Mochinski, a ' +
  "senior frontend and full-stack developer who builds React + TypeScript sites, apps, and " +
  "odd little interactive toys.";

/**
 * @description Optional share image, relative to public/. The build only emits og:image tags if
 * the file actually exists, so this can point at art that hasn't been made yet (1200x630 PNG).
 */
export const OG_IMAGE = { path: "/og/wreckshop-og.png", width: 1200, height: 630 };
export const OG_IMAGE_ALT = "Wreck Shop Media - a sailboat-tree perched on a little cartoon hill";

/** @description X handle for twitter:site / twitter:creator. */
export const X_HANDLE = "@thankpleasedev";

export const PERSON = {
  name: "Chris Mochinski",
  alternateName: 'Chris "Mo" Mochinski',
  jobTitle: "Senior Frontend / Full-Stack Developer",
  email: "mo@wreckshopmedia.com",
  // personal profiles only - the CodePen link on /contact is a work account so it's left out
  sameAs: [
    "https://github.com/chrismochinski",
    "https://www.linkedin.com/in/chrismochinski",
    "https://instagram.com/chrismochinski",
    "https://www.backstage.com/u/chris-mo-mochinski/",
    "https://x.com/thankpleasedev",
    "https://facebook.com/chrismochinski",
  ],
  knowsAbout: [
    "React",
    "TypeScript",
    "Vite",
    "Mantine",
    "Emotion",
    "Motion (Framer Motion)",
    "Electron",
    "Chrome extensions",
    "Frontend architecture",
    "SVG animation",
  ],
};

export const ORGANIZATION = {
  foundingDate: "2022",
  sameAs: ["https://www.youtube.com/@wreckshopmedia"],
};

/**
 * @description Short, quotable facts for llms.txt. Answer engines lift sentences nearly verbatim,
 * so each line should stand on its own and stay true to what the site itself says.
 */
export const LLMS_FACTS = [
  'Wreck Shop Media was founded and registered in 2022 by Chris "Mo" Mochinski.',
  "Mo is a senior frontend and full-stack developer working mostly in React and TypeScript.",
  "Mo has been building websites since age 17, starting with sites for his band and friends.",
  "Outside of code, Mo makes music, is working toward a private pilot's license, and loves airports.",
  "The fastest way to reach Mo is email: mo@wreckshopmedia.com.",
];

/** @description schema.org page type, used for the per-route WebPage node in the JSON-LD graph. */
export type SeoPageType = "WebPage" | "ProfilePage" | "ContactPage" | "CollectionPage";

export interface RouteSeo {
  /** Router path, exactly as App.tsx spells it. */
  path: string;
  /** Full document title. Keep under ~60 chars so search results don't truncate it. */
  title: string;
  /** Meta + OG description. Aim for 120-160 chars, written as a direct answer. */
  description: string;
  /** False = noindex + left out of the sitemap. Use for empty or placeholder routes. */
  index: boolean;
  pageType: SeoPageType;
  /** Label for llms.txt and the nav-ish lists. */
  label: string;
  /**
   * Screen-reader-only page heading (an h2 under the site's "Wreck Shop" h1). Never visible, but
   * it's real HTML, so screen readers, the prerender snapshot and answer engines all read it.
   */
  srHeading: string;
  /** Optional screen-reader-only blurb under srHeading. One or two sentences, max. */
  srSummary?: string;
}

/**
 * @description Every route the router knows about. Order is the order sitemap.xml and llms.txt
 * list them in. Flip `index` to true on /home, /things and /stuff once they have real content -
 * empty pages being indexed is a thin-content signal that drags the whole site down.
 */
export const ROUTE_SEO: RouteSeo[] = [
  {
    path: "/",
    label: "Home",
    title: "Wreck Shop Media | Mo Mochinski, frontend developer",
    description: SITE_DESCRIPTION,
    index: true,
    pageType: "WebPage",
    srHeading: 'The tiny, weird web studio of Chris "Mo" Mochinski',
    srSummary:
      "Mo is a senior frontend and full-stack developer who builds React and TypeScript sites, " +
      "apps, and silly interactive toys. Click the sailboat tree on the hill to come inside.",
  },
  {
    path: "/about",
    label: "About",
    title: "About Mo | Wreck Shop Media",
    description:
      'Meet Chris "Mo" Mochinski, the Minneapolis-born developer behind Wreck Shop Media: ' +
      "building websites since 17, music nerd, pilot-in-training, airport enthusiast.",
    index: true,
    pageType: "ProfilePage",
    srHeading: 'About Chris "Mo" Mochinski',
  },
  {
    path: "/contact",
    label: "Contact",
    title: "Contact | Wreck Shop Media",
    description:
      "Got a project, a question, or just want to yell at Mo? Email mo@wreckshopmedia.com or " +
      "find him on GitHub, LinkedIn, YouTube and the rest.",
    index: true,
    pageType: "ContactPage",
    srHeading: "Contact Mo",
    srSummary: "Email mo@wreckshopmedia.com, or find Mo on any of the social links on this page.",
  },
  {
    path: "/rants",
    label: "Rants",
    title: "Rants | Wreck Shop Media",
    description:
      "A public sticky-note rant board. Peel a fresh note, scribble your grievance, and fling " +
      "the bad ones into a garbage truck.",
    index: true,
    pageType: "CollectionPage",
    srHeading: "Rants: a public sticky-note board",
    srSummary:
      "Peel a blank note off the pad, write a rant, drag notes around the board, and fling the " +
      "ones you hate into the garbage truck.",
  },
  {
    path: "/privacy",
    label: "Privacy",
    title: "Privacy Policy | Wreck Shop Assistant",
    description:
      "Privacy policy for Wreck Shop Assistant, a personal home assistant that uses Google " +
      "sign-in only to read and manage calendar events. Data is never sold or shared.",
    index: true,
    pageType: "WebPage",
    srHeading: "Privacy policy for Wreck Shop Assistant",
  },
  {
    path: "/home",
    label: "Home hub",
    title: "Home | Wreck Shop Media",
    description: SITE_DESCRIPTION,
    index: false,
    pageType: "WebPage",
    srHeading: "Home",
  },
  {
    path: "/things",
    label: "Things",
    title: "Things | Wreck Shop Media",
    description: "Things from Wreck Shop Media. Under construction, check back soon.",
    index: false,
    pageType: "WebPage",
    srHeading: "Things",
  },
  {
    path: "/stuff",
    label: "Stuff",
    title: "Stuff | Wreck Shop Media",
    description: "Stuff from Wreck Shop Media. Under construction, check back soon.",
    index: false,
    pageType: "WebPage",
    srHeading: "Stuff",
  },
];

/**
 * @description Head + sr copy for any URL the router doesn't know. Served as dist/404.html with a
 * real 404 status (see the generated _redirects), never indexed, no canonical.
 */
export const NOT_FOUND_SEO: RouteSeo = {
  path: "/404",
  label: "Not found",
  title: "Lost | Wreck Shop Media",
  description: "This page doesn't exist. It probably got thrown in the garbage truck.",
  index: false,
  pageType: "WebPage",
  srHeading: "Page not found",
};

/**
 * @description Looks up a route's SEO entry, tolerating a trailing slash.
 * @param pathname - The current location pathname, e.g. "/about/".
 * @returns The matching entry, or undefined for routes we don't know about.
 */
export function getRouteSeo(pathname: string): RouteSeo | undefined {
  const trimmed = pathname.replace(/\/+$/, "") || "/";
  return ROUTE_SEO.find((route) => route.path === trimmed);
}

/**
 * @description Absolute canonical URL for a route path, never with a trailing slash (except root).
 * @param path - Router path like "/about".
 * @returns e.g. "https://wreckshopmedia.com/about".
 */
export function toCanonicalUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}
