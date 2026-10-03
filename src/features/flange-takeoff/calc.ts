import {
  findFlange,
  flangeBoltLength,
  nominalNumber,
  type BoltConditions,
  type BoltLengthResult,
} from '../flange-bolt/calc'
import { PRESSURE_CLASSES, type FlangeRow, type PressureClass } from '../flange-bolt/data'
import { parseJointCount, type TakeoffRow } from './input'

/**
 * 一覧の全行に共通の条件。相手側も同じフランジとして計算する（JISフランジ＆ボルト長さの「相手側 空欄」と同じ）
 */
export type TakeoffConditions = Omit<BoltConditions, 't2'>

/** 一覧の1行の計算結果 */
export interface TakeoffLine {
  /** 一覧の何行目か（0 から） */
  index: number
  pressure: PressureClass
  size: string
  /** JIS B 2220 の寸法（ボルトの呼び・穴数・厚さ） */
  flange: FlangeRow
  /** か所数。入力が正しくないときは null（集計に入れない） */
  joints: number | null
  /** ボルトの長さ（JISフランジ＆ボルト長さと同じ計算） */
  bolt: BoltLengthResult
  /** 1か所あたりの数 */
  perJoint: { bolts: number; nuts: number; washers: number; gaskets: number }
  /** この行の数（か所数 × 1か所あたり。joints が null なら 0） */
  bolts: number
  nuts: number
  washers: number
  gaskets: number
}

/** 品目の種類（表示・集計の順） */
export const TAKEOFF_ITEM_KINDS = ['bolt', 'nut', 'washer', 'gasket'] as const
export type TakeoffItemKind = (typeof TAKEOFF_ITEM_KINDS)[number]

interface ItemCount {
  /** 必要数（予備なし） */
  quantity: number
  /** 予備（quantity × 予備の割合 を切り上げ） */
  spare: number
  /** 予備を含む数 */
  total: number
}

/** 品目（何を数えるか）。key は集計のまとめ方（同じ key なら1つの品目） */
type ItemSpec =
  /** ボルト: 呼び径 × 長さ（長さは丸めた長さ。標準長さを超えるときは null） */
  | { kind: 'bolt'; key: string; bolt: number; length: number | null }
  /** ナット・平座金: 呼び径 */
  | { kind: 'nut'; key: string; bolt: number }
  | { kind: 'washer'; key: string; bolt: number }
  /** ガスケット: 呼び圧力・呼び径 */
  | { kind: 'gasket'; key: string; pressure: PressureClass; size: string }

export type TakeoffItem = ItemSpec & ItemCount

export interface TakeoffResult {
  lines: TakeoffLine[]
  /** 品目ごとの集計（ボルト → ナット → 平座金 → ガスケットの順） */
  items: TakeoffItem[]
  /** 集計したか所数の合計 */
  joints: number
  /** 品目の種類ごとの合計 */
  totals: Record<TakeoffItemKind, ItemCount>
  /** か所数の入力が正しくなく、集計していない行（0 から） */
  skipped: number[]
  /** 一覧にある呼び圧力（典拠の表番号に使う。PRESSURE_CLASSES の順） */
  pressures: PressureClass[]
  /** 一覧にあるボルトの呼び径（小さい順） */
  boltSizes: number[]
}

/** 1本のボルトに付けるナットの数（六角ボルトは1個、スタッドボルトは両側に2個） */
export function nutsPerBolt(conditions: Pick<TakeoffConditions, 'type'>): number {
  return conditions.type === 'stud' ? 2 : 1
}

/**
 * 予備の数。必要数 × 割合[%] ÷ 100 を切り上げる（例: 32本の5% = 1.6 → 2本）。
 * 浮動小数の誤差が出ないよう、整数だけで計算する
 */
export function spareCount(quantity: number, percent: number): number {
  return Math.floor((quantity * percent + 99) / 100)
}

function compareItems(a: TakeoffItem, b: TakeoffItem): number {
  if (a.kind !== b.kind) return TAKEOFF_ITEM_KINDS.indexOf(a.kind) - TAKEOFF_ITEM_KINDS.indexOf(b.kind)
  if (a.kind === 'gasket' && b.kind === 'gasket') {
    return (
      PRESSURE_CLASSES.indexOf(a.pressure) - PRESSURE_CLASSES.indexOf(b.pressure) ||
      nominalNumber(a.size) - nominalNumber(b.size)
    )
  }
  if (a.kind === 'gasket' || b.kind === 'gasket') return 0
  if (a.bolt !== b.bolt) return a.bolt - b.bolt
  if (a.kind === 'bolt' && b.kind === 'bolt') {
    // 標準長さを超える（null）ものは後ろ
    return (a.length ?? Number.POSITIVE_INFINITY) - (b.length ?? Number.POSITIVE_INFINITY)
  }
  return 0
}

/**
 * 継手の一覧から、ボルト・ナット・平座金・ガスケットの数を拾い出す。
 * - ボルト: 穴数 n × か所数。同じ呼び・長さのものは行をまたいでまとめる
 * - ナット: ボルトの本数 × 1（六角ボルト）または × 2（スタッドボルト）。呼びごと
 * - 平座金: ボルトの本数 × 枚数（片側 1・両側 2）。呼びごと
 * - ガスケット: か所数 × 1。呼び圧力・呼び径ごと（寸法は扱わない）
 * - 予備: 品目ごとに、必要数 × 割合 を切り上げて足す
 * か所数の入力が正しくない行は集計に入れない（skipped）。
 */
export function takeoff(
  rows: readonly TakeoffRow[],
  conditions: TakeoffConditions,
  sparePercent: number,
): TakeoffResult {
  const nuts = nutsPerBolt(conditions)
  const lines: TakeoffLine[] = []
  rows.forEach((row, index) => {
    const flange = findFlange(row.pressure, row.size)
    // 一覧は decodeRows で確かめているので、表に無い呼び径はここには来ない
    if (!flange) return
    const joints = parseJointCount(row.count)
    const perJoint = {
      bolts: flange.n,
      nuts: flange.n * nuts,
      washers: flange.n * conditions.washers,
      gaskets: 1,
    }
    const count = joints ?? 0
    lines.push({
      index,
      pressure: row.pressure,
      size: row.size,
      flange,
      joints,
      bolt: flangeBoltLength(flange, { ...conditions, t2: null }),
      perJoint,
      bolts: perJoint.bolts * count,
      nuts: perJoint.nuts * count,
      washers: perJoint.washers * count,
      gaskets: perJoint.gaskets * count,
    })
  })

  const quantities = new Map<string, { base: ItemSpec; quantity: number }>()
  const add = (base: ItemSpec, quantity: number) => {
    if (quantity <= 0) return
    const entry = quantities.get(base.key)
    if (entry) entry.quantity += quantity
    else quantities.set(base.key, { base, quantity })
  }
  for (const line of lines) {
    if (line.joints === null) continue
    const d = line.flange.bolt
    const length = line.bolt.length
    add({ kind: 'bolt', key: `bolt-M${d}-${length ?? 'over'}`, bolt: d, length }, line.bolts)
    add({ kind: 'nut', key: `nut-M${d}`, bolt: d }, line.nuts)
    add({ kind: 'washer', key: `washer-M${d}`, bolt: d }, line.washers)
    add({ kind: 'gasket', key: `gasket-${line.pressure}-${line.size}`, pressure: line.pressure, size: line.size }, line.gaskets)
  }

  const items = [...quantities.values()]
    .map(({ base, quantity }): TakeoffItem => {
      const spare = spareCount(quantity, sparePercent)
      return { ...base, quantity, spare, total: quantity + spare }
    })
    .sort(compareItems)

  const zero = (): ItemCount => ({ quantity: 0, spare: 0, total: 0 })
  const totals: Record<TakeoffItemKind, ItemCount> = { bolt: zero(), nut: zero(), washer: zero(), gasket: zero() }
  for (const item of items) {
    const total = totals[item.kind]
    total.quantity += item.quantity
    total.spare += item.spare
    total.total += item.total
  }

  return {
    lines,
    items,
    joints: lines.reduce((sum, line) => sum + (line.joints ?? 0), 0),
    totals,
    skipped: lines.filter((line) => line.joints === null).map((line) => line.index),
    pressures: PRESSURE_CLASSES.filter((pressure) => lines.some((line) => line.pressure === pressure)),
    boltSizes: [...new Set(lines.map((line) => line.flange.bolt))].sort((a, b) => a - b),
  }
}
