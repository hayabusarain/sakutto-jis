import { describe, expect, it } from 'vitest'
import { normalizeGaId } from './analytics'

describe('normalizeGaId', () => {
  it('G-XXXXXXXXXX の形だけを受け付ける', () => {
    expect(normalizeGaId('G-ABC123XYZ9')).toBe('G-ABC123XYZ9')
    expect(normalizeGaId(' G-ABC123XYZ9 ')).toBe('G-ABC123XYZ9')
    expect(normalizeGaId('UA-12345-1')).toBe('')
    expect(normalizeGaId('G-abc')).toBe('')
    expect(normalizeGaId(undefined)).toBe('')
    expect(normalizeGaId('G-1234"><script>')).toBe('')
  })
})
