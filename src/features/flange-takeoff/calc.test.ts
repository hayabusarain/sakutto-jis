import { describe, expect, it } from 'vitest'
import { boltLength, findFlange } from '../flange-bolt/calc'
import { FLANGES, PRESSURE_CLASSES } from '../flange-bolt/data'
import { nutsPerBolt, spareCount, takeoff, type TakeoffConditions, type TakeoffItem } from './calc'
import type { TakeoffRow } from './input'

const base: TakeoffConditions = {
  type: 'hex',
  gasket: 3,
  washers: 0,
  nut: 'style1',
  threads: 3,
  rounding: '5mm',
}

const row = (pressure: TakeoffRow['pressure'], size: string, count: string | number): TakeoffRow => ({
  pressure,
  size,
  count: String(count),
})

/** 10K 50A × 6・10K 80A × 2・20K 100A × 1（解説の例と同じ） */
const EXAMPLE = [row('10K', '50A', 6), row('10K', '80A', 2), row('20K', '100A', 1)]

/** 品目を「種類 呼び 数量」の短い形にする（比べやすいように） */
const brief = (items: readonly TakeoffItem[]) =>
  items.map((item) => {
    switch (item.kind) {
      case 'bolt':
        return `bolt M${item.bolt}×${item.length} ${item.quantity}+${item.spare}`
      case 'nut':
        return `nut M${item.bolt} ${item.quantity}+${item.spare}`
      case 'washer':
        return `washer M${item.bolt} ${item.quantity}+${item.spare}`
      case 'gasket':
        return `gasket ${item.pressure} ${item.size} ${item.quantity}+${item.spare}`
    }
  })

describe('takeoff: ボルトの長さは JISフランジ＆ボルト長さ（boltLength）と同じ', () => {
  const conditionSets: TakeoffConditions[] = [
    base,
    { ...base, type: 'stud' },
    { ...base, nut: 'ja1', washers: 2, threads: 2 },
    { ...base, type: 'stud', gasket: 1.5, washers: 1, threads: 5, rounding: 'jis' },
    { ...base, gasket: 0, threads: 1, rounding: 'jis' },
  ]

  it('全クラス・全呼び径・いくつかの条件で、相手側も同じ厚さとした boltLength と一致する', () => {
    let checked = 0
    for (const conditions of conditionSets) {
      for (const pressure of PRESSURE_CLASSES) {
        const rows = FLANGES[pressure].map((flange) => row(pressure, flange.size, 1))
        const result = takeoff(rows, conditions, 0)
        expect(result.lines).toHaveLength(rows.length)
        for (const line of result.lines) {
          const flange = findFlange(line.pressure, line.size)!
          expect(line.bolt).toEqual(
            boltLength({ ...conditions, bolt: flange.bolt, t1: flange.t, t2: flange.t }),
          )
          checked++
        }
      }
    }
    expect(checked).toBe(conditionSets.length * PRESSURE_CLASSES.reduce((sum, p) => sum + FLANGES[p].length, 0))
  })
})

describe('takeoff: 集計', () => {
  it('例: 同じ M16×60 は行をまたいでまとめ、ガスケットは呼び圧力・呼び径ごと', () => {
    // 10K 50A: t16・M16・4穴 → 16+16+3+14.8+3×2 = 55.8 → 60
    // 10K 80A: t18・M16・8穴 → 18+18+3+14.8+3×2 = 59.8 → 60（50A と同じ M16×60）
    // 20K 100A: t24・M20・8穴 → 24+24+3+18+3×2.5 = 76.5 → 80
    const result = takeoff(EXAMPLE, base, 0)
    expect(result.lines.map((line) => line.bolt.length)).toEqual([60, 60, 80])
    expect(brief(result.items)).toEqual([
      'bolt M16×60 40+0',
      'bolt M20×80 8+0',
      'nut M16 40+0',
      'nut M20 8+0',
      'gasket 10K 50A 6+0',
      'gasket 10K 80A 2+0',
      'gasket 20K 100A 1+0',
    ])
    expect(result.joints).toBe(9)
    expect(result.totals.bolt).toEqual({ quantity: 48, spare: 0, total: 48 })
    expect(result.totals.nut.total).toBe(48)
    expect(result.totals.washer.total).toBe(0)
    expect(result.totals.gasket.total).toBe(9)
    expect(result.pressures).toEqual(['10K', '20K'])
    expect(result.boltSizes).toEqual([16, 20])
    expect(result.skipped).toEqual([])
  })

  it('行ごとの数: か所数 × 1か所あたり（ボルト = 穴数）', () => {
    const [k50, k80, k100] = takeoff(EXAMPLE, base, 0).lines
    expect(k50.perJoint).toEqual({ bolts: 4, nuts: 4, washers: 0, gaskets: 1 })
    expect([k50.bolts, k50.nuts, k50.gaskets]).toEqual([24, 24, 6])
    expect([k80.bolts, k80.nuts, k80.gaskets]).toEqual([16, 16, 2])
    expect([k100.bolts, k100.nuts, k100.gaskets]).toEqual([8, 8, 1])
  })

  it('スタッドボルトはナットが1本に2個。長さが変わって別の品目になることもある', () => {
    // 10K 50A: 16+16+3+2×14.8+2×6 = 76.6 → 80、10K 80A: 18+18+3+2×14.8+2×6 = 80.6 → 85
    // 20K 100A: 24+24+3+2×18+2×7.5 = 102 → 105
    const result = takeoff(EXAMPLE, { ...base, type: 'stud' }, 0)
    expect(nutsPerBolt({ type: 'stud' })).toBe(2)
    expect(nutsPerBolt({ type: 'hex' })).toBe(1)
    expect(brief(result.items)).toEqual([
      'bolt M16×80 24+0',
      'bolt M16×85 16+0',
      'bolt M20×105 8+0',
      'nut M16 80+0',
      'nut M20 16+0',
      'gasket 10K 50A 6+0',
      'gasket 10K 80A 2+0',
      'gasket 20K 100A 1+0',
    ])
    expect(result.totals.nut.total).toBe(2 * result.totals.bolt.total)
    expect(result.lines[0].perJoint.nuts).toBe(8)
  })

  it('平座金はボルトの本数 × 枚数（片側 1・両側 2）。なしなら品目に出ない', () => {
    const one = takeoff(EXAMPLE, { ...base, washers: 1 }, 0)
    const two = takeoff(EXAMPLE, { ...base, washers: 2 }, 0)
    expect(brief(one.items.filter((i) => i.kind === 'washer'))).toEqual(['washer M16 40+0', 'washer M20 8+0'])
    expect(brief(two.items.filter((i) => i.kind === 'washer'))).toEqual(['washer M16 80+0', 'washer M20 16+0'])
    expect(two.totals.washer.total).toBe(2 * two.totals.bolt.total)
    expect(takeoff(EXAMPLE, base, 0).items.some((i) => i.kind === 'washer')).toBe(false)
  })

  it('同じ継手を2行に分けて入れても、1行にまとめたときと同じ数になる', () => {
    const split = takeoff([row('10K', '50A', 2), row('10K', '50A', 4)], base, 0)
    const single = takeoff([row('10K', '50A', 6)], base, 0)
    expect(split.items).toEqual(single.items)
    expect(split.joints).toBe(6)
  })

  it('ボルトが同じでもガスケットは呼び圧力ごと（16K 50A と 20K 50A）', () => {
    // 16K 50A: t16 → 55.8 → 60、20K 50A: t18 → 59.8 → 60（どちらも M16・8穴）
    const result = takeoff([row('20K', '50A', 1), row('16K', '50A', 1)], base, 0)
    expect(brief(result.items)).toEqual([
      'bolt M16×60 16+0',
      'nut M16 16+0',
      'gasket 16K 50A 1+0',
      'gasket 20K 50A 1+0',
    ])
  })

  it('並び順: ボルトは呼び径 → 長さの順、ガスケットは呼び圧力 → 呼び径の順', () => {
    const result = takeoff(
      [row('20K', '300A', 1), row('5K', '10A', 1), row('10K', '300A', 1), row('5K', '100A', 1), row('10K', '25A', 1)],
      base,
      0,
    )
    // 5K 10A: 9+9+3+8.4+3×1.5 = 33.9 → 35、10K 25A: 14+14+3+14.8+6 = 51.8 → 55、5K 100A: 55.8 → 60
    // 10K 300A: 24+24+3+19.4+3×2.5 = 77.9 → 80、20K 300A: 36+36+3+21.5+3×3 = 105.5 → 110
    expect(brief(result.items)).toEqual([
      'bolt M10×35 4+0',
      'bolt M16×55 4+0',
      'bolt M16×60 8+0',
      'bolt M22×80 16+0',
      'bolt M24×110 16+0',
      'nut M10 4+0',
      'nut M16 12+0',
      'nut M22 16+0',
      'nut M24 16+0',
      'gasket 5K 10A 1+0',
      'gasket 5K 100A 1+0',
      'gasket 10K 25A 1+0',
      'gasket 10K 300A 1+0',
      'gasket 20K 300A 1+0',
    ])
  })

  it('か所数が正しくない行（空欄・0・1000）は集計に入れず、skipped に入る', () => {
    const result = takeoff(
      [row('10K', '50A', ''), row('10K', '80A', 2), row('10K', '100A', 0), row('10K', '150A', 1000)],
      base,
      0,
    )
    expect(result.skipped).toEqual([0, 2, 3])
    expect(result.lines.map((line) => line.joints)).toEqual([null, 2, null, null])
    expect(result.lines[0].bolts).toBe(0)
    expect(result.joints).toBe(2)
    expect(brief(result.items)).toEqual(['bolt M16×60 16+0', 'nut M16 16+0', 'gasket 10K 80A 2+0'])
    // 典拠の表・ボルトの呼びは、集計しない行も含めた一覧から（一覧の行のボタンにも長さを出すため）
    expect(result.boltSizes).toEqual([16, 20])
  })

  it('999か所まで数える', () => {
    const result = takeoff([row('10K', '300A', 999)], base, 0)
    expect(result.totals.bolt.total).toBe(16 * 999)
  })

  it('一覧が空なら品目なし・合計 0', () => {
    const result = takeoff([], base, 0)
    expect(result.items).toEqual([])
    expect(result.joints).toBe(0)
    expect(result.totals.bolt).toEqual({ quantity: 0, spare: 0, total: 0 })
    expect(result.pressures).toEqual([])
    expect(result.boltSizes).toEqual([])
  })
})

describe('予備', () => {
  it('必要数 × 割合 ÷ 100 を切り上げる（整数で計算）', () => {
    expect(spareCount(32, 5)).toBe(2) // 1.6 → 2
    expect(spareCount(20, 5)).toBe(1) // ちょうど 1
    expect(spareCount(21, 5)).toBe(2) // 1.05 → 2
    expect(spareCount(1, 5)).toBe(1) // 0.05 → 1
    expect(spareCount(100, 5)).toBe(5)
    expect(spareCount(101, 5)).toBe(6)
    expect(spareCount(40, 10)).toBe(4)
    expect(spareCount(41, 10)).toBe(5)
    expect(spareCount(7, 0)).toBe(0)
    expect(spareCount(0, 10)).toBe(0)
  })

  it('割合ちょうどの数は切り上げない（浮動小数の誤差で 1 増えない）', () => {
    for (let quantity = 0; quantity <= 2000; quantity++) {
      for (const percent of [5, 10]) {
        const exact = (quantity * percent) / 100
        expect(spareCount(quantity, percent), `${quantity} × ${percent}%`).toBe(
          Number.isInteger(exact) ? exact : Math.floor(exact) + 1,
        )
      }
    }
  })

  it('品目ごとに切り上げて足す（行ごとではない）', () => {
    const result = takeoff(EXAMPLE, base, 5)
    expect(brief(result.items)).toEqual([
      'bolt M16×60 40+2',
      'bolt M20×80 8+1',
      'nut M16 40+2',
      'nut M20 8+1',
      'gasket 10K 50A 6+1',
      'gasket 10K 80A 2+1',
      'gasket 20K 100A 1+1',
    ])
    expect(result.items.every((item) => item.total === item.quantity + item.spare)).toBe(true)
    expect(result.totals.bolt).toEqual({ quantity: 48, spare: 3, total: 51 })
    expect(result.totals.gasket).toEqual({ quantity: 9, spare: 3, total: 12 })
    // 10%: M16×60 40 → 4、M20×80 8 → 0.8 → 1
    expect(brief(takeoff(EXAMPLE, base, 10).items).slice(0, 2)).toEqual(['bolt M16×60 40+4', 'bolt M20×80 8+1'])
    // 行の数（内訳）は予備を含まない
    expect(result.lines[0].bolts).toBe(24)
  })
})
