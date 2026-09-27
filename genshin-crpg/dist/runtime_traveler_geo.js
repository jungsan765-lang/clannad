/* Traveler element resonance: Liyue unlocks Geo at a Statue of The Seven, and statues switch the Traveler's element.
 * Traveler route only; the Isekai protagonist keeps its own non-elemental E/Q. Coefficients are CRPG house rules.
 * Load after runtime_protagonist.js and the place modules.
 */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.protagonistAllowedIds||P.travelerGeoVersion)return;
const old=Object.fromEntries(['installMarketContent','placeCatalog','protagonistAllowedIds','migrateProtagonist','actorCards','cardSupport','cardReason','combatCards','executeCard','protagonistCombatView','actionReason','apply','validateSave'].map(k=>[k,P[k]]));
const TRAVELER='ROUTE_TRAVELER',PLAYER='PLAYER_CUSTOM',TE='PLAYER_TRAVELER_ANEMO_E',TQ='PLAYER_TRAVELER_ANEMO_Q',GE='PLAYER_TRAVELER_GEO_E',GQ='PLAYER_TRAVELER_GEO_Q';
const GEO_IDS=new Set([GE,GQ]);
const STATUE={ANEMO:'EVT_CRPG_STATUE_ANEMO',GEO:'EVT_CRPG_STATUE_GEO'},NAME={ANEMO:'바람',GEO:'바위'};
const SKILLS={ANEMO:[TE,TQ],GEO:[GE,GQ]};
// House rules in the same shape as the Anemo entry of PROTAGONIST_COMBAT_CONFIG_JSON.
const RULE={e:{main:1.3,splash:.65,splash_targets:2,shield_hp:.12,shield_rounds:2,cooldown:3},q:{waves:[.8,.7,.7],targets:4,cooldown:4}};
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const card=(id,name,kind,range,cooldown,text,handler)=>[id,'PLAYER',PLAYER,name,kind,'[바위]','적',text,'루트별 해금',cooldown,'','','','GEO','','',text,'CRPG_HOUSE_RULE_20260927; 기술명은 한국어 게임 자료 교차 확인',0,range,0,'MANUAL_ONLY',1,'즉시','N',kind,0,0,0,'ATK','ACTIVE','ENEMY_1',handler,0,'runtime_traveler_geo.js','READY',JSON.stringify({handler,rule_version:1})];
const CARDS=[
 card(GE,'성운검','원소전투스킬','중거리',RULE.e.cooldown,'대상에게 운석을 떨어뜨려 바위 피해를 주고, 대상 곁의 적 최대 2명에게 여파 피해. 떨어진 운석을 엄폐물 삼아 여행자가 2턴 동안 최대 HP 12%의 바위 보호막을 얻는다. 3턴.','TRAVELER_GEO_E'),
 card(GQ,'첩첩산중','원소폭발','전장',RULE.q.cooldown,'땅을 울려 대상과 주변 적 최대 4명에게 바위 충격파 3연속. 첫 충격파는 작은 적을 밀쳐 낸다. 턴제 환산 기술. 4턴.','TRAVELER_GEO_Q')
];
const STATUES=[
 {id:STATUE.GEO,name:'일곱 신상 · 바위',facility:'리월 평야 길가',maps:['MAP_LIYUE_PLAINS']},
 {id:STATUE.ANEMO,name:'일곱 신상 · 바람',facility:'몬드성 광장',maps:['MAP_MOND_CITY']}
].map(x=>({...x,kind:'FACILITY',entity:null,merchant:null,from:0,to:1440,merchantMaps:null,merchantFrom:null,merchantTo:null,merchantType:'',merchantName:'',modes:['TALK']}));
P.installTravelerGeo=function(){
 if(this._travelerGeoInstalled)return;
 this.db={...this.db};const rows=this.db['08_SKILL_CARD_DB'].map(r=>r.slice());
 for(const row of CARDS)if(!rows.some(r=>r&&r[0]===row[0]))rows.push(row.slice());
 this.db['08_SKILL_CARD_DB']=rows;this.tables['08_SKILL_CARD_DB']=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));
 this._travelerGeoInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installTravelerGeo();return out;};
P.placeCatalog=function(){const list=old.placeCatalog.call(this);for(const entry of STATUES)if(!list.some(p=>p.id===entry.id))list.push({...entry,maps:entry.maps.slice(),modes:entry.modes.slice()});return list;};
P.travelerElement=function(s=this.s){const t=s?.travelerElements;return s?.global?.STORY_ROUTE_ID===TRAVELER&&t?.unlocked?.includes(t.active)?t.active:'ANEMO';};
P.protagonistAllowedIds=function(s=this.s){const ids=old.protagonistAllowedIds.call(this,s);return ids.includes(TE)&&this.travelerElement(s)==='GEO'?[GE,GQ]:ids;};
P.migrateProtagonist=function(s,isNew=false){
 const out=old.migrateProtagonist.call(this,s,isNew);if(!s?.global||s.runtime||this._creatingProtagonist)return out;
 // The original migration strips only its own four cards; resonance swaps the Traveler's pair.
 const allowed=this.protagonistAllowedIds(s),owned=String(s.global.PLAYER_SKILL_CARD_IDS||'').split(';').filter(id=>id&&(!GEO_IDS.has(id)&&![TE,TQ].includes(id)||allowed.includes(id)));
 s.global.PLAYER_SKILL_CARD_IDS=[...new Set([...owned,...allowed])].join(';');return out;
};
P.actorCards=function(a){const cards=old.actorCards.call(this,a);if(a.source!==PLAYER)return cards;
 const allowed=this.s.runtime?(a.protagonist?.skillIds||[]):this.protagonistAllowedIds();
 return cards.filter(c=>!GEO_IDS.has(c.id)||allowed.includes(c.id)&&this.s.global.STORY_ROUTE_ID===TRAVELER);
};
P.cardSupport=function(c){return GEO_IDS.has(c.id)?(c.ready?'':'주인공 기술 정의가 준비되지 않았습니다.'):old.cardSupport.call(this,c);};
P.cardReason=function(a,c){const base=old.cardReason.call(this,a,c);if(base||!GEO_IDS.has(c.id))return base;
 if(a.source!==PLAYER||!a.protagonist?.skillIds?.includes(c.id)||!this.protagonistAllowedIds().includes(c.id))return '이 루트에서 해금하지 않은 기술입니다.';
 if(this.combatActionLocked?.(a))return '행동 불가 상태입니다.';
 if(!this.cardTargets(a,c).length)return '공격 가능한 적이 없습니다.';
 return '';
};
P.combatCards=function(...args){return old.combatCards.apply(this,args).map(c=>GEO_IDS.has(c.id)?{...c,key:c.id===GE?'E':'Q',protagonistKind:'GEO'}:c);};
P.executeCard=function(a,c,target,branch){
 if(!GEO_IDS.has(c.id))return old.executeCard.call(this,a,c,target,branch);
 const reason=this.cardReason(a,c);if(reason)fail('PROTAGONIST_SKILL',reason);
 if(!this.cardTargets(a,c).some(x=>x.id===target))fail('TARGET','현재 기술에 맞는 적을 선택해 주세요.');
 this.initCombatPositions();
 if(c.id===GE){
  const targets=this.protagonistOrderedTargets(a,target,1+RULE.e.splash_targets).filter(x=>this.hasAirAccess(a,x,c.range));
  this.protagonistLog(a,c.id,c.name+' · 운석 낙하',{protagonistSkill:true});
  targets.forEach((enemy,i)=>{if(enemy.hp>0)this.damage(a,enemy,i?RULE.e.splash:RULE.e.main,'바위',{range:c.range,card:c.id});});
  const amount=Math.round(a.maxHp*RULE.e.shield_hp);this.shield(a,amount,'TRAVELER_GEO_METEOR',RULE.e.shield_rounds,{element:'바위'});
  this.protagonistLog(a,c.id,'운석 엄폐 · 바위 보호막 '+amount,{protagonistSkill:true,shield:amount});
  a.cooldowns[c.id]=RULE.e.cooldown;
 }else{
  const targets=this.protagonistOrderedTargets(a,target,RULE.q.targets).filter(x=>this.hasAirAccess(a,x,c.range));
  // The Anemo burst's neighbourhood limit would miss a fence around the Traveler; widen to any reachable enemy.
  for(const extra of this.s.runtime.actors.filter(t=>t.side==='ENEMY'&&t.hp>0&&!targets.includes(t)&&this.hasAirAccess(a,t,c.range)))if(targets.length<RULE.q.targets)targets.push(extra);
  this.protagonistLog(a,c.id,c.name+' · 바위 충격파',{protagonistSkill:true});
  RULE.q.waves.forEach((k,wave)=>{for(const enemy of targets){if(enemy.hp<=0)continue;const hit=this.damage(a,enemy,k,'바위',{range:c.range,card:c.id,noAura:wave>0});
   if(!wave&&hit&&enemy.hp>0&&this.combatSize(enemy)==='SMALL')this.applyCombatControl(a,enemy,'PUSH',{bossImmune:true,element:'바위'});}});
  a.cooldowns[c.id]=RULE.q.cooldown;
 }
 return {card:c.id,target,cooldown:a.cooldowns[c.id]};
};
P.protagonistCombatView=function(){const v=old.protagonistCombatView.call(this);if(v.kind!=='ANEMO'||this.travelerElement()!=='GEO')return v;
 return {...v,kind:'GEO',title:'여행자 · 바위 원소',text:v.legacy?v.text:'바위 공명 · E 성운검 / Q 첩첩산중 · 일곱 신상에서 원소를 바꿀 수 있습니다.'};};
// ---- resonance at a Statue of The Seven -----------------------------------------------------------------------
P.travelerResonanceView=function(){
 const s=this.s,g=s.global,place=this.currentPlace(),statue=Object.keys(STATUE).find(k=>place?.valid&&place.place===STATUE[k])||null,t=s.travelerElements;
 const unlocked=g.STORY_ROUTE_ID===TRAVELER?(t?.unlocked||['ANEMO']):[];
 return {traveler:g.STORY_ROUTE_ID===TRAVELER,resonant:this.protagonistUnlocked(),statue,active:g.STORY_ROUTE_ID===TRAVELER?this.travelerElement():null,
  elements:Object.keys(STATUE).map(id=>({id,name:NAME[id],unlocked:unlocked.includes(id),active:this.travelerElement()===id&&g.STORY_ROUTE_ID===TRAVELER,statue:STATUE[id],
   skills:SKILLS[id].map(card=>{const r=this.tables['08_SKILL_CARD_DB'].get(card);return {id:card,key:card===SKILLS[id][0]?'E':'Q',name:r?.[3]||card,text:r?.[7]||''};}),
   reason:this.actionReason('TRAVELER_RESONATE',{element:id})}))};
};
P.actionReason=function(type,a={}){
 const reason=old.actionReason.call(this,type,a);if(reason||type!=='TRAVELER_RESONATE')return reason;
 const g=this.s.global,element=a.element;
 if(!STATUE[element])return '공명할 원소를 선택해 주세요.';
 if(g.STORY_ROUTE_ID!==TRAVELER)return '일곱 신상은 이세계인의 손길에 반응하지 않습니다.';
 if(!this.protagonistUnlocked())return '먼저 바람 신상과의 공명을 되찾아야 합니다.';
 if(this.s.runtime||this.s.battlePreparation||g.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '진행 중인 장면을 먼저 마쳐 주세요.';
 const place=this.currentPlace();if(!place?.valid||place.place!==STATUE[element])return STATUES.find(x=>x.id===STATUE[element]).facility+'의 '+NAME[element]+' 신상 앞에서 공명할 수 있습니다.';
 if(this.travelerElement()===element)return '이미 '+NAME[element]+' 원소와 공명하고 있습니다.';
 return '';
};
P.apply=function(a){
 if(a?.type!=='TRAVELER_RESONATE')return old.apply.call(this,a);
 const reason=this.actionReason('TRAVELER_RESONATE',a);if(reason)fail('TRAVELER_RESONATE',reason);
 const s=this.s,g=s.global,t=s.travelerElements??={version:1,active:'ANEMO',unlocked:['ANEMO'],receipts:{}},first=!t.unlocked.includes(a.element);
 if(first){t.unlocked.push(a.element);t.receipts[a.element]={place:STATUE[a.element],day:g.WORLD_DAY,time:g.WORLD_TIME,turn:g.TURN};}
 t.active=a.element;this.migrateProtagonist(s);
 return {element:a.element,first,cards:this.protagonistAllowedIds().slice()};
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,t=out.travelerElements;
 if(t!==undefined){
  const bad=()=>fail('TRAVELER_ELEMENT_SAVE','여행자의 원소 공명 기록을 확인할 수 없습니다.');
  if(out.global.STORY_ROUTE_ID!==TRAVELER||!t||t.version!==1||!Array.isArray(t.unlocked)||!t.unlocked.includes('ANEMO')||t.unlocked.some(e=>!STATUE[e])||new Set(t.unlocked).size!==t.unlocked.length||!t.unlocked.includes(t.active)||!t.receipts||typeof t.receipts!=='object'||Array.isArray(t.receipts))bad();
  for(const e of t.unlocked.filter(e=>e!=='ANEMO')){const r=t.receipts[e];if(!r||r.place!==STATUE[e]||!Number.isSafeInteger(r.day)||r.day<1||r.day>out.global.WORLD_DAY||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time||''))bad();}
 }
 return out;
};
P.travelerGeoVersion=1;api.travelerGeoVersion=1;api.travelerGeoRules=copy(RULE);
})(globalThis);
