import { Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { LogoMark } from '../../components/layout/LogoMark'
import { SourceNote } from '../../components/SourceNote'
import { DATA_DISCLAIMER, PAGE_UPDATED_AT, SITE } from '../../site'
import { ChipNav, TrailBreadcrumb } from '../content/PageHeader'
import { formatJaDate } from '../content/dates'
import { PRINT_INDEX_PATH, PRINT_SHEETS, type PrintSheetMeta } from './printPages'
import { QrCode } from './QrCode'

/** 印刷したときの表の文字の大きさ（index.css の [data-density]）。行が多い早見表ほど小さくする */
export type SheetDensity = 'loose' | 'normal' | 'compact'

/** 「印刷する」ボタン（印刷のダイアログを開く） */
export function PrintButton({ className = '' }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-sm bg-zinc-900 px-6 py-2 text-base font-bold text-white hover:bg-zinc-700 sm:w-auto print:hidden ${className}`}
    >
      <Printer className="size-5 shrink-0 text-orange-500" aria-hidden />
      印刷する
    </button>
  )
}

export interface SheetColumn<T> {
  key: string
  header: ReactNode
  /** 2段の見出しの上の段。同じ group の隣り合う列を1つにまとめる */
  group?: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

/**
 * 見出しのセル。画面では表ごと横にスクロールするので、列の見出しは折り返さない
 * （2段の見出しの上の段だけは、下の列の幅に合わせて折り返す。印刷では index.css で全部折り返せるようにする）
 */
const headCell = 'border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs leading-tight font-semibold text-zinc-700'
const firstHeadCell = 'sticky left-0 z-10 text-left whitespace-nowrap print:static'

/**
 * 早見表の表。画面では枠の中で横にスクロールし（1列目は固定）、印刷では紙の幅に収める
 * （文字の大きさ・余白は index.css の .sheet-table）。
 */
export function SheetTable<T>({
  caption,
  columns,
  rows,
  rowKey,
}: {
  caption: string
  columns: readonly SheetColumn<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
}) {
  const grouped = columns.some((column) => column.group)
  // 上の段: group の無い列は2段ぶち抜き、同じ group が続く列はまとめる
  const top: { key: string; label: ReactNode; span: number; rowSpan: number; group: boolean }[] = []
  for (const column of columns) {
    const last = top[top.length - 1]
    if (column.group && last && last.key === `group:${column.group}`) last.span += 1
    else if (column.group)
      top.push({ key: `group:${column.group}`, label: column.group, span: 1, rowSpan: 1, group: true })
    else top.push({ key: column.key, label: column.header, span: 1, rowSpan: 2, group: false })
  }

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="sheet-table w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          {grouped ? (
            <>
              <tr>
                {top.map((cell, index) => (
                  <th
                    key={cell.key}
                    scope={cell.span > 1 ? 'colgroup' : 'col'}
                    colSpan={cell.span > 1 ? cell.span : undefined}
                    rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                    className={`${headCell} ${
                      index === 0 ? firstHeadCell : `text-center ${cell.group ? '' : 'whitespace-nowrap'}`
                    }`}
                  >
                    {cell.label}
                  </th>
                ))}
              </tr>
              <tr>
                {columns
                  .filter((column) => column.group)
                  .map((column) => (
                    <th key={column.key} scope="col" className={`${headCell} text-center whitespace-nowrap`}>
                      {column.header}
                    </th>
                  ))}
              </tr>
            </>
          ) : (
            <tr>
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`${headCell} ${index === 0 ? firstHeadCell : 'text-center whitespace-nowrap'}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const stripe = rowIndex % 2 === 1 ? 'bg-zinc-50' : 'bg-white'
            return (
              <tr key={rowKey(row)} className={stripe}>
                {columns.map((column, index) =>
                  index === 0 ? (
                    <th
                      key={column.key}
                      scope="row"
                      className={`sticky left-0 z-10 border border-zinc-300 px-2 py-1 text-left font-bold whitespace-nowrap text-zinc-900 print:static ${stripe}`}
                    >
                      {column.cell(row)}
                    </th>
                  ) : (
                    <td
                      key={column.key}
                      className={`num border border-zinc-300 px-2 py-1 whitespace-nowrap text-zinc-900 ${alignClass[column.align ?? 'right']}`}
                    >
                      {column.cell(row)}
                    </td>
                  ),
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** 表の見出し（「5K（JIS B 2220 表14）」など） */
export function SheetHeading({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <h2 className="mb-1 flex flex-wrap items-baseline gap-x-2 text-sm font-bold text-zinc-900 print:mb-0.5 print:text-[10pt]">
      <span className="h-3 w-1 shrink-0 self-center bg-orange-600 print:[print-color-adjust:exact]" aria-hidden />
      {children}
      {aside && <span className="text-xs font-normal text-zinc-600 print:text-[7.5pt]">{aside}</span>}
    </h2>
  )
}

/** 表の下の注記（紙にも出す） */
export function SheetNotes({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-2 space-y-0.5 text-xs leading-snug text-zinc-700 print:mt-1 print:text-[7.5pt] [&>li]:ml-4 [&>li]:list-disc">
      {children}
    </ul>
  )
}

interface SheetPageProps {
  meta: PrintSheetMeta
  /** 印刷したときの表の文字の大きさ */
  density: SheetDensity
  /** 見出しの下の1〜2行（単位・条件。紙にも出す） */
  summary: ReactNode
  /** 表と注記 */
  children: ReactNode
  /** 典拠（Citation を並べる。紙にも出す） */
  citations: ReactNode
  /** 画面だけに出す計算ロジック（FormulaInfo） */
  formula?: ReactNode
}

/**
 * 印刷用の早見表のページ。画面では紙のように見せ、印刷では A4 縦1枚にこの紙の部分だけを出す
 * （サイトの見出し・ナビ・フッターは index.css の [data-print-sheet] の指定で消す）。
 */
export function SheetPage({ meta, density, summary, children, citations, formula }: SheetPageProps) {
  const updatedAt = formatJaDate(PAGE_UPDATED_AT[meta.path] ?? SITE.contentUpdatedAt)
  const others = PRINT_SHEETS.filter((sheet) => sheet.key !== meta.key)

  return (
    <div data-print-sheet="" data-density={density}>
      <div className="mb-4 print:hidden">
        <TrailBreadcrumb trail={meta.breadcrumb} />
        <p className="mt-4 text-xs font-semibold tracking-wider text-orange-700">{meta.category}・印刷用</p>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-zinc-600">
          A4 縦1枚に収まる早見表です。印刷して現場の壁や工具箱に貼っておくと、QR コードからスマホでツールを開けます。
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <PrintButton />
          <p className="text-xs leading-relaxed text-zinc-600">
            印刷の設定は「用紙サイズ A4・縦・倍率 100%（既定）」にしてください。
          </p>
        </div>
      </div>

      <article className="mx-auto max-w-[210mm] rounded-sm border border-zinc-300 bg-white p-3 shadow-sm sm:p-6 print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 border-zinc-900 pb-2 print:flex-nowrap print:pb-1">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 print:text-[8pt]">
              <LogoMark className="size-4 shrink-0 text-orange-600" />
              {SITE.name}
              <span className="font-normal">｜印刷用 早見表（A4）</span>
            </p>
            <h1 className="mt-1 text-xl leading-tight font-bold tracking-tight text-zinc-900 sm:text-2xl print:text-[16pt]">
              {meta.h1}
            </h1>
          </div>
          <p className="text-xs text-zinc-600 print:shrink-0 print:text-right print:text-[8pt]">
            データ確認日 <span className="num whitespace-nowrap text-zinc-800">{updatedAt}</span>
          </p>
        </header>
        <div className="mt-2 space-y-0.5 text-xs leading-snug text-zinc-700 print:mt-1 print:text-[8pt]">{summary}</div>

        <div className="mt-3 space-y-4 print:mt-2 print:space-y-2">{children}</div>

        <footer className="mt-4 flex flex-col gap-3 border-t border-zinc-300 pt-3 sm:flex-row sm:items-start print:mt-2 print:flex-row print:items-start print:gap-3 print:pt-1.5">
          <div className="min-w-0 flex-1 space-y-0.5 print:[&_p]:text-[7pt] print:[&_p]:leading-snug print:[&_svg]:size-2.5">
            <p className="text-xs font-bold text-zinc-700">典拠（規格・表番号）</p>
            {citations}
            <p className="pt-1 text-xs leading-relaxed text-zinc-600">{DATA_DISCLAIMER}</p>
            <p className="text-xs text-zinc-600">
              {SITE.name}（JIS規格の計算・寸法確認ツール）・データ確認日 <span className="num">{updatedAt}</span>
            </p>
          </div>
          <div className="flex shrink-0 justify-center gap-3 sm:justify-end">
            {meta.qr.map((qr) => (
              <QrCode key={qr.path} path={qr.path} label={qr.label} />
            ))}
          </div>
        </footer>
      </article>

      <div className="mt-6 space-y-6 print:hidden">
        <div className="flex justify-center">
          <PrintButton />
        </div>
        {formula}
        <section aria-labelledby="other-sheets">
          <h2 id="other-sheets" className="text-xs font-bold tracking-wider text-zinc-600">
            ほかの早見表
          </h2>
          <ChipNav
            label="ほかの早見表"
            className="mt-2"
            links={[
              ...others.map((sheet) => ({ to: sheet.path, label: sheet.label })),
              { to: PRINT_INDEX_PATH, label: '早見表の一覧' },
            ]}
          />
        </section>
        <SourceNote standards={meta.standards} />
      </div>
    </div>
  )
}
