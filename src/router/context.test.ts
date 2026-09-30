import { describe, expect, it } from 'vitest'
import { normalizePath } from './context'

describe('normalizePath', () => {
  it('末尾スラッシュ・.html・index を取り除く', () => {
    expect(normalizePath('/')).toBe('/')
    expect(normalizePath('')).toBe('/')
    expect(normalizePath('/tap-drill')).toBe('/tap-drill')
    expect(normalizePath('/tap-drill/')).toBe('/tap-drill')
    expect(normalizePath('/tap-drill.html')).toBe('/tap-drill')
    expect(normalizePath('/index.html')).toBe('/')
  })
})
