import { describe, expect, it } from 'vitest'
import { takeoff, type TakeoffConditions } from './calc'
import type { TakeoffRow } from './input'
import {
  citedStandards,
  flangeTablesLabel,
  itemGroupTitle,
  itemQuantityText,
  itemSpec,
  nutTableLabel,
  takeoffText,
  washerTableLabel,
} from './labels'

const base: TakeoffConditions = { type: 'hex', gasket: 3, washers: 0, nut: 'style1', threads: 3, rounding: '5mm' }
const EXAMPLE: TakeoffRow[] = [
  { pressure: '10K', size: '50A', count: '6' },
  { pressure: '10K', size: '80A', count: '2' },
  { pressure: '20K', size: '100A', count: '1' },
]

describe('典拠の表番号', () => {
  it('フランジの表は一覧にある呼び圧力の表だけ（JIS B 2220 表14・表15・表17・表18）', () => {
    expect(flangeTablesLabel(['10K'])).toBe('表15 呼び圧力10Kフランジの寸法')
    expect(flangeTablesLabel(['10K', '20K'])).toBe('表15・表18（呼び圧力10K・20Kフランジの寸法）')
    expect(flangeTablesLabel(['5K', '10K', '16K', '20K'])).toBe(
      '表14・表15・表17・表18（呼び圧力5K・10K・16K・20Kフランジの寸法）',
    )
    expect(flangeTablesLabel([])).toBeUndefined()
  })

  it('ナットの高さは JIS B 1181 表3（第1選択）・表4（M22）、旧JIS は表JA.9', () => {
    expect(nutTableLabel([16], 'style1')).toBe('表3 六角ナット・スタイル1')
    expect(nutTableLabel([16, 22], 'style1')).toBe('表3・表4 六角ナット・スタイル1')
    expect(nutTableLabel([22], 'style1')).toBe('表4 六角ナット・スタイル1')
    expect(nutTableLabel([16, 22], 'ja1')).toBe('附属書JA 表JA.9 六角ナット・上')
    expect(nutTableLabel([], 'style1')).toBeUndefined()
  })

  it('平座金は JIS B 1256 表7（第1選択）・表8（M22）', () => {
    expect(washerTableLabel([16, 20])).toBe('表7 並形・部品等級A（第1選択）')
    expect(washerTableLabel([22])).toBe('表8 並形・部品等級A（第2選択）')
    expect(washerTableLabel([16, 22])).toBe('表7・表8 並形・部品等級A')
    expect(washerTableLabel([])).toBeUndefined()
  })

  it('JIS B 1180 は呼び長さの系列に丸めるとき、JIS B 1256 は座金を使うときだけ', () => {
    expect(citedStandards(base)).toEqual(['JIS B 2220', 'JIS B 1181', 'JIS B 0205-2'])
    expect(citedStandards({ ...base, rounding: 'jis', washers: 1 })).toEqual([
      'JIS B 2220',
      'JIS B 1181',
      'JIS B 1180',
      'JIS B 0205-2',
      'JIS B 1256',
    ])
  })
})

describe('品目の表示', () => {
  it('見出し・呼び・数量', () => {
    const result = takeoff(EXAMPLE, { ...base, washers: 1 }, 5)
    const [bolt] = result.items
    expect(itemGroupTitle('bolt', base)).toBe('六角ボルト')
    expect(itemGroupTitle('bolt', { ...base, type: 'stud' })).toBe('スタッドボルト')
    expect(itemGroupTitle('nut', { ...base, nut: 'ja1' })).toBe('六角ナット（旧JIS 1種）')
    expect(itemGroupTitle('gasket', { ...base, gasket: 1.5 })).toBe('ガスケット（厚さ 1.5 mm）')
    // 座金1枚（3 mm）を足すと 10K 80A は 18+18+3+3+14.8+6 = 62.8 → 65 になり、50A（58.8 → 60）と分かれる
    expect(result.items.map(itemSpec)).toEqual([
      'M16×60',
      'M16×65',
      'M20×80',
      'M16',
      'M20',
      'M16用',
      'M20用',
      '10K 50A',
      '10K 80A',
      '20K 100A',
    ])
    expect(itemQuantityText(bolt)).toBe('26本（うち予備 2）') // 24 × 5% = 1.2 → 2
    expect(itemQuantityText(takeoff(EXAMPLE, base, 0).items[0])).toBe('40本')
  })
})

describe('コピーする文章', () => {
  it('品目ごとの数・内訳・条件・典拠を入れる', () => {
    const text = takeoffText(takeoff(EXAMPLE, base, 0), base, 0)
    expect(text.split('\n')).toEqual([
      '【フランジ部品の拾い出し】9か所',
      '■六角ボルト',
      'M16×60　40本',
      'M20×80　8本',
      '■六角ナット（JIS本体）',
      'M16　40個',
      'M20　8個',
      '■ガスケット（厚さ 3 mm）',
      '10K 50A　6枚',
      '10K 80A　2枚',
      '20K 100A　1枚',
      '内訳: 10K 50A×6か所（M16×60・4本/か所）、10K 80A×2か所（M16×60・8本/か所）、20K 100A×1か所（M20×80・8本/か所）',
      '条件: 六角ボルト・ガスケット 3mm・JIS本体ナット・座金なし・突き出し3山・相手側 同じ厚さ・5mm刻み',
      'ガスケットは呼び圧力・呼び径ごとの枚数だけです（寸法は載せていません）。',
      '典拠: JIS B 2220:2012 表15・表18 / JIS B 1181:2014 / JIS B 0205-2:2001',
      '（サクッとJIS）',
    ])
  })

  it('予備・集計していない行も書く', () => {
    const rows: TakeoffRow[] = [...EXAMPLE, { pressure: '5K', size: '25A', count: '' }]
    const text = takeoffText(takeoff(rows, base, 10), base, 10)
    expect(text).toContain('M16×60　44本（うち予備 4）')
    expect(text).toContain('※ 予備 10% を品目ごとに切り上げて含む')
    expect(text).toContain('（か所数が入っていない 4行目 は含めていません）')
    // 集計しない行の 5K も典拠の表に入る（一覧に長さを出しているため）
    expect(text).toContain('典拠: JIS B 2220:2012 表14・表15・表18')
  })
})
