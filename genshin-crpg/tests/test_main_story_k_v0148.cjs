'use strict';
// Manuscript edition (main story K/traveler routes and personal legend/affection stories): compiled
// content is current, every chain installs, the play graph is closed and acyclic, and no original
// effect or event order changed.
const path=require('path'),assert=require('assert/strict');
const root=process.env.CRPG_ROOT||path.resolve(__dirname,'..');
const {fs,vm,db,fresh}=require(root+'/tests/helpers_v011.cjs');
const compiler=require(root+'/tools/editorial/compile_main_story_k.cjs');

assert.equal(fs.readFileSync(compiler.out,'utf8'),compiler.render(compiler.compile()),'runtime_main_story_k_content.js must be recompiled from the manuscripts');

// Old graph: every runtime file except the manuscript edition.
const old=vm.createContext({console});
for(const [,f]of fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g))if(!/runtime_main_story_k/.test(f))vm.runInContext(fs.readFileSync(path.join(root,'source',f),'utf8'),old,{filename:f});
const oldRuntime=new old.CRPGRuntime.Runtime(db);oldRuntime.newGame({name:'검증',route:'ROUTE_ISEKAI',seed:1,saveId:'OLD'});
const oldIx=oldRuntime.storyIndex();

const r=fresh('MAP_MOND_CITY','ROUTE_ISEKAI'),ix=r.storyIndex(),content=compiler.compile();
assert.equal(JSON.stringify(ix.mainStoryK.failed),'[]','every chain installs');
assert.equal(JSON.stringify(ix.mainStoryK.installed.map(c=>c.chain)),JSON.stringify(content.chains.map(c=>c.id)));

// TRV_* chains and personal LEG_/AFF_/ARC_ chains without _ISK_ rewrite the traveler route; every other chain the isekai route.
const routeOf=id=>/^TRV_/.test(id)||(/^(LEG|AFF|ARC)_/.test(id)&&!/_ISK_/.test(id))?'ROUTE_TRAVELER':'ROUTE_ISEKAI';
const TABLES=['55_MAIN_STORY_DB','57_MOND_STORY_SCENE_DB'];
const tableOf=(chain)=>{const ROUTE=routeOf(chain.id);return TABLES.find(t=>(ix.byTable[t]||[]).some(x=>x[0]===ROUTE&&x[4]===chain.entry))||TABLES[0];};
const graph=(index,ROUTE,table)=>{
 const rows=(index.byTable[table]||[]).filter(x=>x[0]===ROUTE),get=id=>index.nodes.get(ROUTE+':'+id),groups=new Map();
 for(const x of rows)if(x[14]){if(!groups.has(x[14]))groups.set(x[14],[]);groups.get(x[14]).push(x);}
 return {rows,get,groups};
};
const graphs={};for(const ROUTE of ['ROUTE_ISEKAI','ROUTE_TRAVELER'])for(const table of TABLES)graphs[ROUTE+'|'+table]={oldG:graph(oldIx,ROUTE,table),newG:graph(ix,ROUTE,table)};
// Effects of every original row are untouched.
for(const {oldG,newG}of Object.values(graphs))for(const x of oldG.rows){const y=newG.get(x[4]);assert.ok(y,'original node still exists '+x[4]);assert.equal(y[12],x[12],'effect unchanged '+x[4]);assert.equal(y[11],x[11],'precondition unchanged '+x[4]);}
for(const c of ix.mainStoryK.installed)assert.equal(c.table,tableOf(content.chains.find(x=>x.id===c.chain)),'chain table '+c.chain);

function walk(g,entry,skip=new Set(),stop=new Set()){
 const seen=new Set(),order=[],stack=[entry],edges=new Map();
 const push=(from,to)=>{if(!edges.has(from))edges.set(from,new Set());edges.get(from).add(to);stack.push(to);};
 while(stack.length){
  const id=stack.pop();if(id.startsWith('SCREEN:')||['END','PAUSE','HUB',''].includes(id))continue;
  if(id.startsWith('CHOICE_GROUP:')){const opts=g.groups.get(id.slice(13))||[];assert.ok(opts.length,'empty choice group '+id);if(seen.has(id))continue;seen.add(id);for(const c of opts)if(!skip.has(c[4]))push(id,c[4]);continue;}
  if(id.startsWith('CONDITION_GROUP:')){const opts=g.groups.get(id.slice(16))||[];assert.ok(opts.length,'empty condition group '+id);if(seen.has(id))continue;seen.add(id);for(const c of opts)push(id,c[4]);continue;}
  if(seen.has(id))continue;seen.add(id);order.push(id);
  const row=g.get(id);assert.ok(row,'dangling node '+id);
  assert.ok(row[13],'node without NEXT '+id);
  if(stop.has(id)||row[5]==='STORY_PAUSE'||row[5]==='CHAPTER_END')continue;
  push(id,row[13]);
 }
 // acyclic
 const state=new Map();const visit=n=>{if(state.get(n)===2)return;assert.notEqual(state.get(n),1,'cycle through '+n);state.set(n,1);for(const m of edges.get(n)||[])visit(m);state.set(n,2);};visit(entry);
 return {seen,order,edges};
}
const ancestors=(g,entry,pick)=>{
 const {edges}=walk(g,entry),acc=new Map(),memo=new Map();
 const up=n=>{if(memo.has(n))return memo.get(n);const set=new Set();memo.set(n,set);for(const m of edges.get(n)||[]){const row=g.get(m);if(row&&pick(row))set.add(m);for(const a of up(m))set.add(a);}return set;};
 // forward sets -> invert
 up(entry);
 for(const [n,desc]of memo)for(const d of desc){if(!acc.has(d))acc.set(d,new Set());const row=g.get(n);if(row&&pick(row))acc.get(d).add(n);}
 return acc;
};
const isEvent=row=>/EVENT:/.test(row[12]||'');
for(const chain of content.chains){
 const {oldG,newG}=graphs[routeOf(chain.id)+'|'+tableOf(chain)];
 const {seen,order}=walk(newG,chain.entry);
 const expect=new Set();const collect=items=>{for(const it of items){if(it.k==='keep'||it.k==='combat')expect.add(it.id);if(it.k==='line'){expect.add(it.id);if(it.alt)expect.add(it.alt.id);}if(it.k==='choice')for(const o of it.options){expect.add(o.keep||o.freeze||o.id);collect(o.items||[]);}}};collect(chain.items);
 for(const id of expect)assert.ok(seen.has(id),chain.id+' reaches '+id);
 assert.ok(order.some(id=>['STORY_PAUSE','CHAPTER_END'].includes(newG.get(id)[5])||String(newG.get(id)[13]).startsWith('SCREEN:')),chain.id+' ends at a story pause or screen return');
 const oldWalk=walk(oldG,chain.entry);
 // Personal stories keep their structural rows (pauses, forks, endings) and every one of them is still reached.
 if(tableOf(chain)==='57_MOND_STORY_SCENE_DB')for(const id of oldWalk.seen){const row=oldG.get(id);if(row&&['MENU_GATE','SYSTEM','CONDITIONAL','EVENT_END','LEGEND_END','AFFECTION_END','END'].includes(row[5]))assert.ok(seen.has(id),chain.id+' keeps structural row '+id);}
 // Frozen options and everything only they reach are byte-for-byte the original rows.
 const frozen=[];const fz=items=>{for(const it of items)if(it.k==='choice')for(const o of it.options){if(o.freeze)frozen.push(o.freeze);else fz(o.items);}};fz(chain.items);
 if(frozen.length){const keptOld=new Set([...expect].filter(id=>oldG.get(id))),live=walk(newG,chain.entry,new Set(frozen)).seen;for(const f of frozen)for(const id of walk(oldG,f,new Set([...frozen,...keptOld]),keptOld).order){if(live.has(id)||keptOld.has(id))continue;assert.equal(JSON.stringify(newG.get(id).slice(0,20)),JSON.stringify(oldG.get(id).slice(0,20)),chain.id+' frozen row untouched '+id);}}
 const oldEvents=[...oldWalk.seen].filter(id=>oldG.get(id)&&isEvent(oldG.get(id))),newEvents=[...seen].filter(id=>newG.get(id)&&isEvent(newG.get(id)));
 assert.deepEqual(new Set(newEvents),new Set(oldEvents),chain.id+' keeps every event node');
 const oldAnc=ancestors(oldG,chain.entry,isEvent),newAnc=ancestors(newG,chain.entry,isEvent);
 for(const e of oldEvents)assert.deepEqual([...newAnc.get(e)||[]].sort(),[...oldAnc.get(e)||[]].sort(),chain.id+' keeps the event order before '+e);
 // Bypassed original rows still continue into the chain.
 for(const id of oldWalk.seen){const row=newG.get(id);if(!row||seen.has(id)||id.startsWith('CHOICE_GROUP:')||id.startsWith('CONDITION_GROUP:'))continue;assert.ok(row[13]&&(row[13].startsWith('SCREEN:')||['END','PAUSE','HUB'].includes(row[13])||seen.has(row[13])),chain.id+' bypassed node '+id+' rejoins the chain');}
 console.log(JSON.stringify({chain:chain.id,nodes:order.length,events:newEvents.length}));
}
// Each new row has a resolvable speaker, text and a valid map.
for(const x of TABLES.flatMap(t=>(ix.byTable[t]||[]).filter(x=>x[19]==='CRPG_V0148_MAIN_STORY_K'))){
 assert.ok(x[18]==='ACTIVE');
 if(x[5]==='CHOICE'){assert.ok(x[10]&&x[14],'choice label/group '+x[4]);assert.equal(x[9],null);}
 else{assert.ok(x[9],'text '+x[4]);if(x[5]==='DIALOGUE')assert.ok(x[7],'speaker '+x[4]);if(x[5]==='COMBAT_GATE'){const m=/^START_FIXED_COMBAT:(EG_[A-Z0-9_]+);ON_DEFEAT:RETRY_SAME_NODE$/.exec(x[12]);assert.ok(m,'combat effect '+x[4]);assert.ok(db['49_ENCOUNTER_MEMBER_DB'].some(e=>e[1]===m[1]),'encounter members '+m[1]);}else assert.equal(x[12],'','no effect on new prose row '+x[4]);}
 assert.ok(!x[8]||r.rows('32_MAP_DB').some(m=>m[0]===x[8]),'map '+x[8]+' on '+x[4]);
 assert.ok(r.storyCondition(x[11])!==undefined);
}
console.log('manuscript edition OK',ix.mainStoryK.installed.length,'chains');
