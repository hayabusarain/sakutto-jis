/**
 * 六角ボルト・ナット・六角穴付きボルトの主要寸法とボルト穴径 [mm]。
 * すべて規格票の原文（kikakurui.com の規格票の画像）で確認した値（2026-10）。
 * - 六角ボルト: JIS B 1180:2014 本体（ISO 4014/4017）の 表3（第1選択）・表4（第2選択: M14・M18・M22・M27）と、
 *   附属書JA（ISOによらない、いわゆる旧JIS）の 表JA.8 六角ボルト・上（表JA.10 中・表JA.12 並も M6 以上は同じ s・k）
 * - 六角ナット: JIS B 1181:2014 本体の 表3・表4（スタイル1。m は最大）と、附属書JA の 表JA.9 六角ナット・上
 *   （m は 1種・2種・4種に共通、m1 が 3種。表JA.11 中・表JA.13 並も M6 以上は同じ値）
 * - 六角穴付きボルト: JIS B 1176:2014 の 表3（ISO 4762）。追補1（2015）で JIS B 1176:2015 になったが、寸法の変更はない
 * - ボルト穴径・ざぐり径: JIS B 1001:1985 の 付表（表番号なし）「ボルト穴径及びざぐり径の寸法」
 * - 六角穴付きボルト用の座ぐり: 設計でよく使われる参考値（JIS B 1001・B 1176 には規定がない）
 */
export interface BoltSize {
  d: number
  /** 六角ボルト・ナットの二面幅 s（本体: 基準寸法 = 最大 / 附属書JA: 基準寸法） */
  sIso: number
  sJa: number
  /** 六角ボルトの頭部高さ k（本体・附属書JA とも基準寸法） */
  kIso: number
  kJa: number
  /** 六角ナットの高さ m（本体スタイル1 最大 / 附属書JA 1種（2種・4種も同じ）/ 附属書JA 3種。附属書JA は基準寸法） */
  nutStyle1: number
  nutJa1: number
  nutJa3: number
  /** 六角穴付きボルトの頭部径 dk（最大。ローレットの無い頭部）・頭部高さ k（最大）・六角穴の二面幅 s（呼び。六角棒スパナの呼び） */
  capDk: number
  capK: number
  capKey: number
  /** ボルト穴径 1級・2級・3級・4級（4級が無いサイズは null） */
  holes: readonly [number, number, number, number | null]
  /** ざぐり径 D'（JIS B 1001。ボルト・小ねじなどの座面のざぐり。深さの規定は無く、一般に黒皮が取れる程度） */
  spotFace: number
  /** 六角穴付きボルト用の座ぐり（穴径 d1・座ぐり径 D・深さ H。参考値）。参考値を載せていないサイズは null */
  counterbore: { d1: number; d: number; h: number } | null
  /** 六角穴付きボルトが JIS B 1176（ISO 4762）に無いサイズ（寸法は DIN 912 などの値） */
  capNonJis?: true
  /**
   * JIS B 1180・B 1181 本体で第2選択（表4）のサイズ。附属書JA の表では括弧付きで
   * 「ねじの呼びに括弧を付けたものは，なるべく用いない」とされている
   */
  secondChoice?: true
}

export const BOLT_SIZES: readonly BoltSize[] = [
  { d: 3, sIso: 5.5, sJa: 5.5, kIso: 2, kJa: 2, nutStyle1: 2.4, nutJa1: 2.4, nutJa3: 1.8, capDk: 5.5, capK: 3, capKey: 2.5, holes: [3.2, 3.4, 3.6, null], spotFace: 9, counterbore: { d1: 3.4, d: 6.5, h: 3.3 } },
  { d: 4, sIso: 7, sJa: 7, kIso: 2.8, kJa: 2.8, nutStyle1: 3.2, nutJa1: 3.2, nutJa3: 2.4, capDk: 7, capK: 4, capKey: 3, holes: [4.3, 4.5, 4.8, 5.5], spotFace: 11, counterbore: { d1: 4.5, d: 8, h: 4.4 } },
  { d: 5, sIso: 8, sJa: 8, kIso: 3.5, kJa: 3.5, nutStyle1: 4.7, nutJa1: 4, nutJa3: 3.2, capDk: 8.5, capK: 5, capKey: 4, holes: [5.3, 5.5, 5.8, 6.5], spotFace: 13, counterbore: { d1: 5.5, d: 9.5, h: 5.4 } },
  { d: 6, sIso: 10, sJa: 10, kIso: 4, kJa: 4, nutStyle1: 5.2, nutJa1: 5, nutJa3: 3.6, capDk: 10, capK: 6, capKey: 5, holes: [6.4, 6.6, 7, 7.8], spotFace: 15, counterbore: { d1: 6.6, d: 11, h: 6.5 } },
  { d: 8, sIso: 13, sJa: 13, kIso: 5.3, kJa: 5.5, nutStyle1: 6.8, nutJa1: 6.5, nutJa3: 5, capDk: 13, capK: 8, capKey: 6, holes: [8.4, 9, 10, 10], spotFace: 20, counterbore: { d1: 9, d: 14, h: 8.6 } },
  { d: 10, sIso: 16, sJa: 17, kIso: 6.4, kJa: 7, nutStyle1: 8.4, nutJa1: 8, nutJa3: 6, capDk: 16, capK: 10, capKey: 8, holes: [10.5, 11, 12, 13], spotFace: 24, counterbore: { d1: 11, d: 17.5, h: 10.8 } },
  { d: 12, sIso: 18, sJa: 19, kIso: 7.5, kJa: 8, nutStyle1: 10.8, nutJa1: 10, nutJa3: 7, capDk: 18, capK: 12, capKey: 10, holes: [13, 13.5, 14.5, 15], spotFace: 28, counterbore: { d1: 14, d: 20, h: 13 } },
  { d: 14, sIso: 21, sJa: 22, kIso: 8.8, kJa: 9, nutStyle1: 12.8, nutJa1: 11, nutJa3: 8, capDk: 21, capK: 14, capKey: 12, holes: [15, 15.5, 16.5, 17], spotFace: 32, counterbore: { d1: 16, d: 23, h: 15.2 }, secondChoice: true },
  { d: 16, sIso: 24, sJa: 24, kIso: 10, kJa: 10, nutStyle1: 14.8, nutJa1: 13, nutJa3: 10, capDk: 24, capK: 16, capKey: 14, holes: [17, 17.5, 18.5, 20], spotFace: 35, counterbore: { d1: 18, d: 26, h: 17.5 } },
  { d: 18, sIso: 27, sJa: 27, kIso: 11.5, kJa: 12, nutStyle1: 15.8, nutJa1: 15, nutJa3: 11, capDk: 27, capK: 18, capKey: 14, holes: [19, 20, 21, 22], spotFace: 39, counterbore: { d1: 20, d: 29, h: 19.5 }, capNonJis: true, secondChoice: true },
  { d: 20, sIso: 30, sJa: 30, kIso: 12.5, kJa: 13, nutStyle1: 18, nutJa1: 16, nutJa3: 12, capDk: 30, capK: 20, capKey: 17, holes: [21, 22, 24, 25], spotFace: 43, counterbore: { d1: 22, d: 32, h: 21.5 } },
  { d: 22, sIso: 34, sJa: 32, kIso: 14, kJa: 14, nutStyle1: 19.4, nutJa1: 18, nutJa3: 13, capDk: 33, capK: 22, capKey: 17, holes: [23, 24, 26, 27], spotFace: 46, counterbore: { d1: 24, d: 35, h: 23.5 }, capNonJis: true, secondChoice: true },
  { d: 24, sIso: 36, sJa: 36, kIso: 15, kJa: 15, nutStyle1: 21.5, nutJa1: 19, nutJa3: 14, capDk: 36, capK: 24, capKey: 19, holes: [25, 26, 28, 29], spotFace: 50, counterbore: { d1: 26, d: 39, h: 25.5 } },
  { d: 27, sIso: 41, sJa: 41, kIso: 17, kJa: 17, nutStyle1: 23.8, nutJa1: 22, nutJa3: 16, capDk: 40, capK: 27, capKey: 19, holes: [28, 30, 32, 33], spotFace: 55, counterbore: { d1: 30, d: 43, h: 29 }, capNonJis: true, secondChoice: true },
  { d: 30, sIso: 46, sJa: 46, kIso: 18.7, kJa: 19, nutStyle1: 25.6, nutJa1: 24, nutJa3: 18, capDk: 45, capK: 30, capKey: 22, holes: [31, 33, 35, 36], spotFace: 62, counterbore: { d1: 33, d: 48, h: 32 } },
  { d: 36, sIso: 55, sJa: 55, kIso: 22.5, kJa: 23, nutStyle1: 31, nutJa1: 29, nutJa3: 21, capDk: 54, capK: 36, capKey: 27, holes: [37, 39, 42, 43], spotFace: 72, counterbore: null },
]

export const HOLE_CLASSES = ['1級', '2級', '3級', '4級'] as const
export type HoleClass = (typeof HOLE_CLASSES)[number]

/** JIS B 1001 付表の注(1)。4級の値を出すところに添える */
export const HOLE4_NOTE = '4級は主として鋳抜き穴に適用（JIS B 1001 注(1)）'

/** 確認状況を持たせる項目。hole4: ボルト穴径 4級（holes[3]） */
export type CheckedField = 'sJa' | 'hole4' | 'spotFace'

export interface UnverifiedEntry {
  field: CheckedField
  /** 対象の呼び径。'all' は全サイズ */
  sizes: 'all' | readonly number[]
  /** 何が未確認か（画面の注記に使う） */
  note: string
}

/**
 * 規格原文で確認できていない値（docs/data-verification.md の △・要確認）。
 * 画面の表・結果・コピー・表の出力で ※ を付ける。確認できたらここから外す。
 *
 * いまは空。2026-10 に規格票の原文で次を確認して外した:
 * - ボルト穴径 4級・ざぐり径 D'（全サイズ）: JIS B 1001:1985 付表と一致
 * - 附属書JA の M3 の二面幅 5.5: JIS B 1180:2014 表JA.8・JIS B 1181:2014 表JA.9 とも 5.5（附属書JA に 5 とする表は無い）
 * 新しく未確認の値を載せるときは、ここに足せば ※ と凡例が出る。
 */
export const UNVERIFIED: readonly UnverifiedEntry[] = []

/** ※ の凡例 */
export const UNVERIFIED_LEGEND = '※ 規格原文で未確認の値'

/** 六角穴付きボルトが JIS B 1176 に無いサイズ（capNonJis）の値に付ける印 */
export const CAP_NON_JIS_MARK = '†'

/** † の凡例（M18・M22・M27 の六角レンチ・頭部・CAP座ぐり） */
export const CAP_NON_JIS_LEGEND = '† 六角穴付きボルトが JIS B 1176 に無いサイズ（ボルトの寸法は DIN 912 などの値）'

/** entries の中に、その項目・呼び径を未確認とするものがあるか（isUnverified の中身。テストでは仮の一覧を渡す） */
export function listsUnverified(entries: readonly UnverifiedEntry[], field: CheckedField, d: number): boolean {
  return entries.some(
    (entry) => entry.field === field && (entry.sizes === 'all' || entry.sizes.includes(d)),
  )
}

/** その値が規格原文で未確認か */
export function isUnverified(field: CheckedField, d: number): boolean {
  return listsUnverified(UNVERIFIED, field, d)
}
