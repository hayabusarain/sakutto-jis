import type { ReactNode } from 'react'
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
 * 今開いているツールと同じページへの条件付きリンクでも、ルーターが画面を作り直して新しい条件を読み込む。
 */
export function SearchLink({ href, className, children, ...rest }: SearchLinkProps) {
  const { navigate } = useSearchActions()
  return (
    <Link to={href} className={className} onClick={navigate} data-search-link {...rest}>
      {children}
    </Link>
  )
}
