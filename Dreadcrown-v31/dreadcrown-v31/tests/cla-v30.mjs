/* Teste de navegador da v30 (Chromium + SwiftShader, HTML único): escolha do clã na criação, Destino (clã e aceitação das facções), desconto real na loja do acampamento, save e clã para herói antigo.
   Uso: npm run build && node tests/cla-v30.mjs */
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url); const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhas = 0; const t = (n, c, x = '') => { if (c) { ok++; console.log('  ok  ' + n); } else { falhas++; console.error('FALHOU ' + n + ' ' + x); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage(); p.setDefaultTimeout(150000);
const erros = []; p.on('pageerror', e => erros.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
const D = (fn, a) => p.evaluate(fn, a), espera = (fn, a, ms = 150000) => p.waitForFunction(fn, a, { polling: 250, timeout: ms });
const noMundo = () => espera(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.cena() && window.__dreadcrown.cena().pronto);
const abrirDestino = async () => { await D(() => window.__dreadcrown.acoes.mundoModal('ficha')); await p.waitForTimeout(400); await p.locator('.phase-tab', { hasText: 'Destino' }).click(); await p.waitForTimeout(400); };
await p.goto('file://' + path.join(raiz, 'dist/Dreadcrown.html')); await p.waitForTimeout(1500);

// ---------- criação: escolha do clã ----------
const ids = () => D(() => [...document.querySelectorAll('[data-testid^=button-clan-]')].map(e => e.getAttribute('data-testid').replace('button-clan-', '')));
t('humano: 3 clãs humanos, o primeiro já marcado', JSON.stringify(await ids()) === JSON.stringify(['casa-vael', 'guarda-alvorada', 'liga-do-lacre']) && await D(() => window.__dreadcrown.estado.selecao.clan === 'casa-vael'), JSON.stringify(await ids()));
await p.locator('[data-testid=button-race-orc]').click(); await p.waitForTimeout(300);
t('trocar para orc mostra os 3 clãs orcs e seleciona o primeiro (nunca fica um clã de outra raça)', JSON.stringify(await ids()) === JSON.stringify(['muro-do-vale', 'rastro-de-lobo', 'estandarte-partido']) && await D(() => window.__dreadcrown.estado.selecao.clan === 'muro-do-vale'));
await p.locator('[data-testid=button-race-humano]').click(); await p.waitForTimeout(300);
await p.locator('[data-testid=button-clan-liga-do-lacre]').click(); await p.waitForTimeout(300);
t('escolher o clã marca a seleção', await D(() => window.__dreadcrown.estado.selecao.clan === 'liga-do-lacre' && document.querySelector('[data-testid=button-clan-liga-do-lacre]').classList.contains('selected')));
await p.locator('[data-testid=input-hero-name]').fill('Mercador'); await p.locator('[data-testid=button-class-tanke]').click(); await p.locator('[data-testid=button-enter-abyss]').click(); await noMundo();
t('o herói nasce no clã escolhido', await D(() => window.__dreadcrown.estado.heroi.clan === 'liga-do-lacre' && window.__dreadcrown.estado.heroi.clansPerdidos.length === 0));

// ---------- Destino ----------
await abrirDestino();
const dest = await D(() => ({ clan: document.querySelector('[data-testid=destiny-clan-name]')?.innerText, culto: document.querySelector('[data-faction=culto]')?.innerText, vig: document.querySelector('[data-faction=vigilia]')?.innerText, cruz: document.querySelector('[data-faction="cruzada-da-pureza"]')?.innerText }));
t('a aba Destino mostra o clã', dest.clan === 'Liga do Lacre', JSON.stringify(dest));
t('aceitação: o Culto rejeita quem não segue o Despertar; a Vigília e a Cruzada (herói humano) não', /Rejeita/.test(dest.culto) && !/Rejeita/.test(dest.vig) && !/Rejeita/.test(dest.cruz), JSON.stringify(dest));
await D(() => window.__dreadcrown.acoes.mundoModal(null));

// ---------- desconto real na loja do acampamento ----------
await D(() => { const d = window.__dreadcrown, c = d.geo.pontoPorId('camp:vale'), m = d.estado.mundo; for (const e of m.inimigos) if (e.estado !== 'morto' && e.espaco === 'exterior' && Math.hypot(e.x - c.x, e.z - c.z) < 160) d.regrasMundo.derrotarInimigo(m, e.id); m.heroi.x = c.x + Math.cos(c.rumo) * 2.4; m.heroi.z = c.z + Math.sin(c.rumo) * 2.4; d.estado.combate.heroi.coins = 100; });
await espera(() => window.__dreadcrown.lojaDisponivel(), null, 30000);
await D(() => window.__dreadcrown.acoes.mundoInteragir()); await p.locator('[data-testid=button-camp-trade]').click(); await p.waitForTimeout(500);
const loja = await D(() => ({ itens: window.__dreadcrown.estado.loja.map(i => ({ k: i.kind, p: i.price, b: i.precoBase ?? null, d: i.descontoClan ?? 0 })), texto: document.querySelector('.shop-card').innerText }));
t('as poções saem −10% (12→11, 10→9) e os demais itens ficam no preço normal', loja.itens.filter(i => i.k === 'potion').every(i => i.d === 10 && i.p === Math.round(i.b * 0.9)) && loja.itens.filter(i => i.k !== 'potion').every(i => i.d === 0 && i.b === null), JSON.stringify(loja.itens));
t('a interface mostra o preço original riscado e a marca do clã', /clã −10%/.test(loja.texto) && await p.locator('.shop-card .item-price s').count() >= 3, loja.texto.slice(0, 200));
const antes = await D(() => ({ c: window.__dreadcrown.estado.heroi.coins, v: window.__dreadcrown.estado.heroi.pots.life, pr: window.__dreadcrown.estado.loja[0].price, n: window.__dreadcrown.estado.loja[0].name }));
await p.locator('.shop-card .shop-item button').first().click(); await p.waitForTimeout(400);
t('comprar desconta o preço COM desconto e entrega a poção', await D(a => window.__dreadcrown.estado.heroi.coins === a.c - a.pr && window.__dreadcrown.estado.heroi.pots.life === a.v + 1, antes) && antes.n === 'Poção de Cura' && antes.pr === 11, JSON.stringify(antes));
await p.locator('[aria-label="Sair da loja"]').click(); await p.waitForTimeout(300); await D(() => window.__dreadcrown.acoes.mundoFecharCamp());

// ---------- save, herói antigo sem clã ----------
await D(() => window.dispatchEvent(new Event('pagehide'))); await p.waitForTimeout(300);
await p.reload(); await p.waitForTimeout(1500); await p.locator('[data-testid=button-continue]').click(); await noMundo();
t('Continuar mantém o clã', await D(() => window.__dreadcrown.estado.heroi.clan === 'liga-do-lacre'));
await D(() => window.dispatchEvent(new Event('pagehide'))); await p.reload(); await p.waitForTimeout(1500); // grava e volta à criação (que não salva)
await D(() => { const raw = JSON.parse(localStorage.getItem('dreadcrown.save')); delete raw.heroi.clan; delete raw.heroi.clansPerdidos; localStorage.setItem('dreadcrown.save', JSON.stringify(raw)); });
await p.reload(); await p.waitForTimeout(1500); await p.locator('[data-testid=button-continue]').click(); await noMundo();
await abrirDestino();
t('herói antigo (sem clã) vê "Sem clã" e 3 botões de entrada habilitados, só da raça dele', await D(() => { const b = [...document.querySelectorAll('[data-testid^=button-join-]')]; return /Sem clã/.test(document.querySelector('[data-testid=destiny-clan]').innerText) && b.length === 3 && b.every(x => !x.disabled) && b.every(x => ['casa-vael', 'guarda-alvorada', 'liga-do-lacre'].some(id => x.getAttribute('data-testid') === 'button-join-' + id)); }));
await p.locator('[data-testid=button-join-guarda-alvorada]').click(); await p.waitForTimeout(500);
t('entrar no clã pela ficha funciona, vira o clã do herói e some a oferta', await D(() => window.__dreadcrown.estado.heroi.clan === 'guarda-alvorada' && document.querySelector('[data-testid=destiny-clan-name]')?.innerText === 'Guarda Alvorada' && document.querySelectorAll('[data-testid^=button-join-]').length === 0));
t('o clã escolhido foi para o save', await D(() => window.__dreadcrown.Save.carregar().heroi.clan === 'guarda-alvorada'));
await D(() => window.__dreadcrown.acoes.mundoModal(null));

// ---------- outra raça: aceitação racista ----------
await D(() => window.dispatchEvent(new Event('pagehide'))); await p.reload(); await p.waitForTimeout(1500);
await p.locator('[data-testid=input-hero-name]').fill('Grom'); await p.locator('[data-testid=button-race-orc]').click(); await p.locator('[data-testid=button-clan-estandarte-partido]').click(); await p.locator('[data-testid=button-enter-abyss]').click(); await noMundo();
t('orc com o clã escolhido', await D(() => window.__dreadcrown.estado.heroi.race === 'orc' && window.__dreadcrown.estado.heroi.clan === 'estandarte-partido'));
await abrirDestino();
const orc = await D(() => ({ cruz: document.querySelector('[data-faction="cruzada-da-pureza"]').innerText, folha: document.querySelector('[data-faction="folha-eterna"]').innerText }));
t('a Cruzada da Pureza rejeita o orc; o Círculo da Folha Eterna (alvo: humanos) não', /Rejeita/.test(orc.cruz) && !/Rejeita/.test(orc.folha), JSON.stringify(orc));
await D(() => window.__dreadcrown.acoes.mundoModal(null));
t('sem erros de página/console', erros.length === 0, erros.slice(0, 5).join(' | '));
await browser.close(); console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
