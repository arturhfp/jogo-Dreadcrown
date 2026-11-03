/* Teste de navegador da v31 (Chromium + SwiftShader, HTML único): decisão após a vitória, bloqueio do "continuar", reputação/mapa/save, Diário e preço por reputação.
   Uso: npm run build && node tests/missoes-v31.mjs */
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhas = 0; const t = (n, c, x = '') => { if (c) { ok++; console.log('  ok  ' + n); } else { falhas++; console.error('FALHOU ' + n + ' ' + x); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.setDefaultTimeout(150000);
const erros = []; p.on('pageerror', e => erros.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
const D = (fn, a) => p.evaluate(fn, a), espera = (fn, a, ms = 150000) => p.waitForFunction(fn, a, { polling: 250, timeout: ms });
const noMundo = () => espera(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.cena() && window.__dreadcrown.cena().pronto);
const diario = async () => { await D(() => window.__dreadcrown.acoes.mundoModal('ficha')); await p.waitForTimeout(400); await p.locator('.phase-tab', { hasText: 'Diário' }).click(); await p.waitForTimeout(300); const x = await D(() => ({ abertas: [...document.querySelectorAll('.journal-panel .mission-card:not(.done)')].map(e => e.dataset.mission), feitas: [...document.querySelectorAll('.journal-panel .mission-card.done')].map(e => e.dataset.mission) })); await D(() => window.__dreadcrown.acoes.mundoModal(null)); return x; };
const lutar = async (id, nome) => {
  await D(([i, n]) => window.__dreadcrown.acoes.iniciarBatalhaDoMundo({ id: i, nome: n, iniciativa: 'emboscada' }), [id, nome]);
  await espera(() => window.__dreadcrown.estado.tela === 'batalha' && window.__dreadcrown.estado.combate);
  await D(() => { const e = window.__dreadcrown.estado; e.combate.inimigo.hp = 1; });
  for (let i = 0; i < 12; i++) { if (await D(() => window.__dreadcrown.estado.combate.fim)) break; await D(() => { const h = window.__dreadcrown.estado.combate.heroi; h.hp = h.maxHp; h.stam = h.maxStam; window.__dreadcrown.acoes.agir('basic'); }); }
  await espera(() => window.__dreadcrown.estado.modal === 'vitoria', null, 30000);
};
await p.goto('file://' + path.join(raiz, 'dist/Dreadcrown.html')); await p.waitForTimeout(1500);
await p.locator('[data-testid=input-hero-name]').fill('Caçador'); await p.locator('[data-testid=button-class-tanke]').click(); await p.locator('[data-testid=button-enter-abyss]').click(); await noMundo();

let d = await diario();
t('Diário: no início só a missão 1 da Rede e os contratos de facção estão em aberto', d.abertas.includes('rede-1') && !d.abertas.includes('rede-2') && d.abertas.includes('fac-andarilhos-1') && !d.abertas.includes('cla-rastro-1') && d.feitas.length === 0, JSON.stringify(d));

// ---- alvo com decisão (Rede 1) ----
await lutar('vale:3', 'Goblin Saqueador');
t('vitória sobre o alvo abre a decisão com as opções Matar e Poupar (sem Recrutar)', await p.locator('[data-testid=mission-decision]').count() === 1 && await p.locator('[data-testid=button-decide-matar]').count() === 1 && await p.locator('[data-testid=button-decide-poupar]').count() === 1 && await p.locator('[data-testid=button-decide-recrutar]').count() === 0);
t('"Continuar explorando" fica bloqueado até decidir', await p.locator('[data-testid=button-continue-victory]').isDisabled());
const m0 = await D(() => window.__dreadcrown.estado.heroi.coins);
await p.locator('[data-testid=button-decide-poupar]').click(); await p.waitForTimeout(400);
const e1 = await D(() => { const s = window.__dreadcrown.estado; return { m: s.campanha.missoes, mis: s.campanha.eixos.misericordia, cul: s.campanha.reputacao.culto, coins: s.heroi.coins, pontos: s.mundo.descobertas.pontos.includes('camp:mortas'), decisao: s.decisaoMissao }; });
t('poupar: missão concluída, misericórdia +1, reputação com o Culto −4, +8 moedas, mapa revela as Terras Mortas', e1.m['rede-1']?.decisao === 'poupar' && e1.mis === 1 && e1.cul === -4 && e1.coins === m0 + 8 && e1.pontos && e1.decisao === null, JSON.stringify(e1));
t('a decisão some e o botão libera', await p.locator('[data-testid=mission-decision]').count() === 0 && await p.locator('[data-testid=button-continue-victory]').isEnabled());
t('o save já guarda a missão cumprida', await D(() => Object.keys(localStorage).some(k => (localStorage.getItem(k) || '').includes('"rede-1":{"estado":"concluida"'))));
await p.locator('[data-testid=button-continue-victory]').click({ timeout: 300000 }); await noMundo();
d = await diario();
t('Diário: Rede 1 cumprida e Rede 2 liberada', d.feitas.includes('rede-1') && d.abertas.includes('rede-2'), JSON.stringify(d));

// ---- inimigo comum: sem decisão ----
await lutar('vale:1', 'Slime Azul');
t('inimigo comum: sem decisão, continuar liberado, campanha intacta', await p.locator('[data-testid=mission-decision]').count() === 0 && await p.locator('[data-testid=button-continue-victory]').isEnabled() && await D(() => Object.keys(window.__dreadcrown.estado.campanha.missoes).length === 1));
await p.locator('[data-testid=button-continue-victory]').click({ timeout: 300000 }); await noMundo();

// ---- contrato sem opções: conclui sozinho ----
await lutar('vale:5', 'Lobo Cinzento');
t('contrato de facção (Andarilhos) conclui sozinho: reputação +12, sem modal de decisão', await p.locator('[data-testid=mission-decision]').count() === 0 && await D(() => window.__dreadcrown.estado.campanha.reputacao.andarilhos === 12 && window.__dreadcrown.estado.campanha.missoes['fac-andarilhos-1']?.decisao === 'matar'));
await p.locator('[data-testid=button-continue-victory]').click({ timeout: 300000 }); await noMundo();

// ---- preço por reputação ----
await D(() => { const d = window.__dreadcrown, c = d.geo.pontoPorId('camp:vale'), m = d.estado.mundo; for (const e of m.inimigos) if (e.estado !== 'morto' && e.espaco === 'exterior' && Math.hypot(e.x - c.x, e.z - c.z) < 160) d.regrasMundo.derrotarInimigo(m, e.id); m.heroi.x = c.x + Math.cos(c.rumo) * 2.4; m.heroi.z = c.z + Math.sin(c.rumo) * 2.4; d.estado.campanha.reputacao['cinco-cofres'] = 70; });
await espera(() => window.__dreadcrown.lojaDisponivel(), null, 30000);
await D(() => window.__dreadcrown.acoes.mundoInteragir()); await p.locator('[data-testid=button-camp-trade]').click(); await p.waitForTimeout(500);
const loja = await D(() => ({ itens: window.__dreadcrown.estado.loja.map(i => ({ p: i.price, b: i.precoBase ?? null, r: i.ajusteRep ?? 0 })), texto: document.querySelector('.shop-card').innerText }));
t('Cinco Cofres aliada: todos os itens −15% (preço final = base × 0,85) e a interface mostra a marca', loja.itens.length > 0 && loja.itens.every(i => i.r === -15 && i.p === Math.max(1, Math.round(i.b * 0.85))) && /reputação −15%/.test(loja.texto), JSON.stringify(loja).slice(0, 300));
t('sem erros de página', erros.length === 0, erros.join(' | '));
console.log(`\n${ok} ok, ${falhas} falhas`); await browser.close(); process.exit(falhas ? 1 : 0);
