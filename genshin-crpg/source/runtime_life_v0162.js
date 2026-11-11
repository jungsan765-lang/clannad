/* 0.16.2 자원 풍경 (the user: 「채집이랑 채광같은 시스템들 다시 만들어」). Gathering, mining and hunting open a short scene of
 * the place itself: plants to pick, ore veins to break, animals crossing to catch. The scene is drawn from the job's seed
 * by this file on both sides — the browser shows it, the server replays the taps — so the reward is exactly what was
 * collected on screen.
 *  - 채집 25 s: 4–5 plants, one draw each from the place's pool, 1–2 apiece. A tap picks one.
 *  - 채광 30 s: 2–3 veins. Iron breaks in 3 hits (2–3 ore), white iron · starsilver · cor lapis · noctilucous jade in 4
 *    (1–2), crystal in 5 (1). Taps come at least 80 ms apart.
 *  - 사냥 20 s: 2–3 animals cross from an edge in 5–8 s (2–3 meat or fowl each). A tap within 9 % of one catches it.
 *  Ending early is fine. Nothing collected: no daily try, no game time, no encounter. Otherwise one try, 10 game minutes
 *  and, for gathering and hunting, the usual 5 % encounter (runtime_life.js).
 *  The ore domain is gone, so the mines are where ore comes from: Mond 50 iron / 35 white iron / 15 crystal; the
 *  starsilver mines 30 starsilver / 30 iron / 25 white iron / 15 crystal; Liyue keeps its own pools.
 *  Jobs saved before 0.16.2 (no scene, or the 0.15.22 `minigame`) finish by their own rules. Fishing is unchanged.
 *  Loads after runtime_life_v01522.js. Only integer arithmetic and + − × ÷ decide anything, so every engine agrees. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,copy=x=>JSON.parse(JSON.stringify(x));
const old=Object.fromEntries(['startLife','lifePool','lifeJobDuration','lifeEntries','validateSave'].map(k=>[k,P[k]]));
const fail=(code,message)=>{throw new api.RuleError(code,message);};
const LIMIT={GATHER:25000,MINE:30000,HUNT:20000},MAX_INPUTS=80,MINE_GAP=80,REACH=9;
const MOND_MINE=[['ORE_IRON',50],['ORE_WHITE_IRON',35],['ORE_CRYSTAL',15]];
const STARSILVER_MINE=[['ORE_STARSILVER',30],['ORE_IRON',30],['ORE_WHITE_IRON',25],['ORE_CRYSTAL',15]];
// Hits to break a vein and ore per vein; any other vein takes 4 hits and gives 1–2.
const HITS={ORE_IRON:3,ORE_CRYSTAL:5},ORE_N={ORE_IRON:[2,3],ORE_WHITE_IRON:[1,2],ORE_CRYSTAL:[1,1]};

// ---------- the scene, from the seed ----------
// mulberry32: 32-bit integer steps, exact on every JavaScript engine.
function stream(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
const int=(u,a,b)=>a+Math.floor(u*(b-a+1));
const tenth=v=>Math.round(v*10)/10;
function pick(pool,u){const total=pool.reduce((n,x)=>n+x.weight,0);let r=u*total;for(const x of pool){r-=x.weight;if(r<0)return x;}return pool[pool.length-1];}
// Spots inside x 8–92 %, y 30–85 %, never on top of each other (a fixed row if the draws keep colliding).
function spots(next,count){
 const out=[];
 for(let i=0;i<count;i++){
  let spot=null;for(let k=0;k<40&&!spot;k++){const x=tenth(8+next()*84),y=tenth(30+next()*55);if(out.every(s=>Math.abs(s.x-x)>=15||Math.abs(s.y-y)>=18))spot={x,y};}
  if(!spot)return Array.from({length:count},(_,j)=>({x:12+j*18,y:j%2?72:48}));
  out.push(spot);
 }
 return out;
}
function generate(job,pool){
 const kind=job.kind,nodes=[];
 if(!LIMIT[kind]||!job.scene||!pool.length)return {kind,limit:LIMIT[kind]||0,nodes};
 const next=stream(job.scene.seed);
 if(kind==='HUNT'){
  // Staggered: the i-th animal sets off in its own slice of 0.5–9 s, so they come one after another.
  const count=int(next(),2,3),span=8500/count;
  for(let i=0;i<count;i++){
   const item=pick(pool,next()).item,from=next()<.5?'L':'R',y0=tenth(35+next()*45),y1=tenth(Math.max(35,Math.min(80,y0-10+next()*20)));
   const start=Math.round(500+i*span+next()*span*.6),duration=Math.round(5000+next()*3000);
   nodes.push({i,item,n:int(next(),2,3),from,y0,y1,start,duration});
  }
 }else{
  const count=kind==='GATHER'?int(next(),4,5):int(next(),2,3),items=[];
  for(let i=0;i<count;i++)items.push(pick(pool,next()).item);
  const at=spots(next,count);
  items.forEach((item,i)=>{
   const node={i,item,x:at[i].x,y:at[i].y};
   if(kind==='GATHER')node.n=int(next(),1,2);
   else{const [a,b]=ORE_N[item]||[1,2];node.n=int(next(),a,b);node.hits=HITS[item]||4;}
   nodes.push(node);
  });
 }
 return {kind,limit:LIMIT[kind],nodes};
}
// Where an animal is at a moment of the scene (null before it sets off and after it has gone).
function animalAt(a,t){
 if(!(t>=a.start&&t<=a.start+a.duration))return null;
 const p=(t-a.start)/a.duration;return {x:a.from==='L'?-4+108*p:104-108*p,y:a.y0+(a.y1-a.y0)*p,p};
}
// The animal a tap at (x, y) catches at time t: the nearest uncaught one within reach, else -1.
function huntTarget(scene,caught,x,y,t){
 let best=-1,near=REACH*REACH;
 for(const a of scene.nodes){if(caught.has(a.i))continue;const at=animalAt(a,t);if(!at)continue;const dx=at.x-x,dy=at.y-y,d=dx*dx+dy*dy;if(d<=near&&(best<0||d<near)){best=a.i;near=d;}}
 return best;
}
// A tap log is {at, node, x?, y?}: whole milliseconds in order, inside the time that was played.
function check(scene,inputs,elapsed){
 if(!Number.isSafeInteger(elapsed)||elapsed<0||elapsed>scene.limit)fail('LIFE_INPUT','작업 시간 기록을 확인해 주세요.');
 if(!Array.isArray(inputs)||inputs.length>MAX_INPUTS)fail('LIFE_INPUT','작업 입력 기록을 확인해 주세요.');
 const hunt=scene.kind==='HUNT',count=scene.nodes.length;let prev=-1;
 for(const c of inputs){
  if(!c||typeof c!=='object'||Array.isArray(c)||!Number.isSafeInteger(c.at)||c.at<0||c.at<prev||c.at>elapsed||!Number.isInteger(c.node)||c.node<(hunt?-1:0)||c.node>=count)fail('LIFE_INPUT','작업 입력 순서가 올바르지 않습니다.');
  for(const k of ['x','y'])if(c[k]!==undefined&&!(typeof c[k]==='number'&&c[k]>=0&&c[k]<=100))fail('LIFE_INPUT','누른 위치가 화면 밖입니다.');
  if(hunt&&(c.x===undefined||c.y===undefined))fail('LIFE_INPUT','누른 위치가 없습니다.');
  if(scene.kind==='MINE'&&prev>=0&&c.at-prev<MINE_GAP)fail('LIFE_INPUT','광맥을 너무 빠르게 두드렸습니다.');
  prev=c.at;
 }
}
// What a (checked) tap log collects, in the order things were collected.
function resolve(scene,inputs){
 const taps=scene.nodes.map(()=>0),done=new Set(),collected=[];
 for(const c of inputs){
  if(scene.kind==='HUNT'){const i=huntTarget(scene,done,c.x,c.y,c.at);if(i>=0){done.add(i);collected.push(i);}continue;}
  if(done.has(c.node))continue;taps[c.node]++;
  if(scene.kind==='GATHER'||taps[c.node]>=scene.nodes[c.node].hits){done.add(c.node);collected.push(c.node);}
 }
 const items={};for(const i of collected){const n=scene.nodes[i];items[n.item]=(items[n.item]||0)+n.n;}
 return {taps,collected,items};
}

// ---------- the rules ----------
P.lifeScene=function(job=this.s.lifeJob){return job?.scene?generate(job,this.lifePool(job.kind,job.map)):null;};
P.lifePool=function(kind,map=this.s.global.CURRENT_MAP_ID){
 const pool=old.lifePool.call(this,kind,map);
 if(kind!=='MINE'||!pool.length||this.tables['32_MAP_DB'].get(map)?.[1]!=='몬드')return pool;
 // runtime_life.js gives the Dragonspine mines starsilver; those stay the starsilver mines.
 return (pool.some(x=>x.item==='ORE_STARSILVER')?STARSILVER_MINE:MOND_MINE).filter(([id])=>this.tables['14_ITEM_DB'].has(id)).map(([item,weight])=>({item,min:1,max:1,weight}));
};
// A job saved before 0.16.2 keeps the length it was started with (runtime_adventure.js checks it with the job).
P.lifeJobDuration=function(kind,job){return LIMIT[kind]&&(!job||job.scene)?LIMIT[kind]:old.lifeJobDuration.call(this,kind);};
P.lifeEntries=function(){return old.lifeEntries.call(this).map(e=>LIMIT[e.kind]?{...e,seconds:LIMIT[e.kind]/1000,interactive:true}:e);};
P.startLife=function(kind){
 old.startLife.call(this,kind);const job=this.s.lifeJob;
 if(LIMIT[kind])Object.assign(job,{duration:LIMIT[kind],scene:{version:1,seed:Math.floor(this.random()*0x100000000)}});
 return copy(job);
};
// Called by runtime_life.js finishLife (so the Liyue companions' extra ore and herbs still apply on top).
P.finishLifeScene=function(job,a={}){
 const scene=this.lifeScene(job);check(scene,a.inputs,a.elapsed);
 if(a.elapsed>Date.now()-job.startedAt+100)fail('LIFE_WAIT','작업 시간이 아직 지나지 않았습니다.');
 const out=resolve(scene,a.inputs);
 if(!out.collected.length){delete this.s.lifeJob;this.s.global.SCREEN_MODE='LOCATION';return {job:job.id,kind:job.kind,items:{},minutes:0,caught:false,collected:[],empty:true,encounter:null};}
 for(const [item,n]of Object.entries(out.items))this.giveItem(item,n);
 this.spendLifeResource(job);delete this.s.lifeJob;this.advanceTime(10);this.s.global.SCREEN_MODE='LOCATION';
 return {job:job.id,kind:job.kind,items:out.items,minutes:10,caught:true,collected:out.collected,encounter:this.lifeEncounter(job)};
};
P.validateSave=function(s){
 old.validateSave.call(this,s);const j=s.lifeJob;
 if(j&&j.scene!==undefined){const sc=j.scene;if(!LIMIT[j.kind]||j.minigame!==undefined||j.fishing!==undefined||!sc||typeof sc!=='object'||Array.isArray(sc)||Object.keys(sc).length!==2||sc.version!==1||!Number.isInteger(sc.seed)||sc.seed<0||sc.seed>0xffffffff||j.duration!==LIMIT[j.kind])fail('LIFE_SAVE','진행 중인 생활 작업을 확인할 수 없습니다.');}
 return s;
};
api.lifeScene={version:1,limits:copy(LIMIT),maxInputs:MAX_INPUTS,mineGap:MINE_GAP,reach:REACH,generate,animalAt,huntTarget,check,resolve};
})(globalThis);
