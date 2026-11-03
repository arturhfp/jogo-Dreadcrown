// Testes das passivas de classe (rules/classes.js + integração no combate).
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 3).join(' | ')); } }
const { criarRng } = await imp('src/core/rng.js'); const H = await imp('src/rules/heroi.js'); const C = await imp('src/rules/combate.js');
const K = await imp('src/rules/classes.js'); const { KIT_CLASSES } = await imp('src/data/jogo/classes-kit.js'); const { CLASSES } = await imp('src/data/jogo/classes.js');
const sel = (cls, i = 0) => ({ name: 'T', race: 'humano', classId: cls, branch: CLASSES.find(c => c.id === cls).branches[i], weaponId: null, appearance: {} });
const alvo = (over = {}) => ({ name: 'Dummy', hp: 9999, maxHp: 9999, dmg: 10, armor: 6, reward: [1, 1], status: [], ...over });
const combate = (cls, semente = 1, over = {}) => C.criarCombate({ heroi: { ...H.criarHeroi(sel(cls)), ...over }, inimigo: alvo(), semente });
const livre = c => { c.heroi.stam = c.heroi.maxStam = 999; c.heroi.mana = c.heroi.maxMana = 999; return c; };

console.log('Kit');
await t('toda classe tem passiva com nome e descrição', () => { for (const c of CLASSES) { const k = KIT_CLASSES[c.id]; assert.ok(k && k.nome && k.descricao.length > 20, c.id); } });
await t('somente classes com crítico consomem sorteio ao ajustar dano', () => {
  for (const c of CLASSES) { const r = criarRng(5), antes = r.estado; const h = H.criarHeroi(sel(c.id)); K.ajustarDanoCausado(h, alvo(), 50, r); assert.equal(r.estado !== antes, !!KIT_CLASSES[c.id].crit, c.id); }
});
console.log('Por classe');
await t('Tanque: recebe menos dano que sem a passiva e ganha escudo ao usar habilidade', () => {
  const h = H.criarHeroi(sel('tanke')); assert.ok(K.reduzirRecebido(h, 100) <= 85); assert.equal(K.reduzirRecebido({ ...h, classId: 'mago', shield: 0 }, 100), 100);
  assert.ok(K.escudoDaHabilidade(h) >= 1);
});
await t('Mago: +3 Mana no fim do turno e penetra armadura em magias', () => {
  const h = H.criarHeroi(sel('mago')); h.mana = 0; const ev = K.fimDeTurno(h); assert.equal(h.mana, 3); assert.equal(ev[0].recurso, 'mana');
  assert.equal(K.penetracao(h, 'habilidade', true), 0.25); assert.equal(K.penetracao(h, 'basico', false), 0);
});
await t('Paladino: escudo por habilidade e redução só com escudo ativo', () => {
  const h = H.criarHeroi(sel('paladino')); assert.ok(K.escudoDaHabilidade(h) >= 4);
  assert.equal(K.reduzirRecebido({ ...h, shield: 0 }, 100), 100); assert.equal(K.reduzirRecebido({ ...h, shield: 5 }, 100), 80);
});
await t('Clérigo: regenera 4% da vida por turno e cura +25%', () => {
  const h = H.criarHeroi(sel('clerigo')); h.hp = 1; const ev = K.fimDeTurno(h); assert.ok(h.hp > 1 && ev[0].tipo === 'cura'); assert.equal(K.multiplicadorCura(h), 1.25);
  const cheio = H.criarHeroi(sel('clerigo')); assert.equal(K.fimDeTurno(cheio).length, 0, 'sem cura se já está cheio');
});
await t('Assassino: bônus contra incapacitado e contra vida cheia', () => {
  const h = H.criarHeroi(sel('assassino')); const sem = { next: () => 0 }; void sem;
  const rngSemCrit = { proximo: () => 0.99 };
  const base = K.ajustarDanoCausado(h, alvo({ hp: 10, maxHp: 100 }), 100, rngSemCrit).dano; assert.equal(base, 100);
  assert.equal(K.ajustarDanoCausado(h, alvo({ hp: 10, maxHp: 100, status: [{ id: 'atordoar', turnos: 1 }] }), 100, rngSemCrit).dano, 130);
  assert.equal(K.ajustarDanoCausado(h, alvo(), 100, rngSemCrit).dano, 125);
  const crit = K.ajustarDanoCausado(h, alvo({ hp: 10, maxHp: 100 }), 100, { proximo: () => 0 }); assert.equal(crit.dano, 170); assert.ok(crit.critico);
});
await t('Arqueiro: +3 no D20, penetração e marca em acerto básico', () => {
  const h = H.criarHeroi(sel('arqueiro')); assert.equal(K.bonusD20(h), 3); assert.equal(K.penetracao(h, 'basico'), 0.15);
  assert.ok(K.marcarNoBasico(h, { proximo: () => 0 })); assert.ok(!K.marcarNoBasico(h, { proximo: () => 0.9 }));
});
console.log('Integração');
await t('arqueiro marca o alvo em algum acerto básico; mago recupera Mana no combate', () => {
  let c = livre(combate('arqueiro', 3)), marcou = false;
  for (let i = 0; i < 25 && !marcou; i++) { const r = C.executarAcao(c, { tipo: 'basico' }); c = livre(r.combate); marcou = (c.inimigo.status || []).some(s => s.id === 'marcar'); }
  assert.ok(marcou);
  let m = combate('mago', 3); m.heroi.mana = 0; m.heroi.stam = 999; const r = C.executarAcao(m, { tipo: 'esquivar' }); assert.ok(r.combate.heroi.mana >= 3);
});
await t('clérigo regenera vida durante o combate', () => {
  const cl = combate('clerigo', 4); cl.heroi.hp = 1; cl.heroi.stam = 999; const r = C.executarAcao(cl, { tipo: 'esquivar' }); assert.ok(r.combate.heroi.hp > 1 || r.combate.heroi.hp === 0);
});
await t('assassino acerta críticos em algum ataque; determinismo preservado', () => {
  const rodar = () => { let c = livre(combate('assassino', 11)), log = []; for (let i = 0; i < 30; i++) { const r = C.executarAcao(c, { tipo: 'basico' }); c = livre(r.combate); log.push(...r.eventos.map(e => e.texto)); } return log; };
  const a = rodar(); assert.deepEqual(a, rodar()); assert.ok(a.some(x => /CRÍTICO/.test(x)));
});
await t('6 classes × 5 ramificações × 2 ações executam sem erro', () => {
  for (const cl of CLASSES) for (let b = 0; b < cl.branches.length; b++) for (const acao of [{ tipo: 'basico' }, { tipo: 'esquivar' }]) {
    const c = livre(C.criarCombate({ heroi: H.criarHeroi(sel(cl.id, b)), inimigo: alvo(), semente: 2 })); const r = C.executarAcao(c, acao); assert.ok(r.eventos.length > 0);
  }
});
console.log(`\n${ok} ok, ${falhas} falhas`); if (falhas) process.exit(1);
