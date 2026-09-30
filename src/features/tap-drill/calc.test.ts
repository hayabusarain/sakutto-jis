import { describe, expect, it } from 'vitest'
import {
  availableGrade,
  basicMinorDiameter,
  engagementPercent,
  findSize,
  holeCandidates,
  judgeHole,
  minorDiameterLimits,
  pitchesOf,
  recommendHole,
} from './calc'
import { ISO2306_COARSE_DRILL, METRIC_SIZES, TD1_UM } from './data'

describe('basicMinorDiameter（JIS B 0205-4 の基準寸法 D1）', () => {
  it.each([
    [3, 0.5, 2.459],
    [6, 1, 4.917],
    [8, 1.25, 6.647],
    [10, 1.5, 8.376],
    [12, 1.75, 10.106],
    [20, 2.5, 17.294],
    [24, 3, 20.752],
    [10, 1.25, 8.647],
  ])('M%s×%s → %s', (d, p, expected) => {
    expect(basicMinorDiameter(d, p)).toBe(expected)
  })
})

describe('minorDiameterLimits（6H のめねじ内径の許容範囲）', () => {
  it.each([
    [3, 0.5, 2.459, 2.599],
    [4, 0.7, 3.242, 3.422],
    [5, 0.8, 4.134, 4.334],
    [6, 1, 4.917, 5.153],
    [8, 1.25, 6.647, 6.912],
    [10, 1.5, 8.376, 8.676],
    [12, 1.75, 10.106, 10.441],
    [16, 2, 13.835, 14.21],
    [20, 2.5, 17.294, 17.744],
    [24, 3, 20.752, 21.252],
  ])('M%s×%s → %s〜%s', (d, p, min, max) => {
    expect(minorDiameterLimits(d, p, 6)).toEqual({ min, max })
  })

  it('規定のない等級は null', () => {
    expect(minorDiameterLimits(1, 0.25, 6)).toBeNull()
    expect(minorDiameterLimits(1, 0.25, 5)).not.toBeNull()
  })
})

describe('engagementPercent', () => {
  it('M10 に 8.5mm の下穴 → 約92.4%', () => {
    expect(engagementPercent(10, 1.5, 8.5)).toBeCloseTo(92.4, 1)
  })
  it('下穴径 = D1 なら 100%', () => {
    expect(engagementPercent(10, 1.5, 10 - 1.082532 * 1.5)).toBeCloseTo(100, 6)
  })
})

describe('recommendHole（6H）', () => {
  // 並目ねじは ISO 2306 の推奨ドリル径
  it.each([
    [1.6, 0.35, 1.25],
    [2, 0.4, 1.6],
    [2.5, 0.45, 2.05],
    [3, 0.5, 2.5],
    [3.5, 0.6, 2.9],
    [4, 0.7, 3.3],
    [4.5, 0.75, 3.7],
    [5, 0.8, 4.2],
    [6, 1, 5],
    [8, 1.25, 6.8],
    [10, 1.5, 8.5],
    [12, 1.75, 10.2],
    [14, 2, 12],
    [16, 2, 14],
    [18, 2.5, 15.5],
    [20, 2.5, 17.5],
    [22, 2.5, 19.5],
    [24, 3, 21],
    [27, 3, 24],
    [30, 3.5, 26.5],
    [36, 4, 32],
    [42, 4.5, 37.5],
    [48, 5, 43],
  ])('M%s×%s → %s', (d, p, expected) => {
    expect(recommendHole(d, p, 6)).toEqual({ hole: expected, basis: 'iso2306' })
  })

  it('ISO 2306 に無い並目（M1.1）は 呼び径 − ピッチ から求める', () => {
    expect(recommendHole(1.1, 0.25, 5)).toEqual({ hole: 0.85, basis: 'rule' })
  })

  it('ISO 2306 の値が等級の範囲外なら、範囲内の径に切り替える', () => {
    // M12 4H: 10.106〜10.318 → 10.2 は範囲内
    expect(recommendHole(12, 1.75, 4)?.hole).toBe(10.2)
    // M4.5 7H: 3.688〜3.924 → 3.7 は範囲内
    expect(recommendHole(4.5, 0.75, 7)?.hole).toBe(3.7)
  })

  it.each([
    [8, 1, 7],
    [10, 1.25, 8.8],
    [10, 1, 9],
    [12, 1.5, 10.5],
    [12, 1.25, 10.8],
    [16, 1.5, 14.5],
    [20, 1.5, 18.5],
    [6, 0.75, 5.25],
  ])('細目 M%s×%s → %s', (d, p, expected) => {
    expect(recommendHole(d, p, 6)).toEqual({ hole: expected, basis: 'rule' })
  })

  it('推奨径は必ずその等級の許容範囲に入る', () => {
    for (const size of METRIC_SIZES) {
      for (const p of pitchesOf(size)) {
        for (const grade of [4, 5, 6, 7] as const) {
          const recommendation = recommendHole(size.d, p, grade)
          const limits = minorDiameterLimits(size.d, p, grade)
          if (recommendation === null || limits === null) continue
          expect(judgeHole(recommendation.hole, limits), `M${size.d}×${p} ${grade}H`).toBe('ok')
        }
      }
    }
  })
})

describe('availableGrade', () => {
  it('6H の規定が無い M1〜M1.4 は 5H にする', () => {
    expect(availableGrade(1, 0.25, 6)).toBe(5)
    expect(availableGrade(1.4, 0.3, 7)).toBe(6)
    expect(availableGrade(10, 1.5, 6)).toBe(6)
  })
})

describe('データの整合性', () => {
  it('ISO 2306 の推奨ドリル径は、並目ねじの 6H（M1〜M1.4 は 5H）の範囲に入る', () => {
    for (const [d, drill] of Object.entries(ISO2306_COARSE_DRILL)) {
      const size = findSize(Number(d))
      expect(size?.coarse, `M${d}`).not.toBeNull()
      const p = size!.coarse!
      const limits = minorDiameterLimits(size!.d, p, availableGrade(size!.d, p, 6))
      expect(limits && judgeHole(drill, limits), `M${d}`).toBe('ok')
    }
  })

  it('全サイズのピッチに公差データがある', () => {
    for (const size of METRIC_SIZES) {
      for (const p of pitchesOf(size)) {
        expect(TD1_UM[String(p)], `M${size.d}×${p}`).toBeDefined()
      }
    }
  })

  it('公差は等級が上がるほど大きい', () => {
    for (const [p, row] of Object.entries(TD1_UM)) {
      const values = [row[4], row[5], row[6], row[7]].filter((v): v is number => v !== null)
      expect([...values].sort((a, b) => a - b), p).toEqual(values)
    }
  })

  it('呼び径は昇順で重複なし', () => {
    const ds = METRIC_SIZES.map((size) => size.d)
    expect([...new Set(ds)].sort((a, b) => a - b)).toEqual(ds)
    expect(findSize(10)?.coarse).toBe(1.5)
  })
})

describe('holeCandidates', () => {
  it('M10 は 8.3〜8.8 を 0.1 刻みで並べ、6H の判定を付ける', () => {
    const rows = holeCandidates(10, 1.5)
    expect(rows.map((row) => row.hole)).toEqual([8.3, 8.4, 8.5, 8.6, 8.7, 8.8])
    expect(rows.find((row) => row.hole === 8.3)?.fits[6]).toBe('small')
    expect(rows.find((row) => row.hole === 8.5)?.fits[6]).toBe('ok')
    expect(rows.find((row) => row.hole === 8.7)?.fits[6]).toBe('large')
    expect(rows.find((row) => row.hole === 8.7)?.fits[7]).toBe('ok')
  })
})
