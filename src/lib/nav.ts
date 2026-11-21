import { useSyncExternalStore } from 'react'

// Hash routes: GitHub Pages serves one index.html, and the phone's back gesture walks the history.
// A trailing '~' is the short-lived entry main.tsx pushes on iOS; it reads as the same screen.
const read = () => decodeURIComponent(location.hash.replace(/^#\/?/, '').replace(/~$/, ''))
const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}

export const useRoute = () => useSyncExternalStore(subscribe, read)

// Each in-app push records its depth, so "Kembali" knows whether there is an app screen to return to
// (history.length also counts forward entries and pages from before the app).
const depth = () => (history.state as { d?: number } | null)?.d ?? 0

export function go(path: string, replace = false) {
  const hash = `#/${path}`
  if (replace) history.replaceState({ d: depth() }, '', hash)
  else history.pushState({ d: depth() + 1 }, '', hash)
  dispatchEvent(new HashChangeEvent('hashchange'))
}

export const back = (fallback = '') => (depth() > 0 ? history.back() : go(fallback, true))
