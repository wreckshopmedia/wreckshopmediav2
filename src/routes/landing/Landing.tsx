import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/Logo/logoIndex'
import { NavRow } from '../../components/NavRow/navRowIndex'
import { useReducedMotion } from '../../context/ReducedMotionContext'
import styles from './landing.module.css'

type Phase = 'animating' | 'ready' | 'revealed'

// matches the hill flatten animation duration (scaleX finishes at 0.2 + 0.6 = 0.8s)
const NAV_DELAY_MS = 850

/**
 * @description Splash entry point. Logo is the clickable trigger; hill flattens,
 * links appear, then navigates to /home after the animation settles.
 * @author Chris "Mo" Mochinski
 */
export function Landing() {
  const { animationsEnabled } = useReducedMotion()
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>(animationsEnabled ? 'animating' : 'ready')

  const handleReady = () => setPhase('ready')
  const handleClick = () => {
    if (phase !== 'ready') return
    setPhase('revealed')
    setTimeout(() => navigate('/home'), NAV_DELAY_MS)
  }

  return (
    <div className={styles.landing}>
      <button
        className={styles.landingButton}
        onClick={handleClick}
        disabled={phase !== 'ready'}
      >
        <Logo onReady={handleReady} isRevealing={phase === 'revealed'} />
      </button>
      <NavRow visible={phase === 'revealed'} />
    </div>
  )
}
