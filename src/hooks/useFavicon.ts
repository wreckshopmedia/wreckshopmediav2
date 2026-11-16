import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * @description Per-route favicon map. Paths are served from public/favicons/. Missing files
 * are harmless - every icon is preloaded first and anything that fails to load falls back to
 * the default, so you can wire a route here before the art exists.
 */
const ROUTE_FAVICONS: Record<string, string> = {
  "/": "/favicons/landing.png",
  "/home": "/favicons/tree-boat.png",
  "/about": "/favicons/about.png",
  "/rants": "/favicons/garbage-truck.png",
  "/things": "/favicons/things.png",
  "/stuff": "/favicons/hotdog.png",
  "/contact": "/favicons/contact.png",
  "/privacy": "/favicons/privacy.png",
};

const DEFAULT_FAVICON = "/favicon.svg";

/** @description Shown while the tab is in the background - he's watching. */
const AWAY_FAVICON = "/favicons/creepy-friend.png";
const AWAY_TITLE = "👀 come back";

/** @description Odds that a session gets haunted: the creepy face on every tab, every route. */
const HAUNT_ODDS = 1 / 50;
const HAUNT_KEY = "wsm-haunted";

/**
 * @description Rolls the haunt dice once per browser session and remembers the result, so a
 * haunted visitor stays haunted across reloads until they close the tab.
 */
function rollHaunt(): boolean {
  try {
    const saved = sessionStorage.getItem(HAUNT_KEY);
    if (saved !== null) return saved === "1";
    const haunted = Math.random() < HAUNT_ODDS;
    sessionStorage.setItem(HAUNT_KEY, haunted ? "1" : "0");
    return haunted;
  } catch {
    // storage blocked - no haunting, ghosts need somewhere to live
    return false;
  }
}

/**
 * @description Points the page's icon link at `href`, but only after the image actually loads.
 * If it 404s we fall back to the default so the tab never shows a broken icon.
 */
function setFavicon(href: string): () => void {
  let cancelled = false;
  const link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) return () => {};

  const apply = (src: string) => {
    if (cancelled) return;
    link.type = src.endsWith(".svg") ? "image/svg+xml" : "image/png";
    link.href = src;
  };

  const probe = new Image();
  probe.onload = () => apply(href);
  probe.onerror = () => apply(DEFAULT_FAVICON);
  probe.src = href;

  return () => {
    cancelled = true;
  };
}

/**
 * @description Swaps the favicon per route, flips to a creepy face + guilt-trip title while
 * the tab is hidden, and very rarely haunts the whole session with that face. Call once from
 * each top-level route shell.
 * @author Chris "Mo" Mochinski
 */
export function useFavicon(): void {
  const { pathname } = useLocation();
  const [haunted] = useState(rollHaunt);
  const [hidden, setHidden] = useState(() => document.hidden);

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    const routeIcon = ROUTE_FAVICONS[pathname] ?? DEFAULT_FAVICON;
    return setFavicon(haunted || hidden ? AWAY_FAVICON : routeIcon);
  }, [pathname, haunted, hidden]);

  useEffect(() => {
    if (!hidden) return;
    const original = document.title;
    document.title = AWAY_TITLE;
    return () => {
      document.title = original;
    };
  }, [hidden]);
}
