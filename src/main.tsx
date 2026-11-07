import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyDevFlags } from './utils/flags'
import { initAnalytics } from './utils/analytics'

// reflect any local-only dev flags onto <html> before first paint
applyDevFlags()
initAnalytics()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
