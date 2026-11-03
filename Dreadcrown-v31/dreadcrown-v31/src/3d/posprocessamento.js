/* =====================================================================
   Pós-processamento (bloom e gradação)
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Renderiza a cena num alvo HDR, extrai o brilho, desfoca em 3 níveis e compõe com tone mapping ACES, preservando o canal alfa (a tela 3D é transparente sobre o cenário SVG).
   RELAÇÃO COM OUTROS MÓDULOS: Usa util.js. Instanciado por palco.js; se falhar, o palco cai para renderização direta.
   API PÚBLICA: new Post(renderer), size(w, h, pixelRatio), render(cena, câmera).
   REGRAS / CUIDADOS: A cor final é convertida para sRGB aqui; materiais/partículas renderizam em espaço linear dentro do alvo.
   ===================================================================== */
import { T } from '../core/util.js';

/* =====================================================================
   Palco 3D
   ===================================================================== */
/* ---- pós-processamento: bloom + gradação, com canal alfa (a tela é transparente sobre o cenário) ---- */
class Post {
  constructor(renderer) {
    this.r = renderer; this.ok = true;
    const T_ = T, ht = T_.HalfFloatType;
    this.rt = null; this.mips = [];
    this.quad = new T_.Mesh(new T_.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.cam = new T_.OrthographicCamera(-1, 1, 1, -1, 0, 1); this.sc = new T_.Scene(); this.sc.add(this.quad);
    const vs = 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
    this.mBright = new T_.ShaderMaterial({ uniforms: { t: { value: null }, th: { value: .85 } }, vertexShader: vs, depthTest: false, depthWrite: false,
      fragmentShader: 'uniform sampler2D t;uniform float th;varying vec2 vUv;void main(){vec4 c=texture2D(t,vUv);float l=max(c.r,max(c.g,c.b));float k=smoothstep(th,th+1.2,l);gl_FragColor=vec4(c.rgb*k,c.a*k);}' });
    this.mBlur = new T_.ShaderMaterial({ uniforms: { t: { value: null }, d: { value: new T_.Vector2() } }, vertexShader: vs, depthTest: false, depthWrite: false,
      fragmentShader: 'uniform sampler2D t;uniform vec2 d;varying vec2 vUv;void main(){vec4 s=texture2D(t,vUv)*.2270270;s+=(texture2D(t,vUv+d*1.3846)+texture2D(t,vUv-d*1.3846))*.3162162;s+=(texture2D(t,vUv+d*3.2308)+texture2D(t,vUv-d*3.2308))*.0702703;gl_FragColor=s;}' });
    this.mComp = new T_.ShaderMaterial({ uniforms: { t: { value: null }, b1: { value: null }, b2: { value: null }, b3: { value: null }, k: { value: .55 }, ex: { value: 1.08 } }, vertexShader: vs, depthTest: false, depthWrite: false, transparent: false,
      fragmentShader: 'uniform sampler2D t,b1,b2,b3;uniform float k,ex;varying vec2 vUv;\n#include <tonemapping_pars_fragment>\nvoid main(){vec4 c=texture2D(t,vUv);vec4 b=texture2D(b1,vUv)*.5+texture2D(b2,vUv)*.8+texture2D(b3,vUv)*1.0;vec3 rgb=c.rgb+b.rgb*k;float a=clamp(c.a+max(b.r,max(b.g,b.b))*k*.9,0.,1.);rgb*=ex;rgb=ACESFilmicToneMapping(rgb);float l=dot(rgb,vec3(.299,.587,.114));rgb=mix(vec3(l),rgb,1.07);rgb=pow(max(rgb,0.),vec3(1./2.2));gl_FragColor=vec4(rgb,a);}' });
    this.mComp.toneMapped = false;
  }
  size(w, h, pr) {
    const T_ = T, ht = T_.HalfFloatType; const W = Math.max(2, Math.floor(w * pr)), H = Math.max(2, Math.floor(h * pr));
    if (this.rt) { this.rt.dispose(); this.mips.forEach(m => { m.a.dispose(); m.b.dispose(); }); }
    this.rt = new T_.WebGLRenderTarget(W, H, { type: ht, samples: 4, depthBuffer: true, colorSpace: T_.LinearSRGBColorSpace });
    this.mips = []; let mw = W, mh = H;
    for (let i = 0; i < 3; i++) { mw = Math.max(2, mw >> 1); mh = Math.max(2, mh >> 1); const o = { type: ht, depthBuffer: false }; this.mips.push({ a: new T_.WebGLRenderTarget(mw, mh, o), b: new T_.WebGLRenderTarget(mw, mh, o), w: mw, h: mh }); if (i === 0) { mw >>= 1; mh >>= 1; } }
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.sc, this.cam); }
  render(scene, camera) {
    const r = this.r; r.setRenderTarget(this.rt); r.clear(); r.render(scene, camera);
    let src = this.rt.texture;
    this.mBright.uniforms.t.value = src; this.pass(this.mBright, this.mips[0].a);
    let prev = this.mips[0].a.texture;
    this.mips.forEach((m, i) => {
      if (i > 0) { this.mBlur.uniforms.t.value = prev; this.mBlur.uniforms.d.value.set(1 / m.w, 0); this.pass(this.mBlur, m.a); prev = m.a.texture; }
      this.mBlur.uniforms.t.value = prev; this.mBlur.uniforms.d.value.set(1 / m.w, 0); this.pass(this.mBlur, m.b);
      this.mBlur.uniforms.t.value = m.b.texture; this.mBlur.uniforms.d.value.set(0, 1 / m.h); this.pass(this.mBlur, m.a); prev = m.a.texture;
    });
    const u = this.mComp.uniforms; u.t.value = src; u.b1.value = this.mips[0].a.texture; u.b2.value = this.mips[1].a.texture; u.b3.value = this.mips[2].a.texture;
    this.quad.material = this.mComp; r.setRenderTarget(null); r.render(this.sc, this.cam);
  }
  dispose() { this.rt && this.rt.dispose(); this.mips.forEach(m => { m.a.dispose(); m.b.dispose(); }); [this.mBright, this.mBlur, this.mComp].forEach(m => m.dispose()); }
}

export { Post };
