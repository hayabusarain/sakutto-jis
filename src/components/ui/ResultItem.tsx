interface ResultItemProps {
  label: string
  /** 未計算のときは「—」を表示する */
  value?: string
  unit?: string
  /** 一番見てほしい結果を大きく表示する */
  primary?: boolean
  note?: string
}

export function ResultItem({ label, value, unit, primary = false, note }: ResultItemProps) {
  const display = value ?? '—'

  if (primary) {
    return (
      <div className="rounded-xl bg-blue-700 p-4 text-white">
        <dt className="text-sm font-semibold text-blue-100">{label}</dt>
        <dd className="mt-1 flex items-baseline gap-1.5">
          <span className="text-4xl font-bold tabular-nums tracking-tight">{display}</span>
          {unit && <span className="text-lg font-semibold text-blue-100">{unit}</span>}
        </dd>
        {note && <p className="mt-1 text-xs text-blue-100">{note}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 py-2.5 last:border-b-0">
      <dt className="text-sm text-slate-600">{label}</dt>
      <dd className="flex items-baseline gap-1 text-right">
        <span className="text-lg font-bold tabular-nums text-slate-900">{display}</span>
        {unit && <span className="text-sm text-slate-500">{unit}</span>}
      </dd>
    </div>
  )
}
