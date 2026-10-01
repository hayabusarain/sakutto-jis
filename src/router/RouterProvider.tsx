import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { flushSync } from 'react-dom'
import { linkAction, normalizePath, RouterContext } from './context'
import { getKnownSearch, isUpdateAvailable, setKnownSearch } from './history'

interface RouterProviderProps {
  /** サーバー側（事前レンダリング）では描画するURLを、ブラウザでは現在のURLを渡す */
  initialPath: string
  children: ReactNode
}

/** そのままキーボードのフォーカスを受け取れる要素 */
const FOCUSABLE = 'a[href], button, input, select, textarea, summary, [tabindex]'

/**
 * 見出し（#contact など）へスクロールし、読み上げソフトやキーボード操作の位置もそこへ移す。
 * 見出しが無ければページの先頭へ戻し、位置は本文へ移す（検索で今と同じ条件を選んだときなど、
 * 押したリンクが閉じた画面の中にあっても、キーボード操作の位置がページの先頭に戻らないように）
 */
function scrollToTarget(hash: string) {
  const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null
  if (!target) {
    window.scrollTo(0, 0)
    document.querySelector<HTMLElement>('main')?.focus({ preventScroll: true })
    return
  }
  if (!target.matches(FOCUSABLE)) target.setAttribute('tabindex', '-1')
  target.scrollIntoView()
  target.focus({ preventScroll: true })
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

  /** 表示しているページ（「戻る」で別のページに移ったかを見分ける） */
  const shownPath = useRef(location.pathname)
  useEffect(() => {
    shownPath.current = location.pathname
  }, [location.pathname])

  useEffect(() => {
    setKnownSearch(window.location.search)
    const onPopState = () => {
      const pathname = normalizePath(window.location.pathname)
      const previousSearch = getKnownSearch()
      // 新しい版が公開されていたら、「戻る」で別の画面・条件に移るときに読み直して最新の版で表示する
      // （同じ画面の見出しへの移動だけなら読み直さない）
      if (isUpdateAvailable() && (pathname !== shownPath.current || window.location.search !== previousSearch)) {
        window.location.reload()
        return
      }
      update(pathname, previousSearch, window.location.search)
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [update])

  const navigate = useCallback(
    (to: string) => {
      const current = new URL(window.location.href)
      // 新しい版（数値の訂正を含むことがある）が公開されていたら、画面内で切り替えずにページを読み込み直す
      const action = linkAction(current, new URL(to, current), isUpdateAvailable())
      switch (action.type) {
        case 'load':
          window.location.assign(action.url.href)
          return
        case 'reload':
          window.location.reload()
          return
        case 'push': {
          const { url } = action
          window.history.pushState(null, '', url)
          // 新しいページを描画し終えてから、見出し（#contact など）を探してスクロールする
          flushSync(() => update(normalizePath(url.pathname), current.search, url.search))
          scrollToTarget(url.hash)
          return
        }
        case 'stay':
          // いま表示しているページへのリンクなら、履歴を増やさずにスクロールだけ
          scrollToTarget(current.hash)
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
