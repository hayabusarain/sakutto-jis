import { describe, expect, it } from 'vitest'
import {
  findPipeThread,
  gInternalCalloutWithDrill,
  gMinorLimits,
  gRecommendedDrill,
  parsePipeThreadDesignation,
  parsePipeThreadKind,
  pipeThreadDesignation,
  pitch,
  rcInnerMinorDiameter,
  rPipeEndDiameter,
  rUsefulEndDiameter,
  rUsefulLengthFromPipeEnd,
  threadHeight,
} from './calc'
import { PIPE_THREAD_SIZES } from './data'

describe('R おねじの管端・有効ねじ部の端の外径（テーパ 1/16）', () => {
  it('R1/2: 管端 20.955 − 8.16/16 = 20.445、有効ねじ部の端 20.955 + (13.2 − 8.16)/16 = 21.270', () => {
    const t = findPipeThread('1/2')!
    expect(rPipeEndDiameter(t)).toBe(20.445)
    expect(rUsefulEndDiameter(t)).toBe(21.27)
  })

  it('R1/8: 管端 9.728 − 3.97/16 = 9.480', () => {
    expect(rPipeEndDiameter(findPipeThread('1/8')!)).toBe(9.48)
  })

  it('すべてのサイズで 管端 < 基準径 < 有効ねじ部の端', () => {
    for (const t of PIPE_THREAD_SIZES) {
      expect(rPipeEndDiameter(t), t.size).toBeLessThan(t.d)
      expect(rUsefulEndDiameter(t), t.size).toBeGreaterThan(t.d)
    }
  })
})

describe('表記ゆれの読み取り', () => {
  it.each([
    ['1/2', '1/2', null],
    ['1/2B', '1/2', null],
    ['15A', '1/2', null],
    ['R1/2', '1/2', 'R'],
    ['Rc3/4', '3/4', 'Rc'],
    ['rp 3/8', '3/8', 'Rp'],
    ['PT1/2', '1/2', 'Rc'],
    ['PS1/4', '1/4', 'Rp'],
    ['PF1/2', '1/2', 'G'],
    ['G1/2A', '1/2', 'G'],
    ['G 1-1/4', '1 1/4', 'G'],
    ['1.1/2', '1 1/2', null],
    ['1 1/2', '1 1/2', null],
    ['Ｇ１／２', '1/2', 'G'],
    ['50A', '2', null],
  ])('%s → %s %s', (text, size, kind) => {
    expect(parsePipeThreadDesignation(text)).toEqual({ size, kind })
  })

  it.each(['', '7/8', 'M12', 'X1/2', '90A', 'R1/2A', '1/2A', 'abc'])('%s は読めない', (text) => {
    expect(parsePipeThreadDesignation(text)).toBeNull()
  })

  it('種類の表記ゆれ', () => {
    expect(parsePipeThreadKind('rc')).toBe('Rc')
    expect(parsePipeThreadKind('PF')).toBe('G')
    expect(parsePipeThreadKind('PS')).toBe('Rp')
    expect(parsePipeThreadKind('PT')).toBe('Rc')
    expect(parsePipeThreadKind('M')).toBeNull()
  })
})

describe('図面指示', () => {
  it('呼び', () => {
    expect(pipeThreadDesignation('Rc', '1/2')).toBe('Rc1/2')
    expect(pipeThreadDesignation('R', '1 1/4')).toBe('R1 1/4')
    expect(pipeThreadDesignation('G', '1/2')).toBe('G1/2')
    expect(pipeThreadDesignation('G', '1/2', 'A')).toBe('G1/2A')
    expect(pipeThreadDesignation('G', '3/4', 'B')).toBe('G3/4B')
    // 等級は G のおねじだけ
    expect(pipeThreadDesignation('R', '1/2', 'A')).toBe('R1/2')
  })

  it('G めねじの下穴の注記は推奨下穴径の計算値', () => {
    expect(gInternalCalloutWithDrill(findPipeThread('1/2')!)).toBe('G1/2 下穴φ18.9')
    expect(gInternalCalloutWithDrill(findPipeThread('2')!)).toBe('G2 下穴φ57.0')
  })
})

describe('基準寸法の整合性', () => {
  it('有効径・谷径は外径から山の高さ h を引いた値（±0.002mm）', () => {
    for (const t of PIPE_THREAD_SIZES) {
      const h = threadHeight(t.tpi)
      expect(t.d - t.d2, t.size).toBeCloseTo(h, 2)
      expect(t.d - t.d1, t.size).toBeCloseTo(2 * h, 2)
    }
  })

  it('ピッチ', () => {
    expect(pitch(28)).toBeCloseTo(0.9071, 4)
    expect(pitch(19)).toBeCloseTo(1.3368, 4)
    expect(pitch(14)).toBeCloseTo(1.8143, 4)
    expect(pitch(11)).toBeCloseTo(2.3091, 4)
  })

  it('おねじの有効ねじ部は基準の長さより長い', () => {
    for (const t of PIPE_THREAD_SIZES) expect(t.usefulExternal, t.size).toBeGreaterThan(t.gaugeLength)
  })
})

describe('G の下穴径', () => {
  it('G1/8 の内径範囲は 8.566〜8.848', () => {
    expect(gMinorLimits(findPipeThread('1/8')!)).toEqual({ min: 8.566, max: 8.848 })
  })

  it.each([
    ['1/8', 8.7],
    ['1/4', 11.7],
    ['3/8', 15.2],
    ['1/2', 18.9],
    ['1', 30.6],
    ['2', 57],
  ])('G%s → %s', (size, drill) => {
    expect(gRecommendedDrill(findPipeThread(size)!)).toBe(drill)
  })

  it('推奨径は必ず許容範囲に入る', () => {
    for (const t of PIPE_THREAD_SIZES) {
      const drill = gRecommendedDrill(t)
      const { min, max } = gMinorLimits(t)
      expect(drill, t.size).toBeGreaterThanOrEqual(min)
      expect(drill, t.size).toBeLessThanOrEqual(max)
    }
  })
})

describe('Rc の奥端のめねじ内径', () => {
  it('Rc1/8: 8.566 − 6.2/16 = 8.179', () => {
    expect(rcInnerMinorDiameter(findPipeThread('1/8')!)).toBe(8.179)
  })

  it('2 1/2〜6 も計算できる（l は JIS B 0203 付表1 の 26.7・29.8・35.8・40.1・40.1）', () => {
    expect(['2 1/2', '3', '4', '5', '6'].map((size) => rcInnerMinorDiameter(findPipeThread(size)!))).toEqual([
      70.557, 83.064, 107.835, 132.966, 158.366,
    ])
  })

  it('有効ねじ部の長さが null（未確認）なら計算しない', () => {
    expect(rcInnerMinorDiameter({ ...findPipeThread('3')!, usefulInternalRc: null })).toBeNull()
  })
})

describe('JIS B 0203:1999 付表1 の原文と照合した値', () => {
  it('Rc の有効ねじ部の最小長さ l（全15サイズ。null は無い）', () => {
    expect(PIPE_THREAD_SIZES.map((t) => t.usefulInternalRc)).toEqual([
      6.2, 6.2, 9.4, 9.7, 12.7, 14.1, 16.2, 18.5, 18.5, 22.8, 26.7, 29.8, 35.8, 40.1, 40.1,
    ])
  })

  it('基準の長さ a と許容差 b・c', () => {
    expect(PIPE_THREAD_SIZES.map((t) => t.gaugeLength)).toEqual([
      3.97, 3.97, 6.01, 6.35, 8.16, 9.53, 10.39, 12.7, 12.7, 15.88, 17.46, 20.64, 25.4, 28.58, 28.58,
    ])
    expect(PIPE_THREAD_SIZES.map((t) => t.gaugeToleranceExternal)).toEqual([
      0.91, 0.91, 1.34, 1.34, 1.81, 1.81, 2.31, 2.31, 2.31, 2.31, 3.46, 3.46, 3.46, 3.46, 3.46,
    ])
    expect(PIPE_THREAD_SIZES.map((t) => t.gaugeToleranceInternal)).toEqual([
      1.13, 1.13, 1.67, 1.67, 2.27, 2.27, 2.89, 2.89, 2.89, 2.89, 3.46, 3.46, 3.46, 3.46, 3.46,
    ])
  })

  it('おねじの有効ねじ部 f と、管端から測った a + f（0.1mm に丸め。3/8 は 10.05 → 10.1）', () => {
    expect(PIPE_THREAD_SIZES.map((t) => t.usefulExternalFromGauge)).toEqual([
      2.5, 2.5, 3.7, 3.7, 5.0, 5.0, 6.4, 6.4, 6.4, 7.5, 9.2, 9.2, 10.4, 11.5, 11.5,
    ])
    expect(rUsefulLengthFromPipeEnd(findPipeThread('3/8')!)).toBe(10.1)
    expect(rUsefulLengthFromPipeEnd(findPipeThread('1/2')!)).toBe(13.2)
    for (const t of PIPE_THREAD_SIZES) expect(t.usefulExternal, t.size).toBe(rUsefulLengthFromPipeEnd(t))
  })

  it('G のめねじ内径 D1 の公差（JIS B 0202 付表2）: 28山 +0.282・19山 +0.445・14山 +0.541・11山 +0.640', () => {
    expect(gMinorLimits(findPipeThread('1/16')!).max).toBe(6.843)
    expect(gMinorLimits(findPipeThread('1/4')!)).toEqual({ min: 11.445, max: 11.89 })
    expect(gMinorLimits(findPipeThread('1/2')!)).toEqual({ min: 18.631, max: 19.172 })
    expect(gMinorLimits(findPipeThread('6')!)).toEqual({ min: 160.872, max: 161.512 })
  })
})
