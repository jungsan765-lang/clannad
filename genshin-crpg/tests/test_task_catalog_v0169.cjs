'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context=vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../source/runtime_task_catalog_v0168.js'),'utf8'),context);
const c=JSON.parse(JSON.stringify(context.CRPGTaskCatalogV0168));
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
assert.equal(c.version,'0.16.9');
assert.equal(hash(c.legacyChains),'b94d66928cd5bdfd3f9db5d540fb6a80b066d733be06eae7465e8d31040e5b92','all 240 accepted 0.16.8 definitions retain their original goals, filters, and rewards');
assert.equal(hash(c.legacyDailyDefinitions),'7e765ca9a7734a6767391df785ae9a9a593cef303a325494666955ac604c7e26','same-day legacy recurring objectives remain exact');
assert.equal(hash(c.legacyWeeklyDefinitions),'354b2d0044ffa5745a5f70d5776799326fb3ea0f6352d4beed3c762d94a8959c','same-week legacy recurring objectives remain exact');
assert.equal(c.chains.length,240);assert.equal(c.families.length,24);
assert.equal(c.daily.length+c.legacyDaily.length,12);assert.equal(c.weekly.length+c.legacyWeekly.length,24);
assert.equal(c.notes.dailySlots,4);assert.equal(c.notes.weeklySlots,20);
assert.equal(c.notes.dailyPrimogems,20);assert.equal(c.notes.weeklyAllPrimogems,200);
const recurring=[...c.daily,...c.legacyDaily,...c.weekly,...c.legacyWeekly];
const all=[...c.chains,...recurring];
assert.equal(new Set(all.map(t=>t.id)).size,all.length,'all current definitions have stable unique IDs');
const levels=[1,10,20,30,40,50,60];
for(const t of recurring){
 assert(Number.isSafeInteger(t.goal)&&t.goal>0,t.id+': positive objective');
 assert.deepEqual(t.reward.moraByLevel.map(b=>b.minLevel),levels,t.id+': explicit account-level cash brackets');
 let before=-1;for(const bracket of t.reward.moraByLevel){assert(Number.isSafeInteger(bracket.mora)&&bracket.mora>=0);assert(bracket.mora>=before);before=bracket.mora;}
 assert(t.goal>=3||t.kind==='ley',t.id+': daily/weekly activities increased rather than forced difficulties');
}
for(const t of [...c.daily,...c.legacyDaily]){
 assert.equal(t.minLevel,1,t.id+': no arbitrary daily level gate');
 assert(!t.filter.minStage&&!t.filter.stages&&!t.filter.maps&&!t.filter.resources&&!t.filter.recipes&&!t.filter.enemies&&!t.filter.party,t.id+': daily target leaves stage, region, resource, recipe, enemy and party selection free');
}
const gather=c.daily.find(t=>t.id==='D_V168_APPLE');
assert.equal(gather.kind,'gather');assert.equal(gather.goal,3);assert.equal(gather.countMode,'actions');assert(!gather.name.includes('사과'));
assert(c.daily.find(t=>t.id==='D_V168_PYRO_HYDRO').dynamicElements);
assert(c.weekly.find(t=>t.id==='W_V168_REACTION').dynamicElements);
assert.equal(c.legacyWeekly.find(t=>t.id==='W_WIN').goal,150);
assert.equal(c.legacyWeekly.find(t=>t.id==='W_DOMAIN').goal,30);
assert.equal(c.weekly.find(t=>t.id==='W_V168_DOMAIN_CIRCUIT').goal,50);
for(const kind of ['TALENT','ASCENSION','EXP'])assert(c.weekly.some(t=>t.kind==='domain'&&t.filter.domainTypes?.includes(kind)&&t.goal===20&&t.weeklyCore===true));
assert.equal(c.weekly.find(t=>t.id==='W_V168_ORE_SUPPLY').countMode,'units');
assert.equal(c.weekly.find(t=>t.id==='W_V168_FORGE').filter.equipmentOutput,true,'cheap non-equipment crafting does not satisfy the equipment objective');
const cash=t=>t.reward.moraByLevel.at(-1).mora;
assert(cash(c.weekly.find(t=>t.id==='W_V168_WEALTH'))>cash(c.weekly.find(t=>t.id==='W_V168_FISH')),'cash priority differs from Primogem/activity priority');
assert(new Set(c.weekly.map(cash)).size>=14,'weekly cash payouts differ across objective effort and resource costs');
let mora=0,primo=0,zero=0;
for(const family of c.families){
 const rows=c.chains.filter(t=>t.family===family.id);assert.equal(rows.length,10);
 assert.equal(new Set(rows.map(t=>JSON.stringify([t.kind,t.goal,t.filter]))).size,10,family.id+': ten distinct native objectives');
 let familyMora=0,familyPrimo=0;
 rows.forEach((t,i)=>{
  assert.equal(t.predecessor,i?rows[i-1].id:'');assert.equal(t.tier,i+1);assert.equal(t.rewardScale,'absolute');
  assert(Number.isSafeInteger(t.reward.mora)&&t.reward.mora>=0);assert(Number.isSafeInteger(t.reward.primogem||0)&&(t.reward.primogem||0)>=0);
  assert(Object.keys(t.reward).every(k=>['mora','primogem'].includes(k)),'no new currency, item reward, or growth book');
  assert(!t.repeat&&!t.daily&&!t.weekly,'finite one-time chain');
  familyMora+=t.reward.mora;familyPrimo+=t.reward.primogem||0;if(t.reward.mora===0)zero++;
 });
 assert.equal(family.mora,familyMora);assert.equal(family.primogem,familyPrimo);mora+=familyMora;primo+=familyPrimo;
}
assert(zero>=15,'some demanding missions deliberately prioritize Primogems without cash');
assert.equal(mora,2618700);assert.equal(primo,17625);
assert.equal(c.notes.commissionMora,mora);assert.equal(c.notes.commissionPrimogems,primo);
assert.equal(c.notes.commissionRepeatable,false);assert.equal(c.notes.commissionRewardSchedule,'PER_OBJECTIVE_ABSOLUTE');
assert(c.families.find(t=>t.id==='WEALTH').mora>c.families.find(t=>t.id==='MOND_GATHER').mora*8,'the cash-oriented chain materially outpays low-risk gathering');
assert(c.families.find(t=>t.id==='ABYSS').primogem>c.families.find(t=>t.id==='MOND_GATHER').primogem*40,'high-risk challenge rewards are not the same as gathering');
vm.runInContext(fs.readFileSync(path.join(__dirname,'../source/runtime_task_learning_catalog_v0169.js'),'utf8'),context);
const active=JSON.parse(JSON.stringify(context.CRPGTaskCatalogV0168)),combined=active.snapshotV0169;assert.equal(active.version,'0.16.12');assert.equal(active.branchVersion,172);assert(combined&&combined.version==='0.16.9');
assert.equal(combined.chains.length,288);assert.equal(combined.weekly.length,31);
assert.equal(active.families.length,29);
assert.equal(active.snapshotV01611.version,'0.16.11');assert.equal(active.snapshotV01611.branchVersion,171);assert.equal(active.snapshotV01611.daily.length,11);assert.equal(active.snapshotV01611.weekly.length,28);assert.equal(active.snapshotV01611.chains.length,288);
assert(active.snapshotV01611.weekly.some(t=>t.id==='W_V168_LIYUE_PATROL'));assert(![...active.legacyWeekly,...active.weekly].some(t=>t.id==='W_V168_LIYUE_PATROL'));
assert.deepEqual(active.snapshotV01611.removedRecurringIds.slice().sort(),['D_V168_HILI','W_V168_MOND_PATROL','W_V168_CRYO_VINE','W_V169_REPORT'].sort());

assert.equal(combined.chains.reduce((n,t)=>n+(t.reward.mora||0),0),2671660);
assert.equal(combined.chains.reduce((n,t)=>n+(t.reward.primogem||0),0),17875);
assert.equal(hash(combined.legacyChains),hash(c.legacyChains),'learning additions do not overwrite old accepted definitions');
const report=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/data/task_rewards_v0169.json'),'utf8'));
assert.equal(report.finiteTotals.mora,2671660);assert.equal(report.finiteTotals.primogem,17875);
assert.equal(report.policy.totalWeeklyCandidates,31);
assert.equal(report.objectives.length,288);
assert.equal(report.source.sha256,crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../source/runtime_task_catalog_v0168.js'))).digest('hex'));
const learningSource=fs.readFileSync(path.join(__dirname,'../source/runtime_task_learning_catalog_v0169.js'),'utf8'),archiveMarker=learningSource.indexOf('// 0.16.11: retain');assert(archiveMarker>0);const originalLearningSource=learningSource.slice(0,archiveMarker)+'})(globalThis);\n';assert.equal(report.source.learningCatalogue.sha256,crypto.createHash('sha256').update(originalLearningSource).digest('hex'),'the complete original 169 overlay bytes remain intact before the appended 171 rules');
const activeDaily=[...active.legacyDaily,...active.daily],activeWeekly=[...active.legacyWeekly,...active.weekly];assert.equal(activeDaily.length,11);assert.equal(activeWeekly.length,27);assert.equal(active.chains.length,288);
assert.equal(hash(activeDaily),hash(active.snapshotV01611.daily));assert.equal(hash(activeWeekly),hash(active.snapshotV01611.weekly.filter(t=>t.id!=='W_V168_LIYUE_PATROL')));assert.equal(hash(active.chains),hash(active.snapshotV01611.chains));
assert.deepEqual(active.dailyBranches,active.snapshotV01611.dailyBranches);assert.deepEqual(active.oneTimeBranches,active.snapshotV01611.oneTimeBranches);assert.deepEqual(active.weeklyBranches,Object.fromEntries(Object.entries(active.snapshotV01611.weeklyBranches).filter(([id])=>id!=='W_V168_LIYUE_PATROL')));
const oldRecurring=[...combined.daily,...combined.weekly],activeRecurring=[...activeDaily,...activeWeekly];assert.deepEqual(oldRecurring.filter(t=>!activeRecurring.some(x=>x.id===t.id)).map(t=>t.id).sort(),['D_V168_HILI','W_V168_MOND_PATROL','W_V168_CRYO_VINE','W_V169_REPORT','W_V168_LIYUE_PATROL'].sort(),'only the five user-requested recurring definitions retire');
for(const [rows,branches]of [[activeDaily,active.dailyBranches],[activeWeekly,active.weeklyBranches],[active.chains,active.oneTimeBranches]]){assert.deepEqual(Object.keys(branches).sort(),rows.map(t=>t.id).sort());for(const t of rows)assert(Array.isArray(branches[t.id]));}
assert.equal(hash(combined.legacyChains),hash(c.legacyChains));assert.equal(active.chains.reduce((n,t)=>n+(t.reward.mora||0),0),2671660);assert.equal(active.chains.reduce((n,t)=>n+(t.reward.primogem||0),0),17875);
console.log('통과: frozen 0.16.9 definitions/rewards · 0.16.12 active daily11/weekly27/finite288 · exactly five requested retirements');
