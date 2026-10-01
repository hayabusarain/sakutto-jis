import { describe, expect, it } from 'vitest'
import { BOLT_SIZES } from '../../features/bolt-size/data'
import { SCREW_INDEX_META, SCREW_PAGES, screwPath } from './screwPages'
import { flangesUsingBolt, screwSummary, stressArea, SUMMARY_SIZES } from './screwSummary'
import { roundSignificant } from '../../features/steel-pipe/calc'

describe('stressArea（JIS B 1082 の有効断面積）', () => {
  // ISO 898-1・JIS B 1051 の表に載っている並目ねじの有効断面積（有効数字3桁）
  const known: [number, number, number][] = [
    [3, 0.5, 5.03],
    [4, 0.7, 8.78],
    [5, 0.8, 14.2],
    [6, 1, 20.1],
    [8, 1.25, 36.6],
    [10, 1.5, 58],
    [12, 1.75, 84.3],
    [14, 2, 115],
    [16, 2, 157],
    [20, 2.5, 245],
    [24, 3, 353],
    [30, 3.5, 561],
    [36, 4, 817],
  ]
  for (const [d, p, area] of known) {
    it(`M${d}×${p} → ${area} mm²`, () => {
      expect(roundSignificant(stressArea(d, p), 3)).toBe(area)
    })
  }

  it('(d2 + d3) / 2 = d − 0.938194P', () => {
    expect(Math.sqrt((stressArea(12, 1.75) * 4) / Math.PI)).toBeCloseTo(12 - 0.938194 * 1.75, 5)
  })
})

describe('screwSummary', () => {
  it('M12: 並目 1.75 の推奨下穴 10.2（ISO 2306）・6H の範囲 10.106〜10.441', () => {
    const summary = screwSummary(12)!
    expect(summary.coarse.p).toBe(1.75)
    expect(summary.coarse.kind).toBe('並目')
    expect(summary.coarse.recommended).toEqual({ hole: 10.2, basis: 'iso2306' })
    expect(summary.coarse.limits).toEqual({ min: 10.106, max: 10.441 })
    expect(summary.stressArea).toBe(84.3)
    expect(summary.pitches.map((row) => row.p)).toEqual([1.75, 1.5, 1.25, 1])
    expect(summary.pitches.slice(1).every((row) => row.kind === '細目')).toBe(true)
    expect(summary.bolt.sIso).toBe(18)
    expect(summary.prev).toBe(10)
    expect(summary.next).toBe(14)
  })

  it('細目の推奨下穴（M10×1.25 → 8.8）', () => {
    const row = screwSummary(10)!.pitches.find((r) => r.p === 1.25)!
    expect(row.recommended?.hole).toBe(8.8)
    expect(row.recommended?.basis).toBe('rule')
  })

  it('M14×1.25 の注記（点火プラグ用）を引き継ぐ', () => {
    const row = screwSummary(14)!.pitches.find((r) => r.p === 1.25)!
    expect(row.note).toBe('内燃機関用点火プラグ専用')
  })

  it('全サイズでまとめを作れて、推奨下穴が6Hの範囲に入る', () => {
    expect(SUMMARY_SIZES).toEqual(BOLT_SIZES.map((size) => size.d))
    for (const d of SUMMARY_SIZES) {
      const summary = screwSummary(d)!
      expect(summary).not.toBeNull()
      const { recommended, limits } = summary.coarse
      expect(recommended).not.toBeNull()
      expect(recommended!.hole).toBeGreaterThanOrEqual(limits!.min - 1e-9)
      expect(recommended!.hole).toBeLessThanOrEqual(limits!.max + 1e-9)
    }
    expect(screwSummary(3)!.prev).toBeNull()
    expect(screwSummary(36)!.next).toBeNull()
  })

  it('一覧に無いサイズは null', () => {
    expect(screwSummary(7)).toBeNull()
    expect(screwSummary(13)).toBeNull()
  })
})

describe('flangesUsingBolt', () => {
  it('M16 を使うフランジ（10K は 25A〜100A）', () => {
    const uses = flangesUsingBolt(16)
    expect(uses.map((use) => use.pressure)).toEqual(['5K', '10K', '16K', '20K'])
    const tenK = uses.find((use) => use.pressure === '10K')!
    expect(tenK.sizes.map((row) => row.size)).toEqual(['25A', '32A', '40A', '50A', '65A', '80A', '90A', '100A'])
    expect(tenK.sizes.find((row) => row.size === '50A')?.n).toBe(4)
  })

  it('フランジに使われないサイズは空', () => {
    expect(flangesUsingBolt(8)).toEqual([])
    expect(flangesUsingBolt(36)).toEqual([])
  })
})

describe('ページの定義', () => {
  it('M3〜M36 の16ページ、パスは /screw/m12 の形', () => {
    expect(SCREW_PAGES).toHaveLength(16)
    expect(screwPath(12)).toBe('/screw/m12')
    expect(SCREW_PAGES.map((page) => page.path)).toContain('/screw/m36')
    expect(SCREW_PAGES.every((page) => page.breadcrumb[1].path === SCREW_INDEX_META.path)).toBe(true)
  })

  it('説明文にそのサイズの数値が入る（ページごとに違う）', () => {
    const m12 = SCREW_PAGES.find((page) => page.d === 12)!
    expect(m12.description).toContain('下穴径 10.2 mm')
    expect(m12.description).toContain('二面幅 18 mm（旧JIS 19 mm）')
    expect(m12.description).toContain('六角レンチ 10 mm')
    expect(m12.description).toContain('ボルト穴径 13.5 mm（2級）')
    expect(new Set(SCREW_PAGES.map((page) => page.description)).size).toBe(SCREW_PAGES.length)
  })
})
