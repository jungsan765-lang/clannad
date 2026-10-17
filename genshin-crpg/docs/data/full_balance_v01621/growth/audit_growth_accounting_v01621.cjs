'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../../..'),arg=n=>{const i=process.argv.indexOf(n);return i<0?null:process.argv[i+1];},src=arg('--source-root')||root,out=arg('--out')||path.join(__dirname,'growth_accounting.json'),H=require(path.join(root,'tools/audit_food_lodging_v01617.cjs')),env=H.loadEnvironment(src),G=env.G,P='PLAYER_CUSTOM',cp=x=>JSON.parse(JSON.stringify(x));
const bands=[[1,10],[10,20],[20,30],[30,40],[40,50],[50,55],[55,60]],xpBands=bands.map(([from,to])=>({from,to,xpPerOwner:G.pacingCurve.slice(from-1,to-1).reduce((s,n)=>s+n,0)}));
const {r}=require('./audit_growth_v01621.cjs').setup({level:60,team:'story4'}),ascension=[],talents=[];
for(const owner of [P,'MOND_AMBER','LIYUE_XIANGLING','MOND_DILUC','LIYUE_ZHONGLI']){
 const sums={mora:0,items:{}};
 for(let phase=0;phase<6;phase++){if(owner===P){r.s.global.PLAYER_LEVEL_STATE=G.caps[phase];r.s.global.PLAYER_XP_STATE=0;}else{r.s.chars[owner].level=G.caps[phase];r.s.chars[owner].xp=0;}r.s.ascensions[owner]=phase;const q=cp(r.ascensionInfo(owner).cost);sums.mora+=q.mora;for(const[id,n]of Object.entries(q.items))sums.items[id]=(sums.items[id]||0)+n;ascension.push({owner,rarity:owner===P?4:r.rarityOf(owner),phase,level:G.caps[phase],nextCap:G.caps[phase+1],cost:q});}
 ascension.push({owner,total:true,cost:sums});
 const totals={mora:0,items:{}};r.s.ascensions[owner]=6;if(owner===P)r.s.global.PLAYER_LEVEL_STATE=60;else r.s.chars[owner].level=60;
 for(let level=1;level<=9;level++){r.s.talents[owner]={na:level,e:level,q:level};const q=cp(r.talentUpgradeInfo(owner,'na').cost);totals.mora+=3*q.mora;for(const[id,n]of Object.entries(q.items))totals.items[id]=(totals.items[id]||0)+3*n;talents.push({owner,level,next:level+1,costPerTalent:q});}talents.push({owner,totalThree:true,cost:totals});
}
const ledgers=[];
for(const operation of ['BOOK','MATERIAL'])for(const cap of [false,true]){
 const x=H.setup(env,{levels:cap?10:22}),owners=x.s.party.map(p=>p.source),bench='MOND_BARBARA',elig=JSON.parse(x.s.global.COMPANION_ELIGIBILITY_JSON);elig[bench]={state:'JOINED'};x.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(elig);x.s.chars[bench].level=cap?10:22;x.s.chars[bench].xp=0;x.s.ascensions[bench]=cap?0:2;x.s.chars[bench].hp=x.character(bench).maxHp;
 const all=[...owners,bench],before=all.map(id=>cp(x.growth(id))),wallet=x.s.global.MORA;
 let result;
 if(operation==='BOOK'){x.giveItem('MAT_CHAR_EXP_HERO',1);if(cap){assert.equal(x.experienceBookLimit('MAT_CHAR_EXP_HERO',bench),0);const saved=x.serialize();assert.throws(()=>x.action('USE_ITEM',{item:'MAT_CHAR_EXP_HERO',owner:bench,quantity:1}));assert.equal(x.serialize(),saved);result={rejectedAtCap:true};}else result=x.action('USE_ITEM',{item:'MAT_CHAR_EXP_HERO',owner:bench,quantity:1}).result;}
 else {const [key,s]=Object.entries(G.domains).find(([,s])=>s.kind==='TALENT'&&s.levels.includes(5));x.s.global.CURRENT_MAP_ID=s.map;x.s.domainDaily={day:G.dayOf(x.leyLineNow()),wins:3};x.action('DOMAIN_START',{domain:key+':5'});for(const a of x.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;result=x.finishBattle(true);const saved=x.serialize();assert.equal(x.finishBattle(true),undefined);assert.equal(x.serialize(),saved);}
 const after=all.map(id=>cp(x.growth(id))),actual=all.map((id,i)=>({owner:id,delta:after[i].xp-before[i].xp+G.pacingCurve.slice(before[i].level-1,after[i].level-1).reduce((s,n)=>s+n,0)}));
 for(const row of actual)assert.equal(row.delta,cap?0:operation==='BOOK'?(row.owner===bench?1000:0):(row.owner===bench?10:40));assert.equal(x.s.global.MORA,wallet);ledgers.push({operation,cap,before,after,actual,result,bookUseMoraFee:x.s.global.MORA-wallet,nativeSettlementFixture:operation==='MATERIAL'});
}
const data={schema:1,provenance:env.provenance,xpBands,xp1To60:G.pacingCurve.reduce((s,n)=>s+n,0),revelationTiers:env.c.CRPGRuntime.leyLines.tiers,bookXp:env.c.CRPGRuntime.leyLines.bookXp,bookUseMoraFee:0,ascension,talents,ledgers,scope:'Exact native quotes and per-owner credit/consumption; enemy HP0 settlement fixtures test accounting only and supply no duration/win-rate evidence. Ascension/talent acquisition and synthetic ownership are excluded.'};fs.writeFileSync(out,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({ledgers:ledgers.length,xp1To60:data.xp1To60,xpBands}));
