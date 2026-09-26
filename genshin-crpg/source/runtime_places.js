/* Place-scoped services. Load AFTER every runtime module (including flow/party).
 * Definitions and displayed names come only from 18/35/51 and existing recipes.
 * Public: PLACE_ENTER {place,mode?}, PLACE_LEAVE; existing BUY/CRAFT/ENHANCE/BOSS_*.
 */
(function(root){
 'use strict';
 const api=root.CRPGRuntime;if(!api)throw Error('CRPGRuntime is required');
 const P=api.Runtime.prototype;if(P.placeModuleVersion)return;
 const old=Object.fromEntries(['apply','actionReason','menu','stockReason','recipeFacilityReason','enhance','bossRoute','continueBossRoute','validateSave','view','storyEvent'].map(k=>[k,P[k]]));
 const copy=x=>JSON.parse(JSON.stringify(x)),fail=(code,message)=>{throw new api.RuleError(code,message);};
 const parse=x=>{try{return JSON.parse(x||'{}')}catch{return {}}};
 const truth=x=>x===true||x==='TRUE'||x==='Y';
 const list=x=>String(x||'').split(';').map(x=>x.trim()).filter(Boolean);
 const clean=x=>String(x||'').replace(/\(시스템\)/g,'').trim();
 const screenFor={SHOP:'SHOP',CRAFT:'CRAFT',TALK:'DIALOGUE',BOSS:'BOSS_INTRO'};
 const retainedScreens=new Set(['SYSTEM','SAVE','LOAD','SETTINGS','STATUS','INVENTORY','PARTY','QUEST','RELATIONS']);
 const clock=x=>/^([01]\d|2[0-3]):[0-5]\d$/.test(x||'')?Number(x.slice(0,2))*60+Number(x.slice(3)):-1;
 const openAt=(n,from,to)=>Number.isInteger(from)&&Number.isInteger(to)&&from>=0&&from<1440&&to>=0&&to<=1440&&from!==to&&n>=0&&(from<to?n>=from&&n<to:n>=from||n<to);
 P.placeCatalog=function(){
  if(this._placeCatalog)return this._placeCatalog;
  const schedules=this.rows('51_EVENT_DB').filter(r=>r[1]==='NPC_SCHEDULE'&&truth(r[11])).map(r=>({id:r[0],data:parse(r[13])}));
  const entries=[];
  for(const {id,data:s}of schedules){
   if(!s.entity_id||!Array.isArray(s.map_ids)||!s.label)continue;
   const m=s.merchant_id?this.tables['18_MERCHANT_DB'].get(s.merchant_id):null;
   if(s.merchant_id&&!m)continue;
   const entry={id,kind:'FACILITY',entity:s.entity_id,merchant:m?.[0]||null,name:s.label,facility:s.facility||m?.[3]||'',maps:s.map_ids.filter(id=>this.tables['32_MAP_DB'].has(id)),from:Number(s.from_minute),to:Number(s.to_minute),merchantMaps:m?list(m[10]):null,merchantFrom:m?Number(m[12]):null,merchantTo:m?Number(m[13]):null,merchantType:m?.[5]||'',merchantName:m?.[1]||'',modes:[]};
   if(m&&this.rows('19_SHOP_STOCK_DB').some(r=>r[1]===m[0]))entry.modes.push('SHOP');
   // A work facility is advertised only if an actual recipe or enhancement uses it.
   if(this.placeCanEnhance(entry)||this.rows('17_RECIPE_DB').some(r=>r[0]&&!this.placeRecipeFacilityReason(this.recipeDefinition(r[0]),entry,entry.maps[0])))entry.modes.push('CRAFT');
   if(!entry.modes.length)entry.modes.push('TALK');
   entries.push(entry);
  }
  for(const r of this.rows('35_BOSS_ROUTE_DB'))if(r[0]!=='BRT_DVALIN'&&this.tables['32_MAP_DB'].has(r[2]))entries.push({id:'BOSS:'+r[0],kind:'BOSS',route:r[0],name:r[1],facility:this.row('32_MAP_DB',r[2])[2],maps:[r[2]],modes:['BOSS']});
  this._placeCatalog=entries;return entries;
 };
 // Keep legacy IDs and stock receipts, while presenting one Mondstadt smith.
 P.placeMergedInto=function(entry,map=this.s?.global?.CURRENT_MAP_ID){return entry?.merchant==='MRC_BLACKSMITH_COMMON'&&map==='MAP_MOND_CITY'?'EVT_SCHEDULE_MRC_MOND_EQUIP':null;};
 P.placeStockMerchants=function(entry){return entry?.merchant==='MRC_MOND_EQUIP'?[entry.merchant,'MRC_BLACKSMITH_COMMON']:[entry?.merchant];};
 P.placeHasFacility=function(entry,token){
  token=String(token||'').trim();if(!entry||entry.kind!=='FACILITY'||!token)return false;
  if(token.startsWith('MRC_'))return this.placeStockMerchants(entry).includes(token);
  if(['조리시설','모닥불'].includes(token))return String(entry.facility).split('/').includes(token);
  if(['연금 시설','연금대'].includes(token))return /연금/.test(entry.facility+' '+entry.merchantType);
  if(token==='대장간')return this.placeCanEnhance(entry);
  return [entry.facility,entry.name,entry.merchantName,...String(entry.facility).split('/')].some(x=>clean(x)===token);
 };
 P.placeCanEnhance=function(entry){return !!entry&&entry.kind==='FACILITY'&&(/대장간|대장장이/.test(entry.facility+' '+entry.name+' '+entry.merchantType)||entry.merchant==='MRC_BLACKSMITH_COMMON'||/^MRC_[A-Z0-9]+_EQUIP$/.test(entry.merchant||''));};
 P.placeRecipeFacilityReason=function(row,entry,mapId){
  if(!entry||entry.kind!=='FACILITY')return '먼저 이곳의 제작시설에 들어가 주세요.';
  const requirement=String(row[17]||'').trim();
  if(!requirement||!requirement.split('+').every(and=>and.trim().split(/\s+또는\s+|\//).some(token=>this.placeHasFacility(entry,token))))return requirement.includes('+')?'이 제작법에는 여러 시설의 공동 작업이 필요합니다.':'현재 들어온 시설에서 만들 수 없는 제작법입니다.';
  const map=this.tables['32_MAP_DB'].get(mapId);if(!map)return '제작 장소를 확인할 수 없습니다.';
  const places=String(row[16]||'').split('/').map(x=>x.trim());
  if(!places.some(place=>[map[2],entry.facility].includes(place)||this.placeHasFacility(entry,place)||/시설|작업대|대장간|모닥불|연금대/.test(place)&&requirement.split(/\s+또는\s+|\+|\//).some(token=>this.placeHasFacility(entry,token))))return '제작법이 지정한 장소에서만 제작할 수 있습니다.';
  return '';
 };
 P.placeAvailability=function(entry,state=this.s){
  if(!entry)return '현재 입장할 수 있는 장소가 아닙니다.';
  const g=state.global;if(!entry.maps.includes(g.CURRENT_MAP_ID))return '현재 지도에 있는 장소에서 들어가 주세요.';
  if(entry.kind==='FACILITY'){
   const time=clock(g.WORLD_TIME);if(!openAt(time,entry.from,entry.to))return '지금은 문을 닫았습니다.';
   if(entry.merchant&&(!entry.merchantMaps.includes(g.CURRENT_MAP_ID)||!openAt(time,entry.merchantFrom,entry.merchantTo)))return '현재 장소·시간에 이용할 수 없습니다.';
  }
  return '';
 };
 P.placeEntryReason=function(id,mode){
  const entry=this.placeCatalog().find(x=>x.id===id),policy=old.actionReason.call(this,'PLACE_ENTER',{place:id,mode});if(policy)return policy;
  if(this.placeMergedInto(entry))return '바그너의 대장간에서 구매·제작·강화를 이용해 주세요.';
  const reason=this.placeAvailability(entry);if(reason)return reason;
  if(mode&&!entry.modes.includes(mode))return '이 장소에는 선택한 서비스가 없습니다.';
  if(entry.kind==='BOSS')return this.placeBossReason(entry.route);
  return '';
 };
 P.placeEntries=function(){return this.placeCatalog().filter(x=>x.maps.includes(this.s.global.CURRENT_MAP_ID)&&!this.placeMergedInto(x)).map(x=>({...copy(x),open:!this.placeAvailability(x),reason:this.placeEntryReason(x.id)}));};
 P.placeVisitReason=function(mode,state=this.s){
  const v=state.placeVisit;if(!v)return '장소 화면에서 먼저 들어가기를 선택해 주세요.';
  const entry=this.placeCatalog().find(x=>x.id===v.place);
  if(this.placeMergedInto(entry,state.global.CURRENT_MAP_ID))return '바그너의 대장간에 다시 들어가 주세요.';
  if(v.saveId!==state.global.SAVE_ID||v.route!==state.global.STORY_ROUTE_ID||v.map!==state.global.CURRENT_MAP_ID)return '이전에 방문한 장소입니다. 현재 장소에서 다시 들어가 주세요.';
  const reason=this.placeAvailability(entry,state);if(reason)return reason;
  if(!entry.modes.includes(v.mode)||mode&&v.mode!==mode)return '현재 들어온 장소의 해당 서비스를 선택해 주세요.';
  return '';
 };
 P.currentPlace=function(){const v=this.s.placeVisit;if(!v)return null;const entry=this.placeCatalog().find(x=>x.id===v.place);return {...copy(v),entry:entry?copy(entry):null,reason:this.placeVisitReason(),valid:!this.placeVisitReason()};};
 P.enterPlace=function(id,mode){
  const entry=this.placeCatalog().find(x=>x.id===id),reason=this.placeEntryReason(id,mode);if(reason)fail('PLACE_ENTRY',reason);
  mode=mode||entry.modes[0];const g=this.s.global;if(entry.entity)this.interact(entry.entity);
  this.s.placeVisit={schema:1,place:id,kind:entry.kind,mode,map:g.CURRENT_MAP_ID,entity:entry.entity||null,merchant:entry.merchant||null,saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,enteredDay:g.WORLD_DAY,enteredTime:g.WORLD_TIME,enteredAction:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)};
  if(entry.entity)g.CURRENT_NPC_ENTITY_ID=entry.entity;g.SCREEN_MODE=screenFor[mode];return {place:id,mode,name:entry.name};
 };
 P.leavePlace=function(){this.s.placeVisit=null;this.s.global.SCREEN_MODE='LOCATION';return {left:true,map:this.s.global.CURRENT_MAP_ID};};
 P.placeStocks=function(){const v=this.currentPlace();if(!v?.valid||v.mode!=='SHOP')return [];return this.rows('19_SHOP_STOCK_DB').filter(r=>this.placeStockMerchants(v.entry).includes(r[1])).map(row=>({row,remaining:this.stockRemaining(row),reason:this.stockReason(row)}));};
 P.placeRecipes=function(){const v=this.currentPlace();if(!v?.valid||v.mode!=='CRAFT')return [];return this.rows('17_RECIPE_DB').filter(r=>!this.placeRecipeFacilityReason(this.recipeDefinition(r[0]),v.entry,this.s.global.CURRENT_MAP_ID)).map(row=>({row:this.recipeDefinition(row[0]),reason:this.craftReason(row)}));};
 P.placeEnhanceReason=function(){const reason=this.placeVisitReason('CRAFT');if(reason)return reason;return this.placeCanEnhance(this.currentPlace().entry)?'':'강화할 수 있는 대장간에 들어가 주세요.';};
 P.placeBossReason=function(id,entry,{continuing=false}={}){
  if(id==='BRT_DVALIN'&&!continuing)return '이야기 진행 중 해당 장소에서 시작하는 전투입니다.';
  const row=this.tables['35_BOSS_ROUTE_DB'].get(id);if(!row||row[2]!==this.s.global.CURRENT_MAP_ID)return '현재 지도에는 이 도전의 입구가 없습니다.';
  if(row[12]&&!truth(this.s.flags[row[12]]))return '보스 진입 조건을 충족하지 않았습니다.';
  if(!continuing&&row[14]==='N'&&row[13]&&truth(this.s.flags[row[13]]))return '이미 완료한 도전입니다.';
  if(entry&&!['DIRECT','GAUNTLET'].includes(entry))return '진입 방식을 선택해 주세요.';
  if(entry==='DIRECT'&&(row[8]!=='Y'||row[9]==='Y'||row[3]==='GAUNTLET')||entry==='GAUNTLET'&&row[3]==='DIRECT')return '이 도전에서 허용하는 진입 방식을 선택해 주세요.';
  try{for(const step of this.bossSteps(id))for(const member of this.rows('49_ENCOUNTER_MEMBER_DB').filter(r=>r[1]===step[4])){const monster=this.row('09_MONSTER_DB',member[3]);if(monster[3]==='보스'&&!['BOSS_DVALIN','BOSS_ANDRIUS','BOSS_AZHDAHA'].includes(monster[0]))return '이 도전의 전투 실행을 준비 중입니다.';for(const c of this.rows('12_ENEMY_CARD_DB').filter(r=>r[1]===monster[0]&&r[35]==='READY'))if(this.cardSupport(this.cardDefinition(c,true)))return '이 도전의 전투 실행을 준비 중입니다.';}}catch{return '이 도전의 전투 정의를 확인해야 합니다.';}
  return '';
 };
 P.placeBossEntries=function(){return this.placeEntries().filter(x=>x.kind==='BOSS').map(x=>({...x,entries:['DIRECT','GAUNTLET'].map(entry=>({entry,reason:this.placeBossReason(x.route,entry)}))}));};
 // Saved in-progress routes are continuations, never a new replay entrance.
 P.placeBossContinuation=function(){
  const p=this.s.bossRouteProgress;if(!p||!['AWAIT_NEXT','RETRY'].includes(p.phase))return null;
  const row=this.tables['35_BOSS_ROUTE_DB'].get(p.route);if(!row)return null;
  const policy=old.actionReason.call(this,'BOSS_CONTINUE',{}),reason=policy||this.placeBossReason(p.route,undefined,{continuing:true});
  return {route:p.route,name:row[1],map:row[2],phase:p.phase,step:p.step,legacy:!p.placeEntrySchema||p.route==='BRT_DVALIN',reason};
 };
 P.actionReason=function(type,a={}){
  const base=old.actionReason.call(this,type,a);if(base)return base;
  if(type==='PLACE_ENTER')return this.placeEntryReason(a.place||a.id,a.mode);
  if(type==='PLACE_LEAVE')return this.s.placeVisit?'':'현재 방문한 시설이 없습니다.';
  if(type==='MENU'&&['SHOP','CRAFT','DIALOGUE','BOSS_INTRO'].includes(a.screen))return this.placeVisitReason(a.screen==='BOSS_INTRO'?'BOSS':a.screen==='DIALOGUE'?'TALK':a.screen);
  if(type==='BUY'){
   const reason=this.placeVisitReason('SHOP');if(reason)return reason;
   if(this.s.global.SCREEN_MODE!=='SHOP')return '들어온 상점 화면에서 상품을 선택해 주세요.';
   const row=this.tables['19_SHOP_STOCK_DB'].get(a.stock);return row&&this.placeStockMerchants(this.currentPlace().entry).includes(row[1])?'':'현재 들어온 상점의 상품만 구매할 수 있습니다.';
  }
  if(type==='CRAFT'||type==='ENHANCE'){
   const reason=this.placeVisitReason('CRAFT');if(reason)return reason;
   if(this.s.global.SCREEN_MODE!=='CRAFT')return '들어온 제작시설 화면에서 작업을 선택해 주세요.';
   if(type==='ENHANCE')return this.placeEnhanceReason();
   const row=this.tables['17_RECIPE_DB'].get(a.recipe);return row?this.placeRecipeFacilityReason(this.recipeDefinition(row[0]),this.currentPlace().entry,this.s.global.CURRENT_MAP_ID):'현재 시설의 제작법을 선택해 주세요.';
  }
  if(type==='BOSS_ROUTE'||type==='BOSS_CONTINUE'){
   const id=type==='BOSS_ROUTE'?a.route:this.s.bossRouteProgress?.route,continuing=type==='BOSS_CONTINUE';
   const bossReason=this.placeBossReason(id,type==='BOSS_ROUTE'?(a.entry||'DIRECT'):undefined,{continuing});if(bossReason)return bossReason;
   const continuation=continuing?this.placeBossContinuation():null;
   if(continuation?.legacy)return continuation.reason;
   const reason=this.placeVisitReason('BOSS');if(reason)return reason;
   if(this.s.placeVisit.place!=='BOSS:'+id)return '현재 들어온 도전 입구에서 시작해 주세요.';
   return '';
  }
  return '';
 };
 P.apply=function(a){
  if(a.type==='PLACE_ENTER')return this.enterPlace(a.place||a.id,a.mode);
  if(a.type==='PLACE_LEAVE')return this.leavePlace();
  const result=old.apply.call(this,a);
  if(this.s.placeVisit){
   const departed=a.type==='MOVE'||a.type==='NPC'||a.type==='BOSS_LEAVE'||a.type==='MENU'&&!retainedScreens.has(a.screen)&&!['SHOP','CRAFT','DIALOGUE','BOSS_INTRO'].includes(a.screen);
   const battle=this.s.runtime,keepBoss=battle?.origin==='BOSS:'+this.placeCatalog().find(x=>x.id===this.s.placeVisit.place)?.route;
   if(departed||this.placeVisitReason()||this.playPhase()!=='FREE'&&!keepBoss){this.s.placeVisit=null;if(['SHOP','CRAFT','BOSS_INTRO','DIALOGUE'].includes(this.s.global.SCREEN_MODE)&&this.playPhase()==='FREE')this.s.global.SCREEN_MODE='LOCATION';}
  }
  return result;
 };
 // Internal method guards prevent integrations from accidentally widening a service scope.
 P.stockReason=function(row,qty=1){
  if(this._placeAuthoredPurchase?.has(row[0]))return old.stockReason.call(this,row,qty);
  const reason=this.placeVisitReason('SHOP');if(reason)return reason;const v=this.currentPlace();if(!this.placeStockMerchants(v.entry).includes(row[1]))return '현재 들어온 상점의 상품만 구매할 수 있습니다.';
  const condition=String(row[8]||'').trim(),level=/^LEVEL>=(\d+)(?:\s*\/\s*(연금 시설 접근))?$/.exec(condition);
  if(level&&this.s.global.PLAYER_LEVEL_STATE<Number(level[1]))return '레벨 '+level[1]+' 이상부터 구매할 수 있습니다. 현재 Lv. '+this.s.global.PLAYER_LEVEL_STATE;
  const access=level?.[2]||condition;
  if(['연금 시설 접근','연금/의료 시설 접근','스네즈나야성 진입','해당 NPC 접근'].includes(access)){
   if(access.includes('연금')&&v.merchant!=='MRC_ALCHEMY_COMMON')return '연금·의료 보급소에서 구매할 수 있습니다.';
   if(access==='스네즈나야성 진입'&&this.s.global.CURRENT_MAP_ID!=='MAP_SNEZ_CITY')return '해당 도시의 상점에서 구매할 수 있습니다.';
   if(!v.entity||v.entity!==v.entry.entity||!v.entry.maps.includes(this.s.global.CURRENT_MAP_ID))return '이 상인에게 직접 방문해 주세요.';
   const normalized=[...row];normalized[8]='없음';return old.stockReason.call(this,normalized,qty);
  }
  return old.stockReason.call(this,row,qty);
 };
 P.recipeFacilityReason=function(row){const reason=this.placeVisitReason('CRAFT');if(reason)return reason;return this.placeRecipeFacilityReason(row,this.currentPlace().entry,this.s.global.CURRENT_MAP_ID);};
 P.enhance=function(slot){const reason=this.placeEnhanceReason();if(reason)fail('PLACE_FACILITY',reason);return old.enhance.call(this,slot);};
 P.bossRoute=function(id,entry='DIRECT'){const reason=this.actionReason('BOSS_ROUTE',{route:id,entry});if(reason)fail('PLACE_BOSS',reason);const result=old.bossRoute.call(this,id,entry);if(this.s.bossRouteProgress)this.s.bossRouteProgress.placeEntrySchema=1;return result;};
 P.continueBossRoute=function(){const reason=this.actionReason('BOSS_CONTINUE');if(reason)fail('PLACE_BOSS',reason);return old.continueBossRoute.call(this);};
 // This existing tutorial purchases its exact quoted stock inside authored effects.
 // It does not grant public BUY access or persist a service visit.
 P.storyEvent=function(id){
  const node=this.storyNode();
  if(id==='EVT_ISK_STARTER_KIT'&&this.s.global.STORY_ROUTE_ID==='ROUTE_ISEKAI'&&String(node?.[12]||'').split(';').map(x=>x.trim()).includes('EVENT:'+id)){
   const prior=this._placeAuthoredPurchase;this._placeAuthoredPurchase=new Set((this.quote().stock||[]).map(x=>x.id));
   try{return old.storyEvent.call(this,id);}finally{this._placeAuthoredPurchase=prior;}
  }
  return old.storyEvent.call(this,id);
 };
 P.validateSave=function(s){
  old.validateSave.call(this,s);if(s.placeVisit?.place==='BOSS:BRT_DVALIN'&&s.bossRouteProgress?.route==='BRT_DVALIN'&&['IN_BATTLE','AWAIT_NEXT','RETRY'].includes(s.bossRouteProgress.phase))s.placeVisit=null;let v=s.placeVisit;if(!v)return s;
  const entry=this.placeCatalog().find(x=>x.id===v.place);
  // Sara's old TALK visit becomes her existing restaurant entrance.
  if(v.place==='EVT_SCHEDULE_NPC_MOND_SARA'&&v.mode==='TALK'&&v.entity==='NPC_MOND_SARA'&&v.merchant===null&&entry?.merchant==='MRC_MOND_RESTAURANT'){v.mode='SHOP';v.merchant=entry.merchant;if(s.global.SCREEN_MODE==='DIALOGUE')s.global.SCREEN_MODE='SHOP';}
  if(v.schema!==1||!entry||v.kind!==entry.kind||!entry.modes.includes(v.mode)||v.merchant!==(entry.merchant||null)||v.entity!==(entry.entity||null)||v.saveId!==s.global.SAVE_ID||v.route!==s.global.STORY_ROUTE_ID||v.map!==s.global.CURRENT_MAP_ID||!Number.isSafeInteger(v.enteredDay)||v.enteredDay<1||clock(v.enteredTime)<0)fail('PLACE_SAVE','저장된 방문 장소가 현재 여정과 일치하지 않습니다.');
  const merged=this.placeMergedInto(entry,s.global.CURRENT_MAP_ID);
  if(merged){const target=this.placeCatalog().find(x=>x.id===merged);if(target&&!this.placeAvailability(target,s)&&target.modes.includes(v.mode)){Object.assign(v,{place:target.id,entity:target.entity,merchant:target.merchant});}else{s.placeVisit=null;if(['SHOP','CRAFT'].includes(s.global.SCREEN_MODE))s.global.SCREEN_MODE='LOCATION';}return s;}
  // Old/stale operating-hour visits lose permission without rejecting the rest of a save.
  if(this.placeAvailability(entry,s)){s.placeVisit=null;if(['SHOP','CRAFT','BOSS_INTRO','DIALOGUE'].includes(s.global.SCREEN_MODE))s.global.SCREEN_MODE='LOCATION';}
  return s;
 };
 P.view=function(){const result=old.view.call(this);result.places=this.placeEntries();result.place=this.currentPlace();result.stocks=this.placeStocks();return result;};
 P.placeModuleVersion=1;api.placesVersion=1;
})(globalThis);
