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

// iOS 26 standalone: the status-bar edge starts out blurred and only switches to the solid #top-guard after a
// back navigation (a swipe back fixes it). Imitate one invisibly: step to a different history entry without a
// render (pushState fires no hashchange), go back to the same screen, and scroll the page by a pixel.
function settleTopEdge() {
  const body = document.body.style
  body.minHeight = 'calc(100% + 1px)'
  window.scrollTo(0, 1)
  history.pushState(history.state, '', `${location.pathname}${location.search}${location.hash || '#/'}~`)
  setTimeout(() => {
    history.back()
    window.scrollTo(0, 0)
    body.minHeight = ''
  }, 60)
}
if (/iPhone|iPad/.test(navigator.userAgent) && matchMedia('(display-mode: standalone)').matches) {
  const run = () => [300, 1200].forEach((ms) => setTimeout(settleTopEdge, ms))
  addEventListener('load', run)
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && run())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
