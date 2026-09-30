import { ProseLayout } from '../components/layout/ProseLayout'
import { REPORT_URL, SITE } from '../site'

export function AboutPage() {
  return (
    <ProseLayout title="運営者情報">
      <section>
        <h2>サイト概要</h2>
        <dl className="mt-3 grid grid-cols-[7rem_1fr] gap-x-4 gap-y-2 border-t border-zinc-100 pt-3">
          <dt className="font-semibold text-zinc-900">サイト名</dt>
          <dd>{SITE.name}</dd>
          {SITE.url && (
            <>
              <dt className="font-semibold text-zinc-900">URL</dt>
              <dd className="num break-all">{SITE.url}</dd>
            </>
          )}
          <dt className="font-semibold text-zinc-900">運営者</dt>
          <dd>{SITE.operator.name}</dd>
          <dt className="font-semibold text-zinc-900">所在地</dt>
          <dd>{SITE.operator.location}</dd>
          <dt className="font-semibold text-zinc-900">開設</dt>
          <dd>{SITE.startYear}年</dd>
        </dl>
      </section>

      <section>
        <h2>サイトの目的</h2>
        <p>
          {SITE.name}
          は、機械設計者や配管・保全の現場で働く方が、JIS規格の寸法確認やちょっとした計算を、スマホからすぐに行えるようにするための無料ツールです。規格書を開く手間を減らし、手計算の確認に使っていただくことを目指しています。
        </p>
        <p>
          掲載している数値はJIS規格に基づいて作成し、各ツールに典拠の規格番号・年版と計算ロジックを明記しています。
        </p>
      </section>

      <section id="contact">
        <h2>お問い合わせ・誤記報告</h2>
        <p>
          数値の不備や誤記、ご要望などがありましたら、下記までご連絡ください。誤記のご報告には、該当するツール名・条件・正しいと思われる値（可能であれば根拠）を添えていただけると、確認がスムーズです。
        </p>
        <ul>
          <li>
            メール：<span className="num">{SITE.operator.email}</span>
          </li>
          {REPORT_URL && (
            <li>
              <a href={REPORT_URL} target="_blank" rel="noopener noreferrer">
                誤記報告フォーム
              </a>
            </li>
          )}
        </ul>
        <p className="text-xs text-zinc-500">
          ※ 個別の設計相談や規格の解釈に関するご質問にはお答えできない場合があります。
        </p>
      </section>
    </ProseLayout>
  )
}
