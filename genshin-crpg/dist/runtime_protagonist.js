/* Stage 2 — route-specific protagonists. Pure combat projections; explicit, idempotent save migration.
 * Coefficients/turns and the isekai powers are CRPG house rules, not claims about official game values.
 */
(function(root){'use strict';
const api=root.CRPGRuntime,{Runtime,RuleError}=api,P=Runtime.prototype;
const PLAYER='PLAYER_CUSTOM',TRAVELER='ROUTE_TRAVELER',ISEKAI='ROUTE_ISEKAI',VERSION=1;
const TE='PLAYER_TRAVELER_ANEMO_E',TQ='PLAYER_TRAVELER_ANEMO_Q',IE='PLAYER_ISEKAI_E',IQ='PLAYER_ISEKAI_Q';
const IDS=new Set([TE,TQ,IE,IQ]),ABSORB=['물','불','얼음','번개'];
const copy=x=>JSON.parse(JSON.stringify(x)),parse=(x,d={})=>{try{return JSON.parse(x)}catch{return d}};
const truth=x=>x===true||x==='TRUE',fail=(c,m)=>{throw new RuleError(c,m)};
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
const old={};for(const k of ['newGame','validateSave','startBattle','initCombatActor','actorCards','cardSupport','cardTargets','cardReason','combatCards','executeCard','onCombatTurnStart','roundEnd','finishBattle','apply'])old[k]=P[k];
P.protagonistConfig=function(){const c=parse(this.config('PROTAGONIST_COMBAT_CONFIG_JSON'));if(c.version!==VERSION)fail('PROTAGONIST_CONFIG','주인공 전투 규칙 버전이 일치하지 않습니다.');return c;};
P.protagonistUnlocked=function(s=this.s){return s?.global.STORY_ROUTE_ID===TRAVELER&&truth(s.flags?.FLAG_TRV_ANEMO_UNLOCKED);};
P.protagonistAllowedIds=function(s=this.s){return s.global.STORY_ROUTE_ID===ISEKAI?[IE,IQ]:this.protagonistUnlocked(s)?[TE,TQ]:[];};
P.migrateProtagonist=function(s,isNew=false){
 if(!s?.global||s.runtime||this._creatingProtagonist)return s;
 const g=s.global,c=this.protagonistConfig(),v=g.PROTAGONIST_RULES_VERSION;
 if(v!==undefined&&v!==VERSION)fail('PROTAGONIST_VERSION','지원하지 않는 주인공 전투 규칙 저장입니다.');
 if(!c.profiles[g.STORY_ROUTE_ID])fail('PROTAGONIST_ROUTE','알 수 없는 주인공 루트입니다.');
 const f=Object.create(this);f.s=s;
 if(v===undefined){
  const hp=Number(g.PLAYER_HP_CURRENT),mx=Number(g.PLAYER_HP_MAX),profile=c.profiles[g.STORY_ROUTE_ID];
  // Preserve earned flat base-stat increases. Equipment remains separate and is recalculated normally.
  for(const [key,value]of Object.entries(profile))g['PLAYER_'+key]=Math.max(1,Number(g['PLAYER_'+key]||c.legacy_profile[key])+value-c.legacy_profile[key]);
  g.PROTAGONIST_RULES_VERSION=VERSION;f.recalculate();
  g.PLAYER_HP_CURRENT=isNew?g.PLAYER_HP_MAX:hp<=0?0:Math.max(1,Math.min(g.PLAYER_HP_MAX,Math.floor(g.PLAYER_HP_MAX*hp/Math.max(1,mx))));
  // Original opening already took place after the statue. Old saves past this exact node keep that knowledge.
  if(!isNew&&g.STORY_ROUTE_ID===TRAVELER){
   const applied=parse(g.STORY_NODE_EFFECTS_JSON),node=g.CURRENT_STORY_NODE_ID||g.STORY_CURSOR_NODE_ID;
   const rows=f.rows('55_MAIN_STORY_DB').filter(r=>r[0]===TRAVELER),at=rows.findIndex(r=>r[4]===node),unlock=rows.findIndex(r=>r[4]===c.traveler.unlock_node);
   if(truth(applied[TRAVELER+':'+c.traveler.unlock_node])||truth(applied[c.traveler.unlock_node])||at>unlock&&unlock>=0||truth(s.flags.FLAG_TRV_MON_PROLOGUE_CLEAR))s.flags[c.traveler.flag]=true;
  }
 }
 // Strip only these four route-exclusive cards; preserve basic/training/future unrelated acquisitions.
 const owned=String(g.PLAYER_SKILL_CARD_IDS||'').split(';').filter(id=>id&&!IDS.has(id));
 g.PLAYER_SKILL_CARD_IDS=[...new Set([...owned,...f.protagonistAllowedIds(s)])].join(';');
 return s;
};
P.newGame=function(...args){this._creatingProtagonist=true;try{old.newGame.apply(this,args);}finally{this._creatingProtagonist=false;}this.migrateProtagonist(this.s,true);return copy(this.s);};
P.validateSave=function(s){s=old.validateSave.call(this,s);this.migrateProtagonist(s);
 if(s.runtime){
  const a=s.runtime.actors.find(x=>x.source===PLAYER);
  if(a?.protagonist&&(a.protagonist.version!==VERSION||a.protagonist.route!==s.global.STORY_ROUTE_ID||!Array.isArray(a.protagonist.skillIds)))fail('PROTAGONIST_SAVE','주인공 전투 스냅샷이 올바르지 않습니다.');
  for(const t of s.runtime.actors){const w=t.protagonistHpWindow;if(!w)continue;
   if(w.version!==VERSION||w.owner!==PLAYER||![w.amount,w.heldHp,w.expiresTurn,w.originalMaxHp].every(Number.isSafeInteger)||w.amount<=0||w.heldHp<0||w.heldHp>w.amount||w.originalMaxHp!==t.maxHp+w.amount||w.expiresTurn<0||t.grade==='보스')fail('HP_WINDOW_SAVE','일시 최대 HP 효과의 저장 값이 올바르지 않습니다.');
  }
 }
 return s;
};
P.apply=function(...args){const result=old.apply.apply(this,args);this.migrateProtagonist(this.s);return result;};
P.startBattle=function(...args){if(!this.s.runtime)this.migrateProtagonist(this.s);return old.startBattle.apply(this,args);};
P.initCombatActor=function(a,...args){a=old.initCombatActor.call(this,a,...args);if(a.source===PLAYER)a.protagonist={version:VERSION,route:this.s.global.STORY_ROUTE_ID,skillIds:this.protagonistAllowedIds().slice()};return a;};
P.actorCards=function(a){const cards=old.actorCards.call(this,a);if(a.source!==PLAYER)return cards;
 const allowed=this.s.runtime?(a.protagonist?.skillIds||[]):this.protagonistAllowedIds();
 return cards.filter(c=>!IDS.has(c.id)||allowed.includes(c.id)&&((this.s.global.STORY_ROUTE_ID===TRAVELER&&[TE,TQ].includes(c.id)&&this.protagonistUnlocked())||(this.s.global.STORY_ROUTE_ID===ISEKAI&&[IE,IQ].includes(c.id))));
};
P.cardSupport=function(c){return IDS.has(c.id)?(c.ready?'':'주인공 기술 정의가 준비되지 않았습니다.'):old.cardSupport.call(this,c);};
P.protagonistJointMembers=function(){const b=this.s.runtime;if(!b)return[];
 return b.actors.filter(a=>a.side==='ALLY'&&(a.source===PLAYER||this.tables['07_CHAR_DB']?.has(a.source))).slice().sort((a,b)=>(a.source===PLAYER?-1:b.source===PLAYER?1:(a.slot||0)-(b.slot||0)));
};
P.protagonistMemberReason=function(a){return a.hp<=0?'전투불능':this.combatActionLocked?.(a)?'행동 불가':a.charging?'기술 준비 중':this.s.runtime?.actors.some(t=>t.side==='ENEMY'&&t.hp>0)&&!this.s.runtime.actors.some(t=>t.side==='ENEMY'&&t.hp>0&&this.hasAirAccess(a,t,a.range))?'사거리 내 적 없음':'';};
P.protagonistJointBonus=function(a=this.combatActor()||this.player()){const c=this.protagonistConfig().isekai.q;return Math.round(clamp(c.base_bonus_pct+Math.max(0,this.combatStat(a,'atk'))*c.atk_factor+(clamp(a.level,1,20)-1)*c.level_bonus_pct,0,c.cap_pct)*10)/10;};
P.protagonistWindowReason=function(t){if(t.grade==='보스'||this.combatSize?.(t)==='BOSS')return'보스는 최대 HP 감소 면역';if(t.protagonistHpWindow)return'이미 일시 약화가 적용 중';if(t.maxHp<=1)return'최대 HP를 더 낮출 수 없음';return'';};
P.protagonistWindowAmount=function(a,t){const c=this.protagonistConfig().isekai.e,cap=t.grade==='일반'?c.normal_cap:c.elite_cap;return Math.max(0,Math.min(t.maxHp-1,Math.floor(t.maxHp*cap),Math.floor(a.maxHp*c.hp_factor+Math.max(0,this.combatStat(a,'def'))*c.def_factor)));};
P.cardTargets=function(a,c){if(c.id===IQ){const members=this.protagonistJointMembers().filter(x=>!this.protagonistMemberReason(x));return this.s.runtime.actors.filter(t=>t.side==='ENEMY'&&t.hp>0&&members.some(x=>this.hasAirAccess(x,t,x.range)));}
 const ts=old.cardTargets.call(this,a,c);return c.id===IE?ts.filter(t=>!this.protagonistWindowReason(t)&&this.protagonistWindowAmount(a,t)>0):ts;};
P.cardReason=function(a,c){const base=old.cardReason.call(this,a,c);if(base||!IDS.has(c.id))return base;
 if(a.source!==PLAYER||!a.protagonist?.skillIds?.includes(c.id)||!this.protagonistAllowedIds().includes(c.id))return'이 루트에서 해금하지 않은 기술입니다.';
 if(this.combatActionLocked?.(a))return'행동 불가 상태입니다.';
 if(c.id===IQ&&this.protagonistJointMembers().filter(x=>!this.protagonistMemberReason(x)).length<2)return'함께 공격할 행동 가능한 동료가 필요합니다.';
 if(!this.cardTargets(a,c).length)return c.id===IE?'일시 약화 가능한 적이 없습니다. 보스 면역·중첩 불가.':'공격 가능한 적이 없습니다.';
 return'';
};
P.combatCards=function(...args){return old.combatCards.apply(this,args).map(c=>{if(!IDS.has(c.id))return c;return{...c,key:[TE,IE].includes(c.id)?'E':'Q',protagonistKind:[TE,TQ].includes(c.id)?'ANEMO':'ISEKAI',branches:c.id===TE?['TAP','HOLD']:c.branches};});};
P.protagonistOrderedTargets=function(a,target,limit){const all=this.s.runtime.actors.filter(t=>t.side==='ENEMY'&&t.hp>0),first=all.find(t=>t.id===target);if(!first)return[];
 const rest=all.filter(t=>t!==first&&this.combatDistance(first,t)<=2).sort((x,y)=>this.combatDistance(first,x)-this.combatDistance(first,y)||String(x.id).localeCompare(String(y.id)));
 return[first,...rest].slice(0,limit);
};
P.protagonistAbsorb=function(targets){for(const t of targets){const aura=this.auraList(t).map(x=>x.element).find(x=>ABSORB.includes(x));if(aura)return aura;
 // An enemy's attack element is NOT an aura. Only explicit elemental slime bodies provide innate contact.
 const body=String(t.source).match(/^MON_SLIME_(HYDRO|PYRO|CRYO|ELECTRO)(?:_|$)/);if(body)return{HYDRO:'물',PYRO:'불',CRYO:'얼음',ELECTRO:'번개'}[body[1]];}return null;};
P.protagonistLog=function(a,card,text,extra={}){this.s.runtime.log.push({actor:a.name,actorId:a.id,card,cardName:this.row('08_SKILL_CARD_DB',card)[3],round:this.s.runtime.round,actionSequence:this.s.runtime.actionSequence,text,...extra});};
P.executeCard=function(a,c,target,branch){if(!IDS.has(c.id))return old.executeCard.call(this,a,c,target,branch);
 const reason=this.cardReason(a,c);if(reason)fail('PROTAGONIST_SKILL',reason);
 const t=this.cardTargets(a,c).find(x=>x.id===target);if(!t)fail('TARGET','현재 기술에 맞는 적을 선택해 주세요.');
 if(c.id===TE&&branch&&!['TAP','HOLD'].includes(branch))fail('BRANCH','회오리 검의 짧게/길게 방식을 선택해 주세요.');
 const b=this.s.runtime,cfg=this.protagonistConfig();let cooldown=c.cooldown;
 if(c.id===TE||c.id===TQ){
  const hold=c.id===TE&&branch==='HOLD',rule=c.id===TE?cfg.traveler.e:cfg.traveler.q;
  this.initCombatPositions();const targets=this.protagonistOrderedTargets(a,target,c.id===TQ?rule.targets:hold?rule.hold_targets:rule.tap_targets).filter(x=>this.hasAirAccess(a,x,c.range));
  const absorbed=this.protagonistAbsorb(targets),hits=c.id===TQ?Array(rule.hits).fill(rule.coefficient):[...(hold?rule.hold_cut:rule.tap_cut),hold?rule.hold_burst:rule.tap_burst];
  this.protagonistLog(a,c.id,c.name+(c.id===TE?(hold?' · 길게':' · 짧게'):' · 전진하는 돌풍')+(absorbed?' · '+absorbed+' 원소 전환':''),{absorbedElement:absorbed,protagonistSkill:true});
  // Absorption is snapshotted once for the entire cast; aura application is once per target, not per tick.
  for(const enemy of targets){let auraApplied=false,connected=false;
   for(const k of hits){if(enemy.hp<=0)break;const hit=this.damage(a,enemy,k,'바람',{range:c.range,card:c.id,noAura:auraApplied});auraApplied=auraApplied||hit;connected=connected||hit;
    if(hit&&absorbed&&enemy.hp>0)this.damage(a,enemy,rule.absorbed,absorbed,{range:c.range,card:c.id,noAura:true,sourceKind:'ELEMENT_ABSORPTION'});
   }
   if(c.id===TQ&&connected&&enemy.hp>0&&this.combatSize(enemy)==='SMALL')this.applyCombatControl(a,enemy,'LIFT',{bossImmune:true,element:'바람'});
  }
  cooldown=c.id===TE?(hold?rule.hold_cooldown:rule.tap_cooldown):rule.cooldown;
 }else if(c.id===IE){
  const amount=this.protagonistWindowAmount(a,t),originalMaxHp=t.maxHp,hpBefore=t.hp,newMax=t.maxHp-amount,heldHp=Math.max(0,t.hp-newMax);
  t.protagonistHpWindow={version:VERSION,owner:a.id,amount,heldHp,originalMaxHp,expiresTurn:a.turns+1,createdRound:b.round};t.maxHp=newMax;t.hp=Math.min(t.hp,newMax);
  this.addCombatStatus(t,'STATUS_ISEKAI_HP_WINDOW',null,{caster:a.id});
  this.protagonistLog(a,c.id,`${t.name} · 최대 HP −${amount} (${originalMaxHp} → ${newMax}) · 다음 자기 차례까지`,{targetId:t.id,target:t.name,maxHpChange:-amount,temporaryHpHeld:heldHp,hpBefore,hpAfter:t.hp,maxHp:t.maxHp,protagonistSkill:true});
 }else if(c.id===IQ){
  const bonus=this.protagonistJointBonus(a),members=this.protagonistJointMembers(),active=members.filter(x=>!this.protagonistMemberReason(x));
  this.protagonistLog(a,c.id,`합동 공격 · ${active.length}명 · 기본 공격 배율 +${bonus}%`,{jointAttack:true,jointBonusPct:bonus,participants:active.map(x=>x.id)});
  let index=0;for(const member of members){const unavailable=this.protagonistMemberReason(member);if(unavailable){this.protagonistLog(member,c.id,'합동 공격 불참 · '+unavailable,{jointAttack:true,jointSkipped:true,sourceKind:'JOINT_SKIPPED',cardName:'합동 공격 불참'});continue;}
   const legal=b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0&&this.hasAirAccess(member,x,member.range)),picked=legal.find(x=>x.id===target)||legal[0];
   if(!picked){this.protagonistLog(member,c.id,'합동 공격 불참 · 사거리 내 생존 적 없음',{jointAttack:true,jointSkipped:true,sourceKind:'JOINT_SKIPPED',cardName:'합동 공격 불참'});continue;}
   index++;const start=b.log.length;
   const base=member.source===PLAYER?(parse(this.row('08_SKILL_CARD_DB','PLAYER_BASIC_ATTACK')[36]).coefficient||.65):.65;
   // A bonus BASIC attack, not recursive executeCard(): normal turns, AI cards and cooldowns are untouched.
   this.basicHit(member,picked,base*(1+bonus/100));
   for(const event of b.log.slice(start)){event.actorId=event.actorId||member.id;event.card=event.card||c.id;event.cardName=c.name;event.sourceKind=event.sourceKind||'JOINT_ATTACK';event.jointAttack=true;event.jointIndex=index;event.jointBonusPct=bonus;event.round=b.round;event.actionSequence=b.actionSequence;}
  }
 }
 a.cooldowns[c.id]=cooldown;return{card:c.id,target,cooldown};
};
P.restoreProtagonistWindow=function(t,reason){const w=t.protagonistHpWindow;if(!w)return;const hpBefore=t.hp;
 // Restoring escrowed HP is not healing, and must not resurrect a defeated target.
 t.maxHp+=w.amount;if(t.hp>0)t.hp=Math.min(t.maxHp,t.hp+w.heldHp);
 t.statuses=(t.statuses||[]).filter(s=>s.id!=='STATUS_ISEKAI_HP_WINDOW');delete t.protagonistHpWindow;
 this.s.runtime.log.push({target:t.name,targetId:t.id,actorId:w.owner,card:IE,cardName:'일시 약화 종료',sourceKind:'TEMP_MAX_HP',hpBefore,hpAfter:t.hp,maxHp:t.maxHp,round:this.s.runtime.round,actionSequence:this.s.runtime.actionSequence,text:`${t.name} · 일시 약화 종료 (${reason}) · 최대 HP ${t.maxHp} 복원`,maxHpChange:w.amount,temporaryHpRestored:t.hp>0?w.heldHp:0});
};
P.onCombatTurnStart=function(a){for(const t of this.s.runtime.actors){const w=t.protagonistHpWindow;if(w&&w.owner===a.id&&a.turns>=w.expiresTurn)this.restoreProtagonistWindow(t,'시전자 차례');}return old.onCombatTurnStart.call(this,a);};
P.roundEnd=function(...args){const b=this.s.runtime;for(const t of b.actors){const w=t.protagonistHpWindow;if(w&&!(b.actors.find(a=>a.id===w.owner)?.hp>0))this.restoreProtagonistWindow(t,'시전자 전투불능');}return old.roundEnd.apply(this,args);};
P.finishBattle=function(...args){const result=old.finishBattle.apply(this,args);this.migrateProtagonist(this.s);return result;};
P.protagonistCombatView=function(){const g=this.s.global,a=this.combatActor()||this.player(),legacy=!!this.s.runtime&&!a.protagonist;
 const traveler=g.STORY_ROUTE_ID===TRAVELER,unlocked=this.protagonistUnlocked();
 return{route:g.STORY_ROUTE_ID,kind:traveler?'ANEMO':'ISEKAI',title:traveler?'여행자 · 바람 원소':'이세계인 · 비원소 합동 지원',legacy,
  text:legacy?'이전 버전에서 시작한 전투입니다. 새 능력은 전투 종료 후 적용됩니다.':traveler?(unlocked?'바람 공명 완료 · E 회오리 검 / Q 격동의 바람':'바람 기술 잠김 · 도입부의 일곱신상 공명 회상을 확인하세요.'):'개인 전투력은 낮습니다. E는 일시 약화, Q는 동료와의 합동 공격입니다.',
  stats:{hp:a.maxHp,atk:Math.round(this.combatStat(a,'atk')*10)/10,def:this.combatStat(a,'def'),level:a.level},
  bonusPct:traveler?null:this.protagonistJointBonus(a),members:traveler?[]:this.protagonistJointMembers().map(x=>({id:x.id,name:x.name,reason:this.protagonistMemberReason(x)})),
  windowTargets:traveler?[]:(this.s.runtime?.actors||[]).filter(t=>t.side==='ENEMY'&&t.hp>0).map(t=>({id:t.id,name:t.name,amount:this.protagonistWindowAmount(a,t),reason:this.protagonistWindowReason(t)}))};
};
})(typeof window!=='undefined'?window:globalThis);
