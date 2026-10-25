import '@fontsource-variable/atkinson-hyperlegible-next'
import './index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerServiceWorker } from './app/pwa'
import { Root } from './app/Root.tsx'
import { SessionProvider } from './app/session.tsx'

registerServiceWorker()
// Ask the browser to keep the local database when storage runs low; it may hold changes not yet uploaded.
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SessionProvider>
      <Root />
    </SessionProvider>
  </StrictMode>,
)
