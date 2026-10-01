/**
 * JIS B 0405:1991 普通公差（個々に公差の指示がない長さ寸法及び角度寸法に対する公差）。
 * ISO 2768-1:1989 に対応する規格で、許容差の数値は同じ。
 *
 * 数値は作成者の知識から入力し、公開されている二次資料（部品メーカーの技術資料の転記など）で
 * 全値の一致を確かめた。規格原文との照合は未了（docs/data-verification.md 参照）。
 */

/**
 * 値の確認状況の注記（画面・コピー・CSV に出す）。docs/data-verification.md で全項目を △ にしているため。
 * 原文で確認できたら、この注記と docs の両方を更新する。
 */
export const VERIFICATION_NOTE =
  '※ 許容差の値は ISO 2768-1 の表などの二次資料と照合済みで、JIS B 0405 原文との照合は確認中です。'

export type ToleranceClass = 'f' | 'm' | 'c' | 'v'

export const TOLERANCE_CLASSES: readonly ToleranceClass[] = ['f', 'm', 'c', 'v']

export const CLASS_NAMES: Record<ToleranceClass, string> = {
  f: '精級',
  m: '中級',
  c: '粗級',
  v: '極粗級',
}

export interface SizeRange {
  /** 下限 [mm] */
  min: number
  /** 下限を含むか（最初の区分「0.5 以上 3 以下」だけ含む） */
  includeMin: boolean
  /** 上限 [mm]（含む）。null は上限なし（「6 を超えるもの」など） */
  max: number | null
  /** 規格の表記 */
  label: string
}

/** 面取り部分を除く長さ寸法の区分 [mm] */
export const LINEAR_RANGES: readonly SizeRange[] = [
  { min: 0.5, includeMin: true, max: 3, label: '0.5 以上 3 以下' },
  { min: 3, includeMin: false, max: 6, label: '3 を超え 6 以下' },
  { min: 6, includeMin: false, max: 30, label: '6 を超え 30 以下' },
  { min: 30, includeMin: false, max: 120, label: '30 を超え 120 以下' },
  { min: 120, includeMin: false, max: 400, label: '120 を超え 400 以下' },
  { min: 400, includeMin: false, max: 1000, label: '400 を超え 1000 以下' },
  { min: 1000, includeMin: false, max: 2000, label: '1000 を超え 2000 以下' },
  { min: 2000, includeMin: false, max: 4000, label: '2000 を超え 4000 以下' },
]

/** 面取り部分を除く長さ寸法の許容差 ±[μm]（null は規定なし「—」） */
export const LINEAR_TOLERANCES: Record<ToleranceClass, readonly (number | null)[]> = {
  f: [50, 50, 100, 150, 200, 300, 500, null],
  m: [100, 100, 200, 300, 500, 800, 1200, 2000],
  c: [200, 300, 500, 800, 1200, 2000, 3000, 4000],
  v: [null, 500, 1000, 1500, 2500, 4000, 6000, 8000],
}

/** 面取り部分の長さ寸法（かどの丸み・かどの面取り寸法）の区分 [mm] */
export const CHAMFER_RANGES: readonly SizeRange[] = [
  { min: 0.5, includeMin: true, max: 3, label: '0.5 以上 3 以下' },
  { min: 3, includeMin: false, max: 6, label: '3 を超え 6 以下' },
  { min: 6, includeMin: false, max: null, label: '6 を超えるもの' },
]

/** 面取り部分の長さ寸法の許容差 ±[μm] */
export const CHAMFER_TOLERANCES: Record<ToleranceClass, readonly (number | null)[]> = {
  f: [200, 500, 1000],
  m: [200, 500, 1000],
  c: [400, 1000, 2000],
  v: [400, 1000, 2000],
}

/** 角度寸法の区分（対象とする角度の短い方の辺の長さ [mm]） */
export const ANGLE_RANGES: readonly SizeRange[] = [
  { min: 0, includeMin: false, max: 10, label: '10 以下' },
  { min: 10, includeMin: false, max: 50, label: '10 を超え 50 以下' },
  { min: 50, includeMin: false, max: 120, label: '50 を超え 120 以下' },
  { min: 120, includeMin: false, max: 400, label: '120 を超え 400 以下' },
  { min: 400, includeMin: false, max: null, label: '400 を超えるもの' },
]

/** 角度寸法の許容差 ±[分]（1° = 60′） */
export const ANGLE_TOLERANCES: Record<ToleranceClass, readonly (number | null)[]> = {
  f: [60, 30, 20, 10, 5],
  m: [60, 30, 20, 10, 5],
  c: [90, 60, 30, 15, 10],
  v: [180, 120, 60, 30, 20],
}

/** 長さ寸法の普通公差が適用される最小の寸法 [mm]（これ未満は個々に指示する） */
export const MIN_SIZE = 0.5
