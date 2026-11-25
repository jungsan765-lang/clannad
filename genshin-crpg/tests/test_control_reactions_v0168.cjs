'use strict';
// Full product load order. Fixtures recruit/equip through native rules and retain native combat stats.
// Isolated turn boundaries, fixed RNG and explicit damage packets separate lifecycle/math from balance.
const assert=require('node:assert/strict');
const {fresh,R,db,c}=require('./helpers_v011.cjs');
const plain=x=>JSON.parse(JSON.stringify(x)),results=[];
function test(name,fn){if(process.env.CONTROL_FILTER&&!name.includes(process.env.CONTROL_FILTER))return;try{const evidence=fn();results.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function recruit(r,ids){ids.forEach((source,i)=>{r.adminApply({op:'recruit',char:source});r.s.party[i+1]={slot:'PARTY_'+(i+2),type:'CHAR',source,active:true,control:'AI',tactic:'균형'};});}
function arena(ids=[],cons={},role,equip){const r=fresh('MAP_LIYUE_PLAINS','ROUTE_ISEKAI');recruit(r,ids);r.adminApply({op:'level',target:'ALL',value:40});r.s.constellations={...cons};if(role)r.s.party[1].tactic=role;if(equip)r.equip(r.giveEquipment(equip),'PLAYER_CUSTOM');r.startBattle('EG_LIYUE_HILI_ROCK','RANDOM');r.die=()=>100;r.random=()=>.5;return {r,b:r.s.runtime,p:r.s.runtime.actors.find(a=>a.source==='PLAYER_CUSTOM'),e:r.s.runtime.actors.find(a=>a.side==='ENEMY'&&!a.shields.length)};}
const owner=(b,id)=>b.actors.find(a=>a.source===id),card=(r,a,id)=>r.actorCards(a).find(c=>c.id===id);
function cast(r,a,id,target){const def=card(r,a,id);assert(def,id+' exists');r.executeCard(a,def,target?.id);}
function packets(b,start=0){return Array.from(b.log).slice(start).filter(e=>Object.hasOwn(e,'damage'));}
function enemyTurn(r,a){if(r.combatOpening())r.beginCombat();const b=r.s.runtime,p=owner(b,'PLAYER_CUSTOM');b.round++;b.order=[{id:a.id},{id:p.id}];b.cursor=0;b.turnStarted=null;r.autoUntilPlayer();assert.equal(b.order[b.cursor].id,p.id);}
function branchArena(ids){const initial=JSON.parse(arena(ids).r.serialize());return cons=>{const s=plain(initial);s.constellations={...cons};const r=new R(db,s),b=r.s.runtime;r.die=()=>100;r.random=()=>.5;return{r,b,p:owner(b,'PLAYER_CUSTOM'),e:b.actors.find(a=>a.side==='ENEMY'&&!a.shields.length)};};}
function runs(seq){const out=[];for(const x of seq){if(out.at(-1)?.kind===x)out.at(-1).count++;else out.push({kind:x,count:1});}return out;}

test('C04: rejected C4 petrify cannot extend the existing lock or its guard',()=>{
 const evidence=[];
 for(const cons of [0,4]){
  const {r,b}=arena(['LIYUE_ZHONGLI','LIYUE_CHONGYUN'],{LIYUE_ZHONGLI:cons,LIYUE_CHONGYUN:2}),e=b.actors.find(a=>a.side==='ENEMY');r.die=()=>1;
  const z=owner(b,'LIYUE_ZHONGLI'),ch=owner(b,'LIYUE_CHONGYUN');cast(r,ch,'LIYUE_CHONGYUN_E',e);cast(r,z,'LIYUE_ZHONGLI_Q',e);
  assert.equal(z.cooldowns.LIYUE_ZHONGLI_Q,2,'Chongyun C2 cuts the native cooldown');
  const status=e.statuses.find(s=>s.id==='LIYUE_PETRIFY');assert(status);assert.equal(status.untilTurn,e.turns+(cons===4?3:2));const held=plain(status),guard=e.controlGuard;
  // Two real Zhongli turn starts cool his burst; foe turn 2 remains held under C4.
  r.aiTurn=a=>{a.guard=true;};enemyTurn(r,z);enemyTurn(r,z);assert.equal(z.cooldowns.LIYUE_ZHONGLI_Q,0);e.turns=2;
  cast(r,z,'LIYUE_ZHONGLI_Q',e);assert.deepEqual(plain(status),held);assert.equal(e.controlGuard,guard);
  assert.equal(r.addCombatStatus(e,'STATUS_FREEZE',1),null,'cross-control refresh is also refused');e.turns=held.untilTurn;e.statuses=e.statuses.filter(s=>!s.untilTurn||s.untilTurn>e.turns);
  assert.equal(r.addCombatStatus(e,'STATUS_STUN',1),null,'two free own turns remain protected');e.turns=guard;assert(r.addCombatStatus(e,'STATUS_STUN',1),'new control lands after the guard');evidence.push({cons,untilTurn:held.untilTurn,guard});
 }
 return evidence;
});

test('C04: native AI C4 + cooldown reduction never takes three consecutive foe turns',()=>{
 const {r,b}=arena(['LIYUE_ZHONGLI','LIYUE_CHONGYUN'],{LIYUE_ZHONGLI:4,LIYUE_CHONGYUN:2}),e=b.actors.find(a=>a.side==='ENEMY');r.die=()=>1;
 const z=owner(b,'LIYUE_ZHONGLI'),ch=owner(b,'LIYUE_CHONGYUN');cast(r,ch,'LIYUE_CHONGYUN_E',e);
 const seq=[],prior=r.onCombatTurnStart;r.onCombatTurnStart=function(a){prior.call(this,a);if(a.id===e.id)seq.push(this.combatActionLocked(a)?'skip':'act');};
 r.aiTurn=function(a){if(a.id===z.id&&!this.cardReason(a,card(this,a,'LIYUE_ZHONGLI_Q')))cast(this,a,'LIYUE_ZHONGLI_Q',this.s.runtime.actors.find(x=>x.id===e.id));else if(a.id===ch.id&&!this.cardReason(a,card(this,a,'LIYUE_CHONGYUN_E')))cast(this,a,'LIYUE_CHONGYUN_E',this.s.runtime.actors.find(x=>x.id===e.id));else a.guard=true;};
 r.action('COMBAT_BEGIN');for(let n=0;r.s.runtime&&r.s.runtime.round<10&&n<30;n++)r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});
 assert(seq.includes('skip'));for(const [i,x]of runs(seq).entries()){if(x.kind==='skip')assert(x.count<=2,seq.join(','));if(x.kind==='act'&&i>0&&i<runs(seq).length-1)assert(x.count>=2,seq.join(','));}return seq;
});

test('C05: actual Dahlia turn-start contact freezes only that turn, including after restore',()=>{
 for(const restore of [false,true]){
  let r=fresh('MAP_DRAGONSPINE');recruit(r,['MOND_DAHLIA','MOND_KAEYA']);r.startBattle('EG_DRAGON_CRYO','EXPLICIT');r.die=()=>1;r.random=()=>.5;
  // Use the native nonimmune shooter with actual Kaeya-applied Cryo; an elemental body cannot freeze itself.
  let b=r.s.runtime,e=b.actors.find(a=>a.source==='MON_HILI_CRYO_SHOOTER'),d=owner(b,'MOND_DAHLIA'),k=owner(b,'MOND_KAEYA');assert.equal(r.cardReason(k,card(r,k,'MOND_KAEYA_E')),'');cast(r,k,'MOND_KAEYA_E',e);cast(r,d,'MOND_DAHLIA_E',e);
  if(restore){r=new R(db,JSON.parse(r.serialize()));r.die=()=>1;r.random=()=>.5;b=r.s.runtime;e=b.actors.find(a=>a.source==='MON_HILI_CRYO_SHOOTER');}
  r.aiTurn=a=>{a.guard=true;};const before=e.turns;enemyTurn(r,e);const s=e.statuses.find(s=>s.id==='STATUS_FREEZE');assert(s);assert.equal(s.untilTurn,before+2,'current turn counted once');assert(r.combatActionLocked(e));assert.equal(r._combatTurnStartingActorId,undefined,'turn-start context does not leak');
  const skips=b.log.filter(x=>x.actor===e.name&&x.skipped).length;enemyTurn(r,e);assert(!r.combatActionLocked(e));assert.equal(b.log.filter(x=>x.actor===e.name&&x.skipped).length,skips,'next turn is free');assert.equal(r.addCombatStatus(e,'LIYUE_PETRIFY',1),null);enemyTurn(r,e);assert(r.addCombatStatus(e,'LIYUE_PETRIFY',1),'guard ends after two free turns begin');
 }
});

test('C05: repeated own-start control attempts preserve two complete free turns',()=>{
 const {r,b,e}=arena();r.aiTurn=a=>{a.guard=true;};const seq=[],prior=r.onCombatTurnStart;
 r.onCombatTurnStart=function(a){prior.call(this,a);if(a.id===e.id){this.addCombatStatus(a,'STATUS_STUN',1);seq.push(this.combatActionLocked(a)?'skip':'act');}};
 for(let n=0;n<7;n++)enemyTurn(r,e);
 assert.deepEqual(seq,['skip','act','act','skip','act','act','skip']);return seq;
});

test('C06: actual Baizhu C4 applies +30% once to reaction/DOT packets, never primary damage',()=>{
 const evidence=[];
 for(const role of [undefined,'연계우선']){
  const {r,b,p,e}=arena(['LIYUE_BAIZHU'],{LIYUE_BAIZHU:4},role);cast(r,owner(b,'LIYUE_BAIZHU'),'LIYUE_BAIZHU_Q',e);assert(p.statuses.some(s=>s.id==='CONS_BAIZHU_4'&&s.consDmg.pct===30));
  const n=b.log.length;r.applyDamage(p,e,100,{element:'얼음',reaction:'RX_SUPERCONDUCT',sourceKind:'REACTION'});r.applyDamage(p,e,100,{element:'얼음',reaction:'RX_SUPERCONDUCT',sourceKind:'REACTION_DOT'});r.applyDamage(p,e,100,{element:'번개',reaction:'RX_SUPERCONDUCT'});
  const values=packets(b,n).map(x=>x.damage);assert.deepEqual(values,[role?150:130,role?150:130,100]);evidence.push({role:role||'균형',values});
 }
 return evidence;
});

test('C06: superconduct primary attack and reaction use separate constellation contexts',()=>{
 const samples=[],branch=branchArena(['LIYUE_BAIZHU']);let base;
 for(const cons of [0,4]){
  const {r,b,p,e}=branch({LIYUE_BAIZHU:cons});base=r.reactionBase(p);cast(r,owner(b,'LIYUE_BAIZHU'),'LIYUE_BAIZHU_Q',e);r.setAura(e,'얼음');const start=b.log.length;
  r.damage(p,e,.65,'번개',{sureHit:true,noCrit:true,card:'PLAYER_BASIC_ATTACK'});samples.push(packets(b,start).filter(x=>x.target===e.name).map(x=>({damage:x.damage,sourceKind:x.sourceKind})));
 }
 assert.equal(samples[1][0].damage,samples[0][0].damage);assert.equal(samples[1][1].damage,Math.round(base*.5*1.3));assert.equal(samples[0][1].sourceKind,'REACTION');return samples;
});

test('C06: enclosing E-only damage and talent bonuses do not leak to its reaction packet',()=>{
 const samples=[],branch=branchArena(['MOND_KAEYA']);let base;
 for(const cons of [0,1]){
  const {r,b,e}=branch({MOND_KAEYA:cons});const a=owner(b,'MOND_KAEYA');base=r.reactionBase(a);r.s.talents={MOND_KAEYA:{na:1,e:10,q:1}};
  // Kaeya C1 is an NA-only crit bonus: use the common interpreter's E-only buff to isolate its context.
  r.addCombatStatus(a,'TEST_E_ONLY',2,{consDmg:{pct:cons?50:0,kind:'e'}});r.setAura(e,'번개');const start=b.log.length;
  r.damage(a,e,1,'얼음',{sureHit:true,noCrit:true,card:'MOND_KAEYA_E'});samples.push(packets(b,start).filter(x=>x.target===e.name).map(x=>x.damage));
 }
 assert(samples[1][0]>samples[0][0]);assert.equal(samples[1][1],samples[0][1],'reaction gets no enclosing E-only bonus');assert.equal(samples[0][1],Math.round(base*.5));return samples;
});

test('C06: melt/amplify and quicken/additive retain native math with reaction-only buffs',()=>{
 for(const setup of [{aura:'얼음',element:'불',rx:'RX_MELT_PYRO'},{aura:null,element:'번개',rx:'RX_AGGRAVATE'}]){
  const values=[],branch=branchArena(['LIYUE_BAIZHU']);for(const cons of [0,4]){const {r,b,p,e}=branch({LIYUE_BAIZHU:cons});cast(r,owner(b,'LIYUE_BAIZHU'),'LIYUE_BAIZHU_Q',e);if(setup.aura)r.setAura(e,setup.aura);else r.addCombatStatus(e,'QUICKEN',2);const at=b.log.length;r.damage(p,e,.65,setup.element,{sureHit:true,noCrit:true,card:'PLAYER_BASIC_ATTACK'});const hit=packets(b,at).find(x=>x.target===e.name);assert.equal(hit.reaction,setup.rx);values.push(hit.damage);}assert.equal(values[1],values[0],setup.rx);
 }
});

function raid(bossId='MON_RAID_GRADER',ids=['MOND_FISCHL','LIYUE_BAIZHU','MOND_BENNETT'],cons={}){
 const r=fresh('MAP_MOND_PLAINS','ROUTE_ISEKAI');recruit(r,ids);r.adminApply({op:'level',target:'ALL',value:40});r.s.constellations={...cons};const now=r.raidNow();r.raidServerEvent={id:'RAID_168',boss:bossId,startsAt:now-1000,endsAt:now+3600000,target:4000};r.action('RAID_ENTER');r.die=()=>100;r.random=()=>.5;const b=r.s.runtime;assert(b.raid);return{r,b,p:owner(b,'PLAYER_CUSTOM'),e:b.actors.find(a=>a.raidBoss)};
}

test('C07: actual E/Q initial and refresh Oz all get 2 attacks (C0) or 3 (C6)',()=>{
 const evidence=[];for(const cons of [0,6])for(const prior of [null,'MOND_FISCHL_E','MOND_FISCHL_Q'])for(const restore of [false,true]){
  let {r,b,e}=raid('MON_RAID_GRADER',['MOND_FISCHL'],{MOND_FISCHL:cons});let f=owner(b,'MOND_FISCHL');if(prior){cast(r,f,prior,e);r.tickFields('END');assert.equal(b.fields.find(x=>x.kind==='OZ').summonTicks,1);}
  // Q refresh handler is checked directly; prior E→Q has no Q cooldown and is an ordinary legal refresh.
  cast(r,f,'MOND_FISCHL_Q',e);let oz=b.fields.find(x=>x.kind==='OZ');assert.equal(oz.summonTicks,0);assert.equal(oz.summonTurns,cons===6?3:2);assert.equal(oz.sourceCardId,'MOND_FISCHL_Q');
  if(restore){r=new R(db,JSON.parse(r.serialize()));r.die=()=>100;r.random=()=>.5;b=r.s.runtime;f=owner(b,'MOND_FISCHL');}
  const at=b.log.length;for(let n=0;b.fields.some(x=>x.kind==='OZ')&&n<6;n++){r.tickFields('END');b.round++;}
  const shots=packets(b,at).filter(x=>x.presentationActorId==='SUMMON:OZ:'+f.id).length;assert.equal(shots,cons===6?3:2);evidence.push({cons,prior,restore,shots});
 }
 return evidence;
});

test('C10: all six native raid bosses keep final accepted packets at one after every modifier',()=>{
 const evidence=[];for(const boss of c.CRPGRuntime.raidV0152.bosses){const {r,b,p,e}=raid(boss.id,undefined,{LIYUE_BAIZHU:4});cast(r,owner(b,'LIYUE_BAIZHU'),'LIYUE_BAIZHU_Q',e);r.addCombatStatus(p,'TEST_REACTION_FORMATION',null,{reactionOut:1.15});r.addCombatStatus(e,'OMEN',2);r.addCombatStatus(e,'PHYS_VULN',2);
  const start=b.log.length,hits=b.raid.hits,hp=e.hp;for(const d of [{element:'불',sourceKind:'REACTION',reaction:'RX_OVERLOADED'},{element:'물리',sourceKind:'REACTION',reaction:'RX_SHATTER'},{element:'얼음',sourceKind:'REACTION_DOT',reaction:'RX_ELECTROCHARGED'},{element:'번개',sourceKind:'FIELD'}])r.applyDamage(p,e,100,d);
  assert.deepEqual(packets(b,start).map(x=>x.damage),[1,1,1,1]);assert.equal(hp-e.hp,4);assert.equal(b.raid.hits-hits,3);evidence.push({boss:boss.id,hits:b.raid.hits-hits});
 }
 return evidence;
});

test('C10: immune/zero/miss packets do not count; shields and HP1 preserve existing raid rules',()=>{
 const {r,b,p,e}=raid();const start=b.raid.hits;r.applyDamage(p,e,0,{element:'불',sourceKind:'REACTION'});const immune=r.hasElementImmunity;r.hasElementImmunity=(t,el)=>t===e&&el==='물';r.applyDamage(p,e,100,{element:'물',sourceKind:'REACTION'});r.damage(p,e,1,'불',{noAura:true,noCrit:true});r.hasElementImmunity=immune;assert.equal(b.raid.hits,start);
 const at=b.log.length;r.shield(e,100,'TEST_RAID_SHIELD',2);const hp=e.hp;r.applyDamage(p,e,10000,{element:'불',sourceKind:'REACTION'});const hit=packets(b,at).at(-1);assert.equal(hit.damage,0);assert.equal(hit.absorbed,1);assert.equal(e.hp,hp);assert.equal(b.raid.hits,start+1);e.shields=[];e.hp=1;r.applyDamage(p,e,10000,{element:'불'});assert.equal(e.hp,1);assert.equal(packets(b).at(-1).damage,1);assert.equal(b.raid.hits,start+2);
 const other=arena();const h=other.e.hp;other.r.applyDamage(other.p,other.e,100,{element:'물리'});assert.equal(h-other.e.hp,100,'nonraid packet unchanged');
});

test('Bennett C6: local equipped sword/claymore/polearm are infused; bow/catalyst are excluded after restore',()=>{
 for(const [equip,melee]of [['EQ_SWORD_COOL_STEEL',true],['EQ_CLAYMORE_DEBATE',true],['EQ_POLEARM_WHITE_TASSEL',true],['EQ_CRPG_TRAINING_BOW',false],['EQ_CATALYST_AMBER',false]])for(const restore of [false,true]){
  let r=fresh('MAP_LIYUE_PLAINS','ROUTE_ISEKAI');recruit(r,['MOND_BENNETT']);r.adminApply({op:'level',target:'ALL',value:40});r.s.constellations={MOND_BENNETT:6};r.equip(r.giveEquipment(equip),'PLAYER_CUSTOM');r.startBattle('EG_LIYUE_HILI_ROCK','RANDOM');if(restore)r=new R(db,JSON.parse(r.serialize()));r.die=()=>1;r.random=()=>.5;const b=r.s.runtime,p=owner(b,'PLAYER_CUSTOM'),e=b.actors.find(a=>a.side==='ENEMY');cast(r,owner(b,'MOND_BENNETT'),'MOND_BENNETT_Q',e);assert.equal(p.statuses.some(s=>s.id==='DILUC_INFUSION'),melee,equip);const at=b.log.length;r.basicHit(p,e);assert.equal(packets(b,at).find(x=>x.actor===p.name).element,melee?'불':'물리',equip+' actual normal hit');
 }
});

test('Bennett C6: guest weapon snapshots and restored guests never use the host weapon',()=>{
 const {r,b,e}=arena(['MOND_BENNETT'],{MOND_BENNETT:6},undefined,'EQ_SWORD_COOL_STEEL');b.coop={version:1,room:'R16801680',benched:[],turn:null};const guest=fresh('MAP_MOND_PLAINS','ROUTE_ISEKAI');guest.adminApply({op:'level',target:'ALL',value:40});
 for(const [equip,melee]of [['EQ_SWORD_COOL_STEEL',true],['EQ_CRPG_TRAINING_BOW',false],['EQ_CATALYST_AMBER',false]]){
  guest.equip(guest.giveEquipment(equip),'PLAYER_CUSTOM');const snap=guest.coopSnapshot('PLAYER_CUSTOM');assert.equal(snap.actor.weaponType,guest.row('16_EQUIP_DB',equip)[2]);const a=r.coopGuestActor({coop:{id:'COOP_1',pid:'aabbccdd0011',name:'다인 손님',snap}});r.initCombatActor(a,3);b.actors=b.actors.filter(x=>x.id!=='COOP_1');b.actors.push(a);cast(r,owner(b,'MOND_BENNETT'),'MOND_BENNETT_Q',e);assert.equal(a.statuses.some(s=>s.id==='DILUC_INFUSION'),melee,equip);
  const restored=new R(db,JSON.parse(r.serialize())),copy=restored.s.runtime.actors.find(x=>x.id==='COOP_1');assert.equal(restored.consWeaponType(copy),snap.actor.weaponType);
 }
 const legacy=r.coopCheckSnapshot({...guest.coopSnapshot('PLAYER_CUSTOM'),actor:{...guest.coopSnapshot('PLAYER_CUSTOM').actor,weaponType:undefined}});assert(legacy,'legacy snapshot remains valid');assert.equal(r.consWeaponType(r.coopGuestActor({coop:{id:'COOP_LEGACY',pid:'guest_old',name:'이전 손님',snap:legacy}})),null);
 const legacySword={source:'MOND_KAEYA',coop:{},statuses:[]},legacyCatalyst={source:'MOND_LISA',coop:{},statuses:[]};assert.equal(r.consWeaponType(legacySword),'한손검','known companion class survives old saves');assert.equal(r.consWeaponType(legacyCatalyst),'법구');
});

test('C11: installed Bennett card text/script match current native behavior without mutating recovered DB',()=>{
 const raw=plain(db['08_SKILL_CARD_DB'].find(x=>x[0]==='MOND_BENNETT_Q')),r=fresh(),row=r.row('08_SKILL_CARD_DB','MOND_BENNETT_Q');assert(row[16].includes('70%'));assert(row[16].includes('40%'));assert(row[16].includes('60%'));assert(!row[16].includes('광계'));assert(!row[32].includes('REMOVE'));assert.deepEqual(plain(db['08_SKILL_CARD_DB'].find(x=>x[0]==='MOND_BENNETT_Q')),raw);const restored=new R(db,JSON.parse(r.serialize()));assert.equal(restored.row('08_SKILL_CARD_DB','MOND_BENNETT_Q')[16],row[16]);
});

console.log(JSON.stringify({ok:!process.exitCode,total:results.length,passed:results.filter(x=>x.ok).length}));
