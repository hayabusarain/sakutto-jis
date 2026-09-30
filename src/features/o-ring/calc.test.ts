import { describe, expect, it } from 'vitest'
import {
  fillRatio,
  findORing,
  flatFillRatio,
  flatGroove,
  flatSqueezeRange,
  grooveDepth,
  oRingNumbers,
  squeeze,
  squeezeRange,
  stretch,
} from './calc'

describe('findORing', () => {
  it('P20: 19.8 × 2.4、ハウジング d20 / D24、溝幅 3.2', () => {
    const ring = findORing('P', 'P20')!
    expect(ring.d1).toBe(19.8)
    expect(ring.group.d2).toBe(2.4)
    expect(ring.d).toBe(20)
    expect(ring.D).toBe(24)
    expect(ring.group.widths[0]).toBe(3.2)
  })

  it.each([
    ['P10', 1.9, 10, 13],
    ['P10A', 2.4, 10, 14],
    ['P22', 2.4, 22, 26],
    ['P22A', 3.5, 22, 28],
    ['P50', 3.5, 50, 56],
    ['P48A', 5.7, 48, 58],
    ['P150', 5.7, 150, 160],
    ['P150A', 8.4, 150, 165],
    ['P11.2', 2.4, 11.2, 15.2],
  ])('A サイズの境目 %s: 太さ %s・d %s・D %s', (no, d2, d, D) => {
    const ring = findORing('P', no)!
    expect(ring.group.d2).toBe(d2)
    expect(ring.d).toBe(d)
    expect(ring.D).toBe(D)
  })

  it('G25 は 24.4 × 3.1、d25 / D30。G150 から太さ 5.7', () => {
    expect(findORing('G', 'G25')).toMatchObject({ d1: 24.4, d: 25, D: 30 })
    expect(findORing('G', 'G145')!.group.d2).toBe(3.1)
    expect(findORing('G', 'G150')!.group.d2).toBe(5.7)
  })
})

describe('計算', () => {
  it('P20 のつぶし率 = (2.4 − 2.0) ÷ 2.4 = 16.7%', () => {
    const ring = findORing('P', 'P20')!
    expect(grooveDepth(ring)).toBe(2)
    expect(squeeze(2.4, 2)).toBeCloseTo(16.67, 2)
    const range = squeezeRange(ring)!
    expect(range.min).toBeLessThan(16.67)
    expect(range.max).toBeGreaterThan(16.67)
  })

  it('P20 の充てん率（バックアップリングなし）= π/4×2.4² ÷ (3.2×2.0) = 70.7%', () => {
    expect(fillRatio(findORing('P', 'P20')!, 0)).toBeCloseTo(70.69, 1)
  })

  it('P20 の伸び = (20 − 19.8) ÷ 19.8 = 1.0%', () => {
    expect(stretch(findORing('P', 'P20')!)).toBeCloseTo(1.01, 2)
  })
})

describe('データの整合性', () => {
  it.each(['P', 'G'] as const)('%s: 内径は昇順で、溝底径 d より小さく、d1 公差は正', (series) => {
    let previous = 0
    for (const no of oRingNumbers(series)) {
      const ring = findORing(series, no)!
      expect(ring.d1, no).toBeLessThan(ring.d)
      expect(ring.d1Tol, no).toBeGreaterThan(0)
      // A サイズは同じ呼びの別の太さなので、内径が前より小さいことがある
      if (!no.endsWith('A')) expect(ring.d1, no).toBeGreaterThan(previous - 0.001)
      previous = ring.d1
      // Oリングの外径は、ロッド型の溝底径 D より大きい（つぶしがある）
      expect(ring.d1 + 2 * ring.group.d2, no).toBeGreaterThan(ring.D)
    }
  })

  it('すべてのサイズでつぶし率が 5〜30% の範囲に収まる', () => {
    for (const series of ['P', 'G'] as const) {
      for (const no of oRingNumbers(series)) {
        const ring = findORing(series, no)!
        const value = squeeze(ring.group.d2, grooveDepth(ring))
        expect(value, no).toBeGreaterThan(5)
        expect(value, no).toBeLessThan(30)
      }
    }
  })

  it('サイズ数: P は 122、G は 46', () => {
    expect(oRingNumbers('P')).toHaveLength(122)
    expect(oRingNumbers('G')).toHaveLength(46)
  })
})

describe('JIS の表に載っているつぶし率の範囲を再現する', () => {
  // 円筒面（運動用・固定用）
  it.each([
    ['P', 'P3', 14.8, 24.2],
    ['P', 'P10A', 10.8, 19.7],
    ['P', 'P22A', 9.4, 16.7],
    ['P', 'P48A', 8.4, 14.2],
    ['P', 'P150A', 7.9, 12.3],
    ['G', 'G150', 8.4, 14.2],
  ] as const)('円筒面 %s %s: %s〜%s%%', (series, no, min, max) => {
    const range = squeezeRange(findORing(series, no)!)!
    expect(range.min).toBeCloseTo(min, 1)
    expect(range.max).toBeCloseTo(max, 1)
  })

  // 平面（固定用）
  it.each([
    ['P', 'P3', 20.3, 31.8],
    ['P', 'P10A', 19.9, 29.7],
    ['P', 'P22A', 19.1, 26.4],
    ['P', 'P48A', 16.5, 22.0],
    ['P', 'P150A', 15.8, 19.9],
    ['G', 'G25', 18.3, 26.6],
    ['G', 'G150', 16.5, 22.0],
  ] as const)('平面 %s %s: %s〜%s%%', (series, no, min, max) => {
    const range = flatSqueezeRange(findORing(series, no)!)
    expect(range.min).toBeCloseTo(min, 1)
    expect(range.max).toBeCloseTo(max, 1)
  })
})

describe('flatGroove', () => {
  it('P3 内圧用: 溝外径 6.2、外圧用: 溝内径 3', () => {
    const ring = findORing('P', 'P3')!
    expect(flatGroove(ring, 'internal')).toMatchObject({ outer: 6.2, inner: 1.2, depth: 1.4, width: 2.5 })
    expect(flatGroove(ring, 'external')).toMatchObject({ outer: 8, inner: 3 })
  })

  it('G25 内圧用: 溝外径 30、P22A 外圧用: 溝内径 22', () => {
    expect(flatGroove(findORing('G', 'G25')!, 'internal').outer).toBe(30)
    expect(flatGroove(findORing('P', 'P22A')!, 'external').inner).toBe(22)
  })

  it('内圧用はOリングの外周が溝の外壁に、外圧用は内周が溝の内壁に当たる', () => {
    for (const series of ['P', 'G'] as const) {
      for (const no of oRingNumbers(series)) {
        const ring = findORing(series, no)!
        const outerOfRing = ring.d1 + 2 * ring.group.d2
        const internal = flatGroove(ring, 'internal')
        const external = flatGroove(ring, 'external')
        // 内圧用: Oリングの外径 ≧ 溝外径（外壁に押し付けて入れる）
        expect(outerOfRing, no).toBeGreaterThanOrEqual(internal.outer)
        // 外圧用: Oリングの内径 ≦ 溝内径（内壁に少し伸ばしてはめる）
        expect(ring.d1, no).toBeLessThanOrEqual(external.inner)
        // 反対側の壁とは当たらない
        expect(ring.d1, no).toBeGreaterThan(internal.inner)
        expect(outerOfRing, no).toBeLessThan(external.outer)
      }
    }
  })

  it('平面溝の充てん率（P20）= π/4×2.4² ÷ (3.2×1.8) = 78.5%', () => {
    expect(flatFillRatio(findORing('P', 'P20')!)).toBeCloseTo(78.5, 1)
  })
})
