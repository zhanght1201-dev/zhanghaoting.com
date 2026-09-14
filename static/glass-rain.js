(()=>{
const canvas=document.createElement('canvas');canvas.id='lens-glass';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);const ctx=canvas.getContext('2d');let W,H,t=0,last=0,enabled=true;let seed=107;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const hits=Array.from({length:32},(_,i)=>({x:rand(),y:.22+rand()*.73,phase:rand()*6,period:5+rand()*4,rotation:rand()*6.28,r:10+rand()*7,parts:Array.from({length:11},()=>({a:rand()*6.28,reach:.45+rand()*.8,size:rand()}))}));
function resize(){W=canvas.width=Math.ceil(innerWidth/2);H=canvas.height=Math.ceil(innerHeight/2);draw()}addEventListener('resize',resize);
function draw(){ctx.clearRect(0,0,W,H);if(!enabled||document.querySelector('dialog')?.open)return;ctx.save();for(const d of hits){const age=(t+d.phase)%d.period;if(age>3.2)continue;const x=d.x*W,y=d.y*H;
 const burst=1-Math.pow(1-Math.min(1,age/.22),3),fade=age<.12?age/.12:age<.65?1:Math.pow(Math.max(0,1-(age-.65)/2.55),1.35);
 // Irregular thin water film spreads rapidly, then stays in place while fading.
 const points=d.parts.map((p,i)=>{const a=i/d.parts.length*Math.PI*2+d.rotation;return{x:x+Math.cos(a)*d.r*p.reach*burst,y:y+Math.sin(a)*d.r*p.reach*.7*burst}});
 ctx.save();
 ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(Math.round(p.x),Math.round(p.y)):ctx.moveTo(Math.round(p.x),Math.round(p.y)));ctx.closePath();ctx.fillStyle='#adc4d3';ctx.globalAlpha=.075*fade;ctx.fill();
 for(let i=0;i<points.length;i++){const p=points[i],q=points[(i+1)%points.length];if(i%3===1)continue;ctx.strokeStyle=i%2?'#b9cfde':'#647d91';ctx.globalAlpha=(age<.3?.48:.3)*fade;ctx.lineWidth=.65;ctx.beginPath();ctx.moveTo(Math.round(p.x),Math.round(p.y));ctx.lineTo(Math.round(p.x+(q.x-p.x)*.64),Math.round(p.y+(q.y-p.y)*.64));ctx.stroke()}
 for(const p of d.parts){const radius=d.r*(p.reach+.35)*burst,px=x+Math.cos(p.a)*radius,py=y+Math.sin(p.a)*radius*.7;ctx.fillStyle='#bed0dd';ctx.globalAlpha=.36*fade;ctx.fillRect(Math.round(px),Math.round(py),p.size>.6?2:1,1);if(age<.24){ctx.globalAlpha=.33*fade;ctx.beginPath();ctx.moveTo(Math.round(px),Math.round(py));ctx.lineTo(Math.round(px-Math.cos(p.a)*3),Math.round(py-Math.sin(p.a)*2));ctx.stroke()}}
 // Two short residual rivulets, not a large bead sliding down the screen.
 if(age>.22){ctx.strokeStyle='#abc0d0';ctx.globalAlpha=.18*fade;ctx.beginPath();ctx.moveTo(Math.round(x-d.r*.25),Math.round(y));ctx.lineTo(Math.round(x-d.r*.2),Math.round(y+d.r*.3));ctx.moveTo(Math.round(x+d.r*.4),Math.round(y+d.r*.1));ctx.lineTo(Math.round(x+d.r*.35),Math.round(y+d.r*.4));ctx.stroke()}ctx.restore();

}ctx.restore();ctx.globalAlpha=1;}
function frame(now){const dt=Math.min(.07,(now-(last||now))/1000);last=now;if(!document.hidden&&document.querySelector('.motion-control')?.getAttribute('aria-pressed')!=='false'&&!document.querySelector('dialog')?.open){t+=dt;draw()}requestAnimationFrame(frame)}resize();requestAnimationFrame(frame);
new MutationObserver(()=>{if(document.querySelector('dialog').open)ctx.clearRect(0,0,W,H)}).observe(document.querySelector('dialog'),{attributes:true,attributeFilter:['open']});
})();
