import { createContext, useContext, useState, type ReactNode } from 'react'

interface ReducedMotionContextValue {
  animationsEnabled: boolean
  setAnimationsEnabled: (val: boolean) => void
}

const ReducedMotionContext = createContext<ReducedMotionContextValue>({
  animationsEnabled: true,
  setAnimationsEnabled: () => {},
})

/**
 * @description Wraps the app and provides animation preference state. Initializes
 * from the browser's prefers-reduced-motion media query - so reduced-motion users
 * get animations off by default, everyone else gets them on.
 * @param children - React subtree to wrap.
 * @author Chris "Mo" Mochinski
 */
export function ReducedMotionProvider({ children }: { children: ReactNode }) {
  const [animationsEnabled, setAnimationsEnabled] = useState(
    () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  return (
    <ReducedMotionContext.Provider value={{ animationsEnabled, setAnimationsEnabled }}>
      {children}
    </ReducedMotionContext.Provider>
  )
}

/**
 * @description Returns `animationsEnabled` boolean and its setter.
 * `true` = play animations, `false` = skip/reduce them.
 * @author Chris "Mo" Mochinski
 */
export const useReducedMotion = () => useContext(ReducedMotionContext)
