/* 0.16.52 (user, 2026-10-16: 「토끼백작같은것들도 전투중에 생성되지 않고, 그 턴 종료시에 등장하는 버그」): the battle screen is drawn
 * before a turn's playback and again after it, so a summon made during the turn — 토끼 백작, 오즈, 누룽지, 월계, 종려's 석주, 응광's
 * 병풍, 감우's 연꽃, 리사's 장미, a field boss's summons — showed up only when the whole turn had played. Now its card joins its lane
 * at the frame where its owner casts it (or, at the latest, the first frame where it acts or is hit). The card is built by the
 * same battleSummons as the full screen, from the turn's final state; the screen is drawn again as before when the turn ends.
 * View only. Load after app_battle_layout_v01522.js.
 * 0.16.58 (user: 「토끼백작이 너무 빨리 나오잖아 전체적으로 전투 순서부분에서 드러나는걸 좀 다 체크해봐 스킬별로 전부 다」): a summon comes
 * with the very skill that makes it — any E or Q of its owner brought it before, so 토끼 백작 stood there from 엠버's 화살비 on, 누룽지
 * from 향릉's 원소폭발, 연꽃 from 감우's. One made and spent within the same playback (토끼 백작 bursting at the next round) is shown
 * too, and a summon that has burst or run out leaves the lane once its last beat has played. 토끼 백작's 「다음 라운드 · 폭발」 joins
 * the order as it is cast. */
(function(){'use strict';
if(typeof GameEffects==='undefined'||typeof GameEffects.showAction!=='function'||typeof battleSummons!=='function')return;
const stageNode=()=>{const teams=document.querySelector('.combat-panel .battle-teams')||document.querySelector('.battle-teams');return teams?.parentElement||null;};
const onScreen=id=>!!document.querySelector('.battle-summon[data-summon-id="'+CSS.escape(id)+'"]');
const fieldId=f=>'SUMMON:'+f.kind+':'+f.actor;
const cardOf=frame=>String(frame?.cardId||(frame?.events||[]).find(e=>e.cardId)?.cardId||'');
// Everyone a frame touches: its actor and its targets (a summon acting or hit must be on screen by then).
const touched=frame=>{const ids=new Set([frame?.actorId]);for(const t of frame?.targets||[])ids.add(t.targetId);for(const e of frame?.events||[]){ids.add(e.actorId);ids.add(e.targetId);ids.add(e.presentationActorId);}ids.delete(undefined);return ids;};
// The skill that makes each summon (runtime_combat.js · runtime_liyue_cards.js), and what a field boss's summoning is logged as
// (runtime_field_bosses.js fbLog / fbSpawnMimics).
const MAKERS={BUNNY:['MOND_AMBER_E'],OZ:['MOND_FISCHL_E','MOND_FISCHL_Q'],ROSE:['MOND_LISA_Q'],GOU_BA:['LIYUE_XIANGLING_E'],ICE_LOTUS:['LIYUE_GANYU_E'],JADE_SCREEN:['LIYUE_NINGGUANG_E'],YUEGUI_THROWING:['LIYUE_YAOYAO_E','LIYUE_YAOYAO_Q'],STONE_STELE:['LIYUE_ZHONGLI_E']};
const BOSS_SUMMONING=new Set(['FB_PRISM','FB_PILLARS','FB_REVIVE','FB_OCEANID_FORMS']);
const makes=(kind,card)=>(MAKERS[kind]||[]).includes(card);
// A summon spent before the turn ended is no longer in the final state; it is drawn from what its skill makes.
function madeNow(b,kind,owner){const a=(b.actors||[]).find(x=>x.id===owner);if(!a)return null;
 if(kind==='BUNNY'){const hp=Math.max(1,Math.floor((a.maxHp||1)*.25));return {kind,actor:owner,side:a.side,name:'토끼 백작',hp,maxHp:hp,tauntChance:30,asset:'summon_baron_bunny.webp'};}
 return {kind,actor:owner,side:a.side,rounds:1};}
let frames=[],shownAt=-1;
if(typeof GameEffects.play==='function'){const priorPlay=GameEffects.play;GameEffects.play=function(events,...rest){frames=Array.isArray(events)?events.filter(e=>e&&e.kind==='action'):[];shownAt=-1;return priorPlay.call(this,events,...rest);};}
function orderEntry(f,round){
 const order=document.querySelector('.combat-panel .battle-order');if(!order||order.dataset.round!==String(round))return;const id=fieldId(f);if(order.querySelector('li[data-actor-id="'+CSS.escape(id)+'"]'))return;
 const li=el('li','summon next '+(f.side==='ENEMY'?'enemy':'ally'));li.dataset.actorId=id;li.title='다음 라운드가 시작될 때 한 번 터져 적 최대 3명에게 피해';
 if(typeof showArt==='undefined'||showArt){const img=el('img','order-face');img.src='assets/summons/'+(f.asset||'summon_baron_bunny.webp');img.alt='';img.decoding='async';li.append(img);li.classList.add('with-face');}
 li.append(el('span','',f.name||'토끼 백작'),el('small','order-what','다음 라운드 · 폭발'));order.append(li);
}
function bring(frame){
 const b=game?.s?.runtime,stage=stageNode();if(!b||!stage||!frame)return;
 const actor=frame.actorId,card=cardOf(frame),ids=touched(frame),cast=!!actor&&!frame.periodic;
 const fields=(b.fields||[]).filter(f=>f.actor&&!onScreen(fieldId(f))&&((cast&&f.actor===actor&&makes(f.kind,card))||ids.has(fieldId(f))));
 if(cast)for(const kind of Object.keys(MAKERS))if(makes(kind,card)&&!onScreen('SUMMON:'+kind+':'+actor)&&!fields.some(f=>f.kind===kind&&f.actor===actor)){const f=madeNow(b,kind,actor);if(f)fields.push(f);}
 const fighters=(b.actors||[]).filter(a=>a.fbSummon&&!onScreen(a.id)&&((cast&&a.fbSummon.owner===actor&&BOSS_SUMMONING.has(card))||ids.has(a.id)));
 if(!fields.length&&!fighters.length)return;
 // The turn's final state may already have the summon spent (토끼 백작 bursts when the next round begins): show it whole.
 const temp=document.createElement('div');
 try{battleSummons(temp,{...b,fields:fields.map(f=>({...f,done:false,hp:f.hp>0?f.hp:(f.maxHp||1)})),actors:fighters.map(a=>({...a,hp:a.hp>0?a.hp:a.maxHp}))});}catch(e){console.warn('[summons]',e);return;}
 const made=temp.querySelector('.battle-summons');if(!made)return;
 for(const c of made.querySelectorAll('.battle-summon'))c.classList.add('summon-arrive');
 const wrap=stage.querySelector('.battle-summons');
 if(!wrap)stage.prepend(made);
 else for(const lane of [...made.querySelectorAll('.summon-lane')]){const side=lane.classList.contains('ally')?'ally':'enemy',into=wrap.querySelector('.summon-lane.'+side);if(!into){wrap.append(lane);continue;}for(const c of [...lane.querySelectorAll('.battle-summon')])into.append(c);}
 if(cast)for(const f of fields)if(f.kind==='BUNNY'&&f.actor===actor)orderEntry(f,frame.round);
}
// A summon whose own last beat has played and which is gone when the turn ends (burst, struck down, run out) leaves the lane;
// its 「다음 라운드 · 폭발」 goes with it.
function sweep(index){
 const b=game?.s?.runtime;if(!b||index<0)return;
 for(const card of document.querySelectorAll('.battle-summon[data-summon-id^="SUMMON:"]')){const id=card.dataset.summonId,live=(b.fields||[]).some(f=>fieldId(f)===id&&!f.done&&(f.kind!=='BUNNY'||f.hp>0));if(live)continue;
  let last=-1;frames.forEach((f,i)=>{if(f.actorId===id||touched(f).has(id))last=i;});if(last<0||last>=index)continue;
  card.remove();document.querySelector('.battle-order li.next[data-actor-id="'+CSS.escape(id)+'"]')?.remove();}
 for(const lane of document.querySelectorAll('.battle-summons .summon-lane'))if(!lane.querySelector('.battle-summon'))lane.remove();
}
const prior=GameEffects.showAction;
GameEffects.showAction=function(frame,...args){try{const i=frames.indexOf(frame);if(i>=0){shownAt=i;sweep(i);}bring(frame);}catch(e){console.warn('[summons]',e);}return prior.call(this,frame,...args);};
})();

/* 0.16.58 (user: 「과부하인가 초전도인가 그거도 뭔가 하나씩 하나씩 터지는 문제가 있던거같은데 그냥 다~~ 체크해봐」): the playback's beats
 * (CRPGPresentation.actionFrames) join a turn's log lines while they share the fighter, the card and the kind of source. What a blow
 * sets off broke that, so one blow played in several beats, a target at a time:
 * - a field's tick (클레 · 케이아 · 설탕 · 감우 · 향릉 · 신학 · 리사's 장미 · 오즈) and the reaction it causes — 과부하 A, tick B, 과부하 B…;
 * - the debuff a reaction leaves (초전도's 물리 내성 감소) credited to the foe it lands on, a beat 「적 · 효과」 between the hits;
 * - a silent change (a status running out, a cooldown) between a hit and its reaction (디오나 · 신학 · 달리아 · 미카 · 타르탈리아 freezes,
 *   벤티's 원소폭발);
 * - 토끼 백작's blast and the 과부하 it sets off, logged under 엠버, played as two attacks;
 * - a follow-up another fighter's blow sets off (한운 · 행추 · 소) cutting that blow in two.
 * Before the beats are made, each blow takes what it set off, a silent change joins the beat it happened in, and a follow-up plays
 * right after the blow that set it off — unless it struck the same foe first, so every HP shown stays in the order it happened.
 * The log, the state and the numbers are untouched. */
(function(){'use strict';
const P=window.CRPGPresentation;if(!P?.actionFrames)return;
const periodic=e=>/^(FIELD|OBJECT|REACTION_DOT)$/.test(e?.sourceKind||''),summonId=id=>String(id||'').startsWith('SUMMON:'),ownerOf=id=>summonId(id)?String(id).split(':').slice(2).join(':'):null;
const plain=e=>e&&typeof e==='object'&&Number.isInteger(e.round)&&Number.isInteger(e.action)&&!['victory','defeat','line'].includes(e.kind);
const direct=e=>!e.sourceKind||e.sourceKind==='JOINT_ATTACK'||e.sourceKind==='BOSS_ARENA';
const merge=(a,b,later)=>{const out=(a||[]).map(x=>({...x}));for(const y of b||[]){const x=out.find(z=>z.id===y.id);if(!x){out.push({...y});continue;}for(const k of Object.keys(y))if(k!=='id'&&(later||!Object.hasOwn(x,k)))x[k]=y[k];}return out;};
const hpOf=u=>{const s=new Set();for(const e of u.events)if(e.targetId&&(Number.isFinite(e.hpAfter)||e.kind==='heal'||e.kind==='damage'))s.add(e.targetId);return s;};
function tidy(events){
 const out=[],list=(events||[]).map(e=>e&&typeof e==='object'?{...e}:e);let i=0;
 while(i<list.length){
  const head=list[i];if(!plain(head)){out.push(head);i++;continue;}
  let j=i;while(j<list.length&&plain(list[j])&&list[j].round===head.round&&list[j].action===head.action)j++;
  const block=list.slice(i,j);i=j;
  // 1. a blow and what it sets off
  const units=[];
  const join=(u,e)=>{const a=u.events[0];e.actorId=a.actorId;e.actor=a.actor;if(a.actorSide)e.actorSide=a.actorSide;
   if(periodic(a)||summonId(a.actorId)){e.sourceKind=a.sourceKind;e.cardId=a.cardId;if(a.cardName)e.cardName=a.cardName;}else if(a.cardId&&!e.cardId)e.cardId=a.cardId;u.events.push(e);};
  const lastBy=test=>{for(let k=units.length-1;k>=0;k--)if(test(units[k],k))return k;return -1;};
  const clearAfter=(k,target)=>!target||units.slice(k+1).every(u=>!hpOf(u).has(target));
  // a silent change before anything else in the turn (the turn beginning: its count, its cooldowns) goes with the first line after it
  let held=null;
  for(const e of block){
   const last=units[units.length-1];
   if(e.kind==='state'&&e.silent){const after=e.presentationActorsAfter?[...e.presentationActorsAfter]:[];
    if(e.targetId&&Number.isFinite(e.hpAfter)&&!after.some(a=>a.id===e.targetId&&Object.hasOwn(a,'hp')))after.push({id:e.targetId,hp:e.hpAfter});
    if(!last){held=held?{...held,presentationActorsBefore:merge(held.presentationActorsBefore,e.presentationActorsBefore,false),presentationActorsAfter:merge(held.presentationActorsAfter,after,true)}:{...e,presentationActorsAfter:after};continue;}
    const p=last.events[last.events.length-1];p.presentationActorsBefore=merge(p.presentationActorsBefore,e.presentationActorsBefore,false);p.presentationActorsAfter=merge(p.presentationActorsAfter,after,true);
    // the card's own line often comes last (바바라's 원소폭발 heals first): its card names the whole turn
    if(e.cardId&&e.actorId===last.events[0].actorId&&!periodic(last.events[0]))for(const x of last.events)if(!x.cardId)x.cardId=e.cardId;continue;}
   if(held){e.presentationActorsBefore=merge(held.presentationActorsBefore,e.presentationActorsBefore,false);e.presentationActorsAfter=merge(held.presentationActorsAfter,e.presentationActorsAfter,true);held=null;}
   let k=-1;
   if(e.kind==='reaction'||e.sourceKind==='REACTION'){k=lastBy(u=>{const a=u.events[0].actorId;return a===e.actorId||ownerOf(a)===e.actorId;});if(k>=0&&!clearAfter(k,Number.isFinite(e.hpAfter)?e.targetId:null))k=-1;}
   else if(e.kind==='status'){k=e.actorId&&e.actorId===e.targetId?lastBy(u=>u.events.some(x=>x.targetId===e.targetId&&x.kind!=='status')):-1;if(k<0)k=lastBy(u=>u.events[0].actorId===e.actorId);}
   else if(e.kind==='heal'&&!e.cardId&&!e.sourceKind)k=lastBy((u,n)=>n===units.length-1&&u.events[0].actorId===e.actorId&&periodic(u.events[0]));
   if(k>=0){join(units[k],e);continue;}
   // a summon or field keeps hitting on: its later hits (logged without the card) stay in its beat
   if(periodic(e)&&!e.cardId&&last&&last.events[0].actorId===e.actorId&&last.events[0].sourceKind===e.sourceKind){join(last,e);continue;}
   units.push({events:[e]});
  }
  if(held)units.push({events:[held]});
  // 2. a follow-up that another fighter's blow set off plays after that blow (unless it hit the same foe first)
  const deferable=(u,primary)=>{const a=u.events[0];return !!primary&&a.actorId!==primary&&(['FOLLOWUP','BUBBLE','LIGHTFALL_EXPLOSION'].includes(a.sourceKind)||a.kind==='heal'&&!a.cardId&&!a.sourceKind);};
  let primary=null,pending=[];const flush=()=>{for(const u of pending)out.push(...u.events);pending=[];};
  for(const u of units){const a=u.events[0];
   if(deferable(u,primary)){pending.push(u);continue;}
   if(a.actorId===primary){const hit=hpOf(u);if(pending.some(p=>[...hpOf(p)].some(t=>hit.has(t))))flush();}else flush();
   out.push(...u.events);if(direct(a)&&!summonId(a.actorId)&&a.kind!=='status')primary=a.actorId;}
  flush();
 }
 return out;
}
const prior=P.actionFrames;
P.actionFrames=function(events,...rest){let list=events;try{list=tidy(events);}catch(e){console.warn('[beats]',e);list=events;}return prior.call(this,list,...rest);};
P.tidyBeats=tidy;
})();
