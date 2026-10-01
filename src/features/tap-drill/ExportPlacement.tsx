import type { ReactNode } from 'react'

/*
 * 表の書き出しボタン（TableExport）の置き場所。
 * カード見出しの横（aside）に置くと、スマホ幅では見出しとボタンが押し合って崩れるので、
 * sm 未満では表の上の行に出す。同じ要素を両方に渡し、片方だけを表示する。
 */

/** Card の aside に渡す（sm 以上で表示） */
export function ExportAside({ children }: { children: ReactNode }) {
  return <div className="hidden sm:block">{children}</div>
}

/** Card の本文の先頭に置く（sm 未満で表示） */
export function ExportBar({ children }: { children: ReactNode }) {
  return <div className="flex justify-end px-4 pt-3 sm:hidden">{children}</div>
}
