import { normalizeDigits } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { findFlange, nearestSize, type BoltType, type NutKind, type Rounding } from '../flange-bolt/calc'
import { PRESSURE_CLASSES, type PressureClass } from '../flange-bolt/data'
import {
  DEFAULT_INPUT as FLANGE_DEFAULTS,
  parsePressure,
  parseSize,
  THREAD_CHOICES,
  type FlangeInput,
} from '../flange-bolt/input'

/** このツールのパス（src/tools/registry.ts と同じ） */
export const TAKEOFF_TOOL_PATH = '/flange-takeoff'
/** 1行ごとの計算を開くツール（JISフランジ＆ボルト長さ） */
export const FLANGE_TOOL_PATH = '/flange-bolt-length'

/** 一覧の1行（同じ呼び圧力・呼び径の継手）。count はか所数の入力欄の文字（数字だけ。入力途中の空欄も保つ） */
export interface TakeoffRow {
  pressure: PressureClass
  size: string
  count: string
}

/**
 * ツールの入力（URL のクエリ・端末の保存と同期する）。
 * rows 以外のキー名と既定値は、JISフランジ＆ボルト長さ（flange-bolt/input.ts）と同じにしている
 * （同じ条件なら同じボルト長さになり、行ごとのリンクにそのまま渡せる）。
 */
export interface TakeoffInput {
  /** 継手の一覧（encodeRows の形。例: 10K-50A-6_10K-80A-2） */
  rows: string
  type: BoltType
  gasket: string
  nut: NutKind
  washers: 0 | 1 | 2
  threads: number
  rounding: Rounding
  /** 予備の割合 [%]（SPARE_CHOICES のどれか） */
  spare: number
}

/** 予備の選択肢 [%]。品目ごとに切り上げる */
export const SPARE_CHOICES = [0, 5, 10] as const
/** 一覧に入れられる行の数 */
export const MAX_ROWS = 30
/** 1行のか所数の上限 */
export const MAX_COUNT = 999
/** か所数の入力欄に打てる桁数（上限を超えた値も、エラーとして見せられるよう1桁多く受け付ける） */
const COUNT_DIGITS = 4

export const DEFAULT_INPUT: TakeoffInput = {
  rows: '10K-50A-1',
  type: FLANGE_DEFAULTS.type,
  gasket: FLANGE_DEFAULTS.gasket,
  nut: FLANGE_DEFAULTS.nut,
  washers: FLANGE_DEFAULTS.washers,
  threads: FLANGE_DEFAULTS.threads,
  rounding: FLANGE_DEFAULTS.rounding,
  spare: 0,
}

const ROW_SEPARATOR = '_'
const FIELD_SEPARATOR = '-'

/** か所数の入力を整える（全角数字を半角に、数字以外と先頭の 0 を除き、4桁まで）。空欄はそのまま */
export function sanitizeCount(text: string): string {
  return normalizeDigits(text)
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '')
    .slice(0, COUNT_DIGITS)
}

/** か所数の入力を数にする。1〜MAX_COUNT の整数でなければ null（その行は集計しない） */
export function parseJointCount(text: string): number | null {
  if (!/^\d+$/.test(text)) return null
  const count = Number(text)
  return count >= 1 && count <= MAX_COUNT ? count : null
}

/** 一覧を URL の1項目にする（例: [{10K, 50A, 6}, {10K, 80A, 2}] → "10K-50A-6_10K-80A-2"） */
export function encodeRows(rows: readonly TakeoffRow[]): string {
  return rows.map((row) => [row.pressure, row.size, row.count].join(FIELD_SEPARATOR)).join(ROW_SEPARATOR)
}

/**
 * encodeRows の形の文字を読む（そのまま書き戻せる形だけを受け付ける）。空の文字は行なし。
 * 形が違う・その呼び圧力に無い呼び径・か所数が整っていない・行が多すぎるときは null
 */
export function decodeRows(text: string): TakeoffRow[] | null {
  if (text === '') return []
  const parts = text.split(ROW_SEPARATOR)
  if (parts.length > MAX_ROWS) return null
  const rows: TakeoffRow[] = []
  for (const part of parts) {
    const fields = part.split(FIELD_SEPARATOR)
    if (fields.length !== 3) return null
    const [pressure, size, count] = fields
    if (!PRESSURE_CLASSES.includes(pressure as PressureClass)) return null
    if (!findFlange(pressure as PressureClass, size)) return null
    if (sanitizeCount(count) !== count) return null
    rows.push({ pressure: pressure as PressureClass, size, count })
  }
  return rows
}

/**
 * URL などで書かれた一覧を、書き方の揺れを直して読む（normalize 用）。
 * - 「10k-50a-6」「10-2B-6」→ 10K 50A 6か所。か所数が無ければ 1
 * - そのクラスに無い呼び径（16K の 175A など）は、最も近い呼び径にする（JISフランジ＆ボルト長さと同じ）
 * - 呼び圧力・呼び径が読めない行は捨てる。か所数が整数として読めないときは空欄（画面でエラーを出す）
 * - MAX_ROWS 行まで
 */
export function parseRows(text: string): TakeoffRow[] {
  const rows: TakeoffRow[] = []
  for (const part of text.split(ROW_SEPARATOR)) {
    if (rows.length >= MAX_ROWS) break
    const fields = part.trim().split(FIELD_SEPARATOR)
    if (fields.length < 2 || fields.length > 3) continue
    const pressure = parsePressure(fields[0])
    const size = parseSize(fields[1])
    if (!pressure || !size) continue
    const rawCount = fields.length === 3 ? normalizeDigits(fields[2]).trim() : '1'
    rows.push({
      pressure,
      size: nearestSize(pressure, size),
      count: /^\d*$/.test(rawCount) ? sanitizeCount(rawCount) : '',
    })
  }
  return rows
}

const isWashers = (value: unknown): value is 0 | 1 | 2 => value === 0 || value === 1 || value === 2

export function isTakeoffInput(value: unknown): value is TakeoffInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.rows === 'string' &&
    decodeRows(v.rows) !== null &&
    (v.type === 'hex' || v.type === 'stud') &&
    typeof v.gasket === 'string' &&
    (v.nut === 'style1' || v.nut === 'ja1') &&
    isWashers(v.washers) &&
    typeof v.threads === 'number' &&
    (THREAD_CHOICES as readonly number[]).includes(v.threads) &&
    (v.rounding === '5mm' || v.rounding === 'jis') &&
    typeof v.spare === 'number' &&
    (SPARE_CHOICES as readonly number[]).includes(v.spare)
  )
}

/**
 * URL で指定された条件を整える。読めない値はその項目の既定値に戻す
 * （突き出しの山数は 1〜5 に収め、予備は選択肢にない値なら 0%）。一覧は parseRows で直す。
 */
export function normalizeTakeoffInput(state: TakeoffInput): TakeoffInput {
  const threads = Math.round(Number(state.threads))
  const spare = Number(state.spare)
  return {
    rows: encodeRows(parseRows(String(state.rows))),
    type: state.type === 'hex' || state.type === 'stud' ? state.type : DEFAULT_INPUT.type,
    gasket: String(state.gasket),
    nut: state.nut === 'style1' || state.nut === 'ja1' ? state.nut : DEFAULT_INPUT.nut,
    washers: isWashers(state.washers) ? state.washers : DEFAULT_INPUT.washers,
    threads: Number.isFinite(threads) ? Math.min(5, Math.max(1, threads)) : DEFAULT_INPUT.threads,
    rounding: state.rounding === '5mm' || state.rounding === 'jis' ? state.rounding : DEFAULT_INPUT.rounding,
    spare: (SPARE_CHOICES as readonly number[]).includes(spare) ? spare : DEFAULT_INPUT.spare,
  }
}

/** 共通の条件のうち、JISフランジ＆ボルト長さに渡す項目（キー名は flange-bolt の入力と同じ） */
const SHARED_KEYS = ['type', 'gasket', 'nut', 'washers', 'threads', 'rounding'] as const satisfies readonly (keyof FlangeInput &
  keyof TakeoffInput)[]

/**
 * その行の条件で JISフランジ＆ボルト長さを開くリンク（例: /flange-bolt-length?pressure=10K&size=50A&type=stud）。
 * 呼び圧力・呼び径は必ず書き、ほかの条件は向こうの既定値と違うものだけ書く。相手側の厚さは「同じフランジ」（空欄）
 */
export function flangeToolHref(row: Pick<TakeoffRow, 'pressure' | 'size'>, input: TakeoffInput): string {
  const params: Record<string, string | number> = { pressure: row.pressure, size: row.size }
  for (const key of SHARED_KEYS) {
    if (input[key] !== FLANGE_DEFAULTS[key]) params[key] = input[key]
  }
  return toolHref(FLANGE_TOOL_PATH, params)
}
