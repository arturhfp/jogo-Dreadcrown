/* =====================================================================
   Texturas procedurais
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Gera por canvas as texturas de brilho, sombra de contato, runas, meia-lua, rastro e raio usadas por partículas e efeitos. Tudo é desenhado em código (sem imagens externas) e guardado em cache.
   RELAÇÃO COM OUTROS MÓDULOS: Usa util.js. É usado por atores (sombra), efeitos e equipamento.
   API PÚBLICA: glowTexture, shadowTexture, runeTexture, crescentTexture, streakTexture, boltTexture.
   
   ===================================================================== */
import { T, TAU } from '../core/util.js';

/* ---------- texturas auxiliares ---------- */
const _texCache = {};
function glowTexture() {
  if (_texCache.glow) return _texCache.glow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.18, 'rgba(255,255,255,.75)'); gr.addColorStop(.5, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return (_texCache.glow = t);
}
function shadowTexture() {
  if (_texCache.shadow) return _texCache.shadow;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(.6, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return (_texCache.shadow = new T.CanvasTexture(c));
}
function runeTexture() {
  if (_texCache.rune) return _texCache.rune;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.translate(S / 2, S / 2); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
  const ring = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); };
  ring(246, 5); ring(226, 2); ring(168, 3); ring(120, 2);
  g.lineWidth = 3;
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * 168, Math.sin(a) * 168); g.lineTo(Math.cos(a) * 226, Math.sin(a) * 226); g.stroke(); }
  for (let k = 0; k < 2; k++) { g.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + k * Math.PI / 6; const x = Math.cos(a) * 168, y = Math.sin(a) * 168; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke(); }
  for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; g.save(); g.rotate(a); g.fillRect(-3, -214, 6, 14 + (i % 2) * 8); g.restore(); }
  g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i < 5; i++) { const a = i * 2 / 5 * TAU - Math.PI / 2; const x = Math.cos(a) * 120, y = Math.sin(a) * 120; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return (_texCache.rune = t);
}

function crescentTexture() {
  if (_texCache.cres) return _texCache.cres;
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.45, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 64); g.quadraticCurveTo(110, -10, 256, 64); g.quadraticCurveTo(120, 26, 0, 64); g.fill();
  g.globalCompositeOperation = 'lighter'; g.fill();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return (_texCache.cres = t);
}
function streakTexture() {
  if (_texCache.streak) return _texCache.streak;
  const c = document.createElement('canvas'); c.width = 256; c.height = 32; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 256, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.7, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)');
  g.fillStyle = gr; g.beginPath(); g.moveTo(0, 16); g.lineTo(256, 2); g.lineTo(256, 30); g.closePath(); g.fill();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return (_texCache.streak = t);
}
function boltTexture() {
  if (_texCache.bolt) return _texCache.bolt;
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 256, 64);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return (_texCache.bolt = t);
}

export { _texCache, boltTexture, crescentTexture, glowTexture, runeTexture, shadowTexture, streakTexture };
