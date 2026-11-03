(()=>{
  let handled=false, timer=null;
  const textOf=e=>(e?.innerText||e?.textContent||'').replace(/\s+/g,' ').trim();
  const hasVictory=()=>[...document.querySelectorAll('.battle-arena .codex-stamp span')].some(e=>textOf(e).includes('Selo rompido'));
  const isShop=()=>!!document.querySelector('.modal-backdrop .shop-card');
  const autoAdvance=()=>{
    if(!hasVictory() || handled) return;
    const backdrop=document.querySelector('.modal-backdrop');
    if(backdrop){
      const camp=[...backdrop.querySelectorAll('button')].find(b=>/Descansar/.test(textOf(b)));
      if(camp){handled=true; camp.click(); return;}
      // Wait for the camp choice if a shop or another modal is currently open.
      return;
    }
    // If the original game did not open its camp modal, invoke its standard camp flow
    // when it becomes available rather than adding a manual continuation button.
    const camp=[...document.querySelectorAll('button')].find(b=>b.classList.contains('camp-option') && /Descansar/.test(textOf(b)));
    if(camp){handled=true;camp.click();return;}
  };
  const resetIfAlive=()=>{if(!hasVictory()){handled=false; if(timer){clearTimeout(timer);timer=null;}}};
  const schedule=()=>{resetIfAlive(); if(timer)clearTimeout(timer); timer=setTimeout(()=>{timer=null;autoAdvance();},650);};
  const obs=new MutationObserver(schedule);
  const start=()=>{obs.observe(document.body,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class']});schedule();};
  document.addEventListener('click',e=>{if(e.target.closest('.camp-option')||e.target.closest('.shop-card button')){setTimeout(()=>{if(!hasVictory())handled=false;},800);}},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
