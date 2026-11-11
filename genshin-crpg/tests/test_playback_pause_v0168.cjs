'use strict';
// Reuse the existing DOM/virtual-clock harness, without executing its test runner. Playback source is unchanged.
const fs0=require('node:fs'),path0=require('node:path'),Module0=require('node:module'),assert0=require('node:assert/strict');
const reference=path0.join(__dirname,'test_playback_v08.cjs'),text0=fs0.readFileSync(reference,'utf8'),boundary=text0.indexOf('(async()=>{');
assert0(boundary>0,'existing playback harness boundary');
const helper=new Module0(reference,module);helper.filename=reference;helper.paths=Module0._nodeModulePaths(__dirname);
helper._compile(text0.slice(0,boundary)+'\nmodule.exports={harness,event,fs,path,vm,root};',reference);
const {harness,event,fs,path,vm,root}=helper.exports;
const presentation=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'source/presentation.js'),'utf8'),presentation);
const frame=()=>presentation.CRPGPresentation.actionFrames(Array.from({length:5},(_,i)=>({...event('paused-hit-'+i,i),
 actorId:'ENEMY',cardId:'MOND_AMBER_Q',cardName:'연타',action:1,hpBefore:100-i*10,hpAfter:90-i*10,
 absorbed:10,shieldBefore:50-i*10,shieldAfter:40-i*10})))[0];
const hp=h=>h.root.querySelector('[data-actor-id]').querySelector('.stat').textContent;
const checks=[];
async function check(name,run){await run();checks.push(name);console.log('PASS '+name);}
(async()=>{
 await check('pause freezes queued HP, shield and impacts; resume preserves remaining intervals exactly once',async()=>{
  const h=harness(),actor=h.root.querySelector('[data-actor-id]');
  // Add a shield meter with the same real selectors as the product.
  const box=new actor.constructor('div','shield-meter'),stat=new actor.constructor('div','stat','보호막  50 / 50'),meter=new actor.constructor('div','meter');
  meter.append(new actor.constructor('i'));box.append(stat,meter);actor.append(box);actor.dataset.shieldMax='50';
  const job=h.fx.play([frame()]);await h.tick(470);assert0.equal(hp(h),'HP  90 / 100');assert0.equal(stat.textContent,'보호막  40 / 50');
  await h.click('일시정지');await h.tick(2000);assert0.equal(hp(h),'HP  90 / 100');assert0.equal(stat.textContent,'보호막  40 / 50');assert0.equal(h.shown.length,1);
  await h.click('계속 재생');await h.tick(21);assert0.equal(h.shown.length,1);await h.tick(1);assert0.equal(hp(h),'HP  80 / 100');
  await h.tick(96);assert0.equal(hp(h),'HP  50 / 100');assert0.equal(stat.textContent,'보호막  0 / 50');assert0.deepEqual(h.shown.map(x=>x.time),[460,2492,2524,2556,2588]);
  await h.tick(650);await job;assert0.equal(h.shown.length,5);assert0.equal(h.stats().forbidden,0);
 });
 await check('speed changes during a pause preserve queued hits and apply the new speed on resume',async()=>{
  const h=harness(),job=h.fx.play([frame()]);await h.tick(470);await h.click('일시정지');h.speedTo(2);await h.tick(1000);
  assert0.equal(h.shown.length,1);await h.click('계속 재생');await h.tick(10);assert0.equal(h.shown.length,1);await h.tick(1);assert0.equal(h.shown.length,2);
  await h.tick(48);assert0.equal(h.shown.length,5);assert0.deepEqual(h.shown.map(x=>x.time),[460,1481,1497,1513,1529]);h.fx.cancel();await job;
 });
 await check('speed changes during a burst rescale only the remaining delay',async()=>{
  const h=harness(),job=h.fx.play([frame()]);await h.tick(470);h.speedTo(2);await h.tick(10);assert0.equal(h.shown.length,1);await h.tick(1);assert0.equal(h.shown.length,2);
  await h.tick(48);assert0.deepEqual(h.shown.map(x=>x.time),[460,481,497,513,529]);assert0.equal(hp(h),'HP  50 / 100');h.fx.cancel();await job;
 });
 await check('a repeated pause and an external pause do not lose or duplicate queued hits',async()=>{
  const h=harness(),job=h.fx.play([frame()]);await h.tick(470);h.fx.paused=true;h.fx.reschedule();await h.tick(1000);assert0.equal(h.shown.length,1);
  h.fx.paused=false;h.fx.reschedule();await h.tick(22);assert0.equal(h.shown.length,2);await h.click('일시정지');await h.tick(500);
  await h.click('계속 재생');await h.tick(96);assert0.equal(h.shown.length,5);assert0.equal(hp(h),'HP  50 / 100');h.fx.cancel();await job;
 });
 await check('cancel during pause removes pending hits permanently',async()=>{
  const h=harness(),job=h.fx.play([frame()]);await h.tick(460);await h.click('일시정지');await h.click('결과 바로 보기');await job;await h.tick(100000);
  assert0.equal(h.shown.length,1);assert0.equal(hp(h),'HP  90 / 100');assert0.equal(h.fx.hitTimers.size,0);assert0.equal(h.fx.active,false);
 });
 await check('manual next discards stale burst callbacks before displaying the next frame',async()=>{
  const h=harness(),job=h.fx.play([frame(),event('after-burst',0)]);await h.tick(460);await h.click('다음 표시');assert0.equal(h.shown.length,2);
  await h.tick(128);assert0.equal(h.shown.length,2);assert0.equal(hp(h),'HP  90 / 100');h.fx.cancel();await job;
 });
 console.log(JSON.stringify({ok:true,checks}));
})().catch(e=>{console.error(e);process.exitCode=1;});
