/* 0.16.52 (user, 2026-10-16: 「토끼백작같은것들도 전투중에 생성되지 않고, 그 턴 종료시에 등장하는 버그」): the battle screen is drawn
 * before a turn's playback and again after it, so a summon made during the turn — 토끼 백작, 오즈, 누룽지, 월계, 종려's 석주, 응광's
 * 병풍, 감우's 연꽃, 리사's 장미, a field boss's summons — showed up only when the whole turn had played. Now its card joins its lane
 * at the frame where its owner casts it (or, at the latest, the first frame where it acts or is hit). The card is built by the
 * same battleSummons as the full screen, from the turn's final state; the screen is drawn again as before when the turn ends.
 * View only. Load after app_battle_layout_v01522.js. */
(function(){'use strict';
if(typeof GameEffects==='undefined'||typeof GameEffects.showAction!=='function'||typeof battleSummons!=='function')return;
const stageNode=()=>{const teams=document.querySelector('.combat-panel .battle-teams')||document.querySelector('.battle-teams');return teams?.parentElement||null;};
const onScreen=id=>!!document.querySelector('.battle-summon[data-summon-id="'+CSS.escape(id)+'"]');
const fieldId=f=>'SUMMON:'+f.kind+':'+f.actor;
const cardOf=frame=>String(frame?.cardId||(frame?.events||[]).find(e=>e.cardId)?.cardId||'');
// Everyone a frame touches: its actor and its targets (a summon acting or hit must be on screen by then).
const touched=frame=>{const ids=new Set([frame?.actorId]);for(const t of frame?.targets||[])ids.add(t.targetId);for(const e of frame?.events||[]){ids.add(e.actorId);ids.add(e.targetId);ids.add(e.presentationActorId);}ids.delete(undefined);return ids;};
function bring(frame){
 const b=game?.s?.runtime,stage=stageNode();if(!b||!stage||!frame)return;
 const actor=frame.actorId,card=cardOf(frame),ids=touched(frame),cast=!!actor&&/(_E|_Q|SUMMON)/.test(card);
 const fields=(b.fields||[]).filter(f=>f.actor&&!onScreen(fieldId(f))&&((cast&&f.actor===actor)||ids.has(fieldId(f))));
 const fighters=(b.actors||[]).filter(a=>a.fbSummon&&!onScreen(a.id)&&((cast&&a.fbSummon.owner===actor)||ids.has(a.id)));
 if(!fields.length&&!fighters.length)return;
 // The turn's final state may already have the summon spent (토끼 백작 bursts when the next round begins): show it whole.
 const temp=document.createElement('div');
 try{battleSummons(temp,{...b,fields:fields.map(f=>({...f,done:false,hp:f.hp>0?f.hp:(f.maxHp||1)})),actors:fighters.map(a=>({...a,hp:a.hp>0?a.hp:a.maxHp}))});}catch(e){console.warn('[summons]',e);return;}
 const made=temp.querySelector('.battle-summons');if(!made)return;
 for(const c of made.querySelectorAll('.battle-summon'))c.classList.add('summon-arrive');
 const wrap=stage.querySelector('.battle-summons');
 if(!wrap){stage.prepend(made);return;}
 for(const lane of [...made.querySelectorAll('.summon-lane')]){const side=lane.classList.contains('ally')?'ally':'enemy',into=wrap.querySelector('.summon-lane.'+side);if(!into){wrap.append(lane);continue;}for(const c of [...lane.querySelectorAll('.battle-summon')])into.append(c);}
}
const prior=GameEffects.showAction;
GameEffects.showAction=function(frame,...args){try{bring(frame);}catch(e){console.warn('[summons]',e);}return prior.call(this,frame,...args);};
})();
