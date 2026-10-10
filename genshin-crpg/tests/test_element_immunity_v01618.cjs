'use strict';
// Native authored/generated encounters and legal companion cards; no fabricated combat actors.
// AI is held at the opening and RNG fixed only to isolate packet routing from misses/balance.
const assert=require('node:assert/strict');
const {fresh,R,db}=require('./helpers_v011.cjs');
const definitions=fresh(),members=definitions.rows('49_ENCOUNTER_MEMBER_DB'),cp=x=>JSON.parse(JSON.stringify(x));
const checks=[];
function test(name,fn){try{checks.push({name,ok:true,evidence:fn()});console.log('PASS '+name);}catch(e){checks.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const skills={PYRO:['MOND_BENNETT','MOND_BENNETT_E'],HYDRO:['LIYUE_XINGQIU','LIYUE_XINGQIU_E'],CRYO:['MOND_KAEYA','MOND_KAEYA_E'],ELECTRO:['MOND_LISA','MOND_LISA_E'],ANEMO:['MOND_SUCROSE','MOND_SUCROSE_E'],GEO:['LIYUE_NINGGUANG','LIYUE_NINGGUANG_E'],DENDRO:['LIYUE_BAIZHU','LIYUE_BAIZHU_E']};
function native(id,owners){
 const groups=[...new Set(members.filter(row=>row[3]===id).map(row=>row[1]))];
 if(id==='MON_SLIME_LARGE_ELECTRO')groups.push('GENERATED:MIDSUMMER15');
 const errors=[];
 for(let group of groups){
  const r=fresh('MAP_MOND_PLAINS','ROUTE_ISEKAI');
  [...new Set(owners)].forEach((owner,i)=>{r.adminApply({op:'recruit',char:owner});r.action('PARTY',{char:owner,slot:i+2});});
  r.autoUntilPlayer=()=>{};
  try{
   if(group==='GENERATED:MIDSUMMER15'){r.s.global.CURRENT_MAP_ID='MAP_D163_MIDSUMMER_COURTYARD';group=r.growthDomainGroup(r.growthDomainEntries().find(x=>x.level===15),'NEUTRAL');}
   r.startBattle(group,'EXPLICIT');const b=r.s.runtime,t=b.actors.find(a=>a.source===id);assert(t,'native enemy exists');
   r.die=()=>60;r.random=()=>.5;
   return {r,b,t,group,actor:owner=>b.actors.find(a=>a.source===owner)};
  }catch(e){errors.push(group+': '+(e.code||e.message));}
 }
 throw Error(id+' has no playable native fixture: '+errors.join('; '));
}
function cast(r,a,id,t){const c=r.actorCards(a).find(c=>c.id===id);assert(c,id+' exists');assert.equal(r.cardReason(a,c),'',id+' available');assert(r.cardTargets(a,c).some(x=>x.id===t.id),id+' target legal');r.executeCard(a,c,t.id,'TAP');}
function shield(t){return t.shields.reduce((n,x)=>n+x.value,0);}
function packets(b,t,start=0){return b.log.slice(start).filter(x=>x.target===t.name&&Object.hasOwn(x,'damage'));}

const slimeIds=definitions.rows('09_MONSTER_DB').filter(row=>/^MON_SLIME_(?:LARGE_)?(?:PYRO|HYDRO|CRYO|ELECTRO|ANEMO|GEO|DENDRO)$/.test(row[0])).map(row=>row[0]);
for(const id of slimeIds){
 if(id==='MON_SLIME_LARGE_DENDRO'){
  test(id+' dormant source definition gets the same elemental-body rule',()=>{assert(definitions.tables['09_MONSTER_DB'].has(id));assert.equal(members.filter(row=>row[3]===id).length,0);assert(definitions.hasElementImmunity({source:id},'DENDRO'));assert(!definitions.hasElementImmunity({source:id},'PYRO'));return {staticOnly:true};});
  continue;
 }
 test(id+' legal own-element attack does zero damage; another element still lands',()=>{
  const own=id.split('_').at(-1),other=own==='PYRO'?'HYDRO':'PYRO',ownSkill=skills[own],otherSkill=skills[other];
  const {r,b,t,group,actor}=native(id,[ownSkill[0],otherSkill[0]]),hp=t.hp,sh=shield(t);
  cast(r,actor(ownSkill[0]),ownSkill[1],t);const ownPackets=packets(b,t).filter(x=>x.element===t.nativeAura);assert(ownPackets.length);assert(ownPackets.every(x=>x.immune&&x.damage===0));
  // Anemo area attacks can swirl a neighboring slime's different element onto this target.
  // Only that actual damage element is immune; such other-element reaction damage must survive.
  if(own!=='ANEMO'){assert.equal(t.hp,hp);assert.equal(shield(t),sh);}
  const beforeOther=t.hp,beforeOtherShield=shield(t),start=b.log.length;cast(r,actor(otherSkill[0]),otherSkill[1],t);assert(t.hp<beforeOther||shield(t)<beforeOtherShield,'other element causes damage');
  return {group,ownCard:ownSkill[1],otherCard:otherSkill[1],ownElementDamage:0,incidentalOtherElementDamage:hp-beforeOther,otherPackets:cp(packets(b,t,start))};
 });
}

for(const [id,owner,card,rx,rounds] of [
 ['MON_SLIME_PYRO','MOND_LISA','MOND_LISA_E','RX_OVERLOADED',0],
 ['MON_SLIME_LARGE_PYRO','MOND_LISA','MOND_LISA_E','RX_OVERLOADED',0],
 ['MON_SLIME_CRYO','MOND_LISA','MOND_LISA_E','RX_SUPERCONDUCT',0],
 ['MON_SLIME_LARGE_CRYO','MOND_LISA','MOND_LISA_E','RX_SUPERCONDUCT',0],
 ['MON_SLIME_ELECTRO','LIYUE_XINGQIU','LIYUE_XINGQIU_E','RX_ELECTROCHARGED',1],
 ['MON_SLIME_LARGE_ELECTRO','LIYUE_XINGQIU','LIYUE_XINGQIU_E','RX_ELECTROCHARGED',1],
 ['MON_SLIME_HYDRO','MOND_SUCROSE','MOND_SUCROSE_E','RX_SWIRL',0],
 ['MON_SLIME_LARGE_HYDRO','MOND_SUCROSE','MOND_SUCROSE_E','RX_SWIRL',0],
 ['MON_SLIME_DENDRO','LIYUE_XINGQIU','LIYUE_XINGQIU_E','RX_BLOOM',3],
])test(id+' '+rx+' occurs but immune-element reaction/DOT/core damage is zero',()=>{
 const {r,b,t,group,actor}=native(id,[owner]);cast(r,actor(owner),card,t);for(let i=0;i<rounds;i++)r.roundEnd();
 assert(b.log.some(x=>x.reaction===rx),'reaction still occurs');const own=t.nativeAura;
 const blocked=packets(b,t).filter(x=>x.immune&&x.element===own);assert(blocked.length,'native reaction or DOT produced immune packet');assert(blocked.every(x=>x.damage===0&&!(x.absorbed>0)));
 assert(packets(b,t).some(x=>x.element!==own&&x.damage>0),'primary other-element attack still damages');
 return {group,card,reaction:rx,blocked:cp(blocked)};
});

for(const [id,element,other] of [['MON_ABYSS_MAGE_PYRO','PYRO','HYDRO'],['MON_ABYSS_MAGE_HYDRO','HYDRO','CRYO'],['MON_ABYSS_MAGE_CRYO','CRYO','PYRO']]){
 test(id+' legal immune hit preserves shield and HP; vulnerable hit breaks it',()=>{
  const own=skills[element],counter=skills[other],{r,b,t,group,actor}=native(id,[own[0],counter[0]]),hp=t.hp,sh=shield(t);assert(sh>0);
  assert(!r.hasElementImmunity(t,element),'barrier does not grant body immunity');
  cast(r,actor(own[0]),own[1],t);assert.equal(t.hp,hp);assert.equal(shield(t),sh);assert(packets(b,t).some(x=>x.immune));
  cast(r,actor(counter[0]),counter[1],t);assert(shield(t)<sh,'vulnerable element reduces shield');
  return {group,shieldBefore:sh,shieldAfter:shield(t),packets:cp(packets(b,t))};
 });
 test(id+' immune direct/reaction/DOT/field/summon packets cannot overflow; broken barrier permits own element',()=>{
  const own=skills[element],{r,b,t,actor}=native(id,[own[0]]),a=actor(own[0]),hp=t.hp,original=cp(t.shields);
  r.shield(t,10000,'TEST_STACKED_SHIELD',2);const sh=shield(t);
  for(const sourceKind of [null,'REACTION','REACTION_DOT','FIELD','OBJECT','SUMMON']){
   const start=b.log.length;assert.equal(r.applyDamage(a,t,100000,{element,sourceKind}),0);assert.equal(t.hp,hp);assert.equal(shield(t),sh);const p=packets(b,t,start).at(-1);assert(p.immune);assert.equal(p.damage,0);assert.equal(p.absorbed,0);
  }
  // A saved barrier remains authoritative with its original source; no migrated shield values are needed.
  const state=JSON.parse(r.serialize());
  const restored=new R(db,state),rt=restored.s.runtime.actors.find(x=>x.id===t.id),ra=restored.s.runtime.actors.find(x=>x.id===a.id);restored.applyDamage(ra,rt,100000,{element,sourceKind:'REACTION_DOT'});assert.equal(rt.hp,hp);assert.equal(shield(rt),sh);
  // Exhaust the native barrier with a non-immune final packet, then use a legal own-element card on the exposed body.
  t.shields=original;const counter=element==='PYRO'?'HYDRO':'PYRO';r.applyDamage(a,t,shield(t)/2,{element:counter,sourceKind:'FIELD',shieldDamageMultiplier:10});assert.equal(shield(t),0);assert(t.hp>0);
  const exposed=t.hp;cast(r,a,own[1],t);assert(t.hp<exposed,'mage body is vulnerable after barrier breaks');
  return {sourceKinds:6,restored:true,exposedOwnDamage:exposed-t.hp};
 });
}

test('cryo mage Hydro protection blocks damage while native aura/reaction remains possible',()=>{
 const {r,b,t,actor}=native('MON_ABYSS_MAGE_CRYO',['LIYUE_XINGQIU','MOND_KAEYA']),hp=t.hp,sh=shield(t);
 cast(r,actor('LIYUE_XINGQIU'),'LIYUE_XINGQIU_E',t);assert.equal(t.hp,hp);assert.equal(shield(t),sh);assert(r.auraList(t).some(x=>x.element==='물'));
 cast(r,actor('MOND_KAEYA'),'MOND_KAEYA_E',t);assert.equal(t.hp,hp);assert.equal(shield(t),sh);assert(b.log.some(x=>x.target===t.name&&x.reaction==='RX_FROZEN'));
 return {hp,shield:sh,reactions:cp(b.log.filter(x=>x.reaction))};
});

for(const [id,setupOwner,setupCard,owner,card,rx] of [
 ['MON_SLIME_DENDRO','MOND_LISA','MOND_LISA_E','LIYUE_BAIZHU','LIYUE_BAIZHU_E','RX_SPREAD'],
 ['MON_SLIME_ELECTRO','LIYUE_BAIZHU','LIYUE_BAIZHU_E','MOND_LISA','MOND_LISA_E','RX_AGGRAVATE'],
])test(id+' '+rx+' is generated by legal cards despite zero immune additive damage',()=>{
 const {r,b,t,actor}=native(id,[setupOwner,owner]);cast(r,actor(setupOwner),setupCard,t);assert(t.statuses.some(x=>x.id==='QUICKEN'));assert(b.log.some(x=>x.reaction==='RX_QUICKEN'));
 const hp=t.hp,sh=shield(t),start=b.log.length;cast(r,actor(owner),card,t);assert.equal(t.hp,hp);assert.equal(shield(t),sh);assert(b.log.slice(start).some(x=>x.target===t.name&&x.reaction===rx));assert(packets(b,t,start).some(x=>x.immune&&x.damage===0));
 return {reaction:rx,packets:cp(packets(b,t,start))};
});

for(const [owner,card,rx,tick] of [['MOND_BENNETT','MOND_BENNETT_E','RX_BURGEON',false],['MOND_LISA','MOND_LISA_Q','RX_HYPERBLOOM',true]])test('native Dendro core '+rx+' cannot damage the Dendro slime',()=>{
 const {r,b,t,actor}=native('MON_SLIME_DENDRO',['LIYUE_XINGQIU',owner]);cast(r,actor('LIYUE_XINGQIU'),'LIYUE_XINGQIU_E',t);assert(b.fields.some(x=>x.kind==='DENDRO_CORE'));
 const start=b.log.length;cast(r,actor(owner),card,t);if(tick)r.tickFields('END');assert(b.log.slice(start).some(x=>x.reaction===rx));
 const blocked=packets(b,t,start).filter(x=>x.immune&&x.element==='풀');assert(blocked.length);assert(blocked.every(x=>x.damage===0&&!(x.absorbed>0)));
 assert(packets(b,t,start).some(x=>x.element!=='풀'&&x.damage>0),'trigger element still damages');return {reaction:rx,packets:cp(packets(b,t,start))};
});

for(const [id,owner,card,rx] of [['MON_SLIME_CRYO','MOND_BENNETT','MOND_BENNETT_E','RX_MELT_PYRO'],['MON_SLIME_PYRO','LIYUE_XINGQIU','LIYUE_XINGQIU_E','RX_VAPORIZE_HYDRO'],['MON_SLIME_HYDRO','MOND_KAEYA','MOND_KAEYA_E','RX_FROZEN'],['MON_SLIME_PYRO','LIYUE_NINGGUANG','LIYUE_NINGGUANG_E','RX_CRYSTALLIZE'],['MON_SLIME_DENDRO','MOND_BENNETT','MOND_BENNETT_E','RX_BURNING']])test(id+' non-immune '+rx+' retains its native effect',()=>{
 const {r,b,t,actor}=native(id,[owner]),hp=t.hp,a=actor(owner);cast(r,a,card,t);assert(b.log.some(x=>x.target===t.name&&x.reaction===rx));assert(t.hp<hp);
 if(rx==='RX_FROZEN')assert(t.statuses.some(x=>x.id==='STATUS_FREEZE'));
 if(rx==='RX_CRYSTALLIZE')assert(a.shields.some(x=>x.source==='RX_CRYSTALLIZE'));
 if(rx==='RX_BURNING'){const before=t.hp;r.roundEnd();assert(t.hp<before,'Pyro burning damage is not suppressed by Dendro immunity');}
 return {reaction:rx,packets:cp(packets(b,t))};
});

test('legal persistent field and summon attacks respect slime and mage immunity',()=>{
 const cases=[['MON_SLIME_CRYO','MOND_KAEYA','MOND_KAEYA_Q','START'],['MON_SLIME_ELECTRO','MOND_LISA','MOND_LISA_Q','END'],['MON_SLIME_PYRO','LIYUE_XIANGLING','LIYUE_XIANGLING_E','END'],['MON_ABYSS_MAGE_HYDRO','MOND_MONA','MOND_MONA_E','END']];
 const evidence=[];
 for(const [id,owner,card,timing] of cases){const {r,b,t,actor}=native(id,[owner]),a=actor(owner),hp=t.hp,sh=shield(t);cast(r,a,card,t);const start=b.log.length;if(timing==='START')b.round++;r.tickFields(timing);
  assert.equal(t.hp,hp,id+' immune field HP');assert.equal(shield(t),sh,id+' immune field shield');const pp=packets(b,t,start);assert(pp.some(x=>x.immune),id+' field produces blocked packet');evidence.push({id,card,timing,packets:cp(pp)});
 }
 return evidence;
});

test('existing boss immunity chain and ordinary enemy damage are preserved',()=>{
 const andrius={source:'BOSS_ANDRIUS'},anemo={source:'FB_ANEMO_HYPOSTASIS',fb:{}},hydro={source:'FB_OCEANID',fb:{}};
 assert(definitions.hasElementImmunity(andrius,'CRYO'));assert(definitions.hasElementImmunity(andrius,'ANEMO'));assert(!definitions.hasElementImmunity(andrius,'PYRO'));
 assert(definitions.hasElementImmunity(anemo,'ANEMO'));assert(definitions.hasElementImmunity(hydro,'HYDRO'));
 assert(!definitions.hasElementImmunity({source:'MON_HILI_FIGHTER',nativeAura:'불'},'PYRO'));
 const {r,b,t,actor}=native('MON_HILI_FIGHTER',['MOND_BENNETT']),hp=t.hp;cast(r,actor('MOND_BENNETT'),'MOND_BENNETT_E',t);assert(t.hp<hp);assert(packets(b,t).some(x=>x.damage>0));return {ordinaryDamage:hp-t.hp};
});

const report={version:'0.16.18',total:checks.length,passed:checks.filter(x=>x.ok).length,nativeSlimeIds:slimeIds.filter(id=>id!=='MON_SLIME_LARGE_DENDRO'),checks};
if(process.env.ELEMENT_IMMUNITY_REPORT){const fs=require('node:fs'),path=require('node:path');fs.mkdirSync(path.dirname(process.env.ELEMENT_IMMUNITY_REPORT),{recursive:true});fs.writeFileSync(process.env.ELEMENT_IMMUNITY_REPORT,JSON.stringify(report,null,2)+'\n');}
if(report.total!==report.passed)process.exitCode=1;
