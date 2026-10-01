import { Calculator, ClipboardList, Table2 } from 'lucide-react'
import { useState } from 'react'
import { Citation } from '../../components/Citation'
import { RelatedLinks, type RelatedLink } from '../../components/RelatedLinks'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { StickyResult } from '../../components/ui/StickyResult'
import { TableExport, type ExportCell } from '../../components/ui/TableExport'
import { useToolState } from '../../hooks/useToolState'
import { fixed, parseNumber, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { standardLabel, STANDARDS } from '../../standards'
import { findFlange } from '../flange-bolt/calc'
import { THREAD_KINDS } from '../pipe-thread/data'
import {
  circumference,
  compareSpecs,
  isValidCount,
  lengthLooksLikeMm,
  MASS_FACTOR,
  nearestAvailableSize,
  PIPE_SPEC_KEYS,
  pipeDimensions,
  pipeThreadFor,
  pipeWeight,
  sizeChangeNotice,
  sizesOf,
  unitMass,
  unitMassText,
  type PipeDimensions,
} from './calc'
import { AllSpecsTable, SpecCompare } from './CompareTables'
import { PIPE_SIZES, PIPE_SPECS, type PipeSpec } from './data'
import { DEFAULT_INPUT, isSteelPipeInput, normalizeSteelPipeInput, urlSizeChange } from './input'
import { MeasureFinder } from './MeasureFinder'
import { useSearchAtMount } from './useSearchAtMount'

const SPEC_OPTIONS = PIPE_SPEC_KEYS.map((key) => ({ value: key, label: PIPE_SPECS[key].label }))
/** 呼び径のよく使うサイズ（その規格にあるものだけ表示される） */
const QUICK_PICKS = ['15A', '20A', '25A', '40A', '50A', '80A', '100A'] as const
const RESULT_ID = 'steel-pipe-result'

type TableView = 'spec' | 'all'

/** 「JIS G 3452:2019（配管用炭素鋼鋼管）」 */
const cite = (spec: PipeSpec) =>
  `${standardLabel(PIPE_SPECS[spec].standard)}（${STANDARDS[PIPE_SPECS[spec].standard].title}）`

export function SteelPipeTool() {
  // 開いた URL の条件（useToolState が URL を整えて書き換える前の値を読むため、useToolState より先に置く）
  const searchAtMount = useSearchAtMount()
  const [input, setInput] = useToolState('steel-pipe', DEFAULT_INPUT, isSteelPipeInput, normalizeSteelPipeInput)
  const [tableView, setTableView] = useState<TableView>('spec')
  /**
   * 規格を切り替えて呼び径を置き換えたときの知らせ（置き換えなければ null）。
   * まだ規格・呼び径を操作していない間（undefined）は、URL の呼び径を置き換えたことを知らせる
   */
  const [changeNotice, setChangeNotice] = useState<string | null | undefined>(undefined)
  const urlChange = urlSizeChange(searchAtMount)
  const urlNotice =
    urlChange && input.spec === urlChange.spec && input.a === urlChange.to
      ? sizeChangeNotice(urlChange.spec, urlChange.from, urlChange.to)
      : null
  const sizeNotice = changeNotice === undefined ? urlNotice : changeNotice
  const spec = PIPE_SPECS[input.spec]
  const dims = pipeDimensions(input.spec, input.a) ?? pipeDimensions(DEFAULT_INPUT.spec, DEFAULT_INPUT.a)!
  const a = dims.size.a
  const sizes = sizesOf(input.spec)
  const thread = pipeThreadFor(a)
  const flange = findFlange('10K', a)

  const length = parseNumber(input.length)
  const count = parseNumber(input.count)
  const lengthValid = length !== null && length > 0
  const countValid = isValidCount(count)
  const totalLength = lengthValid && countValid ? length * count : null
  const weight = totalLength === null ? null : pipeWeight(dims, totalLength)
  const mmFix = lengthValid ? lengthLooksLikeMm(length) : null

  const changeSpec = (value: PipeSpec) => {
    // 選んでいたサイズが無い規格（Sch40・Sch80 の 175A・225A）に切り替えたら、外径が近いサイズにして知らせる
    const nextA = nearestAvailableSize(value, a) ?? DEFAULT_INPUT.a
    setChangeNotice(sizeChangeNotice(value, a, nextA))
    setInput({ ...input, spec: value, a: nextA })
  }
  /** 呼び径を選ぶ。今の規格に無いサイズ（175A・225A）なら SGP にする */
  const selectSize = (nextA: string, nextSpec?: PipeSpec) => {
    const specToUse = nextSpec ?? (pipeDimensions(input.spec, nextA) ? input.spec : 'sgp')
    if (!pipeDimensions(specToUse, nextA)) return
    setChangeNotice(null)
    setInput({ ...input, spec: specToUse, a: nextA })
  }

  const label = `${spec.label} ${a}（${dims.size.b}B）`
  const circ = circumference(dims.od)
  const copyText = [
    `【鋼管】${label}`,
    `外径 ${fixed(dims.od, 1)} / 厚さ ${fixed(dims.t, 1)} / 内径 ${fixed(dims.id, 1)} mm（外周 ${fixed(circ, 1)} mm）`,
    `単位質量 ${unitMassText(dims.massPerM)} kg/m`,
    weight !== null && totalLength !== null
      ? `質量 ${fixed(weight.mass, 1)} kg（${trim(totalLength)} m）／ 満水時 ${fixed(weight.full, 1)} kg`
      : '',
    `典拠: ${standardLabel(spec.standard)}`,
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')

  const relatedLinks: RelatedLink[] = [
    ...(flange ? [{ to: toolHref('/flange-bolt-length', { size: a }), label: `JIS 10K フランジ ${a}` }] : []),
    ...(thread
      ? [{ to: toolHref('/pipe-thread', { size: thread.size, kind: 'R' }), label: `管用ねじ R${thread.size}` }]
      : []),
  ]

  const columns: Column<PipeDimensions>[] = [
    { key: 'a', header: '呼び径', cell: (row) => row.size.a },
    { key: 'b', header: 'B', cell: (row) => row.size.b },
    { key: 'od', header: '外径', cell: (row) => fixed(row.od, 1) },
    { key: 'circ', header: '外周', cell: (row) => fixed(circumference(row.od), 1) },
    { key: 't', header: '厚さ', cell: (row) => fixed(row.t, 1) },
    { key: 'id', header: '内径', cell: (row) => fixed(row.id, 1) },
    { key: 'w', header: 'kg/m', cell: (row) => unitMassText(row.massPerM) },
  ]
  const rows = sizes
    .map((size) => pipeDimensions(input.spec, size.a))
    .filter((row): row is PipeDimensions => row !== null)

  const exportTable =
    tableView === 'spec'
      ? {
          title: `${spec.name} 寸法・質量表`,
          filename: `steel-pipe-${input.spec}`,
          headers: ['呼び径 A', '呼び径 B', '外径 D [mm]', '外周 πD [mm]', '厚さ t [mm]', '内径 d [mm]', '単位質量 [kg/m]'],
          rows: rows.map((row): ExportCell[] => [
            row.size.a,
            row.size.b,
            fixed(row.od, 1),
            fixed(circumference(row.od), 1),
            fixed(row.t, 1),
            fixed(row.id, 1),
            unitMassText(row.massPerM),
          ]),
          note: `典拠: ${cite(input.spec)}。外周（πD）・内径（D − 2t）は計算値（サクッとJIS）`,
        }
      : {
          title: '鋼管 SGP・Sch40・Sch80 比較表',
          filename: 'steel-pipe-compare',
          headers: [
            '呼び径 A',
            '呼び径 B',
            '外径 D [mm]',
            ...PIPE_SPEC_KEYS.flatMap((key) => {
              const name = PIPE_SPECS[key].label
              return [`${name} 厚さ t [mm]`, `${name} 内径 d [mm]`, `${name} 単位質量 [kg/m]`]
            }),
          ],
          rows: PIPE_SIZES.map((size): ExportCell[] => [
            size.a,
            size.b,
            fixed(size.od, 1),
            ...compareSpecs(size.a).flatMap(({ dims: d }) =>
              d ? [fixed(d.t, 1), fixed(d.id, 1), unitMassText(d.massPerM)] : ['—', '—', '—'],
            ),
          ]),
          note: `典拠: ${cite('sgp')}（SGP）、${cite('sch40')}（Sch40・Sch80）。内径（D − 2t）は計算値。— はその規格に無いサイズ（サクッとJIS）`,
        }

  const lengthError = input.length.trim() !== '' && !lengthValid ? '0 より大きい数を入力してください' : undefined
  const countError = input.count.trim() !== '' && !countValid ? '1 以上の整数で入力してください' : undefined

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-6">
        <Card title="条件" index="01" icon={ClipboardList} className="lg:col-start-1">
          <div className="grid gap-4">
            <div>
              <SegmentedControl
                label="規格"
                value={input.spec}
                options={SPEC_OPTIONS}
                onChange={changeSpec}
                hint={spec.name}
              />
              {sizeNotice && (
                <p className="mt-1 text-xs font-semibold text-orange-800" role="status">
                  {sizeNotice}
                </p>
              )}
            </div>
            <SelectField
              label="呼び径"
              value={a}
              options={sizes.map((size) => ({ value: size.a, label: `${size.a}（${size.b}B）` }))}
              onChange={(value) => selectSize(value)}
              stepper
              quickPicks={QUICK_PICKS}
              hint={`外径 ${fixed(dims.od, 1)} mm・外周 ${fixed(circ, 1)} mm・厚さ ${fixed(dims.t, 1)} mm`}
            />
            <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-3">
              <NumberField
                label="長さ（1本）"
                value={input.length}
                onChange={(value) => setInput({ ...input, length: value })}
                placeholder="5.5"
                unit="m"
                error={lengthError}
                warning={
                  mmFix !== null && length !== null
                    ? `${trim(length)} m で計算中。mm で入れていませんか？`
                    : undefined
                }
                fix={
                  mmFix !== null
                    ? { label: `${trim(mmFix, 4)} m に直す`, onClick: () => setInput({ ...input, length: String(mmFix) }) }
                    : undefined
                }
              />
              <NumberField
                label="本数"
                value={input.count}
                onChange={(value) => setInput({ ...input, count: value })}
                placeholder="1"
                unit="本"
                error={countError}
              />
            </div>
          </div>
        </Card>

        <Card
          title="結果"
          index="02"
          icon={Calculator}
          id={RESULT_ID}
          className="lg:col-start-2 lg:row-span-2 lg:row-start-1"
          aside={<CopyButton text={copyText} />}
        >
          <PrimaryResult
            label={`質量（${label}）`}
            value={weight === null ? undefined : fixed(weight.mass, 1)}
            unit="kg"
          >
            {weight === null || totalLength === null ? (
              '長さ（m）と本数（整数）を入力してください。'
            ) : (
              <>
                <span className="num">
                  {unitMassText(dims.massPerM)} kg/m × {trim(totalLength)} m
                </span>{' '}
                ／ 満水時 <span className="num font-semibold text-white">{fixed(weight.full, 1)} kg</span>
              </>
            )}
          </PrimaryResult>

          <dl className="mt-3">
            <ResultItem label="外径 D" value={fixed(dims.od, 1)} unit="mm" />
            <ResultItem label="厚さ t" value={fixed(dims.t, 1)} unit="mm" />
            <ResultItem label="内径 d（D − 2t）" value={fixed(dims.id, 1)} unit="mm" />
            <ResultItem label="単位質量" value={unitMassText(dims.massPerM)} unit="kg/m" />
            <ResultItem label="外周（πD・巻尺で測る長さ）" value={fixed(circ, 1)} unit="mm" />
            <ResultItem label="内容積（満水時の水）" value={fixed(dims.volumePerM, 2)} unit="L/m" />
            <ResultItem label="外表面積（塗装・保温）" value={fixed(dims.surfacePerM, 3)} unit="m²/m" />
            <ResultItem
              label="対応する管用ねじ"
              value={thread ? `R${thread.size}` : undefined}
              note={thread ? `管用テーパおねじ（旧 ${THREAD_KINDS.R.old}${thread.size}）` : 'このサイトの管用ねじの表にありません'}
            />
          </dl>

          <div className="mt-3 space-y-1">
            <Citation code={spec.standard} suffix="の外径・厚さ・単位質量" />
          </div>

          <section className="mt-5" aria-labelledby="steel-pipe-compare-heading">
            <h3 id="steel-pipe-compare-heading" className="text-sm font-bold text-zinc-800">
              {a} を規格で比べる
            </h3>
            <p className="mt-0.5 mb-2 text-xs text-zinc-600">
              単位: mm（kg/m・質量 kg 以外）。
              {totalLength !== null && (
                <>
                  質量は合計 <span className="num">{trim(totalLength)}</span> m のとき。
                </>
              )}
              行をタップするとその規格で計算します。
            </p>
            <SpecCompare a={a} spec={input.spec} totalLength={totalLength} onSelectSpec={changeSpec} />
            <div className="mt-2 space-y-1">
              <Citation code="JIS G 3452" suffix="（SGP）" />
              <Citation code="JIS G 3454" suffix="（Sch40・Sch80）" />
            </div>
          </section>

          <RelatedLinks links={relatedLinks} />

          <div className="mt-4">
            <FormulaInfo>
              <p>単位質量は、JIS の式（鋼の密度 7.85 g/cm³）で計算し、有効数字3桁に丸めた値です。</p>
              <Formula>W = {MASS_FACTOR} × t × (D − t)</Formula>
              <Formula>
                例: {MASS_FACTOR} × {fixed(dims.t, 1)} × ({fixed(dims.od, 1)} − {fixed(dims.t, 1)}) ={' '}
                {trim(unitMass(dims.od, dims.t), 4)} → 有効数字3桁で {unitMassText(dims.massPerM)} kg/m
              </Formula>
              <p>内径・外周・内容積・外表面積は、次の式で求めています。</p>
              <Formula>d = D − 2t　／　外周 = π × D　／　内容積 = π/4 × d² × 1m　／　外表面積 = π × D × 1m</Formula>
              {weight !== null && totalLength !== null && (
                <>
                  <p>質量は 単位質量 × 長さ × 本数、満水時は管の中の水（1 L = 1 kg として）を足した値です。</p>
                  <Formula>
                    {unitMassText(dims.massPerM)} × {trim(totalLength)} = {fixed(weight.mass, 1)} kg　／　満水時{' '}
                    {fixed(weight.mass, 1)} + {fixed(dims.volumePerM, 3)} × {trim(totalLength)} ={' '}
                    {fixed(weight.full, 1)} kg
                  </Formula>
                </>
              )}
              <FormulaLegend
                items={[
                  ['D', '外径 [mm]'],
                  ['t', '厚さ [mm]'],
                  ['W', '単位質量 [kg/m]（黒管）'],
                ]}
              />
              <p>
                亜鉛めっき管（白管）はめっきの分だけ重くなります。厚さの許容差により、実際の質量は多少ばらつきます。
              </p>
            </FormulaInfo>
          </div>
        </Card>

        <MeasureFinder spec={input.spec} selectedA={a} onSelect={selectSize} className="lg:col-start-1" />

        <Card
          title="寸法表"
          index="04"
          icon={Table2}
          className="lg:col-span-2"
          flush
          aside={
            // 320px 幅でもボタンの文字が折り返さないように
            <div className="whitespace-nowrap">
              <TableExport {...exportTable} />
            </div>
          }
        >
          <div className="px-4 pt-3">
            <SegmentedControl<TableView>
              label="表の表示"
              value={tableView}
              options={[
                { value: 'spec', label: `${spec.label} の表` },
                { value: 'all', label: '3規格を並べる' },
              ]}
              onChange={setTableView}
            />
            <p className="mt-2 text-xs text-zinc-600">
              {tableView === 'spec' ? `${spec.name}。` : 'SGP・Sch40・Sch80 の厚さ・内径・単位質量。— はその規格に無いサイズ。'}
              単位: mm（kg/m 以外）。行をタップするとそのサイズを選べます。
            </p>
          </div>
          <div className="mt-2">
            {tableView === 'spec' ? (
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.size.a}
                isHighlighted={(row) => row.size.a === a}
                onRowClick={(row) => selectSize(row.size.a)}
                caption={`${spec.name} の寸法・質量表`}
              />
            ) : (
              <AllSpecsTable selectedA={a} selectedSpec={input.spec} onSelectSize={(value) => selectSize(value)} />
            )}
          </div>
          <div className="space-y-1 px-4 py-3">
            {tableView === 'spec' ? (
              <Citation code={spec.standard} suffix="の外径・厚さ・単位質量（外周・内径は計算値）" />
            ) : (
              <>
                <Citation code="JIS G 3452" suffix="（SGP）" />
                <Citation code="JIS G 3454" suffix="（Sch40・Sch80）" />
              </>
            )}
          </div>
        </Card>
      </div>

      <StickyResult
        targetId={RESULT_ID}
        label={weight === null || totalLength === null ? `${label} 単位質量` : `${label} × ${trim(totalLength)} m`}
        value={weight === null ? unitMassText(dims.massPerM) : fixed(weight.mass, 1)}
        unit={weight === null ? 'kg/m' : 'kg'}
      />
    </>
  )
}
