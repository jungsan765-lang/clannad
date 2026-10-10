'use strict';
// Native outcomes validate the bridge; narrowly marked fixtures skip unrelated long
// predecessor play. Inventory payment, action rollback and save validation stay native.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');let clock=Date.now(),serial=0;
const c=vm.createContext({console,Date:class extends Date{static now(){return clock;}},setTimeout,clearTimeout});
const index=fs.readFileSync(path.join(root,'source/index.html'),'utf8'),wired=index.includes('runtime_task_learning_catalog_v0169.js');
for(const[,file]of index.matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)){
 vm.runInContext(fs.readFileSync(path.join(root,'source',file),'utf8'),c,{filename:file});
 if(!wired&&file==='runtime_task_catalog_v0168.js')vm.runInContext(fs.readFileSync(path.join(root,'source/runtime_task_learning_catalog_v0169.js'),'utf8'),c,{filename:'runtime_task_learning_catalog_v0169.js'});
 if(!wired&&file==='runtime_tasks_v0167.js')vm.runInContext(fs.readFileSync(path.join(root,'source/runtime_task_learning_v0169.js'),'utf8'),c,{filename:'runtime_task_learning_v0169.js'});
}
const db=JSON.parse(fs.readFileSync(path.join(root,'content/db.json'),'utf8')),R=c.CRPGRuntime.Runtime,C=c.CRPGTaskCatalogV0168,copy=x=>JSON.parse(JSON.stringify(x));
function fresh(bootstrap=true){const r=new R(db);r.newGame({name:'임무 검사',route:'ROUTE_TRAVELER',seed:71247,saveId:'TASK169-'+(++serial)});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_MENU_POLICY:'',WORLD_TIME:'12:00',MORA:100000});delete r.s.storyJourney;delete r.s.storyBreak;r.prepareStory();if(bootstrap){guild(r);r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});}return r;}
function leave(r){if(r.s.placeVisit)r.action('PLACE_LEAVE',{});}
function guild(r){leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});}
function accept(r,id){if(id!=='Q_TASK_LEARN_01')expose(r,id);guild(r);r.action('COMMISSION_ACCEPT',{quest:id});}
function report(r,id){guild(r);return r.action('CLAIM_QUEST',{quest:id});}
function expose(r,id){
 if(!r.s.global.LAST_COMMITTED_ACTION_SEQ)r.action('MENU',{screen:'LOCATION'});
 // Explicit completed-ancestor fixture isolates a deep native lesson or delivery.
 // Current 172 definitions still undergo the full save validator, including joins.
 const seen=new Set();function visit(key){for(const parent of C.oneTimeBranches[key]||[]){visit(parent);if(!r.s.quests[parent]?.claimed&&!seen.has(parent)){seen.add(parent);const t=C.chains.find(t=>t.id===parent),d=copy(t);d.reward=copy(c.CRPGRuntime.tasksV01611.rewardAt(t,r.s.global.PLAYER_LEVEL_STATE));d.assignedLevel=r.s.global.PLAYER_LEVEL_STATE;d.revision=172;d.individual=true;r.s.quests[t.id]={guildAccepted:true,claimed:true,state:'완료',node:'COMPLETE',taskObjective:{version:2,progress:t.goal,acceptedSeq:r.s.global.LAST_COMMITTED_ACTION_SEQ,definition:d,...(d.reward.primogem?{primogemPaid:d.reward.primogem}:{})}};}}}visit(id);
}
function progress(r,id){return r.s.quests[id]?.taskObjective?.progress||0;}
function daily(r,kind){return r.s.tasks?.daily?.[kind]||0;}
function gather(r,kind='GATHER',inputs=true){leave(r);r.s.global.CURRENT_MAP_ID=kind==='MINE'?'MAP_CRPG_MOND_QUARRY':'MAP_MOND_PLAINS';r.action('LIFE_START',{kind});const j=r.s.lifeJob,scene=r.lifeScene(j);clock+=j.duration+100;return r.action('LIFE_FINISH',{job:j.id,elapsed:j.duration,inputs:inputs?scene.nodes.map((n,i)=>({at:600+i*300,node:i})):[]}).result;}
let passed=0;function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}

check('24 learning lessons and 24 finite deliveries append only native task definitions',()=>{
 const learn=C.chains.filter(t=>t.learning),delivery=C.chains.filter(t=>t.delivery);assert.equal(learn.length,24);assert.equal(delivery.length,24);assert.equal(new Set(C.chains.map(t=>t.id)).size,C.chains.length);
 const r=fresh();for(const t of delivery){for(const id of Object.keys(t.delivery.items||{}))assert(r.tables['14_ITEM_DB'].has(id));for(const id of Object.keys(t.delivery.equipment||{}))assert(r.tables['16_EQUIP_DB'].has(id));assert.equal(t.rewardScale,'absolute');assert.equal(t.kind,'delivery');}
 const seen=new Set(),visiting=new Set();function visit(id){assert(!visiting.has(id),'learning graph has no cycle');if(seen.has(id))return;visiting.add(id);for(const parent of C.oneTimeBranches[id]){assert(C.chains.some(t=>t.id===parent));visit(parent);}visiting.delete(id);seen.add(id);}for(const t of C.chains)visit(t.id);assert.equal(seen.size,288);assert.equal(C.chains.filter(t=>!C.oneTimeBranches[t.id].length).length,1);assert.equal(C.chains.find(t=>!C.oneTimeBranches[t.id].length).id,'Q_TASK_LEARN_01');assert(learn.some(t=>(t.successors||[]).length>1),'learning expands across several activity branches');
 assert(C.weekly.some(t=>t.kind==='sleep'));assert(C.weekly.some(t=>t.kind==='meal'));assert(C.weekly.some(t=>t.kind==='artifactEnhance'));
 const beginner=fresh(false);assert.deepEqual(beginner.commissionEntries().filter(q=>q.row[0].startsWith('Q_TASK_')).map(q=>q.row[0]),['Q_TASK_LEARN_01']);
});

check('acceptance lesson counts its own native acceptance and opens other work only after report',()=>{
 const r=fresh(false),id='Q_TASK_LEARN_01';assert.deepEqual(r.commissionEntries().filter(q=>q.row[0].startsWith('Q_TASK_')).map(q=>q.row[0]),[id]);accept(r,id);assert.equal(progress(r,id),1);assert.equal(r.s.quests[id].node,'READY_TO_CLAIM');r.action('MENU',{screen:'QUEST'});r.action('MENU',{screen:'LOCATION'});assert.equal(progress(r,id),1);assert(!r.questVisible('Q_TASK_LEARN_02'));assert.throws(()=>r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_02'}),/선행|먼저 보고/);
 report(r,id);assert(r.questVisible('Q_TASK_LEARN_02'));assert.throws(()=>r.action('COMMISSION_ACCEPT',{quest:id}));assert.equal(progress(r,id),1);
 const restored=new R(db,copy(r.s));assert(restored.s.quests[id].claimed);assert.equal(progress(restored,id),1);r.validateSave(copy(r.s));
});

check('generic gathering lesson counts successful activities, not a particular item or empty exit',()=>{
 const r=fresh(),id='Q_TASK_LEARN_02';expose(r,id);accept(r,id);gather(r,'GATHER',false);assert.equal(progress(r,id),0);gather(r);assert.equal(progress(r,id),1);gather(r);assert.equal(progress(r,id),2);gather(r);assert.equal(progress(r,id),3);assert.equal(r.s.quests[id].node,'READY_TO_CLAIM');
});

check('chest learning records actual opens; prior native evidence only advances flagged learning',()=>{
 const r=fresh();leave(r);const chest=c.CRPGRuntime.chestRules.chests.find(t=>t.region==='MOND'&&!t.game&&t.how==='SCENERY');assert(chest);r.s.global.CURRENT_MAP_ID=chest.map;r.action('CHEST_OPEN',{chest:chest.id});assert.equal(daily(r,'chest'),1);
 const id='Q_TASK_LEARN_03';expose(r,id);const before=daily(r,'chest');accept(r,id);assert.equal(progress(r,id),1);assert.equal(daily(r,'chest'),before,'history cannot refill a recurring weekly counter');
 assert.throws(()=>r.action('CHEST_OPEN',{chest:chest.id}));assert.equal(daily(r,'chest'),before);
});

check('sleep counts paid inn services; recovery and wait do not count',()=>{
 const r=fresh();r.action('WAIT',{minutes:1});assert.equal(daily(r,'sleep'),0);leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';
 const stock=r.rows('19_SHOP_STOCK_DB').find(s=>s[2]==='SERVICE'&&s[3]==='SERVICE_INN_REST_8H'),place=r.placeEntries().find(p=>p.merchant===stock[1]&&p.modes.includes('SHOP'));assert(stock&&place);r.action('PLACE_ENTER',{place:place.id,mode:'SHOP'});r.action('BUY',{stock:stock[0]});assert.equal(daily(r,'sleep'),1);assert.equal(r.s.global.SCREEN_MODE,'LOCATION');
 r.s.global.PLAYER_HP_CURRENT=0;r.action('RECOVER',{});assert.equal(daily(r,'sleep'),1);
});

check('processing and equipment crafting count only committed recipes, not preparation',()=>{
 const r=fresh();leave(r);r.s.global.WORLD_TIME='12:00';const kitchen=r.placeEntries().find(p=>p.entity==='SERVICE_MOND_COOK'&&p.modes.includes('CRAFT'));r.action('PLACE_ENTER',{place:kitchen.id,mode:'CRAFT'});assert.throws(()=>r.action('CRAFT',{recipe:'REC_PROCESS_SUGAR'}));assert.equal(daily(r,'process'),0);r.giveItem('ING_SWEET_FLOWER',6);r.action('CRAFT',{recipe:'REC_PROCESS_SUGAR',quantity:3});assert.equal(daily(r,'process'),1);
 const id='Q_TASK_LEARN_11';expose(r,id);accept(r,id);leave(r);r.s.global.WORLD_TIME='12:00';const smith=r.placeEntries().find(p=>p.merchant==='MRC_MOND_EQUIP'&&p.modes.includes('CRAFT'));assert(smith);r.action('PLACE_ENTER',{place:smith.id,mode:'CRAFT'});r.giveItem('TRPG_STURDY_CLOTH',2);r.giveItem('TRPG_REFINED_LEATHER',1);r.action('CRAFT',{recipe:'REC_ARMOR_TRAVEL'});assert.equal(progress(r,id),1);
});

check('effective healing and real equip changes count; repeated full healing and same equip roll back',()=>{
 const r=fresh();r.giveItem('FOOD_STEAK',2);r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;assert.throws(()=>r.action('MEAL_BATCH',{meals:[{owner:'PLAYER_CUSTOM',item:'FOOD_STEAK'}]}));assert.equal(daily(r,'meal'),0);r.s.global.PLAYER_HP_CURRENT=Math.max(1,r.s.global.PLAYER_HP_MAX-100);r.action('MEAL_BATCH',{meals:[{owner:'PLAYER_CUSTOM',item:'FOOD_STEAK'}]});assert.equal(daily(r,'meal'),1);
 const slot=r.giveEquipment('EQ_ARMOR_TRAVEL_COAT');r.action('EQUIP',{slot});assert.equal(daily(r,'equip'),1);r.action('EQUIP',{slot});assert.equal(daily(r,'equip'),1);
});

check('real incident resolution counts; leaving or merely entering an incident does not',()=>{
 const r=fresh();let event;for(const row of r.rows('32_MAP_DB')){const e=r.regionEventAt(row[0]);if(e?.choices.some(t=>!t.battle&&!t.puzzle&&!t.escort&&!t.buy&&!t.gift&&!t.deliver&&t.id!=='LEAVE')){event=e;break;}}assert(event);leave(r);r.s.global.CURRENT_MAP_ID=event.map;const choice=event.choices.find(t=>!t.battle&&!t.puzzle&&!t.escort&&!t.buy&&!t.gift&&!t.deliver&&t.id!=='LEAVE');r.action('REGION_EVENT',{choice:choice.id});assert.equal(daily(r,'encounter'),1);assert.throws(()=>r.action('REGION_EVENT',{choice:choice.id}));assert.equal(daily(r,'encounter'),1);
 const r2=fresh();leave(r2);for(const row of r2.rows('32_MAP_DB')){const e=r2.regionEventAt(row[0]);if(e?.choices.some(t=>t.id==='LEAVE')){r2.s.global.CURRENT_MAP_ID=e.map;r2.action('REGION_EVENT',{choice:'LEAVE'});break;}}assert.equal(daily(r2,'encounter'),0);
});

check('item delivery consumes exactly required stock and pays a fixed reward exactly once',()=>{
 const r=fresh(),id='Q_TASK_SUPPLIES_01';r.giveItem('ING_SWEET_FLOWER',10);accept(r,id);assert.equal(progress(r,id),1);const mora=r.s.global.MORA,primo=r.s.global.PRIMOGEM;r.adminApply({op:'level',target:'ALL',value:60});report(r,id);assert.equal(r.itemCount('ING_SWEET_FLOWER'),2);assert.equal(r.s.global.MORA-mora,160);assert.equal(r.s.global.PRIMOGEM,primo);assert(r.s.quests[id].claimed);assert(r.questVisible('Q_TASK_SUPPLIES_02'));const after=copy(r.s);assert.throws(()=>report(r,id));assert.equal(r.s.global.MORA,after.global.MORA);assert.equal(r.itemCount('ING_SWEET_FLOWER'),2);const restored=new R(db,copy(r.s));assert(restored.s.quests[id].claimed);
});

check('delivery rechecks stock at report and atomically refuses an insufficient inventory',()=>{
 const r=fresh(),id='Q_TASK_SUPPLIES_01';r.giveItem('ING_SWEET_FLOWER',8);accept(r,id);r.pay({items:{ING_SWEET_FLOWER:1}});guild(r);const before=copy(r.s);assert.throws(()=>r.action('CLAIM_QUEST',{quest:id}),/준비|목표|납품/);assert.equal(r.itemCount('ING_SWEET_FLOWER'),7);assert.equal(r.s.global.MORA,before.global.MORA);assert(!r.s.quests[id].claimed);assert.equal(r.s.global.LAST_COMMITTED_ACTION_SEQ,before.global.LAST_COMMITTED_ACTION_SEQ);r.giveItem('ING_SWEET_FLOWER',1);r.action('CLAIM_QUEST',{quest:id});assert(r.s.quests[id].claimed);assert.equal(r.itemCount('ING_SWEET_FLOWER'),0);
});

check('equipment delivery preserves equipped, enhanced and locked copies; consumes only the spare',()=>{
 const r=fresh(),id='Q_TASK_GEAR_DELIVERY_01';r.s.inventory=r.s.inventory.filter(i=>i.equip!=='EQ_ARMOR_TRAVEL_COAT');r.recalculate();const equipped=r.giveEquipment('EQ_ARMOR_TRAVEL_COAT'),enhanced=r.giveEquipment('EQ_ARMOR_TRAVEL_COAT'),locked=r.giveEquipment('EQ_ARMOR_TRAVEL_COAT');r.action('EQUIP',{slot:equipped});r.s.inventory.find(i=>i.slot===enhanced).enhance=1;r.s.inventory.find(i=>i.slot===locked).locked=true;accept(r,id);assert.equal(progress(r,id),0);assert.throws(()=>report(r,id));const spare=r.giveEquipment('EQ_ARMOR_TRAVEL_COAT');report(r,id);for(const slot of[equipped,enhanced,locked])assert(r.s.inventory.some(i=>i.slot===slot));assert(!r.s.inventory.some(i=>i.slot===spare));
});

check('earned achievement receipts teach handbook use; menu open and rejected claims count nothing',()=>{
 const r=fresh();r.action('MENU',{screen:'QUEST'});assert.equal(daily(r,'handbook'),0);const ready=r.achievementView().list.find(a=>a.done&&!a.claimed);assert(ready);r.action('ACHIEVEMENT_CLAIM',{achievement:ready.id});assert.equal(daily(r,'handbook'),1);assert.throws(()=>r.action('ACHIEVEMENT_CLAIM',{achievement:ready.id}));assert.equal(daily(r,'handbook'),1);const id='Q_TASK_LEARN_21';expose(r,id);const count=daily(r,'handbook');accept(r,id);assert.equal(progress(r,id),1);assert.equal(daily(r,'handbook'),count);
});

check('eye investigation counts only the final native receipt and survives a mid-job reload',()=>{
 let r=fresh();const id='Q_TASK_LEARN_04';expose(r,id);accept(r,id);leave(r);const point=c.CRPGWorldContent.oculi.find(p=>p.level===1&&p.steps.every(s=>s.duration&&!s.cost&&!s.combatGroup&&!s.options&&!s.sequence));assert(point);r.s.global.CURRENT_MAP_ID=point.map;
 r.action('WORLD_WORK_START',{kind:'OCULUS',point:point.id});assert.equal(progress(r,id),0);const job=copy(r.s.worldJob);r=new R(db,copy(r.s));clock+=job.duration+10;r.action('WORLD_WORK_FINISH',{job:job.id});assert.equal(progress(r,id),0,'intermediate search is not a collected eye');
 r.action('WORLD_WORK_START',{kind:'OCULUS',point:point.id});clock+=r.s.worldJob.duration+10;r.action('WORLD_WORK_FINISH',{job:r.s.worldJob.id});assert.equal(progress(r,id),1);assert.equal(daily(r,'oculus'),1);assert(r.s.exploration.oculi[point.id]);assert.throws(()=>r.action('WORLD_WORK_START',{kind:'OCULUS',point:point.id}));assert.equal(daily(r,'oculus'),1);r.validateSave(copy(r.s));
});

check('native paid reinforcement attempts count once and rejected attempts preserve counters',()=>{
 const r=fresh();leave(r);r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.global.WORLD_TIME='12:00';const smith=r.placeEntries().find(p=>p.merchant==='MRC_MOND_EQUIP'&&p.modes.includes('CRAFT'));r.action('PLACE_ENTER',{place:smith.id,mode:'CRAFT'});const slot=r.giveEquipment('EQ_ARMOR_TRAVEL_COAT');assert.throws(()=>r.action('ENHANCE',{slot}));assert.equal(daily(r,'enhance'),0);const cost=r.enhancementQuote(slot).cost;for(const[id,n]of Object.entries(cost.items))r.giveItem(id,n);r.action('ENHANCE',{slot});assert.equal(daily(r,'enhance'),1);assert.equal(r.s.lastEnhancement.kind,'ENHANCE');assert.throws(()=>r.action('ENHANCE',{slot}));assert.equal(daily(r,'enhance'),1);
});

check('incident battle settlement nested in a public action counts exactly once',()=>{
 const r=fresh();r.adminApply({op:'level',target:'ALL',value:60});let event;for(const row of r.rows('32_MAP_DB')){const e=r.regionEventAt(row[0]);if(e?.group&&e.choices.some(t=>t.battle)){event=e;break;}}assert(event);leave(r);r.s.global.CURRENT_MAP_ID=event.map;const choice=event.choices.find(t=>t.battle);r.action('REGION_EVENT',{choice:choice.id});assert(r.s.runtime);assert.equal(daily(r,'encounter'),0,'entering a fight is not resolving it');
 // This fixture isolates native end-of-fight bookkeeping; damage tuning has its own tests.
 for(const actor of r.s.runtime.actors)if(actor.side==='ENEMY')actor.hp=0;r.action('COMBAT_BEGIN');assert(!r.s.runtime);assert.equal(daily(r,'encounter'),1);assert.equal(r.s.regionEvents.count,1);const restored=new R(db,copy(r.s));assert.equal(daily(restored,'encounter'),1);r.finishBattle(true);assert.equal(daily(r,'encounter'),1);
});

console.log('task learning/delivery '+passed+'/15');
