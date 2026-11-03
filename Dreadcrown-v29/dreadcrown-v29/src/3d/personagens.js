/* =====================================================================
   Personagens procedurais (raças sem GLB e inimigos)
   ---------------------------------------------------------------------
   RESPONSABILIDADE: Humanoid monta os heróis das raças que ainda não têm modelo GLB; Creature monta os 15 inimigos; também guarda as peças de arma e o mapeamento nome-do-inimigo → tipo.
   RELAÇÃO COM OUTROS MÓDULOS: Usa atores.js, primitivas.js, catalogo.js. Chamado por combate3d.makeHero e pela ponte.
   API PÚBLICA: Humanoid, Creature, enemyKindFor(nome), weaponSword/Staff/Mace/Dagger/Bow, shieldMesh.
   REGRAS / CUIDADOS: São modelos simples, feitos de primitivas: o próximo passo planejado é trocá-los por modelos GLB riggados como o do Orc.
   ===================================================================== */
import { Actor } from './atores.js';
import { bx, cy, pv, sp } from './kit.js';
import { BOX, CAP, CONE, CYL, G, MAT, SPH, TOR, at, darken, mk } from './primitivas.js';
import { T, TAU, V3, col, hashStr } from '../core/util.js';
import { BRCOL, CLASSCOL, ENEMIES, RACE, themeOf } from '../data/catalogo.js';

/* peças de arma — lâmina cresce para -Y (continua o braço) */
function weaponSword(big, accent, th) {
  const L = big ? 1.25 : .95, g = new T.Group();
  g.add(at(mk(CYL(.045, .06, .3, 8), '#5a3a22'), 0, .02, 0)); g.add(at(mk(BOX(.34, .06, .09), '#c9a24b', { metalness: .8, roughness: .3 }), 0, -.15, 0));
  const bl = mk(BOX(big ? .14 : .1, L, .035), '#dfe6ee', { metalness: .95, roughness: .18, emissive: accent, emissiveIntensity: .12 }); bl.position.y = -.15 - L / 2; g.add(bl);
  const tip = mk(CONE(big ? .1 : .07, .2, 4), '#dfe6ee', { metalness: .95, roughness: .18 }); tip.rotation.z = Math.PI; tip.rotation.y = Math.PI / 4; tip.scale.z = .5; tip.position.y = -.15 - L - .08; g.add(tip);
  const edge = mk(BOX(.018, L, .04), accent, { emissive: accent, emissiveIntensity: 1.6 }); edge.position.set(.0, -.15 - L / 2, 0); g.add(edge);
  g.userData.keep = 0; return g;
}
function weaponStaff(accent, th) {
  const g = new T.Group(); g.add(mk(CYL(.04, .05, 2.0, 8), '#5a3a22'));
  const orb = mk(SPH(.17, 14, 10), accent, { emissive: accent, emissiveIntensity: 2.2, roughness: .2 }); orb.position.y = 1.12; g.add(orb);
  const cl = mk(TOR(.16, .035), '#c9a24b', { metalness: .8 }); cl.position.y = 1.0; cl.rotation.x = Math.PI / 2; g.add(cl);
  [-1, 1].forEach(s => { const p = mk(CONE(.045, .26, 6), '#c9a24b', { metalness: .8 }); p.position.set(0, 1.18, s * .17); p.rotation.x = s * -.4; g.add(p); });
  g.position.y = .2; const w = G(g); w.userData.keep = .85; w.userData.orb = orb; return w;
}
function weaponMace(accent) {
  const g = new T.Group(); g.add(mk(CYL(.04, .05, .9, 8), '#5a3a22')); const h = mk(SPH(.2, 12, 8), '#c9a24b', { metalness: .8, roughness: .3 }); h.position.y = -.55; g.add(h);
  for (let i = 0; i < 8; i++) { const s = mk(CONE(.05, .12, 6), '#e8c968', { metalness: .8 }); const a = i / 8 * TAU; s.position.set(Math.cos(a) * .2, -.55, Math.sin(a) * .2); s.rotation.z = -Math.cos(a) * Math.PI / 2; s.rotation.x = Math.sin(a) * Math.PI / 2; g.add(s); }
  const gem = mk(SPH(.07), accent, { emissive: accent, emissiveIntensity: 2.4 }); gem.position.set(.2, -.55, 0); g.add(gem); g.userData.keep = 0; return g;
}
function weaponDagger(accent) {
  const g = new T.Group(); g.add(at(mk(CYL(.03, .035, .2, 8), '#2a2030'), 0, 0, 0)); g.add(at(mk(BOX(.2, .035, .06), '#6a5a78', { metalness: .7 }), 0, -.1, 0));
  const bl = mk(BOX(.06, .5, .02), '#cfd6e0', { metalness: .95, roughness: .2, emissive: accent, emissiveIntensity: .35 }); bl.position.y = -.37; g.add(bl);
  const tip = mk(CONE(.04, .14, 4), '#cfd6e0', { metalness: .95 }); tip.rotation.z = Math.PI; tip.position.y = -.69; g.add(tip); g.userData.keep = 0; return g;
}
function weaponBow(accent) {
  const g = new T.Group(); const arc = mk(new T.TorusGeometry(.62, .035, 8, 24, Math.PI * .85), '#6a4528'); arc.rotation.z = Math.PI / 2 - Math.PI * .425; arc.position.x = -.5; g.add(arc);
  const pts = [V3(0, .6 * Math.cos(.15), 0)]; const str = mk(BOX(.012, 1.2, .012), '#e8e0cc'); str.position.set(0, 0, 0); g.add(str);
  const gem = mk(SPH(.05), accent, { emissive: accent, emissiveIntensity: 2.4 }); gem.position.set(.12, 0, 0); g.add(gem);
  const w = G(g); w.userData.keep = 1; return w;
}
function shieldMesh(kind, accent) {
  const g = new T.Group();
  if (kind === 'round') { const d = mk(CYL(.5, .5, .09, 24), '#8a96a4', { metalness: .85, roughness: .35 }); d.rotation.x = Math.PI / 2; g.add(d); const r = mk(TOR(.5, .035), '#c9a24b', { metalness: .8 }); g.add(r); const b = mk(SPH(.14, 10, 8), accent, { metalness: .6, emissive: accent, emissiveIntensity: .8 }); b.position.z = .06; g.add(b); }
  else { const s = new T.Shape(); s.moveTo(-.34, .5); s.lineTo(.34, .5); s.lineTo(.34, -.05); s.quadraticCurveTo(.3, -.4, 0, -.66); s.quadraticCurveTo(-.3, -.4, -.34, -.05); s.closePath(); const m = mk(new T.ExtrudeGeometry(s, { depth: .07, bevelEnabled: true, bevelSize: .03, bevelThickness: .02, bevelSegments: 2 }), '#e8e4d8', { metalness: .7, roughness: .35 }); m.position.z = -.035; g.add(m); const c = mk(BOX(.12, .85, .02), accent, { emissive: accent, emissiveIntensity: .9 }); c.position.set(0, .0, .09); g.add(c); const c2 = mk(BOX(.5, .12, .02), accent, { emissive: accent, emissiveIntensity: .9 }); c2.position.set(0, .22, .09); g.add(c2); }
  return g;
}

class Humanoid extends Actor {
  constructor(world, cfg) {
    super(world, cfg);
    const R = RACE[cfg.race] || RACE.humano, cls = cfg.cls || 'tanke', br = cfg.br >= 0 ? cfg.br : 0, th = cfg.th || themeOf(cls, br);
    this.theme = th; this.cfg = cfg; const accent = col((BRCOL[cls] || [])[br] || CLASSCOL[cls]).getStyle();
    const cc = CLASSCOL[cls], W = R.w, S = R.s; this.accent = accent;
    const skin = R.skin, ghost = th === 'ghost';
    const MA = (c, o) => MAT(c, ghost ? Object.assign({}, o, { alphaT: .78 }) : o);
    const body = this.inner = new T.Group(); this.body.add(body);
    const armorC = { tanke: '#8c97a6', mago: '#3a4a8a', paladino: '#d8d4c4', clerigo: '#e8e4d4', assassino: '#2a2634', arqueiro: '#4a6a3a' }[cls];
    const trimC = { tanke: accent, mago: accent, paladino: '#d8b24a', clerigo: '#d8b24a', assassino: accent, arqueiro: '#8a6a3a' }[cls];
    const metal = ['tanke', 'paladino'].includes(cls);
    const A = (geo, c, o = {}) => { const m = new T.Mesh(geo, MA(c, Object.assign({ roughness: metal ? .35 : .75, metalness: metal ? .75 : .05 }, o))); return m; };
    const SK = geo => new T.Mesh(geo, MA(skin, { roughness: .7 }));
    /* pernas */
    const mkLeg = z => { const l = new T.Group(); l.position.set(0, .95, z * .13 * W); const lc = cls === 'mago' || cls === 'clerigo' ? darken(armorC, .4) : darken(armorC, .25);
      const th_ = A(CAP(.11 * W, .3), lc); th_.position.y = -.25; const kn = new T.Group(); kn.position.y = -.49; const sh = A(CAP(.085 * W, .3), lc); sh.position.y = -.24; const kj = A(SPH(.095 * W, 14, 10), lc); const boot = A(BOX(.34, .16, .17 * W, .07), '#2c2018', { metalness: .1, roughness: .8 }); boot.position.set(.07, -.47, 0);
      kn.add(sh, kj, boot); l.add(th_, kn); l.userData.knee = kn; return l; };
    this.legR = mkLeg(1); this.legL = mkLeg(-1);
    /* tronco */
    const torso = this.torso = new T.Group(); torso.position.y = .95;
    const prof = [[.001,-.3],[.14,-.29],[.18,-.2],[.19,-.06],[.225,.08],[.27,.2],[.265,.31],[.2,.38],[.11,.41],[.001,.42]].map(q => new T.Vector2(q[0] * W, q[1]));
    const chest = A(new T.LatheGeometry(prof, 32), armorC); chest.scale.set(.82, 1, 1.05); chest.position.y = .33; torso.add(chest);
    const belt = A(CYL(.22 * W, .22 * W, .1, 14), '#3a2a1a', { metalness: .2 }); belt.scale.x = .8; belt.position.y = .04; torso.add(belt);
    const buckle = mk(BOX(.06, .08, .22), trimC, { metalness: .9, roughness: .3, emissive: trimC, emissiveIntensity: .25 }); buckle.position.set(.18 * W, .04, 0); torso.add(buckle);
    /* cabeça */
    const head = this.head = new T.Group(); head.position.y = .72; torso.add(head);
    const hd = SK(SPH(.17, 16, 12)); hd.scale.set(1, 1.08, .96); head.add(hd);
    const eyeC = ['dark', 'shadow', 'blood'].includes(th) ? accent : (cls === 'mago' ? accent : '#1a1a22');
    [-1, 1].forEach(s => { const e = mk(SPH(.028, 8, 6), eyeC, { emissive: eyeC, emissiveIntensity: eyeC === '#1a1a22' ? 0 : 2.4 }); e.position.set(.15, .03, s * .065); head.add(e); });
    const nose = SK(CONE(.03, .06, 6)); nose.rotation.z = -Math.PI / 2; nose.position.set(.17, -.02, 0); head.add(nose);
    if (R.ears) [-1, 1].forEach(s => { const e = SK(CONE(.05, R.ears && cfg.race === 'elfo' ? .3 : .18, 6)); e.rotation.x = s * 1.25; e.rotation.z = cfg.race === 'elfo' ? .3 : 0; e.position.set(-.01, .06, s * .21); head.add(e); });
    if (R.horns) [-1, 1].forEach(s => { const h = mk(CONE(.045, .34, 8), '#2a1a22', { roughness: .4 }); h.rotation.x = s * .5; h.rotation.z = .3; h.position.set(-.05, .18, s * .1); head.add(h); });
    if (R.tusks) [-1, 1].forEach(s => { const t = mk(CONE(.025, .12, 6), '#f2ecd0'); t.position.set(.15, -.1, s * .07); head.add(t); });
    if (R.beard) { const b = mk(CONE(.15, .34, 10), R.beard, { roughness: .9 }); b.rotation.z = Math.PI; b.position.set(.1, -.28, 0); b.scale.z = .8; head.add(b); const m = mk(SPH(.07, 8, 6), R.beard, { roughness: .9 }); m.position.set(.14, -.08, 0); m.scale.set(.6, .7, 1.6); head.add(m); }
    if (cfg.race !== 'orc' && cfg.race !== 'tiefling') { const hair = mk(SPH(.178, 14, 10, 0, TAU, 0, Math.PI * .55), cfg.race === 'elfo' ? '#e8e0b0' : cfg.race === 'anao' ? '#a8501c' : '#3a2a1c', { roughness: .9 }); hair.rotation.z = .25; hair.position.set(-.02, .03, 0); if (cls !== 'tanke' && cls !== 'paladino') head.add(hair); }
    this.addClass(cls, br, th, accent, armorC, trimC, A, torso, head, metal, W);
    /* braços */
    const mkArm = z => { const a = new T.Group(); a.position.set(0, 1.5, z * .3 * W); const up = A(CAP(.075 * W, .3), cls === 'mago' || cls === 'clerigo' ? armorC : darken(armorC, .1)); up.position.y = -.22; a.add(up); const el = new T.Group(); el.position.y = -.5; const fo = A(CAP(.066 * W, .28), ['assassino', 'arqueiro', 'mago'].includes(cls) ? darken(armorC, .2) : armorC); fo.position.y = -.22; const hand = SK(SPH(.075, 10, 8)); hand.position.y = -.46; const hold = new T.Group(); hold.position.y = -.46; el.add(fo, hand, hold); a.add(el); a.userData.el = el; a.userData.hold = hold; if (['tanke', 'paladino'].includes(cls)) { const pa = A(SPH(.17 * W, 14, 10), armorC); pa.scale.set(1, .75, 1); pa.position.y = -.02; a.add(pa); const pr = A(CONE(.05, .16, 6), trimC); pr.position.y = .1; a.add(pr); } return a; };
    this.armR = mkArm(1); this.armL = mkArm(-1);
    [this.legR, this.legL, torso, this.armR, this.armL].forEach(o => body.add(o));
    this.addWeapons(cls, br, th, accent);
    this.addTheme(th, accent, body, torso, head);
    if (R.tail) { const t = new T.Group(); t.position.set(-.12, .98, 0); const s1 = mk(CAP(.04, .5), skin); s1.rotation.z = 1.9; s1.position.set(-.25, -.05, 0); t.add(s1); const tip = mk(CONE(.07, .16, 4), '#2a1a22'); tip.rotation.z = 1.9; tip.position.set(-.55, -.12, 0); t.add(tip); body.add(t); this.tail = t; }
    body.scale.setScalar(S); body.userData.s = S; this.height = 1.9 * S * (cfg.sizeK || 1); this.width = .8 * W * S; this.sc = S;
    this.root.scale.setScalar(cfg.sizeK || 1);
    this.collectMats(body); this.setShadow(1.5 * W * S, 1.0 * S);
    if (ghost) this.alpha = 1;
    this.keep = [];
  }
  addClass(cls, br, th, accent, armorC, trimC, A, torso, head, metal, W) {
    const add = o => torso.add(o);
    if (cls === 'tanke') {
      const h = A(SPH(.2, 14, 10), '#8c97a6'); h.scale.set(1, 1.05, 1); h.position.y = .01; head.add(h);
      const v = mk(BOX(.06, .07, .34), '#10141a'); v.position.set(.17, .02, 0); head.add(v);
      const cr = mk(BOX(.04, .12, .34), accent, { emissive: accent, emissiveIntensity: .35 }); cr.position.set(0, .22, 0); cr.rotation.z = .1; head.add(cr);
      if (br === 2) [-1, 1].forEach(s => { const hn = mk(CONE(.05, .4, 8), '#e8e0c8'); hn.rotation.x = s * 1.0; hn.rotation.z = .2; hn.position.set(0, .12, s * .2); head.add(hn); });
      if (br === 3) for (let i = 0; i < 5; i++) { const sp = mk(CONE(.04, .2, 5), '#aab3c0', { metalness: .8 }); sp.position.set(-.1 + i * .05, .21, 0); head.add(sp); }
      const plate = A(BOX(.12, .5, .46 * W), '#9aa6b4'); plate.position.set(.2 * W, .3, 0); add(plate);
      const gem = mk(SPH(.06), accent, { emissive: accent, emissiveIntensity: 2 }); gem.position.set(.28 * W, .42, 0); add(gem);
      const skirt = A(CYL(.26 * W, .32 * W, .3, 12, 1, true), '#6c7684'); skirt.scale.x = .8; skirt.position.y = -.1; add(skirt);
    } else if (cls === 'mago') {
      const robe = A(CONE(.42 * W, 1.0, 14), armorC, { roughness: .85 }); robe.scale.x = .85; robe.position.y = -.12; add(robe);
      const sash = mk(BOX(.45, .09, .5), accent, { emissive: accent, emissiveIntensity: .4 }); sash.position.y = .06; add(sash);
      const hat = A(CONE(.24, .62, 12), darken(armorC, .2), { roughness: .9 }); hat.position.set(-.03, .22, 0); hat.rotation.z = .25; head.add(hat);
      const brim = A(CYL(.32, .32, .035, 20), darken(armorC, .2), { roughness: .9 }); brim.position.y = .1; head.add(brim);
      const band = mk(CYL(.2, .21, .05, 16), accent, { emissive: accent, emissiveIntensity: .8 }); band.position.y = .14; head.add(band);
      const cape = A(BOX(.04, .85, .5), darken(armorC, .3), { roughness: .9 }); cape.position.set(-.2, .15, 0); cape.rotation.z = -.12; this.cape = cape; add(cape);
    } else if (cls === 'paladino') {
      const hm = A(SPH(.2, 14, 10), '#e0dccb'); hm.scale.set(1, 1.05, 1); head.add(hm); const vz = mk(BOX(.05, .05, .3), '#1a1a22'); vz.position.set(.18, .02, 0); head.add(vz);
      const wing = mk(BOX(.05, .22, .1), '#d8b24a', { metalness: .8 }); [-1, 1].forEach(s => { const w = wing.clone(); w.position.set(0, .05, s * .2); w.rotation.x = s * -.6; head.add(w); });
      const tab = A(BOX(.04, .75, .3), '#f4f0e0', { roughness: .8 }); tab.position.set(.22 * W, .0, 0); add(tab); const cross = mk(BOX(.05, .26, .05), accent, { emissive: accent, emissiveIntensity: 1 }); cross.position.set(.25 * W, .1, 0); add(cross); const c2 = mk(BOX(.05, .05, .2), accent, { emissive: accent, emissiveIntensity: 1 }); c2.position.set(.25 * W, .14, 0); add(c2);
      const cape = A(BOX(.04, 1.1, .6), accent, { roughness: .85, emissive: accent, emissiveIntensity: .12 }); cape.position.set(-.22, .0, 0); cape.rotation.z = -.1; this.cape = cape; add(cape);
    } else if (cls === 'clerigo') {
      const robe = A(CONE(.4 * W, 1.0, 14), armorC, { roughness: .85 }); robe.scale.x = .85; robe.position.y = -.12; add(robe);
      const stole = mk(BOX(.04, .95, .12), accent, { emissive: accent, emissiveIntensity: .35 }); stole.position.set(.22, 0, 0); add(stole);
      const mit = A(CONE(.17, .34, 4), '#e8e4d4'); mit.position.set(0, .22, 0); head.add(mit); const mc = mk(BOX(.04, .2, .04), '#d8b24a', { metalness: .8 }); mc.position.set(.1, .24, 0); head.add(mc);
      const col2 = mk(TOR(.17, .045), '#d8b24a', { metalness: .8 }); col2.rotation.x = Math.PI / 2; col2.position.y = .58; add(col2);
    } else if (cls === 'assassino') {
      const hood = A(SPH(.2, 14, 10, 0, TAU, 0, Math.PI * .7), '#1c1824', { roughness: .95 }); hood.position.set(-.02, .03, 0); head.add(hood); const pt = A(CONE(.1, .3, 8), '#1c1824'); pt.rotation.z = 1.6; pt.position.set(-.26, .0, 0); head.add(pt);
      const mask = mk(BOX(.04, .1, .26), '#14101a'); mask.position.set(.16, -.06, 0); head.add(mask);
      const scarf = mk(BOX(.5, .08, .08), accent, { emissive: accent, emissiveIntensity: .5 }); scarf.position.set(-.32, .5, 0); scarf.rotation.z = -.4; add(scarf); this.scarf = scarf;
      const strap = A(BOX(.05, .75, .06), '#14101a'); strap.rotation.x = .55; strap.position.set(.01, .3, 0); strap.rotation.z = 0; add(strap);
      const sk = A(BOX(.34, .32, .4 * W), '#262030', { roughness: .9 }); sk.position.y = -.12; add(sk);
    } else if (cls === 'arqueiro') {
      const hood = A(SPH(.2, 14, 10, 0, TAU, 0, Math.PI * .65), '#3e5a30', { roughness: .95 }); hood.position.set(-.02, .03, 0); head.add(hood);
      const cl = A(BOX(.04, .6, .5), '#3e5a30', { roughness: .95 }); cl.position.set(-.22, .22, 0); cl.rotation.z = -.15; this.cape = cl; add(cl);
      const q = A(CYL(.07, .06, .55, 8), '#5a3a22'); q.position.set(-.2, .35, .1); q.rotation.z = .3; add(q); for (let i = 0; i < 4; i++) { const ar = mk(CYL(.012, .012, .2, 4), '#e8e0cc'); ar.position.set(-.26 - i * .005, .68, .08 + i * .018); ar.rotation.z = .3; add(ar); const f = mk(CONE(.03, .06, 4), accent, { emissive: accent, emissiveIntensity: 1 }); f.position.set(-.27, .78, .08 + i * .018); f.rotation.z = .3; add(f); }
      const bd = A(BOX(.05, .6, .06), '#5a3a22'); bd.rotation.x = -.5; bd.position.set(.02, .32, 0); add(bd);
      const sk = A(BOX(.3, .28, .38 * W), '#4a6a3a', { roughness: .9 }); sk.position.y = -.1; add(sk);
    }
  }
  addWeapons(cls, br, th, accent) {
    const hR = this.armR.userData.hold, hL = this.armL.userData.hold;
    const put = (hand, w, rz = 0, keep) => { hand.add(w); w.rotation.z = rz; w.userData.rest = rz; if (keep !== undefined) w.userData.keep = keep; this.keep.push({ w, arm: hand.parent.parent }); };
    this.keep = this.keep || [];
    if (cls === 'tanke') { put(hR, weaponSword(true, accent, th), 1.0); const s = shieldMesh('round', accent); hL.add(s); s.position.set(.12, 0, -.1); s.rotation.y = Math.PI / 2; s.rotation.z = 0; }
    else if (cls === 'mago') { const st = weaponStaff(accent, th); put(hR, st, 0); this.orb = st.userData.orb; }
    else if (cls === 'paladino') { put(hR, weaponSword(false, accent, th), 1.0); const s = shieldMesh('kite', accent); hL.add(s); s.position.set(.12, -.1, -.1); s.rotation.y = Math.PI / 2; }
    else if (cls === 'clerigo') { put(hR, weaponMace(accent), .5); const hs = mk(TOR(.12, .025), '#d8b24a', { metalness: .8, emissive: accent, emissiveIntensity: .6 }); hs.position.set(.1, -.1, 0); hs.rotation.y = Math.PI / 2; hL.add(hs); }
    else if (cls === 'assassino') { put(hR, weaponDagger(accent), .55); put(hL, weaponDagger(accent), .55); }
    else if (cls === 'arqueiro') { put(hL, weaponBow(accent), 0, 1); hL.children[0].rotation.y = 0; }
  }
  addTheme(th, accent, body, torso, head) {
    const c = col(accent); const em = { emissive: accent, emissiveIntensity: 1.6 };
    if (th === 'fire') { for (let i = 0; i < 3; i++) { const f = mk(CONE(.06, .26 - i * .04, 6), '#ff8a2a', em); f.position.set(-.08 + i * .06, .26, 0); f.rotation.z = -.2; head.add(f); } }
    if (th === 'ice') [-1, 1].forEach(s => { const sh = mk(CONE(.05, .3, 5), '#bfeaff', { emissive: '#7fd8ff', emissiveIntensity: .8, roughness: .1 }); sh.position.set(0, 1.58, s * .38); sh.rotation.x = s * -.5; body.add(sh); });
    if (th === 'holy') { const h = mk(TOR(.2, .015, 6, 28), '#ffe27a', { emissive: '#ffd868', emissiveIntensity: 2.4 }); h.position.set(-.05, .34, 0); h.rotation.x = Math.PI / 2 - .25; head.add(h); }
    if (th === 'nature') { [-1, 1].forEach(s => { const a = mk(CONE(.025, .3, 5), '#7a5a30'); a.position.set(-.04, .22, s * .09); a.rotation.x = s * -.35; head.add(a); const l = mk(SPH(.06, 6, 5), '#62d868', { emissive: '#2a8a30', emissiveIntensity: .8 }); l.scale.set(1, .3, 1.4); l.position.set(0, .46, s * .22); head.add(l); }); }
    if (th === 'dark' || th === 'blood') { const cp = mk(BOX(.03, .95, .55), th === 'blood' ? '#6a0a14' : '#1c0c30', { roughness: .95 }); cp.position.set(-.26, .35, 0); cp.rotation.z = -.12; torso.add(cp); this.cape = this.cape || cp; }
    if (th === 'poison') for (let i = 0; i < 3; i++) { const v = mk(CYL(.04, .04, .12, 8), '#86d83a', { emissive: '#86d83a', emissiveIntensity: 1.1, roughness: .1 }); v.position.set(.05 + i * .09, .06, .2); torso.add(v); }
    if (th === 'ghost') { const rg = mk(TOR(.36, .012, 6, 30), '#a4e4f0', { emissive: '#a4e4f0', emissiveIntensity: 2, alphaT: .7 }); rg.rotation.x = Math.PI / 2; rg.position.y = .3; torso.add(rg); }
    if (th === 'astral' || th === 'elemental') {
      this.orbs = []; const cs = th === 'astral' ? [accent, accent, accent] : ['#ff8a2a', '#7fd8ff', '#fff08a'];
      cs.forEach((cc, i) => { const o = mk(SPH(.07, 10, 8), cc, { emissive: cc, emissiveIntensity: 2.5 }); o.userData.ph = i / cs.length * TAU; body.add(o); this.orbs.push(o); });
    }
    if (th === 'lightning') { const hl = mk(TOR(.19, .014, 6, 24), '#fff08a', { emissive: '#fff08a', emissiveIntensity: 2.4 }); hl.position.y = .22; hl.rotation.x = Math.PI / 2; head.add(hl); }
    if (th === 'shadow') { const m = mk(CONE(.2, .8, 8, 1), '#0a0818', { roughness: 1, alphaT: .55 }); m.position.set(-.3, .3, 0); m.rotation.z = Math.PI / 2 + .2; torso.add(m); }
  }
  handWorld(v) { const h = this.armR.userData.hold; h.updateMatrixWorld(true); return h.getWorldPosition(v).add(V3(.25 * this.dir, -.1, 0)); }
  anchorHand() { return this.handWorld(V3()); }
  idlePose(p, t) {
    super.idlePose(p, t); const sw = Math.sin(t * 1.3) * .5; p.armR += sw * .05; p.legF += Math.sin(t * .9) * .03; p.twist += Math.sin(t * .7) * .04;
  }
  apply(p, dt) {
    this.body.position.y = p.y; this.body.rotation.set(p.roll, p.yaw, -p.lean * .3 + p.flip); if (p.flip) { const cy = this.height * .5; this.body.position.x = Math.sin(p.flip) * cy; this.body.position.y += cy - Math.cos(p.flip) * cy; } else this.body.position.x = 0;
    const sq = p.squash, sc = p.scale; this.body.scale.set(sc * (1 - sq * .5), sc * (1 + sq), sc * (1 - sq * .5));
    this.torso.rotation.set(0, p.twist, -p.lean * .75); this.head.rotation.z = p.lean * .3 + Math.sin(this.t * 1.1) * .03; this.head.rotation.y = -p.twist * .5;
    const rest = this.cfg.cls === 'arqueiro' ? { R: .12, L: 0 } : { R: .08, L: -.08 };
    let aR = p.armR + rest.R, aL = p.armL + rest.L;
    if (this.cfg.cls === 'arqueiro') { aL = Math.max(aL, 0) + (p.armL > .5 ? 0 : 0); }
    this.armR.rotation.z = aR; this.armL.rotation.z = aL; this.armR.rotation.y = this.armL.rotation.y = 0;
    this.armR.userData.el.rotation.z = .18 + Math.max(0, aR) * .22; this.armL.userData.el.rotation.z = .18 + Math.max(0, aL) * .22;
    this.legR.rotation.z = p.legF * .7; this.legL.rotation.z = -p.legF * .55;
    this.legR.userData.knee.rotation.z = -(.1 + Math.max(0, p.legF) * .9 + Math.max(0, -p.legF) * .35); this.legL.userData.knee.rotation.z = -(.1 + Math.max(0, -p.legF) * 1.1 + Math.max(0, p.legF) * .25);
    for (const k of this.keep) { const a = k.arm.rotation.z; k.w.rotation.z = (k.w.userData.rest || 0) - (k.w.userData.keep || 0) * (a - (this.cfg.cls === 'arqueiro' ? 0 : 0)); }
    if (this.cape) this.cape.rotation.z = -.12 - p.lean * .5 + Math.sin(this.t * 2.2) * .05 - Math.abs(p.x) * .02;
    if (this.scarf) this.scarf.rotation.z = -.4 + Math.sin(this.t * 3) * .12 - p.lean * .3;
    if (this.tail) this.tail.rotation.z = Math.sin(this.t * 2) * .15;
    if (this.orb) this.orb.material.emissiveIntensity = 2.2 + Math.sin(this.t * 3) * .7;
    if (this.orbs) this.orbs.forEach(o => { const a = this.t * 1.6 + o.userData.ph; o.position.set(Math.cos(a) * .62, 1.1 + Math.sin(this.t * 2 + o.userData.ph) * .25, Math.sin(a) * .62); });
  }
  handPos(side) { const h = (side === 'L' ? this.armL : this.armR).userData.hold; h.updateMatrixWorld(true); return h.getWorldPosition(V3()); }
}

/* =====================================================================
   Inimigos
   ===================================================================== */
const eye = (r, c, x, y, z) => { const e = mk(SPH(r, 8, 6), c, { emissive: c, emissiveIntensity: 2.4 }); e.position.set(x, y, z); return e; };
const limb = (len, r, c, o = {}) => { const g = new T.Group(); const m = mk(CAP(r, len, 4, 8), c, o); m.position.y = -len / 2 - r; g.add(m); return g; };
const ENEMY_BUILD = {
  goblin(S) { const g = G(), sk = '#6aa84a'; const b = mk(CAP(.2, .3), '#5a4028', { roughness: .9 }); b.position.y = .75; g.add(b); const h = mk(SPH(.24, 12, 10), sk); h.position.set(.04, 1.15, 0); h.scale.set(1, .9, 1); g.add(h);
    [-1, 1].forEach(s => { const e = mk(CONE(.07, .4, 6), sk); e.position.set(-.04, 1.22, s * .3); e.rotation.x = s * 1.35; e.rotation.z = .3; g.add(e); g.add(eye(.045, '#ffe27a', .22, 1.17, s * .1)); const l = limb(.4, .07, sk); l.position.set(0, .6, s * .1); g.add(l); l.userData.leg = s; });
    const n = mk(CONE(.05, .12, 6), sk); n.rotation.z = -Math.PI / 2; n.position.set(.28, 1.12, 0); g.add(n);
    const arm = limb(.4, .06, sk); arm.position.set(0, .95, .24); g.add(arm); const dg = weaponDagger('#cc6'); dg.position.y = -.62; dg.rotation.z = .6; arm.add(dg); const arm2 = limb(.4, .06, sk); arm2.position.set(0, .95, -.24); g.add(arm2);
    return { g, h: 1.35, armR: arm, armL: arm2 }; },
  slime(S) { const g = G(); const b = mk(SPH(.7, 20, 14), '#3a8ae0', { roughness: .1, metalness: 0, emissive: '#1a4aa0', emissiveIntensity: .5, alphaT: .78 }); b.scale.set(1, .78, 1); b.position.y = .55; g.add(b); const core = mk(SPH(.22, 10, 8), '#bfe8ff', { emissive: '#7fd8ff', emissiveIntensity: 1.6 }); core.position.set(-.08, .5, 0); g.add(core);
    g.add(eye(.07, '#ffffff', .6, .72, .2)); g.add(eye(.07, '#ffffff', .6, .72, -.2)); g.add(at(mk(SPH(.035), '#112', {}), .66, .72, .2)); g.add(at(mk(SPH(.035), '#112'), .66, .72, -.2));
    return { g, h: 1.2, body: b, tick(t, p) { const w = Math.sin(t * 3) * .05; b.scale.set(1 + w, .78 - w * 1.4, 1 + w); } }; },
  wolf(S) { const g = G(), fur = '#5a606b'; const b = mk(CAP(.32, .8, 6, 12), fur, { roughness: .95 }); b.rotation.z = Math.PI / 2; b.position.y = .75; g.add(b); const h = mk(SPH(.3, 12, 10), fur, { roughness: .95 }); h.position.set(.78, 1.0, 0); g.add(h); const sn = mk(CONE(.16, .4, 8), '#9aa0aa'); sn.rotation.z = -Math.PI / 2; sn.position.set(1.1, .94, 0); g.add(sn); g.add(at(mk(SPH(.05), '#111'), 1.28, .94, 0));
    [-1, 1].forEach(s => { const e = mk(CONE(.1, .24, 5), fur); e.position.set(.7, 1.3, s * .17); g.add(e); g.add(eye(.045, '#ffcc44', 1.0, 1.08, s * .14)); });
    const legs = []; [[.5, 1], [.5, -1], [-.5, 1], [-.5, -1]].forEach(([x, z]) => { const l = limb(.4, .09, fur); l.position.set(x, .62, z * .22); g.add(l); legs.push(l); });
    const tl = mk(CAP(.08, .5), fur); tl.rotation.z = 2.3; tl.position.set(-.95, .95, 0); g.add(tl); const ridge = mk(CONE(.1, .5, 6), '#555b64'); ridge.rotation.z = -Math.PI / 2; ridge.position.set(.2, 1.1, 0); g.add(ridge);
    return { g, h: 1.3, legs, tick(t) { legs.forEach((l, i) => l.rotation.z = Math.sin(t * 2 + i * 1.6) * .07); }, w: 2.1 }; },
  skeleton(S) { const g = G(), bn = '#e8e0cc'; const sp = mk(CYL(.04, .04, .7, 6), bn); sp.position.y = 1.0; g.add(sp); for (let i = 0; i < 5; i++) { const r = mk(TOR(.2 - i * .01, .02, 6, 14, Math.PI * 1.6), bn); r.rotation.x = Math.PI / 2; r.rotation.z = -Math.PI * .3; r.position.y = 1.3 - i * .1; r.scale.x = .8; g.add(r); }
    const pv = mk(BOX(.2, .12, .34), bn); pv.position.y = .62; g.add(pv); const sk = mk(SPH(.2, 12, 10), bn); sk.position.y = 1.62; sk.scale.set(1, 1.05, .9); g.add(sk); const jw = mk(BOX(.14, .08, .16), bn); jw.position.set(.08, 1.46, 0); g.add(jw);
    g.add(eye(.05, '#ff5a3a', .17, 1.64, .08)); g.add(eye(.05, '#ff5a3a', .17, 1.64, -.08));
    [-1, 1].forEach(s => { const l = limb(.5, .045, bn); l.position.set(0, .6, s * .12); g.add(l); });
    const ar = limb(.5, .04, bn); ar.position.set(0, 1.42, .28); g.add(ar); const ar2 = limb(.5, .04, bn); ar2.position.set(0, 1.42, -.28); g.add(ar2);
    const sw = weaponSword(false, '#9ff', 'physical'); sw.children.forEach(c => { if (c.material) c.material = c.material.clone(); }); sw.position.y = -.62; sw.rotation.z = .6; ar.add(sw);
    return { g, h: 1.9, armR: ar, armL: ar2 }; },
  bat(S) { const g = G(), c = '#4a3a58'; const b = mk(SPH(.28, 12, 10), c); b.position.y = 1.4; b.scale.set(1, 1.2, 1); g.add(b); [-1, 1].forEach(s => { const e = mk(CONE(.07, .2, 5), c); e.position.set(.02, 1.75, s * .12); g.add(e); g.add(eye(.04, '#ff3a3a', .24, 1.45, s * .09)); });
    const fn = [mk(CONE(.03, .08, 4), '#fff'), mk(CONE(.03, .08, 4), '#fff')]; const wings = []; [-1, 1].forEach(s => { const w = new T.Group(); w.position.set(0, 1.45, s * .24); const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0, .5); sh.lineTo(.5, 1.0); sh.lineTo(.6, .55); sh.lineTo(1.0, .5); sh.lineTo(.9, .1); sh.lineTo(.5, .2); sh.lineTo(.6, -.3); sh.lineTo(0, 0); const m = mk(new T.ShapeGeometry(sh), '#3a2a48', { side: T.DoubleSide, roughness: .9 }); m.rotation.x = Math.PI / 2; m.rotation.z = -Math.PI / 2; m.scale.set(.9, .9, .9); w.add(m); w.userData.s = s; g.add(w); wings.push(w); });
    return { g, h: 1.9, wings, tick(t) { wings.forEach(w => { w.rotation.x = w.userData.s * (Math.sin(t * 14) * .7 + .1); }); g.position.y = Math.sin(t * 2.2) * .12 + .15; } }; },
  spider(S) { const g = G(), c = '#2a1a3a'; const ab = mk(SPH(.5, 14, 10), c); ab.scale.set(1.2, .9, 1); ab.position.set(-.45, .75, 0); g.add(ab); const hd = mk(SPH(.3, 12, 10), '#3a2a4a'); hd.position.set(.25, .65, 0); g.add(hd);
    for (let i = 0; i < 6; i++) g.add(eye(.04, i % 2 ? '#b84aff' : '#ff4aaa', .5, .72 + (i % 3) * .06, -.15 + (i % 2) * .3 - (i >> 1) * 0));
    const legs = []; for (let i = 0; i < 8; i++) { const s = i < 4 ? 1 : -1, k = i % 4; const l = new T.Group(); l.position.set(.2 - k * .17, .7, s * .18); const u = mk(CAP(.04, .55), c); u.position.set(0, .22, s * .38); u.rotation.x = s * -1.05; l.add(u); const lo = mk(CAP(.032, .65), c); lo.position.set(0, -.15, s * .78); lo.rotation.x = s * .15; l.add(lo); l.rotation.y = (k - 1.5) * .35 * s; g.add(l); legs.push(l); }
    const fg = [-1, 1].map(s => { const f = mk(CONE(.04, .2, 5), '#d8d0b8'); f.rotation.z = Math.PI; f.position.set(.5, .48, s * .09); g.add(f); return f; });
    return { g, h: 1.3, legs, tick(t) { legs.forEach((l, i) => l.rotation.z = Math.sin(t * 5 + i * 1.3) * .08); }, w: 2.3 }; },
  cultist(S) { const g = G(); const robe = mk(CONE(.55, 1.8, 14), '#8a1a26', { roughness: .9 }); robe.position.y = .9; g.add(robe); const hood = mk(SPH(.28, 12, 10, 0, TAU, 0, Math.PI * .75), '#5a0e18', { roughness: .95 }); hood.position.set(0, 1.9, 0); g.add(hood); const pt = mk(CONE(.2, .5, 10), '#5a0e18'); pt.position.set(-.1, 2.1, 0); pt.rotation.z = .3; g.add(pt); g.add(eye(.045, '#ff8a3a', .22, 1.86, .09)); g.add(eye(.045, '#ff8a3a', .22, 1.86, -.09));
    const sash = mk(CYL(.34, .38, .1, 14), '#d8b24a', { metalness: .8 }); sash.position.y = 1.1; g.add(sash); const ar = limb(.5, .07, '#8a1a26'); ar.position.set(0, 1.55, .3); g.add(ar); const ar2 = limb(.5, .07, '#8a1a26'); ar2.position.set(0, 1.55, -.3); g.add(ar2);
    const orb = mk(SPH(.15, 12, 10), '#ff5a3a', { emissive: '#ff3a1a', emissiveIntensity: 2.4 }); orb.position.set(.15, -.9, 0); ar.add(orb);
    return { g, h: 2.2, armR: ar, armL: ar2, tick(t) { orb.scale.setScalar(1 + Math.sin(t * 4) * .15); g.position.y = Math.sin(t * 1.6) * .06; } }; },
  harpy(S) { const g = G(), fe = '#6a4a9a'; const b = mk(CAP(.22, .5), '#c89a7a'); b.position.y = 1.3; g.add(b); const h = mk(SPH(.2, 12, 10), '#c89a7a'); h.position.set(.02, 1.95, 0); g.add(h); const cr = mk(CONE(.1, .4, 5), '#e84a8a'); cr.position.set(-.1, 2.2, 0); cr.rotation.z = .5; g.add(cr); g.add(eye(.04, '#ffe27a', .17, 1.98, .08)); g.add(eye(.04, '#ffe27a', .17, 1.98, -.08));
    const bk = mk(CONE(.06, .2, 5), '#e8c050'); bk.rotation.z = -Math.PI / 2; bk.position.set(.24, 1.92, 0); g.add(bk); const tl = mk(CONE(.2, .8, 5), fe); tl.rotation.z = Math.PI / 2 + .3; tl.position.set(-.4, .9, 0); g.add(tl);
    [-1, 1].forEach(s => { const l = limb(.5, .05, '#e8c050'); l.position.set(0, .95, s * .1); g.add(l); const cl = mk(CONE(.05, .2, 4), '#222'); cl.position.set(.1, -.8, 0); cl.rotation.z = -Math.PI / 2; l.add(cl); });
    const wings = []; [-1, 1].forEach(s => { const w = new T.Group(); w.position.set(-.05, 1.55, s * .2); for (let i = 0; i < 6; i++) { const f = mk(CAP(.04, .9 - i * .08), i % 2 ? fe : '#9a6ad0'); f.rotation.x = s * (1.2 + i * .12); f.rotation.z = .2 - i * .12; f.position.set(-i * .06, 0, s * (.45 + i * .07)); w.add(f); } w.userData.s = s; g.add(w); wings.push(w); });
    return { g, h: 2.3, wings, tick(t) { wings.forEach(w => w.rotation.x = w.userData.s * Math.sin(t * 6) * .35); g.position.y = Math.sin(t * 2) * .1 + .2; } }; },
  mimic(S) { const g = G(); const bx = mk(BOX(1.2, .6, .8), '#6a4020', { roughness: .85 }); bx.position.y = .35; g.add(bx); [-.4, .4].forEach(x => { const bd = mk(BOX(.1, .62, .82), '#c9a24b', { metalness: .8 }); bd.position.set(x, .35, 0); g.add(bd); });
    const lid = new T.Group(); lid.position.set(-.55, .68, 0); const lm = mk(BOX(1.2, .3, .8), '#7a5028', { roughness: .85 }); lm.position.set(.55, .15, 0); lid.add(lm); const bd2 = mk(BOX(.1, .32, .82), '#c9a24b', { metalness: .8 }); bd2.position.set(.35, .15, 0); lid.add(bd2); g.add(lid);
    for (let i = 0; i < 7; i++) { const t = mk(CONE(.06, .2, 5), '#f4efdc'); t.rotation.z = Math.PI; t.position.set(.55 - .5 + i * .16 + .1, -.1, .36); lid.add(t); const t2 = mk(CONE(.06, .2, 5), '#f4efdc'); t2.position.set(-.5 + i * .17 - .0 - .5 + .55, .7, .36); g.add(at(t2, -.5 + i * .17, .78, .36)); g.add(at(mk(CONE(.06, .2, 5), '#f4efdc'), -.5 + i * .17, .78, -.36)); }
    const tg = mk(BOX(.8, .06, .3), '#d8305a', { roughness: .5 }); tg.position.set(.1, .66, 0); g.add(tg); g.add(eye(.08, '#ffe27a', .55, 1.05, .2)); g.add(eye(.08, '#ffe27a', .55, 1.05, -.2));
    return { g, h: 1.3, tick(t) { lid.rotation.z = Math.abs(Math.sin(t * 1.4)) * .35 + .1; } }; },
  ogre(S) { const g = G(), sk = '#8a9a5a'; const bl = mk(SPH(.65, 16, 12), sk, { roughness: .9 }); bl.scale.set(1, 1.1, 1.0); bl.position.y = 1.2; g.add(bl); const h = mk(SPH(.3, 12, 10), sk); h.position.set(.2, 2.15, 0); g.add(h); const jw = mk(BOX(.2, .15, .34), sk); jw.position.set(.3, 1.95, 0); g.add(jw); [-1, 1].forEach(s => { const t = mk(CONE(.05, .2, 5), '#eee'); t.position.set(.35, 2.05, s * .12); g.add(t); g.add(eye(.05, '#ff7a3a', .45, 2.2, s * .12)); const l = limb(.6, .17, '#6a7a4a'); l.position.set(0, .85, s * .3); g.add(l); });
    const bt = mk(CYL(.6, .62, .14, 14), '#5a3a22'); bt.position.y = .95; g.add(bt); const ar = limb(.7, .15, sk); ar.position.set(0, 1.85, .72); g.add(ar); const ar2 = limb(.7, .15, sk); ar2.position.set(0, 1.85, -.72); g.add(ar2);
    const club = new T.Group(); club.add(mk(CYL(.1, .18, 1.3, 8), '#6a4528')); for (let i = 0; i < 6; i++) { const sp = mk(CONE(.04, .14, 5), '#aab'); const a = i / 6 * TAU; sp.position.set(Math.cos(a) * .17, -.45 + (i % 2) * .2, Math.sin(a) * .17); sp.rotation.z = -Math.cos(a) * 1.4; sp.rotation.x = Math.sin(a) * 1.4; club.add(sp); } club.position.y = -1.0; club.rotation.z = .7; ar.add(club);
    return { g, h: 2.9, armR: ar, armL: ar2 }; },
  orc(S) { const g = G(), sk = '#5e8a3c'; const bl = mk(CAP(.4, .55, 6, 12), '#4a3a2a', { roughness: .9 }); bl.scale.set(.85, 1, 1.15); bl.position.y = 1.35; g.add(bl); const h = mk(SPH(.3, 12, 10), sk); h.position.set(.1, 2.25, 0); g.add(h); const hr = mk(CYL(.04, .3, .3, 6), '#222'); hr.position.set(-.1, 2.5, 0); hr.scale.set(1, 1, 3); g.add(hr);
    [-1, 1].forEach(s => { const t = mk(CONE(.045, .18, 5), '#f2ecd0'); t.position.set(.28, 2.1, s * .12); g.add(t); g.add(eye(.045, '#ff5a3a', .34, 2.3, s * .12)); const l = limb(.65, .15, '#3a2a1c'); l.position.set(0, .95, s * .22); g.add(l); const pd = mk(SPH(.22, 10, 8), '#6a6a72', { metalness: .7, roughness: .4 }); pd.scale.set(1, .7, 1); pd.position.set(0, 2.0, s * .56); g.add(pd); const sp = mk(CONE(.06, .22, 5), '#aab'); sp.position.set(0, 2.2, s * .56); g.add(sp); });
    const ar = limb(.7, .13, sk); ar.position.set(0, 1.95, .55); g.add(ar); const ar2 = limb(.7, .13, sk); ar2.position.set(0, 1.95, -.55); g.add(ar2);
    const ax = new T.Group(); ax.add(mk(CYL(.05, .05, 1.2, 6), '#5a3a22')); const bd = mk(BOX(.5, .5, .06), '#8a929c', { metalness: .9, roughness: .3 }); bd.position.set(.25, -.45, 0); ax.add(bd); ax.position.y = -.9; ax.rotation.z = .6; ar.add(ax);
    return { g, h: 2.7, armR: ar, armL: ar2 }; },
  stone(S) { const g = G(), st = '#6e7480'; const parts = []; const R = (r, x, y, z, sx = 1, sy = 1) => { const m = mk(new T.DodecahedronGeometry(r, 0), st, { roughness: .95, flatShading: true }); m.position.set(x, y, z); m.scale.set(sx, sy, 1); g.add(m); return m; };
    R(.7, 0, 1.4, 0, 1, 1.2); R(.4, .1, 2.35, 0, 1, .9); const ar = new T.Group(), ar2 = new T.Group(); ar.position.set(0, 1.9, .85); ar2.position.set(0, 1.9, -.85); [ar, ar2].forEach(a => { const u = mk(new T.DodecahedronGeometry(.3, 0), st, { roughness: .95, flatShading: true }); u.position.y = -.35; a.add(u); const f = mk(new T.DodecahedronGeometry(.4, 0), st, { roughness: .95, flatShading: true }); f.position.y = -1.0; a.add(f); g.add(a); });
    [-1, 1].forEach(s => { R(.4, 0, .55, s * .4, 1, 1.5); g.add(eye(.07, '#ff9a3a', .38, 2.4, s * .14)); }); const cr = mk(BOX(.04, 1.0, .5), '#ff9a3a', { emissive: '#ff6a1a', emissiveIntensity: 2 }); cr.position.set(.62, 1.4, 0); cr.rotation.z = .1; g.add(cr);
    const mo = mk(new T.BoxGeometry(.04, .06, .3), '#ff9a3a', { emissive: '#ff6a1a', emissiveIntensity: 2 }); mo.position.set(.42, 2.25, 0); g.add(mo);
    return { g, h: 3.0, armR: ar, armL: ar2 }; },
  basilisk(S) { const g = G(), sk = '#3a9a5a'; const segs = []; for (let i = 0; i < 9; i++) { const s = mk(SPH(.38 - i * .02, 12, 10), i % 2 ? sk : '#2a7a44', { roughness: .6 }); s.userData.i = i; g.add(s); segs.push(s); }
    const hd = new T.Group(); const hm = mk(SPH(.32, 12, 10), sk); hm.scale.set(1.4, .8, 1); hd.add(hm); const sn = mk(CONE(.18, .4, 8), '#4aaa6a'); sn.rotation.z = -Math.PI / 2; sn.position.set(.5, -.05, 0); hd.add(sn); [-1, 1].forEach(s => { hd.add(eye(.07, '#c8ff3a', .22, .1, s * .18)); const sp = mk(CONE(.05, .3, 5), '#d8e060'); sp.position.set(-.15, .3, s * .1); sp.rotation.z = .5; hd.add(sp); }); const cr = mk(CONE(.06, .5, 4), '#e8d03a'); cr.position.set(-.1, .35, 0); cr.rotation.z = .6; hd.add(cr); g.add(hd);
    return { g, h: 2.4, segs, hd, tick(t, p) { segs.forEach((s, i) => { const k = i / 8, a = -.2 - k * 2.6; s.position.set(-k * 1.8 + .3 + Math.sin(t * 1.4 + i * .5) * .05, .38 + Math.max(0, 1.7 * Math.pow(1 - k, 1.2)) * (i < 8 ? 1 : 1), Math.sin(t * 1.8 + i * .6) * .22 * k); }); const s0 = segs[0]; hd.position.set(s0.position.x + .45, s0.position.y + .15, s0.position.z); hd.rotation.z = -.15 + Math.sin(t * 1.5) * .06; }, w: 2.2 }; },
  knight(S) { const g = G(), ar = '#2a2e3a'; const bl = mk(CAP(.4, .55, 6, 12), ar, { metalness: .8, roughness: .35 }); bl.scale.set(.8, 1, 1.2); bl.position.y = 1.4; g.add(bl); const h = mk(SPH(.28, 12, 10), '#232632', { metalness: .85, roughness: .3 }); h.position.set(.04, 2.3, 0); h.scale.set(1, 1.1, 1); g.add(h); g.add(at(mk(BOX(.04, .05, .34), '#ff3a5a', { emissive: '#ff1a3a', emissiveIntensity: 2.4 }), .27, 2.32, 0));
    [-1, 1].forEach(s => { const hn = mk(CONE(.07, .5, 6), '#2a2e3a', { metalness: .8 }); hn.position.set(0, 2.45, s * .24); hn.rotation.x = s * -.9; g.add(hn); const pd = mk(SPH(.26, 12, 8), ar, { metalness: .85, roughness: .3 }); pd.scale.set(1, .7, 1); pd.position.set(0, 2.0, s * .58); g.add(pd); const sp = mk(CONE(.06, .26, 5), '#aab'); sp.position.set(0, 2.2, s * .58); g.add(sp); const l = limb(.65, .15, ar, { metalness: .8, roughness: .35 }); l.position.set(0, .95, s * .22); g.add(l); });
    const a1 = limb(.7, .13, ar, { metalness: .8, roughness: .35 }); a1.position.set(0, 1.95, .58); g.add(a1); const a2 = limb(.7, .13, ar, { metalness: .8, roughness: .35 }); a2.position.set(0, 1.95, -.58); g.add(a2);
    const sw = weaponSword(true, '#ff3a5a', 'dark'); sw.scale.setScalar(1.5); sw.position.y = -.95; sw.rotation.z = .6; a1.add(sw); const cp = mk(BOX(.04, 1.5, .8), '#4a0a1a', { roughness: .95 }); cp.position.set(-.38, 1.5, 0); cp.rotation.z = -.1; g.add(cp);
    return { g, h: 2.9, armR: a1, armL: a2, tick(t) { cp.rotation.z = -.1 + Math.sin(t * 2) * .05; } }; },
  demon(S) { const g = G(), sk = '#a82a2a'; const bl = mk(CAP(.45, .6, 6, 12), sk, { roughness: .6 }); bl.scale.set(.85, 1, 1.1); bl.position.y = 1.5; g.add(bl); const h = mk(SPH(.32, 12, 10), sk); h.position.set(.1, 2.45, 0); g.add(h); const jw = mk(BOX(.2, .12, .3), sk); jw.position.set(.25, 2.28, 0); g.add(jw);
    [-1, 1].forEach(s => { const hn = mk(CONE(.09, .9, 8), '#2a1818', { roughness: .4 }); hn.position.set(-.05, 2.85, s * .28); hn.rotation.x = s * -.55; hn.rotation.z = .35; g.add(hn); g.add(eye(.06, '#ffd23a', .36, 2.5, s * .13)); const l = limb(.75, .17, '#8a1a1a'); l.position.set(0, 1.0, s * .26); g.add(l); const ft = mk(BOX(.3, .12, .2), '#2a1818'); ft.position.set(.1, .0, s * .26); g.add(ft); });
    const a1 = limb(.8, .14, sk); a1.position.set(0, 2.1, .62); g.add(a1); const a2 = limb(.8, .14, sk); a2.position.set(0, 2.1, -.62); g.add(a2); [a1, a2].forEach(a => { for (let i = 0; i < 3; i++) { const c = mk(CONE(.03, .18, 4), '#111'); c.position.set(.05, -1.1, (i - 1) * .06); a.add(c); } });
    const wings = []; [-1, 1].forEach(s => { const w = new T.Group(); w.position.set(-.2, 2.2, s * .3); const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0, 1.4); sh.lineTo(.9, 1.9); sh.lineTo(1.0, 1.1); sh.lineTo(1.6, 1.3); sh.lineTo(1.3, .5); sh.lineTo(1.7, .1); sh.lineTo(.5, .1); sh.closePath(); const m = mk(new T.ShapeGeometry(sh), '#6a1414', { side: T.DoubleSide, roughness: .8 }); m.rotation.x = Math.PI / 2; m.rotation.z = -Math.PI / 2; m.rotation.y = 0; m.position.set(0, 0, 0); m.scale.set(1.1, 1.1, 1.1); w.add(m); w.userData.s = s; g.add(w); wings.push(w); });
    const tl = mk(CAP(.06, .9), sk); tl.rotation.z = 2.2; tl.position.set(-.7, .9, 0); g.add(tl); const tf = mk(CONE(.14, .3, 5), '#ff7a2a', { emissive: '#ff4a0a', emissiveIntensity: 2 }); tf.rotation.z = 2.2; tf.position.set(-1.2, .55, 0); g.add(tf);
    return { g, h: 3.2, armR: a1, armL: a2, wings, tick(t) { wings.forEach(w => w.rotation.x = w.userData.s * (Math.sin(t * 2.4) * .18 + .08)); tf.scale.setScalar(1 + Math.sin(t * 8) * .2); } }; }
};
class Creature extends Actor {
  constructor(world, kind, info = {}) {
    super(world, { dir: -1 }); this.kind = kind; this.info = info; this.theme = info.theme || 'physical';
    const b = (ENEMY_BUILD[kind] || ENEMY_BUILD.goblin)(1); this.spec = b; this.inner = b.g; this.body.add(b.g);
    const tierK = info.tier === 'strong' ? 1.0 : info.tier === 'medium' ? .92 : .85; this.height = b.h * tierK; this.sc = tierK; this.body.scale.setScalar(tierK); this.width = (b.w || 1.4) * tierK;
    this.baseScale = tierK; this.collectMats(b.g); this.setShadow((b.w || 1.4) * 1.2 * tierK, .9 * tierK);
    this.cur_t = 0;
  }
  idlePose(p, t) { super.idlePose(p, t); p.lean += Math.sin(t * 1.3) * .02; }
  apply(p, dt) {
    this.body.position.y = p.y; this.body.rotation.set(p.roll, 0, -p.lean * .6);
    const sq = p.squash, sc = p.scale * this.baseScale; this.body.scale.set(sc * (1 - sq * .5), sc * (1 + sq), sc * (1 - sq * .5));
    const s = this.spec; if (s.armR) { s.armR.rotation.z = p.armR * 1.0 + .1; s.armL.rotation.z = p.armL * 1.0 - .1; }
    if (s.tick) s.tick(this.t, p);
  }
}
function enemyKindFor(name) { const n = (name || '').toLowerCase(); for (const e of ENEMIES) { if (n === e.name.toLowerCase()) return e; } for (const e of ENEMIES) { const k = e.name.split(' ')[0].toLowerCase(); if (n.includes(k)) return e; } return ENEMIES[hashStr(n || 'x') % ENEMIES.length]; }

export { Creature, Humanoid, enemyKindFor, eye };
