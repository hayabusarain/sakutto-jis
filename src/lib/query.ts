/** ツールの入力（数値・文字列だけの平らなオブジェクト）と URL のクエリ文字列の相互変換 */
export type FlatState<T> = { [K in keyof T]: string | number }

/**
 * 既定値と違う項目だけをクエリにする（既定のままなら空）。
 * 例: { d: 12, p: 1.75, grade: 6 }（既定 d: 10）→ "d=12&p=1.75"
 * ツールの URL に書くときは、開き直して同じ条件に戻る stateQuery を使う。
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
 *
 * 空のクエリは返さない。クエリの無い URL（/tap-drill）は「前回の入力を復元する」意味なので、
 * 既定の条件もその条件として開き直せるよう、戻せる最小の項目を書く（例: 既定の M10 なら "d=10"）。
 * こうしておくと、「戻る」で前の条件に戻り、共有・ブックマークした URL も表示中の条件どおりに開く。
 */
export function stateQuery<T extends FlatState<T>>(
  state: T,
  defaults: T,
  normalize?: (state: T, keys: readonly (keyof T)[]) => T,
): string {
  const keys = Object.keys(defaults) as (keyof T & string)[]
  const restore = (query: string): T | null => {
    const parsed = fromQuery(query, defaults)
    if (!parsed) return null
    return normalize ? normalize(parsed.state, parsed.keys) : parsed.state
  }
  const roundTrips = (query: string) => {
    const restored = restore(query)
    return restored !== null && keys.every((key) => restored[key] === state[key])
  }
  const all = () => new URLSearchParams(keys.map((key) => [key, String(state[key])])).toString()

  const short = toQuery(state, defaults)
  if (short === '') {
    // 既定の条件: 1項目だけで戻せるものを、既定値のキーの順に探す
    for (const key of keys) {
      const single = new URLSearchParams([[key, String(state[key])]]).toString()
      if (roundTrips(single)) return single
    }
    return all()
  }
  if (roundTrips(short)) return short

  // 変わってしまう項目を足す。それでも戻らなければ全項目を書く
  const restored = restore(short)
  const params = new URLSearchParams(short)
  for (const key of keys) {
    if (!restored || restored[key] !== state[key]) params.set(key, String(state[key]))
  }
  const longer = params.toString()
  if (roundTrips(longer)) return longer
  return all()
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
