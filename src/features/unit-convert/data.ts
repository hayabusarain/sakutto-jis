/**
 * 単位の定義。係数はすべて定義どおりの値（実測値・近似値は使わない）から計算する。
 *
 * - 標準重力 g = 9.80665 m/s²（1 kgf = 9.80665 N）
 * - 1 in = 25.4 mm、1 ft = 12 in = 304.8 mm
 * - 1 lb = 0.45359237 kg（1 lbf = 0.45359237 × 9.80665 N = 4.4482216152605 N）
 * - 1 bar = 100 kPa、1 atm（標準大気圧）= 101.325 kPa
 * - 1 mmHg = 101325/760 Pa（= 1 Torr）
 * - 1 mH2O = 9.80665 kPa（水の密度 1000 kg/m³ × 標準重力 × 1 m とした慣用の値）
 */

/** 標準重力 [m/s²]（1 kgf = 9.80665 N） */
export const STANDARD_GRAVITY = 9.80665
/** 1 インチ [m] */
export const INCH = 0.0254
/** 1 フィート [m] */
export const FOOT = 12 * INCH
/** 1 ポンド（質量）[kg] */
export const POUND = 0.45359237
/** 1 ポンド重 [N] = 4.4482216152605 N */
export const POUND_FORCE = POUND * STANDARD_GRAVITY
/** 標準大気圧 [Pa] */
export const STANDARD_ATMOSPHERE = 101325
/** 0 °C の熱力学温度 [K] */
export const ZERO_CELSIUS = 273.15

export type Quantity = 'pressure' | 'torque' | 'force' | 'length' | 'temperature'

export interface UnitDef {
  /** URL に使う ID（全量で重複しない） */
  id: string
  /** 画面の表記 */
  label: string
  /** 読み方・補足（例: 重量キロ毎平方センチ） */
  reading: string
  /** 基準の単位（Pa・N·m・N・m・K）に直す */
  toBase: (value: number) => number
  /** 基準の単位から直す */
  fromBase: (value: number) => number
  /** 比例する単位なら、1 単位が基準の単位でいくつか（温度は null） */
  factor: number | null
  /** 定義（計算ロジック欄に表示する） */
  definition: string
}

function linear(
  id: string,
  label: string,
  reading: string,
  factor: number,
  definition: string,
): UnitDef {
  return {
    id,
    label,
    reading,
    factor,
    definition,
    toBase: (value) => value * factor,
    fromBase: (value) => value / factor,
  }
}

export interface QuantityDef {
  label: string
  /** 基準の単位（換算の途中で使う） */
  base: string
  units: readonly UnitDef[]
  /** 既定の入力単位・表示単位 */
  defaultFrom: string
  defaultTo: string
  /** 負の値を入力できるか（ゲージ圧の真空・氷点下など） */
  allowNegative: boolean
}

const PRESSURE_UNITS: readonly UnitDef[] = [
  linear('MPa', 'MPa', 'メガパスカル（= N/mm²）', 1e6, '1 MPa = 1,000,000 Pa = 1 N/mm²'),
  linear('kPa', 'kPa', 'キロパスカル', 1e3, '1 kPa = 1000 Pa'),
  linear('Pa', 'Pa', 'パスカル（= N/m²）', 1, '1 Pa = 1 N/m²'),
  linear('bar', 'bar', 'バール', 1e5, '1 bar = 100 kPa（定義）'),
  linear(
    'kgfcm2',
    'kgf/cm²',
    '重量キロ毎平方センチ（旧単位）',
    STANDARD_GRAVITY / 1e-4,
    '1 kgf/cm² = 9.80665 N ÷ 1 cm² = 98.0665 kPa',
  ),
  linear(
    'psi',
    'psi',
    'ポンド毎平方インチ（lbf/in²）',
    POUND_FORCE / (INCH * INCH),
    '1 psi = 1 lbf ÷ 1 in² = 4.4482216152605 N ÷ (0.0254 m)² ≒ 6.894757 kPa',
  ),
  linear('atm', 'atm', '標準大気圧', STANDARD_ATMOSPHERE, '1 atm = 101.325 kPa（定義）'),
  linear(
    'mmHg',
    'mmHg',
    '水銀柱ミリメートル（≒ Torr）',
    STANDARD_ATMOSPHERE / 760,
    '1 mmHg = 101325/760 Pa ≒ 133.3224 Pa（標準大気圧の 1/760）',
  ),
  linear(
    'mH2O',
    'mH₂O',
    '水柱メートル（mAq）',
    STANDARD_GRAVITY * 1000,
    '1 mH₂O = 1000 kg/m³ × 9.80665 m/s² × 1 m = 9.80665 kPa（慣用の定義）',
  ),
  linear(
    'mmH2O',
    'mmH₂O',
    '水柱ミリメートル（mmAq）',
    STANDARD_GRAVITY,
    '1 mmH₂O = 9.80665 Pa（1 mH₂O の 1/1000）',
  ),
]

const TORQUE_UNITS: readonly UnitDef[] = [
  linear('Nm', 'N·m', 'ニュートンメートル', 1, '基準'),
  linear('kgfm', 'kgf·m', '重量キロメートル（旧単位）', STANDARD_GRAVITY, '1 kgf·m = 9.80665 N × 1 m = 9.80665 N·m'),
  linear(
    'kgfcm',
    'kgf·cm',
    '重量キロセンチ（旧単位）',
    STANDARD_GRAVITY / 100,
    '1 kgf·cm = 9.80665 N × 0.01 m = 0.0980665 N·m',
  ),
  linear(
    'lbfft',
    'lbf·ft',
    'ポンドフィート（ft·lb）',
    POUND_FORCE * FOOT,
    '1 lbf·ft = 4.4482216152605 N × 0.3048 m ≒ 1.355818 N·m',
  ),
  linear(
    'lbfin',
    'lbf·in',
    'ポンドインチ（in·lb）',
    POUND_FORCE * INCH,
    '1 lbf·in = 4.4482216152605 N × 0.0254 m ≒ 0.1129848 N·m',
  ),
]

const FORCE_UNITS: readonly UnitDef[] = [
  linear('N', 'N', 'ニュートン', 1, '基準'),
  linear('kN', 'kN', 'キロニュートン', 1000, '1 kN = 1000 N'),
  linear('kgf', 'kgf', '重量キログラム（旧単位）', STANDARD_GRAVITY, '1 kgf = 9.80665 N（標準重力の定義）'),
  linear('tf', 'tf', '重量トン（旧単位）', STANDARD_GRAVITY * 1000, '1 tf = 1000 kgf = 9806.65 N'),
  linear(
    'lbf',
    'lbf',
    'ポンド重',
    POUND_FORCE,
    '1 lbf = 0.45359237 kg × 9.80665 m/s² = 4.4482216152605 N',
  ),
]

const LENGTH_UNITS: readonly UnitDef[] = [
  linear('mm', 'mm', 'ミリメートル', 0.001, '1 mm = 0.001 m'),
  linear('m', 'm', 'メートル', 1, '基準'),
  linear('in', 'in', 'インチ（″）', INCH, '1 in = 25.4 mm（定義）'),
  linear('ft', 'ft', 'フィート（′）', FOOT, '1 ft = 12 in = 304.8 mm'),
]

const TEMPERATURE_UNITS: readonly UnitDef[] = [
  {
    id: 'C',
    label: '°C',
    reading: 'セルシウス度（摂氏）',
    factor: null,
    definition: 'K = °C + 273.15',
    toBase: (value) => value + ZERO_CELSIUS,
    fromBase: (value) => value - ZERO_CELSIUS,
  },
  {
    id: 'F',
    label: '°F',
    reading: 'ファーレンハイト度（華氏）',
    factor: null,
    definition: '°F = °C × 9/5 + 32（K = (°F + 459.67) × 5/9）',
    toBase: (value) => ((value + 459.67) * 5) / 9,
    fromBase: (value) => (value * 9) / 5 - 459.67,
  },
  {
    id: 'K',
    label: 'K',
    reading: 'ケルビン（絶対温度）',
    factor: null,
    definition: '基準（0 K が絶対零度）',
    toBase: (value) => value,
    fromBase: (value) => value,
  },
]

export const QUANTITIES: Record<Quantity, QuantityDef> = {
  pressure: {
    label: '圧力',
    base: 'Pa',
    units: PRESSURE_UNITS,
    defaultFrom: 'kgfcm2',
    defaultTo: 'MPa',
    allowNegative: true,
  },
  torque: {
    label: 'トルク',
    base: 'N·m',
    units: TORQUE_UNITS,
    defaultFrom: 'kgfm',
    defaultTo: 'Nm',
    allowNegative: false,
  },
  force: {
    label: '力',
    base: 'N',
    units: FORCE_UNITS,
    defaultFrom: 'kgf',
    defaultTo: 'N',
    allowNegative: false,
  },
  length: {
    label: '長さ',
    base: 'm',
    units: LENGTH_UNITS,
    defaultFrom: 'in',
    defaultTo: 'mm',
    allowNegative: false,
  },
  temperature: {
    label: '温度',
    base: 'K',
    units: TEMPERATURE_UNITS,
    defaultFrom: 'F',
    defaultTo: 'C',
    allowNegative: true,
  },
}

export const QUANTITY_KEYS = Object.keys(QUANTITIES) as Quantity[]
