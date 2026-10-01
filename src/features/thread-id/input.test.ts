import { describe, expect, it } from 'vitest'
import { fromQuery } from '../../lib/query'
import {
  DEFAULT_INPUT,
  isThreadIdInput,
  normalizeThreadIdInput,
  readMeasurement,
  type ThreadIdInput,
} from './input'

const fromUrl = (search: string) => {
  const parsed = fromQuery(search, DEFAULT_INPUT)!
  return normalizeThreadIdInput(parsed.state, parsed.keys)
}

describe('URL の一部指定', () => {
  it('?dia=20.45&tpi=14 → 山数モード', () => {
    const state = fromUrl('?dia=20.45&tpi=14')
    expect(state).toMatchObject({ side: 'ext', dia: '20.45', mode: 'tpi', tpi: '14' })
    expect(isThreadIdInput(state)).toBe(true)
  })

  it('?dia=11.8&pitch=1.75 → ピッチモード', () => {
    expect(fromUrl('?dia=11.8&pitch=1.75').mode).toBe('pitch')
  })

  it('?len=18.14 → 数えるモード', () => {
    expect(fromUrl('?dia=20.45&len=18.14').mode).toBe('count')
  })

  it('mode が指定されていればそれに従う', () => {
    expect(fromUrl('?mode=pitch&tpi=14').mode).toBe('pitch')
  })

  it('mode が読めないときは指定されたキーから決める', () => {
    expect(fromUrl('?mode=abc&tpi=14').mode).toBe('tpi')
    expect(fromUrl('?mode=abc').mode).toBe('count')
  })

  it('side の表記ゆれ', () => {
    expect(fromUrl('?side=internal').side).toBe('int')
    expect(fromUrl('?side=めねじ').side).toBe('int')
    expect(fromUrl('?side=EXT').side).toBe('ext')
    expect(fromUrl('?side=xyz').side).toBe('ext')
  })
})

const input = (patch: Partial<ThreadIdInput>): ThreadIdInput => ({ ...DEFAULT_INPUT, ...patch })

describe('入力 → 測定値', () => {
  it('未入力なら径もピッチも null、注意も無し', () => {
    const result = readMeasurement(DEFAULT_INPUT)
    expect(result).toMatchObject({ side: 'external', diameter: null, pitch: null, taper: null })
    expect(result.issues).toEqual({})
  })

  it('山を数える: 11山・18.14mm → P 1.814', () => {
    const result = readMeasurement(input({ dia: '20.45', n: '11', len: '18.14' }))
    expect(result.diameter).toBe(20.45)
    expect(result.pitch).toBeCloseTo(1.814, 9)
    expect(result.issues).toEqual({})
  })

  it('全角数字・カンマ小数も読める', () => {
    expect(readMeasurement(input({ dia: '２０，４５' })).diameter).toBe(20.45)
  })

  it('山数・ピッチ', () => {
    expect(readMeasurement(input({ mode: 'tpi', tpi: '14' })).pitch).toBeCloseTo(25.4 / 14, 12)
    expect(readMeasurement(input({ mode: 'pitch', pitch: '1.75' })).pitch).toBe(1.75)
  })

  it('数えた山が少ないと注意（計算はする）', () => {
    const result = readMeasurement(input({ n: '3', len: '3.5' }))
    expect(result.pitch).toBe(1.75)
    expect(result.issues.n?.kind).toBe('warning')
  })

  it('山頂の数が整数でない・1個はエラー', () => {
    expect(readMeasurement(input({ n: '10.5', len: '18' })).issues.n?.kind).toBe('error')
    expect(readMeasurement(input({ n: '1', len: '18' })).pitch).toBeNull()
  })

  it('山数の欄にピッチ(mm)を入れたら、ピッチとして計算し直す提案', () => {
    const issue = readMeasurement(input({ mode: 'tpi', tpi: '1.75' })).issues.tpi
    expect(issue?.kind).toBe('warning')
    expect(issue?.kind === 'warning' && issue.fix?.next).toEqual({ mode: 'pitch', pitch: '1.75', tpi: '' })
  })

  it('ピッチの欄に山数を入れたら、山数として計算し直す提案', () => {
    const issue = readMeasurement(input({ mode: 'pitch', pitch: '14' })).issues.pitch
    expect(issue?.kind === 'warning' && issue.fix?.next).toEqual({ mode: 'tpi', tpi: '14', pitch: '' })
  })

  it('径が数字でない・0以下・大きすぎるときはエラーで計算しない', () => {
    expect(readMeasurement(input({ dia: 'abc' })).issues.dia?.kind).toBe('error')
    expect(readMeasurement(input({ dia: '0' })).diameter).toBeNull()
    expect(readMeasurement(input({ dia: '250' })).diameter).toBeNull()
  })

  it('おねじで2か所の径と間隔があればテーパを判定する', () => {
    const result = readMeasurement(input({ dia: '20.45', dia2: '21.08', gap: '10' }))
    expect(result.taper?.verdict).toBe('taper')
  })

  it('めねじではテーパの入力を使わない', () => {
    expect(readMeasurement(input({ side: 'int', dia: '18.6', dia2: '19', gap: '10' })).taper).toBeNull()
  })
})
