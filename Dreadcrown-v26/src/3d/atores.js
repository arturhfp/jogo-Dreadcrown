/* =====================================================================
   Atores 3D: base, esqueleto e modelo GLB
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Actor é o ator genérico (pose, ações, materiais, sombra, flash de dano). GLBActor estende Actor para modelos com esqueleto: aplica a pose aos ossos, posiciona a arma na mão e atualiza equipamentos e o arco a cada quadro.
   RELAÇÃO COM OUTROS MÓDULOS: Usa animacao.js, texturas.js, tecido.js (passo de tempo) e util.js. Humanoid/Creature (personagens.js) também estendem Actor.
   API PÚBLICA: Actor, GLBActor, rotBoneWorld, findBone, BONE_RX.
   REGRAS / CUIDADOS: Ordem de atualização em GLBActor.apply: clipe → pose → IK/arco → arma → equipamento. O IK precisa vir ANTES do equipamento, pois braçadeiras seguem os ossos já posicionados.
   ===================================================================== */
import { ACTIONS, newPose, track } from './animacao.js';
import { cy, sp } from './kit.js';
import { shadowTexture } from './texturas.js';
import { Matrix4, Quaternion, T, V3, Vector3, clamp, rnd } from '../core/util.js';
import { setClothDt } from './tecido.js';

/* ---------- locomoção procedural (exploração do mundo) ---------- */
/* `ator.loc = { vel, furtivo }` (definido pela cena do mundo) faz o ator andar: pernas e braços alternam, corpo oscila e inclina. */
function caminhar(ator, p, dt) {
  const l = ator.loc, k = Math.min(1.25, l.vel / 4.2); if (k < 0.02) { ator._fase = ator._fase || 0; return; }
  ator._fase = (ator._fase || 0) + dt * (3.2 + l.vel * 1.9);
  const f = ator._fase, agach = l.furtivo ? 1 : 0;
  p.legF += Math.sin(f) * 0.8 * k; p.armR += Math.sin(f + Math.PI) * 0.55 * k; p.armL += Math.sin(f) * 0.55 * k;
  p.y += Math.abs(Math.sin(f)) * 0.06 * k * ator.sc - agach * 0.12 * ator.sc; p.lean += 0.1 * k + agach * 0.18; p.squash += agach * 0.05;
}

/* ---------- base de atores ---------- */
class Actor {
  constructor(world, o = {}) {
    this.world = world; this.dir = o.dir || 1; this.sc = o.sc || 1;
    this.root = new T.Group(); this.body = new T.Group(); this.root.add(this.body);
    this.base = V3(); this.t = rnd(10); this.cur = null; this.pose = newPose(); this.mats = []; this._alpha = 1; this._flashOn = false; this.dead = false;
    this.hold = null; this.width = o.width || 1.2;
    const sh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, opacity: .6 }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = .012; sh.renderOrder = -1; this.shadow = sh; this.root.add(sh);
  }
  collectMats(obj) {
    obj.traverse(m => { if (m.isMesh && m.material) { const ms = Array.isArray(m.material) ? m.material : [m.material]; ms.forEach(x => { if (!this.mats.includes(x)) this.mats.push(x); }); } });
  }
  setShadow(w, d) { this.shadow.scale.set(w, d || w * .7, 1); }
  anchor(name) {
    const v = V3(); this.root.updateMatrixWorld(true);
    if (name === 'feet') return this.root.getWorldPosition(v);
    if (name === 'chest') { v.set(0, this.height * .62, 0); return this.body.localToWorld(v); }
    if (name === 'head') { v.set(0, this.height * .92, 0); return this.body.localToWorld(v); }
    if (name === 'hand') { return this.handWorld ? this.handWorld(v) : (v.set(this.width * .5, this.height * .55, 0), this.body.localToWorld(v)); }
    v.set(0, this.height * .55, 0); return this.body.localToWorld(v);
  }
  play(name, o = {}) {
    const def = ACTIONS[name]; if (!def) return;
    if (this.dead && name !== 'spawn') return;
    this.cur = { name, def, t: 0, reach: o.reach || 0, fired: 0, onHit: o.onHit, onEnd: o.onEnd, speed: o.speed || 1 };
    if (name === 'die') this.dead = true;
    if (name === 'spawn') this.dead = false;
  }
  busy() { return !!this.cur && !(this.cur.def.hold && this.cur.t >= this.cur.def.dur); }
  remaining() { return this.cur ? Math.max(0, (this.cur.def.dur - this.cur.t) / this.cur.speed) : 0; }
  idlePose(p, t) { const s = this.sc, b = Math.sin(t * 2.0); p.y += b * .012 * s; p.squash += b * .008; p.armR += Math.sin(t * 1.7) * .035; p.armL -= Math.sin(t * 1.7) * .035; p.lean += Math.sin(t * 1.1) * .012; }
  update(dt) {
    this.t += dt; setClothDt(dt); const p = this.pose; Object.assign(p, newPose());
    if (!this.noIdle) this.idlePose(p, this.t);
    const c = this.cur;
    if (this.loc && !c) caminhar(this, p, dt);
    if (c) {
      c.t += dt * c.speed; const tt = Math.min(c.t, c.def.dur), ch = c.def.ch;
      for (const k in ch) {
        const v = track(ch[k], tt);
        if (k === 'x') p.x = v * (v < 0 ? Math.min(c.reach, 2.2) : c.reach) * this.dir; else if (k === 'xa') p.xa = v * this.dir;
        else if (k === 'alpha') p.alpha = v; else if (k === 'scale') p.scale = v; else if (k === 'y') p.y += v * this.sc; else p[k] += v;
      }
      while (c.fired < c.def.hit.length && c.t >= c.def.hit[c.fired]) { const i = c.fired++; try { c.onHit && c.onHit(i); } catch (e) { console.error(e); } }
      if (c.t >= c.def.dur) { const e = c.onEnd; if (!c.def.hold) this.cur = null; try { e && e(); } catch (er) { console.error(er); } if (c.def.hold) { c.onEnd = null; } }
    }
    this.root.position.set(this.base.x + p.x + p.xa, this.base.y, this.base.z + p.z);
    this.applyMaterials(p);
    this.apply(p, dt);
  }
  applyMaterials(p) {
    const a = this.alpha !== undefined ? p.alpha * this.alpha : p.alpha;
    const needT = a < .985;
    for (const m of this.mats) {
      if (m.userData.tr !== needT) { m.userData.tr = needT; m.transparent = needT || !!m.userData.baseT; m.needsUpdate = true; }
      if (needT || m.userData.lastA !== a) { m.opacity = (m.userData.baseO !== undefined ? m.userData.baseO : 1) * a; m.userData.lastA = a; }
      if (m.emissive && !m.userData.hasEmissiveMap) {
        if (p.flash > .01) { if (!m.userData.fl) { m.userData.fl = { c: m.emissive.clone(), i: m.emissiveIntensity }; } m.emissive.setRGB(1, .28, .2); m.emissiveIntensity = p.flash * 1.3; }
        else if (m.userData.fl) { m.emissive.copy(m.userData.fl.c); m.emissiveIntensity = m.userData.fl.i; m.userData.fl = null; }
      }
    }
    this.shadow.material.opacity = .6 * clamp(a, 0, 1);
    this.shadow.visible = a > .02;
  }
  apply() { }
  dispose() { this.root.traverse(o => { if (o.geometry) o.geometry.dispose(); }); this.mats.forEach(m => { m.dispose && m.dispose(); }); }
}

/* ---------- ator vindo de GLB (esqueleto) ---------- */
const BONE_RX = {
  spine1: [/spine1/i, /spine_?01|spine\.?001/i, /spine/i],
  spine2: [/spine2/i, /spine_?02|spine\.?002|chest/i],
  armR: [/\bR[ _.]?upperarm/i, /RightArm$/i, /upper_?arm[._]?R\b/i, /arm[._]?R(ight)?\b/i, /r_?shoulder/i],
  armL: [/\bL[ _.]?upperarm/i, /LeftArm$/i, /upper_?arm[._]?L\b/i, /arm[._]?L(eft)?\b/i, /l_?shoulder/i],
  handR: [/\bR[ _.]?Hand/i, /RightHand$/i, /hand[._]?R\b/i],
  handL: [/\bL[ _.]?Hand/i, /LeftHand$/i, /hand[._]?L\b/i],
  head: [/\bhead\b|Head_?\d*$|mixamorigHead$/i],
  thighR: [/\bR[ _.]?Thigh/i, /RightUpLeg$/i, /thigh[._]?R\b/i],
  thighL: [/\bL[ _.]?Thigh/i, /LeftUpLeg$/i, /thigh[._]?L\b/i]
};
function findBone(nodes, list) {
  for (const rx of list) { const n = nodes.find(n => (n.isBone || n.type === 'Bone') && rx.test(n.name) && !/finger|thumb|index|middle|ring|pinky|toe/i.test(n.name)); if (n) return n; }
  return null;
}
const _qa = new Quaternion(), _qb = new Quaternion(), _qc = new Quaternion(), _ax = new Vector3(), _m4 = new Matrix4(), _m5 = new Matrix4(), _m6 = new Matrix4();
function rotBoneWorld(bone, axisWorld, ang) {
  if (!bone || Math.abs(ang) < 1e-5) return;
  _qa.setFromAxisAngle(axisWorld, ang);
  bone.parent.getWorldQuaternion(_qb); _qc.copy(_qb).invert();
  bone.quaternion.premultiply(_qb).premultiply(_qa).premultiply(_qc);
  bone.updateMatrixWorld(true);
}

class GLBActor extends Actor {
  constructor(world, model, cfg = {}) {
    super(world, cfg);
    this.cfg = cfg; this.model = model; this.noIdle = true;
    this.holder = new T.Group(); this.holder.add(model.root); this.body.add(this.holder);
    this.collectMats(model.root);
    this.mixer = null; this.animated = new Set();
    const clip = model.clips.find(c => /idle|idel|stand|breath/i.test(c.name)) || model.clips[0];
    if (clip) {
      clip.tracks.forEach(tr => this.animated.add(tr.name.split('.')[0]));
      this.mixer = new T.AnimationMixer(model.root); this.idleAction = this.mixer.clipAction(clip); this.idleAction.setLoop(T.LoopRepeat, Infinity); this.idleAction.play();
      this.mixer.update(0.0001);
    }
    model.root.updateMatrixWorld(true);
    /* ossos */
    const n = model.nodes; this.b = {}; for (const k in BONE_RX) this.b[k] = findBone(n, BONE_RX[k]);
    this.base0 = new Map(); [this.b.spine1, this.b.spine2, this.b.armR, this.b.armL].forEach(b => b && this.base0.set(b, b.quaternion.clone()));
    /* arma que segue a mão (modelo do Orc: Sword_Dummy) */
    const sw = cfg.weaponBone ? n.find(x => cfg.weaponBone.test(x.name)) : null;
    this.swordSide = 'armR';
    if (sw && (this.b.handR || this.b.handL)) {
      const sp = sw.getWorldPosition(V3()); let best = null, bd = 1e9;
      [['handR', 'armR'], ['handL', 'armL']].forEach(([hk, ak]) => { const h = this.b[hk]; if (!h) return; const d = h.getWorldPosition(V3()).distanceTo(sp); if (d < bd) { bd = d; best = hk; this.swordSide = ak; } });
      this.sword = sw; this.swordHand = this.b[best];
      sw.updateMatrixWorld(true); this.swordHand.updateMatrixWorld(true);
      this.swordOff = new Matrix4().copy(this.swordHand.matrixWorld).invert().multiply(sw.matrixWorld);
    }
    /* normalização: altura, pés no chão, olhando para +X */
    const box = new T.Box3().setFromObject(model.root, true);
    const size = box.getSize(V3()), ctr = box.getCenter(V3());
    const H = cfg.height || 2.2; const s = H / Math.max(.01, size.y);
    this.height = H; this.sc = H / 1.8; this.width = size.x * s;
    let yaw = 0;
    const eL = n.find(x => /eye_?L/i.test(x.name)), eR = n.find(x => /eye_?R/i.test(x.name)), hd = this.b.head;
    if (cfg.yaw !== undefined) yaw = cfg.yaw;
    else if (eL && eR && hd) { const f = eL.getWorldPosition(V3()).add(eR.getWorldPosition(V3())).multiplyScalar(.5).sub(hd.getWorldPosition(V3())); yaw = Math.atan2(f.z, f.x); }
    this.holder.scale.setScalar(s); this.holder.rotation.y = yaw;
    this.holder.updateMatrixWorld(true);
    const box2 = new T.Box3().setFromObject(model.root, true), c2 = box2.getCenter(V3());
    const lp = this.holder.worldToLocal ? null : null;
    this.holder.position.set(-(c2.x - this.holder.getWorldPosition(V3()).x), -box2.min.y + this.holder.getWorldPosition(V3()).y, -(c2.z - this.holder.getWorldPosition(V3()).z));
    this.setShadow(this.width * 1.25, this.width * .8);
  }
  apply(p, dt) {
    const mx = this.mixer; if (mx) mx.update(dt * (this.timeScale || 1));
    this.body.position.set(0, p.y, 0);
    this.body.rotation.set(p.roll, p.yaw, -p.lean * .3 + p.flip); if (p.flip) { const cy = this.height * .5; this.body.position.x = Math.sin(p.flip) * cy; this.body.position.y += cy - Math.cos(p.flip) * cy; }
    const sq = p.squash, sc = p.scale; this.body.scale.set(sc * (1 - sq * .5), sc * (1 + sq), sc * (1 - sq * .5));
    this.root.updateMatrixWorld(true);
    /* reset dos ossos que o clipe não anima */
    this.base0.forEach((q, b) => { if (!this.animated.has(b.uuid)) b.quaternion.copy(q); });
    this.root.getWorldQuaternion(_qa); const Z = V3(0, 0, 1).applyQuaternion(_qa), Y = V3(0, 1, 0).applyQuaternion(_qa);
    const b = this.b;
    if (b.spine1) { rotBoneWorld(b.spine1, Z.clone(), -p.lean * .55); rotBoneWorld(b.spine1, Y.clone(), p.twist * .6); }
    if (b.spine2) { rotBoneWorld(b.spine2, Z.clone(), -p.lean * .35); rotBoneWorld(b.spine2, Y.clone(), p.twist * .4); }
    const sideMain = this.swordSide, sideOff = sideMain === 'armR' ? 'armL' : 'armR';
    if (b[sideMain]) rotBoneWorld(b[sideMain], Z.clone(), this.swapArms ? p.armL : p.armR);
    if (b[sideOff]) rotBoneWorld(b[sideOff], Z.clone(), this.swapArms ? p.armR : p.armL);
    if (b.thighR) rotBoneWorld(b.thighR, Z.clone(), p.legF * .7);
    if (b.thighL) rotBoneWorld(b.thighL, Z.clone(), -p.legF * .55);
    if (this.rig) this.rig.update(dt, p);
    if (this.sword) {
      this.swordHand.updateMatrixWorld(true);
      _m4.copy(this.swordHand.matrixWorld).multiply(this.swordOff);
      this.sword.parent.updateMatrixWorld(true); _m5.copy(this.sword.parent.matrixWorld).invert().multiply(_m4);
      _m5.decompose(this.sword.position, this.sword.quaternion, this.sword.scale); this.sword.updateMatrixWorld(true);
    }
    if (this.gear) { this.root.updateMatrixWorld(true); const s = clamp(p.armR / 1.3, 0, 1); for (const g of this.gear) g.upd(s, p); }
  }
  handWorld(v) { if (this.rig) return this.rig.tipWorld(v); const h = this.swordHand || this.b.handR; if (h) { h.updateMatrixWorld(true); return h.getWorldPosition(v); } return Actor.prototype.anchor.call(this, 'chest'); }
}

export { Actor, GLBActor };
