/* Party formations (0.14.4): one party-wide 진형 with a trade-off, a small effect per companion role,
   and a synergy when the roles suit the formation. Enemies and bosses grow stronger to match (not in the Abyss;
   field bosses get the same offset in runtime_field_boss_limits.js). Names are plain in-world words. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,fail=(c,m)=>{throw new api.RuleError(c,m);},cp=x=>JSON.parse(JSON.stringify(x));
const old=Object.fromEntries(['newGame','validateSave','apply','actionReason','startBattle','applyDamage','heal','shield'].map(k=>[k,P[k]]));
const FORMATIONS={
 LINE_AHEAD:{name:'돌격 진형',motto:'화력 집중',mods:{atk:{pct:12},eva:{flat:-6}},text:'공격력 +12% · 회피 -6',synergy:{role:'공격우선',count:2,text:'공격 담당 2명 이상 · 치명타 확률 +6%p',mods:{crit:{flat:6}}}},
 DOUBLE_LINE:{name:'연계 진형',motto:'정밀 연계',mods:{atk:{pct:6},hit:{flat:10}},text:'공격력 +6% · 명중 +10',synergy:{role:'연계우선',count:1,text:'연계 담당 1명 이상 · 원소 반응 피해 +15%',reactionOut:1.15}},
 DIAMOND:{name:'수호 진형',motto:'굳건한 방어',mods:{atk:{pct:-10}},taken:.88,text:'받는 피해 -12% · 공격력 -10%',synergy:{role:'지원우선',count:1,text:'지원 담당 1명 이상 · 치유·보호막 효과 +20%',supportOut:1.2}},
 ECHELON:{name:'기동 진형',motto:'날렵한 회피',mods:{eva:{flat:10},spd:{flat:6},atk:{pct:-5}},text:'회피 +10 · 속도 +6 · 공격력 -5%',synergy:{role:'생존우선',count:2,text:'생존 담당 2명 이상 · 회피 +6',mods:{eva:{flat:6}}}},
 LINE_ABREAST:{name:'균형 진형',motto:'고른 대응',mods:{resist:{flat:20},hit:{flat:-5},atk:{pct:-5}},taken:.92,text:'상태 저항 +20 · 받는 피해 -8% · 명중 -5 · 공격력 -5%',synergy:{role:'균형',count:3,text:'균형 담당 3명 · 공격력·방어력 +6%',mods:{atk:{pct:6},def:{pct:6}}}}
};
const ROLES={
 균형:{label:'균형',text:'능력치 변화 없음 · 상황에 맞춰 행동'},
 공격우선:{label:'공격 담당',text:'공격력 +6% · 받는 피해 +6% · 공격 카드를 먼저 씀',mods:{atk:{pct:6}},taken:1.06},
 생존우선:{label:'생존 담당',text:'회피 +8 · 공격력 -6% · 회복·보호막을 먼저 씀',mods:{eva:{flat:8},atk:{pct:-6}}},
 지원우선:{label:'지원 담당',text:'치유·보호막 효과 +12% · 지원 카드를 먼저 씀',supportOut:1.12},
 연계우선:{label:'연계 담당',text:'원소 반응 피해 +10% · 반응을 노림',reactionOut:1.1}
};
const DEFAULT='DOUBLE_LINE',ENEMY_HP=1.1,ENEMY_ATK=1.08;
api.formationConfig={formations:cp(FORMATIONS),roles:cp(ROLES),defaultFormation:DEFAULT,enemyHp:ENEMY_HP,enemyAtk:ENEMY_ATK};
function merge(...parts){const out={};for(const m of parts.filter(Boolean))for(const [k,v]of Object.entries(m)){const o=out[k]||(out[k]={pct:0,flat:0});o.pct+=v.pct||0;o.flat+=v.flat||0;}return out;}
const roleOf=(r,id)=>id==='PLAYER_CUSTOM'?null:(r.s.party.find(p=>p.active&&p.source===id)?.tactic||'균형');
P.partyFormation=function(){return FORMATIONS[this.s?.partyFormation]?this.s.partyFormation:DEFAULT;};
P.formationRoles=function(){return this.s.party.filter(p=>p.active&&p.type==='CHAR').map(p=>p.tactic||'균형');};
P.formationView=function(){
 const id=this.partyFormation(),roles=this.formationRoles();
 return {selected:id,roles:cp(ROLES),formations:Object.entries(FORMATIONS).map(([key,f])=>({id:key,...cp(f),selected:key===id,synergyActive:roles.filter(r=>r===f.synergy.role).length>=f.synergy.count}))};
};
P.startBattle=function(...args){
 const before=this.s.runtime,out=old.startBattle.apply(this,args),b=this.s.runtime;
 if(!b||b===before||b.formationV1)return out;
 const id=this.partyFormation(),f=FORMATIONS[id],roles=this.formationRoles(),synergy=roles.filter(r=>r===f.synergy.role).length>=f.synergy.count;
 b.formationV1={id,synergy};
 for(const a of b.actors.filter(x=>x.side==='ALLY')){
  const beforeSpeed=this.combatStat(a,'spd');
  this.addCombatStatus(a,'FORMATION',null,{mods:merge(f.mods,synergy&&f.synergy.mods),taken:f.taken||1,reactionOut:synergy&&f.synergy.reactionOut||1,supportOut:synergy&&f.synergy.supportOut||1,formation:id});
  const role=roleOf(this,a.source),R=role&&ROLES[role];
  if(R&&(R.mods||R.taken||R.reactionOut||R.supportOut))this.addCombatStatus(a,'ROLE',null,{mods:merge(R.mods),taken:R.taken||1,reactionOut:R.reactionOut||1,supportOut:R.supportOut||1,role});
  // Formation statuses are installed after initiative was rolled. Preserve that
  // roll and any food/gear modifiers already included in it; add only this delta.
  const turn=b.opening?.state==='PENDING'&&b.order.find(x=>x.id===a.id);
  if(turn)turn.score+=this.combatStat(a,'spd')-beforeSpeed;
 }
 // Enemies and bosses keep pace with the formation bonus. The Abyss and the first tutorial fights keep their numbers
 // (field bosses and their forms get the same offset in runtime_boss_tiers.js).
 if(!b.abyss)for(const e of b.actors.filter(x=>x.side==='ENEMY'&&!x.fb&&!x.fbSummon&&(x.level||1)>=3)){e.maxHp=Math.round(e.maxHp*ENEMY_HP);e.hp=Math.round(e.hp*ENEMY_HP);e.atk=Math.round(e.atk*ENEMY_ATK);for(const s of e.shields||[])if(Number.isFinite(s.value))s.value=Math.round(s.value*ENEMY_HP);}
 if(b.opening?.state==='PENDING'){
  b.order.sort((a,c)=>Number(c.first)-Number(a.first)||c.score-a.score||a.id.localeCompare(c.id));
  const i=b.order.findIndex(x=>x.id==='PLAYER_CUSTOM');if(i>0)b.order=[b.order[i],...b.order.slice(0,i),...b.order.slice(i+1)];
  b.opening.initialOrder=cp(b.order);
  return {...out,order:this.combatOrderView()};
 }
 return out;
};
const product=(actor,key)=>(actor?.statuses||[]).reduce((m,s)=>m*(Number.isFinite(s[key])?s[key]:1),1);
P.applyDamage=function(a,t,n,d={}){
 if(this.s.runtime&&t?.side==='ALLY')n*=product(t,'taken');
 if(this.s.runtime&&a?.side==='ALLY'&&t?.side!=='ALLY'&&/^REACTION/.test(d.sourceKind||''))n*=product(a,'reactionOut');
 return old.applyDamage.call(this,a,t,n,d);
};
P.heal=function(a,amount,source='',sourceActorId=''){
 const b=this.s.runtime;if(b&&a?.side==='ALLY'&&(source||sourceActorId)){const healer=b.actors.find(x=>x.side==='ALLY'&&(sourceActorId?x.id===sourceActorId:x.name===source));if(healer)amount*=product(healer,'supportOut');}
 return old.heal.call(this,a,amount,source,sourceActorId);
};
P.shield=function(a,value,source,rounds,extra={}){
 const b=this.s.runtime;if(b&&a?.side==='ALLY'&&typeof source==='string'){const caster=b.actors.find(x=>x.side==='ALLY'&&source.startsWith(x.source+'_'));if(caster)value*=product(caster,'supportOut');}
 return old.shield.call(this,a,value,source,rounds,extra);
};
P.actionReason=function(type,a={}){
 if(type==='FORMATION_SET'&&a.formation!==undefined&&a.order===undefined){if(this.s.runtime)return '전투 중에는 진형을 바꿀 수 없습니다.';return FORMATIONS[a.formation]?'':'진형을 선택해 주세요.';}
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(a.type==='FORMATION_SET'&&a.formation!==undefined&&a.order===undefined){if(!FORMATIONS[a.formation])fail('FORMATION','진형을 선택해 주세요.');this.s.partyFormation=a.formation;return {formation:a.formation,name:FORMATIONS[a.formation].name};}
 return old.apply.call(this,a);
};
P.newGame=function(...args){const out=old.newGame.apply(this,args);if(this.s&&!this.s.partyFormation)this.s.partyFormation=DEFAULT;return out;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s;
 if(out.partyFormation!==undefined&&!FORMATIONS[out.partyFormation])fail('FORMATION_SAVE','진형 기록이 올바르지 않습니다.');
 const f=out.runtime?.formationV1;if(f&&(!FORMATIONS[f.id]||typeof f.synergy!=='boolean'))fail('FORMATION_SAVE','전투 진형 기록이 올바르지 않습니다.');
 return out;
};
})(globalThis);
