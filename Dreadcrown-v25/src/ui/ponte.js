/* =====================================================================
   Ponte entre o jogo (React) e o motor 3D
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Lê o DOM do jogo (raça/classe escolhidas, nome e vida do inimigo, barras de vida, botões de habilidade) e traduz em ações 3D: monta o palco na arena de batalha e na criação de personagem, detecta dano/morte, reage a cliques nas habilidades e posiciona caixas invisíveis para os números de dano.
   RELAÇÃO COM OUTROS MÓDULOS: Usa quase todos os módulos 3D e catalogo.js. É iniciada por main.js via iniciar3D().
   API PÚBLICA: iniciar3D(), mounted, window.__abyss3d (depuração/testes).
   REGRAS / CUIDADOS: É um acoplamento por seletores CSS (.battle-arena, .combat-panel…): se o jogo mudar essas classes, ajuste AQUI. Não altera nenhum estado do jogo.
   ===================================================================== */
import { ACTIONS } from '../3d/animacao.js';
import { GLBActor } from '../3d/atores.js';
import { enemyAttack, heroAttack, makeHero } from '../3d/combate3d.js';
import { palOf } from '../3d/efeitos.js';
import { loadOrc, parseGLB } from '../3d/glb.js';
import { World } from '../3d/palco.js';
import { Creature, Humanoid, enemyKindFor } from '../3d/personagens.js';
import { T, V3, norm, txt } from '../core/util.js';
import { BRANCHES, CLS, RACES, pickRe } from '../data/catalogo.js';

function heroKey(creator) {
  let race = null, cls = null, br = -1;
  if (!creator) {
    const s = document.querySelector('.selection-summary p');
    if (s) { const parts = txt(s).split('·').map(x => x.trim()); race = pickRe(RACES, parts[0] || ''); cls = pickRe(CLS, parts[1] || ''); if (cls && parts[2]) br = BRANCHES[cls].findIndex(n => norm(n) === norm(parts[2])); }
  } else {
    const cards = [...document.querySelectorAll('.choice-card.selected')];
    const r = cards.find(c => !c.classList.contains('class-card') && !c.classList.contains('branch')), c = cards.find(c => c.classList.contains('class-card'));
    race = pickRe(RACES, txt(r)); cls = pickRe(CLS, txt(c));
    if (cls) br = [...document.querySelectorAll('.choice-card.branch')].findIndex(x => x.classList.contains('selected'));
  }
  return race && cls ? { race, cls, br } : null;
}

/* ---------- palco ---------- */
function syncOverlayBoxes(world) {
  /* posiciona os elementos .m3d-hero/.m3d-enemy (invisíveis) sobre os atores 3D para números de dano e alvos */
  const stage = world.host, sr = stage.getBoundingClientRect(); if (!sr.width) return;
  const put = (el, a) => { if (!el || !a) return; const top = a.anchor('head'), feet = a.anchor('feet'); const p1 = top.clone().project(world.camera), p2 = feet.clone().project(world.camera);
    const x = (p1.x * .5 + .5) * sr.width, yt = (-p1.y * .5 + .5) * sr.height, yb = (-p2.y * .5 + .5) * sr.height, w = Math.max(40, (yb - yt) * .55);
    const s = el.style; s.setProperty('position', 'absolute', 'important'); s.setProperty('left', (x - w / 2) + 'px', 'important'); s.setProperty('width', w + 'px', 'important'); s.setProperty('top', yt + 'px', 'important'); s.setProperty('height', Math.max(20, yb - yt) + 'px', 'important'); s.setProperty('right', 'auto', 'important'); s.setProperty('bottom', 'auto', 'important'); s.setProperty('transform', 'none', 'important'); s.setProperty('margin', '0', 'important'); };
  put(stage.querySelector('.m3d-hero'), world.hero); put(stage.querySelector('.m3d-enemy'), world.enemy);
}
const mounted = { battle: null, creator: null };
const slotFrom = b => { const t = txt(b); if (/Ataque b[áa]sico/i.test(t)) return 'basic'; if (/Esquiva/i.test(t)) return 'dodge'; if (/Ultimate/i.test(t)) return 'ultimate'; const m = b.className.match(/rarity-(common|rare|epic|legendary)/); if (m) return m[1]; if (b.classList.contains('skill-use-link')) return 'epic'; return null; };

async function mountBattle(host) {
  const w = new World(host, 'battle'); mounted.battle = w; w.keyStr = ''; w.enemyName = null; w.st = { hp: null, en: null };
  document.documentElement.classList.add('gl3d');
  await refreshBattle(w, true);
  return w;
}
async function refreshBattle(w, force) {
  if (!w.alive || w.busyLoad) return; const key = heroKey(false); if (!key) return; const ks = key.race + '|' + key.cls + '|' + key.br;
  if (ks !== w.keyStr) { w.busyLoad = true; w.keyStr = ks; try { const a = await makeHero(w, key); if (!w.alive) { a.dispose(); return; } if (w.hero) w.remove(w.hero); w.hero = w.add(a); a.base.set(-w.sx, 0, 0); w.layout(); a.play('spawn'); } finally { w.busyLoad = false; } }
  const arena = document.querySelector('.battle-arena'); if (!arena) return;
  const name = txt(arena.querySelector('.boss-name')).trim(); const cur = parseFloat((txt(arena.querySelector('.arena-readout')).match(/\d+/) || [0])[0]);
  if (name && (name !== w.enemyName || (w.enemy && w.enemy.dead && cur > 0))) {
    w.enemyName = name; const info = enemyKindFor(name); if (w.enemy) w.remove(w.enemy);
    const e = new Creature(w, info.kind, info); w.enemy = w.add(e); e.base.set(w.sx, 0, 0); e.play('spawn'); w.layout(); w.st.en = cur; w.fx.glow(V3(w.sx, 1, 0), palOf(info.theme)[1], 4, .5);
  }
}
function battlePoll(w) {
  if (!w.alive) return;
  refreshBattle(w).catch(console.error);
  const arena = document.querySelector('.battle-arena'); if (!arena || !w.hero || !w.enemy) return;
  const rows = {}; document.querySelectorAll('.combat-panel .resource-meta').forEach(m => { const l = txt(m.querySelector('span')).toLowerCase(); const mm = txt(m.querySelector('b')).match(/(-?\d+)\s*\/\s*(\d+)/); if (mm) rows[l] = [+mm[1], +mm[2]]; });
  const hp = rows['vida'], cur = parseFloat((txt(arena.querySelector('.arena-readout')).match(/\d+/) || [0])[0]);
  const L = w.st;
  if (hp) {
    if (L.hp != null && hp[0] < L.hp - .4) { const d = w.hero.remaining() + (w.hero.busy() ? .4 : .55); w.at(d, () => enemyAttack(w)); }
    if (hp[0] <= 0 && !w.hero.dead) w.at(1.6, () => w.hero.play('die'));
    if (hp[0] > 0 && w.hero.dead) { w.hero.play('spawn'); }
    L.hp = hp[0];
  }
  if (L.en != null && cur < L.en - .4 && cur <= 0) { w.at(.9, () => { if (w.enemy && !w.enemy.dead) { w.enemy.play('die'); w.fx.spray(w.enemy.anchor('chest'), 40, 6, 1, .6, .05, ...palOf(w.enemy.theme).slice(0, 2)); w.slow(.3, .3); } }); }
  L.en = cur;
}

/* ---------- criador: prévia 3D girando ---------- */
async function mountCreator(host) {
  const w = new World(host, 'creator'); mounted.creator = w; w.keyStr = ''; w.demoI = 0; w.dragYaw = 0; w.nextDemo = 2.6;
  document.documentElement.classList.add('gl3d');
  let down = false, lx = 0;
  host.addEventListener('pointerdown', e => { down = true; lx = e.clientX; w.dragging = true; w.moved = 0; });
  window.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - lx; lx = e.clientX; w.dragYaw += dx * .012; w.moved += Math.abs(dx); });
  window.addEventListener('pointerup', () => { if (!down) return; down = false; w.dragging = false; if (w.moved < 6) creatorDemo(w, true); });
  const hint = document.createElement('div'); hint.className = 'gl3d-hint'; hint.textContent = 'Arraste para girar · toque para ver um ataque'; host.appendChild(hint);
  w.hintEl = hint;
  await refreshCreator(w);
  return w;
}
async function refreshCreator(w) {
  if (!w.alive || w.busyLoad) return; const key = heroKey(true); if (!key) return; const ks = key.race + '|' + key.cls + '|' + key.br;
  if (ks === w.keyStr) return; w.busyLoad = true; w.keyStr = ks;
  try { const a = await makeHero(w, key); if (!w.alive) { a.dispose(); return; } if (w.hero) w.remove(w.hero); w.hero = w.add(a); a.base.set(0, 0, 0); w.layout(); a.root.rotation.y = 0; a.play('spawn'); w.nextDemo = w.time + 1.6; w.demoI = 0; }
  finally { w.busyLoad = false; }
}
function creatorDemo(w, force) {
  const h = w.hero; if (!h || h.busy()) return;
  const slots = ['basic', 'rare', 'epic', 'legendary', 'ultimate']; const slot = slots[w.demoI++ % slots.length];
  w.heroYaw = -.1; w.fx; const tgt = V3(3.4, 1.1, 0);
  const keep = w.dragYaw; heroAttack(w, slot, tgt);
  setTimeout(() => { w.heroYaw = undefined; }, 2200);
}
function creatorPoll(w) {
  if (!w.alive) return; refreshCreator(w).catch(console.error);
  if (w.hero && !w.dragging && w.time > w.nextDemo && !w.hero.busy()) { creatorDemo(w); w.nextDemo = w.time + 4.2; }
}

/* ---------- ciclo de vida ---------- */
function ensure() {
  const bh = document.querySelector('.battle-arena .mobile-3d-stage'), ch = document.querySelector('.creator-arena .mobile-3d-stage');
  if (mounted.battle && (!mounted.battle.alive || mounted.battle.host !== bh)) { mounted.battle.destroy(); mounted.battle = null; }
  if (mounted.creator && (!mounted.creator.alive || mounted.creator.host !== ch)) { mounted.creator.destroy(); mounted.creator = null; }
  if (bh && !mounted.battle) mountBattle(bh).catch(e => { console.error('[3D]', e); document.documentElement.classList.remove('gl3d'); });
  if (ch && !mounted.creator) mountCreator(ch).catch(e => { console.error('[3D]', e); document.documentElement.classList.remove('gl3d'); });
  if (!mounted.battle && !mounted.creator) document.documentElement.classList.remove('gl3d');
}

/** Liga o motor 3D ao DOM do jogo (cliques, observador de mutações e polling). Chamada uma única vez por main.js. */
export function iniciar3D() {
document.addEventListener('click', ev => {
  const b = ev.target.closest('.combat-panel .action-button, .skill-use-link'); if (!b || b.disabled) return;
  const w = mounted.battle; if (!w || !w.alive || !w.hero) return;
  const slot = slotFrom(b); if (!slot) return;
  if (slot === 'dodge') { w.hero.play('dodge'); return; }
  heroAttack(w, slot);
}, true);
let _q = null;
 const sched = () => { if (_q) return; _q = setTimeout(() => { _q = null; try { ensure(); } catch (e) { console.error(e); } }, 80); };
const boot = () => { new MutationObserver(sched).observe(document.body, { childList: true, subtree: true }); sched(); setInterval(() => { try { if (mounted.battle) battlePoll(mounted.battle); if (mounted.creator) creatorPoll(mounted.creator); if (mounted.battle && mounted.battle.hero) syncOverlayBoxes(mounted.battle); } catch (e) { console.error(e); } }, 120); };
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true }); else boot();
window.__abyss3d = { mounted, heroAttack, enemyAttack, ACTIONS, parseGLB, loadOrc, GLBActor, Humanoid, Creature, T, V3 };
}
