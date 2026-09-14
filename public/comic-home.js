(() => {
 const pages=['background.png','background-rain.png','background-coast.png'].map(n=>'/images/comic/'+n);
 const strips=[...document.querySelectorAll('.comic-strip')];
 const incoming=strips.map(el=>{const layer=el.cloneNode();layer.style.opacity='0';el.after(layer);return layer});
 let ready=false,elapsed=0,last=null,loadedCycle=-1;
 const duration=7000,ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
 function render(){
  const cycle=Math.floor(elapsed/duration),phase=elapsed%duration,current=cycle%pages.length,next=(current+1)%pages.length;
  if(loadedCycle!==cycle){strips.forEach((el,i)=>{el.style.backgroundImage=`url(${pages[current]})`;incoming[i].style.backgroundImage=`url(${pages[next]})`});loadedCycle=cycle;}
  strips.forEach((el,i)=>{const p=ease(Math.max(0,Math.min(1,(phase-800-i*130)/1600))),direction=i%2?-1:1;
   el.style.transform=`translate(${direction*p*12}%,${-direction*p*3}%) scale(1.05)`;
   incoming[i].style.transform=`translate(${-direction*(1-p)*12}%,${direction*(1-p)*3}%) scale(1.05)`;incoming[i].style.opacity=String(p);
  });
 }
 function tick(now){
  const enabled=ready&&document.documentElement.dataset.ui==='comic'&&!document.hidden&&!document.querySelector('dialog')?.open&&!document.body.classList.contains('transitioning')&&document.querySelector('.motion-control')?.getAttribute('aria-pressed')!=='false';
  if(enabled){if(last!==null)elapsed+=Math.min(now-last,80);render()}last=now;requestAnimationFrame(tick);
 }
 Promise.all(pages.map(src=>new Promise(resolve=>{const img=new Image();img.onload=img.onerror=resolve;img.src=src}))).then(()=>{ready=true;requestAnimationFrame(tick)});
})();
