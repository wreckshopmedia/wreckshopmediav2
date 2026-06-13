import { useState } from "react";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import type { PanInfo } from "motion/react";
import type { Rant } from "../../hooks/useRants";
import styles from "./rantCard.module.css";

const THROW_VELOCITY = 500; // px/s - below this the card springs back
const STACK_SIZE = 3;

const GRADIENTS = [
  "linear-gradient(158deg, #d6efff 0%, #253c78 100%)",
  "linear-gradient(158deg, #a6bba0 0%, #fbf0d6 100%)",
  "linear-gradient(158deg, #daebc4 0%, #253c78 100%)",
  "linear-gradient(158deg, #8c9bcf 0%, #a6bba0 100%)",
  "linear-gradient(158deg, #ac8c72 0%, #d6efff 100%)",
  "linear-gradient(158deg, #253c78 0%, #daebc4 100%)",
] as const;

/** @description Format ISO date to short readable string. */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// same rant id + depth always produces the same peeking rotation
function stackRotation(id: string, depth: number): number {
  const seed = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const sign = (seed + depth) % 2 === 0 ? 1 : -1;
  return sign * (3 + (seed % 5));
}

interface DraggableCardProps {
  rant: Rant;
  gradient: string;
  depth: number;
  isTop: boolean;
  onDismiss: () => void;
}

// each card owns its own MotionValues - clean mount/unmount with no shared state bleed
function DraggableCard({ rant, gradient, depth, isTop, onDismiss }: DraggableCardProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-250, 0, 250], [-18, 0, 18]);

  async function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    const speed = Math.hypot(info.velocity.x, info.velocity.y);
    if (speed > THROW_VELOCITY) {
      const angle = Math.atan2(info.velocity.y, info.velocity.x);
      await Promise.all([
        animate(x, Math.cos(angle) * 1000, { duration: 0.35, ease: "easeOut" }),
        animate(y, Math.sin(angle) * 1000, { duration: 0.35, ease: "easeOut" }),
      ]);
      onDismiss();
    } else {
      void animate(x, 0, { type: "spring", stiffness: 300, damping: 24 });
      void animate(y, 0, { type: "spring", stiffness: 300, damping: 24 });
    }
  }

  return (
    <motion.div
      className={styles.card}
      style={{
        background: gradient,
        x: isTop ? x : 0,
        y: isTop ? y : depth * 8,
        rotate: isTop ? rotate : stackRotation(rant.id, depth),
        scale: 1 - depth * 0.05,
        zIndex: STACK_SIZE - depth,
      }}
      drag={isTop}
      dragMomentum={false}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileDrag={{ scale: 1.04 }}>
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
    </motion.div>
  );
}

interface RantCardProps {
  rants: Rant[];
}

/**
 * @description Drag-to-throw inspirational disaster card stack. Flick the top
 * card in any direction to dismiss it - below throw velocity it springs back.
 * Three cards visible with stable pseudo-random rotations peeking behind the top.
 * Deck cycles infinitely.
 * @author Chris "Mo" Mochinski
 */
export function RantCard({ rants }: RantCardProps) {
  const [topIndex, setTopIndex] = useState(0);

  if (!rants.length) return null;

  const n = rants.length;
  // never show more cards than n-1 so the thrown card always unmounts cleanly
  // before it can reappear as a back card with stale fly-off MotionValues
  const visibleCount = Math.min(STACK_SIZE, Math.max(1, n - 1));

  function dismiss() {
    setTopIndex((i) => (i + 1) % n);
  }

  // render back-to-front: last in DOM = top card = highest natural z-order
  return (
    <div className={styles.stage}>
      {Array.from({ length: visibleCount }, (_, i) => {
        const depth = visibleCount - 1 - i; // 2 → 1 → 0, 0 is top
        const rantIndex = (topIndex + depth) % n;
        const rant = rants[rantIndex];
        return (
          <DraggableCard
            key={rant.id}
            rant={rant}
            gradient={GRADIENTS[rantIndex % GRADIENTS.length]}
            depth={depth}
            isTop={depth === 0}
            onDismiss={dismiss}
          />
        );
      })}
    </div>
  );
}
