import { describe, expect, it } from 'vitest'
import { isPlaceholder, normalizeAdsenseClient, SITE_PAGES } from './site'
import { formatJaDate } from './pages/content/dates'

describe('normalizeAdsenseClient', () => {
  it('ca-pub- 付き・pub- だけのどちらも ca-pub- にそろえる', () => {
    expect(normalizeAdsenseClient('ca-pub-1234567890123456')).toBe('ca-pub-1234567890123456')
    expect(normalizeAdsenseClient(' pub-1234567890123456 ')).toBe('ca-pub-1234567890123456')
  })

  it('未設定・形式違いは空（広告のタグを出さない）', () => {
    expect(normalizeAdsenseClient(undefined)).toBe('')
    expect(normalizeAdsenseClient('')).toBe('')
    expect(normalizeAdsenseClient('ca-pub-XXXX')).toBe('')
    expect(normalizeAdsenseClient('1234567890123456')).toBe('')
    expect(normalizeAdsenseClient('ca-pub-123"><script>')).toBe('')
  })
})

describe('isPlaceholder', () => {
  it('（仮）や example.com を見つける', () => {
    expect(isPlaceholder('サクッとJIS 運営者（仮）')).toBe(true)
    expect(isPlaceholder('contact@example.com')).toBe(true)
    expect(isPlaceholder('山田太郎')).toBe(false)
    expect(isPlaceholder('')).toBe(false)
  })
})

describe('SITE_PAGES', () => {
  it('編集方針のページがある', () => {
    expect(SITE_PAGES.map((page) => page.path)).toContain('/editorial-policy')
  })
})

describe('formatJaDate', () => {
  it('YYYY-MM-DD を「年月日」にする', () => {
    expect(formatJaDate('2026-09-30')).toBe('2026年9月30日')
    expect(formatJaDate('2027-01-05')).toBe('2027年1月5日')
    expect(formatJaDate('近日')).toBe('近日')
  })
})
