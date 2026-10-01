import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readStored, resetStoredForTest, subscribeStored, writeStored } from './usePersistentState'

/** ブラウザの localStorage と、別のタブからの storage イベントの代わり */
function fakeWindow(options: { broken?: boolean } = {}) {
  const store = new Map<string, string>()
  const target = new EventTarget()
  const localStorage = {
    getItem: (key: string) => {
      if (options.broken) throw new Error('SecurityError')
      return store.get(key) ?? null
    },
    setItem: (key: string, value: string) => {
      if (options.broken) throw new Error('QuotaExceededError')
      store.set(key, value)
    },
  }
  /** 別のタブが保存したときのように、保存領域を書き換えて storage イベントを送る */
  const otherTabWrites = (key: string, value: string) => {
    store.set(key, value)
    target.dispatchEvent(Object.assign(new Event('storage'), { key, newValue: value }))
  }
  return {
    window: {
      localStorage,
      addEventListener: target.addEventListener.bind(target),
      removeEventListener: target.removeEventListener.bind(target),
    },
    store,
    otherTabWrites,
  }
}

describe('usePersistentState の保存', () => {
  beforeEach(() => resetStoredForTest())
  afterEach(() => vi.unstubAllGlobals())

  it('最初は端末に保存した値から始まる', () => {
    const fake = fakeWindow()
    fake.store.set('sakutto-jis:tap-drill', '{"d":12}')
    vi.stubGlobal('window', fake.window)
    expect(readStored('sakutto-jis:tap-drill')).toBe('{"d":12}')
    expect(readStored('sakutto-jis:other')).toBeNull()
  })

  it('このページで保存した値は、同じキーを使う部品に知らせ、端末にも保存する', () => {
    const fake = fakeWindow()
    vi.stubGlobal('window', fake.window)
    const listener = vi.fn()
    const other = vi.fn()
    subscribeStored('sakutto-jis:tap-drill', listener)
    subscribeStored('sakutto-jis:o-ring', other)
    writeStored('sakutto-jis:tap-drill', '{"d":16}')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(other).not.toHaveBeenCalled()
    expect(readStored('sakutto-jis:tap-drill')).toBe('{"d":16}')
    expect(fake.store.get('sakutto-jis:tap-drill')).toBe('{"d":16}')
  })

  it('別のタブで同じツールの条件を変えても、このページの値は変わらない', () => {
    const fake = fakeWindow()
    fake.store.set('sakutto-jis:tap-drill', '{"d":12}')
    vi.stubGlobal('window', fake.window)
    const listener = vi.fn()
    subscribeStored('sakutto-jis:tap-drill', listener)
    expect(readStored('sakutto-jis:tap-drill')).toBe('{"d":12}')

    fake.otherTabWrites('sakutto-jis:tap-drill', '{"d":16}')
    expect(listener).not.toHaveBeenCalled()
    // 何かのきっかけで描画し直しても、このページの値のまま
    expect(readStored('sakutto-jis:tap-drill')).toBe('{"d":12}')
  })

  it('crossTab を指定したキーだけは、別のタブの変更に合わせる（文字の大きさなど）', () => {
    const fake = fakeWindow()
    fake.store.set('sakutto-jis:text-size', '"md"')
    vi.stubGlobal('window', fake.window)
    const listener = vi.fn()
    const unsubscribe = subscribeStored('sakutto-jis:text-size', listener, true)
    expect(readStored('sakutto-jis:text-size')).toBe('"md"')

    fake.otherTabWrites('sakutto-jis:tap-drill', '{"d":16}')
    expect(listener).not.toHaveBeenCalled()
    fake.otherTabWrites('sakutto-jis:text-size', '"lg"')
    expect(listener).toHaveBeenCalledTimes(1)
    expect(readStored('sakutto-jis:text-size')).toBe('"lg"')

    unsubscribe()
    fake.otherTabWrites('sakutto-jis:text-size', '"md"')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('localStorage が使えなくても、このページを開いている間は値を覚えている', () => {
    const fake = fakeWindow({ broken: true })
    vi.stubGlobal('window', fake.window)
    expect(readStored('sakutto-jis:tap-drill')).toBeNull()
    writeStored('sakutto-jis:tap-drill', '{"d":20}')
    expect(readStored('sakutto-jis:tap-drill')).toBe('{"d":20}')
  })
})
