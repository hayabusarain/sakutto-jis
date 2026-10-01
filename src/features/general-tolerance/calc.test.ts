import { describe, expect, it } from 'vitest'
import { parseNumber } from '../../lib/format'
import {
  angleLimits,
  decimalsOfInput,
  drawingNote,
  findRange,
  formatDms,
  formatPlusMinusAngle,
  formatPlusMinusMm,
  isOnBoundary,
  linearLimits,
  lookupTolerance,
  shortRangeLabel,
  TABLES,
  TOLERANCE_KINDS,
} from './calc'
import {
  ANGLE_TOLERANCES,
  CHAMFER_TOLERANCES,
  LINEAR_RANGES,
  LINEAR_TOLERANCES,
  TOLERANCE_CLASSES,
  type ToleranceClass,
} from './data'

describe('表の形・整合', () => {
  it('どの表も、区分の数と許容差の数がそろう', () => {
    for (const kind of TOLERANCE_KINDS) {
      const { ranges, tolerances } = TABLES[kind]
      for (const cls of TOLERANCE_CLASSES) expect(tolerances[cls]).toHaveLength(ranges.length)
    }
  })

  it('区分はすき間なく続く（前の上限 = 次の下限）', () => {
    for (const kind of TOLERANCE_KINDS) {
      const { ranges } = TABLES[kind]
      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i].min).toBe(ranges[i - 1].max)
        expect(ranges[i].includeMin).toBe(false)
      }
      expect(ranges[ranges.length - 1].max === null || kind === 'linear').toBe(true)
    }
  })

  it('寸法が大きいほど許容差は同じか大きい（角度は短辺が長いほど小さい）', () => {
    for (const kind of TOLERANCE_KINDS) {
      for (const cls of TOLERANCE_CLASSES) {
        const values = TABLES[kind].tolerances[cls].filter((v): v is number => v !== null)
        for (let i = 1; i < values.length; i++) {
          if (kind === 'angle') expect(values[i]).toBeLessThanOrEqual(values[i - 1])
          else expect(values[i]).toBeGreaterThanOrEqual(values[i - 1])
        }
      }
    }
  })

  it('等級が粗いほど許容差は同じか大きい（f ≦ m ≦ c ≦ v）', () => {
    for (const kind of TOLERANCE_KINDS) {
      const { ranges, tolerances } = TABLES[kind]
      for (let i = 0; i < ranges.length; i++) {
        const row = TOLERANCE_CLASSES.map((cls) => tolerances[cls][i]).filter((v): v is number => v !== null)
        for (let j = 1; j < row.length; j++) expect(row[j]).toBeGreaterThanOrEqual(row[j - 1])
      }
    }
  })

  it('「—」（規定なし）は f の 2000〜4000 と v の 0.5〜3 だけ', () => {
    const blanks = TOLERANCE_CLASSES.flatMap((cls) =>
      LINEAR_TOLERANCES[cls].flatMap((v, i) => (v === null ? [`${cls}:${LINEAR_RANGES[i].label}`] : [])),
    )
    expect(blanks).toEqual(['f:2000 を超え 4000 以下', 'v:0.5 以上 3 以下'])
    for (const cls of TOLERANCE_CLASSES) {
      expect(CHAMFER_TOLERANCES[cls].every((v) => v !== null)).toBe(true)
      expect(ANGLE_TOLERANCES[cls].every((v) => v !== null)).toBe(true)
    }
  })

  it('面取り・角度は f と m が同じ値', () => {
    expect(CHAMFER_TOLERANCES.f).toEqual(CHAMFER_TOLERANCES.m)
    expect(CHAMFER_TOLERANCES.c).toEqual(CHAMFER_TOLERANCES.v)
    expect(ANGLE_TOLERANCES.f).toEqual(ANGLE_TOLERANCES.m)
  })
})

describe('JIS B 0405 の既知の値', () => {
  it.each<[number, ToleranceClass, string]>([
    [1, 'f', '±0.05'],
    [5, 'f', '±0.05'],
    [10, 'f', '±0.1'],
    [50, 'f', '±0.15'],
    [200, 'f', '±0.2'],
    [500, 'f', '±0.3'],
    [1500, 'f', '±0.5'],
    [1, 'm', '±0.1'],
    [5, 'm', '±0.1'],
    [10, 'm', '±0.2'],
    [50, 'm', '±0.3'],
    [100, 'm', '±0.3'],
    [200, 'm', '±0.5'],
    [500, 'm', '±0.8'],
    [1500, 'm', '±1.2'],
    [3000, 'm', '±2'],
    [1, 'c', '±0.2'],
    [5, 'c', '±0.3'],
    [10, 'c', '±0.5'],
    [50, 'c', '±0.8'],
    [200, 'c', '±1.2'],
    [500, 'c', '±2'],
    [1500, 'c', '±3'],
    [3000, 'c', '±4'],
    [5, 'v', '±0.5'],
    [10, 'v', '±1'],
    [50, 'v', '±1.5'],
    [200, 'v', '±2.5'],
    [500, 'v', '±4'],
    [1500, 'v', '±6'],
    [3000, 'v', '±8'],
  ])('長さ %s mm・%s → %s', (size, cls, expected) => {
    const found = lookupTolerance('linear', cls, size)
    expect(found.status).toBe('ok')
    if (found.status === 'ok') expect(formatPlusMinusMm(found.tolerance)).toBe(expected)
  })

  it.each<[number, ToleranceClass, string]>([
    [1, 'f', '±0.2'],
    [1, 'm', '±0.2'],
    [1, 'c', '±0.4'],
    [1, 'v', '±0.4'],
    [5, 'm', '±0.5'],
    [5, 'c', '±1'],
    [10, 'm', '±1'],
    [10, 'v', '±2'],
  ])('面取り %s mm・%s → %s', (size, cls, expected) => {
    const found = lookupTolerance('chamfer', cls, size)
    expect(found.status).toBe('ok')
    if (found.status === 'ok') expect(formatPlusMinusMm(found.tolerance)).toBe(expected)
  })

  it.each<[number, ToleranceClass, string]>([
    [5, 'f', '±1°'],
    [5, 'm', '±1°'],
    [5, 'c', '±1°30′'],
    [5, 'v', '±3°'],
    [30, 'm', '±0°30′'],
    [30, 'c', '±1°'],
    [30, 'v', '±2°'],
    [100, 'm', '±0°20′'],
    [100, 'c', '±0°30′'],
    [100, 'v', '±1°'],
    [200, 'm', '±0°10′'],
    [200, 'c', '±0°15′'],
    [200, 'v', '±0°30′'],
    [1000, 'm', '±0°5′'],
    [1000, 'c', '±0°10′'],
    [1000, 'v', '±0°20′'],
  ])('角度 短辺 %s mm・%s → %s', (size, cls, expected) => {
    const found = lookupTolerance('angle', cls, size)
    expect(found.status).toBe('ok')
    if (found.status === 'ok') expect(formatPlusMinusAngle(found.tolerance)).toBe(expected)
  })
})

describe('区分の境目', () => {
  it.each<[number, number]>([
    [0.5, 0],
    [3, 0],
    [3.0001, 1],
    [6, 1],
    [30, 2],
    [30.01, 3],
    [120, 3],
    [400, 4],
    [1000, 5],
    [2000, 6],
    [4000, 7],
  ])('長さ %s mm → 区分 %s', (size, index) => {
    expect(findRange(LINEAR_RANGES, size)).toEqual({ status: 'ok', index })
  })

  it('0.5 mm 未満は個々に指示、4000 mm 超は規定なし、0 以下は無効', () => {
    expect(findRange(LINEAR_RANGES, 0.49)).toEqual({ status: 'below' })
    expect(findRange(LINEAR_RANGES, 4000.1)).toEqual({ status: 'above' })
    expect(findRange(LINEAR_RANGES, 0)).toEqual({ status: 'invalid' })
    expect(findRange(LINEAR_RANGES, -5)).toEqual({ status: 'invalid' })
    expect(findRange(LINEAR_RANGES, Number.NaN)).toEqual({ status: 'invalid' })
    expect(lookupTolerance('chamfer', 'm', 0.3)).toEqual({ status: 'below' })
  })

  it('面取りは 6 mm 超、角度は 400 mm 超も上限なし', () => {
    expect(lookupTolerance('chamfer', 'm', 50)).toMatchObject({ status: 'ok', index: 2, tolerance: 1000 })
    expect(lookupTolerance('angle', 'm', 10)).toMatchObject({ status: 'ok', index: 0 })
    expect(lookupTolerance('angle', 'm', 10.5)).toMatchObject({ status: 'ok', index: 1 })
    expect(lookupTolerance('angle', 'm', 0.2)).toMatchObject({ status: 'ok', index: 0 })
    expect(lookupTolerance('angle', 'v', 5000)).toMatchObject({ status: 'ok', index: 4, tolerance: 20 })
  })

  it('規定なし（—）の等級', () => {
    expect(lookupTolerance('linear', 'f', 3000)).toMatchObject({ status: 'none', index: 7 })
    expect(lookupTolerance('linear', 'v', 2)).toMatchObject({ status: 'none', index: 0 })
  })

  it('表の見出しの短い表記', () => {
    expect(TABLES.linear.ranges.map(shortRangeLabel)).toEqual([
      '0.5〜3',
      '3超〜6',
      '6超〜30',
      '30超〜120',
      '120超〜400',
      '400超〜1000',
      '1000超〜2000',
      '2000超〜4000',
    ])
    expect(TABLES.chamfer.ranges.map(shortRangeLabel)).toEqual(['0.5〜3', '3超〜6', '6超'])
    expect(TABLES.angle.ranges.map(shortRangeLabel)).toEqual(['〜10', '10超〜50', '50超〜120', '120超〜400', '400超'])
  })

  it('上端ちょうどを判定する', () => {
    expect(isOnBoundary('linear', 3)).toBe(true)
    expect(isOnBoundary('linear', 3.5)).toBe(false)
    expect(isOnBoundary('angle', 10)).toBe(true)
  })
})

describe('上・下の寸法', () => {
  it('入力の桁と許容差の桁の多い方でそろえる', () => {
    expect(linearLimits(50, 0, 300)).toEqual({ upper: '50.3', lower: '49.7' })
    expect(linearLimits(50, 2, 300)).toEqual({ upper: '50.30', lower: '49.70' })
    expect(linearLimits(2.5, 1, 50)).toEqual({ upper: '2.55', lower: '2.45' })
    expect(linearLimits(3000, 0, 2000)).toEqual({ upper: '3002', lower: '2998' })
    expect(linearLimits(12.345, 3, 200)).toEqual({ upper: '12.545', lower: '12.145' })
    // 浮動小数の誤差が出ない（0.1 + 0.2 など）
    expect(linearLimits(0.1, 1, 200)).toEqual({ upper: '0.3', lower: '-0.1' })
    expect(linearLimits(10.1, 1, 200)).toEqual({ upper: '10.3', lower: '9.9' })
  })

  it('入力の小数点以下の桁数', () => {
    expect(decimalsOfInput('50')).toBe(0)
    expect(decimalsOfInput('50.00')).toBe(2)
    expect(decimalsOfInput('１２．５')).toBe(1)
    expect(decimalsOfInput('8,5')).toBe(1)
    // カンマは parseNumber と同じルール（3桁区切りなら桁に数えない）
    expect(decimalsOfInput('1,200')).toBe(0)
    expect(decimalsOfInput('1,200.50')).toBe(2)
    expect(decimalsOfInput('0,125')).toBe(3)
  })

  it('カンマ入りの寸法: 1,200 は 1200 mm（1000 を超え 2000 以下）として読む', () => {
    // 表計算ソフトや部品表から貼り付けた「1,200」を 1.2 mm と読まない
    const size = parseNumber('1,200')!
    expect(size).toBe(1200)
    const found = lookupTolerance('linear', 'm', size)
    expect(found).toMatchObject({ status: 'ok', tolerance: 1200 })
    expect(linearLimits(size, decimalsOfInput('1,200'), 1200)).toEqual({ upper: '1201.2', lower: '1198.8' })
    // 先頭が 0 の「0,125」は小数点のカンマ（0.5 mm 未満なので表の対象外）
    expect(lookupTolerance('linear', 'm', parseNumber('0,125')!)).toEqual({ status: 'below' })
    // 「12,5」は 12.5 mm
    expect(lookupTolerance('linear', 'm', parseNumber('12,5')!)).toMatchObject({ status: 'ok', tolerance: 200 })
  })

  it('角度', () => {
    expect(angleLimits(90, 30)).toEqual({
      upper: '90°30′',
      lower: '89°30′',
      upperDecimal: '90.5°',
      lowerDecimal: '89.5°',
    })
    expect(angleLimits(45, 60)).toMatchObject({ upper: '46°', lower: '44°' })
    expect(angleLimits(22.5, 20)).toMatchObject({ upper: '22°50′', lower: '22°10′', upperDecimal: '22.8333°' })
    expect(angleLimits(0.5, 60)).toMatchObject({ lower: '−0°30′' })
    expect(formatDms(22 * 3600 + 30 * 60 + 15)).toBe('22°30′15″')
  })

  it('図面の注記', () => {
    expect(drawingNote('m')).toBe('普通公差 JIS B 0405-m')
  })
})
