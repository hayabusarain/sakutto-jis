import { trim } from '../../lib/format'
import {
  ISO2306_COARSE_DRILL,
  METRIC_SIZES,
  TD1_UM,
  TOLERANCE_GRADES,
  type MetricSize,
  type ToleranceGrade,
} from './data'

/**
 * 基準山形の「ひっかかりの高さ」H1 の2倍を、ピッチ P に対する係数で表したもの。
 * H = (√3 / 2)P = 0.866025P、H1 = (5/8)H、2 × H1 = 1.082532P（JIS B 0205-1 の 4.）。
 * D1 = D − 1.082532P は JIS B 0205-4 の 5. の式（表1 の基準寸法と一致）
 */
export const TWO_H1_PER_PITCH = 1.082532

// 丸め誤差を避けるため、内部では μm の整数で計算する
const toUm = (mm: number) => Math.round(mm * 1000)
const toMm = (um: number) => um / 1000

export function findSize(d: number): MetricSize | undefined {
  return METRIC_SIZES.find((size) => size.d === d)
}

/** そのサイズで選べるピッチ（並目 → 細目の順） */
export function pitchesOf(size: MetricSize): number[] {
  return size.coarse === null ? [...size.fine] : [size.coarse, ...size.fine]
}

/** めねじ内径の基準寸法 D1 = D − 1.082532P [mm]（小数3桁） */
export function basicMinorDiameter(d: number, p: number): number {
  return toMm(Math.round(d * 1000 - TWO_H1_PER_PITCH * 1000 * p))
}

export interface Range {
  min: number
  max: number
}

/** めねじ内径 D1 の許容範囲（公差位置H）。その等級が規定されていないときは null */
export function minorDiameterLimits(d: number, p: number, grade: ToleranceGrade): Range | null {
  const tolerance = TD1_UM[String(p)]?.[grade]
  if (tolerance == null) return null
  const min = toUm(basicMinorDiameter(d, p))
  return { min: toMm(min), max: toMm(min + tolerance) }
}

/** ひっかかり率 [%] = (D − 下穴径) ÷ (2 × H1) × 100（JIS B 1004:2009 表1 の式 Pte = (d − Dhs) ÷ (2 × H1) × 100） */
export function engagementPercent(d: number, p: number, hole: number): number {
  return ((d - hole) / (TWO_H1_PER_PITCH * p)) * 100
}

/** JIS B 1004:2009 表1 の下穴径の系列（ひっかかり率 [%]） */
export const B1004_SERIES = [100, 95, 90, 85, 80, 75, 70, 65] as const
export type B1004Series = (typeof B1004_SERIES)[number]

/**
 * JIS B 1004 の系列の下穴径 Dhs = d − 2 × H1 × Pte ÷ 100 [mm]。
 * 規格の表と同じく、ピッチ 1.5mm 以下は 0.01mm、1.75mm 以上は 0.1mm に丸める
 * （例: M12 は 95 % で 10.2、90 % で 10.3。M10×1.25 は 95 % で 8.71）。
 */
export function b1004SeriesHole(d: number, p: number, percent: B1004Series): number {
  const stepUm = p >= 1.75 ? 100 : 10
  const holeUm = d * 1000 - (TWO_H1_PER_PITCH * 1000 * p * percent) / 100
  return toMm(Math.round(holeUm / stepUm) * stepUm)
}

/** 下穴径の刻み [mm]。細いピッチは 0.05mm、ピッチ1mm以上は市販ドリルの主流に合わせ 0.1mm */
export function holeStep(p: number): number {
  return p < 1 ? 0.05 : 0.1
}

/**
 * 下穴径の表示。小数1桁以上で、0.05mm 刻みの径だけ2桁にする（5 → "5.0"、2.5 → "2.5"、2.05 → "2.05"）。
 * 下穴径は 0.05mm の倍数なので、小数3桁目以降は出ない。
 */
export function formatHole(hole: number): string {
  const text = hole.toFixed(2)
  return text.endsWith('0') ? text.slice(0, -1) : text
}

export type HoleFit = 'small' | 'ok' | 'large'

/** 下穴径が D1 の許容範囲に入るか。小さすぎるとタップ折損、大きすぎるとねじ山不足 */
export function judgeHole(hole: number, limits: Range): HoleFit {
  const holeUm = toUm(hole)
  if (holeUm < toUm(limits.min)) return 'small'
  if (holeUm > toUm(limits.max)) return 'large'
  return 'ok'
}

export interface Recommendation {
  hole: number
  /** iso2306: 並目ねじの ISO 2306 推奨ドリル径 / rule: 呼び径 − ピッチ に最も近い刻みの径 */
  basis: 'iso2306' | 'rule'
}

/**
 * 推奨下穴径。
 * 並目ねじで ISO 2306 の推奨ドリル径がその等級の範囲に入るなら、それを使う。
 * それ以外は、範囲に入る刻み（holeStep）の径のうち「呼び径 − ピッチ」に最も近いもの（同じ近さなら大きい方）。
 * 範囲に入る径が無い・等級の規定が無いときは null。
 */
export function recommendHole(d: number, p: number, grade: ToleranceGrade): Recommendation | null {
  const limits = minorDiameterLimits(d, p, grade)
  if (!limits) return null

  const iso = findSize(d)?.coarse === p ? ISO2306_COARSE_DRILL[String(d)] : undefined
  if (iso !== undefined && judgeHole(iso, limits) === 'ok') return { hole: iso, basis: 'iso2306' }

  const step = toUm(holeStep(p))
  const min = Math.ceil(toUm(limits.min) / step) * step
  const max = Math.floor(toUm(limits.max) / step) * step
  if (min > max) return null

  const target = toUm(d - p)
  let best = min
  for (let hole = min; hole <= max; hole += step) {
    const diff = Math.abs(hole - target)
    const bestDiff = Math.abs(best - target)
    if (diff < bestDiff || (diff === bestDiff && hole > best)) best = hole
  }
  return { hole: toMm(best), basis: 'rule' }
}

/**
 * M1.4 以下のめねじについての注意（6H・7H を選んでいるときだけ。ほかは null）。
 * JIS B 0209-1 の 12. は M1.4 以下に 5H/6h・4H/6h 又はより精密な組合せを選ぶとしている（5.2 でも、指示が無いときは 5H）。
 * M1.4×0.3 は 6H の公差も表3 にあるので、ツールでは 6H のまま計算できる
 */
export function smallSizeGradeNote(d: number, grade: ToleranceGrade): string | null {
  if (d > 1.4 || grade < 6) return null
  return 'M1.4 以下は 5H か 4H を選ぶとされています（JIS B 0209-1 の 12.）'
}

/** 指定の等級が規定されていないピッチ（M1〜M1.2 の並目、ピッチ 0.2・0.25 など）では、規定のある等級に切り替える */
export function availableGrade(d: number, p: number, preferred: ToleranceGrade): ToleranceGrade {
  if (minorDiameterLimits(d, p, preferred)) return preferred
  const fallback = ([6, 5, 4, 7] as const).find((grade) => minorDiameterLimits(d, p, grade))
  return fallback ?? preferred
}

export interface HoleCandidate {
  hole: number
  engagement: number
  /** 等級ごとの判定。規定のない等級は null */
  fits: Record<ToleranceGrade, HoleFit | null>
}

/** 早見表：D1 の最小〜（規定のある最も緩い等級の）最大を少しはみ出す範囲で、刻みごとの判定 */
export function holeCandidates(d: number, p: number): HoleCandidate[] {
  const limitsByGrade = TOLERANCE_GRADES.map((grade) => minorDiameterLimits(d, p, grade))
  const defined = limitsByGrade.filter((limits): limits is Range => limits !== null)
  if (defined.length === 0) return []

  const step = toUm(holeStep(p))
  const low = Math.floor(toUm(defined[0].min) / step) * step
  const high = Math.ceil(Math.max(...defined.map((limits) => toUm(limits.max))) / step) * step

  const candidates: HoleCandidate[] = []
  for (let holeUm = low; holeUm <= high; holeUm += step) {
    const hole = toMm(holeUm)
    const fits = {} as Record<ToleranceGrade, HoleFit | null>
    TOLERANCE_GRADES.forEach((grade, index) => {
      const limits = limitsByGrade[index]
      fits[grade] = limits ? judgeHole(hole, limits) : null
    })
    candidates.push({ hole, engagement: engagementPercent(d, p, hole), fits })
  }
  return candidates
}

// ---------------------------------------------------------------------------
// ねじの基準寸法と有効断面積
// ---------------------------------------------------------------------------

/** とがり山の高さ H = (√3 / 2)P = 0.866025P（JIS B 0205-1 の 4. 基準山形の寸法。JIS B 1082 の 3.1 にも同じ式） */
export const H_PER_PITCH = 0.866025
/** 有効径 D2 = d2 = D − 2 × (3/8)H = D − 0.649519P（JIS B 0205-4 の 5. 基準寸法。表1 の値と一致） */
export const PITCH_DIAMETER_PER_PITCH = 0.649519
/** おねじの d3 = d1 − H/6 = d − 1.226869P（JIS B 1082 の有効断面積の式で使う径） */
export const D3_PER_PITCH = 1.226869

export interface ThreadBasics {
  /** 呼び径 D = d */
  d: number
  /** 有効径 D2 = d2（小数3桁） */
  d2: number
  /** めねじ内径 D1 = おねじ谷の径 d1（小数3桁） */
  d1: number
  /** d3 = d1 − H/6（小数3桁） */
  d3: number
  /** とがり山の高さ H（小数3桁） */
  h: number
  /** 有効断面積 As [mm²]（丸める前の値） */
  stressArea: number
}

/** 呼び径から「係数 × P」を引いた径を、μm に丸めて返す */
const minusPitch = (d: number, coefficient: number, p: number) =>
  toMm(Math.round(d * 1000 - coefficient * 1000 * p))

/**
 * 有効断面積 As = π/4 × ((d2 + d3) / 2)² [mm²]（JIS B 1082:2009 の 3.1 式(1)。有効数字3桁にすると表1 の値と一致）。
 * d2・d3 は丸める前の値で計算する（小数3桁に丸めた値で計算すると M24 が 352.49 となり、有効数字3桁で 353 にならない）。
 */
export function stressArea(d: number, p: number): number {
  const d2 = d - PITCH_DIAMETER_PER_PITCH * p
  const d3 = d - D3_PER_PITCH * p
  return (Math.PI / 4) * ((d2 + d3) / 2) ** 2
}

/** 基準寸法（D・D2・D1・d3・H）と有効断面積 As */
export function threadBasics(d: number, p: number): ThreadBasics {
  return {
    d,
    d2: minusPitch(d, PITCH_DIAMETER_PER_PITCH, p),
    d1: basicMinorDiameter(d, p),
    d3: minusPitch(d, D3_PER_PITCH, p),
    h: toMm(Math.round(H_PER_PITCH * 1000 * p)),
    stressArea: stressArea(d, p),
  }
}

/**
 * 有効数字 digits 桁の文字列（指数表記にしない）。規格の表と同じく As は3桁で表示する。
 * 例: 57.99 → "58.0"、2676 → "2680"、0.4603 → "0.460"
 */
export function formatSignificant(value: number, digits = 3): string {
  if (value === 0 || !Number.isFinite(value)) return String(value)
  const rounded = Number(value.toPrecision(digits))
  const decimals = Math.max(0, digits - 1 - Math.floor(Math.log10(Math.abs(rounded))))
  return rounded.toFixed(decimals)
}

// ---------------------------------------------------------------------------
// 全サイズの早見表・ドリルからの逆引き
// ---------------------------------------------------------------------------

export type ThreadKind = 'coarse' | 'fine'

export interface ChartRow {
  d: number
  p: number
  kind: ThreadKind
  choice: MetricSize['choice']
  /** 実際に使った公差域クラス（指定の等級が規定されていないピッチでは別の等級） */
  grade: ToleranceGrade
  limits: Range
  hole: number
  basis: Recommendation['basis']
  engagement: number
  /** 用途が限られるピッチの注記 */
  note?: string
}

/**
 * JIS B 0205-2 表2 のサイズとピッチをすべて（呼び径の順、同じ呼び径は並目 → 細目の順）。
 * 5.4 の「さらに小さいピッチ」（表1 の最大の呼び径まで使える）は含まない
 */
function allThreads() {
  return METRIC_SIZES.flatMap((size) =>
    pitchesOf(size).map((p) => ({
      size,
      p,
      kind: (p === size.coarse ? 'coarse' : 'fine') as ThreadKind,
    })),
  )
}

/**
 * 早見表の1行。指定の等級が規定されていないピッチ（M1〜M1.2 の 6H など）は availableGrade の等級で求める。
 * 規格に無いサイズ・ピッチ、推奨径が出せないときは null（今のデータでは後者は起きない。テストで確認）。
 */
export function chartRow(d: number, p: number, preferred: ToleranceGrade): ChartRow | null {
  const size = findSize(d)
  if (!size || !pitchesOf(size).includes(p)) return null
  const grade = availableGrade(d, p, preferred)
  const limits = minorDiameterLimits(d, p, grade)
  const recommendation = recommendHole(d, p, grade)
  if (!limits || !recommendation) return null
  return {
    d,
    p,
    kind: p === size.coarse ? 'coarse' : 'fine',
    choice: size.choice,
    grade,
    limits,
    hole: recommendation.hole,
    basis: recommendation.basis,
    engagement: engagementPercent(d, p, recommendation.hole),
    note: size.pitchNotes?.[String(p)],
  }
}

/** 並目または細目の、全サイズの下穴径の早見表 */
export function drillChart(kind: ThreadKind, preferred: ToleranceGrade = 6): ChartRow[] {
  return allThreads()
    .filter((thread) => thread.kind === kind)
    .map((thread) => chartRow(thread.size.d, thread.p, preferred))
    .filter((row): row is ChartRow => row !== null)
}

export interface DrillMatch {
  d: number
  p: number
  kind: ThreadKind
  choice: MetricSize['choice']
  grade: ToleranceGrade
  limits: Range
  engagement: number
  note?: string
}

/**
 * 逆引き: そのドリル径が、めねじ内径 D1 の許容範囲に入るねじ（M1〜M68 の並目・細目すべて）。
 * 指定の等級が規定されていないピッチは availableGrade の等級で判定する。
 * 並び順: 並目 → 細目、第1選択 → 第3選択、呼び径の小さい順。
 */
export function threadsForDrill(drill: number, preferred: ToleranceGrade): DrillMatch[] {
  if (!(drill > 0)) return []
  const matches: DrillMatch[] = []
  for (const { size, p, kind } of allThreads()) {
    const grade = availableGrade(size.d, p, preferred)
    const limits = minorDiameterLimits(size.d, p, grade)
    if (!limits || judgeHole(drill, limits) !== 'ok') continue
    matches.push({
      d: size.d,
      p,
      kind,
      choice: size.choice,
      grade,
      limits,
      engagement: engagementPercent(size.d, p, drill),
      note: size.pitchNotes?.[String(p)],
    })
  }
  const kindOrder = (kind: ThreadKind) => (kind === 'coarse' ? 0 : 1)
  return matches.sort(
    (a, b) => kindOrder(a.kind) - kindOrder(b.kind) || a.choice - b.choice || a.d - b.d || b.p - a.p,
  )
}

/**
 * 手持ちドリル径の打ち間違いの直し方。
 * 入力値がどの等級（4H〜7H）の範囲にも入らず、1/10・1/100・10倍した値が範囲に入るなら、その値を返す
 * （例: M10 に 85 → 8.5、0.85 → 8.5）。直す候補が無ければ null。
 */
export function suggestDrillFix(d: number, p: number, drill: number): number | null {
  if (!(drill > 0)) return null
  const defined = TOLERANCE_GRADES.map((grade) => minorDiameterLimits(d, p, grade)).filter(
    (limits): limits is Range => limits !== null,
  )
  if (defined.length === 0) return null
  const union: Range = {
    min: Math.min(...defined.map((limits) => limits.min)),
    max: Math.max(...defined.map((limits) => limits.max)),
  }
  if (judgeHole(drill, union) === 'ok') return null
  for (const candidate of [drill / 10, drill / 100, drill * 10]) {
    const value = toMm(toUm(candidate))
    if (judgeHole(value, union) === 'ok') return value
  }
  return null
}

// ---------------------------------------------------------------------------
// 図面指示（表記例）
// ---------------------------------------------------------------------------

/** ねじの呼び。並目はピッチを省く（例: M12、M12×1.5） */
export function threadName(d: number, p: number): string {
  const coarse = findSize(d)?.coarse === p
  return `M${trim(d)}${coarse ? '' : `×${trim(p)}`}`
}

/** 公差域クラスまで含めたねじの呼び方（例: M12-6H、M12×1.5-6H） */
export function threadDesignation(d: number, p: number, grade: ToleranceGrade): string {
  return `${threadName(d, p)}-${grade}H`
}

export interface CalloutInput {
  d: number
  p: number
  grade: ToleranceGrade
  hole: number
  /** ねじ深さ [mm]（任意。0 以下・null は書かない） */
  threadDepth?: number | null
  /** 下穴深さ [mm]（任意。0 以下・null は書かない） */
  holeDepth?: number | null
}

/**
 * めねじの図面指示の表記例。例: "M12-6H 深さ20 下穴φ10.2 深さ25"
 * 「深さ」は直前の項目（ねじ・下穴）の深さ。
 */
export function drawingCallout({ d, p, grade, hole, threadDepth, holeDepth }: CalloutInput): string {
  const depth = (value: number | null | undefined) =>
    value !== null && value !== undefined && value > 0 ? ` 深さ${trim(value)}` : ''
  return `${threadDesignation(d, p, grade)}${depth(threadDepth)} 下穴φ${trim(hole)}${depth(holeDepth)}`
}
