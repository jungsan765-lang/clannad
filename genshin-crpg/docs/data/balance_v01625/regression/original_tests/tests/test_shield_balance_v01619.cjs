'use strict';
const assert=require('node:assert/strict'),path=require('node:path');
const H=require('../tools/audit_protagonist_v01618.cjs'),E=H.load(path.resolve(__dirname,'..'));
const checks=[];function test(name,f){try{checks.push({name,ok:true,evidence:f()});console.log('PASS '+name);}catch(e){checks.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
function arena(cons={},team=['LIYUE_ZHONGLI','MOND_DIONA','MOND_NOELLE'],group='EG_MOND_HILI_PATROL',map='MAP_MOND_PLAINS'){const r=H.setup(E,{level:25,team,route:'ROUTE_TRAVELER',map,gear:'craft',enhance:6,talent:4,seed:717});r.s.constellations={...cons};r.aiTurn=a=>{a.guard=true;};r.startBattle(group,'RANDOM');r.action('COMBAT_BEGIN');return{r,b:r.s.runtime,actor:id=>r.s.runtime.actors.find(a=>a.source===id),enemy:r.s.runtime.actors.find(a=>a.side==='ENEMY')};}
function cast(r,a,id,t){const c=r.actorCards(a).find(c=>c.id===id);assert(c);assert.equal(r.cardReason(a,c),'');r.executeCard(a,c,t.id);}
const jade=a=>a.shields.find(s=>s.source==='LIYUE_ZHONGLI_E');
test('Jade Shield protects all living fighters with legal talent/gear modifiers and finite overflow',()=>{
 const {r,b,actor,enemy}=arena(),z=actor('LIYUE_ZHONGLI'),p=actor('PLAYER_CUSTOM');cast(r,z,'LIYUE_ZHONGLI_E',enemy);
 const wanted=Math.round(z.maxHp*.2*r.premiumTalentMultiplier(z,'e')*1.1*.65);assert(wanted>0);
 for(const a of b.actors.filter(a=>a.side==='ALLY')){const sh=jade(a);assert(sh);assert.equal(sh.value,wanted);assert.equal(sh.rounds,2);assert.equal(sh.ignoreForcedMove,true);}
 const hp=p.hp;r.applyDamage(enemy,p,wanted+200,{element:'물리',sourceKind:'TEST_FINAL_PACKET'});assert.equal(p.hp,hp-200);assert(!jade(p));
 return{value:wanted,overflowHpLoss:200,targets:4};
});
test('C2 burst refreshes the same Jade Shield without summing E and Q absorption',()=>{
 const {r,actor,enemy}=arena({LIYUE_ZHONGLI:2}),z=actor('LIYUE_ZHONGLI'),p=actor('PLAYER_CUSTOM');cast(r,z,'LIYUE_ZHONGLI_E',enemy);const size=jade(p).value;
 const hit=Math.floor(size*.75);r.applyDamage(enemy,p,hit,{element:'물리',sourceKind:'TEST_FINAL_PACKET'});assert.equal(jade(p).value,size-hit);cast(r,z,'LIYUE_ZHONGLI_Q',enemy);
 // C2 is a constellation shield after the direct cast context, so it retains its
 // native fixed size rather than inheriting the E/Q talent multiplier.
 const c2=Math.round(z.maxHp*.2*1.1*.65);assert.equal(p.shields.filter(s=>s.source==='LIYUE_ZHONGLI_E').length,1);assert.equal(jade(p).value,Math.max(size-hit,c2));assert.equal(jade(p).initialValue,size);
 return{constellation:r.constellationLevel(z.source),eValue:size,c2Value:c2,shieldCount:p.shields.length};
});
test('existing saved shield values survive restore and refresh until their normal depletion',()=>{
 const {r,actor,enemy}=arena(),z=actor('LIYUE_ZHONGLI'),p=actor('PLAYER_CUSTOM');cast(r,z,'LIYUE_ZHONGLI_E',enemy);const current=jade(p).value;
 // An already-running 0.16.18 shield is persisted state, not a new cast.
 jade(p).value=current+500;jade(p).initialValue=current+500;
 const state=JSON.parse(r.serialize()),restored=new E.R(E.db,state),rp=restored.s.runtime.actors.find(a=>a.id===p.id);assert.equal(jade(rp).value,current+500);
 restored.shield(rp,z.maxHp*.2*r.premiumTalentMultiplier(z,'e'),'LIYUE_ZHONGLI_E',2,{ignoreForcedMove:true});assert.equal(jade(rp).value,current+500);assert.equal(jade(rp).rounds,2);
 return{persisted:current+500,afterRefresh:jade(rp).value};
});
test('Diona and Noelle retain their own shield values and the enemy shield budget is untouched',()=>{
 const {r,actor,enemy}=arena(),d=actor('MOND_DIONA'),n=actor('MOND_NOELLE');cast(r,d,'MOND_DIONA_E',enemy);
 const dionaShield=r.s.runtime.actors.flatMap(a=>a.shields).find(s=>s.source==='MOND_DIONA_E');assert(dionaShield);assert.equal(dionaShield.value,Math.round(d.maxHp*.18*r.premiumTalentMultiplier(d,'e')*1.1));
 cast(r,n,'MOND_NOELLE_E',enemy);assert.equal(n.shields.find(s=>s.source==='MOND_NOELLE_E').value,Math.round(r.combatStat(n,'def')*1.6*r.premiumTalentMultiplier(n,'e')*r.skillRhythm(n.source).ePower*1.1));
 r.shield(enemy,1000,'LIYUE_ZHONGLI_E',2);assert.equal(jade(enemy).value,1000);
 return{diona:dionaShield.value,noelle:n.shields.find(s=>s.source==='MOND_NOELLE_E').value,enemy:jade(enemy).value};
});
test('two actual ally shield casts consume the same packet and overflow beyond the strongest shield',()=>{
 const {r,b,actor,enemy}=arena({},undefined,'EG_LIYUE_LOCAL_CHASM_DEEP_1','MAP_CHASM_DEEP'),z=actor('LIYUE_ZHONGLI'),n=actor('MOND_NOELLE');cast(r,z,'LIYUE_ZHONGLI_E',enemy);cast(r,n,'MOND_NOELLE_E',enemy);
 const shields=n.shields.map(s=>({...s})),strongest=Math.max(...shields.map(s=>s.value)),total=shields.reduce((s,x)=>s+x.value,0),hp=n.hp;
 assert.equal(shields.length,2);assert(total>strongest+200);
 r.applyDamage(enemy,n,strongest+200,{element:'물리',sourceKind:'TEST_FINAL_PACKET'});
 assert.equal(n.hp,hp-200);assert.equal(n.shields.length,0);const packet=b.log.findLast(e=>e.targetId===n.id&&e.sourceKind==='TEST_FINAL_PACKET');assert.equal(packet.absorbed,strongest);assert.equal(packet.shieldBefore,total);assert.equal(packet.shieldAfter,0);assert.equal(packet.brokenShields.length,2);
 return{twoCastPools:shields.map(s=>({source:s.source,value:s.value})),incoming:strongest+200,blockedHp:packet.absorbed,overflowHpLoss:200};
});
test('actual elemental shields use the best effective absorption for opposite damage elements',()=>{
 const {r,b,actor,enemy}=arena({LIYUE_BEIDOU:1,LIYUE_YANFEI:4},['LIYUE_ZHONGLI','LIYUE_BEIDOU','LIYUE_YANFEI'],'EG_LIYUE_LOCAL_CHASM_DEEP_1','MAP_CHASM_DEEP'),z=actor('LIYUE_ZHONGLI'),be=actor('LIYUE_BEIDOU'),y=actor('LIYUE_YANFEI');cast(r,z,'LIYUE_ZHONGLI_E',enemy);cast(r,be,'LIYUE_BEIDOU_Q',enemy);cast(r,y,'LIYUE_YANFEI_Q',enemy);
 const state=JSON.parse(r.serialize()),proof=[];assert(y.shields.some(s=>s.damageMultipliers?.번개===.4));assert(y.shields.some(s=>s.damageMultipliers?.불===.4));
 for(const element of ['불','번개']){
  const restored=new E.R(E.db,JSON.parse(JSON.stringify(state))),ry=restored.s.runtime.actors.find(a=>a.id===y.id),re=restored.s.runtime.actors.find(a=>a.id===enemy.id),shields=ry.shields.map(s=>({...s})),effective=shields.map(s=>s.value/Number(s.damageMultipliers?.[element]??1)),packet=Math.ceil(Math.max(...effective))+200,hp=ry.hp;
  // Beidou's actual burst also reduces enemy incoming damage by10% before shields.
  const incomingBeforeStormbreaker=packet/.9;
  restored.applyDamage(re,ry,incomingBeforeStormbreaker,{element,sourceKind:'TEST_FINAL_PACKET'});assert.equal(ry.hp,hp-Math.round(packet-Math.max(...effective)));assert.equal(ry.shields.length,0);const log=restored.s.runtime.log.findLast(e=>e.targetId===ry.id&&e.sourceKind==='TEST_FINAL_PACKET');assert.equal(log.absorbed,packet-log.damage);proof.push({element,incomingBeforeStormbreaker,postMitigationPacket:packet,effectivePools:effective,blockedHp:log.absorbed,hpLoss:hp-ry.hp});
 }
 return proof;
});
test('Zhongli C6 heals from its own consumed shield while another actual shield also takes the hit',()=>{
 const {r,actor,enemy}=arena({LIYUE_ZHONGLI:6},undefined,'EG_LIYUE_LOCAL_CHASM_DEEP_1','MAP_CHASM_DEEP'),z=actor('LIYUE_ZHONGLI'),n=actor('MOND_NOELLE');cast(r,z,'LIYUE_ZHONGLI_E',enemy);cast(r,n,'MOND_NOELLE_E',enemy);n.hp=Math.floor(n.maxHp*.5);
 const before=n.shields.map(s=>({...s})),hp=n.hp;r.applyDamage(enemy,n,100,{element:'물리',sourceKind:'TEST_FINAL_PACKET'});
 for(const sh of before)assert.equal(n.shields.find(s=>s.source===sh.source).value,sh.value-100);assert.equal(n.hp,hp+44);
 return{nativeConstellation:r.constellationLevel(z.source),eachShieldLoss:100,healedWithGearBonus:n.hp-hp,hpDamage:0};
});
test('Baizhu native field shield breaks and heals even while Jade Shield blocks the same hit',()=>{
 const {r,b,actor,enemy}=arena({},['LIYUE_ZHONGLI','LIYUE_BAIZHU','MOND_NOELLE'],'EG_LIYUE_LOCAL_CHASM_DEEP_1','MAP_CHASM_DEEP'),z=actor('LIYUE_ZHONGLI'),bz=actor('LIYUE_BAIZHU'),p=actor('PLAYER_CUSTOM');p.hp=Math.floor(p.maxHp*.5);cast(r,z,'LIYUE_ZHONGLI_E',enemy);cast(r,bz,'LIYUE_BAIZHU_Q',enemy);r.roundEnd();r.newRound();
 const baizhu=p.shields.find(s=>s.source==='LIYUE_BAIZHU_Q');assert(baizhu);const packet=Math.ceil(baizhu.value)+1,jadeBefore=jade(p).value,hp=p.hp;assert(jadeBefore>packet);
 r.applyDamage(enemy,p,packet,{element:'물리',sourceKind:'TEST_FINAL_PACKET'});assert(!p.shields.some(s=>s.source==='LIYUE_BAIZHU_Q'));assert.equal(jade(p).value,jadeBefore-packet);assert.equal(p.hp,hp+Math.round(bz.maxHp*.06*1.1));assert(b.log.some(e=>e.card==='LIYUE_BAIZHU_Q'&&e.sourceKind==='SHIELD_BREAK'));
 return{field:b.fields.find(f=>f.kind==='BAIZHU_SEAMLESS_SHIELD').kind,baizhuPool:baizhu.initialValue,packet,jadeRemaining:jade(p).value,healing:p.hp-hp};
});
test('native enemy barriers keep sequential absorption and immunity without consuming extra shields',()=>{
 const {r,b,actor}=arena({},undefined,'EG_MOND_ABYSS_MAGE'),p=actor('PLAYER_CUSTOM'),mage=b.actors.find(a=>a.source==='MON_ABYSS_MAGE_PYRO');assert(mage);const native=mage.shields.find(s=>s.source==='ECARD_ABYSS_PYRO_SHIELD');assert(native);r.shield(mage,1000,'TEST_ENEMY_EXTRA_BARRIER',2);const values=mage.shields.map(s=>s.value),hp=mage.hp;
 r.applyDamage(p,mage,100,{element:'불',sourceKind:'TEST_FINAL_PACKET'});assert.equal(mage.hp,hp);assert.deepEqual(mage.shields.map(s=>s.value),values);
 const pool=native.value/2+1000,packet=Math.ceil(pool)+100;r.applyDamage(p,mage,packet,{element:'물',sourceKind:'TEST_FINAL_PACKET'});assert.equal(mage.hp,hp-Math.round(packet-pool));assert.equal(mage.shields.length,0);
 return{nativeSource:native.source,immuneShieldsPreserved:values,waterEffectiveSequentialPool:pool,overflowHpLoss:hp-mage.hp};
});
test('Lan Yan native conversion affects its own shield, not a larger companion shield or HP overflow',()=>{
 const {r,actor,enemy}=arena({LIYUE_YANFEI:4},['LIYUE_LANYAN','LIYUE_YANFEI','LIYUE_ZHONGLI'],'EG_LIYUE_LOCAL_CHASM_DEEP_1','MAP_CHASM_DEEP'),l=actor('LIYUE_LANYAN'),y=actor('LIYUE_YANFEI');y.hp=Math.floor(y.maxHp*.5);cast(r,y,'LIYUE_YANFEI_Q',enemy);cast(r,l,'LIYUE_LANYAN_E',y);
 const lan=y.shields.find(s=>s.source==='LIYUE_LANYAN_E');assert(lan);assert.equal(lan.converted,'불');assert.equal(lan.element,'불');assert.equal(lan.damageMultipliers.불,.4);const larger=y.shields.find(s=>s.source!==lan.source);assert(larger.value>lan.value);
 const serialized=JSON.parse(r.serialize()),proof=[];
 for(const legacy of [false,true])for(const element of ['불','물']){
  const state=JSON.parse(JSON.stringify(serialized));if(legacy){const sh=state.runtime.actors.find(a=>a.id===y.id).shields.find(s=>s.source===lan.source);delete sh.element;delete sh.damageMultipliers;}
  const restored=new E.R(E.db,state),ry=restored.s.runtime.actors.find(a=>a.id===y.id),re=restored.s.runtime.actors.find(a=>a.id===enemy.id),effective=element==='불'?larger.value/.4:larger.value,packet=Math.ceil(effective)+200,hp=ry.hp;
  assert.equal(ry.shields.find(s=>s.source===lan.source).value,lan.value);restored.applyDamage(re,ry,packet,{element,sourceKind:'TEST_FINAL_PACKET'});assert.equal(ry.hp,hp-Math.round(packet-effective));assert.equal(ry.shields.length,0);const log=restored.s.runtime.log.findLast(e=>e.targetId===ry.id&&e.sourceKind==='TEST_FINAL_PACKET');assert.equal(log.damage+log.absorbed,packet);proof.push({legacy,element,lanPool:lan.value,largerCompanionPool:larger.value,incoming:packet,hpLoss:hp-ry.hp,blockedHp:log.absorbed});
 }
 return proof;
});
test('unconverted Lan Yan shield has Anemo250% absorption with consistent fractional overflow logs',()=>{
 const {r,b,actor,enemy}=arena({},['LIYUE_LANYAN','MOND_NOELLE','LIYUE_ZHONGLI'],'EG_LIYUE_LOCAL_CHASM_DEEP_1','MAP_CHASM_DEEP'),l=actor('LIYUE_LANYAN'),n=actor('MOND_NOELLE');n.hp=Math.floor(n.maxHp*.5);cast(r,l,'LIYUE_LANYAN_E',n);const sh=n.shields.find(s=>s.source==='LIYUE_LANYAN_E');assert(sh);assert.equal(sh.element,'바람');assert.equal(sh.damageMultipliers.바람,.4);
 const packet=sh.value*4,hp=n.hp;r.applyDamage(enemy,n,packet,{element:'바람',sourceKind:'TEST_FINAL_PACKET'});const log=b.log.findLast(e=>e.targetId===n.id&&e.sourceKind==='TEST_FINAL_PACKET');assert.equal(log.damage,Math.round(packet-sh.initialValue/.4));assert.equal(hp-n.hp,log.damage);assert.equal(log.damage+log.absorbed,packet);
 return{pool:sh.initialValue,incoming:packet,hpDamage:log.damage,blockedHp:log.absorbed,poolConsumed:log.shieldBefore-log.shieldAfter};
});
if(process.env.CRPG_SHIELD_TEST_OUT)require('node:fs').writeFileSync(process.env.CRPG_SHIELD_TEST_OUT,JSON.stringify({fingerprint:E.fingerprint,checks},null,2));
