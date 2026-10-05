// Production server: serves the built app from dist/ and the chat API.
// Usage: npm run build && ANTHROPIC_API_KEY=... npm start
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { handleChat } from './chat.mjs'

const root = join(import.meta.dirname, '..', 'dist')
const port = Number(process.env.PORT ?? 8787)
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.zip': 'application/zip',
  '.ttf': 'font/ttf',
  '.svg': 'image/svg+xml',
}

createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost')
  if (url.pathname === '/api/chat') return handleChat(req, res)
  let path = normalize(join(root, decodeURIComponent(url.pathname)))
  if (!path.startsWith(root)) return res.writeHead(403).end()
  try {
    if ((await stat(path)).isDirectory()) path = join(path, 'index.html')
  } catch {
    path = join(root, 'index.html')
  }
  try {
    const data = await readFile(path)
    res.writeHead(200, { 'content-type': types[extname(path)] ?? 'application/octet-stream' }).end(data)
  } catch {
    res.writeHead(404).end('Not found')
  }
}).listen(port, () => console.log(`Code Language Teacher on http://localhost:${port}`))
