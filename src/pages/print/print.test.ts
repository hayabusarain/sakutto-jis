import { encode } from 'uqr'
import { describe, expect, it } from 'vitest'
import { flangeTableRows, pipeTableRows } from '../tables/tableData'
import { PRINT_INDEX_META, PRINT_SHEETS, sheetsForTool } from './printPages'
import { absoluteUrl, displayUrl, QR_QUIET_ZONE, qrPath } from './qr'
import { flangeSheetRows, SCREW_SHEET_ROWS, SGP_SHEET_ROWS, THREAD_SHEET_ROWS } from './sheetData'

describe('qrPath', () => {
  it('横に続く黒いマスを1つの長方形にまとめる', () => {
    expect(qrPath([[true, true, false, true]], 0)).toBe('M0 0h2v1h-2zM3 0h1v1h-1z')
    expect(qrPath([[false], [true]], 4)).toBe('M4 5h1v1h-1z')
    expect(qrPath([[false, false]])).toBe('')
  })

  it('uqr で作った QR コードの黒いマスを、数も位置もそのまま描く', () => {
    const qr = encode('https://example.com/tap-drill', { ecc: 'M', border: 0 })
    const path = qrPath(qr.data)
    const dark = qr.data.flat().filter(Boolean).length
    const drawn = [...path.matchAll(/h(\d+)v1/g)].reduce((sum, match) => sum + Number(match[1]), 0)
    expect(drawn).toBe(dark)
    // 左上の位置検出パターン（7マスの黒）が、余白の分だけずれた位置から始まる
    expect(path.startsWith(`M${QR_QUIET_ZONE} ${QR_QUIET_ZONE}h7v1h-7z`)).toBe(true)
  })
})

describe('QR コードの URL', () => {
  it('公開URL（または表示中のサイト）とパスをつなぐ。base が空なら null', () => {
    expect(absoluteUrl('https://sakutto-jis.com', '/tap-drill')).toBe('https://sakutto-jis.com/tap-drill')
    expect(absoluteUrl('https://sakutto-jis.com/', '/tap-drill')).toBe('https://sakutto-jis.com/tap-drill')
    expect(absoluteUrl('http://localhost:5173', 'pipe-thread')).toBe('http://localhost:5173/pipe-thread')
    expect(absoluteUrl('', '/tap-drill')).toBeNull()
  })

  it('紙に出す URL は https:// を省く', () => {
    expect(displayUrl('https://sakutto-jis.com/tap-drill')).toBe('sakutto-jis.com/tap-drill')
    expect(displayUrl('http://localhost:5173/tap-drill')).toBe('http://localhost:5173/tap-drill')
  })
})

describe('早見表のページ', () => {
  it('一覧と4枚の早見表。パスは /print の下', () => {
    expect(PRINT_INDEX_META.path).toBe('/print')
    expect(PRINT_SHEETS.map((sheet) => sheet.path)).toEqual([
      '/print/screw',
      '/print/flange-10k',
      '/print/flange',
      '/print/pipe',
    ])
  })

  it('QR コードの行き先はツールのページ。ツールのページからは、そのツールを載せた早見表へ案内する', () => {
    expect(PRINT_SHEETS.find((sheet) => sheet.key === 'screw')?.qr.map((qr) => qr.path)).toEqual([
      '/tap-drill',
      '/bolt-size',
    ])
    expect(sheetsForTool('/pipe-thread').map((sheet) => sheet.key)).toEqual(['pipe'])
    expect(sheetsForTool('/flange-bolt-length').map((sheet) => sheet.key)).toEqual(['flange-10k', 'flange'])
    expect(sheetsForTool('/o-ring')).toEqual([])
  })
})

describe('ねじの早見表の値（ねじのまとめページ・ツールと同じ）', () => {
  it('M3〜M36 の16サイズ', () => {
    expect(SCREW_SHEET_ROWS.map((row) => row.d)).toEqual([3, 4, 5, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30, 36])
  })

  it('M12: ピッチ 1.75・下穴 10.2・二面幅 18（旧JIS 19）・六角レンチ 10・ボルト穴 13.5・ざぐり 28・座ぐり 20×13', () => {
    const row = SCREW_SHEET_ROWS.find((r) => r.d === 12)!
    expect(row).toMatchObject({
      pitch: '1.75',
      hole: '10.2',
      holeBasis: 'iso2306',
      acrossIso: '18',
      acrossJa: '19',
      acrossDiffers: true,
      hexKey: '10',
      boltHole: '13.5',
      spotFace: '28',
      counterbore: '20×13',
    })
  })

  it('下穴径の表示はツールと同じ書き方（M6 は 5.0、M3 は 2.5）。並目はすべて ISO 2306 の推奨ドリル径', () => {
    expect(SCREW_SHEET_ROWS.find((r) => r.d === 6)?.hole).toBe('5.0')
    expect(SCREW_SHEET_ROWS.find((r) => r.d === 3)?.hole).toBe('2.5')
    expect(SCREW_SHEET_ROWS.every((r) => r.holeBasis === 'iso2306')).toBe(true)
  })

  it('旧JIS の二面幅が違うのは M10・M12・M14・M22。† は M18・M22・M27。M36 は座ぐりの参考値なし', () => {
    expect(SCREW_SHEET_ROWS.filter((r) => r.acrossDiffers).map((r) => r.d)).toEqual([10, 12, 14, 22])
    expect(SCREW_SHEET_ROWS.filter((r) => r.capNonJis).map((r) => r.d)).toEqual([18, 22, 27])
    expect(SCREW_SHEET_ROWS.find((r) => r.d === 36)?.counterbore).toBeNull()
  })
})

describe('フランジの早見表の値（寸法表のページと同じ）', () => {
  it('10K 50A: 155・120・4-19・M16・二面幅 24・t 16・六角 60・スタッド 80', () => {
    const row = flangeSheetRows('10K').find((r) => r.size === '50A')!
    expect(row).toMatchObject({
      D: 155,
      C: 120,
      holes: '4-19',
      bolt: 'M16',
      across: '24',
      t: 16,
      hex: '60',
      stud: '80',
    })
  })

  it('10K 250A は M22 で、二面幅は 34（旧JIS 32）', () => {
    expect(flangeSheetRows('10K').find((r) => r.size === '250A')).toMatchObject({ bolt: 'M22', across: '34（32）' })
  })

  it('ボルト長さは寸法表と同じ条件・同じ値', () => {
    for (const pressure of ['5K', '10K', '16K', '20K'] as const) {
      const table = flangeTableRows(pressure)
      const sheet = flangeSheetRows(pressure)
      expect(sheet.map((r) => r.size)).toEqual(table.map((r) => r.size))
      expect(sheet.map((r) => r.hex)).toEqual(table.map((r) => String(r.hex.length)))
      expect(sheet.map((r) => r.stud)).toEqual(table.map((r) => String(r.stud.length)))
    }
  })
})

describe('鋼管・管用ねじの早見表の値', () => {
  it('SGP 50A: 外径 60.5・厚さ 3.8・内径 52.9・5.31 kg/m。6A〜350A の21サイズ', () => {
    expect(SGP_SHEET_ROWS.find((r) => r.a === '50A')).toEqual({
      a: '50A',
      b: '2',
      od: '60.5',
      t: '3.8',
      id: '52.9',
      mass: '5.31',
    })
    expect(SGP_SHEET_ROWS).toHaveLength(pipeTableRows('sgp').length)
    expect(SGP_SHEET_ROWS).toHaveLength(21)
  })

  it('単位質量は JIS の表と同じ有効数字3桁（125A は 15.0）', () => {
    expect(SGP_SHEET_ROWS.find((r) => r.a === '125A')?.mass).toBe('15.0')
  })

  it('管用ねじ 1/2: 14山・ピッチ 1.8143・外径 20.955・谷径 18.631・G 下穴 18.9（計算値）', () => {
    expect(THREAD_SHEET_ROWS.find((r) => r.size === '1/2')).toEqual({
      size: '1/2',
      pipeA: '15A',
      tpi: 14,
      pitch: '1.8143',
      d: '20.955',
      d1: '18.631',
      gDrill: '18.9',
    })
    expect(THREAD_SHEET_ROWS.find((r) => r.size === '1/16')?.pipeA).toBe('—')
  })
})
