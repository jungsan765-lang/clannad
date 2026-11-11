'use strict';
// Native, fixed-four-member EXP fights. Every unlocked stage is measured at every level,
// including losses. XP/time chooses among stages that win on all three declared seeds.
// Ownership, story, entry HP, legal gear/talents and ascension materials are fixtures;
// travel, recovery, equipment/material farming and real human input time are excluded.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {measure,REFERENCE_TEAM}=require('./audit_balance_v0161.cjs');
const {setup,G,PLAYER,api}=require('./audit_balance_v01522.cjs');
const {payAscension}=require('./audit_growth_pacing_v0166.cjs');
const SEEDS=[717,4242,9031],ROUTES=['ROUTE_TRAVELER','ROUTE_ISEKAI'],PARTY=[PLAYER,...REFERENCE_TEAM];
const ASSUMPTIONS={displaySpeed:2,inputSeconds:3,reentrySeconds:6,party:PARTY,seeds:SEEDS,synthetic:['ownership','all story gates open','legal crafted equipment and talents','full HP at entry','exact ascension materials'],excluded:['travel','story','recovery','mining','gear and material farming'],selection:'highest XP/mean cycle seconds among all natively unlocked EXP stages victorious on every seed',timing:'shipped presentation action frames at the 2x labelled speed; 3 seconds per player COMBAT input plus 6 seconds per receipt/re-entry'};
function profile(level){return {gear:level<5?'starter':'craft',enhance:level<5?0:level<30?3:level<50?6:10,talent:'mid',team:REFERENCE_TEAM};}
function sourceFingerprint(){const p=path.resolve(__dirname,'../source'),h=crypto.createHash('sha256');for(const name of fs.readdirSync(p).filter(x=>x.endsWith('.js')).sort()){h.update(name);h.update(fs.readFileSync(path.join(p,name)));}for(const file of ['../source/index.html','../content/db.json','../tests/helpers_v011.cjs','audit_balance_v01522.cjs','audit_balance_v0161.cjs','audit_growth_pacing_v0166.cjs','audit_growth_pacing_v0168.cjs']){h.update(file);h.update(fs.readFileSync(path.join(__dirname,file)));}return h.digest('hex');}
function candidates(level,route='ROUTE_TRAVELER'){
 const r=setup({level,route,gear:'none',team:REFERENCE_TEAM});
 return Object.entries(G.domains).filter(([,d])=>d.kind==='EXP').flatMap(([,d])=>r.growthDomainEntries(d.map).filter(x=>!x.reason).map(x=>({id:x.id,level:x.level}))).sort((a,b)=>a.level-b.level);
}
function summarizeAttempt(domain,rows){
 const xp=G.domainXp[domain.level],cycleSeconds=rows.reduce((n,x)=>n+x.cycleSeconds,0)/rows.length;
 for(const x of rows){if(x.expectedRewards.xp!==xp)throw Error('Display/plan XP mismatch '+domain.id);if(x.result.victory&&x.result.xp!==xp)throw Error('Plan/receipt XP mismatch '+domain.id);if(x.expectedRewards.mora!==0)throw Error('EXP-domain plan unexpectedly pays Mora');if(x.result.victory&&x.result.mora!==0)throw Error('EXP-domain receipt unexpectedly pays Mora');}
 return {domain:domain.id,stageLevel:domain.level,experience:xp,wins:rows.filter(x=>x.result.victory).length,cycleSeconds,xpPerMinute:xp*60/cycleSeconds,rows};
}
function selectAttempt(attempts,payouts=G.domainXp){
 return attempts.filter(a=>a.wins===SEEDS.length).map(a=>({...a,experience:payouts[a.stageLevel],xpPerMinute:payouts[a.stageLevel]*60/a.cycleSeconds})).sort((a,b)=>b.xpPerMinute-a.xpPerMinute||b.stageLevel-a.stageLevel)[0];
}
function sampleLevel(level,route,onAttempt=()=>{},cached=[]){
 const attempts=[];
 for(const domain of candidates(level,route)){
  const prior=cached.find(x=>x.domain===domain.id),rows=prior?prior.rows:SEEDS.map(seed=>measure({...profile(level),level,route,seed,saveId:'BALANCE-V0168-'+seed,domain:domain.id,earningXp:true}));
  attempts.push(summarizeAttempt(domain,rows));onAttempt(attempts);
 }
 const best=selectAttempt(attempts);if(!best)throw Error('No three-seed winning EXP stage: '+route+' Lv.'+level);
 const highest=attempts.filter(x=>x.wins===SEEDS.length).at(-1);
 return {level,route,domain:best.domain,stageLevel:best.stageLevel,experience:best.experience,cycleSeconds:best.cycleSeconds,xpPerMinute:best.xpPerMinute,highestWinningStage:highest.domain,highestStageXpPerMinute:highest.xpPerMinute,attempts};
}
function replay(samples,route){
 const byLevel=new Map(samples.filter(x=>x.route===route).map(x=>[x.level,x])),r=setup({level:1,route,team:REFERENCE_TEAM,gear:'none',saveId:'PACING-V0168-REPLAY-'+route});
 const boundaries=[10,20,30,40,50,60],bands=[],paidCaps=[],steps=[];let seconds=0,runs=0,lastSeconds=0,lastRuns=0,from=1,next=0;
 for(let guard=0;r.growth(PLAYER).level<60&&guard<100000;guard++){
  for(const owner of PARTY){const g=r.growth(owner);if(g.max&&!g.final)paidCaps.push(payAscension(r,owner));}
  const before=r.growth(PLAYER),s=byLevel.get(before.level),choice=s&&selectAttempt(s.attempts);
  if(!choice)throw Error('Missing winning native timings at '+route+' Lv.'+before.level);
  seconds+=choice.cycleSeconds;runs++;
  for(const owner of PARTY)r.addXp(owner,choice.experience);
  const after=r.growth(PLAYER);steps.push({run:runs,domain:choice.domain,xp:choice.experience,cycleSeconds:choice.cycleSeconds,fromLevel:before.level,fromXp:before.xp,toLevel:after.level,toXp:after.xp});
  while(next<boundaries.length&&after.level>=boundaries[next]){const to=boundaries[next++];bands.push({from,to,runs:runs-lastRuns,seconds:seconds-lastSeconds});from=to;lastRuns=runs;lastSeconds=seconds;}
 }
 if(r.growth(PLAYER).level!==60)throw Error('Replay failed to reach level 60');
 return {route,bands,totalRuns:runs,totalSeconds:seconds,paidCaps,steps,final:PARTY.map(owner=>({owner,...r.growth(owner)}))};
}
// Numeric trial only; final acceptance always uses the native addXp / paid CHAR_ASCEND replay above.
function replayCurve(samples,route,curve,payouts=G.domainXp){
 const byLevel=new Map(samples.filter(x=>x.route===route).map(x=>[x.level,x])),boundaries=[10,20,30,40,50,60],bands=[];
 let level=1,xp=0,phase=0,seconds=0,runs=0,lastSeconds=0,lastRuns=0,from=1,next=0;
 for(let guard=0;level<60&&guard<100000;guard++){
  if(level===G.caps[phase])phase++;
  const s=byLevel.get(level),choice=s&&selectAttempt(s.attempts,payouts);if(!choice)throw Error('Missing timing Lv.'+level);
  seconds+=choice.cycleSeconds;runs++;xp+=choice.experience;
  while(level<G.caps[phase]&&xp>=curve[level-1]){xp-=curve[level-1];level++;}if(level===G.caps[phase])xp=0;
  while(next<boundaries.length&&level>=boundaries[next]){const to=boundaries[next++];bands.push({from,to,runs:runs-lastRuns,seconds:seconds-lastSeconds});from=to;lastRuns=runs;lastSeconds=seconds;}
 }
 if(level!==60)throw Error('Numeric replay failed');return {route,bands,totalRuns:runs,totalSeconds:seconds};
}
function meanBands(replays){return replays[0].bands.map((b,i)=>({...b,seconds:replays.reduce((n,x)=>n+x.bands[i].seconds,0)/replays.length,runs:replays.reduce((n,x)=>n+x.bands[i].runs,0)/replays.length}));}
function main(){
 const out=process.env.CRPG_PACING_OUT||path.resolve(__dirname,'../evidence/v0168/growth-optimal-v0168.json'),fingerprint=sourceFingerprint();fs.mkdirSync(path.dirname(out),{recursive:true});
 const option=name=>{const i=process.argv.indexOf(name);return i<0?undefined:process.argv[i+1];},routeOption=option('--route'),fromLevel=Number(option('--from')||1),toLevel=Number(option('--to')||59),routes=routeOption?[routeOption]:ROUTES;
 if(routes.some(x=>!ROUTES.includes(x))||!Number.isInteger(fromLevel)||!Number.isInteger(toLevel)||fromLevel<1||toLevel>59||fromLevel>toLevel)throw Error('Invalid route/level shard');
 let result={version:require('../package.json').version,sourceFingerprint:fingerprint,assumptions:ASSUMPTIONS,payouts:G.domainXp,materialPayouts:G.domainMaterialXp,curve:G.pacingCurve,samples:[]};
 if(process.argv.includes('--resume')&&fs.existsSync(out)){const previous=JSON.parse(fs.readFileSync(out));if(previous.sourceFingerprint!==fingerprint)throw Error('Cached source fingerprint differs; choose a new output path');result=previous;}
 if(option('--matrices')){
  if(process.argv.includes('--resume'))throw Error('Choose matrix import or same-source resume');
  result.timingSources=option('--matrices').split(',').map(file=>{const matrix=JSON.parse(fs.readFileSync(file));result.samples.push(...matrix.samples.filter(x=>x.complete));return {file,sourceFingerprint:matrix.sourceFingerprint,finishedSourceFingerprint:matrix.finishedSourceFingerprint,sourceStayedUnchanged:matrix.sourceStayedUnchanged,payouts:matrix.payouts,curve:matrix.curve};});
  if(result.samples.length!==118||new Set(result.samples.map(s=>s.route+':'+s.level)).size!==118)throw Error('Imported timing matrices must cover each route/Lv1..59 exactly once');
  result.timingReuse='XP rewards/requirement curves settle after combat. Imported native combat timings are accepted only when every final selected stage repeats all three seed victories, identical entry actors, inputs and presentation durations below.';
 }
 const save=()=>{const temp=out+'.tmp';fs.writeFileSync(temp,JSON.stringify(result,null,2)+'\n');fs.renameSync(temp,out);};
 if(!process.argv.includes('--replay-only')&&!option('--matrices'))for(const route of routes)for(let level=fromLevel;level<=toLevel;level++){
  const prior=result.samples.find(x=>x.route===route&&x.level===level);if(prior?.complete)continue;
  const current=prior||{level,route,attempts:[]};if(!prior)result.samples.push(current);
  const sample=sampleLevel(level,route,attempts=>{current.attempts=attempts;save();},current.attempts);Object.assign(current,sample,{complete:true});save();
  console.log(JSON.stringify({route,level,domain:sample.domain,xp:sample.experience,seconds:+sample.cycleSeconds.toFixed(2),xpPerMinute:+sample.xpPerMinute.toFixed(2),highestWinningStage:sample.highestWinningStage,stages:sample.attempts.length}));
 }
 if(result.samples.filter(s=>s.complete).length!==118){result.mode='partial';result.finishedSourceFingerprint=sourceFingerprint();result.sourceStayedUnchanged=result.finishedSourceFingerprint===fingerprint;save();console.log(JSON.stringify({mode:'partial',samples:result.samples.length,sourceStayedUnchanged:result.sourceStayedUnchanged,file:out}));return;}
 if(option('--matrices')||process.argv.includes('--verify-selection')){
  result.nativeSelectionChecks??=[];
  for(const s of result.samples){
   if(result.nativeSelectionChecks.some(x=>x.route===s.route&&x.level===s.level))continue;
   const best=selectAttempt(s.attempts),domain={id:best.domain,level:best.stageLevel},rows=SEEDS.map(seed=>measure({...profile(s.level),level:s.level,route:s.route,seed,saveId:'BALANCE-V0168-'+seed,domain:domain.id,earningXp:true})),checked=summarizeAttempt(domain,rows);
   if(checked.wins!==SEEDS.length)throw Error('Final selection lost a native seed at '+s.route+' Lv.'+s.level);
   for(const x of rows){const prior=best.rows.find(y=>y.seed===x.seed);for(const key of ['initial','initialAllies','presentationMs','playerInputs','cycleSeconds'])if(JSON.stringify(x[key])!==JSON.stringify(prior[key]))throw Error('Imported native combat timing changed at '+s.route+' Lv.'+s.level+' '+key);}
   result.nativeSelectionChecks.push({route:s.route,level:s.level,...checked});save();console.log(JSON.stringify({verifySelection:s.route,level:s.level,domain:best.domain,seconds:checked.cycleSeconds}));
  }
 }
 result.replays=ROUTES.map(route=>replay(result.samples,route));result.meanBands=meanBands(result.replays);result.finishedSourceFingerprint=sourceFingerprint();result.sourceStayedUnchanged=result.finishedSourceFingerprint===fingerprint;save();
 console.log(JSON.stringify({samples:result.samples.length,nativeBattles:result.samples.reduce((n,s)=>n+s.attempts.reduce((n,a)=>n+a.rows.length,0),0),meanBands:result.meanBands,sourceStayedUnchanged:result.sourceStayedUnchanged,file:out}));
 if(!result.sourceStayedUnchanged)throw Error('Sources changed during sampling; matrix describes its initial runtime snapshot only');
}
if(require.main===module)main();
module.exports={sampleLevel,replay,replayCurve,meanBands,selectAttempt,payAscension,profile,candidates,sourceFingerprint,SEEDS,ROUTES,PARTY,ASSUMPTIONS};
