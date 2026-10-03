// ビルド後に全ページを静的HTMLとして書き出す。
// 検索エンジンやSNSのプレビューに、ページごとのタイトル・説明・本文が見えるようにするため。
import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
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
    // Google アナリティクス 4（環境変数 VITE_GA_ID）。ページの表示は画面側（src/lib/analytics.ts）から送るので、
    // ここでは自動のページビューを止めておく。404 には入れない
    SITE.gaMeasurementId && !noindex
      ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${SITE.gaMeasurementId}"></script>\n    <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${SITE.gaMeasurementId}',{send_page_view:false});</script>`
      : '',
    // 構造化データ（JSON-LD）。中身は entry-server で < > & をエスケープ済み
    jsonLd && !noindex ? `<script type="application/ld+json">${jsonLd}</script>` : '',
  ]
    .filter(Boolean)
    .join('\n    ')
}

const ROOT_TAG = '<div id="root">'

function page(path, rendered, noindex = false) {
  if (!template.includes('<!--app-head-->') || !template.includes('<!--app-html-->') || !template.includes(ROOT_TAG)) {
    throw new Error(`index.html に <!--app-head--> / <!--app-html--> / ${ROOT_TAG} がありません`)
  }
  const html = template
    .replace('<!--app-head-->', headTags({ ...rendered, path, noindex }))
    .replace('<!--app-html-->', rendered.html)
  // 404.html は、オフラインで開けなかったページ（/tap-drill/ など）の代わりにも表示する。
  // そのときは中身が URL のページと違うので、main.tsx は結びつけ（hydrate）ずに描き直す
  return rendered.found ? html : html.replace(ROOT_TAG, '<div id="root" data-not-found>')
}

// /tap-drill → dist/tap-drill.html（Cloudflare では拡張子なしのURLで配信される）
const fileFor = (path) => join(dist, path === '/' ? 'index.html' : `${path.slice(1)}.html`)

/** 書き出したページの本文（フォントの文字セットの確認に使う） */
const pageTexts = new Map()
const textOf = (html) =>
  html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '')
    .replace(/<[^>]*>/g, ' ')

for (const path of paths) {
  const rendered = render(path)
  if (!rendered.found) throw new Error(`ページが見つかりません: ${path}`)
  const file = fileFor(path)
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, page(path, rendered))
  pageTexts.set(path, textOf(rendered.html))
}

await writeFile(join(dist, '404.html'), page('/404', render('/404'), true))

// 本番の公開用ビルド（環境変数 REQUIRE_SITE_CONFIG=1）では、公開URLや運営者情報が仮のままなら止める。
// 手元の npm run build やプレビュー用のビルドは止めない（警告だけ）
if (process.env.REQUIRE_SITE_CONFIG === '1') {
  const problems = [
    ...(SITE.url ? [] : ['公開URL（環境変数 VITE_SITE_URL）']),
    ...placeholderSettings,
  ]
  if (problems.length > 0) {
    console.error(
      `\n[公開できません] REQUIRE_SITE_CONFIG=1 のビルドですが、次の設定が未設定か「（仮）」のままです。src/site.ts・環境変数を直してください。\n${problems.map((label) => `  - ${label}`).join('\n')}\n`,
    )
    process.exit(1)
  }
}

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
// 新しい版を公開すると、開いているページは次の画面切り替えで読み直す（src/main.tsx・RouterProvider）。
const IGNORED_FONT_SUBSETS = ['cyrillic', 'cyrillic-ext', 'vietnamese']

// 緊急停止（環境変数 SW_KILL=1）: 端末に入った Service Worker が古い・壊れたページを出し続けるときに使う。
// 自分自身を登録解除してキャッシュを消すだけの sw.js を出す。一度公開して端末に行き渡ったら、通常のビルドに戻す
if (process.env.SW_KILL === '1') {
  await writeFile(
    join(dist, 'sw.js'),
    `// 緊急停止用の Service Worker（SW_KILL=1 でビルド）。キャッシュを消して登録を解除し、開いているページを読み直す
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) await caches.delete(key)
    await self.registration.unregister()
    for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url)
  })())
})
`,
  )
  console.warn('[注意] SW_KILL=1: オフライン用のキャッシュを作らず、端末の Service Worker を解除する sw.js を出力しました')
}

const { count, size } = process.env.SW_KILL === '1' ? { count: 0, size: 0 } : await generateSW({
  globDirectory: dist,
  globPatterns: ['**/*.{html,js,css,svg,png,woff2,webmanifest}'],
  // 使わないフォントの文字セットはキャッシュしない（ギリシャ文字は φ・π を数値の欄で使うのでキャッシュする）。
  // SNS のプレビュー画像は端末に保存しなくてよい
  globIgnores: [`**/*-{${IGNORED_FONT_SUBSETS.join(',')}}-*.woff2`, OG_IMAGE.file],
  swDest: join(dist, 'sw.js'),
  // 条件付きのURL（/tap-drill?d=12 など）でも、オフライン時にキャッシュしたページを出す
  ignoreURLParametersMatching: [/.*/],
  // キャッシュに無いページ（/tap-drill/ や存在しないURL）は、オンラインならそのまま取りに行き、
  // オフラインで取れないときだけ 404.html を出す（ブラウザのオフラインのエラー画面にしない）。
  // 新しく増えたページを古い Service Worker が 404 にしないよう、navigateFallback は使わない
  runtimeCaching: [
    {
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkOnly',
      options: { precacheFallback: { fallbackURL: '/404.html' } },
    },
  ],
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  sourcemap: false,
})
console.log(`service worker: ${count} files, ${Math.round(size / 1024)} KiB precached`)

// キャッシュしないフォントの文字セットの文字をページで使っていたら知らせる（オフラインでその文字だけ別のフォントになる）
{
  const assets = join(dist, 'assets')
  const cssFiles = (await readdir(assets)).filter((file) => file.endsWith('.css'))
  const css = (await Promise.all(cssFiles.map((file) => readFile(join(assets, file), 'utf8')))).join('\n')
  const ranges = []
  for (const [, block] of css.matchAll(/@font-face\s*\{([^}]*)\}/g)) {
    const subset = IGNORED_FONT_SUBSETS.find((name) => block.includes(`-${name}-wght`))
    const unicodeRange = /unicode-range:([^;}]*)/.exec(block)?.[1]
    if (!subset || !unicodeRange) continue
    for (const part of unicodeRange.split(',')) {
      const [start, end = start] = part.trim().replace(/^U\+/i, '').split('-').map((hex) => parseInt(hex, 16))
      ranges.push({ subset, start, end })
    }
  }
  const found = new Map()
  for (const [path, text] of pageTexts) {
    for (const char of text) {
      const code = char.codePointAt(0)
      const range = ranges.find(({ start, end }) => code >= start && code <= end)
      if (range) found.set(`${char}（${range.subset}）`, path)
    }
  }
  if (found.size > 0) {
    console.warn(
      `\n[注意] キャッシュしないフォントの文字セットの文字を使っています。数値の欄（等幅フォント）で使うなら、IGNORED_FONT_SUBSETS から外してください。\n${[...found].map(([char, path]) => `  - ${char} ${path}`).join('\n')}\n`,
    )
  }
}

await rm(ssrDir, { recursive: true, force: true })
console.log(
  `prerendered ${paths.length} pages + 404.html${SITE.url ? ', sitemap.xml' : ''}, robots.txt${SITE.adsenseClient ? ', ads.txt' : ''}`,
)
