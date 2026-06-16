import { useRants } from "../../hooks/useRants";
import { StickyBoard } from "./rantsIndex";
// parked alternatives - swap any of these back in if needed
// import { RantForm } from "./rantsIndex";
// import { RantCard } from "./rantsIndex";
// import { RantList } from "./rantsIndex";

/**
 * @description Rants page. A sticky-note board: existing rants scatter across a
 * fixed-aspect board you can drag notes around on (or fling onto the trash), and
 * a corner pad lets you peel a blank and scribble a new one. Hits
 * wreckshopmediav2-server - VITE_API_URL controls the base URL.
 * @author Chris "Mo" Mochinski
 */
export function Rants() {
  // deleteRant (hard delete) stays parked in the hook for a future admin-only view;
  // the public board only ever soft-deletes via deleteRantSoft.
  const { rants, addRant, updatePlacement, deleteRantSoft } = useRants();

  return (
    <>
      {/* ---------- STICKY NOTE BOARD ---------- */}
      {/* renders its own fixed, viewport-filling canvas - no wrapper needed */}
      <StickyBoard
        rants={rants}
        addRant={addRant}
        updatePlacement={updatePlacement}
        deleteRantSoft={deleteRantSoft}
      />

      {/* ---------- PARKED VIEWS (swap in if needed) ---------- */}
      {/* <RantForm addRant={addRant} /> */}
      {/* <div className={styles.rantCardWrap}><RantCard rants={rants} /></div> */}
      {/* <RantList rants={rants} loading={loading} error={error} /> */}
    </>
  );
}
