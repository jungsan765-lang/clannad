/* Liyue repeat boss farming: Tartaglia artifacts and Azhdaha artifact enhancement materials. */
(function(root){
'use strict';
const api=root.CRPGRuntime;if(!api?.Runtime)throw Error('CRPGRuntime must be loaded first');
if(!api.enhancementConfig?.bosses)throw Error('runtime_enhancement.js must be loaded first');
const P=api.Runtime.prototype;
if(P.liyueArtifactModuleVersion)return;
const copy=x=>JSON.parse(JSON.stringify(x));
const yes=x=>x===true||x==='TRUE'||x==='Y';
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const FARM={
 TARTAGLIA:{key:'LIYUE_TARTAGLIA_FARM',name:'타르탈리아',map:'MAP_LIYUE_GOLDEN_HOUSE',group:'EG_BOSS_TARTAGLIA',reward:'ARTIFACT'},
 AZHDAHA:{key:'LIYUE_AZHDAHA_FARM',name:'야타용왕',map:'MAP_AZHDAHA_DOMAIN',group:'EG_BOSS_AZHDAHA',reward:'MATERIAL'}
};
const ARTIFACT_MATERIAL='MAT_AZHDAHA_ARTIFACT_CRYSTAL';
const LEVEL_MULT=[1,1.20,1.45,1.75,2.10,2.50];
const SUCCESS=[0,9000,7500,5500,3500,2000];
const MAT_COST=[0,1,1,2,3,4];
const MORA_COST=[0,400,700,1200,2000,3500];
const ARCHETYPES={
 EDGE:{id:'EQ_ARTIFACT_EDGE',name:'성유물 · 칼날형',weights:{ATK:22,CRIT:1.7,CRIT_DMG:11}},
 TIDE:{id:'EQ_ARTIFACT_TIDE',name:'성유물 · 격류형',weights:{ATK:14,SPD:3,HIT:3,CRIT:1}},
 GUARD:{id:'EQ_ARTIFACT_GUARD',name:'성유물 · 철벽형',weights:{DEF:24,MAX_HP:100,STATUS_RESIST:3}},
 VITAL:{id:'EQ_ARTIFACT_VITAL',name:'성유물 · 생명형',weights:{MAX_HP:175,DEF:10,STATUS_RESIST:1.5}},
 SWIFT:{id:'EQ_ARTIFACT_SWIFT',name:'성유물 · 신속형',weights:{SPD:5,EVA:4,HIT:3}},
 BALANCE:{id:'EQ_ARTIFACT_BALANCE',name:'성유물 · 균형형',weights:{ATK:12,DEF:12,MAX_HP:80,CRIT:1,CRIT_DMG:6}}
};
const KINDS=Object.keys(ARCHETYPES),STAT_KEYS=['ATK','DEF','MAX_HP','SPD','CRIT','CRIT_DMG','HIT','EVA','STATUS_RESIST'];
api.liyueArtifactConfig=copy({version:1,farm:FARM,material:ARTIFACT_MATERIAL,success:SUCCESS,materialCost:MAT_COST,moraCost:MORA_COST,levelMultiplier:LEVEL_MULT,archetypes:ARCHETYPES});
const old=Object.fromEntries(['installMarketContent','equipmentStats','finishBattle','apply','actionReason','validateSave'].map(k=>[k,P[k]]));
function headerSet(rows,row,key,value){const i=rows[0].indexOf(key);if(i>=0)row[i]=value;}
function installRows(r){
 if(r._liyueArtifactContentInstalled)return;
 const equips=r.db['16_EQUIP_DB'].map(row=>row.slice()),items=r.db['14_ITEM_DB'].map(row=>row.slice());
 const equipTemplate=equips.find(row=>row[0]==='EQ_SPECIAL_FIELD_PACK')||equips.slice(1).find(row=>row[2]==='특수');
 const itemTemplate=items.find(row=>row[0]==='TRPG_BOSS_ESSENCE')||items.slice(1).find(row=>row[0]);
 if(!equipTemplate||!itemTemplate)fail('ARTIFACT_CONTENT','성유물 템플릿을 만들 기존 장비/재료 정의가 없습니다.');
 for(const spec of Object.values(ARCHETYPES))if(!equips.some(row=>row[0]===spec.id)){
  const row=equipTemplate.slice();
  headerSet(equips,row,'EQUIP_ID',spec.id);headerSet(equips,row,'장비명',spec.name);headerSet(equips,row,'이름',spec.name);
  headerSet(equips,row,'장비 종류','특수');headerSet(equips,row,'장착 가능 대상','전원');headerSet(equips,row,'최소 레벨',1);
  for(const key of ['기본 ATK','기본 DEF','기본 HP','치확%','치피%','SPD 보정','명중 보정','회피 보정','상태저항 보정'])headerSet(equips,row,key,0);
  headerSet(equips,row,'기타 보조 스탯','드랍 시 개별 난수');headerSet(equips,row,'고유 효과','타르탈리아 반복 도전에서 개별 능력치가 난수로 결정되는 CRPG 성유물.');
  headerSet(equips,row,'강화 성장','야타용왕의 지맥 결정으로 +5까지 별도 확률 강화');headerSet(equips,row,'획득처/조건','리월 황금옥 · 타르탈리아 반복 도전');
  headerSet(equips,row,'판매가',100);headerSet(equips,row,'ENHANCEMENT_PROFILE_JSON','{}');headerSet(equips,row,'ENHANCE_ALLOWED','N');headerSet(equips,row,'ENHANCE_LIMIT',0);
  headerSet(equips,row,'NO_ENHANCE_REASON','성유물은 일반 장비 강화가 아니라 야타용왕 재료로 +5까지 별도 강화합니다.');
  equips.push(row);
 }
 if(!items.some(row=>row[0]===ARTIFACT_MATERIAL)){
  const row=itemTemplate.slice();
  headerSet(items,row,'ITEM_ID',ARTIFACT_MATERIAL);headerSet(items,row,'아이템명','야타용왕의 지맥 결정');headerSet(items,row,'이름','야타용왕의 지맥 결정');
  headerSet(items,row,'분류','재료');headerSet(items,row,'설명','야타용왕 반복 도전에서 얻는 CRPG 전용 성장 재료. 타르탈리아에게서 얻은 성유물을 +5까지 확률 강화할 때 사용한다.');
  headerSet(items,row,'효과','성유물 강화 재료');headerSet(items,row,'재료 여부','Y');headerSet(items,row,'퀘스트 아이템 여부','N');headerSet(items,row,'판매가',150);headerSet(items,row,'구매가',0);
  items.push(row);
 }
 r.db={...r.db,'16_EQUIP_DB':equips,'14_ITEM_DB':items};
 r.tables['16_EQUIP_DB']=new Map(equips.slice(1).filter(row=>row[0]).map(row=>[row[0],row]));
 r.tables['14_ITEM_DB']=new Map(items.slice(1).filter(row=>row[0]).map(row=>[row[0],row]));
 r._liyueArtifactContentInstalled=true;
}
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);installRows(this);return out;};
P.artifactInstance=function(slot){const inv=this.s.inventory.find(i=>i.slot===slot&&i.equip);return inv?.artifact?inv:null;};
P.artifactStats=function(inv,level=inv?.artifact?.level||0){
 if(!inv?.artifact)return {};const mult=LEVEL_MULT[level]??LEVEL_MULT.at(-1),out={};
 for(const [k,v] of Object.entries(inv.artifact.stats||{}))if(STAT_KEYS.includes(k)&&Number.isFinite(Number(v)))out[k]=Math.round(Number(v)*mult*10)/10;
 return out;
};
P.artifactGrade=function(q){return q>=970?'완벽':q>=850?'걸작':q>=650?'희귀':q>=400?'정교':q>=180?'평범':'조악';};
P.rollArtifact=function(){
 const kind=KINDS[Math.floor(this.random()*KINDS.length)],spec=ARCHETYPES[kind];
 const quality=1+Math.floor(Math.pow(this.random(),2.2)*999),scale=.22+2.78*Math.pow(quality/1000,1.8),stats={};
 for(const [key,weight] of Object.entries(spec.weights)){const jitter=.72+this.random()*.56,value=weight*scale*jitter;stats[key]=['CRIT','CRIT_DMG','SPD','HIT','EVA','STATUS_RESIST'].includes(key)?Math.round(value*10)/10:Math.max(1,Math.round(value));}
 const secondaryPool=STAT_KEYS.filter(k=>!Object.hasOwn(stats,k));
 for(let n=0;n<2&&secondaryPool.length;n++){
  const i=Math.floor(this.random()*secondaryPool.length),key=secondaryPool.splice(i,1)[0],base={ATK:7,DEF:7,MAX_HP:45,SPD:1.6,CRIT:.7,CRIT_DMG:4.5,HIT:1.4,EVA:1.4,STATUS_RESIST:1.4}[key];
  const value=base*scale*(.55+this.random()*.9);stats[key]=['CRIT','CRIT_DMG','SPD','HIT','EVA','STATUS_RESIST'].includes(key)?Math.round(value*10)/10:Math.max(1,Math.round(value));
 }
 const slot=this.giveEquipment(spec.id),inv=this.s.inventory.find(i=>i.slot===slot);
 inv.artifact={version:1,kind,quality,grade:this.artifactGrade(quality),level:0,stats};inv.instanceRevision=(inv.instanceRevision||0)+1;
 return {slot,equip:spec.id,name:spec.name,quality,grade:inv.artifact.grade,level:0,stats:copy(stats)};
};
P.equipmentStats=function(owner){
 const out=old.equipmentStats.call(this,owner);
 for(const inv of this.s.inventory.filter(i=>i.equipped&&i.owner===owner&&i.artifact))for(const [k,v] of Object.entries(this.artifactStats(inv)))if(Object.hasOwn(out,k))out[k]+=v;
 return out;
};
P.liyueArtifactUnlocked=function(kind){
 if(kind==='TARTAGLIA'){
  const qids=['Q_TRV_LIYUE_03','Q_ISK_LIYUE_03'];
  return yes(this.s.flags.FLAG_TRV_LY_TARTAGLIA_WON)||Object.values(this.s.combatReceipts||{}).some(r=>r?.victory&&r.group==='EG_BOSS_TARTAGLIA')||qids.some(id=>{const q=this.s.quests?.[id];return q?.claimed||q?.state==='완료';});
 }
 if(kind==='AZHDAHA'){
  const route=this.tables['35_BOSS_ROUTE_DB']?.get('BRT_AZHDAHA'),flag=route?.[13];
  return !!(flag&&yes(this.s.flags[flag]))||Object.values(this.s.combatReceipts||{}).some(r=>r?.victory&&r.group==='EG_BOSS_AZHDAHA');
 }
 return false;
};
P.liyueArtifactFarmReason=function(kind){
 const f=FARM[kind];if(!f)return '지원하지 않는 리월 반복 도전입니다.';
 if(this.s.runtime||this.s.battlePreparation)return '진행 중인 전투를 먼저 마쳐 주세요.';
 if(['AWAIT_NEXT','IN_BATTLE','RETRY'].includes(this.s.bossRouteProgress?.phase))return '진행 중인 보스 루트를 마치거나 이탈해 주세요.';
 if(this.s.global.CURRENT_MAP_ID!==f.map)return f.name+' 반복 도전 현장에 도착해야 합니다.';
 if(!this.liyueArtifactUnlocked(kind))return kind==='TARTAGLIA'?'리월 제3막 이후 황금옥의 타르탈리아 전투 기록이 필요합니다.':'야타용왕을 먼저 클리어해야 합니다.';
 const now=(Number(this.s.global.WORLD_DAY)-1)*1440+Number(String(this.s.global.WORLD_TIME).slice(0,2))*60+Number(String(this.s.global.WORLD_TIME).slice(3,5)),until=Number(this.s.liyueArtifactFarm?.cooldowns?.[kind]||0);
 if(until>now){const left=until-now,h=Math.floor(left/60),m=left%60;return '이 보스는 게임 내 48시간에 1회 파밍 입장할 수 있습니다. 남은 시간 '+h+'시간 '+m+'분.';}
 return '';
};
P.startLiyueArtifactFarm=function(kind){const why=this.liyueArtifactFarmReason(kind);if(why)fail('LIYUE_FARM',why);const f=FARM[kind],now=(Number(this.s.global.WORLD_DAY)-1)*1440+Number(String(this.s.global.WORLD_TIME).slice(0,2))*60+Number(String(this.s.global.WORLD_TIME).slice(3,5));this.s.liyueArtifactFarm??={version:1,cooldowns:{}};this.s.liyueArtifactFarm.version=1;this.s.liyueArtifactFarm.cooldowns??={};this.s.liyueArtifactFarm.cooldowns[kind]=now+2880;this.s.placeVisit=null;return this.startBattle(f.group,'MATERIAL_CHALLENGE:'+f.key);};
P.artifactEnhancementQuote=function(slot){
 const inv=this.artifactInstance(slot);if(!inv)return {supported:false,reason:'성유물 장비를 선택해 주세요.'};
 const level=Number(inv.artifact.level||0);if(level>=5)return {supported:true,slot,level,maxed:true,reason:'이미 +5 최대 강화입니다.',instanceRevision:inv.instanceRevision||0};
 const target=level+1,cost={mora:MORA_COST[target],items:{[ARTIFACT_MATERIAL]:MAT_COST[target]}},missing={mora:Math.max(0,cost.mora-this.s.global.MORA),items:{}};
 for(const [id,n] of Object.entries(cost.items))missing.items[id]=Math.max(0,n-this.itemCount(id));
 return {supported:true,slot,level,target,successBp:SUCCESS[target],successPct:SUCCESS[target]/100,cost,missing,instanceRevision:inv.instanceRevision||0};
};
P.artifactEnhancementReason=function(a={}){
 if(this.s.runtime)return '전투 중에는 성유물을 강화할 수 없습니다.';
 const facilityReason=this.placeEnhanceReason?.()||'';if(facilityReason)return facilityReason;
 const q=this.artifactEnhancementQuote(a.slot);if(!q.supported||q.maxed)return q.reason;
 if(a.expectedLevel!==undefined&&a.expectedLevel!==q.level)return '성유물 강화 단계가 변경되었습니다. 다시 확인해 주세요.';
 if(a.instanceRevision!==undefined&&a.instanceRevision!==q.instanceRevision)return '성유물 상태가 변경되었습니다. 다시 확인해 주세요.';
 if(q.missing.mora>0||Object.values(q.missing.items).some(Boolean))return '성유물 강화 재료 또는 모라가 부족합니다.';
 return '';
};
P.enhanceArtifact=function(a){
 const why=this.artifactEnhancementReason(a);if(why)fail('ARTIFACT_ENHANCE',why);const inv=this.artifactInstance(a.slot),q=this.artifactEnhancementQuote(a.slot),oldMax=this.s.global.PLAYER_HP_MAX;
 this.pay(q.cost);const roll=Math.floor(this.random()*10000)+1,success=roll<=q.successBp;if(success)inv.artifact.level=q.target;inv.instanceRevision=(inv.instanceRevision||0)+1;
 this.advanceTime(15);this.recalculate();if(inv.equipped&&inv.owner==='PLAYER_CUSTOM')this.s.global.PLAYER_HP_CURRENT=Math.min(this.s.global.PLAYER_HP_MAX,this.s.global.PLAYER_HP_CURRENT+Math.max(0,this.s.global.PLAYER_HP_MAX-oldMax));
 return {slot:a.slot,success,roll,successBp:q.successBp,level:inv.artifact.level,target:q.target,material:ARTIFACT_MATERIAL};
};
P.finishBattle=function(victory){
 const battle=this.s.runtime,origin=battle?.origin||'',result=old.finishBattle.call(this,victory);
 if(!victory||!origin.startsWith('MATERIAL_CHALLENGE:LIYUE_'))return result;
 const key=origin.slice('MATERIAL_CHALLENGE:'.length),f=Object.values(FARM).find(x=>x.key===key);if(!f)return result;
 let bonus={};
 if(f.reward==='ARTIFACT'){bonus.artifact=this.rollArtifact();}
 else {const quantity=2+Math.floor(this.random()*3);this.giveItem(ARTIFACT_MATERIAL,quantity);bonus.items={[ARTIFACT_MATERIAL]:quantity};}
 const settled=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'{}');settled.loot=settled.loot||{};settled.liyueFarm={boss:key,...copy(bonus)};if(bonus.items)for(const [id,n] of Object.entries(bonus.items))settled.loot[id]=(settled.loot[id]||0)+n;
 this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(settled);for(let i=this.s.log.length-1;i>=0;i--)if(this.s.log[i]?.id===settled.id){Object.assign(this.s.log[i],copy(settled));break;}
 return result;
};
P.actionReason=function(type,a={}){if(type==='LIYUE_ARTIFACT_CHALLENGE')return this.liyueArtifactFarmReason(a.kind);if(type==='ARTIFACT_ENHANCE')return this.artifactEnhancementReason(a);return old.actionReason.call(this,type,a);};
P.apply=function(a){if(a.type==='LIYUE_ARTIFACT_CHALLENGE')return this.startLiyueArtifactFarm(a.kind);if(a.type==='ARTIFACT_ENHANCE')return this.enhanceArtifact(a);return old.apply.call(this,a);};
P.validateSave=function(s){
 const validated=old.validateSave.call(this,s),kinds=new Set(KINDS);
 const farm=validated.liyueArtifactFarm;if(farm!==undefined&&(farm?.version!==1||!farm.cooldowns||typeof farm.cooldowns!=='object'||Array.isArray(farm.cooldowns)||Object.entries(farm.cooldowns).some(([k,v])=>!Object.hasOwn(FARM,k)||!Number.isSafeInteger(v)||v<0)))fail('ARTIFACT_FARM_SAVE','리월 반복 도전 입장 기록이 손상되었습니다.');
 for(const inv of validated.inventory||[])if(inv.artifact){const a=inv.artifact;if(a.version!==1||!kinds.has(a.kind)||!Number.isInteger(a.quality)||a.quality<1||a.quality>1000||!Number.isInteger(a.level)||a.level<0||a.level>5||!a.stats||typeof a.stats!=='object'||Array.isArray(a.stats)||Object.entries(a.stats).some(([k,v])=>!STAT_KEYS.includes(k)||!Number.isFinite(v)||v<0))fail('ARTIFACT_SAVE','성유물 저장 데이터가 손상되었습니다.');}
 return validated;
};
P.liyueArtifactModuleVersion=1;api.liyueArtifactModuleVersion=1;
})(typeof globalThis!=='undefined'?globalThis:this);
