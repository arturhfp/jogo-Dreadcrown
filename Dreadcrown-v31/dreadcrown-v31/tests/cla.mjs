// Testes dos clãs raciais (v30): dados, um clã por herói, perda para sempre, descontos de loja, aceitação das facções e save. Regras puras.
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict'; import fs from 'fs';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 4).join(' | ')); } }
const { CLAS, clanPorId, clasDaRaca } = await imp('src/data/jogo/clas.js'); const { FACCOES, faccaoPorId } = await imp('src/data/jogo/faccoes.js'); const { RACAS } = await imp('src/data/jogo/racas.js'); const { CLASSES } = await imp('src/data/jogo/classes.js');
const H = await imp('src/rules/heroi.js'); const K = await imp('src/rules/cla.js'); const A = await imp('src/rules/acampamento.js'); const Ac = await imp('src/rules/aceitacao.js'); const C = await imp('src/rules/campanha.js'); const Sv = await imp('src/state/save.js');
const sel = (race, cls = 'tanke', clan, extra = {}) => ({ name: 'T', race, classId: cls, branch: CLASSES.find(c => c.id === cls).branches[0], weaponId: null, appearance: {}, ...(clan !== undefined ? { clan } : {}), ...extra });

console.log('Dados');
await t('15 clãs, 3 por raça, ids únicos, aprovados, com facção relacionada existente e da mesma raça (ou facção mista)', () => {
  assert.equal(CLAS.length, 15); assert.equal(new Set(CLAS.map(c => c.id)).size, 15);
  for (const r of RACAS) assert.equal(clasDaRaca(r.id).length, 3, r.id);
  for (const c of CLAS) { assert.equal(c.aprovacao, 'aprovado'); assert.ok(c.nome && c.descricao && c.beneficio && c.condicao && c.especialidade, c.id); const f = faccaoPorId(c.faccaoRelacionada); assert.ok(f, c.id); assert.ok(f.racas.length === 0 || f.racas.includes(c.raca), `${c.id} ↔ ${f.id}`); assert.equal(c.lider, null); assert.equal(c.territorio, null); }
  assert.equal(CLAS.filter(c => FACCOES.some(f => f.nome === c.nome)).length, 0, 'clã com nome de facção');
});
await t('benefícios NÃO são bônus de atributo (nenhum efeito toca hp/mana/stam/pow/mag/dex/arm)', () => {
  for (const c of CLAS) { if (c.efeito) { assert.equal(c.efeito.tipo, 'desconto-loja'); assert.ok(c.efeito.pct > 0 && c.efeito.pct <= 25); } assert.ok(!('bonus' in c)); }
  assert.deepEqual(CLAS.filter(c => c.efeito).map(c => c.id).sort(), ['liga-do-lacre', 'maos-de-cobre', 'sete-martelos']);
});
console.log('Um clã por herói');
await t('criar herói: clã da própria raça entra; de outra raça ou desconhecido vira null; ADM não usa; sempre clansPerdidos = []', () => {
  for (const r of RACAS) for (const c of clasDaRaca(r.id)) { const h = H.criarHeroi(sel(r.id, 'mago', c.id)); assert.equal(h.clan, c.id); assert.deepEqual(h.clansPerdidos, []); }
  assert.equal(H.criarHeroi(sel('orc', 'tanke', 'casa-vael')).clan, null); assert.equal(H.criarHeroi(sel('orc', 'tanke', 'inexistente')).clan, null); assert.equal(H.criarHeroi(sel('orc')).clan, null);
  assert.equal(H.criarHeroi(sel('orc', 'tanke', 'muro-do-vale'), true).clan, null);
});
await t('o clã não altera nenhum atributo do herói (só origem faz isso)', () => {
  for (const r of RACAS) { const base = H.criarHeroi(sel(r.id)); for (const c of clasDaRaca(r.id)) { const h = H.criarHeroi(sel(r.id, 'tanke', c.id)); const { clan, ...resto } = h, { clan: _c, ...restoB } = base; assert.deepEqual(resto, restoB, c.id); } }
});
await t('entrar: só sem clã, da própria raça; escolher de outra raça ou já tendo clã é recusado', () => {
  const h = H.criarHeroi(sel('anao')); assert.equal(h.clan, null);
  assert.equal(K.entrarNoClan(h, null, 'casa-vael').ok, false); assert.equal(K.entrarNoClan(h, null, 'xxx').ok, false);
  const r = K.entrarNoClan(h, null, 'sete-martelos'); assert.ok(r.ok); assert.equal(r.heroi.clan, 'sete-martelos'); assert.equal(h.clan, null, 'mutou o original');
  assert.equal(K.entrarNoClan(r.heroi, null, 'veio-profundo').ok, false, 'dois clãs');
});
await t('expulso ou desertor perde o clã PARA SEMPRE, mesmo com reputação máxima', () => {
  for (const motivo of ['expulso', 'desertou']) {
    let h = H.criarHeroi(sel('orc', 'tanke', 'muro-do-vale')); const s = K.sairDoClan(h, motivo); assert.ok(s.ok); h = s.heroi; assert.equal(h.clan, null); assert.deepEqual(h.clansPerdidos, ['muro-do-vale']); assert.ok(/expulso|desertou/.test(s.eventos[0].texto));
    const camp = { reputacao: { 'hordas-cinzentas': 100 } }; assert.equal(K.entrarNoClan(h, camp, 'muro-do-vale').ok, false); assert.equal(K.podeEntrarNoClan(h, camp, 'muro-do-vale').motivo, 'perdido para sempre');
  }
  assert.equal(K.sairDoClan(H.criarHeroi(sel('orc')), 'expulso').ok, false, 'sem clã');
});
await t('depois de perder um clã, outro (da mesma raça) aceita quem ganhou a confiança dele (reputação Amigável com a facção relacionada)', () => {
  const h = K.sairDoClan(H.criarHeroi(sel('orc', 'tanke', 'muro-do-vale')), 'expulso').heroi;
  assert.equal(K.entrarNoClan(h, { reputacao: { 'hordas-cinzentas': 24 } }, 'rastro-de-lobo').ok, false); assert.equal(K.entrarNoClan(h, { reputacao: {} }, 'rastro-de-lobo').ok, false); assert.equal(K.entrarNoClan(h, null, 'rastro-de-lobo').ok, false);
  const r = K.entrarNoClan(h, { reputacao: { 'hordas-cinzentas': 25 } }, 'rastro-de-lobo'); assert.ok(r.ok); assert.equal(r.heroi.clan, 'rastro-de-lobo'); assert.deepEqual(r.heroi.clansPerdidos, ['muro-do-vale']);
  assert.equal(K.entrarNoClan(r.heroi, { reputacao: { 'hordas-cinzentas': 100 } }, 'muro-do-vale').ok, false, 'o clã perdido continua perdido');
});
console.log('Descontos de loja (benefício implementado)');
await t('sem clã (ou clã sem desconto) a loja é idêntica à da v29: mesmos itens e preços', () => {
  for (const clan of [undefined, 'casa-vael', 'guarda-alvorada']) for (let s = 1; s <= 30; s++) {
    const a = A.montarLoja(H.criarHeroi(sel('humano', 'mago', clan)), s), b = A.montarLoja(H.criarHeroi(sel('humano', 'mago')), s); assert.deepEqual(a.itens, b.itens); assert.ok(a.itens.every(i => !('precoBase' in i)));
  }
});
await t('Liga do Lacre: −10% só nas poções; estoque e sorteio idênticos aos de um herói sem clã', () => {
  for (let s = 1; s <= 40; s++) { const com = A.montarLoja(H.criarHeroi(sel('humano', 'arqueiro', 'liga-do-lacre')), s), sem = A.montarLoja(H.criarHeroi(sel('humano', 'arqueiro')), s);
    assert.equal(com.rng, sem.rng, 'o desconto não pode consumir sorteio'); assert.equal(com.itens.length, sem.itens.length);
    com.itens.forEach((i, k) => { const o = sem.itens[k]; assert.equal(i.name, o.name); assert.equal(i.kind, o.kind);
      if (i.kind === 'potion') { assert.equal(i.precoBase, o.price); assert.equal(i.price, Math.max(1, Math.round(o.price * 0.9))); assert.equal(i.descontoClan, 10); } else assert.equal(i.price, o.price, i.name); }); }
  const lj = A.montarLoja(H.criarHeroi(sel('humano', 'tanke', 'liga-do-lacre')), 5).itens; assert.deepEqual(lj.filter(i => i.kind === 'potion').map(i => i.price), [11, 11, 9]);
});
await t('Sete Martelos: −10% nos aprimoramentos de arma e armadura (só quem tem armadura vê o reforço); Mãos de Cobre: −5% em tudo', () => {
  const sm = A.montarLoja(H.criarHeroi(sel('anao', 'tanke', 'sete-martelos')), 7).itens, sem = A.montarLoja(H.criarHeroi(sel('anao', 'tanke')), 7).itens;
  assert.equal(sm.find(i => i.kind === 'weaponUpgrade').price, 22); assert.equal(sem.find(i => i.kind === 'weaponUpgrade').price, 24); assert.equal(sm.find(i => i.kind === 'potion').price, sem.find(i => i.kind === 'potion').price);
  const mc = A.montarLoja(H.criarHeroi(sel('tiefling', 'mago', 'maos-de-cobre')), 9).itens, base = A.montarLoja(H.criarHeroi(sel('tiefling', 'mago')), 9).itens;
  mc.forEach((i, k) => { assert.equal(i.price, Math.max(1, Math.round(base[k].price * 0.95)), i.name); assert.equal(i.descontoClan, 5); });
});
await t('comprar cobra o preço COM desconto e entrega exatamente o mesmo efeito do item sem desconto', () => {
  const he = H.criarHeroi(sel('humano', 'tanke', 'liga-do-lacre')), hs = H.criarHeroi(sel('humano', 'tanke'));
  const lojaC = A.montarLoja(he, 3).itens, lojaS = A.montarLoja(hs, 3).itens, pc = lojaC.findIndex(i => i.kind === 'potion' && i.pot === 'life');
  const rc = A.comprar({ ...he, coins: 100 }, lojaC[pc]), rs = A.comprar({ ...hs, coins: 100 }, lojaS[pc]);
  assert.ok(rc.ok && rs.ok); assert.equal(rc.heroi.coins, 100 - 11); assert.equal(rs.heroi.coins, 100 - 12); assert.equal(rc.heroi.pots.life, rs.heroi.pots.life); assert.equal(rc.heroi.pots.life, he.pots.life + 1);
  assert.equal(A.comprar({ ...he, coins: 10 }, lojaC[pc]).ok, false, '10 < 11'); assert.equal(A.comprar({ ...he, coins: 11 }, lojaC[pc]).ok, true);
  const ac = A.montarLoja(H.criarHeroi(sel('anao', 'tanke', 'sete-martelos')), 7).itens, iu = ac.findIndex(i => i.kind === 'armorUpgrade'), h2 = H.criarHeroi(sel('anao', 'tanke', 'sete-martelos')); if (iu >= 0 && h2.armorId) { const r = A.comprar({ ...h2, coins: 100 }, ac[iu]); assert.equal(r.heroi.coins, 100 - ac[iu].price); assert.equal(r.heroi.armorUpgrades[h2.armorId], 1); }
});
await t('a loja continua só em acampamento (regra da v28 intocada): o único `modal = \'loja\'` e a única chamada de montarLoja seguem em abrirLoja', () => {
  const app = fs.readFileSync(path.join(raiz, 'src/ui/jogo/app.js'), 'utf8'); assert.equal((app.match(/modal = 'loja'/g) || []).length, 1); assert.equal((app.match(/montarLoja\(/g) || []).length, 1);
  assert.ok(/lojaDisponivel\(estado\.mundo\)/.test(app.slice(app.lastIndexOf('const abrirLoja', app.indexOf("modal = 'loja'")), app.indexOf("modal = 'loja'"))));
});
console.log('Aceitação das facções');
await t('racistas rejeitam a raça-alvo e companheiros-alvo; aceitam as demais; raciais e mistas aceitam', () => {
  const c0 = C.criarCampanha(); const r = id => Ac.aceitaHeroi(id, { race: id2 }, c0); let id2;
  for (const [fac, race, esperado] of [['cruzada-da-pureza', 'orc', false], ['cruzada-da-pureza', 'tiefling', false], ['cruzada-da-pureza', 'humano', true], ['cruzada-da-pureza', 'elfo', true], ['folha-eterna', 'humano', false], ['folha-eterna', 'elfo', true], ['folha-eterna', 'orc', true], ['sangue-primeiro', 'humano', true], ['sangue-primeiro', 'orc', true], ['concordia', 'orc', true], ['cinco-cofres', 'tiefling', true], ['legiao', 'elfo', true]]) { id2 = race; assert.equal(r(fac).aceita, esperado, `${fac}/${race}`); }
  assert.equal(Ac.aceitaHeroi('cruzada-da-pureza', { race: 'humano' }, c0, ['orc']).aceita, false); assert.equal(Ac.aceitaHeroi('cruzada-da-pureza', { race: 'humano' }, c0, ['anao', 'elfo']).aceita, true); assert.equal(Ac.aceitaHeroi('xxx', { race: 'humano' }, c0).aceita, false);
});
await t('de história: Vigília × Culto conforme o lado seguido (Selo × Despertar); empate favorece o Selo; Legião provisória aceita sempre', () => {
  const comEixos = (selo, despertar) => ({ ...C.criarCampanha(), eixos: { misericordia: 0, crueldade: 0, selo, despertar } }), h = { race: 'humano' };
  assert.equal(Ac.aceitaHeroi('vigilia', h, comEixos(0, 0)).aceita, true); assert.equal(Ac.aceitaHeroi('culto', h, comEixos(0, 0)).aceita, false);
  assert.equal(Ac.aceitaHeroi('vigilia', h, comEixos(3, 1)).aceita, true); assert.equal(Ac.aceitaHeroi('culto', h, comEixos(3, 1)).aceita, false);
  assert.equal(Ac.aceitaHeroi('vigilia', h, comEixos(1, 3)).aceita, false); assert.equal(Ac.aceitaHeroi('culto', h, comEixos(1, 3)).aceita, true);
  for (const e of [comEixos(0, 0), comEixos(5, 0), comEixos(0, 5)]) assert.equal(Ac.aceitaHeroi('legiao', h, e).aceita, true);
});
await t('quem a facção não aceita nunca passa de Neutra, mesmo com reputação alta; hostil continua hostil; aceito mantém a faixa', () => {
  const camp = { ...C.criarCampanha(), reputacao: { ...C.criarCampanha().reputacao, 'cruzada-da-pureza': 80, culto: -50, concordia: 30 } };
  assert.equal(Ac.faixaEfetiva('cruzada-da-pureza', { race: 'orc' }, camp), 'neutra'); assert.equal(Ac.faixaEfetiva('cruzada-da-pureza', { race: 'humano' }, camp), 'aliada');
  assert.equal(Ac.faixaEfetiva('culto', { race: 'humano' }, camp), 'hostil'); assert.equal(Ac.faixaEfetiva('concordia', { race: 'orc' }, camp), 'amistosa');
  assert.equal(Ac.faixaEfetiva('cruzada-da-pureza', { race: 'orc' }, { ...camp, reputacao: { ...camp.reputacao, 'cruzada-da-pureza': -60 } }), 'hostil');
});
console.log('Save');
await t('heróis antigos (sem campo de clã) ficam sem clã e válidos; clã de outra raça/desconhecido é removido; perdido não volta pelo save', () => {
  const antigo = H.criarHeroi(sel('elfo')); delete antigo.clan; delete antigo.clansPerdidos; assert.equal(Sv.motivoHeroiInvalido(antigo), null);
  let { heroi } = Sv.sanitizarHeroi(antigo); assert.equal(heroi.clan ?? null, null); assert.deepEqual(heroi.clansPerdidos, []);
  for (const clan of ['casa-vael', 'fantasma']) { const r = Sv.sanitizarHeroi({ ...H.criarHeroi(sel('elfo')), clan }); assert.equal(r.heroi.clan, null); assert.ok(r.ajustes.some(a => /clã/.test(a))); }
  const burlado = Sv.sanitizarHeroi({ ...H.criarHeroi(sel('orc', 'tanke', 'muro-do-vale')), clansPerdidos: ['muro-do-vale', 'lixo'] }); assert.equal(burlado.heroi.clan, null); assert.deepEqual(burlado.heroi.clansPerdidos, ['muro-do-vale']);
  assert.equal(Sv.sanitizarHeroi(H.criarHeroi(sel('orc', 'tanke', 'rastro-de-lobo'))).heroi.clan, 'rastro-de-lobo');
});
await t('ida e volta pelo armazenamento mantém clã e clãs perdidos', () => {
  const mem = new Map(), arm = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
  const h = K.sairDoClan(H.criarHeroi(sel('tiefling', 'mago', 'lar-de-brasa')), 'expulso').heroi; assert.ok(Sv.salvar({ heroi: h, progresso: { campanha: C.criarCampanha() }, config: {} }, arm));
  const l = Sv.carregar(arm); assert.equal(l.heroi.clan, null); assert.deepEqual(l.heroi.clansPerdidos, ['lar-de-brasa']);
});
console.log(`\n${ok} ok, ${falhas} falhas`); if (falhas) process.exit(1);
