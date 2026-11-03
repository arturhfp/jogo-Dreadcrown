/* Testes de integração no navegador (Playwright + Chromium): carregam o jogo de verdade e verificam o motor 3D.
   Modos testados: (1) HTML único dist/Dreadcrown.html  (2) modo desenvolvimento via servidor local.
   Variáveis opcionais: CHROMIUM_PATH (executável do Chromium), PLAYWRIGHT_PATH (módulo playwright).
   Rodam com: npm run build && node tests/navegador.mjs */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { servir } from '../tools/servir.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CLASSES = ['Tank', 'Mago', 'Paladino', 'Clérigo', 'Assassino', 'Arqueiro'];
const CHAVE = { Tank: 'tanke', Mago: 'mago', Paladino: 'paladino', 'Clérigo': 'clerigo', Assassino: 'assassino', Arqueiro: 'arqueiro' }; /* nome na tela -> chave interna */
let falhas = 0, ok = 0;
const t = (nome, cond, extra = '') => { if (cond) { ok++; console.log('  ok  ' + nome); } else { falhas++; console.error('FALHOU ' + nome + ' ' + extra); } };

async function testarModo(nome, url, browser) {
  console.log('\n== ' + nome + ' ==');
  const p = await browser.newPage({ viewport: { width: 900, height: 820 } });
  const erros = []; p.on('pageerror', e => erros.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
  p.setDefaultTimeout(60000);
  await p.goto(url); await p.waitForTimeout(1500);
  t('jogo (React) renderizou a tela de criação', await p.locator('.choice-card').count() > 0);
  await p.locator('.choice-card:not(.class-card):not(.branch)').filter({ hasText: 'Orc' }).first().click();
  for (const cls of CLASSES) {
    await p.locator('.class-card').filter({ hasText: cls }).first().click();
    await p.waitForFunction(k => { const w = window.__abyss3d && window.__abyss3d.mounted.creator; return w && w.hero && w.hero.isGLB && w.hero.cfgKey && w.hero.cfgKey.cls === k && w.hero.gear; }, CHAVE[cls], { timeout: 90000 }).catch(() => { });
    const r = await p.evaluate(() => { const w = window.__abyss3d.mounted.creator, h = w && w.hero; return { canvas: !!document.querySelector('.gl3d-canvas'), glb: !!(h && h.isGLB), gear: h && h.gear ? h.gear.length : 0, post: !!(w && w.post) }; });
    /* O Tank usa só o modelo original (espada + braceletes do próprio GLB): 0 peças extras é o comportamento atual (ver README, limitações). */
    t(cls + ': herói 3D' + (cls === 'Tank' ? '' : ' com equipamento'), r.canvas && r.glb && (cls === 'Tank' || r.gear > 3), JSON.stringify(r));
    if (cls === 'Arqueiro') {
      const a = await p.evaluate(() => { const w = window.__abyss3d.mounted.creator, h = w.hero; w.paused = true; w.dragging = true; w.nextDemo = 1e9; h.cur = null; for (let i = 0; i < 20; i++) w.tick(1 / 60);
        h.play('snap', { reach: 0, onHit: () => { } }); let arrowSeen = false, maxPull = 0, vib = 0, minHand = 1e9, shotAt = -1;
        for (let i = 0; i < 60; i++) { w.tick(1 / 60); const r = h.rig; if (r.arrow.visible) arrowSeen = true; maxPull = Math.max(maxPull, r.px || 0); if (r.vt < 0.3) vib++; if (h.cur && shotAt < 0 && h.cur.t > .32) shotAt = i; }
        return { rig: !!h.rig, arrowSeen, maxPull, vib, tip: h.handWorld(new (window.__abyss3d.T.Vector3)()).toArray().every(Number.isFinite) }; });
      t('arqueiro: arco funcional (rig)', a.rig); t('arqueiro: flecha aparece durante a puxada', a.arrowSeen); t('arqueiro: corda é puxada (px>0.2)', a.maxPull > .2, 'pull=' + a.maxPull); t('arqueiro: corda vibra após soltar', a.vib > 3, 'vib=' + a.vib); t('arqueiro: origem do tiro é uma posição válida', a.tip);
    }
    const c = await p.evaluate(() => { const w = window.__abyss3d.mounted.creator, h = w.hero; w.paused = true; for (let i = 0; i < 90; i++) w.tick(1 / 60); let n = 0, minY = 1e9, finite = true;
      h.root.traverse(o => { if (o.userData && o.userData.ch) { n++; o.userData.ch.x.forEach(v => { minY = Math.min(minY, v.y); if (!Number.isFinite(v.x + v.y + v.z)) finite = false; }); } }); return { n, minY, finite }; });
    t(cls + ': tecido ' + (cls === 'Tank' ? '(sem tiras: nada a simular)' : 'simulado (física, sem NaN, acima do chão)'), c.finite && (cls === 'Tank' || (c.n > 0 && c.minY >= 0.02)), JSON.stringify(c));
  }
  /* ataque: executa as 6 habilidades de uma classe sem erros */
  const atq = await p.evaluate(async () => { const A = window.__abyss3d, w = A.mounted.creator; w.paused = true; const out = []; for (const s of ['basic', 'common', 'rare', 'epic', 'legendary', 'ultimate']) { try { w.hero.cur = null; A.heroAttack(w, s, A.V3(3.4, 1.1, 0)); for (let i = 0; i < 70; i++) w.tick(1 / 20); out.push([s, 'ok']); } catch (e) { out.push([s, String(e)]); } } return out; });
  t('6 habilidades executam sem exceção', atq.every(x => x[1] === 'ok'), JSON.stringify(atq));
  await p.waitForTimeout(300);
  t('nenhum erro de página/console', erros.length === 0, '\n   ' + erros.slice(0, 5).join('\n   '));
  await p.close();
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const modos = (process.env.MODOS || 'dist,dev').split(',');
if (modos.includes('dist')) await testarModo('HTML único (dist)', 'file://' + path.join(raiz, 'dist', 'Dreadcrown.html'), browser);
if (modos.includes('dev')) { const srv = await servir(8099); await testarModo('modo desenvolvimento (servidor local)', 'http://localhost:8099/index.html', browser); srv.close(); }
await browser.close();
console.log(`\n${ok} verificações ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
