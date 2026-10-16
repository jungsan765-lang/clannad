'use strict';
// 0.16.46 조작하는 보스 (user, 2026-10-15): 「무상의 바람은 좀 컨트롤적인 요소를 추가해서 wasd로 움직이는 언더테일 느낌으로 공격을 피하면서
// 바람원소 먹는 그런거. 맞을때마다 전체데미지 받고 이런거. 폰 전용 키도 좀 만들어서」, 「고증에 맞춰서 미니게임같은거 꽤 난이도 있게」,
// 「일일보스도 마찬가지」. The rules live in runtime_field_bosses.js (fbMiniCards): each minigame is one protagonist action. This page
// plays it when that action is run and sends what happened with the same COMBAT action ({mini:{kind,id,hits,orbs}}); the rules
// clamp it. The pattern comes from the fight's own seed, so a fight shows the same barrage on every device.
(function(){
const CARDS=new Set(['SYS_FB_SERPENT_SNIPE','SYS_FB_FROST_FRUIT','SYS_FB_WIND_ORBS','SYS_FB_WIND_DODGE','SYS_FB_CRYO_CHASE','SYS_FB_DVALIN_SNIPE','SYS_FB_ANDRIUS_DODGE','SYS_FB_TARTAGLIA_DODGE','SYS_FB_AZHDAHA_DODGE']);
const W=640,H=400,TAU=Math.PI*2;
const rng=seed=>{let a=(Number(seed)>>>0)||1;return()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};};
const SND=n=>{try{window.CRPGSound?.play?.(n);}catch{}};
const touchDevice=()=>matchMedia('(hover:none)').matches||navigator.maxTouchPoints>0;
const KIND={
 SERPENT_SNIPE:{title:'약점 저격',chips:m=>[touchDevice()?'약점을 눌러 쏘기':'약점을 클릭해 쏘기','탄 '+m.shots+'발','모래가 솟는 동안은 숨음','약점 '+m.points+'곳 · 둘이면 갑주가 열림'],color:'#f2d36b',move:false},
 FROST_FRUIT:{title:'서리 열매 치기',chips:m=>[touchDevice()?'열매를 눌러 날리기':'열매를 클릭해 날리기','안쪽 얼음 조각에 막히면 깨짐','한기 파동이 지나가면 손이 얼어붙음','보호막에 '+m.need+'번 · 열매 '+m.shots+'개'],color:'#a8e4ff',move:false},
 ANEMO_ORBS:{title:'바람 원소 모으기',chips:m=>[touchDevice()?'방향 버튼 · 끌기로 이동':'WASD · 방향키로 이동','바람 원소 '+m.orbs+'개 모으기 · 보스는 무적','기류를 타면 빠름 · 흐름대로 밀림','탄환·본체에 닿으면 파티 전원 피해','못 주운 원소는 보스가 흡수'],color:'#74e0c6',move:true},
 ANEMO_DODGE:{title:'바람 탄막 피하기',chips:m=>[touchDevice()?'방향 버튼 · 끌기로 이동':'WASD · 방향키로 이동','탄환에 맞으면 파티 전원 피해','바람 원소 '+m.orbs+'개 · 원소폭발 충전'],color:'#74e0c6',move:true},
 // 0.16.54: 타르탈리아's attack follows his phase (m.phase 1 물 화살비 · 2 뇌전 창 · 3 극악기·진멸; none: a fight saved before).
 TARTAGLIA_DODGE:{title:m=>m.phase===1?'물 화살비 피하기':m.phase===2?'뇌전 창 피하기':'진멸 피하기',chips:m=>[touchDevice()?'방향 버튼 · 끌기로 이동':'WASD · 방향키로 이동',m.phase===1?'쏟아지는 물 화살 · 겨눈 물 화살':m.phase===2?'빛나는 줄의 번개 창 · 번개 돌진':'물 칼날 · 빛나는 줄의 번개 창','한 발도 안 맞으면 빈틈'],color:'#7fd4ff',move:true},
 AZHDAHA_DODGE:{title:'충격파 넘기',chips:()=>[touchDevice()?'방향 버튼 · 끌기로 이동':'WASD · 방향키로 이동','충격파의 틈으로 빠져나가기','그림자 진 곳에 운석','한 발도 안 맞으면 빈틈'],color:'#f0c46a',move:true},
 ANDRIUS_DODGE:{title:'질주 피하기',chips:()=>[touchDevice()?'방향 버튼 · 끌기로 이동':'WASD · 방향키로 이동','빛나는 길로 늑대가 달려든다','한 발도 안 맞으면 빈틈'],color:'#9fd8ef',move:true},
 CRYO_CHASE:{title:'냉기 핵 쫓기',chips:m=>[touchDevice()?'핵을 눌러 맞히기':'핵을 클릭해 맞히기','가까이 가면 달아나고 순간이동','얼음 가시를 누르면 잠시 얼어붙음','부서질 때까지 '+m.need+'번'],color:'#a8e4ff',move:false},
 DVALIN_SNIPE:{title:'부식 결정 저격',chips:m=>[touchDevice()?'결정을 눌러 쏘기':'결정을 클릭해 쏘기','탄 '+m.shots+'발','폭풍이 불 때 쏘면 빗나감','결정 '+m.crystals+'개'],color:'#c58cff',move:false}};
let running=null;

const css=`.fb-mini{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(3,7,9,.84)}
.fb-mini-box{display:flex;flex-direction:column;gap:10px;padding:14px 16px 16px;border:1px solid rgba(227,195,138,.45);border-radius:14px;background:linear-gradient(#142229,#0b1418);box-shadow:0 0 60px rgba(0,0,0,.6)}
.fb-mini-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;max-width:860px}.fb-mini-head strong{font-size:1.15rem;color:#f3dfb5;margin-right:4px}
.fb-mini-head span{padding:3px 9px;border-radius:6px;background:rgba(227,195,138,.12);border:1px solid rgba(227,195,138,.25);font-size:.85rem;color:#e8dcc3;white-space:nowrap}
.fb-mini-play{display:flex;gap:14px;align-items:center;justify-content:center}.fb-mini canvas{display:block;width:${W}px;height:${H}px;border-radius:10px;background:#071015;touch-action:none;cursor:crosshair}
.fb-mini-hud{display:flex;gap:12px;align-items:center;font-size:.95rem;color:#e8dcc3}.fb-mini-hud b{color:#fff}.fb-mini-time{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}.fb-mini-time i{display:block;height:100%;width:100%;background:var(--fb-mini,#74e0c6);transform-origin:left}
.fb-mini-pad{display:grid;grid-template-columns:repeat(3,58px);grid-template-rows:repeat(3,58px);gap:6px}.fb-mini-pad button{width:58px;height:58px;padding:0;border-radius:12px;font-size:1.4rem;touch-action:none;user-select:none}
.fb-mini-pad button:nth-child(1){grid-column:2;grid-row:1}.fb-mini-pad button:nth-child(2){grid-column:1;grid-row:2}.fb-mini-pad button:nth-child(3){grid-column:3;grid-row:2}.fb-mini-pad button:nth-child(4){grid-column:2;grid-row:3}
.fb-mini-actions{display:flex;gap:10px;justify-content:center}.fb-mini-actions button{min-width:150px;justify-content:center;text-align:center}
.battle-card-choice button.fb-mini-card{border-color:#74e0c6;box-shadow:0 0 0 1px rgba(116,224,198,.5),0 0 14px rgba(116,224,198,.35)}`;
const style=document.createElement('style');style.textContent=css;document.head.append(style);

// ---- the window --------------------------------------------------------------------------------------------
function open(card,done){
 const m=card.mini,k=KIND[m.kind];if(!k)return done(null);const title=typeof k.title==='function'?k.title(m):k.title;
 const wrap=el('div','fb-mini'),box=el('div','fb-mini-box');wrap.dataset.mini=m.kind;wrap.style.setProperty('--fb-mini',k.color);wrap.setAttribute('role','dialog');wrap.setAttribute('aria-label',title);
 const head=el('div','fb-mini-head');head.append(el('strong','',title));for(const c of k.chips(m))head.append(el('span','',c));
 const play=el('div','fb-mini-play'),canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;play.append(canvas);
 const hud=el('div','fb-mini-hud'),time=el('div','fb-mini-time'),bar=document.createElement('i');time.append(bar);const score=el('span','');hud.append(score,time);
 const actions=el('div','fb-mini-actions'),start=button('시작',()=>begin(),false,true),back=button('돌아가기',()=>close(null));actions.append(start,back);
 let pad=null;if(k.move&&touchDevice()){pad=el('div','fb-mini-pad');for(const [label,dx,dy] of [['▲',0,-1],['◀',-1,0],['▶',1,0],['▼',0,1]]){const b=button(label,()=>{});b.setAttribute('aria-label',{'▲':'위','◀':'왼쪽','▶':'오른쪽','▼':'아래'}[label]);
   const on=e=>{e.preventDefault();if(dx)input.pad[0]=dx;if(dy)input.pad[1]=dy;},off=e=>{e.preventDefault();if(dx&&input.pad[0]===dx)input.pad[0]=0;if(dy&&input.pad[1]===dy)input.pad[1]=0;};
   b.addEventListener('pointerdown',on);b.addEventListener('pointerup',off);b.addEventListener('pointerleave',off);b.addEventListener('pointercancel',off);pad.append(b);}play.append(pad);}
 box.append(head,play,hud,actions);wrap.append(box);document.body.append(wrap);
 const ctx=canvas.getContext('2d'),input={keys:new Set(),pad:[0,0],point:null,down:false,taps:[]};
 const g=GAMES[m.kind](m,rng(m.seed));let phase='INTRO',t0=0,last=0,elapsed=0,raf=0,count=3,finished=null;
 const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};};
 canvas.addEventListener('pointerdown',e=>{e.preventDefault();input.point=pos(e);input.down=true;if(phase==='PLAY')input.taps.push(input.point);});
 canvas.addEventListener('pointermove',e=>{input.point=pos(e);});
 const up=()=>{input.down=false;};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',()=>{input.down=false;if(!touchDevice())input.point=null;});
 const KEYS={ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D',ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R'};
 const keydown=e=>{if(!running)return;e.stopPropagation();if(KEYS[e.code]){e.preventDefault();input.keys.add(KEYS[e.code]);}else if(phase==='INTRO'&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();begin();}else if(phase==='INTRO'&&e.code==='Escape'){e.preventDefault();close(null);}else e.preventDefault();};
 const keyup=e=>{if(!running)return;e.stopPropagation();if(KEYS[e.code])input.keys.delete(KEYS[e.code]);};
 window.addEventListener('keydown',keydown,true);window.addEventListener('keyup',keyup,true);
 running={kind:m.kind,close:()=>close(null)};
 function begin(){if(phase!=='INTRO')return;phase='COUNT';SND('click');actions.remove();t0=performance.now();last=t0;raf=requestAnimationFrame(frame);}
 function close(result){cancelAnimationFrame(raf);window.removeEventListener('keydown',keydown,true);window.removeEventListener('keyup',keyup,true);wrap.remove();running=null;done(result);}
 function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(phase==='COUNT'){const left=3-(now-t0)/1000;count=Math.ceil(left);if(left<=0){phase='PLAY';elapsed=0;}}
  else if(phase==='PLAY'&&!document.hidden){elapsed+=dt;g.update(dt,elapsed,input);input.taps.length=0;if(elapsed>=m.seconds||g.over()){phase='END';finished=now;SND('notice');}}
  ctx.clearRect(0,0,W,H);g.draw(ctx,elapsed,phase);
  if(phase==='COUNT'){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 96px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(Math.max(1,count)),W/2,H/2);}
  if(phase==='END'){ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 40px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(g.summary(),W/2,H/2);}
  bar.style.transform='scaleX('+Math.max(0,1-(phase==='PLAY'||phase==='END'?elapsed/m.seconds:0))+')';score.textContent=g.hud();
  if(phase==='END'&&now-finished>1100){close({kind:m.kind,id:m.id,...g.result()});return;}
  raf=requestAnimationFrame(frame);}
 g.draw(ctx,0,'INTRO');score.textContent=g.hud();start.focus();
}

// ---- shared drawing ------------------------------------------------------------------------------------------
const glow=(ctx,x,y,r,color,a=1)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.globalAlpha=1;};
const dot=(ctx,x,y,r,fill,stroke)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}};
const heart=(ctx,x,y,blink)=>{if(blink)return;ctx.save();ctx.translate(x,y);ctx.fillStyle='#fff6d8';ctx.shadowColor='#ffe08a';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(7,0);ctx.lineTo(0,8);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.restore();};
const ARENA={x:24,y:24,w:W-48,h:H-48};
const arena=(ctx,color)=>{ctx.fillStyle='#071015';ctx.fillRect(0,0,W,H);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(ARENA.x,ARENA.y,ARENA.w,ARENA.h);};

// A shockwave ring grows from its centre; its gap is the way through.
const angGap=(a,b)=>{let d=Math.abs(a-b)%TAU;return d>Math.PI?TAU-d:d;};
const ringHit=(b,P)=>{const d=Math.hypot(P.x-b.cx,P.y-b.cy);return Math.abs(d-b.R)<b.thick/2+5&&angGap(Math.atan2(P.y-b.cy,P.x-b.cx),b.gap)>b.gapW/2;};
const drawRing=(ctx,b)=>{if(b.R<=0)return;ctx.save();ctx.strokeStyle=b.color||'#f0c46a';ctx.shadowColor=b.color||'#f0c46a';ctx.shadowBlur=14;ctx.lineWidth=b.thick;ctx.beginPath();ctx.arc(b.cx,b.cy,b.R,b.gap+b.gapW/2,b.gap-b.gapW/2+TAU);ctx.stroke();ctx.restore();};
// ---- the dodge games (바람 탄막 · 질주) -------------------------------------------------------------------------
function dodge(m,r,patterns,opts){
 const P={x:W/2,y:H-80},bullets=[],orbs=[],warn=[];let hits=0,taken=0,inv=0,next=0,step=0,shake=0;
 const orbTimes=opts.orbs?[1.1,2.9,4.7,6.4,8.1].slice(0,m.orbs):[];
 const api={P,bullets,warn,r,add:b=>bullets.push({r:6,life:0,ttl:6,...b})};
 return{
  update(dt,t,inp){
   let dx=(inp.keys.has('R')?1:0)-(inp.keys.has('L')?1:0)+inp.pad[0],dy=(inp.keys.has('D')?1:0)-(inp.keys.has('U')?1:0)+inp.pad[1];
   const sp=235;if(dx||dy){const n=Math.hypot(dx,dy);P.x+=dx/n*sp*dt;P.y+=dy/n*sp*dt;}
   else if(inp.down&&inp.point){const ex=inp.point.x-P.x,ey=inp.point.y-P.y,d=Math.hypot(ex,ey);if(d>2){const s=Math.min(d,300*dt);P.x+=ex/d*s;P.y+=ey/d*s;}}
   P.x=Math.max(ARENA.x+8,Math.min(ARENA.x+ARENA.w-8,P.x));P.y=Math.max(ARENA.y+8,Math.min(ARENA.y+ARENA.h-8,P.y));
   while(t>=next){const p=patterns[step%patterns.length];next+=p(api,t,step);step++;}
   const ramp=1+Math.max(0,t-m.seconds*.55)*.07;
   for(const b of bullets){b.life+=dt;if(b.delay&&b.life<b.delay)continue;if(b.ring){b.R=b.r0+b.speed*ramp*(b.life-(b.delay||0));continue;}b.x+=b.vx*dt*ramp;b.y+=b.vy*dt*ramp;if(b.ax){b.vx+=b.ax*dt;b.vy+=b.ay*dt;}}
   for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];if(b.life>b.ttl||b.ring&&b.R>900||!b.ring&&(b.x<-80||b.x>W+80||b.y<-80||b.y>H+80))bullets.splice(i,1);}
   for(let i=warn.length-1;i>=0;i--){warn[i].life+=dt;if(warn[i].life>warn[i].ttl)warn.splice(i,1);}
   inv=Math.max(0,inv-dt);shake=Math.max(0,shake-dt);
   if(!inv)for(const b of bullets){if(b.delay&&b.life<b.delay)continue;const hit=b.ring?ringHit(b,P):b.rect?Math.abs(P.x-b.x)<b.w/2+5&&Math.abs(P.y-b.y)<b.h/2+5:Math.hypot(P.x-b.x,P.y-b.y)<b.r+5;if(hit){hits++;inv=.85;shake=.25;SND('error');break;}}
   while(orbTimes.length&&t>=orbTimes[0]){orbTimes.shift();let x,y,tries=0;do{x=ARENA.x+40+r()*(ARENA.w-80);y=ARENA.y+40+r()*(ARENA.h-80);}while(Math.hypot(x-P.x,y-P.y)<140&&++tries<20);orbs.push({x,y,life:0});}
   for(let i=orbs.length-1;i>=0;i--){const o=orbs[i];o.life+=dt;if(Math.hypot(P.x-o.x,P.y-o.y)<17){taken++;orbs.splice(i,1);SND('puzzle_step');}else if(o.life>2.6)orbs.splice(i,1);}
  },
  over:()=>false,
  draw(ctx,t,phase){ctx.save();if(shake)ctx.translate((Math.random()-.5)*8,(Math.random()-.5)*8);arena(ctx,opts.color);opts.backdrop?.(ctx,t);
   for(const w of warn){const a=.25+.35*Math.abs(Math.sin(w.life*18));ctx.fillStyle=w.color||'rgba(255,90,90,'+a+')';ctx.globalAlpha=a;if(w.rect)ctx.fillRect(w.x-w.w/2,w.y-w.h/2,w.w,w.h);else{ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,TAU);ctx.fill();}ctx.globalAlpha=1;}
   for(const o of orbs){const pulse=1+Math.sin(o.life*8)*.15;glow(ctx,o.x,o.y,22*pulse,'rgba(116,224,198,.9)');dot(ctx,o.x,o.y,7*pulse,'#d6fff4');}
   for(const b of bullets){if(b.delay&&b.life<b.delay)continue;if(b.ring){drawRing(ctx,b);continue;}if(b.rect){ctx.fillStyle=b.color||'#cfefff';ctx.shadowColor=b.color||'#cfefff';ctx.shadowBlur=12;ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);ctx.shadowBlur=0;}else{glow(ctx,b.x,b.y,b.r*2.2,b.glow||'rgba(116,224,198,.55)');dot(ctx,b.x,b.y,b.r,b.color||'#e9fffa');}}
   heart(ctx,P.x,P.y,inv&&Math.floor(inv*14)%2===0);ctx.restore();},
  hud:()=>'맞음 '+Math.min(hits,m.maxHits)+'/'+m.maxHits+(opts.orbs?' · 바람 원소 '+taken+'/'+m.orbs:''),
  summary:()=>(hits?Math.min(hits,m.maxHits)+'발 맞음':'완벽 회피')+(opts.orbs?' · 바람 원소 '+taken:''),
  result:()=>({hits:Math.min(hits,m.maxHits),...(opts.orbs?{orbs:taken}:{})})};
}
// 무상의 바람: the cube hangs above the box and throws rings, spirals, wind walls and aimed shots (원작: 탄막·돌풍 탄환).
const cube=t=>({x:W/2+Math.sin(t*.9)*180,y:52});
const ANEMO_PATTERNS=[
 (A,t)=>{const c=cube(t),n=14+Math.floor(A.r()*4),o=A.r()*TAU,s=150+A.r()*30;for(let i=0;i<n;i++){const a=o+i*TAU/n;A.add({x:c.x,y:c.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s});}return .95;},
 (A,t)=>{const side=A.r()<.5?-1:1,gap=ARENA.y+40+A.r()*(ARENA.h-120);for(let y=ARENA.y+12;y<ARENA.y+ARENA.h;y+=26)if(Math.abs(y-gap)>40)A.add({x:side<0?-10:W+10,y,vx:-side*230,vy:0,r:7});return 1.05;},
 (A,t)=>{const c=cube(t),o=A.r()*TAU,dir=A.r()<.5?-1:1;for(let i=0;i<22;i++){const a=o+dir*i*.42;A.add({x:c.x,y:c.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,delay:i*.05,r:5});}return 1.25;},
 (A,t)=>{const c=cube(t);for(let k=0;k<3;k++){const a=Math.atan2(A.P.y-c.y,A.P.x-c.x)+(k-1)*.22;A.add({x:c.x,y:c.y,vx:Math.cos(a)*240,vy:Math.sin(a)*240,r:7,delay:k*.12,color:'#fff',glow:'rgba(255,255,255,.5)'});}return .8;},
 (A,t)=>{const gap=ARENA.x+60+A.r()*(ARENA.w-120);for(let x=ARENA.x+14;x<ARENA.x+ARENA.w;x+=28)if(Math.abs(x-gap)>44)A.add({x,y:-10,vx:0,vy:200,r:7});return 1.05;}];
const anemoBackdrop=(ctx,t)=>{const c=cube(t);ctx.save();ctx.translate(c.x,c.y);ctx.rotate(t*1.4);glow(ctx,0,0,46,'rgba(116,224,198,.5)');ctx.strokeStyle='#bff7e8';ctx.lineWidth=2;ctx.strokeRect(-16,-16,32,32);ctx.rotate(.8);ctx.strokeRect(-11,-11,22,22);ctx.restore();};
// 안드리우스: the wolf runs down a lane that glows first, and ice claws fall where their shadow shows (원작: 2페이즈 질주·얼음 발톱).
const ANDRIUS_PATTERNS=[
 (A,t)=>{const horiz=A.r()<.55,lanes=A.r()<.35?2:1;for(let k=0;k<lanes;k++){if(horiz){const y=ARENA.y+40+A.r()*(ARENA.h-80),dir=A.r()<.5?-1:1;A.warn.push({rect:true,x:W/2,y,w:ARENA.w,h:54,life:0,ttl:.7,color:'rgba(159,216,239,.55)'});A.add({rect:true,w:90,h:46,x:dir<0?W+60:-60,y,vx:dir<0?-950:950,vy:0,delay:.7,ttl:2,color:'#d9f3ff'});}
   else{const x=ARENA.x+40+A.r()*(ARENA.w-80),dir=A.r()<.5?-1:1;A.warn.push({rect:true,x,y:H/2,w:54,h:ARENA.h,life:0,ttl:.7,color:'rgba(159,216,239,.55)'});A.add({rect:true,w:46,h:90,x,y:dir<0?H+60:-60,vx:0,vy:dir<0?-850:850,delay:.7,ttl:2,color:'#d9f3ff'});}}return 1.0;},
 (A,t)=>{const n=3+Math.floor(A.r()*3);for(let i=0;i<n;i++){const x=i===0?A.P.x:ARENA.x+40+A.r()*(ARENA.w-80),y=i===0?A.P.y:ARENA.y+40+A.r()*(ARENA.h-80);A.warn.push({x,y,r:34,life:0,ttl:.8,color:'rgba(120,180,220,.6)'});A.add({x,y,vx:0,vy:0,r:30,delay:.8,ttl:1.15,color:'#e6f7ff',glow:'rgba(159,216,239,.7)'});}return 1.2;},
 (A,t)=>{const side=Math.floor(A.r()*4),n=9;for(let i=0;i<n;i++){const u=(i+.5)/n,x=side===0?ARENA.x+u*ARENA.w:side===1?ARENA.x+u*ARENA.w:side===2?-5:W+5,y=side===0?-5:side===1?H+5:ARENA.y+u*ARENA.h,a=Math.atan2(A.P.y-y,A.P.x-x)+(A.r()-.5)*.5;A.add({x,y,vx:Math.cos(a)*190,vy:Math.sin(a)*190,r:6,color:'#e6f7ff',glow:'rgba(159,216,239,.6)'});}return .9;}];
const andriusBackdrop=(ctx,t)=>{ctx.fillStyle='rgba(159,216,239,.05)';for(let i=0;i<6;i++){const y=((t*60+i*70)%H);ctx.fillRect(0,y,W,1);}};
// 타르탈리아: fans of water blades from where he stands, and electro lances down the lines that glow first (원작: 마왕 무장).
const childe=t=>({x:W/2+Math.sin(t*1.3)*200,y:46});
const TARTAGLIA_PATTERNS=[
 (A,t)=>{const c=childe(t),base=Math.atan2(A.P.y-c.y,A.P.x-c.x);for(let k=-3;k<=3;k++){const a=base+k*.17;A.add({x:c.x,y:c.y,vx:Math.cos(a)*250,vy:Math.sin(a)*250,r:6,delay:Math.abs(k)*.04,color:'#dff6ff',glow:'rgba(127,212,255,.65)'});}return .85;},
 (A,t)=>{const n=1+Math.floor(A.r()*2);for(let k=0;k<n;k++){const x=ARENA.x+30+A.r()*(ARENA.w-60);A.warn.push({rect:true,x,y:H/2,w:30,h:ARENA.h,life:0,ttl:.65,color:'rgba(201,155,255,.6)'});A.add({rect:true,x,y:H/2,w:26,h:ARENA.h,vx:0,vy:0,delay:.65,ttl:1.0,color:'#e7d2ff'});}return .9;},
 (A,t)=>{const cx=ARENA.x+60+A.r()*(ARENA.w-120),cy=ARENA.y+60+A.r()*(ARENA.h-120),n=12,o=A.r()*TAU;A.warn.push({x:cx,y:cy,r:22,life:0,ttl:.45,color:'rgba(127,212,255,.6)'});for(let i=0;i<n;i++){const a=o+i*TAU/n;A.add({x:cx,y:cy,vx:Math.cos(a)*140,vy:Math.sin(a)*140,r:6,delay:.45,color:'#dff6ff',glow:'rgba(127,212,255,.55)'});}return 1.0;},
 (A,t)=>{const y=ARENA.y+30+A.r()*(ARENA.h-60);A.warn.push({rect:true,x:W/2,y,w:ARENA.w,h:30,life:0,ttl:.65,color:'rgba(201,155,255,.6)'});A.add({rect:true,x:W/2,y,w:ARENA.w,h:26,vx:0,vy:0,delay:.65,ttl:1.0,color:'#e7d2ff'});return .8;}];
// phase 1: arrows rain where their circles show, and aimed arrows; phase 2: lances down glowing lines and an Electro rush.
const TARTAGLIA_RAIN=(A,t)=>{const n=4+Math.floor(A.r()*3);for(let i=0;i<n;i++){const x=i===0?A.P.x:ARENA.x+40+A.r()*(ARENA.w-80),y=i===0?A.P.y:ARENA.y+40+A.r()*(ARENA.h-80);A.warn.push({x,y,r:28,life:0,ttl:.75,color:'rgba(127,212,255,.55)'});A.add({x,y,vx:0,vy:0,r:24,delay:.75,ttl:.95,color:'#dff6ff',glow:'rgba(127,212,255,.7)'});}return 1.0;};
const TARTAGLIA_RUSH=(A,t)=>{const y=A.P.y,dir=A.r()<.5?-1:1;A.warn.push({rect:true,x:W/2,y,w:ARENA.w,h:44,life:0,ttl:.6,color:'rgba(201,155,255,.55)'});A.add({rect:true,w:80,h:38,x:dir<0?W+50:-50,y,vx:dir<0?-980:980,vy:0,delay:.6,ttl:2,color:'#e7d2ff'});return .95;};
const TARTAGLIA_BY_PHASE={1:[TARTAGLIA_PATTERNS[0],TARTAGLIA_RAIN,TARTAGLIA_PATTERNS[2],TARTAGLIA_RAIN],2:[TARTAGLIA_PATTERNS[1],TARTAGLIA_RUSH,TARTAGLIA_PATTERNS[3],TARTAGLIA_RUSH]};
const childeBackdrop=(ctx,t)=>{const c=childe(t);glow(ctx,c.x,c.y,40,'rgba(127,212,255,.6)');ctx.fillStyle='#dff6ff';ctx.beginPath();ctx.moveTo(c.x,c.y-14);ctx.lineTo(c.x+9,c.y+10);ctx.lineTo(c.x-9,c.y+10);ctx.closePath();ctx.fill();};
// 야타용왕: the stamp sends rings across the ground with one gap, and meteors fall where their shadow shows (원작: 충격파·운석).
const AZHDAHA_PATTERNS=[
 (A,t)=>{const cx=W/2+(A.r()-.5)*200,cy=H/2+(A.r()-.5)*120;A.warn.push({x:cx,y:cy,r:30,life:0,ttl:.5,color:'rgba(240,196,106,.6)'});for(let k=0;k<2;k++)A.add({ring:true,cx,cy,r0:10,R:0,speed:230,thick:12,gap:A.r()*TAU,gapW:.9,delay:.5+k*.55,ttl:6,color:'#f0c46a'});return 1.6;},
 (A,t)=>{const n=3+Math.floor(A.r()*2);for(let i=0;i<n;i++){const x=i===0?A.P.x:ARENA.x+40+A.r()*(ARENA.w-80),y=i===0?A.P.y:ARENA.y+40+A.r()*(ARENA.h-80);A.warn.push({x,y,r:40,life:0,ttl:.9,color:'rgba(80,50,20,.75)'});A.add({x,y,vx:0,vy:0,r:36,delay:.9,ttl:1.2,color:'#ffd27a',glow:'rgba(255,140,60,.7)'});}return 1.1;},
 (A,t)=>{const cx=ARENA.x+(A.r()<.5?40:ARENA.w-40),cy=ARENA.y+ARENA.h-30;for(let k=0;k<3;k++)A.add({ring:true,cx,cy,r0:10,R:0,speed:260,thick:10,gap:A.r()*TAU,gapW:.8,delay:k*.45,ttl:6,color:'#f0c46a'});return 1.5;}];
const azhdahaBackdrop=(ctx,t)=>{ctx.strokeStyle='rgba(240,196,106,.08)';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(ARENA.x,ARENA.y+40+i*70);ctx.lineTo(ARENA.x+ARENA.w,ARENA.y+60+i*70);ctx.stroke();}};
const GAMES={
 TARTAGLIA_DODGE:(m,r)=>dodge(m,r,TARTAGLIA_BY_PHASE[m.phase]||TARTAGLIA_PATTERNS,{orbs:false,color:m.phase===2?'#c99bff':'#7fd4ff',backdrop:childeBackdrop}),
 AZHDAHA_DODGE:(m,r)=>dodge(m,r,AZHDAHA_PATTERNS,{orbs:false,color:'#f0c46a',backdrop:azhdahaBackdrop}),
 ANEMO_DODGE:(m,r)=>dodge(m,r,ANEMO_PATTERNS,{orbs:true,color:'#74e0c6',backdrop:anemoBackdrop}),
 // 0.16.54 유적의 뱀 · 약점 저격 (user: 「공략이랑 비슷한 느낌을 주되, 아이디어는 참신한 것으로」, 「미니게임은 난이도가 꽤 되어야」).
 // 원작: during its barrage and shockwave four weak points glow yellow on its body segments; breaking all four lays it down.
 // Here the serpent winds through the box, four of its segments glow, and it dips into the sand now and then (no hit lands then).
 SERPENT_SNIPE(m,r){
  const N=15,GAP=19,points=Math.max(1,m.points|0),path=[],segs=[];let shots=Math.max(1,m.shots|0),hits=0,dive=0,diveAt=1.3+r()*.6,ph=r()*TAU,flash=0;const marks=[];
  const idx=[];while(idx.length<points){const i=2+Math.floor(r()*(N-3));if(!idx.includes(i)&&idx.every(j=>Math.abs(j-i)>1))idx.push(i);}
  const weak=new Set(idx),broken=new Set();
  const head=t=>({x:W/2+Math.sin(t*.95+ph)*(W/2-70)+Math.sin(t*2.3)*30,y:H/2+Math.sin(t*1.55+ph*1.7)*(H/2-60)});
  for(let k=0;k<N*GAP;k++){const p=head(-k/120);path.push(p);}
  const place=()=>{segs.length=0;let acc=0,j=0;for(let i=0;i<N;i++){while(j<path.length-1&&acc<i*GAP){acc+=Math.hypot(path[j+1].x-path[j].x,path[j+1].y-path[j].y);j++;}segs.push(path[j]);}};place();
  return{
   update(dt,t,inp){const sp=t>4?1.3:1;path.unshift(head(t*sp));if(path.length>N*GAP*2)path.length=N*GAP*2;place();
    flash=Math.max(0,flash-dt);diveAt-=dt;if(diveAt<=0&&!dive){dive=.75;diveAt=1.5+r()*.8;}dive=Math.max(0,dive-dt);
    for(const tap of inp.taps){if(shots<=0)break;shots--;let hit=null;if(!dive)for(const i of weak)if(!broken.has(i)&&Math.hypot(segs[i].x-tap.x,segs[i].y-tap.y)<13){hit=i;break;}
     marks.push({...tap,life:0,miss:!hit&&hit!==0,sand:!!dive});if(hit!==null){broken.add(hit);hits++;flash=.2;SND('puzzle_light');}else SND('error');}
    for(let i=marks.length-1;i>=0;i--){marks[i].life+=dt;if(marks[i].life>.6)marks.splice(i,1);}},
   over:()=>hits>=points||shots<=0,
   draw(ctx,t){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#2a2116');g.addColorStop(1,'#15110b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    for(let i=0;i<26;i++){ctx.fillStyle='rgba(210,180,120,.07)';ctx.fillRect((i*83+t*22)%W,(i*47)%H,3,2);}
    const a=dive?.25:1;ctx.globalAlpha=a;
    for(let i=N-1;i>=0;i--){const p=segs[i],rad=i===0?17:13-i*.25;ctx.fillStyle=i===0?'#8a8f8c':'#6e736f';ctx.strokeStyle='#3d403e';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,rad,0,TAU);ctx.fill();ctx.stroke();
     if(weak.has(i)&&!broken.has(i)){glow(ctx,p.x,p.y,24+Math.sin(t*9)*3,'rgba(242,211,107,.85)');ctx.fillStyle='#ffe58a';ctx.beginPath();ctx.arc(p.x,p.y,6,0,TAU);ctx.fill();}
     if(broken.has(i)){ctx.strokeStyle='#2a1c10';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-6,p.y-6);ctx.lineTo(p.x+6,p.y+6);ctx.moveTo(p.x+6,p.y-6);ctx.lineTo(p.x-6,p.y+6);ctx.stroke();}}
    const h=segs[0];ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.arc(h.x+5,h.y-4,3,0,TAU);ctx.fill();ctx.globalAlpha=1;
    if(dive){ctx.fillStyle='rgba(210,180,120,.28)';for(const p of segs){ctx.beginPath();ctx.arc(p.x,p.y,22,0,TAU);ctx.fill();}ctx.fillStyle='#f6e7c3';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText('모래 속으로',W/2,34);}
    for(const k of marks){ctx.strokeStyle=k.miss?'rgba(255,140,140,'+(1-k.life*1.6)+')':'rgba(255,255,255,'+(1-k.life*1.6)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(k.x,k.y,6+k.life*30,0,TAU);ctx.stroke();}},
   hud:()=>'약점 '+hits+'/'+points+' · 남은 탄 '+shots,
   summary:()=>hits>=points?'약점을 모두 부쉈다':hits?'약점 '+hits+'곳 명중':'모두 빗나감',
   result:()=>({hits})};
 },
 // 0.16.54 무상의 얼음 · 서리 열매 치기 (user: 「다른 보스들 공략들도 이상한거 있으면 제대로 바꿔. 공략이랑 비슷한 느낌을 주되, 아이디어는
 // 참신한 것으로」, 「미니게임은 난이도가 꽤 되어야」). 원작: it hides in a thick ice shield; Frostfruits around it, struck, fly into the
 // shield and crack it. Here the fruits circle on two rings; a click sends one straight at the shield, and the ice shards circling
 // close in shatter it if they are in the way; a cold pulse from the shield freezes the hand while it passes.
 FROST_FRUIT(m,r){
  const C={x:W/2,y:H/2},SH=46,RING=82,need=Math.max(1,m.need|0),fruits=[],flying=[],cracks=[],marks=[];let shots=Math.max(1,m.shots|0),hits=0,frozen=0,waveAt=1.8+r()*.6,wave=null,flash=0;
  const shards=[0,1,2,3,4].map(i=>({a:i*TAU/5+r()*.3,w:.74}));let spin=(r()<.5?-1:1)*1.9;
  for(let i=0;i<(m.fruits|0||6);i++){const outer=i%2;fruits.push({a:r()*TAU,rad:outer?178:136,spd:(outer?-1:1)*(.55+r()*.35),alive:true});}
  const pos=o=>({x:C.x+Math.cos(o.a)*o.rad*1.35,y:C.y+Math.sin(o.a)*o.rad*.82});
  const blocked=ang=>shards.some(q=>{let d=Math.abs(((ang-q.a)%TAU+TAU)%TAU);if(d>Math.PI)d=TAU-d;return d<q.w/2;});
  return{
   update(dt,t,inp){
    frozen=Math.max(0,frozen-dt);flash=Math.max(0,flash-dt);spin*=t>5?1.0006:1;for(const q of shards)q.a+=spin*(t>5?1.35:1)*dt;
    for(const o of fruits)if(o.alive)o.a+=o.spd*dt;
    waveAt-=dt;if(waveAt<=0&&!wave){wave={R:SH,life:0};waveAt=2.1+r()*.7;}
    if(wave){wave.life+=dt;wave.R+=260*dt;const p=inp.point;if(p&&!frozen&&Math.abs(Math.hypot((p.x-C.x)/1.35,(p.y-C.y)/.82)-wave.R/1.1)<14){frozen=.8;SND('error');}if(wave.R>260)wave=null;}
    for(const tap of inp.taps){marks.push({...tap,life:0});if(frozen||shots<=0)continue;
     const o=fruits.find(o=>o.alive&&Math.hypot(pos(o).x-tap.x,pos(o).y-tap.y)<20);if(!o)continue;o.alive=false;shots--;const p=pos(o);flying.push({a:o.a,x:p.x,y:p.y,rad:o.rad,checked:false});SND('click');}
    for(let i=flying.length-1;i>=0;i--){const q=flying[i];q.rad-=430*dt;const p={x:C.x+Math.cos(q.a)*q.rad*1.35,y:C.y+Math.sin(q.a)*q.rad*.82};q.x=p.x;q.y=p.y;
     if(!q.checked&&q.rad<=RING){q.checked=true;if(blocked(q.a)){flying.splice(i,1);cracks.push({x:q.x,y:q.y,life:0,miss:true});SND('error');continue;}}
     if(q.rad<=SH){flying.splice(i,1);hits++;flash=.25;cracks.push({x:q.x,y:q.y,life:0,miss:false});SND('puzzle_light');}}
    for(const list of [cracks,marks])for(let i=list.length-1;i>=0;i--){list[i].life+=dt;if(list[i].life>.6)list.splice(i,1);}
   },
   over:()=>hits>=need||(shots<=0&&!flying.length),
   draw(ctx,t){ctx.fillStyle='#08131a';ctx.fillRect(0,0,W,H);for(let i=0;i<22;i++){ctx.fillStyle='rgba(168,228,255,.06)';ctx.fillRect((i*97+t*14)%W,(i*53)%H,2,2);}
    ctx.save();ctx.translate(C.x,C.y);ctx.scale(1.35,.82);
    ctx.strokeStyle='rgba(168,228,255,.12)';ctx.lineWidth=1;for(const rad of [136,178,RING]){ctx.beginPath();ctx.arc(0,0,rad,0,TAU);ctx.stroke();}
    if(wave){ctx.strokeStyle='rgba(200,240,255,'+Math.max(0,.7-wave.life*.5)+')';ctx.lineWidth=6;ctx.beginPath();ctx.arc(0,0,wave.R/1.1,0,TAU);ctx.stroke();}
    for(const q of shards){ctx.strokeStyle='#e6f7ff';ctx.shadowColor='#a8e4ff';ctx.shadowBlur=10;ctx.lineWidth=9;ctx.beginPath();ctx.arc(0,0,RING,q.a-q.w/2,q.a+q.w/2);ctx.stroke();ctx.shadowBlur=0;}
    const cracked=hits/need;ctx.fillStyle='rgba(168,228,255,'+(.35-cracked*.2)+')';ctx.beginPath();ctx.arc(0,0,SH,0,TAU);ctx.fill();ctx.strokeStyle=flash?'#fff':'#cdefff';ctx.lineWidth=3;ctx.stroke();ctx.restore();
    ctx.save();ctx.translate(C.x,C.y);ctx.rotate(t*.8);ctx.strokeStyle='#bfe9ff';ctx.lineWidth=2;ctx.strokeRect(-14,-14,28,28);ctx.restore();
    for(let k=0;k<hits;k++){ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=2;ctx.beginPath();const a=k*2.1+.5;ctx.moveTo(C.x,C.y);ctx.lineTo(C.x+Math.cos(a)*SH*1.3,C.y+Math.sin(a)*SH*.8);ctx.stroke();}
    for(const o of fruits)if(o.alive){const p=pos(o);glow(ctx,p.x,p.y,22,'rgba(150,220,255,.55)');ctx.fillStyle='#e9f8ff';ctx.beginPath();ctx.arc(p.x,p.y,10,0,TAU);ctx.fill();ctx.fillStyle='#7ccfff';ctx.beginPath();ctx.arc(p.x-3,p.y-3,4,0,TAU);ctx.fill();}
    for(const q of flying){glow(ctx,q.x,q.y,18,'rgba(200,240,255,.8)');dot(ctx,q.x,q.y,8,'#ffffff');}
    for(const c of cracks)glow(ctx,c.x,c.y,16+c.life*50,c.miss?'rgba(255,150,150,.8)':'rgba(255,255,255,.9)',1-c.life*1.6);
    for(const k of marks){ctx.strokeStyle='rgba(255,255,255,'+(1-k.life*1.6)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(k.x,k.y,10+k.life*30,0,TAU);ctx.stroke();}
    if(frozen){ctx.fillStyle='rgba(168,228,255,'+(.18+frozen*.2)+')';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('얼어붙었다',W/2,40);}},
   hud:()=>'보호막 '+hits+'/'+need+' · 남은 열매 '+shots,
   summary:()=>hits>=need?'얼음 보호막이 깨졌다':hits?'서리 열매 '+hits+'번 맞힘':'모두 막혔다',
   result:()=>({hits:Math.min(hits,need)})};
 },
 // 0.16.54 무상의 바람 · 바람 원소 모으기 (user: 「피가 1이 되면 무적이 되고 주변에 날아다니면서 바람 원소 수집하는걸 미니게임으로」, 「미니게임은
 // 난이도가 꽤 되어야」; the cube stays in the middle, invulnerable, and only attacks; the wind currents carry the player). 원작: at the
 // end it turns invulnerable, five Anemo orbs (four still, one drifting) hang around it and the player rides the wind currents to
 // take them; what is left, it draws in. Here one flies (slowly on one's own, fast in a current that also pushes along its flow)
 // among the cube's rings, spirals and aimed shots; touching the cube or a shot is one hit (whole-party damage).
 ANEMO_ORBS(m,r){
  const C={x:W/2,y:H/2},P={x:W/2,y:H-62},n=Math.max(0,Math.min(5,m.orbs|0)),orbs=[],bullets=[],gone=[],streams=[];let hits=0,taken=0,inv=0,shake=0,next=.9,step=0,drawIn=0;
  // three currents across the box: two lanes along it and one up or down a side, each flowing one way (the seed picks)
  const lane=(horiz,at,dir)=>horiz?{x:ARENA.x,y:at-24,w:ARENA.w,h:48,fx:dir*190,fy:0}:{x:at-24,y:ARENA.y,w:48,h:ARENA.h,fx:0,fy:dir*190};
  const top=ARENA.y+58+r()*30,bottom=ARENA.y+ARENA.h-58-r()*30,side=r()<.5?ARENA.x+70+r()*30:ARENA.x+ARENA.w-70-r()*30;
  streams.push(lane(true,top,r()<.5?1:-1),lane(true,bottom,r()<.5?1:-1),lane(false,side,r()<.5?1:-1));
  const inStream=(x,y)=>streams.find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);
  // the four still orbs sit far from the cube and from each other; the fifth wanders fast around the box
  for(let i=0;i<n;i++){const drift=n>1&&i===n-1;let x,y,k=0;
   // two of them close to the cube, where its shots are thickest; the rest out towards the walls
   do{const ang=r()*TAU,rad=i<2?78+r()*40:165+r()*110;x=Math.max(ARENA.x+30,Math.min(ARENA.x+ARENA.w-30,C.x+Math.cos(ang)*rad*1.5));y=Math.max(ARENA.y+30,Math.min(ARENA.y+ARENA.h-30,C.y+Math.sin(ang)*rad*.75));}
   while((Math.hypot(x-P.x,y-P.y)<170||orbs.some(o=>Math.hypot(o.x-x,o.y-y)<110))&&++k<60);
   orbs.push({x,y,life:0,drift:drift?{a:r()*TAU,b:r()*TAU}:null});}
  const add=o=>bullets.push({r:6,life:0,ttl:7,...o});
  const PATTERNS=[
   (t)=>{const k=15+Math.floor(r()*5),o=r()*TAU,v=(150+r()*30)*(t>5?1.15:1);for(let i=0;i<k;i++){const q=o+i*TAU/k;add({x:C.x,y:C.y,vx:Math.cos(q)*v,vy:Math.sin(q)*v});}return t>5?.7:.9;},
   (t)=>{const o=r()*TAU,dir=r()<.5?-1:1;for(let i=0;i<26;i++){const q=o+dir*i*.42;add({x:C.x,y:C.y,vx:Math.cos(q)*175,vy:Math.sin(q)*175,delay:i*.04,r:5});}return 1.0;},
   (t)=>{for(let k=0;k<3;k++){const q=Math.atan2(P.y-C.y,P.x-C.x)+(k-1)*.2;add({x:C.x,y:C.y,vx:Math.cos(q)*250,vy:Math.sin(q)*250,r:7,delay:k*.1,color:'#fff',glow:'rgba(255,255,255,.5)'});}return .75;}];
  const hit=()=>{if(inv)return;hits++;inv=.85;shake=.25;SND('error');};
  return{
   update(dt,t,inp){
    let dx=(inp.keys.has('R')?1:0)-(inp.keys.has('L')?1:0)+inp.pad[0],dy=(inp.keys.has('D')?1:0)-(inp.keys.has('U')?1:0)+inp.pad[1];
    const q=inStream(P.x,P.y),sp=q?245:150;
    if(dx||dy){const d=Math.hypot(dx,dy);P.x+=dx/d*sp*dt;P.y+=dy/d*sp*dt;}
    else if(inp.down&&inp.point){const ex=inp.point.x-P.x,ey=inp.point.y-P.y,d=Math.hypot(ex,ey);if(d>2){const s2=Math.min(d,sp*1.2*dt);P.x+=ex/d*s2;P.y+=ey/d*s2;}}
    if(q){P.x+=q.fx*dt;P.y+=q.fy*dt;}
    P.x=Math.max(ARENA.x+8,Math.min(ARENA.x+ARENA.w-8,P.x));P.y=Math.max(ARENA.y+8,Math.min(ARENA.y+ARENA.h-8,P.y));
    while(t>=next){next+=PATTERNS[step%PATTERNS.length](t);step++;}
    for(const b of bullets){b.life+=dt;if(b.delay&&b.life<b.delay)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;}
    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];if(b.life>b.ttl||b.x<-40||b.x>W+40||b.y<-40||b.y>H+40)bullets.splice(i,1);}
    for(const o of orbs){o.life+=dt;if(o.drift){o.x=W/2+Math.sin(t*1.45+o.drift.a)*(ARENA.w/2-40);o.y=H/2+Math.sin(t*2.05+o.drift.b)*(ARENA.h/2-36);}}
    for(let i=orbs.length-1;i>=0;i--){const o=orbs[i];if(Math.hypot(P.x-o.x,P.y-o.y)<17){taken++;orbs.splice(i,1);SND('puzzle_step');gone.push({x:o.x,y:o.y,life:0});}}
    for(let i=gone.length-1;i>=0;i--){gone[i].life+=dt;if(gone[i].life>.5)gone.splice(i,1);}
    inv=Math.max(0,inv-dt);shake=Math.max(0,shake-dt);
    if(!inv&&(Math.hypot(P.x-C.x,P.y-C.y)<26||bullets.some(b=>!(b.delay&&b.life<b.delay)&&Math.hypot(P.x-b.x,P.y-b.y)<b.r+5)))hit();
   },
   over:()=>!orbs.length,
   draw(ctx,t,phase){ctx.save();if(shake)ctx.translate((Math.random()-.5)*8,(Math.random()-.5)*8);arena(ctx,'#74e0c6');
    // the currents: faint bands with streaks running the way they flow
    for(const q of streams){ctx.fillStyle='rgba(116,224,198,.07)';ctx.fillRect(q.x,q.y,q.w,q.h);ctx.strokeStyle='rgba(190,255,236,.35)';ctx.lineWidth=2;const along=q.fx?q.w:q.h,dir=Math.sign(q.fx||q.fy);
     for(let i=0;i<9;i++){const u=((i/9+dir*t*.45)%1+1)%1,len=26;ctx.beginPath();if(q.fx){const x=q.x+u*along,y=q.y+8+((i*13)%(q.h-16));ctx.moveTo(x,y);ctx.lineTo(x+dir*len,y);}else{const y=q.y+u*along,x=q.x+8+((i*13)%(q.w-16));ctx.moveTo(x,y);ctx.lineTo(x,y+dir*len);}ctx.stroke();}}
    // when time runs out the cube draws in what is left
    const left=phase==='END'?1:0;drawIn=Math.min(1,drawIn+(left?.04:0));
    for(const o of orbs){const pulse=1+Math.sin(o.life*8)*.15,x=o.x+(C.x-o.x)*drawIn,y=o.y+(C.y-o.y)*drawIn;glow(ctx,x,y,(o.drift?26:22)*pulse,o.drift?'rgba(190,255,236,.95)':'rgba(116,224,198,.9)');dot(ctx,x,y,7*pulse,'#d6fff4',o.drift?'#ffffff':null);}
    for(const g of gone)glow(ctx,g.x,g.y,18+g.life*60,'rgba(255,240,180,.8)',1-g.life*2);
    for(const b of bullets){if(b.delay&&b.life<b.delay)continue;glow(ctx,b.x,b.y,b.r*2.2,b.glow||'rgba(116,224,198,.55)');dot(ctx,b.x,b.y,b.r,b.color||'#e9fffa');}
    ctx.save();ctx.translate(C.x,C.y);ctx.rotate(t*1.6);glow(ctx,0,0,54,'rgba(116,224,198,.55)');ctx.strokeStyle='#bff7e8';ctx.lineWidth=2;ctx.strokeRect(-18,-18,36,36);ctx.rotate(.8);ctx.strokeRect(-12,-12,24,24);ctx.restore();
    ctx.fillStyle='rgba(214,255,244,.75)';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('무적',C.x,C.y+40);
    heart(ctx,P.x,P.y,inv&&Math.floor(inv*14)%2===0);ctx.restore();},
   hud:()=>'바람 원소 '+taken+'/'+n+' · 맞음 '+Math.min(hits,m.maxHits)+'/'+m.maxHits,
   summary:()=>taken>=n?'바람 원소를 모두 빼앗았다':'바람 원소 '+taken+'개 · '+(n-taken)+'개는 흡수됨',
   result:()=>({orbs:taken,hits:Math.min(hits,m.maxHits)})};
 },
 ANDRIUS_DODGE:(m,r)=>dodge(m,r,ANDRIUS_PATTERNS,{orbs:false,color:'#9fd8ef',backdrop:andriusBackdrop}),
 // 무상의 얼음: the cold core runs from the pointer and blinks away; the frost spikes beside it freeze the hand (원작: 도망치는 냉기 핵).
 CRYO_CHASE(m,r){
  const C={x:W/2,y:H/2,vx:120,vy:80,blink:0,next:1.7},spikes=[],marks=[];let hits=0,frozen=0,miss=0,spikeAt=.6,flash=0;const max=Math.max(1,Math.min(m.need||3,3));
  const jump=()=>{C.x=60+r()*(W-120);C.y=60+r()*(H-120);C.blink=.3;C.next=1.4+r()*.8;};
  return{
   update(dt,t,inp){
    frozen=Math.max(0,frozen-dt);miss=Math.max(0,miss-dt);flash=Math.max(0,flash-dt);C.blink=Math.max(0,C.blink-dt);C.next-=dt;if(C.next<=0)jump();
    const p=inp.point;if(p){const d=Math.hypot(C.x-p.x,C.y-p.y);if(d<140){const s=(140-d)/140*520;C.vx+=(C.x-p.x)/(d||1)*s*dt*4;C.vy+=(C.y-p.y)/(d||1)*s*dt*4;}}
    C.vx+=(r()-.5)*400*dt;C.vy+=(r()-.5)*400*dt;const sp=Math.hypot(C.vx,C.vy),cap=300;if(sp>cap){C.vx*=cap/sp;C.vy*=cap/sp;}
    C.x+=C.vx*dt;C.y+=C.vy*dt;if(C.x<30||C.x>W-30){C.vx*=-1;C.x=Math.max(30,Math.min(W-30,C.x));}if(C.y<30||C.y>H-30){C.vy*=-1;C.y=Math.max(30,Math.min(H-30,C.y));}
    spikeAt-=dt;if(spikeAt<=0){spikeAt=.45+r()*.35;const a=r()*TAU,d=40+r()*70;spikes.push({x:Math.max(30,Math.min(W-30,C.x+Math.cos(a)*d)),y:Math.max(30,Math.min(H-30,C.y+Math.sin(a)*d)),life:0});}
    for(let i=spikes.length-1;i>=0;i--){spikes[i].life+=dt;if(spikes[i].life>1.3)spikes.splice(i,1);}
    for(let i=marks.length-1;i>=0;i--){marks[i].life+=dt;if(marks[i].life>.5)marks.splice(i,1);}
    for(const tap of inp.taps){if(frozen||miss)continue;marks.push({...tap,life:0});
     if(spikes.some(s=>Math.hypot(s.x-tap.x,s.y-tap.y)<24)){frozen=1;SND('error');continue;}
     if(!C.blink&&Math.hypot(C.x-tap.x,C.y-tap.y)<26){hits++;flash=.2;SND('puzzle_light');jump();}else miss=.25;}
   },
   over:()=>hits>=max,
   draw(ctx,t){ctx.fillStyle='#08131a';ctx.fillRect(0,0,W,H);for(let i=0;i<18;i++){ctx.fillStyle='rgba(168,228,255,.06)';ctx.fillRect((i*97+t*20)%W,(i*53)%H,2,2);}
    for(const s of spikes){const a=Math.min(1,s.life*3);ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=a;ctx.fillStyle='#cdefff';ctx.beginPath();for(let k=0;k<6;k++){const ang=k*TAU/6;ctx.lineTo(Math.cos(ang)*20,Math.sin(ang)*20);ctx.lineTo(Math.cos(ang+TAU/12)*7,Math.sin(ang+TAU/12)*7);}ctx.closePath();ctx.fill();ctx.restore();ctx.globalAlpha=1;}
    if(C.blink)glow(ctx,C.x,C.y,40*(C.blink/.3),'rgba(168,228,255,.8)');else{glow(ctx,C.x,C.y,44,'rgba(120,200,255,.6)');ctx.save();ctx.translate(C.x,C.y);ctx.rotate(t*3);ctx.fillStyle=flash?'#fff':'#bfe9ff';ctx.beginPath();ctx.moveTo(0,-17);ctx.lineTo(12,0);ctx.lineTo(0,17);ctx.lineTo(-12,0);ctx.closePath();ctx.fill();ctx.restore();}
    for(const k of marks){ctx.strokeStyle='rgba(255,255,255,'+(1-k.life*2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(k.x,k.y,10+k.life*30,0,TAU);ctx.stroke();}
    if(frozen){ctx.fillStyle='rgba(168,228,255,'+(.18+frozen*.2)+')';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('얼어붙었다',W/2,40);}},
   hud:()=>'적중 '+hits+'/'+max,summary:()=>hits?'핵 적중 '+hits+'번':'놓쳤다',result:()=>({hits})};
 },
 // 드발린: the corrupted crystals on its body glow while it sways in the wind; storms knock shots aside (원작: 부식 결정 저격).
 DVALIN_SNIPE(m,r){
  const crystals=[[-70,-14],[30,22],[96,-26]].slice(0,m.crystals).map(([ox,oy])=>({ox,oy,alive:true,pop:0})),shots=[];let left=m.shots,hits=0,storm=0,stormAt=1.4+r()*.6,body={x:W/2,y:H/2},phase=r()*TAU;
  const at=t=>({x:W/2+Math.sin(t*1.25+phase)*170,y:H/2+Math.sin(t*2.5+phase)*58});
  return{
   update(dt,t,inp){body=at(t);stormAt-=dt;if(stormAt<=0&&!storm){storm=.75;stormAt=1.8+r()*.9;}storm=Math.max(0,storm-dt);for(const c of crystals)c.pop=Math.max(0,c.pop-dt);for(let i=shots.length-1;i>=0;i--){shots[i].life+=dt;if(shots[i].life>.6)shots.splice(i,1);}
    for(const tap of inp.taps){if(left<=0)break;left--;let hit=null;if(!storm)for(const c of crystals)if(c.alive&&Math.hypot(body.x+c.ox-tap.x,body.y+c.oy-tap.y)<18){hit=c;break;}
     shots.push({...tap,life:0,miss:!hit,storm:!!storm});if(hit){hit.alive=false;hit.pop=.4;hits++;SND('puzzle_light');}else SND('error');}},
   over:()=>left<=0||crystals.every(c=>!c.alive),
   draw(ctx,t){const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#14233a');g.addColorStop(1,'#0a121c');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
    if(storm){ctx.strokeStyle='rgba(200,230,255,.35)';ctx.lineWidth=2;for(let i=0;i<14;i++){const y=(i*31+t*400)%H;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y-60);ctx.stroke();}}
    const b=body,flap=Math.sin(t*6)*18;ctx.save();ctx.translate(b.x,b.y);ctx.fillStyle='#2f6c7a';ctx.beginPath();ctx.moveTo(-20,-6);ctx.quadraticCurveTo(-150,-90-flap,-230,-10);ctx.quadraticCurveTo(-120,-10,-30,18);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(20,-6);ctx.quadraticCurveTo(150,-90-flap,230,-10);ctx.quadraticCurveTo(120,-10,30,18);ctx.closePath();ctx.fill();
     ctx.fillStyle='#3f8fa0';ctx.beginPath();ctx.ellipse(0,0,120,30,0,0,TAU);ctx.fill();ctx.beginPath();ctx.ellipse(132,-18,26,15,-.3,0,TAU);ctx.fill();ctx.fillStyle='#d8f6ff';ctx.beginPath();ctx.arc(142,-22,3,0,TAU);ctx.fill();ctx.restore();
    for(const c of crystals){const x=b.x+c.ox,y=b.y+c.oy;if(c.alive){glow(ctx,x,y,28+Math.sin(t*7)*4,'rgba(197,140,255,.8)');ctx.fillStyle='#e0b3ff';ctx.beginPath();ctx.moveTo(x,y-13);ctx.lineTo(x+9,y);ctx.lineTo(x,y+13);ctx.lineTo(x-9,y);ctx.closePath();ctx.fill();}else if(c.pop)glow(ctx,x,y,50*(1-c.pop/.4)+10,'rgba(255,220,255,.9)',c.pop/.4);}
    for(const s of shots){ctx.strokeStyle=s.miss?'rgba(255,140,140,'+(1-s.life/.6)+')':'rgba(255,255,255,'+(1-s.life/.6)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,6+s.life*30,0,TAU);ctx.stroke();if(s.storm){ctx.fillStyle='#ffb0b0';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText('빗나감',s.x,s.y-18);}}},
   hud:()=>'결정 '+hits+'/'+m.crystals+' · 남은 탄 '+left,summary:()=>hits?'결정 '+hits+'개 명중':'모두 빗나감',result:()=>({hits})};
 }};

// ---- the battle screen ---------------------------------------------------------------------------------------
const priorAct=act;
act=async function(type,params={}){
 if(type==='COMBAT'&&CARDS.has(params?.card)&&!params.mini){
  if(running||busy||window.ActorPlayback?.active)return;
  // 0.16.53: on someone else's shared fight the screen is drawn from that fight (CRPGCoopWorld.fight), not from game.
  const W=window.CRPGCoopWorld,view=W?.fightShown&&W.fight?W.fight:game,card=view?.combatCards?.().find(c=>c.id===params.card);
  if(card?.mini&&!card.reason)return new Promise(resolve=>open(card,result=>{resolve(result?priorAct.call(this,type,{...params,mini:result}):undefined);}));
 }
 return priorAct.call(this,type,params);
};
const priorCombat=combat;
combat=function(p,...rest){priorCombat(p,...rest);
 for(const b of p.querySelectorAll('.battle-card-choice button[data-card-id]'))if(CARDS.has(b.dataset.cardId))b.classList.add('fb-mini-card');
 const sel=p.querySelector('.battle-card-choice button.selected[data-card-id]');
 if(sel&&CARDS.has(sel.dataset.cardId)){const run=[...p.querySelectorAll('.battle-execute button')].find(b=>b.dataset.action==='COMBAT');if(run)run.textContent='▶ '+(sel.querySelector('strong')?.textContent||'미니게임')+' 시작';}
};
// The boss's state as the first chips on its card (they were only inside the folded 「전투 정보」): a shut or exposed Anemo core,
// a running core or revival, Dvalin's glowing crystals and fall, Andrius's coming dash and its opening.
function bossTags(a){
 // 0.16.53 (user: 「핵 닫힘, 핵 노출 디버프가 갑자기 사라지는건 버그야?」): during a turn's playback the chips are drawn from the
 // playback's copy of the fighter, which has no boss record (fb), so the core chips vanished until the turn ended. The
 // boss record comes from the fight itself.
 const b=game?.s?.runtime,out=[];if(!b||!a||a.side!=='ENEMY'||a.hp<=0)return out;const real=a.fb?a:(b.actors||[]).find(x=>x.id===a.id)||a,f=real.fb,fbx=b.fieldBoss,ctl=fbx?.controlRevision===1&&fbx.behaviorRevision===5&&fbx.pressureRevision===1;
 if(f&&fbx){
  if(f.kind==='ANEMO'&&!f.revival&&ctl)out.push(game.fbCoreShut?.(real)?{id:'FB_CORE_SHUT',name:'핵 닫힘',kind:'hold',rounds:null,text:'탄막을 모으거나 떠 있는 동안 핵이 닫혀 공격이 통하지 않습니다. 공격을 마치면 핵이 드러납니다.'}:{id:'FB_CORE_OPEN',name:'핵 노출',kind:'debuff',rounds:null,text:'공격을 마친 핵이 드러났습니다 · 받는 피해 +50% · 다음 준비 동작까지.'});
  const r=f.revival;
  if(b.bossPass===1){
   if(f.kind==='SERPENT')out.push(f.armorOpened?{id:'FB_ARMOR_OPEN',name:'갑주 열림',kind:'debuff',rounds:null,text:'유적 갑주가 열렸습니다 · 다음 잠행까지 피해가 그대로 들어갑니다.'}:{id:'FB_ARMOR_SHUT',name:'갑주 닫힘',kind:'hold',rounds:null,text:'물리 피해 70%·원소 피해 40% 감소 · 돌진 뒤 머리가 드러나면 파쇄·약점 공략 장비나 주인공의 「약점 저격」.'});
   if(f.kind==='PRIMO'&&!(f.exposedUntil>=b.round))out.push({id:'FB_SCALES',name:'단단한 비늘',kind:'hold',rounds:null,text:'받는 피해 30% 감소 · 보호막으로 원암 분사를 반사하면 비늘이 깎이고 쓰러집니다.'});
   if((f.kind==='CRYO_VINE'||f.kind==='PYRO_VINE')&&f.corolla&&(real.shields||[]).some(x=>x.source==='FB_SHELL'&&x.value>0))out.push({id:'FB_COROLLA',name:'꽃봉오리 '+Math.max(0,(f.corollaDue||0)-b.round),kind:'hold',rounds:null,text:'다시 자란 꽃봉오리 결정막 · '+Math.max(0,(f.corollaDue||0)-b.round)+'라운드 안에 깨지 못하면 전원에게 '+(f.kind==='CRYO_VINE'?'얼음비':'불꽃 폭탄')+'.'});
  }
  if(r?.fruit&&f.kind==='CRYO_HYPO')out.push({id:'FB_CRYO_SHIELD',name:'얼음 보호막 '+(r.hits||0)+'/'+r.need,kind:'hold',rounds:r.rounds,text:'두꺼운 얼음 보호막 · 서리 열매 '+(r.hits||0)+'/'+r.need+'번 · 주인공의 「서리 열매 치기」'+(r.fruit.melted?' · 불로 녹음':' · 불로 먼저 녹이면 한 번 덜 맞혀도 됩니다')+'.'});
  else if(r&&f.kind==='CRYO_HYPO')out.push({id:'FB_CRYO_CORE',name:'냉기 핵 '+(r.hits||0)+'/'+r.need,kind:'hold',rounds:r.rounds,text:'도망치는 냉기 핵 · '+(r.hits||0)+'/'+r.need+'번 적중 · 불 공격·파쇄 장비 또는 주인공의 「냉기 핵 쫓기」.'});
  else if(r?.orbs&&f.kind==='ANEMO')out.push({id:'FB_ANEMO_ORBS',name:'바람 원소 '+r.orbs.got+'/'+r.orbs.total,kind:'hold',rounds:r.rounds,text:'무적 · 흩어진 바람 원소를 모으는 중 · 주인공의 「바람 원소 모으기」로 먼저 빼앗으면 조금만 회복합니다.'});
  else if(r&&f.kind==='ANEMO')out.push({id:'FB_ANEMO_CORE',name:'남은 핵 '+r.core,kind:'debuff',rounds:r.rounds,text:'떠오른 핵 · 원거리·대공 공격으로 '+r.core+'만큼 더 부수면 쓰러집니다.'});
  else if(r)out.push({id:'FB_REVIVAL',name:f.kind==='ELECTRO'?'프리즘 부활':'기둥 부활',kind:'hold',rounds:r.rounds,text:f.kind==='ELECTRO'&&ctl?'주인공의 공격(함께하는 일격 포함)으로 프리즘을 모두 부숴야 합니다 · 번개는 흡수됩니다.':'부활을 지키는 소환물을 모두 부숴야 합니다.'});
 }
 const d=b.dailyDodge;if(d&&a.source===d.boss&&d.controlRevision===1){const L=window.CRPGRuntime?.fieldBossControl?.liyueDaily?.[d.boss];
  if(d.dodge)out.push({id:'DAILY_DODGE',name:(L?.label||'큰 공격')+' 준비',kind:'hold',rounds:null,text:'이번 라운드 끝 '+(L?.label||'큰 공격')+' · 주인공의 「'+(L?.name||'피하기')+'」.'});
  if(d.exposedUntil>=b.round)out.push({id:'DAILY_OPEN',name:'빈틈',kind:'debuff',rounds:null,text:'받는 피해 +50%.'});}
 const t=b.twinBoss;if(t&&a.source===t.boss&&t.controlRevision===1){
  if(t.crystals)out.push({id:'TWIN_CRYSTALS',name:'부식 결정',kind:'debuff',rounds:null,text:'몸의 부식 결정이 빛납니다 · 이번 라운드 주인공의 「부식 결정 저격」.'});
  if(t.downUntil>=b.round)out.push({id:'TWIN_DOWNED',name:'추락',kind:'hold',rounds:null,text:'결정이 깨져 땅에 떨어졌습니다 · 근접 공격도 닿습니다.'});
  if(t.exposedUntil>=b.round)out.push({id:'TWIN_OPEN',name:'빈틈',kind:'debuff',rounds:null,text:'받는 피해 +50%.'});
  if(t.dodge)out.push({id:'TWIN_DASH',name:'질주 준비',kind:'hold',rounds:null,text:'이번 라운드 끝 얼음 발톱 질주 · 주인공의 「질주 피하기」.'});
 }
 return out;
}
const priorList=battleStatusList;
battleStatusList=function(a,...rest){const list=priorList(a,...rest);try{const tags=bossTags(a);if(tags.length)list.unshift(...tags);}catch{}return list;};
window.CRPGFieldBossMinigames={version:1,cards:[...CARDS],open:(card,done)=>{running?.close();open(card,done||(()=>{}));},close:()=>running?.close(),get running(){return running?.kind||null;}};
})();
