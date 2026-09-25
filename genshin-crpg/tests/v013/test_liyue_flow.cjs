'use strict';
const path=require('path');const root=process.env.CRPG_ROOT||path.resolve(__dirname,'../..'),qaDir=process.env.CRPG_QA_DIR||'/tmp/crpg-v013-flow';const {fs,R,db,fresh}=require(root+'/tests/helpers_v011.cjs');const assert=require('assert/strict'),copy=x=>JSON.parse(JSON.stringify(x));
fs.mkdirSync(qaDir,{recursive:true});const seeds=JSON.parse(fs.readFileSync(path.join(root,'tests/fixtures/liyue-minimal-fixtures.json'),'utf8')).fixtures;
const forks={K1:'ISK_L01_K_1_CHOOSE',K2:'ISK_L01_K_2_CHOOSE',AA1:'ISK_L01_AA_074',AA2:'ISK_L01_AA_127',AB1:'ISK_L01_AB_082',AB2:'ISK_L01_AB_083',B1:'ISK_L01_B_100',B2:'ISK_L01_B_101'};
const result={provenance:'Read-only checkout. Synthetic source-grounded M05 boundary; test-only level20/baseHP100000/baseATK10000 fixture. All Liyue advancement/COMBAT_BEGIN/COMBAT real public actions, no forced finishBattle. This is FLOW QA, NOT difficulty validation.',started:new Date().toISOString(),runs:[]};
function flush(){fs.writeFileSync((process.env.QA_RESUME==='1'?path.join(qaDir,'qa-liyue-resumed-results.json'):path.join(qaDir,'qa-liyue-fresh-results.json')),JSON.stringify(result,null,2));}
function boost(r){const g=r.s.global;Object.assign(g,{PLAYER_LEVEL_STATE:20,PLAYER_XP_STATE:0,PLAYER_BASE_HP:100000,PLAYER_BASE_ATK:10000,PLAYER_BASE_DEF:1000});r.recalculate();g.PLAYER_HP_CURRENT=g.PLAYER_HP_MAX;}
function subset(r){const s=r.s,g=s.global;return {node:r.storyActiveNodeId(),map:g.CURRENT_MAP_ID,hp:g.PLAYER_HP_CURRENT,mora:g.MORA,rng:g.PRNG_STATE,day:g.WORLD_DAY,time:g.WORLD_TIME,choice:g.PENDING_CHOICE_GROUP_ID,battleId:s.runtime?.id,round:s.runtime?.round,battleActors:s.runtime?.actors,objective:s.runtime?.liyueObjective,evac:s.runtime?.liyueEvacuation,flags:s.flags,liyue:s.liyue};}
function restore(r,run,why){const before=copy(subset(r));const s=JSON.parse(r.serialize());r=new R(db,s);assert.deepEqual(copy(subset(r)),before,'save/load changed '+why);run.restores.push({why,node:r.storyActiveNodeId(),round:r.s.runtime?.round});return r;}
function walk(r,target,run){const edges=r.db['47_MAP_EDGE_DB'];const queue=[[r.s.global.CURRENT_MAP_ID,[]]],seen=new Set();while(queue.length){const [map,path]=queue.shift();if(map===target){if(!path.length)return;const row=path[0];run.last={move:row[0],from:row[1],to:row[2]};r.action('MOVE',{edge:row[0]});return;}if(seen.has(map))continue;seen.add(map);for(const row of edges.slice(1)){if(row[1]!==map||row[11]!=='ACTIVE')continue;queue.push([row[2],[...path,row]]);}}throw Error('no path '+r.s.global.CURRENT_MAP_ID+' -> '+target);}
const targets=process.env.QA_LEAVES?process.env.QA_LEAVES.split(','):[...Object.keys(forks),'TRV_A','TRV_B'];
for(const leaf of targets){let r;const run={leaf,actions:0,restores:[],battles:[],chapters:[],choices:[],status:'RUNNING'};result.runs.push(run);flush();try{
 if(process.env.QA_RESUME==='1'&&leaf.startsWith('TRV')){r=new R(db,JSON.parse(fs.readFileSync(path.join(qaDir,'qa-liyue-failure-'+leaf+'.json'),'utf8')));}else if(leaf.startsWith('TRV')){r=fresh('MAP_MOND_CITY','ROUTE_TRAVELER');r.s.flags.FLAG_TRV_MON_CH2_CLEAR=true;r.s.flags.FLAG_TRV_MOND_RELEASED=true;Object.assign(r.questState('Q_TRV_MOND_02'),{state:'완료',claimed:true,completedTurn:1});}
 else r=new R(db,process.env.QA_RESUME==='1'?JSON.parse(fs.readFileSync(path.join(qaDir,'qa-liyue-failure-'+leaf+'.json'),'utf8')):copy(seeds[leaf.slice(0,-1)]));if(process.env.QA_RESUME!=='1')boost(r);r=restore(r,run,'start');const beforeMora=r.s.global.MORA,beforeHero=r.itemCount('MAT_CHAR_EXP_HERO'),beforeAdv=r.itemCount('MAT_CHAR_EXP_ADVENTURER');let priorBattle=null;const saves=new Set();
 for(let i=0;i<3500;i++){
  run.actions=i;
  if(r.s.runtime){let b=r.s.runtime;run.last={battle:b.group,node:r.storyActiveNodeId(),round:b.round,phase:b.phase,objective:b.liyueObjective,evac:b.liyueEvacuation};
   if(!saves.has(b.id+':OPEN')){r=restore(r,run,'battle opening');saves.add(b.id+':OPEN');b=r.s.runtime;}
   if(b.opening?.state==='PENDING'){r.action('COMBAT_BEGIN');continue;}
   if(b.liyueInterlude){r=restore(r,run,'interlude');r.action('LIYUE_INTERLUDE_ACK');continue;}
   if(b.defenseAwaitingRecovery)throw Error('overpowered fixture unexpectedly KO');
   if(!saves.has(b.id+':MID')&&b.round>=2){r=restore(r,run,'battle mid');saves.add(b.id+':MID');b=r.s.runtime;}
   const enemy=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0&&!['BOSS_OSIAL','BOSS_ISK_L04_OSIAL'].includes(a.source));const cards=r.combatCards(),attack=cards.find(c=>c.id==='PLAYER_BASIC_ATTACK'&&!c.reason),guard=cards.find(c=>c.id==='PLAYER_BASIC_GUARD'&&!c.reason);const pick=enemy&&attack?.targets.some(t=>t.id===enemy.id)?attack:guard;if(!pick)throw Error('no usable attack/guard '+JSON.stringify(cards.map(c=>[c.id,c.reason])));r.action('COMBAT',{card:pick.id,...(pick===attack?{target:enemy.id}:{})});
   if(!r.s.runtime){const rec=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);assert.ok(rec.victory,'real battle lost');if(b.liyueEvacuation)assert.ok(rec.rounds>=5,'local defense early victory');if(b.liyueObjective)assert.ok(r.s.lastCombatLog.some(x=>x.objective==='FORMATION_CHARGE'&&x.charge===8),'formation goal');run.battles.push({group:b.group,rounds:rec.rounds,id:rec.id,victory:rec.victory,xp:rec.xp,evac:b.liyueEvacuation,objective:b.liyueObjective});r=restore(r,run,'battle settlement');}
   continue;
  }
  if(r.s.battlePreparation){const b=r.s.battlePreparation;run.last={prepare:b.group,node:b.node};r=restore(r,run,'preparation');r.action('COMBAT_PREPARE',{group:b.group,companions:[]});continue;}
  if(r.s.storyRecovery)throw Error('story entered defeat recovery');
  if(r.s.storyJourney){const j=r.s.storyJourney;run.last={journey:j};if(j.scripted)r.action('STORY_SCRIPTED_TRAVEL');else if(r.s.global.CURRENT_MAP_ID===j.target)r.action('JOURNEY_RESUME');else walk(r,j.target,run);continue;}
  if(r.s.storyBreak){r.action('JOURNEY_RESUME');continue;}
  if(r.s.global.SCREEN_MODE==='REWARD'){r.action('MENU',{screen:'STORY'});continue;}
  const choices=r.storyChoices();if(choices.length){const pick=choices.find(c=>c[4]===forks[leaf])||choices.find(c=>leaf==='TRV_A'&&c[4]==='TRV_LY3_CHOOSE_A'||leaf==='TRV_B'&&c[4]==='TRV_LY3_CHOOSE_B')||choices[0];run.choices.push(pick[4]);run.last={choice:pick[4]};r.action('STORY_CHOICE',{node:pick[4]});continue;}
  if(r.isStoryWaiting()){
   const prefix=leaf.startsWith('TRV')?'Q_TRV_LIYUE_':'Q_ISK_LIYUE_';const completed=r.s.quests[prefix+'04']?.claimed;
   if(completed){r=restore(r,run,'region terminal');assert.ok(r.liyuePersonalReady());if(!leaf.startsWith('TRV')){assert.equal(r.s.global.MORA-beforeMora,1800);assert.equal(r.itemCount('MAT_CHAR_EXP_HERO')-beforeHero,2);assert.equal(r.itemCount('MAT_CHAR_EXP_ADVENTURER')-beforeAdv,3);for(let n=1;n<=4;n++)assert.equal(r.s.quests[prefix+'0'+n].state,'완료');}run.battles=Object.values(r.s.combatReceipts||{}).filter(x=>String(x.origin).startsWith('STORY:ISK_L')||String(x.origin).startsWith('STORY:TRV_LY')).map(x=>({...x}));run.status='PASS';fs.writeFileSync(path.join(qaDir,'qa-liyue-final-'+leaf+'.json'),r.serialize());run.finalSave=path.join(qaDir,'qa-liyue-final-'+leaf+'.json');run.terminal=r.storyActiveNodeId();run.eventCount=Object.keys(r.s.liyue.events).length;run.moraDelta=r.s.global.MORA-beforeMora;break;}
   const offer=r.liyueChapterOffers()[0];run.last={offer,node:r.storyActiveNodeId()};if(!offer?.available)throw Error('No available chapter '+JSON.stringify(offer));r=restore(r,run,'chapter gate');r.action('MAIN_STORY_ACCEPT',{quest:offer.quest});run.chapters.push(offer.quest);r=restore(r,run,'chapter entry');continue;
  }
  const node=r.storyNode();if(!node)throw Error('Missing node '+r.storyActiveNodeId());if(!saves.has(node[1]+':DIALOGUE')&&node[5]==='DIALOGUE'){r=restore(r,run,'dialogue');saves.add(node[1]+':DIALOGUE');}run.last={node:node[4],type:node[5],map:node[8]};r.action('STORY_NEXT',{node:node[4]});
 }
 if(run.status!=='PASS')throw Error('step limit');
 }catch(e){run.status='FAIL';run.error={code:e.code||e.name,message:e.message,stack:e.stack?.split('\n').slice(0,5)};run.cursor=r?.storyActiveNodeId();run.map=r?.s.global.CURRENT_MAP_ID;if(r)fs.writeFileSync(path.join(qaDir,'qa-liyue-failure-'+leaf+'.json'),JSON.stringify(r.s));}
 console.log(JSON.stringify({leaf,status:run.status,actions:run.actions,terminal:run.terminal,battles:run.battles.map(b=>[b.group,b.rounds]),restores:run.restores.length,error:run.error,last:run.status==='FAIL'?run.last:undefined}));flush();
}
result.finished=new Date().toISOString();flush();

if(result.runs.some(r=>r.status!=="PASS"))process.exitCode=1;
