/* 0.16.7 task board, extended in 0.16.8 without changing its four daily/four weekly rows.
 * Rotations are recorded for the Korean calendar day/week. Long objectives are ordinary guild commissions:
 * accepting starts their counter, reporting pays once, and only then does the successor appear. */
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
const catalog=root.CRPGTaskCatalogV0168||{},DAILY_POOL=[...DAILY,...(catalog.daily||[])],WEEKLY_POOL=[...WEEKLY,...(catalog.weekly||[])];
const CHAINS=catalog.chains||[],CHAIN_BY=Object.assign(Object.create(null),Object.fromEntries(CHAINS.map(t=>[t.id,t])));
const BY=Object.assign(Object.create(null),Object.fromEntries([...DAILY_POOL,DAILY_BONUS,...WEEKLY_POOL].map(t=>[t.id,t])));
const old=Object.fromEntries(['newGame','apply','actionReason','validateSave','startBattle','finishBattle','startLife','acceptCommission','questVisible','questUnlockReason','questConditions','questChoice','claimQuest','commissionEntries'].map(k=>[k,P[k]]));
const E={불:'PYRO',물:'HYDRO',얼음:'CRYO',번개:'ELECTRO',바람:'ANEMO',바위:'GEO',풀:'DENDRO',물리:'PHYSICAL'},element=e=>E[e]||e||'PHYSICAL';
const KINDS=['win','ley','domain','boss','abyss','life','gather','mine','fish','hunt','cook','forge','bonus'];
function member(rt,id){
 const row=rt.tables['07_CHAR_DB']?.get(id),vision=String(row?.[3]||'').match(/\[(불|물|얼음|번개|바람|바위|풀)\]/)?.[1];
 return {id,element:id===PLAYER?(rt.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'?element(rt.travelerElement?.()||'ANEMO'):'PHYSICAL'):element(vision),rarity:id===PLAYER?0:num(rt.rarityOf?.(id)||4)};
}
function partySnapshot(rt,actors){
 const ids=actors?actors.filter(a=>a.side==='ALLY'&&!a.coop&&!a.summon).map(a=>a.source):rt.s.party.filter(p=>p.active).map(p=>p.source);
 return [...new Set(ids)].filter(id=>id===PLAYER||rt.tables['07_CHAR_DB']?.has(id)).map(id=>({...member(rt,id),alive:actors?actors.some(a=>a.side==='ALLY'&&a.source===id&&!a.coop&&a.hp>0):num(id===PLAYER?rt.s.global.PLAYER_HP_CURRENT:rt.s.chars[id]?.hp)>0}));
}
function partyMatch(members,rule={}){
 members=members.filter(m=>m.alive!==false);
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
function rotate(rt,scope,period){
 const pool=scope==='daily'?DAILY_POOL:WEEKLY_POOL,slots=scope==='daily'?['win','ley','domain','life']:['win','boss','domain','bonus'];
 const chosen=[];for(const slot of slots){let candidates=pool.filter(t=>slotOf(t,scope)===slot&&!lockOf(rt,t)&&!chosen.includes(t.id));
  if(!candidates.length&&scope==='weekly'){const fallback=WEEKLY.find(t=>slotOf(t,scope)===slot);if(fallback&&!chosen.includes(fallback.id))candidates=[fallback];}
  if(!candidates.length)candidates=pool.filter(t=>!lockOf(rt,t)&&!chosen.includes(t.id)&&t.kind!=='bonus');
  if(!candidates.length)candidates=pool.filter(t=>!chosen.includes(t.id)&&(slot==='bonus'||t.kind!=='bonus'));
  const ranked=candidates.map(t=>({t,key:hash(rt.s.global.SAVE_ID+':'+scope+':'+period+':'+slot+':'+t.id)})).sort((a,b)=>a.key-b.key||a.t.id.localeCompare(b.t.id));
  chosen.push(ranked[0].t.id);
 }return chosen;
}
function selected(box,scope){return (box[scope+'Ids']||(scope==='daily'?DAILY:WEEKLY).map(t=>t.id)).map(id=>BY[id]);}
P.tasksNow=function(){return num(this.actionStartedAt??Date.now())||Date.now();};
P.tasksBox=function(write=false){
 const t=this.tasksNow(),day=dayOf(t),week=weekOf(t),b=this.s.tasks;let box=b&&b.version===1?b:{version:1,day,week,daily:{},weekly:{},claimed:{}};
 let changed=box!==b;
 if(box.day!==day||box.week!==week){box=copy(box);changed=true;
  if(box.day!==day){box.day=day;box.daily={};box.dailyProgress={};box.dailyIds=rotate(this,'daily',day);for(const id of Object.keys(box.claimed))if(id.startsWith('D_'))delete box.claimed[id];}
  if(box.week!==week){box.week=week;box.weekly={};box.weeklyProgress={};box.weeklyIds=rotate(this,'weekly',week);for(const id of Object.keys(box.claimed))if(id.startsWith('W_'))delete box.claimed[id];}}
 // A 0.16.7 save keeps today's assignments and its already earned progress.
 if(!box.dailyIds){box.dailyIds=DAILY.map(t=>t.id);changed=true;}if(!box.weeklyIds){box.weeklyIds=WEEKLY.map(t=>t.id);changed=true;}
 if(write||changed)this.s.tasks=box;return box;
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
 if(f.party&&!partyMatch(event.party||[],f.party))return false;
 return true;
}
function amountOf(t,event){return t.filter?.resources?.length?t.filter.resources.reduce((n,id)=>n+num(event.items?.[id]),0):['cook','forge'].includes(t.kind)?Math.max(1,num(event.quantity)):1;}
P.tasksCount=function(kind,n=1,event=null){
 if(!KINDS.includes(kind)||!ok(n)||n<=0)return;const box=this.tasksBox(true);
 for(const scope of ['daily','weekly']){if(event&&event[scope==='daily'?'day':'week']!==box[scope==='daily'?'day':'week'])continue;
  box[scope][kind]=Math.min(Number.MAX_SAFE_INTEGER,num(box[scope][kind])+n);
  for(const t of selected(box,scope)){if(t.kind!==kind||!t.filter||!eventMatch(t,event))continue;const key=scope+'Progress';box[key]??={};box[key][t.id]=Math.min(t.goal,num(box[key][t.id])+amountOf(t,event));}}
 if(event)for(const t of CHAINS){const q=this.s.quests[t.id],c=q?.taskObjective;if(!q?.guildAccepted||q.claimed||!c||c.progress>=t.goal||t.kind!==kind||c.acceptedSeq>event.startedSeq||!eventMatch(t,event))continue;
  c.progress=Math.min(t.goal,c.progress+amountOf(t,event));if(c.progress>=t.goal){q.node='READY_TO_CLAIM';q.state='진행중';}}
};
P.taskView=function(){
 const box=this.tasksBox(false),guild=!!this.atGuild?.(),row=(t,have,scope,slot)=>{const lock=lockOf(this,t),goal=t.goal||1,progress=Math.min(goal,num(have)),done=!lock&&progress>=goal,claimed=!!box.claimed[t.id];
  const reward=copy(t.reward||{});if(scope==='daily')delete reward.primogem;else{delete reward.primogem;if(slot==='boss')reward.primogem=30;if(slot==='bonus')reward.primogem=40;}
  return {id:t.id,scope,name:t.name,short:t.short||t.name,icon:t.icon,goal,progress,done,claimed,lock,report:!!t.report,here:done&&!claimed&&(!t.report||guild),reward};};
 const daily=selected(box,'daily').map((t,i)=>row(t,t.filter?box.dailyProgress?.[t.id]:box.daily[t.kind],'daily',['win','ley','domain','life'][i])),open=daily.filter(x=>!x.lock);
 const bonus=row({...DAILY_BONUS,goal:open.length||1},open.filter(x=>x.done).length,'daily');bonus.reward=copy(DAILY_BONUS.reward);
 const weekly=selected(box,'weekly').map((t,i)=>row(t,t.filter?box.weeklyProgress?.[t.id]:box.weekly[t.kind],'weekly',['win','boss','domain','bonus'][i]));
 const all=[...daily,bonus,...weekly],ready=all.filter(x=>x.done&&!x.claimed),t=this.tasksNow();
 return {daily,bonus,weekly,ready:ready.length,here:all.filter(x=>x.here).length,atGuild:guild,dayEndsAt:(dayOf(t)+1)*DAY-KST,weekEndsAt:(weekOf(t)+1)*WEEK-KST-3*DAY};
};
const REPORT='캐서린에게 보고해야 받을 수 있습니다.';
P.taskReason=function(id){
 if(this.s.runtime)return '전투가 끝난 뒤 받을 수 있습니다.';const v=this.taskView(),list=[...v.daily,v.bonus,...v.weekly];
 if(id==='ALL')return list.some(x=>x.here)?'':list.some(x=>x.done&&!x.claimed)?REPORT:'받을 임무 보상이 없습니다.';
 const x=list.find(x=>x.id===id);if(!x)return '임무를 찾을 수 없습니다.';if(x.claimed)return '이미 받은 보상입니다.';if(x.lock)return x.lock+' 할 수 있습니다.';if(!x.done)return '아직 달성하지 않았습니다 ('+x.progress+'/'+x.goal+').';if(!x.here)return REPORT;return '';
};
P.taskClaim=function(id){
 const why=this.taskReason(id);if(why)fail('TASK',why);const v=this.taskView(),list=[...v.daily,v.bonus,...v.weekly],targets=id==='ALL'?list.filter(x=>x.here):list.filter(x=>x.id===id);
 const box=this.tasksBox(true),g=this.s.global,got={mora:0,primogem:0,items:{}};
 for(const x of targets){box.claimed[x.id]=1;const r=x.reward||{};if(r.mora){g.MORA=num(g.MORA)+r.mora;got.mora+=r.mora;}if(r.primogem){g.PRIMOGEM=num(g.PRIMOGEM)+r.primogem;got.primogem+=r.primogem;}
  for(const [item,n]of Object.entries(r.items||{})){this.giveItem(item,n);got.items[item]=(got.items[item]||0)+n;}if(x.id==='D_BONUS')box.weekly.bonus=Math.min(Number.MAX_SAFE_INTEGER,num(box.weekly.bonus)+1);}
 return {claimed:targets.map(x=>x.id),names:targets.map(x=>x.name),...got};
};
function battleStamp(rt,b,stamp){const enemies=b.actors.filter(a=>a.side==='ENEMY').map(a=>a.source);if(b.fieldBoss?.boss)enemies.push(b.fieldBoss.boss);return {...stamp,party:partySnapshot(rt,b.actors).map(m=>({...m,alive:stamp.party.find(a=>a.id===m.id)?.alive??m.alive})),enemies:[...new Set(enemies)],stage:b.abyss?.floor||b.growthDomain?.level||b.leyLine?.level||0,tier:b.leyLine?.tier||0,domainType:b.growthDomain?.kind||'',leyType:b.leyLine?.kind||''};}
function startStamp(rt,party=partySnapshot(rt)){const now=rt.tasksNow();return {version:1,day:dayOf(now),week:weekOf(now),startedSeq:num(rt.s.global.LAST_COMMITTED_ACTION_SEQ),map:rt.s.global.CURRENT_MAP_ID,party};}
P.startBattle=function(...args){
 const stamp=startStamp(this),before=this.s.runtime,prior=this._tasksStartingSnapshot;this._tasksStartingSnapshot=stamp;
 try{const out=old.startBattle.apply(this,args),b=this.s.runtime;if(b&&b!==before)b.taskSnapshot=battleStamp(this,b,stamp);return out;}finally{this._tasksStartingSnapshot=prior;}
};
P.startLife=function(...args){const stamp=startStamp(this),out=old.startLife.apply(this,args);if(this.s.lifeJob)this.s.lifeJob.taskSnapshot=stamp;return out;};
P.finishBattle=function(victory){
 const b=this.s.runtime,kind=b?{ley:!!b.leyLine,domain:!!b.growthDomain,boss:!!b.fieldBoss,abyss:!!b.abyss}:null;
 const stamp=b?.taskSnapshot||(b?battleStamp(this,b,this._tasksStartingSnapshot||startStamp(this)):startStamp(this));
 const out=old.finishBattle.call(this,victory),receipt=b&&(this.s.combatReceipts?.[b.id]||json(this.s.global.LAST_BATTLE_RESULT_JSON));
 if(b&&kind&&receipt?.victory===true&&(receipt.battleId||receipt.id)===b.id){
  const event={...stamp,enemies:[...new Set([...(stamp.enemies||[]),...(b.fieldBoss?.boss?[b.fieldBoss.boss]:[])])],stage:b.abyss?.floor||b.growthDomain?.level||b.leyLine?.level||0,tier:b.leyLine?.tier||0,domainType:b.growthDomain?.kind||'',leyType:b.leyLine?.kind||'',kinds:['win',...(kind.ley?['ley']:[]),...(kind.domain?['domain']:[]),...(kind.boss?['boss']:[]),...(kind.abyss?['abyss']:[])]};
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
P.questUnlockReason=function(id){const t=CHAIN_BY[id];if(t){if(t.predecessor&&!this.s.quests[t.predecessor]?.claimed)return '선행 의뢰를 보고한 뒤 받을 수 있습니다.';const lock=lockOf(this,t);if(lock)return lock+' 받을 수 있습니다.';}return old.questUnlockReason.call(this,id);};
P.questVisible=function(id){return (!CHAIN_BY[id]||this.commissionAccepted(id)||!this.questUnlockReason(id))&&old.questVisible.call(this,id);};
P.commissionEntries=function(){this.installTaskCommissions();return old.commissionEntries.call(this).filter(q=>!CHAIN_BY[q.row[0]]||this.questVisible(q.row[0]));};
P.acceptCommission=function(id){const out=old.acceptCommission.call(this,id);if(CHAIN_BY[id])this.s.quests[id].taskObjective={version:1,progress:0,acceptedSeq:num(this.s.global.LAST_COMMITTED_ACTION_SEQ)+1};return out;};
P.questConditions=function(id){const t=CHAIN_BY[id];if(!t)return old.questConditions.call(this,id);const why=this.questUnlockReason(id);if(why)return why;const q=this.s.quests[id];if(!q?.guildAccepted)return '안내원에게 의뢰를 먼저 받아 주세요.';if(q.claimed||q.taskObjective?.progress>=t.goal)return '';return t.name+' ('+num(q.taskObjective?.progress)+'/'+t.goal+')';};
P.questChoice=function(id,choice){if(CHAIN_BY[id])fail('QUEST_OBJECTIVE',this.questConditions(id)||'실제 활동을 마친 뒤 캐서린에게 보고해 주세요.');return old.questChoice.call(this,id,choice);};
P.claimQuest=function(id,...args){const t=CHAIN_BY[id],q=this.s.quests[id];if(t&&(!q?.guildAccepted||!q.taskObjective||q.taskObjective.progress<t.goal))fail('QUEST_OBJECTIVE','수락 이후 목표 활동을 먼저 완료해 주세요.');const out=old.claimQuest.call(this,id,...args);if(t){const paid=num(t.reward?.primogem);if(paid>0)this.s.global.PRIMOGEM=num(this.s.global.PRIMOGEM)+paid;this.s.quests[id].taskObjective.primogemPaid=paid;}return out;};
P.actionReason=function(type,a={}){if(type==='TASK_CLAIM')return this.taskReason(String(a.task||''));if(CHAIN_BY[a.quest]&&['COMMISSION_ACCEPT','CLAIM_QUEST','QUEST_CHOICE'].includes(type)){const unlock=this.questUnlockReason(a.quest);if(unlock)return unlock;if(type==='QUEST_CHOICE')return this.questConditions(a.quest)||'실제 활동을 마친 뒤 캐서린에게 보고해 주세요.';if(type==='CLAIM_QUEST'&&num(this.s.quests[a.quest]?.taskObjective?.progress)<CHAIN_BY[a.quest].goal)return '수락 이후 목표 활동을 먼저 완료해 주세요.';}return old.actionReason.call(this,type,a);};
P.apply=function(a){
 if(a?.type==='TASK_CLAIM')return this.taskClaim(String(a.task||''));const job=this.s.lifeJob?copy(this.s.lifeJob):null,stamp=a?.type==='CRAFT'?startStamp(this):null,out=old.apply.call(this,a);
 if(a?.type==='LIFE_FINISH'&&out&&!out.empty&&['GATHER','MINE','FISH','HUNT'].includes(out.kind)&&Object.values(out.items||{}).some(n=>num(n)>0)){
  const specific=out.kind.toLowerCase(),event={...(job?.taskSnapshot||startStamp(this)),map:job?.map||this.s.global.CURRENT_MAP_ID,kinds:['life',specific],items:out.items};this.tasksCount('life',1,event);this.tasksCount(specific,1,event);
 }
 if(a?.type==='CRAFT'&&out?.recipe&&num(out.quantity)>0){const r=this.tables['17_RECIPE_DB']?.get(out.recipe),kind=r?.[1]==='요리'?'cook':['단조','제작'].includes(r?.[1])?'forge':null;if(kind)this.tasksCount(kind,1,{...stamp,kinds:[kind],recipe:out.recipe,quantity:num(out.crafts??a.quantity??1),items:{[out.result]:num(out.quantity)}});}
 return out;
};
P.validateSave=function(s){
 this.installTaskCommissions();const out=old.validateSave.call(this,s)||s,t=out.tasks,bad=()=>fail('TASK_SAVE','임무 기록이 올바르지 않습니다.');
 if(t!==undefined){if(!plain(t)||t.version!==1||!ok(t.day)||!ok(t.week)||t.day>dayOf(this.tasksNow())||t.week>weekOf(this.tasksNow())||!plain(t.daily)||!plain(t.weekly)||!plain(t.claimed))bad();
  for(const counts of [t.daily,t.weekly])for(const [kind,n]of Object.entries(counts))if(!KINDS.includes(kind)||!ok(n))bad();for(const [k,v]of Object.entries(t.claimed))if(!BY[k]||v!==1)bad();
  for(const scope of ['daily','weekly']){const ids=t[scope+'Ids'],progress=t[scope+'Progress'];if(ids!==undefined&&(!Array.isArray(ids)||ids.length!==4||new Set(ids).size!==4||ids.some(id=>!BY[id]||!id.startsWith(scope==='daily'?'D_':'W_'))))bad();
   if(progress!==undefined){if(!plain(progress))bad();for(const [id,n]of Object.entries(progress))if(!BY[id]||!ids?.includes(id)||!ok(n)||n>BY[id].goal)bad();}}}
 for(const [id,q]of Object.entries(out.quests||{})){const def=CHAIN_BY[id];if(!def)continue;const c=q.taskObjective;
  if(!q.guildAccepted||!plain(c)||c.version!==1||!ok(c.progress)||c.progress>def.goal||!ok(c.acceptedSeq)||c.acceptedSeq<1||c.acceptedSeq>out.global.LAST_COMMITTED_ACTION_SEQ||def.predecessor&&!out.quests[def.predecessor]?.claimed)bad();
  if(c.primogemPaid!==undefined&&(!q.claimed||c.primogemPaid!==num(def.reward?.primogem))||q.claimed&&num(def.reward?.primogem)>0&&c.primogemPaid!==num(def.reward.primogem))bad();
  if((q.node==='READY_TO_CLAIM'||q.claimed)&&c.progress!==def.goal||q.claimed&&q.node!=='COMPLETE'||!q.claimed&&q.node!==(c.progress===def.goal?'READY_TO_CLAIM':'INVESTIGATE'))bad();}
 const validStamp=st=>plain(st)&&st.version===1&&ok(st.day)&&ok(st.week)&&st.day<=dayOf(this.tasksNow())&&st.week<=weekOf(this.tasksNow())&&st.week===weekOf(st.day*DAY-KST)&&ok(st.startedSeq)&&st.startedSeq<=out.global.LAST_COMMITTED_ACTION_SEQ&&this.tables['32_MAP_DB'].has(st.map)&&(st.enemies===undefined||Array.isArray(st.enemies)&&st.enemies.every(id=>typeof id==='string'&&!!this.tables['09_MONSTER_DB']?.has(id)))&&(st.stage===undefined||ok(st.stage)&&st.stage<=60)&&(st.tier===undefined||ok(st.tier)&&st.tier<=5)&&(st.domainType===undefined||['','TALENT','ASCENSION','EXP'].includes(st.domainType))&&(st.leyType===undefined||['','REVELATION','WEALTH'].includes(st.leyType))&&Array.isArray(st.party)&&st.party.every(plain)&&st.party.length<=4&&new Set(st.party.map(m=>m.id)).size===st.party.length&&st.party.some(m=>m.id===PLAYER)&&st.party.every(m=>plain(m)&&(m.id===PLAYER||this.tables['07_CHAR_DB'].has(m.id))&&['PYRO','HYDRO','CRYO','ELECTRO','ANEMO','GEO','DENDRO','PHYSICAL'].includes(m.element)&&[0,4,5].includes(m.rarity)&&(m.alive===undefined||typeof m.alive==='boolean')&&(m.id===PLAYER?m.rarity===0&&(out.global.STORY_ROUTE_ID==='ROUTE_TRAVELER'?(out.travelerElements?.unlocked||['ANEMO']).includes(m.element):m.element==='PHYSICAL'):m.element===member(this,m.id).element&&m.rarity===member(this,m.id).rarity));
 for(const st of [out.runtime?.taskSnapshot,out.lifeJob?.taskSnapshot])if(st!==undefined&&!validStamp(st))bad();if(out.lifeJob?.taskSnapshot&&(out.lifeJob.taskSnapshot.day!==dayOf(out.lifeJob.startedAt)||out.lifeJob.taskSnapshot.map!==out.lifeJob.map))bad();
 return out;
};
api.tasksV0167={daily:copy(DAILY),bonus:copy(DAILY_BONUS),weekly:copy(WEEKLY),dayOf,weekOf};
api.tasksV0168={daily:copy(DAILY_POOL),weekly:copy(WEEKLY_POOL),chains:copy(CHAINS),partyMatch,partyAchievable,eventMatch};
})(globalThis);
