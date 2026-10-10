'use strict';
const assert=require('node:assert/strict'),{fixture,run}=require('./helpers_balance_v0141.cjs'),{c,fs,root}=require('./helpers_v011.cjs');
const results=[];
// v0.14.4: a prepared party also picks a formation and roles (연계 진형 with one 연계 담당 gives its synergy).
function prepare(r){r.action('FORMATION_SET',{formation:'DOUBLE_LINE'});r.action('PARTY_TACTIC',{slot:2,tactic:'연계우선'});return r;}
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
check('Dvalin: geared 4/4/3/3 loses, prepared level 28 party wins, five seeds each',()=>{const out=[];for(const seed of [717,718,719,720,721])for(const low of [true,false]){const x=run(prepare(fixture(low?[4,4,3,3]:[28,28,28,28],['MOND_AMBER','MOND_LISA','MOND_KAEYA'],low?3:6)),'EG_BOSS_DVALIN',seed);assert.equal(x.result.victory,!low,JSON.stringify({seed,low,result:x.result}));out.push({seed,levels:low?'4/4/3/3':'28/28/28/28',enhance:low?3:6,victory:x.result.victory,rounds:x.result.rounds});}return out;});
const cases=[
 ['FB_ANEMO_HYPOSTASIS',['MOND_AMBER','MOND_LISA','MOND_BENNETT']],
 ['FB_ELECTRO_HYPOSTASIS',['MOND_KLEE','MOND_NOELLE','MOND_BENNETT'],null,'EQ_LY_ARMOR_THUNDERWARD'],
 ['FB_CRYO_REGISVINE',['MOND_AMBER','MOND_LISA','MOND_BENNETT']],
 ['FB_CRYO_HYPOSTASIS',['MOND_AMBER','MOND_LISA','MOND_BENNETT']],
 ['FB_GEO_HYPOSTASIS',['MOND_NOELLE','MOND_RAZOR','MOND_BENNETT'],'EQ_CLAYMORE_WHITEBLIND'],
 ['FB_PYRO_REGISVINE',['MOND_KAEYA','MOND_BARBARA','MOND_LISA'],'EQ_CLAYMORE_WHITEBLIND','EQ_LY_ARMOR_JADEFLAME'],
 ['FB_OCEANID',['MOND_AMBER','MOND_LISA','MOND_BENNETT']],
 ['FB_PRIMO_GEOVISHAP',['MOND_NOELLE','MOND_DIONA','MOND_BENNETT']],
 ['FB_RUIN_SERPENT',['MOND_NOELLE','MOND_DIONA','MOND_BENNETT'],'EQ_CLAYMORE_WHITEBLIND']
];
// v0.14.4: every field boss has its own level (Mond 10-13, Liyue 14-20). The reference is a party at that level with
// the best gear it can hold, the companions' exclusive weapons, the boss's counters and a chosen formation.
const {fixture:geared}=require('./helpers_abyss.cjs'),{artifacts,equip:wear}=require('./helpers_abyss_artifacts.cjs'),FB=c.CRPGRuntime.fieldBosses,enhFor=lv=>lv>=18?10:lv>=15?9:lv>=13?8:7;
// Current Geo requires destroying its resonant/revival pillars. The old
// basic-only all-AI party did not supply reliable Geo damage, lost the
// protagonist, and then healed into a 274-round stalemate. A real C0 Geo
// counter and the public protagonist's pillar targeting are the reference.
// Current reference uses Razor's non-Geo body damage plus heavy pillar attacks;
// the old Noelle/Ningguang/Bennett reference is separately preserved in the genuine old engine.
function geoCounterplay(r,seed,{historical=false}={}){
 if(historical){const {loadBefore,productionBootstrap}=require('./test_enemy_balance_v01627.cjs'),before=productionBootstrap(loadBefore());before.c.Date=c.Date;r=new before.R(before.db,JSON.parse(r.serialize()));}
 r.s.global.PRNG_STATE=seed;const route=FB.route('FB_GEO_HYPOSTASIS');
 r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});
 const b=r.s.runtime,stats=b.actors.map(a=>[a.source,a.level,a.maxHp,a.atk,a.def]);
 assert.equal(b.fieldBoss.behaviorRevision,5);assert.equal(b.origin,'BOSS:'+route);
 const originalFinish=r.finishBattle;let final;
 r.finishBattle=function(win){final=JSON.parse(JSON.stringify(this.s.runtime));return originalFinish.call(this,win);};
 r.action('COMBAT_BEGIN');let pillarInputs=0,ordinaryPillarGate=false;
 for(let n=0;r.s.runtime&&n<150;n++){
  const battle=r.s.runtime,me=battle.actors.find(a=>a.source==='PLAYER_CUSTOM'),cards=r.combatCards().filter(x=>!x.reason),foes=battle.actors.filter(a=>a.side==='ENEMY'&&a.hp>0),pillars=foes.filter(a=>a.fbSummon?.kind==='FB_SUMMON_PILLAR');let card,target;
  if(pillars.length){
   const ordinary=battle.actors.find(a=>a.source==='MOND_BENNETT');
   if(ordinary&&r.fieldBossBarrierReason(ordinary,pillars[0],'물리','근접'))ordinaryPillarGate=true;
   card=cards.find(x=>x.id==='PLAYER_BASIC_ATTACK');target=card&&pillars.filter(a=>card.targets.some(t=>t.id===a.id)).sort((a,b)=>a.hp-b.hp)[0];if(target)pillarInputs++;
  }
  if(!card||!target){
   card=me.hp<me.maxHp*.25?cards.find(x=>x.id==='PLAYER_BASIC_GUARD'):null;
   card??=cards.find(x=>x.id==='PLAYER_ISEKAI_E')||cards.find(x=>x.id==='PLAYER_ISEKAI_Q')||cards.find(x=>x.id==='PLAYER_BASIC_ATTACK')||cards.find(x=>x.id==='PLAYER_BASIC_GUARD');
   target=card?.targets.map(t=>foes.find(a=>a.id===t.id)||t).sort((a,b)=>(a.hp??Infinity)-(b.hp??Infinity))[0];
  }
  if(!card){r.autoUntilPlayer();continue;}r.action('COMBAT',{card:card.id,...(target?{target:target.id}:{})});
 }
 assert.equal(r.s.runtime,null,'public Geo counterplay settles within the input budget');
 const result=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);
 assert(pillarInputs>0,'the protagonist really targeted pillars');assert(ordinaryPillarGate,'ordinary non-Geo attacks remain barred from pillars');
 assert(final.log.some(x=>x.card==='FB_REVIVE_FAILED'),'the final victory actually interrupts revival');
 assert(final.actors.filter(a=>a.side==='ALLY').every(a=>a.hp>0),'this prepared reference wins without relying on exit revival');
 return {stats,result,counterplay:{publicEntry:true,pillarInputs,ordinaryPillarGate,revivalInterrupted:true}};
}
function electroCounterplay(r,seed){
 r.s.global.PRNG_STATE=seed;const route=FB.route('FB_ELECTRO_HYPOSTASIS');
 r.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});r.action('BOSS_ROUTE',{route,entry:'DIRECT'});
 const b=r.s.runtime,stats=b.actors.map(a=>[a.source,a.level,a.maxHp,a.atk,a.def]);assert.equal(b.fieldBoss.behaviorRevision,5);
 const action=r.action,finish=r.finishBattle,inputs=[];let final,ordinaryPrismGate=false;
 r.action=function(type,args){
  if(type==='COMBAT'){
   inputs.push(args.card);const me=this.s.runtime.actors.find(a=>a.source==='PLAYER_CUSTOM'),prism=this.s.runtime.actors.find(a=>a.fbSummon?.kind==='FB_SUMMON_PRISM'&&a.hp>0);
   if(prism&&this.fieldBossBarrierReason(me,prism,'물리','근접'))ordinaryPrismGate=true;
  }
  return action.call(this,type,args);
 };
 r.finishBattle=function(win){final=JSON.parse(JSON.stringify(this.s.runtime));return finish.call(this,win);};
 require('../tools/audit_protagonist_v01618.cjs').play(r);
 assert.equal(r.s.runtime,null,'public Electro counterplay settles within the input budget');
 assert(inputs.some(id=>/^PLAYER_ISEKAI_[EQ]$/.test(id)),'the protagonist really uses support skills');
 assert(ordinaryPrismGate,'ordinary physical attacks remain barred from prisms');
 assert(final.log.some(x=>x.card==='FB_REVIVE_FAILED'),'the final victory actually interrupts revival');
 assert(final.actors.filter(a=>a.side==='ALLY').every(a=>a.hp>0),'this prepared reference wins without relying on exit revival');
 return {stats,result:JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON),counterplay:{publicEntry:true,inputs,ordinaryPrismGate,revivalInterrupted:true}};
}
function bossReference(id,team,weapon,armor){const lv=FB.bosses[id].level,enh=enhFor(lv),r=geared(lv,team,enh);if(lv>=15)artifacts(r,r.abyssParty());for(const m of team)wear(r,m,'EQ_EX_'+m,enh);const put=(eq,owner)=>{const slot=r.giveEquipment(eq);r.action('EQUIP',{slot,owner});r.s.inventory.find(x=>x.slot===slot).enhance=Math.min(enh,10);};if(weapon)put(weapon,'PLAYER_CUSTOM');if(armor)for(const owner of ['PLAYER_CUSTOM',...team])put(armor,owner);prepare(r);r.s.global.CURRENT_MAP_ID=FB.bosses[id].map;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;for(const owner of team)r.s.chars[owner].hp=r.character(owner).maxHp;return{r,lv,enh};}
for(const [id,team,weapon,armor]of cases)check(id+': a prepared party at the boss level can win',()=>{const{r,lv,enh}=bossReference(id,team,weapon,armor),x=id==='FB_GEO_HYPOSTASIS'?geoCounterplay(r,717):id==='FB_ELECTRO_HYPOSTASIS'?electroCounterplay(r,717):run(r,'EG_'+id,717);assert.equal(x.result.victory,true,JSON.stringify(x.result));return{team,weapon,armor,level:lv,enhance:enh,seed:717,rounds:x.result.rounds,stats:x.stats,...(x.counterplay?{counterplay:x.counterplay}:{})};});
check('genuine 0.16.26 Geo keeps the old Noelle/Ningguang/Bennett native counterplay contract',()=>{const team=['MOND_NOELLE','LIYUE_NINGGUANG','MOND_BENNETT'],{r,lv,enh}=bossReference('FB_GEO_HYPOSTASIS',team,'EQ_CLAYMORE_WHITEBLIND'),x=geoCounterplay(r,717,{historical:true});assert.equal(x.result.victory,true);return{team,level:lv,enhance:enh,seed:717,rounds:x.result.rounds,stats:x.stats,counterplay:x.counterplay};});
for(const kind of ['ESCORT','DEFEND'])check('Liyue '+kind+': native level 6 solo fails; regional-level equipped party survives',()=>{const found=Object.entries(c.CRPGLocalStory.episodes).find(([,e])=>e.steps.some(s=>s.kind===kind));assert(found,kind);const [anchor,e]=found,out=[];for(const team of [[],['MOND_AMBER','MOND_KAEYA','MOND_BARBARA']]){const r=fixture(team.length?[48,48,48,48]:[6,6,6,6],team,8);r.storySetCursor('R39_FIELD_'+anchor);r.prepareStory();const f=r.s.liyueField,stage=e.steps.findIndex(s=>s.kind===kind);f.stage=stage;f.steps=e.steps.slice(0,stage).map((_,i)=>({stage:i}));r.s.global.CURRENT_MAP_ID=r.liyueFieldView().target;r.s.global.PRNG_STATE=717;r.action('LIYUE_FIELD_BATTLE');r.action('COMBAT_BEGIN');for(let i=0;i<120&&r.s.runtime;i++){const at=r.combatCards().find(x=>x.id==='PLAYER_BASIC_ATTACK'&&!x.reason);r.action('COMBAT',at?{card:at.id,target:at.targets[0].id}:{card:'PLAYER_BASIC_GUARD'});}assert(!r.s.runtime);const result=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(result.victory,!!team.length);out.push({anchor,team,level:team.length?48:6,enhance:8,seed:717,victory:result.victory,rounds:result.rounds});}return out;});
fs.mkdirSync(root+'/reports/workflow-v01626/v0141',{recursive:true});fs.writeFileSync(root+'/reports/workflow-v01626/v0141/balance.json',JSON.stringify({method:'Historical explicit-origin reference fights plus current public Geo/Electro counterplay; synthetic legal ownership, levels, native stat/damage formulas, enhancement and natural artifact selection. Geo old reference is replayed by the SHA-verified genuine 0.16.26 engine; current Razor reference preserves pillar/ordinary-hit barrier/revival interruption/all-alive contracts. ESCORT/DEFEND retain original plain-basic inputs. No enemy stat edits; no forced win. Reachability and natural acquisition are tested separately. Samples are not exhaustive balance guarantees.',results},null,2)+'\n');
