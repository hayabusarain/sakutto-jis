/**
 * クイック検索。「M12」「50A」「2B」「P20」「Rc1/2」「10K 50A」「二面幅17」などの呼びを読み取り、
 * 関連する寸法を各ツールのデータと計算関数（features/＊）からまとめて求める。
 * 画面に依存しない純粋関数だけを置く（表示は components/QuickSearch.tsx）。
 */
import { BOLT_SIZES, type BoltSize } from '../features/bolt-size/data'
import { boltLength, findFlange } from '../features/flange-bolt/calc'
import { FLANGES, PRESSURE_CLASSES, type PressureClass } from '../features/flange-bolt/data'
import {
  findORing,
  flatGroove,
  grooveDepth,
  oRingNumbers,
  outerDiameter,
} from '../features/o-ring/calc'
import type { ORingSeries } from '../features/o-ring/data'
import {
  findPipeThread,
  gMinorLimits,
  gRecommendedDrill,
  pitch as threadPitch,
  rcInnerMinorDiameter,
} from '../features/pipe-thread/calc'
import {
  PIPE_THREAD_SIZES,
  THREAD_KINDS,
  type PipeThreadKind,
  type PipeThreadSize,
} from '../features/pipe-thread/data'
import { findPipeSize, pipeDimensions } from '../features/steel-pipe/calc'
import { PIPE_SIZES, PIPE_SPECS, type PipeSize, type PipeSpec } from '../features/steel-pipe/data'
import {
  availableGrade,
  engagementPercent,
  findSize,
  holeStep,
  minorDiameterLimits,
  pitchesOf,
  recommendHole,
} from '../features/tap-drill/calc'
import { METRIC_SIZES, type ToleranceGrade } from '../features/tap-drill/data'
import type { StandardCode } from '../standards'
import { fixed, trim } from './format'
import { toolHref } from './query'

/** リンク先のツール（src/tools/registry.ts のパスと同じ） */
export const SEARCH_TOOL_PATHS = {
  tapDrill: '/tap-drill',
  boltSize: '/bolt-size',
  steelPipe: '/steel-pipe',
  pipeThread: '/pipe-thread',
  oRing: '/o-ring',
  flange: '/flange-bolt-length',
} as const

/** 入力例（トップページのボタンなど） */
export const SEARCH_EXAMPLES: readonly string[] = [
  'M12',
  'M10×1.25',
  '50A',
  '2B',
  'P20',
  'G50',
  'Rc1/2',
  'PF3/8',
  '10K 50A',
  '二面幅17',
  'レンチ14',
]

// ---------------------------------------------------------------------------
// 入力の正規化・読み取り
// ---------------------------------------------------------------------------

/**
 * 表記ゆれをそろえる。全角英数字・全角スラッシュ（NFKC）、大文字、× ✕ * → X、各種ダッシュ → -、空白。
 * 例: 「ｍ１２ｘ１．２５」→「M12X1.25」、「Ｒｃ１／２」→「RC1/2」、「1½」→「11/2」
 */
export function normalizeQuery(raw: string): string {
  return raw
    .normalize('NFKC')
    .replace(/⁄/g, '/') // ½ などの分数は NFKC で「1⁄2」になる
    .toUpperCase()
    .replace(/[×✕✖＊*]/g, 'X')
    .replace(/[‐‑‒–—―−]/g, '-')
    .replace(/(\d)\s*ー\s*(?=\d)/g, '$1-')
    .replace(/[、,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

function fraction(numerator: number, denominator: number): string | null {
  if (numerator <= 0 || denominator <= 0 || numerator >= denominator) return null
  const g = gcd(numerator, denominator)
  return `${numerator / g}/${denominator / g}`
}

/**
 * インチの呼びを「1/2」「1 1/2」「2」の形にそろえる（PIPE_SIZES.b・PIPE_THREAD_SIZES.size と同じ形）。
 * 「1-1/2」「1・1/2」「11/2」（1 1/2 の打ち間違い）「1.5」も受け付ける。読めなければ null。
 */
export function canonicalInch(text: string): string | null {
  const t = text.trim().replace(/[・-]/g, ' ').replace(/\s+/g, ' ')
  let m = t.match(/^(\d+)$/)
  if (m) return String(Number(m[1]))

  m = t.match(/^(\d+)\/(\d+)$/)
  if (m) {
    const proper = fraction(Number(m[1]), Number(m[2]))
    if (proper) return proper
    // 「11/2」→「1 1/2」、「21/2」→「2 1/2」
    if (m[1].length === 2) {
      const rest = fraction(Number(m[1][1]), Number(m[2]))
      if (rest) return `${m[1][0]} ${rest}`
    }
    return null
  }

  m = t.match(/^(\d+) (\d+)\/(\d+)$/)
  if (m) {
    const rest = fraction(Number(m[2]), Number(m[3]))
    return rest ? `${Number(m[1])} ${rest}` : null
  }

  m = t.match(/^(\d*)\.(\d+)$/)
  if (m) {
    const whole = Number(m[1] || '0')
    const part = Number(`0.${m[2]}`)
    if (part === 0) return String(whole)
    for (const denominator of [2, 4, 8, 16]) {
      const numerator = part * denominator
      if (Math.abs(numerator - Math.round(numerator)) < 1e-9) {
        const rest = fraction(Math.round(numerator), denominator)
        if (!rest) return null
        return whole === 0 ? rest : `${whole} ${rest}`
      }
    }
  }
  return null
}

/** 管の呼び径（A 呼称か B 呼称） */
export type Nominal = { system: 'A'; a: string } | { system: 'B'; b: string }

/** 「50A」「2B」「2 1/2B」を読む */
export function parseNominal(text: string): Nominal | null {
  const t = text.trim()
  const a = t.match(/^(\d{1,3})\s*A$/)
  if (a) return { system: 'A', a: `${Number(a[1])}A` }
  const b = t.match(/^(.+?)\s*B$/)
  if (b) {
    const inch = canonicalInch(b[1])
    return inch ? { system: 'B', b: inch } : null
  }
  return null
}

export type Interpretation =
  | {
      type: 'metric'
      d: number
      /** 「×」「P」の後ろの数値（ピッチか、ボルトの長さ） */
      second: number | null
      /** P で明示されたピッチ（長さとは見なさない） */
      pitchExplicit: boolean
      grade: ToleranceGrade | null
    }
  | { type: 'pipe'; nominal: Nominal; spec: PipeSpec | null }
  | { type: 'flange'; pressure: string; nominal: Nominal }
  | { type: 'flangePressure'; pressure: string }
  | { type: 'oring'; series: ORingSeries; no: string }
  | {
      type: 'pipeThread'
      /** 入力した記号（R・RC・RP・G・PT・PS・PF） */
      prefix: string
      kinds: PipeThreadKind[]
      old: 'PT' | 'PS' | 'PF' | null
      /** そろえた呼び（読めなければ null） */
      size: string | null
      sizeText: string
    }
  | { type: 'acrossFlats'; s: number }
  | { type: 'hexKey'; s: number }
  | { type: 'number'; text: string }
  | { type: 'unsupported'; message: string }

const METRIC_HINT = /(?:^|[^A-Z])M\s*[\dIL]*\d/
const METRIC = /^M\s*([\dIL]*\d[\dIL]*(?:\.\d+)?)(?:\s*(X|P|\s)\s*(\d+(?:\.\d+)?))?(?:\s*-?\s*([4-7])\s*H)?$/

/** 六角棒スパナ（六角レンチ）の言い方。「六角穴付きボルト」は含めない */
const HEX_KEY_WORDS = /六角レンチ|六角棒|ヘキサゴン|ヘックス|HEX|L型レンチ|Lレンチ|アーレン|六角穴(?!付)/
/** スパナ・メガネなど、ボルト頭・ナットの二面幅で呼ぶ工具 */
const FLATS_WORDS = /二面幅|対辺|スパナ|メガネ|ソケット|モンキー|^S(?=\s*\d)/
const WRENCH_WORD = /レンチ/

const SPEC_PATTERN = String.raw`SGP|SCH\s*40|SCH\s*80`
const NOMINAL_PATTERN = String.raw`[\d\s./\-・]+[AB]`
const FLANGE_FORWARD = new RegExp(String.raw`^(\d{1,2})\s*K\s*[-/]?\s*(${NOMINAL_PATTERN})$`)
const FLANGE_REVERSE = new RegExp(String.raw`^(${NOMINAL_PATTERN})\s*[-/]?\s*(\d{1,2})\s*K$`)
const PIPE = new RegExp(
  String.raw`^(?:(${SPEC_PATTERN})\s*)?(${NOMINAL_PATTERN})(?:\s*(${SPEC_PATTERN}))?$`,
)
const ORING = /^(P|G)\s*(\d+(?:\.\d+)?)\s*(A?)$/
const PIPE_THREAD = /^(RC|RP|R|G|PT|PS|PF)\s*(\d[\d\s./\-・]*?)\s*B?$/
const BARE_NUMBER = /^\d+(?:\.\d+)?$|^\d+(?:[ \-・]?\d+)?\/\d+$/

const THREAD_PREFIX: Record<string, { kinds: PipeThreadKind[]; old: 'PT' | 'PS' | 'PF' | null }> = {
  R: { kinds: ['R'], old: null },
  RC: { kinds: ['Rc'], old: null },
  RP: { kinds: ['Rp'], old: null },
  G: { kinds: ['G'], old: null },
  PT: { kinds: ['R', 'Rc'], old: 'PT' },
  PS: { kinds: ['Rp'], old: 'PS' },
  PF: { kinds: ['G'], old: 'PF' },
}

function toSpec(text: string | undefined): PipeSpec | null {
  if (!text) return null
  const t = text.replace(/\s/g, '')
  if (t === 'SGP') return 'sgp'
  if (t === 'SCH40') return 'sch40'
  if (t === 'SCH80') return 'sch80'
  return null
}

/** 数字を1つだけ含むときに、その数値を返す（「17mm スパナ」→ 17） */
function singleNumber(q: string): number | null {
  const numbers = q.match(/\d+(?:\.\d+)?/g)
  return numbers && numbers.length === 1 ? Number(numbers[0]) : null
}

function parseMetric(q: string): Interpretation | null {
  if (!METRIC_HINT.test(q)) return null
  // 「M12の下穴」「六角穴付きボルト M12」のような日本語や CAP などの語は外して読む
  const s = q
    .replace(/[^A-Z0-9./\s-]/g, ' ')
    .replace(/\b(?:CAP|HEX|BOLT|NUT|TAP|SCREW|SUS|JIS)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const m = s.match(METRIC)
  if (!m) return null
  const d = Number(m[1].replace(/[IL]/g, '1'))
  const second = m[3] === undefined ? null : Number(m[3])
  return {
    type: 'metric',
    d,
    second,
    pitchExplicit: m[2] === 'P',
    grade: m[4] === undefined ? null : (Number(m[4]) as ToleranceGrade),
  }
}

/**
 * 入力を読み取り、考えられる解釈をすべて返す（データに有るかどうかはまだ確かめない）。
 * 「G25」のように Oリングと管用平行ねじの両方に読めるときは、両方を返す。
 */
export function parseQuery(raw: string): Interpretation[] {
  const q = normalizeQuery(raw)
  if (q === '') return []

  if (/^NPT|^NPS/.test(q)) {
    return [{ type: 'unsupported', message: 'NPT（米国規格の管用ねじ）は収録していません。' }]
  }
  if (/^(?:UNC|UNF|UNEF)|\d\s*(?:UNC|UNF)$/.test(q)) {
    return [{ type: 'unsupported', message: 'ユニファイねじ（UNC・UNF）は収録していません。' }]
  }
  if (/^W\s*\d/.test(q)) {
    return [{ type: 'unsupported', message: 'ウイットねじ（W）は収録していません。' }]
  }

  const metric = parseMetric(q)
  if (metric) return [metric]

  if (HEX_KEY_WORDS.test(q)) {
    const s = singleNumber(q)
    return s === null ? [] : [{ type: 'hexKey', s }]
  }
  if (FLATS_WORDS.test(q)) {
    const s = singleNumber(q)
    return s === null ? [] : [{ type: 'acrossFlats', s }]
  }
  if (WRENCH_WORD.test(q)) {
    const s = singleNumber(q)
    return s === null ? [] : [{ type: 'hexKey', s }]
  }

  // 「Oリング」「JIS」「鋼管」などの語を外し、呼びの部分だけにする
  const s = q
    .replace(/O\s*-?\s*(?:リング|RING)|オーリング/g, ' ')
    .replace(/インチ|吋/g, 'B')
    .replace(/JIS/g, ' ')
    .replace(/[^A-Z0-9./\s\-・]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (s === '') return []

  let m = s.match(FLANGE_FORWARD)
  if (m) {
    const nominal = parseNominal(m[2])
    if (nominal) return [{ type: 'flange', pressure: `${Number(m[1])}K`, nominal }]
  }
  m = s.match(FLANGE_REVERSE)
  if (m) {
    const nominal = parseNominal(m[1])
    if (nominal) return [{ type: 'flange', pressure: `${Number(m[2])}K`, nominal }]
  }
  m = s.match(/^(\d{1,2})\s*K$/)
  if (m) return [{ type: 'flangePressure', pressure: `${Number(m[1])}K` }]

  m = s.match(PIPE)
  if (m) {
    const nominal = parseNominal(m[2])
    if (nominal) return [{ type: 'pipe', nominal, spec: toSpec(m[1] ?? m[3]) }]
  }

  const results: Interpretation[] = []
  m = s.match(ORING)
  if (m) {
    const series = m[1] as ORingSeries
    results.push({ type: 'oring', series, no: `${series}${Number(m[2])}${m[3]}` })
  }
  m = s.match(PIPE_THREAD)
  if (m) {
    const prefix = THREAD_PREFIX[m[1]]
    results.push({
      type: 'pipeThread',
      prefix: m[1],
      kinds: prefix.kinds,
      old: prefix.old,
      size: canonicalInch(m[2]),
      sizeText: m[2].trim(),
    })
  }
  if (results.length > 0) return results

  if (BARE_NUMBER.test(s)) return [{ type: 'number', text: s }]
  return []
}

// ---------------------------------------------------------------------------
// 結果（まとめカード）
// ---------------------------------------------------------------------------

export interface SummaryRow {
  label: string
  value: string
  unit?: string
  note?: string
  /** そのカードで一番見てほしい値（大きく表示する） */
  primary?: boolean
}

export interface SummaryTableRow {
  cells: readonly string[]
  /** 行を押したときに開くツール（条件付き） */
  href?: string
  highlight?: boolean
}

export interface SummaryTable {
  caption: string
  columns: readonly string[]
  rows: readonly SummaryTableRow[]
}

export interface SummaryLink {
  label: string
  href: string
}

export interface SummarySection {
  title: string
  rows: SummaryRow[]
  table?: SummaryTable
  /** 補足のリンク（細目の下穴・ねじの種類など） */
  links?: SummaryLink[]
  note?: string
  /** 典拠の規格 */
  standards: StandardCode[]
  /** 詳しく見るツール（条件付き） */
  href: string
  linkLabel: string
}

export interface SummaryCard {
  key: string
  /** 種類（例: メートル並目ねじ） */
  kind: string
  /** 呼び（例: M12） */
  title: string
  notes: string[]
  sections: SummarySection[]
  /** 次に調べられそうな呼び（検索語） */
  related: string[]
}

export interface QuickSearchResult {
  /**
   * empty: 未入力 / found: まとめカードあり / invalid: 呼びとして読めたが規格に無い・範囲外 /
   * unknown: 呼びとして読めない（ツール名での検索に回す）
   */
  status: 'empty' | 'found' | 'invalid' | 'unknown'
  /** 正規化した入力（空なら未入力） */
  normalized: string
  cards: SummaryCard[]
  /** 見つからない・収録範囲外などの説明 */
  messages: string[]
  /** 代わりに試せる呼び（検索語） */
  suggestions: string[]
}

/** 1つの解釈から作った結果（カードか、作れなかった理由） */
export interface Built {
  card?: SummaryCard
  message?: string
  suggestions?: string[]
  /** ほかの解釈が採用されたときに添える、短い理由（例: 管用平行ねじ G の呼びは 1/16〜6） */
  reason?: string
}

const fail = (message: string, suggestions: string[] = [], reason?: string): Built => ({
  message,
  suggestions,
  reason,
})
const unique = <T>(list: readonly T[]) => [...new Set(list)]

/** 並んだ数値のうち、target のすぐ下とすぐ上 */
function neighbors<T>(items: readonly T[], value: (item: T) => number, target: number): T[] {
  const sorted = [...items].sort((a, b) => value(a) - value(b))
  const below = sorted.filter((item) => value(item) < target).at(-1)
  const above = sorted.find((item) => value(item) > target)
  return [below, above].filter((item): item is T => item !== undefined)
}

function metricName(d: number, p: number): string {
  const size = findSize(d)
  return size?.coarse === p ? `M${trim(d)}` : `M${trim(d)}×${trim(p)}`
}

/** ボルトの呼び径 d を使うフランジを、呼び圧力ごとに「25A〜100A」の形でまとめる */
export function flangesUsingBolt(d: number): { pressure: PressureClass; ranges: string[]; first: string }[] {
  const result: { pressure: PressureClass; ranges: string[]; first: string }[] = []
  for (const pressure of PRESSURE_CLASSES) {
    const rows = FLANGES[pressure]
    const ranges: string[] = []
    let start = -1
    rows.forEach((row, index) => {
      const uses = row.bolt === d
      if (uses && start < 0) start = index
      const isLast = index === rows.length - 1
      if (start >= 0 && (!uses || isLast)) {
        const end = uses ? index : index - 1
        ranges.push(start === end ? rows[start].size : `${rows[start].size}〜${rows[end].size}`)
        start = -1
      }
    })
    const first = rows.find((row) => row.bolt === d)
    if (first) result.push({ pressure, ranges, first: first.size })
  }
  return result
}

function tapDrillSection(d: number, p: number, grade: ToleranceGrade): SummarySection {
  const size = findSize(d)!
  const limits = minorDiameterLimits(d, p, grade)
  const rec = recommendHole(d, p, grade)
  const digits = holeStep(p) < 0.1 ? 2 : 1
  const params: Record<string, number> = grade === 6 ? { d, p } : { d, p, grade }

  const rows: SummaryRow[] = [
    {
      label: `下穴径の目安（${grade}H）`,
      value: rec ? fixed(rec.hole, digits) : '—',
      unit: 'mm',
      primary: true,
      note: rec
        ? `${rec.basis === 'iso2306' ? 'ISO 2306 の推奨ドリル径' : '範囲内で「呼び径 − ピッチ」に近い径'}・ひっかかり率 ${fixed(engagementPercent(d, p, rec.hole), 1)}%`
        : 'この等級の範囲に入る刻みの径がありません',
    },
  ]
  if (limits) {
    rows.push({
      label: `めねじ内径の許容範囲（${grade}H）`,
      value: `${fixed(limits.min, 3)}〜${fixed(limits.max, 3)}`,
      unit: 'mm',
      note: `D1 = ${trim(d)} − 1.082532 × ${trim(p)} = ${fixed(limits.min, 3)}、公差 +${fixed(limits.max - limits.min, 3)}`,
    })
  }

  // 同じ呼び径のほかのピッチ（並目なら細目、細目なら並目とほかの細目）
  const links: SummaryLink[] = pitchesOf(size)
    .filter((other) => other !== p)
    .map((other) => {
      const otherGrade = availableGrade(d, other, 6)
      const otherRec = recommendHole(d, other, otherGrade)
      const otherDigits = holeStep(other) < 0.1 ? 2 : 1
      const kind = other === size.coarse ? '並目' : '細目'
      return {
        label: `${kind} ×${trim(other)} → ${otherRec ? fixed(otherRec.hole, otherDigits) : '—'}${otherGrade === 6 ? '' : `（${otherGrade}H）`}`,
        href: toolHref(SEARCH_TOOL_PATHS.tapDrill, otherGrade === 6 ? { d, p: other } : { d, p: other, grade: otherGrade }),
      }
    })

  const standards: StandardCode[] = ['JIS B 0205-4', 'JIS B 0209-1']
  if (rec?.basis === 'iso2306') standards.push('ISO 2306')
  return {
    title: 'ねじ下穴',
    rows,
    links,
    note: links.length > 0 ? `M${trim(d)} のほかのピッチの下穴径（目安）` : undefined,
    standards,
    href: toolHref(SEARCH_TOOL_PATHS.tapDrill, params),
    linkLabel: '下穴径の早見表',
  }
}

function boltSection(bolt: BoltSize, fine: boolean): SummarySection {
  const rows: SummaryRow[] = [
    {
      label: '二面幅（スパナ）',
      value: trim(bolt.sIso),
      unit: 'mm',
      note: bolt.sIso === bolt.sJa ? 'JIS本体・旧JIS とも同じ' : `旧JIS（附属書JA）は ${trim(bolt.sJa)} mm`,
    },
    {
      label: '六角レンチ（六角穴付きボルト）',
      value: trim(bolt.capKey),
      unit: 'mm',
      note: bolt.capNonJis ? `M${bolt.d} は JIS B 1176 に無いサイズ（DIN 912 などの値）` : undefined,
    },
    {
      label: 'ボルト穴径（2級）',
      value: trim(bolt.holes[1]),
      unit: 'mm',
      note: `1級 ${trim(bolt.holes[0])}・3級 ${trim(bolt.holes[2])}`,
    },
    { label: 'ざぐり径（六角ボルト用）', value: trim(bolt.spotFace), unit: 'mm' },
  ]
  if (bolt.counterbore) {
    rows.push({
      label: 'CAP用座ぐり 径 × 深さ',
      value: `φ${trim(bolt.counterbore.d)} × ${trim(bolt.counterbore.h)}`,
      unit: 'mm',
      note: '設計でよく使われる参考値（規格本体の規定ではない）',
    })
  }
  return {
    title: 'ボルト・ナット',
    rows,
    note: fine ? `呼び径 M${bolt.d} の値です（寸法表は並目のもの）。` : undefined,
    standards: ['JIS B 1180', 'JIS B 1181', 'JIS B 1176', 'JIS B 1001'],
    href: toolHref(SEARCH_TOOL_PATHS.boltSize, { d: bolt.d }),
    linkLabel: '二面幅・座ぐり',
  }
}

function buildMetric(i: Extract<Interpretation, { type: 'metric' }>): Built {
  const { d } = i
  const size = findSize(d)
  if (!size) {
    const first = METRIC_SIZES[0].d
    const last = METRIC_SIZES.at(-1)!.d
    return fail(
      `M${trim(d)} は一般用メートルねじ（JIS B 0205-2）の呼び径にありません（M${first}〜M${last} を収録）。`,
      neighbors(METRIC_SIZES, (s) => s.d, d).map((s) => `M${s.d}`),
    )
  }

  const notes: string[] = []
  let p = size.coarse ?? size.fine[0]
  if (i.second !== null) {
    if (pitchesOf(size).includes(i.second)) {
      p = i.second
    } else if (!i.pitchExplicit && i.second > d / 2) {
      notes.push(`「×${trim(i.second)}」はボルトの長さとみなし、${size.coarse === null ? '細目' : '並目'}の M${d} で表示しています。`)
    } else {
      return fail(
        `M${d} にピッチ ${trim(i.second)} mm はありません。M${d} のピッチ: ${pitchesOf(size)
          .map((pp) => `${trim(pp)}${pp === size.coarse ? '（並目）' : ''}`)
          .join('・')}`,
        pitchesOf(size).map((pp) => metricName(d, pp)),
      )
    }
  } else if (size.coarse === null) {
    notes.push(`M${d} は並目がないため、細目 ${trim(p)} mm で表示しています。`)
  }

  const coarse = p === size.coarse
  const grade = availableGrade(d, p, i.grade ?? 6)
  if (i.grade !== null && grade !== i.grade) {
    notes.push(`ピッチ ${trim(p)} mm には ${i.grade}H の規定がないため、${grade}H で表示しています。`)
  } else if (i.grade === null && grade !== 6) {
    notes.push(`ピッチ ${trim(p)} mm には 6H の規定がないため、${grade}H で表示しています。`)
  }
  const pitchNote = size.pitchNotes?.[String(p)]
  if (pitchNote) notes.push(`ピッチ ${trim(p)} mm は${pitchNote}です。`)
  if (size.choice === 3) notes.push(`M${d} は第3選択の呼び径です（なるべく第1選択を使う）。`)

  const sections: SummarySection[] = [tapDrillSection(d, p, grade)]

  const bolt = BOLT_SIZES.find((b) => b.d === d)
  if (bolt) {
    sections.push(boltSection(bolt, !coarse))
  } else {
    notes.push(`二面幅・ボルト穴は M${BOLT_SIZES[0].d}〜M${BOLT_SIZES.at(-1)!.d} を収録しています。`)
  }

  const flanges = coarse ? flangesUsingBolt(d) : []
  if (flanges.length > 0) {
    sections.push({
      title: `M${d} のボルトを使うフランジ`,
      rows: [],
      table: {
        caption: `M${d} のボルトを使うフランジ（JIS B 2220）`,
        columns: ['呼び圧力', '呼び径'],
        rows: flanges.map((f) => ({
          cells: [f.pressure, f.ranges.join('、')],
          href: toolHref(SEARCH_TOOL_PATHS.flange, { pressure: f.pressure, size: f.first }),
        })),
      },
      standards: ['JIS B 2220'],
      href: toolHref(SEARCH_TOOL_PATHS.flange, {
        pressure: flanges.find((f) => f.pressure === '10K')?.pressure ?? flanges[0].pressure,
        size: flanges.find((f) => f.pressure === '10K')?.first ?? flanges[0].first,
      }),
      linkLabel: 'フランジ・ボルト長さ',
    })
  }

  return {
    card: {
      key: `metric-${d}-${p}`,
      kind: `メートル${coarse ? '並目' : '細目'}ねじ`,
      title: metricName(d, p),
      notes,
      sections,
      related: [],
    },
  }
}

function resolvePipeSize(nominal: Nominal): PipeSize | undefined {
  return nominal.system === 'A'
    ? findPipeSize(nominal.a)
    : PIPE_SIZES.find((size) => size.b === nominal.b)
}

const nominalLabel = (nominal: Nominal) => (nominal.system === 'A' ? nominal.a : `${nominal.b}B`)

function pipeSizeFail(nominal: Nominal): Built {
  const first = PIPE_SIZES[0]
  const last = PIPE_SIZES.at(-1)!
  const suggestions =
    nominal.system === 'A'
      ? neighbors(PIPE_SIZES, (s) => parseInt(s.a, 10), parseInt(nominal.a, 10)).map((s) => s.a)
      : []
  return fail(
    `${nominalLabel(nominal)} は鋼管の呼び径（${first.a}〜${last.a}・${first.b}B〜${last.b}B）にありません。`,
    suggestions,
  )
}

const SPEC_KEYS = Object.keys(PIPE_SPECS) as PipeSpec[]

function buildPipe(i: Extract<Interpretation, { type: 'pipe' }>): Built {
  const size = resolvePipeSize(i.nominal)
  if (!size) return pipeSizeFail(i.nominal)
  const { a } = size

  const notes: string[] = []
  if (i.spec && !pipeDimensions(i.spec, a)) {
    notes.push(`${a} の ${PIPE_SPECS[i.spec].label} は JIS G 3454 にありません（SGP のみ）。`)
  }
  const spec = i.spec && pipeDimensions(i.spec, a) ? i.spec : 'sgp'

  const sections: SummarySection[] = [
    {
      title: '鋼管（外径・厚さ・質量）',
      rows: [{ label: '外径（SGP・Sch 共通）', value: fixed(size.od, 1), unit: 'mm', primary: true }],
      table: {
        caption: `${a} の鋼管の厚さ・内径・単位質量`,
        columns: ['規格', '厚さ', '内径', 'kg/m'],
        rows: SPEC_KEYS.map((key) => {
          const dims = pipeDimensions(key, a)
          return dims
            ? {
                cells: [PIPE_SPECS[key].label, fixed(dims.t, 1), fixed(dims.id, 1), trim(dims.massPerM)],
                href: toolHref(SEARCH_TOOL_PATHS.steelPipe, { spec: key, a }),
                highlight: i.spec === key,
              }
            : { cells: [PIPE_SPECS[key].label, '—', '—', '—'] }
        }),
      },
      note: '厚さ・内径は mm、質量は 1m あたり。Sch40・Sch80 は STPG370（JIS G 3454）。',
      standards: ['JIS G 3452', 'JIS G 3454'],
      href: toolHref(SEARCH_TOOL_PATHS.steelPipe, { spec, a }),
      linkLabel: '鋼管の重量計算',
    },
  ]

  const thread = PIPE_THREAD_SIZES.find((t) => t.pipeA === a)
  if (thread) {
    sections.push({
      title: `管用ねじ（呼び ${thread.size}）`,
      rows: [
        {
          label: '山数（25.4mm あたり）',
          value: String(thread.tpi),
          unit: '山',
          note: `ピッチ ${fixed(threadPitch(thread.tpi), 4)} mm`,
        },
        { label: '外径 d（基準径の位置）', value: fixed(thread.d, 3), unit: 'mm' },
        { label: 'G めねじの推奨下穴径', value: fixed(gRecommendedDrill(thread), 1), unit: 'mm' },
      ],
      links: THREAD_LINK_KINDS.map((kind) => ({
        label: `${kind}${thread.size}`,
        href: toolHref(SEARCH_TOOL_PATHS.pipeThread, { size: thread.size, kind }),
      })),
      standards: ['JIS B 0203', 'JIS B 0202'],
      href: toolHref(SEARCH_TOOL_PATHS.pipeThread, { size: thread.size, kind: 'R' }),
      linkLabel: '管用ねじ寸法',
    })
  }

  const flangeRows = PRESSURE_CLASSES.flatMap((pressure) => {
    const row = findFlange(pressure, a)
    return row ? [{ pressure, row }] : []
  })
  if (flangeRows.length > 0) {
    const main = flangeRows.find((f) => f.pressure === '10K') ?? flangeRows[0]
    sections.push({
      title: `フランジ（${a}）`,
      rows: [],
      table: {
        caption: `${a} のフランジ寸法（JIS B 2220）`,
        columns: ['呼び圧力', '外径 D', 'PCD', '穴', 'ボルト'],
        rows: flangeRows.map(({ pressure, row }) => ({
          cells: [pressure, trim(row.D), trim(row.C), `${row.n}-φ${trim(row.h)}`, `M${row.bolt}`],
          href: toolHref(SEARCH_TOOL_PATHS.flange, { pressure, size: a }),
        })),
      },
      note: '単位 mm。穴は「数-径」。',
      standards: ['JIS B 2220'],
      href: toolHref(SEARCH_TOOL_PATHS.flange, { pressure: main.pressure, size: a }),
      linkLabel: 'フランジ・ボルト長さ',
    })
  }

  return {
    card: {
      key: `pipe-${a}`,
      kind: '管の呼び径',
      title: `${a}（${size.b}B）`,
      notes,
      sections,
      related: findFlange('10K', a) ? [`10K ${a}`] : [],
    },
  }
}

/** フランジのボルト長さの目安を出すときの条件（ツールの既定と同じものを、リンクにも明示して渡す） */
const BOLT_LENGTH_ASSUMPTION = {
  gasket: 3,
  washers: 0 as const,
  nut: 'style1' as const,
  threads: 3,
  rounding: '5mm' as const,
}

function buildFlange(i: Extract<Interpretation, { type: 'flange' }>): Built {
  const pressure = i.pressure as PressureClass
  if (!PRESSURE_CLASSES.includes(pressure)) {
    return fail(
      `${i.pressure} のフランジは収録していません（JIS B 2220 の ${PRESSURE_CLASSES.join('・')}）。`,
      PRESSURE_CLASSES.map((p) => `${p} ${nominalLabel(i.nominal)}`),
    )
  }
  const size = resolvePipeSize(i.nominal)
  if (!size) return pipeSizeFail(i.nominal)
  const a = size.a
  const row = findFlange(pressure, a)
  if (!row) {
    const rows = FLANGES[pressure]
    const others = PRESSURE_CLASSES.filter((p) => findFlange(p, a))
    return fail(
      `${pressure} のフランジに ${a} はありません（${pressure} は ${rows[0].size}〜${rows.at(-1)!.size}${
        others.length > 0 ? `。${a} があるのは ${others.join('・')}` : ''
      }）。`,
      [
        ...neighbors(rows, (r) => parseInt(r.size, 10), parseInt(a, 10)).map((r) => `${pressure} ${r.size}`),
        ...others.map((p) => `${p} ${a}`),
      ],
    )
  }

  const common = { bolt: row.bolt, t1: row.t, t2: row.t, ...BOLT_LENGTH_ASSUMPTION }
  const hex = boltLength({ ...common, type: 'hex' })
  const stud = boltLength({ ...common, type: 'stud' })
  const linkParams = (type: 'hex' | 'stud') => ({
    pressure,
    size: a,
    type,
    gasket: String(BOLT_LENGTH_ASSUMPTION.gasket),
    nut: BOLT_LENGTH_ASSUMPTION.nut,
    washers: BOLT_LENGTH_ASSUMPTION.washers,
    threads: BOLT_LENGTH_ASSUMPTION.threads,
    rounding: BOLT_LENGTH_ASSUMPTION.rounding,
  })

  const sections: SummarySection[] = [
    {
      title: 'フランジ寸法',
      rows: [
        { label: '外径 D', value: trim(row.D), unit: 'mm' },
        { label: 'ボルト穴中心円の径（PCD）', value: trim(row.C), unit: 'mm' },
        { label: 'ボルト穴（数-径）', value: `${row.n}-φ${trim(row.h)}`, unit: 'mm' },
        { label: 'ボルト', value: `M${row.bolt} × ${row.n}本` },
        { label: '厚さ t', value: trim(row.t), unit: 'mm', note: '座（RF）の高さを含む' },
      ],
      standards: ['JIS B 2220'],
      href: toolHref(SEARCH_TOOL_PATHS.flange, { pressure, size: a }),
      linkLabel: 'フランジ寸法・図面',
    },
    {
      title: 'ボルト長さの目安',
      rows: [
        {
          label: '六角ボルト',
          value: hex.length === null ? '—' : `M${row.bolt}×${hex.length}`,
          // L = 2t + G + m + 山数 × P（5mm 刻みに切り上げ）
          note: `${trim(row.t)} × 2 + ${BOLT_LENGTH_ASSUMPTION.gasket} + ${trim(hex.nutHeight)} + ${BOLT_LENGTH_ASSUMPTION.threads} × ${trim(hex.pitch)} = ${trim(hex.required, 2)} → 5mm 刻みに切り上げ`,
        },
        {
          label: 'スタッドボルト（両ナット）',
          value: stud.length === null ? '—' : `M${row.bolt}×${stud.length}`,
          note: `${trim(row.t)} × 2 + ${BOLT_LENGTH_ASSUMPTION.gasket} + ${trim(stud.nutHeight)} × 2 + ${BOLT_LENGTH_ASSUMPTION.threads} × ${trim(stud.pitch)} × 2 = ${trim(stud.required, 2)} → 5mm 刻みに切り上げ`,
        },
      ],
      links: [{ label: 'スタッドボルトで計算', href: toolHref(SEARCH_TOOL_PATHS.flange, linkParams('stud')) }],
      note: `フランジ厚さ × 2 + ガスケット ${BOLT_LENGTH_ASSUMPTION.gasket}mm + ナット高さ（JIS本体）+ ${BOLT_LENGTH_ASSUMPTION.threads} 山出し、座金なしの条件。条件を変えるときはツールで計算してください。`,
      standards: ['JIS B 1180', 'JIS B 1181'],
      href: toolHref(SEARCH_TOOL_PATHS.flange, linkParams('hex')),
      linkLabel: 'ボルト長さを計算',
    },
  ]

  return {
    card: {
      key: `flange-${pressure}-${a}`,
      kind: '鋼製管フランジ',
      title: `${pressure} ${a}`,
      notes: i.nominal.system === 'B' ? [`${i.nominal.b}B は ${a} です。`] : [],
      sections,
      related: unique([
        ...PRESSURE_CLASSES.filter((p) => p !== pressure && findFlange(p, a)).map((p) => `${p} ${a}`),
        a,
        `M${row.bolt}`,
      ]),
    },
  }
}

function oRingNumberValue(no: string): number {
  return Number(no.slice(1).replace(/A$/, ''))
}

function buildORing(i: Extract<Interpretation, { type: 'oring' }>): Built {
  const ring = findORing(i.series, i.no)
  const numbers = oRingNumbers(i.series)
  if (!ring) {
    return fail(
      `${i.no} は JIS B 2401 の ${i.series} 系列（${numbers[0]}〜${numbers.at(-1)}）にありません。`,
      neighbors(
        numbers.filter((no) => !no.endsWith('A')),
        oRingNumberValue,
        oRingNumberValue(i.no),
      ),
      `Oリングの ${i.series} 系列は ${numbers[0]}〜${numbers.at(-1)}`,
    )
  }
  const { group } = ring
  const internal = flatGroove(ring, 'internal')
  const external = flatGroove(ring, 'external')
  const base = { series: ring.series, no: ring.no }

  const sections: SummarySection[] = [
    {
      title: 'Oリング',
      rows: [
        {
          label: '内径 d1 × 太さ d2',
          value: `${trim(ring.d1)} × ${trim(group.d2)}`,
          unit: 'mm',
          note: `許容差 内径 ±${trim(ring.d1Tol)}・太さ ±${trim(group.d2Tol)}（1種〜3種）`,
          primary: true,
        },
        { label: '外径（参考）', value: trim(outerDiameter(ring)), unit: 'mm' },
      ],
      standards: ['JIS B 2401-1'],
      href: toolHref(SEARCH_TOOL_PATHS.oRing, base),
      linkLabel: 'Oリング・溝',
    },
    {
      title: '溝（円筒面）',
      rows: [
        { label: 'd（ピストン型の溝底径・ロッド型の軸径）', value: trim(ring.d), unit: 'mm' },
        { label: 'D（シリンダ内径・ロッド型の溝底径）', value: trim(ring.D), unit: 'mm' },
        {
          label: '溝幅 b（バックアップリングなし）',
          value: trim(group.widths[0]),
          unit: 'mm',
          note: `1個 ${trim(group.widths[1])}・2個 ${trim(group.widths[2])}`,
        },
        { label: '溝の深さ', value: trim(grooveDepth(ring)), unit: 'mm' },
      ],
      standards: ['JIS B 2401-2'],
      href: toolHref(SEARCH_TOOL_PATHS.oRing, { ...base, groove: 'cylinder' }),
      linkLabel: '円筒面の溝',
    },
    {
      title: '溝（平面・固定用）',
      rows: [
        { label: '内圧用の溝外径', value: trim(internal.outer), unit: 'mm' },
        { label: '外圧用の溝内径', value: trim(external.inner), unit: 'mm' },
        { label: '溝幅 b ／ 深さ h', value: `${trim(internal.width)} ／ ${trim(internal.depth)}`, unit: 'mm' },
      ],
      links: [
        { label: '内圧用', href: toolHref(SEARCH_TOOL_PATHS.oRing, { ...base, groove: 'flat-internal' }) },
        { label: '外圧用', href: toolHref(SEARCH_TOOL_PATHS.oRing, { ...base, groove: 'flat-external' }) },
      ],
      standards: ['JIS B 2401-2'],
      href: toolHref(SEARCH_TOOL_PATHS.oRing, { ...base, groove: 'flat-internal' }),
      linkLabel: '平面の溝',
    },
  ]

  return {
    card: {
      key: `oring-${ring.no}`,
      kind: ring.series === 'P' ? 'Oリング P（運動用・固定用）' : 'Oリング G（固定用）',
      title: ring.no,
      notes: ring.series === 'G' ? ['G は固定用です。往復運動などの運動用には P を使います。'] : [],
      sections,
      related: [],
    },
  }
}

const THREAD_SIZE_RANGE = `${PIPE_THREAD_SIZES[0].size}〜${PIPE_THREAD_SIZES.at(-1)!.size}`
const THREAD_LINK_KINDS = ['R', 'Rc', 'Rp', 'G'] as const
const THREAD_SHORT_NAMES: Record<PipeThreadKind, string> = {
  R: 'テーパおねじ',
  Rc: 'テーパめねじ',
  Rp: '平行めねじ',
  G: '平行ねじ',
}

function buildPipeThread(i: Extract<Interpretation, { type: 'pipeThread' }>): Built {
  const thread: PipeThreadSize | undefined = i.size === null ? undefined : findPipeThread(i.size)
  const typed = i.prefix === 'RC' ? 'Rc' : i.prefix === 'RP' ? 'Rp' : i.prefix
  if (!thread) {
    return fail(
      `${typed}${i.sizeText} は管用ねじの呼び（${THREAD_SIZE_RANGE}）にありません。`,
      [],
      `管用ねじの呼びは ${THREAD_SIZE_RANGE}`,
    )
  }
  const { size } = thread
  const names = i.kinds.map((kind) => `${kind}${size}`)
  const main = i.kinds.includes('Rc') ? 'Rc' : i.kinds[0]

  const notes: string[] = []
  if (i.old === 'PT') notes.push(`旧JIS の PT${size} は、今の JIS では R${size}（おねじ）・Rc${size}（めねじ）です。`)
  else if (i.old) notes.push(`旧JIS の ${i.old}${size} は、今の JIS では ${names.join('・')} です。`)

  const rows: SummaryRow[] = [
    {
      label: '山数（25.4mm あたり）',
      value: String(thread.tpi),
      unit: '山',
      note: `ピッチ ${fixed(threadPitch(thread.tpi), 4)} mm`,
    },
    { label: '外径 d', value: fixed(thread.d, 3), unit: 'mm' },
    { label: '有効径 d2', value: fixed(thread.d2, 3), unit: 'mm' },
    { label: '谷径 d1（めねじ内径 D1）', value: fixed(thread.d1, 3), unit: 'mm' },
  ]
  if (thread.pipeA) rows.push({ label: '対応する管', value: thread.pipeA })

  const work: SummaryRow[] = []
  if (i.kinds.includes('G')) {
    const limits = gMinorLimits(thread)
    work.push({
      label: 'G めねじの推奨下穴径',
      value: fixed(gRecommendedDrill(thread), 1),
      unit: 'mm',
      primary: true,
      note: `めねじ内径の許容範囲 ${fixed(limits.min, 3)}〜${fixed(limits.max, 3)} mm の中央付近`,
    })
  }
  if (i.kinds.includes('Rc')) {
    const inner = rcInnerMinorDiameter(thread)
    work.push({
      label: 'Rc 奥端のめねじ内径（計算値）',
      value: inner === null ? '—' : fixed(inner, 2),
      unit: 'mm',
      note:
        inner === null
          ? '有効ねじ部の長さを確認中のため計算していません'
          : `D1 − l ÷ 16 = ${fixed(thread.d1, 3)} − ${fixed(thread.usefulInternalRc ?? 0, 1)} ÷ 16。テーパリーマで仕上げるときの目安（タップの下穴はメーカー推奨値を確認）`,
    })
  }
  if (i.kinds.includes('R')) {
    work.push({
      label: 'R 有効ねじ部の最小長さ（管端から）',
      value: fixed(thread.usefulExternal, 1),
      unit: 'mm',
    })
  }

  const kindStandards = unique(i.kinds.map((kind) => THREAD_KINDS[kind].standard))
  const sections: SummarySection[] = [
    {
      title: '基準寸法',
      rows,
      note: i.kinds.some((kind) => kind !== 'G') ? 'テーパねじの径は基準径の位置の値（G と共通）。' : undefined,
      links: THREAD_LINK_KINDS.map((kind) => ({
        label: `${kind}${size} ${THREAD_SHORT_NAMES[kind]}`,
        href: toolHref(SEARCH_TOOL_PATHS.pipeThread, { size, kind }),
      })),
      standards: kindStandards,
      href: toolHref(SEARCH_TOOL_PATHS.pipeThread, { size, kind: main }),
      linkLabel: '管用ねじ寸法',
    },
  ]
  if (work.length > 0) {
    sections.push({
      title: 'ねじ加工の目安',
      rows: work,
      note: i.kinds.includes('Rp') ? 'Rp の下穴径はタップメーカーの推奨値を確認してください。' : undefined,
      standards: kindStandards,
      href: toolHref(SEARCH_TOOL_PATHS.pipeThread, { size, kind: main }),
      linkLabel: `${main}${size} を詳しく`,
    })
  } else if (i.kinds.includes('Rp')) {
    sections[0].note = 'Rp の下穴径はタップメーカーの推奨値を確認してください。'
  }

  const kindLabel =
    i.kinds.length === 1 ? THREAD_KINDS[i.kinds[0]].name : '管用テーパねじ（おねじ・めねじ）'
  return {
    card: {
      key: `thread-${i.kinds.join('')}-${size}`,
      kind: kindLabel,
      title: names.join('・'),
      notes,
      sections,
      related: thread.pipeA ? [thread.pipeA] : [],
    },
  }
}

function acrossFlatsLabel(bolt: BoltSize, s: number): { standard: string; other: string } {
  if (bolt.sIso === s && bolt.sJa === s) return { standard: 'JIS本体・旧JIS', other: '' }
  if (bolt.sIso === s) return { standard: 'JIS本体（ISO）', other: `旧JIS は ${trim(bolt.sJa)}` }
  return { standard: '旧JIS（附属書JA）', other: `JIS本体は ${trim(bolt.sIso)}` }
}

function buildAcrossFlats(s: number): Built {
  const matches = BOLT_SIZES.filter((bolt) => bolt.sIso === s || bolt.sJa === s)
  if (matches.length === 0) {
    const values = unique(BOLT_SIZES.flatMap((bolt) => [bolt.sIso, bolt.sJa]))
    return fail(
      `二面幅 ${trim(s)} mm の六角ボルト・ナットは、収録範囲（M${BOLT_SIZES[0].d}〜M${BOLT_SIZES.at(-1)!.d}）にありません。`,
      neighbors(values, (v) => v, s).map((v) => `二面幅${trim(v)}`),
    )
  }
  const hexKeyMatch = BOLT_SIZES.some((bolt) => bolt.capKey === s)
  return {
    card: {
      key: `flats-${s}`,
      kind: 'スパナ・メガネレンチのサイズ',
      title: `二面幅 ${trim(s)} mm`,
      notes: matches.some((bolt) => bolt.sIso !== bolt.sJa)
        ? [
            `旧JIS（附属書JA）の六角ボルト・ナットは、${BOLT_SIZES.filter((bolt) => bolt.sIso !== bolt.sJa)
              .map((bolt) => `M${bolt.d}`)
              .join('・')} で二面幅が JIS本体（ISO）と違います。`,
          ]
        : [],
      sections: [
        {
          title: '六角ボルト・ナット',
          rows: [],
          table: {
            caption: `二面幅 ${trim(s)} mm の六角ボルト・ナット`,
            columns: ['ねじ', '該当する規格', '備考'],
            rows: matches.map((bolt) => {
              const { standard, other } = acrossFlatsLabel(bolt, s)
              return {
                cells: [`M${bolt.d}`, standard, other || '—'],
                href: toolHref(SEARCH_TOOL_PATHS.boltSize, { d: bolt.d }),
              }
            }),
          },
          standards: ['JIS B 1180', 'JIS B 1181'],
          href: toolHref(SEARCH_TOOL_PATHS.boltSize, { d: matches[0].d }),
          linkLabel: '二面幅・座ぐり',
        },
      ],
      related: unique([...matches.map((bolt) => `M${bolt.d}`), ...(hexKeyMatch ? [`レンチ${trim(s)}`] : [])]),
    },
  }
}

function buildHexKey(s: number): Built {
  const matches = BOLT_SIZES.filter((bolt) => bolt.capKey === s)
  if (matches.length === 0) {
    const values = unique(BOLT_SIZES.map((bolt) => bolt.capKey))
    return fail(
      `六角レンチ ${trim(s)} mm の六角穴付きボルトは、収録範囲（M${BOLT_SIZES[0].d}〜M${BOLT_SIZES.at(-1)!.d}）にありません。`,
      neighbors(values, (v) => v, s).map((v) => `レンチ${trim(v)}`),
    )
  }
  const flatsMatch = BOLT_SIZES.some((bolt) => bolt.sIso === s || bolt.sJa === s)
  return {
    card: {
      key: `hexkey-${s}`,
      kind: '六角穴付きボルト（キャップボルト）',
      title: `六角レンチ ${trim(s)} mm`,
      notes: [],
      sections: [
        {
          title: '六角穴付きボルト',
          rows: [],
          table: {
            caption: `六角レンチ ${trim(s)} mm の六角穴付きボルト`,
            columns: ['ねじ', '頭部径 × 高さ', '備考'],
            rows: matches.map((bolt) => ({
              cells: [
                `M${bolt.d}`,
                `${trim(bolt.capDk)} × ${trim(bolt.capK)}`,
                bolt.capNonJis ? 'JIS B 1176 に無いサイズ' : '—',
              ],
              href: toolHref(SEARCH_TOOL_PATHS.boltSize, { d: bolt.d }),
            })),
          },
          note: matches.some((bolt) => bolt.capNonJis)
            ? 'JIS B 1176 に無いサイズの寸法は DIN 912 などの値です。'
            : undefined,
          standards: ['JIS B 1176'],
          href: toolHref(SEARCH_TOOL_PATHS.boltSize, { d: matches[0].d }),
          linkLabel: '二面幅・座ぐり',
        },
      ],
      related: unique([...matches.map((bolt) => `M${bolt.d}`), ...(flatsMatch ? [`二面幅${trim(s)}`] : [])]),
    },
  }
}

/** 数字だけの入力に、当てはまりそうな呼びを挙げる */
export function numberSuggestions(text: string): string[] {
  const suggestions: string[] = []
  const value = Number(text)
  const isNumber = /^\d+(?:\.\d+)?$/.test(text)
  if (isNumber && findSize(value)) suggestions.push(`M${trim(value)}`)
  if (isNumber && Number.isInteger(value) && findPipeSize(`${value}A`)) suggestions.push(`${value}A`)
  const inch = canonicalInch(text)
  if (inch && PIPE_SIZES.some((size) => size.b === inch)) suggestions.push(`${inch}B`)
  if (inch && findPipeThread(inch)) suggestions.push(`Rc${inch}`, `G${inch}`)
  if (isNumber) {
    for (const series of ['P', 'G'] as const) {
      const no = `${series}${trim(value)}`
      if (findORing(series, no)) suggestions.push(no)
    }
    if (BOLT_SIZES.some((bolt) => bolt.sIso === value || bolt.sJa === value)) suggestions.push(`二面幅${trim(value)}`)
    if (BOLT_SIZES.some((bolt) => bolt.capKey === value)) suggestions.push(`レンチ${trim(value)}`)
  }
  return unique(suggestions)
}

function build(i: Interpretation): Built {
  switch (i.type) {
    case 'metric':
      return buildMetric(i)
    case 'pipe':
      return buildPipe(i)
    case 'flange':
      return buildFlange(i)
    case 'flangePressure':
      return PRESSURE_CLASSES.includes(i.pressure as PressureClass)
        ? fail(`${i.pressure} のフランジは、呼び径も入れてください（例: ${i.pressure} 50A）。`, [
            `${i.pressure} 50A`,
            `${i.pressure} 100A`,
          ])
        : fail(`${i.pressure} のフランジは収録していません（JIS B 2220 の ${PRESSURE_CLASSES.join('・')}）。`)
    case 'oring':
      return buildORing(i)
    case 'pipeThread':
      return buildPipeThread(i)
    case 'acrossFlats':
      return buildAcrossFlats(i.s)
    case 'hexKey':
      return buildHexKey(i.s)
    case 'number': {
      const suggestions = numberSuggestions(i.text)
      return fail(
        suggestions.length > 0
          ? `「${i.text}」だけでは種類が分かりません。次のどれかを選んでください。`
          : `「${i.text}」に当てはまる呼びが見つかりません。「M12」「50A」のように記号も入れてください。`,
        suggestions,
      )
    }
    case 'unsupported':
      return fail(i.message)
  }
}

/**
 * 入力から、まとめカード・メッセージ・候補を作る。
 * 解釈が複数ある（例: G25 は Oリングか管用平行ねじか）ときは、データに有るものだけをカードにし、
 * 1つに絞れたらカードに理由を添え、両方有れば両方を出す。
 */
export function quickSearch(raw: string): QuickSearchResult {
  const interpretations = parseQuery(raw)
  return mergeResults(normalizeQuery(raw), interpretations.length, interpretations.map(build))
}

/**
 * 解釈ごとの結果をまとめる。
 * カードが1枚でもあれば、作れなかった解釈のメッセージは出さない（1枚に絞れたらその理由をカードに添え、
 * 2枚以上なら「両方に当てはまる」と知らせる）。1枚も無ければ、メッセージと候補を出す。
 */
export function mergeResults(normalized: string, interpretationCount: number, built: readonly Built[]): QuickSearchResult {
  const cards = built.flatMap((b) => (b.card ? [b.card] : []))

  if (cards.length > 0) {
    const messages: string[] = []
    if (built.length > 1) {
      if (cards.length === 1) {
        const reasons = built.flatMap((b) => (b.reason ? [b.reason] : []))
        cards[0] = {
          ...cards[0],
          notes: [
            `「${normalized}」は${cards[0].kind}として表示しています${reasons.length > 0 ? `（${reasons.join('・')}）` : ''}。`,
            ...cards[0].notes,
          ],
        }
      } else {
        messages.push(`「${normalized}」は ${cards.map((card) => card.kind).join(' と ')} の両方に当てはまるため、両方を表示しています。`)
      }
    }
    return { status: 'found', normalized, cards, messages, suggestions: [] }
  }

  const messages = unique(built.flatMap((b) => (b.message ? [b.message] : [])))
  const suggestions = unique(built.flatMap((b) => b.suggestions ?? []))
  const status = normalized === '' ? 'empty' : interpretationCount === 0 ? 'unknown' : 'invalid'
  return { status, normalized, cards, messages, suggestions }
}

// ---------------------------------------------------------------------------
// ツール名での検索（呼びとして読めないとき用）
// ---------------------------------------------------------------------------

export interface SearchableTool {
  path: string
  name: string
  navLabel: string
  seoTitle?: string
  description: string
}

/** 「フランジ」「下穴」などの言葉で、ツールを探す（空白区切りの語がすべて含まれるもの） */
export function matchTools<T extends SearchableTool>(raw: string, tools: readonly T[]): T[] {
  const terms = normalizeQuery(raw).split(' ').filter(Boolean)
  if (terms.length === 0) return []
  return tools.filter((tool) => {
    const text = normalizeQuery(`${tool.name} ${tool.navLabel} ${tool.seoTitle ?? ''} ${tool.description}`)
    return terms.every((term) => text.includes(term))
  })
}
