import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { isRowMoveKey, nextRowIndex, rowTabStop, type RowMoveKey } from './tableKeyboard'

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right' | 'center'
}

interface DataTableProps<T> {
  columns: readonly Column<T>[]
  rows: readonly T[]
  rowKey: (row: T) => string
  /** 強調する行（選択中のサイズなど） */
  isHighlighted?: (row: T) => boolean
  /** 強調した行に添える、読み上げ・印刷用の短い言葉（既定: 行を選べる表は「選択中」、それ以外は「該当」） */
  highlightLabel?: string
  onRowClick?: (row: T) => void
  caption?: string
  /** 縦にも長い表で高さを制限する（例: max-h-[32rem]）。見出し行は固定される。印刷では制限しない */
  maxHeightClass?: string
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

/** 印刷できる幅（A4 縦 210 mm から左右の余白 12 mm を除いた 186 mm）を CSS の px（96 px = 1 in = 25.4 mm）にしたもの */
const PRINT_PAGE_WIDTH_PX = (186 / 25.4) * 96

/**
 * キーボードで行に移ったときの枠。行（tr）に枠を描くと固定表示の1列目に隠れるので、
 * 各セルの内側に線を引いて、行全体を囲んで見せる
 */
function focusRingClass(index: number, count: number): string {
  const first = index === 0
  const last = index === count - 1
  if (first && last) {
    return '[tr:focus-visible>&]:shadow-[inset_0_0_0_2px_var(--color-orange-600)]'
  }
  if (first) {
    return '[tr:focus-visible>&]:shadow-[inset_3px_0_0_var(--color-orange-600),inset_0_2px_0_var(--color-orange-600),inset_0_-2px_0_var(--color-orange-600)]'
  }
  if (last) {
    return '[tr:focus-visible>&]:shadow-[inset_-2px_0_0_var(--color-orange-600),inset_0_2px_0_var(--color-orange-600),inset_0_-2px_0_var(--color-orange-600)]'
  }
  return '[tr:focus-visible>&]:shadow-[inset_0_2px_0_var(--color-orange-600),inset_0_-2px_0_var(--color-orange-600)]'
}

/**
 * 縦に高さを制限した表で、行が固定表示の見出し行に隠れず見える位置まで、表の中だけをスクロールする。
 * 'center' は行を見える範囲の中央へ、'nearest' は最小限の移動で見えるようにする
 */
function revealRow(container: HTMLElement, row: HTMLElement, align: 'center' | 'nearest') {
  const header = container.querySelector('thead')?.getBoundingClientRect().height ?? 0
  const box = container.getBoundingClientRect()
  const rect = row.getBoundingClientRect()
  // 見出し行のすぐ下からの位置（負なら見出しの下に隠れている）と、下端からはみ出した量
  const top = rect.top - (box.top + container.clientTop + header)
  const bottom = rect.bottom - (box.top + container.clientTop + container.clientHeight)
  if (top >= 0 && bottom <= 0) return
  if (align === 'center') {
    container.scrollTop += top - (container.clientHeight - header - rect.height) / 2
  } else {
    container.scrollTop += top < 0 ? top : bottom
  }
}

/**
 * 寸法表。スマホでは横スクロール、1列目は固定表示。
 * 行を選べる表（onRowClick）は、Tab で表に入るのは1行だけにして（選択中の行、なければ先頭）、
 * 上下の矢印・Home・End で行を移り、Enter・スペースで選ぶ。
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isHighlighted,
  highlightLabel,
  onRowClick,
  caption,
  maxHeightClass,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const keys = rows.map(rowKey)
  const highlightedIndex = isHighlighted ? rows.findIndex((row) => isHighlighted(row)) : -1
  const highlightedId = highlightedIndex === -1 ? null : keys[highlightedIndex]
  const marker = highlightLabel ?? (onRowClick ? '選択中' : '該当')

  // キーボードで今いる行。表の外へ移ったら忘れて、次に入るときは選択中の行から始める
  const [focusedKey, setFocusedKey] = useState<string | null>(null)
  const tabStopKey = onRowClick ? rowTabStop(keys, focusedKey, highlightedId) : undefined

  // 高さを制限した表では、選択中の行が見えるように表の中だけスクロールする
  useEffect(() => {
    const container = containerRef.current
    if (!maxHeightClass || !container || highlightedId === null) return
    const row = container.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(highlightedId)}"]`)
    if (row) revealRow(container, row, 'center')
  }, [highlightedId, maxHeightClass])

  // 印刷では、紙（A4 縦）の幅に収まらない表を、その表のカードごと横向きのページに印刷する。
  // 印刷の直前に、印刷と同じ文字の大きさで折り返したときの表の最小の幅を測って決める
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let marked: HTMLElement | null = null
    const handleBeforePrint = () => {
      const table = container.querySelector('table')
      if (!table) return
      container.classList.add('print-measure')
      const width = table.getBoundingClientRect().width
      container.classList.remove('print-measure')
      if (width > PRINT_PAGE_WIDTH_PX) {
        marked = container.closest('section') ?? container
        marked.dataset.printWide = ''
      }
    }
    const handleAfterPrint = () => {
      if (marked) delete marked.dataset.printWide
      marked = null
    }
    window.addEventListener('beforeprint', handleBeforePrint)
    window.addEventListener('afterprint', handleAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint)
      window.removeEventListener('afterprint', handleAfterPrint)
      handleAfterPrint()
    }
  }, [])

  const focusRow = (from: HTMLTableRowElement, key: RowMoveKey) => {
    const list = Array.from(
      containerRef.current?.querySelectorAll<HTMLTableRowElement>('tbody > tr[data-row-key]') ?? [],
    )
    const index = list.indexOf(from)
    if (index === -1) return false
    const next = list[nextRowIndex(index, list.length, key)]
    next.focus()
    // 高さを制限した表では、固定表示の見出し行の下に隠れないようにする
    if (containerRef.current) revealRow(containerRef.current, next, 'nearest')
    return true
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    // セルの中のリンクなどで押したキーは、そちらに任せる
    if (event.target !== event.currentTarget) return
    if (event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick?.(row)
    } else if (isRowMoveKey(event.key) && focusRow(event.currentTarget, event.key)) {
      event.preventDefault()
    }
  }

  const handleBlur = (event: FocusEvent<HTMLTableSectionElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocusedKey(null)
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${maxHeightClass ?? ''} print:max-h-none print:overflow-visible`}
    >
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 z-20 print:static">
          <tr className="border-b border-zinc-300 bg-zinc-50 text-xs text-zinc-600">
            {columns.map((column, index) => (
              <th
                key={column.key}
                scope="col"
                className={`px-3 py-2 font-semibold whitespace-nowrap ${
                  index === 0
                    ? 'sticky left-0 z-10 bg-zinc-50 text-left print:static'
                    : `bg-zinc-50 ${alignClass[column.align ?? 'right']}`
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody onBlur={onRowClick ? handleBlur : undefined}>
          {rows.map((row, rowIndex) => {
            const key = keys[rowIndex]
            const highlighted = isHighlighted?.(row) ?? false
            return (
              <tr
                key={key}
                data-row-key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => handleKeyDown(event, row) : undefined}
                onFocus={onRowClick ? () => setFocusedKey(key) : undefined}
                tabIndex={onRowClick ? (key === tabStopKey ? 0 : -1) : undefined}
                className={`border-b border-zinc-100 ${
                  highlighted ? 'bg-orange-50 font-semibold' : 'even:bg-zinc-50/60'
                } ${onRowClick ? 'cursor-pointer hover:bg-zinc-100 focus-visible:outline-hidden' : ''}`}
              >
                {columns.map((column, index) =>
                  index === 0 ? (
                    <th
                      key={column.key}
                      scope="row"
                      className={`sticky left-0 z-10 px-3 py-2 text-left font-semibold whitespace-nowrap print:static ${
                        highlighted
                          ? 'bg-orange-50 shadow-[inset_3px_0_0_var(--color-orange-600)]'
                          : 'bg-white'
                      } ${onRowClick ? focusRingClass(index, columns.length) : ''}`}
                    >
                      {column.cell(row)}
                      {highlighted && (
                        <span className="sr-only print:not-sr-only print:ml-0.5 print:font-normal">
                          （{marker}）
                        </span>
                      )}
                    </th>
                  ) : (
                    <td
                      key={column.key}
                      className={`num px-3 py-2 whitespace-nowrap ${alignClass[column.align ?? 'right']} ${
                        onRowClick ? focusRingClass(index, columns.length) : ''
                      }`}
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
