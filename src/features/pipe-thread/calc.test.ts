import { describe, expect, it } from 'vitest'
import { findPipeThread, gMinorLimits, gRecommendedDrill, pitch, rcInnerMinorDiameter, threadHeight } from './calc'
import { PIPE_THREAD_SIZES } from './data'

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
