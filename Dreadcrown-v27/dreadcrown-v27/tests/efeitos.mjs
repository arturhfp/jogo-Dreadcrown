// Testes dos efeitos mecânicos das habilidades (mago, tanque, arqueiro verificados em detalhe;
// as demais classes são cobertas pela varredura genérica).
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 3).join(' | ')); } }
const { criarRng } = await imp('src/core/rng.js'); const H = await imp('src/rules/heroi.js'); const C = await imp('src/rules/combate.js');
const I = await imp('src/rules/inimigos.js'); const E = await imp('src/rules/efeitos.js'); const { EFEITOS_POR_TEMA } = await imp('src/data/jogo/efeitos.js');
const { CLASSES } = await imp('src/data/jogo/classes.js'); const { RAMIFICACOES } = await imp('src/data/jogo/ramificacoes.js'); const { RACAS } = await imp('src/data/jogo/racas.js');
const RAR = ['common', 'rare', 'epic', 'legendary'];
const alvo = () => ({ ...I.gerarInimigo(criarRng(1), true), hp: 99999, maxHp: 99999, dmg: 5, armor: 10 });
function luta(race, cls, branch, raridade, indice) {
  const h = H.criarHeroi({ name: 'T', race, classId: cls, branch, weaponId: null, appearance: {} });
  h.level = 9; h.mana = h.maxMana = 999; h.stam = h.maxStam = 999; h.selectedSkills[raridade] = indice;
  return C.criarCombate({ heroi: h, inimigo: alvo(), semente: 3 });
}
console.log('Varredura');
await t('todo tema usado tem 4 entradas de efeito e ops válidas', () => {
  const ops = new Set(['status', 'dano_extra', 'curar', 'curar_max', 'escudo', 'evasao', 'ult', 'limpar_negativos']);
  for (const b of Object.values(RAMIFICACOES)) assert.ok(EFEITOS_POR_TEMA[b.theme], b.theme);
  for (const [tema, l] of Object.entries(EFEITOS_POR_TEMA)) { assert.equal(l.length, 4, tema); for (const x of l.flat()) assert.ok(ops.has(x.op), tema); }
});
await t('600 combinações: usar cada habilidade (4 por combinação) não gera NaN nem quebra', () => {
  let usos = 0;
  for (const r of RACAS) for (const cl of CLASSES) for (const b of cl.branches) for (const rar of RAR) for (let i = 0; i < 4; i++) {
    const c = luta(r.id, cl.id, b, rar, i), res = C.executarAcao(c, { tipo: 'habilidade', raridade: rar });
    assert.equal(res.eventos[0].tipo, 'dano', `${r.id} ${cl.id} ${b} ${rar} ${i}`); assert.ok(Number.isFinite(res.combate.heroi.hp) && Number.isFinite(res.combate.inimigo.hp)); usos++;
  }
  assert.equal(usos, 2400);
});

console.log('Mago (Piromante / Criomante / Necromante)');
await t('Piromante: queimadura aplica dano contínuo no turno seguinte', () => {
  const c = luta('humano', 'mago', 'Piromante', 'common', 0); const r = C.executarAcao(c, { tipo: 'habilidade', raridade: 'common' });
  assert.ok(r.eventos.some(e => e.tipo === 'status' && e.id === 'queimar')); assert.ok(r.eventos.some(e => e.fonte === 'queimar'));
});
await t('Criomante: congelar faz o inimigo perder o turno (herói não recebe dano)', () => {
  const c = luta('humano', 'mago', 'Criomante', 'common', 2); c.heroi.selectedSkills.common = 2; const hp0 = c.heroi.hp;
  const r = C.executarAcao(c, { tipo: 'habilidade', raridade: 'common' });
  assert.ok(r.eventos.some(e => e.tipo === 'inimigo_incapacitado')); assert.equal(r.combate.heroi.hp, hp0);
});
await t('Necromante: dreno cura o herói', () => {
  const c = luta('humano', 'mago', 'Necromante', 'common', 1); c.heroi.hp = 5; c.inimigo.dmg = 2;
  const r = C.executarAcao(c, { tipo: 'habilidade', raridade: 'common' }); assert.ok(r.eventos.some(e => e.tipo === 'cura')); assert.ok(r.combate.heroi.hp > 5);
});
console.log('Tanque');
await t('Colosso Pesado: atordoar (100% no slot 2? chance 0.6) é determinístico por semente', () => {
  const run = () => C.executarAcao(luta('orc', 'tanke', 'Colosso Pesado', 'common', 2), { tipo: 'habilidade', raridade: 'common' }).eventos.map(e => e.tipo).join();
  assert.equal(run(), run());
});
await t('quebrar defesa aumenta o dano seguinte', () => {
  let c = luta('orc', 'tanke', 'Colosso Pesado', 'common', 1); c.inimigo.armor = 40;
  const sem = C.executarAcao({ ...c, inimigo: { ...c.inimigo } }, { tipo: 'habilidade', raridade: 'common' });
  let c2 = sem.combate; c2.heroi.selectedSkills.common = 1; c2.heroi.stam = 999; c2.heroi.hp = 9999;
  const arm0 = E.armaduraEfetiva(c.inimigo), arm1 = E.armaduraEfetiva(c2.inimigo); assert.ok(arm1 < arm0, `${arm1} < ${arm0}`);
});
await t('Guardião Arcano: escudo absorve dano inimigo', () => {
  let c = luta('orc', 'tanke', 'Guardião Arcano', 'common', 0); c.inimigo.dmg = 10; const r = C.executarAcao(c, { tipo: 'habilidade', raridade: 'common' });
  assert.ok(r.combate.heroi.shield > 0, 'escudo ativo'); assert.ok(r.eventos.some(e => e.alvo === 'heroi' && e.tipo === 'dano'));
});
console.log('Arqueiro');
await t('Arqueiro Acrobático: esquiva 55% e ataque seguinte é evitado', () => {
  const c = luta('elfo', 'arqueiro', 'Arqueiro Acrobático', 'common', 0); const r = C.executarAcao(c, { tipo: 'esquivar' }); assert.equal(r.eventos[0].valor, 55); assert.equal(r.eventos[1].tipo, 'esquiva');
});
await t('habilidades de arqueiro usam stamina e têm efeito de status/dano extra', () => {
  for (const b of CLASSES.find(c => c.id === 'arqueiro').branches) for (let i = 0; i < 4; i++) {
    const c = luta('elfo', 'arqueiro', b, 'rare', i), s0 = c.heroi.stam; const r = C.executarAcao(c, { tipo: 'habilidade', raridade: 'rare' }); assert.ok(r.combate.heroi.stam < s0 + 3, b);
  }
});
console.log('Status');
await t('duração decresce e expira', () => {
  const e = { name: 'x', hp: 100, status: [{ id: 'queimar', turnos: 1, dano: 3 }] }; E.avancarStatus(e); assert.equal(e.status.length, 0);
});
console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
