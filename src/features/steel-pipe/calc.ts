import { PIPE_THREAD_SIZES, type PipeThreadSize } from '../pipe-thread/data'
import { PIPE_SIZES, PIPE_SPECS, WALL, type PipeSize, type PipeSpec } from './data'

/** 単位質量の係数（π × 密度7.85 ÷ 1000 を JIS で 0.02466 としたもの） */
export const MASS_FACTOR = 0.02466

/** 規格の並び（SGP → Sch40 → Sch80） */
export const PIPE_SPEC_KEYS = Object.keys(PIPE_SPECS) as PipeSpec[]

export interface PipeDimensions {
  size: PipeSize
  od: number
  t: number
  /** 内径 = 外径 − 2 × 厚さ */
  id: number
  /** 単位質量 [kg/m]（規格表の値） */
  massPerM: number
  /** 1m あたりの内容積 [L/m] = 満水時の水の質量 [kg/m] */
  volumePerM: number
  /** 1m あたりの外表面積 [m²/m]（塗装・保温の数量に） */
  surfacePerM: number
}

export function findPipeSize(a: string): PipeSize | undefined {
  return PIPE_SIZES.find((size) => size.a === a)
}

export function pipeDimensions(spec: PipeSpec, a: string): PipeDimensions | null {
  const size = findPipeSize(a)
  const wall = WALL[spec][a]
  if (!size || !wall) return null
  const [t, massPerM] = wall
  const id = round(size.od - 2 * t, 1)
  return {
    size,
    od: size.od,
    t,
    id,
    massPerM,
    volumePerM: (Math.PI / 4) * id * id * 1e-3,
    surfacePerM: (Math.PI * size.od) / 1000,
  }
}

/** JIS の式による単位質量 [kg/m]（丸め前） */
export function unitMass(od: number, t: number): number {
  return MASS_FACTOR * t * (od - t)
}

/** 有効数字 n 桁に丸める（JIS Z 8401 の規則A：ちょうど半分は偶数側） */
export function roundSignificant(value: number, digits: number): number {
  if (value === 0) return 0
  const exponent = Math.floor(Math.log10(Math.abs(value))) - digits + 1
  const scaled = value / 10 ** exponent
  const floor = Math.floor(scaled)
  const diff = scaled - floor
  let rounded: number
  if (Math.abs(diff - 0.5) < 1e-9) rounded = floor % 2 === 0 ? floor : floor + 1
  else rounded = Math.round(scaled)
  return Number((rounded * 10 ** exponent).toPrecision(digits + 2))
}

/** 単位質量を表示する有効数字の桁数（JIS の表と同じ） */
export const UNIT_MASS_DIGITS = 3

/**
 * 単位質量 [kg/m] の表示。JIS の表と同じ有効数字3桁で、末尾の 0 も残す
 * （15.0 → 「15.0」、4.1 → 「4.10」、0.419 → 「0.419」、129 → 「129」）。
 */
export function unitMassText(massPerM: number): string {
  const text = massPerM.toPrecision(UNIT_MASS_DIGITS)
  // 1000 以上・0.001 未満は指数表記になるので、ふつうの数字に戻す（鋼管の単位質量では起きない）
  return text.includes('e') ? String(Number(text)) : text
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** そのサイズがある規格だけを返す */
export function sizesOf(spec: PipeSpec): PipeSize[] {
  return PIPE_SIZES.filter((size) => WALL[spec][size.a] != null)
}

/**
 * その規格にあるサイズにする。無いサイズ（Sch40・Sch80 の 175A・225A）は外径が一番近いサイズに、
 * 呼び径そのものが無いときは null。
 */
export function nearestAvailableSize(spec: PipeSpec, a: string): string | null {
  const size = findPipeSize(a)
  if (!size) return null
  if (WALL[spec][a]) return a
  const nearest = nearestByOd(size.od, sizesOf(spec))
  return nearest?.size.a ?? null
}

/** その呼び径がある規格（SGP → Sch40 → Sch80 の順） */
export function specsWithSize(a: string): PipeSpec[] {
  return PIPE_SPEC_KEYS.filter((spec) => WALL[spec][a] != null)
}

/**
 * 規格に無い呼び径を近いサイズに置き換えたときの知らせ（置き換えていなければ null）。
 * 例: 「Sch40 に 175A は無いため（175A は SGP のみ）、外径が近い 150A にしました。」
 */
export function sizeChangeNotice(spec: PipeSpec, from: string, to: string): string | null {
  if (from === to) return null
  const others = specsWithSize(from).map((key) => PIPE_SPECS[key].label)
  const reason = others.length > 0 ? `（${from} は ${others.join('・')} のみ）` : ''
  return `${PIPE_SPECS[spec].label} に ${from} は無いため${reason}、外径が近い ${to} にしました。`
}

// ---- 質量 ----

export interface PipeWeight {
  /** 管の質量 [kg] = 単位質量 × 長さ */
  mass: number
  /** 管の中の水の質量 [kg]（水 1 L = 1 kg として） */
  water: number
  /** 満水時の質量 [kg] */
  full: number
}

/** 合計の長さ [m]（1本の長さ × 本数）での質量 */
export function pipeWeight(dims: PipeDimensions, totalLength: number): PipeWeight {
  const mass = dims.massPerM * totalLength
  const water = dims.volumePerM * totalLength
  return { mass, water, full: mass + water }
}

/** m の欄に mm で入れたと疑う長さ [m]（1本 100 m 以上の鋼管はまず無い） */
export const MM_SUSPECT_LENGTH = 100

/** 長さが mm で入力されたように見えるとき、m に直した値。そうでなければ null */
export function lengthLooksLikeMm(length: number): number | null {
  if (!(length >= MM_SUSPECT_LENGTH)) return null
  return Number((length / 1000).toPrecision(12))
}

/** 本数として使える値か（1以上の整数） */
export function isValidCount(count: number | null): count is number {
  return count !== null && Number.isInteger(count) && count >= 1
}

// ---- 規格の比較 ----

export interface SpecComparison {
  spec: PipeSpec
  /** その規格に無いサイズは null */
  dims: PipeDimensions | null
}

/** 同じ呼び径の SGP・Sch40・Sch80 */
export function compareSpecs(a: string): SpecComparison[] {
  return PIPE_SPEC_KEYS.map((spec) => ({ spec, dims: pipeDimensions(spec, a) }))
}

// ---- 実測から探す ----

/** 周長（外周）C から外径 D = C ÷ π */
export function diameterFromCircumference(c: number): number {
  return c / Math.PI
}

/** 外径 D の外周 C = π × D */
export function circumference(od: number): number {
  return Math.PI * od
}

export interface OdMatch {
  size: PipeSize
  /** 実測 − 規格の外径 [mm] */
  delta: number
}

/** 実測の外径に近い順に並べた呼び径（同じ差なら小さいサイズを先に） */
export function findByOd(measured: number, sizes: readonly PipeSize[] = PIPE_SIZES): OdMatch[] {
  return sizes
    .map((size) => ({ size, delta: measured - size.od }))
    .sort((x, y) => Math.abs(x.delta) - Math.abs(y.delta) || x.size.od - y.size.od)
}

function nearestByOd(measured: number, sizes: readonly PipeSize[]): OdMatch | undefined {
  return findByOd(measured, sizes)[0]
}

/**
 * 「近い」とみなす外径の差の目安 [mm]: 1 mm と外径の 3% の大きい方。
 * 巻尺での測定誤差を見込んだこのサイトの目安で、JIS の外径の許容差ではない。
 * どの呼び径でも、隣のサイズとの外径の差の半分より小さい（テストで確認）。
 */
export function odMatchTolerance(od: number): number {
  return Math.max(OD_TOLERANCE_MIN, od * OD_TOLERANCE_RATIO)
}

/** 外径の差の目安の最小値 [mm] と、外径に対する割合 */
export const OD_TOLERANCE_MIN = 1
export const OD_TOLERANCE_RATIO = 0.03

/** 実測の外径が、その呼び径の外径に近いといえるか */
export function isCloseOdMatch(match: OdMatch): boolean {
  return Math.abs(match.delta) <= odMatchTolerance(match.size.od) + 1e-9
}

export interface WallMatch {
  spec: PipeSpec
  /** 規格の厚さ [mm] */
  t: number
  /** 実測 − 規格の厚さ [mm] */
  delta: number
}

/** 実測の肉厚に近い順に並べた規格（その呼び径がある規格だけ。同じ差なら SGP → Sch40 → Sch80） */
export function wallMatches(a: string, measuredT: number): WallMatch[] {
  return PIPE_SPEC_KEYS.flatMap((spec) => {
    const wall = WALL[spec][a]
    return wall ? [{ spec, t: wall[0], delta: measuredT - wall[0] }] : []
  }).sort(
    (x, y) =>
      Math.abs(x.delta) - Math.abs(y.delta) ||
      PIPE_SPEC_KEYS.indexOf(x.spec) - PIPE_SPEC_KEYS.indexOf(y.spec),
  )
}

/** 一番近い規格（同じ厚さの規格が複数あるとき、たとえば 15A の SGP と Sch40 は両方） */
export function nearestSpecs(matches: readonly WallMatch[]): WallMatch[] {
  if (matches.length === 0) return []
  const best = Math.abs(matches[0].delta)
  return matches.filter((match) => Math.abs(match.delta) - best < 1e-9)
}

/**
 * 「どの規格とも違う」とみなす肉厚の差の目安: 一番近い規格の厚さの 15%（0.3 mm 未満なら 0.3 mm）。
 * このサイトの目安で、JIS の厚さの許容差ではない。
 */
export function wallMatchTolerance(t: number): number {
  return Math.max(WALL_TOLERANCE_MIN, t * WALL_TOLERANCE_RATIO)
}

/** 肉厚の差の目安の最小値 [mm] と、厚さに対する割合 */
export const WALL_TOLERANCE_MIN = 0.3
export const WALL_TOLERANCE_RATIO = 0.15

/** 一番近い規格の厚さとの差が目安を超えている（どの規格とも違う）か */
export function isWallFar(match: WallMatch): boolean {
  return Math.abs(match.delta) > wallMatchTolerance(match.t) + 1e-9
}

/** 実測では見分けにくい厚さの差 [mm]（これ以下の差しかない規格どうしは注意を出す） */
export const WALL_HARD_TO_TELL = 0.3

/** 一番近い規格と、厚さの差が WALL_HARD_TO_TELL 以下の別の厚さの規格（実測では見分けにくいもの） */
export function hardToTellSpecs(matches: readonly WallMatch[]): WallMatch[] {
  const best = nearestSpecs(matches)
  if (best.length === 0) return []
  const t = best[0].t
  return matches.filter(
    (match) => Math.abs(match.t - t) > 1e-9 && Math.abs(match.t - t) <= WALL_HARD_TO_TELL + 1e-9,
  )
}

/** その呼び径の管に切る管用ねじ（JIS B 0203 の表で対応する管の呼び径が一致するもの） */
export function pipeThreadFor(a: string): PipeThreadSize | undefined {
  return PIPE_THREAD_SIZES.find((thread) => thread.pipeA === a)
}
