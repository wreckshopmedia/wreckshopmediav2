import { useLocation } from "react-router-dom";
import { NOT_FOUND_SEO, getRouteSeo } from "../../seo/seoConfig";
import styles from "./srIntro.module.css";

/**
 * @description Screen-reader-only heading + blurb for the current route, pulled from seoConfig.
 * Gives every page a real h2 and a sentence of context for screen readers and text-only
 * fetchers, without putting a single extra visible word on the screen.
 * @author Chris "Mo" Mochinski
 */
export function SrIntro() {
  const { pathname } = useLocation();
  const seo = getRouteSeo(pathname) ?? NOT_FOUND_SEO;

  return (
    <div className={styles.srOnly}>
      <h2>{seo.srHeading}</h2>
      {seo.srSummary && <p>{seo.srSummary}</p>}
    </div>
  );
}

/**
 * @description Inline visually-hidden text, for finishing a visible label (e.g. the "Media" in
 * the "Wreck Shop" title) without changing what's drawn.
 * @param children - The hidden text.
 * @author Chris "Mo" Mochinski
 */
export function SrOnly({ children }: { children: React.ReactNode }) {
  return <span className={styles.srOnly}>{children}</span>;
}
