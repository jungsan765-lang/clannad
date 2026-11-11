'use strict';
// Current reference combat uses the protagonist's native E/Q actions. The
// historical helper remains unchanged for tests of the earlier basic-only bot.
const assert=require('node:assert/strict');
const base=require('./helpers_abyss.cjs');
const {c}=require('./helpers_v011.cjs');
const {equip}=require('./helpers_abyss_artifacts.cjs');
const HEAL=['FOOD_SWEET_MADAME','FOOD_HASH_BROWN'];
const BUFF=['FOOD_ADEPTUS_TEMPTATION','FOOD_JADE_PARCELS','FOOD_SATISFYING_SALAD'];
function buildSetup(f,o={}){
 const prepared=base.buildSetup(f,{...(f===3?{enh:9,art:1}:{}),...(f===6?{lv:45}:{}),...(f===8?{lv:60,enh:12}:{}),...o}),{r,s}=prepared;
 if(f<3)return prepared;
 // Current late-floor reference investment: protagonist C6, four-star C6,
 // five-star C0 except the fixed, fully invested floor-12 reference party.
 s.constellations={};
 for(const id of r.abyssParty()){
  if(f!==10)equip(r,id,'EQ_FB_ARMOR_JADE_BULWARK',s.enh);
  const n=f>=7&&(id==='PLAYER_CUSTOM'||r.rarityOf(id)===4||f===12)?6:0;s.constellations[id]=n;
  if(n){r.giveItem('STELLA_'+id,n);for(let i=0;i<n;i++)r.action('CONSTELLATION_UNLOCK',{char:id});}
 }
 s.policy=f===10?'E_Q_DAMAGE_RACE':[8,12].includes(f)?'GUARD_AND_TREAT':'E_Q_AND_TREAT';
 s.armor=Object.fromEntries(r.s.inventory.filter(i=>i.equipped&&i.category==='ARMOR').map(i=>[i.owner,i.equip]));
 s.itemStock=Object.fromEntries([...new Set([...HEAL,...BUFF,...Object.values(s.food||{}).flatMap(Object.values)])].map(id=>[id,12]));
 Object.assign(s.itemStock,{TRPG_MEDKIT:3,TRPG_HEALING_POTION:3});
 for(const [item,n] of Object.entries(s.itemStock)){r.giveItem(item,n);s.itemStock[item]=r.itemCount(item);}
 // Full HP is granted once for fixture preparation, never between chambers.
 r.action('OPERATOR_DEBUG',{op:'heal'});
 return prepared;
}
function act(r){
 const b=r.s.runtime,room=c.CRPGRuntime.abyssConfig.floors[b.abyss.floor-1].rooms[b.abyss.chamber-1];
 const cards=r.combatCards().filter(x=>!x.reason),find=id=>cards.find(x=>x.id===id);
 const me=b.actors.find(a=>a.source==='PLAYER_CUSTOM');
 let foes=b.actors.filter(a=>a.side==='ENEMY'&&a.hp>0);
 if(room.alternate&&foes.length>1)foes=foes.filter(a=>a.abyssIndex===(b.round%2?0:1));
 foes.sort((a,b)=>Number(b.abyssHealer)-Number(a.abyssHealer)||a.hp-b.hp);
 let card,target;
 if(b.abyss.floor!==10&&me.hp<me.maxHp*.8){
  card=cards.find(x=>x.id==='ITEM:TRPG_MEDKIT'&&x.targets.some(t=>t.id===me.id))||cards.find(x=>x.id==='ITEM:TRPG_HEALING_POTION'&&x.targets.some(t=>t.id===me.id));
  if(card)target=me;
 }
 if(!card&&([8,12].includes(b.abyss.floor)||me.hp<me.maxHp*(b.abyss.floor===10?.3:.7)))card=find('PLAYER_BASIC_GUARD');
 const expose=find('PLAYER_ISEKAI_E');
 if(!card&&expose){target=foes.find(a=>expose.targets.some(t=>t.id===a.id)&&!a.statuses.some(s=>s.id==='STATUS_ISEKAI_EXPOSED'&&(s.rounds==null||s.rounds>0)));if(target)card=expose;}
 card??=find('PLAYER_ISEKAI_Q')||expose||find('PLAYER_BASIC_ATTACK')||find('PLAYER_BASIC_GUARD');
 assert(card,'a public protagonist action must be available');
 target??=foes.find(a=>card.targets.some(t=>t.id===a.id));
 target??=card.targets.map(t=>b.actors.find(a=>a.id===t.id)||t).sort((a,b)=>a.hp-b.hp)[0];
 r.action('COMBAT',{card:card.id,...(target?{target:target.id}:{})});
}
function fight(r){
 const hadOwn=Object.hasOwn(r,'finishBattle'),finish=r.finishBattle;let inputs=0,observed;
 // Observation only: action() clones its input save, so holding a pre-action
 // battle object would falsely report the starting HP at settlement.
 r.finishBattle=function(...args){
  const b=this.s.runtime;observed={actualKo:b.actors.filter(a=>a.side==='ALLY'&&a.hp<=0).map(a=>a.source),protagonistHp:b.actors.find(a=>a.source==='PLAYER_CUSTOM')?.hp};
  return finish.apply(this,args);
 };
 try{
  r.action('COMBAT_BEGIN');for(;r.s.runtime&&inputs<300;inputs++)act(r);
  assert(!r.s.runtime,'native battle must settle within its room limit');assert(observed,'native settlement was observed');
  const res=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}');res.qa={inputs,...observed};return res;
 }finally{if(hadOwn)r.finishBattle=finish;else delete r.finishBattle;}
}
function runFloor(r,f,{food={},breakHook}={}){
 if(f<3)return base.runFloor(r,f,{food,breakHook});
 const rooms=[];
 for(let ch=1;ch<=3;ch++){
  breakHook?.(ch,r);const before=Object.fromEntries([...HEAL,...BUFF,'TRPG_MEDKIT','TRPG_HEALING_POTION',...Object.values(food[ch]||{})].map(item=>[item,r.itemCount(item)]));
  for(const id of r.abyssParty()){
   for(let n=0;n<6;n++){
    const [hp,max]=base.hpOf(r,id);if(hp<=0||hp>=max)break;
    const last=id==='PLAYER_CUSTOM'?r.s.global.LAST_RECOVERY_MEAL_ITEM_ID:r.s.chars[id].lastRecoveryMeal,item=HEAL.find(x=>x!==last&&r.itemCount(x)>0);
    if(!item)break;r.action('USE_ITEM',{item,owner:id});
   }
   if(base.hpOf(r,id)[0]<=0)continue;
   for(const item of new Set([...BUFF,food[ch]?.[id]||food[ch]?.ALL].filter(Boolean)))if(r.itemCount(item)>0)r.action('USE_ITEM',{item,owner:id});
  }
  r.action('ABYSS_ENTER',{floor:f});const res=fight(r);
  rooms.push({chamber:ch,outcome:res.abyss?.outcome,rounds:res.rounds,xp:res.xp,...res.qa,consumed:Object.fromEntries(Object.entries(before).map(([item,n])=>[item,n-r.itemCount(item)]).filter(([,n])=>n>0)),party:r.abyssParty().map(id=>[id,...base.hpOf(r,id)])});
  if(res.abyss?.outcome!=='NEXT')break;
 }
 return {cleared:rooms.at(-1)?.outcome==='CLEARED',rooms};
}
module.exports={...base,act,fight,runFloor,buildSetup};
