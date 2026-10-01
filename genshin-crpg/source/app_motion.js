/* 0.14.7 테이바트 UI motion: the screen answers the pointer. Cards and tiles tilt toward the cursor with a moving
 * light, the accent colour follows the region (Mond wind, Liyue rock, Dragonspine ice, the Chasm and the Abyss),
 * and slow light motes drift behind menus. Pure presentation: no game state, saves or actions. Turned off by
 * the 움직임 줄이기 setting or the system's reduced-motion preference. Load after app_shell.js. */
(function(){
'use strict';
const M=window.CRPGMotion={region:null};
const reduced=()=>document.documentElement.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches;
// Everything a player points at to choose something.
const TILT=['.pm-tile','.hb-row','.hb-stat','.hb-companion','.hb-floor','.bag-item','.market-item','.shell-roster-item','.member-select','.terrain-destination','.location-places>*','.combatant-row','.battle-cards button[data-card-id]','.gear-slot','.formation-option','.choice','.ley-line-item','.journal-section','.relationship-card','.recipe-card','.dish-card','.shell-tab','.hud-nav-button','.hud-tool','.next-chapter','.main-objective','.discovery-card','.life-resource','.formation-row'].join(',');
let active=null,last=null,raf=0;
function reset(t){t.classList.remove('is-tilting');for(const k of ['--rx','--ry','--px','--py'])t.style.removeProperty(k);}
function frame(){
 raf=0;const e=last;if(!e)return;
 let t=document.body.classList.contains('teyvat')||document.querySelector('.paimon-menu,.handbook')?e.target?.closest?.(TILT):null;
 if(t&&(t.disabled||t.closest('[inert]')))t=null;
 if(t!==active){if(active)reset(active);active=t;if(t){t.classList.add('tiltable','is-tilting');window.CRPGSound?.hover?.(t);}}
 if(!t)return;
 const r=t.getBoundingClientRect();if(!r.width||!r.height)return;
 const x=Math.min(1,Math.max(0,(e.clientX-r.left)/r.width)),y=Math.min(1,Math.max(0,(e.clientY-r.top)/r.height));
 t.style.setProperty('--mx',(x*100).toFixed(1)+'%');t.style.setProperty('--my',(y*100).toFixed(1)+'%');
 if(reduced())return;
 // Big panels lean less than small tiles.
 const max=Math.max(1.5,Math.min(10,1500/Math.max(r.width,r.height*1.4)));
 t.style.setProperty('--rx',((.5-y)*max).toFixed(2)+'deg');t.style.setProperty('--ry',((x-.5)*max).toFixed(2)+'deg');
 // Pictures inside the card drift the other way for a little depth.
 t.style.setProperty('--px',((.5-x)*6).toFixed(1)+'px');t.style.setProperty('--py',((.5-y)*5).toFixed(1)+'px');
}
document.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;last=e;if(!raf)raf=requestAnimationFrame(frame);},{passive:true});
document.addEventListener('pointerleave',()=>{if(active){reset(active);active=null;}last=null;});
document.addEventListener('pointerdown',e=>{const t=e.target?.closest?.(TILT);if(t&&!t.disabled){t.classList.remove('is-pressed');void t.offsetWidth;t.classList.add('is-pressed');setTimeout(()=>t.classList.remove('is-pressed'),260);}},{passive:true});
// ---------- region accent ----------
const REGION_BY_MAP=[[/^MAP_DRAGONSPINE/,'snow'],[/^MAP_CHASM/,'chasm'],[/MUSK_REEF|ABYSS/,'abyss'],[/^MAP_(SNEZ)/,'snow'],[/^MAP_(FONT|FONTAINE)/,'hydro'],[/^MAP_(INAZ|INAZUMA|NARUKAMI|SEIRAI|YASHIORI|MIKOTO)/,'electro'],[/^MAP_(SUMERU)/,'dendro'],[/^MAP_(NATLAN)/,'pyro'],[/^MAP_(NODKRAI)/,'nod']];
function regionOf(){
 if(typeof game==='undefined'||!game)return 'title';
 const id=game.s.global.CURRENT_MAP_ID||'';for(const [re,name]of REGION_BY_MAP)if(re.test(id))return name;
 const r=game.tables?.['32_MAP_DB']?.get(id)?.[1];return r==='리월'?'liyue':r==='몬드'?'mond':'mond';
}
M.applyRegion=function(){const r=regionOf();if(r!==M.region){M.region=r;document.body.dataset.region=r;}};
// ---------- light motes ----------
let canvas=null,ctx=null,motes=[],raf2=0,lastT=0,running=false;
function color(){return getComputedStyle(document.body).getPropertyValue('--acc-rgb').trim()||'243,223,174';}
function spawn(w,h,fresh){return {x:Math.random()*w,y:fresh?Math.random()*h:h+10,r:.6+Math.random()*1.8,v:6+Math.random()*16,dx:(Math.random()-.5)*8,tw:Math.random()*Math.PI*2,ts:.6+Math.random()*1.4,a:.25+Math.random()*.5};}
function size(){if(!canvas)return;const d=Math.min(2,window.devicePixelRatio||1);canvas.width=innerWidth*d;canvas.height=innerHeight*d;canvas.style.width=innerWidth+'px';canvas.style.height=innerHeight+'px';ctx.setTransform(d,0,0,d,0,0);}
function tick(t){
 raf2=0;if(!running)return;const dt=Math.min(.05,(t-lastT)/1000||0);lastT=t;
 const w=innerWidth,h=innerHeight,c=color();ctx.clearRect(0,0,w,h);
 for(const m of motes){m.y-=m.v*dt;m.x+=m.dx*dt;m.tw+=m.ts*dt;if(m.y<-12||m.x<-12||m.x>w+12)Object.assign(m,spawn(w,h,false));
  const a=m.a*(.55+.45*Math.sin(m.tw));const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r*5);g.addColorStop(0,'rgba('+c+','+a.toFixed(3)+')');g.addColorStop(1,'rgba('+c+',0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(m.x,m.y,m.r*5,0,Math.PI*2);ctx.fill();}
 raf2=requestAnimationFrame(tick);
}
function start(){
 if(running)return;if(!canvas){canvas=document.createElement('canvas');canvas.className='shell-motes';canvas.setAttribute('aria-hidden','true');document.body.prepend(canvas);ctx=canvas.getContext('2d');addEventListener('resize',size);}
 size();const n=innerWidth<760?18:34;motes=Array.from({length:n},()=>spawn(innerWidth,innerHeight,true));running=true;canvas.hidden=false;lastT=performance.now();raf2=requestAnimationFrame(tick);
}
function stop(){running=false;if(raf2)cancelAnimationFrame(raf2);raf2=0;if(canvas){canvas.hidden=true;ctx?.clearRect(0,0,canvas.width,canvas.height);}}
M.syncMotes=function(){const mode=document.body.dataset.mode,title=!!document.querySelector('.game-title'),want=!document.hidden&&!reduced()&&(title||document.body.classList.contains('teyvat')&&['world','menu','plain','story'].includes(mode));if(want)start();else stop();};
document.addEventListener('visibilitychange',()=>M.syncMotes());
// Loading tips on the travel and work screens, like the original's loading screen.
const TIPS=['F1을 누르면 모험가 핸드북에서 필드 보스·지맥의 꽃·오늘의 기록을 한눈에 볼 수 있습니다.','Esc로 메뉴를 엽니다. J는 임무, L은 편성, C는 장비, B는 가방, M은 지도입니다.','지맥의 꽃은 매시 정각에 자리를 옮깁니다. 꽃마다 한 시간에 한 번 보상을 받습니다.','필드 보스는 모두 합쳐 게임 내 하루에 3번까지 토벌할 수 있습니다.','이틀 주기 보스는 현실 시간으로 하루에 한 번 입장합니다. 한국 시간 자정에 다시 열립니다.','동료의 개인 임무를 마치면 동행을 제안받습니다.','전투에서 E와 Q 키로 주인공의 원소전투 스킬과 원소폭발을 고를 수 있습니다.','동료 역할이 진형과 맞으면 시너지가 붙습니다.','전용 무기를 든 동료는 원소폭발 때 일정 확률로 「공명 각성」을 일으킵니다.','회복 요리는 같은 요리를 연달아 먹으면 효과가 없습니다. 번갈아 준비해 두세요.','길 안내를 정하면 도착할 때까지 지도에 다음 구역이 표시됩니다.'];
try{new MutationObserver(list=>{for(const r of list)for(const n of r.addedNodes){if(n.nodeType===1&&n.classList?.contains('travel-overlay')&&!n.querySelector('.shell-tip')){const tip=document.createElement('p');tip.className='shell-tip';const b=document.createElement('b');b.textContent='TIP';tip.append(b,document.createTextNode(TIPS[Math.floor(Math.random()*TIPS.length)]));n.append(tip);}}}).observe(document.body,{childList:true});}catch{}
if(typeof render==='function'){const prior=render;render=function(){prior();try{M.applyRegion();M.syncMotes();}catch{}};}
})();
