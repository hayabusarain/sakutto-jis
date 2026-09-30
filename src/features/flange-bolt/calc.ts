import {
  COARSE_PITCH,
  FLANGES,
  NUT_HEIGHT,
  STANDARD_BOLT_LENGTHS,
  WASHER_THICKNESS,
  type FlangeRow,
  type PressureClass,
} from './data'

export type BoltType = 'hex' | 'stud'
export type NutKind = 'style1' | 'ja1'
export type Rounding = '5mm' | 'jis'

export function findFlange(pressure: PressureClass, size: string): FlangeRow | undefined {
  return FLANGES[pressure].find((row) => row.size === size)
}

export interface BoltLengthInput {
  /** ボルトの呼び径（M16 なら 16） */
  bolt: number
  /** 自分側・相手側のフランジ厚さ [mm] */
  t1: number
  t2: number
  /** ガスケット厚さ [mm] */
  gasket: number
  /** 平座金の枚数（ボルト1本あたり） */
  washers: 0 | 1 | 2
  nut: NutKind
  /** ナットからの突き出し（ねじ山の数） */
  threads: number
  type: BoltType
  rounding: Rounding
}

export interface BoltLengthResult {
  /** 締付け長さ（フランジ2枚 + ガスケット + 座金） */
  grip: number
  nutHeight: number
  washerThickness: number
  pitch: number
  /** 突き出し長さ = 山数 × ピッチ（スタッドボルトは両側） */
  protrusion: number
  /** 計算上の必要長さ */
  required: number
  /** 丸めた推奨長さ（標準長さを超えるときは null） */
  length: number | null
  /** 推奨長さにしたときの、ナットからの実際の突き出し（片側） */
  actualProtrusion: number | null
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * 六角ボルト: L = t1 + t2 + G + n×W + m + k×P
 * スタッドボルト（両ナット）: L = t1 + t2 + G + n×W + 2m + 2×k×P
 */
export function boltLength(input: BoltLengthInput): BoltLengthResult {
  const nutHeight = NUT_HEIGHT[input.bolt][input.nut]
  const washerThickness = WASHER_THICKNESS[input.bolt]
  const pitch = COARSE_PITCH[input.bolt]
  const nuts = input.type === 'stud' ? 2 : 1

  const grip = round2(input.t1 + input.t2 + input.gasket + input.washers * washerThickness)
  const protrusion = round2(input.threads * pitch * nuts)
  const required = round2(grip + nutHeight * nuts + protrusion)
  const length = roundLength(required, input.rounding)
  const actualProtrusion =
    length === null ? null : round2((length - grip - nutHeight * nuts) / nuts)

  return { grip, nutHeight, washerThickness, pitch, protrusion, required, length, actualProtrusion }
}

export function roundLength(required: number, rounding: Rounding): number | null {
  if (rounding === '5mm') return Math.ceil(required / 5 - 1e-9) * 5
  return STANDARD_BOLT_LENGTHS.find((length) => length >= required - 1e-9) ?? null
}

/** 突き出し長さをねじ山の数にする（小数1桁で切り捨て。浮動小数の誤差で 4.4 → 4.3 にならないよう補正） */
export function protrusionThreads(protrusion: number, pitch: number): number {
  return Math.floor((protrusion / pitch) * 10 + 1e-9) / 10
}
