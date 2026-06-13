import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";
import type { PanInfo } from "motion/react";
import type { Rant } from "../../hooks/useRants";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./stickyBoard.module.css";

// placeholder palette - Mo will swap in richer colors. order + length must match
// the server's PALETTE_SIZE so stored color indices line up.
const NOTE_COLORS = ["#fef08a", "#fda4af", "#a7f3d0", "#bfdbfe", "#fed7aa"] as const;

const MAX_RANT_LENGTH = 240;

// horizontal drag distance (px) that leans the note to the full angle. lean
// tracks how far you've dragged sideways and HOLDS there (no gravity back to
// straight) - drag back the other way to lean it the other direction.
const LEAN_FULL_OFFSET = 200;
const LEAN_MAX_DEG = 20;
// hard ceiling on a note's frozen angle so repeated drags can never spin it silly
const FROZEN_ANGLE_CAP = 26;

/** @description Cheap stable hash of a rant id - sums char codes. */
function hashId(id: string): number {
  return id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** @description Positive modulo so negative inputs still wrap into 0..n-1. */
function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

/**
 * @description A rant's palette index. Uses the color locked at creation; for
 * legacy rows with none, derives it from the numeric id (monotonic + stable) so
 * it never shifts when other notes are deleted.
 */
function colorIndexFor(rant: Rant): number {
  if (rant.colorIndex != null) return rant.colorIndex;
  const n = parseInt(rant.id, 10);
  return Number.isFinite(n) ? mod(n, NOTE_COLORS.length) : 0;
}

/**
 * @description Deterministic fallback placement for a rant that has never been
 * dropped (no stored pos). Same id always lands in the same spot/tilt so unplaced
 * notes don't jump on re-render. Returns 0-1 fractions of the canvas.
 */
function seededLayout(id: string) {
  const h = hashId(id);
  return {
    xFrac: 0.06 + ((h * 7) % 70) / 100, // 0.06 - 0.76
    yFrac: 0.06 + ((h * 13) % 64) / 100, // 0.06 - 0.70
    tilt: (h % 13) - 6, // -6deg .. +6deg
  };
}

/**
 * @description Picks a font-size clamp for the note text based on rant length -
 * a few words read big, a wall of text shrinks to fit the square. Three tiers
 * past the short default; the cqi middle value still scales with note size.
 */
function noteFontSize(len: number): string {
  if (len <= 30) return "clamp(14px, 11cqi, 20px)";
  if (len <= 80) return "clamp(12px, 8.5cqi, 16px)";
  if (len <= 140) return "clamp(10px, 7cqi, 13px)";
  return "clamp(9px, 5.5cqi, 11px)";
}

/** @description True if a page-space point falls inside the given element's box. */
function pointInRect(x: number, y: number, rect: DOMRect | undefined): boolean {
  if (!rect) return false;
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

interface StickyNoteProps {
  rant: Rant;
  color: string;
  xFrac: number;
  yFrac: number;
  baseRotation: number;
  constraintsRef: React.RefObject<HTMLDivElement | null>;
  trashRef: React.RefObject<HTMLDivElement | null>;
  onCommit: (id: string, xFrac: number, yFrac: number, rotation: number) => void;
  onTrash: (id: string) => void;
}

/**
 * @description A single placed sticky note. While dragging it leans into the
 * motion (drag velocity feeds a smoothed rotation); the moment you let go it
 * freezes dead in place at whatever angle it was at - no momentum slide. The drop
 * spot is saved as a canvas fraction so it persists responsively. Drop it over
 * the trash to bin it. Remounts (via a key on its stored pos) reset the drag
 * transform cleanly once a placement is committed.
 * @author Chris "Mo" Mochinski
 */
function StickyNote({
  rant,
  color,
  xFrac,
  yFrac,
  baseRotation,
  constraintsRef,
  trashRef,
  onCommit,
  onTrash,
}: StickyNoteProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // rotateTarget is the angle we steer toward; the spring smooths it for display
  const rotateTarget = useMotionValue(baseRotation);
  const rotate = useSpring(rotateTarget, { stiffness: 300, damping: 28 });
  // the angle the note is "stuck" at between drags - lean is added on top
  const frozenAngle = useRef(baseRotation);

  function handleDrag(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    // lean tracks horizontal distance dragged from the grab point and holds it -
    // no decay back to straight. offset.x resets to 0 each new grab.
    const lean = clamp(info.offset.x / LEAN_FULL_OFFSET, -1, 1) * LEAN_MAX_DEG;
    rotateTarget.set(clamp(frozenAngle.current + lean, -FROZEN_ANGLE_CAP, FROZEN_ANGLE_CAP));
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    // freeze at the current leaned angle (capped) so it stays cockeyed where dropped
    const frozen = clamp(rotateTarget.get(), -FROZEN_ANGLE_CAP, FROZEN_ANGLE_CAP);
    frozenAngle.current = frozen;
    rotateTarget.set(frozen);

    if (pointInRect(info.point.x, info.point.y, trashRef.current?.getBoundingClientRect())) {
      onTrash(rant.id);
      return;
    }

    // convert the drag offset back into a 0-1 canvas fraction and persist it
    const rect = constraintsRef.current?.getBoundingClientRect();
    if (rect) {
      const nx = clamp(xFrac + x.get() / rect.width, 0, 0.92);
      const ny = clamp(yFrac + y.get() / rect.height, 0, 0.9);
      onCommit(rant.id, nx, ny, frozen);
    }
  }

  return (
    <motion.div
      className={styles.note}
      style={{ left: `${xFrac * 100}%`, top: `${yFrac * 100}%`, background: color, x, y, rotate }}
      drag
      dragConstraints={constraintsRef}
      dragElastic={0.08}
      dragMomentum={false}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileDrag={{ scale: 1.07, zIndex: 50, cursor: "grabbing" }}>
      <p className={styles.noteText} style={{ fontSize: noteFontSize(rant.text.length) }}>
        {rant.text}
      </p>
      <span className={styles.noteAuthor}>{rant.name || "anon"}</span>
    </motion.div>
  );
}

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
function ComposePad({ nextColor, onStick }: ComposePadProps) {
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
    <div className={styles.pad}>
      {/* stacked blanks behind for pad depth */}
      <div className={styles.padBack} aria-hidden style={{ rotate: "-3deg" }} />
      <div className={styles.padBack} aria-hidden style={{ rotate: "2deg" }} />
      <motion.div
        className={styles.composeNote}
        style={{ background: nextColor }}
        animate={peeled ? { rotate: -2, y: -10, scale: 1.03 } : { rotate: 0, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}>
        <textarea
          className={styles.composeTextarea}
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_RANT_LENGTH))}
          onFocus={() => setPeeled(true)}
          onBlur={() => !text && setPeeled(false)}
          placeholder="scribble a rant..."
          rows={4}
          disabled={submitting}
        />
        <div className={styles.composeFooter}>
          <input
            className={styles.composeName}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="- name?"
            maxLength={40}
            disabled={submitting}
          />
          {text.trim() && (
            <button className={styles.stickButton} onClick={stickIt} disabled={submitting}>
              {submitting ? "..." : "stick it"}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

interface StickyBoardProps {
  rants: Rant[];
  addRant: (text: string, name: string) => Promise<boolean>;
  updatePlacement: (id: string, posX: number, posY: number, rotation: number) => void;
  deleteRant: (id: string) => void;
}

/**
 * @description Sticky-note canvas filling a single capped, centered region of the
 * viewport. Existing rants sit where they were dropped (stored as 0-1 fractions)
 * or scatter at a deterministic fallback spot if never placed; drag any one
 * anywhere - it sticks where dropped, persisting to the DB - or fling it onto the
 * trash to delete it for good. The corner pad shows the next cycling color and
 * lets you scribble a new rant.
 * @author Chris "Mo" Mochinski
 */
export function StickyBoard({ rants, addRant, updatePlacement, deleteRant }: StickyBoardProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const trashRef = useRef<HTMLDivElement>(null);

  // the color cycle is a session cursor: it seeds once from the newest existing
  // note (so a returning visitor continues the loop), then only ever advances
  // when YOU stick a note. deletes never touch it - that was the bug before.
  const [cursor, setCursor] = useState<number | null>(null);
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current || !rants.length) return;
    const newest = rants.reduce((latest, r) =>
      parseInt(r.id, 10) > parseInt(latest.id, 10) ? r : latest,
    );
    setCursor(mod(colorIndexFor(newest) + 1, NOTE_COLORS.length));
    seeded.current = true;
  }, [rants]);

  const nextColorIdx = cursor ?? 0;
  const nextColor = NOTE_COLORS[nextColorIdx];

  async function handleStick(text: string, name: string): Promise<boolean> {
    const ok = await addRant(text, name, nextColorIdx);
    if (ok) setCursor(mod(nextColorIdx + 1, NOTE_COLORS.length)); // advance only on success
    return ok;
  }

  return (
    <div className={styles.canvas} ref={canvasRef}>
      {rants.map((rant) => {
        const seeded = seededLayout(rant.id);
        const placed = rant.posX != null && rant.posY != null;
        return (
          <StickyNote
            // key includes stored pos so committing a placement remounts cleanly
            key={`${rant.id}-${rant.posX ?? "s"}-${rant.posY ?? "s"}`}
            rant={rant}
            color={NOTE_COLORS[colorIndexFor(rant)]}
            xFrac={placed ? rant.posX! : seeded.xFrac}
            yFrac={placed ? rant.posY! : seeded.yFrac}
            baseRotation={rant.rotation ?? seeded.tilt}
            constraintsRef={canvasRef}
            trashRef={trashRef}
            onCommit={updatePlacement}
            onTrash={deleteRant}
          />
        );
      })}

      <ComposePad nextColor={nextColor} onStick={handleStick} />

      <div className={styles.trash} ref={trashRef} aria-label="drag a note here to trash it">
        🗑️
      </div>
    </div>
  );
}
