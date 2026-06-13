import { useState } from "react";
import { useRants } from "../../hooks/useRants";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./rants.module.css";

/**
 * @description Rants page. Form at top center lets visitors drop a rant (name
 * optional). Previous rants list at bottom spans wider than the nav anchor.
 * Data lives in localStorage until the server endpoints are wired up.
 * @author Chris "Mo" Mochinski
 */
export function Rants() {
  const { rants, addRant } = useRants();
  const [text, setText] = useState("");
  const [name, setName] = useState("");

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

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    
    e.preventDefault();
    scratchpad("attempting to submit rant with info →", { text, name });  
    if (!text.trim()) {
      scratchpad("rant submission failed: text is empty or something else is busted");
      return;
    }
      
    addRant(text, name);
    setText("");
    setName("");
    scratchpad("%cRant submitted successfully!", "color: #2E7D32; font-weight: bold;");
  }

  return (
    <>

    {/* ---------- RANT FORM ---------- */}
      <div className={styles.rantForm}>
        <h2 className={styles.rantFormTitlePrompt}>What say ye?</h2>
        <form onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="what's on your mind?"
            className={styles.rantTextarea}
            rows={4}
          />
          <div className={styles.rantFormRow}>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="who are you? (optional)"
              className={styles.rantNameInput}
              maxLength={40}
            />
            <button
              type="submit"
              className={styles.rantSubmit}
              disabled={!text.trim()}
            >
              send
            </button>
          </div>
        </form>
      </div>

    {/* ---------- PRINTED RANT LIST ---------- */}
      {rants.length > 0 && (
        <div className={styles.rantList}>
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
      )}
    </>
  );
}
