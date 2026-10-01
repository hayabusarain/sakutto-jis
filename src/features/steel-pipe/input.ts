import { nearestAvailableSize, pipeDimensions, PIPE_SPEC_KEYS } from './calc'
import { PIPE_SIZES, type PipeSpec } from './data'

/** 鋼管ツールの入力（URL のクエリのキーと同じ。他のツールからのリンクもこのキーを使う） */
export interface SteelPipeInput {
  spec: PipeSpec
  /** 呼び径（A呼称。例: 50A） */
  a: string
  /** 1本の長さ [m]（入力途中の値も保てるよう文字列） */
  length: string
  count: string
}

export const DEFAULT_INPUT: SteelPipeInput = { spec: 'sgp', a: '50A', length: '5.5', count: '1' }

export function isSteelPipeInput(value: unknown): value is SteelPipeInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    PIPE_SPEC_KEYS.includes(v.spec as PipeSpec) &&
    typeof v.a === 'string' &&
    pipeDimensions(v.spec as PipeSpec, v.a) !== null &&
    typeof v.length === 'string' &&
    typeof v.count === 'string'
  )
}

/** 全角英数字・記号を半角にし、前後の空白を除く */
function toHalfWidth(text: string): string {
  return text.normalize('NFKC').trim()
}

/** 「SGP」「Sch40」「sch 80」「STPG370 Sch40」「40」などを規格のキーにする。読めなければ null */
export function parseSpec(raw: string): PipeSpec | null {
  const text = toHalfWidth(raw).toLowerCase().replace(/[\s_-]/g, '')
  if (text === 'sgp') return 'sgp'
  const match = /^(?:stpg(?:370|410)?)?(?:sch)?(40|80)$/.exec(text)
  if (match) return match[1] === '40' ? 'sch40' : 'sch80'
  return null
}

const byA = (n: string): string | null => PIPE_SIZES.find((size) => size.a === `${Number(n)}A`)?.a ?? null

/** インチの呼び（「1 1/2」「1-1/2」「1.1/2」）を B 呼称の表記に合わせて探す */
const byB = (b: string): string | null => {
  const inch = b.trim().replace(/[-.](?=\d+\/)/, ' ').replace(/\s+/g, ' ')
  return PIPE_SIZES.find((size) => size.b === inch)?.a ?? null
}

/**
 * 呼び径の書き方の揺れを A 呼称にする。読めなければ null。
 * 「50A」「50a」「50」→ 50A、「2B」「2」→ 50A（数字だけなら A を優先し、無ければ B として読む）、
 * 「1-1/2B」「1 1/2B」「1.1/2B」→ 40A
 */
export function parseSizeA(raw: string): string | null {
  const text = toHalfWidth(raw).toUpperCase().replace(/\s+/g, ' ')
  const aMatch = /^(\d+) ?A$/.exec(text)
  if (aMatch) return byA(aMatch[1])
  const bMatch = /^(.+?) ?B$/.exec(text)
  if (bMatch) return byB(bMatch[1])
  if (/^\d+$/.test(text)) return byA(text) ?? byB(text)
  if (/^(?:\d+[ .-])?\d+\/\d+$/.test(text)) return byB(text)
  return null
}

/**
 * URL で一部の項目だけが指定されたときに入力を整える。
 * - 規格・呼び径の書き方の揺れを直す（sch40 → Sch40、2B → 50A など）。読めなければ既定値
 * - その規格に無い呼び径（Sch40 の 175A など）は外径が一番近いサイズにする
 */
export function normalizeSteelPipeInput(state: SteelPipeInput): SteelPipeInput {
  const spec = parseSpec(String(state.spec)) ?? DEFAULT_INPUT.spec
  const parsedA = parseSizeA(String(state.a)) ?? DEFAULT_INPUT.a
  const a = nearestAvailableSize(spec, parsedA) ?? DEFAULT_INPUT.a
  return {
    spec,
    a,
    length: String(state.length),
    count: String(state.count),
  }
}
