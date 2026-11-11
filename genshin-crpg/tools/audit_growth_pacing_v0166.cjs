'use strict';
// Native fights and native XP/ascension operations. Ownership, story access and equipment are synthetic fixtures.
// Presentation at 2x plus 3 s per input and 6 s re-entry is a model, not measured human play time.
const {measure,REFERENCE_TEAM}=require('./audit_balance_v0161.cjs');
const {setup,G,PLAYER,api}=require('./audit_balance_v01522.cjs');
const fs=require('node:fs'),path=require('node:path');
const SEEDS=[717,4242,9031],ROUTES=['ROUTE_TRAVELER','ROUTE_ISEKAI'];
const ASSUMPTIONS={displaySpeed:2,inputSeconds:3,reentrySeconds:6,party:[PLAYER,...REFERENCE_TEAM],seeds:SEEDS,synthetic:['ownership','story access','legal crafted equipment and talents','full HP at entry','exact ascension materials'],excluded:['travel','recovery','mining','gear and material farming'],fallback:'highest currently open EXP stage with all three seeds victorious'};
function profile(level){return {gear:level<5?'starter':'craft',enhance:level<5?0:level<30?3:level<50?6:10,talent:'mid',team:REFERENCE_TEAM};}
function candidates(level){return Object.entries(G.domains).filter(([,d])=>d.kind==='EXP').flatMap(([key,d])=>d.levels.filter(l=>l<=level+5).map(l=>({id:key+':'+l,level:l}))).sort((a,b)=>b.level-a.level);}
function sampleLevel(level,route){
 const attempts=[];
 for(const domain of candidates(level)){
  const rows=SEEDS.map(seed=>measure({...profile(level),level,route,seed,saveId:'BALANCE-V0166-'+seed,domain:domain.id,earningXp:true}));
  attempts.push({domain:domain.id,rows});
  if(rows.every(x=>x.result.victory))return {level,route,domain:domain.id,experience:rows[0].expectedRewards.xp,cycleSeconds:rows.reduce((n,x)=>n+x.cycleSeconds,0)/rows.length,rows,attempts};
 }
 throw Error('No three-seed winning EXP stage: '+route+' Lv.'+level);
}
function payAscension(r,owner){
 const before=r.growth(owner),quote=r.ascensionInfo(owner);
 if(!before.max||before.final)throw Error('Expected a nonfinal level cap for '+owner);
 r.s.global.MORA+=quote.cost.mora;
 for(const [id,n]of Object.entries(quote.cost.items))r.giveItem(id,n);
 const cashBefore=r.s.global.MORA,itemsBefore=Object.fromEntries(Object.keys(quote.cost.items).map(id=>[id,r.itemCount(id)]));
 r.action('CHAR_ASCEND',{owner});
 const after=r.growth(owner),paid={mora:cashBefore-r.s.global.MORA,items:Object.fromEntries(Object.keys(quote.cost.items).map(id=>[id,itemsBefore[id]-r.itemCount(id)]))};
 if(after.phase!==before.phase+1||JSON.stringify(paid)!==JSON.stringify(quote.cost))throw Error('Native ascension payment mismatch for '+owner);
 return {owner,fromLevel:before.level,fromPhase:before.phase,toPhase:after.phase,nextCap:after.cap,quote:quote.cost,paid};
}
function smoke(){
 const samples=ROUTES.flatMap(route=>[1,20].map(level=>sampleLevel(level,route))),paidCaps=[];
 for(const route of ROUTES){
  const r=setup({level:10,route,team:REFERENCE_TEAM,gear:'none',saveId:'PACING-SMOKE-'+route});
  for(const owner of ASSUMPTIONS.party){
   r.addXp(owner,12345);if(r.growth(owner).xp!==0||r.growth(owner).level!==10)throw Error('Capped overflow must be discarded');
   // Exact quote materials are supplied only in this ascension fixture, then charged by CHAR_ASCEND.
   const paid=payAscension(r,owner);r.addXp(owner,G.xpNext(10)+G.xpNext(11)+17);const after=r.growth(owner);
   if(after.level!==12||after.xp!==17)throw Error('Post-ascension XP carry differs');
   paidCaps.push({route,...paid,levelBefore:10,capBefore:10,phaseBefore:0,xpBefore:0,cost:paid.quote,phaseAfter:after.phase,capAfter:after.cap,levelAfter:after.level,xpAfter:after.xp,afterXp:{level:after.level,xp:after.xp}});
  }
 }
 return {version:require('../package.json').version,mode:'smoke',assumptions:ASSUMPTIONS,rows:samples.flatMap(x=>x.rows),samples:samples.map(({rows,attempts,...x})=>x),paidCaps};
}
function replay(samples,route){
 const byLevel=new Map(samples.filter(x=>x.route===route).map(x=>[x.level,x])),r=setup({level:1,route,team:REFERENCE_TEAM,gear:'none',saveId:'PACING-REPLAY-'+route});
 const boundaries=[10,20,30,40,50,60],bands=[],paidCaps=[];let seconds=0,runs=0,lastSeconds=0,lastRuns=0,from=1,next=0;
 for(let guard=0;r.growth(PLAYER).level<60&&guard<100000;guard++){
  for(const owner of ASSUMPTIONS.party){const g=r.growth(owner);if(g.max&&!g.final)paidCaps.push(payAscension(r,owner));}
  const level=r.growth(PLAYER).level,s=byLevel.get(level);
  if(!s||!s.rows.every(x=>x.result.victory))throw Error('Missing winning native timings at '+route+' Lv.'+level);
  seconds+=s.cycleSeconds;runs++;
  for(const owner of ASSUMPTIONS.party)r.addXp(owner,s.experience);
  const now=r.growth(PLAYER).level;
  while(next<boundaries.length&&now>=boundaries[next]){const to=boundaries[next++];bands.push({from,to,runs:runs-lastRuns,seconds:seconds-lastSeconds});from=to;lastRuns=runs;lastSeconds=seconds;}
 }
 if(r.growth(PLAYER).level!==60)throw Error('Replay failed to reach level 60');
 return {route,bands,totalRuns:runs,totalSeconds:seconds,paidCaps,final:ASSUMPTIONS.party.map(owner=>({owner,...r.growth(owner)}))};
}
function main(){
 const smokeOnly=process.argv.includes('--smoke'),out=process.env.CRPG_PACING_OUT||path.resolve(__dirname,'../evidence/v0166/growth-v0166-current.json');
 fs.mkdirSync(path.dirname(out),{recursive:true});
 if(smokeOnly){const result=smoke();fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({mode:'smoke',samples:result.rows.length,paidCaps:result.paidCaps.length,file:out}));return;}
 const samples=[],result={version:require('../package.json').version,assumptions:ASSUMPTIONS,samples};
 for(const route of ROUTES)for(let level=1;level<60;level++){samples.push(sampleLevel(level,route));fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({route,level,domain:samples.at(-1).domain,seconds:samples.at(-1).cycleSeconds}));}
 result.replays=ROUTES.map(route=>replay(samples,route));result.meanBands=result.replays[0].bands.map((b,i)=>({...b,seconds:result.replays.reduce((n,x)=>n+x.bands[i].seconds,0)/ROUTES.length,runs:result.replays.reduce((n,x)=>n+x.bands[i].runs,0)/ROUTES.length}));
 fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.meanBands));
}
if(require.main===module)main();
module.exports={smoke,sampleLevel,replay,payAscension,profile,candidates,SEEDS,ROUTES,ASSUMPTIONS};
