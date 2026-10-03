/**
 * ねじの呼び（M3〜M36）ごとのまとめページに載せる値を、各ツールの data.ts・calc.ts から集める。
 */
import { boltsByKey, keyMatchLabel } from '../../features/bolt-size/calc'
import { BOLT_SIZES, type BoltSize } from '../../features/bolt-size/data'
import { isRowUnverified } from '../../features/flange-bolt/calc'
import { FLANGES, PRESSURE_CLASSES, type PressureClass } from '../../features/flange-bolt/data'
import {
  b1004SeriesHole,
  engagementPercent,
  findSize,
  formatHole,
  judgeHole,
  minorDiameterLimits,
  pitchesOf,
  recommendHole,
  type Range,
  type Recommendation,
} from '../../features/tap-drill/calc'
import type { MetricSize } from '../../features/tap-drill/data'
import { fixed, trim } from '../../lib/format'

/** まとめページで下穴径の基準にする公差域クラス（一般的な 6H） */
export const SUMMARY_GRADE = 6 as const

export interface PitchRow {
  p: number
  kind: '並目' | '細目'
  /** 用途が限られるピッチの注記 */
  note?: string
  /** めねじ内径 D1 の許容範囲（6H） */
  limits: Range | null
  /** 推奨下穴径（6H の範囲内） */
  recommended: Recommendation | null
  /** 推奨下穴径でのひっかかり率 [%] */
  engagement: number | null
}

export interface FlangeUse {
  pressure: PressureClass
  /** unverified: その呼び径の行（寸法・ボルトの呼び・本数）が規格原文で未確認（フランジのツールで ※ を付ける行） */
  sizes: readonly { size: string; n: number; unverified: boolean }[]
}

export interface ScrewSummary {
  d: number
  metric: MetricSize
  bolt: BoltSize
  /** 並目（まとめページのサイズはすべて並目がある） */
  coarse: PitchRow
  /** 並目 → 細目の順 */
  pitches: readonly PitchRow[]
  /** 並目ねじの有効断面積 As [mm²]（丸める前の値。表示は formatSignificant で有効数字3桁） */
  stressArea: number
  /** このボルトを使う JIS フランジ（呼び圧力ごとの呼び径とボルト本数） */
  flanges: readonly FlangeUse[]
  prev: number | null
  next: number | null
}

/** 基準山形の高さ H = (√3 / 2) × P */
const H_PER_PITCH = Math.sqrt(3) / 2

/**
 * ねじの有効断面積 As = π/4 × ((d2 + d3) / 2)² [mm²]（JIS B 1082）。
 * d2 = d − 0.75H（有効径）、d3 = d − (17/12)H（おねじの谷の径）なので (d2 + d3) / 2 = d − (13/12)H。
 */
export function stressArea(d: number, p: number): number {
  const h = H_PER_PITCH * p
  const d2 = d - 0.75 * h
  const d3 = d - (17 / 12) * h
  return (Math.PI / 4) * ((d2 + d3) / 2) ** 2
}

function pitchRow(metric: MetricSize, p: number): PitchRow {
  const limits = minorDiameterLimits(metric.d, p, SUMMARY_GRADE)
  const recommended = recommendHole(metric.d, p, SUMMARY_GRADE)
  return {
    p,
    kind: p === metric.coarse ? '並目' : '細目',
    note: metric.pitchNotes?.[String(p)],
    limits,
    recommended,
    engagement: recommended ? engagementPercent(metric.d, p, recommended.hole) : null,
  }
}

/** このボルトの呼びを使う JIS フランジ */
export function flangesUsingBolt(d: number): FlangeUse[] {
  return PRESSURE_CLASSES.map((pressure) => ({
    pressure,
    sizes: FLANGES[pressure]
      .filter((row) => row.bolt === d)
      .map((row) => ({ size: row.size, n: row.n, unverified: isRowUnverified(pressure, row.size) })),
  })).filter((use) => use.sizes.length > 0)
}

/** まとめページを作るねじの呼び（二面幅・座ぐりのデータがあるサイズ） */
export const SUMMARY_SIZES: readonly number[] = BOLT_SIZES.map((size) => size.d)

export function screwSummary(d: number): ScrewSummary | null {
  const metric = findSize(d)
  const bolt = BOLT_SIZES.find((size) => size.d === d)
  if (!metric || !bolt || metric.coarse === null) return null
  const pitches = pitchesOf(metric).map((p) => pitchRow(metric, p))
  const index = SUMMARY_SIZES.indexOf(d)
  return {
    d,
    metric,
    bolt,
    coarse: pitches[0],
    pitches,
    stressArea: stressArea(d, metric.coarse),
    flanges: flangesUsingBolt(d),
    prev: index > 0 ? SUMMARY_SIZES[index - 1] : null,
    next: index < SUMMARY_SIZES.length - 1 ? SUMMARY_SIZES[index + 1] : null,
  }
}


// ---------------------------------------------------------------------------
// サイズごとのポイント（まとめページの上に出す。そのサイズのデータから作る）

/** b1004: JIS B 1004 の下穴径の系列 / flats: 二面幅の本体と旧JIS / nut: フランジに使うときのナットの高さ / counterbore: 座ぐりの穴径 / key: 六角レンチの共用 */
export type ScrewPointKind = 'b1004' | 'flats' | 'nut' | 'counterbore' | 'key'

export interface ScrewPoint {
  kind: ScrewPointKind
  text: string
}

/** JIS B 1004 の系列（ひっかかり率 95 %・90 %）の下穴径と、まとめページの等級（6H）の範囲に入るか */
export interface B1004Pair {
  s95: number
  s90: number
  in95: boolean
  in90: boolean
}

export function b1004Pair(row: PitchRow, d: number): B1004Pair | null {
  if (!row.limits) return null
  const s95 = b1004SeriesHole(d, row.p, 95)
  const s90 = b1004SeriesHole(d, row.p, 90)
  return { s95, s90, in95: judgeHole(s95, row.limits) === 'ok', in90: judgeHole(s90, row.limits) === 'ok' }
}

/** 二面幅が JIS本体と旧JIS で違うサイズ（M10・M12・M14・M22） */
const FLATS_DIFFER = BOLT_SIZES.filter((size) => size.sIso !== size.sJa).map((size) => `M${size.d}`)

const same = (a: number, b: number) => Math.abs(a - b) < 1e-9

export function screwPoints(summary: ScrewSummary): ScrewPoint[] {
  const { d, bolt, coarse } = summary
  const points: ScrewPoint[] = []

  const pair = b1004Pair(coarse, d)
  if (pair && coarse.limits) {
    const range = `${SUMMARY_GRADE}H の範囲（${fixed(coarse.limits.min, 3)}〜${fixed(coarse.limits.max, 3)} mm）`
    const fit = pair.in95 && pair.in90 ? `どちらも ${range}に入ります。` : `${range}と比べて選んでください。`
    const hole = coarse.recommended?.hole
    const recommended =
      hole === undefined
        ? ''
        : same(hole, pair.s95)
          ? `推奨 ${formatHole(hole)} mm は 95 % の系列と同じ値です。`
          : same(hole, pair.s90)
            ? `推奨 ${formatHole(hole)} mm は 90 % の系列と同じ値です。`
            : `推奨 ${formatHole(hole)} mm のひっかかり率は ${fixed(coarse.engagement ?? 0, 1)} % です。`
    points.push({
      kind: 'b1004',
      text: `JIS B 1004 の下穴径の系列（並目 ${trim(coarse.p)}）は、ひっかかり率 95 % が ${formatHole(pair.s95)} mm、90 % が ${formatHole(pair.s90)} mm です。${fit}${recommended}`,
    })
  }

  points.push({
    kind: 'flats',
    text: same(bolt.sIso, bolt.sJa)
      ? `六角ボルト・ナットの二面幅は、JIS本体・旧JIS（附属書JA）とも ${trim(bolt.sIso)} mm です（違うのは ${FLATS_DIFFER.join('・')}）。`
      : `六角ボルト・ナットの二面幅は JIS本体 ${trim(bolt.sIso)} mm、旧JIS（附属書JA）${trim(bolt.sJa)} mm で違います。頭が旧JIS、ナットが JIS本体という組み合わせもあり得るので、スパナは両方あると確実です。`,
  })

  if (summary.flanges.length > 0 && !same(bolt.nutStyle1, bolt.nutJa1)) {
    points.push({
      kind: 'nut',
      text: `JIS フランジにも使うサイズです。ナットの高さは JIS本体（スタイル1 の最大）${trim(bolt.nutStyle1)} mm、旧JIS 1種 ${trim(
        bolt.nutJa1,
      )} mm で ${trim(Math.round((bolt.nutStyle1 - bolt.nutJa1) * 100) / 100)} mm 違うので、ボルトの長さは使うナットに合わせて計算します。`,
    })
  }

  const cb = bolt.counterbore
  if (cb && !bolt.holes.some((hole) => hole !== null && same(hole, cb.d1))) {
    const [h1, h2, h3] = bolt.holes
    points.push({
      kind: 'counterbore',
      text: `六角穴付きボルト用の座ぐりの穴径 φ${trim(cb.d1)}（設計でよく使われる参考値）は、JIS B 1001 のボルト穴径（1級 ${trim(h1)}・2級 ${trim(
        h2,
      )}・3級 ${trim(h3!)} mm）のどれとも違います。`,
    })
  }

  const sharedKey = boltsByKey(bolt.capKey).filter((match) => match.size.d !== d)
  if (sharedKey.length > 0) {
    const sharedLabel = sharedKey.map(keyMatchLabel).join('・')
    points.push({
      kind: 'key',
      text: `六角レンチ ${trim(bolt.capKey)} mm は ${sharedLabel}${sharedLabel.endsWith('）') ? '' : ' '}の六角穴付きボルトと同じサイズです。レンチのサイズだけではボルトの太さを決められません。`,
    })
  }

  return points
}
