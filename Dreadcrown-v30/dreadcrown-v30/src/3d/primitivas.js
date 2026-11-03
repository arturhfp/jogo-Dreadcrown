/* =====================================================================
   Primitivas de geometria e materiais básicos
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Fábricas de malhas com cantos arredondados (BOX, CAP, SPH…), material padrão (MAT) e helpers de cor (lighten/darken) usados pelos personagens procedurais e pelo equipamento.
   RELAÇÃO COM OUTROS MÓDULOS: Usa util.js.
   API PÚBLICA: MAT, mk, SPH, BOX, CAP, CYL, CONE, TOR, at, G, lighten, darken.
   
   ===================================================================== */
import { Color, T, clamp, col } from '../core/util.js';

/* =====================================================================
   Personagens procedurais (raça × classe × subclasse) e inimigos
   ===================================================================== */
const MAT = (c, o = {}) => { const o2 = Object.assign({}, o); delete o2.alphaT; delete o2.emissive; const m = new T.MeshStandardMaterial(Object.assign({ color: col(c), roughness: .62, metalness: .08 }, o2)); if (o.emissive !== undefined) m.emissive = col(o.emissive); if (o.alphaT) { m.transparent = true; m.userData.baseT = true; m.userData.baseO = o.alphaT; m.opacity = o.alphaT; } return m; };
const mk = (geo, c, o = {}) => { const m = new T.Mesh(geo, MAT(c, o)); return m; };
const SPH = (r, w = 14, h = 10) => new T.SphereGeometry(r, Math.max(w, 24), Math.max(h, 16));
const BOX = (x, y, z, r) => {
  const m = Math.min(x, y, z), rr = Math.min(r === undefined ? m * .38 : r, m / 2 - 1e-3), g = new T.BoxGeometry(x, y, z, 6, 6, 6);
  const p = g.attributes.position, n = g.attributes.normal, hx = x / 2 - rr, hy = y / 2 - rr, hz = z / 2 - rr, v = new T.Vector3(), c = new T.Vector3(), d = new T.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); c.set(clamp(v.x, -hx, hx), clamp(v.y, -hy, hy), clamp(v.z, -hz, hz)); d.copy(v).sub(c);
    if (d.lengthSq() > 1e-10) { d.normalize(); v.copy(c).addScaledVector(d, rr); p.setXYZ(i, v.x, v.y, v.z); n.setXYZ(i, d.x, d.y, d.z); }
  }
  return g;
};
const CAP = (r, l, s = 6, rs = 10) => new T.CapsuleGeometry(r, l, Math.max(s, 8), Math.max(rs, 20));
const CYL = (a, b, h, s = 12) => new T.CylinderGeometry(a, b, h, Math.max(s, 24));
const CONE = (r, h, s = 12) => new T.ConeGeometry(r, h, Math.max(s, 16));
const TOR = (r, t, a = 12, b = 24) => new T.TorusGeometry(r, t, a, b);
const at = (o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); return o; };
const G = (...ch) => { const g = new T.Group(); ch.forEach(c => c && g.add(c)); return g; };
const lighten = (c, k) => col(c).lerp(new Color('#ffffff'), k);
const darken = (c, k) => col(c).lerp(new Color('#000000'), k);

export { BOX, CAP, CONE, CYL, G, MAT, SPH, TOR, at, darken, mk };
