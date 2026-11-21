import { describe, expect, it } from 'vitest'
import { ACTIVITIES, dailyPlan, dayAchieved, todaysPicks } from './stimulation'

const birth = '2026-08-03' // 3 months on 2026-11-03

describe('daily stimulation plan', () => {
  it('uses the current month: every core activity plus three rotating picks', () => {
    const plan = dailyPlan(birth, '2026-11-21', 'child-a', [])
    expect(plan.band).toEqual({ start: 3, end: 4 })
    expect(plan.core.map((a) => a.id)).toEqual(expect.arrayContaining(['S-3-01', 'S-3-09']))
    expect(todaysPicks(plan)).toHaveLength(3)
    expect(plan.rotating.every((a) => a.start <= 3 && 3 < a.end)).toBe(true)
  })

  it('spreads picks across domains not already on the list', () => {
    for (const child of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const plan = dailyPlan(birth, '2026-11-21', child, [])
      const coreDomains = new Set(plan.core.map((a) => a.domain))
      const fresh = new Set(plan.rotating.map((a) => a.domain).filter((d) => !coreDomains.has(d)))
      const picked = new Set(todaysPicks(plan).filter((a) => !coreDomains.has(a.domain)).map((a) => a.domain))
      expect(picked.size, child).toBe(Math.min(3, fresh.size))
    }
  })

  it('switches band exactly on the monthly birthday', () => {
    expect(dailyPlan(birth, '2026-11-02', 'c', []).band.start).toBe(2)
    expect(dailyPlan(birth, '2026-11-03', 'c', []).band.start).toBe(3)
  })

  it('keeps the order stable for a day and changes it between children', () => {
    const ids = (d: string, c: string) => dailyPlan(birth, d, c, []).rotating.map((a) => a.id).join()
    expect(ids('2026-11-21', 'a')).toBe(ids('2026-11-21', 'a'))
    const orders = new Set(['a', 'b', 'c', 'd', 'e'].map((c) => ids('2026-11-21', c)))
    expect(orders.size).toBeGreaterThan(1)
  })

  it('puts the domain ticked least in the last 7 days first', () => {
    const social = ACTIVITIES.filter((a) => a.start === 3 && a.domain === 'sosial' && a.frequency === 'rotating')
    const checks = social.flatMap((a, i) => [{ day: `2026-11-1${5 + i}`, activity_id: a.id }])
    const picks = todaysPicks(dailyPlan(birth, '2026-11-21', 'a', checks))
    expect(picks.every((a) => a.domain !== 'sosial')).toBe(true)
  })

  it('adds one challenge from next month in the last two weeks of a month', () => {
    expect(dailyPlan(birth, '2026-11-10', 'a', []).challenge).toBeNull()
    const c = dailyPlan(birth, '2026-11-25', 'a', []).challenge // 4 months on 2026-12-03
    expect(c).toMatchObject({ kind: 'challenge' })
    expect(c!.start).toBeGreaterThan(3)
  })

  it('counts a day when one core and one rotating activity are ticked', () => {
    expect(dayAchieved('2026-11-21', [{ day: '2026-11-21', activity_id: 'S-3-01' }])).toBe(false)
    expect(
      dayAchieved('2026-11-21', [
        { day: '2026-11-21', activity_id: 'S-3-01' },
        { day: '2026-11-21', activity_id: 'S-3-02' },
      ]),
    ).toBe(true)
  })

  it('covers every month from 0 to 71 with at least one core and three rotating activities', () => {
    for (let m = 0; m < 72; m++) {
      const inBand = ACTIVITIES.filter((a) => a.start <= m && m < a.end)
      expect(inBand.some((a) => a.frequency === 'daily_core'), `month ${m}`).toBe(true)
      expect(inBand.filter((a) => a.frequency === 'rotating').length, `month ${m}`).toBeGreaterThanOrEqual(3)
    }
  })
})
