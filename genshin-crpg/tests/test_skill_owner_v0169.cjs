'use strict';
// Native skill/recipient metadata regression. High HP and deterministic hits isolate
// metadata without serving as combat-balance or real-browser evidence.
const assert=require('node:assert/strict');
const {fresh,c,fs,path,vm,root}=require('./helpers_v011.cjs');
const src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
vm.runInContext(src('presentation.js'),c,{filename:'presentation.js'});
function load(game){const sandbox={console,game,addEventListener(){},settings:{combatSpeed:1},innerHeight:800,innerWidth:1280,CSS:{escape:s=>s},document:{documentElement:{classList:{contains:()=>false}},querySelector:()=>null,querySelectorAll:()=>[]}};sandbox.window=sandbox;vm.createContext(sandbox);vm.runInContext(src('app_skill_fx_v0162.js'),sandbox,{filename:'app_skill_fx_v0162.js'});return sandbox.CRPGSkillFX;}
let passed=0;function check(name,fn){fn();passed++;console.log('PASS '+name);}
function setup(){const r=fresh('MAP_MOND_PLAINS'),own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);own.MOND_LISA={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.s.party[1]={slot:'PARTY_2',type:'CHAR',source:'MOND_LISA',control:'AI',active:true,tactic:'균형'};r.s.chars.MOND_LISA.hp=r.character('MOND_LISA').maxHp;r.startBattle('EG_MOND_HILI_PATROL','EXPLICIT');if(r.combatOpening?.())r.action('COMBAT_BEGIN');assert(r.s.runtime);for(const a of r.s.runtime.actors){a.hp=a.maxHp=10000;a.cooldowns={};a.eva=0;a.hit=100;}r.die=()=>50;r.random=()=>.5;return r;}
check('Lisa burst status recipients never present an enemy as using her burst',()=>{
 const r=setup(),b=r.s.runtime,lisa=r.combatActor('MOND_LISA'),enemy=b.actors.find(a=>a.side==='ENEMY'),before=c.CRPGPresentation.snapshot(r.s);b.actionSequence=1;
 const card=r.cardDefinition(r.combatRows('08_SKILL_CARD_DB').find(x=>x[0]==='MOND_LISA_Q'));r.executeCard(lisa,card,enemy.id);b.actionSequence=2;r.aiTurn(enemy,b.actors.filter(a=>a.side==='ALLY'));r.tickFields('END');const after=r.serialize(),frames=c.CRPGPresentation.actionFrames(c.CRPGPresentation.delta(before,r.s)),FX=load(r);FX.newPlayback(frames);
 const status=frames.flatMap(f=>f.events.filter(e=>e.statusApplied&&e.cardId==='MOND_LISA_Q'));assert(status.length);for(const e of status){assert.equal(e.actorId,lisa.id);assert.equal(e.actor,lisa.name);assert(b.actors.some(a=>a.id===e.targetId&&a.side==='ENEMY'));assert.equal(e.sourceKind,'STATUS_APPLY');}
 const enemyActions=frames.filter(f=>f.actorId===enemy.id&&f.cardId);assert(enemyActions.length);assert(enemyActions.every(f=>f.cardId.startsWith('ECARD_')&&f.cardName!==card.name));
 const firstCasts=frames.map(f=>FX.castOf(f)).filter(cast=>cast?.first);assert.equal(firstCasts.filter(cast=>cast.id==='MOND_LISA_Q').length,1);assert(frames.filter(f=>f.sourceKind==='STATUS_APPLY').every(f=>FX.castOf(f)===null));assert(frames.some(f=>f.periodic&&f.actorId===lisa.id&&f.cardId==='MOND_LISA_Q'));assert.equal(r.serialize(),after,'presentation must not change combat/save/RNG state');
});
check('legacy recipient name fallback cannot cast another character skill or label an enemy as its caster',()=>{
 const r=setup(),enemy=r.s.runtime.actors.find(a=>a.side==='ENEMY'),lisa=r.combatActor('MOND_LISA'),FX=load(r),frame={kind:'action',round:1,action:1,actorId:enemy.id,actorSide:'ENEMY',cardId:null,cardName:r.cardDefinition(r.combatRows('08_SKILL_CARD_DB').find(x=>x[0]==='MOND_LISA_Q')).name,events:[],targets:[]};FX.newPlayback([frame]);assert.equal(FX.cardOfFrame(frame),'MOND_LISA_Q');assert.equal(FX.castOf(frame),null);
 const player={...frame,actorId:'PLAYER_CUSTOM',actorSide:'ALLY'};assert.equal(FX.castOf(player),null);const valid={...frame,actorId:lisa.id,actorSide:'ALLY',cardId:'MOND_LISA_Q'};FX.newPlayback([valid]);assert(FX.castOf(valid)?.first);
});
check('caster identity guard preserves native elemental-skill and burst casts for the full installed roster',()=>{
 const roster=load(null).ROSTER;let casts=0,periodicFrames=0,enemyCasts=0;
 for(const key of Object.keys(roster)){
  const player=key.startsWith('TRAVELER_')||key==='ISEKAI',r=fresh('MAP_MOND_PLAINS',key==='ISEKAI'?'ROUTE_ISEKAI':'ROUTE_TRAVELER'),char=player?'MOND_AMBER':key,own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON);own[char]={state:'JOINED'};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.s.chars[char].hp=r.character(char).maxHp;r.s.party[1]={slot:'PARTY_2',type:'CHAR',source:char,control:'AI',active:true,tactic:'균형'};
  if(key.startsWith('TRAVELER_')){const ids=['PLAYER_TRAVELER_ANEMO_E','PLAYER_TRAVELER_ANEMO_Q','PLAYER_TRAVELER_GEO_E','PLAYER_TRAVELER_GEO_Q'];r.protagonistAllowedIds=()=>ids.slice();r.s.global.PLAYER_SKILL_CARD_IDS='PLAYER_BASIC_ATTACK;PLAYER_BASIC_GUARD;'+ids.join(';');}
  r.startBattle('EG_MOND_SLIME_SMALL','EXPLICIT');const b=r.s.runtime,actor=player?r.combatActor():r.combatActor(char);for(const a of b.actors){a.hp=a.maxHp=100000;a.cooldowns={};a.eva=0;a.hit=100;}r.die=()=>50;r.random=()=>.5;const FX=load(r);
  for(const id of FX.cardIdsOf(key)){
   const card=r.cardDefinition(r.combatRows('08_SKILL_CARD_DB').find(row=>row[0]===id)),before=c.CRPGPresentation.snapshot(r.s);b.actionSequence=(b.actionSequence||0)+1;for(const a of b.actors)a.cooldowns={};r.executeCard(actor,card,b.actors.find(a=>a.side==='ENEMY'&&a.hp>0).id,'TAP');
   const frames=c.CRPGPresentation.actionFrames(c.CRPGPresentation.delta(before,r.s));FX.newPlayback(frames);const first=frames.map(f=>FX.castOf(f)).filter(cast=>cast?.first&&cast.id===id);assert.equal(first.length,1,key+' '+id+' '+JSON.stringify(frames.map(f=>({id:f.cardId,source:f.sourceKind,actor:f.actorId}))));assert(frames.filter(f=>f.actorSide==='ENEMY').every(f=>FX.castOf(f)===null),key+' recipient must not cast');casts++;
   // Native enemy commands keep their own card/name after allied buffs and area skills.
   const foes=b.actors.filter(a=>a.side==='ENEMY'&&a.hp>0),enemyBefore=c.CRPGPresentation.snapshot(r.s);b.actionSequence++;for(const enemy of foes){enemy.cooldowns={};r.aiTurn(enemy,b.actors.filter(a=>a.side==='ALLY'&&a.hp>0));}const enemyFrames=c.CRPGPresentation.actionFrames(c.CRPGPresentation.delta(enemyBefore,r.s));FX.newPlayback(enemyFrames);for(const f of enemyFrames.filter(f=>f.actorSide==='ENEMY'&&f.cardId&&f.sourceKind!=='STATUS_APPLY')){assert.equal(FX.castOf(f),null,key+' enemy cannot show allied cast');const enemyCard=r.combatRows('12_ENEMY_CARD_DB').find(row=>row[0]===f.cardId);if(enemyCard){assert.equal(f.cardName,enemyCard[2],key+' enemy skill name');enemyCasts++;}}
   // Advance field ticks natively, including delayed constructs and three-round objects.
   for(let tick=0;tick<3;tick++){const tickBefore=c.CRPGPresentation.snapshot(r.s);b.actionSequence++;r.tickFields('START');r.tickFields('END');const ticks=c.CRPGPresentation.actionFrames(c.CRPGPresentation.delta(tickBefore,r.s));FX.newPlayback(ticks);for(const f of ticks){assert.equal(FX.castOf(f),null,key+' periodic/status update cannot become a new cast');if(f.events?.some(e=>e.statusApplied)&&f.events.every(e=>e.kind==='status'||e.kind==='state'))assert.equal(f.sourceKind,'STATUS_APPLY',key+' status-only must not impersonate a turn');if(f.periodic&&['FIELD','OBJECT'].includes(f.sourceKind)){assert(f.actorId===actor.id||String(f.actorId).startsWith('SUMMON:')&&String(f.actorId).endsWith(':'+actor.id),key+' periodic source '+f.actorId);assert.equal(f.actorSide,'ALLY',key+' field source side');if(String(f.actorId).startsWith('SUMMON:'))assert(f.actor&&f.actor!==actor.name&&foes.every(a=>f.actor!==a.name),key+' construct source name');if(f.cardId){const spec=FX.specOf(f.cardId);if(spec)assert.equal(spec.owner,actor.source,key+' source card owner');}periodicFrames++;}}b.round++;}

  }
 }
 assert(casts>=80);assert(periodicFrames>=20);assert(enemyCasts>=80);console.log('Native roster casts checked: '+casts+'; periodic construct/field frames: '+periodicFrames+'; enemy own casts: '+enemyCasts);
});
console.log(JSON.stringify({passed,nativeBattle:true,realBrowser:false}));
