import { describe, expect, it } from 'vitest'
import { DEFAULT_INPUT as TAP_DRILL_DEFAULTS, normalizeTapDrillInput } from '../features/tap-drill/input'
import { fromQuery, stateQuery, toolHref, toQuery } from './query'

const defaults = { d: 10, p: 1.5, grade: 6, drill: '' }

describe('toQuery / fromQuery', () => {
  it('既定値と違う項目だけを書き出す', () => {
    expect(toQuery(defaults, defaults)).toBe('')
    expect(toQuery({ ...defaults, d: 12, p: 1.75 }, defaults)).toBe('d=12&p=1.75')
    expect(toQuery({ ...defaults, drill: '10.2' }, defaults)).toBe('drill=10.2')
  })

  it('クエリから復元し、型を既定値に合わせる', () => {
    expect(fromQuery('?d=12&p=1.75', defaults)).toEqual({
      state: { d: 12, p: 1.75, grade: 6, drill: '' },
      keys: ['d', 'p'],
    })
    expect(fromQuery('drill=8.5', defaults)?.state).toEqual({ ...defaults, drill: '8.5' })
  })

  it('知らないキーだけなら null、数値にならない値も null', () => {
    expect(fromQuery('', defaults)).toBeNull()
    expect(fromQuery('?utm_source=line', defaults)).toBeNull()
    expect(fromQuery('?d=abc', defaults)).toBeNull()
    expect(fromQuery('?d=', defaults)).toBeNull()
  })

  it('往復で元に戻る', () => {
    const state = { d: 3, p: 0.5, grade: 5, drill: '2.5' }
    expect(fromQuery(toQuery(state, defaults), defaults)?.state).toEqual(state)
  })
})

describe('toolHref', () => {
  it('条件付きのリンクを作る', () => {
    expect(toolHref('/tap-drill')).toBe('/tap-drill')
    expect(toolHref('/tap-drill', { d: 12, p: 1.75 })).toBe('/tap-drill?d=12&p=1.75')
    expect(toolHref('/pipe-thread', { size: '1 1/2' })).toBe('/pipe-thread?size=1+1%2F2')
  })
})

describe('stateQuery', () => {
  // d だけ指定されたら、ピッチをそのサイズの最初の値（並目）にする補完
  const coarse: Record<number, number> = { 10: 1.5, 12: 1.75, 16: 2 }
  const normalize = (state: typeof defaults, keys: readonly (keyof typeof defaults)[]) =>
    keys.includes('d') && !keys.includes('p') ? { ...state, p: coarse[state.d] ?? state.p } : state
  const restore = (query: string) => {
    const parsed = fromQuery(query, defaults)!
    return normalize(parsed.state, parsed.keys)
  }

  it('補完で変わらなければ、既定値と違う項目だけを書く', () => {
    expect(stateQuery({ ...defaults, d: 12, p: 1.75 }, defaults, normalize)).toBe('d=12&p=1.75')
    expect(stateQuery({ ...defaults, d: 16, p: 2 }, defaults, normalize)).toBe('d=16&p=2')
    expect(stateQuery(defaults, defaults, normalize)).toBe('')
  })

  it('既定値と同じでも、省くと補完で変わってしまう項目は書く', () => {
    const state = { ...defaults, d: 16, p: 1.5 }
    const query = stateQuery(state, defaults, normalize)
    expect(query).toBe('d=16&p=1.5')
    expect(restore(query)).toEqual(state)
  })

  it('normalize が無ければ toQuery と同じ', () => {
    expect(stateQuery({ ...defaults, d: 16, p: 1.5 }, defaults)).toBe('d=16')
  })

  it('ねじ下穴径: 細目 M16×1.5 を開き直しても細目のまま', () => {
    const state = { ...TAP_DRILL_DEFAULTS, d: 16, p: 1.5 }
    const query = stateQuery(state, TAP_DRILL_DEFAULTS, normalizeTapDrillInput)
    const parsed = fromQuery(query, TAP_DRILL_DEFAULTS)!
    expect(normalizeTapDrillInput(parsed.state, parsed.keys)).toEqual(state)
  })
})
