/* Teste de navegador da v29 (Chromium + SwiftShader, HTML único): origem sorteada na criação, aba Destino (origem, Selo, facções), save v4, continuar e migração de save v3.
   Uso: npm run build && node tests/lore-v29.mjs */
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhas = 0; const t = (n, c, x = '') => { if (c) { ok++; console.log('  ok  ' + n); } else { falhas++; console.error('FALHOU ' + n + ' ' + x); } };
const ESPERADO = { 'aldeia-queimada': { maxHp: 6, arm: 1 }, 'orfao-do-culto': { mag: 1, maxMana: 4 }, 'ex-legionario': { pow: 1, arm: 1 }, 'aprendiz-das-forjas': { arm: 2 }, 'pupilo-do-arquivo': { mag: 1, dex: 1 }, 'sangue-de-cla': { pow: 1, maxStam: 4 }, 'marcado-pela-brasa': { mag: 1, dex: 1 }, 'filho-de-caravana': { maxStam: 4, dex: 1 }, 'tocado-pela-morte': { maxHp: 4, maxMana: 4 }, 'herdeiro-sem-nome': { maxMana: 2, mag: 1 } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const p = await ctx.newPage(); p.setDefaultTimeout(150000);
const erros = []; p.on('pageerror', e => erros.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
const D = (fn, a) => p.evaluate(fn, a), espera = (fn, a, ms = 150000) => p.waitForFunction(fn, a, { polling: 250, timeout: ms });
const noMundo = () => espera(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.cena() && window.__dreadcrown.cena().pronto);
await p.goto('file://' + path.join(raiz, 'dist/Dreadcrown.html')); await p.waitForTimeout(1500);

// ---------- criação ----------
const card = await D(() => ({ nome: document.querySelector('[data-testid=origin-name]')?.innerText, bonus: document.querySelector('[data-testid=origin-bonus]')?.innerText, sorteada: window.__dreadcrown.estado.origemSorteada?.nome, id: window.__dreadcrown.estado.origemSorteada?.id }));
t('a criação mostra a origem sorteada com o bônus', !!card.nome && card.nome === card.sorteada && /\+\d/.test(card.bonus || ''), JSON.stringify(card));
await p.locator('[data-testid=input-hero-name]').fill('Herdeiro'); await p.locator('[data-testid=button-race-orc]').click(); await p.locator('[data-testid=button-class-tanke]').click();
t('mudar raça/classe não re-sorteia nem apaga o cartão de origem', await D(c => document.querySelector('[data-testid=origin-name]')?.innerText === c.nome && window.__dreadcrown.estado.origemSorteada.id === c.id, card));
await p.setViewportSize({ width: 390, height: 780 }); await p.waitForTimeout(500);
t('no celular o cartão de origem cabe na largura da tela', await D(() => { const r = document.querySelector('[data-testid=origin-card]').getBoundingClientRect(); return r.width > 100 && r.left >= 0 && r.right <= window.innerWidth + 1; }));
await p.setViewportSize({ width: 1280, height: 900 }); await p.waitForTimeout(300);
await p.locator('[data-testid=button-enter-abyss]').click(); await noMundo();

// ---------- herói com origem ----------
const her = await D(() => { const d = window.__dreadcrown, e = d.estado, sel = { ...e.selecao }, c = d.regrasHeroi.criarHeroi(sel, false); const comO = d.regrasHeroi.criarHeroi({ ...sel, origem: e.heroi.origem }, false); return { origem: e.heroi.origem, sorteada: card_id(), h: { maxHp: e.heroi.maxHp, maxMana: e.heroi.maxMana, maxStam: e.heroi.maxStam, arm: e.heroi.arm, pow: e.heroi.pow, mag: e.heroi.mag, dex: e.heroi.dex }, base: { maxHp: c.maxHp, maxMana: c.maxMana, maxStam: c.maxStam, arm: c.arm, pow: c.pow, mag: c.mag, dex: c.dex }, comO: comO.maxHp }; function card_id() { return null; } });
const esp = ESPERADO[her.origem] || {};
t('o herói nasce com a origem sorteada', her.origem === card.id, JSON.stringify([her.origem, card.id]));
t('os atributos do herói = base + bônus EXATO da origem (tabela do LORE)', Object.keys(her.h).every(k => her.h[k] - her.base[k] === (esp[k] ?? 0)), JSON.stringify(her));
t('campanha inicial: selo Firme, reputação inicial da origem aplicada', await D(() => { const c = window.__dreadcrown.estado.campanha; return c.selo === 'firme' && Object.keys(c.reputacao).length === 14; }));

// ---------- ficha: aba Destino ----------
await D(() => window.__dreadcrown.acoes.mundoModal('ficha')); await p.waitForTimeout(500);
await p.locator('.phase-tab', { hasText: 'Destino' }).click(); await p.waitForTimeout(500);
const dest = await D(() => ({ nome: document.querySelector('[data-testid=destiny-origin-name]')?.innerText, facs: document.querySelectorAll('.faction-row').length, selo: document.querySelector('.seal-step.active')?.innerText, linha: document.querySelector('[data-testid=hero-origin]')?.innerText }));
t('a aba Destino mostra a origem, 14 facções e o Selo Firme', !!dest.nome && dest.nome === card.nome && dest.facs === 14 && dest.selo === 'Firme' && /Origem:/.test(dest.linha || ''), JSON.stringify(dest));
t('a reputação inicial da origem aparece nas facções (hostil/amistosa) conforme os dados', await D(() => { const c = window.__dreadcrown.estado.campanha; return Object.entries(c.reputacao).every(([id, v]) => { const el = document.querySelector(`[data-faction="${id}"]`); if (!el) return false; const f = v <= -25 ? 'hostil' : v < 25 ? 'neutra' : v < 60 ? 'amistosa' : 'aliada'; return el.classList.contains('faixa-' + f); }); }));
await D(() => window.__dreadcrown.acoes.mundoModal(null));

// ---------- save v4 ----------
const s4 = await D(() => { const s = window.__dreadcrown.Save.carregar(); return { v: s.versao, camp: s.progresso.campanha, origem: s.heroi.origem }; });
t('o save é v4 e guarda a origem e a campanha', s4.v === 4 && s4.origem === card.id && s4.camp && s4.camp.selo === 'firme');
await D(() => { window.__dreadcrown.estado.campanha.selo = 'rachado'; window.__dreadcrown.estado.campanha.eixos.misericordia = 2; window.__dreadcrown.acoes.mundoModal(null); });
await D(() => document.dispatchEvent(new Event('visibilitychange'))); // força salvar só se hidden; garante pelo pagehide abaixo
await D(() => window.dispatchEvent(new Event('pagehide'))); await p.waitForTimeout(300);
await p.reload(); await p.waitForTimeout(1500); await p.locator('[data-testid=button-continue]').click(); await noMundo();
const apos = await D(() => { const e = window.__dreadcrown.estado; return { origem: e.heroi.origem, selo: e.campanha.selo, mis: e.campanha.eixos.misericordia, maxHp: e.heroi.maxHp, tela: e.tela, modal: e.modal }; });
t('Continuar restaura origem, selo e eixos, sem modal', apos.origem === card.id && apos.selo === 'rachado' && apos.mis === 2 && apos.maxHp === her.h.maxHp && apos.tela === 'mundo' && !apos.modal, JSON.stringify(apos));

// ---------- save v3 (herói antigo) ----------
await p.reload(); await p.waitForTimeout(1500); // o pagehide regrava o save do mundo atual; só depois (na criação, que não salva) se forja o save v3
await D(() => { const raw = JSON.parse(localStorage.getItem('dreadcrown.save')); raw.versao = 3; delete raw.progresso.campanha; delete raw.heroi.origem; localStorage.setItem('dreadcrown.save', JSON.stringify(raw)); });
await p.reload(); await p.waitForTimeout(1500);
t('um save v3 válido ainda oferece "Continuar"', await p.locator('[data-testid=button-continue]').count() === 1);
await p.locator('[data-testid=button-continue]').click(); await noMundo();
const antigo = await D(() => { const e = window.__dreadcrown.estado, c = e.campanha; return { origem: e.heroi.origem ?? null, selo: c.selo, neutro: Object.values(c.reputacao).every(v => v === 0), linhagem: c.linhagem }; });
t('o herói v3 continua sem origem e sem bônus; campanha neutra', antigo.origem === null && antigo.selo === 'firme' && antigo.neutro && antigo.linhagem === 'bloqueada', JSON.stringify(antigo));
await D(() => window.__dreadcrown.acoes.mundoModal('ficha')); await p.waitForTimeout(400); await p.locator('.phase-tab', { hasText: 'Destino' }).click(); await p.waitForTimeout(400);
t('a aba Destino do herói antigo explica que não há origem', await D(() => /Sem origem/.test(document.querySelector('[data-testid=panel-destiny]').innerText)));
await D(() => window.__dreadcrown.acoes.mundoModal(null));
t('após carregar o save v3 o jogo regravou como v4', await D(() => { window.dispatchEvent(new Event('pagehide')); return window.__dreadcrown.Save.carregar().versao === 4; }));

// ---------- ADM ----------
await D(() => document.querySelector('[data-testid=button-admin-mode]').click()); await espera(() => window.__dreadcrown.estado.tela === 'batalha' && window.__dreadcrown.estado.admin);
t('o modo ADM não usa origem', await D(() => (window.__dreadcrown.estado.heroi.origem ?? null) === null));
t('sem erros de página/console', erros.length === 0, erros.slice(0, 5).join(' | '));
await browser.close(); console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
