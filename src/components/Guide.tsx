import type { ReactNode } from 'react'

/**
 * ツールページ下部の「解説・よくある質問」。検索から来た人が知りたいことに、ページ内で答える。
 * 数値はできるだけ data.ts・calc.ts から計算して表示し、手書きしない（表と食い違わないように）。
 */
export function GuideSection({ title = '解説・よくある質問', children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-md border border-zinc-200 bg-white p-5 sm:p-6" aria-labelledby="guide-heading">
      <h2 id="guide-heading" className="border-l-2 border-orange-600 pl-2 text-base font-bold text-zinc-900">
        {title}
      </h2>
      <div className="mt-4 space-y-5 text-sm leading-relaxed text-zinc-700">{children}</div>
    </section>
  )
}

/** 質問と答え。質問は h3 にする */
export function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="font-bold text-zinc-900">{q}</h3>
      <div className="mt-1 space-y-2 [&_a]:font-semibold [&_a]:text-zinc-900 [&_a]:underline [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  )
}
