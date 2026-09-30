import { Check, Copy, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { usePersistentState } from '../../hooks/usePersistentState'
import { copyText } from '../../lib/clipboard'
import { counterboreCallout, holeCallout, holeOf, type CalloutStyle } from './calc'
import { isUnverified, type BoltSize, type HoleClass } from './data'
import { Mark } from './Mark'

const STYLE_OPTIONS = [
  { value: 'current', label: '現行（記号）' },
  { value: 'legacy', label: '従来（文字）' },
] as const

const isCalloutStyle = (value: unknown): value is CalloutStyle => value === 'current' || value === 'legacy'

const COUNT_OPTIONS = Array.from({ length: 24 }, (_, i) => ({ value: String(i + 1), label: `${i + 1} 個` }))

/** 図面に貼る文字だけをコピーする（「結果をコピー」と違い URL を付けない） */
function CopyTextButton({ text, label }: { text: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [status])

  return (
    <button
      type="button"
      onClick={async () => setStatus((await copyText(text)) ? 'copied' : 'failed')}
      aria-label={`${label}の図面指示「${text}」をコピー`}
      className="inline-flex h-10 shrink-0 items-center gap-1 rounded-sm border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 print:hidden"
    >
      {status === 'copied' ? (
        <Check className="size-3.5 text-emerald-600" aria-hidden />
      ) : status === 'failed' ? (
        <X className="size-3.5 text-red-600" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
      <span aria-live="polite">{status === 'copied' ? 'コピー済み' : status === 'failed' ? '失敗' : 'コピー'}</span>
    </button>
  )
}

function CalloutLine({
  label,
  text,
  mark = false,
  empty,
}: {
  label: string
  text: string | null
  mark?: boolean
  empty: string
}) {
  return (
    <div className="border-b border-zinc-100 py-2.5 last:border-b-0">
      <p className="text-xs font-semibold text-zinc-600">{label}</p>
      {text === null ? (
        <p className="mt-1 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="mt-1 flex items-center gap-2">
          <p className="num min-w-0 flex-1 rounded-sm border border-zinc-200 bg-zinc-50 px-2.5 py-2 text-base font-semibold break-all text-zinc-900">
            {text}
            <Mark show={mark} />
          </p>
          <CopyTextButton text={text} label={label} />
        </div>
      )}
    </div>
  )
}

/** 通し穴と六角穴付きボルト用の座ぐりを、図面の穴指示の形にする（書き方は参考） */
export function CalloutPanel({ size, holeClass }: { size: BoltSize; holeClass: HoleClass }) {
  const [style, setStyle] = usePersistentState<CalloutStyle>('callout-style', 'current', isCalloutStyle)
  const [count, setCount] = useState('1')
  const n = Number(count)
  const hole = holeOf(size, holeClass)

  return (
    <div className="grid gap-4">
      <div className="grid gap-4">
        <SegmentedControl label="書き方" value={style} options={STYLE_OPTIONS} onChange={setStyle} />
        <SelectField label="穴の数" value={count} options={COUNT_OPTIONS} onChange={setCount} stepper />
      </div>

      <div>
        <CalloutLine
          label={`M${size.d} ボルトの通し穴（${holeClass}）`}
          text={hole === null ? null : holeCallout(n, hole, style)}
          mark={holeClass === '4級' && isUnverified('hole4', size.d)}
          empty={`M${size.d} の ${holeClass} は表にありません`}
        />
        <CalloutLine
          label={`M${size.d} 六角穴付きボルトの深座ぐり（参考値）`}
          text={size.counterbore ? counterboreCallout(n, size.counterbore, style) : null}
          empty={`M${size.d} の座ぐりの参考値は確認中です`}
        />
      </div>

      <div className="space-y-1 text-xs leading-relaxed text-zinc-500">
        <p>
          {style === 'current'
            ? '現行: 穴の数は「×」、深ざぐりは記号 ⌴、深さは記号 ↧ で書きます。CADのフォントによっては ⌴・↧ が表示されないことがあります。'
            : '従来: 穴の数は「-」、「キリ」「深ザグリ」「深さ」と文字で書く、以前から図面で使われている書き方です。'}
        </p>
        <p>
          書き方の例です（参考）。記号の形や並べ方は、JIS B 0001（機械製図）や社内の製図ルールで確かめてください。座ぐりの寸法は規格本体の規定ではなく、設計でよく使われる参考値です。
        </p>
      </div>
    </div>
  )
}
