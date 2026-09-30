import { describe, expect, it } from 'vitest'
import { DEFAULT_TOOL_ID, resolveToolId } from './ids'

describe('resolveToolId', () => {
  it('ハッシュからツールIDを取り出す', () => {
    expect(resolveToolId('#tap-drill')).toBe('tap-drill')
    expect(resolveToolId('#/tap-drill')).toBe('tap-drill')
    expect(resolveToolId('#flange-bolt')).toBe('flange-bolt')
  })

  it('空・不明なハッシュは既定のツールになる', () => {
    expect(resolveToolId('')).toBe(DEFAULT_TOOL_ID)
    expect(resolveToolId('#')).toBe(DEFAULT_TOOL_ID)
    expect(resolveToolId('#unknown')).toBe(DEFAULT_TOOL_ID)
  })
})
