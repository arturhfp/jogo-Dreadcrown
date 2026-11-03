// Testes de regressão da v27 (estabilização): validação de save, derrota sem soft-lock, loja e melhorias, respawn do mundo.
// Rodam em Node, sem navegador. Cada teste corresponde a um problema corrigido (ver docs/AUDITORIA-v27.md).
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 4).join(' | ')); } }

const Save = await imp('src/state/save.js'); const H = await imp('src/rules/heroi.js'); const C = await imp('src/rules/combate.js');
const A = await imp('src/rules/acampamento.js'); const M = await imp('src/rules/mundo.js'); const I = await imp('src/rules/inimigos.js');
const { PARAMETROS_MUNDO: P } = await imp('src/data/jogo/mundo.js'); const { criarRng } = await imp('src/core/rng.js');
const sel = (extra = {}) => ({ name: 'Grok', race: 'orc', classId: 'tanke', branch: 'Berserker', weaponId: undefined, appearance: {}, ...extra });
const novoHeroi = (extra, admin = false) => ({ ...H.criarHeroi(sel(extra), admin) });

console.log('Save: validação e sanitização');
await t('herói recém-criado (normal e ADM) é válido; revive nunca é necessário', () => {
  for (const adm of [false, true]) { const h = novoHeroi({}, adm); assert.equal(Save.motivoHeroiInvalido(h), null); assert.deepEqual(Save.sanitizarHeroi(h).ajustes, []); }
});
await t('save com vida 0 (soft-lock da v26) é recuperado com 50% da vida máxima', () => {
  const h = novoHeroi(); h.hp = 0; const r = Save.sanitizarHeroi(h);
  assert.equal(r.heroi.hp, Math.round(h.maxHp * 0.5)); assert.ok(r.ajustes.some(a => /vida 0/.test(a))); assert.equal(h.hp, 0, 'não muta a entrada');
});
await t('campos de inventário ausentes são restaurados; valores acima do máximo são limitados', () => {
  const h = novoHeroi(); delete h.pots; delete h.inventoryGear; delete h.selectedSkills; h.mana = h.maxMana + 50; h.stam = -4;
  const r = Save.sanitizarHeroi(h).heroi; assert.deepEqual(r.pots, { life: 0, mana: 0, stamina: 0 }); assert.deepEqual(r.inventoryGear, []);
  assert.equal(r.mana, r.maxMana); assert.equal(r.stam, 0); assert.ok('common' in r.selectedSkills && r.selectedSkills.common === null);
});
await t('herói inválido é rejeitado com motivo (raça/classe/subclasse/NaN/ausente)', () => {
  const base = novoHeroi();
  assert.match(Save.motivoHeroiInvalido(null), /ausente/); assert.match(Save.motivoHeroiInvalido({ ...base, race: 'elfo-sombrio' }), /raça/);
  assert.match(Save.motivoHeroiInvalido({ ...base, classId: 'bardo' }), /classe/); assert.match(Save.motivoHeroiInvalido({ ...base, branch: 'Nada' }), /subclasse/);
  assert.match(Save.motivoHeroiInvalido({ ...base, hp: NaN }), /hp/); assert.match(Save.motivoHeroiInvalido({ ...base, maxHp: 0 }), /vida máxima|maxHp/);
  assert.match(Save.motivoHeroiInvalido({ ...base, coins: undefined }), /coins/);
});
await t('um herói sanitizado joga: a ação é aceita (não responde "O combate já terminou")', () => {
  const h = novoHeroi(); h.hp = 0; const c = C.criarCombate({ heroi: Save.sanitizarHeroi(h).heroi, inimigo: I.gerarInimigo(criarRng(3), false, 0), semente: 9 });
  const r = C.executarAcao(c, { tipo: 'basico' }); assert.notEqual(r.eventos[0].tipo, 'invalido');
  // e a prova do problema original: com vida 0 nenhuma ação é aceita
  const morto = C.criarCombate({ heroi: h, inimigo: I.gerarInimigo(criarRng(3), false, 0), semente: 9 }); assert.equal(C.executarAcao(morto, { tipo: 'basico' }).eventos[0].tipo, 'invalido');
});

console.log('Loja e melhorias (efeito real)');
await t('quem não tem armadura base não vê (nem paga) "Reforçar armadura"', () => {
  const h = novoHeroi(); assert.equal(h.armorId, null);
  for (let s = 1; s <= 30; s++) assert.ok(!A.montarLoja(h, s).itens.some(i => i.kind === 'armorUpgrade'));
  const r = A.comprar({ ...h, coins: 100 }, { name: 'Reforçar armadura', price: 22, kind: 'armorUpgrade' }); assert.equal(r.ok, false); assert.equal(r.heroi.coins, 100);
});
await t('com armadura base, "Reforçar armadura" aparece e aumenta a ARM em +1 de verdade', () => {
  const h = novoHeroi({}, true); assert.ok(h.armorId);
  assert.ok(A.montarLoja(h, 5).itens.some(i => i.kind === 'armorUpgrade'));
  const antes = H.recalcular(h).arm, r = A.comprar({ ...h, coins: 100 }, { name: 'Reforçar armadura', price: 22, kind: 'armorUpgrade' });
  assert.ok(r.ok); assert.equal(r.heroi.arm, antes + 1); assert.equal(r.heroi.coins, 78);
});
await t('"Melhorar arma equipada" (+1 dano) aumenta o dano do ataque básico de verdade', () => {
  const base = novoHeroi(); const comUp = { ...base, weaponUpgrades: { [base.weaponId]: 12 } };
  let soma0 = 0, soma1 = 0, acertos = 0;
  for (let semente = 1; semente <= 40; semente++) {
    const ini = I.gerarInimigo(criarRng(7), false, 0);
    const r0 = C.executarAcao(C.criarCombate({ heroi: base, inimigo: ini, semente }), { tipo: 'basico' }), r1 = C.executarAcao(C.criarCombate({ heroi: comUp, inimigo: ini, semente }), { tipo: 'basico' });
    const d = r => r.eventos.find(e => e.tipo === 'dano' && e.fonte === 'basico')?.valor ?? 0; const a = d(r0), b = d(r1);
    if (a > 0) { acertos++; assert.ok(b > a, `semente ${semente}: ${a} vs ${b}`); } soma0 += a; soma1 += b;
  }
  assert.ok(acertos > 5 && soma1 > soma0);
});
await t('sem melhorias o dano é idêntico ao da v26 (nenhum balanceamento alterado para quem não comprou)', () => {
  const h = novoHeroi(), ini = I.gerarInimigo(criarRng(7), false, 0);
  const a = C.executarAcao(C.criarCombate({ heroi: h, inimigo: ini, semente: 11 }), { tipo: 'basico' }), b = C.executarAcao(C.criarCombate({ heroi: { ...h, weaponUpgrades: {} }, inimigo: ini, semente: 11 }), { tipo: 'basico' });
  assert.deepEqual(a.eventos, b.eventos);
});

console.log('Mundo');
await t('respawn: derrotados voltam exatamente após PARAMETROS_MUNDO.respawnSegundos (uma única fonte da constante)', () => {
  const est = M.criarMundo({ regiaoId: 'vale', semente: 1 }); const id = est.inimigos[0].id;
  est.derrotados[id] = 100; est.tempo = 100 + P.respawnSegundos - 1; M.aplicarDerrotados(est); assert.equal(est.inimigos[0].estado, 'morto');
  est.inimigos[0].estado = 'patrulha'; est.tempo = 100 + P.respawnSegundos + 1; M.aplicarDerrotados(est); assert.equal(est.inimigos[0].estado, 'patrulha');
});

console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
