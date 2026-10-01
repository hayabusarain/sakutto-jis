import { parseNumber } from '../../lib/format'
import { findByMatingDiameter, findORing, identifyByRing, type HousingType, type ORing } from './calc'
import type { ORingSeries } from './data'

export type GrooveKind = 'cylinder' | 'flat-internal' | 'flat-external'

/** 選び方: 呼び番号から / 相手寸法（シリンダ内径・軸径）から / 実物の寸法（内径 × 太さ）から */
export type PickMode = 'number' | 'mating' | 'measure'

export interface ORingInput {
  series: ORingSeries
  no: string
  groove: GrooveKind
  backup: 0 | 1 | 2
  mode: PickMode
  /** 円筒面の溝の型（ピストン型・ロッド型） */
  housing: HousingType
  /** 相手寸法: ピストン型はシリンダ内径 D、ロッド型は軸径 d（入力途中を保つため文字列） */
  mate: string
  /** 相手寸法: 溝底径（任意。既存のハウジングの確認用） */
  bottom: string
  /** 実物の寸法: 内径・太さ */
  d1: string
  d2: string
}

export const DEFAULT_INPUT: ORingInput = {
  series: 'P',
  no: 'P20',
  groove: 'cylinder',
  backup: 0,
  mode: 'number',
  housing: 'piston',
  mate: '',
  bottom: '',
  d1: '',
  d2: '',
}

/** 系列を切り替えたときの番号（同じ番号が無いとき） */
export const SERIES_DEFAULT_NO: Record<ORingSeries, string> = { P: 'P20', G: 'G50' }

export const GROOVE_KINDS: readonly GrooveKind[] = ['cylinder', 'flat-internal', 'flat-external']
const PICK_MODES: readonly PickMode[] = ['number', 'mating', 'measure']
const HOUSINGS: readonly HousingType[] = ['piston', 'rod']
const TEXT_KEYS = ['mate', 'bottom', 'd1', 'd2'] as const

export function isORingInput(value: unknown): value is ORingInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    (v.series === 'P' || v.series === 'G') &&
    typeof v.no === 'string' &&
    findORing(v.series, v.no) !== undefined &&
    GROOVE_KINDS.includes(v.groove as GrooveKind) &&
    (v.backup === 0 || v.backup === 1 || v.backup === 2) &&
    PICK_MODES.includes(v.mode as PickMode) &&
    HOUSINGS.includes(v.housing as HousingType) &&
    TEXT_KEYS.every((key) => typeof v[key] === 'string')
  )
}

/** 「p20」「P 20」→「P20」、「20a」→「20A」 */
function cleanNo(no: string): string {
  return no.replace(/\s+/g, '').toUpperCase()
}

/**
 * URL で一部だけ指定されたときに整える。
 * - 番号だけ（/o-ring?no=G50）: 系列を番号の頭文字から決める
 * - 数字だけの番号（?series=G&no=50）: 系列の文字を付ける
 * - 系列だけ（?series=G）や、系列に無い番号: その系列の既定の番号にする
 * - 番号を指定したリンクは「呼び番号」から選んだ表示にする（前回の選び方が残らないように）
 * - 相手寸法・実物の寸法だけを指定したときは、その選び方にする
 * - 溝の形・バックアップリング・型が正しくなければ既定値
 */
export function normalizeORingInput(state: ORingInput, keys: readonly (keyof ORingInput)[]): ORingInput {
  const next = { ...state }
  let no = cleanNo(String(state.no))
  if (/^\d/.test(no)) no = `${next.series}${no}`
  if (keys.includes('no') && (no.startsWith('P') || no.startsWith('G'))) {
    next.series = no[0] as ORingSeries
  }
  if (next.series !== 'P' && next.series !== 'G') next.series = DEFAULT_INPUT.series
  next.no = findORing(next.series, no) ? no : SERIES_DEFAULT_NO[next.series]

  if (!GROOVE_KINDS.includes(next.groove)) next.groove = DEFAULT_INPUT.groove
  if (next.backup !== 0 && next.backup !== 1 && next.backup !== 2) next.backup = DEFAULT_INPUT.backup
  if (!HOUSINGS.includes(next.housing)) next.housing = DEFAULT_INPUT.housing
  for (const key of TEXT_KEYS) next[key] = String(next[key])

  if (!keys.includes('mode')) {
    if (keys.includes('no') || keys.includes('series')) next.mode = 'number'
    else if (keys.includes('mate') || keys.includes('bottom')) next.mode = 'mating'
    else if (keys.includes('d1') || keys.includes('d2')) next.mode = 'measure'
  }
  if (!PICK_MODES.includes(next.mode)) next.mode = DEFAULT_INPUT.mode
  // 相手寸法は円筒面の溝の探し方なので、溝の形を円筒面にする
  if (next.mode === 'mating') next.groove = 'cylinder'
  // 番号の指定が無ければ、相手寸法・実物の寸法に合う番号を選んでおく
  return keys.includes('no') ? next : withAutoPick(next)
}

/** 正の数値として読めれば数値、空欄は undefined、読めなければ null */
export function parsePositive(text: string): number | null | undefined {
  if (text.trim() === '') return undefined
  const value = parseNumber(text)
  return value !== null && value > 0 ? value : null
}

/**
 * 相手寸法・実物の寸法を変えたときに、表示する番号を合わせる。
 * - 相手寸法: 今の番号が合わなければ、ちょうど合う番号の最初（P を先に）を選ぶ
 * - 実物の寸法: 今の番号が許容差内でなければ、許容差内に入る一番近い番号を選ぶ
 * 合う番号が無いときは今の番号のまま（画面で「合っていない」と知らせる）。
 */
export function withAutoPick(next: ORingInput): ORingInput {
  const isCurrent = (ring: ORing) => ring.series === next.series && ring.no === next.no
  if (next.mode === 'mating') {
    const mate = parsePositive(next.mate)
    const bottom = parsePositive(next.bottom)
    if (typeof mate !== 'number' || bottom === null) return next
    const { exact } = findByMatingDiameter(next.housing, mate, bottom)
    if (exact.length === 0 || exact.some(isCurrent)) return next
    return { ...next, series: exact[0].series, no: exact[0].no }
  }
  if (next.mode === 'measure') {
    const d1 = parsePositive(next.d1)
    const d2 = parsePositive(next.d2)
    if (typeof d1 !== 'number' || typeof d2 !== 'number') return next
    const within = identifyByRing(d1, d2).candidates.filter((candidate) => candidate.withinTol)
    if (within.length === 0 || within.some((candidate) => isCurrent(candidate.ring))) return next
    return { ...next, series: within[0].ring.series, no: within[0].ring.no }
  }
  return next
}
