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
  it('有効ねじ部の長さが未確認のサイズは null', () => {
    expect(rcInnerMinorDiameter(findPipeThread('3')!)).toBeNull()
  })
})
