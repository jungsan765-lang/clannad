'use strict';
// Native costs, analytic enhancement expectation. Does not spend or mutate a real account.
const {setup,api,G}=require('./audit_balance_v01522.cjs');
const r=setup({level:60}),rows=[];
for(const [id,rarity]of [['MOND_AMBER',4],['MOND_DILUC',5]]){
 let ascensionMora=0;const phases=[];
 for(let phase=0;phase<6;phase++){r.s.chars[id].level=G.caps[phase];r.s.ascensions[id]=phase;const cost=r.ascensionInfo(id).cost;ascensionMora+=cost.mora;phases.push({phase,cost});}
 r.s.chars[id].level=60;r.s.ascensions[id]=6;let talent8Mora=0;
 for(let t=1;t<8;t++){r.s.talents[id]={na:t,e:t,q:t};talent8Mora+=3*r.talentUpgradeInfo(id,'na').cost.mora;}
 rows.push({id,rarity,ascensionMora,talent8Mora,phases});
}
const cfg=api.enhancementConfig;
function expected(target){const delta=[0];let total=0;for(let level=0;level<target;level++){const t=level+1,p=cfg.success[t]/10000,d=cfg.down[t]/10000;delta[level+1]=(cfg.mora[t]+d*delta[level])/p;total+=delta[level+1];}return total;}
const gear3Expected=3*expected(10),gear3MaxExpected=3*(expected(12)+cfg.ascensionCost.mora),xp55=Array.from({length:5},(_,i)=>G.xpNext(55+i)).reduce((a,b)=>a+b,0);
for(const x of rows){x.gear3Expected=gear3Expected;x.fullTotalExpected=x.ascensionMora+x.talent8Mora+gear3Expected;x.catchup55TotalExpected=x.phases[5].cost.mora+x.talent8Mora+gear3Expected;x.fullWealthClaims=Math.ceil(x.fullTotalExpected/40000);x.catchupWealthClaims=Math.ceil(x.catchup55TotalExpected/40000);}
console.log(JSON.stringify({version:require('../package.json').version,rows,gear3MaxExpected,xp55,books55:Math.ceil(xp55/1000),revelationClaims55:Math.ceil(Math.ceil(xp55/1000)/180),assumptions:'one character; zero stock; na/e/q 8; three equips +10; native ascension/talent costs and analytic success/hold/down enhancement expectation; excludes crafting, material conversion, travel, story and opportunity costs; hourly limits unchanged'},null,2));
