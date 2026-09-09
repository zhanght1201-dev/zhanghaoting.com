(() => {
  const entries=[...document.querySelectorAll('[data-object]')];
  if(!entries.length) return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let active=null, pending=null, frame=null, trigger=null;
  const quantize=n=>Math.round(n/2)*2;
  function reset(entry) {
    if(!entry)return;
    entry.classList.remove('is-hover','is-pressed');
    for(const name of ['--px','--py','--dx','--dy'])entry.style.setProperty(name,'0px');
  }
  function flush() {
    frame=null;
    if(!active||!pending||reduced.matches||document.hidden)return;
    const box=active.getBoundingClientRect();
    const x=Math.max(-1,Math.min(1,(pending.x-box.left)/box.width*2-1));
    const y=Math.max(-1,Math.min(1,(pending.y-box.top)/box.height*2-1));
    for(const [name,value] of [['--px',x*6],['--py',y*6],['--dx',x*2],['--dy',y*2]])active.style.setProperty(name,quantize(value)+'px');
  }
  entries.forEach(entry=>{
    const panel=document.querySelector(`[data-dossier="${entry.dataset.object}"]`);
    if(!panel?.showModal)return;
    entry.setAttribute('aria-haspopup','dialog');
    entry.addEventListener('pointerenter',e=>{
      if(e.pointerType==='touch')return;
      reset(active);active=entry;
      if(!reduced.matches)entry.classList.add('is-hover');
    });
    entry.addEventListener('pointermove',e=>{
      if(active!==entry||e.pointerType==='touch')return;
      pending={x:e.clientX,y:e.clientY};if(frame===null)frame=requestAnimationFrame(flush);
    });
    entry.addEventListener('pointerleave',()=>{reset(entry);if(active===entry){active=null;pending=null;}});
    entry.addEventListener('pointerdown',()=>entry.classList.add('is-pressed'));
    for(const type of ['pointerup','pointercancel','blur'])entry.addEventListener(type,()=>entry.classList.remove('is-pressed'));
    entry.addEventListener('click',e=>{
      if(e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
      e.preventDefault();trigger=entry;
      reset(active);active=null;pending=null;
      entry.classList.remove('is-clicked');void entry.offsetWidth;entry.classList.add('is-clicked');
      panel.showModal();
    });
    entry.addEventListener('animationend',e=>{if(e.animationName==='object-confirm')entry.classList.remove('is-clicked');});
    panel.querySelector('[data-dismiss]').addEventListener('click',()=>panel.close());
    panel.addEventListener('close',()=>{entry.classList.remove('is-clicked');if(trigger===entry)entry.focus({preventScroll:true});});
  });
  function pause(){document.body.classList.toggle('pixel-paused',document.hidden);if(document.hidden){reset(active);active=null;pending=null;if(frame!==null)cancelAnimationFrame(frame);frame=null;}}
  document.addEventListener('visibilitychange',pause);
  reduced.addEventListener('change',()=>{reset(active);active=null;pending=null;});
  window.addEventListener('pagehide',()=>{trigger=null;reset(active);active=null;document.querySelectorAll('.pixel-dialog[open]').forEach(p=>p.close());});
})();
