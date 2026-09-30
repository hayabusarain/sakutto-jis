import { describe, expect, it } from 'vitest'
import { pipeDimensions, roundSignificant, sizesOf, unitMass } from './calc'
import { PIPE_SIZES, WALL, type PipeSpec } from './data'

describe('データの整合性', () => {
  it.each(['sgp', 'sch40', 'sch80'] as PipeSpec[])(
    '%s の単位質量は、JIS の式 0.02466 t (D − t) を有効数字3桁に丸めた値と一致する',
    (spec) => {
      for (const size of PIPE_SIZES) {
        const wall = WALL[spec][size.a]
        if (!wall) continue
        const [t, w] = wall
        expect(roundSignificant(unitMass(size.od, t), 3), `${spec} ${size.a}`).toBe(w)
      }
    },
  )

  it('厚さは SGP ≦ Sch40 < Sch80（10A・15A は SGP = Sch40）', () => {
    for (const size of PIPE_SIZES) {
      const sch40 = WALL.sch40[size.a]
      const sch80 = WALL.sch80[size.a]
      if (!sch40 || !sch80) continue
      expect(sch40[0], size.a).toBeLessThan(sch80[0])
    }
  })

  it('175A・225A は SGP のみ', () => {
    expect(sizesOf('sgp').map((s) => s.a)).toContain('175A')
    expect(sizesOf('sch40').map((s) => s.a)).not.toContain('175A')
    expect(sizesOf('sch80').map((s) => s.a)).not.toContain('225A')
  })
})

describe('pipeDimensions', () => {
  it('SGP 50A: 外径 60.5・厚さ 3.8・内径 52.9・5.31 kg/m', () => {
    const dims = pipeDimensions('sgp', '50A')!
    expect(dims.od).toBe(60.5)
    expect(dims.t).toBe(3.8)
    expect(dims.id).toBe(52.9)
    expect(dims.massPerM).toBe(5.31)
    // 内容積 π/4 × 52.9² mm² × 1m = 2.198 L
    expect(dims.volumePerM).toBeCloseTo(2.198, 3)
    expect(dims.surfacePerM).toBeCloseTo(0.19007, 4)
  })

  it('規格に無いサイズは null', () => {
    expect(pipeDimensions('sch40', '175A')).toBeNull()
    expect(pipeDimensions('sgp', '999A')).toBeNull()
  })
})

describe('roundSignificant', () => {
  it('JIS Z 8401 規則A', () => {
    expect(roundSignificant(5.3066, 3)).toBe(5.31)
    expect(roundSignificant(128.93, 3)).toBe(129)
    expect(roundSignificant(0.41934, 3)).toBe(0.419)
    expect(roundSignificant(2.125, 3)).toBe(2.12)
    expect(roundSignificant(2.135, 3)).toBe(2.14)
  })
})
