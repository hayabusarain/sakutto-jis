import { useCallback, useEffect, useState } from 'react'
import { resolveToolId, type ToolId } from '../tools/ids'

/**
 * 表示中のツールをURLハッシュと同期する。
 * `https://…/#tap-drill` のように、ツールごとにブックマーク・共有できる。
 */
export function useActiveTool() {
  const [activeId, setActiveIdState] = useState<ToolId>(() =>
    resolveToolId(window.location.hash),
  )

  useEffect(() => {
    const onHashChange = () => setActiveIdState(resolveToolId(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setActiveId = useCallback((id: ToolId) => {
    setActiveIdState(id)
    // タブ切替のたびに履歴を積むと「戻る」操作が煩わしいので置き換える
    window.history.replaceState(null, '', `#${id}`)
  }, [])

  return [activeId, setActiveId] as const
}
