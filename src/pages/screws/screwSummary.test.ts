import { describe, expect, it } from 'vitest'
import { BOLT_SIZES } from '../../features/bolt-size/data'
import { formatSignificant } from '../../features/tap-drill/calc'
import { SCREW_INDEX_META, SCREW_PAGES, screwPath } from './screwPages'
import { b1004Pair, flangesUsingBolt, screwPoints, screwSummary, stressArea, SUMMARY_SIZES } from './screwSummary'
import { roundSignificant } from '../../features/steel-pipe/calc'
import { render } from '../../entry-server'

describe('stressArea（JIS B 1082 の有効断面積）', () => {
  // JIS B 1082:2009 表1 一般用メートルねじの有効断面積（並目。有効数字3桁。規格票の原文で確認）
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
    expect(formatSignificant(summary.stressArea)).toBe('84.3')
    expect(summary.pitches.map((row) => row.p)).toEqual([1.75, 1.5, 1.25, 1])
    expect(summary.pitches.slice(1).every((row) => row.kind === '細目')).toBe(true)
    expect(summary.bolt.sIso).toBe(18)
    expect(summary.prev).toBe(10)
    expect(summary.next).toBe(14)
  })

  it('有効断面積は丸める前の値を持つ（M10 は 57.99 → 表示 58.0。末尾の 0 を落とさない）', () => {
    const { stressArea: area } = screwSummary(10)!
    expect(area).toBeCloseTo(57.99, 2)
    expect(formatSignificant(area)).toBe('58.0')
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

describe('screwPoints（サイズごとのポイント）', () => {
  const points = (d: number) => screwPoints(screwSummary(d)!)
  const text = (d: number, kind: string) => points(d).find((point) => point.kind === kind)?.text

  it('JIS B 1004 の系列: M12 は 95 % 10.2・90 % 10.3（推奨と同じ値）、M10 は 8.46・8.54', () => {
    expect(b1004Pair(screwSummary(12)!.coarse, 12)).toEqual({ s95: 10.2, s90: 10.3, in95: true, in90: true })
    expect(text(12, 'b1004')).toContain('95 % が 10.2 mm、90 % が 10.3 mm')
    expect(text(12, 'b1004')).toContain('どちらも 6H の範囲（10.106〜10.441 mm）に入ります')
    expect(text(12, 'b1004')).toContain('推奨 10.2 mm は 95 % の系列と同じ値です')
    expect(text(10, 'b1004')).toContain('95 % が 8.46 mm、90 % が 8.54 mm')
    expect(text(10, 'b1004')).toContain('推奨 8.5 mm のひっかかり率は 92.4 % です')
  })

  it('全サイズで 95 %・90 % の系列が 6H の範囲に入る', () => {
    for (const d of SUMMARY_SIZES) {
      const pair = b1004Pair(screwSummary(d)!.coarse, d)!
      expect([pair.in95, pair.in90], `M${d}`).toEqual([true, true])
      expect(pair.s95).toBeLessThan(pair.s90)
    }
  })

  it('二面幅: 違うサイズ（M12 18/19、M22 34/32）と同じサイズ（M16 24）で書き分ける', () => {
    expect(text(12, 'flats')).toContain('JIS本体 18 mm、旧JIS（附属書JA）19 mm で違います')
    expect(text(22, 'flats')).toContain('JIS本体 34 mm、旧JIS（附属書JA）32 mm で違います')
    expect(text(16, 'flats')).toContain('JIS本体・旧JIS（附属書JA）とも 24 mm です（違うのは M10・M12・M14・M22）')
  })

  it('ナットの高さはフランジに使うサイズだけ（M16 は 14.8 と 13 で 1.8 mm 違う）', () => {
    expect(text(16, 'nut')).toContain('JIS本体（スタイル1 の最大）14.8 mm、旧JIS 1種 13 mm で 1.8 mm 違う')
    expect(text(8, 'nut')).toBeUndefined()
    expect(text(36, 'nut')).toBeUndefined()
  })

  it('座ぐりの穴径が JIS B 1001 の等級と違うのは M12・M14・M16', () => {
    expect(SUMMARY_SIZES.filter((d) => text(d, 'counterbore'))).toEqual([12, 14, 16])
    expect(text(12, 'counterbore')).toContain('φ14')
    expect(text(12, 'counterbore')).toContain('1級 13・2級 13.5・3級 14.5 mm')
  })

  it('六角レンチを共用するサイズ（M16 と M18、M20 と M22、M24 と M27）', () => {
    expect(SUMMARY_SIZES.filter((d) => text(d, 'key'))).toEqual([16, 18, 20, 22, 24, 27])
    expect(text(16, 'key')).toBe(
      '六角レンチ 14 mm は M18（JIS外）の六角穴付きボルトと同じサイズです。レンチのサイズだけではボルトの太さを決められません。',
    )
    expect(text(18, 'key')).toContain('14 mm は M16 の六角穴付きボルト')
  })

  it('ページごとにポイントの文章が違う', () => {
    const all = SUMMARY_SIZES.map((d) => points(d).map((point) => point.text).join('\n'))
    expect(new Set(all).size).toBe(SUMMARY_SIZES.length)
  })

  it('まとめページにポイントと解説へのリンクが出る', () => {
    const html = render('/screw/m12').html.replace(/<!-- -->/g, '')
    expect(html).toContain('M12 のポイント')
    expect(html).toContain('95 % が 10.2 mm、90 % が 10.3 mm')
    expect(html).toContain('href="/notes/m12-tap-drill"')
    expect(html).toContain('href="/notes/across-flats-old-jis"')
    expect(html).toContain('10.2 / 10.3')
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

  it('どの行も規格原文（JIS B 2220:2012 表14・表15・表17・表18）で確認済みなので、未確認の印は付かない', () => {
    for (const d of [10, 12, 16, 20, 22, 24]) {
      for (const use of flangesUsingBolt(d)) {
        expect(
          use.sizes.filter((row) => row.unverified).map((row) => row.size),
          `M${d} ${use.pressure}`,
        ).toEqual([])
      }
    }
  })

  it('M20 を使うフランジに 16K・20K の 90A（表17・表18）も入る', () => {
    const uses = flangesUsingBolt(20)
    for (const pressure of ['16K', '20K']) {
      expect(uses.find((use) => use.pressure === pressure)!.sizes.map((row) => row.size)).toEqual(['80A', '90A', '100A'])
    }
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
    // 下穴径は本文・ツールと同じ書き方（整数でも小数1桁）
    const m16 = SCREW_PAGES.find((page) => page.d === 16)!
    expect(m16.description).toContain('下穴径 14.0 mm')
    expect(m12.description).toContain('二面幅 18 mm（旧JIS 19 mm）')
    expect(m12.description).toContain('六角レンチ 10 mm')
    expect(m12.description).toContain('ボルト穴径 13.5 mm（2級）')
    expect(new Set(SCREW_PAGES.map((page) => page.description)).size).toBe(SCREW_PAGES.length)
  })
})
