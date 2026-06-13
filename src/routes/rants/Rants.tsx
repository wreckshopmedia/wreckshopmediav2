import { useState } from "react";
import { useRants } from "../../hooks/useRants";
import { RantCard } from "./rantsIndex";
// import { RantList } from "./rantsIndex";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./rants.module.css";

/**
 * @description Rants page. Form at top center lets visitors drop a rant (name
 * optional). Previous rants list at bottom spans wider than the nav anchor.
 * Hits wreckshopmediav2-server - VITE_API_URL controls the base URL.
 * @author Chris "Mo" Mochinski
 */
export function Rants() {
  const { rants, addRant } = useRants();
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

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
        <div className={styles.rantHeaderContainer}>
          <div>
            <h2 className={styles.rantFormTitlePrompt}>What say ye?</h2>
            <h5 className={styles.rantSubtitle}>no judgment...no rules...no mercy</h5>
          </div>
          <h6 className={styles.rantDisclaimer}>
          though your rant <span>will</span> be publicly visible, soooooooo...
          </h6>
        </div>
        <form onSubmit={handleSubmit}>
          <textarea
            id="rant-field"
            name="rant"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="what's on your mind?"
            className={styles.rantTextarea}
            rows={6}
            disabled={submitting}
          />
          <div className={styles.rantFormRow}>
            <input
              id="rant-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="who are you? (optional)"
              className={styles.rantNameInput}
              maxLength={40}
              disabled={submitting}
            />
            <button
              id="rant-submit"
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
      </div>

      {/* ---------- INSPIRATIONAL POSTER CARDS ---------- */}
      <div className={styles.rantCardWrap}>
        <RantCard rants={rants} />
      </div>

      {/* ---------- PRINTED RANT LIST (table view - swap in if needed) ---------- */}
      {/* <RantList rants={rants} loading={loading} error={error} /> */}
    </>
  );
}
