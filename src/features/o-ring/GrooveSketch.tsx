import { trim } from '../../lib/format'

export type SketchKind = 'piston' | 'rod' | 'flat-internal' | 'flat-external'

interface GrooveSketchProps {
  d2: number
  width: number
  depth: number
  kind: SketchKind
}

const LABELS: Record<SketchKind, { mate: string; body: string }> = {
  piston: { mate: 'シリンダ（内径 D）', body: 'ピストン（溝底 d）' },
  rod: { mate: 'ロッド（軸径 d）', body: 'ハウジング（溝底 D）' },
  'flat-internal': { mate: '相手の面（ふた・フランジ）', body: '溝のある面' },
  'flat-external': { mate: '相手の面（ふた・フランジ）', body: '溝のある面' },
}

/**
 * 溝の断面の模式図（寸法の比率は太さ d2 を基準に拡大）。
 * ピストン型は溝が上（シリンダ側）に、ロッド型は下（軸側）に開く。平面は左が内側・右が外側。
 */
export function GrooveSketch({ d2, width, depth, kind }: GrooveSketchProps) {
  const scale = 60 / d2
  const w = width * scale
  const h = depth * scale
  const r = (d2 / 2) * scale
  const left = 40
  const viewWidth = Math.max(240, left + w + 80)
  const viewHeight = 160
  const flip = kind === 'rod'
  // ピストン型の座標で描き、ロッド型は上下を反転する
  const y = (value: number) => (flip ? viewHeight - value : value)
  const top = 36
  const gap = 6
  const rx = Math.min(r * 1.08, w / 2 - 1)
  const ringX = kind === 'flat-internal' ? left + w - rx - 1 : kind === 'flat-external' ? left + rx + 1 : left + w / 2
  const labels = LABELS[kind]
  const text = 'fill-zinc-700 text-[12px]'

  const bodyPath = [
    `M0 ${y(top + gap)}`,
    `H${left}`,
    `V${y(top + h)}`,
    `H${left + w}`,
    `V${y(top + gap)}`,
    `H${viewWidth}`,
    `V${y(viewHeight - 4)}`,
    `H0 Z`,
  ].join(' ')

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="mx-auto block w-full max-w-80"
      role="img"
      aria-label={`溝の断面の模式図（${kind === 'piston' ? 'ピストン型' : kind === 'rod' ? 'ロッド型' : '平面溝'}）。溝幅 ${trim(width)} mm、深さ ${trim(depth)} mm`}
    >
      <defs>
        <marker
          id="o-ring-arrow"
          viewBox="0 0 10 10"
          refX="5"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path d="M0 0 L10 5 L0 10 z" className="fill-zinc-500" />
        </marker>
      </defs>
      {/* 相手の部品 */}
      <rect x="0" y={flip ? y(top) : 4} width={viewWidth} height={top - 4} className="fill-zinc-200" />
      <line x1="0" x2={viewWidth} y1={y(top)} y2={y(top)} className="stroke-zinc-900" strokeWidth="1.5" />
      <text x={viewWidth - 6} y={flip ? y(top) + 22 : 24} textAnchor="end" className={text}>
        {labels.mate}
      </text>
      {/* 溝のある部品 */}
      <path d={bodyPath} className="fill-zinc-100 stroke-zinc-900" strokeWidth="1.5" />
      <text x={viewWidth / 2} y={flip ? 20 : viewHeight - 12} textAnchor="middle" className={text}>
        {labels.body}
      </text>
      {/* Oリング（つぶされた状態を楕円で表す） */}
      <ellipse
        cx={ringX}
        cy={y(top + h / 2)}
        rx={rx}
        ry={h / 2}
        className="fill-orange-500/80 stroke-orange-700"
        strokeWidth="1"
      />
      {/* 寸法 */}
      <line
        x1={left}
        x2={left + w}
        y1={y(top + h + 12)}
        y2={y(top + h + 12)}
        className="stroke-zinc-500"
        strokeWidth="0.8"
        markerStart="url(#o-ring-arrow)"
        markerEnd="url(#o-ring-arrow)"
      />
      <text x={left + w / 2} y={flip ? y(top + h + 12) - 6 : top + h + 28} textAnchor="middle" className={text}>
        溝幅 b = {trim(width)}
      </text>
      <line
        x1={left + w + 14}
        x2={left + w + 14}
        y1={y(top)}
        y2={y(top + h)}
        className="stroke-zinc-500"
        strokeWidth="0.8"
        markerStart="url(#o-ring-arrow)"
        markerEnd="url(#o-ring-arrow)"
      />
      <text x={left + w + 20} y={y(top + h / 2) + 4} className={text}>
        深さ {trim(depth)}
      </text>
      {(kind === 'flat-internal' || kind === 'flat-external') && (
        <>
          <text x="4" y={viewHeight - 12} className={text}>
            ← 内側
          </text>
          <text x={viewWidth - 4} y={viewHeight - 12} textAnchor="end" className={text}>
            外側 →
          </text>
        </>
      )}
    </svg>
  )
}
