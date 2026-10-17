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
 FROST_FRUIT:{title:'서리 열매 치기',chips:m=>[touchDevice()?'화면 어디든 끌어서 움직이기':'WASD · 방향키로 움직이기','빛나는 열매를 밟아 줍기',touchDevice()?'오른쪽 「던지기」로 던지기':'클릭 · 스페이스로 던지기','얼음 조각이 멈출 때가 기회','조준선 파랑 = 들어감 · 금색 = 완벽(던지기 그대로)','발밑이 빛나면 비키기','보호막에 '+m.need+'번 · 던지기 '+m.shots+'번'],color:'#a8e4ff',move:true,fire:true},
 ANEMO_ORBS:{title:'바람 원소 모으기',chips:m=>[touchDevice()?'화면 어디든 끌어서 이동':'WASD · 방향키로 이동','바람 원소 '+m.orbs+'개 모으기 · 보스는 무적','기류를 타면 빠름 · 흐름대로 밀림','탄환·본체에 닿으면 파티 전원 피해','못 주운 원소는 보스가 흡수'],color:'#74e0c6',move:true},
 ANEMO_DODGE:{title:'바람 탄막 피하기',chips:m=>[touchDevice()?'화면 어디든 끌어서 이동':'WASD · 방향키로 이동','탄환에 맞으면 파티 전원 피해','바람 원소 '+m.orbs+'개 · 원소폭발 충전'],color:'#74e0c6',move:true},
 // 0.16.54: 타르탈리아's attack follows his phase (m.phase 1 물 화살비 · 2 뇌전 창 · 3 극악기·진멸; none: a fight saved before).
 TARTAGLIA_DODGE:{title:m=>m.phase===1?'물 화살비 피하기':m.phase===2?'뇌전 창 피하기':'진멸 피하기',chips:m=>[touchDevice()?'화면 어디든 끌어서 이동':'WASD · 방향키로 이동',m.phase===1?'쏟아지는 물 화살 · 겨눈 물 화살':m.phase===2?'빛나는 줄의 번개 창 · 번개 돌진':'물 칼날 · 빛나는 줄의 번개 창','한 발도 안 맞으면 빈틈'],color:'#7fd4ff',move:true},
 AZHDAHA_DODGE:{title:'충격파 넘기',chips:()=>[touchDevice()?'화면 어디든 끌어서 이동':'WASD · 방향키로 이동','충격파의 틈으로 빠져나가기','그림자 진 곳에 운석','한 발도 안 맞으면 빈틈'],color:'#f0c46a',move:true},
 ANDRIUS_DODGE:{title:'질주 피하기',chips:()=>[touchDevice()?'화면 어디든 끌어서 이동':'WASD · 방향키로 이동','빛나는 길로 늑대가 달려든다','한 발도 안 맞으면 빈틈'],color:'#9fd8ef',move:true},
 CRYO_CHASE:{title:'냉기 핵 쫓기',chips:m=>[touchDevice()?'핵을 눌러 맞히기':'핵을 클릭해 맞히기','가까이 가면 달아나고 순간이동','얼음 가시를 누르면 잠시 얼어붙음','부서질 때까지 '+m.need+'번'],color:'#a8e4ff',move:false},
 DVALIN_SNIPE:{title:'부식 결정 저격',chips:m=>[touchDevice()?'결정을 눌러 쏘기':'결정을 클릭해 쏘기','탄 '+m.shots+'발','폭풍이 불 때 쏘면 빗나감','결정 '+m.crystals+'개'],color:'#c58cff',move:false}};
let running=null;

const css=`.fb-mini{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;background:rgba(3,7,9,.84)}
.fb-mini-box{display:flex;flex-direction:column;gap:10px;padding:14px 16px 16px;border:1px solid rgba(227,195,138,.45);border-radius:14px;background:linear-gradient(#142229,#0b1418);box-shadow:0 0 60px rgba(0,0,0,.6)}
.fb-mini-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;max-width:860px}.fb-mini-head strong{font-size:1.15rem;color:#f3dfb5;margin-right:4px}
.fb-mini-head span{padding:3px 9px;border-radius:6px;background:rgba(227,195,138,.12);border:1px solid rgba(227,195,138,.25);font-size:.85rem;color:#e8dcc3;white-space:nowrap}
.fb-mini-play{display:flex;gap:14px;align-items:center;justify-content:center}.fb-mini canvas{display:block;width:${W}px;height:${H}px;border-radius:10px;background:#071015;touch-action:none;cursor:crosshair}
.fb-mini-hud{display:flex;gap:12px;align-items:center;font-size:.95rem;color:#e8dcc3}.fb-mini-hud b{color:#fff}.fb-mini-time{flex:1;height:8px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden}.fb-mini-time i{display:block;height:100%;width:100%;background:var(--fb-mini,#74e0c6);transform-origin:left}
.fb-mini.touch{touch-action:none}.fb-mini.touch .fb-mini-box{width:1256px;height:704px;box-sizing:border-box;padding:8px 12px;gap:6px;border-radius:12px}.fb-mini.touch .fb-mini-head{max-width:none;gap:6px}.fb-mini.touch .fb-mini-head span{font-size:.8rem;padding:2px 8px}
.fb-mini.touch .fb-mini-play{flex:1 1 auto;min-height:0;gap:16px}.fb-mini.touch canvas{width:auto;height:100%;max-height:568px;aspect-ratio:/}
.fb-mini-side{display:flex;align-items:center;justify-content:center;width:250px;align-self:stretch}body .fb-mini .fb-mini-side button.fb-mini-fire{display:flex!important;align-items:center!important;justify-content:center!important;text-align:center;width:230px;height:230px;padding:0;border-radius:24px;font-size:2.1rem;font-weight:800;letter-spacing:.08em;color:#08202b;background:linear-gradient(#e6f8ff,#8fd6f5);border:3px solid #fff;box-shadow:0 0 30px rgba(168,228,255,.55);touch-action:none;user-select:none}body .fb-mini .fb-mini-side button.fb-mini-fire.hit{transform:scale(.94);filter:brightness(1.15)}
.fb-mini-stick{position:absolute;width:132px;height:132px;margin:-66px 0 0 -66px;border-radius:50%;border:3px solid rgba(255,255,255,.45);background:rgba(255,255,255,.07);display:none;pointer-events:none;z-index:3}.fb-mini-stick.on{display:block}.fb-mini-stick i{position:absolute;left:36px;top:36px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 14px rgba(255,255,255,.4)}
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
 // 0.16.57 (user: 「휴대폰으로 하면 저게 되겠냐? 그냥 졸라 크게 해서 화살표는 전체화면으로 움직이게 하는게 좋지 않겠어?」, 「위치좀 잘 해봐」):
 // on a phone the window fills the screen; a finger put down anywhere (not on a button) becomes a stick — drag to move — and a game that
 // throws has a big 「던지기」 beside the picture. The small four-arrow pad is gone.
 const touch=touchDevice(),stickMode=k.move&&touch;if(touch)wrap.classList.add('touch');let stick=null,knob=null;
 if(stickMode){stick=el('div','fb-mini-stick');knob=el('i','');stick.append(knob);stick.setAttribute('aria-hidden','true');
  if(k.fire){const side=el('div','fb-mini-side'),f=button('던지기',()=>{});f.className='fb-mini-fire';f.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();input.fire=(input.fire||0)+1;f.classList.add('hit');setTimeout(()=>f.classList.remove('hit'),120);});side.append(f);play.append(side);}}
 box.append(head,play,hud,actions);wrap.append(box);if(stick)wrap.append(stick);document.body.append(wrap);
 const ctx=canvas.getContext('2d'),input={keys:new Set(),pad:[0,0],point:null,down:false,taps:[]};
 const g=GAMES[m.kind](m,rng(m.seed));let phase='INTRO',t0=0,last=0,elapsed=0,raf=0,count=3,finished=null;
 const pos=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*W/r.width,y:(e.clientY-r.top)*H/r.height};};
 canvas.addEventListener('pointerdown',e=>{if(stickMode)return;e.preventDefault();input.point=pos(e);input.down=true;if(phase==='PLAY')input.taps.push(input.point);});
 if(stickMode){let pid=null,origin=null;const R=64,local=e=>{const r=wrap.getBoundingClientRect();return{x:(e.clientX-r.left)*wrap.offsetWidth/(r.width||1),y:(e.clientY-r.top)*wrap.offsetHeight/(r.height||1)};};
  wrap.addEventListener('pointerdown',e=>{if(e.target.closest('button')||pid!==null)return;e.preventDefault();pid=e.pointerId;origin=local(e);stick.style.left=origin.x+'px';stick.style.top=origin.y+'px';knob.style.transform='';stick.classList.add('on');input.pad=[0,0];});
  wrap.addEventListener('pointermove',e=>{if(e.pointerId!==pid)return;e.preventDefault();const p=local(e),dx=p.x-origin.x,dy=p.y-origin.y,n=Math.hypot(dx,dy),c=n>R?R/n:1;knob.style.transform='translate('+(dx*c).toFixed(1)+'px,'+(dy*c).toFixed(1)+'px)';input.pad=n<10?[0,0]:[dx/n,dy/n];});
  const end=e=>{if(e.pointerId!==pid)return;pid=null;origin=null;input.pad=[0,0];stick.classList.remove('on');};wrap.addEventListener('pointerup',end);wrap.addEventListener('pointercancel',end);}
 canvas.addEventListener('pointermove',e=>{input.point=pos(e);});
 const up=()=>{input.down=false;};canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);canvas.addEventListener('pointerleave',()=>{input.down=false;if(!touchDevice())input.point=null;});
 const KEYS={ArrowUp:'U',KeyW:'U',ArrowDown:'D',KeyS:'D',ArrowLeft:'L',KeyA:'L',ArrowRight:'R',KeyD:'R'};
 const keydown=e=>{if(!running)return;e.stopPropagation();if(KEYS[e.code]){e.preventDefault();input.keys.add(KEYS[e.code]);}else if(phase==='INTRO'&&(e.code==='Enter'||e.code==='Space')){e.preventDefault();begin();}else if(phase==='PLAY'&&k.fire&&['Space','Enter','KeyJ'].includes(e.code)){e.preventDefault();if(!e.repeat)input.fire=(input.fire||0)+1;}else if(phase==='INTRO'&&e.code==='Escape'){e.preventDefault();close(null);}else e.preventDefault();};
 const keyup=e=>{if(!running)return;e.stopPropagation();if(KEYS[e.code])input.keys.delete(KEYS[e.code]);};
 window.addEventListener('keydown',keydown,true);window.addEventListener('keyup',keyup,true);
 running={kind:m.kind,close:()=>close(null),battle:window.CRPGLiveBattleId?.()||null};
 function begin(){if(phase!=='INTRO')return;phase='COUNT';SND('click');actions.remove();t0=performance.now();last=t0;raf=requestAnimationFrame(frame);}
 function close(result){cancelAnimationFrame(raf);window.removeEventListener('keydown',keydown,true);window.removeEventListener('keyup',keyup,true);wrap.remove();running=null;done(result);}
 function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  if(phase==='COUNT'){const left=3-(now-t0)/1000;count=Math.ceil(left);if(left<=0){phase='PLAY';elapsed=0;}}
  else if(phase==='PLAY'&&!document.hidden){elapsed+=dt;g.update(dt,elapsed,input);input.taps.length=0;if(elapsed>=m.seconds||g.over()){phase='END';finished=now;SND('notice');}}
  ctx.clearRect(0,0,W,H);g.draw(ctx,elapsed,phase);
  if(phase==='COUNT'){ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 96px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(Math.max(1,count)),W/2,H/2);}
  // 0.16.58: the end says how it went — a full success says 완벽! in gold; a partial one is white, nothing done a soft red
  if(phase==='END'){const gr=g.grade?.()||'ok',k=Math.min(1,(now-finished)/220);ctx.fillStyle='rgba(0,0,0,'+(.55*k)+')';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.globalAlpha=k;
   if(gr==='great'){glow(ctx,W/2,H/2-30,150,'rgba(255,214,120,.35)');ctx.font='900 '+Math.round(40+16*(1-k))+'px sans-serif';ctx.lineWidth=7;ctx.strokeStyle='rgba(40,24,6,.9)';ctx.strokeText('완벽!',W/2,H/2-36);ctx.fillStyle='#ffe08a';ctx.fillText('완벽!',W/2,H/2-36);}
   ctx.font='bold 34px sans-serif';ctx.lineWidth=6;ctx.strokeStyle='rgba(6,14,18,.9)';const y=gr==='great'?H/2+20:H/2;ctx.strokeText(g.summary(),W/2,y);ctx.fillStyle=gr==='great'?'#fff3cf':gr==='bad'?'#ffb8b8':'#ffffff';ctx.fillText(g.summary(),W/2,y);ctx.globalAlpha=1;}
  bar.style.transform='scaleX('+Math.max(0,1-(phase==='PLAY'||phase==='END'?elapsed/m.seconds:0))+')';score.textContent=g.hud();
  if(phase==='END'&&now-finished>1400){close({kind:m.kind,id:m.id,...g.result()});return;}
  raf=requestAnimationFrame(frame);}
 g.draw(ctx,0,'INTRO');score.textContent=g.hud();start.focus();
 const redraw=()=>{if(phase==='INTRO'&&wrap.isConnected){ctx.clearRect(0,0,W,H);g.draw(ctx,0,'INTRO');}else PIC_WAIT.delete(redraw);};PIC_WAIT.add(redraw);
}

// ---- shared drawing ------------------------------------------------------------------------------------------
const glow=(ctx,x,y,r,color,a=1)=>{const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');ctx.globalAlpha=a;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.globalAlpha=1;};
const dot=(ctx,x,y,r,fill,stroke)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.stroke();}};
const heart=(ctx,x,y,blink)=>{if(blink)return;ctx.save();ctx.translate(x,y);ctx.fillStyle='#fff6d8';ctx.shadowColor='#ffe08a';ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(7,0);ctx.lineTo(0,8);ctx.lineTo(-7,0);ctx.closePath();ctx.fill();ctx.restore();};
const ARENA={x:24,y:24,w:W-48,h:H-48};
// 0.16.58 (user: 「뭔가... 원이나 사각형 이런거로만 이루어져있는거같아서 개짜치는데... 에셋 없나....」): the game's own pictures — the boss's
// scene, darkened, behind the box (its core where the game's core is), the hero's face for the player (the small dot in the middle is
// what gets hit), the official element icon for a wind element.
// a picture still loading is drawn when it arrives (the start screen is drawn once, before the first frame)
const IMG={},PIC_WAIT=new Set(),pic=src=>{if(!src||typeof Image==='undefined')return null;let i=IMG[src];if(!i){i=IMG[src]=new Image();i.decoding='async';i.onload=()=>{for(const f of [...PIC_WAIT])try{f();}catch{}};i.src=src;}return i.complete&&i.naturalWidth?i:null;};
const SCENE={ANEMO:['assets/enemy_fb_anemo_hypostasis.webp',.5,.43],CRYO:['assets/enemy_fb_cryo_hypostasis.webp',.497,.433],SERPENT:['assets/enemy_fb_ruin_serpent.webp',.5,.5],DVALIN:['assets/bg_mondstadt_stormterror_lair_01.webp',.5,.5],ANDRIUS:['assets/enemy_20.webp',.5,.5],TARTAGLIA:['assets/enemy_tartaglia_foul_legacy.webp',.5,.42],AZHDAHA:['assets/enemy_21.webp',.5,.5]};
const scene=(ctx,key,dark=.62,at)=>{ctx.fillStyle='#071015';ctx.fillRect(0,0,W,H);const sp=SCENE[key],img=sp&&pic(sp[0]);if(!img)return;
 const k=Math.max(W/img.naturalWidth,H/img.naturalHeight),w=img.naturalWidth*k,h=img.naturalHeight*k,x=Math.max(W-w,Math.min(0,(at?.x??W/2)-sp[1]*w)),y=Math.max(H-h,Math.min(0,(at?.y??H/2)-sp[2]*h));
 ctx.drawImage(img,x,y,w,h);ctx.fillStyle='rgba(5,12,16,'+dark+')';ctx.fillRect(0,0,W,H);const v=ctx.createRadialGradient(W/2,H/2,H*.32,W/2,H/2,W*.7);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.6)');ctx.fillStyle=v;ctx.fillRect(0,0,W,H);};
const arena=(ctx,color,key,dark,at)=>{scene(ctx,key,dark,at);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.strokeRect(ARENA.x,ARENA.y,ARENA.w,ARENA.h);};
const heroFace=()=>{try{return (typeof playerFaceSrc==='function'&&playerFaceSrc())||'assets/icons/faces/isekai.webp';}catch{return 'assets/icons/faces/isekai.webp';}};
const hero=(ctx,x,y,blink,r=12,ring='#ffe08a')=>{if(blink)return;const img=pic(heroFace());if(!img){heart(ctx,x,y,false);return;}
 ctx.save();ctx.shadowColor=ring;ctx.shadowBlur=12;ctx.fillStyle='#0b1418';ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.clip();ctx.drawImage(img,x-r,y-r,2*r,2*r);ctx.restore();
 ctx.strokeStyle=ring;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();ctx.fillStyle='#fff6d8';ctx.beginPath();ctx.arc(x,y,2.2,0,TAU);ctx.fill();};
// 0.16.58 (user: 「어떤게 바람원소인지, 어떤게 서리열매인지 그런것도 모르겠고」, 「유저들이 이건 뭐지? 라고 생각만 안들면 될거같아」): what one picks
// up carries its name all the time; what one aims at or keeps away from is named on the start screen and the first seconds.
const tag=(ctx,x,y,text,a=1,color='#ffffff',size=12)=>{if(a<=0)return;ctx.save();ctx.globalAlpha=Math.min(1,a);ctx.font='bold '+size+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=4;ctx.strokeStyle='rgba(6,14,18,.88)';ctx.strokeText(text,x,y);ctx.fillStyle=color;ctx.fillText(text,x,y);ctx.restore();};
const early=(t,phase)=>phase==='INTRO'||phase==='COUNT'?1:Math.max(0,Math.min(1,4-t));
// a wind element: a swirl of three arcs (nothing like the round shots), with a ring for the time it has left when it fades
const windOrb=(ctx,x,y,t,s=1,bright=false,left=1)=>{glow(ctx,x,y,28*s,bright?'rgba(190,255,236,.95)':'rgba(116,224,198,.85)');ctx.save();ctx.translate(x,y);ctx.scale(s,s);
 if(left<1){ctx.strokeStyle='rgba(214,255,244,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,17,-Math.PI/2,-Math.PI/2+TAU*Math.max(0,left));ctx.stroke();}
 const icon=pic('assets/icons/ui/UI_Buff_Element_Wind.webp');ctx.rotate(t*1.6);if(icon){ctx.shadowColor='#bff7e8';ctx.shadowBlur=10;ctx.drawImage(icon,-14,-14,28,28);ctx.shadowBlur=0;ctx.restore();return;}
 ctx.rotate(t*2.4);ctx.strokeStyle='#effffa';ctx.lineWidth=2.8;ctx.lineCap='round';for(let k=0;k<3;k++){ctx.rotate(TAU/3);ctx.beginPath();ctx.arc(5,0,8,-.7,1.9);ctx.stroke();}
 ctx.fillStyle=bright?'#ffffff':'#d6fff4';ctx.beginPath();ctx.arc(0,0,4,0,TAU);ctx.fill();ctx.restore();};

// 0.16.58 (user: 「냉기 핵은 핵 적중 된거 어떻게 알아?」, 「전체적으로 게임을 더 보완해보자」): every game says what just happened — a word
// that pops where it happened, shards that fly, a ring, a jolt, a flash — so a hit, a miss and a blow taken are never silent. Looks only:
// the screen's own random, never the game's.
function fxKit(){const bits=[],pops=[],rings=[];let shake=0,flash=0,tint='255,255,255';
 return{
  burst(x,y,n,color,speed,size=3){for(let i=0;i<n;i++){const a=Math.random()*TAU,v=speed*(.4+Math.random()*.8);bits.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-speed*.25,life:0,ttl:.5+Math.random()*.4,color,size:size*(.6+Math.random()*.8)});}},
  pop(x,y,text,color='#ffffff',size=24){pops.push({x:Math.max(60,Math.min(W-60,x)),y:Math.max(28,Math.min(H-20,y)),text,color,size,life:0});},
  ring(x,y,color,r0=8,grow=110){rings.push({x,y,color,r0,grow,life:0});},
  jolt(a){shake=Math.max(shake,a);},flash(a,rgb='255,255,255'){flash=Math.max(flash,a);tint=rgb;},
  update(dt){shake=Math.max(0,shake-dt);flash=Math.max(0,flash-dt*1.6);
   for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.life+=dt;b.vy+=380*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.life>b.ttl)bits.splice(i,1);}
   for(let i=pops.length-1;i>=0;i--){pops[i].life+=dt;if(pops[i].life>.9)pops.splice(i,1);}
   for(let i=rings.length-1;i>=0;i--){rings[i].life+=dt;if(rings[i].life>.45)rings.splice(i,1);}},
  shakeBy(ctx){if(shake)ctx.translate((Math.random()-.5)*18*shake,(Math.random()-.5)*18*shake);},
  draw(ctx){for(const g of rings){const k=g.life/.45;ctx.globalAlpha=Math.max(0,1-k);ctx.strokeStyle=g.color;ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.x,g.y,g.r0+g.grow*k,0,TAU);ctx.stroke();ctx.globalAlpha=1;}
   for(const b of bits){ctx.globalAlpha=Math.max(0,1-b.life/b.ttl);ctx.fillStyle=b.color;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.life*9);ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size*1.6);ctx.restore();ctx.globalAlpha=1;}
   for(const p of pops){const k=p.life/.9,grow=k<.12?1+(.12-k)*4:1;ctx.save();ctx.globalAlpha=Math.max(0,1-k*k);ctx.font='900 '+Math.round(p.size*grow)+'px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='rgba(8,19,26,.85)';ctx.strokeText(p.text,p.x,p.y-k*26);ctx.fillStyle=p.color;ctx.fillText(p.text,p.x,p.y-k*26);ctx.restore();}
   if(flash>0){ctx.fillStyle='rgba('+tint+','+Math.min(.45,flash)+')';ctx.fillRect(-20,-20,W+40,H+40);}}};}
// What each attack looks like (the hit is still the plain circle or box): water arrows streak the way they fly, electro lances
// crackle, the wolf runs as an icy streak, ice claws slash, water splashes, meteors land as burning rock.
function drawShot(ctx,b){const st=b.style,c=b.color||'#e9fffa',g=b.glow||'rgba(116,224,198,.55)';
 if(st==='arrow'||st==='shard'){const a=Math.atan2(b.vy,b.vx),len=st==='arrow'?26:16;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(a);const gr=ctx.createLinearGradient(-len,0,4,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,c);ctx.strokeStyle=gr;ctx.lineWidth=st==='arrow'?5:4;ctx.lineCap='round';ctx.shadowColor=g;ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(-len,0);ctx.lineTo(4,0);ctx.stroke();
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.moveTo(9,0);ctx.lineTo(1,-4);ctx.lineTo(1,4);ctx.closePath();ctx.fill();ctx.restore();return;}
 if(st==='bolt'){ctx.save();ctx.fillStyle='rgba(201,155,255,.28)';ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);ctx.strokeStyle='#f1e2ff';ctx.shadowColor='#c99bff';ctx.shadowBlur=16;ctx.lineWidth=3;ctx.beginPath();const vert=b.h>b.w,n=10;
  for(let i=0;i<=n;i++){const u=i/n,j=(Math.random()-.5)*(vert?b.w:b.h)*.8,x=vert?b.x+j:b.x-b.w/2+u*b.w,y=vert?b.y-b.h/2+u*b.h:b.y+j;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();ctx.restore();return;}
 if(st==='rush'||st==='wolf'){const dir=Math.sign(b.vx||b.vy)||1,horiz=!!b.vx,len=horiz?b.w:b.h,thick=horiz?b.h:b.w;ctx.save();ctx.translate(b.x,b.y);if(!horiz)ctx.rotate(Math.PI/2);if(dir<0)ctx.scale(-1,1);
  const gr=ctx.createLinearGradient(-len*1.6,0,len/2,0);gr.addColorStop(0,'rgba(255,255,255,0)');gr.addColorStop(1,st==='wolf'?'#e6f7ff':'#efdcff');ctx.fillStyle=gr;ctx.shadowColor=st==='wolf'?'#9fd8ef':'#c99bff';ctx.shadowBlur=18;
  ctx.beginPath();ctx.moveTo(-len*1.6,-thick*.3);ctx.lineTo(len*.25,-thick/2);ctx.lineTo(len/2+12,0);ctx.lineTo(len*.25,thick/2);ctx.lineTo(-len*1.6,thick*.3);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;for(let k=-1;k<=1;k++){ctx.beginPath();ctx.moveTo(-len*1.2,k*thick*.22);ctx.lineTo(len*.1,k*thick*.22);ctx.stroke();}ctx.restore();return;}
 if(st==='claw'){const k=Math.min(1,(b.life-(b.delay||0))/.15);ctx.save();ctx.translate(b.x,b.y);glow(ctx,0,0,b.r*1.5,'rgba(159,216,239,.55)');ctx.strokeStyle='#f2fbff';ctx.shadowColor='#9fd8ef';ctx.shadowBlur=14;ctx.lineWidth=5;ctx.lineCap='round';
  for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(-b.r*.8+i*12,-b.r*.9*k);ctx.quadraticCurveTo(i*12+4,0,b.r*.7+i*12,b.r*.9*k);ctx.stroke();}ctx.restore();return;}
 if(st==='splash'){const k=Math.min(1,(b.life-(b.delay||0))/.3);ctx.save();ctx.fillStyle='rgba(127,212,255,.3)';ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,TAU);ctx.fill();ctx.strokeStyle='#dff6ff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(b.x,b.y,b.r*(.5+k*.5),0,TAU);ctx.stroke();
  ctx.fillStyle='#ffffff';for(let i=0;i<6;i++){const a=i*TAU/6+.4,d=b.r*(.3+k*.9);ctx.beginPath();ctx.arc(b.x+Math.cos(a)*d,b.y+Math.sin(a)*d-k*8,2.4,0,TAU);ctx.fill();}ctx.restore();return;}
 if(st==='meteor'){const k=Math.min(1,(b.life-(b.delay||0))/.25);ctx.save();glow(ctx,b.x,b.y,b.r*1.7,'rgba(255,140,60,.75)');ctx.fillStyle='rgba(60,36,18,.55)';ctx.beginPath();ctx.arc(b.x,b.y,b.r*(.7+k*.3),0,TAU);ctx.fill();
  ctx.translate(b.x,b.y);ctx.fillStyle='#4a3524';ctx.strokeStyle='#ffb35c';ctx.lineWidth=2;ctx.beginPath();for(let i=0;i<8;i++){const a=i*TAU/8,rr=b.r*.55*(i%2?.82:1);ctx.lineTo(Math.cos(a)*rr,Math.sin(a)*rr);}ctx.closePath();ctx.fill();ctx.stroke();
  ctx.strokeStyle='#ffd27a';ctx.beginPath();ctx.moveTo(-8,-4);ctx.lineTo(0,2);ctx.lineTo(9,-6);ctx.moveTo(0,2);ctx.lineTo(2,11);ctx.stroke();ctx.restore();return;}
 // a plain shot, with a short tail the way it flies
 if(b.vx||b.vy){const sp=Math.hypot(b.vx,b.vy)||1;ctx.strokeStyle=g;ctx.lineWidth=b.r*1.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(b.x-b.vx/sp*b.r*2.4,b.y-b.vy/sp*b.r*2.4);ctx.lineTo(b.x,b.y);ctx.stroke();}
 glow(ctx,b.x,b.y,b.r*2.2,g);dot(ctx,b.x,b.y,b.r,c);}
const iceCore=(ctx,x,y,t,flash,cracks)=>{glow(ctx,x,y,50,'rgba(120,200,255,.6)');ctx.save();ctx.translate(x,y);const x0=9*Math.sin(t*3);
 const face=(pts,c)=>{ctx.fillStyle=flash?'#ffffff':c;ctx.beginPath();pts.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));ctx.closePath();ctx.fill();};
 face([[0,-24],[-15,0],[x0,0]],'#e8f8ff');face([[0,-24],[x0,0],[15,0]],'#a9dcff');face([[-15,0],[0,24],[x0,0]],'#8fc6f0');face([[x0,0],[0,24],[15,0]],'#5aa0d8');
 ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-24);ctx.lineTo(15,0);ctx.lineTo(0,24);ctx.lineTo(-15,0);ctx.closePath();ctx.moveTo(0,-24);ctx.lineTo(x0,0);ctx.lineTo(0,24);ctx.moveTo(-15,0);ctx.lineTo(15,0);ctx.stroke();
 ctx.strokeStyle='rgba(20,50,80,.95)';ctx.lineWidth=1.8;for(let k=0;k<cracks;k++){const a=k*2.3+.6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*7,Math.sin(a)*10);ctx.lineTo(Math.cos(a+.45)*12,Math.sin(a+.45)*18);ctx.stroke();}ctx.restore();};
const corrupt=(ctx,x,y,t,flash)=>{const p=1+Math.sin(t*7)*.12;glow(ctx,x,y,24*p,'rgba(214,90,255,.85)');ctx.save();ctx.translate(x,y);
 const shard=(a,l,wd)=>{ctx.save();ctx.rotate(a);ctx.fillStyle=flash?'#ffffff':'#3b1452';ctx.strokeStyle='#f0c4ff';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(0,-l);ctx.lineTo(wd,0);ctx.lineTo(0,l*.35);ctx.lineTo(-wd,0);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='rgba(240,160,255,.55)';ctx.beginPath();ctx.moveTo(0,-l);ctx.lineTo(wd*.5,-l*.2);ctx.lineTo(0,0);ctx.closePath();ctx.fill();ctx.restore();};
 shard(-.5,9,4);shard(.55,8,3.5);shard(0,13,5);ctx.restore();};
// A shockwave ring grows from its centre; its gap is the way through.
const angGap=(a,b)=>{let d=Math.abs(a-b)%TAU;return d>Math.PI?TAU-d:d;};
const ringHit=(b,P)=>{const d=Math.hypot(P.x-b.cx,P.y-b.cy);return Math.abs(d-b.R)<b.thick/2+5&&angGap(Math.atan2(P.y-b.cy,P.x-b.cx),b.gap)>b.gapW/2;};
const drawRing=(ctx,b)=>{if(b.R<=0)return;ctx.save();ctx.strokeStyle='rgba(120,80,30,.45)';ctx.lineWidth=b.thick*2.2;ctx.beginPath();ctx.arc(b.cx,b.cy,Math.max(1,b.R-b.thick*1.4),b.gap+b.gapW/2,b.gap-b.gapW/2+TAU);ctx.stroke();
 ctx.strokeStyle=b.color||'#f0c46a';ctx.shadowColor=b.color||'#f0c46a';ctx.shadowBlur=14;ctx.lineWidth=b.thick;ctx.beginPath();ctx.arc(b.cx,b.cy,b.R,b.gap+b.gapW/2,b.gap-b.gapW/2+TAU);ctx.stroke();
 ctx.shadowBlur=0;ctx.strokeStyle='#fff3cf';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.cx,b.cy,b.R+b.thick/2-1,b.gap+b.gapW/2,b.gap-b.gapW/2+TAU);ctx.stroke();ctx.restore();};
// ---- the dodge games (바람 탄막 · 질주) -------------------------------------------------------------------------
function dodge(m,r,patterns,opts){
 const P={x:W/2,y:H-80},bullets=[],orbs=[],warn=[],F=fxKit();let hits=0,taken=0,inv=0,next=0,step=0,shake=0;
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
   if(!inv)for(const b of bullets){if(b.delay&&b.life<b.delay)continue;const hit=b.ring?ringHit(b,P):b.rect?Math.abs(P.x-b.x)<b.w/2+5&&Math.abs(P.y-b.y)<b.h/2+5:Math.hypot(P.x-b.x,P.y-b.y)<b.r+5;if(hit){hits++;inv=.85;shake=.25;SND('error');F.pop(P.x,P.y-26,hits>=m.maxHits?'맞음! ('+m.maxHits+')':'맞음!','#ff9c9c',22);F.burst(P.x,P.y,10,'#ffb0b0',170);F.flash(.35,'255,70,70');break;}}
   while(orbTimes.length&&t>=orbTimes[0]){orbTimes.shift();let x,y,tries=0;do{x=ARENA.x+40+r()*(ARENA.w-80);y=ARENA.y+40+r()*(ARENA.h-80);}while((Math.hypot(x-P.x,y-P.y)<110||Math.hypot(x-P.x,y-P.y)>280)&&++tries<30);orbs.push({x,y,life:0});}
   for(let i=orbs.length-1;i>=0;i--){const o=orbs[i];o.life+=dt;if(Math.hypot(P.x-o.x,P.y-o.y)<26){taken++;orbs.splice(i,1);SND('puzzle_step');F.pop(o.x,o.y-22,'바람 원소 +1','#bff7e8',18);F.burst(o.x,o.y,12,'#bff7e8',160);F.ring(o.x,o.y,'rgba(190,255,236,.9)');}else if(o.life>3.4)orbs.splice(i,1);}
   F.update(dt);
  },
  over:()=>false,
  draw(ctx,t,phase){ctx.save();if(shake)ctx.translate((Math.random()-.5)*8,(Math.random()-.5)*8);arena(ctx,opts.color,opts.scene,opts.dark??.6);opts.backdrop?.(ctx,t);
   for(const w of warn){const a=.25+.35*Math.abs(Math.sin(w.life*18));ctx.fillStyle=w.color||'rgba(255,90,90,'+a+')';ctx.globalAlpha=a;if(w.rect)ctx.fillRect(w.x-w.w/2,w.y-w.h/2,w.w,w.h);else{ctx.beginPath();ctx.arc(w.x,w.y,w.r,0,TAU);ctx.fill();}ctx.globalAlpha=1;}
   for(const o of orbs){windOrb(ctx,o.x,o.y,o.life,1+Math.sin(o.life*8)*.08,false,1-o.life/3.4);tag(ctx,o.x,o.y+30,'바람 원소',1,'#d6fff4');}
   for(const b of bullets){if(b.delay&&b.life<b.delay)continue;if(b.ring){drawRing(ctx,b);continue;}if(b.style){drawShot(ctx,b);continue;}if(b.rect){ctx.fillStyle=b.color||'#cfefff';ctx.shadowColor=b.color||'#cfefff';ctx.shadowBlur=12;ctx.fillRect(b.x-b.w/2,b.y-b.h/2,b.w,b.h);ctx.shadowBlur=0;}else drawShot(ctx,b);}
   hero(ctx,P.x,P.y,inv&&Math.floor(inv*14)%2===0);F.draw(ctx);ctx.restore();},
  grade:()=>hits===0&&(!opts.orbs||taken>=m.orbs)?'great':hits<=2?'ok':'bad',
  hud:()=>'맞음 '+Math.min(hits,m.maxHits)+'/'+m.maxHits+(opts.orbs?' · 바람 원소 '+taken+'/'+m.orbs:''),
  summary:()=>(hits?Math.min(hits,m.maxHits)+'발 맞음':'완벽 회피')+(opts.orbs?' · 바람 원소 '+taken:''),
  result:()=>({hits:Math.min(hits,m.maxHits),...(opts.orbs?{orbs:taken}:{})})};
}
// 무상의 바람: the cube hangs above the box and throws rings, spirals, wind walls and aimed shots (원작: 탄막·돌풍 탄환).
const cube=t=>({x:W/2+Math.sin(t*.9)*180,y:52});
const ANEMO_PATTERNS=[
 (A,t)=>{const c=cube(t),n=14+Math.floor(A.r()*4),o=A.r()*TAU,s=150+A.r()*30;for(let i=0;i<n;i++){const a=o+i*TAU/n;A.add({x:c.x,y:c.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s});}return .95;},
 (A,t)=>{const side=A.r()<.5?-1:1,reach=Math.min(170,235*.7*Math.abs((side<0?A.P.x+10:W+10-A.P.x)/230)),gap=Math.max(ARENA.y+40,Math.min(ARENA.y+ARENA.h-40,A.P.y+(A.r()-.5)*2*reach));for(let y=ARENA.y+12;y<ARENA.y+ARENA.h;y+=26)if(Math.abs(y-gap)>40)A.add({x:side<0?-10:W+10,y,vx:-side*230,vy:0,r:7});return 1.05;},
 (A,t)=>{const c=cube(t),o=A.r()*TAU,dir=A.r()<.5?-1:1;for(let i=0;i<22;i++){const a=o+dir*i*.42;A.add({x:c.x,y:c.y,vx:Math.cos(a)*165,vy:Math.sin(a)*165,delay:i*.05,r:5});}return 1.25;},
 (A,t)=>{const c=cube(t);for(let k=0;k<3;k++){const a=Math.atan2(A.P.y-c.y,A.P.x-c.x)+(k-1)*.22;A.add({x:c.x,y:c.y,vx:Math.cos(a)*240,vy:Math.sin(a)*240,r:7,delay:k*.12,color:'#fff',glow:'rgba(255,255,255,.5)'});}return .8;},
 (A,t)=>{const reach=Math.min(200,235*.7*(A.P.y+10)/200),gap=Math.max(ARENA.x+50,Math.min(ARENA.x+ARENA.w-50,A.P.x+(A.r()-.5)*2*reach));for(let x=ARENA.x+14;x<ARENA.x+ARENA.w;x+=28)if(Math.abs(x-gap)>44)A.add({x,y:-10,vx:0,vy:200,r:7});return 1.05;}];
const anemoBackdrop=(ctx,t)=>{const c=cube(t);ctx.save();ctx.translate(c.x,c.y);ctx.rotate(t*1.4);glow(ctx,0,0,46,'rgba(116,224,198,.5)');ctx.strokeStyle='#bff7e8';ctx.lineWidth=2;ctx.strokeRect(-16,-16,32,32);ctx.rotate(.8);ctx.strokeRect(-11,-11,22,22);ctx.restore();};
// 안드리우스: the wolf runs down a lane that glows first, and ice claws fall where their shadow shows (원작: 2페이즈 질주·얼음 발톱).
const ANDRIUS_PATTERNS=[
 (A,t)=>{const horiz=A.r()<.55,lanes=A.r()<.35?2:1;for(let k=0;k<lanes;k++){if(horiz){const y=ARENA.y+40+A.r()*(ARENA.h-80),dir=A.r()<.5?-1:1;A.warn.push({rect:true,x:W/2,y,w:ARENA.w,h:54,life:0,ttl:.7,color:'rgba(159,216,239,.55)'});A.add({rect:true,w:90,h:46,x:dir<0?W+60:-60,y,vx:dir<0?-950:950,vy:0,delay:.7,ttl:2,color:'#d9f3ff',style:'wolf'});}
   else{const x=ARENA.x+40+A.r()*(ARENA.w-80),dir=A.r()<.5?-1:1;A.warn.push({rect:true,x,y:H/2,w:54,h:ARENA.h,life:0,ttl:.7,color:'rgba(159,216,239,.55)'});A.add({rect:true,w:46,h:90,x,y:dir<0?H+60:-60,vx:0,vy:dir<0?-850:850,delay:.7,ttl:2,color:'#d9f3ff',style:'wolf'});}}return 1.0;},
 (A,t)=>{const n=3+Math.floor(A.r()*3);for(let i=0;i<n;i++){const x=i===0?A.P.x:ARENA.x+40+A.r()*(ARENA.w-80),y=i===0?A.P.y:ARENA.y+40+A.r()*(ARENA.h-80);A.warn.push({x,y,r:34,life:0,ttl:.8,color:'rgba(120,180,220,.6)'});A.add({x,y,vx:0,vy:0,r:30,delay:.8,ttl:1.15,color:'#e6f7ff',glow:'rgba(159,216,239,.7)',style:'claw'});}return 1.2;},
 (A,t)=>{const side=Math.floor(A.r()*4),n=9;for(let i=0;i<n;i++){const u=(i+.5)/n,x=side===0?ARENA.x+u*ARENA.w:side===1?ARENA.x+u*ARENA.w:side===2?-5:W+5,y=side===0?-5:side===1?H+5:ARENA.y+u*ARENA.h,a=Math.atan2(A.P.y-y,A.P.x-x)+(A.r()-.5)*.5;A.add({x,y,vx:Math.cos(a)*190,vy:Math.sin(a)*190,r:6,color:'#e6f7ff',glow:'rgba(159,216,239,.6)',style:'shard'});}return .9;}];
const andriusBackdrop=(ctx,t)=>{ctx.fillStyle='rgba(159,216,239,.05)';for(let i=0;i<6;i++){const y=((t*60+i*70)%H);ctx.fillRect(0,y,W,1);}};
// 타르탈리아: fans of water blades from where he stands, and electro lances down the lines that glow first (원작: 마왕 무장).
const childe=t=>({x:W/2+Math.sin(t*1.3)*200,y:46});
const TARTAGLIA_PATTERNS=[
 (A,t)=>{const c=childe(t),base=Math.atan2(A.P.y-c.y,A.P.x-c.x);for(let k=-3;k<=3;k++){const a=base+k*.17;A.add({x:c.x,y:c.y,vx:Math.cos(a)*250,vy:Math.sin(a)*250,r:6,delay:Math.abs(k)*.04,color:'#dff6ff',glow:'rgba(127,212,255,.65)',style:'arrow'});}return .85;},
 (A,t)=>{const n=1+Math.floor(A.r()*2);for(let k=0;k<n;k++){const x=ARENA.x+30+A.r()*(ARENA.w-60);A.warn.push({rect:true,x,y:H/2,w:30,h:ARENA.h,life:0,ttl:.65,color:'rgba(201,155,255,.6)'});A.add({rect:true,x,y:H/2,w:26,h:ARENA.h,vx:0,vy:0,delay:.65,ttl:1.0,color:'#e7d2ff',style:'bolt'});}return .9;},
 (A,t)=>{const cx=ARENA.x+60+A.r()*(ARENA.w-120),cy=ARENA.y+60+A.r()*(ARENA.h-120),n=12,o=A.r()*TAU;A.warn.push({x:cx,y:cy,r:22,life:0,ttl:.45,color:'rgba(127,212,255,.6)'});for(let i=0;i<n;i++){const a=o+i*TAU/n;A.add({x:cx,y:cy,vx:Math.cos(a)*140,vy:Math.sin(a)*140,r:6,delay:.45,color:'#dff6ff',glow:'rgba(127,212,255,.55)',style:'arrow'});}return 1.0;},
 (A,t)=>{const y=ARENA.y+30+A.r()*(ARENA.h-60);A.warn.push({rect:true,x:W/2,y,w:ARENA.w,h:30,life:0,ttl:.65,color:'rgba(201,155,255,.6)'});A.add({rect:true,x:W/2,y,w:ARENA.w,h:26,vx:0,vy:0,delay:.65,ttl:1.0,color:'#e7d2ff',style:'bolt'});return .8;}];
// phase 1: arrows rain where their circles show, and aimed arrows; phase 2: lances down glowing lines and an Electro rush.
const TARTAGLIA_RAIN=(A,t)=>{const n=4+Math.floor(A.r()*3);for(let i=0;i<n;i++){const x=i===0?A.P.x:ARENA.x+40+A.r()*(ARENA.w-80),y=i===0?A.P.y:ARENA.y+40+A.r()*(ARENA.h-80);A.warn.push({x,y,r:28,life:0,ttl:.75,color:'rgba(127,212,255,.55)'});A.add({x,y,vx:0,vy:0,r:24,delay:.75,ttl:.95,color:'#dff6ff',glow:'rgba(127,212,255,.7)',style:'splash'});}return 1.0;};
const TARTAGLIA_RUSH=(A,t)=>{const y=A.P.y,dir=A.r()<.5?-1:1;A.warn.push({rect:true,x:W/2,y,w:ARENA.w,h:44,life:0,ttl:.6,color:'rgba(201,155,255,.55)'});A.add({rect:true,w:80,h:38,x:dir<0?W+50:-50,y,vx:dir<0?-980:980,vy:0,delay:.6,ttl:2,color:'#e7d2ff',style:'rush'});return .95;};
const TARTAGLIA_BY_PHASE={1:[TARTAGLIA_PATTERNS[0],TARTAGLIA_RAIN,TARTAGLIA_PATTERNS[2],TARTAGLIA_RAIN],2:[TARTAGLIA_PATTERNS[1],TARTAGLIA_RUSH,TARTAGLIA_PATTERNS[3],TARTAGLIA_RUSH]};
// 0.16.58 (user: 「타르탈리아 뒤에 황금옥 말고 탈탈이 각성된거 일러 넣어주고」, then the picture): 마왕 무장 behind the box, its mask up top.
const childeBackdrop=(ctx,t)=>{const c=childe(t),img=pic('assets/enemy_tartaglia_foul_legacy.webp');glow(ctx,c.x,c.y,40,'rgba(127,212,255,.6)');if(!img){ctx.fillStyle='#dff6ff';ctx.beginPath();ctx.moveTo(c.x,c.y-14);ctx.lineTo(c.x+9,c.y+10);ctx.lineTo(c.x-9,c.y+10);ctx.closePath();ctx.fill();return;}
 const r=17,cw=img.naturalWidth*.17,cx=img.naturalWidth*.515-cw/2,cy=img.naturalHeight*.25-cw/2;ctx.save();ctx.beginPath();ctx.arc(c.x,c.y,r,0,TAU);ctx.clip();ctx.drawImage(img,cx,cy,cw,cw,c.x-r,c.y-r,2*r,2*r);ctx.restore();ctx.strokeStyle='#7fd4ff';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(c.x,c.y,r,0,TAU);ctx.stroke();};
// 야타용왕: the stamp sends rings across the ground with one gap, and meteors fall where their shadow shows (원작: 충격파·운석).
// 0.16.58 (user: 「이런 ㅅㅂ 억까는 뭔데」, 「야타용왕은 여전히 억까 수준이 좀 있긴 하네」, then 「근데 야타용왕 너무 쉬운거같은데 이젠」): every gap opens
// into the box and only as far as one can run (half one's speed) before its ring arrives; the first gap opens away from where one stands
// (one has to move), and the next ring's gap moves on again. A careful bot looking 0.6 s ahead: 0.78 hits too easy, 1.38 in the unfair
// version, 1.17 now (60 runs).
const AZHDAHA_PATTERNS=[
 (A,t)=>{const cx=W/2+(A.r()-.5)*200,cy=H/2+(A.r()-.5)*120,d=Math.max(60,Math.hypot(A.P.x-cx,A.P.y-cy)),reach=(dt)=>Math.min(1.1,0.5*235*dt/d),sign=()=>A.r()<.5?-1:1;A.warn.push({x:cx,y:cy,r:30,life:0,ttl:.5,color:'rgba(240,196,106,.6)'});
  let gap=Math.atan2(A.P.y-cy,A.P.x-cx)+sign()*(0.4+A.r()*0.60)*reach(.5+d/230);for(let k=0;k<2;k++){A.add({ring:true,cx,cy,r0:10,R:0,speed:230,thick:12,gap,gapW:0.9,delay:.5+k*0.65,ttl:6,color:'#f0c46a'});gap+=sign()*reach(0.65)*(.6+A.r()*.4);}return 1.6;},
 (A,t)=>{const n=3+Math.floor(A.r()*2);for(let i=0;i<n;i++){const x=i===0?A.P.x:ARENA.x+40+A.r()*(ARENA.w-80),y=i===0?A.P.y:ARENA.y+40+A.r()*(ARENA.h-80);A.warn.push({x,y,r:39,life:0,ttl:0.95,color:'rgba(80,50,20,.75)'});A.add({x,y,vx:0,vy:0,r:35,delay:0.95,ttl:1.2,color:'#ffd27a',glow:'rgba(255,140,60,.7)',style:'meteor'});}return 1.05;},
 (A,t)=>{const left=A.r()<.5,cx=ARENA.x+(left?40:ARENA.w-40),cy=ARENA.y+ARENA.h-30,lo=left?-Math.PI/2+.18:-Math.PI+.18,hi=left?-.18:-Math.PI/2-.18,fit=a=>Math.max(lo,Math.min(hi,a)),d=Math.max(60,Math.hypot(A.P.x-cx,A.P.y-cy)),reach=(dt)=>Math.min(.8,0.5*235*dt/d),sign=()=>A.r()<.5?-1:1;
  A.warn.push({x:cx,y:cy,r:34,life:0,ttl:.5,color:'rgba(240,196,106,.6)'});let gap=fit(Math.atan2(A.P.y-cy,A.P.x-cx)+sign()*(0.4+A.r()*0.60)*reach(.5+d/260));for(let k=0;k<3;k++){A.add({ring:true,cx,cy,r0:10,R:0,speed:260,thick:10,gap,gapW:0.9,delay:.5+k*0.55,ttl:6,color:'#f0c46a'});gap=fit(gap+sign()*reach(0.55)*(.6+A.r()*.4));}return 1.9;}];
const azhdahaBackdrop=(ctx,t)=>{ctx.strokeStyle='rgba(240,196,106,.08)';ctx.lineWidth=2;for(let i=0;i<5;i++){ctx.beginPath();ctx.moveTo(ARENA.x,ARENA.y+40+i*70);ctx.lineTo(ARENA.x+ARENA.w,ARENA.y+60+i*70);ctx.stroke();}};
const GAMES={
 TARTAGLIA_DODGE:(m,r)=>dodge(m,r,TARTAGLIA_BY_PHASE[m.phase]||TARTAGLIA_PATTERNS,{orbs:false,color:m.phase===2?'#c99bff':'#7fd4ff',backdrop:childeBackdrop,scene:'TARTAGLIA',dark:.74}),
 AZHDAHA_DODGE:(m,r)=>dodge(m,r,AZHDAHA_PATTERNS,{orbs:false,color:'#f0c46a',backdrop:azhdahaBackdrop,scene:'AZHDAHA'}),
 ANEMO_DODGE:(m,r)=>dodge(m,r,ANEMO_PATTERNS,{orbs:true,color:'#74e0c6',backdrop:anemoBackdrop,scene:'ANEMO'}),
 // 0.16.54 유적의 뱀 · 약점 저격 (user: 「공략이랑 비슷한 느낌을 주되, 아이디어는 참신한 것으로」, 「미니게임은 난이도가 꽤 되어야」).
 // 원작: during its barrage and shockwave four weak points glow yellow on its body segments; breaking all four lays it down.
 // Here the serpent winds through the box, four of its segments glow, and it dips into the sand now and then (no hit lands then).
 SERPENT_SNIPE(m,r){
  const N=15,GAP=19,points=Math.max(1,m.points|0),path=[],segs=[],F=fxKit();let shots=Math.max(1,m.shots|0),hits=0,dive=0,diveAt=1.3+r()*.6,ph=r()*TAU,flash=0,end=0;const marks=[];
  const idx=[];while(idx.length<points){const i=2+Math.floor(r()*(N-3));if(!idx.includes(i)&&idx.every(j=>Math.abs(j-i)>1))idx.push(i);}
  const weak=new Set(idx),broken=new Set();
  const head=t=>({x:W/2+Math.sin(t*.95+ph)*(W/2-70)+Math.sin(t*2.3)*30,y:H/2+Math.sin(t*1.55+ph*1.7)*(H/2-60)});
  for(let k=0;k<N*GAP;k++){const p=head(-k/120);path.push(p);}
  const place=()=>{segs.length=0;let acc=0,j=0;for(let i=0;i<N;i++){while(j<path.length-1&&acc<i*GAP){acc+=Math.hypot(path[j+1].x-path[j].x,path[j+1].y-path[j].y);j++;}segs.push(path[j]);}};place();
  return{
   update(dt,t,inp){const sp=t>4?1.3:1;path.unshift(head(t*sp));if(path.length>N*GAP*2)path.length=N*GAP*2;place();F.update(dt);if(end)end+=dt;
    flash=Math.max(0,flash-dt);diveAt-=dt;if(diveAt<=0&&!dive){dive=.75;diveAt=1.5+r()*.8;}dive=Math.max(0,dive-dt);
    for(const tap of inp.taps){if(shots<=0||end)break;shots--;let hit=null;if(!dive)for(const i of weak)if(!broken.has(i)&&Math.hypot(segs[i].x-tap.x,segs[i].y-tap.y)<13){hit=i;break;}
     marks.push({...tap,life:0,miss:!hit&&hit!==0,sand:!!dive});
     if(hit!==null){broken.add(hit);hits++;flash=.2;const p=segs[hit],last=hits>=points;SND('puzzle_light');F.burst(p.x,p.y,last?34:18,'#ffe58a',last?320:240,3.4);F.ring(p.x,p.y,'rgba(255,240,190,.95)',10,80);F.pop(p.x,p.y-30,last?'약점 모두 파괴!':'약점 파괴! '+hits+'/'+points,'#ffe58a',last?30:24);F.jolt(last?.45:.25);if(last){F.flash(.35,'255,230,160');end=.001;}}
     else{SND('error');F.pop(tap.x,tap.y-16,dive?'모래 속이라 안 맞음':'빗나감','#ff9c9c',dive?17:16);}}
    for(let i=marks.length-1;i>=0;i--){marks[i].life+=dt;if(marks[i].life>.6)marks.splice(i,1);}},
   over:()=>end>.75||!end&&shots<=0&&marks.every(k=>k.life>.35),
   draw(ctx,t,phase){ctx.save();F.shakeBy(ctx);scene(ctx,'SERPENT',.62);ctx.fillStyle='rgba(42,33,22,.35)';ctx.fillRect(0,0,W,H);
    for(let i=0;i<26;i++){ctx.fillStyle='rgba(210,180,120,.07)';ctx.fillRect((i*83+t*22)%W,(i*47)%H,3,2);}
    ctx.globalAlpha=dive?.25:1;
    // the body: armour plates along the way it winds, lit on top and dark underneath; the head with its glowing eye
    for(let i=N-1;i>=0;i--){const p=segs[i],q=segs[Math.min(N-1,i+1)],ang=i===N-1?Math.atan2(segs[i-1].y-p.y,segs[i-1].x-p.x):Math.atan2(p.y-q.y,p.x-q.x),rad=i===0?17:13-i*.25;
     ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ang);const gr=ctx.createLinearGradient(0,-rad,0,rad);gr.addColorStop(0,'#aeb1a8');gr.addColorStop(.55,'#6b6f68');gr.addColorStop(1,'#2e302b');ctx.fillStyle=gr;
     ctx.beginPath();if(i===0){ctx.moveTo(rad*1.55,0);ctx.lineTo(rad*.3,-rad);ctx.lineTo(-rad,-rad*.85);ctx.lineTo(-rad,rad*.85);ctx.lineTo(rad*.3,rad);ctx.closePath();}else ctx.ellipse(0,0,rad*1.2,rad,0,0,TAU);ctx.fill();
     ctx.strokeStyle='rgba(255,236,190,.4)';ctx.lineWidth=1.6;ctx.beginPath();ctx.ellipse(0,0,rad*1.2,rad,0,Math.PI*1.12,Math.PI*1.88);ctx.stroke();
     ctx.strokeStyle='rgba(25,24,20,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-rad*.95,0);ctx.lineTo(rad*.95,0);ctx.stroke();
     if(i===0){glow(ctx,rad*.75,-5,10,'rgba(255,210,122,.95)');ctx.fillStyle='#ffd27a';ctx.beginPath();ctx.arc(rad*.75,-5,2.8,0,TAU);ctx.fill();}
     ctx.restore();
     if(weak.has(i)&&!broken.has(i)){glow(ctx,p.x,p.y,24+Math.sin(t*9)*3,'rgba(242,211,107,.9)');ctx.fillStyle=flash?'#ffffff':'#ffe58a';ctx.beginPath();ctx.moveTo(p.x,p.y-7);ctx.lineTo(p.x+6,p.y);ctx.lineTo(p.x,p.y+7);ctx.lineTo(p.x-6,p.y);ctx.closePath();ctx.fill();}
     if(broken.has(i)){ctx.strokeStyle='#1d140b';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(p.x-6,p.y-5);ctx.lineTo(p.x-1,p.y+1);ctx.lineTo(p.x+5,p.y-3);ctx.moveTo(p.x-1,p.y+1);ctx.lineTo(p.x+1,p.y+7);ctx.stroke();ctx.fillStyle='rgba(60,50,40,.35)';ctx.beginPath();ctx.arc(p.x+Math.sin(t*3+i)*3,p.y-10-((t*20+i*7)%14),5,0,TAU);ctx.fill();}}
    if(!dive)for(const i of weak)if(!broken.has(i))tag(ctx,segs[i].x,segs[i].y-24,'약점',early(t,phase),'#ffe58a');
    ctx.globalAlpha=1;
    if(dive){ctx.fillStyle='rgba(210,180,120,.28)';for(const p of segs){ctx.beginPath();ctx.arc(p.x,p.y,22,0,TAU);ctx.fill();}ctx.fillStyle='#f6e7c3';ctx.font='bold 22px sans-serif';ctx.textAlign='center';ctx.fillText('모래 속으로',W/2,34);}
    for(const k of marks){ctx.strokeStyle=k.miss?'rgba(255,140,140,'+(1-k.life*1.6)+')':'rgba(255,255,255,'+(1-k.life*1.6)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(k.x,k.y,6+k.life*30,0,TAU);ctx.stroke();}
    F.draw(ctx);ctx.restore();},
   grade:()=>hits>=points?'great':hits?'ok':'bad',
   hud:()=>'약점 '+hits+'/'+points+' · 남은 탄 '+shots,
   summary:()=>hits>=points?'약점을 모두 부쉈다':hits?'약점 '+hits+'곳 명중':'모두 빗나감',
   result:()=>({hits})};
 },
 // 0.16.57 (user: 「무상의 얼음은... 어케하는건지 잘 모르겟네.. 다 좋은데 미니게임이 뭔가 애매하다잉..? 뭔가 컨트롤 하는 느낌이 잘 안든달까」):
 // the fruits are picked up and thrown by one's own hand. 원작: the shielded 무상의 얼음 drops Frostfruits; the player carries one to it
 // and hits the shield with it. One walks (WASD · 방향키, or drags anywhere on a phone), steps on a fruit to pick it up, and throws it
 // (click · 스페이스 · 던지기) straight at the core; the ice shards circling it break a fruit that meets them. Frost spikes rise where one
 // stands — step off the glow or freeze for a moment.
 // 0.16.58 (user: 「무상의 얼음의 문제점은... 어디 한번 넣어보시지! 같은 느낌」, 「뭔가 성공시키는 맛이 있어야되는데 그게 없네」, 「돌아가는게
 // 너무 빨라서 그런가? … 그렇다고 너무 느려져도 재미 없을 것 같달까」, 「어떤게 서리열매인지 그런것도 모르겠고」): the shards keep a beat
 // instead of a blur — they spin, brake to a halt for a moment (the time to line up a throw), glint, and set off again, often the other
 // way — so a throw can be read and timed. A fruit right through the middle of a gap is 「완벽!」 and costs no throw. Every hit knocks a
 // layer of ice off the shield in a burst of shards; the last one shatters it (「보호막 붕괴!」, a beat of slow motion). A blocked fruit
 // bursts on the shard with 「막힘」. The fruits look like fruit and carry their name.
 FROST_FRUIT(m,r){
  const C={x:W/2,y:H/2+6},SH=38,RING=76,KEEP=RING+18,need=Math.max(1,m.need|0),P={x:W/2,y:H-58},ground=[],flying=[],spikes=[],bits=[],pops=[],rings=[];
  const SHOTS=Math.max(1,m.shots|0);let throws=SHOTS,stock=Math.max(throws,m.fruits|0||6),carry=false,hits=0,frozen=0,flash=0,spikeAt=1.3,dropAt=0,lastFire=0,shake=0,slow=0,streak=0,broke=0,windup=0,lastT=0;
  const shards=[0,1,2,3].map(i=>({a:i*TAU/4+r()*.3,w:1,glint:0})),FLY=430,SPEED=1.5,PERFECT=.2;
  // the beat, planned a few steps ahead so the aim line can read it: SPIN (1.0–1.5 s) → STOP (.6 s still) → WARN (.3 s, the shards
  // glint) → SPIN again, the other way three times in five. The shards speed up and brake smoothly.
  const plan=[];const extend=()=>{while(plan.length<6){const last=plan[plan.length-1];
   plan.push(!last?{mode:'SPIN',dur:1.1+r()*.4,dir:r()<.5?-1:1}:last.mode==='SPIN'?{mode:'STOP',dur:.6,dir:last.dir}:last.mode==='STOP'?{mode:'WARN',dur:.3,dir:last.dir}:{mode:'SPIN',dur:1+r()*.5,dir:r()<.6?-last.dir:last.dir});}};
  extend();const beat={i:0,left:plan[0].dur,omega:plan[0].dir*SPEED};
  const advance=(s,dt,t)=>{s.left-=dt;while(s.left<=0&&s.i<plan.length-1){s.i++;s.left+=plan[s.i].dur;}const seg=plan[s.i],goal=seg.mode==='SPIN'?seg.dir*SPEED*(t>7?1.2:1):0,acc=seg.mode==='SPIN'?7:9;
   s.omega+=Math.max(-acc*dt,Math.min(acc*dt,goal-s.omega));return s.omega;};
  const mode=()=>plan[beat.i].mode;
  // how far a fruit at angle a passes from the nearest shard edge (below 0 = into a shard), now or after `ahead` seconds of the beat
  const clearance=(a,ahead=0)=>{let shift=0;if(ahead>0){const s={...beat},n=Math.max(1,Math.ceil(ahead*60)),h=ahead/n;for(let k=0;k<n;k++)shift+=advance(s,h,lastT+k*h)*h;}
   return Math.min(...shards.map(q=>angGap(a,q.a+shift)-q.w/2));};
  const blocked=(a,ahead=0)=>clearance(a,ahead)<0;
  const ell=(a,rad)=>({x:C.x+Math.cos(a)*rad*1.45,y:C.y+Math.sin(a)*rad*.86}),norm=(x,y)=>Math.hypot((x-C.x)/1.45,(y-C.y)/.86);
  const flight=()=>Math.max(0,(norm(P.x,P.y)-RING-6)/FLY);
  const drop=()=>{if(stock<=0||ground.length>=2)return;let p,k=0;do{p=ell(r()*TAU,118+r()*72);}while((Math.hypot(p.x-P.x,p.y-P.y)<90||ground.some(g=>Math.hypot(g.x-p.x,g.y-p.y)<80))&&++k<40);
   p.x=Math.max(ARENA.x+24,Math.min(ARENA.x+ARENA.w-24,p.x));p.y=Math.max(ARENA.y+54,Math.min(ARENA.y+ARENA.h-30,p.y));ground.push({...p,life:0});stock--;};
  drop();drop();
  const angTo=()=>Math.atan2((P.y-C.y)/.86,(P.x-C.x)/1.45);
  // sparks and words fly with the screen's own random (the result never depends on them)
  const burst=(x,y,n,color,speed,size=3)=>{for(let i=0;i<n;i++){const a=Math.random()*TAU,v=speed*(.4+Math.random()*.8);bits.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-speed*.3,life:0,ttl:.55+Math.random()*.4,color,size:size*(.6+Math.random()*.8)});}};
  const pop=(x,y,text,color,size)=>pops.push({x,y,text,color,size,life:0});
  const fire=()=>{if(!carry||frozen||throws<=0)return;carry=false;throws--;windup=.14;flying.push({a:angTo(),rad:norm(P.x,P.y),checked:false,trail:[]});SND('click');if(!ground.length)dropAt=.5;};
  // the fruit: round and pale blue with a facet, a green stalk and leaf, and frost glints — nothing else in the box looks like it
  const fruit=(ctx,x,y,s=1)=>{glow(ctx,x,y,20*s,'rgba(150,220,255,.55)');ctx.save();ctx.translate(x,y);ctx.scale(s,s);
   ctx.fillStyle='#dff4ff';ctx.beginPath();ctx.arc(0,1,9,0,TAU);ctx.fill();ctx.fillStyle='#9fd9ff';ctx.beginPath();ctx.moveTo(-7,3);ctx.lineTo(0,-2);ctx.lineTo(7,3);ctx.lineTo(0,9);ctx.closePath();ctx.fill();
   ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(-3,-2,2.6,0,TAU);ctx.fill();ctx.strokeStyle='#7fd88a';ctx.lineWidth=2.4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-8);ctx.lineTo(0,-12);ctx.stroke();
   ctx.fillStyle='#7fd88a';ctx.beginPath();ctx.ellipse(5,-12,5,2.4,-.5,0,TAU);ctx.fill();
   ctx.strokeStyle='#ffffff';ctx.lineWidth=1.4;for(const [cx,cy]of [[-12,-4],[12,3],[-7,12]]){ctx.beginPath();ctx.moveTo(cx-3,cy);ctx.lineTo(cx+3,cy);ctx.moveTo(cx,cy-3);ctx.lineTo(cx,cy+3);ctx.stroke();}ctx.restore();};
  return{
   update(dtReal,t,inp){
    // a beat of slow motion after a perfect hit and when the shield breaks
    slow=Math.max(0,slow-dtReal);shake=Math.max(0,shake-dtReal);const dt=dtReal*(slow>0?.3:1);
    lastT=t;frozen=Math.max(0,frozen-dt);flash=Math.max(0,flash-dt);windup=Math.max(0,windup-dt);
    const w=advance(beat,dt,t);while(beat.i>0){plan.shift();beat.i--;}extend();for(const q of shards){q.a+=w*dt;q.glint=mode()==='WARN'?1:Math.max(0,q.glint-dt*3);}
    if(broke)broke+=dt;
    let dx=(inp.keys.has('R')?1:0)-(inp.keys.has('L')?1:0)+inp.pad[0],dy=(inp.keys.has('D')?1:0)-(inp.keys.has('U')?1:0)+inp.pad[1];
    if(!frozen&&!broke&&(dx||dy)){const n=Math.hypot(dx,dy);P.x+=dx/n*215*dt;P.y+=dy/n*215*dt;}
    P.x=Math.max(ARENA.x+10,Math.min(ARENA.x+ARENA.w-10,P.x));P.y=Math.max(ARENA.y+10,Math.min(ARENA.y+ARENA.h-10,P.y));
    const d=norm(P.x,P.y);if(d<KEEP){const a=angTo(),q=ell(a,KEEP);P.x=q.x;P.y=q.y;}
    if(!carry&&!frozen&&!broke)for(let i=ground.length-1;i>=0;i--)if(Math.hypot(ground[i].x-P.x,ground[i].y-P.y)<22){ground.splice(i,1);carry=true;SND('puzzle_step');dropAt=1.1;break;}
    if((inp.fire||inp.taps.length)&&t-lastFire>.15&&!broke){lastFire=t;fire();}inp.fire=0;
    for(const g of ground)g.life+=dt;if(dropAt>0){dropAt-=dt;if(dropAt<=0)drop();}if(ground.length<1&&!carry&&dropAt<=0)drop();
    for(let i=flying.length-1;i>=0;i--){const q=flying[i];q.rad-=FLY*dt;const p=ell(q.a,q.rad);q.trail.push({x:p.x,y:p.y});if(q.trail.length>7)q.trail.shift();q.x=p.x;q.y=p.y;
     if(!q.checked&&q.rad<=RING+6){q.checked=true;const c=clearance(q.a);q.perfect=c>=PERFECT;
      if(c<0){flying.splice(i,1);streak=0;burst(p.x,p.y,12,'#bfe9ff',190,3.2);pop(p.x,p.y-16,'막힘','#ff9c9c',20);for(const s of shards)if(angGap(q.a,s.a)<s.w/2+.05)s.glint=1;shake=.14;SND('guard');continue;}}
     if(q.rad<=SH){flying.splice(i,1);hits++;const done=hits>=need;streak=q.perfect?streak+1:0;flash=.35;rings.push({r:SH+(need-hits)*7,life:0});
      if(q.perfect&&!done&&throws<SHOTS)throws++;
      burst(p.x,p.y,q.perfect?22:14,'#e6f8ff',q.perfect?300:230,q.perfect?4:3.4);if(q.perfect)burst(p.x,p.y,12,'#ffd77a',260,3);
      if(!done)pop(C.x,C.y-SH-34,q.perfect?(streak>1?'완벽! ×'+streak:'완벽!'):'명중!',q.perfect?'#ffe08a':'#ffffff',q.perfect?32:26);
      shake=q.perfect?.35:.22;if(q.perfect)slow=.18;SND(q.perfect?'constellation_node':'ice');
      if(done){broke=.001;slow=.5;shake=.6;flash=.6;burst(C.x,C.y,46,'#e6f8ff',380,4.2);burst(C.x,C.y,20,'#a8e4ff',240,5);pop(C.x,C.y-4,'보호막 붕괴!','#ffffff',42);SND('ice');SND('quest_complete');}}}
    spikeAt-=dt;if(spikeAt<=0&&!broke){spikeAt=(t>6?1.0:1.3)+r()*.3;spikes.push({x:P.x,y:P.y,life:0,up:false});if(t>6){const a=r()*TAU;spikes.push({x:Math.max(ARENA.x+30,Math.min(ARENA.x+ARENA.w-30,P.x+Math.cos(a)*70)),y:Math.max(ARENA.y+30,Math.min(ARENA.y+ARENA.h-30,P.y+Math.sin(a)*50)),life:0,up:false});}}
    for(let i=spikes.length-1;i>=0;i--){const s=spikes[i];s.life+=dt;if(!s.up&&s.life>=.8){s.up=true;if(!frozen&&Math.hypot(P.x-s.x,P.y-s.y)<34){frozen=1;shake=.2;burst(P.x,P.y,10,'#bfe9ff',160);SND('freeze');}}if(s.life>1.2)spikes.splice(i,1);}
    for(let i=bits.length-1;i>=0;i--){const b=bits[i];b.life+=dt;b.vy+=420*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.life>b.ttl)bits.splice(i,1);}
    for(let i=pops.length-1;i>=0;i--){pops[i].life+=dt;if(pops[i].life>.9)pops.splice(i,1);}
    for(let i=rings.length-1;i>=0;i--){rings[i].life+=dt;if(rings[i].life>.5)rings.splice(i,1);}
   },
   over:()=>broke>.9||!broke&&((throws<=0&&!flying.length)||(!carry&&!flying.length&&!ground.length&&stock<=0)),
   draw(ctx,t,phase){ctx.save();if(shake)ctx.translate((Math.random()-.5)*16*shake,(Math.random()-.5)*16*shake);arena(ctx,'#a8e4ff','CRYO',.7,C);for(let i=0;i<26;i++){ctx.fillStyle='rgba(168,228,255,.1)';ctx.fillRect((i*97+t*14)%W,(i*53)%H,2,2);}
    for(const s of spikes){if(!s.up){const k=s.life/.8;ctx.strokeStyle='rgba(168,228,255,.85)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(s.x,s.y,34,22,0,0,TAU);ctx.stroke();ctx.fillStyle='rgba(168,228,255,'+(.12+k*.3)+')';ctx.beginPath();ctx.ellipse(s.x,s.y,34*k,22*k,0,0,TAU);ctx.fill();}
     else{const a=1-(s.life-.8)/.4;ctx.fillStyle='rgba(235,250,255,'+Math.max(0,a)+')';for(let k=0;k<5;k++){const x=s.x-20+k*10;ctx.beginPath();ctx.moveTo(x-5,s.y+8);ctx.lineTo(x,s.y-22-(k%2)*8);ctx.lineTo(x+5,s.y+8);ctx.fill();}}}
    // the shard ring, still for a calm moment and glinting before it sets off again; then the shield in layers (one knocked off
    // by each hit) around the brightening core
    ctx.save();ctx.translate(C.x,C.y);ctx.scale(1.45,.86);ctx.strokeStyle='rgba(168,228,255,.14)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,0,RING,0,TAU);ctx.stroke();
    if(!broke){for(const q of shards){ctx.strokeStyle=q.glint>0?'rgba(255,255,255,'+(.7+q.glint*.3)+')':'#e6f7ff';ctx.shadowColor=q.glint>0?'#ffffff':'#a8e4ff';ctx.shadowBlur=12+q.glint*14;ctx.lineWidth=10+q.glint*2;ctx.beginPath();ctx.arc(0,0,RING,q.a-q.w/2,q.a+q.w/2);ctx.stroke();ctx.shadowBlur=0;}
     for(let k=0,n=Math.max(0,need-hits);k<n;k++){ctx.strokeStyle='rgba(205,239,255,'+(.6-k*.14)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,SH+k*7,0,TAU);ctx.stroke();}
     ctx.fillStyle='rgba(168,228,255,'+(.34-hits/need*.2)+')';ctx.beginPath();ctx.arc(0,0,SH,0,TAU);ctx.fill();ctx.strokeStyle=flash?'#fff':'#cdefff';ctx.lineWidth=3;ctx.stroke();}
    for(const g of rings){ctx.strokeStyle='rgba(255,255,255,'+Math.max(0,1-g.life*2)+')';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,g.r+g.life*90,0,TAU);ctx.stroke();}
    ctx.restore();
    ctx.save();ctx.translate(C.x,C.y);ctx.rotate(t*(.8+hits*1.2));glow(ctx,0,0,30+hits*10,'rgba(168,228,255,'+(.25+hits*.15)+')');ctx.strokeStyle=broke?'#ffffff':'#bfe9ff';ctx.lineWidth=2;ctx.strokeRect(-13,-13,26,26);ctx.restore();
    if(!broke)for(let k=0;k<hits;k++){ctx.strokeStyle='rgba(255,255,255,.85)';ctx.lineWidth=2;ctx.beginPath();const a=k*2.1+.5;ctx.moveTo(C.x,C.y);ctx.lineTo(C.x+Math.cos(a)*(SH+6)*1.45,C.y+Math.sin(a)*(SH+6)*.86);ctx.stroke();}
    for(const g of ground){const b=Math.sin(g.life*5)*2;fruit(ctx,g.x,g.y+b,1.15);tag(ctx,g.x,g.y+b+29,'서리 열매',1,'#e6f8ff');}
    {const ea=early(t,phase);if(ea&&!broke){const q=shards[0],p=ell(q.a,RING+24);tag(ctx,p.x,p.y,'얼음 조각 · 막힘',ea,'#cdefff');tag(ctx,C.x,C.y-23,'얼음 보호막',ea,'#e6f8ff',11);}}
    // the aim line while a fruit is held: red where a shard will be in the way when it arrives, blue where it gets through,
    // gold when it goes right through the middle
    if(carry&&phase==='PLAY'&&!broke){const a=angTo(),c=clearance(a,flight()),edge=ell(a,SH);ctx.save();ctx.setLineDash([8,7]);ctx.strokeStyle=c<0?'rgba(255,120,120,.9)':c>=PERFECT?'rgba(255,215,120,.95)':'rgba(120,220,255,.95)';ctx.lineWidth=c>=PERFECT?4:3;ctx.beginPath();ctx.moveTo(P.x,P.y);ctx.lineTo(edge.x,edge.y);ctx.stroke();ctx.restore();}
    for(const q of flying){q.trail.forEach((p,i)=>glow(ctx,p.x,p.y,5+i*1.6,'rgba(200,240,255,'+(.08+i*.06)+')'));fruit(ctx,q.x,q.y,.9);}
    for(const b of bits){ctx.globalAlpha=Math.max(0,1-b.life/b.ttl);ctx.fillStyle=b.color;ctx.save();ctx.translate(b.x,b.y);ctx.rotate(b.life*9);ctx.fillRect(-b.size/2,-b.size/2,b.size,b.size*1.6);ctx.restore();ctx.globalAlpha=1;}
    // the player, with the fruit held up (and the swing of a throw)
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(P.x,P.y+12,13,5,0,0,TAU);ctx.fill();glow(ctx,P.x,P.y,26,frozen?'rgba(168,228,255,.6)':'rgba(255,224,138,.35)');hero(ctx,P.x,P.y,false,13,frozen?'#a8e4ff':'#ffe08a');if(carry)fruit(ctx,P.x,P.y-28,.85);
    if(windup){ctx.strokeStyle='rgba(255,255,255,'+Math.min(1,windup*6)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(P.x,P.y-6,22,-2.6,-.6);ctx.stroke();}
    for(const p of pops){const k=p.life/.9,grow=k<.12?1+(.12-k)*4:1;ctx.globalAlpha=Math.max(0,1-k*k);ctx.fillStyle=p.color;ctx.font='900 '+Math.round(p.size*grow)+'px sans-serif';ctx.textAlign='center';ctx.lineWidth=5;ctx.strokeStyle='rgba(8,19,26,.85)';ctx.strokeText(p.text,p.x,p.y-k*26);ctx.fillText(p.text,p.x,p.y-k*26);ctx.globalAlpha=1;}
    if(broke&&flash>.25){ctx.fillStyle='rgba(255,255,255,'+(flash-.25)*1.6+')';ctx.fillRect(0,0,W,H);}
    if(frozen){ctx.fillStyle='rgba(168,228,255,'+(.15+frozen*.2)+')';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 26px sans-serif';ctx.textAlign='center';ctx.fillText('얼어붙었다',W/2,46);}
    else if(phase==='PLAY'&&!broke){const md=mode(),hint=md==='STOP'?'멈췄다! 지금이야':md==='WARN'?'곧 다시 돈다':t<3?(carry?'조준선이 파랄 때 던지기':'서리 열매를 주우세요'):'';
     if(hint){ctx.fillStyle=md==='STOP'?'rgba(255,224,138,.95)':'rgba(255,255,255,.85)';ctx.font='bold 18px sans-serif';ctx.textAlign='center';ctx.fillText(hint,W/2,46);}}
    ctx.restore();},
   grade:()=>hits>=need?'great':hits?'ok':'bad',
   hud:()=>'보호막 '+hits+'/'+need+' · 남은 던지기 '+throws+(carry?' · 열매 들고 있음':''),
   summary:()=>hits>=need?'얼음 보호막이 깨졌다':hits?'서리 열매 '+hits+'번 맞힘':'모두 막혔다',
   result:()=>({hits:Math.min(hits,need)})};
 },
 // 0.16.54 무상의 바람 · 바람 원소 모으기 (user: 「피가 1이 되면 무적이 되고 주변에 날아다니면서 바람 원소 수집하는걸 미니게임으로」, 「미니게임은
 // 난이도가 꽤 되어야」; the cube stays in the middle, invulnerable, and only attacks; the wind currents carry the player). 원작: at the
 // end it turns invulnerable, five Anemo orbs (four still, one drifting) hang around it and the player rides the wind currents to
 // take them; what is left, it draws in. Here one flies (slowly on one's own, fast in a current that also pushes along its flow)
 // among the cube's rings, spirals and aimed shots; touching the cube or a shot is one hit (whole-party damage).
 ANEMO_ORBS(m,r){
  const C={x:W/2,y:H/2},P={x:W/2,y:H-62},n=Math.max(0,Math.min(5,m.orbs|0)),orbs=[],bullets=[],gone=[],streams=[],F=fxKit();let hits=0,taken=0,inv=0,shake=0,next=.9,step=0,drawIn=0;
  // three currents across the box: two lanes along it and one up or down a side, each flowing one way (the seed picks)
  const lane=(horiz,at,dir)=>horiz?{x:ARENA.x,y:at-24,w:ARENA.w,h:48,fx:dir*190,fy:0}:{x:at-24,y:ARENA.y,w:48,h:ARENA.h,fx:0,fy:dir*190};
  const top=ARENA.y+58+r()*30,bottom=ARENA.y+ARENA.h-58-r()*30,side=r()<.5?ARENA.x+70+r()*30:ARENA.x+ARENA.w-70-r()*30;
  streams.push(lane(true,top,r()<.5?1:-1),lane(true,bottom,r()<.5?1:-1),lane(false,side,r()<.5?1:-1));
  const inStream=(x,y)=>streams.find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);
  // the four still orbs sit far from the cube and from each other; the fifth wanders fast around the box
  for(let i=0;i<n;i++){const drift=n>1&&i===n-1;let x,y,k=0;
   // two of them close to the cube, where its shots are thickest; the rest out towards the walls
   do{const ang=r()*TAU,rad=i<2?96+r()*40:160+r()*100;x=Math.max(ARENA.x+30,Math.min(ARENA.x+ARENA.w-30,C.x+Math.cos(ang)*rad*1.5));y=Math.max(ARENA.y+30,Math.min(ARENA.y+ARENA.h-30,C.y+Math.sin(ang)*rad*.75));}
   while((Math.hypot(x-P.x,y-P.y)<170||orbs.some(o=>Math.hypot(o.x-x,o.y-y)<110))&&++k<60);
   orbs.push({x,y,life:0,drift:drift?{a:r()*TAU,b:r()*TAU}:null});}
  const add=o=>bullets.push({r:6,life:0,ttl:7,...o});
  const PATTERNS=[
   (t)=>{const k=12+Math.floor(r()*4),o=r()*TAU,v=(145+r()*25)*(t>5?1.1:1);for(let i=0;i<k;i++){const q=o+i*TAU/k;add({x:C.x,y:C.y,vx:Math.cos(q)*v,vy:Math.sin(q)*v});}return t>5?.85:1.0;},
   (t)=>{const o=r()*TAU,dir=r()<.5?-1:1;for(let i=0;i<20;i++){const q=o+dir*i*.42;add({x:C.x,y:C.y,vx:Math.cos(q)*175,vy:Math.sin(q)*175,delay:i*.04,r:5});}return 1.0;},
   (t)=>{for(let k=0;k<3;k++){const q=Math.atan2(P.y-C.y,P.x-C.x)+(k-1)*.2;add({x:C.x,y:C.y,vx:Math.cos(q)*220,vy:Math.sin(q)*220,r:7,delay:k*.1,color:'#fff',glow:'rgba(255,255,255,.5)'});}return .85;}];
  const hit=()=>{if(inv)return;hits++;inv=.85;shake=.25;SND('error');F.pop(P.x,P.y-26,'맞음!','#ff9c9c',22);F.burst(P.x,P.y,10,'#ffb0b0',170);F.flash(.35,'255,70,70');};
  return{
   update(dt,t,inp){
    let dx=(inp.keys.has('R')?1:0)-(inp.keys.has('L')?1:0)+inp.pad[0],dy=(inp.keys.has('D')?1:0)-(inp.keys.has('U')?1:0)+inp.pad[1];
    const q=inStream(P.x,P.y),sp=q?265:180;
    if(dx||dy){const d=Math.hypot(dx,dy);P.x+=dx/d*sp*dt;P.y+=dy/d*sp*dt;}
    else if(inp.down&&inp.point){const ex=inp.point.x-P.x,ey=inp.point.y-P.y,d=Math.hypot(ex,ey);if(d>2){const s2=Math.min(d,sp*1.2*dt);P.x+=ex/d*s2;P.y+=ey/d*s2;}}
    if(q){P.x+=q.fx*dt;P.y+=q.fy*dt;}
    P.x=Math.max(ARENA.x+8,Math.min(ARENA.x+ARENA.w-8,P.x));P.y=Math.max(ARENA.y+8,Math.min(ARENA.y+ARENA.h-8,P.y));
    while(t>=next){next+=PATTERNS[step%PATTERNS.length](t);step++;}
    for(const b of bullets){b.life+=dt;if(b.delay&&b.life<b.delay)continue;b.x+=b.vx*dt;b.y+=b.vy*dt;}
    for(let i=bullets.length-1;i>=0;i--){const b=bullets[i];if(b.life>b.ttl||b.x<-40||b.x>W+40||b.y<-40||b.y>H+40)bullets.splice(i,1);}
    for(const o of orbs){o.life+=dt;if(o.drift){o.x=W/2+Math.sin(t*1.45+o.drift.a)*(ARENA.w/2-40);o.y=H/2+Math.sin(t*2.05+o.drift.b)*(ARENA.h/2-36);}}
    for(let i=orbs.length-1;i>=0;i--){const o=orbs[i];if(Math.hypot(P.x-o.x,P.y-o.y)<26){taken++;orbs.splice(i,1);SND('puzzle_step');gone.push({x:o.x,y:o.y,life:0});F.pop(o.x,o.y-22,'바람 원소 '+taken+'/'+n,'#bff7e8',20);F.burst(o.x,o.y,14,'#bff7e8',170);F.ring(o.x,o.y,'rgba(190,255,236,.9)');}}F.update(dt);
    for(let i=gone.length-1;i>=0;i--){gone[i].life+=dt;if(gone[i].life>.5)gone.splice(i,1);}
    inv=Math.max(0,inv-dt);shake=Math.max(0,shake-dt);
    if(!inv&&(Math.hypot(P.x-C.x,P.y-C.y)<26||bullets.some(b=>!(b.delay&&b.life<b.delay)&&Math.hypot(P.x-b.x,P.y-b.y)<b.r+5)))hit();
   },
   over:()=>!orbs.length,
   draw(ctx,t,phase){ctx.save();if(shake)ctx.translate((Math.random()-.5)*8,(Math.random()-.5)*8);arena(ctx,'#74e0c6','ANEMO',.62,C);
    // the currents: faint bands with streaks running the way they flow
    for(const q of streams){ctx.fillStyle='rgba(116,224,198,.07)';ctx.fillRect(q.x,q.y,q.w,q.h);ctx.strokeStyle='rgba(190,255,236,.35)';ctx.lineWidth=2;const along=q.fx?q.w:q.h,dir=Math.sign(q.fx||q.fy);
     for(let i=0;i<9;i++){const u=((i/9+dir*t*.45)%1+1)%1,len=26;ctx.beginPath();if(q.fx){const x=q.x+u*along,y=q.y+8+((i*13)%(q.h-16));ctx.moveTo(x,y);ctx.lineTo(x+dir*len,y);}else{const y=q.y+u*along,x=q.x+8+((i*13)%(q.w-16));ctx.moveTo(x,y);ctx.lineTo(x,y+dir*len);}ctx.stroke();}tag(ctx,q.x+q.w/2,q.y+q.h/2,'바람길 · 빠름',early(t,phase)*.9,'#bff7e8');}
    // when time runs out the cube draws in what is left
    const left=phase==='END'?1:0;drawIn=Math.min(1,drawIn+(left?.04:0));
    for(const o of orbs){const x=o.x+(C.x-o.x)*drawIn,y=o.y+(C.y-o.y)*drawIn;windOrb(ctx,x,y,o.life,(o.drift?1.12:1)+Math.sin(o.life*8)*.08,!!o.drift);if(!drawIn)tag(ctx,x,y+31,'바람 원소',1,'#d6fff4');}
    for(const g of gone)glow(ctx,g.x,g.y,18+g.life*60,'rgba(255,240,180,.8)',1-g.life*2);
    for(const b of bullets){if(b.delay&&b.life<b.delay)continue;drawShot(ctx,b);}
    ctx.save();ctx.translate(C.x,C.y);ctx.rotate(t*1.6);glow(ctx,0,0,54,'rgba(116,224,198,.55)');ctx.strokeStyle='#bff7e8';ctx.lineWidth=2;ctx.strokeRect(-18,-18,36,36);ctx.rotate(.8);ctx.strokeRect(-12,-12,24,24);ctx.restore();
    ctx.fillStyle='rgba(214,255,244,.75)';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('무적',C.x,C.y+40);
    hero(ctx,P.x,P.y,inv&&Math.floor(inv*14)%2===0);F.draw(ctx);ctx.restore();},
   grade:()=>taken>=n&&hits<=1?'great':taken>=3?'ok':'bad',
   hud:()=>'바람 원소 '+taken+'/'+n+' · 맞음 '+Math.min(hits,m.maxHits)+'/'+m.maxHits,
   summary:()=>taken>=n?'바람 원소를 모두 빼앗았다':'바람 원소 '+taken+'개 · '+(n-taken)+'개는 흡수됨',
   result:()=>({orbs:taken,hits:Math.min(hits,m.maxHits)})};
 },
 ANDRIUS_DODGE:(m,r)=>dodge(m,r,ANDRIUS_PATTERNS,{orbs:false,color:'#9fd8ef',backdrop:andriusBackdrop,scene:'ANDRIUS'}),
 // 무상의 얼음: the cold core runs from the pointer and blinks away; the frost spikes beside it freeze the hand (원작: 도망치는 냉기 핵).
 // 0.16.58 (user: 「냉기 핵은 핵 적중 된거 어떻게 알아?」): a hit shatters ice off the core where it stood — 「적중! 1/3」, a ring, a jolt —
 // and the core comes back cracked one line more; a miss says 빗나감 and a spike 얼어붙었다. The core is a faceted crystal that turns.
 CRYO_CHASE(m,r){
  const C={x:W/2,y:H/2,vx:120,vy:80,blink:0,next:1.7},spikes=[],marks=[],F=fxKit();let hits=0,frozen=0,miss=0,spikeAt=.6,flash=0,end=0;const max=Math.max(1,Math.min(m.need||3,3));
  const jump=()=>{C.x=60+r()*(W-120);C.y=60+r()*(H-120);C.blink=.3;C.next=1.4+r()*.8;};
  return{
   update(dt,t,inp){F.update(dt);if(end){end+=dt;return;}
    frozen=Math.max(0,frozen-dt);miss=Math.max(0,miss-dt);flash=Math.max(0,flash-dt);C.blink=Math.max(0,C.blink-dt);C.next-=dt;if(C.next<=0)jump();
    const p=inp.point;if(p){const d=Math.hypot(C.x-p.x,C.y-p.y);if(d<140){const s=(140-d)/140*520;C.vx+=(C.x-p.x)/(d||1)*s*dt*4;C.vy+=(C.y-p.y)/(d||1)*s*dt*4;}}
    C.vx+=(r()-.5)*400*dt;C.vy+=(r()-.5)*400*dt;const sp=Math.hypot(C.vx,C.vy),cap=300;if(sp>cap){C.vx*=cap/sp;C.vy*=cap/sp;}
    C.x+=C.vx*dt;C.y+=C.vy*dt;if(C.x<30||C.x>W-30){C.vx*=-1;C.x=Math.max(30,Math.min(W-30,C.x));}if(C.y<30||C.y>H-30){C.vy*=-1;C.y=Math.max(30,Math.min(H-30,C.y));}
    spikeAt-=dt;if(spikeAt<=0){spikeAt=.45+r()*.35;const a=r()*TAU,d=40+r()*70;spikes.push({x:Math.max(30,Math.min(W-30,C.x+Math.cos(a)*d)),y:Math.max(30,Math.min(H-30,C.y+Math.sin(a)*d)),life:0});}
    for(let i=spikes.length-1;i>=0;i--){spikes[i].life+=dt;if(spikes[i].life>1.3)spikes.splice(i,1);}
    for(let i=marks.length-1;i>=0;i--){marks[i].life+=dt;if(marks[i].life>.5)marks.splice(i,1);}
    for(const tap of inp.taps){if(frozen||miss)continue;const mark={...tap,life:0,miss:true};marks.push(mark);
     if(spikes.some(s=>Math.hypot(s.x-tap.x,s.y-tap.y)<24)){frozen=1;SND('freeze');F.pop(tap.x,tap.y-18,'얼어붙었다','#a8e4ff',20);F.burst(tap.x,tap.y,10,'#bfe9ff',150);continue;}
     if(!C.blink&&Math.hypot(C.x-tap.x,C.y-tap.y)<26){hits++;flash=.25;mark.miss=false;const last=hits>=max;SND('ice');SND('puzzle_light');
      F.burst(C.x,C.y,last?42:24,'#e6f8ff',last?380:280,4);F.burst(C.x,C.y,10,'#7fc8ff',200,3);F.ring(C.x,C.y,'rgba(255,255,255,.95)',14,90);F.pop(C.x,C.y-36,last?'핵 파괴!':'적중! '+hits+'/'+max,'#ffffff',last?34:28);F.jolt(last?.5:.3);
      if(last){F.flash(.5);end=.001;}else jump();}
     else{miss=.25;SND('error');F.pop(tap.x,tap.y-16,'빗나감','#ff9c9c',16);}}
   },
   over:()=>end>.75,
   draw(ctx,t,phase){ctx.save();F.shakeBy(ctx);scene(ctx,'CRYO',.82);for(let i=0;i<18;i++){ctx.fillStyle='rgba(168,228,255,.08)';ctx.fillRect((i*97+t*20)%W,(i*53)%H,2,2);}
    for(const s of spikes){const a=Math.min(1,s.life*3);ctx.save();ctx.translate(s.x,s.y);ctx.globalAlpha=a;glow(ctx,0,0,24,'rgba(168,228,255,.5)');ctx.fillStyle='#e6f7ff';ctx.strokeStyle='#7fc8ff';ctx.lineWidth=1.2;ctx.beginPath();for(let k=0;k<6;k++){const ang=k*TAU/6;ctx.lineTo(Math.cos(ang)*20,Math.sin(ang)*20);ctx.lineTo(Math.cos(ang+TAU/12)*7,Math.sin(ang+TAU/12)*7);}ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();ctx.globalAlpha=1;}
    if(end)glow(ctx,C.x,C.y,60*(1-Math.min(1,end/.75)),'rgba(230,248,255,.9)');
    else if(C.blink)glow(ctx,C.x,C.y,40*(C.blink/.3),'rgba(168,228,255,.8)');
    else{iceCore(ctx,C.x,C.y,t,flash>0,hits);tag(ctx,C.x,C.y-38,'냉기 핵',early(t,phase),'#e6f8ff');}
    if(spikes[0])tag(ctx,spikes[0].x,spikes[0].y-28,'얼음 가시',early(t,phase),'#cdefff');
    for(const k of marks){ctx.strokeStyle=k.miss?'rgba(255,140,140,'+(1-k.life*2)+')':'rgba(255,255,255,'+(1-k.life*2)+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(k.x,k.y,10+k.life*30,0,TAU);ctx.stroke();}
    F.draw(ctx);
    if(frozen){ctx.fillStyle='rgba(168,228,255,'+(.18+frozen*.2)+')';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('얼어붙었다',W/2,40);}
    ctx.restore();},
   grade:()=>hits>=max?'great':hits?'ok':'bad',
   hud:()=>'핵 적중 '+hits+'/'+max,summary:()=>hits>=max?'냉기 핵을 부쉈다':hits?'핵 적중 '+hits+'번':'놓쳤다',result:()=>({hits})};
 },
 // 드발린: the corrupted crystals on its body glow while it flies; storms knock shots aside (원작: 부식 결정 저격).
 // 0.16.58 (user: 「드발린 너무 쉽고, 드발린 동그라미 진짜 개 그지같이 생겨서 혐오감이 드네」): 드발린 is the game's own picture of it
 // (enemy_18), seen as it wheels through the sky — the view follows it unevenly — and the crystals sit on its body: three of neck, chest,
 // thigh and the two wings. They are smaller than before (12 px against 18), it turns faster and less evenly, and storms come more often.
 DVALIN_SNIPE(m,r){
  const IW=1536,IH=1024,K=.62,w=IW*K,h=IH*K,SPOTS=[[.45,.33],[.39,.55],[.565,.645],[.2,.25],[.82,.17]],R=12;
  const crystals=SPOTS.map(p=>({p,k:r()})).sort((a,b)=>a.k-b.k).slice(0,Math.max(1,Math.min(SPOTS.length,m.crystals|0))).map(({p})=>({fx:p[0],fy:p[1],alive:true,pop:0}));
  const shots=[],F=fxKit(),ph=[r()*TAU,r()*TAU,r()*TAU,r()*TAU];let left=m.shots,hits=0,storm=0,stormAt=1.1+r()*.5,end=0;
  const view=t=>{const u=Math.sin(t*1.15+ph[0])*.62+Math.sin(t*2.6+ph[1])*.38,v=Math.sin(t*1.9+ph[2])*.65+Math.sin(t*3.4+ph[3])*.35;return{x:(W-w)/2+u*150,y:(H-h)/2+v*72};};
  let cam=view(0);const at=c=>({x:cam.x+c.fx*w,y:cam.y+c.fy*h});
  return{
   update(dt,t,inp){cam=view(t);F.update(dt);if(end)end+=dt;stormAt-=dt;if(stormAt<=0&&!storm){storm=.8;stormAt=1.5+r()*.7;}storm=Math.max(0,storm-dt);for(const c of crystals)c.pop=Math.max(0,c.pop-dt);for(let i=shots.length-1;i>=0;i--){shots[i].life+=dt;if(shots[i].life>.6)shots.splice(i,1);}
    for(const tap of inp.taps){if(left<=0||end)break;left--;let hit=null;if(!storm)for(const c of crystals){const p=at(c);if(c.alive&&Math.hypot(p.x-tap.x,p.y-tap.y)<R){hit=c;break;}}
     shots.push({...tap,life:0,miss:!hit,storm:!!storm});
     if(hit){hit.alive=false;hit.pop=.4;hits++;const p=at(hit),last=crystals.every(c=>!c.alive);SND('puzzle_light');F.burst(p.x,p.y,last?36:20,'#e0b3ff',last?340:260,3.6);F.ring(p.x,p.y,'rgba(240,210,255,.95)',10,80);F.pop(p.x,p.y-30,last?'결정 모두 파괴!':'결정 파괴! '+hits+'/'+crystals.length,'#f3dcff',last?30:24);F.jolt(last?.45:.25);if(last){F.flash(.4,'230,200,255');end=.001;}}
     else{SND('error');F.pop(tap.x,tap.y-16,storm?'폭풍에 빗나감':'빗나감','#ff9c9c',storm?18:16);}}},
   over:()=>end>.75||!end&&left<=0&&shots.every(s=>s.life>.35),
   draw(ctx,t,phase){ctx.save();F.shakeBy(ctx);if(storm)ctx.translate(Math.sin(t*53)*5,Math.cos(t*47)*4);ctx.fillStyle='#0a1622';ctx.fillRect(-10,-10,W+20,H+20);
    const img=pic('assets/enemy_18.webp');if(img)ctx.drawImage(img,cam.x,cam.y,w,h);ctx.fillStyle='rgba(5,12,22,'+(storm?.45:.2)+')';ctx.fillRect(-10,-10,W+20,H+20);
    const v=ctx.createRadialGradient(W/2,H/2,H*.35,W/2,H/2,W*.72);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,'rgba(0,0,0,.55)');ctx.fillStyle=v;ctx.fillRect(-10,-10,W+20,H+20);
    if(storm){ctx.strokeStyle='rgba(200,230,255,.45)';ctx.lineWidth=2;for(let i=0;i<16;i++){const y=(i*31+t*420)%H;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y-70);ctx.stroke();}ctx.fillStyle='#e6f4ff';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.fillText('폭풍 · 쏘면 빗나감',W/2,34);}
    for(const c of crystals){const p=at(c);if(c.alive){corrupt(ctx,p.x,p.y,t,false);tag(ctx,p.x,p.y-24,'부식 결정',early(t,phase),'#f0d6ff');}else if(c.pop)glow(ctx,p.x,p.y,50*(1-c.pop/.4)+10,'rgba(255,220,255,.9)',c.pop/.4);}
    for(const s of shots){ctx.strokeStyle=s.miss?'rgba(255,140,140,'+(1-s.life/.6)+')':'rgba(255,255,255,'+(1-s.life/.6)+')';ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x,s.y,6+s.life*30,0,TAU);ctx.stroke();}
    F.draw(ctx);ctx.restore();},
   grade:()=>hits>=crystals.length?'great':hits?'ok':'bad',
   hud:()=>'결정 '+hits+'/'+crystals.length+' · 남은 탄 '+left,summary:()=>hits>=crystals.length?'부식 결정을 모두 부쉈다':hits?'결정 '+hits+'개 명중':'모두 빗나감',result:()=>({hits})};
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
  // 0.16.57: 무상의 뇌전·바위·얼음 keep a shut core too (runtime fieldBossCore); their chips say it the same way.
  if(['ELECTRO','GEO_HYPO','CRYO_HYPO'].includes(f.kind)&&!f.revival&&fbx.coreRevision===1&&ctl&&b.bossPass===1)out.push(game.fbCoreShut?.(real)?{id:'FB_CORE_SHUT',name:'핵 닫힘',kind:'hold',rounds:null,text:'큰 공격을 준비하는 동안이나 첫 공격 전에는 핵이 닫혀 공격이 통하지 않습니다. 공격을 마치면 핵이 드러납니다.'}:{id:'FB_CORE_OPEN',name:'핵 노출',kind:'debuff',rounds:null,text:'공격을 마친 핵이 드러났습니다 · 다음 준비 동작까지 공격이 통합니다.'});
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
window.CRPGFieldBossMinigames={version:1,cards:[...CARDS],open:(card,done)=>{running?.close();open(card,done||(()=>{}));},close:()=>running?.close(),get running(){return running?.kind||null;},get battle(){return running?.battle||null;}};
})();
