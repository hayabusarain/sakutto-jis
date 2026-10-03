import type { ExportCell } from '../../components/ui/TableExport'
import { standardLabel } from '../../standards'
import { FLAT_DEPTH_TOL, findORing, flatGroove, oRingNumbers } from './calc'
import { B3_MISPRINT, D1_TOL_NOTE, E_NOTE, HOUSING_TABLES, RING_TABLES, SOURCE_NOTE, type ORingSeries } from './data'

export interface ExportTable {
  title: string
  filename: string
  headers: string[]
  rows: ExportCell[][]
  note: string
}

/** 典拠（表の番号まで）と数値の出どころ */
function note(series: ORingSeries, flat: boolean): string {
  const ring = RING_TABLES[series]
  const housing = HOUSING_TABLES[flat ? 'flat' : 'cylinder']
  return `典拠: ${standardLabel('JIS B 2401-1')} ${ring.no} ${ring.title} / ${standardLabel('JIS B 2401-2')} ${housing.no} ${housing.title}。${SOURCE_NOTE}${D1_TOL_NOTE}溝幅 b の許容差は +0.25/0。`
}

/**
 * 寸法表の書き出し（Excel・CSV 用）。画面の表より列を増やし、許容差は上・下を別の列にする。
 * 円筒面: d・D とその許容差、溝幅（バックアップリング 0・1・2 個）、R・E の最大値。
 * 平面: 外圧用の溝内径・内圧用の溝外径、深さ h（±）、溝幅、R の最大値。
 */
export function oRingExportTable(series: ORingSeries, flat: boolean): ExportTable {
  const rings = oRingNumbers(series).map((no) => findORing(series, no)!)
  const common = ['呼び番号', '内径 d1 [mm]', 'd1 許容差 ± [mm]', '太さ d2 [mm]', 'd2 許容差 ± [mm]']
  if (flat) {
    return {
      title: `JIS B 2401-1・-2 ${series} 系列 Oリングと平面溝（固定用）の寸法`,
      filename: `oring_${series}_flat_groove`,
      headers: [
        ...common,
        '外圧用 溝内径 [mm]',
        '内圧用 溝外径 [mm]',
        '深さ h [mm]',
        'h 許容差 ± [mm]',
        '溝幅 b [mm]',
        '溝底の角 R 最大 [mm]',
      ],
      rows: rings.map((ring) => [
        ring.no,
        ring.d1,
        ring.d1Tol,
        ring.group.d2,
        ring.group.d2Tol,
        flatGroove(ring, 'external').inner,
        flatGroove(ring, 'internal').outer,
        ring.group.flatDepth,
        FLAT_DEPTH_TOL,
        ring.group.flatWidth,
        ring.group.rMax,
      ]),
      note: `${note(series, true)}サクッとJIS`,
    }
  }
  return {
    title: `JIS B 2401-1・-2 ${series} 系列 Oリングと円筒面の溝（運動用・固定用）の寸法`,
    filename: `oring_${series}_cylinder_groove`,
    headers: [
      ...common,
      'd [mm]',
      'd 上の許容差 [mm]',
      'd 下の許容差 [mm]',
      'D [mm]',
      'D 上の許容差 [mm]',
      'D 下の許容差 [mm]',
      '溝幅 b BU0個 [mm]',
      '溝幅 b BU1個 [mm]',
      '溝幅 b BU2個 [mm]',
      '溝底の角 R 最大 [mm]',
      'E（K の最大−最小）最大 [mm]',
    ],
    rows: rings.map((ring) => {
      const tol = ring.group.diaTol
      return [
        ring.no,
        ring.d1,
        ring.d1Tol,
        ring.group.d2,
        ring.group.d2Tol,
        ring.d,
        tol === null ? null : 0,
        tol === null ? null : -tol,
        ring.D,
        tol,
        tol === null ? null : 0,
        ...ring.group.widths,
        ring.group.rMax,
        ring.group.eMax,
      ]
    }),
    note: `${note(series, false)}d はピストン型の溝底径・ロッド型の軸径（表3 の d3・d5）、D はピストン型のシリンダ内径・ロッド型の溝底径（表3 の d4・d6）。BU はバックアップリング。${E_NOTE}${series === 'P' ? B3_MISPRINT.note : ''}サクッとJIS`,
  }
}
