import { BOLT_SIZES } from '../bolt-size/data'
import {
  COARSE_PITCH,
  FLANGES,
  NUT_HEIGHT,
  PRESSURE_CLASSES,
  STANDARD_BOLT_LENGTHS,
  UNVERIFIED,
  WASHER_THICKNESS,
  type FlangeRow,
  type PressureClass,
} from './data'

export type BoltType = 'hex' | 'stud'
export type NutKind = 'style1' | 'ja1'
export type Rounding = '5mm' | 'jis'

export function findFlange(pressure: PressureClass, size: string): FlangeRow | undefined {
  return FLANGES[pressure].find((row) => row.size === size)
}

export interface BoltLengthInput {
  /** ボルトの呼び径（M16 なら 16） */
  bolt: number
  /** 自分側・相手側のフランジ厚さ [mm] */
  t1: number
  t2: number
  /** ガスケット厚さ [mm] */
  gasket: number
  /** 平座金の枚数（ボルト1本あたり） */
  washers: 0 | 1 | 2
  nut: NutKind
  /** ナットからの突き出し（ねじ山の数） */
  threads: number
  type: BoltType
  rounding: Rounding
}

export interface BoltLengthResult {
  /** 締付け長さ（フランジ2枚 + ガスケット + 座金） */
  grip: number
  nutHeight: number
  washerThickness: number
  pitch: number
  /** 突き出し長さ = 山数 × ピッチ（スタッドボルトは両側） */
  protrusion: number
  /** 計算上の必要長さ */
  required: number
  /** 丸めた推奨長さ（標準長さを超えるときは null） */
  length: number | null
  /** 推奨長さにしたときの、ナットからの実際の突き出し（片側） */
  actualProtrusion: number | null
}

const round2 = (value: number) => Math.round(value * 100) / 100

/**
 * 六角ボルト: L = t1 + t2 + G + n×W + m + k×P
 * スタッドボルト（両ナット）: L = t1 + t2 + G + n×W + 2m + 2×k×P
 */
export function boltLength(input: BoltLengthInput): BoltLengthResult {
  const nutHeight = NUT_HEIGHT[input.bolt][input.nut]
  const washerThickness = WASHER_THICKNESS[input.bolt]
  const pitch = COARSE_PITCH[input.bolt]
  const nuts = input.type === 'stud' ? 2 : 1

  const grip = round2(input.t1 + input.t2 + input.gasket + input.washers * washerThickness)
  const protrusion = round2(input.threads * pitch * nuts)
  const required = round2(grip + nutHeight * nuts + protrusion)
  const length = roundLength(required, input.rounding)
  const actualProtrusion =
    length === null ? null : round2((length - grip - nutHeight * nuts) / nuts)

  return { grip, nutHeight, washerThickness, pitch, protrusion, required, length, actualProtrusion }
}

export function roundLength(required: number, rounding: Rounding): number | null {
  if (rounding === '5mm') return Math.ceil(required / 5 - 1e-9) * 5
  return STANDARD_BOLT_LENGTHS.find((length) => length >= required - 1e-9) ?? null
}

/** 突き出し長さをねじ山の数にする（小数1桁で切り捨て。浮動小数の誤差で 4.4 → 4.3 にならないよう補正） */
export function protrusionThreads(protrusion: number, pitch: number): number {
  return Math.floor((protrusion / pitch) * 10 + 1e-9) / 10
}

// ---------------------------------------------------------------------------
// 規格原文で未確認の値（※ を付ける）

export type FlangeField = 'D' | 'C' | 'n' | 'h' | 'bolt' | 't'

/** その呼び径の行の寸法すべてが未確認か（5K・10K の 90A・175A・225A） */
export function isRowUnverified(pressure: PressureClass, size: string): boolean {
  return UNVERIFIED[pressure]?.rows?.includes(size) ?? false
}

/** その値が規格原文で未確認か */
export function isUnverified(pressure: PressureClass, size: string, field: FlangeField): boolean {
  if (isRowUnverified(pressure, size)) return true
  if (field !== 't') return false
  const t = UNVERIFIED[pressure]?.t
  return t === 'all' || (t?.includes(size) ?? false)
}

// ---------------------------------------------------------------------------
// 今の条件でのボルト長さ（寸法表・クラス比較でも同じ条件で計算する）

export interface BoltConditions {
  type: BoltType
  /** ガスケット厚さ [mm] */
  gasket: number
  washers: 0 | 1 | 2
  nut: NutKind
  threads: number
  rounding: Rounding
  /** 相手側フランジの厚さ [mm]。null なら同じフランジ */
  t2: number | null
}

export function flangeBoltLength(row: FlangeRow, conditions: BoltConditions): BoltLengthResult {
  return boltLength({
    bolt: row.bolt,
    t1: row.t,
    t2: conditions.t2 ?? row.t,
    gasket: conditions.gasket,
    washers: conditions.washers,
    nut: conditions.nut,
    threads: conditions.threads,
    type: conditions.type,
    rounding: conditions.rounding,
  })
}

/**
 * スパナの呼び（二面幅 s）[mm]。JIS本体のナットは本体の二面幅、旧JIS 1種は附属書JA の二面幅
 * （JIS B 1180・B 1181。六角ボルトの頭も同じ二面幅）
 */
export function spannerSize(bolt: number, nut: NutKind): number | undefined {
  const size = BOLT_SIZES.find((s) => s.d === bolt)
  if (!size) return undefined
  return nut === 'style1' ? size.sIso : size.sJa
}

// ---------------------------------------------------------------------------
// 同じ呼び径の圧力クラス比較

export interface ClassComparison {
  pressure: PressureClass
  /** その呼び径が無いクラスは undefined（16K・20K の 90A・175A・225A） */
  row: FlangeRow | undefined
  bolt: BoltLengthResult | undefined
}

/** conditions が null（入力エラー）のときは、寸法だけ（bolt は undefined） */
export function compareClasses(size: string, conditions: BoltConditions | null): ClassComparison[] {
  return PRESSURE_CLASSES.map((pressure) => {
    const row = findFlange(pressure, size)
    return { pressure, row, bolt: row && conditions ? flangeBoltLength(row, conditions) : undefined }
  })
}

/** ボルト穴の位置と大きさ（PCD・穴数・穴径）が同じか。外径と厚さは問わない */
export function sameBoltPattern(a: FlangeRow, b: FlangeRow): boolean {
  return a.C === b.C && a.n === b.n && a.h === b.h
}

/** 呼び径の数値部分（「50A」→ 50） */
export function nominalNumber(size: string): number {
  return Number.parseFloat(size)
}

/**
 * そのクラスで使える呼び径。無いとき（16K に 175A など）は、数値が最も近い呼び径（同じ近さなら大きい方）。
 * 数値として読めない呼び径は 50A にする。
 */
export function nearestSize(pressure: PressureClass, size: string): string {
  const rows = FLANGES[pressure]
  if (rows.some((row) => row.size === size)) return size
  const target = nominalNumber(size)
  if (!Number.isFinite(target)) return '50A'
  let best = rows[0]
  for (const row of rows) {
    const d = Math.abs(nominalNumber(row.size) - target)
    const bestD = Math.abs(nominalNumber(best.size) - target)
    if (d < bestD || (d === bestD && nominalNumber(row.size) > nominalNumber(best.size))) best = row
  }
  return best.size
}

// ---------------------------------------------------------------------------
// 実測から探す（外径・穴数・穴の間隔からフランジを特定する）

/**
 * 隣り合うボルト穴の中心間距離 s から PCD を求める。PCD = s ÷ sin(π / n)
 * （穴は PCD 上に等間隔。4穴なら s × √2）
 */
export function pcdFromPitch(s: number, n: number): number {
  return s / Math.sin(Math.PI / n)
}

export interface IdentifyQuery {
  /** ボルト穴の数（完全に一致するものだけを探す） */
  n: number
  /** 外径 D [mm]（任意） */
  D: number | null
  /** PCD [mm]（任意。隣の穴との間隔から求めたものでもよい） */
  pcd: number | null
  /** 穴径 [mm]（任意） */
  h: number | null
  /** 厚さ [mm]（任意。D・PCD・穴が同じ候補の中で並べ替えるのに使う） */
  t: number | null
}

export interface IdentifyCandidate {
  pressure: PressureClass
  row: FlangeRow
  /** 表の値 − 実測。入力しなかった項目は null */
  dD: number | null
  dC: number | null
  dH: number | null
  dT: number | null
}

export interface IdentifyGroup {
  /** D・PCD・穴数・穴径が同じ候補（厚さだけが違う・まったく同じ、など） */
  candidates: IdentifyCandidate[]
  /** |ΔD| + |ΔPCD| + |Δ穴径| [mm]。小さいほど近い */
  score: number
  /** 入力した寸法の差が、実測の誤差と考えられる範囲（D・PCD は 3 mm、穴径は 1.5 mm 以内） */
  close: boolean
}

const deviation = (table: number, measured: number | null) =>
  measured === null ? null : Math.round((table - measured) * 1000) / 1000

const within = (value: number | null, limit: number) => Math.abs(value ?? 0) <= limit + 1e-9

/**
 * 実測値に近い JIS フランジを探す。穴数が一致するものだけを対象に、|ΔD| + |ΔPCD| + |Δ穴径| の小さい順。
 * D・PCD・穴数・穴径がまったく同じ候補は1つのグループにまとめる（例: 10K・16K・20K の 25A）。
 * グループの中は、厚さの入力があれば厚さの近い順、無ければ圧力の低い順。
 * 外径も PCD も無いときは探さない（空の配列）。
 */
export function identifyFlange(query: IdentifyQuery, limit = 3): IdentifyGroup[] {
  if (query.D === null && query.pcd === null) return []

  const groups = new Map<string, IdentifyGroup>()
  for (const pressure of PRESSURE_CLASSES) {
    for (const row of FLANGES[pressure]) {
      if (row.n !== query.n) continue
      const candidate: IdentifyCandidate = {
        pressure,
        row,
        dD: deviation(row.D, query.D),
        dC: deviation(row.C, query.pcd),
        dH: deviation(row.h, query.h),
        dT: deviation(row.t, query.t),
      }
      const key = `${row.D}-${row.C}-${row.n}-${row.h}`
      const group = groups.get(key)
      if (group) {
        group.candidates.push(candidate)
        continue
      }
      const score =
        Math.abs(candidate.dD ?? 0) + Math.abs(candidate.dC ?? 0) + Math.abs(candidate.dH ?? 0)
      groups.set(key, {
        candidates: [candidate],
        score: Math.round(score * 1000) / 1000,
        close: within(candidate.dD, 3) && within(candidate.dC, 3) && within(candidate.dH, 1.5),
      })
    }
  }

  // sort は安定なので、同じ近さのグループは圧力の低い順・呼び径の小さい順のまま
  const sorted = [...groups.values()].sort((a, b) => a.score - b.score)
  if (query.t !== null) {
    for (const group of sorted) {
      group.candidates.sort((a, b) => Math.abs(a.dT ?? 0) - Math.abs(b.dT ?? 0))
    }
  }
  return sorted.slice(0, limit)
}
