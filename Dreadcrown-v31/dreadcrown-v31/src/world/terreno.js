/* =====================================================================
   Mundo exterior contínuo em streaming (v28)
   ---------------------------------------------------------------------
   RESPONSABILIDADE: desenha o mundo exterior ÚNICO (rules/geografia.js) em "chunks" de 64×64 que são criados à medida que o herói se
   aproxima e liberados quando ele se afasta. Cada chunk tem: malha do chão (cores = mistura dos territórios próximos + estrada),
   adereços em InstancedMesh e as construções (acampamentos, portão das Catacumbas, marcos). O jogador nunca vê "regiões": os chunks
   são só um detalhe técnico de memória.
   TAMBÉM: ambiente contínuo (céu, névoa, luz) como mistura dos territórios sob o herói, e um POOL FIXO de luzes de ponto
   (só as fontes mais próximas ficam acesas; o número de luzes nunca muda, para não recompilar shaders).
   RELAÇÃO COM OUTROS MÓDULOS: lê rules/geografia.js e data/jogo/mundo.js; é criado/destruído por world/cena.js.
   REGRAS / CUIDADOS: geometrias e materiais dos adereços são COMPARTILHADOS entre chunks (cache do módulo, liberado em dispose());
   o que é por chunk (chão, instâncias, peças das construções) é liberado ao descarregar. Tudo é determinístico (mesmas sementes).
   ===================================================================== */
import { T, isMobile } from '../core/util.js';
import { IDS, TAM_CHUNK, alturaGlobal, pesosEm, fatorEstrada, propsDoChunk, PONTOS, pecasDoPOI } from '../rules/geografia.js';
import { REGIOES } from '../data/jogo/mundo.js';

const cor = hex => new T.Color(hex);

// ---------- geometrias dos adereços (a identidade visual da v27 foi preservada) ----------
function fundir(geos) {
  let nv = 0, ni = 0; for (const g of geos) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni); let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3); nor.set(g.attributes.normal.array, vo * 3);
    const c = g.index ? g.index.count : g.attributes.position.count;
    for (let i = 0; i < c; i++) idx[io + i] = (g.index ? g.index.array[i] : i) + vo;
    vo += g.attributes.position.count; io += c;
  }
  const r = new T.BufferGeometry(); r.setAttribute('position', new T.BufferAttribute(pos, 3)); r.setAttribute('normal', new T.BufferAttribute(nor, 3)); r.setIndex(new T.BufferAttribute(idx, 1)); return r;
}
const mover = (g, x, y, z) => { g.translate(x, y, z); return g; };
const GEOS = {
  pinheiro: () => fundir([mover(new T.CylinderGeometry(.14, .2, 1.2, 6), 0, .6, 0), mover(new T.ConeGeometry(1.1, 1.8, 7), 0, 1.9, 0), mover(new T.ConeGeometry(.85, 1.5, 7), 0, 2.9, 0), mover(new T.ConeGeometry(.55, 1.2, 7), 0, 3.8, 0)]),
  arvore_morta: () => fundir([mover(new T.CylinderGeometry(.08, .22, 3.2, 5), 0, 1.6, 0), mover(new T.CylinderGeometry(.04, .09, 1.4, 4).rotateZ(.9), .55, 2.6, 0), mover(new T.CylinderGeometry(.03, .07, 1.1, 4).rotateZ(-1.0), -.45, 2.2, .1)]),
  pedra: () => mover(new T.DodecahedronGeometry(.7, 0).scale(1, .7, 1), 0, .35, 0),
  pedra_grande: () => mover(new T.DodecahedronGeometry(1.6, 0).scale(1, .9, 1.1), 0, .9, 0),
  arbusto: () => mover(new T.IcosahedronGeometry(.6, 0).scale(1.2, .8, 1.2), 0, .4, 0),
  lapide: () => fundir([mover(new T.BoxGeometry(.6, 1, .16), 0, .5, 0), mover(new T.CylinderGeometry(.3, .3, .16, 8).rotateX(Math.PI / 2), 0, 1, 0)]),
  cristal: () => fundir([mover(new T.OctahedronGeometry(.5, 0).scale(.7, 2, .7), 0, .9, 0), mover(new T.OctahedronGeometry(.3, 0).scale(.7, 1.8, .7).rotateZ(.4), .5, .5, .1)]),
  cristal_rubro: () => fundir([mover(new T.OctahedronGeometry(.6, 0).scale(.7, 2.4, .7), 0, 1.1, 0), mover(new T.OctahedronGeometry(.35, 0).scale(.7, 2, .7).rotateZ(-.4), -.5, .6, .1)]),
  estalagmite: () => mover(new T.ConeGeometry(.55, 2.2, 6), 0, 1.1, 0),
  pilar: () => fundir([mover(new T.CylinderGeometry(.55, .65, 3.6, 8), 0, 1.8, 0), mover(new T.BoxGeometry(1.5, .3, 1.5), 0, 3.7, 0)])
};
const CORES_ADEREC = { pinheiro: ['#27432a', '#34553a'], arvore_morta: ['#3a3029', '#4b3d33'], pedra: ['#6c6f73', '#85878a'], pedra_grande: ['#5e6166', '#787b80'], arbusto: ['#3f6a35', '#52803f'], lapide: ['#7d8085', '#9a9da1'], cristal: ['#6f5bd6', '#8a78ff'], cristal_rubro: ['#c0392b', '#ff5a3d'], estalagmite: ['#4a4455', '#5d566a'], pilar: ['#7a625a', '#93756a'] };
const BRILHAM = new Set(['cristal', 'cristal_rubro']);
const COM_SOMBRA = new Set(['pinheiro', 'arvore_morta', 'pedra_grande', 'pilar']);

// Cache de módulo: geometrias/materiais dos adereços (reutilizados por todos os chunks).
let CACHE = null;
function cache() {
  if (CACHE) return CACHE;
  const geo = {}, mat = {};
  for (const t of Object.keys(GEOS)) { geo[t] = GEOS[t](); mat[t] = new T.MeshStandardMaterial({ roughness: .9, flatShading: true, emissive: BRILHAM.has(t) ? cor(CORES_ADEREC[t][1]) : 0x000000, emissiveIntensity: BRILHAM.has(t) ? .55 : 0 }); }
  const pedraMat = new T.MeshStandardMaterial({ color: 0x5b5e66, roughness: 1, flatShading: true }), madeira = new T.MeshStandardMaterial({ color: 0x4b3622, roughness: 1 }), ferro = new T.MeshStandardMaterial({ color: 0x2a2d33, roughness: .7, metalness: .4 });
  const lona = new T.MeshStandardMaterial({ color: 0x5b4a3a, roughness: 1, flatShading: true, side: T.DoubleSide }), lonaMerc = new T.MeshStandardMaterial({ color: 0x8c2f39, roughness: .9, flatShading: true, side: T.DoubleSide });
  const brasa = new T.MeshBasicMaterial({ color: 0xffa23a }), obsidiana = new T.MeshStandardMaterial({ color: 0x1b1420, roughness: .35, metalness: .3, flatShading: true });
  const portaMat = new T.MeshStandardMaterial({ color: 0x120f12, roughness: .9, emissive: 0x1a0c08, emissiveIntensity: .6 });
  CACHE = { geo, mat, pedraMat, madeira, ferro, lona, lonaMerc, brasa, obsidiana, portaMat, chaoMat: new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 }), comum: {} };
  return CACHE;
}
function liberarCache() { if (!CACHE) return; for (const g of Object.values(CACHE.geo)) g.dispose(); for (const k of Object.keys(CACHE)) { const v = CACHE[k]; if (v && v.dispose) v.dispose(); } for (const m of Object.values(CACHE.mat)) m.dispose(); for (const g of Object.values(CACHE.comum)) g.dispose(); CACHE = null; }
/** Geometria comum (cilindro/caixa…) criada uma vez por chave e reaproveitada. */
function geoComum(chave, fabrica) { const c = cache(); return (c.comum[chave] ||= fabrica()); }
const unit = { cil: () => new T.CylinderGeometry(1, 1, 1, 10), caixa: () => new T.BoxGeometry(1, 1, 1), ped: () => new T.DodecahedronGeometry(1, 0), cone: () => new T.ConeGeometry(1, 1, 5), toro: () => new T.TorusGeometry(1, .28, 5, 10).rotateX(Math.PI / 2), esf: () => new T.IcosahedronGeometry(1, 0) };

// ---------- construções (acampamento, portão de dungeon, ruínas, fortaleza…) ----------
/** Constrói as peças de um ponto do mundo. Retorna { grupo, luzes: [{x,y,z,cor,forca}], animados: [fn(t)] }. */
function construirPOI(p) {
  const c = cache(), grupo = new T.Group(), luzes = [], animados = [], liberar = [];
  const g = (ch, f) => { const x = geoComum(ch, f); return x; };
  const malha = (geo, mat, sombra = true) => { const m = new T.Mesh(geo, mat); m.castShadow = sombra; m.receiveShadow = true; return m; };
  for (const pc of pecasDoPOI(p)) {
    const y0 = alturaGlobal(pc.x, pc.z), base = y0 + (pc.y0 || 0);
    if (pc.forma === 'fogueira') {
      const pedras = malha(g('toro', unit.toro), c.pedraMat, false); pedras.scale.set(.7, .7, .7); pedras.position.set(pc.x, y0 + .15, pc.z); grupo.add(pedras);
      const chama = malha(g('cone', unit.cone), c.brasa, false); chama.scale.set(.38, 1.1, .38); chama.position.set(pc.x, y0 + .75, pc.z); grupo.add(chama);
      for (let i = 0; i < 3; i++) { const t = malha(g('cil', unit.cil), c.madeira, false); t.scale.set(.09, 1.5, .09); t.rotation.z = Math.PI / 2; t.rotation.y = i * 2.1; t.position.set(pc.x + Math.cos(i * 2.1) * .9, y0 + .12, pc.z + Math.sin(i * 2.1) * .9); grupo.add(t); }
      animados.push(t => { chama.scale.y = 1.1 * (1 + Math.sin(t * 11) * .15 + Math.sin(t * 7.3) * .1); });
      luzes.push({ x: pc.x, y: y0 + 1.4, z: pc.z, cor: 0xff9a45, forca: 6, alcance: 16, oscila: true });
    } else if (pc.forma === 'tenda' || pc.forma === 'tendaMercador') {
      const merc = pc.forma === 'tendaMercador', r = pc.raio;
      const tenda = malha(g('cone', unit.cone), merc ? c.lonaMerc : c.lona); tenda.scale.set(r, merc ? 2.4 : 1.9, r); tenda.rotation.y = -pc.rot + Math.PI / 5; tenda.position.set(pc.x, y0 + (merc ? 1.5 : 1.0), pc.z); grupo.add(tenda);
      if (merc) {
        const balcao = malha(g('caixa', unit.caixa), c.madeira); balcao.scale.set(2.6, .9, .9); balcao.rotation.y = -pc.rot; balcao.position.set(pc.x + Math.cos(pc.rot + 1.57) * 1.9, y0 + .45, pc.z + Math.sin(pc.rot + 1.57) * 1.9); grupo.add(balcao);
        luzes.push({ x: pc.x + 1.2, y: y0 + 2.2, z: pc.z + 1.2, cor: 0xffd37a, forca: 3, alcance: 10 });
      }
    } else if (pc.forma === 'cilindro') {
      const m = malha(g('cil', unit.cil), p.tipo === 'marco' && p.subtipo === 'portao' ? c.obsidiana : c.pedraMat); m.scale.set(pc.raio, pc.alt, pc.raio); m.position.set(pc.x, y0 + pc.alt / 2, pc.z); grupo.add(m);
      if (pc.ameias) for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3, b = malha(g('caixa', unit.caixa), c.pedraMat); b.scale.set(.7, .8, .7); b.position.set(pc.x + Math.cos(a) * pc.raio * .85, y0 + pc.alt + .4, pc.z + Math.sin(a) * pc.raio * .85); grupo.add(b); }
    } else if (pc.forma === 'caixa') {
      const m = malha(g('caixa', unit.caixa), pc.obsidiana ? c.obsidiana : c.pedraMat); m.scale.set(pc.w, pc.alt, pc.d); m.rotation.y = -pc.rot; m.position.set(pc.x, base + pc.alt / 2, pc.z); grupo.add(m);
    } else if (pc.forma === 'pedra') {
      const m = malha(g('ped', unit.ped), c.pedraMat); const e = pc.esc || 1; m.scale.set(pc.raio, pc.raio * (pc.estica || .75), pc.raio); m.rotation.y = pc.x * 1.7; m.position.set(pc.x, y0 + pc.raio * (pc.estica || .75) * .6, pc.z); grupo.add(m);
      void e;
    } else if (pc.forma === 'porta') {
      const m = malha(g('caixa', unit.caixa), c.portaMat); m.scale.set(pc.w, pc.alt, .35); m.rotation.y = -pc.rot; m.position.set(pc.x, y0 + pc.alt / 2, pc.z); grupo.add(m);
      for (const k of [.28, .62]) { const b = malha(g('caixa', unit.caixa), c.ferro, false); b.scale.set(pc.w * 1.02, .18, .42); b.rotation.y = -pc.rot; b.position.set(pc.x, y0 + pc.alt * k, pc.z); grupo.add(b); }
    } else if (pc.forma === 'braseiro') {
      const taca = malha(g('cone', unit.cone), c.ferro, false); taca.scale.set(.5, .5, .5); taca.rotation.x = Math.PI; taca.position.set(pc.x, y0 + 1.0, pc.z); grupo.add(taca);
      const hast = malha(g('cil', unit.cil), c.ferro, false); hast.scale.set(.07, 1.0, .07); hast.position.set(pc.x, y0 + .5, pc.z); grupo.add(hast);
      const ch = malha(g('cone', unit.cone), c.brasa, false); ch.scale.set(.3, .75, .3); ch.position.set(pc.x, y0 + 1.5, pc.z); grupo.add(ch); animados.push(t => { ch.scale.y = .75 * (1 + Math.sin(t * 12 + pc.x) * .18); });
      luzes.push({ x: pc.x, y: y0 + 1.7, z: pc.z, cor: 0xff7a3a, forca: 3.5, alcance: 12, oscila: true });
    }
    // 'bloqueio' é só colisão (invisível).
  }
  void liberar; return { grupo, luzes, animados };
}

// ---------- chunk ----------
const ESTRADA_COR = cor('#7b6a50'), PEDRA_ALTA = cor('#8d8f92');
/** Altura numa grade com 1 anel de borda (para normais sem costura entre chunks). */
function criarChao(cx, cz, seg, coresTerr) {
  const passo = TAM_CHUNK / seg, n = seg + 1, ox = cx * TAM_CHUNK, oz = cz * TAM_CHUNK, N = n + 2;
  const H = new Float32Array(N * N); for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) H[j * N + i] = alturaGlobal(ox + (i - 1) * passo, oz + (j - 1) * passo);
  const geo = new T.PlaneGeometry(TAM_CHUNK, TAM_CHUNK, seg, seg); geo.rotateX(-Math.PI / 2); geo.translate(ox + TAM_CHUNK / 2, 0, oz + TAM_CHUNK / 2);
  const pos = geo.attributes.position, nor = geo.attributes.normal, cores = new Float32Array(pos.count * 3), tmp = new T.Color(), mix = new T.Color();
  for (let k = 0; k < pos.count; k++) {
    const x = pos.getX(k), z = pos.getZ(k), i = Math.round((x - ox) / passo), j = Math.round((z - oz) / passo), y = H[(j + 1) * N + i + 1]; pos.setY(k, y);
    const dx = (H[(j + 1) * N + i + 2] - H[(j + 1) * N + i]) / (2 * passo), dz = (H[(j + 2) * N + i + 1] - H[j * N + i + 1]) / (2 * passo), l = Math.hypot(dx, 1, dz); nor.setXYZ(k, -dx / l, 1 / l, -dz / l);
    const w = pesosEm(x, z), n1 = (Math.sin(x * .31) * Math.cos(z * .27) + Math.sin(x * .93 + z * .71) * .5) * .5 + .5; mix.setRGB(0, 0, 0);
    for (let t = 0; t < w.length; t++) {
      if (w[t] < .004) continue; const cc = coresTerr[t], alt = Math.min(1, Math.max(0, y / (REGIOES[IDS[t]].relevo + 8)));
      tmp.copy(cc[0]).lerp(cc[1], n1).lerp(cc[2], Math.min(1, alt * 1.6)); mix.r += tmp.r * w[t]; mix.g += tmp.g * w[t]; mix.b += tmp.b * w[t];
    }
    const e = fatorEstrada(x, z); if (e > .01) mix.lerp(ESTRADA_COR, e * .75);
    if (y > 14) mix.lerp(PEDRA_ALTA, Math.min(1, (y - 14) / 18));
    const gr = .92 + ((k * 2654435761) >>> 0) % 100 / 800; cores[k * 3] = mix.r * gr; cores[k * 3 + 1] = mix.g * gr; cores[k * 3 + 2] = mix.b * gr;
  }
  geo.setAttribute('color', new T.BufferAttribute(cores, 3)); geo.computeBoundingSphere(); return geo;
}

export class MundoExterior {
  /** `cena` = World (usa scene, key, hemi). Cria o ambiente e o pool de luzes; os chunks vêm de atualizar(). */
  constructor(cena) {
    this.cena = cena; this.grupo = new T.Group(); cena.scene.add(this.grupo); this.chunks = new Map(); this.fila = []; this.animados = []; this.t = 0;
    this.raio = isMobile() ? 1 : 2; this.seg = isMobile() ? 24 : 32; this.coresTerr = IDS.map(id => REGIOES[id].visual.chao.map(cor));
    this.fontes = []; this.pool = Array.from({ length: 4 }, () => { const l = new T.PointLight(0xffffff, 0, 16, 1.8); cena.scene.add(l); return l; }); this.tPool = 0;
    this.amb = { ceu: new T.Color(), nevoa: new T.Color(), luz: new T.Color(), nevoaIni: 30, nevoaFim: 120, env: .8 }; this.ambInicializado = false;
    this.nCarregados = 0; this.nLiberados = 0;
  }
  chave(cx, cz) { return cx + ',' + cz; }
  /** Garante os chunks próximos de (x, z). `forcar` constrói tudo que está no raio 1 agora; o resto, um por chamada. */
  atualizar(x, z, forcar = false) {
    const cx = Math.floor(x / TAM_CHUNK), cz = Math.floor(z / TAM_CHUNK), R = this.raio, desejados = new Set();
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) { const k = this.chave(cx + dx, cz + dz); desejados.add(k); if (!this.chunks.has(k) && !this.fila.some(f => f.k === k)) this.fila.push({ k, cx: cx + dx, cz: cz + dz, d: Math.max(Math.abs(dx), Math.abs(dz)) }); }
    this.fila = this.fila.filter(f => desejados.has(f.k)).sort((a, b) => a.d - b.d);
    let limite = forcar ? this.fila.filter(f => f.d <= 1).length : 1; while (limite-- > 0 && this.fila.length) { const f = this.fila.shift(); this.construirChunk(f.cx, f.cz, f.k); }
    for (const [k, c] of this.chunks) if (Math.max(Math.abs(c.cx - cx), Math.abs(c.cz - cz)) > R + 1) this.liberarChunk(k, c);
  }
  construirChunk(cx, cz, k) {
    const c = cache(), grupo = new T.Group(), liberar = [], ims = [];
    const geo = criarChao(cx, cz, this.seg, this.coresTerr); const chao = new T.Mesh(geo, c.chaoMat); chao.receiveShadow = true; grupo.add(chao); liberar.push(geo);
    const porTipo = {}; for (const o of propsDoChunk(cx, cz)) (porTipo[o.tipo] ||= []).push(o);
    const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), cc = new T.Color(), mobile = isMobile();
    for (const [tipo, lista0] of Object.entries(porTipo)) {
      if (!c.geo[tipo]) continue; const lista = mobile && tipo !== 'pedra_grande' && tipo !== 'pilar' ? lista0.filter((_, i) => i % 3 !== 2) : lista0; if (!lista.length) continue;
      const im = new T.InstancedMesh(c.geo[tipo], c.mat[tipo], lista.length), [a, b] = CORES_ADEREC[tipo].map(cor);
      lista.forEach((o, i) => { e.set(0, o.rot, 0); q.setFromEuler(e); s.set(o.esc, o.esc * (.9 + o.k * .3), o.esc); p.set(o.x, o.y - .05, o.z); m4.compose(p, q, s); im.setMatrixAt(i, m4); cc.copy(a).lerp(b, o.k); im.setColorAt(i, cc); });
      im.castShadow = COM_SOMBRA.has(tipo); im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; im.computeBoundingSphere(); grupo.add(im); ims.push(im);
    }
    const fontes = [], animados = [];
    for (const pt of PONTOS) if (Math.floor(pt.x / TAM_CHUNK) === cx && Math.floor(pt.z / TAM_CHUNK) === cz) { const poi = construirPOI(pt); grupo.add(poi.grupo); fontes.push(...poi.luzes); animados.push(...poi.animados); }
    this.grupo.add(grupo); this.chunks.set(k, { cx, cz, grupo, liberar, ims, fontes, animados }); this.fontes.push(...fontes); this.animados.push(...animados); this.nCarregados++;
  }
  liberarChunk(k, c) {
    this.grupo.remove(c.grupo); for (const g of c.liberar) g.dispose(); for (const im of c.ims) im.dispose(); // geometrias/materiais dos adereços e peças são compartilhados (cache)
    this.fontes = this.fontes.filter(f => !c.fontes.includes(f)); this.animados = this.animados.filter(f => !c.animados.includes(f)); this.chunks.delete(k); this.nLiberados++;
  }
  /** Mistura contínua de céu, névoa e luz conforme os territórios sob o herói (sem fronteiras duras). */
  ambiente(x, z, dt) {
    const w = pesosEm(x, z), a = this.amb, ceu = new T.Color(0, 0, 0), nev = new T.Color(0, 0, 0), luz = new T.Color(0, 0, 0); let ni = 0, nf = 0, env = 0;
    for (let i = 0; i < w.length; i++) { if (w[i] < .004) continue; const v = REGIOES[IDS[i]].visual, tc = cor(v.ceu), nc = cor(v.nevoa), lc = cor(v.luz); ceu.r += tc.r * w[i]; ceu.g += tc.g * w[i]; ceu.b += tc.b * w[i]; nev.r += nc.r * w[i]; nev.g += nc.g * w[i]; nev.b += nc.b * w[i]; luz.r += lc.r * w[i]; luz.g += lc.g * w[i]; luz.b += lc.b * w[i]; ni += v.nevoaDist[0] * w[i]; nf += v.nevoaDist[1] * w[i]; env += (REGIOES[IDS[i]].tier === 'strong' ? .5 : .8) * w[i]; }
    const k = this.ambInicializado ? Math.min(1, dt * 1.6) : 1; this.ambInicializado = true;
    a.ceu.lerp(ceu, k); a.nevoa.lerp(nev, k); a.luz.lerp(luz, k); a.nevoaIni += (ni - a.nevoaIni) * k; a.nevoaFim += (nf - a.nevoaFim) * k; a.env += (env - a.env) * k;
    const s = this.cena.scene; if (!s.background || !s.background.isColor) s.background = new T.Color(); s.background.copy(a.ceu); if (!s.fog) s.fog = new T.Fog(a.nevoa.clone(), a.nevoaIni, a.nevoaFim); s.fog.color.copy(a.nevoa); s.fog.near = a.nevoaIni; s.fog.far = a.nevoaFim;
    this.cena.key.color.copy(a.luz); this.cena.hemi.color.copy(a.luz).lerp(new T.Color('#9ab8ff'), .4); s.environmentIntensity = a.env;
  }
  /** Chamado todo quadro: animações das chamas, pool de luzes (reatribuído 4×/s) e ambiente. */
  tick(dt, x, z) {
    this.t += dt; for (const f of this.animados) f(this.t);
    this.tPool -= dt; if (this.tPool <= 0) {
      this.tPool = .25; const ord = this.fontes.map(f => [Math.hypot(f.x - x, f.z - z), f]).filter(a => a[0] < 60).sort((a, b) => a[0] - b[0]);
      this.pool.forEach((l, i) => { const f = ord[i] && ord[i][1]; if (f) { l.position.set(f.x, f.y, f.z); l.color.set(f.cor); l.distance = f.alcance; l.userData.base = f.forca; l.userData.osc = !!f.oscila; l.visible = true; } else { l.userData.base = 0; l.visible = false; } });
    }
    for (const l of this.pool) l.intensity = l.userData.base ? l.userData.base * (l.userData.osc ? .92 + Math.sin(this.t * 13 + l.position.x) * .12 : 1) : 0;
    this.ambiente(x, z, dt);
  }
  /** Estatísticas para os testes e para o diagnóstico de memória. */
  estatisticas() { let tris = 0, draws = 0; for (const c of this.chunks.values()) c.grupo.traverse(o => { if (o.isMesh) { draws++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); } }); return { chunks: this.chunks.size, carregados: this.nCarregados, liberados: this.nLiberados, desenhos: draws, triangulos: Math.round(tris), luzes: this.pool.length }; }
  dispose() {
    for (const [k, c] of [...this.chunks]) this.liberarChunk(k, c); this.cena.scene.remove(this.grupo);
    for (const l of this.pool) { this.cena.scene.remove(l); l.dispose && l.dispose(); } this.pool = []; this.fontes = []; this.animados = []; liberarCache();
  }
}
