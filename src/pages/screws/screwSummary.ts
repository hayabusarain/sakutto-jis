/**
 * ねじの呼び（M3〜M36）ごとのまとめページに載せる値を、各ツールの data.ts・calc.ts から集める。
 */
import { BOLT_SIZES, type BoltSize } from '../../features/bolt-size/data'
import { isRowUnverified } from '../../features/flange-bolt/calc'
import { FLANGES, PRESSURE_CLASSES, type PressureClass } from '../../features/flange-bolt/data'
import {
  engagementPercent,
  findSize,
  minorDiameterLimits,
  pitchesOf,
  recommendHole,
  type Range,
  type Recommendation,
} from '../../features/tap-drill/calc'
import type { MetricSize } from '../../features/tap-drill/data'

/** まとめページで下穴径の基準にする公差域クラス（一般的な 6H） */
export const SUMMARY_GRADE = 6 as const

export interface PitchRow {
  p: number
  kind: '並目' | '細目'
  /** 用途が限られるピッチの注記 */
  note?: string
  /** めねじ内径 D1 の許容範囲（6H） */
  limits: Range | null
  /** 推奨下穴径（6H の範囲内） */
  recommended: Recommendation | null
  /** 推奨下穴径でのひっかかり率 [%] */
  engagement: number | null
}

export interface FlangeUse {
  pressure: PressureClass
  /** unverified: その呼び径の行（寸法・ボルトの呼び・本数）が規格原文で未確認（フランジのツールで ※ を付ける行） */
  sizes: readonly { size: string; n: number; unverified: boolean }[]
}

export interface ScrewSummary {
  d: number
  metric: MetricSize
  bolt: BoltSize
  /** 並目（まとめページのサイズはすべて並目がある） */
  coarse: PitchRow
  /** 並目 → 細目の順 */
  pitches: readonly PitchRow[]
  /** 並目ねじの有効断面積 As [mm²]（丸める前の値。表示は formatSignificant で有効数字3桁） */
  stressArea: number
  /** このボルトを使う JIS フランジ（呼び圧力ごとの呼び径とボルト本数） */
  flanges: readonly FlangeUse[]
  prev: number | null
  next: number | null
}

/** 基準山形の高さ H = (√3 / 2) × P */
const H_PER_PITCH = Math.sqrt(3) / 2

/**
 * ねじの有効断面積 As = π/4 × ((d2 + d3) / 2)² [mm²]（JIS B 1082）。
 * d2 = d − 0.75H（有効径）、d3 = d − (17/12)H（おねじの谷の径）なので (d2 + d3) / 2 = d − (13/12)H。
 */
export function stressArea(d: number, p: number): number {
  const h = H_PER_PITCH * p
  const d2 = d - 0.75 * h
  const d3 = d - (17 / 12) * h
  return (Math.PI / 4) * ((d2 + d3) / 2) ** 2
}

function pitchRow(metric: MetricSize, p: number): PitchRow {
  const limits = minorDiameterLimits(metric.d, p, SUMMARY_GRADE)
  const recommended = recommendHole(metric.d, p, SUMMARY_GRADE)
  return {
    p,
    kind: p === metric.coarse ? '並目' : '細目',
    note: metric.pitchNotes?.[String(p)],
    limits,
    recommended,
    engagement: recommended ? engagementPercent(metric.d, p, recommended.hole) : null,
  }
}

/** このボルトの呼びを使う JIS フランジ */
export function flangesUsingBolt(d: number): FlangeUse[] {
  return PRESSURE_CLASSES.map((pressure) => ({
    pressure,
    sizes: FLANGES[pressure]
      .filter((row) => row.bolt === d)
      .map((row) => ({ size: row.size, n: row.n, unverified: isRowUnverified(pressure, row.size) })),
  })).filter((use) => use.sizes.length > 0)
}

/** まとめページを作るねじの呼び（二面幅・座ぐりのデータがあるサイズ） */
export const SUMMARY_SIZES: readonly number[] = BOLT_SIZES.map((size) => size.d)

export function screwSummary(d: number): ScrewSummary | null {
  const metric = findSize(d)
  const bolt = BOLT_SIZES.find((size) => size.d === d)
  if (!metric || !bolt || metric.coarse === null) return null
  const pitches = pitchesOf(metric).map((p) => pitchRow(metric, p))
  const index = SUMMARY_SIZES.indexOf(d)
  return {
    d,
    metric,
    bolt,
    coarse: pitches[0],
    pitches,
    stressArea: stressArea(d, metric.coarse),
    flanges: flangesUsingBolt(d),
    prev: index > 0 ? SUMMARY_SIZES[index - 1] : null,
    next: index < SUMMARY_SIZES.length - 1 ? SUMMARY_SIZES[index + 1] : null,
  }
}

