import { describe, expect, it } from 'vitest'
import { fromQuery } from '../../lib/query'
import { DEFAULT_INPUT, isPipeThreadInput, normalizePipeThreadInput } from './input'

const fromUrl = (search: string) => {
  const parsed = fromQuery(search, DEFAULT_INPUT)!
  return normalizePipeThreadInput(parsed.state, parsed.keys)
}

describe('URL の一部指定・表記ゆれ', () => {
  it('?size=3/4 だけなら種類は既定（Rc）', () => {
    expect(fromUrl('?size=3/4')).toEqual({ size: '3/4', kind: 'Rc' })
  })

  it('?size=15A → 1/2', () => {
    expect(fromUrl('?size=15A')).toEqual({ size: '1/2', kind: 'Rc' })
  })

  it('?size=PF1/2 → G1/2（kind の指定が無いとき）', () => {
    expect(fromUrl('?size=PF1/2')).toEqual({ size: '1/2', kind: 'G' })
  })

  it('kind の指定があればそちらを優先', () => {
    expect(fromUrl('?size=PF1/2&kind=R')).toEqual({ size: '1/2', kind: 'R' })
  })

  it('?kind=pf・?kind=rp → G・Rp', () => {
    expect(fromUrl('?kind=pf')).toEqual({ size: '1/2', kind: 'G' })
    expect(fromUrl('?kind=rp')).toEqual({ size: '1/2', kind: 'Rp' })
  })

  it('?size=1-1/4 → 1 1/4', () => {
    expect(fromUrl('?size=1-1/4&kind=R')).toEqual({ size: '1 1/4', kind: 'R' })
  })

  it('直せない値はそのまま（isPipeThreadInput で弾かれる）', () => {
    const state = fromUrl('?size=7/8')
    expect(state.size).toBe('7/8')
    expect(isPipeThreadInput(state)).toBe(false)
    expect(isPipeThreadInput(fromUrl('?kind=X'))).toBe(false)
  })
})
