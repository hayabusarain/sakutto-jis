import { describe, expect, it } from 'vitest'
import { fromQuery, toQuery } from '../../lib/query'
import { DEFAULT_INPUT, inputFor, isUnitConvertInput, normalizeInput } from './state'

function fromUrl(search: string) {
  const parsed = fromQuery(search, DEFAULT_INPUT)
  if (!parsed) return null
  return normalizeInput(parsed.state, parsed.keys)
}

describe('URL の条件', () => {
  it('既定は 1 kgf/cm² → MPa（ゲージ圧）', () => {
    expect(DEFAULT_INPUT).toEqual({ q: 'pressure', v: '1', from: 'kgfcm2', to: 'MPa', ref: 'gauge' })
    expect(isUnitConvertInput(DEFAULT_INPUT)).toBe(true)
  })

  it('値と単位を読む', () => {
    expect(fromUrl('?v=10&from=psi&to=kPa')).toEqual({ ...DEFAULT_INPUT, v: '10', from: 'psi', to: 'kPa' })
  })

  it('量だけ指定されたら、その量の既定の単位にする', () => {
    expect(fromUrl('?q=torque')).toEqual({ ...DEFAULT_INPUT, q: 'torque', from: 'kgfm', to: 'Nm' })
    expect(fromUrl('?q=length&v=1-1/4')).toEqual({ ...DEFAULT_INPUT, q: 'length', v: '1-1/4', from: 'in', to: 'mm' })
  })

  it('単位だけ指定されたら量を合わせる', () => {
    expect(fromUrl('?from=lbfft')).toEqual({ ...DEFAULT_INPUT, q: 'torque', from: 'lbfft', to: 'Nm' })
    expect(fromUrl('?from=Nm')).toEqual({ ...DEFAULT_INPUT, q: 'torque', from: 'Nm', to: 'kgfm' })
    // 換算先だけ °F（温度の既定の入力単位）→ 入力を °C にして、°F を換算先に残す
    expect(fromUrl('?to=F')).toEqual({ ...DEFAULT_INPUT, q: 'temperature', from: 'C', to: 'F' })
    expect(fromUrl('?to=psi')).toEqual({ ...DEFAULT_INPUT, to: 'psi' })
  })

  it('量と合わない単位・同じ単位は直す', () => {
    expect(fromUrl('?q=force&from=psi')).toEqual({ ...DEFAULT_INPUT, q: 'force', from: 'kgf', to: 'N' })
    expect(fromUrl('?from=MPa&to=MPa')).toEqual({ ...DEFAULT_INPUT, from: 'MPa', to: 'kgfcm2' })
    expect(fromUrl('?q=xyz')?.q).toBe('pressure')
    expect(fromUrl('?ref=abs')?.ref).toBe('abs')
    expect(fromUrl('?ref=foo')?.ref).toBe('gauge')
  })

  it('整えた結果は正しい入力で、URL に戻せる', () => {
    for (const search of ['?q=torque', '?from=lbfft', '?q=force&from=psi', '?from=MPa&to=MPa', '?q=xyz', '?to=F']) {
      const state = fromUrl(search)
      expect(isUnitConvertInput(state)).toBe(true)
      expect(fromUrl(`?${toQuery(state!, DEFAULT_INPUT)}`) ?? DEFAULT_INPUT).toEqual(state)
    }
  })

  it('解説のリンク用の入力', () => {
    expect(inputFor('length', '1-1/4', 'in', 'mm')).toEqual({
      q: 'length',
      v: '1-1/4',
      from: 'in',
      to: 'mm',
      ref: 'gauge',
    })
  })
})
