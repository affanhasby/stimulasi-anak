import { describe, expect, it } from 'vitest'
import { adjustedLength, lengthStatus, valueAt, weightStatus, zScore } from './growth'

describe('WHO growth standards', () => {
  it('puts the WHO median at z = 0 (boys and girls, birth)', () => {
    expect(zScore('wfa', 'M', 0, 3.3464)).toBeCloseTo(0, 4)
    expect(zScore('wfa', 'F', 0, 3.2322)).toBeCloseTo(0, 4)
  })
  it('inverts: the value at z = -2 scores -2', () => {
    for (const m of [0, 6, 12.5, 30, 60]) expect(zScore('lhfa', 'F', m, valueAt('lhfa', 'F', m, -2))).toBeCloseTo(-2, 5)
  })
  it('extrapolates weight linearly beyond ±3 SD (WHO restricted method)', () => {
    const sd3 = valueAt('wfa', 'M', 12, 3)
    const sd2 = valueAt('wfa', 'M', 12, 2)
    expect(zScore('wfa', 'M', 12, sd3 + (sd3 - sd2))).toBeCloseTo(4, 5)
  })
  it('converts standing height under 2 years and lying length from 2 years (0.7 cm)', () => {
    expect(adjustedLength(80, 18, 'berdiri')).toBeCloseTo(80.7)
    expect(adjustedLength(90, 30, 'telentang')).toBeCloseTo(89.3)
    expect(adjustedLength(80, 18, 'telentang')).toBe(80)
  })
  it('uses Permenkes 2/2020 cut-offs', () => {
    expect(weightStatus(-2.5).label).toBe('Berat badan kurang')
    expect(weightStatus(0).level).toBe('ok')
    expect(lengthStatus(-3.2).label).toBe('Sangat pendek')
  })
})
