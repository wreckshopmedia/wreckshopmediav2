import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../../components/Logo/logoIndex";
import { NavRow } from "../../components/NavRow/navRowIndex";
import {
  GarbageTruck,
  TRUCK_EXIT_MS,
  TRUCK_ROUTE,
} from "../../components/GarbageTruck/garbageTruckIndex";
import { RouteContext } from "../../context/routeContextIndex";
import { TruckProvider } from "../../context/truckContextIndex";
import { useReducedMotion } from "../../context/ReducedMotionContext";
import { scratchpad } from "../../utils/scratchpad";
import styles from "./siteLayout.module.css";

// per-route logo visual overrides - add entries here for more weird states
// (e.g. "/rants": { opacity: 0.7, filter: "blur(1px)" }). empty = no route tweaks.
const LOGO_ROUTE_FX: Record<string, { opacity: number; filter: string }> = {};

const DEFAULT_LOGO_FX = { opacity: 1, filter: "blur(0px)" };

// the reverse reveal (links out, title grows, hill puffs back up) settles by ~0.75s -
// hand off to the landing route right after so it mounts on the exact same frame state
const HOME_DELAY_MS = 800;

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
  const navigate = useNavigate();
  const { animationsEnabled } = useReducedMotion();
  const [leaving, setLeaving] = useState(false);

  /** @description Plays the landing reveal backwards, then drops back onto the splash page. */
  const handleTitleClick = () => {
    if (leaving) return;
    if (!animationsEnabled) {
      navigate("/");
      return;
    }
    setLeaving(true);
    // from /rants, hang on until the truck has driven fully off screen
    const delay = pathname === TRUCK_ROUTE ? Math.max(HOME_DELAY_MS, TRUCK_EXIT_MS + 50) : HOME_DELAY_MS;
    setTimeout(() => navigate("/"), delay);
  };

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
      {/* TruckProvider wraps BOTH the route Outlet and the truck so the rants board
          can hit-test the persistent truck's hopper. truck lives here (not in the
          route) so it survives nav and can drive itself in/out freely. */}
      <TruckProvider>
        <div className={styles.siteLayout} id="site-layout">
        {/* navAnchor is the coordinate origin for all zone content */}
        <div className={styles.navAnchor} id="nav-anchor">
          <motion.div
            className={styles.logoWrapper}
            animate={LOGO_ROUTE_FX[pathname] ?? DEFAULT_LOGO_FX}
            transition={{ duration: 0.27, ease: "easeIn" }}>
            <Logo hillFlat isLeaving={leaving} />
          </motion.div>
          {/* wrapper is the positioning context so the notice can pin just under
              the nav row without adding height to the centered navAnchor flow */}
          <div className={styles.navRowWrap}>
            <NavRow visible={!leaving} hillFlat onTitleClick={handleTitleClick} />
          </div>

          {/* canvas is inside navAnchor - zones offset from nav, not viewport corners */}
          {/* key swap forces remount on route change - no AnimatePresence needed for fade-in only */}
          <motion.main
            key={pathname}
            id="main"
            className={styles.contentCanvas}
            initial={{ opacity: 0 }}
            animate={{ opacity: leaving ? 0 : 1 }}
            transition={{ duration: leaving ? 0.25 : 0.35, ease: leaving ? "easeOut" : "easeIn" }}>
            <Outlet />

          </motion.main>
        </div>
            <motion.p
              className={styles.constructionNotice}
              initial={{ opacity: 0 }}
              animate={{ opacity: leaving ? 0 : 0.9 }}
              transition={leaving ? { duration: 0.3 } : { duration: 0.5, delay: 0.6 }}>
              notice: this site is very much under construction
            </motion.p>
            {/* tiny on purpose - mostly here so Google's OAuth verification sees a policy link */}
            <Link
              to="/privacy"
              className={styles.privacyLink}
              style={leaving ? { opacity: 0 } : undefined}>
              privacy
            </Link>
        </div>

        {/* persistent across all shell routes - drives itself in on /rants, out elsewhere */}
        <GarbageTruck departing={leaving} />
      </TruckProvider>
    </RouteContext.Provider>
  );
}
