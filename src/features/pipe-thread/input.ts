import { findPipeThread, parsePipeThreadDesignation, parsePipeThreadKind } from './calc'
import { THREAD_KINDS, type PipeThreadKind } from './data'

/** 管用ねじツールの入力（URL のキーも同じ: ?size=1/2&kind=Rc） */
export interface PipeThreadInput {
  size: string
  kind: PipeThreadKind
}

export const DEFAULT_INPUT: PipeThreadInput = { size: '1/2', kind: 'Rc' }

export const KIND_KEYS = Object.keys(THREAD_KINDS) as PipeThreadKind[]

export function isPipeThreadInput(value: unknown): value is PipeThreadInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.size === 'string' &&
    findPipeThread(v.size) !== undefined &&
    KIND_KEYS.includes(v.kind as PipeThreadKind)
  )
}

/**
 * URL の一部指定・表記ゆれを整える。
 * - ?size=15A・?size=1/2B・?size=1-1/4 → 呼び（1/2・1 1/4）に直す
 * - ?size=PT1/2・?size=G1/2 のように種類が付いていて kind の指定が無ければ、kind もそれにする
 * - ?kind=pf・?kind=rc → G・Rc（旧JIS記号・大文字小文字のゆれ）
 * 直せない値はそのまま返す（isPipeThreadInput で弾かれ、前回の条件のまま表示される）。
 */
export function normalizePipeThreadInput(
  state: PipeThreadInput,
  keys: readonly (keyof PipeThreadInput)[],
): PipeThreadInput {
  let { size, kind } = state
  if (keys.includes('kind')) kind = parsePipeThreadKind(String(kind)) ?? kind
  if (keys.includes('size')) {
    const parsed = parsePipeThreadDesignation(String(size))
    if (parsed) {
      size = parsed.size
      if (parsed.kind && !keys.includes('kind')) kind = parsed.kind
    }
  }
  return { size, kind }
}
