'use strict';
// Native combat, identical party/gear/talents/seeds. Only legal level and ascension change.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fixture,run}=require('./helpers_balance_v0141.cjs');
const team=['MOND_AMBER','MOND_KAEYA','MOND_NOELLE'],report=[];
for(const [map,group,levels]of [['MAP_MOND_WOLVENDOM','EG_MOND_HILI_ELITE',[10,17,30]],['MAP_LIYUE_PLAINS','EG_LIYUE_HILI_ROCK',[20,32,50]]]){
 const byLevel=[];
 for(const level of levels){const battles=[];
  for(const seed of [11,22,33]){const r=fixture(Array(4).fill(level),team,3);Object.assign(r.s.global,{CURRENT_MAP_ID:map,SAVE_ID:'GROWTH-FEEL-'+seed,LAST_COMMITTED_ACTION_SEQ:0});const out=run(r,group,seed);assert(out.result.victory,JSON.stringify({map,level,seed,result:out.result}));battles.push({seed,rounds:out.result.rounds,enemies:out.stats.filter(a=>!['PLAYER_CUSTOM',...team].includes(a[0]))});}
  byLevel.push({level,battles,averageRounds:battles.reduce((n,b)=>n+b.rounds,0)/battles.length});
 }
 for(let i=1;i<byLevel.length;i++)for(let j=0;j<3;j++)assert.deepEqual(byLevel[i].battles[j].enemies,byLevel[0].battles[j].enemies,'enemies must stay fixed');
 assert(byLevel.at(-1).averageRounds<byLevel[0].averageRounds,'growth must shorten the same fight');
 if(map==='MAP_LIYUE_PLAINS')assert(byLevel.at(-1).averageRounds<=byLevel[0].averageRounds*.5,'returning with late-game growth takes at most half the rounds');
 report.push({map,group,byLevel});console.log(JSON.stringify({map,rounds:byLevel.map(x=>({level:x.level,average:x.averageRounds}))}));
}
const out=path.resolve(__dirname,'../evidence/v01522');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'growth-balance.json'),JSON.stringify(report,null,2));
