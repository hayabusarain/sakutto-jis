import {
  G_INTERNAL_MINOR_TOLERANCE,
  PIPE_THREAD_SIZES,
  type PipeThreadKind,
  type PipeThreadSize,
} from './data'

/** テーパ 1/16：直径は軸方向の長さ x に対して x/16 変化する */
export const TAPER = 1 / 16

export function findPipeThread(size: string): PipeThreadSize | undefined {
  return PIPE_THREAD_SIZES.find((s) => s.size === size)
}

/** ピッチ P = 25.4 ÷ 山数 */
export function pitch(tpi: number): number {
  return 25.4 / tpi
}

/** ねじ山の高さ h = 0.640327P（管用ねじの基準山形） */
export function threadHeight(tpi: number): number {
  return 0.640327 * pitch(tpi)
}

const round3 = (value: number) => Math.round(value * 1000) / 1000

/** G めねじ内径の許容範囲 D1 〜 D1 + T_D1 */
export function gMinorLimits(thread: PipeThreadSize) {
  const tolerance = G_INTERNAL_MINOR_TOLERANCE[thread.tpi]
  return { min: thread.d1, max: round3(thread.d1 + tolerance) }
}

/** G の推奨下穴径：許容範囲の中央に最も近い 0.1mm 刻みの径 */
export function gRecommendedDrill(thread: PipeThreadSize): number {
  const { min, max } = gMinorLimits(thread)
  const mid = (min + max) / 2
  const candidate = Math.round(mid * 10) / 10
  // 丸めで範囲外に出ることは無いが、念のため範囲内に収める
  return Math.min(Math.max(candidate, Math.ceil(min * 10) / 10), Math.floor(max * 10) / 10)
}

/**
 * Rc の有効ねじ部の奥端でのめねじ内径 = D1 − l/16。
 * テーパめねじは奥ほど細くなる。テーパリーマで下穴を仕上げるときの径の目安になる。
 */
export function rcInnerMinorDiameter(thread: PipeThreadSize): number | null {
  if (thread.usefulInternalRc === null) return null
  return round3(thread.d1 - thread.usefulInternalRc * TAPER)
}

/**
 * R（おねじ）の管端での外径 = d − a/16 [mm]。
 * 基準径の位置は管端から a の位置にあり、管端に向かって細くなる。ノギスで管端の山を測るとこの値に近い。
 */
export function rPipeEndDiameter(thread: PipeThreadSize): number {
  return round3(thread.d - thread.gaugeLength * TAPER)
}

/**
 * R（おねじ）の有効ねじ部の最小長さを管端から測った値 a + f [mm]（a が基準寸法のとき。0.1mm に丸める）。
 * JIS B 0203 付表1 に載っているのは f（基準径の位置から大径側への長さ）だけなので、a を足した計算値。
 * 0.01mm 単位の整数で足してから丸める（3/8: 6.35 + 3.7 = 10.05 → 10.1）
 */
export function rUsefulLengthFromPipeEnd(thread: PipeThreadSize): number {
  const hundredths = Math.round(thread.gaugeLength * 100) + Math.round(thread.usefulExternalFromGauge * 100)
  return Math.round(hundredths / 10) / 10
}

/** R（おねじ）の有効ねじ部の端（管端から有効ねじ部の最小長さの位置）での外径 = d + (有効ねじ部 − a)/16 [mm] */
export function rUsefulEndDiameter(thread: PipeThreadSize): number {
  return round3(thread.d + (thread.usefulExternal - thread.gaugeLength) * TAPER)
}

/** 旧JIS記号と今のJIS記号の対応。PT は R・Rc の両方にあたるが、寸法を調べることが多いめねじ Rc にする */
const KIND_ALIASES: Readonly<Record<string, PipeThreadKind>> = {
  R: 'R',
  RC: 'Rc',
  RP: 'Rp',
  G: 'G',
  PT: 'Rc',
  PS: 'Rp',
  PF: 'G',
}

const toHalfWidth = (text: string) =>
  text.replace(/[０-９Ａ-Ｚａ-ｚ／]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))

/** ねじの種類の表記ゆれを直す（例: rc → Rc、PF → G）。読めなければ null */
export function parsePipeThreadKind(text: string): PipeThreadKind | null {
  return KIND_ALIASES[toHalfWidth(text).trim().toUpperCase()] ?? null
}

/**
 * ねじの呼びの表記ゆれを読み取る（URL の手入力など）。
 * 例: "1/2" "1/2B" "15A" "R1/2" "PT1/2" "G 1-1/4" "G1/2A" → { size, kind }（種類の指定が無ければ kind は null）。
 * 読めなければ null。
 */
export function parsePipeThreadDesignation(
  text: string,
): { size: string; kind: PipeThreadKind | null } | null {
  const normalized = toHalfWidth(text).trim().replace(/\s+/g, ' ')

  // 管の呼び径（A呼称）: 15A → 1/2
  const pipeA = /^(\d+)\s*A$/i.exec(normalized)
  if (pipeA) {
    const byPipe = PIPE_THREAD_SIZES.find((s) => s.pipeA === `${pipeA[1]}A`)
    return byPipe ? { size: byPipe.size, kind: null } : null
  }

  const match = /^([A-Za-z]{1,2})?\s*(\d[\d/ .・-]*?)\s*([AB])?$/i.exec(normalized)
  if (!match) return null
  const [, prefix, body, suffix] = match
  const kind = prefix ? (KIND_ALIASES[prefix.toUpperCase()] ?? null) : null
  if (prefix && kind === null) return null
  // 末尾の A・B は G おねじの等級、B は B呼称（1/2B）。それ以外の組み合わせは読まない
  if (suffix && suffix.toUpperCase() === 'A' && kind !== 'G') return null
  if (suffix && suffix.toUpperCase() === 'B' && kind !== 'G' && kind !== null) return null

  const size = body.trim().replace(/^(\d+)[-.・ ](\d+\/\d+)$/, '$1 $2') // 1-1/4・1.1/4 → 1 1/4
  const found = PIPE_THREAD_SIZES.find((s) => s.size === size)
  return found ? { size: found.size, kind } : null
}

/** 図面に書くねじの呼び（例: R1/2・Rc1/2・G1/2）。G のおねじには有効径の公差の等級 A・B を付ける（G1/2A） */
export function pipeThreadDesignation(kind: PipeThreadKind, size: string, gExternalClass?: 'A' | 'B'): string {
  return `${kind}${size}${kind === 'G' && gExternalClass ? gExternalClass : ''}`
}

/** G めねじの呼びに、計算した推奨下穴径を添えた注記（例: G1/2 下穴φ18.9） */
export function gInternalCalloutWithDrill(thread: PipeThreadSize): string {
  return `${pipeThreadDesignation('G', thread.size)} 下穴φ${gRecommendedDrill(thread).toFixed(1)}`
}
