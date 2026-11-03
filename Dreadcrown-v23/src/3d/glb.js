/* =====================================================================
   Carregador de modelos GLB e iluminação por ambiente
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Lê o modelo 3D do Orc (GLB): esqueleto, malhas, texturas, materiais e animações; monta o ambiente de reflexo (PMREM) da cena.
   RELAÇÃO COM OUTROS MÓDULOS: Usa util.js. loadOrc() é chamado por combate3d.makeHero e entrega o modelo já pronto.
   API PÚBLICA: parseGLB(buffer), loadOrc(), makeEnv(renderer).
   REGRAS / CUIDADOS: O GLB fica em assets/orc.glb no modo desenvolvimento; no HTML único ele vai embutido em base64 (<script id="orc-glb">). GLB_HIDE remove bandeira e chão do modelo original. O modelo é CC-BY-4.0 (mezuna): mantenha o crédito.
   ===================================================================== */
import { at } from './primitivas.js';
import { Color, Matrix4, T, V3 } from '../core/util.js';

/* =====================================================================
   Carregador GLB (sem dependências) — esqueleto, texturas, animações
   ===================================================================== */
function b64ToBuffer(b64) {
  const bin = atob(b64), n = bin.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  return u.buffer;
}
async function parseGLB(buf, opts = {}) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('Arquivo não é um GLB válido');
  const jl = dv.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jl)));
  const bo = 20 + jl; const bstart = bo + 8;
  const exts = (json.extensionsRequired || []);
  if (exts.some(e => /draco|meshopt|quantization/i.test(e))) throw new Error('GLB comprimido (' + exts.join(', ') + ') não é suportado — exporte sem compressão');
  const views = json.bufferViews || [], acc = json.accessors || [];
  const CT = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
  const NC = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
  function getAcc(i) {
    const a = acc[i], v = views[a.bufferView], n = NC[a.type], C = CT[a.componentType], B = C.BYTES_PER_ELEMENT;
    const off = bstart + (v.byteOffset || 0) + (a.byteOffset || 0), stride = v.byteStride || B * n;
    let out;
    if (stride === B * n) out = new C(buf.slice(off, off + a.count * n * B));
    else { out = new C(a.count * n); const d = new DataView(buf); const get = { 5126: 'getFloat32', 5123: 'getUint16', 5121: 'getUint8', 5125: 'getUint32', 5122: 'getInt16', 5120: 'getInt8' }[a.componentType]; for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = d[get](off + k * stride + c * B, true); }
    if (a.normalized && a.componentType !== 5126) { const mx = { 5121: 255, 5123: 65535, 5120: 127, 5122: 32767 }[a.componentType]; const f = new Float32Array(out.length); for (let k = 0; k < out.length; k++) f[k] = Math.max(out[k] / mx, -1); out = f; }
    return out;
  }
  /* texturas */
  const texCache = new Map();
  async function getTex(ti, srgb) {
    const key = ti + ':' + srgb; if (texCache.has(key)) return texCache.get(key);
    const tdef = json.textures[ti]; const src = tdef.source !== undefined ? tdef.source : (tdef.extensions && tdef.extensions.EXT_texture_webp && tdef.extensions.EXT_texture_webp.source);
    const img = json.images[src]; let blob;
    if (img.bufferView !== undefined) { const v = views[img.bufferView]; blob = new Blob([new Uint8Array(buf, bstart + (v.byteOffset || 0), v.byteLength)], { type: img.mimeType || 'image/png' }); }
    else if (img.uri && img.uri.startsWith('data:')) { blob = await (await fetch(img.uri)).blob(); }
    else return null;
    const bmp = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
    const tex = new T.Texture(bmp); tex.flipY = false; tex.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping; tex.minFilter = T.LinearMipmapLinearFilter; tex.anisotropy = 4; tex.needsUpdate = true;
    texCache.set(key, tex); return tex;
  }
  /* materiais */
  const mats = [];
  for (const m of (json.materials || [])) {
    const sg = m.extensions && m.extensions.KHR_materials_pbrSpecularGlossiness, pbr = m.pbrMetallicRoughness || {};
    const mat = new T.MeshStandardMaterial({ color: 0xffffff, roughness: pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : .72, metalness: pbr.metalnessFactor !== undefined ? Math.min(.55, pbr.metalnessFactor) : .18, side: m.doubleSided ? T.DoubleSide : T.FrontSide });
    mat.name = m.name || '';
    const bf = (sg && sg.diffuseFactor) || pbr.baseColorFactor; if (bf) { mat.color.setRGB(bf[0], bf[1], bf[2], T.LinearSRGBColorSpace); if (bf[3] < .99) { mat.transparent = true; mat.opacity = bf[3]; } }
    const dt = sg ? sg.diffuseTexture : pbr.baseColorTexture; if (dt) { mat.map = await getTex(dt.index, true); }
    if (m.normalTexture) { mat.normalMap = await getTex(m.normalTexture.index, false); if (m.normalTexture.scale !== undefined) mat.normalScale.set(m.normalTexture.scale, m.normalTexture.scale); }
    if (pbr.metallicRoughnessTexture && !sg) { const mr = await getTex(pbr.metallicRoughnessTexture.index, false); mat.roughnessMap = mr; mat.metalnessMap = mr; }
    if (m.occlusionTexture) { mat.aoMap = await getTex(m.occlusionTexture.index, false); }
    if (m.emissiveTexture) { mat.emissiveMap = await getTex(m.emissiveTexture.index, true); mat.emissive = new Color(1, 1, 1); mat.emissiveIntensity = 1.35; mat.userData.hasEmissiveMap = true; }
    else if (m.emissiveFactor && (m.emissiveFactor[0] + m.emissiveFactor[1] + m.emissiveFactor[2]) > 0) { mat.emissive = new Color().setRGB(m.emissiveFactor[0], m.emissiveFactor[1], m.emissiveFactor[2]); }
    mats.push(mat);
  }
  const defMat = new T.MeshStandardMaterial({ color: 0xbbbbbb, roughness: .8, metalness: .1 });
  /* nós */
  const jointSet = new Set(); (json.skins || []).forEach(s => s.joints.forEach(j => jointSet.add(j)));
  const nodes = json.nodes.map((n, i) => {
    const o = jointSet.has(i) ? new T.Bone() : new T.Object3D(); o.name = n.name || ('n' + i);
    if (n.matrix) { o.matrix.fromArray(n.matrix); o.matrix.decompose(o.position, o.quaternion, o.scale); }
    else { if (n.translation) o.position.fromArray(n.translation); if (n.rotation) o.quaternion.fromArray(n.rotation); if (n.scale) o.scale.fromArray(n.scale); }
    return o;
  });
  json.nodes.forEach((n, i) => (n.children || []).forEach(c => nodes[i].add(nodes[c])));
  const skinned = [];
  const hide = opts.hide || (() => false);
  json.nodes.forEach((n, i) => {
    if (n.mesh === undefined) return;
    const md = json.meshes[n.mesh];
    md.primitives.forEach(p => {
      const mat = p.material !== undefined ? mats[p.material] : defMat;
      if (hide(nodes[i].name, md.name || '', mat.name || '')) return;
      const g = new T.BufferGeometry(); const at = p.attributes;
      g.setAttribute('position', new T.BufferAttribute(getAcc(at.POSITION), 3));
      if (at.NORMAL !== undefined) g.setAttribute('normal', new T.BufferAttribute(getAcc(at.NORMAL), 3));
      if (at.TEXCOORD_0 !== undefined) g.setAttribute('uv', new T.BufferAttribute(getAcc(at.TEXCOORD_0), 2));
      if (at.COLOR_0 !== undefined && !mat.map) { const c = getAcc(at.COLOR_0); const nc = acc[at.COLOR_0].type === 'VEC4' ? 4 : 3; if (nc === 3) g.setAttribute('color', new T.BufferAttribute(c, 3)); mat.vertexColors = nc === 3; }
      if (p.indices !== undefined) { const ix = getAcc(p.indices); g.setIndex(new T.BufferAttribute(ix.constructor === Uint8Array ? Uint16Array.from(ix) : ix, 1)); }
      if (at.NORMAL === undefined) g.computeVertexNormals();
      let mesh;
      if (n.skin !== undefined && at.JOINTS_0 !== undefined) {
        g.setAttribute('skinIndex', new T.BufferAttribute(Uint16Array.from(getAcc(at.JOINTS_0)), 4));
        g.setAttribute('skinWeight', new T.BufferAttribute(getAcc(at.WEIGHTS_0), 4));
        mesh = new T.SkinnedMesh(g, mat); mesh.userData.skin = n.skin; skinned.push(mesh);
      } else mesh = new T.Mesh(g, mat);
      mesh.name = md.name || nodes[i].name; mesh.frustumCulled = false;
      nodes[i].add(mesh);
    });
  });
  const sceneDef = json.scenes[json.scene || 0];
  const root = new T.Group(); sceneDef.nodes.forEach(i => root.add(nodes[i]));
  root.updateMatrixWorld(true);
  const skins = (json.skins || []).map(s => {
    const bones = s.joints.map(j => nodes[j]); const inv = s.inverseBindMatrices !== undefined ? getAcc(s.inverseBindMatrices) : null;
    const bi = bones.map((b, k) => inv ? new Matrix4().fromArray(inv, k * 16) : new Matrix4());
    return new T.Skeleton(bones, bi);
  });
  skinned.forEach(m => { m.bind(skins[m.userData.skin], new Matrix4()); });
  /* animações */
  const clips = (json.animations || []).map(a => {
    const tracks = [];
    a.channels.forEach(ch => {
      const s = a.samplers[ch.sampler], node = nodes[ch.target.node]; if (!node) return;
      const times = getAcc(s.input), vals = getAcc(s.output), p = ch.target.path;
      if (p === 'rotation') tracks.push(new T.QuaternionKeyframeTrack(node.uuid + '.quaternion', times, vals));
      else if (p === 'translation') tracks.push(new T.VectorKeyframeTrack(node.uuid + '.position', times, vals));
      else if (p === 'scale') tracks.push(new T.VectorKeyframeTrack(node.uuid + '.scale', times, vals));
    });
    return new T.AnimationClip(a.name || 'clip', -1, tracks);
  });
  return { root, nodes, clips, skins, skinned, json };
}

/* =====================================================================
   Luz e ambiente
   ===================================================================== */
function makeEnv(renderer) {
  const pm = new T.PMREMGenerator(renderer), es = new T.Scene();
  es.add(new T.Mesh(new T.SphereGeometry(60, 32, 16), new T.ShaderMaterial({
    side: T.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 vP;void main(){float h=vP.y*.5+.5;vec3 c=mix(vec3(.015,.025,.045),vec3(.05,.1,.2),smoothstep(.15,.55,h));c=mix(c,vec3(.22,.36,.62),smoothstep(.6,1.,h)*.8);gl_FragColor=vec4(c,1.);}'
  })));
  const panel = (c, k, p, s) => { const m = new T.Mesh(new T.PlaneGeometry(s, s), new T.MeshBasicMaterial({ color: new Color(c).multiplyScalar(k), side: T.DoubleSide })); m.position.copy(p); m.lookAt(0, 0, 0); es.add(m); };
  panel(0xb4d4ff, 7, V3(9, 20, 12), 16); panel(0xffa35c, 3.2, V3(-16, 4, -4), 10); panel(0x6ab0ff, 2.2, V3(14, 3, -12), 12); panel(0xffffff, 1.2, V3(0, 6, 16), 10);
  const rt = pm.fromScene(es, 0.03); pm.dispose();
  return rt.texture;
}

/* ---------- GLB do Orc ---------- */
const GLB_HIDE = (n, m, mat) => /checker/i.test(mat) || /flag|pole|ground|floor/i.test(n + ' ' + m);
/** Caminho do modelo no modo desenvolvimento (servidor local), relativo ao index.html. */
const ORC_URL = 'assets/modelos/orc.glb';
/**
 * Carrega o modelo do Orc.
 * - HTML único (dist): o GLB está embutido em base64 em <script id="orc-glb">.
 * - Modo desenvolvimento: baixa assets/modelos/orc.glb.
 * Retorna o modelo já interpretado (ver parseGLB) ou null se não for possível carregar.
 */
async function loadOrc() {
  const el = document.getElementById('orc-glb');
  if (el) return parseGLB(b64ToBuffer(el.textContent.trim()), { hide: GLB_HIDE });
  try { const r = await fetch(ORC_URL); if (!r.ok) return null; return parseGLB(await r.arrayBuffer(), { hide: GLB_HIDE }); }
  catch (e) { console.error('[3D] falha ao baixar', ORC_URL, e); return null; }
}

export { loadOrc, makeEnv, parseGLB };
