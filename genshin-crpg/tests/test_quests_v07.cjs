/* Read-only v0.7 UX audit. Only newGame/public actions change in-memory saves. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),source=process.env.CRPG_SOURCE||path.join(root,'source'),dbPath=process.env.CRPG_DB||path.join(root,'content/db.json');
const files=[...fs.readFileSync(path.join(source,'index.html'),'utf8').matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]).filter(x=>/^runtime[^/]*\.js$/.test(x));
const ctx=vm.createContext({console}),hashes={};for(const file of files){const code=fs.readFileSync(path.join(source,file),'utf8');hashes[file]=crypto.createHash('sha256').update(code).digest('hex');vm.runInContext(code,ctx,{filename:file});}
const db=JSON.parse(fs.readFileSync(dbPath,'utf8')),api=ctx.CRPGRuntime;
ctx.CRPGRelationships.install(api,{events:ctx.CRPGRelationships.catalogFromDB(db),activities:ctx.CRPGRelationships.activitiesFromDB(db),preferences:{adultModeEnabled:false},eligibility:{profiles:{},protagonists:{}}});
const cp=x=>JSON.parse(JSON.stringify(x));const history=[];
function snap(r){return {route:r.s.global.STORY_ROUTE_ID,cursor:r.storyActiveNodeId(),phase:r.playPhase(),map:r.s.global.CURRENT_MAP_ID,screen:r.s.global.SCREEN_MODE,mora:r.s.global.MORA,cloth:r.itemCount('TRPG_STURDY_CLOTH'),main:r.mainStoryEntries(),chapters:r.storyChapterEntries(),next:r.s.global.STORY_NEXT_PREPARED,waiting:r.s.global.STORY_WAITING};}
function act(r,type,params={}){let result;try{result=r.action(type,params);history.push({route:r.s.global.STORY_ROUTE_ID,type,params,result:cp(result),cursor:r.storyActiveNodeId()});return result;}catch(e){history.push({type,params,error:{code:e.code,message:e.message}});throw e;}}
function step(r,preferred){if(r.s.global.SCREEN_MODE!=='STORY'&&r.s.global.SCREEN_MODE!=='STORY_WAIT')act(r,'MENU',{screen:'STORY'});const choices=r.storyChoices();if(choices.length){const c=(preferred&&choices.find(preferred))||choices.find(x=>/JOIN_ACCEPTED:/.test(x[12]||''))||choices[0];return act(r,'STORY_CHOICE',{node:c[4]});}const n=r.storyNode();assert(n,'missing story node');return act(r,n[5]==='INPUT_TEXT'?'STORY_NAME':'STORY_NEXT',n[5]==='INPUT_TEXT'?{name:r.s.global.PLAYER_NAME}:{node:n[4]});}
function fresh(route){const r=new api.Runtime(db);r.newGame({name:'임무감사',route,seed:74219,saveId:'AUDIT-'+route});for(let i=0;i<600;i++){if(r.playPhase()==='FREE')return r;assert(!r.s.runtime&&!r.s.battlePreparation,'Unexpected combat before first free point');step(r);}throw Error('No free point');}
function reachPrep(r){for(let i=0;i<100;i++){const choices=r.storyChoices();if(choices.some(x=>String(x[4]).includes('_PREP_')))return choices;step(r);}throw Error('No preparation point');}
const output={files,hashes};
const trv=fresh('ROUTE_TRAVELER');output.travelerFirstFree=snap(trv);
act(trv,'STORY_CHAPTER',{node:'TRV_M02_N001'});
for(let i=0;i<200&&trv.playPhase()!=='FREE';i++)step(trv);
assert.equal(trv.storyActiveNodeId(),'TRV_M02_MENU_003');
output.travelerMainMenuGap={...snap(trv),currentNodeType:trv.storyNode()[5],chapterActionsButtons:(trv.mainStoryEntries().filter(x=>x.available&&!x.reason).length)+(trv.s.global.STORY_WAITING?trv.storyChapterEntries().length+(trv.s.global.STORY_NEXT_PREPARED?1:0):0)};
assert.equal(output.travelerMainMenuGap.chapterActionsButtons,0); // Legacy helper; app_adventure mainObjective supplies MENU STORY.
const r=fresh('ROUTE_ISEKAI');output.isekaiFirstFree=snap(r);

const amberId='LEG_ISK_MOND_AMBER',amberQuest='Q_LEG_ISK_MOND_AMBER';
const beforeUnregistered=r.serialize();assert.throws(()=>act(r,'LEGEND_ENTER',{quest:amberId}),e=>e.code==='ACTION_LOCK');assert.equal(r.serialize(),beforeUnregistered);
assert.throws(()=>act(r,'LEGEND_REGISTER',{quest:amberId}),e=>e.code==='ACTION_LOCK');assert.equal(r.serialize(),beforeUnregistered);
const internal=new api.Runtime(db,cp(r.s));internal.enterStory(amberId);assert.equal(internal.s.storyContext.entry,amberId);assert(!internal.s.storyCostReceipts?.[amberQuest]);output.internalEnterUnaffected=true;
act(r,'PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});
const registrationInputs=()=>cp({mora:r.s.global.MORA,inventory:r.s.inventory,time:r.s.global.WORLD_TIME,day:r.s.global.WORLD_DAY,flags:r.s.flags,quests:r.s.quests,bond:r.storyBond('PROFILE_MOND_AMBER'),receipts:r.s.storyCostReceipts||{}});
const beforeRegistration=registrationInputs();output.amberRegistration=cp(act(r,'LEGEND_REGISTER',{quest:amberId}));assert.deepEqual(registrationInputs(),beforeRegistration);assert(r.legendRegistered(amberId));assert(!r.s.quests[amberQuest]);assert(!r.s.storyCostReceipts?.[amberQuest]);

const duplicateBefore=r.serialize();assert.throws(()=>act(r,'LEGEND_REGISTER',{quest:amberId}),e=>e.code==='ACTION_LOCK');assert.equal(r.serialize(),duplicateBefore);act(r,'PLACE_LEAVE');
output.amberEntryBeforeCloth=cp(r.storyEntries().find(e=>e.id==='LEG_ISK_MOND_AMBER'));
assert.equal(r.itemCount('TRPG_STURDY_CLOTH'),0);assert.equal(output.amberEntryBeforeCloth.reason,'');
const originalMain=r.storyActiveNodeId(),before=cp({mora:r.s.global.MORA,time:r.s.global.WORLD_TIME,day:r.s.global.WORLD_DAY,bond:r.storyBond('PROFILE_MOND_AMBER')});
act(r,'LEGEND_ENTER',{quest:'LEG_ISK_MOND_AMBER'});output.amberShortageChoices=cp(reachPrep(r).map(n=>({id:n[4],label:n[10]})));
act(r,'STORY_CHOICE',{node:'LEG_ISK_MOND_AMBER_PREP_SHORTAGE'});step(r);
output.amberAfterShortage={...snap(r),quest:r.s.quests.Q_LEG_ISK_MOND_AMBER||null,costReceipt:r.s.storyCostReceipts?.Q_LEG_ISK_MOND_AMBER||null};
assert.equal(r.storyActiveNodeId(),originalMain);assert.deepEqual({mora:r.s.global.MORA,time:r.s.global.WORLD_TIME,day:r.s.global.WORLD_DAY,bond:r.storyBond('PROFILE_MOND_AMBER')},before);
act(r,'PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_MOND_GENERAL',mode:'SHOP'});output.clothShop=cp(r.placeStocks().find(x=>x.row[0]==='STK_MOND_MAT_002'));
act(r,'BUY',{stock:'STK_MOND_MAT_002',quantity:1});act(r,'PLACE_LEAVE');assert.equal(r.itemCount('TRPG_STURDY_CLOTH'),1);assert.equal(r.s.global.MORA,before.mora-75);
act(r,'LEGEND_ENTER',{quest:'LEG_ISK_MOND_AMBER'});output.amberFundedChoices=cp(reachPrep(r).map(n=>({id:n[4],label:n[10]})));
act(r,'STORY_CHOICE',{node:'LEG_ISK_MOND_AMBER_PREP_ACCEPT'});output.amberAfterAccept={...snap(r),quest:cp(r.s.quests.Q_LEG_ISK_MOND_AMBER),costReceipt:cp(r.s.storyCostReceipts.Q_LEG_ISK_MOND_AMBER)};assert.equal(r.itemCount('TRPG_STURDY_CLOTH'),0);assert.equal(r.s.global.MORA,before.mora-75);
const legacyPaidState=cp(r.s);delete legacyPaidState.guildLegends;const legacyPaid=new api.Runtime(db,legacyPaidState);assert(legacyPaid.legendRegistered(amberId));assert.equal(legacyPaid.s.storyContext.entry,amberId);const paidCount=legacyPaid.itemCount('TRPG_STURDY_CLOTH'),paidReceipt=cp(legacyPaid.s.storyCostReceipts[amberQuest]);legacyPaid.action('STORY_NEXT',{node:legacyPaid.storyActiveNodeId()});assert.equal(legacyPaid.itemCount('TRPG_STURDY_CLOTH'),paidCount);assert.deepEqual(cp(legacyPaid.s.storyCostReceipts[amberQuest]),paidReceipt);output.legacyPaidResumeWithoutRegistration=true;
for(let i=0;i<200&&r.s.storyContext;i++)step(r);assert(!r.s.storyContext,'Amber did not return');output.amberCompleted={...snap(r),quest:cp(r.s.quests.Q_LEG_ISK_MOND_AMBER),bond:r.storyBond('PROFILE_MOND_AMBER')};output.completedPersonalFilter={doneByLegend:r.storyDone(amberId),doneByQuest:r.storyDone(amberQuest),stillListed:r.storyEntries().some(e=>e.id===amberId&&e.kind==='LEGEND'&&!r.storyDone(e.definition.QUEST_ID)&&r.legendRegistered(e.id)),entryReason:r.storyEntries().find(e=>e.id===amberId)?.reason};
const field=fresh('ROUTE_ISEKAI');output.beforeFieldNoGuild={npcVisits:JSON.parse(field.s.global.NPC_VISITS_JSON),quest:field.s.quests.Q_MOND_EXP_PLAINS_CART||null};
if(typeof field.acceptCommission==='function'){
 const before=field.serialize();assert.throws(()=>act(field,'QUEST_CHOICE',{quest:'Q_MOND_EXP_PLAINS_CART',choice:'careful'}),e=>e.code==='COMMISSION');assert.equal(field.serialize(),before);output.fieldWithoutAcceptanceBlocked=true;
 act(field,'PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});assert(field.atGuild());
 output.guildAcceptReceipt=cp(act(field,'COMMISSION_ACCEPT',{quest:'Q_MOND_EXP_PLAINS_CART'}));act(field,'PLACE_LEAVE');
}
act(field,'MOVE',{edge:'EDGE_MOND_CITY_TO_PLAINS'});assert(!field.s.runtime,'Unexpected field encounter');
act(field,'QUEST_CHOICE',{quest:'Q_MOND_EXP_PLAINS_CART',choice:'careful'});output.fieldAfterObjective={...snap(field),quest:cp(field.s.quests.Q_MOND_EXP_PLAINS_CART)};
output.fieldClaimReceipt=cp(act(field,'CLAIM_QUEST',{quest:'Q_MOND_EXP_PLAINS_CART'}));output.afterFieldClaim=snap(field);
act(field,'MENU',{screen:'LOCATION'});output.afterClaimLocation=snap(field);
output.materialSources={shops:db['19_SHOP_STOCK_DB'].slice(1).filter(x=>x[3]==='TRPG_STURDY_CLOTH'),recipes:db['17_RECIPE_DB'].slice(1).filter(x=>x[3]==='TRPG_STURDY_CLOTH')};
output.actionCount=history.length;output.history=history;
fs.writeFileSync(path.join(root,'reports/quest-v07-tests.json'),JSON.stringify(output,null,2));
console.log(JSON.stringify({actionCount:output.actionCount,traveler:output.travelerFirstFree,isekai:output.isekaiFirstFree,amberShortage:output.amberAfterShortage,amberAccepted:output.amberAfterAccept,amberCompleted:output.amberCompleted,fieldNoGuild:output.beforeFieldNoGuild,fieldClaim:output.fieldClaimReceipt,claimScreen:output.afterFieldClaim.screen},null,2));
