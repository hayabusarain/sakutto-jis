/**
 * 寸法表ページに載せる行を、各ツールの data.ts・calc.ts から作る（数値を手書きしない）。
 */
import {
  boltLength,
  isRowUnverified,
  isUnverified,
  type BoltLengthInput,
  type BoltLengthResult,
} from '../../features/flange-bolt/calc'
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
 * 規格原文での確認が済んでいない値（ツールと同じ UNVERIFIED で判定する）。
 * row: 行全体（5K・10K の 90A・175A・225A）/ t: 厚さ（16K の全サイズ、5K 50A）
 */
export function flangeUnverified(pressure: PressureClass, size: string): { row: boolean; t: boolean } {
  return { row: isRowUnverified(pressure, size), t: isUnverified(pressure, size, 't') }
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

/** 寸法表で ※ を付ける欄 */
export interface FlangeTableMarks {
  /** 呼び径の欄（行全体が未確認） */
  size: boolean
  /** 厚さ t の欄 */
  t: boolean
  /** 六角ボルト・スタッドボルトの長さの欄（未確認の厚さから計算した長さ） */
  lengths: boolean
}

/**
 * ※ を付ける欄。行全体が未確認の行は呼び径の欄だけに付け、厚さだけが未確認の行は
 * 厚さと、その厚さから計算したボルト長さに付ける（ツールの表と同じ考え方）。
 */
export function flangeTableMarks(row: Pick<FlangeTableRow, 'unverified'>): FlangeTableMarks {
  const tOnly = row.unverified.t && !row.unverified.row
  return { size: row.unverified.row, t: tOnly, lengths: tOnly }
}

/** 表をコピー・CSV に書く「確認状況」（画面で ※ を付ける欄と同じ範囲） */
export function flangeTableStatus(row: Pick<FlangeTableRow, 'unverified'>): string {
  const marks = flangeTableMarks(row)
  if (marks.size) return '要確認（行全体）'
  if (marks.t || marks.lengths) return '要確認（厚さ・ボルト長さ）'
  return ''
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
