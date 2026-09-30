import {
  ANGLE_RANGES,
  ANGLE_TOLERANCES,
  CHAMFER_RANGES,
  CHAMFER_TOLERANCES,
  LINEAR_RANGES,
  LINEAR_TOLERANCES,
  type SizeRange,
  type ToleranceClass,
} from './data'

/** 長さ寸法（面取り部分を除く）・面取り部分の長さ寸法（かどの丸み・面取り）・角度寸法 */
export type ToleranceKind = 'linear' | 'chamfer' | 'angle'

export const TOLERANCE_KINDS: readonly ToleranceKind[] = ['linear', 'chamfer', 'angle']

interface ToleranceTable {
  ranges: readonly SizeRange[]
  /** linear・chamfer は μm、angle は分（′） */
  tolerances: Record<ToleranceClass, readonly (number | null)[]>
}

export const TABLES: Record<ToleranceKind, ToleranceTable> = {
  linear: { ranges: LINEAR_RANGES, tolerances: LINEAR_TOLERANCES },
  chamfer: { ranges: CHAMFER_RANGES, tolerances: CHAMFER_TOLERANCES },
  angle: { ranges: ANGLE_RANGES, tolerances: ANGLE_TOLERANCES },
}

const EPS = 1e-9

export type RangeLookup =
  | { status: 'ok'; index: number }
  /** 表の最小（0.5 mm）より小さい → 個々に公差を指示する */
  | { status: 'below' }
  /** 表の最大（4000 mm）より大きい → 規定なし */
  | { status: 'above' }
  /** 0 以下など */
  | { status: 'invalid' }

/**
 * 寸法がどの区分に入るか。区分の上端はその区分に含む（3 mm ちょうどは「0.5 以上 3 以下」）。
 */
export function findRange(ranges: readonly SizeRange[], size: number): RangeLookup {
  if (!Number.isFinite(size) || size <= 0) return { status: 'invalid' }
  for (let index = 0; index < ranges.length; index++) {
    const range = ranges[index]
    const aboveMin = range.includeMin ? size >= range.min - EPS : size > range.min + EPS
    const belowMax = range.max === null || size <= range.max + EPS
    if (aboveMin && belowMax) return { status: 'ok', index }
  }
  const first = ranges[0]
  return size < first.min + EPS ? { status: 'below' } : { status: 'above' }
}

export type ToleranceLookup =
  | { status: 'ok'; index: number; range: SizeRange; /** μm または分 */ tolerance: number }
  /** その区分では、この等級の許容差が規定されていない（表の「—」） */
  | { status: 'none'; index: number; range: SizeRange }
  | { status: 'below' }
  | { status: 'above' }
  | { status: 'invalid' }

export function lookupTolerance(kind: ToleranceKind, cls: ToleranceClass, size: number): ToleranceLookup {
  const table = TABLES[kind]
  const found = findRange(table.ranges, size)
  if (found.status !== 'ok') return found
  const range = table.ranges[found.index]
  const tolerance = table.tolerances[cls][found.index]
  return tolerance === null
    ? { status: 'none', index: found.index, range }
    : { status: 'ok', index: found.index, range, tolerance }
}

/** 表の見出し用の短い表記（「30超〜120」＝ 30 を超え 120 以下、「〜10」＝ 10 以下、「6超」＝ 6 を超えるもの） */
export function shortRangeLabel(range: SizeRange): string {
  if (range.max === null) return `${range.min}超`
  if (range.includeMin) return `${range.min}〜${range.max}`
  if (range.min === 0) return `〜${range.max}`
  return `${range.min}超〜${range.max}`
}

/** 区分の上端ちょうどの寸法か（「3 mm ちょうどは 3 以下の区分」と案内するため） */
export function isOnBoundary(kind: ToleranceKind, size: number): boolean {
  return TABLES[kind].ranges.some((range) => range.max !== null && Math.abs(size - range.max) < EPS)
}

// ---------------------------------------------------------------------------
// 表示

/** μm の許容差を「±0.05」の形にする */
export function formatPlusMinusMm(um: number): string {
  return `±${String(um / 1000)}`
}

/** 分の許容差を「±0°30′」「±1°」「±1°30′」の形にする（JIS の表の書き方） */
export function formatPlusMinusAngle(minutes: number): string {
  const degrees = Math.floor(minutes / 60)
  const rest = minutes % 60
  return rest === 0 ? `±${degrees}°` : `±${degrees}°${rest}′`
}

export function formatTolerance(kind: ToleranceKind, value: number): string {
  return kind === 'angle' ? formatPlusMinusAngle(value) : formatPlusMinusMm(value)
}

/** 入力した文字列の小数点以下の桁数（50.00 → 2）。上下の寸法をその桁でそろえるため */
export function decimalsOfInput(text: string): number {
  const normalized = text
    .trim()
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[．。,，]/g, '.')
  const match = /\.(\d+)$/.exec(normalized)
  return match ? match[1].length : 0
}

export interface Limits {
  upper: string
  lower: string
}

/**
 * 長さ寸法の上・下の寸法（寸法 ± 許容差）。桁は入力と許容差の多い方にそろえる。
 * 浮動小数の誤差が出ないよう、10^桁 倍した整数で足し引きする。
 */
export function linearLimits(size: number, sizeDecimals: number, toleranceUm: number): Limits {
  const tolDecimals = toleranceUm % 1000 === 0 ? 0 : toleranceUm % 100 === 0 ? 1 : toleranceUm % 10 === 0 ? 2 : 3
  const digits = Math.min(Math.max(sizeDecimals, tolDecimals), 6)
  const scale = 10 ** digits
  const s = Math.round(size * scale)
  const t = Math.round((toleranceUm * scale) / 1000)
  return {
    upper: ((s + t) / scale).toFixed(digits),
    lower: ((s - t) / scale).toFixed(digits),
  }
}

/** 秒を「89°30′」「22°30′15″」の形にする */
export function formatDms(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? '−' : ''
  const abs = Math.abs(Math.round(totalSeconds))
  const degrees = Math.floor(abs / 3600)
  const minutes = Math.floor((abs % 3600) / 60)
  const seconds = abs % 60
  let text = `${sign}${degrees}°`
  if (minutes !== 0 || seconds !== 0) text += `${minutes}′`
  if (seconds !== 0) text += `${seconds}″`
  return text
}

/** 度（10進）を「45.5°」の形に（小数4桁まで） */
export function formatDecimalDegrees(totalSeconds: number): string {
  const value = Number((totalSeconds / 3600).toFixed(4))
  return `${value < 0 ? '−' : ''}${String(Math.abs(value))}°`
}

export interface AngleLimits {
  upper: string
  lower: string
  upperDecimal: string
  lowerDecimal: string
}

/** 角度の上・下の値（角度 ± 許容差）。角度は10進の度で入力する */
export function angleLimits(angleDegrees: number, toleranceMinutes: number): AngleLimits {
  const nominal = Math.round(angleDegrees * 3600)
  const tolerance = toleranceMinutes * 60
  return {
    upper: formatDms(nominal + tolerance),
    lower: formatDms(nominal - tolerance),
    upperDecimal: formatDecimalDegrees(nominal + tolerance),
    lowerDecimal: formatDecimalDegrees(nominal - tolerance),
  }
}

/** 図面（表題欄の近く）に書く普通公差の指示 */
export function drawingNote(cls: ToleranceClass): string {
  return `普通公差 JIS B 0405-${cls}`
}
