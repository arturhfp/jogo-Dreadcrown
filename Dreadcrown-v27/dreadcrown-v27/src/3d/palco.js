/* =====================================================================
   Palco 3D (cena, câmera, luzes, sombras, loop)
   ---------------------------------------------------------------------
   RESPONSABILIDADE: World cria o renderizador, as luzes (incluindo a luz com sombra e o chão que só recebe sombra), a câmera com respiro/tremor, câmera lenta e agenda de eventos (at). Atualiza atores e efeitos a cada quadro.
   RELAÇÃO COM OUTROS MÓDULOS: Usa atores.js, efeitos.js, posprocessamento.js, texturas.js, glb.js. É criado pela ponte com a interface.
   API PÚBLICA: new World(elemento, "battle"|"creator"), add/remove(ator), shake, slow, at(atraso, fn), flash, destroy.
   REGRAS / CUIDADOS: Um World por arena; ele se destrói sozinho quando o elemento sai do DOM.
   ===================================================================== */
import { FX } from './efeitos.js';
import { makeEnv } from './glb.js';
import { cy } from './kit.js';
import { Post } from './posprocessamento.js';
import { T, V3, clamp, isMobile, lerp } from '../core/util.js';

class World {
  constructor(host, mode) {
    this.host = host; this.mode = mode; this.time = 0; this.ts = 1; this.tsTarget = 1; this.shakeAmp = 0; this.shakeT = 0; this.alive = true; this.actors = []; this.hero = null; this.enemy = null; this.tasks = [];
    const cv = document.createElement('canvas'); cv.className = 'gl3d-canvas'; this.canvas = cv;
    const hostEl = host; hostEl.appendChild(cv);
    this.renderer = new T.WebGLRenderer({ canvas: cv, alpha: true, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = T.PCFSoftShadowMap;
    this.renderer.outputColorSpace = T.SRGBColorSpace; this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = 1.08;
    this.scene = new T.Scene(); this.scene.environment = makeEnv(this.renderer); this.scene.environmentIntensity = .85;
    this.camera = new T.PerspectiveCamera(32, 1, .1, 120);
    this.lights();
    try { this.post = new Post(this.renderer); } catch (er) { console.warn('[3D] pós-processamento indisponível', er); this.post = null; }
    this.fx = new FX(this);
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; document.documentElement.classList.remove('gl3d'); });
    this.last = performance.now(); this.raf = requestAnimationFrame(t => this.loop(t));
    this.resize();
  }
  lights() {
    const s = this.scene;
    s.add(new T.HemisphereLight(0x9cc0ff, 0x1c2a2c, 1.0));
    const key = new T.DirectionalLight(0xcfe0ff, 2.6); key.position.set(-3.5, 8, 5.5); key.castShadow = true; const mob = isMobile(), sm = key.shadow; sm.mapSize.set(mob ? 1024 : 2048, mob ? 1024 : 2048);
    Object.assign(sm.camera, { left: -8, right: 8, top: 7, bottom: -5, near: 1, far: 30 }); sm.camera.updateProjectionMatrix(); sm.bias = -.0004; sm.normalBias = .03; sm.radius = 3.2; s.add(key); s.add(key.target); this.key = key;
    const gc = new T.Mesh(new T.PlaneGeometry(60, 60), new T.ShadowMaterial({ opacity: .55, color: 0x02030a })); gc.rotation.x = -Math.PI / 2; gc.position.y = .006; gc.receiveShadow = true; gc.renderOrder = -2; s.add(gc);
    const rim = new T.DirectionalLight(0xff9a55, 1.5); rim.position.set(-6, 3, -4); s.add(rim);
    const rim2 = new T.DirectionalLight(0x6aa8ff, 1.1); rim2.position.set(6, 2, -5); s.add(rim2);
    this.flashLight = new T.PointLight(0xffffff, 0, 14, 1.6); this.flashLight.position.set(0, 2, 2); s.add(this.flashLight);
  }
  layout() {
    const w = this.W || 800, h = this.H || 500, a = w / h, mob = isMobile();
    this.aspect = a;
    if (this.mode === 'creator') { this.sx = 0; this.camD = (mob ? 5.6 : 4.7) / Math.min(1, a / .9 + .1); this.fov = 34; this.groundY = mob ? -.66 : -.74; }
    else {
      this.fov = mob ? 40 : 30;
      const gnd = mob ? .33 : .24; this.groundY = 1 - 2 * (1 - gnd); /* NDC do chão */
      this.sx = clamp(a * 2.0, 1.55, 2.8);
      const need = (this.sx + 1.5) / (Math.tan(this.fov * Math.PI / 360) * a); this.camD = Math.max(need, 7.5);
    }
    this.camera.fov = this.fov; this.camera.aspect = a; this.camera.updateProjectionMatrix();
    this.placeCamera();
    if (this.hero) this.hero.base.set(this.mode === 'creator' ? 0 : -this.sx, 0, 0);
    if (this.enemy) this.enemy.base.set(this.sx, 0, 0);
  }
  placeCamera() {
    const cam = this.camera, d = this.camD, cy = this.mode === 'creator' ? 1.9 : 1.55;
    cam.position.set(this.camX || 0, cy, d);
    let lo = -2, hi = 6, ty = 1.2;
    const o = V3(0, 0, 0);
    for (let i = 0; i < 18; i++) { ty = (lo + hi) / 2; cam.lookAt(0, ty, 0); cam.updateMatrixWorld(true); const ndc = o.clone().project(cam); if (ndc.y > this.groundY) lo = ty; else hi = ty; }
    this.look = ty; cam.lookAt(0, ty, 0);
  }
  resize() {
    const r = this.host.getBoundingClientRect(); const w = Math.max(2, Math.round(r.width)), h = Math.max(2, Math.round(r.height));
    this.W = w; this.H = h;
    const pr = Math.min(window.devicePixelRatio || 1, isMobile() ? 1.6 : 2);
    this.renderer.setPixelRatio(pr); this.renderer.setSize(w, h, false);
    this.layout(); this.fx.resize(h * pr); if (this.post) { try { this.post.size(w, h, pr); } catch (er) { console.warn(er); this.post = null; } }
  }
  add(a) { this.actors.push(a); this.scene.add(a.root); a.root.traverse(o => { if (o.isMesh && o.material && !o.material.isShaderMaterial) { const m = Array.isArray(o.material) ? o.material[0] : o.material; if (!m.isMeshBasicMaterial || o.userData.shadowOK) { o.castShadow = true; o.receiveShadow = true; } } }); a.root.rotation.y = a.dir < 0 ? Math.PI + .3 : -.3; a.yaw0 = a.root.rotation.y; return a; }
  remove(a) { if (!a) return; const i = this.actors.indexOf(a); if (i >= 0) this.actors.splice(i, 1); this.scene.remove(a.root); a.dispose(); }
  shake(a = .15, d = .35) { this.shakeAmp = Math.max(this.shakeAmp, a); this.shakeT = Math.max(this.shakeT, d); this.shakeD = d; }
  slow(k = .2, d = .18) { this.ts = k; this.tsHold = d; }
  at(delay, fn) { this.tasks.push({ t: this.time + delay, fn }); }
  loop(now) {
    if (!this.alive) return;
    this.raf = requestAnimationFrame(t => this.loop(t));
    if (!this.host.isConnected) { this.destroy(); return; }
    if (document.hidden || this.lost) { this.last = now; return; }
    if (this.paused) { this.last = now; return; }
    let dt = Math.min(.05, (now - this.last) / 1000); this.last = now;
    this.tick(dt);
  }
  tick(dt) {
    if (this.tsHold > 0) { this.tsHold -= dt; } else this.ts = lerp(this.ts, 1, clamp(dt * 8, 0, 1));
    const sdt = dt * this.ts; this.time += sdt;
    for (let i = this.tasks.length - 1; i >= 0; i--) if (this.time >= this.tasks[i].t) { const f = this.tasks[i].fn; this.tasks.splice(i, 1); try { f(); } catch (e) { console.error(e); } }
    for (const a of this.actors) a.update(sdt);
    this.fx.update(sdt);
    if (this.hero && this.hero.theme) this.fx.aura(this.hero.theme, this.hero, sdt);
    if (this.mode === 'creator' && this.hero && !this.dragging) { this.spin = (this.spin || 0) + sdt * .35 * (this.autoSpin === false ? 0 : 1); }
    if (this.mode === 'creator' && this.hero) this.hero.root.rotation.y = this.heroYaw !== undefined ? this.heroYaw : (-.5 + Math.sin(this.time * .5) * .45 + (this.dragYaw || 0));
    /* câmera com respiro e tremor */
    const cam = this.camera; let sx = 0, sy = 0;
    if (this.shakeT > 0) { this.shakeT -= dt; const k = this.shakeAmp * clamp(this.shakeT / this.shakeD, 0, 1); sx = (Math.random() - .5) * k; sy = (Math.random() - .5) * k; if (this.shakeT <= 0) this.shakeAmp = 0; }
    cam.position.x = (this.camX || 0) + Math.sin(this.time * .35) * .18 + sx; cam.position.y = (this.mode === 'creator' ? 1.9 : 1.55) + Math.sin(this.time * .27) * .05 + sy;
    cam.lookAt(0, this.look, 0);
    this.flashLight.intensity *= Math.pow(.0005, dt);
    if (this.post) { try { this.post.render(this.scene, cam); } catch (er) { console.warn('[3D] post falhou', er); this.post = null; this.renderer.setRenderTarget(null); this.renderer.render(this.scene, cam); } } else this.renderer.render(this.scene, cam);
  }
  flash(color, intensity, pos) { this.flashLight.color.set(color); this.flashLight.intensity = intensity; if (pos) this.flashLight.position.copy(pos); }
  destroy() {
    if (!this.alive) return; this.alive = false; cancelAnimationFrame(this.raf); this.ro.disconnect();
    this.actors.slice().forEach(a => this.remove(a)); this.fx.dispose(); this.post && this.post.dispose();
    try { this.renderer.dispose(); this.renderer.forceContextLoss(); } catch (e) { }
    this.canvas.remove();
  }
}

export { World };
