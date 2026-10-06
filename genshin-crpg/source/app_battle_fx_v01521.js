/* 0.15.21 전투 연출 (user, 2026-10-05/06: 「보호막·원소 부착이 글자뿐」, 「효과·그림·애니메이션을 더」, 「뿅뿅 날아가는 것만
 * 말고 검, 창 등 장비마다 공격 모션… 알만툴 애니메이션처럼」, 「공격 받으면 붉게, 회복하면 초록색으로 깜빡」, 「전투 속도는
 * 0.5배를 기본으로, 2배면 지금의 1배」).
 * - Cards: a living aura of the attached element's own particles, a shield as a glassy bubble, and
 *   빙결 · 연소 · 감전 · 습윤 · 중독 · 한기 · 침식 · 도발 as overlays (the element orbs themselves: app_shell.js).
 * - Attacks, as in RPG Maker battle animations: the blow is drawn on the target when it lands, by the attacker's
 *   weapon — 한손검 two crossing slashes, 양손검 one heavy cleave, 장병기 three thrusts, 활 an arrow, 법구 a magic
 *   circle; enemies claw, club, slam, shoot or cast by their kind. Only arrows and spells fly ahead (CombatFX.windup).
 * - A card flashes red when hit and green when healed; a shield ripples when it soaks a hit, shatters when it breaks
 *   and blooms when raised; every elemental reaction has its own burst.
 * - The speed label is twice the real playback rate, so the old 0.5× is the new 1× (the default).
 * Presentation only: no game state is written; 움직임 줄이기 turns the moving parts off.
 * Load after app_shell.js (layoutCombat calls BattleFX.decorate), app_combat_fx.js and app_av.js. */
(function(){
'use strict';
// The element pictures are the original game's symbols (app_icons_v01521.js); app_shell.js puts them on the cards.
const TINT={fire:'#ff8a50',water:'#6cc9ff',ice:'#bdf0ff',lightning:'#c79bff',wind:'#7fe8c8',rock:'#f5c542',dendro:'#a5d63b'};
const STATUS=[['STATUS_FREEZE','freeze'],['STATUS_BURN','burn'],['STATUS_ELECTROCHARGED','charged'],['STATUS_WET','wet'],['STATUS_POISON','poison'],['STATUS_CHILL','chill'],['STATUS_CORROSION','corrosion'],['STATUS_TAUNT','taunt'],['STATUS_ISEKAI_EXPOSED','exposed']];
const REACT=[[/OVERLOAD|과부하/,'overload'],[/VAPORI|증발/,'vaporize'],[/MELT|융해/,'melt'],[/FROZEN|FREEZE|빙결/,'frozen'],[/SUPERCONDUCT|초전도/,'superconduct'],[/ELECTRO_?CHARGED|감전/,'charged'],[/SWIRL|확산/,'swirl'],[/CRYSTALLI|결정/,'crystallize'],[/SHATTER|쇄빙/,'shatter'],[/BURN|연소/,'burning'],[/BLOOM|SPREAD|QUICKEN|AGGRAVATE|BURGEON|개화|활성|발산|촉진|만개|격화/,'bloom']];
const SHIELD=[[/DIONA|LAYLA|CRYO|얼음/,'cryo'],[/BEIDOU|ELECTRO|번개/,'electro'],[/XINYAN|THOMA|PYRO|불/,'pyro'],[/CANDACE|HYDRO|물/,'hydro'],[/KIRARA|BAIZHU|DENDRO|풀/,'dendro'],[/NOELLE|ZHONGLI|CRYSTAL|GEO|바위/,'geo']];
const WEAPON_STYLE={'한손검':'slash','양손검':'cleave','장병기':'thrust','활':'arrow','법구':'magic'};
const reduced=()=>document.documentElement.classList.contains('reduce-motion')||(typeof settings!=='undefined'&&!!settings.reducedMotion);
function span(cls){const n=document.createElement('span');n.className=cls;n.setAttribute('aria-hidden','true');return n;}
function shieldKind(list){const text=list.map(s=>String(s.element||'')+' '+String(s.source||'')).join(' ');return SHIELD.find(([re])=>re.test(text))?.[1]||'plain';}
function bubble(kind,extra=''){return span('shield-fx shield-'+kind+(extra?' '+extra:''));}
const actorOf=id=>game?.s?.runtime?.actors?.find(x=>x.id===id)||null;

// ---- who strikes how ------------------------------------------------------------------------------------------
// An ally fights with its character's weapon kind (the protagonist with the weapon worn; app_icons_v01521.js).
function weaponOf(a){return a&&a.side==='ALLY'&&typeof CRPGIcons!=='undefined'?CRPGIcons.weaponOfCharacter(a.source):null;}
function attackStyle(frame){
 const a=actorOf(frame.actorId);
 if(!a)return String(frame.actorId||'').startsWith('SUMMON:')?'magic':'blunt';
 if(a.side==='ALLY')return WEAPON_STYLE[weaponOf(a)]||'slash';
 const name=[a.name,a.family,a.source].join(' ');
 if(/궁수|사수|석궁|ARCHER|SHOOTER/i.test(name)||a.range==='원거리')return 'arrow';
 if(/메이지|마법|술사|샤먼|무상|정령|MAGE|SHAMAN|HYPOSTASIS|OCEANID|CICIN/i.test(name))return 'magic';
 if(/슬라임|SLIME/i.test(name))return 'slam';
 if(/쇠뭉치|싸움꾼|도끼|방패|거인|골렘|가디언|유적|MITACHURL|BRUTE|GUARD|RUIN/i.test(name))return 'blunt';
 return a.range==='중거리'?'magic':'claw';
}

// ---- motes on CombatFX's clock (speed, pause) -------------------------------------------------------------------
function mote(layer,cls,p,tint){const n=CombatFX.mote(layer,'bfx '+cls,p);if(tint)n.style.setProperty('--fx',tint);return n;}
function fly(layer,p,cls,{dx=0,dy=0,from=.3,to=1.6,rot=0,dur=700,delay=0,fade=true,tint}={}){
 const n=mote(layer,cls,p,tint);
 CombatFX.animate(n,[{transform:'translate(-50%,-50%) scale('+from+') rotate(0deg)',opacity:1},{offset:.25,opacity:1},{transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) scale('+to+') rotate('+rot+'deg)',opacity:fade?0:1}],{duration:dur,delay,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'});
 return n;
}
const around=(n,r,j=0)=>Array.from({length:n},(_,i)=>{const t=i*Math.PI*2/n+j;return {dx:Math.cos(t)*r,dy:Math.sin(t)*r,deg:t*180/Math.PI};});
function sparks(layer,p,tint,n,r,dur){for(const v of around(n,r,.3))fly(layer,p,'wfx-spark',{dx:v.dx,dy:v.dy,from:1,to:.2,rot:v.deg,dur,tint});}
function star(layer,p,tint,size){const n=mote(layer,'wfx-star',p,tint);CombatFX.animate(n,[{transform:'translate(-50%,-50%) scale('+(.2*size)+') rotate(0deg)',opacity:1},{offset:.4,transform:'translate(-50%,-50%) scale('+(1.05*size)+') rotate(18deg)',opacity:1},{transform:'translate(-50%,-50%) scale('+(1.25*size)+') rotate(28deg)',opacity:0}],{duration:360,easing:'ease-out',fill:'both'});}
// Each blow, drawn where it lands (o: tint, size, angle of approach).
const MOTION={
 slash(l,p,o){[[-40,0],[35,120]].forEach(([deg,delay])=>{const n=mote(l,'wfx-arc',p,o.tint);CombatFX.animate(n,[{transform:'translate(-50%,-50%) rotate('+(deg-80)+'deg) scale('+(.75*o.size)+')',opacity:0},{offset:.2,opacity:1},{transform:'translate(-50%,-50%) rotate('+(deg+45)+'deg) scale('+o.size+')',opacity:0}],{duration:320,delay,easing:'cubic-bezier(.3,.7,.3,1)',fill:'both'});});sparks(l,p,o.tint,5,34,300);},
 cleave(l,p,o){const n=mote(l,'wfx-arc heavy',p,o.tint);CombatFX.animate(n,[{transform:'translate(-50%,-70%) rotate(-100deg) scale('+(.85*o.size)+')',opacity:0},{offset:.25,opacity:1},{transform:'translate(-50%,-40%) rotate(40deg) scale('+(1.15*o.size)+')',opacity:0}],{duration:460,easing:'cubic-bezier(.5,0,.3,1)',fill:'both'});const dust=mote(l,'wfx-dust',{x:p.x,y:p.y+38},o.tint);CombatFX.animate(dust,[{transform:'translate(-50%,-50%) scaleX(.2)',opacity:0},{offset:.3,opacity:.9},{transform:'translate(-50%,-50%) scaleX(1.7)',opacity:0}],{duration:520,delay:220,fill:'both'});star(l,p,o.tint,1.1*o.size);},
 thrust(l,p,o){const dx=Math.cos(o.angle),dy=Math.sin(o.angle);[0,95,190].forEach((delay,i)=>{const off=(i-1)*13,q={x:p.x-dy*off,y:p.y+dx*off},n=mote(l,'wfx-streak',q,o.tint);CombatFX.animate(n,[{transform:'translate(calc(-50% + '+(-dx*80)+'px),calc(-50% + '+(-dy*80)+'px)) rotate('+o.angle+'rad) scaleX(.3)',opacity:0},{offset:.4,opacity:1},{transform:'translate(calc(-50% + '+(dx*14)+'px),calc(-50% + '+(dy*14)+'px)) rotate('+o.angle+'rad) scaleX(1)',opacity:0}],{duration:250,delay,easing:'ease-out',fill:'both'});});sparks(l,p,o.tint,6,30,300);},
 arrow(l,p,o){star(l,p,o.tint,.8*o.size);sparks(l,p,o.tint,5,26,260);},
 magic(l,p,o){const ring=mote(l,'wfx-circle',p,o.tint);CombatFX.animate(ring,[{transform:'translate(-50%,-50%) scale(.2) rotate(0deg)',opacity:0},{offset:.3,opacity:1},{offset:.75,opacity:1},{transform:'translate(-50%,-50%) scale('+(1.05*o.size)+') rotate(150deg)',opacity:0}],{duration:640,easing:'ease-out',fill:'both'});const orb=mote(l,'wfx-orb',p,o.tint);CombatFX.animate(orb,[{transform:'translate(-50%,-50%) scale(.2)',opacity:0},{offset:.5,opacity:1},{transform:'translate(-50%,-50%) scale('+(1.8*o.size)+')',opacity:0}],{duration:520,delay:240,fill:'both'});},
 claw(l,p,o){[-15,0,15].forEach((off,i)=>{const n=mote(l,'wfx-claw',{x:p.x+off,y:p.y},o.tint);CombatFX.animate(n,[{transform:'translate(-50%,-50%) rotate(58deg) scaleX(0)',opacity:1},{offset:.5,transform:'translate(-50%,-50%) rotate(58deg) scaleX(1)',opacity:1},{transform:'translate(-50%,-50%) rotate(58deg) scaleX(1)',opacity:0}],{duration:330,delay:i*50,easing:'ease-out',fill:'both'});});},
 blunt(l,p,o){star(l,p,o.tint,1.25*o.size);const r=mote(l,'wfx-ring',p,o.tint);CombatFX.animate(r,[{transform:'translate(-50%,-50%) scale(.3)',opacity:1},{transform:'translate(-50%,-50%) scale(1.9)',opacity:0}],{duration:420,fill:'both'});},
 slam(l,p,o){const r=mote(l,'wfx-ring',{x:p.x,y:p.y+20},o.tint);CombatFX.animate(r,[{transform:'translate(-50%,-50%) scale(.3,.15)',opacity:1},{transform:'translate(-50%,-50%) scale(2.1,.9)',opacity:0}],{duration:440,fill:'both'});sparks(l,{x:p.x,y:p.y-6},o.tint,7,46,420);}
};
// Called by CombatFX.windup (app_combat_fx.js) while the attacker steps in: only arrows and spells travel; a melee
// weapon sends nothing ahead, its blow is drawn when it lands.
function windupShot(frame,effects,from,auxiliary,summonSource,timing={}){
 if(!from||(auxiliary&&!summonSource))return;const style=attackStyle(frame);if(!['arrow','magic'].includes(style))return;
 const layer=effects.layerNode(),duration=timing.duration||CombatFX.windupDuration,delay=timing.delay||0;
 for(const t of frame.targets||[]){
  if(t.targetId===frame.actorId)continue;const to=CombatFX.point(effects.actorNode(t.targetId));if(!to)continue;
  const e=(t.events||[]).find(e=>e.kind==='damage');if(!e)continue;
  const dx=to.x-from.x,dy=to.y-from.y,ang=Math.atan2(dy,dx),n=mote(layer,style==='arrow'?'wfx-arrow':'wfx-bolt',from,TINT[e.element]||'#fff6d6');
  CombatFX.animate(n,[{transform:'translate(-50%,-50%) rotate('+ang+'rad) scale(.8)',opacity:0},{offset:.15,opacity:1},{transform:'translate(calc(-50% + '+dx+'px),calc(-50% + '+dy+'px)) rotate('+ang+'rad) scale(1)',opacity:1}],{duration,delay,easing:'linear',fill:'both'});
 }
}
// 0.15.21 (user: 「차례가 나오기 전에 공격이 나오는건 좀 아닌데. 차례가 나온 뒤 0.몇초정도 뜸을 주고」): the playback lights the
// fighter's card (and the order's 현재) as its action begins; CombatFX.windup then waits windupLead before the blow.
function turnTo(frame,effects){
 if(!frame||frame.kind!=='action')return;
 // 0.15.25 (user: 「토끼백작 … 공격을 연속 세번 하노? 세 번 공격하게 되면 위에 X3 적혀있어야」): a summon's own action (토끼 백작's
 // blast at the start of a round) takes its place in the order list and lights up there; it has no fighter card to badge.
 if(String(frame.actorId||'').startsWith('SUMMON:')){const order=document.querySelector('.combat-panel .battle-order');if(order){followRound(order,frame.round);for(const li of order.querySelectorAll('li[data-actor-id]'))li.classList.toggle('current',li.dataset.actorId===frame.actorId);window.CRPGShell?.orderNow?.();}return;}
 if(frame.periodic)return;
 const row=effects?.actorNode?.(frame.actorId);if(!row?.classList?.contains('combatant-row'))return;
 const shell=window.CRPGShell;if(typeof shell?.turnBadge==='function')shell.turnBadge(row);
 const order=document.querySelector('.combat-panel .battle-order');
 if(order){followRound(order,frame.round);for(const li of order.querySelectorAll('li[data-actor-id]'))li.classList.toggle('current',li.dataset.actorId===frame.actorId);shell?.orderNow?.();}
}
// 0.15.21 (user: 「위에 적혀있는 순서가 공격 순서 아니야? 왜 누구는 그냥 넘어가는거야? 위에 적혀있는게 공격 순서였으면 좋겠다」):
// the order is drawn anew every round, but the list on screen stayed the round the playback began in, so once the round
// changed the mark jumped around it as if someone were skipped. When an action of a later round begins, the list becomes
// that round's order: the battle's own order for the round it now stands in, otherwise the fighters as they act.
let playFrames=[];
if(typeof GameEffects!=='undefined'&&typeof GameEffects.play==='function'){const priorPlay=GameEffects.play;GameEffects.play=function(events,...rest){playFrames=Array.isArray(events)?events.filter(e=>e&&e.kind==='action'):[];return priorPlay.call(this,events,...rest);};}
const summonActor=id=>String(id||'').startsWith('SUMMON:');
function roundOrder(round){
 const b=game?.s?.runtime;if(!b)return [];
 const frames=playFrames.filter(f=>f.round===round&&f.actorId);
 // Summons that act before anyone in the round (토끼 백작's blast) lead it.
 const lead=[];for(const f of frames){if(!summonActor(f.actorId))break;if(!lead.includes(f.actorId))lead.push(f.actorId);}
 if(b.round===round&&Array.isArray(b.order))return [...lead,...b.order.map(x=>x.id)];
 const ids=[];for(const f of frames)if((!f.periodic||summonActor(f.actorId))&&!ids.includes(f.actorId))ids.push(f.actorId);
 return ids;
}
// How many times each fighter acts in the round as played (a second action shows as ×2 beside the name).
function roundTimes(round){const n={};for(const f of playFrames)if(f.round===round&&f.actorId&&(!f.periodic||summonActor(f.actorId)))n[f.actorId]=(n[f.actorId]||0)+1;return n;}
function summonEntry(b,id,frame){
 const li=document.createElement('li');li.className='summon '+(String(frame?.actorSide||'ALLY')==='ENEMY'?'enemy':'ally');li.dataset.actorId=id;
 const field=(b.fields||[]).find(f=>'SUMMON:'+f.kind+':'+f.actor===id),asset=field?.asset||({BUNNY:'summon_baron_bunny.webp'})[field?.kind||String(id).split(':')[1]];
 if(asset&&typeof showArt!=='undefined'&&showArt){const img=document.createElement('img');img.className='order-face';img.src='assets/summons/'+asset;img.alt='';img.decoding='async';li.append(img);li.classList.add('with-face');}
 const name=document.createElement('span');name.textContent=frame?.actor||field?.name||'소환물';li.append(name);
 if(frame?.cardName){const what=document.createElement('small');what.className='order-what';what.textContent=frame.cardName;li.append(what);}
 return li;
}
function followRound(order,round){
 if(!order||!Number.isFinite(round)||order.dataset.round===String(round))return;
 const b=game.s.runtime,ids=roundOrder(round),times=roundTimes(round);if(!ids.length)return;
 const items=[];
 for(const id of ids){
  if(summonActor(id)){const li=summonEntry(b,id,playFrames.find(f=>f.round===round&&f.actorId===id));const num=document.createElement('small');num.textContent=String(items.length+1);li.prepend(num);items.push(li);continue;}
  const a=b.actors.find(x=>x.id===id);if(!a)continue;const li=document.createElement('li');li.className=(a.side==='ALLY'?'ally':'enemy')+(a.hp<=0?' down':'');li.dataset.actorId=a.id;
  const num=document.createElement('small');num.textContent=String(items.length+1);const name=document.createElement('span');name.textContent=typeof combatDisplayName==='function'?combatDisplayName(b,a):a.name;li.append(num);if(typeof battleOrderFace==='function')battleOrderFace(li,a);li.append(name);
  if(typeof battleOrderTimes==='function')battleOrderTimes(li,a);
  if((times[id]||0)>1&&!li.querySelector('.order-times')){const tag=document.createElement('small');tag.className='order-times';tag.textContent='×'+times[id];tag.title='이번 라운드에 '+times[id]+'번 행동';li.append(tag);}
  items.push(li);}
 order.replaceChildren(...items);order.dataset.round=String(round);
 order.classList.remove('new-round');void order.offsetWidth;order.classList.add('new-round');
}
if(typeof CombatFX!=='undefined'&&typeof CombatFX.windup==='function'){const priorWindup=CombatFX.windup;CombatFX.windup=function(frame,effects){try{turnTo(frame,effects);}catch(e){console.warn('battle fx',e);}return priorWindup.call(this,frame,effects);};}

// ---- the cards ------------------------------------------------------------------------------------------------
function decorate(p){
 const b=game?.s?.runtime;if(!b||!p)return;
 for(const row of p.querySelectorAll('.combatant-row[data-actor-id]')){
  const a=b.actors.find(x=>x.id===row.dataset.actorId);if(!a)continue;
  for(const old of row.querySelectorAll(':scope > .aura-fx, :scope > .shield-fx, :scope > .status-fx'))old.remove();
  if(a.hp<=0)continue;
  const kind=row.dataset.aura;
  if(kind){const fx=span('aura-fx aura-'+kind);for(let i=0;i<6;i++){const m=document.createElement('i');m.style.setProperty('--i',i);fx.append(m);}row.append(fx);}
  const shields=(a.shields||[]).filter(s=>Number(s.value)>0);if(shields.length)row.append(bubble(shieldKind(shields)));
  const now=new Set((a.statuses||[]).filter(s=>!Number.isFinite(s.rounds)||s.rounds>0).map(s=>s.id)),shown=STATUS.filter(([id])=>now.has(id));
  if(shown.length){const fx=span('status-fx');for(const [,cls]of shown)fx.append(span('st st-'+cls));row.append(fx);}
 }
 // A card's one-line note is cut short on a PC; the whole of it is on the pointer.
 for(const btn of p.querySelectorAll('.battle-cards button[data-card-id]')){const note=btn.querySelector('small')?.textContent;if(note&&!btn.title)btn.title=note;}
}

// ---- the playback -----------------------------------------------------------------------------------------------
const REACTION_FX={
 overload(l,p){fly(l,p,'rfx-flash rfx-overload',{from:.2,to:2.6,dur:520});fly(l,p,'rfx-ring rfx-overload',{from:.3,to:3,dur:700});for(const v of around(10,78))fly(l,p,'rfx-spark rfx-overload',{dx:v.dx,dy:v.dy,from:1,to:.2,rot:v.deg,dur:560});},
 vaporize(l,p){fly(l,p,'rfx-ring rfx-vaporize',{from:.4,to:2.2,dur:620});for(let i=0;i<6;i++)fly(l,p,'rfx-puff',{dx:(i-2.5)*16,dy:-70-(i%3)*18,from:.5,to:2.1,dur:900,delay:i*50});},
 melt(l,p){fly(l,p,'rfx-ring rfx-melt-a',{from:.3,to:2.4,rot:200,dur:720});fly(l,p,'rfx-ring rfx-melt-b',{from:.3,to:2,rot:-200,dur:720,delay:80});for(const v of around(6,46))fly(l,p,'rfx-drop rfx-melt-a',{dx:v.dx*.6,dy:v.dy*.6+40,from:.9,to:.3,dur:700});},
 frozen(l,p){for(const v of around(6,34,.3))fly(l,p,'rfx-crystal',{dx:v.dx,dy:v.dy,from:.2,to:1.15,rot:v.deg+90,dur:900,fade:false});fly(l,p,'rfx-ring rfx-frozen',{from:.3,to:2.4,dur:760});},
 superconduct(l,p){fly(l,p,'rfx-ring rfx-superconduct',{from:.3,to:3.2,dur:760});for(const v of around(8,64,.2))fly(l,p,'rfx-spark rfx-frozen',{dx:v.dx,dy:v.dy,from:.9,to:.2,rot:v.deg,dur:620});},
 charged(l,p){for(const v of around(4,30,.6)){const n=fly(l,p,'rfx-arc',{dx:v.dx,dy:v.dy,from:.8,to:1.2,rot:v.deg,dur:640,fade:false});CombatFX.animate(n,[{opacity:1},{opacity:.1},{opacity:1},{opacity:0}],{duration:640,easing:'steps(4,end)',fill:'forwards'});}fly(l,p,'rfx-ring rfx-charged',{from:.3,to:2.2,dur:620});},
 swirl(l,p){fly(l,p,'rfx-swirl',{from:.3,to:2.6,rot:540,dur:900});for(const v of around(8,70,.4))fly(l,p,'rfx-leaf',{dx:v.dx,dy:v.dy,from:1,to:.3,rot:360,dur:820});},
 crystallize(l,p){const n=fly(l,p,'rfx-gem',{dy:-58,from:.3,to:1.15,rot:0,dur:880,fade:false});CombatFX.animate(n,[{opacity:1},{offset:.75,opacity:1},{opacity:0}],{duration:880,fill:'forwards'});for(const v of around(6,40))fly(l,p,'rfx-spark rfx-crystallize',{dx:v.dx,dy:v.dy,from:.8,to:.2,rot:v.deg,dur:520});},
 shatter(l,p){for(const v of around(9,86,.15))fly(l,p,'rfx-crystal',{dx:v.dx,dy:v.dy,from:1,to:.3,rot:v.deg*2,dur:640});},
 burning(l,p){for(let i=0;i<5;i++)fly(l,p,'rfx-flame',{dx:(i-2)*18,dy:-60-(i%2)*20,from:.6,to:1.3,dur:800,delay:i*60});},
 bloom(l,p){for(const v of around(5,58,.5))fly(l,p,'rfx-orb',{dx:v.dx,dy:v.dy,from:.3,to:1.1,dur:820});fly(l,p,'rfx-ring rfx-bloom',{from:.3,to:2.2,dur:700});}
};
function reactionOf(id){id=String(id||'');return REACT.find(([re])=>re.test(id))?.[1]||null;}
function shatter(layer,p,kind){fly(layer,p,'rfx-ring shard-ring shard-'+kind,{from:.6,to:2.2,dur:520});for(const v of around(10,92,.2))fly(layer,p,'shield-shard shard-'+kind,{dx:v.dx,dy:v.dy,from:1,to:.4,rot:v.deg*3,dur:620});}
// A short red (hit) or green (heal) flash over the card itself.
function flash(node,kind){
 if(!node)return;node.querySelector(':scope > .hit-flash.'+kind)?.remove();const f=span('hit-flash '+kind);node.append(f);
 const a=CombatFX.animate(f,[{opacity:0},{offset:.22,opacity:1},{opacity:0}],{duration:460,easing:'ease-out',fill:'forwards'}),done=()=>f.remove();
 if(a)a.finished.then(done,done);else setTimeout(done,600);
}
// 0.15.21 (user: 「동료가 생기거나 … 점점 더 강해지고 새로운 장비나 기술을 사용할수록 더 괜찮은 이펙트들이 생기면」, then about the
// level 「레벨....에는 그런게 필요한가?」 — no): an ally's blows grow with what the player has won for them, not with the
// level that rises by itself. Power counts the weapon (4★ +.5, 5★ +1, +10 enhancement +.5) and the constellation
// (1 · 3 · 6: +.5 · +1 · +1.5); from .5 the blow is larger and throws sparks, from 1.5 it leaves an afterimage, from 2.5 a
// shockwave; a 4★ weapon glows violet, a 5★ gold.
const GRADE_GLOW={4:'#c79bff',5:'#ffd36b'};
function wornWeapon(id){const rows=game.tables?.['16_EQUIP_DB'];return (game.s?.inventory||[]).find(x=>x.equipped&&x.owner===id&&['한손검','양손검','장병기','활','법구'].includes(rows?.get(x.equip)?.[2]))||null;}
function powerOf(a){
 if(!a||a.side!=='ALLY')return {power:0,grade:0};
 const id=a.source||a.id,cons=Number(game.constellationLevel?.(id)||0),w=wornWeapon(id);
 let grade=0;try{grade=w&&typeof itemTierRank==='function'?Number(itemTierRank(w.equip,w))||0:0;}catch{}
 const power=(cons>=6?1.5:cons>=3?1:cons>=1?.5:0)+(grade>=5?1:grade>=4?.5:0)+(Number(w?.enhance)>=10?.5:0);
 return {power,grade};
}
// Draws a blow and returns the motes it made, so they can glow or fade as an afterimage.
function blow(layer,style,p,o){const before=layer.childElementCount;MOTION[style](layer,p,o);return [...layer.children].slice(before);}
function strike(layer,style,p,o,pw){
 const size=o.size*(1+Math.min(.3,pw.power*.1)),glow=GRADE_GLOW[pw.grade],opt={...o,size};
 const made=blow(layer,style,p,opt);if(glow)for(const n of made)n.style.filter='drop-shadow(0 0 7px '+glow+') drop-shadow(0 0 2px '+glow+')';
 if(pw.power>=.5)sparks(layer,p,glow||o.tint,3+Math.round(pw.power*2),40+pw.power*10,360);
 if(pw.power>=1.5){const speed=typeof settings!=='undefined'?settings.combatSpeed||1:1;setTimeout(()=>{if(!layer.isConnected)return;for(const n of blow(layer,style,{x:p.x+7,y:p.y-5},{...opt,size:size*.88}))n.style.filter=(glow?'drop-shadow(0 0 6px '+glow+') ':'')+'opacity(.5)';},Math.round(110/speed));}
 if(pw.power>=2.5){const r=mote(layer,'wfx-ring',p,glow||o.tint);CombatFX.animate(r,[{transform:'translate(-50%,-50%) scale(.4)',opacity:.9},{transform:'translate(-50%,-50%) scale(2.7)',opacity:0}],{duration:560,delay:120,fill:'both'});}
}
// 0.15.21 (user: 「약점 간파 됐으면 디버프창에 디버프로 적혀있어야 되는거 아니야?」): the playback has no 「a debuff landed」 entry,
// only the blow, so the card showed 약점 간파 only once the whole playback was over. Its debuff chip and red sight now
// appear on the target as the blow lands; a sight locks on as well.

function liveStatus(node,status){
 if(!node||typeof battleStatusList!=='function'||typeof statusChip!=='function')return;
 const entry=battleStatusList({statuses:[status]})[0],copy=node.querySelector('.combatant-copy');if(!entry||!copy)return;
 let row=copy.querySelector(':scope > .status-chips');if(!row){row=document.createElement('button');row.type='button';row.className='status-chips';row._statusList=[];row.addEventListener('click',()=>battleStatusDetails({name:node.querySelector('strong')?.textContent||'전투원'},row._statusList));copy.append(row);}
 row._statusList=(row._statusList||[]).filter(s=>s.id!==status.id);row._statusList.push(entry);
 row.querySelector('.st-chip[data-id="'+status.id+'"]')?.remove();const chip=statusChip(entry);chip.classList.add('fresh');row.append(chip);
 const cls=STATUS.find(([id])=>id===status.id)?.[1];if(cls){let fx=node.querySelector(':scope > .status-fx');if(!fx){fx=span('status-fx');node.append(fx);}if(!fx.querySelector('.st-'+cls))fx.append(span('st st-'+cls));}
}
function lockOn(layer,p){const n=mote(layer,'wfx-sight',p,'#ff5a4a');CombatFX.animate(n,[{transform:'translate(-50%,-50%) scale(2.4) rotate(-90deg)',opacity:0},{offset:.35,opacity:1},{offset:.7,transform:'translate(-50%,-50%) scale(1) rotate(0deg)',opacity:1},{transform:'translate(-50%,-50%) scale(.92) rotate(0deg)',opacity:0}],{duration:900,easing:'cubic-bezier(.2,.7,.3,1)',fill:'both'});}
function onFrame(frame,effects){
 if(!frame||frame.kind!=='action'||typeof CombatFX==='undefined')return;
 const layer=effects?.layerNode?.();if(!layer)return;const motion=!reduced();
 const auxiliary=frame.periodic||(frame.events||[]).every(e=>(e.sourceKind&&e.sourceKind!=='JOINT_ATTACK')||e.kind==='reaction');
 const actorNode=effects.actorNode?.(frame.actorId),from=CombatFX.point(actorNode),style=auxiliary?null:attackStyle(frame),burst=/_Q$/.test(String(frame.cardId||''));
 const pw=powerOf(actorOf(frame.actorId));
 let blows=0;
 for(const t of frame.targets||[]){
  const node=effects.actorNode?.(t.targetId),p=CombatFX.point(node);
  if(Number(t.damage)>0||Number(t.absorbed)>0)flash(node,'damage');else if(Number(t.heal)>0)flash(node,'heal');
  for(const e of t.events||[])if(e.statusApplied){liveStatus(node,e.statusApplied);if(e.statusApplied.id==='STATUS_ISEKAI_EXPOSED'&&p&&motion)lockOn(layer,p);}
  const before=Number(t.shieldBefore),after=Number(t.shieldAfter);
  if(node&&Number.isFinite(before)&&Number.isFinite(after)){
   const fx=node.querySelector(':scope > .shield-fx'),kind=fx?.className.match(/shield-(\w+)/)?.[1]||'plain';
   if(before>0&&after<=0){fx?.remove();if(p&&motion)shatter(layer,p,kind);}
   else if(after>before){if(fx){fx.classList.remove('appear');void fx.offsetWidth;fx.classList.add('appear');}else node.append(bubble('plain','appear'));}
   else if(Number(t.absorbed)>0&&fx){fx.classList.remove('hit');void fx.offsetWidth;fx.classList.add('hit');}
  }
  if(!p||!motion)continue;
  const hit=(t.events||[]).find(e=>e.kind==='damage');
  if(style&&hit&&t.targetId!==frame.actorId&&blows<5){blows++;const angle=from?Math.atan2(p.y-from.y,p.x-from.x):0;strike(layer,style,p,{tint:TINT[hit.element]||'#ffffff',size:burst?1.3:1,angle},pw);}
  const kinds=new Set();for(const e of t.events||[]){const k=reactionOf(e.kind==='reaction'?(e.reactionId||e.label):e.reactionId);if(k)kinds.add(k);}
  for(const k of [...kinds].slice(0,2))REACTION_FX[k](layer,p);
 }
}
if(typeof GameEffects!=='undefined'&&typeof GameEffects.showAction==='function'){const prior=GameEffects.showAction;GameEffects.showAction=function(frame,...args){const out=prior.call(this,frame,...args);try{onFrame(frame,this);}catch(e){console.warn('battle fx',e);}return out;};}

// ---- battle speed: the label is twice the real rate (the old 0.5× is the new 1×, the default) and 2× is the top
// (user: 「전투 속도는 2배가 최대로.. 4배는 좀;」), so the slider runs 1× · 1.5× · 2×.
const speedLabel=v=>(Number(v)*2).toFixed(2).replace(/0$/,'')+'×',SPEED_MAX=1;
function migrateSpeed(){
 if(typeof settings==='undefined')return;let changed=false;
 if(settings.combatSpeedScale!==2){settings.combatSpeed=Math.max(.5,(Number(settings.combatSpeed)||1)/2);settings.combatSpeedScale=2;changed=true;}
 if(!(Number(settings.combatSpeed)<=SPEED_MAX)){settings.combatSpeed=SPEED_MAX;changed=true;}
 if(changed)try{localStorage.setItem('crpg-preferences-v3',JSON.stringify(settings));}catch{}
}
if(typeof combatSpeedControl==='function'){const prior=combatSpeedControl;combatSpeedControl=function(){migrateSpeed();const row=prior();const out=row.querySelector('output'),range=row.querySelector('input');if(range){range.max=String(SPEED_MAX);if(Number(range.value)>SPEED_MAX)range.value=String(SPEED_MAX);}if(out&&range)out.textContent=speedLabel(range.value);return row;};}
document.addEventListener('input',e=>{const range=e.target;if(!range?.closest?.('.combat-speed'))return;for(const o of document.querySelectorAll('.combat-speed output'))o.textContent=speedLabel(range.value);});

window.BattleFX={decorate,roundOrder,roundTimes,powerOf,reactionOf,shieldKind,attackStyle,weaponOf,windupShot,onFrame,speedLabel,migrateSpeed,SPEED_MAX};
})();
