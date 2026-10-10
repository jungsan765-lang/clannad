/* 0.16.5 전투 이펙트 (user, 2026-10-07: 「전투 이펙트도 좀... 전체적으로 퀄이 낮아서... 외부 에셋을 쓰던지 뭐 어떻게든 해봐...」).
 * One canvas over the battle draws the light of every blow: glowing flashes and shock rings, each element's own particles
 * (embers and flame tongues, droplets and splashes, ice shards and snow, sparks and branching lightning, wind streaks
 * and leaves, rock chips and gold glints, leaves and spores), weapon slash arcs, projectile trails and light columns.
 * The sprites are drawn by this file when the game starts (soft glows, streaks, shards, flames, drops, leaves, rocks,
 * stars, smoke): no picture is downloaded. app_skill_fx_v0162.js and app_battle_fx_v01521.js hand it their flashes,
 * rings, motes, streaks, bolts, vortices and pillars; the shapes a canvas does not do better stay in the page (skill
 * pictures, swords, rocks, sigils, the burst band).
 * Presentation only: nothing here is read back by the game. 움직임 줄이기 turns it off, the battle speed scales its clock
 * and the playback's pause holds it. Load before app_battle_fx_v01521.js. */
(function(){
'use strict';
const reduced=()=>document.documentElement.classList.contains('reduce-motion')||(typeof settings!=='undefined'&&!!settings.reducedMotion);
const speed=()=>{const v=typeof settings!=='undefined'?Number(settings.combatSpeed):1;return v>0?v:1;};
// Each element's light from the hot core to the edge.
const PAL={pyro:['#fff4cf','#ffae45','#ff5420'],hydro:['#e9fbff','#63d2ff','#2384e8'],cryo:['#ffffff','#c4f4ff','#72cbff'],electro:['#fcf4ff','#d6a9ff','#9152ff'],
 anemo:['#f2fffb','#93f2d6','#36cba6'],geo:['#fff9d9','#ffd75e','#d68f1f'],dendro:['#f7ffe2','#bce95d','#62b02c'],neutral:['#ffffff','#f7e8c2','#dcbb7b'],physical:['#ffffff','#f2e4c4','#cdaa70']};
const ALIAS={fire:'pyro',water:'hydro',ice:'cryo',lightning:'electro',wind:'anemo',rock:'geo','불':'pyro','물':'hydro','얼음':'cryo','번개':'electro','바람':'anemo','바위':'geo','풀':'dendro',
 PYRO:'pyro',HYDRO:'hydro',CRYO:'cryo',ELECTRO:'electro',ANEMO:'anemo',GEO:'geo',DENDRO:'dendro',PHYSICAL:'physical'};
// The colours the other effect files use, back to their element (so a flash in 감우's colour throws snow).
const BY_COLOUR={'#ff8a50':'pyro','#ff7a4a':'pyro','#ffb36b':'pyro','#4cc2f1':'hydro','#6cc9ff':'hydro','#a6e4f2':'cryo','#bdf0ff':'cryo','#cfe9ff':'cryo','#c79bff':'electro','#74e0c2':'anemo','#7fe8c8':'anemo',
 '#f5c542':'geo','#a5d63b':'dendro','#9be27a':'dendro','#f3dfae':'neutral','#ffffff':'physical','#fff6d6':'physical'};
function elOf(x){if(!x)return 'neutral';if(PAL[x])return x;if(ALIAS[x])return ALIAS[x];const c=String(x).toLowerCase();return BY_COLOUR[c]||null;}
function palOf(x){const el=elOf(x);if(el)return PAL[el];const c=String(x||'#ffffff');return ['#ffffff',c,c];}
const R=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)],TAU=Math.PI*2;

// ---- sprites (white, tinted once per colour) -------------------------------------------------------------------
function board(n){const c=document.createElement('canvas');c.width=c.height=n;return c;}
const MAKE={
 glow(){const c=board(64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.16,'rgba(255,255,255,.88)');gr.addColorStop(.42,'rgba(255,255,255,.3)');gr.addColorStop(.7,'rgba(255,255,255,.08)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);return c;},
 spark(){const c=board(64),g=c.getContext('2d'),gr=g.createLinearGradient(0,0,64,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(.62,'rgba(255,255,255,.75)');gr.addColorStop(.9,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.beginPath();g.ellipse(32,32,32,6,0,0,TAU);g.fill();return c;},
 shard(){const c=board(64),g=c.getContext('2d');g.beginPath();g.moveTo(32,1);g.lineTo(43,27);g.lineTo(32,63);g.lineTo(21,27);g.closePath();const gr=g.createLinearGradient(21,0,43,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.45,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,.22)');g.fillStyle=gr;g.fill();g.strokeStyle='rgba(255,255,255,.95)';g.lineWidth=1.4;g.stroke();g.beginPath();g.moveTo(32,4);g.lineTo(32,58);g.strokeStyle='rgba(255,255,255,.6)';g.lineWidth=1;g.stroke();return c;},
 flame(){const c=board(64),g=c.getContext('2d');g.beginPath();g.moveTo(32,2);g.bezierCurveTo(40,18,54,30,50,44);g.bezierCurveTo(47,57,38,62,32,62);g.bezierCurveTo(26,62,17,57,14,44);g.bezierCurveTo(10,30,24,18,32,2);g.closePath();const gr=g.createRadialGradient(32,46,2,32,40,30);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.45,'rgba(255,255,255,.7)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fill();return c;},
 drop(){const c=board(64),g=c.getContext('2d');g.beginPath();g.moveTo(32,4);g.bezierCurveTo(40,22,50,34,50,44);g.arc(32,44,18,0,Math.PI,false);g.bezierCurveTo(14,34,24,22,32,4);g.closePath();const gr=g.createRadialGradient(26,40,1,32,44,22);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.5,'rgba(255,255,255,.6)');gr.addColorStop(1,'rgba(255,255,255,.18)');g.fillStyle=gr;g.fill();return c;},
 leaf(){const c=board(64),g=c.getContext('2d');g.beginPath();g.moveTo(32,4);g.quadraticCurveTo(56,30,32,60);g.quadraticCurveTo(8,30,32,4);g.closePath();g.fillStyle='rgba(255,255,255,.85)';g.fill();g.beginPath();g.moveTo(32,8);g.lineTo(32,56);g.strokeStyle='rgba(255,255,255,1)';g.lineWidth=1.6;g.stroke();return c;},
 rock(){const c=board(64),g=c.getContext('2d');const n=7,pts=[];for(let i=0;i<n;i++){const a=i/n*TAU,r=20+Math.random()*10;pts.push([32+Math.cos(a)*r,32+Math.sin(a)*r]);}g.beginPath();pts.forEach(([x,y],i)=>i?g.lineTo(x,y):g.moveTo(x,y));g.closePath();const gr=g.createLinearGradient(10,6,54,58);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.55,'rgba(205,205,205,1)');gr.addColorStop(1,'rgba(120,120,120,1)');g.fillStyle=gr;g.fill();g.strokeStyle='rgba(60,60,60,.7)';g.lineWidth=2;g.stroke();return c;},
 star(){const c=board(64),g=c.getContext('2d'),gr=g.createRadialGradient(32,32,0,32,32,14);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);g.fillStyle='rgba(255,255,255,.95)';for(const r of [0,Math.PI/2]){g.save();g.translate(32,32);g.rotate(r);g.beginPath();g.moveTo(-31,0);g.quadraticCurveTo(0,-3,31,0);g.quadraticCurveTo(0,3,-31,0);g.fill();g.restore();}return c;},
 smoke(){const c=board(64),g=c.getContext('2d');for(let i=0;i<8;i++){const x=R(18,46),y=R(18,46),r=R(10,22),gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,'rgba(255,255,255,.32)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);}return c;},
 hex(){const c=board(64),g=c.getContext('2d');g.beginPath();for(let i=0;i<6;i++){const a=i/6*TAU+Math.PI/6;g[i?'lineTo':'moveTo'](32+Math.cos(a)*26,32+Math.sin(a)*26);}g.closePath();g.fillStyle='rgba(255,255,255,.25)';g.fill();g.strokeStyle='rgba(255,255,255,1)';g.lineWidth=3;g.stroke();return c;}
};
const SPR={},TINTED=new Map();
function sprite(kind,colour){
 const key=kind+'|'+colour;let c=TINTED.get(key);if(c)return c;
 const base=SPR[kind]||(SPR[kind]=(MAKE[kind]||MAKE.glow)());c=board(base.width);const g=c.getContext('2d');g.drawImage(base,0,0);
 if(kind==='rock'){g.globalCompositeOperation='multiply';g.fillStyle=colour;g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='destination-in';g.drawImage(base,0,0);}
 else{g.globalCompositeOperation='source-in';g.fillStyle=colour;g.fillRect(0,0,c.width,c.height);}
 TINTED.set(key,c);if(TINTED.size>360)TINTED.delete(TINTED.keys().next().value);return c;
}

// ---- the canvas and its clock -----------------------------------------------------------------------------------
let cv=null,ctx=null,W=0,H=0,DPR=1,raf=0,last=0,held=false;
const P=[],S=[];
const cap=()=>innerWidth<800||innerHeight<520?560:1200;
function canvas(){
 if(!cv?.isConnected){
  cv=document.createElement('canvas');cv.className='vfx-canvas';cv.setAttribute('aria-hidden','true');
  // Above the battle and the page effects (.sfx-layer 79; 2169 over the co-op battle), under the windows.
  cv.style.cssText='position:fixed;left:0;top:0;pointer-events:none;z-index:80';
  document.body.append(cv);ctx=cv.getContext('2d');fit();
 }
 cv.style.display='';cv.style.zIndex=document.body.classList.contains('cp-fx-on')?'2170':'80';return ctx;
}
function fit(){if(!cv)return;DPR=Math.min(2,window.devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=Math.max(1,Math.round(W*DPR));cv.height=Math.max(1,Math.round(H*DPR));cv.style.width=W+'px';cv.style.height=H+'px';}
addEventListener('resize',()=>{if(cv)fit();});
function kick(){if(!raf&&typeof requestAnimationFrame==='function'){last=performance.now();raf=requestAnimationFrame(tick);}}
function emit(p){if(reduced())return;canvas();const n=cap();if(P.length>=n)P.splice(0,P.length-n+1);P.push({t:-(p.delay||0),vx:0,vy:0,ax:0,ay:0,drag:1,rot:0,vr:0,a0:1,a1:0,s1:p.s0,add:true,stretch:0,flick:0,...p});kick();}
function stroke(s){if(reduced())return;canvas();if(S.length>140)S.shift();S.push({t:-(s.delay||0),...s});kick();}
const ease=u=>1-Math.pow(1-u,3);
function tick(now){
 raf=0;if(!cv?.isConnected){P.length=0;S.length=0;return;}
 let dt=Math.min(48,now-last);last=now;if(held)dt=0;dt*=speed();const s=dt/1000;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);
 for(let i=P.length-1;i>=0;i--){const p=P[i];p.t+=dt;if(p.t<0)continue;if(p.t>=p.life){P.splice(i,1);continue;}
  if(p.orbit){const o=p.orbit,u=p.t/p.life;o.a+=o.w*s;const r=o.r0+(o.r1-o.r0)*ease(u),px=p.x,py=p.y;p.x=o.cx+Math.cos(o.a)*r;p.y=o.cy+Math.sin(o.a)*r*(o.flat||1)+(o.rise||0)*u;p.vx=(p.x-px)/(s||1);p.vy=(p.y-py)/(s||1);}
  else{p.vx+=p.ax*s;p.vy+=p.ay*s;if(p.drag!==1){const d=Math.pow(p.drag,s);p.vx*=d;p.vy*=d;}p.x+=p.vx*s;p.y+=p.vy*s;}
  p.rot+=p.vr*s;}
 for(const p of P){if(p.t<0)continue;const u=p.t/p.life,inn=p.fadeIn??.12,fade=u<inn?u/inn:1;let a=(p.a0+(p.a1-p.a0)*u)*fade;if(p.flick)a*=1-p.flick*Math.random();if(a<=.004)continue;
  const size=p.s0+(p.s1-p.s0)*ease(u),img=sprite(p.k,p.c);
  ctx.globalCompositeOperation=p.add?'lighter':'source-over';ctx.globalAlpha=a>1?1:a;
  if(p.stretch){const v=Math.hypot(p.vx,p.vy),ang=Math.atan2(p.vy,p.vx),len=Math.max(size,size*(1+v*p.stretch/100));ctx.setTransform(DPR*Math.cos(ang),DPR*Math.sin(ang),-DPR*Math.sin(ang),DPR*Math.cos(ang),p.x*DPR,p.y*DPR);ctx.drawImage(img,-len*.8,-size/4,len,size/2);}
  else{const c=Math.cos(p.rot),sn=Math.sin(p.rot);ctx.setTransform(DPR*c,DPR*sn,-DPR*sn,DPR*c,p.x*DPR,p.y*DPR);const tall=p.tall||1;ctx.drawImage(img,-size/2,-size*tall/2,size,size*tall);}}
 ctx.setTransform(DPR,0,0,DPR,0,0);
 for(let i=S.length-1;i>=0;i--){const t=S[i];t.t+=dt;if(t.t<0)continue;if(t.t>=t.life){S.splice(i,1);continue;}DRAW[t.type]?.(t,t.t/t.life);}
 ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 if(P.length||S.length)raf=requestAnimationFrame(tick);else{ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);cv.style.display='none';}
}
// Strokes: lightning, shock rings, slash arcs, trails, light columns.
const DRAW={
 bolt(t,u){if(u>.15&&u<.3&&!t.reflash)return;ctx.globalCompositeOperation='lighter';const a=u<.5?1:1-(u-.5)/.5;
  for(const [w,al,col] of [[t.w*4,.18,t.pal[2]],[t.w*2,.45,t.pal[1]],[Math.max(1.2,t.w*.6),1,t.pal[0]]]){ctx.globalAlpha=al*a;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.lineJoin='round';ctx.lineCap='round';for(const path of t.paths){ctx.beginPath();path.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();}}},
 // A shock wave: a soft band of light that races out and thins away (not a drawn circle).
 ring(t,u){const e=1-Math.pow(1-u,4),r=t.r0+(t.r1-t.r0)*e,a=(t.alpha??1)*Math.pow(1-u,1.6)*(u<.06?u/.06:1);if(r<=0||a<=0.01)return;ctx.globalCompositeOperation='lighter';
  ctx.save();ctx.translate(t.x,t.y);if(t.flat)ctx.scale(1,t.flat);
  const path=()=>{ctx.beginPath();if(t.hex){for(let i=0;i<6;i++){const g=i/6*TAU+Math.PI/6+(t.spin||0)*u;ctx[i?'lineTo':'moveTo'](Math.cos(g)*r,Math.sin(g)*r);}ctx.closePath();}else ctx.arc(0,0,r,0,TAU);};
  const w=t.w*(1-u*.7);
  for(const [k,al,col] of [[4.2,.12,t.pal[2]],[2.2,.22,t.pal[1]],[1,.42,t.pal[1]],[.34,.6,t.pal[0]]]){ctx.globalAlpha=al*a;ctx.strokeStyle=col;ctx.lineWidth=Math.max(.8,w*k);path();ctx.stroke();}
  ctx.restore();},
 // A blade's crescent: thick in the middle, tapering at both ends, brightest at the leading edge; sweeps on, then fades.
 arc(t,u){const sweep=Math.min(1,u/.3),fade=u<.3?1:Math.max(0,1-(u-.3)/.7),dir=t.a1>t.a0?1:-1,a0=t.a0,a1=t.a0+(t.a1-t.a0)*ease(sweep),mid=(a0+a1)/2,mx=Math.cos(mid),my=Math.sin(mid);
  ctx.globalCompositeOperation='lighter';ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.tilt||0);if(t.flat)ctx.scale(1,t.flat);
  const blade=(r,thick)=>{ctx.beginPath();ctx.arc(0,0,r,a0,a1,dir<0);ctx.arc(-mx*thick,-my*thick,r,a1,a0,dir>0);ctx.closePath();};
  let paint=t.pal[1];if(ctx.createConicGradient){const g=ctx.createConicGradient(Math.min(a0,a1),0,0),span=Math.abs(a1-a0)/TAU;if(span>.01){g.addColorStop(0,dir>0?'rgba(255,255,255,0)':t.pal[0]);g.addColorStop(span*.5,t.pal[1]);g.addColorStop(span,dir>0?t.pal[0]:'rgba(255,255,255,0)');g.addColorStop(Math.min(1,span+.001),'rgba(255,255,255,0)');paint=g;}}
  const thick=t.w*1.6*(1-u*.35);
  ctx.globalAlpha=.28*fade;ctx.fillStyle=t.pal[2];blade(t.r*1.04,thick*1.9);ctx.fill();
  ctx.globalAlpha=.9*fade;ctx.fillStyle=paint;blade(t.r,thick);ctx.fill();
  ctx.globalAlpha=.85*fade;ctx.fillStyle=t.pal[0];blade(t.r*.995,thick*.35);ctx.fill();
  ctx.restore();},
 beam(t,u){const grow=Math.min(1,u/.3),fade=u<.3?1:1-(u-.3)/.7,x1=t.x0+(t.x1-t.x0)*ease(grow),y1=t.y0+(t.y1-t.y0)*ease(grow),tail=Math.max(0,(u-.25)/.75);const x0=t.x0+(t.x1-t.x0)*tail*.85,y0=t.y0+(t.y1-t.y0)*tail*.85;
  ctx.globalCompositeOperation='lighter';ctx.lineCap='round';for(const [w,al,col] of [[t.w*3,.2,t.pal[2]],[t.w,.75,t.pal[1]],[Math.max(1,t.w*.35),1,t.pal[0]]]){ctx.globalAlpha=al*fade;ctx.strokeStyle=col;ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();}},
 // Wind: comet-like arms turning round a point and closing in, brightest at their heads.
 swirl(t,u){const fade=u<.15?u/.15:Math.max(0,1-(u-.55)/.45);if(fade<=0)return;ctx.globalCompositeOperation='lighter';ctx.save();ctx.translate(t.x,t.y-t.rise*u);ctx.scale(1,t.flat||.6);
  for(let k=0;k<t.arms;k++){const rot=t.a+u*t.spin+k*TAU/t.arms,r=t.r*(1-u*.5)*(1-k*.08),span=TAU*.36;
   let paint=t.pal[1];if(ctx.createConicGradient){const g=ctx.createConicGradient(rot,0,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.3,t.pal[1]);g.addColorStop(.36,t.pal[0]);g.addColorStop(.361,'rgba(255,255,255,0)');paint=g;}
   ctx.lineCap='round';
   ctx.globalAlpha=.3*fade;ctx.strokeStyle=t.pal[2];ctx.lineWidth=t.w*2.6;ctx.beginPath();ctx.arc(0,0,r,rot+span*.45,rot+span);ctx.stroke();
   ctx.globalAlpha=.95*fade;ctx.strokeStyle=paint;ctx.lineWidth=t.w;ctx.beginPath();ctx.arc(0,0,r,rot,rot+span);ctx.stroke();}
  ctx.restore();},
 column(t,u){const up=Math.min(1,u/.25),fade=u<.5?1:1-(u-.5)/.5,h=t.h*ease(up),w=t.w*(1-u*.55);ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(0,t.y-h,0,t.y);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.35,t.pal[1]);g.addColorStop(1,t.pal[0]);ctx.globalAlpha=.55*fade;ctx.fillStyle=g;ctx.fillRect(t.x-w/2,t.y-h,w,h);ctx.globalAlpha=.9*fade;ctx.fillRect(t.x-w/7,t.y-h,w/3.5,h);}
};

// ---- what effects are made of ----------------------------------------------------------------------------------
function zigzag(x0,y0,x1,y1,rough,depth){let pts=[[x0,y0],[x1,y1]];for(let d=0;d<depth;d++){const next=[pts[0]];for(let i=1;i<pts.length;i++){const [ax,ay]=pts[i-1],[bx,by]=pts[i],mx=(ax+bx)/2,my=(ay+by)/2,len=Math.hypot(bx-ax,by-ay),nx=-(by-ay)/(len||1),ny=(bx-ax)/(len||1),off=R(-1,1)*rough*len;next.push([mx+nx*off,my+ny*off],[bx,by]);}pts=next;}return pts;}
const V={
 on:()=>!reduced()&&typeof document!=='undefined',
 // A burst of light: a wide glow of the element and a white core.
 flash(x,y,el,o={}){const pal=palOf(el),size=o.size||110,d=o.delay||0,life=o.dur||520,a=o.alpha??1;
  emit({k:'glow',c:pal[2],x,y,s0:size*.45,s1:size*1.35,a0:.65*a,a1:0,life:life*1.15,delay:d,fadeIn:.18});
  emit({k:'glow',c:pal[1],x,y,s0:size*.3,s1:size*.95,a0:.9*a,a1:0,life,delay:d,fadeIn:.12});
  emit({k:'glow',c:'#ffffff',x,y,s0:size*.2,s1:size*.45,a0:.95*a,a1:0,life:life*.6,delay:d,fadeIn:.08});
  if(size>=120)emit({k:'star',c:pal[0],x,y,s0:size*.9,s1:size*1.4,a0:.7*a,a1:0,life:life*.55,delay:d,rot:R(0,.5)});},
 // A shock ring (o.hex for 바위, o.flat for one lying on the ground).
 ring(x,y,el,o={}){const pal=palOf(el),size=o.size||90;stroke({type:'ring',x,y,pal,r0:size*.5*(o.from??.25),r1:size*.5*(o.to??1.9),w:o.w||Math.max(3,size/18),life:(o.dur||640)*.85,delay:o.delay||0,hex:!!o.hex,flat:o.flat||0,alpha:o.alpha??.9,spin:o.hex?.6:0});},
 // Particles of the element around a point (outward; o.inward gathers them).
 motes(x,y,el,o={}){const e=elOf(el)||'neutral',n=Math.round((o.n||8)*1.6),r=o.r||60,d=o.delay||0;(MOTE[e]||MOTE.neutral)(x,y,{...o,n,r,d});},
 // An element's explosion: flash, ring and its particles.
 burst(x,y,el,o={}){const k=o.k||1;V.flash(x,y,el,{size:120*k,delay:o.delay});V.ring(x,y,el,{size:110*k,to:1.5,delay:(o.delay||0)+40,hex:elOf(el)==='geo'});V.motes(x,y,el,{n:10*k,r:70*k,delay:o.delay});},
 // Sparks thrown from a blow (o.dir: the angle they fly toward, o.spread).
 sparks(x,y,el,o={}){const pal=palOf(el),n=o.n||12,sp=o.speed||420,d=o.delay||0,dir=o.dir,spread=o.spread??TAU;for(let i=0;i<n;i++){const a=dir===undefined?R(0,TAU):dir+R(-spread/2,spread/2),v=R(.45,1)*sp;emit({k:'spark',c:pick(pal),x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,ay:o.gravity??240,drag:.04,life:R(220,420),s0:R(10,18)*(o.k||1),s1:3,stretch:.55,delay:d+R(0,40)});}},
 // Lightning from (x0,y0) to (x1,y1), branching, flickering once.
 bolt(x0,y0,x1,y1,el='electro',o={}){const pal=palOf(el),paths=[zigzag(x0,y0,x1,y1,.22,5)];const main=paths[0];for(let b=0;b<(o.branches??3);b++){const at=main[Math.floor(R(.25,.8)*main.length)],ang=Math.atan2(y1-y0,x1-x0)+R(-1.1,1.1),len=Math.hypot(x1-x0,y1-y0)*R(.18,.38);paths.push(zigzag(at[0],at[1],at[0]+Math.cos(ang)*len,at[1]+Math.sin(ang)*len,.3,3));}
  stroke({type:'bolt',paths,pal,w:o.w||3.2,life:o.dur||420,delay:o.delay||0});if(o.quiet)return;V.flash(x1,y1,el,{size:o.size||90,delay:(o.delay||0)+20,dur:360});V.sparks(x1,y1,el,{n:8,speed:360,delay:o.delay,gravity:120});},
 // A trail from a to b (an arrow, a thrust, a thread of light).
 beam(x0,y0,x1,y1,el,o={}){const pal=palOf(el);stroke({type:'beam',x0,y0,x1,y1,pal,w:o.width||5,life:o.dur||420,delay:o.delay||0});if(o.head!==false)emit({k:'glow',c:pal[1],x:x1,y:y1,s0:(o.width||5)*5,s1:(o.width||5)*9,a0:.9,a1:0,life:(o.dur||420)*.7,delay:(o.delay||0)+(o.dur||420)*.25});},
 // A blade's crescent over a point (o.angle: tilt, o.heavy: one big cleave).
 slash(x,y,el,o={}){const pal=palOf(el),r=(o.size||70)*(o.heavy?1.25:1),dir=o.flip?-1:1,tilt=o.angle??R(-.5,.5);stroke({type:'arc',x,y,pal,r,a0:(-Math.PI*.85)*dir,a1:(Math.PI*.15)*dir,w:o.w||(o.heavy?15:10),tilt,flat:o.flat||.62,life:o.dur||360,delay:o.delay||0});
  V.sparks(x+Math.cos(tilt)*r*.6*dir,y+Math.sin(tilt)*r*.3,el,{n:o.heavy?12:7,speed:o.heavy?460:360,dir:tilt+(dir>0?0:Math.PI),spread:1.6,delay:(o.delay||0)+90});},
 // Wind turning around a point.
 vortex(x,y,el='anemo',o={}){const pal=palOf(el),size=o.size||120,n=o.n||14,d=o.delay||0,life=o.dur||820;
  stroke({type:'swirl',x,y,pal,r:size*.55,w:Math.max(3,size/26),arms:4,a:R(0,TAU),spin:(o.ccw?-1:1)*10,flat:o.flat??.55,rise:size*.12,life,delay:d});
  for(let i=0;i<n;i++){emit({k:i%3?'spark':'leaf',c:pick(pal),x,y,orbit:{cx:x,cy:y,a:R(0,TAU),w:R(8,12)*(o.ccw?-1:1),r0:size*R(.45,.65),r1:size*R(.08,.2),flat:o.flat??.55,rise:-R(14,44)},life:life*R(.7,1),s0:i%3?R(14,22):R(9,12),s1:6,stretch:i%3?.14:0,rot:R(0,TAU),vr:R(-6,6),delay:d+R(0,life*.25)});}
  V.flash(x,y,el,{size:size*.8,delay:d,dur:life*.6,alpha:.55});},
 // A column of light rising from the ground.
 pillar(x,y,el,o={}){const pal=palOf(el);stroke({type:'column',x,y,pal,h:o.h||150,w:o.w||46,life:o.dur||640,delay:o.delay||0});V.motes(x,y-(o.h||150)*.35,el,{n:6,r:(o.w||46)*.8,delay:(o.delay||0)+120,dur:600});},
 // Something falling leaves a trail of its light.
 trail(x0,y0,x1,y1,el,o={}){V.beam(x0,y0,x1,y1,el,{width:o.width||4,dur:o.dur||300,delay:o.delay,head:false});},
 // A short shake of a fighter's column (a heavy blow, a critical hit, a reaction's blast).
 shake(node,amp=5,dur=300){if(!node?.animate||reduced())return;node.animate([{transform:'translate(0,0)'},{transform:'translate(-'+amp+'px,1px)'},{transform:'translate('+amp+'px,-1px)'},{transform:'translate(-'+(amp/2)+'px,0)'},{transform:'translate(0,0)'}],{duration:dur/speed(),easing:'ease-out'});},
 clear(){P.length=0;S.length=0;if(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,cv.width,cv.height);cv.style.display='none';}},
 hold(on){held=!!on;},
 count:()=>({particles:P.length,strokes:S.length}),
 elOf,palOf
};
// Each element's particles: (x, y, {n, r, d: delay, inward, fall, dur, flat, k})
function around(x,y,o,i){const a=i/o.n*TAU+R(-.3,.3),r=o.r*R(.35,1);return {a,dx:Math.cos(a)*r,dy:Math.sin(a)*r*(o.flat||1)};}
// Outward pieces leave fast and slow down (drag), so a blast opens at once and hangs a moment.
function scatter(x,y,o,i,fn){const {a,dx,dy}=around(x,y,o,i),life=(o.dur||620)*R(.85,1.3),d=o.d+R(0,(o.stagger||0)*i+50);
 if(o.inward)return fn({x:x+dx,y:y+dy,vx:-dx/(life/1000)*.95,vy:-dy/(life/1000)*.95,life,d,a,drag:1});
 return fn({x:x+dx*.12,y:y+dy*.12,vx:dx/(life/1000)*2.6,vy:dy/(life/1000)*2.6+(o.fall||0),life,d,a,drag:.08});}
const MOTE={
 // embers thrown out and rising, flame tongues licking up from the middle, a little dark smoke
 pyro(x,y,o){const pal=PAL.pyro;for(let i=0;i<o.n;i++)scatter(x,y,o,i,q=>emit({k:i%3?'glow':'spark',c:pick(pal),x:q.x,y:q.y,vx:q.vx*.8,vy:q.vy*.8-40,ay:-160,drag:q.drag*2,life:q.life*1.25,s0:i%3?R(7,13):R(12,18),s1:1.5,stretch:i%3?0:.25,flick:.4,delay:q.d}));
  for(let i=0;i<Math.max(4,Math.ceil(o.n/2));i++)emit({k:'flame',c:pick([pal[1],pal[2],pal[2]]),x:x+R(-o.r*.45,o.r*.45),y:y+R(0,16),vx:R(-22,22),vy:R(-170,-90),drag:.45,life:R(440,680),s0:R(11,17),s1:R(22,32),a0:.8,a1:0,rot:R(-.18,.18),tall:2.3,delay:o.d+R(0,160)});
  emit({k:'glow',c:pal[2],x,y,s0:o.r*.9,s1:o.r*2.1,a0:.45,a1:0,life:620,delay:o.d});
  for(let i=0;i<2;i++)emit({k:'smoke',c:'#3d2a22',add:false,x:x+R(-14,14),y:y-14,vx:R(-15,15),vy:R(-60,-35),life:R(900,1200),s0:26,s1:80,a0:.42,a1:0,delay:o.d+220});},
 // droplets flung up and falling back, bubbles of light, a wet sheen
 hydro(x,y,o){const pal=PAL.hydro;for(let i=0;i<o.n;i++)scatter(x,y,o,i,q=>emit({k:'drop',c:pick(pal),x:q.x,y:q.y,vx:q.vx*.75,vy:q.vy*.75-180,ay:900,drag:q.drag*3,life:q.life*1.2,s0:R(8,13),s1:R(5,8),stretch:.06,delay:q.d}));
  for(let i=0;i<Math.ceil(o.n/2.5);i++)emit({k:'glow',c:pick([pal[0],pal[1]]),x:x+R(-o.r*.6,o.r*.6),y:y+R(-o.r*.5,o.r*.3),vy:R(-40,-14),life:R(520,860),s0:R(5,9),s1:R(12,18),a0:.7,a1:0,delay:o.d+R(0,160)});
  emit({k:'glow',c:pal[2],x,y,s0:o.r*.9,s1:o.r*2,a0:.4,a1:0,life:560,delay:o.d});},
 // ice shards bursting out and spinning, snow drifting down, a cold haze
 cryo(x,y,o){const pal=PAL.cryo;for(let i=0;i<o.n;i++)scatter(x,y,o,i,q=>emit({k:'shard',c:pick(pal),x:q.x,y:q.y,vx:q.vx,vy:q.vy,drag:q.drag,life:q.life,s0:R(14,24),s1:R(8,12),rot:q.a+Math.PI/2,vr:R(-4,4),tall:R(1,1.4),delay:q.d}));
  for(let i=0;i<Math.ceil(o.n/2);i++)emit({k:'star',c:'#ffffff',x:x+R(-o.r,o.r),y:y+R(-o.r*.9,o.r*.3),vx:R(-16,16),vy:R(16,46),life:R(1000,1500),s0:R(6,11),s1:2,flick:.3,rot:R(0,1),delay:o.d+R(0,260)});
  emit({k:'glow',c:pal[2],x,y,s0:o.r*.9,s1:o.r*2.2,a0:.4,a1:0,life:760,delay:o.d});},
 // sparks shooting out, small arcs crackling round the point
 electro(x,y,o){const pal=PAL.electro;for(let i=0;i<o.n;i++)scatter(x,y,o,i,q=>emit({k:'spark',c:pick(pal),x:q.x,y:q.y,vx:q.vx*1.3,vy:q.vy*1.3,drag:q.drag*.5,life:q.life*.55,s0:R(14,22),s1:4,stretch:.45,delay:q.d}));
  emit({k:'glow',c:pal[2],x,y,s0:o.r*.8,s1:o.r*1.9,a0:.45,a1:0,life:420,delay:o.d,flick:.5});
  for(let b=0;b<Math.min(3,Math.ceil(o.n/6));b++){const a=R(0,TAU),r=o.r*R(.6,1.1);V.bolt(x,y,x+Math.cos(a)*r,y+Math.sin(a)*r*(o.flat||1),'electro',{branches:1,w:1.8,dur:260,delay:o.d+b*70,size:40,quiet:true});}},
 // wind streaks turning round the point and leaves caught in them
 anemo(x,y,o){const pal=PAL.anemo;for(let i=0;i<o.n;i++)emit({k:i%3?'spark':'leaf',c:pick(pal),x,y,orbit:{cx:x,cy:y,a:i/o.n*TAU,w:R(7,10)*(o.inward?-1:1),r0:o.inward?o.r*1.1:o.r*.25,r1:o.inward?o.r*.15:o.r*1.15,flat:o.flat??.6,rise:-R(14,36)},life:(o.dur||620)*R(.95,1.35),s0:i%3?R(18,26):R(10,13),s1:6,stretch:i%3?.16:0,rot:R(0,TAU),vr:R(-6,6),delay:o.d+R(0,90)});
  emit({k:'glow',c:pal[1],x,y,s0:o.r*.6,s1:o.r*1.7,a0:.35,a1:0,life:640,delay:o.d});},
 // rock chips thrown up and falling, gold glints, a hexagon of light
 geo(x,y,o){const pal=PAL.geo;for(let i=0;i<o.n;i++)scatter(x,y,o,i,q=>emit({k:i%2?'rock':'star',c:i%2?'#c9a25a':pick(pal),add:!(i%2),x:q.x,y:q.y,vx:q.vx*.7,vy:q.vy*.7-(i%2?260:30),ay:i%2?1100:0,drag:i%2?.6:q.drag,life:q.life,s0:i%2?R(8,14):R(10,16),s1:i%2?R(7,10):2,rot:R(0,TAU),vr:R(-8,8),a0:1,a1:i%2?.5:0,delay:q.d}));
  emit({k:'hex',c:pal[1],x,y,s0:o.r*.5,s1:o.r*1.7,a0:.75,a1:0,life:560,delay:o.d,rot:R(0,1)});
  emit({k:'glow',c:pal[2],x,y,s0:o.r*.8,s1:o.r*1.8,a0:.4,a1:0,life:520,delay:o.d});},
 // leaves and spores of light drifting out
 dendro(x,y,o){const pal=PAL.dendro;for(let i=0;i<o.n;i++)scatter(x,y,o,i,q=>emit({k:i%2?'leaf':'glow',c:pick(pal),x:q.x,y:q.y,vx:q.vx*.65,vy:q.vy*.65,ay:i%2?80:-30,drag:q.drag*3,life:q.life*1.35,s0:i%2?R(11,16):R(6,10),s1:i%2?R(9,12):2,rot:R(0,TAU),vr:R(-5,5),flick:i%2?0:.3,delay:q.d}));
  emit({k:'glow',c:pal[2],x,y,s0:o.r*.8,s1:o.r*1.9,a0:.4,a1:0,life:640,delay:o.d});},
 neutral(x,y,o){const pal=PAL.neutral;for(let i=0;i<o.n;i++)scatter(x,y,o,i,q=>emit({k:i%2?'spark':'glow',c:pick(pal),x:q.x,y:q.y,vx:q.vx,vy:q.vy,drag:q.drag,life:q.life*.8,s0:i%2?R(12,18):R(5,9),s1:2,stretch:i%2?.35:0,delay:q.d}));}
};
MOTE.physical=MOTE.neutral;

// ---- the playback's clock --------------------------------------------------------------------------------------
if(typeof CombatFX!=='undefined'&&typeof CombatFX.pause==='function'){const prior=CombatFX.pause;CombatFX.pause=function(p){const out=prior.call(this,p);V.hold(!!p);return out;};}
// Skipped or replaced, the light goes out at once; at the playback's own end it finishes (unless the fight is over).
const fighting=()=>{try{if(window.CRPGCoopWorld?.fightGame?.()?.s?.runtime)return true;}catch{}try{return typeof game!=='undefined'&&!!game?.s?.runtime;}catch{return false;}};
if(typeof GameEffects!=='undefined'&&typeof GameEffects.cancel==='function'){const prior=GameEffects.cancel;GameEffects.cancel=function(...args){const natural=this.active&&!this.resolve&&fighting();held=false;if(!natural)V.clear();return prior.apply(this,args);};}
window.CRPGVFX=V;
})();
