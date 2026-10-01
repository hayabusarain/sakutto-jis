// SNS で共有したときのプレビュー画像（public/og-image.png、1200×630）を scripts/og-image.svg から書き出す。
// 図を直したときだけ手元で実行し、できた PNG をコミットする（ビルドでは実行しない。Playwright は依存に入れていない）。
//
//   node scripts/og-image.mjs [フォントの CSS]
//
// - Playwright は `npm i -g playwright && npx playwright install chromium` などで用意する
//   （見つからないときは、グローバルにインストールした Playwright を探す）
// - 日本語フォントは、端末に入っているもの（Noto Sans JP など）が使われる。
//   決まったフォントで書き出したいときは、@font-face を書いた CSS ファイルを引数で渡す
//   （例: Google Fonts の Noto Sans JP 500・700 を data: URL で埋め込んだもの）
import { execSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = await readFile(join(root, 'scripts', 'og-image.svg'), 'utf8')
const fontCss = process.argv[2] ? await readFile(process.argv[2], 'utf8') : ''

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim()
    return import(pathToFileURL(join(globalRoot, 'playwright', 'index.mjs')).href)
  }
}

const { chromium } = await loadPlaywright()
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(
    `<!doctype html><html><head><meta charset="utf-8"><style>${fontCss}
      html, body { margin: 0; padding: 0; background: #18181b; }
      svg { display: block; }
    </style></head><body>${svg}</body></html>`,
  )
  await page.evaluate(() => document.fonts.ready)
  const output = join(root, 'public', 'og-image.png')
  await page.locator('svg').screenshot({ path: output, type: 'png' })
  console.log(`wrote ${output}`)
} finally {
  await browser.close()
}
