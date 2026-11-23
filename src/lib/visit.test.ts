import { expect, test } from 'vitest'
import { missed, nextVisit } from './visit'
import { vaccineSchedule } from './vaccines'

// A 9-month-old who missed rotavirus 3 (past its maximum age) while MR1 and IPV2 are due now.
const child = { id: 'c', birth_date: '2026-02-15', schedule: 'KEMENKES', je_endemic: null, rv_pentavalent: null, gestational_weeks: null } as never
const today = '2026-11-23'
const given = vaccineSchedule(child, [], today)
  .filter((d) => d.earliest < '2026-11-01' && !['K-RV3', 'K-MR1', 'K-IPV2'].includes(d.key))
  .map((d) => ({ dose_key: d.key, status: 'done' as const, given_date: d.earliest }))
const doses = vaccineSchedule(child, given, today)

test('a late dose never hides doses that are due now', () => {
  const visit = nextVisit(doses, today)!
  const keys = visit.doses.map((d) => d.key)
  expect(keys).toContain('K-MR1')
  expect(keys).toContain('K-IPV2')
})

test('a dose past its maximum age is listed apart, not as the visit', () => {
  const visit = nextVisit(doses, today)!
  expect(visit.doses.map((d) => d.key)).not.toContain('K-RV3')
  expect(doses.filter((d) => missed(d, today)).map((d) => d.key)).toContain('K-RV3')
})
