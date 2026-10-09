'use strict';
// Actual presentation grouping and playback, using the established virtual clock/DOM.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),vm=require('node:vm'),assert=require('node:assert/strict');
const reference=path.join(__dirname,'test_playback_v08.cjs'),source=fs.readFileSync(reference,'utf8'),boundary=source.indexOf('(async()=>{');
const helper=new Module(reference,module);helper.filename=reference;helper.paths=Module._nodeModulePaths(__dirname);helper._compile(source.slice(0,boundary)+'\nmodule.exports={harness,event,root};',reference);
const {harness,event,root}=helper.exports,p=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'source/presentation.js'),'utf8'),p);
const actor={id:'PLAYER_CUSTOM',source:'PLAYER_CUSTOM',name:'주인공',side:'ALLY',level:1,hp:100,maxHp:100,statuses:[],shields:[{source:'S1',value:300,initialValue:400},{source:'S2',value:400,initialValue:500}]},copy=x=>JSON.parse(JSON.stringify(x)),checks=[];
function state(h){const node=h.root.querySelector('[data-actor-id]'),box=new node.constructor('div','combatant-copy');for(const child of [...node.children])box.append(child);node.replaceChildren(box);return()=>node.querySelector('.shield-meter')?.querySelector('.stat')?.textContent;}
function packets(count){return Array.from({length:count},(_,i)=>{const before=copy(actor),after=copy(actor);for(const sh of before.shields)sh.value-=50*i;for(const sh of after.shields)sh.value-=50*(i+1);return{...event('parallel-'+count+'-'+i),kind:'guard',amount:0,absorbed:50,hpBefore:100,hpAfter:100,shieldBefore:700-100*i,shieldAfter:600-100*i,cardId:'TEST_SHIELD_PACKET',cardName:'동시 보호막',action:1,presentationActorsBefore:[before],presentationActorsAfter:[after]};});}
(async()=>{
 for(const count of [1,2]){
  const h=harness(),label=state(h),frames=p.CRPGPresentation.actionFrames(packets(count)),writes=[],original=h.fx.shieldMeter;
  h.fx.shieldMeter=function(id,value,max){writes.push({id,value,max});return original.call(this,id,value,max);};
  const job=h.fx.play(frames,{actors:[copy(actor)]});assert.equal(label(),'보호막  400 / 500');await h.tick(459);assert.equal(label(),'보호막  400 / 500');await h.tick(1);assert.equal(label(),'보호막  350 / 500');
  if(count===2){await h.tick(31);assert.equal(label(),'보호막  350 / 500');await h.tick(1);assert.equal(label(),'보호막  300 / 500');}
  assert(writes.every(w=>w.value<=400),'summed pool must never be written to the ally meter');assert.equal(h.fx.actors.get(actor.id).shields[1].value,400-50*count);assert.equal(h.stats().forbidden,0);h.fx.cancel();await job;
  checks.push({name:count===1?'single impact updates shield on that impact':'both queued impacts update shield without a one-hit delay',ok:true,impactSpacingMs:32,writes});console.log('PASS '+checks.at(-1).name);
 }
 if(process.env.CRPG_SHIELD_PLAYBACK_TEST_OUT)fs.writeFileSync(process.env.CRPG_SHIELD_PLAYBACK_TEST_OUT,JSON.stringify({checks},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
