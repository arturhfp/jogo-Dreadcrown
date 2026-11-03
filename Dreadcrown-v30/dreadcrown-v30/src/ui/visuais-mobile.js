(()=>{
 const stageHTML=()=>`<div class="m3d-ground"></div>
  <div class="m3d-actor m3d-hero"><div class="m3d-name">HERÓI</div><div class="m3d-head"></div><div class="m3d-helm"></div><div class="m3d-body"></div><div class="m3d-arm m3d-a1"></div><div class="m3d-arm m3d-a2"></div><div class="m3d-leg m3d-l1"></div><div class="m3d-leg m3d-l2"></div><div class="m3d-weapon">⚔️</div><div class="m3d-aura"></div></div>
  <div class="m3d-actor m3d-enemy"><div class="m3d-name">INIMIGO</div><div class="m3d-hp"><i></i></div><div class="m3d-head"></div><div class="m3d-horn horn1"></div><div class="m3d-horn horn2"></div><div class="m3d-eye eye1"></div><div class="m3d-eye eye2"></div><div class="m3d-body"></div><div class="m3d-claw claw1"></div><div class="m3d-claw claw2"></div><div class="m3d-leg m3d-l1"></div><div class="m3d-leg m3d-l2"></div><div class="m3d-aura"></div></div>`;
 function sync(){document.querySelectorAll('.battle-arena,.creator-arena').forEach(arena=>{
   let stage=arena.querySelector('.mobile-3d-stage');
   if(!stage){stage=document.createElement('div');stage.className='mobile-3d-stage';stage.innerHTML=stageHTML();arena.prepend(stage)}
   const heroName=stage.querySelector('.m3d-hero .m3d-name');
   const enemyName=stage.querySelector('.m3d-enemy .m3d-name');
   const input=document.querySelector('#hero-name');
   const boss=arena.querySelector('.boss-name');
   const hn=(input?.value||'Arauto sem nome').trim()||'Arauto sem nome';
   const en=(boss?.textContent||'INIMIGO').trim()||'INIMIGO';
   heroName.textContent=hn;
   enemyName.textContent=arena.classList.contains('battle-arena')?en:'INIMIGO';
   const fill=arena.querySelector('.boss-health-fill');const hp=stage.querySelector('.m3d-hp i');
   if(fill&&hp)hp.style.width=fill.style.width||'100%';
   const weapon=stage.querySelector('.m3d-weapon');
   const summary=document.querySelector('.selection-summary p');
   const context=(summary?.textContent||'')+' '+(document.querySelector('.battle-panel h3')?.textContent||'');
   let glyph='⚔️';
   if(/Berserker|Berserk|Colosso/i.test(context))glyph='🪓';
   else if(/Mago|Piromante|Criomante|Eletromante|Necromante|Astral/i.test(context))glyph=/Piromante|Fogo/i.test(context)?'📕':/Criomante|Gelo/i.test(context)?'📘':/Eletromante|Elétrico/i.test(context)?'📙':'📖';
   else if(/Clérigo|Clerigo|Sacerdote|Ocultista|Oráculo|Oraculo/i.test(context))glyph='🪄';
   else if(/Assassino|Ninja|Shinobi|Carrasco|Espadachim Fantasma/i.test(context))glyph='🗡️';
   else if(/Arqueiro|Atirador|Caçador|Patrulheiro/i.test(context))glyph=/Besta/i.test(context)?'🏹':'🏹';
   else if(/Paladino|Inquisidor|Templário|Templario/i.test(context))glyph=/Lança|Lanca/i.test(context)?'🔱':/Devoção|Devocao/i.test(context)?'🛡️':'🔨';
   else if(/Tanke|Tank|Guardião Arcano|Guardiao Arcano|Muralha/i.test(context))glyph='🛡️';
   if(weapon)weapon.textContent=glyph;
   const race=(summary?.textContent||'').toLowerCase();
   const actor=stage.querySelector('.m3d-hero');
   if(actor){actor.dataset.race=race.includes('orc')?'orc':race.includes('elfo')?'elfo':race.includes('anão')||race.includes('anao')?'anao':race.includes('tiefling')?'tiefling':'humano';}
   stage.dataset.race=actor?.dataset.race||'humano';
   stage.classList.toggle('battle-active',arena.classList.contains('battle-arena'));
 });}
 const start=()=>{sync();setTimeout(sync,250);setTimeout(sync,900)};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 window.addEventListener('resize',sync);
 document.addEventListener('click',ev=>{const btn=ev.target.closest('.battle-option,.skill-card button,.ability-card button');if(!btn)return;document.querySelectorAll('.mobile-3d-stage .m3d-hero').forEach(hero=>{hero.classList.remove('m3d-attacking');void hero.offsetWidth;hero.classList.add('m3d-attacking');setTimeout(()=>hero.classList.remove('m3d-attacking'),650)});});
})();
