import { Calculator, ClipboardList, Table2 } from 'lucide-react'
import { useCallback, useId, type ReactNode } from 'react'
import { Citation } from '../../components/Citation'
import { RelatedLinks, type RelatedLink } from '../../components/RelatedLinks'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { StickyResult } from '../../components/ui/StickyResult'
import { TableExport } from '../../components/ui/TableExport'
import { useToolState } from '../../hooks/useToolState'
import { fixed, parseNumber, trim } from '../../lib/format'
import { toolHref } from '../../lib/query'
import { standardLabel } from '../../standards'
import { BOLT_SIZES } from '../bolt-size/data'
import {
  availableGrade,
  chartRow,
  D3_PER_PITCH,
  engagementPercent,
  findSize,
  formatHole,
  formatSignificant,
  H_PER_PITCH,
  holeCandidates,
  holeStep,
  judgeHole,
  minorDiameterLimits,
  PITCH_DIAMETER_PER_PITCH,
  pitchesOf,
  recommendHole,
  suggestDrillFix,
  threadBasics,
  threadName as nameOf,
  TWO_H1_PER_PITCH,
  type HoleCandidate,
  type HoleFit,
} from './calc'
import { METRIC_SIZES, TOLERANCE_GRADES, type MetricSize, type ToleranceGrade } from './data'
import { DrawingCallout } from './DrawingCallout'
import { DrillLookup } from './DrillLookup'
import { ExportAside, ExportBar } from './ExportPlacement'
import { DEFAULT_INPUT, isTapDrillInput, normalizeTapDrillInput } from './input'
import { BasicsChartCard, CoarseChartCard, FineChartCard } from './ThreadCharts'

const RESULT_ID = 'tap-drill-result'

const SIZE_OPTIONS = METRIC_SIZES.map((size) => ({
  value: String(size.d),
  label: `M${size.d}${size.choice === 3 ? '（第3選択）' : ''}${size.coarse === null ? '　細目のみ' : ''}`,
}))

/** よく使うサイズ（並目）。答えの下穴径と一緒にボタンで出す */
const QUICK_SIZES = [3, 4, 5, 6, 8, 10, 12, 16, 20, 24] as const

function pitchLabel(size: MetricSize, p: number): string {
  const kind = p === size.coarse ? '並目' : '細目'
  const note = size.pitchNotes?.[String(p)]
  return `${trim(p)} mm（${kind}${note ? `・${note}` : ''}）`
}

const GRADE_OPTIONS = TOLERANCE_GRADES.map((grade) => ({
  value: String(grade),
  label: `${grade}H`,
}))

const scrollToResult = () =>
  document.getElementById(RESULT_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

const FIT_TEXT: Record<HoleFit, string> = {
  small: '小さすぎ',
  ok: '範囲内',
  large: '大きすぎ',
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h3 className="border-b border-zinc-300 pb-1 text-xs font-bold tracking-wider text-zinc-500">{title}</h3>
      <dl>{children}</dl>
    </div>
  )
}

/**
 * よく使うサイズの答え（推奨下穴径）を並べたボタン。ページを開いた最初の画面で答えが見え、タップでそのサイズを選べる。
 * 事前レンダリングした HTML にも入るので、「M12 下穴」のような検索にも答えられる
 */
function QuickSizes({
  grade,
  selected,
  onSelect,
}: {
  grade: ToleranceGrade
  selected: { d: number; p: number }
  onSelect: (d: number) => void
}) {
  const labelId = useId()
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <p id={labelId} className="mb-2 text-xs font-bold text-zinc-600">
        よく使う下穴径（並目・{grade}H、mm）
      </p>
      <div role="group" aria-labelledby={labelId} className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
        {QUICK_SIZES.map((d) => {
          const p = findSize(d)?.coarse
          const row = p == null ? null : chartRow(d, p, grade)
          if (p == null || !row) return null
          const active = selected.d === d && selected.p === p
          return (
            <button
              key={d}
              type="button"
              onClick={() => onSelect(d)}
              aria-pressed={active}
              aria-label={`M${d} 並目 推奨下穴径 ${formatHole(row.hole)} mm`}
              className={`flex h-12 min-w-0 flex-col items-center justify-center rounded-sm border leading-tight ${
                active
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-300 bg-white text-zinc-900 hover:border-zinc-500'
              }`}
            >
              <span className={`num text-[11px] ${active ? 'text-zinc-300' : 'text-zinc-500'}`}>M{d}</span>
              <span className="num text-sm font-bold">{formatHole(row.hole)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function TapDrillTool() {
  const [input, setInput] = useToolState('tap-drill', DEFAULT_INPUT, isTapDrillInput, normalizeTapDrillInput)
  const size = findSize(input.d) ?? METRIC_SIZES[0]
  const { d, p, grade } = input
  const threadName = nameOf(d, p)
  const isCoarse = p === size.coarse
  const digits = holeStep(p) < 0.1 ? 2 : 1

  const limits = minorDiameterLimits(d, p, grade)
  const recommendation = recommendHole(d, p, grade)
  const recommended = recommendation?.hole ?? null
  const recommendedEngagement = recommended === null ? null : engagementPercent(d, p, recommended)
  const candidates = holeCandidates(d, p)
  const basics = threadBasics(d, p)
  const stressAreaText = formatSignificant(basics.stressArea)

  // 手持ちのドリル径: 読めない・0以下はエラー、打ち間違いらしいときは直し方を出す
  const drillText = input.drill.trim()
  const drill = parseNumber(input.drill)
  let drillError: string | undefined
  let drillWarning: string | undefined
  let drillFix: { label: string; onClick: () => void } | undefined
  if (drillText !== '') {
    if (drill === null) {
      drillError = '数字で入力してください（例: 8.5）'
    } else if (drill <= 0) {
      drillError = '0 より大きい径を入力してください'
    } else {
      const fix = suggestDrillFix(d, p, drill)
      if (fix !== null) {
        drillWarning = `φ${trim(drill)} は ${threadName} の下穴として${drill >= d ? '呼び径以上' : '小さすぎ'}です。${trim(fix)} の打ち間違いではありませんか？`
        drillFix = { label: `${trim(fix)} に直す`, onClick: () => setInput({ ...input, drill: trim(fix) }) }
      } else if (drill >= d) {
        drillWarning = `${threadName} の呼び径（${trim(d)} mm）以上なので、${threadName} の下穴には使えません。`
      }
    }
  }
  const drillPositive = drill !== null && drill > 0
  const drillValid = drillPositive && drill < d
  const drillFit = drillValid && limits ? judgeHole(drill, limits) : null

  const changeSize = (value: string) => {
    const next = findSize(Number(value))
    if (!next) return
    const nextP = pitchesOf(next)[0]
    setInput({ ...input, d: next.d, p: nextP, grade: availableGrade(next.d, nextP, grade), drill: '' })
  }

  const changePitch = (value: string) => {
    const nextP = Number(value)
    setInput({ ...input, p: nextP, grade: availableGrade(d, nextP, grade) })
  }

  /**
   * 早見表の行から選ぶ（サイズを変えるのでドリル径は消す）。
   * 大きな表を入力のたびに描き直さないよう、表（memo）に渡す関数は作り直さない
   */
  const selectFromChart = useCallback(
    (nextD: number, nextP: number) => {
      setInput((previous) => ({
        ...previous,
        d: nextD,
        p: nextP,
        grade: availableGrade(nextD, nextP, previous.grade),
        drill: '',
      }))
      scrollToResult()
    },
    [setInput],
  )

  /** 逆引きから選ぶ（そのドリルの判定を見られるよう、ドリル径は残す） */
  const selectFromDrill = (nextD: number, nextP: number) => {
    setInput({ ...input, d: nextD, p: nextP, grade: availableGrade(nextD, nextP, grade) })
    scrollToResult()
  }

  const selected = { d, p }
  const recommendedText = recommended === null ? null : formatHole(recommended)

  const copyText = [
    `【ねじ下穴径】${threadName}（ピッチ ${trim(p)}）${grade}H`,
    recommendedText !== null
      ? `推奨下穴径: ${recommendedText} mm（ひっかかり率 ${fixed(recommendedEngagement ?? 0, 1)}%）`
      : '推奨下穴径: —',
    limits ? `めねじ内径 D1: ${fixed(limits.min, 3)}〜${fixed(limits.max, 3)} mm` : '',
    `基準寸法: D2 ${fixed(basics.d2, 3)} / D1 ${fixed(basics.d1, 3)} / d3 ${fixed(basics.d3, 3)} mm、有効断面積 As ${stressAreaText} mm²`,
    `典拠: JIS B 0205-4:2001 / JIS B 0209-1:2001 / JIS B 1082:2009${recommendation?.basis === 'iso2306' ? ' / ISO 2306:1972' : ''}`,
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')

  const relatedLinks: RelatedLink[] = [
    ...(BOLT_SIZES.some((bolt) => bolt.d === d)
      ? [{ to: toolHref('/bolt-size', { d }), label: `M${trim(d)} のボルト穴・座ぐり・二面幅` }]
      : []),
    { to: toolHref('/thread-identify'), label: 'ねじの種類を実測で判別' },
    { to: toolHref('/pipe-thread'), label: '管用ねじ（Rc・G）の下穴径' },
  ]

  const columns: Column<HoleCandidate>[] = [
    { key: 'hole', header: '下穴径 mm', align: 'left', cell: (row) => fixed(row.hole, digits) },
    {
      key: 'engagement',
      header: 'ひっかかり率',
      cell: (row) => `${fixed(row.engagement, 1)}%`,
    },
    ...TOLERANCE_GRADES.map((g) => ({
      key: `fit-${g}`,
      header: `${g}H`,
      align: 'center' as const,
      cell: (row: HoleCandidate) => {
        const fit = row.fits[g]
        if (fit === null) return <span className="text-zinc-300">／</span>
        return fit === 'ok' ? (
          <span className="font-bold text-emerald-700" title="範囲内">
            ○
          </span>
        ) : (
          <span className="text-zinc-300" title={FIT_TEXT[fit]}>
            ·
          </span>
        )
      },
    })),
  ]

  const candidateExport = candidates.map((row) => [
    fixed(row.hole, digits),
    fixed(row.engagement, 1),
    ...TOLERANCE_GRADES.map((g) => {
      const fit = row.fits[g]
      return fit === null ? '規定なし' : fit === 'ok' ? '○' : FIT_TEXT[fit]
    }),
  ])

  const candidateExportButtons = (
    <TableExport
      title={`${threadName}（ピッチ ${trim(p)}）の下穴径の早見表`}
      filename={`tap-drill-${threadName.replace('×', 'x')}`}
      headers={['下穴径 [mm]', 'ひっかかり率 [%]', ...TOLERANCE_GRADES.map((g) => `${g}H`)]}
      rows={candidateExport}
      note={`○ = その公差域クラスのめねじ内径の範囲に入る。典拠: ${standardLabel('JIS B 0205-4')}（D1）／${standardLabel('JIS B 0209-1')}（T_D1）（サクッとJIS）`}
    />
  )

  const d2Raw = d - PITCH_DIAMETER_PER_PITCH * p
  const d3Raw = d - D3_PER_PITCH * p

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_auto_1fr] lg:gap-6">
      <div className="lg:col-span-2 lg:row-start-1">
        <QuickSizes grade={grade} selected={selected} onSelect={(value) => changeSize(String(value))} />
      </div>

      <Card title="条件" index="01" icon={ClipboardList} className="lg:col-start-1 lg:row-start-2">
        <div className="grid gap-4">
          <SelectField
            label="ねじの呼び"
            value={String(d)}
            options={SIZE_OPTIONS}
            onChange={changeSize}
            stepper
          />
          <SelectField
            label="ピッチ"
            value={String(p)}
            options={pitchesOf(size).map((pitch) => ({
              value: String(pitch),
              label: pitchLabel(size, pitch),
            }))}
            onChange={changePitch}
          />
          <SegmentedControl
            label="めねじの公差域クラス"
            value={String(grade)}
            options={GRADE_OPTIONS}
            onChange={(value) => setInput({ ...input, grade: Number(value) as ToleranceGrade })}
            hint="迷ったら 6H（一般用・中）。精密は 4H・5H、粗は 7H。M1〜M1.4 は 5H が標準。"
          />
          <NumberField
            label="手持ちのドリル径（任意）"
            value={input.drill}
            onChange={(value) => setInput({ ...input, drill: value })}
            placeholder={recommendedText === null ? '例: 8.5' : `例: ${recommendedText}`}
            unit="mm"
            hint="入力すると、そのドリルで下穴をあけてよいかの判定と、そのドリルで立てられるねじの一覧を出します。"
            error={drillError}
            warning={drillWarning}
            fix={drillFix}
          />
        </div>
      </Card>

      <Card
        id={RESULT_ID}
        title="結果"
        index="02"
        icon={Calculator}
        aside={<CopyButton text={copyText} />}
        className="lg:col-start-2 lg:row-span-2 lg:row-start-2 lg:self-start"
      >
        <PrimaryResult
          label={`推奨下穴径（${threadName}・${grade}H）`}
          value={recommendedText ?? undefined}
          unit="mm"
        >
          {recommended !== null && recommendedEngagement !== null ? (
            <>
              ひっかかり率 <span className="num font-semibold text-white">{fixed(recommendedEngagement, 1)}%</span>
              ・
              {recommendation?.basis === 'iso2306'
                ? `ISO 2306 の推奨ドリル径（並目）で、${grade}H のめねじ内径の範囲内`
                : `${grade}H のめねじ内径の範囲内で「呼び径 − ピッチ」に最も近い径`}
            </>
          ) : (
            <>
              このピッチでは {grade}H のめねじ内径の公差が規定されていないか、範囲に入る{' '}
              {trim(holeStep(p))} mm 刻みの径がありません。等級を変えてください。
            </>
          )}
        </PrimaryResult>

        {drillValid && (
          <div
            className={`mt-3 rounded-md border p-3 text-sm ${
              drillFit === 'ok'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : 'border-red-200 bg-red-50 text-red-900'
            }`}
            role="status"
          >
            <p className="flex flex-wrap items-center gap-2 font-semibold">
              <span className="num">φ{trim(drill)}</span>
              {drillFit === null ? (
                <Badge>判定できません</Badge>
              ) : (
                <Badge tone={drillFit === 'ok' ? 'ok' : 'danger'}>
                  {grade}H {FIT_TEXT[drillFit]}
                </Badge>
              )}
              <span className="num text-xs font-normal">
                ひっかかり率 {fixed(engagementPercent(d, p, drill), 1)}%
              </span>
            </p>
            {drillFit === 'small' && (
              <p className="mt-1 text-xs">
                下穴が小さすぎます。タップの折損や、ねじ山のむしれが起きやすくなります。
              </p>
            )}
            {drillFit === 'large' && (
              <p className="mt-1 text-xs">
                下穴が大きすぎます。ねじ山が浅くなり、締結強度が不足するおそれがあります。
              </p>
            )}
            {drillFit === 'ok' && (
              <p className="mt-1 text-xs">
                このドリルで問題ありません。ただし実際の穴はドリル径より少し大きく仕上がるので、上限に近い径は注意してください。
              </p>
            )}
          </div>
        )}

        <Group title="下穴">
          <ResultItem
            label={`めねじ内径 D1 の範囲（${grade}H）`}
            value={limits ? `${fixed(limits.min, 3)}〜${fixed(limits.max, 3)}` : undefined}
            unit="mm"
          />
          <ResultItem label="目安の下穴径（呼び径 − ピッチ）" value={trim(d - p)} unit="mm" />
        </Group>

        <Group title={`ねじの基準寸法（${threadName}）`}>
          <ResultItem label="呼び径 D・d" value={trim(d)} unit="mm" />
          <ResultItem label="ピッチ P" value={trim(p)} unit={`mm（${isCoarse ? '並目' : '細目'}）`} />
          <ResultItem label="有効径 D2・d2" value={fixed(basics.d2, 3)} unit="mm" />
          <ResultItem label="めねじ内径 D1・おねじ谷の径 d1" value={fixed(basics.d1, 3)} unit="mm" />
          <ResultItem label="d3（= d1 − H/6）" value={fixed(basics.d3, 3)} unit="mm" />
          <ResultItem label="とがり山の高さ H" value={fixed(basics.h, 3)} unit="mm" />
          <ResultItem
            label="有効断面積 As"
            value={stressAreaText}
            unit="mm²"
            note="ボルトの引張荷重・締付け力の計算に使う断面積（有効数字3桁）"
          />
        </Group>

        <div className="mt-3 space-y-1">
          <Citation code="JIS B 0205-2" suffix="のピッチ" />
          <Citation code="JIS B 0205-4" suffix="の式で D1・D2・H を計算" />
          <Citation code="JIS B 0209-1" suffix="のめねじ内径の公差（T_D1）を適用" />
          <Citation code="JIS B 1082" suffix="の式で d3・有効断面積 As を計算" />
          {recommendation?.basis === 'iso2306' && <Citation code="ISO 2306" suffix="の推奨ドリル径" />}
        </div>

        <div className="mt-4">
          <FormulaInfo>
            <p>めねじ内径（基準寸法）は、基準山形のひっかかりの高さ H1 から求めます。</p>
            <Formula>D1 = D − 2 × H1 = D − 1.082532 × P</Formula>
            <p>公差位置 H は下の寸法許容差が 0 なので、許容範囲は次のとおりです。</p>
            <Formula>
              D1 ≦ 下穴径 ≦ D1 + T<sub>D1</sub>（{grade}H）
            </Formula>
            <p>ひっかかり率は、ねじ山がどれだけかみ合うかの割合です。</p>
            <Formula>ひっかかり率 = (D − 下穴径) ÷ (1.082532 × P) × 100</Formula>
            {recommendedText !== null && (
              <Formula>
                例: ({trim(d)} − {recommendedText}) ÷ ({TWO_H1_PER_PITCH} × {trim(p)}) × 100 ={' '}
                {fixed(recommendedEngagement ?? 0, 1)}%
              </Formula>
            )}
            <p>
              推奨下穴径は、並目ねじでは ISO 2306 の推奨ドリル径（ほぼ「呼び径 −
              ピッチ」）を、選んだ公差域クラスの範囲に入る場合に採用します。細目ねじや範囲に入らない場合は、許容範囲に入る
              {trim(holeStep(p))} mm
              刻みの径のうち「呼び径 − ピッチ」（ひっかかり率 約92%）に最も近い径です（同じ近さなら大きい方）。ピッチ1mm未満は0.05mm刻みにしています。
            </p>
            <p>
              ねじの基準寸法は JIS B 0205-4、d3 と有効断面積 As は JIS B 1082 の式です（D2・D1・d3・H は小数3桁に丸めて表示）。
            </p>
            <Formula>
              H = {H_PER_PITCH} × P　／　D2 = D − {PITCH_DIAMETER_PER_PITCH} × P
            </Formula>
            <Formula>d3 = d1 − H/6 = d − {D3_PER_PITCH} × P</Formula>
            <Formula>As = π/4 × ((d2 + d3) ÷ 2)²</Formula>
            <Formula>
              例: π/4 × (({fixed(d2Raw, 4)} + {fixed(d3Raw, 4)}) ÷ 2)² = {fixed(basics.stressArea, 2)} ≒{' '}
              {stressAreaText} mm²
            </Formula>
            <p className="text-xs text-zinc-500">As は、d2・d3 を丸める前の値で計算しています。</p>
            <FormulaLegend
              items={[
                ['D, d', 'ねじの呼び径 [mm]（めねじ D、おねじ d）'],
                ['P', 'ピッチ [mm]'],
                ['H', 'とがり山の高さ = 0.866025 × P'],
                ['H1', 'ひっかかりの高さ = 5/8 × H'],
                ['D2, d2', '有効径'],
                ['D1, d1', 'めねじ内径（おねじ谷の径）の基準寸法'],
                [<>T<sub>D1</sub></>, 'めねじ内径の公差（JIS B 0209-1）'],
                ['As', '有効断面積 [mm²]（JIS B 1082）'],
              ]}
            />
          </FormulaInfo>
        </div>

        <RelatedLinks links={relatedLinks} />
      </Card>

      <div className="grid content-start gap-4 lg:col-start-1 lg:row-start-3 lg:gap-6">
        {/* 打ち間違いらしい値（直し方を出しているとき）では逆引きしない */}
        {drillPositive && !drillFix && (
          <DrillLookup drill={drill} grade={grade} selected={selected} onSelect={selectFromDrill} />
        )}
        <DrawingCallout d={d} p={p} grade={grade} hole={recommended} />
      </div>

      <Card
        title={`下穴径の早見表（${threadName}）`}
        index="03"
        icon={Table2}
        className="lg:col-span-2"
        flush
        aside={<ExportAside>{candidateExportButtons}</ExportAside>}
      >
        <ExportBar>{candidateExportButtons}</ExportBar>
        <p className="px-4 pt-3 text-xs text-zinc-500">
          ○ = その公差域クラスのめねじ内径の範囲に入る下穴径。／ = 規格に公差の規定がないクラス。
        </p>
        <div className="mt-2">
          <DataTable
            columns={columns}
            rows={candidates}
            rowKey={(row) => String(row.hole)}
            isHighlighted={(row) => row.hole === recommended}
            caption={`${threadName} の下穴径の早見表`}
          />
        </div>
      </Card>

      <CoarseChartCard grade={grade} selectedD={d} selectedP={p} onSelect={selectFromChart} />
      <FineChartCard grade={grade} selectedD={d} selectedP={p} onSelect={selectFromChart} />
      <BasicsChartCard selectedD={d} selectedP={p} onSelect={selectFromChart} />

      <Card title="使うときの注意" className="lg:col-span-2">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700">
          <li>
            この表は<strong>切削タップ</strong>用です。転造タップ（盛上げタップ）の下穴径は大きく異なるので、タップメーカーの推奨値を確認してください。
          </li>
          <li>
            ドリルであけた穴は、ドリル径より少し大きく仕上がります（拡大しろ）。材料・ドリルの状態によって変わるため、上限ぎりぎりの径は避けるのが無難です。
          </li>
          <li>
            ひっかかり率を下げる（下穴を大きくする）とタップ立ては楽になりますが、ねじ山のかみ合いが減って強度は下がります。許容範囲の中で、材料や用途に合わせて選んでください。
          </li>
        </ul>
      </Card>

      <StickyResult
        targetId={RESULT_ID}
        label={`推奨下穴径（${threadName}・${grade}H）`}
        value={recommendedText ?? '—'}
        unit="mm"
      />
    </div>
  )
}
