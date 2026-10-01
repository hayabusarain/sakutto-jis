import { describe, expect, it } from 'vitest'
import { confusablePitches, R_HALF_PIPE_END, SCOPE } from './tips'

describe('紛らわしいピッチ', () => {
  it('14山（10ピッチ 18.14）は P1.75（17.5）と P2（20）の間', () => {
    const row = confusablePitches().find((r) => r.tpi === 14)!
    expect(row.tenPitches).toBeCloseTo(18.143, 3)
    expect(row.metric).toEqual([
      { pitch: 1.75, tenPitches: 17.5 },
      { pitch: 2, tenPitches: 20 },
    ])
  })

  it('28山（0.907）は P0.8 と P1、19山は P1.25 と P1.5、11山は P2 と P2.5', () => {
    const rows = confusablePitches()
    expect(rows.map((r) => r.tpi)).toEqual([28, 19, 14, 11])
    expect(rows.map((r) => r.metric.map((m) => m.pitch))).toEqual([
      [0.8, 1],
      [1.25, 1.5],
      [1.75, 2],
      [2, 2.5],
    ])
  })
})

describe('対象の範囲', () => {
  it('M1〜M68、管用ねじ 1/16〜6', () => {
    expect(SCOPE).toEqual({ metricMin: 1, metricMax: 68, pipeMin: '1/16', pipeMax: '6' })
  })

  it('R1/2 の管端の外径 20.445', () => {
    expect(R_HALF_PIPE_END).toBe(20.445)
  })
})
