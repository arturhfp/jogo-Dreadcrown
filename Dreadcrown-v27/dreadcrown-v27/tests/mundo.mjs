// Testes do mundo aberto (regras puras) e da iniciativa/esquiva ativa no combate.
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 3).join(' | ')); } }
const { REGIOES, PARAMETROS_MUNDO: P } = await imp('src/data/jogo/mundo.js'); const { INIMIGOS } = await imp('src/data/jogo/inimigos.js');
const M = await imp('src/rules/mundo.js'); const C = await imp('src/rules/combate.js'); const H = await imp('src/rules/heroi.js'); const I = await imp('src/rules/inimigos.js');
const { CLASSES } = await imp('src/data/jogo/classes.js');

console.log('Dados');
await t('todo inimigo vive em exatamente uma região; portais são recíprocos e válidos', () => {
  const usadas = {}; for (const [id, r] of Object.entries(REGIOES)) { for (const a of [...r.areas, ...(r.chefe ? [r.chefe.area] : [])]) usadas[a] = (usadas[a] || 0) + 1; for (const p of r.portais) { assert.ok(REGIOES[p.para], p.para); assert.ok(REGIOES[p.para].portais.some(q => q.para === id), `${id}↔${p.para}`); } }
  for (const e of INIMIGOS) assert.equal(usadas[e.area], 1, e.area);
});
await t('todas as regiões são alcançáveis a partir do vale e o requisito de vitórias não decresce no caminho principal', () => {
  const vistos = new Set(['vale']), fila = ['vale']; while (fila.length) { const r = REGIOES[fila.shift()]; for (const p of r.portais) if (!vistos.has(p.para)) { vistos.add(p.para); fila.push(p.para); } }
  assert.equal(vistos.size, Object.keys(REGIOES).length); assert.equal(REGIOES.vale.vitoriasMin, 0);
});
console.log('Terreno e geração');
await t('altura é determinística, finita, plana no acampamento/portais e alta nas bordas', () => {
  for (const [id, r] of Object.entries(REGIOES)) {
    assert.equal(M.alturaEm(id, 3.3, -4.4), M.alturaEm(id, 3.3, -4.4));
    assert.ok(Math.abs(M.alturaEm(id, r.inicio[0], r.inicio[1])) < 0.2, id + ' início');
    if (r.acampamento) assert.ok(Math.abs(M.alturaEm(id, ...r.acampamento)) < 0.2, id + ' acampamento');
    for (const p of r.portais) assert.ok(Math.abs(M.alturaEm(id, ...p.pos) - M.alturaEm(id, p.pos[0], p.pos[1])) < 1e-9);
    assert.ok(M.alturaEm(id, r.tamanho, r.tamanho) > 8, id + ' borda');
  }
});
await t('inimigos: determinístico, na quantidade, afastados entre si e das zonas, só de áreas da região', () => {
  for (const [id, r] of Object.entries(REGIOES)) {
    const a = M.gerarInimigosDaRegiao(id), b = M.gerarInimigosDaRegiao(id); assert.deepEqual(a, b);
    assert.ok(a.length >= r.quantidade - 1, `${id} gerou ${a.length}`);
    const nomes = new Set([...r.areas, ...(r.chefe ? [r.chefe.area] : [])].map(x => INIMIGOS.find(e => e.area === x).name));
    for (const e of a) { assert.ok(nomes.has(e.nome)); assert.ok(Math.abs(e.x) < r.tamanho && Math.abs(e.z) < r.tamanho); }
    const comuns = a.filter(e => !e.chefe); for (let i = 0; i < comuns.length; i++) for (let j = i + 1; j < comuns.length; j++) assert.ok(Math.hypot(comuns[i].x - comuns[j].x, comuns[i].z - comuns[j].z) >= 9);
    for (const p of M.pontosDaRegiao(id)) for (const e of comuns) assert.ok(Math.hypot(e.x - p.x, e.z - p.z) >= 13, `${id} perto de ${p.tipo}`);
  }
  assert.ok(M.gerarInimigosDaRegiao('fenda').some(e => e.chefe && e.nome === 'Demônio de Chifres'));
});
console.log('Percepção e iniciativa');
const inim = (over = {}) => ({ id: 'x', nome: 'Goblin Saqueador', tier: 'weak', x: 0, z: 0, hx: 0, hz: 0, rumo: 0, estado: 'patrulha', alvoX: 0, alvoZ: 0, espera: 5, alerta: 0, perdido: 0, chefe: false, ...over });
await t('percepção: vê à frente, não vê atrás à distância, furtivo reduz alcance, vê colado mesmo atrás', () => {
  const e = inim(); assert.ok(M.percebe(e, { x: 8, z: 0 })); assert.ok(!M.percebe(e, { x: -8, z: 0 })); assert.ok(M.percebe(e, { x: -1.5, z: 0 }));
  assert.ok(!M.percebe(e, { x: 11, z: 0 })); assert.ok(!M.percebe(e, { x: 8, z: 0, furtivo: true })); assert.ok(M.percebe(e, { x: 4, z: 0, furtivo: true }));
});
await t('iniciativa: ataque por trás = emboscada; de frente = normal; inimigo ciente que alcança = avistado', () => {
  const costas = { x: -1.5, z: 0 }, frente = { x: 1.5, z: 0 };
  assert.equal(M.iniciativaDoContato(inim(), costas, true), 'emboscada'); assert.equal(M.iniciativaDoContato(inim(), frente, true), 'normal');
  assert.equal(M.iniciativaDoContato(inim({ estado: 'persegue' }), frente, false), 'avistado'); assert.equal(M.iniciativaDoContato(inim({ estado: 'persegue' }), frente, true), 'normal');
  assert.equal(M.iniciativaDoContato(inim(), frente, false), 'normal');
});
console.log('Simulação');
const mundoComUm = (e, heroi = {}) => { const m = M.criarMundo({ regiaoId: 'vale', x: 0, z: 0 }); m.inimigos = [inim(e)]; Object.assign(m.heroi, heroi); return m; };
await t('herói anda na velocidade certa, furtivo mais devagar, e não sai do mapa', () => {
  let m = mundoComUm({ x: 50, z: 50, hx: 50, hz: 50 }); M.passoMundo(m, { mx: 1, mz: 0 }, 1); assert.ok(Math.abs(m.heroi.x - P.velocidade) < 1e-9);
  m = mundoComUm({ x: 50, z: 50, hx: 50, hz: 50 }); M.passoMundo(m, { mx: 1, mz: 0, furtivo: true }, 1); assert.ok(Math.abs(m.heroi.x - P.velocidadeFurtivo) < 1e-9);
  m = mundoComUm({ x: 50, z: 50, hx: 50, hz: 50 }, { x: REGIOES.vale.tamanho - 2 }); for (let i = 0; i < 20; i++) M.passoMundo(m, { mx: 1, mz: 0 }, 0.5); assert.ok(M.dentroDoMapa('vale', m.heroi.x, m.heroi.z));
});
await t('inimigo que vê o herói alerta, persegue e o alcança → encontro "avistado"', () => {
  const m = mundoComUm({ x: 6, z: 0, hx: 6, hz: 0, rumo: Math.PI }); const ev = []; for (let i = 0; i < 300 && !ev.some(e => e.tipo === 'encontro'); i++) ev.push(...M.passoMundo(m, { mx: 0, mz: 0 }, 0.05).eventos);
  assert.ok(ev.some(e => e.tipo === 'alerta')); assert.equal(ev.find(e => e.tipo === 'encontro').iniciativa, 'avistado');
});
await t('herói em corrida escapa de perseguidor; este desiste e volta', () => {
  const m = mundoComUm({ x: 6, z: 0, hx: 6, hz: 0, rumo: Math.PI }); const ev = [];
  for (let i = 0; i < 1200; i++) { const r = M.passoMundo(m, { mx: -1, mz: 0 }, 0.05); ev.push(...r.eventos); if (ev.some(e => e.tipo === 'encontro')) break; if (m.heroi.x < -REGIOES.vale.tamanho + 3) m.heroi.x = -REGIOES.vale.tamanho + 3; }
  assert.ok(!ev.some(e => e.tipo === 'encontro'), 'não deveria alcançar');
});
await t('aproximação furtiva por trás + ataque = encontro "emboscada"', () => {
  const m = mundoComUm({ x: 0, z: 0, rumo: 0, espera: 99 }, { x: -8, z: 0 }); let ev = [];
  for (let i = 0; i < 200 && Math.hypot(m.heroi.x - 0, m.heroi.z) > 2.2; i++) ev.push(...M.passoMundo(m, { mx: 1, mz: 0, furtivo: true }, 0.05).eventos);
  assert.ok(!ev.some(e => e.tipo === 'alerta' || e.tipo === 'encontro'), 'não deveria ser notado');
  const r = M.passoMundo(m, { mx: 0, mz: 0, ataque: true }, 0.05).eventos.find(e => e.tipo === 'encontro'); assert.equal(r.iniciativa, 'emboscada');
});
await t('derrotado some, persiste ao trocar de região e reaparece após o respawn', () => {
  let m = M.criarMundo({ regiaoId: 'vale' }); const id = m.inimigos[0].id; M.derrotarInimigo(m, id); assert.equal(m.inimigos[0].estado, 'morto');
  m = M.trocarRegiao(m, 'mortas'); m = M.trocarRegiao(m, 'vale'); assert.equal(m.inimigos.find(e => e.id === id).estado, 'morto');
  m.heroi.x = 0; m.heroi.z = 0; for (let i = 0; i < 4; i++) M.passoMundo(m, { mx: 0, mz: 0 }, P.respawnSegundos / 3); assert.notEqual(m.inimigos.find(e => e.id === id).estado, 'morto');
});
await t('pontos: proximidade detectada; portal respeita vitórias; chegada fica ao lado do portal de volta', () => {
  const m = M.criarMundo({ regiaoId: 'vale', x: REGIOES.vale.portais[0].pos[0], z: 0 }); const p = M.pontoProximo(m); assert.equal(p.tipo, 'portal'); assert.equal(p.para, 'mortas');
  assert.ok(!M.portalLiberado({ wins: 4 }, 'cavernas')); assert.ok(M.portalLiberado({ wins: 5 }, 'cavernas'));
  const c = M.chegada('mortas', 'vale'); assert.ok(Math.hypot(c.x - REGIOES.mortas.portais[0].pos[0], c.z - REGIOES.mortas.portais[0].pos[1]) < 10);
});
await t('simulação é determinística (mesmo estado + mesma entrada = mesmo resultado)', () => {
  const rodar = () => { const m = M.criarMundo({ regiaoId: 'cavernas', semente: 9 }); for (let i = 0; i < 400; i++) M.passoMundo(m, { mx: Math.cos(i / 20), mz: Math.sin(i / 20) }, 0.05); return JSON.stringify(m); };
  assert.equal(rodar(), rodar());
});

console.log('Combate: iniciativa e esquiva ativa');
const alvo = (o = {}) => ({ ...I.inimigoPorNome('Goblin Saqueador'), hp: 9999, maxHp: 9999, ...o });
const novo = (cls, iniciativa, semente = 4) => C.criarCombate({ heroi: { ...H.criarHeroi({ name: 'T', race: 'orc', classId: cls, branch: CLASSES.find(c => c.id === cls).branches[0], weaponId: null, appearance: {} }), stam: 99, maxStam: 99 }, inimigo: alvo(), semente, iniciativa });
await t('emboscada: inimigo perde o 1º turno e leva golpe extra; só vale uma vez', () => {
  const r = C.executarAcao(novo('tanke', 'emboscada'), { tipo: 'basico' }); const tipos = r.eventos.map(e => e.tipo + ':' + (e.fonte || ''));
  assert.ok(r.eventos.some(e => e.tipo === 'iniciativa' && e.iniciativa === 'emboscada')); assert.ok(r.eventos.some(e => e.tipo === 'inimigo_incapacitado'), tipos.join()); assert.ok(r.combate.heroi.hp === r.combate.heroi.maxHp);
  const r2 = C.executarAcao(r.combate, { tipo: 'basico' }); assert.ok(!r2.eventos.some(e => e.tipo === 'iniciativa'));
});
await t('avistado: inimigo ataca antes da ação; normal não', () => {
  const a = C.executarAcao(novo('tanke', 'avistado'), { tipo: 'basico' }); assert.equal(a.eventos[0].iniciativa, 'avistado'); assert.equal(a.eventos[1].tipo, 'dano'); assert.equal(a.eventos[1].alvo, 'heroi');
  const n = C.executarAcao(novo('tanke', 'normal'), { tipo: 'basico' }); assert.ok(!n.eventos.some(e => e.tipo === 'iniciativa'));
});
await t('ação recusada não consome a iniciativa', () => {
  const c = novo('tanke', 'avistado'); c.heroi.stam = 0; const r = C.executarAcao(c, { tipo: 'esquivar' }); assert.equal(r.eventos[0].tipo, 'recusado'); assert.equal(r.combate.iniciativaUsada, false);
});
await t('esquiva ativa: perfeita < boa < falha em dano; perfeita dá Suprema; sem defesa = falha', () => {
  const dano = def => { const c = novo('tanke', 'normal', 21); c.heroi.shield = 0; const r = C.executarAcao(c, { tipo: 'basico', defesa: def }); return { d: r.eventos.filter(e => e.tipo === 'dano' && e.alvo === 'heroi').reduce((s, e) => s + e.valor, 0), ult: r.combate.heroi.ult }; };
  const p = dano('perfeita'), b = dano('boa'), f = dano('falha'), s = dano(undefined);
  assert.ok(p.d <= b.d && b.d <= f.d && p.d < f.d, JSON.stringify([p, b, f])); assert.equal(f.d, s.d); assert.ok(p.ult > f.ult);
});
await t('determinismo com iniciativa e defesa', () => {
  const rodar = () => { let c = novo('assassino', 'emboscada', 8), l = []; for (let i = 0; i < 6; i++) { const r = C.executarAcao(c, { tipo: 'basico', defesa: ['perfeita', 'boa', 'falha'][i % 3] }); c = r.combate; l.push(...r.eventos.map(e => e.texto)); } return l; };
  assert.deepEqual(rodar(), rodar());
});
console.log(`\n${ok} ok, ${falhas} falhas`); if (falhas) process.exit(1);
