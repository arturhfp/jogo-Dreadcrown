/* =====================================================================
   Arco funcional do arqueiro
   ---------------------------------------------------------------------
   RESPONSABILIDADE: BowRig controla o arco: puxada em fases (mão da corda vai do arco até o rosto), flexão dos membros, corda deformável com onda estacionária ao soltar, recuo, flecha encaixada e ponto de origem do projétil. Cada habilidade tem seu tempo de puxada (ARCH_LEAD).
   RELAÇÃO COM OUTROS MÓDULOS: Usa ik.js, kit.js, catalogo.js. É criado em equipamento.js e atualizado por GLBActor.apply.
   API PÚBLICA: BowRig(ator, opções), TubeRig, update(dt, pose), tipWorld().
   REGRAS / CUIDADOS: A soltura é detectada quando "d" cai de ~1 para 0 (instante de hit da ação). Ajuste ARCH_LEAD no catálogo para mudar o ritmo da puxada.
   ===================================================================== */
import { twoBoneIK } from './ik.js';
import { cy, featherGeo, gGlow, gM, pv, ring, sp, taperTube } from './kit.js';
import { BOX } from './primitivas.js';
import { T, TAU, V3, clamp, lerp } from '../core/util.js';
import { ARCH_LEAD, HERO_ARCH } from '../data/catalogo.js';

/* ---- tubo deformável (reconstruído a cada quadro) ---- */
class TubeRig {
  constructor(seg, rad, mat) {
    this.seg = seg; this.rad = rad; const n = (seg + 1) * (rad + 1);
    this.P = new Float32Array(n * 3); this.N = new Float32Array(n * 3); const UV = new Float32Array(n * 2), I = [];
    for (let i = 0; i <= seg; i++) for (let j = 0; j <= rad; j++) { UV[(i * (rad + 1) + j) * 2] = j / rad * 2; UV[(i * (rad + 1) + j) * 2 + 1] = i / seg * 4; }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; I.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = this.geo = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(this.P, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('normal', new T.BufferAttribute(this.N, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('uv', new T.BufferAttribute(UV, 2)); g.setIndex(I);
    g.boundingSphere = new T.Sphere(V3(), 10);
    this.mesh = new T.Mesh(g, mat); this.mesh.frustumCulled = false; this.mesh.castShadow = true;
  }
  set(pts, r0, r1, pw = .9) {
    const cv = new T.CatmullRomCurve3(pts), fr = cv.computeFrenetFrames(this.seg, false), rad = this.rad; let k = 0;
    for (let i = 0; i <= this.seg; i++) {
      const u = i / this.seg, p = cv.getPoint(u), r = lerp(r0, r1, Math.pow(u, pw)), nn = fr.normals[i], bb = fr.binormals[i];
      for (let j = 0; j <= rad; j++, k += 3) {
        const a = j / rad * TAU, c = Math.cos(a), s = Math.sin(a), nx = nn.x * c + bb.x * s, ny = nn.y * c + bb.y * s, nz = nn.z * c + bb.z * s;
        this.P[k] = p.x + nx * r; this.P[k + 1] = p.y + ny * r; this.P[k + 2] = p.z + nz * r; this.N[k] = nx; this.N[k + 1] = ny; this.N[k + 2] = nz;
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.normal.needsUpdate = true;
  }
}
/* ---- arco funcional: abre/fecha, mão puxa a corda, membros flexionam, corda vibra, flecha encaixada ---- */
class BowRig {
  constructor(A, o) {
    this.A = A; this.o = o; const acc = o.acc; this.Sb = o.S * o.GS * .8;
    const g = this.g = new T.Group(); g.scale.setScalar(this.Sb); o.body.add(g); A.collectMats(g);
    const L1 = pv(0, .05, 0, .15, .28, 0, .22, .65, 0, .12, 1.0, 0, -.06, 1.18, 0); this.L1 = L1;
    const mBone = gM('bone', '#e0d6b4'), mWood = gM('leather', '#4a2e1c', { dbl: false });
    this.limbs = [1, -1].map(sg => { const a = new TubeRig(30, 10, mBone), b = new TubeRig(30, 8, mWood); g.add(a.mesh, b.mesh); const cap = new T.Mesh(new T.SphereGeometry(.024, 10, 8), gGlow(acc, 2.4)); g.add(cap); return { sg, a, b, cap }; });
    this.string = new TubeRig(28, 5, gM('cloth', '#efe8d4')); g.add(this.string.mesh);
    const grp = cy(.055, .055, .34, 'leather', '#2a1c14', 14); g.add(grp);
    [-.1, 0, .1].forEach(y => { const r = ring(.058, .012, '#d9ceb0', 'bone', 12); r.rotation.x = Math.PI / 2; r.position.y = y; g.add(r); });
    const riser = new T.Mesh(taperTube(pv(0, -.2, 0, .02, -.1, 0, .03, .1, 0, 0, .2, 0), .05, .05, 8, 10), gM('bone', '#cfc4a4')); g.add(riser);
    const rest = new T.Mesh(BOX(.05, .03, .05, .01), gM('metal', '#b08a3e')); rest.position.set(.06, .05, 0); g.add(rest);
    const rn = new T.Mesh(new T.SphereGeometry(.03, 10, 8), gGlow(acc, 2.5)); rn.position.set(.075, .17, 0); g.add(rn);
    /* flecha encaixada: eixo ao longo de +Y, cauda na origem */
    const ar = this.arrow = new T.Group(); const sh = cy(.011, .011, 1.0, 'bone', '#d9ceb0', 6); sh.position.y = .5; ar.add(sh);
    const hd = new T.Mesh(new T.ConeGeometry(.032, .15, 8), gM('metal', '#c9ced6')); hd.position.y = 1.07; ar.add(hd);
    const gl = new T.Mesh(new T.SphereGeometry(.02, 8, 6), gGlow(acc, 2.2)); gl.position.y = 1.0; ar.add(gl); this.arrowGlow = gl;
    for (let i = 0; i < 3; i++) { const f = new T.Mesh(featherGeo(.2, .045), gM('cloth', i ? '#c04a2a' : acc, { dbl: true })); f.rotation.y = i / 3 * TAU; f.position.y = .03; ar.add(f); }
    g.add(ar); A.collectMats(ar); ar.visible = false;
    this.aim = 0; this.d = 0; this.dh = 0; this.ft = 0; this.vt = 99; this.pull0 = 0; this.recoil = 0; this.px = 0; this.prevD = 0; this.shot = 0;
    this.side = o.bowIsR ? 1 : -1;
  }
  stateFor(dt) {
    const A = this.A, c = A.cur; let want = 0, d = 0;
    if (c && c.def.hit && c.name !== 'die' && c.name !== 'spawn' && c.name !== 'hit' && c.name !== 'dodge' && HERO_ARCH[c.name]) {
      want = 1; const hits = c.def.hit, t = c.t; let nxt = null, prv = 0; for (const h of hits) { if (h > t) { nxt = h; break; } prv = h; }
      if (nxt !== null) { const lead = Math.min(ARCH_LEAD[c.name] || .3, Math.max(.08, (nxt - prv) * .92)); const s = clamp((t - (nxt - lead)) / lead, 0, 1); d = s * s * (3 - 2 * s); }
    }
    return [want, d];
  }
  update(dt, p) {
    const A = this.A, o = this.o, body = o.body, S = o.S; if (dt <= 0) return;
    const [want, d] = this.stateFor(dt);
    this.aim += (want - this.aim) * Math.min(1, dt * (want > this.aim ? 10 : 5)); const aw = this.aim * this.aim * (3 - 2 * this.aim);
    /* soltar: d caiu de ~1 para 0 */
    if (this.prevD > .85 && d < .3) { this.vt = 0; this.pull0 = this.px; this.recoil = 1; this.ft = 1; }
    this.prevD = d; this.d = d;
    if (d > .02) this.vt = 99;
    this.dh = d > this.dh ? d : this.dh * Math.exp(-dt * 7); this.ft *= Math.exp(-dt * 6); this.recoil *= Math.exp(-dt * 9); this.vt += dt;
    /* alvos de IK em espaço do corpo → mundo */
    const bw = v => body.localToWorld(v.clone()), bl = v => body.worldToLocal(v.clone());
    const U = o.bowUp, F = o.bowFore, H = o.bowHand, U2 = o.offUp, F2 = o.offFore, H2 = o.offHand;
    const sb = bl(U.getWorldPosition(V3())), so = bl(U2.getWorldPosition(V3())), hd = bl(o.head.getWorldPosition(V3()));
    const armL = (U.getWorldPosition(V3()).distanceTo(F.getWorldPosition(V3())) + F.getWorldPosition(V3()).distanceTo(H.getWorldPosition(V3()))) / Math.max(.001, body.getWorldScale(V3()).x);
    const gripT = V3(sb.x + armL * .8, sb.y + armL * .05, sb.z * .45);
    const cheek = V3(hd.x + .1 * S, hd.y + .02 * S, hd.z * 0 + (so.z > 0 ? 1 : -1) * .1 * S);
    const brace = .1 * S * this.Sb / .75;
    const restN = gripT.clone().add(V3(-brace, 0, 0));
    const ft = V3(-.16 * S, -.02 * S, 0).multiplyScalar(this.ft);
    const handDraw = restN.clone().lerp(cheek, this.dh).add(ft);
    if (aw > .001) {
      const cb = bl(H.getWorldPosition(V3())), cd = bl(H2.getWorldPosition(V3()));
      twoBoneIK(U, F, H, bw(cb.clone().lerp(gripT, aw)), bw(V3(sb.x - .2 * armL, sb.y - .55 * armL, sb.z + (sb.z > 0 ? 1 : -1) * .35 * armL)));
      twoBoneIK(U2, F2, H2, bw(cd.clone().lerp(handDraw, aw)), bw(V3(so.x - .9 * armL, so.y + (.15 + .35 * this.dh) * armL, so.z + (so.z > 0 ? 1 : -1) * .35 * armL)));
    }
    /* posiciona o arco no punho do arco */
    const hp = bl(H.getWorldPosition(V3()));
    const carry = o.dirR.clone().normalize(), aimUp = V3(.1, 1, 0).normalize();
    const up = carry.clone().lerp(aimUp, aw).normalize().applyAxisAngle(V3(0, 0, 1), -this.recoil * .16);
    const g = this.g; g.position.copy(hp).add(V3(-.04 * S * this.recoil, 0, 0)); g.quaternion.setFromUnitVectors(V3(0, 1, 0), up);
    g.updateMatrixWorld(true);
    const inv = g.matrixWorld.clone().invert(), toL = v => bw(v).applyMatrix4(inv);
    /* ponto da corda */
    const restL = V3(this.L1[4].x, 0, 0);
    let nock = restL.clone(); let pull = 0;
    if (this.vt < 1.4 && this.d <= .02) { pull = this.pull0 * Math.exp(-this.vt * 6.5) * Math.cos(this.vt * 34); nock.x -= pull; }
    else if (this.d > .005) { const hl = H2.getWorldPosition(V3()).applyMatrix4(inv); const wgt = this.d; nock.lerp(V3(Math.min(hl.x, restL.x), hl.y, hl.z), Math.min(1, wgt * 1.6)); pull = restL.x - nock.x; this.px = Math.max(this.px * .9, pull); }
    else { this.px *= .8; }
    if (this.d > .02) this.px = pull;
    const flex = clamp(pull, -.3, .85) * .36;
    /* membros com flexão: pontas puxam para a corda */
    const tips = [];
    this.limbs.forEach(l => {
      const P = this.L1.map((q, i) => { const u = i / 4; return V3(q.x - flex * Math.pow(u, 1.7) * 1.0, (q.y - flex * .16 * u * u) * l.sg, q.z); });
      l.a.set(P, .045, .014, .9);
      l.b.set(P.map(q => V3(q.x - .022, q.y, q.z)), .036, .01, .9);
      l.cap.position.copy(P[4]); tips.push(P[4]);
    });
    /* corda: tip → nock → tip, com onda estacionária ao soltar */
    const sp = [], N = 20;
    const vibA = (this.vt < 1.4 && this.d <= .02) ? this.pull0 * Math.exp(-this.vt * 5) * Math.cos(this.vt * 34 + .9) * .5 : 0;
    for (let i = 0; i <= N; i++) { const u = i / N; let q = u < .5 ? tips[0].clone().lerp(nock, u * 2) : nock.clone().lerp(tips[1], (u - .5) * 2); q.x += vibA * Math.sin(u * Math.PI) * (this.d > .02 ? 0 : 1); sp.push(q); }
    this.string.set(sp, .0065, .0065, 1);
    /* flecha */
    const ar = this.arrow, show = this.d > .03 && aw > .35;
    ar.visible = show;
    if (show) { const tgt = V3(.08, .05, 0), dir = tgt.clone().sub(nock).normalize(); ar.position.copy(nock); ar.quaternion.setFromUnitVectors(V3(0, 1, 0), dir); this.arrowGlow.material.emissiveIntensity = 1.2 + 1.4 * this.d; }
    this._tipL = nock.clone().add(tgt0.clone().sub(nock).normalize().multiplyScalar(1.15));
  }
  tipWorld(v) { const L = this._tipL || V3(.6, 0, 0); this.g.updateWorldMatrix(true, false); return v.copy(L).applyMatrix4(this.g.matrixWorld); }
}
const tgt0 = V3(.08, .05, 0);

export { BowRig };
