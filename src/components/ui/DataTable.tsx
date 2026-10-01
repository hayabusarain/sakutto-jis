import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

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
  onRowClick?: (row: T) => void
  caption?: string
  /** 縦にも長い表で高さを制限する（例: max-h-[32rem]）。見出し行は固定される */
  maxHeightClass?: string
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

/** 寸法表。スマホでは横スクロール、1列目は固定表示 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isHighlighted,
  onRowClick,
  caption,
  maxHeightClass,
}: DataTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const highlightedRow = rows.find((row) => isHighlighted?.(row))
  const highlightedId = highlightedRow === undefined ? null : rowKey(highlightedRow)

  // 高さを制限した表では、選択中の行が見えるように表の中だけスクロールする
  useEffect(() => {
    const container = containerRef.current
    if (!maxHeightClass || !container || highlightedId === null) return
    const row = container.querySelector<HTMLElement>(`[data-row-key="${CSS.escape(highlightedId)}"]`)
    if (!row) return
    const header = container.querySelector('thead')?.getBoundingClientRect().height ?? 0
    const top = row.offsetTop - header
    const bottom = row.offsetTop + row.offsetHeight
    if (top < container.scrollTop || bottom > container.scrollTop + container.clientHeight) {
      container.scrollTop = top - (container.clientHeight - header - row.offsetHeight) / 2
    }
  }, [highlightedId, maxHeightClass])

  const handleKeyDown = (event: KeyboardEvent<HTMLTableRowElement>, row: T) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onRowClick?.(row)
    }
  }

  return (
    <div ref={containerRef} className={`overflow-auto ${maxHeightClass ?? ''}`}>
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="sticky top-0 z-20">
          <tr className="border-b border-zinc-300 bg-zinc-50 text-xs text-zinc-600">
            {columns.map((column, index) => (
              <th
                key={column.key}
                scope="col"
                className={`px-3 py-2 font-semibold whitespace-nowrap ${
                  index === 0
                    ? 'sticky left-0 z-10 bg-zinc-50 text-left'
                    : `bg-zinc-50 ${alignClass[column.align ?? 'right']}`
                }`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const highlighted = isHighlighted?.(row) ?? false
            return (
              <tr
                key={rowKey(row)}
                data-row-key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => handleKeyDown(event, row) : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                aria-selected={isHighlighted ? highlighted : undefined}
                className={`border-b border-zinc-100 ${
                  highlighted ? 'bg-orange-50 font-semibold' : 'even:bg-zinc-50/60'
                } ${onRowClick ? 'cursor-pointer hover:bg-zinc-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-500' : ''}`}
              >
                {columns.map((column, index) =>
                  index === 0 ? (
                    <th
                      key={column.key}
                      scope="row"
                      className={`sticky left-0 z-10 px-3 py-2 text-left font-semibold whitespace-nowrap ${
                        highlighted
                          ? 'bg-orange-50 shadow-[inset_3px_0_0_var(--color-orange-600)]'
                          : 'bg-white'
                      }`}
                    >
                      {column.cell(row)}
                    </th>
                  ) : (
                    <td
                      key={column.key}
                      className={`num px-3 py-2 whitespace-nowrap ${alignClass[column.align ?? 'right']}`}
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
