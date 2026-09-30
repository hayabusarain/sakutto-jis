import { Calculator, ClipboardList, Download, PenTool, Table2 } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { usePersistentState } from '../../hooks/usePersistentState'
import { downloadText } from '../../lib/download'
import { parseNumber, trim } from '../../lib/format'
import { boltLength, findFlange, type BoltType, type NutKind, type Rounding } from './calc'
import { FLANGES, PIPE_OD, PRESSURE_CLASSES, type FlangeRow, type PressureClass } from './data'
import { boltHolePositions, flangeDxf } from './drawing'

interface FlangeInput {
  pressure: PressureClass
  size: string
  type: BoltType
  gasket: string
  nut: NutKind
  washers: 0 | 1 | 2
  threads: number
  /** 相手側フランジの厚さ（空欄なら同じフランジ） */
  t2: string
  rounding: Rounding
  /** 図面の内径（空欄なら SGP の外径） */
  bore: string
}

const DEFAULT_INPUT: FlangeInput = {
  pressure: '10K',
  size: '50A',
  type: 'hex',
  gasket: '3',
  nut: 'style1',
  washers: 0,
  threads: 3,
  t2: '',
  rounding: '5mm',
  bore: '',
}

function isFlangeInput(value: unknown): value is FlangeInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    PRESSURE_CLASSES.includes(v.pressure as PressureClass) &&
    typeof v.size === 'string' &&
    findFlange(v.pressure as PressureClass, v.size) !== undefined &&
    (v.type === 'hex' || v.type === 'stud') &&
    typeof v.gasket === 'string' &&
    (v.nut === 'style1' || v.nut === 'ja1') &&
    (v.washers === 0 || v.washers === 1 || v.washers === 2) &&
    typeof v.threads === 'number' &&
    typeof v.t2 === 'string' &&
    (v.rounding === '5mm' || v.rounding === 'jis') &&
    typeof v.bore === 'string'
  )
}

const PRESSURE_OPTIONS = PRESSURE_CLASSES.map((p) => ({ value: p, label: p }))
const TYPE_OPTIONS = [
  { value: 'hex', label: '六角ボルト' },
  { value: 'stud', label: 'スタッド' },
] as const
const NUT_OPTIONS = [
  { value: 'style1', label: 'JIS本体' },
  { value: 'ja1', label: '旧JIS 1種' },
] as const
const WASHER_OPTIONS = [
  { value: '0', label: 'なし' },
  { value: '1', label: '片側' },
  { value: '2', label: '両側' },
] as const
const THREAD_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}山` }))
const ROUNDING_OPTIONS = [
  { value: '5mm', label: '5mm刻み' },
  { value: 'jis', label: 'JIS標準長さ' },
] as const

function FlangePreview({ row, bore }: { row: FlangeRow; bore: number }) {
  const r = row.D / 2
  const margin = 12
  const size = r + margin
  const holes = boltHolePositions(row)
  return (
    <svg
      viewBox={`${-size} ${-size} ${size * 2} ${size * 2}`}
      className="mx-auto block aspect-square w-full max-w-72"
      role="img"
      aria-label={`フランジ正面図: 外径${row.D}、PCD${row.C}、ボルト穴${row.n}-φ${row.h}`}
    >
      <circle r={r} className="fill-zinc-100 stroke-zinc-900" strokeWidth={r / 90} />
      {bore > 0 && bore < row.C - row.h && (
        <circle r={bore / 2} className="fill-white stroke-zinc-900" strokeWidth={r / 90} />
      )}
      <circle
        r={row.C / 2}
        className="fill-none stroke-orange-600"
        strokeWidth={r / 180}
        strokeDasharray={`${r / 12} ${r / 30} ${r / 60} ${r / 30}`}
      />
      <line x1={-size} x2={size} y1={0} y2={0} className="stroke-orange-600" strokeWidth={r / 180} strokeDasharray={`${r / 12} ${r / 30} ${r / 60} ${r / 30}`} />
      <line y1={-size} y2={size} x1={0} x2={0} className="stroke-orange-600" strokeWidth={r / 180} strokeDasharray={`${r / 12} ${r / 30} ${r / 60} ${r / 30}`} />
      {holes.map((hole, i) => (
        // SVG は下向きが +y なので反転して、DXF と同じ向きにする
        <circle key={i} cx={hole.x} cy={-hole.y} r={row.h / 2} className="fill-white stroke-zinc-900" strokeWidth={r / 90} />
      ))}
    </svg>
  )
}

export function FlangeBoltTool() {
  const [input, setInput] = usePersistentState('flange-bolt', DEFAULT_INPUT, isFlangeInput)
  const row = findFlange(input.pressure, input.size) ?? FLANGES['10K'][6]
  const sizes = FLANGES[input.pressure]

  const gasket = parseNumber(input.gasket)
  const t2Input = parseNumber(input.t2)
  const t2 = t2Input !== null && t2Input > 0 ? t2Input : row.t
  const boreInput = parseNumber(input.bore)
  const bore = input.bore.trim() === '' ? PIPE_OD[row.size] : boreInput ?? 0
  const gasketValid = gasket !== null && gasket >= 0 && gasket < 50

  const result = gasketValid
    ? boltLength({
        bolt: row.bolt,
        t1: row.t,
        t2,
        gasket,
        washers: input.washers,
        nut: input.nut,
        threads: input.threads,
        type: input.type,
        rounding: input.rounding,
      })
    : null

  const nuts = input.type === 'stud' ? 2 : 1
  const boltName = input.type === 'stud' ? 'スタッドボルト' : '六角ボルト'
  const spec = result?.length ? `M${row.bolt} × ${result.length}` : `M${row.bolt}`

  const changePressure = (pressure: PressureClass) => {
    // 同じ呼び径が無い圧力（16K・20K に 175A・225A は無い）に切り替えたら 50A にする
    const size = findFlange(pressure, input.size) ? input.size : '50A'
    setInput({ ...input, pressure, size })
  }

  const copyText = [
    `【フランジボルト】JIS ${input.pressure} ${row.size}`,
    `${boltName} ${spec}　${row.n}本（ナット ${row.n * nuts}個${input.washers ? `・座金 ${row.n * input.washers}枚` : ''}）`,
    result ? `必要長さ ${trim(result.required)} mm（ガスケット ${trim(gasket ?? 0)} mm・突き出し ${input.threads}山）` : '',
    `外径 ${row.D} / PCD ${row.C} / 穴 ${row.n}-φ${row.h} / 厚さ ${row.t}`,
    '典拠: JIS B 2220:2012 / JIS B 1181:2014',
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')

  const downloadDxf = () => {
    downloadText(
      `flange_JIS${input.pressure}_${row.size}.dxf`,
      flangeDxf(input.pressure, row, bore),
      'application/dxf',
    )
  }

  const columns: Column<FlangeRow>[] = [
    { key: 'size', header: '呼び径', cell: (r) => r.size },
    { key: 'D', header: '外径 D', cell: (r) => r.D },
    { key: 'C', header: 'PCD C', cell: (r) => r.C },
    { key: 'n', header: '穴数', cell: (r) => r.n },
    { key: 'h', header: '穴径 h', cell: (r) => r.h },
    { key: 'bolt', header: 'ボルト', cell: (r) => `M${r.bolt}` },
    { key: 't', header: '厚さ t', cell: (r) => r.t },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SegmentedControl label="呼び圧力" value={input.pressure} options={PRESSURE_OPTIONS} onChange={changePressure} />
          <SelectField
            label="呼び径"
            value={row.size}
            options={sizes.map((r) => ({ value: r.size, label: r.size }))}
            onChange={(size) => setInput({ ...input, size })}
          />
          <SegmentedControl
            label="ボルトの種類"
            value={input.type}
            options={TYPE_OPTIONS}
            onChange={(type) => setInput({ ...input, type })}
            hint={input.type === 'stud' ? '両端にナットを付けるスタッドボルト（全ねじ）' : '片側が頭の六角ボルト'}
          />
          <NumberField
            label="ガスケット（パッキン）の厚さ"
            value={input.gasket}
            onChange={(value) => setInput({ ...input, gasket: value })}
            placeholder="3"
            unit="mm"
            hint="シートガスケットは 1.5・2・3 mm がよく使われます。"
          />
          <SegmentedControl
            label="ナット"
            value={input.nut}
            options={NUT_OPTIONS}
            onChange={(nut) => setInput({ ...input, nut })}
            hint="JIS本体はスタイル1の最大高さ、旧JISは附属書JA 1種の高さで計算します。"
          />
          <div className="grid gap-4">
            <SegmentedControl
              label="平座金"
              value={String(input.washers)}
              options={WASHER_OPTIONS}
              onChange={(value) => setInput({ ...input, washers: Number(value) as 0 | 1 | 2 })}
            />
            <SegmentedControl
              label="ナットからの突き出し"
              value={String(input.threads)}
              options={THREAD_OPTIONS}
              onChange={(value) => setInput({ ...input, threads: Number(value) })}
            />
          </div>
          <NumberField
            label="相手側フランジの厚さ（任意）"
            value={input.t2}
            onChange={(value) => setInput({ ...input, t2: value })}
            placeholder={`空欄なら同じ ${row.t}`}
            unit="mm"
            hint="バルブや機器のフランジと組むときなど、相手の厚さが違う場合に入力します。"
          />
          <SegmentedControl
            label="長さの丸め"
            value={input.rounding}
            options={ROUNDING_OPTIONS}
            onChange={(rounding) => setInput({ ...input, rounding })}
          />
        </div>
      </Card>

      <Card title="結果" index="02" icon={Calculator} aside={<CopyButton text={copyText} />}>
        <PrimaryResult
          label={`${boltName}の長さ（JIS ${input.pressure} ${row.size}）`}
          value={result?.length ?? undefined}
          unit="mm"
        >
          {!result ? (
            'ガスケットの厚さを数値で入力してください。'
          ) : result.length === null ? (
            'JIS標準長さ（300mmまで）を超えています。5mm刻みに切り替えてください。'
          ) : (
            <>
              <span className="num font-semibold text-white">
                {spec}　{row.n}本
              </span>
              <br />
              計算上の必要長さ <span className="num">{trim(result.required)} mm</span> を
              {input.rounding === '5mm' ? '5mm刻み' : 'JIS標準長さ'}に切り上げ
            </>
          )}
        </PrimaryResult>

        <dl className="mt-3">
          <ResultItem label="ボルトの呼び × 本数" value={`M${row.bolt} × ${row.n}`} unit="本" />
          <ResultItem
            label="ナットからの実際の突き出し"
            value={result?.actualProtrusion == null ? undefined : trim(result.actualProtrusion)}
            unit="mm"
            note={
              result?.actualProtrusion != null
                ? `約 ${trim(Math.floor((result.actualProtrusion / result.pitch) * 10) / 10)} 山（ピッチ ${trim(result.pitch)} mm）`
                : undefined
            }
          />
          <ResultItem label="フランジ外径 D" value={row.D} unit="mm" />
          <ResultItem label="ボルト穴中心円の径（PCD）C" value={row.C} unit="mm" />
          <ResultItem label="ボルト穴" value={`${row.n}-φ${row.h}`} />
          <ResultItem label="フランジの厚さ t" value={row.t} unit="mm" />
        </dl>

        <div className="mt-3 space-y-1">
          <Citation code="JIS B 2220" detail={`${input.pressure}（並形）`} suffix="のフランジ寸法" />
          <Citation code="JIS B 1181" suffix="のナット高さ" />
          {input.washers > 0 && <Citation code="JIS B 1256" suffix="の座金厚さ（並形）" />}
          {input.rounding === 'jis' && <Citation code="JIS B 1180" suffix="の呼び長さの系列" />}
        </div>

        {result && (
          <div className="mt-4">
            <FormulaInfo>
              <p>ボルト首下長さ（スタッドボルトは全長）を、次の式で求めています。</p>
              {input.type === 'hex' ? (
                <Formula>
                  L = t<sub>1</sub> + t<sub>2</sub> + G + n × W + m + k × P
                </Formula>
              ) : (
                <Formula>
                  L = t<sub>1</sub> + t<sub>2</sub> + G + n × W + 2m + 2 × k × P
                </Formula>
              )}
              <Formula>
                = {trim(row.t)} + {trim(t2)} + {trim(gasket ?? 0)} + {input.washers} × {trim(result.washerThickness)} +{' '}
                {nuts > 1 ? `2 × ${trim(result.nutHeight)}` : trim(result.nutHeight)} +{' '}
                {nuts > 1 ? '2 × ' : ''}
                {input.threads} × {trim(result.pitch)} = {trim(result.required)} mm → {result.length ?? '—'} mm
              </Formula>
              <FormulaLegend
                items={[
                  [<>t<sub>1</sub>, t<sub>2</sub></>, 'フランジの厚さ（JIS B 2220。座の高さを含む）'],
                  ['G', 'ガスケットの厚さ'],
                  ['n × W', '平座金の枚数 × 厚さ'],
                  ['m', 'ナットの高さ'],
                  ['k × P', 'ナットからの突き出し（山数 × 並目ピッチ）'],
                ]}
              />
              <p>
                計算値を{input.rounding === '5mm' ? '5mm刻み' : 'JIS B 1180 の呼び長さの系列（70mmまでは5mm、80mmからは10mm刻み）'}
                に切り上げています。市販品の長さはメーカーによって異なるので、在庫の長さも確認してください。
              </p>
              <p>
                フランジの厚さ t は、JIS B 2220 の表の値（座（RF）の高さを含む厚さ）として計算しています。座を含まない厚さの資料と組み合わせるときは、その分を相手側の厚さに足してください。ナットの高さは、JIS本体はスタイル1の最大値、旧JISは1種の呼び寸法です。
              </p>
            </FormulaInfo>
          </div>
        )}
      </Card>

      <Card
        title="フランジ図面（CADデータ）"
        index="03"
        icon={PenTool}
        className="lg:col-span-2"
      >
        <div className="grid items-center gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <FlangePreview row={row} bore={bore} />
          <div className="space-y-4">
            <p className="num text-sm text-zinc-700">
              JIS {input.pressure} {row.size}　D{row.D} / PCD{row.C} / {row.n}-φ{row.h}
            </p>
            <NumberField
              label="図面の内径（任意）"
              value={input.bore}
              onChange={(value) => setInput({ ...input, bore: value })}
              placeholder={`空欄なら管外径 ${PIPE_OD[row.size]}`}
              unit="mm"
              hint="0 を入れると、穴なし（閉止フランジ）の図になります。"
            />
            <button
              type="button"
              onClick={downloadDxf}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-sm bg-zinc-900 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              <Download className="size-4" aria-hidden />
              DXF をダウンロード（2D・正面図）
            </button>
            <p className="text-xs leading-relaxed text-zinc-500">
              外形・内径・ボルト穴（OUTLINE）、PCD と中心線（CENTER）、寸法メモ（NOTE）の3レイヤー。単位 mm。3D（STEP）は今後対応予定です。
            </p>
          </div>
        </div>
      </Card>

      <Card
        title={`JIS ${input.pressure} フランジ寸法表`}
        index="04"
        icon={Table2}
        className="lg:col-span-2"
        flush
      >
        <p className="px-4 pt-3 text-xs text-zinc-500">単位: mm。行をタップするとそのサイズを選べます。</p>
        <div className="mt-2">
          <DataTable
            columns={columns}
            rows={sizes}
            rowKey={(r) => r.size}
            isHighlighted={(r) => r.size === row.size}
            onRowClick={(r) => setInput({ ...input, size: r.size })}
            caption={`JIS ${input.pressure} フランジ寸法表`}
          />
        </div>
      </Card>
    </div>
  )
}
