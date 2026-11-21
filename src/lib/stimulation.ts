import monthlyJson from '@data/monthly_development.json'
import stimJson from '@data/stimulation_activities.json'
import { addDays, addMonths, ageInMonths, daysBetween, type IsoDate } from './date'

export type Domain = 'sosial' | 'bahasa' | 'kognitif' | 'motorik_kasar' | 'motorik_halus' | 'kemandirian'
export type Activity = {
  id: string
  start: number
  end: number
  domain: Domain
  frequency: 'daily_core' | 'rotating'
  minutes: number
  title: string
  how: string
  source: string
  page?: string
  note?: string
}

// Month windows from the monthly research (PRD dan Data/monthly_development.json) replace the 3-month bands;
// activities it adds (CDC/AAP tips, verification partial) join the bank.
const windows = new Map(monthlyJson.stimulation_months.map((w) => [w.activity_id, w]))
export const ACTIVITIES: Activity[] = [
  ...(stimJson.activities as Activity[]).map((a) => {
    const w = windows.get(a.id)
    return w ? { ...a, start: w.start_month, end: w.end_month } : a
  }),
  ...(monthlyJson.new_activities as unknown as Activity[]).map((a) => ({ ...a, page: a.page ?? undefined })),
]
/** Ages the content is organised by: monthly to 12 months, then KPSP points, then every 6 months. */
export const MONTH_GRID = monthlyJson.month_grid as number[]
export const gridMonth = (m: number) => [...MONTH_GRID].reverse().find((g) => g <= m) ?? 0
export const nextGridMonth = (m: number) => MONTH_GRID.find((g) => g > m) ?? null
export const DOMAINS = stimJson.domains as Record<Domain, string>
export const DOMAIN_ORDER = Object.keys(DOMAINS) as Domain[]
export const GENERAL_RULES = stimJson.general_rules
const ROTATING_PER_DAY = stimJson.daily_plan_rules.rotating_per_day as number
const CHALLENGE_DAYS = 14

export type ActivityCheck = { day: IsoDate; activity_id: string }
export type PlannedActivity = Activity & { kind: 'core' | 'rotating' | 'challenge' }
export type DailyPlan = {
  band: { start: number; end: number }
  core: PlannedActivity[]
  rotating: PlannedActivity[] // today's picks, then the rest of the rotation for "Ganti kegiatan lain"
  challenge: PlannedActivity | null
}

// Small deterministic PRNG so the order is stable for a child for the whole day.
function seeded(seed: string) {
  let h = 2166136261
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
}

export function dailyPlan(devBirth: IsoDate, today: IsoDate, childId: string, checks: ActivityCheck[]): DailyPlan {
  const months = Math.min(ageInMonths(devBirth, today), 71)
  const inBand = ACTIVITIES.filter((a) => a.start <= months && months < a.end)
  const g = gridMonth(months)
  const band = { start: g, end: nextGridMonth(months) ?? 72 }

  const weekAgo = addDays(today, -7)
  const recent = checks.filter((c) => c.day >= weekAgo && c.day < today)
  const byId = new Map(ACTIVITIES.map((a) => [a.id, a]))
  const domainCount = new Map<Domain, number>()
  const lastDone = new Map<string, IsoDate>()
  for (const c of recent) {
    const a = byId.get(c.activity_id)
    if (a) domainCount.set(a.domain, (domainCount.get(a.domain) ?? 0) + 1)
  }
  for (const c of checks) if ((lastDone.get(c.activity_id) ?? '') < c.day) lastDone.set(c.activity_id, c.day)

  const rand = seeded(`${today}:${childId}`)
  const jitter = new Map(inBand.map((a) => [a.id, rand()]))
  const rotating = inBand
    .filter((a) => a.frequency === 'rotating')
    .sort(
      (a, b) =>
        (domainCount.get(a.domain) ?? 0) - (domainCount.get(b.domain) ?? 0) ||
        (lastDone.get(a.id) ?? '').localeCompare(lastDone.get(b.id) ?? '') ||
        jitter.get(a.id)! - jitter.get(b.id)!,
    )
    .map((a): PlannedActivity => ({ ...a, kind: 'rotating' }))

  let challenge: PlannedActivity | null = null
  const bandEnds = addMonths(devBirth, band.end)
  if (band.end < 72 && daysBetween(today, bandEnds) <= CHALLENGE_DAYS) {
    // A taste of next month: an activity that starts then and is not on today's list already.
    const next = ACTIVITIES.filter((a) => a.start > months && a.start <= band.end && a.frequency === 'rotating')
    if (next.length) challenge = { ...next[Math.floor(rand() * next.length)], kind: 'challenge' }
  }

  return {
    band,
    core: inBand.filter((a) => a.frequency === 'daily_core').map((a) => ({ ...a, kind: 'core' })),
    rotating,
    challenge,
  }
}

/** Today's rotating picks: rotation order, but a domain already on today's list waits until others are used. */
export function todaysPicks(plan: DailyPlan) {
  const used = new Set(plan.core.map((a) => a.domain))
  const picks: PlannedActivity[] = []
  for (const pass of [true, false])
    for (const a of plan.rotating) {
      if (picks.length === ROTATING_PER_DAY) return picks
      if (picks.includes(a) || (pass && used.has(a.domain))) continue
      picks.push(a)
      used.add(a.domain)
    }
  return picks
}

/** A day counts when at least one core and one rotating (or challenge) activity is ticked. */
export function dayAchieved(day: IsoDate, checks: ActivityCheck[]): boolean {
  const done = checks.filter((c) => c.day === day).map((c) => ACTIVITIES.find((a) => a.id === c.activity_id))
  return done.some((a) => a?.frequency === 'daily_core') && done.some((a) => a?.frequency === 'rotating')
}
