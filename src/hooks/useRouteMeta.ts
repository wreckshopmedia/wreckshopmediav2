import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { NOT_FOUND_SEO, getRouteSeo, toCanonicalUrl } from "../seo/seoConfig";

/**
 * @description Points an existing head tag at new content, creating it if the build didn't.
 * @param selector - CSS selector for the tag, e.g. `meta[name="description"]`.
 * @param create - Builds the element when it's missing.
 * @param attr - Attribute to set (`content` for meta, `href` for link).
 * @param value - The new value.
 */
function upsertHeadTag(
  selector: string,
  create: () => HTMLElement,
  attr: "content" | "href",
  value: string,
): void {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

/**
 * @description Builds a `<meta>` with one identifying attribute, for upsertHeadTag.
 * @param key - `name` or `property`.
 * @param value - The identifier, e.g. `og:title`.
 * @returns A factory for the element.
 */
const metaFactory = (key: "name" | "property", value: string) => () => {
  const meta = document.createElement("meta");
  meta.setAttribute(key, value);
  return meta;
};

/**
 * @description Keeps the head in sync on client-side navigation. The build already bakes the
 * right tags into each route's HTML for crawlers - this just updates the same tags in place (no
 * duplicates, unlike React 19's hoisted `<title>`) so tab titles, shares from an already-open tab
 * and GA4 page titles follow the route. Call once from each top-level route shell.
 * @author Chris "Mo" Mochinski
 */
export function useRouteMeta(): void {
  const { pathname } = useLocation();

  useEffect(() => {
    const known = getRouteSeo(pathname);
    const seo = known ?? NOT_FOUND_SEO;
    // unknown urls point og:url at themselves and get no canonical at all
    const url = known ? toCanonicalUrl(known.path) : window.location.href;

    document.title = seo.title;
    const metas: [key: "name" | "property", id: string, content: string][] = [
      ["name", "description", seo.description],
      ["name", "robots", seo.index ? "index, follow, max-image-preview:large" : "noindex, follow"],
      ["property", "og:title", seo.title],
      ["property", "og:description", seo.description],
      ["property", "og:url", url],
      ["name", "twitter:title", seo.title],
      ["name", "twitter:description", seo.description],
    ];
    for (const [key, id, content] of metas) {
      upsertHeadTag(`meta[${key}="${id}"]`, metaFactory(key, id), "content", content);
    }

    if (!known) {
      document.head.querySelector('link[rel="canonical"]')?.remove();
      return;
    }
    const canonicalFactory = () => {
      const link = document.createElement("link");
      link.rel = "canonical";
      return link;
    };
    upsertHeadTag('link[rel="canonical"]', canonicalFactory, "href", url);
  }, [pathname]);
}
