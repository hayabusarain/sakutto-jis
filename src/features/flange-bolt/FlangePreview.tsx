import type { FlangeRow } from './data'
import { drawingHoles, isDrawableBore, THREAD_ARC, type DrawingKind } from './drawing'

const KIND_LABELS: Record<DrawingKind, string> = {
  flange: 'フランジ正面図',
  through: '相手側の通し穴の図',
  tap: '相手側のめねじの図',
}

/** 円弧の SVG パス（角度は +x から反時計回りの度。SVG は下向きが +y なので y を反転する） */
function arcPath(cx: number, cy: number, r: number, start: number, end: number): string {
  const point = (deg: number) => {
    const rad = (deg * Math.PI) / 180
    return `${cx + r * Math.cos(rad)} ${-(cy + r * Math.sin(rad))}`
  }
  const large = (end - start + 360) % 360 > 180 ? 1 : 0
  // 画面上で反時計回り（y 反転後）は sweep-flag 0
  return `M ${point(start)} A ${r} ${r} 0 ${large} 0 ${point(end)}`
}

/** DXF と同じ図形のプレビュー（外形・内径・穴・PCD・中心線・穴の中心マーク） */
export function FlangePreview({ row, bore, kind }: { row: FlangeRow; bore: number; kind: DrawingKind }) {
  const r = row.D / 2
  const margin = 12
  const size = r + margin
  const holes = drawingHoles(row, kind)
  const stroke = r / 90
  const thin = r / 180
  const dash = `${r / 12} ${r / 30} ${r / 60} ${r / 30}`
  return (
    <svg
      viewBox={`${-size} ${-size} ${size * 2} ${size * 2}`}
      className="mx-auto block aspect-square w-full max-w-72"
      role="img"
      aria-label={`${KIND_LABELS[kind]}: 外径${row.D}、PCD${row.C}、${
        kind === 'tap' ? `${row.n}-M${row.bolt}` : `ボルト穴${row.n}-φ${row.h}`
      }`}
    >
      <circle
        r={r}
        className={`fill-zinc-100 stroke-zinc-900 ${kind === 'flange' ? '' : 'opacity-60'}`}
        strokeWidth={stroke}
        strokeDasharray={kind === 'flange' ? undefined : `${r / 20} ${r / 40}`}
      />
      {isDrawableBore(row, bore) && <circle r={bore / 2} className="fill-white stroke-zinc-900" strokeWidth={stroke} />}
      <circle r={row.C / 2} className="fill-none stroke-orange-600" strokeWidth={thin} strokeDasharray={dash} />
      <line x1={-size} x2={size} y1={0} y2={0} className="stroke-orange-600" strokeWidth={thin} strokeDasharray={dash} />
      <line y1={-size} y2={size} x1={0} x2={0} className="stroke-orange-600" strokeWidth={thin} strokeDasharray={dash} />
      {holes.map((hole, i) => (
        // SVG は下向きが +y なので反転して、DXF と同じ向きにする
        <g key={i}>
          <circle cx={hole.x} cy={-hole.y} r={hole.r} className="fill-white stroke-zinc-900" strokeWidth={stroke} />
          {hole.threadR !== null && (
            <path
              d={arcPath(hole.x, hole.y, hole.threadR, THREAD_ARC.start, THREAD_ARC.end)}
              className="fill-none stroke-sky-700"
              strokeWidth={thin}
            />
          )}
          <line
            x1={hole.x - hole.markHalf}
            x2={hole.x + hole.markHalf}
            y1={-hole.y}
            y2={-hole.y}
            className="stroke-orange-600"
            strokeWidth={thin}
          />
          <line
            x1={hole.x}
            x2={hole.x}
            y1={-hole.y - hole.markHalf}
            y2={-hole.y + hole.markHalf}
            className="stroke-orange-600"
            strokeWidth={thin}
          />
        </g>
      ))}
    </svg>
  )
}
