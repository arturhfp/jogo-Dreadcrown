/* =====================================================================
   Interior de uma dungeon em 3D (v28)
   ---------------------------------------------------------------------
   RESPONSABILIDADE: desenha o interior de uma dungeon a partir da MESMA grade de células que a colisão usa (rules/dungeon.js → grade):
   o que se vê como chão/parede é exatamente o que colide. Chão e paredes são UMA malha cada (cores por vértice, ladrilhos e tom por sala),
   mais decoração (pilares, sarcófagos, braseiros, tochas), os baús e a porta de saída. Iluminação sombria: pouca luz ambiente, névoa
   curta e um POOL FIXO de luzes de ponto que seguem os braseiros mais próximos do herói (número constante: sem recompilar shaders).
   RELAÇÃO COM OUTROS MÓDULOS: lê data/jogo/dungeons.js e rules/dungeon.js; é criado/destruído por world/cena.js.
   REGRAS / CUIDADOS: só desenha; baús abertos somem (estado vem de rules/mundo.js). Sem teto nem tampa nas paredes (a câmera é de terceira pessoa por cima);
   o fundo e a névoa são quase pretos, então o que está além das paredes não aparece. dispose() libera tudo.
   ===================================================================== */
import { T, isMobile } from '../core/util.js';
import { grade, salaEm, CELULA } from '../rules/dungeon.js';

const ALT_PAREDE = 4.8;
const TONS = { vestibulo: '#4a4650', corredor: '#3d3a44', rituais: '#4b3438', covil: '#3b3a2f', tesouro: '#4f4630', ossuario: '#40424a' };
const cor = h => new T.Color(h);
const tom = sala => cor(TONS[sala?.id?.replace(/\d+$/, '')] || '#44414a');

export class Dungeon3D {
  constructor(cena, def, est) {
    this.cena = cena; this.def = def; this.est = est; this.grupo = new T.Group(); cena.scene.add(this.grupo); this.t = 0; this.animados = []; this.fontes = []; this.liberar = []; this.baus = new Map();
    const g = grade(def); this.g = g; this.construirChaoEParedes(); this.construirDecoracao(); this.construirBaus(); this.construirSaida();
    this.pool = Array.from({ length: isMobile() ? 4 : 6 }, () => { const l = new T.PointLight(0xff8a45, 0, 17, 1.7); cena.scene.add(l); return l; }); this.tPool = 0;
    this.aplicarAmbiente();
  }
  aplicarAmbiente() {
    const c = this.cena, s = c.scene; s.background = cor('#050408'); s.fog = new T.Fog(cor('#050408'), 6, isMobile() ? 34 : 42); s.environmentIntensity = .16;
    c.hemi.color.set('#6a5b8f'); c.hemi.groundColor.set('#0d0a12'); c.hemi.intensity = .55; c.key.color.set('#8a93c9'); c.key.intensity = .55;
  }
  livre(cx, cz) { const g = this.g; return cx >= 0 && cz >= 0 && cx < g.cols && cz < g.rows && g.livre[cz * g.cols + cx] === 1; }
  construirChaoEParedes() {
    const g = this.g, pos = [], nor = [], col = [], idx = [], paredePos = [], paredeNor = [], paredeCol = [], paredeIdx = [];
    const quad = (P, N, C, I, a, b, c, d, n, k) => { const o = P.length / 3; P.push(...a, ...b, ...c, ...d); for (let i = 0; i < 4; i++) { N.push(...n); C.push(k[0], k[1], k[2]); } I.push(o, o + 1, o + 2, o, o + 2, o + 3); };
    const tmp = new T.Color();
    for (let cz = 0; cz < g.rows; cz++) for (let cx = 0; cx < g.cols; cx++) {
      if (!this.livre(cx, cz)) continue; const x0 = g.x0 + cx * CELULA, z0 = g.z0 + cz * CELULA, x1 = x0 + CELULA, z1 = z0 + CELULA, sala = salaEm(this.def, x0 + 1, z0 + 1), base = tom(sala);
      const xadrez = ((cx + cz) & 1) ? .86 : 1, r = .92 + (((cx * 73856093) ^ (cz * 19349663)) >>> 0) % 100 / 600; tmp.copy(base).multiplyScalar(xadrez * r);
      quad(pos, nor, col, idx, [x0, 0, z0], [x0, 0, z1], [x1, 0, z1], [x1, 0, z0], [0, 1, 0], [tmp.r, tmp.g, tmp.b]);
      // paredes: uma face para cada vizinho que não é chão
      const lados = [[0, -1, [x0, z0, x1, z0], [0, 0, 1]], [0, 1, [x1, z1, x0, z1], [0, 0, -1]], [-1, 0, [x0, z1, x0, z0], [1, 0, 0]], [1, 0, [x1, z0, x1, z1], [-1, 0, 0]]];
      for (const [dx, dz, e, n] of lados) {
        if (this.livre(cx + dx, cz + dz)) continue; const ru = .78 + (((cx * 31 + cz * 17 + dx * 7) * 2654435761) >>> 0) % 100 / 420; tmp.copy(base).multiplyScalar(.62 * ru);
        const cb = [tmp.r, tmp.g, tmp.b]; tmp.multiplyScalar(.55); const ct = [tmp.r, tmp.g, tmp.b], o = paredePos.length / 3;
        paredePos.push(e[0], 0, e[1], e[2], 0, e[3], e[2], ALT_PAREDE, e[3], e[0], ALT_PAREDE, e[1]); for (let i = 0; i < 4; i++) paredeNor.push(...n); paredeCol.push(...cb, ...cb, ...ct, ...ct); paredeIdx.push(o, o + 1, o + 2, o, o + 2, o + 3);
      }
    }
    const mk = (P, N, C, I, rug) => { const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(C, 3)); geo.setIndex(I); const mat = new T.MeshStandardMaterial({ vertexColors: true, roughness: rug, metalness: 0, side: T.DoubleSide }); this.liberar.push(geo, mat); const m = new T.Mesh(geo, mat); m.receiveShadow = true; this.grupo.add(m); return m; };
    mk(pos, nor, col, idx, .95); this.paredes = mk(paredePos, paredeNor, paredeCol, paredeIdx, 1);
  }
  malha(geo, mat, x, y, z, sombra = true) { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = sombra; m.receiveShadow = true; this.grupo.add(m); return m; }
  construirDecoracao() {
    const pedra = new T.MeshStandardMaterial({ color: 0x6b6470, roughness: 1, flatShading: true }), osso = new T.MeshStandardMaterial({ color: 0x8c8676, roughness: 1, flatShading: true }), ferro = new T.MeshStandardMaterial({ color: 0x25272c, roughness: .6, metalness: .5 }), brasa = new T.MeshBasicMaterial({ color: 0xff9a3a }), madeira = new T.MeshStandardMaterial({ color: 0x4b3622, roughness: 1 });
    const gPilar = new T.CylinderGeometry(.62, .72, ALT_PAREDE, 8), gTopo = new T.BoxGeometry(1.7, .35, 1.7), gSarc = new T.BoxGeometry(1.1, .8, 2.3), gTampa = new T.BoxGeometry(1.25, .22, 2.5), gTaca = new T.ConeGeometry(.5, .5, 7), gHaste = new T.CylinderGeometry(.07, .09, 1, 5), gChama = new T.ConeGeometry(.3, .8, 6), gTocha = new T.CylinderGeometry(.05, .07, .7, 5), gTochaF = new T.ConeGeometry(.16, .4, 5);
    this.liberar.push(pedra, osso, ferro, brasa, madeira, gPilar, gTopo, gSarc, gTampa, gTaca, gHaste, gChama, gTocha, gTochaF);
    for (const d of this.def.decoracao) {
      if (d.tipo === 'pilar') { this.malha(gPilar, pedra, d.x, ALT_PAREDE / 2, d.z); this.malha(gTopo, pedra, d.x, ALT_PAREDE, d.z); }
      else if (d.tipo === 'sarcofago') { const a = this.malha(gSarc, pedra, d.x, .4, d.z); a.rotation.y = -(d.rumo || 0); const b = this.malha(gTampa, osso, d.x, .9, d.z); b.rotation.y = -(d.rumo || 0); }
      else if (d.tipo === 'braseiro') {
        this.malha(gHaste, ferro, d.x, .5, d.z, false); const t = this.malha(gTaca, ferro, d.x, 1.05, d.z, false); t.rotation.x = Math.PI; const ch = this.malha(gChama, brasa, d.x, 1.5, d.z, false); this.animados.push(tt => { ch.scale.y = 1 + Math.sin(tt * 12 + d.x) * .2; });
        if (d.luz) this.fontes.push({ x: d.x, y: 1.9, z: d.z, forca: 4.2, cor: 0xff7a35 });
      } else if (d.tipo === 'tocha') {
        // fixada na parede mais próxima: só visual (sem luz própria)
        this.malha(gTocha, madeira, d.x, 2.3, d.z, false); const f = this.malha(gTochaF, brasa, d.x, 2.8, d.z, false); this.animados.push(tt => { f.scale.y = 1 + Math.sin(tt * 15 + d.z) * .25; });
      }
    }
  }
  construirBaus() {
    const madeira = new T.MeshStandardMaterial({ color: 0x5a3b1f, roughness: .9 }), ouro = new T.MeshStandardMaterial({ color: 0xb8892b, roughness: .4, metalness: .7, emissive: 0x3a2400, emissiveIntensity: .5 }), gCorpo = new T.BoxGeometry(1.3, .7, .9), gTampa = new T.CylinderGeometry(.45, .45, 1.3, 8, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), gFecho = new T.BoxGeometry(.22, .3, .12);
    this.liberar.push(madeira, ouro, gCorpo, gTampa, gFecho);
    for (const b of this.def.baus) {
      const gr = new T.Group(); gr.position.set(b.x, 0, b.z); const c = new T.Mesh(gCorpo, madeira); c.position.y = .35; c.castShadow = true; const t = new T.Mesh(gTampa, madeira); t.position.y = .7; t.scale.set(1, 1, 1); const f = new T.Mesh(gFecho, ouro); f.position.set(0, .62, .48); gr.add(c, t, f); gr.rotation.y = Math.atan2(-b.z, -b.x) + Math.PI / 2; this.grupo.add(gr); this.baus.set(b.id, gr);
      this.animados.push(tt => { f.material.emissiveIntensity = .45 + Math.sin(tt * 3 + b.x) * .25; });
    }
  }
  construirSaida() {
    const s = this.def.saida, pedra = new T.MeshStandardMaterial({ color: 0x5e5866, roughness: 1, flatShading: true }), luzM = new T.MeshBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: .85, side: T.DoubleSide }), gPil = new T.BoxGeometry(.7, 4.2, .9), gVig = new T.BoxGeometry(4.2, .6, .9), gLuz = new T.PlaneGeometry(2.8, 3.6);
    this.liberar.push(pedra, luzM, gPil, gVig, gLuz); const z = s.z + 1.02;
    this.malha(gPil, pedra, -1.75, 2.1, z); this.malha(gPil, pedra, 1.75, 2.1, z); this.malha(gVig, pedra, 0, 4.4, z); const luz = this.malha(gLuz, luzM, 0, 1.9, z + .1, false); this.animados.push(tt => { luz.material.opacity = .72 + Math.sin(tt * 1.6) * .12; });
    this.fontes.push({ x: 0, y: 2.2, z: s.z - .4, forca: 2.6, cor: 0x9fb4d8 });
  }
  /** Some com o baú aberto (o estado vem das regras). */
  atualizarBaus(abertos) { for (const [id, gr] of this.baus) gr.visible = !abertos?.[id]; }
  tick(dt, x, z) {
    this.t += dt; for (const f of this.animados) f(this.t);
    this.tPool -= dt; if (this.tPool <= 0) {
      this.tPool = .2; const ord = this.fontes.map(f => [Math.hypot(f.x - x, f.z - z), f]).sort((a, b) => a[0] - b[0]);
      this.pool.forEach((l, i) => { const f = ord[i] && ord[i][1]; if (f) { l.position.set(f.x, f.y, f.z); l.color.set(f.cor); l.userData.base = f.forca; l.visible = true; } else { l.userData.base = 0; l.visible = false; } });
    }
    for (const l of this.pool) l.intensity = l.userData.base ? l.userData.base * (.93 + Math.sin(this.t * 11 + l.position.x * 3) * .1) : 0;
  }
  /** Distância máxima livre (em 0..1) da câmera ao longo do segmento herói→câmera, para a câmera não atravessar paredes. */
  fracaoLivre(hx, hz, cx, cz) {
    let melhor = 1; const N = 16; for (let i = 1; i <= N; i++) { const t = i / N, x = hx + (cx - hx) * t, z = hz + (cz - hz) * t, gx = Math.floor((x - this.g.x0) / CELULA), gz = Math.floor((z - this.g.z0) / CELULA); if (!this.livre(gx, gz)) { melhor = Math.max(.12, (i - 1.4) / N); break; } }
    return melhor;
  }
  dispose() {
    this.cena.scene.remove(this.grupo); for (const o of this.liberar) o.dispose && o.dispose(); for (const l of this.pool) { this.cena.scene.remove(l); l.dispose && l.dispose(); } this.pool = []; this.baus.clear(); this.animados = []; this.fontes = [];
  }
}
