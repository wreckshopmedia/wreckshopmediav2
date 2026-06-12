import { Outlet } from 'react-router-dom'
import { Logo } from '../../components/Logo/logoIndex'
import { NavRow } from '../../components/NavRow/navRowIndex'
import styles from './siteLayout.module.css'

/**
 * @description Persistent shell for all non-landing routes. Nothing remounts on
 * child route changes - active link in NavRow slides to indicate current route.
 * @author Chris "Mo" Mochinski
 */
export function SiteLayout() {
  return (
    <div className={styles.siteLayout}>
      <div className={styles.logoWrapper}>
        <Logo hillFlat />
      </div>
      <NavRow visible />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  )
}
