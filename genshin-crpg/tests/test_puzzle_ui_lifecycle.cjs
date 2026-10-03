'use strict';
// Run the real puzzle module with deterministic timers. A new puzzle must not revive a closed one's cues.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../source/app_puzzles_v0152.js'),'utf8');
function harness(){
 const timers=new Map(),sounds=[];let seq=0;
 function element(tag){return{tag,children:[],className:'',textContent:'',style:{setProperty(){}},classList:{add(){},remove(){}},setAttribute(){},append(...nodes){this.children.push(...nodes);}};}
 const C={node:{id:'first'},games:{},note(){}},s={document:{createElement:element,createElementNS:(ns,tag)=>element(tag)},setTimeout:(fn,ms)=>{timers.set(++seq,{fn,ms});return seq;},clearTimeout:id=>timers.delete(id),CRPGChests:C,CRPGShell:{},CRPGSound:{play:name=>sounds.push(name)},CRPGRuntime:{chestRules:{puzzleV0152:{elements:['불','물']}}}};
 s.window=s;vm.createContext(s);vm.runInContext(source,s);
 const body=element('div'),play=()=>C.games.SIMON({region:'MOND',seq:[0],showMs:200},body,()=>{});
 const fire=ms=>{const item=[...timers].find(([,timer])=>timer.ms===ms);assert(item,'expected timer '+ms);timers.delete(item[0]);item[1].fn();};
 return{C,timers,sounds,body,play,fire};
}
{
 const h=harness();h.play();h.C.node={id:'replacement'};h.fire(600);assert.equal(h.timers.size,0);assert.equal(h.sounds.length,0);
 console.log('PASS reopening a different puzzle cannot run the closed puzzle start timer');
}
{
 const h=harness();h.play();h.fire(600);assert.equal(h.timers.size,2);h.C.node={id:'replacement'};h.fire(300);h.fire(660);assert.equal(h.sounds.length,0);assert.equal(h.timers.size,0);
 console.log('PASS queued sequence flashes and input transitions belong to their original puzzle');
}
{
 const h=harness();h.play();h.fire(600);h.fire(300);assert.deepEqual(h.sounds,['puzzle_light']);h.fire(660);assert(h.body.children.some(node=>node.textContent.includes('같은 순서로')));
 console.log('PASS the active puzzle still shows its cue and enables its next phase');
}
