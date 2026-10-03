import { describe, expect, it } from 'vitest'
import {
  availableGrade,
  B1004_SERIES,
  b1004SeriesHole,
  basicMinorDiameter,
  chartRow,
  drawingCallout,
  drillChart,
  engagementPercent,
  findSize,
  formatHole,
  formatSignificant,
  holeCandidates,
  judgeHole,
  minorDiameterLimits,
  pitchesOf,
  recommendHole,
  smallSizeGradeNote,
  stressArea,
  suggestDrillFix,
  threadBasics,
  threadDesignation,
  threadName,
  threadsForDrill,
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

  it('T_D1 は JIS B 0209-1 表3 の値（規格票の原文で確認した例）', () => {
    expect(TD1_UM['0.25']).toEqual({ 4: 45, 5: 56, 6: null, 7: null })
    expect(TD1_UM['1.75']).toEqual({ 4: 212, 5: 265, 6: 335, 7: 425 })
    expect(TD1_UM['4.5']).toEqual({ 4: 425, 5: 530, 6: 670, 7: 850 })
  })

  it('呼び径とピッチは JIS B 0205-2 表2（例: M14 は第2選択、M30 の細目 3 は括弧付き）', () => {
    expect(findSize(14)).toMatchObject({ choice: 2, coarse: 2, fine: [1.5, 1.25, 1] })
    expect(findSize(30)).toMatchObject({ choice: 1, coarse: 3.5, fine: [3, 2, 1.5, 1] })
    expect(
      METRIC_SIZES.filter((size) => size.choice === 3).map((size) => size.d),
    ).toEqual([5.5, 9, 11, 15, 17, 25, 26, 28, 32, 35, 38, 40, 50, 55, 58, 62, 65])
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

describe('threadBasics（JIS B 0205-4 の基準寸法・JIS B 1082 の d3）', () => {
  it.each([
    // d, P, D2, D1, d3, H
    [3, 0.5, 2.675, 2.459, 2.387, 0.433],
    [6, 1, 5.35, 4.917, 4.773, 0.866],
    [8, 1.25, 7.188, 6.647, 6.466, 1.083],
    [10, 1.5, 9.026, 8.376, 8.16, 1.299],
    [12, 1.75, 10.863, 10.106, 9.853, 1.516],
    [16, 2, 14.701, 13.835, 13.546, 1.732],
    [20, 2.5, 18.376, 17.294, 16.933, 2.165],
    [24, 3, 22.051, 20.752, 20.319, 2.598],
    [12, 1.5, 11.026, 10.376, 10.16, 1.299],
  ])('M%s×%s → D2 %s / D1 %s / d3 %s / H %s', (d, p, d2, d1, d3, h) => {
    expect(threadBasics(d, p)).toMatchObject({ d, d2, d1, d3, h })
  })

  it('JIS B 0205-4 表1 の値（規格票の原文で確認）: M12×1.75・M56×5.5', () => {
    expect(threadBasics(12, 1.75)).toMatchObject({ d2: 10.863, d1: 10.106 })
    expect(threadBasics(56, 5.5)).toMatchObject({ d2: 52.428, d1: 50.046 })
  })

  it('D1 は basicMinorDiameter と同じ値', () => {
    for (const size of METRIC_SIZES) {
      for (const p of pitchesOf(size)) {
        expect(threadBasics(size.d, p).d1).toBe(basicMinorDiameter(size.d, p))
      }
    }
  })
})

describe('stressArea（有効断面積 As、JIS B 1082）', () => {
  // JIS B 1082:2009 表1 一般用メートルねじの有効断面積（有効数字3桁。規格票の原文で確認）
  it.each([
    [1, 0.25, '0.460'],
    [42, 4.5, '1120'],
    [64, 6, '2680'],
    [36, 3, '865'],
    [64, 4, '2850'],
    // 表9 注c)
    [2.2, 0.45, '2.48'],
    [4.5, 0.75, '11.3'],
    [3, 0.5, '5.03'],
    [4, 0.7, '8.78'],
    [5, 0.8, '14.2'],
    [6, 1, '20.1'],
    [8, 1.25, '36.6'],
    [10, 1.5, '58.0'],
    [12, 1.75, '84.3'],
    [14, 2, '115'],
    [16, 2, '157'],
    [18, 2.5, '192'],
    [20, 2.5, '245'],
    [22, 2.5, '303'],
    [24, 3, '353'],
    [27, 3, '459'],
    [30, 3.5, '561'],
    [36, 4, '817'],
    [8, 1, '39.2'],
    [10, 1.25, '61.2'],
    [12, 1.5, '88.1'],
    [12, 1.25, '92.1'],
    [16, 1.5, '167'],
    [20, 1.5, '272'],
    [24, 2, '384'],
  ])('M%s×%s → %s mm²', (d, p, expected) => {
    expect(formatSignificant(stressArea(d, p))).toBe(expected)
  })

  it('M12 は (10.863 + 9.853) ÷ 2 から計算した値とほぼ同じ', () => {
    expect(stressArea(12, 1.75)).toBeCloseTo((Math.PI / 4) * ((10.863 + 9.853) / 2) ** 2, 2)
  })

  it('M24 は丸める前の d2・d3 で計算するので 353（丸めた値では 352.49）', () => {
    expect(stressArea(24, 3)).toBeGreaterThan(352.5)
    expect(stressArea(24, 3)).toBeLessThan(352.51)
  })
})

describe('formatSignificant', () => {
  it.each([
    [57.99, '58.0'],
    [84.267, '84.3'],
    [156.668, '157'],
    [2675.97, '2680'],
    [0.4603, '0.460'],
    [9.996, '10.0'],
    [1120.91, '1120'],
    [0, '0'],
  ])('%s → %s', (value, expected) => {
    expect(formatSignificant(value)).toBe(expected)
  })
})

describe('formatHole', () => {
  it.each([
    [10.2, '10.2'],
    [5, '5.0'],
    [2.5, '2.5'],
    [2.05, '2.05'],
    [0.75, '0.75'],
    [5.25, '5.25'],
    [14, '14.0'],
  ])('%s → %s', (hole, expected) => {
    expect(formatHole(hole)).toBe(expected)
  })
})

describe('drillChart（全サイズの早見表）', () => {
  it('並目40サイズ・細目131種類で、規格のピッチをすべて含む', () => {
    const total = METRIC_SIZES.reduce((sum, size) => sum + pitchesOf(size).length, 0)
    expect(drillChart('coarse', 6)).toHaveLength(40)
    expect(drillChart('fine', 6)).toHaveLength(131)
    expect(40 + 131).toBe(total)
  })

  it('並目の既知の値（6H）', () => {
    const rows = drillChart('coarse', 6)
    const hole = (d: number) => rows.find((row) => row.d === d)?.hole
    expect(hole(3)).toBe(2.5)
    expect(hole(6)).toBe(5)
    expect(hole(8)).toBe(6.8)
    expect(hole(10)).toBe(8.5)
    expect(hole(12)).toBe(10.2)
    expect(hole(16)).toBe(14)
    expect(hole(24)).toBe(21)
  })

  it('ISO 2306 に無い M9 は 呼び径 − ピッチ（7.75）に近い 7.8', () => {
    expect(chartRow(9, 1.25, 6)).toMatchObject({ hole: 7.8, basis: 'rule', grade: 6 })
  })

  it('6H の規定が無い M1 は 5H で求める', () => {
    expect(chartRow(1, 0.25, 6)).toMatchObject({ hole: 0.75, basis: 'iso2306', grade: 5 })
  })

  it('6H の規定が無いのは11種類（並目 M1〜M1.2、細目 0.2・0.25）', () => {
    const all = [...drillChart('coarse', 6), ...drillChart('fine', 6)]
    const fallback = all.filter((row) => row.grade !== 6)
    expect(fallback).toHaveLength(11)
    expect(fallback.every((row) => row.p <= 0.25)).toBe(true)
  })

  it('どの等級でも全行に推奨径があり、その等級の範囲に入る', () => {
    for (const grade of [4, 5, 6, 7] as const) {
      const rows = [...drillChart('coarse', grade), ...drillChart('fine', grade)]
      expect(rows, `${grade}H`).toHaveLength(171)
      for (const row of rows) {
        expect(judgeHole(row.hole, row.limits), `M${row.d}×${row.p} ${grade}H`).toBe('ok')
      }
    }
  })

  it('規格に無いサイズ・ピッチは null', () => {
    expect(chartRow(13, 1.5, 6)).toBeNull()
    expect(chartRow(12, 2, 6)).toBeNull()
  })

  it('注記のあるピッチは note を持つ（JIS B 0205-2 表2 の注(1)(2)、5.1 の括弧付きピッチ）', () => {
    expect(chartRow(14, 1.25, 6)?.note).toBe('内燃機関用点火プラグ専用')
    // 注(2) は「転がり軸受を固定するねじに限って用いることができる」（ナットに限らない）
    expect(chartRow(35, 1.5, 6)?.note).toBe('転がり軸受を固定するねじ専用')
    expect(chartRow(30, 3, 6)?.note).toBe('なるべく避ける')
    expect(chartRow(33, 3, 6)?.note).toBe('なるべく避ける')
  })
})

describe('JIS B 1004:2009 の下穴径の系列（表1 の式）', () => {
  it('M12×1.75（表2）: 100〜65 % の系列は 10.1〜10.8（0.1 mm に丸める）', () => {
    expect(B1004_SERIES.map((percent) => b1004SeriesHole(12, 1.75, percent))).toEqual([
      10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8,
    ])
  })

  it('M10×1.25・M12×1.25（表3）: 0.01 mm に丸める', () => {
    expect(B1004_SERIES.map((percent) => b1004SeriesHole(10, 1.25, percent))).toEqual([
      8.65, 8.71, 8.78, 8.85, 8.92, 8.99, 9.05, 9.12,
    ])
    expect(B1004_SERIES.map((percent) => b1004SeriesHole(12, 1.25, percent))).toEqual([
      10.65, 10.71, 10.78, 10.85, 10.92, 10.99, 11.05, 11.12,
    ])
    expect(b1004SeriesHole(68, 1.5, 100)).toBe(66.38)
  })

  it('系列の径のひっかかり率は、丸めの分だけ系列の値からずれる', () => {
    // (12 − 10.2) ÷ (1.082532 × 1.75) × 100 = 95.015…
    expect(engagementPercent(12, 1.75, b1004SeriesHole(12, 1.75, 95))).toBeCloseTo(95.02, 2)
  })

  it('100 % の系列は丸めのため D1 の最小をわずかに下回ることがある（M12 の 10.1 < 10.106）', () => {
    const limits = minorDiameterLimits(12, 1.75, 6)!
    expect(judgeHole(b1004SeriesHole(12, 1.75, 100), limits)).toBe('small')
    expect(judgeHole(b1004SeriesHole(12, 1.75, 95), limits)).toBe('ok')
    expect(judgeHole(b1004SeriesHole(12, 1.75, 90), limits)).toBe('ok')
  })

  it('JIS B 1004 表2・表3 のめねじ内径（参考）と同じ範囲（M12 の 5H・6H・7H、M10×1.25）', () => {
    expect([5, 6, 7].map((g) => minorDiameterLimits(12, 1.75, g as 5 | 6 | 7)?.max)).toEqual([10.371, 10.441, 10.531])
    expect(minorDiameterLimits(12, 1.75, 6)?.min).toBe(10.106)
    expect([5, 6, 7].map((g) => minorDiameterLimits(10, 1.25, g as 5 | 6 | 7)?.max)).toEqual([8.859, 8.912, 8.982])
    expect(minorDiameterLimits(10, 1.25, 6)?.min).toBe(8.647)
  })
})

describe('smallSizeGradeNote（M1.4 以下は 5H・4H。JIS B 0209-1 の 12.）', () => {
  it('M1.4 以下で 6H・7H を選んでいるときだけ注意を出す', () => {
    expect(smallSizeGradeNote(1.4, 6)).toContain('5H か 4H')
    expect(smallSizeGradeNote(1, 7)).not.toBeNull()
    expect(smallSizeGradeNote(1.4, 5)).toBeNull()
    expect(smallSizeGradeNote(1.4, 4)).toBeNull()
    expect(smallSizeGradeNote(1.6, 6)).toBeNull()
  })

  it('M1.4 並目の 6H の範囲は規格にあるので、早見表は 6H のまま（推奨 1.1 は 5H の範囲にも入る）', () => {
    const row = chartRow(1.4, 0.3, 6)!
    expect(row.grade).toBe(6)
    expect(row.hole).toBe(1.1)
    expect(judgeHole(row.hole, minorDiameterLimits(1.4, 0.3, 5)!)).toBe('ok')
  })
})

describe('threadsForDrill（ドリル径から逆引き）', () => {
  const names = (drill: number, grade: 4 | 5 | 6 | 7 = 6) =>
    threadsForDrill(drill, grade).map((match) => threadName(match.d, match.p))

  it('並目の代表的なドリル径', () => {
    expect(names(8.5)).toEqual(['M10'])
    expect(names(6.8)).toEqual(['M8'])
    expect(names(3.3)).toEqual(['M4'])
    expect(names(17.5)).toEqual(['M20'])
  })

  it('並目 → 細目、第1選択 → 第3選択の順', () => {
    expect(names(10.2)).toEqual(['M12', 'M11×0.75'])
    expect(names(5)).toEqual(['M6', 'M5.5×0.5'])
    expect(names(21)).toEqual(['M24', 'M22×1'])
  })

  it('並目に無い径は細目で見つかる', () => {
    expect(names(8)).toEqual(['M9×1'])
    expect(names(8.7)).toEqual(['M10×1.25'])
    expect(names(8.7, 7)).toEqual(['M10', 'M10×1.25'])
  })

  it('ひっかかり率と判定した等級を返す', () => {
    const [m10] = threadsForDrill(8.5, 6)
    expect(m10.grade).toBe(6)
    expect(m10.engagement).toBeCloseTo(92.4, 1)
    const [m1] = threadsForDrill(0.75, 6)
    expect(m1).toMatchObject({ d: 1, p: 0.25, grade: 5 })
  })

  it('返すねじは、どれもその径が範囲に入る', () => {
    for (let um = 500; um <= 70000; um += 50) {
      const drill = um / 1000
      for (const match of threadsForDrill(drill, 6)) {
        expect(judgeHole(drill, match.limits), `φ${drill} M${match.d}×${match.p}`).toBe('ok')
      }
    }
  })

  it('範囲外・0以下は空', () => {
    expect(threadsForDrill(100, 6)).toEqual([])
    expect(threadsForDrill(0, 6)).toEqual([])
    expect(threadsForDrill(-8.5, 6)).toEqual([])
  })
})

describe('suggestDrillFix（打ち間違いの直し方）', () => {
  it.each([
    [10, 1.5, 85, 8.5],
    [10, 1.5, 850, 8.5],
    [10, 1.5, 0.85, 8.5],
    [12, 1.75, 102, 10.2],
    [8, 1.25, 68, 6.8],
    [1, 0.25, 75, 0.75],
  ])('M%s×%s に %s → %s', (d, p, drill, expected) => {
    expect(suggestDrillFix(d, p, drill)).toBe(expected)
  })

  it('範囲内・範囲の近く・直しても入らないときは null', () => {
    expect(suggestDrillFix(10, 1.5, 8.5)).toBeNull()
    expect(suggestDrillFix(10, 1.5, 8.7)).toBeNull() // 7H なら範囲内
    expect(suggestDrillFix(10, 1.5, 8.3)).toBeNull()
    expect(suggestDrillFix(10, 1.5, 83)).toBeNull()
    expect(suggestDrillFix(10, 1.5, 12)).toBeNull()
    expect(suggestDrillFix(10, 1.5, 0)).toBeNull()
  })
})

describe('図面指示（表記例）', () => {
  it('ねじの呼び: 並目はピッチを省く', () => {
    expect(threadName(12, 1.75)).toBe('M12')
    expect(threadName(12, 1.5)).toBe('M12×1.5')
    expect(threadName(15, 1.5)).toBe('M15×1.5')
    expect(threadDesignation(12, 1.75, 6)).toBe('M12-6H')
    expect(threadDesignation(10, 1.25, 5)).toBe('M10×1.25-5H')
  })

  it('深さなし', () => {
    expect(drawingCallout({ d: 12, p: 1.75, grade: 6, hole: 10.2 })).toBe('M12-6H 下穴φ10.2')
  })

  it('ねじ深さ・下穴深さ付き', () => {
    expect(
      drawingCallout({ d: 10, p: 1.25, grade: 6, hole: 8.8, threadDepth: 15, holeDepth: 20 }),
    ).toBe('M10×1.25-6H 深さ15 下穴φ8.8 深さ20')
  })

  it('片方だけの深さ・0 以下や null は書かない・下穴径の不要な0は落とす', () => {
    expect(drawingCallout({ d: 6, p: 1, grade: 6, hole: 5, holeDepth: 12.5 })).toBe('M6-6H 下穴φ5 深さ12.5')
    expect(drawingCallout({ d: 6, p: 1, grade: 6, hole: 5, threadDepth: 10, holeDepth: null })).toBe(
      'M6-6H 深さ10 下穴φ5',
    )
    expect(drawingCallout({ d: 6, p: 1, grade: 6, hole: 5, threadDepth: 0, holeDepth: -3 })).toBe(
      'M6-6H 下穴φ5',
    )
  })
})
