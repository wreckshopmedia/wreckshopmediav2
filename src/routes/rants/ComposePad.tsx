import { useState } from "react";
import { motion } from "motion/react";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./stickyBoard.module.css";

const MAX_RANT_LENGTH = 200;

interface ComposePadProps {
  nextColor: string;
  onStick: (text: string, name: string) => Promise<boolean>;
}

/**
 * @description The pad in the corner, tilted slightly like a real pad. The top
 * blank wears the next color in the cycle - peel it up by focusing, scribble a
 * rant in the handwriting font, optionally sign it, then stick it to the board.
 * On success the new rant flows back through useRants and lands automatically.
 * @author Chris "Mo" Mochinski
 */
export function ComposePad({ nextColor, onStick }: ComposePadProps) {
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [peeled, setPeeled] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function stickIt() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onStick(text, name);
    if (ok) {
      setText("");
      setName("");
      setPeeled(false);
      scratchpad("%csticky stuck to the board!", "color: #2E7D32; font-weight: bold;");
    }
    setSubmitting(false);
  }

  return (
    // whole pad starts small and scales up when you focus it to write
    <motion.div
      className={styles.pad}
      animate={{ scale: peeled ? 1.1 : 1 }}
      transition={{ type: "spring", stiffness: 800, damping: 17 }}>
      {/* stacked blanks behind for pad depth */}
      <div className={styles.padBack} aria-hidden style={{ rotate: "-2deg" }} />
      <div className={styles.padBack} aria-hidden style={{ rotate: "3deg" }} />
      <motion.div
        className={styles.composeNote}
        style={{ background: nextColor }}
        // peel stays up while focus is anywhere inside the pad (textarea OR name);
        // only drops when focus leaves the whole note and there's no rant text yet
        onFocus={() => setPeeled(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget) && !text.trim()) setPeeled(false);
        }}
        animate={peeled ? { rotate: -2, y: -8 } : { rotate: 0, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}>
        <textarea
          className={styles.composeTextarea}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_RANT_LENGTH))}
          placeholder="scribble a rant..."
          rows={4}
          disabled={submitting}
        />
        <div className={styles.composeFooter}>
          {/* fixed "-" prefix sits outside the input so it's always there, not editable */}
          <span className={styles.nameField}>
            <span className={styles.namePrefix} aria-hidden>
              -
            </span>
            <input
              className={styles.composeName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="name?"
              maxLength={35}
              disabled={submitting}
            />
          </span>
          {text.trim() && (
            <button className={styles.stickButton} onClick={stickIt} disabled={submitting}>
              {submitting ? "..." : "stick it"}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
