/* Geo oculus trails: the 16 Liyue oculi are investigated at the detail places their clues describe,
 * with location hints, a suggested route per zone and zone milestones. Receipts keep their original
 * region map, so every existing collection record stays valid; Zhongli still needs all 16 offered.
 */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype,C=root.CRPGWorldContent?.geoOculi||[];
if(!P?.completeWorldStep||!C.length||P.geoTrailsVersion)return;
const old=Object.fromEntries(['worldRequirement','oculusEntries','completeWorldStep','actionReason','apply','validateSave'].map(k=>[k,P[k]]));
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
// Where each clue physically is. Points not listed keep their original spot.
const SITE={
 GEO_HARBOR_CRATES:'MAP_LY_DETAIL_WHARF',GEO_HARBOR_SEALED:'MAP_LY_DETAIL_WHARF',
 GEO_PLAINS_CART:'MAP_LY_DETAIL_SHIMEN',GEO_PLAINS_PATROL:'MAP_LY_DETAIL_DIHUA',GEO_PLAINS_BRAZIER:'MAP_LY_DETAIL_GUILI',
 GEO_QINGCE_WATER:'MAP_LY_DETAIL_QINGCE_FIELDS',GEO_QINGCE_SEQUENCE:'MAP_LY_DETAIL_QINGCE_FIELDS',
 GEO_MOUNTAINS_ROPE:'MAP_LY_DETAIL_HUAGUANG',GEO_MOUNTAINS_VEIN:'MAP_LY_DETAIL_HULAO',
 GEO_JUEYUN_LANTERN:'MAP_LY_DETAIL_QINGYUN',GEO_JUEYUN_GUARD:'MAP_LY_DETAIL_AOCANG'
};
const HINT={
 GEO_HARBOR_APPRAISAL:'리월항 중심 잡화 상인의 진열장. 상점에 들어가 주인에게 묻는다.',
 GEO_HARBOR_CRATES:'부두 풍경 어딘가에 황금빛이 숨어 있다. 메인 화면의 풍경을 좌우로 살펴보자.',
 GEO_HARBOR_SEALED:'부두 계류 기둥 곁의 항로표. 방파제 쪽 방향과 대조해야 한다.',
 GEO_BANK_NET:'방파제 낚시터의 그물 아래. 낚싯대로 걸린 물건을 끌어올린다.',
 GEO_BANK_MOON:'밤(18:00~06:00)에만 물이 빠지는 방파제 틈.',
 GEO_PLAINS_CART:'석문 통행로에 남은 운송 수레 자국. 평야 운송 의뢰를 마친 뒤 확인할 수 있다.',
 GEO_PLAINS_PATROL:'적화주 갈대 물가의 돌상자. 차지한 순찰대를 물리쳐야 한다.',
 GEO_PLAINS_BRAZIER:'귀리 평원 옛 유적의 꺼진 화로 세 개. 불을 붙일 방법이 필요하다.',
 GEO_QINGCE_BARTER:'경책 산장의 주민이 보관한 반짝이는 돌.',
 GEO_QINGCE_WATER:'경책 산장 남쪽 밭길의 수로를 막은 받침.',
 GEO_QINGCE_SEQUENCE:'밭길 끝에서 세 풍경을 향해 선 석판.',
 GEO_MOUNTAINS_ROPE:'화광림 계곡길의 절벽 아래 오래된 고리. 튼튼한 밧줄이 필요하다.',
 GEO_MOUNTAINS_VEIN:'호로산 호박 바위길의 수정맥 사이 빈 공간.',
 GEO_JUEYUN_LANTERN:'경운봉 산길 돌계단 아래의 어두운 틈. 휴대용 등불이 필요하다.',
 GEO_JUEYUN_GUARD:'오장산 정상 호숫가의 석단. 유적 기계가 지키고 있다.',
 GEO_JUEYUN_TRAIL:'절운간의 표식. 지나온 네 장소의 풍경과 대조한다.'
};
// A suggested walking order per zone; each stop lists the maps a player passes in that order.
const ZONES=[
 {id:'HARBOR',name:'운래해 · 리월항 일대',stops:['MAP_LIYUE_HARBOR','MAP_LY_DETAIL_WHARF','MAP_CRPG_LIYUE_BANK'],reward:{mora:200,items:{MAT_CHAR_EXP_ADVENTURER:1}}},
 {id:'BISHUI',name:'벽수원·경기 들판',stops:['MAP_LY_DETAIL_SHIMEN','MAP_LY_DETAIL_QINGCE_FIELDS','MAP_LIYUE_QINGCE','MAP_LY_DETAIL_DIHUA','MAP_LY_DETAIL_GUILI'],reward:{mora:250,items:{MAT_CHAR_EXP_ADVENTURER:2}}},
 {id:'MINLIN',name:'민림 · 절운간 일대',stops:['MAP_LY_DETAIL_QINGYUN','MAP_LY_DETAIL_AOCANG','MAP_LY_DETAIL_HULAO','MAP_LY_DETAIL_HUAGUANG','MAP_LIYUE_JUEYUN'],reward:{mora:250,items:{MAT_CHAR_EXP_ADVENTURER:2}}}
];
const siteOf=p=>SITE[p.id]||p.map;
const zoneOf=p=>ZONES.find(z=>z.stops.includes(siteOf(p)));
const atSiteView=(r,p)=>{const view=Object.create(r);view.s={...r.s,global:{...r.s.global,CURRENT_MAP_ID:p.map}};return view;};
// A job started at the old spot before this update may still finish there.
const grandfathered=(r,p)=>{const j=r.s?.worldJob;return j?.kind==='OCULUS'&&j.point===p.id&&j.map===r.s.global.CURRENT_MAP_ID&&j.map===p.map;};
P.geoOculusSite=function(id){const p=C.find(x=>x.id===id);return p?siteOf(p):null;};
P.worldRequirement=function(p){
 if(!p?.id?.startsWith('GEO_')||!SITE[p.id])return old.worldRequirement.call(this,p);
 const here=this.s.global.CURRENT_MAP_ID;
 if(here===SITE[p.id]||grandfathered(this,p))return old.worldRequirement.call(atSiteView(this,p),p);
 if(here===p.map)return '단서는 '+this.row('32_MAP_DB',SITE[p.id])[2]+'에 있습니다. 그곳으로 이동해 조사하세요.';
 return old.worldRequirement.call(this,p);
};
P.oculusEntries=function(){
 const here=this.s.global.CURRENT_MAP_ID,list=old.oculusEntries.call(this).filter(p=>!SITE[p.id]||grandfathered(this,p));
 for(const p of C)if(SITE[p.id]===here&&!this.s.geoOculi?.receipts[p.id]&&!list.some(x=>x.id===p.id))list.push({...p,site:here,step:this.oculusStep(p.id),progress:this.oculusProgress(p.id),reason:this.worldRequirement(p)});
 return list;
};
// ---- zone milestones -------------------------------------------------------------------------------------------
P.ensureGeoTrail=function(s=this.s){return s.geoTrail??={version:1,route:s.global.STORY_ROUTE_ID,claims:{}};};
P.geoZoneProgress=function(zone,s=this.s){const points=C.filter(p=>zoneOf(p)?.id===zone.id),receipts=s.geoOculi?.receipts||{};return {points,collected:points.filter(p=>receipts[p.id]).length,total:points.length};};
P.geoTrailClaimReason=function(id){
 const zone=ZONES.find(z=>z.id===id);if(!zone)return '중간 목표를 선택해 주세요.';
 if(this.s.geoTrail?.claims?.[id])return '이미 받은 중간 목표 보상입니다.';
 const p=this.geoZoneProgress(zone);if(p.collected<p.total)return zone.name+'의 눈동자를 모두 찾으면 받을 수 있습니다 · '+p.collected+' / '+p.total;
 if(this.s.runtime||this.s.battlePreparation||this.s.global.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '진행 중인 장면을 먼저 마쳐 주세요.';
 return '';
};
P.geoTrailView=function(){
 const here=this.s.global.CURRENT_MAP_ID,receipts=this.s.geoOculi?.receipts||{},summary=this.geoOculusSummary();
 const point=p=>{const done=!!receipts[p.id],progress=this.oculusProgress(p.id);
  return {id:p.id,title:p.title,level:p.level,site:siteOf(p),siteName:this.row('32_MAP_DB',siteOf(p))[2],hint:HINT[p.id]||p.clue||'',status:done?'DONE':progress?'PROGRESS':'OPEN',progress,steps:p.steps.length,
   requirements:done?[]:this.geoRequirements(p.requirements||{}),reason:done?'':siteOf(p)===here?this.worldRequirement(p):''};};
 return {collected:summary.collected,total:summary.total,balance:summary.balance,offerings:summary.offerings,here,
  zones:ZONES.map(z=>{const p=this.geoZoneProgress(z);return {id:z.id,name:z.name,collected:p.collected,total:p.total,complete:p.collected===p.total,claimed:!!this.s.geoTrail?.claims?.[z.id],reward:copy(z.reward),claimReason:this.geoTrailClaimReason(z.id),
   stops:z.stops.map(map=>({map,name:this.row('32_MAP_DB',map)[2],here:map===here,points:p.points.filter(x=>siteOf(x)===map).map(point)})).filter(s=>s.points.length)};})};
};
P.actionReason=function(type,a={}){const reason=old.actionReason.call(this,type,a);if(reason||type!=='GEO_TRAIL_CLAIM')return reason;return this.geoTrailClaimReason(a.zone);};
P.apply=function(a){
 if(a?.type!=='GEO_TRAIL_CLAIM')return old.apply.call(this,a);
 const reason=this.geoTrailClaimReason(a.zone);if(reason)fail('GEO_TRAIL',reason);
 const zone=ZONES.find(z=>z.id===a.zone),g=this.s.global,t=this.ensureGeoTrail();
 this.s.global.MORA+=zone.reward.mora||0;for(const [id,n]of Object.entries(zone.reward.items||{}))if(this.tables['14_ITEM_DB'].has(id))this.giveItem(id,n);
 t.claims[zone.id]={day:g.WORLD_DAY,turn:g.TURN,action:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)};
 return {zone:zone.id,reward:copy(zone.reward)};
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,t=out.geoTrail;
 if(t!==undefined){
  const g=out.global,bad=()=>fail('GEO_TRAIL_SAVE','바위 눈동자 중간 목표 기록을 확인할 수 없습니다.');
  if(!t||t.version!==1||t.route!==g.STORY_ROUTE_ID||!t.claims||typeof t.claims!=='object'||Array.isArray(t.claims))bad();
  for(const [id,c]of Object.entries(t.claims)){const zone=ZONES.find(z=>z.id===id),seq=typeof c?.action==='string'&&c.action.startsWith(g.SAVE_ID+':')?Number(c.action.slice(g.SAVE_ID.length+1)):NaN;
   if(!zone||this.geoZoneProgress(zone,out).collected!==this.geoZoneProgress(zone,out).total||!Number.isSafeInteger(c.day)||c.day<1||c.day>g.WORLD_DAY||!Number.isSafeInteger(seq)||seq<1||seq>g.LAST_COMMITTED_ACTION_SEQ)bad();}
 }
 return out;
};
P.geoTrailsVersion=1;api.geoTrailsVersion=1;api.geoTrails={sites:copy(SITE),zones:copy(ZONES)};
})(globalThis);
