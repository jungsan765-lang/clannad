'use strict';
// Execute the actual settings/audio/motion modules with deterministic media and DOM stand-ins.
// No browser, live account, network, audible playback, or persistent player storage is used.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=name=>fs.readFileSync(path.join(__dirname,'../source',name),'utf8');
const noop=()=>{},deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
let checks=0;async function test(name,fn){let watchdog;try{await Promise.race([fn(),new Promise((_,reject)=>{watchdog=setTimeout(()=>reject(Error('test did not settle: '+name)),3000);})]);checks++;console.log('PASS '+name);}finally{clearTimeout(watchdog);}}
function classes(...initial){const set=new Set(initial);return{add:(...a)=>a.forEach(v=>set.add(v)),remove:(...a)=>a.forEach(v=>set.delete(v)),contains:v=>set.has(v),toggle:(v,on)=>on?set.add(v):set.delete(v)};}
function audio(){
 const sources=[],gains=[],tracks=[],fetches=[],timers=new Map(),saved=[];let seq=0,clock=10000,fetchError=false,startError=false,resume=null;
 const sample=()=>({sampleRate:1000,length:200,numberOfChannels:1,duration:1,getChannelData:()=>new Float32Array(200).fill(.1)});
 const context={state:'running',destination:{},currentTime:10,resume:()=>resume?.promise||Promise.resolve(),decodeAudioData:async()=>sample(),
  createBufferSource:()=>{const src={started:0,stopped:0,disconnected:0,connect:node=>node,disconnect(){this.disconnected++;},start(){if(startError)throw Error('media unavailable');this.started++;},stop(){this.stopped++;this.onended?.();}};sources.push(src);return src;},
  createGain:()=>{const g={gain:{value:0,setValueAtTime:noop,linearRampToValueAtTime:noop},connect:node=>node,disconnect(){this.disconnected=true;}};gains.push(g);return g;}};
 class Media{constructor(){this.listeners={};this.paused=true;this.currentTime=0;this.duration=60;this.pending=[];tracks.push(this);}addEventListener(type,fn){this.listeners[type]=fn;}pause(){this.paused=true;}remove(){this.removed=true;}play(){this.paused=false;const d=deferred();this.pending.push(d);return d.promise;}}
 const selection={key:'world',id:'one',file:'one.mp3',title:'one',time:0};
 class Queue{constructor(){this.key='world';this.selection=selection;}select(){return this.selection;}remember(){}next(){this.selection={...selection,id:this.selection.id==='one'?'two':'one',file:this.selection.id==='one'?'two.mp3':'one.mp3'};return this.selection;}}
 const ctx={console,Map,Set,WeakMap,Float32Array,Math,Number,Promise,performance:{now:()=>clock},settings:{audioEnabled:true,audioRevision:2,sfxChoiceRev:2,sfxChoice:{},sfxVolume:.6,musicVolume:.25,reducedMotion:false,combatSpeed:1},game:null,MANIFEST:{music:{},sfx:new Proxy({},{get:(_,id)=>({url:'audio/'+String(id)+'.wav'}),ownKeys:()=>[]})},
  Audio:Media,AudioContext:function(){return context;},CRPGMusicQueue:Queue,applySettings:noop,persistSettings:()=>{saved.push(JSON.stringify(ctx.settings));},matchMedia:()=>({matches:false}),
  document:{hidden:false,body:{append:noop},documentElement:{classList:classes()},querySelectorAll:()=>[]},
  setTimeout:(fn,ms)=>{timers.set(++seq,{fn,ms});return seq;},clearTimeout:id=>timers.delete(id),
  fetch:url=>{const d=deferred();fetches.push({url,d});if(fetchError)d.resolve({ok:false});return d.promise;}};
 ctx.window=ctx;vm.createContext(ctx);
 vm.runInContext(source('app_av.js').split('const avSettings=settingsControls;')[0]+'\nthis.GameAudio=GameAudio;',ctx);
 ctx.GameAudio.context=context;ctx.GameAudio.armed=true;
 // The real buffer's whitelist is built from a finite manifest, as in production.
 vm.runInContext("soundFiles.push('prev_hit','ig_hover_nav','ig_tab_click2','ig_click_general2','ig_wish_reveal5','ig_wish_execute5','ig_paimon_open','quest_complete');",ctx);
 vm.runInContext(source('app_sound.js'),ctx);
 const resolveFetch=index=>fetches[index].d.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});
 return{ctx,A:ctx.GameAudio,S:ctx.CRPGSound,context,sources,gains,tracks,fetches,timers,saved,resolveFetch,resume:d=>resume=d,fetchError:v=>fetchError=v,startError:v=>startError=v,advance:ms=>clock+=ms};
}
function motion({canvasAvailable=true}={}){
 let seq=0,canvases=0;const rafs=new Map(),timers=new Map(),listeners={},mediaListeners=[],globalListeners={},style=new Map();
 const on=(target,name,fn)=>(target[name]||(target[name]=[])).push(fn);
 const media={matches:false,addEventListener:(name,fn)=>mediaListeners.push(fn)};
 const canvasContext={setTransform:noop,clearRect:noop,createRadialGradient:()=>({addColorStop:noop}),beginPath:noop,arc:noop,fill:noop};
 const tile={disabled:false,inert:false,classList:classes(),style:{setProperty:(k,v)=>style.set(k,v),removeProperty:k=>style.delete(k)},getBoundingClientRect:()=>({left:0,top:0,width:200,height:100}),closest(selector){return selector==='[inert]'?(this.inert?this:null):this;}};
 const body={dataset:{mode:'world'},classList:classes('teyvat'),prepend:noop};
 const ctx={console,Math,performance:{now:()=>10000},innerWidth:1440,innerHeight:1000,devicePixelRatio:1,game:null,render:noop,applySettings:noop,
  document:{hidden:false,body,documentElement:{classList:classes()},querySelector:()=>null,addEventListener:(name,fn)=>on(listeners,name,fn),createElement:()=>{canvases++;return {style:{},setAttribute:noop,getContext:()=>canvasAvailable?canvasContext:null};}},
  matchMedia:()=>media,getComputedStyle:()=>({getPropertyValue:()=>''}),MutationObserver:class{observe(){}},
  requestAnimationFrame:fn=>{rafs.set(++seq,fn);return seq;},cancelAnimationFrame:id=>rafs.delete(id),
  setTimeout:(fn,ms)=>{timers.set(++seq,{fn,ms});return seq;},clearTimeout:id=>timers.delete(id),addEventListener:(name,fn)=>on(globalListeners,name,fn)};
 ctx.window=ctx;vm.createContext(ctx);vm.runInContext(source('app_motion.js'),ctx);
 return {ctx,M:ctx.CRPGMotion,rafs,timers,listeners,globalListeners,media,mediaListeners,tile,style,canvases:()=>canvases,
  event:(name,event={})=>(listeners[name]||[]).forEach(fn=>fn(event)),global:name=>(globalListeners[name]||[]).forEach(fn=>fn()),
  frame:()=>{const current=[...rafs];rafs.clear();for(const [,fn]of current)fn(10016);}};
}
(async()=>{
 await test('invalid restored settings normalize to finite bounded volumes and speed',()=>{
  const h=audio();Object.assign(h.ctx.settings,{musicVolume:Infinity,sfxVolume:'bad',combatSpeed:NaN,reducedMotion:'yes'});h.ctx.applySettings();
  assert.equal(h.ctx.settings.musicVolume,.25);assert.equal(h.ctx.settings.sfxVolume,.6);assert.equal(h.ctx.settings.combatSpeed,1);assert.equal(h.ctx.settings.reducedMotion,false);
  Object.assign(h.ctx.settings,{musicVolume:4,sfxVolume:-3,combatSpeed:100});h.ctx.applySettings();assert.equal(h.ctx.settings.musicVolume,1);assert.equal(h.ctx.settings.sfxVolume,0);assert.equal(h.ctx.settings.combatSpeed,2);
  h.ctx.settings.audioRevision=1;h.ctx.settings.musicVolume=.8;h.ctx.applySettings();assert.equal(h.ctx.settings.musicVolume,.25);
 });
 await test('malformed sound-choice storage is repaired and unknown candidate IDs are not saved',()=>{
  const h=audio();h.ctx.settings.sfxChoice='corrupt';assert.equal(h.S.choice('hit'),'prev_hit');assert.equal(typeof h.ctx.settings.sfxChoice,'object');
  h.S.setChoice('hit','unknown');assert.equal(h.ctx.settings.sfxChoice.hit,undefined);h.S.setChoice('hit','prev_hit');assert.equal(h.ctx.settings.sfxChoice.hit,'prev_hit');
 });
 await test('candidate preview respects both sound switch and zero effect volume',async()=>{
  const h=audio();h.ctx.settings.audioEnabled=false;await h.S.audition('hit','prev_hit');h.ctx.settings.audioEnabled=true;h.ctx.settings.sfxVolume=0;await h.S.audition('hit','prev_hit');assert.equal(h.fetches.length,0);assert.equal(h.sources.length,0);
 });
 await test('stopping a preview cancels work waiting for audio unlock or audio download',async()=>{
  const h=audio(),resume=deferred();h.resume(resume);const p=h.S.audition('hit','prev_hit');h.S.stopAudition();resume.resolve();await p;assert.equal(h.fetches.length,0);
  h.resume(null);const q=h.S.audition('hit','prev_hit');await flush();assert.equal(h.fetches.length,1);h.S.stopAudition();h.resolveFetch(0);await q;assert.equal(h.sources.length,0);
 });
 await test('rapid preview choices play only the newest selection despite reverse download order',async()=>{
  const h=audio(),a=h.S.audition('hit','prev_hit');await flush();const b=h.S.audition('hover','ig_hover_nav');await flush();h.resolveFetch(1);await b;h.resolveFetch(0);await a;assert.equal(h.sources.length,1);assert.equal(h.sources[0].started,1);
 });
 await test('global stop cancels a preview and its pending replacement, while preview stop preserves game effects',async()=>{
  const h=audio(),p=h.A.play('hit');h.resolveFetch(0);await p;const gameVoice=h.sources[0];
  const q=h.S.audition('hover','ig_hover_nav');await flush();h.resolveFetch(1);await q;h.S.stopAudition();assert.equal(gameVoice.stopped,0);assert.equal(h.sources[1].stopped,1);
  const r=h.S.audition('tab','ig_tab_click2');await flush();h.A.stop();h.resolveFetch(2);await r;assert.equal(gameVoice.stopped,1);assert.equal(h.sources.length,2);assert.equal(h.A.voices.size,0);
 });
 await test('scene sound cancellation invalidates its pending download without cancelling another sound',async()=>{
  const h=audio(),p=h.A.play('wish_5'),q=h.A.play('hit');h.S.stop('wish_5');h.resolveFetch(0);h.resolveFetch(1);await Promise.all([p,q]);assert.equal(h.sources.length,1);assert.equal(h.sources[0].stopped,0);
  await h.A.play('wish_5');assert.equal(h.sources.length,2,'a later intentional play still works');
 });
 await test('stopping a preview restores its music dip but preserves a newer game fanfare dip',async()=>{
  const h=audio();h.A.sync();const normal=h.A.music.volume,p=h.S.audition('victory','quest_complete');await flush();h.resolveFetch(0);await p;assert(h.A.music.volume<normal);h.S.stopAudition();assert.equal(h.A.music.volume,normal);
  await h.S.audition('victory','quest_complete');const q=h.A.play('wish_5');h.resolveFetch(1);await q;const dipped=h.A.music.volume;h.S.stopAudition();assert.equal(h.A.music.volume,dipped);assert.equal(h.sources.at(-1).stopped,0);
 });
 await test('muting effects during download prevents playback; muting active effects stops them immediately',async()=>{
  const h=audio(),p=h.A.play('hit');h.ctx.settings.sfxVolume=0;h.resolveFetch(0);await p;assert.equal(h.sources.length,0);
  h.ctx.settings.sfxVolume=.6;await h.A.play('hit');const q=h.S.audition('hit','prev_hit');await q;assert.equal(h.sources.length,2);
  h.ctx.settings.sfxVolume=0;h.A.sync();assert(h.sources.every(s=>s.stopped===1));assert.equal(h.A.voices.size,0);
 });
 await test('fetch and media start failures resolve without escaping or retaining failed voices, and retry works',async()=>{
  const h=audio();h.fetchError(true);await h.A.play('hit');assert.equal(h.sources.length,0);h.fetchError(false);h.startError(true);const p=h.A.play('hit');h.resolveFetch(1);await p;assert.equal(h.A.voices.size,0);assert.equal(h.sources[0].disconnected,1);
  h.startError(false);await h.A.play('hit');assert.equal(h.A.voices.size,1);assert.equal(h.sources[1].started,1);
 });
 await test('dedicated menu click supersedes a pending generic click and effect voices stay bounded',async()=>{
  const h=audio(),p=h.A.play('click'),q=h.A.play('menu_open');h.resolveFetch(0);h.resolveFetch(1);await Promise.all([p,q]);assert.equal(h.sources.length,1);
  const first=h.A.play('hit');h.resolveFetch(2);await first;for(let n=0;n<20;n++)await h.A.play('hit');assert.equal(h.A.voices.size,8);assert(h.sources.slice(0,-8).every(s=>s.stopped===1));
 });
 await test('music play requests coalesce and late completion from an old track cannot mutate current status',async()=>{
  const h=audio();h.A.sync();for(let i=0;i<20;i++)h.A.sync();assert.equal(h.tracks[0].pending.length,1);
  const old=h.tracks[0];h.A.queue.next();h.A.sync();const current=h.tracks[1];h.A.lastError='current';old.pending[0].reject(Error('old failure'));await flush();assert.equal(h.A.lastError,'current');assert.equal(h.A.musicReady,false);
  current.pending[0].resolve();await flush();assert.equal(h.A.musicReady,true);assert.equal(h.A.lastError,'');h.ctx.document.hidden=true;h.A.sync();assert.equal(current.paused,true);
 });
 await test('failed music tracks do not cycle into an unbounded replay loop',()=>{
  const h=audio();h.A.sync();h.tracks[0].listeners.error();assert.equal(h.tracks.length,2);h.tracks[1].listeners.error();for(let i=0;i<30;i++)h.A.sync();assert.equal(h.tracks.length,3);assert.equal(h.tracks[2].pending.length,0);assert.equal(h.A.failedTracks.size,2);
 });
 await test('changing reduced-motion setting immediately clears tilt and cancels the particle loop',()=>{
  const h=motion();h.ctx.render();h.event('pointermove',{pointerType:'mouse',target:h.tile,clientX:10,clientY:10});h.frame();assert(h.style.has('--rx'));assert.equal(h.rafs.size,1);
  h.ctx.document.documentElement.classList.add('reduce-motion');h.ctx.applySettings();assert.equal(h.rafs.size,0);assert.equal(h.style.has('--rx'),false);assert.equal(h.tile.classList.contains('is-tilting'),false);
  h.event('pointerdown',{target:h.tile});assert.equal(h.timers.size,0);
 });
 await test('system preference and page lifecycle stop and resume only one particle loop',()=>{
  const h=motion();h.ctx.render();h.media.matches=true;h.mediaListeners[0]();assert.equal(h.rafs.size,0);h.media.matches=false;h.mediaListeners[0]();assert.equal(h.rafs.size,1);
  h.ctx.document.hidden=true;h.event('visibilitychange');assert.equal(h.rafs.size,0);h.event('pointermove',{pointerType:'mouse',target:h.tile});assert.equal(h.rafs.size,0);
  h.ctx.document.hidden=false;h.event('visibilitychange');h.global('pageshow');assert.equal(h.rafs.size,1);h.global('pagehide');assert.equal(h.rafs.size,0);h.global('pageshow');assert.equal(h.rafs.size,1);
 });
 await test('repeated render does not add canvases, listeners, or animation loops; inert controls do not animate',()=>{
  const h=motion();for(let i=0;i<100;i++)h.ctx.render();assert.equal(h.canvases(),1);assert.equal(h.rafs.size,1);assert.equal(h.globalListeners.resize.length,1);assert.equal(h.mediaListeners.length,1);assert.equal(h.listeners.pointerdown.length,1);
  h.tile.inert=true;h.event('pointerdown',{target:h.tile});h.event('pointermove',{pointerType:'mouse',target:h.tile,clientX:10,clientY:10});h.frame();assert.equal(h.timers.size,0);assert.equal(h.style.size,0);
 });
 await test('unavailable canvas gracefully disables decoration without failing settings or repeated renders',()=>{
  const h=motion({canvasAvailable:false});for(let i=0;i<50;i++){h.ctx.render();h.ctx.applySettings();}assert.equal(h.canvases(),1);assert.equal(h.rafs.size,0);assert.equal(h.globalListeners.resize,undefined);
 });
 console.log('PASS '+checks+' settings/audio/motion checks');
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
