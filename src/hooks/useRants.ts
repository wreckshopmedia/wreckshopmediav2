import { useState, useCallback, useEffect } from "react";
import { scratchpad } from "../utils/scratchpad";

export interface Rant {
  id: string;
  name: string;
  text: string;
  createdAt: string;
  /** palette index locked at creation; null on legacy rows pre-migration */
  colorIndex: number | null;
  /** 0-1 fraction of the canvas; null until the note has been placed */
  posX: number | null;
  posY: number | null;
  /** resting angle in degrees; null until placed */
  rotation: number | null;
}

// shape the server returns from /api/messages
interface ServerRow {
  id: number | string;
  name: string;
  message: string;
  created_at: string;
  color: number | null;
  pos_x: number | null;
  pos_y: number | null;
  rotation: number | null;
}

const API_BASE = import.meta.env.VITE_API_URL;

/** @description Maps the server's column names to the client's Rant shape. */
function toRant(row: ServerRow): Rant {
  return {
    id: String(row.id),
    name: row.name,
    text: row.message,
    createdAt: row.created_at,
    colorIndex: row.color,
    posX: row.pos_x,
    posY: row.pos_y,
    rotation: row.rotation,
  };
}

/**
 * @description Fetches and posts rants via the wreckshopmediav2-server API.
 * Polls every 30s to pick up new rants from other visitors.
 * VITE_API_URL drives the base URL - set in .env.local for dev, Railway env
 * vars for production.
 * @author Chris "Mo" Mochinski
 */
export function useRants() {
  const [rants, setRants] = useState<Rant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRants = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/messages`);
      if (!res.ok) throw new Error(`server ${res.status}`);
      const rows = (await res.json()) as ServerRow[];
      setRants(rows.map(toRant));
      setError(null);
    } catch (err) {
      setError("could not load rants");
      scratchpad("[useRants] fetch error →", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // initial load + poll every 30s to catch new rants from other visitors
  useEffect(() => {
    void fetchRants();
    const poll = setInterval(() => void fetchRants(), 30_000);
    return () => clearInterval(poll);
  }, [fetchRants]);

  /**
   * @description POSTs a new rant. Returns true on success, false on failure.
   * On success, prepends the server-returned row immediately (no wait for next poll).
   */
  const addRant = useCallback(
    async (text: string, name: string, color?: number): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE}/api/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || "Anonymous",
            message: text.trim(),
            // client owns the cycle so the stored color matches the pad preview
            color,
          }),
        });
        if (!res.ok) throw new Error(`server ${res.status}`);
        const row = (await res.json()) as ServerRow;
        setRants((prev) => [toRant(row), ...prev]);
        return true;
      } catch (err) {
        scratchpad("[useRants] post error →", err);
        return false;
      }
    },
    [],
  );

  /**
   * @description Persists where a note was dropped - PATCHes pos (0-1 fractions)
   * and rotation. Optimistic: updates local state immediately, fires the request
   * in the background. Silently logs on failure (placement just isn't saved).
   */
  const updatePlacement = useCallback(
    (id: string, posX: number, posY: number, rotation: number) => {
      setRants((prev) => prev.map((r) => (r.id === id ? { ...r, posX, posY, rotation } : r)));
      void fetch(`${API_BASE}/api/messages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pos_x: posX, pos_y: posY, rotation }),
      }).catch((err) => scratchpad("[useRants] patch error →", err));
    },
    [],
  );

  /**
   * @description Trashes a note for good - optimistically removes it locally, then
   * DELETEs on the server. On failure the next poll will bring it back.
   */
  const deleteRant = useCallback((id: string) => {
    setRants((prev) => prev.filter((r) => r.id !== id));
    void fetch(`${API_BASE}/api/messages/${id}`, { method: "DELETE" }).catch((err) =>
      scratchpad("[useRants] delete error →", err),
    );
  }, []);

  /**
   * @description Sets note as "deleted" by updating new deleted boolean column
   * @param id The ID of the rant to mark as deleted.
   * @returns void
   */
  const deleteRantSoft = useCallback((id: string) => {
    setRants((prev) => prev.filter((r) => r.id !== id));
    void fetch(`${API_BASE}/api/messages/${id}/delete`, { method: "PATCH" }).catch((err) =>
      scratchpad("[useRants] soft delete error →", err),
    );
  }, []);

  return { rants, loading, error, addRant, updatePlacement, deleteRant, deleteRantSoft };
}
