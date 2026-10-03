/**
 * 現場メモの記事に載せる数値。すべて各ツールの calc.ts・data.ts から計算する（記事に数値を手書きしない）。
 * 記事に出す値は examples.test.ts で確かめている。
 */
import { boltsByAcrossFlats, flangesUsingBolt, type FlangeUse } from '../../features/bolt-size/calc'
import { BOLT_SIZES, type BoltSize } from '../../features/bolt-size/data'
import {
  findFlange,
  flangeBoltLength,
  flangeThicknessTolerance,
  raisedFaceHeight,
  type BoltConditions,
  type BoltLengthResult,
} from '../../features/flange-bolt/calc'
import {
  COARSE_PITCH,
  NUT_HEIGHT,
  STANDARD_BOLT_LENGTHS,
  WASHER_THICKNESS,
  type FlangeRow,
  type PressureClass,
} from '../../features/flange-bolt/data'
import { DEFAULT_INPUT as FLANGE_DEFAULT_INPUT } from '../../features/flange-bolt/input'
import {
  b1004SeriesHole,
  engagementPercent,
  findSize,
  holeCandidates,
  minorDiameterLimits,
  recommendHole,
  type HoleCandidate,
  type Range,
  type Recommendation,
} from '../../features/tap-drill/calc'
import { toolHref } from '../../lib/query'

const round2 = (value: number) => Math.round(value * 100) / 100

// ---------------------------------------------------------------------------
// フランジボルトの長さ

export const FLANGE_TOOL_PATH = '/flange-bolt-length'

/** フランジのツールの既定の条件（六角ボルト・ガスケット 3 mm・JIS本体ナット・座金なし・3山・5mm刻み） */
export const FLANGE_BASE: BoltConditions = {
  type: FLANGE_DEFAULT_INPUT.type,
  gasket: Number(FLANGE_DEFAULT_INPUT.gasket),
  washers: FLANGE_DEFAULT_INPUT.washers,
  nut: FLANGE_DEFAULT_INPUT.nut,
  threads: FLANGE_DEFAULT_INPUT.threads,
  rounding: FLANGE_DEFAULT_INPUT.rounding,
  t2: null,
}

export interface FlangeExample {
  pressure: PressureClass
  row: FlangeRow
  conditions: BoltConditions
  result: BoltLengthResult
  /** この条件でツールを開くリンク */
  href: string
}

/** 既定の条件と違う項目だけを、ツールのクエリ（キー名は FlangeInput と同じ）にする */
function conditionParams(conditions: BoltConditions): Record<string, string | number> {
  const params: Record<string, string | number> = {}
  if (conditions.type !== FLANGE_BASE.type) params.type = conditions.type
  if (conditions.gasket !== FLANGE_BASE.gasket) params.gasket = String(conditions.gasket)
  if (conditions.nut !== FLANGE_BASE.nut) params.nut = conditions.nut
  if (conditions.washers !== FLANGE_BASE.washers) params.washers = conditions.washers
  if (conditions.threads !== FLANGE_BASE.threads) params.threads = conditions.threads
  if (conditions.rounding !== FLANGE_BASE.rounding) params.rounding = conditions.rounding
  if (conditions.t2 !== null) params.t2 = String(conditions.t2)
  return params
}

function flangeExample(pressure: PressureClass, size: string, overrides: Partial<BoltConditions> = {}): FlangeExample {
  const row = findFlange(pressure, size)!
  const conditions = { ...FLANGE_BASE, ...overrides }
  return {
    pressure,
    row,
    conditions,
    result: flangeBoltLength(row, conditions),
    href: toolHref(FLANGE_TOOL_PATH, { pressure, size, ...conditionParams(conditions) }),
  }
}

/** 例1: 10K 50A を既定の条件で */
export const FLANGE_EX_BASE = flangeExample('10K', '50A')
/** 例2: 同じ 10K 50A で、旧JIS 1種のナットと 1.5 mm のガスケット */
export const FLANGE_EX_JA = flangeExample('10K', '50A', { nut: 'ja1', gasket: 1.5 })
/** 例3: 10K 150A を既定の条件で。丸め方で長さが変わる例 */
export const FLANGE_EX_ROUND_5MM = flangeExample('10K', '150A')
export const FLANGE_EX_ROUND_JIS = flangeExample('10K', '150A', { rounding: 'jis' })
/** 例3 の JIS の呼び長さの系列で、切り上げた長さの1つ前（75 mm は系列に無く、70 の次が 80） */
export const JIS_LENGTH_BEFORE_EX3 = STANDARD_BOLT_LENGTHS.filter(
  (length) => length < (FLANGE_EX_ROUND_JIS.result.length ?? 0),
).at(-1)!

/** 例1 のフランジ（10K 50A）で、条件を1つ変えたときの必要長さの変化 [mm] */
const baseRow = FLANGE_EX_BASE.row
const baseRequired = FLANGE_EX_BASE.result.required
const requiredWith = (overrides: Partial<BoltConditions>, row: FlangeRow = baseRow) =>
  flangeBoltLength(row, { ...FLANGE_BASE, ...overrides }).required
const delta = (required: number) => round2(required - baseRequired)

/** 例1 のボルトの呼び（10K 50A は M16） */
export const BASE_BOLT = baseRow.bolt
/** 例1 のフランジの座の高さ f [mm]（JIS B 2220 表13。50A は 2） */
export const BASE_FACE_HEIGHT = raisedFaceHeight(baseRow.size)!
/** 例1 のフランジの厚さの許容差（プラス側）[mm]。RF は t − f に対して（JIS B 2220 表22） */
export const BASE_THICKNESS_TOLERANCE = flangeThicknessTolerance(baseRow.t - BASE_FACE_HEIGHT)

export const FLANGE_EFFECTS = {
  /** ガスケット 3 → 1.5 mm */
  thinGasket: { gasket: 1.5, delta: delta(requiredWith({ gasket: 1.5 })) },
  /** ナット JIS本体（スタイル1 最大）→ 旧JIS 1種 */
  nutJa: {
    style1: NUT_HEIGHT[BASE_BOLT].style1,
    ja1: NUT_HEIGHT[BASE_BOLT].ja1,
    delta: delta(requiredWith({ nut: 'ja1' })),
  },
  /** 平座金（JIS B 1256 並形）の厚さ。片側・両側 */
  washer: {
    thickness: WASHER_THICKNESS[BASE_BOLT],
    one: delta(requiredWith({ washers: 1 })),
    two: delta(requiredWith({ washers: 2 })),
  },
  /** 突き出しを1山変えたとき（並目ピッチ） */
  thread: { pitch: COARSE_PITCH[BASE_BOLT], delta: delta(requiredWith({ threads: FLANGE_BASE.threads + 1 })) },
  /** 2枚とも座の高さを含まない厚さ（t − f）で計算したとき */
  withoutFace: delta(requiredWith({}, { ...baseRow, t: baseRow.t - BASE_FACE_HEIGHT })),
  /** 2枚とも厚さが許容差の上限だったとき */
  thickest: delta(requiredWith({}, { ...baseRow, t: baseRow.t + BASE_THICKNESS_TOLERANCE })),
}

// ---------------------------------------------------------------------------
// M12 の下穴

export const TAP_DRILL_TOOL_PATH = '/tap-drill'

export interface SeriesRow {
  d: number
  p: number
  /** JIS B 1004 のひっかかり率 95 %・90 % の系列の下穴径 */
  s95: number
  s90: number
  /** めねじ内径 D1 の許容範囲（6H） */
  limits6H: Range
  /** このサイトの推奨下穴径（6H） */
  recommended: Recommendation
  /** 推奨下穴径のひっかかり率 [%] */
  recommendedEngagement: number
}

function seriesRow(d: number): SeriesRow {
  const p = findSize(d)!.coarse!
  const recommended = recommendHole(d, p, 6)!
  return {
    d,
    p,
    s95: b1004SeriesHole(d, p, 95),
    s90: b1004SeriesHole(d, p, 90),
    limits6H: minorDiameterLimits(d, p, 6)!,
    recommended,
    recommendedEngagement: engagementPercent(d, p, recommended.hole),
  }
}

export const M12 = seriesRow(12)
/** M12 の 5H・6H・7H の範囲 */
export const M12_LIMITS = {
  5: minorDiameterLimits(M12.d, M12.p, 5)!,
  6: M12.limits6H,
  7: minorDiameterLimits(M12.d, M12.p, 7)!,
} as const
/** JIS B 1004 の 100 % の系列（M12 は 10.1。丸めのため D1 の最小をわずかに下回る） */
export const M12_S100 = b1004SeriesHole(M12.d, M12.p, 100)
/** M12 の 0.1 mm 刻みの下穴径とひっかかり率・等級ごとの判定（10.1〜10.6） */
export const M12_CANDIDATES: readonly HoleCandidate[] = holeCandidates(M12.d, M12.p)
export const m12Engagement = (hole: number) => engagementPercent(M12.d, M12.p, hole)

/** 並目のよく使うサイズの系列（M6〜M16） */
export const SERIES_ROWS: readonly SeriesRow[] = [6, 8, 10, 12, 16].map(seriesRow)

export const tapDrillHref = (d: number, p: number, drill?: number) =>
  toolHref(TAP_DRILL_TOOL_PATH, drill === undefined ? { d, p } : { d, p, drill: String(drill) })

// ---------------------------------------------------------------------------
// 二面幅（JIS本体と旧JIS）

export const BOLT_SIZE_TOOL_PATH = '/bolt-size'

/** 二面幅が JIS本体と附属書JA（旧JIS）で違うサイズ（M10・M12・M14・M22） */
export const FLATS_DIFFER: readonly BoltSize[] = BOLT_SIZES.filter((size) => size.sIso !== size.sJa)
/** 二面幅が同じサイズの数 */
export const FLATS_SAME_COUNT = BOLT_SIZES.length - FLATS_DIFFER.length
/** 収録範囲（M3〜M36） */
export const BOLT_RANGE = `M${BOLT_SIZES[0].d}〜M${BOLT_SIZES[BOLT_SIZES.length - 1].d}`

/** 違うサイズの二面幅のうち、JIS本体のもの・旧JIS のもの（小さい順） */
export const ISO_ONLY_FLATS = FLATS_DIFFER.map((size) => size.sIso).sort((a, b) => a - b)
export const JA_ONLY_FLATS = FLATS_DIFFER.map((size) => size.sJa).sort((a, b) => a - b)

/** 二面幅だけで、ねじの呼びと規格（本体・旧JIS）が1つに決まるか（収録範囲の中で） */
export const flatsIdentifyUniquely = (s: number) => boltsByAcrossFlats(s).length === 1

/** M12 の頭部の高さ・ナットの高さ（二面幅以外の違いの例） */
export const M12_BOLT = BOLT_SIZES.find((size) => size.d === 12)!

/** 二面幅が違うサイズのうち、JIS フランジに使うもの */
export const FLATS_DIFFER_IN_FLANGES: readonly { size: BoltSize; uses: FlangeUse[] }[] = FLATS_DIFFER.map(
  (size) => ({ size, uses: flangesUsingBolt(size.d) }),
).filter((entry) => entry.uses.length > 0)

export const boltSizeHref = (d: number) => toolHref(BOLT_SIZE_TOOL_PATH, { d })
