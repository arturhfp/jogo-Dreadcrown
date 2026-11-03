/* =====================================================================
   Cena de exploração em terceira pessoa
   ---------------------------------------------------------------------
   RESPONSABILIDADE: estende o palco (World) para o mundo aberto: câmera que segue o herói, terreno por região,
   herói e inimigos andando, marcadores de alerta, entrada de teclado/mouse/toque. A cada quadro chama a
   simulação PURA (rules/mundo.js → passoMundo) e apenas DESENHA o resultado.
   RELAÇÃO COM OUTROS MÓDULOS: usa world/terreno.js, rules/mundo.js, 3d/palco.js, 3d/personagens.js, 3d/combate3d.js.
   API PÚBLICA: new CenaMundo(host, opcoes), carregarRegiao(est), definirHeroi(chave), entradaExterna, destroy().
   opcoes: { obterMundo(), aoEventos(lista), aoInteragir(), aoMapa(), aoFicha(), aoMenu() }
   REGRAS / CUIDADOS: não decide nada de jogo. Só um WebGL por vez: a tela do mundo destrói esta cena ao entrar em batalha.
   ===================================================================== */
import { World } from '../3d/palco.js';
import { Creature, enemyKindFor } from '../3d/personagens.js';
import { makeHero } from '../3d/combate3d.js';
import { T, V3, clamp, isMobile } from '../core/util.js';
import { construirTerreno } from './terreno.js';
import { passoMundo, alturaEm, regiao } from '../rules/mundo.js';

const TAU = Math.PI * 2;
const angulo = (a, b, t) => { let d = ((b - a + Math.PI * 3) % TAU) - Math.PI; return a + d * t; };
function texturaMarca(texto, cor) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = 'rgba(10,10,14,.75)'; x.beginPath(); x.arc(32, 32, 28, 0, TAU); x.fill(); x.strokeStyle = cor; x.lineWidth = 4; x.stroke();
  x.fillStyle = cor; x.font = 'bold 40px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(texto, 32, 35);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}

export class CenaMundo extends World {
  constructor(host, opcoes) {
    super(host, 'explore');
    this.opcoes = opcoes; this.camYaw = 0; this.camPitch = 0.42; this.camDist = isMobile() ? 9 : 8; this.teclas = new Set(); this.ataquePendente = false; this.entradaExterna = null;
    this.atoresInimigos = new Map(); this.terreno = null; this.animados = []; this.pronto = false;
    this.marcaAlerta = texturaMarca('!', '#ffd24a'); this.marcaPerseg = texturaMarca('!', '#ff5a4a');
    this.aoTecla = e => this.tecla(e, true); this.aoSoltar = e => this.tecla(e, false);
    window.addEventListener('keydown', this.aoTecla); window.addEventListener('keyup', this.aoSoltar);
    const cv = this.canvas; let arrasto = null;
    cv.addEventListener('pointerdown', e => { arrasto = { x: e.clientX, y: e.clientY, moveu: 0 }; cv.setPointerCapture(e.pointerId); });
    cv.addEventListener('pointermove', e => { if (!arrasto) return; const dx = e.clientX - arrasto.x, dy = e.clientY - arrasto.y; arrasto.x = e.clientX; arrasto.y = e.clientY; arrasto.moveu += Math.abs(dx) + Math.abs(dy); this.camYaw += dx * 0.006; this.camPitch = clamp(this.camPitch + dy * 0.004, 0.12, 1.1); });
    cv.addEventListener('pointerup', () => { if (arrasto && arrasto.moveu < 5) this.ataquePendente = true; arrasto = null; });
    cv.addEventListener('wheel', e => { e.preventDefault(); this.camDist = clamp(this.camDist + Math.sign(e.deltaY) * 0.8, 4.5, 14); }, { passive: false });
    cv.style.touchAction = 'none';
  }
  lights() {
    const s = this.scene;
    this.hemi = new T.HemisphereLight(0xbcd0ff, 0x2b2a22, 1.1); s.add(this.hemi);
    const key = new T.DirectionalLight(0xfff2d6, 2.4); key.castShadow = true; const mob = isMobile(), sm = key.shadow; sm.mapSize.set(mob ? 1024 : 2048, mob ? 1024 : 2048);
    Object.assign(sm.camera, { left: -24, right: 24, top: 24, bottom: -24, near: 1, far: 80 }); sm.camera.updateProjectionMatrix(); sm.bias = -.0005; sm.normalBias = .05; sm.radius = 2.5;
    s.add(key); s.add(key.target); this.key = key;
    this.flashLight = new T.PointLight(0xffffff, 0, 14, 1.6); s.add(this.flashLight);
  }
  layout() { this.camera.fov = isMobile() ? 62 : 52; this.camera.aspect = (this.W || 800) / (this.H || 500); this.camera.near = .2; this.camera.far = 260; this.camera.updateProjectionMatrix(); }
  placeCamera() { }
  tecla(e, baixo) {
    const alvo = e.target; if (alvo && /INPUT|SELECT|TEXTAREA/.test(alvo.tagName)) return;
    const k = e.key.toLowerCase(); if (baixo) this.teclas.add(k); else this.teclas.delete(k);
    if (!baixo || e.repeat || this.pausado) return;
    if (k === 'e') this.opcoes.aoInteragir && this.opcoes.aoInteragir();
    else if (k === 'm') this.opcoes.aoMapa && this.opcoes.aoMapa();
    else if (k === 'i' || k === 'c') this.opcoes.aoFicha && this.opcoes.aoFicha();
    else if (k === 'escape') this.opcoes.aoMenu && this.opcoes.aoMenu();
    else if (k === ' ' || k === 'f') { this.ataquePendente = true; e.preventDefault(); }
  }
  lerEntrada() {
    const t = this.teclas, ex = this.entradaExterna; let fw = (t.has('w') || t.has('arrowup') ? 1 : 0) - (t.has('s') || t.has('arrowdown') ? 1 : 0), rt = (t.has('d') ? 1 : 0) - (t.has('a') ? 1 : 0);
    if (t.has('arrowleft')) this.camYaw -= 0.03; if (t.has('arrowright')) this.camYaw += 0.03; if (t.has('q')) this.camYaw -= 0.03;
    if (ex && (ex.mx || ex.mz)) { rt = ex.mx; fw = -ex.mz; }
    const fx = Math.cos(this.camYaw), fz = Math.sin(this.camYaw);
    const entrada = { mx: fx * fw + -fz * rt, mz: fz * fw + fx * rt, furtivo: t.has('shift') || !!(ex && ex.furtivo), ataque: this.ataquePendente || !!(ex && ex.ataque) };
    this.ataquePendente = false; if (ex) ex.ataque = false; return entrada;
  }
  async definirHeroi(chave) {
    const a = await makeHero(this, chave); if (!this.alive) { a.dispose(); return; }
    if (this.hero) this.remove(this.hero); this.hero = this.add(a); a.noIdle = a.noIdle || false; a.play('spawn'); this.sincronizar(0, true);
  }
  carregarRegiao(est) {
    const r = regiao(est.regiaoId), v = r.visual;
    if (this.terreno) this.terreno.dispose(); for (const o of this.atoresInimigos.values()) { this.remove(o.ator); o.marca.removeFromParent(); o.marca.material.dispose(); } this.atoresInimigos.clear();
    this.terreno = construirTerreno(est.regiaoId); this.scene.add(this.terreno.grupo); this.animados = this.terreno.animados; this.terreno.atualizarPortais(this.opcoes.obterHeroi ? this.opcoes.obterHeroi() : { wins: 0 });
    this.scene.background = new T.Color(v.ceu); this.scene.fog = new T.Fog(new T.Color(v.nevoa), v.nevoaDist[0], v.nevoaDist[1]);
    this.key.color.set(v.luz); this.hemi.color.set(v.luz).lerp(new T.Color('#9ab8ff'), .4); this.scene.environmentIntensity = r.tier === 'strong' ? .5 : .8;
    for (const e of est.inimigos) {
      const info = enemyKindFor(e.nome), ator = new Creature(this, info.kind, info); this.add(ator); ator.loc = { vel: 0, furtivo: false };
      const marca = new T.Sprite(new T.SpriteMaterial({ map: this.marcaAlerta, depthTest: false, transparent: true })); marca.scale.set(.9, .9, .9); marca.renderOrder = 10; marca.visible = false; this.scene.add(marca);
      this.atoresInimigos.set(e.id, { ator, marca, px: e.x, pz: e.z });
    }
    this.pronto = true; this.sincronizar(0, true);
  }
  sincronizar(dt, forcar) {
    const est = this.opcoes.obterMundo(); if (!est) return; const h = est.heroi, id = est.regiaoId, a = this.hero;
    if (a) {
      const y = alturaEm(id, h.x, h.z); a.base.set(h.x, y, h.z); a.root.rotation.y = forcar ? -h.rumo : angulo(a.root.rotation.y, -h.rumo, clamp(dt * 12, 0, 1));
      a.loc = { vel: h.vel, furtivo: h.furtivo };
    }
    for (const e of est.inimigos) {
      const o = this.atoresInimigos.get(e.id); if (!o) continue; const at = o.ator;
      const vivo = e.estado !== 'morto'; if (at.root.visible !== vivo) { at.root.visible = vivo; if (vivo) at.play('spawn'); }
      const vel = dt > 0 ? Math.hypot(e.x - o.px, e.z - o.pz) / dt : 0; o.px = e.x; o.pz = e.z;
      at.base.set(e.x, alturaEm(id, e.x, e.z), e.z); at.root.rotation.y = forcar ? -e.rumo + Math.PI : angulo(at.root.rotation.y, -e.rumo + Math.PI, clamp(dt * 8, 0, 1));
      at.loc.vel = Math.min(vel, 6); at.loc.furtivo = false;
      const alerta = vivo && (e.estado === 'alerta' || e.estado === 'persegue'); o.marca.visible = alerta;
      if (alerta) { o.marca.material.map = e.estado === 'alerta' ? this.marcaAlerta : this.marcaPerseg; o.marca.position.set(e.x, at.base.y + (at.height || 2) + .9, e.z); }
    }
  }
  tick(dt) {
    if (!this.pronto) { this.renderSimples(); return; }
    this.time += dt; for (let i = this.tasks.length - 1; i >= 0; i--) if (this.time >= this.tasks[i].t) { const f = this.tasks[i].fn; this.tasks.splice(i, 1); try { f(); } catch (e) { console.error(e); } }
    const est = this.opcoes.obterMundo();
    if (est && !this.pausado) {
      const r = passoMundo(est, this.lerEntrada(), dt); if (r.eventos.length) this.opcoes.aoEventos(r.eventos);
      if (r.eventos.some(e => e.tipo === 'respawn')) this.sincronizar(0, true);
    } else this.ataquePendente = false;
    this.sincronizar(dt, false);
    for (const a of this.actors) a.update(dt); this.fx.update(dt); for (const f of this.animados) f(this.time);
    this.camera_(dt, est); this.renderSimples();
  }
  camera_(dt, est) {
    if (!est) return; const h = est.heroi, cam = this.camera, k = clamp(dt * 8, 0, 1), alvo = V3(h.x, alturaEm(est.regiaoId, h.x, h.z) + 1.5, h.z);
    const cp = Math.cos(this.camPitch), fx = Math.cos(this.camYaw), fz = Math.sin(this.camYaw);
    const desejada = V3(alvo.x - fx * this.camDist * cp, alvo.y + Math.sin(this.camPitch) * this.camDist, alvo.z - fz * this.camDist * cp);
    const chaoCam = alturaEm(est.regiaoId, desejada.x, desejada.z) + 0.8; if (desejada.y < chaoCam) desejada.y = chaoCam;
    if (!this.camInit) { cam.position.copy(desejada); this.camInit = true; } else cam.position.lerp(desejada, k);
    this.alvoCam = (this.alvoCam || alvo.clone()).lerp(alvo, clamp(dt * 10, 0, 1)); cam.lookAt(this.alvoCam);
    this.key.position.set(alvo.x - 14, alvo.y + 24, alvo.z + 10); this.key.target.position.copy(alvo); this.key.target.updateMatrixWorld();
  }
  renderSimples() {
    const cam = this.camera;
    if (this.post) { try { this.post.render(this.scene, cam); } catch (er) { console.warn('[3D] post falhou', er); this.post = null; this.renderer.setRenderTarget(null); this.renderer.render(this.scene, cam); } } else this.renderer.render(this.scene, cam);
  }
  destroy() { window.removeEventListener('keydown', this.aoTecla); window.removeEventListener('keyup', this.aoSoltar); if (this.terreno) this.terreno.dispose(); this.marcaAlerta.dispose(); this.marcaPerseg.dispose(); super.destroy(); }
}
