import milestonesJson from '@data/milestones.json'
import monthlyJson from '@data/monthly_development.json'
import type { Domain } from './stimulation'

export type Item = { id: string; domain: Domain; text: string }
export type KiaBand = { id: string; age_band: string; start_months: number; cutoff_months: number; source: string; page?: string; items: Item[]; status?: string }
export type CdcGroup = { age_months: number; source: string; items: Item[] }
export type Answer = { item_id: string; answer: 'yes' | 'no'; history: { answer: 'yes' | 'no' }[] }

export const KIA = (milestonesJson.kia_checklists as KiaBand[]).filter((b) => b.items.length)
export const CDC = milestonesJson.cdc_milestones as CdcGroup[]
export const RED_FLAGS = Object.fromEntries(milestonesJson.red_flag_rules.map((r) => [r.id, r]))
export const SCREENING = milestonesJson.screening_schedule as { what: string; age_months: number[]; source: string; page?: string }[]

export const kiaBandFor = (m: number) => KIA.find((b) => b.start_months <= m && m < b.cutoff_months) ?? null
/** The band whose age limit was reached most recently: what the child should already do now. */
export const kiaPassedFor = (m: number) => KIA.filter((b) => b.cutoff_months <= m).at(-1) ?? null
/** CDC milestones are what most children (≥75%) do *by* that age: the latest group already reached, else the first. */
export const cdcGroupFor = (m: number) => [...CDC].reverse().find((g) => g.age_months <= m) ?? CDC[0]
export const nextCdcGroup = (m: number) => CDC.find((g) => g.age_months > m) ?? null

// Month placement (research: CDC/AAP/WHO/IDAI). Shown as "biasanya mulai terlihat"; referral stays on KIA/CDC ages.
export type Monthly = Item & { set: 'KIA' | 'CDC'; expected: number; cutoff: number | null; verification: string }
const ITEMS = new Map([...KIA.flatMap((b) => b.items), ...CDC.flatMap((g) => g.items)].map((i) => [i.id, i]))
export const MONTHLY: Monthly[] = monthlyJson.milestone_months
  .filter((p) => ITEMS.has(p.item_id))
  .map((p) => ({ ...ITEMS.get(p.item_id)!, set: p.set as 'KIA' | 'CDC', expected: p.expected_month, cutoff: p.referral_cutoff_month, verification: p.verification }))
export const milestonesForMonth = (g: number) => MONTHLY.filter((x) => x.expected === g)

export type Flag = { rule: 'RF-KIA-CUTOFF' | 'RF-CDC-MISSING' | 'RF-REGRESSION'; items: Item[] }

/** Red flags (milestones.json rules): a "Belum" at or past the age limit, or a skill that was there and is gone. */
export function redFlags(m: number, answers: Answer[]): Flag[] {
  const by = new Map(answers.map((a) => [a.item_id, a]))
  const no = (i: Item) => by.get(i.id)?.answer === 'no'
  const flags: Flag[] = []
  const regress = [...KIA.flatMap((b) => b.items), ...CDC.flatMap((g) => g.items)].filter((i) => no(i) && by.get(i.id)!.history.some((h) => h.answer === 'yes'))
  if (regress.length) flags.push({ rule: 'RF-REGRESSION', items: regress })
  const kia = KIA.filter((b) => m >= b.cutoff_months).flatMap((b) => b.items).filter((i) => no(i) && !regress.includes(i))
  if (kia.length) flags.push({ rule: 'RF-KIA-CUTOFF', items: kia })
  const cdc = CDC.filter((g) => m >= g.age_months).flatMap((g) => g.items).filter((i) => no(i) && !regress.includes(i))
  if (cdc.length) flags.push({ rule: 'RF-CDC-MISSING', items: cdc })
  return flags
}

export function nextScreenings(m: number) {
  return SCREENING.map((s) => ({ ...s, next: s.age_months.find((a) => a >= m) ?? null })).filter((s) => s.next !== null)
}
