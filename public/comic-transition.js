(() => {
 const pagePanels=[
  [[[0,0],[49,0],[45,24],[0,33]],[[0,33],[45,24],[41,49],[0,56]],[[0,56],[41,49],[47,77],[0,72]],[[49,0],[100,0],[100,75],[47,77],[41,49],[45,24]],[[0,72],[47,77],[100,75],[100,100],[0,100]]],
  [[[0,0],[36,0],[46,48],[0,58]],[[36,0],[73,0],[62,44],[52,47],[46,48]],[[73,0],[100,0],[100,35],[62,44]],[[52,47],[62,44],[100,35],[100,100],[62,100]],[[0,58],[46,48],[52,47],[62,100],[0,100]]],
  [[[0,0],[100,0],[100,3],[61,16],[30,29],[0,14]],[[0,14],[30,29],[37,65],[29,100],[0,100]],[[30,29],[61,16],[57,44],[37,65]],[[61,16],[100,3],[100,45],[57,44]],[[37,65],[57,44],[100,45],[100,100],[29,100]]],
  [[[0,0],[47,0],[38,15],[33,49],[24,100],[0,100]],[[47,0],[100,0],[100,26],[68,22],[38,15]],[[38,15],[68,22],[56,54],[33,49]],[[68,22],[100,26],[100,68],[56,54]],[[33,49],[56,54],[100,68],[100,100],[24,100]]]
 ];
 const polygon=points=>'polygon('+points.map(p=>p[0]+'% '+p[1]+'%').join(',')+')';
 // Shared irregular edges keep the torn fragments contiguous before they separate.
 function fragments(){const nodes=[];for(let y=0;y<3;y++)for(let x=0;x<4;x++)nodes.push([x*100/3+(x>0&&x<3&&y===1?(x===1?-3:3):0),y*50+(y===1?(x%2?4:-4):0)]);
 const edges=new Map();
 function edge(a,b){const lo=Math.min(a,b),hi=Math.max(a,b),key=lo+':'+hi;if(!edges.has(key)){const p=nodes[lo],q=nodes[hi],dx=q[0]-p[0],dy=q[1]-p[1],len=Math.hypot(dx,dy),boundary=(p[0]===q[0]&&(p[0]===0||p[0]===100))||(p[1]===q[1]&&(p[1]===0||p[1]===100));const pts=[p];for(let k=1;k<6;k++){const t=k/6,j=boundary?0:(k%2?1:-1)*.65;pts.push([p[0]+dx*t-dy/len*j,p[1]+dy*t+dx/len*j])}pts.push(q);edges.set(key,pts)}const pts=edges.get(key);return a===lo?pts:[...pts].reverse()}
 const shapes=[];for(let y=0;y<2;y++)for(let x=0;x<3;x++){const a=y*4+x,b=a+1,c=a+4,d=c+1;for(const tri of [[a,b,d],[a,d,c]])shapes.push(tri.flatMap((v,i)=>edge(v,tri[(i+1)%3]).slice(0,-1)))}return shapes;}
 const shardPolygons=fragments();
 function piece(stage,points){const el=document.createElement('div');el.className='story-piece';el.style.clipPath=el.style.webkitClipPath=polygon(points);const img=document.createElement('img');img.src=stage.dataset.story;img.alt='';img.draggable=false;el.append(img);stage.append(el);return el}

 const slugs=['about','school','work','notes'];
 const headings=['01 · 整理行囊，推门出发','02 · 实验求解，修正验证','03 · 构建系统，交付使用','04 · 观察日常，记录所见'];
 let active=null;
 const imageCache=new Map();
 const storyURL=index=>`/images/comic/story-${slugs[index]}-final.png`;
 // Start the selected page while the visitor reads the introduction, not after leaving it.
 document.addEventListener('click',e=>{const trigger=e.target.closest('[data-open]');if(trigger&&document.documentElement.dataset.ui==='comic'){const index=slugs.indexOf(trigger.dataset.open);if(index>=0)load(index).catch(()=>{})}},true);
 function overlay(index){
  const screen=document.createElement('div');screen.className='transition-screen';screen.setAttribute('role','dialog');screen.setAttribute('aria-modal','true');screen.setAttribute('aria-label','漫画转场');
  screen.style.setProperty('--accent','#666');screen.style.setProperty('--story',`url(/images/comic/story-${slugs[index]}-final.png)`);
  screen.innerHTML=`<div class="transition-wash"></div><p class="transition-heading">${headings[index]}</p><div class="transition-sheet" aria-hidden="true"></div><span class="transition-step" aria-live="polite">漫画页加载中…</span><button class="transition-skip" type="button">跳过转场 →</button>`;
  document.body.append(screen);document.body.classList.add('transitioning');
  const locked=[...document.body.children].filter(el=>el!==screen).map(el=>[el,el.inert]);locked.forEach(([el])=>el.inert=true);
  const stage=screen.querySelector('.transition-sheet');stage.dataset.story=storyURL(index);
  // Explicit dimensions avoid a collapsed flex item in older iPhone Safari versions.
  function resize(){const width=Math.min(innerWidth*(innerWidth<=600?.96:.92),1170,innerHeight*1.17);stage.style.width=width+'px';stage.style.height=width*2/3+'px'}
  resize();window.addEventListener('resize',resize);
  const timers=[],animations=[];let done=false;
  const later=(fn,ms)=>timers.push(setTimeout(()=>{if(!done)fn()},ms));
  function cleanup(){if(done)return;done=true;timers.forEach(clearTimeout);animations.forEach(a=>a.cancel());screen.remove();locked.forEach(([el,value])=>el.inert=value);document.body.classList.remove('transitioning');document.documentElement.classList.remove('story-arriving');window.removeEventListener('keydown',key);window.removeEventListener('resize',resize);active=null;}
  const state={screen,stage,later,animations,cleanup,skip:cleanup};active=state;
  function key(e){if(e.key==='Escape'){e.preventDefault();state.skip()}if(e.key==='Tab'){e.preventDefault();screen.querySelector('button').focus()}}
  window.addEventListener('keydown',key);screen.querySelector('button').onclick=()=>state.skip();screen.querySelector('button').focus();return state;
 }
 function load(index){
  if(!imageCache.has(index)){
   const pending=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const decoded=img.decode?img.decode():Promise.resolve();decoded.then(()=>resolve(img),()=>resolve(img))};img.onerror=reject;img.src=storyURL(index)});
   imageCache.set(index,pending);pending.catch(()=>imageCache.delete(index));
  }return imageCache.get(index);
 }
 function depart(index,url){
  if(active)return;document.querySelector('dialog[open]')?.close();const s=overlay(index);let leaving=false;
  function go(reveal){if(leaving)return;leaving=true;try{if(reveal)sessionStorage.setItem('comic-arrival',JSON.stringify({slug:slugs[index],path:url.pathname,at:Date.now()}));else sessionStorage.removeItem('comic-arrival')}catch{}location.assign(url.href)}
  s.skip=()=>go(false);s.later(()=>go(false),20000);
  // This already displayed card stays visible while a cold mobile connection loads the story.
  const preview=document.querySelector(`.summary[data-summary="${slugs[index]}"] .comic-cover .comic-art`)?.cloneNode(true);
  if(preview){preview.classList.add('transition-preview');s.stage.append(preview)}
  load(index).then(()=>{if(active!==s)return;s.stage.replaceChildren();s.screen.querySelector('.transition-step').textContent='画格切入 · 拼合漫画页';
   pagePanels[index].forEach((points,i)=>{const cx=points.reduce((v,p)=>v+p[0],0)/points.length,cy=points.reduce((v,p)=>v+p[1],0)/points.length;const el=piece(s.stage,points);s.animations.push(el.animate([{opacity:0,transform:`translate(${(cx-50)*1.2}%,${(cy-50)*1.1}%) rotate(${i%2?7:-7}deg) scale(.88)`},{opacity:1,transform:'none'}],{duration:390,delay:i*220,easing:'cubic-bezier(.18,.8,.22,1)',fill:'both'}))});
   s.later(()=>s.screen.querySelector('.transition-step').textContent='完整漫画页',1350);s.later(()=>go(true),2100);
  }).catch(()=>go(false));
 }
 function arrive(data){
  const index=slugs.indexOf(data.slug);if(index<0){document.documentElement.classList.remove('story-arriving');return}
  const s=overlay(index);piece(s.stage,[[0,0],[100,0],[100,100],[0,100]]);
  const finish=()=>{s.cleanup();document.querySelector('#main')?.focus({preventScroll:true})};s.skip=finish;s.later(finish,4500);
  load(index).then(()=>{if(active!==s)return;document.documentElement.classList.remove('story-arriving');s.screen.classList.add('is-breaking');s.stage.replaceChildren();s.animations.push(s.screen.querySelector('.transition-wash').animate([{opacity:1},{opacity:0}],{duration:400,fill:'forwards'}));
   shardPolygons.forEach((points,i)=>{const el=piece(s.stage,points),cx=points.reduce((v,p)=>v+p[0],0)/points.length,cy=points.reduce((v,p)=>v+p[1],0)/points.length,dx=(cx-50)*2.8,dy=(cy-50)*3.4,rotate=(i%2?1:-1)*(18+i%4*9);el.style.transformOrigin=`${cx}% ${cy}%`;s.animations.push(el.animate([{opacity:1,transform:'none'},{offset:.25,opacity:1,transform:`translate(${dx*.14}vw,${dy*.14}vh) rotate(${rotate*.18}deg) scale(.98)`},{opacity:0,transform:`translate(${dx}vw,${dy}vh) rotate(${rotate}deg) scale(.72)`}],{duration:850,delay:i%4*28,easing:'cubic-bezier(.42,0,.65,1)',fill:'both'}))});s.later(finish,980);
  }).catch(finish);
 }
 if(window.comicArrival){const data=window.comicArrival;delete window.comicArrival;try{sessionStorage.removeItem('comic-arrival')}catch{}arrive(data)}
 document.addEventListener('click',e=>{const link=e.target.closest('.summary .copy a');if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey||link.target==='_blank'||document.documentElement.dataset.ui!=='comic'||document.querySelector('.motion-control')?.getAttribute('aria-pressed')==='false')return;
  const url=new URL(link.href);if(url.origin!==location.origin)return;const index=slugs.indexOf(link.closest('[data-summary]').dataset.summary);if(index<0)return;e.preventDefault();depart(index,url);
 });
 window.addEventListener('pageshow',e=>{if(e.persisted)active?.cleanup()});
})();
