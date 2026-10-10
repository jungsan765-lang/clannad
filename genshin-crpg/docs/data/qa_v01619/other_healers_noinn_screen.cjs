'use strict';
// Read-only native sampling. Only initial declared ownership/gear/levels are fixtures.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),crypto=require('node:crypto');
const Q=require('./qa_helpers_v01619.cjs'),repo=Q.repo();
const H=require(path.join(repo,'tools/audit_protagonist_v01618.cjs'));
const root=process.env.CRPG_SCREEN_ROOT||Q.baseline(repo),out=process.env.CRPG_SCREEN_OUT||Q.outputDir('other_healers_generated');
const env=H.load(root),copy=x=>JSON.parse(JSON.stringify(x));
const supports=['LIYUE_XIANYUN','MOND_BENNETT','LIYUE_BAIZHU','LIYUE_QIQI','LIYUE_YAOYAO','MOND_NOELLE','MOND_SUCROSE'];
const data={fingerprint:env.fingerprint,runtimeRoot:root,assumptions:{party:'Traveler/Xiangling/Fischl/support, four active C0. Balanced native ally AI.',gear:'Same craft weapon + reinforced leather + healer brooch, enhance6. No artifacts, exclusive weapon or constellations.',levels:'25/50/60. Legal phase and talent clamped natively. One initial full HP only.',enemy:'Native same-level talent domains. Fixed enemy rules untouched.',recovery:'No rest, food, forced heal or refill between 3 battles. Native reward settlement and level-up preserved.',quote:'Final native innRecoveryQuote only, not actual paid lodging. Defeat quotation excluded from successful 3-win comparison.',limits:'Two seeds per support/level; screening, not broad balance certification. Baseline immutable source separates other healer values from proposed Jean/Barbara patch.'},rows:[],errors:[]};
fs.mkdirSync(out,{recursive:true});
for(const support of supports)for(const level of[25,50,60])for(const seed of[717,925]){
 const spec={support,level,seed,team:['LIYUE_XIANGLING','MOND_FISCHL',support],route:'ROUTE_TRAVELER',gear:'craft',enhance:6,talent:level===25?4:level===50?5:6,domain:(level===25?'FORSAKEN_RIFT':'TAISHAN_MANSION')+':'+level};
 try{
  const r=H.setup(env,{...spec,map:env.api.growthV01522.domains[spec.domain.split(':')[0]].map});
  r.s.constellations??={};for(const id of['PLAYER_CUSTOM',...spec.team])r.s.constellations[id]=0;
  H.observe(env,r);const heals=[],nativeHeal=r.heal;r.heal=function(a,n,source){const before={hp:a.hp,maxHp:a.maxHp};const result=nativeHeal.call(this,a,n,source);heals.push({target:a.source,id:a.id,source,round:this.s.runtime?.round,requested:n,applied:result,before,after:{hp:a.hp,maxHp:a.maxHp}});return result;};
  const row={...spec,fixtureHp:H.hp(r),talents:copy(r.s.talents),growth:copy(['PLAYER_CUSTOM',...spec.team].map(owner=>({owner,...r.growth(owner)}))),constellations:copy(r.s.constellations),equipment:copy(r.s.inventory.filter(x=>x.equipped)),battles:[],wins:0,losses:0};
  for(let i=0;i<3;i++){
   const before=H.hp(r),healIndex=heals.length;r.action('DOMAIN_START',{domain:spec.domain,element:'NEUTRAL'});
   const initial=copy(r.s.runtime.actors.map(a=>({source:a.source,id:a.id,side:a.side,level:a.level,hp:a.hp,maxHp:a.maxHp,atk:a.atk,def:a.def})));
   const result=H.play(r),last=r._auditLast;if(result.stalled)throw new Error('Native combat stalled');
   row.battles.push({index:i+1,before,initial,result:copy(result),victory:!!result.victory,rounds:last?.rounds,after:H.hp(r),hpBeforeReward:copy(last?.actors.filter(a=>a.side==='ALLY').map(a=>({source:a.source,id:a.id,hp:a.hp,maxHp:a.maxHp}))),heals:copy(heals.slice(healIndex)),log:copy(last?.log)});
   if(result.victory)row.wins++;else{row.losses++;break;}
  }
  row.finalHp=H.hp(r);row.finalHpRatio=row.finalHp.reduce((s,a)=>s+a.hp,0)/row.finalHp.reduce((s,a)=>s+a.maxHp,0);row.allAlive=row.finalHp.every(a=>a.hp>0);row.allFull=row.finalHp.every(a=>a.hp===a.maxHp);row.koBattles=row.battles.filter(b=>b.hpBeforeReward.some(a=>a.hp<=0)).length;
  const stock=r.rows('19_SHOP_STOCK_DB').find(a=>a[3]==='SERVICE_INN_REST_8H');row.nativeInnQuote=copy(r.innRecoveryQuote(stock));row.comparableFinalQuote=row.wins===3&&row.losses===0?row.nativeInnQuote:null;
  row.totalHeal=row.battles.reduce((s,b)=>s+b.heals.reduce((v,h)=>v+h.applied,0),0);row.actualFinalTalents=copy(r.s.talents);row.finalLevels=row.finalHp.map(a=>({owner:a.owner,level:a.level}));data.rows.push(row);
  console.log(JSON.stringify({support,level,seed,wins:row.wins,losses:row.losses,ratio:+row.finalHpRatio.toFixed(4),allFull:row.allFull,heal:row.totalHeal,quote:row.nativeInnQuote}));
 }catch(e){const error={spec,message:e.message,code:e.code||e.name};data.errors.push(error);console.log(JSON.stringify({error}));}
 fs.writeFileSync(path.join(out,'native.json.gz'),zlib.gzipSync(JSON.stringify(data),{level:9}));
}
const summary={fingerprint:data.fingerprint,conditionCount:data.rows.length,errors:data.errors,battleCount:data.rows.reduce((s,r)=>s+r.battles.length,0),wins:data.rows.reduce((s,r)=>s+r.wins,0),losses:data.rows.reduce((s,r)=>s+r.losses,0),supports:supports.map(support=>({support,levels:[25,50,60].map(level=>{const rows=data.rows.filter(r=>r.support===support&&r.level===level);return{level,conditions:rows.length,wins:rows.reduce((s,r)=>s+r.wins,0),losses:rows.reduce((s,r)=>s+r.losses,0),threeWins:rows.filter(r=>r.wins===3).length,fullHpAfterThreeWins:rows.filter(r=>r.wins===3&&r.allFull).length,finalRatio:rows.map(r=>r.finalHpRatio),totalHeal:rows.map(r=>r.totalHeal),quotes:rows.map(r=>r.comparableFinalQuote),koBattles:rows.reduce((s,r)=>s+r.koBattles,0)};})})),nativeSha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(out,'native.json.gz'))).digest('hex')};
fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({done:true,conditionCount:summary.conditionCount,battleCount:summary.battleCount,wins:summary.wins,losses:summary.losses,errorCount:summary.errors.length}));
