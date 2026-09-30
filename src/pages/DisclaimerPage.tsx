import { ProseLayout } from '../components/layout/ProseLayout'
import { Link } from '../router/Link'
import { SITE } from '../site'
import { JISC_URL } from '../standards'

export function DisclaimerPage() {
  return (
    <ProseLayout title="免責事項" meta={`制定日：${SITE.policyDate}`}>
      <section>
        <h2>掲載データと計算結果について</h2>
        <p>
          本サイトのデータはJIS規格に基づき万全を期して作成しておりますが、その正確性・完全性・最新性を保証するものではありません。実業務でのご使用時は、必要に応じて公式の規格書（最新版）やメーカーの資料をご確認ください。
        </p>
        <p>
          計算結果は一般的な条件を前提とした目安です。材質・圧力・温度・工具・加工条件などによって適切な値は変わります。最終的な判断は、利用者ご自身の責任で行ってください。
        </p>
      </section>

      <section>
        <h2>損害について</h2>
        <p>
          本サイトの利用、または本サイトの情報に基づいて行った設計・加工・施工などによって生じたいかなる損害についても、運営者は一切の責任を負いかねます。
        </p>
      </section>

      <section>
        <h2>規格原文の確認</h2>
        <p>
          本サイトはJIS規格の原文を掲載・配布するものではありません。規格の原文は
          <a href={JISC_URL} target="_blank" rel="noopener noreferrer">
            日本産業標準調査会（JISC）
          </a>
          のJIS検索で閲覧できるほか、日本規格協会（JSA）から購入できます。
        </p>
      </section>

      <section>
        <h2>誤記の報告</h2>
        <p>
          人やプログラムによる誤りの可能性をゼロにはできません。数値の不備や誤記を見つけた場合は、
          <Link to="/about#contact">お問い合わせ・誤記報告</Link>
          からご連絡いただけますと幸いです。確認のうえ、速やかに修正します。
        </p>
      </section>

      <section>
        <h2>リンク・内容の変更</h2>
        <p>
          本サイトからリンクしている外部サイトの内容について、運営者は責任を負いません。また、本サイトの内容は予告なく変更・削除することがあります。
        </p>
      </section>
    </ProseLayout>
  )
}
