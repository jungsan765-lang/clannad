'use strict';
// 0.16.59 (user, 2026-10-17: 「… 신의 눈동자같은거말이야 그것도 충분히 캘 수 있게 하자」) and 0.16.65 (user, 2026-10-18: 「왜 눈동자를
// 먹을때 원석이 나오는겨? … 원석은 공양 할때만 받는거야」): finding an oculus pays no 원석; the offerings carry the whole amount
// (몬드 150 · 300 · 450, 리월 370 · 460 · 640), and a save paid for found oculi under 0.16.59 is not paid twice (runtime_reading.js).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fresh,R:Runtime,db,c}=require('./helpers_v011.cjs'),API=c.CRPGRuntime;
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
const gems=g=>Number(g.s.global.PRIMOGEM)||0,plain=x=>JSON.parse(JSON.stringify(x));// the runtime lives in its own realm
check('finding an oculus pays no 원석 (as in the original), and the result says none',()=>{
 const g=fresh();g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'level',value:60});assert.deepEqual(plain(API.oculusPrimogems.find),{MOND:0,LIYUE:0});
 let mond=0,geo=0;
 for(const p of g.resonanceLeft()){g.action('OPERATOR_DEBUG',{op:'travel',map:p.map});const before=gems(g),out=g.action('OCULUS_RESONANCE',{point:p.id});
  assert.equal(gems(g)-before,0,p.id);assert.equal((out?.result??out)?.oculusPrimogem,undefined);if(p.geo)geo++;else mond++;}
 assert(mond>=5&&geo>=5,'oculi of both regions '+mond+'/'+geo);assert.equal(g.s.oculusPrimogems,undefined,'nothing paid, no ledger');
});
check('the offerings carry the whole amount, shown so before they are made, and are paid once',()=>{
 const R=API;assert.deepEqual(plain(R.oculusPrimogems.offer),{TIER_1:150,TIER_2:300,TIER_FINAL:450,GEO_TIER_1:370,GEO_TIER_2:460,GEO_TIER_FINAL:640});
 assert.equal(150+300+450,12*60+180,'몬드: the 0.16.59 total (12 oculi × 60 + 180)');assert.equal(370+460+640,16*75+270,'리월: the 0.16.59 total (16 × 75 + 270)');
 const g=fresh();g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'level',value:60});
 for(const p of g.resonanceLeft()){g.action('OPERATOR_DEBUG',{op:'travel',map:p.map});g.action('OCULUS_RESONANCE',{point:p.id});}
 g.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_WINDRISE'});const entry=g.oculusExchangeEntry();assert(entry&&!entry.reason,'the first Mond offering can be made');
 assert.equal(entry.reward.primogem,R.oculusPrimogems.offer[entry.id]);const before=gems(g),out=g.action('OCULUS_OFFER',{tier:entry.id});
 assert.equal(gems(g)-before,R.oculusPrimogems.offer[entry.id]);assert.equal((out?.result??out)?.primogem,R.oculusPrimogems.offer[entry.id]);
 assert.deepEqual(plain(g.s.oculusPrimogems),{version:2,paid:{MOND:R.oculusPrimogems.offer[entry.id]-(R.offeringPrimogems[entry.id]||0),LIYUE:0}});
 const now=gems(g),again=new Runtime(db,JSON.parse(JSON.stringify(g.s)));assert.equal(gems(again),now,'reloading pays nothing more');
 const bad=JSON.parse(JSON.stringify(g.s));bad.oculusPrimogems.paid.MOND=999999;assert.throws(()=>new Runtime(db,bad),/신의 눈동자 원석 기록/);
 const geo=g.geoExchangeEntry?.();if(geo)assert.equal(geo.reward.primogem,R.oculusPrimogems.offer[geo.id]);
});
check('a save paid for found oculi under 0.16.59 is not paid twice: its offerings pay only what is still owed',()=>{
 const R=API,g=fresh();g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'level',value:60});const mondPoints=g.resonanceLeft().filter(p=>!p.geo);
 for(const p of mondPoints.slice(0,4)){g.action('OPERATOR_DEBUG',{op:'travel',map:p.map});g.action('OCULUS_RESONANCE',{point:p.id});}
 // as 0.16.59 left it: four found oculi paid 60 each
 const old=JSON.parse(JSON.stringify(g.s));old.oculusPrimogems={version:1,found:{MOND:4,LIYUE:0},offer:{}};
 const r=new Runtime(db,old);r.serverAdmin=true;assert.deepEqual(plain(r.s.oculusPrimogems),{version:2,paid:{MOND:240,LIYUE:0}},'the ledger counts the 240 already paid');
 r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_WINDRISE'});const entry=r.oculusExchangeEntry();assert.equal(entry.id,'TIER_1');
 const base=R.offeringPrimogems.TIER_1||0;assert.equal(entry.reward.primogem,base,'the 120 the module would add is already covered by the 240');
 const before=gems(r);r.action('OCULUS_OFFER',{tier:'TIER_1'});assert.equal(gems(r)-before,base);assert.equal(r.s.oculusPrimogems.paid.MOND,240);
});
check('an oculus found at the end of a puzzle job opens the reward window',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../source/app_adventure.js'),'utf8');
 assert.match(s,/&&!\(\['WORLD_WORK_START','WORLD_WORK_FINISH'\]\.includes\(type\)&&lastResult\?\.result\?\.point&&lastResult\.result\.items\)\)return null;/);
});
console.log(JSON.stringify({passed,ok:!process.exitCode}));
