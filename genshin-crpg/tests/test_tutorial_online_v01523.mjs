import assert from 'node:assert/strict';
import {onlineFixture,R,DB} from './helpers_online.mjs';
const f=onlineFixture();await f.start('ROUTE_TRAVELER');let r=new R(DB);r.newGame({route:'ROUTE_TRAVELER',name:'첫 전투',seed:27,saveId:'TUTORIAL-HTTP'});r.s.global.ENCOUNTER_COOLDOWN=100;
for(let i=0;i<180&&!r.s.battlePreparation;i++){if(r.s.storyJourney){const j=r.s.storyJourney;r.action(r.s.global.CURRENT_MAP_ID===j.target?'JOURNEY_RESUME':'MOVE',r.s.global.CURRENT_MAP_ID===j.target?{}:{edge:r.navigationRoute(j.target).edges[0][0]});continue;}const n=r.storyNode(),cs=r.storyChoices();r.action(cs.length?'STORY_CHOICE':n[5]==='INPUT_TEXT'?'STORY_NAME':'STORY_NEXT',cs.length?{node:cs[0][4]}:n[5]==='INPUT_TEXT'?{name:'첫 전투'}:{node:n[4]});}
f.seed(r.s);
async function once(type,params={}){const requestId=crypto.randomUUID(),revision=f.read().revision;const out=await f.action(type,params,{requestId,revision});assert.equal(out.status,200,JSON.stringify(out));const state=f.read();const retry=await f.action(type,params,{requestId,revision});assert.equal(retry.status,200);assert.equal(f.read().state,state.state);r=new R(DB,JSON.parse(state.state));return out;}
async function rejected(type,params){const before=f.read();const out=await f.action(type,params);assert(out.status>=400,JSON.stringify(out));assert.equal(f.read().state,before.state);}
const group=r.s.battlePreparation.group;
await rejected('COMBAT_PREPARE',{group,companions:[]});await once('PARTY',{char:'MOND_AMBER',slot:2});assert.equal(r.tutorialDirective().id,'equip');await rejected('COMBAT_PREPARE',{group,companions:['MOND_AMBER']});await once('EQUIP',{owner:'MOND_AMBER',slot:r.tutorialState().loan.weaponSlot});await once('COMBAT_PREPARE',{group,companions:['MOND_AMBER']});await once('COMBAT_BEGIN');
for(let n=0;r.s.runtime&&n<20;n++){const card=r.combatCards().find(c=>!c.reason&&c.id==='PLAYER_BASIC_ATTACK');assert(card);await once('COMBAT',{card:card.id,target:card.targets[0]?.id});}
assert(!r.s.runtime);assert(r.tutorialState().done.amberIntro);assert(!r.premiumOwns('MOND_AMBER'));assert(!r.tutorialState().loan);assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).victory,true);
console.log('PASS real Worker + SQLite first-story Amber selection, equipment, combat, permanent ownership boundary and duplicate request receipts');
