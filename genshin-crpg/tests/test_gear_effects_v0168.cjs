'use strict';
// Paid public operations plus normalized native damage/healing controls. These
// fixtures isolate gear effects; they are not natural-play balance simulations.
const assert=require('node:assert/strict');
const {fresh,R,db}=require('./helpers_v011.cjs');
const plain=x=>JSON.parse(JSON.stringify(x)),template=fresh('MAP_LIYUE_HARBOR','ROUTE_ISEKAI');
let passed=0;
function check(name,fn){try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.error('FAIL '+name+'\n'+e.stack);}}
function fixture(){const r=Object.assign(Object.create(template),{s:plain(template.s)});Object.assign(r.s.global,{MORA:1000000,PLAYER_LEVEL_STATE:60,SCREEN_MODE:'LOCATION'});r.s.ascensions.PLAYER_CUSTOM=6;r.s.inventory=[];r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;return r;}
function join(r,id,slot=2){const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');own[id]={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.s.party[slot-1]={slot:'PARTY_'+slot,type:'CHAR',source:id,active:true,control:'AI',tactic:'균형'};Object.assign(r.s.chars[id],{level:60,xp:0});r.s.ascensions[id]=6;r.s.chars[id].hp=r.character(id).maxHp;}
function forge(r){const e=r.placeEntries().find(x=>x.merchant==='MRC_LIYUE_EQUIP'&&x.modes.includes('CRAFT'));r.action('PLACE_ENTER',{place:e.id,mode:'CRAFT'});}
function wear(r,equip,enhance=0,owner='PLAYER_CUSTOM'){if(owner!=='PLAYER_CUSTOM')join(r,owner);const slot=r.giveEquipment(equip),inv=r.s.inventory.find(x=>x.slot===slot);inv.enhance=enhance;r.action('EQUIP',{slot,owner});return slot;}
function arena(r,owner){const a=r.initCombatActor(owner==='PLAYER_CUSTOM'?r.player():r.character(owner),2);Object.assign(a,{hp:1,atk:100,crit:0,hit:98,statuses:[],shields:[],position:{x:2,y:0}});
 const e={id:'MON_HILI_FIGHTER#1',source:'MON_HILI_FIGHTER',name:'피해 검사',side:'ENEMY',hp:10000,maxHp:10000,atk:0,def:0,level:1,spd:10,hit:98,eva:0,crit:0,critDmg:0,resist:0,statuses:[],shields:[],auras:[],aura:null,turns:0,cooldowns:{},range:'근접',family:'츄츄족',slot:1,position:{x:3,y:0}};
 r.s.runtime={combatVersion:1,id:'GEAR-TEST',group:'EG_MOND_HILI_PATROL',origin:'AUDIT',actors:[a,e],fields:[],log:[],round:1,ticks:{},order:[a.id,e.id],cursor:0,phase:'WAIT_PLAYER',actionSequence:1};r.random=()=>.5;r.die=()=>50;return {a,e};}
function hit(r,a,e,kind='normal'){e.hp=e.maxHp;const before=e.hp;if(kind==='normal')r.basicHit(a,e,1);else r.damage(a,e,1,'물리',{sureHit:true,...(kind==='skill'?{card:a.source+'_E'}:{sourceKind:'FOLLOWUP'})});return before-e.hp;}

check('Prism Lens and Bloom Pin retain paid craft/equip value and reject useless enhancement without charging',()=>{
 for(const equip of ['EQ_FB_SPECIAL_PRISM_LENS','EQ_FB_ACC_BLOOM_PIN']){
  const r=fixture(),recipe=r.rows('17_RECIPE_DB').find(row=>row[3]===equip),cost=r.recipeCost(recipe);
  for(const [id,n]of Object.entries(cost.items))r.giveItem(id,n);forge(r);const mora=r.s.global.MORA;
  assert.equal(r.actionReason('CRAFT',{recipe:recipe[0]}),'');r.action('CRAFT',{recipe:recipe[0]});assert.equal(mora-r.s.global.MORA,cost.mora);
  for(const id of Object.keys(cost.items))assert.equal(r.itemCount(id),0);
  const inv=r.s.inventory.find(x=>x.equip===equip);r.action('EQUIP',{slot:inv.slot});
  const stats=plain(r.equipmentStats('PLAYER_CUSTOM')),traits=plain(r.actorTraits('PLAYER_CUSTOM'));
  assert.equal(equip.includes('PRISM')?stats.HIT:stats.STATUS_RESIST,6);assert(Object.keys(traits).length>0);
  r.giveItem('ORE_IRON',1);const quote=plain(r.enhancementQuote(inv.slot));assert.equal(quote.supported,false);assert.match(quote.reason,/증가하는 능력치·효과가 없어/);assert.equal(quote.cost,null);
  const before=r.serialize();assert.equal(r.actionReason('ENHANCE',{slot:inv.slot,expectedLevel:0}),quote.reason);
  assert.throws(()=>r.action('ENHANCE',{slot:inv.slot,expectedLevel:0}),/증가하는 능력치·효과가 없어/);assert.equal(r.serialize(),before,'no money, material, time, level or receipt mutation');
  assert.throws(()=>r.action('EQUIP_ASCEND',{slot:inv.slot}),/증가하는 능력치·효과가 없어/);assert.equal(r.serialize(),before);
  // Previously paid saved levels remain loadable; they neither grant new value nor permit more spending.
  const legacy=r.s.inventory.find(x=>x.slot===inv.slot);legacy.enhance=12;legacy.enhancementCap=12;const loaded=new R(db,JSON.parse(r.serialize()));
  assert.equal(loaded.s.inventory.find(x=>x.slot===inv.slot).enhance,12);
  assert.deepEqual(plain(loaded.equipmentStats('PLAYER_CUSTOM')),stats);assert.deepEqual(plain(loaded.actorTraits('PLAYER_CUSTOM')),traits);
  assert.equal(loaded.enhancementQuote(inv.slot).supported,false);
 }
});

check('real +5 to +6 payments grant Rust and White Tassel normal bonuses once, independently of base ATK',()=>{
 for(const [equip,owner,bonus]of [['EQ_BOW_RUST','MOND_AMBER',11],['EQ_POLEARM_WHITE_TASSEL','LIYUE_XIANGLING',7]]){
  const r=fixture(),slot=wear(r,equip,5,owner);let {a,e}=arena(r,owner);assert.equal(hit(r,a,e),100);
  r.s.runtime=null;forge(r);const q=plain(r.enhancementQuote(slot));for(const [id,n]of Object.entries(q.cost.items))r.giveItem(id,n);
  const mora=r.s.global.MORA,beforeAtk=r.equipmentStats(owner).ATK;r.die=()=>1;const receipt=r.action('ENHANCE',{slot,expectedLevel:5}).result;
  assert.equal(receipt.outcome,'SUCCESS');assert.equal(receipt.level,6);assert.equal(mora-r.s.global.MORA,q.cost.mora);
  for(const id of Object.keys(q.cost.items))assert.equal(r.itemCount(id),0);assert(r.equipmentStats(owner).ATK>beforeAtk);
  assert.equal(r.actorTraits(owner).NORMAL_DAMAGE,bonus);const loaded=new R(db,JSON.parse(r.serialize()));assert.equal(loaded.actorTraits(owner).NORMAL_DAMAGE,bonus);
  ({a,e}=arena(r,owner));assert.equal(hit(r,a,e),100+bonus);assert.equal(hit(r,a,e,'skill'),100);assert.equal(hit(r,a,e,'followup'),100);
  const inv=r.s.inventory.find(x=>x.slot===slot);inv.enhance=9;({a,e}=arena(r,owner));assert.equal(hit(r,a,e),equip==='EQ_BOW_RUST'?114:110,'higher absolute milestone replaces +6 instead of stacking');
 }
});

check('Slingshot bonus applies only to near normal shots, and legacy overlaps do not double-count authored traits',()=>{
 for(const level of [0,6,9]){
  const r=fixture();wear(r,'EQ_BOW_SLINGSHOT',level,'MOND_AMBER');const {a,e}=arena(r,'MOND_AMBER'),expected={0:100,6:109,9:112}[level];
  assert.equal(hit(r,a,e),expected);e.position.x=4;assert.equal(hit(r,a,e),100);e.position.x=3;assert.equal(hit(r,a,e,'skill'),100);assert.equal(hit(r,a,e,'followup'),100);
  const cold=fixture();wear(cold,'EQ_SWORD_COOL_STEEL',level,'MOND_KAEYA');const {a:c,e:t}=arena(cold,'MOND_KAEYA');assert.equal(c.traits.AURA_HUNTER['물/얼음'],12);
  assert.equal(hit(cold,c,t),100);t.aura='물';t.auras=[{element:'물'}];assert.equal(hit(cold,c,t),112);t.aura='얼음';t.auras=[{element:'얼음'}];assert.equal(hit(cold,c,t),112);
  const ring=fixture();wear(ring,'EQ_ACC_VITAL_RING',level);const {a:p}=arena(ring,'PLAYER_CUSTOM');assert.equal(p.traits.HEAL_BOOST,8);assert.equal(ring.heal(p,100,'대조군'),108);
 }
});

check('native Mika Q feathers retain caster identity, apply HEAL_OUT once and survive save/load',()=>{
 for(const equipped of [false,true]){
  const r=fixture();join(r,'MOND_MIKA');if(equipped)wear(r,'EQ_EX_MOND_MIKA',0,'MOND_MIKA');let {a:mika,e}=arena(r,'MOND_MIKA');mika.maxHp=10000;
  const recipient=r.initCombatActor(r.player(),1);Object.assign(recipient,{name:mika.name,hp:1,maxHp:10000,atk:100,hit:98,crit:0,traits:{HEAL_OUT:90},position:{x:2,y:0}});
  r.s.runtime.actors.unshift(recipient);r.executeCard(mika,r.cardDefinition(r.row('08_SKILL_CARD_DB','MOND_MIKA_Q')),e.id);
  const feather=recipient.statuses.find(s=>s.id==='HAWK_FEATHER');assert.equal(feather.actor,mika.id);assert.equal(feather.sourceName,mika.name);assert.equal(feather.sourceMaxHp,10000);
  const loaded=new R(db,JSON.parse(r.serialize()));loaded.random=()=>.5;loaded.die=()=>50;
  const b=loaded.s.runtime,p=b.actors.find(x=>x.id===recipient.id),caster=b.actors.find(x=>x.id===mika.id),foe=b.actors.find(x=>x.side==='ENEMY');p.hp=1;
  loaded.basicHit(p,foe,1);assert.equal(p.hp-1,equipped?460:400,'same display name must not select the recipient as healer');
  p.hp=1;loaded.basicHit(p,foe,1);assert.equal(p.hp,1,'one feather heal per recipient per round');b.round++;p.hp=1;loaded.basicHit(p,foe,1);assert.equal(p.hp-1,equipped?460:400);
  p.statuses=p.statuses.filter(s=>s.id!=='HAWK_FEATHER');p.hp=1;b.round++;loaded.basicHit(p,foe,1);assert.equal(p.hp,1,'no feather means no follow-up heal');
  p.hp=1;assert.equal(loaded.heal(p,400,caster.name,caster.id),equipped?460:400,'direct source attribution remains a single multiplier');
 }
});
console.log('Gear effects v0.16.8: '+passed+'/4 passed');
