import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from "motion/react";
import type { PanInfo } from "motion/react";
import type { Rant } from "../../hooks/useRants";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./stickyBoard.module.css";

// the 5-color cycle. defined as theme vars in index.css (single source of truth).
// order + length must match the server's PALETTE_SIZE so stored indices line up.
const NOTE_COLORS = [
  "var(--sticky-note-yellow)",
  "var(--sticky-note-red)",
  "var(--sticky-note-green)",
  "var(--sticky-note-blue)",
  "var(--sticky-note-peach)",
] as const;

const MAX_RANT_LENGTH = 200;

// drag velocity (px/s) at which the note leans the full LEAN_MAX_DEG. real drags
// run hundreds-to-thousands of px/s, so this has to be up here - set it too low
// (the old 50) and every drag, slow or fast, instantly pins the clamp at max and
// the speed signal is lost. when you slow/stop, useVelocity self-zeroes and the
// note eases back to its hang (gravity); on release it freezes exactly as-is.
const LEAN_VELOCITY = 2000;
const LEAN_MAX_DEG = 100;
// exponent on the normalized velocity. >1 means gentle moves barely tilt while
// fast flings whip toward the max - this is what sells slow-vs-fast as different.
const LEAN_EASE = 2;
// hard ceiling on a note's frozen angle so repeated drags can never spin it silly
const FROZEN_ANGLE_CAP = 30;
// natural hang angle when grabbed off-center - grab the left third and it tilts
// right (like pinching the top-left corner), right third tilts left, middle hangs
// straight. this is the resting point gravity pulls toward while you hold it.
const GRAB_LEAN_DEG = 15;

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

/* 
------------------------------------------------------------
------------------- INLINE STYLES NEEDED -------------------
-------- All text sizes need tweaks to look natural --------
------------------------------------------------------------
*/

/* TODO revisit font sizes when more done */

/**
 * @description Picks a font-size for the note text based on rant length
 */
function noteFontSize(len: number): string {
  if (len <= 12) return "30cqi"; // super short - go big
  if (len <= 30) return "21cqi";
  if (len <= 80) return "13cqi";
  if (len <= 140) return "11cqi";
  return "9.5cqi";
}

/* TODO revisit line heights when more done */

/**
 * @description Picks a line-height for the note text based on rant length.
 */
function noteLineHeight(len: number): string {
  if (len <= 12) return "0.9em";
  if (len <= 30) return "1em";
  if (len <= 80) return "1em";
  if (len <= 140) return "1em";
  return "1.125em";
}

/**
 * @description Some typefaces are getting cut of on the edges.
 * Larger = a little padding. Small = not needed
 * This is probably partially due to dynamic line height
 * Note that this is INNER padding (on the text element itself)
 * > 🚗 PARKED, may need adjustments later but, for now, ret 0
 */
function noteInnerPadding(len: number): string {
  if (len <= 12) return "0";
  if (len <= 30) return "0";
  if (len <= 80) return "0";
  if (len <= 140) return "0";
  return "0";
}

/* 
------------------------------------------------------
------------------- POINTER UTILS --------------------
------------------------------------------------------

*/

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
  /** fired while dragging when this note enters/leaves the trash hitbox */
  onTrashHover: (over: boolean) => void;
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
  onTrashHover,
}: StickyNoteProps) {
  const noteRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // grab/drag scale - shrinks dock-style when held over the trash to telegraph the toss
  const scale = useMotionValue(1);

  // live horizontal drag velocity (px/s). useVelocity tracks the x motion value
  // per frame and self-zeroes the instant the pointer stops moving - even while
  // still held - so the lean always relaxes back to rest. (PanInfo.velocity only
  // updates on movement, which would leave a fling-then-hold note stuck leaning.)
  const xVel = useVelocity(x);
  // 1 while held, 0 when parked - gates the velocity lean so a resting note ignores it
  const dragging = useMotionValue(0);
  // the angle gravity pulls toward: the grab-zone hang while held, or the frozen
  // drop angle while parked. the speed lean is added on top of this.
  const restAngle = useMotionValue(baseRotation);

  // rotateTarget = rest + a speed-scaled lean. listed deps (NOT the bare-function
  // form) so all three stay subscribed - the function form collects deps on its
  // first run, where dragging=0 short-circuits before xVel is ever read, so the
  // lean would never recompute. LEAN_EASE curves it: slow nudges barely tilt,
  // fast flings whip toward the max.
  const rotateTarget = useTransform([xVel, restAngle, dragging], ([v, rest, on]: number[]) => {
    if (!on) return rest;
    const norm = clamp(v / LEAN_VELOCITY, -1, 1);
    const eased = Math.sign(norm) * Math.abs(norm) ** LEAN_EASE;
    return clamp(rest + eased * LEAN_MAX_DEG, -FROZEN_ANGLE_CAP, FROZEN_ANGLE_CAP);
  });
  // underdamped (ratio ~0.5) so it doesn't just glide to rest - it overshoots once
  // and swings back when you stop or change direction. that swing-back IS the
  // whiplash; a critically-damped spring (the old 170/24) can't produce it.
  const rotate = useSpring(rotateTarget, { stiffness: 200, damping: 12 });

  // tracks trash-hover so we only re-animate on enter/leave, not every drag frame
  const overTrash = useRef(false);

  /** @description Is the pointer currently inside the trash hitbox? */
  function pointerOverTrash(info: PanInfo): boolean {
    return pointInRect(info.point.x, info.point.y, trashRef.current?.getBoundingClientRect());
  }

  function handleDragStart(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    void animate(scale, 1.06, { duration: 0.15 });
    // which third did you grab? left -> hangs right, right -> hangs left, middle
    // -> straight. like pinching a heavy square by a corner and letting it dangle.
    const rect = noteRef.current?.getBoundingClientRect();
    const zone = rect ? (info.point.x - rect.left) / rect.width : 0.5;
    restAngle.set(zone < 0.34 ? GRAB_LEAN_DEG : zone > 0.66 ? -GRAB_LEAN_DEG : 0);
    dragging.set(1); // arm the velocity lean
  }

  function handleDrag(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    // the lean is fully reactive now (useVelocity -> rotateTarget -> spring), so
    // all we still do per drag frame is the trash dock-magnet.
    const over = pointerOverTrash(info);
    if (over !== overTrash.current) {
      overTrash.current = over;
      onTrashHover(over);
      void animate(scale, over ? 0.4 : 1.06, { type: "spring", stiffness: 400, damping: 26 });
    }
  }

  function handleDragEnd(_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    // freeze at the exact angle it's displaying right now so it sticks as-is. set
    // rest first, then disarm, so rotateTarget lands on the frozen value with no
    // intermediate frame snapping back to the grab-hang angle.
    const frozen = clamp(rotate.get(), -FROZEN_ANGLE_CAP, FROZEN_ANGLE_CAP);
    restAngle.set(frozen);
    dragging.set(0);
    onTrashHover(false);

    if (pointerOverTrash(info)) {
      onTrash(rant.id);
      return;
    }

    overTrash.current = false;
    void animate(scale, 1, { type: "spring", stiffness: 300, damping: 26 });

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
      ref={noteRef}
      className={styles.note}
      style={{
        left: `${xFrac * 100}%`,
        top: `${yFrac * 100}%`,
        background: color,
        x,
        y,
        rotate,
        scale,
      }}
      drag
      dragConstraints={constraintsRef}
      dragElastic={0.08}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      whileDrag={{ zIndex: 50, cursor: "grabbing" }}>
      <p
        className={styles.noteText}
        style={{
          fontSize: noteFontSize(rant.text.length),
          lineHeight: noteLineHeight(rant.text.length),

          padding: noteInnerPadding(rant.text.length),
        }}>
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

interface StickyBoardProps {
  rants: Rant[];
  addRant: (text: string, name: string, color?: number) => Promise<boolean>;
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
  // true while a dragged note is hovering the trash - arms the can's visual state
  const [trashArmed, setTrashArmed] = useState(false);

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
            onTrashHover={setTrashArmed}
          />
        );
      })}

      <ComposePad nextColor={nextColor} onStick={handleStick} />

      <div
        className={`${styles.trash} ${trashArmed ? styles.trashArmed : ""}`}
        ref={trashRef}
        aria-label="drag a note here to trash it">
        🗑️
      </div>
    </div>
  );
}
