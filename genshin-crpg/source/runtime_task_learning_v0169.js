/* Existing native outcomes feed the existing task counters (0.16.11 branches). Displaying a menu is
 * never evidence. This bridge owns no separate save state or new gameplay action. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.taskLearningV0169)return;P.taskLearningV0169=true;
const old={apply:P.apply,finishBattle:P.finishBattle,acceptCommission:P.acceptCommission};
const num=n=>Number(n)||0,keys=o=>new Set(Object.keys(o||{})),copy=o=>JSON.parse(JSON.stringify(o));
const nativeFacts=rt=>({chests:keys(rt.s.chests?.opened),oculi:new Set([...Object.keys(rt.s.exploration?.oculi||{}),...Object.keys(rt.s.geoOculi?.receipts||{})]),offers:num(rt.s.exploration?.tiers?.length)+num(rt.s.geoOculi?.tiers?.length),events:num(rt.s.regionEvents?.count),achievements:keys(rt.s.achievements?.claimed),trails:keys(rt.s.geoTrail?.claims),bonds:bondFacts(rt),legends:legendFacts(rt),commissions:commissionFacts(rt)});
function commissionFacts(rt){return new Set(Object.entries(rt.s.quests||{}).filter(([id,q])=>q.claimed&&q.node==='COMPLETE'&&rt.isCommission?.(id)&&!id.startsWith('Q_TASK_LEARN_')).map(([id])=>id));}
function bondFacts(rt){const set=new Set();for(const[profile,r]of Object.entries(rt.s.relations||{}))for(const[event,v]of Object.entries(r.events||{}))if(v==='COMPLETE'&&!/^H0[1-5]$/.test(event)&&(r.eventCompletedAt?.[event]||rt.s.storyEventReceipts?.[event]))set.add(profile+':'+event);return set;}
function legendFacts(rt){const set=new Set();for(const[id,receipt]of Object.entries(rt.s.storyEventReceipts||{}))if(receipt?.legend===id&&rt.storyDone?.(id))set.add(id);return set;}
function snapshot(rt){return rt.taskActivitySnapshot?.()||null;}
function record(rt,kind,stamp,meta={}){if(stamp&&typeof rt.taskRecordActivity==='function')rt.taskRecordActivity(kind,{...stamp,kinds:[kind],...meta});}
function added(before,after){return [...after].filter(k=>!before.has(k));}
function recordedFacts(rt,before,after,stamp){
 const once=(kind,id,meta)=>{const key=kind+':'+id,seen=rt._taskLearningObserved;if(seen?.has(key))return;seen?.add(key);record(rt,kind,stamp,meta);};
 for(const id of added(before.chests,after.chests))once('chest',id,{action:'CHEST_OPEN',entity:id});
 for(const id of added(before.oculi,after.oculi))once('oculus',id,{action:'OCULUS_COMPLETE',entity:id});
 for(let i=before.offers;i<after.offers;i++)once('oculusOffer',i,{action:'OCULUS_OFFER'});
 for(const id of added(before.bonds,after.bonds))once('bond',id,{action:'AFFECTION_COMPLETE',entity:id});
 for(const id of added(before.legends,after.legends))once('bond',id,{action:'LEGEND_COMPLETE',entity:id});
 for(let i=before.events;i<after.events;i++)once('encounter',i,{action:'REGION_EVENT_COMPLETE'});
 for(const id of added(before.achievements,after.achievements))once('handbook',id,{action:'ACHIEVEMENT_CLAIM',entity:id});
 for(const id of added(before.trails,after.trails))once('handbook',id,{action:'GEO_TRAIL_CLAIM',entity:id});
}
P.apply=function(a){
 const observed=this._taskLearningObserved;this._taskLearningObserved=new Set();
 try{
 const stamp=snapshot(this),before=nativeFacts(this),priorQuest=!!this.s.quests[a.quest]?.claimed,priorAccepted=!!this.s.quests[a.quest]?.guildAccepted;
 const oldInv=['EQUIP','ENHANCE','ARTIFACT_ENHANCE'].includes(a.type)?copy(this.s.inventory.find(i=>i.slot===a.slot)||{}):null;
 const result=old.apply.call(this,a);
 // Native receipt deltas include final eye acquisition and story completions nested in these actions.
 recordedFacts(this,before,nativeFacts(this),stamp);
 // Reception practice completes directly on its own successful acceptance in the task engine.
 // Its receipt must not also advance another commission objective.
 if(a.type==='COMMISSION_ACCEPT'&&result?.accepted&&!priorAccepted&&this.s.quests[a.quest]?.guildAccepted&&!String(a.quest).startsWith('Q_TASK_LEARN_'))record(this,'commission',stamp,{action:'COMMISSION_ACCEPT',entity:a.quest});
 if(a.type==='CLAIM_QUEST'&&!priorQuest&&this.s.quests[a.quest]?.claimed&&this.isCommission?.(a.quest)&&!String(a.quest).startsWith('Q_TASK_LEARN_'))record(this,'commission',stamp,{action:'CLAIM_QUEST',entity:a.quest});
 if(a.type==='BUY'&&result?.service==='INN_REST'&&result.recovered&&num(result.cost)>0&&num(result.minutes)>=480)record(this,'sleep',stamp,{action:'INN_REST',entity:result.stock});
 if(a.type==='CRAFT'&&result?.recipe&&num(result.quantity)>0){
  const r=this.recipeDefinition?.(result.recipe)||this.tables['17_RECIPE_DB']?.get(result.recipe),quantity=Math.max(1,num(result.crafts??a.quantity??1));
  if(['식재료 가공','가공'].includes(r?.[1]))record(this,'process',stamp,{action:'CRAFT',recipe:result.recipe,quantity,items:{[result.result]:num(result.quantity)}});
  // All genuine equipment recipes count, including legacy labels 장비 제작/장신구 제작.
  if(r?.[2]==='EQUIP'&&!['단조','제작'].includes(r?.[1]))record(this,'forge',stamp,{action:'CRAFT',recipe:result.recipe,quantity,equipment:r[3],equipmentOutput:true});
 }
 if(a.type==='EQUIP'&&result?.slot){const inv=this.s.inventory.find(i=>i.slot===result.slot);if(inv?.equipped&&(!oldInv?.equipped||oldInv.owner!==inv.owner||oldInv.category!==inv.category))record(this,'equip',stamp,{action:'EQUIP',equipment:inv.equip,entity:inv.slot});}
 if(a.type==='ENHANCE'&&result?.kind==='ENHANCE'&&num(result.cost?.mora)>0&&['SUCCESS','HOLD','DOWN'].includes(result.outcome))record(this,'enhance',stamp,{action:'ENHANCE',equipment:result.equip,entity:result.slot});
 if(a.type==='ARTIFACT_ENHANCE'&&result?.slot&&this.s.inventory.find(i=>i.slot===result.slot)?.instanceRevision>num(oldInv?.instanceRevision))record(this,'artifactEnhance',stamp,{action:'ARTIFACT_ENHANCE',entity:result.slot});
 if(a.type==='MEAL_BATCH'&&Array.isArray(result?.meals))for(const m of result.meals)if(num(m.healed)>0||num(m.absorbed)>0)record(this,'meal',stamp,{action:'MEAL_BATCH',entity:m.owner,items:{[m.item]:1}});
 return result;
 }finally{this._taskLearningObserved=observed;}
};
P.finishBattle=function(...args){
 const b=this.s.runtime,stamp=b?.taskSnapshot?copy(b.taskSnapshot):snapshot(this),before=nativeFacts(this),result=old.finishBattle.apply(this,args);
 if(b)recordedFacts(this,before,nativeFacts(this),stamp);return result;
};
// These outcomes cannot be repeated forever. Old saves that already fulfilled them
// can demonstrate their validated native receipts without inventing new treasures.
P.acceptCommission=function(id){
 const result=old.acceptCommission.call(this,id),q=this.s.quests[id],def=q?.taskObjective?.definition||root.CRPGTaskCatalogV0168?.chains?.find(t=>t.id===id);
 if(def?.learning&&def.filter?.completedBeforeAccept&&q?.taskObjective){
  const f=nativeFacts(this),kind=def.kind,action=def.filter.actions?.[0];
  let evidence=[];
  if(kind==='chest')evidence=[...f.chests];if(kind==='oculus')evidence=[...f.oculi];if(kind==='oculusOffer')evidence=Array.from({length:f.offers},(_,i)=>String(i));
  if(def.id==='Q_TASK_LEARN_16'&&kind==='commission'&&action==='CLAIM_QUEST')evidence=[...f.commissions];
  if(kind==='bond')evidence=[...(action==='LEGEND_COMPLETE'?f.legends:f.bonds)];if(kind==='handbook'&&action==='ACHIEVEMENT_CLAIM')evidence=[...f.achievements];
  // Credit only this accepted learning objective. A prior receipt cannot advance any
  // recurring task or unrelated objective. The engine's shared counter path is not used.
  if(evidence.length){q.taskObjective.progress=Math.min(def.goal,evidence.length);if(q.taskObjective.progress>=def.goal){q.node='READY_TO_CLAIM';q.state='진행중';}}
 }
 return result;
};
api.taskLearningV0169={nativeFacts,version:'0.16.9'};
})(globalThis);
