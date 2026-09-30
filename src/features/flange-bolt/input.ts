import { PIPE_SIZES } from '../steel-pipe/data'
import { findFlange, nearestSize, type BoltType, type NutKind, type Rounding } from './calc'
import { FLANGES, PRESSURE_CLASSES, type PressureClass } from './data'

/** ツールの入力（URL のクエリ・端末の保存と同期する。キー名は他のツールからのリンクと共通） */
export interface FlangeInput {
  pressure: PressureClass
  size: string
  type: BoltType
  gasket: string
  nut: NutKind
  washers: 0 | 1 | 2
  threads: number
  /** 相手側フランジの厚さ（空欄なら同じフランジ） */
  t2: string
  rounding: Rounding
  /** 図面の内径（空欄なら SGP の外径） */
  bore: string
}

export const DEFAULT_INPUT: FlangeInput = {
  pressure: '10K',
  size: '50A',
  type: 'hex',
  gasket: '3',
  nut: 'style1',
  washers: 0,
  threads: 3,
  t2: '',
  rounding: '5mm',
  bore: '',
}

export const THREAD_CHOICES = [1, 2, 3, 4, 5] as const

export function isFlangeInput(value: unknown): value is FlangeInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    PRESSURE_CLASSES.includes(v.pressure as PressureClass) &&
    typeof v.size === 'string' &&
    findFlange(v.pressure as PressureClass, v.size) !== undefined &&
    (v.type === 'hex' || v.type === 'stud') &&
    typeof v.gasket === 'string' &&
    (v.nut === 'style1' || v.nut === 'ja1') &&
    (v.washers === 0 || v.washers === 1 || v.washers === 2) &&
    typeof v.threads === 'number' &&
    (THREAD_CHOICES as readonly number[]).includes(v.threads) &&
    typeof v.t2 === 'string' &&
    (v.rounding === '5mm' || v.rounding === 'jis') &&
    typeof v.bore === 'string'
  )
}

/** 「10k」「10」→「10K」。読めなければ null */
export function parsePressure(raw: string): PressureClass | null {
  const text = raw.trim().toUpperCase()
  const value = /^\d+$/.test(text) ? `${text}K` : text
  return PRESSURE_CLASSES.includes(value as PressureClass) ? (value as PressureClass) : null
}

/** 「50」「50a」→「50A」、B呼称「2B」「2」インチ表記 →「50A」。どのクラスにも無い呼び径は null */
export function parseSize(raw: string): string | null {
  const text = raw.trim().toUpperCase().replace(/\s+/g, ' ')
  let size = /^\d+$/.test(text) ? `${text}A` : text
  if (size.endsWith('B')) {
    const b = size.slice(0, -1).trim().replace(/-/g, ' ')
    size = PIPE_SIZES.find((pipe) => pipe.b === b)?.a ?? size
  }
  return PRESSURE_CLASSES.some((pressure) => findFlange(pressure, size)) ? size : null
}

/**
 * URL で一部だけ指定された条件を整える。
 * - 読めない値はその項目の既定値に戻す（突き出しの山数は 1〜5 に収める）
 * - 呼び径だけ指定され、既定の圧力に無いときは、その呼び径があるクラスにする
 * - 圧力も指定され、そのクラスに無い呼び径（16K の 175A など）は、最も近い呼び径にする
 */
export function normalizeFlangeInput(state: FlangeInput, keys: readonly (keyof FlangeInput)[]): FlangeInput {
  const pressure = parsePressure(String(state.pressure)) ?? DEFAULT_INPUT.pressure
  const parsedSize = parseSize(String(state.size))

  let resolvedPressure = pressure
  let size = parsedSize ?? DEFAULT_INPUT.size
  if (!findFlange(pressure, size)) {
    const other = PRESSURE_CLASSES.find((p) => findFlange(p, size))
    if (!keys.includes('pressure') && other) resolvedPressure = other
    else size = nearestSize(pressure, size)
  }

  const threads = Math.round(Number(state.threads))
  return {
    pressure: resolvedPressure,
    size: FLANGES[resolvedPressure].some((row) => row.size === size) ? size : DEFAULT_INPUT.size,
    type: state.type === 'hex' || state.type === 'stud' ? state.type : DEFAULT_INPUT.type,
    gasket: String(state.gasket),
    nut: state.nut === 'style1' || state.nut === 'ja1' ? state.nut : DEFAULT_INPUT.nut,
    washers: state.washers === 0 || state.washers === 1 || state.washers === 2 ? state.washers : DEFAULT_INPUT.washers,
    threads: Number.isFinite(threads) ? Math.min(5, Math.max(1, threads)) : DEFAULT_INPUT.threads,
    t2: String(state.t2),
    rounding: state.rounding === '5mm' || state.rounding === 'jis' ? state.rounding : DEFAULT_INPUT.rounding,
    bore: String(state.bore),
  }
}
