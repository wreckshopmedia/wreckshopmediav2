import type { Rant } from "../../hooks/useRants";
import styles from "./rants.module.css";

interface RantListProps {
  rants: Rant[];
  loading: boolean;
  error: string | null;
}

/** @description Format ISO timestamp to a friendly local string with time. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * @description Table-style rant list. Kept as a reference/fallback alongside
 * the RantCard poster view. Uses the same rants.module.css as the parent route.
 * @author Chris "Mo" Mochinski
 */
export function RantList({ rants, loading, error }: RantListProps) {
  return (
    <div className={styles.rantList}>
      {loading && <p className={styles.rantListStatus}>loading rants...</p>}
      {error && <p className={styles.rantListStatus}>{error}</p>}
      {!loading && !error && rants.length === 0 && (
        <p className={styles.rantListStatus}>nothing yet. go ahead.</p>
      )}
      {rants.map((rant) => (
        <div key={rant.id} className={styles.rantItem}>
          <div className={styles.rantMeta}>
            <time className={styles.rantTime}>{formatDate(rant.createdAt)}</time>
            <span className={styles.rantName}>{rant.name}</span>
          </div>
          <p className={styles.rantText}>{rant.text}</p>
        </div>
      ))}
    </div>
  );
}
