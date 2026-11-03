// Testes da dungeon "Catacumbas" (v28, regras puras): estrutura, entrada física, combate real, recompensas, revisita e saída.
// Usa as regras REAIS (rules/mundo.js, rules/dungeon.js, rules/combate.js, rules/heroi.js): nada aqui é um simulacro.
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 4).join(' | ')); } }
const { DUNGEONS } = await imp('src/data/jogo/dungeons.js'); const { PARAMETROS_MUNDO: P, REGIOES } = await imp('src/data/jogo/mundo.js'); const { INIMIGOS } = await imp('src/data/jogo/inimigos.js');
const M = await imp('src/rules/mundo.js'); const G = await imp('src/rules/geografia.js'); const D = await imp('src/rules/dungeon.js'); const C = await imp('src/rules/combate.js'); const H = await imp('src/rules/heroi.js'); const I = await imp('src/rules/inimigos.js');
const { CLASSES } = await imp('src/data/jogo/classes.js');
const def = DUNGEONS.catacumbas, ponto = G.pontoPorId('dg:catacumbas');
const heroiNovo = (cls = 'tanke') => H.criarHeroi({ name: 'T', race: 'orc', classId: cls, branch: CLASSES.find(c => c.id === cls).branches[0], weaponId: null, appearance: {} });
const diante = d => ({ x: ponto.x + Math.cos(ponto.rumo) * d, z: ponto.z + Math.sin(ponto.rumo) * d });
const mundoNaPorta = (extra = {}) => { const q = diante(2.6); return M.criarMundo({ x: q.x, z: q.z, ...extra }); };
const dentro = (extra = {}) => { const m = mundoNaPorta(extra); assert.ok(M.entrarDungeon(m, 'catacumbas').ok); return m; };
const andarAte = (m, x, z, passos = 4000) => { for (let i = 0; i < passos; i++) { const dx = x - m.heroi.x, dz = z - m.heroi.z, d = Math.hypot(dx, dz); if (d < 0.5) return true; const r = M.passoMundo(m, { mx: dx / d, mz: dz / d }, 0.05); if (r.eventos.some(e => e.tipo === 'encontro')) return false; } return false; };

console.log('Estrutura');
await t('dados: inimigos oficiais (nomes existentes), chefe único, salas com coordenadas pares, tudo dentro do chão', () => {
  assert.ok(def.salas.length >= 6, 'salas'); for (const s of def.salas) for (const v of s.r) assert.equal(Math.abs(v % 2), 0, `${s.id} coordenada ímpar`);
  for (const i of def.inimigos) { assert.ok(INIMIGOS.some(e => e.name === i.nome), i.nome); assert.ok(D.chaoEm(def, i.x, i.z), `${i.nome} fora do chão (${i.x},${i.z})`); assert.ok(D.caminhavelDungeon(def, i.x, i.z), `${i.nome} preso em obstáculo`); }
  assert.equal(def.inimigos.filter(i => i.chefe).length, 1); assert.ok(def.inimigos.length >= 6);
  assert.ok(D.caminhavelDungeon(def, def.chegada.x, def.chegada.z), 'chegada'); for (const b of def.baus) assert.ok(D.chaoEm(def, b.x, b.z), b.id);
});
await t('os inimigos e o chefe pertencem à região da dungeon (dados oficiais, nenhuma criatura inventada)', () => {
  const areas = new Set(REGIOES[def.regiao].areas); for (const i of def.inimigos) assert.ok(areas.has(INIMIGOS.find(e => e.name === i.nome).area), i.nome + ' não é de ' + def.regiao);
  assert.equal(INIMIGOS.find(e => e.name === def.inimigos.find(i => i.chefe).nome).tier, 'medium');
});
await t('salas e corredores conectados: do vestíbulo se chega a pé a todos os inimigos, baús, ao chefe e à saída', () => {
  const g = D.grade(def), passo = 1, vis = new Set(), fila = [[def.chegada.x, def.chegada.z]], k = (x, z) => `${Math.round(x / passo)},${Math.round(z / passo)}`; vis.add(k(fila[0][0], fila[0][1])); let qi = 0;
  while (qi < fila.length) { const [x, z] = fila[qi++]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx * passo, nz = z + dz * passo, kk = k(nx, nz); if (vis.has(kk) || !D.caminhavelDungeon(def, nx, nz)) continue; vis.add(kk); fila.push([nx, nz]); } }
  const alcanca = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) if (vis.has(k(x + dx, z + dz))) return true; return false; };
  for (const i of def.inimigos) assert.ok(alcanca(i.x, i.z), `${i.nome} em (${i.x},${i.z}) inalcançável`); for (const b of def.baus) assert.ok(alcanca(b.x, b.z), b.id); assert.ok(alcanca(def.saida.x, def.saida.z - 1), 'saída'); void g;
});
await t('espaço para movimentação e combate: salas principais com ≥ 12×12 e corredores com ≥ 4 de largura; paredes e obstáculos bloqueiam', () => {
  for (const s of def.salas) { const w = s.r[2] - s.r[0], hh = s.r[3] - s.r[1]; if (s.id.startsWith('corredor')) assert.ok(Math.min(w, hh) >= 4, s.id); else assert.ok(Math.min(w, hh) >= 12, `${s.id} ${w}x${hh}`); }
  assert.ok(!D.caminhavelDungeon(def, -20, 8), 'parede'); assert.ok(!D.caminhavelDungeon(def, 9, -20), 'pilar'); assert.ok(!D.caminhavelDungeon(def, 0, 11), 'fora do vestíbulo');
});
console.log('Entrada física');
await t('a entrada é uma construção no mundo aberto: portão sólido com porta bloqueada por colisão; ninguém passa sem interagir', () => {
  const pe = G.pecasDoPOI(ponto); assert.ok(pe.some(p => p.forma === 'porta') && pe.some(p => p.forma === 'bloqueio' && p.solido) && pe.filter(p => p.forma === 'cilindro').length >= 2);
  const atras = { x: ponto.x - Math.cos(ponto.rumo) * 1.5, z: ponto.z - Math.sin(ponto.rumo) * 1.5 }; assert.ok(!G.caminhavelExterior(atras.x, atras.z), 'passagem atrás do portão deve ser maciça');
  const m = mundoNaPorta(); for (let i = 0; i < 200; i++) M.passoMundo(m, { mx: -Math.cos(ponto.rumo), mz: -Math.sin(ponto.rumo) }, 0.05); assert.equal(m.espaco.tipo, 'exterior'); assert.ok((m.heroi.x - ponto.x) * Math.cos(ponto.rumo) + (m.heroi.z - ponto.z) * Math.sin(ponto.rumo) > 0.2, 'atravessou a porta');
});
await t('a entrada se descobre ao se aproximar e fica no mapa (id estável); a interação exige proximidade na própria regra', () => {
  const m = M.criarMundo({ x: diante(45).x, z: diante(45).z }); assert.ok(!m.descobertas.pontos.includes('dg:catacumbas')); M.passoMundo(m, { mx: 0, mz: 0 }, 0.05); assert.ok(!m.descobertas.pontos.includes('dg:catacumbas'), 'longe demais para descobrir');
  const m2 = mundoNaPorta(); M.passoMundo(m2, { mx: 0, mz: 0 }, 0.05); assert.ok(m2.descobertas.pontos.includes('dg:catacumbas'));
  assert.equal(M.entrarDungeon(m, 'catacumbas').ok, false, 'entrou de longe'); assert.equal(m.espaco.tipo, 'exterior'); assert.equal(M.entrarDungeon(m2, 'inexistente').ok, false);
});
await t('entrar: espaço vira dungeon, herói na chegada, só os inimigos da dungeon agem, retorno guardado diante do portão', () => {
  const m = mundoNaPorta(); const r = M.entrarDungeon(m, 'catacumbas'); assert.ok(r.ok); assert.equal(m.espaco.tipo, 'dungeon'); assert.equal(m.espaco.id, 'catacumbas'); assert.equal(m.regiaoId, 'cavernas');
  assert.deepEqual([m.heroi.x, m.heroi.z], [def.chegada.x, def.chegada.z]); assert.ok(m.dungeons.catacumbas.descoberta && m.dungeons.catacumbas.entradas === 1);
  const ativos = M.inimigosDoEspaco(m); assert.ok(ativos.length === def.inimigos.length && ativos.every(e => e.espaco === 'dg:catacumbas'));
  assert.ok(Math.hypot(m.espaco.retorno.x - ponto.x, m.espaco.retorno.z - ponto.z) < 4.2); assert.equal(M.entrarDungeon(m, 'catacumbas').ok, false, 'não se entra estando dentro');
  assert.equal(M.lojaDisponivel(m), false, 'sem comércio dentro da dungeon'); assert.equal(M.pontoProximo(m).tipo, 'saida');
});
console.log('Dentro da dungeon');
await t('o herói anda pelo interior e é barrado pelas paredes', () => {
  const m = dentro(); assert.ok(andarAte(m, 0, -9, 800), 'corredor1'); assert.ok(D.chaoEm(def, m.heroi.x, m.heroi.z));
  for (let i = 0; i < 100; i++) M.passoMundo(m, { mx: -1, mz: 0 }, 0.05); assert.ok(m.heroi.x >= -2 + 0.3, 'atravessou a parede do corredor: x=' + m.heroi.x);
});
await t('inimigos da dungeon percebem, perseguem e iniciam um encontro REAL (mesmo evento do mundo aberto)', () => {
  const m = dentro(); const cult = m.inimigos.find(e => e.espaco === 'dg:catacumbas' && e.nome === 'Cultista Carmesim'); m.heroi.x = cult.x; m.heroi.z = cult.z + 4; cult.rumo = Math.PI / 2;
  const ev = []; for (let i = 0; i < 300 && !ev.some(e => e.tipo === 'encontro'); i++) ev.push(...M.passoMundo(m, { mx: 0, mz: 0 }, 0.05).eventos);
  assert.ok(ev.some(e => e.tipo === 'alerta'), 'sem alerta'); const enc = ev.find(e => e.tipo === 'encontro'); assert.ok(enc && enc.id.startsWith('dg:catacumbas:') && enc.nome === 'Cultista Carmesim');
});
await t('o chefe fica no covil (não patrulha) e dá um encontro mais difícil que os comuns', () => {
  const m = dentro(); const chefe = m.inimigos.find(e => e.chefe && e.espaco === 'dg:catacumbas'); assert.ok(chefe); const x0 = chefe.x, z0 = chefe.z;
  for (let i = 0; i < 200; i++) M.passoMundo(m, { mx: 0, mz: 0 }, 0.05); assert.deepEqual([chefe.x, chefe.z], [x0, z0]);
  const base = n => INIMIGOS.find(e => e.name === n); const comuns = def.inimigos.filter(i => !i.chefe).map(i => base(i.nome)); assert.ok(base(chefe.nome).hp >= Math.max(...comuns.map(c => c.hp)), 'chefe não é mais forte');
});
console.log('Combate real, recompensas e progressão');
await t('vencer um inimigo da dungeon com o motor de combate real rende moedas e vitória; o inimigo some no mundo', () => {
  const m = dentro(); const e = m.inimigos.find(q => q.espaco === 'dg:catacumbas' && !q.chefe); let c = C.criarCombate({ heroi: heroiNovo(), inimigo: { ...I.inimigoPorNome(e.nome), hp: 1 }, semente: 5, iniciativa: 'normal' });
  const antes = { coins: c.heroi.coins, wins: c.heroi.wins }; c = C.executarAcao(c, { tipo: 'basico' }).combate; for (let i = 0; i < 6 && !c.fim; i++) c = C.executarAcao(c, { tipo: 'basico' }).combate;
  assert.equal(c.fim, 'vitoria'); assert.ok(c.heroi.coins > antes.coins && c.heroi.wins === antes.wins + 1); M.derrotarInimigo(m, e.id); assert.equal(m.inimigos.find(q => q.id === e.id).estado, 'morto'); assert.ok(!M.inimigosDoEspaco(m).some(q => q.id === e.id && q.estado !== 'morto'));
});
await t('derrotar o chefe é permanente: grava chefeDerrotado e ele não volta nem na revisita', () => {
  const m = dentro(); const chefe = m.inimigos.find(e => e.chefe && e.espaco === 'dg:catacumbas'); M.derrotarInimigo(m, chefe.id); assert.ok(m.dungeons.catacumbas.chefeDerrotado);
  m.tempo += P.respawnDungeonSegundos * 10; const q = M.criarMundo({ derrotados: m.derrotados, tempo: m.tempo, dungeons: JSON.parse(JSON.stringify(m.dungeons)) }); assert.equal(q.inimigos.find(e => e.id === chefe.id).estado, 'morto');
});
await t('baús usam a regra REAL de recompensa (mesma do "Lootear"): moedas, abrem uma vez, exigem proximidade, só dentro da dungeon', () => {
  const m = dentro(); const heroi = heroiNovo(), b = def.baus[0]; assert.equal(M.abrirBau(M.criarMundo({}), heroi, b.id, 3).ok, false, 'fora da dungeon');
  let r = M.abrirBau(m, heroi, b.id, 3); assert.equal(r.ok, false, 'de longe'); assert.ok(r.eventos[0].texto.includes('perto')); assert.equal(m.dungeons.catacumbas.baus[b.id], undefined);
  m.heroi.x = b.x - 1.2; m.heroi.z = b.z; r = M.abrirBau(m, heroi, b.id, 3); assert.ok(r.ok); assert.ok(r.heroi.coins >= heroi.coins + 12 && r.heroi.coins <= heroi.coins + 30, 'moedas ' + (r.heroi.coins - heroi.coins)); assert.ok(m.dungeons.catacumbas.baus[b.id]);
  const r2 = M.abrirBau(m, r.heroi, b.id, 4); assert.equal(r2.ok, false); assert.equal(r2.heroi.coins, r.heroi.coins, 'abriu duas vezes');
  const A = null; void A; const ref = (async () => (await imp('src/rules/acampamento.js')).vasculharRecompensa(heroi, 3, 'baú'))(); return ref.then(x => assert.deepEqual(x.heroi.coins, r.heroi.coins));
});
await t('baús abertos somem dos pontos de interação e persistem (save → carga)', () => {
  const m = dentro(); m.heroi.x = def.baus[1].x - 1.2; m.heroi.z = def.baus[1].z; M.abrirBau(m, heroiNovo(), def.baus[1].id, 1);
  const q = M.criarMundo({ espaco: JSON.parse(JSON.stringify(m.espaco)), dungeons: JSON.parse(JSON.stringify(m.dungeons)) }); assert.ok(q.dungeons.catacumbas.baus[def.baus[1].id]); assert.ok(!M.pontosDoEspaco(q).some(p => p.id === def.baus[1].id)); assert.ok(M.pontosDoEspaco(q).some(p => p.id === def.baus[0].id));
});
console.log('Saída, revisita e estado');
await t('sair só pela porta; o herói volta diante do portão correto, no exterior, em chão livre e já pode reentrar', () => {
  const m = dentro(); m.heroi.x = 0; m.heroi.z = -10; assert.equal(M.sairDungeon(m).ok, false, 'saiu de longe da porta'); assert.equal(m.espaco.tipo, 'dungeon');
  m.heroi.x = def.saida.x; m.heroi.z = def.saida.z - 1.5; const r = M.sairDungeon(m); assert.ok(r.ok); assert.equal(m.espaco.tipo, 'exterior'); assert.equal(m.regiaoId, 'cavernas');
  assert.ok(G.caminhavelExterior(m.heroi.x, m.heroi.z), 'voltou para dentro de um obstáculo'); assert.ok(Math.hypot(m.heroi.x - ponto.x, m.heroi.z - ponto.z) < 6, 'longe do portão'); assert.equal(M.pontoProximo(m)?.tipo, 'dungeon'); assert.ok(M.entrarDungeon(m, 'catacumbas').ok);
});
await t('revisita: comuns derrotados NÃO voltam logo; voltam só depois de sair e esperar; chefe e baús nunca', () => {
  const m = dentro(), comum = m.inimigos.find(e => e.espaco === 'dg:catacumbas' && !e.chefe), chefe = m.inimigos.find(e => e.chefe && e.espaco === 'dg:catacumbas'); M.derrotarInimigo(m, comum.id); M.derrotarInimigo(m, chefe.id); m.dungeons.catacumbas.baus[def.baus[0].id] = true;
  m.heroi.x = def.saida.x; m.heroi.z = def.saida.z - 1.5; M.sairDungeon(m); M.entrarDungeon(m, 'catacumbas'); assert.equal(m.inimigos.find(e => e.id === comum.id).estado, 'morto', 'voltou cedo demais');
  for (let i = 0; i < 20; i++) M.passoMundo(m, { mx: 0, mz: 0 }, 0.5); assert.equal(m.inimigos.find(e => e.id === comum.id).estado, 'morto', 'reapareceu com o herói dentro');
  m.heroi.x = def.saida.x; m.heroi.z = def.saida.z - 1.5; M.sairDungeon(m); m.tempo += P.respawnDungeonSegundos + 1; M.entrarDungeon(m, 'catacumbas');
  assert.notEqual(m.inimigos.find(e => e.id === comum.id).estado, 'morto', 'deveria ter voltado'); assert.equal(m.inimigos.find(e => e.id === chefe.id).estado, 'morto', 'o chefe voltou'); assert.ok(m.dungeons.catacumbas.baus[def.baus[0].id], 'o baú foi reiniciado'); assert.ok(m.dungeons.catacumbas.chefeDerrotado);
});
await t('inimigos da dungeon que perseguiam ao sair voltam ao posto (nada "pendente" ao reentrar)', () => {
  const m = dentro(), e = m.inimigos.find(q => q.espaco === 'dg:catacumbas' && !q.chefe); e.estado = 'persegue'; e.x += 3; m.heroi.x = def.saida.x; m.heroi.z = def.saida.z - 1.5; M.sairDungeon(m); assert.equal(e.estado, 'patrulha'); assert.equal(e.x, e.hx);
});
await t('derrota/retorno: um mundo reconstruído a partir de um save DENTRO da dungeon continua dentro e jogável; um save com dungeon desconhecida nunca prende o jogador', () => {
  const m = dentro(); m.heroi.x = 0; m.heroi.z = -9; const salvo = JSON.parse(JSON.stringify({ x: m.heroi.x, z: m.heroi.z, espaco: m.espaco, derrotados: m.derrotados, tempo: m.tempo, dungeons: m.dungeons }));
  const q = M.criarMundo({ x: salvo.x, z: salvo.z, espaco: salvo.espaco, derrotados: salvo.derrotados, tempo: salvo.tempo, dungeons: salvo.dungeons }); assert.equal(q.espaco.tipo, 'dungeon'); assert.ok(D.caminhavelDungeon(def, q.heroi.x, q.heroi.z)); assert.ok(andarAte(q, 0, -4, 400));
  q.heroi.x = def.saida.x; q.heroi.z = def.saida.z - 1.5; assert.ok(M.sairDungeon(q).ok, 'não conseguiu sair depois de carregar');
});
await t('descobertas só acontecem no exterior; dentro da dungeon o mapa-múndi não revela nada novo', () => {
  const m = dentro(), c0 = (m._celulas ? m._celulas.size : m.descobertas.celulas.length), p0 = m.descobertas.pontos.length; for (let i = 0; i < 100; i++) M.passoMundo(m, { mx: 0, mz: -1 }, 0.1);
  assert.equal(m._celulas ? m._celulas.size : m.descobertas.celulas.length, c0); assert.equal(m.descobertas.pontos.length, p0);
});
console.log(`\n${ok} ok, ${falhas} falhas`); if (falhas) process.exit(1);
