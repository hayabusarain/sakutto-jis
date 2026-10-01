import { describe, expect, it } from 'vitest'
import { fromQuery } from '../../lib/query'
import {
  DEFAULT_INPUT,
  isSteelPipeInput,
  normalizeSteelPipeInput,
  parseSizeA,
  parseSpec,
  type SteelPipeInput,
} from './input'

/** URL のクエリを useToolState と同じ手順で読む */
function fromUrl(search: string): SteelPipeInput | null {
  const query = fromQuery(search, DEFAULT_INPUT)
  if (!query) return null
  const next = normalizeSteelPipeInput(query.state)
  return isSteelPipeInput(next) ? next : null
}

describe('parseSpec', () => {
  it.each([
    ['sgp', 'sgp'],
    ['SGP', 'sgp'],
    ['ＳＧＰ', 'sgp'],
    ['sch40', 'sch40'],
    ['Sch 40', 'sch40'],
    ['STPG370 Sch80', 'sch80'],
    ['80', 'sch80'],
  ])('%s → %s', (raw, spec) => {
    expect(parseSpec(raw)).toBe(spec)
  })

  it('読めないものは null', () => {
    expect(parseSpec('sch10')).toBeNull()
    expect(parseSpec('')).toBeNull()
  })
})

describe('parseSizeA', () => {
  it.each([
    ['50A', '50A'],
    ['50a', '50A'],
    ['５０Ａ', '50A'],
    ['50', '50A'],
    ['2B', '50A'],
    ['2', '50A'],
    ['1 1/2B', '40A'],
    ['1-1/2B', '40A'],
    ['1.1/2', '40A'],
    ['1/2', '15A'],
    ['12', '300A'],
    ['6', '6A'],
  ])('%s → %s', (raw, a) => {
    expect(parseSizeA(raw)).toBe(a)
  })

  it('無い呼び径は null', () => {
    expect(parseSizeA('400A')).toBeNull()
    expect(parseSizeA('16B')).toBeNull()
    expect(parseSizeA('abc')).toBeNull()
  })
})

describe('URL の一部指定', () => {
  it('呼び径だけ: 規格・長さは既定値', () => {
    expect(fromUrl('?a=100A')).toEqual({ ...DEFAULT_INPUT, a: '100A' })
  })

  it('B 呼称・小文字でも読める', () => {
    expect(fromUrl('?a=4B&spec=Sch40')).toEqual({ ...DEFAULT_INPUT, a: '100A', spec: 'sch40' })
  })

  it('Sch40 に無い 175A は近い 150A にする', () => {
    expect(fromUrl('?spec=sch40&a=175A')).toEqual({ ...DEFAULT_INPUT, spec: 'sch40', a: '150A' })
  })

  it('読めない規格・呼び径は既定値にする', () => {
    expect(fromUrl('?spec=sch10&a=999A')).toEqual(DEFAULT_INPUT)
  })

  it('長さ・本数はそのまま渡す（mm らしい長さの注意は画面で出す）', () => {
    expect(fromUrl('?length=5500&count=3')).toEqual({ ...DEFAULT_INPUT, length: '5500', count: '3' })
  })

  it('既定値のキーが無ければ null', () => {
    expect(fromUrl('?foo=1')).toBeNull()
  })
})
