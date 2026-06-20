import { useEffect, useRef, useState } from "react";
import type { Rant } from "../../hooks/useRants";
import { useTruck } from "../../context/truckContextIndex";
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
 * anywhere - it sticks where dropped, persisting to the DB - or fling it into the
 * garbage truck's hopper to soft-delete it. The corner pad shows the next cycling
 * color and lets you scribble a new rant.
 * @author Chris "Mo" Mochinski
 */
export function StickyBoard({ rants, addRant, updatePlacement, deleteRantSoft }: StickyBoardProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  // the drop target is now the persistent garbage truck's hopper (up in SiteLayout).
  // notes can only be tossed once it's parked; hover arms its lip via setHopperArmed.
  const { compactorRef, parked, setHopperArmed, ingest } = useTruck();

  // a successful toss: soft-delete the note AND tell the truck to chomp/swallow,
  // handing over the note's color so the swallowed clone matches what was tossed.
  const tossIntoHopper = (id: string, color: string) => {
    deleteRantSoft(id);
    ingest(color);
  };

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

  // manually advance the pad's color without sticking a note - the sneaky cycle button.
  const cycleColor = () => setCursor((c) => mod((c ?? 0) + 1, NOTE_COLORS.length));

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
        const noteColor = NOTE_COLORS[colorIndexFor(rant)];
        return (
          <StickyNote
            // key includes stored pos so committing a placement remounts cleanly
            key={`${rant.id}-${rant.posX ?? "s"}-${rant.posY ?? "s"}`}
            rant={rant}
            color={noteColor}
            xFrac={placed ? rant.posX! : layout.xFrac}
            yFrac={placed ? rant.posY! : layout.yFrac}
            baseRotation={rant.rotation ?? layout.tilt}
            constraintsRef={canvasRef}
            trashRef={compactorRef}
            dropEnabled={parked}
            onCommit={updatePlacement}
            onTrash={() => tossIntoHopper(rant.id, noteColor)}
            onTrashHover={setHopperArmed}
          />
        );
      })}

      <ComposePad nextColor={nextColor} onStick={handleStick} onCycleColor={cycleColor} />
    </div>
  );
}
