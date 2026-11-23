import countersJson from '@data/counters.json'

// Routine reminders for the counter buttons that are on. Shared by the app (settings text) and the reminder
// function (copied by scripts/sync-shared.mjs), so both describe and send exactly the same rules.
// They are reminders, not medical norms: the norms with their sources stay in counters.json.

type Counter = { id: string; type: string; visible_months: number[]; default_on: boolean }
const COUNTERS = countersJson.counters as Counter[]

/** Every reminder is one of three kinds:
 * - every: nothing logged for these counters for `hours` (daytime only);
 * - at: fixed hours of the day, unless one was logged within the last 2 hours (MP-ASI meals, tummy time);
 * - running: a timer still running after `minutes` (forgot to stop it). */
export type Routine = {
  id: string
  counters: string[]
  label: string
  rule: string
  every?: number
  at?: number[]
  running?: number
  title: string
  body: (name: string) => string
}

/** Counter buttons that are on for this child: chosen in settings, or the defaults, and shown at this age. */
export const activeCounterIds = (ageMonths: number, enabled: string[] | null) =>
  COUNTERS.filter((c) => c.type !== 'derived' && (enabled ? enabled.includes(c.id) : c.default_on) && ageMonths >= c.visible_months[0] && ageMonths < c.visible_months[1]).map((c) => c.id)

/** The routine for one counter button at this age, or null when it has none (temperature, medicine). */
export function routineFor(counterId: string, ageMonths: number): Routine | null {
  switch (counterId) {
    case 'NURSE':
    case 'BOTTLE':
      // Buku KIA / AAP: 8-12 feeds in 24 hours for young babies, i.e. every 2-3 hours.
      return ageMonths < 6
        ? { id: 'feed', counters: ['NURSE', 'BOTTLE'], label: 'Menyusu', rule: 'Bila 3 jam belum ada catatan menyusu (8–12 kali sehari = tiap 2–3 jam)', every: 3, title: 'Waktunya menyusu?', body: (n) => `Sudah 3 jam belum ada catatan menyusu ${n}. Kalau sudah, ketuk untuk mencatat.` }
        : { id: 'feed', counters: ['NURSE', 'BOTTLE'], label: 'Menyusu', rule: 'Bila 4 jam belum ada catatan menyusu (tetap sesuai keinginan anak di sela MP-ASI)', every: 4, title: 'Waktunya menyusu?', body: (n) => `Sudah 4 jam belum ada catatan menyusu ${n}.` }
    case 'BAK':
    case 'BAB':
      return { id: 'diaper', counters: ['BAK', 'BAB'], label: 'Cek popok', rule: 'Bila 3 jam belum ada catatan pipis atau BAB', every: 3, title: 'Cek popok', body: (n) => `Sudah 3 jam belum ada catatan pipis atau BAB ${n}. Popoknya basah? Ketuk untuk mencatat.` }
    case 'PUMP':
      return { id: 'pump', counters: ['PUMP'], label: 'Pompa ASI', rule: 'Bila 3 jam belum memompa (sekitar 8 kali sehari)', every: 3, title: 'Waktunya pompa ASI?', body: () => 'Sudah 3 jam sejak pompa ASI terakhir.' }
    case 'MPASI':
      // Buku KIA: 6-8 months 2-3 meals + 1-2 snacks; 9-23 months 3-4 meals + 1-2 snacks.
      return ageMonths < 9
        ? { id: 'mpasi', counters: ['MPASI'], label: 'MP-ASI', rule: 'Pukul 07.00, 10.00 (selingan), 12.00, 17.00', at: [7, 10, 12, 17], title: 'Waktunya makan', body: (n) => `Waktunya MP-ASI untuk ${n}.` }
        : { id: 'mpasi', counters: ['MPASI'], label: 'MP-ASI', rule: 'Pukul 07.00, 10.00 (selingan), 12.00, 15.00 (selingan), 18.00', at: [7, 10, 12, 15, 18], title: 'Waktunya makan', body: (n) => `Waktunya makan atau selingan untuk ${n}.` }
    case 'TUMMY':
      return { id: 'tummy', counters: ['TUMMY'], label: 'Tengkurap', rule: 'Pukul 09.00, 13.00, 16.00 (saat bangun dan diawasi); timer lebih dari 20 menit', at: [9, 13, 16], running: 20, title: 'Waktunya tengkurap', body: (n) => `Ajak ${n} tengkurap sebentar saat bangun dan diawasi.` }
    case 'SLEEP':
      return { id: 'sleep', counters: ['SLEEP'], label: 'Tidur', rule: 'Bila timer tidur masih berjalan lebih dari 4 jam di siang hari', running: 240, title: 'Masih tidur?', body: (n) => `Timer tidur ${n} masih berjalan lebih dari 4 jam. Kalau sudah bangun, ketuk kotak Tidur untuk menghentikan.` }
    default:
      return null
  }
}

/** One reminder per routine (menyusu covers ASI and botol; cek popok covers pipis and BAB), minus those turned off. */
export function routinesFor(ageMonths: number, enabled: string[] | null, off: string[]) {
  const out = new Map<string, Routine>()
  for (const id of activeCounterIds(ageMonths, enabled)) {
    const r = routineFor(id, ageMonths)
    if (r && !off.includes(r.id) && !out.has(r.id)) out.set(r.id, r)
  }
  return [...out.values()]
}
