import { useEffect } from 'react'
import { clockTime, COUNTERS, isTimer, shortLabel } from '../lib/counters'
import type { Child } from '../lib/db'
import { useActions, useChildRows, useStore } from '../lib/store'

const TAG = 'timer-'

/**
 * Keeps one notification per running timer (tidur, tengkurap), so the parent sees it is still running with the
 * app closed. Android shows a "Berhenti" button that stops it from the notification (handled in sw.ts);
 * iPhone has no buttons on web notifications, so a tap opens the app. A web app cannot tick a live counter
 * in a notification or reach the Dynamic Island; the notification shows the start time instead.
 */
export function TimerNotices({ child }: { child: Child }) {
  const rows = useChildRows(child.id)
  const act = useActions()
  const { db } = useStore()
  const running = (rows?.events ?? []).filter((e) => e.end_at === null && isTimer(COUNTERS.find((c) => c.id === e.counter_id)!))
  const key = running.map((e) => e.id).join()

  useEffect(() => {
    if (!rows || !('Notification' in window) || Notification.permission !== 'granted') return
    void (async () => {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (!reg) return
      const shown = (await reg.getNotifications()).filter((n) => n.tag.startsWith(TAG))
      for (const n of shown) if (!running.some((e) => n.tag === TAG + e.id)) n.close()
      for (const e of running) {
        if (shown.some((n) => n.tag === TAG + e.id)) continue
        const c = COUNTERS.find((x) => x.id === e.counter_id)!
        await reg.showNotification(`${shortLabel(c)} ${child.nickname} sedang berjalan`, {
          body: `Mulai pukul ${clockTime(new Date(e.start_at))}. Ketuk untuk membuka dan menghentikan.`,
          tag: TAG + e.id,
          icon: 'icons/icon-192.png',
          badge: 'icons/icon-192.png',
          silent: true,
          requireInteraction: true,
          data: { url: '#/', stop: e.id, db: db.name },
          actions: [{ action: 'stop', title: 'Berhenti' }],
        } as NotificationOptions)
      }
    })().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, !!rows])

  // "Berhenti" on the notification: the service worker already wrote the stop to the device database;
  // repeat it through the store so open screens refresh and the change syncs.
  useEffect(() => {
    const onMsg = (m: MessageEvent) => {
      if (m.data?.type === 'timer-stopped') void act.patchEvent(m.data.id, { end_at: m.data.at })
    }
    navigator.serviceWorker?.addEventListener('message', onMsg)
    return () => navigator.serviceWorker?.removeEventListener('message', onMsg)
  }, [act])
  return null
}
