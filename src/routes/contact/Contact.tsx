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
          got a project, a question, or just want to yell into the void? start here:
        </p>
        <a href="mailto:mo@wreckshopmedia.com" className={styles.contactEmail}>
          mo@wreckshopmedia.com
        </a>
      </div>

      <div className={styles.socialRow}>
        {/* icons coming - Mo selecting these */}
        <a
          target="_blank"
          href="https://github.com/chrismochinski"
          className={styles.socialPlaceholder}>
          my github
        </a>
        <a
          target="_blank"
          href="https://github.com/wreckshopmedia"
          className={styles.socialPlaceholder}>
          wsm github
        </a>
        <a
          target="_blank"
          href="https://www.linkedin.com/in/chrismochinski"
          className={styles.socialPlaceholder}>
          linkedin
        </a>
        <a
          target="_blank"
          href="https://instagram.com/chrismochinski"
          className={styles.socialPlaceholder}>
          instagram
        </a>
        <a
          target="_blank"
          href="https://www.backstage.com/u/chris-mo-mochinski/"
          className={styles.socialPlaceholder}>
          backstage
        </a>
      </div>
    </>
  );
}
