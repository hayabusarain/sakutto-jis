import { describe, expect, it } from 'vitest'
import { conditionsText, detailSummary, markedText, otherSpannerText, sizeLabel, unverifiedSummary } from './labels'

describe('sizeLabel', () => {
  it('A呼称に B呼称（インチ）を添える', () => {
    expect(sizeLabel('50A')).toBe('50A（2B）')
    expect(sizeLabel('40A')).toBe('40A（1½B）')
    expect(sizeLabel('90A')).toBe('90A（3½B）')
    expect(sizeLabel('32A')).toBe('32A（1¼B）')
    expect(sizeLabel('10A')).toBe('10A（⅜B）')
    expect(sizeLabel('20A')).toBe('20A（¾B）')
    expect(sizeLabel('999A')).toBe('999A')
  })
})

describe('otherSpannerText（もう一方の規格のスパナ）', () => {
  it('JIS本体と旧JIS で二面幅が違うボルト（M10・M12・M22）だけ、もう一方の値を添える', () => {
    expect(otherSpannerText(10, 'style1')).toBe('旧JISなら 17')
    expect(otherSpannerText(12, 'style1')).toBe('旧JISなら 19')
    expect(otherSpannerText(22, 'style1')).toBe('旧JISなら 32')
    expect(otherSpannerText(22, 'ja1')).toBe('JIS本体なら 34')
    expect(otherSpannerText(10, 'ja1')).toBe('JIS本体なら 16')
  })

  it('同じ二面幅（M16・M20・M24）や収録していないボルトでは null', () => {
    for (const bolt of [16, 20, 24]) {
      expect(otherSpannerText(bolt, 'style1'), `M${bolt}`).toBeNull()
      expect(otherSpannerText(bolt, 'ja1'), `M${bolt}`).toBeNull()
    }
    expect(otherSpannerText(7, 'style1')).toBeNull()
  })
})

describe('markedText', () => {
  it('未確認なら ※ を付ける', () => {
    expect(markedText(24, true)).toBe('24※')
    expect(markedText('M16', false)).toBe('M16')
  })
})

describe('detailSummary / conditionsText', () => {
  it('詳細条件の要約', () => {
    expect(detailSummary({ nut: 'style1', washers: 0, threads: 3, t2: null, rounding: '5mm' })).toBe(
      'JIS本体ナット・座金なし・突き出し3山・相手側 同じ厚さ・5mm刻み',
    )
    expect(detailSummary({ nut: 'ja1', washers: 2, threads: 2, t2: 20.5, rounding: 'jis' })).toBe(
      '旧JIS 1種ナット・座金 両側・突き出し2山・相手側 20.5mm・JIS標準長さ',
    )
    expect(detailSummary({ nut: 'style1', washers: 1, threads: 3, t2: 'error', rounding: '5mm' })).toContain(
      '相手側 入力エラー',
    )
  })

  it('表の注記', () => {
    expect(
      conditionsText({ type: 'stud', gasket: 1.5, washers: 0, nut: 'style1', threads: 3, rounding: '5mm', t2: null }),
    ).toBe('スタッドボルト・ガスケット 1.5mm・JIS本体ナット・座金なし・突き出し3山・相手側 同じ厚さ・5mm刻み')
  })
})

describe('unverifiedSummary', () => {
  it('いまの UNVERIFIED は空なので、※ を付ける値は無い', () => {
    expect(unverifiedSummary()).toEqual([])
  })

  it('一覧の作り方（仮の一覧で確かめる）', () => {
    expect(
      unverifiedSummary({
        '5K': { t: ['50A'], rows: ['90A', '175A'] },
        '10K': { rows: ['225A'] },
        '16K': { t: 'all' },
      }),
    ).toEqual(['5K 50A の厚さ', '5K の 90A・175A の全寸法', '10K の 225A の全寸法', '16K の厚さ（全サイズ）'])
  })
})
