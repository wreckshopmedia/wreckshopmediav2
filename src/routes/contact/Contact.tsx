import styles from "./contact.module.css";

/**
 * @description Contact page. Top center has a short blurb and email. Bottom
 * center holds a social icon row (icons TBD - Mo is selecting these).
 * @author Chris "Mo" Mochinski
 */
export function Contact() {
  return (
    <>
      <div className={styles.contactInfo}>
        <p className={styles.contactBlurb}>
          Got a project, a question, or just want to yell into the void? Start here.
        </p>
        <a href="mailto:mo@wreckshopmedia.com" className={styles.contactEmail}>
          mo@wreckshopmedia.com
        </a>
      </div>

      <div className={styles.socialRow}>
        {/* icons coming - Mo selecting these */}
        <span className={styles.socialPlaceholder}>github</span>
        <span className={styles.socialPlaceholder}>linkedin</span>
        <span className={styles.socialPlaceholder}>instagram</span>
      </div>
    </>
  );
}
