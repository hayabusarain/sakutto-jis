import { useEffect, useRef } from 'react'
import { fromQuery, toQuery, type FlatState } from '../lib/query'
import { usePersistentState } from './usePersistentState'

/**
 * ツールの入力。前回の入力を端末に覚え、さらに URL のクエリとも同期する。
 * 条件付きの URL（例: /tap-drill?d=12&p=1.75）を開けば同じ条件で表示でき、そのまま共有・ブックマークできる。
 * defaults と isValid は、モジュールの定数など毎回同じものを渡すこと。
 */
export function useToolState<T extends FlatState<T>>(
  key: string,
  defaults: T,
  isValid: (value: unknown) => value is T,
) {
  const [state, setState] = usePersistentState(key, defaults, isValid)
  const urlRead = useRef(false)

  // 表示直後に一度だけ、URL で指定された条件を読み込む（保存済みの入力より優先）
  useEffect(() => {
    const fromUrl = fromQuery(window.location.search, defaults)
    if (fromUrl && isValid(fromUrl)) setState(fromUrl)
    urlRead.current = true
    // key が変わる（別のツールに切り替わる）ときはコンポーネントごと作り直されるので、初回だけでよい
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 入力が変わったら URL のクエリを書き換える（履歴は増やさない）
  useEffect(() => {
    if (!urlRead.current) return
    const query = toQuery(state, defaults)
    const next = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (next !== current) window.history.replaceState(window.history.state, '', next)
  }, [state, defaults])

  return [state, setState] as const
}
