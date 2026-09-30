import { describe, expect, it } from 'vitest'
import { BOLT_SIZES, isUnverified, UNVERIFIED, UNVERIFIED_LEGEND } from './data'

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

describe('規格原文で未確認の値の一覧（UNVERIFIED）', () => {
  it('挙げた呼び径はすべて表にあり、その項目に値がある', () => {
    for (const entry of UNVERIFIED) {
      if (entry.sizes === 'all') continue
      for (const d of entry.sizes) {
        const size = BOLT_SIZES.find((s) => s.d === d)
        expect(size, `${entry.field} M${d}`).toBeDefined()
        if (entry.field === 'hole4') expect(size!.holes[3], `M${d}`).not.toBeNull()
      }
    }
  })

  it('項目は重複しない', () => {
    const fields = UNVERIFIED.map((entry) => entry.field)
    expect(new Set(fields).size).toBe(fields.length)
  })

  it('未確認なのは 4級・ざぐり径の全サイズと、附属書JA の M3 二面幅（docs/data-verification.md）', () => {
    expect(isUnverified('hole4', 10)).toBe(true)
    expect(isUnverified('spotFace', 36)).toBe(true)
    expect(isUnverified('sJa', 3)).toBe(true)
    expect(isUnverified('sJa', 10)).toBe(false)
  })

  it('凡例', () => {
    expect(UNVERIFIED_LEGEND).toBe('※ 規格原文で未確認の値')
  })
})
