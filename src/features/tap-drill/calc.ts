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
 * H = (√3 / 2)P = 0.866025P、H1 = (5/8)H、2 × H1 = 1.082532P（JIS B 0205-1）
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

/** ひっかかり率 [%] = (D − 下穴径) ÷ (2 × H1) × 100 */
export function engagementPercent(d: number, p: number, hole: number): number {
  return ((d - hole) / (TWO_H1_PER_PITCH * p)) * 100
}

/** 下穴径の刻み [mm]。細いピッチは 0.05mm、ピッチ1mm以上は市販ドリルの主流に合わせ 0.1mm */
export function holeStep(p: number): number {
  return p < 1 ? 0.05 : 0.1
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

/** 指定の等級が規定されていないピッチ（M1〜M1.4 など）では、規定のある等級に切り替える */
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
