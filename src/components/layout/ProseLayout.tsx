import type { ReactNode } from 'react'
import { Breadcrumb } from './Breadcrumb'

interface ProseLayoutProps {
  title: string
  /** 制定日・更新日など */
  meta?: string
  children: ReactNode
}

/** 運営者情報・規約など、文章中心のページの枠 */
export function ProseLayout({ title, meta, children }: ProseLayoutProps) {
  return (
    <article className="mx-auto max-w-3xl">
      <Breadcrumb current={title} />
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{title}</h1>
      {meta && <p className="num mt-1 text-xs text-zinc-500">{meta}</p>}
      <div className="mt-6 space-y-8 rounded-md border border-zinc-200 bg-white p-5 text-sm leading-relaxed text-zinc-700 sm:p-8 [&_a]:font-semibold [&_a]:text-zinc-900 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-2 [&_h2]:border-l-2 [&_h2]:border-orange-600 [&_h2]:pl-2 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-zinc-900 [&_li]:ml-5 [&_li]:list-disc [&_p+p]:mt-2 [&_ul]:mt-2 [&_ul]:space-y-1">
        {children}
      </div>
    </article>
  )
}
