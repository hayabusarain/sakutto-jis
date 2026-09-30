import { G_ROWS, GROUPS, P_ROWS, type CrossSectionGroup, type GroupKey, type ORingSeries } from './data'

export interface ORing {
  series: ORingSeries
  no: string
  d1: number
  d1Tol: number
  groupKey: GroupKey
  group: CrossSectionGroup
  /** ハウジングの d（ピストン型の溝底径・ロッド型の軸径） = 呼び番号の数値 */
  d: number
  /** ハウジングの D（ピストン型のシリンダ内径・ロッド型の溝底径） = d + (D − d) */
  D: number
}

const rowsOf = (series: ORingSeries) => (series === 'P' ? P_ROWS : G_ROWS)

/** 太さのグループの境目（この番号から次のグループ） */
const BOUNDARIES: Record<ORingSeries, readonly (readonly [string, GroupKey])[]> = {
  P: [
    ['P3', 'P1_9'],
    ['P10A', 'P2_4'],
    ['P22A', 'P3_5'],
    ['P48A', 'P5_7'],
    ['P150A', 'P8_4'],
  ],
  G: [
    ['G25', 'G3_1'],
    ['G150', 'G5_7'],
  ],
}

function groupKeyOf(series: ORingSeries, index: number): GroupKey {
  const rows = rowsOf(series)
  let key = BOUNDARIES[series][0][1]
  for (const [start, groupKey] of BOUNDARIES[series]) {
    if (index >= rows.findIndex(([no]) => no === start)) key = groupKey
  }
  return key
}

export function oRingNumbers(series: ORingSeries): string[] {
  return rowsOf(series).map(([no]) => no)
}

export function findORing(series: ORingSeries, no: string): ORing | undefined {
  const rows = rowsOf(series)
  const index = rows.findIndex(([n]) => n === no)
  if (index < 0) return undefined
  const [, d1, d1Tol] = rows[index]
  const groupKey = groupKeyOf(series, index)
  const group = GROUPS[groupKey]
  const d = Number(no.slice(1).replace(/A$/, ''))
  return { series, no, d1, d1Tol, groupKey, group, d, D: round3(d + group.dDiff) }
}

const round3 = (value: number) => Math.round(value * 1000) / 1000

/** 溝の深さ（半径方向のすきま） = (D − d) / 2 */
export function grooveDepth(ring: ORing): number {
  return ring.group.dDiff / 2
}

/** つぶし率 [%] = (d2 − 溝の深さ) ÷ d2 × 100 */
export function squeeze(d2: number, depth: number): number {
  return ((d2 - depth) / d2) * 100
}

/**
 * つぶし率の範囲（Oリングの太さと d・D の寸法許容差を考慮。偏心は含まない）。
 * 最小: 太さが最小で溝が最も深いとき / 最大: 太さが最大で溝が最も浅いとき
 */
export function squeezeRange(ring: ORing): { min: number; max: number } | null {
  const tol = ring.group.diaTol
  if (tol === null) return null
  const depth = grooveDepth(ring)
  const d2 = ring.group.d2
  const d2Tol = ring.group.d2Tol
  return {
    min: squeeze(d2 - d2Tol, depth + tol),
    max: squeeze(d2 + d2Tol, depth),
  }
}

/** 充てん率 [%] = Oリングの断面積 ÷ 溝の断面積（溝幅 × 深さ）× 100 */
export function fillRatio(ring: ORing, backupRings: 0 | 1 | 2): number {
  const area = (Math.PI / 4) * ring.group.d2 ** 2
  return (area / (ring.group.widths[backupRings] * grooveDepth(ring))) * 100
}

/** ピストン型で溝底（d）にはめたときの内径の伸び [%] */
export function stretch(ring: ORing): number {
  return ((ring.d - ring.d1) / ring.d1) * 100
}

/** Oリングの外径（参考）= d1 + 2 × d2 */
export function outerDiameter(ring: ORing): number {
  return round3(ring.d1 + 2 * ring.group.d2)
}

/** 平面溝の深さ h の許容差 ± */
export const FLAT_DEPTH_TOL = 0.05

export type FlatPressure = 'internal' | 'external'

export interface FlatGroove {
  /** 溝の外径・内径（内圧用は外径が規格値、外圧用は内径が規格値。反対側は溝幅から求めた値） */
  outer: number
  inner: number
  depth: number
  width: number
}

/**
 * 平面溝（固定用）。
 * 内圧用: 溝外径 = 呼び番号の数値 + オフセット（Oリングの外周が溝の外壁に当たる）
 * 外圧用: 溝内径 = 呼び番号の数値（Oリングの内周が溝の内壁に当たる）
 */
export function flatGroove(ring: ORing, pressure: FlatPressure): FlatGroove {
  const { flatDepth: depth, flatWidth: width, flatOffset } = ring.group
  if (pressure === 'internal') {
    const outer = round3(ring.d + flatOffset)
    return { outer, inner: round3(outer - 2 * width), depth, width }
  }
  return { outer: round3(ring.d + 2 * width), inner: ring.d, depth, width }
}

/** 平面溝のつぶし率の範囲（太さの許容差と溝の深さ h ±0.05 の両端） */
export function flatSqueezeRange(ring: ORing): { min: number; max: number } {
  const { d2, d2Tol, flatDepth } = ring.group
  return {
    min: squeeze(d2 - d2Tol, flatDepth + FLAT_DEPTH_TOL),
    max: squeeze(d2 + d2Tol, flatDepth - FLAT_DEPTH_TOL),
  }
}

/** 平面溝の充てん率 [%] */
export function flatFillRatio(ring: ORing): number {
  const area = (Math.PI / 4) * ring.group.d2 ** 2
  return (area / (ring.group.flatWidth * ring.group.flatDepth)) * 100
}
