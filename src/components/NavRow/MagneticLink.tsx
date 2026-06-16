import { useEffect, useRef, useState } from "react";
import { motion, useSpring } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import styles from "./navRow.module.css";

// how far the link reaches toward the cursor, as a fraction of the distance from
// its center to the pointer. higher = grabbier. spring gives the rubbery settle.
const STRENGTH = 0.4;
const SPRING = { stiffness: 220, damping: 16, mass: 0.5 } as const;

interface MagneticLinkProps {
  to: string;
  label: string;
  isActive: boolean;
  /** only true on hover-capable devices - on touch we render a plain link */
  magnetic: boolean;
}

/**
 * @description A nav link that magnetically reaches toward the cursor when it
 * gets near, dragging a soft pill surround along with it, then springs back on
 * leave. Pure Motion (no custom cursor). On touch devices it short-circuits to a
 * plain link - no listeners, no stuck hover states.
 * @author Chris "Mo" Mochinski
 */
export function MagneticLink({ to, label, isActive, magnetic }: MagneticLinkProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(false);
  // springs the text + pill ride toward the pointer; set imperatively on move
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  // a route change swaps links between plain/magnetic without firing onMouseLeave,
  // so hover state goes stale (pill stuck on the link you just left). force every
  // link's hover + offset off on navigation; real movement re-arms it afterward.
  useEffect(() => {
    setHovered(false);
    x.set(0);
    y.set(0);
  }, [pathname, x, y]);

  const linkClass = clsx(styles.routeLink, isActive && styles.activeLink);

  // plain link (no magnetic machinery) on touch devices OR for the active route -
  // the page you're already on shouldn't grab, pill, or react to the cursor
  if (!magnetic || isActive) {
    return (
      <Link to={to} className={linkClass}>
        {label}
      </Link>
    );
  }

  function handleMove(e: React.MouseEvent<HTMLSpanElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    // drive hover off real movement, not mouseenter - a route change reflows the
    // nav and can slide a link under a stationary cursor, which fires mouseenter
    // and would pop the pill onto the wrong link. movement can't be faked that way.
    setHovered(true);
    // distance from the link's center to the cursor, scaled down by STRENGTH
    x.set((e.clientX - (rect.left + rect.width / 2)) * STRENGTH);
    y.set((e.clientY - (rect.top + rect.height / 2)) * STRENGTH);
  }

  function reset() {
    setHovered(false);
    x.set(0);
    y.set(0);
  }

  return (
    <span
      ref={ref}
      className={styles.magWrap}
      onMouseMove={handleMove}
      onMouseLeave={reset}>
      <motion.span className={styles.magInner} style={{ x, y }}>
        <motion.span
          className={styles.magPill}
          aria-hidden
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: hovered ? 1 : 0, scale: hovered ? 1 : 0.7 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        />
        <Link to={to} className={linkClass}>
          {label}
        </Link>
      </motion.span>
    </span>
  );
}
