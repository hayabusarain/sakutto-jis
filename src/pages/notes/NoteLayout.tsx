import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { SourceNote } from '../../components/SourceNote'
import { Link } from '../../router/Link'
import { ActionLink, PageHeader } from '../content/PageHeader'
import { formatJaDate } from '../content/dates'
import { NOTE_PAGES, NOTES_INDEX_META, noteUpdatedAt, type NotePageMeta } from './notePages'

/** 記事の本文の文字・リンク・リストの見た目（運営者情報などの文章ページと同じ） */
const PROSE =
  'space-y-3 text-sm leading-relaxed text-zinc-700 sm:text-[15px] [&_a]:font-semibold [&_a]:text-zinc-900 [&_a]:underline [&_a]:decoration-zinc-400 [&_a]:underline-offset-2 [&_a:hover]:decoration-orange-600 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1'

/** 更新日（例: 2026年10月3日 更新） */
export function NoteDate({ path }: { path: string }) {
  const date = noteUpdatedAt(path)
  return (
    <p className="num text-xs text-zinc-500">
      <time dateTime={date}>{formatJaDate(date)}</time> 更新
    </p>
  )
}

interface NoteLayoutProps {
  meta: NotePageMeta
  /** 見出しの下のリード（結論を先に） */
  lead: ReactNode
  /** 本文の下の「ツールで確かめる」リンク */
  actions: readonly { to: string; label: string }[]
  children: ReactNode
}

/** 現場メモの記事の枠（パンくず・見出し・更新日・本文・ツールへのリンク・参照規格） */
export function NoteLayout({ meta, lead, actions, children }: NoteLayoutProps) {
  const others = NOTE_PAGES.filter((page) => page.path !== meta.path)
  return (
    <>
      <PageHeader
        trail={meta.breadcrumb}
        category={meta.category}
        title={meta.h1}
        shareTitle={meta.h1}
        lead={
          <>
            <NoteDate path={meta.path} />
            {lead}
          </>
        }
      />

      <article
        aria-label={meta.h1}
        className="max-w-3xl space-y-8 rounded-md border border-zinc-200 bg-white p-4 sm:p-6"
      >
        {children}
      </article>

      <section aria-labelledby="note-tools" className="mt-6 max-w-3xl print:hidden">
        <h2 id="note-tools" className="text-xs font-bold tracking-wider text-zinc-600">
          ツールで確かめる
        </h2>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {actions.map((action) => (
            <ActionLink key={action.to} to={action.to}>
              {action.label}
            </ActionLink>
          ))}
        </div>
      </section>

      <NoteLinks id="note-others" title={`ほかの${NOTES_INDEX_META.label}`} pages={others} className="mt-6 max-w-3xl" />

      <div className="mt-6 max-w-3xl">
        <SourceNote standards={meta.standards} />
      </div>
    </>
  )
}

/** 現場メモへのリンクの一覧（最後に一覧ページへのリンク）。記事の下とツールのページで使う */
export function NoteLinks({
  id,
  title,
  pages,
  className = '',
}: {
  id: string
  title: string
  pages: readonly NotePageMeta[]
  className?: string
}) {
  const linkClass = 'flex min-h-11 items-center gap-2 px-4 py-2 text-sm hover:text-zinc-950'
  return (
    <nav aria-labelledby={id} className={`print:hidden ${className}`}>
      <h2 id={id} className="text-xs font-bold tracking-wider text-zinc-600">
        {title}
      </h2>
      <ul className="mt-2 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
        {pages.map((page) => (
          <li key={page.path}>
            <Link to={page.path} className={`${linkClass} font-semibold text-zinc-800`}>
              <span className="min-w-0 flex-1">{page.h1}</span>
              <ChevronRight className="size-4 shrink-0 text-orange-600" aria-hidden />
            </Link>
          </li>
        ))}
        <li>
          <Link to={NOTES_INDEX_META.path} className={`${linkClass} text-zinc-700`}>
            <span className="min-w-0 flex-1">{NOTES_INDEX_META.label}の一覧</span>
            <ChevronRight className="size-4 shrink-0 text-orange-600" aria-hidden />
          </Link>
        </li>
      </ul>
    </nav>
  )
}

/** 記事の節。見出しは h2 */
export function NoteSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="border-l-2 border-orange-600 pl-2 text-base font-bold text-zinc-900 sm:text-lg">
        {title}
      </h2>
      <div className={`mt-3 ${PROSE}`}>{children}</div>
    </section>
  )
}

/** 数値を入れた計算式（狭い画面では空白で折り返す） */
export function NoteCalc({ children }: { children: ReactNode }) {
  return (
    <p className="num rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-[13px] leading-relaxed text-zinc-900">
      {children}
    </p>
  )
}

export interface NoteTableColumn<T> {
  header: ReactNode
  cell: (row: T) => ReactNode
  /** 左寄せ（文字の列）。既定は右寄せ（数値の列） */
  left?: boolean
  /** 折り返してよい列（文章の列） */
  wrap?: boolean
}

/** 記事の中の小さな表（320px の画面で横にはみ出さない列数にする） */
export function NoteTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  rowHeader = true,
}: {
  caption: string
  columns: readonly NoteTableColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  /** 先頭の列を行の見出し（th）にする */
  rowHeader?: boolean
}) {
  const align = (column: NoteTableColumn<T>) =>
    `${column.left ? 'text-left' : 'text-right'} ${column.wrap ? '' : 'whitespace-nowrap'}`
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13px] sm:text-sm">
        <caption className="pb-1.5 text-left text-xs font-semibold text-zinc-600">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column, index) => (
              <th
                key={index}
                scope="col"
                className={`border-b border-zinc-300 bg-zinc-50 px-2 py-1.5 text-xs font-semibold text-zinc-600 ${align(column)}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column, index) => {
                const className = `border-b border-zinc-100 px-2 py-1.5 align-top ${align(column)} ${
                  column.wrap ? 'font-sans' : 'num'
                }`
                return index === 0 && rowHeader ? (
                  <th key={index} scope="row" className={`${className} font-semibold text-zinc-900`}>
                    {column.cell(row)}
                  </th>
                ) : (
                  <td key={index} className={className}>
                    {column.cell(row)}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
