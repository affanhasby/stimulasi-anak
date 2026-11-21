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

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
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
