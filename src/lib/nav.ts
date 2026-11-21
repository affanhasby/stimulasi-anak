import { useSyncExternalStore } from 'react'

// Hash routes: GitHub Pages serves one index.html, and the phone's back gesture walks the history.
const read = () => decodeURIComponent(location.hash.replace(/^#\/?/, ''))
const subscribe = (cb: () => void) => {
  addEventListener('hashchange', cb)
  return () => removeEventListener('hashchange', cb)
}

export const useRoute = () => useSyncExternalStore(subscribe, read)

export function go(path: string, replace = false) {
  const hash = `#/${path}`
  if (replace) history.replaceState(null, '', hash)
  else history.pushState(null, '', hash)
  dispatchEvent(new HashChangeEvent('hashchange'))
}

export const back = (fallback = '') => (history.length > 1 ? history.back() : go(fallback, true))
