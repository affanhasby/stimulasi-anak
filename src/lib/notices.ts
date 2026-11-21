import { addMonths, ageInMonths, daysBetween, developmentalBirth, type IsoDate } from './date'
import type { AnswerRow, Child, HealthCheckRow, MeasurementRow, VaccineRow } from './db'
import { kiaBandFor, milestonesForMonth } from './milestones'
import { gridMonth } from './stimulation'
import { doseName, vaccineSchedule } from './vaccines'

export type Notice = { id: string; text: string; route: string; action: string }

/**
 * What is new for this child today. Each notice has a stable id, so it is announced once:
 * a new stimulation age band, a new milestone checklist, and a visit whose vaccines can now be given.
 */
export function currentNotices(
  child: Child,
  today: IsoDate,
  vaccines: VaccineRow[],
  extra: { health?: HealthCheckRow[]; answers?: AnswerRow[]; measurements?: MeasurementRow[]; hour?: number } = {},
): Notice[] {
  const out: Notice[] = []
  const name = child.nickname
  // Daily check nudge, from 9 a.m., only while today's check is missing.
  if ((extra.hour ?? 0) >= 9 && !extra.health?.some((h) => h.day === today))
    out.push({ id: `cek-${today}`, text: `Sudah cek kondisi ${name} hari ini? Sekitar 30 detik.`, route: 'cek-kondisi', action: 'Cek' })
  // Monthly weighing (Posyandu schedule), until 5 years.
  const lastWeight = extra.measurements?.filter((r) => r.weight_kg !== null).at(-1)
  if (daysBetween(child.birth_date, today) <= 5 * 365 && (!lastWeight || lastWeight.measured_on.slice(0, 7) < today.slice(0, 7)))
    out.push({ id: `timbang-${today.slice(0, 7)}`, text: `Waktunya menimbang ${name} bulan ini. Sudah ditimbang? Catat hasilnya.`, route: 'ukur', action: 'Catat' })
  // Length/height at least every 3 months (Permenkes 66/2014).
  const lastLength = extra.measurements?.filter((r) => r.length_cm !== null).at(-1)
  if (daysBetween(child.birth_date, today) <= 5 * 365 && (!lastLength || daysBetween(lastLength.measured_on, today) >= 90))
    out.push({ id: `ukur-${lastLength?.measured_on ?? 'awal'}`, text: `Waktunya mengukur panjang/tinggi ${name}. Catat hasilnya.`, route: 'ukur', action: 'Catat' })
  const vax = vaccineSchedule(child, vaccines, today).filter((d) => d.status === 'due' || d.status === 'ending_soon')
  if (vax.length) {
    const first = vax.sort((a, b) => a.earliest.localeCompare(b.earliest))[0].earliest
    const names = vax.filter((d) => d.earliest === first).map((d) => doseName(d.dose))
    out.push({ id: `vax-${child.schedule}-${first}`, text: `${name} sudah bisa imunisasi ${names.join(', ')}.`, route: 'imunisasi', action: 'Lihat' })
  }

  const m = ageInMonths(developmentalBirth(child.birth_date, today, child.gestational_weeks), today)
  const g = gridMonth(Math.min(m, 71))
  out.push({ id: `stim-m${g}`, text: `Kegiatan stimulasi baru untuk usia ${g} bulan.`, route: 'stimulasi', action: 'Lihat' })
  const items = milestonesForMonth(g)
  if (items.length) out.push({ id: `km-m${g}`, text: `${items.length} kemampuan baru untuk dicek di usia ${g} bulan.`, route: 'tumbuh', action: 'Cek' })

  const kia = m < 24 ? kiaBandFor(m) : null
  if (kia) {
    // PRD: a week before the age limit, ask for the checklist (only if something is still unanswered).
    const dev = developmentalBirth(child.birth_date, today, child.gestational_weeks)
    const left = daysBetween(today, addMonths(dev, kia.cutoff_months))
    const answered = new Set(extra.answers?.map((a) => a.item_id))
    if (left <= 7 && kia.items.some((i) => !answered.has(i.id)))
      out.push({ id: `kia-check-${kia.id}`, text: `Cek kemampuan ${name} minggu ini (sebelum usia ${kia.cutoff_months} bulan).`, route: 'tumbuh', action: 'Cek' })
  }
  return out
}
