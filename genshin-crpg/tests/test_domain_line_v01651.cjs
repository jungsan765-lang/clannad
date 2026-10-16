'use strict';
// 0.16.51 비경 단계 난이도와 보상 (user, 2026-10-16: 「비경 도는것에 대해 좀 밸런스를 맞춰보는게 좋아보여. 저레벨부터 고레벨까지 전체적으로
// 훑어보고 적당한 선을 지정하고 그게 이 보상에 맞는 수준이 맞는지까지」). The line and the measurements are in docs/PATCH_0.16.51_KO.md.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict'),H=require('../tools/audit_protagonist_v01618.cjs');
const ROOT=path.resolve(__dirname,'..'),env=H.load(ROOT),api=env.api,G=api.growthV01522,T=api.domainTuneV01651;
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const plain=x=>JSON.parse(JSON.stringify(x)),S=r=>r.s.runtime;
// The same engine without the 0.16.51 stage table, to compare the very same fight.
function untuned(){
 const c=vm.createContext({console,Date,setTimeout,clearTimeout}),index=fs.readFileSync(path.join(ROOT,'source/index.html'),'utf8');
 for(const [,f] of index.matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)){let text=fs.readFileSync(path.join(ROOT,'source',f),'utf8');if(f==='runtime_reading.js'){const at=text.indexOf('/* 0.16.51 비경 단계 난이도');assert(at>0);text=text.slice(0,at);}vm.runInContext(text,c,{filename:f});}
 vm.runInContext(fs.readFileSync(path.join(ROOT,'source/presentation.js'),'utf8'),c);return {...env,c,R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime};
}
const plainEnv=untuned();
const start=(e,id,level,team,seed=717)=>{const s=G.domains[id.split(':')[0]],r=H.setup(e,{level,team:H.TEAMS[team],seed,map:s.map,route:'ROUTE_TRAVELER',enhance:level<10?0:level<30?3:level<45?6:9});r.die=()=>50;r.random=()=>.5;r.action('DOMAIN_START',{domain:id,element:'NEUTRAL'});return r;};
const foes=r=>S(r).actors.filter(a=>a.side==='ENEMY').map(a=>[a.source,a.maxHp,a.atk,a.def]);

check('the stage table: too easy stages get stronger enemies, too hard ones weaker, and nothing else changes',()=>{
 assert.deepEqual(plain(Object.keys(T.stages).sort()),['FORSAKEN_RIFT:20','FORSAKEN_RIFT:25','LIANSHAN_FORMULA:30','LIANSHAN_FORMULA:35','LIANSHAN_FORMULA:40','LIANSHAN_FORMULA:45','LIANSHAN_FORMULA:50','LOST_VALLEY:60','PEAK_OF_VINDAGNYR:20','RIDGE_WATCH:30','TAISHAN_MANSION:30','TAISHAN_MANSION:35','TAISHAN_MANSION:60','VALLEY_OF_REMEMBRANCE:15']);
 for(const [id,[hp,atk]] of Object.entries(T.stages)){const level=Number(id.split(':')[1]),a=start(env,id,level,'story4'),b=start(plainEnv,id,level,'story4');
  const fa=foes(a),fb=foes(b);assert.equal(fa.length,fb.length,id);
  fa.forEach((x,i)=>{const y=fb[i];assert.equal(x[0],y[0]);assert.equal(x[1],Math.max(1,Math.round(y[1]*hp)),id+' HP');assert.equal(x[2],Math.max(1,Math.round(y[2]*atk)),id+' ATK');assert.equal(x[3],y[3],id+' DEF stays');});
  assert.equal(a.s.global.PRNG_STATE,b.s.global.PRNG_STATE,'the same draws');}
 // A stage outside the table is the very same fight.
 for(const id of ['ZHOU_FORMULA:40','TAISHAN_MANSION:50','CECILIA_GARDEN:25'])assert.deepEqual(plain(foes(start(env,id,Number(id.split(':')[1]),'story4'))),plain(foes(start(plainEnv,id,Number(id.split(':')[1]),'story4'))),id);
});

check('a saved domain fight keeps its enemies when loaded (the table is used once, when the fight starts)',()=>{
 const r=start(env,'LIANSHAN_FORMULA:40',40,'support4'),save=JSON.parse(r.serialize()),loaded=new api.Runtime(env.db,plain(save));
 assert.deepEqual(plain(foes(loaded)),plain(foes(r)));assert.deepEqual(plain(loaded.s.runtime),plain(save.runtime));
});

check('the line holds on a few measured fights: 4★ parties win the stages that beat them, and the easy ones cost real HP',()=>{
 const run=(id,level,team,seed)=>{const r=start(env,id,level,team,seed),before=H.hp(r),res=H.play(r),after=H.hp(r),f=x=>x.reduce((a,b)=>a+b.hp,0)/x.reduce((a,b)=>a+b.maxHp,0);return {win:!!res.victory,loss:f(before)-f(after)};};
 for(const [id,level,team] of [['FORSAKEN_RIFT:20',20,'story4'],['PEAK_OF_VINDAGNYR:20',20,'support4'],['LOST_VALLEY:60',60,'freeze4']])assert(run(id,level,team,717).win,id+' '+team+' wins');
 for(const [id,level] of [['LIANSHAN_FORMULA:35',35],['TAISHAN_MANSION:30',30]]){const x=run(id,level,'story4',717);assert(x.win);assert(x.loss>=.15,id+' costs '+Math.round(x.loss*100)+'%');}
});

check('rewards: the Lv35–55 EXP stages and the Lv35–55 Liyue talent stages pay more; Lv60 and the gems stay',()=>{
 assert.deepEqual(plain(G.domainXp),{5:200,10:450,15:1000,20:1100,25:1250,30:1500,35:7000,40:8500,45:10500,50:11000,55:14000,60:24000});
 assert.deepEqual(plain(G.domainTalentBooks.LIYUE),{30:3,35:5,40:9,45:12,50:25,55:38,60:90});assert.deepEqual(plain(G.domainTalentBooks.MOND),{5:1,10:2,15:10,20:20,25:32});
 assert.equal(G.domainAscensionGems.NEUTRAL[60],5400);
 const r=start(env,'ZHOU_FORMULA:35',35,'story4');assert.equal(r.mondRewardPlan(S(r)).xp,7000);
 const t=H.setup(env,{level:45,team:[],map:G.domains.TAISHAN_MANSION.map});const e=t.growthDomainEntries().find(x=>x.id==='TAISHAN_MANSION:45');
 // 0.16.56 (user: 「돌파재료같은거 … 원작 고증 살려서 … 비경 보상에 넣자」): a new run pays the original's tiered books of the kind picked (the region's
 // first, 「번영」, when none is) and gems by tier; the 0.16.51 tables above still pay a fight begun before (reward version 4).
 assert.equal(e.talentRewardVersion,5);assert.deepEqual(plain(e.books),['PROSPERITY','DILIGENCE','GOLD']);
 assert.deepEqual(plain(t.growthDomainRewards(e,'NEUTRAL').items),{GROWTH_BOOK_PROSPERITY_1:1,GROWTH_BOOK_PROSPERITY_2:1});assert.deepEqual(plain(t.growthDomainRewards({...e,book:'GOLD'},'NEUTRAL').items),{GROWTH_BOOK_GOLD_1:1,GROWTH_BOOK_GOLD_2:1});
 assert.deepEqual(plain(t.growthDomainRewards({...e,talentRewardVersion:4},'NEUTRAL').items),{GROWTH_TALENT_LIYUE:12},'an old saved fight keeps the 0.16.51 pay');
 assert.deepEqual(plain(G.bookDrops),{MOND:{5:{1:1},10:{1:2},15:{1:3,2:1},20:{1:2,2:3},25:{1:1,2:3,3:1}},LIYUE:{30:{1:1},35:{1:2},40:{1:3},45:{1:1,2:1},50:{1:1,2:2},55:{1:2,2:3},60:{2:2,3:2}}});
 assert.deepEqual(plain(G.gemDrops),{5:{1:1},10:{1:2},15:{1:3},20:{1:1,2:1},25:{1:2,2:1},30:{1:2,2:1},35:{1:1,2:2},40:{1:2,2:2},45:{3:1},50:{1:1,2:1,3:1},55:{1:1,2:1,3:2},60:{4:1}});
 // Every higher stage still pays more per run than every lower one of its kind (the new books counted in the lowest tier: 1, 3, 9).
 const worth=table=>Object.fromEntries(Object.entries(table).map(([l,d])=>[l,Object.entries(d).reduce((a,[t,n])=>a+n*3**(t-1),0)]));
 assert.deepEqual(worth(G.bookDrops.LIYUE),{30:1,35:2,40:3,45:4,50:7,55:11,60:24});assert.deepEqual(worth(G.bookDrops.MOND),{5:1,10:2,15:6,20:11,25:19});
 for(const table of [G.domainXp,G.domainTalentBooks.LIYUE,worth(G.bookDrops.LIYUE),worth(G.bookDrops.MOND)]){const v=Object.entries(table).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);for(let i=1;i<v.length;i++)assert(v[i]>v[i-1]);}
});

console.log(passed+' passed');
