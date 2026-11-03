// Testes da fundação da lore (v29): facções, origens sorteáveis, reputação, selo, campanha e save v4. Regras puras, sem navegador.
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 4).join(' | ')); } }
const { FACCOES, faccaoPorId, CATEGORIAS_FACCAO, POSICOES_SELO } = await imp('src/data/jogo/faccoes.js'); const { ORIGENS, origemPorId, ATRIBUTOS_ORIGEM } = await imp('src/data/jogo/origens.js');
const { RACAS } = await imp('src/data/jogo/racas.js'); const { CLASSES } = await imp('src/data/jogo/classes.js');
const H = await imp('src/rules/heroi.js'); const O = await imp('src/rules/origem.js'); const R = await imp('src/rules/reputacao.js'); const S = await imp('src/rules/selo.js'); const C = await imp('src/rules/campanha.js'); const Sv = await imp('src/state/save.js');

// Tabela independente (copiada de docs/LORE.md, seção 8): o teste NÃO lê os bônus do próprio arquivo de dados.
const ESPERADO = {
  'aldeia-queimada': { hp: 6, arm: 1 }, 'orfao-do-culto': { mag: 1, mana: 4 }, 'ex-legionario': { pow: 1, arm: 1 }, 'aprendiz-das-forjas': { arm: 2 }, 'pupilo-do-arquivo': { mag: 1, dex: 1 },
  'sangue-de-cla': { pow: 1, stam: 4 }, 'marcado-pela-brasa': { mag: 1, dex: 1 }, 'filho-de-caravana': { stam: 4, dex: 1 }, 'tocado-pela-morte': { hp: 4, mana: 4 }, 'herdeiro-sem-nome': { mana: 2, mag: 1 }
};
const sel = (race, cls, br, origem) => ({ name: 'T', race, classId: cls, branch: br, weaponId: null, appearance: {}, ...(origem !== undefined ? { origem } : {}) });
const ATR = ['maxHp', 'maxMana', 'maxStam', 'arm', 'pow', 'mag', 'dex'], MAPA = { hp: 'maxHp', mana: 'maxMana', stam: 'maxStam', arm: 'arm', pow: 'pow', mag: 'mag', dex: 'dex' };

console.log('Dados');
await t('14 facções com a distribuição pedida: 5 raciais, 3 racistas, 3 mistas, 1 protege o selo, 1 destrói o selo, 1 poder do Louco', () => {
  assert.equal(FACCOES.length, 14); assert.equal(new Set(FACCOES.map(f => f.id)).size, 14);
  const cont = c => FACCOES.filter(f => f.categoria === c).length;
  assert.deepEqual([cont('racial'), cont('racista'), cont('mista'), cont('selo-protege'), cont('selo-destroi'), cont('poder-do-louco')], [5, 3, 3, 1, 1, 1]);
  for (const f of FACCOES) { assert.ok(CATEGORIAS_FACCAO.includes(f.categoria) && POSICOES_SELO.includes(f.posicaoSelo), f.id); assert.ok(f.nome && f.descricao, f.id); for (const r of [...f.racas, ...f.alvos]) assert.ok(RACAS.some(x => x.id === r), `${f.id}: raça ${r}`); }
});
await t('uma facção racial por raça; as mistas não têm raça; racistas têm alvos declarados (ou ainda a definir, dito no texto)', () => {
  for (const r of RACAS) assert.equal(FACCOES.filter(f => f.categoria === 'racial' && f.racas[0] === r.id).length, 1, r.id);
  for (const f of FACCOES.filter(x => x.categoria === 'mista')) assert.equal(f.racas.length, 0);
  assert.deepEqual(faccaoPorId('cruzada-da-pureza').alvos.sort(), ['orc', 'tiefling']); assert.deepEqual(faccaoPorId('folha-eterna').alvos, ['humano']);
  const sp = faccaoPorId('sangue-primeiro'); assert.ok(sp.alvos.length > 0 || /a definir/.test(sp.descricao), 'alvos nem declarados nem marcados "a definir"');
  assert.equal(faccaoPorId('culto').posicaoSelo, 'destruir'); assert.equal(faccaoPorId('vigilia').posicaoSelo, 'manter'); assert.equal(faccaoPorId('legiao').categoria, 'poder-do-louco');
});
await t('10 origens com bônus idênticos à tabela do LORE.md (só atributos já existentes) e reputações para facções reais', () => {
  assert.equal(ORIGENS.length, 10); assert.deepEqual(ORIGENS.map(o => o.id).sort(), Object.keys(ESPERADO).sort());
  for (const o of ORIGENS) { assert.deepEqual(o.bonus, ESPERADO[o.id], o.id); for (const k of Object.keys(o.bonus)) assert.ok(ATRIBUTOS_ORIGEM.includes(k)); for (const f of Object.keys(o.reputacao)) assert.ok(faccaoPorId(f), `${o.id}→${f}`); assert.ok(o.nome && o.historia); }
});
console.log('Sorteio');
await t('determinístico: mesma semente = mesma origem', () => { for (let s = 1; s < 200; s++) assert.equal(O.sortearOrigem(s).id, O.sortearOrigem(s).id); });
await t('distribuição aproximadamente uniforme em 20 000 sementes (cada origem entre 7% e 13%)', () => {
  const c = {}; for (let s = 1; s <= 20000; s++) { const id = O.sortearOrigem(Math.imul(s, 2654435761) >>> 0).id; c[id] = (c[id] || 0) + 1; }
  assert.equal(Object.keys(c).length, 10); for (const [id, n] of Object.entries(c)) assert.ok(n / 20000 > 0.07 && n / 20000 < 0.13, `${id}: ${(n / 200).toFixed(1)}%`);
});
await t('pesos configuráveis: peso 0 exclui; peso alto domina; pesos inválidos usam o padrão', () => {
  for (let s = 1; s < 500; s++) assert.notEqual(O.sortearOrigem(s, { 'herdeiro-sem-nome': 0 }).id, 'herdeiro-sem-nome');
  let n = 0; for (let s = 1; s <= 2000; s++) if (O.sortearOrigem(s * 7919, { 'sangue-de-cla': 91 }).id === 'sangue-de-cla') n++; assert.ok(n > 1700, 'domínio ' + n);
  assert.ok(ORIGENS.some(o => o.id === O.sortearOrigem(5, { x: NaN, 'orfao-do-culto': 'abc' }).id));
});
console.log('Bônus no herói');
await t('5 raças × 6 classes × 5 ramificações × 10 origens: o bônus soma EXATAMENTE os atributos listados e nada mais muda', () => {
  let casos = 0;
  for (const r of RACAS) for (const c of CLASSES) for (const br of c.branches) {
    const base = H.criarHeroi(sel(r.id, c.id, br));
    for (const o of ORIGENS) {
      const h = H.criarHeroi(sel(r.id, c.id, br, o.id)); casos++;
      for (const [k, kk] of Object.entries(MAPA)) assert.equal(h[kk] - base[kk], ESPERADO[o.id][k] ?? 0, `${r.id}/${c.id}/${br}/${o.id} ${kk}`);
      assert.equal(h.hp, h.maxHp); assert.equal(h.mana, h.maxMana); assert.equal(h.stam, h.maxStam); assert.equal(h.origem, o.id);
      const { hp, mana, stam, maxHp, maxMana, maxStam, arm, pow, mag, dex, origem, ...resto } = h, b = base; const { hp: _a, mana: _b, stam: _c, maxHp: _d, maxMana: _e, maxStam: _f, arm: _g, pow: _h, mag: _i, dex: _j, origem: _k, ...restoB } = b;
      assert.deepEqual(resto, restoB, 'algo além dos atributos mudou');
    }
  }
  assert.equal(casos, 1500);
});
await t('recalcular (equipar, subir de nível) mantém o bônus da origem; herói sem origem não muda', () => {
  const h = H.criarHeroi(sel('orc', 'tanke', 'Berserker', 'aldeia-queimada')), base = H.criarHeroi(sel('orc', 'tanke', 'Berserker'));
  const rh = H.recalcular(h), rb = H.recalcular(base); assert.equal(rh.maxHp - rb.maxHp, 6); assert.equal(rh.arm - rb.arm, 1); assert.equal(rh.maxHp, h.maxHp);
  const n = H.recalcular({ ...h, level: 5, wins: 12 }), nb = H.recalcular({ ...base, level: 5, wins: 12 }); assert.equal(n.maxHp - nb.maxHp, 6); assert.equal(n.arm - nb.arm, 1);
  assert.equal(rb.maxHp, base.maxHp); assert.equal(rb.origem, null);
});
await t('origem desconhecida não dá bônus; o modo ADM ignora a origem', () => {
  const a = H.criarHeroi(sel('humano', 'mago', 'Piromante', 'inexistente')), b = H.criarHeroi(sel('humano', 'mago', 'Piromante')); assert.equal(a.maxHp, b.maxHp); assert.equal(a.origem, null);
  const adm = H.criarHeroi(sel('humano', 'mago', 'Piromante', 'aldeia-queimada'), true), adm0 = H.criarHeroi(sel('humano', 'mago', 'Piromante'), true); assert.equal(adm.maxHp, adm0.maxHp); assert.equal(adm.origem, null);
});
console.log('Reputação, selo e campanha');
await t('reputação: limites, faixas, ajuste e dado inválido', () => {
  assert.equal(R.faixaReputacao(-100), 'hostil'); assert.equal(R.faixaReputacao(-25), 'hostil'); assert.equal(R.faixaReputacao(-24), 'neutra'); assert.equal(R.faixaReputacao(0), 'neutra'); assert.equal(R.faixaReputacao(24), 'neutra');
  assert.equal(R.faixaReputacao(25), 'amistosa'); assert.equal(R.faixaReputacao(59), 'amistosa'); assert.equal(R.faixaReputacao(60), 'aliada'); assert.equal(R.faixaReputacao(100), 'aliada');
  let rep = R.reputacaoNeutra(); assert.equal(Object.keys(rep).length, 14); rep = R.ajustarReputacao(rep, 'vigilia', 500).rep; assert.equal(rep.vigilia, 100); rep = R.ajustarReputacao(rep, 'vigilia', -900).rep; assert.equal(rep.vigilia, -100);
  const x = R.ajustarReputacao(rep, 'nao-existe', 5); assert.equal(x.ok, false); assert.deepEqual(x.rep, rep); assert.equal(R.ajustarReputacao(rep, 'culto', NaN).ok, false);
  assert.deepEqual(R.consultarReputacao({ culto: 70 }, 'culto'), { valor: 70, faixa: 'aliada' }); assert.deepEqual(R.consultarReputacao({}, 'culto'), { valor: 0, faixa: 'neutra' });
});
await t('selo: Firme→Rachado→Partido→Aberto, sem sair dos limites e sem aceitar estado inválido', () => {
  assert.deepEqual(S.ESTADOS_SELO, ['firme', 'rachado', 'partido', 'aberto']); let s = 'firme'; const vistos = [s];
  for (let i = 0; i < 5; i++) { s = S.enfraquecerSelo(s).selo; vistos.push(s); } assert.deepEqual(vistos, ['firme', 'rachado', 'partido', 'aberto', 'aberto', 'aberto']);
  assert.equal(S.restaurarSelo('aberto', 2).selo, 'rachado'); assert.equal(S.restaurarSelo('firme').selo, 'firme'); assert.equal(S.restaurarSelo('firme').mudou, false);
  assert.equal(S.moverSelo('quebrado', 1).ok, false); assert.equal(S.moverSelo('firme', 1.5).ok, false); assert.equal(S.moverSelo('firme', 2).selo, 'partido');
});
await t('campanha: estado inicial neutro; origem aplica reputação inicial e linhagem; eixos contam; dados corrompidos viram neutros', () => {
  const c0 = C.criarCampanha(); assert.equal(c0.selo, 'firme'); assert.equal(c0.linhagem, 'bloqueada'); assert.equal(c0.coroa, 'separada'); assert.ok(Object.values(c0.reputacao).every(v => v === 0)); assert.ok(Object.values(c0.eixos).every(v => v === 0));
  const a = C.aplicarOrigem(c0, 'aldeia-queimada'); assert.equal(a.reputacao.vigilia, 25); assert.equal(a.reputacao['cruzada-da-pureza'], -25); assert.equal(R.faixaReputacao(a.reputacao.vigilia), 'amistosa'); assert.equal(a.linhagem, 'bloqueada'); assert.equal(c0.reputacao.vigilia, 0, 'mutou o original');
  assert.equal(C.aplicarOrigem(c0, 'herdeiro-sem-nome').linhagem, 'pista'); assert.deepEqual(C.aplicarOrigem(c0, 'xxx'), c0);
  for (const o of ORIGENS) { const r = C.aplicarOrigem(c0, o.id).reputacao; for (const [f, v] of Object.entries(o.reputacao)) assert.equal(r[f], v * 25, o.id); }
  const e = C.registrarEixo(c0, 'misericordia', 2); assert.equal(e.campanha.eixos.misericordia, 2); assert.equal(C.registrarEixo(c0, 'inventado').ok, false); assert.equal(C.registrarEixo(c0, 'selo', -1).ok, false);
  for (const lixo of [null, undefined, 5, 'x', [], { reputacao: 'x', selo: 'quebrado', eixos: { selo: -3, despertar: 'a' }, linhagem: 9, coroa: {} }]) assert.deepEqual(C.sanearCampanha(lixo), c0);
  const parcial = C.sanearCampanha({ selo: 'partido', reputacao: { culto: 40, fantasma: 99 }, eixos: { crueldade: 3 }, linhagem: 'descoberta' }); assert.equal(parcial.selo, 'partido'); assert.equal(parcial.reputacao.culto, 40); assert.ok(!('fantasma' in parcial.reputacao)); assert.equal(parcial.eixos.crueldade, 3);
});
console.log('Save v4');
await t('versão 4; migração 3 → 4 não toca no herói, cria campanha neutra e mantém o mundo', () => {
  assert.equal(Sv.VERSAO_SAVE, 4);
  const heroi = H.criarHeroi(sel('elfo', 'arqueiro', 'Atirador de Elite')); const v3 = { versao: 3, heroi, progresso: { rng: 5, mundo: { x: 10, z: 20 }, vitorias: 3 }, config: { esquivaAtiva: false } };
  const m = Sv.migrar(JSON.parse(JSON.stringify(v3))); assert.equal(m.versao, 4); assert.deepEqual(m.heroi, heroi); assert.equal(m.heroi.origem, null); assert.deepEqual(m.progresso.campanha, C.criarCampanha()); assert.deepEqual(m.progresso.mundo, { x: 10, z: 20 }); assert.equal(m.progresso.rng, 5);
  assert.equal(Sv.motivoHeroiInvalido(m.heroi), null);
});
await t('herói de save antigo (sem origem) continua válido e SEM bônus retroativo', () => {
  const antigo = H.criarHeroi(sel('anao', 'paladino', 'Templário Solene')); delete antigo.origem; assert.equal(Sv.motivoHeroiInvalido(antigo), null);
  const { heroi } = Sv.sanitizarHeroi(antigo); assert.equal(heroi.maxHp, antigo.maxHp); assert.equal(H.recalcular(heroi).maxHp, antigo.maxHp);
});
await t('migração completa a partir de qualquer versão antiga (0,1,2,3) chega à v4 com campanha válida', () => {
  for (const v of [undefined, 0, 1, 2, 3]) { const m = Sv.migrar({ ...(v === undefined ? {} : { versao: v }), heroi: null, progresso: { vitorias: 0 }, config: {} }); assert.equal(m.versao, 4); assert.deepEqual(C.sanearCampanha(m.progresso.campanha), m.progresso.campanha); }
  assert.throws(() => Sv.migrar({ versao: 5 }), /futura/);
});
await t('ida e volta pelo armazenamento: origem e campanha (reputação, selo, eixos, linhagem) persistem', () => {
  const mem = new Map(), arm = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: k => mem.delete(k) };
  const heroi = H.criarHeroi(sel('tiefling', 'mago', 'Piromante', 'herdeiro-sem-nome')); let camp = C.aplicarOrigem(C.criarCampanha(), heroi.origem); camp = C.registrarEixo(camp, 'crueldade', 3).campanha; camp = { ...camp, selo: S.enfraquecerSelo(camp.selo).selo };
  assert.ok(Sv.salvar({ heroi, progresso: { campanha: camp }, config: {} }, arm)); const l = Sv.carregar(arm);
  assert.equal(l.heroi.origem, 'herdeiro-sem-nome'); assert.deepEqual(C.sanearCampanha(l.progresso.campanha), camp); assert.equal(l.progresso.campanha.selo, 'rachado'); assert.equal(l.progresso.campanha.linhagem, 'pista');
});
await t('save com origem inválida: a origem é removida (sem bônus) e o aviso aparece; save com campos desconhecidos não trava', () => {
  const heroi = { ...H.criarHeroi(sel('humano', 'tanke', 'Berserker')), origem: 'fantasma', campoNovo: 1 }; assert.equal(Sv.motivoHeroiInvalido(heroi), null);
  const { heroi: x, ajustes } = Sv.sanitizarHeroi(heroi); assert.equal(x.origem, null); assert.ok(ajustes.some(a => /origem/.test(a)));
  assert.equal(Sv.sanitizarHeroi({ ...heroi, origem: 'aldeia-queimada' }).heroi.origem, 'aldeia-queimada');
});
console.log(`\n${ok} ok, ${falhas} falhas`); if (falhas) process.exit(1);
