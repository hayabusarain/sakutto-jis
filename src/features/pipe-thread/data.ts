/**
 * 管用ねじの基準寸法 [mm]。
 * - 管用テーパねじ R・Rc・Rp: JIS B 0203:1999 付表1（ISO 7-1）
 * - 管用平行ねじ G: JIS B 0202:1999 付表1（ISO 228-1）
 * 基準径（外径 d・有効径 d2・谷径/内径 d1）は、テーパねじでは「基準径の位置」での値で、G と共通。
 * 全値を JIS B 0203:1999・B 0202:1999 の原文（kikakurui の規格票の画像）と照合済み。
 */
export interface PipeThreadSize {
  /** ねじの呼び（例: 1/2） */
  size: string
  /** 対応する管の呼び径（A呼称） */
  pipeA: string | null
  /** 25.4mm あたりの山数 */
  tpi: number
  d: number
  d2: number
  d1: number
  /** 基準の長さ a（おねじ R：管端から基準径の位置まで） */
  gaugeLength: number
  /** おねじの基準径の位置の、軸線方向の許容差 ±b（基準の長さ a の許容差） */
  gaugeToleranceExternal: number
  /** テーパめねじ Rc の基準径の位置の、軸線方向の許容差 ±c（めねじの基準径の位置は、ねじを切った部分の端面） */
  gaugeToleranceInternal: number
  /** おねじ R の有効ねじ部の最小長さ f（JIS の表の値。基準径の位置から大径側に向かって） */
  usefulExternalFromGauge: number
  /**
   * おねじ R の有効ねじ部の最小長さを管端から測った値 a + f（a が基準寸法のとき）。0.1mm に丸めた値。
   * JIS の表に載っているのは f だけで、この合計は計算値（ISO 7-1 の表の値とも一致）
   */
  usefulExternal: number
  /** めねじ Rc の有効ねじ部の最小長さ l（不完全ねじ部がある場合。基準径の位置から小径側に向かって）。未確認は null */
  usefulInternalRc: number | null
}

export const PIPE_THREAD_SIZES: readonly PipeThreadSize[] = [
  { size: '1/16', pipeA: null, tpi: 28, d: 7.723, d2: 7.142, d1: 6.561, gaugeLength: 3.97, gaugeToleranceExternal: 0.91, gaugeToleranceInternal: 1.13, usefulExternalFromGauge: 2.5, usefulExternal: 6.5, usefulInternalRc: 6.2 },
  { size: '1/8', pipeA: '6A', tpi: 28, d: 9.728, d2: 9.147, d1: 8.566, gaugeLength: 3.97, gaugeToleranceExternal: 0.91, gaugeToleranceInternal: 1.13, usefulExternalFromGauge: 2.5, usefulExternal: 6.5, usefulInternalRc: 6.2 },
  { size: '1/4', pipeA: '8A', tpi: 19, d: 13.157, d2: 12.301, d1: 11.445, gaugeLength: 6.01, gaugeToleranceExternal: 1.34, gaugeToleranceInternal: 1.67, usefulExternalFromGauge: 3.7, usefulExternal: 9.7, usefulInternalRc: 9.4 },
  { size: '3/8', pipeA: '10A', tpi: 19, d: 16.662, d2: 15.806, d1: 14.95, gaugeLength: 6.35, gaugeToleranceExternal: 1.34, gaugeToleranceInternal: 1.67, usefulExternalFromGauge: 3.7, usefulExternal: 10.1, usefulInternalRc: 9.7 },
  { size: '1/2', pipeA: '15A', tpi: 14, d: 20.955, d2: 19.793, d1: 18.631, gaugeLength: 8.16, gaugeToleranceExternal: 1.81, gaugeToleranceInternal: 2.27, usefulExternalFromGauge: 5.0, usefulExternal: 13.2, usefulInternalRc: 12.7 },
  { size: '3/4', pipeA: '20A', tpi: 14, d: 26.441, d2: 25.279, d1: 24.117, gaugeLength: 9.53, gaugeToleranceExternal: 1.81, gaugeToleranceInternal: 2.27, usefulExternalFromGauge: 5.0, usefulExternal: 14.5, usefulInternalRc: 14.1 },
  { size: '1', pipeA: '25A', tpi: 11, d: 33.249, d2: 31.77, d1: 30.291, gaugeLength: 10.39, gaugeToleranceExternal: 2.31, gaugeToleranceInternal: 2.89, usefulExternalFromGauge: 6.4, usefulExternal: 16.8, usefulInternalRc: 16.2 },
  { size: '1 1/4', pipeA: '32A', tpi: 11, d: 41.91, d2: 40.431, d1: 38.952, gaugeLength: 12.7, gaugeToleranceExternal: 2.31, gaugeToleranceInternal: 2.89, usefulExternalFromGauge: 6.4, usefulExternal: 19.1, usefulInternalRc: 18.5 },
  { size: '1 1/2', pipeA: '40A', tpi: 11, d: 47.803, d2: 46.324, d1: 44.845, gaugeLength: 12.7, gaugeToleranceExternal: 2.31, gaugeToleranceInternal: 2.89, usefulExternalFromGauge: 6.4, usefulExternal: 19.1, usefulInternalRc: 18.5 },
  { size: '2', pipeA: '50A', tpi: 11, d: 59.614, d2: 58.135, d1: 56.656, gaugeLength: 15.88, gaugeToleranceExternal: 2.31, gaugeToleranceInternal: 2.89, usefulExternalFromGauge: 7.5, usefulExternal: 23.4, usefulInternalRc: 22.8 },
  { size: '2 1/2', pipeA: '65A', tpi: 11, d: 75.184, d2: 73.705, d1: 72.226, gaugeLength: 17.46, gaugeToleranceExternal: 3.46, gaugeToleranceInternal: 3.46, usefulExternalFromGauge: 9.2, usefulExternal: 26.7, usefulInternalRc: 26.7 },
  { size: '3', pipeA: '80A', tpi: 11, d: 87.884, d2: 86.405, d1: 84.926, gaugeLength: 20.64, gaugeToleranceExternal: 3.46, gaugeToleranceInternal: 3.46, usefulExternalFromGauge: 9.2, usefulExternal: 29.8, usefulInternalRc: 29.8 },
  { size: '4', pipeA: '100A', tpi: 11, d: 113.03, d2: 111.551, d1: 110.072, gaugeLength: 25.4, gaugeToleranceExternal: 3.46, gaugeToleranceInternal: 3.46, usefulExternalFromGauge: 10.4, usefulExternal: 35.8, usefulInternalRc: 35.8 },
  { size: '5', pipeA: '125A', tpi: 11, d: 138.43, d2: 136.951, d1: 135.472, gaugeLength: 28.58, gaugeToleranceExternal: 3.46, gaugeToleranceInternal: 3.46, usefulExternalFromGauge: 11.5, usefulExternal: 40.1, usefulInternalRc: 40.1 },
  { size: '6', pipeA: '150A', tpi: 11, d: 163.83, d2: 162.351, d1: 160.872, gaugeLength: 28.58, gaugeToleranceExternal: 3.46, gaugeToleranceInternal: 3.46, usefulExternalFromGauge: 11.5, usefulExternal: 40.1, usefulInternalRc: 40.1 },
]

/**
 * 管用平行ねじ G のめねじ内径 D1 の公差（上の寸法許容差、下は0）[mm]。山数ごと。
 * JIS B 0202:1999 付表2 寸法許容差（ISO 228-1 と同じ値）。D1 の公差は山数だけで決まる（G1〜G6 の 11山はすべて +0.640）
 */
export const G_INTERNAL_MINOR_TOLERANCE: Readonly<Record<number, number>> = {
  28: 0.282,
  19: 0.445,
  14: 0.541,
  11: 0.64,
}

/** 典拠の表（表番号と表題は原文のとおり） */
export const PIPE_THREAD_TABLES = {
  /** JIS B 0203:1999 の基準寸法・基準の長さ・有効ねじ部の長さ・許容差 b・c */
  taper: '付表1 基準山形，基準寸法及び寸法許容差',
  /** JIS B 0202:1999 の G の基準寸法 */
  parallel: '付表1 基準山形及び基準寸法',
  /** JIS B 0202:1999 の G の寸法許容差（めねじ内径 D1 の公差） */
  parallelTolerance: '付表2 寸法許容差',
} as const

export type PipeThreadKind = 'R' | 'Rc' | 'Rp' | 'G'

export const THREAD_KINDS: Record<
  PipeThreadKind,
  { name: string; old: string; description: string; standard: 'JIS B 0203' | 'JIS B 0202' }
> = {
  R: { name: '管用テーパおねじ', old: 'PT', description: '継手・バルブにねじ込む側（管の外側）', standard: 'JIS B 0203' },
  Rc: { name: '管用テーパめねじ', old: 'PT', description: 'R と組み合わせる、テーパの付いた内側のねじ', standard: 'JIS B 0203' },
  Rp: { name: '管用平行めねじ', old: 'PS', description: 'R と組み合わせる、平行な内側のねじ', standard: 'JIS B 0203' },
  G: { name: '管用平行ねじ', old: 'PF', description: '機械的な結合用。気密はパッキン・Oリングで取る', standard: 'JIS B 0202' },
}
