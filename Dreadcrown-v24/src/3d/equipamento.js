/* =====================================================================
   Equipamento e armaduras por classe (Orc)
   ---------------------------------------------------------------------
   RESPONSABILIDADE: GLBActor.prototype.dress monta armas, armaduras, adereços e tecido de cada classe sobre o esqueleto do Orc, usando "follow" (peça presa a um osso, em espaço do corpo).
   RELAÇÃO COM OUTROS MÓDULOS: Usa atores.js, kit.js, tecido.js, arco.js, primitivas.js. Chamado por combate3d.makeHero.
   API PÚBLICA: GLBActor.prototype.dress(classe, corAcento, tema).
   REGRAS / CUIDADOS: Cada classe é um bloco if/else dentro de dress. Para mudar o visual de uma classe edite só o seu bloco. As subclasses por enquanto só mudam cores de runas/gemas (acento).
   ===================================================================== */
import { BowRig } from './arco.js';
import { GLBActor } from './atores.js';
import { curvedBlade, cy, featherGeo, gGlow, gM, glowSprite, pv, ring, skullMesh, sp, spikeAt, straightBlade, taperTube } from './kit.js';
import { eye } from './personagens.js';
import { BOX, G, darken } from './primitivas.js';
import { clothStrips, swayStrips } from './tecido.js';
import { Quaternion, T, TAU, V3, clamp, lerp } from '../core/util.js';

/* ---------- equipamento por classe sobre o Orc 3D ---------- */
GLBActor.prototype.dress = function (cls, accent, th) {
  const body = this.body; this.gear = [];
  this.root.updateMatrixWorld(true); this.mixer && this.mixer.update(0); this.root.updateMatrixWorld(true);
  const _hb = this.b.head; const _hy = _hb ? body.worldToLocal(_hb.getWorldPosition(V3())).y : this.height * .8; const S = clamp(_hy / 1.6, .5, 1.4) * (this.gearK || 1); this.gearS = S; this.headY = _hy;
  const bq = new Quaternion();
  const bodyInv = () => { body.getWorldQuaternion(bq); return bq.clone().invert(); };
  const bPos = b => { b.updateWorldMatrix(true, false); return body.worldToLocal(b.getWorldPosition(V3())); };
  const bQ = b => { const q = new Quaternion(); b.getWorldQuaternion(q); return bodyInv().multiply(q); };
  const B = this.b, n = this.model.nodes, find = rx => n.find(x => rx.test(x.name));
  const pelvis = find(/Pelvis/i), fore = { L: find(/L Forearm/i), R: find(/R Forearm/i) }, up = { L: find(/L UpperArm/i), R: find(/R UpperArm/i) };
  const GS = this.gearGS || .72;
  const follow = (bone, obj, off, q0, k) => {
    const Qri = bQ(bone).invert(), o = off.clone().multiplyScalar(S), q00 = q0 || new Quaternion();
    obj.scale.setScalar(S * GS * (k || 1)); body.add(obj); this.collectMats(obj);
    const e = { obj, orient: null, upd: (s, p) => { const rel = bQ(bone).multiply(Qri); obj.position.copy(o).applyQuaternion(rel).add(bPos(bone)); obj.quaternion.copy(rel).multiply(q00); if (e.orient) e.orient(s, p, rel); } };
    e.upd(0, {}); this.gear.push(e); return e;
  };
  const Qfrom = (a, b) => new Quaternion().setFromUnitVectors(a.clone().normalize(), b.clone().normalize());
  /* direção em que o Orc segura a espada (pose de repouso) */
  const hs = this.swordHand, handL = B.handL === hs ? B.handR : B.handL;
  const sw = this.sword; let dirR = V3(.4, .9, 0).normalize();
  if (sw) { const bb = new T.Box3(), sm = []; sw.traverse(o => { if (o.isMesh) sm.push(o); }); sm.forEach(m => { m.geometry.computeBoundingBox(); const t = m.geometry.boundingBox.clone().applyMatrix4(m.matrix); bb.union(t); });
    const sz = bb.getSize(V3()), ctr = bb.getCenter(V3()); const ax = sz.x > sz.y && sz.x > sz.z ? V3(1, 0, 0) : sz.y > sz.z ? V3(0, 1, 0) : V3(0, 0, 1);
    sw.updateWorldMatrix(true, false); const qW = new Quaternion(); sw.getWorldQuaternion(qW);
    const cW = body.worldToLocal(ctr.clone().applyMatrix4(sw.matrixWorld)), hp = bPos(hs); let d = ax.applyQuaternion(qW).applyQuaternion(bodyInv()); if (d.dot(cW.sub(hp)) < 0) d.negate(); dirR = d.normalize();
    if (cls !== 'tanke') sm.forEach(m => m.visible = false); }
  if (cls !== 'tanke' && this.sword) { const sj = this.model.skins[0] ? this.model.skins[0].bones.indexOf(this.sword) : -1;
    this.model.skinned.forEach(m => { const si = m.geometry.attributes.skinIndex, sw_ = m.geometry.attributes.skinWeight; if (!si) return; const bones = m.skeleton.bones; let only = true, any = false;
      for (let i = 0; i < si.count && only; i++) for (let k = 0; k < 4; k++) if (sw_.getComponent(i, k) > .01) { any = true; if (bones[si.getComponent(i, k)] !== this.sword) { only = false; break; } }
      if (only && any) m.visible = false; }); }
  const dirL = V3(dirR.x, dirR.y, -dirR.z);
  const D = V3(0, -1, 0);
  const Yv = V3(0, 1, 0), mid = (a, b) => bPos(b).sub(bPos(a)).multiplyScalar(.5 / S), dirOf = (a, b) => bPos(b).sub(bPos(a)).normalize();
  const hand = (b, w, dir, nat, off, k) => follow(b, w, off || V3(), Qfrom(nat, dir), k);
  const acc = accent, accDark = darken(accent, .45).getStyle(), sn = Math.sin;
  const spine = B.spine2 || B.spine1, hip = pelvis, head = B.head;
  const strips = (e, g, amp) => { const o = e.orient; e.orient = (s, p, rel) => { swayStrips(g, this.t, amp || .12); o && o(s, p, rel); }; };
  const staffOrient = (e, lo, hi) => { e.orient = (s, p) => { const a = lerp(lo, hi, s); e.obj.quaternion.copy(Qfrom(Yv, V3(sn(a), Math.cos(a), 0))); }; };
  const hornPair = (pts, r0, r1, c, parentBone, off, rot) => [-1, 1].forEach(z => { const P = pts.map(p => V3(p.x, p.y, p.z * z)); const h = new T.Mesh(taperTube(P, r0, r1, 28, 12), gM('bone', c)); follow(parentBone, G(h), off.clone().multiply(V3(1, 1, z)), rot); });

  if (cls === 'mago') {                                   /* ===== XAMÃ ORC ===== */
    /* cajado de osso torcido com crânio e orbe rúnico */
    const sg = new T.Group(); const shaft = new T.Mesh(taperTube(pv(0, -.25, 0, .03, .3, .02, -.03, .8, -.02, .02, 1.3, .01, 0, 1.75, 0), .05, .035, 44, 10, 16), gM('leather', '#8a6a46'));
    const orb = new T.Mesh(new T.SphereGeometry(.15, 24, 18), gGlow(acc, 2.6)); orb.position.y = 1.95; this.orb = orb;
    const gl = glowSprite(acc, .85); gl.position.y = 1.95; sg.add(shaft, orb, gl);
    [0, 1, 2, 3].forEach(i => { const a = i / 4 * TAU; const P = pv(Math.cos(a) * .06, 1.62, Math.sin(a) * .06, Math.cos(a) * .2, 1.8, Math.sin(a) * .2, Math.cos(a) * .17, 2.02, Math.sin(a) * .17, Math.cos(a) * .06, 2.16, Math.sin(a) * .06); sg.add(new T.Mesh(taperTube(P, .028, .006, 16, 8), gM('bone', '#d9ceb0'))); });
    const sk = skullMesh(acc, .75); sk.position.set(.1, 1.5, 0); sg.add(sk);
    [[-.07, 1.38, .02, '#c04a2a'], [-.08, 1.34, -.05, '#e0d6b4'], [-.06, 1.4, .07, acc]].forEach(([x, y, z, c]) => { const f = new T.Mesh(featherGeo(.34, .06), gM('cloth', c, { dbl: true })); f.position.set(x, y, z); f.rotation.z = Math.PI + .1; sg.add(f); });
    const e = hand(hs, sg, dirR, Yv, null, .95); staffOrient(e, .25, 1.45);
    const eo = e.orient; e.orient = (s, p, rel) => { eo(s, p, rel); const k = 2.4 + sn(this.t * 3) * .9; orb.material.emissiveIntensity = k; gl.material.opacity = .65 + sn(this.t * 3) * .25; };
    /* cocar: chifres de osso + testeira de couro + penas */
    hornPair(pv(0, 0, 0, -.05, .14, .08, -.03, .28, .16, .06, .42, .16), .04, .007, '#d9ceb0', head, V3(-.02, .1, .1));
    const hb = ring(.18, .03, '#3a2418', 'leather', 28); hb.rotation.x = Math.PI / 2; follow(head, G(hb), V3(-.01, .1, 0));
    const hg = new T.Mesh(new T.SphereGeometry(.045, 14, 10), gGlow(acc, 2.4)); follow(head, G(hg), V3(.17, .1, 0));
    [[-1, '#c04a2a'], [1, acc], [-1, '#e0d6b4'], [1, '#c04a2a']].forEach(([z, c], i) => { const f = new T.Mesh(featherGeo(.55, .08), gM('cloth', c, { dbl: true })); f.rotation.set(0, 0, Math.PI + .25 - i * .05); const gf = G(f); follow(head, gf, V3(-.14, .1 - i * .01, z * (.1 + i * .035)), new Quaternion().setFromEuler(new T.Euler(z * .5, 0, .35))); });
    /* colar de presas + crânio */
    const nk = new T.Group(); for (let i = 0; i < 13; i++) { const a = (i / 13) * TAU; const t = spikeAt('#e8dec0', .018, .11, 'bone'); t.rotation.z = Math.PI; t.position.set(Math.cos(a) * .24, -.05, Math.sin(a) * .3); nk.add(t); }
    nk.add(ring(.24, .018, '#3a2418', 'leather', 28).rotateX(Math.PI / 2)); nk.children[nk.children.length - 1].scale.set(1, 1.25, 1); const ps = skullMesh(acc, .5); ps.position.set(.26, -.2, 0); nk.add(ps);
    follow(spine, nk, V3(.04, .2, 0));
    /* ombro com pele e crânio */
    [up.L].forEach(b => { if (!b) return; const f = new T.Mesh(new T.SphereGeometry(.2, 24, 14), gM('fur', '#8a5a3a')); f.scale.set(1, .6, 1); const g = G(f); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU, c = new T.Mesh(new T.ConeGeometry(.04, .17, 6), gM('fur', '#7a4a2a')); c.position.set(Math.cos(a) * .18, -.04, Math.sin(a) * .18); c.rotation.z = Math.cos(a) * 1.2; c.rotation.x = -Math.sin(a) * 1.2; g.add(c); } const s2 = skullMesh(acc, .42); s2.position.set(.02, .12, -.14); s2.rotation.y = -Math.PI / 2; g.add(s2); follow(b, g, V3(0, .08, 0)); });
    /* saiote esfarrapado + cinto + traseira */
    const sk1 = clothStrips(16, .3, .8, .15, '#8a4a3a'); const sk2 = clothStrips(12, .26, .62, .15, '#4a5a8a'); sk2.position.y = .02; const skirt = G(sk1, sk2);
    const bt = ring(.28, .035, '#2a1c14', 'leather', 28); bt.rotation.x = Math.PI / 2; skirt.add(bt); const bg = new T.Mesh(BOX(.12, .12, .05, .02), gM('metal', '#b08a3e')); bg.position.set(.3, 0, 0); bg.rotation.y = Math.PI / 2; skirt.add(bg);
    const e2 = follow(hip, skirt, V3(.02, .06, 0)); strips(e2, sk1, .1);
    const cp = clothStrips(9, .2, 1.0, .16, accDark, { arc: 2.4, rot: Math.PI }); const e3 = follow(spine, cp, V3(0, .16, 0)); strips(e3, cp, .14);
  } else if (cls === 'paladino') {                        /* ===== CAMPEÃO ORC ===== */
    /* martelo de guerra */
    const wg = new T.Group(); const hd = new T.Mesh(BOX(.34, .26, .26, .05), gM('metal', '#6a6f80')); hd.position.y = -.6;
    const hr = [-1, 1].map(s => { const p = spikeAt('#8a8fa0', .06, .16); p.rotation.z = s * Math.PI / 2; p.position.set(0, -.6, s * .21); p.rotation.x = s * Math.PI / 2; return p; });
    const bk = spikeAt('#8a8fa0', .07, .2); bk.rotation.z = -Math.PI / 2; bk.position.set(.26, -.6, 0); const tp = spikeAt('#8a8fa0', .06, .2); tp.rotation.z = Math.PI; tp.position.y = -.8;
    const rn = new T.Mesh(new T.BoxGeometry(.2, .05, .27), gGlow(acc, 2.0)); rn.position.y = -.6;
    const hl = cy(.045, .05, .85, 'leather', '#3a2418', 14); hl.position.y = -.25; const wr = [0, 1, 2, 3].map(i => { const r = ring(.052, .012, '#d9ceb0', 'bone', 14); r.rotation.x = Math.PI / 2; r.position.y = -.05 - i * .1; return r; });
    const pom = new T.Mesh(new T.SphereGeometry(.06, 14, 10), gM('metal', '#b08a3e')); pom.position.y = .18;
    wg.add(hd, ...hr, bk, tp, rn, hl, ...wr, pom); hand(hs, wg, dirR, V3(0, -1, 0), null, 1.0);
    /* escudo redondo de guerra */
    const sh = new T.Group(); const disc = cy(.5, .5, .07, 'metal', '#585d6c', 40); disc.rotation.x = Math.PI / 2; const rim = ring(.5, .04, '#b08a3e', 'metal', 44); const inr = ring(.34, .02, acc, 'metal', 40); inr.material = gGlow(acc, 1.8);
    const boss = new T.Mesh(new T.SphereGeometry(.14, 20, 12, 0, TAU, 0, Math.PI / 2), gM('metal', '#b08a3e')); boss.rotation.x = Math.PI / 2; boss.position.z = .035; const bsp = spikeAt('#d8c690', .035, .14); bsp.rotation.x = Math.PI / 2; bsp.position.z = .16;
    sh.add(disc, rim, inr, boss, bsp); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; const r = sp(.03, 'metal', '#b08a3e', 8, 6); r.position.set(Math.cos(a) * .44, Math.sin(a) * .44, .04); sh.add(r); } const em = skullMesh(acc, .55); em.rotation.set(0, -Math.PI / 2, 0); em.position.set(0, .26, .05); sh.add(em);
    follow(handL, sh, V3(.28, -.08, 0), new Quaternion().setFromAxisAngle(V3(0, 1, 0), Math.PI / 2), 1.15);
    /* ombreiras escalonadas com espinhos */
    [up.L, up.R].forEach(b => { if (!b) return; const g = new T.Group(); [[.2, 0], [.17, -.06], [.14, -.11]].forEach(([r, y], i) => { const d = new T.Mesh(new T.SphereGeometry(r, 28, 14, 0, TAU, 0, Math.PI * .55), gM('metal', i % 2 ? '#5a5f6e' : '#737889')); d.position.y = y; g.add(d); const rm = ring(r * .82, .018, '#b08a3e', 'metal', 28); rm.rotation.x = Math.PI / 2; rm.position.y = y - .02; g.add(rm); });
      [0, 1, 2].forEach(i => { const sp_ = spikeAt('#8a8fa0', .035, .18); const a = (i - 1) * .7; sp_.position.set(Math.sin(a) * .2, .2, Math.cos(a) * .0 + (i - 1) * .1); sp_.rotation.z = -a * .6; g.add(sp_); }); g.scale.y = .7; follow(b, g, V3(0, -.02, 0), new Quaternion().setFromEuler(new T.Euler((b === up.R ? 1 : -1) * .75, 0, 0)), .6); });
    /* gorjal e peitoral */
    const gj = ring(.24, .06, '#737889', 'metal', 32); gj.rotation.x = Math.PI / 2; gj.scale.set(1, 1.2, 1); const gj2 = ring(.24, .015, '#b08a3e', 'metal', 32); gj2.rotation.x = Math.PI / 2; gj2.position.y = .05; gj2.scale.set(1, 1.2, 1); follow(spine, G(gj, gj2), V3(.03, .2, 0));
    const pl = new T.Group(); const bp = new T.Mesh(BOX(.12, .56, .62, .05), gM('metal', '#6b7080')); const ctr = new T.Mesh(BOX(.14, .5, .08, .02), gM('metal', '#b08a3e')); const em2 = skullMesh(acc, .55); em2.position.set(.1, .06, 0); em2.rotation.y = 0; pl.add(bp, ctr, em2);
    [0, 1, 2].forEach(i => { const l = new T.Mesh(BOX(.1, .1, .55 - i * .02, .03), gM('metal', '#5a5f6e')); l.position.set(0, -.36 - i * .085, 0); pl.add(l); });
    follow(spine, pl, V3(.24, -.08, 0));
    /* tabardo e cinto */
    const tb = clothStrips(7, .3, .85, .2, '#7a1c1c', { arc: 1.7, rot: 0 }), tb2 = clothStrips(7, .3, .85, .2, '#7a1c1c', { arc: 1.7, rot: Math.PI }); const tg = G(tb, tb2); const bl = ring(.3, .045, '#2a1c14', 'leather', 30); bl.rotation.x = Math.PI / 2; const bu = new T.Mesh(BOX(.14, .16, .07, .03), gM('metal', '#b08a3e')); bu.position.set(.32, 0, 0); bu.rotation.y = Math.PI / 2; const bg2 = new T.Mesh(new T.SphereGeometry(.04, 12, 10), gGlow(acc, 2.5)); bg2.position.set(.35, 0, 0); tg.add(bl, bu, bg2);
    const e = follow(hip, tg, V3(.02, .06, 0)); strips(e, tb, .09); const o0 = e.orient; e.orient = (s, p, rel) => { o0(s, p, rel); swayStrips(tb2, this.t, .09); };
    /* disco solar atrás da cabeça */
    const halo = new T.Group(); const hr2 = ring(.34, .028, '#ffd870', 'metal', 48); hr2.material = gGlow('#ffd870', 2.2); const hr3 = ring(.24, .015, '#ffd870', 'metal', 40); hr3.material = gGlow('#fff2b0', 2.4); halo.add(hr2, hr3);
    for (let i = 0; i < 14; i++) { const a = i / 14 * TAU, r = new T.Mesh(new T.ConeGeometry(.026, .17, 6), gGlow('#ffd870', 2)); r.position.set(Math.cos(a) * .42, Math.sin(a) * .42, 0); r.rotation.z = a - Math.PI / 2; halo.add(r); }
    const hh = G(halo); halo.rotation.y = Math.PI / 2; hh.scale.setScalar(.72); const e4 = follow(head, hh, V3(-.2, .12, 0)); e4.orient = (s, p, rel) => { halo.rotation.x = this.t * .8; };
  } else if (cls === 'clerigo') {                         /* ===== SACERDOTE TOTÊMICO ===== */
    /* cajado-totem entalhado */
    const tg = new T.Group(); const shaft = cy(.05, .06, 1.9, 'leather', '#3a2418', 14); shaft.position.y = .55; tg.add(shaft);
    [[1.5, '#8a6a46'], [1.78, '#9a7650'], [2.06, '#8a6a46']].forEach(([y, c], i) => { const b = new T.Mesh(BOX(.2, .25, .2, .04), gM('leather', c)); b.position.y = y; tg.add(b); [-1, 1].forEach(z => { const eye = new T.Mesh(new T.SphereGeometry(.026, 10, 8), gGlow(acc, 2.6)); eye.position.set(.1, y + .04, z * .05); tg.add(eye); }); const br = new T.Mesh(new T.BoxGeometry(.04, .03, .12), gM('bone', '#d9ceb0')); br.position.set(.11, y - .04, 0); tg.add(br); });
    const crown = []; [-1, 1].forEach(z => { const h = new T.Mesh(taperTube(pv(0, 2.2, z * .04, 0, 2.3, z * .16, -.02, 2.46, z * .26, .05, 2.66, z * .26), .03, .006, 20, 8), gM('bone', '#d9ceb0')); tg.add(h); });
    const ob = new T.Mesh(new T.SphereGeometry(.1, 20, 14), gGlow(acc, 2.6)); ob.position.y = 2.28; const og = glowSprite(acc, .7); og.position.y = 2.28; tg.add(ob, og); this.orb = ob;
    const rr = ring(.2, .012, acc, 'metal', 40); rr.material = gGlow(acc, 2); rr.position.y = 2.28; tg.add(rr);
    [[.0, 1.38, '#c04a2a'], [.05, 1.34, '#e0d6b4'], [-.05, 1.36, acc]].forEach(([z, y, c]) => { const f = new T.Mesh(featherGeo(.4, .07), gM('cloth', c, { dbl: true })); f.position.set(-.08, y, z); f.rotation.z = Math.PI + .1; tg.add(f); });
    for (let i = 0; i < 4; i++) { const ch = new T.Mesh(new T.CylinderGeometry(.012, .012, .2 + i * .04, 5), gM('bone', '#d9ceb0')); ch.position.set(.1, 1.2 - i * .02, -.1 + i * .07); tg.add(ch); }
    const e = hand(hs, tg, dirR, Yv, null, .8); staffOrient(e, .25, 1.45); const eo = e.orient; e.orient = (s, p, rel) => { eo(s, p, rel); rr.rotation.x = this.t * 1.4; rr.rotation.y = this.t * .9; ob.material.emissiveIntensity = 2.4 + sn(this.t * 3) * .9; };
    /* crânio no topo + leque de penas */
    const sk = skullMesh(acc, .8); const sg = G(sk); sk.rotation.z = .5;
    hornPair(pv(0, 0, 0, -.07, .07, .04, -.07, .18, .1, -.01, .3, .11), .03, .005, '#d9ceb0', head, V3(-.08, .26, .06), new Quaternion());
    follow(head, sg, V3(.0, .26, 0));
    const fan = new T.Group(); for (let i = 0; i < 9; i++) { const f = new T.Mesh(featherGeo(.44 - Math.abs(i - 4) * .03, .05), gM('cloth', ['#c04a2a', '#e0d6b4', acc][i % 3], { dbl: true })); f.rotation.z = (i - 4) * .26; fan.add(f); } fan.rotation.y = Math.PI / 2; const e5 = follow(head, G(fan), V3(-.2, .06, 0)); e5.orient = (s, p) => { fan.rotation.x = sn(this.t * 1.3) * .03; };
    /* contas, colar, manto ritual */
    const bd = new T.Group(); for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; const b = sp(.036 + (i % 5 === 0 ? .02 : 0), i % 5 === 0 ? 'metal' : 'bone', i % 5 === 0 ? acc : (i % 2 ? '#d9ceb0' : '#6a4a2a'), 10, 8); if (i % 5 === 0) b.material = gGlow(acc, 1.6); b.position.set(Math.cos(a) * .26, -Math.abs(Math.sin(a * .5)) * .02 - (Math.cos(a) > 0 ? .18 * Math.cos(a) : 0), Math.sin(a) * .33); bd.add(b); }
    follow(spine, bd, V3(.04, .18, 0));
    const rb = clothStrips(18, .27, .9, .17, '#d8c9a0'), rb2 = clothStrips(14, .24, .75, .17, '#8a3a24'); rb2.position.y = .03; const rg = G(rb, rb2); const sash = cy(.28, .28, .14, 'cloth', accDark, 28); rg.add(sash);
    const e2 = follow(hip, rg, V3(.0, .08, 0)); strips(e2, rb, .09);
    [-1, 1].forEach(z => { const st = new T.Mesh(BOX(.03, .85, .13, .01), gM('cloth', '#e8e0cc')); const rn = new T.Mesh(new T.BoxGeometry(.035, .5, .045), gGlow(acc, .9)); st.add(rn); follow(hip, st, V3(.27, -.4, z * .14)); });
    const cp = clothStrips(8, .2, .85, .16, '#a89a78', { arc: 2.2, rot: Math.PI }); const e3 = follow(spine, cp, V3(0, .12, 0)); strips(e3, cp, .12);
    /* espíritos orbitando */
    const sps = new T.Group(); const orbs = [0, 1, 2].map(i => { const o = new T.Mesh(new T.SphereGeometry(.04, 14, 10), gGlow(acc, 2.6)); const g = glowSprite(acc, .22); o.add(g); sps.add(o); return o; });
    const e6 = follow(spine, sps, V3(0, 0, 0)); e6.orient = (s, p, rel) => { orbs.forEach((o, i) => { const a = this.t * 1.5 + i * TAU / 3; o.position.set(Math.cos(a) * .6, .05 + sn(this.t * 2 + i * 2) * .2, Math.sin(a) * .6); }); };
  } else if (cls === 'assassino') {                       /* ===== CAÇADOR DAS SOMBRAS ===== */
    const mkDag = () => { const g = new T.Group(); const bl = new T.Mesh(curvedBlade(.62, .14, .035, .13), gM('metal', '#9aa0ac')); bl.position.y = -.1; const ed = new T.Mesh(curvedBlade(.62, .06, .02, .13), gGlow(acc, 1.6)); ed.position.set(.04, -.1, 0); ed.scale.set(1, .98, 1.5);
      const gr = cy(.034, .04, .26, 'leather', '#1e1418', 12); gr.position.y = .1; const rg = [0, 1, 2].map(i => { const r = ring(.04, .01, '#d9ceb0', 'bone', 10); r.rotation.x = Math.PI / 2; r.position.y = .04 + i * .08; return r; }); const gd = new T.Mesh(BOX(.2, .035, .09, .015), gM('metal', '#b08a3e')); gd.position.y = -.06; const pm = ring(.04, .012, '#b08a3e', 'metal', 12); pm.position.y = .25; g.add(bl, ed, gr, ...rg, gd, pm); return g; };
    hand(hs, mkDag(), dirR, V3(0, -1, 0), null, 1.1); hand(handL, mkDag(), dirL, V3(0, -1, 0), null, 1.1);
    /* capuz com cauda */
    const hood = new T.Mesh(new T.SphereGeometry(.2, 32, 20, 0, TAU, 0, Math.PI * .66), gM('cloth', '#2a2638', { dbl: true })); hood.rotation.z = .08; const tail = new T.Mesh(new T.ConeGeometry(.1, .45, 12), gM('cloth', '#2a2638')); tail.rotation.z = Math.PI / 2 + .35; tail.position.set(-.28, -.04, 0);
    const brow = new T.Mesh(new T.TorusGeometry(.2, .03, 8, 28, Math.PI), gM('leather', '#2a1c14')); brow.rotation.set(0, Math.PI / 2, 0); brow.rotation.z = .1; const hg = G(hood, tail); const e = follow(head, hg, V3(-.03, .1, 0)); const e0 = e.orient; e.orient = (s, p, rel) => { tail.rotation.z = Math.PI / 2 + .35 + sn(this.t * 2) * .06; };
    const ey = [-1, 1].map(z => { const m = new T.Mesh(new T.SphereGeometry(.018, 8, 6), gGlow(acc, 3)); m.position.set(.17, .12, z * .07); return m; }); follow(head, G(...ey), V3(0, 0, 0));
    /* manto rasgado + lenço */
    const cp = clothStrips(11, .3, 1.05, .17, '#34304a', { arc: 2.7, rot: Math.PI }); const cp2 = clothStrips(7, .26, .8, .15, accDark, { arc: 1.8, rot: Math.PI + .3 }); cp2.position.y = .05; const cg = G(cp, cp2); const e2 = follow(spine, cg, V3(0, .14, 0)); strips(e2, cp, .15); const o2 = e2.orient; e2.orient = (s, p, rel) => { o2(s, p, rel); swayStrips(cp2, this.t + 1, .13); };
    const sc = clothStrips(5, .2, .55, .13, acc, { arc: 1.2, rot: Math.PI }); const e3 = follow(spine, sc, V3(0, .24, 0)); strips(e3, sc, .2);
    /* bandoleira com facas */
    const bg = new T.Group(); const sr = new T.Mesh(BOX(.06, 1.0, .12, .02), gM('leather', '#2a1c14')); sr.rotation.x = .75; bg.add(sr);
    for (let i = 0; i < 5; i++) { const k = new T.Group(); const b = new T.Mesh(straightBlade(.2, .05, .014), gM('metal', '#aab0bc')); b.position.y = .04; const h = cy(.014, .016, .09, 'leather', '#1e1418', 8); h.position.y = .1; k.add(b, h); k.position.set(.08, -.3 + i * .15, -.3 * .0 + (i - 2) * .11 * 1.0); k.rotation.x = .75; k.position.z = (i - 2) * .12; k.position.y = (i - 2) * .12 * 1.0; bg.add(k); }
    follow(spine, bg, V3(.2, -.06, 0));
    /* braçadeiras, saiote curto */
    [[fore.L, handL], [fore.R, hs]].forEach(([a, b]) => { if (!a || !b) return; const w = cy(.12, .1, .36, 'cloth', '#1e1a26', 18); [0, 1, 2].forEach(i => { const r = ring(.115, .008, acc, 'metal', 18); r.material = gGlow(acc, .8); r.rotation.x = Math.PI / 2; r.position.y = -.1 + i * .1; w.add(r); }); follow(a, G(w), mid(a, b), Qfrom(Yv, dirOf(a, b)), 1); });
    const lc = clothStrips(10, .28, .55, .15, '#1e1a26'), lc2 = clothStrips(6, .24, .42, .14, acc); lc2.position.y = .02; const lg = G(lc, lc2); const e4 = follow(hip, lg, V3(.0, .06, 0)); strips(e4, lc, .14);
  } else if (cls === 'arqueiro') {                        /* ===== CAÇADOR ORC ===== */
    this.swapArms = true;
    /* arco funcional (IK + corda deformável + flecha) */
    { const isR = hs === B.handR; const sd = isR ? 'R' : 'L', od = isR ? 'L' : 'R';
      this.rig = new BowRig(this, { acc, S, GS, body, bowUp: up[sd], bowFore: fore[sd], bowHand: hs, offUp: up[od], offFore: fore[od], offHand: handL, head: head || B.head, dirR, bowIsR: isR }); }
    /* manto de pele + troféus */
    const fr = new T.Group(); for (let i = 0; i < 20; i++) { const a = i / 20 * TAU; const c = new T.Mesh(new T.ConeGeometry(.06, .26, 7), gM('fur', i % 2 ? '#9a7048' : '#7a5030')); c.position.set(Math.cos(a) * .3, -.02 + sn(i * 1.7) * .02, Math.sin(a) * .38); c.rotation.z = -Math.cos(a) * 1.15; c.rotation.x = Math.sin(a) * 1.15; fr.add(c); }
    const fb = new T.Mesh(new T.SphereGeometry(.3, 24, 14, 0, TAU, 0, Math.PI * .5), gM('fur', '#5a3c24')); fb.scale.set(1, .5, 1.3); fr.add(fb); const tk = skullMesh(acc, .4, '#cfc4a4'); tk.position.set(.3, -.1, .1); fr.add(tk); [0, 1, 2].forEach(i => { const t = spikeAt('#e8dec0', .018, .1, 'bone'); t.position.set(.28, -.18 - i * .02, -.1 + i * .07); t.rotation.z = Math.PI; fr.add(t); });
    follow(spine, fr, V3(.02, .15, 0));
    /* testeira com penas */
    const hb = ring(.18, .03, '#3a2418', 'leather', 28); hb.rotation.x = Math.PI / 2; follow(head, G(hb), V3(-.01, .1, 0));
    [[-1, acc], [1, '#c04a2a'], [-1, '#e0d6b4']].forEach(([z, c], i) => { const f = new T.Mesh(featherGeo(.5, .075), gM('cloth', c, { dbl: true })); const g = G(f); f.rotation.z = Math.PI * .75; follow(head, g, V3(-.14, .1 + i * .03, z * (.12 + i * .02)), new Quaternion().setFromEuler(new T.Euler(z * .45, 0, .2 - i * .12))); });
    [-1, 1].forEach(z => { const t = spikeAt('#e8dec0', .02, .16, 'bone'); t.rotation.z = Math.PI + .2; follow(head, G(t), V3(.16, -.02, z * .09)); });
    /* aljava e flechas */
    const q = new T.Group(); const qb = cy(.11, .09, .8, 'leather', '#4a2e1c', 20); q.add(qb); [0, 1, 2].forEach(i => { const r = ring(.1, .012, '#b08a3e', 'metal', 18); r.rotation.x = Math.PI / 2; r.position.y = -.28 + i * .28; q.add(r); });
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, ar = new T.Group(); const sh = cy(.01, .01, .55, 'bone', '#d9ceb0', 6); sh.position.y = .42; const f = new T.Mesh(featherGeo(.14, .035), gM('cloth', i % 2 ? acc : '#c04a2a', { dbl: true })); f.position.y = .6; ar.add(sh, f); ar.position.set(Math.cos(a) * .045, 0, Math.sin(a) * .045); q.add(ar); }
    q.rotation.z = .35; follow(spine, q, V3(-.28, .0, .2));
    const sb = new T.Mesh(BOX(.06, .95, .1, .02), gM('leather', '#2a1c14')); sb.rotation.x = -.7; follow(spine, G(sb), V3(.06, -.02, 0));
    /* braçadeiras, cinto, saiote, troféus */
    [[fore.L, handL], [fore.R, hs]].forEach(([a, b]) => { if (!a || !b) return; const w = cy(.12, .1, .34, 'leather', '#3a2418', 18); [0, 1, 2, 3].forEach(i => { const r = ring(.115, .008, '#d9ceb0', 'bone', 18); r.rotation.x = Math.PI / 2; r.position.y = -.12 + i * .08; w.add(r); }); follow(a, G(w), mid(a, b), Qfrom(Yv, dirOf(a, b)), 1); });
    const ls = clothStrips(11, .29, .55, .14, '#4a3a22'), ls2 = clothStrips(7, .25, .42, .13, '#6a4a2a'); ls2.position.y = .02; const lg = G(ls, ls2); const bt = ring(.29, .04, '#2a1c14', 'leather', 28); bt.rotation.x = Math.PI / 2; lg.add(bt); const pc = new T.Mesh(BOX(.16, .18, .12, .04), gM('leather', '#7a5a3a')); pc.position.set(.1, -.12, .3); lg.add(pc); [0, 1, 2, 3].forEach(i => { const t = spikeAt('#e8dec0', .018, .11, 'bone'); t.rotation.z = Math.PI; t.position.set(.2 - i * .08, -.1, -.3); lg.add(t); });
    const e4 = follow(hip, lg, V3(.0, .06, 0)); strips(e4, ls, .12);
  }
};
