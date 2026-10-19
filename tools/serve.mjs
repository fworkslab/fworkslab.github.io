// Локальный просмотр.
//
//   node tools/serve.mjs
//
// Раздаёт корень сайта на http://127.0.0.1:8099, на неизвестный путь
// отдаёт 404.html со статусом 404 — как это делает GitHub Pages.
// Мини-сервер для проверки анимаций. Живёт во временной папке.
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}

createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split('?')[0])
    if (p.endsWith('/')) p += 'index.html'
    let file = path.join(ROOT, p)

    // как GitHub Pages: путь без расширения считаем каталогом
    try {
      const st = await (await import('node:fs/promises')).stat(file)
      if (st.isDirectory()) file = path.join(file, 'index.html')
    } catch {}

    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store, no-cache, must-revalidate' })
    res.end(body)
  } catch {
    // Как GitHub Pages: на неизвестный путь отдаём 404.html со статусом 404.
    try {
      const body = await readFile(path.join(ROOT, '404.html'))
      res.writeHead(404, { 'Content-Type': TYPES['.html'], 'Cache-Control': 'no-store, no-cache, must-revalidate' })
      res.end(body)
    } catch {
      res.writeHead(404)
      res.end('404')
    }
  }
}).listen(8099, '127.0.0.1', () => console.log('слушаю http://127.0.0.1:8099'))