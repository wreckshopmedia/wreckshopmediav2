import { useEffect, useRef, useState } from "react";
import type { Rant } from "../../hooks/useRants";
import { StickyNote } from "./StickyNote";
import { ComposePad } from "./ComposePad";
import { NOTE_COLORS, mod, colorIndexFor, seededLayout } from "./stickyHelpers";
import styles from "./stickyBoard.module.css";

interface StickyBoardProps {
  rants: Rant[];
  addRant: (text: string, name: string, color?: number) => Promise<boolean>;
  updatePlacement: (id: string, posX: number, posY: number, rotation: number) => void;
  deleteRantSoft: (id: string) => void;
}

/**
 * @description Sticky-note canvas filling a single capped, centered region of the
 * viewport. Existing rants sit where they were dropped (stored as 0-1 fractions)
 * or scatter at a deterministic fallback spot if never placed; drag any one
 * anywhere - it sticks where dropped, persisting to the DB - or fling it onto the
 * trash to soft-delete it. The corner pad shows the next cycling color and lets
 * you scribble a new rant.
 * @author Chris "Mo" Mochinski
 */
export function StickyBoard({ rants, addRant, updatePlacement, deleteRantSoft }: StickyBoardProps) {
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
        const layout = seededLayout(rant.id);
        const placed = rant.posX != null && rant.posY != null;
        return (
          <StickyNote
            // key includes stored pos so committing a placement remounts cleanly
            key={`${rant.id}-${rant.posX ?? "s"}-${rant.posY ?? "s"}`}
            rant={rant}
            color={NOTE_COLORS[colorIndexFor(rant)]}
            xFrac={placed ? rant.posX! : layout.xFrac}
            yFrac={placed ? rant.posY! : layout.yFrac}
            baseRotation={rant.rotation ?? layout.tilt}
            constraintsRef={canvasRef}
            trashRef={trashRef}
            onCommit={updatePlacement}
            onTrash={deleteRantSoft}
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
