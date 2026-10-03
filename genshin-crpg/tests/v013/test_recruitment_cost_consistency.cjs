'use strict';
// Synthetic prerequisites only; each reported payment receives exactly the current listed cost.
const assert=require('node:assert/strict');
const {c,db,R,fresh}=require('../helpers_v011.cjs');
c.CRPGRelationships.install(c.CRPGRuntime,{events:c.CRPGRelationships.catalogFromDB(db),activities:c.CRPGRelationships.activitiesFromDB(db),preferences:{adultModeEnabled:false},eligibility:{profiles:{},protagonists:{}}});
const cp=x=>JSON.parse(JSON.stringify(x));let seq=0;
function provision(def){let r=new R(db);r.newGame({name:'QA개인임무',route:def.ROUTE_SCOPE,seed:7733,saveId:'V013-RECRUIT-'+(++seq)});const g=r.s.global,f=r.s.flags;
 Object.assign(g,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:r.storyDefinition(def.id).MAP_ID,STORY_MENU_POLICY:'',STORY_WAITING:true,STORY_NEXT_PREPARED:'',SCREEN_MODE:'LOCATION',WORLD_TIME:'12:00',MORA:100000,PLAYER_LEVEL:20,PLAYER_LEVEL_STATE:20});
 for(const k of ['storyJourney','storyBreak','storyArrival','storyMenuFrame','storyContext','battlePreparation','storyRecovery'])delete r.s[k];
 Object.assign(f,{FLAG_TRV_MON_CH2_CLEAR:true,FLAG_ISK_M05_CLEAR:true,FLAG_ISK_MON_PROLOGUE_CLEAR:true,FLAG_ISK_MAIN_UNLOCKED:true,FLAG_TRV_LIYUE_CLEAR:true,FLAG_ISK_L04_REGION_CLEAR:true,FLAG_ACCESS_REGION_LIYUE:true,FLAG_MOND_MIKA_RETURNED:true,FLAG_MOND_MONA_PRESENT:true,FLAG_WORLD_ZIBAI_RETURNED:true,FLAG_ISK_META_KNOWLEDGE:'UNKNOWN',FLAG_ISK_MOND_BRANCH:'EXPEDITION',FLAG_ISK_EXPEDITION_FORK:'RETURN',FLAG_ISK_A_SUBBRANCH:'AB',FLAG_ISK_L01_LEAF:'AB1',FLAG_ISK_L02_LEAF:'AB1',FLAG_ISK_L03_LEAF:'AB1',FLAG_ISK_L04_LEAF:'AB1',FLAG_TRV_LY_GOLDEN_ROUTE:'B',FLAG_TRV_LY_GOLDEN_EVIDENCE_SENT:true});
 for(const m of String(def.START_CONDITION||'').matchAll(/(FLAG_\w+)\s*=TRUE/g))if(m[1]!==def.COMPLETE_FLAG_ID)f[m[1]]=true;
 for(const q of ['Q_ISK_MOND_01','Q_ISK_MOND_02','Q_ISK_MOND_03','Q_TRV_MOND_01','Q_TRV_MOND_02','Q_ISK_LIYUE_01','Q_ISK_LIYUE_02','Q_ISK_LIYUE_03','Q_ISK_LIYUE_04','Q_TRV_LIYUE_01','Q_TRV_LIYUE_02','Q_TRV_LIYUE_03','Q_TRV_LIYUE_04'])Object.assign(r.questState(q),{state:'완료',claimed:true,completedTurn:0,acceptedTurn:0});
 const l=r.ensureLiyue();l.access={phase:'OPEN'};
 if(def.ROUTE_SCOPE==='ROUTE_ISEKAI'){const e=r.liyueDefinitions().get('EVT_ISK_L04_AB1_END');const receipt={event:e.EVENT_ID,resolvedNode:e.SOURCE_ID_OR_FILTER,saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,quest:e.p.quest_id,branch:'AB',leaf:'AB1',kind:'gate',day:g.WORLD_DAY,turn:0};l.events[e.EVENT_ID]=receipt;l.regionReceipt=cp(receipt);}
 r.s.guildLegends={[def.id]:{day:g.WORLD_DAY}};
 if(def.RECRUIT_MODE==='STORY_ALREADY_JOINED')r.unlockCharacter(def.CHAR_ID);
 r.s.inventory=r.s.inventory.filter(x=>!x.item);const cost=r.legendEffectiveCost(def);g.MORA=cost.mora;for(const [id,n]of Object.entries(cost.items))r.giveItem(id,n);
 g.LAST_COMMITTED_ACTION_SEQ=1;
 if(def.RARITY_OCULI){const w=r.ensureExplorationState();for(const pt of c.CRPGRuntime.explorationCatalog.points){w.oculi[pt.id]={map:pt.map,day:g.WORLD_DAY,action:g.SAVE_ID+':1'};w.visitedMaps[pt.map]=true;r.giveItem('KEY_CRPG_ANEMOCULUS',1);}
 const geo=r.ensureGeo();for(const pt of c.CRPGWorldContent.geoOculi){geo.progress[pt.id]=pt.steps.length;geo.receipts[pt.id]={saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,map:pt.map,day:g.WORLD_DAY,action:g.SAVE_ID+':1'};r.giveItem('KEY_CRPG_GEOCULUS',1);}}
 r.rollEncounter=()=>null;r.prepareStory();return r;
}

function reload(r){return new R(db,JSON.parse(r.serialize()));}
function advanceToChoice(r){
 for(let i=0;i<100;i++){
  const cs=r.storyChoices();if(cs.length)return cs;
  assert(!r.s.storyJourney&&!r.s.storyBreak,'Unexpected travel before preparation');
  const n=r.storyNode();assert(n,'Missing preparation node');r.action('STORY_NEXT',{node:n[4]});
 }
 throw Error('Preparation loop');
}
const probe=fresh();
const ids=['LEG_LIYUE_XIANGLING','LEG_LIYUE_CHONGYUN','LEG_ISK_LIYUE_BEIDOU','LEG_ISK_LIYUE_CHONGYUN'];
for(const id of ids){
 const d=probe.storyDefinition(id);let r=provision(d),cost=cp(r.legendEffectiveCost(d));
 assert.equal(r.itemCount('ING_FISH'),0,'No old fish fixture');
 if(id.includes('BEIDOU'))assert.equal(r.itemCount('ORE_IRON'),0,'No old iron fixture');
 assert.equal(r.s.global.MORA,cost.mora);
 for(const [item,n]of Object.entries(cost.items))assert.equal(r.itemCount(item),n);
 r.action('LEGEND_ENTER',{quest:id});let paid=false;
 for(let i=0;i<20&&!paid;i++){
  const cs=advanceToChoice(r),accept=cs.find(n=>/LEGEND_ACCEPT_AND_PAY/.test(n[12]))||cs.find(n=>/_PREP_YES$/.test(n[4]));
  if(!accept){r.action('STORY_CHOICE',{node:cs[0][4]});continue;}
  assert(accept[10].includes(r.legendCostSummary(d)),'Choice must disclose the entire actual cost');
  const original=r.serialize();r=reload(r);assert.equal(r.serialize(),original,'Preparation save changed');
  assert(r.storyChoices().some(n=>n[4]===accept[4]),'Exact materials must keep acceptance visible after reload');
  const miss=new R(db,JSON.parse(original)),last=Object.keys(cost.items).at(-1);miss.pay({items:{[last]:1}});
  assert(!miss.storyChoices().some(n=>n[4]===accept[4]),'A missing current material must hide acceptance');
  const noMora=new R(db,JSON.parse(original));noMora.s.global.MORA--;assert(!noMora.storyChoices().some(n=>n[4]===accept[4]),'Insufficient current Mora must hide acceptance');
  const envelope={id:r.s.global.SAVE_ID+':'+(r.s.global.LAST_COMMITTED_ACTION_SEQ+1),revision:r.s.global.SAVE_REVISION,type:'STORY_CHOICE',node:accept[4]};
  const receipt=r.action('STORY_CHOICE',{node:accept[4]}),saved=r.serialize();assert.deepEqual(cp(r.transact(envelope)),cp(receipt));assert.equal(r.serialize(),saved,'Duplicate choice charged twice');
  // Some scripts charge on the following dialogue instead of the selected row.
  for(let j=0;j<5&&!r.s.storyCostReceipts?.[d.QUEST_ID];j++){const n=r.storyNode();assert(n);r.action('STORY_NEXT',{node:n[4]});}
  assert(r.s.storyCostReceipts?.[d.QUEST_ID],'No payment receipt');assert.equal(r.s.global.MORA,0);
  for(const [item]of Object.entries(cost.items))assert.equal(r.itemCount(item),0,'Actual deduction mismatch '+item);
  const progress=r.serialize();r=reload(r);assert.equal(r.serialize(),progress,'Paid progress save changed');
  assert(r.legendCostReady(r.storyDefinition(id)),'Paid save must not require supplies a second time');
  const paidNode=r.storyIndex().nodes.get(d.ROUTE_SCOPE+':'+d.COST_COMMIT_NODE_ID);r.storyAcceptLegend(d.QUEST_ID,paidNode);assert.equal(r.serialize(),progress,'Existing receipt charged twice');
  paid=true;
 }
 assert(paid,id+' never accepted');console.log('PASS exact preparation / choice / deduction / save',id);
}
// A legacy paid save has only node+turn in its cost receipt, and may not meet newer oculus terms.
{
 const d=probe.storyDefinition('LEG_LIYUE_GANYU'),r=provision(d);r.s.storyCostReceipts={[d.QUEST_ID]:{node:d.COST_COMMIT_NODE_ID,turn:r.s.global.TURN}};
 r.s.storyContext={kind:'LEGEND',entry:d.id,node:d.COST_COMMIT_NODE_ID,table:'57_MOND_STORY_SCENE_DB'};
 r.s.global.PENDING_CHOICE_GROUP_ID='';r.s.global.PENDING_INPUT_JSON='{}';r.s.global.MORA=0;r.s.inventory=r.s.inventory.filter(x=>!x.item);r.ensureGeo().receipts={};r.ensureGeo().progress={};r.ensureExplorationState().oculi={};
 const loaded=reload(r),next=loaded.storyNode();assert(loaded.legendUnderWay(d));assert.equal(loaded.actionReason('LEGEND_ENTER',{quest:d.id}).includes('눈동자'),false);
 assert(loaded.storyCondition(next[11],d));loaded.storyAcceptLegend(d.QUEST_ID,next);assert.equal(loaded.s.global.MORA,0);
 console.log('PASS legacy paid save without current supplies/oculi');
}
// The waiver remains state-dependent and does not make ordinary Diluc preparation free.
{
 const d=probe.storyDefinition('LEG_ISK_MOND_DILUC'),r=provision(d);assert(r.legendEffectiveCost(d).waivedByStory);r.s.global.MORA=0;r.s.inventory=r.s.inventory.filter(x=>!x.item);assert(r.legendCostReady(d));assert.match(r.legendCostSummary(d),/면제/);
 r.s.flags.FLAG_ISK_MOND_BRANCH='KNOWLEDGE';assert(!r.legendEffectiveCost(d).waivedByStory);assert(!r.legendCostReady(d));assert.equal(r.legendEffectiveCost(d).mora,1650);
 const freshGanyu=provision(probe.storyDefinition('LEG_LIYUE_GANYU'));freshGanyu.ensureGeo().receipts={};assert.match(freshGanyu.actionReason('LEGEND_ENTER',{quest:'LEG_LIYUE_GANYU'}),/눈동자/);
 for(const d of probe.storyIndex().legends.values())if(d.CHAR_ID==='LIYUE_ZIBAI'){assert.equal(d.STATUS,'EVENT_ONLY');assert(!r.legendCostReady(d));}
 for(const id of ['LEG_MOND_VENTI','LEG_LIYUE_ZHONGLI']){const d=probe.storyDefinition(id);assert.equal(probe.recruitmentRejoinEntry(d),null);}
 console.log('PASS Diluc waiver / fresh oculus gate / event-only / archon');
}
{
 const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),d=r.storyDefinition('LEG_ISK_LIYUE_XIANGLING'),gate=r.liyueLegendProgress(d);
 r.s.quests[d.QUEST_ID]={state:'완료',claimed:true};r.s.flags[d.COMPLETE_FLAG_ID]=true;r.s.quests[gate.quest]={state:'완료',claimed:true};r.s.global.COMPANION_ELIGIBILITY_JSON='{}';
 const before=r.serialize();assert.match(r.actionReason('RECRUIT_REJOIN',{quest:d.id}),/에서 다시/);assert.throws(()=>r.action('RECRUIT_REJOIN',{quest:d.id}));assert.equal(r.serialize(),before);
 r.s.global.CURRENT_MAP_ID=r.recruitmentRejoinEntry(d).map;r.s.flags[d.RECRUIT_FLAG_ID]=true;assert.match(r.actionReason('RECRUIT_REJOIN',{quest:d.id}),/재회 조건/);
 r.s.flags[d.RECRUIT_FLAG_ID]=false;assert.equal(r.actionReason('RECRUIT_REJOIN',{quest:d.id}),'');r.action('RECRUIT_REJOIN',{quest:d.id});assert.equal(r.s.global.CURRENT_MAP_ID,'MAP_LIYUE_HARBOR');
 console.log('PASS rejoin map and authored condition');
}
for(const id of ['EVT_MOND_MIKA_INTRO_LINE_2','EVT_MOND_MONA_INTRO_LINE_2']){const n=probe.storyIndex().nodes.get('ROUTE_TRAVELER:'+id);assert.equal(n[6],'ENTITY_PAIMON');assert(probe.assetFor(n[6]));}
for(const id of ['LEG_LIYUE_NINGGUANG_NG_B','LEG_LIYUE_GANYU_L04','LEG_ISK_LIYUE_NINGGUANG_PREP_YES','LEG_ISK_LIYUE_YELAN_PREP_YES','LEG_MOND_MONA_N020']){
 const n=[...probe.storyIndex().nodes.values()].find(n=>n[4]===id),d=probe.storyIndex().legendCostRows.get(n[0]+':'+id),text=probe.legendCostDisplayText(n,n[9]||n[10]);
 assert(text.includes(String(d.COST_MORA)),id+' still quotes the old amount');
}
console.log('PASS portraits and representative dynamic cost lines');
