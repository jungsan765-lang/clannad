/* Independent regional oculus ledger; never mix currencies or once-only receipts. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,C=root.CRPGWorldContent?.geoOculi||[];
const old=Object.fromEntries(['newGame','validateSave','oculusPoint','oculusStep','oculusEntries','worldRequirement','completeWorldStep','finishBattle','actionReason','apply','oculusExchangeEntry'].map(k=>[k,P[k]]));
const ITEM='KEY_CRPG_GEOCULUS',copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
const tiers=[{id:'GEO_TIER_1',cost:4,reward:{mora:400,items:{MAT_CHAR_EXP_ADVENTURER:2}}},{id:'GEO_TIER_2',cost:5,reward:{mora:600,items:{MAT_CHAR_EXP_HERO:1}}},{id:'GEO_TIER_FINAL',cost:7,reward:{mora:800,items:{MAT_CHAR_EXP_HERO:3}}}];
P.ensureGeo=function(s=this.s){return s.geoOculi??={version:1,route:s.global.STORY_ROUTE_ID,progress:{},receipts:{},tiers:[]};};
P.installGeo=function(){
 if(this._geoInstalled)return;this.db={...this.db};const add=(name,rows)=>{const a=this.db[name].map(r=>r.slice());for(const r of rows)if(!a.some(x=>x[0]===r[0]))a.push(r);this.db[name]=a;this.tables[name]=new Map(a.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));};
 const original=[ITEM,'잃어버린 바위 신의 눈동자','퀘스트 아이템','특수','[바위]','리월 곳곳의 16개 단서를 해결해 얻는 눈동자. 전량 수집 후 순서대로 공양한다.','절운간 공양','바위 눈동자 공양에 사용',0,'','N','PLAYER_CUSTOM','공양 전까지 유지','판매·폐기·제작 불가',0,0,16,'리월 탐사','N','Y','리월','CRPG 지역별 독립 수집품',''];add('14_ITEM_DB',[original]);
 const rows=[];for(const [id,price]of [['TRPG_ROPE',80],['TRPG_TORCH',60]])rows.push(['STK_CRPG_LIYUE_'+id,'MRC_LIYUE_GENERAL','ITEM',id,this.tables['14_ITEM_DB'].get(id)?.[1]||id,price,10,'매일','','','','','','CRPG_LOCAL_V013']);add('19_SHOP_STOCK_DB',rows);this._geoInstalled=true;
};
P.oculusProgress=function(id){return id.startsWith('GEO_')?this.s.geoOculi?.progress[id]||0:this.s.worldProgress?.oculi[id]||0;};
P.oculusPoint=function(id){return C.find(p=>p.id===id)||old.oculusPoint.call(this,id);};
P.oculusStep=function(id){const p=C.find(p=>p.id===id);return p?p.steps[this.oculusProgress(id)]:old.oculusStep.call(this,id);};
P.geoRequirements=function(r){
 const g=this.s.global,active=this.s.party.filter(p=>p.active).map(p=>p.source==='PLAYER_CUSTOM'?this.player():this.character(p.source)).filter(a=>a.hp>0),out=[];
 const add=(met,label)=>out.push({met,label});
 if(r.activeCharacter)add(active.some(a=>a.source===r.activeCharacter||a.id===r.activeCharacter),(this.tables['07_CHAR_DB'].get(r.activeCharacter)?.[1]||'동료')+' 생존 상태로 편성');
 if(r.activeElement)add(active.some(a=>a.id!=='PLAYER_CUSTOM'&&String(this.tables['07_CHAR_DB'].get(a.id)?.[3]).includes('['+r.activeElement+']')),r.activeElement+' 원소 동료 편성');
 for(const [id,n]of Object.entries(r.itemsOwned||{}))add(this.itemCount(id)>=n,(this.tables['14_ITEM_DB'].get(id)?.[1]||'도구')+' 보유 '+this.itemCount(id)+' / '+n+'개');
 for(const id of r.visitedMaps||[])add(!!this.s.exploration?.visitedMaps[id],(this.tables['32_MAP_DB'].get(id)?.[2]||'장소')+' 방문');
 for(const id of r.questsClaimed||[])add(!!this.s.quests[id]?.claimed,(this.tables['22_QUEST_DB'].get(id)?.[1]||'선행 의뢰')+' 보상 수령');
 if(r.timeWindow){const [h,m]=g.WORLD_TIME.split(':').map(Number),now=h*60+m,[start,end]=r.timeWindow;add(start<end?now>=start&&now<end:now>=start||now<end,'18:00~06:00에 조사');}
 if(r.anyOf){const options=r.anyOf.map(v=>this.geoRequirements(v));add(options.some(rs=>rs.every(x=>x.met)),options.map(rs=>rs.map(x=>x.label).join(' + ')).join(' 또는 '));}
 return out;
};
P.worldRequirement=function(p){
 if(!p.id.startsWith('GEO_'))return old.worldRequirement.call(this,p);
 if(this.s.global.CURRENT_MAP_ID!==p.map)return '단서가 있는 장소에서 조사하세요.';
 if(this.s.global.PLAYER_LEVEL_STATE<p.level)return 'Lv. '+p.level+'부터 조사할 수 있습니다.';
 if(p.place){if(this.s.placeVisit?.place!==p.place||!this.currentPlace()?.valid)return '리월 잡화점 주인에게 물어보세요.';}else if(this.s.placeVisit)return '시설 밖에서 조사하세요.';
 return this.geoRequirements(p.requirements).filter(r=>!r.met).map(r=>r.label).join(' · ');
};
P.oculusEntries=function(){return [...old.oculusEntries.call(this),...C.filter(p=>p.map===this.s.global.CURRENT_MAP_ID&&!this.s.geoOculi?.receipts[p.id]&&(!p.place||p.place===this.s.placeVisit?.place)).map(p=>({...p,step:this.oculusStep(p.id),progress:this.oculusProgress(p.id),reason:this.worldRequirement(p)}))];};
P.completeWorldStep=function(spec,a={}){
 if(!String(spec.point).startsWith('GEO_'))return old.completeWorldStep.call(this,spec,a);
 const s=this.s,g=s.global,e=this.ensureGeo(),p=this.oculusPoint(spec.point),step=spec.step;
 if(e.receipts[p.id])fail('GEO_ONCE','이미 회수한 눈동자입니다.');
 if(step.options&&a.answer!==step.answer)fail('GEO_PUZZLE','주변에 남은 단서와 순서를 다시 확인하세요.');
 if(step.sequence&&JSON.stringify(a.sequence)!==JSON.stringify(step.sequence))fail('GEO_PUZZLE','글에 적힌 변화의 순서대로 골라 주세요.');
 if(step.combatGroup){e.battle={point:p.id,stage:step.id};return this.startBattle(step.combatGroup,'GEO_OCULUS:'+p.id);}
 if(step.cost)this.pay(step.cost);e.progress[p.id]=(e.progress[p.id]||0)+1;
 if(e.progress[p.id]===p.steps.length){e.receipts[p.id]={saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,map:p.map,day:g.WORLD_DAY,action:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)};this.giveItem(ITEM,1);return {point:p.id,items:{[ITEM]:1}};}
 return {point:p.id,progress:e.progress[p.id]};
};
P.finishBattle=function(win){const b=this.s.runtime,point=this.s.geoOculi?.battle,result=old.finishBattle.call(this,win);if(point&&b?.origin==='GEO_OCULUS:'+point.point){if(win&&this.oculusStep(point.point)?.id===point.stage)this.ensureGeo().progress[point.point]=(this.ensureGeo().progress[point.point]||0)+1;delete this.s.geoOculi.battle;}return result;};
P.geoOculusSummary=function(){const e=this.ensureGeo();return {collected:Object.keys(e.receipts).length,total:C.length,balance:this.itemCount(ITEM),offerings:e.tiers.length};};
P.geoOfferReason=function(id){const e=this.ensureGeo(),tier=tiers[e.tiers.length],summary=this.geoOculusSummary();if(!tier||id!==tier.id)return '이미 마쳤거나 순서에 맞지 않는 공양입니다.';if(this.s.global.CURRENT_MAP_ID!=='MAP_LIYUE_JUEYUN'||this.s.placeVisit)return '절운간의 공양처에서 진행하세요.';if(summary.collected!==C.length)return '바위 눈동자 전량 수집 필요 · '+summary.collected+' / '+C.length;if(summary.balance<tier.cost)return '공양할 눈동자가 부족합니다.';if(tier.id==='GEO_TIER_FINAL'&&!this.liyuePersonalReady())return '리월 본편을 끝내면 마지막 공양을 진행할 수 있습니다.';return '';};
P.geoExchangeEntry=function(){const e=this.ensureGeo(),t=tiers[e.tiers.length];return t?{...copy(t),reason:this.geoOfferReason(t.id)}:null;};
P.oculusExchangeEntry=function(){const t=api.explorationCatalog.tiers[this.s.exploration?.tiers.length||0];if(!t||this.s.global.CURRENT_MAP_ID!=='MAP_MOND_WINDRISE')return null;const r=old.oculusExchangeEntry.call(this);return r||{...copy(t),title:'거목 아래에 눈동자 공양',text:'수집 상황과 다음 공양 조건을 확인하세요.',reason:this.actionReason('OCULUS_OFFER',{tier:t.id})};};
P.actionReason=function(type,a={}){const prior=old.actionReason.call(this,type,a);if(prior)return prior;if(type==='GEO_OCULUS_OFFER')return this.geoOfferReason(a.tier);return '';};
P.apply=function(a){this.ensureGeo();if(a.type==='GEO_OCULUS_OFFER'){const e=this.ensureGeo(),t=tiers[e.tiers.length],g=this.s.global;this.pay({items:{[ITEM]:t.cost}});for(const [id,n]of Object.entries(t.reward.items||{}))this.giveItem(id,n);g.MORA+=t.reward.mora||0;e.tiers.push({id:t.id,saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,day:g.WORLD_DAY,action:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)});return {tier:t.id,reward:copy(t.reward),character:t.reward.character||null};}return old.apply.call(this,a);};
P.newGame=function(o){this.installGeo();old.newGame.call(this,o);this.ensureGeo();return copy(this.s);};
P.validateSave=function(s){
 this.installGeo();const e=this.ensureGeo(s),g=s.global;if(e.version!==1||e.route!==g.STORY_ROUTE_ID||!e.progress||!e.receipts||!Array.isArray(e.tiers))fail('GEO_SAVE','바위 눈동자 기록을 확인하세요.');
 const valid=r=>r&&r.saveId===g.SAVE_ID&&r.route===g.STORY_ROUTE_ID&&Number.isInteger(r.day)&&r.day>=1&&r.day<=g.WORLD_DAY&&typeof r.action==='string'&&r.action.startsWith(g.SAVE_ID+':')&&Number(r.action.slice(g.SAVE_ID.length+1))>=1&&Number(r.action.slice(g.SAVE_ID.length+1))<=g.LAST_COMMITTED_ACTION_SEQ;
 for(const [id,n]of Object.entries(e.progress)){const p=C.find(p=>p.id===id);if(!p||!Number.isInteger(n)||n<0||n>p.steps.length)fail('GEO_SAVE','눈동자 조사 단계가 올바르지 않습니다.');}
 for(const [id,r]of Object.entries(e.receipts)){const p=C.find(p=>p.id===id);if(!p||r.map!==p.map||!valid(r)||e.progress[id]!==p.steps.length)fail('GEO_SAVE','바위 눈동자의 획득 출처가 일치하지 않습니다.');}
 if(e.tiers.length>3||e.tiers.some((r,i)=>r.id!==tiers[i].id||!valid(r))||e.tiers.length&&Object.keys(e.receipts).length!==C.length)fail('GEO_SAVE','바위 눈동자의 공양 순서가 일치하지 않습니다.');
 const balance=s.inventory.filter(r=>r.item===ITEM).reduce((n,r)=>n+r.quantity,0),spent=tiers.slice(0,e.tiers.length).reduce((n,t)=>n+t.cost,0);if(balance!==Object.keys(e.receipts).length-spent)fail('GEO_SAVE','바위 눈동자의 수집·공양·소지 수량이 일치하지 않습니다.');
 return old.validateSave.call(this,s);
};
api.geoOculusCatalog={points:C,item:ITEM,tiers};
})(globalThis);

/* 0.16.32 신의 눈동자 「공명」 (user: 「신의 눈동자 그 방식으로 하고」, TODO 4-6). In a region where oculi are left the corner mark
 * glows, stronger the fewer roads away the nearest one is (where is never said); at its place 「살펴보기」 opens a short catch
 * game, and catching it collects the oculus (OCULUS_RESONANCE). Puzzle, night, hidden and in-shop oculi keep their own way.
 * The receipt is the one the last step writes, so offerings, tasks and achievements count it the same. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype,W=root.CRPGWorldContent;if(!P||!W||P.resonanceV01632)return;P.resonanceV01632=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const KEEP=new Set(['PUZZLE','NIGHT','HIDDEN']),MOND=api.explorationCatalog?.item||'KEY_CRPG_ANEMOCULUS',GEO='KEY_CRPG_GEOCULUS';
const LIST=()=>[...(W.oculi||[]).map(p=>({...p,geo:false})),...(W.geoOculi||[]).map(p=>({...p,geo:true}))];
const resonant=p=>!!p&&!KEEP.has(String(p.method||''))&&!p.place;
const at=(p,map)=>p.map===map||(p.legacyMaps||[]).includes(map);
const old=Object.fromEntries(['actionReason','apply'].map(k=>[k,P[k]]));
P.resonanceTaken=function(p){return p.geo?!!this.s.geoOculi?.receipts?.[p.id]:!!this.s.exploration?.oculi?.[p.id];};
P.resonanceLeft=function(){const lv=Number(this.s.global.PLAYER_LEVEL_STATE)||1;return LIST().filter(p=>resonant(p)&&!this.resonanceTaken(p)&&(Number(p.level)||1)<=lv);};
P.resonancePoint=function(id){const p=LIST().find(x=>x.id===id);return resonant(p)?p:null;};
// Roads from here over the open roads (the same edges the travel buttons follow).
P.resonanceHops=function(){
 const start=this.s.global.CURRENT_MAP_ID,d=new Map([[start,0]]),queue=[start],f=this.s.flags;
 const edges=this.rows('47_MAP_EDGE_DB').filter(r=>r[11]==='ACTIVE'&&r[8]==='Y'&&!(r[6]&&!(r[6]==='FLAG_TRUE'&&[true,'Y','TRUE'].includes(f[r[7]]))));
 while(queue.length){const v=queue.shift();for(const r of edges)if(r[1]===v&&!d.has(r[2])){d.set(r[2],d.get(v)+1);queue.push(r[2]);}}
 return d;
};
// What the corner mark shows: nothing (none left in this region), faint (far), 2 · 3 (one · two or three roads), here.
P.resonanceView=function(){
 const g=this.s.global,maps=this.tables['32_MAP_DB'],map=g.CURRENT_MAP_ID,region=maps.get(map)?.[1];
 const left=this.resonanceLeft().filter(p=>maps.get(p.map)?.[1]===region);if(!left.length)return null;
 const here=left.find(p=>at(p,map));
 if(here)return {region,left:left.length,level:3,point:here.id,title:here.title,item:here.geo?GEO:MOND,reason:this.actionReason('OCULUS_RESONANCE',{point:here.id})};
 const hops=this.resonanceHops();let best=Infinity;for(const p of left){const n=hops.get(p.map);if(n!==undefined&&n<best)best=n;}
 return {region,left:left.length,level:best<=1?2:best<=3?1:0,item:left[0].geo?GEO:MOND};
};
P.actionReason=function(type,a={}){
 if(type!=='OCULUS_RESONANCE')return old.actionReason.call(this,type,a);
 const p=this.resonancePoint(a.point),g=this.s.global;
 if(!p)return '공명하는 눈동자를 찾지 못했습니다.';
 if(this.resonanceTaken(p))return '이미 회수한 눈동자입니다.';
 if(!at(p,g.CURRENT_MAP_ID))return '공명이 가장 강한 곳에서 살펴봐 주세요.';
 if((Number(p.level)||1)>(Number(g.PLAYER_LEVEL_STATE)||1))return '아직 이 눈동자에 닿을 수 없습니다.';
 if(this.s.runtime)return '전투가 끝난 뒤 살펴볼 수 있습니다.';
 if(this.s.placeVisit)return '시설 밖에서 살펴봐 주세요.';
 if(this.s.worldJob||this.s.lifeJob)return '진행 중인 작업을 먼저 마쳐 주세요.';
 if(typeof this.playPhase==='function'&&this.playPhase()!=='FREE')return '지금 장면을 먼저 마쳐 주세요.';
 return '';
};
P.apply=function(a){
 if(a?.type!=='OCULUS_RESONANCE')return old.apply.call(this,a);
 const why=this.actionReason('OCULUS_RESONANCE',a);if(why)fail('RESONANCE',why);
 const p=this.resonancePoint(a.point),g=this.s.global,action=g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1),steps=(p.steps||[]).length||1;
 if(p.geo){const e=this.ensureGeo();e.progress[p.id]=steps;e.receipts[p.id]={saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,map:p.map,day:g.WORLD_DAY,action};this.giveItem(GEO,1);}
 else{const w=this.ensureWorldProgress?.();if(w)w.oculi[p.id]=steps;const e=this.ensureExplorationState();e.oculi[p.id]={map:g.CURRENT_MAP_ID,day:g.WORLD_DAY,action};this.giveItem(MOND,1);}
 this.advanceTime?.(10);
 return {point:p.id,items:{[p.geo?GEO:MOND]:1},resonance:true};
};
api.resonanceV01632=true;
})(globalThis);