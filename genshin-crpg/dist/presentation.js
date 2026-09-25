/* Pure, deterministic combat presentation. No game RNG or clocks are consumed. */
(function(root){
  'use strict';
  const elements={'불':'fire','PYRO':'fire','물':'water','HYDRO':'water','얼음':'ice','CRYO':'ice','번개':'lightning','ELECTRO':'lightning','바람':'wind','ANEMO':'wind','바위':'rock','GEO':'rock','풀':'dendro','DENDRO':'dendro'};
  const reactionCue=id=>id==='RX_SHATTER'?'hit':/MELT/.test(id)?'melt':/VAPORIZE/.test(id)?'vaporize':/OVERLOADED/.test(id)?'overload':/FROZEN/.test(id)?'freeze':/BURN|BURGEON/.test(id)?'fire':/ELECTRO|AGGRAVATE|SUPERCONDUCT/.test(id)?'lightning':/SWIRL/.test(id)?'wind':/CRYSTALLIZE/.test(id)?'rock':'dendro';
  const parse=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
  function snapshot(s){return {saveId:s?.global.SAVE_ID,battleId:s?.runtime?.id||null,count:s?.runtime?.log.length||0,actors:(s?.runtime?.actors||[]).map(a=>({id:a.id,name:a.name,side:a.side,hp:a.hp,maxHp:a.maxHp})),resultId:parse(s?.global.LAST_BATTLE_RESULT_JSON).battleId||null};}
  function delta(before,s){
    if(!before||before.saveId!==s.global.SAVE_ID)return [];
    const result=parse(s.global.LAST_BATTLE_RESULT_JSON),b=s.runtime,id=b?.id||result.battleId;
    if(!id||(!b&&result.battleId===before.resultId))return [];
    const logs=b?.log||s.lastCombatLog||[],start=before.battleId===id?before.count:0,actors=b?.actors||before.actors;
    const resolve=(name,explicit)=>explicit&&actors.find(a=>a.id===explicit)||((actors.filter(a=>a.name===name).length===1)?actors.find(a=>a.name===name):null);
    const display=a=>{if(!a)return '';const same=actors.filter(x=>x.name===a.name&&x.side===a.side);return a.name+(same.length>1?' '+(same.indexOf(a)+1):'');};
    const events=[];
    logs.slice(start).forEach((entry,n)=>{
      const target=resolve(entry.target,entry.targetId),actor=resolve(entry.actor,entry.actorId),base={key:s.global.SAVE_ID+':'+id+':'+(start+n)+':'+s.global.LAST_COMMITTED_ACTION_ID,targetId:target?.id||null,actorId:actor?.id||null,actorSide:actor?.side||null,side:target?.side||null,target:display(target)||entry.target||'',actor:display(actor)||entry.actor||'',element:elements[entry.element]||'hit',hpBefore:entry.hpBefore,hpAfter:entry.hpAfter,maxHp:entry.maxHp,round:entry.round,action:entry.actionSequence,cardName:entry.cardName||'',cardId:entry.card||entry.presentationCardId||null,sourceKind:entry.sourceKind||entry.presentationSourceKind||null,absorbed:Number(entry.absorbed)||0,reactionId:entry.reaction||null,jointAttack:!!entry.jointAttack,jointSkipped:!!entry.jointSkipped,jointBonusPct:entry.jointBonusPct,jointIndex:entry.jointIndex,enemySkill:!!entry.enemySkill,charging:!!entry.charging,interrupted:!!entry.interrupted,released:!!entry.released,skillText:entry.text||''};
      let e;
      if(entry.charging||entry.interrupted||entry.released)e={kind:'skill',label:entry.text||entry.cardName||'기술 사용',cue:null};
      else if(Number.isFinite(entry.maxHpChange))e={kind:'capacity',label:entry.maxHpChange<0?'최대 HP '+entry.maxHpChange:'최대 HP 복원',cue:null};
      else if(entry.jointSkipped)e={kind:'notice',label:entry.text||'합동 공격 불참',cue:null};
      else if(entry.immune)e={kind:'immune',label:'면역',cue:null};
      else if(entry.miss)e={kind:'miss',label:'빗나감',cue:null};
      else if(Object.hasOwn(entry,'damage'))e=entry.damage>0?{kind:'damage',label:String(entry.damage),amount:entry.damage,critical:!!entry.critical,cue:base.element}:entry.absorbed>0?{kind:'guard',label:'보호막 흡수 '+entry.absorbed,cue:'guard'}:null;
      else if(entry.reaction)e={kind:'reaction',label:entry.reactionName||'원소 반응',cue:reactionCue(entry.reaction),reaction:entry.reaction,element:reactionCue(entry.reaction)};
      else if(entry.heal>0)e={kind:'heal',label:'+'+entry.heal,amount:entry.heal,cue:'heal',element:'heal'};
      else if(entry.guard||entry.reshield)e={kind:'guard',label:'방어',cue:'guard',targetId:target?.id||actor?.id||null,element:'guard'};
      if(!e&&entry.card&&!events.some(x=>x.actorId===base.actorId&&x.round===base.round&&x.action===base.action))e={kind:'skill',label:entry.cardName||'스킬 사용',cue:null};
      if(e)events.push({...base,...e});
    });
    if(!b&&result.battleId!==before.resultId)events.push({key:s.global.SAVE_ID+':'+id+':result:'+s.global.LAST_COMMITTED_ACTION_ID,kind:result.victory?'victory':'defeat',label:result.victory?'전투 승리':'전투 종료',cue:result.victory?'victory':'defeat',element:result.victory?'heal':'fire'});
    return events;
  }
  root.CRPGPresentation={snapshot,delta};
  // Exact target IDs are attached at the damage boundary, where names may repeat.
  const P=root.CRPGRuntime?.Runtime.prototype;
  const stamp=(entry,b,a,t)=>{if(!entry)return;if(t&&entry.target===t.name&&!entry.targetId)entry.targetId=t.id;if(a&&entry.actor===a.name&&!entry.actorId)entry.actorId=a.id;entry.round??=b.round;entry.actionSequence??=b.actionSequence||0;};
  if(P?.applyDamage){const old=P.applyDamage;P.applyDamage=function(a,t,...rest){const b=this.s.runtime,start=b?.log.length||0,hp=t?.hp,result=old.call(this,a,t,...rest);const entry=b?.log.slice(start).find(e=>e.target===t?.name&&(Object.hasOwn(e,'damage')||e.immune));if(entry){stamp(entry,b,a,t);if(!entry.sourceKind&&rest[1]?.sourceKind)entry.presentationSourceKind=rest[1].sourceKind;if(!entry.card&&rest[1]?.card)entry.presentationCardId=rest[1].card;Object.assign(entry,{hpBefore:hp,hpAfter:Math.max(0,hp-Number(entry.damage||0)),maxHp:t.maxHp});}return result;};}
  if(P?.heal){const old=P.heal;P.heal=function(t,...rest){const b=this.s.runtime,start=b?.log.length||0,hp=t?.hp,result=old.call(this,t,...rest);const entry=b?.log.slice(start).find(e=>e.target===t?.name&&Object.hasOwn(e,'heal'));if(entry){stamp(entry,b,null,t);Object.assign(entry,{hpBefore:hp,hpAfter:t.hp,maxHp:t.maxHp});}return result;};}
  for(const method of ['damage','applyCombatAura'])if(P?.[method]){const old=P[method];P[method]=function(a,t,...rest){const b=this.s.runtime,start=b?.log.length||0,result=old.call(this,a,t,...rest);for(const entry of b?.log.slice(start)||[]){stamp(entry,b,a,t);if(method==='damage'&&(entry.miss||entry.immune)){if(!entry.sourceKind&&rest[2]?.sourceKind)entry.presentationSourceKind=rest[2].sourceKind;if(!entry.card&&rest[2]?.card)entry.presentationCardId=rest[2].card;}}return result;};}
  for(const method of ['executeCard','aiTurn','executeCombatSystem'])if(P?.[method]){const old=P[method];P[method]=function(a,...rest){const b=this.s.runtime,start=b?.log.length||0,result=old.call(this,a,...rest),card=method==='executeCard'?rest[0]:null;for(const entry of b?.log.slice(start)||[]){stamp(entry,b,a,null);if(entry.card&&!entry.cardName){const own=this.combatRows('08_SKILL_CARD_DB').find(r=>r[0]===entry.card),enemy=own?null:this.combatRows('12_ENEMY_CARD_DB').find(r=>r[0]===entry.card);entry.cardName=own?.[3]||enemy?.[2]||card?.name||'';}else if(card?.name&&!entry.cardName)entry.cardName=card.name;}return result;};}
})(typeof window!=='undefined'?window:globalThis);

/* Pure display summaries. The raw combat log, state, RNG and delta events stay authoritative. */
(function(root){
 'use strict';
 const direct=e=>!e.sourceKind||e.sourceKind==='JOINT_ATTACK',
   periodic=e=>/^(FIELD|OBJECT|REACTION_DOT)$/.test(e.sourceKind||''),
   impact=e=>['damage','miss','immune'].includes(e.kind)||(e.kind==='guard'&&e.absorbed>0),
   category=e=>periodic(e)?e.sourceKind+':'+(e.cardId||e.cardName||''):'ACTION',
   same=(a,b)=>a&&b&&Number.isInteger(a.round)&&Number.isInteger(a.action)&&a.actorId&&a.round===b.round&&a.action===b.action&&a.actorId===b.actorId&&(!a.cardId||!b.cardId||a.cardId===b.cardId)&&category(a)===category(b)&&!['victory','defeat'].includes(a.kind)&&!['victory','defeat'].includes(b.kind);
 function summarize(events){
  const first=events[0],last=events[events.length-1];
  if(['victory','defeat'].includes(first.kind))return {...first,events:events.slice(),targets:[],reactions:[]};
  const targets=[],reactions=[];
  for(const event of events){
   if(event.kind==='reaction'&&!reactions.includes(event.label))reactions.push(event.label);
   // Never guess the identity of an ambiguous name. A missing target remains a standalone outcome.
   if(!event.targetId)continue;
   let target=targets.find(t=>t.targetId===event.targetId);
   if(!target){target={targetId:event.targetId,target:event.target,side:event.side,damage:0,heal:0,hitCount:0,attemptCount:0,missCount:0,immuneCount:0,absorbed:0,critical:false,events:[]};targets.push(target);}
   target.events.push(event);
   if(Number.isFinite(event.hpBefore)&&!Number.isFinite(target.hpBefore))target.hpBefore=event.hpBefore;
   if(Number.isFinite(event.hpAfter))target.hpAfter=event.hpAfter;
   if(Number.isFinite(event.maxHp))target.maxHp=event.maxHp;
   if(event.kind==='damage')target.damage+=Number(event.amount)||0;
   if(event.kind==='heal')target.heal+=Number(event.amount)||0;
   target.absorbed+=Number(event.absorbed)||0;
   target.critical=target.critical||!!event.critical;
   if(impact(event)&&direct(event)){target.attemptCount++;if(event.kind==='damage'||event.kind==='guard')target.hitCount++;}
   if(event.kind==='miss')target.missCount++;
   if(event.kind==='immune')target.immuneCount++;
  }
  const amount=events.filter(e=>e.kind==='damage').reduce((sum,e)=>sum+(Number(e.amount)||0),0),heal=events.filter(e=>e.kind==='heal').reduce((sum,e)=>sum+(Number(e.amount)||0),0);
  return {...first,key:first.key+'..'+last.key,kind:'action',events:events.slice(),targets,reactions,amount,heal,
   hitCount:Math.max(0,...targets.map(t=>t.hitCount)),attemptCount:Math.max(0,...targets.map(t=>t.attemptCount)),
   cardName:events.find(e=>e.cardName)?.cardName||first.cardName||'',
   critical:events.some(e=>e.critical),periodic:periodic(first),sourceKind:first.sourceKind||null};
 }
 function actionFrames(events){
  const groups=[];
  for(const event of events||[]){const current=groups[groups.length-1];if(current&&same(current[current.length-1],event))current.push(event);else groups.push([event]);}
  return groups.map(summarize);
 }
 root.CRPGPresentation.actionFrames=actionFrames;
})(typeof window!=='undefined'?window:globalThis);
