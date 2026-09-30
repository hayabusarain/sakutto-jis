/**
 * 典拠として表示する規格（主にJIS）。年版は調査で確認した最新版を記載する。
 * 規格の原文はJISC（日本産業標準調査会）のJIS検索で閲覧できる。
 */
export const STANDARDS = {
  'JIS B 0202': { year: '1999', title: '管用平行ねじ' },
  'JIS B 0203': { year: '1999', title: '管用テーパねじ' },
  'JIS B 0205-2': { year: '2001', title: '一般用メートルねじ－第2部：全体系' },
  'JIS B 0205-4': { year: '2001', title: '一般用メートルねじ－第4部：基準寸法' },
  'JIS B 0209-1': { year: '2001', title: '一般用メートルねじ－公差－第1部：原則及び基礎データ' },
  'JIS B 0405': {
    year: '1991',
    title: '普通公差－第1部：個別に公差の指示がない長さ寸法及び角度寸法に対する公差',
  },
  'JIS B 1001': { year: '1985', title: 'ボルト穴径及びざぐり径' },
  'JIS B 1004': { year: '2009', title: 'ねじ下穴径' },
  'JIS B 1082': { year: '2009', title: 'ねじの有効断面積及び座面の負荷面積' },
  'JIS B 1176': { year: '2014', title: '六角穴付きボルト' },
  'JIS B 1180': { year: '2014', title: '六角ボルト' },
  'JIS B 1181': { year: '2014', title: '六角ナット' },
  'JIS B 1256': { year: '2008', title: '平座金' },
  'JIS B 2220': { year: '2012', title: '鋼製管フランジ' },
  'JIS B 2401-1': { year: '2012', title: 'Oリング－第1部：Oリング' },
  'JIS B 2401-2': { year: '2012', title: 'Oリング－第2部：ハウジングの形状・寸法' },
  'JIS G 3452': { year: '2019', title: '配管用炭素鋼鋼管' },
  'JIS G 3454': { year: '2019', title: '圧力配管用炭素鋼鋼管' },
  'ISO 2306': { year: '1972', title: 'ねじ下穴用ドリル' },
} as const satisfies Record<string, { year: string; title: string }>

export type StandardCode = keyof typeof STANDARDS

/** 「JIS B 2220:2012」の形にする */
export function standardLabel(code: StandardCode): string {
  return `${code}:${STANDARDS[code].year}`
}

export const JISC_URL = 'https://www.jisc.go.jp/'
