/**
 * 印刷用の早見表に載せる行。数値はすべて各ツールの data.ts・calc.ts と、寸法表・ねじのまとめページの
 * 行の作り方（tableData.ts・screwSummary.ts）から作り、表示の桁もツール・寸法表と同じ関数でそろえる。
 */
import { acrossFlatsText } from '../../features/bolt-size/calc'
import { BOLT_SIZES, isUnverified as isBoltUnverified } from '../../features/bolt-size/data'
import type { PressureClass } from '../../features/flange-bolt/data'
import { gRecommendedDrill, pitch } from '../../features/pipe-thread/calc'
import { PIPE_THREAD_SIZES } from '../../features/pipe-thread/data'
import { unitMassText } from '../../features/steel-pipe/calc'
import { formatHole, type Recommendation } from '../../features/tap-drill/calc'
import { fixed, trim } from '../../lib/format'
import { screwSummary, SUMMARY_SIZES } from '../screws/screwSummary'
import { flangeTableMarks, flangeTableRows, pipeTableRows, type FlangeTableMarks } from '../tables/tableData'

/* ---------------- ねじ ---------------- */

export interface ScrewSheetRow {
  d: number
  /** 並目ピッチ [mm] */
  pitch: string
  /** 推奨下穴径（並目・6H）[mm]。無ければ — */
  hole: string
  holeBasis: Recommendation['basis'] | null
  /** 六角ボルト・ナットの二面幅（JIS本体）[mm] */
  acrossIso: string
  /** 同（旧JIS = 附属書JA）[mm] */
  acrossJa: string
  /** 旧JIS の二面幅が JIS本体と違う */
  acrossDiffers: boolean
  acrossJaUnverified: boolean
  /** 六角穴付きボルトの六角穴の二面幅（六角レンチの呼び）[mm] */
  hexKey: string
  /** 六角穴付きボルトが JIS B 1176 に無いサイズ（†） */
  capNonJis: boolean
  /** ボルト穴径 2級 [mm] */
  boltHole: string
  /** ざぐり径 D'（JIS B 1001）[mm] */
  spotFace: string
  spotFaceUnverified: boolean
  /** 六角穴付きボルト用の座ぐり「径×深さ」（参考値）。無ければ null */
  counterbore: string | null
  /** JIS B 1180・B 1181 本体で第2選択のサイズ */
  secondChoice: boolean
}

export const SCREW_SHEET_ROWS: readonly ScrewSheetRow[] = SUMMARY_SIZES.map((d) => {
  const { coarse, bolt } = screwSummary(d)!
  return {
    d,
    pitch: trim(coarse.p),
    hole: coarse.recommended ? formatHole(coarse.recommended.hole) : '—',
    holeBasis: coarse.recommended?.basis ?? null,
    acrossIso: trim(bolt.sIso),
    acrossJa: trim(bolt.sJa),
    acrossDiffers: bolt.sIso !== bolt.sJa,
    acrossJaUnverified: isBoltUnverified('sJa', d),
    hexKey: trim(bolt.capKey),
    capNonJis: bolt.capNonJis === true,
    boltHole: trim(bolt.holes[1]),
    spotFace: trim(bolt.spotFace),
    spotFaceUnverified: isBoltUnverified('spotFace', d),
    counterbore: bolt.counterbore ? `${trim(bolt.counterbore.d)}×${trim(bolt.counterbore.h)}` : null,
    secondChoice: bolt.secondChoice === true,
  }
})

/* ---------------- フランジ ---------------- */

export interface FlangeSheetRow {
  size: string
  D: number
  C: number
  /** ボルト穴の「数-径」（例: 4-19） */
  holes: string
  /** ボルトの呼び（例: M16） */
  bolt: string
  /** ボルト・ナットの二面幅（JIS本体。旧JIS が違うときは「18（19）」）。表に無いボルトは — */
  across: string
  t: number
  /** 六角ボルト・スタッドボルトの長さの目安 [mm]（寸法表と同じ条件）。出せないときは — */
  hex: string
  stud: string
  /** ※ を付ける欄（寸法表と同じ） */
  marks: FlangeTableMarks
}

export function flangeSheetRows(pressure: PressureClass): FlangeSheetRow[] {
  return flangeTableRows(pressure).map((row) => {
    const bolt = BOLT_SIZES.find((size) => size.d === row.bolt)
    return {
      size: row.size,
      D: row.D,
      C: row.C,
      holes: `${row.n}-${row.h}`,
      bolt: `M${row.bolt}`,
      across: bolt ? acrossFlatsText(bolt) : '—',
      t: row.t,
      hex: row.hex.length === null ? '—' : String(row.hex.length),
      stud: row.stud.length === null ? '—' : String(row.stud.length),
      marks: flangeTableMarks(row),
    }
  })
}

/* ---------------- 鋼管・管用ねじ ---------------- */

export interface SgpSheetRow {
  a: string
  b: string
  od: string
  t: string
  /** 内径 = 外径 − 2 × 厚さ（計算値） */
  id: string
  /** 単位質量 [kg/m]（有効数字3桁。JIS の表と同じ書き方） */
  mass: string
}

/** SGP の行（鋼管の寸法表 /steel-pipe/sgp と同じ桁） */
export const SGP_SHEET_ROWS: readonly SgpSheetRow[] = pipeTableRows('sgp').map((row) => ({
  a: row.size.a,
  b: row.size.b,
  od: fixed(row.od, 1),
  t: fixed(row.t, 1),
  id: fixed(row.id, 1),
  mass: unitMassText(row.massPerM),
}))

export interface ThreadSheetRow {
  size: string
  /** 対応する管の呼び径。無ければ — */
  pipeA: string
  /** 25.4mm あたりの山数 */
  tpi: number
  /** ピッチ = 25.4 ÷ 山数（ツールと同じ小数4桁） */
  pitch: string
  /** 外径 d（テーパねじは基準径の位置の値） */
  d: string
  /** 谷径 d1（おねじ）・内径 D1（めねじ） */
  d1: string
  /** G めねじの推奨下穴径（計算値。規格の値ではない） */
  gDrill: string
}

/** 管用ねじの行（管用ねじのツールの表と同じ桁） */
export const THREAD_SHEET_ROWS: readonly ThreadSheetRow[] = PIPE_THREAD_SIZES.map((thread) => ({
  size: thread.size,
  pipeA: thread.pipeA ?? '—',
  tpi: thread.tpi,
  pitch: fixed(pitch(thread.tpi), 4),
  d: fixed(thread.d, 3),
  d1: fixed(thread.d1, 3),
  gDrill: fixed(gRecommendedDrill(thread), 1),
}))
