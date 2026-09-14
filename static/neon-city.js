(()=>{
const c=document.querySelector('#city'),ctx=c.getContext('2d'),img=new Image();let W,H,t=0,last=0,acc=0,mode=2,paused=false,ready=false;const layers=[];let enhanced=true,realRain=true;
let seed=71;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};const rain=Array.from({length:180},()=>({x:rand(),y:rand(),speed:35+rand()*45,length:3+rand()*7}));const ripples=Array.from({length:22},()=>({x:rand(),y:.87+rand()*.12,p:rand()*3}));
const extraRain=Array.from({length:180},()=>({x:rand(),y:rand(),speed:60+rand()*50,length:6+rand()*9}));
const naturalDrops=Array.from({length:660},(_,i)=>({x:rand(),phase:rand(),depth:i%10<6?0:i%10<9?1:2,variation:rand(),land:.88+rand()*.115}));
function drawNaturalRain(ox,oy,dw,dh){
 const breeze=.065+.028*Math.sin(t*.22),strong=true,count=strong?(W<500?330:660):(W<500?210:420);
 ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.clip();
 for(const d of naturalDrops.slice(0,count)){
  const speed=[95,155,230][d.depth]*(.85+d.variation*.3),ground=oy+dh*d.land,span=Math.max(120,ground+20),cycle=span/speed+.48,phase=(t+d.phase*cycle)%cycle,fall=span/speed;
  const landX=((d.x*W+Math.sin(t*.12+d.phase*6)*2)%W+W)%W;
  if(phase<fall){const y=-20+phase*speed,x=landX-(ground-y)*breeze,len=[3,5,9][d.depth]+d.variation*3;
   ctx.fillStyle=d.depth===0?'#728398':'#a8b9cb';
   for(let k=0;k<len;k++){const tail=1-k/len;ctx.globalAlpha=(strong?[.22,.35,.48]:[.13,.22,.32])[d.depth]*(.22+.78*tail)*(.8+.2*d.variation);ctx.fillRect(Math.round(x-k*breeze),Math.round(y-k),1,1)}
  }else{
   const age=phase-fall;if(age<.16){ctx.globalAlpha=.3*(1-age/.16);ctx.fillStyle='#b6c4d2';const spread=age*15,lift=Math.sin(age/.16*Math.PI)*2;ctx.fillRect(Math.round(landX-spread),Math.round(ground-lift),1,1);ctx.fillRect(Math.round(landX+spread),Math.round(ground-lift*.7),1,1)}
   if(d.depth>0){const radius=1+age*11;ctx.fillStyle='#8e9eaf';ctx.globalAlpha=.23*(1-age/.48);for(let j=0;j<18;j++){if((j+d.depth)%5===0)continue;const a=j/18*Math.PI*2;ctx.fillRect(Math.round(landX+Math.cos(a)*radius),Math.round(ground+Math.sin(a)*radius*.23),1,1)}}
  }
 }
 ctx.restore();
}
function resize(){W=c.width=Math.ceil(innerWidth/2);H=c.height=Math.ceil(innerHeight/2);ctx.imageSmoothingEnabled=false;if(ready)draw()}addEventListener('resize',resize);
function pulse(x){x=(x%10+10)%10;return x<1.2?x/1.2:x<5?1:x<6.5?1-(x-5)/1.5:0}
function draw(){ctx.globalAlpha=1;ctx.fillStyle='#080c1e';ctx.fillRect(0,0,W,H);const scale=W/H<1.3?W/img.width:Math.max(W/img.width,H/img.height);const dw=img.width*scale,dh=img.height*scale,ox=(W-dw)/2,oy=H-dh;ctx.drawImage(img,ox,oy,dw,dh);
for(let sy=Math.floor(img.height*.855);sy<img.height-4;sy+=4){const depth=(sy/img.height-.855)/.145,dx=Math.round(Math.sin(t*(mode===2?1.3:.7)+sy*.12)*depth*(mode===2?4:2));ctx.drawImage(img,0,sy,img.width,3,ox+dx,oy+sy*scale,dw,Math.max(1,3*scale))}
const storm=enhanced?Math.pow(Math.max(0,Math.sin((t%18-5)/7*Math.PI)),2):0;
layers.forEach((layer,i)=>{
 if(!enhanced){const on=pulse(t+i*1.7);ctx.globalAlpha=.32*(1-on);ctx.drawImage(layer.off,ox,oy,dw,dh);ctx.globalAlpha=.3*on;ctx.drawImage(layer.on,ox,oy,dw,dh);return}
 // Clip source-aligned light masks into floor bands; the image itself stays fixed.
 for(let floor=0;floor<12;floor++){const on=pulse(t+i*2.1-floor*.22);ctx.save();ctx.beginPath();ctx.rect(ox,Math.floor(oy+dh*floor/12),dw,Math.ceil(dh/12)+1);ctx.clip();ctx.globalAlpha=.83*(1-on);ctx.drawImage(layer.off,ox,oy,dw,dh);ctx.globalAlpha=.94*on;ctx.drawImage(layer.on,ox,oy,dw,dh);ctx.restore()}
 const x=ox+dw*[.05,.13,.90,.965][i],lit=pulse(t+i*2.1-1.6);
 for(let k=0;k<24;k++){const y=oy+dh*(.86+k*.0055),length=(5+(k%5)*2)*(1+lit),shift=Math.round(Math.sin(t*1.6+k)*3);ctx.globalAlpha=lit*.34*(1-k/28);ctx.fillStyle=i%2?'#b992cf':'#91b9d8';ctx.fillRect(Math.round(x-length/2+shift),Math.round(y),Math.round(length),k%3===0?2:1)}
});ctx.globalAlpha=1;
if(realRain){drawNaturalRain(ox,oy,dw,dh)}else if(mode===2){ctx.save();ctx.beginPath();ctx.rect(0,70,W*.18,H-70);ctx.rect(W*.82,70,W*.18,H-70);ctx.rect(0,H*.9,W,H*.1);ctx.clip();ctx.fillStyle='#8faac8';ctx.globalAlpha=enhanced?.43+storm*.12:.34;const drops=enhanced?rain.concat(extraRain.slice(0,W<500?50:180)):rain;for(const r of drops){const x=Math.round(r.x*W),y=Math.round((r.y*H+t*r.speed)%H);if(enhanced){const length=Math.round(r.length*(1+storm*.4));for(let step=0;step<length;step+=3)ctx.fillRect(x-Math.floor(step/4)*(storm>.2?1:0),y+step,1,3)}else{ctx.fillRect(x,y,1,Math.round(r.length));ctx.fillRect(x-1,y+Math.round(r.length),1,2)}}ctx.restore();for(const r of ripples){const life=(t+r.p)%3,size=Math.round(life*(enhanced?7:4));ctx.globalAlpha=(enhanced?.7:.45)*(1-life/3);ctx.strokeStyle='#92a8cd';ctx.lineWidth=1;const x=Math.round(ox+r.x*dw),y=Math.round(oy+r.y*dh);ctx.beginPath();ctx.moveTo(x-size,y);ctx.lineTo(x-size,y-1);ctx.lineTo(x-2,y-1);ctx.lineTo(x-2,y-2);ctx.lineTo(x+2,y-2);ctx.lineTo(x+2,y-1);ctx.lineTo(x+size,y-1);ctx.lineTo(x+size,y);if(enhanced){ctx.lineTo(x+size,y+1);ctx.lineTo(x+3,y+1);ctx.lineTo(x+3,y+2);ctx.lineTo(x-3,y+2);ctx.lineTo(x-3,y+1);ctx.lineTo(x-size,y+1);ctx.closePath()}ctx.stroke()}}
ctx.globalAlpha=1;
}
function frame(now){const dt=Math.min(80,now-(last||now));last=now;if(document.documentElement.dataset.ui==='pixel'&&!document.hidden&&!paused&&document.querySelector('.motion-control')?.getAttribute('aria-pressed')!=='false'&&!document.querySelector('dialog')?.open){t+=dt/1000;acc+=dt;if(acc>50){draw();acc=0}}requestAnimationFrame(frame)}
img.onload=()=>{const sample=document.createElement('canvas');sample.width=img.width;sample.height=img.height;const sc=sample.getContext('2d');sc.drawImage(img,0,0);const pixels=sc.getImageData(0,0,img.width,img.height).data;for(const [x0,x1,y0,y1] of [[.02,.08,.14,.68],[.08,.18,.4,.79],[.86,.94,.35,.79],[.94,.995,.14,.75]]){const on=document.createElement('canvas'),off=document.createElement('canvas');on.width=off.width=img.width;on.height=off.height=img.height;const a=on.getContext('2d'),b=off.getContext('2d');for(let y=Math.floor(y0*img.height);y<y1*img.height;y+=2)for(let x=Math.floor(x0*img.width);x<x1*img.width;x+=2){const ix=(y*img.width+x)*4,r=pixels[ix],g=pixels[ix+1],blue=pixels[ix+2];if(Math.max(r,g,blue)>85&&blue>r*.85&&blue+g>160){a.fillStyle=`rgb(${Math.min(255,r+65)},${Math.min(255,g+65)},${Math.min(255,blue+65)})`;a.fillRect(x,y,2,2);b.fillStyle='#080e20';b.fillRect(x,y,2,2)}}layers.push({on,off})}ready=true;resize();requestAnimationFrame(frame)};img.onerror=()=>{c.hidden=true};img.src='/images/window-cards/neon-city.png';resize();
})();
