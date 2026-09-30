import { ArrowRight } from 'lucide-react'
import { Link } from '../router/Link'

export interface RelatedLink {
  /** 条件付きのリンク先（toolHref で作る） */
  to: string
  label: string
}

/** 結果の下に置く「関連する寸法を見る」リンク。今の条件をそのまま引き継ぐ */
export function RelatedLinks({ links }: { links: readonly RelatedLink[] }) {
  if (links.length === 0) return null
  return (
    <nav aria-label="関連するツール" className="mt-4 print:hidden">
      <p className="text-xs font-bold tracking-wider text-zinc-500">この条件で関連する寸法を見る</p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link
              to={link.to}
              className="inline-flex min-h-10 items-center gap-1 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 hover:border-zinc-900"
            >
              {link.label}
              <ArrowRight className="size-3.5 text-orange-600" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
