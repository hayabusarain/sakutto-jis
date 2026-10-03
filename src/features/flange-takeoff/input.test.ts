import { describe, expect, it } from 'vitest'
import { fromQuery, stateQuery } from '../../lib/query'
import { matchTools } from '../../lib/quickSearch'
import { TOOLS } from '../../tools/registry'
import { findFlange, flangeBoltLength } from '../flange-bolt/calc'
import { FLANGES, PRESSURE_CLASSES } from '../flange-bolt/data'
import * as flange from '../flange-bolt/input'
import { takeoff, type TakeoffConditions } from './calc'
import {
  decodeRows,
  DEFAULT_INPUT,
  encodeRows,
  FLANGE_TOOL_PATH,
  flangeToolHref,
  isTakeoffInput,
  MAX_ROWS,
  normalizeTakeoffInput,
  parseJointCount,
  parseRows,
  sanitizeCount,
  TAKEOFF_TOOL_PATH,
  type TakeoffInput,
  type TakeoffRow,
} from './input'

/** URL のクエリから、ツールと同じ手順（fromQuery → normalize → isValid）で入力を作る */
function fromUrl(search: string): TakeoffInput | null {
  const parsed = fromQuery(search, DEFAULT_INPUT)
  if (!parsed) return null
  const next = normalizeTakeoffInput(parsed.state)
  return isTakeoffInput(next) ? next : null
}

/** 全クラス・全呼び径の行（か所数は 1〜） */
const ALL_ROWS: TakeoffRow[] = PRESSURE_CLASSES.flatMap((pressure) =>
  FLANGES[pressure].map((r, i) => ({ pressure, size: r.size, count: String(i + 1) })),
)

describe('か所数の入力', () => {
  it('数字だけにそろえる（全角・数字以外・先頭の 0・5桁目以降）', () => {
    expect(sanitizeCount('６')).toBe('6')
    expect(sanitizeCount('12a')).toBe('12')
    expect(sanitizeCount(' 1 2 ')).toBe('12')
    expect(sanitizeCount('06')).toBe('6')
    expect(sanitizeCount('00')).toBe('0')
    expect(sanitizeCount('0')).toBe('0')
    expect(sanitizeCount('')).toBe('')
    expect(sanitizeCount('12345')).toBe('1234')
  })

  it('1〜999 の整数だけを数として読む', () => {
    expect(parseJointCount('1')).toBe(1)
    expect(parseJointCount('999')).toBe(999)
    expect(parseJointCount('1000')).toBeNull()
    expect(parseJointCount('0')).toBeNull()
    expect(parseJointCount('')).toBeNull()
    expect(parseJointCount('1.5')).toBeNull()
  })
})

describe('一覧の URL 表現（rows=10K-50A-6_10K-80A-2）', () => {
  it('書いて読むと元に戻る（全クラス・全呼び径）', () => {
    for (let start = 0; start < ALL_ROWS.length; start += MAX_ROWS) {
      const rows = ALL_ROWS.slice(start, start + MAX_ROWS)
      const text = encodeRows(rows)
      expect(decodeRows(text)).toEqual(rows)
      expect(parseRows(text)).toEqual(rows)
    }
    const example: TakeoffRow[] = [
      { pressure: '10K', size: '50A', count: '6' },
      { pressure: '10K', size: '80A', count: '2' },
      { pressure: '20K', size: '100A', count: '1' },
    ]
    expect(encodeRows(example)).toBe('10K-50A-6_10K-80A-2_20K-100A-1')
    expect(decodeRows('10K-50A-6_10K-80A-2_20K-100A-1')).toEqual(example)
  })

  it('入力途中の空欄・エラーの数・同じ継手の重複もそのまま往復する', () => {
    const rows: TakeoffRow[] = [
      { pressure: '10K', size: '50A', count: '' },
      { pressure: '10K', size: '50A', count: '0' },
      { pressure: '5K', size: '10A', count: '1000' },
    ]
    expect(encodeRows(rows)).toBe('10K-50A-_10K-50A-0_5K-10A-1000')
    expect(decodeRows(encodeRows(rows))).toEqual(rows)
    expect(decodeRows('')).toEqual([])
    expect(encodeRows([])).toBe('')
  })

  it('URL に書くと「-」「_」はそのまま（LINE で共有しても読める）', () => {
    const state = { ...DEFAULT_INPUT, rows: '10K-50A-6_10K-80A-2' }
    expect(stateQuery(state, DEFAULT_INPUT, normalizeTakeoffInput)).toBe('rows=10K-50A-6_10K-80A-2')
  })

  it('形の違う文字は decodeRows では読まない', () => {
    for (const text of [
      '10K-50A', // か所数の欄が無い
      '10K-50A-6-1',
      '30K-50A-1', // 無い呼び圧力
      '10k-50A-1', // 小文字
      '16K-175A-1', // 16K に 175A は無い（JIS B 2220 表12）
      '10K-350A-1',
      '10K-50A-06', // 先頭の 0
      '10K-50A-x',
      '10K-50A-12345',
      '10K-50A-1_',
      Array.from({ length: MAX_ROWS + 1 }, () => '10K-50A-1').join('_'),
    ]) {
      expect(decodeRows(text), text).toBeNull()
    }
    expect(decodeRows(Array.from({ length: MAX_ROWS }, () => '10K-50A-1').join('_'))).toHaveLength(MAX_ROWS)
  })

  it('parseRows は書き方の揺れを直す', () => {
    expect(parseRows('10k-50a-6_10-2B-2')).toEqual([
      { pressure: '10K', size: '50A', count: '6' },
      { pressure: '10K', size: '50A', count: '2' },
    ])
    // か所数が無ければ 1
    expect(parseRows('20K-100A')).toEqual([{ pressure: '20K', size: '100A', count: '1' }])
    // そのクラスに無い呼び径は最も近い呼び径（JISフランジ＆ボルト長さと同じ）
    expect(parseRows('16K-175A-3')).toEqual([{ pressure: '16K', size: '200A', count: '3' }])
    // 読めない行は捨てる。か所数が整数でなければ空欄（画面でエラー）
    expect(parseRows('abc_30K-50A-1_10K-80A-1.5_10K-25A-６')).toEqual([
      { pressure: '10K', size: '80A', count: '' },
      { pressure: '10K', size: '25A', count: '6' },
    ])
    expect(parseRows('')).toEqual([])
    expect(parseRows(Array.from({ length: 40 }, () => '10K-50A-1').join('_'))).toHaveLength(MAX_ROWS)
  })
})

describe('isTakeoffInput / normalizeTakeoffInput', () => {
  it('既定値は正しい入力で、normalize しても変わらない', () => {
    expect(isTakeoffInput(DEFAULT_INPUT)).toBe(true)
    expect(normalizeTakeoffInput(DEFAULT_INPUT)).toEqual(DEFAULT_INPUT)
  })

  it('共通の条件のキー名・既定値は JISフランジ＆ボルト長さと同じ', () => {
    for (const key of ['type', 'gasket', 'nut', 'washers', 'threads', 'rounding'] as const) {
      expect(DEFAULT_INPUT[key], key).toBe(flange.DEFAULT_INPUT[key])
    }
  })

  it('正しくない値は受け付けない', () => {
    expect(isTakeoffInput({ ...DEFAULT_INPUT, rows: '16K-175A-1' })).toBe(false)
    expect(isTakeoffInput({ ...DEFAULT_INPUT, spare: 7 })).toBe(false)
    expect(isTakeoffInput({ ...DEFAULT_INPUT, threads: 6 })).toBe(false)
    expect(isTakeoffInput({ ...DEFAULT_INPUT, washers: 3 })).toBe(false)
    expect(isTakeoffInput(null)).toBe(false)
    expect(isTakeoffInput({ ...DEFAULT_INPUT, rows: '' })).toBe(true)
  })

  it('URL の一部指定・読めない値を整える', () => {
    expect(fromUrl('?rows=10k-50a-6_10K-80A-2')).toEqual({ ...DEFAULT_INPUT, rows: '10K-50A-6_10K-80A-2' })
    expect(fromUrl('?type=stud')).toEqual({ ...DEFAULT_INPUT, type: 'stud' })
    expect(fromUrl('?spare=7&threads=9')).toEqual({ ...DEFAULT_INPUT, spare: 0, threads: 5 })
    expect(fromUrl('?rows=&spare=10')).toEqual({ ...DEFAULT_INPUT, rows: '', spare: 10 })
    expect(fromUrl('?rows=abc')).toEqual({ ...DEFAULT_INPUT, rows: '' })
    expect(fromUrl('?utm_source=line')).toBeNull()
  })

  it('URL に書いた条件は、開き直しても同じ条件に戻る', () => {
    const states: TakeoffInput[] = [
      DEFAULT_INPUT,
      { ...DEFAULT_INPUT, rows: '' },
      { ...DEFAULT_INPUT, rows: '10K-50A-6_10K-80A-2_20K-100A-1', spare: 5 },
      { ...DEFAULT_INPUT, rows: '10K-50A-_10K-50A-0_5K-10A-1000', type: 'stud', gasket: '' },
      { ...DEFAULT_INPUT, rows: encodeRows(ALL_ROWS.slice(0, MAX_ROWS)), nut: 'ja1', washers: 2, rounding: 'jis' },
    ]
    for (const state of states) {
      const query = stateQuery(state, DEFAULT_INPUT, normalizeTakeoffInput)
      expect(query).not.toBe('')
      expect(fromUrl(query)).toEqual(state)
    }
    expect(stateQuery(DEFAULT_INPUT, DEFAULT_INPUT, normalizeTakeoffInput)).toBe('rows=10K-50A-1')
  })
})

describe('行ごとの JISフランジ＆ボルト長さへのリンク', () => {
  const conditionInputs: Partial<TakeoffInput>[] = [
    {},
    { type: 'stud' },
    { gasket: '1.5', nut: 'ja1', washers: 2, threads: 2 },
    { type: 'stud', gasket: '0', washers: 1, threads: 5, rounding: 'jis' },
  ]

  it('呼び圧力・呼び径と、既定と違う条件だけを書く', () => {
    expect(flangeToolHref({ pressure: '10K', size: '50A' }, DEFAULT_INPUT)).toBe(
      '/flange-bolt-length?pressure=10K&size=50A',
    )
    expect(flangeToolHref({ pressure: '20K', size: '100A' }, { ...DEFAULT_INPUT, type: 'stud', washers: 2, spare: 10 })).toBe(
      '/flange-bolt-length?pressure=20K&size=100A&type=stud&washers=2',
    )
  })

  it('リンク先で開く条件のボルト長さが、拾い出しの行と同じ（全クラス・全呼び径）', () => {
    for (const patch of conditionInputs) {
      const input = { ...DEFAULT_INPUT, ...patch }
      const conditions: TakeoffConditions = {
        type: input.type,
        gasket: Number(input.gasket),
        washers: input.washers,
        nut: input.nut,
        threads: input.threads,
        rounding: input.rounding,
      }
      const result = takeoff(ALL_ROWS, conditions, 0)
      expect(result.lines).toHaveLength(ALL_ROWS.length)
      for (const line of result.lines) {
        const href = flangeToolHref(line, input)
        expect(href.startsWith(`${FLANGE_TOOL_PATH}?`)).toBe(true)
        // JISフランジ＆ボルト長さが URL を読むのと同じ手順
        const parsed = fromQuery(href.slice(href.indexOf('?')), flange.DEFAULT_INPUT)!
        const opened = flange.normalizeFlangeInput(parsed.state, parsed.keys)
        expect(flange.isFlangeInput(opened)).toBe(true)
        expect([opened.pressure, opened.size, opened.t2]).toEqual([line.pressure, line.size, ''])
        const row = findFlange(opened.pressure, opened.size)!
        const openedLength = flangeBoltLength(row, {
          type: opened.type,
          gasket: Number(opened.gasket),
          washers: opened.washers,
          nut: opened.nut,
          threads: opened.threads,
          rounding: opened.rounding,
          t2: null,
        })
        expect(openedLength).toEqual(line.bolt)
      }
    }
  })
})

describe('ツールのパス', () => {
  it('このツールとリンク先のツールが登録されている', () => {
    const paths = TOOLS.map((tool) => tool.path)
    expect(paths).toContain(TAKEOFF_TOOL_PATH)
    expect(paths).toContain(FLANGE_TOOL_PATH)
  })

  it('検索の言葉（拾い出し・員数・部品表）で見つかる', () => {
    for (const word of ['拾い出し', '員数', '部品表', 'ガスケット 数量']) {
      expect(matchTools(word, TOOLS).map((tool) => tool.path), word).toContain(TAKEOFF_TOOL_PATH)
    }
  })
})
