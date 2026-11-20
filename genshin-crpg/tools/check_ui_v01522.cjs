/* Build first. Isolated browser fixtures; never opens a remote account.
 * CRPG_BROWSER_EXECUTABLE=/path/to/chromium node tools/check_ui_v01522.cjs
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright'):'playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'evidence/v01522/ui'),port=19122,checks=[];
fs.mkdirSync(out,{recursive:true});
const server=cp.spawn(process.env.PYTHON||'python',['-m','http.server',String(port),'--bind','127.0.0.1','--directory',path.join(root,'dist')],{stdio:'ignore'});
let browser;
async function run(){
 await new Promise(r=>setTimeout(r,400));
 browser=await chromium.launch({...(process.env.CRPG_BROWSER_EXECUTABLE?{executablePath:process.env.CRPG_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--use-gl=angle','--use-angle=swiftshader','--single-process']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='warning'&&m.text().startsWith('battle fx'))errors.push(m.text());});
 await page.goto('http://127.0.0.1:'+port+'/?frame=0');await page.waitForFunction(()=>!!window.CRPGRuntime&&!!saveStore);
 await page.evaluate(()=>{window.qaFresh=(map='MAP_MOND_CITY',route='ROUTE_TRAVELER')=>{game=new CRPGRuntime.Runtime(CRPG_DATA);game.newGame({name:'화면검증',route,seed:27,saveId:'UI-QA-'+Date.now()});Object.assign(game.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION',WORLD_TIME:'12:00',MORA:5000,ENCOUNTER_COOLDOWN:100});for(const k of ['storyJourney','storyBreak','storyArrival','storyContext'])delete game.s[k];game.prepareStory();itemPresenter=CRPGInventoryPresenter.create(game.db,MANIFEST);activeSaveSlot=null;saveFailed=false;lastSaveError='';say('');busy=false;render();};});
 const quiet=async()=>{await page.waitForFunction(()=>!busy,null,{timeout:120000});assert.equal(await page.evaluate(()=>saveFailed),false,await page.evaluate(()=>lastSaveError));};
 // Real buttons: first travel, return, enter the guild. No acknowledgement can skip movement.
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
  await page.evaluate(route=>qaFresh('MAP_MOND_CITY',route),route);await page.waitForTimeout(100);
  assert.equal(await page.locator('#tutorial-tour').getAttribute('data-step'),'move');assert.equal(await page.locator('#modal[open]').count(),0,'equipment popup must wait until movement is learned');
  const map=await page.locator('.mobile-main-map').boundingBox(),card=page.locator('.terrain-destination[data-destination="MAP_MOND_PLAINS"]');
  const rect=await card.boundingBox();assert(rect.y>=map.y&&rect.y+rect.height<=map.y+map.height,'first movement card is inside the compact map');
  await card.click();await quiet();assert.equal(await page.evaluate(()=>game.s.global.CURRENT_MAP_ID),'MAP_MOND_PLAINS');assert.equal(await page.evaluate(()=>game.tutorialState().done.move),true);
  await page.locator('#tutorial-tour button').first().click();await quiet();await page.locator('.terrain-travel').click();await quiet();assert.equal(await page.evaluate(()=>game.s.global.CURRENT_MAP_ID),'MAP_MOND_CITY');
  await page.locator('#tutorial-tour').getByRole('button',{name:'캐서린 만나기'}).click();await quiet();assert.equal(await page.evaluate(()=>game.atGuild()),true);assert.equal(await page.locator('#tutorial-tour').getAttribute('data-step'),'commission');
  checks.push({route,movement:true,facility:true});await page.screenshot({path:path.join(out,'tutorial-guild-'+route+'.png')});
 }
 // The real prologues reach a visible movement lesson before the first fight.
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
  await page.evaluate(route=>{qaFresh();game=new CRPGRuntime.Runtime(CRPG_DATA);game.newGame({route,name:'첫걸음',seed:27});for(let i=0;i<100&&!game.s.storyJourney;i++){if(game.s.runtime||game.s.battlePreparation)throw Error('battle before movement');const n=game.storyNode(),cs=game.storyChoices();if(cs.length)game.action('STORY_CHOICE',{node:cs[0][4]});else game.action(n[5]==='INPUT_TEXT'?'STORY_NAME':'STORY_NEXT',n[5]==='INPUT_TEXT'?{name:'첫걸음'}:{node:n[4]});}game.s.global.ENCOUNTER_COOLDOWN=100;render();},route);
  assert.equal(await page.locator('#tutorial-tour').getAttribute('data-step'),'move');await page.locator('#tutorial-tour button').first().click();await quiet();await page.locator('.terrain-travel').click();await quiet();assert.equal(await page.locator('#tutorial-tour').getAttribute('data-step'),'arrival');checks.push({route,realPrologueMovement:true});
 }
 // Real 10-second minigames: read the displayed choice / timing zone, then click.
 for(const [kind,map]of [['GATHER','MAP_MOND_PLAINS'],['MINE','MAP_CRPG_MOND_QUARRY'],['HUNT','MAP_CRPG_WHISPER_HUNT']]){
  await page.evaluate(({kind,map})=>{qaFresh(map);game.action('LIFE_START',{kind});render();},{kind,map});
  for(let round=0;round<3;round++){
   await page.waitForFunction(({round,kind})=>{const box=document.querySelector('.life-mini');if(!box||!box.querySelector('h2').textContent.includes((round+1)+' / 3'))return false;const btn=box.querySelector('.life-mini-buttons button');if(btn.disabled)return false;return kind==='GATHER'||(parseFloat(box.querySelector('.life-mini-cursor').style.left)>38&&parseFloat(box.querySelector('.life-mini-cursor').style.left)<55);},{round,kind});
   const choice=kind==='GATHER'?Number((await page.locator('.life-mini>p').first().textContent()).match(/(\d)번/)[1])-1:0;await page.locator('.life-mini-buttons [data-choice="'+choice+'"]').click();
  }
  await page.waitForFunction(()=>!game.s.lifeJob,null,{timeout:15000});await quiet();assert.equal(await page.evaluate(({kind,map})=>game.s.lifeResources[map+':'+kind].used,{kind,map}),1);if(kind!=='HUNT')assert(await page.evaluate(kind=>game.tutorialState().done[kind==='GATHER'?'gather':'mine'],kind));checks.push({minigame:kind,realTimedInputs:true});await page.locator('#modal-close').click();
 }
 // Practice combat follows actual guard -> attack -> skill inputs on both protagonists.
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
  await page.evaluate(route=>{qaFresh('MAP_MOND_PLAINS',route);if(route==='ROUTE_TRAVELER')game.s.flags.FLAG_TRV_ANEMO_UNLOCKED=true;game.action('TUTORIAL_DRILL');render();},route);await page.getByRole('button',{name:'전투 시작',exact:true}).click();await quiet();
  for(let n=0;n<30&&await page.evaluate(()=>!!game.s.runtime);n++){
   const cmd=await page.evaluate(()=>{const b=game.s.runtime,cards=game.combatCards(),step=b.tutorialDrill.step;return step==='guard'?cards.find(c=>c.id==='PLAYER_BASIC_GUARD'):step==='attack'?cards.find(c=>c.id==='PLAYER_BASIC_ATTACK'):step==='skill'?cards.find(c=>/_E(?:_CHARGE)?$/.test(c.id)&&!c.reason):cards.find(c=>!c.reason&&c.targets.some(t=>b.actors.find(a=>a.id===t.id)?.side==='ENEMY'));});assert(cmd&&!cmd.reason);await page.locator('[data-card-id="'+cmd.id+'"]').click();if(cmd.targets.length)await page.locator('.battle-execute select[aria-label="행동 대상"]').selectOption(cmd.targets[0].id);await page.locator('.battle-execute>button').click();await quiet();
  }
  assert(await page.evaluate(()=>game.tutorialState().done.drill));if(await page.locator('#modal[open]').count())await page.locator('#modal-close').click();checks.push({route,drillButtons:true});
 }
 // Domain selection reaches a real battle; the reward has an actual retry button.
 await page.evaluate(()=>{qaFresh();game.adminApply({op:'level',target:'ALL',value:10});render();openGrowthDomain('EXP:5');});
 await page.locator('[data-tutorial="domain-enter"]').click();await quiet();assert.equal(await page.evaluate(()=>game.s.runtime.growthDomain.kind),'EXP');
 await page.getByRole('button',{name:'전투 시작',exact:true}).click();await quiet();
 for(let n=0;n<30&&await page.evaluate(()=>!!game.s.runtime);n++){
  const command=await page.evaluate(()=>{const cards=game.combatCards(),b=game.s.runtime;return cards.find(c=>!c.reason&&c.targets.some(t=>b.actors.find(a=>a.id===t.id)?.side==='ENEMY'));});
  assert(command);await page.locator('[data-card-id="'+command.id+'"]').click();await page.locator('.combatant-row[data-actor-id="'+command.targets[0].id+'"]').click();await page.locator('.battle-execute>button').click();await quiet();
 }
 assert.equal(await page.evaluate(()=>!!game.s.runtime),false);if(await page.locator('#modal[open]').count())await page.locator('#modal-close').click();assert.equal(await page.locator('.domain-retry').count(),1);checks.push({domain:'FORSAKEN_RIFT',battleAndReward:true});await page.screenshot({path:path.join(out,'domain-reward-phone.png')});
 // Maximum body/summon density, with live status chips, at five window shapes.
 await page.evaluate(()=>{qaFresh('MAP_MOND_PLAINS','ROUTE_ISEKAI');for(const [i,id]of ['MOND_AMBER','MOND_KAEYA','MOND_BARBARA'].entries()){game.wishGrant({kind:'char',id,rarity:4});game.s.party[i+1]={slot:'PARTY_'+(i+2),source:id,type:'CHAR',active:true,control:'AI'};}game.startBattle('EG_MOND_HILI_PATROL','RANDOM');const b=game.s.runtime,base=b.actors.find(a=>a.side==='ENEMY');for(let i=0;i<8;i++)b.actors.push({...JSON.parse(JSON.stringify(base)),id:'BODY-'+i});for(let i=0;i<3;i++)b.actors.push({...JSON.parse(JSON.stringify(base)),id:'SUMMON-'+i,fbSummon:{owner:base.id}});game.limitBattleEnemies();for(const kind of ['BUNNY','OZ','GOU_BA'])game.addField(kind,b.actors[0],3,{hp:100,maxHp:100});for(const a of b.actors)for(const id of ['STATUS_ISEKAI_EXPOSED','ENCOURAGEMENT_TAG'])game.addCombatStatus(a,id,2);render();});
 await page.waitForFunction(()=>!document.querySelector('#shell-toast.show'),null,{timeout:15000});
 for(const [width,height]of [[1440,900],[1024,600],[390,844],[360,640],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);assert.equal(await page.locator('dialog[open]').count(),0,'the battle is visible without an overlay');
  const metrics=await page.evaluate(()=>{const frame=document.querySelector('.battle-fit-frame').getBoundingClientRect(),board=document.querySelector('.combat-panel').getBoundingClientRect(),actors=[...document.querySelectorAll('.shell-enemies>.combatant-row,.shell-allies>.combatant-row')];return {bodyScroll:document.body.scrollHeight,viewport:innerHeight,within:board.top>=frame.top-1&&board.bottom<=frame.bottom+1&&board.left>=frame.left-1&&board.right<=frame.right+1,enemies:document.querySelectorAll('.shell-enemies>.combatant-row').length,enemySummons:document.querySelectorAll('.summon-lane.enemy>.battle-summon').length,allySummons:document.querySelectorAll('.summon-lane.ally>.battle-summon').length,hpVisible:actors.every(a=>{const x=a.getBoundingClientRect(),hp=a.querySelector('.stat').getBoundingClientRect();return hp.top>=x.top&&hp.bottom<=x.bottom&&hp.height>0;})};});
  assert(metrics.within&&metrics.bodyScroll<=metrics.viewport+1&&metrics.hpVisible,JSON.stringify(metrics));assert.deepEqual([metrics.enemies,metrics.enemySummons,metrics.allySummons],[8,3,3]);checks.push({width,height,...metrics});await page.screenshot({path:path.join(out,'battle-'+width+'x'+height+'.png')});
 }
 // Nine available command cards including healing items and the boss-specific movement action.
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>{qaFresh('MAP_STORMTERROR_LAIR','ROUTE_ISEKAI');game.adminApply({op:'level',target:'ALL',value:30});for(const id of ['TRPG_HEALING_POTION','TRPG_BANDAGE','TRPG_MEDKIT','TRPG_TACTICAL_LEVITATOR'])game.giveItem(id,1);game.startBattle('EG_BOSS_DVALIN','EXPLICIT',{confirmed:true,companions:[]});game.action('COMBAT_BEGIN');game.s.runtime.toolCharges={TRPG_TACTICAL_LEVITATOR:1};render();});
 await page.waitForFunction(()=>!document.querySelector('#shell-toast.show'),null,{timeout:15000});
 const dense=await page.evaluate(()=>{const command=document.querySelector('.battle-command').getBoundingClientRect();return {cards:document.querySelectorAll('[data-card-id]').length,visible:[...document.querySelectorAll('.battle-command button')].every(e=>{const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&r.top>=command.top-1&&r.bottom<=command.bottom+1;})};});assert(dense.cards>=9&&dense.visible,JSON.stringify(dense));const contained=await page.evaluate(()=>[...document.querySelectorAll('[data-card-id]')].every(e=>{const r=e.getBoundingClientRect(),n=e.querySelector('strong').getBoundingClientRect();return n.left>=r.left-1&&n.right<=r.right+1&&n.top>=r.top-1&&n.bottom<=r.bottom+1;}));assert(contained,'command names remain within their cells');checks.push(dense);await page.screenshot({path:path.join(out,'nine-actions-phone.png')});
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));console.log('PASS '+checks.length+' browser checks: movement and facility on both routes, real domain combat/reward, 8+3+3 fixed layout and nine commands');
}
run().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{server.kill();await browser?.close();});
