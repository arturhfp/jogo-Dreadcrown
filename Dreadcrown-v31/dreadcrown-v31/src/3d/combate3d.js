/* =====================================================================
   Ataques e criação de heróis (lado visual do combate)
   ---------------------------------------------------------------------
   RESPONSABILIDADE: makeHero cria o ator 3D certo para raça/classe/subclasse; heroAttack e enemyAttack tocam a animação e disparam os efeitos nos instantes de hit. NÃO calcula dano: o dano real vem do jogo (React); aqui só é visual.
   RELAÇÃO COM OUTROS MÓDULOS: Usa atores.js, personagens.js, efeitos.js, glb.js, catalogo.js. Chamado pela ponte (ui/ponte.js).
   API PÚBLICA: makeHero(palco, chave), heroAttack(palco, slot), enemyAttack(palco), reachOf.
   REGRAS / CUIDADOS: Importante: a lógica de dano/vida fica no jogo; este módulo apenas OBSERVA a interface (ver ponte.js) e reage.
   ===================================================================== */
import { GLBActor } from './atores.js';
import { castFX, meleeFX, palOf } from './efeitos.js';
import { loadOrc } from './glb.js';
import { Humanoid } from './personagens.js';
import { V3, col } from '../core/util.js';
import { BRCOL, CLASSCOL, ENEMY_ACT, HERO_ACT, MELEE_CLS, themeOf } from '../data/catalogo.js';
import './equipamento.js'; // efeito colateral: registra GLBActor.prototype.dress (equipamento por classe)

async function makeHero(world, key) {
  const th = themeOf(key.cls, key.br), accent = col((BRCOL[key.cls] || [])[key.br] || CLASSCOL[key.cls]).getStyle();
  if (key.race === 'orc') {
    try {
      const m = await loadOrc();
      if (m) { const a = new GLBActor(world, m, { height: 2.3, weaponBone: /Sword_Dummy/i, dir: 1 }); a.theme = th; a.accent = accent; a.cfgKey = key; a.noIdle = true; a.isGLB = true; try { a.dress(key.cls, accent, th); } catch (er) { console.error('[3D] equipamento', er); } return a; }
    } catch (e) { console.error('[3D] GLB falhou, usando modelo procedural', e); }
  }
  const a = new Humanoid(world, { race: key.race, cls: key.cls, br: key.br, th, dir: 1 }); a.cfgKey = key; return a;
}
function reachOf(w) { return Math.max(1.2, Math.abs(w.hero.base.x - w.enemy.base.x) - (w.hero.width + w.enemy.width) * .5 - .2); }

function heroAttack(world, slot, demoTarget) {
  const h = world.hero; if (!h || h.dead) return;
  const cls = (h.cfgKey || {}).cls || 'tanke', th = h.theme || 'physical';
  const act = (HERO_ACT[cls] || HERO_ACT.tanke)[slot] || 'melee';
  const e = world.enemy;
  const tgt = () => demoTarget ? demoTarget.clone() : e.anchor('chest');
  const melee = !!MELEE_CLS[cls] && !!e;
  const hitEnemy = () => { if (e && !e.dead) { e.play('hit'); } };
  const force = cls === 'arqueiro' && (slot === 'basic' || slot === 'common') ? 'arrow' : undefined;
  h.play(act, {
    reach: melee ? reachOf(world) : 0,
    onHit: i => {
      const to = tgt();
      if (melee) { meleeFX(world, th, slot, to, i); if (i === 0) hitEnemy(); if (slot !== 'basic' && slot !== 'common' && i === 0) castFX(world, th, slot, h.anchor('hand'), to, null); }
      else if (i === 0) { castFX(world, th, slot, h.anchor('hand'), to, () => { hitEnemy(); }, force); if (act === 'bigcast') { world.shake(.12, .4); } }
      else { castFX(world, th, 'basic', h.anchor('hand'), to, () => { hitEnemy(); }, force); }
      if (slot === 'ultimate') { world.slow(.25, .22); }
    }
  });
  /* aura de carga antes do golpe */
  const [c0, c1] = palOf(th); world.fx.glow(h.anchor('chest'), c1, 3.2, .5, { a: .6 }); world.fx.ground(V3(h.base.x, 0, 0), c1, 3.2, .8, { a: .8 });
}
function enemyAttack(world) {
  const e = world.enemy, h = world.hero; if (!e || !h || e.dead) return;
  const act = ENEMY_ACT[e.kind] || 'melee', th = e.theme;
  const cast = act === 'cast';
  e.play(act, {
    reach: cast ? 0 : reachOf(world), onHit: i => {
      const to = h.anchor('chest');
      if (cast) { castFX(world, th, 'common', e.anchor('hand') || e.anchor('chest'), to, null); }
      else { meleeFX(world, th, 'basic', to.clone().add(V3(.3, 0, 0)), i); }
      h.play('hit'); world.shake(.2, .35); world.flash('#ff4a4a', 8, to.clone().add(V3(0, .3, 1.5)));
      world.fx.spray(to, 14, 4, .5, .4, .04, '#ff8a8a', '#c01818', { grav: 5 });
    }
  });
}

export { enemyAttack, heroAttack, makeHero };
