// Regras do mundo aberto (v28): UM mundo exterior contínuo + interiores de dungeon. Puro e determinístico: sem DOM e sem three.js.
// A cena 3D (src/world) só LÊ este estado e desenha; quem decide tudo é este módulo.
// ---------------------------------------------------------------------------------------------------------------------
// ESTADO (est):  { espaco, regiaoId, heroi, inimigos, derrotados, tempo, rng, descobertas, dungeons }
//   espaco   = { tipo: 'exterior' } | { tipo: 'dungeon', id, retorno: {x,z,rumo} } | { tipo: 'plano' } (só testes: chão liso, sem colisão)
//   regiaoId = território que domina a posição atual do herói (no exterior é recalculado a cada passo; na dungeon é a região dela)
//   inimigos = TODOS os inimigos do jogo (exterior + dungeons); cada um tem `espaco` ('exterior' ou 'dg:<id>'), só os do espaço atual agem
//   derrotados = { idDoInimigo: tempoDaDerrota } (persiste entre espaços e no save)
//   descobertas = { territorios: [id], pontos: [id], celulas: [índices do mapa-múndi já explorados] }
//   dungeons = { <id>: { descoberta, chefeDerrotado, baus: {idDoBau: true}, ultimaSaida, entradas } }
// Não há troca de região nem portais: o jogador caminha de um território a outro; as "regiões" são só a mistura geográfica (geografia.js).
// ---------------------------------------------------------------------------------------------------------------------
import { REGIOES, PARAMETROS_MUNDO as P, REGIAO_INICIAL } from '../data/jogo/mundo.js';
import { INIMIGOS } from '../data/jogo/inimigos.js';
import { criarRng } from '../core/rng.js';
import * as G from './geografia.js';
import * as D from './dungeon.js';
import { vasculharRecompensa } from './acampamento.js';

export const regiao = id => REGIOES[id] ?? REGIOES[REGIAO_INICIAL];
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);
export const ruido = G.ruido;

// ---------- espaços ----------
export const espacoId = esp => (esp.tipo === 'dungeon' ? `dg:${esp.id}` : esp.tipo === 'plano' ? 'plano' : 'exterior');
export const noEspaco = (e, est) => e.espaco === undefined || e.espaco === espacoId(est.espaco);
export const inimigosDoEspaco = est => est.inimigos.filter(e => noEspaco(e, est));
/** Altura do chão no espaço atual (o exterior tem relevo; interiores e o espaço de testes são planos). */
export const alturaNoEspaco = (esp, x, z) => (esp.tipo === 'exterior' ? G.alturaGlobal(x, z) : 0);
/** O corpo de raio r pode estar neste ponto do espaço? (limites, inclinação e obstáculos sólidos) */
export function caminhavel(esp, x, z, r = P.raioHeroi) {
  if (esp.tipo === 'exterior') return G.caminhavelExterior(x, z, r);
  if (esp.tipo === 'dungeon') return D.caminhavelDungeon(D.dungeonPorId(esp.id), x, z, r);
  return true;
}
export const alturaEm = (x, z) => G.alturaGlobal(x, z);

// ---------- geração de inimigos ----------
export const inimigoBase = nome => INIMIGOS.find(e => e.name === nome);
export const inimigoDoArea = area => INIMIGOS.find(e => e.area === area);
/** Inimigos de um território, em coordenadas GLOBAIS. Mesma semente da v27 (ids `<território>:<n>` preservados). */
export function gerarInimigosDaRegiao(id) {
  const r = regiao(id), rng = criarRng(r.semente * 31 + 7), lista = [];
  const evitar = G.PONTOS.map(p => [p.x, p.z, p.tipo === 'marco' ? 16 : 14]); const ini = REGIOES[REGIAO_INICIAL].inicio; evitar.push([ini[0], ini[1], 14]); if (r.chefe) evitar.push([r.chefe.pos[0], r.chefe.pos[1], 14]);
  const ocupado = (x, z) => evitar.some(([ax, az, ar]) => dist(x, z, ax, az) < ar) || lista.some(e => dist(x, z, e.hx, e.hz) < 9);
  const bases = r.areas.map(inimigoDoArea).filter(Boolean), lim = Math.round(r.raio * 0.62); let n = 0, tent = 0;
  while (n < r.quantidade && tent++ < 1500) {
    const x = r.centro[0] + rng.inteiro(-lim, lim), z = r.centro[1] + rng.inteiro(-lim, lim);
    if (G.territorioEm(x, z) !== id || ocupado(x, z) || !G.caminhavelExterior(x, z, 0.8)) continue;
    const b = bases[n % bases.length];
    lista.push({ id: `${id}:${n}`, nome: b.name, tier: b.tier, tipo: b.type, x, z, hx: x, hz: z, rumo: rng.proximo() * Math.PI * 2, estado: 'patrulha', alvoX: x, alvoZ: z, espera: rng.proximo() * 2, alerta: 0, perdido: 0, chefe: false, espaco: 'exterior' });
    n++;
  }
  if (r.chefe) { const b = inimigoDoArea(r.chefe.area); const [x, z] = r.chefe.pos; lista.push({ id: `${id}:boss`, nome: b.name, tier: 'strong', tipo: b.type, x, z, hx: x, hz: z, rumo: Math.PI / 2, estado: 'patrulha', alvoX: x, alvoZ: z, espera: 0, alerta: 0, perdido: 0, chefe: true, espaco: 'exterior' }); }
  return lista;
}
const todosOsInimigos = () => [...Object.keys(REGIOES).flatMap(gerarInimigosDaRegiao), ...Object.values(DUNGEONS_DEF()).flatMap(D.gerarInimigosDaDungeon)];
const DUNGEONS_DEF = () => Object.fromEntries(G.PONTOS.filter(p => p.tipo === 'dungeon').map(p => [p.dungeon, D.dungeonPorId(p.dungeon)]));

// ---------- pontos de interação ----------
const RAIO_INTERACAO = { acampamento: P.raioPonto * 1.4, dungeon: P.raioPonto * 1.45, saida: P.raioPonto * 1.1, bau: P.raioPonto * 0.9 };
/** Pontos interativos do espaço atual: acampamentos e entradas de dungeon (exterior); saída e baús fechados (dungeon). */
export function pontosDoEspaco(est) {
  if (est.espaco.tipo === 'exterior') return G.PONTOS.filter(p => p.tipo === 'acampamento' || p.tipo === 'dungeon');
  if (est.espaco.tipo === 'dungeon') {
    const def = D.dungeonPorId(est.espaco.id), d = est.dungeons[def.id] || {}, pts = [{ id: `saida:${def.id}`, tipo: 'saida', x: def.saida.x, z: def.saida.z, rotulo: 'Saída' }];
    for (const b of def.baus) if (!d.baus?.[b.id]) pts.push({ id: b.id, tipo: 'bau', x: b.x, z: b.z, rotulo: 'Baú' });
    return pts;
  }
  return [];
}
export function pontoProximo(est) {
  let melhor = null, md = 1e9;
  for (const p of pontosDoEspaco(est)) { const d = dist(est.heroi.x, est.heroi.z, p.x, p.z); if (d <= (RAIO_INTERACAO[p.tipo] ?? P.raioPonto) && d < md) { md = d; melhor = p; } }
  return melhor;
}
/** REGRA DA LOJA (v28): o comércio só existe em um acampamento válido do mundo aberto. Todo caminho que abre a loja passa por aqui. */
export const lojaDisponivel = est => !!est && est.espaco?.tipo === 'exterior' && pontoProximo(est)?.tipo === 'acampamento';
export const acampamentoDescoberto = (est, id) => est.descobertas.pontos.includes(id);

// ---------- criação do mundo ----------
const normDescobertas = d => ({ territorios: [...(d?.territorios || [])].filter(id => REGIOES[id]), pontos: [...(d?.pontos || [])].filter(id => G.pontoPorId(id)), celulas: [...(d?.celulas || [])].filter(Number.isInteger) });
const normDungeons = d => { const o = {}; for (const id of Object.keys(DUNGEONS_DEF())) o[id] = { ...D.estadoInicialDungeon(), ...(d?.[id] || {}), baus: { ...(d?.[id]?.baus || {}) } }; return o; };
/** Posição livre mais próxima de (x, z) (espiral). Evita nascer dentro de uma árvore/parede (save antigo, viagem rápida). */
export function posicaoLivrePerto(esp, x, z, r = P.raioHeroi) {
  if (caminhavel(esp, x, z, r)) return { x, z };
  for (let raio = 0.7; raio <= 24; raio += 0.7) for (let a = 0; a < 6.28; a += 0.45) { const nx = x + Math.cos(a) * raio, nz = z + Math.sin(a) * raio; if (caminhavel(esp, nx, nz, r)) return { x: nx, z: nz }; }
  return { x, z };
}
export function criarMundo({ regiaoId = REGIAO_INICIAL, x, z, rumo = 0, derrotados = {}, semente = 1, espaco, descobertas, dungeons, tempo = 0 } = {}) {
  const esp = espaco ?? { tipo: 'exterior' }, r = regiao(regiaoId);
  let ini; if (x !== undefined && z !== undefined) ini = { x, z };
  else if (esp.tipo === 'plano') ini = { x: 0, z: 0 };
  else if (esp.tipo === 'dungeon') { const d = D.dungeonPorId(esp.id); ini = { x: d.chegada.x, z: d.chegada.z }; }
  else ini = r.inicio ? { x: r.inicio[0], z: r.inicio[1] } : { x: r.acampamento[0] + 2.5, z: r.acampamento[1] + 3 };
  ini = posicaoLivrePerto(esp, ini.x, ini.z);
  const est = { espaco: esp, regiaoId: esp.tipo === 'exterior' ? G.territorioEm(ini.x, ini.z) : esp.tipo === 'dungeon' ? D.dungeonPorId(esp.id).regiao : regiaoId, heroi: { x: ini.x, z: ini.z, rumo, furtivo: false, movendo: false, vel: 0 }, inimigos: esp.tipo === 'plano' ? [] : todosOsInimigos(), derrotados: { ...derrotados }, tempo, rng: semente >>> 0, descobertas: normDescobertas(descobertas), dungeons: normDungeons(dungeons) };
  aplicarDerrotados(est); registrarDescobertas(est, []); return est;
}

// ---------- derrotados, revisita e respawn ----------
/** Marca como mortos os inimigos que ainda não cumpriram o tempo de respawn (exterior: respawnSegundos; dungeon: ver docs/DUNGEONS.md). */
export function aplicarDerrotados(est) {
  for (const e of est.inimigos) {
    const t = est.derrotados[e.id], dg = e.espaco && e.espaco.startsWith('dg:') ? e.espaco.slice(3) : null;
    if (dg && e.chefe && est.dungeons?.[dg]?.chefeDerrotado) { e.estado = 'morto'; continue; }
    const limite = dg ? P.respawnDungeonSegundos : P.respawnSegundos;
    if (t !== undefined && est.tempo - t < limite) e.estado = 'morto';
  }
}
export function derrotarInimigo(est, id) {
  est.derrotados[id] = est.tempo; const e = est.inimigos.find(i => i.id === id); if (e) e.estado = 'morto';
  if (e?.chefe && e.espaco?.startsWith('dg:')) { const d = est.dungeons[e.espaco.slice(3)]; if (d) d.chefeDerrotado = true; }
}

// ---------- dungeons: entrada e saída ----------
export function entrarDungeon(est, id) {
  const def = D.dungeonPorId(id), p = G.pontoPorId(`dg:${id}`); if (!def || !p || est.espaco.tipo !== 'exterior') return { ok: false };
  if (pontoProximo(est)?.dungeon !== id) return { ok: false, motivo: 'longe' }; // v28: só se entra caminhando até a porta (a regra, não só a interface, exige a proximidade)
  const d = (est.dungeons[id] ||= D.estadoInicialDungeon()); d.descoberta = true; d.entradas = (d.entradas || 0) + 1;
  const retorno = { x: p.x + Math.cos(p.rumo) * 3.8, z: p.z + Math.sin(p.rumo) * 3.8, rumo: p.rumo + Math.PI }; // diante do portão, dentro do alcance de interação
  est.espaco = { tipo: 'dungeon', id, retorno }; est.regiaoId = def.regiao;
  est.heroi.x = def.chegada.x; est.heroi.z = def.chegada.z; est.heroi.rumo = def.chegada.rumo; est.heroi.movendo = false; est.heroi.vel = 0;
  // Revisita: comuns derrotados há mais de respawnDungeonSegundos voltam; todo o resto volta ao posto (sem perseguição pendente).
  for (const e of est.inimigos) if (e.espaco === `dg:${id}`) { if (e.estado !== 'morto' || !(e.chefe && d.chefeDerrotado)) { const t = est.derrotados[e.id]; if (t !== undefined && est.tempo - t >= P.respawnDungeonSegundos) delete est.derrotados[e.id]; } e.estado = est.derrotados[e.id] !== undefined || (e.chefe && d.chefeDerrotado) ? 'morto' : 'patrulha'; if (e.estado !== 'morto') { e.x = e.hx; e.z = e.hz; e.alerta = 0; e.perdido = 0; } }
  registrarDescobertas(est, []); return { ok: true, def };
}
export function sairDungeon(est) {
  if (est.espaco.tipo !== 'dungeon' || pontoProximo(est)?.tipo !== 'saida') return { ok: false, motivo: 'longe' }; // só se sai pela porta de saída
  const id = est.espaco.id, ret = est.espaco.retorno; if (est.dungeons[id]) est.dungeons[id].ultimaSaida = est.tempo;
  est.espaco = { tipo: 'exterior' }; const livre = posicaoLivrePerto(est.espaco, ret.x, ret.z);
  est.heroi.x = livre.x; est.heroi.z = livre.z; est.heroi.rumo = ret.rumo; est.heroi.movendo = false; est.heroi.vel = 0; est.regiaoId = G.territorioEm(livre.x, livre.z);
  for (const e of est.inimigos) if (e.espaco === `dg:${id}` && e.estado !== 'morto') { e.estado = 'patrulha'; e.x = e.hx; e.z = e.hz; }
  registrarDescobertas(est, []); return { ok: true, id };
}
/** Abre um baú da dungeon atual com as regras REAIS de recompensa (a mesma rodada de "vasculhar" do acampamento). */
export function abrirBau(est, heroi, bauId, semente) {
  if (est.espaco.tipo !== 'dungeon') return { ok: false, heroi, eventos: [{ tipo: 'recusado', texto: 'Não há baú aqui.', tom: 'bad' }] };
  const def = D.dungeonPorId(est.espaco.id), b = def.baus.find(x => x.id === bauId), d = est.dungeons[def.id];
  if (!b) return { ok: false, heroi, eventos: [{ tipo: 'recusado', texto: 'Baú inexistente.', tom: 'bad' }] };
  if (d.baus[bauId]) return { ok: false, heroi, eventos: [{ tipo: 'recusado', texto: 'Este baú já foi aberto.', tom: 'bad' }] };
  if (dist(est.heroi.x, est.heroi.z, b.x, b.z) > RAIO_INTERACAO.bau + 0.6) return { ok: false, heroi, eventos: [{ tipo: 'recusado', texto: 'Chegue mais perto do baú.', tom: 'bad' }] };
  d.baus[bauId] = true; const r = vasculharRecompensa(heroi, semente, 'baú'); return { ok: true, heroi: r.heroi, eventos: r.eventos };
}
/** Viagem rápida (só a partir de um acampamento, só para acampamentos já descobertos). Não é um portal: não há "região" a carregar. */
export function viajarParaAcampamento(est, campId) {
  const p = G.pontoPorId(campId); if (!p || p.tipo !== 'acampamento' || est.espaco.tipo !== 'exterior') return { ok: false };
  if (pontoProximo(est)?.tipo !== 'acampamento' || !acampamentoDescoberto(est, campId) || pontoProximo(est).id === campId) return { ok: false };
  const l = posicaoLivrePerto(est.espaco, p.x + 0.5, p.z + 3.4); est.heroi.x = l.x; est.heroi.z = l.z; est.regiaoId = G.territorioEm(l.x, l.z); registrarDescobertas(est, []); return { ok: true };
}

// ---------- descobertas (mapa-múndi) ----------
/** Revela células do mapa ao redor do herói e descobre territórios/pontos próximos. Só no exterior. Acrescenta eventos a `ev`. */
export function registrarDescobertas(est, ev) {
  if (est.espaco.tipo !== 'exterior') return;
  const d = est.descobertas, h = est.heroi, set = (est._celulas ||= new Set(d.celulas));
  if (!d.territorios.includes(est.regiaoId)) { d.territorios.push(est.regiaoId); ev.push({ tipo: 'descoberta', alvo: 'territorio', id: est.regiaoId }); }
  const c0 = G.celulaDe(h.x, h.z);
  if (c0 !== est._ultimaCelula) {
    est._ultimaCelula = c0; const k = Math.ceil(P.raioNevoa / P.celulaMapa);
    for (let dz = -k; dz <= k; dz++) for (let dx = -k; dx <= k; dx++) { const x = h.x + dx * P.celulaMapa, z = h.z + dz * P.celulaMapa, i = G.celulaDe(x, z); if (i < 0 || set.has(i)) continue; const [cx, cz] = G.centroDaCelula(i); if (dist(cx, cz, h.x, h.z) <= P.raioNevoa + P.celulaMapa * 0.5) { set.add(i); d.celulas.push(i); } }
  }
  for (const p of G.PONTOS) if (!d.pontos.includes(p.id) && dist(p.x, p.z, h.x, h.z) <= P.raioDescoberta) { d.pontos.push(p.id); ev.push({ tipo: 'descoberta', alvo: 'ponto', id: p.id, rotulo: p.rotulo, subtipo: p.tipo }); }
}

// ---------- percepção e iniciativa ----------
// Percepção: 'nao' | 've'. Atrás do cone só vê muito perto; furtivo reduz o alcance à metade.
export function percebe(e, heroi, tier = e.tier) {
  const d = dist(e.x, e.z, heroi.x, heroi.z); const alcance = (P.visao[tier] ?? 10) * (heroi.furtivo ? 0.5 : 1);
  if (d > alcance) return false; if (d < (heroi.furtivo ? 1.2 : 2.2)) return true;
  const ang = Math.atan2(heroi.z - e.z, heroi.x - e.x); let da = Math.abs(((ang - e.rumo + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
  return da <= (P.anguloVisao * Math.PI) / 180;
}
// Iniciativa do encontro, decidida por quem iniciou o contato e pela consciência do inimigo.
export function iniciativaDoContato(e, heroi, atacou) {
  const consciente = e.estado === 'alerta' || e.estado === 'persegue';
  if (!consciente && atacou) { const dx = Math.cos(e.rumo), dz = Math.sin(e.rumo), vx = heroi.x - e.x, vz = heroi.z - e.z; if (dx * vx + dz * vz < 0) return 'emboscada'; return 'normal'; }
  if (consciente && !atacou) return 'avistado';
  return 'normal';
}

// ---------- simulação ----------
const mover = (est, e, nx, nz) => { // move com deslizamento por eixo; devolve true se saiu do lugar
  const r = 0.5; if (caminhavel(est.espaco, nx, nz, r)) { e.x = nx; e.z = nz; return true; }
  if (caminhavel(est.espaco, nx, e.z, r)) { e.x = nx; return true; } if (caminhavel(est.espaco, e.x, nz, r)) { e.z = nz; return true; } return false;
};
/** Um passo da simulação. entrada: {mx, mz (vetor desejado, |v|<=1), furtivo, ataque}. Retorna {eventos}. */
export function passoMundo(est, entrada, dt) {
  const rng = criarRng(est.rng), ev = [], h = est.heroi, ext = est.espaco.tipo === 'exterior'; est.tempo += dt;
  // respawn (exterior; dentro de uma dungeon ninguém reaparece enquanto o jogador está lá)
  if (est.espaco.tipo !== 'dungeon') for (const e of est.inimigos) if (e.estado === 'morto' && e.espaco !== undefined && !e.espaco.startsWith('dg:')) { const t = est.derrotados[e.id]; if (t === undefined || est.tempo - t >= P.respawnSegundos) { e.estado = 'patrulha'; e.x = e.hx; e.z = e.hz; delete est.derrotados[e.id]; ev.push({ tipo: 'respawn', id: e.id }); } }
    else if (e.estado === 'morto' && e.espaco === undefined) { const t = est.derrotados[e.id]; if (t === undefined || est.tempo - t >= P.respawnSegundos) { e.estado = 'patrulha'; e.x = e.hx; e.z = e.hz; delete est.derrotados[e.id]; ev.push({ tipo: 'respawn', id: e.id }); } }
  // herói
  const len = Math.hypot(entrada.mx || 0, entrada.mz || 0); h.furtivo = !!entrada.furtivo;
  if (len > 0.01) {
    const v = (h.furtivo ? P.velocidadeFurtivo : P.velocidade) * Math.min(1, len), nx = h.x + (entrada.mx / len) * v * dt, nz = h.z + (entrada.mz / len) * v * dt;
    if (caminhavel(est.espaco, nx, nz)) { h.x = nx; h.z = nz; } else if (caminhavel(est.espaco, nx, h.z)) h.x = nx; else if (caminhavel(est.espaco, h.x, nz)) h.z = nz;
    h.rumo = Math.atan2(entrada.mz, entrada.mx); h.movendo = true; h.vel = v;
  } else { h.movendo = false; h.vel = 0; }
  // território atual e descobertas
  if (ext) { const t = G.territorioEm(h.x, h.z); if (t !== est.regiaoId) { ev.push({ tipo: 'territorio', id: t, de: est.regiaoId }); est.regiaoId = t; } registrarDescobertas(est, ev); }
  // inimigos (a iniciativa do contato usa a consciência que o inimigo tinha ANTES deste passo)
  const antes = new Map(), rs = P.raioSimulacao; let alvo = null, ad = 1e9;
  for (const e of est.inimigos) {
    if (!noEspaco(e, est) || e.estado === 'morto') continue;
    const d = dist(e.x, e.z, h.x, h.z);
    if (d > rs) { if (e.estado !== 'patrulha' || e.x !== e.hx || e.z !== e.hz) { e.estado = 'patrulha'; e.x = e.hx; e.z = e.hz; e.alerta = 0; e.perdido = 0; } continue; } // adormecido: custo zero e estado preservado
    antes.set(e.id, e.estado);
    const ve = percebe(e, h);
    if (e.estado === 'patrulha' || e.estado === 'volta') {
      if (ve) { e.estado = 'alerta'; e.alerta = P.tempoAlerta; ev.push({ tipo: 'alerta', id: e.id }); }
      else patrulhar(est, e, dt, rng, e.estado === 'volta');
    } else if (e.estado === 'alerta') {
      e.rumo = Math.atan2(h.z - e.z, h.x - e.x); e.alerta -= dt; if (e.alerta <= 0) e.estado = 'persegue';
    } else if (e.estado === 'persegue') {
      if (e.chefe && dist(e.x, e.z, e.hx, e.hz) > 22) { e.estado = 'volta'; continue; }
      e.rumo = Math.atan2(h.z - e.z, h.x - e.x); const v = P.velocidadePerseguicao * (e.chefe ? 0.8 : 1);
      mover(est, e, e.x + Math.cos(e.rumo) * v * dt, e.z + Math.sin(e.rumo) * v * dt);
      if (!ve && d > (P.visao[e.tier] ?? 10) * 0.9) { e.perdido += dt; if (e.perdido > P.perderAlvo) { e.estado = 'volta'; e.perdido = 0; ev.push({ tipo: 'perdeu', id: e.id }); } } else e.perdido = 0;
    }
    const d2 = dist(e.x, e.z, h.x, h.z); if (d2 < ad) { ad = d2; alvo = e; }
  }
  // contato (colisão) — o primeiro encontrado decide
  if (alvo) {
    const e = alvo, d = ad;
    if (entrada.ataque && d <= P.alcanceAtaque) ev.push({ tipo: 'encontro', id: e.id, nome: e.nome, iniciativa: iniciativaDoContato({ ...e, estado: antes.get(e.id) }, h, true) });
    else if (d <= P.raioContato) ev.push({ tipo: 'encontro', id: e.id, nome: e.nome, iniciativa: iniciativaDoContato({ ...e, estado: antes.get(e.id) }, h, false) });
  }
  est.rng = rng.estado; return { eventos: ev };
}
function patrulhar(est, e, dt, rng, voltando) {
  if (e.chefe && !voltando) return; // chefe fica no covil
  if (voltando) { e.alvoX = e.hx; e.alvoZ = e.hz; }
  const dx = e.alvoX - e.x, dz = e.alvoZ - e.z, d = Math.hypot(dx, dz);
  if (d < 0.6) {
    if (voltando) { e.estado = 'patrulha'; return; }
    e.espera -= dt; if (e.espera <= 0) { const a = rng.proximo() * Math.PI * 2, r = 3 + rng.proximo() * 6; e.alvoX = e.hx + Math.cos(a) * r; e.alvoZ = e.hz + Math.sin(a) * r; e.espera = 1 + rng.proximo() * 3; }
    return;
  }
  e.rumo = Math.atan2(dz, dx); const v = (voltando ? P.velocidadePerseguicao * 0.7 : P.velocidadePatrulha) * dt, k = Math.min(v, d);
  if (!mover(est, e, e.x + (dx / d) * k, e.z + (dz / d) * k)) { // bloqueado (árvore, parede, encosta): desiste deste destino e escolhe outro
    if (voltando) { e.x = e.hx; e.z = e.hz; e.estado = 'patrulha'; } else { e.alvoX = e.x; e.alvoZ = e.z; e.espera = 0.4; }
  }
}
