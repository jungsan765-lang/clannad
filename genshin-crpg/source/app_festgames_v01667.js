/* 0.16.67 축제 미니게임 (runtime_reading.js 0.16.67): 눈싸움 (눈꽃 축제), 윷놀이 (설날), 송편 빚기 (추석). Each plays in its own window over the
 * festival window and sends what was pressed; the engine plays the same game again from the same seed and counts it, and this page draws
 * every moment from the engine's own rules (CRPGRuntime.festivalV01667), so the score shown is the score kept.
 * window.CRPGFestGames.play(job, {name, foe, parent, finish(input) → result, quit()}). */
(function(){'use strict';
const K=window.CRPGRuntime?.festivalV01667;if(!K)return;
const W=640,H=400,TAU=Math.PI*2;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const btn=(label,fn,cls='')=>{const b=mk('button','fg-btn '+cls,label);b.type='button';b.onclick=fn;return b;};
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const SND=n=>{try{window.CRPGSound?.play?.(n);}catch{}};
const touch=()=>matchMedia('(hover:none)').matches||navigator.maxTouchPoints>0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),ease=u=>1-Math.pow(1-clamp(u,0,1),3);
const IMG={},pic=src=>{if(!src)return null;let i=IMG[src];if(!i){i=IMG[src]=new Image();i.decoding='async';i.src=src;}return i.complete&&i.naturalWidth?i:null;};
const faceSrc=(id,side='ALLY')=>{try{return typeof combatPortraitSrc==='function'?combatPortraitSrc({side,source:id}):null;}catch{return null;}};
const mapSrc=id=>{try{const m=(typeof MANIFEST!=='undefined'?MANIFEST:window.CRPG_MANIFEST||{}).maps?.[id];return m?.url||(m?.file_name&&typeof assetPath==='function'?assetPath(m.file_name):null)||null;}catch{return null;}};
function roundFace(ctx,src,x,y,r,ring='#fff'){
 ctx.save();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.closePath();ctx.fillStyle='#3b4459';ctx.fill();const i=pic(src);
 if(i){ctx.clip();const s=Math.min(i.naturalWidth,i.naturalHeight*.8);ctx.drawImage(i,(i.naturalWidth-s)/2,0,s,s,x-r,y-r,r*2,r*2);}
 ctx.restore();ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.lineWidth=3;ctx.strokeStyle=ring;ctx.stroke();
}
// ---------- the window every game shares ----------
function shell(job,opts,title){
 const wrap=mk('div','fg-overlay fg-'+job.game.toLowerCase());wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label',title);
 const box=mk('div','fg-box'),top=mk('div','fg-top'),score=mk('b','fg-score','0'),time=mk('span','fg-time',''),quit=btn('그만하기',()=>ui.quit(),'fg-quit');
 top.append(mk('strong','fg-title',title+' · '+job.day+'일째'),mk('span','fg-score-label','점수'),score,time,quit);
 const stage=mk('div','fg-stage'),canvas=mk('canvas','fg-canvas'),bar=mk('div','fg-bar'),panel=mk('div','fg-panel');panel.hidden=true;
 const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=W*dpr;canvas.height=H*dpr;const ctx=canvas.getContext('2d');ctx.scale(dpr,dpr);
 stage.append(canvas,panel);box.append(top,stage,bar);wrap.append(box);(opts.parent||document.body).append(wrap);requestAnimationFrame(()=>wrap.classList.add('open'));
 const ui={wrap,canvas,ctx,bar,panel,alive:true,score:n=>{score.textContent=fmt(n);},time:t=>{time.textContent=t;},
  pos(e){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};},
  destroy(){ui.alive=false;for(const f of ui.offs)try{f();}catch{}wrap.remove();},offs:[],
  on(target,ev,fn,o){target.addEventListener(ev,fn,o);ui.offs.push(()=>target.removeEventListener(ev,fn,o));},
  quit(){if(!ui.alive)return;ui.destroy();opts.quit?.();},
  // the end: what was pressed goes to the engine; its count comes back
  async send(input,words){
   ui.ended=true;panel.hidden=false;panel.replaceChildren(mk('strong','fg-panel-title','기록을 확인하는 중…'));quit.disabled=true;
   const out=await opts.finish(input);if(!ui.alive)return;quit.disabled=false;panel.replaceChildren();
   if(!out){panel.append(mk('strong','fg-panel-title','기록을 맞추지 못했습니다'),mk('p','',window.CRPGFestival?.msg||'다시 해 주세요.'),btn('닫기',()=>ui.quit(),'primary'));return;}
   const stars=mk('div','fg-stars');for(let i=1;i<=3;i++)stars.append(mk('i',i<=out.tier?'on':'',i<=out.tier?'★':'☆'));
   panel.append(mk('strong','fg-panel-title',words?.(out)||('점수 '+fmt(out.score))),stars,mk('p','',out.points?'축제 점수 +'+out.points+(out.primogem?' · 원석 +'+out.primogem:'')+' · 모두 '+fmt(out.total)+'점':out.tier?'이 날 받은 별보다 많지 않아 점수는 그대로입니다':'별을 받지 못했습니다'),mk('small','','이 날 최고 '+fmt(out.best)),btn('닫기',()=>ui.quit(),'primary'));
   SND(out.tier>=2?'reward':'menu_open');
  }};
 ui.on(wrap,'keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();ui.quit();}});
 return ui;
}
const countdown=(ui,start)=>{let n=3;const p=ui.panel;p.hidden=false;p.className='fg-panel count';const tick=()=>{if(!ui.alive)return;if(n===0){p.hidden=true;p.className='fg-panel';start();return;}p.replaceChildren(mk('strong','fg-count',String(n)));n--;setTimeout(tick,650);};tick();};
// ---------- 눈싸움 ----------
const SNOW_FACES=['MOND_AMBER','MOND_BENNETT','MOND_KAEYA','MOND_NOELLE','MOND_RAZOR','MOND_FISCHL','MOND_SUCROSE','MOND_DIONA'];
function snowball(job,opts){
 const S=K.snow,R=S.rules,plan=S.plan(job.seed,job.day),ui=shell(job,opts,opts.name||'눈싸움'),ctx=ui.ctx;
 const laneX=i=>W*(.14+i*.18),FORT=176,inputs=[{t:0,a:'s'}];let t0=0,hidden=false,lastThrow=-1e9,raf=0,shown=0,wall=0;
 const bg=mapSrc('MAP_MOND_CITY'),faces=plan.map((p,j)=>faceSrc(SNOW_FACES[(j*3+p.lane)%SNOW_FACES.length]));
 const now=()=>performance.now()-t0,playing=()=>t0&&!ui.ended;
 const hide=on=>{if(!playing()||on===hidden)return;const t=Math.min(R.ms,Math.round(now()));hidden=on;inputs.push({t,a:on?'h':'s'});hideBtn.classList.toggle('on',on);};
 const shoot=lane=>{if(!playing()||hidden)return;const t=Math.min(R.ms,Math.round(now())),sim=S.play(job.seed,job.day,inputs,t);if(t<sim.stun||t-lastThrow<R.cooldown)return;lastThrow=t;inputs.push({t,a:'t',lane});SND('menu_open');};
 const hideBtn=btn('숨기',()=>{},'fg-hide');hideBtn.title='누르고 있는 동안 눈 벽 뒤에 숨습니다 (스페이스)';
 ui.on(hideBtn,'pointerdown',e=>{e.preventDefault();hide(true);});for(const ev of ['pointerup','pointercancel','pointerleave'])ui.on(hideBtn,ev,()=>hide(false));
 const lanesRow=mk('div','fg-lanes');for(let i=0;i<R.lanes;i++)lanesRow.append(btn(String(i+1),()=>shoot(i),'fg-lane'));
 ui.bar.append(mk('span','fg-hint',touch()?'사람을 눌러 던지기 · 「숨기」를 누르고 있으면 숨기':'사람을 클릭하거나 1~5로 던지기 · 스페이스를 누르고 있으면 숨기'),lanesRow,hideBtn);
 ui.on(ui.canvas,'pointerdown',e=>{const p=ui.pos(e);if(p.y>320)return;let best=-1,d=1e9;for(let i=0;i<R.lanes;i++){const dx=Math.abs(p.x-laneX(i));if(dx<d){d=dx;best=i;}}if(d<62)shoot(best);});
 ui.on(document,'keydown',e=>{if(!ui.alive)return;if(e.key===' '||e.key==='s'||e.key==='S'||e.key==='ArrowDown'){e.preventDefault();hide(true);}else if(/^[1-5]$/.test(e.key))shoot(Number(e.key)-1);},true);
 ui.on(document,'keyup',e=>{if(e.key===' '||e.key==='s'||e.key==='S'||e.key==='ArrowDown')hide(false);},true);
 function mound(x,y,w,h,fill='#f4f8fc'){ctx.beginPath();ctx.moveTo(x-w/2,y+h/2);ctx.bezierCurveTo(x-w/2,y-h*.4,x-w*.2,y-h/2,x,y-h/2);ctx.bezierCurveTo(x+w*.2,y-h/2,x+w/2,y-h*.4,x+w/2,y+h/2);ctx.closePath();ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle='rgba(120,150,190,.45)';ctx.lineWidth=2;ctx.stroke();}
 function frame(){
  if(!ui.alive)return;const t=t0?Math.min(R.ms,now()):0,sim=t0?S.play(job.seed,job.day,inputs,t):{score:0,combo:0,stun:-1,flying:[],hitBy:plan.map(()=>null),log:[]};
  ui.score(sim.score);ui.time(t0?Math.ceil((R.ms-t)/1000)+'초':'');
  ctx.clearRect(0,0,W,H);const b=pic(bg);if(b){const s=Math.max(W/b.naturalWidth,H/b.naturalHeight);ctx.drawImage(b,(W-b.naturalWidth*s)/2,(H-b.naturalHeight*s)/2,b.naturalWidth*s,b.naturalHeight*s);}
  const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'rgba(214,232,250,.78)');sky.addColorStop(.55,'rgba(236,244,252,.86)');sky.addColorStop(1,'rgba(250,252,255,.95)');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
  // falling snow
  ctx.fillStyle='rgba(255,255,255,.9)';for(let i=0;i<46;i++){const x=(i*97+t*.02*(1+i%3))%W,y=(i*53+t*.05*(1+i%2))%H;ctx.beginPath();ctx.arc(x,y,1.2+(i%3)*.6,0,TAU);ctx.fill();}
  // who is up behind the forts
  plan.forEach((p,j)=>{const hit=sim.hitBy[j],gone=Math.min(p.down,hit??Infinity);if(t<p.up||t>gone+260)return;
   const rise=t<p.up+160?(t-p.up)/160:t>gone?1-(t-gone)/260:1,x=laneX(p.lane),y=FORT+18-46*clamp(rise,0,1);
   roundFace(ctx,faces[j],x,y,24,hit!==null&&t>=hit?'#9fd3ff':'#fff');
   if(hit!==null&&t>=hit&&t<hit+260){ctx.fillStyle='rgba(255,255,255,.85)';for(let k=0;k<9;k++){const a=k/9*TAU,r=10+(t-hit)*.12;ctx.beginPath();ctx.arc(x+Math.cos(a)*r,y+Math.sin(a)*r,4,0,TAU);ctx.fill();}}
   if(p.throwAt!==undefined&&(hit===null||hit>p.throwAt)&&t>=p.throwAt-520&&t<p.throwAt){ctx.fillStyle='#e8452f';ctx.beginPath();ctx.arc(x+22,y-26,13,0,TAU);ctx.fill();ctx.fillStyle='#fff';ctx.font='700 18px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('!',x+22,y-25);}
  });
  for(let i=0;i<R.lanes;i++)mound(laneX(i),FORT+28,96,44);
  // their throws coming in
  plan.forEach((p,j)=>{if(p.throwAt===undefined)return;const hit=sim.hitBy[j];if(hit!==null&&hit<=p.throwAt)return;const u=(t-p.throwAt)/R.incoming;if(u<0||u>1)return;
   const x=laneX(p.lane)+(W/2-laneX(p.lane))*u,y=FORT+(H-70-FORT)*u-Math.sin(u*Math.PI)*60,r=6+28*u*u;ctx.fillStyle='#fff';ctx.strokeStyle='rgba(110,140,180,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.stroke();});
  // ours flying out
  for(const f of sim.flying){const u=(t-f.from)/(f.at-f.from),x=W/2+(laneX(f.lane)-W/2)*u,y=H-40+(FORT-(H-40))*u-Math.sin(u*Math.PI)*80,r=14-8*u;ctx.fillStyle='#fff';ctx.strokeStyle='rgba(110,140,180,.7)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.stroke();}
  // numbers
  ctx.textAlign='center';ctx.textBaseline='middle';
  for(const e of sim.log){const age=t-e.t;if(age<0||age>700)continue;const a=1-age/700;
   if(e.k==='hit'){ctx.fillStyle='rgba(30,90,170,'+a+')';ctx.font='800 22px sans-serif';ctx.fillText('+'+e.n,laneX(e.lane),FORT-50-age*.04);if(e.combo>1){ctx.font='700 14px sans-serif';ctx.fillText(e.combo+'연속',laneX(e.lane),FORT-30-age*.04);}}
   if(e.k==='block'){ctx.fillStyle='rgba(60,120,80,'+a+')';ctx.font='700 16px sans-serif';ctx.fillText('피했다!',W/2,H-130);}}
  // our wall
  wall+=((hidden?1:0)-wall)*.35;const wy=H-34-wall*92;mound(W/2,wy+60,W*1.2,120,'#fbfdff');
  if(t<sim.stun){ctx.fillStyle='rgba(255,255,255,'+(.75*(sim.stun-t)/R.stun)+')';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(200,60,40,.9)';ctx.font='800 26px sans-serif';ctx.fillText('맞았다! -'+R.hurt,W/2,H/2);}
  if(hidden){ctx.fillStyle='rgba(40,60,90,.75)';ctx.font='700 16px sans-serif';ctx.fillText('숨는 중',W/2,H-24);}
  else if(t0&&!ui.ended&&t>=sim.stun&&t-lastThrow>=R.cooldown){ctx.fillStyle='rgba(40,60,90,.55)';ctx.font='600 13px sans-serif';ctx.fillText('던질 수 있음',W/2,H-20);}
  if(t0&&t>=R.ms&&!ui.ended){ui.send(inputs.slice(),o=>'맞힌 사람 '+(o.detail?.hits??0)+'명 · 점수 '+fmt(o.score));hide(false);}
  raf=requestAnimationFrame(frame);
 }
 ui.offs.push(()=>cancelAnimationFrame(raf));frame();countdown(ui,()=>{t0=performance.now();});
}
// ---------- 윷놀이 ----------
function yut(job,opts){
 const Y=K.yut,ui=shell(job,opts,opts.name||'윷놀이'),ctx=ui.ctx,g=Y.create(job.seed,job.day),decisions=[];
 const foe=opts.foe||Y.foes[job.day-1],mine=faceSrc('PLAYER_CUSTOM'),theirs=faceSrc(foe);
 const BX=24,BY=24,BS=352;
 // where each station sits on the board (0 = 참먹이, bottom right)
 const P={};for(let k=0;k<=4;k++){P[k]=[1,1-k/5];P[5+k]=[1-k/5,0];P[10+k]=[0,k/5];P[15+k]=[k/5,1];}P[20]=[5/6,1/6];P[21]=[4/6,2/6];P[22]=[.5,.5];P[23]=[2/6,4/6];P[24]=[1/6,5/6];P[25]=[1/6,1/6];P[26]=[2/6,2/6];P[27]=[4/6,4/6];P[28]=[5/6,5/6];
 const xy=st=>[BX+P[st][0]*BS,BY+P[st][1]*BS];
 let sel=0,msg='윷을 던지세요',sticks=null,anim=[],waitThrow=null,waitMove=null,raf=0;
 const throwBtn=btn('윷 던지기',()=>{if(waitThrow){const f=waitThrow;waitThrow=null;f();}},'primary fg-throw'),chips=mk('div','fg-chips');
 ui.bar.append(mk('span','fg-hint','윷을 던진 뒤, 빛나는 말을 누르세요'),chips,throwBtn);
 ui.on(document,'keydown',e=>{if(e.key===' '&&waitThrow){e.preventDefault();throwBtn.click();}},true);
 const wait=ms=>new Promise(r=>setTimeout(r,ms));
 const posOf=(side,i)=>{const p=g.pieces[side][i],st=Y.station(p);
  if(st==='HOME'){const n=g.pieces[side].slice(0,i).filter(q=>q.home).length;return [432+n*34,side?96:332];}
  if(st===-1){const n=g.pieces[side].slice(0,i).filter(q=>!q.home&&Y.station(q)===-1).length;return [432+n*34,side?52:288];}
  const [x,y]=xy(st),stack=g.pieces[side].filter((q,j)=>j<i&&!q.home&&Y.station(q)===st).length;return [x+stack*4+(side?8:-8),y-stack*4+(side?-8:8)];};
 function chipsDraw(){chips.replaceChildren();if(g.phase!=='MOVE'||g.turn!==0)return;g.throws.forEach((v,k)=>{const usable=Y.legal(g).some(m=>m.k===k),b=btn(Y.names[v],()=>{sel=k;chipsDraw();},'fg-chip'+(k===sel?' on':''));b.disabled=!usable;chips.append(b);});}
 function legalNow(){return g.phase==='MOVE'&&g.turn===0?Y.legal(g).filter(m=>m.k===sel):[];}
 ui.on(ui.canvas,'pointerdown',e=>{if(!waitMove)return;const p=ui.pos(e),moves=legalNow();let pick=null,d=1e9;
  for(const m of moves){const [x,y]=posOf(0,m.p),dd=Math.hypot(p.x-x,p.y-y);if(dd<d){d=dd;pick=m;}if(m.to!=='HOME'){const [tx,ty]=xy(m.to),d2=Math.hypot(p.x-tx,p.y-ty);if(d2<d){d=d2;pick=m;}}}
  if(pick&&d<30){const f=waitMove;waitMove=null;f([pick.k,pick.p]);}});
 function drawStick(x,y,flat,marked,rot){ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.fillStyle=flat?'#f3e2bf':'#9a6a3c';ctx.strokeStyle='#5b3a1c';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect?ctx.roundRect(-9,-38,18,76,8):ctx.rect(-9,-38,18,76);ctx.fill();ctx.stroke();
  if(flat){ctx.strokeStyle='#8b5a2b';ctx.lineWidth=1.6;for(const yy of [-22,0,22]){ctx.beginPath();ctx.moveTo(-5,yy-5);ctx.lineTo(5,yy+5);ctx.moveTo(5,yy-5);ctx.lineTo(-5,yy+5);ctx.stroke();}}
  if(marked){ctx.fillStyle='#c0392b';ctx.beginPath();ctx.arc(0,flat?30:-30,4,0,TAU);ctx.fill();}ctx.restore();}
 const facesFor=v=>{const flats=v===5?0:v===4?4:v===-1?1:v;return [0,1,2,3].map(i=>v===-1?i===0:v===1?i===1:i<flats);};
 function frame(){
  if(!ui.alive)return;const t=performance.now();ctx.clearRect(0,0,W,H);
  const bgG=ctx.createLinearGradient(0,0,W,H);bgG.addColorStop(0,'#3a1f1a');bgG.addColorStop(1,'#1d1420');ctx.fillStyle=bgG;ctx.fillRect(0,0,W,H);
  // the board: a cloth with the stations
  ctx.fillStyle='#f6ead0';ctx.strokeStyle='#8a5a2c';ctx.lineWidth=3;ctx.fillRect(BX-14,BY-14,BS+28,BS+28);ctx.strokeRect(BX-14,BY-14,BS+28,BS+28);
  ctx.strokeStyle='rgba(120,70,30,.55)';ctx.lineWidth=2;ctx.strokeRect(BX,BY,BS,BS);ctx.beginPath();ctx.moveTo(...xy(5));ctx.lineTo(...xy(15));ctx.moveTo(...xy(10));ctx.lineTo(BX+BS,BY+BS);ctx.stroke();
  const moves=legalNow(),targets=new Set(moves.map(m=>m.to));
  for(let st=0;st<=28;st++){const [x,y]=xy(st),big=[0,5,10,15,22].includes(st);ctx.beginPath();ctx.arc(x,y,big?13:8,0,TAU);ctx.fillStyle=targets.has(st)?'#ffd36b':big?'#c4472f':'#fff7e4';ctx.fill();ctx.strokeStyle='#8a5a2c';ctx.lineWidth=2;ctx.stroke();}
  ctx.fillStyle='#8a5a2c';ctx.font='700 11px sans-serif';ctx.textAlign='center';ctx.fillText('참먹이',BX+BS,BY+BS+28);
  // trays
  ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(412,30,212,90);ctx.fillRect(412,266,212,90);ctx.fillStyle='#e9dcc4';ctx.font='600 12px sans-serif';ctx.textAlign='left';
  ctx.fillText((typeof game!=='undefined'?(game.tables?.['07_CHAR_DB']?.get(foe)?.[1]||''):'')+' · 남은 말 / 난 말',418,22);ctx.fillText('나 · 남은 말 / 난 말',418,384);
  // pieces
  for(const side of [1,0])for(let i=0;i<g.n;i++){let [x,y]=posOf(side,i);const a=anim.find(q=>q.side===side&&q.i===i);if(a){const u=ease((t-a.at)/320);if(u<1){x=a.x+(x-a.x)*u;y=a.y+(y-a.y)*u-Math.sin(u*Math.PI)*28;}}
   const can=side===0&&moves.some(m=>m.p===i);roundFace(ctx,side?theirs:mine,x,y,13,can?'#ffd36b':side?'#e8705a':'#6fc3ff');
   if(can){ctx.beginPath();ctx.arc(x,y,17+Math.sin(t/160)*2,0,TAU);ctx.strokeStyle='rgba(255,211,107,.85)';ctx.lineWidth=2;ctx.stroke();}}
  // the sticks and what came out
  if(sticks){const u=clamp((t-sticks.at)/650,0,1);sticks.faces.forEach((f,i)=>drawStick(470+i*40,190,u<1?(Math.floor(t/90+i)%2===0):f,i===0,u<1?Math.sin(t/60+i)*.6:(i-1.5)*.08));
   if(u>=1){ctx.fillStyle=sticks.side?'#ffb3a2':'#bfe4ff';ctx.font='800 28px sans-serif';ctx.textAlign='center';ctx.fillText(Y.names[sticks.v]+'!',520,252);}}
  ctx.fillStyle='#f4e8d2';ctx.font='700 15px sans-serif';ctx.textAlign='center';ctx.fillText(msg,520,142);
  raf=requestAnimationFrame(frame);
 }
 ui.offs.push(()=>cancelAnimationFrame(raf));frame();
 const snapshot=side=>g.pieces[side].map((p,i)=>{const [x,y]=posOf(side,i);return {side,i,x,y};});
 async function show(entries,side){for(const v of entries){if(!ui.alive)return;sticks={v,faces:facesFor(v),at:performance.now(),side};SND('menu_open');await wait(1000);}}
 async function moveWith(side,k,p){const before=snapshot(0).concat(snapshot(1)),caughtBefore=g.pieces[1-side].filter(q=>Y.station(q)!==-1&&!q.home).length;Y.play(g,k,p);const at=performance.now();anim=before.map(b=>({...b,at}));
  const caught=caughtBefore-g.pieces[1-side].filter(q=>Y.station(q)!==-1&&!q.home).length;if(caught>0){msg=(side?'잡혔다!':'잡았다! 한 번 더');SND(side?'hit':'reward');}await wait(520);}
 (async()=>{
  ui.score(0);
  for(let guard=0;guard<3000&&ui.alive&&g.phase!=='DONE';guard++){
   ui.score(g.pieces[0].filter(q=>q.home).length*200);ui.time((g.turn?'상대':'내')+' 차례');
   if(g.phase==='THROW'){
    if(g.turn===0){msg=g.extra?'한 번 더 던지세요':'윷을 던지세요';g.extra=false;throwBtn.disabled=false;await new Promise(r=>{waitThrow=r;});throwBtn.disabled=true;}else{msg='상대가 던지는 중';await wait(700);}
    const before=g.log.length,side=g.turn;Y.roll(g);const thrown=g.log.slice(before).filter(x=>x.throw!==undefined).map(x=>x.throw);await show(thrown,side);
    if(g.phase==='THROW'&&g.turn!==side)msg=side?'상대가 움직일 말이 없습니다':'움직일 말이 없습니다';
    sel=0;chipsDraw();continue;
   }
   if(g.turn===1){msg='상대 차례';await wait(500);const m=Y.bot(g);if(!m){g.throws=[];Y.settle(g);continue;}await moveWith(1,m.k,m.p);continue;}
   // our move
   const usable=[...new Set(Y.legal(g).map(m=>m.k))];if(!usable.includes(sel))sel=usable[0]??0;chipsDraw();msg=g.throws.length>1?'쓸 윷을 고르고 말을 누르세요':'움직일 말을 누르세요';
   const d=await new Promise(r=>{waitMove=r;});if(!ui.alive)return;decisions.push(d);chips.replaceChildren();await moveWith(0,d[0],d[1]);
  }
  if(!ui.alive)return;msg=g.winner===0?'이겼다!':'졌다…';chips.replaceChildren();throwBtn.disabled=true;await wait(900);
  ui.send(decisions.slice(),o=>(o.detail?.won?'이겼습니다!':'졌습니다')+' · 난 말 '+(o.detail?.home??0)+'개');
 })();
}
// ---------- 송편 빚기 ----------
const STEPS=['떼기','소 넣기','빚기'];
function songpyeon(job,opts){
 const S=K.song,R=S.rules,plan=S.plan(job.seed,job.day),ui=shell(job,opts,opts.name||'송편 빚기'),ctx=ui.ctx,presses=[],marks=[];
 let t0=0,k=0,start=R.start,raf=0,pop=null,score=0;const now=()=>performance.now()-t0;
 const press=()=>{if(!t0||ui.ended||k>=plan.length)return;const t=now();if(t<start)return;const s=plan[k],limit=start+3*s.period,at=Math.max(start,Math.round(t));
  if(at>limit){timeout();return;}const pos=S.tri((at-start)/s.period),off=Math.abs(pos-s.zone),m=off<=s.w*.45?2:off<=s.w?1:0;
  presses.push(at);marks.push(m);score+=m===2?R.perfect:m===1?R.good:0;pop={m,at:t};start=at+R.pause;k++;SND(m?'menu_open':'hit');};
 const timeout=()=>{const s=plan[k],limit=start+3*s.period;presses.push(null);marks.push(0);pop={m:0,at:now()};start=limit+R.pause;k++;};
 const go=btn('누르기',press,'primary fg-press');ui.bar.append(mk('span','fg-hint',touch()?'금빛 칸에 올 때 화면이나 「누르기」를 누르세요':'금빛 칸에 올 때 클릭하거나 스페이스'),go);
 ui.on(ui.canvas,'pointerdown',e=>{e.preventDefault();press();});ui.on(document,'keydown',e=>{if(e.key===' '||e.key==='Enter'){e.preventDefault();press();}},true);
 const bg=mapSrc('MAP_LY_DETAIL_CHIHU')||mapSrc('MAP_LIYUE_HARBOR');
 function cake(x,y,stage,q,r=34){// a songpyeon by its step: dough, with filling, folded half moon (cracked when poorly made)
  ctx.save();ctx.translate(x,y);ctx.fillStyle=q===2?'#fff4dc':q===1?'#f1ecdf':'#e7dccb';ctx.strokeStyle='rgba(140,110,70,.6)';ctx.lineWidth=2;
  if(stage<2){ctx.beginPath();ctx.ellipse(0,0,r,r*.82,0,0,TAU);ctx.fill();ctx.stroke();if(stage===1){ctx.fillStyle='#6b4a2b';ctx.beginPath();ctx.ellipse(0,-2,r*.35,r*.25,0,0,TAU);ctx.fill();}}
  else{ctx.beginPath();ctx.moveTo(-r,r*.25);ctx.quadraticCurveTo(0,-r*1.05,r,r*.25);ctx.quadraticCurveTo(0,r*.55,-r,r*.25);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='rgba(140,110,70,.45)';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*r*.3,-r*.35+Math.abs(i)*r*.12);ctx.lineTo(i*r*.3+3,-r*.15+Math.abs(i)*r*.12);ctx.stroke();}
   if(q===0){ctx.strokeStyle='#6b4a2b';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(-r*.2,-r*.2);ctx.lineTo(0,0);ctx.lineTo(r*.15,-r*.25);ctx.stroke();}}
  ctx.restore();}
 function frame(){
  if(!ui.alive)return;const t=t0?now():0;if(t0&&!ui.ended&&k<plan.length&&t>start+3*plan[k].period)timeout();
  ui.score(score);ui.time(Math.min(k+1,R.count*3)>0?Math.min(R.count,Math.floor(k/3)+1)+' / '+R.count+'개':'');
  ctx.clearRect(0,0,W,H);const b=pic(bg);if(b){const s=Math.max(W/b.naturalWidth,H/b.naturalHeight);ctx.drawImage(b,(W-b.naturalWidth*s)/2,(H-b.naturalHeight*s)/2,b.naturalWidth*s,b.naturalHeight*s);}
  ctx.fillStyle='rgba(30,22,16,.62)';ctx.fillRect(0,0,W,H);
  // the full moon, and the songpyeon made so far
  const moon=ctx.createRadialGradient(560,70,6,560,70,60);moon.addColorStop(0,'rgba(255,246,206,1)');moon.addColorStop(.6,'rgba(255,232,160,.9)');moon.addColorStop(1,'rgba(255,232,160,0)');ctx.fillStyle=moon;ctx.beginPath();ctx.arc(560,70,60,0,TAU);ctx.fill();
  for(let i=0;i<R.count;i++){const m=marks.slice(i*3,i*3+3);const done=m.length===3,sum=m.reduce((n,x)=>n+(x===2?100:x===1?60:0),0);ctx.globalAlpha=done?1:.25;cake(56+i*58,46,2,done?(sum>=270?2:sum>=150?1:0):1,18);ctx.globalAlpha=1;}
  // plate and the one in hand
  ctx.fillStyle='rgba(255,255,255,.12)';ctx.beginPath();ctx.ellipse(W/2,196,120,46,0,0,TAU);ctx.fill();
  const step=k%3;if(k<plan.length)cake(W/2,180,step,1,46);
  ctx.fillStyle='#f6e9cf';ctx.font='800 20px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';if(k<plan.length)ctx.fillText((Math.floor(k/3)+1)+'번째 · '+STEPS[step],W/2,104);
  // the bar
  const bx=100,bw=440,by=300;ctx.fillStyle='rgba(255,255,255,.14)';ctx.fillRect(bx,by-14,bw,28);
  if(k<plan.length){const s=plan[k];ctx.fillStyle='rgba(255,208,96,.45)';ctx.fillRect(bx+(s.zone-s.w)*bw,by-14,s.w*2*bw,28);ctx.fillStyle='rgba(255,226,140,.95)';ctx.fillRect(bx+(s.zone-s.w*.45)*bw,by-14,s.w*.9*bw,28);
   const live=t0&&t>=start,pos=live?S.tri((t-start)/s.period):0,mx=bx+pos*bw;ctx.fillStyle=live?'#ffffff':'rgba(255,255,255,.35)';ctx.beginPath();ctx.moveTo(mx,by-20);ctx.lineTo(mx-9,by-34);ctx.lineTo(mx+9,by-34);ctx.closePath();ctx.fill();ctx.fillRect(mx-2,by-16,4,32);}
  if(pop&&t-pop.at<650){const a=1-(t-pop.at)/650;ctx.fillStyle=pop.m===2?'rgba(255,214,102,'+a+')':pop.m===1?'rgba(190,230,255,'+a+')':'rgba(255,150,130,'+a+')';ctx.font='800 26px sans-serif';ctx.fillText(pop.m===2?'완벽!':pop.m===1?'좋아요':'아쉬워요',W/2,250-(t-pop.at)*.03);}
  if(t0&&k>=plan.length&&!ui.ended&&t>=start-R.pause+200){const pretty=[];for(let i=0;i<R.count;i++){const sum=marks.slice(i*3,i*3+3).reduce((n,x)=>n+(x===2?100:x===1?60:0),0);pretty.push(sum>=270);}ui.send(presses.slice(),o=>'예쁜 송편 '+(o.detail?.pretty?.filter(x=>x===2).length??pretty.filter(Boolean).length)+'개 · 점수 '+fmt(o.score));}
  raf=requestAnimationFrame(frame);
 }
 ui.offs.push(()=>cancelAnimationFrame(raf));frame();countdown(ui,()=>{t0=performance.now();});
}
window.CRPGFestGames={play(job,opts={}){if(!job||!K)return;if(job.game==='SNOWBALL')return snowball(job,opts);if(job.game==='YUT')return yut(job,opts);if(job.game==='SONGPYEON')return songpyeon(job,opts);}};
})();
