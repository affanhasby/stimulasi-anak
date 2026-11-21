import { dangerGroupsFor } from './content'

export type Question = { id: string; text: string; level: 'bahaya' | 'perhatian'; source: string; page?: string; group: string }
export type CheckResult = 'aman' | 'perhatian' | 'bahaya'

// Buku KIA: one danger sign is enough to go to a health facility now. The dehydration list (Sutter Health,
// accepted exception) asks to call a doctor and feed more, so it raises "perhatian" rather than "bahaya".
const LEVEL: Record<string, Question['level']> = { 'DS-DEHYDRATION': 'perhatian' }

/** The day's questions for this age: every danger sign for the child's age, each asked once. */
export function questionsFor(ageDays: number): Question[] {
  const seen = new Map<string, Question>()
  for (const g of dangerGroupsFor(ageDays))
    g.signs.forEach((text, i) => {
      const key = text.toLowerCase().replace(/[^a-z]/g, '')
      const q: Question = { id: `${g.id}:${i}`, text, level: LEVEL[g.id] ?? 'bahaya', source: g.source, page: g.page, group: g.label }
      const prev = seen.get(key)
      if (!prev || (prev.level === 'perhatian' && q.level === 'bahaya')) seen.set(key, q)
    })
  // Most urgent first, so a "Ya" on the worst signs comes early.
  return [...seen.values()].sort((a, b) => (a.level === b.level ? 0 : a.level === 'bahaya' ? -1 : 1))
}

export function resultOf(questions: Question[], answers: Record<string, boolean>): CheckResult {
  const yes = questions.filter((q) => answers[q.id])
  if (yes.some((q) => q.level === 'bahaya')) return 'bahaya'
  return yes.length ? 'perhatian' : 'aman'
}
