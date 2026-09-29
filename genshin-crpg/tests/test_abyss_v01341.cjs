'use strict';
// Spiral Abyss (0.14.3 rules): three rooms per floor, rest breaks, floor marks, full reset only, fixed reward table.
const assert=require('node:assert/strict'),{fresh,R,db,fs,root,c}=require('./helpers_v011.cjs');
const {fixture,runFloor,buildSetup,SETUPS,fight,hpOf}=require('./helpers_abyss.cjs'),{artifacts}=require('./helpers_abyss_artifacts.cjs');
const CFG=c.CRPGRuntime.abyssConfig,report=[],plain=x=>JSON.parse(JSON.stringify(x));
assert.equal(CFG.version,2);assert.equal(CFG.markName,'나선 각인');assert.equal(CFG.floors.length,12);
assert(CFG.floors.every(f=>f.rooms.length===3&&f.rooms.every(r=>r.name&&r.hint&&r.limit>=10&&r.foes.length)),'every floor has three described rooms');
// Room text shows the scene, never the answer.
for(const f of CFG.floors)for(const room of f.rooms)assert.doesNotMatch(room.hint,/세요|필요|먹고|먹은|요리|장비|치명타|고정 피해|원거리|명중|보호막을|쓰러뜨|피해가 들어|통합니다|관측경|말뚝/,room.name);
assert(!JSON.stringify(CFG).includes('딱지'),'the floor mark has its own name');
assert.throws(()=>fixture(6).action('ABYSS_ENTER',{floor:1}),/Lv\. 10/);
assert.throws(()=>fresh().action('ABYSS_ENTER',{floor:1}),/머스크 암초/);
{const r=fixture(19);r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:10});assert.match(r.abyssFloorReason(10),/Lv\. 20/);assert.equal(r.abyssFloorReason(9),'');}

// Every floor is solvable through native combat with its reference party, and each clear marks the companions.
for(let f=1;f<=12;f++){
 const {r,s,breakHook}=buildSetup(f),ids=r.abyssParty();r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:f});
 const out=runFloor(r,f,{food:s.food||{},breakHook});
 report.push({floor:f,level:s.lv,enhance:s.enh,artifacts:!!s.art,team:s.team,rooms:out.rooms.map(({chamber,outcome,rounds})=>({chamber,outcome,rounds}))});
 assert(out.cleared,'floor '+f+' clears with its reference party: '+JSON.stringify(out.rooms.map(x=>[x.outcome,x.rounds])));
 assert(out.rooms.every(x=>x.xp===0),'no battle XP inside the Abyss');
 for(const id of ids.slice(1))assert.equal(r.s.abyss.tags[id],f,id+' carries the floor '+f+' mark');
 assert.equal(r.s.abyss.tags.PLAYER_CUSTOM,undefined);assert.equal(r.s.abyss.active,null);
 assert.equal(r.s.abyss.clears[f].rounds,out.rooms.reduce((n,x)=>n+x.rounds,0));assert.deepEqual(plain(r.s.abyss.clears[f].chambers),out.rooms.map(x=>x.rounds));
 if(r.needsRecovery())r.action('RECOVER');r.action('MENU',{screen:'LOCATION'});
 const reward=CFG.floors[f-1].reward,mora=r.s.global.MORA,items=Object.fromEntries(Object.keys(reward.items||{}).map(id=>[id,r.itemCount(id)]));
 if(f<12){
  assert.throws(()=>r.action('ABYSS_REWARD',{floor:f,equipment:'EQ_SWORD_FAVONIUS'}),/이나즈마 장비/);
  const pick=CFG.rewards[f%CFG.rewards.length],had=r.s.inventory.filter(i=>i.equip===pick).length;
  r.action('ABYSS_REWARD',{floor:f,equipment:pick});assert.equal(r.s.inventory.filter(i=>i.equip===pick).length,had+1);
 }else{r.action('ABYSS_REWARD',{floor:12});const art=r.s.inventory.find(i=>i.equip==='EQ_ABYSS_INAZUMA_ARTIFACT');assert(art.artifact.quality>=900);}
 assert.equal(r.s.global.MORA,mora+reward.mora);for(const [id,n] of Object.entries(reward.items||{}))assert.equal(r.itemCount(id),items[id]+n);
 assert.throws(()=>r.action('ABYSS_REWARD',{floor:f,equipment:CFG.rewards[0]}),/첫 정복 보상/);
 r.action('ABYSS_RESET',{confirm:true});assert.deepEqual(plain(r.s.abyss.tags),{});assert.deepEqual(plain(r.s.abyss.clears),{});assert(r.s.abyss.claimed[f],'a full reset keeps the claim record');
 assert.throws(()=>r.action('ABYSS_REWARD',{floor:f,equipment:CFG.rewards[0]}));
}

// Gates: from floor 4 the party needs real builds, and from floor 8 the room's own approach.
for(const [f,o,why] of [[4,{lv:15,enh:7,art:0},'Lv.15 with +7 gear'],[6,{lv:18,enh:9,art:0},'no artifacts'],[8,{gear:{},swapBack:0,team:['MOND_EULA','LIYUE_XIAO','LIYUE_NINGGUANG']},'no fixed or lingering damage'],[10,{enh:9},'weapons below +10']]){
 const {r,s,breakHook}=buildSetup(f,o);r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:f});const out=runFloor(r,f,{food:s.food||{},breakHook});
 assert(!out.cleared,'floor '+f+' must not fall to '+why);report.push({floor:f,gate:why,rooms:out.rooms.map(({chamber,outcome,rounds})=>({chamber,outcome,rounds}))});
}
{ // Floor 8 has two answers: the leyline stake, or lingering reaction damage from a hydro + electro party.
 const {r,s}=buildSetup(8,{gear:{},swapBack:0});r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:8});assert(runFloor(r,8,{food:s.food||{}}).cleared);
}
// Between rooms: HP carries over, only food/treatment/gear changes are allowed, and the break survives a reload.
{
 const {r}=buildSetup(1);r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:1});r.action('ABYSS_ENTER',{floor:1});
 assert.equal(r.s.runtime.origin,'ABYSS:1:1');assert.equal(fight(r).abyss.outcome,'NEXT');
 const act=r.s.abyss.active;assert.deepEqual(plain([act.chamber,act.phase,act.rounds.length]),[2,'BREAK',1]);
 r.action('MENU',{screen:'LOCATION'});
 const edge=r.rows('47_MAP_EDGE_DB').find(e=>e[1]==='MAP_V141_MUSK_REEF'&&e[11]==='ACTIVE');
 assert.match(r.actionReason('MOVE',{edge:edge[0]}),/나선비경 1층 도전 중/);assert.throws(()=>r.action('MOVE',{edge:edge[0]}),/나선비경 1층 도전 중/);
 r.giveItem('MAT_CHAR_EXP_HERO',1);assert.throws(()=>r.action('USE_ITEM',{item:'MAT_CHAR_EXP_HERO',owner:'MOND_AMBER'}),/음식과 치료품/);
 assert.throws(()=>r.action('PARTY',{char:'MOND_NOELLE',slot:2}),/나선비경/);
 assert.throws(()=>r.action('ABYSS_REWARD',{floor:1,equipment:CFG.rewards[0]}));
 assert.match(r.abyssFloorReason(2),/1층 도전이 진행 중/);
 const hurt=r.abyssParty().find(id=>{const [hp,max]=hpOf(r,id);return hp>0&&hp<max;});assert(hurt,'room 1 leaves someone wounded');
 const before=hpOf(r,hurt)[0];r.giveItem('FOOD_SWEET_MADAME',1);r.action('USE_ITEM',{item:'FOOD_SWEET_MADAME',owner:hurt});assert(hpOf(r,hurt)[0]>before,'food heals during the break');
 const loaded=new R(db,JSON.parse(r.serialize()));assert.equal(loaded.s.abyss.active.phase,'BREAK');
 const hp=Object.fromEntries(r.abyssParty().map(id=>[id,hpOf(r,id)[0]]));
 r.action('ABYSS_ENTER',{floor:1});assert.equal(r.s.runtime.origin,'ABYSS:1:2');
 for(const a of r.s.runtime.actors.filter(x=>x.side==='ALLY'))assert.equal(a.hp,hp[a.source],a.source+' keeps HP into room 2');
 // Losing any room ends the attempt: no clear, no mark, back to room 1.
 r.finishBattle(false);assert.equal(r.s.abyss.active,null);assert(!r.s.abyss.clears[1]);assert.deepEqual(plain(r.s.abyss.tags),{});
 assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).abyss.outcome,'DEFEAT');
 r.action('MENU',{screen:'LOCATION'});r.action('OPERATOR_DEBUG',{op:'heal'});r.action('ABYSS_ENTER',{floor:1});assert.equal(r.s.abyss.active.chamber,1);
}
// Giving up is explicit, confirmed, and also restarts from room 1.
{
 const {r}=buildSetup(1);r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:1});r.action('ABYSS_ENTER',{floor:1});fight(r);r.action('MENU',{screen:'LOCATION'});
 assert.throws(()=>r.action('ABYSS_RESET',{retreat:true}),/포기/);
 r.action('ABYSS_RESET',{confirm:true,retreat:true});assert.equal(r.s.abyss.active,null);assert(!r.s.abyss.clears[1]);
 assert.throws(()=>r.action('ABYSS_RESET',{confirm:true,retreat:true}),/포기할 도전/);
}
// Marks: the marked team may retry its own floor only; the protagonist is never marked; full reset is the only reset.
{
 const {r}=buildSetup(1);r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:1});assert(runFloor(r,1).cleared);
 if(r.needsRecovery())r.action('RECOVER');r.action('MENU',{screen:'LOCATION'});r.action('OPERATOR_DEBUG',{op:'heal'});
 assert.match(r.abyssFloorReason(2),/나선 각인/);assert.equal(r.abyssFloorReason(1),'');
 for(const [i,id] of ['MOND_FISCHL','LIYUE_XINGQIU','MOND_DIONA'].entries()){r.unlockCharacter(id);r.action('PARTY_REPLACE',{char:id,slot:i+2});}
 r.action('OPERATOR_DEBUG',{op:'level',value:12});assert.equal(r.abyssFloorReason(2),'');
 r.action('ABYSS_RESET',{confirm:true});assert.deepEqual(plain(r.s.abyss.tags),{});assert.equal(r.s.abyss.run,2);
}
// Room rules. Each rule blocks ordinary hits until it is satisfied.
function enter(f,chamber,team,lv=20){
 const r=fixture(lv,team||SETUPS[f].team,10);r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:f});r.s.abyss.active={floor:f,chamber,phase:'BREAK',party:r.abyssParty(),attempt:1,run:1,rounds:Array(chamber-1).fill(5)};
 r.action('ABYSS_ENTER',{floor:f});r.action('COMBAT_BEGIN');return r;
}
const pair=r=>{const b=r.s.runtime;return [b.actors.find(x=>x.side==='ALLY'&&x.source!=='PLAYER_CUSTOM'),b.actors.find(x=>x.side==='ENEMY')];};
{ // 8-1: ordinary damage of any size is ignored, fixed damage lands; the floor's hint is a riddle, not an instruction.
 const r=enter(8,1),[a,t]=pair(r),hp=t.hp;r.applyDamage(a,t,1000000,{sourceKind:'REACTION'});assert.equal(t.hp,hp);
 assert.equal(r.s.runtime.log.at(-1).text,'무적입니다.');assert.doesNotMatch(r.enemyIntel(t.id).description,/말뚝을 장착|고정 피해만/);
 r.applyDamage(a,t,100,{sourceKind:'ABYSS_FIXED'});assert.equal(t.hp,hp-100);r.applyDamage(a,t,50,{sourceKind:'REACTION_DOT'});assert.equal(t.hp,hp-150);
}
{ // 4-2: only allies who ate an attack dish get through.
 const r=enter(4,2),[a,t]=pair(r),hp=t.hp;r.applyDamage(a,t,300,{});assert.equal(t.hp,hp);assert.equal(r.s.runtime.log.at(-1).text,'무적입니다.','no hint about the missing condition');
 a.statuses.push({id:'STATUS_FOOD_ATK',rounds:null,sourceItem:'FOOD_JADE_PARCELS'});r.applyDamage(a,t,300,{});assert(t.hp<hp);
}
{ // 7-2: the phantom appears only if someone ate Adeptus' Temptation or almond tofu.
 const r=enter(7,2),[a,t]=pair(r),hp=t.hp;r.applyDamage(a,t,300,{});assert.equal(t.hp,hp);
 r.s.runtime.actors[0].statuses.push({id:'STATUS_FOOD_ATK',rounds:null,sourceItem:'FOOD_ALMOND_TOFU'});r.applyDamage(a,t,300,{});assert(t.hp<hp);
}
{ // 8-3: only critical hits count.
 const r=enter(8,3),[a,t]=pair(r),hp=t.hp;r.applyDamage(a,t,300,{critical:false});assert.equal(t.hp,hp);r.applyDamage(a,t,300,{critical:true});assert(t.hp<hp);
}
{ // 5-1: allies below 100 accuracy always miss in the fog, shown as an ordinary miss.
 const r=enter(5,1,['MOND_DILUC','MOND_NOELLE','MOND_JEAN']),[a,t]=pair(r);assert(r.combatStat(a,'hit')<100);const hp=t.hp;assert.equal(r.damage(a,t,1,'PHYSICAL',{sureHit:true}),false);assert.equal(t.hp,hp);assert.equal(r.s.runtime.log.at(-1).text,undefined);
}
{ // 2-3: a lone fallen twin returns with half of its partner's HP.
 const r=enter(2,3,null,12),b=r.s.runtime,[x,y]=b.actors.filter(a=>a.side==='ENEMY');x.hp=0;y.hp=1000;b.abyss.settled=[];r.roundEnd();assert.equal(x.hp,500);
}
{ // 4-3: the doors lock in turns.
 const r=enter(4,3),b=r.s.runtime,[a]=pair(r),[x,y]=b.actors.filter(q=>q.side==='ENEMY');b.round=1;const hp=y.hp;r.applyDamage(a,y,300,{});assert.equal(y.hp,hp);r.applyDamage(a,x,300,{});assert(x.hp<x.maxHp);
}
{ // 7-3: executioners strike companions only until two have fallen; then damage lands doubled.
 const r=enter(7,3),b=r.s.runtime,[a,t]=pair(r),mates=b.actors.filter(x=>x.side==='ALLY'&&x.source!=='PLAYER_CUSTOM'),pc=b.actors.find(x=>x.source==='PLAYER_CUSTOM'),hp=t.hp,pcHp=pc.hp;
 r.applyDamage(a,t,300,{});assert.equal(t.hp,hp);r.aiTurn(t,[]);assert.equal(pc.hp,pcHp,'the protagonist is spared before the barrier breaks');
 mates[1].hp=0;mates[2].hp=0;r.applyDamage(a,t,300,{});assert.equal(t.hp,hp-600);
}
{ // 12: the peak needs level 20, full +12 gear and artifacts of quality 90% or more with the right stats.
 const {r}=buildSetup(12);r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:12});r.action('ABYSS_ENTER',{floor:12});assert(r.abyssMasteryReady());
 const ar=r.s.inventory.find(x=>x.artifact&&x.equipped);ar.artifact.quality=899;assert(!r.abyssMasteryReady());ar.artifact.quality=999;
 const w=r.s.inventory.find(x=>x.equipped&&x.category==='WEAPON');w.enhance=11;assert(!r.abyssMasteryReady());
}
// Saves from 0.14.2 and earlier: floor progress restarts under the new rules, claims stay on record,
// and a battle that was already running continues as room 1 of the same floor.
{
 const r=fixture(20);r.action('OPERATOR_DEBUG',{op:'abyss_unlock',value:3});r.action('ABYSS_ENTER',{floor:3});
 const s=JSON.parse(r.serialize()),party=s.abyss.active.party;
 s.abyss={version:1,season:'ABYSS_01',tags:{MOND_DILUC:5},clears:{1:{rounds:4,attempt:1,party,run:1},2:{rounds:5,attempt:2,party,run:1}},claimed:{1:{slot:'X',equip:'EQ_SWORD_AMENOMA',run:1}},attempts:3,resets:0,totalRounds:9,run:1,active:{floor:3,party,attempt:3,run:1}};
 s.runtime.origin='ABYSS:3';s.runtime.group='EG_ABYSS_3';s.runtime.abyss={version:1,floor:3,roundLimit:16,marks:[],settled:[],pulse:{}};
 const m=new R(db,s);assert.equal(m.s.abyss.version,2);assert.deepEqual(plain(m.s.abyss.clears),{});assert.deepEqual(plain(m.s.abyss.tags),{});assert.equal(m.s.abyss.legacyClaimed[1].equip,'EQ_SWORD_AMENOMA');
 assert.deepEqual(plain([m.s.abyss.active.floor,m.s.abyss.active.chamber,m.s.abyss.active.phase]),[3,1,'BATTLE']);assert.equal(m.s.runtime.origin,'ABYSS:3:1');
 m.finishBattle(true);assert.equal(m.s.abyss.active.phase,'BREAK');assert.equal(m.s.abyss.active.chamber,2);
}
fs.mkdirSync(root+'/reports/abyss',{recursive:true});
fs.writeFileSync(root+'/reports/abyss/balance-v0143.json',JSON.stringify({provenance:'Spiral Abyss 0.14.4: three rooms per floor with rest breaks. Synthetic level/gear setup with native stat formulas; natural artifact rolls selected from 1500 drops per actor. The protagonist only uses basic attacks, companions follow their own AI, heal food is eaten between rooms when HP is below 75%. Each floor is tested on its own; the mark lifecycle is tested separately. This proves solvability, not a player clear rate.',runs:report},null,2)+'\n');
console.log('PASS Spiral Abyss 0.14.4: 12 floors x 3 rooms through native combat, rest-break locks, HP carry-over, room rules, floor marks, full reset only, reward table, 0.14.2 save migration');
