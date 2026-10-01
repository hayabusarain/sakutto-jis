import { describe, expect, it } from 'vitest'
import { fromQuery } from '../../lib/query'
import { DEFAULT_INPUT, isTapDrillInput, normalizeTapDrillInput, type TapDrillInput } from './input'

/** URL のクエリを useToolState と同じ手順で読む */
function fromUrl(search: string): TapDrillInput | null {
  const query = fromQuery(search, DEFAULT_INPUT)
  if (!query) return null
  const next = normalizeTapDrillInput(query.state, query.keys)
  return isTapDrillInput(next) ? next : null
}

describe('normalizeTapDrillInput（URL の一部指定）', () => {
  it('呼び径だけなら並目のピッチ', () => {
    expect(fromUrl('?d=12')).toEqual({ d: 12, p: 1.75, grade: 6, drill: '' })
    expect(fromUrl('?d=20')).toMatchObject({ d: 20, p: 2.5 })
  })

  it('並目の無いサイズは最初の細目', () => {
    expect(fromUrl('?d=15')).toMatchObject({ d: 15, p: 1.5 })
  })

  it('そのサイズに無いピッチは並目に直す', () => {
    expect(fromUrl('?d=12&p=2')).toMatchObject({ d: 12, p: 1.75 })
  })

  it('細目の指定はそのまま', () => {
    expect(fromUrl('?d=12&p=1.25')).toMatchObject({ d: 12, p: 1.25, grade: 6 })
    expect(fromUrl('?p=1.25')).toMatchObject({ d: 10, p: 1.25 })
  })

  it('等級を指定していなければ、規定のある等級にする', () => {
    expect(fromUrl('?d=1')).toEqual({ d: 1, p: 0.25, grade: 5, drill: '' })
    expect(fromUrl('?d=1&p=0.2')).toMatchObject({ grade: 4 })
  })

  it('等級の指定は、規格にある等級ならそのまま', () => {
    expect(fromUrl('?d=12&grade=7')).toMatchObject({ grade: 7 })
    expect(fromUrl('?d=1&grade=6')).toMatchObject({ grade: 6 })
  })

  it('規格に無い等級は 6H（規定が無ければ規定のある等級）', () => {
    expect(fromUrl('?d=12&grade=9')).toMatchObject({ grade: 6 })
    expect(fromUrl('?d=1&grade=9')).toMatchObject({ grade: 5 })
  })

  it('ドリル径は文字列のまま', () => {
    expect(fromUrl('?d=12&drill=10.2')).toMatchObject({ d: 12, p: 1.75, drill: '10.2' })
  })

  it('規格に無い呼び径は使わない', () => {
    expect(fromUrl('?d=13')).toBeNull()
    expect(fromUrl('?d=abc')).toBeNull()
  })

  it('既定値は正しい入力', () => {
    expect(isTapDrillInput(DEFAULT_INPUT)).toBe(true)
  })
})
