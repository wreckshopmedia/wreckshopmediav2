import { motion } from "motion/react";
import { useLocation } from "react-router-dom";
import { useHoverCapable } from "../../hooks/useHoverCapable";
import { MagneticLink } from "./MagneticLink";
import styles from "./navRow.module.css";

// tunable h1 animation values
const TITLE_SCALE_HERO = 1.0;      // landing / pre-reveal scale
const TITLE_SCALE_NAV = 0.9;      // settled nav scale
const TITLE_SPACING_HERO = "0.2em";
const TITLE_SPACING_NAV = "0.12em";

// each page owns a fixed highlighter ink from the sticky-note palette (fixed, never
// random, so a color starts to feel like that page). the tomato note is skipped on
// purpose - it's too strong behind small nav text to stay easily readable.
const LEFT_ROUTES = [
  { path: "/home", label: "Home", ink: "var(--sticky-note-yellow)" },
  { path: "/about", label: "About", ink: "var(--sticky-note-green)" },
  { path: "/contact", label: "Contact", ink: "var(--sticky-note-blue)" },
] as const;

const RIGHT_ROUTES = [
  { path: "/things", label: "Things", ink: "var(--sticky-note-peach)" },
  { path: "/stuff", label: "Stuff", ink: "var(--sticky-note-green)" },
  { path: "/rants", label: "Rants", ink: "var(--sticky-note-yellow)" },
] as const;

const ALL_ROUTES = [...LEFT_ROUTES, ...RIGHT_ROUTES];

interface NavRowProps {
  /**
   * When false, links sit at opacity 0 (landing pre-reveal). When true they
   * fade in - used on initial landing reveal and non-landing route mounts.
   */
  visible: boolean;
  /** When true, h1 skips its settle animation and mounts already in nav state (SiteLayout). */
  hillFlat?: boolean;
}

/**
 * @description Title row shared across all routes. "Wreck Shop" is center-locked
 * via CSS grid; route links flank it left and right. The active route gets a
 * highlighter swipe in its own sticky-note color (see MagneticLink).
 * @author Chris "Mo" Mochinski
 */
export function NavRow({ visible, hillFlat = false }: NavRowProps) {
  const { pathname } = useLocation();
  const magnetic = useHoverCapable();

  const renderLink = (r: (typeof ALL_ROUTES)[number], i: number) => {
    const isActive = r.path === pathname;
    return (
      <motion.div
        key={r.path}
        initial={{ opacity: visible ? 1 : 0 }}
        animate={{ opacity: visible ? 1 : 0 }}
        transition={{ opacity: { duration: 0.4, delay: visible ? 0.3 + i * 0.08 : 0 } }}>
        <MagneticLink
          to={r.path}
          label={r.label}
          isActive={isActive}
          magnetic={magnetic}
          index={ALL_ROUTES.indexOf(r)}
          ink={r.ink}
        />
      </motion.div>
    );
  };

  return (
    <div className={styles.titleRow} id="nav-row">
      <div className={styles.linkGroup}>{LEFT_ROUTES.map((r, i) => renderLink(r, i))}</div>
      <motion.h1
        className={styles.title}
        // when hillFlat (SiteLayout mounts already settled) start small, else a
        // HERO frame paints before the duration:0 jump and flashes big for a tick
        initial={
          hillFlat
            ? { scale: TITLE_SCALE_NAV, letterSpacing: TITLE_SPACING_NAV }
            : { scale: TITLE_SCALE_HERO, letterSpacing: TITLE_SPACING_HERO }
        }
        animate={{
          scale: visible ? TITLE_SCALE_NAV : TITLE_SCALE_HERO,
          letterSpacing: visible ? TITLE_SPACING_NAV : TITLE_SPACING_HERO,
        }}
        transition={
          visible && !hillFlat
            ? { type: "spring", stiffness: 100, damping: 18 }
            : { duration: 0 }
        }
        style={{ transformBox: "fill-box" }}>
        Wreck Shop
      </motion.h1>
      <div className={styles.linkGroup}>{RIGHT_ROUTES.map((r, i) => renderLink(r, i))}</div>
    </div>
  );
}
