/* Regressão no navegador dos problemas corrigidos na v27 (fluxos reais, com o HTML único gerado por `npm run build`):
   1. o acampamento após a vitória só avança quando o jogador escolhe (script legado de auto-avanço removido);
   2. derrota → modal; ações do painel após a derrota NÃO gravam vida 0; "Retomar" volta ao mundo jogável;
   3. save inválido/corrompido é ignorado com aviso (sem botão "Continuar" quebrado);
   4. teclas soltas ao perder o foco da janela (herói não anda sozinho);
   5. botão ADM clicado a partir do mundo destrói a cena do mundo (sem cena/temporizador órfãos);
   6. o modelo do Orc é decodificado uma vez só (cache) e o carregamento repetido continua produzindo atores independentes.
   Uso: npm run build && node tests/regressao-v27.mjs   (variáveis: CHROMIUM_PATH, PLAYWRIGHT_PATH) */
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let ok = 0, falhas = 0; const t = (n, c, x = '') => { if (c) { ok++; console.log('  ok  ' + n); } else { falhas++; console.error('FALHOU ' + n + ' ' + x); } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await browser.newPage({ viewport: { width: 1280, height: 900 } }); p.setDefaultTimeout(90000);
const erros = []; p.on('pageerror', e => erros.push('pageerror: ' + e.message)); p.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 200)); });
const url = 'file://' + path.join(raiz, 'dist/Dreadcrown.html');
const D = fn => p.evaluate(fn);

async function entrarNoMundo() {
  await p.locator('[data-testid=input-hero-name]').fill('Teste');
  await p.locator('[data-testid=button-race-orc]').click(); await p.locator('[data-testid=button-class-tanke]').click();
  await p.locator('[data-testid=button-enter-abyss]').click();
  await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.cena());
}
const iniciarBatalha = () => D(() => { const d = window.__dreadcrown, e = d.estado.mundo.inimigos.find(x => x.estado !== 'morto'); d.estado.config.esquivaAtiva = false; d.acoes.iniciarBatalhaDoMundo({ id: e.id, nome: e.nome, iniciativa: 'normal' }); });

// ---------- 6. cache do Orc (na tela de criação, antes de qualquer jogo) ----------
await p.goto(url); await p.waitForTimeout(1200);
await p.waitForFunction(() => window.__abyss3d && window.__abyss3d.mounted.creator && window.__abyss3d.mounted.creator.hero, null, { timeout: 90000 }).catch(() => { });
const cache = await p.evaluate(async () => {
  const L = window.__abyss3d.loadOrc, a = await L(), b = await L();
  const ossosA = a.nodes.filter(n => n.isBone), ossosB = b.nodes.filter(n => n.isBone);
  const texA = a.root.children.length && (() => { let m = null; a.root.traverse(o => { if (!m && o.isMesh && o.material.map) m = o.material.map; }); return m; })();
  const texB = (() => { let m = null; b.root.traverse(o => { if (!m && o.isMesh && o.material.map) m = o.material.map; }); return m; })();
  return { semOrc: !a || !b, ossos: ossosA.length, ossosIguais: ossosA.length === ossosB.length, esqueletosIndependentes: ossosA.length > 0 && ossosA[0] !== ossosB[0], texturasIndependentes: !!texA && !!texB && texA !== texB, mesmoBitmap: !!texA && !!texB && texA.image === texB.image };
});
t('Orc carrega duas vezes com esqueletos e texturas independentes', !cache.semOrc && cache.ossos > 5 && cache.ossosIguais && cache.esqueletosIndependentes && cache.texturasIndependentes, JSON.stringify(cache));
t('bitmap decodificado é compartilhado entre os carregamentos (cache)', cache.mesmoBitmap, JSON.stringify(cache));

// ---------- 3. save inválido ----------
await p.evaluate(() => localStorage.setItem('dreadcrown.save', JSON.stringify({ versao: 2, heroi: { name: 'Quebrado', race: 'humano' }, progresso: {}, config: {} })));
await p.reload(); await p.waitForTimeout(1200);
t('save com herói inválido: sem botão "Continuar" e aviso na barra', await p.locator('[data-testid=button-continue]').count() === 0 && /inválido/i.test(await p.locator('.meta-status').innerText()));
await p.evaluate(() => localStorage.setItem('dreadcrown.save', '{isto não é json'));
await p.reload(); await p.waitForTimeout(1200);
t('save corrompido (JSON quebrado): jogo abre normalmente', await p.locator('[data-testid=input-hero-name]').count() === 1 && await p.locator('[data-testid=button-continue]').count() === 0);
await p.evaluate(() => localStorage.clear());
await p.reload(); await p.waitForTimeout(1200);

// ---------- mundo ----------
await entrarNoMundo();

// ---------- 4. teclas ao perder o foco ----------
const teclas = await D(() => { const c = window.__dreadcrown.cena(); window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' })); const antes = c.teclas.has('w'); window.dispatchEvent(new Event('blur')); return { antes, depois: c.teclas.size }; });
t('tecla pressionada é solta quando a janela perde o foco', teclas.antes === true && teclas.depois === 0, JSON.stringify(teclas));

// ---------- 1. acampamento não avança sozinho ----------
await iniciarBatalha(); await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'batalha');
await D(() => { const d = window.__dreadcrown; d.estado.combate.inimigo.hp = 1; d.estado.combate.heroi.stam = d.estado.combate.heroi.maxStam; });
for (let i = 0; i < 12 && !(await D(() => window.__dreadcrown.estado.combate.fim)); i++) await D(() => { const h = window.__dreadcrown.estado.combate.heroi; h.stam = h.maxStam; h.hp = h.maxHp; window.__dreadcrown.acoes.agir('basic'); });
t('vitória abre o resumo (v28: nem acampamento nem loja automáticos)', await D(() => window.__dreadcrown.estado.combate.fim === 'vitoria' && window.__dreadcrown.estado.modal === 'vitoria'));
await p.waitForTimeout(4000);
t('após 4 s o resumo continua aberto e o jogador ainda está na batalha (nada clicou por ele)', await D(() => window.__dreadcrown.estado.modal === 'vitoria' && window.__dreadcrown.estado.tela === 'batalha') && await p.locator('[data-testid=button-continue-victory]').count() === 1 && await p.locator('.camp-option').count() === 1);
if (await p.locator('[data-testid=button-decide-poupar]').count()) await p.locator('[data-testid=button-decide-poupar]').click(); // v31: se o alvo é de missão, decide antes de continuar
await p.locator('[data-testid=button-continue-victory]').click({ timeout: 300000 }); // a transição reconstrói o mundo 3D: sob render por software leva dezenas de segundos
await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'mundo', null, { polling: 250, timeout: 300000 });
t('continuar volta ao mundo sem modal e sem loja', await D(() => window.__dreadcrown.estado.tela === 'mundo' && !window.__dreadcrown.estado.modal) && await p.locator('.shop-card').count() === 0);
// acampamento real do mundo: Lootear é a ação aplicada (não Descansar) e o acampamento só abre por interação
await D(() => { const d = window.__dreadcrown, c = d.geo.pontoPorId('camp:vale'), m = d.estado.mundo; m.heroi.x = c.x + Math.cos(c.rumo) * 2.4; m.heroi.z = c.z + Math.sin(c.rumo) * 2.4; });
await p.waitForFunction(() => window.__dreadcrown.lojaDisponivel(), null, { polling: 250, timeout: 10000 });
t('chegar ao acampamento não abre nada sozinho', await D(() => !window.__dreadcrown.estado.modal));
await D(() => window.__dreadcrown.acoes.mundoInteragir());
await p.locator('[data-testid=button-camp-loot]').click();
t('a ação escolhida (Lootear) é a que foi aplicada', await D(() => window.__dreadcrown.estado.log.some(l => /vasculhou/.test(l))));
await p.locator('[data-testid=button-camp-leave]').click();

// ---------- 2. derrota ----------
await iniciarBatalha(); await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'batalha');
await D(() => { const c = window.__dreadcrown.estado.combate; c.heroi.hp = 1; c.heroi.arm = 0; c.heroi.shield = 0; c.inimigo.hp = 9999; c.inimigo.maxHp = 9999; c.inimigo.dmg = 90; });
for (let i = 0; i < 8 && !(await D(() => window.__dreadcrown.estado.combate.fim)); i++) await D(() => window.__dreadcrown.acoes.agir('basic'));
t('derrota registrada', await D(() => window.__dreadcrown.estado.combate.fim === 'derrota'));
t('modal de derrota aparece com "Retomar" habilitado e "Criar novo personagem"', await p.locator('[data-testid=button-resume-save]').isEnabled() && await p.locator('[data-testid=button-recreate]').count() === 1);
await D(() => { const d = window.__dreadcrown; d.estado.combate.heroi.level = 9; d.acoes.escolherHabilidade('common', 0); d.acoes.aba('skills'); });
const salvo = await D(() => { const s = window.__dreadcrown.Save.carregar(); return { hp: s.heroi.hp }; });
t('ação do painel depois da derrota NÃO grava herói com vida 0 (causa do soft-lock)', salvo.hp > 0, JSON.stringify(salvo));
await p.locator('[data-testid=button-resume-save]').click();
await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'mundo' && window.__dreadcrown.estado.heroi.hp > 0);
t('"Retomar" volta ao mundo com herói vivo e sem combate pendente', await D(() => { const e = window.__dreadcrown.estado; return e.heroi.hp > 0 && e.modal === null && !e.combate.fim; }));
await iniciarBatalha(); await p.waitForFunction(() => window.__dreadcrown.estado.tela === 'batalha');
await D(() => { window.__dreadcrown.acoes.agir('basic'); });
t('depois de retomar, o herói consegue agir numa nova batalha', await D(() => window.__dreadcrown.estado.combate.turno >= 2 || window.__dreadcrown.estado.log.length > 1));

// ---------- 5. ADM a partir do mundo ----------
await D(() => { window.__dreadcrown.acoes.recriar(); });
await entrarNoMundo();
await p.locator('[data-testid=button-admin-mode]').click(); await p.waitForTimeout(500);
t('ADM clicado no mundo: cena do mundo destruída (sem cena órfã)', await D(() => window.__dreadcrown.cena() === null && window.__dreadcrown.estado.tela === 'batalha'));
await p.waitForTimeout(500);
t('sem erros de página/console', erros.length === 0, erros.slice(0, 5).join(' | '));
await browser.close(); console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
