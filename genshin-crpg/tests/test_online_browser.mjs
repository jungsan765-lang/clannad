import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {onlineFixture,R,DB} from './helpers_online.mjs';
import {ENGINE_FINGERPRINT} from '../server/generated/engine.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=resolve(import.meta.dirname,'..'),version=JSON.parse(readFileSync(resolve(root,'package.json'))).version,evidence=resolve(root,'evidence/online-flow');mkdirSync(evidence,{recursive:true});
const server=createServer((req,res)=>{let path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(path.includes('..')){res.writeHead(403).end();return;}const source=resolve(root,'source',path),file=!process.env.CRPG_TEST_DIST&&/\.(js|css|html)$/.test(path)&&existsSync(source)?source:resolve(root,'dist',path);try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp'})[extname(file)]||'application/octet-stream');let data=readFileSync(file);if(!process.env.CRPG_TEST_DIST&&path==='assets.js')data=data.toString().replace(/"appVersion":\s*"[^"]*"/,'"appVersion":'+JSON.stringify(version))+'\nwindow.CRPG_MANIFEST.engineVersion='+JSON.stringify(ENGINE_FINGERPRINT)+';';res.end(data);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const fixture=onlineFixture();await fixture.start();
const browser=await chromium.launch({headless:true,executablePath:process.env.CRPG_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],calls=[];
page.on('pageerror',e=>errors.push(e.message));
let delay=0,drops=0,arrivalDelay=0;
await page.route('https://genshin-crpg-online.jungsan765.workers.dev/**',async route=>{
 const req=route.request(),body=req.postDataJSON(),path=new URL(req.url()).pathname;
 calls.push({path,type:body?.type,requestId:body?.requestId,at:Date.now()});
 if(arrivalDelay&&path==='/game/action')await new Promise(r=>setTimeout(r,arrivalDelay));
 const out=await fixture.call(path,req.method()==='GET'?undefined:body),serverTime=Date.now();
 if(delay&&path==='/game/action')await new Promise(r=>setTimeout(r,delay));
 if(drops&&path==='/game/action'){drops--;await route.abort('failed');return;}
 const status=out.status;delete out.status;
 await route.fulfill({status,headers:{'Content-Type':'application/json','X-Server-Time':String(serverTime),'Access-Control-Allow-Origin':'*','Access-Control-Expose-Headers':'X-Server-Time'},body:JSON.stringify(out)});
});
await page.addInitScript(({account,token})=>{localStorage.setItem('crpg-online-session-v1',JSON.stringify({account,token}));const realNow=Date.now;Date.now=()=>realNow()+300000;},{account:fixture.account,token:fixture.token});
const idle=()=>page.waitForFunction(()=>!busy,{},{timeout:60000});
const start=async()=>{await page.goto(origin);await page.locator('.title-start').click();await idle();};
const same=async(label)=>{const state=await page.evaluate(()=>JSON.parse(game.serialize())),saved=JSON.parse(fixture.read().state);for(const key of ['CURRENT_STORY_NODE_ID','STORY_CURSOR_NODE_ID','CURRENT_MAP_ID','MORA','PLAYER_HP_CURRENT','LAST_COMMITTED_ACTION_ID'])assert.equal(state.global[key],saved.global[key],label+': '+key);for(const key of ['runtime','inventory','party','chars','quests','flags','relations','lifeJob','worldJob','storyContext','storyJourney','storyBreak','battlePreparation','placeVisit'])assert.deepEqual(state[key],saved[key],label+': '+key);return state;};
const free=()=>{const r=new R(DB,JSON.parse(fixture.read().state));if(r.s.runtime)r.action('COMBAT_FORFEIT',{reason:'TEST'});r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'travel',map:'MAP_MOND_PLAINS'});return r;};
const results=[];
try{
 await start();await same('start');
 delay=1800;const storyRevision=fixture.read().revision;
 await page.evaluate(()=>{window.readPresentationTimes=[];const original=act;act=function(type,params){const start=performance.now(),out=original(type,params);if(type==='STORY_NEXT'&&!busy)readPresentationTimes.push(performance.now()-start);return out;};});
 const readButton=()=>page.getByRole('button',{name:'계속 읽기',exact:true});
 const readNodes=[],readDurations=[];
 for(let i=0;i<2;i++){const t=Date.now();await readButton().click();readDurations.push(Date.now()-t);readNodes.push(await page.evaluate(()=>game.storyActiveNodeId()));}
 assert.equal(fixture.read().revision,storyRevision,'reading must not synchronously save every line');
 await page.evaluate(()=>{window.readFlush=CRPGOnline.flushReading();});
 await page.waitForFunction(()=>CRPGOnline.pending?.type==='STORY_READ');
 for(let i=0;i<3;i++){const t=Date.now();await readButton().click();readDurations.push(Date.now()-t);readNodes.push(await page.evaluate(()=>game.storyActiveNodeId()));assert.equal(await page.evaluate(()=>busy),false);}
 assert.equal(new Set(readNodes).size,5,'all five lines advance before the first response');
 assert.equal(await page.locator('.pending-action-notice').count(),0);
 await page.locator('[data-screen="SYSTEM"]').click();await idle();
 assert.equal(await page.evaluate(()=>game.s.global.SCREEN_MODE),'SYSTEM');
 assert(await page.evaluate(()=>CRPGOnline.pending?.type==='STORY_READ'),'menu opens before the outstanding reading response');
 await page.evaluate(()=>window.readFlush);assert.equal(await page.evaluate(()=>game.s.global.SCREEN_MODE),'SYSTEM','reading acknowledgement must not close the menu');
 await page.evaluate(()=>document.querySelector('main > aside nav [data-screen="STORY"]').click());await idle();delay=0;
 assert.equal(await page.evaluate(()=>game.storyActiveNodeId()),readNodes.at(-1),'returning from menus preserves the visible reading position');
 results.push({menuDuringReadingSave:true,menuPreservedOnAcknowledgement:true});
 await same('background reading');assert.equal(fixture.read().revision,storyRevision+2,'five lines are two checkpoints while reading during an in-flight batch');
 assert.equal(await page.evaluate(()=>CRPGOnline.readingCount()),0);
 results.push({uninterruptedStoryInputs:5,checkpoints:2,readDurations,presentationMilliseconds:await page.evaluate(()=>readPresentationTimes)});
 // A reload before the debounce sends anything recovers the durable reading command, once.
 const restart=new R(DB);restart.newGame({name:'검증',route:'ROUTE_ISEKAI',seed:7317,saveId:crypto.randomUUID()});fixture.seed(restart.s);await start();
 await readButton().click();const beforeReloadNode=await page.evaluate(()=>game.storyActiveNodeId());
 await page.reload();await page.locator('.title-start').click();await idle();await same('unsent reading reload');assert.equal(await page.evaluate(()=>game.storyActiveNodeId()),beforeReloadNode);
 // The next choice and all remaining unsent lines form one authoritative transaction.
 const boundaryRevision=fixture.read().revision;
 for(let i=0;i<4;i++)await readButton().click();
 const choice=await page.evaluate(()=>game.storyChoices()[0]);assert(choice);
 const choiceRequests=calls.length;await page.locator('.choice').first().click();await idle();await page.waitForTimeout(1200);assert.equal(calls.length,choiceRequests,'dialogue choices and reading pauses never trigger a server save');assert.equal(fixture.read().revision,boundaryRevision);assert.equal(await page.locator('.action-feedback,.pending-action-notice').count(),0);await page.evaluate(()=>CRPGOnline.flushReading());await same('reading and decision');
 assert.equal(fixture.read().revision,boundaryRevision+1);results.push({reloadReadingOnce:true,decisionWithReadingPrefix:true});
 const visited=[];
 for(let i=0;i<16;i++){
  const current=await page.evaluate(()=>({node:game.storyActiveNodeId(),choices:game.storyChoices().length,kind:game.storyNode()?.[5]}));
  const next=page.getByRole('button',{name:current.kind==='INPUT_TEXT'?'정한 이름 알려 주기':'계속 읽기',exact:true});if(current.choices||!await next.count())break;
  assert(!visited.includes(current.node),'story node repeated');visited.push(current.node);await next.click();await idle();await page.evaluate(()=>CRPGOnline.flushReading());await same('story '+i);
 }
 assert(visited.length>=1);results.push({storyNodes:visited});
 await page.screenshot({path:resolve(evidence,'story.png')});
 const count=calls.length,rev=fixture.read().revision;
 await page.locator('[data-screen="SYSTEM"]').click();await idle();await page.evaluate(()=>document.querySelector('main > aside nav [data-screen="STORY"]').click());await idle();await page.evaluate(async()=>{for(let i=0;i<150;i++){await CRPGOnline.execute('MENU',{screen:'SYSTEM'});await CRPGOnline.execute('MENU',{screen:'STORY'});}render();});assert.equal(calls.length,count);assert.equal(fixture.read().revision,rev);results.push({menuRequests:0,repeatedMenuCycles:150});
 // A committed reading checkpoint whose two responses are lost survives reload without replaying lines.
 fixture.seed(restart.s);await start();drops=2;
 for(let i=0;i<3;i++)await readButton().click();const lostReadNode=await page.evaluate(()=>game.storyActiveNodeId());
 await page.evaluate(()=>CRPGOnline.flushReading().catch(()=>render()));await page.waitForSelector('.pending-action-notice',{timeout:15000});const lostReadRevision=fixture.read().revision;
 assert.equal(await page.evaluate(()=>game.storyActiveNodeId()),lostReadNode,'lost acknowledgement cannot regress the displayed line');
 await page.reload();await page.locator('.title-start').click();await idle();await same('lost reading response reload');
 assert.equal(fixture.read().revision,lostReadRevision);assert.equal(await page.evaluate(()=>CRPGOnline.readingCount()),0);results.push({lostReadingResponseReloadExactlyOnce:true});
 // A rejected legacy action may carry a valid unsaved dialogue prefix. Restore that prefix once.
 fixture.seed(restart.s);await start();for(let i=0;i<3;i++)await readButton().click();const prefixNode=await page.evaluate(()=>game.storyActiveNodeId());
 await page.evaluate(()=>{const account=CRPGOnline.account.id,reading=JSON.parse(localStorage.getItem('crpg-online-reading-v1'))[account];const p={account,requestId:crypto.randomUUID(),revision:CRPGOnline.revision,version:'0.13.49',uiScreen:reading.uiScreen,uiActions:reading.uiActions,reading:reading.entries,type:'RELATION_ACTIVITY',params:{activityId:'DAILY:LEG_ISK_MOND_AMBER'}};localStorage.setItem('crpg-online-pending-accounts-v2',JSON.stringify({[account]:p}));CRPGOnline.pending=p;});
 await page.reload();await page.locator('.title-start').click();await idle();assert.equal(await page.evaluate(()=>CRPGOnline.pending),null);assert.equal(await page.evaluate(()=>game.storyActiveNodeId()),prefixNode);assert.equal(await page.evaluate(()=>CRPGOnline.readingCount()),3);
 await readButton().click();await page.evaluate(()=>CRPGOnline.flushReading());await same('rejected action with dialogue prefix');results.push({legacyRejectedPrefixRestoredOnce:true});
 // A one-response protagonist line must advance instantly with zero network requests.
 const singleton=new R(DB,structuredClone(restart.s));Object.assign(singleton.s.global,{SCREEN_MODE:'STORY',STORY_WAITING:false,PENDING_CHOICE_GROUP_ID:'ISK_M03_G_065',CURRENT_STORY_NODE_ID:'CHOICE_GROUP:ISK_M03_G_065',STORY_CURSOR_NODE_ID:'CHOICE_GROUP:ISK_M03_G_065'});fixture.seed(singleton.s);await start();
 assert.equal(await page.locator('.choice').count(),1);const singletonCalls=calls.length,singletonRevision=fixture.read().revision;
 await page.locator('.choice').click();await idle();await page.waitForTimeout(1300);assert.equal(calls.length,singletonCalls);assert.equal(fixture.read().revision,singletonRevision);assert.equal(await page.evaluate(()=>game.storyActiveNodeId()),'ISK_M03_A_066');assert.equal(await page.locator('.action-feedback,.pending-action-notice').count(),0);
 await page.screenshot({path:resolve(evidence,'single-response.png')});await page.evaluate(()=>CRPGOnline.flushReading());await same('single response checkpoint');results.push({singleResponseRequests:0,singleResponseProgress:'ISK_M03_A_066'});
 // Play a whole real scene through response choices; only its end triggers a checkpoint.
 fixture.seed(restart.s);await start();const sceneCalls=calls.length;let sceneSteps=0;
 for(let i=0;i<80;i++){
  const step=await page.evaluate(()=>{const c=game.storyChoices(),n=c[0]||game.storyNode(),type=c.length?'STORY_CHOICE':n?.[5]==='INPUT_TEXT'?'STORY_NAME':'STORY_NEXT',params=type==='STORY_NAME'?{name:game.s.global.PLAYER_NAME}:{node:n?.[4]},preview=n&&game.previewStoryRead(n[4],type,params);return preview?{type,params,boundary:preview.boundary}:null;});if(!step)break;
  await page.evaluate(({type,params})=>act(type,params),step);sceneSteps++;assert.equal(await page.evaluate(()=>busy),false);if(step.boundary)break;assert.equal(calls.length,sceneCalls,'no intermediate dialogue/choice checkpoints');
 }
 assert(sceneSteps>=30);await page.waitForFunction(()=>!CRPGOnline.readingCount()&&!CRPGOnline.pending);await same('automatic scene end checkpoint');assert.equal(calls.length,sceneCalls+1);results.push({sceneSteps,automaticSceneCheckpoints:1});
 fixture.seed(free().s);await start();
 const lostRevision=fixture.read().revision;drops=2;
 await page.evaluate(()=>act('WAIT',{minutes:10}));await idle();
 assert(await page.getByRole('button',{name:'진행 확인 다시 시도',exact:true}).isVisible());
 assert.equal(fixture.read().revision,lostRevision+1);assert(await page.evaluate(()=>!!CRPGOnline.pending));
 await page.getByRole('button',{name:'진행 확인 다시 시도',exact:true}).click();await idle();await same('lost response recovery');
 assert.equal(fixture.read().revision,lostRevision+1);assert.equal(new Set(calls.filter(c=>c.type==='WAIT').map(c=>c.requestId)).size,1);results.push({lostResponseExactlyOnce:true});
 const relations=free();relations.markContact('PROFILE_MOND_AMBER');fixture.seed(relations.s);await start();
 await page.locator('[data-screen="RELATIONS"]').click();await idle();
 const card=page.locator('.relationship-card').filter({hasText:'엠버'}).first();await card.locator('summary').click();
 // v0.14.0 removed daily exchange activities; the locked next affection stage still explains its blocker in red.
 assert.equal(await card.locator('.relationship-activities').count(),0,'daily exchange activities were removed');
 const unmet=card.locator('.relationship-next.requirement-unmet');assert((await unmet.innerText()).includes('개인'));assert.equal(await unmet.evaluate(n=>getComputedStyle(n).color),'rgb(255, 155, 155)');
 assert.equal(await unmet.evaluate(n=>getComputedStyle(n).wordBreak),'keep-all','relationship prerequisites keep Korean words together');
 const lockedActivity=Object.values(globalThis.CRPGRelationships.activitiesFromDB(DB)).find(x=>x.profileId==='PROFILE_MOND_AMBER'&&x.route===relations.s.global.STORY_ROUTE_ID);assert(relations.actionReason('RELATION_ACTIVITY',{activityId:lockedActivity.id}));
 const beforeLocked=fixture.read().revision;await page.evaluate(id=>act('RELATION_ACTIVITY',{activityId:id}),lockedActivity.id);await idle();assert.equal(fixture.read().revision,beforeLocked);assert.equal(await page.evaluate(()=>CRPGOnline.pending),null);
 const dismiss=page.getByRole('button',{name:'나중에 보기',exact:true});if(await dismiss.count())await dismiss.click();await card.scrollIntoViewIfNeeded();await page.screenshot({path:resolve(evidence,'relationship-locked.png')});
 await page.evaluate(({id,revision})=>{const p={account:CRPGOnline.account.id,requestId:crypto.randomUUID(),revision,version:'0.13.49',uiScreen:'RELATIONS',uiActions:[],reading:[],type:'RELATION_ACTIVITY',params:{activityId:id}};localStorage.setItem('crpg-online-pending-accounts-v2',JSON.stringify({[p.account]:p}));},{id:lockedActivity.id,revision:beforeLocked});
 await page.reload();await page.locator('.title-start').click();await idle();assert.equal(await page.evaluate(()=>CRPGOnline.pending),null,'legacy rejected relationship action cannot remain a permanent pending packet');assert.equal(fixture.read().revision,beforeLocked);
 await page.locator('[data-screen="LOCATION"]').click();await idle();await page.evaluate(()=>act('WAIT',{minutes:1}));await idle();await same('play after legacy rejection');
 const originalAction=R.prototype.action;R.prototype.action=function(type,params){if(type==='WAIT')throw Error('injected engine failure before persistence');return originalAction.call(this,type,params);};
 try{await page.evaluate(()=>act('WAIT',{minutes:1}));await idle();assert.equal(await page.evaluate(()=>CRPGOnline.pending),null,'a definitely rejected server failure must release the UI');}finally{R.prototype.action=originalAction;}
 await page.evaluate(()=>act('WAIT',{minutes:1}));await idle();await same('play after server rejection');results.push({relationshipLocked:true,requirementRed:true,legacyPendingRecovered:true,precommitFailureRecovered:true});
 fixture.seed(free().s);await start();
 delay=1800;arrivalDelay=500;const activityClickedAt=Date.now();const life=page.getByRole('button',{name:/채집 시작 · 10초/});await life.click();await page.waitForTimeout(300);const pendingLife=page.locator('.pending-activity');assert(await pendingLife.isVisible());assert((await pendingLife.innerText()).includes('채집 중'));assert(Number(await pendingLife.locator('progress').getAttribute('value'))>0,'life timer visibly progresses while its start request is pending');await page.screenshot({path:resolve(evidence,'life-pending.png')});await idle();arrivalDelay=0;
 const lifeState=await same('life start');assert(lifeState.lifeJob);const elapsed=await page.evaluate(()=>CRPGOnline.now()-game.s.lifeJob.startedAt);assert(elapsed>=1700,'response wait must already count toward life timer');
 await page.screenshot({path:resolve(evidence,'life.png')});delay=0;
 await page.waitForFunction(()=>!game.s.lifeJob&&!busy,{},{timeout:20000});await same('life finish');assert.equal(calls.filter(c=>c.type==='LIFE_START').length,1);assert.equal(calls.filter(c=>c.type==='LIFE_FINISH').length,1);results.push({lifeElapsedOnAcknowledgement:elapsed,visibleBeforeAcknowledgement:true,activityTotalMilliseconds:Date.now()-activityClickedAt});
 fixture.seed(free().s);await start();delay=1800;
 const move=page.locator('.terrain-destination:not([disabled])').first();assert(await move.count());await move.click();await page.waitForTimeout(1200);const progress=page.locator('.action-save-cover progress');assert.equal(await progress.getAttribute('value'),null,'expired travel animation must show indeterminate confirmation, never stuck 94%');await idle();delay=0;await same('move');
 const gear=free(),weapon=gear.giveEquipment('EQ_SWORD_HARBINGER');fixture.seed(gear.s);await start();
 await page.evaluate(slot=>openGear(slot,'PLAYER_CUSTOM'),weapon);await idle();
 delay=1800;await page.locator('.gear-options').getByRole('button',{name:'장착',exact:true}).first().click();
 await page.waitForSelector('.action-feedback');await page.waitForTimeout(250);
 const equipFeedback=await page.locator('.action-feedback').evaluate(n=>({text:n.innerText,rect:{x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y,width:n.offsetWidth,height:n.offsetHeight},width:innerWidth,height:innerHeight}));
 assert.equal((equipFeedback.text.match(/장착 중…/g)||[]).length,1);assert(!equipFeedback.text.includes('진행 확인'));assert.equal(await page.locator('.action-status').count(),1);
 assert(Math.abs(equipFeedback.rect.x+equipFeedback.rect.width/2-equipFeedback.width/2)<3);assert(Math.abs(equipFeedback.rect.y+equipFeedback.rect.height/2-equipFeedback.height/2)<3);
 await page.screenshot({path:resolve(evidence,'equipment-pending.png')});await idle();delay=0;
 const equipped=await same('equipment confirmation');assert(equipped.inventory.find(i=>i.slot===weapon).equipped);results.push({equipmentFeedback:'장착 중…',centered:true,singleNotice:true});
 for(const label of ['안내 확인 · 나중에 장착','장착 확인']){const guide=page.getByRole('button',{name:label,exact:true});if(await guide.count()){await guide.click();await idle();await same('equipment guide dismissal '+label);}}assert.equal(await page.locator('.equipment-guide').isVisible(),false,'acknowledged guide must release the play screen');
 const world=free(),point=globalThis.CRPGWorldContent.oculi.find(p=>p.steps[0].duration>0&&p.method!=='HIDDEN'&&p.level<=1&&!Object.keys(p.requirements||{}).length&&!p.place);
 assert(point);world.action('OPERATOR_DEBUG',{op:'travel',map:point.map});fixture.seed(world.s);await start();delay=1800;
 await page.locator('.discovery-card').filter({hasText:point.title}).getByRole('button').first().click();await page.waitForTimeout(300);
 assert(await page.locator('.pending-activity').isVisible());assert(Number(await page.locator('.pending-activity progress').getAttribute('value'))>0);await idle();delay=0;await same('world work start');
 await page.waitForFunction(()=>!game.s.worldJob&&!busy,{},{timeout:20000});await same('world work finish');results.push({worldWorkOverlapsSaving:true});
 const battle=free();battle.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 // Load without startGame, which intentionally forfeits a battle on reconnect: start in free play, then enter via real action.
 fixture.seed(free().s);await start();
 // Dedicated test fixture installs a server battle response using the real sync path, without simulating a reconnect.
 fixture.seed(battle.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
 assert.equal(await page.locator('#tutorial-tour').count(),0,'the free-play guide must not cover a battle');
 delay=1800;await page.getByRole('button',{name:'전투 시작',exact:true}).click();await page.waitForTimeout(250);assert(await page.locator('.action-save-cover').isVisible());await idle();delay=0;await same('combat begin');
 assert.equal(await page.evaluate(()=>game.combatActor().id),'PLAYER_CUSTOM');
 const guard=page.locator('.battle-cards button').filter({hasText:'방어'}).first();if(await guard.count())await guard.click();
 delay=1800;await page.getByRole('button',{name:'선택한 행동 실행',exact:true}).click();await page.waitForTimeout(750);assert(await page.evaluate(()=>[...CombatFX.animations].some(a=>a.playState==='running')),'preparation stays animated while waiting for the authoritative result');assert.equal(await page.locator('.combat-playback').count(),0,'unconfirmed damage must not play');await page.screenshot({path:resolve(evidence,'combat-pending.png')});await page.waitForSelector('.combat-playback');delay=0;
 await page.waitForFunction(()=>document.querySelector('.playback-outcomes')?.textContent.includes('→'));
 await page.getByRole('button',{name:'일시정지',exact:true}).click();await page.waitForTimeout(150);
 assert.equal(await page.locator('.battle-command').evaluate(n=>getComputedStyle(n).visibility),'hidden','duplicate progress strip must not protrude behind the replay dock');
 assert(await page.getByRole('button',{name:'계속 재생',exact:true}).isVisible());assert.equal(await page.getByRole('button',{name:'결과 바로 보기',exact:true}).count(),0,'no battle skip in the playback (0.15.17)');
 const during=await page.evaluate(()=>({outcome:document.querySelector('.playback-outcomes').textContent,player:document.querySelector('[data-actor-id="PLAYER_CUSTOM"] .stat')?.textContent}));
 const transition=during.outcome.match(/(?:HP|체력) (\d+) → (\d+)/);assert(transition,'real playback must display the acknowledged HP transition');assert(during.player.includes(transition[2]),'HP must already update during playback, before skipping or final render');results.push({playbackHP:during});
 await page.screenshot({path:resolve(evidence,'combat.png')});
 await page.getByRole('button',{name:'계속 재생',exact:true}).click();await page.waitForSelector('.combat-playback',{state:'detached',timeout:90000});await idle();const after=await same('combat result');
 const rows=await page.locator('.combatant-row').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.actorId,hp:n.querySelector('.stat')?.textContent})));
 for(const a of after.runtime?.actors||[])assert(rows.find(n=>n.id===a.id)?.hp.includes(String(a.hp)),'visible HP matches '+a.id);
 results.push({combatActors:rows});
 await page.reload();await page.locator('.title-start').click();await idle();const resumed=await same('resume');assert.equal(resumed.runtime,null);assert.equal(JSON.parse(resumed.global.LAST_BATTLE_RESULT_JSON).victory,false);results.push({reconnectForfeit:true});
 assert.deepEqual(errors,[]);writeFileSync(resolve(evidence,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({ok:true,results}));
}catch(e){await page.screenshot({path:resolve(evidence,'failure.png')});console.error('BROWSER STATE',await page.evaluate(()=>({text:document.body.innerText.slice(-1800),node:typeof game!=='undefined'?game?.storyActiveNodeId():null,busy:typeof busy==='undefined'?null:busy,inert:document.getElementById('root')?.inert,buttons:[...document.querySelectorAll('button')].map(b=>({text:b.textContent,disabled:b.disabled}))})),errors);throw e;}
finally{await browser.close();server.close();}
