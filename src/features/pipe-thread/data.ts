/**
 * 管用ねじの基準寸法 [mm]。
 * - 管用テーパねじ R・Rc・Rp: JIS B 0203:1999（ISO 7-1）
 * - 管用平行ねじ G: JIS B 0202:1999（ISO 228-1）
 * 基準径（外径 d・有効径 d2・谷径/内径 d1）は、テーパねじでは「基準径の位置」での値で、G と共通。
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
  /** 基準の長さ a（テーパねじ：管端から基準径の位置まで） */
  gaugeLength: number
  /** おねじ R の有効ねじ部の最小長さ（管端から、基準の長さが基準寸法のとき・ISO 7-1） */
  usefulExternal: number
  /** めねじ Rc の有効ねじ部の最小長さ l（不完全ねじ部を含む）。未確認は null */
  usefulInternalRc: number | null
}

export const PIPE_THREAD_SIZES: readonly PipeThreadSize[] = [
  { size: '1/16', pipeA: null, tpi: 28, d: 7.723, d2: 7.142, d1: 6.561, gaugeLength: 3.97, usefulExternal: 6.5, usefulInternalRc: 6.2 },
  { size: '1/8', pipeA: '6A', tpi: 28, d: 9.728, d2: 9.147, d1: 8.566, gaugeLength: 3.97, usefulExternal: 6.5, usefulInternalRc: 6.2 },
  { size: '1/4', pipeA: '8A', tpi: 19, d: 13.157, d2: 12.301, d1: 11.445, gaugeLength: 6.01, usefulExternal: 9.7, usefulInternalRc: 9.4 },
  { size: '3/8', pipeA: '10A', tpi: 19, d: 16.662, d2: 15.806, d1: 14.95, gaugeLength: 6.35, usefulExternal: 10.1, usefulInternalRc: 9.7 },
  { size: '1/2', pipeA: '15A', tpi: 14, d: 20.955, d2: 19.793, d1: 18.631, gaugeLength: 8.16, usefulExternal: 13.2, usefulInternalRc: 12.7 },
  { size: '3/4', pipeA: '20A', tpi: 14, d: 26.441, d2: 25.279, d1: 24.117, gaugeLength: 9.53, usefulExternal: 14.5, usefulInternalRc: 14.1 },
  { size: '1', pipeA: '25A', tpi: 11, d: 33.249, d2: 31.77, d1: 30.291, gaugeLength: 10.39, usefulExternal: 16.8, usefulInternalRc: 16.2 },
  { size: '1 1/4', pipeA: '32A', tpi: 11, d: 41.91, d2: 40.431, d1: 38.952, gaugeLength: 12.7, usefulExternal: 19.1, usefulInternalRc: 18.5 },
  { size: '1 1/2', pipeA: '40A', tpi: 11, d: 47.803, d2: 46.324, d1: 44.845, gaugeLength: 12.7, usefulExternal: 19.1, usefulInternalRc: 18.5 },
  { size: '2', pipeA: '50A', tpi: 11, d: 59.614, d2: 58.135, d1: 56.656, gaugeLength: 15.88, usefulExternal: 23.4, usefulInternalRc: 22.8 },
  { size: '2 1/2', pipeA: '65A', tpi: 11, d: 75.184, d2: 73.705, d1: 72.226, gaugeLength: 17.46, usefulExternal: 26.7, usefulInternalRc: null },
  { size: '3', pipeA: '80A', tpi: 11, d: 87.884, d2: 86.405, d1: 84.926, gaugeLength: 20.64, usefulExternal: 29.8, usefulInternalRc: null },
  { size: '4', pipeA: '100A', tpi: 11, d: 113.03, d2: 111.551, d1: 110.072, gaugeLength: 25.4, usefulExternal: 35.8, usefulInternalRc: null },
  { size: '5', pipeA: '125A', tpi: 11, d: 138.43, d2: 136.951, d1: 135.472, gaugeLength: 28.58, usefulExternal: 40.1, usefulInternalRc: null },
  { size: '6', pipeA: '150A', tpi: 11, d: 163.83, d2: 162.351, d1: 160.872, gaugeLength: 28.58, usefulExternal: 40.1, usefulInternalRc: null },
]

/** 管用平行ねじ G のめねじ内径の公差（上の寸法許容差、下は0）[mm]（ISO 228-1） */
export const G_INTERNAL_MINOR_TOLERANCE: Readonly<Record<number, number>> = {
  28: 0.282,
  19: 0.445,
  14: 0.541,
  11: 0.64,
}

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
