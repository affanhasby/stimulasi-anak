import { useSyncExternalStore } from 'react'

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
let deferred: PromptEvent | null = null
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

// Chrome/Android hands out the install prompt once; keep it until the parent taps "Pasang".
addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferred = e as PromptEvent
  emit()
})
addEventListener('appinstalled', () => {
  deferred = null
  emit()
})

export const isStandalone = () => matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
/** iOS Safari never fires beforeinstallprompt; it exposes navigator.standalone instead. */
export const needsIosGuide = () => 'standalone' in navigator && !isStandalone()

export const useCanInstall = () =>
  useSyncExternalStore(
    (cb) => (subs.add(cb), () => subs.delete(cb)),
    () => deferred !== null,
  )

export async function promptInstall() {
  if (!deferred) return
  await deferred.prompt()
  await deferred.userChoice
  deferred = null
  emit()
}
