/**
 * 最小限の DXF（R12 / AC1009, ASCII）書き出し。多くのCADで開ける形式。
 * 単位は mm。文字は ASCII のみにする（R12 は日本語の扱いがCADによって異なるため）。
 */

export type DxfLayer = 'OUTLINE' | 'CENTER' | 'NOTE'

type Entity =
  | { kind: 'circle'; layer: DxfLayer; x: number; y: number; r: number }
  | { kind: 'line'; layer: DxfLayer; x1: number; y1: number; x2: number; y2: number }
  | { kind: 'text'; layer: DxfLayer; x: number; y: number; height: number; text: string }

const num = (value: number) => {
  const rounded = Math.round(value * 1e6) / 1e6
  return Object.is(rounded, -0) ? '0' : String(rounded)
}

export class DxfDrawing {
  private entities: Entity[] = []

  circle(layer: DxfLayer, x: number, y: number, r: number) {
    this.entities.push({ kind: 'circle', layer, x, y, r })
    return this
  }

  line(layer: DxfLayer, x1: number, y1: number, x2: number, y2: number) {
    this.entities.push({ kind: 'line', layer, x1, y1, x2, y2 })
    return this
  }

  text(layer: DxfLayer, x: number, y: number, height: number, text: string) {
    // R12 で安全に扱えるよう ASCII 以外は取り除く
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
    pair(70, 3)
    for (const [name, color, ltype] of [
      ['OUTLINE', 7, 'CONTINUOUS'],
      ['CENTER', 1, 'CENTER'],
      ['NOTE', 3, 'CONTINUOUS'],
    ] as const) {
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
      if (e.kind === 'circle') {
        pair(0, 'CIRCLE')
        pair(8, e.layer)
        pair(10, num(e.x))
        pair(20, num(e.y))
        pair(30, '0')
        pair(40, num(e.r))
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
