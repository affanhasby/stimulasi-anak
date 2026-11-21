import vaccinesJson from '@data/vaccines.json'
import { addAge, addDays, addMonths, daysBetween, maxDate, type AgeOffset, type IsoDate } from './date'

export type ScheduleId = 'KEMENKES' | 'IDAI'
export type Verification = 'verified' | 'partial' | 'unverified'

export type Dose = {
  id: string
  schedule: ScheduleId
  vaccine: string
  dose: string
  recommended?: AgeOffset
  earliest?: AgeOffset
  on_time_until?: AgeOffset | null
  max_until?: AgeOffset | null
  min_interval_days_from_prev?: number
  relative_to?: { dose: string; offset: AgeOffset; not_before?: AgeOffset; on_time_window: AgeOffset }
  recurrence?: { after_dose: string; every_months: number; until: AgeOffset }
  trigger?: 'school_grade'
  school_grade?: number
  approx_age?: AgeOffset
  sex?: 'F' | 'M'
  condition?: string
  optional?: boolean
  note?: string
  on_time_note?: string
  source: string
  related_source?: string
  verification: Verification
}

export const DOSES = vaccinesJson.doses as Dose[]
export const VACCINES = vaccinesJson.vaccines
export const REMINDER_OPTIONS = vaccinesJson.reminder_options
export const VACCINES_AS_OF = vaccinesJson.as_of

export type VaccineChild = {
  birth_date: IsoDate
  schedule: ScheduleId
  sex?: 'M' | 'F' | null
  je_endemic?: boolean | null
  rv_pentavalent?: boolean | null
}

/** `dose_key` is the dose id, or `<id>#<n>` for the n-th repeat of a recurring dose. */
export type VaccineRecord = { dose_key: string; status: 'done' | 'skipped'; given_date: IsoDate | null }

export type DoseStatus =
  | 'done' // Sudah
  | 'skipped'
  | 'upcoming' // Akan datang
  | 'due' // Bisa diberikan sekarang
  | 'ending_soon' // Mendekati batas
  | 'late' // Terlambat
  | 'waiting' // Menunggu dosis acuan diberikan
  | 'school' // Diberikan di sekolah (BIAS), tanpa tanggal pasti
  | 'conditional' // Hanya bila syaratnya berlaku (mis. daerah endemis JE)

export type ScheduledDose = {
  key: string
  dose: Dose
  occurrence?: number
  earliest: IsoDate // 'Mulai bisa' (perkiraan bila status waiting/school)
  onTimeUntil: IsoDate | null // 'Paling lambat'
  maxUntil: IsoDate | null // 'Batas maksimal'; null = sumber tidak menyebut batas
  status: DoseStatus
  givenDate: IsoDate | null
  waitingFor?: string
}

export const ENDING_SOON_DAYS = 3

const SHORT_DOSE: [RegExp, string][] = [
  [/^OPV(\d)$/, 'Polio $1'],
  [/^IPV(\d)$/, 'IPV $1'],
  [/^PCV(\d)$/, 'PCV $1'],
  [/^RV(\d)$/, 'Rotavirus $1'],
  [/^MR(\d)$/, 'MR $1'],
]
/** Data names some doses tersely ("OPV3"); spell them the way a parent reads them ("Polio 3"). */
export const doseName = (d: Dose) => SHORT_DOSE.reduce((s, [re, to]) => s.replace(re, to), d.dose)

const CONDITIONS: Record<string, (c: VaccineChild) => boolean | null | undefined> = {
  region_endemic_je: (c) => c.je_endemic,
  rv_pentavalent: (c) => c.rv_pentavalent,
}

function statusFor(today: IsoDate, earliest: IsoDate, onTimeUntil: IsoDate | null): DoseStatus {
  if (today < earliest) return 'upcoming'
  if (!onTimeUntil) return 'due'
  if (today > onTimeUntil) return 'late'
  return daysBetween(today, onTimeUntil) <= ENDING_SOON_DAYS ? 'ending_soon' : 'due'
}

export function vaccineSchedule(
  child: VaccineChild,
  records: VaccineRecord[],
  today: IsoDate,
  doses: Dose[] = DOSES,
): ScheduledDose[] {
  const birth = child.birth_date
  const byKey = new Map(records.map((r) => [r.dose_key, r]))
  const computed = new Map<string, ScheduledDose>()
  const lastInSeries = new Map<string, ScheduledDose>()
  const out: ScheduledDose[] = []

  const finish = (s: Omit<ScheduledDose, 'status' | 'givenDate'>, forced?: DoseStatus): ScheduledDose => {
    const rec = byKey.get(s.key)
    const status: DoseStatus = rec
      ? rec.status
      : (forced ?? (s.waitingFor ? 'waiting' : statusFor(today, s.earliest, s.onTimeUntil)))
    return { ...s, status, givenDate: rec?.status === 'done' ? (rec.given_date ?? s.earliest) : null }
  }
  // Date the next dose counts from: when it was given, else when it could be given.
  const anchor = (s: ScheduledDose) => s.givenDate ?? s.earliest

  for (const dose of doses) {
    if (dose.schedule !== child.schedule) continue
    if (dose.sex && child.sex && dose.sex !== child.sex) continue

    const conditionMet = dose.condition ? CONDITIONS[dose.condition]?.(child) === true : true
    const forced: DoseStatus | undefined = dose.trigger === 'school_grade' ? 'school' : conditionMet ? undefined : 'conditional'
    const maxUntil = dose.max_until ? addAge(birth, dose.max_until) : null

    let base: Omit<ScheduledDose, 'status' | 'givenDate'> | null = null
    if (dose.trigger === 'school_grade' && dose.approx_age) {
      base = { key: dose.id, dose, earliest: addAge(birth, dose.approx_age), onTimeUntil: null, maxUntil: null }
    } else if (dose.relative_to) {
      const r = dose.relative_to
      const ref = computed.get(r.dose)
      if (!ref) continue // reference dose filtered out (other schedule/sex)
      let earliest = addAge(anchor(ref), r.offset)
      if (r.not_before) earliest = maxDate(earliest, addAge(birth, r.not_before))
      base = {
        key: dose.id,
        dose,
        earliest,
        onTimeUntil: addAge(earliest, r.on_time_window),
        maxUntil,
        waitingFor: ref.givenDate ? undefined : r.dose,
      }
    } else if (dose.earliest) {
      let earliest = addAge(birth, dose.earliest)
      let onTimeUntil = dose.on_time_until ? addAge(birth, dose.on_time_until) : null
      const prev = lastInSeries.get(dose.vaccine)
      if (dose.min_interval_days_from_prev && prev) {
        const shifted = addDays(anchor(prev), dose.min_interval_days_from_prev)
        if (shifted > earliest) {
          // shortcut: the on-time window keeps its length when a late previous dose pushes it; maxUntil stays an age limit.
          if (onTimeUntil) onTimeUntil = addDays(onTimeUntil, daysBetween(earliest, shifted))
          earliest = shifted
        }
      }
      base = { key: dose.id, dose, earliest, onTimeUntil, maxUntil }
    }

    if (base) {
      const s = finish(base, forced)
      computed.set(dose.id, s)
      if (!dose.relative_to && dose.trigger !== 'school_grade') lastInSeries.set(dose.vaccine, s)
      out.push(s)
    }

    if (dose.recurrence) {
      const rec = dose.recurrence
      const ref = computed.get(rec.after_dose)
      if (!ref) continue
      const until = addAge(birth, rec.until)
      let prev = ref
      // Past repeats plus the next pending one; the list would otherwise run to age 18.
      for (let n = 1; ; n++) {
        const earliest = addMonths(anchor(prev), rec.every_months)
        if (earliest >= until) break
        // shortcut: repeats get a one-month on-time window; the data gives none.
        const s = finish(
          {
            key: `${dose.id}#${n}`,
            dose,
            occurrence: n,
            earliest,
            onTimeUntil: addDays(addMonths(earliest, 1), -1),
            maxUntil: null,
            waitingFor: prev.givenDate ? undefined : prev.key,
          },
          forced,
        )
        out.push(s)
        if (s.status !== 'done') break
        prev = s
      }
    }
  }
  return out
}

const PROGRAM_CODES = new Set(DOSES.filter((d) => d.schedule === 'KEMENKES').map((d) => d.vaccine))
// IDAI's private combinations of program antigens count as the program vaccine they replace.
const SAME_AS_PROGRAM: Record<string, string> = { DTP: 'DPT-HB-Hib', Hib: 'DPT-HB-Hib' }

export type VaccineInfo = { name: string; protects: string; kind: 'wajib' | 'wajib-daerah' | 'tambahan' | 'opsional'; label: string; reason: string }

/**
 * What a vaccine is for, and whether it is part of the government program (wajib) or an extra the IDAI schedule adds.
 * Classification follows the two schedules in vaccines.json; it says nothing beyond what those schedules state.
 */
export function vaccineInfo(dose: Dose): VaccineInfo {
  const v = VACCINES.find((x) => x.code === dose.vaccine)
  const name = v?.name ?? dose.vaccine
  const protects = v?.protects ?? ''
  if (dose.condition === 'region_endemic_je')
    return { name, protects, kind: 'wajib-daerah', label: 'Wajib di daerah endemis', reason: 'Program pemerintah memberikannya hanya di daerah yang berisiko Japanese Encephalitis. Tanyakan ke Puskesmas apakah daerah Ayah/Bunda termasuk.' }
  if (PROGRAM_CODES.has(dose.vaccine) || SAME_AS_PROGRAM[dose.vaccine])
    return {
      name,
      protects,
      kind: 'wajib',
      label: 'Wajib (program pemerintah)',
      reason: SAME_AS_PROGRAM[dose.vaccine]
        ? `Melindungi dari penyakit yang sama dengan vaksin program ${SAME_AS_PROGRAM[dose.vaccine]}, yang termasuk imunisasi rutin lengkap Kemenkes untuk semua anak. Versi ini diberikan di dokter anak/RS swasta.`
        : 'Termasuk imunisasi rutin lengkap Kemenkes untuk semua anak di Indonesia, diberikan gratis di Posyandu/Puskesmas.',
    }
  if (dose.optional)
    return { name, protects, kind: 'opsional', label: 'Tambahan (opsional)', reason: 'Tidak termasuk program pemerintah. IDAI 2024 mencantumkannya sebagai pilihan; diskusikan dengan dokter anak apakah perlu.' }
  return {
    name,
    protects,
    kind: 'tambahan',
    label: 'Tambahan (anjuran IDAI)',
    reason:
      dose.vaccine === 'MMR'
        ? 'Program pemerintah memakai vaksin MR (campak-rubela). MMR dari IDAI menambah perlindungan gondongan; tersedia di dokter anak/RS swasta, biasanya berbayar.'
        : 'Tidak termasuk program pemerintah, tetapi dianjurkan IDAI 2024 untuk perlindungan tambahan. Tersedia di dokter anak/RS swasta, biasanya berbayar.',
  }
}
