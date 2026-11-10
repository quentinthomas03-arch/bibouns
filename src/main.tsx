import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { SessionProvider } from '@/app/session'
import { ToastProvider } from '@/components/ui/Toast'
import { App } from './App'
import './index.css'
import { startPhotoQueue } from '@/lib/photos'

// Service worker : hors ligne + mises à jour automatiques
registerSW({ immediate: true })

// Photos en attente d'envoi : relancées automatiquement
startPhotoQueue()

// Demande au navigateur de ne pas effacer nos données locales
void navigator.storage?.persist?.()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <SessionProvider>
        <App />
      </SessionProvider>
    </ToastProvider>
  </StrictMode>,
)
