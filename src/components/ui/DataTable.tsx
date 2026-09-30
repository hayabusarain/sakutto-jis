import type { ReactNode } from 'react'

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
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-zinc-300 bg-zinc-50 text-xs text-zinc-600">
            {columns.map((column, index) => (
              <th
                key={column.key}
                scope="col"
                className={`px-3 py-2 font-semibold whitespace-nowrap ${alignClass[column.align ?? 'right']} ${
                  index === 0 ? 'sticky left-0 z-10 bg-zinc-50 text-left' : ''
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
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                aria-selected={isHighlighted ? highlighted : undefined}
                className={`border-b border-zinc-100 ${
                  highlighted ? 'bg-orange-50 font-semibold' : 'even:bg-zinc-50/60'
                } ${onRowClick ? 'cursor-pointer hover:bg-zinc-100' : ''}`}
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
