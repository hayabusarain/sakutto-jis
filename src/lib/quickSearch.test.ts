import { describe, expect, it } from 'vitest'
import { BOLT_SIZES } from '../features/bolt-size/data'
import { boltLength } from '../features/flange-bolt/calc'
import { FLANGES, PRESSURE_CLASSES } from '../features/flange-bolt/data'
import { oRingNumbers } from '../features/o-ring/calc'
import { findPipeThread, gRecommendedDrill } from '../features/pipe-thread/calc'
import { PIPE_THREAD_SIZES } from '../features/pipe-thread/data'
import { PIPE_SIZES } from '../features/steel-pipe/data'
import { METRIC_SIZES } from '../features/tap-drill/data'
import { TOOLS } from '../tools/registry'
import {
  canonicalInch,
  flangesUsingBolt,
  matchTools,
  mergeResults,
  normalizeQuery,
  numberSuggestions,
  parseNominal,
  parseQuery,
  quickSearch,
  SEARCH_EXAMPLES,
  SEARCH_TOOL_PATHS,
  type SummaryCard,
  type SummarySection,
} from './quickSearch'

function card(query: string): SummaryCard {
  const result = quickSearch(query)
  expect(result.status, `${query}: ${result.messages.join(' ')}`).toBe('found')
  expect(result.cards).toHaveLength(1)
  return result.cards[0]
}

function section(c: SummaryCard, title: string): SummarySection {
  const found = c.sections.find((s) => s.title.startsWith(title))
  expect(found, `${c.title} に「${title}」の欄がない`).toBeDefined()
  return found!
}

function row(s: SummarySection, label: string) {
  const found = s.rows.find((r) => r.label.startsWith(label))
  expect(found, `${s.title} に「${label}」の行がない`).toBeDefined()
  return found!
}

/** リンクのパスとクエリを分けて比べる */
function link(href: string) {
  const [path, query = ''] = href.split('?')
  return { path, params: Object.fromEntries(new URLSearchParams(query)) }
}

describe('normalizeQuery', () => {
  it('全角英数字・記号・大文字小文字・空白をそろえる', () => {
    expect(normalizeQuery('Ｍ１２')).toBe('M12')
    expect(normalizeQuery('ｍ１２ｘ１．２５')).toBe('M12X1.25')
    expect(normalizeQuery('M10 × 1.25')).toBe('M10 X 1.25')
    expect(normalizeQuery('m10*1.25')).toBe('M10X1.25')
    expect(normalizeQuery('Ｒｃ１／２')).toBe('RC1/2')
    expect(normalizeQuery('  10k　 50a ')).toBe('10K 50A')
    expect(normalizeQuery('1½B')).toBe('11/2B')
    expect(normalizeQuery('1ー1/2B')).toBe('1-1/2B')
    expect(normalizeQuery('ｽﾊﾟﾅ17')).toBe('スパナ17')
  })
})

describe('canonicalInch / parseNominal', () => {
  it('インチの呼びを「1 1/2」の形にそろえる', () => {
    expect(canonicalInch('2')).toBe('2')
    expect(canonicalInch('1/2')).toBe('1/2')
    expect(canonicalInch('2/4')).toBe('1/2')
    expect(canonicalInch('1 1/2')).toBe('1 1/2')
    expect(canonicalInch('1-1/2')).toBe('1 1/2')
    expect(canonicalInch('1・1/2')).toBe('1 1/2')
    expect(canonicalInch('11/2')).toBe('1 1/2')
    expect(canonicalInch('21/2')).toBe('2 1/2')
    expect(canonicalInch('1.5')).toBe('1 1/2')
    expect(canonicalInch('0.375')).toBe('3/8')
    expect(canonicalInch('2.0')).toBe('2')
  })

  it('読めないものは null', () => {
    expect(canonicalInch('')).toBeNull()
    expect(canonicalInch('3/2')).toBeNull()
    expect(canonicalInch('1.3')).toBeNull()
    expect(canonicalInch('abc')).toBeNull()
  })

  it('A 呼称・B 呼称', () => {
    expect(parseNominal('50A')).toEqual({ system: 'A', a: '50A' })
    expect(parseNominal('050A')).toEqual({ system: 'A', a: '50A' })
    expect(parseNominal('2B')).toEqual({ system: 'B', b: '2' })
    expect(parseNominal('2 1/2B')).toEqual({ system: 'B', b: '2 1/2' })
    expect(parseNominal('50')).toBeNull()
  })
})

describe('parseQuery', () => {
  it('メートルねじの書き方の違いを読む', () => {
    const base = { type: 'metric', second: null, pitchExplicit: false, grade: null }
    expect(parseQuery('M12')).toEqual([{ ...base, d: 12 }])
    expect(parseQuery('m12')).toEqual([{ ...base, d: 12 }])
    expect(parseQuery('Ｍ１２')).toEqual([{ ...base, d: 12 }])
    expect(parseQuery('ＭＩ２')).toEqual([{ ...base, d: 12 }]) // I（アイ）を 1 と打ち間違えたもの
    expect(parseQuery('M 12')).toEqual([{ ...base, d: 12 }])
    expect(parseQuery('M12の下穴')).toEqual([{ ...base, d: 12 }])
    expect(parseQuery('六角穴付きボルト M8')).toEqual([{ ...base, d: 8 }])
    expect(parseQuery('M12-7H')).toEqual([{ ...base, d: 12, grade: 7 }])
    expect(parseQuery('M12 6H')).toEqual([{ ...base, d: 12, grade: 6 }])
    for (const text of ['m12x1.25', 'M12×1.25', 'M12 x 1.25', 'M12ｘ1.25', 'M12*1.25', 'M12 1.25']) {
      expect(parseQuery(text), text).toEqual([{ ...base, d: 12, second: 1.25 }])
    }
    expect(parseQuery('M10 × 1.25')).toEqual([{ ...base, d: 10, second: 1.25 }])
    expect(parseQuery('M12P1.25')).toEqual([{ ...base, d: 12, second: 1.25, pitchExplicit: true }])
    expect(parseQuery('M5.5')).toEqual([{ ...base, d: 5.5 }])
  })

  it('鋼管の呼び径（A・B）と規格', () => {
    expect(parseQuery('50A')).toEqual([{ type: 'pipe', nominal: { system: 'A', a: '50A' }, spec: null }])
    expect(parseQuery('50a')).toEqual([{ type: 'pipe', nominal: { system: 'A', a: '50A' }, spec: null }])
    expect(parseQuery('2B')).toEqual([{ type: 'pipe', nominal: { system: 'B', b: '2' }, spec: null }])
    expect(parseQuery('2 1/2B')).toEqual([{ type: 'pipe', nominal: { system: 'B', b: '2 1/2' }, spec: null }])
    expect(parseQuery('2-1/2B')).toEqual([{ type: 'pipe', nominal: { system: 'B', b: '2 1/2' }, spec: null }])
    expect(parseQuery('2インチ')).toEqual([{ type: 'pipe', nominal: { system: 'B', b: '2' }, spec: null }])
    expect(parseQuery('50A Sch80')).toEqual([{ type: 'pipe', nominal: { system: 'A', a: '50A' }, spec: 'sch80' }])
    expect(parseQuery('SGP50A')).toEqual([{ type: 'pipe', nominal: { system: 'A', a: '50A' }, spec: 'sgp' }])
  })

  it('フランジ（呼び圧力 + 呼び径）', () => {
    const f = { type: 'flange', pressure: '10K', nominal: { system: 'A', a: '50A' } }
    expect(parseQuery('10K 50A')).toEqual([f])
    expect(parseQuery('10k50a')).toEqual([f])
    expect(parseQuery('10K-50A')).toEqual([f])
    expect(parseQuery('50A 10K')).toEqual([f])
    expect(parseQuery('ＪＩＳ１０Ｋ　５０Ａ')).toEqual([f])
    expect(parseQuery('10K 2B')).toEqual([{ ...f, nominal: { system: 'B', b: '2' } }])
    expect(parseQuery('10K')).toEqual([{ type: 'flangePressure', pressure: '10K' }])
  })

  it('Oリング（P・G、A 付き）', () => {
    expect(parseQuery('P20')).toEqual([{ type: 'oring', series: 'P', no: 'P20' }])
    expect(parseQuery('p22a')).toEqual([{ type: 'oring', series: 'P', no: 'P22A' }])
    expect(parseQuery('P 22.4')).toEqual([{ type: 'oring', series: 'P', no: 'P22.4' }])
    expect(parseQuery('OリングP20')).toEqual([{ type: 'oring', series: 'P', no: 'P20' }])
    expect(parseQuery('O-ring p20')).toEqual([{ type: 'oring', series: 'P', no: 'P20' }])
  })

  it('管用ねじ（今の記号と旧JIS記号）', () => {
    const t = (prefix: string, kinds: string[], old: string | null, size: string) => ({
      type: 'pipeThread',
      prefix,
      kinds,
      old,
      size,
      sizeText: expect.any(String),
    })
    expect(parseQuery('Rc1/2')).toEqual([t('RC', ['Rc'], null, '1/2')])
    expect(parseQuery('rc 1/2')).toEqual([t('RC', ['Rc'], null, '1/2')])
    expect(parseQuery('R1 1/2')).toEqual([t('R', ['R'], null, '1 1/2')])
    expect(parseQuery('Rp3/4')).toEqual([t('RP', ['Rp'], null, '3/4')])
    expect(parseQuery('PT1/2')).toEqual([t('PT', ['R', 'Rc'], 'PT', '1/2')])
    expect(parseQuery('PS3/4')).toEqual([t('PS', ['Rp'], 'PS', '3/4')])
    expect(parseQuery('PF3/8')).toEqual([t('PF', ['G'], 'PF', '3/8')])
    expect(parseQuery('ＰＦ３／８')).toEqual([t('PF', ['G'], 'PF', '3/8')])
    expect(parseQuery('PT½')).toEqual([t('PT', ['R', 'Rc'], 'PT', '1/2')])
  })

  it('G は分数なら管用ねじ、整数なら Oリングと管用ねじの両方の候補にする', () => {
    expect(parseQuery('G1/4').map((i) => i.type)).toEqual(['pipeThread'])
    expect(parseQuery('G1 1/2').map((i) => i.type)).toEqual(['pipeThread'])
    expect(parseQuery('G25').map((i) => i.type)).toEqual(['oring', 'pipeThread'])
    expect(parseQuery('G2').map((i) => i.type)).toEqual(['oring', 'pipeThread'])
  })

  it('二面幅（スパナ）と六角レンチ', () => {
    for (const text of ['二面幅17', 'スパナ17', '17mm スパナ', 'スパナ 17mm', '17スパナ', 'S17', 'ソケットレンチ 17', 'メガネレンチ17']) {
      expect(parseQuery(text), text).toEqual([{ type: 'acrossFlats', s: 17 }])
    }
    for (const text of ['レンチ14', '六角レンチ 14', '六角棒スパナ14', 'ヘックス14', 'hex 14']) {
      expect(parseQuery(text), text).toEqual([{ type: 'hexKey', s: 14 }])
    }
    expect(parseQuery('二面幅5.5')).toEqual([{ type: 'acrossFlats', s: 5.5 }])
    // 数字が2つ以上あると決められない
    expect(parseQuery('スパナ 17 19')).toEqual([])
  })

  it('数字だけ・対象外・読めない入力', () => {
    expect(parseQuery('17')).toEqual([{ type: 'number', text: '17' }])
    expect(parseQuery('1/2')).toEqual([{ type: 'number', text: '1/2' }])
    expect(parseQuery('NPT1/2')[0].type).toBe('unsupported')
    expect(parseQuery('UNC1/4')[0].type).toBe('unsupported')
    expect(parseQuery('1/4-20UNC')[0].type).toBe('unsupported')
    expect(parseQuery('W1/2')[0].type).toBe('unsupported')
    expect(parseQuery('')).toEqual([])
    expect(parseQuery('   ')).toEqual([])
    expect(parseQuery('フランジ')).toEqual([])
    expect(parseQuery('hello')).toEqual([])
    expect(parseQuery('P3/8')).toEqual([])
  })
})

describe('quickSearch: メートルねじ', () => {
  it('M12: 下穴・二面幅・六角レンチ・ボルト穴・使うフランジ', () => {
    const c = card('M12')
    expect(c.title).toBe('M12')
    expect(c.kind).toBe('メートル並目ねじ')

    const tap = section(c, 'ねじ下穴')
    expect(row(tap, '下穴径の目安（6H）').value).toBe('10.2')
    expect(row(tap, 'めねじ内径の許容範囲（6H）').value).toBe('10.106〜10.441')
    expect(row(tap, 'めねじ内径の許容範囲（6H）').note).toBe('D1 = 12 − 1.082532 × 1.75 = 10.106、公差 +0.335')
    expect(link(tap.href)).toEqual({ path: '/tap-drill', params: { d: '12', p: '1.75' } })
    expect(tap.standards).toContain('ISO 2306')
    expect(tap.links?.map((l) => l.label)).toEqual(['細目 ×1.5 → 10.5', '細目 ×1.25 → 10.8', '細目 ×1 → 11.0'])

    const bolt = section(c, 'ボルト・ナット')
    expect(row(bolt, '二面幅').value).toBe('18')
    expect(row(bolt, '二面幅').note).toContain('旧JIS（附属書JA）は 19')
    expect(row(bolt, '六角レンチ').value).toBe('10')
    expect(row(bolt, 'ボルト穴径（2級）').value).toBe('13.5')
    expect(row(bolt, 'ざぐり径').value).toBe('28')
    expect(link(bolt.href)).toEqual({ path: '/bolt-size', params: { d: '12' } })

    const flange = section(c, 'M12 のボルトを使うフランジ')
    expect(flange.table?.rows.map((r) => r.cells)).toEqual([
      ['5K', '32A〜65A'],
      ['10K', '10A〜20A'],
      ['16K', '10A〜20A'],
      ['20K', '10A〜20A'],
    ])
  })

  it('M16: 下穴 14.0・二面幅 24・六角レンチ 14・ボルト穴 17.5・ざぐり 35', () => {
    const c = card('M16')
    expect(row(section(c, 'ねじ下穴'), '下穴径の目安').value).toBe('14.0')
    const bolt = section(c, 'ボルト・ナット')
    expect(row(bolt, '二面幅').value).toBe('24')
    expect(row(bolt, '六角レンチ').value).toBe('14')
    expect(row(bolt, 'ボルト穴径（2級）').value).toBe('17.5')
    expect(row(bolt, 'ざぐり径').value).toBe('35')
    expect(flangesUsingBolt(16)).toEqual([
      { pressure: '5K', ranges: ['80A〜150A'], first: '80A' },
      { pressure: '10K', ranges: ['25A〜100A'], first: '25A' },
      { pressure: '16K', ranges: ['25A〜65A'], first: '25A' },
      { pressure: '20K', ranges: ['25A〜65A'], first: '25A' },
    ])
  })

  it('細目（M10×1.25）: そのピッチの下穴と、並目の下穴へのリンク。フランジ欄は出さない', () => {
    for (const text of ['M10 × 1.25', 'm10x1.25', 'M10P1.25']) {
      const c = card(text)
      expect(c.title).toBe('M10×1.25')
      expect(c.kind).toBe('メートル細目ねじ')
      const tap = section(c, 'ねじ下穴')
      expect(row(tap, '下穴径の目安（6H）').value).toBe('8.8')
      expect(link(tap.href)).toEqual({ path: '/tap-drill', params: { d: '10', p: '1.25' } })
      expect(tap.links?.[0]).toEqual({ label: '並目 ×1.5 → 8.5', href: '/tap-drill?d=10&p=1.5' })
      expect(tap.standards).not.toContain('ISO 2306')
      expect(section(c, 'ボルト・ナット').note).toContain('M10')
      expect(c.sections.some((s) => s.title.includes('フランジ'))).toBe(false)
    }
  })

  it('「M12×40」の40はボルトの長さとみなす', () => {
    const c = card('M12×40')
    expect(c.title).toBe('M12')
    expect(c.notes.join('')).toContain('長さ')
  })

  it('6H の規定が無いピッチは規定のある等級で出し、リンクにも等級を付ける', () => {
    const c = card('M1')
    const tap = section(c, 'ねじ下穴')
    expect(row(tap, '下穴径の目安（5H）').value).toBe('0.75')
    expect(link(tap.href).params).toEqual({ d: '1', p: '0.25', grade: '5' })
    expect(c.notes.join('')).toContain('5H')
    // 二面幅の表は M3〜M36
    expect(c.sections.some((s) => s.title === 'ボルト・ナット')).toBe(false)
  })

  it('等級の指定（M12-7H）', () => {
    const tap = section(card('M12-7H'), 'ねじ下穴')
    expect(row(tap, 'めねじ内径の許容範囲（7H）').value).toBe('10.106〜10.531')
    expect(link(tap.href).params).toEqual({ d: '12', p: '1.75', grade: '7' })
  })

  it('並目の無い呼び径（M5.5）は細目で出す', () => {
    const c = card('M5.5')
    expect(c.title).toBe('M5.5×0.5')
    expect(c.notes.join('')).toContain('並目がない')
  })

  it('規格に無い呼び径・ピッチは、近い候補を出す', () => {
    expect(quickSearch('M13')).toMatchObject({ status: 'invalid', suggestions: ['M12', 'M14'] })
    expect(quickSearch('M13').messages[0]).toContain('M13')
    expect(quickSearch('M100')).toMatchObject({ status: 'invalid', suggestions: ['M68'] })
    const pitch = quickSearch('M10x3')
    expect(pitch.status).toBe('invalid')
    expect(pitch.suggestions).toEqual(['M10', 'M10×1.25', 'M10×1', 'M10×0.75'])
  })

  it('収録している全サイズ・全ピッチでカードを作れる', () => {
    for (const size of METRIC_SIZES) {
      for (const p of [size.coarse, ...size.fine].filter((v): v is number => v !== null)) {
        const result = quickSearch(`M${size.d}×${p}`)
        expect(result.status, `M${size.d}×${p}`).toBe('found')
        expect(section(result.cards[0], 'ねじ下穴').rows[0].value).not.toBe('—')
      }
    }
  })
})

describe('quickSearch: 鋼管・フランジ', () => {
  it('50A: SGP・Sch40・Sch80、R2、フランジ 5K〜20K', () => {
    const c = card('50A')
    expect(c.title).toBe('50A（2B）')
    const pipe = section(c, '鋼管')
    expect(row(pipe, '外径').value).toBe('60.5')
    expect(pipe.table?.rows.map((r) => r.cells)).toEqual([
      ['SGP', '3.8', '52.9', '5.31'],
      ['Sch40', '3.9', '52.7', '5.44'],
      ['Sch80', '5.5', '49.5', '7.46'],
    ])
    expect(link(pipe.table!.rows[2].href!)).toEqual({ path: '/steel-pipe', params: { spec: 'sch80', a: '50A' } })

    const thread = section(c, '管用ねじ')
    expect(row(thread, '山数').value).toBe('11')
    expect(row(thread, '外径 d').value).toBe('59.614')
    expect(thread.links?.map((l) => link(l.href).params)).toContainEqual({ size: '2', kind: 'Rc' })

    const flange = section(c, 'フランジ')
    expect(flange.table?.rows.map((r) => r.cells)).toEqual([
      ['5K', '130', '105', '4-φ15', 'M12'],
      ['10K', '155', '120', '4-φ19', 'M16'],
      ['16K', '155', '120', '8-φ19', 'M16'],
      ['20K', '155', '120', '8-φ19', 'M16'],
    ])
    expect(link(flange.href)).toEqual({ path: '/flange-bolt-length', params: { pressure: '10K', size: '50A' } })
  })

  it('B 呼称も同じカードになる（2B・2 1/2B・11/2B・1½B）', () => {
    expect(card('2B').title).toBe('50A（2B）')
    expect(card('2 1/2B').title).toBe('65A（2 1/2B）')
    expect(card('11/2B').title).toBe('40A（1 1/2B）')
    expect(card('1½B').title).toBe('40A（1 1/2B）')
  })

  it('規格の指定（Sch80）は表で強調し、リンクもその規格にする', () => {
    const pipe = section(card('50A Sch80'), '鋼管')
    expect(pipe.table?.rows.find((r) => r.highlight)?.cells[0]).toBe('Sch80')
    expect(link(pipe.href).params).toEqual({ spec: 'sch80', a: '50A' })
    // Sch の無いサイズ
    const c = card('175A Sch40')
    expect(c.notes.join('')).toContain('SGP のみ')
    expect(link(section(c, '鋼管').href).params.spec).toBe('sgp')
  })

  it('10K 50A: フランジ寸法と、条件を明示したボルト長さの目安', () => {
    for (const text of ['10K 50A', '10k50a', '50A 10K', '10K 2B']) {
      const c = card(text)
      expect(c.title).toBe('10K 50A')
      const dims = section(c, 'フランジ寸法')
      expect(row(dims, '外径 D').value).toBe('155')
      expect(row(dims, 'ボルト穴中心円').value).toBe('120')
      expect(row(dims, 'ボルト穴（').value).toBe('4-φ19')
      expect(dims.rows.find((r) => r.label === 'ボルト')?.value).toBe('M16 × 4本')
    }
    const lengths = section(card('10K 50A'), 'ボルト長さ')
    const expected = boltLength({ bolt: 16, t1: 16, t2: 16, gasket: 3, washers: 0, nut: 'style1', threads: 3, type: 'hex', rounding: '5mm' })
    expect(row(lengths, '六角ボルト').value).toBe(`M16×${expected.length}`)
    expect(expected.length).toBe(60)
    expect(row(lengths, '六角ボルト').note).toBe('16 × 2 + 3 + 14.8 + 3 × 2 = 55.8 → 5mm 刻みに切り上げ')
    expect(row(lengths, 'スタッドボルト').value).toBe('M16×80')
    expect(link(lengths.href).params).toEqual({
      pressure: '10K',
      size: '50A',
      type: 'hex',
      gasket: '3',
      nut: 'style1',
      washers: '0',
      threads: '3',
      rounding: '5mm',
    })
  })

  it('無いサイズ・呼び圧力は理由と候補を出す', () => {
    const noSize = quickSearch('16K 90A')
    expect(noSize.status).toBe('invalid')
    expect(noSize.messages[0]).toContain('5K・10K')
    expect(noSize.suggestions).toEqual(['16K 80A', '16K 100A', '5K 90A', '10K 90A'])
    expect(quickSearch('30K 50A')).toMatchObject({ status: 'invalid' })
    expect(quickSearch('10K')).toMatchObject({ status: 'invalid', suggestions: ['10K 50A', '10K 100A'] })
    expect(quickSearch('12A')).toMatchObject({ status: 'invalid', suggestions: ['10A', '15A'] })
  })

  it('収録している全サイズでカードを作れる', () => {
    for (const size of PIPE_SIZES) expect(quickSearch(size.a).status, size.a).toBe('found')
    for (const size of PIPE_SIZES) expect(quickSearch(`${size.b}B`).status, `${size.b}B`).toBe('found')
    for (const pressure of PRESSURE_CLASSES) {
      for (const row of FLANGES[pressure]) {
        expect(quickSearch(`${pressure} ${row.size}`).status, `${pressure} ${row.size}`).toBe('found')
      }
    }
  })
})

describe('quickSearch: Oリング', () => {
  it('P20: d1×d2 と溝の d・D・b', () => {
    const c = card('P20')
    expect(c.title).toBe('P20')
    const ring = section(c, 'Oリング')
    expect(row(ring, '内径 d1 × 太さ d2').value).toBe('19.8 × 2.4')
    expect(row(ring, '内径 d1 × 太さ d2').note).toContain('±0.22')
    expect(row(ring, '内径 d1 × 太さ d2').note).toContain('±0.09')
    const groove = section(c, '溝（円筒面）')
    expect(row(groove, 'd（').value).toBe('20')
    expect(row(groove, 'D（').value).toBe('24')
    expect(row(groove, '溝幅 b').value).toBe('3.2')
    expect(link(groove.href)).toEqual({ path: '/o-ring', params: { series: 'P', no: 'P20', groove: 'cylinder' } })
    const flat = section(c, '溝（平面')
    expect(row(flat, '内圧用の溝外径').value).toBe('24')
    expect(row(flat, '外圧用の溝内径').value).toBe('20')
  })

  it('p22a は P22A（太さ 3.5 のグループ）', () => {
    const c = card('p22a')
    expect(c.title).toBe('P22A')
    expect(row(section(c, 'Oリング'), '内径 d1 × 太さ d2').value).toBe('21.7 × 3.5')
  })

  it('G50 は Oリング（管用ねじには無い呼び）と理由を添える', () => {
    const c = card('G50')
    expect(c.kind).toContain('Oリング G')
    expect(c.notes[0]).toContain('管用ねじの呼び')
    expect(link(section(c, 'Oリング').href).params).toEqual({ series: 'G', no: 'G50' })
  })

  it('無い番号は前後の番号を候補に出す', () => {
    expect(quickSearch('P19')).toMatchObject({ status: 'invalid', suggestions: ['P18', 'P20'] })
    expect(quickSearch('G27')).toMatchObject({ status: 'invalid', suggestions: ['G25', 'G30'] })
  })

  it('全番号でカードを作れる', () => {
    for (const series of ['P', 'G'] as const) {
      for (const no of oRingNumbers(series)) expect(quickSearch(no).status, no).toBe('found')
    }
  })
})

describe('quickSearch: 管用ねじ', () => {
  it('PT1/2 は R1/2・Rc1/2（旧JIS の読み替えを添える）', () => {
    const c = card('PT1/2')
    expect(c.title).toBe('R1/2・Rc1/2')
    expect(c.notes[0]).toContain('PT1/2')
    const base = section(c, '基準寸法')
    expect(row(base, '山数').value).toBe('14')
    expect(row(base, '外径 d').value).toBe('20.955')
    expect(link(base.href)).toEqual({ path: '/pipe-thread', params: { size: '1/2', kind: 'Rc' } })
  })

  it('Rc1/2: 奥端のめねじ内径の目安', () => {
    const c = card('Rc1/2')
    expect(c.title).toBe('Rc1/2')
    expect(row(section(c, 'ねじ加工'), 'Rc 奥端').value).toBe('17.84')
  })

  it('PF3/8・G1/4: G の推奨下穴径', () => {
    const pf = card('PF3/8')
    expect(pf.title).toBe('G3/8')
    expect(pf.notes[0]).toContain('PF3/8')
    expect(row(section(pf, 'ねじ加工'), 'G めねじの推奨下穴径').value).toBe(
      gRecommendedDrill(findPipeThread('3/8')!).toFixed(1),
    )
    const g = card('G1/4')
    expect(g.title).toBe('G1/4')
    expect(link(section(g, '基準寸法').href).params).toEqual({ size: '1/4', kind: 'G' })
  })

  it('G2 は管用平行ねじ（Oリング G 系列には無い）と理由を添える', () => {
    const c = card('G2')
    expect(c.kind).toBe('管用平行ねじ')
    expect(c.notes[0]).toContain('Oリング')
  })

  it('2つの解釈が両方データに有るときは、両方のカードを出して知らせる', () => {
    const oring = card('G50')
    const thread = card('G1/4')
    const merged = mergeResults('GX', 2, [{ card: oring }, { card: thread }])
    expect(merged.status).toBe('found')
    expect(merged.cards).toHaveLength(2)
    expect(merged.messages[0]).toContain('両方')
    // 1つだけなら理由をカードに添える
    const single = mergeResults('GX', 2, [{ card: thread }, { message: 'x', reason: 'Oリングの G 系列は G25〜G300' }])
    expect(single.cards[0].notes[0]).toBe('「GX」は管用平行ねじとして表示しています（Oリングの G 系列は G25〜G300）。')
    expect(single.messages).toEqual([])
  })

  it('どちらにも無い G7 は、両方の理由を出す', () => {
    const result = quickSearch('G7')
    expect(result.status).toBe('invalid')
    expect(result.messages).toHaveLength(2)
  })

  it('全サイズ・全種類でカードを作れる', () => {
    for (const thread of PIPE_THREAD_SIZES) {
      for (const prefix of ['R', 'Rc', 'Rp', 'G', 'PT', 'PS', 'PF']) {
        expect(quickSearch(`${prefix}${thread.size}`).status, `${prefix}${thread.size}`).toBe('found')
      }
    }
  })
})

describe('quickSearch: 二面幅・六角レンチ', () => {
  it('二面幅17 は M10 の旧JIS', () => {
    for (const text of ['二面幅17', 'スパナ17', '17mm スパナ']) {
      const c = card(text)
      expect(c.title).toBe('二面幅 17 mm')
      const s = section(c, '六角ボルト・ナット')
      expect(s.table?.rows.map((r) => r.cells)).toEqual([['M10', '旧JIS（附属書JA）', 'JIS本体は 16']])
      expect(link(s.table!.rows[0].href!)).toEqual({ path: '/bolt-size', params: { d: '10' } })
    }
  })

  it('二面幅24 は本体・旧JIS とも M16', () => {
    const s = section(card('二面幅24'), '六角ボルト・ナット')
    expect(s.table?.rows.map((r) => r.cells[0])).toEqual(['M16'])
  })

  it('レンチ14 は M16 と M18（JIS B 1176 に無いサイズ）', () => {
    const c = card('レンチ14')
    expect(c.title).toBe('六角レンチ 14 mm')
    const s = section(c, '六角穴付きボルト')
    expect(s.table?.rows.map((r) => [r.cells[0], r.cells[2]])).toEqual([
      ['M16', '—'],
      ['M18', 'JIS B 1176 に無いサイズ'],
    ])
  })

  it('当てはまらない寸法は前後の寸法を候補に出す', () => {
    expect(quickSearch('二面幅15')).toMatchObject({ status: 'invalid', suggestions: ['二面幅13', '二面幅16'] })
    expect(quickSearch('レンチ15')).toMatchObject({ status: 'invalid', suggestions: ['レンチ14', 'レンチ17'] })
  })

  it('全サイズの二面幅・六角レンチでカードを作れる', () => {
    for (const bolt of BOLT_SIZES) {
      expect(quickSearch(`二面幅${bolt.sIso}`).status).toBe('found')
      expect(quickSearch(`二面幅${bolt.sJa}`).status).toBe('found')
      expect(quickSearch(`レンチ${bolt.capKey}`).status).toBe('found')
    }
  })
})

describe('quickSearch: 数字だけ・対象外・未入力', () => {
  it('数字だけなら、当てはまりそうな呼びを候補に出す', () => {
    expect(quickSearch('17')).toMatchObject({ status: 'invalid', suggestions: ['M17', '二面幅17', 'レンチ17'] })
    expect(numberSuggestions('50')).toEqual(['M50', '50A', 'P50', 'G50'])
    expect(numberSuggestions('1/2')).toEqual(['1/2B', 'Rc1/2', 'G1/2'])
    expect(numberSuggestions('9999')).toEqual([])
  })

  it('候補はそのまま検索できる', () => {
    for (const suggestion of [...numberSuggestions('50'), ...numberSuggestions('1/2'), ...numberSuggestions('17')]) {
      expect(quickSearch(suggestion).status, suggestion).toBe('found')
    }
  })

  it('対象外のねじは理由を出す', () => {
    expect(quickSearch('NPT1/2')).toMatchObject({ status: 'invalid' })
    expect(quickSearch('NPT1/2').messages[0]).toContain('NPT')
  })

  it('未入力・読めない入力', () => {
    expect(quickSearch('')).toEqual({ status: 'empty', normalized: '', cards: [], messages: [], suggestions: [] })
    expect(quickSearch('   ').status).toBe('empty')
    expect(quickSearch('フランジ')).toMatchObject({ status: 'unknown', cards: [] })
    expect(quickSearch('あいうえお').status).toBe('unknown')
  })

  it('入力例はすべて見つかる', () => {
    for (const example of SEARCH_EXAMPLES) expect(quickSearch(example).status, example).toBe('found')
  })
})

describe('リンクとツール', () => {
  it('リンク先のパスは、登録されているツール', () => {
    const paths = TOOLS.map((tool) => tool.path)
    for (const path of Object.values(SEARCH_TOOL_PATHS)) expect(paths).toContain(path)
  })

  it('カードのリンクは、すべて登録済みのツールを指す', () => {
    const paths = new Set(TOOLS.map((tool) => tool.path))
    for (const query of [...SEARCH_EXAMPLES, 'PT1/2', 'M1', '50A Sch80']) {
      for (const c of quickSearch(query).cards) {
        for (const s of c.sections) {
          const hrefs = [s.href, ...(s.links ?? []).map((l) => l.href), ...(s.table?.rows ?? []).flatMap((r) => (r.href ? [r.href] : []))]
          for (const href of hrefs) expect(paths.has(link(href).path), href).toBe(true)
        }
      }
    }
  })

  it('言葉でツールを探す', () => {
    const tools = [
      { path: '/a', name: 'JISフランジ＆ボルト長さ', navLabel: 'フランジ', description: '鋼製管フランジ' },
      { path: '/b', name: 'Oリング・溝', navLabel: 'Oリング', description: 'P・G' },
    ]
    expect(matchTools('フランジ', tools).map((t) => t.path)).toEqual(['/a'])
    expect(matchTools('ｏリング', tools).map((t) => t.path)).toEqual(['/b'])
    expect(matchTools('フランジ ボルト', tools).map((t) => t.path)).toEqual(['/a'])
    expect(matchTools('', tools)).toEqual([])
    expect(matchTools('フランジ', TOOLS).map((t) => t.path)).toContain('/flange-bolt-length')
  })
})
