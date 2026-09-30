import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface CardProps {
  title: string
  icon?: LucideIcon
  /** 見出し右側に置く補足（「準備中」バッジなど） */
  aside?: ReactNode
  className?: string
  children: ReactNode
}

export function Card({ title, icon: Icon, aside, className = '', children }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${className}`}
    >
      <header className="flex items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
        {Icon && <Icon className="size-5 shrink-0 text-blue-700" aria-hidden />}
        <h3 className="text-base font-bold text-slate-800">{title}</h3>
        {aside && <div className="ml-auto">{aside}</div>}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  )
}
