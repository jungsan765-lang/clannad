import assert from 'node:assert/strict';
import {writeFileSync,mkdirSync} from 'node:fs';
import {R,DB} from '../server/generated/engine.mjs';
const r=new R(DB);r.newGame({name:'카탈로그 검증',route:'ROUTE_TRAVELER',seed:12345,saveId:'CATALOG-ONLINE'});
r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_PLAINS'});r.action('OPERATOR_DEBUG',{op:'level',value:20});
const free=structuredClone(r.s),report={characters:[],enemies:[],cards:[],failures:[]};
// Test combat contracts, not balance: durable targets allow all hits of each card to be inspected.
function stage(owner,enemy=false){
 r.s=structuredClone(free);r.startBattle('EG_MOND_HILI_PATROL','RANDOM');r.beginCombat(r.s.runtime.id);
 const b=r.s.runtime;let a;
 if(enemy){const row=r.row('09_MONSTER_DB',owner);a={...structuredClone(b.actors.find(t=>t.side==='ENEMY')),source:owner,name:row[1],grade:row[3],tags:String(row[5]||'').match(/\[[^\]]+\]/g)||[],atk:Number(row[7])||10,range:row[23],tactic:row[24]};a.id='CATALOG_ENEMY';}
 else {a=r.initCombatActor(r.character(owner),1);a.id=owner;}
 a.side=enemy?'ENEMY':'ALLY';a.control='AI';a.level=20;a.turns=1;a.hp=a.maxHp;
 b.actors=[...b.actors.filter(t=>t.side!==a.side||t.id==='PLAYER_CUSTOM'),a];
 for(const t of b.actors){t.hp=t.maxHp=100000;t.shields=[];t.def=0;t.eva=0;t.resist=0;}
 if(enemy){const target=structuredClone(b.actors.find(t=>t.id==='PLAYER_CUSTOM'));target.id='ALLY_DUPLICATE';b.actors.push(target);}
 else {const target=structuredClone(b.actors.find(t=>t.side==='ENEMY'));target.id='ENEMY_DUPLICATE';b.actors.push(target);}
 b.log=[];return a;
}
for(const enemy of [false,true]){
 const owners=r.rows(enemy?'09_MONSTER_DB':'07_CHAR_DB').filter(row=>row[0]);
 for(const row of owners){
  let actor;try{actor=stage(row[0],enemy);}catch(e){report.failures.push({owner:row[0],stage:e.message});continue;}
  const cards=r.actorCards(actor);report[enemy?'enemies':'characters'].push({id:row[0],cards:cards.length});
  const seed=structuredClone(r.s);
  for(const card of cards){
   r.s=structuredClone(seed);actor=r.s.runtime.actors.find(a=>a.id===(enemy?'CATALOG_ENEMY':row[0]));
   const reason=r.cardReason(actor,card);if(reason){report.cards.push({id:card.id,owner:row[0],blocked:reason});continue;}
   try{
    const target=r.cardTargets(actor,card)[0];r.executeCard(actor,card,target?.id);
    const log=r.s.runtime?.log||r.s.lastCombatLog||[];
    for(const e of log.filter(e=>Object.hasOwn(e,'damage')||e.heal>0)){
     assert(e.targetId,card.id+' exact target');assert(Number.isFinite(e.hpBefore)&&Number.isFinite(e.hpAfter),card.id+' HP transition');
    }
    const frame=globalThis.CRPGPresentation.actionFrames(globalThis.CRPGPresentation.delta({saveId:r.s.global.SAVE_ID,battleId:seed.runtime.id,count:0,actors:seed.runtime.actors,resultId:null},r.s));
    report.cards.push({id:card.id,owner:row[0],events:log.length,frames:frame.length});
   }catch(e){report.failures.push({owner:row[0],card:card.id,error:e.stack});}
  }
 }
}
mkdirSync(new URL('../evidence/online-flow/',import.meta.url),{recursive:true});writeFileSync(new URL('../evidence/online-flow/catalog.json',import.meta.url),JSON.stringify(report,null,2));
console.log(JSON.stringify({characters:report.characters.length,enemies:report.enemies.length,cards:report.cards.length,executed:report.cards.filter(x=>!x.blocked).length,blocked:report.cards.filter(x=>x.blocked).length,failures:report.failures.map(x=>({...x,error:x.error?.split('\n')[0]}))}));
assert.equal(report.failures.length,0,'see evidence/online-flow/catalog.json');
