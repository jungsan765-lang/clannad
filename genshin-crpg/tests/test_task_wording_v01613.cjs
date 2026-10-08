'use strict';
// Wording is independent of immutable accepted objectives. Native acceptance,
// restart, reporting and replay checks guard against changing that contract.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {c,fresh,R,db}=require('./helpers_v011.cjs');
const C=c.CRPGTaskCatalogV0168,ROOT='Q_TASK_LEARN_01',XP='Q_TASK_LEARN_14';
const copy=x=>JSON.parse(JSON.stringify(x)),hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
let count=0;
function check(name,fn){try{fn();count++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function guild(r){if(r.s.placeVisit)r.action('PLACE_LEAVE');r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
function unlock(r){guild(r);r.action('COMMISSION_ACCEPT',{quest:ROOT});r.action('CLAIM_QUEST',{quest:ROOT});return r;}

check('169, 171 and 172 definitions and all prerequisite graphs remain exact',()=>{
 const expected={
  chains:'12442947883fbcf168ad2d37e7fcb60cfa389d7d00b3c3aeadef598188f6ef69',
  snapshotV0169:'6e241d72b645c4dc00911e39307b59554864388cdc3e43b4c8b881e46a543975',
  snapshotV01611:'bef650fa05f2c06fc14fef3e2e368cf8b05c7e786ebc79785b747d2426324e1d',
  dailyBranches:'ffedc5bdc8ef401adf7599cbfa765f62f65fb4d29af35c2257997683bd3eed40',
  weeklyBranches:'b3ca0d3641843de636c40036cd61c9b09c01f0ec8bef90a3eaa01e8c2d69a68e',
  oneTimeBranches:'476955c7b6cd8370e0d41b4c3857fc4f5d05f500be51f8ae3fbde9cfbb70bca4'
 };
 for(const[key,value]of Object.entries(expected))assert.equal(hash(C[key]),value,key);
 assert.equal(C.branchVersion,172);assert.equal(C.chains.length,288);
});

check('a new account still starts with the actual reception and report instructions',()=>{
 const r=fresh();guild(r);const entries=r.commissionEntries();assert.deepEqual(entries.map(q=>q.row[0]),[ROOT]);
 assert.match(entries[0].row[5],/이 의뢰를 수락한 뒤 캐서린에게 보고/);
 assert.equal(entries[0].taskDisplay.category,'모험 길잡이');
 r.action('COMMISSION_ACCEPT',{quest:ROOT});assert.equal(r.s.quests[ROOT].node,'READY_TO_CLAIM');
 const before=r.s.global.MORA;r.action('CLAIM_QUEST',{quest:ROOT});assert.equal(r.s.global.MORA-before,600);
 assert(r.commissionEntries().some(q=>q.row[0]===XP));assert.throws(()=>r.action('CLAIM_QUEST',{quest:ROOT}));
 new R(db,copy(r.s));
});

check('the natural experience title appears in offers, task conditions and installed rows',()=>{
 const r=unlock(fresh()),entry=r.commissionEntries().find(q=>q.row[0]===XP);
 assert.equal(entry.row[1],'비경에서 쌓는 경험');assert.match(entry.row[5],/경험치 비경에서 2번 승리/);
 assert.match(entry.row[5],/경험치 책은 계시의 꽃/);assert.equal(entry.definition.text,entry.row[5]);
 assert.equal(r.tables['22_QUEST_DB'].get(XP)[1],entry.row[1]);
 r.action('COMMISSION_ACCEPT',{quest:XP});assert.equal(r.questConditions(XP),'비경에서 쌓는 경험 (0/2)');
 assert.throws(()=>r.action('CLAIM_QUEST',{quest:XP}));
});

check('presentation leaves an accepted 172 objective unchanged across restart',()=>{
 let r=unlock(fresh());r.action('COMMISSION_ACCEPT',{quest:XP});
 const stored=JSON.stringify(r.s.quests[XP].taskObjective),reward=copy(r.s.quests[XP].taskObjective.definition.reward);
 assert.equal(r.s.quests[XP].taskObjective.definition.name,'경험치 비경으로 레벨링');
 for(let i=0;i<3;i++){const entry=r.commissionEntries().find(q=>q.row[0]===XP);assert.equal(entry.row[1],'비경에서 쌓는 경험');assert.deepEqual(copy(entry.reward),reward);r.questConditions(XP);}
 assert.equal(JSON.stringify(r.s.quests[XP].taskObjective),stored);
 r=new R(db,copy(r.s));assert.equal(JSON.stringify(r.s.quests[XP].taskObjective),stored);
 assert.equal(r.commissionEntries().find(q=>q.row[0]===XP).row[1],'비경에서 쌓는 경험');
 assert.equal(r.s.tasks.revision,172);
});

check('historical goal content is shown from the accepted definition rather than a replacement quota',()=>{
 const r=fresh(),old=C.snapshotV0169.chains.find(t=>t.id==='Q_TASK_TALENT_09'),before=JSON.stringify(old);
 const display=r.taskPresentation(old);
 assert.match(display.description,/태산부 Lv\.55 이상: 향릉·행추·중운과 2승/);
 assert.match(display.description,/주인공과 동료 3명으로 편성/);
 assert.match(display.description,/수락 후 집계, 캐서린에게 보고/);
 assert.equal(JSON.stringify(old),before);
});

check('all 288 generated commissions have purpose labels without fabricated story content',()=>{
 const r=unlock(fresh()),categories=new Set();
 for(const task of C.chains){const display=r.taskPresentation(task);categories.add(display.category);assert(!/레벨링/.test(display.name));assert(display.description);assert.equal(r.tables['22_QUEST_DB'].get(task.id)[1],display.name);}
 assert.deepEqual([...categories].sort(),['모험 길잡이','물자 의뢰','생활 의뢰','전투 의뢰'].sort());
 const delivery=C.chains.find(t=>t.id==='Q_TASK_GEAR_DELIVERY_01'),display=r.taskPresentation(delivery);
 assert.equal(display.name,delivery.name);assert.equal(display.description,delivery.description);
 const original=r.tables['22_QUEST_DB'].get('Q_MOND_EXP_PLAINS_CART').slice(),regular=r.commissionEntries().find(q=>q.row[0]===original[0]);
 assert(regular);assert.deepEqual(copy(regular.row),copy(original));assert.equal(regular.taskDisplay,undefined);
});

console.log(JSON.stringify({ok:!process.exitCode,checks:count,objectives:C.chains.length,revision:C.branchVersion}));
