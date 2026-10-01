import { describe, expect, it } from 'vitest'
import { parseNumber } from '../../lib/format'
import { PIPE_THREAD_SIZES } from '../pipe-thread/data'
import {
  circumference,
  compareSpecs,
  diameterFromCircumference,
  findByOd,
  findPipeSize,
  hardToTellSpecs,
  isCloseOdMatch,
  isValidCount,
  isWallFar,
  lengthLooksLikeMm,
  nearestAvailableSize,
  nearestSpecs,
  odMatchTolerance,
  pipeDimensions,
  pipeThreadFor,
  pipeWeight,
  roundSignificant,
  sizeChangeNotice,
  sizesOf,
  specsWithSize,
  unitMass,
  unitMassText,
  wallMatches,
  wallMatchTolerance,
} from './calc'
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

  it('外径は呼び径の順に大きくなる', () => {
    for (let i = 1; i < PIPE_SIZES.length; i++) {
      expect(PIPE_SIZES[i].od).toBeGreaterThan(PIPE_SIZES[i - 1].od)
    }
  })

  it('管用ねじの呼びは、対応する管の B 呼称と同じ（1/8 = 6A … 6 = 150A）', () => {
    for (const thread of PIPE_THREAD_SIZES) {
      if (!thread.pipeA) continue
      expect(findPipeSize(thread.pipeA)?.b, thread.size).toBe(thread.size)
    }
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

  it('Sch80 100A: 内径 114.3 − 2 × 8.6 = 97.1', () => {
    expect(pipeDimensions('sch80', '100A')!.id).toBe(97.1)
  })

  it('規格に無いサイズは null', () => {
    expect(pipeDimensions('sch40', '175A')).toBeNull()
    expect(pipeDimensions('sgp', '999A')).toBeNull()
  })
})

describe('nearestAvailableSize', () => {
  it('その規格にあるサイズはそのまま', () => {
    expect(nearestAvailableSize('sch40', '50A')).toBe('50A')
    expect(nearestAvailableSize('sgp', '175A')).toBe('175A')
  })

  it('Sch に無い 175A・225A は外径が一番近いサイズにする', () => {
    // 175A（190.7）: 150A（165.2）との差 25.5、200A（216.3）との差 25.6
    expect(nearestAvailableSize('sch40', '175A')).toBe('150A')
    // 225A（241.8）: 200A（216.3）との差 25.5、250A（267.4）との差 25.6
    expect(nearestAvailableSize('sch80', '225A')).toBe('200A')
  })

  it('呼び径そのものが無いときは null', () => {
    expect(nearestAvailableSize('sgp', '400A')).toBeNull()
  })
})

describe('pipeWeight', () => {
  it('SGP 50A × 5.5 m: 管 29.205 kg、水 12.09 kg、満水 41.29 kg', () => {
    const w = pipeWeight(pipeDimensions('sgp', '50A')!, 5.5)
    expect(w.mass).toBeCloseTo(29.205, 9)
    expect(w.water).toBeCloseTo(12.088, 3)
    expect(w.full).toBeCloseTo(41.293, 3)
  })

  it('長さ 0 なら 0', () => {
    expect(pipeWeight(pipeDimensions('sch40', '100A')!, 0)).toEqual({ mass: 0, water: 0, full: 0 })
  })
})

describe('lengthLooksLikeMm', () => {
  it('100 m 以上は mm で入れたとみなし、m に直した値を返す', () => {
    expect(lengthLooksLikeMm(5500)).toBe(5.5)
    expect(lengthLooksLikeMm(6000)).toBe(6)
    expect(lengthLooksLikeMm(100)).toBe(0.1)
    expect(lengthLooksLikeMm(1234.5)).toBe(1.2345)
  })

  it('100 m 未満はそのまま（null）', () => {
    expect(lengthLooksLikeMm(99.9)).toBeNull()
    expect(lengthLooksLikeMm(5.5)).toBeNull()
    expect(lengthLooksLikeMm(Number.NaN)).toBeNull()
  })
})

describe('isValidCount', () => {
  it('1以上の整数だけ', () => {
    expect(isValidCount(1)).toBe(true)
    expect(isValidCount(12)).toBe(true)
    expect(isValidCount(0)).toBe(false)
    expect(isValidCount(-1)).toBe(false)
    expect(isValidCount(1.5)).toBe(false)
    expect(isValidCount(null)).toBe(false)
  })

  it('3桁区切りの「1,000」は 1000 本として読む（以前は 1 本と読んでいた）', () => {
    expect(parseNumber('1,000')).toBe(1000)
    expect(isValidCount(parseNumber('1,000')!)).toBe(true)
  })
})

describe('compareSpecs', () => {
  it('50A は3規格とも寸法がある（SGP 3.8・Sch40 3.9・Sch80 5.5）', () => {
    const rows = compareSpecs('50A')
    expect(rows.map((row) => row.spec)).toEqual(['sgp', 'sch40', 'sch80'])
    expect(rows.map((row) => row.dims?.t)).toEqual([3.8, 3.9, 5.5])
  })

  it('175A は SGP だけ（Sch40・Sch80 は null）', () => {
    expect(compareSpecs('175A').map((row) => row.dims === null)).toEqual([false, true, true])
  })
})

describe('実測の外径・周長から呼び径', () => {
  it('周長と外径の換算 D = C ÷ π', () => {
    expect(diameterFromCircumference(Math.PI * 60.5)).toBeCloseTo(60.5, 9)
    expect(circumference(114.3)).toBeCloseTo(359.08, 2)
  })

  it('周長 359 mm → 外径 114.27 mm → 100A（差 −0.03）', () => {
    const [best] = findByOd(diameterFromCircumference(359))
    expect(best.size.a).toBe('100A')
    expect(best.delta).toBeCloseTo(-0.027, 3)
    expect(isCloseOdMatch(best)).toBe(true)
  })

  it('外径ちょうどならそのサイズ（差 0）', () => {
    for (const size of PIPE_SIZES) {
      const [best] = findByOd(size.od)
      expect(best.size.a).toBe(size.a)
      expect(best.delta).toBe(0)
    }
  })

  it('近い順に並ぶ（60 mm → 50A、次は 40A）', () => {
    const matches = findByOd(60)
    expect(matches.map((m) => m.size.a).slice(0, 2)).toEqual(['50A', '40A'])
    expect(matches).toHaveLength(PIPE_SIZES.length)
  })

  it('ねじ部を測ったとき（R1/2 の外径 20.955）も 15A になる', () => {
    const [best] = findByOd(20.955)
    expect(best.size.a).toBe('15A')
    expect(isCloseOdMatch(best)).toBe(true)
  })

  it('どのサイズとも離れていれば「近くない」', () => {
    // 20A（27.2）と 25A（34.0）の中間
    const [best] = findByOd(30.6)
    expect(isCloseOdMatch(best)).toBe(false)
    // 表の範囲外
    expect(isCloseOdMatch(findByOd(500)[0])).toBe(false)
    expect(isCloseOdMatch(findByOd(3)[0])).toBe(false)
  })

  it('「近い」の目安は、どの呼び径でも隣のサイズとの外径の差の半分より小さい（候補が1つに決まる）', () => {
    for (let i = 0; i < PIPE_SIZES.length; i++) {
      const tolerance = odMatchTolerance(PIPE_SIZES[i].od)
      const prev = PIPE_SIZES[i - 1]
      const next = PIPE_SIZES[i + 1]
      if (prev) expect(tolerance, PIPE_SIZES[i].a).toBeLessThan((PIPE_SIZES[i].od - prev.od) / 2)
      if (next) expect(tolerance, PIPE_SIZES[i].a).toBeLessThan((next.od - PIPE_SIZES[i].od) / 2)
    }
  })

  it('目安の境界: 1 mm と外径の 3% の大きい方', () => {
    expect(odMatchTolerance(21.7)).toBe(1)
    expect(odMatchTolerance(114.3)).toBeCloseTo(3.429, 9)
    expect(isCloseOdMatch({ size: findPipeSize('15A')!, delta: 1 })).toBe(true)
    expect(isCloseOdMatch({ size: findPipeSize('15A')!, delta: -1.01 })).toBe(false)
  })
})

describe('実測の肉厚から規格', () => {
  it('100A で 6.0 mm → Sch40（SGP 4.5・Sch80 8.6）', () => {
    const matches = wallMatches('100A', 6.0)
    expect(matches.map((m) => m.spec)).toEqual(['sch40', 'sgp', 'sch80'])
    expect(nearestSpecs(matches).map((m) => m.spec)).toEqual(['sch40'])
    expect(matches[1].delta).toBeCloseTo(1.5, 9)
  })

  it('15A は SGP と Sch40 が同じ厚さ 2.8 なので、両方を一番近いとする', () => {
    const best = nearestSpecs(wallMatches('15A', 2.8))
    expect(best.map((m) => m.spec)).toEqual(['sgp', 'sch40'])
    expect(hardToTellSpecs(wallMatches('15A', 2.8))).toEqual([])
  })

  it('20A の SGP 2.8 と Sch40 2.9 は実測では見分けにくい', () => {
    const matches = wallMatches('20A', 2.8)
    expect(nearestSpecs(matches).map((m) => m.spec)).toEqual(['sgp'])
    expect(hardToTellSpecs(matches).map((m) => m.spec)).toEqual(['sch40'])
  })

  it('65A の SGP 4.2 と Sch40 5.2 は見分けられる', () => {
    expect(hardToTellSpecs(wallMatches('65A', 4.2))).toEqual([])
  })

  it('175A は SGP だけと比べる', () => {
    expect(wallMatches('175A', 5.3).map((m) => m.spec)).toEqual(['sgp'])
  })

  it('無いサイズは空', () => {
    expect(wallMatches('999A', 3)).toEqual([])
    expect(nearestSpecs([])).toEqual([])
    expect(hardToTellSpecs([])).toEqual([])
  })

  it('差の目安は厚さの 15%（最小 0.3 mm）', () => {
    expect(wallMatchTolerance(1.7)).toBe(0.3)
    expect(wallMatchTolerance(8.6)).toBeCloseTo(1.29, 9)
  })

  it('どの規格とも離れていれば isWallFar', () => {
    // 100A: SGP 4.5 / Sch40 6.0。5.2 は SGP に一番近いが差 0.7 > 4.5 × 15% = 0.675
    const far = nearestSpecs(wallMatches('100A', 5.2))
    expect(far.map((m) => m.spec)).toEqual(['sgp'])
    expect(isWallFar(far[0])).toBe(true)
    // 4.9 は差 0.4 で近い
    expect(isWallFar(nearestSpecs(wallMatches('100A', 4.9))[0])).toBe(false)
    // 境界ちょうど（6A Sch40 1.7 + 0.3）は近いとみなす
    expect(isWallFar({ spec: 'sch40', t: 1.7, delta: 0.3 })).toBe(false)
  })
})

describe('pipeThreadFor', () => {
  it('50A → R2、15A → R1/2', () => {
    expect(pipeThreadFor('50A')?.size).toBe('2')
    expect(pipeThreadFor('15A')?.size).toBe('1/2')
    expect(pipeThreadFor('15A')?.d).toBe(20.955)
  })

  it('管用ねじの表に無い呼び径は undefined（90A・175A 以上）', () => {
    expect(pipeThreadFor('90A')).toBeUndefined()
    expect(pipeThreadFor('200A')).toBeUndefined()
  })

  it('ねじの外径（基準径）は管の外径より小さい', () => {
    for (const size of PIPE_SIZES) {
      const thread = pipeThreadFor(size.a)
      if (thread) expect(thread.d, size.a).toBeLessThan(size.od)
    }
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

describe('unitMassText（単位質量の表示は有効数字3桁）', () => {
  it('末尾の 0 も残す（15.0・4.10・36.0）', () => {
    expect(unitMassText(15.0)).toBe('15.0')
    expect(unitMassText(4.1)).toBe('4.10')
    expect(unitMassText(36)).toBe('36.0')
    expect(unitMassText(12.0)).toBe('12.0')
  })

  it('小さい値・3桁の値', () => {
    expect(unitMassText(0.419)).toBe('0.419')
    expect(unitMassText(5.31)).toBe('5.31')
    expect(unitMassText(129)).toBe('129')
  })

  it('1000 以上でも指数表記にしない', () => {
    expect(unitMassText(1234)).toBe('1230')
  })

  it.each(['sgp', 'sch40', 'sch80'] as PipeSpec[])('%s の全サイズで、表示は有効数字3桁・値は data.ts と同じ', (spec) => {
    for (const size of sizesOf(spec)) {
      const w = WALL[spec][size.a]![1]
      const text = unitMassText(w)
      expect(Number(text), `${spec} ${size.a}`).toBe(w)
      expect(text.replace('.', '').replace(/^0+/, ''), `${spec} ${size.a}`).toHaveLength(3)
    }
  })

  it('SGP 125A 15.0・Sch40 40A 4.10・Sch80 65A 12.0', () => {
    expect(unitMassText(pipeDimensions('sgp', '125A')!.massPerM)).toBe('15.0')
    expect(unitMassText(pipeDimensions('sch40', '40A')!.massPerM)).toBe('4.10')
    expect(unitMassText(pipeDimensions('sch80', '65A')!.massPerM)).toBe('12.0')
  })
})

describe('規格の切り替えで呼び径を置き換えたときの知らせ', () => {
  it('175A・225A は SGP だけにある', () => {
    expect(specsWithSize('175A')).toEqual(['sgp'])
    expect(specsWithSize('225A')).toEqual(['sgp'])
    expect(specsWithSize('50A')).toEqual(['sgp', 'sch40', 'sch80'])
  })

  it('Sch40 に 175A は無いので 150A にした、と知らせる', () => {
    const to = nearestAvailableSize('sch40', '175A')!
    expect(to).toBe('150A')
    expect(sizeChangeNotice('sch40', '175A', to)).toBe(
      'Sch40 に 175A は無いため（175A は SGP のみ）、外径が近い 150A にしました。',
    )
  })

  it('Sch80 の 225A → 200A', () => {
    expect(sizeChangeNotice('sch80', '225A', nearestAvailableSize('sch80', '225A')!)).toBe(
      'Sch80 に 225A は無いため（225A は SGP のみ）、外径が近い 200A にしました。',
    )
  })

  it('置き換えていなければ null', () => {
    expect(sizeChangeNotice('sch40', '50A', '50A')).toBeNull()
  })
})
