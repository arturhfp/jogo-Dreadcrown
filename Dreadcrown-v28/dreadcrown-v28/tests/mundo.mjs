// Testes do mundo aberto CONTÍNUO (v28, regras puras) e da iniciativa/esquiva ativa no combate.
// Os testes de percepção, iniciativa e combate são os da v27 (a lógica não mudou); os de dados, terreno e simulação foram reescritos
// para a geografia contínua: sem portais, sem troca de região, coordenadas globais.
import path from 'path'; import { fileURLToPath } from 'url'; import assert from 'assert/strict';
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const imp = p => import(path.join(raiz, p));
let ok = 0, falhas = 0;
async function t(n, f) { try { await f(); ok++; console.log('  ✓', n); } catch (e) { falhas++; console.log('  ✗', n, '\n    ', e.message.split('\n').slice(0, 3).join(' | ')); } }
const { REGIOES, PARAMETROS_MUNDO: P, ESTRADAS } = await imp('src/data/jogo/mundo.js'); const { INIMIGOS } = await imp('src/data/jogo/inimigos.js');
const M = await imp('src/rules/mundo.js'); const G = await imp('src/rules/geografia.js'); const C = await imp('src/rules/combate.js'); const H = await imp('src/rules/heroi.js'); const I = await imp('src/rules/inimigos.js');
const { CLASSES } = await imp('src/data/jogo/classes.js');
const IDS = Object.keys(REGIOES);

console.log('Dados');
await t('todo inimigo vive em exatamente uma região (áreas únicas); nenhuma região tem portais', () => {
  const usadas = {}; for (const r of Object.values(REGIOES)) { assert.ok(!('portais' in r), 'região ainda tem portais'); for (const a of [...r.areas, ...(r.chefe ? [r.chefe.area] : [])]) usadas[a] = (usadas[a] || 0) + 1; }
  for (const e of INIMIGOS) assert.equal(usadas[e.area], 1, e.area);
});
await t('portais e troca de região não existem mais (API removida; nenhum ponto do mundo é um portal)', () => {
  assert.equal(M.trocarRegiao, undefined); assert.equal(M.portalLiberado, undefined); assert.equal(M.chegada, undefined);
  assert.ok(G.PONTOS.length > 0 && G.PONTOS.every(p => ['acampamento', 'dungeon', 'marco'].includes(p.tipo)), 'tipos de ponto: ' + [...new Set(G.PONTOS.map(p => p.tipo))]);
});
await t('os 6 territórios preservam nome, tier, semente, relevo, áreas, quantidade e visual da v27', () => {
  const v27 = { vale: ['Vale Quebrado', 'weak', 1101, 3.2, 6], mortas: ['Terras Mortas', 'weak', 2202, 2.4, 6], cavernas: ['Cavernas Profundas', 'medium', 3303, 4.5, 7], picos: ['Picos Ventosos', 'medium', 4404, 9, 6], fortaleza: ['Fortaleza Rubra', 'strong', 5505, 3.6, 6], fenda: ['Fenda Infernal', 'strong', 6606, 5.5, 4] };
  assert.deepEqual([...IDS].sort(), Object.keys(v27).sort());
  for (const [id, [nome, tier, sem, rel, q]] of Object.entries(v27)) { const r = REGIOES[id]; assert.deepEqual([r.nome, r.tier, r.semente, r.relevo, r.quantidade], [nome, tier, sem, rel, q], id); assert.ok(r.visual.ceu && r.visual.chao.length === 3 && r.visual.props.length >= 3 && r.areas.length >= 1, id + ' visual'); }
});
console.log('Geografia contínua');
await t('todos os pontos importantes são alcançáveis A PÉ a partir do início, sem portais (busca em grade sobre a colisão real)', () => {
  const L = G.LIMITES, passo = 3, cols = Math.ceil((L.maxX - L.minX) / passo), rows = Math.ceil((L.maxZ - L.minZ) / passo), vis = new Uint8Array(cols * rows), ini = G.posicaoInicial();
  const idx = (x, z) => { const cx = Math.floor((x - L.minX) / passo), cz = Math.floor((z - L.minZ) / passo); return cx < 0 || cz < 0 || cx >= cols || cz >= rows ? -1 : cz * cols + cx; };
  const fila = [[ini.x, ini.z]]; vis[idx(ini.x, ini.z)] = 1; let qi = 0;
  while (qi < fila.length) { const [x, z] = fila[qi++]; for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx * passo, nz = z + dz * passo, i = idx(nx, nz); if (i < 0 || vis[i] || !G.caminhavelExterior(nx, nz)) continue; vis[i] = 1; fila.push([nx, nz]); } }
  const alcanca = (x, z) => { for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const i = idx(x + dx * passo, z + dz * passo); if (i >= 0 && vis[i]) return true; } return false; };
  for (const p of G.PONTOS) assert.ok(alcanca(p.x, p.z), `${p.id} (${p.tipo}) inalcançável a pé`);
  for (const id of IDS) assert.ok(alcanca(...REGIOES[id].acampamento), `acampamento de ${id}`);
  const boss = REGIOES.fenda.chefe.pos; assert.ok(alcanca(boss[0], boss[1]), 'chefe da Fenda');
});
await t('o território dominante muda ao longo de uma caminhada entre vizinhos e os pesos se misturam (sem fronteira dura)', () => {
  for (const [a, b] of ESTRADAS) {
    const A = REGIOES[a].centro, B = REGIOES[b].centro; let viuA = false, viuB = false, mistura = false;
    for (let k = 0; k <= 200; k++) { const f = k / 200, x = A[0] + (B[0] - A[0]) * f, z = A[1] + (B[1] - A[1]) * f, w = G.pesosEm(x, z), ia = G.IDS.indexOf(a), ib = G.IDS.indexOf(b); if (G.territorioEm(x, z) === a) viuA = true; if (G.territorioEm(x, z) === b) viuB = true; if (w[ia] > 0.1 && w[ib] > 0.1) mistura = true; }
    assert.ok(viuA && viuB && mistura, `${a}→${b}: A=${viuA} B=${viuB} mistura=${mistura}`);
  }
});
await t('terreno é determinístico, finito, contínuo entre territórios e plano no início, acampamentos e entrada da dungeon', () => {
  for (const id of IDS) assert.ok(Math.abs(G.alturaGlobal(...REGIOES[id].acampamento)) < 0.3, id + ' acampamento');
  const ini = G.posicaoInicial(); assert.ok(Math.abs(G.alturaGlobal(ini.x, ini.z)) < 0.3, 'início');
  const e = G.pontoPorId('dg:catacumbas'); assert.ok(Math.abs(G.alturaGlobal(e.x, e.z)) < 0.3, 'entrada da dungeon');
  assert.equal(G.alturaGlobal(123.4, -56.7), G.alturaGlobal(123.4, -56.7));
  let maxPasso = 0; for (const [a, b] of ESTRADAS) { const A = REGIOES[a].centro, B = REGIOES[b].centro; let ant = null; for (let k = 0; k <= 400; k++) { const f = k / 400, y = G.alturaGlobal(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f); assert.ok(Number.isFinite(y)); if (ant !== null) maxPasso = Math.max(maxPasso, Math.abs(y - ant)); ant = y; } }
  assert.ok(maxPasso < 3, 'degrau de ' + maxPasso.toFixed(2) + ' m entre amostras vizinhas (≈ 1 m a 1,5 m)');
});
await t('o mundo tem borda intransponível: passeando para fora do mundo o herói para no limite', () => {
  const L = G.LIMITES; assert.ok(!G.caminhavelExterior(L.minX - 5, L.minZ - 5) && !G.dentroDoMundo(L.maxX + 20, L.maxZ + 20));
  const m = M.criarMundo({ x: REGIOES.fenda.centro[0], z: REGIOES.fenda.centro[1] }); for (let i = 0; i < 1500; i++) M.passoMundo(m, { mx: 1, mz: -0.3 }, 0.1); assert.ok(G.dentroDoMundo(m.heroi.x, m.heroi.z), 'saiu do mundo em ' + m.heroi.x + ',' + m.heroi.z);
});
await t('colisão: árvores e pedras grandes bloqueiam o corpo; o herói desliza e nunca atravessa', () => {
  let achou = 0; for (let cx = 0; cx < 12 && achou < 8; cx++) for (const o of G.propsDoChunk(cx, 5)) if (o.raio > 0.3 && achou < 8) { achou++; assert.ok(!G.caminhavelExterior(o.x, o.z), o.tipo + ' no centro do adereço'); assert.ok(G.colideObstaculo(o.x + o.raio * 0.5, o.z, G.RAIO_HEROI ?? P.raioHeroi)); }
  assert.ok(achou >= 4, 'poucos obstáculos achados: ' + achou);
  const m = M.criarMundo({}); const o = G.propsDoChunk(Math.floor(m.heroi.x / G.TAM_CHUNK), Math.floor(m.heroi.z / G.TAM_CHUNK)).find(q => q.raio > 0.3 && G.caminhavelExterior(q.x - q.raio - 1.2, q.z));
  if (o) { m.heroi.x = o.x - o.raio - 1.2; m.heroi.z = o.z; for (let i = 0; i < 120; i++) M.passoMundo(m, { mx: 1, mz: 0 }, 0.05); assert.ok(Math.hypot(m.heroi.x - o.x, m.heroi.z - o.z) >= o.raio + 0.3, 'atravessou o adereço'); }
});
await t('colisão: encostas íngremes e rocha alta são barreiras (os Picos Ventosos têm áreas intransponíveis, mas há passagem)', () => {
  let bloqueados = 0, livres = 0; const c = REGIOES.picos.centro; for (let x = c[0] - 80; x <= c[0] + 80; x += 4) for (let z = c[1] - 80; z <= c[1] + 80; z += 4) { if (G.territorioEm(x, z) !== 'picos') continue; if (G.caminhavelExterior(x, z)) livres++; else bloqueados++; }
  assert.ok(bloqueados > 30 && livres > bloqueados * 0.8, `bloqueados=${bloqueados} livres=${livres}`);
});
await t('o clima visual (céu/névoa/luz) vem de uma mistura contínua: pesos somam 1 em qualquer ponto', () => {
  for (let k = 0; k < 200; k++) { const x = G.LIMITES.minX + (k * 37.3) % (G.LIMITES.maxX - G.LIMITES.minX), z = G.LIMITES.minZ + (k * 91.7) % (G.LIMITES.maxZ - G.LIMITES.minZ), w = G.pesosEm(x, z); assert.ok(Math.abs(w.reduce((s, v) => s + v, 0) - 1) < 1e-9); assert.ok(w.every(v => v >= 0)); }
});
console.log('Inimigos');
await t('inimigos: determinísticos, na quantidade, no seu território, afastados entre si e das construções, só de áreas do território', () => {
  for (const [id, r] of Object.entries(REGIOES)) {
    const a = M.gerarInimigosDaRegiao(id), b = M.gerarInimigosDaRegiao(id); assert.deepEqual(a, b);
    assert.ok(a.length >= r.quantidade - 1, `${id} gerou ${a.length}`);
    const nomes = new Set([...r.areas, ...(r.chefe ? [r.chefe.area] : [])].map(x => INIMIGOS.find(e => e.area === x).name));
    for (const e of a) { assert.ok(nomes.has(e.nome)); assert.ok(e.id.startsWith(id + ':')); assert.ok(G.dentroDoMundo(e.x, e.z)); }
    const comuns = a.filter(e => !e.chefe); for (const e of comuns) assert.equal(G.territorioEm(e.x, e.z), id);
    for (let i = 0; i < comuns.length; i++) for (let j = i + 1; j < comuns.length; j++) assert.ok(Math.hypot(comuns[i].x - comuns[j].x, comuns[i].z - comuns[j].z) >= 9);
    for (const p of G.PONTOS) for (const e of comuns) assert.ok(Math.hypot(e.x - p.x, e.z - p.z) >= 13, `${id} perto de ${p.id}`);
  }
  assert.ok(M.gerarInimigosDaRegiao('fenda').some(e => e.chefe && e.nome === 'Demônio de Chifres'));
});
await t('criarMundo traz inimigos de TODOS os territórios (mundo único) e das dungeons, cada um no seu espaço', () => {
  const m = M.criarMundo({}); const ext = m.inimigos.filter(e => e.espaco === 'exterior'), dg = m.inimigos.filter(e => e.espaco && e.espaco.startsWith('dg:'));
  for (const id of IDS) assert.ok(ext.some(e => e.id.startsWith(id + ':')), 'sem inimigos de ' + id); assert.ok(dg.length >= 5 && dg.some(e => e.chefe));
  assert.equal(new Set(m.inimigos.map(e => e.id)).size, m.inimigos.length, 'ids repetidos');
  assert.ok(M.inimigosDoEspaco(m).every(e => e.espaco === 'exterior'), 'o exterior não deve simular inimigos da dungeon');
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
const mundoComUm = (e, heroi = {}) => { const m = M.criarMundo({ espaco: { tipo: 'plano' } }); m.inimigos = [inim(e)]; Object.assign(m.heroi, heroi); return m; }; // 'plano' = chão liso sem colisão (só testes)
await t('herói anda na velocidade certa e furtivo mais devagar (chão liso)', () => {
  let m = mundoComUm({ x: 50, z: 50, hx: 50, hz: 50 }); M.passoMundo(m, { mx: 1, mz: 0 }, 1); assert.ok(Math.abs(m.heroi.x - P.velocidade) < 1e-9);
  m = mundoComUm({ x: 50, z: 50, hx: 50, hz: 50 }); M.passoMundo(m, { mx: 1, mz: 0, furtivo: true }, 1); assert.ok(Math.abs(m.heroi.x - P.velocidadeFurtivo) < 1e-9);
});
await t('inimigo que vê o herói alerta, persegue e o alcança → encontro "avistado"', () => {
  const m = mundoComUm({ x: 6, z: 0, hx: 6, hz: 0, rumo: Math.PI }); const ev = []; for (let i = 0; i < 300 && !ev.some(e => e.tipo === 'encontro'); i++) ev.push(...M.passoMundo(m, { mx: 0, mz: 0 }, 0.05).eventos);
  assert.ok(ev.some(e => e.tipo === 'alerta')); assert.equal(ev.find(e => e.tipo === 'encontro').iniciativa, 'avistado');
});
await t('herói em corrida escapa de perseguidor; este desiste e volta', () => {
  const m = mundoComUm({ x: 6, z: 0, hx: 6, hz: 0, rumo: Math.PI }); const ev = [];
  for (let i = 0; i < 1200; i++) { const r = M.passoMundo(m, { mx: -1, mz: 0 }, 0.05); ev.push(...r.eventos); if (ev.some(e => e.tipo === 'encontro')) break; }
  assert.ok(!ev.some(e => e.tipo === 'encontro'), 'não deveria alcançar');
});
await t('aproximação furtiva por trás + ataque = encontro "emboscada"', () => {
  const m = mundoComUm({ x: 0, z: 0, rumo: 0, espera: 99 }, { x: -8, z: 0 }); let ev = [];
  for (let i = 0; i < 200 && Math.hypot(m.heroi.x - 0, m.heroi.z) > 2.2; i++) ev.push(...M.passoMundo(m, { mx: 1, mz: 0, furtivo: true }, 0.05).eventos);
  assert.ok(!ev.some(e => e.tipo === 'alerta' || e.tipo === 'encontro'), 'não deveria ser notado');
  const r = M.passoMundo(m, { mx: 0, mz: 0, ataque: true }, 0.05).eventos.find(e => e.tipo === 'encontro'); assert.equal(r.iniciativa, 'emboscada');
});
await t('no mundo real: o inimigo percebe e persegue o herói que caminha até ele (percepção + colisão do exterior)', () => {
  const m = M.criarMundo({}); const e = m.inimigos.find(q => q.espaco === 'exterior' && !q.chefe); const ang = e.rumo + Math.PI; // aparece de frente para o inimigo
  let alvo = null; for (const d of [6, 7, 8, 5, 9]) { const x = e.x + Math.cos(e.rumo) * d, z = e.z + Math.sin(e.rumo) * d; if (G.caminhavelExterior(x, z)) { alvo = { x, z }; break; } } void ang;
  if (!alvo) return; Object.assign(m.heroi, alvo); const ev = []; for (let i = 0; i < 40; i++) ev.push(...M.passoMundo(m, { mx: 0, mz: 0 }, 0.05).eventos);
  assert.ok(ev.some(x => x.tipo === 'alerta' && x.id === e.id), 'não alertou'); assert.ok(['alerta', 'persegue'].includes(e.estado));
});
await t('inimigos longe (além do raio de simulação) ficam adormecidos em casa; os próximos agem', () => {
  const m = M.criarMundo({}); const e = m.inimigos.find(q => q.espaco === 'exterior' && Math.hypot(q.hx - m.heroi.x, q.hz - m.heroi.z) > P.raioSimulacao + 20); assert.ok(e); e.x += 3; e.estado = 'alerta';
  M.passoMundo(m, { mx: 0, mz: 0 }, 0.05); assert.equal(e.estado, 'patrulha'); assert.equal(e.x, e.hx);
});
await t('derrotado some, persiste por save/carga e reaparece após o respawn (mundo único, sem troca de região)', () => {
  let m = M.criarMundo({}); const id = m.inimigos.find(e => e.espaco === 'exterior').id; M.derrotarInimigo(m, id); assert.equal(m.inimigos.find(e => e.id === id).estado, 'morto');
  const m2 = M.criarMundo({ derrotados: JSON.parse(JSON.stringify(m.derrotados)), tempo: m.tempo }); assert.equal(m2.inimigos.find(e => e.id === id).estado, 'morto');
  for (let i = 0; i < 4; i++) M.passoMundo(m, { mx: 0, mz: 0 }, P.respawnSegundos / 3); assert.notEqual(m.inimigos.find(e => e.id === id).estado, 'morto');
});
await t('pontos: proximidade do acampamento e da entrada da dungeon; a loja só está disponível ao lado de um acampamento', () => {
  const c = REGIOES.vale.acampamento, m = M.criarMundo({ x: c[0] + 1.5, z: c[1] + 1.5 }); assert.equal(M.pontoProximo(m)?.tipo, 'acampamento'); assert.equal(M.lojaDisponivel(m), true);
  const e = G.pontoPorId('dg:catacumbas'); const m2 = M.criarMundo({ x: e.x + Math.cos(e.rumo) * 2.5, z: e.z + Math.sin(e.rumo) * 2.5 }); assert.equal(M.pontoProximo(m2)?.tipo, 'dungeon'); assert.equal(M.lojaDisponivel(m2), false);
  assert.equal(M.lojaDisponivel(M.criarMundo({})), false, 'no início, longe do acampamento'); assert.equal(M.lojaDisponivel(null), false);
});
await t('simulação é determinística (mesmo estado + mesma entrada = mesmo resultado)', () => {
  const rodar = () => { const m = M.criarMundo({ x: REGIOES.cavernas.acampamento[0], z: REGIOES.cavernas.acampamento[1] + 6, semente: 9 }); for (let i = 0; i < 400; i++) M.passoMundo(m, { mx: Math.cos(i / 20), mz: Math.sin(i / 20) }, 0.05); return JSON.stringify(m); };
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
