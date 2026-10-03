import type { ReactNode } from 'react'
import { Citation } from '../../components/Citation'
import {
  ALL_FLANGE_TABLES,
  FLANGE_TOLERANCE_TABLE,
  GASKET_SEAT_TABLE,
} from '../../features/flange-bolt/data'
import { trim } from '../../lib/format'
import { Link } from '../../router/Link'
import {
  BASE_BOLT,
  BASE_FACE_HEIGHT,
  BASE_THICKNESS_TOLERANCE,
  FLANGE_BASE,
  FLANGE_EFFECTS,
  FLANGE_EX_BASE,
  FLANGE_EX_JA,
  FLANGE_EX_ROUND_5MM,
  FLANGE_EX_ROUND_JIS,
  FLANGE_TOOL_PATH,
  JIS_LENGTH_BEFORE_EX3,
  type FlangeExample,
} from './examples'
import { NoteCalc, NoteLayout, NoteSection, NoteTable } from './NoteLayout'
import { FLANGE_BOLT_NOTE } from './notePages'

/** 符号付きの長さ（+3・−1.5） */
const signed = (value: number) => (value > 0 ? `+${trim(value)}` : value < 0 ? `−${trim(-value)}` : '±0')

/** 計算例の式（数値を入れたもの）。L = t1 + t2 + G + n × W + m + k × P */
function exampleFormula({ row, conditions, result }: FlangeExample): string {
  const terms = [trim(row.t), trim(conditions.t2 ?? row.t), trim(conditions.gasket)]
  if (conditions.washers > 0) terms.push(`${conditions.washers} × ${trim(result.washerThickness)}`)
  terms.push(trim(result.nutHeight), `${conditions.threads} × ${trim(result.pitch)}`)
  return `${terms.join(' + ')} = ${trim(result.required)} mm`
}

function Example({ title, example, children }: { title: string; example: FlangeExample; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-md border border-zinc-200 p-3">
      <p className="font-bold text-zinc-900">{title}</p>
      {children}
      <NoteCalc>{exampleFormula(example)}</NoteCalc>
      <p>
        <Link to={example.href}>この条件でツールを開く</Link>
      </p>
    </div>
  )
}

interface EffectRow {
  label: string
  change: string
}

const { thinGasket, nutJa, washer, thread, withoutFace, thickest } = FLANGE_EFFECTS
const EFFECT_ROWS: readonly EffectRow[] = [
  { label: `ガスケットを ${trim(FLANGE_BASE.gasket)} → ${trim(thinGasket.gasket)} mm にする`, change: `${signed(thinGasket.delta)} mm` },
  {
    label: `ナットを JIS本体 → 旧JIS 1種にする（高さ ${trim(nutJa.style1)} → ${trim(nutJa.ja1)} mm）`,
    change: `${signed(nutJa.delta)} mm`,
  },
  {
    label: `平座金を片側・両側に入れる（厚さ ${trim(washer.thickness)} mm）`,
    change: `${signed(washer.one)}・${signed(washer.two)} mm`,
  },
  { label: `突き出しを1山増やす（ピッチ ${trim(thread.pitch)} mm）`, change: `${signed(thread.delta)} mm` },
  {
    label: `2枚とも座の高さ f（${trim(BASE_FACE_HEIGHT)} mm）を含まない厚さで計算する`,
    change: `${signed(withoutFace)} mm`,
  },
  {
    label: `2枚とも厚さが許容差の上限（+${trim(BASE_THICKNESS_TOLERANCE)} mm）`,
    change: `${signed(thickest)} mm`,
  },
]

export function FlangeBoltLengthNote() {
  const base = FLANGE_EX_BASE
  const ja = FLANGE_EX_JA
  const lengthGap = (base.result.length ?? 0) - (ja.result.length ?? 0)

  return (
    <NoteLayout
      meta={FLANGE_BOLT_NOTE}
      lead={
        <p>
          JISフランジのボルトの長さを計算すると、メーカーのカタログや手元の資料の表と 5 mm（1サイズ）違うことがあります。どちらかが誤りとは限らず、計算に入れている条件が違うことがあります。このサイトの計算式と、長さが変わる条件を計算例で説明します。
        </p>
      }
      actions={[
        { to: base.href, label: 'フランジのボルト長さを計算する' },
        { to: '/flange-bolt-length/10k', label: 'JIS 10K フランジ寸法表' },
      ]}
    >
      <NoteSection id="formula" title="このサイトの計算式">
        <p>六角ボルトの長さ（首下長さ）は、締め付けるものの厚さに、ナットの高さと突き出しを足して求めています。</p>
        <NoteCalc>
          L = t<sub>1</sub> + t<sub>2</sub> + G + n × W + m + k × P
        </NoteCalc>
        <ul>
          <li>
            t<sub>1</sub>・t<sub>2</sub>: フランジの厚さ（JIS B 2220 の表。平面座 RF では座の高さを含む）
          </li>
          <li>G: ガスケットの厚さ（ツールの既定は {trim(FLANGE_BASE.gasket)} mm）</li>
          <li>n × W: 平座金の枚数 × 厚さ（JIS B 1256 並形）</li>
          <li>m: ナットの高さ（JIS本体はスタイル1 の最大、旧JIS は附属書JA 1種）</li>
          <li>k × P: ナットからの突き出し（山数 × 並目ピッチ。既定は {FLANGE_BASE.threads} 山）</li>
        </ul>
        <p>
          求めた長さを 5 mm 刻み、または JIS B 1180 の呼び長さの系列（70 mm までは 5 mm、80〜160 mm は 10 mm、それより長いと 20 mm 刻み）に切り上げます。スタッドボルト（両ナット）は m と k × P を2つ分足します。
        </p>
        <div className="space-y-1">
          <Citation
            code="JIS B 2220"
            detail={`${ALL_FLANGE_TABLES}（フランジの寸法）・${GASKET_SEAT_TABLE}・${FLANGE_TOLERANCE_TABLE}`}
          />
          <Citation code="JIS B 1181" detail="表3・表4 六角ナット・スタイル1、附属書JA 表JA.9 六角ナット・上" suffix="のナットの高さ" />
          <Citation code="JIS B 1256" detail="表7・表8 並形・部品等級A" suffix="の座金の厚さ" />
          <Citation code="JIS B 1180" detail="表3" suffix="の呼び長さの系列" />
          <Citation code="JIS B 0205-2" suffix="の並目ピッチ" />
        </div>
      </NoteSection>

      <NoteSection id="examples" title="計算例">
        <Example title={`例1: JIS 10K ${base.row.size}（M${base.row.bolt}・厚さ ${base.row.t} mm）、ツールの既定の条件`} example={base}>
          <p>
            ガスケット {trim(FLANGE_BASE.gasket)} mm・JIS本体ナット・座金なし・突き出し {FLANGE_BASE.threads} 山。5 mm 刻みに切り上げて{' '}
            <strong className="num">
              M{base.row.bolt} × {base.result.length}
            </strong>
            。
          </p>
        </Example>
        <Example title={`例2: 同じ 10K ${ja.row.size} で、ナットとガスケットが違う場合`} example={ja}>
          <p>
            旧JIS 1種のナット・ガスケット {trim(ja.conditions.gasket)} mm にすると{' '}
            <strong className="num">
              M{ja.row.bolt} × {ja.result.length}
            </strong>
            。条件が2つ違うだけで、例1 より {lengthGap} mm 短くなります。
          </p>
        </Example>
        <Example
          title={`例3: JIS 10K ${FLANGE_EX_ROUND_5MM.row.size}（M${FLANGE_EX_ROUND_5MM.row.bolt}・厚さ ${FLANGE_EX_ROUND_5MM.row.t} mm）、丸め方の違い`}
          example={FLANGE_EX_ROUND_JIS}
        >
          <p>
            既定の条件で、5 mm 刻みなら <strong className="num">{FLANGE_EX_ROUND_5MM.result.length} mm</strong>、JIS
            の呼び長さの系列なら <strong className="num">{FLANGE_EX_ROUND_JIS.result.length} mm</strong> です。系列には{' '}
            {FLANGE_EX_ROUND_5MM.result.length} mm が無く、{JIS_LENGTH_BEFORE_EX3} mm の次が {FLANGE_EX_ROUND_JIS.result.length}{' '}
            mm のためです。
          </p>
        </Example>
      </NoteSection>

      <NoteSection id="conditions" title="長さが変わる条件">
        <p>
          例1（10K {base.row.size}・M{BASE_BOLT}、必要長さ {trim(base.result.required)} mm）から、条件を1つ変えたときの必要長さの変化です。
        </p>
        <NoteTable
          caption={`必要長さの変化（JIS 10K ${base.row.size}・M${BASE_BOLT}）`}
          columns={[
            { header: '変える条件', cell: (row: EffectRow) => row.label, left: true, wrap: true },
            { header: '変化', cell: (row: EffectRow) => row.change },
          ]}
          rows={EFFECT_ROWS}
          rowKey={(row) => row.label}
          rowHeader={false}
        />
        <p>1つずつは数 mm でも、重なると切り上げた長さが1サイズ変わります（例1 と 例2）。</p>
        <p>
          JIS B 2220 の平面座（RF）のフランジでは、表の厚さ t は座の高さ f を含みます（{GASKET_SEAT_TABLE}の図。
          {FLANGE_TOLERANCE_TABLE}の厚さの許容差も、RF は t − f に対して決められています）。座を含まない厚さを使う資料と比べるときは、この差に注意してください。
        </p>
        <p>
          厚さの許容差はプラス側だけなので、実物のフランジは表の t より厚いことがあります。突き出しには余裕を見ておくと安心です（目安）。
        </p>
      </NoteSection>

      <NoteSection id="check" title="メーカーの表と比べるときの確認点">
        <ul>
          <li>ガスケットの厚さを何 mm で計算しているか</li>
          <li>ナットは JIS本体か旧JIS か（高さが違う）</li>
          <li>平座金を入れているか（片側・両側）</li>
          <li>ナットからの突き出しを何山（何 mm）見ているか</li>
          <li>フランジの厚さに座の高さを含めているか</li>
          <li>長さをどの系列に丸めているか（在庫の長さを含む）</li>
        </ul>
        <p>
          表の注記に前提が書かれていれば、その条件を<Link to={FLANGE_TOOL_PATH}>フランジ＆ボルト長さのツール</Link>
          の「詳細条件」に入れると、同じ条件で比べられます。相手がバルブなどで厚さが違うときは「相手側フランジの厚さ」に入れます。
        </p>
      </NoteSection>
    </NoteLayout>
  )
}
