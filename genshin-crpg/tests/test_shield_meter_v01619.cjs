'use strict';
// Execute the real row/render and playback methods with small DOM fixtures.
// This verifies numeric presentation boundaries, not screen geometry.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=n=>fs.readFileSync(path.join(__dirname,'../source',n),'utf8'),checks=[];
function test(name,fn){try{checks.push({name,ok:true,evidence:fn()});console.log('PASS '+name);}catch(e){checks.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const shields=[{source:'FIRST',value:300,initialValue:400},{source:'SECOND',value:400,initialValue:500}];
const actor=side=>({id:side,name:side,side,hp:1000,maxHp:1000,shields:JSON.parse(JSON.stringify(shields))});
test('the actual static fighter row shows max ally pool and sum enemy pools in the existing meter',()=>{
 const rows=source('app_experience.js'),meters=[],el=()=>({dataset:{},children:[],append(...items){this.children.push(...items);},classList:{add(){}}});
 const ctx=vm.createContext({el,meter:(node,label,value,max)=>meters.push({label,value,max}),showArt:false,selectedTarget:null,battleStatusChips:()=>null});
 vm.runInContext(rows.slice(rows.indexOf('function battleActorRow('),rows.indexOf('function battleSummons(')),ctx);
 ctx.battleActorRow(actor('ALLY'),null,0);ctx.battleActorRow(actor('ENEMY'),null,0);
 const out=meters.filter(m=>m.label==='보호막');assert.deepEqual(out,[{label:'보호막',value:400,max:500},{label:'보호막',value:700,max:900}]);return out;
});
function playback(){
 const av=source('app_av.js'),ctx=vm.createContext({console,setTimeout,clearTimeout});
 vm.runInContext(av.slice(av.indexOf('const GameEffects={'),av.indexOf('window.ActorPlayback='))+'\nglobalThis.player=GameEffects;',ctx);
 const effects=ctx.player,calls=[];effects.actorNode=()=>({dataset:{shieldMax:500},querySelector:()=>null,classList:{toggle(){}}});effects.shieldMeter=(id,value,max)=>calls.push({id,value,max});return{effects,calls};
}
test('the actual animation state update retains max ally and sum enemy meter values',()=>{
 const {effects,calls}=playback();effects.applyActorStates([actor('ALLY'),actor('ENEMY')]);assert.deepEqual(calls,[{id:'ALLY',value:400,max:500},{id:'ENEMY',value:700,max:900}]);return calls;
});
test('the actual packet update never briefly writes the summed ally after-pool when native snapshots exist',()=>{
 const {effects,calls}=playback();effects.seedActors([actor('ALLY')]);const after=actor('ALLY');after.shields[0].value=200;after.shields[1].value=300;
 effects.applyEventState({targetId:'ALLY',shieldAfter:500,presentationActorsAfter:[{id:after.id,shields:after.shields}]});assert(calls.length>0);assert(calls.every(c=>c.value===300&&c.max===500));assert.equal(effects.actors.get('ALLY').shields.length,2);assert.equal(effects.actors.get('ALLY').side,'ALLY');return calls;
});
test('the actual enemy packet update still shows the authored sequential barrier sum',()=>{
 const {effects,calls}=playback();effects.seedActors([actor('ENEMY')]);const after=actor('ENEMY');after.shields[0].value=200;after.shields[1].value=300;
 effects.applyEventState({targetId:'ENEMY',shieldAfter:500,presentationActorsAfter:[after]});assert(calls.length>0);assert(calls.every(c=>c.value===500&&c.max===900));return calls;
});
if(process.env.CRPG_SHIELD_UI_TEST_OUT)fs.writeFileSync(process.env.CRPG_SHIELD_UI_TEST_OUT,JSON.stringify({checks},null,2));
