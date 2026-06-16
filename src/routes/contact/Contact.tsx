import { SocialRow } from "../../components/socialRow/SocialRow";
import styles from "./contact.module.css";

/**
 * @description Contact page. Top center has a short blurb and email; the social
 * icon row sits centered below the nav. See SocialRow for the icons' drunk-wander
 * + magnet hover behavior.
 * @author Chris "Mo" Mochinski
 */
export function Contact() {
  return (
    <>
      <div className={styles.contactInfo}>
        <p className={styles.contactBlurb}>
          Got a project, a question, or just want to yell at me? Start here:
        </p>
        <a href="mailto:mo@wreckshopmedia.com" className={styles.contactEmail}>
          mo@wreckshopmedia.com
        </a>
      </div>

      <div className={styles.socialAnchor}>
        <SocialRow />
      </div>
    </>
  );
}
