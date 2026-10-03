import { describe, expect, it } from 'vitest'
import {
  BOLT_SIZES,
  isUnverified,
  listsUnverified,
  UNVERIFIED,
  UNVERIFIED_LEGEND,
  type UnverifiedEntry,
} from './data'

describe('ボルト寸法データの整合性', () => {
  it('呼び径は昇順', () => {
    const ds = BOLT_SIZES.map((size) => size.d)
    expect([...ds].sort((a, b) => a - b)).toEqual(ds)
  })

  it('附属書JA の二面幅が本体と違うのは M10・M12・M14・M22 だけ', () => {
    const differ = BOLT_SIZES.filter((size) => size.sIso !== size.sJa).map((size) => size.d)
    expect(differ).toEqual([10, 12, 14, 22])
  })

  it('JIS B 1176 に無い六角穴付きボルトは M18・M22・M27', () => {
    expect(BOLT_SIZES.filter((size) => size.capNonJis).map((size) => size.d)).toEqual([18, 22, 27])
  })

  it('六角穴付きボルトの頭部高さは呼び径と同じ', () => {
    for (const size of BOLT_SIZES) expect(size.capK, `M${size.d}`).toBe(size.d)
  })

  it('ボルト穴径は 1級 < 2級 < 3級 ≦ 4級、すべて呼び径より大きい', () => {
    for (const size of BOLT_SIZES) {
      const [h1, h2, h3, h4] = size.holes
      expect(h1, `M${size.d}`).toBeGreaterThan(size.d)
      expect(h1).toBeLessThan(h2)
      expect(h2).toBeLessThan(h3)
      if (h4 !== null) expect(h3).toBeLessThanOrEqual(h4)
    }
  })

  it('座ぐりは頭部径より大きく、深さは頭部高さより深い', () => {
    for (const size of BOLT_SIZES) {
      if (!size.counterbore) continue
      expect(size.counterbore.d, `M${size.d}`).toBeGreaterThan(size.capDk)
      expect(size.counterbore.h, `M${size.d}`).toBeGreaterThan(size.capK)
      expect(size.counterbore.d1, `M${size.d}`).toBeGreaterThan(size.d)
    }
  })

  it('ナットの高さは 3種 < 1種 ≦ スタイル1', () => {
    for (const size of BOLT_SIZES) {
      expect(size.nutJa3, `M${size.d}`).toBeLessThan(size.nutJa1)
      expect(size.nutJa1, `M${size.d}`).toBeLessThanOrEqual(size.nutStyle1)
    }
  })
})

/** 規格票の原文で読んだ値（M3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30, 36 の順） */
const ORIGINAL = {
  // JIS B 1180:2014 表JA.8 六角ボルト・上 の s・k（JIS B 1181:2014 表JA.9 のナットの s も同じ）
  sJa: [5.5, 7, 8, 10, 13, 17, 19, 22, 24, 27, 30, 32, 36, 41, 46, 55],
  kJa: [2, 2.8, 3.5, 4, 5.5, 7, 8, 9, 10, 12, 13, 14, 15, 17, 19, 23],
  // JIS B 1181:2014 表JA.9 六角ナット・上 の m（1種・2種・4種）と m1（3種）
  nutJa1: [2.4, 3.2, 4, 5, 6.5, 8, 10, 11, 13, 15, 16, 18, 19, 22, 24, 29],
  nutJa3: [1.8, 2.4, 3.2, 3.6, 5, 6, 7, 8, 10, 11, 12, 13, 14, 16, 18, 21],
  // JIS B 1001:1985 付表のボルト穴径 dh 1級・2級・3級・4級（4級の「—」は null）と ざぐり径 D'
  holes: [
    [3.2, 3.4, 3.6, null],
    [4.3, 4.5, 4.8, 5.5],
    [5.3, 5.5, 5.8, 6.5],
    [6.4, 6.6, 7, 7.8],
    [8.4, 9, 10, 10],
    [10.5, 11, 12, 13],
    [13, 13.5, 14.5, 15],
    [15, 15.5, 16.5, 17],
    [17, 17.5, 18.5, 20],
    [19, 20, 21, 22],
    [21, 22, 24, 25],
    [23, 24, 26, 27],
    [25, 26, 28, 29],
    [28, 30, 32, 33],
    [31, 33, 35, 36],
    [37, 39, 42, 43],
  ],
  spotFace: [9, 11, 13, 15, 20, 24, 28, 32, 35, 39, 43, 46, 50, 55, 62, 72],
} as const

describe('規格票の原文で確認した値', () => {
  it('呼び径の並び', () => {
    expect(BOLT_SIZES.map((size) => size.d)).toEqual([3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30, 36])
  })

  it('附属書JA の二面幅・頭部高さ・ナット高さ（JIS B 1180 表JA.8・JIS B 1181 表JA.9）', () => {
    expect(BOLT_SIZES.map((size) => size.sJa)).toEqual(ORIGINAL.sJa)
    expect(BOLT_SIZES.map((size) => size.kJa)).toEqual(ORIGINAL.kJa)
    expect(BOLT_SIZES.map((size) => size.nutJa1)).toEqual(ORIGINAL.nutJa1)
    expect(BOLT_SIZES.map((size) => size.nutJa3)).toEqual(ORIGINAL.nutJa3)
  })

  it("ボルト穴径 1級〜4級・ざぐり径 D'（JIS B 1001 付表）", () => {
    expect(BOLT_SIZES.map((size) => size.holes)).toEqual(ORIGINAL.holes)
    expect(BOLT_SIZES.map((size) => size.spotFace)).toEqual(ORIGINAL.spotFace)
  })

  it('本体の表（JIS B 1180 表3・表4、JIS B 1181 表3・表4）の例', () => {
    const at = (d: number) => BOLT_SIZES.find((size) => size.d === d)!
    expect([at(10).sIso, at(10).kIso]).toEqual([16, 6.4])
    expect([at(30).sIso, at(30).kIso]).toEqual([46, 18.7])
    expect([at(36).sIso, at(36).kIso]).toEqual([55, 22.5])
    expect([at(22).sIso, at(22).kIso]).toEqual([34, 14])
    expect([at(10).nutStyle1, at(16).nutStyle1, at(24).nutStyle1]).toEqual([8.4, 14.8, 21.5])
    expect([at(22).nutStyle1, at(27).nutStyle1]).toEqual([19.4, 23.8])
  })

  it('六角穴付きボルト（JIS B 1176 表3）の例: dk 最大・k 最大・s 呼び', () => {
    const at = (d: number) => BOLT_SIZES.find((size) => size.d === d)!
    expect([at(20).capDk, at(20).capK, at(20).capKey]).toEqual([30, 20, 17])
    expect([at(24).capDk, at(24).capK, at(24).capKey]).toEqual([36, 24, 19])
  })

  it('JIS B 1180・B 1181 本体で第2選択（表4）なのは M14・M18・M22・M27', () => {
    expect(BOLT_SIZES.filter((size) => size.secondChoice).map((size) => size.d)).toEqual([14, 18, 22, 27])
  })
})

describe('規格原文で未確認の値の一覧（UNVERIFIED）', () => {
  it('いまは空（4級・ざぐり径・附属書JA の M3 二面幅は原文で確認済み）', () => {
    expect(UNVERIFIED).toEqual([])
    expect(isUnverified('hole4', 10)).toBe(false)
    expect(isUnverified('spotFace', 36)).toBe(false)
    expect(isUnverified('sJa', 3)).toBe(false)
  })

  it('仕組み: 一覧に載せた項目・呼び径だけを未確認とする', () => {
    const entries: UnverifiedEntry[] = [
      { field: 'hole4', sizes: 'all', note: '仮の項目' },
      { field: 'sJa', sizes: [3, 4], note: '仮の項目' },
    ]
    expect(listsUnverified(entries, 'hole4', 10)).toBe(true)
    expect(listsUnverified(entries, 'sJa', 4)).toBe(true)
    expect(listsUnverified(entries, 'sJa', 10)).toBe(false)
    expect(listsUnverified(entries, 'spotFace', 3)).toBe(false)
    expect(listsUnverified([], 'hole4', 10)).toBe(false)
  })

  it('凡例', () => {
    expect(UNVERIFIED_LEGEND).toBe('※ 規格原文で未確認の値')
  })
})
