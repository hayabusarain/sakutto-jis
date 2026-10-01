import { describe, expect, it, vi } from 'vitest'
import { isUpdateAvailable, markUpdateAvailable, subscribeUpdate } from './history'

describe('新しい版の公開', () => {
  it('公開を知らせると、購読している部品に一度だけ知らせ、以後は読み直すようにする', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeUpdate(listener)
    expect(isUpdateAvailable()).toBe(false)
    markUpdateAvailable()
    markUpdateAvailable()
    expect(isUpdateAvailable()).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })
})
