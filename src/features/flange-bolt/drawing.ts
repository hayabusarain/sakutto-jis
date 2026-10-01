import { recommendHole } from '../tap-drill/calc'
import { COARSE_PITCH, type FlangeRow, type PressureClass } from './data'
import { FlangeDxf } from './dxfWriter'

export interface HolePosition {
  x: number
  y: number
}

/**
 * ボルト穴の中心位置。JIS の管フランジと同じく、上下左右の中心線をまたぐ配置
 * （中心線上に穴を置かない）にする。
 */
export function boltHolePositions(row: FlangeRow): HolePosition[] {
  const r = row.C / 2
  return Array.from({ length: row.n }, (_, i) => {
    const angle = ((i + 0.5) * 2 * Math.PI) / row.n + Math.PI / 2
    return { x: r * Math.cos(angle), y: r * Math.sin(angle) }
  })
}

/** 図に内径を描けるか（0 は穴なし。ボルト穴にかかる大きさは描かない） */
export function isDrawableBore(row: FlangeRow, bore: number): boolean {
  return bore > 0 && bore < row.C - row.h
}

/**
 * 図面の種類
 * - flange: フランジ本体（ボルト穴 φh）
 * - through: 相手側（機器のノズル・当て板など）の通し穴 φh
 * - tap: 相手側のめねじ（スタッドボルト用）。下穴を実線の円、ねじの谷の径を 3/4 の細線の円弧で描く
 */
export type DrawingKind = 'flange' | 'through' | 'tap'

/** 並目ねじ・6H の推奨下穴径（ねじ下穴径ツールと同じ計算。ISO 2306 の値が 6H の範囲に入ればそれ） */
export function tapDrillFor(bolt: number): number | null {
  const pitch = COARSE_PITCH[bolt]
  if (pitch === undefined) return null
  return recommendHole(bolt, pitch, 6)?.hole ?? null
}

/**
 * めねじの谷の径の円弧（JIS B 0002 の慣用: 約 3/4 の円で、右上の 1/4 をあける）。
 * 角度は +x から反時計回りの度。90°（真上）から 360°（右）まで。
 */
export const THREAD_ARC = { start: 90, end: 360 } as const

export interface HoleGeometry extends HolePosition {
  /** 実線の円の半径（ボルト穴、またはタップの下穴） */
  r: number
  /** めねじの谷の径の円弧の半径（タップのときだけ） */
  threadR: number | null
  /** 中心マークの長さの半分（穴の外へ 3 mm 出す） */
  markHalf: number
}

export function drawingHoles(row: FlangeRow, kind: DrawingKind): HoleGeometry[] {
  const drill = kind === 'tap' ? tapDrillFor(row.bolt) : null
  const r = drill !== null ? drill / 2 : row.h / 2
  const threadR = drill !== null ? row.bolt / 2 : null
  const markHalf = (threadR ?? r) + 3
  return boltHolePositions(row).map((hole) => ({ ...hole, r, threadR, markHalf }))
}

export interface DrawingOptions {
  kind: DrawingKind
  /** 内径 [mm]。0 なら穴なし */
  bore: number
  /** 内径を入力せず、管の外径を仮に描いているか（注記を「PIPE OD … (REF)」にする） */
  boreIsPipeOd: boolean
}

/** 注記の文字（R12 の制御コード %%c = φ） */
export function drawingNotes(pressure: PressureClass, row: FlangeRow, options: DrawingOptions): string[] {
  const title = `JIS B 2220 ${pressure} ${row.size}`
  const hasBore = isDrawableBore(row, options.bore)
  const boreNote = !hasBore
    ? null
    : options.boreIsPipeOd
      ? `PIPE OD %%c${options.bore} (REF)`
      : `BORE %%c${options.bore}`
  const pcd = `PCD %%c${row.C}`

  if (options.kind === 'flange') {
    return [
      `${title} FLANGE`,
      `OD %%c${row.D}  ${pcd}  ${row.n}-%%c${row.h}  M${row.bolt}  t${row.t}`,
      ...(boreNote ? [boreNote] : []),
    ]
  }
  const holes =
    options.kind === 'tap'
      ? `${row.n}-M${row.bolt} (TAP DRILL %%c${tapDrillFor(row.bolt) ?? '-'})`
      : `${row.n}-%%c${row.h} THRU`
  return [`MATING PLATE FOR ${title}`, `OD %%c${row.D} (REF)  ${pcd}  ${holes}`, ...(boreNote ? [boreNote] : [])]
}

/** 正面図（外形・内径・ボルト穴・PCD・中心線・穴の中心マーク・注記）の DXF */
export function flangeDxf(pressure: PressureClass, row: FlangeRow, options: DrawingOptions): string {
  const drawing = new FlangeDxf()
  drawing.circle('OUTLINE', 0, 0, row.D / 2)
  if (isDrawableBore(row, options.bore)) drawing.circle('OUTLINE', 0, 0, options.bore / 2)
  for (const hole of drawingHoles(row, options.kind)) {
    drawing.circle('OUTLINE', hole.x, hole.y, hole.r)
    if (hole.threadR !== null) {
      drawing.arc('THREAD', hole.x, hole.y, hole.threadR, THREAD_ARC.start, THREAD_ARC.end)
    }
    drawing.line('CENTER', hole.x - hole.markHalf, hole.y, hole.x + hole.markHalf, hole.y)
    drawing.line('CENTER', hole.x, hole.y - hole.markHalf, hole.x, hole.y + hole.markHalf)
  }
  drawing.circle('CENTER', 0, 0, row.C / 2)

  const extent = row.D / 2 + 8
  drawing.line('CENTER', -extent, 0, extent, 0)
  drawing.line('CENTER', 0, -extent, 0, extent)

  const textHeight = Math.max(3, Math.round(row.D / 40))
  const y = -(row.D / 2 + 12 + textHeight)
  drawingNotes(pressure, row, options).forEach((note, i) => {
    drawing.text('NOTE', -row.D / 2, y - textHeight * 1.8 * i, textHeight, note)
  })
  return drawing.toString()
}

/** ダウンロードのファイル名 */
export function dxfFilename(pressure: PressureClass, size: string, kind: DrawingKind): string {
  const suffix = kind === 'through' ? '_mating_thru' : kind === 'tap' ? '_mating_tap' : ''
  return `flange_JIS${pressure}_${size}${suffix}.dxf`
}
