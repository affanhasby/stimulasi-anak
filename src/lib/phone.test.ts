import { describe, expect, it } from 'vitest'
import { waNumber } from './phone'

describe('waNumber', () => {
  it('turns local formats into 62...', () => {
    expect(waNumber('0812-3456-7890')).toBe('6281234567890')
    expect(waNumber('+62 812 3456 7890')).toBe('6281234567890')
    expect(waNumber('812 3456 7890')).toBe('6281234567890')
    expect(waNumber('6281234567890')).toBe('6281234567890')
  })
  it('rejects what cannot be a number', () => {
    expect(waNumber('')).toBeNull()
    expect(waNumber('12345')).toBeNull()
    expect(waNumber('0812')).toBeNull()
  })
})
