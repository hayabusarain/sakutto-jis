/**
 * クイック検索の ※（規格原文で未確認の値）の仕組みのテスト。
 * いまはフランジ・ボルトとも未確認の値が無い（UNVERIFIED が空）ので、仮の一覧に差し替えて確かめる。
 * 今後未確認の値を載せたときに、各ツールと同じく ※ と凡例が出ること。
 */
import { describe, expect, it, vi } from 'vitest'
import type { UnverifiedEntry } from '../features/bolt-size/data'

vi.mock('../features/flange-bolt/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/flange-bolt/data')>()
  // 仮の未確認: 16K 50A の厚さ t と、5K 90A の行すべて
  return { ...actual, UNVERIFIED: { '16K': { t: ['50A'] }, '5K': { rows: ['90A'] } } }
})

vi.mock('../features/bolt-size/data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../features/bolt-size/data')>()
  const UNVERIFIED: readonly UnverifiedEntry[] = [
    { field: 'sJa', sizes: [3], note: 'M3 の旧JIS の二面幅（試験用）' },
    { field: 'spotFace', sizes: 'all', note: "ざぐり径 D'（試験用）" },
  ]
  return {
    ...actual,
    UNVERIFIED,
    isUnverified: (field: UnverifiedEntry['field'], d: number) => actual.listsUnverified(UNVERIFIED, field, d),
  }
})

const { quickSearch } = await import('./quickSearch')
const { UNVERIFIED_LEGEND } = await import('../features/flange-bolt/data')

function card(query: string) {
  const result = quickSearch(query)
  expect(result.status).toBe('found')
  return result.cards[0]
}

function section(query: string, title: string) {
  const found = card(query).sections.find((s) => s.title.startsWith(title))
  expect(found, `${query} に「${title}」の欄がない`).toBeDefined()
  return found!
}

describe('quickSearch: 未確認の値の ※（仮の一覧で）', () => {
  it('厚さ t だけが未確認なら、t と t から計算したボルト長さに ※。外径などには付けない', () => {
    const dims = section('16K 50A', 'フランジ寸法')
    expect(dims.rows.find((r) => r.label === '厚さ t')?.unverified).toBe(true)
    expect(dims.rows.find((r) => r.label === '外径 D')?.unverified).toBe(false)
    expect(dims.legend).toBe(`${UNVERIFIED_LEGEND}（16K 50A のフランジ厚さ t）`)
    const lengths = section('16K 50A', 'ボルト長さ')
    expect(lengths.rows.every((r) => r.unverified)).toBe(true)
    expect(lengths.legend).toContain('長さも確認してください')
  })

  it('行すべてが未確認なら全部の値に ※。管のカード・M16 のカードの表にも出す', () => {
    const dims = section('5K 90A', 'フランジ寸法')
    expect(dims.rows.every((r) => r.unverified)).toBe(true)
    expect(dims.legend).toBe(`${UNVERIFIED_LEGEND}（5K 90A は寸法すべて）`)
    const pipe = section('90A', 'フランジ')
    expect(pipe.table?.rows.map((r) => [r.cells[0], r.unverified?.some(Boolean)])).toEqual([
      ['5K', true],
      ['10K', false],
      ['16K', false],
      ['20K', false],
    ])
    expect(pipe.legend).toBe(`${UNVERIFIED_LEGEND}（5K の 90A は寸法すべて）`)
    const bolts = section('M16', 'M16 のボルトを使うフランジ')
    expect(bolts.table?.rows.map((r) => r.unverified?.[1])).toEqual([true, false, false, false])
    expect(bolts.legend).toBe(`${UNVERIFIED_LEGEND}を含む（5K 90A は寸法すべて）`)
  })

  it('ボルト: 旧JIS の二面幅が未確認なら「とも同じ」と言い切らず ※ を付け、凡例に何が未確認かを書く', () => {
    const s = section('M3', 'ボルト・ナット')
    const flats = s.rows.find((r) => r.label.startsWith('二面幅'))!
    expect(flats.note).toBe('旧JIS（附属書JA）は 5.5※ mm（規格原文で未確認）')
    expect(s.rows.find((r) => r.label.startsWith('ざぐり径'))?.unverified).toBe(true)
    expect(s.legend).toBe("※ 規格原文で未確認の値：M3 の旧JIS の二面幅（試験用）、ざぐり径 D'（試験用）")
    const table = section('二面幅5.5', '六角ボルト・ナット')
    expect(table.table?.rows[0].unverified).toEqual([false, true, false])
  })
})
