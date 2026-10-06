/* A situation-led lesson. Only real successful actions advance it; opening/closing the guide grants nothing. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x)),old=Object.fromEntries(['newGame','validateSave','apply','finishBattle','actionReason','startBattle','confirmBattlePreparation','wishGrant'].map(k=>[k,P[k]]));
const AMBER='MOND_AMBER',INTRO_GROUP='EG_MOND_SLIME_SMALL',INTRO_NODE='PRO_TRVM01_평원_028';
const fail=m=>{throw new api.RuleError('TUTORIAL',m);};
P.tutorialState=function(){return this.s.tutorialV2??={version:2,style:'SPOTLIGHT',enabled:false,done:{}};};
P.tutorialDirective=function(){
 const t=this.tutorialState(),d=t.done,g=this.s.global,b=this.s.runtime,phase=this.playPhase();const learned=this.s.learningGuide?.done||{};if(!t.enabled)return null;
 if(b?.tutorialDrill)return {id:b.tutorialDrill.step,title:{guard:'먼저 한 번 방어하세요',attack:'적을 골라 일반 공격을 실행하세요',skill:'원소전투 스킬을 실행하세요',win:'남은 적을 쓰러뜨리세요'}[b.tutorialDrill.step],text:b.opening?.state==='PENDING'?'훈련 전투를 시작하세요. 다음 차례마다 필요한 조작을 안내합니다.':'행동을 고르고 적 카드를 눌러 대상을 정한 뒤 실행하세요.',battle:true};
 if(b){
  if(b.opening?.state==='PENDING'&&!d.combatAttack)return {id:'combatStart',title:'행동 순서를 확인하세요',text:'위 줄은 이번 라운드의 행동 순서입니다. 전투 시작을 누르세요.',battle:true};
  const available=this.combatCards?.().filter(c=>!c.reason)||[];
  if(!d.combatAttack&&available.some(c=>c.id==='PLAYER_BASIC_ATTACK'))return {id:'combatAttack',title:'일반 공격을 해 보세요',text:'일반 공격 → 적 선택 → 공격 실행 순서입니다.',battle:true,card:'PLAYER_BASIC_ATTACK'};
  if(!d.combatGuard&&available.some(c=>c.id==='PLAYER_BASIC_GUARD'))return {id:'combatGuard',title:'이번에는 방어하세요',text:'방어는 이번 행동 동안 받는 피해를 줄입니다.',battle:true,card:'PLAYER_BASIC_GUARD'};
  const skill=available.find(c=>/_E(?:_CHARGE)?$/.test(c.id));
  if(!d.combatSkill&&skill)return {id:'combatSkill',title:'원소전투 스킬을 사용하세요',text:'스킬을 고른 뒤 대상을 정하고 실행하세요. 사용 후에는 재사용 대기 시간이 생깁니다.',battle:true,card:skill.id};
  return null;
 }

 // Preparation is part of the first authored fight, not a later training room.
 if(this.s.battlePreparation){
  const intro=t.intro?.group===this.s.battlePreparation.group,amber=this.s.party.some(p=>p.active&&p.source===AMBER);
  if(intro&&!amber)return {id:'party',title:'엠버를 함께 싸울 자리에 넣으세요',text:'편성의 동료 자리를 누르고 엠버를 선택하세요.',screen:'PARTY',actor:AMBER};
  const owner=intro?AMBER:'PLAYER_CUSTOM',armed=this.s.inventory.some(i=>i.equipped&&i.owner===owner&&i.category==='WEAPON');
  if(!armed&&(intro||!d.combatAttack))return {id:'equip',title:(intro?'엠버':'주인공')+'에게 무기를 장착하세요',text:'캐릭터에서 무기 칸을 누르고 장착할 무기를 선택하세요.',screen:'STATUS',owner};
  if(intro||!d.combatAttack)return {id:'prepare',title:'편성과 장비 준비를 마쳤습니다',text:'전투 준비로 돌아가 이 편성으로 전투 순서를 확인하세요.',screen:'COMBAT_PREP'};
  return null;
 }
 if(this.s.lifeJob&&['GATHER','MINE','HUNT'].includes(this.s.lifeJob.kind)&&!d['life'+this.s.lifeJob.kind])return {id:'life'+this.s.lifeJob.kind,title:'직접 조작해 보세요',text:'표시된 조작을 세 번 진행합니다.',kind:this.s.lifeJob.kind};
 if(phase!=='FREE')return null;
 const journey=this.s.storyJourney;
 if(!d.move&&journey){const there=this.row('32_MAP_DB',journey.target)[2];if(g.CURRENT_MAP_ID===journey.target)return {id:'arrival',title:there+'에 도착했습니다',text:'이곳에서 기다리는 이야기를 이어가세요.',command:'resume'};if(journey.scripted||journey.special)return {id:'storyTravel',title:there+'(으)로 이동하세요',text:'안내된 이동 수단을 이용해 출발하세요.',command:journey.scripted?'scripted':'ride'};return {id:'move',title:'목적지까지 이동하세요',text:'지도에서 목적지를 고른 뒤 이동 버튼을 누르세요.',screen:'LOCATION',destination:journey.target};}
 if(d.move&&!d.arrival&&journey&&g.CURRENT_MAP_ID===journey.target)return {id:'arrival',title:'목적지에 도착했습니다',text:'이야기 계속을 눌러 도착한 장소의 대화를 이어가세요.',command:'resume'};
 // Later systems explain themselves when first used. No forced domain, wish, farming or ascension chain.
 return null;
};

function prepareIntro(r,t){
 const prep=r.s.battlePreparation;
 if(!prep||!t.enabled||t.done.amberIntro||t.intro||r.s.global.STORY_ROUTE_ID!=='ROUTE_TRAVELER'||prep.group!==INTRO_GROUP||prep.node!==INTRO_NODE||prep.origin!=='STORY:'+INTRO_NODE)return;
 const id=AMBER;t.intro={id,group:INTRO_GROUP,node:INTRO_NODE};
 if(!r.premiumOwns(id)&&!t.loan){const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');t.loan={...t.intro,previous:own[id]||null};own[id]={state:'JOINED',tutorialLoan:true};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.s.chars[id].hp=r.character(id).maxHp;
  if(!r.s.inventory.some(i=>i.equip&&r.row('16_EQUIP_DB',i.equip)[2]==='활'))t.loan.weaponSlot=r.giveEquipment('EQ_BOW_SLINGSHOT');
 }
}
P.startBattle=function(...args){const out=old.startBattle.apply(this,args);if(out?.pendingPreparation)prepareIntro(this,this.tutorialState());return out;};
P.confirmBattlePreparation=function(group,companions){const t=this.tutorialState();companions??=this.s.battlePreparation?.selectedCompanions?.slice()||[];if(t.intro?.group===group){if(!this.s.party.some(p=>p.active&&p.source===AMBER)||!companions.includes(AMBER))fail('먼저 엠버를 편성에 넣어 주세요.');if(!this.s.inventory.some(i=>i.equipped&&i.owner===AMBER&&i.category==='WEAPON'))fail('엠버에게 무기를 장착해 주세요.');}return old.confirmBattlePreparation.call(this,group,companions);};
P.wishGrant=function(result){const t=this.tutorialState();if(result.kind==='char'&&t.loan?.id===result.id){const own=JSON.parse(this.s.global.COMPANION_ELIGIBILITY_JSON||'{}');own[result.id]=t.loan.previous||{state:'ELIGIBLE'};this.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);delete t.loan;}return old.wishGrant.call(this,result);};
function endLoan(r){const t=r.tutorialState(),loan=t.loan;if(!loan)return;const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');if(own[loan.id]?.tutorialLoan){if(loan.previous)own[loan.id]=loan.previous;else delete own[loan.id];r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.s.party=r.s.party.map(p=>p.source===loan.id?{slot:p.slot,active:false}:p);for(const i of r.s.inventory)if(i.owner===loan.id){i.owner='공용';i.equipped=false;}if(loan.weaponSlot)r.s.inventory=r.s.inventory.filter(i=>i.slot!==loan.weaponSlot);}delete t.loan;r.recalculate();}

P.startTutorialDrill=function(){const t=this.tutorialState();if(t.done.drill)fail('첫 훈련을 이미 마쳤습니다. 비경에 도전해 주세요.');if(this.playPhase()!=='FREE')fail('현재 장면을 먼저 마쳐 주세요.');const out=this.startBattle('EG_MOND_HILI_PATROL','TUTORIAL:DRILL'),b=this.s.runtime;if(!b)fail('전투를 시작하지 못했습니다.');b.actors=b.actors.filter(a=>a.side==='ENEMY'||a.source==='PLAYER_CUSTOM');b.enemyReserve=[];const enemies=b.actors.filter(a=>a.side==='ENEMY');for(const a of enemies){a.hp=a.maxHp=280;a.atk=10;a.def=8;a.level=1;a.spd=20;a.shields=[];a.statuses=[];}b.actors=b.actors.filter(a=>a.side==='ALLY'||enemies.indexOf(a)<2);b.order=b.order.filter(o=>b.actors.some(a=>a.id===o.id));b.fields=[];b.tutorialDrill={step:'guard'};delete b.enemyTiers;delete b.mondBalance;b.opening.initialOrder=copy(b.order);return out;};
P.actionReason=function(type,a={}){const why=old.actionReason.call(this,type,a);if(why&&type!=='TUTORIAL_GUIDE')return why;if(type==='TUTORIAL_GUIDE')return typeof a.enabled==='boolean'?'':'안내 표시 여부를 선택해 주세요.';if(type==='TUTORIAL_DRILL')return this.playPhase()!=='FREE'||this.tutorialState().done.drill?'현재 장면을 마치거나 비경에 도전해 주세요.':this.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'&&!this.protagonistUnlocked()?'이야기에서 바람 원소를 먼저 배워 주세요.':'';if(type==='COMBAT'&&this.s.runtime?.tutorialDrill){const step=this.s.runtime.tutorialDrill.step;if(step==='guard'&&a.card!=='PLAYER_BASIC_GUARD')return '첫 차례에는 방어를 골라 실행하세요.';if(step==='attack'&&a.card!=='PLAYER_BASIC_ATTACK')return '이번에는 일반 공격과 대상을 골라 실행하세요.';if(step==='skill'&&!/_E(?:_CHARGE)?$/.test(a.card)&&this.combatCards().some(c=>/_E(?:_CHARGE)?$/.test(c.id)&&!c.reason))return '이번에는 원소전투 스킬을 골라 실행하세요.';}return '';};
P.apply=function(a){if(a.type==='TUTORIAL_GUIDE'){if(!a.enabled&&!this.tutorialState().done.finished&&this.tutorialDirective()?.id!=='complete')fail('안내된 조작을 마치면 다음 단계로 넘어갑니다.');this.tutorialState().enabled=a.enabled;if(!a.enabled)this.tutorialState().done.finished=true;return {enabled:a.enabled};}if(a.type==='TUTORIAL_DRILL')return this.startTutorialDrill();const b=this.s.runtime,drill=b?.tutorialDrill,prev=drill?.step,fromMap=this.s.global.CURRENT_MAP_ID,learningMove=a.type==='MOVE'&&this.tutorialState().enabled&&this.playPhase()==='FREE';if(a.type==='COMBAT'&&drill){const why=this.actionReason(a.type,a);if(why)fail(why);drill.step={guard:'attack',attack:'skill',skill:'win',win:'win'}[prev];}let out;try{out=old.apply.call(this,a);}catch(e){if(drill)drill.step=prev;throw e;}const d=this.tutorialState().done;if(a.type==='COMBAT'){if(a.card==='PLAYER_BASIC_ATTACK')d.combatAttack=true;if(a.card==='PLAYER_BASIC_GUARD')d.combatGuard=true;if(/_E(?:_CHARGE)?$/.test(a.card))d.combatSkill=true;}if(learningMove&&this.s.global.CURRENT_MAP_ID!==fromMap)d.move=true;if(a.type==='JOURNEY_RESUME')d.arrival=true;if(a.type==='PARTY')d.party=true;if(a.type==='EQUIP')d.equip=true;if(a.type==='PLACE_ENTER')d.facility=true;if(a.type==='WISH')d.wish=true;if(a.type==='USE_ITEM'&&api.localRevision.books[a.item])d.book=true;if(a.type==='TALENT_UPGRADE')d.talent=true;if(a.type==='LIFE_FINISH'&&out?.caught)d['life'+out.kind]=true;if(a.type==='LIFE_FINISH'&&out?.caught){if(out.kind==='GATHER')d.gather=true;if(out.kind==='MINE')d.mine=true;}return out;};
P.finishBattle=function(win){const b=this.s.runtime,out=old.finishBattle.call(this,win),t=this.tutorialState();if(win&&b&&b.group===t.intro?.group&&b.origin==='STORY:'+INTRO_NODE){endLoan(this);delete t.intro;t.done.amberIntro=true;}if(win&&b){const d=t.done;if(b.growthDomain)d.domain=true;if(b.tutorialDrill&&!d.drill){d.drill=true;const reward={MAT_CHAR_EXP_HERO:3,ING_CALLA_LILY:2,MAT_DAMAGED_MASK:2};for(const [id,n]of Object.entries(reward)){this.giveItem(id,n);out.loot[id]=(out.loot[id]||0)+n;}out.tutorialReward=true;this.s.combatReceipts[b.id]=copy(out);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(out);}}return out;};
P.newGame=function(o){old.newGame.call(this,o);this.s.tutorialV2={version:2,style:'SPOTLIGHT',enabled:true,done:{}};return copy(this.s);};
P.validateSave=function(s){old.validateSave.call(this,s);const t=s.tutorialV2;if(t&&(t.version!==2||typeof t.enabled!=='boolean'||!t.done||Array.isArray(t.done)||Object.values(t.done).some(x=>x!==true)))fail('실습 안내 기록을 확인해 주세요.');
 // 0.15.22's "later" switch is not an opt-out from the newly mandatory lesson.
 // Completed real drill actions remain learned; migration gives no items or XP.
 if(t&&t.style===undefined){t.style='SPOTLIGHT';t.enabled=true;if(t.done.drill)Object.assign(t.done,{combatAttack:true,combatGuard:true,combatSkill:true});}
 if(t&&t.style!=='SPOTLIGHT')fail('조작 안내 형식을 확인해 주세요.');
 const own=JSON.parse(s.global.COMPANION_ELIGIBILITY_JSON||'{}');
 for(const key of ['intro','loan'])if(t?.[key]){const v=t[key];if(v.id!==AMBER||v.group!==INTRO_GROUP||v.node!==INTRO_NODE||s.global.STORY_ROUTE_ID!=='ROUTE_TRAVELER'||t.done.amberIntro)fail('첫 전투 동행 기록을 확인해 주세요.');}
 if(t?.intro&&![[s.battlePreparation?.group,s.battlePreparation?.node],[s.runtime?.group,s.runtime?.origin?.replace(/^STORY:/,'')],[s.storyRecovery?.group,s.storyRecovery?.node]].some(([g,n])=>g===INTRO_GROUP&&n===INTRO_NODE))fail('첫 전투의 준비 또는 재도전 기록이 없습니다.');
 if(t?.loan&&(!t.intro||own[AMBER]?.state!=='JOINED'||own[AMBER]?.tutorialLoan!==true||t.loan.previous?.state==='JOINED'||t.loan.previous?.tutorialLoan||(t.loan.weaponSlot!==undefined&&typeof t.loan.weaponSlot!=='string')))fail('임시 동행 기록을 확인해 주세요.');
 for(const [id,v]of Object.entries(own))if(v.tutorialLoan&&t?.loan?.id!==id)fail('임시 동행의 첫 전투 기록이 없습니다.');
 const d=s.runtime?.tutorialDrill;if(d&&(s.runtime.origin!=='TUTORIAL:DRILL'||!['guard','attack','skill','win'].includes(d.step)))fail('훈련 전투 기록을 확인해 주세요.');if(t&&!t.intro){const view=Object.create(this);view.s=s;prepareIntro(view,t);}return s;};
})(globalThis);
