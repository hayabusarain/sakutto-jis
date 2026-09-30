import { describe, expect, it } from 'vitest'
import { fromQuery } from '../../lib/query'
import { DEFAULT_INPUT, isGeneralToleranceInput, normalizeInput } from './state'

function fromUrl(search: string) {
  const parsed = fromQuery(search, DEFAULT_INPUT)
  if (!parsed) return null
  return normalizeInput(parsed.state, parsed.keys)
}

describe('URL の条件', () => {
  it('寸法と等級を読む', () => {
    expect(fromUrl('?d=120&cls=f')).toEqual({ ...DEFAULT_INPUT, d: '120', cls: 'f' })
  })

  it('等級は大文字でもよい・不正なら中級 m', () => {
    expect(fromUrl('?cls=M')?.cls).toBe('m')
    expect(fromUrl('?cls=x')?.cls).toBe('m')
  })

  it('角度だけ指定されたら角度の普通公差', () => {
    expect(fromUrl('?angle=45&d=30')).toEqual({ ...DEFAULT_INPUT, kind: 'angle', angle: '45', d: '30' })
    expect(fromUrl('?kind=linear&angle=45')?.kind).toBe('linear')
  })

  it('種類が不正なら長さ', () => {
    expect(fromUrl('?kind=foo')?.kind).toBe('linear')
  })

  it('整えた結果は正しい入力', () => {
    for (const search of ['?d=120&cls=f', '?cls=M', '?angle=45', '?kind=foo', '?kind=chamfer&d=1']) {
      expect(isGeneralToleranceInput(fromUrl(search))).toBe(true)
    }
    expect(isGeneralToleranceInput({ ...DEFAULT_INPUT, cls: 'M' })).toBe(false)
  })
})
