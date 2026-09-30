// ビルド後に全ページを静的HTMLとして書き出す。
// 検索エンジンやSNSのプレビューに、ページごとのタイトル・説明・本文が見えるようにするため。
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { generateSW } from 'workbox-build'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

const { render, paths, SITE } = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)
const template = await readFile(join(dist, 'index.html'), 'utf8')

const escapeHtml = (text) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pageUrl = (path) => (SITE.url ? SITE.url + (path === '/' ? '/' : path) : null)

function headTags({ title, description, path, noindex }) {
  const url = pageUrl(path)
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<meta name="description" content="${escapeHtml(description)}" />`,
    noindex ? '<meta name="robots" content="noindex" />' : '',
    !noindex && url ? `<link rel="canonical" href="${url}" />` : '',
    `<meta property="og:type" content="${path === '/' ? 'website' : 'article'}" />`,
    `<meta property="og:site_name" content="${escapeHtml(SITE.name)}" />`,
    `<meta property="og:title" content="${escapeHtml(title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    url ? `<meta property="og:url" content="${url}" />` : '',
    '<meta name="twitter:card" content="summary" />',
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

// sitemap.xml は絶対URLが必要なので、公開URL（VITE_SITE_URL）が決まっているときだけ出力する
if (SITE.url) {
  const today = new Date().toISOString().slice(0, 10)
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${pageUrl(path)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`
  await writeFile(join(dist, 'sitemap.xml'), sitemap)
  await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n`)
} else {
  await writeFile(join(dist, 'robots.txt'), 'User-agent: *\nAllow: /\n')
  console.warn('VITE_SITE_URL が未設定のため、canonical と sitemap.xml を出力していません')
}

// オフライン対応: 全ページとアセットをあらかじめキャッシュする Service Worker を作る。
// /tap-drill のような拡張子なしのURLは、キャッシュ済みの tap-drill.html で表示される。
const { count, size } = await generateSW({
  globDirectory: dist,
  globPatterns: ['**/*.{html,js,css,svg,png,woff2,webmanifest}'],
  // 日本語ページで使わないフォントの文字セットはキャッシュしない
  globIgnores: ['**/*-{cyrillic,cyrillic-ext,greek,vietnamese}-*.woff2'],
  swDest: join(dist, 'sw.js'),
  skipWaiting: true,
  clientsClaim: true,
  cleanupOutdatedCaches: true,
  sourcemap: false,
})
console.log(`service worker: ${count} files, ${Math.round(size / 1024)} KiB precached`)

await rm(ssrDir, { recursive: true, force: true })
console.log(`prerendered ${paths.length} pages + 404.html${SITE.url ? ', sitemap.xml' : ''}, robots.txt`)
