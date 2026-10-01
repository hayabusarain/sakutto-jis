import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { normalizePath, RouterContext } from './context'
import { getKnownSearch, setKnownSearch } from './history'

interface RouterProviderProps {
  /** サーバー側（事前レンダリング）では描画するURLを、ブラウザでは現在のURLを渡す */
  initialPath: string
  children: ReactNode
}

/**
 * History API だけで動く最小限のルーター。
 * ページは全て事前にHTMLとして書き出すので、ここはページ間移動を速くするためだけのもの。
 */
export function RouterProvider({ initialPath, children }: RouterProviderProps) {
  const [location, setLocation] = useState(() => ({ pathname: normalizePath(initialPath), revision: 0 }))

  /** 移動先の URL を反映する。同じページで条件（? 以降）だけが変わったら、画面を作り直して読み直させる */
  const update = useCallback((pathname: string, previousSearch: string, search: string) => {
    setKnownSearch(search)
    setLocation((current) => {
      if (current.pathname !== pathname) return { pathname, revision: current.revision }
      return search !== previousSearch ? { pathname, revision: current.revision + 1 } : current
    })
  }, [])

  useEffect(() => {
    setKnownSearch(window.location.search)
    const onPopState = () =>
      update(normalizePath(window.location.pathname), getKnownSearch(), window.location.search)
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [update])

  const navigate = useCallback(
    (to: string) => {
      const url = new URL(to, window.location.href)
      const previousSearch = window.location.search
      window.history.pushState(null, '', url)
      // 新しいページを描画し終えてから、見出し（#contact など）を探してスクロールする
      flushSync(() => update(normalizePath(url.pathname), previousSearch, url.search))
      const target = url.hash ? document.getElementById(decodeURIComponent(url.hash.slice(1))) : null
      if (target) {
        target.scrollIntoView()
      } else {
        window.scrollTo(0, 0)
      }
    },
    [update],
  )

  const value = useMemo(
    () => ({ pathname: location.pathname, revision: location.revision, navigate }),
    [location, navigate],
  )

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}
