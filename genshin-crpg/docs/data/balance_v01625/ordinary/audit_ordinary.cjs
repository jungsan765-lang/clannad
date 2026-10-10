'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const ROOT=path.resolve(process.argv[2]),OUT=path.resolve(process.argv[3]),label=process.argv[4]||'BASELINE',ENHANCE=process.argv[5]==='AUTO'?'AUTO':Number(process.argv[5]||10),H=require(ROOT+'/tools/audit_protagonist_v01618.cjs'),env=H.load(ROOT),A=env.api.adminBalance,cp=x=>x===undefined?null:JSON.parse(JSON.stringify(x));
fs.mkdirSync(OUT,{recursive:true});
const TEAM={FIVE_C0:['LIYUE_ZHONGLI','MOND_DILUC','MOND_JEAN'],FOUR_C0:['MOND_NOELLE','LIYUE_XIANGLING','LIYUE_BEIDOU']};
const config=A.emptyConfig();if(label==='N15'||label==='N12')config.cards.MOND_JEAN_Q={healingMultiplier:.75};
const profile={revision:Object.keys(config.cards).length?12501:0,config};
const watched=[...fs.readFileSync(ROOT+'/source/index.html','utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)].map(m=>'source/'+m[1]);watched.push('source/index.html','source/presentation.js','content/db.json','tools/audit_protagonist_v01618.cjs');
const hashInputs=()=>Object.fromEntries(watched.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(ROOT+'/'+f)).digest('hex')]));const before=hashInputs();
const report={kind:'v01625-targeted-character-ordinary-candidate',label,fingerprint:env.fingerprint,rawFileDbSHA256:before['content/db.json'],profile,enhance:ENHANCE,assumptions:'Diagnostic grants declared 4-person ownership, legal equal-level phase/base talent cap, craft equipment at declared enhancement/cap10. No artifact/exclusive/boss equipment, constellations, food or innate HP resets between battles. Traveler public Q/E HOLD/basic, actual balanced companion AI. Initially full HP only; consecutive 2 fights without cooking or lodging. Before-reward native KO is separate from automatic 10% out-of-battle revival. No blanket guarantee of all rosters or natural acquisition.',rows:[],errors:[],inputSHA256:before};
for(const level of [10,20,30,40,50,60])for(const kind of ['EXP','TALENT'])for(const [investment,team]of Object.entries(TEAM)){
 const enhance=ENHANCE==='AUTO'?(level<35?3:6):ENHANCE,sites=env.api.growthV01522.domains,key=Object.keys(sites).find(k=>sites[k].kind===kind&&sites[k].levels.includes(level));
 try{
  const seed=H.setup(env,{level,team,route:'ROUTE_TRAVELER',seed:717,map:sites[key].map,enhance,talent:10});
  for(const inv of seed.s.inventory.filter(i=>i.equip)){inv.enhancementCap=10;if(!seed.enhancementHasGain(inv))inv.enhance=0;}
  seed.recalculate();seed.s.global.PLAYER_HP_CURRENT=seed.s.global.PLAYER_HP_MAX;for(const id of team)seed.s.chars[id].hp=seed.character(id).maxHp;
  const r=A.createRuntime(env.db,seed.s,profile),meter=H.observe(env,r),stock=r.rows('19_SHOP_STOCK_DB').find(s=>s[3]==='SERVICE_INN_REST_8H');
  const row={level,kind,key,investment,seed:717,label,enhance,initial:cp(H.hp(r)),equipment:cp(r.s.inventory.filter(i=>i.equipped)),talents:Object.fromEntries(['PLAYER_CUSTOM',...team].map(id=>[id,cp(r.talentLevels(id))])),constellations:Object.fromEntries(['PLAYER_CUSTOM',...team].map(id=>[id,r.constellationLevel(id)])),battles:[]};
  for(let n=1;n<=2;n++){
   const beforeHp=cp(H.hp(r)),prior={...meter};r.action('DOMAIN_START',{domain:key+':'+level});
   const enemyStart=cp(r.s.runtime.actors.filter(a=>a.side==='ENEMY').map(a=>({source:a.source,hp:a.hp,atk:a.atk,def:a.def,level:a.level})));
   const result=H.play(r),last=r._auditLast,nativeParty=last?.actors.filter(a=>a.side==='ALLY').map(a=>({owner:a.source,hp:a.hp,maxHp:a.maxHp,shields:cp(a.shields)}));
   row.battles.push({n,victory:!!result.victory,rounds:result.rounds,stalled:!!result.stalled,healing:meter.heal-prior.heal,ko:nativeParty?.filter(a=>a.hp<=0).map(a=>a.owner)||[],beforeHp,afterHp:cp(H.hp(r)),nativeParty,enemyStart,seconds:(meter.ms-prior.ms)/1000+3*(meter.inputs-prior.inputs)+6,innQuote:cp(r.innRecoveryQuote(stock))});if(!result.victory)break;
  }
  row.finalHp=cp(H.hp(r));row.hpRatio=row.finalHp.reduce((n,a)=>n+a.hp,0)/row.finalHp.reduce((n,a)=>n+a.maxHp,0);row.innQuote=cp(r.innRecoveryQuote(stock));row.totalHealing=meter.heal;report.rows.push(row);
  console.log(JSON.stringify({level,kind,investment,label,enhance,results:row.battles.map(x=>({n:x.n,win:x.victory,rounds:x.rounds,ko:x.ko})),hp:row.hpRatio,healing:row.totalHealing,inn:row.innQuote.cost}));
 }catch(error){report.errors.push({level,kind,key,investment,label,error:error.stack});console.log(JSON.stringify(report.errors.at(-1)));}
 fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');
}
const after=hashInputs();report.inputDrift=Object.keys(before).filter(f=>before[f]!==after[f]);
report.summary={conditions:report.rows.length,battles:report.rows.reduce((n,r)=>n+r.battles.length,0),firstFightDefeats:report.rows.filter(r=>!r.battles[0]?.victory).length,secondFightDefeats:report.rows.filter(r=>r.battles[1]&&!r.battles[1].victory).length,KO:report.rows.flatMap(r=>r.battles).reduce((n,b)=>n+b.ko.length,0),errors:report.errors.length};
fs.writeFileSync(OUT+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary));if(report.errors.length||report.inputDrift.length)process.exitCode=1;
