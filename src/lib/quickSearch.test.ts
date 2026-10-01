import { describe, expect, it } from 'vitest'
import {
  BOLT_SIZES,
  isUnverified as isBoltUnverified,
  UNVERIFIED as BOLT_UNVERIFIED,
  UNVERIFIED_LEGEND as BOLT_UNVERIFIED_LEGEND,
} from '../features/bolt-size/data'
import { boltLength, isRowUnverified, isUnverified } from '../features/flange-bolt/calc'
import { FLANGES, PRESSURE_CLASSES, UNVERIFIED_LEGEND } from '../features/flange-bolt/data'
import { oRingNumbers } from '../features/o-ring/calc'
import { findPipeThread, gRecommendedDrill } from '../features/pipe-thread/calc'
import { PIPE_THREAD_SIZES } from '../features/pipe-thread/data'
import { PIPE_SIZES } from '../features/steel-pipe/data'
import { threadName, threadsForDrill } from '../features/tap-drill/calc'
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
  TOOL_ALIASES,
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
    // カタログの「1.1/2」（1 と 1/2 の間の点）
    expect(canonicalInch('1.1/2')).toBe('1 1/2')
    expect(canonicalInch('1.1/4')).toBe('1 1/4')
    expect(canonicalInch('2.1/2')).toBe('2 1/2')
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

  it('長さ付きの書き方（M16×1.5×50・M12L50・M12×L50）', () => {
    const base = { type: 'metric', second: null, pitchExplicit: false, grade: null }
    for (const text of ['M16×1.5×50', 'm16x1.5x50', 'M16 × 1.5 × 50', 'M16×1.5×50mm']) {
      expect(parseQuery(text), text).toEqual([{ ...base, d: 16, second: 1.5, length: 50, lengthText: '×50' }])
    }
    expect(parseQuery('M3x0.5x10')).toEqual([{ ...base, d: 3, second: 0.5, length: 10, lengthText: '×10' }])
    for (const text of ['M12L50', 'M12×L50', 'M12 L50', 'M12-L50', 'M12 L=50', 'M12L50mm']) {
      expect(parseQuery(text), text).toEqual([{ ...base, d: 12, length: 50, lengthText: 'L50' }])
    }
    expect(parseQuery('M12×1.25L30')).toEqual([{ ...base, d: 12, second: 1.25, length: 30, lengthText: 'L30' }])
    expect(parseQuery('M12mm')).toEqual([{ ...base, d: 12 }])
  })

  it('I・L を 1 とみなすのは M の直後だけ（M10L を M101 と読まない）', () => {
    const base = { type: 'metric', second: null, pitchExplicit: false, grade: null }
    expect(parseQuery('ML2')).toEqual([{ ...base, d: 12 }])
    expect(parseQuery('M10L')).toEqual([])
    expect(parseQuery('M1L')).toEqual([])
    expect(parseQuery('M8L20')).toEqual([{ ...base, d: 8, length: 20, lengthText: 'L20' }])
  })

  it('公差域クラス（めねじ 6H・はめあい 6H/6g・おねじ 6g）', () => {
    const base = { type: 'metric', second: null, pitchExplicit: false, grade: null }
    expect(parseQuery('M12-6H/6g')).toEqual([{ ...base, d: 12, grade: 6 }])
    expect(parseQuery('M10-6g')).toEqual([{ ...base, d: 10, externalClass: '6g' }])
    expect(parseQuery('M10 6g')).toEqual([{ ...base, d: 10, externalClass: '6g' }])
    expect(parseQuery('M12×1.25-6g')).toEqual([{ ...base, d: 12, second: 1.25, externalClass: '6g' }])
    expect(parseQuery('M10-5g6g')).toEqual([{ ...base, d: 10, externalClass: '5g6g' }])
    // 大文字の 6G はめねじの公差位置 G の可能性もある
    expect(parseQuery('M10-6G')).toEqual([{ ...base, d: 10, externalClass: '6g', upperG: true }])
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
    expect(parseQuery('10K 1.1/4B')).toEqual([{ ...f, nominal: { system: 'B', b: '1 1/4' } }])
    expect(parseQuery('10K')).toEqual([{ type: 'flangePressure', pressure: '10K' }])
  })

  it('フランジの呼び径は A・B を付けない数字でもよい（10K 50）', () => {
    const f = { type: 'flange', pressure: '10K', nominal: { system: 'A', a: '50A' }, bare: '50' }
    for (const text of ['10K 50', '10k50', '10K-50', '50 10K', '50-10K']) {
      expect(parseQuery(text), text).toEqual([f])
    }
    // 区切りの無い「5010K」は読まない
    expect(parseQuery('5010K')).toEqual([])
  })

  it('鋼管の規格は STPG370 Sch40 のようにも書ける', () => {
    const p = { type: 'pipe', nominal: { system: 'A', a: '50A' } }
    expect(parseQuery('STPG370 Sch40 50A')).toEqual([{ ...p, spec: 'sch40' }])
    expect(parseQuery('50A STPG410-Sch80')).toEqual([{ ...p, spec: 'sch80' }])
    expect(parseQuery('1.1/2B')).toEqual([{ type: 'pipe', nominal: { system: 'B', b: '1 1/2' }, spec: null }])
  })

  it('Oリング（P・G、A 付き）', () => {
    expect(parseQuery('P20')).toEqual([{ type: 'oring', series: 'P', no: 'P20' }])
    expect(parseQuery('p22a')).toEqual([{ type: 'oring', series: 'P', no: 'P22A' }])
    expect(parseQuery('P 22.4')).toEqual([{ type: 'oring', series: 'P', no: 'P22.4' }])
    expect(parseQuery('OリングP20')).toEqual([{ type: 'oring', series: 'P', no: 'P20' }])
    expect(parseQuery('O-ring p20')).toEqual([{ type: 'oring', series: 'P', no: 'P20' }])
  })

  it('Oリングの袋・カタログの書き方（P-20・1A-P20・4D-G50）', () => {
    expect(parseQuery('P-20')).toEqual([{ type: 'oring', series: 'P', no: 'P20' }])
    expect(parseQuery('p - 22a')).toEqual([{ type: 'oring', series: 'P', no: 'P22A' }])
    expect(parseQuery('1A-P20')).toEqual([{ type: 'oring', series: 'P', no: 'P20', material: '1A' }])
    expect(parseQuery('1A P20')).toEqual([{ type: 'oring', series: 'P', no: 'P20', material: '1A' }])
    expect(parseQuery('1A-P-20')).toEqual([{ type: 'oring', series: 'P', no: 'P20', material: '1A' }])
    expect(parseQuery('4C-P10A')).toEqual([{ type: 'oring', series: 'P', no: 'P10A', material: '4C' }])
    expect(parseQuery('NBR-70 P20')).toEqual([{ type: 'oring', series: 'P', no: 'P20', material: 'NBR-70' }])
    // G は Oリングと管用ねじの両方の候補（4D-G50 の 4D は材料）
    expect(parseQuery('4D-G50')).toEqual([{ type: 'oring', series: 'G', no: 'G50', material: '4D' }])
    expect(parseQuery('G-50').map((i) => i.type)).toEqual(['oring', 'pipeThread'])
    // 分数は Oリングとは読まない
    expect(parseQuery('G-1/2').map((i) => i.type)).toEqual(['pipeThread'])
  })

  it('ドリル径（φ8.5・ドリル8.5・キリ8.5・下穴10.2・8.5キリ）', () => {
    for (const text of ['φ8.5', 'Φ8.5', 'ø8.5', 'Ø 8.5', '⌀8.5', 'φ8.5mm', 'ドリル8.5', 'ドリル径 8.5', 'キリ8.5', 'きり8.5', '下穴8.5', '下穴径8.5', '8.5キリ', '8.5のキリ', '8.5mmドリル', 'ｷﾘ8.5']) {
      expect(parseQuery(text), text).toEqual([{ type: 'drill', drill: 8.5 }])
    }
    expect(parseQuery('下穴10.2')).toEqual([{ type: 'drill', drill: 10.2 }])
    expect(parseQuery('φ0')).toEqual([])
    // M の呼びがあれば、ねじの下穴として読む
    expect(parseQuery('M12の下穴')[0].type).toBe('metric')
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
    // カタログの「1.1/4」
    expect(parseQuery('Rc1.1/4')).toEqual([t('RC', ['Rc'], null, '1 1/4')])
    expect(parseQuery('PT1.1/2')).toEqual([t('PT', ['R', 'Rc'], 'PT', '1 1/2')])
  })

  it('G おねじの等級（G1/2A・G1/2B）。R・Rc・Rp の A は読まない', () => {
    const g = (prefix: string, old: string | null, gClass: string) => ({
      type: 'pipeThread',
      prefix,
      kinds: ['G'],
      old,
      size: '1/2',
      sizeText: '1/2',
      gClass,
    })
    expect(parseQuery('G1/2A')).toEqual([g('G', null, 'A')])
    expect(parseQuery('Ｇ１／２Ａ')).toEqual([g('G', null, 'A')])
    expect(parseQuery('G 1/2 A')).toEqual([g('G', null, 'A')])
    expect(parseQuery('G1/2B')).toEqual([g('G', null, 'B')])
    expect(parseQuery('PF1/2A')).toEqual([g('PF', 'PF', 'A')])
    expect(parseQuery('R1/2A')).toEqual([])
    expect(parseQuery('Rc1/2A')).toEqual([])
    // Rc の B は B 呼称（等級は付けない）
    expect(parseQuery('Rc1/2B')).toEqual([
      { type: 'pipeThread', prefix: 'RC', kinds: ['Rc'], old: null, size: '1/2', sizeText: '1/2' },
    ])
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
    for (const text of ['六角レンチ 14', '六角棒スパナ14', 'ヘックス14', 'hex 14']) {
      expect(parseQuery(text), text).toEqual([{ type: 'hexKey', s: 14 }])
    }
    // 「レンチ」だけなら六角レンチとスパナ類の両方で探す
    for (const text of ['レンチ14', 'トルクレンチ14', '14mmレンチ']) {
      expect(parseQuery(text), text).toEqual([
        { type: 'hexKey', s: 14 },
        { type: 'acrossFlats', s: 14 },
      ])
    }
    for (const text of ['ボックスレンチ13', 'ラチェット13']) {
      expect(parseQuery(text), text).toEqual([{ type: 'acrossFlats', s: 13 }])
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

  it('下穴径の表示はねじ下穴径ツールと同じ（2.5・4.2・0.8。2.50 としない）', () => {
    expect(row(section(card('M3'), 'ねじ下穴'), '下穴径の目安').value).toBe('2.5')
    expect(row(section(card('M4'), 'ねじ下穴'), '下穴径の目安').value).toBe('3.3')
    const m5 = section(card('M5'), 'ねじ下穴')
    expect(row(m5, '下穴径の目安').value).toBe('4.2')
    expect(m5.links?.map((l) => l.label)).toEqual(['細目 ×0.5 → 4.5'])
    expect(section(card('M1'), 'ねじ下穴').links?.map((l) => l.label)).toEqual(['細目 ×0.2 → 0.8（4H）'])
    // 0.05mm 刻みの径は2桁、整数は小数1桁（ツールの formatHole と同じ）
    for (const size of METRIC_SIZES) {
      for (const p of [size.coarse, ...size.fine].filter((v): v is number => v !== null)) {
        const value = row(section(card(`M${size.d}×${p}`), 'ねじ下穴'), '下穴径の目安').value
        expect(value, `M${size.d}×${p}`).toMatch(/^\d+\.(?:\d|\d5)$/)
      }
    }
  })

  it('長さ付き（M16×1.5×50・M12L50）は長さを外して表示し、注記を添える', () => {
    for (const text of ['M16×1.5×50', 'M16x1.5x50mm']) {
      const c = card(text)
      expect(c.title).toBe('M16×1.5')
      expect(c.notes.join('')).toContain('「×50」はボルトの長さ')
    }
    expect(card('M12×1.25×30').title).toBe('M12×1.25')
    expect(card('M3x0.5x10').title).toBe('M3')
    for (const text of ['M12L50', 'M12×L50', 'M12 L50']) {
      const c = card(text)
      expect(c.title, text).toBe('M12')
      expect(c.notes.join(''), text).toContain('「L50」はボルトの長さ')
    }
    // ×ピッチ×長さ のピッチが無いときは、ピッチの候補を出す
    expect(quickSearch('M16×3×50')).toMatchObject({ status: 'invalid' })
    expect(quickSearch('M16×3×50').messages[0]).toContain('ピッチ 3 mm はありません')
  })

  it('おねじの公差域クラス（M10-6g）は下穴の計算に使わないことを添えて表示する', () => {
    const c = card('M10-6g')
    expect(c.title).toBe('M10')
    expect(c.notes.join('')).toContain('「6g」はおねじの公差域クラス')
    expect(row(section(c, 'ねじ下穴'), '下穴径の目安（6H）').value).toBe('8.5')
    expect(card('M12×1.25-6g').title).toBe('M12×1.25')
    expect(card('M10-6G').notes.join('')).toContain('公差位置 G')
  })

  it('二面幅・ボルト穴が無い呼び径（M33・M7）は「収録していない」と書く', () => {
    expect(card('M33').notes.join('')).toContain('M33 の二面幅・ボルト穴は収録していません')
    expect(card('M33').notes.join('')).toContain('M30・M36')
    expect(card('M7').notes.join('')).toContain('M7 の二面幅・ボルト穴は収録していません')
    // 範囲の外は、収録範囲を書く
    expect(card('M2').notes.join('')).toContain('M3〜M36 を収録')
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

  it('A・B の無い数字（10K 50）は A 呼称で読み、無ければ B 呼称（10K 2 → 50A）', () => {
    const c = card('10k 50')
    expect(c.title).toBe('10K 50A')
    expect(c.notes[0]).toBe('「50」は 50A として表示しています。')
    const b = card('10K 2')
    expect(b.title).toBe('10K 50A')
    expect(b.notes[0]).toBe('「2」は 2B（50A）として表示しています。')
    expect(card('50 10K').title).toBe('10K 50A')
    expect(card('10K 1.1/4B').title).toBe('10K 32A')
  })

  it('カタログの「1.1/2B」も読む', () => {
    expect(card('1.1/2B').title).toBe('40A（1 1/2B）')
    expect(card('1.1/4B').title).toBe('32A（1 1/4B）')
    expect(card('STPG370 Sch40 50A').title).toBe('50A（2B）')
    const pipe = section(card('STPG370 Sch40 50A'), '鋼管')
    expect(pipe.table?.rows.find((r) => r.highlight)?.cells[0]).toBe('Sch40')
  })

  it('G めねじの推奨下穴径は計算値と分かるようにする', () => {
    const thread = section(card('50A'), '管用ねじ')
    const g = row(thread, 'G めねじの推奨下穴径')
    expect(g.label).toBe('G めねじの推奨下穴径（計算値）')
    expect(g.value).toBe('57.0')
    expect(g.note).toContain('許容範囲')
    expect(g.note).toContain('規格の値ではありません')
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
    // A の付かない同じ番号があれば、それを最初に出す
    expect(quickSearch('P20A').suggestions[0]).toBe('P20')
    expect(quickSearch('G50A').suggestions).toContain('G50')
  })

  it('袋・カタログの書き方（P-20・1A-P20・4D-G50）でも同じカードを出す', () => {
    for (const text of ['P-20', '1A-P20', '1A P20', '1a-p20']) {
      const c = card(text)
      expect(c.title, text).toBe('P20')
      expect(row(section(c, 'Oリング'), '内径 d1 × 太さ d2').value).toBe('19.8 × 2.4')
    }
    expect(card('1A-P20').notes[0]).toContain('「1A」は材料の種類の記号')
    const g = card('4D-G50')
    expect(g.title).toBe('G50')
    expect(g.notes.join('')).toContain('内径の許容差が 1種〜3種 と違います')
    // 新しい材料記号の FKM（ふっ素ゴム）・VMQ（シリコーンゴム）も 4種D・4種C と同じ注意を出す
    for (const text of ['FKM-70 G50', 'VMQ-70 P20']) {
      expect(card(text).notes.join(''), text).toContain('内径の許容差が 1種〜3種 と違います')
    }
    // 1種〜3種（NBR など）には出さない
    for (const text of ['1A-P20', 'NBR-70 P20']) {
      expect(card(text).notes.join(''), text).not.toContain('許容差')
    }
    expect(card('P-22A').title).toBe('P22A')
    expect(card('4C-P10A').title).toBe('P10A')
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

  it('G1/2A（図面指示の書き方）は G1/2 のおねじ A級として出す', () => {
    for (const text of ['G1/2A', 'Ｇ１／２Ａ', 'G 1/2 A']) {
      const c = card(text)
      expect(c.title, text).toBe('G1/2')
      expect(c.notes.join(''), text).toContain('G のおねじ（有効径の公差 A級）')
    }
    expect(card('G1/2B').notes.join('')).toContain('B級')
    expect(card('PF1/2A').title).toBe('G1/2')
    expect(row(section(card('G1/2'), 'ねじ加工'), 'G めねじの推奨下穴径').label).toBe('G めねじの推奨下穴径（計算値）')
    expect(quickSearch('R1/2A').status).toBe('unknown')
  })

  it('カタログの「1.1/4」（Rc1.1/4・G1.1/2）も読む', () => {
    expect(card('Rc1.1/4').title).toBe('Rc1 1/4')
    expect(card('G1.1/2').title).toBe('G1 1/2')
    expect(card('PT1.1/2').title).toBe('R1 1/2・Rc1 1/2')
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
    expect(quickSearch('六角レンチ15')).toMatchObject({ status: 'invalid', suggestions: ['六角レンチ14', '六角レンチ17'] })
    // 「レンチ15」は六角レンチにもスパナにも無いので、両方の候補を出す
    const wrench = quickSearch('レンチ15')
    expect(wrench.status).toBe('invalid')
    expect(wrench.messages).toHaveLength(2)
    expect(wrench.suggestions).toEqual(['六角レンチ14', '六角レンチ17', '二面幅13', '二面幅16'])
  })

  it('「レンチ13」はスパナ（二面幅 13 = M8）として出し、六角レンチに無い理由を添える', () => {
    for (const text of ['レンチ13', 'トルクレンチ13', '13mmレンチ']) {
      const c = card(text)
      expect(c.title).toBe('二面幅 13 mm')
      expect(c.notes[0]).toContain('六角レンチ 13 mm')
      expect(section(c, '六角ボルト・ナット').table?.rows.map((r) => r.cells[0])).toEqual(['M8'])
    }
    expect(card('ボックスレンチ13').title).toBe('二面幅 13 mm')
    // 「レンチ24」は M16 のスパナ
    expect(section(card('レンチ24'), '六角ボルト・ナット').table?.rows.map((r) => r.cells[0])).toEqual(['M16'])
  })

  it('「レンチ14」は六角レンチだけ、「レンチ17」は両方に当てはまる', () => {
    const key = card('レンチ14')
    expect(key.title).toBe('六角レンチ 14 mm')
    expect(key.notes[0]).toContain('二面幅 14 mm')
    const both = quickSearch('レンチ17')
    expect(both.status).toBe('found')
    expect(both.cards.map((c) => c.title)).toEqual(['六角レンチ 17 mm', '二面幅 17 mm'])
    expect(both.messages[0]).toContain('両方')
  })

  it('二面幅 5.5（M3）は旧JIS の値が未確認なので ※ を付ける', () => {
    const s = section(card('二面幅5.5'), '六角ボルト・ナット')
    expect(s.table?.rows[0].cells).toEqual(['M3', 'JIS本体・旧JIS', '—'])
    expect(s.table?.rows[0].unverified).toEqual([false, true, false])
    expect(s.legend).toContain('規格原文で未確認')
    expect(s.legend).toContain('M3')
    // 確認済みの二面幅には付けない
    const ok = section(card('二面幅17'), '六角ボルト・ナット')
    expect(ok.table?.rows.every((r) => !r.unverified?.some(Boolean))).toBe(true)
    expect(ok.legend).toBeUndefined()
  })

  it('全サイズの二面幅・六角レンチでカードを作れる', () => {
    for (const bolt of BOLT_SIZES) {
      expect(quickSearch(`二面幅${bolt.sIso}`).status).toBe('found')
      expect(quickSearch(`二面幅${bolt.sJa}`).status).toBe('found')
      expect(quickSearch(`レンチ${bolt.capKey}`).status).toBe('found')
    }
  })
})

describe('quickSearch: 規格原文で未確認の値（※）', () => {
  /** カードのどこかに ※ を付けているか（行の値・表のセル・文章の ※） */
  function hasMark(c: SummaryCard): boolean {
    return c.sections.some(
      (s) =>
        s.rows.some((r) => r.unverified || r.note?.includes('※')) ||
        (s.table?.rows ?? []).some((r) => r.unverified?.some(Boolean)),
    )
  }

  it('凡例はフランジ・ボルトのツールと同じ文言', () => {
    expect(UNVERIFIED_LEGEND).toBe(BOLT_UNVERIFIED_LEGEND)
  })

  it('16K 50A: 厚さ t と、t から計算したボルト長さに ※。外径などには付けない', () => {
    const c = card('16K 50A')
    const dims = section(c, 'フランジ寸法')
    expect(row(dims, '厚さ t')).toMatchObject({ value: '16', unverified: true })
    expect(row(dims, '外径 D').unverified).toBe(false)
    expect(dims.legend).toBe(`${UNVERIFIED_LEGEND}（16K 50A のフランジ厚さ t）`)
    const lengths = section(c, 'ボルト長さ')
    expect(row(lengths, '六角ボルト')).toMatchObject({ value: 'M16×60', unverified: true })
    expect(row(lengths, 'スタッドボルト')).toMatchObject({ value: 'M16×80', unverified: true })
    expect(lengths.legend).toContain('長さも確認してください')
  })

  it('16K 100A・5K 50A（厚さが未確認）にも ※', () => {
    const c = card('16K 100A')
    expect(row(section(c, 'フランジ寸法'), '厚さ t')).toMatchObject({ value: '22', unverified: true })
    expect(row(section(c, 'ボルト長さ'), '六角ボルト')).toMatchObject({ value: 'M20×75', unverified: true })
    const five = card('5K 50A')
    expect(row(section(five, 'フランジ寸法'), '厚さ t')).toMatchObject({ value: '14', unverified: true })
    expect(row(section(five, 'ボルト長さ'), '六角ボルト').unverified).toBe(true)
  })

  it('5K 90A（寸法すべてが未確認）は全部の値に ※', () => {
    const c = card('5K 90A')
    const dims = section(c, 'フランジ寸法')
    expect(dims.rows.every((r) => r.unverified)).toBe(true)
    expect(dims.legend).toBe(`${UNVERIFIED_LEGEND}（5K 90A は寸法すべて）`)
    expect(section(c, 'ボルト長さ').rows.every((r) => r.unverified)).toBe(true)
  })

  it('10K 50A（確認済み）には ※ も凡例も出さない', () => {
    const c = card('10K 50A')
    expect(hasMark(c)).toBe(false)
    expect(c.sections.every((s) => s.legend === undefined)).toBe(true)
  })

  it('UNVERIFIED のすべての項目で、フランジのカードに ※ が付く', () => {
    for (const pressure of PRESSURE_CLASSES) {
      for (const flange of FLANGES[pressure]) {
        const c = card(`${pressure} ${flange.size}`)
        const dims = section(c, 'フランジ寸法')
        const rowMark = isRowUnverified(pressure, flange.size)
        const tMark = isUnverified(pressure, flange.size, 't')
        const label = `${pressure} ${flange.size}`
        expect(row(dims, '外径 D').unverified, label).toBe(rowMark)
        expect(row(dims, '厚さ t').unverified, label).toBe(tMark)
        expect(row(section(c, 'ボルト長さ'), '六角ボルト').unverified, label).toBe(tMark)
        expect(dims.legend !== undefined, label).toBe(rowMark || tMark)
      }
    }
  })

  it('90A の管のカード: フランジ表の 5K・10K の行に ※', () => {
    const flange = section(card('90A'), 'フランジ')
    expect(flange.table?.rows.map((r) => [r.cells[0], r.unverified])).toEqual([
      ['5K', [false, true, true, true, true]],
      ['10K', [false, true, true, true, true]],
    ])
    expect(flange.legend).toBe(`${UNVERIFIED_LEGEND}（5K・10K の 90A は寸法すべて）`)
    // 確認済みのサイズには付けない
    const ok = section(card('50A'), 'フランジ')
    expect(ok.table?.rows.every((r) => !r.unverified?.some(Boolean))).toBe(true)
    expect(ok.legend).toBeUndefined()
  })

  it('M16 のボルトを使うフランジ: 未確認の 90A を含む範囲に ※', () => {
    const s = section(card('M16'), 'M16 のボルトを使うフランジ')
    expect(s.table?.rows.map((r) => [r.cells[0], r.unverified?.[1]])).toEqual([
      ['5K', true],
      ['10K', true],
      ['16K', false],
      ['20K', false],
    ])
    expect(s.legend).toBe(`${UNVERIFIED_LEGEND}を含む（5K 90A・10K 90A は寸法すべて）`)
    expect(section(card('M12'), 'M12 のボルトを使うフランジ').legend).toBeUndefined()
  })

  it('ざぐり径はすべてのサイズで ※（JIS B 1001 で未確認）', () => {
    for (const bolt of BOLT_SIZES) {
      const s = section(card(`M${bolt.d}`), 'ボルト・ナット')
      expect(row(s, 'ざぐり径').unverified, `M${bolt.d}`).toBe(isBoltUnverified('spotFace', bolt.d))
      expect(s.legend, `M${bolt.d}`).toContain("ざぐり径 D'")
      // 確認済みの値には付けない
      expect(row(s, '二面幅').unverified).toBeUndefined()
      expect(row(s, 'ボルト穴径').unverified).toBeUndefined()
    }
  })

  it('M3 の旧JIS の二面幅は「とも同じ」と言い切らず ※ を付ける', () => {
    const s = section(card('M3'), 'ボルト・ナット')
    const flats = row(s, '二面幅')
    expect(flats.value).toBe('5.5')
    expect(flats.note).not.toContain('とも同じ')
    expect(flats.note).toBe('旧JIS（附属書JA）は 5.5※ mm（規格原文で未確認）')
    expect(s.legend).toContain('M3 ナットの二面幅')
    // 凡例は二面幅・座ぐりツールと同じ「※ 規格原文で未確認の値：…」の形（項目の説明の括弧を、さらに括弧で包まない）
    const note = (field: string) => BOLT_UNVERIFIED.find((entry) => entry.field === field)!.note
    expect(s.legend).toBe(`${BOLT_UNVERIFIED_LEGEND}：${note('sJa')}、${note('spotFace')}`)
    // M6 は確認済みなので「とも同じ」のまま
    expect(row(section(card('M6'), 'ボルト・ナット'), '二面幅').note).toBe('JIS本体・旧JIS とも同じ')
  })

  it('bolt-size の UNVERIFIED（画面に出す項目）はすべてクイック検索でも ※ になる', () => {
    for (const entry of BOLT_UNVERIFIED) {
      if (entry.field === 'hole4') continue // ボルト穴 4級はクイック検索に出さない
      const sizes = entry.sizes === 'all' ? BOLT_SIZES.map((b) => b.d) : entry.sizes
      for (const d of sizes) {
        expect(hasMark(card(`M${d}`)), `M${d} ${entry.field}`).toBe(true)
      }
    }
  })
})

describe('quickSearch: ドリル径の逆引き', () => {
  it('キリ8.5 は M10 並目（ツールの逆引きと同じ）', () => {
    for (const text of ['キリ8.5', 'φ8.5', 'ドリル8.5', '8.5キリ']) {
      const c = card(text)
      expect(c.title, text).toBe('φ8.5')
      const s = section(c, 'このドリルで立てられるねじ')
      expect(s.table?.rows[0].cells, text).toEqual(['M10', '並目', '6H', '92.4%'])
      expect(link(s.table!.rows[0].href!)).toEqual({ path: '/tap-drill', params: { d: '10', p: '1.5', drill: '8.5' } })
      expect(s.standards).toEqual(['JIS B 0209-1'])
    }
  })

  it('下穴10.2・Φ10.2 は M12 が先頭（細目・第3選択の M11×0.75 も出す）', () => {
    for (const text of ['下穴10.2', 'Φ10.2']) {
      const rows = section(card(text), 'このドリルで立てられるねじ').table!.rows
      expect(rows.map((r) => r.cells[0])).toEqual(['M12', 'M11×0.75'])
      expect(rows[1].cells[1]).toBe('細目（第3選択）')
    }
  })

  it('結果はツールの threadsForDrill と同じ並び', () => {
    for (const drill of [2.5, 4.2, 5, 6.8, 14, 0.75]) {
      const expected = threadsForDrill(drill, 6).slice(0, 6)
      const rows = section(card(`φ${drill}`), 'このドリルで立てられるねじ').table!.rows
      expect(rows.map((r) => r.cells[0]), String(drill)).toEqual(expected.map((m) => threadName(m.d, m.p)))
      expect(rows.map((r) => r.cells[2]), String(drill)).toEqual(expected.map((m) => `${m.grade}H`))
    }
    // 6H の規定が無いピッチ（M1）は等級もリンクに付ける
    const m1 = section(card('φ0.75'), 'このドリルで立てられるねじ').table!.rows[0]
    expect(link(m1.href!).params).toEqual({ d: '1', p: '0.25', grade: '5', drill: '0.75' })
  })

  it('立てられるねじが無いドリル径は理由を出す', () => {
    const result = quickSearch('φ100')
    expect(result.status).toBe('invalid')
    expect(result.messages[0]).toContain('φ100')
  })
})

describe('quickSearch: 数字だけ・対象外・未入力', () => {
  it('数字だけなら、当てはまりそうな呼びを候補に出す', () => {
    expect(quickSearch('17')).toMatchObject({ status: 'invalid', suggestions: ['M17', '二面幅17', '六角レンチ17'] })
    expect(numberSuggestions('50')).toEqual(['M50', '50A', 'P50', 'G50'])
    expect(numberSuggestions('1/2')).toEqual(['1/2B', 'Rc1/2', 'G1/2'])
    expect(numberSuggestions('1.1/2')).toEqual(['1 1/2B', 'Rc1 1/2', 'G1 1/2'])
    expect(numberSuggestions('9999')).toEqual([])
    // 小数はドリル径の逆引きも候補にする
    expect(numberSuggestions('8.5')).toEqual(['φ8.5'])
    expect(numberSuggestions('10.2')).toEqual(['φ10.2'])
  })

  it('候補はそのまま検索できる', () => {
    for (const suggestion of [
      ...numberSuggestions('50'),
      ...numberSuggestions('1/2'),
      ...numberSuggestions('17'),
      ...numberSuggestions('8.5'),
    ]) {
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
    for (const query of [...SEARCH_EXAMPLES, 'PT1/2', 'M1', '50A Sch80', 'キリ10.2', '90A', '16K 50A', 'レンチ17']) {
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

  it('現場の言い方（タップ・ざぐり・パイプ・オーリング）でもツールが見つかる', () => {
    const paths = (word: string) => matchTools(word, TOOLS).map((t) => t.path)
    expect(paths('タップ')).toContain('/tap-drill')
    expect(paths('キリ')).toContain('/tap-drill')
    expect(paths('ざぐり')).toContain('/bolt-size')
    expect(paths('パイプ')).toContain('/steel-pipe')
    expect(paths('ガス管')).toContain('/steel-pipe')
    expect(paths('オーリング')).toContain('/o-ring')
    expect(paths('ｵｰﾘﾝｸﾞ')).toContain('/o-ring')
    // 「オーリング」だけでは呼びとして読めないので、ツール名の検索に回る
    expect(quickSearch('オーリング').status).toBe('unknown')
    // 別名のキーはすべて登録済みのツール
    const registered = new Set(TOOLS.map((tool) => tool.path))
    for (const path of Object.keys(TOOL_ALIASES)) expect(registered.has(path), path).toBe(true)
    // ツールの keywords も使う
    const custom = { path: '/a', name: 'A', navLabel: 'A', description: 'a', keywords: ['あいことば'] }
    expect(matchTools('あいことば', [custom]).map((t) => t.path)).toEqual(['/a'])
  })
})
