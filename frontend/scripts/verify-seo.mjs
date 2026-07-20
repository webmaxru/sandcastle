// Verify the built SEO / agent-readiness output in dist/.
// Reusable proof — run after `npm run build`:  node scripts/verify-seo.mjs
import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'))
const DIST = path.resolve(HERE, '..', 'dist')
const ORIGIN = 'https://sandcastle.isainative.dev'

let fails = 0
const ok = (name, cond, detail = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail && !cond ? '  — ' + detail : ''}`)
  if (!cond) fails++
}
const read = (rel) => readFileSync(path.join(DIST, rel), 'utf8')
const has = (hay, needle) => hay.includes(needle)

// ---- index.html --------------------------------------------------------
const html = read('index.html')

ok('html lang="en"', /<html lang="en"/.test(html))
ok('charset', /<meta charset="UTF-8"/i.test(html))
ok('viewport', /name="viewport"/.test(html))
ok('title has brand', /<title>Sandcastle[\s\S]*?<\/title>/.test(html))
ok('meta description length ~150-160', (() => {
  const m = html.match(/name="description"\s*\n?\s*content="([^"]+)"/)
  if (!m) return false
  const len = m[1].length
  return len >= 120 && len <= 175
})(), 'description missing or wrong length')
ok('canonical absolute', has(html, `<link rel="canonical" href="${ORIGIN}/"`))
ok('robots meta', has(html, 'name="robots"') && has(html, 'max-image-preview:large'))
ok('googlebot meta', has(html, 'name="googlebot"'))
ok('author', has(html, 'name="author" content="Maxim Salnikov"'))
ok('theme-color', has(html, 'name="theme-color"'))

// Open Graph
for (const p of ['og:type', 'og:site_name', 'og:locale', 'og:title', 'og:description',
  'og:url', 'og:image', 'og:image:type', 'og:image:width', 'og:image:height', 'og:image:alt']) {
  ok(`OG ${p}`, has(html, `property="${p}"`))
}
ok('og:url absolute', has(html, `property="og:url" content="${ORIGIN}/"`))
ok('og:image absolute', has(html, `property="og:image" content="${ORIGIN}/og-image.png"`))

// Twitter
for (const p of ['twitter:card', 'twitter:title', 'twitter:description', 'twitter:image', 'twitter:image:alt']) {
  ok(`Twitter ${p}`, has(html, `name="${p}"`))
}
ok('twitter:card summary_large_image', has(html, 'name="twitter:card" content="summary_large_image"'))
ok('NO invented twitter handle', !has(html, 'twitter:site') && !has(html, 'twitter:creator'))

// Icons + manifest + preloads
ok('favicon.ico link', has(html, 'rel="icon" href="/favicon.ico"'))
ok('favicon.svg link', has(html, 'href="/favicon.svg" type="image/svg+xml"'))
ok('apple-touch-icon link', has(html, 'rel="apple-touch-icon" href="/apple-touch-icon.png"'))
ok('manifest link', has(html, 'rel="manifest" href="/site.webmanifest"'))
ok('font preloads', (html.match(/rel="preload" as="font"/g) || []).length >= 2)

// noscript content
ok('noscript fallback present', /<noscript>[\s\S]*<h1>[\s\S]*<\/noscript>/.test(html))

// Exactly one <h1> in the static HTML (the noscript one; React renders its own at runtime)
ok('single <h1> in static HTML', (html.match(/<h1[\s>]/g) || []).length === 1,
  `found ${(html.match(/<h1[\s>]/g) || []).length}`)

// ---- JSON-LD -----------------------------------------------------------
const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
ok('JSON-LD block present', !!ld)
let graph = null
if (ld) {
  try { graph = JSON.parse(ld[1].trim()); ok('JSON-LD parses', true) }
  catch (e) { ok('JSON-LD parses', false, e.message) }
}
if (graph) {
  const types = (graph['@graph'] || []).map((n) => n['@type'])
  ok('JSON-LD has WebSite', types.includes('WebSite'))
  ok('JSON-LD has Person', types.includes('Person'))
  ok('JSON-LD has WebApplication', types.includes('WebApplication'))
  const ids = (graph['@graph'] || []).map((n) => n['@id'])
  ok('JSON-LD entities have stable @id', ids.every(Boolean) && ids.length >= 3)
  ok('JSON-LD uses absolute URLs', JSON.stringify(graph).includes(ORIGIN))
}

// ---- manifest ----------------------------------------------------------
let manifest = null
try { manifest = JSON.parse(read('site.webmanifest')); ok('site.webmanifest valid JSON', true) }
catch (e) { ok('site.webmanifest valid JSON', false, e.message) }
if (manifest) {
  for (const f of ['name', 'short_name', 'description', 'id', 'start_url', 'scope', 'display',
    'background_color', 'theme_color', 'lang', 'dir', 'categories', 'icons']) {
    ok(`manifest.${f}`, manifest[f] !== undefined)
  }
  ok('manifest has maskable icon', (manifest.icons || []).some((i) => (i.purpose || '').includes('maskable')))
}

// ---- robots.txt --------------------------------------------------------
const robots = read('robots.txt')
ok('robots allows crawl', /User-agent:\s*\*/.test(robots) && /Allow:\s*\//.test(robots))
ok('robots Sitemap absolute', has(robots, `Sitemap: ${ORIGIN}/sitemap.xml`))
for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'CCBot', 'meta-externalagent']) {
  ok(`robots names ${bot}`, has(robots, `User-agent: ${bot}`))
}

// ---- sitemap.xml (structural; well-formedness checked separately) ------
const sitemap = read('sitemap.xml')
ok('sitemap declares xml', sitemap.trimStart().startsWith('<?xml'))
ok('sitemap has canonical loc', has(sitemap, `<loc>${ORIGIN}/</loc>`))
ok('sitemap has lastmod', /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(sitemap))

// ---- referenced assets exist in dist -----------------------------------
const assets = [
  'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'og-image.png',
  'icon-192.png', 'icon-512.png', 'icon-maskable-512.png',
  'site.webmanifest', 'robots.txt', 'sitemap.xml', 'llms.txt', 'llms-full.txt',
  'humans.txt', '404.html',
  'fonts/ibm-plex-sans-latin-400-normal.woff2', 'fonts/ibm-plex-sans-latin-600-normal.woff2',
]
for (const a of assets) ok(`asset exists: ${a}`, existsSync(path.join(DIST, a)))

// ---- llms.txt format ---------------------------------------------------
const llms = read('llms.txt')
ok('llms.txt H1', /^#\s+\S/m.test(llms))
ok('llms.txt blockquote summary', /^>\s+\S/m.test(llms))
ok('llms.txt H2 sections', (llms.match(/^##\s+/gm) || []).length >= 2)
ok('llms.txt markdown links', /\[[^\]]+\]\(https?:\/\/[^)]+\)/.test(llms))

console.log(`\n${fails === 0 ? 'ALL CHECKS PASSED' : fails + ' CHECK(S) FAILED'}`)
process.exit(fails === 0 ? 0 : 1)
