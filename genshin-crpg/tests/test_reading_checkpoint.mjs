import assert from 'node:assert/strict';
import {onlineFixture,R,DB,ENGINE_VERSION} from './helpers_online.mjs';
const f=onlineFixture();await f.start();
const initial=JSON.parse(f.read().state),r=new R(DB,initial),reading=[];
const reference=new R(DB,initial),timings=[];
for(let i=0;i<5;i++){
 const node=r.storyActiveNodeId(),before=r.serialize(),started=performance.now(),step=r.previewStoryRead(node);
 timings.push(performance.now()-started);assert(step,'opening narration is a safe reading step');
 assert.equal(r.serialize(),before,'probing must not mutate the displayed or committed state');
 reading.push({id:crypto.randomUUID(),node,route:r.s.global.STORY_ROUTE_ID,context:''});
 r.s=step.state;reference.action('STORY_NEXT',{node});
}
assert.equal(r.serialize(),reference.serialize());assert(r.storyChoices().length);
const batch={version:ENGINE_VERSION,requestId:crypto.randomUUID(),revision:f.read().revision,type:'STORY_READ',params:{},reading};
const committed=await f.call('/game/action',batch);assert.equal(committed.status,200,committed.error);
assert.equal(committed.revision,batch.revision+1);assert.equal(JSON.parse(f.read().state).global.LAST_COMMITTED_ACTION_SEQ,reference.s.global.LAST_COMMITTED_ACTION_SEQ);
assert.deepEqual(JSON.parse(f.read().state),reference.s,'one checkpoint must equal actual sequential play');
const replay=await f.call('/game/action',batch);assert.deepEqual(replay,committed,'response loss must not repeat any line');
f.seed(initial);
const choice=r.storyChoices()[0];reference.action('STORY_CHOICE',{node:choice[4]});
const decision=await f.action('STORY_CHOICE',{node:choice[4]},{reading});assert.equal(decision.status,200,decision.error);
assert.deepEqual(JSON.parse(f.read().state),reference.s,'choice and preceding reading must commit atomically');
f.seed(initial);const invalidBefore=f.read();
for(const invalid of [
 [...reading,{id:'choice-as-reading',node:choice[4],route:initial.global.STORY_ROUTE_ID,context:''}],
 [reading[1]],
 [{...reading[0],route:'ROUTE_TRAVELER'}],
 [{...reading[0],context:'UNRELATED_STORY'}],
 Array(65).fill(reading[0])
]){
 const out=await f.action('STORY_READ',{}, {reading:invalid});assert(out.status>=400);
 assert.equal(f.read().state,invalidBefore.state);assert.equal(f.read().revision,invalidBefore.revision,'invalid batch must commit no prefix');
}
assert.equal((await f.action('STORY_READ',{}, {reading})).status,200,'rejected batch must not poison the reusable engine');
// The optimistic path is deny-by-default for effects and every non-reading action boundary.
for(const [table,nodes]of Object.entries(r.storyIndex().byTable)){
 for(const node of nodes.filter(n=>['CHOICE','COMBAT_GATE','EVENT','CARD_JOIN','CHAPTER_END','LEGEND_END','AFFECTION_END'].includes(n[5]))) {
  r.s=structuredClone(initial);r.s.global.STORY_ROUTE_ID=node[0];r.s.global.CURRENT_STORY_NODE_ID=r.s.global.STORY_CURSOR_NODE_ID=node[4];
  if(table==='57_MOND_STORY_SCENE_DB')r.s.storyContext={kind:'LEGEND',entry:'TEST',node:node[4],table};
  assert.equal(r.previewStoryRead(node[4]),null,node[4]+' must be a synchronous authoritative boundary');
 }
}
const free=new R(DB,initial);free.serverAdmin=true;free.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_PLAINS'});f.seed(free.s);
const prepare=f.env.DB.prepare;
f.env.DB.prepare=query=>{const statement=prepare(query);if(query.startsWith('SELECT a.id')){const bind=statement.bind.bind(statement);statement.bind=(...args)=>{const bound=bind(...args),first=bound.first.bind(bound);bound.first=async()=>{await new Promise(r=>setTimeout(r,300));return first();};return bound;};}return statement;};
const started=Date.now(),life=await f.action('LIFE_START',{kind:'GATHER',startedAt:0,actionStartedAt:0});
assert.equal(life.status,200,life.error);assert(life.state.lifeJob.startedAt>=started);assert(life.state.lifeJob.startedAt<started+100,'the server activity clock starts before authentication/database delay');
assert(Date.now()-life.state.lifeJob.startedAt>=300);f.env.DB.prepare=prepare;
const early=await f.action('LIFE_FINISH',{job:life.state.lifeJob.id,elapsed:1000000});assert.equal(early.status,400,'client elapsed time must not grant early rewards');
assert.deepEqual(JSON.parse(f.read().state).inventory,life.state.inventory);
console.log(JSON.stringify({ok:true,readingSteps:5,checkpointRevisions:1,previewMilliseconds:timings,atomicDecision:true,retryExactlyOnce:true,invalidBatchesRolledBack:true,serverActivityClock:true}));
