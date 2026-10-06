import assert from 'node:assert/strict';
import {onlineFixture,R,DB} from './helpers_online.mjs';
const f=onlineFixture();await f.start();
const read=()=>new R(DB,JSON.parse(f.read().state));
function free(){const r=new R(DB);r.newGame({name:'성장 서버 검증',route:'ROUTE_TRAVELER',seed:781,saveId:'SERVER-GROWTH'});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION',MORA:100000});delete r.s.storyJourney;delete r.s.storyBreak;r.prepareStory();return r;}
async function once(type,params={}){const requestId=crypto.randomUUID(),revision=f.read().revision;const x=await f.action(type,params,{requestId,revision});assert.equal(x.status,200,JSON.stringify(x));const saved=f.read();const retry=await f.action(type,params,{requestId,revision});assert.equal(retry.status,200);assert.equal(f.read().state,saved.state);assert.equal(f.read().revision,saved.revision);return read();}
async function reject(type,params){const before=f.read(),out=await f.action(type,params);assert(out.status>=400,JSON.stringify(out));assert.equal(f.read().state,before.state);assert.equal(f.read().revision,before.revision);}
let r=free();r.addXp('PLAYER_CUSTOM',10000000);for(const [id,n]of Object.entries(r.ascensionInfo().cost.items))r.giveItem(id,n);f.seed(r.s);
await reject('CHAR_ASCEND',{owner:'PLAYER_CUSTOM'});r.s.flags.FLAG_TRV_MON_CH1_CLEAR=true;f.seed(r.s);r=await once('CHAR_ASCEND',{owner:'PLAYER_CUSTOM'});assert.equal(r.growth().cap,20);
r.giveItem('GROWTH_TALENT_MOND',4);f.seed(r.s);r=await once('TALENT_UPGRADE',{kind:'na'});assert.equal(r.talentLevels('PLAYER_CUSTOM').base.na,2);await reject('TALENT_UPGRADE',{kind:'na'});
r=await once('TUTORIAL_GUIDE',{enabled:true});assert.equal(r.tutorialDirective(),null);const edge=r.view().edges.find(e=>e.row[2]==='MAP_MOND_PLAINS');r.s.global.ENCOUNTER_COOLDOWN=3;f.seed(r.s);r=await once('MOVE',{edge:edge.row[0]});assert(r.tutorialState().done.move);
r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';f.seed(r.s);await reject('DOMAIN_START',{domain:'EXP:60'});r=await once('DOMAIN_START',{domain:'ASCENSION:5',element:'PYRO'});assert(r.s.runtime.growthDomain);
// Isolated fixture lowers health only to exercise authoritative settlement and its HTTP receipt quickly.
for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=1;f.seed(r.s);r=await once('COMBAT_BEGIN');
for(let n=0;r.s.runtime&&n<15;n++){const card=r.combatCards().find(x=>!x.reason&&x.targets.some(t=>r.s.runtime.actors.find(a=>a.id===t.id)?.side==='ENEMY'));assert(card);r=await once('COMBAT',{card:card.id,target:card.targets[0].id});}
assert(!r.s.runtime);assert.equal(r.itemCount('GROWTH_GEM_PYRO'),2);assert.equal(r.s.domainDaily.wins,1);
assert.equal(JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON).domain.bonus,true);
r=free();r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';f.seed(r.s);r=await once('LIFE_START',{kind:'GATHER'});const job=r.s.lifeJob;
await reject('LIFE_FINISH',{job:job.id,elapsed:job.duration,inputs:[]});job.startedAt=Date.now()-job.duration-50;f.seed(r.s);
await reject('LIFE_FINISH',{job:job.id,elapsed:job.duration,inputs:[{round:0,at:1700,choice:0},{round:0,at:1700,choice:0}]});
r=await once('LIFE_FINISH',{job:job.id,elapsed:job.duration,inputs:[]});assert(!r.s.lifeJob);assert.equal(r.s.lifeResources['MAP_MOND_PLAINS:GATHER'].used,1);
console.log('PASS isolated Worker + SQLite: movement-first guide, ascension and talent costs, domain battle/reward, timed life inputs; rejected actions are atomic and retries never pay twice');
