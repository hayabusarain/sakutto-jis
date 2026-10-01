import { describe, expect, it } from 'vitest'
import { FLANGES, PRESSURE_CLASSES } from '../../features/flange-bolt/data'
import { G_ROWS, P_ROWS } from '../../features/o-ring/data'
import { PIPE_SIZES } from '../../features/steel-pipe/data'
import {
  flangeTableRows,
  flangeUnverified,
  oRingGrooveRows,
  oRingGroupRanges,
  pipeTableRows,
} from './tableData'
import { FLANGE_TABLE_PAGES, ORING_TABLE_PAGES, PIPE_TABLE_PAGES, tablePagesOf } from './tablePages'

describe('flangeTableRows', () => {
  it('10K 50A: 六角ボルト 16+16+3+14.8+3×2 = 55.8 → 60、スタッド 76.6 → 80（ツールの初期条件と同じ）', () => {
    const row = flangeTableRows('10K').find((r) => r.size === '50A')!
    expect(row.bolt).toBe(16)
    expect(row.hex.required).toBe(55.8)
    expect(row.hex.length).toBe(60)
    expect(row.stud.required).toBe(76.6)
    expect(row.stud.length).toBe(80)
  })

  it('全圧力・全サイズでボルト長さを計算でき、スタッドの方が長い', () => {
    for (const pressure of PRESSURE_CLASSES) {
      const rows = flangeTableRows(pressure)
      expect(rows.map((r) => r.size)).toEqual(FLANGES[pressure].map((r) => r.size))
      for (const row of rows) {
        expect(row.hex.length).toBeGreaterThan(2 * row.t)
        expect(row.hex.length! % 5).toBe(0)
        expect(row.stud.length).toBeGreaterThan(row.hex.length!)
      }
    }
  })
})

describe('flangeUnverified（docs/data-verification.md の △）', () => {
  it('5K・10K の 90A・175A・225A は行全体', () => {
    expect(flangeUnverified('5K', '90A')).toEqual({ row: true, t: true })
    expect(flangeUnverified('10K', '225A')).toEqual({ row: true, t: true })
    expect(flangeUnverified('10K', '100A')).toEqual({ row: false, t: false })
  })

  it('16K の厚さ・5K 50A の厚さ', () => {
    expect(flangeUnverified('16K', '100A')).toEqual({ row: false, t: true })
    expect(flangeUnverified('5K', '50A')).toEqual({ row: false, t: true })
    expect(flangeUnverified('20K', '50A')).toEqual({ row: false, t: false })
  })
})

describe('pipeTableRows', () => {
  it('SGP は全21サイズ、Sch40・Sch80 は 175A・225A を除く19サイズ', () => {
    expect(pipeTableRows('sgp')).toHaveLength(PIPE_SIZES.length)
    expect(pipeTableRows('sch40').map((r) => r.size.a)).not.toContain('175A')
    expect(pipeTableRows('sch80')).toHaveLength(PIPE_SIZES.length - 2)
  })

  it('SGP 50A: 外径 60.5・厚さ 3.8・内径 52.9・5.31 kg/m', () => {
    const row = pipeTableRows('sgp').find((r) => r.size.a === '50A')!
    expect(row).toMatchObject({ od: 60.5, t: 3.8, id: 52.9, massPerM: 5.31 })
  })
})

describe('Oリング', () => {
  it('全サイズの行がある（P 122・G 46）', () => {
    expect(oRingGrooveRows('P')).toHaveLength(P_ROWS.length)
    expect(oRingGrooveRows('G')).toHaveLength(G_ROWS.length)
  })

  it('P20: 溝 d 20・D 24、平面溝は外圧用の内径 20・内圧用の外径 24', () => {
    const row = oRingGrooveRows('P').find((r) => r.ring.no === 'P20')!
    expect(row.ring.d).toBe(20)
    expect(row.ring.D).toBe(24)
    expect(row.flatExternalInner).toBe(20)
    expect(row.flatInternalOuter).toBe(24)
  })

  it('太さのグループの範囲（P は5つ、G は2つ）が表の並びと一致する', () => {
    const p = oRingGroupRanges('P')
    expect(p.map((g) => `${g.first}〜${g.last}`)).toEqual([
      'P3〜P10',
      'P10A〜P22',
      'P22A〜P50',
      'P48A〜P150',
      'P150A〜P400',
    ])
    expect(p.map((g) => g.group.d2)).toEqual([1.9, 2.4, 3.5, 5.7, 8.4])
    expect(p.reduce((sum, g) => sum + g.count, 0)).toBe(P_ROWS.length)

    const g = oRingGroupRanges('G')
    expect(g.map((r) => `${r.first}〜${r.last}`)).toEqual(['G25〜G145', 'G150〜G300'])
    expect(g.reduce((sum, r) => sum + r.count, 0)).toBe(G_ROWS.length)
  })
})

describe('寸法表ページの定義', () => {
  const all = [...FLANGE_TABLE_PAGES, ...PIPE_TABLE_PAGES, ...ORING_TABLE_PAGES]

  it('9ページ・パスは重複なし・小文字', () => {
    expect(all).toHaveLength(9)
    expect(new Set(all.map((p) => p.path)).size).toBe(9)
    expect(all.map((p) => p.path)).toEqual([
      '/flange-bolt-length/5k',
      '/flange-bolt-length/10k',
      '/flange-bolt-length/16k',
      '/flange-bolt-length/20k',
      '/steel-pipe/sgp',
      '/steel-pipe/sch40',
      '/steel-pipe/sch80',
      '/o-ring/p',
      '/o-ring/g',
    ])
  })

  it('パンくずは ホーム > ツール > 表', () => {
    for (const page of all) {
      expect(page.breadcrumb.map((c) => c.path)).toEqual(['/', page.path.replace(/\/[^/]+$/, ''), page.path])
    }
  })

  it('題名・説明文はページごとに違う', () => {
    expect(new Set(all.map((p) => p.title)).size).toBe(all.length)
    expect(new Set(all.map((p) => p.description)).size).toBe(all.length)
  })

  it('ツールから案内する表', () => {
    expect(tablePagesOf('/flange-bolt-length')).toHaveLength(4)
    expect(tablePagesOf('/tap-drill')).toHaveLength(0)
  })
})
