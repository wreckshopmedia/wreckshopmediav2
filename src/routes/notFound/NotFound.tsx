import styles from "./notFound.module.css";

/**
 * @description Catch-all for URLs the router doesn't know. Netlify serves this with a real 404
 * status via dist/404.html, so crawlers don't index junk URLs as copies of the homepage.
 * @author Chris "Mo" Mochinski
 */
export function NotFound() {
  return <p className={styles.notFound}>nothing here. it probably got thrown in the garbage truck.</p>;
}
