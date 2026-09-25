'use strict';
// Product and DB are read-only. No candidate tuning is installed or invoked.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),crypto=require('crypto');
const base=path.resolve(__dirname,'..'),src=path.join(base,'source'),db=JSON.parse(fs.readFileSync(path.join(base,'content/db.json'))),clone=x=>JSON.parse(JSON.stringify(x));
const files=[...fs.readFileSync(path.join(src,'index.html'),'utf8').matchAll(/<script src="([^"]+)"/g)].map(x=>x[1]).filter(x=>x.startsWith('runtime')||x==='presentation.js');
const code=Object.fromEntries(files.map(f=>[f,fs.readFileSync(path.join(src,f),'utf8')]));
function runtime(legacy=false){const ctx=vm.createContext({console});for(const f of files)if(!legacy||f!=='runtime_adventure.js')vm.runInContext(code[f],ctx,{filename:f});return ctx.CRPGRuntime.Runtime;}
const R=runtime(),L=runtime(true),seed=i=>(Math.imul(i+1,2654435761)^0xa5a5a5a5)>>>0;
function fresh(C=R,i=0,size=1,level=1,map='MAP_MOND_PLAINS'){
 const r=new C(db);r.newGame({name:'실제품 균형 검증',route:'ROUTE_TRAVELER',seed:seed(i),saveId:'V07-INTEGRATED-'+i});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',CURRENT_MAP_ID:map,STORY_WAITING:true,STORY_MENU_POLICY:'FULL',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'LOCATION',ENCOUNTER_COOLDOWN:0});r.s.storyContext=null;
 const chars=['MOND_AMBER','MOND_KAEYA','MOND_LISA'].slice(0,size-1);r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(chars.map(id=>[id,{state:'JOINED'}])));for(let j=0;j<chars.length;j++)r.action('PARTY',{char:chars[j],slot:j+2});
 const xp=db['26_LEVEL_RULES'].slice(1).filter(x=>Number(x[0])<level).reduce((s,x)=>s+Number(x[2]),0);if(xp)for(const id of ['PLAYER_CUSTOM',...chars])r.addXp(id,xp);return r;
}
const report={generatedAt:new Date().toISOString(),sourceSHA256:Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(code[f]).digest('hex')])),databaseSHA256:crypto.createHash('sha256').update(JSON.stringify(db)).digest('hex'),fixtureDisclosure:'Normal stats/no gear/no meals/no inventory boosts. Explicit ownership/free-map/level fixtures. Actual product modules only; legacy comparison excludes runtime_adventure.js in isolated VM. startBattle selects the group for sampling; every combat turn uses public COMBAT_BEGIN/COMBAT.'};
const common=['EG_MOND_SLIME_SMALL','EG_MOND_HILI_PATROL','EG_MOND_HILI_ELITE','EG_MOND_ABYSS_MAGE','EG_TREASURE_PATROL'];
let invariants=0;
// Identical source before/after the new adapter: existing 3/4-party field stats and all fixed/boss stats.
for(const size of [1,2,3,4])for(const group of ['EG_BOSS_DVALIN','EG_BOSS_ANDRIUS','EG_CRPG_MOND_FIRST_FIELD',...(size>=3?common:[])]){
 const a=fresh(R,320,size,4),b=fresh(L,320,size,4);a.startBattle(group,'RANDOM');b.startBattle(group,'RANDOM');assert.deepEqual(clone(a.s.runtime),clone(b.s.runtime),`${size}/${group} unchanged runtime`);assert.equal(a.s.global.PRNG_STATE,b.s.global.PRNG_STATE);invariants++;
}
// Candidate F uses the actual rolled initiative and never re-applies during load.
for(const size of [1,2])for(const group of common){
 const a=fresh(R,200,size),b=fresh(L,200,size);a.startBattle(group,'RANDOM');b.startBattle(group,'RANDOM');
 assert.equal(a.s.global.PRNG_STATE,b.s.global.PRNG_STATE);assert.equal(a.s.runtime.balanceProfile.party,size);assert.equal(a.s.runtime.actors.filter(x=>x.side==='ENEMY').length,size);
 const keep=new Set(a.s.runtime.actors.map(x=>x.id));assert.deepEqual(clone(a.s.runtime.order),clone(b.s.runtime.order.filter(x=>keep.has(x.id))));assert.deepEqual(clone(a.s.runtime.opening.initialOrder),clone(a.s.runtime.order));
 for(const actor of a.s.runtime.actors.filter(x=>x.side==='ENEMY')){const before=b.s.runtime.actors.find(x=>x.id===actor.id),tier=({일반:2,정예:2.8,강적:4}[actor.grade]||1);assert.equal(actor.maxHp,Math.round(before.maxHp/tier*(size===1?.3:.5)));assert.equal(actor.atk,Math.round(before.atk*(size===1?.35:.65)));assert.equal(actor.def,before.def);assert.equal(actor.level,before.level);}
 const resume=new R(db,JSON.parse(a.serialize()));assert.deepEqual(clone(resume.s.runtime),clone(a.s.runtime));assert.equal(resume.s.global.PRNG_STATE,a.s.global.PRNG_STATE);
 const action={id:a.s.global.SAVE_ID+':'+(a.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:a.s.global.SAVE_REVISION,type:'COMBAT_BEGIN',battle:a.s.runtime.id};assert.deepEqual(clone(a.transact(action)),clone(resume.transact(action)));const state=resume.serialize();resume.transact(action);assert.equal(resume.serialize(),state);invariants++;
}
// Public quest action reaches adjusted patrol; authored fixed tutorial stays unadjusted.
for(const [quest,adjusted]of [['Q_MOND_EXP_PLAINS_CAMP',true],['Q_CRPG_MOND_FIRST_FIELD',false]]){
 const r=fresh(R,33);r.questState(quest).guildAccepted=true;r.action('QUEST_CHOICE',{quest,choice:'careful'});assert.equal(!!r.s.runtime.balanceProfile,adjusted);assert.equal(r.playPhase(),'COMBAT_OPENING');invariants++;
}
report.invariantsPassed=invariants;console.log('PASS '+invariants+' integration invariants');report.balance=[];
for(const [groups,levels,n]of [[common,[1,4],16],[['EG_DRAGON_CRYO','EG_DRAGON_MITA'],[4,8],8]])for(const level of levels)for(const size of [1,2])for(const group of groups){
 const rows=[];for(let i=0;i<n;i++){
  const r=fresh(R,i+100,size,level,group.startsWith('EG_DRAGON')?'MAP_DRAGONSPINE':'MAP_MOND_PLAINS');r.startBattle(group,'RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});let actions=0;
  while(r.s.runtime&&actions++<100){const cards=r.combatCards().filter(c=>!c.reason),card=cards.find(c=>c.id==='PLAYER_BASIC_ATTACK'&&c.targets.length)||cards.find(c=>c.id==='PLAYER_BASIC_GUARD');assert.ok(card);const target=[...card.targets].sort((a,b)=>a.hp-b.hp||a.id.localeCompare(b.id))[0];r.action('COMBAT',{card:card.id,target:target?.id});}
  assert.equal(r.s.runtime,null,'combat resolves');const result=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);rows.push({seed:seed(i+100),victory:result.victory,rounds:result.rounds,playerRemaining:r.s.global.PLAYER_HP_CURRENT,actions});
 }
 const q={level,size,group,samples:n,wins:rows.filter(x=>x.victory).length,protagonistSurvivals:rows.filter(x=>x.victory&&x.playerRemaining>0).length,meanRounds:rows.reduce((s,x)=>s+x.rounds,0)/n,rows};report.balance.push(q);console.log(JSON.stringify({...q,rows:undefined}));
}
report.samples=report.balance.reduce((n,q)=>n+q.samples,0);report.wins=report.balance.reduce((n,q)=>n+q.wins,0);report.protagonistSurvivals=report.balance.reduce((n,q)=>n+q.protagonistSurvivals,0);
fs.writeFileSync(path.join(base,'reports/balance-v07.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({invariants,samples:report.samples,wins:report.wins,protagonistSurvivals:report.protagonistSurvivals}));
