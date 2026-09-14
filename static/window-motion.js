(()=>{
const ns='http://www.w3.org/2000/svg',media=matchMedia('(prefers-reduced-motion: reduce)'),states=[],live=null;let slow=false,manualReduced=false,allowMotion=false,last=0;const touchOnly=matchMedia('(hover: none)');const disabled=()=>manualReduced;const img=(clip,src='concept.png')=>`<image href="/images/window-cards/${src}" width="1536" height="1024" ${clip?`clip-path="url(#${clip})"`:''}/>`;const info={about:'门扇轻开 · 地面光带 · 固定镜头',school:'四颗像素流星 · 错峰划过 · 星空感应',work:'吊索收短 · 构件上提 · 轻摆停稳',notes:'书签轻摆 · 像素星簇 · 断续星线'};
function shape(id,d){return `<clipPath id="${id}"><path d="${d}"/></clipPath>`}
for(const [index,card] of [...document.querySelectorAll('.card')].entries()){
const slug=card.dataset.open,svg=card.querySelector('svg'),prefix='extra-'+slug;
const s={slug,card,svg,t:0,amount:0,hover:false,play:false,x:.5,y:.5,pointer:false,sx:0,sy:0};states.push(s);if(slug==='about'){
const door='M136 247L165 269L165 589L136 617Z';svg.innerHTML=`<defs>${shape(prefix,door)}</defs>${img('')}${img(prefix,'motion-clean.png')}<g class="door-leaf">${img(prefix)}</g><path class="sunbeam" d="M164 570L278 570L341 676L104 676Z" fill="#f0c474" opacity="0"/>`;
}else if(slug==='school'){
const meteors=[{x:467,y:247,dx:111,dy:70,delay:.25,duration:1.4,size:3},{x:531,y:235,dx:80,dy:57,delay:1.15,duration:1.1,size:2},{x:449,y:301,dx:128,dy:76,delay:2,duration:1.4,size:3},{x:552,y:274,dx:62,dy:42,delay:3.05,duration:1.0,size:2}];
svg.innerHTML=`<defs><clipPath id="meteor-sky"><path d="M428 219H627V378H428Z"/></clipPath></defs>${img('')}<g clip-path="url(#meteor-sky)" shape-rendering="crispEdges">${meteors.map((m,i)=>`<g class="meteor" data-index="${i}" opacity="0">${Array.from({length:i%2?7:10},(_,j)=>`<rect x="${-j*3}" y="${-j*2}" width="${m.size}" height="${m.size}" fill="${j>3?'#8199b0':'#ddd9bb'}" opacity="${(1-j/11)*.8}"/>`).join('')}<rect width="${m.size}" height="${m.size}" fill="#e8dfbd"/></g>`).join('')}</g>`;s.meteors=meteors;
}else if(slug==='notes'){
const starPositions=[[1338,548],[1378,536],[1412,560],[1388,592],[1432,602]];
const branches=[[[1338,548],[1350,546],[1356,538],[1378,536]],[[1378,536],[1386,548],[1398,550],[1412,560]],[[1412,560],[1404,566],[1406,578],[1394,582],[1388,592]],[[1388,592],[1406,588],[1420,596],[1432,602]],[[1412,560],[1428,562],[1434,570]]];
const pixels=[];branches.forEach((points,branch)=>{for(let j=1;j<points.length;j++){const [x0,y0]=points[j-1],[x1,y1]=points[j];const steps=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))/2;for(let k=0;k<steps;k++){if((k+j*3+branch)%9===4||(k+branch*2)%13===6)continue;const x=Math.round((x0+(x1-x0)*k/steps)/2)*2,y=Math.round((y0+(y1-y0)*k/steps)/2)*2;pixels.push({x,y,tone:(k+j+branch)%3})}}});
svg.innerHTML=`${img('','notes-quiet.png')}<path class="bookmark" d="M1352 622L1364 620L1376 655L1368 651L1364 659Z" fill="#b47b5d" opacity=".85"/><g class="page-constellation" shape-rendering="crispEdges"><g class="star-thread">${pixels.map((p,i)=>`<rect class="thread-pixel" x="${p.x}" y="${p.y}" width="2" height="${p.tone===0?1:2}" fill="${['#967b53','#b59865','#c6a772'][p.tone]}" opacity="0"/>`).join('')}</g>${starPositions.map(([x,y],i)=>`<g class="page-star" data-order="${i}" opacity="0">${[[0,0,3,2],[-2,1,2,2],[1,-2,2,2],[3,2,2,1],[-3,-2,1,1],[0,3,1,2]].filter((_,j)=>j<4||(i+j)%2===0).map(([dx,dy,w,h],j)=>`<rect x="${x+dx}" y="${y+dy}" width="${w}" height="${h}" fill="${j===0?'#dec38d':j<3?'#bd9f69':'#8f7851'}"/>`).join('')}</g>`).join('')}</g>`;

}
if(slug==='work'){svg.insertAdjacentHTML('beforeend','<g class="bridge-zones"><path d="M809 400L946 383M836 410V557M916 395V530" fill="none" stroke="#ffdb8d" stroke-width="2" opacity="0"/><path d="M964 388L1109 373M1022 392V538M1090 385V495" fill="none" stroke="#ffdb8d" stroke-width="2" opacity="0"/></g>')}
if(slug==='school'||slug==='notes'){
const starGroup=document.createElementNS(ns,'g');starGroup.setAttribute('class','responsive-stars');for(let i=0;i<10;i++){const dot=document.createElementNS(ns,'rect');const x=slug==='school'?440+(i*43)%286:1322+(i*29)%118,y=slug==='school'?240+(i*31)%165:536+(i*13)%64;for(const [k,v] of Object.entries({x,y,width:2+i%2,height:2+i%2,fill:'#f8d998',opacity:0}))dot.setAttribute(k,v);starGroup.append(dot)}svg.append(starGroup)}
card.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch'){s.hover=true;if(!s.play)s.t=0}});card.addEventListener('pointerleave',()=>{s.hover=false;s.pointer=false;s.x=s.y=.5});card.addEventListener('blur',()=>s.hover=false);card.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;const r=card.getBoundingClientRect();s.x=(e.clientX-r.left)/r.width;s.y=(e.clientY-r.top)/r.height;s.pointer=true;const pt=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());s.sx=pt.x;s.sy=pt.y});
}

const motionControl=document.createElement('button');
motionControl.className='motion-control';motionControl.type='button';
document.querySelector('.intro').append(motionControl);
try{allowMotion=sessionStorage.getItem('window-motion')==='allow';manualReduced=sessionStorage.getItem('window-motion')==='pause'}catch{}
function updateControl(){
 motionControl.hidden=false;
 const paused=disabled();
 motionControl.textContent=paused?'动画已暂停 · 启用动画':'动画已启用 · 暂停动画';
 motionControl.setAttribute('aria-pressed',String(!paused));
}
motionControl.addEventListener('click',()=>{
 const enable=disabled();allowMotion=enable;manualReduced=!enable;
 states.forEach(s=>{s.t=0;s.amount=0;s.play=enable;s.hover=false;s.pointer=false});
 try{sessionStorage.setItem('window-motion',enable?'allow':'pause')}catch{}
 updateControl();
});
media.addEventListener('change',updateControl);touchOnly.addEventListener('change',updateControl);updateControl();
// One introduction cycle on both desktop and touch devices, after artwork loads.
Promise.all(['concept.png','motion-clean.png','clean-plate.png','notes-quiet.png'].map(name=>new Promise(resolve=>{const image=new Image();image.onload=image.onerror=resolve;image.src='/images/window-cards/'+name}))).then(()=>{if(!disabled()&&!document.hidden&&!document.querySelector('dialog')?.open)states.forEach(s=>{s.play=true;s.t=0;s.amount=0})});

function frame(now){let dt=last?Math.min(70,now-last):0;last=now;if(document.documentElement.dataset.ui!=="pixel"){requestAnimationFrame(frame);return}if(!document.hidden){dt*=slow?.4:1;for(const s of states){const no=disabled()||document.documentElement.dataset.ui!=='pixel'||document.querySelector("dialog")?.open;if(no){s.amount=0;s.play=false;s.t=0}else{if(s.hover||s.play)s.t+=dt;let on=s.play?s.t<4700:s.hover;let target=on?1:0;s.amount+=Math.sign(target-s.amount)*Math.min(Math.abs(target-s.amount),dt/(on?1400:850));if(s.play&&s.t>6200){s.play=false;s.amount=0}}const a=s.amount*s.amount*(3-2*s.amount),t=s.t/1000;const v=(selector,attr,value)=>s.svg.querySelector(selector)?.setAttribute(attr,value);s.card.style.setProperty('--raise','0px');
if(s.slug==='about'){v('.door-leaf','transform',`translate(136 0) scale(${1-a*.32} 1) translate(-136 0)`);v('.sunbeam','opacity',a*.16)}
if(s.slug==='school'){s.svg.querySelectorAll('.meteor').forEach((node,i)=>{const m=s.meteors[i],phase=(t-m.delay)/m.duration,u=Math.max(0,Math.min(1,phase));node.setAttribute('transform',`translate(${Math.round((m.x+m.dx*u)/2)*2} ${Math.round((m.y+m.dy*u)/2)*2})`);node.setAttribute('opacity',no||phase<0||phase>1?0:Math.sin(Math.PI*u)*Math.min(1,a*1.6))})}
if(s.slug==='work'){const lift=(Math.min(1,t/2.8)*28*a);const sway=t>2.8?Math.sin((t-2.8)*7)*Math.exp(-(t-2.8)*2)*.6*a:0;v('.rig','transform',`translate(0 ${-lift}) rotate(${sway} 999 324)`);v('.rope','d',`M999 277V${324-lift}`)}
if(s.slug==='notes'){const swing=Math.sin(Math.min(1,t/3.3)*Math.PI)*8*a;v('.bookmark','transform',`rotate(${swing} 1352 622)`);const draw=Math.max(0,Math.min(1,(t-.5)/2));const fade=t<3.3?1:Math.max(0,1-(t-3.3)/1.2);const threadPixels=[...s.svg.querySelectorAll('.thread-pixel')];threadPixels.forEach((pixel,i)=>pixel.setAttribute('opacity',i<Math.floor(draw*threadPixels.length)?a*.65*fade:0));s.svg.querySelectorAll('.page-star').forEach((node,i)=>{const rise=Math.max(0,Math.min(1,(t-.25-i*.23)/.4));node.setAttribute('opacity',a*rise*(.4+.6*fade))})}
s.svg.querySelectorAll('.bridge-zones path').forEach((path,i)=>{const d=Math.hypot(s.sx-(i?1035:885),s.sy-438);path.setAttribute('opacity',!no&&s.pointer?Math.max(0,1-d/150)*.9:0)});s.svg.querySelectorAll('.responsive-stars rect').forEach((dot,i)=>{const distance=Math.hypot(s.sx-Number(dot.getAttribute('x')),s.sy-Number(dot.getAttribute('y')));const proximity=s.pointer?Math.max(0,1-distance/70):0;dot.setAttribute('opacity',a*(.12+proximity*.88)*(t>i*.09?1:0))});}}requestAnimationFrame(frame)}requestAnimationFrame(frame);
window.addEventListener('pagehide',()=>states.forEach(s=>{s.hover=false;s.play=false;s.pointer=false;s.amount=0;s.t=0}));
})();
