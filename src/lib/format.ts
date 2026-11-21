import { addMonths, ageInMonths, daysBetween, type IsoDate } from './date'

export const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
export const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const DAYS_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const parts = (iso: IsoDate) => iso.split('-').map(Number)
/** "3 Agu", with the year only when it is not this year. */
export const shortDate = (iso: IsoDate) =>
  `${parts(iso)[2]} ${MONTHS_SHORT[parts(iso)[1] - 1]}${parts(iso)[0] !== new Date().getFullYear() ? ` ${parts(iso)[0]}` : ''}`
export const longDate = (iso: IsoDate) => `${parts(iso)[2]} ${MONTHS[parts(iso)[1] - 1]} ${parts(iso)[0]}`
export const weekday = (iso: IsoDate) => DAYS_SHORT[new Date(`${iso}T00:00:00Z`).getUTCDay()]

export function ageText(birth: IsoDate, today: IsoDate) {
  const m = ageInMonths(birth, today)
  const d = daysBetween(addMonths(birth, m), today)
  if (m === 0) return `${d} hari`
  if (m >= 24) return `${Math.floor(m / 12)} tahun${m % 12 ? ` ${m % 12} bulan` : ''}`
  return `${m} bulan${d ? ` ${d} hari` : ''}`
}

/** "Usia 9 bulan", "Usia 2 tahun" for an age offset in months. */
export const ageLabel = (months: number) => (months === 0 ? 'Saat lahir' : months < 24 || months % 12 ? `Usia ${months} bulan` : `Usia ${months / 12} tahun`)
