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
            規格の数値は、JIS規格の表（規格票の原文と照合したもの）と、定義どおりの式（例: 1 in = 25.4
            mm）から作ります。JIS に無い値（ISO 2306 のドリル径、DIN 912 の寸法、設計でよく使われる参考値など）を載せるときは、その旨を明記します。確かめられない値は載せないか、「要確認」と明記します。
          </li>
          <li>数値の近くに、根拠にした規格の番号・年版と、規格の中の表番号（例: JIS B 2220 表15）を表示します。</li>
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
            JIS の規格票（原文）の表を読み取り、サイトのすべての数値と突き合わせる。読み取りは別にもう一度、独立に読み直して照合しています（2026年10月に、各ツールの
            JIS の数値すべてについて実施）
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
          <li className="list-decimal!">
            公開されている二次データ（規格表の転記、CADソフトのデータ、旧規格の英語版など）や作成者の知識と突き合わせる
          </li>
        </ol>
        <p className="mt-2">
          データの調査・規格票の読み取りと照合・プログラムの作成には、生成AI（Claude）の支援を受けています。そのため、出てきた値は上の方法で確かめ、確かめきれない値は下の「確認を進めている項目」に挙げています。
        </p>
      </section>

      <section>
        <h2>確度の目安</h2>
        <ul>
          <li>◎: 規格票の原文の表と照合して一致した、または規格の式で計算した</li>
          <li>○: 二次資料との照合や、規格の式による整合チェックで確かめた（原文とは未照合）</li>
          <li>△: 作成者の知識が主な根拠で、規格原文での確認が済んでいない</li>
        </ul>
        <p className="mt-2">
          規格原文で確かめられていない値（△）を載せるときは、ツール・寸法表・まとめのページでその値に「※」を付けます。2026年10月の照合で、それまで
          ※ を付けていた値（フランジの一部の寸法、ボルト穴 4級・ざぐり径、旧JIS の M3 の二面幅）はすべて原文と一致したため、いまは ※
          を付けている値はありません。
        </p>
      </section>

      <section>
        <h2>確認を進めている項目</h2>
        <p>
          次の項目は、規格原文での確認が済んでいないか、規格の値ではありません。重要な用途では、規格原文やメーカーの資料で確かめてください。
        </p>
        <ul>
          <li>
            鋼管（JIS G 3452・G 3454）: 2026年5月20日に 2026年版が発行されています。このサイトの値は 2019年版の原文と照合したもので、2026年版とは照合していません
          </li>
          <li>
            ねじ下穴の推奨ドリル径（ISO 2306）: JIS ではなく ISO の値で、原文は確認できていません。JIS B 1004
            の表のめねじ内径の範囲に入ることだけを確かめています
          </li>
          <li>六角穴付きボルト用の座ぐり（径・深さ）: JIS B 1001・B 1176 に規定のない、設計でよく使われる参考値です</li>
          <li>
            サイトの目安: ボルト長さの丸め方、下穴径の選び方、G めねじの推奨下穴径、ボルト穴の等級の選び方などは、規格の値ではなく、このサイトの考え方による目安です
          </li>
        </ul>
      </section>

      <section>
        <h2>規格の年版について</h2>
        <p>
          各ページには、数値を照合した規格の年版を表示しています。2026年10月3日の時点で、表示している JIS の年版が現行であることを日本規格協会の情報で確かめました。ただし
          JIS G 3452・G 3454 は 2026年版が発行されたため、照合した 2019年版を表示し、その旨を注記しています。JIS B 1176 は 2014年版に追補1（2015）を加えた
          2015年版です（寸法の変更はありません）。規格が改正されたときは、内容を確かめて数値と年版を更新します。規格の原文は
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
