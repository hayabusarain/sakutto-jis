import { ClipboardList, PencilRuler, Table2, Wrench } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { RelatedLinks, type RelatedLink } from '../../components/RelatedLinks'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { StickyResult } from '../../components/ui/StickyResult'
import { TableExport } from '../../components/ui/TableExport'
import { useToolState } from '../../hooks/useToolState'
import { fixed } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { standardLabel } from '../../standards'
import { findFlange } from '../flange-bolt/calc'
import {
  findPipeThread,
  gInternalCalloutWithDrill,
  gMinorLimits,
  gRecommendedDrill,
  pipeThreadDesignation,
  pitch,
  rcInnerMinorDiameter,
  rPipeEndDiameter,
  rUsefulEndDiameter,
  threadHeight,
} from './calc'
import { G_INTERNAL_MINOR_TOLERANCE, PIPE_THREAD_SIZES, THREAD_KINDS, type PipeThreadSize } from './data'
import { DEFAULT_INPUT, isPipeThreadInput, KIND_KEYS, normalizePipeThreadInput } from './input'
import { TextCopyButton } from './TextCopyButton'

const SIZE_OPTIONS = PIPE_THREAD_SIZES.map((t) => ({
  value: t.size,
  label: `${t.size}${t.pipeA ? `（${t.pipeA}）` : ''}`,
}))

/** よく使うサイズ（ボタンで1タップ） */
const QUICK_SIZES = ['1/4', '3/8', '1/2', '3/4', '1'] as const

const KIND_OPTIONS = KIND_KEYS.map((kind) => ({ value: kind, label: kind }))

const RESULT_ID = 'pipe-thread-result'

const round4 = (value: number) => Number(value.toFixed(4))

const EXPORT_HEADERS = [
  '呼び',
  '管の呼び径',
  '山数 [山/25.4mm]',
  'ピッチ P [mm]',
  'ねじ山の高さ h [mm]',
  '外径 d [mm]',
  '有効径 d2 [mm]',
  '谷径 d1 [mm]',
  '基準の長さ a [mm]',
  'R 有効ねじ部の最小長さ [mm]',
  'Rc 有効ねじ部の最小長さ l [mm]',
  'R 管端の外径（計算値） [mm]',
  'G めねじ内径 最小 [mm]',
  'G めねじ内径 最大 [mm]',
  'G 推奨下穴径（計算値） [mm]',
  'Rc 奥端のめねじ内径（計算値） [mm]',
] as const

const EXPORT_ROWS = PIPE_THREAD_SIZES.map((t) => {
  const g = gMinorLimits(t)
  return [
    t.size,
    t.pipeA ?? '',
    t.tpi,
    round4(pitch(t.tpi)),
    round4(threadHeight(t.tpi)),
    t.d,
    t.d2,
    t.d1,
    t.gaugeLength,
    t.usefulExternal,
    t.usefulInternalRc,
    rPipeEndDiameter(t),
    g.min,
    g.max,
    gRecommendedDrill(t),
    rcInnerMinorDiameter(t),
  ]
})

const EXPORT_NOTE = `典拠: ${standardLabel('JIS B 0203')}（管用テーパねじ）・${standardLabel('JIS B 0202')}（管用平行ねじ）の基準寸法。外径・有効径・谷径はテーパねじでは基準径の位置の値。ピッチ・山の高さ・R 管端の外径・G 推奨下穴径・Rc 奥端内径は基準寸法から計算した値（空欄は未確認）。サクッとJIS`

interface CalloutLine {
  label: string
  text: string
  /** 計算値を含むときの注記 */
  computed?: boolean
}

function calloutLines(kind: keyof typeof THREAD_KINDS, thread: PipeThreadSize): CalloutLine[] {
  switch (kind) {
    case 'R':
      return [{ label: 'おねじ', text: pipeThreadDesignation('R', thread.size) }]
    case 'Rc':
      return [{ label: 'めねじ', text: pipeThreadDesignation('Rc', thread.size) }]
    case 'Rp':
      return [{ label: 'めねじ', text: pipeThreadDesignation('Rp', thread.size) }]
    case 'G':
      return [
        { label: 'めねじ', text: pipeThreadDesignation('G', thread.size) },
        { label: 'めねじ（下穴の注記付き）', text: gInternalCalloutWithDrill(thread), computed: true },
        { label: 'おねじ（A級）', text: pipeThreadDesignation('G', thread.size, 'A') },
        { label: 'おねじ（B級）', text: pipeThreadDesignation('G', thread.size, 'B') },
      ]
  }
}

export function PipeThreadTool() {
  const [input, setInput] = useToolState('pipe-thread', DEFAULT_INPUT, isPipeThreadInput, normalizePipeThreadInput)
  const thread = findPipeThread(input.size) ?? PIPE_THREAD_SIZES[1]
  const kind = THREAD_KINDS[input.kind]
  const name = `${input.kind}${thread.size}`
  const p = pitch(thread.tpi)
  const h = threadHeight(thread.tpi)
  const gLimits = gMinorLimits(thread)
  const gDrill = gRecommendedDrill(thread)
  const rcInner = rcInnerMinorDiameter(thread)
  const rEnd = rPipeEndDiameter(thread)
  const rUsefulEnd = rUsefulEndDiameter(thread)

  let primary: { label: string; short: string; value?: string; note: string }
  if (input.kind === 'G') {
    primary = {
      label: `推奨下穴径（計算値・${name}）`,
      short: `${name} 推奨下穴径（計算値）`,
      value: fixed(gDrill, 1),
      note: `めねじ内径の許容範囲 ${fixed(gLimits.min, 3)}〜${fixed(gLimits.max, 3)} mm の中央付近の 0.1mm 刻みの径`,
    }
  } else if (input.kind === 'Rc') {
    primary = {
      label: `有効ねじ部の奥端のめねじ内径（計算値・${name}）`,
      short: `${name} 奥端のめねじ内径（計算値）`,
      value: rcInner === null ? undefined : fixed(rcInner, 2),
      note:
        rcInner === null
          ? 'このサイズは有効ねじ部の長さを確認中のため、計算していません。'
          : 'テーパリーマで下穴を仕上げるときの目安です。リーマを使わずにタップを立てる場合の下穴はこれより大きくなり（奥の数山は山頂が平らな不完全ねじになります）、タップメーカーの推奨値に従ってください。',
    }
  } else if (input.kind === 'Rp') {
    primary = {
      label: `めねじ内径（基準径の位置・${name}）`,
      short: `${name} めねじ内径 D1`,
      value: fixed(thread.d1, 3),
      note: 'Rp の下穴径は、タップメーカーの推奨値を確認してください。',
    }
  } else {
    primary = {
      label: `外径（基準径の位置・${name}）`,
      short: `${name} 外径（基準径の位置）`,
      value: fixed(thread.d, 3),
      note: `管端から基準径の位置まで ${fixed(thread.gaugeLength, 2)} mm。管端では ${fixed(rEnd, 3)} mm（計算値）で、管の外径より小さい値です。`,
    }
  }

  const callouts = calloutLines(input.kind, thread)

  const relatedLinks: RelatedLink[] = []
  if (thread.pipeA) {
    relatedLinks.push({ to: toolHref('/steel-pipe', { a: thread.pipeA }), label: `${thread.pipeA} 鋼管の外径・質量` })
    if (findFlange('10K', thread.pipeA)) {
      relatedLinks.push({
        to: toolHref('/flange-bolt-length', { size: thread.pipeA }),
        label: `10K ${thread.pipeA} フランジ寸法`,
      })
    }
  }

  const copyText = [
    `【管用ねじ】${name}（旧JIS ${kind.old}${thread.size}）`,
    `山数 ${thread.tpi}山/25.4mm・ピッチ ${fixed(p, 4)} mm`,
    `外径 ${fixed(thread.d, 3)} / 有効径 ${fixed(thread.d2, 3)} / 谷径 ${fixed(thread.d1, 3)} mm`,
    primary.value ? `${primary.label}: ${primary.value} mm` : '',
    input.kind === 'G'
      ? `（下穴径は規格の値ではなく、めねじ内径の許容範囲 ${fixed(gLimits.min, 3)}〜${fixed(gLimits.max, 3)} mm の中央付近から求めた計算値）`
      : '',
    `典拠: ${standardLabel(kind.standard)}`,
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')

  const columns: Column<PipeThreadSize>[] = [
    { key: 'size', header: '呼び', cell: (row) => row.size },
    { key: 'a', header: '管', cell: (row) => row.pipeA ?? '—' },
    { key: 'tpi', header: '山数', cell: (row) => row.tpi },
    { key: 'd', header: '外径 d', cell: (row) => fixed(row.d, 3) },
    { key: 'd2', header: '有効径 d2', cell: (row) => fixed(row.d2, 3) },
    { key: 'd1', header: '谷径 d1', cell: (row) => fixed(row.d1, 3) },
    { key: 'a-len', header: '基準の長さ', cell: (row) => fixed(row.gaugeLength, 2) },
    { key: 'g', header: 'G 下穴', cell: (row) => fixed(gRecommendedDrill(row), 1) },
    {
      key: 'rc',
      header: 'Rc 奥端内径',
      cell: (row) => {
        const value = rcInnerMinorDiameter(row)
        return value === null ? '—' : fixed(value, 2)
      },
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SelectField
            label="ねじの呼び（管の呼び径）"
            value={thread.size}
            options={SIZE_OPTIONS}
            onChange={(size) => setInput({ ...input, size })}
            stepper
            quickPicks={QUICK_SIZES}
          />
          <SegmentedControl
            label="ねじの種類"
            value={input.kind}
            options={KIND_OPTIONS}
            onChange={(value) => setInput({ ...input, kind: value })}
            hint={`${kind.name}（旧JIS ${kind.old}）：${kind.description}`}
          />
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs leading-relaxed text-zinc-600">
            <p className="font-semibold text-zinc-800">旧JIS表記との対応</p>
            <p className="num mt-1">PT → R / Rc　PS → Rp　PF → G</p>
            <p className="mt-1">テーパねじ（R・Rc）は、シールテープや液状シール剤と併用し、ねじ込むほど締まって気密を保ちます。</p>
          </div>
        </div>
      </Card>

      <Card title="結果" index="02" icon={Wrench} id={RESULT_ID} aside={<CopyButton text={copyText} />}>
        <PrimaryResult label={primary.label} value={primary.value} unit="mm">
          {primary.note}
        </PrimaryResult>

        <dl className="mt-3">
          <ResultItem label="山数（25.4mm あたり）" value={thread.tpi} unit="山" />
          <ResultItem label="ピッチ P" value={fixed(p, 4)} unit="mm" />
          <ResultItem label="ねじ山の高さ h" value={fixed(h, 3)} unit="mm" />
          <ResultItem label="外径 d（おねじ）/ D（めねじ）" value={fixed(thread.d, 3)} unit="mm" />
          <ResultItem label="有効径 d2" value={fixed(thread.d2, 3)} unit="mm" />
          <ResultItem label="谷径 d1（おねじ）/ 内径 D1（めねじ）" value={fixed(thread.d1, 3)} unit="mm" />
          {input.kind !== 'G' && (
            <ResultItem label="基準の長さ a（管端〜基準径の位置）" value={fixed(thread.gaugeLength, 2)} unit="mm" />
          )}
          {input.kind === 'R' && (
            <>
              <ResultItem label="有効ねじ部の最小長さ（管端から）" value={fixed(thread.usefulExternal, 1)} unit="mm" />
              <ResultItem
                label="管端での外径（計算値）"
                value={fixed(rEnd, 3)}
                unit="mm"
                note="ノギスで管端の山を測ると、この値に近くなります"
              />
              <ResultItem label="有効ねじ部の端での外径（計算値）" value={fixed(rUsefulEnd, 3)} unit="mm" />
            </>
          )}
          {input.kind === 'Rc' && (
            <ResultItem
              label="有効ねじ部の最小長さ l（不完全ねじ部を含む）"
              value={thread.usefulInternalRc === null ? undefined : fixed(thread.usefulInternalRc, 1)}
              unit="mm"
            />
          )}
          {input.kind === 'G' && (
            <ResultItem
              label="めねじ内径 D1 の許容範囲"
              value={`${fixed(gLimits.min, 3)}〜${fixed(gLimits.max, 3)}`}
              unit="mm"
            />
          )}
          <ResultItem label="対応する管" value={thread.pipeA ?? '—'} />
        </dl>

        <div className="mt-3 space-y-1">
          <Citation code={kind.standard} suffix="の基準寸法" />
          {input.kind === 'G' && <Citation code="JIS B 0202" suffix="のめねじ内径の公差から計算" />}
        </div>

        <section className="mt-4 rounded-md border border-zinc-200" aria-labelledby="pipe-thread-callout">
          <h3
            id="pipe-thread-callout"
            className="flex items-center gap-1.5 border-b border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-bold text-zinc-800"
          >
            <PencilRuler className="size-4 text-zinc-500" aria-hidden />
            図面指示（ねじの呼び）
          </h3>
          <ul className="divide-y divide-zinc-100">
            {callouts.map((line) => (
              <li key={line.text} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
                    {line.label}
                    {line.computed && <Badge tone="warning">下穴は計算値</Badge>}
                  </p>
                  <p className="num text-lg font-bold break-words text-zinc-900">{line.text}</p>
                </div>
                <TextCopyButton text={line.text} />
              </li>
            ))}
          </ul>
          <div className="space-y-1 border-t border-zinc-200 px-3 py-2 text-xs leading-relaxed text-zinc-500">
            {input.kind === 'G' ? (
              <>
                <p>
                  下穴φ{fixed(gDrill, 1)} は規格の値ではなく、めねじ内径の許容範囲（{fixed(gLimits.min, 3)}〜
                  {fixed(gLimits.max, 3)} mm）から求めた計算値です。タップメーカーの推奨値と違う場合があります。
                </p>
                <p>G のおねじは、有効径の公差の等級（A級・B級）を付けて書きます。めねじには等級を付けません。</p>
              </>
            ) : input.kind === 'R' ? (
              <p>R は Rc（テーパめねじ）または Rp（平行めねじ）と組み合わせて使います。</p>
            ) : (
              <p>
                {input.kind} の下穴径はこのサイトのデータに無いため、下穴の注記は付けていません（タップメーカーの推奨値を確認してください）。
              </p>
            )}
            <p>
              旧JIS表記では {kind.old}
              {thread.size}。今の図面には {input.kind} の記号を使います。
            </p>
          </div>
        </section>

        <RelatedLinks links={relatedLinks} />

        <div className="mt-4">
          <FormulaInfo>
            <p>ピッチとねじ山の高さは、山数 n から求めます（山の角度 55°）。</p>
            <Formula>P = 25.4 ÷ n　／　h = 0.640327 × P</Formula>
            <Formula>
              例: 25.4 ÷ {thread.tpi} = {fixed(p, 4)} mm　／　0.640327 × {fixed(p, 4)} = {fixed(h, 3)} mm
            </Formula>
            <p>テーパねじ（R・Rc）はテーパ 1/16 なので、基準径の位置から長さ x 離れると直径は x/16 変わります。</p>
            <Formula>R 管端の外径 = d − a ÷ 16</Formula>
            <Formula>
              例: {fixed(thread.d, 3)} − {fixed(thread.gaugeLength, 2)} ÷ 16 = {fixed(rEnd, 3)} mm
            </Formula>
            <Formula>Rc 奥端の内径 = D1 − l ÷ 16</Formula>
            {rcInner !== null && (
              <Formula>
                例: {fixed(thread.d1, 3)} − {fixed(thread.usefulInternalRc ?? 0, 1)} ÷ 16 = {fixed(rcInner, 3)} mm
              </Formula>
            )}
            <p>G の推奨下穴径は、めねじ内径の許容範囲（D1 〜 D1 + 公差）の中央に最も近い 0.1mm 刻みの径です。</p>
            <Formula>
              例: G{thread.size}: ({fixed(gLimits.min, 3)} + {fixed(gLimits.max, 3)}) ÷ 2 → {fixed(gDrill, 1)} mm
              （公差 {fixed(G_INTERNAL_MINOR_TOLERANCE[thread.tpi], 3)}）
            </Formula>
            <FormulaLegend
              items={[
                ['n', '25.4mm あたりの山数'],
                ['d', '基準径の位置での外径'],
                ['a', '基準の長さ（管端〜基準径の位置）'],
                ['D1', '基準径の位置でのめねじ内径'],
                ['l', 'Rc の有効ねじ部の最小長さ（不完全ねじ部を含む）'],
              ]}
            />
          </FormulaInfo>
        </div>
      </Card>

      <Card
        title="寸法表"
        index="03"
        icon={Table2}
        className="lg:col-span-2"
        flush
        aside={
          // ボタンの文字が折り返さないよう、縮むのは見出しの側にする
          <div className="whitespace-nowrap">
            <TableExport
              title={`管用ねじ寸法表（R・Rc・Rp・G）${standardLabel('JIS B 0203')}・${standardLabel('JIS B 0202')}`}
              filename="pipe-thread"
              headers={EXPORT_HEADERS}
              rows={EXPORT_ROWS}
              note={EXPORT_NOTE}
            />
          </div>
        }
      >
        <p className="px-4 pt-3 text-xs text-zinc-500">
          管用ねじ（R・Rc・Rp・G）の寸法表。単位: mm。外径・有効径・谷径はテーパねじでは基準径の位置の値（G と共通）。G 下穴・Rc 奥端内径は規格の寸法から求めた計算値で、規格の値ではありません。行をタップするとそのサイズを選べます。
        </p>
        <div className="mt-2">
          <DataTable
            columns={columns}
            rows={PIPE_THREAD_SIZES}
            rowKey={(row) => row.size}
            isHighlighted={(row) => row.size === thread.size}
            onRowClick={(row) => setInput({ ...input, size: row.size })}
            caption="管用ねじ寸法表"
          />
        </div>
      </Card>

      {primary.value !== undefined && (
        <StickyResult targetId={RESULT_ID} label={primary.short} value={primary.value} unit="mm" />
      )}
    </div>
  )
}
