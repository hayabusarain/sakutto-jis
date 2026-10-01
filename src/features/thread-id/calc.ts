import { toolHref } from '../../lib/query'
import { BOLT_SIZES } from '../bolt-size/data'
import {
  gMinorLimits,
  pitch as pipePitch,
  rcInnerMinorDiameter,
  rPipeEndDiameter,
  rUsefulEndDiameter,
} from '../pipe-thread/calc'
import { PIPE_THREAD_SIZES, type PipeThreadSize } from '../pipe-thread/data'
import { availableGrade, basicMinorDiameter, minorDiameterLimits, pitchesOf } from '../tap-drill/calc'
import { METRIC_SIZES, type MetricSize, type ToleranceGrade } from '../tap-drill/data'

/**
 * 実測した径とピッチから、メートルねじ（M）・管用ねじ（R・Rc・Rp・G）の候補を探す。
 * 候補の寸法は、既存のデータ（JIS B 0205-2 の呼び径とピッチ、JIS B 0209-1 のめねじ内径の公差、
 * JIS B 0203・JIS B 0202 の管用ねじの基準寸法）とテーパ 1/16 の幾何だけから作る。
 * インチねじ（ユニファイ UNC・UNF、ウイット）は対象外。
 */

export type ThreadSide = 'external' | 'internal'
export type ThreadForm = 'parallel' | 'taper'
/** 候補の種類。めねじの G と Rp は基準寸法が同じで区別できないので 'G/Rp' にまとめる */
export type CandidateKind = 'M' | 'R' | 'Rc' | 'G' | 'G/Rp'

export interface Range {
  min: number
  max: number
}

export interface ThreadCandidate {
  /** 一意なキー（例: M12x1.75・R1/2） */
  key: string
  /** 表示名（例: M12・M12×1.25・R1/2・G1/2・Rc1/2・G1/2・Rp1/2） */
  label: string
  kind: CandidateKind
  form: ThreadForm
  /** ピッチ [mm] */
  pitch: number
  /** 25.4mm あたりの山数（管用ねじだけ） */
  tpi: number | null
  /** 比べる径の基準寸法 [mm]（おねじは外径、めねじは内径） */
  basic: number
  /** 実測値がこの範囲に入れば径は「範囲内」（測る位置・公差による幅） */
  range: Range
  /** 範囲の説明（例: 管端〜有効ねじ部の端） */
  rangeNote: string
  metric?: { size: MetricSize; coarse: boolean }
  pipe?: PipeThreadSize
}

// ---------------------------------------------------------------- ピッチ

/** 山数（25.4mm あたり）→ ピッチ [mm] */
export function pitchFromTpi(tpi: number): number {
  return 25.4 / tpi
}

/** ピッチ [mm] → 25.4mm あたりの山数 */
export function tpiFromPitch(pitch: number): number {
  return 25.4 / pitch
}

/**
 * 山頂を n 個数え、最初と最後の山頂の距離 L を測ったときのピッチ P = L ÷ (n − 1)。
 * n は2以上の整数、L は正の数。そうでなければ null。
 */
export function pitchFromCount(crests: number, span: number): number | null {
  if (!Number.isInteger(crests) || crests < 2 || !(span > 0)) return null
  return span / (crests - 1)
}

// ---------------------------------------------------------------- テーパの判定

export type TaperVerdict = 'taper' | 'parallel' | 'unclear'

export interface TaperJudgement {
  /** 2か所の径の差 [mm]（絶対値） */
  difference: number
  /** テーパ 1/16 なら出るはずの差 = 間隔 ÷ 16 [mm] */
  expected: number
  verdict: TaperVerdict
  /** unclear の理由 */
  reason?: 'short' | 'too-large'
}

/** 2か所を測る間隔の最小値 [mm]。これより短いと、テーパの差（x/16）がノギスの読み取りの誤差に埋もれやすい */
export const MIN_TAPER_SPACING = 5

/**
 * 2か所（間隔 x）で測った外径から、テーパねじ（1/16）か平行ねじかを判定する。
 * 差が x/32（テーパの差の半分）以上ならテーパ、未満なら平行。差が x/8（テーパの2倍）を超えるときは測り直し。
 */
export function judgeTaper(diameterA: number, diameterB: number, spacing: number): TaperJudgement {
  const difference = Math.abs(diameterA - diameterB)
  const expected = spacing / 16
  if (!(spacing >= MIN_TAPER_SPACING)) return { difference, expected, verdict: 'unclear', reason: 'short' }
  if (difference > spacing / 8 + 1e-9) return { difference, expected, verdict: 'unclear', reason: 'too-large' }
  return { difference, expected, verdict: difference >= spacing / 32 - 1e-9 ? 'taper' : 'parallel' }
}

// ---------------------------------------------------------------- 候補

const round3 = (value: number) => Math.round(value * 1000) / 1000
const trimNumber = (value: number) => String(Number(value.toFixed(3)))

/** めねじ内径の範囲に使う公差域クラス（一般用の 6H。規定の無いピッチは規定のある等級） */
export const INTERNAL_GRADE: ToleranceGrade = 6

function metricLabel(size: MetricSize, p: number): string {
  return p === size.coarse ? `M${size.d}` : `M${size.d}×${trimNumber(p)}`
}

function metricCandidates(side: ThreadSide): ThreadCandidate[] {
  return METRIC_SIZES.flatMap((size) =>
    pitchesOf(size).map((p): ThreadCandidate => {
      const coarse = p === size.coarse
      const base = {
        key: `M${size.d}x${p}`,
        label: metricLabel(size, p),
        kind: 'M' as const,
        form: 'parallel' as const,
        pitch: p,
        tpi: null,
        metric: { size, coarse },
      }
      if (side === 'external') {
        return { ...base, basic: size.d, range: { min: size.d, max: size.d }, rangeNote: '呼び径' }
      }
      const grade = availableGrade(size.d, p, INTERNAL_GRADE)
      const basic = basicMinorDiameter(size.d, p)
      const limits = minorDiameterLimits(size.d, p, grade) ?? { min: basic, max: basic }
      return { ...base, basic, range: limits, rangeNote: `めねじ内径 D1（${grade}H の範囲）` }
    }),
  )
}

function pipeCandidates(side: ThreadSide): ThreadCandidate[] {
  return PIPE_THREAD_SIZES.flatMap((thread): ThreadCandidate[] => {
    const common = { pitch: pipePitch(thread.tpi), tpi: thread.tpi, pipe: thread }
    if (side === 'external') {
      return [
        {
          ...common,
          key: `R${thread.size}`,
          label: `R${thread.size}`,
          kind: 'R',
          form: 'taper',
          basic: thread.d,
          range: { min: rPipeEndDiameter(thread), max: rUsefulEndDiameter(thread) },
          rangeNote: '管端〜有効ねじ部の端の外径',
        },
        {
          ...common,
          key: `G${thread.size}`,
          label: `G${thread.size}`,
          kind: 'G',
          form: 'parallel',
          basic: thread.d,
          range: { min: thread.d, max: thread.d },
          rangeNote: '外径 d',
        },
      ]
    }
    const rcInner = rcInnerMinorDiameter(thread)
    return [
      {
        ...common,
        key: `Rc${thread.size}`,
        label: `Rc${thread.size}`,
        kind: 'Rc',
        form: 'taper',
        basic: thread.d1,
        range: { min: rcInner ?? thread.d1, max: thread.d1 },
        rangeNote: rcInner === null ? '入口の内径 D1' : '奥端〜入口の内径',
      },
      {
        ...common,
        key: `G${thread.size}`,
        label: `G${thread.size}・Rp${thread.size}`,
        kind: 'G/Rp',
        form: 'parallel',
        basic: thread.d1,
        range: gMinorLimits(thread),
        rangeNote: 'G めねじ内径の範囲',
      },
    ]
  })
}

const CANDIDATES: Record<ThreadSide, readonly ThreadCandidate[]> = {
  external: [...metricCandidates('external'), ...pipeCandidates('external')],
  internal: [...metricCandidates('internal'), ...pipeCandidates('internal')],
}

export function candidatesFor(side: ThreadSide): readonly ThreadCandidate[] {
  return CANDIDATES[side]
}

// ---------------------------------------------------------------- 順位付け

/** 径の差の目安（読み取り誤差・公差・摩耗）: 0.1mm + 基準寸法の 1% */
export function diameterSigma(basic: number): number {
  return 0.1 + 0.01 * basic
}

/** ピッチの差の目安: 候補のピッチの 2% */
export const PITCH_SIGMA_RATIO = 0.02

/** テーパの判定と候補の形（テーパ・平行）が合わないときに足す点 */
export const FORM_PENALTY = 25

export interface Measurement {
  side: ThreadSide
  /** 実測の径 [mm]（おねじは外径、めねじは内径） */
  diameter: number
  /** 実測のピッチ [mm]。分からなければ null（径だけで探す） */
  pitch: number | null
  /** 2か所の外径で判定したテーパ（任意） */
  form?: ThreadForm | null
}

export interface RankedCandidate extends ThreadCandidate {
  /** 径の差 [mm]：範囲に入れば 0、外れれば近い方の端との差（実測 − 端） */
  deltaDiameter: number
  /** ピッチの差 [mm]（実測 − 候補）。ピッチ未入力なら null */
  deltaPitch: number | null
  /** 小さいほど近い。(径の差 ÷ 目安)² + (ピッチの差 ÷ 目安)² (+ 形の不一致) */
  score: number
}

/** 実測値が範囲から外れている量（範囲内なら 0） */
export function distanceToRange(value: number, range: Range): number {
  if (value < range.min) return round3(value - range.min)
  if (value > range.max) return round3(value - range.max)
  return 0
}

export function scoreCandidate(candidate: ThreadCandidate, measurement: Measurement): RankedCandidate {
  const deltaDiameter = distanceToRange(measurement.diameter, candidate.range)
  const deltaPitch = measurement.pitch === null ? null : measurement.pitch - candidate.pitch
  const d = deltaDiameter / diameterSigma(candidate.basic)
  const p = deltaPitch === null ? 0 : deltaPitch / (PITCH_SIGMA_RATIO * candidate.pitch)
  const formPenalty = measurement.form && measurement.form !== candidate.form ? FORM_PENALTY : 0
  return { ...candidate, deltaDiameter, deltaPitch, score: d * d + p * p + formPenalty }
}

/** 同じ点数なら、並目 → 第1選択 → 管用ねじの順（よく使われる方）を先にする */
function preference(candidate: ThreadCandidate): number {
  if (!candidate.metric) return 0
  return (candidate.metric.coarse ? 0 : 3) + candidate.metric.size.choice
}

/**
 * 近い順に並べた候補（全部）。上位を使うときは slice する。
 * ピッチが分からないときは、同じ呼び径のメートルねじ（M20・M20×2・M20×1.5…）が同じ点数で並んでしまうので、
 * 呼び径ごとに1つ（並目、並目の無いサイズは最初の細目）だけ残す。
 */
export function rankCandidates(measurement: Measurement): RankedCandidate[] {
  if (!(measurement.diameter > 0)) return []
  const pitchKnown = measurement.pitch !== null
  return candidatesFor(measurement.side)
    .filter((candidate) => pitchKnown || !candidate.metric || candidate.pitch === pitchesOf(candidate.metric.size)[0])
    .map((candidate) => scoreCandidate(candidate, measurement))
    .sort((a, b) => a.score - b.score || preference(a) - preference(b))
}

export type MatchLevel = 'good' | 'fair' | 'poor'

/** 点数の目安: 4以下（目安の2倍以内）→よく合う、16以下→近い、それより大きい→離れている */
export function matchLevel(score: number): MatchLevel {
  if (score <= 4) return 'good'
  if (score <= 16) return 'fair'
  return 'poor'
}

/**
 * 上位2つが同じ呼び・同じピッチでテーパと平行の違いだけ（R1/2 と G1/2 など）で、どちらもよく合うとき true。
 * 径とピッチだけでは決められないので、2か所の外径でテーパを確かめてもらう。
 */
export function hasFormAmbiguity(ranked: readonly RankedCandidate[]): boolean {
  const [first, second] = ranked
  if (!first?.pipe || !second?.pipe) return false
  return (
    first.pipe.size === second.pipe.size &&
    first.form !== second.form &&
    matchLevel(first.score) === 'good' &&
    matchLevel(second.score) === 'good'
  )
}

/** ピッチの差が候補のピッチの何%か（絶対値） */
export function pitchErrorPercent(candidate: RankedCandidate): number | null {
  return candidate.deltaPitch === null ? null : (Math.abs(candidate.deltaPitch) / candidate.pitch) * 100
}

// ---------------------------------------------------------------- リンク

/** 候補の寸法を詳しく見るページ（下穴径ツール・管用ねじツール） */
export function candidateHref(candidate: ThreadCandidate): string {
  if (candidate.metric) return toolHref('/tap-drill', { d: candidate.metric.size.d, p: candidate.pitch })
  const kind = candidate.kind === 'G/Rp' ? 'G' : candidate.kind
  return toolHref('/pipe-thread', { size: candidate.pipe!.size, kind })
}

export interface CandidateLink {
  to: string
  label: string
}

/** いちばん近い候補の関連ページ（今の候補のサイズを引き継ぐ） */
export function relatedLinksFor(candidate: ThreadCandidate): CandidateLink[] {
  if (candidate.metric) {
    const { size, coarse } = candidate.metric
    const links: CandidateLink[] = [{ to: candidateHref(candidate), label: `${candidate.label} の下穴径` }]
    if (coarse && BOLT_SIZES.some((bolt) => bolt.d === size.d)) {
      links.push({ to: toolHref('/bolt-size', { d: size.d }), label: `M${size.d} の二面幅・ボルト穴` })
    }
    return links
  }
  const pipe = candidate.pipe!
  const kindLabel = candidate.kind === 'G/Rp' ? `G${pipe.size}` : candidate.label
  const links: CandidateLink[] = [
    {
      to: candidateHref(candidate),
      label: `${kindLabel} の寸法${candidate.kind === 'Rc' || candidate.kind === 'G/Rp' ? '・下穴' : ''}`,
    },
  ]
  if (pipe.pipeA) links.push({ to: toolHref('/steel-pipe', { a: pipe.pipeA }), label: `${pipe.pipeA} 鋼管の外径` })
  return links
}
