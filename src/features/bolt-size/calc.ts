import { trim } from '../../lib/format'
import { standardLabel } from '../../standards'
import { FLANGES, PRESSURE_CLASSES, type PressureClass } from '../flange-bolt/data'
import { findSize } from '../tap-drill/calc'
import {
  BOLT_SIZES,
  HOLE_CLASSES,
  isUnverified,
  UNVERIFIED,
  UNVERIFIED_LEGEND,
  type BoltSize,
  type HoleClass,
} from './data'

const EPS = 1e-9
const same = (a: number, b: number) => Math.abs(a - b) < EPS

// ---------------------------------------------------------------------------
// 入力（URL のクエリ・端末への保存と共通）

export interface BoltSizeInput {
  d: number
  holeClass: HoleClass
}

export const DEFAULT_INPUT: BoltSizeInput = { d: 12, holeClass: '2級' }

export function findBolt(d: number): BoltSize | undefined {
  return BOLT_SIZES.find((size) => same(size.d, d))
}

export function isBoltSizeInput(value: unknown): value is BoltSizeInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.d === 'number' &&
    BOLT_SIZES.some((size) => size.d === v.d) &&
    HOLE_CLASSES.includes(v.holeClass as HoleClass)
  )
}

/**
 * URL で一部だけ・崩れた形で指定された条件を整える。
 * - 等級は「2」「２級」のような書き方も「2級」にする。読めなければ既定の 2級
 * - 表に無い呼び径（M11 など）は既定の M12 にする（近いサイズに勝手に寄せない）
 */
export function normalizeBoltSizeInput(state: BoltSizeInput): BoltSizeInput {
  const rawClass = String(state.holeClass)
    .trim()
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
  const holeClass = HOLE_CLASSES.find((c) => c === rawClass || c === `${rawClass}級`) ?? DEFAULT_INPUT.holeClass
  const d = findBolt(state.d)?.d ?? DEFAULT_INPUT.d
  return { d, holeClass }
}

export function holeOf(size: BoltSize, holeClass: HoleClass): number | null {
  return size.holes[HOLE_CLASSES.indexOf(holeClass)]
}

// ---------------------------------------------------------------------------
// 規格原文で未確認の値に付ける ※

/** 未確認なら末尾に ※ を付けた文字列（コピー・表の出力用） */
export function markIf(text: string, unverified: boolean): string {
  return unverified ? `${text}※` : text
}

/** 二面幅の表示「16（17）」。（ ）は附属書JA。同じなら1つだけ（附属書JA の値が未確認のときは ※ を付けて両方書く） */
export function acrossFlatsText(size: BoltSize): string {
  const jaUnverified = isUnverified('sJa', size.d)
  if (same(size.sIso, size.sJa) && !jaUnverified) return trim(size.sIso)
  return `${trim(size.sIso)}（${markIf(trim(size.sJa), jaUnverified)}）`
}

// ---------------------------------------------------------------------------
// 典拠の表（規格票の原文で確認した表番号。Citation の detail に使う）

/** JIS B 1180 本体の表（M14・M18・M22・M27 は第2選択の表4、ほかは第1選択の表3） */
export function boltTableRef(size: BoltSize): string {
  return size.secondChoice ? '表4 呼び径六角ボルト（第2選択）' : '表3 呼び径六角ボルト（第1選択）'
}

/** JIS B 1181 本体の表（スタイル1） */
export function nutTableRef(size: BoltSize): string {
  return size.secondChoice ? '表4 六角ナット・スタイル1（第2選択）' : '表3 六角ナット・スタイル1（第1選択）'
}

/** 附属書JA（旧JIS）の表。中・並の表も M6 以上は同じ値 */
export const BOLT_JA_TABLE = '表JA.8 六角ボルト・上'
export const NUT_JA_TABLE = '表JA.9 六角ナット・上'
/** JIS B 1176 の表（並目ねじ） */
export const CAP_TABLE = '表3 六角穴付きボルト（並目ねじ）の寸法'
/** JIS B 1001 の表（表番号は無い） */
export const HOLE_TABLE = '付表 ボルト穴径及びざぐり径の寸法'

/**
 * 第2選択のサイズの注記（第1選択なら null）。
 * JIS B 1180・B 1181 本体では表4（第2選択）、附属書JA では括弧付き（なるべく用いない）。
 * JIS B 1176 でも (M14) は「なるべく用いない」（M18・M22・M27 は JIS B 1176 に無い）
 */
export function secondChoiceNote(size: BoltSize): string | null {
  if (!size.secondChoice) return null
  const parenthesized = size.capNonJis ? '旧JIS（附属書JA）' : '旧JIS（附属書JA）と JIS B 1176 '
  return `M${size.d} は JIS本体では第2選択（表4）のサイズです。${parenthesized}では括弧付きで「なるべく用いない」とされています。`
}

/** 附属書JA（旧JIS）の扱い（JIS B 1180・B 1181 の JA.1） */
export const JA_FUTURE_NOTE =
  '旧JIS（附属書JA）は、規格の中で「将来廃止するので、新規設計の機器、部位などには使用しないのがよい」とされています。'

// ---------------------------------------------------------------------------
// 工具のサイズからボルトを探す

/** その二面幅が JIS本体（ISO）・附属書JA（旧JIS）のどちらのものか */
export type AcrossFlatsStandard = 'both' | 'iso' | 'ja'

export interface AcrossFlatsMatch {
  size: BoltSize
  standard: AcrossFlatsStandard
}

const uniqueSorted = (values: readonly number[]) =>
  [...new Set(values)].sort((a, b) => a - b)

/** 表に出てくるスパナ（二面幅）のサイズ [mm] */
export const ACROSS_FLATS_SIZES: readonly number[] = uniqueSorted(
  BOLT_SIZES.flatMap((size) => [size.sIso, size.sJa]),
)

/** 表に出てくる六角レンチ（六角穴付きボルトの六角穴）のサイズ [mm] */
export const KEY_SIZES: readonly number[] = uniqueSorted(BOLT_SIZES.map((size) => size.capKey))

/** スパナ・メガネレンチのサイズ（二面幅 s）から、六角ボルト・ナットの呼びを探す */
export function boltsByAcrossFlats(s: number): AcrossFlatsMatch[] {
  const matches: AcrossFlatsMatch[] = []
  for (const size of BOLT_SIZES) {
    const iso = same(size.sIso, s)
    const ja = same(size.sJa, s)
    if (iso && ja) matches.push({ size, standard: 'both' })
    else if (iso) matches.push({ size, standard: 'iso' })
    else if (ja) matches.push({ size, standard: 'ja' })
  }
  return matches
}

/** 例: 'M12'・'M10（旧JIS）' */
export function acrossFlatsMatchLabel(match: AcrossFlatsMatch): string {
  return match.standard === 'ja' ? `M${match.size.d}（旧JIS）` : `M${match.size.d}`
}

export interface KeyMatch {
  size: BoltSize
  /** JIS B 1176 に無いサイズ（DIN 912 などの値） */
  nonJis: boolean
}

/** 六角レンチ（六角棒スパナ）のサイズから、六角穴付きボルトの呼びを探す */
export function boltsByKey(key: number): KeyMatch[] {
  return BOLT_SIZES.filter((size) => same(size.capKey, key)).map((size) => ({
    size,
    nonJis: size.capNonJis === true,
  }))
}

/** 例: 'M16'・'M18（JIS外）' */
export function keyMatchLabel(match: KeyMatch): string {
  return match.nonJis ? `M${match.size.d}（JIS外）` : `M${match.size.d}`
}

// ---------------------------------------------------------------------------
// 図面指示（穴・座ぐりの書き方の例）

/** current: JIS B 0001 の現行の書き方（×・⌴・↧）/ legacy: 従来の書き方（-・キリ・深ザグリ・深さ） */
export type CalloutStyle = 'current' | 'legacy'

export const CALLOUT_STYLES: readonly CalloutStyle[] = ['current', 'legacy']

/** 穴の数の接頭辞。1個なら付けない */
function countPrefix(count: number, style: CalloutStyle): string {
  if (!Number.isInteger(count) || count < 1) throw new RangeError(`穴の数が正しくありません: ${count}`)
  if (count === 1) return ''
  return style === 'current' ? `${count}×` : `${count}-`
}

/** ボルトの通し穴。例: 現行 '4×φ13.5'・従来 '4-φ13.5キリ' */
export function holeCallout(count: number, hole: number, style: CalloutStyle): string {
  const prefix = countPrefix(count, style)
  return style === 'current' ? `${prefix}φ${trim(hole)}` : `${prefix}φ${trim(hole)}キリ`
}

/**
 * 六角穴付きボルト用の深座ぐり。
 * 例: 現行 '4×φ14 ⌴φ20↧13'・従来 '4-φ14キリ φ20深ザグリ深さ13'
 */
export function counterboreCallout(
  count: number,
  counterbore: { d1: number; d: number; h: number },
  style: CalloutStyle,
): string {
  const prefix = countPrefix(count, style)
  const { d1, d, h } = counterbore
  return style === 'current'
    ? `${prefix}φ${trim(d1)} ⌴φ${trim(d)}↧${trim(h)}`
    : `${prefix}φ${trim(d1)}キリ φ${trim(d)}深ザグリ深さ${trim(h)}`
}

// ---------------------------------------------------------------------------
// このボルトを使う JIS フランジ（JIS B 2220）

export interface FlangeUse {
  pressure: PressureClass
  /** 表の並び順で連続する呼び径 */
  sizes: string[]
}

/** そのボルトを使うフランジ（呼び圧力ごと、表の並びで連続する範囲にまとめる） */
export function flangesUsingBolt(d: number): FlangeUse[] {
  const uses: FlangeUse[] = []
  for (const pressure of PRESSURE_CLASSES) {
    let current: FlangeUse | null = null
    for (const row of FLANGES[pressure]) {
      if (same(row.bolt, d)) {
        if (!current) {
          current = { pressure, sizes: [] }
          uses.push(current)
        }
        current.sizes.push(row.size)
      } else {
        current = null
      }
    }
  }
  return uses
}

/** 例: '25A〜100A'・'250A' */
export function sizeRangeLabel(sizes: readonly string[]): string {
  if (sizes.length === 0) return ''
  return sizes.length === 1 ? sizes[0] : `${sizes[0]}〜${sizes[sizes.length - 1]}`
}

/** フランジ表で使われているボルトの呼び径（小さい順） */
export function boltSizesInFlanges(): number[] {
  return uniqueSorted(PRESSURE_CLASSES.flatMap((pressure) => FLANGES[pressure].map((row) => row.bolt)))
}

/** 関連リンクで開くフランジ。10K を優先し、10K 50A（フランジツールの既定）が使うならそれ */
export function representativeFlange(d: number): { pressure: PressureClass; size: string } | null {
  const uses = flangesUsingBolt(d)
  if (uses.length === 0) return null
  const use = uses.find((u) => u.pressure === '10K') ?? uses[0]
  const size = use.pressure === '10K' && use.sizes.includes('50A') ? '50A' : use.sizes[0]
  return { pressure: use.pressure, size }
}

/** 関連ツールのパス（src/tools/registry.ts と同じ。テストで確認） */
export const FLANGE_TOOL_PATH = '/flange-bolt-length'
export const TAP_DRILL_TOOL_PATH = '/tap-drill'

/** 並目ピッチ（ねじ下穴ツールへのリンク用）。無ければ null */
export function coarsePitchOf(d: number): number | null {
  return findSize(d)?.coarse ?? null
}

// ---------------------------------------------------------------------------
// コピー・表の出力

export const CITED = ['JIS B 1180', 'JIS B 1181', 'JIS B 1176', 'JIS B 1001'] as const

export const CITATION_TEXT = `典拠: ${CITED.map(standardLabel).join(' / ')}`

/** 「結果をコピー」の文章 */
export function summaryText(size: BoltSize, holeClass: HoleClass): string {
  const hole = holeOf(size, holeClass)
  const jaUnverified = isUnverified('sJa', size.d)
  const jaDiffers = !same(size.sIso, size.sJa)
  const holeText =
    hole === null
      ? '—'
      : `${markIf(trim(hole), holeClass === '4級' && isUnverified('hole4', size.d))} mm${holeClass === '4級' ? '（主として鋳抜き穴用）' : ''}`
  const lines = [
    `【ボルト寸法】M${size.d}`,
    `二面幅（スパナ）: ${trim(size.sIso)} mm${
      jaDiffers || jaUnverified ? `（旧JIS ${markIf(trim(size.sJa), jaUnverified)} mm）` : ''
    }`,
    `六角レンチ（六角穴付きボルト）: ${trim(size.capKey)} mm${size.capNonJis ? '（JIS B 1176 に無いサイズ。DIN 912 などの値）' : ''}`,
    `ボルト穴 ${holeClass}: ${holeText}／ざぐり径 D': ${markIf(trim(size.spotFace), isUnverified('spotFace', size.d))} mm`,
    size.counterbore
      ? `CAP用座ぐり（参考値。JIS の規定ではない）: φ${trim(size.counterbore.d)} 深さ${trim(size.counterbore.h)}（穴 φ${trim(size.counterbore.d1)}）`
      : '',
  ].filter(Boolean)
  // ※ を付けた値があるときだけ凡例を書く
  if (lines.some((line) => line.includes('※'))) lines.push(UNVERIFIED_LEGEND)
  return [...lines, CITATION_TEXT, '（サクッとJIS）'].join('\n')
}

export const EXPORT_HEADERS = [
  'ねじの呼び',
  '二面幅 本体 [mm]',
  '二面幅 附属書JA [mm]',
  'ボルト頭部高さ 本体 [mm]',
  'ボルト頭部高さ 附属書JA [mm]',
  'ナット高さ スタイル1 最大 [mm]',
  'ナット高さ 附属書JA 1種 [mm]',
  'ナット高さ 附属書JA 3種 [mm]',
  '六角穴付きボルト 頭部径 dk [mm]',
  '六角穴付きボルト 頭部高さ k [mm]',
  '六角レンチ [mm]',
  'ボルト穴 1級 [mm]',
  'ボルト穴 2級 [mm]',
  'ボルト穴 3級 [mm]',
  'ボルト穴 4級 [mm]',
  "ざぐり径 D' [mm]",
  'CAP座ぐり 穴径 d1 [mm]（参考）',
  'CAP座ぐり 径 D [mm]（参考）',
  'CAP座ぐり 深さ H [mm]（参考）',
  '備考',
] as const

/** 寸法一覧を Excel・CSV に出す行（未確認の値には ※） */
export function exportRows(): string[][] {
  return BOLT_SIZES.map((size) => {
    const [h1, h2, h3, h4] = size.holes
    return [
      `M${size.d}`,
      trim(size.sIso),
      markIf(trim(size.sJa), isUnverified('sJa', size.d)),
      trim(size.kIso),
      trim(size.kJa),
      trim(size.nutStyle1),
      trim(size.nutJa1),
      trim(size.nutJa3),
      trim(size.capDk),
      trim(size.capK),
      trim(size.capKey),
      trim(h1),
      trim(h2),
      trim(h3),
      h4 === null ? '' : markIf(trim(h4), isUnverified('hole4', size.d)),
      markIf(trim(size.spotFace), isUnverified('spotFace', size.d)),
      size.counterbore ? trim(size.counterbore.d1) : '',
      size.counterbore ? trim(size.counterbore.d) : '',
      size.counterbore ? trim(size.counterbore.h) : '',
      size.capNonJis ? '六角穴付きボルトは JIS B 1176 に無いサイズ（DIN 912 などの値）' : '',
    ]
  })
}

export const EXPORT_NOTE = [
  `${CITATION_TEXT}（B 1180 は本体の表3・表4と附属書JA の${BOLT_JA_TABLE}、B 1181 は本体の表3・表4と附属書JA の${NUT_JA_TABLE}、B 1176 は${CAP_TABLE}、B 1001 は${HOLE_TABLE}）`,
  'M14・M18・M22・M27 は JIS B 1180・B 1181 本体の第2選択',
  'ナット高さ スタイル1 は最大値、附属書JA は基準寸法（1種の値は2種・4種も同じ）',
  '六角穴付きボルトの頭部径 dk・頭部高さ k は最大値（dk はローレットの無い頭部）',
  '4級は主として鋳抜き穴に適用',
  'CAP座ぐりは JIS B 1001・B 1176 の規定ではなく、設計でよく使われる参考値',
  // ※ を付けた値があるときだけ凡例を書く
  ...(UNVERIFIED.length > 0 ? [UNVERIFIED_LEGEND] : []),
].join('。')
