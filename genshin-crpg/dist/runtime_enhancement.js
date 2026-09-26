/* Mond enhancement v1. Probabilities are mutually exclusive PER ATTEMPT, in basis
 * points. Atomic Runtime.action() owns costs, RNG, save receipts and rollback.
 * No monster stats, combat skills, remote sheets or artwork are changed here. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
const fail=(c,m)=>{throw new api.RuleError(c,m);},yes=x=>x===true||x==='TRUE'||x==='Y';
const parse=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const old=Object.fromEntries(['installMarketContent','newGame','validateSave','apply','actionReason','enhance','finishBattle','startBattle'].map(k=>[k,P[k]]));
const CONFIG={version:1,baseCap:10,ascendedCap:12,
 // index = target level; success + hold + down is always 10000.
 success:[0,10000,9500,9000,8500,8000,7000,6000,5000,4000,3000,2500,2000],
 down:[0,0,0,0,0,0,0,0,0,50,100,200,300],
 primaryGrowth:[0,.05,.10,.15,.20,.25,.30,.35,.40,.45,.50,.65,.80],
 mora:[0,80,120,180,260,380,550,800,1100,1500,2000,2800,4000],
 ores:[{}, {ORE_IRON:1},{ORE_IRON:2},{ORE_IRON:3},{ORE_IRON:4},{ORE_IRON:5,ORE_WHITE_IRON:1},{ORE_IRON:6,ORE_WHITE_IRON:2},{ORE_WHITE_IRON:3,ORE_CRYSTAL:1},{ORE_WHITE_IRON:4,ORE_CRYSTAL:2},{ORE_WHITE_IRON:5,ORE_CRYSTAL:3},{ORE_WHITE_IRON:6,ORE_CRYSTAL:4},{ORE_WHITE_IRON:8,ORE_CRYSTAL:5},{ORE_WHITE_IRON:10,ORE_CRYSTAL:8}],
 ascensionCost:{mora:3000,items:{TRPG_BOSS_ESSENCE:3,TRPG_BOSS_CORE:1,ORE_CRYSTAL:5}},
 bosses:{BOSS_DVALIN:{route:'BRT_DVALIN',map:'MAP_STORMTERROR_LAIR',group:'EG_BOSS_DVALIN'},BOSS_ANDRIUS:{route:'BRT_ANDRIUS',map:'MAP_WOLF_ARENA',group:'EG_BOSS_ANDRIUS'}},
};
const scope=new Set(Object.keys(api.equipmentValueConfig.stats)),columns={ATK:4,DEF:5,MAX_HP:6};
P.installMarketContent=function(){
 old.installMarketContent.call(this);if(this._enhancementInstalled)return;
 const rows=this.db['16_EQUIP_DB'].map(r=>r.slice());
 for(const row of rows.slice(1)){
  if(!yes(row[33]))continue;
  const existing=parse(row[32]),legacy=['CRPG_MOND_ENHANCEMENT_V1','CRPG_REGIONAL_ENHANCEMENT_V2'].includes(existing.basis)?(existing.legacy_profile||{}):existing,milestones={};
  for(let level=1;level<=12;level++){
   const prior=legacy.milestones?.[level],m=milestones[level]={stats_add:{...prior?.stats_add},effect_override:{...prior?.effect_override}};
   for(const [stat,col]of Object.entries(columns)){
    const base=Number(row[col]||0),gain=Math.round(base*CONFIG.primaryGrowth[level])-Math.round(base*CONFIG.primaryGrowth[level-1]);
    if(gain>0)m.stats_add[stat]=(m.stats_add[stat]||0)+gain;
   }
  }
  row[32]=JSON.stringify({...legacy,schema:2,basis:'CRPG_REGIONAL_ENHANCEMENT_V2',allowed_levels:Array.from({length:13},(_,i)=>i),milestones,
   costs:Object.fromEntries(Array.from({length:12},(_,i)=>[i+1,{mora:CONFIG.mora[i+1],items:CONFIG.ores[i+1]}])),
   base_limit:10,ascended_limit:12,legacy_profile:legacy,
   note:'확률·성장치는 CRPG 설계. 몬드·리월 등 실제 대장간에서 공통 사용. 기존 고유효과 실행 범위는 유지하며, 새로운 고유효과 실행기를 추가하지 않음.'});
  row[29]='기본 공격력·방어력·최대 HP: +1당 5%, +10은 +50%, 돌파 후 +11은 +65%, +12는 +80%. 기존 수치형 보너스 유지.';
  row[34]=12;
 }
 this.db={...this.db,'16_EQUIP_DB':rows};this.tables['16_EQUIP_DB']=new Map(rows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));this._enhancementInstalled=true;
};
P.isMondEnhanceable=function(id){const row=this.tables['16_EQUIP_DB'].get(id);return !!row&&yes(row[33]);};
P.enhancementCap=function(inv){return inv.enhancementCap===12?12:10;};
P.enhancementSync=function(s){
 if(!s?.global)return s;
 if(s.enhancementVersion!==undefined&&s.enhancementVersion!==1)fail('ENHANCEMENT_VERSION','지원하지 않는 강화 저장 버전입니다.');
 for(const i of s.inventory){if(!i.equip)continue;
  if(this.isMondEnhanceable(i.equip)){
   if(i.enhancementCap!==undefined&&![10,12].includes(i.enhancementCap))fail('ENHANCE_SAVE','장비 돌파 한도가 잘못되었습니다.');
   if(!Number.isInteger(i.enhance)||i.enhance<0||i.enhance>this.enhancementCap(i))fail('ENHANCE_SAVE','강화도 또는 돌파 기록이 올바르지 않습니다.');
  }else if(![0,3,6,9].includes(i.enhance)||i.enhancementCap!==undefined)fail('ENHANCE_SAVE','이번 강화 대상이 아닌 장비의 강화 기록입니다.');
 }
 if(s.runtime||s.enhancementVersion===1)return s;
 const f=Object.create(this);f.s=s;const hp=s.global.PLAYER_HP_CURRENT;f.recalculate();s.global.PLAYER_HP_CURRENT=Math.min(hp,s.global.PLAYER_HP_MAX);
 for(const [id,ch]of Object.entries(s.chars))if(f.tables['07_CHAR_DB'].has(id))ch.hp=Math.min(ch.hp,f.character(id).maxHp);
 s.enhancementVersion=1;return s;
};
P.newGame=function(...args){old.newGame.apply(this,args);this.enhancementSync(this.s);return copy(this.s);};
P.validateSave=function(s){s=old.validateSave.call(this,s);return this.enhancementSync(s);};
P.enhancementMissing=function(cost){
 if(this.s.global.MORA<cost.mora)return '모라가 부족합니다.';
 for(const [id,n]of Object.entries(cost.items||{}))if(this.itemCount(id)<n){const name=this.row('14_ITEM_DB',id)[1],code=String(name).slice(-1).charCodeAt(0)-0xAC00;return name+(code>=0&&code<11172?(code%28?'이':'가'):'이(가)')+' 부족합니다.';}
 return '';
};
P.enhancementStatsAt=function(inv,level){
 const row=this.row('16_EQUIP_DB',inv.equip),profile=parse(row[32]),stats={};
 for(const [key,col]of Object.entries(columns))stats[key]=Number(row[col]||0);
 for(const [lv,m]of Object.entries(profile.milestones||{}))if(Number(lv)<=level)for(const [key,val]of Object.entries(m.stats_add||{}))stats[key]=(stats[key]||0)+val;
 return stats;
};
P.enhancementQuote=function(slot,kind='ENHANCE'){
 const inv=this.s.inventory.find(i=>i.slot===slot&&i.equip);if(!inv)return {supported:false,reason:'소지한 개별 장비를 선택해 주세요.'};
 const row=this.row('16_EQUIP_DB',inv.equip),supported=this.isMondEnhanceable(inv.equip),target=inv.enhance+1,cap=this.enhancementCap(inv);
 const q={slot,name:row[1],equip:inv.equip,level:inv.enhance,cap,instanceRevision:inv.instanceRevision||0,supported,kind,target,reason:'',cost:null};
 if(!supported){q.reason=row[35]||'이 장비는 확률 강화·돌파 대상이 아닙니다.';return q;}
 q.statsBefore=this.enhancementStatsAt(inv,inv.enhance);
 if(kind==='ASCEND'){
  q.target=12;q.cost=copy(CONFIG.ascensionCost);q.success=10000;q.hold=q.down=0;q.statsAfter=copy(q.statsBefore);
  if(cap===12)q.reason='이미 +12까지 돌파한 장비입니다.';
  else if(inv.enhance!==10)q.reason='+10 장비만 한도 돌파할 수 있습니다.';
 }else{
  if(target>cap)q.reason=cap===10?'+10 도달: 보스 재료로 먼저 한도를 돌파해 주세요.':'최대 강화 +12입니다.';
  else{q.cost={mora:CONFIG.mora[target],items:copy(CONFIG.ores[target])};q.success=CONFIG.success[target];q.down=CONFIG.down[target];q.hold=10000-q.success-q.down;q.statsAfter=this.enhancementStatsAt(inv,target);q.statsDown=this.enhancementStatsAt(inv,Math.max(0,inv.enhance-1));}
 }
 q.reason=q.reason||(q.cost?this.enhancementMissing(q.cost):'');return q;
};
P.enhancementFacilityReason=function(){
 if(this.s.runtime||this.playPhase()!=='FREE')return '현재 이야기·전투를 마친 뒤 강화해 주세요.';
 if(this.s.global.SCREEN_MODE!=='CRAFT')return '대장간의 제작·강화 화면에서 선택해 주세요.';
 return this.placeEnhanceReason();
};
P.enhancementActionReason=function(a){
 const facility=this.enhancementFacilityReason();if(facility)return facility;
 const q=this.enhancementQuote(a.slot,a.type==='EQUIP_ASCEND'?'ASCEND':'ENHANCE');
 if(q.reason)return q.reason;
 if(a.expectedLevel!==undefined&&a.expectedLevel!==q.level||a.instanceRevision!==undefined&&a.instanceRevision!==q.instanceRevision)return '장비가 변경되었습니다. 현재 확률과 비용을 다시 확인해 주세요.';
 if(a.expectedCap!==undefined&&a.expectedCap!==q.cap)return '장비 돌파 상태가 변경되었습니다.';
 return '';
};
P.performEnhancement=function(a){
 const reason=this.enhancementActionReason(a);if(reason)fail('ENHANCE',reason);
 const kind=a.type==='EQUIP_ASCEND'?'ASCEND':'ENHANCE',q=this.enhancementQuote(a.slot,kind),inv=this.s.inventory.find(i=>i.slot===a.slot);
 const hp=this.s.global.PLAYER_HP_CURRENT;this.pay(q.cost);
 let outcome='ASCENDED',roll=null;
 if(kind==='ASCEND')inv.enhancementCap=12;
 else{roll=this.die(10000);outcome=roll<=q.success?'SUCCESS':roll>10000-q.down?'DOWN':'HOLD';if(outcome==='SUCCESS')inv.enhance++;else if(outcome==='DOWN')inv.enhance--;}
 inv.instanceRevision=(inv.instanceRevision||0)+1;this.advanceTime(kind==='ASCEND'?60:30);this.recalculate();this.s.global.PLAYER_HP_CURRENT=Math.min(hp,this.s.global.PLAYER_HP_MAX);
 for(const [id,ch]of Object.entries(this.s.chars))if(this.tables['07_CHAR_DB'].has(id))ch.hp=Math.min(ch.hp,this.character(id).maxHp);
 const result={kind,slot:inv.slot,equip:inv.equip,name:q.name,from:q.level,level:inv.enhance,cap:this.enhancementCap(inv),outcome,
  chance:{success:q.success,hold:q.hold,down:q.down,units:'basis_points_per_attempt'},cost:q.cost,statsBefore:q.statsBefore,statsAfter:this.enhancementStatsAt(inv,inv.enhance),minutes:kind==='ASCEND'?60:30};
 // Store only the result in the existing action receipt; no duplicate global RNG or cost ledger.
 this.s.lastEnhancement=copy(result);return result;
};
P.enhance=function(slot){const inv=this.s.inventory.find(i=>i.slot===slot&&i.equip);if(!inv)fail('ENHANCE','소지한 장비를 선택해 주세요.');if(!this.isMondEnhanceable(inv.equip))fail('ENHANCE',this.row('16_EQUIP_DB',inv.equip)[35]||'이 장비는 강화할 수 없습니다.');return this.performEnhancement({type:'ENHANCE',slot});};
P.materialChallengeReason=function(boss){
 const cfg=CONFIG.bosses[boss];if(!cfg)return '몬드의 두 보스만 재도전할 수 있습니다.';
 const base=old.actionReason.call(this,'MOND_MATERIAL_CHALLENGE',{boss});if(base)return base;
 if(this.s.runtime||this.s.battlePreparation)return '진행 중인 전투를 먼저 마쳐 주세요.';
 if(['AWAIT_NEXT','IN_BATTLE','RETRY'].includes(this.s.bossRouteProgress?.phase))return '진행 중인 보스 루트를 마치거나 이탈해 주세요.';
 if(this.s.global.CURRENT_MAP_ID!==cfg.map)return '해당 보스의 현장에 도착해야 재도전할 수 있습니다.';
 const cleared=yes(this.s.flags[this.row('35_BOSS_ROUTE_DB',cfg.route)[13]])||Object.values(this.s.combatReceipts||{}).some(r=>r.victory&&r.group===cfg.group)||
  boss==='BOSS_DVALIN'&&['FLAG_TRV_DVALIN_PURIFIED','FLAG_ISK_K_DVALIN_PURIFIED','FLAG_ISK_AA_DVALIN_LEFT_WITH_BARBATOS','FLAG_ISK_AB_DVALIN_DEPARTED_ALIVE','FLAG_ISK_B_DVALIN_DEPARTED_ALIVE'].some(f=>yes(this.s.flags[f]));
 return cleared?'':'본편 또는 현장 도전에서 이 보스를 먼저 클리어해야 합니다.';
};
P.actionReason=function(type,a={}){
 if(type==='ENHANCE'){
  const inv=this.s.inventory.find(i=>i.slot===a.slot&&i.equip);if(inv&&!this.isMondEnhanceable(inv.equip))return this.row('16_EQUIP_DB',inv.equip)[35]||'이 장비는 강화할 수 없습니다.';
  return this.enhancementActionReason({...a,type});
 }
 if(type==='EQUIP_ASCEND')return this.enhancementActionReason({...a,type});
 if(type==='MOND_MATERIAL_CHALLENGE')return this.materialChallengeReason(a.boss);
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 let result;
 if(a.type==='ENHANCE'||a.type==='EQUIP_ASCEND')result=this.performEnhancement(a);
 else if(a.type==='MOND_MATERIAL_CHALLENGE'){
  const why=this.materialChallengeReason(a.boss);if(why)fail('MATERIAL_CHALLENGE',why);
  this.s.placeVisit=null;result=this.startBattle(CONFIG.bosses[a.boss].group,'MATERIAL_CHALLENGE:'+a.boss);
 }else result=old.apply.call(this,a);
 this.enhancementSync(this.s);return result;
};
P.startBattle=function(...a){this.enhancementSync(this.s);return old.startBattle.apply(this,a);};
P.finishBattle=function(victory){
 const battle=this.s.runtime,result=old.finishBattle.call(this,victory);
 if(battle&&result?.victory&&!battle.storyConfig?.noRewards&&battle.actors.some(a=>a.side==='ENEMY'&&CONFIG.bosses[a.source])){
  // Existing DB materials/quantities/chances only. Normal loot skips the legacy
  // conditional LT_BOSS_MAJOR rows, so settle them here once per real victory.
  const added={};for(const drop of this.rows('20_LOOT_TABLE').filter(r=>r[0]==='LT_BOSS_MAJOR'&&['TRPG_BOSS_ESSENCE','TRPG_BOSS_CORE'].includes(r[2]))){
   if((result.loot?.[drop[2]]||0)>0)continue;
   if(this.die(100)<=Number(drop[5])){const n=Number(drop[3])+Math.floor(this.random()*(Number(drop[4])-Number(drop[3])+1));this.giveItem(drop[2],n);added[drop[2]]=n;}
  }
  result.loot={...result.loot,...added};result.enhancementLootVersion=1;this.s.combatReceipts[battle.id]=copy(result);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(result);
  const log=this.s.log.findLast(r=>r.battleId===battle.id);if(log)Object.assign(log,copy(result));
 }
 this.enhancementSync(this.s);return result;
};
api.enhancementConfig=copy(CONFIG);
})(globalThis);

/* v0.13.6: one voluntary entrance per boss every 48 IN-GAME hours.
 * A won preliminary step is the same admission; a defeat/retry is a new one.
 * Mandatory story fights remain playable, but also start the material timer.
 * Only successful battle creation commits a timer, through the normal save transaction.
 */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,cfg=api.enhancementConfig.bosses,minutes=48*60;
const old=Object.fromEntries(['placeBossReason','bossRoute','continueBossRoute','materialChallengeReason','startBattle','validateSave','apply'].map(k=>[k,P[k]]));
const bossForRoute=id=>Object.keys(cfg).find(b=>cfg[b].route===id);
const fail=m=>{throw new api.RuleError('BOSS_COOLDOWN',m);};
P.bossClockMinutes=function(){
 const g=this.s.global,[h,m]=String(g.WORLD_TIME).split(':').map(Number);
 if(!Number.isSafeInteger(g.WORLD_DAY)||g.WORLD_DAY<1||!Number.isInteger(h)||h<0||h>23||!Number.isInteger(m)||m<0||m>59)fail('게임 내 날짜와 시간을 확인해 주세요.');
 return (g.WORLD_DAY-1)*1440+h*60+m;
};
P.bossAdmission=function(boss){
 const next=this.s.bossEntryCooldowns?.[boss]??0,remaining=Math.max(0,next-this.bossClockMinutes());
 const day=Math.floor(next/1440)+1,time=String(Math.floor(next%1440/60)).padStart(2,'0')+':'+String(next%60).padStart(2,'0');
 const hours=Math.floor(remaining/60),mins=remaining%60;
 return {boss,remainingMinutes:remaining,nextDay:day,nextTime:time,reason:remaining?
  '이 보스는 게임 내 이틀(48시간)에 한 번 입장할 수 있습니다. '+hours+'시간 '+mins+'분 남음 · '+day+'일차 '+time+'부터 입장 가능.':''};
};
P.recordBossAdmission=function(boss,at=this.bossClockMinutes()){
 if(!cfg[boss])return;
 this.s.bossEntryCooldowns??={};this.s.bossEntryCooldowns[boss]=at+minutes;
};
P.materialChallengeReason=function(boss){return old.materialChallengeReason.call(this,boss)||(cfg[boss]?this.bossAdmission(boss).reason:'');};
P.placeBossReason=function(id,entry,options={}){
 const base=old.placeBossReason.call(this,id,entry,options);if(base)return base;
 const boss=bossForRoute(id),sameAdmission=options.continuing&&this.s.bossRouteProgress?.phase==='AWAIT_NEXT';
 return boss&&!sameAdmission?this.bossAdmission(boss).reason:'';
};
P.bossRoute=function(id,...args){
 const boss=bossForRoute(id),why=boss?this.bossAdmission(boss).reason:'';if(why)fail(why);
 const at=this.bossClockMinutes(),before=this.s.runtime,result=old.bossRoute.call(this,id,...args);
 if(boss&&this.s.runtime&&this.s.runtime!==before)this.recordBossAdmission(boss,at);
 return result;
};
P.continueBossRoute=function(...args){
 const progress=this.s.bossRouteProgress,boss=bossForRoute(progress?.route),retry=progress?.phase==='RETRY';
 if(boss&&retry){const why=this.bossAdmission(boss).reason;if(why)fail(why);}
 const at=this.bossClockMinutes(),before=this.s.runtime,result=old.continueBossRoute.apply(this,args);
 if(boss&&retry&&this.s.runtime&&this.s.runtime!==before)this.recordBossAdmission(boss,at);
 return result;
};
P.startBattle=function(group,origin='EXPLICIT',...args){
 const material=String(origin).startsWith('MATERIAL_CHALLENGE:'),boss=material?String(origin).slice('MATERIAL_CHALLENGE:'.length):null;
 if(boss&&cfg[boss]){const why=this.bossAdmission(boss).reason;if(why)fail(why);}
 const at=this.bossClockMinutes(),before=this.s.runtime,result=old.startBattle.call(this,group,origin,...args);
 if(this.s.runtime&&this.s.runtime!==before){
  if(boss)this.recordBossAdmission(boss,at);
  // Story preparation is not an admission; only an actually-created boss battle is.
  if(String(origin).startsWith('STORY:'))for(const a of this.s.runtime.actors)if(a.side==='ENEMY'&&cfg[a.source])this.recordBossAdmission(a.source,at);
 }
 return result;
};
P.apply=function(a){
 // Story retry restores a pre-battle snapshot. Retain admission records rather than
 // silently clearing timers as a side effect of restoring that checkpoint.
 const keep=a.type==='STORY_RETRY'?{...this.s.bossEntryCooldowns}:null,result=old.apply.call(this,a);
 if(keep&&Object.keys(keep).length){this.s.bossEntryCooldowns??={};for(const [boss,next]of Object.entries(keep))this.s.bossEntryCooldowns[boss]=Math.max(next,this.s.bossEntryCooldowns[boss]||0);}
 return result;
};
P.validateSave=function(s){
 s=old.validateSave.call(this,s);const records=s.bossEntryCooldowns;
 if(records!==undefined&&(records===null||typeof records!=='object'||Array.isArray(records)||Object.entries(records).some(([boss,next])=>!Object.hasOwn(cfg,boss)||!Number.isSafeInteger(next)||next<0)))fail('보스 입장 대기 기록이 잘못되었습니다.');
 return s;
};
api.bossAdmissionPolicy={minutes,clock:'WORLD_DAY/WORLD_TIME',perBoss:true,countsDefeat:true,mandatoryStoryExempt:true};
})(globalThis);
