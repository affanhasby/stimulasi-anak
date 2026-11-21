import countersJson from '@data/counters.json'

export type CounterDef = {
  id: string
  label: string
  type: 'tap' | 'tap_with_choice' | 'timer' | 'derived'
  visible_months: number[] // [from, to) in months
  default_on: boolean
  timer_options?: { one_tap_mode?: string }
  choice?: { key: string; options?: (string | number)[] | null; picker?: string }
  norms?: { age_days?: number[]; age_months?: number[]; text: string; source: string; page?: string }[]
}
export type CounterEvent = { id: string; counter_id: string; start_at: string; end_at: string | null }

export const COUNTERS = countersJson.counters as CounterDef[]

const SHORT: Record<string, string> = { BAB: 'BAB', BAK: 'Pipis', NURSE: 'Menyusu', SLEEP: 'Tidur', TUMMY: 'Tengkurap', MPASI: 'MP-ASI', BOTTLE: 'Botol', PUMP: 'Pompa', MED: 'Obat', TEMP: 'Suhu' }
export const shortLabel = (c: CounterDef) => SHORT[c.id] ?? c.label

// Menyusu is a timer in the data, but its one-tap mode logs one feed per tap ("tanpa timer"); home uses that.
const ONE_TAP_ON_HOME = new Set(['NURSE'])
/** Timers (tidur, tengkurap) start on one tap and stop on the next. */
export const isTimer = (c: CounterDef) => c.type === 'timer' && !ONE_TAP_ON_HOME.has(c.id)

export function visibleCounters(ageMonths: number, enabled?: string[] | null) {
  return COUNTERS.filter(
    (c) =>
      c.type !== 'derived' &&
      (enabled ? enabled.includes(c.id) : c.default_on) &&
      ageMonths >= c.visible_months[0] &&
      ageMonths < c.visible_months[1],
  )
}

const min = 60_000

export function todayStats(events: CounterEvent[], counterId: string, dayStart: number, now: number) {
  const mine = events.filter((e) => e.counter_id === counterId)
  const today = mine.filter((e) => Date.parse(e.start_at) >= dayStart)
  const running = mine.find((e) => e.end_at === null) ?? null
  const durationMs = today.reduce((s, e) => s + Math.max(0, (e.end_at ? Date.parse(e.end_at) : now) - Date.parse(e.start_at)), 0)
  const last = mine.reduce<number | null>((m, e) => Math.max(m ?? 0, Date.parse(e.end_at ?? e.start_at)), null)
  return { count: today.length, durationMs, running, lastAgoMs: last === null ? null : now - last }
}

export function formatDuration(ms: number) {
  const m = Math.floor(ms / min)
  if (m < 60) return `${m} m`
  return `${Math.floor(m / 60)} j${m % 60 ? ` ${m % 60} m` : ''}`
}

export const formatAgo = (ms: number) => (ms < min ? 'baru saja' : `${formatDuration(ms)} lalu`)

/** Compact form for tiles: "40m lalu", "1j 40m". */
export function formatAgoShort(ms: number) {
  const m = Math.floor(ms / min)
  if (m < 1) return 'baru saja'
  if (m < 60) return `${m}m lalu`
  return `${Math.floor(m / 60)}j ${m % 60}m` // tile width: past an hour the unit pair already reads as 'ago'
}

/** Timer value on a tile, always in one unit family: "0m", "45m", "9j 20m". */
export function formatTileDuration(ms: number) {
  const m = Math.floor(ms / min)
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}j ${m % 60}m`
}

export const clockTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
