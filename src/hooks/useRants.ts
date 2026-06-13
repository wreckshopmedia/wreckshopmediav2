import { useState, useCallback, useEffect } from "react";
import { scratchpad } from "../utils/scratchpad";

export interface Rant {
  id: string;
  name: string;
  text: string;
  createdAt: string;
}

// shape the server returns from /api/messages
interface ServerRow {
  id: number | string;
  name: string;
  message: string;
  created_at: string;
}

const API_BASE = import.meta.env.VITE_API_URL;

/** @description Maps the server's column names to the client's Rant shape. */
function toRant(row: ServerRow): Rant {
  return {
    id: String(row.id),
    name: row.name,
    text: row.message,
    createdAt: row.created_at,
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
    async (text: string, name: string): Promise<boolean> => {
      try {
        const res = await fetch(`${API_BASE}/api/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || "Anonymous",
            message: text.trim(),
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

  return { rants, loading, error, addRant };
}
