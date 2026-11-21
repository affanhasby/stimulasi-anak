import { formatTileDuration, isTimer, type CounterDef } from './counters'
import { addDays, ageInMonths, daysBetween, todayIso, type IsoDate } from './date'
import type { EventRow } from './db'

type Norm = NonNullable<CounterDef['norms']>[number] & { min_per_day?: number | string | null; max_per_day?: number; min_hours?: number; max_hours?: number }
export type Tone = 'ok' | 'watch' | 'info' | 'none'
export type DayValue = { day: IsoDate; value: number; logged: boolean; target: { min?: number; max?: number } | null }
export type CounterRecap = { days: DayValue[]; avg: number | null; text: string; tone: Tone; extra: string | null; timer: boolean }

const H = 3_600_000
export const eventDay = (e: EventRow) => todayIso(Date.parse(e.start_at))
const durationOf = (e: EventRow, now: number) => Math.max(0, (e.end_at ? Date.parse(e.end_at) : now) - Date.parse(e.start_at))

export function normFor(def: CounterDef, birth: IsoDate, day: IsoDate): Norm | null {
  const ageDays = daysBetween(birth, day)
  const ageM = ageInMonths(birth, day)
  return (
    (def.norms as Norm[] | undefined)?.find((n) =>
      n.age_days ? ageDays >= n.age_days[0] && ageDays <= n.age_days[1] : n.age_months ? ageM >= n.age_months[0] && ageM < n.age_months[1] : false,
    ) ?? null
  )
}

/** The norm as numbers for one day: a count per day, or (timers) milliseconds per day. */
function targetFor(n: Norm | null, ageDays: number) {
  if (!n) return null
  const min = n.min_per_day === 'age_day_number' ? ageDays + 1 : typeof n.min_per_day === 'number' ? n.min_per_day : n.min_hours ? n.min_hours * H : undefined
  const max = n.max_per_day ?? (n.max_hours ? n.max_hours * H : undefined)
  return min === undefined && max === undefined ? null : { min, max }
}

export const formatValue = (v: number, timer: boolean) => (timer ? formatTileDuration(v).replace(/(j) 0m$/, '$1') : `${Math.round(v * 10) / 10}×`)

/**
 * Per-day totals for one counter over `n` days ending today, and a plain conclusion.
 * Only days on which the parent logged anything count: an unused day says nothing about the baby.
 * Today is still running, so it is shown but never judged.
 */
export function counterRecap(def: CounterDef, all: EventRow[], birth: IsoDate, today: IsoDate, n: number, now: number): CounterRecap {
  const timer = isTimer(def)
  const loggedDays = new Set(all.map(eventDay))
  const mine = all.filter((e) => e.counter_id === def.id)
  const days: DayValue[] = Array.from({ length: n }, (_, i) => {
    const day = addDays(today, i - n + 1)
    const evs = mine.filter((e) => eventDay(e) === day)
    const value = timer ? evs.reduce((s, e) => s + durationOf(e, now), 0) : evs.length
    return { day, value, logged: loggedDays.has(day), target: day < birth ? null : targetFor(normFor(def, birth, day), daysBetween(birth, day)) }
  }).filter((d) => d.day >= birth)

  const complete = days.filter((d) => d.logged && d.day < today)
  const basis = complete.length ? complete : days.filter((d) => d.logged)
  const avg = basis.length ? basis.reduce((s, d) => s + d.value, 0) / basis.length : null
  const extra = extraFor(def, mine.filter((e) => eventDay(e) >= days[0]?.day))

  if (!mine.some((e) => eventDay(e) >= (days[0]?.day ?? today))) return { days, avg: null, text: `Belum ada catatan ${n} hari terakhir.`, tone: 'none', extra, timer }
  const avgText = `Rata-rata ${formatValue(avg ?? 0, timer)} per hari`
  const judged = complete.filter((d) => d.target)
  if (!days.some((d) => d.target)) return { days, avg, text: `${avgText}.`, tone: 'info', extra, timer }
  if (!judged.length) return { days, avg, text: `${avgText}. Kesimpulan muncul setelah ada 1 hari penuh yang tercatat.`, tone: 'info', extra, timer }

  const below = judged.filter((d) => d.target!.min !== undefined && d.value < d.target!.min!)
  const above = judged.filter((d) => d.target!.max !== undefined && d.value > d.target!.max!)
  const of = `dari ${judged.length} hari tercatat`
  if (!below.length && !above.length) return { days, avg, text: `${avgText}. Sesuai anjuran di semua ${judged.length} hari tercatat.`, tone: 'ok', extra, timer }
  if (below.length) {
    // Half or more below the norm is worth a word with the midwife; an odd low day is usually a missed entry.
    const many = below.length * 2 >= judged.length
    return {
      days,
      avg,
      text: `${avgText}. Di bawah anjuran pada ${below.length} ${of}.${many ? ' Bila catatannya memang lengkap, sampaikan ke bidan atau dokter.' : ' Mungkin ada yang lupa dicatat; pantau beberapa hari lagi.'}`,
      tone: many ? 'watch' : 'info',
      extra,
      timer,
    }
  }
  return { days, avg, text: `${avgText}. Di atas kisaran umum pada ${above.length} ${of}; biasanya tidak apa bila si Kecil tampak nyaman.`, tone: 'info', extra, timer }
}

/** Detail that the count alone hides: stool colours, temperatures, millilitres. */
function extraFor(def: CounterDef, evs: EventRow[]): string | null {
  const key = def.choice?.key
  if (!key) return null
  const vals = evs.map((e) => e.value?.[key]).filter((v) => v !== undefined && v !== null)
  if (!vals.length) return null
  if (key === 'celsius') {
    const c = vals.map(Number)
    const max = Math.max(...c)
    const high = c.filter((x) => x > 37.5).length
    return `Suhu tertinggi ${max.toLocaleString('id-ID')} °C${high ? `; ${high}× di atas 37,5 °C` : '; semua dalam batas normal'}.`
  }
  if (key === 'ml') return `Total ${vals.reduce((s: number, v) => s + Number(v), 0)} ml.`
  const counts = new Map<string, number>()
  for (const v of vals) counts.set(String(v), (counts.get(String(v)) ?? 0) + 1)
  return [...counts].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}×`).join(', ')
}
