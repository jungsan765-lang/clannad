'use strict';
// Bookkeeping boundary tests use the installed runtime and public actions. Ownership, levels and
// saved completed quotas are explicit fixtures; enemy HP is set to zero before COMBAT_BEGIN to
// isolate the successful combat receipt. No task-count calls or direct settlement shortcuts.
const assert=require('node:assert/strict');
const {fresh:baseFresh,R,db,c,advance}=require('./helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),DAY=86400000,MAX=Number.MAX_SAFE_INTEGER;
// The branch root is reported through its real native actions. Clearing only this
// fixture's empty task box lets each check choose its assignment-time level/roster.
function fresh(...args){const r=baseFresh(...args),map=r.s.global.CURRENT_MAP_ID;guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});leave(r);r.s.global.CURRENT_MAP_ID=map;delete r.s.tasks;return r;}
function expose(r,id){
 // Explicit validated completed-ancestor fixtures isolate downstream goal mechanics.
 const seen=new Set();function visit(key){for(const parent of c.CRPGTaskCatalogV0168.oneTimeBranches[key]||[]){visit(parent);if(!r.s.quests[parent]?.claimed&&!seen.has(parent)){seen.add(parent);const t=c.CRPGTaskCatalogV0168.chains.find(t=>t.id===parent),d=copy(t);d.reward=copy(c.CRPGRuntime.tasksV01611.rewardAt(t,r.s.global.PLAYER_LEVEL_STATE));d.assignedLevel=r.s.global.PLAYER_LEVEL_STATE;d.revision=171;d.individual=true;r.s.quests[parent]={guildAccepted:true,claimed:true,state:'완료',node:'COMPLETE',taskObjective:{version:2,progress:t.goal,acceptedSeq:r.s.global.LAST_COMMITTED_ACTION_SEQ,definition:d,...(d.reward.primogem?{primogemPaid:d.reward.primogem}:{})}};}}}visit(id);
}
function unlockRecurring(r,scope,id){const box=r.tasksBox(true),branches=c.CRPGTaskCatalogV0168[scope+'Branches'];function visit(key){for(const parent of branches[key]||[]){visit(parent);if(!r.s.tasks.claimed[parent]){const live=r.tasksBox(true),d=live[scope+'Definitions'][parent];assert(d,'assigned ancestor '+parent);live[scope+'Progress'][parent]=d.goal;guild(r);r.action('TASK_CLAIM',{task:parent});}}}visit(id);}
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function leave(r){if(r.s.placeVisit)r.action('PLACE_LEAVE');}
function guild(r,region='몬드'){leave(r);r.s.global.CURRENT_MAP_ID=region==='리월'?'MAP_LIYUE_HARBOR':'MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:region==='리월'?'EVT_CRPG_LIYUE_GUILD':'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
function roster(r,ids,level=30){r.adminApply({op:'level',target:'ALL',value:level});const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);for(const id of ids)own[id]={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.s.party=[{slot:'PARTY_1',source:'PLAYER_CUSTOM',type:'PLAYER',control:'PLAYER',active:true,tactic:'균형'},...ids.map((id,i)=>({slot:'PARTY_'+(i+2),source:id,type:'CHAR',control:'AI',active:true,tactic:'균형'}))];r.s.formation=r.s.party.map(p=>p.source);for(const id of ids)r.s.chars[id].hp=r.character(id).maxHp;}
function startDomain(r){leave(r);r.s.global.CURRENT_MAP_ID='MAP_D163_VALLEY_OF_REMEMBRANCE';r.action('DOMAIN_START',{domain:'VALLEY_OF_REMEMBRANCE:5'});assert(r.s.runtime?.growthDomain);}
function settleOpening(r){const id=r.s.runtime.id;for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=0;const action={id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type:'COMBAT_BEGIN',battle:id};const out=r.transact(action);assert(!r.s.runtime);assert(r.s.combatReceipts[id].victory);return {action,out};}
function finishGather(r,inputs=true){const j=r.s.lifeJob,scene=r.lifeScene(j);advance(j.duration+100);return r.action('LIFE_FINISH',{job:j.id,elapsed:j.duration,inputs:inputs?scene.nodes.map((n,i)=>({at:600+i*300,node:i})):[]}).result;}
function legacyDaily(r,ids){const old=c.CRPGRuntime.tasksV0167; r.s.tasks={version:1,day:old.dayOf(r.tasksNow()),week:old.weekOf(r.tasksNow()),daily:{},weekly:{},claimed:{},dailyIds:ids};r.tasksBox(true);}
function completeAssigned(r,scope,leaveReady=false){guild(r);const ids=r.tasksBox(true)[scope+'Ids'];
 // Explicit earned activity quotas; predecessor rewards are claimed through native actions.
 for(let n=0;n<=ids.length;n++){const frontier=r.taskView()[scope];if(!frontier.length)break;for(const row of frontier){const box=r.tasksBox(true),d=box[scope+'Definitions'][row.id];box[scope+'Progress'][row.id]=d.goal;}if(leaveReady&&ids.every(id=>r.s.tasks.claimed[id]||r.s.tasks[scope+'Progress'][id]>=r.s.tasks[scope+'Definitions'][id].goal))break;for(const row of frontier)r.action('TASK_CLAIM',{task:row.id});}}
function cookObjective(r,t){leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';const kitchen=r.placeEntries().find(p=>p.entity==='SERVICE_MOND_COOK'&&p.modes.includes('CRAFT'));assert(kitchen);r.action('PLACE_ENTER',{place:kitchen.id,mode:'CRAFT'});const recipe=t.filter.recipes[0],cost=r.recipeCost(r.recipeDefinition(recipe),t.goal);for(const [id,n]of Object.entries(cost.items))r.giveItem(id,n);r.s.global.MORA+=cost.mora;r.action('CRAFT',{recipe,quantity:t.goal});assert.equal(r.s.quests[t.id].taskObjective.progress,t.goal);}

check('legacy commission battle and new accepted objective share one native receipt across reload',()=>{
 let r=fresh();r.adminApply({op:'level',target:'ALL',value:20});guild(r);const chain='Q_TASK_MOND_PATROL_01',legacy='Q_CRPG_MOND_FIRST_FIELD';expose(r,chain);r.action('COMMISSION_ACCEPT',{quest:chain});r.action('COMMISSION_ACCEPT',{quest:legacy});leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.action('QUEST_CHOICE',{quest:legacy,choice:'careful'});
 const snapshot=copy(r.s.runtime.taskSnapshot);r=new R(db,copy(r.s));assert.deepEqual(copy(r.s.runtime.taskSnapshot),snapshot);const {action,out}=settleOpening(r);
 assert.equal(r.s.quests[legacy].node,'READY_TO_CLAIM');assert.equal(r.s.quests[chain].taskObjective.progress,1);assert.equal(r.s.tasks.daily.win,1);
 const save=r.serialize();assert.deepEqual(copy(r.transact(action)),copy(out));assert.equal(r.serialize(),save,'replaying the committed combat action cannot count twice');
 guild(r);const mora=r.s.global.MORA,oldClaim=r.action('CLAIM_QUEST',{quest:legacy}).result,newClaim=r.action('CLAIM_QUEST',{quest:chain}).result;assert.equal(r.s.global.MORA,mora+oldClaim.rewards.mora+newClaim.rewards.mora);assert(r.questVisible('Q_TASK_MOND_PATROL_02'));assert.throws(()=>r.action('CLAIM_QUEST',{quest:legacy}),/이미/);assert.throws(()=>r.action('CLAIM_QUEST',{quest:chain}),/이미/);
});

check('cooperative guest and displaced host companion never complete the host elemental party objective',()=>{
 const h=fresh(),g=fresh();roster(h,['MOND_AMBER','MOND_KAEYA','MOND_BARBARA']);roster(g,['MOND_AMBER']);legacyDaily(h,['D_V168_PYRO_HYDRO','D_LEY','D_DOMAIN','D_LIFE']);unlockRecurring(h,'daily','D_V168_PYRO_HYDRO');h.coopContext={version:1,room:'Rabcdef1234',members:[{pid:'aaaaaaaaaaaa',name:'손님',snap:g.coopSnapshot('MOND_AMBER')}]};
 const site=h.leyLineStatus().blossoms.find(x=>x.region==='몬드');h.s.global.CURRENT_MAP_ID=site.map;h.action('PLACE_ENTER',{place:'BOSS:'+site.route,mode:'BOSS'});h.action('BOSS_ROUTE',{route:site.route,entry:'DIRECT',tier:1});
 assert.equal(h.s.runtime.actors.filter(a=>a.side==='ALLY').length,4);assert.equal(h.s.runtime.actors.filter(a=>a.side==='ALLY'&&a.coop).length,1);assert.deepEqual(copy(h.s.runtime.taskSnapshot.party.map(m=>m.id)).sort(),['MOND_BARBARA','MOND_KAEYA','PLAYER_CUSTOM']);assert(!c.CRPGRuntime.tasksV0168.partyMatch(h.s.runtime.taskSnapshot.party,{full:true,companionRarity:4}));
 settleOpening(h);assert.equal(h.s.tasks.daily.win,1);assert.equal(h.taskView().daily.find(t=>t.id==='D_V168_PYRO_HYDRO').progress,0,'another account Amber does not supply the missing owned Pyro companion');
});

check('native Liyue gathering reports only at Liyue Catherine and preserves the predecessor gate',()=>{
 const r=fresh();r.adminApply({op:'level',target:'ALL',value:30});guild(r,'리월');const id='Q_TASK_LIYUE_GATHER_01',next='Q_TASK_LIYUE_GATHER_02';expose(r,id);r.action('COMMISSION_ACCEPT',{quest:id});leave(r);r.s.global.CURRENT_MAP_ID='MAP_LIYUE_PLAINS';r.s.global.PRNG_STATE=7;r.action('LIFE_START',{kind:'GATHER'});const out=finishGather(r);assert(out.items.ING_CARROT>=3);assert.equal(r.s.quests[id].taskObjective.progress,3);assert(!r.questVisible(next));
 guild(r);const before=r.serialize();assert.throws(()=>r.action('CLAIM_QUEST',{quest:id}),/리월의 캐서린/);assert.equal(r.serialize(),before);guild(r,'리월');r.action('CLAIM_QUEST',{quest:id});assert(r.questVisible(next));assert.throws(()=>r.action('CLAIM_QUEST',{quest:id}),/이미/);
});

check('reload retains old life start day; cancellation and work crossing midnight do not credit the new daily board',()=>{
 let r=fresh('MAP_MOND_PLAINS');r.taskView();r.action('LIFE_START',{kind:'GATHER'});const oldDay=r.s.lifeJob.taskSnapshot.day;r=new R(db,copy(r.s));advance(DAY);r.taskView();assert.notEqual(r.s.tasks.day,oldDay);finishGather(r);assert.equal(r.s.tasks.daily.life||0,0);assert.equal(r.s.tasks.daily.gather||0,0);assert.equal(r.s.tasks.weekly.life,1);
 r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.action('LIFE_START',{kind:'GATHER'});r.action('LIFE_CANCEL');assert.equal(r.s.tasks.daily.life||0,0);
});

check('rotation excludes blocked Abyss stages while saved assignments survive ownership changes',()=>{
 const r=fresh();roster(r,['MOND_AMBER','MOND_KAEYA','MOND_LISA'],60);r.taskView();r.s.global.LAST_COMMITTED_ACTION_SEQ=9;for(const t of c.CRPGTaskCatalogV0168.chains.filter(t=>t.family==='ABYSS'&&t.tier<10))r.s.quests[t.id]={guildAccepted:true,claimed:true,node:'COMPLETE',state:'완료',taskObjective:{version:1,progress:t.goal,acceptedSeq:t.tier,primogemPaid:c.CRPGTaskCatalogV0168.legacyChains.find(q=>q.id===t.id).reward.primogem||0}};r.validateSave(copy(r.s));assert.match(r.questUnlockReason('Q_TASK_ABYSS_10'),/앞선/);
 const low=fresh();roster(low,['MOND_AMBER','MOND_KAEYA','MOND_LISA'],30);low.s.chars.MOND_LISA.level=1;expose(low,'Q_TASK_ABYSS_01');assert.match(low.questUnlockReason('Q_TASK_ABYSS_01'),/입장|Lv\.|동료/);
 assert.equal(c.CRPGRuntime.tasksV0168.daily.length,11);assert(c.CRPGRuntime.tasksV0168.weekly.length>=24);
 for(let i=0;i<60;i++){r.s.global.SAVE_ID='TASK_EDGE_ROTATION_'+i;r.s.tasks.day--;r.s.tasks.week--;const v=r.taskView();assert.equal(v.daily.length,2);assert(v.weekly.length>=4&&v.weekly.length<=5);assert(r.s.tasks.weeklyIds.length<=28);assert(v.daily.every(t=>!t.lock)&&v.weekly.every(t=>!t.lock));}
 const ids=copy(r.s.tasks.dailyIds),weekly=copy(r.s.tasks.weeklyIds),save=copy(r.s);const loaded=new R(db,save);assert.deepEqual(copy(loaded.s.tasks.dailyIds),ids);loaded.s.global.COMPANION_ELIGIBILITY_JSON='{}';assert.deepEqual(copy(loaded.s.tasks.dailyIds),ids);assert.deepEqual(copy(loaded.s.tasks.weeklyIds),weekly);
});

check('extreme valid counters saturate on public victory and bonus claim without blocking the action',()=>{
 const r=fresh();r.adminApply({op:'level',target:'ALL',value:20});r.taskView();r.s.tasks.daily.win=MAX;r.s.tasks.weekly.win=MAX;startDomain(r);settleOpening(r);assert.equal(r.s.tasks.daily.win,MAX);assert.equal(r.s.tasks.weekly.win,MAX);r.validateSave(copy(r.s));
 completeAssigned(r,'daily');r.s.tasks.weekly.bonus=MAX;guild(r);r.action('TASK_CLAIM',{task:'D_BONUS'});assert.equal(r.s.tasks.weekly.bonus,MAX);r.validateSave(copy(r.s));
});

check('일괄 수령은 한 번만 지급하며 일일 보고5회와 주간 모두달성은 별개로 지급한다',()=>{
 const r=fresh();r.adminApply({op:'level',target:'ALL',value:20});const nextMonday=(c.CRPGRuntime.tasksV0167.weekOf(r.tasksNow())+1)*7*DAY-9*3600000-3*DAY;advance(nextMonday-r.tasksNow()+100);r.taskView();completeAssigned(r,'daily',true);const w=r.s.tasks.weeklyDefinitions.W_BONUS;assert(w);r.s.tasks.weeklyProgress.W_BONUS=4;r.s.tasks.weekly.bonus=4;guild(r);const primo=Number(r.s.global.PRIMOGEM)||0;
 const first=r.action('TASK_CLAIM',{task:'ALL'}).result;assert.equal(new Set(first.claimed).size,first.claimed.length);assert(first.claimed.includes('D_BONUS'));assert.equal(first.primogem,20);assert.equal(r.s.tasks.weekly.bonus,5);assert(r.taskView().weekly.find(t=>t.id==='W_BONUS').here);
 const second=r.action('TASK_CLAIM',{task:'ALL'}).result;assert.deepEqual(copy(second.claimed),['W_BONUS']);assert.equal(second.primogem,40);assert.equal(r.s.global.PRIMOGEM,primo+60);assert.throws(()=>r.action('TASK_CLAIM',{task:'ALL'}),/받을 임무/);completeAssigned(r,'weekly',true);const weekly=r.taskView();assert(weekly.weeklyBonus.done&&weekly.weeklyBonus.here);const all=r.action('TASK_CLAIM',{task:'ALL'}).result;assert(all.claimed.includes('W_ALL'));assert.equal(all.primogem,weekly.weekly.filter(t=>!t.claimed).reduce((n,t)=>n+(t.reward.primogem||0),0)+200);assert.throws(()=>r.action('TASK_CLAIM',{task:'W_ALL'}),/이미/);
});

check('mid-chain Primogems require real new work and a successful claim; failed reports, reload and duplicate claims cannot mint extra',()=>{
 let r=fresh();r.adminApply({op:'level',target:'ALL',value:30});const cooking=c.CRPGTaskCatalogV0168.chains.filter(t=>t.family==='COOKING'&&t.tier<=5),target=cooking.at(-1);assert(target.reward.primogem>0);let expected=Number(r.s.global.PRIMOGEM)||0;
 for(const t of cooking){expose(r,t.id);guild(r);r.action('COMMISSION_ACCEPT',{quest:t.id});assert.equal(r.s.quests[t.id].taskObjective.progress,0);assert.equal(Number(r.s.global.PRIMOGEM)||0,expected);assert.throws(()=>r.action('CLAIM_QUEST',{quest:t.id}),/목표 활동/);assert.throws(()=>r.action('QUEST_CHOICE',{quest:t.id,choice:'careful'}),/실제|수락|요리/);cookObjective(r,t);assert.equal(Number(r.s.global.PRIMOGEM)||0,expected,'completion alone never pays Primogems');
  if(t===target){guild(r,'리월');const before=r.serialize();assert.throws(()=>r.action('CLAIM_QUEST',{quest:t.id}),/몬드의 캐서린/);assert.equal(r.serialize(),before,'the failed report leaves progress, claims and currencies unchanged');const fake=copy(r.s);fake.quests[t.id].taskObjective.primogemPaid=t.reward.primogem;assert.throws(()=>r.validateSave(fake),/임무 기록/);}
  guild(r);const action={id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type:'CLAIM_QUEST',quest:t.id};const out=r.transact(action);expected+=t.reward.primogem||0;assert.equal(Number(r.s.global.PRIMOGEM)||0,expected);assert.equal(out.result.rewards.primogem||0,t.reward.primogem||0);assert.equal(r.s.quests[t.id].taskObjective.primogemPaid,t.reward.primogem||0);const claimed=r.serialize();assert.deepEqual(copy(r.transact(action)),copy(out));assert.equal(r.serialize(),claimed);r=new R(db,JSON.parse(claimed));const after=r.serialize();assert.throws(()=>r.action('CLAIM_QUEST',{quest:t.id}),/이미/);assert.equal(r.serialize(),after);
 }
 assert.equal(Number(r.s.global.PRIMOGEM)||0,cooking.reduce((n,t)=>n+(t.reward.primogem||0),0));const altered=copy(r.s);altered.quests[target.id].taskObjective.primogemPaid=0;assert.throws(()=>r.validateSave(altered),/임무 기록/);
});

check('saved task snapshots reject future, malformed and fabricated participant data',()=>{
 let r=fresh('MAP_MOND_PLAINS');r.action('LIFE_START',{kind:'GATHER'});const saved=copy(r.s);r.validateSave(copy(saved));
 const invalid=[st=>st.day=MAX,st=>st.week=MAX,st=>st.startedSeq=MAX,st=>st.party.push(copy(st.party[0])),st=>st.party[0].rarity=5,st=>st.party[0].element='GEO',st=>st.map='MAP_MOND_FOREST'];
 for(const mutate of invalid){const bad=copy(saved);mutate(bad.lifeJob.taskSnapshot);assert.throws(()=>r.validateSave(bad),/임무 기록/);}
 guild(r=new R(db,{...copy(saved),lifeJob:undefined}));const id='Q_TASK_MOND_PATROL_01';expose(r,id);r.action('COMMISSION_ACCEPT',{quest:id});const future=copy(r.s);future.quests[id].taskObjective.acceptedSeq=future.global.LAST_COMMITTED_ACTION_SEQ+1;assert.throws(()=>r.validateSave(future),/임무 기록/);
});
console.log(JSON.stringify({ok:!process.exitCode,checks:passed}));
