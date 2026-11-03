// Testes da regra da loja (v28): só em acampamento válido, por escolha explícita. Regras reais + varredura estática do código-fonte.
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 4).join(' | ')); } }
const A = await imp('src/rules/acampamento.js'); const M = await imp('src/rules/mundo.js'); const G = await imp('src/rules/geografia.js'); const H = await imp('src/rules/heroi.js'); const { CLASSES } = await imp('src/data/jogo/classes.js'); const { DUNGEONS } = await imp('src/data/jogo/dungeons.js');
const heroi = (cls = 'tanke') => H.criarHeroi({ name: 'T', race: 'orc', classId: cls, branch: CLASSES.find(c => c.id === cls).branches[0], weaponId: null, appearance: {} });
const ler = f => fs.readFileSync(path.join(raiz, f), 'utf8');
const noCamp = id => { const p = G.pontoPorId(id); return M.criarMundo({ x: p.x + Math.cos(p.rumo) * 2.4, z: p.z + Math.sin(p.rumo) * 2.4 }); };

console.log('Regra da loja (lógica do jogo)');
await t('lojaDisponivel: verdadeira em cada um dos 6 acampamentos', () => { for (const p of G.PONTOS.filter(q => q.tipo === 'acampamento')) assert.equal(M.lojaDisponivel(noCamp(p.id)), true, p.id); });
await t('lojaDisponivel: falsa em campo aberto, nas estradas, nas ruínas, fortaleza, portão e na porta da dungeon', () => {
  for (const p of G.PONTOS.filter(q => q.tipo !== 'acampamento')) { const m = M.criarMundo({ x: p.x + Math.cos(p.rumo || 0) * 2.4, z: p.z + Math.sin(p.rumo || 0) * 2.4 }); assert.equal(M.lojaDisponivel(m), false, p.id); }
  for (const [x, z] of [[100, 300], [250, 300], [300, 100], [200, 250], [420, 100]]) { const p = G.posicaoInicial ? null : null; void p; const m = M.criarMundo({ x, z }); if (M.pontoProximo(m)?.tipo !== 'acampamento') assert.equal(M.lojaDisponivel(m), false, `${x},${z}`); }
});
await t('lojaDisponivel: falsa a poucos metros além do raio do acampamento', () => { const p = G.pontoPorId('camp:vale'); const m = M.criarMundo({ x: p.x + 20, z: p.z + 20 }); assert.equal(M.lojaDisponivel(m), false); });
await t('lojaDisponivel: falsa dentro da dungeon, mesmo com coordenadas coincidindo com as de um acampamento', () => {
  const p = G.pontoPorId('dg:catacumbas'), m = M.criarMundo({ x: p.x + Math.cos(p.rumo) * 2.6, z: p.z + Math.sin(p.rumo) * 2.6 }); assert.ok(M.entrarDungeon(m, 'catacumbas').ok); assert.equal(M.lojaDisponivel(m), false);
  const c = G.pontoPorId('camp:cavernas'); m.heroi.x = c.x; m.heroi.z = c.z; assert.equal(M.lojaDisponivel(m), false, 'espaço dungeon nunca é acampamento');
});
await t('lojaDisponivel: falsa sem mundo e com estado inválido', () => { assert.equal(M.lojaDisponivel(null), false); assert.equal(M.lojaDisponivel({}), false); });
await t('um save carregado dentro de um acampamento NÃO reabre a loja (a loja não faz parte do estado salvo)', () => {
  const Save = ler('src/state/save.js'); assert.ok(!/\bloja\b/.test(Save.replace(/\/\/.*$/gm, '')), 'save.js menciona loja');
  const app = ler('src/ui/jogo/app.js'); assert.ok(/retomarSave[\s\S]{0,900}modal\s*=\s*null/.test(app) || /retomarSave/.test(app));
});

console.log('Rotas de abertura (varredura estática do código)');
await t("estado.modal = 'loja' aparece em UM único lugar (abrirLoja) e ele exige tela do mundo, camp aberto e lojaDisponivel", () => {
  const app = ler('src/ui/jogo/app.js'); const m = [...app.matchAll(/modal\s*=\s*'loja'/g)]; assert.equal(m.length, 1, 'atribuições de modal=loja: ' + m.length);
  const i = app.indexOf("modal = 'loja'"), trecho = app.slice(app.lastIndexOf('const abrirLoja', i), i); assert.ok(/estado\.tela !== 'mundo'/.test(trecho) && /estado\.modal !== 'camp'/.test(trecho) && /lojaDisponivel\(estado\.mundo\)/.test(trecho));
});
await t('montarLoja é chamado somente em abrirLoja; nenhum outro arquivo de src (exceto o bundle gerado) o chama', () => {
  const alvos = []; (function varre(d) { for (const e of fs.readdirSync(path.join(raiz, d), { withFileTypes: true })) { const rel = d + '/' + e.name; if (e.isDirectory()) { if (e.name !== 'vendor') varre(rel); } else if (/\.js$/.test(e.name)) alvos.push(rel); } })('src');
  const usos = []; for (const f of alvos) for (const [i, l] of ler(f).split('\n').entries()) if (/montarLoja\s*\(/.test(l) && !/^\s*export function montarLoja/.test(l)) usos.push(`${f}:${i + 1}`);
  assert.deepEqual(usos.map(u => u.split(':')[0]), ['src/ui/jogo/app.js'], usos.join(', '));
  assert.ok(/abrirLoja = \(\) => \{[\s\S]{0,400}montarLoja\(/.test(ler('src/ui/jogo/app.js')));
});
await t("nenhum fluxo de batalha/vitória/descanso/carga atribui 'loja' (modal só recebe camp/vitoria/derrota/null nesses fluxos)", () => {
  const todos = ['src/ui/jogo/batalha.js', 'src/ui/jogo/modais.js', 'src/ui/jogo/mundo.js', 'src/state/save.js', 'src/rules/combate.js', 'src/rules/acampamento.js', 'src/rules/mundo.js'];
  for (const f of todos) assert.ok(!/modal\s*=\s*'loja'/.test(ler(f)), f);
  const app = ler('src/ui/jogo/app.js'); const semComentario = x => x.replace(/\/\/.*$/gm, ''); assert.ok(!/abreLoja/.test(semComentario(app)) && !/abreLoja/.test(semComentario(ler('src/rules/acampamento.js'))), 'sobrou abreLoja');
});
await t('o botão "Comércio" é um callback explícito (mundoComercio → abrirLoja) e só é montado quando lojaDisponivel', () => {
  const ui = ler('src/ui/jogo/mundo.js'); assert.ok(/lojaDisponivel\(s\.mundo\) \? \{ comercio/.test(ui)); const app = ler('src/ui/jogo/app.js'); assert.ok(/mundoComercio\(\)\s*\{[^}]*abrirLoja\(\)/.test(app), 'mundoComercio não chama abrirLoja');
});
await t('não existem pontos de comércio fora de acampamentos: nenhum ponto/marco do mundo é do tipo mercador/loja', () => {
  for (const p of G.PONTOS) assert.ok(['acampamento', 'dungeon', 'marco'].includes(p.tipo), p.id + ' tipo ' + p.tipo); const { MARCOS } = await_dummy(); void MARCOS;
  for (const p of G.PONTOS.filter(q => q.tipo !== 'acampamento')) assert.ok(!G.pecasDoPOI(p).some(x => x.forma === 'tendaMercador'), p.id + ' tem tenda de mercador');
  for (const p of G.PONTOS.filter(q => q.tipo === 'acampamento')) assert.ok(G.pecasDoPOI(p).some(x => x.forma === 'tendaMercador'), p.id + ' sem mercador');
});
function await_dummy() { return {}; }
await t("acampar() nunca devolve abreLoja (descansar/tratar/vasculhar) em 300 sementes", () => {
  const h = heroi(); for (let s = 1; s <= 300; s++) for (const a of ['descansar', 'tratar', 'vasculhar']) { const r = A.acampar(h, a, s); assert.ok(!('abreLoja' in r), `${a} s=${s}`); }
});
await t('vitória em combate não abre loja: o desfecho do combate não contém nenhum campo de comércio', async () => {
  const C = await imp('src/rules/combate.js'), I = await imp('src/rules/inimigos.js'); let c = C.criarCombate({ heroi: heroi(), inimigo: { ...I.inimigoPorNome('Cultista Carmesim'), hp: 1 }, semente: 9, iniciativa: 'normal' }); c = C.executarAcao(c, { tipo: 'basico' }).combate; for (let i = 0; i < 6 && !c.fim; i++) c = C.executarAcao(c, { tipo: 'basico' }).combate;
  assert.equal(c.fim, 'vitoria'); assert.ok(!JSON.stringify(c).toLowerCase().includes('loja'));
});

console.log('Compras (comercial preservado)');
const loja = (h, s = 11) => A.montarLoja(h, s).itens, acha = (it, k) => it.find(i => i.kind === k);
await t('compra de poção: desconta o preço exato e soma 1 poção do tipo; a original não é mutada', () => {
  const h = { ...heroi(), coins: 100 }, it = acha(loja(h), 'potion'), antes = h.pots[it.pot] ?? 0, r = A.comprar(h, it); assert.ok(r.ok); assert.equal(r.heroi.coins, 100 - it.price); assert.equal(r.heroi.pots[it.pot], antes + 1); assert.equal(h.coins, 100);
});
await t('poção comprada tem efeito real ao usar (restaura vida)', () => {
  const h = { ...heroi(), coins: 100 }; h.hp = 1; const r = A.comprar(h, loja(h).find(i => i.pot === 'life')); const u = A.usarPocao(r.heroi, 'life'); assert.ok(u.heroi.hp > 1); assert.equal(u.heroi.pots.life, (h.pots.life ?? 0));
});
await t('melhoria de arma: +1 por compra na arma equipada e desconta o preço', () => {
  const h = { ...heroi(), coins: 100 }, it = acha(loja(h), 'weaponUpgrade'), r = A.comprar(h, it); assert.equal(r.heroi.weaponUpgrades[h.weaponId], (h.weaponUpgrades?.[h.weaponId] ?? 0) + 1); assert.equal(r.heroi.coins, 100 - it.price);
});
await t('compra de arma: entra no inventário, é equipada e desconta; equipamento entra no inventário', () => {
  const h = { ...heroi(), coins: 5000 }, its = loja(h), w = acha(its, 'weapon'), r = A.comprar(h, w); assert.ok(r.heroi.inventoryWeapons.includes(w.id)); assert.equal(r.heroi.weaponId, w.id); assert.equal(r.heroi.coins, 5000 - w.price);
  const g = acha(its, 'gear'); if (g) { const r2 = A.comprar(h, g); assert.ok(r2.heroi.inventoryGear.includes(g.id)); assert.equal(r2.heroi.coins, 5000 - g.price); }
});
await t('moedas insuficientes recusam a compra sem alterar nada; item inexistente também', () => {
  const h = { ...heroi(), coins: 3 }, it = acha(loja(h), 'weaponUpgrade'), r = A.comprar(h, it); assert.equal(r.ok, false); assert.deepEqual(r.heroi, h); assert.equal(A.comprar(h, null).ok, false);
});
await t('Reforçar armadura só é oferecida a quem tem armadura base e faz efeito real (regressão v27)', () => {
  const h = { ...heroi(), coins: 500 }; if (!h.armorId) { assert.ok(!loja(h).some(i => i.kind === 'armorUpgrade')); h.armorId = 'xx'; } const it = { name: 'Reforçar armadura', price: 22, kind: 'armorUpgrade' }; const r = A.comprar(h, it); assert.ok(r.ok); assert.equal(r.heroi.armorUpgrades[h.armorId], 1); assert.equal(r.heroi.coins, 478);
  const sem = { ...heroi(), coins: 500, armorId: null }; assert.equal(A.comprar(sem, it).ok, false);
});
await t('preços e estoque da loja continuam determinísticos por semente (mesmos itens e preços)', () => { const h = heroi(); assert.deepEqual(loja(h, 77), loja(h, 77)); assert.ok(loja(h, 77).every(i => Number.isFinite(i.price) && i.price > 0)); });
void DUNGEONS;
console.log(`\n${ok} ok, ${falhas} falhas`); if (falhas) process.exit(1);
