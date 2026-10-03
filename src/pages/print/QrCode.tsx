import { useEffect, useState, useSyncExternalStore } from 'react'
import { SITE } from '../../site'
import { absoluteUrl, displayUrl, QR_QUIET_ZONE, qrPath } from './qr'

const subscribeNothing = () => () => {}
const readOrigin = () => window.location.origin

/**
 * サイト内のパスの絶対 URL。公開URL（SITE.url）があればそれを使う（事前レンダリングにも出る）。
 * 無いビルド（手元・プレビュー）では、事前レンダリングと食い違わないよう、表示後に開いているサイトの URL から作る
 */
function useAbsoluteUrl(path: string): string | null {
  const origin = useSyncExternalStore(subscribeNothing, readOrigin, () => '')
  return absoluteUrl(SITE.url || origin, path)
}

interface Encoded {
  url: string
  /** 余白を含む1辺のマス数 */
  size: number
  path: string
}

interface QrCodeProps {
  /** 行き先（サイト内のパス。例: /tap-drill） */
  path: string
  /** QR コードの上に出す行き先の名前 */
  label: string
}

/**
 * 早見表に載せる、ツールを開く QR コード（SVG）と URL の文字。
 * QR コードの部品（uqr）は早見表のページでだけ読み込み、表示後に描く（ほかのページの読み込みを重くしない）。
 */
export function QrCode({ path, label }: QrCodeProps) {
  const url = useAbsoluteUrl(path)
  const [encoded, setEncoded] = useState<Encoded | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!url) return
    let active = true
    import('uqr')
      .then(({ encode }) => {
        if (!active) return
        // 誤り訂正レベル M（15%）。紙が汚れたり折れたりしても読めるように
        const qr = encode(url, { ecc: 'M', border: 0 })
        setEncoded({ url, size: qr.size + QR_QUIET_ZONE * 2, path: qrPath(qr.data) })
      })
      .catch(() => {
        // オフラインで部品を読み込めないときなど。URL の文字だけを出す
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [url])

  const current = encoded !== null && encoded.url === url ? encoded : null

  return (
    <figure className="flex w-28 shrink-0 flex-col items-center text-center sm:w-32 print:w-[27mm]">
      <figcaption className="text-xs leading-snug font-bold text-zinc-800 print:text-[8pt]">
        {label}
        <span className="block font-normal text-zinc-600">をスマホで開く</span>
      </figcaption>
      <div className="mt-1 aspect-square w-full">
        {current ? (
          <svg
            viewBox={`0 0 ${current.size} ${current.size}`}
            role="img"
            aria-label={`${label}を開く QR コード（${current.url}）`}
            shapeRendering="crispEdges"
            className="block size-full"
          >
            <rect width={current.size} height={current.size} fill="#fff" />
            <path d={current.path} fill="#000" />
          </svg>
        ) : (
          <div className="flex size-full items-center justify-center border border-dashed border-zinc-300 px-2 text-[11px] leading-snug text-zinc-500">
            {failed ? 'QR コードを表示できませんでした' : 'QR コード'}
          </div>
        )}
      </div>
      <p className="num mt-1 w-full text-[10px] leading-tight break-all text-zinc-700 print:text-[7pt]">
        {url ? displayUrl(url) : path}
      </p>
    </figure>
  )
}
