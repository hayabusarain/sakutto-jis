import { ExternalLink, MessageSquareWarning } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { Link } from '../router/Link'
import { reportHref } from '../site'
import { JISC_URL, standardLabel, standardNote, STANDARDS, type StandardCode } from '../standards'

interface SourceNoteProps {
  standards: readonly StandardCode[]
}

/** 各ツールの下に置く「参照規格・原文の確認先・誤記報告」 */
export function SourceNote({ standards }: SourceNoteProps) {
  return (
    <aside className="rounded-md border border-zinc-300 border-dashed bg-white/60 p-4 text-sm">
      {standards.length > 0 && (
        <>
          <h2 className="text-xs font-bold tracking-wider text-zinc-500">参照規格</h2>
          <ul className="mt-2 mb-3 space-y-1">
            {standards.map((code) => (
              <li key={code} className="flex flex-wrap gap-x-2">
                <span className="num font-semibold text-zinc-800">{standardLabel(code)}</span>
                <span className="text-zinc-600">{STANDARDS[code].title}</span>
                {standardNote(code) && (
                  <span className="basis-full text-xs leading-relaxed text-zinc-500">{standardNote(code)}。</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
      {standards.length === 0 && (
        // 規格の表を使わないツール（単位換算）は、単位の定義から計算している
        <p className="mb-2 text-xs leading-relaxed text-zinc-500">
          換算係数は単位の定義値（<span className="num whitespace-nowrap">1 in = 25.4 mm</span>、
          <span className="num whitespace-nowrap">1 kgf = 9.80665 N</span> など）から計算しています。
        </p>
      )}
      <p className="text-xs leading-relaxed text-zinc-500">
        本ツールのデータはJIS規格に基づき万全を期して作成しておりますが、実業務でのご使用時は必要に応じて公式規格書をご確認ください。規格原文は
        <a
          href={JISC_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-0.5 inline-flex items-center gap-0.5 font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
        >
          日本産業標準調査会（JISC）
          <ExternalLink className="size-3" aria-hidden />
        </a>
        のJIS検索で閲覧できます。
      </p>
      <ReportLink />
    </aside>
  )
}

const subscribeNothing = () => () => {}
const readPageUrl = () => window.location.href

/**
 * 「この値、違っていませんか？」の誤記報告。フォームがあれば、今のページ（条件付きの URL）を入れた状態で開く。
 * URL は事前レンダリングと食い違わないよう、表示後に読む
 */
function ReportLink() {
  const pageUrl = useSyncExternalStore(subscribeNothing, readPageUrl, () => null)
  const href = reportHref(pageUrl)
  const className =
    'mt-3 inline-flex min-h-10 items-center gap-1.5 rounded-sm border border-orange-300 bg-orange-50 px-3 text-xs font-semibold text-orange-900 hover:border-orange-500'
  const label = (
    <>
      <MessageSquareWarning className="size-4 shrink-0 text-orange-600" aria-hidden />
      この値、違っていませんか？（誤記を報告）
    </>
  )
  return (
    <div>
      {href ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
          {label}
        </a>
      ) : (
        <Link to="/about#contact" className={className}>
          {label}
        </Link>
      )}
      <p className="mt-1 text-xs leading-relaxed text-zinc-500">
        どのページのどの値かを教えていただければ、原文で確かめて直します。
      </p>
    </div>
  )
}
