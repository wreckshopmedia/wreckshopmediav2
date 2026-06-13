import { createContext, useContext } from 'react'

interface RouteContextValue {
  pathname: string
}

const RouteContext = createContext<RouteContextValue>({ pathname: '' })

/**
 * @description Provides current pathname to Logo, NavRow, and any element that
 * needs to react to the active route without its own useLocation call.
 * @author Chris "Mo" Mochinski
 */
export function useRouteContext() {
  return useContext(RouteContext)
}

export { RouteContext }
