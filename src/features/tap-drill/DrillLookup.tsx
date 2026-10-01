import { Search } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { fixed, trim } from '../../lib/format'
import { threadName, threadsForDrill } from './calc'
import { TOLERANCE_GRADES, type ToleranceGrade } from './data'

interface DrillLookupProps {
  drill: number
  grade: ToleranceGrade
  selected: { d: number; p: number }
  onSelect: (d: number, p: number) => void
  className?: string
}

/** 逆引き「このドリルで立てられるねじ」 */
export function DrillLookup({ drill, grade, selected, onSelect, className = '' }: DrillLookupProps) {
  const matches = threadsForDrill(drill, grade)
  // 選んだ等級で1つも無いときは、ほかの等級なら入るねじを案内する
  const otherGrades =
    matches.length > 0
      ? []
      : TOLERANCE_GRADES.filter((g) => g !== grade)
          .map((g) => ({ grade: g, matches: threadsForDrill(drill, g).filter((m) => m.grade === g) }))
          .filter((entry) => entry.matches.length > 0)

  return (
    <Card title={`φ${trim(drill)} のドリルで立てられるねじ`} icon={Search} className={className}>
      <p className="text-xs leading-relaxed text-zinc-500">
        めねじ内径 D1 の許容範囲（{grade}H）に φ{trim(drill)} が入るメートルねじ（M1〜M68 の並目・細目）。タップすると、そのねじを選びます。
      </p>

      {matches.length > 0 ? (
        <ul className="mt-3 grid gap-2">
          {matches.map((match) => {
            const active = match.d === selected.d && match.p === selected.p
            return (
              <li key={`${match.d}x${match.p}`}>
                <button
                  type="button"
                  onClick={() => onSelect(match.d, match.p)}
                  aria-pressed={active}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-md border px-3 py-2 text-left ${
                    active
                      ? 'border-orange-600 bg-orange-50 shadow-[inset_3px_0_0_var(--color-orange-600)]'
                      : 'border-zinc-300 bg-white hover:border-zinc-500'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="num text-base font-bold text-zinc-900">{threadName(match.d, match.p)}</span>
                      <Badge tone={match.kind === 'coarse' ? 'dark' : 'neutral'}>
                        {match.kind === 'coarse' ? '並目' : '細目'}
                      </Badge>
                      {match.choice !== 1 && <Badge>第{match.choice}選択</Badge>}
                      {match.grade !== grade && <Badge tone="warning">{match.grade}H で判定</Badge>}
                    </span>
                    <span className="num mt-0.5 block text-xs text-zinc-500">
                      D1 {fixed(match.limits.min, 3)}〜{fixed(match.limits.max, 3)}
                      {match.note && <span className="font-sans">・{match.note}</span>}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[11px] text-zinc-500">ひっかかり率</span>
                    <span className="num text-sm font-semibold text-zinc-900">{fixed(match.engagement, 1)}%</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700" role="status">
          <p>{grade}H のめねじ内径の範囲に φ{trim(drill)} が入るねじはありません。</p>
          {otherGrades.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-xs">
              {otherGrades.map((entry) => (
                <li key={entry.grade}>
                  {entry.grade}H なら:{' '}
                  <span className="num font-semibold">
                    {entry.matches.map((m) => threadName(m.d, m.p)).join('、')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-3">
        <Citation code="JIS B 0209-1" suffix="のめねじ内径の公差で判定" />
      </div>
    </Card>
  )
}
