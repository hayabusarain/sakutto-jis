import { useEffect, useRef } from 'react'
import { SiteFooter } from './components/layout/SiteFooter'
import { SiteHeader } from './components/layout/SiteHeader'
import { ToolNav } from './components/layout/ToolNav'
import { NotFoundPage } from './pages/NotFoundPage'
import { ToolPage } from './pages/ToolPage'
import { findPage, NOT_FOUND_PAGE } from './routes'
import { useRouter } from './router/context'
import { RouterProvider } from './router/RouterProvider'

export default function App({ initialPath }: { initialPath: string }) {
  return (
    <RouterProvider initialPath={initialPath}>
      <Shell />
    </RouterProvider>
  )
}

function Shell() {
  const { pathname } = useRouter()
  const page = findPage(pathname)
  const mainRef = useRef<HTMLElement>(null)
  const isFirstRender = useRef(true)

  // 画面内でページを切り替えたら、読み上げソフトやキーボード操作のために本文へフォーカスを移す
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (!window.location.hash) mainRef.current?.focus({ preventScroll: true })
  }, [pathname])

  // 画面内でページを切り替えたときも、タブの題名と説明文を合わせる
  useEffect(() => {
    document.title = page?.title ?? NOT_FOUND_PAGE.title
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute('content', page?.description ?? NOT_FOUND_PAGE.description)
  }, [page])

  let content = <NotFoundPage />
  if (page?.tool) content = <ToolPage key={page.path} tool={page.tool} />
  else if (page?.component) content = <page.component />

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
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
