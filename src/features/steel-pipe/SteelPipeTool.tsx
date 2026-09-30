import { Calculator, ClipboardList, Table2 } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { useToolState } from '../../hooks/useToolState'
import { fixed, parseNumber, trim } from '../../lib/format'
import { MASS_FACTOR, pipeDimensions, sizesOf, type PipeDimensions } from './calc'
import { PIPE_SPECS, type PipeSpec } from './data'

interface SteelPipeInput {
  spec: PipeSpec
  a: string
  length: string
  count: string
}

const DEFAULT_INPUT: SteelPipeInput = { spec: 'sgp', a: '50A', length: '5.5', count: '1' }
const SPEC_KEYS = Object.keys(PIPE_SPECS) as PipeSpec[]

function isSteelPipeInput(value: unknown): value is SteelPipeInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    SPEC_KEYS.includes(v.spec as PipeSpec) &&
    typeof v.a === 'string' &&
    pipeDimensions(v.spec as PipeSpec, v.a) !== null &&
    typeof v.length === 'string' &&
    typeof v.count === 'string'
  )
}

const SPEC_OPTIONS = SPEC_KEYS.map((key) => ({ value: key, label: PIPE_SPECS[key].label }))

export function SteelPipeTool() {
  const [input, setInput] = useToolState('steel-pipe', DEFAULT_INPUT, isSteelPipeInput)
  const spec = PIPE_SPECS[input.spec]
  const dims = pipeDimensions(input.spec, input.a) ?? pipeDimensions('sgp', '50A')!
  const sizes = sizesOf(input.spec)

  const length = parseNumber(input.length)
  const count = parseNumber(input.count)
  const lengthValid = length !== null && length > 0
  const countValid = count !== null && count > 0 && Number.isInteger(count)
  const totalLength = lengthValid && countValid ? length * count : null
  const totalMass = totalLength === null ? null : dims.massPerM * totalLength
  const waterMass = totalLength === null ? null : dims.volumePerM * totalLength

  const changeSpec = (value: PipeSpec) => {
    // 選んでいたサイズが無い規格（175A・225A の Sch）に切り替えたら、近いサイズにする
    const a = pipeDimensions(value, input.a) ? input.a : '200A'
    setInput({ ...input, spec: value, a })
  }

  const label = `${spec.label} ${dims.size.a}（${dims.size.b}B）`
  const copyText = [
    `【鋼管】${label}`,
    `外径 ${fixed(dims.od, 1)} / 厚さ ${fixed(dims.t, 1)} / 内径 ${fixed(dims.id, 1)} mm`,
    `単位質量 ${trim(dims.massPerM)} kg/m`,
    totalMass !== null && totalLength !== null
      ? `質量 ${fixed(totalMass, 1)} kg（${trim(totalLength)} m）`
      : '',
    `典拠: ${spec.standard}`,
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')

  const columns: Column<PipeDimensions>[] = [
    { key: 'a', header: '呼び径', cell: (row) => row.size.a },
    { key: 'b', header: 'B', cell: (row) => row.size.b },
    { key: 'od', header: '外径', cell: (row) => fixed(row.od, 1) },
    { key: 't', header: '厚さ', cell: (row) => fixed(row.t, 1) },
    { key: 'id', header: '内径', cell: (row) => fixed(row.id, 1) },
    { key: 'w', header: 'kg/m', cell: (row) => trim(row.massPerM) },
  ]
  const rows = sizes
    .map((size) => pipeDimensions(input.spec, size.a))
    .filter((row): row is PipeDimensions => row !== null)

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SegmentedControl
            label="規格"
            value={input.spec}
            options={SPEC_OPTIONS}
            onChange={changeSpec}
            hint={spec.name}
          />
          <SelectField
            label="呼び径"
            value={dims.size.a}
            options={sizes.map((size) => ({ value: size.a, label: `${size.a}（${size.b}B）` }))}
            onChange={(a) => setInput({ ...input, a })}
          />
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="長さ"
              value={input.length}
              onChange={(value) => setInput({ ...input, length: value })}
              placeholder="5.5"
              unit="m"
            />
            <NumberField
              label="本数"
              value={input.count}
              onChange={(value) => setInput({ ...input, count: value })}
              placeholder="1"
              unit="本"
            />
          </div>
        </div>
      </Card>

      <Card title="結果" index="02" icon={Calculator} aside={<CopyButton text={copyText} />}>
        <PrimaryResult
          label={`質量（${label}）`}
          value={totalMass === null ? undefined : fixed(totalMass, 1)}
          unit="kg"
        >
          {totalLength === null ? (
            '長さと本数（整数）を入力してください。'
          ) : (
            <>
              <span className="num">
                {trim(dims.massPerM)} kg/m × {trim(totalLength)} m
              </span>
              {waterMass !== null && (
                <>
                  {' '}
                  ／ 満水時 <span className="num font-semibold text-white">{fixed(totalMass! + waterMass, 1)} kg</span>
                </>
              )}
            </>
          )}
        </PrimaryResult>

        <dl className="mt-3">
          <ResultItem label="外径 D" value={fixed(dims.od, 1)} unit="mm" />
          <ResultItem label="厚さ t" value={fixed(dims.t, 1)} unit="mm" />
          <ResultItem label="内径 d（D − 2t）" value={fixed(dims.id, 1)} unit="mm" />
          <ResultItem label="単位質量" value={trim(dims.massPerM)} unit="kg/m" />
          <ResultItem label="内容積（満水時の水）" value={fixed(dims.volumePerM, 2)} unit="L/m" />
          <ResultItem label="外表面積（塗装・保温）" value={fixed(dims.surfacePerM, 3)} unit="m²/m" />
        </dl>

        <div className="mt-3 space-y-1">
          <Citation code={spec.standard} suffix="の外径・厚さ・単位質量" />
        </div>

        <div className="mt-4">
          <FormulaInfo>
            <p>単位質量は、JIS の式（鋼の密度 7.85 g/cm³）で計算し、有効数字3桁に丸めた値です。</p>
            <Formula>W = {MASS_FACTOR} × t × (D − t)</Formula>
            <Formula>
              例: {MASS_FACTOR} × {fixed(dims.t, 1)} × ({fixed(dims.od, 1)} − {fixed(dims.t, 1)}) ={' '}
              {trim(dims.massPerM)} kg/m
            </Formula>
            <p>内径・内容積・外表面積は、次の式で求めています。</p>
            <Formula>d = D − 2t　／　内容積 = π/4 × d² × 1m　／　外表面積 = π × D × 1m</Formula>
            <FormulaLegend
              items={[
                ['D', '外径 [mm]'],
                ['t', '厚さ [mm]'],
                ['W', '単位質量 [kg/m]（黒管）'],
              ]}
            />
            <p>
              質量は 単位質量 × 長さ × 本数 です。亜鉛めっき管（白管）はめっきの分だけ重くなります。厚さの許容差（−12.5%
              など）により、実際の質量は多少ばらつきます。
            </p>
          </FormulaInfo>
        </div>
      </Card>

      <Card
        title={`寸法・質量表（${spec.name}）`}
        index="03"
        icon={Table2}
        className="lg:col-span-2"
        flush
      >
        <p className="px-4 pt-3 text-xs text-zinc-500">単位: mm（kg/m 以外）。行をタップするとそのサイズを選べます。</p>
        <div className="mt-2">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(row) => row.size.a}
            isHighlighted={(row) => row.size.a === dims.size.a}
            onRowClick={(row) => setInput({ ...input, a: row.size.a })}
            caption={`${spec.name} の寸法・質量表`}
          />
        </div>
      </Card>
    </div>
  )
}
