/**
 * QR コードを SVG で描くための純粋関数（QR コードの符号化そのものは uqr が行う）。
 */

/** QR コードの周りに空ける白い余白（マス数）。規格（JIS X 0510）の推奨どおり 4 マス */
export const QR_QUIET_ZONE = 4

/**
 * 黒いマスを、横に続くものを1つの長方形にまとめた SVG のパスにする（要素の数を減らし、印刷でも継ぎ目が出ない）。
 * quiet は周りの余白のマス数で、その分だけ右下にずらす。
 * 例: [[true, true, false, true]]（余白 0）→ "M0 0h2v1h-2zM3 0h1v1h-1z"
 */
export function qrPath(modules: readonly (readonly boolean[])[], quiet = QR_QUIET_ZONE): string {
  let path = ''
  modules.forEach((row, y) => {
    let x = 0
    while (x < row.length) {
      if (!row[x]) {
        x += 1
        continue
      }
      let end = x
      while (end < row.length && row[end]) end += 1
      const width = end - x
      path += `M${x + quiet} ${y + quiet}h${width}v1h-${width}z`
      x = end
    }
  })
  return path
}

/**
 * QR コードに入れる絶対 URL。base は公開URL（SITE.url）か、表示中のサイトの origin（末尾スラッシュなし）。
 * base が無いとき（事前レンダリングで公開URLが未設定）は null
 */
export function absoluteUrl(base: string, path: string): string | null {
  const trimmed = base.replace(/\/+$/, '')
  return trimmed ? `${trimmed}${path.startsWith('/') ? path : `/${path}`}` : null
}

/** 画面・紙に出す URL の文字（https:// を省いて短くする。http の URL はそのまま） */
export function displayUrl(url: string): string {
  return url.replace(/^https:\/\//, '')
}
