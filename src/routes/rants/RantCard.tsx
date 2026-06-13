import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";
import type { Rant } from "../../hooks/useRants";
import styles from "./rantCard.module.css";

const CYCLE_MS = 7000;

// each card gets a "mood" gradient cycling through the site palette
const POSTER_GRADIENTS = [
  "linear-gradient(158deg, #d6efff 0%, #253c78 100%)",
  "linear-gradient(158deg, #a6bba0 0%, #fbf0d6 100%)",
  "linear-gradient(158deg, #daebc4 0%, #253c78 100%)",
  "linear-gradient(158deg, #8c9bcf 0%, #a6bba0 100%)",
  "linear-gradient(158deg, #ac8c72 0%, #d6efff 100%)",
  "linear-gradient(158deg, #253c78 0%, #daebc4 100%)",
] as const;

// dir=1 advances forward (new card flips in from right), dir=-1 retreats
const cardVariants = {
  enter: (dir: number) => ({ rotateY: dir * 90, opacity: 0, scale: 0.94 }),
  center: { rotateY: 0, opacity: 1, scale: 1 },
  exit: (dir: number) => ({ rotateY: dir * -90, opacity: 0, scale: 0.94 }),
};

/** @description Format ISO to a short date without the time component. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface RantCardProps {
  rants: Rant[];
}

/**
 * @description Displays rants as auto-cycling inspirational posters. Each card
 * gets a gradient "mood" from the site palette; the quote flips in with a 3D
 * rotateY spring. Hover pauses the auto-advance. Click the left or right third
 * to retreat or advance manually.
 * @author Chris "Mo" Mochinski
 */
export function RantCard({ rants }: RantCardProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [paused, setPaused] = useState(false);

  const advance = useCallback(() => {
    setDirection(1);
    setIndex((i) => (i + 1) % rants.length);
  }, [rants.length]);

  const retreat = useCallback(() => {
    setDirection(-1);
    setIndex((i) => (i - 1 + rants.length) % rants.length);
  }, [rants.length]);

  useEffect(() => {
    if (paused || rants.length <= 1) return;
    const t = setInterval(advance, CYCLE_MS);
    return () => clearInterval(t);
  }, [paused, advance, rants.length]);

  if (!rants.length) return null;

  const rant = rants[index % rants.length];
  const gradient = POSTER_GRADIENTS[index % POSTER_GRADIENTS.length];
  const showDots = rants.length > 1 && rants.length <= 8;
  const showCounter = rants.length > 8;

  return (
    <div
      className={styles.stage}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}>
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={rant.id}
          className={styles.card}
          style={{ background: gradient }}
          custom={direction}
          variants={cardVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ type: "spring", stiffness: 160, damping: 26 }}>
          {/* dark overlay keeps white text readable on any gradient */}
          <div className={styles.overlay} aria-hidden />

          <div className={styles.cardInner}>
            <span className={styles.openQuote} aria-hidden>
              &ldquo;
            </span>
            <p className={styles.quoteText}>{rant.text}</p>
            <div className={styles.attribution}>
              <span className={styles.authorName}>{rant.name || "Anonymous"}</span>
              <time className={styles.quoteDate}>{formatDate(rant.createdAt)}</time>
            </div>
          </div>

          {/* progress bar resets each card via key change */}
          {!paused && rants.length > 1 && (
            <motion.div
              key={`bar-${index}`}
              className={styles.progressBar}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
              style={{ transformOrigin: "left" }}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* invisible click zones: left third retreats, right third advances */}
      <button
        className={clsx(styles.navZone, styles.navPrev)}
        onClick={retreat}
        aria-label="previous quote"
      />
      <button
        className={clsx(styles.navZone, styles.navNext)}
        onClick={advance}
        aria-label="next quote"
      />

      {showDots && (
        <div className={styles.dots} aria-hidden>
          {rants.map((_, i) => (
            <span key={i} className={clsx(styles.dot, i === index && "dotActive")} />
          ))}
        </div>
      )}

      {showCounter && (
        <p className={styles.counter} aria-label={`quote ${index + 1} of ${rants.length}`}>
          {index + 1} / {rants.length}
        </p>
      )}
    </div>
  );
}
