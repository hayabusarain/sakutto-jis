import { describe, expect, it } from 'vitest'
import { fixed, parseNumber, trim } from './format'

describe('parseNumber', () => {
  it.each([
    ['8.5', 8.5],
    [' 8.5 ', 8.5],
    ['８．５', 8.5],
    ['8,5', 8.5],
    ['10', 10],
    ['.5', 0.5],
    ['8.', 8],
  ])('%s → %s', (text, expected) => {
    expect(parseNumber(text)).toBe(expected)
  })

  it.each(['', 'abc', '8.5mm', '1.2.3', '-'])('%s → null', (text) => {
    expect(parseNumber(text)).toBeNull()
  })
})

describe('fixed / trim', () => {
  it('桁をそろえる・不要な0を落とす', () => {
    expect(fixed(5, 1)).toBe('5.0')
    expect(fixed(8.376, 3)).toBe('8.376')
    expect(trim(1.5)).toBe('1.5')
    expect(trim(2)).toBe('2')
    expect(trim(0.1 + 0.2)).toBe('0.3')
  })
})
