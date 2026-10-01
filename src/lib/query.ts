/** ツールの入力（数値・文字列だけの平らなオブジェクト）と URL のクエリ文字列の相互変換 */
export type FlatState<T> = { [K in keyof T]: string | number }

/**
 * 既定値と違う項目だけをクエリにする（既定のままならクエリなし）。
 * 例: { d: 12, p: 1.75, grade: 6 }（既定 d: 10）→ "d=12&p=1.75"
 */
export function toQuery<T extends FlatState<T>>(state: T, defaults: T): string {
  const params = new URLSearchParams()
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    if (state[key] !== defaults[key]) params.set(key, String(state[key]))
  }
  return params.toString()
}

/**
 * 入力を URL に書くときのクエリ。基本は toQuery と同じく既定値と違う項目だけにするが、
 * 開き直したときに normalize（一部だけ指定された URL の補完）で別の値に変わってしまう項目は省かずに書く。
 * 例: M16×1.5（細目）で p=1.5 が既定値と同じでも、"d=16" だけだと並目の 2 に補完されるので "d=16&p=1.5" にする。
 */
export function stateQuery<T extends FlatState<T>>(
  state: T,
  defaults: T,
  normalize?: (state: T, keys: readonly (keyof T)[]) => T,
): string {
  const short = toQuery(state, defaults)
  if (!normalize || short === '') return short
  const keys = Object.keys(defaults) as (keyof T & string)[]
  const restore = (query: string) => {
    const parsed = fromQuery(query, defaults)
    return parsed ? normalize(parsed.state, parsed.keys) : null
  }
  const restored = restore(short)
  if (restored && keys.every((key) => restored[key] === state[key])) return short

  // 変わってしまう項目を足す。それでも戻らなければ全項目を書く
  const params = new URLSearchParams(short)
  for (const key of keys) {
    if (!restored || restored[key] !== state[key]) params.set(key, String(state[key]))
  }
  const longer = params.toString()
  const again = restore(longer)
  if (again && keys.every((key) => again[key] === state[key])) return longer
  return new URLSearchParams(keys.map((key) => [key, String(state[key])])).toString()
}

export interface QueryState<T> {
  /** 既定値に URL の値を重ねたもの */
  state: T
  /** URL で指定されていたキー */
  keys: (keyof T)[]
}

/**
 * クエリから入力を復元する。既定値にあるキーだけを読み、型は既定値に合わせる。
 * 該当するキーが1つも無ければ null（URL で条件が指定されていない）。
 */
export function fromQuery<T extends FlatState<T>>(search: string, defaults: T): QueryState<T> | null {
  const params = new URLSearchParams(search)
  const keys: (keyof T)[] = []
  const result: Record<string, string | number> = { ...defaults }
  for (const key of Object.keys(defaults) as (keyof T & string)[]) {
    const raw = params.get(key)
    if (raw === null) continue
    keys.push(key)
    if (typeof defaults[key] === 'number') {
      const value = Number(raw)
      if (raw.trim() === '' || !Number.isFinite(value)) return null
      result[key] = value
    } else {
      result[key] = raw
    }
  }
  return keys.length > 0 ? { state: result as unknown as T, keys } : null
}

/**
 * ツールへのリンク（条件付き）。例: toolHref('/tap-drill', { d: 12, p: 1.75 }) → "/tap-drill?d=12&p=1.75"
 * キー名は各ツールの入力（useToolState に渡す既定値）と同じにする。
 */
export function toolHref(path: string, params: Record<string, string | number> = {}): string {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString()
  return query ? `${path}?${query}` : path
}
