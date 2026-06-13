import { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import { Logo } from "../../components/Logo/logoIndex";
import { NavRow } from "../../components/NavRow/navRowIndex";
import { RouteContext } from "../../context/routeContextIndex";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./siteLayout.module.css";

/**
 * @description Full-viewport canvas for all non-landing routes. The navAnchor is
 * vertically centered and never moves. contentCanvas lives inside navAnchor so all
 * zone positions are relative to the nav, not the viewport edges.
 * @author Chris "Mo" Mochinski
 */
export function SiteLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    scratchpad(
      "%c[SiteLayout] %cRouteContext →",
      "color: #22181C; font-weight: bold; font-family: monospace; font-size: 11px;",
      "color: #888;",
      { pathname },
    );
  }, [pathname]);

  return (
    <RouteContext.Provider value={{ pathname }}>
      <div className={styles.siteLayout} id="site-layout">
        {/* navAnchor is the coordinate origin for all zone content */}
        <div className={styles.navAnchor} id="nav-anchor">
          <div className={styles.logoWrapper}>
            <Logo hillFlat />
          </div>
          <NavRow visible hillFlat />

          {/* canvas is inside navAnchor - zones offset from nav, not viewport corners */}
          <AnimatePresence mode="sync">
            <motion.main
              key={pathname}
              id="main"
              className={styles.contentCanvas}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}>
              <Outlet />
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </RouteContext.Provider>
  );
}
