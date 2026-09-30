import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface CardProps {
  title: string
  /** 見出し左の番号（例: 「01」）。入力→結果の流れを示す */
  index?: string
  icon?: LucideIcon
  /** 見出し右側に置く補足（バッジ・ボタンなど） */
  aside?: ReactNode
  className?: string
  /** 本文の余白をなくす（表を端まで広げるときなど） */
  flush?: boolean
  id?: string
  children: ReactNode
}

export function Card({
  title,
  index,
  icon: Icon,
  aside,
  className = '',
  flush = false,
  id,
  children,
}: CardProps) {
  return (
    <section id={id} className={`rounded-md border border-zinc-200 bg-white ${className}`}>
      <header className="flex min-h-11 items-center gap-2 border-b border-zinc-200 px-4 py-2">
        {index && <span className="num text-xs font-bold text-orange-600">{index}</span>}
        {Icon && <Icon className="size-4 shrink-0 text-zinc-500" aria-hidden />}
        <h2 className="text-sm font-bold tracking-wide text-zinc-800">{title}</h2>
        {aside && <div className="ml-auto flex items-center gap-2">{aside}</div>}
      </header>
      <div className={flush ? '' : 'p-4 sm:p-5'}>{children}</div>
    </section>
  )
}
