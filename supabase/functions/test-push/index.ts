// Apple's push service rejects a VAPID subject that is not a real mailto/https address (403 BadJwtToken),
// so VAPID_SUBJECT is the site URL.
// "Kirim notifikasi uji": sends one push to every device of the caller's account, through the same path as the reminders,
// so a parent can check every phone at once. The result says how many got it and how this phone fared.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const cors = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
}
const reply = (body: Record<string, unknown>, status = 200) => Response.json(body, { status, headers: cors })

const pub = Deno.env.get('VAPID_PUBLIC_KEY')
const priv = Deno.env.get('VAPID_PRIVATE_KEY')
if (pub && priv) webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'https://affanhasby.github.io/stimulasi-anak/', pub, priv)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!pub || !priv) return reply({ result: 'server-not-ready' })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data: u } = await sb.auth.getUser(token)
  if (!u.user) return reply({ result: 'unauthorized' }, 401)

  const { endpoint } = (await req.json().catch(() => ({}))) as { endpoint?: string }
  // Every device signed in to this account that allowed notifications (never another account's devices),
  // the same set the immunization reminders go to.
  const { data: devices } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', u.user.id)
  if (!devices?.length || (endpoint && !devices.some((d) => d.endpoint === endpoint))) return reply({ result: 'not-registered' })

  const payload = JSON.stringify({ title: 'Notifikasi uji berhasil', body: 'Pengingat imunisasi akan muncul seperti ini di setiap HP yang menyalakan notifikasi.', url: '#/lainnya/pengingat', tag: 'test-push' })
  const out = { sent: 0, gone: 0, failed: 0, here: 'error' as 'sent' | 'gone' | 'error', code: null as number | null }
  await Promise.all(
    devices.map(async (d) => {
      let r: 'sent' | 'gone' | 'error' = 'sent'
      try {
        await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 600 })
        out.sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode ?? null
        console.error('test-push failed', code, String(e))
        if (code === 404 || code === 410) {
          // The phone unsubscribed or reinstalled: forget it.
          await sb.from('push_subscriptions').delete().eq('endpoint', d.endpoint)
          r = 'gone'
          out.gone++
        } else {
          r = 'error'
          out.failed++
        }
        if (d.endpoint === endpoint) out.code = code
      }
      if (d.endpoint === endpoint) out.here = r
    }),
  )
  return reply({ result: out.here, ...out })
})
