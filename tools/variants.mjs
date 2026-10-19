// Размножение страниц сайта по вариантам язык × тема.
//
// Зачем: тема перестаёт быть состоянием в браузере и становится именем файла.
// Ни JavaScript, ни localStorage, ни «запомнил и применил» — переключатель
// это обычная ссылка. Страницы не могут разойтись, потому что различаться
// им нечем: все четыре собраны из одного исходника.
//
//   index.html           русский, тёмная
//   index.light.html     русский, светлая
//   index.en.html        английский, тёмная
//   index.en.light.html  английский, светлая
//
// У codex и skill светлого варианта нет: у Кодекса своё оформление, скилл
// по требованию всегда чёрный. Ссылки на них ведут в тёмный файл.
//
// Генератор заодно проставляет метаданные для поиска и превью, robots.txt
// и sitemap.xml. Всё это держится здесь, а не вручную в страницах, иначе
// при следующей сборке разъедется язык, тема и адрес.
//
//   node tools/variants.mjs        пересобрать всё
//   node tools/verify-variants.mjs  проверить, что ссылки ведут куда надо

import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname, relative, resolve, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

// Корень сайта: аргументом или автоматически — на каталог выше tools/
const ROOT = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)))

// Адрес сайта в интернете. Используется в canonical, og:url и sitemap.
const SITE = 'https://fworkslab.github.io'

/* Разделы без светлого варианта.
   Скилл — по требованию всегда чёрный.
   Noise Dream — у него будет своё оформление страницы, ещё не придуманное,
   поэтому переключатель темы там лишний, страница остаётся тёмной. */
const ONLY_DARK = new Set([
  'products/codex',
  'other/build-with-me',
  'products/noise-dream',
])

/* Разделы, которым атрибут data-theme не нужен.
   У Кодекса своё оформление (body.app): общие тёмные правила из
   html[data-theme="dark"] легли бы поверх него и покрасили заголовки
   листа в белый по кремовой бумаге — то есть сделали бы их невидимыми. */
const NO_THEME_ATTR = new Set(['products/codex'])

const SECTIONS = [
  '',
  'products',
  'products/noise-dream',
  'products/codex',
  'other',
  'other/build-with-me',
  'roadmap',
]

const hasLight = (section) => !ONLY_DARK.has(section)

const fileName = (section, lang, theme) => {
  const base = lang === 'en' ? 'index.en' : 'index'
  return theme === 'dark' || !hasLight(section) ? base + '.html' : base + '.light.html'
}

/** Путь внутри сайта с правильными ./ и ../ относительно файла-источника. */
const hrefTo = (fromRel, section, name) => {
  const fromDir = posix.dirname(fromRel)
  const toDir = section
  if (fromDir === toDir) return name
  return posix.relative(fromDir, posix.join(section, name)) || name
}

/** Адрес страницы в интернете. Корневая страница — без index.html. */
const absUrl = (rel) => SITE + '/' + (rel === 'index.html' ? '' : rel)

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8')
const write = (rel, html) => writeFileSync(join(ROOT, rel), html, 'utf8')

/* ------------------------------------------------------------------ */
/* Метаданные                                                          */
/* ------------------------------------------------------------------ */

/**
 * Блок метаданных для каждой страницы.
 * @param {string} html  готовый текст страницы, из него берутся title и description
 * @param {string} outRel  путь собираемого файла внутри сайта
 */
function headMeta(html, outRel, section, lang, theme) {
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || 'F Works'
  const desc = (html.match(/<meta name="description" content="([\s\S]*?)">/) || [])[1] || ''

  // Канонической считается тёмная версия: светлая — тот же материал,
  // другая подача. Поисковику незачем индексировать её отдельно.
  const canonical = absUrl(posix.join(section, fileName(section, lang, 'dark')))
  const selfUrl = absUrl(outRel)

  const fav32 = hrefTo(outRel, 'assets', 'favicon-32.png')
  const fav16 = hrefTo(outRel, 'assets', 'favicon-16.png')
  const apple = hrefTo(outRel, 'assets', 'apple-touch-icon.png')
  const ogImage = SITE + '/assets/og-image.png'

  const themeColor = theme === 'dark' ? '#000000' : '#ffffff'
  const locale = lang === 'ru' ? 'ru_RU' : 'en_US'
  const robots = theme === 'light' ? '\n<meta name="robots" content="noindex, follow">' : ''

  return `
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="F Works">
<meta property="og:locale" content="${locale}">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${desc}">
<meta property="og:url" content="${selfUrl}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${themeColor}">${robots}
<link rel="icon" href="${fav32}" sizes="32x32">
<link rel="icon" href="${fav16}" sizes="16x16">
<link rel="apple-touch-icon" href="${apple}">`
}

/* ------------------------------------------------------------------ */
/* Сборка страниц                                                      */
/* ------------------------------------------------------------------ */

function buildLangBlock(section, lang, theme, outRel) {
  const ruHref = hrefTo(outRel, section, fileName(section, 'ru', theme))
  const enHref = hrefTo(outRel, section, fileName(section, 'en', theme))
  // Порядок всегда «Рус, потом Eng» — иначе скользящая плашка не поймёт,
  // куда её сдвигать. Подпись на языке самой страницы.
  const ruLabel = lang === 'ru' ? 'Рус' : 'Rus'

  return (
    `<div class="lang" data-lang="${lang}">\r\n` +
    `      <a href="${ruHref}"${lang === 'ru' ? ' aria-current="true"' : ''}>${ruLabel}</a>\r\n` +
    `      <a href="${enHref}"${lang === 'en' ? ' aria-current="true"' : ''}>Eng</a>\r\n` +
    '    </div>'
  )
}

const built = []
const darkPages = []

for (const section of SECTIONS) {
  for (const lang of ['ru', 'en']) {
    // Исходник — тёмная версия текущего языка.
    const srcRel = posix.join(section, fileName(section, lang, 'dark'))
    const stripped = read(srcRel)
      .replace(/\s*<script>\s*\/\* Тема сайта[\s\S]*?<\/script>/g, '')
      .replace(/\s*<button class="theme-toggle"[\s\S]*?<\/button>/g, '')
      .replace(/\s*<a class="theme-toggle"[\s\S]*?<\/a>/g, '')
      // Прежний блок метаданных убираем: исходник — тоже тёмный файл,
      // то есть перезаписывается сборкой. Без этого при повторном прогоне
      // блок размножился бы.
      .replace(/\s*<link rel="canonical"[\s\S]*?apple-touch-icon[^>]*>/g, '')

    for (const theme of hasLight(section) ? ['dark', 'light'] : ['dark']) {
      const outRel = posix.join(section, fileName(section, lang, theme))

      let html = stripped
        .replace(/<html[^>]*>/, `<html lang="${lang}"${
          theme === 'dark' && !NO_THEME_ATTR.has(section) ? ' data-theme="dark"' : ''
        }>`)

      // Переключатель языка убираем на время: обычное правило переписывания
      // ссылок заставило бы его вести в тот же язык и ту же тему, то есть
      // в себя. Ставим его последним, уже с правильными адресами.
      // В регулярке допускается data-lang: иначе повторный прогон по уже
      // собранному файлу не нашёл бы блок и сломал бы переключение.
      const LANG_SLOT = '<!--язык-->'
      html = html.replace(/<div class="lang"[^>]*>[\s\S]*?<\/div>/, LANG_SLOT)

      html = rewriteLinks(html, outRel, lang, theme)

      html = html.replace(
        LANG_SLOT,
        buildLangBlock(section, lang, theme, outRel) + buildToggle(section, lang, theme, outRel),
      )

      // Год в подвале. В исходнике стоит <div data-year>2026</div>, а при
      // сборке подставляется текущий год: надпись не устареет сама, и
      // JavaScript на сайте не нужен.
      html = html.replace(
        /(<div data-year>)[^<]*(<\/div>)/,
        (whole, open, close) => open + new Date().getFullYear() + close,
      )

      // Метаданные — в начало <head>, после уже существующих.
      html = html.replace('</head>', headMeta(html, outRel, section, lang, theme) + '\n</head>')

      write(outRel, html)
      built.push(outRel)
      if (theme === 'dark') darkPages.push(outRel)
    }
  }
}

/* ------------------------------------------------------------------ */
/* robots.txt и sitemap.xml                                            */
/* ------------------------------------------------------------------ */

const today = new Date().toISOString().slice(0, 10)

write('robots.txt', `User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`)

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${darkPages
  .sort()
  .map((rel) => `  <url>
    <loc>${absUrl(rel)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${rel === 'index.html' ? '1.0' : '0.7'}</priority>
  </url>`)
  .join('\n')}
</urlset>
`
write('sitemap.xml', sitemap)

console.log('файлов собрано: ' + built.length)
console.log('sitemap: ' + darkPages.length + ' страниц')
for (const f of built) console.log('  ' + f)

/* ------------------------------------------------------------------ */
/* Переписывание ссылок                                                */
/* ------------------------------------------------------------------ */

/** Переписывает внутренние ссылки: тот же язык, та же тема. */
function rewriteLinks(html, outRel, lang, theme) {
  return html.replace(/\b(href|src)="([^"]+)"/g, (whole, attr, value) => {
    if (/^(https?:|mailto:|tel:|data:|javascript:|#)/.test(value)) return whole

    const target = relative(ROOT, resolve(ROOT, dirname(outRel), value))
      .split('\\').join('/')

    // Картинки и внешние файлы не трогаем.
    if (!/\.html?$/.test(target)) return whole

    const section = posix.dirname(target) === '.' ? '' : posix.dirname(target)
    const name = fileName(section, lang, theme)
    return `${attr}="${hrefTo(outRel, section, name)}"`
  })
}

/** Переключатель темы — ссылка на соседний вариант. */
function buildToggle(section, lang, theme, outRel) {
  if (!hasLight(section)) return ''
  const other = theme === 'dark' ? 'light' : 'dark'
  const href = hrefTo(outRel, section, fileName(section, lang, other))
  const label = other === 'light' ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    `\r\n      <a class="theme-toggle" href="${href}" aria-label="${label}">\r\n` +
    '        <svg class="theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor"\r\n' +
    '             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">\r\n' +
    '          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"></path>\r\n' +
    '        </svg>\r\n' +
    '        <svg class="theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor"\r\n' +
    '             stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">\r\n' +
    '          <circle cx="12" cy="12" r="4"></circle>\r\n' +
    '          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>\r\n' +
    '        </svg>\r\n' +
    '      </a>'
  )
}
