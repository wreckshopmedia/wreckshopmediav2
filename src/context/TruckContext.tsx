import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface TruckContextValue {
  /** the invisible hopper-hitbox rect inside the truck SVG - notes hit-test against it */
  compactorRef: React.RefObject<SVGRectElement | null>;
  /** true once the truck has fully reversed in and the hopper can accept notes */
  parked: boolean;
  setParked: (v: boolean) => void;
  /** true while a dragged note is hovering the hopper - lets the truck lip react */
  hopperArmed: boolean;
  setHopperArmed: (v: boolean) => void;
  /** bumped each time a note is tossed in - the truck watches it to chomp/swallow */
  ingestNonce: number;
  ingest: () => void;
}

const noop = () => {};

const TruckContext = createContext<TruckContextValue>({
  compactorRef: { current: null },
  parked: false,
  setParked: noop,
  hopperArmed: false,
  setHopperArmed: noop,
  ingestNonce: 0,
  ingest: noop,
});

/**
 * @description Bridges the persistent garbage truck (which lives up in SiteLayout so
 * it survives route changes) and the note-drag logic down in the Rants route. The
 * truck registers its hopper element + reports when it's parked; the sticky notes
 * read those to know where - and whether - they can be tossed.
 * @param children - the subtree that contains both the truck and the rants board.
 * @author Chris "Mo" Mochinski
 */
export function TruckProvider({ children }: { children: ReactNode }) {
  const compactorRef = useRef<SVGRectElement>(null);
  const [parked, setParked] = useState(false);
  const [hopperArmed, setHopperArmed] = useState(false);
  const [ingestNonce, setIngestNonce] = useState(0);
  const ingest = useCallback(() => setIngestNonce((n) => n + 1), []);

  const value = useMemo(
    () => ({ compactorRef, parked, setParked, hopperArmed, setHopperArmed, ingestNonce, ingest }),
    [parked, hopperArmed, ingestNonce, ingest],
  );

  return <TruckContext.Provider value={value}>{children}</TruckContext.Provider>;
}

/** @description Access the shared truck state (hopper ref, parked, hopper-armed). */
export function useTruck() {
  return useContext(TruckContext);
}
