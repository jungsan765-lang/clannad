'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {fresh,R,db,c,advance}=require('./helpers_v011.cjs');
const copy=x=>JSON.parse(JSON.stringify(x)),results=[];
function test(name,fn){try{const evidence=fn()||{};results.push({name,ok:true,...evidence});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);}}
function personalTravel(){
 const r=fresh();r.s.flags.FLAG_TRV_MON_CH2_CLEAR=true;
 r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_NPC_MOND_KATHERYNE'});r.action('LEGEND_REGISTER',{quest:'LEG_MOND_AMBER'});r.action('PLACE_LEAVE');r.action('LEGEND_ENTER',{quest:'LEG_MOND_AMBER'});
 for(let n=0;n<50&&!r.s.storyJourney;n++){const choices=r.storyChoices(),node=choices.find(x=>!/_DEFER$|_SHORTAGE$/.test(x[4]))||choices[0]||r.storyNode();r.action(choices.length?'STORY_CHOICE':'STORY_NEXT',{node:node[4]});}
 assert(r.s.storyJourney,'authored legend must reach a journey');assert.equal(r.s.storyJourney.target,'MAP_MOND_PLAINS');
 const edge=r.view().edges.find(e=>e.row[2]===r.s.storyJourney.target&&!e.reason);assert(edge,'real city-to-plains edge is usable');r.s.global.ENCOUNTER_COOLDOWN=1;r.action('MOVE',{edge:edge.row[0]});assert.equal(r.playPhase(),'FREE');assert.equal(r.s.storyContext.kind,'LEGEND');return r;
}
function rejectAction(r,type,args){const before=r.serialize();assert.throws(()=>r.action(type,args));assert.equal(r.serialize(),before);}
function startWork(r,kind){if(kind==='life')r.action('LIFE_START',{kind:'GATHER'});else r.action('WORLD_WORK_START',{kind:'OCULUS',point:'ANEMO_PLAINS_CART'});return kind==='life'?'lifeJob':'worldJob';}
function rejectImport(s,code){let error;try{new R(db,s);}catch(e){error=e;}assert(error,'invalid injected work should reject');assert.equal(error.code,code);return error.message;}
for(const kind of ['life','world'])test('personal legend travel '+kind+' work reloads, completes once, and preserves return context',()=>{
 let r=personalTravel();const context=copy(r.s.storyContext),journey=copy(r.s.storyJourney);const key=startWork(r,kind),job=copy(r.s[key]);assert.equal(r.s[key].id,job.id);
 rejectAction(r,kind==='life'?'LIFE_FINISH':'WORLD_WORK_FINISH',{job:job.id});
 r=new R(db,JSON.parse(r.serialize()));assert.deepEqual(copy(r.s[key]),job);assert.deepEqual(copy(r.s.storyContext),context);assert.deepEqual(copy(r.s.storyJourney),journey);
 if(kind==='life')r.die=()=>100;advance(job.duration);const output=r.action(kind==='life'?'LIFE_FINISH':'WORLD_WORK_FINISH',{job:job.id}).result;
 assert(!r.s[key]);assert.deepEqual(copy(r.s.storyContext),context);assert.deepEqual(copy(r.s.storyJourney),journey);assert.equal(r.playPhase(),'FREE');
 if(kind==='life'){assert(Object.values(output.items).reduce((a,b)=>a+b,0)>=6);assert.equal(r.s.lifeResources['MAP_MOND_PLAINS:GATHER'].used,1);}else assert.equal(r.s.worldProgress.oculi.ANEMO_PLAINS_CART,1);
 rejectAction(r,kind==='life'?'LIFE_FINISH':'WORLD_WORK_FINISH',{job:job.id});
 r=new R(db,JSON.parse(r.serialize()));r.action('JOURNEY_RESUME');assert(!r.s.storyJourney);assert.equal(r.s.storyContext.entry,context.entry);assert.equal(r.playPhase(),'STORY');return {job:kind,legend:context.entry,phaseAfterResume:r.playPhase()};
});
for(const kind of ['life','world'])test(kind+' work still rejects injection into unpaused personal dialogue or locked story',()=>{
 const r=personalTravel(),key=startWork(r,kind),s=JSON.parse(r.serialize());delete s[key];r.s=s;r.action('JOURNEY_RESUME');const raw=JSON.parse(r.serialize());const job=kind==='life'?{id:raw.global.SAVE_ID+':L'+(raw.global.LAST_COMMITTED_ACTION_SEQ+1),kind:'GATHER',map:raw.global.CURRENT_MAP_ID,day:raw.global.WORLD_DAY,startedAt:Date.now(),duration:10000}:{id:raw.global.SAVE_ID+':W'+(raw.global.LAST_COMMITTED_ACTION_SEQ+1),kind:'OCULUS',point:'ANEMO_PLAINS_CART',stage:'SEARCH_EDGE',map:raw.global.CURRENT_MAP_ID,startedAt:Date.now(),duration:8000};
 // Use the deterministic helper clock from a valid fresh job, without serializing invalid state.
 const donor=personalTravel();const donorKey=startWork(donor,kind);job.startedAt=donor.s[donorKey].startedAt;if(kind==='world'){job.stage=donor.s[donorKey].stage;job.duration=donor.s[donorKey].duration;job.label=donor.s[donorKey].label;}
 raw[key]=job;const code=kind==='life'?'LIFE_SAVE':'WORLD_SAVE',storyMessage=rejectImport(copy(raw),code);raw.global.STORY_MENU_POLICY='SAVE_LOAD_ONLY';const lockedMessage=rejectImport(copy(raw),code);return {storyMessage,lockedMessage};
});
for(const kind of ['life','world'])test(kind+' work injection cannot coexist with pending combat',()=>{
 const donor=personalTravel(),key=startWork(donor,kind),job=copy(donor.s[key]);const r=fresh('MAP_MOND_PLAINS');r.startBattle('EG_MOND_SLIME_SMALL','RANDOM');const s=JSON.parse(r.serialize());job.id=s.global.SAVE_ID+(kind==='life'?':L':':W')+'1';s[key]=job;return {message:rejectImport(s,kind==='life'?'LIFE_SAVE':'WORLD_SAVE')};
});
test('main-story pause keeps life and world work available, and jobs stay mutually exclusive',()=>{
 const r=fresh();Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'TRV_M02_N169',STORY_CURSOR_NODE_ID:'TRV_M02_N169',STORY_WAITING:false,SCREEN_MODE:'STORY'});r.prepareStory();r.action('STORY_NEXT',{node:'TRV_M02_N169'});const edge=r.view().edges.find(e=>e.row[2]==='MAP_MOND_PLAINS'&&!e.reason);r.s.global.ENCOUNTER_COOLDOWN=1;r.action('MOVE',{edge:edge.row[0]});
 r.action('LIFE_START',{kind:'GATHER'});rejectAction(r,'WORLD_WORK_START',{kind:'OCULUS',point:'ANEMO_PLAINS_CART'});r.action('LIFE_CANCEL');r.action('WORLD_WORK_START',{kind:'OCULUS',point:'ANEMO_PLAINS_CART'});rejectAction(r,'LIFE_START',{kind:'GATHER'});r.action('WORLD_WORK_CANCEL');assert(r.s.storyBreak);return {pausedAt:r.s.storyBreak.node};
});
const report={total:results.length,passed:results.filter(r=>r.ok).length,scope:'full source/index.html world_content + runtime modules, current db.json',results};fs.writeFileSync(path.join(__dirname,'../reports/work-validation-results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({total:report.total,passed:report.passed}));if(report.total!==report.passed)process.exitCode=1;
