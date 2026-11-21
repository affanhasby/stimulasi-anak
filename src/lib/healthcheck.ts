import { dangerGroupsFor, sourceLabel } from './content'

/** One question covers one body topic; `signs` are the source's own danger signs it stands for. */
export type Question = { id: string; text: string; signs: string[]; level: 'bahaya' | 'perhatian'; sources: { source: string; page?: string }[] }
export type CheckResult = 'aman' | 'perhatian' | 'bahaya'

// The source lists overlap (newborn, jaundice, toddler, dehydration), so the raw list runs to ~20 signs.
// Each topic asks once about related signs; order = most urgent first. A sign joins the first topic it matches.
const TOPICS: { id: string; text: string; match: (sign: string, group: string) => boolean }[] = [
  { id: 'kejang', text: 'Kejang', match: (s) => /kejang/i.test(s) },
  { id: 'napas', text: 'Sesak napas atau kulit kebiruan', match: (s) => /napas|kebiruan/i.test(s) },
  { id: 'minum', text: 'Tidak mau menyusu atau tidak bisa minum', match: (s, g) => g !== 'DS-DEHYDRATION' && /menyusu|minum/i.test(s) },
  { id: 'demam', text: 'Demam tinggi, tubuh dingin, lemas, atau merintih terus', match: (s) => /demam|dingin|lemah|merintih/i.test(s) },
  { id: 'cerna', text: 'Muntah-muntah atau diare', match: (s) => /muntah|diare/i.test(s) },
  { id: 'kuning', text: 'Kulit atau mata kuning, atau tinja pucat', match: (s, g) => g === 'DS-JAUNDICE' || /kuning|pucat/i.test(s) },
  { id: 'pusat', text: 'Tali pusat merah, berbau, atau bernanah', match: (s) => /pusat/i.test(s) },
  { id: 'lain', text: 'Bengkak sakit di belakang telinga, atau perdarahan', match: (s) => /telinga|darah/i.test(s) },
  // Buku KIA: one danger sign is enough to go now. The dehydration list (Sutter Health, accepted exception)
  // asks to feed more and call a doctor, so it raises "perhatian" rather than "bahaya".
  { id: 'cairan', text: 'Tanda kurang cairan', match: (_, g) => g === 'DS-DEHYDRATION' },
]

/** The day's questions for this age: one per topic that has at least one sign at this age. */
export function questionsFor(ageDays: number): Question[] {
  const byTopic = new Map<string, Question>()
  for (const g of dangerGroupsFor(ageDays))
    for (const sign of g.signs) {
      const t = TOPICS.find((t) => t.match(sign, g.id))
      const id = t?.id ?? sign
      const q = byTopic.get(id) ?? { id, text: t?.text ?? sign, signs: [], level: 'perhatian' as const, sources: [] }
      if (g.id !== 'DS-DEHYDRATION') q.level = 'bahaya'
      const key = sign.toLowerCase().replace(/[^a-z]/g, '')
      if (!q.signs.some((s) => s.toLowerCase().replace(/[^a-z]/g, '') === key)) q.signs.push(sign)
      if (!q.sources.some((s) => s.source === g.source && s.page === g.page)) q.sources.push({ source: g.source, page: g.page })
      byTopic.set(id, q)
    }
  const order = (q: Question) => TOPICS.findIndex((t) => t.id === q.id)
  // A topic with a single sign at this age asks exactly that sign.
  return [...byTopic.values()].map((q) => (q.signs.length === 1 ? { ...q, text: q.signs[0] } : q)).sort((a, b) => order(a) - order(b))
}

export function resultOf(questions: Question[], answers: Record<string, boolean>): CheckResult {
  const yes = questions.filter((q) => answers[q.id])
  if (yes.some((q) => q.level === 'bahaya')) return 'bahaya'
  return yes.length ? 'perhatian' : 'aman'
}

export const sourcesText = (qs: Question[]) => [...new Set(qs.flatMap((q) => q.sources.map((s) => sourceLabel(s.source, s.page))))].join('; ')

/** The signs a topic's title does not already say, shown under it. */
export const detailOf = (q: Question) => q.signs.filter((s) => !q.text.toLowerCase().includes(s.toLowerCase()))
