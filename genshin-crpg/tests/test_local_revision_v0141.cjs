'use strict';
const assert=require('node:assert/strict');
const {fresh,R,db,c,fs,root}=require('./helpers_v011.cjs');
const {fixture}=require('./helpers_balance_v0141.cjs');
const cp=x=>JSON.parse(JSON.stringify(x)),results=[];
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function restore(r){return new R(db,JSON.parse(r.serialize()));}
function guild(r){r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
function sameRetry(r,type,params){const g=r.s.global,a={id:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1),revision:g.SAVE_REVISION,type,...params};r.transact(a);const save=r.serialize();r.transact(a);assert.equal(r.serialize(),save,'duplicate action is exactly once');}
test('commission XP reaches each active member once, excludes bench and survives retry',()=>{
 let r=fixture([6,6,6,6]);r.adminApply({op:'recruit',char:'MOND_LISA'});guild(r);const id='Q_MOND_EXP_PLAINS_CART';r.action('COMMISSION_ACCEPT',{quest:id});r.questState(id).node='READY_TO_CLAIM';
 const reward=JSON.parse(r.row('22_QUEST_DB',id)[11]),owners=r.s.party.filter(x=>x.active).map(x=>x.source),xp=id=>id==='PLAYER_CUSTOM'?r.s.global.PLAYER_XP_STATE:r.s.chars[id].xp;
 const before=Object.fromEntries([...owners,'MOND_LISA'].map(id=>[id,xp(id)]));sameRetry(r,'CLAIM_QUEST',{quest:id});
 for(const id of owners)assert.equal(xp(id)-before[id],Math.round(reward.xp*6/5),id);assert.equal(xp('MOND_LISA'),before.MOND_LISA);r=restore(r);assert(r.questState(id).claimed);
});
test('pinned commission replaces main destination and clears after reward',()=>{
 let r=fixture([6,6,6,6]);guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_MOND_EXP_PLAINS_CART'});r.action('PLACE_LEAVE');
 r.action('OBJECTIVE_PIN',{kind:'COMMISSION',objective:'Q_MOND_EXP_PLAINS_CART'});assert.equal(r.navigationGoal(),'MAP_MOND_PLAINS');r=restore(r);assert.equal(r.navigationGoal(),'MAP_MOND_PLAINS');assert(r.s.learningGuide.done.pin);
 guild(r);r.questState('Q_MOND_EXP_PLAINS_CART').node='READY_TO_CLAIM';r.action('CLAIM_QUEST',{quest:'Q_MOND_EXP_PLAINS_CART'});assert.equal(r.s.pinnedObjective,undefined);
});
test('bulk books consume the selected amount once and reject overflow atomically',()=>{
 let r=fresh();r.adminApply({op:'recruit',char:'MOND_AMBER'});r.action('PARTY',{char:'MOND_AMBER',slot:2});r.giveItem('MAT_CHAR_EXP_WANDERER',30);const n=r.itemCount('MAT_CHAR_EXP_WANDERER');sameRetry(r,'USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',quantity:5,owner:'MOND_AMBER'});assert.equal(r.itemCount('MAT_CHAR_EXP_WANDERER'),n-5);assert(r.s.chars.MOND_AMBER.level>1||r.s.chars.MOND_AMBER.xp>0);assert(r.s.learningGuide.done.books);r=restore(r);
 r.s.ascensions.PLAYER_CUSTOM=1;r.s.global.PLAYER_LEVEL_STATE=19;r.s.global.PLAYER_XP_STATE=Number(r.row('26_LEVEL_RULES',19)[2])-1;assert.equal(r.experienceBookLimit('MAT_CHAR_EXP_WANDERER'),1);
 const before=r.serialize();assert.throws(()=>r.action('USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',quantity:2}));assert.equal(r.serialize(),before);r.action('USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',quantity:1});assert.equal(r.s.global.PLAYER_LEVEL_STATE,20);assert.equal(r.experienceBookLimit('MAT_CHAR_EXP_WANDERER'),0);
});
test('ordinary fight offers escape on round 10, no rewards, defeat fee, warp or double settlement',()=>{
 // Begin at native full HP: the legacy helper heals a stale global object after EQUIP clones the save.
 let r=fixture([10],[],9);r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.startBattle('EG_MOND_SLIME_SMALL','RANDOM');r.action('COMBAT_BEGIN');
 for(let i=0;r.s.runtime?.round<10&&i<60;i++){assert(r.combatFleeReason());r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});}
 assert(r.s.runtime,'party must survive to test real tenth round');assert.equal(r.s.runtime.round,10);assert.equal(r.combatFleeReason(),'');r=restore(r);
 const before={mora:r.s.global.MORA,hp:r.s.global.PLAYER_HP_CURRENT,xp:r.s.global.PLAYER_XP_STATE,inventory:cp(r.s.inventory)},id=r.s.runtime.id;sameRetry(r,'COMBAT_FLEE',{});
 const rec=r.s.combatReceipts[id];assert.equal(rec.result,'ESCAPED');assert.equal(rec.xp,0);assert.deepEqual(cp(rec.loot),{});assert.equal(r.s.global.CURRENT_MAP_ID,'MAP_MOND_PLAINS');assert.equal(r.s.global.MORA,before.mora);assert.equal(r.s.global.PLAYER_XP_STATE,before.xp);assert.deepEqual(cp(r.s.inventory),before.inventory);assert(!r.s.defeatPenalty&&!r.s.postDefeat&&!r.s.storyRecovery);assert(!r.s.runtime);restore(r);
});
test('story/field/boss/abyss battles never gain ordinary escape',()=>{
 const r=fixture([10],[],9);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.startBattle('EG_MOND_SLIME_SMALL','RANDOM');r.action('COMBAT_BEGIN');r.s.runtime.round=10;
 for(const origin of ['EXPLICIT','STORY:TEST','BOSS:BRT_DVALIN','LIYUE_FIELD:TEST:0','ABYSS:1']){r.s.runtime.origin=origin;assert(r.combatFleeReason(),origin);}
 r.s.runtime.origin='RANDOM';for(const field of ['fieldBoss','fieldObjective','abyss','twinBoss','storyConfig']){r.s.runtime[field]={};assert(r.combatFleeReason(),field);delete r.s.runtime[field];}
});
test('Dvalin airborne message states the obstacle and legal ranged alternatives',()=>{
 const r=fixture([8,8,8,8],['MOND_AMBER','MOND_LISA','MOND_KAEYA'],6);r.startBattle('EG_BOSS_DVALIN','EXPLICIT');r.action('COMBAT_BEGIN');const cards=r.combatCards(),basic=cards.find(x=>x.id==='PLAYER_BASIC_ATTACK');assert.match(basic.reason,/공중의 드발린/);assert.match(basic.reason,/원거리/);assert.equal(basic.targets.length,0);
});
test('every new map has two-way edges and an encounter pool or safe stop; gear previews survive expanded database',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI');r.s.flags.FLAG_ACCESS_REGION_LIYUE=true;
 for(const [id,,parent,safe]of c.CRPGRuntime.localRevision.maps){assert(r.rows('47_MAP_EDGE_DB').some(e=>e[1]===parent&&e[2]===id));assert(r.rows('47_MAP_EDGE_DB').some(e=>e[1]===id&&e[2]===parent));if(!safe)assert(r.encounterPoolRows(r.row('32_MAP_DB',id)).length,id);r.s.global.CURRENT_MAP_ID=parent;assert(r.travelDiscoveries().known.includes(id));}
 const slot=r.giveEquipment('EQ_BOW_SLINGSHOT');assert.equal(r.equipmentPreview(slot,'PLAYER_CUSTOM').reason,'');restore(r);
 for(const key of ['STORMBEARER_SURVEY','THOUSAND_FROST']){const q=r.row('22_QUEST_DB','Q_CRPG_MOND_EXP_'+key),d=JSON.parse(q[10]);assert(r.tables['32_MAP_DB'].has(d.map_id));assert(r.tables['33_ENCOUNTER_GROUP_DB'].has(d.choices[0].combat_group));assert(r.commissionStory(q[0]));}
});
test('new investigation persists clues without quiz or sequence and old mission receipt stays intact',()=>{
 const [anchor,e]=Object.entries(c.CRPGLocalStory.episodes).find(([,e])=>e.steps[0].kind==='SEARCH');let r=fresh('MAP_LY_DETAIL_DIHUA','ROUTE_ISEKAI');r.storySetCursor('R39_FIELD_'+anchor);r.prepareStory();r.s.global.CURRENT_MAP_ID=r.liyueFieldView().target;
 const clues=e.steps[0].clues;r.action('LIYUE_FIELD_INSPECT',{clue:clues[0].id});r=restore(r);assert.equal(r.s.liyueField.clues.length,1);for(const clue of clues.slice(1))r.action('LIYUE_FIELD_INSPECT',{clue:clue.id});assert(r.s.liyueField.done);assert.equal(r.s.liyueField.sequence.length,0);r=restore(r);assert.equal(r.s.liyueField.mission,'v141_'+anchor);
});
fs.mkdirSync(root+'/reports/local-v0141',{recursive:true});fs.writeFileSync(root+'/reports/local-v0141/mechanics.json',JSON.stringify({results},null,2)+'\n');
