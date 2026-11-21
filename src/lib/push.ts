import { needsIosGuide } from './install'
import { supabase } from './supabase'

const VAPID = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export type PushResult = 'on' | 'denied' | 'needs-install' | 'unsupported' | 'error'

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && !!VAPID

const key = (b64: string) => {
  const s = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64.length % 4)) % 4))
  return Uint8Array.from(s, (c) => c.charCodeAt(0))
}

/** Is this device subscribed right now? */
export async function pushOnHere() {
  if (!supported() || Notification.permission !== 'granted') return false
  const reg = await navigator.serviceWorker.getRegistration()
  return !!(await reg?.pushManager.getSubscription())
}

/** Ask permission, subscribe this device and register it, so reminders arrive even when the app is closed. */
export async function enablePush(): Promise<PushResult> {
  // iPhone only allows notifications for an installed app (iOS 16.4+).
  if (!supported()) return needsIosGuide() ? 'needs-install' : 'unsupported'
  if ((await Notification.requestPermission()) !== 'granted') return 'denied'
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key(VAPID!) }))
    const j = sub.toJSON()
    const { error } = await supabase.from('push_subscriptions').upsert({ endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth }, { onConflict: 'endpoint' })
    return error ? 'error' : 'on'
  } catch {
    return 'error'
  }
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
  await sub.unsubscribe()
}

export const PUSH_MESSAGE: Record<Exclude<PushResult, 'on'>, string> = {
  denied: 'Izin notifikasi ditolak. Aktifkan lewat pengaturan browser/HP untuk situs ini.',
  'needs-install': 'Di iPhone, notifikasi hanya bisa setelah aplikasi dipasang di layar utama (iOS 16.4+).',
  unsupported: 'Browser ini belum mendukung notifikasi. Gunakan pengingat email atau kalender.',
  error: 'Notifikasi belum bisa diaktifkan. Periksa koneksi lalu coba lagi.',
}
