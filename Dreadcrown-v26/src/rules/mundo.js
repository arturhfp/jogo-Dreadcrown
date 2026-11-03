// Regras do mundo aberto: terreno (altura), geração de encontros, percepção/IA dos inimigos,
// movimento do herói e iniciativa (emboscada / avistado). Puro e determinístico: sem DOM e sem three.js.
// A cena 3D (src/world) só LÊ este estado e desenha; quem decide tudo é este módulo.
import { REGIOES, PARAMETROS_MUNDO as P, REGIAO_INICIAL } from '../data/jogo/mundo.js';
import { INIMIGOS } from '../data/jogo/inimigos.js';
import { criarRng } from '../core/rng.js';

export const regiao = id => REGIOES[id] ?? REGIOES[REGIAO_INICIAL];
const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// ---------- terreno ----------
function hash(sem, ix, iz) { let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(sem, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
function ruido(sem, x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(sem, ix, iz), b = hash(sem, ix + 1, iz), c = hash(sem, ix, iz + 1), d = hash(sem, ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
// Pontos que ficam planos (acampamento, loja, portais, início): retorna [x,z,raio][].
function zonasPlanas(r) {
  const z = [[r.inicio[0], r.inicio[1], 7]];
  if (r.acampamento) z.push([r.acampamento[0], r.acampamento[1], 7]);
  if (r.loja) z.push([r.loja[0], r.loja[1], 6]);
  for (const p of r.portais) z.push([p.pos[0], p.pos[1], 8]);
  if (r.chefe) z.push([r.chefe.pos[0], r.chefe.pos[1], 12]);
  return z;
}
const cacheZonas = new Map();
export function alturaEm(regiaoId, x, z) {
  const r = regiao(regiaoId); let zs = cacheZonas.get(regiaoId); if (!zs) { zs = zonasPlanas(r); cacheZonas.set(regiaoId, zs); }
  const s = r.semente;
  let h = (ruido(s, x * 0.035, z * 0.035) * 1.0 + ruido(s + 7, x * 0.09, z * 0.09) * 0.45 + ruido(s + 13, x * 0.22, z * 0.22) * 0.12 - 0.8) * r.relevo;
  let plano = 0; for (const [px, pz, pr] of zs) plano = Math.max(plano, 1 - suave(pr, pr + 9, dist(x, z, px, pz)));
  const borda = suave(r.tamanho - 16, r.tamanho + 2, Math.max(Math.abs(x), Math.abs(z)));
  return (h + borda * 16) * (1 - plano);
}
export const dentroDoMapa = (regiaoId, x, z) => { const t = regiao(regiaoId).tamanho - 1.5; return Math.abs(x) <= t && Math.abs(z) <= t; };

// ---------- pontos de interesse ----------
export function pontosDaRegiao(id) {
  const r = regiao(id), pts = [];
  if (r.acampamento) pts.push({ tipo: 'acampamento', x: r.acampamento[0], z: r.acampamento[1], rotulo: 'Acampamento' });
  if (r.loja) pts.push({ tipo: 'loja', x: r.loja[0], z: r.loja[1], rotulo: 'Mercador errante' });
  for (const p of r.portais) pts.push({ tipo: 'portal', x: p.pos[0], z: p.pos[1], para: p.para, rotulo: p.rotulo });
  return pts;
}
export function pontoProximo(est) {
  let melhor = null, md = 1e9;
  for (const p of pontosDaRegiao(est.regiaoId)) { const d = dist(est.heroi.x, est.heroi.z, p.x, p.z), raio = p.tipo === 'portal' ? P.raioPortal : P.raioPonto; if (d <= raio && d < md) { md = d; melhor = p; } }
  return melhor;
}
export const portalLiberado = (heroi, paraId) => (heroi.wins ?? 0) >= regiao(paraId).vitoriasMin;
// Posição de chegada ao entrar em `destino` vindo de `origem` (junto ao portal de volta).
export function chegada(destino, origem) {
  const r = regiao(destino), p = r.portais.find(q => q.para === origem); if (!p) return { x: r.inicio[0], z: r.inicio[1] };
  const k = 0.88; return { x: p.pos[0] * k, z: p.pos[1] * k };
}

// ---------- geração da região ----------
export const inimigoBase = nome => INIMIGOS.find(e => e.name === nome);
export const inimigoDoArea = area => INIMIGOS.find(e => e.area === area);
export function gerarInimigosDaRegiao(id) {
  const r = regiao(id), rng = criarRng(r.semente * 31 + 7), lista = [], evitar = zonasPlanas(r).map(([x, z]) => [x, z, 14]);
  const ocupado = (x, z) => evitar.some(([ax, az, ar]) => dist(x, z, ax, az) < ar) || lista.some(e => dist(x, z, e.hx, e.hz) < 9);
  const bases = r.areas.map(inimigoDoArea).filter(Boolean);
  const lim = r.tamanho - 14; let n = 0, tent = 0;
  while (n < r.quantidade && tent++ < 400) {
    const x = rng.inteiro(-lim, lim), z = rng.inteiro(-lim, lim); if (ocupado(x, z)) continue;
    const b = bases[n % bases.length];
    lista.push({ id: `${id}:${n}`, nome: b.name, tier: b.tier, tipo: b.type, x, z, hx: x, hz: z, rumo: rng.proximo() * Math.PI * 2, estado: 'patrulha', alvoX: x, alvoZ: z, espera: rng.proximo() * 2, alerta: 0, perdido: 0, chefe: false });
    n++;
  }
  if (r.chefe) { const b = inimigoDoArea(r.chefe.area); const [x, z] = r.chefe.pos; lista.push({ id: `${id}:boss`, nome: b.name, tier: 'strong', tipo: b.type, x, z, hx: x, hz: z, rumo: Math.PI / 2, estado: 'patrulha', alvoX: x, alvoZ: z, espera: 0, alerta: 0, perdido: 0, chefe: true }); }
  return lista;
}

// ---------- estado do mundo ----------
export function criarMundo({ regiaoId = REGIAO_INICIAL, x, z, derrotados = {}, semente = 1 } = {}) {
  const r = regiao(regiaoId); const ini = (x === undefined || z === undefined) ? { x: r.inicio[0], z: r.inicio[1] } : { x, z };
  return { regiaoId, heroi: { x: ini.x, z: ini.z, rumo: 0, furtivo: false, movendo: false, vel: 0 }, inimigos: gerarInimigosDaRegiao(regiaoId), derrotados: { ...derrotados }, tempo: 0, rng: semente >>> 0 };
}
// rapida=true (viagem rápida pelo mapa): chega ao acampamento da região destino em vez do portal.
export function trocarRegiao(est, destino, { rapida = false } = {}) {
  const r = regiao(destino), c = rapida && r.acampamento ? { x: r.acampamento[0] + 2.5, z: r.acampamento[1] + 2.5 } : chegada(destino, est.regiaoId);
  const novo = criarMundo({ regiaoId: destino, x: c.x, z: c.z, derrotados: est.derrotados, semente: est.rng });
  novo.tempo = est.tempo; aplicarDerrotados(novo); return novo;
}
function aplicarDerrotados(est) { for (const e of est.inimigos) { const t = est.derrotados[e.id]; if (t !== undefined && est.tempo - t < P.respawnSegundos) e.estado = 'morto'; } }
export function derrotarInimigo(est, id) { est.derrotados[id] = est.tempo; const e = est.inimigos.find(i => i.id === id); if (e) e.estado = 'morto'; }

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

// Um passo da simulação. entrada: {mx, mz (vetor desejado, |v|<=1), furtivo, ataque}. Retorna {eventos}.
export function passoMundo(est, entrada, dt) {
  const rng = criarRng(est.rng), ev = [], h = est.heroi; est.tempo += dt;
  // respawn
  for (const e of est.inimigos) if (e.estado === 'morto') { const t = est.derrotados[e.id]; if (t === undefined || est.tempo - t >= P.respawnSegundos) { e.estado = 'patrulha'; e.x = e.hx; e.z = e.hz; delete est.derrotados[e.id]; ev.push({ tipo: 'respawn', id: e.id }); } }
  // herói
  const len = Math.hypot(entrada.mx || 0, entrada.mz || 0); h.furtivo = !!entrada.furtivo;
  if (len > 0.01) {
    const v = (h.furtivo ? P.velocidadeFurtivo : P.velocidade) * Math.min(1, len), nx = h.x + (entrada.mx / len) * v * dt, nz = h.z + (entrada.mz / len) * v * dt;
    if (dentroDoMapa(est.regiaoId, nx, nz)) { h.x = nx; h.z = nz; } else if (dentroDoMapa(est.regiaoId, nx, h.z)) h.x = nx; else if (dentroDoMapa(est.regiaoId, h.x, nz)) h.z = nz;
    h.rumo = Math.atan2(entrada.mz, entrada.mx); h.movendo = true; h.vel = v;
  } else { h.movendo = false; h.vel = 0; }
  // inimigos (a iniciativa do contato usa a consciência que o inimigo tinha ANTES deste passo)
  const antes = new Map(est.inimigos.map(e => [e.id, e.estado]));
  for (const e of est.inimigos) {
    if (e.estado === 'morto') continue;
    const d = dist(e.x, e.z, h.x, h.z), ve = percebe(e, h);
    if (e.estado === 'patrulha' || e.estado === 'volta') {
      if (ve && !e.chefe || ve && e.chefe) { e.estado = 'alerta'; e.alerta = P.tempoAlerta; ev.push({ tipo: 'alerta', id: e.id }); }
      else patrulhar(e, dt, rng, e.estado === 'volta');
    } else if (e.estado === 'alerta') {
      e.rumo = Math.atan2(h.z - e.z, h.x - e.x); e.alerta -= dt; if (e.alerta <= 0) e.estado = 'persegue';
    } else if (e.estado === 'persegue') {
      if (e.chefe && dist(e.x, e.z, e.hx, e.hz) > 22) { e.estado = 'volta'; continue; }
      e.rumo = Math.atan2(h.z - e.z, h.x - e.x); const v = P.velocidadePerseguicao * (e.chefe ? 0.8 : 1); const nx = e.x + Math.cos(e.rumo) * v * dt, nz = e.z + Math.sin(e.rumo) * v * dt;
      if (dentroDoMapa(est.regiaoId, nx, nz)) { e.x = nx; e.z = nz; }
      if (!ve && d > (P.visao[e.tier] ?? 10) * 0.9) { e.perdido += dt; if (e.perdido > P.perderAlvo) { e.estado = 'volta'; e.perdido = 0; ev.push({ tipo: 'perdeu', id: e.id }); } } else e.perdido = 0;
    }
  }
  // contato (colisão) — o primeiro encontrado decide
  const alvo = est.inimigos.filter(e => e.estado !== 'morto').map(e => ({ e, d: dist(e.x, e.z, h.x, h.z) })).sort((a, b) => a.d - b.d)[0];
  if (alvo) {
    const { e, d } = alvo;
    if (entrada.ataque && d <= P.alcanceAtaque) ev.push({ tipo: 'encontro', id: e.id, nome: e.nome, iniciativa: iniciativaDoContato({ ...e, estado: antes.get(e.id) }, h, true) });
    else if (d <= P.raioContato) ev.push({ tipo: 'encontro', id: e.id, nome: e.nome, iniciativa: iniciativaDoContato({ ...e, estado: antes.get(e.id) }, h, false) });
  }
  est.rng = rng.estado; return { eventos: ev };
}
function patrulhar(e, dt, rng, voltando) {
  if (e.chefe && !voltando) return; // chefe fica no covil
  if (voltando) { e.alvoX = e.hx; e.alvoZ = e.hz; }
  const dx = e.alvoX - e.x, dz = e.alvoZ - e.z, d = Math.hypot(dx, dz);
  if (d < 0.6) {
    if (voltando) { e.estado = 'patrulha'; return; }
    e.espera -= dt; if (e.espera <= 0) { const a = rng.proximo() * Math.PI * 2, r = 3 + rng.proximo() * 6; e.alvoX = e.hx + Math.cos(a) * r; e.alvoZ = e.hz + Math.sin(a) * r; e.espera = 1 + rng.proximo() * 3; }
    return;
  }
  e.rumo = Math.atan2(dz, dx); const v = (voltando ? P.velocidadePerseguicao * 0.7 : P.velocidadePatrulha) * dt; e.x += (dx / d) * Math.min(v, d); e.z += (dz / d) * Math.min(v, d);
}
