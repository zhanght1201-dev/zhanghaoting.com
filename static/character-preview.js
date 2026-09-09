(() => {
  "use strict";
  const $ = selector => document.querySelector(selector);
  const stage = $('[data-scene]'), room = $('[data-dynamic-room]');
  const actor = $('[data-actor]'), sprite = $('[data-actor-sprite]'), shadow = $('[data-actor-shadow]');
  const school = $('[data-scene-link="school"]'), dialog = $('[data-research-dialog]');
  const status = $('[data-animation-status]'), hint = $('[data-character-hint]');
  const replay = $('[data-replay]'), back = $('[data-return]'), slow = $('[data-slow-motion]');
  const studyToggle = $('[data-study-toggle]'), studyFrame = $('[data-study-frame]');
  if (!stage || !dialog?.showModal) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const rows = {down:0, left:1, right:2, up:3};
  // One ground-plane polyline. Scalar progress makes mid-edge reversals exact.
  const points = [{x:717.312,y:788.48},{x:844.8,y:778.24},{x:1029.12,y:706.56}];
  const lengths = points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
  const total = lengths[0]+lengths[1], speed = total/1200, stride = speed*640;
  let distance=0, target=total, walked=0, state='idle', ready=false, loaded=false;
  let previous=null, raf=null, arrival=0, rate=1, focusTarget=school;
  let studyTime=0, studyPaused=false, studyLast=-1, facing='down';
  function pose(el, direction, frame) {
    el.style.backgroundPosition=`${frame*100/3}% ${rows[direction]*100/3}%`;
  }
  function render(direction, frame) {
    facing=direction;
    pose(sprite,direction,frame);
    actor.dataset.direction=direction;
    actor.dataset.frame=`${direction}:${frame}`;
  }
  function study(frame) {
    if (studyLast===frame) return;
    studyLast=frame;
    document.querySelectorAll('[data-study-direction]').forEach(el=>pose(el,el.dataset.studyDirection,frame));
    studyFrame.value=frame;
    $('[data-study-number]').textContent=`${frame+1} / 4`;
  }
  function place() {
    const i=distance<=lengths[0]?0:1;
    const t=(distance-(i?lengths[0]:0))/lengths[i];
    const a=points[i], b=points[i+1];
    const x=a.x+(b.x-a.x)*t, y=a.y+(b.y-a.y)*t;
    actor.style.left=shadow.style.left=`${x/1536*100}%`;
    actor.style.top=shadow.style.top=`${y/1024*100}%`;
    actor.dataset.x=(x/1536*100).toFixed(2);
    actor.dataset.y=(y/1024*100).toFixed(2);
    stage.dataset.characterDepth='front';
    return i;
  }
  function setState(next) {
    state=next; stage.dataset.characterState=next;
  }
  function reset() {
    setState('idle');
    if(dialog.open) dialog.close();
    distance=0; target=total; walked=0; arrival=0; previous=null;
    place(); render('down',1);
    status.textContent='点击「学校与科研」，体验行走、终端亮起与档案展开。';
  }
  function begin(destination, trigger) {
    if(!ready) return;
    focusTarget=trigger; target=destination; arrival=0;
    setState('walking');
    if(dialog.open) dialog.close();
    status.textContent=target?'人物正在前往科研终端。':'人物正在返回房间中央。';
    hint.textContent=target?'前往科研终端…':'返回中央…';
  }
  function tick(time) {
    raf=null;
    if(!ready || document.hidden) {previous=null; return;}
    const dt=previous===null?0:Math.min(80,time-previous)*rate;
    previous=time;
    if(!studyPaused) {studyTime+=dt; study(Math.floor(studyTime/160)%4);}
    if(state==='walking') {
      const sign=Math.sign(target-distance), step=Math.min(Math.abs(target-distance),speed*dt);
      distance+=sign*step; walked+=step;
      const segment=place();
      render(segment===0?(sign<0?'left':'right'):(sign<0?'down':'up'),Math.floor(walked/stride*4)%4);
      if(Math.abs(target-distance)<0.001) {
        render(target?'up':'down',1);
        if(target) {setState('arrival'); arrival=0; status.textContent='已到达科研终端，正在读取档案。'; hint.textContent='读取科研档案…';}
        else {setState('idle'); status.textContent='已回到房间中央。';}
      }
    } else if(state==='arrival') {
      arrival+=dt;
      if(arrival>=500) {setState('viewing'); dialog.showModal(); status.textContent='科研档案已打开，关闭后人物留在终端旁。';}
    }
    raf=requestAnimationFrame(tick);
  }
  function sync() {
    ready=loaded&&!reduced.matches;
    if(raf!==null) cancelAnimationFrame(raf);
    raf=null; previous=null;
    slow.hidden=back.hidden=replay.hidden=!ready;
    studyToggle.disabled=studyFrame.disabled=!ready;
    room.hidden=!ready;
    if(!ready) {
      setState('idle'); if(dialog.open) dialog.close();
      delete stage.dataset.characterReady;
      study(1);
      status.textContent=reduced.matches?'已开启减少动态效果，栏目将直接打开。':'动画未能加载，栏目仍可直接打开。';
      return;
    }
    stage.dataset.characterReady='true'; reset();
    if(!document.hidden) raf=requestAnimationFrame(tick);
  }
  school.addEventListener('click',event=>{
    if(!ready || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); begin(total,school);
  });
  replay.addEventListener('click',()=>{reset();begin(total,replay);});
  back.addEventListener('click',()=>begin(0,back));
  slow.addEventListener('click',()=>{
    rate=rate===1?.4:1;
    slow.textContent=rate===1?'慢速查看':'慢速 0.4×';
    slow.setAttribute('aria-pressed',String(rate!==1)); previous=null;
  });
  studyToggle.addEventListener('click',()=>{
    studyPaused=!studyPaused;
    studyToggle.textContent=studyPaused?'播放步态':'暂停步态';
    studyToggle.setAttribute('aria-pressed',String(studyPaused));
  });
  studyFrame.addEventListener('input',()=>{
    studyPaused=true; studyTime=Number(studyFrame.value)*160;
    studyToggle.textContent='播放步态'; studyToggle.setAttribute('aria-pressed','true');
    study(Number(studyFrame.value));
  });
  $('[data-close-dialog]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{
    // Programmatic resets must not overwrite a newer journey or restore stale focus.
    if(state!=='viewing') return;
    setState('idle'); status.textContent='人物停留在科研终端旁，可返回中央。';
    focusTarget.focus({preventScroll:true});
  });
  document.addEventListener('visibilitychange',()=>{
    previous=null;
    if(raf!==null) cancelAnimationFrame(raf);
    raf=null;
    if(ready&&!document.hidden) raf=requestAnimationFrame(tick);
  });
  window.addEventListener('pagehide',()=>{if(raf!==null)cancelAnimationFrame(raf);raf=null;if(ready)reset();});
  window.addEventListener('pageshow',event=>{if(event.persisted)sync();});
  reduced.addEventListener('change',sync);
  Promise.all(['/images/night-archive/room-empty.webp','/images/night-archive/walk-approved-v4.webp'].map(async src=>{
    const image=new Image();image.src=src;await image.decode();
  })).then(()=>{loaded=true;sync();}).catch(()=>sync());
})();
