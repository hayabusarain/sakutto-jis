import { describe, expect, it } from 'vitest'
import { commaNote, fixed, normalizeDigits, parseNumber, resolveCommas, trim } from './format'

describe('parseNumber', () => {
  it.each([
    ['8.5', 8.5],
    [' 8.5 ', 8.5],
    ['８．５', 8.5],
    ['8,5', 8.5],
    ['10', 10],
    ['.5', 0.5],
    ['8.', 8],
    ['−40', -40],
    ['ー0.5', -0.5],
  ])('%s → %s', (text, expected) => {
    expect(parseNumber(text)).toBe(expected)
  })

  it.each(['', 'abc', '8.5mm', '1.2.3', '-', '1,2,3', '1,200,5'])('%s → null', (text) => {
    expect(parseNumber(text)).toBeNull()
  })
})

describe('カンマの読み方（サイト共通）', () => {
  it.each([
    // 3桁区切り: 先頭が 0 でない1〜3桁 ＋ 「,3桁」の繰り返し
    ['1,200', 1200],
    ['1,000', 1000],
    ['12,500', 12500],
    ['1,250.5', 1250.5],
    ['1,000,000', 1000000],
    ['-1,200', -1200],
    ['１，２００', 1200],
    // 小数点のカンマ: 先頭が 0、または「,」のあとが3桁でない
    ['0,125', 0.125],
    ['-0,125', -0.125],
    ['00,125', 0.125],
    ['12,5', 12.5],
    ['1,2345', 1.2345],
    ['1,25', 1.25],
    ['０，１２５', 0.125],
  ])('%s → %s', (text, expected) => {
    expect(parseNumber(text)).toBe(expected)
  })

  it('resolveCommas はカンマの無い文字列をそのまま返す', () => {
    expect(resolveCommas('8.5')).toBe('8.5')
    expect(resolveCommas('1,200')).toBe('1200')
    expect(resolveCommas('0,125')).toBe('0.125')
  })

  it('normalizeDigits は全角を半角にし、カンマは残す', () => {
    expect(normalizeDigits('１，２００．５')).toBe('1,200.5')
    expect(normalizeDigits('－３')).toBe('-3')
  })

  it('commaNote: カンマをどう読んだかを説明する', () => {
    expect(commaNote('1,200')).toBe('「1,200」は3桁区切りのカンマとして 1200 で計算しています。')
    expect(commaNote(' 0,125 ')).toBe('「0,125」は小数点のカンマとして 0.125 で計算しています。')
    expect(commaNote('12，5')).toBe('「12，5」は小数点のカンマとして 12.5 で計算しています。')
    // 読んだ数は普通の書き方で見せる（先頭の小数点に 0 を付け、末尾の小数点は落とす。入力した桁は残す）
    expect(commaNote(',5')).toBe('「,5」は小数点のカンマとして 0.5 で計算しています。')
    expect(commaNote('-,5')).toBe('「-,5」は小数点のカンマとして -0.5 で計算しています。')
    expect(commaNote('1,')).toBe('「1,」は小数点のカンマとして 1 で計算しています。')
    expect(commaNote('1,200.50')).toBe('「1,200.50」は3桁区切りのカンマとして 1200.50 で計算しています。')
    expect(commaNote('1200')).toBeNull()
    expect(commaNote('1,2,3')).toBeNull()
    expect(commaNote('')).toBeNull()
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
