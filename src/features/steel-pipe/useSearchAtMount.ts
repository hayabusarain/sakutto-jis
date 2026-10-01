import { useState, useSyncExternalStore } from 'react'

const subscribeNothing = () => () => {}

/**
 * この画面を表示したときの URL の ? 以降。表示後に入力の同期で URL が書き換わっても、最初の値のまま。
 * 事前レンダリングと食い違わないよう、事前レンダリングとその読み込み直後の描画では空文字にし、
 * 表示後に useSyncExternalStore で読む（useToolState より前で呼ぶと、URL を整える前の値になる）。
 */
export function useSearchAtMount(): string {
  const [cache] = useState<{ search?: string }>(() => ({}))
  return useSyncExternalStore(
    subscribeNothing,
    () => (cache.search ??= window.location.search),
    () => '',
  )
}
