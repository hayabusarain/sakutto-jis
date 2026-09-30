/**
 * 一般用メートルねじの呼び径とピッチ（JIS B 0205-2:2001 表1 = ISO 261:1998）。
 * choice: 1=第1選択, 2=第2選択, 3=第3選択（1 → 2 → 3 の順に優先）。
 * coarse: 並目ピッチ（無いサイズは null）。fine: 細目ピッチ（規格の掲載順）。
 */
export interface MetricSize {
  d: number
  choice: 1 | 2 | 3
  coarse: number | null
  fine: readonly number[]
  /** 用途が限られる・なるべく避けるピッチの注記 */
  pitchNotes?: Readonly<Record<string, string>>
}

export const METRIC_SIZES: readonly MetricSize[] = [
  { d: 1, choice: 1, coarse: 0.25, fine: [0.2] },
  { d: 1.1, choice: 2, coarse: 0.25, fine: [0.2] },
  { d: 1.2, choice: 1, coarse: 0.25, fine: [0.2] },
  { d: 1.4, choice: 2, coarse: 0.3, fine: [0.2] },
  { d: 1.6, choice: 1, coarse: 0.35, fine: [0.2] },
  { d: 1.8, choice: 2, coarse: 0.35, fine: [0.2] },
  { d: 2, choice: 1, coarse: 0.4, fine: [0.25] },
  { d: 2.2, choice: 2, coarse: 0.45, fine: [0.25] },
  { d: 2.5, choice: 1, coarse: 0.45, fine: [0.35] },
  { d: 3, choice: 1, coarse: 0.5, fine: [0.35] },
  { d: 3.5, choice: 2, coarse: 0.6, fine: [0.35] },
  { d: 4, choice: 1, coarse: 0.7, fine: [0.5] },
  { d: 4.5, choice: 2, coarse: 0.75, fine: [0.5] },
  { d: 5, choice: 1, coarse: 0.8, fine: [0.5] },
  { d: 5.5, choice: 3, coarse: null, fine: [0.5] },
  { d: 6, choice: 1, coarse: 1, fine: [0.75] },
  { d: 7, choice: 2, coarse: 1, fine: [0.75] },
  { d: 8, choice: 1, coarse: 1.25, fine: [1, 0.75] },
  { d: 9, choice: 3, coarse: 1.25, fine: [1, 0.75] },
  { d: 10, choice: 1, coarse: 1.5, fine: [1.25, 1, 0.75] },
  { d: 11, choice: 3, coarse: 1.5, fine: [1, 0.75] },
  { d: 12, choice: 1, coarse: 1.75, fine: [1.5, 1.25, 1] },
  {
    d: 14,
    choice: 2,
    coarse: 2,
    fine: [1.5, 1.25, 1],
    pitchNotes: { '1.25': '内燃機関用点火プラグ専用' },
  },
  { d: 15, choice: 3, coarse: null, fine: [1.5, 1] },
  { d: 16, choice: 1, coarse: 2, fine: [1.5, 1] },
  { d: 17, choice: 3, coarse: null, fine: [1.5, 1] },
  { d: 18, choice: 2, coarse: 2.5, fine: [2, 1.5, 1] },
  { d: 20, choice: 1, coarse: 2.5, fine: [2, 1.5, 1] },
  { d: 22, choice: 2, coarse: 2.5, fine: [2, 1.5, 1] },
  { d: 24, choice: 1, coarse: 3, fine: [2, 1.5, 1] },
  { d: 25, choice: 3, coarse: null, fine: [2, 1.5, 1] },
  { d: 26, choice: 3, coarse: null, fine: [1.5] },
  { d: 27, choice: 2, coarse: 3, fine: [2, 1.5, 1] },
  { d: 28, choice: 3, coarse: null, fine: [2, 1.5, 1] },
  { d: 30, choice: 1, coarse: 3.5, fine: [3, 2, 1.5, 1], pitchNotes: { '3': 'なるべく避ける' } },
  { d: 32, choice: 3, coarse: null, fine: [2, 1.5] },
  { d: 33, choice: 2, coarse: 3.5, fine: [3, 2, 1.5], pitchNotes: { '3': 'なるべく避ける' } },
  {
    d: 35,
    choice: 3,
    coarse: null,
    fine: [1.5],
    pitchNotes: { '1.5': '転がり軸受の固定ナット専用' },
  },
  { d: 36, choice: 1, coarse: 4, fine: [3, 2, 1.5] },
  { d: 38, choice: 3, coarse: null, fine: [1.5] },
  { d: 39, choice: 2, coarse: 4, fine: [3, 2, 1.5] },
  { d: 40, choice: 3, coarse: null, fine: [3, 2, 1.5] },
  { d: 42, choice: 1, coarse: 4.5, fine: [4, 3, 2, 1.5] },
  { d: 45, choice: 2, coarse: 4.5, fine: [4, 3, 2, 1.5] },
  { d: 48, choice: 1, coarse: 5, fine: [4, 3, 2, 1.5] },
  { d: 50, choice: 3, coarse: null, fine: [3, 2, 1.5] },
  { d: 52, choice: 2, coarse: 5, fine: [4, 3, 2, 1.5] },
  { d: 55, choice: 3, coarse: null, fine: [4, 3, 2, 1.5] },
  { d: 56, choice: 1, coarse: 5.5, fine: [4, 3, 2, 1.5] },
  { d: 58, choice: 3, coarse: null, fine: [4, 3, 2, 1.5] },
  { d: 60, choice: 2, coarse: 5.5, fine: [4, 3, 2, 1.5] },
  { d: 62, choice: 3, coarse: null, fine: [4, 3, 2, 1.5] },
  { d: 64, choice: 1, coarse: 6, fine: [4, 3, 2, 1.5] },
  { d: 65, choice: 3, coarse: null, fine: [4, 3, 2, 1.5] },
  { d: 68, choice: 2, coarse: 6, fine: [4, 3, 2, 1.5] },
]

export const TOLERANCE_GRADES = [4, 5, 6, 7] as const
export type ToleranceGrade = (typeof TOLERANCE_GRADES)[number]

/**
 * めねじ内径（D1）の公差 T_D1 [μm]（JIS B 0209-1:2001 = ISO 965-1）。
 * 公差位置 H は下の寸法許容差が 0 なので、D1 の範囲は「基準寸法 〜 基準寸法 + T_D1」。
 * null はその等級が規定されていないピッチ。
 */
export const TD1_UM: Readonly<Record<string, Readonly<Record<ToleranceGrade, number | null>>>> = {
  '0.2': { 4: 38, 5: null, 6: null, 7: null },
  '0.25': { 4: 45, 5: 56, 6: null, 7: null },
  '0.3': { 4: 53, 5: 67, 6: 85, 7: null },
  '0.35': { 4: 63, 5: 80, 6: 100, 7: null },
  '0.4': { 4: 71, 5: 90, 6: 112, 7: null },
  '0.45': { 4: 80, 5: 100, 6: 125, 7: null },
  '0.5': { 4: 90, 5: 112, 6: 140, 7: 180 },
  '0.6': { 4: 100, 5: 125, 6: 160, 7: 200 },
  '0.7': { 4: 112, 5: 140, 6: 180, 7: 224 },
  '0.75': { 4: 118, 5: 150, 6: 190, 7: 236 },
  '0.8': { 4: 125, 5: 160, 6: 200, 7: 250 },
  '1': { 4: 150, 5: 190, 6: 236, 7: 300 },
  '1.25': { 4: 170, 5: 212, 6: 265, 7: 335 },
  '1.5': { 4: 190, 5: 236, 6: 300, 7: 375 },
  '1.75': { 4: 212, 5: 265, 6: 335, 7: 425 },
  '2': { 4: 236, 5: 300, 6: 375, 7: 475 },
  '2.5': { 4: 280, 5: 355, 6: 450, 7: 560 },
  '3': { 4: 315, 5: 400, 6: 500, 7: 630 },
  '3.5': { 4: 355, 5: 450, 6: 560, 7: 710 },
  '4': { 4: 375, 5: 475, 6: 600, 7: 750 },
  '4.5': { 4: 425, 5: 530, 6: 670, 7: 850 },
  '5': { 4: 450, 5: 560, 6: 710, 7: 900 },
  '5.5': { 4: 475, 5: 600, 6: 750, 7: 950 },
  '6': { 4: 500, 5: 630, 6: 800, 7: 1000 },
}

/**
 * 並目ねじの推奨ドリル径 [mm]（ISO 2306:1972 表1。ドリル径 ≒ 呼び径 − ピッチ）。
 * 公差域クラスの範囲に入るときは、この値を推奨下穴径として優先する。
 */
export const ISO2306_COARSE_DRILL: Readonly<Record<string, number>> = {
  '1': 0.75,
  '1.2': 0.95,
  '1.4': 1.1,
  '1.6': 1.25,
  '1.8': 1.45,
  '2': 1.6,
  '2.2': 1.75,
  '2.5': 2.05,
  '3': 2.5,
  '3.5': 2.9,
  '4': 3.3,
  '4.5': 3.7,
  '5': 4.2,
  '6': 5,
  '7': 6,
  '8': 6.8,
  '10': 8.5,
  '12': 10.2,
  '14': 12,
  '16': 14,
  '18': 15.5,
  '20': 17.5,
  '22': 19.5,
  '24': 21,
  '27': 24,
  '30': 26.5,
  '33': 29.5,
  '36': 32,
  '39': 35,
  '42': 37.5,
  '45': 40.5,
  '48': 43,
}
