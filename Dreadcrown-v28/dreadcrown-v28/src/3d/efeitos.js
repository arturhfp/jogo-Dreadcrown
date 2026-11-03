/* =====================================================================
   Efeitos visuais (partículas e magias)
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Sistema de partículas (Particles), gerador de efeitos (FX: brilho, jato, raio, chuva, vórtice, pilar, nova, corrente, leque, corte, impacto) e as receitas por tema × habilidade (FXMAP, castFX, meleeFX).
   RELAÇÃO COM OUTROS MÓDULOS: Usa texturas.js, catalogo.js, util.js. Chamado por combate3d.js e palco.js.
   API PÚBLICA: FX, castFX(palco, tema, slot, origem, destino, aoAcertar), meleeFX, PAL, palOf.
   REGRAS / CUIDADOS: FXMAP dá 5 formas por tema (uma por raridade). Para criar um efeito novo, adicione o método em FX e referencie no FXMAP.
   ===================================================================== */
import { sp } from './kit.js';
import { at } from './primitivas.js';
import { _texCache, boltTexture, crescentTexture, glowTexture, runeTexture, streakTexture } from './texturas.js';
import { T, TAU, V3, col, lerp, pick, rnd } from '../core/util.js';

/* =====================================================================
   Efeitos visuais: partículas, sprites, runas e receitas por tema × habilidade
   ===================================================================== */
const PAL = {
  fire: ['#fff0b0', '#ff8a2a', '#8a1a06'], ice: ['#f2feff', '#7fd8ff', '#2a6ac0'], lightning: ['#ffffff', '#fff08a', '#8a7cff'],
  dark: ['#e4b8ff', '#9a4be0', '#2a0c48'], shadow: ['#b8c0ff', '#5a48c0', '#120a30'], holy: ['#ffffff', '#ffe27a', '#ffb83a'],
  poison: ['#eaff9a', '#86d83a', '#2a6012'], blood: ['#ffb0a8', '#e0222f', '#4a0610'], ghost: ['#f4ffff', '#a4e4f0', '#4a8aa0'],
  nature: ['#e6ffc0', '#62d868', '#1e6a2a'], astral: ['#fff4ff', '#b08aff', '#4a3ad8'], elemental: null, physical: ['#ffffff', '#ffd9a0', '#98a2ac']
};
const palOf = th => { if (th === 'elemental') return PAL[pick(['fire', 'ice', 'lightning'])]; return PAL[th] || PAL.physical; };
const SMOKY = { dark: 1, shadow: 1, poison: 1, blood: 1, ghost: 1 };

class Particles {
  constructor(scene, N, additive) {
    this.N = N; this.n = 0;
    this.pos = new Float32Array(N * 3); this.colA = new Float32Array(N * 3); this.alp = new Float32Array(N); this.siz = new Float32Array(N);
    this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.max = new Float32Array(N); this.drag = new Float32Array(N); this.grav = new Float32Array(N);
    this.s0 = new Float32Array(N); this.s1 = new Float32Array(N); this.c0 = new Float32Array(N * 3); this.c1 = new Float32Array(N * 3); this.a0 = new Float32Array(N); this.swirl = new Float32Array(N);
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aCol', new T.BufferAttribute(this.colA, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aAlp', new T.BufferAttribute(this.alp, 1).setUsage(T.DynamicDrawUsage));
    g.setAttribute('aSiz', new T.BufferAttribute(this.siz, 1).setUsage(T.DynamicDrawUsage));
    g.boundingSphere = new T.Sphere(V3(), 1e4);
    this.mat = new T.ShaderMaterial({
      uniforms: { map: { value: glowTexture() }, uScale: { value: 400 } }, transparent: true, depthWrite: false, depthTest: true,
      blending: additive ? T.AdditiveBlending : T.NormalBlending,
      vertexShader: 'attribute vec3 aCol;attribute float aAlp;attribute float aSiz;varying vec3 vC;varying float vA;uniform float uScale;void main(){vC=aCol;vA=aAlp;vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=max(0.,aSiz*uScale/-mv.z);}',
      fragmentShader: 'uniform sampler2D map;varying vec3 vC;varying float vA;void main(){vec4 t=texture2D(map,gl_PointCoord);gl_FragColor=vec4(vC,t.a*vA);if(gl_FragColor.a<.004)discard;\n#include <colorspace_fragment>\n}'
    });
    this.pts = new T.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = additive ? 10 : 8; scene.add(this.pts); this.g = g;
  }
  emit(p, v, life, s0, s1, c0, c1, a0 = 1, drag = 1, grav = 0, swirl = 0) {
    let i; if (this.n < this.N) i = this.n++; else i = Math.floor(Math.random() * this.N);
    const k = i * 3; this.pos[k] = p.x; this.pos[k + 1] = p.y; this.pos[k + 2] = p.z; this.vel[k] = v.x; this.vel[k + 1] = v.y; this.vel[k + 2] = v.z;
    this.life[i] = 0; this.max[i] = life; this.s0[i] = s0; this.s1[i] = s1; this.a0[i] = a0; this.drag[i] = drag; this.grav[i] = grav; this.swirl[i] = swirl;
    this.c0[k] = c0.r; this.c0[k + 1] = c0.g; this.c0[k + 2] = c0.b; this.c1[k] = c1.r; this.c1[k + 1] = c1.g; this.c1[k + 2] = c1.b;
  }
  update(dt) {
    let n = this.n;
    for (let i = 0; i < n; i++) {
      this.life[i] += dt;
      if (this.life[i] >= this.max[i]) { n--; if (i !== n) this.copy(n, i); this.n = n; i--; continue; }
      const k = i * 3, u = this.life[i] / this.max[i], dr = Math.pow(this.drag[i], dt * 60);
      this.vel[k] *= dr; this.vel[k + 1] = this.vel[k + 1] * dr - this.grav[i] * dt; this.vel[k + 2] *= dr;
      if (this.swirl[i]) { const sx = this.vel[k], sz = this.vel[k + 2], a = this.swirl[i] * dt, ca = Math.cos(a), sa = Math.sin(a); this.vel[k] = sx * ca - sz * sa; this.vel[k + 2] = sx * sa + sz * ca; }
      this.pos[k] += this.vel[k] * dt; this.pos[k + 1] += this.vel[k + 1] * dt; this.pos[k + 2] += this.vel[k + 2] * dt;
      this.colA[k] = lerp(this.c0[k], this.c1[k], u); this.colA[k + 1] = lerp(this.c0[k + 1], this.c1[k + 1], u); this.colA[k + 2] = lerp(this.c0[k + 2], this.c1[k + 2], u);
      this.alp[i] = this.a0[i] * (u < .12 ? u / .12 : 1 - (u - .12) / .88) ; this.siz[i] = lerp(this.s0[i], this.s1[i], u);
    }
    this.n = n; this.g.setDrawRange(0, n);
    for (const a of ['position', 'aCol', 'aAlp', 'aSiz']) this.g.attributes[a].needsUpdate = true;
  }
  copy(a, b) {
    for (let j = 0; j < 3; j++) { this.pos[b * 3 + j] = this.pos[a * 3 + j]; this.vel[b * 3 + j] = this.vel[a * 3 + j]; this.c0[b * 3 + j] = this.c0[a * 3 + j]; this.c1[b * 3 + j] = this.c1[a * 3 + j]; this.colA[b * 3 + j] = this.colA[a * 3 + j]; }
    for (const k of ['life', 'max', 'drag', 'grav', 's0', 's1', 'a0', 'swirl', 'alp', 'siz']) this[k][b] = this[k][a];
  }
  dispose() { this.g.dispose(); this.mat.dispose(); this.pts.parent && this.pts.parent.remove(this.pts); }
}

class FX {
  constructor(world) {
    this.w = world; this.scene = world.scene; this.add = new Particles(this.scene, 2600, true); this.nrm = new Particles(this.scene, 900, false);
    this.items = []; this.t = 0;
  }
  resize(pxH) { this.pxH = pxH; this.applyScale(); }
  applyScale() { const s = (this.pxH || 600) / (2 * Math.tan(this.w.camera.fov * Math.PI / 360)); this.add.mat.uniforms.uScale.value = s; this.nrm.mat.uniforms.uScale.value = s; }
  /* ---- primitivas ---- */
  P(p, v, life, s0, s1, c0, c1, o = {}) {
    const sys = o.smoke ? this.nrm : this.add;
    sys.emit(p, v, life, s0, s1, col(c0), col(c1 || c0), o.a === undefined ? 1 : o.a, o.drag === undefined ? .96 : o.drag, o.grav || 0, o.swirl || 0);
  }
  spray(p, n, spd, life, s0, s1, c0, c1, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rnd(TAU), e = rnd(-.2, 1), r = Math.sqrt(1 - e * e), sp = spd * rnd(.35, 1);
      this.P(p, V3(Math.cos(a) * r * sp, e * sp * (o.up || 1), Math.sin(a) * r * sp), life * rnd(.6, 1.1), s0 * rnd(.7, 1.2), s1, c0, c1, o);
    }
  }
  sprite(tex, color, pos, w, h, life, o = {}) {
    const m = new T.SpriteMaterial({ map: tex, color: col(color), transparent: true, depthWrite: false, blending: o.normal ? T.NormalBlending : T.AdditiveBlending, rotation: o.rot || 0 });
    const s = new T.Sprite(m); s.position.copy(pos); s.scale.set(w, h, 1); s.renderOrder = 12; this.scene.add(s);
    const it = { t: 0, life, s, m, w, h, o, dead: false, update: (dt) => { it.t += dt; const u = it.t / life; m.opacity = (o.a === undefined ? 1 : o.a) * (u < (o.fi || .12) ? u / (o.fi || .12) : Math.max(0, 1 - (u - (o.fi || .12)) / (1 - (o.fi || .12)))); const g = o.grow === undefined ? 1 : o.grow; const k = lerp(1, g, 1 - Math.pow(1 - u, 2)); s.scale.set(w * k, h * (o.growH === undefined ? k : lerp(1, o.growH, u)), 1); if (o.vel) s.position.addScaledVector(o.vel, dt); if (o.spin) m.rotation += o.spin * dt; if (u >= 1) it.dead = true; }, dispose: () => { this.scene.remove(s); m.dispose(); } };
    this.items.push(it); return it;
  }
  glow(pos, color, size, life = .35, o = {}) { return this.sprite(glowTexture(), color, pos, size, size, life, o); }
  screenAngle(a, b) { const cam = this.w.camera; const pa = a.clone().project(cam), pb = b.clone().project(cam); return Math.atan2((pb.y - pa.y), (pb.x - pa.x) * cam.aspect); }
  beam(a, b, color, w, life, o = {}) { const mid = a.clone().add(b).multiplyScalar(.5), len = a.distanceTo(b); return this.sprite(o.tex || boltTexture(), color, mid, len, w, life, Object.assign({ rot: this.screenAngle(a, b), fi: .1, grow: 1, growH: .2 }, o)); }
  slash(pos, color, size, ang, life = .32) { return this.sprite(crescentTexture(), color, pos, size, size * .55, life, { rot: ang, fi: .2, grow: 1.35, growH: .6 }); }
  ground(pos, color, size, life = 1, o = {}) {
    const m = new T.MeshBasicMaterial({ map: o.tex || runeTexture(), color: col(color), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const mesh = new T.Mesh(new T.PlaneGeometry(1, 1), m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(pos.x, .03, pos.z); mesh.renderOrder = 3; this.scene.add(mesh);
    const it = { t: 0, life, dead: false, update: dt => { it.t += dt; const u = it.t / life; const k = lerp(o.from || .4, 1, 1 - Math.pow(1 - Math.min(1, u * 2.5), 3)); mesh.scale.setScalar(size * k); mesh.rotation.z += (o.spin === undefined ? .9 : o.spin) * dt; m.opacity = (o.a === undefined ? 1 : o.a) * (u < .12 ? u / .12 : Math.max(0, 1 - (u - .5) / .5)); if (u >= 1) it.dead = true; }, dispose: () => { this.scene.remove(mesh); m.dispose(); mesh.geometry.dispose(); } };
    this.items.push(it); return it;
  }
  shockwave(pos, color, size, life = .5) {
    const g = new T.RingGeometry(.82, 1, 48), m = new T.MeshBasicMaterial({ color: col(color), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide });
    const mesh = new T.Mesh(g, m); mesh.rotation.x = -Math.PI / 2; mesh.position.set(pos.x, .05, pos.z); mesh.renderOrder = 4; this.scene.add(mesh);
    const it = { t: 0, life, dead: false, update: dt => { it.t += dt; const u = it.t / life; mesh.scale.setScalar(size * (.1 + .9 * (1 - Math.pow(1 - u, 3)))); m.opacity = (1 - u) * .9; if (u >= 1) it.dead = true; }, dispose: () => { this.scene.remove(mesh); m.dispose(); g.dispose(); } };
    this.items.push(it);
  }
  later(d, fn) { this.items.push({ t: 0, life: d, dead: false, update(dt) { this.t += dt; if (this.t >= this.life) { this.dead = true; try { fn(); } catch (e) { console.error(e); } } }, dispose() { } }); }
  /* movimento arbitrário com função de passo (projéteis) */
  mover(life, step, end) { const it = { t: 0, life, dead: false, update: dt => { it.t += dt; const u = Math.min(1, it.t / life); step(u, dt); if (u >= 1) { it.dead = true; end && end(); } }, dispose() { } }; this.items.push(it); return it; }
  update(dt) {
    this.applyScale();
    for (let i = this.items.length - 1; i >= 0; i--) { const it = this.items[i]; it.update(dt); if (it.dead) { it.dispose(); this.items.splice(i, 1); } }
    this.add.update(dt); this.nrm.update(dt);
  }
  dispose() { this.items.forEach(i => i.dispose()); this.items = []; this.add.dispose(); this.nrm.dispose(); }

  /* ================= receitas ================= */
  /* shape functions: (th, from, to, big, done) */
  impact(th, p, big = 1) {
    const [c0, c1, c2] = palOf(th); const w = this.w;
    this.glow(p, c0, 2.6 * big, .28); this.glow(p, c1, 4.4 * big, .5, { a: .7 });
    this.spray(p, 26 * big | 0, 6 * big, .6, .5, .05, c0, c1, { grav: 6 });
    if (SMOKY[th]) this.spray(p, 10 * big | 0, 2.6, 1.1, .9, 2.2, c2, c2, { smoke: 1, a: .7, drag: .94, up: .5 });
    this.shockwave(V3(p.x, 0, p.z), c1, 2.2 * big, .45);
    w.shake(.12 * big, .3); w.flash(c1, 7 * big, p.clone().add(V3(0, .3, 1.2)));
    if (th === 'lightning') { for (let i = 0; i < 4; i++) this.zig(p.clone().add(V3(rnd(-1, 1), 3, rnd(-.5, .5))), p, c0, .18); }
    if (th === 'ice') this.spray(p, 18 * big | 0, 5, .8, .35, .05, '#ffffff', c1, { grav: 10 });
    if (th === 'holy') this.glow(p.clone().add(V3(0, 1.4, 0)), c0, .9 * big, .5, { vel: V3(0, 2, 0) });
  }
  zig(a, b, color, life = .22, w = .22, seg = 9) {
    const pts = [a.clone()]; const d = b.clone().sub(a);
    for (let i = 1; i < seg; i++) { const q = a.clone().addScaledVector(d, i / seg); q.add(V3(rnd(-.35, .35), rnd(-.35, .35), rnd(-.2, .2))); pts.push(q); } pts.push(b.clone());
    for (let i = 1; i < pts.length; i++) this.beam(pts[i - 1], pts[i], color, w, life, { a: 1, tex: _texCache.glow });
    for (let i = 1; i < pts.length; i++) this.beam(pts[i - 1], pts[i], '#ffffff', w * .4, life, { a: 1, tex: _texCache.glow });
  }
  trail(th, p, big = 1) {
    const [c0, c1, c2] = palOf(th);
    this.P(p, V3(rnd(-.4, .4), rnd(-.2, .6), rnd(-.4, .4)), rnd(.3, .6), .5 * big, .05, c0, c1, { grav: th === 'fire' ? -2 : 0 });
    if (SMOKY[th] && Math.random() < .5) this.P(p, V3(rnd(-.3, .3), rnd(0, .5), rnd(-.3, .3)), .8, .5 * big, 1.3 * big, c2, c2, { smoke: 1, a: .6 });
    if (th === 'nature' && Math.random() < .4) this.P(p, V3(rnd(-1, 1), rnd(0, 1), rnd(-1, 1)), .8, .22, .12, c1, c2, { grav: 2 });
  }
  /* orbe/flecha/estilhaço que voa até o alvo */
  bolt(th, from, to, o = {}) {
    const [c0, c1] = palOf(th), dur = o.dur || .42, big = o.big || 1, arc = o.arc === undefined ? .6 : o.arc, kind = o.kind || 'orb';
    const core = kind === 'orb' ? this.glow(from, c0, 1.3 * big, dur + .05, { a: 1, fi: .02 }) : this.sprite(streakTexture(), c1, from, 2.4 * big, .5 * big, dur + .05, { a: 1, fi: .02, grow: 1 });
    const halo = this.glow(from, c1, 2.6 * big, dur + .05, { a: .55, fi: .02 });
    const pos = from.clone();
    this.mover(dur, (u) => {
      pos.lerpVectors(from, to, u * u * .35 + u * .65); pos.y += Math.sin(u * Math.PI) * arc;
      core.s.position.copy(pos); halo.s.position.copy(pos);
      if (kind !== 'orb') core.m.rotation = this.screenAngle(from, to);
      this.trail(th, pos, big); if (kind === 'orb') this.trail(th, pos, big * .7);
    }, () => { core.dead = halo.dead = true; o.done && o.done(); });
  }
  volley(th, from, to, n, o = {}) { for (let i = 0; i < n; i++) this.later(i * (o.gap || .09), () => { const tt = to.clone().add(V3(rnd(-.4, .4), rnd(-.5, .5), rnd(-.3, .3))); this.bolt(th, from.clone().add(V3(0, rnd(-.3, .4), 0)), tt, { kind: o.kind || 'orb', dur: o.dur || .36, big: o.big || .6, arc: rnd(-.2, 1.2), done: () => { this.impact(th, tt, (o.big || .6) * .8); o.hit && o.hit(i); } }); }); }
  rain(th, to, n, o = {}) { for (let i = 0; i < n; i++) this.later(i * (o.gap || .11), () => { const tt = to.clone().add(V3(rnd(-1.6, 1.6), rnd(-.6, .6), rnd(-.9, .9))); tt.y = Math.max(.2, tt.y - .6); const fr = tt.clone().add(V3(rnd(-2, -.5), 7, rnd(-.5, .5))); this.bolt(th, fr, tt, { kind: o.kind || 'orb', dur: .3, big: o.big || .9, arc: 0, done: () => { this.impact(th, tt, o.big || .9); o.hit && o.hit(i); } }); }); }
  eruption(th, at, n, o = {}) {
    const [c0, c1, c2] = palOf(th); this.ground(at, c1, o.size || 5, 1.4, { a: .9 });
    for (let i = 0; i < n; i++) this.later(.15 + i * .07, () => {
      const p = V3(at.x + rnd(-1.8, 1.8), 0, at.z + rnd(-1, 1)); const h = rnd(1.8, 3.4) * (o.big || 1);
      this.mover(.5, (u) => { const hh = Math.sin(u * Math.PI) * h; for (let k = 0; k < 3; k++) this.P(V3(p.x + rnd(-.18, .18), hh * rnd(.1, 1), p.z + rnd(-.18, .18)), V3(rnd(-.4, .4), rnd(.5, 2), rnd(-.4, .4)), .4, .55, .05, c0, c1); });
      this.glow(V3(p.x, .3, p.z), c1, 2, .4); if (i % 2 === 0) this.shockwave(p, c1, 1.4, .35);
      if (SMOKY[th]) this.spray(V3(p.x, .2, p.z), 4, 1.6, 1, .8, 1.8, c2, c2, { smoke: 1, a: .6 });
      if (i === 1) { this.w.shake(.16 * (o.big || 1), .4); o.hit && o.hit(); }
    });
  }
  pillar(th, at, o = {}) {
    const [c0, c1] = palOf(th), h = o.h || 8, w = o.w || 1.8;
    this.ground(at, c1, w * 3, 1.2);
    this.later(.2, () => {
      const m = new T.MeshBasicMaterial({ color: col(c1), transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, opacity: 0 });
      const g = new T.CylinderGeometry(w * .6, w, h, 20, 1, true), mesh = new T.Mesh(g, m); mesh.position.set(at.x, h / 2, at.z); mesh.renderOrder = 6; this.scene.add(mesh);
      const m2 = new T.MeshBasicMaterial({ color: col(c0), transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 }); const g2 = new T.CylinderGeometry(w * .22, w * .35, h, 14, 1, true), mesh2 = new T.Mesh(g2, m2); mesh2.position.copy(mesh.position); mesh2.renderOrder = 7; this.scene.add(mesh2);
      this.glow(V3(at.x, 1, at.z), c0, w * 4, .8, { a: .8 });
      const life = o.life || .9; o.hit && o.hit(); this.w.shake(.2, .45); this.w.flash(c1, 9, V3(at.x, 2, at.z + 1.5));
      const it = { t: 0, dead: false, update: dt => { it.t += dt; const u = it.t / life; const k = u < .15 ? u / .15 : Math.max(0, 1 - (u - .15) / .85); m.opacity = .55 * k; m2.opacity = .95 * k; mesh.scale.set(1 + u * .3, 1, 1 + u * .3); mesh.rotation.y += dt * 2; this.P(V3(at.x + rnd(-w, w), rnd(0, 3), at.z + rnd(-w, w)), V3(0, rnd(2, 6), 0), .8, .4, .05, c0, c1); if (u >= 1) it.dead = true; }, dispose: () => { this.scene.remove(mesh); this.scene.remove(mesh2); g.dispose(); g2.dispose(); m.dispose(); m2.dispose(); } };
      this.items.push(it);
    });
  }
  vortex(th, at, o = {}) {
    const [c0, c1, c2] = palOf(th), life = o.life || 1.1;
    this.ground(at, c1, 4.5, life, { spin: 2.2 });
    this.mover(life, (u, dt) => { for (let k = 0; k < 6; k++) { const a = rnd(TAU), r = rnd(.4, 2) * (1 - u * .3), y = rnd(0, 4.2) * u + rnd(0, .4); this.P(V3(at.x + Math.cos(a) * r, y, at.z + Math.sin(a) * r), V3(-Math.sin(a) * 4, 2.5, Math.cos(a) * 4), .6, .45, .05, c0, c1, { swirl: 3, drag: .97 }); } if (SMOKY[th] && Math.random() < .5) this.P(V3(at.x + rnd(-1, 1), rnd(0, 2), at.z + rnd(-.6, .6)), V3(0, 1, 0), 1, .8, 2, c2, c2, { smoke: 1, a: .5 }); });
    this.later(life * .45, () => { this.impact(th, V3(at.x, 1.2, at.z), 1.4); o.hit && o.hit(); });
  }
  nova(th, at, size = 6, o = {}) {
    const [c0, c1] = palOf(th); this.ground(at, c1, size, .9, { spin: 1.6, from: .15 }); this.shockwave(at, c0, size * .7, .6); this.shockwave(at, c1, size * .5, .8);
    this.spray(V3(at.x, .5, at.z), 60, 8, .8, .5, .05, c0, c1, { up: .25 }); this.w.shake(.22, .4); this.w.flash(c1, 9, V3(at.x, 2, at.z + 2)); o.hit && o.hit();
  }
  chain(th, pts, o = {}) { const [c0, c1] = palOf(th); for (let i = 1; i < pts.length; i++) this.later((i - 1) * .1, () => { this.zig(pts[i - 1], pts[i], i % 2 ? c1 : c0, .26, .3); this.glow(pts[i], c0, 1.6, .25); }); this.later(pts.length * .1, () => { o.hit && o.hit(); }); }
  fan(th, at, n, size, ang0 = -.9) { const [c0, c1] = palOf(th); for (let i = 0; i < n; i++) this.later(i * .07, () => { this.slash(at.clone().add(V3(rnd(-.4, .4), rnd(-.5, .5), .4)), i % 2 ? c1 : c0, size * rnd(.8, 1.2), ang0 + i * (1.8 / Math.max(1, n - 1)) + rnd(-.2, .2), .32); }); }
  /* aura contínua em volta do herói (identidade da subclasse) */
  aura(th, actor, dt, rate = 1) {
    if (Math.random() > rate * dt * 22) return; const [c0, c1, c2] = palOf(th); const b = actor.root.position;
    const p = V3(b.x + rnd(-.6, .6), rnd(.1, actor.height * .9), b.z + rnd(-.4, .4));
    if (th === 'fire') this.P(p, V3(rnd(-.2, .2), rnd(.8, 1.8), 0), .8, .3, .04, c0, c1, { grav: -.5 });
    else if (th === 'ice') this.P(p, V3(rnd(-.2, .2), rnd(-.2, .4), 0), 1.2, .14, .04, '#ffffff', c1);
    else if (th === 'lightning') { if (Math.random() < .35) this.P(p, V3(rnd(-3, 3), rnd(-2, 2), rnd(-1, 1)), .12, .35, .1, c0, c1); }
    else if (th === 'holy') this.P(p, V3(0, rnd(.4, 1), 0), 1.4, .2, .04, c0, c1);
    else if (th === 'nature') this.P(p, V3(rnd(-.3, .3), rnd(-.3, .3), 0), 1.4, .16, .1, c1, c2, { grav: .6 });
    else if (th === 'astral') this.P(p, V3(rnd(-.3, .3), rnd(.1, .5), rnd(-.3, .3)), 1.5, .16, .02, c0, c1, { swirl: 1.6 });
    else if (th === 'blood') this.P(p, V3(rnd(-.2, .2), rnd(-.5, .1), 0), 1, .16, .05, c1, c2, { grav: 2.5 });
    else if (th === 'poison') this.P(p, V3(rnd(-.2, .2), rnd(.3, .9), 0), 1.2, .22, .3, c1, c2, { smoke: 1, a: .45 });
    else if (th === 'ghost') this.P(p, V3(rnd(-.15, .15), rnd(.2, .7), 0), 1.6, .3, .05, c0, c1, { a: .5 });
    else if (th === 'dark' || th === 'shadow') this.P(p, V3(rnd(-.2, .2), rnd(.2, .8), 0), 1.4, .3, .6, c2, c2, { smoke: 1, a: .5 });
    else if (th === 'elemental') this.P(p, V3(rnd(-.3, .3), rnd(.2, .9), 0), 1, .15, .03, pick([PAL.fire[1], PAL.ice[1], PAL.lightning[1]]));
    else this.P(p, V3(rnd(-.2, .2), rnd(0, .4), 0), .8, .08, .02, c0, c1, { a: .4 });
  }
}

/* ================= escolha do efeito por tema × habilidade ================= */
const SLOT_ORDER = ['basic', 'common', 'rare', 'epic', 'legendary', 'ultimate'];
/* cada tema tem 5 formas diferentes (comum→suprema) */
const FXMAP = {
  fire: ['bolt', 'volley', 'eruption', 'rain', 'nova'], ice: ['volley_shard', 'bolt', 'vortex', 'rain_shard', 'nova'], lightning: ['chain', 'bolt', 'rain', 'chain', 'pillar'],
  dark: ['bolt', 'vortex', 'volley', 'eruption', 'nova'], shadow: ['volley_shard', 'fan', 'vortex', 'chain', 'nova'], holy: ['bolt', 'pillar', 'volley', 'rain', 'pillar'],
  poison: ['bolt', 'volley', 'vortex', 'eruption', 'nova'], blood: ['fan', 'bolt', 'volley', 'vortex', 'nova'], ghost: ['fan', 'volley', 'vortex', 'chain', 'nova'],
  nature: ['volley_shard', 'eruption', 'bolt', 'vortex', 'rain'], astral: ['volley', 'bolt', 'rain', 'vortex', 'nova'], elemental: ['bolt', 'chain', 'eruption', 'rain', 'nova'],
  physical: ['fan', 'fan', 'eruption', 'rain_shard', 'nova']
};
function castFX(world, th, slot, from, to, cb, force) {
  const fx = world.fx, i = Math.max(0, Math.min(4, slot === 'basic' ? 0 : slot === 'ultimate' ? 4 : ['common', 'rare', 'epic', 'legendary'].indexOf(slot) + (slot === 'common' ? 0 : 0)));
  const idx = slot === 'basic' ? 0 : slot === 'ultimate' ? 4 : Math.min(3, ['common', 'rare', 'epic', 'legendary'].indexOf(slot) + 0);
  const kind = force || (FXMAP[th] ? FXMAP[th][idx] : 'bolt');
  const hit = () => cb && cb(); const big = [.8, 1, 1.15, 1.3, 1.7][idx];
  const gnd = V3(to.x, 0, to.z);
  const hands = from.clone();
  fx.glow(hands, palOf(th)[0], 1.6, .3); fx.spray(hands, 10, 2.5, .4, .35, .04, palOf(th)[0], palOf(th)[1]);
  const w = world;
  switch (kind) {
    case 'arrow': fx.bolt(th, hands, to, { kind: 'shard', big: 1 + idx * .1, dur: .26, arc: .15, done: () => { fx.impact(th, to, .9 + idx * .1); hit(); } }); if (idx >= 1) fx.later(.08, () => fx.bolt(th, hands, to.clone().add(V3(0, .4, 0)), { kind: 'shard', dur: .27, arc: .3, big: .8 })); break;
    case 'bolt': fx.bolt(th, hands, to, { big, done: () => { fx.impact(th, to, big); hit(); } }); if (idx >= 3) fx.later(.15, () => fx.bolt(th, hands, to.clone().add(V3(0, .6, 0)), { big: big * .7, dur: .4 })); break;
    case 'volley': fx.volley(th, hands, to, 4 + idx, { big: .55 + idx * .08, hit: i => { if (i === 0) hit(); } }); break;
    case 'volley_shard': fx.volley(th, hands, to, 4 + idx, { kind: 'shard', big: .7 + idx * .08, hit: i => { if (i === 0) hit(); } }); break;
    case 'rain': fx.rain(th, to, 6 + idx, { big: .8, hit: i => { if (i === 1) hit(); } }); break;
    case 'rain_shard': fx.rain(th, to, 6 + idx, { kind: 'shard', big: .8, hit: i => { if (i === 1) hit(); } }); break;
    case 'eruption': fx.eruption(th, gnd, 7 + idx, { big, hit }); break;
    case 'vortex': fx.vortex(th, gnd, { hit }); break;
    case 'pillar': fx.pillar(th, gnd, { h: 9, w: 1.2 + idx * .2, hit }); if (idx === 4) { fx.later(.35, () => fx.nova(th, gnd, 7)); } break;
    case 'nova': fx.pillar(th, gnd, { h: 7, w: 1.4, hit }); fx.later(.3, () => fx.nova(th, gnd, 8)); fx.later(.6, () => fx.rain(th, to, 6, { big: 1 })); break;
    case 'chain': { const pts = [hands.clone()]; for (let k = 0; k < 4; k++) pts.push(to.clone().add(V3(rnd(-1.4, 1.4), rnd(-.8, 1.2), rnd(-.5, .5)))); fx.chain(th, pts, { hit }); fx.later(.5, () => fx.impact(th, to, big)); break; }
    case 'fan': fx.fan(th, to, 3 + idx, 3.2 * big); fx.later(.12, () => { fx.impact(th, to, big * .8); hit(); }); break;
  }
}
/* golpe corpo a corpo: cortes no ar + faíscas, cor do tema */
function meleeFX(world, th, slot, to, i) {
  const fx = world.fx; const [c0, c1] = palOf(th);
  const big = slot === 'basic' ? .8 : 1.1;
  fx.slash(to.clone().add(V3(-.3, .2, .6)), c0, 3.4 * big, rnd(-.9, -.3) + (i % 2 ? 1.6 : 0));
  fx.slash(to.clone().add(V3(-.2, 0, .5)), c1, 2.6 * big, rnd(.3, .9) - (i % 2 ? 1.2 : 0), .28);
  fx.impact(th, to, big);
}

export { FX, castFX, meleeFX, palOf };
