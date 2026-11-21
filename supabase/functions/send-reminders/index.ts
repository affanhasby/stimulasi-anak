// Daily immunization reminders by email. Run hourly by pg_cron; each family is handled in the hour of its
// chosen reminder time (in its own timezone). Uses the same vaccine engine as the app (../_shared).
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'
import webpush from 'npm:web-push@3.6.7'
import { addDays, type IsoDate } from '../_shared/date.ts'
import { doseName, vaccineSchedule, type ScheduledDose, type VaccineChild } from '../_shared/vaccines.ts'

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const longDate = (iso: IsoDate) => `${Number(iso.slice(8))} ${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`
const NUDGE_DAYS = [1, 7, 14] // after the on-time window closed (vaccines.json reminder_options)

type Item = { key: string; kind: 'lead' | 'deadline' | 'nudge'; dose: ScheduledDose; lead?: number }

function dueItems(doses: ScheduledDose[], today: IsoDate, leadDays: number[]): Item[] {
  const out: Item[] = []
  for (const d of doses) {
    if (['done', 'skipped', 'school', 'conditional'].includes(d.status)) continue
    for (const lead of leadDays) if (addDays(d.earliest, -lead) === today) out.push({ key: `${d.key}:lead:${lead}`, kind: 'lead', dose: d, lead })
    if (d.onTimeUntil && today >= d.earliest && addDays(d.onTimeUntil, -3) === today) out.push({ key: `${d.key}:deadline`, kind: 'deadline', dose: d })
    if (d.onTimeUntil) for (const n of NUDGE_DAYS) if (addDays(d.onTimeUntil, n) === today) out.push({ key: `${d.key}:nudge:${n}`, kind: 'nudge', dose: d })
  }
  return out
}

/** One visit = one line (PRD): doses with the same kind and dates are joined. */
function group(items: Item[]) {
  const by = new Map<string, Item[]>()
  for (const i of items) {
    const k = `${i.kind}|${i.lead ?? ''}|${i.dose.earliest}|${i.dose.onTimeUntil}`
    by.set(k, [...(by.get(k) ?? []), i])
  }
  return [...by.values()]
}

const joinNames = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} & ${xs.at(-1)}`)

function line(g: Item[], name: string) {
  const i = g[0]
  const names = joinNames(g.map((x) => doseName(x.dose.dose)))
  if (i.kind === 'lead')
    return `${i.lead === 0 ? 'Hari ini' : i.lead === 1 ? 'Besok' : `${i.lead} hari lagi`} ${name} bisa imunisasi ${names}.${i.dose.onTimeUntil ? ` Sebaiknya sebelum ${longDate(i.dose.onTimeUntil)}.` : ''}`
  if (i.kind === 'deadline') return `Batas tepat waktu imunisasi ${names} untuk ${name}: ${longDate(i.dose.onTimeUntil!)}.`
  return `Imunisasi ${names} untuk ${name} belum ditandai sudah. Bila terlewat, tanyakan ke petugas kesehatan apakah masih bisa diberikan.`
}

async function send(to: string, subject: string, text: string) {
  const html = `<div style="font-family:Segoe UI,Roboto,Arial,sans-serif;font-size:16px;line-height:1.55;color:#1f2a30">${text
    .split('\n')
    .map((l) => `<p style="margin:0 0 10px">${l.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[c]!)}</p>`)
    .join('')}</div>`
  const from = Deno.env.get('REMINDER_FROM') ?? 'Stimulasi Anak <pengingat@stimulasi-anak.local>'
  const resend = Deno.env.get('RESEND_API_KEY')
  if (resend) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${resend}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text, html }),
    })
    if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`)
    return
  }
  // SMTP: Gmail in production (smtp.gmail.com:465 + App Password; Supabase blocks ports 25/587), Mailpit locally.
  const host = Deno.env.get('SMTP_HOST')
  if (!host) throw new Error('No email transport: set SMTP_HOST (+ SMTP_USER/SMTP_PASS) or RESEND_API_KEY')
  const port = Number(Deno.env.get('SMTP_PORT') ?? 465)
  const user = Deno.env.get('SMTP_USER')
  const mailer = nodemailer.createTransport({ host, port, secure: port === 465, auth: user ? { user, pass: Deno.env.get('SMTP_PASS') } : undefined })
  // Gmail rewrites any other From to the account itself, so the sender is the Gmail address under the app's name.
  await mailer.sendMail({ from: user ? `Stimulasi Anak <${user}>` : from, to, subject, text, html })
}

const vapid = { pub: Deno.env.get('VAPID_PUBLIC_KEY'), priv: Deno.env.get('VAPID_PRIVATE_KEY') }
if (vapid.pub && vapid.priv) webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'mailto:pengingat@stimulasi-anak.local', vapid.pub, vapid.priv)

const hourIn = (tz: string, at: Date) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(at))
const dateIn = (tz: string, at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)

Deno.serve(async (req) => {
  // Only the scheduler (or an operator) may trigger sends.
  if (req.headers.get('x-reminder-secret') !== Deno.env.get('REMINDER_SECRET')) return new Response('forbidden', { status: 403 })
  const url = new URL(req.url)
  const now = new Date()
  const testDay = url.searchParams.get('today') // for tests: pretend it is this date, ignore the hour
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const { data: settings, error } = await sb.from('user_settings').select('user_id, reminder_lead_days, reminder_time, timezone, email_reminders')
  if (error) return new Response(error.message, { status: 500 })

  const report = { checked: 0, emailed: 0, pushed: 0, items: 0, errors: [] as string[] }
  for (const s of settings) {
    // Channels: email when chosen, push to every device that subscribed. Nothing chosen: skip the family.
    const { data: devices } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', s.user_id)
    if (!s.email_reminders && !devices?.length) continue
    const tz = s.timezone || 'Asia/Jakarta'
    if (!testDay && hourIn(tz, now) !== Number(String(s.reminder_time).slice(0, 2))) continue
    report.checked++
    const today = testDay ?? (dateIn(tz, now) as IsoDate)
    const { data: kids } = await sb.from('children').select('*').eq('user_id', s.user_id).is('deleted_at', null)
    const lines: string[] = []
    for (const child of kids ?? []) {
      const { data: rec } = await sb.from('vaccine_records').select('dose_key, status, given_date').eq('child_id', child.id).eq('deleted', false)
      const doses = vaccineSchedule(child as VaccineChild, rec ?? [], today)
      const fresh: Item[] = []
      for (const item of dueItems(doses, today, s.reminder_lead_days ?? [1])) {
        // One row per (child, dose, kind, day): a retried run never sends the same reminder twice.
        const { error: dup } = await sb.from('reminder_log').insert({ user_id: s.user_id, child_id: child.id, reminder_key: item.key, sent_on: today })
        if (!dup) fresh.push(item)
      }
      for (const g of group(fresh)) lines.push(line(g, child.nickname))
    }
    if (!lines.length) continue
    report.items += lines.length
    if (s.email_reminders)
      try {
        const { data: u } = await sb.auth.admin.getUserById(s.user_id)
        if (u.user?.email) {
          await send(u.user.email, 'Pengingat imunisasi si Kecil', [...lines, '', 'Buka aplikasi Stimulasi Anak untuk melihat jadwal lengkap dan menandai yang sudah diberikan.'].join('\n'))
          report.emailed++
        }
      } catch (e) {
        report.errors.push(String(e))
      }
    if (vapid.pub && vapid.priv)
      for (const d of devices ?? []) {
        const payload = JSON.stringify({ title: 'Pengingat imunisasi', body: lines.join('\n'), url: '#/imunisasi', tag: `vax-${today}` })
        try {
          await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: 12 * 3600 })
          report.pushed++
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode
          // Gone or unknown at the push service: the device unsubscribed or reinstalled; forget it.
          if (code === 404 || code === 410) await sb.from('push_subscriptions').delete().eq('endpoint', d.endpoint)
          else report.errors.push(`push ${code ?? ''} ${String(e)}`)
        }
      }
  }
  return Response.json(report)
})

