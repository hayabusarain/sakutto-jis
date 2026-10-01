import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { ShareButton } from '../../components/ui/ShareButton'
import type { Crumb } from '../../lib/structuredData'
import { Link } from '../../router/Link'
import { standardLabel, type StandardCode } from '../../standards'

/** ホーム › ツール › このページ のような、何段でも表示できるパンくず */
export function TrailBreadcrumb({ trail }: { trail: readonly Crumb[] }) {
  return (
    <nav aria-label="パンくずリスト" className="text-xs text-zinc-600">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        {trail.map((crumb, index) => {
          const last = index === trail.length - 1
          return (
            <li key={crumb.path} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="size-3 shrink-0" aria-hidden />}
              {last ? (
                <span aria-current="page" className="text-zinc-700">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.path} className="hover:text-zinc-900 hover:underline">
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

interface PageHeaderProps {
  trail: readonly Crumb[]
  /** 見出しの上の小さな分類（例: 配管） */
  category: string
  title: string
  /** 見出しの下の説明（2〜3文） */
  lead: ReactNode
  standards?: readonly StandardCode[]
  /** 共有ボタンの題名 */
  shareTitle?: string
  /** 共有ボタンと同じ行の左側に置くもの（前後のページへのリンクなど） */
  actions?: ReactNode
  children?: ReactNode
}

/** 寸法表・まとめページの見出し部分（ツールページの見出しと同じ見た目） */
export function PageHeader({
  trail,
  category,
  title,
  lead,
  standards = [],
  shareTitle,
  actions,
  children,
}: PageHeaderProps) {
  return (
    <div className="mb-5 sm:mb-6">
      <TrailBreadcrumb trail={trail} />
      <p className="mt-4 text-xs font-semibold tracking-wider text-orange-700">{category}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">{title}</h1>
      <div className="mt-2 max-w-3xl space-y-1.5 text-sm leading-relaxed text-zinc-600 sm:text-base">{lead}</div>
      {(standards.length > 0 || shareTitle || actions) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          {standards.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="参照規格">
              {standards.map((code) => (
                <li
                  key={code}
                  className="num rounded-sm border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-700"
                >
                  {standardLabel(code)}
                </li>
              ))}
            </ul>
          )}
          {actions}
          {shareTitle && (
            <div className="ml-auto">
              <ShareButton title={shareTitle} />
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  )
}

export interface ChipLink {
  to: string
  label: string
  /** 今のページ */
  current?: boolean
}

/** 同じ種類のページへの切り替え（5K・10K・16K・20K、M10・M12 など）。今のページは強調する */
export function ChipNav({ label, links, className = '' }: { label: string; links: readonly ChipLink[]; className?: string }) {
  return (
    <nav aria-label={label} className={`print:hidden ${className}`}>
      <ul className="flex flex-wrap gap-1.5">
        {links.map((link) => (
          <li key={link.to}>
            <Link
              to={link.to}
              aria-current={link.current ? 'page' : undefined}
              className={`num inline-flex h-10 min-w-12 items-center justify-center rounded-sm border px-3 text-sm font-semibold ${
                link.current
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 bg-white text-zinc-700 hover:border-zinc-900 hover:text-zinc-900'
              }`}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/** 「ツールで計算する」などの目立つリンク */
export function ActionLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-sm bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 print:hidden"
    >
      {children}
      <ChevronRight className="size-4 shrink-0 text-orange-500" aria-hidden />
    </Link>
  )
}

/** 表の上の注記（単位・※印の意味など） */
export function TableNote({ children }: { children: ReactNode }) {
  return <div className="space-y-1 px-4 pt-3 text-xs leading-relaxed text-zinc-600">{children}</div>
}

/** 規格原文での確認が済んでいない値に付ける印 */
export function UnverifiedMark() {
  return (
    <span className="relative ml-0.5 font-sans text-[11px] font-bold text-orange-700" title="規格原文での確認が済んでいない値">
      <span aria-hidden>※</span>
      <span className="sr-only">（規格原文で未確認）</span>
    </span>
  )
}
