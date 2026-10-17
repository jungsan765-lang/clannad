'use strict';
// Native runtime regression for the two confirmed field-boss defects. Party ownership,
// level/phase, gear and talents are fixtures; actors and skills come from native entry.
// Oversized packets only establish boss/core damage boundaries, not farming balance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fresh,c,R,db}=require('../tests/helpers_v011.cjs'),api=c.CRPGRuntime,FB=api.fieldBosses;
const clone=x=>JSON.parse(JSON.stringify(x)),output=process.argv[2]||'/tmp/crpg_v01618/fieldboss_test_results.json';
const report={version:'0.16.18',scope:'field-boss elemental immunity and Cryo revival hit-count regression',fixturePolicy:'Native actors and legal cards; Lv60/phase, owned four-member party, +6 legal equipment, talent8 are fixtures. Oversized packets are declared boundary setup; typed reaction probes supplement real skills.',checks:[]};
function check(id,fn){try{const evidence=fn();report.checks.push({id,passed:true,evidence});console.log('PASS '+id);}catch(e){report.checks.push({id,passed:false,error:e.stack});console.error('FAIL '+id+' '+e.message);}}
function ready(map,team=['MOND_AMBER','LIYUE_XIANGLING','MOND_BARBARA']){
 const r=fresh(map);r.s.global.MORA=99999999;r.s.global.PLAYER_LEVEL_STATE=60;r.s.ascensions.PLAYER_CUSTOM=api.growthV01522.phaseFor(60);
 const owned={};team.forEach((id,i)=>{owned[id]={state:'JOINED'};r.s.chars[id].level=60;r.s.ascensions[id]=api.growthV01522.phaseFor(60);r.s.party[i+1]={slot:'PARTY_'+(i+2),type:'CHAR',source:id,control:'AI',active:true,tactic:'균형'};});
 r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(owned);
 const weapons={'한손검':'EQ_SWORD_RANCOUR','양손검':'EQ_CLAYMORE_WHITEBLIND','활':'EQ_BOW_CRESCENT','법구':'EQ_CATALYST_MAPPA','장병기':'EQ_POLEARM_CRESCENT'};
 for(const id of ['PLAYER_CUSTOM',...team]){for(const equipment of [weapons[r.equipmentProficiencies(id)[0]],'EQ_ARMOR_REINFORCED_LEATHER','EQ_ACC_EAGLE_EYE']){const slot=r.giveEquipment(equipment);r.action('EQUIP',{slot,owner:id});r.s.inventory.find(x=>x.slot===slot).enhance=6;}(r.s.talents??={})[id]={na:8,e:8,q:8};}
 r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;for(const id of team)r.s.chars[id].hp=r.character(id).maxHp;
 Object.assign(r.tutorialState().done,{combatAttack:true,combatGuard:true,combatSkill:true,combatBurst:true});return r;
}
function start(id,team,seed=71247){const r=ready(FB.bosses[id].map,team);r.s.global.PRNG_STATE=seed;r.startBattle(FB.group(id),'EXPLICIT');if(r.combatOpening())r.action('COMBAT_BEGIN');const b=r.s.runtime;return {r,b,boss:b.actors.find(x=>x.source===id),me:b.actors.find(x=>x.source==='PLAYER_CUSTOM')};}
function actor(b,id){return b.actors.find(x=>x.source===id);}
function skill(r,a,id,target){const card=r.actorCards(a).find(x=>x.id===id);assert(card,'native card '+id);assert.equal(r.cardReason(a,card),'','legal native card '+id);const available=r.combatCards(a.source).find(x=>x.id===id);if(available?.targets?.length)assert(available.targets.some(x=>x.id===target),'target is legal for '+id);r.executeCard(a,card,target);return card.id;}
function state(a){return {hp:a.hp,shield:(a.shields||[]).reduce((s,x)=>s+x.value,0)};}
function core(s){s.r.applyDamage(s.me,s.boss,s.boss.hp+99999,{element:'물리'});assert.equal(s.boss.hp,1);assert.equal(s.boss.fb.revival.hits,0);assert.equal(s.boss.fb.revival.need,4);}
function aliveCore(s,hits){assert.equal(s.boss.hp,1);assert.equal(s.boss.fb.revival.hits,hits);assert(s.r.s.runtime,'no premature battle settlement');}
for(const id of Object.keys(FB.summons).filter(x=>x.startsWith('FB_MIMIC_')))check('hydro_form:'+id,()=>{
 const s=start('FB_OCEANID',['MOND_BARBARA','MOND_MONA','MOND_LISA']),{r,b,boss,me}=s,m=r.fbSummon(b,boss,id);assert(m);
 assert.equal(r.hasElementImmunity(m,'물'),true);assert.equal(r.hasElementImmunity(m,'HYDRO'),true);
 const before=state(m),barbara=actor(b,'MOND_BARBARA'),mona=actor(b,'MOND_MONA');
 // Catalyst normal attack is really Hydro; Mona E creates its native Hydro object/field.
 r.basicHit(barbara,m);assert.deepEqual(state(m),before,'native Hydro catalyst attack');
 skill(r,mona,'MOND_MONA_E',m.id);assert.deepEqual(state(m),before,'native Hydro skill');
 assert(b.fields.some(f=>f.actor===mona.id),'native Mona field installed');r.tickFields('END');assert.deepEqual(state(m),before,'native Hydro field');
 for(const sourceKind of ['REACTION','REACTION_DOT','OBJECT','FIELD']){r.applyDamage(mona,m,100,{element:'HYDRO',sourceKind});assert.deepEqual(state(m),before,'final typed '+sourceKind+' packet');}
 const unblockedBefore=state(m);r.damage(me,m,.05,'물리',{sureHit:true,range:'원거리'});const afterPhysical=state(m);assert(afterPhysical.hp<unblockedBefore.hp||afterPhysical.shield<unblockedBefore.shield,'other element/physical still reaches form');
 const loaded=new R(db,JSON.parse(r.serialize())),saved=loaded.s.runtime.actors.find(a=>a.id===m.id);assert.equal(loaded.hasElementImmunity(saved,'물'),true);assert.deepEqual(state(saved),afterPhysical);
 return {before,afterPhysical,nativeHydroSkills:['BARBARA_BASIC','MOND_MONA_E'],typedPacketKinds:['REACTION','REACTION_DOT','OBJECT','FIELD'],saveReload:true};
});
for(const id of ['MOND_AMBER','LIYUE_XIANGLING'])check('cryo_core_delayed_native:'+id,()=>{
 const s=start('FB_CRYO_HYPOSTASIS'),{r,b,boss}=s,a=actor(b,id);skill(r,a,id+'_E',boss.id);const fields=clone(b.fields);core(s);
 if(id==='MOND_AMBER'){b.round++;r.tickFields('START');}else r.tickFields('END');aliveCore(s,1);
 // The saved hit count survives reload. Three later positive Pyro packets each count once.
 let loaded=new R(db,JSON.parse(r.serialize())),lb=loaded.s.runtime,lt=lb.actors.find(x=>x.source===boss.source),la=lb.actors.find(x=>x.source===id);
 assert.equal(lt.fb.revival.hits,1);assert.equal(lt.hp,1);
 for(let n=2;n<=4;n++){loaded.applyDamage(la,lt,100,{element:'불',sourceKind:n===2?'REACTION_DOT':n===3?'OBJECT':'FIELD'});if(n<4){assert.equal(lt.hp,1);assert.equal(lt.fb.revival.hits,n);}else{assert.equal(lt.hp,0);assert.equal(lt.fb.revival,null);}}
 const breaks=lb.log.filter(x=>x.card==='FB_CORE_BROKEN').length;assert.equal(breaks,1);loaded.autoUntilPlayer();assert.equal(loaded.s.runtime,null);const receipt=JSON.parse(loaded.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(receipt.victory,true);assert.equal(receipt.fieldBoss.boss,'FB_CRYO_HYPOSTASIS');
 const receipts=Object.keys(loaded.s.combatReceipts).length,items=loaded.itemCount(FB.bosses.FB_CRYO_HYPOSTASIS.material);loaded.autoUntilPlayer();assert.equal(Object.keys(loaded.s.combatReceipts).length,receipts);assert.equal(loaded.itemCount(FB.bosses.FB_CRYO_HYPOSTASIS.material),items);
 return {fields,firstDelayedHitCount:1,saveReload:true,totalHits:4,coreBreaks:breaks,settlementCount:receipts,victory:receipt.victory};
});
check('cryo_core_one_count_per_direct_or_delayed_hit',()=>{const s=start('FB_CRYO_HYPOSTASIS');core(s);const counts=[];for(const sourceKind of [undefined,'FIELD','OBJECT']){s.r.damage(actor(s.b,'MOND_AMBER'),s.boss,.1,'불',{sureHit:true,range:'원거리',sourceKind});counts.push(s.boss.fb.revival.hits);aliveCore(s,counts.length);}s.r.applyDamage(actor(s.b,'MOND_AMBER'),s.boss,100,{element:'불',sourceKind:'REACTION_DOT'});assert.equal(s.boss.hp,0);assert.equal(s.b.log.filter(x=>x.card==='FB_CORE_BROKEN').length,1);return {counts,totalHits:4};});
check('cryo_core_zero_immune_and_invalid_packets_do_not_advance',()=>{
 const s=start('FB_CRYO_HYPOSTASIS');core(s);const amber=actor(s.b,'MOND_AMBER'),barbara=actor(s.b,'MOND_BARBARA');
 s.r.applyDamage(amber,s.boss,0,{element:'불',sourceKind:'REACTION_DOT'});s.r.applyDamage(amber,s.boss,.1,{element:'불',sourceKind:'FIELD'});s.r.damage(amber,s.boss,0,'불',{range:'원거리'});aliveCore(s,0);
 s.r.damage(barbara,s.boss,.1,'물',{sureHit:true,range:'원거리',sourceKind:'FIELD'});s.r.applyDamage(barbara,s.boss,99999,{element:'물',sourceKind:'REACTION_DOT'});s.r.applyDamage(amber,s.boss,99999,{element:'얼음',sourceKind:'OBJECT'});aliveCore(s,0);
 s.r.applyDamage(s.boss,s.boss,99999,{element:'불',sourceKind:'HAZARD'});aliveCore(s,0);return {hits:0,hp:1};
});
check('cryo_core_native_claymore_cryo_counter_is_preserved',()=>{
 const s=start('FB_CRYO_HYPOSTASIS',['LIYUE_CHONGYUN','MOND_AMBER','MOND_BARBARA']);core(s);const a=actor(s.b,'LIYUE_CHONGYUN');assert(a.traits.ARMOR_BREAK>=25);skill(s.r,a,'LIYUE_CHONGYUN_Q',s.boss.id);aliveCore(s,3);skill(s.r,a,'LIYUE_CHONGYUN_E',s.boss.id);assert.equal(s.boss.hp,0);assert.equal(s.boss.fb.revival,null);return {armorBreak:a.traits.ARMOR_BREAK,qHits:3,eHits:1};
});
check('cryo_core_guoba_has_two_ticks_and_still_requires_four_hits',()=>{
 const s=start('FB_CRYO_HYPOSTASIS'),a=actor(s.b,'LIYUE_XIANGLING');skill(s.r,a,'LIYUE_XIANGLING_E',s.boss.id);core(s);const counts=[];for(let i=1;i<=2;i++){if(i===2)s.b.round++;s.r.tickFields('END');aliveCore(s,i);counts.push(s.boss.fb.revival.hits);s.r.tickFields('END');aliveCore(s,i);}assert(!s.b.fields.some(f=>f.kind==='GOU_BA'&&!f.done),'native summon expires after its two ticks');for(let i=3;i<=4;i++)s.r.damage(actor(s.b,'MOND_AMBER'),s.boss,.1,'불',{range:'원거리'});assert.equal(s.boss.hp,0);assert.equal(s.b.log.filter(x=>x.card==='FB_CORE_BROKEN').length,1);s.r.tickFields('END');assert.equal(s.b.log.filter(x=>x.card==='FB_CORE_BROKEN').length,1);return {counts,sameRoundExtraHits:0,expiredSummonExtraHits:0,finalHp:s.boss.hp,coreBreaks:1};
});
check('legacy_v2_cryo_core_timeout_still_revives_once',()=>{const s=start('FB_CRYO_HYPOSTASIS');s.b.fieldBoss.behaviorRevision=2;core(s);s.r.damage(actor(s.b,'MOND_AMBER'),s.boss,.1,'불',{range:'원거리'});aliveCore(s,1);s.b.fields=[];s.boss.statuses=[];s.r.roundEnd();assert.equal(s.boss.fb.revival.rounds,2,'creation END does not consume the two full response rounds');s.r.roundEnd();assert.equal(s.boss.fb.revival.rounds,1);s.r.roundEnd();assert.equal(s.boss.fb.revival,null);assert.equal(s.boss.hp,Math.round(s.boss.maxHp*.5));s.r.applyDamage(s.me,s.boss,s.boss.hp+1,{element:'물리'});assert.equal(s.boss.hp,0);assert.equal(s.boss.fb.revival,null);return {timeoutHp:Math.round(s.boss.maxHp*.5),revivedOnlyOnce:true,creationEndFree:true};});
for(const [id,el]of [['FB_ANEMO_HYPOSTASIS','바람'],['FB_ELECTRO_HYPOSTASIS','번개'],['FB_GEO_HYPOSTASIS','바위'],['FB_CRYO_HYPOSTASIS','얼음']])check('body_immunity:'+id,()=>{const s=start(id),before=state(s.boss);s.r.damage(s.me,s.boss,10,el,{sureHit:true,range:'원거리'});s.r.applyDamage(s.me,s.boss,100,{element:el,sourceKind:'REACTION_DOT'});assert.deepEqual(state(s.boss),before);return {before,after:state(s.boss)};});
check('anemo_revival_core_unchanged',()=>{const s=start('FB_ANEMO_HYPOSTASIS'),amber=actor(s.b,'MOND_AMBER');s.r.applyDamage(amber,s.boss,s.boss.hp+1,{element:'불'});assert.equal(s.boss.hp,1);const before=s.boss.fb.revival.core;s.r.applyDamage(amber,s.boss,before,{element:'불'});assert.equal(s.boss.hp,0);assert.equal(s.boss.fb.revival,null);return {before,finalHp:0};});
for(const [id,kind,el]of [['FB_ELECTRO_HYPOSTASIS','FB_SUMMON_PRISM','불'],['FB_GEO_HYPOSTASIS','FB_SUMMON_PILLAR','바위']])check('guarded_revival_unchanged:'+id,()=>{const s=start(id),noelle=actor(s.b,'LIYUE_XIANGLING');s.r.applyDamage(s.me,s.boss,s.boss.hp+1,{element:'물리'});assert(s.boss.fb.revival.guarded);s.r.applyDamage(s.me,s.boss,999999,{element:'불',sourceKind:'REACTION_DOT'});assert.equal(s.boss.hp,1);const summons=s.b.actors.filter(a=>a.fbSummon?.kind===kind&&a.hp>0);assert.equal(summons.length,3);for(const a of summons)s.r.applyDamage(noelle,a,a.hp+1,{element:el});assert.equal(s.boss.hp,0);assert.equal(s.boss.fb.revival,null);return {summons:3,bodyDamageBlocked:true,finalHp:0};});
check('oceanid_eight_other_element_form_kills_still_win',()=>{const s=start('FB_OCEANID');for(let i=0;i<8;i++){let m=s.b.actors.find(x=>x.fbSummon&&x.hp>0);if(!m)m=s.r.fbSummon(s.b,s.boss,'FB_MIMIC_BOAR');s.r.applyDamage(s.me,m,m.hp+99999,{element:'물리'});}assert.equal(s.b.fieldBoss.defeated,8);assert.equal(s.boss.hp,0);s.r.autoUntilPlayer();assert.equal(JSON.parse(s.r.s.global.LAST_BATTLE_RESULT_JSON).victory,true);return {formKills:8,victory:true};});
for(const id of Object.keys(FB.bosses))check('native_ai_and_save:'+id,()=>{const s=start(id);const saved=new R(db,JSON.parse(s.r.serialize()));assert.equal(saved.s.runtime.fieldBoss.boss,id);const sb=saved.s.runtime,boss=sb.actors.find(x=>x.source===id);saved.aiTurn(boss,sb.actors.filter(x=>x.side==='ALLY'&&x.hp>0));assert(Number.isFinite(boss.hp));for(const a of sb.actors)assert(Number.isFinite(a.hp));return {saveReload:true,actionExecuted:true,enemyBodies:sb.actors.filter(x=>x.side==='ENEMY'&&x.hp>0).length};});
check('nine_bosses_two_seed_full_native_fights',()=>{const evidence=[];for(const id of Object.keys(FB.bosses))for(const seed of [71247,12741]){const s=start(id,undefined,seed);for(const a of s.b.actors)if(a.side==='ALLY')a.control='AI';for(let i=0;i<30&&s.r.s.runtime;i++){s.r.autoUntilPlayer();if(s.r.s.runtime)assert(s.r.s.runtime.round<=60,'bounded native fight '+id);}assert.equal(s.r.s.runtime,null,'native fight settles '+id);const receipt=JSON.parse(s.r.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(receipt.fieldBoss.boss,id);assert.equal(Object.keys(s.r.s.combatReceipts).length,1);evidence.push({boss:id,seed,victory:receipt.victory,rounds:receipt.rounds});}return {fullNativeFights:evidence.length,fights:evidence};});
report.total=report.checks.length;report.passed=report.checks.filter(x=>x.passed).length;report.failed=report.total-report.passed;fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({output,total:report.total,passed:report.passed,failed:report.failed}));if(report.failed)process.exitCode=1;
