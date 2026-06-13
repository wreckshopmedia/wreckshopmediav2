import { useState } from "react";
import { useRants } from "../../hooks/useRants";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./rants.module.css";

/**
 * @description Rants page. Form at top center lets visitors drop a rant (name
 * optional). Previous rants list at bottom spans wider than the nav anchor.
 * Hits wreckshopmediav2-server - VITE_API_URL controls the base URL.
 * @author Chris "Mo" Mochinski
 */
export function Rants() {
  const { rants, loading, error, addRant } = useRants();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  /** @description Format ISO timestamp to a friendly local string. */
  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    scratchpad("attempting to submit rant with info →", { text, name });
    if (!text.trim()) {
      scratchpad("rant submission bailed: empty text");
      return;
    }

    setSubmitting(true);
    setSubmitError(false);

    const ok = await addRant(text, name);

    if (ok) {
      setText("");
      setName("");
      scratchpad("%cRant submitted successfully!", "color: #2E7D32; font-weight: bold;");
    } else {
      setSubmitError(true);
    }

    setSubmitting(false);
  }

  return (
    <>
      {/* ---------- RANT FORM ---------- */}
      <div className={styles.rantForm}>
        <h2 className={styles.rantFormTitlePrompt}>What say ye?</h2>
        <h5 className={styles.rantSubtitle}>no judgment...no rules...no mercy</h5>
        <form onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="what's on your mind?"
            className={styles.rantTextarea}
            rows={4}
            disabled={submitting}
          />
          <div className={styles.rantFormRow}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="who are you? (optional)"
              className={styles.rantNameInput}
              maxLength={40}
              disabled={submitting}
            />
            <button
              type="submit"
              className={styles.rantSubmit}
              disabled={!text.trim() || submitting}>
              {submitting ? "sending..." : "send"}
            </button>
          </div>
          {submitError && (
            <p className={styles.rantSubmitError}>something went wrong - try again</p>
          )}
        </form>
        <h6 className={styles.rantDisclaimer}>
          <span>*</span>remember - your rant will be public
        </h6>
      </div>

      {/* ---------- PRINTED RANT LIST ---------- */}
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
    </>
  );
}
