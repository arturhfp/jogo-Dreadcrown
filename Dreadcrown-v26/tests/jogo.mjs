/* Teste de integração da interface nova (sem React) no Chromium: fluxo completo de jogo.
   Uso: npm run build && node tests/jogo.mjs */
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhas = 0; const t = (n, c, x = '') => { if (c) { ok++; console.log('  ok  ' + n); } else { falhas++; console.error('FALHOU ' + n + ' ' + x); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } }); p.setDefaultTimeout(60000);
const erros = []; p.on('pageerror', e => erros.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
await p.goto('file://' + path.join(raiz, 'dist/Dreadcrown.html')); await p.waitForTimeout(1500);
t('tela de criação renderizou', await p.locator('.choice-card').count() >= 5 + 6 + 5);
t('three.js exposto', await p.evaluate(() => !!window.__THREE));
t('botão entrar desabilitado sem nome', await p.locator('[data-testid=button-enter-abyss]').isDisabled());
await p.locator('[data-testid=input-hero-name]').fill('Grok');
t('botão habilita com nome', await p.locator('[data-testid=button-enter-abyss]').isEnabled());
await p.locator('[data-testid=button-race-orc]').click(); await p.locator('[data-testid=button-class-mago]').click(); await p.locator('[data-testid=button-branch-Criomante]').click();
t('seleção refletida', await p.evaluate(() => { const s = window.__dreadcrown.estado.selecao; return s.race === 'orc' && s.classId === 'mago' && s.branch === 'Criomante'; }));
t('editor de aparência presente', await p.locator('.appearance-editor .custom-grid label').count() > 3);
t('editor: sem opção bruta duplicada', await p.locator('.custom-grid label').first().locator('option').allInnerTexts().then(o => !o.includes('masculino')));
await p.locator('.editor-tab', { hasText: 'Cabelo' }).click(); await p.waitForTimeout(300); t('aba do editor troca', await p.locator('.custom-grid label').first().innerText().then(x => /cabelo/i.test(x)));
await p.waitForFunction(() => { const w = window.__abyss3d && window.__abyss3d.mounted.creator; return w && w.hero && w.hero.cfgKey && w.hero.cfgKey.cls === 'mago'; });
t('prévia 3D do herói montada na criação', true);
await p.locator('[data-testid=button-enter-abyss]').click();
await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.cena());
t('entrar leva ao mundo aberto (não direto à batalha)', await p.evaluate(() => window.__dreadcrown.estado.mundo.regiaoId === 'vale'));
t('mundo: canvas 3D e inimigos no mapa', await p.locator('canvas').count() >= 1 && await p.evaluate(() => window.__dreadcrown.estado.mundo.inimigos.length >= 4));
t('mundo: área 3D com tamanho real e HUD visível (regressão do CSS)', await p.evaluate(() => { const c = document.querySelector('.world-host canvas'); const r = c.getBoundingClientRect(); const m = document.querySelector('.world-minimap').getBoundingClientRect(); return r.height > 300 && r.width > 500 && m.width > 100 && getComputedStyle(document.querySelector('.world-hud')).zIndex === '5'; }));
// híbrido: posiciona o herói atrás de um inimigo desatento e ataca em tempo real → emboscada
const alvo = await p.evaluate(() => { const m = window.__dreadcrown.estado.mundo; const e = m.inimigos.find(i => i.estado === 'patrulha') || m.inimigos[0]; e.estado = 'patrulha'; m.heroi.x = e.x - Math.cos(e.rumo) * 1.6; m.heroi.z = e.z - Math.sin(e.rumo) * 1.6; window.__dreadcrown.cena().ataquePendente = true; return e.nome; });
await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'batalha', null, { timeout: 15000 });
t('ataque em tempo real por trás inicia batalha com emboscada', await p.evaluate(n => { const c = window.__dreadcrown.estado.combate; return c.iniciativa === 'emboscada' && c.inimigo.name === n; }, alvo));
await p.evaluate(() => { window.__dreadcrown.estado.config.esquivaAtiva = false; });
await p.waitForTimeout(800);
t('batalha renderizou', await p.locator('.battle-arena .boss-name').count() === 1 && (await p.locator('.boss-name').innerText()).length > 0);
t('nome do herói no resumo', (await p.locator('.selection-summary h3').innerText()) === 'Grok');
t('resumo "Raça · Classe · Ramificação"', /Orc · Mago · Criomante/.test(await p.locator('.selection-summary p').innerText()));
await p.waitForFunction(() => { const w = window.__abyss3d && window.__abyss3d.mounted.battle; return w && w.hero && w.enemy; }); t('palco 3D de batalha com herói e inimigo', true);
const vida0 = await p.evaluate(() => window.__dreadcrown.estado.combate.inimigo.hp);
await p.locator('[data-testid=button-action-attack]').click(); await p.waitForTimeout(400);
const s1 = await p.evaluate(() => ({ e: window.__dreadcrown.estado.combate.inimigo.hp, turno: window.__dreadcrown.estado.combate.turno, log: window.__dreadcrown.estado.log.length }));
t('ataque básico executa um turno', s1.turno === 2 && s1.log >= 2, JSON.stringify(s1)); void vida0;
await p.locator('.phase-tab', { hasText: 'Habilidades' }).click();
await p.evaluate(() => { const e = window.__dreadcrown.estado; e.combate.heroi.level = 9; });
await p.locator('.phase-tab', { hasText: 'Arsenal' }).click(); await p.locator('.phase-tab', { hasText: 'Habilidades' }).click();
await p.locator('.skill-group').first().locator('.skill-pick').first().click();
t('habilidade escolhida e travada', await p.locator('.skill-pick.selected').count() === 1);
await p.evaluate(() => { const c = window.__dreadcrown.estado.combate; c.inimigo.maxHp = 999; c.inimigo.hp = 999; c.heroi.hp = c.heroi.maxHp; });
await p.locator('.action-button.rarity-common').click(); await p.waitForTimeout(300);
t('habilidade usada gera log de dano', await p.evaluate(() => window.__dreadcrown.estado.log.some(l => /causou \d+ de dano/.test(l))));
await p.locator('.phase-tab', { hasText: 'Inventário' }).click(); t('inventário mostra poções', await p.locator('.potion-button').count() === 3);
await p.locator('.phase-tab', { hasText: 'Dados' }).click(); await p.locator('.dice-roll').click(); t('dados rolam', /=/.test(await p.locator('.dice-result').innerText()));
await p.locator('.phase-tab', { hasText: 'Arsenal' }).click(); t('painel de equipamento', await p.locator('.gear-slot').count() === 4);
// vitória → acampamento (auto-avanço pode clicar sozinho em "Descansar")
await p.evaluate(() => { const e = window.__dreadcrown.estado; e.combate.inimigo.hp = 1; e.combate.heroi.stam = e.combate.heroi.maxStam; e.combate.heroi.hp = 10; });
await p.locator('[data-testid=button-action-ultimate]').isDisabled();
for (let i = 0; i < 12; i++) { if (await p.evaluate(() => window.__dreadcrown.estado.combate.fim)) break; await p.evaluate(() => { const h = window.__dreadcrown.estado.combate.heroi; h.hp = h.maxHp; h.stam = h.maxStam; window.__dreadcrown.acoes.agir('basic'); }); }
t('vitória alcançada', await p.evaluate(() => window.__dreadcrown.estado.combate.fim === 'vitoria' || window.__dreadcrown.estado.heroi.wins >= 1));
await p.locator('.camp-option').first().click();
await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'mundo', null, { polling: 250, timeout: 30000 });
t('após vitória e acampamento volta ao mundo, inimigo derrotado some', await p.evaluate(() => { const m = window.__dreadcrown.estado.mundo; return m.inimigos.some(i => i.estado === 'morto') && window.__dreadcrown.estado.heroi.wins >= 1; }));
t('save salvo no navegador', await p.evaluate(() => !!window.__dreadcrown.Save.carregar() ));
// loja forçada
await p.evaluate(() => { const e = window.__dreadcrown.estado; e.loja = [{ name: 'Poção de Cura', price: 12, desc: 'x', type: 'Consumível', kind: 'potion', pot: 'life', rarity: 'Comum' }]; e.modal = 'loja'; e.combate.heroi.coins = 100; window.__dreadcrown.acoes.aba('equipment'); });
t('loja renderiza', await p.locator('.shop-card .shop-item').count() === 1);
await p.locator('.shop-card .shop-item button').click(); t('compra funciona', await p.evaluate(() => window.__dreadcrown.estado.heroi.coins === 88 && window.__dreadcrown.estado.loja.length === 0));
await p.locator('[aria-label="Sair da loja"]').click();
// admin
await p.locator('[data-testid=button-admin-mode]').click(); await p.waitForTimeout(500);
t('modo ADM: herói nível 9 + chefe', await p.evaluate(() => { const e = window.__dreadcrown.estado; return e.admin && e.heroi.level === 9 && e.combate.inimigo.kind === 'demon'; }));
t('banner ADM visível', await p.locator('.admin-banner').isVisible());
t('sem erros de página/console', erros.length === 0, erros.slice(0, 5).join(' | '));
await p.screenshot({ path: process.env.SHOT || '/tmp/jogo.png' });
await browser.close(); console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
