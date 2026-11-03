/* =====================================================================
   Física de tecido
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Simula saiotes, capas e tiras com Verlet em espaço de mundo: cada tira é uma corrente de pontos presa no cós, com gravidade, vento, inércia, colisão com o corpo e com o chão. A malha é deformada a cada quadro.
   RELAÇÃO COM OUTROS MÓDULOS: Usa kit.js. O passo de tempo vem de atores.js via setClothDt.
   API PÚBLICA: clothStrips(n, raio, comprimento, largura, cor, opções), swayStrips(grupo, tempo, amplitude), setClothDt(dt).
   REGRAS / CUIDADOS: O tecido simula em coordenadas de MUNDO (é isso que dá inércia). Não mova as tiras manualmente depois de criadas.
   ===================================================================== */
import { gM } from './kit.js';
import { T, TAU, V3 } from '../core/util.js';

/* ---- tecido com física (Verlet em espaço de mundo) ----
   Cada tira é uma corrente de 6 pontos presa no cós: inércia real quando o herói corre/salta/gira,
   gravidade, vento, colisão radial com o corpo e com o chão. A malha é deformada a cada quadro. */
let _clothDt = 1 / 60;
const CL_ROWS = 6;
function clothStrips(n, R, len, w, color, o = {}) {
  const g = new T.Group(); g.userData.strips = []; g.userData.R = R;
  const mat = gM('cloth', color, { dbl: true, mat: { roughness: .92 } });
  for (let i = 0; i < n; i++) {
    const a = (o.arc ? (i / (n - 1) - .5) * o.arc : i / n * TAU) + (o.rot || 0), L = len * (.72 + Math.random() * .46);
    const piv = new T.Group(); piv.position.set(Math.cos(a) * R, 0, Math.sin(a) * R); piv.rotation.y = -a + Math.PI / 2;
    const geo = new T.PlaneGeometry(w, L, 1, CL_ROWS - 1);
    const m = new T.Mesh(geo, mat); m.frustumCulled = false; m.castShadow = true; piv.add(m);
    piv.userData = { ph: Math.random() * 6.28, L, w, ch: null, stiff: o.stiff || 0, m };
    g.add(piv); g.userData.strips.push(piv);
  }
  return g;
}
const _cp = V3(), _cd = V3(), _cu = V3(), _cc = V3(), _cr = V3(), _cl = V3();
function swayStrips(g, t, amp = .12) {
  const dt = Math.min(_clothDt, 1 / 25); if (dt <= 0) return;
  g.updateWorldMatrix(true, true);
  const mw = g.matrixWorld; _cc.setFromMatrixPosition(mw); _cu.set(mw.elements[4], mw.elements[5], mw.elements[6]); const gs = _cu.length(); _cu.divideScalar(gs || 1);
  const subs = 2, h = dt / subs;
  for (const piv of g.userData.strips) {
    const u = piv.userData, pm = piv.matrixWorld; let ch = u.ch;
    const sW = pm.getMaxScaleOnAxis(), seg = u.L * sW / (CL_ROWS - 1);
    _cp.setFromMatrixPosition(pm);
    _cd.set(-pm.elements[4], -pm.elements[5], -pm.elements[6]).normalize();
    if (!ch) { ch = u.ch = { x: [], p: [] }; for (let r = 0; r < CL_ROWS; r++) { const q = _cp.clone().addScaledVector(_cd, seg * r); ch.x.push(q); ch.p.push(q.clone()); } }
    _cr.copy(_cp).sub(_cc); const radP = _cr.addScaledVector(_cu, -_cr.dot(_cu)).length();
    for (let s = 0; s < subs; s++) {
      for (let r = 1; r < CL_ROWS; r++) {
        const x = ch.x[r], p = ch.p[r], k = r / (CL_ROWS - 1);
        const vx = (x.x - p.x) * .985, vy = (x.y - p.y) * .985, vz = (x.z - p.z) * .985;
        p.copy(x);
        const wnd = (Math.sin(t * 1.9 + u.ph + r * .7) * .8 + Math.sin(t * 3.3 + u.ph * 2 + r) * .35) * amp * 34 * k;
        x.x += vx + wnd * .5 * h * h; x.y += vy - 15 * sW * h * h; x.z += vz + wnd * h * h;
        x.lerp(_cl.copy(_cp).addScaledVector(_cd, seg * r), (u.stiff || .006) * (1.1 - k));
      }
      for (let it = 0; it < 4; it++) {
        ch.x[0].copy(_cp);
        for (let r = 1; r < CL_ROWS; r++) {
          const a = ch.x[r - 1], b = ch.x[r]; _cl.copy(b).sub(a); const d = _cl.length() || 1e-6, diff = (d - seg) / d;
          if (r === 1) b.addScaledVector(_cl, -diff); else { a.addScaledVector(_cl, diff * .5); b.addScaledVector(_cl, -diff * .5); }
        }
        ch.x[0].copy(_cp);
        for (let r = 1; r < CL_ROWS; r++) {
          const x = ch.x[r]; _cr.copy(x).sub(_cc); const al = _cr.dot(_cu); _cr.addScaledVector(_cu, -al); const rad = _cr.length(), minR = radP * .97;
          if (rad < minR && rad > 1e-5) { _cr.multiplyScalar(minR / rad); x.copy(_cc).addScaledVector(_cu, al).add(_cr); }
          if (x.y < .03) x.y = .03;
        }
      }
    }
    const pos = u.m.geometry.attributes.position, hwBase = u.w / 2;
    for (let r = 0; r < CL_ROWS; r++) {
      _cl.copy(ch.x[r]); piv.worldToLocal(_cl);
      const k = r / (CL_ROWS - 1), hw = hwBase * (1 - .42 * Math.pow(k, 2.2)) * (1 + Math.sin(k * 5 + u.ph) * .04);
      pos.setXYZ(r * 2, _cl.x - hw, _cl.y, _cl.z); pos.setXYZ(r * 2 + 1, _cl.x + hw, _cl.y, _cl.z);
    }
    pos.needsUpdate = true; u.m.geometry.computeVertexNormals();
  }
}
/** Define o passo de tempo (s) usado pela próxima simulação; chamado por Actor.update. */
const setClothDt = v => { _clothDt = v; };


export { clothStrips, setClothDt, swayStrips };
