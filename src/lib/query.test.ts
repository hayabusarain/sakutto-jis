import { describe, expect, it } from 'vitest'
import { fromQuery, toolHref, toQuery } from './query'

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
