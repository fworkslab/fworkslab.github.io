// Проверка размноженных страниц: каждая ссылка должна вести в нужный
// вариант — нужный раздел, нужный язык, нужную тему.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, relative, resolve, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(process.argv[2] || fileURLToPath(new URL('..', import.meta.url)))
const ONLY_DARK = new Set([
  'products/codex',
  'other/build-with-me',
  'products/noise-dream',
])
const hasLight = (s) => !ONLY_DARK.has(s)

const fileName = (section, lang, theme) => {
  const base = lang === 'en' ? 'index.en' : 'index'
  return theme === 'dark' || !hasLight(section) ? base + '.html' : base + '.light.html'
}

const pages = []
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full)
    // 404-я страница не часть схемы: у неё нет ни переключателя языка,
    // ни переключателя темы, и она не имеет пары ru/en
    else if (name.endsWith('.html') && name !== '404.html') pages.push(full)
  }
}
walk(ROOT)

let problems = 0
const rows = []

for (const file of pages) {
  const rel = relative(ROOT, file).split('\\').join('/')
  const section = posix.dirname(rel) === '.' ? '' : posix.dirname(rel)
  const html = readFileSync(file, 'utf8')

  const lang = (html.match(/<html lang="(\w+)"/) || [])[1]
  // У разделов из ONLY_DARK атрибута data-theme нет: тема зашита в их
  // собственное оформление. Иначе страница выглядела бы светлой.
  const theme = !hasLight(section) ? 'dark' : (/data-theme="dark"/.test(html) ? 'dark' : 'light')
  const other = theme === 'dark' ? 'light' : 'dark'
  const otherLang = lang === 'ru' ? 'en' : 'ru'

  const resolveHref = (href) =>
    relative(ROOT, resolve(ROOT, dirname(rel), href)).split('\\').join('/')

  const check = (label, href, wantSection, wantLang, wantTheme) => {
    if (!href) { console.log(`  ПУСТАЯ ${label} в ${rel}`); problems++; return }
    const got = resolveHref(href)
    const gotName = posix.basename(got)
    const gotSection = posix.dirname(got) === '.' ? '' : posix.dirname(got)
    const ok =
      gotSection === wantSection && gotName === fileName(wantSection, wantLang, wantTheme)
    if (!ok) {
      console.log(`  НЕВЕРНО ${label}: ${rel}`)
      console.log(`     ведёт на ${got}`)
      console.log(`     ждали ${posix.join(wantSection, fileName(wantSection, wantLang, wantTheme))}`)
      problems++
    }
  }

  // переключатель темы
  const toggle = (html.match(/<a class="theme-toggle" href="([^"]+)"/) || [])[1]
  if (hasLight(section)) check('переключатель темы', toggle, section, lang, other)
  else if (toggle) { console.log(`  ЛИШНИЙ переключатель в ${rel}`); problems++ }
  // язык
  const langBlockMatch = html.match(/<div class="lang" data-lang="\w+">[\s\S]*?<\/div>/) || ['']
  const langStart = html.indexOf(langBlockMatch[0])
  const langEnd = langStart + langBlockMatch[0].length
  const langBlock = langBlockMatch[0]

  if (html.match(/<div class="lang" data-lang="(\w+)">/)?.[1] !== lang) {
    console.log(`  ЯЗЫК В БЛОКЕ НЕ ТОТ: ${rel}`)
    problems++
  }

  const langLinks = [...langBlock.matchAll(/<a href="([^"]+)"([^>]*)>/g)].map((m) => [m[1], m[2]])
  const current = langLinks.filter(([, rest]) => rest.includes('aria-current="true"'))
  if (current.length !== 1) { console.log(`  ОТМЕТКА ЯЗЫКА в ${rel}: ${current.length}`); problems++ }

  // порядок в блоке всегда «Рус, потом Eng» — от него зависит плашка
  const wantOrder = [lang === 'ru' ? 'ru' : 'en', lang === 'ru' ? 'en' : 'ru']
  langLinks.forEach(([href, rest], k) => {
    const isCurrent = rest.includes('aria-current="true"')
    const wantLang = isCurrent ? lang : (lang === 'ru' ? 'en' : 'ru')
    const got = resolveHref(href)
    const gotName = posix.basename(got)
    const ok = gotName === fileName(section, wantLang, theme)
    if (!ok) {
      console.log(`  ЯЗЫК ведёт не туда: ${rel} → ${got}, ждали ${fileName(section, wantLang, theme)}`)
      problems++
    }
  })

  // навигация: сохраняет и язык, и тему.
  // Если раздел-цель тёмный по определению (Codex, скилл, Noise Dream),
  // ссылка ведёт в его тёмную версию — светлой у него нет.
  for (const m of html.matchAll(/<a[^>]*href="([^"]+\.html)"[^>]*>/g)) {
    if (m.index >= langStart && m.index <= langEnd) continue
    if (m[0].includes('class="theme-toggle"')) continue
    const got = resolveHref(m[1])
    const gotSection = posix.dirname(got) === '.' ? '' : posix.dirname(got)
    const gotName = posix.basename(got)
    const wantTheme = hasLight(gotSection) ? theme : 'dark'
    const wantName = fileName(gotSection, lang, wantTheme)
    if (gotName !== wantName) {
      console.log(`  НАВИГАция ведёт не туда: ${rel} -> ${got}, ждали ...${fileName(gotSection, lang, wantTheme)}`)
      problems++
    }
  }

  rows.push({
    файл: rel.replace(/\/index(\.en)?(\.light)?\.html$/, (m, en, light) =>
      `  ru/${light ? 'светлая' : 'тёмная'}`).replace(/index\.html$/, '  ru/тёмная').replace(/index\.en\.html$/, '  en/тёмная'),
    раздел: section || '(корень)',
    язык: lang,
    тема: theme,
    переключатель: hasLight(section) ? 'есть' : '—',
  })
}

console.log('')
console.log('=== сводка ===')
const bySection = {}
for (const r of rows) {
  const key = r.раздел + ' | ' + r.язык + ' | ' + r.тема
  bySection[key] = (bySection[key] || 0) + 1
}
for (const [k, v] of Object.entries(bySection)) console.log('  ' + k)
console.log('')
console.log('страниц: ' + pages.length)
console.log('проблем: ' + problems)
