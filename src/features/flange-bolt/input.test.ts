import { describe, expect, it } from 'vitest'
import { fromQuery } from '../../lib/query'
import {
  DEFAULT_INPUT,
  isFlangeInput,
  normalizeFlangeInput,
  parsePressure,
  parseSize,
  type FlangeInput,
} from './input'

/** URL のクエリから、ツールと同じ手順（fromQuery → normalize → isValid）で入力を作る */
function fromUrl(search: string): FlangeInput | null {
  const parsed = fromQuery(search, DEFAULT_INPUT)
  if (!parsed) return null
  const next = normalizeFlangeInput(parsed.state, parsed.keys)
  return isFlangeInput(next) ? next : null
}

describe('parsePressure / parseSize', () => {
  it('表記ゆれを直す', () => {
    expect(parsePressure('10k')).toBe('10K')
    expect(parsePressure(' 20 ')).toBe('20K')
    expect(parsePressure('30K')).toBeNull()
    expect(parseSize('50')).toBe('50A')
    expect(parseSize('50a')).toBe('50A')
    expect(parseSize('2B')).toBe('50A')
    expect(parseSize('1 1/2B')).toBe('40A')
    expect(parseSize('1-1/2B')).toBe('40A')
    expect(parseSize('350A')).toBeNull()
    expect(parseSize('abc')).toBeNull()
  })
})

describe('normalizeFlangeInput（URL の一部指定）', () => {
  it('既定のままの条件はそのまま', () => {
    expect(normalizeFlangeInput(DEFAULT_INPUT, [])).toEqual(DEFAULT_INPUT)
  })

  it('呼び径だけ・圧力だけの指定', () => {
    expect(fromUrl('?size=100a')).toEqual({ ...DEFAULT_INPUT, size: '100A' })
    expect(fromUrl('?pressure=20k')).toEqual({ ...DEFAULT_INPUT, pressure: '20K' })
    expect(fromUrl('?size=4B')).toEqual({ ...DEFAULT_INPUT, size: '100A' })
  })

  it('そのクラスに無い呼び径は最も近い呼び径にする（16K 175A → 200A）', () => {
    expect(fromUrl('?pressure=16K&size=175A')).toEqual({ ...DEFAULT_INPUT, pressure: '16K', size: '200A' })
    expect(fromUrl('?pressure=20K&size=90A')).toEqual({ ...DEFAULT_INPUT, pressure: '20K', size: '100A' })
  })

  it('読めない値は既定値に戻し、山数は 1〜5 に収める', () => {
    expect(fromUrl('?pressure=30K&size=xyz&type=foo&nut=bar&rounding=1mm')).toEqual(DEFAULT_INPUT)
    expect(fromUrl('?threads=8')).toEqual({ ...DEFAULT_INPUT, threads: 5 })
    expect(fromUrl('?threads=0')).toEqual({ ...DEFAULT_INPUT, threads: 1 })
    expect(fromUrl('?threads=2.4')).toEqual({ ...DEFAULT_INPUT, threads: 2 })
    expect(fromUrl('?washers=3')).toEqual(DEFAULT_INPUT)
  })

  it('他のツールからのリンク（全項目）', () => {
    expect(
      fromUrl('?pressure=5K&size=80A&type=stud&gasket=1.5&nut=ja1&washers=2&threads=2&t2=20&rounding=jis&bore=0'),
    ).toEqual({
      pressure: '5K',
      size: '80A',
      type: 'stud',
      gasket: '1.5',
      nut: 'ja1',
      washers: 2,
      threads: 2,
      t2: '20',
      rounding: 'jis',
      bore: '0',
    })
  })
})

describe('isFlangeInput', () => {
  it('圧力に無い呼び径・範囲外の山数は無効', () => {
    expect(isFlangeInput(DEFAULT_INPUT)).toBe(true)
    expect(isFlangeInput({ ...DEFAULT_INPUT, pressure: '16K', size: '175A' })).toBe(false)
    expect(isFlangeInput({ ...DEFAULT_INPUT, threads: 9 })).toBe(false)
    expect(isFlangeInput(null)).toBe(false)
  })
})
