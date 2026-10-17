/* v0.14.8 combat rules. Load after runtime_protagonist.js and the modules that wrap damage and its multipliers.
 * 1. Elemental application never depends on luck: a party member's elemental skill and burst (cards ending in _E or
 *    _Q, the protagonist's included) always hit, so the element they carry always lands, as in the original. Normal
 *    attacks and enemy attacks keep the accuracy roll (hit against evasion).
 * 2. 이세계인 (route ROUTE_ISEKAI) is a class of its own next to the Traveler instead of a weaker Traveler. Personal
 *    power stays a little lower, offset by the right to wield every weapon type, and the kit sets up the party:
 *    E 「약점 간파」 strikes and leaves the target taking more damage from the party for two rounds (bosses included,
 *    at a lower rate); Q 「함께하는 일격」 has every able companion strike at once with their own element.
 *    Saves made before this version receive the new base stats once (earned increases are kept).
 * Coefficients, rounds and percentages are CRPG house rules, not official game values. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.protagonistConfig||P.combatV0148)return;
const PLAYER='PLAYER_CUSTOM',ISEKAI='ROUTE_ISEKAI',IE='PLAYER_ISEKAI_E',IQ='PLAYER_ISEKAI_Q',EXPOSED='STATUS_ISEKAI_EXPOSED';
const ELEMENTS=['불','물','얼음','번개','바람','바위','풀'];
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const ISEKAI_V2={
 // Defence stays where it was: a light, quick tactician (Abyss foes from floor 6 aim at the lowest defence).
 profile:{BASE_HP:560,BASE_ATK:62,BASE_DEF:30,BASE_SPD:63},
 before:{BASE_HP:480,BASE_ATK:40,BASE_DEF:30,BASE_SPD:55},
 e:{coefficient:1.5,rounds:2,vulnerable_pct:30,boss_pct:18,cooldown:2},
 q:{base_bonus_pct:20,atk_factor:.1,level_bonus_pct:1.5,cap_pct:60,cooldown:3}
};
api.isekaiRework=copy(ISEKAI_V2);
const old=Object.fromEntries(['damage','applyDamage','protagonistConfig','migrateProtagonist','cardTargets','executeCard','combatDamageMultiplier','protagonistCombatView','installMarketContent'].map(k=>[k,P[k]]));
const live=s=>!!s&&(s.rounds===null||s.rounds===undefined||s.rounds>0);
// A companion's element is the vision tag on the fighter, e.g. "[불]".
const visionOf=a=>ELEMENTS.includes(a?.element)?a.element:(a?.tags||[]).map(t=>String(t).replace(/[[\]]/g,'')).find(x=>ELEMENTS.includes(x))||null;
// Switches for balance checks only; the game always runs with both on.
const OPT=api.combatV0148Options={sureHitSkills:true,isekaiStats:true};
// ---- 1. skills and bursts always land ----
P.damage=function(a,t,k,element,o={}){
 if(OPT.sureHitSkills&&a?.side==='ALLY'&&!o.sureHit&&typeof o.card==='string'&&/_(E|Q)$/.test(o.card))o={...o,sureHit:true};
 return old.damage.call(this,a,t,k,element,o);
};
// ---- 2. 이세계인 ----
P.protagonistConfig=function(){const c=old.protagonistConfig.call(this);
 if(OPT.isekaiStats)c.profiles={...c.profiles,[ISEKAI]:{...ISEKAI_V2.profile}};c.isekai={...c.isekai,e:{...c.isekai.e,...ISEKAI_V2.e},q:{...c.isekai.q,...ISEKAI_V2.q}};return c;};
P.migrateProtagonist=function(s,isNew=false){
 const out=old.migrateProtagonist.call(this,s,isNew),g=s?.global;
 if(!OPT.isekaiStats||!g||s.runtime||this._creatingProtagonist||g.STORY_ROUTE_ID!==ISEKAI||g.PROTAGONIST_ISEKAI_V2===1)return out;
 if(!isNew){
  const f=Object.create(this);f.s=s;const hp=Number(g.PLAYER_HP_CURRENT),mx=Number(g.PLAYER_HP_MAX);
  for(const [key,value]of Object.entries(ISEKAI_V2.profile))g['PLAYER_'+key]=Math.max(1,Number(g['PLAYER_'+key]||0)+value-ISEKAI_V2.before[key]);
  f.recalculate();g.PLAYER_HP_CURRENT=hp<=0?0:Math.max(1,Math.min(g.PLAYER_HP_MAX,Math.round(g.PLAYER_HP_MAX*hp/Math.max(1,mx))));
 }
 g.PROTAGONIST_ISEKAI_V2=1;return out;
};
P.isekaiExposedPct=function(t){const cfg=this.protagonistConfig().isekai.e;return t.grade==='보스'||this.combatSize?.(t)==='BOSS'?cfg.boss_pct:cfg.vulnerable_pct;};
P.cardTargets=function(a,c){
 if(c?.id!==IE)return old.cardTargets.call(this,a,c);
 return this.s.runtime.actors.filter(t=>t.side==='ENEMY'&&t.hp>0&&(!this.hasAirAccess||this.hasAirAccess(a,t,c.range)));
};
P.combatDamageMultiplier=function(a,t,e,o={}){
 const mark=t?.statuses?.find(x=>x.id===EXPOSED),owner=mark&&this.s.runtime?.actors.find(x=>x.id===(mark.caster||PLAYER)&&x.source===PLAYER);
 // Keeping the tactician alive is part of the support: expired/orphaned marks cannot power C1 either.
 if(mark&&!(owner?.hp>0))t.statuses=t.statuses.filter(x=>x!==mark);
 let n=old.combatDamageMultiplier.call(this,a,t,e,o);
 const s=t?.statuses?.find(x=>x.id===EXPOSED);if(a?.side==='ALLY'&&live(s))n*=1+(Number(s.pct)||0)/100;return n;
};
P.applyDamage=function(a,t,amount,...args){
 const out=old.applyDamage.call(this,a,t,amount,...args);
 if(t?.source===PLAYER&&t.hp<=0)for(const actor of this.s.runtime?.actors||[])actor.statuses=(actor.statuses||[]).filter(s=>s.id!==EXPOSED||(s.caster||PLAYER)!==t.id);
 return out;
};
P.executeCard=function(a,c,target,branch){
 if(c?.id!==IE&&c?.id!==IQ)return old.executeCard.call(this,a,c,target,branch);
 const reason=this.cardReason(a,c);if(reason)fail('PROTAGONIST_SKILL',reason);
 const t=this.cardTargets(a,c).find(x=>x.id===target);if(!t)fail('TARGET','현재 기술에 맞는 적을 선택해 주세요.');
 const b=this.s.runtime,cfg=this.protagonistConfig().isekai;
 if(c.id===IE){
  const pct=this.isekaiExposedPct(t);
  this.protagonistLog(a,c.id,t.name+' · 약점 간파 · '+cfg.e.rounds+'라운드 동안 받는 피해 +'+pct+'%',{targetId:t.id,target:t.name,protagonistSkill:true,exposedPct:pct});
  this.damage(a,t,cfg.e.coefficient,'PHYSICAL',{range:c.range,card:c.id});
  if(t.hp>0&&a.hp>0)this.addCombatStatus(t,EXPOSED,cfg.e.rounds,{caster:a.id,pct});
  a.cooldowns[c.id]=cfg.e.cooldown;return {card:c.id,target,cooldown:cfg.e.cooldown};
 }
 // Q: every able member strikes once, a companion with their own element, the protagonist without one.
 const bonus=this.protagonistJointBonus(a),members=this.protagonistJointMembers(),active=members.filter(x=>!this.protagonistMemberReason(x));
 this.protagonistLog(a,c.id,'합동 공격 · '+active.length+'명 · 추가 배율 +'+bonus+'% · 동료는 각자의 원소로',{jointAttack:true,jointBonusPct:bonus,participants:active.map(x=>x.id)});
 let index=0;
 for(const member of members){
  const unavailable=this.protagonistMemberReason(member);
  if(unavailable){this.protagonistLog(member,c.id,'합동 공격 불참 · '+unavailable,{jointAttack:true,jointSkipped:true,sourceKind:'JOINT_SKIPPED',cardName:'합동 공격 불참'});continue;}
  const legal=b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0&&this.hasAirAccess(member,x,member.range)),picked=legal.find(x=>x.id===target)||legal[0];
  if(!picked){this.protagonistLog(member,c.id,'합동 공격 불참 · 사거리 내 생존 적 없음',{jointAttack:true,jointSkipped:true,sourceKind:'JOINT_SKIPPED',cardName:'합동 공격 불참'});continue;}
  index++;const start=b.log.length;
  let base=member.source===PLAYER ? .65 : .85;if(member.source===PLAYER){try{base=JSON.parse(this.row('08_SKILL_CARD_DB','PLAYER_BASIC_ATTACK')[36]).coefficient||.65;}catch{}}
  const element=member.source===PLAYER?'PHYSICAL':visionOf(member)||'PHYSICAL';
  this.damage(member,picked,base*(1+bonus/100),element,{range:member.range,card:c.id});
  for(const event of b.log.slice(start)){event.actorId=event.actorId||member.id;event.card=event.card||c.id;event.cardName=c.name;event.sourceKind=event.sourceKind||'JOINT_ATTACK';event.jointAttack=true;event.jointIndex=index;event.jointBonusPct=bonus;event.round=b.round;event.actionSequence=b.actionSequence;}
 }
 a.cooldowns[c.id]=cfg.q.cooldown;return {card:c.id,target,cooldown:cfg.q.cooldown};
};
P.protagonistCombatView=function(){
 const v=old.protagonistCombatView.call(this);if(v.kind!=='ISEKAI')return v;
 const a=this.combatActor()||this.player();
 v.title='이세계인 · 비원소 전술가';
 if(!v.legacy)v.text='원소는 없지만 모든 무기를 다룹니다. E는 적의 약점을 드러내 파티가 주는 피해를 늘리고, Q는 동료들이 각자의 원소로 함께 공격합니다.';
 v.windowTargets=[];v.exposeTargets=(this.s.runtime?.actors||[]).filter(t=>t.side==='ENEMY'&&t.hp>0).map(t=>({id:t.id,name:t.name,pct:this.isekaiExposedPct(t)}));
 v.exposeRounds=this.protagonistConfig().isekai.e.rounds;v.exposeCoefficient=this.protagonistConfig().isekai.e.coefficient;
 return v;
};
// Card and status rows describe the new kit (names, numbers and cooldowns shown on screen).
P.installMarketContent=function(...args){
 const out=old.installMarketContent?old.installMarketContent.apply(this,args):undefined;
 if(this._combatV0148Rows)return out;this._combatV0148Rows=true;
 this.db={...this.db};
 const setTable=(key,rows)=>{this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));};
 const e=ISEKAI_V2.e,q=ISEKAI_V2.q;
 const cards=this.db['08_SKILL_CARD_DB'].map(r=>{
  if(r[0]===IE){const x=r.slice(),text='적 1명에게 공격력×'+e.coefficient+' 물리 피해를 주고, '+e.rounds+'라운드 동안 그 적이 파티에게 받는 피해를 '+e.vulnerable_pct+'% 늘린다(보스 '+e.boss_pct+'%). 보스에게도 통한다.';x[3]='약점 간파';x[4]='고유 보조';x[7]=text;x[9]=e.cooldown;x[16]=text;x[17]='CRPG_HOUSE_RULE_20261001; 0.14.8 이세계인 직업 재설계';return x;}
  if(r[0]===IQ){const x=r.slice(),text='본인과 행동 가능한 전장 동료가 1회씩 함께 공격한다. 동료는 각자의 원소를 싣는다. 추가 배율은 '+q.base_bonus_pct+' + 자신의 공격력×'+q.atk_factor+' + (레벨−1)×'+q.level_bonus_pct+'%, 최대 '+q.cap_pct+'%. 각 동료의 통상 차례·기술 쿨다운은 소비하지 않는다.';x[7]=text;x[9]=q.cooldown;x[16]=text;x[17]='CRPG_HOUSE_RULE_20261001; 0.14.8 이세계인 직업 재설계';return x;}
  return r;});
 setTable('08_SKILL_CARD_DB',cards);
 const statuses=this.db['13_STATUS_EFFECT_DB'].map(r=>r.slice());
 if(!statuses.some(r=>r[0]===EXPOSED))statuses.push([EXPOSED,'약점 간파','디버프','파티에게 받는 피해가 늘어난다(일반 '+e.vulnerable_pct+'%, 보스 '+e.boss_pct+'%).',e.rounds,'N',1,'지속 종료','[비원소][이세계인]','0.14.8 이세계인 E','CUSTOM','DAMAGE_TAKEN','PCT',e.vulnerable_pct,'ROUND_END','REFRESH','COMBAT','runtime_combat_v0148.js']);
 setTable('13_STATUS_EFFECT_DB',statuses);
 return out;
};
P.combatV0148=true;api.combatV0148=true;
})(typeof window!=='undefined'?window:globalThis);
