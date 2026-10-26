'use strict';
// 0.16.2 자원 풍경 (the user: 「채집이랑 채광같은 시스템들 다시 만들어」). Gathering, mining and hunting are scenes drawn from the
// job's seed by source/runtime_life_v0162.js on both sides; the authoritative runtime replays the presses and pays exactly
// what was collected. Fishing and jobs saved before 0.16.2 keep their own rules.
const assert=require('node:assert/strict');
const {fresh,R,db,c,advance,fs,path,root}=require('./helpers_v011.cjs');
const api=c.CRPGRuntime,L=api.lifeScene,cp=x=>JSON.parse(JSON.stringify(x)),results=[];
const src=f=>fs.readFileSync(path.join(root,f),'utf8');
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const MAPS={GATHER:'MAP_MOND_PLAINS',MINE:'MAP_CRPG_MOND_QUARRY',HUNT:'MAP_CRPG_WHISPER_HUNT'};
const tenth=v=>Math.round(v*10)/10;
function rejected(r,type,args){const s=r.serialize();assert.throws(()=>r.action(type,args));assert.equal(r.serialize(),s);}
function start(kind,map=MAPS[kind]){const r=fresh(map);r.die=()=>100;r.s.global.ENCOUNTER_COOLDOWN=0;r.action('LIFE_START',{kind});return {r,job:cp(r.s.lifeJob),scene:cp(r.lifeScene())};}
// Presses that collect everything: each plant once; each vein to its last blow, 100 ms apart; each animal at mid-run.
function all(scene){
 if(scene.kind==='GATHER')return scene.nodes.map((n,i)=>({at:400+i*250,node:i}));
 if(scene.kind==='MINE'){const out=[];let at=300;for(const n of scene.nodes)for(let k=0;k<n.hits;k++){out.push({at,node:n.i});at+=100;}return out;}
 return scene.nodes.map(a=>{const at=a.start+Math.round(a.duration/2),p=L.animalAt(a,at);return {at,node:a.i,x:tenth(p.x),y:tenth(p.y)};}).sort((a,b)=>a.at-b.at);
}
const sum=nodes=>{const o={};for(const n of nodes)o[n.item]=(o[n.item]||0)+n.n;return o;};
const counts=(r,items)=>Object.fromEntries(Object.keys(items).map(id=>[id,r.itemCount(id)]));
function finish(r,job,inputs,elapsed){advance(elapsed);return r.action('LIFE_FINISH',{job:job.id,inputs,elapsed}).result;}
function noOverlap(nodes){for(const a of nodes)for(const b of nodes)if(a!==b)assert(Math.abs(a.x-b.x)>=15||Math.abs(a.y-b.y)>=18,'two spots overlap');}

check('every start opens a scene from its seed: same scene after a reload and on the other side',()=>{
 assert.deepEqual(cp(L.limits),{GATHER:25000,MINE:30000,HUNT:20000});
 const out={};
 for(const kind of ['GATHER','MINE','HUNT']){
  const {r,job,scene}=start(kind);
  assert.deepEqual(Object.keys(job.scene).sort(),['seed','version']);assert.equal(job.scene.version,1);assert(Number.isInteger(job.scene.seed)&&job.scene.seed>=0&&job.scene.seed<=0xffffffff);
  assert.equal(job.duration,L.limits[kind]);assert.equal(job.minigame,undefined,'no 0.15.22 minigame on new jobs');assert.equal(r.lifeJobDuration(kind),L.limits[kind]);
  assert.deepEqual(cp(new R(db,cp(r.s)).lifeScene()),scene,'a reload draws the same scene');
  assert.deepEqual(cp(L.generate(job,r.lifePool(kind))),scene);assert.deepEqual(cp(L.generate(job,r.lifePool(kind))),scene);
  out[kind]=scene.nodes.length;
 }
 return out;
});

check('scenes keep their shape over 400 seeds: plants, veins (hits and ore per kind) and staggered animals',()=>{
 const r=fresh();const pool=(kind,map)=>r.lifePool(kind,map),seen={};
 const pools={GATHER:pool('GATHER','MAP_MOND_PLAINS'),HUNT:pool('HUNT','MAP_CRPG_WHISPER_HUNT'),MINES:[pool('MINE','MAP_CRPG_MOND_QUARRY'),pool('MINE','MAP_DRAGONSPINE'),pool('MINE','MAP_LY_DETAIL_TIANHENG')]};
 const HITS={ORE_IRON:3,ORE_WHITE_IRON:4,ORE_STARSILVER:4,MAT_LIYUE_COR_LAPIS:4,MAT_LIYUE_NOCTILUCOUS_JADE:4,ORE_CRYSTAL:5},N={ORE_IRON:[2,3],ORE_WHITE_IRON:[1,2],ORE_CRYSTAL:[1,1]};
 for(let k=0;k<400;k++){
  const seed=Math.imul(k+1,2654435761)>>>0,job=kind=>({kind,scene:{version:1,seed}});
  const g=L.generate(job('GATHER'),pools.GATHER);assert(g.nodes.length>=4&&g.nodes.length<=5);noOverlap(g.nodes);
  for(const n of g.nodes){assert(pools.GATHER.some(x=>x.item===n.item));assert(n.n===1||n.n===2);assert(n.x>=8&&n.x<=92&&n.y>=30&&n.y<=85);}
  for(const p of pools.MINES){const m=L.generate(job('MINE'),p);assert(m.nodes.length>=2&&m.nodes.length<=3);noOverlap(m.nodes);
   for(const n of m.nodes){assert.equal(n.hits,HITS[n.item],n.item);const [lo,hi]=N[n.item]||[1,2];assert(n.n>=lo&&n.n<=hi,n.item);assert(n.x>=8&&n.x<=92&&n.y>=30&&n.y<=85);seen[n.item]=(seen[n.item]||0)+1;}}
  const h=L.generate(job('HUNT'),pools.HUNT);assert(h.nodes.length>=2&&h.nodes.length<=3);
  for(const a of h.nodes){assert(['ING_RAW_MEAT','ING_FOWL'].includes(a.item));assert(a.n>=2&&a.n<=3);assert(a.start>=500&&a.start<=9000);assert(a.duration>=5000&&a.duration<=8000);assert(a.y0>=35&&a.y0<=80&&a.y1>=35&&a.y1<=80);assert(['L','R'].includes(a.from));assert(a.start+a.duration<L.limits.HUNT);
   const enter=L.animalAt(a,a.start),leave=L.animalAt(a,a.start+a.duration);assert(a.from==='L'?enter.x<0&&leave.x>100:enter.x>100&&leave.x<0,'crosses from its edge');assert.equal(L.animalAt(a,a.start-1),null);assert.equal(L.animalAt(a,a.start+a.duration+1),null);}
  for(let i=1;i<h.nodes.length;i++)assert(h.nodes[i].start>h.nodes[i-1].start,'one after another');
 }
 for(const id of ['ORE_IRON','ORE_WHITE_IRON','ORE_CRYSTAL','ORE_STARSILVER','MAT_LIYUE_COR_LAPIS','MAT_LIYUE_NOCTILUCOUS_JADE'])assert(seen[id],id+' appears in the mines');
 return seen;
});

check('the mines are where ore comes from: Mond 50/35/15, starsilver mines 30/30/25/15, Liyue keeps its pools',()=>{
 const r=fresh(),w=(kind,map)=>Object.fromEntries(r.lifePool(kind,map).map(x=>[x.item,x.weight]));
 for(const map of ['MAP_CRPG_MOND_QUARRY','MAP_STORMTERROR_LAIR','MAP_CRPG_BRIGHTCROWN_CANYON'])assert.deepEqual(w('MINE',map),{ORE_IRON:50,ORE_WHITE_IRON:35,ORE_CRYSTAL:15},map);
 for(const map of ['MAP_DRAGONSPINE','MAP_CRPG_WYRMREST_VALLEY','MAP_CRPG_STARGLOW_CAVERN','MAP_CRPG_ENTOMBED_PALACE'])assert.deepEqual(w('MINE',map),{ORE_STARSILVER:30,ORE_IRON:30,ORE_WHITE_IRON:25,ORE_CRYSTAL:15},map);
 assert(w('MINE','MAP_LY_DETAIL_HULAO').MAT_LIYUE_COR_LAPIS>0&&w('MINE','MAP_LY_DETAIL_MINGYUN').MAT_LIYUE_NOCTILUCOUS_JADE>0,'the Liyue forge specialties');
 assert.deepEqual(w('MINE','MAP_CHASM_DEEP'),{ORE_WHITE_IRON:30,ORE_CRYSTAL:70},'the Chasm as before');
 assert.equal(w('GATHER','MAP_MOND_PLAINS').ING_BIRD_EGG,35,'gathering pools as before');assert.deepEqual(w('HUNT','MAP_CRPG_WHISPER_HUNT'),{ING_RAW_MEAT:60,ING_FOWL:40},'hunting pools as before');
 const card=fresh('MAP_CRPG_MOND_QUARRY').lifeEntries()[0];assert.equal(card.kind,'MINE');assert.equal(card.seconds,30);assert.equal(card.limit,6);
});

check('gathering pays exactly the plants picked: one try, ten minutes, the 5 % roll, the lesson; never twice',()=>{
 const {r,job,scene}=start('GATHER');const time=r.s.global.WORLD_TIME,picked=all(scene).slice(0,2),items=sum(scene.nodes.slice(0,2)),before=counts(r,items);let rolls=0;r.die=()=>{rolls++;return 100;};
 rejected(r,'LIFE_FINISH',{job:job.id,inputs:picked,elapsed:2000});
 const out=finish(r,job,picked,2000);
 assert.deepEqual(cp(out.items),items);assert(out.caught&&!out.empty);assert.equal(out.minutes,10);assert.deepEqual(cp(out.collected),[0,1]);assert(rolls>=1,'the encounter roll');
 for(const [id,n]of Object.entries(items))assert.equal(r.itemCount(id),before[id]+n,id);
 assert(!r.s.lifeJob);assert.equal(r.s.lifeResources['MAP_MOND_PLAINS:GATHER'].used,1);assert.notEqual(r.s.global.WORLD_TIME,time);
 assert(r.tutorialState().done.lifeGATHER&&r.tutorialState().done.gather);assert.equal(r.achievementStats().life.GATHER,1);
 rejected(r,'LIFE_FINISH',{job:job.id,inputs:picked,elapsed:2000});new R(db,cp(r.s));
 // A plant pressed twice is picked once.
 const b=start('GATHER'),twice=[{at:300,node:0},{at:320,node:0},{at:500,node:1}];const out2=finish(b.r,b.job,twice,600);assert.deepEqual(cp(out2.items),sum(b.scene.nodes.slice(0,2)));
 // The 5 % roll can bring enemies; what was gathered stays gathered.
 const e=start('GATHER');let first=true;e.r.die=()=>{if(first){first=false;return 5;}return 1;};const met=finish(e.r,e.job,all(e.scene).slice(0,1),500);
 assert(met.encounter&&e.r.s.runtime,'an encounter after gathering');assert.equal(e.r.s.runtime.encounter.label,'탐색 중 조우');assert.deepEqual(cp(met.items),sum(e.scene.nodes.slice(0,1)));
 return {items:out.items};
});

check('mining needs every blow, at least 80 ms apart; a vein left cracked gives nothing',()=>{
 const {r,job,scene}=start('MINE'),full=all(scene),partial=full.slice(0,-1),items=sum(scene.nodes.slice(0,-1)),before=counts(r,sum(scene.nodes));
 const out=finish(r,job,partial,partial.at(-1).at+40);
 assert.deepEqual(cp(out.items),items,'the last vein missed its last blow');for(const [id,n]of Object.entries(items))assert.equal(r.itemCount(id),before[id]+n);
 assert.equal(r.s.lifeResources['MAP_CRPG_MOND_QUARRY:MINE'].used,1);assert(r.tutorialState().done.mine);
 const b=start('MINE'),fast=all(b.scene).map((x,i)=>({...x,at:300+i*79}));advance(29000);rejected(b.r,'LIFE_FINISH',{job:b.job.id,inputs:fast,elapsed:29000});
 const gap=all(b.scene).map((x,i)=>({...x,at:300+i*80})),done=b.r.action('LIFE_FINISH',{job:b.job.id,inputs:gap,elapsed:gap.at(-1).at}).result;
 assert.deepEqual(cp(done.items),sum(b.scene.nodes),'exactly 80 ms apart is allowed');
 // Blows on a broken vein change nothing.
 const c3=start('MINE'),n0=c3.scene.nodes[0],extra=[...Array(n0.hits+2)].map((_,k)=>({at:300+k*100,node:0}));const out3=finish(c3.r,c3.job,extra,extra.at(-1).at);assert.deepEqual(cp(out3.items),{[n0.item]:n0.n});
 return {veins:scene.nodes.map(n=>n.item+'×'+n.n+'/'+n.hits)};
});

check('hunting catches an animal a press lands within 9 % of while it runs, each once; misses catch nothing',()=>{
 const {r,job,scene}=start('HUNT'),a=scene.nodes[0],mid=a.start+Math.round(a.duration/2),p=L.animalAt(a,mid),others=new Set(scene.nodes.filter(x=>x.i!==0).map(x=>x.i));
 const near={at:mid,node:0,x:tenth(p.x),y:tenth(p.y+8.6)},far={at:mid,node:0,x:tenth(p.x),y:tenth(p.y+9.6)};
 assert(near.y<=100&&far.y<=100);
 assert.equal(L.huntTarget(scene,others,near.x,near.y,mid),0,'8.6 % away is within reach');assert.equal(L.huntTarget(scene,others,far.x,far.y,mid),-1,'9.6 % away is not');
 assert.equal(L.huntTarget(scene,others,tenth(L.animalAt(a,a.start+10).x+1),L.animalAt(a,a.start+10).y,a.start-5),-1,'not before it sets off');
 const late=L.animalAt(a,a.start+a.duration);assert.equal(L.huntTarget(scene,others,Math.max(0,Math.min(100,tenth(late.x))),tenth(late.y),a.start+a.duration+5),-1,'not after it has gone');
 const presses=all(scene),items=sum(scene.nodes),before=counts(r,items);
 // a press on the first animal again, a press on the empty sky and a press before anything runs: nothing more
 const inputs=[{at:0,node:-1,x:50,y:50},...presses,{at:presses.at(-1).at+5,node:presses.at(-1).node,x:presses.at(-1).x,y:presses.at(-1).y},{at:presses.at(-1).at+10,node:-1,x:50,y:3}];
 const out=finish(r,job,inputs,presses.at(-1).at+20);
 assert.deepEqual(cp(out.items),items);for(const [id,n]of Object.entries(items))assert.equal(r.itemCount(id),before[id]+n);assert(r.tutorialState().done.lifeHUNT);
 // Only misses: an empty hunt costs nothing.
 const b=start('HUNT'),misses=[{at:0,node:-1,x:50,y:50},{at:5000,node:-1,x:50,y:4},{at:9000,node:-1,x:5,y:96}],time=b.r.s.global.WORLD_TIME;b.r.die=()=>{throw Error('no roll for an empty hunt');};
 const empty=finish(b.r,b.job,misses,10000);assert(empty.empty&&!empty.caught);assert.deepEqual(cp(empty.items),{});assert.equal(b.r.s.global.WORLD_TIME,time);assert(!b.r.s.lifeResources?.['MAP_CRPG_WHISPER_HUNT:HUNT']);
 // A press needs its place.
 const c3=start('HUNT');advance(10000);
 for(const bad of [{at:100,node:-1},{at:100,node:-1,x:101,y:50},{at:100,node:-1,x:50,y:-1},{at:100,node:-2,x:50,y:50},{at:100,node:3,x:50,y:50}])rejected(c3.r,'LIFE_FINISH',{job:c3.job.id,inputs:[bad],elapsed:9000});
 return {animals:scene.nodes.map(x=>x.item+' '+x.from+' '+x.start+'+'+x.duration)};
});

check('forged logs are rejected whole: order, range, timing, size; the real one still settles afterwards',()=>{
 const {r,job,scene}=start('GATHER'),ok=all(scene),last=ok.at(-1).at;
 rejected(r,'LIFE_FINISH',{job:job.id,inputs:ok,elapsed:last});advance(last);
 const bad=[
  [[{at:500,node:0},{at:400,node:1}],last],[[{at:100,node:scene.nodes.length}],last],[[{at:100,node:-1}],last],[[{at:100,node:1.5}],last],[[{at:100.5,node:0}],last],
  [[{at:-1,node:0}],last],[[{at:last+1,node:0}],last],[ok,L.limits.GATHER+1],[ok,last+0.5],[ok,last+200],[ok,-1],[[...Array(81)].map((_,i)=>({at:i,node:0})),last],
  [{0:{at:1,node:0}},last],[[null],last],[[[1,0]],last],[[{at:100,node:0,x:'5'}],last],[[{at:100,node:0,y:NaN}],last]];
 for(const [inputs,elapsed]of bad)rejected(r,'LIFE_FINISH',{job:job.id,inputs,elapsed});
 rejected(r,'LIFE_FINISH',{job:job.id,elapsed:last});rejected(r,'LIFE_FINISH',{job:job.id+'X',inputs:ok,elapsed:last});
 const out=r.action('LIFE_FINISH',{job:job.id,inputs:ok,elapsed:last}).result;assert.deepEqual(cp(out.items),sum(scene.nodes));
 return {rejected:bad.length+2};
});

check('leaving with nothing costs nothing: no try, no time, no encounter roll, no lesson, no achievement count',()=>{
 for(const kind of ['GATHER','MINE','HUNT']){
  const {r,job}=start(kind),g=r.s.global,time=g.WORLD_TIME,day=g.WORLD_DAY,remaining=r.lifeEntries()[0].remaining;r.die=()=>{throw Error('no encounter roll');};
  const out=r.action('LIFE_FINISH',{job:job.id,inputs:[],elapsed:0}).result;
  assert(out.empty&&!out.caught);assert.deepEqual(cp(out.items),{});assert.equal(out.minutes,0);assert.equal(out.encounter,null);
  assert(!r.s.lifeJob);assert.equal(g.WORLD_TIME,time);assert.equal(g.WORLD_DAY,day);assert.equal(r.lifeEntries()[0].remaining,remaining);assert.equal(r.s.global.SCREEN_MODE,'LOCATION');
  assert(!r.tutorialState().done['life'+kind]);assert.equal(r.achievementStats().life[kind]||0,0);assert.equal(r.tutorialDirective()?.id,undefined);
  r.action('LIFE_START',{kind});assert(r.s.lifeJob.scene);assert.equal(r.tutorialDirective().id,'life'+kind);
  // LIFE_CANCEL still works and spends nothing.
  r.action('LIFE_CANCEL');assert.equal(r.lifeEntries()[0].remaining,remaining);
 }
});

check('daily tries: six mines and four of the others per place, back the next day; an empty scene spends none',()=>{
 const out={};
 for(const [kind,limit]of [['MINE',6],['GATHER',4],['HUNT',4]]){
  let r=fresh(MAPS[kind]);r.die=()=>100;
  r.action('LIFE_START',{kind});r.action('LIFE_FINISH',{job:r.s.lifeJob.id,inputs:[],elapsed:0});assert.equal(r.lifeEntries()[0].remaining,limit);
  for(let n=0;n<limit;n++){r.action('LIFE_START',{kind});const job=cp(r.s.lifeJob),scene=r.lifeScene(),inputs=all(scene).slice(0,kind==='MINE'?scene.nodes[0].hits:1);finish(r,job,inputs,inputs.at(-1).at+10);}
  assert.equal(r.lifeEntries()[0].remaining,0);rejected(r,'LIFE_START',{kind});assert.match(r.actionReason('LIFE_START',{kind}),/다음 날/);
  r.s.global.WORLD_DAY++;r=new R(db,cp(r.s));r.action('LIFE_START',{kind});assert(r.s.lifeJob.scene);out[kind]=limit;
 }
 return out;
});

check('a job saved before 0.16.2 finishes by its own rules: the 0.15.22 minigame and the plain ten seconds',()=>{
 const r=fresh('MAP_MOND_PLAINS');r.action('LIFE_START',{kind:'GATHER'});
 const s=cp(r.s),seed=12345;delete s.lifeJob.scene;Object.assign(s.lifeJob,{duration:10000,minigame:{version:1,seed}});
 const x=new R(db,s);assert.equal(x.lifeScene(),null);x.die=()=>100;
 const inputs=[0,1,2].map(round=>({round,at:1700+round*3000,choice:api.lifeMinigame.target(seed,round)}));
 rejected(x,'LIFE_FINISH',{job:s.lifeJob.id,inputs,elapsed:10000});advance(10000);
 const out=x.action('LIFE_FINISH',{job:s.lifeJob.id,inputs,elapsed:10000}).result;assert(out.caught);assert(Object.values(out.items).reduce((a,b)=>a+b,0)>=6,'two bundles as in 0.15.22');assert.equal(x.s.lifeResources['MAP_MOND_PLAINS:GATHER'].used,1);
 const plain=cp(r.s);delete plain.lifeJob.scene;plain.lifeJob.duration=10000;plain.lifeJob.startedAt-=10000;const y=new R(db,plain);y.die=()=>100;
 const out2=y.action('LIFE_FINISH',{job:plain.lifeJob.id}).result;assert(out2.caught);assert(Object.keys(out2.items).length);
 const wrong=cp(s);wrong.lifeJob.duration=25000;assert.throws(()=>new R(db,wrong),'an old job keeps its ten seconds');
});

check('a scene cannot be forged into a save',()=>{
 const {r}=start('MINE'),base=cp(r.s);new R(db,cp(base));
 const forge=[s=>{s.lifeJob.scene.version=2;},s=>{s.lifeJob.scene.seed=-1;},s=>{s.lifeJob.scene.seed=2**32;},s=>{s.lifeJob.scene.seed=1.5;},s=>{s.lifeJob.scene.extra=1;},s=>{s.lifeJob.scene=null;},s=>{s.lifeJob.scene=[1,2];},s=>{s.lifeJob.scene={version:1};},
  s=>{s.lifeJob.minigame={version:1,seed:1};},s=>{s.lifeJob.duration=10000;},s=>{s.lifeJob.duration=25000;}];
 for(const f of forge){const s=cp(base);f(s);assert.throws(()=>new R(db,s),String(f));}
 const fish=fresh('MAP_CRPG_CIDER_BANK');fish.giveItem('TRPG_FISHING_ROD',1);fish.giveItem(api.lifeCatalog.bait,1);fish.action('LIFE_START',{kind:'FISH'});const s=cp(fish.s);s.lifeJob.scene={version:1,seed:1};assert.throws(()=>new R(db,s),'fishing has no scene');
 return {forged:forge.length+1};
});

check('fishing is unchanged: rod and bait, twenty seconds of tension, the fish when it is landed',()=>{
 const r=fresh('MAP_CRPG_CIDER_BANK');r.giveItem('TRPG_FISHING_ROD',1);r.giveItem(api.lifeCatalog.bait,2);r.action('LIFE_START',{kind:'FISH'});const job=cp(r.s.lifeJob);
 assert(job.fishing&&!job.scene&&!job.minigame);assert.equal(job.duration,20000);assert.equal(r.lifeJobDuration('FISH'),20000);assert.equal(r.itemCount(api.lifeCatalog.bait),1);assert.equal(r.lifeScene(),null);
 const controls=[];let held=false,elapsed=job.duration;for(let t=2000;t<=job.duration;t+=100){const st=c.CRPGFishing.simulate(job,controls,t);if(st.caught){elapsed=t;break;}const next=st.cursor<st.target;if(next!==held){controls.push({at:t,hold:next});held=next;}}
 assert(c.CRPGFishing.simulate(job,controls,elapsed).caught);advance(elapsed);
 const out=r.action('LIFE_FINISH',{job:job.id,controls,elapsed}).result;assert(out.caught);assert(out.items.ING_FISH>=2&&out.items.ING_FISH<=4);assert.equal(r.lifeEntries()[0].remaining,3);
 return {elapsed,fish:out.items.ING_FISH};
});

check('the Liyue companions still add their extra ore to what a scene paid',()=>{
 for(let tries=0;tries<12;tries++){
  const r=fresh('MAP_LY_DETAIL_MINGYUN');r.adminApply({op:'recruit',char:'LIYUE_NINGGUANG'});r.action('PARTY',{char:'LIYUE_NINGGUANG',slot:2});assert(r.liyuePartyPassive('LIYUE_NINGGUANG'));
  for(let k=0;k<tries;k++){r.action('LIFE_START',{kind:'MINE'});r.action('LIFE_CANCEL');}
  r.action('LIFE_START',{kind:'MINE'});const job=cp(r.s.lifeJob),scene=r.lifeScene();if(!scene.nodes.some(n=>['ORE_IRON','ORE_WHITE_IRON'].includes(n.item)))continue;
  const inputs=all(scene),out=finish(r,job,inputs,inputs.at(-1).at),paid=sum(scene.nodes);
  for(const id of ['ORE_IRON','ORE_WHITE_IRON'])if(paid[id])paid[id]++;
  assert.deepEqual(cp(out.items),paid);assert.equal(out.liyuePassive,'LIYUE_NINGGUANG_PASSIVE_ORE');return {tries,items:out.items};
 }
 throw Error('no Liyue scene with iron or white iron in twelve draws');
});

check('the screen side: registered after the 0.15.22 files, no drop-down, cards and scenes as pictures, the lesson points into the scene',()=>{
 const html=src('source/index.html'),build=src('tools/build.py'),at=f=>html.indexOf('"'+f+'"');
 assert(at('runtime_life_v0162.js')>at('runtime_life_v01522.js')&&at('runtime_life_v0162.js')<at('runtime_reading.js'),'the rules load after the 0.15.22 life rules, with the runtime');
 assert(at('app_life_v0162.js')>at('app_life_v01522.js')&&at('life_v0162.css')>0);
 for(const f of ['runtime_life_v0162.js','app_life_v0162.js','life_v0162.css'])assert(build.includes("'"+f+"'"),f);
 assert(src('tools/verify_release.py').includes("'tests/test_life_v0162.cjs'"));
 const app=src('source/app_life_v0162.js'),life=src('source/app_life.js'),css=src('source/life_v0162.css'),tut=src('source/app_tutorial.js'),sound=src('source/app_sound.js');
 assert(!/el\('select'|createElement\('select'|<select|new Option\(/.test(app+life),'no drop-down');
 assert(life.includes("CRPGOnline.now()")&&app.includes('lifeClockNow()-job.startedAt'),'the clock follows the server when online');
 assert(app.includes("act('LIFE_FINISH',{job:s.job.id,inputs:s.inputs,elapsed:s.elapsed})")&&app.includes('if(s.ended&&!s.sending&&!s.failed&&performance.now()>=s.sendAt&&!busy)send(s);'),'one send, after any running action');
 for(const cue of app.match(/SND\('(\w+)'\)/g).map(x=>/'(\w+)'/.exec(x)[1]))assert(new RegExp('\\n '+cue+':\\[\\[').test(sound),'an existing sound: '+cue);
 assert(life.includes("button('당기기'")&&!life.includes('길게 눌러 당기기')&&!life.includes('표시를 금색 구간 안에 유지하세요'),'fishing: one button, no paragraphs');
 assert(tut.includes("tutorialFind('[data-life-guide]')")&&tut.includes("'life.GATHER'")&&tut.includes("'life.MINE'")&&tut.includes("'life.HUNT'"));
 // Every rule is the game's (body.teyvat); hover only for a hovering pointer; upright-phone rules only on tall screens.
 const blocks=[];let depth=0,media='',buf='';for(const ch of css.replace(/\/\*[\s\S]*?\*\//g,'')){if(ch==='{'){depth++;const head=buf.trim();buf='';if(head.startsWith('@')){media=head;}else blocks.push({sel:head,media:depth>1?media:''});}else if(ch==='}'){depth--;buf='';if(!depth)media='';}else buf+=ch;}
 const split=sel=>{const parts=[];let d=0,cur='';for(const ch of sel){if(ch==='(')d++;if(ch===')')d--;if(ch===','&&!d){parts.push(cur);cur='';}else cur+=ch;}parts.push(cur);return parts;};
 for(const b of blocks){if(/^(from|to|\d+%)/.test(b.sel)||/@keyframes/.test(b.media))continue;for(const one of split(b.sel))assert(/^(html\.reduce-motion )?body\.teyvat\b/.test(one.trim()),'scoped: '+one);if(b.sel.includes(':hover'))assert.equal(b.media,'@media (hover:hover)',b.sel);}
 for(const m of css.matchAll(/@media\s*([^{]+)\{/g)){const w=/\(max-width:\s*(\d+)px\)/.exec(m[1]);if(w&&+w[1]<=780)assert(/min-height:501px/.test(m[1]),m[1]);}
 assert(css.includes('@media (orientation:landscape) and (max-height:500px)'),'a sideways phone layout');
 return {rules:blocks.length};
});

console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length,results:results.map(r=>({name:r.name,ok:r.ok,evidence:r.evidence}))}));
