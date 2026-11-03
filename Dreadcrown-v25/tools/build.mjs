/* =====================================================================
   Build do HTML único (dist/Dreadcrown.html)
   ---------------------------------------------------------------------
   Lê o index.html (modo desenvolvimento) e produz UM arquivo que abre direto no navegador (PC e celular):
   - <link rel="stylesheet"> vira <style> com o conteúdo;
   - <script src> clássico vira <script> inline;
   - src/main.js (motor 3D, ES modules) é empacotado com o esbuild e embutido;
   - <!--ORC-GLB--> vira o modelo do Orc em base64 (<script type="text/plain" id="orc-glb">);
   - caminhos de assets/retratos/*.jpg dentro de retratos-dados.js viram data URIs.
   Uso: npm run build   (requer: npm install, que instala o esbuild)
   ===================================================================== */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const esbuild = require(process.env.ESBUILD_PATH || 'esbuild');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ler = (rel, enc = 'utf8') => fs.readFileSync(path.join(raiz, rel), enc);
/** Evita fechar o <script> por acidente caso o conteúdo contenha "</script". */
const seguro = (t, tag) => t.replace(new RegExp('</' + tag, 'gi'), '<\\/' + tag);

const entrada = process.env.ENTRADA || 'index.html';
let html = ler(entrada);

/* 1) estilos */
html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => `<style data-origem="${href}">\n${ler(href).trim()}\n</style>`);

/* 2) scripts: motor 3D (empacotado), bundle do jogo (módulo) e scripts clássicos de interface */
const motor = esbuild.buildSync({ entryPoints: [path.join(raiz, entrada === 'index-legado.html' ? 'src/main.js' : 'src/main-jogo.js')], bundle: true, format: 'iife', write: false, legalComments: 'none', target: 'es2020' }).outputFiles[0].text;
html = html.replace(/<script( type="module")? src="([^"]+)"><\/script>/g, (_, mod, src) => {
  if (src === 'src/main.js' || src === 'src/main-jogo.js') return `<script type="module" id="engine-3d" data-origem="${src}">\n${seguro(motor, 'script')}\n</script>`;
  let codigo = ler(src);
  if (src === 'src/ui/retratos-dados.js') codigo = codigo.replace(/"(assets\/retratos\/[^"]+\.jpg)"/g, (__, f) => `"data:image/jpeg;base64,${ler(f, null).toString('base64')}"`);
  return `<script${mod || ''} data-origem="${src}">\n${seguro(codigo.trim(), 'script')}\n</script>`;
});

/* 3) modelo 3D embutido */
html = html.replace('<!--ORC-GLB-->', `<script type="text/plain" id="orc-glb">${ler('assets/modelos/orc.glb', null).toString('base64')}</script>`);

fs.mkdirSync(path.join(raiz, 'dist'), { recursive: true });
const saida = path.join(raiz, 'dist', entrada === 'index-legado.html' ? 'Dreadcrown-legado.html' : 'Dreadcrown.html');
fs.writeFileSync(saida, html);
console.log('OK', path.relative(process.cwd(), saida), (fs.statSync(saida).size / 1048576).toFixed(2) + ' MB');
