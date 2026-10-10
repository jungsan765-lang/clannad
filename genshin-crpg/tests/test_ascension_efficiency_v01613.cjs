'use strict';
const assert=require('node:assert/strict');
const {R,db,c}=require('./helpers_v011.cjs');
const {setup,api,G}=require('../tools/audit_balance_v01522.cjs');
const {measure,policy,REFERENCE_TEAM}=require('../tools/audit_balance_v0161.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
// Fixed approved 0.16.21 common-unit quantities, independent of the runtime API.
const EXPECTED=Object.fromEntries(['NEUTRAL','PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO'].map(element=>[element,{5:1,10:2,15:3,20:4,25:6,30:8,35:20,40:35,45:80,50:180,55:600,60:1500}]));
const ELEMENTS=['NEUTRAL','PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO'];
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
function restore(r){return new R(db,copy(r.s));}
function fixture(map='MAP_D163_LIANSHAN_FORMULA',route='ROUTE_TRAVELER'){
 const r=setup({level:60,map,route,team:REFERENCE_TEAM,gear:'craft',enhance:6,talent:'mid'});
 Object.assign(r.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});
 return r;
}
function settle(r,win=true){if(win)for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;return r.finishBattle(win);}
function replayAction(r,type,args){const g=r.s.global,a={id:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1),revision:g.SAVE_REVISION,type,...args};const out=r.transact(a),saved=r.serialize();assert.deepEqual(copy(r.transact(a)),copy(out));assert.equal(r.serialize(),saved);return out;}

check('all twelve stages preview the same eight existing gem types with unchanged first-three shared bonus',()=>{
 assert.deepEqual(copy(G.domainAscensionGems),EXPECTED);assert.equal(G.ascensionRewardVersion,3);
 const r=fixture(),day=G.dayOf(c.Date.now());let stages=0;
 for(const s of r.growthDomainSites().filter(s=>s.kind==='ASCENSION'))for(const d of r.growthDomainEntries(s.map)){
  stages++;for(const element of ELEMENTS){const item='GROWTH_GEM_'+element;
   r.s.domainDaily={day,wins:3};const normal=r.growthDomainRewards(d,element,day);
   assert.deepEqual(copy(normal.items),{[item]:EXPECTED[element][d.level]});assert.equal(normal.mora,0);assert.equal(normal.xp,G.domainMaterialXp[d.level]);assert.equal(normal.bonus,false);
   for(const wins of [0,1,2]){r.s.domainDaily.wins=wins;const doubled=r.growthDomainRewards(d,element,day);assert.equal(doubled.items[item],2*EXPECTED[element][d.level]);assert.equal(doubled.remaining,3-wins);assert.equal(doubled.bonus,true);}
   r.s.domainDaily={day:day-1,wins:100};assert.equal(r.growthDomainRewards(d,element,day).items[item],2*EXPECTED[element][d.level]);
  }
 }
 assert.equal(stages,12);
});

check('new high-stage battle markers survive reload, entry retries and settlement retries without duplicate gems',()=>{
 for(const [level,element]of [[55,'PYRO'],[60,'HYDRO']]){
  let r=fixture();const item='GROWTH_GEM_'+element,day=G.dayOf(c.Date.now());r.s.domainDaily={day,wins:3};
  const count=r.itemCount(item),mora=r.s.global.MORA;
  replayAction(r,'DOMAIN_START',{domain:'LIANSHAN_FORMULA:'+level,element});
  assert.equal(r.s.runtime.growthDomain.ascensionRewardVersion,3);
  const actors=copy(r.s.runtime.actors);r=restore(r);assert.deepEqual(copy(r.s.runtime.actors),actors);assert.equal(r.s.runtime.growthDomain.ascensionRewardVersion,3);
  const out=settle(r);assert.deepEqual(copy(out.domain.items),{[item]:EXPECTED[element][level]});assert.equal(r.itemCount(item)-count,EXPECTED[element][level]);assert.equal(r.s.global.MORA,mora);assert.equal(out.xp,G.domainMaterialXp[level]);assert.equal(r.s.domainDaily.wins,4);
  const saved=r.serialize();assert.equal(r.finishBattle(true),undefined);assert.equal(r.serialize(),saved);r=restore(r);assert.equal(r.itemCount(item)-count,EXPECTED[element][level]);assert.equal(r.serialize(),saved);
 }
});

check('pre-0.16.13 in-flight version-four fights retain their own old rewards across repeated reloads',()=>{
 for(const level of [55,60])for(const wins of [0,3]){
  let r=fixture();const day=G.dayOf(c.Date.now());r.s.domainDaily={day,wins};r.action('DOMAIN_START',{domain:'LIANSHAN_FORMULA:'+level,element:'PYRO'});
  const s=copy(r.s);delete s.runtime.growthDomain.ascensionRewardVersion;const actors=copy(s.runtime.actors),items=copy(s.inventory),levels=copy(s.ascensions),money=s.global.MORA;
  r=new R(db,s);assert.equal(r.s.runtime.growthDomain.ascensionRewardVersion,0);assert.deepEqual(copy(r.s.runtime.actors),actors);assert.deepEqual(copy(r.s.inventory),items);assert.deepEqual(copy(r.s.ascensions),levels);assert.equal(r.s.global.MORA,money);
  r=restore(r);assert.equal(r.s.runtime.growthDomain.ascensionRewardVersion,0);const out=settle(r);assert.equal(out.domain.items.GROWTH_GEM_PYRO,Math.ceil(level/5)*(wins<3?2:1));assert.equal(out.xp,G.domainMaterialXp[level]);assert.equal(out.mora||0,0);r=restore(r);
  r.s.global.CURRENT_MAP_ID='MAP_D163_LIANSHAN_FORMULA';r.s.global.SCREEN_MODE='LOCATION';r.action('DOMAIN_START',{domain:'LIANSHAN_FORMULA:'+level,element:'PYRO'});assert.equal(r.s.runtime.growthDomain.ascensionRewardVersion,3);assert.equal(settle(r).domain.items.GROWTH_GEM_PYRO,EXPECTED.PYRO[level]*(wins+1<3?2:1));
 }
});

check('malformed reward markers are rejected and a marker cannot change talent or legacy domain rewards',()=>{
 const r=fixture();r.action('DOMAIN_START',{domain:'LIANSHAN_FORMULA:60',element:'PYRO'});
 for(const marker of [-1,4,.5,'3',true,null,{},[]]){const s=copy(r.s);s.runtime.growthDomain.ascensionRewardVersion=marker;assert.throws(()=>new R(db,s),/돌파 비경 보상 저장값/);}
 const t=fixture('MAP_D163_TAISHAN_MANSION');t.action('DOMAIN_START',{domain:'TAISHAN_MANSION:60'});const ts=copy(t.s);ts.runtime.growthDomain.ascensionRewardVersion=1;assert.throws(()=>new R(db,ts),/돌파 비경 보상 저장값/);
 const legacy={...copy(G.legacyTrialSites.LIANSHAN_FORMULA),key:'LIANSHAN_FORMULA',id:'LIANSHAN_FORMULA:ASCENSION',kind:'ASCENSION',version:3};
 const day=G.dayOf(c.Date.now());r.s.domainDaily={day,wins:3};assert.equal(r.growthDomainRewards(legacy,'PYRO',day).items.GROWTH_GEM_PYRO,8);
});

check('talent and ascension still share three bonuses; EXP and defeats consume none and domains pay no books or Mora',()=>{
 let r=fixture();const day=G.dayOf(c.Date.now());r.s.domainDaily={day,wins:0};
 const cases=[['MAP_D163_TAISHAN_MANSION','TAISHAN_MANSION:60','NEUTRAL',160,1],['MAP_D163_MIDSUMMER_COURTYARD','MIDSUMMER_COURTYARD:5','NEUTRAL',0,1],['MAP_D163_LIANSHAN_FORMULA','LIANSHAN_FORMULA:60','PYRO',3000,2],['MAP_D163_LIANSHAN_FORMULA','LIANSHAN_FORMULA:55','PYRO',1200,3],['MAP_D163_LIANSHAN_FORMULA','LIANSHAN_FORMULA:60','PYRO',1500,4]];
 for(const [map,domain,element,expected,wins]of cases){r.s.global.CURRENT_MAP_ID=map;r.s.global.SCREEN_MODE='LOCATION';r.action('DOMAIN_START',{domain,element});r=restore(r);const out=settle(r);assert.equal(Object.values(out.domain.items).reduce((a,b)=>a+b,0),expected);assert.equal(r.s.domainDaily.wins,wins);assert.equal(out.mora||0,0);for(const item of Object.keys(out.domain.items))assert(!item.startsWith('MAT_CHAR_EXP_'));}
 r.s.global.CURRENT_MAP_ID='MAP_D163_LIANSHAN_FORMULA';r.s.global.SCREEN_MODE='LOCATION';r.action('DOMAIN_START',{domain:'LIANSHAN_FORMULA:60',element:'PYRO'});const count=r.itemCount('GROWTH_GEM_PYRO');settle(r,false);assert.equal(r.s.domainDaily.wins,4);assert.equal(r.itemCount('GROWTH_GEM_PYRO'),count);
});

check('native four-person battles on both protagonist routes award the preview amount without enemy edits or forced victories',()=>{
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
  let r=fixture('MAP_D163_LIANSHAN_FORMULA',route);r.s.global.PRNG_STATE=717;r.s.domainDaily={day:G.dayOf(c.Date.now()),wins:3};
  const d=r.growthDomainEntries().find(x=>x.level===60),preview=r.growthDomainRewards(d,'PYRO'),count=r.itemCount('GROWTH_GEM_PYRO');r.action('DOMAIN_START',{domain:d.id,element:'PYRO'});assert.equal(r.s.runtime.actors.filter(a=>a.side==='ALLY').length,4);r=restore(r);const out=policy(r);assert.equal(out.victory,true);assert.equal(r.s.runtime,null);assert.deepEqual(copy(out.domain.items),copy(preview.items));assert.equal(r.itemCount('GROWTH_GEM_PYRO')-count,EXPECTED.PYRO[60]);r=restore(r);assert.equal(r.itemCount('GROWTH_GEM_PYRO')-count,EXPECTED.PYRO[60]);
 }
});

// Optional extended native audit: 12 tiers x 8 gem types x 2 routes on one seed,
// then the 50/55/60 comparison on three seeds. Timing is a declared player-time model,
// not CPU time: actual shipped 2x-speed action frames / 1000 ms + 3 s/input + 6 s/receipt and re-entry.
if(process.argv.includes('--audit')){
 const fs=require('node:fs'),samples=[],seeds=[717,4242,9031];
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI'])for(const element of ELEMENTS){
  for(const site of Object.values(G.domains).filter(s=>s.kind==='ASCENSION'))for(const level of site.levels){const key=Object.entries(G.domains).find(([,s])=>s===site)?.[0];for(const seed of level>=50?seeds:[717]){
   const x=measure({domain:key+':'+level,level:60,element,route,seed});assert.equal(x.result.victory,true);assert.equal(x.result.domain.items['GROWTH_GEM_'+element],EXPECTED[element][level]);const seconds=x.presentationMs/1000+3*x.playerInputs+6;samples.push({route,element,level,seed,rounds:x.result.rounds,playerInputs:x.playerInputs,presentationMs:x.presentationMs,seconds,beforePerMinute:Math.ceil(level/5)*60/seconds,afterPerMinute:EXPECTED[element][level]*60/seconds});
  }}
  console.log(JSON.stringify({route,element,samples:samples.filter(x=>x.route===route&&x.element===element).length}));
 }
 const report={schema:1,assumptions:{party:['PLAYER_CUSTOM',...REFERENCE_TEAM],partyLevel:60,craftedGearEnhancement:6,talents:'65% of unlocked cap',fullHpAtEntry:true,storyGatesOpen:true,displaySpeed:2,inputSeconds:3,reentrySeconds:6,excluded:['travel','healing','material/gear gathering','story']},rewards:EXPECTED,samples};
 fs.writeFileSync(process.env.CRPG_ASCENSION_AUDIT_OUT||'/tmp/ascension-efficiency-v01613.json',JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify({checks,ok:true}));
