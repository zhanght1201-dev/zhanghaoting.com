(() => {
  const root=document.documentElement;
  let mode='comic';
  try { const saved=localStorage.getItem('four-windows-ui'); if(saved==='pixel'||saved==='comic') mode=saved; } catch {}
  root.dataset.ui=mode;
  // Cover the destination before first paint; its real URL and server-rendered content remain intact.
  try {
    const arrival=JSON.parse(sessionStorage.getItem('comic-arrival')||'null');
    if(mode==='comic'&&arrival&&arrival.path===location.pathname&&Date.now()-arrival.at<15000){
      window.comicArrival=arrival;root.classList.add('story-arriving');
      setTimeout(()=>root.classList.remove('story-arriving'),5000);
    } else sessionStorage.removeItem('comic-arrival');
  } catch {}
  function sync(){
    document.querySelectorAll('.ui-switch').forEach(el=>el.hidden=false);
    document.querySelectorAll('[data-ui-mode]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.uiMode===root.dataset.ui)));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',root.dataset.ui==='comic'?'#fafafa':'#0b1218');
  }
  function set(value){root.dataset.ui=value;try{localStorage.setItem('four-windows-ui',value)}catch{}sync();window.dispatchEvent(new Event('uimodechange'));}
  document.addEventListener('DOMContentLoaded',()=>{
    sync();document.querySelectorAll('[data-ui-mode]').forEach(el=>el.addEventListener('click',()=>set(el.dataset.uiMode)));
  });
  window.addEventListener('storage',e=>{if(e.key==='four-windows-ui'){root.dataset.ui=e.newValue==='pixel'?'pixel':'comic';sync();window.dispatchEvent(new Event('uimodechange'));}});
})();
