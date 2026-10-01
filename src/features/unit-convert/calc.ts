import { commaNote, normalizeDigits, resolveCommas } from '../../lib/format'
import { INCH, QUANTITIES, QUANTITY_KEYS, STANDARD_ATMOSPHERE, type Quantity, type UnitDef } from './data'

/** 量の中から単位を探す */
export function findUnit(quantity: Quantity, id: string): UnitDef | undefined {
  return QUANTITIES[quantity].units.find((unit) => unit.id === id)
}

/** 単位 ID からどの量の単位かを調べる（URL で単位だけ指定されたとき用） */
export function quantityOfUnit(id: string): Quantity | undefined {
  return QUANTITY_KEYS.find((quantity) => findUnit(quantity, id) !== undefined)
}

/** from の単位の値を to の単位に換算する */
export function convert(value: number, from: UnitDef, to: UnitDef): number {
  if (from.id === to.id) return value
  return to.fromBase(from.toBase(value))
}

/** 絶対温度が 0 未満（絶対零度より低い）なら false */
export function isPhysicalTemperature(value: number, unit: UnitDef): boolean {
  return unit.toBase(value) >= -1e-9
}

/**
 * ゲージ圧 ↔ 絶対圧（大気圧を標準大気圧 101.325 kPa とする）。
 * 値は同じ単位のまま返す（例: 0.5 MPa ゲージ → 0.601325 MPa 絶対）。
 */
export function gaugeToAbsolute(value: number, unit: UnitDef): number {
  return unit.fromBase(unit.toBase(value) + STANDARD_ATMOSPHERE)
}

export function absoluteToGauge(value: number, unit: UnitDef): number {
  return unit.fromBase(unit.toBase(value) - STANDARD_ATMOSPHERE)
}

// ---------------------------------------------------------------------------
// 入力の読み取り

const DECIMAL = /^-?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i
// 1-1/4、1 1/4、3/8、-1/2 など（帯分数の区切りはハイフンか空白）
const FRACTION = /^(-)?(?:(\d+)[ -])?(\d+)\/(\d+)$/

/**
 * 入力欄の文字列を数値にする。全角数字、カンマ（サイト共通のルール: 1,000 は3桁区切り、
 * 0,125・8,5 は小数点。lib/format の resolveCommas）、インチの分数（1-1/4・1 1/4・3/8）、
 * 末尾のインチ記号（″ "）に対応。読めないときは null。
 */
export function parseValue(text: string): number | null {
  let s = normalizeDigits(text.trim())
    .replace(/[／⁄]/g, '/')
    .replace(/[\s　]+/g, ' ')
    .replace(/ ?- ?/g, '-')
    .replace(/ ?["″”]$/, '')
    .trim()
  if (s === '') return null

  s = resolveCommas(s)

  if (DECIMAL.test(s)) {
    const value = Number(s)
    return Number.isFinite(value) ? value : null
  }

  const fraction = FRACTION.exec(s)
  if (fraction) {
    const [, minus, whole, numerator, denominator] = fraction
    const den = Number(denominator)
    if (den === 0) return null
    const value = (whole ? Number(whole) : 0) + Number(numerator) / den
    return minus ? -value : value
  }
  return null
}

/**
 * 入力にカンマがあったとき、どう読んだかの説明（lib/format の commaNote）。
 * 末尾のインチ記号（0,125″）は外して見る。カンマが無い・読めないときは null。
 */
export function valueCommaNote(text: string): string | null {
  return commaNote(text.trim().replace(/[\s　]*["″”]$/, ''))
}

// ---------------------------------------------------------------------------
// 表示

/** 表示する有効数字 */
export const SIGNIFICANT_DIGITS = 6

const SUPERSCRIPT: Record<string, string> = {
  '-': '⁻',
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
}

/**
 * 有効数字 sig 桁に四捨五入した値（表示と同じ値）。
 * 0.0980665 + 0.101325 = 0.19939149999999998 のような浮動小数の誤差で切り捨てにならないよう、
 * いったん12桁に丸めてから、10進の数字の列で四捨五入する（→ 0.199392）。
 */
export function roundSignificant(value: number, sig = SIGNIFICANT_DIGITS): number {
  if (value === 0 || !Number.isFinite(value)) return value
  const [mantissa, exponent] = Math.abs(value).toExponential(11).split('e')
  const digits = mantissa.replace('.', '')
  let exp = Number(exponent)
  let kept = digits.slice(0, sig)
  if (Number(digits[sig] ?? '0') >= 5) {
    // kept は先頭が 0 でない sig 桁の整数（6桁程度）なので Number で正確に足せる
    const up = String(Number(kept) + 1)
    if (up.length > kept.length) {
      // 999999 → 1000000（桁が1つ上がる）
      exp += 1
      kept = up.slice(0, sig)
    } else {
      kept = up
    }
  }
  const rounded = Number(`${kept[0]}.${kept.slice(1)}e${exp}`)
  return value < 0 ? -rounded : rounded
}

function groupThousands(text: string): string {
  const [integer, decimal] = text.split('.')
  const sign = integer.startsWith('-') ? '-' : ''
  const digits = sign ? integer.slice(1) : integer
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${grouped}${decimal === undefined ? '' : `.${decimal}`}`
}

/**
 * 換算結果の表示。有効数字6桁で丸め、不要な0を落とす。1000 以上は3桁区切り。
 * とても大きい・小さい値は「1.23457×10⁻⁷」の形にする。
 */
export function formatValue(value: number, sig = SIGNIFICANT_DIGITS): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const rounded = roundSignificant(value, sig)
  const abs = Math.abs(rounded)
  if (abs >= 1e10 || abs < 1e-6) {
    const [mantissa, exponent] = rounded.toExponential(sig - 1).split('e')
    const m = String(Number(mantissa))
    const e = String(Number(exponent))
    return `${m}×10${[...e].map((char) => SUPERSCRIPT[char]).join('')}`
  }
  return groupThousands(plainValue(value, sig))
}

/**
 * 入力した値を見せるときの表記（結果の文・「入力」の行・コピー）。換算結果と違って6桁に丸めず、
 * 3桁区切りだけを付ける（1234567 → 1,234,567、1250.125 → 1,250.125）。
 * 有効数字が12桁を超える値（分数 1/3 など）や、とても大きい・小さい値は formatValue（12桁）で書く。
 */
export function echoValue(value: number): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const abs = Math.abs(value)
  const plain = String(value)
  const significant = plain.replace(/^-|\./g, '').replace(/^0+/, '')
  if (abs < 1e-6 || abs >= 1e21 || significant.length > 12) return formatValue(value, 12)
  return groupThousands(plain)
}

/** 入力欄に戻すときの表記（3桁区切りなし・有効数字6桁） */
export function plainValue(value: number, sig = SIGNIFICANT_DIGITS): string {
  if (!Number.isFinite(value) || value === 0) return '0'
  const rounded = roundSignificant(value, sig)
  const abs = Math.abs(rounded)
  // 1e-6 未満は String() が指数表記になるので、桁を指定して書き出す
  if (abs < 1e-6 || abs >= 1e21) return rounded.toPrecision(sig).replace(/\.?0+(?=e|$)/, '')
  return String(rounded)
}

/** 表示した値が丸めていない（ぴったり）なら true。「=」と「≒」の使い分けに使う */
export function isExact(value: number, sig = SIGNIFICANT_DIGITS): boolean {
  if (value === 0 || !Number.isFinite(value)) return true
  return Math.abs(roundSignificant(value, sig) - value) <= Math.abs(value) * 1e-12
}

// ---------------------------------------------------------------------------
// インチの分数

export interface InchFraction {
  /** 分数に丸めた値 [in] */
  value: number
  /** 表記（例: 1-1/4、63/64、2） */
  text: string
  /** 約分前の分母（16・32・64） */
  denominator: number
  /** 元の値との差 [mm]（分数 − 元の値） */
  errorMm: number
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

/** 分母 denominator のいちばん近い分数（約分して帯分数で表す）。例: 1.26 in, 16 → 1-1/4 */
export function nearestInchFraction(inches: number, denominator: number): InchFraction {
  const sign = inches < 0 ? -1 : 1
  const units = Math.round(Math.abs(inches) * denominator)
  const whole = Math.floor(units / denominator)
  const remainder = units % denominator
  const divisor = remainder === 0 ? 1 : gcd(remainder, denominator)
  const num = remainder / divisor
  const den = denominator / divisor
  let text: string
  if (remainder === 0) text = String(whole)
  else if (whole === 0) text = `${num}/${den}`
  else text = `${whole}-${num}/${den}`
  if (sign < 0 && units !== 0) text = `-${text}`
  const value = (sign * units) / denominator
  return { value, text, denominator, errorMm: (value - inches) * INCH * 1000 }
}

/** フィート・インチ表記（1/16 in 単位）。例: 66.5 in → 5′ 6-1/2″ */
export function formatFeetInches(inches: number): string {
  const sign = inches < 0 ? '-' : ''
  const sixteenths = Math.round(Math.abs(inches) * 16)
  const feet = Math.floor(sixteenths / (12 * 16))
  const rest = nearestInchFraction((sixteenths % (12 * 16)) / 16, 16).text
  if (feet === 0) return `${sign}${rest}″`
  return `${sign}${feet}′ ${rest}″`
}
