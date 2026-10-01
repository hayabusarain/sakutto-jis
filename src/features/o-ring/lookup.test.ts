import { describe, expect, it } from 'vitest'
import {
  allORings,
  CROSS_SECTIONS,
  findByMatingDiameter,
  findORing,
  identifyByRing,
  innerStretch,
  matingDiameter,
  outerCompression,
  ringFit,
  stretch,
} from './calc'

const nos = (rings: readonly { no: string }[]) => rings.map((ring) => ring.no)

describe('解説の前提（A 付きの番号）', () => {
  it('A 付きの番号には同じ数字で A の付かない番号があり、d が同じで、太さは P 系列でひとつ太い', () => {
    const aNumbers = allORings().filter((ring) => ring.no.endsWith('A'))
    expect(nos(aNumbers)).toEqual(['P10A', 'P22A', 'P48A', 'P50A', 'P150A'])
    const pThicknesses = [
      ...new Set(
        allORings()
          .filter((r) => r.series === 'P')
          .map((r) => r.group.d2),
      ),
    ].sort((a, b) => a - b)
    for (const ring of aNumbers) {
      const plain = findORing(ring.series, ring.no.slice(0, -1))!
      expect(plain.d, ring.no).toBe(ring.d)
      expect(plain.D, ring.no).not.toBe(ring.D)
      expect(ring.group.d2, ring.no).toBe(pThicknesses[pThicknesses.indexOf(plain.group.d2) + 1])
    }
  })
})

describe('findByMatingDiameter（相手寸法から）', () => {
  it.each([
    ['piston', 30, ['P24', 'G25']],
    ['rod', 30, ['P30', 'G30']],
    ['piston', 50, ['P44', 'G45']],
    ['piston', 63, ['P53']],
    ['rod', 50, ['P50', 'P50A', 'G50']],
    ['piston', 24, ['P20']],
    ['rod', 10, ['P10', 'P10A']],
  ] as const)('%s 型 φ%s → %j', (housing, diameter, expected) => {
    const result = findByMatingDiameter(housing, diameter)
    expect(nos(result.exact)).toEqual(expected)
    expect(result.matches).toEqual(result.exact)
    expect(result.below).toBeNull()
    expect(result.above).toBeNull()
    for (const ring of result.exact) expect(matingDiameter(ring, housing)).toBe(diameter)
  })

  it('溝底径も指定すると両方が合うものにしぼる（P50 と G50 の見分け）', () => {
    expect(nos(findByMatingDiameter('rod', 50, 55).exact)).toEqual(['G50'])
    expect(nos(findByMatingDiameter('rod', 50, 56).exact)).toEqual(['P50'])
    expect(nos(findByMatingDiameter('rod', 50, 60).exact)).toEqual(['P50A'])
    expect(nos(findByMatingDiameter('piston', 55, 50).exact)).toEqual(['G50'])
    expect(nos(findByMatingDiameter('piston', 30, 24).exact)).toEqual(['P24'])
  })

  it('溝底径が合わないときは exact が空で、相手径の一致は matches に残る', () => {
    const result = findByMatingDiameter('piston', 30, 26)
    expect(result.exact).toEqual([])
    expect(nos(result.matches)).toEqual(['P24', 'G25'])
    expect(result.below).toBeNull()
  })

  it('ちょうど合う番号が無ければ、すぐ下・すぐ上の径を返す', () => {
    const result = findByMatingDiameter('piston', 33)
    expect(result.exact).toEqual([])
    expect(result.below?.diameter).toBe(32)
    expect(nos(result.below!.rings)).toEqual(['P26'])
    expect(result.above?.diameter).toBe(34)
    expect(nos(result.above!.rings)).toEqual(['P28'])
  })

  it('小数の入力（φ30.02）は一致せず、近い径を示す', () => {
    const result = findByMatingDiameter('piston', 30.02)
    expect(result.exact).toEqual([])
    expect(result.below?.diameter).toBe(30)
    expect(result.above?.diameter).toBe(31)
  })

  it('範囲外: 最小より小さければ below は null、最大より大きければ above は null', () => {
    const small = findByMatingDiameter('rod', 1)
    expect(small.below).toBeNull()
    expect(small.above?.diameter).toBe(3)
    const large = findByMatingDiameter('piston', 1000)
    expect(large.above).toBeNull()
    expect(large.below?.diameter).toBe(415)
    expect(nos(large.below!.rings)).toEqual(['P400'])
  })

  it('小数の番号（P11.2 の軸径 11.2）も一致する', () => {
    expect(nos(findByMatingDiameter('rod', 11.2).exact)).toEqual(['P11.2'])
  })
})

describe('identifyByRing（実物の寸法から）', () => {
  it('太さの種類は 1.9・2.4・3.1・3.5・5.7・8.4', () => {
    expect(CROSS_SECTIONS).toEqual([1.9, 2.4, 3.1, 3.5, 5.7, 8.4])
  })

  it('24.6 × 3.5 → P25（許容差内）', () => {
    const result = identifyByRing(24.6, 3.5)
    expect(result.nearestD2).toBe(3.5)
    expect(result.d2Options).toEqual([3.5])
    expect(result.d2Far).toBe(false)
    expect(result.candidates[0].ring.no).toBe('P25')
    expect(result.candidates[0].dd1).toBeCloseTo(-0.1, 9)
    expect(result.candidates[0].withinTol).toBe(true)
  })

  it('規格どおりの値なら、その番号が差 0 で先頭', () => {
    for (const ring of allORings()) {
      const top = identifyByRing(ring.d1, ring.group.d2).candidates
      // 同じ内径・太さの番号は無いので、先頭が一意に決まる
      expect(top[0].ring.no, ring.no).toBe(ring.no)
      expect(top[0].dd1).toBe(0)
      expect(top[0].withinTol).toBe(true)
    }
  })

  it('49.4 × 3.1 → G50（G の太さに寄せる）', () => {
    const result = identifyByRing(49.4, 3.1)
    expect(result.candidates[0].ring.no).toBe('G50')
    expect(result.candidates.every((candidate) => candidate.ring.group.d2 === 3.1)).toBe(true)
  })

  it('太さが 3.1 と 3.5 のほぼ中間（3.3）なら両方を候補にする', () => {
    const result = identifyByRing(49.5, 3.3)
    expect(result.d2Options.sort()).toEqual([3.1, 3.5])
    expect(
      result.candidates
        .slice(0, 2)
        .map((c) => c.ring.no)
        .sort(),
    ).toEqual(['G50', 'P50'])
  })

  it('太さ 5.7 は P と G の両方から探す', () => {
    const result = identifyByRing(149.4, 5.7)
    expect(
      result.candidates
        .slice(0, 2)
        .map((c) => c.ring.no)
        .sort(),
    ).toEqual(['G150', 'P150'])
  })

  it('P・G の太さから大きく離れていると d2Far', () => {
    expect(identifyByRing(20, 3.0).d2Far).toBe(false) // 3.1 から 0.1
    expect(identifyByRing(20, 4.5).d2Far).toBe(true) // 3.5 から 1.0
    expect(identifyByRing(20, 12).nearestD2).toBe(8.4)
    expect(identifyByRing(20, 12).d2Far).toBe(true)
  })

  it('候補の数は limit まで', () => {
    expect(identifyByRing(100, 5.7, 3).candidates).toHaveLength(3)
    expect(identifyByRing(100, 5.7).candidates).toHaveLength(5)
  })
})

describe('はめたときの伸び・縮み', () => {
  it('ピストン型 P20: 内径の伸び = (20 − 19.8) ÷ 19.8 = 1.01%（従来の stretch と同じ）', () => {
    const ring = findORing('P', 'P20')!
    const fit = ringFit(ring, 'cylinder', 'piston')
    expect(fit).toMatchObject({ kind: 'stretch', diameter: 20 })
    expect(fit.value).toBeCloseTo(1.0101, 4)
    expect(fit.value).toBe(stretch(ring))
    expect(innerStretch(19.8, 20)).toBeCloseTo(1.0101, 4)
  })

  it('ロッド型 P20: 外径の縮み = (24.6 − 24) ÷ 24.6 = 2.44%', () => {
    const ring = findORing('P', 'P20')!
    const fit = ringFit(ring, 'cylinder', 'rod')
    expect(fit).toMatchObject({ kind: 'compression', diameter: 24 })
    expect(fit.value).toBeCloseTo(2.439, 3)
    expect(outerCompression(ring, 24)).toBeCloseTo(2.439, 3)
  })

  it('平面・内圧用 P3: 外径 6.6 を溝外径 6.2 に当てる → 6.06% 縮む', () => {
    const fit = ringFit(findORing('P', 'P3')!, 'flat-internal', 'piston')
    expect(fit).toMatchObject({ kind: 'compression', diameter: 6.2 })
    expect(fit.value).toBeCloseTo((0.4 / 6.6) * 100, 9)
  })

  it('平面・外圧用 G25: 内径 24.4 を溝内径 25 にはめる → 2.46% 伸びる', () => {
    const fit = ringFit(findORing('G', 'G25')!, 'flat-external', 'rod')
    expect(fit).toMatchObject({ kind: 'stretch', diameter: 25 })
    expect(fit.value).toBeCloseTo((0.6 / 24.4) * 100, 9)
  })

  it('全サイズで、伸び・縮みはどれも正（溝の寸法どおりなら必ず当たる）', () => {
    for (const ring of allORings()) {
      for (const groove of ['cylinder', 'flat-internal', 'flat-external'] as const) {
        for (const housing of ['piston', 'rod'] as const) {
          expect(ringFit(ring, groove, housing).value, `${ring.no} ${groove} ${housing}`).toBeGreaterThanOrEqual(0)
        }
      }
    }
  })
})
