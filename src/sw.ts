/// <reference lib="webworker" />
// Service worker: offline app shell (precache) plus immunization reminders by Web Push.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

declare const self: ServiceWorkerGlobalScope

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))
// registerType 'autoUpdate': a new version takes over at once, so content fixes (e.g. a schedule change) reach everyone.
self.skipWaiting()
clientsClaim()

type Payload = { title?: string; body?: string; url?: string; tag?: string }

self.addEventListener('push', (event) => {
  const d: Payload = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(d.title ?? 'Stimulasi Anak', {
      body: d.body,
      icon: 'icons/icon-192.png',
      badge: 'icons/icon-192.png',
      tag: d.tag, // one visit = one notification; a resend replaces instead of stacking
      data: { url: d.url ?? '#/imunisasi' },
    }),
  )
})

/** "Berhenti" on a running-timer notification: end it in the device database without opening the app. */
async function stopTimer(dbName: string, id: string) {
  const at = new Date().toISOString()
  const db = await new Promise<IDBDatabase>((ok, fail) => {
    const r = indexedDB.open(dbName)
    r.onsuccess = () => ok(r.result)
    r.onerror = () => fail(r.error)
  })
  await new Promise<void>((ok, fail) => {
    const tx = db.transaction('counter_events', 'readwrite')
    const store = tx.objectStore('counter_events')
    const get = store.get(id)
    get.onsuccess = () => {
      // _dirty marks it for upload; the app syncs it on its next start (same flag the app's own writes use).
      if (get.result && get.result.end_at === null) store.put({ ...get.result, end_at: at, updated_at: at, _dirty: 1 })
    }
    tx.oncomplete = () => ok()
    tx.onerror = () => fail(tx.error)
  })
  db.close()
  for (const c of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) c.postMessage({ type: 'timer-stopped', id, at })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data ?? {}
  if (event.action === 'stop' && data.stop && data.db) {
    event.waitUntil(stopTimer(data.db, data.stop))
    return
  }
  const url = new URL(event.notification.data?.url ?? '', self.registration.scope).href
  event.waitUntil(
    (async () => {
      const [open] = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (open) {
        await open.navigate(url)
        return open.focus()
      }
      return self.clients.openWindow(url)
    })(),
  )
})
