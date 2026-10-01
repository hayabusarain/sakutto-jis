import { RotateCw } from 'lucide-react'
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { SiteFooter } from './components/layout/SiteFooter'
import { SiteHeader } from './components/layout/SiteHeader'
import { ToolNav } from './components/layout/ToolNav'
import { NotFoundPage } from './pages/NotFoundPage'
import { ToolPage } from './pages/ToolPage'
import { findPage, NOT_FOUND_PAGE } from './routes'
import { useRouter } from './router/context'
import { isUpdateAvailable, subscribeUpdate } from './router/history'
import { RouterProvider } from './router/RouterProvider'

export default function App({ initialPath }: { initialPath: string }) {
  return (
    <RouterProvider initialPath={initialPath}>
      <Shell />
    </RouterProvider>
  )
}

function Shell() {
  const { pathname, revision } = useRouter()
  const page = findPage(pathname)
  const mainRef = useRef<HTMLElement>(null)
  const isFirstRender = useRef(true)

  // 画面内でページや条件（? 以降）を切り替えたら、読み上げソフトやキーボード操作のために本文へフォーカスを移す
  // （見出しへのリンク #contact などは、RouterProvider がその見出しへフォーカスを移す）
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!window.location.hash) mainRef.current?.focus({ preventScroll: true })
  }, [pathname, revision])

  // 画面内でページを切り替えたときも、タブの題名と説明文を合わせる
  useEffect(() => {
    document.title = page?.title ?? NOT_FOUND_PAGE.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', page?.description ?? NOT_FOUND_PAGE.description)
  }, [page])

  let content = <NotFoundPage />
  if (page?.tool) content = <ToolPage key={`${page.path}#${revision}`} tool={page.tool} />
  else if (page?.component) content = <page.component />

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <UpdateNotice />
      <ToolNav />
      <main
        ref={mainRef}
        tabIndex={-1}
        aria-label={page?.title ?? NOT_FOUND_PAGE.title}
        className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 outline-none sm:pt-8"
      >
        {content}
      </main>
      <SiteFooter />
    </div>
  )
}

/**
 * 新しい版を公開したときのお知らせ（main.tsx が Service Worker の更新を見つけたら出す）。
 * 次にサイト内のリンクを押したときもページを読み直すが、同じページを開いたままの人にも知らせる。
 */
function UpdateNotice() {
  const available = useSyncExternalStore(subscribeUpdate, isUpdateAvailable, () => false)
  return (
    <div role="status" className="print:hidden">
      {available && (
        <div className="border-b border-orange-300 bg-orange-50">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 text-sm text-zinc-800">
            <p className="min-w-0 flex-1">サイトを更新しました。読み込み直すと最新の内容で表示します。</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 font-semibold text-zinc-800 hover:border-zinc-500"
            >
              <RotateCw className="size-4 text-orange-600" aria-hidden />
              読み込み直す
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
