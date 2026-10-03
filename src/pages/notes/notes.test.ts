import { describe, expect, it } from 'vitest'
import { render } from '../../entry-server'
import { STANDARD_BOLT_LENGTHS } from '../../features/flange-bolt/data'
import { DEFAULT_INPUT as FLANGE_DEFAULT_INPUT, isFlangeInput, normalizeFlangeInput } from '../../features/flange-bolt/input'
import { formatHole, judgeHole } from '../../features/tap-drill/calc'
import { fromQuery } from '../../lib/query'
import { findPage } from '../../routes'
import {
  BASE_FACE_HEIGHT,
  BASE_THICKNESS_TOLERANCE,
  FLANGE_EFFECTS,
  FLANGE_EX_BASE,
  FLANGE_EX_JA,
  FLANGE_EX_ROUND_5MM,
  FLANGE_EX_ROUND_JIS,
  FLATS_DIFFER,
  FLATS_DIFFER_IN_FLANGES,
  FLATS_SAME_COUNT,
  flatsIdentifyUniquely,
  ISO_ONLY_FLATS,
  JA_ONLY_FLATS,
  JIS_LENGTH_BEFORE_EX3,
  M12,
  M12_CANDIDATES,
  M12_LIMITS,
  M12_S100,
  m12Engagement,
  SERIES_ROWS,
  tapDrillHref,
} from './examples'
import { NOTE_PAGES, NOTES_INDEX_META, notesForTool, noteUpdatedAt } from './notePages'

describe('フランジボルトの長さの記事（計算例）', () => {
  it('例1: 10K 50A・既定の条件 = 16 + 16 + 3 + 14.8 + 3 × 2 = 55.8 → 60', () => {
    const { row, result } = FLANGE_EX_BASE
    expect([row.size, row.bolt, row.t]).toEqual(['50A', 16, 16])
    expect(result.nutHeight).toBe(14.8)
    expect(result.pitch).toBe(2)
    expect(result.required).toBe(55.8)
    expect(result.length).toBe(60)
    expect(FLANGE_EX_BASE.href).toBe('/flange-bolt-length?pressure=10K&size=50A')
  })

  it('例2: 旧JIS 1種のナット・ガスケット 1.5 = 16 + 16 + 1.5 + 13 + 3 × 2 = 52.5 → 55（例1 より 5 mm 短い）', () => {
    const { result, conditions } = FLANGE_EX_JA
    expect(conditions.nut).toBe('ja1')
    expect(result.nutHeight).toBe(13)
    expect(result.required).toBe(52.5)
    expect(result.length).toBe(55)
    expect((FLANGE_EX_BASE.result.length ?? 0) - (result.length ?? 0)).toBe(5)
  })

  it('例3: 10K 150A（M20・t 22）= 22 + 22 + 3 + 18 + 3 × 2.5 = 72.5 → 5mm刻み 75・JIS の系列 80（75 は系列に無い）', () => {
    expect(FLANGE_EX_ROUND_5MM.row.bolt).toBe(20)
    expect(FLANGE_EX_ROUND_5MM.row.t).toBe(22)
    expect(FLANGE_EX_ROUND_5MM.result.required).toBe(72.5)
    expect(FLANGE_EX_ROUND_5MM.result.length).toBe(75)
    expect(FLANGE_EX_ROUND_JIS.result.length).toBe(80)
    expect(STANDARD_BOLT_LENGTHS).not.toContain(75)
    expect(JIS_LENGTH_BEFORE_EX3).toBe(70)
  })

  it('条件を1つ変えたときの変化（10K 50A・M16）', () => {
    expect(FLANGE_EFFECTS.thinGasket.delta).toBe(-1.5)
    expect(FLANGE_EFFECTS.nutJa).toEqual({ style1: 14.8, ja1: 13, delta: -1.8 })
    expect(FLANGE_EFFECTS.washer).toEqual({ thickness: 3, one: 3, two: 6 })
    expect(FLANGE_EFFECTS.thread).toEqual({ pitch: 2, delta: 2 })
    // 50A の座の高さ f は 2 mm（JIS B 2220 表13）。2枚分で 4 mm
    expect(BASE_FACE_HEIGHT).toBe(2)
    expect(FLANGE_EFFECTS.withoutFace).toBe(-4)
    // t − f = 14 mm は 20 mm 以下なので +1.5（表22）。2枚分で 3 mm
    expect(BASE_THICKNESS_TOLERANCE).toBe(1.5)
    expect(FLANGE_EFFECTS.thickest).toBe(3)
  })

  it('本文の「70 mm までは 5 mm、80〜160 mm は 10 mm、それより長いと 20 mm 刻み」が JIS B 1180 の系列と合う', () => {
    for (let i = 1; i < STANDARD_BOLT_LENGTHS.length; i++) {
      const length = STANDARD_BOLT_LENGTHS[i]
      const step = length - STANDARD_BOLT_LENGTHS[i - 1]
      const expected = length <= 70 ? 5 : length <= 160 ? 10 : 20
      // 系列の最初（16 → 20）は 4 mm
      if (i > 1) expect(step, `${length}`).toBe(expected)
    }
    expect(STANDARD_BOLT_LENGTHS.indexOf(80) - STANDARD_BOLT_LENGTHS.indexOf(70)).toBe(1)
  })

  it('計算例のリンクは、開くと同じ条件になる', () => {
    for (const example of [FLANGE_EX_BASE, FLANGE_EX_JA, FLANGE_EX_ROUND_JIS]) {
      const parsed = fromQuery(example.href.split('?')[1], FLANGE_DEFAULT_INPUT)!
      const input = normalizeFlangeInput(parsed.state, parsed.keys)
      expect(isFlangeInput(input), example.href).toBe(true)
      expect(input.size).toBe(example.row.size)
      expect(input.nut).toBe(example.conditions.nut)
      expect(Number(input.gasket)).toBe(example.conditions.gasket)
      expect(input.rounding).toBe(example.conditions.rounding)
    }
  })
})

describe('M12 の下穴の記事', () => {
  it('JIS B 1004 の系列: 95 % → 10.2、90 % → 10.3、100 % → 10.1', () => {
    expect([M12.d, M12.p]).toEqual([12, 1.75])
    expect(M12.s95).toBe(10.2)
    expect(M12.s90).toBe(10.3)
    expect(M12_S100).toBe(10.1)
    expect(M12.recommended).toEqual({ hole: 10.2, basis: 'iso2306' })
  })

  it('6H の範囲 10.106〜10.441、5H の最大 10.371、7H の最大 10.531。10.2・10.3 はどれにも入る', () => {
    expect(M12.limits6H).toEqual({ min: 10.106, max: 10.441 })
    expect(M12_LIMITS[5].max).toBe(10.371)
    expect(M12_LIMITS[7].max).toBe(10.531)
    for (const grade of [5, 6, 7] as const) {
      expect(judgeHole(M12.s95, M12_LIMITS[grade])).toBe('ok')
      expect(judgeHole(M12.s90, M12_LIMITS[grade])).toBe('ok')
    }
    expect(judgeHole(M12_S100, M12.limits6H)).toBe('small')
  })

  it('ひっかかり率 10.2 → 95.0 %、10.3 → 89.7 %', () => {
    expect(m12Engagement(10.2).toFixed(1)).toBe('95.0')
    expect(m12Engagement(10.3).toFixed(1)).toBe('89.7')
  })

  it('表の行は 10.1〜10.6。10.4 は 6H に入り 5H では大きすぎ、10.5 は 7H だけ', () => {
    expect(M12_CANDIDATES.map((row) => formatHole(row.hole))).toEqual(['10.1', '10.2', '10.3', '10.4', '10.5', '10.6'])
    const fits = (hole: number) => M12_CANDIDATES.find((row) => Math.abs(row.hole - hole) < 1e-9)!.fits
    expect(fits(10.4)).toMatchObject({ 5: 'large', 6: 'ok', 7: 'ok' })
    expect(fits(10.5)).toMatchObject({ 5: 'large', 6: 'large', 7: 'ok' })
    expect(fits(10.1)).toMatchObject({ 5: 'small', 6: 'small', 7: 'small' })
  })

  it('M6〜M16 の系列（JIS B 1004 の式）は 6H の範囲に入る', () => {
    expect(SERIES_ROWS.map((row) => [row.d, row.s95, row.s90, row.recommended.hole])).toEqual([
      [6, 4.97, 5.03, 5],
      [8, 6.71, 6.78, 6.8],
      [10, 8.46, 8.54, 8.5],
      [12, 10.2, 10.3, 10.2],
      [16, 13.9, 14.1, 14],
    ])
    for (const row of SERIES_ROWS) {
      expect(judgeHole(row.s95, row.limits6H), `M${row.d}`).toBe('ok')
      expect(judgeHole(row.s90, row.limits6H), `M${row.d}`).toBe('ok')
    }
    // 本文: M10 の推奨 8.5 は 95 % と 90 % の間で、ひっかかり率 92.4 %
    const m10 = SERIES_ROWS.find((row) => row.d === 10)!
    expect(m10.recommended.hole).toBeGreaterThan(m10.s95)
    expect(m10.recommended.hole).toBeLessThan(m10.s90)
    expect(m10.recommendedEngagement.toFixed(1)).toBe('92.4')
  })

  it('ツールへのリンクにドリル径を入れる', () => {
    expect(tapDrillHref(12, 1.75, 10.3)).toBe('/tap-drill?d=12&p=1.75&drill=10.3')
  })
})

describe('二面幅の記事', () => {
  it('違うのは M10・M12・M14・M22 の4サイズ、ほかの12サイズは同じ', () => {
    expect(FLATS_DIFFER.map((size) => [size.d, size.sIso, size.sJa])).toEqual([
      [10, 16, 17],
      [12, 18, 19],
      [14, 21, 22],
      [22, 34, 32],
    ])
    expect(FLATS_SAME_COUNT).toBe(12)
  })

  it('16・18・21・34 は本体、17・19・22・32 は旧JIS で、二面幅だけでサイズが決まる', () => {
    expect(ISO_ONLY_FLATS).toEqual([16, 18, 21, 34])
    expect(JA_ONLY_FLATS).toEqual([17, 19, 22, 32])
    for (const s of [...ISO_ONLY_FLATS, ...JA_ONLY_FLATS]) expect(flatsIdentifyUniquely(s), `${s}`).toBe(true)
  })

  it('フランジに使うのは M10・M12・M22', () => {
    expect(FLATS_DIFFER_IN_FLANGES.map((entry) => entry.size.d)).toEqual([10, 12, 22])
  })
})

/** 描画した HTML（React が文字の間に入れる <!-- --> を除く） */
const htmlOf = (path: string) => render(path).html.replace(/<!-- -->/g, '')

describe('現場メモのページ', () => {
  it('一覧と3つの記事が登録され、更新日は sitemap と同じ', () => {
    for (const meta of [NOTES_INDEX_META, ...NOTE_PAGES]) {
      const page = findPage(meta.path)
      expect(page?.component, meta.path).toBeDefined()
      expect(page?.kind).toBe('page')
      expect(page?.updatedAt).toBe(noteUpdatedAt(meta.path))
    }
    expect(NOTE_PAGES).toHaveLength(3)
    expect(NOTE_PAGES.every((page) => page.breadcrumb.length === 3 && page.breadcrumb[1].path === '/notes')).toBe(true)
  })

  it('ツールのページから関係する記事を案内する', () => {
    expect(notesForTool('/tap-drill').map((page) => page.path)).toEqual(['/notes/m12-tap-drill'])
    expect(notesForTool('/flange-bolt-length').map((page) => page.path)).toEqual([
      '/notes/flange-bolt-length',
      '/notes/across-flats-old-jis',
    ])
  })

  it('一覧に全記事へのリンクがある', () => {
    const html = htmlOf('/notes')
    for (const page of NOTE_PAGES) expect(html).toContain(`href="${page.path}"`)
  })

  it('フランジの記事: 計算例の数値と条件付きのリンク、表番号', () => {
    const html = htmlOf('/notes/flange-bolt-length')
    expect(html).toContain('16 + 16 + 3 + 14.8 + 3 × 2 = 55.8 mm')
    expect(html).toContain('16 + 16 + 1.5 + 13 + 3 × 2 = 52.5 mm')
    expect(html).toContain('22 + 22 + 3 + 18 + 3 × 2.5 = 72.5 mm')
    expect(html).toContain('href="/flange-bolt-length?pressure=10K&amp;size=50A&amp;gasket=1.5&amp;nut=ja1"')
    expect(html).toContain('表13 ガスケット座の寸法')
    expect(html).toContain('表22 フランジの寸法許容差')
  })

  it('M12 の記事: 範囲・系列・リンク', () => {
    const html = htmlOf('/notes/m12-tap-drill')
    expect(html).toContain('6H: 10.106〜10.441 mm')
    expect(html).toContain('D<sub>1</sub> = 12 − 1.082532 × 1.75 = 10.106 mm')
    expect(html).toContain('href="/tap-drill?d=12&amp;p=1.75&amp;drill=10.3"')
    expect(html).toContain('href="/screw/m12"')
    expect(html).toContain('表3 めねじ内径の公差')
  })

  it('二面幅の記事: 表とリンク', () => {
    const html = htmlOf('/notes/across-flats-old-jis')
    expect(html).toContain('表JA.8 六角ボルト・上')
    expect(html).toContain('href="/bolt-size?d=10"')
    expect(html).toContain('href="/flange-bolt-length?pressure=10K&amp;size=250A&amp;nut=ja1"')
  })
})
