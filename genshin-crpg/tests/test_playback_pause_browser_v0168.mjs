// Real Chromium DOM and timers, executing the current playback/presentation sources without game assets or saves.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require('playwright'),root=resolve(import.meta.dirname,'..');
const source=readFileSync(resolve(root,'source/app_av.js'),'utf8');
const playback=source.slice(source.indexOf('function combatSpeedControl(){'),source.indexOf('let renderedSaveId=null;'));
assert(playback.includes('const GameEffects='));
const browser=await chromium.launch({headless:true,executablePath:process.env.CRPG_CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<main><section class="combatant-row" data-actor-id="PLAYER_CUSTOM" data-max-hp="100" data-shield-max="50" style="position:absolute;top:180px;left:100px;width:120px;height:200px"><div class="stat">HP  100 / 100</div><div class="meter"><i></i></div><div class="shield-meter"><div class="stat">보호막  50 / 50</div><div class="meter"><i></i></div></div></section></main>');
 await page.addScriptTag({content:`
  const root=document.querySelector('main'),busy=true,settings={combatSpeed:.5,reducedMotion:false,damageFlash:true},game={s:{runtime:{id:'BROWSER_PAUSE'}}};
  function el(tag,cls='',text=''){const n=document.createElement(tag);n.className=cls;n.textContent=text;return n;}
  function button(label,fn){const n=el('button','',label);n.onclick=fn;return n;}
  function persistSettings(){}const GameAudio={play(){},stop(){},sync(){}};
 `});
 await page.addScriptTag({content:readFileSync(resolve(root,'source/app_combat_fx.js'),'utf8')});
 await page.addScriptTag({content:readFileSync(resolve(root,'source/presentation.js'),'utf8')});
 await page.addScriptTag({content:playback+'\nwindow.fx=GameEffects;'});
 const start=()=>page.evaluate(()=>new Promise(resolve=>{
  const key='browser-hit-'+performance.now(),events=Array.from({length:5},(_,i)=>({key:key+i,kind:'damage',element:'PHYSICAL',label:'연타',amount:10,absorbed:10,
   actorId:'ENEMY',actor:'적',targetId:'PLAYER_CUSTOM',target:'주인공',cardId:'MOND_AMBER_Q',cardName:'연타',action:1,round:1,side:'ENEMY',
   hpBefore:100-i*10,hpAfter:90-i*10,maxHp:100,shieldBefore:50-i*10,shieldAfter:40-i*10}));
  window.impacts=[];const layer=fx.layerNode();let paused=false;
  window.hitObserver?.disconnect();window.hitObserver=new MutationObserver(records=>{
   for(const record of records)for(const node of record.addedNodes)if(node instanceof Element&&node.classList.contains('impact'))window.impacts.push(node.textContent);
   if(window.impacts.length&&!paused){paused=true;fx.dock.querySelector('.playback-buttons button').click();resolve();}
  });window.hitObserver.observe(layer,{childList:true});window.playbackJob=fx.play(CRPGPresentation.actionFrames(events));
 }));
 const snapshot=()=>page.evaluate(()=>({paused:fx.paused,hp:root.querySelector('.combatant-row > .stat').textContent,
  shield:root.querySelector('.shield-meter .stat').textContent,impacts:window.impacts.length}));
 await start();const before=await snapshot();assert.deepEqual(before,{paused:true,hp:'HP  90 / 100',shield:'보호막  40 / 50',impacts:1});
 await page.waitForTimeout(300);assert.deepEqual(await snapshot(),before,'real timers freeze queued impacts while paused');
 await page.evaluate(()=>{const slider=fx.dock.querySelector('input');slider.value='2';slider.dispatchEvent(new Event('input'));});
 await page.waitForTimeout(80);assert.deepEqual(await snapshot(),before,'speed changes do not unpause queued hits');
 await page.evaluate(()=>fx.dock.querySelector('.playback-buttons button').click());await page.waitForFunction(()=>window.impacts.length===5);
 assert.deepEqual(await snapshot(),{paused:false,hp:'HP  50 / 100',shield:'보호막  0 / 50',impacts:5});
 await page.evaluate(()=>window.playbackJob);assert.equal((await snapshot()).impacts,5,'five native timer callbacks fire once each');
 console.log('PASS Chromium pause freezes HP/shields/impacts and resumes all five hits exactly once after a speed change');
 await page.evaluate(()=>settings.combatSpeed=.5);await start();const cancelled=await snapshot();
 await page.evaluate(()=>fx.dock.querySelectorAll('.playback-buttons button')[2].click());await page.evaluate(()=>window.playbackJob);await page.waitForTimeout(300);
 const after=await snapshot();assert.equal(after.hp,cancelled.hp);assert.equal(after.shield,cancelled.shield);assert.equal(after.impacts,1);assert.deepEqual(errors,[]);
 console.log('PASS Chromium cancellation during a paused burst removes every remaining callback');
 console.log(JSON.stringify({ok:true,browser:'Chromium',checks:2,pageErrors:errors}));
}finally{await browser.close();}
