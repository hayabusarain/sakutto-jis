import { describe, expect, it } from 'vitest'
import { findFlange } from './calc'
import {
  boltHolePositions,
  drawingHoles,
  drawingNotes,
  dxfFilename,
  flangeDxf,
  tapDrillFor,
  THREAD_ARC,
} from './drawing'

/** DXF のグループコードと値の組（エンティティごと）に分ける */
function entities(dxf: string): { type: string; codes: Map<number, string[]> }[] {
  const lines = dxf.split('\r\n')
  const start = lines.indexOf('ENTITIES')
  const list: { type: string; codes: Map<number, string[]> }[] = []
  for (let i = start + 1; i + 1 < lines.length; i += 2) {
    const code = Number(lines[i])
    const value = lines[i + 1]
    if (code === 0) {
      if (value === 'ENDSEC') break
      list.push({ type: value, codes: new Map() })
    } else {
      const current = list.at(-1)!
      current.codes.set(code, [...(current.codes.get(code) ?? []), value])
    }
  }
  return list
}

const count = (dxf: string, type: string) => entities(dxf).filter((e) => e.type === type).length

describe('boltHolePositions', () => {
  it('PCD 上に等間隔で、中心線をまたぐ', () => {
    const row = findFlange('10K', '50A')!
    const holes = boltHolePositions(row)
    expect(holes).toHaveLength(4)
    for (const hole of holes) {
      expect(Math.hypot(hole.x, hole.y)).toBeCloseTo(60, 6)
      expect(Math.abs(hole.x)).toBeGreaterThan(1)
      expect(Math.abs(hole.y)).toBeGreaterThan(1)
    }
  })
})

describe('tapDrillFor', () => {
  it('フランジに使う並目ねじの下穴（ISO 2306・6H の範囲内）', () => {
    expect(tapDrillFor(10)).toBe(8.5)
    expect(tapDrillFor(12)).toBe(10.2)
    expect(tapDrillFor(16)).toBe(14)
    expect(tapDrillFor(20)).toBe(17.5)
    expect(tapDrillFor(22)).toBe(19.5)
    expect(tapDrillFor(24)).toBe(21)
    expect(tapDrillFor(7)).toBeNull()
  })
})

describe('flangeDxf', () => {
  const row = findFlange('10K', '100A')!

  it('フランジ本体: 円は 外形 + 内径 + 穴 + PCD、線は中心線2本 + 穴ごとの中心マーク2本', () => {
    const dxf = flangeDxf('10K', row, { kind: 'flange', bore: 114.3, boreIsPipeOd: true })
    expect(dxf.startsWith('  0\r\nSECTION')).toBe(true)
    expect(dxf.trimEnd().endsWith('EOF')).toBe(true)
    expect(count(dxf, 'CIRCLE')).toBe(1 + 1 + row.n + 1)
    expect(count(dxf, 'LINE')).toBe(2 + row.n * 2)
    expect(count(dxf, 'ARC')).toBe(0)
    expect(dxf).toContain('JIS B 2220 10K 100A')
    expect(dxf).toContain('8-%%c19')
    expect(dxf).toContain('PCD %%c175')
    expect(dxf).toContain('PIPE OD %%c114.3 (REF)')
    expect(dxf).not.toContain('ID114.3')
  })

  it('内径を入力したときは BORE、0 なら内径の円と注記なし', () => {
    const withBore = flangeDxf('10K', row, { kind: 'flange', bore: 116, boreIsPipeOd: false })
    expect(withBore).toContain('BORE %%c116')
    const blind = flangeDxf('10K', row, { kind: 'flange', bore: 0, boreIsPipeOd: false })
    expect(count(blind, 'CIRCLE')).toBe(1 + row.n + 1)
    expect(blind).not.toContain('BORE')
  })

  it('中心マークは穴の中心を通り、穴の外へ 3 mm 出る', () => {
    const dxf = flangeDxf('10K', row, { kind: 'flange', bore: 0, boreIsPipeOd: false })
    const [hole] = boltHolePositions(row)
    const lines = entities(dxf).filter((e) => e.type === 'LINE')
    const horizontal = lines.find(
      (e) =>
        Math.abs(Number(e.codes.get(20)![0]) - hole.y) < 1e-6 &&
        Math.abs(Number(e.codes.get(21)![0]) - hole.y) < 1e-6,
    )!
    expect(horizontal.codes.get(8)).toEqual(['CENTER'])
    const x1 = Number(horizontal.codes.get(10)![0])
    const x2 = Number(horizontal.codes.get(11)![0])
    expect((x1 + x2) / 2).toBeCloseTo(hole.x, 6)
    expect(x2 - x1).toBeCloseTo(row.h + 6, 6)
  })

  it('相手側・通し穴: 穴は φh のまま、注記は MATING PLATE と THRU', () => {
    const dxf = flangeDxf('10K', row, { kind: 'through', bore: 0, boreIsPipeOd: false })
    const holes = entities(dxf).filter((e) => e.type === 'CIRCLE' && e.codes.get(40)![0] === '9.5')
    expect(holes).toHaveLength(row.n)
    expect(dxf).toContain('MATING PLATE FOR JIS B 2220 10K 100A')
    expect(dxf).toContain('8-%%c19 THRU')
  })

  it('相手側・タップ: 下穴の円と、ねじの谷の径の 3/4 円弧（THREAD レイヤー）', () => {
    const dxf = flangeDxf('10K', row, { kind: 'tap', bore: 0, boreIsPipeOd: false })
    const all = entities(dxf)
    const arcs = all.filter((e) => e.type === 'ARC')
    expect(arcs).toHaveLength(row.n)
    for (const arc of arcs) {
      expect(arc.codes.get(8)).toEqual(['THREAD'])
      expect(arc.codes.get(40)).toEqual(['8'])
      expect(arc.codes.get(50)).toEqual([String(THREAD_ARC.start)])
      expect(arc.codes.get(51)).toEqual([String(THREAD_ARC.end)])
    }
    const drills = all.filter((e) => e.type === 'CIRCLE' && e.codes.get(40)![0] === '7')
    expect(drills).toHaveLength(row.n)
    expect(dxf).toContain('8-M16 (TAP DRILL %%c14)')
    // THREAD レイヤーが LAYER 表にある
    expect(dxf).toMatch(/LAYER\r\n {2}2\r\nTHREAD/)
  })

  it('注記は ASCII だけ（R12 で文字化けしない）', () => {
    for (const kind of ['flange', 'through', 'tap'] as const) {
      for (const note of drawingNotes('20K', findFlange('20K', '300A')!, { kind, bore: 318.5, boreIsPipeOd: true })) {
        expect(note).toMatch(/^[\x20-\x7e]+$/)
      }
    }
  })
})

describe('drawingHoles', () => {
  it('タップは下穴の半径・谷の径の半径、中心マークは谷の径から 3 mm', () => {
    const row = findFlange('20K', '250A')!
    const [hole] = drawingHoles(row, 'tap')
    expect(hole.r).toBe(10.5)
    expect(hole.threadR).toBe(12)
    expect(hole.markHalf).toBe(15)
    const [plain] = drawingHoles(row, 'flange')
    expect(plain.r).toBe(13.5)
    expect(plain.threadR).toBeNull()
  })
})

describe('dxfFilename', () => {
  it('種類ごとに名前を分ける', () => {
    expect(dxfFilename('10K', '50A', 'flange')).toBe('flange_JIS10K_50A.dxf')
    expect(dxfFilename('10K', '50A', 'through')).toBe('flange_JIS10K_50A_mating_thru.dxf')
    expect(dxfFilename('10K', '50A', 'tap')).toBe('flange_JIS10K_50A_mating_tap.dxf')
  })
})
