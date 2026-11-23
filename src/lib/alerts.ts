import { COUNTERS } from './counters'
import type { EventRow } from './db'

type Ctx = {
  ageDays: number
  hoursSinceBirth: number
  total: number
  countToday: number
  count24h: number
  hoursSinceLast: number | null
  daysSinceLast: number | null
  lastChoice: string | null
  lastCelsius: number | null
  logCoverageOk: boolean
  loggingActive: boolean // anything logged in the last 6 hours
  loggedToday: boolean // anything logged in the last 24 hours
}

// Each alert in counters.json, written out as code. Data keeps the text, level and source.
const RULES: Record<string, (c: Ctx) => boolean> = {
  'BAB-A1': (c) => c.ageDays <= 2 && c.hoursSinceBirth >= 48 && c.total === 0,
  // "Too long since" alerts only while the family is logging: a gap in the log is usually a forgotten tap,
  // and Beranda asks about it calmly instead (see staleFeed).
  'BAB-A2': (c) => c.ageDays <= 28 && c.loggedToday && c.daysSinceLast !== null && c.daysSinceLast > 3,
  'BAB-A3': (c) => c.lastChoice === 'pucat/putih/abu-abu',
  'BAB-A4': (c) => c.lastChoice === 'ada darah/merah',
  'BAB-A5': (c) => c.ageDays > 3 && c.lastChoice === 'hitam/hijau gelap (mekonium)',
  'BAB-A6': (c) => c.countToday >= 6 && c.ageDays > 28,
  'BAK-A1': (c) => c.hoursSinceBirth >= 24 && c.hoursSinceBirth < 72 && c.total === 0,
  'BAK-A2': (c) => c.ageDays >= 4 && c.count24h <= 4 && c.logCoverageOk,
  'NURSE-A1': (c) => c.ageDays <= 28 && c.loggingActive && c.hoursSinceLast !== null && c.hoursSinceLast > 3,
  'NURSE-A2': (c) => c.ageDays <= 28 && c.count24h < 8 && c.logCoverageOk,
  'TEMP-A1': (c) => c.lastCelsius !== null && c.lastCelsius > 37.5 && c.ageDays <= 28,
  'TEMP-A2': (c) => c.lastCelsius !== null && c.lastCelsius < 36.5 && c.ageDays <= 28,
  'TEMP-A3': (c) => c.lastCelsius !== null && c.lastCelsius > 37.5 && c.ageDays > 28,
}

export type ActiveAlert = { id: string; counterId: string; level: 'segera' | 'periksa' | 'info'; text: string; source: string; page?: string }

const H = 3_600_000

/** "Too few" alerts only count when the day looks fully logged: feeds in at least 3 of the last four 6-hour blocks. */
function coverage(events: EventRow[], now: number) {
  const blocks = new Set(events.filter((e) => e.counter_id === 'NURSE' && now - Date.parse(e.start_at) < 24 * H).map((e) => Math.floor((now - Date.parse(e.start_at)) / (6 * H))))
  return blocks.size >= 3
}

export function activeAlerts(events: EventRow[], birthDate: string, now: number, dayStart: number, enabled: Set<string>): ActiveAlert[] {
  const birth = Date.parse(`${birthDate}T00:00:00`)
  const hoursSinceBirth = (now - birth) / H
  const ageDays = Math.floor(hoursSinceBirth / 24)
  const ok = coverage(events, now)
  const real = events.filter((e) => !e.value?.susulan)
  const loggingActive = real.some((e) => now - Date.parse(e.start_at) < 6 * H)
  const loggedToday = real.some((e) => now - Date.parse(e.start_at) < 24 * H)
  const out: ActiveAlert[] = []
  for (const c of COUNTERS) {
    const alerts = (c as { alerts?: { id: string; level: ActiveAlert['level']; text: string; source: string; page?: string }[] }).alerts
    if (!alerts?.length || !enabled.has(c.id)) continue
    const mine = events.filter((e) => e.counter_id === c.id)
    // Catch-up entries ("isi yang terlewat") count toward totals but carry no real time or detail.
    const last = mine.filter((e) => !e.value?.susulan).at(-1)
    const ctx: Ctx = {
      ageDays,
      hoursSinceBirth,
      total: mine.length,
      countToday: mine.filter((e) => Date.parse(e.start_at) >= dayStart).length,
      count24h: mine.filter((e) => now - Date.parse(e.start_at) < 24 * H).length,
      hoursSinceLast: last ? (now - Date.parse(last.start_at)) / H : null,
      daysSinceLast: last ? (now - Date.parse(last.start_at)) / (24 * H) : null,
      lastChoice: (last?.value?.warna as string | undefined) ?? null,
      lastCelsius: (last?.value?.celsius as number | undefined) ?? null,
      logCoverageOk: ok,
      loggingActive,
      loggedToday,
    }
    for (const a of alerts) if (RULES[a.id]?.(ctx)) out.push({ id: a.id, counterId: c.id, level: a.level, text: a.text, source: a.source, page: a.page })
  }
  const order = { segera: 0, periksa: 1, info: 2 }
  return out.sort((a, b) => order[a.level] - order[b.level])
}
