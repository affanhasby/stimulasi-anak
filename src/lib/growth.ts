import growthJson from '@data/growth_standards.json'
import { daysBetween, type IsoDate } from './date'

// WHO Child Growth Standards (2006), as adopted by Permenkes No. 2/2020 (Standar Antropometri Anak).
// LMS parameters by completed month 0–60; values between months are interpolated by exact age.
type Lms = { month: number; L: number; M: number; S: number }
type Sex = 'M' | 'F'
export type Indicator = 'wfa' | 'lhfa'

const LMS = growthJson.lms as unknown as Record<Indicator, Record<Sex, Lms[]>>
export const GROWTH_SOURCES = growthJson.sources as { id: string; publisher: string; title: string; url: string }[]
export const MAX_MONTH = 60

const DAYS_PER_MONTH = 30.4375

export const ageMonthsExact = (birth: IsoDate, on: IsoDate) => daysBetween(birth, on) / DAYS_PER_MONTH

function lmsAt(ind: Indicator, sex: Sex, months: number): Lms {
  const t = LMS[ind][sex]
  const m = Math.min(Math.max(months, 0), MAX_MONTH)
  const a = t[Math.floor(m)]
  const b = t[Math.min(Math.ceil(m), MAX_MONTH)]
  const f = m - Math.floor(m)
  return { month: m, L: a.L + (b.L - a.L) * f, M: a.M + (b.M - a.M) * f, S: a.S + (b.S - a.S) * f }
}

/** Value at a given z-score (inverse LMS); used to draw the reference curves. */
export function valueAt(ind: Indicator, sex: Sex, months: number, z: number) {
  const { L, M, S } = lmsAt(ind, sex, months)
  return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L)
}

/**
 * z-score from LMS. For weight, WHO restricts the LMS curve beyond ±3 SD and extrapolates linearly
 * from the 2–3 SD distance (WHO Anthro method); length/height uses plain LMS.
 */
export function zScore(ind: Indicator, sex: Sex, months: number, x: number) {
  const { L, M, S } = lmsAt(ind, sex, months)
  const z = L === 0 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S)
  if (ind !== 'wfa' || Math.abs(z) <= 3) return z
  const sd = (k: number) => valueAt(ind, sex, months, k)
  return z > 3 ? 3 + (x - sd(3)) / (sd(3) - sd(2)) : -3 + (x - sd(-3)) / (sd(-2) - sd(-3))
}

/** WHO convention: length (lying) under 24 months, height (standing) from 24 months; 0.7 cm between them. */
export function adjustedLength(cm: number, months: number, method: 'telentang' | 'berdiri' | null) {
  if (months < 24 && method === 'berdiri') return cm + 0.7
  if (months >= 24 && method === 'telentang') return cm - 0.7
  return cm
}

export type Status = { label: string; level: 'ok' | 'watch' | 'refer'; advice: string }

// Permenkes 2/2020 categories (z-score cut-offs).
export function weightStatus(z: number): Status {
  if (z < -3) return { label: 'Berat badan sangat kurang', level: 'refer', advice: 'Segera periksakan ke Puskesmas atau dokter anak.' }
  if (z < -2) return { label: 'Berat badan kurang', level: 'refer', advice: 'Konsultasikan ke bidan, Posyandu, atau dokter anak.' }
  if (z > 1) return { label: 'Risiko berat badan lebih', level: 'watch', advice: 'Cek berat terhadap panjang badan bersama petugas kesehatan.' }
  return { label: 'Berat badan normal', level: 'ok', advice: 'Sesuai standar. Lanjutkan menimbang tiap bulan.' }
}
export function lengthStatus(z: number): Status {
  if (z < -3) return { label: 'Sangat pendek', level: 'refer', advice: 'Segera periksakan ke Puskesmas atau dokter anak.' }
  if (z < -2) return { label: 'Pendek', level: 'refer', advice: 'Konsultasikan ke bidan, Posyandu, atau dokter anak.' }
  if (z > 3) return { label: 'Tinggi', level: 'watch', advice: 'Biasanya tidak berbahaya; tanyakan ke dokter bila ragu.' }
  return { label: 'Panjang/tinggi normal', level: 'ok', advice: 'Sesuai standar. Ukur ulang sesuai jadwal.' }
}

