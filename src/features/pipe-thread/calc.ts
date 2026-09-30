import { G_INTERNAL_MINOR_TOLERANCE, PIPE_THREAD_SIZES, type PipeThreadSize } from './data'

/** テーパ 1/16：直径は軸方向の長さ x に対して x/16 変化する */
export const TAPER = 1 / 16

export function findPipeThread(size: string): PipeThreadSize | undefined {
  return PIPE_THREAD_SIZES.find((s) => s.size === size)
}

/** ピッチ P = 25.4 ÷ 山数 */
export function pitch(tpi: number): number {
  return 25.4 / tpi
}

/** ねじ山の高さ h = 0.640327P（管用ねじの基準山形） */
export function threadHeight(tpi: number): number {
  return 0.640327 * pitch(tpi)
}

const round3 = (value: number) => Math.round(value * 1000) / 1000

/** G めねじ内径の許容範囲 D1 〜 D1 + T_D1 */
export function gMinorLimits(thread: PipeThreadSize) {
  const tolerance = G_INTERNAL_MINOR_TOLERANCE[thread.tpi]
  return { min: thread.d1, max: round3(thread.d1 + tolerance) }
}

/** G の推奨下穴径：許容範囲の中央に最も近い 0.1mm 刻みの径 */
export function gRecommendedDrill(thread: PipeThreadSize): number {
  const { min, max } = gMinorLimits(thread)
  const mid = (min + max) / 2
  const candidate = Math.round(mid * 10) / 10
  // 丸めで範囲外に出ることは無いが、念のため範囲内に収める
  return Math.min(Math.max(candidate, Math.ceil(min * 10) / 10), Math.floor(max * 10) / 10)
}

/**
 * Rc の有効ねじ部の奥端でのめねじ内径 = D1 − l/16。
 * テーパめねじは奥ほど細くなるので、下穴がこれより大きいと奥のねじ山が欠ける。
 */
export function rcInnerMinorDiameter(thread: PipeThreadSize): number | null {
  if (thread.usefulInternalRc === null) return null
  return round3(thread.d1 - thread.usefulInternalRc * TAPER)
}
