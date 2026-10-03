import { trim } from '../../lib/format'
import { standardLabel, type StandardCode } from '../../standards'
import { BOLT_SIZES } from '../bolt-size/data'
import type { NutKind } from '../flange-bolt/calc'
import { FLANGE_TABLE_NO, flangeTableLabel, type PressureClass } from '../flange-bolt/data'
import { BOLT_TYPE_LABELS, conditionsText, NUT_LABELS } from '../flange-bolt/labels'
import { TAKEOFF_ITEM_KINDS, type TakeoffConditions, type TakeoffItem, type TakeoffItemKind, type TakeoffResult } from './calc'

export const ITEM_UNITS: Readonly<Record<TakeoffItemKind, string>> = { bolt: '本', nut: '個', washer: '枚', gasket: '枚' }

/** 品目の見出し（例: 六角ボルト・六角ナット（JIS本体）・平座金（並形）・ガスケット（厚さ 3 mm）） */
export function itemGroupTitle(kind: TakeoffItemKind, conditions: TakeoffConditions): string {
  switch (kind) {
    case 'bolt':
      return BOLT_TYPE_LABELS[conditions.type]
    case 'nut':
      return `六角ナット（${NUT_LABELS[conditions.nut]}）`
    case 'washer':
      return '平座金（並形）'
    case 'gasket':
      return `ガスケット（厚さ ${trim(conditions.gasket)} mm）`
  }
}

/** ボルトの呼び × 長さ（例: M16×60。標準長さを超えて長さが決まらないときは M16×—） */
export function boltSpec(bolt: number, length: number | null): string {
  return `M${bolt}×${length ?? '—'}`
}

/** 品目の呼び（例: M16×60・M16・M16用・10K 50A） */
export function itemSpec(item: TakeoffItem): string {
  switch (item.kind) {
    case 'bolt':
      return boltSpec(item.bolt, item.length)
    case 'nut':
      return `M${item.bolt}`
    case 'washer':
      return `M${item.bolt}用`
    case 'gasket':
      return `${item.pressure} ${item.size}`
  }
}

/** 数量の表示（例: 「34本（うち予備 2）」）。予備が無ければ「32本」 */
export function itemQuantityText(item: TakeoffItem): string {
  const unit = ITEM_UNITS[item.kind]
  return item.spare > 0 ? `${item.total}${unit}（うち予備 ${item.spare}）` : `${item.total}${unit}`
}

/**
 * 典拠に添えるフランジの表（一覧にある呼び圧力の表だけ）。
 * 1クラスなら「表15 呼び圧力10Kフランジの寸法」、複数なら「表15・表18（呼び圧力10K・20Kフランジの寸法）」。空なら undefined
 */
export function flangeTablesLabel(pressures: readonly PressureClass[]): string | undefined {
  if (pressures.length === 0) return undefined
  if (pressures.length === 1) return flangeTableLabel(pressures[0])
  return `${pressures.map((p) => FLANGE_TABLE_NO[p]).join('・')}（呼び圧力${pressures.join('・')}フランジの寸法）`
}

/** ボルトの呼びが JIS B 1181・B 1256 の第2選択（M22 など）か */
const isSecondChoice = (bolt: number) => BOLT_SIZES.find((size) => size.d === bolt)?.secondChoice === true

/**
 * ナットの高さの典拠の表（JIS B 1181）。JIS本体はスタイル1 の表3（第1選択）・表4（第2選択の M22）、
 * 旧JIS は附属書JA の表JA.9。ボルトが無ければ undefined
 */
export function nutTableLabel(bolts: readonly number[], nut: NutKind): string | undefined {
  if (bolts.length === 0) return undefined
  if (nut === 'ja1') return '附属書JA 表JA.9 六角ナット・上'
  const tables = [...new Set(bolts.map((bolt) => (isSecondChoice(bolt) ? '表4' : '表3')))].sort().join('・')
  return `${tables} 六角ナット・スタイル1`
}

/** 平座金の厚さの典拠の表（JIS B 1256 並形・部品等級A。表7 第1選択・表8 第2選択）。ボルトが無ければ undefined */
export function washerTableLabel(bolts: readonly number[]): string | undefined {
  if (bolts.length === 0) return undefined
  const first = bolts.some((bolt) => !isSecondChoice(bolt))
  const second = bolts.some(isSecondChoice)
  if (first && second) return '表7・表8 並形・部品等級A'
  return second ? '表8 並形・部品等級A（第2選択）' : '表7 並形・部品等級A（第1選択）'
}

/** 計算に使った規格（JIS B 1180 は呼び長さの系列に丸めるときだけ、JIS B 1256 は座金を使うときだけ） */
export function citedStandards(conditions: TakeoffConditions): StandardCode[] {
  return [
    'JIS B 2220',
    'JIS B 1181',
    ...(conditions.rounding === 'jis' ? (['JIS B 1180'] as const) : []),
    'JIS B 0205-2',
    ...(conditions.washers > 0 ? (['JIS B 1256'] as const) : []),
  ]
}

/** ガスケットについての注記（画面・コピー・書き出しで同じ文言にする） */
export const GASKET_NOTE = 'ガスケットは呼び圧力・呼び径ごとの枚数だけです（寸法は載せていません）。'

/** 計算の条件の文章（例: 六角ボルト・ガスケット 3mm・JIS本体ナット・座金なし・突き出し3山・相手側 同じ厚さ・5mm刻み） */
export function takeoffConditionsText(conditions: TakeoffConditions): string {
  return conditionsText({ ...conditions, t2: null })
}

/** 典拠の1行（例: JIS B 2220:2012 表15・表18 / JIS B 1181:2014 / JIS B 0205-2:2001） */
export function sourceText(result: TakeoffResult, conditions: TakeoffConditions): string {
  const tables = result.pressures.map((p) => FLANGE_TABLE_NO[p]).join('・')
  return citedStandards(conditions)
    .map((code) => (code === 'JIS B 2220' && tables ? `${standardLabel(code)} ${tables}` : standardLabel(code)))
    .join(' / ')
}

/** 「結果をコピー」の文章（LINE やメモに貼る発注メモの形） */
export function takeoffText(result: TakeoffResult, conditions: TakeoffConditions, sparePercent: number): string {
  const counted = result.lines.filter((line) => line.joints !== null)
  const groups = TAKEOFF_ITEM_KINDS.flatMap((kind) => {
    const items = result.items.filter((item) => item.kind === kind)
    if (items.length === 0) return []
    return [`■${itemGroupTitle(kind, conditions)}`, ...items.map((item) => `${itemSpec(item)}　${itemQuantityText(item)}`)]
  })
  return [
    `【フランジ部品の拾い出し】${result.joints}か所`,
    ...groups,
    sparePercent > 0 ? `※ 予備 ${sparePercent}% を品目ごとに切り上げて含む` : '',
    counted.length > 0
      ? `内訳: ${counted
          .map(
            (line) =>
              `${line.pressure} ${line.size}×${line.joints}か所（${boltSpec(line.flange.bolt, line.bolt.length)}・${line.flange.n}本/か所）`,
          )
          .join('、')}`
      : '',
    result.skipped.length > 0 ? `（か所数が入っていない ${result.skipped.map((i) => `${i + 1}行目`).join('・')} は含めていません）` : '',
    `条件: ${takeoffConditionsText(conditions)}`,
    GASKET_NOTE,
    `典拠: ${sourceText(result, conditions)}`,
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')
}
