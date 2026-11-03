(()=>{
const txt=e=>(e?.innerText||e?.textContent||'').replace(/\s+/g,' ').trim();
const RC={common:'#c9d2d8',rare:'#65a8e8',epic:'#b68be8',legendary:'#e4b65f'};
const RL={common:'Comum',rare:'Rara',epic:'Épica',legendary:'Lendária'};
const ICON={common:'<path d="M5 19L17 7M14 4l6 6M4 20l3-1-2-2z"/>',rare:'<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',epic:'<path d="M12 2c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 3-6 .5 2 1.5 2 2 1z"/>',legendary:'<path d="M12 2l3 7 7 .6-5.3 4.7 1.7 7.2L12 17.7 5.6 21.5l1.7-7.2L2 9.6 9 9z"/>'};
const svg=(p,sz)=>'<svg viewBox="0 0 24 24" width="'+sz+'" height="'+sz+'" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>';
/* ---------- cenário ---------- */
function rnd(seed){let s=seed;return()=>{s=(s*16807)%2147483647;return s/2147483647}}
function sceneSVG(){
  const r=rnd(7);let o='';
  o+='<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg"><defs>'+
  '<linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03070f"/><stop offset=".5" stop-color="#0a1c34"/><stop offset="1" stop-color="#12334a"/></linearGradient>'+
  '<radialGradient id="mg"><stop offset="0" stop-color="#cfe6ff" stop-opacity=".9"/><stop offset=".25" stop-color="#7fb4ff" stop-opacity=".35"/><stop offset="1" stop-color="#7fb4ff" stop-opacity="0"/></radialGradient>'+
  '<linearGradient id="gr" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12353a"/><stop offset=".4" stop-color="#0a2025"/><stop offset="1" stop-color="#03090e"/></linearGradient>'+
  '<linearGradient id="wf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe3ff" stop-opacity=".85"/><stop offset="1" stop-color="#5aa0d8" stop-opacity=".25"/></linearGradient>'+
  '<radialGradient id="fr"><stop offset="0" stop-color="#ffd27a" stop-opacity=".95"/><stop offset=".3" stop-color="#ff8a3a" stop-opacity=".5"/><stop offset="1" stop-color="#ff6a1a" stop-opacity="0"/></radialGradient>'+
  '<linearGradient id="rv" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1e4a66" stop-opacity="0"/><stop offset=".5" stop-color="#6aa8d0" stop-opacity=".55"/><stop offset="1" stop-color="#1e4a66" stop-opacity="0"/></linearGradient>'+
  '<filter id="bl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="14"/></filter><filter id="bs"><feGaussianBlur stdDeviation="2.2"/></filter></defs>';
  o+='<rect width="1600" height="900" fill="url(#sk)"/>';
  for(let i=0;i<70;i++)o+='<circle cx="'+(r()*1600|0)+'" cy="'+(r()*330|0)+'" r="'+(0.5+r()*1.3).toFixed(1)+'" fill="#cfe6ff" opacity="'+(0.2+r()*0.6).toFixed(2)+'"/>';
  o+='<circle cx="1010" cy="120" r="260" fill="url(#mg)"/><circle cx="1010" cy="120" r="46" fill="#eaf5ff"/><circle cx="996" cy="108" r="9" fill="#bcd6ee" opacity=".55"/><circle cx="1026" cy="134" r="6" fill="#bcd6ee" opacity=".5"/><circle cx="1018" cy="100" r="5" fill="#bcd6ee" opacity=".4"/>';
  o+='<g filter="url(#bl)" opacity=".75"><ellipse cx="780" cy="170" rx="260" ry="26" fill="#20476e"/><ellipse cx="1280" cy="210" rx="300" ry="30" fill="#1b3d60"/><ellipse cx="420" cy="260" rx="260" ry="24" fill="#183654"/></g>';
  /* colinas distantes */
  o+='<path d="M0 470 L130 400 L260 450 L420 380 L560 440 L700 360 L820 420 L1000 350 L1160 430 L1320 370 L1470 440 L1600 400 V620 H0Z" fill="#0a1a2c"/>';
  /* ruínas */
  o+='<g fill="#0a1624"><rect x="830" y="300" width="70" height="230"/><rect x="1100" y="270" width="84" height="260"/><rect x="900" y="330" width="200" height="200"/>';
  for(let i=0;i<5;i++)o+='<rect x="'+(830+i*14)+'" y="288" width="9" height="14"/>';
  for(let i=0;i<6;i++)o+='<rect x="'+(1100+i*14)+'" y="256" width="9" height="14"/>';
  o+='<rect x="935" y="250" width="40" height="90"/><rect x="1015" y="230" width="46" height="110"/></g>';
  o+='<path d="M930 530 V420 a70 70 0 0 1 140 0 V530Z" fill="#050c16"/><path d="M930 420 a70 70 0 0 1 140 0" fill="none" stroke="#2a4a68" stroke-width="3" opacity=".7"/>';
  o+='<rect x="860" y="360" width="10" height="26" fill="#050c16"/><rect x="1130" y="340" width="10" height="26" fill="#050c16"/>';
  /* penhascos + cachoeiras */
  o+='<path d="M560 420 L720 380 L880 470 L880 600 L520 600Z" fill="#0b1f30"/><path d="M1110 450 L1290 390 L1460 450 L1480 600 L1100 600Z" fill="#0c2336"/>';
  o+='<g class="sc-fall"><rect x="705" y="400" width="34" height="200" fill="url(#wf)"/><rect x="1230" y="420" width="28" height="180" fill="url(#wf)"/></g>';
  o+='<g stroke="#e8f6ff" stroke-width="2" opacity=".6">';
  for(let i=0;i<8;i++)o+='<line class="sc-fl" x1="'+(710+i*4)+'" y1="400" x2="'+(710+i*4)+'" y2="600" stroke-dasharray="14 22" style="animation-delay:-'+(i*.3).toFixed(1)+'s"/>';
  for(let i=0;i<6;i++)o+='<line class="sc-fl" x1="'+(1234+i*4)+'" y1="420" x2="'+(1234+i*4)+'" y2="600" stroke-dasharray="14 22" style="animation-delay:-'+(i*.35).toFixed(1)+'s"/>';
  o+='</g>';
  /* árvores do meio */
  for(let i=0;i<22;i++){const x=r()*1600,h=140+r()*160,w=10+r()*14;o+='<rect x="'+x.toFixed(0)+'" y="'+(560-h).toFixed(0)+'" width="'+w.toFixed(0)+'" height="'+h.toFixed(0)+'" fill="#071722" opacity=".85"/><ellipse cx="'+(x+w/2).toFixed(0)+'" cy="'+(560-h).toFixed(0)+'" rx="'+(34+r()*36).toFixed(0)+'" ry="'+(26+r()*24).toFixed(0)+'" fill="#0a2a2c" opacity=".9"/>';}
  /* chão */
  o+='<rect y="560" width="1600" height="340" fill="url(#gr)"/>';
  o+='<path d="M640 600 C800 640 700 700 880 760 L1180 900 L720 900 C560 780 760 700 640 600Z" fill="url(#rv)" opacity=".9"/><ellipse cx="920" cy="690" rx="120" ry="14" fill="#cfe6ff" opacity=".18" filter="url(#bs)"/>';
  for(let i=0;i<120;i++){const x=r()*1600,y=600+r()*300,s=6+r()*16;o+='<path d="M'+x.toFixed(0)+' '+y.toFixed(0)+' l'+(-s/3).toFixed(0)+' '+(-s).toFixed(0)+' l'+(s/3).toFixed(0)+' '+(s*.8).toFixed(0)+' l'+(s/3).toFixed(0)+' '+(-s*.9).toFixed(0)+'z" fill="#0d3a34" opacity="'+(0.35+r()*.4).toFixed(2)+'"/>';}
  o+='<ellipse cx="1370" cy="880" rx="190" ry="60" fill="#02070b"/><ellipse cx="180" cy="890" rx="150" ry="40" fill="#02070b"/>';
  /* árvores de primeiro plano */
  o+='<g fill="#050d13"><path d="M40 900 C70 700 60 520 110 380 C130 300 150 220 190 120 L250 120 C230 240 220 330 230 420 C240 560 260 760 300 900Z"/><path d="M1380 900 C1400 720 1420 560 1400 420 C1390 320 1420 220 1450 120 L1510 120 C1520 260 1540 340 1560 460 C1580 620 1560 780 1590 900Z"/></g>';
  o+='<g filter="url(#bs)">';
  for(let i=0;i<26;i++){const l=i%2===0;const x=(l?40+r()*340:1230+r()*350),y=r()*260;o+='<ellipse cx="'+x.toFixed(0)+'" cy="'+y.toFixed(0)+'" rx="'+(60+r()*70).toFixed(0)+'" ry="'+(30+r()*40).toFixed(0)+'" fill="'+(r()>.55?'#0b2c2e':'#071c20')+'" opacity=".95"/>';}
  o+='</g><g opacity=".55" stroke="#2f6f68" stroke-width="2" fill="none"><path d="M60 40 C140 120 120 200 220 260"/><path d="M1500 50 C1440 130 1450 220 1360 280"/></g>';
  /* lanternas */
  const lan=(x,y)=>'<circle cx="'+x+'" cy="'+(y-10)+'" r="90" fill="url(#fr)" class="sc-fire"/><rect x="'+(x-4)+'" y="'+(y+14)+'" width="8" height="110" fill="#050d13"/><path d="M'+(x-26)+' '+(y+14)+' h52 v-40 l-26 -24 -26 24z" fill="#0b1118" stroke="#3a2a1e" stroke-width="2"/><rect x="'+(x-14)+'" y="'+(y-18)+'" width="28" height="28" fill="#ffae4a" opacity=".92" class="sc-fire"/>';
  o+=lan(86,520)+lan(1510,500);
  o+='</svg>';
  return o;
}
function buildScene(stage){
  if(stage.querySelector('.scene-bg'))return;
  const bg=document.createElement('div');bg.className='scene-bg';
  bg.innerHTML=sceneSVG()+'<div class="scene-mist m1"></div><div class="scene-mist m2"></div><div class="scene-vig"></div>';
  const ff=document.createElement('div');ff.className='scene-flies';
  for(let i=0;i<18;i++){const f=document.createElement('i');f.style.cssText='left:'+(Math.random()*100)+'%;top:'+(40+Math.random()*50)+'%;--d:'+(4+Math.random()*6)+'s;--dl:-'+(Math.random()*8)+'s;--c:'+(i%3===0?'#7fb8ff':'#ffc36a');ff.append(f);}
  bg.append(ff);
  stage.prepend(bg);
}
/* ---------- HUD ---------- */
const hourglass='<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12M6 21h12M7 3c0 5 4 6 5 9-1 3-5 4-5 9M17 3c0 5-4 6-5 9 1 3 5 4 5 9"/></svg>';
const demon='<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="31" fill="#1a0c12"/><path d="M12 18c4 4 6 8 8 12M52 18c-4 4-6 8-8 12" stroke="#c9946a" stroke-width="5" stroke-linecap="round" fill="none"/><ellipse cx="32" cy="38" rx="16" ry="18" fill="#5a1a26"/><path d="M22 34l8 3M42 34l-8 3" stroke="#ffd27a" stroke-width="3" stroke-linecap="round"/><path d="M24 48c4 3 12 3 16 0" stroke="#1a0c12" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
function buildHUD(arena){
  if(arena.querySelector('.bhud'))return arena.querySelector('.bhud');
  const h=document.createElement('div');h.className='bhud';
  h.innerHTML=
  '<div class="bhud-top">'+
   '<div class="hud-side hud-hero"><div class="hud-pt"><img alt=""/></div><div class="hud-info"><div class="hud-nm"><b class="hn"></b><span class="hl"></span></div>'+
    '<div class="hbar hp"><div class="bar-track"><div class="bar-fill health"></div></div><span class="ht"></span></div>'+
    '<div class="hbar rs"><div class="bar-track"><div class="bar-fill mana rsfill"></div></div><span class="ht rst"></span></div>'+
    '<div class="hbar ul"><div class="bar-track"><div class="bar-fill ultimate"></div></div></div></div></div>'+
   '<div class="hud-side hud-enemy"><div class="hud-pt">'+demon+'</div><div class="hud-info"><div class="hud-nm"><b class="hn"></b><span class="hl"></span></div>'+
    '<div class="hbar hp"><div class="bar-track"><div class="bar-fill health"></div></div><span class="ht"></span></div></div></div>'+
  '</div>'+
  '<div class="bhud-bot"><div class="hud-skills">'+
   ['common','rare','epic','legendary'].map((k,i)=>'<button type="button" class="hs-card r-'+k+'" data-r="'+k+'">'+svg(ICON[k],26)+'<b class="hs-name"></b><small class="hs-sub">'+RL[k]+'</small><i class="hs-key">'+(i+1)+'</i></button>').join('')+
   '</div><div class="hud-acts"><button type="button" class="hs-mini" data-a="basic">Atacar</button><button type="button" class="hs-mini" data-a="dodge">Esquiva</button><button type="button" class="hs-mini hs-ult" data-a="ult"><span>Ultimate</span><i></i></button><div class="hs-turn">'+hourglass+'<span>Turno do jogador</span></div></div></div>'+
  '<div class="dmg-layer"></div>';
  arena.append(h);
  h.addEventListener('click',e=>{
    const c=e.target.closest('.hs-card,.hs-mini');if(!c||c.disabled)return;
    const grid=document.querySelector('.combat-panel .action-grid');if(!grid)return;
    let real=null;
    if(c.dataset.r)real=grid.querySelector('.rarity-'+c.dataset.r);
    else{const re={basic:/Ataque b/i,dodge:/Esquiva/i,ult:/Ultimate/i}[c.dataset.a];real=[...grid.querySelectorAll('.action-button')].find(b=>re.test(txt(b)));}
    if(c.classList.contains('pick')){const tab=[...document.querySelectorAll('.phase-tab')].find(x=>/Habilidades/i.test(txt(x)));if(tab){tab.click();tab.scrollIntoView({behavior:'smooth',block:'center'});}return;}
    if(real&&!real.disabled)real.click();
  });
  return h;
}
let state={hp:null,en:null,enName:null,enMax:1,turn:0};
const num=t=>{const m=(t||'').match(/(-?\d+)\s*\/\s*(\d+)/);return m?[+m[1],+m[2]]:null;};
function float(arena,sel,text,cls){
  const lay=arena.querySelector('.dmg-layer'),el=arena.querySelector(sel);if(!lay||!el)return;
  const a=arena.getBoundingClientRect(),r=el.getBoundingClientRect();
  const d=document.createElement('div');d.className='dmg '+cls;d.textContent=text;
  d.style.left=(r.left-a.left+r.width/2+(Math.random()*24-12))+'px';d.style.top=(r.top-a.top+r.height*.2)+'px';
  lay.append(d);d.animate([{transform:'translate(-50%,0) scale(.6)',opacity:0},{transform:'translate(-50%,-14px) scale(1.25)',opacity:1,offset:.2},{transform:'translate(-50%,-70px) scale(1)',opacity:0}],{duration:1100,easing:'ease-out'}).onfinish=()=>d.remove();
}
function update(){
  const arena=document.querySelector('.battle-arena');
  if(!arena)return;
  const stage=arena.querySelector('.mobile-3d-stage');
  if(stage)buildScene(stage);
  const h=buildHUD(arena);
  const hero=h.querySelector('.hud-hero'),en=h.querySelector('.hud-enemy');
  /* herói */
  const name=txt(document.querySelector('.selection-summary h3'))||'Arauto';
  let lvl='';document.querySelectorAll('.summary-stat').forEach(s=>{if(/N[ií]vel/i.test(txt(s)))lvl=txt(s.querySelector('strong'))});
  hero.querySelector('.hn').textContent=name;hero.querySelector('.hl').textContent=lvl?'Nv. '+lvl:'';
  const ps=window.__portraitSrc||{};const img=hero.querySelector('img');const src=ps.sub||ps.cls;if(src&&img.dataset.s!==src){img.dataset.s=src;img.src=src;}
  const rows={};document.querySelectorAll('.combat-panel .resource-meta').forEach(m=>{const l=txt(m.querySelector('span')).toLowerCase();rows[l]=num(txt(m.querySelector('b')));});
  const hp=rows['vida'];
  if(hp){hero.querySelector('.hp .bar-fill').style.width=Math.max(0,hp[0]/hp[1]*100)+'%';hero.querySelector('.hp .ht').textContent=Math.round(hp[0])+' / '+Math.round(hp[1]);
    if(state.hp!=null&&hp[0]<state.hp-.4)float(arena,'.m3d-hero','-'+Math.round(state.hp-hp[0]),'dmg-hero');
    else if(state.hp!=null&&hp[0]>state.hp+.4)float(arena,'.m3d-hero','+'+Math.round(hp[0]-state.hp),'dmg-heal');
    state.hp=hp[0];}
  const useMana=/mago|clerigo|paladino/.test(ps.cls_id||'mago');
  const rr=useMana?rows['mana']:rows['stamina'];
  if(rr){const f=hero.querySelector('.rsfill');f.className='bar-fill rsfill '+(useMana?'mana':'stamina');f.style.width=Math.max(0,rr[0]/rr[1]*100)+'%';hero.querySelector('.rst').textContent=(useMana?'Mana ':'Stamina ')+Math.round(rr[0])+' / '+Math.round(rr[1]);}
  const ul=rows['suprema'];if(ul){hero.querySelector('.ul .bar-fill').style.width=Math.min(100,ul[0])+'%';const u=h.querySelector('.hs-ult i');if(u)u.style.width=Math.min(100,ul[0])+'%';}
  /* inimigo */
  const en_name=txt(arena.querySelector('.boss-name'))||'Inimigo';
  const lv=txt(arena.querySelector('.boss-level'));
  const cur=parseFloat((txt(arena.querySelector('.arena-readout')).match(/\d+/)||[0])[0]);
  const hasMax=state.enName!==en_name;
  if(hasMax){state.enName=en_name;state.enMax=Math.max(1,cur);state.en=cur;}
  state.enMax=Math.max(state.enMax,cur);
  en.querySelector('.hn').textContent=en_name;en.querySelector('.hl').textContent=lv.replace(/·.*/,'').trim();
  en.querySelector('.hp .bar-fill').style.width=Math.max(0,cur/state.enMax*100)+'%';
  en.querySelector('.hp .ht').textContent=Math.round(cur)+' / '+Math.round(state.enMax);
  if(state.en!=null&&cur<state.en-.4)float(arena,'.m3d-enemy','-'+Math.round(state.en-cur),'dmg-enemy');
  state.en=cur;
  /* turno */
  const tm=txt(arena.querySelector('.codex-stamp')).match(/TURNO\s*(\d+)/i);
  const tt=h.querySelector('.hs-turn span');const busy=window.__busyUntil&&Date.now()<window.__busyUntil;
  tt.textContent=(busy?'Turno do inimigo':'Turno do jogador')+(tm?' · '+tm[1]:'');h.querySelector('.hs-turn').classList.toggle('foe',!!busy);
  /* habilidades */
  const grid=document.querySelector('.combat-panel .action-grid');
  h.querySelectorAll('.hs-card').forEach(c=>{
    const real=grid&&grid.querySelector('.rarity-'+c.dataset.r);const t=real?txt(real).replace(/^\d\s*·\s*/,''):'';
    const pick=/Escolher/i.test(t);const locked=/Bloqueada/i.test(t)||!real;
    c.querySelector('.hs-name').textContent=t||'—';c.disabled=locked||(!pick&&real&&real.disabled);c.classList.toggle('locked',locked);c.classList.toggle('pick',pick);
  });
  h.querySelectorAll('.hs-mini').forEach(m=>{const re={basic:/Ataque b/i,dodge:/Esquiva/i,ult:/Ultimate/i}[m.dataset.a];const real=grid&&[...grid.querySelectorAll('.action-button')].find(b=>re.test(txt(b)));m.disabled=!real||real.disabled;});
}
let q=null;const sched=()=>{if(q)return;q=requestAnimationFrame(()=>{q=null;try{update()}catch(e){}})};
document.addEventListener('click',e=>{if(e.target.closest('.combat-panel .action-button,.hud-skills,.hud-acts')){window.__busyUntil=Date.now()+1300;setTimeout(sched,1350);}},true);
const start=()=>{new MutationObserver(sched).observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class','disabled']});sched();};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
