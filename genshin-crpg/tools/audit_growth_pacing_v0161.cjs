'use strict';
// A pacing model, not a real-player stopwatch. Combat timings are native seeded observations.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {setup,G,PLAYER}=require('./audit_balance_v01522.cjs');
const {REFERENCE_TEAM}=require('./audit_balance_v0161.cjs');
const DEFAULT=path.join(__dirname,'../docs/data/balance_v0161_timings.json');
const BANDS=[[1,10,600],[10,20,1800],[20,30,3600],[30,40,12600],[40,50,14400],[50,60,18000]];
function replay(start,end,route,data){
 const r=setup({level:start,team:REFERENCE_TEAM,gear:'none'}),owners=[PLAYER,...REFERENCE_TEAM];
 const timings=new Map(data.rows.map(x=>[x.route+':'+x.level,x]));let clears=0,seconds=0,overflow=0;const tiers={};
 function ascendReady(){if(r.growth().max&&r.growth().level<end){
  // Exact resources are synthetic so this measures XP alone; real ascension/material time is excluded.
  for(const id of owners){const d=r.ascensionInfo(id);r.s.global.MORA+=d.cost.mora;for(const [item,n]of Object.entries(d.cost.items))r.giveItem(item,n);r.action('CHAR_ASCEND',{owner:id});}
 }}
 ascendReady();
 while(r.growth().level<end){
  assert(clears<10000,'XP progression must terminate');
  // 0.16.2/0.16.3: the experience domain of the highest open band of 0.16.1's ladder (the levels between them pay the same).
  const level=r.growth().level,dl=[5,10,20,30,40,50,60].filter(n=>n<=level+5).at(-1),xp=G.domainXp[dl];
  const samples=route==='REFERENCE_MEAN'?['ROUTE_TRAVELER','ROUTE_ISEKAI']: [route];
  const time=samples.reduce((n,k)=>{const t=timings.get(k+':'+level);assert(t&&t.wins===t.samples,'all timing samples must be actual wins');return n+t.cycleSeconds;},0)/samples.length;
  const beforeXp=r.growth().xp;for(const id of owners)r.addXp(id,xp);
  let spent=0;for(let l=level;l<r.growth().level;l++)spent+=G.xpNext(l);
  overflow+=Math.max(0,beforeXp+xp-spent-r.growth().xp);
  clears++;seconds+=time;tiers[dl]=(tiers[dl]||0)+1;
  for(const id of owners)assert.equal(r.growth(id).level,r.growth().level,'equal active XP keeps the four owners together');
  ascendReady();
 }
 return {start,end,clears,seconds:+seconds.toFixed(2),tiers,xp:Array.from({length:end-start},(_,i)=>G.xpNext(start+i)).reduce((a,b)=>a+b,0),capOverflow:overflow};
}
function audit(data){const routes={};for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI','REFERENCE_MEAN'])routes[route]=BANDS.map(([a,b])=>replay(a,b,route,data));
 return {version:require('../package.json').version,party:[PLAYER,...REFERENCE_TEAM],timingAssumptions:data.timingAssumptions,targets:BANDS.map(([start,end,seconds])=>({start,end,seconds})),routes};}
if(require.main===module){const input=process.argv[2]||DEFAULT,out=audit(JSON.parse(fs.readFileSync(input,'utf8')));console.log(JSON.stringify(out,null,2));}
module.exports={replay,audit,BANDS};
