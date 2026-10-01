import { describe, expect, it } from 'vitest'
import {
  ACROSS_FLATS_SIZES,
  acrossFlatsMatchLabel,
  acrossFlatsText,
  boltSizesInFlanges,
  boltsByAcrossFlats,
  boltsByKey,
  coarsePitchOf,
  counterboreCallout,
  DEFAULT_INPUT,
  EXPORT_HEADERS,
  exportRows,
  findBolt,
  flangesUsingBolt,
  holeCallout,
  holeOf,
  isBoltSizeInput,
  KEY_SIZES,
  keyMatchLabel,
  markIf,
  normalizeBoltSizeInput,
  representativeFlange,
  sizeRangeLabel,
  summaryText,
} from './calc'
import { BOLT_SIZES, type HoleClass } from './data'

const bolt = (d: number) => {
  const size = findBolt(d)
  if (!size) throw new Error(`M${d} がありません`)
  return size
}

describe('スパナのサイズ（二面幅）からボルトを探す', () => {
  const labels = (s: number) => boltsByAcrossFlats(s).map(acrossFlatsMatchLabel)

  it('旧JIS（附属書JA）だけの二面幅', () => {
    expect(labels(17)).toEqual(['M10（旧JIS）'])
    expect(labels(19)).toEqual(['M12（旧JIS）'])
    expect(labels(22)).toEqual(['M14（旧JIS）'])
    expect(labels(32)).toEqual(['M22（旧JIS）'])
  })

  it('JIS本体（ISO）の二面幅', () => {
    expect(labels(16)).toEqual(['M10'])
    expect(labels(18)).toEqual(['M12'])
    expect(labels(21)).toEqual(['M14'])
    expect(labels(34)).toEqual(['M22'])
    expect(boltsByAcrossFlats(34)[0].standard).toBe('iso')
  })

  it('本体・附属書JA で同じ二面幅', () => {
    expect(labels(13)).toEqual(['M8'])
    expect(labels(24)).toEqual(['M16'])
    expect(boltsByAcrossFlats(24)[0].standard).toBe('both')
    expect(labels(5.5)).toEqual(['M3'])
  })

  it('表に無いサイズは空', () => {
    expect(boltsByAcrossFlats(15)).toEqual([])
    expect(boltsByAcrossFlats(0)).toEqual([])
  })

  it('チップに出すサイズは表の二面幅すべてで、どれも1つ以上のボルトに当たる', () => {
    expect(ACROSS_FLATS_SIZES).toEqual([
      5.5, 7, 8, 10, 13, 16, 17, 18, 19, 21, 22, 24, 27, 30, 32, 34, 36, 41, 46, 55,
    ])
    for (const s of ACROSS_FLATS_SIZES) expect(boltsByAcrossFlats(s).length, `${s}`).toBeGreaterThan(0)
  })
})

describe('六角レンチのサイズからボルトを探す', () => {
  const labels = (key: number) => boltsByKey(key).map(keyMatchLabel)

  it('既知の値', () => {
    expect(labels(2.5)).toEqual(['M3'])
    expect(labels(5)).toEqual(['M6'])
    expect(labels(8)).toEqual(['M10'])
    expect(labels(10)).toEqual(['M12'])
    expect(labels(12)).toEqual(['M14'])
  })

  it('1つのレンチで2サイズ（片方は JIS B 1176 に無い）', () => {
    expect(labels(14)).toEqual(['M16', 'M18（JIS外）'])
    expect(labels(17)).toEqual(['M20', 'M22（JIS外）'])
    expect(labels(19)).toEqual(['M24', 'M27（JIS外）'])
  })

  it('チップに出すサイズ', () => {
    expect(KEY_SIZES).toEqual([2.5, 3, 4, 5, 6, 8, 10, 12, 14, 17, 19, 22, 27])
    expect(boltsByKey(7)).toEqual([])
  })
})

describe('入力の整え方（URL の一部指定）', () => {
  it('等級の書き方のゆれ', () => {
    expect(normalizeBoltSizeInput({ d: 10, holeClass: '1' as HoleClass })).toEqual({ d: 10, holeClass: '1級' })
    expect(normalizeBoltSizeInput({ d: 10, holeClass: '３級' as HoleClass })).toEqual({ d: 10, holeClass: '3級' })
    expect(normalizeBoltSizeInput({ d: 10, holeClass: '5級' as HoleClass })).toEqual({ d: 10, holeClass: '2級' })
  })

  it('表に無い呼び径は既定の M12 にする', () => {
    expect(normalizeBoltSizeInput({ d: 11, holeClass: '1級' })).toEqual({ d: 12, holeClass: '1級' })
    expect(normalizeBoltSizeInput({ d: -3, holeClass: '2級' })).toEqual(DEFAULT_INPUT)
  })

  it('整えた結果はいつも正しい入力', () => {
    for (const d of [0, 3, 7, 36, 100]) {
      for (const c of ['1級', '4', 'x', '']) {
        expect(isBoltSizeInput(normalizeBoltSizeInput({ d, holeClass: c as HoleClass }))).toBe(true)
      }
    }
  })

  it('入力の検査', () => {
    expect(isBoltSizeInput(DEFAULT_INPUT)).toBe(true)
    expect(isBoltSizeInput({ d: 11, holeClass: '2級' })).toBe(false)
    expect(isBoltSizeInput({ d: 12, holeClass: '5級' })).toBe(false)
    expect(isBoltSizeInput(null)).toBe(false)
  })
})

describe('図面指示の書き方', () => {
  it('通し穴', () => {
    expect(holeCallout(4, 13.5, 'current')).toBe('4×φ13.5')
    expect(holeCallout(4, 13.5, 'legacy')).toBe('4-φ13.5キリ')
    expect(holeCallout(1, 11, 'current')).toBe('φ11')
    expect(holeCallout(1, 11, 'legacy')).toBe('φ11キリ')
  })

  it('M12 の六角穴付きボルト用座ぐり', () => {
    const cb = bolt(12).counterbore!
    expect(counterboreCallout(4, cb, 'current')).toBe('4×φ14 ⌴φ20↧13')
    expect(counterboreCallout(4, cb, 'legacy')).toBe('4-φ14キリ φ20深ザグリ深さ13')
    expect(counterboreCallout(1, bolt(10).counterbore!, 'current')).toBe('φ11 ⌴φ17.5↧10.8')
  })

  it('穴の数が正しくなければエラー', () => {
    expect(() => holeCallout(0, 11, 'current')).toThrow(RangeError)
    expect(() => holeCallout(2.5, 11, 'legacy')).toThrow(RangeError)
  })
})

describe('このボルトを使うフランジ', () => {
  const summary = (d: number) =>
    flangesUsingBolt(d).map((use) => `${use.pressure} ${sizeRangeLabel(use.sizes)}`)

  it('M16', () => {
    expect(summary(16)).toEqual(['5K 80A〜150A', '10K 25A〜100A', '16K 25A〜65A', '20K 25A〜65A'])
  })

  it('M22（10K 250A・300A、16K・20K 125A〜200A）', () => {
    expect(summary(22)).toEqual(['10K 250A〜300A', '16K 125A〜200A', '20K 125A〜200A'])
  })

  it('フランジに使わないサイズ', () => {
    expect(flangesUsingBolt(8)).toEqual([])
    expect(flangesUsingBolt(36)).toEqual([])
  })

  it('フランジ表のボルトはすべてこのツールの表にある', () => {
    const sizes = boltSizesInFlanges()
    expect(sizes).toEqual([10, 12, 16, 20, 22, 24])
    for (const d of sizes) expect(findBolt(d), `M${d}`).toBeDefined()
  })

  it('関連リンクのフランジ', () => {
    expect(representativeFlange(16)).toEqual({ pressure: '10K', size: '50A' })
    expect(representativeFlange(10)).toEqual({ pressure: '5K', size: '10A' })
    expect(representativeFlange(24)).toEqual({ pressure: '16K', size: '250A' })
    expect(representativeFlange(22)).toEqual({ pressure: '10K', size: '250A' })
    expect(representativeFlange(6)).toBeNull()
  })

  it('範囲の表記', () => {
    expect(sizeRangeLabel(['250A'])).toBe('250A')
    expect(sizeRangeLabel([])).toBe('')
  })
})

describe('規格原文で未確認の値の ※', () => {
  it('markIf', () => {
    expect(markIf('24', true)).toBe('24※')
    expect(markIf('24', false)).toBe('24')
  })

  it('二面幅の表示（M3 は附属書JA が未確認）', () => {
    expect(acrossFlatsText(bolt(3))).toBe('5.5（5.5※）')
    expect(acrossFlatsText(bolt(10))).toBe('16（17）')
    expect(acrossFlatsText(bolt(16))).toBe('24')
  })

  it('結果のコピー', () => {
    const text = summaryText(bolt(10), '4級')
    expect(text).toContain('二面幅（スパナ）: 16 mm（旧JIS 17 mm）')
    expect(text).toContain('ボルト穴 4級: 13※ mm')
    expect(text).toContain("ざぐり径 D': 24※ mm")
    expect(text).toContain('※ 規格原文で未確認の値')
    expect(text).toContain('JIS B 1001:1985')
    expect(summaryText(bolt(10), '2級')).toContain('ボルト穴 2級: 11 mm／')
    expect(summaryText(bolt(3), '4級')).toContain('ボルト穴 4級: —／')
    expect(summaryText(bolt(3), '2級')).toContain('（旧JIS 5.5※ mm）')
    expect(summaryText(bolt(18), '2級')).toContain('六角レンチ（六角穴付きボルト）: 14 mm（JIS B 1176 に無いサイズ。DIN 912 などの値）')
    expect(summaryText(bolt(16), '2級')).not.toContain('DIN 912')
  })

  it('表の出力', () => {
    const rows = exportRows()
    expect(rows).toHaveLength(BOLT_SIZES.length)
    for (const row of rows) expect(row).toHaveLength(EXPORT_HEADERS.length)
    const m3 = rows[0]
    expect(m3[0]).toBe('M3')
    expect(m3[2]).toBe('5.5※')
    expect(m3[14]).toBe('')
    const m10 = rows.find((row) => row[0] === 'M10')!
    expect(m10[2]).toBe('17')
    expect(m10[14]).toBe('13※')
    expect(m10[15]).toBe('24※')
    expect(m10[12]).toBe('11')
  })

  it('M36 は CAP 座ぐりが空欄', () => {
    const m36 = exportRows().find((row) => row[0] === 'M36')!
    expect(m36.slice(16, 19)).toEqual(['', '', ''])
  })
})

describe('その他', () => {
  it('ボルト穴径', () => {
    expect(holeOf(bolt(12), '2級')).toBe(13.5)
    expect(holeOf(bolt(3), '4級')).toBeNull()
  })

  it('並目ピッチ（ねじ下穴ツールへのリンク）', () => {
    expect(coarsePitchOf(12)).toBe(1.75)
    expect(coarsePitchOf(16)).toBe(2)
    for (const size of BOLT_SIZES) expect(coarsePitchOf(size.d), `M${size.d}`).not.toBeNull()
  })
})
