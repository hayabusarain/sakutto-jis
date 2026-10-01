import type { ReactNode } from 'react'

interface ResultItemProps {
  label: string
  /** 未計算のときは「—」を表示する */
  value?: ReactNode
  unit?: string
  note?: ReactNode
}

/** 結果の1行（ラベルと値）。dl の中で使う */
export function ResultItem({ label, value, unit, note }: ResultItemProps) {
  return (
    <div className="border-b border-zinc-100 py-2.5 last:border-b-0">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-sm text-zinc-600">{label}</dt>
        <dd className="flex shrink-0 items-baseline gap-1 text-right whitespace-nowrap">
          <span className="num text-lg font-semibold text-zinc-900">{value ?? '—'}</span>
          {unit && <span className="text-sm text-zinc-500">{unit}</span>}
        </dd>
      </div>
      {note && <p className="mt-0.5 text-right text-xs text-zinc-600">{note}</p>}
    </div>
  )
}

interface PrimaryResultProps {
  label: string
  value?: ReactNode
  unit?: string
  children?: ReactNode
}

/** 一番見てほしい結果。暗いパネルに大きな数字で表示する */
export function PrimaryResult({ label, value, unit, children }: PrimaryResultProps) {
  return (
    <div className="rounded-md bg-zinc-900 p-4 text-white">
      <p className="text-xs font-semibold tracking-wider text-zinc-400">{label}</p>
      {/* 桁の多い値（入力の打ち間違いなど）でもスマホの幅からはみ出さないよう、折り返せるようにする */}
      <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
        <span className="num min-w-0 text-4xl font-bold wrap-anywhere sm:text-5xl">{value ?? '—'}</span>
        {unit && <span className="text-lg font-semibold text-zinc-400">{unit}</span>}
      </p>
      {children && <div className="mt-2 text-xs leading-relaxed text-zinc-300">{children}</div>}
    </div>
  )
}
