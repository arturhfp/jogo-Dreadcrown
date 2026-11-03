/* Servidor estático mínimo para o modo desenvolvimento (ES modules não funcionam via file://).
   Uso: npm run dev  ->  http://localhost:8080 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg', '.png': 'image/png', '.glb': 'model/gltf-binary', '.json': 'application/json', '.svg': 'image/svg+xml' };
const porta = +process.env.PORT || 8080;
export function servir(p = porta) {
  const srv = http.createServer((req, res) => {
    let rel = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (rel.endsWith('/')) rel += 'index.html';
    const arq = path.normalize(path.join(raiz, rel));
    if (!arq.startsWith(raiz) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); res.end('não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': tipos[path.extname(arq)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(arq).pipe(res);
  });
  return new Promise(r => srv.listen(p, () => r(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) servir().then(() => console.log('Servidor em http://localhost:' + porta));
