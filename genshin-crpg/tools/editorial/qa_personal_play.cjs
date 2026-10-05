#!/usr/bin/env node
'use strict';
// Play every branch of the personal legend/affection stories on the live runtime and report problems:
//   node tools/editorial/qa_personal_play.cjs [--only PREFIX[,PREFIX…]] [--all]
// By default only chains that have a manuscript (tools/editorial/personal_k) are played; --all plays every event.
// Checks: every path ends with the story context closed, every shown row has text, no action throws,
// every ending row of the event is reached by some path.
const path=require('path'),root=path.resolve(__dirname,'../..');
const {db,R}=require(root+'/tests/helpers_v011.cjs');
const content=require(root+'/tools/editorial/compile_main_story_k.cjs').compile();
const argv=process.argv.slice(2),arg=k=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:null;};
const only=(arg('--only')||'').split(',').filter(Boolean),all=argv.includes('--all');
const manuscript=new Set(content.chains.map(c=>c.id));
const TABLE='57_MOND_STORY_SCENE_DB';
const EVENTWIDE=/^(ROUTE_ID=|HEART\(|BOND_SCORE\(|DONE\(|AFTER_PRIOR_DAILY\(|WORLD_DAY_AFTER|FLAG\(FLAG_(LEG|ISK_LEG)_[A-Z_]+_CLEAR\)|FLAG_(LEG|ISK_LEG)_[A-Z_]+_CLEAR=|ADULT_ROUTE_ENABLED\(|ADULT_CONTENT_ELIGIBLE\(|PROJECT_AGE_CLASS\(|CE_155_|LIYUE_PERSONAL_READY=|MENU_ACCESS=|CURRENT_MAP_ID=|PLAYER_LEVEL_STATE|FLAG_TRV_[A-Z_]*CLEAR=|FLAG_ISK_[A-Z_]*(CLEAR|UNLOCKED)=|FUTURE_PERSONAL|SEPARATE_DAILY)/;
const cp=x=>JSON.parse(JSON.stringify(x));
let problems=[],summary=[];
function base(route){const r=new R(db);r.newGame({name:'검증',route,seed:71247,saveId:'QA-'+route});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',STORY_MENU_POLICY:'',WORLD_TIME:'12:00',MORA:100000});delete r.s.storyJourney;delete r.s.storyBreak;r.prepareStory();return r;}
// Event-wide gates (hearts, bond score, prior events, adult eligibility) are granted; everything else is evaluated for real.
function relax(r){const orig=r.storyCondition.bind(r);r.storyCondition=function(expr,def){const parts=String(expr||'').split(/\s*(?:&&|\bAND\b)\s*/).map(x=>x.trim()).filter(x=>x&&!EVENTWIDE.test(x));return parts.length?orig(parts.join(' && '),def):true;};}
function enter(route,def){
 const r=base(route);relax(r);
 r.s.flags.FLAG_ISK_META_KNOWLEDGE='KNOWN';r.s.quests.Q_ISK_MOND_03={state:'완료',claimed:true};
 if(def.kind==='LEGEND'){
  r.s.global.CURRENT_MAP_ID=def.MAP_ID||r.s.global.CURRENT_MAP_ID;
  for(const m of String(def.START_CONDITION).matchAll(/(FLAG_[A-Z0-9_]+)=(TRUE|FALSE)/g))r.s.flags[m[1]]=m[2]==='TRUE';
  r.s.guildLegends={[def.id]:{day:r.s.global.WORLD_DAY}};
  for(const [item,n]of Object.entries(JSON.parse(def.COST_ITEMS_JSON||'{}')))r.giveItem(item,n);
  r.action('LEGEND_ENTER',{quest:def.id});
 }else{
  r.s.global.CURRENT_MAP_ID=def.MAP_ID||r.s.global.CURRENT_MAP_ID;
  r.s.storyReturnStack||=[];r.s.storyReturnStack.push(r.storyFrame());
  r.s.storyContext={kind:def.kind,entry:def.id,node:def.ENTRY_NODE_ID,table:TABLE};
  Object.assign(r.s.global,{PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'STORY'});r.prepareStory();
 }
 return r;
}
function play(route,def,ix){
 const get=id=>ix.nodes.get(route+':'+id);
 const within=reachable(ix,route,def.ENTRY_NODE_ID);
 const ends=[...within].map(get).filter(x=>x&&['EVENT_END','LEGEND_END','AFFECTION_END','END','SYSTEM'].includes(x[5])&&String(x[13]).startsWith('SCREEN:')).map(x=>x[4]);
 const reachedEnds=new Set(),seenNodes=new Set();let paths=0,maxDepth=0;
 const r0=enter(route,def);
 if(!r0.s.storyContext){problems.push(`${def.id}: could not enter`);return;}
 const start=r0.serialize();
 // One runtime per event; a fork restores the saved state and takes its own option first.
 const run=(state,picks,pick)=>{
  const t0=Date.now();r0.s=r0.validateSave(JSON.parse(state));const r=r0;if(process.env.QA_TRACE)console.error('load',Date.now()-t0,'ms');
  let steps=0;
  while(r.s.storyContext&&steps++<400){
   // Travel to a scene's map, resume after a pause, and win any battle the story starts.
   if(r.s.runtime){for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;r.action('COMBAT_BEGIN');continue;}
   if(r.s.battlePreparation){const prep=r.s.battlePreparation,view=r.battlePreparation(prep.group);r.action('COMBAT_PREPARE',{group:prep.group,companions:(view?.guests||[]).map(x=>x.id).slice(0,3)});continue;}
   if(r.s.storyJourney){const j=r.s.storyJourney;r.s.global.ENCOUNTER_COOLDOWN=9999;if(j.scripted)r.action('STORY_SCRIPTED_TRAVEL');else if(r.s.global.CURRENT_MAP_ID===j.target)r.action('JOURNEY_RESUME');else if(j.special)r.action('STORY_RIDE');else{const nav=r.navigationRoute(j.target);if(!nav?.edges?.length){problems.push(`${def.id}: no route to ${j.target}`);return;}r.action('MOVE',{edge:nav.edges[0][0]});}continue;}
   if(r.s.storyBreak){if(r.s.global.CURRENT_MAP_ID!==r.s.storyBreak.map){const nav=r.navigationRoute(r.s.storyBreak.map);if(!nav?.edges?.length){problems.push(`${def.id}: no break path`);return;}r.action('MOVE',{edge:nav.edges[0][0]});}else r.action('JOURNEY_RESUME');continue;}
   if(r.s.global.SCREEN_MODE==='REWARD'){r.action('MENU',{screen:'STORY'});continue;}
   if(!['STORY','STORY_WAIT'].includes(r.s.global.SCREEN_MODE))r.action('MENU',{screen:'STORY'});
   const choices=r.storyChoices();
   if(choices.length){
    const snap=r.serialize();
    if(pick==null){choices.slice(1).forEach((c,i)=>run(snap,picks.concat(i+1),i+1));r.s=r.validateSave(JSON.parse(snap));}
    const take=pick==null?0:pick;pick=null;
    r.action('STORY_CHOICE',{node:choices[take][4]});picks=picks.concat(take);continue;
   }
   const row=r.storyNode();if(!row){problems.push(`${def.id}: no node at ${r.storyActiveNodeId()}`);return;}
   seenNodes.add(row[4]);
   if(['NARRATION','DIALOGUE','MENU_GATE','EVENT_END','LEGEND_END','AFFECTION_END','END','COMBAT_GATE'].includes(row[5])&&!String(row[9]||'').trim())problems.push(`${def.id}: empty text on ${row[4]}`);
   if(row[5]==='DIALOGUE'&&!row[7])problems.push(`${def.id}: dialogue without speaker ${row[4]}`);
   if(ends.includes(row[4]))reachedEnds.add(row[4]);
   if(row[5]==='COMBAT_GATE'){const b=r.action('STORY_NEXT',{node:row[4]});if(r.s.runtime){for(const a of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))a.hp=0;r.action('COMBAT_BEGIN');}continue;}
   const t1=Date.now();r.action('STORY_NEXT',{node:row[4]});if(process.env.QA_TRACE)console.error('next',row[4],Date.now()-t1,'ms');
  }
  if(r.s.storyContext)problems.push(`${def.id}: path ${picks.join('/')} did not close after 400 steps (at ${r.storyActiveNodeId()})`);
  paths++;maxDepth=Math.max(maxDepth,picks.length);
 };
 try{run(start,[],null);}catch(e){problems.push(`${def.id}: ${e.message}`);}
 for(const e of ends)if(!reachedEnds.has(e))problems.push(`${def.id}: ending ${e} never reached`);
 summary.push({id:def.id,route,paths,nodes:seenNodes.size,ends:reachedEnds.size+'/'+ends.length});
}
const groupCache=new Map();
function reachable(ix,route,entry){const get=id=>ix.nodes.get(route+':'+id);let groups=groupCache.get(route);if(!groups){groups=new Map();for(const x of ix.byTable[TABLE])if(x[0]===route&&x[14]){if(!groups.has(x[14]))groups.set(x[14],[]);groups.get(x[14]).push(x);}groupCache.set(route,groups);}const seen=new Set(),st=[entry];while(st.length){const id=st.pop();if(!id||id.startsWith('SCREEN:'))continue;if(id.startsWith('CHOICE_GROUP:')||id.startsWith('CONDITION_GROUP:')){const g=id.startsWith('CHOICE_GROUP:')?id.slice(13):id.slice(16);if(seen.has(id))continue;seen.add(id);for(const c of groups.get(g)||[])st.push(c[5]==='CHOICE'?c[13]:c[4]);continue;}if(seen.has(id)||!get(id))continue;seen.add(id);st.push(get(id)[13]);}return seen;}
for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
 const ix=base(route).storyIndex();
 const defs=[...ix.legends.values()].concat([...ix.affections.values()]).filter(d=>d.ROUTE_SCOPE===route).filter(d=>all||manuscript.has(d.id)).filter(d=>!only.length||only.some(p=>d.id.startsWith(p)));
 for(const d of defs)play(route,d,ix);
}
for(const s of summary)console.log(JSON.stringify(s));
if(problems.length){console.error('PROBLEMS\n'+problems.join('\n'));process.exit(1);}
console.log('personal play QA OK',summary.length,'events');
