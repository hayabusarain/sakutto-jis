import { ProseLayout } from '../components/layout/ProseLayout'
import { P_ROWS, G_ROWS } from '../features/o-ring/data'
import { sizesOf } from '../features/steel-pipe/calc'
import { PIPE_SPECS, type PipeSpec } from '../features/steel-pipe/data'
import { Link } from '../router/Link'
import { isPlaceholder, REPORT_URL, SITE, SITE_CHANGELOG } from '../site'
import { JISC_URL } from '../standards'
import { formatJaDate } from './content/dates'

/** 単位質量を式で再計算して確かめている鋼管の行数 */
const PIPE_ROW_COUNT = (Object.keys(PIPE_SPECS) as PipeSpec[]).reduce((sum, spec) => sum + sizesOf(spec).length, 0)
const ORING_COUNT = P_ROWS.length + G_ROWS.length

export function EditorialPolicyPage() {
  const { operator } = SITE

  return (
    <ProseLayout title="編集方針・データの確認方法" meta={`最終更新：${formatJaDate(SITE.contentUpdatedAt)}`}>
      <section>
        <h2>このサイトの方針</h2>
        <p>
          {SITE.name}
          は、現場や設計で使うJIS規格の寸法と計算を、すぐに確かめられるようにするためのサイトです。数値の正しさを何より大切にし、次の方針で作っています。
        </p>
        <ul>
          <li>
            規格の数値は、JIS規格の表（公開されている二次資料での照合を含む）と、定義どおりの式（例: 1 in = 25.4
            mm）から作ります。JIS に無い値（DIN 912 の寸法、設計でよく使われる参考値など）を載せるときは、その旨を明記します。確かめられない値は載せないか、「要確認」と明記します。
          </li>
          <li>数値の近くに、根拠にした規格の番号と年版を表示します。</li>
          <li>計算で求める値は「計算ロジック」を開くと、式と、いま選んでいる値を入れた計算例を確認できます。</li>
          <li>下穴径・ボルト長さなど、加工条件やメーカーによって適した値が変わるものは「目安」として示します。</li>
          <li>広告を掲載する場合も、広告主の意向で数値や説明を変えることはありません。</li>
        </ul>
      </section>

      <section>
        <h2>データの確認方法</h2>
        <p>規格の数値は、次の3つを組み合わせて確かめています。</p>
        <ol className="mt-2 space-y-1">
          <li className="list-decimal!">
            公開されている二次データ（規格表の転記、CADソフトのデータ、旧規格の英語版など）と突き合わせる
          </li>
          <li className="list-decimal!">
            規格の計算式で、表の値どうしが整合しているかを確かめる。たとえば次のような確認を自動テストにして、サイトを更新するたびに実行しています。
            <ul>
              <li>
                鋼管の単位質量: JIS の式 0.02466 × t × (D − t) で全{PIPE_ROW_COUNT}
                行を計算し直し、表の値と一致すること
              </li>
              <li>Oリング溝: 規格の表に示されたつぶし率の範囲を、太さのグループごとに再現できること（全{ORING_COUNT}サイズのデータ）</li>
              <li>管用ねじ: 外径・有効径・谷径が、ねじ山の高さの式と整合すること</li>
            </ul>
          </li>
          <li className="list-decimal!">作成者の知識と突き合わせる</li>
        </ol>
        <p className="mt-2">
          データの調査とプログラムの作成には、生成AI（Claude）の支援を受けています。そのため、出てきた値は上の方法で確かめ、確かめきれない値は下の「確認を進めている項目」に挙げています。
        </p>
      </section>

      <section>
        <h2>確度の目安</h2>
        <ul>
          <li>◎: 独立した2つ以上の資料で一致する、または規格の式・表で再現できる</li>
          <li>○: 1つの資料と整合チェック、または部分的な照合で確かめた</li>
          <li>△: 作成者の知識が主な根拠で、規格原文での確認を進めている</li>
        </ul>
        <p className="mt-2">
          △ の値には、ツール・寸法表・まとめのページで「※」を付けています。普通公差（JIS B 0405）は表の値がすべて △
          のため、値ごとではなく、ページの典拠の近く・コピー文・CSV に注記を付けています。
        </p>
      </section>

      <section>
        <h2>確認を進めている項目</h2>
        <p>次の項目は、規格原文での確認が済んでいません。重要な用途では、規格原文やメーカーの資料で確かめてください。</p>
        <ul>
          <li>JISフランジ（JIS B 2220）: 16K の厚さ、5K 50A の厚さ、5K・10K の 90A・175A・225A の寸法、フランジの厚さと座（RF）の関係</li>
          <li>ボルト穴径・ざぐり径（JIS B 1001）: 4級のボルト穴径、ざぐり径 D'</li>
          <li>六角ナット（JIS B 1181 附属書JA）: M3 の二面幅（5.5 と 5 の資料があります）</li>
          <li>ねじ下穴径（JIS B 1004）: 規格の表の構成（公差域クラスごとの印の有無など）</li>
          <li>
            Oリング（JIS B 2401）: 2012年版の表が、旧 JIS B 2406:1991
            の値（寸法・溝・E・バックアップリングなしで使えるすきまの表・材料による許容差の倍率）をそのまま引き継いでいるか
          </li>
          <li>普通公差（JIS B 0405）: 表の値・区分の境界の扱い（ISO 2768-1 の資料とは一致）</li>
          <li>
            規格の年版: JIS B 0405（1991）、B 1082（2009）、B 1176・B 1180・B 1181（2014）、B 1256（2008）、B
            1001（1985）、G 3452・G 3454（2019）が最新か、JIS B 2220（2012）の改正の有無
          </li>
        </ul>
      </section>

      <section>
        <h2>規格の年版について</h2>
        <p>
          各ページには、確認できた最新の年版を表示しています。規格が改正されたときは、内容を確かめて数値と年版を更新します。規格の原文は
          <a href={JISC_URL} target="_blank" rel="noopener noreferrer">
            日本産業標準調査会（JISC）
          </a>
          のJIS検索で閲覧できます。
        </p>
      </section>

      <section>
        <h2>誤りを見つけたとき（訂正の方針）</h2>
        <ul>
          <li>
            数値の不備や誤記のご報告は、
            {REPORT_URL ? (
              <a href={REPORT_URL} target="_blank" rel="noopener noreferrer">
                誤記報告フォーム
              </a>
            ) : (
              <Link to="/about#contact">お問い合わせ・誤記報告</Link>
            )}
            で受け付けています。ツール名・条件・正しいと思われる値（できれば根拠）を添えていただけると、確認がスムーズです。
          </li>
          <li>いただいた報告は規格原文などで確かめ、誤りであれば速やかに修正します。</li>
          <li>修正した内容は、このページの「更新履歴」に記録します。</li>
        </ul>
      </section>

      <section>
        <h2>作成・運営</h2>
        <p>
          運営者: {operator.name}
          {operator.profile && !isPlaceholder(operator.profile) && <>（{operator.profile}）</>}
        </p>
        <p>
          運営者の詳しい情報と連絡先は、<Link to="/about">運営者情報</Link>をご覧ください。
        </p>
      </section>

      <section>
        <h2>更新履歴</h2>
        <ul>
          {SITE_CHANGELOG.map((entry) => (
            <li key={entry.date + entry.text}>
              <span className="num">{formatJaDate(entry.date)}</span>　{entry.text}
            </li>
          ))}
        </ul>
      </section>
    </ProseLayout>
  )
}
