/**
 * フランジ図面用の DXF（R12 / AC1009, ASCII）書き出し。
 * 共通の src/lib/dxf.ts に円弧（ARC）とねじ山用の細線レイヤー（THREAD）を足したもの。
 * 単位は mm。文字は ASCII のみ（直径記号は R12 の制御コード %%c、± は %%p で書く）。
 */

export type FlangeDxfLayer = 'OUTLINE' | 'CENTER' | 'THREAD' | 'NOTE'

/** レイヤー名・色番号（ACI）・線種 */
const LAYERS: readonly (readonly [FlangeDxfLayer, number, 'CONTINUOUS' | 'CENTER'])[] = [
  ['OUTLINE', 7, 'CONTINUOUS'],
  ['CENTER', 1, 'CENTER'],
  // めねじの谷の径（3/4 の円）。細線として別の色にする
  ['THREAD', 4, 'CONTINUOUS'],
  ['NOTE', 3, 'CONTINUOUS'],
]

type Entity =
  | { kind: 'circle'; layer: FlangeDxfLayer; x: number; y: number; r: number }
  | { kind: 'arc'; layer: FlangeDxfLayer; x: number; y: number; r: number; start: number; end: number }
  | { kind: 'line'; layer: FlangeDxfLayer; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'text'; layer: FlangeDxfLayer; x: number; y: number; height: number; text: string }

const num = (value: number) => {
  const rounded = Math.round(value * 1e6) / 1e6
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

export class FlangeDxf {
  private entities: Entity[] = []

  circle(layer: FlangeDxfLayer, x: number, y: number, r: number) {
    this.entities.push({ kind: 'circle', layer, x, y, r })
    return this
  }

  /** 円弧。角度は度で、+x 方向から反時計回り（start → end） */
  arc(layer: FlangeDxfLayer, x: number, y: number, r: number, start: number, end: number) {
    this.entities.push({ kind: 'arc', layer, x, y, r, start, end })
    return this
  }

  line(layer: FlangeDxfLayer, x1: number, y1: number, x2: number, y2: number) {
    this.entities.push({ kind: 'line', layer, x1, y1, x2, y2 })
    return this
  }

  text(layer: FlangeDxfLayer, x: number, y: number, height: number, text: string) {
    // R12 で安全に扱えるよう ASCII 以外は取り除く（%%c などの制御コードは ASCII なので残る）
    const ascii = text.replace(/[^\x20-\x7e]/g, '')
    this.entities.push({ kind: 'text', layer, x, y, height, text: ascii })
    return this
  }

  toString(): string {
    const out: (string | number)[] = []
    const pair = (code: number, value: string | number) => out.push(code, value)

    pair(0, 'SECTION')
    pair(2, 'HEADER')
    pair(9, '$ACADVER')
    pair(1, 'AC1009')
    pair(9, '$INSBASE')
    pair(10, '0.0')
    pair(20, '0.0')
    pair(30, '0.0')
    pair(0, 'ENDSEC')

    pair(0, 'SECTION')
    pair(2, 'TABLES')
    pair(0, 'TABLE')
    pair(2, 'LTYPE')
    pair(70, 2)
    pair(0, 'LTYPE')
    pair(2, 'CONTINUOUS')
    pair(70, 0)
    pair(3, 'Solid line')
    pair(72, 65)
    pair(73, 0)
    pair(40, '0.0')
    pair(0, 'LTYPE')
    pair(2, 'CENTER')
    pair(70, 0)
    pair(3, 'Center ____ _ ____ _')
    pair(72, 65)
    pair(73, 4)
    pair(40, '20.0')
    pair(49, '12.0')
    pair(49, '-3.0')
    pair(49, '2.0')
    pair(49, '-3.0')
    pair(0, 'ENDTAB')
    pair(0, 'TABLE')
    pair(2, 'LAYER')
    pair(70, LAYERS.length)
    for (const [name, color, ltype] of LAYERS) {
      pair(0, 'LAYER')
      pair(2, name)
      pair(70, 0)
      pair(62, color)
      pair(6, ltype)
    }
    pair(0, 'ENDTAB')
    pair(0, 'ENDSEC')

    pair(0, 'SECTION')
    pair(2, 'ENTITIES')
    for (const e of this.entities) {
      if (e.kind === 'circle' || e.kind === 'arc') {
        pair(0, e.kind === 'circle' ? 'CIRCLE' : 'ARC')
        pair(8, e.layer)
        pair(10, num(e.x))
        pair(20, num(e.y))
        pair(30, '0')
        pair(40, num(e.r))
        if (e.kind === 'arc') {
          pair(50, num(e.start))
          pair(51, num(e.end))
        }
      } else if (e.kind === 'line') {
        pair(0, 'LINE')
        pair(8, e.layer)
        pair(10, num(e.x1))
        pair(20, num(e.y1))
        pair(30, '0')
        pair(11, num(e.x2))
        pair(21, num(e.y2))
        pair(31, '0')
      } else {
        pair(0, 'TEXT')
        pair(8, e.layer)
        pair(10, num(e.x))
        pair(20, num(e.y))
        pair(30, '0')
        pair(40, num(e.height))
        pair(1, e.text)
      }
    }
    pair(0, 'ENDSEC')
    pair(0, 'EOF')

    // グループコードと値を1行ずつ交互に並べる（CRLF が最も互換性が高い）
    const lines: string[] = []
    for (let i = 0; i < out.length; i += 2) {
      lines.push(String(out[i]).padStart(3, ' '), String(out[i + 1]))
    }
    return lines.join('\r\n') + '\r\n'
  }
}
