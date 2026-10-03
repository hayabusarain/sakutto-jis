import {
  B3_MISPRINT,
  BACKUP_PRESSURE_LIMITS,
  G_ROWS,
  GROUPS,
  NO_BACKUP_MAX_CLEARANCE,
  P_ROWS,
  type CrossSectionGroup,
  type GroupKey,
  type ORingHardness,
  type ORingSeries,
} from './data'

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

/* ───────── はめたときの伸び・縮み ───────── */

/** 内径 d1 を径 diameter の面にはめたときの内径の伸び [%] = (diameter − d1) ÷ d1 × 100 */
export function innerStretch(d1: number, diameter: number): number {
  return ((diameter - d1) / d1) * 100
}

/**
 * 外径（d1 + 2·d2）を径 diameter の穴に入れたときの外径の縮み [%] = (外径 − diameter) ÷ 外径 × 100。
 * ロッド型の溝底（D）や、平面・内圧用の溝の外壁に当てたときの周方向の縮み。
 */
export function outerCompression(ring: ORing, diameter: number): number {
  const outer = ring.d1 + 2 * ring.group.d2
  return ((outer - diameter) / outer) * 100
}

/** 円筒面の溝の型。ピストン型は軸（ピストン）側に溝、ロッド型は穴（ハウジング）側に溝 */
export type HousingType = 'piston' | 'rod'

export interface RingFit {
  /** stretch: 内径を溝底・内壁にはめて伸ばす / compression: 外径を溝底・外壁に当てて縮める */
  kind: 'stretch' | 'compression'
  /** 当たる面の径 */
  diameter: number
  /** 伸び・縮み [%] */
  value: number
}

/**
 * 溝にはめたときの伸び・縮み（溝底や溝の壁に当たる側で決まる）。
 * ピストン型: 内径が溝底 d に / ロッド型: 外径が溝底 D に /
 * 平面・内圧用: 外径が溝の外壁に / 平面・外圧用: 内径が溝の内壁に当たる。
 */
export function ringFit(
  ring: ORing,
  groove: 'cylinder' | 'flat-internal' | 'flat-external',
  housing: HousingType,
): RingFit {
  if (groove === 'flat-internal') {
    const diameter = flatGroove(ring, 'internal').outer
    return { kind: 'compression', diameter, value: outerCompression(ring, diameter) }
  }
  if (groove === 'flat-external') {
    const diameter = flatGroove(ring, 'external').inner
    return { kind: 'stretch', diameter, value: innerStretch(ring.d1, diameter) }
  }
  return housing === 'piston'
    ? { kind: 'stretch', diameter: ring.d, value: innerStretch(ring.d1, ring.d) }
    : { kind: 'compression', diameter: ring.D, value: outerCompression(ring, ring.D) }
}

/* ───────── 相手寸法・実物の寸法から番号を探す ───────── */

/** 径の比較の余裕 */
const EPS = 1e-6

/** P と G の全サイズ（P → G の順） */
export function allORings(): ORing[] {
  return (['P', 'G'] as const).flatMap((series) => oRingNumbers(series).map((no) => findORing(series, no)!))
}

/** その型でOリングの相手になる径（ピストン型はシリンダ内径 D、ロッド型は軸径 d） */
export function matingDiameter(ring: ORing, housing: HousingType): number {
  return housing === 'piston' ? ring.D : ring.d
}

/** その型の溝底径（ピストン型は d、ロッド型は D） */
export function grooveBottomDiameter(ring: ORing, housing: HousingType): number {
  return housing === 'piston' ? ring.d : ring.D
}

export interface DiameterGroup {
  diameter: number
  rings: ORing[]
}

export interface MatingLookup {
  /** 相手の径がちょうど合う番号（溝底径は問わない） */
  matches: ORing[]
  /** matches のうち、溝底径も合うもの（溝底径を指定しなければ matches と同じ） */
  exact: ORing[]
  /** ちょうど合う番号が無いとき、すぐ下・すぐ上の相手径とその番号 */
  below: DiameterGroup | null
  above: DiameterGroup | null
}

/**
 * 相手の径（ピストン型はシリンダ内径 D、ロッド型は軸径 d）から、P・G の両方で番号を探す。
 * bottom（溝底径）も指定すると、両方が合うものを exact にする（既存のハウジングの確認用）。
 */
export function findByMatingDiameter(housing: HousingType, diameter: number, bottom?: number): MatingLookup {
  const rings = allORings()
  const at = (value: number) => rings.filter((ring) => Math.abs(matingDiameter(ring, housing) - value) < EPS)
  const matches = at(diameter)
  const exact =
    bottom === undefined
      ? matches
      : matches.filter((ring) => Math.abs(grooveBottomDiameter(ring, housing) - bottom) < EPS)
  if (matches.length > 0) return { matches, exact, below: null, above: null }

  const diameters = rings.map((ring) => matingDiameter(ring, housing))
  const lower = diameters.filter((value) => value < diameter)
  const higher = diameters.filter((value) => value > diameter)
  const group = (values: number[], pick: (...values: number[]) => number): DiameterGroup | null => {
    if (values.length === 0) return null
    const value = pick(...values)
    return { diameter: value, rings: at(value) }
  }
  return { matches, exact, below: group(lower, Math.max), above: group(higher, Math.min) }
}

/**
 * JIS B 2401-1 の P・G 系列の太さ d2 の種類（小さい順）: 1.9・2.4・3.1・3.5・5.7・8.4
 * （真空フランジ用の V 系列の 4・6・10 は含まない）
 */
export const CROSS_SECTIONS: readonly number[] = [...new Set(Object.values(GROUPS).map((group) => group.d2))].sort(
  (a, b) => a - b,
)

/** 測った太さが2つの太さのほぼ中間のとき、両方を候補にする幅 [mm] */
const D2_AMBIGUITY = 0.15

/** 測った太さが、最も近い規格の太さからこの割合より離れていたら注意を出す */
const D2_FAR_RATIO = 0.08

export interface RingCandidate {
  ring: ORing
  /** 測った値 − 規格の値 */
  dd1: number
  dd2: number
  /** 内径・太さとも規格の許容差に入っている */
  withinTol: boolean
}

export interface RingIdentification {
  /** 測った太さに最も近い規格の太さ */
  nearestD2: number
  /** 測った太さが規格の太さから大きく離れている（8% を超える） */
  d2Far: boolean
  /** 候補にした太さ（近い順。ほぼ中間なら2つ） */
  d2Options: number[]
  /** 内径の差が小さい順 */
  candidates: RingCandidate[]
}

/**
 * 実物の内径 d1 × 太さ d2 から、近い番号を探す。
 * 太さを最も近い規格の太さに寄せ（ほぼ中間なら両方）、その太さの P・G を内径の差が小さい順に並べる。
 */
export function identifyByRing(d1: number, d2: number, limit = 5): RingIdentification {
  const distances = CROSS_SECTIONS.map((value) => ({ value, distance: Math.abs(d2 - value) })).sort(
    (a, b) => a.distance - b.distance,
  )
  const nearest = distances[0]
  const d2Options = distances
    .filter(({ distance }) => distance <= nearest.distance + D2_AMBIGUITY + EPS)
    .map(({ value }) => value)
  const candidates = allORings()
    .filter((ring) => d2Options.includes(ring.group.d2))
    .map((ring) => {
      const dd1 = round3(d1 - ring.d1)
      const dd2 = round3(d2 - ring.group.d2)
      return {
        ring,
        dd1,
        dd2,
        withinTol: Math.abs(dd1) <= ring.d1Tol + EPS && Math.abs(dd2) <= ring.group.d2Tol + EPS,
      }
    })
    .sort((a, b) => Math.abs(a.dd1) - Math.abs(b.dd1) || Math.abs(a.dd2) - Math.abs(b.dd2))
    .slice(0, limit)
  return {
    nearestD2: nearest.value,
    d2Far: nearest.distance > nearest.value * D2_FAR_RATIO + EPS,
    d2Options,
    candidates,
  }
}

/**
 * JIS B 2401-2:2012 表3 で、溝幅 b3（バックアップリング2個）が誤って「1.5」と印刷されている欄の番号か
 * （P48A〜P60。サイトは 11.5 を載せている。data.ts の B3_MISPRINT）
 */
export function hasB3Misprint(ring: ORing): boolean {
  if (ring.series !== 'P') return false
  const numbers = oRingNumbers('P')
  const index = numbers.indexOf(ring.no)
  return index >= numbers.indexOf(B3_MISPRINT.first) && index <= numbers.indexOf(B3_MISPRINT.last)
}

// ---------------------------------------------------------------------------
// バックアップリングが要るかの目安（JIS B 2401-2:2012 表2。旧 JIS B 2406:1991 の表1 と同じ値）

/** 使用圧力の区分の表記 [MPa]（例: 「4.0 以下」「4.0 を超え 6.3 以下」） */
export function pressureBandLabel(index: number): string {
  const max = BACKUP_PRESSURE_LIMITS[index].toFixed(1)
  return index === 0 ? `${max} 以下` : `${BACKUP_PRESSURE_LIMITS[index - 1].toFixed(1)} を超え ${max} 以下`
}

/** 表の見出し用の短い表記（「〜4.0」＝ 4.0 以下、「4.0超〜6.3」＝ 4.0 を超え 6.3 以下） */
export function pressureBandShortLabel(index: number): string {
  const max = BACKUP_PRESSURE_LIMITS[index].toFixed(1)
  return index === 0 ? `〜${max}` : `${BACKUP_PRESSURE_LIMITS[index - 1].toFixed(1)}超〜${max}`
}

export type NoBackupClearance =
  | { status: 'ok'; /** 圧力の区分 */ index: number; /** すきま 2g の最大値 [mm] */ max: number }
  /** 使用圧力が 25.0 MPa を超える（表2 の区分にない） */
  | { status: 'above' }
  | { status: 'invalid' }

/** 使用圧力 p [MPa] のとき、バックアップリングなしで使えるすきま 2g の最大値。区分の上端はその区分に含む */
export function noBackupMaxClearance(hardness: ORingHardness, pressureMpa: number): NoBackupClearance {
  if (!Number.isFinite(pressureMpa) || pressureMpa < 0) return { status: 'invalid' }
  const index = BACKUP_PRESSURE_LIMITS.findIndex((limit) => pressureMpa <= limit + 1e-9)
  if (index < 0) return { status: 'above' }
  return { status: 'ok', index, max: NO_BACKUP_MAX_CLEARANCE[hardness][index] }
}

/**
 * すきま 2g [mm] が、バックアップリングなしで使える最大値を超えるか（超えるならバックアップリングを使う）。
 * 25.0 MPa を超える（表2 の区分にない）・値が不正なときは null。
 */
export function needsBackupRing(hardness: ORingHardness, pressureMpa: number, clearance2g: number): boolean | null {
  const found = noBackupMaxClearance(hardness, pressureMpa)
  if (found.status !== 'ok' || !Number.isFinite(clearance2g) || clearance2g < 0) return null
  return clearance2g > found.max + 1e-9
}
