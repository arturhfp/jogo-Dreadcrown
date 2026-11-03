// Geografia do mundo exterior contínuo (v28). Puro e determinístico: sem DOM e sem three.js.
// ---------------------------------------------------------------------------------------------------------------------
// RESPONSABILIDADE: tudo o que depende de UM PONTO (x, z) do mundo exterior:
//   • territórios e a mistura entre eles (pesos), altura do terreno, estradas, inclinação, limites do mundo;
//   • adereços (árvores, pedras…) por "chunk" (setor de 64×64), que são ao mesmo tempo o que se DESENHA e o que COLIDE;
//   • pontos do mundo (acampamentos, entradas de dungeon, marcos) e as peças de cada construção;
//   • colisão (caminhável / obstáculos) e a grade de células exploradas do mapa-múndi.
// RELAÇÃO: lê data/jogo/mundo.js e data/jogo/dungeons.js; é usada por rules/mundo.js, world/terreno.js e pela interface (mapa).
// REGRAS / CUIDADOS: os "chunks" são só um detalhe técnico de carregamento; o jogador nunca percebe regiões separadas. Os
// mesmos números alimentam o desenho e a colisão — por isso o que se vê como sólido é sólido. Não use Math.random aqui.
// ---------------------------------------------------------------------------------------------------------------------
import { REGIOES, ESTRADAS, MARCOS, PARAMETROS_MUNDO as P, REGIAO_INICIAL } from '../data/jogo/mundo.js';
import { DUNGEONS } from '../data/jogo/dungeons.js';
import { criarRng } from '../core/rng.js';

export const IDS = Object.keys(REGIOES);
const N = IDS.length;
const CX = IDS.map(id => REGIOES[id].centro[0]), CZ = IDS.map(id => REGIOES[id].centro[1]), RA = IDS.map(id => REGIOES[id].raio);
const REL = IDS.map(id => REGIOES[id].relevo), SEM = IDS.map(id => REGIOES[id].semente);
export const TAM_CHUNK = 64;
const SEMENTE_MUNDO = 0x5eed28;
const K_MISTURA = 7; // quanto maior, mais curta a faixa de transição entre territórios

const suave = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function hash(sem, ix, iz) { let h = Math.imul(ix, 374761393) ^ Math.imul(iz, 668265263) ^ Math.imul(sem, 2246822519); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
export function ruido(sem, x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz, u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(sem, ix, iz), b = hash(sem, ix + 1, iz), c = hash(sem, ix, iz + 1), d = hash(sem, ix + 1, iz + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export const idDoIndice = i => IDS[i];
const indice = id => IDS.indexOf(id);

// ---------- pontos do mundo e construções ----------
const ang = (rumo, k) => [Math.cos(rumo) * k, Math.sin(rumo) * k];
const rodar = (rumo, fx, lz) => { // (fx = para frente, lz = para a direita) → deslocamento (x, z) no mundo
  const f = [Math.cos(rumo), Math.sin(rumo)], r = [-f[1], f[0]]; return [f[0] * fx + r[0] * lz, f[1] * fx + r[1] * lz];
};

/** Pontos interativos/descobríveis do mundo exterior. Cada um tem id estável (usado no save e no mapa). */
export function pontosDoMundo() {
  const pts = [];
  for (const id of IDS) { const r = REGIOES[id]; pts.push({ id: `camp:${id}`, tipo: 'acampamento', regiao: id, x: r.acampamento[0], z: r.acampamento[1], rotulo: `Acampamento · ${r.nome}`, rumo: 0 }); }
  for (const d of Object.values(DUNGEONS)) pts.push({ id: `dg:${d.id}`, tipo: 'dungeon', dungeon: d.id, regiao: d.regiao, x: d.entradaMundo.x, z: d.entradaMundo.z, rumo: d.entradaMundo.rumo, rotulo: d.nome });
  for (const m of MARCOS) pts.push({ id: m.id, tipo: 'marco', subtipo: m.tipo, regiao: m.regiao, x: m.pos[0], z: m.pos[1], rumo: m.rumo, rotulo: m.rotulo });
  return pts;
}
export const PONTOS = pontosDoMundo();
export const pontoPorId = id => PONTOS.find(p => p.id === id);

/** Peças de cada construção, em coordenadas do mundo. forma: 'cilindro' {x,z,raio,alt} | 'caixa' {x,z,w,d,alt,rot} | 'pedra' {x,z,raio,esc}
 *  | 'tenda' {x,z,rot,raio} | 'fogueira' | 'tendaMercador' | 'porta' {x,z,w,alt,rot}. `solido` = colide; `y0` = altura da base acima do chão. */
export function pecasDoPOI(p) {
  const pe = [], put = o => pe.push(o);
  if (p.tipo === 'acampamento') {
    put({ forma: 'fogueira', x: p.x, z: p.z, raio: 0.8, solido: true });
    put({ forma: 'tenda', x: p.x - 4.4, z: p.z - 1.6, rot: 0.5, raio: 1.7, solido: true });
    put({ forma: 'tenda', x: p.x - 2.6, z: p.z + 4.2, rot: -0.4, raio: 1.7, solido: true });
    // Comércio: a barraca do mercador faz parte do acampamento (a loja só abre aqui, por escolha explícita)
    put({ forma: 'tendaMercador', x: p.x + 4.4, z: p.z - 2.8, rot: 0.3, raio: 2.0, solido: true });
  } else if (p.tipo === 'dungeon') {
    const r = p.rumo, at = (f, l) => { const [dx, dz] = rodar(r, f, l); return [p.x + dx, p.z + dz]; };
    for (const l of [-2.1, 2.1]) { const [x, z] = at(0, l); put({ forma: 'cilindro', x, z, raio: 0.55, alt: 4.6, solido: true }); }
    { const [x, z] = at(0, 0); put({ forma: 'caixa', x, z, w: 5.4, d: 1.1, alt: 0.9, y0: 4.6, rot: r + Math.PI / 2 }); }
    // porta (a passagem em si é "fechada" por colisão: só se entra interagindo)
    { const [x, z] = at(-0.2, 0); put({ forma: 'porta', x, z, w: 3.6, alt: 4.2, rot: r + Math.PI / 2 }); for (const l of [-1.2, 0, 1.2]) { const [sx, sz] = at(-0.6, l); put({ forma: 'bloqueio', x: sx, z: sz, raio: 0.8, solido: true }); } }
    // paredão de rocha ao redor e atrás do portão (a "encosta" onde a cripta foi cavada)
    const n = 9; for (let i = 0; i < n; i++) {
      const a = -1.2 + (2.4 * i) / (n - 1), rr = 4.8 + (i % 2) * 1.2, [dx, dz] = rodar(r + Math.PI, rr * Math.cos(a), rr * Math.sin(a)), esc = 1.2 + ((i * 7) % 5) * 0.15;
      put({ forma: 'pedra', x: p.x + dx, z: p.z + dz, raio: 1.5 * esc, esc, estica: 1.9, solido: true });
    }
    for (const l of [-3.4, 3.4]) { const [x, z] = at(0.4, l); put({ forma: 'braseiro', x, z, raio: 0.5, solido: true }); }
  } else if (p.subtipo === 'ruinas') {
    const r = p.rumo; const alts = [4.2, 2.6, 3.6, 1.8, 3.0];
    for (let i = 0; i < 5; i++) { const a = r + i * 1.25, [dx, dz] = ang(a, 4.3 + (i % 2) * 0.9); put({ forma: 'cilindro', x: p.x + dx, z: p.z + dz, raio: 0.6, alt: alts[i], solido: true }); }
    for (let i = 0; i < 3; i++) { const a = r + 0.6 + i * 2.0, [dx, dz] = ang(a, 6.2); put({ forma: 'caixa', x: p.x + dx, z: p.z + dz, w: 3.4, d: 0.8, alt: 1.2 + i * 0.5, rot: a + Math.PI / 2, solido: true }); }
    for (let i = 0; i < 4; i++) { const a = r + 0.3 + i * 1.5, [dx, dz] = ang(a, 2.2 + (i % 2)); put({ forma: 'pedra', x: p.x + dx, z: p.z + dz, raio: 0.5, esc: 0.7 + i * 0.1 }); }
  } else if (p.subtipo === 'fortaleza') {
    const r = p.rumo, at = (f, l) => { const [dx, dz] = rodar(r, f, l); return [p.x + dx, p.z + dz]; };
    for (const l of [-6.5, 6.5]) { const [x, z] = at(0, l); put({ forma: 'cilindro', x, z, raio: 2.3, alt: 10.5, solido: true, ameias: true }); }
    for (const l of [-4.0, 4.0]) { const [x, z] = at(0, l); put({ forma: 'caixa', x, z, w: 3.0, d: 1.4, alt: 5.5, rot: r + Math.PI / 2, solido: true }); }
    for (const s of [-1, 1]) for (const k of [1, 2, 3]) { const [x, z] = at(0, s * (8.8 + k * 3.2)); put({ forma: 'caixa', x, z, w: 3.4, d: 1.3, alt: 4.8 - k * 0.55, rot: r + Math.PI / 2, solido: true }); }
    { const [x, z] = at(0, 0); put({ forma: 'caixa', x, z, w: 3.0, d: 1.4, alt: 1.4, y0: 6.4, rot: r + Math.PI / 2 }); put({ forma: 'braseiro', x: at(1.8, -2.4)[0], z: at(1.8, -2.4)[1], raio: 0.5, solido: true }); put({ forma: 'braseiro', x: at(1.8, 2.4)[0], z: at(1.8, 2.4)[1], raio: 0.5, solido: true }); }
  } else if (p.subtipo === 'portao') {
    const r = p.rumo, at = (f, l) => { const [dx, dz] = rodar(r, f, l); return [p.x + dx, p.z + dz]; };
    for (const l of [-4.6, 4.6]) { const [x, z] = at(0, l); put({ forma: 'cilindro', x, z, raio: 1.5, alt: 12, solido: true, obsidiana: true }); }
    { const [x, z] = at(0, 0); put({ forma: 'caixa', x, z, w: 12.4, d: 1.8, alt: 1.6, y0: 12, rot: r + Math.PI / 2, obsidiana: true }); }
    for (const l of [-7.4, 7.4]) { const [x, z] = at(0.5, l); put({ forma: 'pedra', x, z, raio: 2.4, esc: 1.7, solido: true }); }
  }
  return pe;
}
/** Círculos de colisão [x, z, raio] de um ponto do mundo. */
export function solidosDoPOI(p) {
  const out = [];
  for (const pc of pecasDoPOI(p)) {
    if (!pc.solido) continue;
    if (pc.forma === 'caixa') {
      const comp = Math.max(pc.w, pc.d), larg = Math.min(pc.w, pc.d), n = Math.max(1, Math.ceil(comp / (larg * 0.9))), dirx = Math.cos(pc.rot), dirz = Math.sin(pc.rot);
      for (let i = 0; i < n; i++) { const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * (comp - larg); const along = pc.w >= pc.d ? [dirx, dirz] : [-dirz, dirx]; out.push([pc.x + along[0] * t, pc.z + along[1] * t, larg * 0.55]); }
    } else out.push([pc.x, pc.z, pc.raio]);
  }
  return out;
}

// ---------- estradas (ligam acampamentos de territórios vizinhos + o ramal da dungeon) ----------
function polilinha(a, b, sem) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz), nx = -dz / len, nz = dx / len, amp = Math.min(20, len * 0.14), n = Math.max(4, Math.round(len / 32)), pts = [[a[0], a[1]]];
  for (let i = 1; i < n; i++) { const t = i / n, off = (ruido(sem, t * 3.7, 0.5) - 0.5) * 2 * amp * Math.sin(Math.PI * t); pts.push([a[0] + dx * t + nx * off, a[1] + dz * t + nz * off]); }
  pts.push([b[0], b[1]]); return pts;
}
export const ESTRADAS_PONTOS = ESTRADAS.map(([a, b], i) => ({ de: a, para: b, pontos: polilinha(REGIOES[a].acampamento, REGIOES[b].acampamento, 7000 + i * 31) }));
for (const d of Object.values(DUNGEONS)) { const fr = [d.entradaMundo.x + Math.cos(d.entradaMundo.rumo) * 5, d.entradaMundo.z + Math.sin(d.entradaMundo.rumo) * 5]; ESTRADAS_PONTOS.push({ de: d.regiao, para: `dg:${d.id}`, pontos: polilinha(REGIOES[d.regiao].acampamento, fr, 9100) }); }
const SEGMENTOS = []; for (const e of ESTRADAS_PONTOS) for (let i = 0; i < e.pontos.length - 1; i++) SEGMENTOS.push([e.pontos[i][0], e.pontos[i][1], e.pontos[i + 1][0], e.pontos[i + 1][1]]);
export function distEstrada(x, z) {
  let md = 1e9; for (let i = 0; i < SEGMENTOS.length; i++) {
    const s = SEGMENTOS[i], vx = s[2] - s[0], vz = s[3] - s[1], l2 = vx * vx + vz * vz, t = l2 ? Math.max(0, Math.min(1, ((x - s[0]) * vx + (z - s[1]) * vz) / l2)) : 0, d = Math.hypot(x - (s[0] + vx * t), z - (s[1] + vz * t)); if (d < md) md = d;
  } return md;
}

// ---------- territórios (pesos), limites e altura ----------
const W = new Float64Array(N), S = new Float64Array(N);
function calcularPesos(x, z) {
  let smin = 1e9; for (let i = 0; i < N; i++) { S[i] = Math.hypot(x - CX[i], z - CZ[i]) / RA[i]; if (S[i] < smin) smin = S[i]; }
  let soma = 0; for (let i = 0; i < N; i++) { W[i] = Math.exp(-(S[i] - smin) * K_MISTURA); soma += W[i]; } for (let i = 0; i < N; i++) W[i] /= soma; return smin;
}
/** Pesos [0..1] (soma 1) de cada território no ponto, na ordem de IDS. Cópia segura. */
export function pesosEm(x, z) { calcularPesos(x, z); return Array.from(W); }
/** Território dominante no ponto (id). */
export function territorioEm(x, z) { let melhor = 0, ms = 1e9; for (let i = 0; i < N; i++) { const s = Math.hypot(x - CX[i], z - CZ[i]) / RA[i]; if (s < ms) { ms = s; melhor = i; } } return IDS[melhor]; }
/** 0 no coração do mundo, 1 na borda do terreno firme; > 1 = montanhas intransponíveis. */
export function mascara(x, z, de = distEstrada(x, z)) {
  let m = de / 40; for (let i = 0; i < N; i++) { const k = Math.hypot(x - CX[i], z - CZ[i]) / (RA[i] * 1.15); if (k < m) m = k; } return m;
}
export const LIMITE_MASCARA = 1.18;

// Zonas planas: início, acampamentos, chefe, entradas de dungeon, marcos.
const PLANOS = [];
{
  const ini = REGIOES[REGIAO_INICIAL].inicio; PLANOS.push([ini[0], ini[1], 7]);
  for (const id of IDS) { const r = REGIOES[id]; PLANOS.push([r.acampamento[0], r.acampamento[1], 8]); if (r.chefe) PLANOS.push([r.chefe.pos[0], r.chefe.pos[1], 12]); }
  for (const d of Object.values(DUNGEONS)) PLANOS.push([d.entradaMundo.x, d.entradaMundo.z, 7], [d.entradaMundo.x + Math.cos(d.entradaMundo.rumo) * 5, d.entradaMundo.z + Math.sin(d.entradaMundo.rumo) * 5, 5]);
  for (const m of MARCOS) PLANOS.push([m.pos[0], m.pos[1], m.tipo === 'fortaleza' ? 16 : m.tipo === 'portao' ? 12 : 8]);
}
function alturaRegiao(i, lx, lz) { const s = SEM[i]; return (ruido(s, lx * 0.035, lz * 0.035) * 1.0 + ruido(s + 7, lx * 0.09, lz * 0.09) * 0.45 + ruido(s + 13, lx * 0.22, lz * 0.22) * 0.12 - 0.8) * REL[i]; }

/** Altura do terreno em qualquer ponto do mundo exterior (contínua entre territórios). */
export function alturaGlobal(x, z) {
  calcularPesos(x, z);
  let hb = 0; for (let i = 0; i < N; i++) if (W[i] > 0.003) hb += W[i] * alturaRegiao(i, x - CX[i], z - CZ[i]);
  const de = distEstrada(x, z), e = 1 - suave(2.2, 11, de);
  let h = hb * (1 - 0.85 * e), plano = 0;
  for (let i = 0; i < PLANOS.length; i++) { const p = PLANOS[i], d = Math.hypot(x - p[0], z - p[1]); if (d < p[2] + 9) { const v = 1 - suave(p[2], p[2] + 9, d); if (v > plano) plano = v; } }
  h *= 1 - plano;
  return h + suave(1.0, 1.25, mascara(x, z, de)) * 34;
}
/** Fator de estrada [0..1] (1 = no meio da estrada) — usado para colorir o chão e reduzir o relevo. */
export const fatorEstrada = (x, z) => 1 - suave(2.2, 6.5, distEstrada(x, z));
export function inclinacao(x, z) { const e = 0.75; const dx = (alturaGlobal(x + e, z) - alturaGlobal(x - e, z)) / (2 * e), dz = (alturaGlobal(x, z + e) - alturaGlobal(x, z - e)) / (2 * e); return Math.hypot(dx, dz); }

// ---------- limites do mundo ----------
export const LIMITES = (() => { let a = 1e9, b = 1e9, c = -1e9, d = -1e9; for (let i = 0; i < N; i++) { const r = RA[i] * 1.3; a = Math.min(a, CX[i] - r); b = Math.min(b, CZ[i] - r); c = Math.max(c, CX[i] + r); d = Math.max(d, CZ[i] + r); } return { minX: Math.floor(a), minZ: Math.floor(b), maxX: Math.ceil(c), maxZ: Math.ceil(d) }; })();
export const MAPA_COLUNAS = Math.ceil((LIMITES.maxX - LIMITES.minX) / P.celulaMapa), MAPA_LINHAS = Math.ceil((LIMITES.maxZ - LIMITES.minZ) / P.celulaMapa);
/** Índice da célula de mapa que contém (x, z), ou -1 fora do mundo. */
export function celulaDe(x, z) { const cx = Math.floor((x - LIMITES.minX) / P.celulaMapa), cz = Math.floor((z - LIMITES.minZ) / P.celulaMapa); return cx < 0 || cz < 0 || cx >= MAPA_COLUNAS || cz >= MAPA_LINHAS ? -1 : cz * MAPA_COLUNAS + cx; }
export function centroDaCelula(i) { const cz = Math.floor(i / MAPA_COLUNAS), cx = i % MAPA_COLUNAS; return [LIMITES.minX + (cx + 0.5) * P.celulaMapa, LIMITES.minZ + (cz + 0.5) * P.celulaMapa]; }

// ---------- adereços por chunk (desenho + colisão) ----------
export const RAIO_SOLIDO = { pinheiro: 0.45, arvore_morta: 0.35, pedra: 0, pedra_grande: 1.45, arbusto: 0, lapide: 0.4, cristal: 0.55, cristal_rubro: 0.6, estalagmite: 0.55, pilar: 0.7 };
const CHUNKS = new Map(), MAX_CHUNKS_CACHE = 80;
const FIXOS = new Map(); // chunk → círculos fixos das construções
for (const p of PONTOS) for (const c of solidosDoPOI(p)) { const k = `${Math.floor(c[0] / TAM_CHUNK)},${Math.floor(c[1] / TAM_CHUNK)}`; (FIXOS.get(k) || FIXOS.set(k, []).get(k)).push(c); }
const RAIOS_LIVRES = PONTOS.map(p => [p.x, p.z, p.tipo === 'acampamento' ? 9 : p.tipo === 'dungeon' ? 11 : p.subtipo === 'fortaleza' ? 24 : p.subtipo === 'portao' ? 16 : 12]);
{ const ini = REGIOES[REGIAO_INICIAL].inicio; RAIOS_LIVRES.push([ini[0], ini[1], 7]); for (const id of IDS) { const c = REGIOES[id].chefe; if (c) RAIOS_LIVRES.push([c.pos[0], c.pos[1], 14]); } }

export function propsDoChunk(cx, cz) {
  const chave = `${cx},${cz}`; let lista = CHUNKS.get(chave); if (lista) return lista;
  const rng = criarRng((SEMENTE_MUNDO ^ Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663)) >>> 0), x0 = cx * TAM_CHUNK, z0 = cz * TAM_CHUNK, tent = Math.round((TAM_CHUNK * TAM_CHUNK) / 20); lista = [];
  for (let t = 0; t < tent; t++) {
    const x = x0 + rng.proximo() * TAM_CHUNK, z = z0 + rng.proximo() * TAM_CHUNK, u = rng.proximo(), v = rng.proximo(), esc = 0.7 + rng.proximo() * 0.9, rot = rng.proximo() * 6.28, k = rng.proximo();
    const de = distEstrada(x, z); if (de < 4.4 || mascara(x, z, de) > 1.2) continue;
    let perto = false; for (let i = 0; i < RAIOS_LIVRES.length; i++) { const q = RAIOS_LIVRES[i]; if (Math.hypot(x - q[0], z - q[1]) < q[2]) { perto = true; break; } } if (perto) continue;
    calcularPesos(x, z); let acc = 0, ri = N - 1; for (let i = 0; i < N; i++) { acc += W[i]; if (u <= acc) { ri = i; break; } }
    const tipos = REGIOES[IDS[ri]].visual.props, tipo = tipos[Math.floor(v * tipos.length)];
    if (inclinacao(x, z) > 1.0) continue;
    lista.push({ tipo, x, z, y: alturaGlobal(x, z), rot, esc, k, raio: (RAIO_SOLIDO[tipo] || 0) * esc });
  }
  if (CHUNKS.size >= MAX_CHUNKS_CACHE) CHUNKS.delete(CHUNKS.keys().next().value);
  CHUNKS.set(chave, lista); return lista;
}
/** Há obstáculo sólido (adereço ou construção) a menos de `r` do ponto? */
export function colideObstaculo(x, z, r) {
  const cx = Math.floor(x / TAM_CHUNK), cz = Math.floor(z / TAM_CHUNK);
  for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
    const nx = cx + dx, nz = cz + dz, bx = nx * TAM_CHUNK, bz = nz * TAM_CHUNK; if (x < bx - 4 || x > bx + TAM_CHUNK + 4 || z < bz - 4 || z > bz + TAM_CHUNK + 4) continue;
    for (const o of propsDoChunk(nx, nz)) if (o.raio > 0 && Math.hypot(x - o.x, z - o.z) < o.raio + r) return true;
    const f = FIXOS.get(`${nx},${nz}`); if (f) for (const c of f) if (Math.hypot(x - c[0], z - c[1]) < c[2] + r) return true;
  } return false;
}
/** Pode o corpo (raio r) estar neste ponto do mundo exterior? (limite do mundo + inclinação + obstáculos) */
export function caminhavelExterior(x, z, r = P.raioHeroi) {
  if (mascara(x, z) > LIMITE_MASCARA) return false;
  if (inclinacao(x, z) > P.inclinacaoMax) return false;
  return !colideObstaculo(x, z, r);
}
export const dentroDoMundo = (x, z) => mascara(x, z) <= LIMITE_MASCARA;
export const posicaoInicial = () => ({ x: REGIOES[REGIAO_INICIAL].inicio[0], z: REGIOES[REGIAO_INICIAL].inicio[1] });
export const indiceDaRegiao = indice;
