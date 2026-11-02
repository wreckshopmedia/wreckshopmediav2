import styles from "./privacy.module.css";

/**
 * @description Privacy page for Wreck Shop Assistant (the Google OAuth calendar helper).
 * Mostly a technicality so Google's app verification has a policy URL to check.
 * @author Chris "Mo" Mochinski
 */
export function Privacy() {
  return (
    <>
      <p className={styles.privacyBlurb}>
        <span className={styles.bizName}>Wreck Shop Assistant</span> is a tiny personal home
        assistant. It uses Google sign-in only to read and manage calendar events for the accounts
        that choose to connect it. That data is never sold, shared, or used for ads, and you can
        revoke access anytime from your Google account permissions.
      </p>
      <p className={styles.fineprint}>
        Use of information received from Google APIs adheres to the Google API Services User Data
        Policy, including the Limited Use requirements. Questions?{" "}
        <a href="mailto:mo@wreckshopmedia.com">mo@wreckshopmedia.com</a> · updated Nov 2026
      </p>
    </>
  );
}
