import { describe, expect, it } from 'vitest'
import {
  boltLength,
  compareClasses,
  findFlange,
  flangeBoltLength,
  flangeThicknessTolerance,
  identifyFlange,
  isRowUnverified,
  isRowUnverifiedIn,
  isUnverified,
  isUnverifiedIn,
  nearestSize,
  pcdFromPitch,
  protrusionThreads,
  raisedFaceHeight,
  roundLength,
  sameBoltPattern,
  spannerSize,
  type BoltConditions,
  type BoltLengthInput,
  type IdentifyQuery,
} from './calc'
import {
  ALL_FLANGE_TABLES,
  ALL_FLANGE_TABLES_LABEL,
  COARSE_PITCH,
  FLANGES,
  flangeTableLabel,
  NUT_HEIGHT,
  PIPE_OD,
  PRESSURE_CLASSES,
  UNVERIFIED,
  WASHER_THICKNESS,
  type UnverifiedList,
} from './data'

const base: BoltLengthInput = {
  bolt: 16,
  t1: 16,
  t2: 16,
  gasket: 3,
  washers: 0,
  nut: 'style1',
  threads: 3,
  type: 'hex',
  rounding: '5mm',
}

describe('boltLength', () => {
  it('10K 50A・ガスケット3mm・座金なし・3山: 16+16+3+14.8+6 = 55.8 → 60', () => {
    const result = boltLength(base)
    expect(result.required).toBe(55.8)
    expect(result.length).toBe(60)
    expect(result.actualProtrusion).toBe(10.2)
  })

  it('旧JIS 1種ナット・両側座金', () => {
    const result = boltLength({ ...base, nut: 'ja1', washers: 2 })
    // 16+16+3+3×2 + 13 + 6 = 60
    expect(result.required).toBe(60)
    expect(result.length).toBe(60)
  })

  it('スタッドボルトはナット2個分・突き出しも両側', () => {
    const result = boltLength({ ...base, type: 'stud' })
    // 16+16+3 + 14.8×2 + 6×2 = 76.6 → 80
    expect(result.required).toBe(76.6)
    expect(result.length).toBe(80)
    expect(result.actualProtrusion).toBe(7.7)
  })

  it('JIS標準長さに丸める（70の次は80）', () => {
    // 20+20+3+14.8+6 = 63.8 → 65
    expect(boltLength({ ...base, t1: 20, t2: 20, rounding: 'jis' }).length).toBe(65)
    expect(roundLength(70.1, 'jis')).toBe(80)
    expect(roundLength(70.1, '5mm')).toBe(75)
    expect(roundLength(60, '5mm')).toBe(60)
    expect(roundLength(301, 'jis')).toBeNull()
  })
})

describe('protrusionThreads', () => {
  it('6.6mm ÷ ピッチ1.5 = 4.4山（浮動小数の誤差で 4.3 にならない）', () => {
    expect(protrusionThreads(6.6, 1.5)).toBe(4.4)
    expect(protrusionThreads(9.45, 1.75)).toBe(5.4)
    expect(protrusionThreads(10.2, 2)).toBe(5.1)
  })
})

describe('フランジデータの整合性', () => {
  const holeForBolt: Record<number, number> = { 10: 12, 12: 15, 16: 19, 20: 23, 22: 25, 24: 27 }

  it.each(PRESSURE_CLASSES)('%s: ボルト穴径とボルトの呼びの対応、寸法の大小関係', (pressure) => {
    for (const row of FLANGES[pressure]) {
      const label = `${pressure} ${row.size}`
      expect(row.h, label).toBe(holeForBolt[row.bolt])
      expect(row.C, label).toBeLessThan(row.D)
      // ボルト穴が外周・管にかからない
      expect(row.C + row.h, label).toBeLessThan(row.D)
      expect(row.C - row.h, label).toBeGreaterThan(PIPE_OD[row.size])
      expect(row.n % 4, label).toBe(0)
      expect(NUT_HEIGHT[row.bolt], label).toBeDefined()
      expect(COARSE_PITCH[row.bolt], label).toBeDefined()
      expect(WASHER_THICKNESS[row.bolt], label).toBeDefined()
    }
  })

  it.each(PRESSURE_CLASSES)('%s: 呼び径が大きいほど外径・PCD・厚さは減らない', (pressure) => {
    const rows = FLANGES[pressure]
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].D, rows[i].size).toBeGreaterThan(rows[i - 1].D)
      expect(rows[i].C, rows[i].size).toBeGreaterThan(rows[i - 1].C)
      expect(rows[i].t, rows[i].size).toBeGreaterThanOrEqual(rows[i - 1].t)
    }
  })

  it('圧力が高いほど厚さは同じか厚い（同じ呼び径）', () => {
    for (const row of FLANGES['10K']) {
      const k5 = findFlange('5K', row.size)
      const k16 = findFlange('16K', row.size)
      const k20 = findFlange('20K', row.size)
      if (k5) expect(k5.t, row.size).toBeLessThanOrEqual(row.t)
      if (k16) expect(k16.t, row.size).toBeGreaterThanOrEqual(row.t)
      if (k16 && k20) expect(k20.t, row.size).toBeGreaterThanOrEqual(k16.t)
    }
  })

  it('確認できた 10K の寸法', () => {
    expect(findFlange('10K', '50A')).toEqual({ size: '50A', D: 155, C: 120, n: 4, h: 19, bolt: 16, t: 16 })
    expect(findFlange('10K', '100A')).toEqual({ size: '100A', D: 210, C: 175, n: 8, h: 19, bolt: 16, t: 18 })
  })

  // JIS B 2220:2012 の原文（表14・表15・表17・表18）で確認した値。以前 ※ を付けていた行・厚さ
  it('原文で確認した 5K・10K の 90A・175A・225A と 5K 50A の厚さ', () => {
    expect(findFlange('5K', '50A')?.t).toBe(14)
    expect(findFlange('5K', '90A')).toEqual({ size: '90A', D: 190, C: 155, n: 4, h: 19, bolt: 16, t: 14 })
    expect(findFlange('5K', '175A')).toEqual({ size: '175A', D: 300, C: 260, n: 8, h: 23, bolt: 20, t: 18 })
    expect(findFlange('5K', '225A')).toEqual({ size: '225A', D: 345, C: 305, n: 12, h: 23, bolt: 20, t: 20 })
    expect(findFlange('10K', '90A')).toEqual({ size: '90A', D: 195, C: 160, n: 8, h: 19, bolt: 16, t: 18 })
    expect(findFlange('10K', '175A')).toEqual({ size: '175A', D: 305, C: 265, n: 12, h: 23, bolt: 20, t: 22 })
    expect(findFlange('10K', '225A')).toEqual({ size: '225A', D: 350, C: 310, n: 12, h: 23, bolt: 20, t: 22 })
  })

  it('原文で確認した 16K の厚さ（表17）と 20K の厚さ（表18）', () => {
    expect(FLANGES['16K'].map((row) => row.t)).toEqual([12, 12, 14, 14, 16, 16, 16, 18, 20, 20, 22, 22, 24, 26, 28, 30])
    expect(FLANGES['20K'].map((row) => row.t)).toEqual([14, 14, 16, 16, 18, 18, 18, 20, 22, 24, 24, 26, 28, 30, 34, 36])
  })

  it('16K・20K の 90A（表17・表18）: 外径 210・PCD 170・8-φ23・M20、厚さ 16K 20・20K 24', () => {
    expect(findFlange('16K', '90A')).toEqual({ size: '90A', D: 210, C: 170, n: 8, h: 23, bolt: 20, t: 20 })
    expect(findFlange('20K', '90A')).toEqual({ size: '90A', D: 210, C: 170, n: 8, h: 23, bolt: 20, t: 24 })
  })

  it('呼び径の並び（表12）: 5K・10K は 18 サイズ、16K・20K は 175A・225A が無い 16 サイズ', () => {
    const all = ['10A', '15A', '20A', '25A', '32A', '40A', '50A', '65A', '80A', '90A', '100A', '125A', '150A', '175A', '200A', '225A', '250A', '300A']
    expect(FLANGES['5K'].map((row) => row.size)).toEqual(all)
    expect(FLANGES['10K'].map((row) => row.size)).toEqual(all)
    const withoutOdd = all.filter((size) => size !== '175A' && size !== '225A')
    expect(FLANGES['16K'].map((row) => row.size)).toEqual(withoutOdd)
    expect(FLANGES['20K'].map((row) => row.size)).toEqual(withoutOdd)
  })
})

describe('典拠の表番号（JIS B 2220:2012）', () => {
  it('呼び圧力ごとの表', () => {
    expect(flangeTableLabel('5K')).toBe('表14 呼び圧力5Kフランジの寸法')
    expect(flangeTableLabel('10K')).toBe('表15 呼び圧力10Kフランジの寸法')
    expect(flangeTableLabel('16K')).toBe('表17 呼び圧力16Kフランジの寸法')
    expect(flangeTableLabel('20K')).toBe('表18 呼び圧力20Kフランジの寸法')
    expect(ALL_FLANGE_TABLES).toBe('表14・表15・表17・表18')
    expect(ALL_FLANGE_TABLES_LABEL).toBe('表14・表15・表17・表18（呼び圧力5K・10K・16K・20Kフランジの寸法）')
  })
})

describe('座の高さ f（表13）と厚さの許容差（表22）', () => {
  it('f は 10A〜25A 1 mm、32A〜250A 2 mm、300A 3 mm', () => {
    expect(raisedFaceHeight('10A')).toBe(1)
    expect(raisedFaceHeight('25A')).toBe(1)
    expect(raisedFaceHeight('32A')).toBe(2)
    expect(raisedFaceHeight('90A')).toBe(2)
    expect(raisedFaceHeight('250A')).toBe(2)
    expect(raisedFaceHeight('300A')).toBe(3)
    expect(raisedFaceHeight('350A')).toBeUndefined()
    for (const pressure of PRESSURE_CLASSES) {
      for (const row of FLANGES[pressure]) {
        const f = raisedFaceHeight(row.size)
        expect(f, `${pressure} ${row.size}`).toBeDefined()
        // t は f を含むので、t − f も正
        expect(row.t - f!, `${pressure} ${row.size}`).toBeGreaterThan(0)
      }
    }
  })

  it('厚さの許容差はプラス側: 20 以下 +1.5、20 を超え 50 以下 +2、50 を超えると +3', () => {
    expect(flangeThicknessTolerance(9)).toBe(1.5)
    expect(flangeThicknessTolerance(20)).toBe(1.5)
    expect(flangeThicknessTolerance(20.1)).toBe(2)
    expect(flangeThicknessTolerance(50)).toBe(2)
    expect(flangeThicknessTolerance(50.5)).toBe(3)
  })
})

describe('規格原文で未確認の値（UNVERIFIED）', () => {
  it('いまは空（以前の項目はすべて原文と一致した）', () => {
    expect(UNVERIFIED).toEqual({})
  })

  it('原文で確認した値には ※ を付けない（以前 ※ だった 16K の厚さ・5K 50A の厚さ・5K・10K の 90A・175A・225A）', () => {
    for (const pressure of PRESSURE_CLASSES) {
      for (const row of FLANGES[pressure]) {
        expect(isRowUnverified(pressure, row.size), `${pressure} ${row.size}`).toBe(false)
        for (const field of ['D', 'C', 'n', 'h', 'bolt', 't'] as const) {
          expect(isUnverified(pressure, row.size, field), `${pressure} ${row.size} ${field}`).toBe(false)
        }
      }
    }
  })

  // 仕組みは残している（今後、未確認の値を載せるとき用）。仮の一覧で確かめる
  const sample: UnverifiedList = { '5K': { t: ['50A'], rows: ['90A'] }, '16K': { t: 'all' } }

  it('行全体が未確認なら、どの項目も未確認', () => {
    expect(isRowUnverifiedIn(sample, '5K', '90A')).toBe(true)
    expect(isUnverifiedIn(sample, '5K', '90A', 'D')).toBe(true)
    expect(isUnverifiedIn(sample, '5K', '90A', 't')).toBe(true)
    expect(isRowUnverifiedIn(sample, '10K', '90A')).toBe(false)
  })

  it('厚さだけの指定（呼び径を挙げる・all）', () => {
    expect(isUnverifiedIn(sample, '5K', '50A', 't')).toBe(true)
    expect(isUnverifiedIn(sample, '5K', '50A', 'C')).toBe(false)
    expect(isUnverifiedIn(sample, '5K', '65A', 't')).toBe(false)
    for (const row of FLANGES['16K']) {
      expect(isUnverifiedIn(sample, '16K', row.size, 't')).toBe(true)
      expect(isUnverifiedIn(sample, '16K', row.size, 'D')).toBe(false)
    }
    expect(isUnverifiedIn(sample, '20K', '50A', 't')).toBe(false)
  })
})

const conditions: BoltConditions = {
  type: 'hex',
  gasket: 3,
  washers: 0,
  nut: 'style1',
  threads: 3,
  rounding: '5mm',
  t2: null,
}

describe('flangeBoltLength', () => {
  it('相手側が空欄なら同じ厚さ、入力があればその厚さ', () => {
    const row = findFlange('10K', '50A')!
    expect(flangeBoltLength(row, conditions).length).toBe(60)
    // 16 + 20 + 3 + 14.8 + 6 = 59.8 → 60
    expect(flangeBoltLength(row, { ...conditions, t2: 20 }).required).toBe(59.8)
    // 16 + 22 + 3 + 14.8 + 6 = 61.8 → 65
    expect(flangeBoltLength(row, { ...conditions, t2: 22 }).length).toBe(65)
  })
})

describe('spannerSize', () => {
  it('JIS本体ナットは本体、旧JIS 1種は附属書JA の二面幅', () => {
    expect(spannerSize(16, 'style1')).toBe(24)
    expect(spannerSize(16, 'ja1')).toBe(24)
    expect(spannerSize(10, 'style1')).toBe(16)
    expect(spannerSize(10, 'ja1')).toBe(17)
    expect(spannerSize(12, 'style1')).toBe(18)
    expect(spannerSize(12, 'ja1')).toBe(19)
    expect(spannerSize(22, 'style1')).toBe(34)
    expect(spannerSize(22, 'ja1')).toBe(32)
    expect(spannerSize(7, 'style1')).toBeUndefined()
  })

  it('フランジに使うボルトはすべて二面幅がわかる', () => {
    for (const pressure of PRESSURE_CLASSES) {
      for (const row of FLANGES[pressure]) {
        expect(spannerSize(row.bolt, 'style1'), `${pressure} ${row.size}`).toBeDefined()
        expect(spannerSize(row.bolt, 'ja1'), `${pressure} ${row.size}`).toBeDefined()
      }
    }
  })
})

describe('compareClasses', () => {
  it('50A: 4クラスとも有り、今の条件のボルト長さ', () => {
    const rows = compareClasses('50A', conditions)
    expect(rows.map((r) => r.pressure)).toEqual(['5K', '10K', '16K', '20K'])
    // 5K: 14+14+3+10.8+5.25 = 47.05 → 50 / 10K・16K: 60 / 20K: 18+18+3+14.8+6 = 59.8 → 60
    expect(rows.map((r) => r.bolt?.length)).toEqual([50, 60, 60, 60])
    expect(rows[0].row?.bolt).toBe(12)
  })

  it('条件が入力エラー（null）のときは寸法だけ', () => {
    const rows = compareClasses('50A', null)
    expect(rows.every((r) => r.row !== undefined && r.bolt === undefined)).toBe(true)
  })

  it('175A・225A: 16K・20K には無い', () => {
    for (const size of ['175A', '225A']) {
      const rows = compareClasses(size, conditions)
      expect(rows.map((r) => r.row === undefined)).toEqual([false, false, true, true])
      expect(rows[2].bolt).toBeUndefined()
    }
  })

  it('90A: 4クラスとも有り（16K・20K は M20・8本）', () => {
    const rows = compareClasses('90A', conditions)
    expect(rows.every((r) => r.row !== undefined)).toBe(true)
    expect(rows.map((r) => r.row?.bolt)).toEqual([16, 16, 20, 20])
    // 5K: 14+14+3+14.8+6 = 51.8 → 55 / 10K: 18+18+3+14.8+6 = 59.8 → 60
    // 16K: 20+20+3+18+2.5×3 = 68.5 → 70 / 20K: 24+24+3+18+7.5 = 76.5 → 80
    expect(rows.map((r) => r.bolt?.required)).toEqual([51.8, 59.8, 68.5, 76.5])
    expect(rows.map((r) => r.bolt?.length)).toEqual([55, 60, 70, 80])
  })
})

describe('sameBoltPattern', () => {
  it('10K・16K・20K の 25A は PCD・穴が同じ、50A は穴数だけ違う、16K と 20K は同じ', () => {
    expect(sameBoltPattern(findFlange('10K', '25A')!, findFlange('16K', '25A')!)).toBe(true)
    expect(sameBoltPattern(findFlange('10K', '25A')!, findFlange('20K', '25A')!)).toBe(true)
    expect(sameBoltPattern(findFlange('10K', '50A')!, findFlange('16K', '50A')!)).toBe(false)
    expect(sameBoltPattern(findFlange('5K', '50A')!, findFlange('10K', '50A')!)).toBe(false)
    for (const row of FLANGES['16K']) {
      expect(sameBoltPattern(row, findFlange('20K', row.size)!), row.size).toBe(true)
    }
  })
})

describe('nearestSize', () => {
  it('そのクラスに無い呼び径は、最も近い呼び径（同じ近さなら大きい方）', () => {
    expect(nearestSize('16K', '50A')).toBe('50A')
    // 90A は 16K・20K にもある（JIS B 2220 表12・表17・表18）
    expect(nearestSize('16K', '90A')).toBe('90A')
    expect(nearestSize('20K', '90A')).toBe('90A')
    expect(nearestSize('16K', '175A')).toBe('200A')
    expect(nearestSize('20K', '225A')).toBe('250A')
    expect(nearestSize('10K', '8A')).toBe('10A')
    expect(nearestSize('10K', '350A')).toBe('300A')
    expect(nearestSize('10K', 'abc')).toBe('50A')
  })
})

describe('pcdFromPitch', () => {
  it('PCD = s ÷ sin(π/n)。4穴は s × √2', () => {
    expect(pcdFromPitch(84.9, 4)).toBeCloseTo(84.9 * Math.SQRT2, 9)
    // 10K 100A（PCD 175・8穴）の隣の穴の間隔は 175 × sin(22.5°) = 66.97
    expect(pcdFromPitch(175 * Math.sin(Math.PI / 8), 8)).toBeCloseTo(175, 9)
    expect(pcdFromPitch(66.97, 8)).toBeCloseTo(175, 1)
  })
})

describe('identifyFlange', () => {
  const query = (q: Partial<IdentifyQuery>): IdentifyQuery => ({ n: 4, D: null, pcd: null, h: null, t: null, ...q })
  const labels = (group: { candidates: { pressure: string; row: { size: string } }[] }) =>
    group.candidates.map((c) => `${c.pressure} ${c.row.size}`)

  it('外径 155・4穴・隣の穴の間隔 84.9 → 10K 50A だけ', () => {
    const groups = identifyFlange(query({ D: 155, pcd: pcdFromPitch(84.9, 4) }))
    expect(labels(groups[0])).toEqual(['10K 50A'])
    expect(groups[0].close).toBe(true)
    expect(groups[0].candidates[0].dD).toBe(0)
    // PCD = 84.9 × √2 = 120.067 → 表の 120 との差 −0.067
    expect(groups[0].candidates[0].dC).toBe(-0.067)
    // 次に近いのは外径の同じ 5K 65A（PCD 130）
    expect(labels(groups[1])).toEqual(['5K 65A'])
    expect(groups[1].close).toBe(false)
  })

  it('同じ外径・PCD で8穴 → 16K 50A と 20K 50A（厚さでしか区別できない）', () => {
    const groups = identifyFlange(query({ n: 8, D: 155, pcd: pcdFromPitch(45.9, 8) }))
    expect(labels(groups[0])).toEqual(['16K 50A', '20K 50A'])
    expect(groups[0].candidates.map((c) => c.row.t)).toEqual([16, 18])
  })

  it('厚さを入れると、グループの中で厚さの近い順', () => {
    const groups = identifyFlange(query({ n: 8, D: 155, pcd: 120, t: 18 }))
    expect(labels(groups[0])).toEqual(['20K 50A', '16K 50A'])
    expect(groups[0].candidates[0].dT).toBe(0)
  })

  it('10K・16K・20K の 25A は D・PCD・穴が同じ → 1つのグループ', () => {
    const groups = identifyFlange(query({ D: 125, pcd: 90, h: 19 }))
    expect(labels(groups[0])).toEqual(['10K 25A', '16K 25A', '20K 25A'])
    expect(groups[0].score).toBe(0)
  })

  it('外径だけでは決まらないときは、同じ近さのグループを両方出す（外径 95・4穴）', () => {
    const groups = identifyFlange(query({ D: 95 }))
    expect(groups[0].score).toBe(0)
    expect(groups[1].score).toBe(0)
    expect(groups.slice(0, 2).map(labels)).toEqual([['5K 25A'], ['10K 15A', '16K 15A', '20K 15A']])
  })

  it('16K・20K の 90A（8穴・外径 210・PCD 170）は1つのグループで、厚さで見分ける', () => {
    const groups = identifyFlange(query({ n: 8, D: 210, pcd: 170, h: 23 }))
    expect(labels(groups[0])).toEqual(['16K 90A', '20K 90A'])
    expect(groups[0].score).toBe(0)
    expect(groups[0].candidates.map((c) => c.row.t)).toEqual([20, 24])
    const withT = identifyFlange(query({ n: 8, D: 210, pcd: 170, t: 24 }))
    expect(labels(withT[0])).toEqual(['20K 90A', '16K 90A'])
  })

  it('穴数は完全一致だけ（16穴・PCD 430 → 16K・20K の 300A）', () => {
    const groups = identifyFlange(query({ n: 16, pcd: 430 }))
    expect(labels(groups[0])).toEqual(['16K 300A', '20K 300A'])
    expect(groups.every((g) => g.candidates.every((c) => c.row.n === 16))).toBe(true)
  })

  it('外径も PCD も無いときは探さない。該当する穴数が無ければ空', () => {
    expect(identifyFlange(query({ h: 19 }))).toEqual([])
    expect(identifyFlange(query({ n: 6, D: 155 }))).toEqual([])
  })

  it('差が大きいときは close = false', () => {
    const groups = identifyFlange(query({ D: 160, pcd: 127 }))
    expect(groups[0].close).toBe(false)
  })

  it('件数の上限', () => {
    expect(identifyFlange(query({ D: 155 }), 5)).toHaveLength(5)
    expect(identifyFlange(query({ D: 155 }))).toHaveLength(3)
  })
})
