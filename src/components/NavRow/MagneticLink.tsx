import { useEffect, useRef, useState } from "react";
import { motion, useSpring } from "motion/react";
import { Link, useLocation } from "react-router-dom";
import { clsx } from "clsx";
import { ScribbleOval } from "../Scribble/scribbleIndex";
import styles from "./navRow.module.css";

// how far the link reaches toward the cursor, as a fraction of the distance from
// its center to the pointer. higher = grabbier. spring gives the rubbery settle.
const STRENGTH = 0.4;
const SPRING = { stiffness: 220, damping: 16, mass: 0.5 } as const;

// a softer cousin of the social icons' pop - words don't need to jump as far as icons.
// snappy up, lazier down, so the shrink lags the grow like the scribble's erase does.
const HOVER_SCALE = 1.06;
const SCALE_SPRING_UP = { type: "spring", stiffness: 380, damping: 17 } as const;
const SCALE_SPRING_DOWN = { type: "spring", stiffness: 210, damping: 22 } as const;

interface MagneticLinkProps {
  to: string;
  label: string;
  isActive: boolean;
  /** only true on hover-capable devices - on touch we render a plain link */
  magnetic: boolean;
  /** position in the nav, seeds this link's own pen-loop wobble */
  index: number;
}

/**
 * @description A nav link that magnetically reaches toward the cursor when it gets
 * near, scribbling a hand-drawn pen oval around itself, then springs back and erases
 * on leave. The current page stays circled (fainter ink, no interaction) so you can
 * see where you are. On touch devices the magnet and hover are skipped, but the
 * current-page oval still shows.
 * @author Chris "Mo" Mochinski
 */
export function MagneticLink({ to, label, isActive, magnetic, index }: MagneticLinkProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(false);
  // springs the text + oval ride toward the pointer; set imperatively on move
  const x = useSpring(0, SPRING);
  const y = useSpring(0, SPRING);

  // a route change can slide links around without firing onMouseLeave, so hover
  // state goes stale (oval stuck on the link you just left). force every link's
  // hover + offset off on navigation; real movement re-arms it afterward. the hover
  // flag resets during render (React's "adjust state on prop change" pattern) and
  // only the springs, which live outside React state, reset in the effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setHovered(false);
  }
  useEffect(() => {
    x.set(0);
    y.set(0);
  }, [pathname, x, y]);

  // the page you're already on shouldn't grab, pop, or react to the cursor - and
  // neither should anything on touch, where hover states just get stuck
  const interactive = magnetic && !isActive;

  function handleMove(e: React.MouseEvent<HTMLSpanElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    // drive hover off real movement, not mouseenter - a route change reflows the
    // nav and can slide a link under a stationary cursor, which fires mouseenter
    // and would pop the oval onto the wrong link. movement can't be faked that way.
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

  // kept as one tree for every state (hover, current, touch) so the oval can erase
  // itself on the page you just left instead of vanishing with a swapped-out link
  return (
    <span
      ref={ref}
      className={styles.magWrap}
      onMouseMove={interactive ? handleMove : undefined}
      onMouseLeave={interactive ? reset : undefined}>
      <motion.span
        className={styles.magInner}
        style={{ x, y }}
        animate={{ scale: hovered ? HOVER_SCALE : 1 }}
        transition={{ scale: hovered ? SCALE_SPRING_UP : SCALE_SPRING_DOWN }}>
        <ScribbleOval
          active={hovered || isActive}
          variant={index}
          className={clsx(styles.navScribble, isActive && styles.navScribbleCurrent)}
        />
        <Link to={to} className={clsx(styles.routeLink, isActive && styles.activeLink)}>
          {label}
        </Link>
      </motion.span>
    </span>
  );
}
