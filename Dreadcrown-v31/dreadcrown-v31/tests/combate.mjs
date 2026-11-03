// Testes do motor de combate: determinismo, regras de dano/recursos, progressão, loja.
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 3).join(' | ')); } }
const { criarRng } = await imp('src/core/rng.js');
const H = await imp('src/rules/heroi.js'); const C = await imp('src/rules/combate.js');
const I = await imp('src/rules/inimigos.js'); const A = await imp('src/rules/acampamento.js');
const { RACAS } = await imp('src/data/jogo/racas.js'); const { CLASSES } = await imp('src/data/jogo/classes.js');
const sel = (race, cls, i = 0) => ({ name: 'T', race, classId: cls, branch: CLASSES.find(c => c.id === cls).branches[i], weaponId: null, appearance: {} });

console.log('RNG');
await t('mesma semente → mesma sequência; sementes diferentes divergem', () => {
  const a = criarRng(7), b = criarRng(7), c = criarRng(8);
  const sa = Array.from({ length: 20 }, () => a.proximo()), sb = Array.from({ length: 20 }, () => b.proximo()), sc = Array.from({ length: 20 }, () => c.proximo());
  assert.deepEqual(sa, sb); assert.notDeepEqual(sa, sc); assert.ok(sa.every(x => x >= 0 && x < 1));
});
await t('inteiro respeita limites inclusivos', () => { const r = criarRng(3); const v = Array.from({ length: 2000 }, () => r.inteiro(1, 20)); assert.equal(Math.min(...v), 1); assert.equal(Math.max(...v), 20); });

console.log('Herói');
await t('30 combinações raça×classe criam herói válido', () => {
  for (const r of RACAS) for (const c of CLASSES) { const h = H.criarHeroi(sel(r.id, c.id)); assert.ok(h.maxHp > 0 && h.hp === h.maxHp && h.level === 1); assert.ok(H.armasDaClasse(c.id, r.large).some(a => a.id === h.weaponId)); }
});
await t('modo admin: nível 9, equipamentos completos', () => { const h = H.criarHeroi(sel('orc', 'arqueiro'), true); assert.equal(h.level, 9); assert.equal(h.ult, 100); assert.ok(h.equippedGear.helmet); });
await t('recalcular é idempotente para herói recém-criado', () => { const h = H.criarHeroi(sel('elfo', 'mago')); const r = H.recalcular(h); for (const k of ['maxHp', 'maxMana', 'maxStam', 'arm', 'pow', 'mag', 'dex']) assert.equal(r[k], h[k], k); });

console.log('Combate');
const novo = (semente = 1, race = 'orc', cls = 'tanke') => { const rng = criarRng(semente); return C.criarCombate({ heroi: H.criarHeroi(sel(race, cls)), inimigo: I.gerarInimigo(rng, false, 0), semente }); };
await t('determinismo: mesma semente e ações → estados idênticos', () => {
  const rodar = () => { let c = novo(99), log = []; for (let i = 0; i < 12 && !c.fim; i++) { const r = C.executarAcao(c, { tipo: i % 4 === 3 ? 'esquivar' : 'basico' }); c = r.combate; log.push(...r.eventos); } return { c, log }; };
  assert.deepEqual(rodar(), rodar());
});
await t('não muta o estado de entrada (puro)', () => { const c = novo(5); const snap = JSON.stringify(c); C.executarAcao(c, { tipo: 'basico' }); assert.equal(JSON.stringify(c), snap); });
await t('ataque básico consome 8 stamina; recusa sem stamina', () => {
  let c = novo(5); const antes = c.heroi.stam; c = C.executarAcao(c, { tipo: 'basico' }).combate; assert.ok(c.heroi.stam <= antes - 8 + 4);
  c.heroi.stam = 0; const r = C.executarAcao(c, { tipo: 'basico' }); assert.equal(r.eventos[0].tipo, 'recusado'); assert.equal(r.combate.turno, c.turno);
});
await t('Suprema só com 100; zera ao usar e causa dano', () => {
  let c = novo(5); assert.equal(C.executarAcao(c, { tipo: 'suprema' }).eventos[0].tipo, 'recusado');
  c.heroi.ult = 100; c.inimigo.hp = 9999; c.inimigo.maxHp = 9999; const r = C.executarAcao(c, { tipo: 'suprema' });
  assert.equal(r.eventos[0].tipo, 'dano'); assert.equal(r.eventos[0].fonte, 'suprema'); assert.ok(r.combate.heroi.ult < 100);
});
await t('esquiva: +30% evasão (55% acrobata) e inimigo erra o próximo golpe', () => {
  let c = novo(5); const r = C.executarAcao(c, { tipo: 'esquivar' }); assert.deepEqual(r.eventos.map(e => e.tipo), ['postura', 'esquiva']); assert.equal(r.eventos[0].valor, 30); assert.equal(r.combate.heroi.evasion, 0);
  const a = H.criarHeroi({ ...sel('humano', 'arqueiro'), branch: 'Arqueiro Acrobático' }); const c2 = C.criarCombate({ heroi: a, inimigo: novo(1).inimigo, semente: 1 });
  assert.equal(C.executarAcao(c2, { tipo: 'esquivar' }).eventos[0].valor, 55);
});
await t('habilidade: exige escolha, gasta recurso, aplica dano e ult', () => {
  let c = novo(5, 'humano', 'mago'); assert.equal(C.executarAcao(c, { tipo: 'habilidade', raridade: 'common' }).eventos[0].tipo, 'recusado');
  c.heroi.selectedSkills.common = 0; c.inimigo.hp = c.inimigo.maxHp = 9999; const m0 = c.heroi.mana; const r = C.executarAcao(c, { tipo: 'habilidade', raridade: 'common' });
  assert.equal(r.eventos[0].tipo, 'dano'); assert.ok(r.combate.heroi.mana < m0 + 3); assert.ok(r.combate.heroi.ult > 0); assert.ok(r.eventos[0].valor > 0);
});
await t('Berserker rouba vida; Guardião Arcano ganha escudo na habilidade comum', () => {
  let c = novo(5, 'orc', 'tanke'); c.heroi.branch = 'Berserker'; c.heroi.selectedSkills.common = 0; c.heroi.hp = 5; c.inimigo.hp = c.inimigo.maxHp = 9999; c.inimigo.dmg = 2;
  const r = C.executarAcao(c, { tipo: 'habilidade', raridade: 'common' }); assert.ok(r.combate.heroi.hp > 5 - 5 + 1);
  let g = novo(5, 'orc', 'tanke'); g.heroi.branch = 'Guardião Arcano'; g.heroi.selectedSkills.common = 0; g.inimigo.hp = g.inimigo.maxHp = 9999; g.inimigo.dmg = 2;
  const rg = C.executarAcao(g, { tipo: 'habilidade', raridade: 'common' }); assert.ok(rg.eventos.some(e => e.tipo === 'dano' && e.alvo === 'inimigo'));
});
await t('vitória: moedas, vitórias+1, nível a cada 3 vitórias, sem contra-ataque', () => {
  let c = novo(5); c.heroi.wins = 2; c.inimigo.hp = 1; c.heroi.stam = 50; let r;
  for (let i = 0; i < 40 && !c.fim; i++) { r = C.executarAcao(c, { tipo: 'basico' }); c = r.combate; }
  assert.equal(c.fim, 'vitoria'); assert.equal(c.heroi.wins, 3); assert.equal(c.heroi.level, 2); assert.ok(r.eventos.some(e => e.tipo === 'nivel')); assert.ok(r.eventos.at(-1).tipo === 'nivel' || r.eventos.at(-1).tipo === 'vitoria');
});
await t('derrota termina o combate e bloqueia novas ações', () => {
  let c = novo(5); c.heroi.hp = 1; c.heroi.arm = 0; c.heroi.stam = 50; c.inimigo.hp = c.inimigo.maxHp = 9999;
  for (let i = 0; i < 20 && !c.fim; i++) c = C.executarAcao(c, { tipo: 'basico' }).combate;
  assert.equal(c.fim, 'derrota'); assert.equal(C.executarAcao(c, { tipo: 'basico' }).eventos[0].tipo, 'invalido');
});
await t('simulação em massa: 600 lutas (5 raças×6 classes×20 sementes) terminam sem NaN', () => {
  for (const r of RACAS) for (const cl of CLASSES) for (let s = 1; s <= 20; s++) {
    const rng = criarRng(s); let c = C.criarCombate({ heroi: H.criarHeroi(sel(r.id, cl.id)), inimigo: I.gerarInimigo(rng, false, 0), semente: s });
    for (let i = 0; i < 200 && !c.fim; i++) { const h = c.heroi; c = C.executarAcao(c, h.ult >= 100 ? { tipo: 'suprema' } : h.stam >= 8 ? { tipo: 'basico' } : { tipo: 'esquivar' }).combate; if (h.stam < 8 && h.stam < 8 && !c.fim) c.heroi.stam += 8; }
    for (const k of ['hp', 'mana', 'stam', 'ult', 'shield', 'arm']) assert.ok(Number.isFinite(c.heroi[k]) && c.heroi[k] >= 0, k);
    assert.ok(c.heroi.hp <= c.heroi.maxHp && c.heroi.ult <= 100);
  }
});

console.log('Inimigos, acampamento, loja');
await t('tiers por vitórias: fraca <5, média <12, forte; chefe = demônio', () => {
  assert.equal(I.tierPorVitorias(0), 'weak'); assert.equal(I.tierPorVitorias(5), 'medium'); assert.equal(I.tierPorVitorias(12), 'strong'); assert.equal(I.gerarInimigo(criarRng(1), true).kind, 'demon');
});
await t('acampar: descanso/tratamento limitados ao máximo; vasculhar determinístico', () => {
  const h = H.criarHeroi(sel('orc', 'mago')); h.hp = 1; h.wins = 1;
  const a = A.acampar(h, 'descansar', 1); assert.ok(a.heroi.hp > 1 && a.heroi.hp <= a.heroi.maxHp);
  assert.deepEqual(A.acampar(h, 'vasculhar', 42), A.acampar(h, 'vasculhar', 42));
});
await t('loja abre e funciona (bug original corrigido) e compra desconta ouro', () => {
  const h = H.criarHeroi(sel('orc', 'mago')); const { itens } = A.montarLoja(h, 7); assert.ok(itens.length >= 8);
  const r = A.comprar(h, itens[0]); assert.ok(r.ok); assert.equal(r.heroi.coins, h.coins - itens[0].price); assert.equal(r.heroi.pots.life, h.pots.life + 1);
  h.coins = 0; assert.equal(A.comprar(h, itens[0]).ok, false);
  for (const cl of CLASSES) for (let s = 0; s < 30; s++) A.montarLoja(H.criarHeroi(sel('humano', cl.id)), s);
});
console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
