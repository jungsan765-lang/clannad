'use strict';
// Native acceptance/reporting and battle settlement verify the branch barriers.
// Labelled progress fixtures isolate long-operation/all-clear bookkeeping; they
// do not claim to simulate 150 fights or five real calendar days of play.
const assert=require('node:assert/strict');
const {fresh,R,db,c,advance}=require('./helpers_v011.cjs');
const C=c.CRPGTaskCatalogV0168,copy=x=>JSON.parse(JSON.stringify(x)),DAY=86400000;
// The daily-reset case must stay within one Korean calendar week. Starting
// from a real Sunday made its +1-day fixture cross Monday and correctly reset
// weekly progress on CI. Keep this suite's clock deterministic; the explicit
// Monday/Friday and +7-day cases below still exercise native weekly rollover.
advance(Date.parse('2026-10-07T12:00:00+09:00')-c.Date.now());
const ROOT='Q_TASK_LEARN_01',removed=['D_V168_HILI','W_V168_MOND_PATROL','W_V169_REPORT','W_V168_CRYO_VINE','W_V168_LIYUE_PATROL'];
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function leave(r){if(r.s.placeVisit)r.action('PLACE_LEAVE');}
function guild(r){leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
function transact(r,type,params={}){const action={id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type,...params};return {action,out:r.transact(action)};}
function ownFixture(r){
 r.adminApply({op:'level',target:'ALL',value:60});
 const ids=['MOND_AMBER','MOND_KAEYA','MOND_LISA'];
 for(const id of ids)r.wishGrant({kind:'char',id,rarity:4});
 r.s.party=[{slot:'PARTY_1',source:'PLAYER_CUSTOM',type:'PLAYER',control:'PLAYER',active:true,tactic:'균형'},...ids.map((id,i)=>({slot:'PARTY_'+(i+2),source:id,type:'CHAR',control:'AI',active:true,tactic:'균형'}))];
 r.s.formation=r.s.party.map(x=>x.source);for(const id of ids)r.s.chars[id].hp=r.character(id).maxHp;
}
function unlock(r){guild(r);r.action('COMMISSION_ACCEPT',{quest:ROOT});r.action('CLAIM_QUEST',{quest:ROOT});return r;}
function high(){const r=fresh();ownFixture(r);return unlock(r);}
function def(r,id){const scope=id.startsWith('D_')?'daily':'weekly';return r.tasksBox(true)[scope+'Definitions'][id];}
function progress(r,id){const scope=id.startsWith('D_')?'daily':'weekly';return r.tasksBox(true)[scope+'Progress']?.[id]||0;}
function quotaFixture(r,id){const scope=id.startsWith('D_')?'daily':'weekly',b=r.tasksBox(true),d=b[scope+'Definitions'][id];assert(d,'assigned '+id);(b[scope+'Progress']??={})[id]=d.goal;}
function win(r){
 leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.action('MENU',{screen:'LOCATION'});r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 const battle=r.s.runtime.id;for(const a of r.s.runtime.actors)if(a.side==='ENEMY')a.hp=0;
 const receipt=transact(r,'COMBAT_BEGIN',{battle});assert(r.s.combatReceipts[battle].victory);assert(!r.s.runtime);return receipt;
}
function definitionFixture(r,t,revision){const d=copy(t);d.reward=copy(c.CRPGRuntime.tasksV0169.rewardAt(t,r.s.global.PLAYER_LEVEL_STATE));d.assignedLevel=r.s.global.PLAYER_LEVEL_STATE;d.revision=revision;d.individual=true;return d;}
function completedAncestorsFixture(r,id){
 const seen=new Set();function mark(id){if(seen.has(id))return;seen.add(id);for(const p of C.oneTimeBranches[id]||[])mark(p);const t=C.chains.find(t=>t.id===id),d=definitionFixture(r,t,172);r.s.quests[id]={guildAccepted:true,claimed:true,node:'COMPLETE',state:'완료',taskObjective:{version:2,progress:d.goal,acceptedSeq:r.s.global.LAST_COMMITTED_ACTION_SEQ,definition:d,...(d.reward.primogem?{primogemPaid:d.reward.primogem}:{})}};}
 for(const p of C.oneTimeBranches[id]||[])mark(p);
}

check('only the specified five are retired, every other objective and payout remains',()=>{
 const old=C.snapshotV0169,current=[...C.legacyDaily,...C.daily,...C.legacyWeekly,...C.weekly],previous=[...old.daily,...old.weekly];
 assert.equal(C.legacyDaily.length+C.daily.length,11);assert.equal(C.legacyWeekly.length+C.weekly.length,27);assert.equal(C.chains.length,288);
 assert.deepEqual(previous.filter(t=>!current.some(n=>n.id===t.id)).map(t=>t.id).sort(),removed.slice().sort());
 for(const t of current){const prior=previous.find(x=>x.id===t.id);assert.equal(t.goal,prior.goal);assert.deepEqual(copy(t.reward),copy(prior.reward));}
 for(const t of C.chains){const prior=old.chains.find(x=>x.id===t.id);assert.equal(t.goal,prior.goal);assert.deepEqual(copy(t.reward),copy(prior.reward));}
 assert.equal(C.oneTimeBranches[ROOT].length,0);
});

check('a new account sees only reception practice, with no empty-board bonus',()=>{
 const r=fresh();guild(r);const v=r.taskView();assert.equal(v.daily.length,0);assert.equal(v.weekly.length,0);assert(!v.bonus.done&&!v.weeklyBonus.done);
 const entries=r.commissionEntries();assert.deepEqual(entries.map(q=>q.row[0]),[ROOT]);
 assert(r.actionReason('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_02'}));assert.throws(()=>r.action('TASK_CLAIM',{task:'D_BONUS'}));assert.throws(()=>r.acceptCommission('Q_TASK_MOND_PATROL_01'));
});

check('native reception followed by report unlocks siblings and replay cannot pay twice',()=>{
 let r=fresh();guild(r);const received=transact(r,'COMMISSION_ACCEPT',{quest:ROOT});assert.equal(r.s.quests[ROOT].taskObjective.progress,1);assert.equal(r.s.quests[ROOT].node,'READY_TO_CLAIM');assert(!r.questVisible('Q_TASK_LEARN_02'));
 const seq=r.s.global.LAST_COMMITTED_ACTION_SEQ;r.transact(received.action);assert.equal(r.s.global.LAST_COMMITTED_ACTION_SEQ,seq);assert.equal(r.s.quests[ROOT].taskObjective.progress,1);
 r=new R(db,copy(r.s));const before=r.s.global.MORA,reported=transact(r,'CLAIM_QUEST',{quest:ROOT});assert.equal(r.s.global.MORA-before,600);assert(r.questVisible('Q_TASK_LEARN_02'));assert(r.questVisible('Q_TASK_LEARN_03'));assert(r.questVisible('Q_TASK_LEARN_14'));assert(!r.questVisible('Q_TASK_LEARN_05'));
 const paid=r.s.global.MORA;r.transact(reported.action);assert.equal(r.s.global.MORA,paid);assert.throws(()=>r.action('CLAIM_QUEST',{quest:ROOT}));assert(r.taskView().daily.length>0);new R(db,copy(r.s));
});

check('direct acceptance cannot bypass an unreported one-time predecessor',()=>{
 const r=high();guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_02'});assert.throws(()=>r.acceptCommission('Q_TASK_LEARN_05'));assert.throws(()=>r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_MINING_01'}));assert(!r.questVisible('Q_TASK_LEARN_05'));
});

check('daily successors receive only new victories after the first payout',()=>{
 let r=high();assert(!r.taskView().daily.some(t=>t.id==='D_V168_PYRO_HYDRO'));for(let n=0;n<def(r,'D_WIN').goal;n++)win(r);
 assert.equal(progress(r,'D_V168_PYRO_HYDRO'),0);assert(!r.taskView().bonus.done);r.action('TASK_CLAIM',{task:'D_WIN'});
 assert(r.taskView().daily.some(t=>t.id==='D_V168_PYRO_HYDRO'));assert(!r.taskView().daily.some(t=>t.id==='D_WIN'));assert.equal(progress(r,'D_V168_PYRO_HYDRO'),0);
 const receipt=win(r);assert.equal(progress(r,'D_V168_PYRO_HYDRO'),1);r.transact(receipt.action);assert.equal(progress(r,'D_V168_PYRO_HYDRO'),1);r=new R(db,copy(r.s));assert.equal(progress(r,'D_V168_PYRO_HYDRO'),1);
});

check('weekly long operations stay hidden until predecessor rewards are collected',()=>{
 const r=high();assert(r.taskView().weekly.some(t=>t.id==='W_V168_REACTION'));assert(!r.taskView().weekly.some(t=>t.id==='W_WIN'));quotaFixture(r,'W_V168_REACTION');assert(!r.taskView().weekly.some(t=>t.id==='W_WIN'));assert(!r.taskView().weeklyBonus.done);
 r.action('TASK_CLAIM',{task:'W_V168_REACTION'});assert(r.taskView().weekly.some(t=>t.id==='W_WIN'));assert.equal(progress(r,'W_WIN'),0);win(r);assert.equal(progress(r,'W_WIN'),1);new R(db,copy(r.s));
});

check('a two-parent operation opens only after both reports',()=>{
 const r=high();for(const id of ['W_DOMAIN','W_V168_EXPERIENCE','W_V168_TALENT30']){assert(r.taskView().weekly.some(t=>t.id===id));quotaFixture(r,id);r.action('TASK_CLAIM',{task:id});}
 assert(!r.taskView().weekly.some(t=>t.id==='W_V168_DOMAIN_CIRCUIT'));quotaFixture(r,'W_V168_ASCENSION');r.action('TASK_CLAIM',{task:'W_V168_ASCENSION'});assert(r.taskView().weekly.some(t=>t.id==='W_V168_DOMAIN_CIRCUIT'));assert.equal(progress(r,'W_V168_DOMAIN_CIRCUIT'),0);
});

check('an event captured before unlock cannot leak progress into a successor',()=>{
 const r=high(),stale=r.taskActivitySnapshot();quotaFixture(r,'D_LIFE');r.action('TASK_CLAIM',{task:'D_LIFE'});assert(r.taskView().daily.some(t=>t.id==='D_V168_APPLE'));
 r.taskRecordActivity('gather',{...stale,kinds:['gather'],items:{ING_APPLE:3}});assert.equal(progress(r,'D_V168_APPLE'),0);
 r.taskRecordActivity('gather',{...r.taskActivitySnapshot(),kinds:['gather'],items:{ING_APPLE:3}});assert.equal(progress(r,'D_V168_APPLE'),1);
});

check('bulk payout cannot clear hidden branches or pay an early all-complete bonus',()=>{
 const r=high(),v=r.taskView();for(const t of [...v.daily,...v.weekly])quotaFixture(r,t.id);const paid=r.action('TASK_CLAIM',{task:'ALL'}).result;
 assert(!paid.claimed.includes('D_BONUS')&&!paid.claimed.includes('W_ALL'));assert(!r.taskView().bonus.done&&!r.taskView().weeklyBonus.done);
 for(const id of ['D_V168_PYRO_HYDRO','W_WIN'])assert.equal(progress(r,id),0);
});

check('all-complete is paid once only after the entire fixed branch manifest',()=>{
 const r=high();let rounds=0;
 while(rounds++<20){const v=r.taskView(),frontier=[...v.daily,...v.weekly].filter(t=>!t.claimed);if(!frontier.length)break;for(const t of frontier){quotaFixture(r,t.id);r.action('TASK_CLAIM',{task:t.id});}}
 assert(rounds<20);const v=r.taskView();assert(v.bonus.done&&v.weeklyBonus.done);assert.equal(v.bonus.goal,r.s.tasks.dailyIds.length);assert.equal(v.weeklyBonus.goal,r.s.tasks.weeklyIds.length);
 guild(r);const before=r.s.global.PRIMOGEM;r.action('TASK_CLAIM',{task:'D_BONUS'});r.action('TASK_CLAIM',{task:'W_ALL'});assert.equal(r.s.global.PRIMOGEM-before,220);assert.throws(()=>r.action('TASK_CLAIM',{task:'W_ALL'}));assert.throws(()=>r.action('TASK_CLAIM',{task:'D_BONUS'}));new R(db,copy(r.s));
});

check('daily reset closes daily successors but retains weekly progress and claims',()=>{
 const r=high();quotaFixture(r,'D_WIN');r.action('TASK_CLAIM',{task:'D_WIN'});quotaFixture(r,'W_V168_REACTION');r.action('TASK_CLAIM',{task:'W_V168_REACTION'});win(r);const oldWeek=r.s.tasks.week,weeklyProgress=progress(r,'W_WIN');advance(DAY);const v=r.taskView();assert.equal(r.s.tasks.week,oldWeek);assert(!r.s.tasks.claimed.D_WIN);assert(r.s.tasks.claimed.W_V168_REACTION);assert.equal(progress(r,'W_WIN'),weeklyProgress);assert(v.daily.some(t=>t.id==='D_WIN'));assert(!v.daily.some(t=>t.id==='D_V168_PYRO_HYDRO'));assert.equal(progress(r,'D_V168_PYRO_HYDRO'),0);new R(db,copy(r.s));
});

check('weekly reset restarts its roots and rejects delayed prior-week events',()=>{
 const r=high();quotaFixture(r,'W_V168_REACTION');r.action('TASK_CLAIM',{task:'W_V168_REACTION'});const stale=r.taskActivitySnapshot();advance(7*DAY);const v=r.taskView();assert(!r.s.tasks.claimed.W_V168_REACTION);assert(v.weekly.some(t=>t.id==='W_V168_REACTION'));assert(!v.weekly.some(t=>t.id==='W_WIN'));r.taskRecordActivity('win',{...stale,kinds:['win'],enemies:['MON_HILI_FIGHTER']});assert.equal(progress(r,'W_V168_REACTION'),0);new R(db,copy(r.s));
});

check('period assignment and rewards do not change when level or inventory changes',()=>{
 const r=unlock(fresh()),b=copy(r.tasksBox(true)),ids=copy(b.dailyIds),defs=copy(b.dailyDefinitions),weekIds=copy(b.weeklyIds);ownFixture(r);r.giveItem('ORE_IRON',100);r.taskView();assert.deepEqual(copy(r.s.tasks.dailyIds),ids);assert.deepEqual(copy(r.s.tasks.dailyDefinitions),defs);assert.deepEqual(copy(r.s.tasks.weeklyIds),weekIds);new R(db,copy(r.s));
});

check('legacy removed assignments disappear while earned currency and valid snapshots survive',()=>{
 const r=fresh();guild(r);const stamp=r.taskActivitySnapshot(),old=C.snapshotV0169;
 const dailyIds=['D_WIN','D_V168_HILI','D_LEY','D_LIFE'],weeklyIds=['W_WIN','W_V168_MOND_PATROL','W_V169_REPORT','W_V168_CRYO_VINE','W_V168_LIYUE_PATROL'];
 r.s.tasks={version:1,revision:169,day:stamp.day,week:stamp.week,daily:{},weekly:{},claimed:{D_V168_HILI:1,W_V168_CRYO_VINE:1,W_V168_LIYUE_PATROL:1},dailyIds,weeklyIds,dailyProgress:{D_WIN:2,D_V168_HILI:5},weeklyProgress:{W_WIN:7},dailyDefinitions:Object.fromEntries(dailyIds.map(id=>[id,definitionFixture(r,old.daily.find(t=>t.id===id),169)])),weeklyDefinitions:Object.fromEntries(weeklyIds.map(id=>[id,definitionFixture(r,old.weekly.find(t=>t.id===id),169)])),weeklyExpansionVersion:169};
 const mora=r.s.global.MORA,primo=r.s.global.PRIMOGEM;let restored=new R(db,copy(r.s));restored.taskView();assert.equal(restored.s.global.MORA,mora);assert.equal(restored.s.global.PRIMOGEM,primo);assert.equal(progress(restored,'D_WIN'),2);assert.equal(progress(restored,'W_WIN'),7);assert(restored.s.tasks.claimed.D_V168_HILI&&restored.s.tasks.claimed.W_V168_CRYO_VINE&&restored.s.tasks.claimed.W_V168_LIYUE_PATROL);
 for(const id of removed)assert(![...restored.s.tasks.dailyIds,...restored.s.tasks.weeklyIds].includes(id));for(const id of removed)assert.throws(()=>restored.action('TASK_CLAIM',{task:id}));restored=new R(db,copy(restored.s));assert.equal(restored.s.global.MORA,mora);
});

check('a strict 171 Liyue assignment retires while other frozen branch records survive',()=>{
 for(const alreadyClaimed of [false,true]){
  const r=high();quotaFixture(r,'W_V168_REACTION');r.action('TASK_CLAIM',{task:'W_V168_REACTION'});win(r);
  const saved=copy(r.s),box=saved.tasks,old=C.snapshotV01611,id='W_V168_LIYUE_PATROL';box.revision=171;
  for(const scope of ['daily','weekly'])for(const d of Object.values(box[scope+'Definitions']))if(d.revision===172)d.revision=171;
  for(const q of Object.values(saved.quests))if(q.taskObjective?.definition?.revision===172)q.taskObjective.definition.revision=171;
  // Labelled historical 171 fixture reconstructs the one removed child only;
  // native root acceptance, reaction payout and unrelated victory remain real.
  box.weeklyIds.push(id);box.weeklyDefinitions[id]=definitionFixture(r,old.weekly.find(t=>t.id===id),171);box.weeklyActiveSeq[id]=box.weeklyActiveSeq.W_WIN;
  box.weeklyProgress[id]=alreadyClaimed?box.weeklyDefinitions[id].goal:13;if(alreadyClaimed)box.claimed[id]=1;
  const definitions=copy(box.weeklyDefinitions),active=copy(box.weeklyActiveSeq),daily=Object.fromEntries(['dailyIds','dailyDefinitions','dailyProgress','dailyActiveSeq'].map(key=>[key,copy(box[key])])),total=box.weeklyIds.length-1,period=[box.day,box.week],wins=box.weeklyProgress.W_WIN,mora=saved.global.MORA,primo=saved.global.PRIMOGEM;
  for(const mutate of [s=>s.tasks.weeklyProgress.W_V168_EXPERIENCE=s.tasks.weeklyDefinitions.W_V168_EXPERIENCE.goal,s=>s.tasks.weeklyActiveSeq[id]=Number.MAX_SAFE_INTEGER,s=>s.tasks.weeklyDefinitions[id].reward.mora=99999999]){const bad=copy(saved);mutate(bad);assert.throws(()=>new R(db,bad),/임무 기록/,'archived 171 validation remains strict before retirement');}
  const restored=new R(db,saved);restored.taskView();assert.equal(restored.s.tasks.revision,172);assert(!restored.s.tasks.weeklyIds.includes(id));assert(!restored.s.tasks.weeklyDefinitions[id]);assert(!restored.s.tasks.weeklyProgress[id]);assert(!restored.s.tasks.weeklyActiveSeq[id]);
  assert.equal(restored.s.tasks.weeklyIds.length,total);assert.deepEqual([restored.s.tasks.day,restored.s.tasks.week],period);for(const [key,value] of Object.entries(daily))assert.deepEqual(copy(restored.s.tasks[key]),value);assert.equal(progress(restored,'W_WIN'),wins);for(const kept of box.weeklyIds.filter(key=>key!==id)){assert.deepEqual(copy(restored.s.tasks.weeklyDefinitions[kept]),definitions[kept]);assert.equal(restored.s.tasks.weeklyActiveSeq[kept],active[kept]);}
  assert.equal(restored.s.global.MORA,mora);assert.equal(restored.s.global.PRIMOGEM,primo);assert.equal(!!restored.s.tasks.claimed[id],alreadyClaimed);assert.throws(()=>restored.action('TASK_CLAIM',{task:id}));new R(db,copy(restored.s));
 }
});

check('a genuinely accepted old reception lesson becomes reportable without inventing another quest',()=>{
 const r=fresh();guild(r);const old=C.snapshotV0169.chains.find(t=>t.id===ROOT),d=definitionFixture(r,old,169);
 r.s.quests[ROOT]={guildAccepted:true,claimed:false,node:'INVESTIGATE',state:'진행중',taskObjective:{version:2,progress:0,acceptedSeq:r.s.global.LAST_COMMITTED_ACTION_SEQ,definition:d}};
 const restored=new R(db,copy(r.s));restored.taskView();assert.equal(restored.s.quests[ROOT].taskObjective.progress,1);assert.equal(restored.s.quests[ROOT].node,'READY_TO_CLAIM');restored.action('CLAIM_QUEST',{quest:ROOT});assert(restored.s.quests[ROOT].claimed);new R(db,copy(restored.s));
});

check('a legacy accepted activity retains its frozen goal and can finish before reception practice',()=>{
 const r=fresh();guild(r);const id='Q_TASK_MOND_PATROL_01',old=C.snapshotV0169.chains.find(t=>t.id===id),d=definitionFixture(r,old,169);
 r.s.quests[id]={guildAccepted:true,claimed:false,node:'INVESTIGATE',state:'진행중',taskObjective:{version:2,progress:0,acceptedSeq:r.s.global.LAST_COMMITTED_ACTION_SEQ,definition:d}};
 let restored=new R(db,copy(r.s));assert(!restored.questUnlockReason(id));win(restored);assert.equal(restored.s.quests[id].taskObjective.progress,1);guild(restored);restored.action('CLAIM_QUEST',{quest:id});assert(restored.s.quests[id].claimed);restored=new R(db,copy(restored.s));assert(!restored.s.quests[ROOT]?.claimed);assert(!restored.questVisible('Q_TASK_MOND_PATROL_02'));
});

check('two one-time prerequisites are both required and cannot be bypassed by direct API',()=>{
 const r=high(),id='Q_TASK_LEARN_22';completedAncestorsFixture(r,id);delete r.s.quests.Q_TASK_LEARN_12;assert(!r.questVisible(id));assert.throws(()=>r.acceptCommission(id));completedAncestorsFixture(r,id);assert(r.questVisible(id));new R(db,copy(r.s));
});

check('tampered branch rewards, prerequisites and activation times are rejected',()=>{
 const r=high();guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_02'});r.taskView();
 const mutations=[s=>s.tasks.dailyDefinitions.D_WIN.reward.mora=99999999,s=>s.tasks.dailyActiveSeq.D_WIN=Number.MAX_SAFE_INTEGER,s=>s.tasks.dailyActiveSeq.D_V168_PYRO_HYDRO=0,s=>s.tasks.weeklyIds.push(s.tasks.weeklyIds[0]),s=>s.quests.Q_TASK_LEARN_02.taskObjective.definition.predecessor='',s=>s.tasks.dailyOpened=false,s=>delete s.tasks.dailyActiveSeq.D_WIN,s=>delete s.tasks.dailyOpened,s=>s.tasks.dailyProgress.D_V168_PYRO_HYDRO=s.tasks.dailyDefinitions.D_V168_PYRO_HYDRO.goal,s=>s.tasks.claimed.D_V168_PYRO_HYDRO=1];
 for(const [index,mutate] of mutations.entries()){const invalid=copy(r.s);mutate(invalid);assert.throws(()=>new R(db,invalid),/임무 기록/,'mutation '+index);}
});

function oldOrdinaryReport(r){
 guild(r);const id='Q_TASK_MOND_PATROL_01',d=definitionFixture(r,C.snapshotV0169.chains.find(t=>t.id===id),169);
 r.s.quests[id]={guildAccepted:true,claimed:false,node:'INVESTIGATE',state:'진행중',taskObjective:{version:2,progress:0,acceptedSeq:r.s.global.LAST_COMMITTED_ACTION_SEQ,definition:d}};
 win(r);guild(r);r.action('CLAIM_QUEST',{quest:id});assert(r.s.quests[id].claimed);
}

check('prior genuine ordinary report teaches reporting without refilling weekly counters',()=>{
 const r=fresh();oldOrdinaryReport(r);r.adminApply({op:'level',target:'ALL',value:10});unlock(r);completedAncestorsFixture(r,'Q_TASK_LEARN_16');guild(r);const before=copy(r.tasksBox(true)),mora=r.s.global.MORA;r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_16'});
 assert.equal(r.s.quests.Q_TASK_LEARN_16.taskObjective.progress,1);assert.equal(r.s.quests.Q_TASK_LEARN_16.node,'READY_TO_CLAIM');assert.deepEqual(copy(r.s.tasks.weeklyProgress),copy(before.weeklyProgress));assert.equal(r.s.global.MORA,mora);
 r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_16'});assert.equal(r.s.global.MORA-mora,1800);assert(r.questVisible('Q_TASK_LEARN_17'));assert(r.questVisible('Q_TASK_MOND_PATROL_02'));new R(db,copy(r.s));
});

check('an accepted 169 reporting lesson uses prior native report and preserves its frozen definition',()=>{
 const r=fresh();oldOrdinaryReport(r);const old=C.snapshotV0169;
 // Genuine ordinary report above, with labelled historical lesson ancestors.
 for(let n=1;n<=15;n++){const id='Q_TASK_LEARN_'+String(n).padStart(2,'0'),d=definitionFixture(r,old.chains.find(t=>t.id===id),169);r.s.quests[id]={guildAccepted:true,claimed:true,node:'COMPLETE',state:'완료',taskObjective:{version:2,progress:d.goal,acceptedSeq:r.s.global.LAST_COMMITTED_ACTION_SEQ,definition:d,...(d.reward.primogem?{primogemPaid:d.reward.primogem}:{})}};}
 const id='Q_TASK_LEARN_16',d=definitionFixture(r,old.chains.find(t=>t.id===id),169);r.s.quests[id]={guildAccepted:true,claimed:false,node:'INVESTIGATE',state:'진행중',taskObjective:{version:2,progress:0,acceptedSeq:r.s.global.LAST_COMMITTED_ACTION_SEQ,definition:d}};delete r.s.tasks;
 const restored=new R(db,copy(r.s));assert.equal(restored.s.quests[id].taskObjective.progress,1);assert.deepEqual(copy(restored.s.quests[id].taskObjective.definition),copy(d));guild(restored);restored.action('CLAIM_QUEST',{quest:id});assert(restored.questVisible('Q_TASK_LEARN_17'));new R(db,copy(restored.s));
});

check('five daily reports remains a weekly root only when enough reporting days remain',()=>{
 const r=fresh(),T=c.CRPGRuntime.tasksV0167;const nextMonday=(T.weekOf(r.tasksNow())+1)*7-3;advance(nextMonday*DAY-9*3600000+12*3600000-r.tasksNow());
 const monday=high();assert(monday.s.tasks.weeklyIds.includes('W_BONUS'));assert(monday.taskView().weekly.some(t=>t.id==='W_BONUS'));assert.equal(def(monday,'W_BONUS').goal,5);
 advance(4*DAY);const friday=high();assert(!friday.s.tasks.weeklyIds.includes('W_BONUS'));assert(C.legacyWeekly.some(t=>t.id==='W_BONUS'));assert(!friday.taskView().weekly.some(t=>t.id==='W_BONUS'));new R(db,copy(friday.s));
});

check('the first native battle after midnight counts without opening the task screen',()=>{
 let r=high();leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';advance(DAY);r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 const battle=r.s.runtime.id;r=new R(db,copy(r.s));for(const actor of r.s.runtime.actors)if(actor.side==='ENEMY')actor.hp=0;r.action('COMBAT_BEGIN',{battle});assert(r.s.combatReceipts[battle].victory);
 assert.equal(r.s.tasks.dailyProgress.D_WIN,1);assert.equal(r.s.tasks.weeklyProgress.W_V168_REACTION,1);new R(db,copy(r.s));
});

check('the first public gathering activity after midnight counts before any task view',()=>{
 const r=high();leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';advance(DAY);r.action('LIFE_START',{kind:'GATHER'});const job=copy(r.s.lifeJob),scene=r.lifeScene(job);advance(job.duration+100);
 const result=r.action('LIFE_FINISH',{job:job.id,elapsed:job.duration,inputs:scene.nodes.map((n,i)=>({at:600+i*300,node:i}))}).result;assert(!result.empty);
 assert.equal(r.s.tasks.dailyProgress.D_LIFE,1);assert.equal(r.s.tasks.weeklyProgress.W_V168_GATHER,1);assert.equal(r.s.tasks.dailyProgress.D_V168_APPLE||0,0,'still-locked gathering successor stays empty');new R(db,copy(r.s));
});

console.log(JSON.stringify({ok:!process.exitCode,checks:passed}));
