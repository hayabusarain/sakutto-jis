import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { normalizePath, RouterContext } from './context'

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
  const [pathname, setPathname] = useState(() => normalizePath(initialPath))

  useEffect(() => {
    const onPopState = () => setPathname(normalizePath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to: string) => {
    const url = new URL(to, window.location.href)
    window.history.pushState(null, '', url)
    setPathname(normalizePath(url.pathname))
    if (url.hash) {
      document.getElementById(url.hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [])

  const value = useMemo(() => ({ pathname, navigate }), [pathname, navigate])

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}
