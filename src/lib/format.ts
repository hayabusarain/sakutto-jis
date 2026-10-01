/** 小数点以下の桁数を固定して表示する（例: 8.376） */
export function fixed(value: number, digits: number): string {
  return value.toFixed(digits)
}

/** 不要な0を落として表示する（例: 1.50 → 1.5、2 → 2） */
export function trim(value: number, maxDigits = 3): string {
  return String(Number(value.toFixed(maxDigits)))
}

/**
 * 数値の入力欄の文字を半角にそろえる（全角数字・全角ピリオド・句点・全角カンマ・各種のマイナス）。
 * カンマはそのまま残す（読み方は resolveCommas で決める）。
 */
export function normalizeDigits(text: string): string {
  return text
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[．。]/g, '.')
    .replace(/，/g, ',')
    .replace(/[－ー−‐–—]/g, '-')
}

/** 3桁区切りとして読む形（1,200・12,500.5・-1,000,000）。先頭が 0 の数（0,125）は3桁区切りにならない */
const THOUSANDS = /^-?[1-9]\d{0,2}(,\d{3})+(\.\d+)?$/

/**
 * カンマの読み方（サイト共通のルール）。
 * - 「先頭が 0 でない1〜3桁」に「,3桁」が続く形（1,200・12,500.5）は3桁区切りとして、カンマを取る
 * - それ以外は、カンマを小数点として読む（0,125 → 0.125、12,5 → 12.5、1,2345 → 1.2345）
 * カンマが2つ以上あって3桁区切りの形でないもの（1,2,3）は小数点が2つになり、数値として読めなくなる。
 * normalizeDigits のあとの文字列に使う。
 */
export function resolveCommas(text: string): string {
  if (!text.includes(',')) return text
  return THOUSANDS.test(text) ? text.replace(/,/g, '') : text.replace(/,/g, '.')
}

/**
 * 入力欄の文字列を数値にする。全角数字・全角ピリオド、3桁区切りのカンマ（1,200）・小数点のカンマ（12,5）にも対応
 * （カンマの読み方は resolveCommas）。数値として読めないときは null。
 */
export function parseNumber(text: string): number | null {
  const normalized = resolveCommas(normalizeDigits(text.trim()))
  if (normalized === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

/**
 * 入力にカンマがあったとき、どう読んだかの説明（入力欄の下に出す）。
 * 例: 「1,200」→「「1,200」は3桁区切りのカンマとして 1200 で計算しています。」
 * カンマが無いとき・数値として読めないときは null。
 */
export function commaNote(text: string): string | null {
  const trimmed = text.trim()
  const normalized = normalizeDigits(trimmed)
  if (!normalized.includes(',') || parseNumber(trimmed) === null) return null
  const kind = THOUSANDS.test(normalized) ? '3桁区切り' : '小数点'
  // 「,5」→ 0.5、「1,」→ 1 のように、読んだ数を普通の書き方で見せる（入力の桁 1,200.50 → 1200.50 は残す）
  const shown = resolveCommas(normalized).replace(/^(-?)\./, '$10.').replace(/\.$/, '')
  return `「${trimmed}」は${kind}のカンマとして ${shown} で計算しています。`
}
