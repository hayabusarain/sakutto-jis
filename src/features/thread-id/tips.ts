import { findPipeThread, pitch as pipePitch, rPipeEndDiameter } from '../pipe-thread/calc'
import { PIPE_THREAD_SIZES } from '../pipe-thread/data'
import { pitchesOf } from '../tap-drill/calc'
import { METRIC_SIZES } from '../tap-drill/data'

/** 「測り方のコツ」でテーパの差の例に使う間隔 [mm] */
export const TAPER_EXAMPLE_SPACING = 10

/** 数えるピッチ数の例（山頂11個 = 10ピッチ） */
export const EXAMPLE_PITCH_COUNT = 10

/** 対象のねじの範囲（データから） */
export const SCOPE = {
  metricMin: METRIC_SIZES[0].d,
  metricMax: METRIC_SIZES[METRIC_SIZES.length - 1].d,
  pipeMin: PIPE_THREAD_SIZES[0].size,
  pipeMax: PIPE_THREAD_SIZES[PIPE_THREAD_SIZES.length - 1].size,
}

/** R1/2 の管端の外径（M20 と取り違えやすい例） */
export const R_HALF_PIPE_END = rPipeEndDiameter(findPipeThread('1/2')!)

/** メートルねじのピッチ（重複なし・小さい順） */
const METRIC_PITCHES = [...new Set(METRIC_SIZES.flatMap((size) => pitchesOf(size)))].sort((a, b) => a - b)

export interface ConfusablePitch {
  tpi: number
  pitch: number
  tenPitches: number
  /** すぐ下・すぐ上のメートルねじのピッチ */
  metric: { pitch: number; tenPitches: number }[]
}

/**
 * 管用ねじの山数ごとに、ピッチが近いメートルねじ（すぐ下とすぐ上のピッチ）と、10ピッチ分の長さを並べる。
 * 例: 14山（1.814）→ P1.75・P2
 */
export function confusablePitches(count = EXAMPLE_PITCH_COUNT): ConfusablePitch[] {
  const tpis = [...new Set(PIPE_THREAD_SIZES.map((t) => t.tpi))].sort((a, b) => b - a)
  return tpis.map((tpi) => {
    const p = pipePitch(tpi)
    const below = [...METRIC_PITCHES].reverse().find((m) => m < p)
    const above = METRIC_PITCHES.find((m) => m > p)
    return {
      tpi,
      pitch: p,
      tenPitches: p * count,
      metric: [below, above]
        .filter((m): m is number => m !== undefined)
        .map((m) => ({ pitch: m, tenPitches: m * count })),
    }
  })
}
