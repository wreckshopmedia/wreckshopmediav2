import { useState, useCallback } from "react";

export interface Rant {
  id: string;
  text: string;
  name: string;
  createdAt: string;
}

const STORAGE_KEY = "wsm_rants";

function loadRants(): Rant[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as Rant[];
  } catch {
    return [];
  }
}

function saveRants(rants: Rant[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rants));
}

/**
 * @description Rant CRUD via localStorage. When wreckshopmediav2-server endpoints
 * are ready, swap loadRants/saveRants for fetch calls and keep the same return shape.
 * @author Chris "Mo" Mochinski
 */
export function useRants() {
  const [rants, setRants] = useState<Rant[]>(loadRants);

  const addRant = useCallback(
    (text: string, name: string) => {
      const next: Rant = {
        id: crypto.randomUUID(),
        text: text.trim(),
        name: name.trim() || "Anonymous",
        createdAt: new Date().toISOString(),
      };
      const updated = [next, ...rants];
      saveRants(updated);
      setRants(updated);
    },
    [rants],
  );

  return { rants, addRant };
}
