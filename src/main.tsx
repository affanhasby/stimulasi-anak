import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './lib/install' // catch the install prompt before any screen asks for it
import { registerSW } from 'virtual:pwa-register'

// A new deploy activates its service worker in the background; reload once so the page runs the new code.
registerSW({ immediate: true })

// iOS Safari ignores user-scalable=no; its proprietary gesture events are the only way to stop pinch zoom.
for (const type of ['gesturestart', 'gesturechange']) document.addEventListener(type, (e) => e.preventDefault())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
