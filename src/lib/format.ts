/** 小数点以下の桁数を固定して表示する（例: 8.376） */
export function fixed(value: number, digits: number): string {
  return value.toFixed(digits)
}

/** 不要な0を落として表示する（例: 1.50 → 1.5、2 → 2） */
export function trim(value: number, maxDigits = 3): string {
  return String(Number(value.toFixed(maxDigits)))
}

/**
 * 入力欄の文字列を数値にする。全角数字・全角ピリオド・カンマ小数にも対応。
 * 数値として読めないときは null。
 */
export function parseNumber(text: string): number | null {
  const normalized = text
    .trim()
    .replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
    .replace(/[．。,，]/g, '.')
    .replace(/[－ー−]/g, '-')
  if (normalized === '' || !/^-?\d*\.?\d+$|^-?\d+\.$/.test(normalized)) return null
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
