/**
 * 寸法表ページに載せる行を、各ツールの data.ts・calc.ts から作る（数値を手書きしない）。
 */
import { boltLength, type BoltLengthInput, type BoltLengthResult } from '../../features/flange-bolt/calc'
import { FLANGES, type FlangeRow, type PressureClass } from '../../features/flange-bolt/data'
import { findORing, flatGroove, oRingNumbers, type ORing } from '../../features/o-ring/calc'
import type { CrossSectionGroup, GroupKey, ORingSeries } from '../../features/o-ring/data'
import { pipeDimensions, sizesOf, type PipeDimensions } from '../../features/steel-pipe/calc'
import type { PipeSpec } from '../../features/steel-pipe/data'

/* ---------------- フランジ ---------------- */

/**
 * 寸法表に載せるボルト長さの条件。フランジツールの初期値と同じ
 * （同じフランジ2枚・ガスケット 3mm・座金なし・JIS本体のナット・突き出し3山・5mm刻みに切り上げ）。
 */
export const TABLE_BOLT_CONDITIONS = {
  gasket: 3,
  washers: 0,
  nut: 'style1',
  threads: 3,
  rounding: '5mm',
} as const satisfies Partial<BoltLengthInput>

/**
 * 規格原文での確認が済んでいない値（docs/data-verification.md で確度 △ のもの）。
 * row: 行全体（5K・10K の 90A・175A・225A）/ t: 厚さ（16K の全サイズ、5K 50A）
 */
export function flangeUnverified(pressure: PressureClass, size: string): { row: boolean; t: boolean } {
  const row = (pressure === '5K' || pressure === '10K') && ['90A', '175A', '225A'].includes(size)
  const t = row || pressure === '16K' || (pressure === '5K' && size === '50A')
  return { row, t }
}

export interface FlangeTableRow extends FlangeRow {
  hex: BoltLengthResult
  stud: BoltLengthResult
  unverified: { row: boolean; t: boolean }
}

export function flangeTableRows(pressure: PressureClass): FlangeTableRow[] {
  return FLANGES[pressure].map((row) => {
    const input = { bolt: row.bolt, t1: row.t, t2: row.t, ...TABLE_BOLT_CONDITIONS }
    return {
      ...row,
      hex: boltLength({ ...input, type: 'hex' }),
      stud: boltLength({ ...input, type: 'stud' }),
      unverified: flangeUnverified(pressure, row.size),
    }
  })
}

/* ---------------- 鋼管 ---------------- */

export function pipeTableRows(spec: PipeSpec): PipeDimensions[] {
  return sizesOf(spec)
    .map((size) => pipeDimensions(spec, size.a))
    .filter((row): row is PipeDimensions => row !== null)
}

/* ---------------- Oリング ---------------- */

export function oRingTableRows(series: ORingSeries): ORing[] {
  return oRingNumbers(series).map((no) => findORing(series, no)!)
}

export interface ORingTableRow {
  ring: ORing
  /** 平面溝（固定用）の外圧用の溝内径・内圧用の溝外径（どちらも規格で決まる側の径） */
  flatExternalInner: number
  flatInternalOuter: number
}

export function oRingGrooveRows(series: ORingSeries): ORingTableRow[] {
  return oRingTableRows(series).map((ring) => ({
    ring,
    flatExternalInner: flatGroove(ring, 'external').inner,
    flatInternalOuter: flatGroove(ring, 'internal').outer,
  }))
}

export interface ORingGroupRange {
  key: GroupKey
  group: CrossSectionGroup
  /** そのグループの最初と最後の呼び番号（表の並び順） */
  first: string
  last: string
  count: number
}

/** 太さのグループごとの番号の範囲（溝幅・R・偏心などはグループで決まる） */
export function oRingGroupRanges(series: ORingSeries): ORingGroupRange[] {
  const ranges: ORingGroupRange[] = []
  for (const ring of oRingTableRows(series)) {
    const current = ranges[ranges.length - 1]
    if (current && current.key === ring.groupKey) {
      current.last = ring.no
      current.count += 1
    } else {
      ranges.push({ key: ring.groupKey, group: ring.group, first: ring.no, last: ring.no, count: 1 })
    }
  }
  return ranges
}
