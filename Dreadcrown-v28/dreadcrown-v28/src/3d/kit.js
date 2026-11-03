/* =====================================================================
   Kit procedural de equipamento
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Texturas de couro/metal/pano/osso/pele, materiais (gM, gGlow) e geometrias (tubo afilado, lâminas, penas, crânio, anéis) usadas para montar armas e armaduras.
   RELAÇÃO COM OUTROS MÓDULOS: Usa util.js, primitivas.js e texturas.js. É usado por equipamento.js, arco.js e tecido.js.
   API PÚBLICA: gM, gGlow, taperTube, curvedBlade, straightBlade, featherGeo, skullMesh, ring, bx, cy, sp, spikeAt, glowSprite, pv.
   
   ===================================================================== */
import { BOX } from './primitivas.js';
import { glowTexture } from './texturas.js';
import { T, TAU, V3, col, lerp } from '../core/util.js';

/* ---------- kit de equipamento orc: texturas, geometrias e materiais ---------- */
const _gtx = {};
function gTex(kind) {
  if (_gtx[kind]) return _gtx[kind];
  const W = 256, c = document.createElement('canvas'); c.width = c.height = W; const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, W, W);
  const dots = (n, a, mx) => { for (let i = 0; i < n; i++) { const v = Math.random() < .5 ? 0 : 255; g.fillStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + Math.random() * a + ')'; const s = 1 + Math.random() * mx; g.fillRect(Math.random() * W, Math.random() * W, s, s); } };
  const lines = (n, a, len, vert) => { g.lineWidth = 1; for (let i = 0; i < n; i++) { const v = Math.random() < .6 ? 0 : 255; g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + Math.random() * a + ')'; g.beginPath(); const x = Math.random() * W, y = Math.random() * W; g.moveTo(x, y); g.lineTo(x + (vert ? Math.random() * 6 - 3 : Math.random() * len - len / 2), y + (vert ? Math.random() * len - len / 2 : Math.random() * 6 - 3)); g.stroke(); } };
  if (kind === 'leather') { dots(5000, .22, 3); lines(260, .35, 26, false); g.strokeStyle = 'rgba(0,0,0,.28)'; for (let i = 0; i < 40; i++) { g.beginPath(); const x = Math.random() * W, y = Math.random() * W; g.moveTo(x, y); g.bezierCurveTo(x + 20, y + 10, x + 30, y - 12, x + 50, y + 4); g.stroke(); } }
  else if (kind === 'metal') { lines(700, .22, 90, false); dots(1500, .35, 2); g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(Math.random() * W, Math.random() * W, 4 + Math.random() * 12, 0, TAU); g.fill(); } }
  else if (kind === 'cloth') { for (let y = 0; y < W; y += 3) { g.fillStyle = 'rgba(0,0,0,' + (.12 + Math.random() * .1) + ')'; g.fillRect(0, y, W, 1); } for (let x = 0; x < W; x += 3) { g.fillStyle = 'rgba(255,255,255,' + (.06 + Math.random() * .08) + ')'; g.fillRect(x, 0, 1, W); } dots(2500, .22, 2); }
  else if (kind === 'bone') { lines(120, .3, 50, true); dots(2200, .18, 3); g.fillStyle = 'rgba(0,0,0,.15)'; for (let i = 0; i < 30; i++) { g.beginPath(); g.arc(Math.random() * W, Math.random() * W, 2 + Math.random() * 6, 0, TAU); g.fill(); } }
  else if (kind === 'fur') { for (let i = 0; i < 2200; i++) { const v = Math.random() < .5 ? 0 : 255; g.strokeStyle = 'rgba(' + v + ',' + v + ',' + v + ',' + Math.random() * .45 + ')'; g.beginPath(); const x = Math.random() * W, y = Math.random() * W; g.moveTo(x, y); g.lineTo(x + Math.random() * 4 - 2, y + 8 + Math.random() * 14); g.stroke(); } }
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return _gtx[kind] = t;
}
const GK = {
  leather: { r: .78, m: .05, bs: 1.4, rep: 1.2 }, metal: { r: .38, m: .85, bs: .6, rep: 1.5 }, cloth: { r: .95, m: 0, bs: 1.0, rep: 2 }, bone: { r: .6, m: 0, bs: 1.2, rep: 1.2 }, fur: { r: 1, m: 0, bs: 1.6, rep: 1.5 }
};
function gM(kind, color, o = {}) {
  const k = GK[kind], t = gTex(kind).clone(); t.needsUpdate = true; t.repeat.set(k.rep * (o.rep || 1), k.rep * (o.rep || 1));
  const m = new T.MeshStandardMaterial(Object.assign({ color: col(color), map: t, bumpMap: t, bumpScale: k.bs, roughness: k.r, metalness: k.m, side: o.dbl ? T.DoubleSide : T.FrontSide }, o.mat || {}));
  return m;
}
const gGlow = (c, k = 2.2, o = {}) => new T.MeshStandardMaterial(Object.assign({ color: col(c), emissive: col(c), emissiveIntensity: k, roughness: .3 }, o));
/* tubo afilado ao longo de uma curva (chifres, arco, cajado…) */
function taperTube(pts, r0, r1, seg = 28, rad = 12, wob) {
  const cv = new T.CatmullRomCurve3(pts), P = [], N = [], UV = [], I = [];
  const fr = cv.computeFrenetFrames(seg, false);
  for (let i = 0; i <= seg; i++) {
    const u = i / seg, p = cv.getPoint(u), r = lerp(r0, r1, Math.pow(u, .9)) * (wob ? 1 + Math.sin(u * wob) * .12 : 1);
    for (let j = 0; j <= rad; j++) {
      const a = j / rad * TAU, n = fr.normals[i].clone().multiplyScalar(Math.cos(a)).addScaledVector(fr.binormals[i], Math.sin(a));
      P.push(p.x + n.x * r, p.y + n.y * r, p.z + n.z * r); N.push(n.x, n.y, n.z); UV.push(j / rad * 2, u * 4);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(UV, 2)); g.setIndex(I);
  /* ponta fechada */ return g;
}
const pv = (...a) => { const r = []; for (let i = 0; i < a.length; i += 3) r.push(V3(a[i], a[i + 1], a[i + 2])); return r; };
/* lâmina curva (kukri/adaga) extrudada; ponta para -Y, cabo na origem */
function curvedBlade(len = .62, wid = .13, depth = .03, curve = .12) {
  const s = new T.Shape(); s.moveTo(-.02, 0); s.lineTo(wid * .55, 0); s.bezierCurveTo(wid * .6 + curve, -len * .35, wid * .5 + curve, -len * .75, curve * 1.3 - .01, -len);
  s.bezierCurveTo(-wid * .05 + curve * .4, -len * .7, -wid * .3, -len * .35, -.02, 0);
  const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: depth * .5, bevelThickness: depth * .5, bevelSegments: 2, curveSegments: 16 }); g.translate(0, 0, -depth / 2);
  return g;
}
function straightBlade(len, wid, depth) {
  const s = new T.Shape(); s.moveTo(-wid / 2, 0); s.lineTo(wid / 2, 0); s.lineTo(wid / 2, -len * .86); s.lineTo(0, -len); s.lineTo(-wid / 2, -len * .86); s.closePath();
  const g = new T.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelSize: depth * .5, bevelThickness: depth * .5, bevelSegments: 2 }); g.translate(0, 0, -depth / 2); return g;
}
function featherGeo(len = .5, wid = .09) {
  const s = new T.Shape(); s.moveTo(0, 0); s.bezierCurveTo(wid, len * .25, wid * 1.1, len * .7, 0, len); s.bezierCurveTo(-wid * 1.1, len * .7, -wid, len * .25, 0, 0);
  return new T.ShapeGeometry(s, 12);
}
function skullMesh(accent, s = 1, bone = '#d9ceb0') {
  const g = new T.Group(), M = gM('bone', bone);
  const cr = new T.Mesh(new T.SphereGeometry(.13, 20, 16), M); cr.scale.set(1, .95, .9); const jaw = new T.Mesh(new T.BoxGeometry(.12, .06, .12, 2, 2, 2), M); jaw.position.set(.07, -.11, 0);
  const nose = new T.Mesh(new T.ConeGeometry(.02, .05, 4), gM('bone', '#222')); nose.rotation.z = Math.PI; nose.position.set(.12, -.03, 0);
  g.add(cr, jaw, nose);
  [-1, 1].forEach(z => { const e = new T.Mesh(new T.SphereGeometry(.032, 10, 8), new T.MeshStandardMaterial({ color: '#100804', emissive: col(accent), emissiveIntensity: 2.2 })); e.position.set(.095, .015, z * .05); g.add(e); const t = new T.Mesh(new T.ConeGeometry(.012, .06, 6), M); t.position.set(.13, -.12, z * .04); t.rotation.z = Math.PI; g.add(t); });
  g.scale.setScalar(s); return g;
}
const ring = (R, r, c, kind = 'metal', n = 28) => new T.Mesh(new T.TorusGeometry(R, r, 10, n), gM(kind, c));
const bx = (w, h, d, kind, c, o) => new T.Mesh(BOX(w, h, d, Math.min(w, h, d) * .3), gM(kind, c, o));
const cy = (r1, r2, h, kind, c, seg = 20) => new T.Mesh(new T.CylinderGeometry(r1, r2, h, seg), gM(kind, c));
const sp = (r, kind, c, ws = 24, hs = 16) => new T.Mesh(new T.SphereGeometry(r, ws, hs), gM(kind, c));
const spikeAt = (c, r, h, kind = 'metal') => new T.Mesh(new T.ConeGeometry(r, h, 12), gM(kind, c));
const glowSprite = (c, size) => { const s = new T.Sprite(new T.SpriteMaterial({ map: glowTexture(), color: col(c), blending: T.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(size); s.renderOrder = 25; return s; };

export { bx, curvedBlade, cy, featherGeo, gGlow, gM, glowSprite, pv, ring, skullMesh, sp, spikeAt, straightBlade, taperTube };
