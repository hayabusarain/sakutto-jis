import { Check, Copy, PencilRuler, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Card } from '../../components/ui/Card'
import { NumberField } from '../../components/ui/NumberField'
import { copyText } from '../../lib/clipboard'
import { parseNumber } from '../../lib/format'
import { drawingCallout } from './calc'
import type { ToleranceGrade } from './data'

interface DrawingCalloutProps {
  d: number
  p: number
  grade: ToleranceGrade
  /** 推奨下穴径（無いときは作れない） */
  hole: number | null
  className?: string
}

/** 深さ欄の確認。空欄は「指定なし」 */
function depthStatus(text: string): { value: number | null; error?: string } {
  if (text.trim() === '') return { value: null }
  const value = parseNumber(text)
  if (value === null) return { value: null, error: '数字で入力してください（例: 20）' }
  if (value <= 0) return { value: null, error: '0 より大きい値を入力してください' }
  return { value }
}

/**
 * 図面のめねじ指示（表記例）を作ってコピーする。
 * 結果のコピー（CopyButton）と違い、図面・CAD に貼る文字列だけをコピーする（URL を付けない）。
 */
export function DrawingCallout({ d, p, grade, hole, className = '' }: DrawingCalloutProps) {
  // 深さは図面ごとに変わるので、端末や URL には保存しない
  const [threadDepthText, setThreadDepthText] = useState('')
  const [holeDepthText, setHoleDepthText] = useState('')
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const timer = window.setTimeout(() => setStatus('idle'), 2000)
    return () => window.clearTimeout(timer)
  }, [status])

  const threadDepth = depthStatus(threadDepthText)
  const holeDepth = depthStatus(holeDepthText)
  const shallowHole =
    threadDepth.value !== null && holeDepth.value !== null && holeDepth.value < threadDepth.value

  const callout =
    hole === null
      ? null
      : drawingCallout({ d, p, grade, hole, threadDepth: threadDepth.value, holeDepth: holeDepth.value })

  const handleCopy = async () => {
    if (callout === null) return
    setStatus((await copyText(callout)) ? 'copied' : 'failed')
  }

  return (
    <Card title="図面指示（表記例）" icon={PencilRuler} className={className}>
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="ねじ深さ（任意）"
          value={threadDepthText}
          onChange={setThreadDepthText}
          placeholder="例: 20"
          unit="mm"
          error={threadDepth.error}
        />
        <NumberField
          label="下穴深さ（任意）"
          value={holeDepthText}
          onChange={setHoleDepthText}
          placeholder="例: 25"
          unit="mm"
          error={holeDepth.error}
          warning={shallowHole ? '下穴がねじ深さより浅くなっています' : undefined}
        />
      </div>

      <div className="mt-3 rounded-md border border-zinc-300 bg-zinc-50 p-3">
        <p className="text-[11px] font-semibold tracking-wider text-zinc-500">表記例</p>
        <p className="num mt-1 text-lg font-bold break-all text-zinc-900">{callout ?? '—'}</p>
        <button
          type="button"
          onClick={handleCopy}
          disabled={callout === null}
          className="mt-2 inline-flex h-10 items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 hover:border-zinc-500 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 print:hidden"
        >
          {status === 'copied' ? (
            <Check className="size-4 text-emerald-600" aria-hidden />
          ) : status === 'failed' ? (
            <X className="size-4 text-red-600" aria-hidden />
          ) : (
            <Copy className="size-4" aria-hidden />
          )}
          <span aria-live="polite">
            {status === 'copied' ? 'コピーしました' : status === 'failed' ? 'コピーできませんでした' : '図面指示をコピー'}
          </span>
        </button>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-zinc-500">
        書き方の一例です。記号や書き順は、図面のルール（社内の製図規定など）に合わせてください。下穴径は推奨下穴径（{grade}H）、「深さ」はその直前の項目（ねじ・下穴）の深さです。並目はピッチを省いています。
      </p>
    </Card>
  )
}
