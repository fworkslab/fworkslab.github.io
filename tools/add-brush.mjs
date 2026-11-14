// Дописывает блок стилей мазка кисти в style.css.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'K:/Сайты/F Works/fworks.github.io'

const MARKER = '/* ============================================================\n   Мазок кистью'

const CSS = `
/* ============================================================
   Мазок кистью
   ------------------------------------------------------------
   Фильтр feDisplacementMap с шумом сдвигает края заливки, и
   прямоугольник превращается в мазок с неровным краем — как
   красная «F» в логотипе.

   Слои кнопки: мазок лежит под текстом, но над её фоном.
   Для этого ::before получает z-index: -1, а сам элемент —
   isolation: isolate (свой контекст наложения). Без этого
   мазок перекрыл бы надпись.

   Второй проход сдвига добавляет мелкую рваность поверх крупных
   лопастей первого.

   Фильтры объявлены в разметке страниц (svg#brush, svg#brush-line):
   внешний SVG-файл не годится — Chrome применил бы к нему его
   собственное содержимое, а не элемент-ссылку.

   Разделы без мазка (Кодекс, Noise Dream, build-with-me) не имеют
   класса .brushed-page, поэтому их вид не меняется.
   ============================================================ */

.brushed-page {
  --brush-grow: 340ms cubic-bezier(.22, 1, .36, 1);
}

/* ---------- кнопка: мазок вместо ровной заливки ---------- */

.brushed-page .btn {
  position: relative;
  isolation: isolate;
  background: transparent;
  border-color: transparent;
  color: #fff;
  transition:
    transform var(--t-fast),
    color var(--t-fast),
    box-shadow var(--t-fast);
}

/* Мазок под надписью, но над фоном кнопки. */
.brushed-page .btn::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--red);
  pointer-events: none;
  filter: url(#brush);
}

/* Вторая кнопка на странице — рамка без заливки: мазок появляется
   при наведении. Рамка рисуется отдельным слоем поверх мазока,
   иначе мазок с рваным краем её бы съел. */
.brushed-page .btn--ghost::before {
  background: transparent;
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--brush-grow);
}

.brushed-page .btn--ghost::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  border: 2px solid var(--red);
  pointer-events: none;
}

.brushed-page .btn--ghost:hover::before,
.brushed-page .btn--ghost:focus-visible::before {
  background: var(--red);
  transform: scaleX(1);
}

.brushed-page .btn--ghost:hover::after,
.brushed-page .btn--ghost:focus-visible::after {
  border-color: transparent;
}

.brushed-page .btn--ghost {
  color: var(--red);
}

.brushed-page .btn--ghost:hover,
.brushed-page .btn--ghost:focus-visible {
  color: #fff;
}

.brushed-page .btn:hover,
.brushed-page .btn:focus-visible {
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 10px 22px -12px rgba(170, 0, 0, .55);
}

html[data-theme="dark"] .brushed-page .btn::before {
  background: var(--red-light);
}

/* ---------- мазок в навигации ---------- */

.brushed-page .nav a {
  isolation: isolate;
}

/* При наведении — подсветка неровным мазком. */
.brushed-page .nav a::before {
  content: "";
  position: absolute;
  left: 6px;
  right: 6px;
  top: 4px;
  bottom: 4px;
  z-index: -1;
  background: rgba(170, 0, 0, .12);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--brush-grow);
  pointer-events: none;
  filter: url(#brush);
}

.brushed-page .nav a:hover::before {
  transform: scaleX(1);
}

/* Активный пункт — плотный мазок сразу, как замазанный красным. */
.brushed-page .nav a[aria-current="page"]::before {
  background: var(--red);
  transform: scaleX(1);
}

.brushed-page .nav a[aria-current="page"] {
  color: #fff;
}

/* Линия-подчёркивание убирается: мазок её заменяет. */
.brushed-page .nav a::after {
  display: none;
}

html[data-theme="dark"] .brushed-page .nav a::before {
  background: rgba(209, 5, 5, .22);
}

html[data-theme="dark"] .brushed-page .nav a[aria-current="page"]::before {
  background: var(--red);
}

/* ---------- переключатель языка ---------- */

.brushed-page .lang a {
  position: relative;
  isolation: isolate;
}

.brushed-page .lang a::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--red);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform var(--brush-grow);
  pointer-events: none;
  filter: url(#brush);
}

.brushed-page .lang a:hover::before {
  transform: scaleX(1);
}

/* Выбранный язык — плотный мазок сразу. */
.brushed-page .lang a[aria-current="true"]::before {
  transform: scaleX(1);
}

.brushed-page .lang a[aria-current="true"] {
  background: transparent;
  color: #fff;
}

html[data-theme="dark"] .brushed-page .lang a[aria-current="true"] {
  background: transparent;
  color: #fff;
}

/* ---------- линия под заголовком раздела ---------- */

.brushed-page .sec-head::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 96px;
  height: 3px;
  background: var(--red);
  filter: url(#brush-line);
}

/* ---------- верхняя кромка карточек ---------- */

/* При наведении по верхнему краю карточки проступает мазок. */
.brushed-page .card {
  position: relative;
  isolation: isolate;
}

.brushed-page .card::before {
  content: "";
  position: absolute;
  left: -1px;
  right: -1px;
  top: -1px;
  height: 3px;
  z-index: 2;
  background: var(--red);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform 420ms cubic-bezier(.22, 1, .36, 1);
  pointer-events: none;
  filter: url(#brush-line);
}

.brushed-page .card:hover::before {
  transform: scaleX(1);
}
`

const cssFile = join(ROOT, 'style.css')
let css = readFileSync(cssFile, 'utf8')

if (css.includes(MARKER)) {
  const i = css.indexOf(MARKER)
  css = css.slice(0, i).trimEnd() + '\n'
  console.log('style.css: старый блок заменён')
} else {
  css = css.trimEnd() + '\n'
  console.log('style.css: блок добавлен')
}
css += CSS
writeFileSync(cssFile, css, 'utf8')
console.log('style.css: ' + css.length + ' символов')
