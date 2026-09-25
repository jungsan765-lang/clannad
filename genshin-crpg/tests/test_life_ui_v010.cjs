'use strict';
// Execute the shipped UI helpers with the real runtime; the DOM only records output.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),db=JSON.parse(fs.readFileSync(path.join(root,'content/db.json')));
let now=1900000000000,sequence=0,frame=0,restoreCalls=0,ordinaryCalls=0;
const cancelled=[],actions=[];
class Element {
 constructor(tag,cls='',text=''){this.tag=tag;this.className=cls;this.textContent=text;this.children=[];this.style={};this.attributes={};this.isConnected=true;this.classList={add(){},remove(){},toggle(){}};}
 append(...children){this.children.push(...children);} prepend(...children){this.children.unshift(...children);} replaceChildren(...children){this.children=children;}
 setAttribute(k,v){this.attributes[k]=v;} remove(){this.isConnected=false;} focus(){} setPointerCapture(){} scrollIntoView(){}
 querySelector(){return null;}
}
const content=new Element('main'),walk=n=>[n,...n.children.flatMap(c=>c instanceof Element?walk(c):[])];
const ctx=vm.createContext({console,Date:class extends Date{static now(){return now;}},DB:db,game:null,busy:false,lastResult:null,
 document:{querySelector:q=>q==='.content'?content:null,getElementById:id=>walk(content).find(n=>n.id===id&&n.isConnected)||null,body:new Element('body')},
 el:(...args)=>new Element(...args),button:(label,fn)=>Object.assign(new Element('button','',label),{onclick:fn}),
 actionButton:(label,type,params)=>Object.assign(new Element('button','',label),{onclick:()=>actions.push({type,params})}),
 cancelAnimationFrame:id=>cancelled.push(id),requestAnimationFrame:()=>++frame,clearTimeout(){},setTimeout(){return 1;},queueMicrotask:fn=>fn(),
 dialogue(){},returnToJourney(){},render(){},itemDetailView(){},itemSummary(){return '';},crafting(){},shop(){},
 restoreUIState(){restoreCalls++;},parseUI:x=>{try{return JSON.parse(x||'{}');}catch{return {};}},
 safeName:(table,id,index=1)=>ctx.game?.tables[table]?.get(id)?.[index]||id,
 act:async(type,params)=>{actions.push({type,params});return {ok:true};}
});
for(const [,file]of fs.readFileSync(path.join(root,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|runtime[^\"]*)\.js)"/g))vm.runInContext(fs.readFileSync(path.join(root,'source',file),'utf8'),ctx,{filename:file});
for(const file of ['inventory_presenter.js','app_adventure.js'])vm.runInContext(fs.readFileSync(path.join(root,'source',file),'utf8'),ctx,{filename:file});
ctx.updateLifeUI=()=>ordinaryCalls++;
vm.runInContext(fs.readFileSync(path.join(root,'source/app_life.js'),'utf8'),ctx,{filename:'app_life.js'});
const R=ctx.CRPGRuntime.Runtime,copy=x=>JSON.parse(JSON.stringify(x)),run=code=>vm.runInContext(code,ctx),results=[];
function fresh(map='MAP_MOND_CITY'){const r=new R(db);r.newGame({name:'UI 회귀 검증',route:'ROUTE_TRAVELER',seed:74219,saveId:'LIFE-UI-'+(++sequence)});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,STORY_MENU_POLICY:'',WORLD_TIME:'12:00'});r.prepareStory();ctx.game=r;ctx.itemPresenter=ctx.CRPGInventoryPresenter.create(r.db);ctx.lastResult=null;return r;}
function test(name,fn){try{fn();results.push({name,ok:true});console.log('PASS '+name);}catch(error){results.push({name,ok:false,error:error.stack});console.error('FAIL '+name+'\n'+error.stack);}}

test('actual guest and off-party combatant growth appears once in the earned-reward summary',()=>{
 const r=fresh(),gate='UI_GUEST_GATE';r.unlockCharacter('MOND_KAEYA');assert(!r.s.party.some(p=>p.active&&p.source==='MOND_KAEYA'));
 const guest=r.character('MOND_AMBER');r.s.guestSnapshots={[gate]:{MOND_AMBER:{...guest,level:1}}};
 r.s.runtime={id:'UI_BATTLE',storyConfig:{node_id:gate},actors:[r.player(),r.character('MOND_KAEYA'),{...guest,guest:true}]};
 const before=ctx.adventureSnapshot(),snapshot=copy(before.growth);assert.equal(snapshot['GUEST:MOND_AMBER'].guestGate,gate);assert.equal(snapshot.MOND_KAEYA.level,1);
 const permanentAmber=r.s.chars.MOND_AMBER.level;r.addXp('MOND_KAEYA',300);r.s.guestSnapshots[gate].MOND_AMBER.level=2;r.s.runtime=null;
 const loot=ctx.receivedLoot(before,'COMBAT');assert.equal(loot.title,'레벨 업!');assert.deepEqual(copy(loot.levelUps).map(x=>[x.owner,x.from,x.to]).sort(),[['GUEST:MOND_AMBER',1,2],['MOND_KAEYA',1,2]]);
 assert.equal(r.s.chars.MOND_AMBER.level,permanentAmber);assert.equal(snapshot['GUEST:MOND_AMBER'].level,1);assert.equal(ctx.receivedLoot(ctx.adventureSnapshot(),'COMBAT'),null);
});

test('XP book level-up produces a notice with full HP; sub-threshold XP does not invent one',()=>{
 const r=fresh();r.giveItem('MAT_CHAR_EXP_WANDERER',2);r.s.global.PLAYER_HP_CURRENT=1;let before=ctx.adventureSnapshot();
 ctx.lastResult=r.action('USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',quantity:1,owner:'PLAYER_CUSTOM'});let loot=ctx.receivedLoot(before,'USE_ITEM');assert.equal(loot.levelUps.length,0);assert.equal(r.s.global.PLAYER_HP_CURRENT,1);
 r.s.global.PLAYER_XP_STATE=299;before=ctx.adventureSnapshot();ctx.lastResult=r.action('USE_ITEM',{item:'MAT_CHAR_EXP_WANDERER',quantity:1,owner:'PLAYER_CUSTOM'});loot=ctx.receivedLoot(before,'USE_ITEM');
 assert.deepEqual(copy(loot.levelUps).map(x=>[x.from,x.to]),[[1,2]]);assert.equal(r.s.global.PLAYER_HP_CURRENT,r.s.global.PLAYER_HP_MAX);
});

test('restoring the same fishing cast clears unsaved input and delegates to the normal restore hook',()=>{
 const r=fresh('MAP_CRPG_CIDER_BANK');r.giveItem('TRPG_FISHING_ROD',1);r.giveItem(ctx.CRPGRuntime.lifeCatalog.bait,2);r.action('LIFE_START',{kind:'FISH'});now+=2200;
 ctx.updateLifeUI();const hold=walk(content).find(n=>n.tag==='button'&&n.textContent==='길게 눌러 당기기');assert(hold);hold.onpointerdown({preventDefault(){},pointerId:1});
 assert.equal(run('fishingSession.controls.length'),1);assert.equal(run('fishingSession.holding'),true);const previousFrame=run('fishingFrame'),previousRestores=restoreCalls,job=copy(r.s.lifeJob),bait=r.itemCount(ctx.CRPGRuntime.lifeCatalog.bait);
 ctx.game=new R(db,JSON.parse(r.serialize()));ctx.restoreUIState();assert.equal(restoreCalls,previousRestores+1);assert(cancelled.includes(previousFrame));assert.equal(run('fishingSession'),null);assert.equal(run('fishingFrame'),null);
 ctx.updateLifeUI();assert.equal(run('fishingSession.id'),job.id);assert.equal(run('fishingSession.controls.length'),0);assert.equal(run('fishingSession.holding'),false);assert.equal(ctx.game.s.lifeJob.startedAt,job.startedAt);assert.equal(ctx.game.itemCount(ctx.CRPGRuntime.lifeCatalog.bait),bait);assert.equal(actions.length,0);
 ctx.game.action('LIFE_CANCEL');ctx.updateLifeUI();assert.equal(ordinaryCalls,1);assert.equal(run('fishingSession'),null);
});

test('Katheryne resolves her schedule from a profile with no playable owner even from another map',()=>{
 const r=fresh('MAP_MOND_FOREST');assert.equal(r.tables['04_CHAR_DB'].get('PROFILE_MOND_KATHERYNE')[1],null);
 const meeting=ctx.characterMeetingPlace('PROFILE_MOND_KATHERYNE',[]);assert.equal(meeting.map,'MAP_MOND_CITY');assert.match(meeting.label,/활동 장소/);
});

test('Kaeya resolves his authored field contact and active party location takes precedence',()=>{
 const r=fresh('MAP_MOND_CITY'),event=r.rows('51_EVENT_DB').map(row=>ctx.parseUI(row[13])).find(d=>d.kind==='personal_event'&&d.profile_id==='PROFILE_MOND_KAEYA'&&d.map_id);
 assert(event);const meeting=ctx.characterMeetingPlace('PROFILE_MOND_KAEYA',[]);assert.equal(meeting.map,event.map_id);assert.equal(meeting.label,'현장 대화 장소');
 r.unlockCharacter('MOND_KAEYA');r.action('PARTY',{char:'MOND_KAEYA',slot:2});const together=ctx.characterMeetingPlace('PROFILE_MOND_KAEYA',[]);assert.equal(together.map,'MAP_MOND_CITY');assert.match(together.label,/함께 이동/);
});

test('save labels resolve old and new maps both during a game and on the title screen',()=>{
 fresh();for(const inGame of [true,false]){if(!inGame)ctx.game=null;assert.equal(ctx.savedMapName('MAP_MOND_CITY'),'몬드성');for(const site of ctx.CRPGRuntime.lifeCatalog.sites)assert.equal(ctx.savedMapName(site.id),site.name);assert.equal(ctx.savedMapName('MISSING_MAP'),'알 수 없는 구역');}
 assert(!db['32_MAP_DB'].some(row=>row[0]==='MAP_CRPG_CIDER_BANK'));
});

console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length,results},null,2));if(results.some(r=>!r.ok))process.exitCode=1;
