import { ChevronRight } from 'lucide-react'
import { SourceNote } from '../../components/SourceNote'
import { Link } from '../../router/Link'
import { PageHeader } from '../content/PageHeader'
import { NoteDate } from './NoteLayout'
import { NOTE_PAGES, NOTES_INDEX_META } from './notePages'

/** 現場メモの一覧（/notes） */
export function NotesIndexPage() {
  const meta = NOTES_INDEX_META
  const standards = [...new Set(NOTE_PAGES.flatMap((page) => page.standards))]

  return (
    <>
      <PageHeader
        trail={meta.breadcrumb}
        category={meta.category}
        title={meta.h1}
        lead={
          <p>
            現場や設計でよく迷う点を、JIS 規格の数値と計算例で解説します。記事の数値は、各ツールと同じデータ・計算から出しています。
          </p>
        }
      />

      <ul className="max-w-3xl space-y-3">
        {NOTE_PAGES.map((page) => (
          <li key={page.path}>
            <article className="rounded-md border border-zinc-200 bg-white">
              <h2 className="text-base font-bold text-zinc-900">
                <Link
                  to={page.path}
                  className="flex min-h-11 items-center gap-2 px-4 pt-3 pb-1 hover:text-zinc-700 hover:underline hover:decoration-orange-600 hover:underline-offset-4"
                >
                  <span className="min-w-0 flex-1">{page.h1}</span>
                  <ChevronRight className="size-4 shrink-0 text-orange-600" aria-hidden />
                </Link>
              </h2>
              <div className="space-y-1 px-4 pb-3">
                <NoteDate path={page.path} />
                <p className="text-sm leading-relaxed text-zinc-600">{page.description}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>

      <div className="mt-6 max-w-3xl">
        <SourceNote standards={standards} />
      </div>
    </>
  )
}
