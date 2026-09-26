'use strict';
// v0.13.33 step 12-4 foundation: equipment traits, battle line order, enemy target rules, hazards, weapon classes.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),runtimeDir=process.env.CRPG_RUNTIME_DIR||'source',dir=path.join(root,runtimeDir),DB=JSON.parse(fs.readFileSync(root+'/content/db.json','utf8'));
let clock=1790355600000;
const ctx=vm.createContext({console,Date:class extends Date{static now(){return clock;}},setTimeout,clearTimeout,TextEncoder,TextDecoder});
for(const[,f]of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ?]*)\.js)(?:\?[^" ]*)?"/g))vm.runInContext(fs.readFileSync(dir+'/'+f,'utf8'),ctx,{filename:f});
const api=ctx.CRPGRuntime,R=api.Runtime,L=x=>JSON.parse(JSON.stringify(x));
const report={version:'0.13.33',runtimeDir,scope:'equipment traits, battle line, enemy target rules, hazards, weapon classes',checks:[]};
function test(n,f){try{report.checks.push({name:n,passed:true,evidence:f()||null});console.log('PASS '+n);}catch(e){report.checks.push({name:n,passed:false,error:e.stack});console.error('FAIL '+n+'\n'+e.stack);}}
let seq=0;
function fresh(route='ROUTE_TRAVELER',map='MAP_MOND_PLAINS'){const r=new R(DB);r.newGame({name:'점검',route,seed:1333+seq,saveId:'GT-'+(++seq)});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,WORLD_TIME:'12:00',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION',MORA:99999,PLAYER_LEVEL_STATE:9});delete r.s.storyJourney;delete r.s.storyBreak;try{r.prepareStory();}catch{}r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;return r;}
function join(r,ids){const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');ids.forEach((id,i)=>{own[id]={state:'JOINED'};r.s.chars[id].level=9;r.s.chars[id].hp=r.character(id).maxHp;r.s.party[i+1]={slot:'PARTY_'+(i+2),type:'CHAR',source:id,control:'AI',active:true,tactic:'균형'};});r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);}
function wear(r,id,owner){const slot=r.giveEquipment(id);r.action('EQUIP',{slot,owner});return slot;}
function battle(r,group='EG_MOND_HILI_ELITE'){r.startBattle(group,'RANDOM');const b=r.s.runtime;if(b.opening)r.action('COMBAT_BEGIN',{battle:b.id});return r.s.runtime;}
function standby(r,group='EG_MOND_HILI_ELITE'){r.startBattle(group,'RANDOM');return r.s.runtime;}// opening pending: nobody has acted
const ally=(b,src)=>b.actors.find(a=>a.side==='ALLY'&&a.source===src),foe=b=>b.actors.find(a=>a.side==='ENEMY');

test('Liyue companions can hold their official weapon class',()=>{const r=fresh();for(const [id,w]of Object.entries(api.gearTraits.liyueWeapons))assert.deepEqual(L(r.equipmentProficiencies(id)),[w],id);
 join(r,['LIYUE_KEQING']);wear(r,'EQ_SWORD_COOL_STEEL','LIYUE_KEQING');assert(r.s.inventory.some(i=>i.equip==='EQ_SWORD_COOL_STEEL'&&i.owner==='LIYUE_KEQING'&&i.equipped));
 assert.throws(()=>wear(r,'EQ_BOW_SLINGSHOT','LIYUE_KEQING'),/무기/);return {covered:Object.keys(api.gearTraits.liyueWeapons).length};});
test('traits add up from worn gear and the weapon class, with caps and readable lines',()=>{const r=fresh();join(r,['MOND_NOELLE']);
 wear(r,'EQ_ARMOR_FROSTWARD','MOND_NOELLE');wear(r,'EQ_ACC_STEADFAST','MOND_NOELLE');wear(r,'EQ_CLAYMORE_WHITEBLIND','MOND_NOELLE');
 const t=L(r.actorTraits('MOND_NOELLE'));assert.equal(t.COLD,60);assert.equal(t.STAGGER_RES,100);assert.equal(t.CONTROL_RES,20);assert.equal(t.ARMOR_BREAK,25);assert.equal(t.HEAVY,6);assert.equal(t.STACK_ATK,3);
 const lines=r.gearTraitLines('EQ_CLAYMORE_WHITEBLIND');assert(lines.some(l=>l.innate&&/파쇄/.test(l.text)));assert(lines.some(l=>!l.innate&&/연속 적중/.test(l.text)));
 assert(r.traitSummary('MOND_NOELLE').some(x=>/냉기 감속 무시/.test(x.text)));return {traits:t};});
test('battle line order is saved, validated and decides positions and slot bonuses',()=>{const r=fresh();join(r,['MOND_NOELLE','MOND_AMBER','MOND_LISA']);
 assert.deepEqual(L(r.formationOrder()),['PLAYER_CUSTOM','MOND_NOELLE','MOND_AMBER','MOND_LISA']);
 assert.throws(()=>r.action('FORMATION_SET',{order:['MOND_NOELLE','MOND_AMBER','MOND_LISA']}),/순서/);assert.throws(()=>r.action('FORMATION_SET',{order:['MOND_NOELLE','MOND_NOELLE','MOND_AMBER','PLAYER_CUSTOM']}),/순서/);
 r.action('FORMATION_SET',{order:['MOND_LISA','MOND_AMBER','MOND_NOELLE','PLAYER_CUSTOM']});const base=r.character('MOND_AMBER'),player=r.player(),b=standby(r);
 const pos=Object.fromEntries(b.actors.filter(a=>a.side==='ALLY').map(a=>[a.source,a.slot]));assert.deepEqual(pos,{MOND_LISA:1,MOND_AMBER:2,MOND_NOELLE:3,PLAYER_CUSTOM:4});
 assert.deepEqual(L(b.actors.filter(a=>a.side==='ALLY').map(a=>a.position.y)),[0,1,2,3]);assert.equal(ally(b,'MOND_AMBER').crit,base.crit+5);assert.equal(ally(b,'PLAYER_CUSTOM').slotDamageMultiplier,.8);assert.equal(ally(b,'MOND_NOELLE').maxHp,Math.round(r.character('MOND_NOELLE').maxHp*1.05));
 assert.equal(ally(b,'PLAYER_CUSTOM').crit,player.crit);const again=new R(DB,JSON.parse(r.serialize()));assert.deepEqual(L(again.formationOrder()),['MOND_LISA','MOND_AMBER','MOND_NOELLE','PLAYER_CUSTOM']);
 assert.throws(()=>new R(DB,{...JSON.parse(r.serialize()),formation:['A','A']}),/대열/);return pos;});
test('leaving and joining members keep the line consistent',()=>{const r=fresh();join(r,['MOND_NOELLE','MOND_AMBER']);r.action('FORMATION_SET',{order:['MOND_AMBER','PLAYER_CUSTOM','MOND_NOELLE']});
 r.action('PARTY_REMOVE',{slot:2});assert.deepEqual(L(r.s.formation),['MOND_AMBER','PLAYER_CUSTOM']);const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);own.MOND_LISA={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.action('PARTY',{char:'MOND_LISA',slot:2});
 assert.deepEqual(L(r.formationOrder()),['MOND_AMBER','PLAYER_CUSTOM','MOND_LISA']);return L(r.formationOrder());});
test('enemy target rules weigh the front row, back row, lead, tail and snipers; gear adds aggro or stealth',()=>{const r=fresh();join(r,['MOND_NOELLE','MOND_AMBER','MOND_LISA']);wear(r,'EQ_LIYUE_ACC_COURIER_KNOT','MOND_LISA');const b=standby(r),e=foe(b),allies=b.actors.filter(a=>a.side==='ALLY');
 const w=rule=>{e.targetRule=rule;return Object.fromEntries(allies.map(t=>[t.slot,Math.round(r.enemyTargetWeight(e,t,allies)*100)/100]));};
 const q=x=>Math.round(x*100)/100;assert.deepEqual(w('FRONT'),{1:2.2,2:2.2,3:.45,4:q(.45*.75)});assert.deepEqual(w('BACK'),{1:.6,2:.6,3:1.9,4:q(1.9*.75)});assert.equal(w('LEAD')[1],3);assert.equal(w('TAIL')[4],q(3*.75));
 const top=allies.slice().sort((x,y)=>r.combatStat(y,'atk')-r.combatStat(x,'atk'))[0];assert.equal(w('HIGHEST_ATK')[top.slot],top.source==='MOND_LISA'?q(3*.75):3);
 assert.equal(r.defaultEnemyTargetRule({range:'근접',grade:'일반'}),'FRONT');assert.equal(r.defaultEnemyTargetRule({range:'원거리',grade:'정예',tactic:'공격우선'}),'BACK');
 const info=L(r.enemyIntel(e.id));assert(info.targetRuleLabel);return {front:w('FRONT'),back:w('BACK')};});
test('the weighted pick favours the front row against a melee enemy',()=>{const r=fresh();join(r,['MOND_NOELLE','MOND_AMBER','MOND_LISA']);const b=standby(r),e=foe(b),allies=b.actors.filter(a=>a.side==='ALLY');e.targetRule='FRONT';const hits={1:0,2:0,3:0,4:0};
 for(let n=0;n<200;n++){delete e.lastTargetId;const before=L(allies.map(a=>a.hp));for(const a of allies)a.hp=a.maxHp;r.aiTurn(e,allies.slice());hits[e.lastTargetId&&allies.find(a=>a.id===e.lastTargetId).slot]++;}
 assert(hits[1]+hits[2]>(hits[3]+hits[4])*2.5,JSON.stringify(hits));return hits;});
test('an adjacent ally with a shield or cover gear takes single-target hits, never area ones',()=>{const r=fresh();join(r,['MOND_NOELLE','MOND_AMBER','MOND_LISA']);wear(r,'EQ_ACC_GUARDIAN_TOKEN','MOND_NOELLE');const b=standby(r),e=foe(b),target=ally(b,'PLAYER_CUSTOM'),guard=ally(b,'MOND_NOELLE');
 assert.equal(r.combatDistance(guard,target),1);r.shield(guard,999,'TEST',5);let covered=0;for(let n=0;n<60;n++){b.actionSequence=(b.actionSequence||0)+1;target.hp=target.maxHp;const start=b.log.length;r.damage(e,target,.5,'PHYSICAL',{sureHit:true});if(b.log.slice(start).some(x=>x.cover))covered++;}
 let areaCovered=0;for(let n=0;n<30;n++){b.actionSequence++;const start=b.log.length;r.damage(e,target,.5,'PHYSICAL',{sureHit:true,aoe:true});if(b.log.slice(start).some(x=>x.cover))areaCovered++;}
 const far=ally(b,'MOND_LISA');assert.equal(r.combatDistance(guard,far),2);let farCovered=0;for(let n=0;n<30;n++){b.actionSequence++;const start=b.log.length;far.hp=far.maxHp;r.damage(e,far,.5,'PHYSICAL',{sureHit:true});if(b.log.slice(start).some(x=>x.cover&&x.actorId===guard.id))farCovered++;}
 assert(covered>=20&&covered<=55,String(covered));assert.equal(areaCovered,0);assert.equal(farCovered,0);return {covered,of:60};});
test('hazards hurt the chosen rows each round end, shields absorb them and matching gear mitigates',()=>{const r=fresh();join(r,['MOND_NOELLE','MOND_AMBER','MOND_LISA']);wear(r,'EQ_ARMOR_FROSTWARD','MOND_NOELLE');const b=standby(r);
 r.addHazard({kind:'FROST',power:.1,rounds:2,targets:'ALL'});const hp=Object.fromEntries(b.actors.filter(a=>a.side==='ALLY').map(a=>[a.source,a.hp]));r.tickHazards();
 const lost=src=>hp[src]-ally(b,src).hp;assert.equal(lost('MOND_AMBER'),Math.round(ally(b,'MOND_AMBER').maxHp*.1));assert.equal(lost('MOND_NOELLE'),Math.round(ally(b,'MOND_NOELLE').maxHp*.1*.4));
 assert(!ally(b,'MOND_NOELLE').statuses.some(s=>s.id==='STATUS_SLOW'));assert(ally(b,'MOND_AMBER').statuses.some(s=>s.id==='STATUS_SLOW'));assert.equal(b.hazards[0].rounds,1);
 r.shield(ally(b,'MOND_LISA'),5000,'TEST',3);const lisa=ally(b,'MOND_LISA').hp;r.tickHazards();assert.equal(ally(b,'MOND_LISA').hp,lisa);assert.equal(b.hazards.length,0,'expired');
 r.addHazard({id:'F',kind:'FIRE',power:.1,rounds:1,targets:'BACK',startsRound:b.round+1});const before=L(b.actors.map(a=>a.hp));r.tickHazards();assert.deepEqual(L(b.actors.map(a=>a.hp)),before,'pending hazard waits');
 r.addHazard({id:'W',kind:'FLOOD',power:.05,rounds:1,targets:'FRONT'});r.tickHazards();assert(b.actors.filter(a=>a.side==='ALLY'&&a.slot<=2).every(a=>a.aura==='물'||a.statuses.some(s=>s.id==='HAZARD_WET')));
 const saved=JSON.parse(r.serialize());assert.equal(new R(DB,saved).s.runtime.hazards.length,b.hazards.length);saved.runtime.hazards=[{kind:'LAVA',power:1}];assert.throws(()=>new R(DB,saved),/지형/);return {frost:{amber:lost('MOND_AMBER'),noelle:lost('MOND_NOELLE')}};});
test('offensive traits: slayer, aura hunter, anti-air, armour break, weak point, element boost, first strike',()=>{const r=fresh('ROUTE_ISEKAI');join(r,['MOND_NOELLE','MOND_AMBER','MOND_LISA']);
 wear(r,'EQ_POLEARM_HALBERD','PLAYER_CUSTOM');wear(r,'EQ_BOW_SHARPSHOOTER','MOND_AMBER');wear(r,'EQ_CATALYST_MAGIC_GUIDE','MOND_LISA');wear(r,'EQ_CLAYMORE_WHITEBLIND','MOND_NOELLE');
 const b=standby(r),e=foe(b),m=(a,t,el='PHYSICAL',o={})=>Math.round(r.combatDamageMultiplier(a,t,el,o)*1000)/1000;const p=ally(b,'PLAYER_CUSTOM'),amber=ally(b,'MOND_AMBER'),lisa=ally(b,'MOND_LISA'),noelle=ally(b,'MOND_NOELLE');
 assert.equal(m(p,e),1.15,'first strike');p.traitState.firstStrike=true;assert.equal(m(p,e),1);
 assert.equal(m(lisa,e,'ELECTRO'),1.08,'catalyst class');e.aura='물';assert.equal(m(lisa,e,'ELECTRO'),Math.round(1.08*1.12*1000)/1000,'aura hunter');e.aura=null;
 e.airborne=true;assert.equal(m(amber,e),1.15,'bow anti-air');e.airborne=false;e.bossExposed=true;assert.equal(m(amber,e),1.2,'weak point');e.bossExposed=false;
 e.armored=true;assert.equal(m(noelle,e),1.25,'claymore armour break');e.armored=false;
 const slime={id:'X',name:'물 슬라임',source:'MON_SLIME_HYDRO',side:'ENEMY',grade:'일반',statuses:[],shields:[]},r2=fresh('ROUTE_ISEKAI');join(r2,['MOND_NOELLE']);wear(r2,'EQ_POLEARM_BLACK_TASSEL','PLAYER_CUSTOM');const b2=standby(r2),pp=ally(b2,'PLAYER_CUSTOM');pp.traitState.firstStrike=true;
 assert.equal(Math.round(r2.combatDamageMultiplier(pp,slime,'PHYSICAL',{})*100)/100,1.25,'slime slayer');return {ok:true};});
test('defensive traits: element resistance, heavy armour, first guard, stagger and control resistance, heal and shield boosts',()=>{const r=fresh();join(r,['MOND_NOELLE','MOND_AMBER']);wear(r,'EQ_ARMOR_IRON_GUARD','MOND_NOELLE');wear(r,'EQ_ARMOR_REINFORCED_LEATHER','MOND_AMBER');wear(r,'EQ_ACC_VITAL_RING','PLAYER_CUSTOM');
 const b=standby(r),e=foe(b),noelle=ally(b,'MOND_NOELLE'),amber=ally(b,'MOND_AMBER'),p=ally(b,'PLAYER_CUSTOM');
 r._traitHit={k:1.6,heavy:true,aoe:false};assert.equal(Math.round(r.combatDamageMultiplier(e,noelle,'PHYSICAL',{})*1000)/1000,Math.round(.96*.85*1000)/1000);
 r._traitHit={k:.5,heavy:false,aoe:false};assert.equal(Math.round(r.combatDamageMultiplier(e,amber,'PHYSICAL',{})*100)/100,.8,'first guard once');assert.equal(r.combatDamageMultiplier(e,amber,'PHYSICAL',{}),1);r._traitHit=null;
 assert.equal(r.applyCombatControl(e,noelle,'PUSH',{}),false);const hp=p.hp=Math.round(p.maxHp/2);const healed=r.heal(p,100,'시험');assert.equal(healed,108);
 const r2=fresh();join(r2,['MOND_NOELLE']);wear(r2,'EQ_ACC_STEADFAST','MOND_NOELLE');const b2=standby(r2),n2=ally(b2,'MOND_NOELLE');let resisted=0;for(let i=0;i<200;i++){n2.statuses=[];r2.addCombatStatus(n2,'STATUS_FREEZE',1);if(!n2.statuses.some(s=>s.id==='STATUS_FREEZE'))resisted++;}
 assert(resisted>5&&resisted<45,String(resisted));return {controlResisted:resisted,of:200};});
test('on-hit traits: stacking attack, extra physical hits, kill heal and high-HP crit',()=>{const r=fresh();join(r,['MOND_NOELLE']);wear(r,'EQ_CLAYMORE_WHITEBLIND','MOND_NOELLE');wear(r,'EQ_SWORD_HARBINGER','PLAYER_CUSTOM');
 const b=standby(r),e=foe(b),n=ally(b,'MOND_NOELLE'),p=ally(b,'PLAYER_CUSTOM');for(let i=0;i<4;i++){e.hp=e.maxHp;r.damage(n,e,.3,'PHYSICAL',{sureHit:true});}
 const stack=n.statuses.find(s=>s.id==='TRAIT_STACK_ATK');assert.equal(stack.stacks,3);assert.equal(stack.mods.atk.pct,9);assert.equal(r.combatStat(p,'crit'),p.crit+8);p.hp=Math.round(p.maxHp/2);assert.equal(r.combatStat(p,'crit'),p.crit);
 const r2=fresh();wear(r2,'EQ_SWORD_TRAVELER','PLAYER_CUSTOM');const b2=standby(r2),p2=ally(b2,'PLAYER_CUSTOM'),e2=foe(b2);p2.hp=100;e2.hp=1;r2.damage(p2,e2,5,'PHYSICAL',{sureHit:true});assert.equal(e2.hp,0);assert.equal(p2.hp,160);return {stack:stack.stacks};});
test('the Isekai protagonist reaches as far as the weapon class; the Traveler stays a swordsman',()=>{const r=fresh('ROUTE_ISEKAI');assert.equal(r.player().range,'근접');const out={};for(const [id,range]of [['EQ_BOW_SLINGSHOT','원거리'],['EQ_CATALYST_MAGIC_GUIDE','중거리'],['EQ_POLEARM_WHITE_TASSEL','중거리'],['EQ_CLAYMORE_DEBATE','근접']]){wear(r,id,'PLAYER_CUSTOM');assert.equal(r.player().range,range,id);out[id]=range;}
 const t=fresh('ROUTE_TRAVELER');wear(t,'EQ_SWORD_COOL_STEEL','PLAYER_CUSTOM');assert.equal(t.player().range,'근접');assert.throws(()=>wear(t,'EQ_BOW_SLINGSHOT','PLAYER_CUSTOM'),/무기/);return out;});
test('air access gear lets melee strike airborne enemies',()=>{const r=fresh();wear(r,'EQ_SPECIAL_GRAPPLE','PLAYER_CUSTOM');const b=standby(r),p=ally(b,'PLAYER_CUSTOM'),e=foe(b);e.airborne=true;assert.equal(r.hasAirAccess(p,e,'근접'),true);const r2=fresh(),b2=standby(r2),e2=foe(b2);e2.airborne=true;assert.equal(r2.hasAirAccess(ally(b2,'PLAYER_CUSTOM'),e2,'근접'),false);});
test('UI wiring: gear traits, battle line editor, hazard panel (source)',()=>{const read=f=>fs.readFileSync(path.join(dir,f),'utf8'),html=read('index.html'),gear=read('app_gear.js'),party=read('app_party.js'),ui=read('app_battle_traits.js'),css=read('style.css');
 for(const f of ['app_gear.js','app_party.js','app_battle_traits.js','runtime_gear_traits.js'])new vm.Script(read(f),{filename:f});
 const scripts=[...html.matchAll(/<script src="([^"?]+)/g)].map(m=>m[1]);assert(scripts.indexOf('runtime_gear_traits.js')>scripts.indexOf('runtime_play_fixes.js'));assert(scripts.indexOf('app_battle_traits.js')>scripts.indexOf('app_gear.js'));
 assert(gear.includes('gear-trait-chips')&&gear.includes('gearTraitLines'));assert(party.includes('function formationLine')&&party.includes("act('FORMATION_SET'")&&!party.includes("'PARTY_SWAP',{from"));assert(ui.includes('battle-hazards')&&ui.includes('battle-position'));assert(css.includes('.formation-row')&&css.includes('.battle-hazards'));
 if(runtimeDir==='source'){const build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');assert(build.includes("'runtime_gear_traits.js'")&&build.includes("'app_battle_traits.js'"));}});
report.total=report.checks.length;report.passed=report.checks.filter(x=>x.passed).length;fs.mkdirSync(root+'/reports/gear_traits',{recursive:true});fs.writeFileSync(root+'/reports/gear_traits/runtime-tests.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,passed:report.passed}));if(report.total!==report.passed)process.exitCode=1;
