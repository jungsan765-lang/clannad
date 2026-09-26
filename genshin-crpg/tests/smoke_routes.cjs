/* Reproducible real-save route smoke; no fixtures alter gameplay state.
 * node revision-research/legitimate-route-smoke.cjs
 * CRPG_SOURCE / CRPG_DB / CRPG_SEED / CRPG_MAX_ACTIONS may be overridden.
 * Only newGame and public action() mutate saves. Readers inspect existing state.
 */
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const source=process.env.CRPG_SOURCE||path.resolve(__dirname,'../source');
const dbPath=process.env.CRPG_DB||path.resolve(__dirname,'../content/db.json');
const strategy=process.env.CRPG_STRATEGY||'guided';
const seed=Number(process.env.CRPG_SEED||74219),limit=Number(process.env.CRPG_MAX_ACTIONS||1800);
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const index=fs.readFileSync(path.join(source,'index.html'),'utf8');
const files=[...index.matchAll(/<script\s+src="([^"]+)"/g)].map(x=>x[1]).filter(x=>/^runtime[^/]*\.js$/.test(x));
const ctx=vm.createContext({console}),hashes={'index.html':hash(index)};
for(const f of files){const code=fs.readFileSync(path.join(source,f),'utf8');hashes[f]=hash(code);vm.runInContext(code,ctx,{filename:f});}
const data=fs.readFileSync(dbPath,'utf8'),db=JSON.parse(data),{Runtime}=ctx.CRPGRuntime;
ctx.CRPGRelationships.install(ctx.CRPGRuntime,{events:ctx.CRPGRelationships.catalogFromDB(db),activities:ctx.CRPGRelationships.activitiesFromDB(db),preferences:{adultModeEnabled:false},eligibility:{profiles:{},protagonists:{}}});
const copy=x=>JSON.parse(JSON.stringify(x)),parse=(x,d={})=>{try{return JSON.parse(x)}catch{return d}};
function state(r){const g=r.s.global,b=r.s.runtime;return {node:r.storyActiveNodeId(),phase:r.playPhase(),screen:g.SCREEN_MODE,map:g.CURRENT_MAP_ID,day:g.WORLD_DAY,time:g.WORLD_TIME,turn:g.TURN,revision:g.SAVE_REVISION,mora:g.MORA,player:{hp:g.PLAYER_HP_CURRENT,maxHp:g.PLAYER_HP_MAX,level:g.PLAYER_LEVEL_STATE,xp:g.PLAYER_XP_STATE,atk:g.PLAYER_ATK_CURRENT,def:g.PLAYER_DEF_CURRENT},eligible:parse(g.COMPANION_ELIGIBILITY_JSON),inventory:copy(r.s.inventory),party:r.s.party.filter(x=>x.active).map(x=>({source:x.source,tactic:x.tactic,hp:x.type==='PLAYER'?g.PLAYER_HP_CURRENT:r.s.chars[x.source].hp,level:x.type==='PLAYER'?g.PLAYER_LEVEL_STATE:r.s.chars[x.source].level})),battle:b?{id:b.id,group:b.group,round:b.round,phase:b.phase,cursor:b.cursor,actors:b.actors.map(a=>({id:a.id,side:a.side,hp:a.hp,maxHp:a.maxHp,level:a.level,atk:a.atk,def:a.def,aura:a.aura,guest:!!a.guest})),recentLog:copy(b.log.slice(-12))}:null};}
function walk(route){
 const r=new Runtime(db);r.newGame({name:'실제진행검증',route,seed,saveId:'LEGITIMATE-'+route+'-'+seed});
 const history=[],battles=[],freeStops=[],optionalRejected=[],preparedAt=new Set(),battleIds=new Set();let outcome='ACTION_LIMIT',error=null,firstWin=false,storyWin=false,guideIndex=0;
 function act(type,params={},optional=false){const before=state(r),entry={seq:history.length+1,type,params:copy(params),before};try{const result=r.action(type,params);entry.after={node:r.storyActiveNodeId(),phase:r.playPhase(),screen:r.s.global.SCREEN_MODE};history.push(entry);const receipt=parse(r.s.global.LAST_BATTLE_RESULT_JSON,null);if(receipt?.id&&!battleIds.has(receipt.id)){battleIds.add(receipt.id);battles.push(copy(receipt));if(receipt.victory){firstWin=true;if(String(receipt.origin).startsWith('STORY:'))storyWin=true;}}return result;}catch(e){entry.error={code:e.code||e.name,message:e.message};if(optional){optionalRejected.push(entry);return null;}history.push(entry);throw e;}}
 function prepare(){const g=r.s.global,key=r.storyActiveNodeId()+':'+r.playPhase();if(preparedAt.has(key))return;preparedAt.add(key);
  const owned=parse(g.COMPANION_ELIGIBILITY_JSON);for(const [char,e]of Object.entries(owned)){if(!['JOINED','TEMPORARY'].includes(e.state)||r.s.party.some(x=>x.active&&x.source===char))continue;const i=r.s.party.findIndex((x,i)=>i>0&&!x.active);if(i<0)break;act('PARTY',{char,slot:i+1},true);}
  // Equip owned, level-valid items into empty slots. No purchase or reward synthesis.
  for(const owner of r.s.party.filter(x=>x.active).map(x=>x.source))for(const inv of r.s.inventory.filter(x=>x.equip&&!x.equipped)){const e=r.row('16_EQUIP_DB',inv.equip),category=e[2]==='방어구'?'ARMOR':e[2]==='장신구'?'ACCESSORY':e[2]==='특수'?'SPECIAL':'WEAPON',level=owner==='PLAYER_CUSTOM'?g.PLAYER_LEVEL_STATE:r.s.chars[owner].level;if(level<Number(e[19]||1)||r.s.inventory.some(x=>x.equipped&&x.owner===owner&&x.category===category))continue;act('EQUIP',{slot:inv.slot,owner},true);}
  // Only naturally owned healing food; no granting, levelling, or direct healing.
  for(const p of r.s.party.filter(x=>x.active)){const a=r.economyOwner(p.source);if(a.hp<=0||a.hp>=a.maxHp)continue;const food=r.s.inventory.filter(x=>x.item&&x.quantity>0).find(x=>{try{const f=r.foodSpec(x.item);return f.heal>0&&x.item!==a.lastMeal}catch{return false}});if(food)act('USE_ITEM',{item:food.item,owner:p.source},true);}
 }
 const guide=[
  ['BUY',{stock:'STK_CRPG_MOND_WORN_SWORD',quantity:1}],
  ['EQUIP_NEW'],
  ['ACCEPT_COMMISSION',{quest:'Q_MOND_EXP_PLAINS_CART'}],
  ['MOVE',{edge:'EDGE_MOND_CITY_TO_PLAINS'}],
  ['QUEST_CHOICE',{quest:'Q_MOND_EXP_PLAINS_CART',choice:'careful'}],
  ['CLAIM_QUEST',{quest:'Q_MOND_EXP_PLAINS_CART'}],
  ['XP_BOOKS'],
  ['MOVE',{edge:'EDGE_MOND_PLAINS_TO_CITY'}],
  ['ACCEPT_COMMISSION',{quest:'Q_CRPG_MOND_EXP_BRIDGE_PARCEL'}],
  ['QUEST_CHOICE',{quest:'Q_CRPG_MOND_EXP_BRIDGE_PARCEL',choice:'careful'}],
  ['CLAIM_QUEST',{quest:'Q_CRPG_MOND_EXP_BRIDGE_PARCEL'}],
  ['XP_BOOKS'],
  ['ACCEPT_COMMISSION',{quest:'Q_MOND_XP_SUPPLY'}],
  ['QUEST_CHOICE',{quest:'Q_MOND_XP_SUPPLY',choice:'submit'}],
  ['CLAIM_QUEST',{quest:'Q_MOND_XP_SUPPLY'}],
  ['XP_BOOKS'],
  ['BUY',{stock:'STK_INN_MOND',quantity:1}],
  ['ACCEPT_COMMISSION',{quest:'Q_CRPG_MOND_FIRST_FIELD'}],
  ['MOVE',{edge:'EDGE_MOND_CITY_TO_PLAINS'}],
  ['QUEST_CHOICE',{quest:'Q_CRPG_MOND_FIRST_FIELD',choice:'careful'}],
  ['CLAIM_QUEST',{quest:'Q_CRPG_MOND_FIRST_FIELD'}],
  ['MOVE',{edge:'EDGE_MOND_PLAINS_TO_CITY'}],
  ['BUY',{stock:'STK_INN_MOND',quantity:1}],
  ['MENU',{screen:'STORY'}]
 ];
 function guidedPreparation(){
  if(strategy!=='guided'||guideIndex>=guide.length)return false;
  const [type,params]=guide[guideIndex++];
  if(type==='EQUIP_NEW'){const inv=r.s.inventory.find(x=>x.equip==='EQ_CRPG_WORN_SWORD'&&!x.equipped);if(inv)act('EQUIP',{slot:inv.slot,owner:'PLAYER_CUSTOM'});}
  else if(type==='ACCEPT_COMMISSION'){if(!r.commissionAccepted(params.quest)){act('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE',mode:'TALK'});act('COMMISSION_ACCEPT',{quest:params.quest});act('PLACE_LEAVE');}}
  else if(type==='XP_BOOKS'){for(const item of ['MAT_CHAR_EXP_WANDERER','MAT_CHAR_EXP_ADVENTURER','MAT_CHAR_EXP_HERO']){const quantity=r.itemCount(item);if(quantity)act('USE_ITEM',{item,quantity,owner:'PLAYER_CUSTOM'});}}
  else if(type==='BUY'){const row=r.tables['19_SHOP_STOCK_DB'].get(params.stock);if(row&&!r.stockReason(row,params.quantity))act(type,params);}
  else act(type,params);
  return true;
 }
 try{
  for(let step=0;step<limit;step++){
   const phase=r.playPhase();
   if(phase==='RECOVERY'){outcome='BATTLE_DEFEAT';break;}
   if(storyWin){outcome='FIRST_STORY_VICTORY_AND_FREE';break;}
   if(phase==='COMBAT_OPENING'){act('COMBAT_BEGIN',{battle:r.s.runtime.id});continue;}
   if(phase==='COMBAT'){
    const cards=r.combatCards().filter(c=>!c.reason),a=r.combatActor(),b=r.s.runtime;
    const field=cards.find(c=>c.id===b.storyConfig?.field_access_action?.id),orb=cards.find(c=>c.id===b.storyConfig?.orb_action?.id);
    const heal=a.hp/a.maxHp<.55?cards.find(c=>c.id.startsWith('ITEM:')&&c.targets.some(t=>t.id===a.id)):null;
    const card=orb||field||heal||cards.find(c=>c.id==='PLAYER_BASIC_ATTACK'&&c.targets.length)||cards.find(c=>c.id==='PLAYER_BASIC_GUARD')||cards[0];
    if(!card){outcome='NO_LEGAL_COMBAT_ACTION';break;}
    const target=heal===card?card.targets.find(t=>t.id===a.id):[...(card.targets||[])].sort((a,b)=>a.hp-b.hp)[0];
    act('COMBAT',{card:card.id,...(target?{target:target.id}:{}),...(card.branches?.length?{branch:card.branches[0]}:{})});continue;
   }
   if(phase==='PREPARATION'){
    prepare();const p=r.battlePreparation(r.s.battlePreparation.group),eligible=[...p.guests.map(x=>x.id),...r.s.party.filter(x=>x.active&&x.source!=='PLAYER_CUSTOM').map(x=>x.source)];
    // Authored guests are legal and temporary. Prefer a healer if present.
    const order=['MOND_JEAN','MOND_BARBARA','MOND_DILUC','MOND_VENTI'];const companions=[...new Set(eligible)].sort((a,b)=>(order.includes(a)?order.indexOf(a):100)-(order.includes(b)?order.indexOf(b):100)).slice(0,3);
    act('COMBAT_PREPARE',{group:p.group,companions});continue;
   }
   if(phase==='FREE'){
    const id=r.storyActiveNodeId();if(!freeStops.some(x=>x.node===id)){freeStops.push({node:id,action:history.length,state:state(r)});}
    prepare();
    if(guidedPreparation())continue;
    if(r.s.global.STORY_NEXT_PREPARED){act('STORY_RESUME');continue;}
    const node=r.storyNode();if(node?.[5]==='MENU_GATE'){act('MENU',{screen:'STORY'});act('STORY_NEXT',{node:node[4]});continue;}
    const main=r.mainStoryEntries?.().find(x=>x.available&&x.state==='미시작');if(main){act('MAIN_STORY_ACCEPT',{quest:main.quest});continue;}
    const next=r.storyChapterEntries?.()[0];if(next){act('STORY_CHAPTER',{node:next.id});continue;}
    outcome='FREE_WITHOUT_NEXT_CHAPTER';break;
   }
   if(r.s.global.SCREEN_MODE==='REWARD'||!['STORY','STORY_WAIT','MAIN_MENU','HUB'].includes(r.s.global.SCREEN_MODE))act('MENU',{screen:'STORY'});
   if(r.s.global.STORY_NEXT_PREPARED&&r.isStoryWaiting()){act('STORY_RESUME');continue;}
   const choices=r.storyChoices();if(choices.length){const selected=choices.find(x=>/JOIN_ACCEPTED:/.test(x[12]||''))||choices[0];act('STORY_CHOICE',{node:selected[4]});continue;}
   const node=r.storyNode();if(!node){outcome='MISSING_NODE';break;}
   act(node[5]==='INPUT_TEXT'?'STORY_NAME':'STORY_NEXT',node[5]==='INPUT_TEXT'?{name:r.s.global.PLAYER_NAME}:{node:node[4]});
  }
 }catch(e){outcome='BLOCKED';error={code:e.code||e.name,message:e.message,stack:e.stack};}
 let retryEvidence=null;
 if(r.playPhase()==='RECOVERY'){
  const defeatedAt=state(r),checkpoint=copy(r.s.storyBattleCheckpoint),beforeRevision=r.s.global.SAVE_REVISION,left=Number(r.defeatLockRemaining?.()||0);
  try{
   assert.ok(r.actionReason('MENU',{screen:'LOCATION'}));assert.ok(r.actionReason('TITLE'));
   if(left>0){
    const why=r.actionReason('STORY_RETRY');
    assert.match(String(why||''),/정신을 차리는 중입니다/);
    const last=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}');
    retryEvidence={ok:true,deferred:true,remainingMs:left,defeatedAt,defeatReason:last.defeatReason||null,defeatMessage:last.defeatMessage||null};
    outcome='BATTLE_DEFEAT_LOCKED';
   }else{
    act('STORY_RETRY');const current=copy(r.s),expected=copy(checkpoint);
    for(const k of ['SAVE_REVISION','LAST_COMMITTED_ACTION_SEQ','LAST_COMMITTED_ACTION_ID','LAST_ACTION_RECEIPT_JSON','TURN']){delete current.global[k];delete expected.global[k];}
    assert.deepEqual(current,expected);assert.equal(r.s.global.SAVE_REVISION,beforeRevision+1);assert.equal(r.playPhase(),'PREPARATION');
    retryEvidence={ok:true,deferred:false,defeatedAt,restoredHp:r.s.global.PLAYER_HP_CURRENT,restoredLevel:r.s.global.PLAYER_LEVEL_STATE,restoredRng:r.s.global.PRNG_STATE,revision:r.s.global.SAVE_REVISION};
   }
  }catch(e){retryEvidence={ok:false,error:{code:e.code||e.name,message:e.message},defeatedAt};outcome='RETRY_FAILURE';}
 }
 return {route,seed,strategy,outcome,actions:history.length,firstVictory:firstWin,firstStoryVictory:storyWin,guideCompleted:guideIndex===guide.length,retryEvidence,freeStops,battles,error,final:state(r),optionalRejected,history};
}
const routes=(process.env.CRPG_ROUTES||'ROUTE_TRAVELER,ROUTE_ISEKAI').split(','),runs=routes.map(walk);
const report={testedAt:new Date().toISOString(),source,dbPath,dbHash:hash(data),loaded:files,hashes,policy:'New game plus public action only; first available authored choice, accept offered companions, equip naturally owned items, naturally owned food; authored battle guests and legal combat cards. Guided profile also buys an available practice sword, explicitly accepts and completes actual cart/supply/first-field commissions, uses awarded XP books, and buys available inn rests. No direct save mutations. A legitimate story defeat is accepted when the current 60-second recovery lock is active; the dedicated play-fixes regression separately verifies retry restoration after that lock.',runs};
const out=path.join(__dirname,'legitimate-route-smoke-results.json');fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
for(const r of runs)console.log(JSON.stringify({route:r.route,strategy:r.strategy,outcome:r.outcome,firstVictory:r.firstVictory,firstStoryVictory:r.firstStoryVictory,guideCompleted:r.guideCompleted,retryEvidence:r.retryEvidence,actions:r.actions,freeStops:r.freeStops.map(x=>x.node),battles:r.battles,error:r.error&&{code:r.error.code,message:r.error.message},final:r.final,optionalRejected:r.optionalRejected.map(x=>({type:x.type,params:x.params,error:x.error}))},null,2));
console.log('Full public action transcript: '+out);
const acceptable=r=>r.outcome==='FIRST_STORY_VICTORY_AND_FREE'||(r.outcome==='BATTLE_DEFEAT_LOCKED'&&r.firstVictory&&r.guideCompleted&&r.retryEvidence?.ok&&r.retryEvidence?.deferred);
process.exitCode=runs.every(acceptable)?0:1;
