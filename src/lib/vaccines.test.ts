import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { addMonths, ageInMonths, developmentalBirth } from './date'
import { DOSES, vaccineInfo, vaccineSchedule, type VaccineChild } from './vaccines'

const kemenkes: VaccineChild = { birth_date: '2026-01-31', schedule: 'KEMENKES' }
const idai: VaccineChild = { birth_date: '2026-01-31', schedule: 'IDAI', sex: 'F' }
const byKey = (rows: ReturnType<typeof vaccineSchedule>) => new Map(rows.map((r) => [r.key, r]))

describe('date', () => {
  it('clamps to the last day of shorter months', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2026-12-31', 2)).toBe('2027-02-28')
  })
  it('switches the month exactly on the monthly birthday', () => {
    expect(ageInMonths('2026-01-31', '2026-02-27')).toBe(0)
    expect(ageInMonths('2026-01-31', '2026-02-28')).toBe(1)
    expect(ageInMonths('2026-01-15', '2027-01-14')).toBe(11)
    expect(ageInMonths('2026-01-15', '2027-01-15')).toBe(12)
  })
  it('uses corrected age for preterm children until 24 months', () => {
    expect(developmentalBirth('2026-01-01', '2026-06-01', 32)).toBe('2026-02-26')
    expect(developmentalBirth('2026-01-01', '2028-01-01', 32)).toBe('2026-01-01')
    expect(developmentalBirth('2026-01-01', '2026-06-01', 38)).toBe('2026-01-01')
  })
})

describe('vaccine schedule', () => {
  it('matches the README test table (birth 2026-01-31, Kemenkes)', () => {
    const readme = readFileSync(new URL('../../PRD dan Data/README.md', import.meta.url), 'utf8')
    const rows = readme
      .split('\n')
      .filter((l) => l.startsWith('| K-'))
      .map((l) => l.split('|').map((c) => c.trim()))
    expect(rows.length).toBeGreaterThanOrEqual(21)
    const got = byKey(vaccineSchedule(kemenkes, [], '2026-01-31'))
    for (const [, id, , earliest, onTime, max] of rows) {
      const d = got.get(id)
      expect(d, id).toBeDefined()
      expect([id, d!.earliest, d!.onTimeUntil ?? '-', d!.maxUntil ?? '-']).toEqual([id, earliest, onTime, max])
    }
  })

  it('derives status from today', () => {
    const at = (today: string) => byKey(vaccineSchedule(kemenkes, [], today)).get('K-DPT1')!.status
    expect(at('2026-03-30')).toBe('upcoming')
    expect(at('2026-03-31')).toBe('due')
    expect(at('2026-04-26')).toBe('ending_soon')
    expect(at('2026-04-29')).toBe('ending_soon')
    expect(at('2026-04-30')).toBe('late')
  })

  it('marks recorded doses done with their given date', () => {
    const d = byKey(vaccineSchedule(kemenkes, [{ dose_key: 'K-BCG', status: 'done', given_date: '2026-02-03' }], '2026-06-01'))
    expect(d.get('K-BCG')).toMatchObject({ status: 'done', givenDate: '2026-02-03' })
  })

  it('pushes the next dose when the previous one was given late (28-day minimum)', () => {
    const rec = [{ dose_key: 'K-DPT1', status: 'done' as const, given_date: '2026-05-20' }]
    const d = byKey(vaccineSchedule(kemenkes, rec, '2026-05-20')).get('K-DPT2')!
    expect(d.earliest).toBe('2026-06-17')
    expect(d.onTimeUntil).toBe('2026-07-17') // window keeps its length (30 days)
  })

  it('keeps JE conditional unless the region is endemic', () => {
    expect(byKey(vaccineSchedule(kemenkes, [], '2026-12-01')).get('K-JE')!.status).toBe('conditional')
    expect(byKey(vaccineSchedule({ ...kemenkes, je_endemic: true }, [], '2026-12-01')).get('K-JE')!.status).toBe('due')
  })

  it('shows school (BIAS) doses without exact dates and hides HPV for boys', () => {
    const boy = byKey(vaccineSchedule({ ...kemenkes, sex: 'M' }, [], '2026-02-01'))
    expect(boy.get('K-BIAS-MR')!.status).toBe('school')
    expect(boy.has('K-BIAS-HPV1')).toBe(false)
    expect(byKey(vaccineSchedule({ ...kemenkes, sex: 'F' }, [], '2026-02-01')).has('K-BIAS-HPV1')).toBe(true)
  })

  it('counts Varicella 2 from Varicella 1 (90 days, not before 14 months)', () => {
    const waiting = byKey(vaccineSchedule(idai, [], '2027-01-01')).get('I-VAR2')!
    expect(waiting).toMatchObject({ status: 'waiting', waitingFor: 'I-VAR1' })
    const rec = [{ dose_key: 'I-VAR1', status: 'done' as const, given_date: '2027-01-31' }]
    const d = byKey(vaccineSchedule(idai, rec, '2027-05-10')).get('I-VAR2')!
    expect(d).toMatchObject({ earliest: '2027-05-01', onTimeUntil: '2027-05-31', status: 'due' })
  })

  it('repeats influenza yearly after dose 2 and lists only the next pending repeat', () => {
    const rec = [
      { dose_key: 'I-INF2', status: 'done' as const, given_date: '2026-09-15' },
      { dose_key: 'I-INF-YEARLY#1', status: 'done' as const, given_date: '2027-10-01' },
    ]
    const flu = vaccineSchedule(idai, rec, '2027-10-02').filter((s) => s.dose.id === 'I-INF-YEARLY')
    expect(flu.map((s) => [s.key, s.earliest, s.status])).toEqual([
      ['I-INF-YEARLY#1', '2027-09-15', 'done'],
      ['I-INF-YEARLY#2', '2028-10-01', 'upcoming'],
    ])
  })

  it('never shows a dose as late before it may be given (all birth days of a year)', () => {
    for (let m = 1; m <= 12; m++)
      for (const day of [1, 15, 28, 29, 30, 31]) {
        if (new Date(Date.UTC(2025, m - 1, day)).getUTCMonth() !== m - 1) continue // e.g. 30 Feb
        const birth = `2025-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        for (const schedule of ['KEMENKES', 'IDAI'] as const)
          for (const s of vaccineSchedule({ birth_date: birth, schedule, sex: 'F' }, [], birth))
            if (s.onTimeUntil) expect(s.onTimeUntil >= s.earliest, `${birth} ${s.key}`).toBe(true)
      }
  })

  it('labels program vaccines wajib and IDAI extras tambahan', () => {
    const kind = (id: string) => vaccineInfo(DOSES.find((d) => d.id === id)!).kind
    expect(kind('K-BCG')).toBe('wajib')
    expect(kind('I-M2')).toBe('wajib') // private DTP combo = program antigen
    expect(kind('K-JE')).toBe('wajib-daerah')
    expect(kind('I-VAR1')).toBe('tambahan')
    expect(kind('I-EV71-1')).toBe('opsional')
    expect(DOSES.every((d) => vaccineInfo(d).protects.length > 0)).toBe(true)
  })
})
