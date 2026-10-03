import { trim } from '../../lib/format'
import { findPipeSize } from '../steel-pipe/calc'
import type { BoltConditions, BoltType, NutKind, Rounding } from './calc'
import { PRESSURE_CLASSES, UNVERIFIED, type UnverifiedList } from './data'

export const BOLT_TYPE_LABELS: Record<BoltType, string> = { hex: '六角ボルト', stud: 'スタッドボルト' }
export const NUT_LABELS: Record<NutKind, string> = { style1: 'JIS本体', ja1: '旧JIS 1種' }
export const WASHER_LABELS = ['座金なし', '座金 片側', '座金 両側'] as const
export const ROUNDING_LABELS: Record<Rounding, string> = { '5mm': '5mm刻み', jis: 'JIS標準長さ' }

const FRACTIONS: Readonly<Record<string, string>> = { '1/8': '⅛', '1/4': '¼', '3/8': '⅜', '1/2': '½', '3/4': '¾' }

/**
 * 呼び径の表示（「50A（2B）」「40A（1½B）」）。スマホの狭い選択欄に収まるよう分数は1文字にする。
 * B呼称がわからないときは A 呼称だけ
 */
export function sizeLabel(size: string): string {
  const b = findPipeSize(size)?.b
  if (!b) return size
  const compact = b.replace(/(\d+ )?(\d\/\d)/, (_, whole: string | undefined, fraction: string) =>
    FRACTIONS[fraction] ? `${whole?.trim() ?? ''}${FRACTIONS[fraction]}` : `${whole ?? ''}${fraction}`,
  )
  return `${size}（${compact}B）`
}

/** 未確認の値に ※ を付けた文字（コピー・表の書き出し用。例: 「24※」） */
export function markedText(value: string | number, unverified: boolean): string {
  return unverified ? `${value}※` : String(value)
}

/**
 * 「詳細条件」の要約（例: JIS本体ナット・座金なし・突き出し3山・相手側 同じ厚さ・5mm刻み）。
 * t2 は相手側の厚さ（null なら同じ厚さ、'error' は入力エラー）
 */
export function detailSummary(input: {
  nut: NutKind
  washers: 0 | 1 | 2
  threads: number
  t2: number | null | 'error'
  rounding: Rounding
}): string {
  const t2 =
    input.t2 === 'error' ? '相手側 入力エラー' : input.t2 === null ? '相手側 同じ厚さ' : `相手側 ${trim(input.t2)}mm`
  return [
    `${NUT_LABELS[input.nut]}ナット`,
    WASHER_LABELS[input.washers],
    `突き出し${input.threads}山`,
    t2,
    ROUNDING_LABELS[input.rounding],
  ].join('・')
}

/**
 * ※ を付けている値の一覧（UNVERIFIED から作る。例: 「5K 50A の厚さ」「5K の 90A・175A の全寸法」「16K の厚さ（全サイズ）」）。
 * 未確認の値が無ければ空の配列
 */
export function unverifiedSummary(list: UnverifiedList = UNVERIFIED): string[] {
  return PRESSURE_CLASSES.flatMap((pressure) => {
    const spec = list[pressure]
    if (!spec) return []
    const items: string[] = []
    if (spec.t === 'all') items.push(`${pressure} の厚さ（全サイズ）`)
    else if (spec.t?.length) items.push(`${pressure} ${spec.t.join('・')} の厚さ`)
    if (spec.rows?.length) items.push(`${pressure} の ${spec.rows.join('・')} の全寸法`)
    return items
  })
}

/** ボルト長さを計算した条件の文章（表の注記・書き出し用） */
export function conditionsText(conditions: BoltConditions): string {
  return [
    BOLT_TYPE_LABELS[conditions.type],
    `ガスケット ${trim(conditions.gasket)}mm`,
    detailSummary(conditions),
  ].join('・')
}
