// 小零 — 简易静态服务器
const http = require('http')
const fs = require('fs')
const path = require('path')
const PORT = 20173
const ROOT = path.join(__dirname, 'out', 'renderer')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
  '.wasm': 'application/wasm',
}

http.createServer((req, res) => {
  let filePath = path.join(ROOT, req.url.split('?')[0])
  if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html')
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not Found'); return }

  const ext = path.extname(filePath)
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(filePath).pipe(res)
}).listen(PORT, () => {
  console.log(`小零运行中: http://localhost:${PORT}`)
})
