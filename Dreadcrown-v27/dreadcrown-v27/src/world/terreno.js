/* =====================================================================
   Terreno e cenário de uma região
   ---------------------------------------------------------------------
   RESPONSABILIDADE: transforma a função de altura das regras (rules/mundo.js → alturaEm) em malha 3D com
   cores por altura/ruído, espalha adereços (árvores, pedras, cristais…) com instâncias, e cria os pontos de
   interesse (fogueira do acampamento, tenda do mercador, portais).
   RELAÇÃO COM OUTROS MÓDULOS: lê data/jogo/mundo.js e rules/mundo.js; usado por world/cena.js.
   REGRAS / CUIDADOS: tudo é gerado por semente da região (sempre igual). Adereços são InstancedMesh (poucas
   chamadas de desenho) para rodar em PCs modestos. Quem chama deve usar `dispose()` ao trocar de região.
   ===================================================================== */
import { T, V3, isMobile } from '../core/util.js';
import { regiao, alturaEm, pontosDaRegiao, portalLiberado } from '../rules/mundo.js';
import { REGIOES } from '../data/jogo/mundo.js';
import { criarRng } from '../core/rng.js';

const cor = hex => new T.Color(hex);

// Geometrias simples de cada tipo de adereço (mescladas manualmente em uma só BufferGeometry).
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

export function construirTerreno(regiaoId) {
  const r = regiao(regiaoId), v = r.visual, grupo = new T.Group(), liberar = [];
  const tam = r.tamanho + 10, seg = isMobile() ? 96 : 140, geo = new T.PlaneGeometry(tam * 2, tam * 2, seg, seg); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, cores = new Float32Array(pos.count * 3), [c0, c1, c2] = v.chao.map(cor), rng = criarRng(r.semente);
  const tmp = new T.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = alturaEm(regiaoId, x, z); pos.setY(i, y);
    const n = (Math.sin(x * .31) * Math.cos(z * .27) + Math.sin(x * .93 + z * .71) * .5) * .5 + .5, alt = Math.min(1, Math.max(0, y / (r.relevo + 8)));
    tmp.copy(c0).lerp(c1, n).lerp(c2, Math.min(1, alt * 1.6)); const g = .92 + ((i * 2654435761) >>> 0) % 100 / 800; tmp.multiplyScalar(g);
    cores.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new T.BufferAttribute(cores, 3)); geo.computeVertexNormals();
  const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  const chao = new T.Mesh(geo, mat); chao.receiveShadow = true; grupo.add(chao); liberar.push(geo, mat);

  // adereços
  const alvoN = Math.round((r.tamanho * r.tamanho) / (isMobile() ? 34 : 18)), lim = r.tamanho - 3, livres = pontosDaRegiao(regiaoId).map(p => [p.x, p.z, 6]);
  livres.push([r.inicio[0], r.inicio[1], 6]); if (r.chefe) livres.push([r.chefe.pos[0], r.chefe.pos[1], 12]);
  const porTipo = Object.fromEntries(v.props.map(t => [t, []]));
  for (let i = 0; i < alvoN; i++) {
    const x = (rng.proximo() * 2 - 1) * lim, z = (rng.proximo() * 2 - 1) * lim; if (livres.some(([a, b, d]) => Math.hypot(x - a, z - b) < d)) continue;
    const tipo = v.props[Math.floor(rng.proximo() * v.props.length)], esc = .7 + rng.proximo() * .9; porTipo[tipo].push({ x, z, y: alturaEm(regiaoId, x, z), rot: rng.proximo() * 6.28, esc, k: rng.proximo() });
  }
  const m4 = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler(), s = new T.Vector3(), p = new T.Vector3(), cc = new T.Color();
  for (const [tipo, lista] of Object.entries(porTipo)) {
    if (!lista.length || !GEOS[tipo]) continue;
    const g = GEOS[tipo](), mt = new T.MeshStandardMaterial({ roughness: .9, flatShading: true, emissive: BRILHAM.has(tipo) ? cor(CORES_ADEREC[tipo][1]) : 0x000000, emissiveIntensity: BRILHAM.has(tipo) ? .55 : 0 });
    const im = new T.InstancedMesh(g, mt, lista.length); const [a, b] = CORES_ADEREC[tipo].map(cor);
    lista.forEach((o, i) => { e.set(0, o.rot, 0); q.setFromEuler(e); s.set(o.esc, o.esc * (.9 + o.k * .3), o.esc); p.set(o.x, o.y - .05, o.z); m4.compose(p, q, s); im.setMatrixAt(i, m4); cc.copy(a).lerp(b, o.k); im.setColorAt(i, cc); });
    im.castShadow = COM_SOMBRA.has(tipo); im.receiveShadow = true; im.instanceMatrix.needsUpdate = true; grupo.add(im); liberar.push(g, mt);
  }

  // pontos de interesse
  const animados = [];
  for (const pt of pontosDaRegiao(regiaoId)) {
    const y = alturaEm(regiaoId, pt.x, pt.z), no = new T.Group(); no.position.set(pt.x, y, pt.z); grupo.add(no);
    if (pt.tipo === 'acampamento') {
      const pedras = new T.Mesh(new T.TorusGeometry(.7, .2, 5, 9).rotateX(Math.PI / 2), new T.MeshStandardMaterial({ color: 0x55575c, roughness: 1 })); pedras.position.y = .15; no.add(pedras);
      const chama = new T.Mesh(new T.ConeGeometry(.38, 1.1, 7), new T.MeshBasicMaterial({ color: 0xffa23a })); chama.position.y = .75; no.add(chama);
      const luz = new T.PointLight(0xff9a45, 6, 16, 1.8); luz.position.y = 1.4; no.add(luz); animados.push(t => { chama.scale.y = 1 + Math.sin(t * 11) * .15 + Math.sin(t * 7.3) * .1; luz.intensity = 5.5 + Math.sin(t * 13) * .8; });
      for (let i = 0; i < 3; i++) { const t = new T.Mesh(new T.CylinderGeometry(.09, .09, 1.5, 5), new T.MeshStandardMaterial({ color: 0x4b3622, roughness: 1 })); t.rotation.z = Math.PI / 2; t.rotation.y = i * 2.1; t.position.set(Math.cos(i * 2.1) * .9, .12, Math.sin(i * 2.1) * .9); no.add(t); }
      liberar.push(pedras.geometry, pedras.material, chama.geometry, chama.material);
    } else if (pt.tipo === 'loja') {
      const tenda = new T.Mesh(new T.ConeGeometry(2.2, 2.2, 4).rotateY(Math.PI / 4), new T.MeshStandardMaterial({ color: 0x8c2f39, roughness: .9, flatShading: true })); tenda.position.y = 1.6; no.add(tenda);
      const base = new T.Mesh(new T.BoxGeometry(2.6, .9, 2.6), new T.MeshStandardMaterial({ color: 0x6b4f33, roughness: 1 })); base.position.y = .45; no.add(base);
      const lan = new T.PointLight(0xffd37a, 3, 10, 1.8); lan.position.set(1.6, 1.6, 1.6); no.add(lan); tenda.castShadow = true;
      liberar.push(tenda.geometry, tenda.material, base.geometry, base.material);
    } else if (pt.tipo === 'portal') {
      const liberado = true; void liberado;
      const destino = REGIOES[pt.para], lado = new T.MeshStandardMaterial({ color: 0x4a4d57, roughness: .9, flatShading: true });
      for (const sx of [-1.8, 1.8]) { const pil = new T.Mesh(new T.CylinderGeometry(.35, .45, 4.4, 7), lado); pil.position.set(sx, 2.2, 0); pil.castShadow = true; no.add(pil); }
      const viga = new T.Mesh(new T.BoxGeometry(4.6, .5, .9), lado); viga.position.y = 4.5; no.add(viga);
      const anel = new T.Mesh(new T.PlaneGeometry(3.2, 4), new T.MeshBasicMaterial({ color: cor(destino.visual.luz), transparent: true, opacity: .42, side: T.DoubleSide, depthWrite: false })); anel.position.y = 2.2; no.add(anel);
      const luz = new T.PointLight(cor(destino.visual.luz), 3.5, 14, 1.8); luz.position.y = 2.4; no.add(luz);
      // o portal aponta para o interior do mapa (para ficar legível de qualquer lado)
      no.rotation.y = Math.atan2(-pt.x, -pt.z) + Math.PI / 2;
      pt.__anel = anel; animados.push(t => { anel.material.opacity = anel.userData.bloqueado ? .12 : .35 + Math.sin(t * 2.4) * .1; luz.intensity = anel.userData.bloqueado ? .6 : 3 + Math.sin(t * 2.4); });
      anel.userData.pt = pt; no.userData.anel = anel; grupo.userData.aneis = (grupo.userData.aneis || []).concat([anel]); liberar.push(lado, viga.geometry, anel.geometry, anel.material);
    }
  }
  const atualizarPortais = heroi => { for (const a of grupo.userData.aneis || []) { const b = !portalLiberado(heroi, a.userData.pt.para); a.userData.bloqueado = b; a.material.color.set(b ? 0x802020 : cor(REGIOES[a.userData.pt.para].visual.luz)); } };
  return { grupo, animados, atualizarPortais, dispose() { for (const o of liberar) o.dispose && o.dispose(); grupo.removeFromParent(); } };
}
