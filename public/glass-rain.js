(()=>{
const canvas=document.createElement('canvas');canvas.id='lens-glass';canvas.setAttribute('aria-hidden','true');document.body.append(canvas);const ctx=canvas.getContext('2d');let W,H,t=0,last=0,enabled=true;let seed=107;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
const hits=Array.from({length:22},(_,i)=>({x:rand(),y:.22+rand()*.73,phase:rand()*13,period:9+rand()*4,rotation:rand()*6.28,r:10+rand()*7,parts:Array.from({length:11},()=>({a:rand()*6.28,reach:.45+rand()*.8,size:rand()}))}));
function resize(){W=canvas.width=Math.ceil(innerWidth/2);H=canvas.height=Math.ceil(innerHeight/2);draw()}addEventListener('resize',resize);
function draw(){ctx.clearRect(0,0,W,H);if(!enabled||document.querySelector('dialog')?.open)return;ctx.save();for(const d of hits){const age=(t+d.phase)%d.period;if(age>3.2)continue;const x=d.x*W,y=d.y*H;
 const burst=1-Math.pow(1-Math.min(1,age/.22),3),fade=age<.12?age/.12:age<.65?1:Math.pow(Math.max(0,1-(age-.65)/2.55),1.35);
 // A shallow, uneven film: no detached white particles or complete bright ring.
 const points=d.parts.map((p,i)=>{const a=i/d.parts.length*Math.PI*2+d.rotation;return{x:x+Math.cos(a)*d.r*(.72+p.reach*.32)*burst,y:y+Math.sin(a)*d.r*(.72+p.reach*.32)*.68*burst}});
 ctx.save();
 const trace=()=>{ctx.beginPath();const end=points[points.length-1],start=points[0];ctx.moveTo((end.x+start.x)/2,(end.y+start.y)/2);points.forEach((p,i)=>{const q=points[(i+1)%points.length];ctx.quadraticCurveTo(p.x,p.y,(p.x+q.x)/2,(p.y+q.y)/2)});ctx.closePath()};
 trace();ctx.fillStyle='#6b8195';ctx.globalAlpha=.045*fade;ctx.fill();
 // Interrupted paired dark/light contours suggest water thickness in city light.
 for(let i=0;i<points.length;i++){
   if(i%4>1)continue;
   const prev=points[(i+points.length-1)%points.length],p=points[i],q=points[(i+1)%points.length];
   for(const shadow of [true,false]){
     const offset=shadow?.65:0;
     ctx.strokeStyle=shadow?'#091521':'#829eaf';ctx.globalAlpha=(shadow?.22:.19)*fade*(age<.3?1:.7);ctx.lineWidth=shadow?1:.6;
     ctx.beginPath();ctx.moveTo((prev.x+p.x)/2,(prev.y+p.y)/2+offset);ctx.quadraticCurveTo(p.x,p.y+offset,(p.x+q.x)/2,(p.y+q.y)/2+offset);ctx.stroke();
   }
 }
 // Brief stretched film at impact, then a subtle downward settling of its lower edge.
 if(age>.22){ctx.strokeStyle='#718b9d';ctx.globalAlpha=.09*fade;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x-d.r*.2,y+d.r*.18);ctx.quadraticCurveTo(x-d.r*.23,y+d.r*.35,x-d.r*.17,y+d.r*(.4+Math.min(age,1)*.12));ctx.stroke()}
 ctx.restore();

}ctx.restore();ctx.globalAlpha=1;}
function frame(now){const dt=Math.min(.07,(now-(last||now))/1000);last=now;if(document.documentElement.dataset.ui==='pixel'&&!document.hidden&&document.querySelector('.motion-control')?.getAttribute('aria-pressed')!=='false'&&!document.querySelector('dialog')?.open){t+=dt;draw()}requestAnimationFrame(frame)}resize();requestAnimationFrame(frame);
new MutationObserver(()=>{if(document.querySelector('dialog').open)ctx.clearRect(0,0,W,H)}).observe(document.querySelector('dialog'),{attributes:true,attributeFilter:['open']});
})();
