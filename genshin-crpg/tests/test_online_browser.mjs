import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve,extname} from 'node:path';
import {createRequire} from 'node:module';
import {onlineFixture,R,DB} from './helpers_online.mjs';
const require=createRequire(import.meta.url),{chromium}=require('playwright');
const root=resolve(import.meta.dirname,'..'),version=JSON.parse(readFileSync(resolve(root,'package.json'))).version,evidence=resolve(root,'evidence/online-flow');mkdirSync(evidence,{recursive:true});
const server=createServer((req,res)=>{let path=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html';if(path.includes('..')){res.writeHead(403).end();return;}const source=resolve(root,'source',path),file=!process.env.CRPG_TEST_DIST&&/\.(js|css)$/.test(path)&&existsSync(source)?source:resolve(root,'dist',path);try{res.setHeader('Content-Type',({'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp'})[extname(file)]||'application/octet-stream');let data=readFileSync(file);if(!process.env.CRPG_TEST_DIST&&path==='assets.js')data=data.toString().replace(/"appVersion":\s*"[^"]*"/,'"appVersion":'+JSON.stringify(version));res.end(data);}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
const fixture=onlineFixture();await fixture.start();
const browser=await chromium.launch({headless:true,executablePath:process.env.CRPG_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],calls=[];
page.on('pageerror',e=>errors.push(e.message));
let delay=0,drops=0;
await page.route('https://genshin-crpg-online.jungsan765.workers.dev/**',async route=>{
 const req=route.request(),body=req.postDataJSON(),path=new URL(req.url()).pathname;
 calls.push({path,type:body?.type,requestId:body?.requestId,at:Date.now()});
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
 delay=1000;const storyRevision=fixture.read().revision;
 await page.getByRole('button',{name:'계속 읽기',exact:true}).click();
 await page.waitForFunction(()=>softActionPreview);
 const previewNode=await page.evaluate(()=>game.storyActiveNodeId());
 await page.getByRole('button',{name:'계속 읽기',exact:true}).click();await idle();delay=0;
 await same('queued story');assert.equal(fixture.read().revision,storyRevision+2);assert.notEqual(await page.evaluate(()=>game.storyActiveNodeId()),previewNode);results.push({queuedStoryInputs:2});
 const visited=[];
 for(let i=0;i<16;i++){
  const current=await page.evaluate(()=>({node:game.storyActiveNodeId(),choices:game.storyChoices().length,kind:game.storyNode()?.[5]}));
  const next=page.getByRole('button',{name:current.kind==='INPUT_TEXT'?'정한 이름을 알려준다':'계속 읽기',exact:true});if(current.choices||!await next.count())break;
  assert(!visited.includes(current.node),'story node repeated');visited.push(current.node);await next.click();await idle();await same('story '+i);
 }
 assert(visited.length>=1);results.push({storyNodes:visited});
 await page.screenshot({path:resolve(evidence,'story.png')});
 const count=calls.length,rev=fixture.read().revision;
 await page.locator('[data-screen="SYSTEM"]').click();await idle();await page.locator('[data-screen="STORY"]').click();await idle();await page.evaluate(async()=>{for(let i=0;i<150;i++){await CRPGOnline.execute('MENU',{screen:'SYSTEM'});await CRPGOnline.execute('MENU',{screen:'STORY'});}render();});assert.equal(calls.length,count);assert.equal(fixture.read().revision,rev);results.push({menuRequests:0,repeatedMenuCycles:150});
 fixture.seed(free().s);await start();
 const lostRevision=fixture.read().revision;drops=2;
 await page.evaluate(()=>act('WAIT',{minutes:10}));await idle();
 assert(await page.getByRole('button',{name:'진행 확인 다시 시도',exact:true}).isVisible());
 assert.equal(fixture.read().revision,lostRevision+1);assert(await page.evaluate(()=>!!CRPGOnline.pending));
 await page.getByRole('button',{name:'진행 확인 다시 시도',exact:true}).click();await idle();await same('lost response recovery');
 assert.equal(fixture.read().revision,lostRevision+1);assert.equal(new Set(calls.filter(c=>c.type==='WAIT').map(c=>c.requestId)).size,1);results.push({lostResponseExactlyOnce:true});
 delay=1800;const life=page.getByRole('button',{name:/채집 시작 · 10초/});await life.click();await page.waitForTimeout(300);assert(await page.locator('.action-save-cover').isVisible());await idle();
 const lifeState=await same('life start');assert(lifeState.lifeJob);const elapsed=await page.evaluate(()=>CRPGOnline.now()-game.s.lifeJob.startedAt);assert(elapsed>=1700,'response wait must already count toward life timer');
 await page.screenshot({path:resolve(evidence,'life.png')});delay=0;
 await page.waitForFunction(()=>!game.s.lifeJob&&!busy,{},{timeout:20000});await same('life finish');assert.equal(calls.filter(c=>c.type==='LIFE_START').length,1);assert.equal(calls.filter(c=>c.type==='LIFE_FINISH').length,1);results.push({lifeElapsedOnAcknowledgement:elapsed});
 fixture.seed(free().s);await start();delay=1800;
 const move=page.locator('.terrain-destination:not([disabled])').first();assert(await move.count());await move.click();await page.waitForTimeout(1200);const progress=page.locator('.action-save-cover progress');assert.equal(await progress.getAttribute('value'),null,'expired travel animation must show indeterminate confirmation, never stuck 94%');await idle();delay=0;await same('move');
 const battle=free();battle.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 // Load without startGame, which intentionally forfeits a battle on reconnect: start in free play, then enter via real action.
 fixture.seed(free().s);await start();
 // Dedicated test fixture installs a server battle response using the real sync path, without simulating a reconnect.
 fixture.seed(battle.s);await page.evaluate(()=>CRPGOnline.sync());await idle();
 assert.equal(await page.locator('#tutorial-tour').count(),0,'the free-play guide must not cover a battle');
 await page.getByRole('button',{name:'전투 시작',exact:true}).click();await idle();await same('combat begin');
 assert.equal(await page.evaluate(()=>game.combatActor().id),'PLAYER_CUSTOM');
 const guard=page.locator('.battle-cards button').filter({hasText:'방어'}).first();if(await guard.count())await guard.click();
 await page.getByRole('button',{name:'선택한 행동 실행',exact:true}).click();await page.waitForSelector('.combat-playback');
 await page.waitForFunction(()=>document.querySelector('.playback-outcomes')?.textContent.includes('→'));
 await page.getByRole('button',{name:'일시정지',exact:true}).click();await page.waitForTimeout(150);
 const during=await page.evaluate(()=>({outcome:document.querySelector('.playback-outcomes').textContent,player:document.querySelector('[data-actor-id="PLAYER_CUSTOM"] .stat')?.textContent}));
 const transition=during.outcome.match(/(?:HP|체력) (\d+) → (\d+)/);assert(transition,'real playback must display the acknowledged HP transition');assert(during.player.includes(transition[2]),'HP must already update during playback, before skipping or final render');results.push({playbackHP:during});
 await page.screenshot({path:resolve(evidence,'combat.png')});
 await page.getByRole('button',{name:'결과 바로 보기',exact:true}).click();await idle();const after=await same('combat result');
 const rows=await page.locator('.combatant-row').evaluateAll(nodes=>nodes.map(n=>({id:n.dataset.actorId,hp:n.querySelector('.stat')?.textContent})));
 for(const a of after.runtime?.actors||[])assert(rows.find(n=>n.id===a.id)?.hp.includes(String(a.hp)),'visible HP matches '+a.id);
 results.push({combatActors:rows});
 await page.reload();await page.locator('.title-start').click();await idle();const resumed=await same('resume');assert.equal(resumed.runtime,null);assert.equal(JSON.parse(resumed.global.LAST_BATTLE_RESULT_JSON).victory,false);results.push({reconnectForfeit:true});
 assert.deepEqual(errors,[]);writeFileSync(resolve(evidence,'results.json'),JSON.stringify(results,null,2));console.log(JSON.stringify({ok:true,results}));
}catch(e){await page.screenshot({path:resolve(evidence,'failure.png')});console.error('BROWSER STATE',await page.evaluate(()=>({text:document.body.innerText.slice(-1800),node:typeof game!=='undefined'?game?.storyActiveNodeId():null,busy:typeof busy==='undefined'?null:busy,inert:document.getElementById('root')?.inert,buttons:[...document.querySelectorAll('button')].map(b=>({text:b.textContent,disabled:b.disabled}))})),errors);throw e;}
finally{await browser.close();server.close();}
