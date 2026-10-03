/**
 * 鋼製管フランジの主要寸法 [mm]。JIS B 2220:2012 の表14（5K）・表15（10K）・表17（16K）・表18（20K）。
 * 10K薄形（別の表）は含まない。呼び径は 10A〜300A（どのクラスにあるかは表12・表14〜表18 のとおり）。
 * D: 外径 / C: ボルト穴中心円の径（PCD）/ n: ボルト穴の数 / h: ボルト穴の径 / bolt: ボルトの呼び / t: フランジの厚さ
 * t は平面座（RF）のフランジでは座の高さ f を含む厚さ（表13 の図。表22 の厚さの許容差も RF は「t−f」に対して決めている）。
 * ボルトの締付け長さは RF どうし・FF どうしのどちらでも 2t + ガスケット厚さ。
 * なお表8 では、RF にできるのは 5K・10K・16K の WN・IT と 20K の SOH・SW・TR・WN・IT・BL で、5K・10K・16K の SOP・SOH・SW・TR・BL は RF にしない
 * （5K は FF だけ、10K・16K は FF・MF・TG）。20K に FF は無い。LJ にはガスケット座が無い（表8 の注記）。
 * 全値を JIS B 2220:2012 の原文（kikakurui の規格票の画像）と照合済み。
 */
export interface FlangeRow {
  size: string
  D: number
  C: number
  n: number
  h: number
  bolt: number
  t: number
}

export type PressureClass = '5K' | '10K' | '16K' | '20K'

type Row = readonly [size: string, D: number, C: number, n: number, h: number, bolt: number, t: number]

const rows = (list: readonly Row[]): FlangeRow[] =>
  list.map(([size, D, C, n, h, bolt, t]) => ({ size, D, C, n, h, bolt, t }))

export const FLANGES: Record<PressureClass, readonly FlangeRow[]> = {
  '5K': rows([
    ['10A', 75, 55, 4, 12, 10, 9],
    ['15A', 80, 60, 4, 12, 10, 9],
    ['20A', 85, 65, 4, 12, 10, 10],
    ['25A', 95, 75, 4, 12, 10, 10],
    ['32A', 115, 90, 4, 15, 12, 12],
    ['40A', 120, 95, 4, 15, 12, 12],
    ['50A', 130, 105, 4, 15, 12, 14],
    ['65A', 155, 130, 4, 15, 12, 14],
    ['80A', 180, 145, 4, 19, 16, 14],
    ['90A', 190, 155, 4, 19, 16, 14],
    ['100A', 200, 165, 8, 19, 16, 16],
    ['125A', 235, 200, 8, 19, 16, 16],
    ['150A', 265, 230, 8, 19, 16, 18],
    ['175A', 300, 260, 8, 23, 20, 18],
    ['200A', 320, 280, 8, 23, 20, 20],
    ['225A', 345, 305, 12, 23, 20, 20],
    ['250A', 385, 345, 12, 23, 20, 22],
    ['300A', 430, 390, 12, 23, 20, 22],
  ]),
  '10K': rows([
    ['10A', 90, 65, 4, 15, 12, 12],
    ['15A', 95, 70, 4, 15, 12, 12],
    ['20A', 100, 75, 4, 15, 12, 14],
    ['25A', 125, 90, 4, 19, 16, 14],
    ['32A', 135, 100, 4, 19, 16, 16],
    ['40A', 140, 105, 4, 19, 16, 16],
    ['50A', 155, 120, 4, 19, 16, 16],
    ['65A', 175, 140, 4, 19, 16, 18],
    ['80A', 185, 150, 8, 19, 16, 18],
    ['90A', 195, 160, 8, 19, 16, 18],
    ['100A', 210, 175, 8, 19, 16, 18],
    ['125A', 250, 210, 8, 23, 20, 20],
    ['150A', 280, 240, 8, 23, 20, 22],
    ['175A', 305, 265, 12, 23, 20, 22],
    ['200A', 330, 290, 12, 23, 20, 22],
    ['225A', 350, 310, 12, 23, 20, 22],
    ['250A', 400, 355, 12, 25, 22, 24],
    ['300A', 445, 400, 16, 25, 22, 24],
  ]),
  '16K': rows([
    ['10A', 90, 65, 4, 15, 12, 12],
    ['15A', 95, 70, 4, 15, 12, 12],
    ['20A', 100, 75, 4, 15, 12, 14],
    ['25A', 125, 90, 4, 19, 16, 14],
    ['32A', 135, 100, 4, 19, 16, 16],
    ['40A', 140, 105, 4, 19, 16, 16],
    ['50A', 155, 120, 8, 19, 16, 16],
    ['65A', 175, 140, 8, 19, 16, 18],
    ['80A', 200, 160, 8, 23, 20, 20],
    ['90A', 210, 170, 8, 23, 20, 20],
    ['100A', 225, 185, 8, 23, 20, 22],
    ['125A', 270, 225, 8, 25, 22, 22],
    ['150A', 305, 260, 12, 25, 22, 24],
    ['200A', 350, 305, 12, 25, 22, 26],
    ['250A', 430, 380, 12, 27, 24, 28],
    ['300A', 480, 430, 16, 27, 24, 30],
  ]),
  '20K': rows([
    ['10A', 90, 65, 4, 15, 12, 14],
    ['15A', 95, 70, 4, 15, 12, 14],
    ['20A', 100, 75, 4, 15, 12, 16],
    ['25A', 125, 90, 4, 19, 16, 16],
    ['32A', 135, 100, 4, 19, 16, 18],
    ['40A', 140, 105, 4, 19, 16, 18],
    ['50A', 155, 120, 8, 19, 16, 18],
    ['65A', 175, 140, 8, 19, 16, 20],
    ['80A', 200, 160, 8, 23, 20, 22],
    ['90A', 210, 170, 8, 23, 20, 24],
    ['100A', 225, 185, 8, 23, 20, 24],
    ['125A', 270, 225, 8, 25, 22, 26],
    ['150A', 305, 260, 12, 25, 22, 28],
    ['200A', 350, 305, 12, 25, 22, 30],
    ['250A', 430, 380, 12, 27, 24, 34],
    ['300A', 480, 430, 16, 27, 24, 36],
  ]),
}

export const PRESSURE_CLASSES = Object.keys(FLANGES) as PressureClass[]

/**
 * 規格原文で未確認の値（docs/data-verification.md で確度 △ としたもの）。画面・コピー・表の書き出しで ※ を付ける。
 * 原文で確認できたら、ここから消す（docs の表も合わせて直す）。
 * - rows: その呼び径の行の寸法すべて
 * - t: フランジの厚さだけ（'all' はそのクラスの全サイズ）
 *
 * いまは空。以前の項目（5K 50A の厚さ、5K・10K の 90A・175A・225A の行、16K の厚さ全部）は、
 * JIS B 2220:2012 の表14・表15・表17 の原文と照合して、すべて一致したため外した。
 * 仕組み（※ の表示・凡例）は、今後未確認の値を載せるときのために残している。
 */
export interface UnverifiedSpec {
  rows?: readonly string[]
  t?: 'all' | readonly string[]
}

export type UnverifiedList = Readonly<Partial<Record<PressureClass, UnverifiedSpec>>>

export const UNVERIFIED: UnverifiedList = {}

/** ※ の凡例（画面・コピー・表の書き出しで同じ文言にする） */
export const UNVERIFIED_LEGEND = '※ 規格原文で未確認の値'

/** JIS B 2220:2012 で、各呼び圧力のフランジの寸法（D・C・n・h・ボルト・t）を定めている表 */
export const FLANGE_TABLE_NO: Readonly<Record<PressureClass, string>> = {
  '5K': '表14',
  '10K': '表15',
  '16K': '表17',
  '20K': '表18',
}

/** 典拠に添える表番号と表題（例: 「表15 呼び圧力10Kフランジの寸法」） */
export function flangeTableLabel(pressure: PressureClass): string {
  return `${FLANGE_TABLE_NO[pressure]} 呼び圧力${pressure}フランジの寸法`
}

/** 4クラスの表番号をまとめた表記（「表14・表15・表17・表18」） */
export const ALL_FLANGE_TABLES = PRESSURE_CLASSES.map((p) => FLANGE_TABLE_NO[p]).join('・')

/** 4クラスの表番号と表題（「表14・表15・表17・表18（呼び圧力5K・10K・16K・20Kフランジの寸法）」） */
export const ALL_FLANGE_TABLES_LABEL = `${ALL_FLANGE_TABLES}（呼び圧力${PRESSURE_CLASSES.join('・')}フランジの寸法）`

/** 呼び径がどのクラスにあるかを定めている表（JIS B 2220:2012） */
export const FLANGE_SIZE_TABLE_NO = '表12'
export const FLANGE_SIZE_TABLE = `${FLANGE_SIZE_TABLE_NO} フランジの呼び径及び圧力−温度基準の適用`
/** 平面座（RF）の図・座の寸法（t が座の高さ f を含むことの典拠） */
export const GASKET_SEAT_TABLE = '表13 ガスケット座の寸法'
/**
 * 平面座（RF）の座の高さ f [mm]（JIS B 2220:2012 表13。5K・10K・16K・20K で同じ）。
 * 呼び径 from〜to の範囲で f。厚さ t はこの f を含む
 */
export const RAISED_FACE_HEIGHT: readonly { from: string; to: string; f: number }[] = [
  { from: '10A', to: '25A', f: 1 },
  { from: '32A', to: '250A', f: 2 },
  { from: '300A', to: '300A', f: 3 },
]

/** フランジの厚さの許容差 */
export const FLANGE_TOLERANCE_TABLE = '表22 フランジの寸法許容差'
/** フランジの種類とガスケット座（FF・RF など）の組合せ */
export const FLANGE_SEAT_COMBINATION_TABLE = '表8 フランジとガスケット座との組合せ'

/** 六角ナットの高さ [mm]（JIS B 1181）。style1: 本体スタイル1の最大値 / ja1: 附属書JA 1種 */
export const NUT_HEIGHT: Readonly<Record<number, { style1: number; ja1: number }>> = {
  10: { style1: 8.4, ja1: 8 },
  12: { style1: 10.8, ja1: 10 },
  16: { style1: 14.8, ja1: 13 },
  20: { style1: 18, ja1: 16 },
  22: { style1: 19.4, ja1: 18 },
  24: { style1: 21.5, ja1: 19 },
}

/** 並目ねじのピッチ [mm]（JIS B 0205-2） */
export const COARSE_PITCH: Readonly<Record<number, number>> = {
  10: 1.5,
  12: 1.75,
  16: 2,
  20: 2.5,
  22: 2.5,
  24: 3,
}

/** 平座金の厚さ [mm]（JIS B 1256 並形・ISO 7089 の呼び厚さ） */
export const WASHER_THICKNESS: Readonly<Record<number, number>> = {
  10: 2,
  12: 2.5,
  16: 3,
  20: 3,
  22: 3,
  24: 4,
}

/** 六角ボルトの呼び長さの標準系列 [mm]（JIS B 1180 本体 = ISO 4014/4017 の長さ l） */
export const STANDARD_BOLT_LENGTHS: readonly number[] = [
  16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 180,
  200, 220, 240, 260, 280, 300,
]

/** 配管用 SGP の外径 [mm]（JIS G 3452）。図面の内径の初期値に使う */
export const PIPE_OD: Readonly<Record<string, number>> = {
  '10A': 17.3,
  '15A': 21.7,
  '20A': 27.2,
  '25A': 34,
  '32A': 42.7,
  '40A': 48.6,
  '50A': 60.5,
  '65A': 76.3,
  '80A': 89.1,
  '90A': 101.6,
  '100A': 114.3,
  '125A': 139.8,
  '150A': 165.2,
  '175A': 190.7,
  '200A': 216.3,
  '225A': 241.8,
  '250A': 267.4,
  '300A': 318.5,
}
