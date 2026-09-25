/* Additive joint-facility preparation. Load after runtime_places.js.
 * CRAFT_STAGE {recipe} records only work prepared at the entered facility.
 * Costs, outputs, unlocks and elapsed crafting time remain in the existing CRAFT.
 */
(function(root){
 'use strict';
 const api=root.CRPGRuntime,P=api?.Runtime?.prototype;
 if(!P?.placeModuleVersion)throw Error('runtime_places.js must be loaded first');
 if(P.jointPlacesVersion)return;
 const old=Object.fromEntries(['apply','actionReason','placeRecipeFacilityReason','placeRecipes','craft','validateSave'].map(k=>[k,P[k]]));
 const copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
 const validTime=x=>typeof x==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
 P.jointCraftDefinition=function(id){
  if(!this.tables['17_RECIPE_DB'].has(id))return null;
  const row=this.recipeDefinition(id),parts=String(row[17]||'').split('+').map(x=>x.trim());
  if(parts.length<2||parts.some(x=>!x))return null;
  return {row,parts,signature:JSON.stringify([id,row[16],row[17]])};
 };
 P.jointCraftEntryParts=function(def,entry,map){
  if(!def||!entry||entry.kind!=='FACILITY'||!entry.maps.includes(map)||entry.merchant&&!entry.merchantMaps.includes(map))return [];
  return def.parts.flatMap((part,i)=>{const row=def.row.slice();row[17]=part;return old.placeRecipeFacilityReason.call(this,row,entry,map)?[]:[i];});
 };
 P.jointCraftRecord=function(def,map,state=this.s){
  const record=state?.craftPreparations?.[def.row[0]],g=state?.global;
  return record&&record.schema===1&&record.recipe===def.row[0]&&record.saveId===g.SAVE_ID&&record.route===g.STORY_ROUTE_ID&&record.map===map&&record.signature===def.signature?record:null;
 };
 P.jointCraftStatus=function(id){
  const def=this.jointCraftDefinition(id);if(!def)return null;
  const g=this.s.global,map=g.CURRENT_MAP_ID,current=this.currentPlace(),entry=current?.valid&&current.mode==='CRAFT'?current.entry:null;
  const here=this.jointCraftEntryParts(def,entry,map),record=this.jointCraftRecord(def,map),catalog=this.placeCatalog();
  const stages=def.parts.map((part,index)=>{
   const facilities=catalog.filter(e=>!this.placeMergedInto(e,map)&&this.jointCraftEntryParts(def,e,map).includes(index));
   const receipt=record?.stages?.[index],source=receipt&&catalog.find(e=>e.id===receipt.place);
   const prepared=!!source&&this.jointCraftEntryParts(def,source,map).includes(index);
   return {index,label:facilities.map(x=>x.name).join(' / '),prepared,here:here.includes(index),facilities:facilities.map(x=>({id:x.id,name:x.name})),preparedAt:prepared?receipt.place:null};
  });
  const ready=stages.every(s=>s.prepared),missing=stages.filter(s=>!s.prepared);
  let reason=this.placeVisitReason('CRAFT');
  if(!reason&&this.s.global.SCREEN_MODE!=='CRAFT')reason='들어온 제작시설 화면에서 준비해 주세요.';
  if(!reason&&!here.length)reason='이 제작법에 참여하는 시설에서 준비해 주세요.';
  if(!reason&&stages.some(s=>!s.facilities.length))reason='이 지도에서 필요한 제작시설을 모두 확인할 수 없습니다.';
  const stageReason=reason||(!here.some(i=>!stages[i].prepared)?'이 시설의 준비는 이미 마쳤습니다.':'');
  return {recipe:id,map,stages,ready,canStage:!stageReason,stageReason,reason:reason||(ready?'':'다른 시설의 준비를 마쳐 주세요.'),missing:missing.map(s=>s.index)};
 };
 P.placeRecipeFacilityReason=function(row,entry,map){
  const def=this.jointCraftDefinition(row[0]);if(!def)return old.placeRecipeFacilityReason.call(this,row,entry,map);
  if(!this.jointCraftEntryParts(def,entry,map).length)return old.placeRecipeFacilityReason.call(this,row,entry,map);
  // Catalog creation is a read of definitions, before any save may exist.
  const record=this.jointCraftRecord(def,map);if(!record)return '각 시설에서 준비를 먼저 마쳐 주세요.';
  for(let index=0;index<def.parts.length;index++){
   const receipt=record.stages?.[index],source=receipt&&this.placeCatalog().find(e=>e.id===receipt.place);
   if(!source||!this.jointCraftEntryParts(def,source,map).includes(index))return '다른 시설의 준비를 마쳐 주세요.';
  }
  return '';
 };
 P.craftStage=function(id){
  const reason=this.actionReason('CRAFT_STAGE',{recipe:id});if(reason)fail('CRAFT_STAGE',reason);
  const def=this.jointCraftDefinition(id),status=this.jointCraftStatus(id),g=this.s.global;
  this.s.craftPreparations??={};
  let record=this.jointCraftRecord(def,g.CURRENT_MAP_ID);
  if(!record)record=this.s.craftPreparations[id]={schema:1,recipe:id,saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,map:g.CURRENT_MAP_ID,signature:def.signature,stages:{}};
  const completed=[];
  for(const stage of status.stages)if(stage.here&&!stage.prepared){
   record.stages[stage.index]={place:this.s.placeVisit.place,day:g.WORLD_DAY,time:g.WORLD_TIME,action:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)};
   completed.push(stage.index);
  }
  return {recipe:id,prepared:completed,ready:this.jointCraftStatus(id).ready};
 };
 P.actionReason=function(type,a={}){
  const reason=old.actionReason.call(this,type,a);if(reason)return reason;
  if(type!=='CRAFT_STAGE')return '';
  if(!this.jointCraftDefinition(a.recipe))return '시설 준비가 필요한 제작법을 선택해 주세요.';
  return this.jointCraftStatus(a.recipe).stageReason;
 };
 P.apply=function(a){if(a.type==='CRAFT_STAGE')return this.craftStage(a.recipe);return old.apply.call(this,a);};
 P.craft=function(id,quantity=1){
  const joint=!!this.jointCraftDefinition(id),result=old.craft.call(this,id,quantity);
  if(joint&&this.s.craftPreparations){delete this.s.craftPreparations[id];if(!Object.keys(this.s.craftPreparations).length)delete this.s.craftPreparations;}
  return result;
 };
 P.placeRecipes=function(){
  const entries=old.placeRecipes.call(this),place=this.currentPlace();if(!place?.valid||place.mode!=='CRAFT')return entries;
  const byId=new Map(entries.map(x=>[x.row[0],x]));
  for(const row of this.rows('17_RECIPE_DB')){
   const def=this.jointCraftDefinition(row[0]);if(!def||!this.jointCraftEntryParts(def,place.entry,this.s.global.CURRENT_MAP_ID).length)continue;
   const status=this.jointCraftStatus(row[0]),stageReason=this.actionReason('CRAFT_STAGE',{recipe:row[0]});
   byId.set(row[0],{row:def.row,reason:this.craftReason(def.row),stages:status.stages,canStage:!stageReason,stageReason,ready:status.ready});
  }
  return [...byId.values()];
 };
 P.validateSave=function(s){
  old.validateSave.call(this,s);const records=s.craftPreparations;if(records===undefined)return s;
  if(!records||typeof records!=='object'||Array.isArray(records))fail('CRAFT_STAGE_SAVE','저장된 제작 준비를 확인할 수 없습니다.');
  for(const [id,record]of Object.entries(records)){
   const def=this.jointCraftDefinition(id);
   if(!def||!record||record.schema!==1||record.recipe!==id||record.saveId!==s.global.SAVE_ID||record.route!==s.global.STORY_ROUTE_ID||record.signature!==def.signature||!this.tables['32_MAP_DB'].has(record.map)||!record.stages||typeof record.stages!=='object'||Array.isArray(record.stages)||!Object.keys(record.stages).length)fail('CRAFT_STAGE_SAVE','제작 준비 기록이 현재 여정·제작법과 일치하지 않습니다.');
   for(const [part,receipt]of Object.entries(record.stages)){
    const index=Number(part),entry=receipt&&this.placeCatalog().find(x=>x.id===receipt.place);
    if(!Number.isInteger(index)||String(index)!==part||index<0||index>=def.parts.length||!entry||!this.jointCraftEntryParts(def,entry,record.map).includes(index)||!Number.isSafeInteger(receipt.day)||receipt.day<1||receipt.day>s.global.WORLD_DAY||!validTime(receipt.time))fail('CRAFT_STAGE_SAVE','실제로 준비한 시설의 기록을 확인할 수 없습니다.');
    const prefix=s.global.SAVE_ID+':',seq=typeof receipt.action==='string'&&receipt.action.startsWith(prefix)?Number(receipt.action.slice(prefix.length)):NaN;
    if(!Number.isSafeInteger(seq)||seq<1||seq>s.global.LAST_COMMITTED_ACTION_SEQ||this.placeAvailability(entry,{...s,global:{...s.global,CURRENT_MAP_ID:record.map,WORLD_TIME:receipt.time}}))fail('CRAFT_STAGE_SAVE','시설 방문 시점의 준비 기록이 올바르지 않습니다.');
   }
  }
  return s;
 };
 P.jointPlacesVersion=1;api.jointPlacesVersion=1;
})(globalThis);
