import { ExternalLink, MessageSquareWarning } from 'lucide-react'
import { Link } from '../router/Link'
import { REPORT_URL } from '../site'
import { JISC_URL, standardLabel, STANDARDS, type StandardCode } from '../standards'

interface SourceNoteProps {
  standards: readonly StandardCode[]
}

/** 各ツールの下に置く「参照規格・原文の確認先・誤記報告」 */
export function SourceNote({ standards }: SourceNoteProps) {
  return (
    <aside className="rounded-md border border-zinc-300 border-dashed bg-white/60 p-4 text-sm">
      <h2 className="text-xs font-bold tracking-wider text-zinc-500">参照規格</h2>
      <ul className="mt-2 space-y-1">
        {standards.map((code) => (
          <li key={code} className="flex flex-wrap gap-x-2">
            <span className="num font-semibold text-zinc-800">{standardLabel(code)}</span>
            <span className="text-zinc-600">{STANDARDS[code].title}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-zinc-500">
        本ツールのデータはJIS規格に基づき万全を期して作成していますが、実業務でのご使用時は必要に応じて公式の規格書をご確認ください。規格原文は
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
      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        <MessageSquareWarning className="mr-1 inline size-3.5 align-[-2px] text-orange-600" aria-hidden />
        数値の不備や誤記を見つけた場合は、
        {REPORT_URL ? (
          <a
            href={REPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            誤記報告フォーム
          </a>
        ) : (
          <Link
            to="/about#contact"
            className="font-semibold text-zinc-700 underline underline-offset-2 hover:text-zinc-900"
          >
            こちら
          </Link>
        )}
        からご連絡いただけると助かります。
      </p>
    </aside>
  )
}
