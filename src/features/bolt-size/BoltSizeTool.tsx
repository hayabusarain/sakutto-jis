import { ClipboardList, Nut, Table2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Citation } from '../../components/Citation'
import { Card } from '../../components/ui/Card'
import { CopyButton } from '../../components/ui/CopyButton'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { FormulaInfo } from '../../components/ui/FormulaInfo'
import { PrimaryResult, ResultItem } from '../../components/ui/ResultItem'
import { SegmentedControl } from '../../components/ui/SegmentedControl'
import { SelectField } from '../../components/ui/SelectField'
import { useToolState } from '../../hooks/useToolState'
import { trim } from '../../lib/format'
import { BOLT_SIZES, HOLE_CLASSES, type BoltSize, type HoleClass } from './data'

interface BoltSizeInput {
  d: number
  holeClass: HoleClass
}

const DEFAULT_INPUT: BoltSizeInput = { d: 12, holeClass: '2級' }

function isBoltSizeInput(value: unknown): value is BoltSizeInput {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    BOLT_SIZES.some((size) => size.d === v.d) && HOLE_CLASSES.includes(v.holeClass as HoleClass)
  )
}

const SIZE_OPTIONS = BOLT_SIZES.map((size) => ({ value: String(size.d), label: `M${size.d}` }))
const CLASS_OPTIONS = HOLE_CLASSES.map((c) => ({ value: c, label: c }))

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4 first:mt-0">
      <h3 className="border-b border-zinc-300 pb-1 text-xs font-bold tracking-wider text-zinc-500">
        {title}
      </h3>
      <dl>{children}</dl>
    </div>
  )
}

export function BoltSizeTool() {
  const [input, setInput] = useToolState('bolt-size', DEFAULT_INPUT, isBoltSizeInput)
  const size = BOLT_SIZES.find((s) => s.d === input.d) ?? BOLT_SIZES[0]
  const classIndex = HOLE_CLASSES.indexOf(input.holeClass)
  const hole = size.holes[classIndex]
  const jaDiffers = size.sIso !== size.sJa

  const copyText = [
    `【ボルト寸法】M${size.d}`,
    `二面幅: ${trim(size.sIso)} mm${jaDiffers ? `（旧JIS ${trim(size.sJa)} mm）` : ''}`,
    `六角レンチ: ${trim(size.capKey)} mm`,
    `ボルト穴 ${input.holeClass}: ${hole === null ? '—' : `${trim(hole)} mm`}／ざぐり径 ${trim(size.spotFace)} mm`,
    size.counterbore
      ? `CAP用座ぐり: φ${trim(size.counterbore.d)} 深さ${trim(size.counterbore.h)}（穴 φ${trim(size.counterbore.d1)}）`
      : '',
    '典拠: JIS B 1180 / B 1181 / B 1176 / B 1001',
    '（サクッとJIS）',
  ]
    .filter(Boolean)
    .join('\n')

  const columns: Column<BoltSize>[] = [
    { key: 'd', header: 'ねじ', cell: (row) => `M${row.d}` },
    {
      key: 's',
      header: '二面幅',
      cell: (row) => (row.sIso === row.sJa ? trim(row.sIso) : `${trim(row.sIso)}（${trim(row.sJa)}）`),
    },
    { key: 'key', header: '六角レンチ', cell: (row) => trim(row.capKey) },
    { key: 'hole', header: `穴 ${input.holeClass}`, cell: (row) => (row.holes[classIndex] === null ? '—' : trim(row.holes[classIndex]!)) },
    { key: 'spot', header: 'ざぐり径', cell: (row) => trim(row.spotFace) },
    { key: 'cbd', header: 'CAP座ぐり径', cell: (row) => (row.counterbore ? trim(row.counterbore.d) : '—') },
    { key: 'cbh', header: 'CAP深さ', cell: (row) => (row.counterbore ? trim(row.counterbore.h) : '—') },
  ]

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-6">
      <Card title="条件" index="01" icon={ClipboardList}>
        <div className="grid gap-4">
          <SelectField
            label="ねじの呼び"
            value={String(size.d)}
            options={SIZE_OPTIONS}
            onChange={(value) => setInput({ ...input, d: Number(value) })}
          />
          <SegmentedControl
            label="ボルト穴の等級（JIS B 1001）"
            value={input.holeClass}
            options={CLASS_OPTIONS}
            onChange={(holeClass) => setInput({ ...input, holeClass })}
            hint="1級ほど穴が小さく、穴位置の精度が必要になります。迷ったら 2級。"
          />
        </div>
      </Card>

      <Card title="結果" index="02" icon={Nut} aside={<CopyButton text={copyText} />}>
        <PrimaryResult label={`二面幅（スパナサイズ）・M${size.d}`} value={trim(size.sIso)} unit="mm">
          {jaDiffers ? (
            <>
              旧JIS（附属書JA）の六角ボルト・ナットは{' '}
              <span className="num font-semibold text-white">{trim(size.sJa)} mm</span>
              。旧JIS品も広く流通しているので、両方のサイズを用意しておくと安心です。
            </>
          ) : (
            <>JIS本体（ISO）と旧JIS（附属書JA）で同じ二面幅です。</>
          )}
        </PrimaryResult>

        <div className="mt-4">
          <Group title="六角ボルト（JIS B 1180）">
            <ResultItem label="二面幅 s（本体 / 附属書JA）" value={`${trim(size.sIso)} / ${trim(size.sJa)}`} unit="mm" />
            <ResultItem label="頭部の高さ k（本体 / 附属書JA）" value={`${trim(size.kIso)} / ${trim(size.kJa)}`} unit="mm" />
          </Group>
          <Group title="六角ナット（JIS B 1181）">
            <ResultItem label="高さ m（本体スタイル1 最大）" value={trim(size.nutStyle1)} unit="mm" />
            <ResultItem label="高さ m（附属書JA 1種 / 3種）" value={`${trim(size.nutJa1)} / ${trim(size.nutJa3)}`} unit="mm" />
          </Group>
          <Group title="六角穴付きボルト（JIS B 1176）">
            <ResultItem label="六角レンチ（六角穴の二面幅）" value={trim(size.capKey)} unit="mm" />
            <ResultItem
              label="頭部径 dk / 頭部の高さ k"
              value={`${trim(size.capDk)} / ${trim(size.capK)}`}
              unit="mm"
              note={size.capNonJis ? `M${size.d} は JIS B 1176 に無いサイズです（DIN 912 などの値）` : undefined}
            />
          </Group>
          <Group title="ボルト穴・座ぐり">
            <ResultItem label={`ボルト穴径（${input.holeClass}）`} value={hole === null ? undefined : trim(hole)} unit="mm" />
            <ResultItem label="ざぐり径 D'（六角ボルト用）" value={trim(size.spotFace)} unit="mm" />
            <ResultItem
              label="CAP用座ぐり 径 × 深さ"
              value={size.counterbore ? `φ${trim(size.counterbore.d)} × ${trim(size.counterbore.h)}` : undefined}
              unit="mm"
              note={
                size.counterbore
                  ? `下穴 φ${trim(size.counterbore.d1)}（設計でよく使われる参考値）`
                  : 'このサイズの参考値は確認中です'
              }
            />
          </Group>
        </div>

        <div className="mt-3 space-y-1">
          <Citation code="JIS B 1180" suffix="本体・附属書JA" />
          <Citation code="JIS B 1181" suffix="本体（スタイル1）・附属書JA" />
          <Citation code="JIS B 1176" />
          <Citation code="JIS B 1001" suffix="のボルト穴径・ざぐり径" />
        </div>

        <div className="mt-4">
          <FormulaInfo title="データの見方">
            <p>
              JIS B 1180・B 1181 には、ISOに合わせた<strong>本体</strong>と、従来のJISの寸法を残した
              <strong>附属書JA</strong>（いわゆる旧JIS）があります。二面幅が違うのは M10・M12・M14・M22 です（例: M12 は本体 18 mm、附属書JA 19 mm）。
            </p>
            <p>ナットの高さは、本体スタイル1は最大値、附属書JAは呼び寸法です。3種は薄いナット（いわゆる薄ナット）です。</p>
            <p>
              六角穴付きボルト用の座ぐり（径・深さ）は規格本体の規定ではなく、頭部が面から出ないように設計でよく使われている参考値です。頭部径・頭部の高さに余裕を持たせています。
            </p>
          </FormulaInfo>
        </div>
      </Card>

      <Card title="寸法一覧" index="03" icon={Table2} className="lg:col-span-2" flush>
        <p className="px-4 pt-3 text-xs text-zinc-500">
          単位: mm。二面幅の（ ）は附属書JA（旧JIS）。行をタップするとそのサイズを選べます。
        </p>
        <div className="mt-2">
          <DataTable
            columns={columns}
            rows={BOLT_SIZES}
            rowKey={(row) => String(row.d)}
            isHighlighted={(row) => row.d === size.d}
            onRowClick={(row) => setInput({ ...input, d: row.d })}
            caption="ボルト・ナット寸法一覧"
          />
        </div>
      </Card>
    </div>
  )
}
