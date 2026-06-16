import { useEffect, useState } from "react";

/**
 * @description True only on devices that actually hover with a precise pointer
 * (desktop mouse/trackpad). Gate any hover/magnetic/cursor-driven effect behind
 * this so touch devices - which fake hover and would get stuck states - skip it
 * entirely. Re-evaluates if the pointer capability changes (e.g. detachable
 * keyboards / hybrid devices).
 * @author Chris "Mo" Mochinski
 */
export function useHoverCapable(): boolean {
  // start false so SSR / first paint assumes touch and never flashes hover state
  const [capable, setCapable] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCapable(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCapable(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return capable;
}
