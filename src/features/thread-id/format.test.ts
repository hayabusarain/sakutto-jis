import { describe, expect, it } from 'vitest'
import { pitchFromTpi, rankCandidates } from './calc'
import { kindText, pitchText, rangeText, signed } from './format'

describe('表示の整形', () => {
  it('符号付きの差', () => {
    expect(signed(0.45)).toBe('+0.450')
    expect(signed(-0.505)).toBe('−0.505')
    expect(signed(0)).toBe('±0')
    expect(signed(-0.0001)).toBe('±0')
    expect(signed(-0.2, 1)).toBe('−0.2')
  })

  it('範囲', () => {
    expect(rangeText({ min: 20.445, max: 21.27 })).toBe('20.445〜21.270')
    expect(rangeText({ min: 12, max: 12 })).toBe('12.000')
  })

  it('ピッチ: 管用ねじは山数つき、ピッチ未入力のメートルねじはほかのピッチも', () => {
    const [r] = rankCandidates({ side: 'external', diameter: 20.45, pitch: pitchFromTpi(14) })
    expect(pitchText(r)).toBe('1.814 mm（14山）')
    const m20 = rankCandidates({ side: 'external', diameter: 20, pitch: null })[0]
    expect(pitchText(m20)).toBe('2.5 mm（ほか 2・1.5・1）')
    const m12 = rankCandidates({ side: 'external', diameter: 11.8, pitch: 1.75 })[0]
    expect(pitchText(m12)).toBe('1.75 mm')
  })

  it('種類の説明', () => {
    const [r, g] = rankCandidates({ side: 'external', diameter: 20.45, pitch: pitchFromTpi(14) })
    expect(kindText(r)).toBe('管用テーパおねじ（旧 PT）')
    expect(kindText(g)).toBe('管用平行おねじ（旧 PF）')
    const [m] = rankCandidates({ side: 'external', diameter: 12, pitch: 1.25 })
    expect(kindText(m)).toBe('メートル細目ねじ')
  })
})
