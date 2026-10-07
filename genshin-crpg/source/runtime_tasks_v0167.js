/* Existing task board, revised in 0.16.12: reported acceptance practice opens task branches.
 * Assignments and accepted commissions snapshot objectives/rewards; migration retains prior payouts.
 * Only committed successful native activities advance objectives; reporting and deliveries pay once. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.tasksV0167)return;P.tasksV0167=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x)),num=x=>Number(x)||0;
const json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x),ok=n=>Number.isSafeInteger(n)&&n>=0;
const KST=9*3600000,DAY=86400000,WEEK=7*DAY,dayOf=t=>Math.floor((t+KST)/DAY),weekOf=t=>Math.floor((t+KST+3*DAY)/WEEK);
const BOOK2='MAT_CHAR_EXP_ADVENTURER',BOOK3='MAT_CHAR_EXP_HERO',PLAYER='PLAYER_CUSTOM';
const DAILY=[
 {id:'D_WIN',kind:'win',goal:3,name:'전투 3번 이기기',short:'3번 이기기',icon:'battle',reward:{items:{[BOOK2]:2}}},
 {id:'D_LEY',kind:'ley',goal:1,name:'지맥의 꽃 1번',short:'꽃 1번',icon:'ley',reward:{mora:800}},
 {id:'D_DOMAIN',kind:'domain',goal:1,name:'비경 1번 이기기',short:'1번 이기기',icon:'domain',reward:{items:{[BOOK2]:2}}},
 {id:'D_LIFE',kind:'life',goal:2,name:'채집·채광·사냥·낚시 2번',short:'2번',icon:'life',reward:{mora:600}}
];
const DAILY_BONUS={id:'D_BONUS',name:'오늘의 임무 모두 달성',short:'모두 달성',icon:'bonus',reward:{primogem:20},report:true};
const WEEKLY=[
 {id:'W_WIN',kind:'win',goal:25,name:'전투 25번 이기기',icon:'battle',reward:{items:{[BOOK3]:2}}},
 {id:'W_BOSS',kind:'boss',goal:3,name:'필드 보스 3번 토벌',icon:'boss',reward:{primogem:30},minLevel:15},
 {id:'W_DOMAIN',kind:'domain',goal:8,name:'비경 8번 이기기',icon:'domain',reward:{items:{[BOOK3]:3}}},
 {id:'W_BONUS',kind:'bonus',goal:5,name:'오늘의 임무 보너스 5번',icon:'bonus',reward:{primogem:40,mora:3000}}
];
const catalog=root.CRPGTaskCatalogV0168||{},snapshot169=catalog.snapshotV0169||catalog,snapshot171=catalog.snapshotV01611||catalog,REVISION=172,ROOT_TASK='Q_TASK_LEARN_01',replace=(base,updates)=>base.map(t=>({...t,...(updates||[]).find(x=>x.id===t.id)}));
const DAILY_POOL=[...replace(DAILY,catalog.legacyDaily),...(catalog.daily||[])],WEEKLY_POOL=[...replace(WEEKLY,catalog.legacyWeekly),...(catalog.weekly||[])];
const WEEKLY_BONUS={id:'W_ALL',name:'이번 주 임무 모두 달성',short:'모두 달성',icon:'bonus',reward:{primogem:200},report:true,...catalog.weeklyAllBonus};
const CHAINS=catalog.chains||[],CHAIN_BY=Object.assign(Object.create(null),Object.fromEntries(CHAINS.map(t=>[t.id,t])));
const LEGACY_CHAINS=snapshot169.legacyChains||catalog.legacyChains||catalog.chains||[],LEGACY_CHAIN_BY=Object.fromEntries(LEGACY_CHAINS.map(t=>[t.id,t]));
const BY169=Object.fromEntries([...(snapshot169.daily||[]),...(snapshot169.weekly||[]),DAILY_BONUS,WEEKLY_BONUS].map(t=>[t.id,t])),CHAIN169_BY=Object.fromEntries((snapshot169.chains||CHAINS).map(t=>[t.id,t]));
// Rebuild legacy roots with the original spread order. Native 171 definitions
// are compared byte-for-byte, including their JSON field order.
const DAILY171=[...replace(DAILY,snapshot171.daily),...(snapshot171.daily||[]).filter(t=>!DAILY.some(base=>base.id===t.id))],WEEKLY171=[...replace(WEEKLY,snapshot171.weekly),...(snapshot171.weekly||[]).filter(t=>!WEEKLY.some(base=>base.id===t.id))];
const BY171=Object.fromEntries([...DAILY171,...WEEKLY171,DAILY_BONUS,WEEKLY_BONUS].map(t=>[t.id,t])),CHAIN171_BY=Object.fromEntries((snapshot171.chains||CHAINS).map(t=>[t.id,t]));
const LEGACY_BY=Object.fromEntries([...DAILY,...(snapshot169.legacyDailyDefinitions||catalog.daily||[]),...WEEKLY,...(snapshot169.legacyWeeklyDefinitions||catalog.weekly||[])].map(t=>[t.id,t]));
const BY=Object.assign(Object.create(null),Object.fromEntries([...DAILY_POOL,DAILY_BONUS,...WEEKLY_POOL,WEEKLY_BONUS].map(t=>[t.id,t]))),ACCEPT_CAP=5,WEEKLY_COUNT=WEEKLY_POOL.length,DAILY_COUNT=DAILY_POOL.length;
const BRANCHES={daily:catalog.dailyBranches||{},weekly:catalog.weeklyBranches||{}};
const rootReady=rt=>!!rt.s.quests[ROOT_TASK]?.claimed;
const actionSeq=rt=>num(rt.s.global.LAST_COMMITTED_ACTION_SEQ)+(rt._taskApplying?1:0);
const branchNeeds=(scope,id)=>BRANCHES[scope][id]||[];
function branchReady(box,scope,id){const branches=box.revision===171?(snapshot171[scope+'Branches']||{}):BRANCHES[scope];return (branches[id]||[]).every(pre=>!!box.claimed[pre]);}
const old=Object.fromEntries(['newGame','apply','actionReason','validateSave','startBattle','finishBattle','startLife','acceptCommission','questVisible','questUnlockReason','questConditions','questChoice','claimQuest','commissionEntries'].map(k=>[k,P[k]]));
const E={불:'PYRO',물:'HYDRO',얼음:'CRYO',번개:'ELECTRO',바람:'ANEMO',바위:'GEO',풀:'DENDRO',물리:'PHYSICAL'},element=e=>E[e]||e||'PHYSICAL';
const KINDS=['win','ley','domain','boss','abyss','life','gather','mine','fish','hunt','cook','forge','bonus','commission','chest','oculus','oculusOffer','sleep','process','enhance','equip','bond','encounter','handbook','acquire','achievement','delivery','meal','artifactEnhance'];
function member(rt,id){
 const row=rt.tables['07_CHAR_DB']?.get(id),vision=String(row?.[3]||'').match(/\[(불|물|얼음|번개|바람|바위|풀)\]/)?.[1];
 return {id,element:id===PLAYER?(rt.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'?element(rt.travelerElement?.()||'ANEMO'):'PHYSICAL'):element(vision),rarity:id===PLAYER?0:num(rt.rarityOf?.(id)||4)};
}
function locallyOwned(rt,id){const owned=json(rt.s.global.COMPANION_ELIGIBILITY_JSON);return id===PLAYER||owned[id]?.state==='JOINED'&&!owned[id]?.tutorialLoan;}
function partySnapshot(rt,actors){
 const ids=actors?actors.filter(a=>a.side==='ALLY'&&!a.coop&&!a.summon).map(a=>a.source):rt.s.party.filter(p=>p.active).map(p=>p.source);
 return [...new Set(ids)].filter(id=>id===PLAYER||rt.tables['07_CHAR_DB']?.has(id)).map(id=>({...member(rt,id),owned:locallyOwned(rt,id),alive:actors?actors.some(a=>a.side==='ALLY'&&a.source===id&&!a.coop&&a.hp>0):num(id===PLAYER?rt.s.global.PLAYER_HP_CURRENT:rt.s.chars[id]?.hp)>0}));
}
function partyMatch(members,rule={}){
 members=members.filter(m=>m.alive!==false&&m.owned!==false);
 if(!members.some(m=>m.id===PLAYER))return false;
 if(rule.full&&(members.length!==4||new Set(members.map(m=>m.id)).size!==4))return false;
 if(rule.mono&&members.some(m=>m.element!==element(rule.mono)))return false;
 if((rule.elements||[]).some(e=>!members.some(m=>m.element===element(e))))return false;
 for(const [e,n]of Object.entries(rule.elementCounts||{}))if(members.filter(m=>m.element===element(e)).length<n)return false;
 if((rule.companions||[]).some(id=>id===PLAYER||!members.some(m=>m.id===id)))return false;
 if(rule.companionRarity&&members.some(m=>m.id!==PLAYER&&m.rarity!==rule.companionRarity))return false;
 return true;
}
function partyAchievable(rt,rule){
 if(!rule)return true;if(rule.minLevel&&num(rt.s.global.PLAYER_LEVEL_STATE)<rule.minLevel)return false;
 const owned=json(rt.s.global.COMPANION_ELIGIBILITY_JSON),companions=Object.keys(owned).filter(id=>owned[id]?.state==='JOINED'&&!owned[id]?.tutorialLoan&&rt.tables['07_CHAR_DB']?.has(id)&&id!==PLAYER&&(!rule.minLevel||num(rt.s.chars[id]?.level)>=rule.minLevel)).map(id=>member(rt,id));
 const hero=member(rt,PLAYER),heroElements=rt.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'?(rt.s.travelerElements?.unlocked||['ANEMO']):['PHYSICAL'],required=rule.companions||[];
 if(required.some(id=>!companions.some(m=>m.id===id))||required.length>3)return false;
 const available=companions.filter(m=>(!rule.companionRarity||m.rarity===rule.companionRarity)&&(!rule.mono||m.element===element(rule.mono)));
 if(rule.mono&&!heroElements.map(element).includes(element(rule.mono)))return false;
 const fixed=available.filter(m=>required.includes(m.id)),rest=available.filter(m=>!required.includes(m.id));
 if(fixed.length!==required.length)return false;
 const need=rule.full?4:Math.min(4,1+available.length);
 function fill(start,picked){if(picked.length===need)return partyMatch(picked,rule);for(let i=start;i<rest.length;i++)if(fill(i+1,[...picked,rest[i]]))return true;return false;}
 return heroElements.some(e=>{const base=[{...hero,element:element(e)},...fixed];return !rule.full&&partyMatch(base,rule)||fill(0,base);});
}
function lockOf(rt,t){
 const lv=num(rt.s.global.PLAYER_LEVEL_STATE)||1;
 if(t.kind==='ley'){let st=null;try{st=rt.leyLineStatus?.();}catch{}if(st&&!st.unlocked)return '주인공 Lv.'+st.minLevel+'부터';}
 if(t.filter?.artifactUnlocked&&!rt.s.inventory.some(i=>i.artifact&&num(i.artifact.level)<5))return '강화할 성유물을 얻은 뒤';
 if(t.minLevel&&lv<t.minLevel)return '주인공 Lv.'+t.minLevel+'부터';
 if(!partyAchievable(rt,t.filter?.party))return '필요한 동료·원소 편성을 확보한 뒤';
 if(t.filter?.maps?.some(map=>{const r=rt.tables['32_MAP_DB']?.get(map);return !r||(r[1]&&r[1]!=='몬드'&&!rt.regionVisited?.(r[1]));}))return '해당 지역에 도착한 뒤';
 if(t.kind==='domain'&&rt.growthDomainSites){const f=t.filter||{},sites=rt.growthDomainSites().filter(s=>(!f.maps?.length||f.maps.includes(s.map))&&(!f.domainTypes?.length||f.domainTypes.includes(s.kind))&&(s.region==='몬드'||rt.regionVisited?.(s.region)));if(!sites.some(s=>rt.growthDomainEntries(s.map).some(d=>!d.reason&&(!f.minStage||d.level>=f.minStage)&&(!f.stages?.length||f.stages.includes(d.level)))))return '입장 가능한 비경을 연 뒤';}
 if(['gather','mine','fish','hunt'].includes(t.kind)){const f=t.filter||{},maps=f.maps?.length?f.maps:rt.rows('32_MAP_DB').filter(r=>r[1]==='몬드'||rt.regionVisited?.(r[1])).map(r=>r[0]);if(!maps.some(m=>rt.lifePool?.(t.kind.toUpperCase(),m).some(p=>!f.resources?.length||f.resources.includes(p.item))))return '해당 자원을 얻을 수 있는 지역을 연 뒤';}
 if(['cook','forge'].includes(t.kind)&&t.filter?.recipes?.length){const bought=Object.keys(json(rt.s.global.SHOP_STOCK_USAGE_STATE));if(!t.filter.recipes.some(id=>{let r;try{r=rt.recipeDefinition?.(id)||rt.tables['17_RECIPE_DB']?.get(id);}catch{return false;}if(!r||/레거시|사용 금지/.test(r[18]||''))return false;const req=String(r[18]||''),purchased=req.match(/^(STK_\w+(?: 또는 STK_\w+)*) 구매완료$/);return purchased?purchased[1].split(' 또는 ').some(s=>bought.some(k=>k.startsWith(s+'|'))):['','없음','기본','기본 해금','전투 중 아님'].includes(req)||!!api.condition(req,rt.vars());}))return '필요한 제작법을 해금한 뒤';}
 if(t.kind==='abyss'){const floors=t.filter?.stages?.length?t.filter.stages:[t.filter?.minStage||1],abyss=rt.abyssCurrent?.()||rt.s.abyss;if(!floors.some(floor=>{const f=api.abyssConfig?.floors?.find(f=>f.floor===floor),needed=floor>=10?60:Math.max(10,num(f?.level)-5);return (floor===1||abyss?.clears?.[floor-1])&&partyAchievable(rt,{...t.filter?.party,full:true,minLevel:needed});}))return '앞선 층과 파티 전원 입장 조건을 달성한 뒤';}
 if(t.kind==='boss'&&lv<15)return '주인공 Lv.15부터';
 if(t.kind==='abyss'&&lv<10)return '주인공 Lv.10부터';
 return '';
}
function slotOf(t,scope){if(t.slot)return t.slot;if(['ley','domain','bonus'].includes(t.kind))return t.kind;if(scope==='weekly'&&t.kind==='boss')return 'boss';return ['life','gather','mine','fish','hunt','cook','forge'].includes(t.kind)?'life':'win';}
function hash(text){let h=2166136261;for(const c of String(text)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rewardAt(t,level){const r=copy(t.reward||{}),steps=r.moraByLevel;if(Array.isArray(steps)){let mora=num(r.mora);for(const entry of steps){const min=Array.isArray(entry)?entry[0]:entry.minLevel,value=Array.isArray(entry)?entry[1]:entry.mora;if(level>=num(min))mora=num(value);}if(mora>0)r.mora=mora;else delete r.mora;delete r.moraByLevel;}return r;}
function elementalChoices(rt){
 const owned=json(rt.s.global.COMPANION_ELIGIBILITY_JSON),companions=Object.keys(owned).filter(id=>owned[id]?.state==='JOINED'&&!owned[id]?.tutorialLoan&&rt.s.chars[id]?.hp>0&&rt.tables['07_CHAR_DB']?.has(id)).map(id=>member(rt,id));
 const hero=member(rt,PLAYER),heroElements=num(rt.s.global.PLAYER_HP_CURRENT)>0?(rt.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'?(rt.s.travelerElements?.unlocked||['ANEMO']).map(element):[]):[];
 const elements=[...new Set([...companions.map(m=>m.element),...heroElements])].filter(e=>e!=='PHYSICAL').sort(),choices=[];
 function feasible(es){return heroElements.some(h=>es.filter(e=>e!==h).every(e=>companions.some(m=>m.element===e)))||es.every(e=>companions.some(m=>m.element===e));}
 for(const e of elements)if(feasible([e]))choices.push([e]);for(let i=0;i<elements.length;i++)for(let j=i+1;j<elements.length;j++)if(feasible([elements[i],elements[j]]))choices.push([elements[i],elements[j]]);return choices;
}
function definition(rt,t,{legacy=false,revision=REVISION,individual=true,period,selectedElements,previousElements,level}={}){
 const d=copy(t);d.reward=rewardAt(t,level??(num(rt.s.global.PLAYER_LEVEL_STATE)||1));d.assignedLevel=level??(num(rt.s.global.PLAYER_LEVEL_STATE)||1);d.revision=legacy?168:revision;d.individual=individual;if(legacy&&d.id?.startsWith('D_'))delete d.reward.primogem;if(legacy&&d.id?.startsWith('W_')){delete d.reward.primogem;const slot=slotOf(d,'weekly');if(slot==='boss')d.reward.primogem=30;if(slot==='bonus')d.reward.primogem=40;}
 if(d.dynamicElements){const options=elementalChoices(rt),index=(hash(rt.s.global.SAVE_ID+':elements')+period)%Math.max(1,options.length);let es=selectedElements||options[index];if(!selectedElements&&options.length>1&&JSON.stringify(es)===JSON.stringify(previousElements))es=options[(index+1)%options.length];if(es?.length){d.selectedElements=es.slice();d.filter={...(d.filter||{}),party:{elements:es.slice()}};const labels={ANEMO:'바람',GEO:'바위',PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',DENDRO:'풀'};d.name=es.map(e=>labels[e]).join('·')+' 원소 캐릭터 포함 '+d.goal+'승';d.short='원소 편성 '+d.goal+'승';}else{d.selectedElements=[];delete d.filter?.party;d.name=d.fallbackName||'전투 '+d.goal+'번 이기기';d.short=d.fallbackShort||d.goal+'번 이기기';}}
 return d;
}
function rotate(rt,scope,period,keep=[]){
 const remainingReports=t=>{
  if(scope!=='weekly'||t.id!=='W_BONUS')return true;
  const box=rt.s.tasks,today=dayOf(rt.tasksNow()),days=(period+1)*7-3-today-(box?.day===today&&box.claimed?.D_BONUS?1:0);
  const progress=box?.week===period&&box.weeklyIds?.includes(t.id)?num(box.weeklyProgress?.[t.id]):0;
  return progress+Math.max(0,days)>=t.goal;
 };
 const pool=scope==='daily'?DAILY_POOL:WEEKLY_POOL,eligible=new Set(pool.filter(t=>!lockOf(rt,t)&&remainingReports(t)).map(t=>t.id)),chosen=new Set(keep.filter(id=>pool.some(t=>t.id===id)));
 // A period has one fixed eligible plan. Availability changes never reroll already assigned rewards.
 function include(id,path=new Set()){
  if(chosen.has(id))return true;if(!eligible.has(id)||path.has(id))return false;
  const next=new Set(path);next.add(id);if(!branchNeeds(scope,id).every(pre=>include(pre,next)))return false;chosen.add(id);return true;
 }
 for(const t of pool)include(t.id);return pool.filter(t=>chosen.has(t.id)).map(t=>t.id);
}
function selected(box,scope){return (box[scope+'Ids']||[]).map(id=>box[scope+'Definitions']?.[id]||BY[id]).filter(Boolean);}
function progressOf(box,scope,t){const progress=box[scope+'Progress'];return progress&&Object.hasOwn(progress,t.id)?num(progress[t.id]):t.individual||t.filter?0:num(box[scope]?.[t.kind]);}
function activate(rt,box,scope){
 const key=scope+'ActiveSeq';box[key]??={};if(!rootReady(rt))return;
 for(const t of selected(box,scope))if(!box.claimed[t.id]&&branchReady(box,scope,t.id)&&box[key][t.id]===undefined)box[key][t.id]=actionSeq(rt);
}
P.tasksNow=function(){return num(this.actionStartedAt??Date.now())||Date.now();};
P.tasksBox=function(write=false){
 const t=this.tasksNow(),day=dayOf(t),week=weekOf(t),b=this.s.tasks;let box=b&&b.version===1?b:{version:1,revision:REVISION,day,week,daily:{},weekly:{},claimed:{}};let changed=box!==b;
 const freshScope=scope=>{
  const period=scope==='daily'?day:week,previousElements=scope==='daily'?(Object.values(box.dailyDefinitions||{}).find(d=>d.dynamicElements)?.selectedElements||box.lastDailyElements):undefined;
  box[scope]={};box[scope+'Progress']={};box[scope+'ActiveSeq']={};box[scope+'Opened']=rootReady(this);box[scope+'Ids']=rootReady(this)?rotate(this,scope,period):[];
  box[scope+'Definitions']=Object.fromEntries(box[scope+'Ids'].map(id=>[id,definition(this,BY[id],{period,previousElements})]));
  if(scope==='daily')box.lastDailyElements=Object.values(box.dailyDefinitions).find(d=>d.dynamicElements)?.selectedElements||[];
  if(scope==='weekly')box.weeklyExpansionVersion=REVISION;
  for(const id of Object.keys(box.claimed))if(id.startsWith(scope==='daily'?'D_':'W_'))delete box.claimed[id];
 };
 if(box.day!==day||box.week!==week){box=copy(box);changed=true;if(box.day!==day){box.day=day;freshScope('daily');}if(box.week!==week){box.week=week;freshScope('weekly');}}
 for(const scope of ['daily','weekly']){
  const period=scope==='daily'?day:week;
  if(!box[scope+'Ids']){
   if(box===b&&!box.revision){box[scope+'Ids']=(scope==='daily'?DAILY:WEEKLY).map(t=>t.id);changed=true;}
   else{freshScope(scope);changed=true;}
  }
  if(!box[scope+'Definitions']){
   box[scope+'Definitions']=Object.fromEntries(box[scope+'Ids'].map(id=>{const d=LEGACY_BY[id]||BY169[id]||BY[id];return [id,definition(this,d,{legacy:true,individual:!!d.filter,period})];}));changed=true;
  }
  if(box.revision!==REVISION){
   const strict171=box.revision===171,prior=box[scope+'Ids'].filter(id=>BY[id]),defs=box[scope+'Definitions'],priorActive=box[scope+'ActiveSeq']||{},progress=Object.fromEntries(prior.map(id=>[id,Math.min(defs[id].goal,progressOf(box,scope,defs[id]))])),ids=strict171?prior:rootReady(this)?rotate(this,scope,period,prior):prior;
   box[scope+'Ids']=ids;box[scope+'Definitions']=Object.fromEntries(ids.map(id=>[id,defs[id]||definition(this,BY[id],{period})]));
   box[scope+'Progress']=Object.fromEntries(ids.map(id=>[id,progress[id]||0]));box[scope+'ActiveSeq']=strict171?Object.fromEntries(ids.filter(id=>Object.hasOwn(priorActive,id)).map(id=>[id,priorActive[id]])):{};box[scope+'Opened']=rootReady(this);if(scope==='weekly')box.weeklyExpansionVersion=REVISION;changed=true;
  }
  if(rootReady(this)&&box[scope+'Opened']!==true){
   const prior=box[scope+'Ids'],defs=box[scope+'Definitions'],ids=rotate(this,scope,period,prior);
   box[scope+'Ids']=ids;box[scope+'Definitions']=Object.fromEntries(ids.map(id=>[id,defs[id]||definition(this,BY[id],{period})]));
   box[scope+'Progress']??={};for(const id of ids)if(box[scope+'Progress'][id]===undefined)box[scope+'Progress'][id]=0;box[scope+'Opened']=true;changed=true;
  }
  activate(this,box,scope);
 }
 if(box.revision!==REVISION){box.revision=REVISION;changed=true;}if(write||changed)this.s.tasks=box;return box;
};
function eventMatch(t,event){
 if(!event||!event.kinds?.includes(t.kind))return false;const f=t.filter||{};
 if(f.maps?.length&&!f.maps.includes(event.map))return false;
 if(f.enemies?.length&&!f.enemies.some(id=>event.enemies?.includes(id)))return false;
 if(f.stages?.length&&!f.stages.includes(event.stage))return false;
 if(f.minStage&&num(event.stage)<f.minStage)return false;
 if(f.minTier&&num(event.tier)<f.minTier)return false;
 if(f.domainTypes?.length&&!f.domainTypes.includes(event.domainType))return false;
 if(f.leyTypes?.length&&!f.leyTypes.includes(event.leyType))return false;
 if(f.recipes?.length&&!f.recipes.includes(event.recipe))return false;
 if(f.resources?.length&&!f.resources.some(id=>num(event.items?.[id])>0))return false;
 if(f.actions?.length&&!f.actions.includes(event.action))return false;
 if(f.entities?.length&&!f.entities.includes(event.entity))return false;
 if(f.equipment?.length&&!f.equipment.includes(event.equipment))return false;
 if(f.equipmentOutput&&event.equipmentOutput!==true)return false;
 if(f.party&&!partyMatch(event.party||[],f.party))return false;
 return true;
}
function amountOf(t,event){if(t.countMode==='actions')return 1;if(t.countMode==='units'&&!t.filter?.resources?.length)return Object.values(event.items||{}).reduce((n,q)=>n+num(q),0);return t.filter?.resources?.length?t.filter.resources.reduce((n,id)=>n+num(event.items?.[id]),0):['cook','forge'].includes(t.kind)?Math.max(1,num(event.quantity)):1;}
P.tasksCount=function(kind,n=1,event=null){
 if(!KINDS.includes(kind)||!ok(n)||n<=0)return;const box=this.tasksBox(true);
 for(const scope of ['daily','weekly']){if(event&&event[scope==='daily'?'day':'week']!==box[scope==='daily'?'day':'week'])continue;
  box[scope][kind]=Math.min(Number.MAX_SAFE_INTEGER,num(box[scope][kind])+n);
  for(const t of selected(box,scope)){const activated=box[scope+'ActiveSeq']?.[t.id];if(!rootReady(this)||box.claimed[t.id]||!branchReady(box,scope,t.id)||activated===undefined||!event||event.startedSeq<activated||t.kind!==kind||!eventMatch(t,event))continue;const key=scope+'Progress';box[key]??={};box[key][t.id]=Math.min(t.goal,num(box[key][t.id])+amountOf(t,event));}}
 if(event)for(const current of CHAINS){const q=this.s.quests[current.id],c=q?.taskObjective,t=c?.definition||current;if(!q?.guildAccepted||q.claimed||!c||c.progress>=t.goal||t.kind!==kind||c.acceptedSeq>event.startedSeq||!eventMatch(t,event))continue;
  c.progress=Math.min(t.goal,c.progress+amountOf(t,event));if(c.progress>=t.goal){q.node='READY_TO_CLAIM';q.state='진행중';}}
};
P.taskView=function(){
 const box=this.tasksBox(false),guild=!!this.atGuild?.(),open=rootReady(this),row=(t,have,scope)=>{const lock=lockOf(this,t),goal=t.goal||1,progress=Math.min(goal,num(have)),claimed=!!box.claimed[t.id],done=claimed||progress>=goal;return {id:t.id,scope,name:t.name,short:t.short||t.name,icon:t.icon,goal,progress,done,claimed,lock:done?'':lock,report:!!t.report,here:done&&!claimed&&(!t.report||guild),reward:copy(t.reward||{})};};
 const rows=scope=>selected(box,scope).map(t=>row(t,progressOf(box,scope,t),scope));
 const plannedDaily=rows('daily'),plannedWeekly=rows('weekly'),visible=(rows,scope)=>open?rows.filter(x=>!x.claimed&&branchReady(box,scope,x.id)):[];
 const daily=visible(plannedDaily,'daily'),weekly=visible(plannedWeekly,'weekly');
 const allBonus=(def,list,scope)=>{const x=row({...def,goal:list.length||1},list.filter(x=>x.done).length,scope);if(!open&&!x.claimed){x.lock='의뢰 접수 연습을 보고한 뒤';x.here=false;}return x;};
 const bonus=allBonus(DAILY_BONUS,plannedDaily,'daily'),weeklyBonus=allBonus(WEEKLY_BONUS,plannedWeekly,'weekly');
 const all=[...daily,bonus,...weekly,weeklyBonus],t=this.tasksNow();return {daily,bonus,weekly,weeklyBonus,ready:all.filter(x=>x.done&&!x.claimed&&!x.lock).length,here:all.filter(x=>x.here).length,atGuild:guild,acceptCap:ACCEPT_CAP,accepted:this.taskAcceptedCount(),dailyTotal:plannedDaily.length,weeklyTotal:plannedWeekly.length,dayEndsAt:(dayOf(t)+1)*DAY-KST,weekEndsAt:(weekOf(t)+1)*WEEK-KST-3*DAY};
};
const REPORT='캐서린에게 보고해야 받을 수 있습니다.';
P.taskReason=function(id){if(this.s.runtime)return '전투가 끝난 뒤 받을 수 있습니다.';if(this.tasksBox(false).claimed[id])return '이미 받은 보상입니다.';const v=this.taskView(),list=[...v.daily,v.bonus,...v.weekly,v.weeklyBonus];if(id==='ALL')return list.some(x=>x.here)?'':list.some(x=>x.done&&!x.claimed)?REPORT:'받을 임무 보상이 없습니다.';const x=list.find(x=>x.id===id);if(!x)return '임무를 찾을 수 없습니다.';if(x.claimed)return '이미 받은 보상입니다.';if(x.lock)return x.lock+' 할 수 있습니다.';if(!x.done)return '아직 달성하지 않았습니다 ('+x.progress+'/'+x.goal+').';if(!x.here)return REPORT;return '';};
P.taskClaim=function(id){
 const why=this.taskReason(id);if(why)fail('TASK',why);const v=this.taskView(),list=[...v.daily,v.bonus,...v.weekly,v.weeklyBonus],targets=id==='ALL'?list.filter(x=>x.here):list.filter(x=>x.id===id),box=this.tasksBox(true),g=this.s.global,got={mora:0,primogem:0,items:{}};
 for(const x of targets){box.claimed[x.id]=1;const r=x.reward||{};if(r.mora){g.MORA=num(g.MORA)+r.mora;got.mora+=r.mora;}if(r.primogem){g.PRIMOGEM=num(g.PRIMOGEM)+r.primogem;got.primogem+=r.primogem;}for(const [item,n]of Object.entries(r.items||{})){this.giveItem(item,n);got.items[item]=(got.items[item]||0)+n;}if(x.id==='D_BONUS'){const stamp=startStamp(this);this.tasksCount('bonus',1,{...stamp,kinds:['bonus']});}}
 this.tasksBox(true);
 return {claimed:targets.map(x=>x.id),names:targets.map(x=>x.name),...got};
};
P.taskActivitySnapshot=function(){return startStamp(this);};
P.taskRecordActivity=function(kind,event={}){if(event.success===false)return;const stamp=event.version===1?event:startStamp(this);this.tasksCount(kind,1,{...stamp,...event,kinds:event.kinds||[kind]});};
P.taskAcceptedCount=function(){return Object.entries(this.s.quests||{}).filter(([id,q])=>!q.claimed&&this.isCommission(id)&&this.commissionAccepted(id)).length;};
function battleStamp(rt,b,stamp){const enemies=b.actors.filter(a=>a.side==='ENEMY').map(a=>a.source);if(b.fieldBoss?.boss)enemies.push(b.fieldBoss.boss);return {...stamp,party:partySnapshot(rt,b.actors).map(m=>({...m,alive:stamp.party.find(a=>a.id===m.id)?.alive??m.alive})),enemies:[...new Set(enemies)],stage:b.abyss?.floor||b.growthDomain?.level||b.leyLine?.level||0,tier:b.leyLine?.tier||0,domainType:b.growthDomain?.kind||'',leyType:b.leyLine?.kind||''};}
function startStamp(rt,party=partySnapshot(rt)){rt.tasksBox(false);const now=rt.tasksNow();return {version:1,day:dayOf(now),week:weekOf(now),startedSeq:num(rt.s.global.LAST_COMMITTED_ACTION_SEQ),map:rt.s.global.CURRENT_MAP_ID,party};}
P.startBattle=function(...args){
 const stamp=startStamp(this),before=this.s.runtime,prior=this._tasksStartingSnapshot;this._tasksStartingSnapshot=stamp;
 try{const out=old.startBattle.apply(this,args),b=this.s.runtime;if(b&&b!==before)b.taskSnapshot=battleStamp(this,b,stamp);return out;}finally{this._tasksStartingSnapshot=prior;}
};
P.startLife=function(...args){const stamp=startStamp(this),out=old.startLife.apply(this,args);if(this.s.lifeJob)this.s.lifeJob.taskSnapshot=stamp;return out;};
P.finishBattle=function(victory){
 const b=this.s.runtime,kind=b?{ley:!!b.leyLine,domain:!!b.growthDomain,boss:!!b.fieldBoss,abyss:!!b.abyss}:null;
 const stamp=b?.taskSnapshot||(b?battleStamp(this,b,this._tasksStartingSnapshot||startStamp(this)):startStamp(this)),partyAtStart=(stamp.party||[]).map(m=>({...m,owned:typeof m.owned==='boolean'?m.owned:locallyOwned(this,m.id)}));
 const out=old.finishBattle.call(this,victory),receipt=b&&(this.s.combatReceipts?.[b.id]||json(this.s.global.LAST_BATTLE_RESULT_JSON));
 if(b&&kind&&receipt?.victory===true&&(receipt.battleId||receipt.id)===b.id){
  const event={...stamp,party:partyAtStart,enemies:[...new Set([...(stamp.enemies||[]),...(b.fieldBoss?.boss?[b.fieldBoss.boss]:[])])],stage:b.abyss?.floor||b.growthDomain?.level||b.leyLine?.level||0,tier:b.leyLine?.tier||0,domainType:b.growthDomain?.kind||'',leyType:b.leyLine?.kind||'',kinds:['win',...(kind.ley?['ley']:[]),...(kind.domain?['domain']:[]),...(kind.boss?['boss']:[]),...(kind.abyss?['abyss']:[])]};
  this.tasksCount('win',1,event);if(kind.ley)this.tasksCount('ley',1,event);if(kind.domain)this.tasksCount('domain',1,event);if(kind.boss)this.tasksCount('boss',1,event);if(kind.abyss)this.tasksCount('abyss',1,event);
 }return out;
};
P.installTaskCommissions=function(){
 if(this._taskCommissionsInstalled||!CHAINS.length)return;const rows=this.db['22_QUEST_DB'].map(r=>r.slice());
 for(const t of CHAINS){if(rows.some(r=>r[0]===t.id))continue;const map=t.map||t.filter?.maps?.[0]||'MAP_MOND_CITY',region=t.region||this.tables['32_MAP_DB']?.get(map)?.[1]||(map.startsWith('MAP_L')?'리월':'몬드');
  const d={schema:1,kind:'exploration',map_id:map,conditions:{min_level:t.minLevel||1,unclaimed:true},start:'INVESTIGATE',text:t.description||t.name,choices:[],claim_node:'READY_TO_CLAIM',revisit:'보고를 마친 의뢰입니다.',authorship:'CRPG_TASK_V0168'};
  rows.push([t.id,t.name,region,region==='리월'?'NPC_LIYUE_KATHERYNE':'NPC_MOND_KATHERYNE','',t.description||t.name,'',null,'','수락 이후 실제 활동만 집계',JSON.stringify(d),JSON.stringify(t.reward||{}), 'READY','CRPG_TASK_V0168']);}
 this.db={...this.db,'22_QUEST_DB':rows};this.tables['22_QUEST_DB']=new Map(rows.slice(1).filter(r=>r?.[0]).map(r=>[r[0],r]));this._taskCommissionsInstalled=true;
};
P.newGame=function(...args){const out=old.newGame.apply(this,args);this.installTaskCommissions();return out;};
function objectiveOf(rt,id){return rt.s.quests[id]?.taskObjective?.definition||CHAIN_BY[id];}
P.questUnlockReason=function(id){
 const accepted=this.commissionAccepted(id),t=objectiveOf(this,id);
 if(id!==ROOT_TASK&&this.isCommission(id)&&!accepted&&!rootReady(this))return '의뢰 접수 연습을 먼저 보고해 주세요.';
 if(t&&!accepted){const needs=catalog.oneTimeBranches?.[id]||[t.predecessor,...(t.prerequisites||[])].filter(Boolean);if(needs.some(pre=>!this.s.quests[pre]?.claimed))return '선행 의뢰를 보고한 뒤 받을 수 있습니다.';const lock=lockOf(this,t);if(lock)return lock+' 받을 수 있습니다.';}
 return old.questUnlockReason.call(this,id);
};
P.questVisible=function(id){return (!CHAIN_BY[id]||this.commissionAccepted(id)||!this.questUnlockReason(id))&&old.questVisible.call(this,id);};
function deliveryAvailable(rt,inv){const id=inv.equip||inv.item,row=rt.tables[inv.equip?'16_EQUIP_DB':'14_ITEM_DB']?.get(id);if(!row||inv.locked||/^(KEY_|CUR_|SYS_)/.test(id)||(!inv.equip&&[true,'Y','TRUE'].includes(row[19]))||rt.s.preparedTools?.includes(id))return false;if(inv.equip&&(inv.equipped||inv.owner&&inv.owner!=='공용'||num(inv.enhance)>0||num(inv.ascension)>0||num(inv.enhancementCap)>10||num(inv.refinement)>0||num(inv.refine)>0||inv.artifact||inv.bound||/EX|스토리 전용|퀘스트/.test(String(row[27])+' '+String(row[26]))))return false;return true;}
P.taskDeliveryPlan=function(t){
 const spec=t.delivery||{},items={},slots=[];for(const [id,n]of Object.entries(spec.items||{})){if(!ok(n)||n<1||!this.tables['14_ITEM_DB'].has(id))fail('QUEST_DELIVERY','납품 물품 정의를 확인해 주세요.');const available=this.s.inventory.filter(i=>i.item===id&&deliveryAvailable(this,i)).reduce((a,i)=>a+num(i.quantity),0)-num(this.s.specialFoodLots?.[id]?.BARBARA_SPECIAL);if(available<n)fail('QUEST_DELIVERY',(this.tables['14_ITEM_DB'].get(id)?.[1]||id)+' '+n+'개를 준비해 주세요.');items[id]=n;}
 for(const [id,n]of Object.entries(spec.equipment||{})){if(!ok(n)||n<1||!this.tables['16_EQUIP_DB'].has(id))fail('QUEST_DELIVERY','납품 장비 정의를 확인해 주세요.');const choices=this.s.inventory.filter(i=>i.equip===id&&deliveryAvailable(this,i)).sort((a,b)=>a.slot.localeCompare(b.slot));if(choices.length<n)fail('QUEST_DELIVERY',(this.tables['16_EQUIP_DB'].get(id)?.[1]||id)+' 미강화·미장착·잠금 해제 장비 '+n+'개를 준비해 주세요.');slots.push(...choices.slice(0,n).map(i=>i.slot));}
 if(!Object.keys(items).length&&!slots.length)fail('QUEST_DELIVERY','납품 목표가 없습니다.');return {items,slots};
};
P.taskRefreshDeliveryObjectives=function(){for(const current of CHAINS){const q=this.s.quests[current.id],c=q?.taskObjective,t=c?.definition||current;if(t.kind!=='delivery'||!q?.guildAccepted||q.claimed||!c)continue;let ready=false;try{this.taskDeliveryPlan(t);ready=true;}catch{}c.progress=ready?t.goal:0;q.node=ready?'READY_TO_CLAIM':'INVESTIGATE';q.state='진행중';}};
P.commissionEntries=function(){this.installTaskCommissions();this.taskRefreshDeliveryObjectives();return old.commissionEntries.call(this).filter(q=>!CHAIN_BY[q.row[0]]||this.questVisible(q.row[0])).map(q=>{const t=objectiveOf(this,q.row[0]);if(!t)return q;const row=q.row.slice();row[1]=t.name;row[11]=JSON.stringify(t.reward||{});return {...q,row,reward:copy(t.reward||{}),taskObjective:copy(this.s.quests[t.id]?.taskObjective||{})};});};
P.acceptCommission=function(id){const unlock=this.questUnlockReason(id);if(unlock)fail('QUEST_UNLOCK',unlock);if(this.taskAcceptedCount()>=ACCEPT_CAP)fail('COMMISSION_CAP','의뢰는 동시에 5개까지 받을 수 있습니다. 완료한 의뢰를 보고한 뒤 받아 주세요.');const out=old.acceptCommission.call(this,id);if(CHAIN_BY[id])this.s.quests[id].taskObjective={version:2,progress:0,acceptedSeq:num(this.s.global.LAST_COMMITTED_ACTION_SEQ)+1,definition:definition(this,CHAIN_BY[id])};if(id===ROOT_TASK&&out?.accepted&&this.s.quests[id]?.taskObjective){const q=this.s.quests[id];q.taskObjective.progress=q.taskObjective.definition.goal;q.node='READY_TO_CLAIM';}this.taskRefreshDeliveryObjectives();return out;};
P.questConditions=function(id){const t=objectiveOf(this,id);if(!t)return old.questConditions.call(this,id);if(t.kind==='delivery')this.taskRefreshDeliveryObjectives();const why=this.questUnlockReason(id);if(why)return why;const q=this.s.quests[id];if(!q?.guildAccepted)return '안내원에게 의뢰를 먼저 받아 주세요.';if(q.claimed||q.taskObjective?.progress>=t.goal)return '';return t.name+' ('+num(q.taskObjective?.progress)+'/'+t.goal+')';};
P.questChoice=function(id,choice){if(CHAIN_BY[id])fail('QUEST_OBJECTIVE',this.questConditions(id)||'실제 활동을 마친 뒤 캐서린에게 보고해 주세요.');return old.questChoice.call(this,id,choice);};
P.claimQuest=function(id,...args){
 const t=objectiveOf(this,id);if(!t)return old.claimQuest.call(this,id,...args);const before=copy(this.s),q=this.s.quests[id],row=this.tables['22_QUEST_DB'].get(id);
 try{if(q?.claimed)fail('ALREADY_CLAIMED','이미 보상을 수령했습니다.');if(t.kind==='delivery')this.taskRefreshDeliveryObjectives();if(!q?.guildAccepted||!q.taskObjective||q.taskObjective.progress<t.goal)fail('QUEST_OBJECTIVE','수락 이후 목표 활동을 먼저 완료해 주세요.');
  const plan=t.kind==='delivery'?this.taskDeliveryPlan(t):null,rewardRow=row.slice();rewardRow[11]=JSON.stringify(t.reward||{});this.tables['22_QUEST_DB'].set(id,rewardRow);
  if(plan){this._foodSpendLots=Object.fromEntries(Object.entries(plan.items).map(([item,n])=>[item,{NORMAL:n,BARBARA_SPECIAL:0}]));try{this.pay({items:plan.items});}finally{delete this._foodSpendLots;}this.s.inventory=this.s.inventory.filter(i=>!plan.slots.includes(i.slot));}
  const out=old.claimQuest.call(this,id,...args),paid=num(t.reward?.primogem);if(t.rewardScale==='absolute'){const extra=num(out?.rewards?.mora)-num(t.reward?.mora);this.s.global.MORA-=extra;if(out?.rewards)out.rewards.mora=num(t.reward?.mora);}if(paid>0)this.s.global.PRIMOGEM=num(this.s.global.PRIMOGEM)+paid;this.s.quests[id].taskObjective.primogemPaid=paid;if(id===ROOT_TASK)this.tasksBox(true);if(plan)out.delivered=plan;return out;
 }catch(e){this.s=before;throw e;}finally{this.tables['22_QUEST_DB'].set(id,row);}
};
P.actionReason=function(type,a={}){
 if(type==='TASK_CLAIM')return this.taskReason(String(a.task||''));
 if(CHAIN_BY[a.quest]&&['COMMISSION_ACCEPT','CLAIM_QUEST','QUEST_CHOICE'].includes(type)){const unlock=this.questUnlockReason(a.quest);if(unlock)return unlock;if(type==='QUEST_CHOICE')return this.questConditions(a.quest)||'실제 활동을 마친 뒤 캐서린에게 보고해 주세요.';if(type==='CLAIM_QUEST'){const t=objectiveOf(this,a.quest);if(t.kind==='delivery'){this.taskRefreshDeliveryObjectives();try{this.taskDeliveryPlan(t);}catch(e){return e.message;}}if(num(this.s.quests[a.quest]?.taskObjective?.progress)<t.goal)return '수락 이후 목표 활동을 먼저 완료해 주세요.';}}
 const reason=old.actionReason.call(this,type,a);if(reason)return reason;if(type==='COMMISSION_ACCEPT'&&this.taskAcceptedCount()>=ACCEPT_CAP)return '의뢰는 동시에 5개까지 받을 수 있습니다. 완료한 의뢰를 보고한 뒤 받아 주세요.';return '';
};
P.apply=function(a){
 // Synchronize the period before the activity starts, so its first real action counts.
 this.tasksBox(false);
 const applying=this._taskApplying;this._taskApplying=true;try{
 if(a?.type==='TASK_CLAIM')return this.taskClaim(String(a.task||''));const job=this.s.lifeJob?copy(this.s.lifeJob):null,stamp=a?.type==='CRAFT'?startStamp(this):null,out=old.apply.call(this,a);
 if(a?.type==='LIFE_FINISH'&&out&&!out.empty&&['GATHER','MINE','FISH','HUNT'].includes(out.kind)&&Object.values(out.items||{}).some(n=>num(n)>0)){
  const specific=out.kind.toLowerCase(),event={...(job?.taskSnapshot||startStamp(this)),map:job?.map||this.s.global.CURRENT_MAP_ID,kinds:['life',specific],items:out.items};this.tasksCount('life',1,event);this.tasksCount(specific,1,event);
 }
 if(a?.type==='CRAFT'&&out?.recipe&&num(out.quantity)>0){const r=this.tables['17_RECIPE_DB']?.get(out.recipe),kind=r?.[1]==='요리'?'cook':['단조','제작'].includes(r?.[1])?'forge':null;if(kind)this.tasksCount(kind,1,{...stamp,kinds:[kind],action:'CRAFT',equipment:r?.[2]==='EQUIP'?r[3]:'',equipmentOutput:r?.[2]==='EQUIP',recipe:out.recipe,quantity:num(out.crafts??a.quantity??1),items:{[out.result]:num(out.quantity)}});}
 this.taskRefreshDeliveryObjectives();return out;
 }finally{this._taskApplying=applying;}
};
P.validateSave=function(s){
 this.installTaskCommissions();const out=old.validateSave.call(this,s)||s,t=out.tasks,bad=()=>fail('TASK_SAVE','임무 기록이 올바르지 않습니다.');
 const facade=Object.create(this);facade.s=out;
 const validDefinition=(d,id,isChain=false)=>{
  if(!plain(d)||d.id!==id||![168,169,171,REVISION].includes(d.revision)||!ok(d.assignedLevel)||d.assignedLevel<1||d.assignedLevel>60||typeof d.individual!=='boolean')return false;
  const base=isChain?(d.revision===168?LEGACY_CHAIN_BY[id]:d.revision===169?CHAIN169_BY[id]:d.revision===171?CHAIN171_BY[id]:CHAIN_BY[id]):(d.revision===168?LEGACY_BY[id]:d.revision===169?BY169[id]:d.revision===171?BY171[id]:BY[id]);
  if(!base||d.individual!==(d.revision===168&&!isChain?!!base.filter:true))return false;
  if(d.selectedElements!==undefined&&(!base.dynamicElements||!Array.isArray(d.selectedElements)||d.selectedElements.length>2||new Set(d.selectedElements).size!==d.selectedElements.length||d.selectedElements.some(e=>!['PYRO','HYDRO','CRYO','ELECTRO','ANEMO','GEO','DENDRO'].includes(e))))return false;
  const expected=definition(facade,base,{legacy:d.revision===168,revision:d.revision,individual:d.individual,selectedElements:d.selectedElements,period:t?.day||dayOf(this.tasksNow()),level:d.assignedLevel});return JSON.stringify(d)===JSON.stringify(expected);
 };
 if(t!==undefined){
  if(!plain(t)||t.version!==1||t.revision!==undefined&&![169,171,REVISION].includes(t.revision)||!ok(t.day)||!ok(t.week)||t.day>dayOf(this.tasksNow())||t.week>weekOf(this.tasksNow())||!plain(t.daily)||!plain(t.weekly)||!plain(t.claimed))bad();
  for(const counts of [t.daily,t.weekly])for(const[kind,n]of Object.entries(counts))if(!KINDS.includes(kind)||!ok(n))bad();
  for(const[k,v]of Object.entries(t.claimed))if(!(BY[k]||BY171[k]||BY169[k]||LEGACY_BY[k])||v!==1)bad();
  for(const scope of ['daily','weekly']){
   const ids=t[scope+'Ids'],progress=t[scope+'Progress'],defs=t[scope+'Definitions'],active=t[scope+'ActiveSeq'],current=[171,REVISION].includes(t.revision),periodBy=t.revision===171?BY171:BY,limit=current?(t.revision===171?snapshot171[scope].length:(scope==='daily'?DAILY_COUNT:WEEKLY_COUNT)):(scope==='daily'?4:20);
   if(current&&(!Array.isArray(ids)||!plain(defs)||!plain(progress)||!plain(active)||t[scope+'Opened']!==rootReady(facade)))bad();
   if(ids!==undefined&&(!Array.isArray(ids)||ids.length>limit||!current&&scope==='daily'&&ids.length!==4||new Set(ids).size!==ids.length||ids.some(id=>!(periodBy[id]||!current&&(BY169[id]||LEGACY_BY[id]))||id==='D_BONUS'||id==='W_ALL'||!id.startsWith(scope==='daily'?'D_':'W_'))))bad();
   if(defs!==undefined){if(!plain(defs)||!ids||Object.keys(defs).length!==ids.length)bad();for(const id of ids){if(!validDefinition(defs[id],id))bad();if(current&&[171,REVISION].includes(defs[id].revision)&&(num(progress?.[id])>0||t.claimed[id])&&(!rootReady(facade)||!branchReady(t,scope,id)||active[id]===undefined))bad();}}
   if(progress!==undefined){if(!plain(progress))bad();for(const[id,n]of Object.entries(progress)){const goal=defs?.[id]?.goal??(!t.revision?LEGACY_BY[id]?.goal:undefined)??BY169[id]?.goal??BY[id]?.goal;if(!ids?.includes(id)||!ok(n)||n>goal)bad();}}
   if(active!==undefined){if(!current||!plain(active))bad();for(const[id,seq]of Object.entries(active))if(!ids?.includes(id)||!ok(seq)||seq>out.global.LAST_COMMITTED_ACTION_SEQ||!branchReady(t,scope,id)||!rootReady(facade))bad();}
   if(current&&rootReady(facade)&&ids.some(id=>!t.claimed[id]&&branchReady(t,scope,id)&&active[id]===undefined))bad();
   if(t[scope+'Opened']!==undefined&&(!current||typeof t[scope+'Opened']!=='boolean'||t[scope+'Opened']&&!rootReady(facade)))bad();
  }
 }
 for(const[id,q]of Object.entries(out.quests||{})){
  const current=CHAIN_BY[id];if(!current)continue;const c=q.taskObjective;if(!plain(c))bad();
  if(c.version===1){const legacy=LEGACY_CHAIN_BY[id];if(!legacy)bad();c.definition=definition(facade,legacy,{legacy:true});c.version=2;}
  const def=c.definition;if(!q.guildAccepted||c.version!==2||!validDefinition(def,id,true)||!ok(c.progress)||c.progress>def.goal||!ok(c.acceptedSeq)||c.acceptedSeq<1||c.acceptedSeq>out.global.LAST_COMMITTED_ACTION_SEQ)bad();
  const needs=[171,REVISION].includes(def.revision)?((def.revision===171?snapshot171:catalog).oneTimeBranches?.[id]||[def.predecessor,...(def.prerequisites||[])].filter(Boolean)):[def.predecessor].filter(Boolean);
  if(needs.some(pre=>!out.quests[pre]?.claimed))bad();
  if(c.primogemPaid!==undefined&&(!q.claimed||c.primogemPaid!==num(def.reward?.primogem))||q.claimed&&num(def.reward?.primogem)>0&&c.primogemPaid!==num(def.reward.primogem))bad();
  if((q.node==='READY_TO_CLAIM'||q.claimed)&&c.progress!==def.goal||q.claimed&&q.node!=='COMPLETE'||!q.claimed&&q.node!==(c.progress===def.goal?'READY_TO_CLAIM':'INVESTIGATE'))bad();
  // Genuine old acceptance is enough evidence for the revised first reception exercise.
  if(id===ROOT_TASK&&!q.claimed&&[168,169].includes(def.revision)&&c.progress<def.goal){c.progress=def.goal;q.node='READY_TO_CLAIM';q.state='진행중';}
 }
 const reportLesson=out.quests.Q_TASK_LEARN_16,reportObjective=reportLesson?.taskObjective;
 if(reportLesson?.guildAccepted&&!reportLesson.claimed&&reportObjective?.definition?.revision===169&&reportObjective.progress<reportObjective.definition.goal&&Object.entries(out.quests).some(([id,q])=>q.claimed&&q.node==='COMPLETE'&&facade.isCommission(id)&&!id.startsWith('Q_TASK_LEARN_'))){
  reportObjective.progress=reportObjective.definition.goal;reportLesson.node='READY_TO_CLAIM';reportLesson.state='진행중';
 }
 const validStamp=st=>plain(st)&&st.version===1&&ok(st.day)&&ok(st.week)&&st.day<=dayOf(this.tasksNow())&&st.week<=weekOf(this.tasksNow())&&st.week===weekOf(st.day*DAY-KST)&&ok(st.startedSeq)&&st.startedSeq<=out.global.LAST_COMMITTED_ACTION_SEQ&&this.tables['32_MAP_DB'].has(st.map)&&(st.enemies===undefined||Array.isArray(st.enemies)&&st.enemies.every(id=>typeof id==='string'&&!!this.tables['09_MONSTER_DB']?.has(id)))&&(st.stage===undefined||ok(st.stage)&&st.stage<=60)&&(st.tier===undefined||ok(st.tier)&&st.tier<=5)&&(st.domainType===undefined||['','TALENT','ASCENSION','EXP'].includes(st.domainType))&&(st.leyType===undefined||['','REVELATION','WEALTH'].includes(st.leyType))&&Array.isArray(st.party)&&st.party.every(plain)&&st.party.length<=4&&new Set(st.party.map(m=>m.id)).size===st.party.length&&st.party.some(m=>m.id===PLAYER)&&st.party.every(m=>plain(m)&&(m.id===PLAYER||this.tables['07_CHAR_DB'].has(m.id))&&['PYRO','HYDRO','CRYO','ELECTRO','ANEMO','GEO','DENDRO','PHYSICAL'].includes(m.element)&&[0,4,5].includes(m.rarity)&&(m.alive===undefined||typeof m.alive==='boolean')&&(m.owned===undefined||typeof m.owned==='boolean')&&(m.id===PLAYER?m.rarity===0&&m.owned!==false&&(out.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'?(out.travelerElements?.unlocked||['ANEMO']).includes(m.element):m.element==='PHYSICAL'):m.element===member(this,m.id).element&&m.rarity===member(this,m.id).rarity));
 for(const st of [out.runtime?.taskSnapshot,out.lifeJob?.taskSnapshot])if(st!==undefined&&!validStamp(st))bad();if(out.lifeJob?.taskSnapshot&&(out.lifeJob.taskSnapshot.day!==dayOf(out.lifeJob.startedAt)||out.lifeJob.taskSnapshot.map!==out.lifeJob.map))bad();
 if(out.tasks!==undefined||rootReady(facade))facade.tasksBox(true);
 return out;
};
api.tasksV0167={daily:copy(DAILY),bonus:copy(DAILY_BONUS),weekly:copy(WEEKLY),dayOf,weekOf};
api.tasksV0168={daily:copy(DAILY_POOL),weekly:copy(WEEKLY_POOL),chains:copy(CHAINS),partyMatch,partyAchievable,eventMatch};
api.tasksV0169={daily:copy(DAILY_POOL),weekly:copy(WEEKLY_POOL),chains:copy(CHAINS),weeklyBonus:copy(WEEKLY_BONUS),acceptCap:ACCEPT_CAP,weeklyCount:WEEKLY_COUNT,rewardAt,elementalChoices};
api.tasksV01611={daily:copy(DAILY_POOL),weekly:copy(WEEKLY_POOL),chains:copy(CHAINS),weeklyBonus:copy(WEEKLY_BONUS),acceptCap:ACCEPT_CAP,weeklyCount:WEEKLY_COUNT,dailyCount:DAILY_COUNT,rewardAt,elementalChoices,branches:copy(BRANCHES),snapshotV0169:copy(snapshot169),rootId:ROOT_TASK};
api.tasksV01612={...api.tasksV01611,snapshotV01611:copy(snapshot171),revision:REVISION};
})(globalThis);
