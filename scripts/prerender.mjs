// ビルド後に全ページを静的HTMLとして書き出す。
// 検索エンジンやSNSのプレビューに、ページごとのタイトル・説明・本文が見えるようにするため。
import { existsSync } from 'node:fs'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { generateSW } from 'workbox-build'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

const { render, paths, sitemapEntries, placeholderSettings, SITE } = await import(
  pathToFileURL(join(ssrDir, 'entry-server.js')).href
)
const template = await readFile(join(dist, 'index.html'), 'utf8')

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pageUrl = (path) => (SITE.url ? SITE.url + (path === '/' ? '/' : path) : null)

// SNS で共有したときのプレビュー画像（public/og-image.png。元の図は scripts/og-image.svg）。
// og:image は絶対URLが必要なので、公開URLが決まっているときだけ出す
const OG_IMAGE = {
  file: 'og-image.png',
  width: 1200,
  height: 630,
  alt: `${SITE.name} - JIS規格の寸法表と計算ツール`,
}
const ogImageUrl = SITE.url && existsSync(join(dist, OG_IMAGE.file)) ? `${SITE.url}/${OG_IMAGE.file}` : null

function headTags({ title, description, path, noindex, ogType, ads, jsonLd }) {
  const url = pageUrl(path)
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    noindex ? '<meta name="robots" content="noindex" />' : '',
    !noindex && url ? `<link rel="canonical" href="${url}" />` : '',
    `<meta property="og:type" content="${ogType}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE.name)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    url ? `<meta property="og:url" content="${url}" />` : '',
    '<meta property="og:locale" content="ja_JP" />',
    ...(ogImageUrl
      ? [
          `<meta property="og:image" content="${ogImageUrl}" />`,
          '<meta property="og:image:type" content="image/png" />',
          `<meta property="og:image:width" content="${OG_IMAGE.width}" />`,
          `<meta property="og:image:height" content="${OG_IMAGE.height}" />`,
          `<meta property="og:image:alt" content="${escapeHtml(OG_IMAGE.alt)}" />`,
          '<meta name="twitter:card" content="summary_large_image" />',
        ]
      : ['<meta name="twitter:card" content="summary" />']),
    // Google Search Console の所有権確認（環境変数 VITE_GSC_VERIFICATION）
    SITE.gscVerification
      ? `<meta name="google-site-verification" content="${escapeHtml(SITE.gscVerification)}" />`
      : '',
    // Google AdSense（環境変数 VITE_ADSENSE_CLIENT）。審査用の meta は全ページ、広告のスクリプトは
    // 運営者情報・規約・404 以外のページだけに入れる
    SITE.adsenseClient ? `<meta name="google-adsense-account" content="${SITE.adsenseClient}" />` : '',
    SITE.adsenseClient && ads && !noindex
      ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsenseClient}" crossorigin="anonymous"></script>`
      : '',
    // 構造化データ（JSON-LD）。中身は entry-server で < > & をエスケープ済み
    jsonLd && !noindex ? `<script type="application/ld+json">${jsonLd}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ')
}

function page(path, rendered, noindex = false) {
  if (!template.includes('<!--app-head-->') || !template.includes('<!--app-html-->')) {
    throw new Error('index.html に <!--app-head--> / <!--app-html--> がありません')
  }
  return template
    .replace('<!--app-head-->', headTags({ ...rendered, path, noindex }))
    .replace('<!--app-html-->', rendered.html)
}

// /tap-drill → dist/tap-drill.html（Cloudflare では拡張子なしのURLで配信される）
const fileFor = (path) => join(dist, path === '/' ? 'index.html' : `${path.slice(1)}.html`)

for (const path of paths) {
  const rendered = render(path)
  if (!rendered.found) throw new Error(`ページが見つかりません: ${path}`)
  const file = fileFor(path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, page(path, rendered))
}

await writeFile(join(dist, '404.html'), page('/404', render('/404'), true))

// sitemap.xml は絶対URLが必要なので、公開URL（VITE_SITE_URL）が決まっているときだけ出力する。
// lastmod はビルド日ではなく、各ページの内容を最後に見直した日（src/site.ts の contentUpdatedAt・PAGE_UPDATED_AT）
if (SITE.url) {
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries.map(({ path, lastmod }) => `  <url><loc>${pageUrl(path)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n')}
</urlset>
`
  await writeFile(join(dist, 'sitemap.xml'), sitemap)
  await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`)
  if (placeholderSettings.length > 0) {
    console.warn(
      `\n[注意] 公開URLを設定したビルドですが、次の設定が「（仮）」のままです。src/site.ts を実際の情報に差し替えてください。\n${placeholderSettings.map((label) => `  - ${label}`).join('\n')}\n`,
    )
  }
  if (!ogImageUrl) console.warn(`${OG_IMAGE.file} が無いため、og:image を出力していません`)
} else {
  await writeFile(join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n')
  console.warn('VITE_SITE_URL が未設定のため、canonical・sitemap.xml・og:image・構造化データを出力していません')
}

// AdSense の販売者情報（ads.txt）。サイト運営者IDが設定されているときだけ出力する
if (SITE.adsenseClient) {
  const publisherId = SITE.adsenseClient.replace(/^ca-/, '')
  await writeFile(join(dist, 'ads.txt'), `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`)
} else if (process.env.VITE_ADSENSE_CLIENT) {
  console.warn('VITE_ADSENSE_CLIENT の形式が違うため無視しました（例: ca-pub-1234567890123456）')
}

// オフライン対応: 全ページとアセットをあらかじめキャッシュする Service Worker を作る。
// /tap-drill のような拡張子なしのURLは、キャッシュ済みの tap-drill.html で表示される。
const { count, size } = await generateSW({
  globDirectory: dist,
  globPatterns: ['**/*.{html,js,css,svg,png,woff2,webmanifest}'],
  // 日本語ページで使わないフォントの文字セットはキャッシュしない
  // （SNS のプレビュー画像は端末に保存しなくてよい）
  globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,vietnamese}-*.woff2', OG_IMAGE.file],
  swDest: join(dist, 'sw.js'),
  // 条件付きのURL（/tap-drill?d=12 など）でも、オフライン時にキャッシュしたページを出す
  ignoreURLParametersMatching: [/.*/],
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  sourcemap: false,
})
console.log(`service worker: ${count} files, ${Math.round(size / 1024)} KiB precached`)

await rm(ssrDir, { recursive: true, force: true })
console.log(
  `prerendered ${paths.length} pages + 404.html${SITE.url ? ', sitemap.xml' : ''}, robots.txt${SITE.adsenseClient ? ', ads.txt' : ''}`,
)
