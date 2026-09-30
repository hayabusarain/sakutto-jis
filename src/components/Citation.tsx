import { BookOpen } from 'lucide-react'
import { standardLabel, STANDARDS, type StandardCode } from '../standards'

interface CitationProps {
  code: StandardCode
  /** 表番号など、規格内の該当箇所（原文で確認できたものだけ書く） */
  detail?: string
  /** 「準拠」「から計算」など */
  suffix?: string
}

/** 数値のすぐ近くに置く、典拠となったJIS規格の表示 */
export function Citation({ code, detail, suffix = '準拠' }: CitationProps) {
  return (
    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-zinc-500">
      <BookOpen className="mt-0.5 size-3.5 shrink-0" aria-hidden />
      <span>
        <span className="num font-semibold text-zinc-700">{standardLabel(code)}</span>
        （{STANDARDS[code].title}）{detail && ` ${detail}`} {suffix}
      </span>
    </p>
  )
}
