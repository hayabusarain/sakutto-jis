import { useEffect } from 'react'
import { useRouter } from '../../router/context'
import { SITE } from '../../site'

declare global {
  interface Window {
    adsbygoogle?: unknown[]
  }
}

interface AdSlotProps {
  /** AdSense で作った広告ユニットの ID（data-ad-slot） */
  slot: string
  className?: string
}

/**
 * AdSense の広告枠（ディスプレイ広告・レスポンシブ）。
 * 環境変数 VITE_ADSENSE_CLIENT が無いとき・slot が空のときは何も表示しない。
 *
 * 置き方の約束（AdSense のポリシーと使いやすさのため）
 * - 「結果」カードの後、表・解説の後に置く。「条件」と「結果」の間には置かない（誤タップを招く）
 * - 運営者情報・プライバシーポリシー・免責事項・404 には置かない（広告のスクリプトも読み込まない）
 * - 自動広告を使う場合、上部のアンカー広告はツール切替バー（画面上部に固定）と重なるので AdSense の管理画面で無効にする
 * - EEA・英国向けの同意メッセージは AdSense の「プライバシーとメッセージ」で設定する（コードの変更は不要）
 *
 * 広告が読み込まれる前後で画面がずれないよう、あらかじめ高さを確保する。
 * ページを切り替えるたびに広告枠を作り直して、新しいページの広告を読み込む。
 */
export function AdSlot({ slot, className = '' }: AdSlotProps) {
  const { pathname } = useRouter()
  const client = SITE.adsenseClient

  useEffect(() => {
    if (!client || !slot) return
    try {
      window.adsbygoogle ??= []
      window.adsbygoogle.push({})
    } catch {
      // 広告ブロッカーなどで読み込めなくても、ページはそのまま使える
    }
  }, [client, slot, pathname])

  if (!client || !slot) return null

  return (
    <aside aria-label="広告" className={`my-6 print:hidden ${className}`}>
      <p className="mb-1 text-center text-[11px] tracking-wider text-zinc-600">スポンサーリンク</p>
      <ins
        key={pathname}
        className="adsbygoogle block min-h-[280px] w-full overflow-hidden sm:min-h-[120px]"
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  )
}
