import { useEffect } from 'react'
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
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-5 sm:pt-8">{content}</main>
      <SiteFooter />
    </div>
  )
}
