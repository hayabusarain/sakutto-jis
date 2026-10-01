import { ChevronDown, Info } from 'lucide-react'
import type { ReactNode } from 'react'

interface FormulaInfoProps {
  title?: string
  children: ReactNode
}

/** 「どうしてこの数字になったのか」を開いて確認できる計算ロジックの説明 */
export function FormulaInfo({ title = '計算ロジック', children }: FormulaInfoProps) {
  return (
    <details className="group rounded-md border border-zinc-200 bg-zinc-50 text-sm">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 font-semibold text-zinc-700 select-none hover:text-zinc-900 [&::-webkit-details-marker]:hidden">
        <Info className="size-4 shrink-0 text-orange-600" aria-hidden />
        {title}
        <ChevronDown
          className="ml-auto size-4 shrink-0 text-zinc-500 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <div className="space-y-3 border-t border-zinc-200 px-3 py-3 leading-relaxed text-zinc-700">
        {children}
      </div>
    </details>
  )
}

/** 計算式を等幅で1行に表示する（長い式は横にスクロール。印刷では紙の幅で折り返す） */
export function Formula({ children }: { children: ReactNode }) {
  return (
    <p className="num overflow-x-auto rounded-sm border border-zinc-200 bg-white px-3 py-2 text-[13px] whitespace-nowrap text-zinc-900 print:overflow-visible print:whitespace-normal print:wrap-anywhere">
      {children}
    </p>
  )
}

/** 式に出てくる記号の説明リスト */
export function FormulaLegend({ items }: { items: readonly (readonly [ReactNode, ReactNode])[] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
      {items.map(([symbol, meaning], index) => (
        <div key={index} className="contents">
          <dt className="num font-semibold text-zinc-900">{symbol}</dt>
          <dd className="text-zinc-600">{meaning}</dd>
        </div>
      ))}
    </dl>
  )
}
