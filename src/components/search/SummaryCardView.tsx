import { ArrowRight, BookOpen, ChevronRight, Info } from 'lucide-react'
import { useId } from 'react'
import type { SummaryCard, SummarySection, SummaryTable } from '../../lib/quickSearch'
import { standardLabel, STANDARDS } from '../../standards'
import { QueryChips } from './QueryChips'
import { SearchLink } from './SearchLink'

/** 欄の数に合わせた並べ方（カードの幅で2列・3列にする。奇数のときは最後の欄を広げて隙間を作らない） */
function gridClass(count: number): string {
  if (count <= 1) return ''
  if (count === 2) return '@xl:grid-cols-2'
  if (count === 3) return '@xl:grid-cols-2 @xl:[&>:last-child]:col-span-2 @4xl:grid-cols-3 @4xl:[&>:last-child]:col-span-1'
  return '@xl:grid-cols-2 @xl:[&>:last-child:nth-child(odd)]:col-span-2'
}

function TableView({ table }: { table: SummaryTable }) {
  return (
    <div className="-mx-1 mt-1 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{table.caption}</caption>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th
                key={column}
                scope="col"
                className="border-b border-zinc-200 px-1 py-1.5 text-left text-[11px] font-semibold whitespace-nowrap text-zinc-500"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr
              key={row.cells.join('|')}
              className={`border-b border-zinc-100 last:border-b-0 ${row.highlight ? 'bg-orange-50' : ''}`}
            >
              {row.cells.map((cell, index) =>
                index === 0 ? (
                  <th key={index} scope="row" className="px-1 text-left font-semibold whitespace-nowrap">
                    {row.href ? (
                      <SearchLink
                        href={row.href}
                        className="num inline-flex min-h-10 items-center gap-0.5 text-zinc-900 underline decoration-zinc-300 underline-offset-4 hover:decoration-orange-600"
                      >
                        {cell}
                        <ChevronRight className="size-3.5 text-orange-600" aria-hidden />
                      </SearchLink>
                    ) : (
                      <span className="num inline-flex min-h-10 items-center text-zinc-500">{cell}</span>
                    )}
                  </th>
                ) : (
                  <td key={index} className="num px-1 py-1.5 text-zinc-800">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SectionView({ section }: { section: SummarySection }) {
  const id = useId()
  return (
    <section className="flex min-w-0 flex-col bg-white p-4" aria-labelledby={id}>
      <h4 id={id} className="text-xs font-bold tracking-wider text-zinc-500">
        {section.title}
      </h4>

      {section.rows.length > 0 && (
        <dl className="mt-1">
          {section.rows.map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap items-baseline justify-between gap-x-3 border-b border-zinc-100 py-2 last:border-b-0"
            >
              <dt className={`min-w-0 text-sm ${row.primary ? 'font-semibold text-zinc-900' : 'text-zinc-600'}`}>
                {row.label}
                {row.note && (
                  <span className="mt-0.5 block text-[11px] leading-snug font-normal text-zinc-500">{row.note}</span>
                )}
              </dt>
              <dd className="ml-auto flex items-baseline gap-1 text-right whitespace-nowrap">
                <span
                  className={`num font-semibold text-zinc-900 ${row.primary ? 'text-3xl font-bold tracking-tight' : 'text-lg'}`}
                >
                  {row.value}
                </span>
                {row.unit && <span className="text-xs text-zinc-500">{row.unit}</span>}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {section.table && <TableView table={section.table} />}

      {section.note && <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">{section.note}</p>}

      {section.links && section.links.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {section.links.map((link) => (
            <li key={link.href}>
              <SearchLink
                href={link.href}
                className="num inline-flex min-h-10 items-center gap-0.5 rounded-sm border border-zinc-300 bg-zinc-50 px-2.5 text-xs font-semibold text-zinc-800 hover:border-zinc-900"
              >
                {link.label}
                <ChevronRight className="size-3.5 text-orange-600" aria-hidden />
              </SearchLink>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-3">
        <p className="flex min-w-0 items-start gap-1 text-[11px] leading-snug text-zinc-500">
          <BookOpen className="mt-px size-3 shrink-0" aria-hidden />
          <span>
            <span className="sr-only">典拠: </span>
            {section.standards.map((code, index) => (
              <span key={code} title={STANDARDS[code].title}>
                {index > 0 && '・'}
                <span className="num whitespace-nowrap">{standardLabel(code)}</span>
              </span>
            ))}
          </span>
        </p>
        <SearchLink
          href={section.href}
          className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1 rounded-sm bg-zinc-900 px-3 text-sm font-semibold text-white hover:bg-zinc-700"
        >
          {section.linkLabel}
          <ArrowRight className="size-3.5 text-orange-400" aria-hidden />
        </SearchLink>
      </div>
    </section>
  )
}

/** 1つの呼びについての、まとめカード */
export function SummaryCardView({ card }: { card: SummaryCard }) {
  const id = useId()
  return (
    <article className="@container overflow-hidden rounded-md border border-zinc-300 bg-white" aria-labelledby={id}>
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 bg-zinc-900 px-4 py-3 text-white">
        <h3 id={id} className="num text-2xl font-bold tracking-tight">
          {card.title}
        </h3>
        <p className="text-xs font-semibold tracking-wider text-orange-400">{card.kind}</p>
      </header>

      {card.notes.length > 0 && (
        <ul className="space-y-1 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-950">
          {card.notes.map((note) => (
            <li key={note} className="flex gap-1.5">
              <Info className="mt-0.5 size-3.5 shrink-0 text-amber-600" aria-hidden />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={`grid gap-px bg-zinc-200 ${gridClass(card.sections.length)}`}>
        {card.sections.map((section) => (
          <SectionView key={section.title} section={section} />
        ))}
      </div>

      {card.related.length > 0 && (
        <QueryChips label="関連" queries={card.related} className="border-t border-zinc-200 bg-zinc-50 px-4 py-2.5" />
      )}
    </article>
  )
}
