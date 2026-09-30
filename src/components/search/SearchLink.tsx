import type { ReactNode } from 'react'
import { useRouter } from '../../router/context'
import { Link } from '../../router/Link'
import { useSearchActions } from './context'

interface SearchLinkProps {
  href: string
  className?: string
  children: ReactNode
  'aria-label'?: string
}

/**
 * 検索結果からツールへのリンク。
 * 今開いているツールと同じページへの条件付きリンクは、画面内の切り替えでは入力が読み直されないため、
 * 通常のリンクとしてページを読み込み直す（事前レンダリング済み・オフラインでも表示できる）。
 */
export function SearchLink({ href, className, children, ...rest }: SearchLinkProps) {
  const { pathname } = useRouter()
  const { navigate } = useSearchActions()
  const targetPath = href.split(/[?#]/)[0]

  if (targetPath === pathname) {
    return (
      <a href={href} className={className} data-search-link {...rest}>
        {children}
      </a>
    )
  }
  return (
    <Link to={href} className={className} onClick={navigate} data-search-link {...rest}>
      {children}
    </Link>
  )
}
