(() => {
 const ns='http://www.w3.org/2000/svg';
 const layer=document.createElement('div');layer.className='comic-fx-layer';layer.setAttribute('aria-hidden','true');document.body.append(layer);
 const designs=[
  {word:'ZIP!',small:'CLICK!',color:'#ffd12a',angle:-11,
   shape:'M20 89 64 64 45 28 105 38 142 8 160 36 235 13 232 52 290 51 260 90 297 119 235 133 242 166 178 151 134 179 116 148 49 163 61 128 10 120Z',
   detail:'<path class="fx-line" d="M47 53 26 37 M265 32 285 14 M25 147 9 161"/>',
   trail:'<path d="M35 110 Q115 28 222 48 M25 128 Q120 39 248 68" fill="none" stroke="white" stroke-width="7"/><path d="M35 110 Q115 28 222 48 M25 128 Q120 39 248 68" fill="none" stroke="#111" stroke-width="3"/><path d="m223 37 29 13-30 5" fill="#ffd12a" stroke="#111" stroke-width="3"/>'},
  {word:'BZZT!',small:'PING!',color:'#1879f5',angle:8,
   shape:'M22 51 89 58 112 13 147 49 207 17 201 51 287 40 261 83 299 104 251 123 268 157 207 147 170 175 143 144 74 165 82 131 12 139 43 98 6 77Z',
   detail:'<path class="fx-line" d="m245 10-12 17 17-1-13 20 M15 27l10 13-14 3 11 15"/>',
   trail:'<path d="M105 106 Q150 73 194 106 M81 84 Q150 29 218 84 M57 61 Q150-14 244 61" fill="none" stroke="white" stroke-width="8"/><path d="M105 106 Q150 73 194 106 M81 84 Q150 29 218 84 M57 61 Q150-14 244 61" fill="none" stroke="#1879f5" stroke-width="4"/><path d="m144 92-13 25 18-4-7 24 24-35-18 4 8-18" fill="white" stroke="#111" stroke-width="3"/>'},
  {word:'CLANK!',small:'CHK!',color:'#ff8b26',angle:-7,
   shape:'M6 100 57 83 28 38 97 51 122 6 153 45 212 13 215 56 284 29 268 82 309 95 269 116 292 156 224 141 201 178 158 147 103 175 89 140 27 153 42 118Z',
   detail:'<path class="fx-line" d="m30 13 18 20 M284 12l-9 13 M287 177l-18-13"/>',
   trail:'<path d="m65 33 30 27-20 4 40 38 M231 33l-30 29 20 5-38 31 M58 112l36 3 M211 113l35-8" fill="none" stroke="white" stroke-width="9"/><path d="m65 33 30 27-20 4 40 38 M231 33l-30 29 20 5-38 31 M58 112l36 3 M211 113l35-8" fill="none" stroke="#111" stroke-width="4"/><path d="m130 60 15 21 25-15-8 28 25 10-28 10-6 27-15-22-25 9 12-24-18-14 24-3Z" fill="#ff8b26" stroke="#111" stroke-width="3"/>'},
  {word:'SWISH!',small:'SCRITCH!',color:'#21b8ae',angle:10,
   shape:'M12 116 Q41 26 116 44L141 14 154 42Q241 12 289 55L268 81 303 98 270 116 275 148 236 139Q153 178 73 149L33 168 44 137Z',
   detail:'<path class="fx-line" d="M32 55Q67 19 111 25 M215 164l40-10"/><circle cx="286" cy="30" r="5" fill="#111"/><circle cx="17" cy="142" r="4" fill="#111"/>',
   trail:'<path d="M24 115 Q124 28 253 51 Q172 52 99 110 Q176 74 267 78" fill="none" stroke="white" stroke-width="10"/><path d="M24 115 Q124 28 253 51 Q172 52 99 110 Q176 74 267 78" fill="none" stroke="#111" stroke-width="5"/><path d="M52 130Q154 83 251 100" fill="none" stroke="#21b8ae" stroke-width="4"/><circle cx="269" cy="62" r="5" fill="#111"/>'}
 ];
 let active=null,animations=[],timer=null,demoTimer=null,serial=0;
 const blocked=()=>document.documentElement.dataset.ui!=='comic'||document.querySelector('.motion-control')?.getAttribute('aria-pressed')==='false'||document.body.classList.contains('transitioning')||document.body.classList.contains('reading-mode')||document.body.classList.contains('only-bg')||document.querySelector('dialog[open]')||document.hidden||(typeof paused!=='undefined'&&paused);
 function clear(){clearTimeout(timer);animations.forEach(a=>a.cancel());animations=[];layer.replaceChildren();active?.classList.remove('fx-active');active=null;}
 function svgNode(markup,cls,x,y,w,h){const el=document.createElementNS(ns,'svg');el.setAttribute('viewBox','0 0 320 190');el.setAttribute('width',w);el.setAttribute('height',h);el.setAttribute('class',cls);el.style.left=x+'px';el.style.top=y+'px';el.innerHTML=markup;layer.append(el);return el;}
 function play(card){
  if(blocked())return;const i=[...document.querySelectorAll('.card[data-open]')].indexOf(card);if(i<0)return;
  clear();active=card;card.classList.add('fx-active');const d=designs[i],r=card.getBoundingClientRect();
  const w=Math.min(310,Math.max(185,r.width*.95)),h=w*190/320;
  // The speech effect straddles the top/side gutter, outside the card's clipping context.
  const x=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width*.53-w*.25));
  const y=Math.max(9,r.top-h*.64);const id='dots-'+(++serial);
  const markup=`<defs><pattern id="${id}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#111" opacity=".23"/></pattern></defs><path class="fx-accent" d="${d.shape}"/><path d="${d.shape}" fill="url(#${id})"/>${d.detail}<text class="fx-word" x="155" y="120" text-anchor="middle" font-size="${i>1?65:77}">${d.word}</text><text class="fx-small" x="45" y="42" transform="rotate(-8 45 42)">${d.small}</text>`;
  const burst=svgNode(markup,'comic-fx',x,y,w,h);burst.style.setProperty('--fx-color',d.color);
  animations.push(burst.animate([{opacity:0,transform:`rotate(${d.angle-12}deg) scale(.32)`},{offset:.14,opacity:1,transform:`rotate(${d.angle+3}deg) scale(1.13)`},{offset:.23,opacity:1,transform:`rotate(${d.angle}deg) scale(1)`},{offset:.75,opacity:1,transform:`rotate(${d.angle}deg) scale(1)`},{opacity:0,transform:`translateY(-15px) rotate(${d.angle}deg) scale(.96)`}],{duration:1450,fill:'both',easing:'cubic-bezier(.16,.8,.24,1)'}));
  const trail=svgNode(d.trail,'comic-fx-trail',r.left-20,r.top+r.height*.15,r.width+40,(r.width+40)*190/320);
  animations.push(trail.animate([{opacity:0,transform:'scale(.65)'},{offset:.18,opacity:1,transform:'scale(1.08)'},{offset:.4,opacity:1,transform:'scale(1)'},{opacity:0,transform:'scale(1.14)'}],{duration:850,fill:'both'}));
  const art=card.querySelector('.art');const frames=i===2?['scale(1)','translateY(3px) scale(1.025)','translateY(-2px) scale(1.025)','scale(1)']:['scale(1)','scale(1.035)','scale(1.015)','scale(1)'];
  animations.push(art.animate(frames.map(transform=>({transform})),{duration:420,easing:'ease-out'}));
  timer=setTimeout(clear,1500);
 }
 document.addEventListener('pointerover',e=>{const card=e.target.closest('.card[data-open]');if(card&&e.pointerType!=='touch'&&!card.contains(e.relatedTarget))play(card)});
 document.addEventListener('pointerout',e=>{const card=e.target.closest('.card[data-open]');if(card&&card===active&&!card.contains(e.relatedTarget))clear()});
 document.addEventListener('focusin',e=>{if(e.target.matches('.card[data-open]')&&e.target.matches(':focus-visible'))play(e.target)});
 document.addEventListener('focusout',e=>{if(e.target===active)clear()});
 document.addEventListener('click',e=>{if(e.target.closest('.card[data-open],.motion-control')){clearTimeout(demoTimer);clear()}},true);
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){clearTimeout(demoTimer);clear()}});
 for(const event of ['scroll','resize','hashchange','uimodechange'])window.addEventListener(event,()=>{clearTimeout(demoTimer);clear()},{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(demoTimer);clear()}});
})();
