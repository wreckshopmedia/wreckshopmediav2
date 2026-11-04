import { useEffect, useRef } from "react";
import { motion, useAnimation } from "motion/react";
import clsx from "clsx";
import { useReducedMotion } from "../../context/ReducedMotionContext";
import styles from "./logo.module.css";

// tunable visual constants - change these before digging into the JSX
const SCALE_HERO = 1.15;    // logo scale on the landing page (inflated, pre-click)
const SCALE_NAV = 1.0;     // logo scale once in the nav - the natural resting size

const HILL_SCALE_X = 5;  // how wide the hill spreads during the flatten
const HILL_SCALE_Y = 0.25;  // how flat the hill gets
const HILL_STROKE = 12;    // stroke width at peak hill flatten

const SPRING_STIFFNESS = 120;
const SPRING_DAMPING = 25;

interface LogoProps {
  onReady?: () => void;
  isRevealing?: boolean;
  /** when true, hill starts already flat - used on all non-landing routes */
  hillFlat?: boolean;
  /** when true, plays the reveal backwards (hill puffs back up) on the way home to / */
  isLeaving?: boolean;
}

/**
 * @description Wreck Shop SVG logo. When isRevealing is true, the hill flattens upward
 * into a wide horizontal line. Pass hillFlat to render it pre-flattened (non-landing routes),
 * and isLeaving to puff the hill back up so it lands exactly on the landing page's start.
 * @author Chris "Mo" Mochinski
 */
export function Logo({
  onReady,
  isRevealing = false,
  hillFlat = false,
  isLeaving = false,
}: LogoProps) {
  const { animationsEnabled } = useReducedMotion();
  const hillControls = useAnimation();

  // capture onReady in a ref so the mount effect doesn't re-fire when Landing re-renders
  const onReadyRef = useRef(onReady);
  // no load animation - fire ready once on mount only
  useEffect(() => {
    onReadyRef.current?.();
  }, []);

  // flatten the hill upward when the landing button is clicked
  useEffect(() => {
    if (isRevealing && animationsEnabled) {
      void hillControls.start({
        scaleY: HILL_SCALE_Y,
        scaleX: HILL_SCALE_X,
        strokeWidth: HILL_STROKE,
        transition: {
          scaleY: { duration: 0.3, ease: "easeIn" },
          scaleX: { duration: 0.5,  ease: "easeOut" },
          strokeWidth: { duration: 0.35, ease: "easeIn" },
        },
      });
    }
  }, [isRevealing, animationsEnabled, hillControls]);

  // the reveal in reverse - width pulls in first, then the hill pops back up out of the line
  useEffect(() => {
    if (isLeaving && animationsEnabled) {
      void hillControls.start({
        scaleY: 1,
        scaleX: 1,
        strokeWidth: 3,
        transition: {
          scaleX: { duration: 0.5, ease: "easeIn" },
          scaleY: { duration: 0.3, delay: 0.2, ease: "easeOut" },
          strokeWidth: { duration: 0.35, delay: 0.15, ease: "easeOut" },
        },
      });
    }
  }, [isLeaving, animationsEnabled, hillControls]);

  return (
    // figma re-exported this art on a bigger padded canvas (473x672), so the viewBox crops
    // back to the original 381x615 frame - keeps the ground line flush with the box bottom
    // and the logo the same on-screen size. offset = the padding figma added (left 40, top 13.5)
    <svg
      id="logo-svg"
      className={clsx(
        styles.logo,
        (isRevealing || hillFlat) && !isLeaving && styles.entered,
        isLeaving && styles.leaving,
      )}
      viewBox="40.03 13.52 381 615"
      fill="none"
      xmlns="http://www.w3.org/2000/svg">
      <g id="TREE IDEA">
        {/* boat + tree scale toward bottom center on reveal; hill is independent */}
        <motion.g
          id="boat-tree-content"
          // mount straight at the target scale - without this Motion paints one frame at
          // scale(1) first, which flashed a tiny tree when landing mounted mid-trip home
          initial={false}
          animate={{
            scale: isLeaving ? SCALE_HERO : isRevealing || hillFlat ? SCALE_NAV : SCALE_HERO,
          }}
          transition={
            isRevealing || isLeaving
              ? { type: 'spring', stiffness: SPRING_STIFFNESS, damping: SPRING_DAMPING }
              : { duration: 0 }
          }
          style={{ transformBox: 'fill-box', originX: '50%', originY: '100%' }}
        >
          <g id="BOAT">
            <path
              id="BLACK INNER"
              d="M367.965 283.441C369.178 283.873 282.96 275.71 223.122 268.732C163.282 261.753 114.663 258.501 116 256.5C117.337 254.499 191.508 256.632 236.821 262.988C277.899 268.749 367.965 283.441 367.965 283.441Z"
              fill="#A48165"
              stroke="black"
              strokeWidth="2"
            />
            <g id="SAIL">
              <path
                id="front-sail"
                d="M180.75 225.376L280.277 56.6019L258.827 240.838L180.75 225.376Z"
                fill="url(#paint0_linear_3045_876)"
                stroke="black"
                strokeWidth="2"
              />
              <path
                id="back-sail"
                d="M343.691 253.47L278.356 84.1693L259.976 242.027L343.691 253.47Z"
                fill="url(#paint1_linear_3045_876)"
                stroke="black"
                strokeWidth="2"
              />
              <path
                id="mast"
                d="M283.49 45.3848L282.534 45.256C281.756 45.1513 281.047 45.7284 280.951 46.545L253.224 281.675C253.128 282.491 253.68 283.238 254.458 283.343L255.415 283.472C256.193 283.576 256.901 282.999 256.998 282.183L284.725 47.053C284.821 46.2364 284.268 45.4895 283.49 45.3848Z"
                fill="black"
                stroke="black"
                strokeWidth="2"
              />
            </g>
            <g id="hull">
              <g id="Vector">
                <mask
                  id="path-5-outside-1_3045_876"
                  maskUnits="userSpaceOnUse"
                  x="183.059"
                  y="241.856"
                  width="67.9459"
                  height="40.6484"
                  fill="black">
                  <rect fill="white" x="183.059" y="241.856" width="67.9459" height="40.6484" />
                  <path d="M193.147 250.5C194.645 247.441 197.946 245.691 201.312 246.175L236.643 251.251C239.419 251.649 241.761 253.507 242.78 256.113C244.418 260.308 245.805 263.856 247.241 267.531C249.372 272.985 244.94 278.779 239.106 278.165L193.581 273.382C188.198 272.816 185.033 267.083 187.415 262.213L193.147 250.5Z" />
                </mask>
                <path
                  d="M193.147 250.5C194.645 247.441 197.946 245.691 201.312 246.175L236.643 251.251C239.419 251.649 241.761 253.507 242.78 256.113C244.418 260.308 245.805 263.856 247.241 267.531C249.372 272.985 244.94 278.779 239.106 278.165L193.581 273.382C188.198 272.816 185.033 267.083 187.415 262.213L193.147 250.5Z"
                  fill="#F3EDDA"
                />
                <path
                  d="M193.147 250.5C194.645 247.441 197.946 245.691 201.312 246.175L236.643 251.251C239.419 251.649 241.761 253.507 242.78 256.113C244.418 260.308 245.805 263.856 247.241 267.531C249.372 272.985 244.94 278.779 239.106 278.165L193.581 273.382C188.198 272.816 185.033 267.083 187.415 262.213L193.147 250.5Z"
                  stroke="black"
                  strokeWidth="4"
                  mask="url(#path-5-outside-1_3045_876)"
                />
              </g>
              <path
                id="Vector_2"
                d="M201.695 256.21C202.359 254.875 203.784 254.092 205.263 254.247L229.189 256.761C230.67 256.917 231.891 257.979 232.25 259.42L235.21 271.319L196.219 267.223L201.695 256.21Z"
                fill="#7BA170"
                stroke="black"
                strokeWidth="2"
              />
            </g>
            <g id="Group 42">
              <path
                id="boat-tan-layer"
                d="M125.223 275.371L115.786 256.422C115.417 255.916 116.834 256.251 117.455 256.336C128.967 257.909 198.599 266.452 245.475 271.084C292.378 275.718 361.93 282.487 369.735 283.246C370.142 283.285 370.402 283.655 370.337 284.058C370.668 286.992 369.154 297.079 368.223 301.871C367.291 306.663 366.514 309.33 364.723 313.871C362.745 318.885 359.388 323.683 358.385 326.131C358.271 326.41 358.038 326.578 357.738 326.562C351.964 326.25 293.064 323.048 254.718 319.784C217.006 316.574 159.154 309.899 154.675 309.38C154.477 309.357 154.332 309.258 154.215 309.097C154.215 309.097 143.631 299.454 137.723 292.475C132.377 286.161 129.615 282.382 125.223 275.371Z"
                fill="#FBF8EF"
              />
              <path
                id="blue-boat-bottom"
                d="M156.031 311.004C156.031 311.004 147.461 300.951 141.527 293.508C135.742 286.25 128.027 275.004 128.027 275.004C128.027 275.004 200.597 285.781 249.527 291.008C295.187 295.885 367.527 301.504 367.527 301.504C367.527 301.504 366.126 309.015 364.031 314.004C361.723 319.5 358.531 327.004 358.531 327.004C358.531 327.004 263.506 326.94 199.51 318.13C181.169 315.605 156.031 311.004 156.031 311.004Z"
                fill="url(#paint2_linear_3045_876)"
              />
              <path
                id="boat-stroke-see-thru"
                d="M367.527 301.012C367.527 301.012 365.768 309.045 364.031 314.004C362.304 318.935 359.693 323.823 358.69 326.272C358.575 326.55 358.343 326.719 358.043 326.703C352.268 326.391 275.373 325.768 237.027 322.504C201.527 319.482 167.527 314.004 154.98 309.521C154.782 309.498 154.636 309.398 154.52 309.238C154.52 309.238 145.783 299.197 140.027 292.004C135.055 285.79 127.527 275.004 127.527 275.004L116.091 256.562C115.722 256.057 117.139 256.391 117.76 256.476C129.272 258.05 198.903 266.592 245.779 271.225C292.682 275.859 362.235 282.627 370.04 283.386C370.447 283.426 370.707 283.795 370.642 284.199C370.04 290.504 367.527 301.012 367.527 301.012ZM127.527 275.004C127.527 275.004 197.422 285.509 245.693 290.616C294.858 295.818 367.527 301.012 367.527 301.012"
                stroke="black"
                strokeWidth="2"
              />
            </g>
          </g>
          <g id="TREE">
            <g id="TREE CANOPY">
              <path
                id="Vector_3"
                d="M172.68 322.173C173.782 335.179 158.607 375.494 129.224 374.855C102.017 374.262 81.0401 357.422 85.2466 336.76C88.8066 319.273 107.26 311.679 127.881 309.349C146.227 307.276 171.578 309.166 172.68 322.173Z"
                fill="#DAEBC4"
                stroke="black"
                strokeWidth="3"
              />
              <path
                id="Ellipse 228"
                d="M335.41 382.907C350.077 378.762 364.805 378.943 376.743 382.534C388.688 386.127 397.728 393.091 401.301 402.461C404.876 411.832 402.389 422.051 395.242 431.04C388.1 440.023 376.361 447.681 361.696 451.824C347.03 455.969 332.3 455.79 320.362 452.198C308.418 448.604 299.378 441.64 295.805 432.271C292.231 422.9 294.717 412.68 301.863 403.693C309.005 394.71 320.745 387.051 335.41 382.907Z"
                fill="#DAEBC4"
                stroke="black"
                strokeWidth="3"
              />
              <path
                id="Ellipse 221"
                d="M238.378 399.002C256.885 397.649 274.206 400.225 287.242 405.432C300.279 410.639 308.93 418.426 310.427 427.511C311.925 436.598 306.016 445.449 294.984 452.416C283.955 459.382 267.884 464.398 249.376 465.751C230.87 467.104 213.546 464.528 200.511 459.321C187.473 454.115 178.824 446.327 177.327 437.241C175.83 428.156 181.737 419.304 192.768 412.337C203.798 405.371 219.87 400.354 238.378 399.002Z"
                fill="#DAEBC4"
                stroke="black"
                strokeWidth="3"
              />
              <path
                id="Vector_4"
                d="M362.926 331.707C375.313 359.989 336.461 387.731 303.137 390.364C269.813 392.997 240.91 376.431 238.581 353.362C236.252 330.293 264.642 311.214 294.704 306.822C323.363 302.636 352.781 308.547 362.926 331.707Z"
                fill="#DAEBC4"
                stroke="black"
                strokeWidth="3"
              />
              <path
                id="Ellipse 225"
                d="M214.865 298.476C233.284 298.099 249.985 301.791 262.084 308.007C274.248 314.256 281.446 322.863 281.638 332.179C281.83 341.496 274.992 350.393 263.095 357.136C251.262 363.845 234.728 368.222 216.308 368.601C197.888 368.98 181.187 365.288 169.086 359.071C156.922 352.823 149.726 344.215 149.534 334.898C149.342 325.582 156.179 316.686 168.075 309.942C179.91 303.233 196.444 298.856 214.865 298.476Z"
                fill="#DAEBC4"
                stroke="black"
                strokeWidth="3"
              />
              <path
                id="Ellipse 213"
                d="M404.357 348.31C414.741 354.133 420.747 362.745 422.104 371.916C423.462 381.113 420.138 390.699 412.21 398.604C404.281 406.509 392.906 411.579 380.715 413.181C368.559 414.778 355.82 412.881 345.435 407.058C335.049 401.237 329.043 392.625 327.689 383.453C326.328 374.257 329.652 364.672 337.581 356.766C345.51 348.86 356.886 343.789 369.076 342.188C381.231 340.591 393.971 342.489 404.357 348.31Z"
                fill="#DAEBC4"
                stroke="black"
                strokeWidth="3"
              />
              <path
                id="Ellipse 208"
                d="M97.0304 358.786C108.458 358.551 118.845 361.776 126.401 367.144C133.957 372.513 138.642 379.989 138.813 388.282C138.984 396.576 134.61 404.239 127.281 409.914C119.953 415.588 109.707 419.239 98.2795 419.474C86.8516 419.709 76.4637 416.483 68.9079 411.115C61.3519 405.747 56.6664 398.271 56.4956 389.976C56.3251 381.683 60.699 374.021 68.0276 368.345C75.3561 362.671 85.6025 359.021 97.0304 358.786Z"
                fill="#DAEBC4"
                stroke="black"
                strokeWidth="3"
              />
              <path
                id="Ellipse 220"
                d="M154.148 392.884C170.703 392.545 185.718 395.888 196.604 401.519C207.504 407.158 214.142 415.013 214.32 423.697C214.499 432.382 208.188 440.502 197.532 446.584C186.886 452.659 172.022 456.617 155.466 456.958C138.909 457.298 123.895 453.955 113.008 448.324C102.11 442.685 95.4713 434.831 95.2922 426.147C95.1135 417.463 101.423 409.342 112.081 403.259C122.726 397.183 137.59 393.225 154.148 392.884Z"
                fill="#DAEBC4"
                stroke="black"
                strokeWidth="3"
              />
              <path
                id="OVER-TREE"
                d="M378.636 383.525C378.636 383.525 364.857 391.94 378.636 403.687C409.137 429.688 336.499 422.511 322.781 429.191C284.781 447.695 217.386 456.189 194.281 446.187C167.281 434.5 103.573 437.556 107.549 393.103C90.783 352.191 117.895 319.422 217.781 335.498C259.898 315.923 416.993 341.515 378.636 383.525Z"
                fill="#DAEBC4"
              />
            </g>
            <path
              id="TRUNK"
              d="M256.545 389.769C256.545 389.886 256.663 420.612 258.103 458.195L258.786 474.478C260.532 511.521 262.038 537.486 268.132 557.778C252.963 558.182 247.102 557.392 231.683 557.803C229.039 531.993 229.54 507.071 230.581 468.054L230.925 456.82C232.241 418.363 234.723 387.27 234.723 387.27L256.545 389.769Z"
              fill="#A48165"
              stroke="black"
              strokeWidth="3"
            />
            <g id="tree-front">
              <g id="overballs">
                <path
                  id="BLOB2"
                  d="M245.323 403.078C267.341 400.861 285.839 408.323 286.907 419.556C287.973 430.789 271.231 441.799 249.213 444.016C227.194 446.232 208.696 438.77 207.629 427.537C206.562 416.304 223.304 405.294 245.323 403.078Z"
                  fill="#DAEBC4"
                  stroke="black"
                  strokeWidth="3"
                />
                <path
                  id="BLOB1"
                  d="M322.881 398.422C346.879 451.922 208.729 424.422 199.379 424.422C165.379 424.422 166.227 399.03 144.356 402.893C116.6 396.504 90.9974 407.698 84.5207 377.565C74.8702 363.164 158.103 342.079 217.23 343.911C276.356 345.745 401.725 322.791 322.881 398.422Z"
                  fill="#DAEBC4"
                />
              </g>
            </g>
          </g>
        </motion.g>
        <motion.g
          id="HILL"
          animate={hillControls}
          initial={hillFlat ? { scaleY: HILL_SCALE_Y, scaleX: HILL_SCALE_X, strokeWidth: HILL_STROKE } : { strokeWidth: 3 }}
          style={{ transformBox: 'fill-box', originX: '50%', originY: '20%' }}
        >
          {/* no strokeWidth here on purpose - the parent group's animated value inherits down */}
          <path
            id="Vector_5"
            d="M421.031 628.367C421.031 589.73 345.264 543.367 231.613 543.367C117.962 543.367 47.0312 591.662 47.0312 628.367H421.031Z"
            fill="url(#paint3_linear_3045_876)"
            stroke="url(#paint4_linear_3045_876)"
          />
        </motion.g>
      </g>
      <defs>
        <linearGradient
          id="paint0_linear_3045_876"
          x1="220.523"
          y1="178.004"
          x2="323.023"
          y2="191.504"
          gradientUnits="userSpaceOnUse">
          <stop offset="0.336164" stopColor="#F2EEDE" />
          <stop offset="0.931953" stopColor="#8C8981" />
        </linearGradient>
        <linearGradient
          id="paint1_linear_3045_876"
          x1="354.027"
          y1="210.504"
          x2="228.508"
          y2="199.728"
          gradientUnits="userSpaceOnUse">
          <stop offset="0.56515" stopColor="#F6EFDE" />
          <stop offset="0.972354" stopColor="#908C82" />
        </linearGradient>
        <linearGradient
          id="paint2_linear_3045_876"
          x1="244.027"
          y1="275.504"
          x2="237.527"
          y2="344.004"
          gradientUnits="userSpaceOnUse">
          <stop offset="0.348515" stopColor="#8DACC2" />
          <stop offset="0.839819" stopColor="#253C78" />
        </linearGradient>
        <linearGradient
          id="paint3_linear_3045_876"
          x1="233.54"
          y1="628.202"
          x2="233.54"
          y2="573.866"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#A9C08C" stopOpacity="0" />
          <stop offset="1" stopColor="#A6BBA0" />
        </linearGradient>
        <linearGradient
          id="paint4_linear_3045_876"
          x1="234.031"
          y1="543.367"
          x2="234.031"
          y2="628.367"
          gradientUnits="userSpaceOnUse">
          <stop stopColor="#22181C" />
          <stop offset="0.721154" stopColor="#22181C" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
