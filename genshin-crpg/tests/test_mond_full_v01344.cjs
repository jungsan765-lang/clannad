'use strict';
// Complete main-story route flow with synthetic combat power, never a balance test.
const assert=require('node:assert/strict'),{fs,path,root,R,db}=require('./helpers_v011.cjs');
const runs=[];fs.mkdirSync(path.join(root,'reports/mond-v01344'),{recursive:true});
const copy=x=>JSON.parse(JSON.stringify(x));
function boost(r){Object.assign(r.s.global,{PLAYER_LEVEL_STATE:20,PLAYER_XP_STATE:0,PLAYER_BASE_HP:100000,PLAYER_BASE_ATK:10000,PLAYER_BASE_DEF:1000});r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;}
function restore(r,run){const before=JSON.stringify({g:r.s.global,party:r.s.party,inventory:r.s.inventory,flags:r.s.flags,rng:r.s.global.PRNG_STATE});const next=new R(db,JSON.parse(r.serialize()));assert.equal(JSON.stringify({g:next.s.global,party:next.s.party,inventory:next.s.inventory,flags:next.s.flags,rng:next.s.global.PRNG_STATE}),before);run.restores++;return next;}
for(const leaf of (process.env.MOND_LEAVES||'K,AA,AA_DIRECT,AB,B,TRV_MALE,TRV_FEMALE').split(',')){
 let r=new R(db);const trv=leaf.startsWith('TRV'),run={leaf,actions:0,restores:0,battles:[],choices:[],status:'RUNNING'};runs.push(run);
 r.newGame({name:'새벽하늘',route:trv?'ROUTE_TRAVELER':'ROUTE_ISEKAI',seed:58214,saveId:'QA-MOND44-'+leaf});boost(r);
 try{for(let i=0;i<3800;i++){
  run.actions=i;run.cursor=r.storyActiveNodeId();run.map=r.s.global.CURRENT_MAP_ID;
  if(i%80===0)r=restore(r,run);
  if(r.s.runtime){const b=r.s.runtime;
   if(b.opening?.state==='PENDING'){r=restore(r,run);r.action('COMBAT_BEGIN');continue;}
   if(b.interlude){const n=r.storyNode(),cs=r.storyChoices();if(cs.length)r.action('STORY_CHOICE',{node:cs[0][4]});else r.action('STORY_NEXT',{node:n[4]});continue;}
   const cards=r.combatCards(),mechanic=cards.find(c=>c.system&&!c.reason&&c.id===b.storyConfig?.orb_action?.id)||cards.find(c=>c.system&&!c.reason&&c.id===b.storyConfig?.field_access_action?.id)||cards.find(c=>c.system&&!c.reason&&c.id==='SYS_MOND_WIND_ROUTE'),attack=cards.find(c=>c.id==='PLAYER_BASIC_ATTACK'&&!c.reason),guard=cards.find(c=>c.id==='PLAYER_BASIC_GUARD'&&!c.reason),target=attack?.targets?.[0];
   if(mechanic){r.action('COMBAT',{card:mechanic.id,target:mechanic.targets?.[0]?.id});continue;}
   r.action('COMBAT',target?{card:attack.id,target:target.id}:{card:guard.id});
   if(!r.s.runtime){const result=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);assert(result.victory,'fixture lost '+b.group);run.battles.push({group:b.group,rounds:result.rounds});r=restore(r,run);}continue;
  }
  if(r.s.battlePreparation){const prep=r.s.battlePreparation,view=r.battlePreparation(prep.group);const guests=(view?.guests||[]).map(x=>x.id).slice(0,3);r.action('COMBAT_PREPARE',{group:prep.group,companions:guests});continue;}
  if(r.s.storyRecovery)throw Error('unexpected defeat');
  if(r.s.storyJourney){const j=r.s.storyJourney;if(j.scripted)r.action('STORY_SCRIPTED_TRAVEL');else if(r.s.global.CURRENT_MAP_ID===j.target)r.action('JOURNEY_RESUME');else if(j.special)r.action('STORY_RIDE');else{const nav=r.navigationRoute(j.target);assert(nav?.edges?.length,'no route to '+j.target);r.action('MOVE',{edge:nav.edges[0][0]});}continue;}
  if(r.s.storyBreak){if(r.s.global.CURRENT_MAP_ID!==r.s.storyBreak.map){const nav=r.navigationRoute(r.s.storyBreak.map);assert(nav?.edges?.length,'no break path');r.action('MOVE',{edge:nav.edges[0][0]});}else r.action('JOURNEY_RESUME');continue;}
  if(r.s.global.SCREEN_MODE==='REWARD'){r.action('MENU',{screen:'STORY'});continue;}
  const cs=r.storyChoices();if(cs.length){const wants=[leaf==='K'?'FLAG_ISK_META_KNOWLEDGE=KNOWN':'FLAG_ISK_META_KNOWLEDGE=UNKNOWN',leaf==='B'?'FLAG_ISK_MOND_BRANCH=GUILD':'FLAG_ISK_MOND_BRANCH=EXPEDITION',leaf==='AB'?'FLAG_ISK_EXPEDITION_FORK=RETURN':'FLAG_ISK_EXPEDITION_FORK=RIDE',leaf==='TRV_FEMALE'?'FLAG_TRV_AVATAR=FEMALE':'FLAG_TRV_AVATAR=MALE'];let pick=leaf==='AA_DIRECT'?cs.find(x=>x[4]==='ISK_M05_AA_DEPART_DIRECT'):null;pick??=wants.map(w=>cs.find(x=>String(x[12]).includes(w))).find(Boolean)||cs[0];run.choices.push(pick[4]);r.action('STORY_CHOICE',{node:pick[4]});continue;}
  if(r.isStoryWaiting()){
   const complete=trv?r.s.flags.FLAG_TRV_MON_CH2_CLEAR:r.s.flags.FLAG_ISK_M05_CLEAR;
   if(complete){r=restore(r,run);run.status='PASS';run.terminal=r.storyActiveNodeId();run.contacts=Object.keys(r.s.relations);fs.writeFileSync(path.join(root,'reports/mond-v01344/final-'+leaf+'.json'),r.serialize());break;}
   if(r.s.global.STORY_NEXT_PREPARED){r.action('STORY_RESUME');continue;}
   const chapter=r.storyChapterEntries?.().find(c=>!c.reason);if(chapter){r.action('STORY_CHAPTER',{node:chapter.id});continue;}
   const main=r.mainStoryEntries().find(e=>e.available&&!e.reason&&(e.quest||e.id).includes('MOND'));assert(main,'no main story offer '+JSON.stringify(r.mainStoryEntries()));r.action('MAIN_STORY_ACCEPT',{quest:main.quest||main.id});continue;
  }
  const n=r.storyNode();assert(n,'missing node');r.action(n[5]==='INPUT_TEXT'?'STORY_NAME':'STORY_NEXT',n[5]==='INPUT_TEXT'?{name:'새벽하늘'}:{node:n[4]});
 }
 if(run.status!=='PASS')throw Error('step limit');
 }catch(e){run.status='FAIL';run.error={code:e.code,message:e.message,stack:e.stack.split('\n').slice(0,4)};fs.writeFileSync(path.join(root,'reports/mond-v01344/failure-'+leaf+'.json'),JSON.stringify(r.s));process.exitCode=1;}
 console.log(JSON.stringify({...run,choices:run.choices.length}));fs.writeFileSync(path.join(root,'reports/mond-v01344/main-flow.json'),JSON.stringify({scope:'Synthetic combat power; route progression/save compatibility only',runs},null,2));
}
