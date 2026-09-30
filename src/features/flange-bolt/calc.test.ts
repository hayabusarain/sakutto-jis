import { describe, expect, it } from 'vitest'
import { boltLength, findFlange, roundLength, type BoltLengthInput } from './calc'
import { COARSE_PITCH, FLANGES, NUT_HEIGHT, PIPE_OD, PRESSURE_CLASSES, WASHER_THICKNESS } from './data'

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
})
