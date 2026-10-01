import type { ReactNode } from 'react'

/**
 * 表の書き出しボタン（TableExport）の置き場所。
 * 見出しとボタンが並ぶと狭い画面で見出しが3行に折り返すので、sm 以上はカードの見出しの右（aside）、
 * スマホでは本文の先頭に置く。同じ TableExport を両方に渡し、片方だけ表示する。
 */
export function ExportInAside({ children }: { children: ReactNode }) {
  return <div className="hidden shrink-0 whitespace-nowrap sm:block">{children}</div>
}

export function ExportInBody({ children }: { children: ReactNode }) {
  return <div className="flex justify-end px-4 pt-3 sm:hidden">{children}</div>
}
