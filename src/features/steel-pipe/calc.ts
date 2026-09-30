import { PIPE_SIZES, WALL, type PipeSize, type PipeSpec } from './data'

/** 単位質量の係数（π × 密度7.85 ÷ 1000 を JIS で 0.02466 としたもの） */
export const MASS_FACTOR = 0.02466

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

function round(value: number, digits: number): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

/** そのサイズがある規格だけを返す */
export function sizesOf(spec: PipeSpec): PipeSize[] {
  return PIPE_SIZES.filter((size) => WALL[spec][size.a] != null)
}
