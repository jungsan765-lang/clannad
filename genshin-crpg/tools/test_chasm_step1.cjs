'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),DB=JSON.parse(fs.readFileSync(root+'/content/db.json'));
const baseline=process.env.CRPG_BASELINE_SOURCE;
const report={version:'0.13.18',scope:'gameplay priority 1 only',fixture:'actual full runtime stack; synthetic starting states, not balance or full game playthroughs',checks:[],traces:[]};
const clone=x=>JSON.parse(JSON.stringify(x));
function stack(dir,skipNew=false){
 const c=vm.createContext({console,Date:class extends Date{static now(){return 1790355600000;}},setTimeout,clearTimeout,TextEncoder,TextDecoder});
 const html=fs.readFileSync(dir+'/index.html','utf8');
 for(const [,f] of html.matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ?]*)\.js)(?:\?[^" ]*)?"/g)){
  if(skipNew&&f==='runtime_chasm_skills.js')continue;
  vm.runInContext(fs.readFileSync(dir+'/'+f,'utf8'),c,{filename:f});
 }
 vm.runInContext(fs.readFileSync(dir+'/save_adapter.js','utf8'),c,{filename:'save_adapter.js'});
 return c;
}
const ctx=stack(root+'/source'),R=ctx.CRPGRuntime.Runtime;
const oldctx=baseline?stack(baseline,true):null;
const B='ECARD_HUSK_STANDARD_BANNER',V='ECARD_HUSK_BOW_VOLLEY',C='ECARD_BLACK_SWORD_COMBO',K='ECARD_BLACK_SWORD_BREAKER',KB='BLACK_SWORD_BREAKER_ATK_BUFF';
function write(){report.total=report.checks.length;report.passed=report.checks.filter(t=>t.passed).length;fs.mkdirSync(root+'/reports/chasm_step1',{recursive:true});fs.writeFileSync(root+'/reports/chasm_step1/runtime-tests.json',JSON.stringify(report,null,2));}
function test(name,fn){try{fn();report.checks.push({name,passed:true});}catch(e){report.checks.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.stack);}}
function fresh({count=4,level=12,seed=712,route='ROUTE_ISEKAI',Runtime=R,map='MAP_CHASM_DEEP'}={}){
 const r=new Runtime(DB);r.newGame({name:'층암 검증',route,seed,saveId:'CHASM-STEP1-'+seed+'-'+count});
 Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'HUB',STORY_CURSOR_NODE_ID:'HUB',ACTIVE_STORY_QUEST:'',SCREEN_MODE:'LOCATION',STORY_MENU_POLICY:'FULL',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,PLAYER_LEVEL_STATE:level,PLAYER_BASE_HP:100000});
 delete r.s.storyJourney;delete r.s.storyBreak;
 r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
 const ids=['MOND_NOELLE','MOND_AMBER','MOND_BARBARA'];r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(ids.map(id=>[id,{state:'JOINED'}])));
 for(const [i,id] of ids.slice(0,count-1).entries()){r.s.chars[id].level=level;r.s.chars[id].hp=r.character(id).maxHp;r.setParty(id,i+2);}
 return r;
}
function fixture(group='EG_CHASM_HUSK',count=4){
 const r=fresh({count});r.startBattle(group,'RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const b=r.s.runtime;assert(b);
 for(const a of b.actors)Object.assign(a,{hp:10000,maxHp:10000,atk:100,def:0,hit:95,eva:0,crit:0,critDmg:0,level:11,resist:0,spd:60,turns:1,guard:false,statuses:[],shields:[],cooldowns:{},slotDamageMultiplier:1,auras:[],aura:null,nextScorePenalty:0});
 Object.assign(b,{round:1,log:[],fields:[],phase:'WAIT_PLAYER',cursor:0,actionSequence:0});
 const p=r.combatActor();b.order=[{id:p.id,score:100},...b.actors.filter(a=>a.id!==p.id).map(a=>({id:a.id,score:1}))];b.turnStarted='1:'+p.id;
 Object.assign(r.s.global,{COMBAT_ACTION_PHASE:'WAIT_PLAYER',SCREEN_MODE:'COMBAT'});r.die=()=>1;r.random=()=>.5;
 return{r,b,p,enemies:b.actors.filter(a=>a.side==='ENEMY'),allies:b.actors.filter(a=>a.side==='ALLY'),cast(id,target){const card=r.cardDefinition(r.row('12_ENEMY_CARD_DB',id),true),a=b.actors.find(a=>a.source===card.owner);assert(a,'actor '+card.owner);return r.executeCard(a,card,target===undefined?p.id:target);}};
}
const s=(a,id)=>a.statuses.find(s=>s.id===id&&s.rounds>0);
if(oldctx)for(const g of ['EG_CHASM_HUSK','EG_CHASM_SERPENT'])test('baseline reproduces UNSUPPORTED_ENEMY: '+g,()=>{const r=fresh({Runtime:oldctx.CRPGRuntime.Runtime});assert.throws(()=>r.startBattle(g,'RANDOM'),e=>e.code==='UNSUPPORTED_ENEMY');});
test('four exact source scripts supported; READY/script/owner/target/trigger drift rejected',()=>{
 const r=fresh();assert.equal(ctx.CRPGRuntime.chasmSkillConfig.cards.length,4);
 for(const id of [B,V,C,K]){const c=r.cardDefinition(r.row('12_ENEMY_CARD_DB',id),true);assert.equal(r.cardSupport(c),'');
  for(const change of [{script:c.script+';UNKNOWN'},{ready:false},{owner:'MON_SLIME_PYRO'},{target:'SELF'},{trigger:'PASSIVE'}])assert(r.cardSupport({...c,...change}));
 }
 assert(r.cardSupport(r.cardDefinition(r.row('12_ENEMY_CARD_DB','ECARD_BLACK_AXE_CRUSH'),true)),'unrelated not enabled');
});
for(const group of ['EG_CHASM_HUSK','EG_CHASM_SERPENT'])for(const route of ['ROUTE_ISEKAI','ROUTE_TRAVELER'])for(const count of [1,2,3,4])test('start + save/reload '+group+' '+route+' '+count+' members',()=>{
 const r=fresh({count,route});r.startBattle(group,'RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const b=r.s.runtime;assert(b);assert.equal(b.chasmSkillVersion,1);assert.equal(b.phase,'WAIT_PLAYER');
 assert(b.actors.filter(a=>a.side==='ENEMY').length<=count);assert(b.order.every(t=>b.actors.some(a=>a.id===t.id)));
 const saved=r.serialize(),resumed=new R(DB,JSON.parse(saved));assert.equal(resumed.serialize(),saved);
 for(const a of b.actors.filter(a=>a.side==='ENEMY'))assert(r.enemyIntel(a.id).cards.every(c=>c.supported));
});
test('authored minimum level preserved and low-level actors have a working fallback',()=>{const{r,b,enemies}=fixture();for(const a of enemies){a.level=8;assert(r.actorCards(a).every(c=>c.level===11));r.aiTurn(a,[r.combatActor()]);}assert(b.log.some(e=>e.damage>0));});
test('banner affects own side including caster, max3, +10%, not player party',()=>{const{r,b,enemies,allies,cast}=fixture();for(let i=0;i<2;i++){const a=clone(enemies[1]);a.id+=':extra'+i;b.actors.push(a);}cast(B);const boosted=b.actors.filter(a=>s(a,'STATUS_ATK_UP'));assert.equal(boosted.length,3);assert(boosted.includes(enemies[0]));assert(boosted.every(a=>a.side==='ENEMY'&&Math.abs(r.combatStat(a,'atk')-110)<1e-8));assert(allies.every(a=>!s(a,'STATUS_ATK_UP')));});
test('banner requires two living unbuffed friendly actors; repeat denied without mutations',()=>{const{r,b,enemies,cast}=fixture();cast(B);const a=enemies.find(a=>a.source==='MON_HUSK_STANDARD');a.cooldowns[B]=0;const before=r.serialize();assert.throws(()=>cast(B),e=>e.code==='CHASM_CARD');assert.equal(r.serialize(),before);for(const t of enemies)if(t!==a)t.hp=0;assert(r.cardReason(a,r.cardDefinition(r.row('12_ENEMY_CARD_DB',B),true)));});
test('banner refreshes same named buff instead of stacking; expires on normal round schedule',()=>{
 const{r,b,enemies,cast}=fixture();cast(B);const a=enemies.find(a=>a.source==='MON_HUSK_STANDARD');
 for(let i=0;i<2;i++){const t=clone(enemies[1]);t.id+=':new'+i;t.statuses=[];b.actors.push(t);}a.cooldowns[B]=0;cast(B);
 assert.equal(a.statuses.filter(s=>s.id==='STATUS_ATK_UP').length,1);assert(Math.abs(r.combatStat(a,'atk')-110)<1e-8);
 r.roundEnd();assert.equal(s(a,'STATUS_ATK_UP').rounds,2);r.roundEnd();assert.equal(s(a,'STATUS_ATK_UP').rounds,1);r.roundEnd();assert(!s(a,'STATUS_ATK_UP'));assert.equal(r.combatStat(a,'atk'),100);
});
test('volley damages at most2 and uses resist-based 1-round slow after landed hits',()=>{const{r,allies,cast}=fixture();cast(V);assert.deepEqual(clone(allies.map(a=>10000-a.hp)),[65,0,0,65]);assert.equal(allies.filter(a=>s(a,'STATUS_SLOW')).length,2);assert.equal(r.combatStat(allies[0],'spd'),50);assert.equal(s(allies[0],'STATUS_SLOW').rounds,1);});
test('volley unavailable with one target or during cooldown, freeze; no invalid cast spending',()=>{const{r,allies,cast}=fixture();for(const a of allies.slice(1))a.hp=0;const before=r.serialize();assert.throws(()=>cast(V),e=>e.code==='CHASM_CARD');assert.equal(r.serialize(),before);
 allies[1].hp=10000;cast(V);assert.throws(()=>cast(V),e=>e.code==='CHASM_CARD');const a=r.s.runtime.actors.find(a=>a.source==='MON_HUSK_BOW');a.cooldowns[V]=0;r.addCombatStatus(a,'STATUS_FREEZE',1);assert.throws(()=>cast(V),e=>e.code==='CHASM_CARD');});
test('volley misses do not apply slow; successful damage can still fail resistance roll',()=>{
 const f=fixture();f.r.die=()=>100;f.cast(V);assert(f.allies.every(a=>a.hp===10000&&!s(a,'STATUS_SLOW')));
 const g=fixture();let rolls=[1,100,100,1,100,100];g.r.die=()=>rolls.shift()??100;g.cast(V);assert.deepEqual(clone(g.allies.map(a=>10000-a.hp)),[65,0,0,65]);assert(g.allies.every(a=>!s(a,'STATUS_SLOW')));
});
test('combo 0.48 twice; delay only when both hits land; existing larger penalty retained',()=>{const{r,p,cast}=fixture('EG_CHASM_SERPENT');cast(C);assert.equal(10000-p.hp,96);assert.equal(p.nextScorePenalty,8);p.nextScorePenalty=20;cast(C);assert.equal(p.nextScorePenalty,20);
 let rolls=[100,1,100];p.nextScorePenalty=0;const hp=p.hp;r.die=()=>rolls.shift()??100;cast(C);assert.equal(hp-p.hp,48);assert.equal(p.nextScorePenalty,0);
});
test('combo stops on lethal first hit; never hits or retargets a corpse',()=>{const{p,b,cast}=fixture('EG_CHASM_SERPENT');p.hp=20;cast(C);assert.equal(p.hp,0);assert.equal(b.log.filter(e=>e.card===C&&Object.hasOwn(e,'damage')).length,1);assert.equal(p.nextScorePenalty,0);});
test('breaker only has shielded legal targets; invalid target gives no cooldown or damage',()=>{const{r,p,allies,enemies,cast}=fixture('EG_CHASM_SERPENT');const a=enemies.find(a=>a.source==='MON_BLACK_SERPENT_SWORD'),card=r.cardDefinition(r.row('12_ENEMY_CARD_DB',K),true);r.shield(allies[1],500,K,2);assert.deepEqual(clone(r.cardTargets(a,card).map(a=>a.id)),[allies[1].id]);const before=r.serialize();assert.throws(()=>cast(K,p.id),e=>e.code==='TARGET');assert.equal(r.serialize(),before);});
test('breaker +50% only to shields; surviving shield does not grant ATK buff',()=>{const{r,p,enemies,cast}=fixture('EG_CHASM_SERPENT');r.shield(p,1000,'TEST',null);cast(K);assert.equal(p.shields[0].value,827.5);assert.equal(p.hp,10000);assert(!s(enemies[0],KB));assert.equal(enemies[0].cooldowns[K],2);});
test('breaker break grants exactly one2R +10% and uses normal HP spillover',()=>{const{r,p,enemies,cast}=fixture('EG_CHASM_SERPENT');r.shield(p,60,'TEST',null);cast(K);assert.equal(p.shields.length,0);assert.equal(10000-p.hp,75);assert(s(enemies[0],KB));assert(Math.abs(r.combatStat(enemies[0],'atk')-110)<1e-8);assert.equal(s(enemies[0],KB).rounds,2);
 enemies[0].cooldowns[K]=0;r.shield(p,1,'TEST',null);cast(K);assert.equal(enemies[0].statuses.filter(s=>s.id===KB).length,1);
});
test('shield multiplier composes with element weakness, never leaks into normal packets',()=>{const{r,p,enemies}=fixture('EG_CHASM_SERPENT');const a=enemies[0];r.shield(p,1000,'TEST',null,{damageMultipliers:{'물리':2}});r.applyDamage(a,p,100,{element:'물리',card:K});assert.equal(p.shields[0].value,700);r.applyDamage(a,p,100,{element:'물리',card:C});assert.equal(p.shields[0].value,500);assert.equal(p.shields[0].damageMultipliers['물리'],2);});
test('breaker miss and other attacks breaking a shield never grant its buff',()=>{const f=fixture('EG_CHASM_SERPENT');f.r.shield(f.p,1,'TEST',null);f.r.die=()=>100;f.cast(K);assert.equal(f.p.shields[0].value,1);assert(!s(f.enemies[0],KB));
 const g=fixture('EG_CHASM_SERPENT');g.r.shield(g.p,1,'TEST',null);g.cast(C);assert(!s(g.enemies[0],KB));});
test('knight AI picks a shielded enemy even when an unshielded enemy has less HP',()=>{const{r,b,p,allies,enemies}=fixture('EG_CHASM_SERPENT');p.hp=50;r.shield(allies[1],1000,'TEST',null);r.aiTurn(enemies[0],[p,...allies.slice(1)]);assert(b.log.some(e=>e.card===K&&e.target===allies[1].name&&e.absorbed>0));assert.equal(p.hp,50);});
test('archer AI prioritizes high-speed targets; banner AI never strengthens the player',()=>{const{r,b,allies,enemies}=fixture();allies[2].spd=150;allies[3].spd=140;const bow=enemies.find(a=>a.source==='MON_HUSK_BOW');r.aiTurn(bow,allies);assert.deepEqual(clone(allies.map(a=>10000-a.hp)),[0,0,65,65]);const a=enemies.find(a=>a.source==='MON_HUSK_STANDARD');r.aiTurn(a,allies);assert(s(a,'STATUS_ATK_UP'));assert(allies.every(a=>!s(a,'STATUS_ATK_UP')));});
test('read-only enemy intel labels, availability, cooldown and buff values preserve state/RNG',()=>{const{r,enemies,cast}=fixture();cast(B);const before=r.serialize();for(let i=0;i<3;i++)for(const a of enemies){const info=r.enemyIntel(a.id);assert(info.cards.every(c=>c.supported));assert(Number.isFinite(info.atk));}assert.equal(r.serialize(),before);});
for(const group of ['EG_CHASM_HUSK','EG_CHASM_SERPENT'])test('save midfight and advance identical commands/PRNG: '+group,()=>{
 let r=fresh();r.startBattle(group,'RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});let resumed=new R(DB,JSON.parse(r.serialize()));
 for(let n=0;n<8&&r.s.runtime;n++){const args={card:'PLAYER_BASIC_GUARD'};assert.equal(JSON.stringify(r.action('COMBAT',args)),JSON.stringify(resumed.action('COMBAT',args)));assert.equal(r.serialize(),resumed.serialize());resumed=new R(DB,JSON.parse(resumed.serialize()));}
});
test('saved buff/penalty/cooldown restored; damaged version/ATK modifiers rejected',()=>{
 const{r,enemies,cast}=fixture();cast(B);enemies[0].nextScorePenalty=8;const saved=JSON.parse(r.serialize());assert.equal(new R(DB,saved).serialize(),r.serialize());
 for(const version of [0,2,'1']){const bad=clone(saved);bad.runtime.chasmSkillVersion=version;assert.throws(()=>new R(DB,bad),e=>e.code==='CHASM_SKILL_VERSION');}
 const bad=clone(saved);bad.runtime.actors.find(a=>s(a,'STATUS_ATK_UP')).statuses.find(s=>s.id==='STATUS_ATK_UP').mods.atk.pct=100;assert.throws(()=>new R(DB,bad),e=>e.code==='CHASM_SKILL_SAVE');
});
if(oldctx)for(const [group,map] of [['EG_MOND_LOCAL_MOND_PLAINS_1','MAP_MOND_PLAINS'],['EG_TREASURE_PATROL','MAP_LIYUE_PLAINS'],['EG_LIYUE_RUIN','MAP_LIYUE_MOUNTAIN']])test('unchanged-region regression: identical start/actions/save '+group,()=>{
 const current=fresh({count:1,map,seed:1111}),prior=fresh({count:1,map,seed:1111,Runtime:oldctx.CRPGRuntime.Runtime});current.startBattle(group,'RANDOM');prior.startBattle(group,'RANDOM');assert.equal(current.serialize(),prior.serialize());current.action('COMBAT_BEGIN');prior.action('COMBAT_BEGIN');assert.equal(current.serialize(),prior.serialize());
 for(let n=0;n<3&&current.s.runtime;n++){current.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});prior.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});assert.equal(current.serialize(),prior.serialize());}
});
for(const group of ['EG_CHASM_HUSK','EG_CHASM_SERPENT'])test('real action loop completes, settles once, clears transient effects: '+group,()=>{
 const r=fresh({count:4,seed:400});r.startBattle(group,'RANDOM');r.action('COMBAT_BEGIN',{battle:r.s.runtime.id});const b=r.s.runtime,id=b.id;r.combatActor().atk=1500;let steps=0;
 while(r.s.runtime&&steps++<150){const target=r.s.runtime.actors.filter(a=>a.side==='ENEMY'&&a.hp>0).sort((x,y)=>x.hp-y.hp)[0];r.action('COMBAT',{card:'PLAYER_BASIC_ATTACK',target:target.id});}
 assert(!r.s.runtime,'must settle within150 manual turns');const outcome=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(outcome.victory,true);assert.equal(Object.keys(r.s.combatReceipts).filter(x=>x===id).length,1);const saved=r.serialize();r.finishBattle(true);assert.equal(r.serialize(),saved);assert.equal(new R(DB,JSON.parse(saved)).serialize(),saved);
 report.traces.push({group,manualActions:steps,result:outcome.result,rounds:outcome.rounds,skills:[...new Set(r.s.lastCombatLog.filter(e=>e.card).map(e=>e.card))]});
});
test('defeat also exits safely and records no victory',()=>{const{r,b,allies}=fixture('EG_CHASM_SERPENT',1);for(const a of allies)a.hp=1;const p=r.combatActor();b.order=b.actors.filter(a=>a.side==='ENEMY').map(a=>({id:a.id,score:100}));b.cursor=0;b.phase='RESOLVING';r.autoUntilPlayer();assert(!r.s.runtime);assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).victory,false);});
write();console.log(JSON.stringify({total:report.total,passed:report.passed,traces:report.traces},null,2));if(report.passed!==report.total)process.exitCode=1;
