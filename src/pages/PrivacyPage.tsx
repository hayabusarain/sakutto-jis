import { ProseLayout } from '../components/layout/ProseLayout'
import { Link } from '../router/Link'
import { SITE } from '../site'

export function PrivacyPage() {
  return (
    <ProseLayout title="プライバシーポリシー" meta={`制定日：${SITE.policyDate}`}>
      <section>
        <p>
          {SITE.name}
          （以下「本サイト」）は、利用者の個人情報とプライバシーを尊重し、以下のとおり取り扱います。
        </p>
      </section>

      <section>
        <h2>1. 取得する情報</h2>
        <p>
          本サイトは会員登録などを必要とせず、氏名・メールアドレス等の個人情報は、お問い合わせの際に利用者ご自身が提供された場合を除き取得しません。お問い合わせで取得した情報は、回答や誤記の確認のためだけに利用し、法令に基づく場合を除き第三者に提供しません。
        </p>
      </section>

      <section>
        <h2>2. 計算ツールへの入力内容</h2>
        <p>
          計算はお使いのブラウザの中で行い、入力内容を計算のためにサーバーへ送ることはありません。ただし、条件を共有・ブックマークできるよう、選んだり入力したりした条件をページのURL（例:{' '}
          <span className="num whitespace-nowrap">?d=12&amp;p=1.75</span>、トップページの検索語{' '}
          <span className="num whitespace-nowrap">?q=</span>）に含めています。そのURLを開いたり再読み込みしたりしたときは、URLに含まれる条件が配信サーバー（Cloudflare）に、また広告・アクセス解析を利用する場合はそれらの事業者に送信されます。
        </p>
        <p>
          次回も同じ条件で使えるよう、入力内容をブラウザの保存領域（ローカルストレージ）に保存することがあります。また、オフラインでも使えるよう、本サイトのページやプログラムのファイルをブラウザに保存します（Service Worker）。これらは個人を特定する情報を含まず、ブラウザの設定（サイトデータの削除）からいつでも削除できます。
        </p>
      </section>

      <section>
        <h2>3. アクセス解析ツール</h2>
        <p>
          本サイトは、利用状況を把握してサイトを改善するため、アクセス解析ツール（Cloudflare Web Analytics、Googleアナリティクスなど）を利用する場合があります。これらのツールは、閲覧したページ・参照元・ブラウザの種類などの情報を収集しますが、個人を特定する情報は含みません。Googleアナリティクスを利用する場合、Cookieを使用してデータを収集します。収集を望まない場合は、ブラウザの設定でCookieを無効にするか、
          <a
            href="https://tools.google.com/dlpage/gaoptout?hl=ja"
            target="_blank"
            rel="noopener noreferrer"
          >
            Googleアナリティクス オプトアウト アドオン
          </a>
          をご利用ください。
        </p>
      </section>

      <section>
        <h2>4. 広告の配信</h2>
        <p>
          本サイトは、第三者配信の広告サービス（Googleアドセンスなど）を利用する場合があります。Googleなどの第三者配信事業者は、Cookieを使用して、利用者が本サイトや他のサイトに過去にアクセスした際の情報に基づいて広告を配信します。
        </p>
        <p>
          利用者は
          <a href="https://adssettings.google.com/" target="_blank" rel="noopener noreferrer">
            Googleの広告設定
          </a>
          でパーソナライズ広告を無効にできます。また、
          <a href="https://www.aboutads.info/" target="_blank" rel="noopener noreferrer">
            www.aboutads.info
          </a>
          にアクセスすれば、パーソナライズ広告に使われる第三者配信事業者のCookieを無効にできます。詳しくは
          <a
            href="https://policies.google.com/technologies/ads?hl=ja"
            target="_blank"
            rel="noopener noreferrer"
          >
            Googleの広告に関するポリシー
          </a>
          をご覧ください。
        </p>
      </section>

      <section>
        <h2>5. 外部への情報送信について</h2>
        <p>
          本サイトでは、サイトの配信と、上記のアクセス解析・広告配信のため、利用者の端末から次の事業者へ情報が送信される場合があります。
        </p>
        <ul>
          <li>
            Cloudflare, Inc.（サイトの配信・アクセス解析）：閲覧ページのURL（URLに含まれる条件を含む）、参照元、ブラウザの種類など
          </li>
          <li>
            Google LLC（アクセス解析・広告配信）：閲覧ページのURL（URLに含まれる条件を含む）、Cookie識別子、IPアドレスなど
          </li>
        </ul>
      </section>

      <section>
        <h2>6. 本ポリシーの変更</h2>
        <p>
          本ポリシーの内容は、法令の変更やサービス内容の変更に応じて、予告なく改定することがあります。改定後の内容は本ページに掲載した時点から効力を生じます。
        </p>
      </section>

      <section>
        <h2>7. お問い合わせ</h2>
        <p>
          本ポリシーに関するお問い合わせは、<Link to="/about#contact">運営者情報</Link>
          に記載の連絡先までお願いします。
        </p>
      </section>
    </ProseLayout>
  )
}
