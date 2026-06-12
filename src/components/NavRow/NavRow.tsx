import { motion } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import styles from "./navRow.module.css";

const LEFT_ROUTES = [
  { path: "/home", label: "Home" },
  { path: "/about", label: "About" },
  { path: "/contact", label: "Contact" },
] as const;

const RIGHT_ROUTES = [
  { path: "/things", label: "Things" },
  { path: "/stuff", label: "Stuff" },
  { path: "/rants", label: "Rants" },
] as const;

const ALL_ROUTES = [...LEFT_ROUTES, ...RIGHT_ROUTES];

interface NavRowProps {
  /**
   * When false, links sit at opacity 0 (landing pre-reveal). When true they
   * fade in - used on initial landing reveal and non-landing route mounts.
   */
  visible: boolean;
}

/**
 * @description Title row shared across all routes. "Wreck Shop" is center-locked
 * via CSS grid; route links flank it left and right. Active route link slides
 * down 7px with a spring - no extra elements, no per-change opacity toggling.
 * @author Chris "Mo" Mochinski
 */
export function NavRow({ visible }: NavRowProps) {
  const { pathname } = useLocation();

  const renderLink = (r: (typeof ALL_ROUTES)[number], i: number) => {
    const isActive = r.path === pathname;
    return (
      <motion.div
        key={r.path}
        initial={{ opacity: visible ? 1 : 0, y: 0 }}
        animate={{
          opacity: visible ? 1 : 0,
          y: isActive ? -8 : 0,
        }}
        transition={{
          opacity: { duration: 0.4, delay: visible ? 0.3 + i * 0.08 : 0 },
          y: isActive
            ? { type: "tween", duration: 0.175, ease: "easeOut" }
            : { type: "spring", stiffness: 320, damping: 10 },
        }}>
        <Link to={r.path} className={clsx(styles.routeLink, isActive && styles.activeLink)}>
          {r.label}
        </Link>
      </motion.div>
    );
  };

  return (
    <div className={styles.titleRow}>
      <div className={styles.linkGroup}>{LEFT_ROUTES.map((r, i) => renderLink(r, i))}</div>
      <h1 className={styles.title}>Wreck Shop</h1>
      <div className={styles.linkGroup}>{RIGHT_ROUTES.map((r, i) => renderLink(r, i))}</div>
    </div>
  );
}
