'use strict';
// Full native load order and authored/domain actors. Fixed RNG and isolated packet
// boundaries test reaction rules, not encounter success or acquisition time.
const assert=require('node:assert/strict');
const {fresh,R,db,c,fs,path}=require('./helpers_v011.cjs');
const H=require('../tools/audit_protagonist_v01618.cjs');
const plain=x=>JSON.parse(JSON.stringify(x)),results=[];
const actor=(r,id)=>r.s.runtime.actors.find(a=>a.source===id);
const status=(a,id)=>a.statuses.find(s=>s.id===id);
const packets=(r,start=0)=>r.s.runtime.log.slice(start).filter(x=>Object.hasOwn(x,'damage'));
function check(name,fn){if(process.env.REACTION_FILTER&&!name.includes(process.env.REACTION_FILTER))return;try{const evidence=fn();results.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function ready(r){r.autoUntilPlayer=()=>{};r.die=()=>1;r.random=()=>.5;return r;}
function arena(owners=[],{level=10,group='EG_LIYUE_HILI_ROCK',equip,cons={}}={}){
 const r=fresh('MAP_LIYUE_PLAINS','ROUTE_ISEKAI');
 [...new Set(owners)].forEach((id,i)=>{r.adminApply({op:'recruit',char:id});r.action('PARTY',{char:id,slot:i+2});});
 r.adminApply({op:'level',target:'ALL',value:level});
 if(equip)r.action('EQUIP',{slot:r.giveEquipment(equip),owner:'PLAYER_CUSTOM'});
 for(const[id,n]of Object.entries(cons)){r.giveItem('STELLA_'+id,n);for(let i=0;i<n;i++)r.action('CONSTELLATION_UNLOCK',{char:id});}
 ready(r);r.startBattle(group,'EXPLICIT');return r;
}
function target(r){return r.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.source==='MON_HILI_FIGHTER')||r.s.runtime.actors.find(a=>a.side==='ENEMY'&&!a.shields.length);}
function cast(r,a,id,t,branch='TAP'){
 const card=r.actorCards(a).find(x=>x.id===id);assert(card,id+' installed');assert.equal(r.cardReason(a,card),'',id+' available');
 assert(r.cardTargets(a,card).some(x=>x.id===t.id),id+' legal target');r.executeCard(a,card,t.id,branch);
}
function freeze(r,t){cast(r,actor(r,'LIYUE_XINGQIU'),'LIYUE_XINGQIU_E',t);cast(r,actor(r,'MOND_KAEYA'),'MOND_KAEYA_E',t);assert(status(t,'STATUS_FREEZE'),'native Hydro/Cryo cards freeze');return t.controlGuard;}
function reload(r){return ready(new R(db,plain(JSON.parse(r.serialize()))));}
function tiny(r,a,t,element,options={}){return r.damage(a,t,.01,element,{sureHit:true,noCrit:true,range:'전장',...options});}
function near(r,t){return r.nearbyTargets(t,t.side).filter(x=>x!==t);}
function nativeSlime(id,owners){
 const probe=fresh(),groups=[...new Set(probe.rows('49_ENCOUNTER_MEMBER_DB').filter(row=>row[3]===id).map(row=>row[1]))];
 for(const group of groups){try{const r=arena(owners,{level:1,group});if(actor(r,id))return r;}catch{}}
 throw Error('No native encounter for '+id);
}

for(const restore of [false,true])check('Pyro Melt spends real Frozen and keeps control grace'+(restore?' after restore':''),()=>{
 let r=arena(['LIYUE_XINGQIU','MOND_KAEYA','MOND_BENNETT']),t=target(r);const guard=freeze(r,t);
 if(restore){const id=t.id;r=reload(r);t=r.s.runtime.actors.find(x=>x.id===id);}
 const at=r.s.runtime.log.length;cast(r,actor(r,'MOND_BENNETT'),'MOND_BENNETT_E',t);
 assert(t.hp>0);assert(packets(r,at).some(x=>x.target===t.name&&x.reaction==='RX_MELT_PYRO'));assert(!status(t,'STATUS_FREEZE'));
 assert.equal(t.controlGuard,guard);assert.equal(r.applyCombatControl(actor(r,'MOND_KAEYA'),t,'FREEZE',{element:'얼음'}),false);assert(!r.combatActionLocked(t));
 return {restore,guard,meltSpentFrozen:true};
});

for(const[id,element,options]of[
 ['MOND_DILUC','PHYSICAL',{card:'PLAYER_BASIC_ATTACK'}],
 ['MOND_DILUC','PYRO',{card:'PLAYER_BASIC_ATTACK'}],
 ['MOND_DILUC','PYRO',{card:'MOND_DILUC_E'}],
 ['MOND_NOELLE','PHYSICAL',{card:'PLAYER_BASIC_ATTACK',noAura:true}],
 ['MOND_KLEE','PYRO',{card:'PLAYER_BASIC_ATTACK'}],
 ['MOND_KLEE','PYRO',{card:'MOND_KLEE_E'}],
 ['LIYUE_GAMING','PYRO',{card:'LIYUE_GAMING_E'}],
 ['LIYUE_NINGGUANG','GEO',{card:'LIYUE_NINGGUANG_E'}],
 ['MOND_EULA','CRYO',{card:'MOND_EULA_E'}],
 ['MOND_EULA','CRYO',{card:'MOND_EULA_Q'}],
 ['MOND_EULA','PHYSICAL',{card:'MOND_EULA_Q',sourceKind:'LIGHTFALL_EXPLOSION'}],
])check('confirmed blunt hit spends Frozen: '+id+'/'+(options.sourceKind||options.card)+'/'+element+(options.noAura?'/noAura':''),()=>{
 const r=arena(['LIYUE_XINGQIU','MOND_KAEYA',id]),t=target(r),guard=freeze(r,t),a=actor(r,id),at=r.s.runtime.log.length;
 tiny(r,a,t,element,options);const p=packets(r,at);
 assert(p.some(x=>x.target===t.name&&x.reaction==='RX_SHATTER'&&x.sourceKind==='REACTION'&&x.element==='물리'));
 assert(!p.some(x=>x.reaction==='RX_MELT_PYRO'));assert(!status(t,'STATUS_FREEZE'));assert.equal(t.controlGuard,guard);
 assert.equal(p.filter(x=>x.target===t.name&&x.sourceKind==='REACTION').length,1);
 return {card:options.card,element,shatterPacket:plain(p.find(x=>x.sourceKind==='REACTION'))};
});

check('native claymore basicHit really Shatters without charged tags',()=>{
 const r=arena(['LIYUE_XINGQIU','MOND_KAEYA','MOND_DILUC']),t=target(r);freeze(r,t);const at=r.s.runtime.log.length;
 r.basicHit(actor(r,'MOND_DILUC'),t);assert(packets(r,at).some(x=>x.sourceKind==='REACTION'&&x.reaction==='RX_SHATTER'));assert(!status(t,'STATUS_FREEZE'));
});

check('native Eula hold distinguishes its blunt slash from both nonblunt followups',()=>{
 const r=arena(['LIYUE_XINGQIU','MOND_KAEYA','MOND_EULA']),t=target(r),a=actor(r,'MOND_EULA');freeze(r,t);
 // Existing two-stack state isolates the native HOLD branch; no actor damage stats are replaced.
 r.addCombatStatus(a,'EULA_GRIMHEART',null,{stacks:2,mods:{def:{pct:20}},staggerResist:true});
 const damage=r.damage,blunt=[];r.damage=function(owner,foe,k,element,options){if(owner===a&&foe===t)blunt.push(this.combatBluntHit(owner,element,options));return damage.call(this,owner,foe,k,element,options);};
 const at=r.s.runtime.log.length;cast(r,a,'MOND_EULA_E',t,'HOLD');assert.deepEqual(blunt,[true,false,false]);
 assert(packets(r,at).some(x=>x.actor===a.name&&x.target===t.name));assert(!status(t,'STATUS_FREEZE'));
 assert.equal(packets(r,at).filter(x=>x.target===t.name&&x.sourceKind==='REACTION'&&x.reaction==='RX_SHATTER').length,1);
});

for(const[id,element,options]of[
 ['LIYUE_GANYU','CRYO',{tags:['강공','HEAVY'],card:'LIYUE_GANYU_E'}],
 ['MOND_LISA','ELECTRO',{tags:['강공','HEAVY'],card:'MOND_LISA_E',noAura:true}],
 ['MOND_KAEYA','PHYSICAL',{tags:['강공','HEAVY'],card:'PLAYER_BASIC_ATTACK'}],
 ['LIYUE_GAMING','PYRO',{card:'LIYUE_GAMING_Q'}],
 ['MOND_EULA','CRYO',{card:'MOND_EULA_E',noAura:true,blunt:false}],
])check('nonblunt charged or nonblunt followup does not Shatter: '+id+'/'+options.card,()=>{
 const r=arena(['LIYUE_XINGQIU','MOND_KAEYA',id]),t=target(r);freeze(r,t);const at=r.s.runtime.log.length;tiny(r,actor(r,id),t,element,options);
 assert(!packets(r,at).some(x=>x.sourceKind==='REACTION'&&x.reaction==='RX_SHATTER'));
 if(element!=='PYRO')assert(status(t,'STATUS_FREEZE'));
 else assert(packets(r,at).some(x=>x.reaction==='RX_MELT_PYRO'));
});

check('actual equipped weapon and saved co-op weapon decide blunt normal attacks',()=>{
 const r=arena(['LIYUE_XINGQIU','MOND_KAEYA'],{equip:'EQ_CLAYMORE_DEBATE'}),p=actor(r,'PLAYER_CUSTOM');
 assert(r.combatBluntHit(p,'물리',{card:'PLAYER_BASIC_ATTACK'}));
 const guest=fresh('MAP_MOND_PLAINS','ROUTE_ISEKAI');guest.adminApply({op:'level',target:'ALL',value:10});guest.action('EQUIP',{slot:guest.giveEquipment('EQ_CRPG_TRAINING_BOW'),owner:'PLAYER_CUSTOM'});
 const snap=guest.coopSnapshot('PLAYER_CUSTOM'),a=r.coopGuestActor({coop:{id:'COOP_1',pid:'aabbccdd0011',name:'검사 손님',snap}});
 assert.equal(r.consWeaponType(a),'활');assert.equal(r.combatBluntHit(a,'물리',{card:'PLAYER_BASIC_ATTACK'}),false,'guest never inherits host claymore');
 r.s.runtime.coop={version:1,room:'R16901690',benched:[],turn:null};r.initCombatActor(a,3);r.s.runtime.actors.push(a);
 const copy=reload(r),g=copy.s.runtime.actors.find(x=>x.id==='COOP_1');assert.equal(copy.combatBluntHit(g,'물리',{card:'PLAYER_BASIC_ATTACK'}),false);
});

check('actual Baron Bunny explosion is blunt; Amber arrows are not',()=>{
 const r=arena(['LIYUE_XINGQIU','MOND_KAEYA','MOND_AMBER']),t=target(r),a=actor(r,'MOND_AMBER');freeze(r,t);
 const card=r.actorCards(a).find(x=>x.id==='MOND_AMBER_E');assert.equal(r.cardReason(a,card),'');r.executeCard(a,card,t.id);
 const bunny=r.s.runtime.fields.find(x=>x.kind==='BUNNY');assert(bunny);const at=r.s.runtime.log.length;r.explodeBunny(bunny);
 assert(packets(r,at).some(x=>x.target===t.name&&x.sourceKind==='REACTION'&&x.reaction==='RX_SHATTER'));
 assert(!r.combatBluntHit(a,'불',{card:'PLAYER_BASIC_ATTACK',tags:['강공']}));
});

check('miss and expired target never spend Frozen or create a Shatter packet',()=>{
 const r=arena(['LIYUE_XINGQIU','MOND_KAEYA','MOND_DILUC']),t=target(r),a=actor(r,'MOND_DILUC');freeze(r,t);r.die=()=>100;
 const at=r.s.runtime.log.length;assert.equal(r.damage(a,t,.01,'PHYSICAL',{noCrit:true,card:'PLAYER_BASIC_ATTACK'}),false);assert(status(t,'STATUS_FREEZE'));assert(!packets(r,at).length);
 // Dead actor comes from the same native encounter, only lifecycle state is completed here.
 r.applyDamage(a,t,t.hp,{element:'물리'});const deadAt=r.s.runtime.log.length;assert.equal(tiny(r,a,t,'PHYSICAL',{card:'PLAYER_BASIC_ATTACK'}),false);assert.equal(r.s.runtime.log.length,deadAt);
});

function formulaArena(level,id,talent,cons=0){
 const r=H.setup({R,db,api:c.CRPGRuntime},{level,team:[id],gear:'craft',enhance:3,talent,map:'MAP_D163_TAISHAN_MANSION'});
 if(cons){r.giveItem('STELLA_'+id,cons);for(let i=0;i<cons;i++)r.action('CONSTELLATION_UNLOCK',{char:id});}
 ready(r);r.startBattle('EG_LIYUE_HILI_ROCK','EXPLICIT');return r;
}
function measuredFormula(r,a,t,k,element,card,{quicken=false,skillBoost=false,rawAdd=0,critical=false}={}){
 if(quicken)r.addCombatStatus(t,'QUICKEN',2);if(skillBoost)r.addCombatStatus(a,'SKILL_COEFF',2);
 const options={sureHit:true,noCrit:!critical,range:'전장',card,rawAdd},rx=r.reactionFor(t,element),talent=r.premiumTalentMultiplier(a,r.premiumHitKind(a,options));
 const direct=(r.combatStat(a,'atk')*k+rawAdd)*(skillBoost?1.3:1)*talent;
 const addition=quicken?r.reactionBase(a)*Number(rx[7]):0;
 const common=r.combatDamageMultiplier(a,t,element,options)/talent*(t.slotDamageMultiplier||1)*(t.guard?.5:1)*100/(100+r.combatStat(t,'def'))*(critical?1+r.combatStat(a,'critDmg')/100:1);
 const expected=Math.max(1,(direct+addition)*common),at=r.s.runtime.log.length;
 r.damage(a,t,k,element,options);const hit=packets(r,at).find(x=>x.target===t.name&&!x.sourceKind);assert(hit,'primary hit logged');assert.equal(hit.reaction,rx?.[0]||null);
 assert(Math.abs(hit.damage-Math.round(expected))<=1,JSON.stringify({expected,actual:hit.damage,direct,addition,common,talent}));
 return {talent,damage:hit.damage,expected,base:r.reactionBase(a),addition,common};
}

for(const level of [30,50,60])for(const[id,element,card,rx]of[
 ['MOND_LISA','번개','MOND_LISA_E','RX_AGGRAVATE'],['LIYUE_BAIZHU','풀','LIYUE_BAIZHU_E','RX_SPREAD'],
])check('direct talent scales but '+rx+' addition does not at level '+level,()=>{
 const evidence=[];
 for(const talent of [1,4,7,10].filter(n=>n<=c.CRPGRuntime.growthV01522.talentCaps[c.CRPGRuntime.growthV01522.phaseFor(level)])){
  const values=[];for(const quicken of [false,true]){const r=formulaArena(level,id,talent),a=actor(r,id),t=r.s.runtime.actors.find(x=>x.side==='ENEMY'&&!x.shields.length);values.push(measuredFormula(r,a,t,.1,element,card,{quicken}));}
  assert(Math.abs((values[1].damage-values[0].damage)-values[1].addition*values[1].common)<=1);
  evidence.push({baseTalent:talent,actualTalent:values[0].talent,directDamage:values[0].damage,quickenDamage:values[1].damage,additionDamage:values[1].addition*values[1].common});
 }
 assert(evidence.length>=2);assert(evidence.at(-1).directDamage>evidence[0].directDamage);assert(Math.abs(evidence.at(-1).additionDamage-evidence[0].additionDamage)<1e-8);
 return evidence;
});

check('skill coefficient affects direct damage only, with legal C3/C5 levels and saved guest talent snapshot',()=>{
 const evidence=[];
 for(const[id,element,card,cons]of[['MOND_LISA','번개','MOND_LISA_E',5],['LIYUE_BAIZHU','풀','LIYUE_BAIZHU_Q',3]]){
  const r=formulaArena(60,id,10,cons),a=actor(r,id),t=r.s.runtime.actors.find(x=>x.side==='ENEMY'&&!x.shields.length);
  const kind=r.premiumHitKind(a,{card}),levels=r.talentLevels(id);assert.equal(levels[kind],13,'native constellation raises its actual E/Q by three');
  evidence.push(measuredFormula(r,a,t,.1,element,card,{quicken:true,skillBoost:true,rawAdd:40}));
  const snap=r.coopSnapshot(id),guest=r.coopGuestActor({coop:{id:'COOP_1',pid:'aabbccdd0011',name:'검사 동료',snap}});
  assert.equal(guest.talentSnapshot[kind],13);r.initCombatActor(guest,3);r.s.runtime.coop={version:1,room:'R16901691',benched:[],turn:null};r.s.runtime.actors.push(guest);
  const copy=reload(r),g=copy.s.runtime.actors.find(x=>x.id==='COOP_1'),gt=copy.s.runtime.actors.find(x=>x.side==='ENEMY'&&x.hp>0&&!x.shields.length);assert(gt,'guest tests a surviving native enemy');
  evidence.push(measuredFormula(copy,g,gt,.1,element,card,{quicken:true,skillBoost:true}));
 }
 return evidence;
});

check('additive hit still shares native critical damage, defense and constellation damage bonus',()=>{
 const r=formulaArena(60,'MOND_LISA',10,6),a=actor(r,'MOND_LISA'),t=target(r);r.addCombatStatus(t,'STATUS_DEF_DOWN',2,{value:15});
 const v=measuredFormula(r,a,t,.1,'번개','MOND_LISA_E',{quicken:true,critical:true});
 assert(packets(r).some(x=>x.target===t.name&&x.reaction==='RX_AGGRAVATE'&&x.critical));return v;
});

for(const id of ['MON_SLIME_CRYO','MON_SLIME_LARGE_CRYO'])check('Superconduct Cryo damage immunity still applies physical vulnerability: '+id,()=>{
 const r=nativeSlime(id,['MOND_LISA']),a=actor(r,'MOND_LISA'),t=actor(r,id),at=r.s.runtime.log.length;
 cast(r,a,'MOND_LISA_E',t);assert(t.hp>0);assert(status(t,'PHYS_VULN'));
 const p=packets(r,at).filter(x=>x.target===t.name&&x.element==='얼음');assert(p.length);assert(p.every(x=>x.damage===0&&x.immune));
 const hp=t.hp;r.applyDamage(a,t,20,{element:'물리'});assert.equal(hp-t.hp,25,'existing physical bonus retained');return {id,immuneDamage:0,physicalBonus:25};
});

for(const element of ['물','불'])check('Swirl preserves '+element+' spread and correct neighboring packet scope',()=>{
 const r=arena(['MOND_SUCROSE']),t=actor(r,'MON_HILI_SHOOTER'),a=actor(r,'MOND_SUCROSE'),neighbors=near(r,t);assert(neighbors.length);
 r.applyCombatAura(a,t,element);const at=r.s.runtime.log.length;tiny(r,a,t,'ANEMO',{card:'MOND_SUCROSE_E'});
 const p=packets(r,at).filter(x=>x.sourceKind==='REACTION'&&x.reaction==='RX_SWIRL');assert(p.some(x=>x.target===t.name&&x.element===element));
 for(const q of neighbors){assert(r.auraList(q).some(x=>x.element===element));if(element==='물')assert(!p.some(x=>x.target===q.name));else assert(p.some(x=>x.target===q.name));}
 assert.equal(r._reactionChain,null);return {element,neighbors:neighbors.length,packets:plain(p)};
});

for(const restore of [false,true])check('Crystallize absorbs 2.5 times its own element'+(restore?' after restore':''),()=>{
 let r=arena(['LIYUE_NINGGUANG']),a=actor(r,'LIYUE_NINGGUANG'),t=target(r);r.applyCombatAura(a,t,'물');tiny(r,a,t,'GEO',{card:'LIYUE_NINGGUANG_E'});
 let shield=a.shields.find(x=>x.source==='RX_CRYSTALLIZE');assert(shield);assert.equal(shield.damageMultipliers['물'],.4);const original=shield.value;
 if(restore){r=reload(r);a=actor(r,'LIYUE_NINGGUANG');t=target(r);shield=a.shields.find(x=>x.source==='RX_CRYSTALLIZE');}
 const beforeHp=a.hp;r.applyDamage(t,a,100,{element:'물'});assert.equal(shield.value,original-40);assert.equal(a.hp,beforeHp);
 const current=shield.value;r.applyDamage(t,a,100,{element:'불'});assert.equal(shield.value,current-100);assert.equal(a.hp,beforeHp);
 return {restore,original,sameElementDrain:40,otherElementDrain:100};
});

for(const element of ['물','얼음'])check('Burning is extinguished only by Hydro in the existing model: '+element,()=>{
 const finishing=element==='물'?'LIYUE_XINGQIU':'MOND_KAEYA',r=arena(['LIYUE_BAIZHU','MOND_BENNETT',finishing]),t=target(r),a=actor(r,'MOND_BENNETT');
 r.applyCombatAura(actor(r,'LIYUE_BAIZHU'),t,'풀');r.applyCombatAura(a,t,'불');assert(status(t,'STATUS_BURN'));
 const at=r.s.runtime.log.length;r.applyCombatAura(actor(r,finishing),t,element);assert.equal(!!status(t,'STATUS_BURN'),element!=='물');
 if(element==='물')assert(r.s.runtime.log.slice(at).some(x=>x.reaction==='RX_VAPORIZE_HYDRO'));
 const ticks=r.s.runtime.log.length;r.tickFields('END');assert.equal(packets(r,ticks).some(x=>x.target===t.name&&x.sourceKind==='REACTION_DOT'&&x.reaction==='RX_BURNING'),element!=='물');
});

for(const restore of [false,true])check('sixth shared Dendro Core detonates the oldest owner, preserves five and object sequence'+(restore?' after restore':''),()=>{
 let r=arena(['LIYUE_BAIZHU','LIYUE_XINGQIU']),t=target(r),d=actor(r,'LIYUE_BAIZHU'),h=actor(r,'LIYUE_XINGQIU');
 // Native elemental applications create each core; alternate the triggering owner.
 for(let i=0;i<5;i++){if(i%2){r.applyCombatAura(d,t,'풀');r.applyCombatAura(h,t,'물',{card:'LIYUE_XINGQIU_E'});}else{r.applyCombatAura(h,t,'물');r.applyCombatAura(d,t,'풀',{card:'LIYUE_BAIZHU_E'});}}
 let cores=r.s.runtime.fields.filter(x=>x.kind==='DENDRO_CORE');assert.equal(cores.length,5);const first=plain(cores[0]),lastId=cores.at(-1).id,sequence=r.s.runtime.objectSequence;
 if(restore){r=reload(r);t=target(r);d=actor(r,'LIYUE_BAIZHU');h=actor(r,'LIYUE_XINGQIU');}
 const at=r.s.runtime.log.length;r.applyCombatAura(d,t,'풀');r.applyCombatAura(h,t,'물',{card:'LIYUE_XINGQIU_E'});
 cores=r.s.runtime.fields.filter(x=>x.kind==='DENDRO_CORE');assert.equal(cores.length,5);assert(!cores.some(x=>x.id===first.id));assert(cores.some(x=>x.id===lastId));
 assert.equal(r.s.runtime.objectSequence,sequence+1);assert.equal(new Set(cores.map(x=>x.id)).size,5);
 const owner=r.s.runtime.actors.find(x=>x.id===first.actor),p=packets(r,at).filter(x=>x.sourceKind==='REACTION'&&x.reaction==='RX_BLOOM');assert(p.length);assert(p.every(x=>x.actor===owner.name));
 const expected=Math.round(first.reactionBase*2*r.combatDamageMultiplier(owner,t,'풀',{reaction:'RX_BLOOM',sourceKind:'REACTION'}));
 assert(p.some(x=>x.target===t.name&&x.damage===expected));
 return {restore,firstOwner:owner.source,coreCount:5,firstDetonated:first.id,lastPreserved:lastId};
});

check('legacy six-core state normalizes on the next creation; other object kinds have no five-object cap',()=>{
 const r=arena(['LIYUE_BAIZHU']),t=target(r),a=actor(r,'LIYUE_BAIZHU');
 for(let i=0;i<5;i++)r.addCombatObject('DENDRO_CORE',a,2,{position:plain(t.position),reactionBase:r.reactionBase(a)});
 const old=plain(r.s.runtime.fields[0]);old.id+='-LEGACY';r.s.runtime.fields.push(old);const copy=reload(r);assert.equal(copy.s.runtime.fields.filter(x=>x.kind==='DENDRO_CORE').length,6,'stored objects are not rewritten during load');
 copy.addCombatObject('DENDRO_CORE',actor(copy,'LIYUE_BAIZHU'),2,{position:plain(target(copy).position),reactionBase:copy.reactionBase(actor(copy,'LIYUE_BAIZHU'))});
 assert.equal(copy.s.runtime.fields.filter(x=>x.kind==='DENDRO_CORE').length,5);
 for(let i=0;i<6;i++)copy.addCombatObject('KLEE_MINE',actor(copy,'LIYUE_BAIZHU'),2);assert.equal(copy.s.runtime.fields.filter(x=>x.kind==='KLEE_MINE').length,6);
});

check('Electro-Charged keeps its existing deferred coefficient and ownership',()=>{
 const r=arena(['LIYUE_XINGQIU','MOND_LISA']),t=target(r),a=actor(r,'MOND_LISA');r.applyCombatAura(actor(r,'LIYUE_XINGQIU'),t,'물');
 const at=r.s.runtime.log.length;r.applyCombatAura(a,t,'번개');const dot=status(t,'STATUS_ELECTROCHARGED');assert(dot);assert.equal(dot.actor,a.id);assert.equal(dot.reactionTick,r.reactionBase(a)*1.2);
 assert(!packets(r,at).length,'no advance payment');const expected=Math.round(dot.reactionTick*r.combatDamageMultiplier(a,t,'번개',{reaction:'RX_ELECTROCHARGED',sourceKind:'REACTION_DOT'})),ticks=r.s.runtime.log.length;r.tickFields('END');const p=packets(r,ticks).filter(x=>x.target===t.name&&x.sourceKind==='REACTION_DOT');assert.equal(p.length,1);assert.equal(p[0].damage,expected);
 return {coefficient:1.2,advanceDamage:0,firstEndTick:p[0].damage};
});

const report={ok:!process.exitCode,total:results.length,passed:results.filter(x=>x.ok).length,tests:results};
if(process.env.REACTION_FIX_REPORT){fs.mkdirSync(path.dirname(process.env.REACTION_FIX_REPORT),{recursive:true});fs.writeFileSync(process.env.REACTION_FIX_REPORT,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({ok:report.ok,total:report.total,passed:report.passed}));
