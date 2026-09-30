import { Calculator, ClipboardList, Table2 } from 'lucide-react'
import { Citation } from '../../components/Citation'
import { Badge } from '../../components/ui/Badge'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { Formula, FormulaInfo, FormulaLegend } from '../../components/ui/FormulaInfo'
import { NumberField } from '../../components/ui/NumberField'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { usePersistentState } from '../../hooks/usePersistentState'
import { fixed, parseNumber, trim } from '../../lib/format'
import {
  availableGrade,
  basicMinorDiameter,
  engagementPercent,
  findSize,
  holeCandidates,
  holeStep,
  judgeHole,
  minorDiameterLimits,
  pitchesOf,
  recommendHole,
  TWO_H1_PER_PITCH,
  type HoleCandidate,
  type HoleFit,
} from './calc'
import { METRIC_SIZES, TOLERANCE_GRADES, type MetricSize, type ToleranceGrade } from './data'

interface TapDrillInput {
  d: number
  p: number
  grade: ToleranceGrade
  /** 手持ちのドリル径（入力途中の文字列のまま保存） */
  drill: string
}

const DEFAULT_INPUT: TapDrillInput = { d: 10, p: 1.5, grade: 6, drill: '' }

function isTapDrillInput(value: unknown): value is TapDrillInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  const size = typeof v.d === 'number' ? findSize(v.d) : undefined
  return (
    size !== undefined &&
    typeof v.p === 'number' &&
    pitchesOf(size).includes(v.p) &&
    TOLERANCE_GRADES.includes(v.grade as ToleranceGrade) &&
    typeof v.drill === 'string'
  )
}

const SIZE_OPTIONS = METRIC_SIZES.map((size) => ({
  value: String(size.d),
  label: `M${size.d}${size.choice === 3 ? '（第3選択）' : ''}${size.coarse === null ? '　細目のみ' : ''}`,
}))

function pitchLabel(size: MetricSize, p: number): string {
  const kind = p === size.coarse ? '並目' : '細目'
  const note = size.pitchNotes?.[String(p)]
  return `${trim(p)} mm（${kind}${note ? `・${note}` : ''}）`
}

const GRADE_OPTIONS = TOLERANCE_GRADES.map((grade) => ({
  value: String(grade),
  label: `${grade}H`,
}))

const FIT_TEXT: Record<HoleFit, string> = {
  small: '小さすぎ',
  ok: '範囲内',
  large: '大きすぎ',
}

export function TapDrillTool() {
  const [input, setInput] = usePersistentState('tap-drill', DEFAULT_INPUT, isTapDrillInput)
  const size = findSize(input.d) ?? METRIC_SIZES[0]
  const { d, p, grade } = input
  const threadName = `M${d}${p === size.coarse ? '' : `×${trim(p)}`}`
  const digits = holeStep(p) < 0.1 ? 2 : 1

  const basic = basicMinorDiameter(d, p)
  const limits = minorDiameterLimits(d, p, grade)
  const recommendation = recommendHole(d, p, grade)
  const recommended = recommendation?.hole ?? null
  const recommendedEngagement = recommended === null ? null : engagementPercent(d, p, recommended)
  const candidates = holeCandidates(d, p)

  const drill = parseNumber(input.drill)
  const drillValid = drill !== null && drill > 0 && drill < d
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

  const copyText = [
    `【ねじ下穴径】${threadName}（ピッチ ${trim(p)}）${grade}H`,
    recommended !== null
      ? `推奨下穴径: ${fixed(recommended, digits)} mm（ひっかかり率 ${fixed(recommendedEngagement ?? 0, 1)}%）`
      : '推奨下穴径: —',
    limits ? `めねじ内径 D1: ${fixed(limits.min, 3)}〜${fixed(limits.max, 3)} mm` : '',
    `典拠: JIS B 0205-4:2001 / JIS B 0209-1:2001${recommendation?.basis === 'iso2306' ? ' / ISO 2306:1972' : ''}`,
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')

  const columns: Column<HoleCandidate>[] = [
    { key: 'hole', header: '下穴径 mm', cell: (row) => fixed(row.hole, digits) },
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

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SelectField
            label="ねじの呼び"
            value={String(d)}
            options={SIZE_OPTIONS}
            onChange={changeSize}
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
            placeholder={recommended === null ? '例: 8.5' : `例: ${fixed(recommended, digits)}`}
            unit="mm"
            hint="入力すると、そのドリルで下穴をあけてよいか判定します。"
          />
        </div>
      </Card>

      <Card
        title="結果"
        index="02"
        icon={Calculator}
        aside={<CopyButton text={copyText} />}
      >
        <PrimaryResult
          label={`推奨下穴径（${threadName}・${grade}H）`}
          value={recommended === null ? undefined : fixed(recommended, digits)}
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

        <dl className="mt-3">
          <ResultItem
            label={`めねじ内径 D1 の範囲（${grade}H）`}
            value={limits ? `${fixed(limits.min, 3)}〜${fixed(limits.max, 3)}` : undefined}
            unit="mm"
          />
          <ResultItem label="めねじ内径 D1（基準寸法）" value={fixed(basic, 3)} unit="mm" />
          <ResultItem
            label="ピッチ"
            value={trim(p)}
            unit={`mm（${p === size.coarse ? '並目' : '細目'}）`}
          />
          <ResultItem label="目安の下穴径（呼び径 − ピッチ）" value={trim(d - p)} unit="mm" />
        </dl>

        <div className="mt-3 space-y-1">
          <Citation code="JIS B 0205-2" suffix="のピッチ" />
          <Citation code="JIS B 0205-4" suffix="の式でD1を計算" />
          <Citation code="JIS B 0209-1" suffix="のめねじ内径の公差（T_D1）を適用" />
          {recommendation?.basis === 'iso2306' && (
            <Citation code="ISO 2306" suffix="の推奨ドリル径" />
          )}
        </div>

        <div className="mt-4">
          <FormulaInfo>
            <p>めねじ内径（基準寸法）は、基準山形のひっかかりの高さ H1 から求めます。</p>
            <Formula>
              D1 = D − 2 × H1 = D − 1.082532 × P
            </Formula>
            <p>公差位置 H は下の寸法許容差が 0 なので、許容範囲は次のとおりです。</p>
            <Formula>
              D1 ≦ 下穴径 ≦ D1 + T<sub>D1</sub>（{grade}H）
            </Formula>
            <p>ひっかかり率は、ねじ山がどれだけかみ合うかの割合です。</p>
            <Formula>
              ひっかかり率 = (D − 下穴径) ÷ (1.082532 × P) × 100
            </Formula>
            {recommended !== null && (
              <Formula>
                例: ({trim(d)} − {fixed(recommended, digits)}) ÷ ({TWO_H1_PER_PITCH} × {trim(p)}) × 100
                = {fixed(recommendedEngagement ?? 0, 1)}%
              </Formula>
            )}
            <FormulaLegend
              items={[
                ['D', 'ねじの呼び径 [mm]'],
                ['P', 'ピッチ [mm]'],
                ['H1', 'ひっかかりの高さ = 5/8 × H（H = 0.866025 × P）'],
                [<>T<sub>D1</sub></>, 'めねじ内径の公差（JIS B 0209-1）'],
              ]}
            />
            <p>
              推奨下穴径は、並目ねじでは ISO 2306 の推奨ドリル径（ほぼ「呼び径 −
              ピッチ」）を、選んだ公差域クラスの範囲に入る場合に採用します。細目ねじや範囲に入らない場合は、許容範囲に入る
              {trim(holeStep(p))} mm
              刻みの径のうち「呼び径 − ピッチ」（ひっかかり率 約92%）に最も近い径です（同じ近さなら大きい方）。ピッチ1mm未満は0.05mm刻みにしています。
            </p>
          </FormulaInfo>
        </div>
      </Card>

      <Card
        title={`下穴径の早見表（${threadName}）`}
        index="03"
        icon={Table2}
        className="lg:col-span-2"
        flush
      >
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
    </div>
  )
}
