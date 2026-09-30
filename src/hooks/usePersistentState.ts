import { useCallback, useMemo, useSyncExternalStore } from 'react'

// localStorage が使えない環境（プライベートモード等）では、ページを開いている間だけメモリに持つ
const memory = new Map<string, string>()
const listeners = new Set<() => void>()

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    return memory.get(key) ?? null
  }
}

function write(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    memory.set(key, value)
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function parse<T>(raw: string | null, isValid: (value: unknown) => value is T): T | undefined {
  if (raw === null) return undefined
  try {
    const value: unknown = JSON.parse(raw)
    return isValid(value) ? value : undefined
  } catch {
    return undefined
  }
}

/**
 * 前回の入力を覚えておく useState。値はブラウザ内（localStorage）にだけ保存する。
 * 事前レンダリングしたHTMLとの食い違いを防ぐため、サーバー側と表示直後は initialValue を使う。
 * initialValue と isValid は、モジュールの定数など毎回同じものを渡すこと。
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  isValid: (value: unknown) => value is T,
) {
  const storageKey = `sakutto-jis:${key}`

  const raw = useSyncExternalStore(
    subscribe,
    () => read(storageKey),
    () => null,
  )
  const state = useMemo(() => parse(raw, isValid) ?? initialValue, [raw, isValid, initialValue])

  const setState = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = parse(read(storageKey), isValid) ?? initialValue
      const value = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next
      write(storageKey, JSON.stringify(value))
    },
    [storageKey, isValid, initialValue],
  )

  return [state, setState] as const
}
