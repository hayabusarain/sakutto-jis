import { useCallback, useMemo, useSyncExternalStore } from 'react'

/**
 * このページで使っている値（キーごと）。最初に読んだときに localStorage から取り、以後はこのページの書き込みだけで変わる。
 * 別のタブで同じツールを違う条件で開いても、こちらの表示と URL が勝手に書き換わらないようにするため
 * （例: M12 と M16×1.5 のリンクを2つのタブで開いて見比べる）。新しく開いたタブは前回保存した値から始まる。
 * localStorage が使えない環境（プライベートモード等）でも、ページを開いている間はここに残る。
 */
const pageCache = new Map<string, string | null>()
const listeners = new Map<string, Set<() => void>>()

/** 保存した値（JSON の文字列）を読む。無ければ null */
export function readStored(key: string): string | null {
  if (pageCache.has(key)) return pageCache.get(key) ?? null
  let value: string | null = null
  try {
    value = window.localStorage.getItem(key)
  } catch {
    // localStorage が使えない
  }
  pageCache.set(key, value)
  return value
}

function notify(key: string) {
  listeners.get(key)?.forEach((listener) => listener())
}

/** 値を保存し、このページで同じキーを使っている部品に知らせる */
export function writeStored(key: string, value: string) {
  pageCache.set(key, value)
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // 容量オーバーやプライベートモードなど。このページを開いている間は pageCache に残る
  }
  notify(key)
}

/**
 * 同じキーの変化を受け取る。crossTab なら、別のタブでの保存（storage イベント）にも合わせる。
 * 戻り値は購読の解除。
 */
export function subscribeStored(key: string, listener: () => void, crossTab = false): () => void {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(listener)

  const onStorage = (event: StorageEvent) => {
    // key が null なのは別のタブで全部消されたとき
    if (event.key !== null && event.key !== key) return
    pageCache.set(key, event.key === null ? null : event.newValue)
    notify(key)
  }
  if (crossTab) window.addEventListener('storage', onStorage)

  return () => {
    set.delete(listener)
    if (crossTab) window.removeEventListener('storage', onStorage)
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

export interface PersistentStateOptions {
  /**
   * 別のタブで変えた値にも合わせるか（既定: しない）。
   * 文字の大きさなど、どのタブでもそろっていてほしい表示の設定だけで使う。
   * ツールの入力（条件）では使わない（タブごとに違う条件を見比べられるように）。
   */
  crossTab?: boolean
}

/**
 * 前回の入力を覚えておく useState。値はブラウザ内（localStorage）にだけ保存する。
 * 事前レンダリングしたHTMLとの食い違いを防ぐため、サーバー側と表示直後は initialValue を使う。
 * initialValue と isValid は、モジュールの定数など毎回同じものを渡すこと。
 * 同じページの中では、同じ key を使う部品どうしで値が共有される（解説のリンクから入力を変えるときなど）。
 */
export function usePersistentState<T>(
  key: string,
  initialValue: T,
  isValid: (value: unknown) => value is T,
  options: PersistentStateOptions = {},
) {
  const storageKey = `sakutto-jis:${key}`
  const crossTab = options.crossTab ?? false

  const subscribe = useCallback(
    (listener: () => void) => subscribeStored(storageKey, listener, crossTab),
    [storageKey, crossTab],
  )
  const raw = useSyncExternalStore(
    subscribe,
    () => readStored(storageKey),
    () => null,
  )
  const state = useMemo(() => parse(raw, isValid) ?? initialValue, [raw, isValid, initialValue])

  const setState = useCallback(
    (next: T | ((previous: T) => T)) => {
      const previous = parse(readStored(storageKey), isValid) ?? initialValue
      const value = typeof next === 'function' ? (next as (previous: T) => T)(previous) : next
      writeStored(storageKey, JSON.stringify(value))
    },
    [storageKey, isValid, initialValue],
  )

  return [state, setState] as const
}

/** テスト用: このページで読んだ値を忘れる */
export function resetStoredForTest() {
  pageCache.clear()
  listeners.clear()
}
