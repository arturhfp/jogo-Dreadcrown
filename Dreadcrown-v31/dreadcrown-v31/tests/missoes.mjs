// Testes das missões (v31): dados, alvos reais do mundo, decisões, reputação/Selo/eixos, pistas, clã, preço por reputação e save. Regras puras.
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 4).join('\n     ')); } }
const { MISSOES, missaoPorId } = await imp('src/data/jogo/missoes.js'); const { faccaoPorId } = await imp('src/data/jogo/faccoes.js');
const R = await imp('src/rules/missoes.js'); const C = await imp('src/rules/campanha.js'); const M = await imp('src/rules/mundo.js'); const G = await imp('src/rules/geografia.js');
const H = await imp('src/rules/heroi.js'); const { CLASSES } = await imp('src/data/jogo/classes.js'); const Rep = await imp('src/rules/reputacao.js'); const Sv = await imp('src/state/save.js');
const heroi = (race = 'humano', clan) => H.criarHeroi({ name: 'T', race, classId: 'tanke', branch: CLASSES.find(c => c.id === 'tanke').branches[0], weaponId: null, appearance: {}, clan });
const hr = heroi(); const camp0 = C.criarCampanha();

console.log('Dados');
await t('ids únicos; facção existe; alvo é um inimigo REAL do mundo; raridade e nível definidos', () => {
  assert.equal(new Set(MISSOES.map(m => m.id)).size, MISSOES.length); const todos = new Set(M.criarMundo({}).inimigos.map(e => e.id));
  for (const m of MISSOES) { assert.ok(faccaoPorId(m.facao), m.id); assert.ok(todos.has(m.alvo.inimigo), `${m.id}: alvo ${m.alvo.inimigo} não existe`); assert.ok(['common', 'rare', 'epic', 'legendary'].includes(m.raridade)); assert.ok(m.nivel >= 1); assert.ok(m.alvo.nome && m.alvo.historia && m.texto && m.titulo); }
});
await t('cada decisão oferecida tem efeitos; pontos revelados existem no mapa; reputação só em facções existentes; Recrutar só em comandantes', () => {
  for (const m of MISSOES) { for (const o of m.opcoes) assert.ok(m.efeitos[o], `${m.id}/${o}`); if (!m.opcoes.length) assert.ok(m.efeitos.matar); for (const e of Object.values(m.efeitos)) for (const f of Object.keys(e.rep || {})) assert.ok(faccaoPorId(f), f); for (const p of m.revela?.pontos ?? []) assert.ok(G.pontoPorId(p), p); if (m.opcoes.includes('recrutar')) assert.equal(m.degrau, 'comandante'); }
});
await t('a Rede tem 5 missões encadeadas (Culto + Legião rival); 2 de facção e 1 de clã', () => {
  const rede = MISSOES.filter(m => m.grupo === 'rede'); assert.equal(rede.length, 5); assert.deepEqual(rede.map(m => m.facao), ['culto', 'culto', 'culto', 'culto', 'legiao']);
  rede.slice(1).forEach((m, i) => assert.equal(m.requer.missao, rede[i].id)); assert.equal(MISSOES.filter(m => m.grupo === 'faccao').length, 2); assert.equal(MISSOES.filter(m => m.grupo === 'cla').length, 1);
});
console.log('Disponibilidade');
await t('só a missão 1 da Rede está disponível no início; a 2 só depois da 1; missão de clã só para o clã', () => {
  assert.ok(R.missoesDisponiveis(camp0, hr).every(m => m.id !== 'rede-2')); assert.ok(R.missoesDisponiveis(camp0, hr).some(m => m.id === 'rede-1'));
  assert.ok(!R.missoesDisponiveis(camp0, hr).some(m => m.id === 'cla-rastro-1')); assert.ok(R.missoesDisponiveis(camp0, heroi('orc', 'rastro-de-lobo')).some(m => m.id === 'cla-rastro-1'));
  assert.equal(R.missaoDoInimigo(camp0, hr, 'vale:3').id, 'rede-1'); assert.equal(R.missaoDoInimigo(camp0, hr, 'vale:0'), null);
});
console.log('Decisões');
await t('matar: reputação, eixos, moedas, pista; é imutável; só vale uma vez', () => {
  const r = R.decidir(camp0, hr, 'rede-1', 'matar'); assert.ok(r.ok); assert.equal(r.campanha.reputacao.culto, -10); assert.equal(r.campanha.reputacao.vigilia, 8); assert.equal(r.campanha.eixos.crueldade, 1); assert.equal(r.heroi.coins, hr.coins + 15);
  assert.deepEqual(r.mudou.revela, ['camp:mortas']); assert.equal(camp0.reputacao.culto, 0); assert.equal(camp0.missoes['rede-1'], undefined); assert.equal(R.decidir(r.campanha, r.heroi, 'rede-1', 'matar').ok, false); assert.ok(R.missoesDisponiveis(r.campanha, hr).some(m => m.id === 'rede-2'));
});
await t('poupar leva a misericórdia; recrutar só onde existe; decisão inválida e missão bloqueada são recusadas', () => {
  const r = R.decidir(camp0, hr, 'rede-1', 'poupar'); assert.equal(r.campanha.eixos.misericordia, 1); assert.equal(r.campanha.eixos.crueldade, 0);
  assert.equal(R.decidir(camp0, hr, 'rede-1', 'recrutar').ok, false); assert.equal(R.decidir(camp0, hr, 'rede-4', 'matar').ok, false); assert.equal(R.decidir(camp0, hr, 'nao-existe', 'matar').ok, false);
});
await t('contrato sem opções conclui como "matar"', () => { const r = R.decidir(camp0, hr, 'fac-andarilhos-1', 'qualquer'); assert.ok(r.ok); assert.equal(r.decisao, 'matar'); assert.equal(r.campanha.reputacao.andarilhos, 12); });
await t('percorrer a Rede inteira: reputação sempre em [-100, 100], Selo nos limites, linhagem só avança, 5 missões concluídas', () => {
  let c = camp0, h = hr, ult = 'bloqueada'; const ord = ['bloqueada', 'pista', 'descoberta'];
  for (const m of MISSOES.filter(x => x.grupo === 'rede')) { const r = R.decidir(c, h, m.id, m.opcoes.at(-1)); assert.ok(r.ok, m.id); c = r.campanha; h = r.heroi; assert.ok(ord.indexOf(c.linhagem) >= ord.indexOf(ult)); ult = c.linhagem; }
  assert.equal(Object.keys(c.missoes).length, 5); assert.equal(c.linhagem, 'descoberta'); for (const v of Object.values(c.reputacao)) assert.ok(v >= -100 && v <= 100); assert.ok(['firme', 'rachado', 'partido', 'aberto'].includes(c.selo)); assert.ok(c.selo !== 'firme', 'recrutar/poupar enfraquece o Selo');
});
await t('recrutar o Capitão da Legião aproxima a Legião; matar a afasta (os caminhos são diferentes)', () => {
  const base = { ...camp0, missoes: Object.fromEntries(['rede-1', 'rede-2', 'rede-3', 'rede-4'].map(i => [i, { estado: 'concluida', decisao: 'matar' }])) };
  assert.ok(R.decidir(base, hr, 'rede-5', 'recrutar').campanha.reputacao.legiao > 0); assert.ok(R.decidir(base, hr, 'rede-5', 'matar').campanha.reputacao.legiao < 0);
});
console.log('Reputação econômica');
const itens = [{ kind: 'potion', price: 100 }, { kind: 'gear', price: 50 }];
await t('Cinco Cofres: aliada −15%, amistosa −10%, neutra 0, hostil +10%; nunca zera o preço; precoBase guarda o original', () => {
  const com = v => R.aplicarReputacaoLoja(hr, { ...camp0, reputacao: { ...camp0.reputacao, 'cinco-cofres': v } }, itens);
  assert.deepEqual(com(70).map(i => i.price), [85, 43]); assert.deepEqual(com(30).map(i => i.price), [90, 45]); assert.deepEqual(com(0), itens); assert.deepEqual(com(-30).map(i => i.price), [110, 55]); assert.equal(com(70)[0].precoBase, 100);
  assert.ok(R.aplicarReputacaoLoja(hr, { ...camp0, reputacao: { ...camp0.reputacao, 'cinco-cofres': 70 } }, [{ kind: 'x', price: 1 }])[0].price >= 1);
});
await t('combina com o desconto de clã sem perder o preço original', () => {
  const clanItens = [{ kind: 'potion', price: 100, precoBase: 100, descontoClan: 10 }]; const r = R.aplicarReputacaoLoja(hr, { ...camp0, reputacao: { ...camp0.reputacao, 'cinco-cofres': 70 } }, clanItens); assert.equal(r[0].price, 85); assert.equal(r[0].precoBase, 100);
});
console.log('Save e compatibilidade');
await t('sanearCampanha: sem missões = {}; ids desconhecidos e lixo são descartados; decisão inválida vira a 1ª opção; round-trip JSON preserva', () => {
  assert.deepEqual(C.sanearCampanha({ ...camp0, missoes: undefined }).missoes, {}); const s = C.sanearCampanha({ ...camp0, missoes: { 'rede-1': { estado: 'concluida', decisao: 'voar' }, 'x': { estado: 'concluida' }, 'rede-2': { estado: 'ativa' } } });
  assert.deepEqual(s.missoes, { 'rede-1': { estado: 'concluida', decisao: 'matar' } }); const r = R.decidir(camp0, hr, 'rede-1', 'poupar').campanha; assert.deepEqual(C.sanearCampanha(JSON.parse(JSON.stringify(r))), r);
});
await t('save v4 antigo (sem missões) continua válido e ganha missoes = {}', () => { const raw = { versao: 4, heroi: hr, progresso: { campanha: { ...camp0, missoes: undefined } }, config: {} }; const s = Sv.migrar(raw); assert.equal(s.versao, 4); assert.deepEqual(C.sanearCampanha(s.progresso?.campanha).missoes, {}); });
await t('a regra da loja continua valendo (só em acampamento) e o mundo não ganhou inimigos', () => { const w = M.criarMundo({}); assert.equal(w.inimigos.length, 43); assert.equal(M.lojaDisponivel(w), false); });
console.log(`\n${ok} ok, ${falhas} falhas`); process.exit(falhas ? 1 : 0);
