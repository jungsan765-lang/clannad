'use strict';
// 0.16 다인 모드 · 방장의 세계 on the guest's own main screen (app_coop_world_v0160.js). User: 「아니 전투만 하는게 아니라 시발
// 그냥 맵을 같이 돌아다녀야된다고 아예」. The field screen is drawn standing in the host's world (the host's place, hour, open
// ways and known places) from a copy of the guest's state, the guest's own state never changes, 이동 goes to the server
// (/coop/move), what belongs to the guest's own journey is refused there, the menus work, and 「내 세계로」 goes back.
// Also: a wish never opens the reward window over the wish screen (user: 「뽑기에서 뽑았을 때 이 화면이 먼저 나오는 문제」).
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,'source',f),'utf8');
const results=[];
function check(name,fn){return Promise.resolve().then(fn).then(evidence=>{results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);},e=>{results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;});}
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setImmediate(r));};
const plain=x=>JSON.parse(JSON.stringify(x));

const MAPS=[['MAP_MOND_CITY','몬드','몬드성'],['MAP_MOND_FOREST','몬드','속삭임의 숲'],['MAP_MOND_LAKE','몬드','별이 떨어지는 호수'],['MAP_MOND_PEAK','몬드','바람맞이 산']].map(r=>{const row=[...r];row[5]='PROFILE_'+r[0];row[12]=r[0]==='MAP_MOND_CITY'?'Y':'N';return row;});
const EDGES=[['E_FOREST_LAKE','MAP_MOND_FOREST','MAP_MOND_LAKE'],['E_FOREST_PEAK','MAP_MOND_FOREST','MAP_MOND_PEAK'],['E_CITY_FOREST','MAP_MOND_CITY','MAP_MOND_FOREST']].map(e=>{const row=[...e];row[5]=10;row[8]='Y';row[11]='ACTIVE';return row;});
function setup(){
 const toasts=[],requests=[],renders=[],acts=[],steps=[];
 const proto={chestsHere(){return ['own chest'];}},real=Object.create(proto);
 Object.assign(real,{s:{global:{CURRENT_MAP_ID:'MAP_MOND_CITY',LOCATION:'몬드성',SCREEN_MODE:'LOCATION',WORLD_DAY:1,WORLD_TIME:'08:00',SAVE_ID:'S1'},exploration:{visitedMaps:{MAP_MOND_CITY:true}},flags:{}},
  tables:{'32_MAP_DB':new Map(MAPS.map(m=>[m[0],m]))},rows:t=>t==='47_MAP_EDGE_DB'?EDGES.map(e=>e.slice()):[],
  playPhase:()=> 'FREE',needsRecovery:()=>false,coopRoamReason:()=>'',actionReason:(t,a)=>t==='MENU'&&a.screen==='NOPE'?'열 수 없는 화면':'',
  edgeReason:()=>'(own world)'});
 const room={id:'R1',you:'GUEST',host:{name:'루미',pid:'h1',char:{name:'루미',player:true}},members:[{pid:'g1',name:'하루',me:true,ready:true,char:{name:'하루',player:true}}],
  world:{map:'MAP_MOND_FOREST',name:'속삭임의 숲',day:3,time:'21:00',rev:'2:1:0:'},at:{map:'MAP_MOND_FOREST',name:'속삭임의 숲',follow:true},
  positions:[{pid:'h1',name:'루미',host:true,map:'MAP_MOND_FOREST',mapName:'속삭임의 숲',follow:true,fight:null,me:false},{pid:'g1',name:'하루',host:false,map:'MAP_MOND_FOREST',mapName:'속삭임의 숲',follow:true,fight:null,me:true}],fights:[]};
 const world={room:'R1',host:{name:'루미',pid:'h1',map:'MAP_MOND_FOREST'},at:{map:'MAP_MOND_FOREST',name:'속삭임의 숲',follow:true},day:3,time:'21:00',route:'ROUTE_TRAVELER',
  open:['E_FOREST_LAKE','E_CITY_FOREST'],visited:['MAP_MOND_FOREST','MAP_MOND_CITY'],opened:[],positions:room.positions,fights:[],near:[],rev:'2:1:0:'};
 const C={status:{room},api:{stepWhy:()=>'',fightWhy:()=>'',farFrom:()=>false,goTo(){},openBattle(){},follow:async()=>({}),joinFight:async()=>({}),suggest:async()=>({}),openChest(){},msg:()=>'',
  step:async map=>{steps.push(map);const at={map,name:MAPS.find(m=>m[0]===map)[2],follow:false};room.at=at;room.positions[1]={...room.positions[1],map,mapName:at.name,follow:false};return {at,room,encounter:null};}},close(){},open(){}};
 const O={token:'t',account:{},active:true,pending:null,sessionStamp:()=>1,sameSession:()=>true,request:async(p,b)=>{requests.push([p,b]);if(p==='/coop/world')return JSON.parse(JSON.stringify(world));throw Object.assign(new Error('없음'),{status:404});}};
 const noop=()=>{},el=()=>({classList:{add:noop,remove:noop,toggle:noop,contains:()=>false},append:noop,setAttribute:noop,style:{},dataset:{}});
 const ctx={console,Date,Promise,JSON,Math,Object,Array,Map,Set,Number,String,structuredClone,setTimeout,clearTimeout,setInterval:()=>0,
  document:{querySelector:()=>null,querySelectorAll:()=>[],addEventListener:noop,createElement:el,body:{classList:{toggle:noop,add:noop,remove:noop}}},
  CRPGShell:{icon:el,toast:t=>toasts.push(t),menuToggle:noop,topOverlay:()=>null},CRPGOnline:O,CRPGCoop:C,
  NavigationUI:{draw(){return {drawnAt:ctx.game.s.global.CURRENT_MAP_ID};},placeName(id){return ctx.game.s.global.CURRENT_MAP_ID===id?'here':'';},drawMap(){return {querySelector:()=>null};},risk:()=>''},
  CRPGRuntime:{Runtime:{prototype:proto}}};
 ctx.window=ctx;vm.createContext(ctx);
 // The page's own globals the module wraps: the game, the busy flag, render and act.
 vm.runInContext('var game=null,busy=false;function render(){__renders.push({map:game&&game.s.global.CURRENT_MAP_ID,time:game&&game.s.global.WORLD_TIME,facade:!!(game&&game.coopWorldView)});}async function act(type,params){__acts.push([type,params]);return {ok:true};}',Object.assign(ctx,{__renders:renders,__acts:acts}));
 ctx.game=real;vm.runInContext(src('app_coop_world_v0160.js'),ctx,{filename:'app_coop_world_v0160.js'});
 return {ctx,real,room,world,C,O,W:ctx.CRPGCoopWorld,toasts,requests,renders,acts,steps,proto};
}

(async()=>{
await check('a guest\'s field screen is drawn in the host\'s world (place, hour, open ways, known places); the guest\'s own state never changes',async()=>{
 const T=setup();vm.runInContext('render()',T.ctx);await flush();
 assert(T.requests.some(r=>r[0]==='/coop/world'),'the host\'s world is fetched');
 const last=plain(T.renders.at(-1));assert.deepEqual(last,{map:'MAP_MOND_FOREST',time:'21:00',facade:true},'drawn where the guest stands, at the host\'s hour');
 assert.equal(T.W.shown,true);assert.equal(T.ctx.game,T.real,'the real game is back after drawing');
 assert.equal(T.real.s.global.CURRENT_MAP_ID,'MAP_MOND_CITY');assert.equal(T.real.s.global.WORLD_TIME,'08:00');assert.deepEqual(plain(Object.keys(T.real.s.exploration.visitedMaps)),['MAP_MOND_CITY']);
 const f=T.W.facade;assert.equal(f.edgeReason(EDGES[0]),'','a way open in the host\'s world');assert.match(f.edgeReason(EDGES[1]),/방장의 세계/,'a way the host has not opened');
 assert.equal(f.navigationGoal(),null);assert.deepEqual(plain(f.placeEntries()),[]);assert.equal(f.actionReason('MOVE',{edge:'E_FOREST_LAKE'}),'');assert.match(f.actionReason('MOVE',{edge:'E_CITY_FOREST'}),/바로 갈 수 없는/);
 assert.match(f.actionReason('WAIT',{}),/이동과 메뉴만/,'nothing of the guest\'s own journey there');assert.equal(f.actionReason('MENU',{screen:'NOPE'}),'열 수 없는 화면','the menus follow the real game');
 assert.deepEqual(plain(Object.keys(f.s.exploration.visitedMaps).sort()),['MAP_MOND_CITY','MAP_MOND_FOREST'],'the names on the map are the host\'s places');
 // The travel map's own redraws (outside a render) stand in the host's world too.
 assert.deepEqual(plain(vm.runInContext('NavigationUI.draw()',T.ctx)),{drawnAt:'MAP_MOND_FOREST'});assert.equal(vm.runInContext('NavigationUI.placeName("MAP_MOND_FOREST")',T.ctx),'here');
 // The guest's own hidden chests wait for their own world.
 assert.deepEqual(plain(T.real.chestsHere()),[]);
});

await check('이동 there is a step through the server; the rest of the field screen is refused; the menus work; 「내 세계로」 goes back',async()=>{
 const T=setup();vm.runInContext('render()',T.ctx);await flush();
 const out=await vm.runInContext('act("MOVE",{edge:"E_FOREST_LAKE"})',T.ctx);
 assert.deepEqual(T.steps,['MAP_MOND_LAKE'],'the edge\'s place, through /coop/move');assert.equal(out.ok,true);assert.equal(T.acts.length,0,'the guest\'s own MOVE never runs');
 assert.deepEqual(plain(T.renders.at(-1)),{map:'MAP_MOND_LAKE',time:'21:00',facade:true},'drawn at the new place');assert.equal(vm.runInContext('busy',T.ctx),false);
 const far=await vm.runInContext('act("MOVE",{edge:"E_FOREST_PEAK"})',T.ctx);assert.equal(far.ok,false);assert.equal(T.steps.length,1,'not from here');
 T.W.input={at:Date.now(),content:true};const wait=await vm.runInContext('act("WAIT",{minutes:60})',T.ctx);assert.equal(wait.ok,false);assert(T.toasts.some(t=>/이동과 메뉴만/.test(t)));assert.equal(T.acts.length,0);
 T.W.input={at:0,content:false};await vm.runInContext('act("MAIL_CLAIM",{})',T.ctx);assert.deepEqual(T.acts.map(a=>a[0]),['MAIL_CLAIM'],'a window\'s own action is the guest\'s own');
 await vm.runInContext('act("MENU",{screen:"PARTY"})',T.ctx);assert.equal(T.acts.at(-1)[0],'MENU');
 T.W.leave();assert.equal(T.W.off,'R1');assert.deepEqual(plain(T.renders.at(-1)),{map:'MAP_MOND_CITY',time:'08:00',facade:false},'back in the guest\'s own world');assert.equal(T.W.shown,false);
 assert.deepEqual(plain(T.real.chestsHere()),['own chest'],'and its own chests');
 const b=T.W.button();assert.equal(b&&b.className,'cp-btn primary','the room window brings the host\'s world back');
});

await check('the screen stays the guest\'s own while their journey is busy (a fight, a facility, a story) or when they are not a guest',async()=>{
 const T=setup();T.real.s.runtime={id:'B1'};vm.runInContext('render()',T.ctx);await flush();assert.equal(T.renders.at(-1).facade,false,'a fight of one\'s own');
 T.real.s.runtime=null;T.real.s.placeVisit={place:'P'};vm.runInContext('render()',T.ctx);assert.equal(T.renders.at(-1).facade,false,'inside a facility');
 T.real.s.placeVisit=null;T.real.playPhase=()=> 'STORY';vm.runInContext('render()',T.ctx);assert.equal(T.renders.at(-1).facade,false,'in a story');
 T.real.playPhase=()=> 'FREE';T.room.you='HOST';vm.runInContext('render()',T.ctx);assert.equal(T.renders.at(-1).facade,false,'the host plays their own world');
 T.room.you='GUEST';vm.runInContext('render()',T.ctx);await flush();assert.equal(T.renders.at(-1).facade,true,'once free, the host\'s world again');
});

await check('wired last, with no drop-down list; the reward window never opens over a wish',async()=>{
 const html=src('index.html'),scripts=[...html.matchAll(/<script src="([^"]+)"/g)].map(m=>m[1]),at=f=>scripts.indexOf(f);assert(at('app_coop_world_v0160.js')>at('app_choice_v01525.js')&&at('app_coop_world_v0160.js')>at('app_coop_v0153.js'),'after every screen');{const after=scripts.slice(at('app_coop_puzzle_v0160.js')+1);assert(at('app_coop_puzzle_v0160.js')>at('app_coop_world_v0160.js')&&after.every(f=>/^app_[a-z]+_v01(6[7-9]|[7-9]\d)\.js$/.test(f)),'같이 풀기 last, but for the 0.16.7+ presentation layers: '+after.join(' '));}
 {const build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');assert(build.includes("'app_coop_world_v0160.js'")&&build.includes("'app_coop_puzzle_v0160.js'"));}
 assert(!/createElement\(\s*['"]select['"]|mk\(\s*['"]select['"]|<select/.test(src('app_coop_world_v0160.js')),'no drop-down');
 assert.match(src('app_adventure.js'),/function receivedLoot\(before,type\)\{[\s\S]{0,400}if\(type==='WISH'\)return null;/,'a wish shows what it brought on the wish screen');
});

const out=path.join(root,'reports','v0160');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'coop-world-screen.json'),JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length,results},null,2)+'\n');
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
if(!results.every(r=>r.ok))process.exitCode=1;
})();
