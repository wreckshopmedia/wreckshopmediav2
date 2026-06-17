import { useEffect } from "react";
import { motion } from "motion/react";
import { Outlet, useLocation } from "react-router-dom";
import { Logo } from "../../components/Logo/logoIndex";
import { NavRow } from "../../components/NavRow/navRowIndex";
import { RouteContext } from "../../context/routeContextIndex";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./siteLayout.module.css";

// per-route logo visual overrides - add entries here for more weird states
// (e.g. "/rants": { opacity: 0.7, filter: "blur(1px)" }). empty = no route tweaks.
const LOGO_ROUTE_FX: Record<string, { opacity: number; filter: string }> = {};

const DEFAULT_LOGO_FX = { opacity: 1, filter: "blur(0px)" };

/**
 * @description Full-viewport shell for all non-landing routes. The navAnchor is a
 * bounded, viewport-centered pseudo-canvas (capped height, never scrolls) with the
 * logo + nav cluster locked dead-center. contentCanvas overlays it 1:1, so every
 * route positions content against this canvas (top:50% = nav center) and can use
 * cqi/cqb to stay pinned responsively on both axes.
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
          <motion.div
            className={styles.logoWrapper}
            animate={LOGO_ROUTE_FX[pathname] ?? DEFAULT_LOGO_FX}
            transition={{ duration: 0.27, ease: "easeIn" }}>
            <Logo hillFlat />
          </motion.div>
          {/* wrapper is the positioning context so the notice can pin just under
              the nav row without adding height to the centered navAnchor flow */}
          <div className={styles.navRowWrap}>
            <NavRow visible hillFlat />
          </div>

          {/* canvas is inside navAnchor - zones offset from nav, not viewport corners */}
          {/* key swap forces remount on route change - no AnimatePresence needed for fade-in only */}
          <motion.main
            key={pathname}
            id="main"
            className={styles.contentCanvas}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeIn" }}>
            <Outlet />

          </motion.main>
        </div>
            <motion.p
              className={styles.constructionNotice}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.9 }}
              transition={{ duration: 0.5, delay: 0.6 }}>
              notice: this site is very much under construction
            </motion.p>
      </div>
    </RouteContext.Provider>
  );
}
