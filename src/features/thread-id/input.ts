import { parseNumber } from '../../lib/format'
import { judgeTaper, pitchFromCount, pitchFromTpi, type TaperJudgement, type ThreadSide } from './calc'
import { SCOPE } from './tips'

export type SideKey = 'ext' | 'int'
export type PitchMode = 'count' | 'pitch' | 'tpi'

/**
 * ねじ判別ツールの入力（URL のキーも同じ）。測った値は入力途中の文字列のまま持つ。
 * 例: /thread-identify?dia=20.45&mode=tpi&tpi=14
 */
export interface ThreadIdInput {
  /** おねじ / めねじ */
  side: SideKey
  /** 実測の径 [mm] */
  dia: string
  /** ピッチの入れ方: 山を数える / ピッチゲージ(mm) / 山数ゲージ */
  mode: PitchMode
  pitch: string
  tpi: string
  /** 数えた山頂の数 */
  n: string
  /** 最初と最後の山頂の距離 [mm] */
  len: string
  /** テーパの確認（任意）: もう1か所の外径と、2か所の間隔 [mm] */
  dia2: string
  gap: string
}

export const DEFAULT_INPUT: ThreadIdInput = {
  side: 'ext',
  dia: '',
  mode: 'count',
  pitch: '',
  tpi: '',
  n: '11',
  len: '',
  dia2: '',
  gap: '',
}

export const SIDE_KEYS: readonly SideKey[] = ['ext', 'int']
export const PITCH_MODES: readonly PitchMode[] = ['count', 'pitch', 'tpi']
const TEXT_KEYS = ['dia', 'pitch', 'tpi', 'n', 'len', 'dia2', 'gap'] as const

export function isThreadIdInput(value: unknown): value is ThreadIdInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    SIDE_KEYS.includes(v.side as SideKey) &&
    PITCH_MODES.includes(v.mode as PitchMode) &&
    TEXT_KEYS.every((key) => typeof v[key] === 'string')
  )
}

const SIDE_ALIASES: Readonly<Record<string, SideKey>> = {
  ext: 'ext',
  external: 'ext',
  male: 'ext',
  おねじ: 'ext',
  int: 'int',
  internal: 'int',
  female: 'int',
  めねじ: 'int',
}

/**
 * URL の一部指定を整える。
 * - side の表記ゆれ（external・おねじ など）を直す
 * - mode が無い・読めないときは、指定されたキーから決める（pitch → ピッチ、tpi → 山数、n・len → 数える）
 */
export function normalizeThreadIdInput(
  state: ThreadIdInput,
  keys: readonly (keyof ThreadIdInput)[],
): ThreadIdInput {
  const side = SIDE_ALIASES[String(state.side).trim().toLowerCase()] ?? DEFAULT_INPUT.side
  let mode = state.mode
  if (!keys.includes('mode') || !PITCH_MODES.includes(mode)) {
    if (keys.includes('pitch')) mode = 'pitch'
    else if (keys.includes('tpi')) mode = 'tpi'
    else if (keys.includes('len') || keys.includes('n')) mode = 'count'
    else if (!PITCH_MODES.includes(mode)) mode = DEFAULT_INPUT.mode
  }
  return { ...state, side, mode }
}

// ---------------------------------------------------------------- 入力 → 測定値

/** ピッチ欄の上限の目安 [mm]（M68 の並目 6mm より大きい値は山数の打ち間違いを疑う） */
export const MAX_PITCH = 6.5
/** 山数欄の下限の目安（これより小さい値はピッチ[mm]の打ち間違いを疑う） */
export const MIN_TPI = 4
/** 径の上限 [mm]（対象の最大は M68・管用ねじ 6） */
export const MAX_DIAMETER = 200
/** 数える山の数の目安（これより少ないと 1山あたりの誤差が大きい） */
export const RECOMMENDED_PITCHES = 5

export type FieldIssue =
  | { kind: 'error'; message: string }
  | { kind: 'warning'; message: string; fix?: { label: string; next: Partial<ThreadIdInput> } }

export interface MeasurementResult {
  side: ThreadSide
  /** 径（未入力・不正なら null） */
  diameter: number | null
  /** ピッチ [mm]（未入力・不正なら null） */
  pitch: number | null
  issues: Partial<Record<'dia' | 'pitch' | 'tpi' | 'n' | 'len' | 'dia2' | 'gap', FieldIssue>>
  /** 2か所の外径によるテーパの判定（おねじで両方入力されたときだけ） */
  taper: TaperJudgement | null
}

function positive(text: string, label: string): { value: number | null; issue?: FieldIssue } {
  if (text.trim() === '') return { value: null }
  const value = parseNumber(text)
  if (value === null) return { value: null, issue: { kind: 'error', message: `${label}を数字で入れてください` } }
  if (value <= 0) return { value: null, issue: { kind: 'error', message: `${label}は 0 より大きい値にしてください` } }
  return { value }
}

/** 入力欄の文字列から、判別に使う測定値と入力欄ごとの注意を作る（純粋関数） */
export function readMeasurement(input: ThreadIdInput): MeasurementResult {
  const side: ThreadSide = input.side === 'int' ? 'internal' : 'external'
  const issues: MeasurementResult['issues'] = {}

  const dia = positive(input.dia, '径')
  let diameter = dia.value
  if (dia.issue) issues.dia = dia.issue
  else if (diameter !== null && diameter > MAX_DIAMETER) {
    issues.dia = {
      kind: 'error',
      message: `径は ${MAX_DIAMETER} mm までです（対象は M${SCOPE.metricMax}・管用ねじ ${SCOPE.pipeMax} まで）`,
    }
    diameter = null
  }

  let pitch: number | null = null
  if (input.mode === 'pitch') {
    const p = positive(input.pitch, 'ピッチ')
    if (p.issue) issues.pitch = p.issue
    else if (p.value !== null && p.value > MAX_PITCH) {
      issues.pitch = {
        kind: 'warning',
        message: `ピッチ ${input.pitch} mm は大きすぎます。山数ではありませんか？`,
        fix: { label: `${input.pitch}山として計算`, next: { mode: 'tpi', tpi: input.pitch, pitch: '' } },
      }
      pitch = p.value
    } else pitch = p.value
  } else if (input.mode === 'tpi') {
    const t = positive(input.tpi, '山数')
    if (t.issue) issues.tpi = t.issue
    else if (t.value !== null) {
      pitch = pitchFromTpi(t.value)
      if (t.value < MIN_TPI) {
        issues.tpi = {
          kind: 'warning',
          message: `${input.tpi}山は少なすぎます。ピッチ（mm）ではありませんか？`,
          fix: { label: `ピッチ ${input.tpi} mm として計算`, next: { mode: 'pitch', pitch: input.tpi, tpi: '' } },
        }
      }
    }
  } else {
    const n = positive(input.n, '山の数')
    const len = positive(input.len, '距離')
    if (n.issue) issues.n = n.issue
    else if (n.value !== null && (!Number.isInteger(n.value) || n.value < 2)) {
      issues.n = { kind: 'error', message: '山頂の数は 2 以上の整数にしてください' }
    }
    if (len.issue) issues.len = len.issue
    if (!issues.n && !issues.len && n.value !== null && len.value !== null) {
      pitch = pitchFromCount(n.value, len.value)
      if (n.value - 1 < RECOMMENDED_PITCHES) {
        issues.n = {
          kind: 'warning',
          message: `${n.value - 1}ピッチ分だけだと誤差が大きくなります。山頂を11個（10ピッチ）以上数えると確実です`,
        }
      }
      if (pitch !== null && pitch > MAX_PITCH) {
        issues.len = { kind: 'warning', message: `ピッチ ${pitch.toFixed(2)} mm になります。山の数と距離を確かめてください` }
      }
    }
  }

  let taper: TaperJudgement | null = null
  if (side === 'external' && diameter !== null) {
    const d2 = positive(input.dia2, '径')
    const gap = positive(input.gap, '間隔')
    if (d2.issue) issues.dia2 = d2.issue
    if (gap.issue) issues.gap = gap.issue
    if (d2.value !== null && gap.value !== null) taper = judgeTaper(diameter, d2.value, gap.value)
  }

  return { side, diameter, pitch, issues, taper }
}
