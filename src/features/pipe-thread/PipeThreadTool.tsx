import { ClipboardList, Table2, Wrench } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { usePersistentState } from '../../hooks/usePersistentState'
import { fixed } from '../../lib/format'
import { Link } from '../../router/Link'
import {
  findPipeThread,
  gMinorLimits,
  gRecommendedDrill,
  pitch,
  rcInnerMinorDiameter,
  threadHeight,
} from './calc'
import { PIPE_THREAD_SIZES, THREAD_KINDS, type PipeThreadKind, type PipeThreadSize } from './data'

interface PipeThreadInput {
  size: string
  kind: PipeThreadKind
}

const DEFAULT_INPUT: PipeThreadInput = { size: '1/2', kind: 'Rc' }
const KIND_KEYS = Object.keys(THREAD_KINDS) as PipeThreadKind[]

function isPipeThreadInput(value: unknown): value is PipeThreadInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.size === 'string' &&
    findPipeThread(v.size) !== undefined &&
    KIND_KEYS.includes(v.kind as PipeThreadKind)
  )
}

const SIZE_OPTIONS = PIPE_THREAD_SIZES.map((t) => ({
  value: t.size,
  label: `${t.size}${t.pipeA ? `（${t.pipeA}）` : ''}`,
}))

const KIND_OPTIONS = KIND_KEYS.map((kind) => ({ value: kind, label: kind }))

export function PipeThreadTool() {
  const [input, setInput] = usePersistentState('pipe-thread', DEFAULT_INPUT, isPipeThreadInput)
  const thread = findPipeThread(input.size) ?? PIPE_THREAD_SIZES[1]
  const kind = THREAD_KINDS[input.kind]
  const name = `${input.kind}${thread.size}`
  const p = pitch(thread.tpi)
  const h = threadHeight(thread.tpi)
  const gLimits = gMinorLimits(thread)
  const gDrill = gRecommendedDrill(thread)
  const rcInner = rcInnerMinorDiameter(thread)

  let primary: { label: string; value?: string; note: string }
  if (input.kind === 'G') {
    primary = {
      label: `推奨下穴径（${name}）`,
      value: fixed(gDrill, 1),
      note: `めねじ内径の許容範囲 ${fixed(gLimits.min, 3)}〜${fixed(gLimits.max, 3)} mm の中央付近の 0.1mm 刻みの径`,
    }
  } else if (input.kind === 'Rc') {
    primary = {
      label: `下穴径の上限の目安（${name}）`,
      value: rcInner === null ? undefined : fixed(rcInner, 2),
      note:
        rcInner === null
          ? 'このサイズは有効ねじ部の長さを確認中のため、計算していません。'
          : '有効ねじ部の奥端でのめねじ内径。これより大きい下穴だと奥のねじ山が欠けます。実際のドリル径はタップメーカーの推奨値を確認してください。',
    }
  } else if (input.kind === 'Rp') {
    primary = {
      label: `めねじ内径（基準径の位置・${name}）`,
      value: fixed(thread.d1, 3),
      note: 'Rp の下穴径は、タップメーカーの推奨値を確認してください。',
    }
  } else {
    primary = {
      label: `外径（基準径の位置・${name}）`,
      value: fixed(thread.d, 3),
      note: `管端から基準径の位置まで ${fixed(thread.gaugeLength, 2)} mm。管の外径より小さい値です。`,
    }
  }

  const copyText = [
    `【管用ねじ】${name}（旧JIS ${kind.old}${thread.size}）`,
    `山数 ${thread.tpi}山/25.4mm・ピッチ ${fixed(p, 4)} mm`,
    `外径 ${fixed(thread.d, 3)} / 有効径 ${fixed(thread.d2, 3)} / 谷径 ${fixed(thread.d1, 3)} mm`,
    primary.value ? `${primary.label}: ${primary.value} mm` : '',
    `典拠: ${kind.standard}`,
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
      header: 'Rc 下穴上限',
      cell: (row) => {
        const value = rcInnerMinorDiameter(row)
        return value === null ? '—' : fixed(value, 2)
      },
    },
  ]

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SelectField
            label="ねじの呼び（管の呼び径）"
            value={thread.size}
            options={SIZE_OPTIONS}
            onChange={(size) => setInput({ ...input, size })}
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
            <p className="mt-1">テーパねじ（R・Rc）は、ねじ込むほど締まって気密を保ちます。</p>
          </div>
        </div>
      </Card>

      <Card title="結果" index="02" icon={Wrench} aside={<CopyButton text={copyText} />}>
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
            <ResultItem label="有効ねじ部の最小長さ（管端から）" value={fixed(thread.usefulExternal, 1)} unit="mm" />
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
          <ResultItem
            label="対応する管"
            value={thread.pipeA ?? '—'}
            note={
              thread.pipeA ? (
                <Link to="/steel-pipe" className="underline underline-offset-2 hover:text-zinc-900">
                  鋼管の外径・質量を見る
                </Link>
              ) : undefined
            }
          />
        </dl>

        <div className="mt-3 space-y-1">
          <Citation code={kind.standard} suffix="の基準寸法" />
          {input.kind === 'G' && <Citation code="JIS B 0202" suffix="のめねじ内径の公差から計算" />}
        </div>

        <div className="mt-4">
          <FormulaInfo>
            <p>ピッチとねじ山の高さは、山数 n から求めます（山の角度 55°）。</p>
            <Formula>P = 25.4 ÷ n　／　h = 0.640327 × P</Formula>
            <p>テーパねじ（R・Rc）はテーパ 1/16 なので、基準径の位置から長さ x 離れると直径は x/16 変わります。</p>
            <Formula>Rc 奥端の内径 = D1 − l ÷ 16</Formula>
            {rcInner !== null && (
              <Formula>
                例: {fixed(thread.d1, 3)} − {fixed(thread.usefulInternalRc ?? 0, 1)} ÷ 16 = {fixed(rcInner, 3)} mm
              </Formula>
            )}
            <p>G の推奨下穴径は、めねじ内径の許容範囲（D1 〜 D1 + 公差）の中央に最も近い 0.1mm 刻みの径です。</p>
            <Formula>
              例: G{thread.size}: ({fixed(gLimits.min, 3)} + {fixed(gLimits.max, 3)}) ÷ 2 → {fixed(gDrill, 1)} mm
            </Formula>
            <FormulaLegend
              items={[
                ['n', '25.4mm あたりの山数'],
                ['D1', '基準径の位置でのめねじ内径'],
                ['l', 'Rc の有効ねじ部の最小長さ（不完全ねじ部を含む）'],
              ]}
            />
          </FormulaInfo>
        </div>
      </Card>

      <Card title="管用ねじ寸法表" index="03" icon={Table2} className="lg:col-span-2" flush>
        <p className="px-4 pt-3 text-xs text-zinc-500">
          単位: mm。外径・有効径・谷径はテーパねじでは基準径の位置の値（G と共通）。行をタップするとそのサイズを選べます。
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
    </div>
  )
}
