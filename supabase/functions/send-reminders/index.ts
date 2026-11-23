// Daily immunization reminders by email. Run hourly by pg_cron; each family is handled in the hour of its
// chosen reminder time (in its own timezone). Uses the same vaccine engine as the app (../_shared).
import { createClient } from 'npm:@supabase/supabase-js@2'
import nodemailer from 'npm:nodemailer@6.9.16'
import webpush from 'npm:web-push@3.6.7'
import { addDays, ageInMonths, type IsoDate } from '../_shared/date.ts'
import { routinesFor } from '../_shared/routines.ts'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
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
if (vapid.pub && vapid.priv) webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'https://affanhasby.github.io/stimulasi-anak/', vapid.pub, vapid.priv)

const hourIn = (tz: string, at: Date) => Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' }).format(at))
const dateIn = (tz: string, at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at)

type Device = { endpoint: string; p256dh: string; auth: string }
type Report = { checked: number; emailed: number; pushed: number; items: number; nudged: number; errors: string[] }

/** Push one message to every device of the family; devices the push service no longer knows are forgotten. */
async function pushAll(sb: SupabaseClient, devices: Device[], message: Record<string, string>, ttl: number, report: Report) {
  if (!vapid.pub || !vapid.priv) return
  const payload = JSON.stringify(message)
  for (const d of devices) {
    try {
      await webpush.sendNotification({ endpoint: d.endpoint, keys: { p256dh: d.p256dh, auth: d.auth } }, payload, { TTL: ttl })
      report.pushed++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await sb.from('push_subscriptions').delete().eq('endpoint', d.endpoint)
      else report.errors.push(`push ${code ?? ''} ${String(e)}`)
    }
  }
}

/** First send of this key for the child today? Recording it is what makes the check-and-send happen once. */
const once = async (sb: SupabaseClient, userId: string, childId: string, key: string, day: string) =>
  !(await sb.from('reminder_log').insert({ user_id: userId, child_id: childId, reminder_key: key, sent_on: day })).error

const H = 3_600_000

type NudgeSettings = { user_id: string; recap_time?: string; log_nudges?: boolean; enabled_counters?: string[] | null; routine_off?: string[] | null }

/** When a routine was last sent for the child, to keep its interval between reminders. */
async function lastSent(sb: SupabaseClient, childId: string, prefix: string) {
  const { data } = await sb.from('reminder_log').select('created_at').eq('child_id', childId).like('reminder_key', `${prefix}%`).order('created_at', { ascending: false }).limit(1)
  return data?.[0] ? Date.parse(data[0].created_at) : 0
}

/**
 * Help with counting (only for families who logged something in the last 2 days, never 21.00-07.00):
 * - routine reminders for the active counter buttons (src/lib/routines.ts): "nothing for N hours",
 *   fixed times (MP-ASI, tummy time) and timers left running;
 * - at the chosen recap time: "isi yang terlewat", unless already filled in today in the app.
 */
async function logNudges(sb: SupabaseClient, s: NudgeSettings, devices: Device[], tz: string, now: Date, report: Report) {
  const h = hourIn(tz, now)
  if (h < 7 || h >= 21) return
  const today = dateIn(tz, now) as IsoDate
  const t = now.getTime()
  const { data: kids } = await sb.from('children').select('id, nickname, birth_date').eq('user_id', s.user_id).is('deleted_at', null)
  for (const child of kids ?? []) {
    const { data: ev } = await sb
      .from('counter_events')
      .select('id, counter_id, start_at, end_at')
      .eq('child_id', child.id)
      .eq('deleted', false)
      .gte('start_at', new Date(t - 48 * H).toISOString())
    if (!ev?.length) continue // not logging lately: never nag

    const push = async (key: string, routine: { title: string; url?: string; tag: string }, body: string) => {
      if (!(await once(sb, s.user_id, child.id, key, today))) return
      await pushAll(sb, devices, { title: routine.title, body, url: routine.url ?? '#/', tag: routine.tag }, 2 * 3600, report)
      report.nudged++
    }

    // Evening catch-up.
    if (s.log_nudges !== false && h === Number(String(s.recap_time ?? '20:00').slice(0, 2))) {
      const { data: filled } = await sb.from('alert_logs').select('alert_id').eq('child_id', child.id).eq('alert_id', 'RECAP').eq('day', today).maybeSingle()
      if (!filled) await push('log:recap', { title: `Rekap ${child.nickname} hari ini`, url: '#/isi', tag: `recap-${today}` }, 'Ada BAB, pipis, atau menyusu yang lupa dicatat? Ketuk untuk melengkapi, cukup jumlahnya.')
    }

    const months = ageInMonths(child.birth_date, today)
    for (const r of routinesFor(months, s.enabled_counters ?? null, s.routine_off ?? [])) {
      const mine = ev.filter((e) => r.counters.includes(e.counter_id))
      const tag = `routine-${r.id}-${child.id}`
      // A timer left running (forgot to stop it): once per timer.
      if (r.running) {
        const open = mine.find((e) => e.end_at === null && t - Date.parse(e.start_at) >= r.running! * 60_000)
        if (open) await push(`routine:${r.id}:run:${open.id}`, { title: r.id === 'sleep' ? 'Masih tidur?' : 'Masih tengkurap?', tag }, r.id === 'sleep' ? r.body(child.nickname) : `Timer tengkurap ${child.nickname} masih berjalan. Kalau sudah selesai, ketuk kotak Tengkurap untuk menghentikan.`)
      }
      const last = mine.length ? Math.max(...mine.map((e) => Date.parse(e.start_at))) : 0
      // "Nothing logged for N hours": not again until another N hours have passed since the last reminder.
      if (r.every && last && t - last >= r.every * H && t - (await lastSent(sb, child.id, `routine:${r.id}:every`)) >= r.every * H)
        await push(`routine:${r.id}:every:${h}`, { title: r.title, tag }, r.body(child.nickname))
      // Fixed times of day, skipped when one was logged in the last 2 hours.
      if (r.at?.includes(h) && t - last >= 2 * H) await push(`routine:${r.id}:at:${h}`, { title: r.title, tag }, r.body(child.nickname))
    }
  }
}

Deno.serve(async (req) => {
  // Only the scheduler (or an operator) may trigger sends.
  if (req.headers.get('x-reminder-secret') !== Deno.env.get('REMINDER_SECRET')) return new Response('forbidden', { status: 403 })
  const url = new URL(req.url)
  const now = new Date()
  const testDay = url.searchParams.get('today') // for tests: pretend it is this date, ignore the hour
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const { data: settings, error } = await sb.from('user_settings').select('user_id, reminder_lead_days, reminder_time, timezone, email_reminders, log_nudges, recap_time, enabled_counters, routine_off')
  if (error) return new Response(error.message, { status: 500 })

  const report: Report = { checked: 0, emailed: 0, pushed: 0, items: 0, nudged: 0, errors: [] }
  for (const s of settings) {
    // Channels: email when chosen, push to every device that subscribed. Nothing chosen: skip the family.
    const { data: devices } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', s.user_id)
    if (!s.email_reminders && !devices?.length) continue
    const tz = s.timezone || 'Asia/Jakarta'
    if (devices?.length && !testDay)
      await logNudges(sb, s, devices, tz, url.searchParams.get('now') ? new Date(url.searchParams.get('now')!) : now, report).catch((e) => report.errors.push(`nudge ${String(e)}`))
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
    await pushAll(sb, devices ?? [], { title: 'Pengingat imunisasi', body: lines.join('\n'), url: '#/imunisasi', tag: `vax-${today}` }, 12 * 3600, report)
  }
  return Response.json(report)
})

