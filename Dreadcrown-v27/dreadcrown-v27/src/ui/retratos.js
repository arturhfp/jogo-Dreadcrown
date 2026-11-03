(()=>{
const P=window.__RETRATOS.P;
const S=window.__RETRATOS.S;
const BR={tanke:['Colosso Pesado','Guardião Arcano','Berserker','Cavaleiro de Espinhos','Vanguarda de Cerco'],mago:['Piromante','Criomante','Eletromante','Necromante','Mago Astral'],paladino:['Juramento da Devoção','Algoz Caído','Draconiano','Templário Solene','Inquisidor'],clerigo:['Sacerdote da Igreja','Ocultista','Bestial','Monge de Batalha','Oráculo'],assassino:['Assassino das Sombras','Mestre dos Venenos','Ninja / Shinobi','Carrasco Sangrento','Espadachim Fantasma'],arqueiro:['Atirador de Elite','Caçador de Feras','Arqueiro Elemental','Patrulheiro da Floresta','Arqueiro Acrobático']};
const norm=t=>(t||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const RACES=[[/Humano/i,'humano'],[/Elfo/i,'elfo'],[/An[ãa]o/i,'anao'],[/Orc/i,'orc'],[/Tiefling/i,'tiefling']];
const CLS=[[/Tank/i,'tanke'],[/Mago/i,'mago'],[/Paladino/i,'paladino'],[/Cl[ée]rigo/i,'clerigo'],[/Assassino/i,'assassino'],[/Arqueiro/i,'arqueiro']];
const pick=(list,t)=>{for(const [re,k] of list)if(re.test(t))return k;return null};
const txt=e=>(e?.innerText||e?.textContent||'');
const CCOL={tanke:'#78a9d4',mago:'#7fd2e8',paladino:'#f4df95',clerigo:'#91e8d5',assassino:'#a56ce0',arqueiro:'#7bd69a'};
const COL={tanke:['#c9a36b','#6aa8ff','#de6267','#80d29d','#e4b65f'],mago:['#ef744c','#76dbea','#f2d26b','#ad79e0','#7aa7ff'],paladino:['#f4df95','#de4a4a','#4aa3ff','#b58cf0','#6fe08a'],clerigo:['#f4df95','#a56ce0','#80d29d','#e0663c','#5fc8ff'],assassino:['#8a6ee0','#8fe05a','#5a8cff','#e0434b','#7fe0ff'],arqueiro:['#f0a63c','#6fc07a','#4fa8ff','#7fd06a','#b27cf0']};
function buildSprite(hero){
  const spr=document.createElement('div');spr.className='spr';
  const art=document.createElement('div');art.className='spr-art';
  const img=document.createElement('img');img.className='m3d-portrait';img.alt='';img.draggable=false;
  const shine=document.createElement('div');shine.className='spr-shine';
  art.append(img,shine);
  const glow=document.createElement('div');glow.className='spr-glow';
  const ring=document.createElement('div');ring.className='spr-ring';
  const parts=document.createElement('div');parts.className='spr-parts';
  for(let i=0;i<12;i++){const sp=document.createElement('i');sp.style.setProperty('--x',(8+Math.random()*84)+'%');sp.style.setProperty('--d',(2.6+Math.random()*3.2)+'s');sp.style.setProperty('--dl',(-Math.random()*5)+'s');sp.style.setProperty('--s',(2+Math.random()*3)+'px');parts.append(sp);}
  spr.append(glow,art,parts);
  const sh=document.createElement('div');sh.className='spr-shadow';
  hero.prepend(spr);hero.prepend(ring);hero.prepend(sh);
  return img;
}
function keyFor(arena){
  let race=null,cls=null,br=-1;
  if(arena.classList.contains('battle-arena')){
    const s=document.querySelector('.selection-summary p');
    if(s){const parts=txt(s).split('·').map(x=>x.trim());race=pick(RACES,parts[0]||'');cls=pick(CLS,parts[1]||'');if(cls&&parts[2])br=BR[cls].findIndex(n=>norm(n)===norm(parts[2]));}
  }else{
    const cards=[...document.querySelectorAll('.choice-card.selected')];
    const r=cards.find(c=>!c.classList.contains('class-card')&&!c.classList.contains('branch'));
    const c=cards.find(c=>c.classList.contains('class-card'));
    race=pick(RACES,txt(r));cls=pick(CLS,txt(c));
    if(cls){const bs=[...document.querySelectorAll('.choice-card.branch')];br=bs.findIndex(x=>x.classList.contains('selected'));}
  }
  return race&&cls?{race,cls,br}:null;
}
function sync(){
  document.querySelectorAll('.battle-arena,.creator-arena').forEach(arena=>{
    const stage=arena.querySelector('.mobile-3d-stage');
    if(!stage){window.dispatchEvent(new Event('resize'));return;}
    const hero=stage.querySelector('.m3d-hero');if(!hero)return;
    const kk=keyFor(arena);if(!kk)return;
    const sk=kk.br>=0?kk.race+'|'+kk.cls+'|'+kk.br:null;
    const sub=sk&&S[sk]?S[sk]:null;
    const isB=arena.classList.contains('battle-arena');
    const useSub=!!sub&&!isB;
    const k=useSub?sk:kk.race+'|'+kk.cls;
    const src=useSub?sub:P[k];if(!src)return;
    if(isB){window.__portraitSrc={cls:(P[kk.race+'|'+kk.cls]||[])[2]||null,sub:sub?sub[2]:null,cls_id:kk.cls,race:kk.race};hero.dataset.race=kk.race;}
    let img=hero.querySelector('img.m3d-portrait');
    if(!img)img=buildSprite(hero);
    const col=(kk.br>=0&&COL[kk.cls]&&COL[kk.cls][kk.br])||CCOL[kk.cls]||'#78a9d4';
    hero.style.setProperty('--c',col);
    if(img.dataset.k!==k){img.dataset.k=k;img.src=src[2];hero.style.setProperty('--ar',src[0]+' / '+src[1]);hero.dataset.portrait=k;hero.dataset.kind=useSub?'sub':'class';}
  });
}
function thumbs(){
  const cards=[...document.querySelectorAll('.choice-card.branch')];if(!cards.length)return;
  const kk=keyFor(document.querySelector('.creator-arena')||document.body);if(!kk)return;
  cards.forEach((c,i)=>{const s=S[kk.race+'|'+kk.cls+'|'+i];const v=s?'url('+s[2]+')':'none';if(c.dataset.th!==(s?kk.race+kk.cls+i:'')){c.dataset.th=s?kk.race+kk.cls+i:'';c.style.setProperty('--thumb',v);}});
}
let t=null;const sched=()=>{if(t)return;t=setTimeout(()=>{t=null;sync();thumbs()},120)};
const start=()=>{new MutationObserver(sched).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});sync();thumbs();setTimeout(sync,400);setTimeout(sync,1200)};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();

/* ===== animações 2D de combate ===== */
const cx=r=>r.left+r.width/2, cy=r=>r.top+r.height/2;
function act(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);clearTimeout(el['_t'+cls]);el['_t'+cls]=setTimeout(()=>el.classList.remove(cls),ms);}
function stageOf(){return document.querySelector('.battle-arena .mobile-3d-stage');}
function layer(stage){let l=stage.querySelector('.fx-layer');if(!l){l=document.createElement('div');l.className='fx-layer';stage.append(l);}return l;}
function heroColor(h){return getComputedStyle(h).getPropertyValue('--c').trim()||'#78a9d4';}
function burst(stage,x,y,color,size,ms){
  const l=layer(stage),b=document.createElement('div');b.className='fx-burst';
  b.style.cssText='left:'+x+'px;top:'+y+'px;width:'+size+'px;height:'+size+'px;--c:'+color;l.append(b);
  b.animate([{transform:'translate(-50%,-50%) scale(.2)',opacity:.95},{transform:'translate(-50%,-50%) scale(1.15)',opacity:0}],{duration:ms,easing:'ease-out'}).onfinish=()=>b.remove();
}
function slash(stage,x,y,color){
  const l=layer(stage),b=document.createElement('div');b.className='fx-slash';b.style.cssText='left:'+x+'px;top:'+y+'px;--c:'+color;l.append(b);
  b.animate([{transform:'translate(-50%,-50%) rotate(-35deg) scaleX(.2)',opacity:0},{transform:'translate(-50%,-50%) rotate(-35deg) scaleX(1)',opacity:1,offset:.35},{transform:'translate(-50%,-50%) rotate(-35deg) scaleX(1.1)',opacity:0}],{duration:380,easing:'ease-out'}).onfinish=()=>b.remove();
}
function projectile(stage,from,to,color,ms,cb){
  const l=layer(stage),b=document.createElement('div');b.className='fx-orb';b.style.setProperty('--c',color);l.append(b);
  b.animate([{left:from.x+'px',top:from.y+'px',transform:'translate(-50%,-50%) scale(.4)',opacity:.4},{left:(from.x+to.x)/2+'px',top:(from.y+to.y)/2-18+'px',transform:'translate(-50%,-50%) scale(1.15)',opacity:1,offset:.5},{left:to.x+'px',top:to.y+'px',transform:'translate(-50%,-50%) scale(.8)',opacity:1}],{duration:ms,easing:'ease-in'}).onfinish=()=>{b.remove();cb&&cb();};
}
const RC={common:'#c9d2d8',rare:'#65a8e8',epic:'#b68be8',legendary:'#e4b65f'};
function play(kind,rarity){
  const stage=stageOf();if(!stage)return;
  const hero=stage.querySelector('.m3d-hero'),en=stage.querySelector('.m3d-enemy');if(!hero||!en)return;
  const sr=stage.getBoundingClientRect(),hr=hero.getBoundingClientRect(),er=en.getBoundingClientRect();
  const H={x:cx(hr)-sr.left,y:cy(hr)-sr.top},E={x:cx(er)-sr.left,y:cy(er)-sr.top};
  const col=heroColor(hero);
  hero.style.setProperty('--dx',Math.max(30,(E.x-H.x)*.5)+'px');
  if(kind==='attack'){
    act(hero,'fx-attack',620);
    setTimeout(()=>{slash(stage,E.x-6,E.y,'#fff');burst(stage,E.x,E.y,col,90,360);act(en,'fx-hit',420)},260);
  }else if(kind==='dodge'){act(hero,'fx-dodge',600);}
  else if(kind==='cast'||kind==='ultimate'){
    const c=kind==='ultimate'?col:(RC[rarity]||col);
    act(hero,'fx-cast',800);
    burst(stage,H.x,H.y,c,kind==='ultimate'?190:130,650);
    setTimeout(()=>projectile(stage,{x:H.x+30,y:H.y-10},{x:E.x,y:E.y},c,kind==='ultimate'?420:340,()=>{burst(stage,E.x,E.y,c,kind==='ultimate'?220:150,520);act(en,'fx-hit',460)}),300);
  }
}
document.addEventListener('click',ev=>{
  const b=ev.target.closest('.battle-arena ~ * .action-button, .combat-panel .action-button, .skill-use-link');
  if(!b||b.disabled)return;
  const t=txt(b);
  if(/Ataque b[áa]sico/i.test(t))play('attack');
  else if(/Esquiva/i.test(t)&&b.closest('.combat-panel'))play('dodge');
  else if(/Ultimate/i.test(t))play('ultimate');
  else if(b.classList.contains('skill-use-link'))play('cast','epic');
  else{const m=b.className.match(/rarity-(common|rare|epic|legendary)/);play('cast',m?m[1]:'rare');}
},true);
/* dano: barras de vida mudando */
const lastW=new WeakMap();
function hp(){
  const stage=stageOf();if(!stage)return;
  const hero=stage.querySelector('.m3d-hero'),en=stage.querySelector('.m3d-enemy');
  const hb=document.querySelector('.combat-panel .bar-fill.health');
  if(hb){const w=parseFloat(hb.style.width);const p=lastW.get(hb);if(p!=null&&w<p-.1){const busy=hero.classList.contains('fx-attack')||hero.classList.contains('fx-cast')||hero.classList.contains('fx-dodge');setTimeout(()=>{act(en,'fx-lunge',520);setTimeout(()=>{act(hero,'fx-hit',520);const sr=stage.getBoundingClientRect(),hr=hero.getBoundingClientRect();burst(stage,cx(hr)-sr.left,cy(hr)-sr.top,'#ff5a5a',110,420)},230)},busy?800:0);}lastW.set(hb,w);}
  const eb=document.querySelector('.battle-arena .boss-health-fill');
  if(eb){const w=parseFloat(eb.style.width);const p=lastW.get(eb);if(p!=null&&w<p-.1){act(en,'fx-hit',460);}lastW.set(eb,w);}
}
new MutationObserver(hp).observe(document.body,{subtree:true,attributes:true,attributeFilter:['style']});
})();
