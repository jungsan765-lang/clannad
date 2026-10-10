'use strict';
// Exact declared native fixture from the retained shield test. Prints facts;
// does not remove assertions from that test or alter the product/fixture stats.
const path=require('node:path'),fs=require('node:fs'),crypto=require('node:crypto');
const ROOT=path.resolve(__dirname,'../../../..'),H=require(path.join(ROOT,'tools/audit_protagonist_v01618.cjs')),E=H.load(ROOT);
const r=H.setup(E,{level:25,team:['LIYUE_ZHONGLI','LIYUE_BAIZHU','MOND_NOELLE'],route:'ROUTE_TRAVELER',map:'MAP_CHASM_DEEP',gear:'craft',enhance:6,talent:4,seed:717});
r.s.constellations={};r.aiTurn=a=>{a.guard=true;};r.startBattle('EG_LIYUE_LOCAL_CHASM_DEEP_1','RANDOM');r.action('COMBAT_BEGIN');
const a=id=>r.s.runtime.actors.find(x=>x.source===id),z=a('LIYUE_ZHONGLI'),bz=a('LIYUE_BAIZHU'),p=a('PLAYER_CUSTOM'),enemy=r.s.runtime.actors.find(x=>x.side==='ENEMY');
function cast(owner,id){const c=r.actorCards(owner).find(c=>c.id===id);if(!c||r.cardReason(owner,c))throw Error('Fixture skill is not available: '+id);r.executeCard(owner,c,enemy.id);}
p.hp=Math.floor(p.maxHp*.5);cast(z,'LIYUE_ZHONGLI_E');cast(bz,'LIYUE_BAIZHU_Q');r.roundEnd();r.newRound();
const baizhu=p.shields.find(s=>s.source==='LIYUE_BAIZHU_Q'),jade=p.shields.find(s=>s.source==='LIYUE_ZHONGLI_E'),packet=Math.ceil(baizhu.value)+1,hp=p.hp,heals=[],nativeHeal=r.heal;
r.heal=function(to,n,source,...rest){const before=to.hp,out=nativeHeal.call(this,to,n,source,...rest);heals.push({target:to.source,raw:n,source,actual:out,delta:to.hp-before});return out;};
const before=p.shields.map(x=>({...x}));r.applyDamage(enemy,p,packet,{element:'물리',sourceKind:'TEST_FINAL_PACKET'});
const log=r.s.runtime.log.findLast(e=>e.targetId===p.id&&e.sourceKind==='TEST_FINAL_PACKET');
console.log(JSON.stringify({scope:'Same isolated native fixture as the retained old shield test; fact collection, not full battle or victory evidence.',budget:r.combatCharacterBudget(),revision:r.s.runtime.characterBalanceRevision,round:r.s.runtime.round,owners:{zhongliHP:z.maxHp,baizhuHP:bz.maxHp},before,jadeValueAfter:jade.value,baizhuValueAfter:baizhu.value,packet,oldFixturePrecondition:before.find(s=>s.source==='LIYUE_ZHONGLI_E').value>packet,hpBefore:hp,hpAfter:p.hp,heals,after:p.shields,packetLog:log,hashes:Object.fromEntries(['source/runtime_combat.js','source/runtime_liyue_cards.js','source/runtime_constellations_v01411.js'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,f))).digest('hex')]))},null,2));
