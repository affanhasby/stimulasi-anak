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

// iOS 26 standalone: the status-bar edge starts out blurred and only switches to the solid #top-guard after the
// page itself navigates or scrolls (a swipe back fixes it). Do both once, invisibly, after the first paint
// and whenever the app comes back to the foreground.
function settleTopEdge() {
  const body = document.body.style
  body.minHeight = 'calc(100% + 1px)'
  requestAnimationFrame(() => {
    window.scrollTo(0, 1)
    requestAnimationFrame(() => {
      window.scrollTo(0, 0)
      body.minHeight = ''
      history.pushState(history.state, '', location.href)
      history.back()
    })
  })
}
if (/iPhone|iPad/.test(navigator.userAgent) && matchMedia('(display-mode: standalone)').matches) {
  addEventListener('load', () => setTimeout(settleTopEdge, 300))
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && setTimeout(settleTopEdge, 300))
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
