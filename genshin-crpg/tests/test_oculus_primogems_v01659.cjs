'use strict';
// 0.16.59 (user, 2026-10-17: 「저번에 원석 3배라고 했던거, 다른부분에서는 오르지 않았더라. 신의 눈동자같은거말이야 그것도 충분히 캘 수
// 있게 하자」): a found oculus pays like a plain chest of its region, every offering pays three times its 0.14.15 amount, and an old
// save is paid what it is owed once (runtime_reading.js, the end).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fresh,R:Runtime,db,c}=require('./helpers_v011.cjs'),API=c.CRPGRuntime;
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
const gems=g=>Number(g.s.global.PRIMOGEM)||0,plain=x=>JSON.parse(JSON.stringify(x));// the runtime lives in its own realm
check('each oculus found pays 몬드 60 · 리월 75 once, and the reward window shows it',()=>{
 const g=fresh();g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'level',value:60});const api=API.oculusPrimogems;
 assert.deepEqual(plain(api.find),{MOND:60,LIYUE:75});
 let mond=0,geo=0;
 for(const p of g.resonanceLeft()){g.action('OPERATOR_DEBUG',{op:'travel',map:p.map});const before=gems(g),out=g.action('OCULUS_RESONANCE',{point:p.id});
  assert.equal(gems(g)-before,p.geo?75:60,p.id);if(p.geo)geo++;else mond++;assert.equal((out?.result??out)?.oculusPrimogem,p.geo?75:60,'the result says what it paid');}
 assert(mond>=5&&geo>=5,'oculi of both regions '+mond+'/'+geo);
 assert.deepEqual(plain(g.s.oculusPrimogems.found),{MOND:mond,LIYUE:geo});
 // another action, another load: nothing more
 const now=gems(g);g.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_PLAINS'});assert.equal(gems(g),now);const again=new Runtime(db,JSON.parse(JSON.stringify(g.s)));assert.equal(gems(again),now);
 // a broken ledger is refused
 const bad=JSON.parse(JSON.stringify(g.s));bad.oculusPrimogems.found.MOND=mond+1;assert.throws(()=>new Runtime(db,bad),/신의 눈동자 원석 기록/);
});
check('a save from before this version is paid once for the oculi it already had',()=>{
 const g=fresh();g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'level',value:60});let owed=0;
 for(const p of g.resonanceLeft().slice(0,6)){g.action('OPERATOR_DEBUG',{op:'travel',map:p.map});g.action('OCULUS_RESONANCE',{point:p.id});owed+=p.geo?75:60;}
 const old=JSON.parse(JSON.stringify(g.s));delete old.oculusPrimogems;old.global.PRIMOGEM-=owed;const start=old.global.PRIMOGEM;
 const loaded=new Runtime(db,old);assert.equal(gems(loaded)-start,owed);const twice=new Runtime(db,JSON.parse(JSON.stringify(loaded.s)));assert.equal(gems(twice),gems(loaded));
});
check('offerings pay three times their 0.14.15 amount (the offering module pays the first third), shown so before they are made',()=>{
 const R=API;assert.deepEqual(plain(R.oculusPrimogems.offer),{TIER_1:30,TIER_2:60,TIER_FINAL:90,GEO_TIER_1:60,GEO_TIER_2:90,GEO_TIER_FINAL:120});
 for(const [id,n] of Object.entries(R.oculusPrimogems.offer))assert.equal(n,R.offeringPrimogems[id]*3,id);
 const g=fresh();g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'level',value:60});
 for(const p of g.resonanceLeft()){g.action('OPERATOR_DEBUG',{op:'travel',map:p.map});g.action('OCULUS_RESONANCE',{point:p.id});}
 g.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_WINDRISE'});const entry=g.oculusExchangeEntry();assert(entry&&!entry.reason,'the first Mond offering can be made');{assert.equal(entry.reward.primogem,R.oculusPrimogems.offer[entry.id]);const before=gems(g),out=g.action('OCULUS_OFFER',{tier:entry.id});assert.equal(gems(g)-before,R.oculusPrimogems.offer[entry.id]);assert.equal((out?.result??out)?.primogem,R.oculusPrimogems.offer[entry.id]);}
 const geo=g.geoExchangeEntry?.();if(geo)assert.equal(geo.reward.primogem,R.oculusPrimogems.offer[geo.id]);
});
check('an oculus found at the end of a puzzle job opens the reward window',()=>{
 const s=fs.readFileSync(path.join(__dirname,'../source/app_adventure.js'),'utf8');
 assert.match(s,/&&!\(\['WORLD_WORK_START','WORLD_WORK_FINISH'\]\.includes\(type\)&&lastResult\?\.result\?\.point&&lastResult\.result\.items\)\)return null;/);
});
console.log(JSON.stringify({passed,ok:!process.exitCode}));
