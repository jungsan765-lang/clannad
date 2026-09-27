/* Liyue Harbor districts and Wangshu Inn take separate service roles instead of one crowded centre.
 * Services stay DB rows (18/19/51) like every other facility, and every existing place ID is kept:
 * only where an introduction or service stands changes. Load after the place, recruitment and area modules.
 */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.placeModuleVersion||P.liyuePlacesVersion)return;
const old=Object.fromEntries(['installMarketContent','placeCatalog','placeRecipeFacilityReason','legendContactAllowed','actionReason','validateSave'].map(k=>[k,P[k]]));
const HUB='MAP_LIYUE_HARBOR',WANGSHU='MAP_LY_DETAIL_WANGSHU';
const CITY=['MAP_LY_DETAIL_FEIYUN','MAP_LY_DETAIL_YUJING','MAP_LY_DETAIL_CHIHU','MAP_LY_DETAIL_WHARF','MAP_LY_DETAIL_NORTH_GATE'],CITY_SET=new Set(CITY);
const WANGSHU_INN='EVT_CRPG_LIYUE_WANGSHU_INN',WANGSHU_DINING='EVT_CRPG_LIYUE_WANGSHU_DINING';
// Introduction places keep their IDs, TALK form and owners; they stand in their own district now.
const MOVED={
 EVT_CRPG_LIYUE_FEIYUN:['MAP_LY_DETAIL_FEIYUN'],EVT_CRPG_LIYUE_NORTHLAND:['MAP_LY_DETAIL_FEIYUN'],
 EVT_CRPG_LIYUE_YUJING:['MAP_LY_DETAIL_YUJING'],
 EVT_CRPG_LIYUE_HEYU:['MAP_LY_DETAIL_CHIHU'],EVT_CRPG_LIYUE_YANSHANG:['MAP_LY_DETAIL_CHIHU'],
 EVT_CRPG_LIYUE_DOCKS:['MAP_LY_DETAIL_WHARF'],
 EVT_CRPG_LIYUE_WANGSHENG:['MAP_LY_DETAIL_NORTH_GATE'],EVT_CRPG_LIYUE_ARTISAN:['MAP_LY_DETAIL_NORTH_GATE','MAP_CHENYU_QIAOYING']
};
// These two introduction places become the actual restaurant and pharmacy, so an old TALK visit is stale.
const BECAME_SERVICE=new Set(['EVT_CRPG_LIYUE_WANMIN','EVT_CRPG_LIYUE_BUBU']);
const schedule=(id,context,entity,payload,note)=>[id,'NPC_SCHEDULE','51_EVENT_DB','SELF',context,'MAP_AND_TIME_WINDOW','DISPLAY_SERVICE_ENTITY',entity,'WHILE_OPEN','24.NPC_VISITS_JSON',30,'Y',note,JSON.stringify({kind:'schedule',entity_id:entity,basis:'CRPG_DESIGN',...payload}),'CRPG_LIYUE_PLACES_V1'];
const SCHEDULES=[
 schedule('EVT_CRPG_LIYUE_WANMIN','MAP_LY_DETAIL_CHIHU','SERVICE_LIYUE_WANMIN',{label:'만민당',merchant_id:'MRC_LIYUE_WANMIN',map_ids:['MAP_LY_DETAIL_CHIHU'],from_minute:360,to_minute:1440,facility:'만민당'},'흘호암 식당. 완성 음식 판매와 동료 소개. 재고·가격·영업시간은 CRPG 설계.'),
 schedule('EVT_CRPG_LIYUE_BUBU','MAP_LY_DETAIL_FEIYUN','SERVICE_LIYUE_BUBU',{label:'불복려',merchant_id:'MRC_ALCHEMY_COMMON',map_ids:['MAP_LY_DETAIL_FEIYUN'],from_minute:0,to_minute:1440,facility:'불복려/연금 시설/의료 보급소'},'비운 언덕 약방. 리월의 연금·약제 보급처와 동료 소개.'),
 schedule(WANGSHU_INN,WANGSHU,'SERVICE_LIYUE_WANGSHU_INN',{label:'망서 객잔 · 객실',merchant_id:'MRC_LIYUE_WANGSHU_INN',map_ids:[WANGSHU],from_minute:0,to_minute:1440,facility:'망서 객잔'},'벽수원 길목의 객잔 숙박. 숙박비는 CRPG 설계.'),
 schedule(WANGSHU_DINING,WANGSHU,'SERVICE_LIYUE_WANGSHU_DINING',{label:'망서 객잔 · 식당',merchant_id:'MRC_LIYUE_WANGSHU_DINING',map_ids:[WANGSHU],from_minute:360,to_minute:1320,facility:'망서 객잔'},'객잔 식당. 재고·가격·영업시간은 CRPG 설계.')
];
// Relocated system services keep entity, merchant and label; only the map changes.
const RELOCATE={EVT_SCHEDULE_SERVICE_LIYUE_COOK:['MAP_LY_DETAIL_CHIHU'],EVT_SCHEDULE_SERVICE_LIYUE_SUPPLY:['MAP_LY_DETAIL_WHARF']};
const merchant=(id,name,place,entity,type,nature,restock,condition,map,from,to)=>[id,name,'리월',place,entity,type,nature,restock,condition,'CRPG 편의 서비스. 공식 판매 목록·가격 주장 아님.',map,'CANON_PLACE_SERVICE',from,to,'CRPG_DESIGN',''];
const MERCHANTS=[
 merchant('MRC_LIYUE_WANMIN','만민당','흘호암','SERVICE_LIYUE_WANMIN','음식','완성 음식 판매','매일','없음','MAP_LY_DETAIL_CHIHU',360,1440),
 merchant('MRC_LIYUE_WANGSHU_INN','망서 객잔 · 객실','망서 객잔','SERVICE_LIYUE_WANGSHU_INN','여관','8시간 숙박·활성 파티 완전 회복','상시','전투 중 아님',WANGSHU,0,1440),
 merchant('MRC_LIYUE_WANGSHU_DINING','망서 객잔 · 식당','망서 객잔','SERVICE_LIYUE_WANGSHU_DINING','음식','완성 음식 판매','매일','없음',WANGSHU,360,1320)
];
// Prices follow the Mond restaurant: roughly two thirds of the item's list price.
const STOCKS=[
 ['STK_LY_WANMIN_EGG','MRC_LIYUE_WANMIN','ITEM','FOOD_TEA_BREAK_PANCAKE','티바트 달걀 프라이',35,10,'매일','없음','만민당 편의 재고'],
 ['STK_LY_WANMIN_MATSUTAKE','MRC_LIYUE_WANMIN','ITEM','FOOD_MATSUTAKE_ROLL','송이버섯 고기말이',120,8,'매일','없음','만민당 편의 재고'],
 ['STK_LY_WANMIN_PEACE','MRC_LIYUE_WANMIN','ITEM','FOOD_UNIVERSAL_PEACE','세계 평화',180,5,'매일','없음','만민당 편의 재고'],
 ['STK_LY_WANMIN_JADE','MRC_LIYUE_WANMIN','ITEM','FOOD_JADE_PARCELS','비옥야채쌈',240,4,'매일','없음','만민당 편의 재고'],
 ['STK_INN_LIYUE_WANGSHU','MRC_LIYUE_WANGSHU_INN','SERVICE','SERVICE_INN_REST_8H','8시간 숙박',150,'상시','상시','전투 중 아님','활성 파티 전체 기준.'],
 ['STK_LY_WANGSHU_EGG','MRC_LIYUE_WANGSHU_DINING','ITEM','FOOD_TEA_BREAK_PANCAKE','티바트 달걀 프라이',35,10,'매일','없음','객잔 편의 재고'],
 ['STK_LY_WANGSHU_STEW','MRC_LIYUE_WANGSHU_DINING','ITEM','FOOD_SWEET_MADAME','달콤달콤 닭고기 스튜',80,8,'매일','없음','객잔 편의 재고'],
 ['STK_LY_WANGSHU_ADEPTUS','MRC_LIYUE_WANGSHU_DINING','ITEM','FOOD_ADEPTUS_TEMPTATION','선도장',600,1,'매일','없음','객잔 편의 재고. 하루 한 접시.']
];
// Who to visit for what. Places are read from the live catalogue, not repeated here.
const DISTRICTS=[
 [HUB,'여정 정비','모험가 길드 의뢰, 잡화·장비 구입, 장비 제작·강화, 숙박'],
 ['MAP_LY_DETAIL_FEIYUN','상점가·약방','불복려의 회복약과 연금 제작, 상회와 은행 사람들의 소개'],
 ['MAP_LY_DETAIL_YUJING','칠성의 대','칠성과 선인에 얽힌 인물 소개'],
 ['MAP_LY_DETAIL_CHIHU','식사·찻집','만민당 식사, 공용 조리시설, 다관과 찻집의 소개'],
 ['MAP_LY_DETAIL_WHARF','항만','보급 창구와 선원 소개, 고운각 배편, 방파제 낚시터'],
 ['MAP_LY_DETAIL_NORTH_GATE','외곽 길목','왕생당과 공예 작업장, 천형산·귀리 평원 방면 출발'],
 [WANGSHU,'길목의 객잔','숙박과 식사, 객잔에 머무는 선인의 소개']
];
const clean=x=>String(x||'').replace(/\(시스템\)/g,'').trim();
const owner=(r,d)=>d&&(r.tables['04_CHAR_DB'].get(d.PROFILE_ID)?.[1]||d.CHAR_ID||d.CHARACTER_ID);
P.installLiyuePlaces=function(){
 if(this._liyuePlacesInstalled)return;
 this.db={...this.db};
 const set=(key,rows)=>{this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).filter(r=>r&&r[0]).map(r=>[r[0],r]));};
 const events=this.db['51_EVENT_DB'].map(r=>r.slice()),parse=x=>{try{return JSON.parse(x||'{}');}catch{return null;}};
 for(const row of events){
  if(!row||row[1]!=='NPC_SCHEDULE')continue;
  const data=parse(row[13]);if(!data)continue;
  if(RELOCATE[row[0]]){data.map_ids=RELOCATE[row[0]].slice();row[4]=data.map_ids[0];row[13]=JSON.stringify(data);}
  // The shared alchemy counter in Liyue Harbor moves into Bubu Pharmacy; other cities keep theirs.
  if(row[0]==='EVT_SCHEDULE_MRC_ALCHEMY_COMMON'&&data.map_ids?.includes(HUB)){data.map_ids=data.map_ids.filter(m=>m!==HUB);row[13]=JSON.stringify(data);}
 }
 for(const row of SCHEDULES)if(!events.some(r=>r&&r[0]===row[0]))events.push(row.slice());
 set('51_EVENT_DB',events);
 const merchants=this.db['18_MERCHANT_DB'].map(r=>r.slice()),alchemy=merchants.find(r=>r&&r[0]==='MRC_ALCHEMY_COMMON');
 if(alchemy&&String(alchemy[10]).split(';').includes(HUB))alchemy[10]=String(alchemy[10]).split(';').map(m=>m===HUB?'MAP_LY_DETAIL_FEIYUN':m).join(';');
 for(const row of MERCHANTS)if(!merchants.some(r=>r&&r[0]===row[0]))merchants.push(row.slice());
 set('18_MERCHANT_DB',merchants);
 const stocks=this.db['19_SHOP_STOCK_DB'].map(r=>r.slice());
 for(const row of STOCKS)if(this.tables['14_ITEM_DB'].has(row[3])||row[2]==='SERVICE')if(!stocks.some(r=>r&&r[0]===row[0]))stocks.push(row.slice());
 set('19_SHOP_STOCK_DB',stocks);
 this._placeCatalog=null;this._liyuePlacesInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installLiyuePlaces();return out;};
P.placeCatalog=function(){
 const list=old.placeCatalog.call(this);
 for(const entry of list)if(MOVED[entry.id]&&entry.maps.join()!==MOVED[entry.id].join())entry.maps=MOVED[entry.id].slice();
 return list;
};
// The districts are part of Liyue Harbor: a recipe that names 리월항 may use a district facility.
P.placeRecipeFacilityReason=function(row,entry,map){
 const reason=old.placeRecipeFacilityReason.call(this,row,entry,map);
 if(!reason||!CITY_SET.has(map)||!String(row?.[16]||'').split('/').map(x=>x.trim()).includes('리월항'))return reason;
 return old.placeRecipeFacilityReason.call(this,row,entry,HUB)?reason:'';
};
// Xiao also hears requests at Wangshu Inn, besides the original Jueyun path.
P.legendContactAllowed=function(d,place=this.currentPlace()){
 if(d?.kind==='LEGEND'&&place?.valid&&place.place===WANGSHU_INN&&owner(this,d)==='LIYUE_XIAO')return true;
 return old.legendContactAllowed.call(this,d,place);
};
P.liyueIntroductionPlace=function(id){return !!(this.liyueRecruitContactPlace?.(id)||id===WANGSHU_INN);};
P.liyueDistrictRole=function(map=this.s?.global?.CURRENT_MAP_ID){const d=DISTRICTS.find(x=>x[0]===map);return d?{map:d[0],role:d[1],text:d[2]}:null;};
P.liyuePlaceRole=function(e){
 if(e.merchant&&this.rows('19_SHOP_STOCK_DB').some(r=>r[1]===e.merchant&&r[3]==='SERVICE_INN_REST_8H'))return '숙박';
 if(e.entity==='NPC_LIYUE_KATHERYNE')return '의뢰';
 if(e.merchantType==='음식')return '식사';
 if(String(e.facility).split('/').includes('조리시설'))return '조리';
 if(/연금/.test(e.facility+' '+e.merchantType))return '약·연금';
 if(this.placeCanEnhance(e))return '장비·강화';
 if(/보급/.test(e.facility))return '보급';
 return e.modes.includes('SHOP')?'상점':e.modes.includes('CRAFT')?'제작':'';
};
P.liyueCityDirectory=function(){
 const current=this.s?.global?.CURRENT_MAP_ID,catalog=this.placeCatalog();
 return DISTRICTS.filter(([map])=>this.tables['32_MAP_DB'].has(map)).map(([map,role,text])=>({
  map,name:this.row('32_MAP_DB',map)[2],role,text,here:map===current,
  places:catalog.filter(e=>e.kind==='FACILITY'&&e.maps.includes(map)&&!this.placeMergedInto(e,map)).map(e=>({id:e.id,name:clean(e.name),modes:e.modes.slice(),role:this.liyuePlaceRole(e),introduction:this.liyueIntroductionPlace(e.id)}))
 }));
};
// The Isekai harbor restriction covers the harbor's districts exactly as it covers the centre.
P.actionReason=function(type,a={}){
 const reason=old.actionReason.call(this,type,a);if(reason)return reason;
 const s=this.s,g=s?.global,l=s?.liyue;
 if(g&&CITY_SET.has(g.CURRENT_MAP_ID)&&g.STORY_ROUTE_ID==='ROUTE_ISEKAI'&&l?.activeQuest&&!l.regionReceipt){
  const between=this.storyDone(l.activeQuest),pass=between&&(type==='LEGEND_REGISTER'||type==='PLACE_ENTER'&&this.liyueRecruitContactPlace?.(a.place));
  const facility=['PLACE_ENTER','NPC','BUY','SELL','CRAFT','COMMISSION_ACCEPT'].includes(type);
  if(!pass&&((facility&&!this.liyueHarborFacilitiesOpen?.())||type==='LEGEND_REGISTER'))return '현재는 허가된 본편 구역에서만 활동할 수 있습니다.';
 }
 return '';
};
P.validateSave=function(s){
 const v=s?.placeVisit;
 // A visit saved inside the old talk-only Wanmin/Bubu entrance cannot become a shop visit.
 if(v&&BECAME_SERVICE.has(v.place)&&(v.mode==='TALK'||v.entity==null)){s.placeVisit=null;if(['SHOP','CRAFT','DIALOGUE'].includes(s.global?.SCREEN_MODE))s.global.SCREEN_MODE='LOCATION';}
 return old.validateSave.call(this,s);
};
P.liyuePlacesVersion=1;api.liyuePlacesVersion=1;
})(globalThis);
