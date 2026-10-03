import { useEffect, useId, useRef, useState } from 'react'
import { Breadcrumb } from '../components/layout/Breadcrumb'
import { SourceNote } from '../components/SourceNote'
import { AdSlot } from '../components/ui/AdSlot'
import { ShareButton } from '../components/ui/ShareButton'
import { Link } from '../router/Link'
import { SITE } from '../site'
import { standardLabel } from '../standards'
import { CATEGORY_LABELS, type ToolDefinition } from '../tools/registry'
import { ChipNav, type ChipLink } from './content/PageHeader'
import { NoteLinks } from './notes/NoteLayout'
import { NOTES_INDEX_META, notesForTool } from './notes/notePages'
import { sheetsForTool } from './print/printPages'
import { SCREW_INDEX_META, SCREW_PAGES } from './screws/screwPages'
import { tablePagesOf } from './tables/tablePages'

/** ツールのページから案内する、静的な寸法表・まとめのページ */
function relatedPages(toolPath: string): { title: string; links: ChipLink[] } | null {
  const tables = tablePagesOf(toolPath)
  if (tables.length > 0) {
    return { title: '寸法表を一覧で見る', links: tables.map((page) => ({ to: page.path, label: page.label })) }
  }
  if (toolPath === '/tap-drill' || toolPath === '/bolt-size') {
    return {
      title: 'ねじのサイズ別まとめ（下穴・二面幅・ボルト穴・座ぐり）',
      links: [
        ...SCREW_PAGES.map((page) => ({ to: page.path, label: page.label })),
        { to: SCREW_INDEX_META.path, label: '一覧表' },
      ],
    }
  }
  return null
}

/**
 * 見出しの下の説明文。スマホ（sm 未満）では2行に縮め、入力欄が最初の画面に入るようにする。
 * 文章は縮めても DOM に残る（検索エンジン・読み上げソフトには全文が届く）。
 * 2行に収まらないときは「続きを読む」で全文を出せる。測るまで（事前レンダリング・最初の描画）もボタンを出しておく
 * （どのツールの説明文も、スマホの2行（約40字）より長い。後からボタンが出て表示がずれないように）
 */
function ToolDescription({ text }: { text: string }) {
  const id = useId()
  const ref = useRef<HTMLParagraphElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [clamped, setClamped] = useState<boolean | null>(null)

  useEffect(() => {
    const element = ref.current
    if (!element || expanded) return
    const measure = () => setClamped(element.scrollHeight > element.clientHeight + 1)
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [expanded])

  return (
    <div className="mt-2 max-w-3xl">
      <p
        id={id}
        ref={ref}
        className={`text-sm leading-relaxed text-zinc-600 sm:text-base ${expanded ? '' : 'max-sm:line-clamp-2'} print:line-clamp-none`}
      >
        {text}
      </p>
      {(expanded || clamped !== false) && (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded(!expanded)}
          className="-mb-2 inline-flex min-h-10 items-center text-xs font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900 sm:hidden print:hidden"
        >
          {expanded ? '閉じる' : '続きを読む'}
        </button>
      )}
    </div>
  )
}

export function ToolPage({ tool }: { tool: ToolDefinition }) {
  const { component: ToolComponent, guide: Guide, icon: Icon } = tool
  const related = relatedPages(tool.path)
  const notes = notesForTool(tool.path)
  const sheets = sheetsForTool(tool.path)

  return (
    <>
      <div className="mb-5 sm:mb-6">
        <Breadcrumb current={tool.navLabel} />
        <p className="mt-4 text-xs font-semibold tracking-wider text-orange-700">
          {CATEGORY_LABELS[tool.category]}
        </p>
        <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          <Icon className="size-7 shrink-0 text-zinc-400" aria-hidden />
          {tool.name}
        </h1>
        <ToolDescription text={tool.description} />
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <ul className="flex flex-wrap gap-1.5" aria-label="参照規格">
            {tool.standards.map((code) => (
              <li
                key={code}
                className="num rounded-sm border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-700"
              >
                {standardLabel(code)}
              </li>
            ))}
          </ul>
          <div className="ml-auto">
            <ShareButton title={tool.name} />
          </div>
        </div>
      </div>

      <ToolComponent />

      {/* 広告（設定したときだけ）。条件と結果のあいだには置かず、ツールの後とページの最後の2か所だけ */}
      <AdSlot slot={SITE.adSlots.afterTool} />

      {related && (
        <section className="mt-6 print:hidden" aria-labelledby="related-pages">
          <h2 id="related-pages" className="text-xs font-bold tracking-wider text-zinc-600">
            {related.title}
          </h2>
          <ChipNav label={related.title} className="mt-2" links={related.links} />
        </section>
      )}

      {sheets.length > 0 && (
        <section className="mt-4 print:hidden" aria-labelledby="print-sheets">
          <h2 id="print-sheets" className="text-xs font-bold tracking-wider text-zinc-600">
            印刷用 早見表（A4・QR コード付き）
          </h2>
          <ChipNav
            label="印刷用 早見表"
            className="mt-2"
            links={sheets.map((sheet) => ({ to: sheet.path, label: sheet.label }))}
          />
        </section>
      )}

      {notes.length > 0 && (
        <NoteLinks id="related-notes" title={`${NOTES_INDEX_META.label}（解説）`} pages={notes} className="mt-6" />
      )}

      {Guide && (
        <div className="mt-6">
          <Guide />
        </div>
      )}

      <AdSlot slot={SITE.adSlots.bottom} />

      <div className="mt-6">
        <SourceNote standards={tool.standards} />
        <p className="mt-2 text-xs text-zinc-600">
          数値の作り方と確認の状況は
          <Link to="/editorial-policy" className="mx-0.5 font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900">
            編集方針・データの確認方法
          </Link>
          にまとめています。
        </p>
      </div>
    </>
  )
}
