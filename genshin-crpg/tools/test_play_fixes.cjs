'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),runtimeDir=process.env.CRPG_RUNTIME_DIR||'source',dir=path.join(root,runtimeDir),raw=fs.readFileSync(root+'/content/db.json','utf8');
let clock=1790355600000;
// withFixes=false loads the same runtime without runtime_play_fixes.js, to show what the fixes change.
function stack(withFixes=true){const c=vm.createContext({console,Date:class extends Date{static now(){return clock;}},setTimeout,clearTimeout,TextEncoder,TextDecoder});const html=fs.readFileSync(dir+'/index.html','utf8');for(const[,f]of html.matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ?]*)\.js)(?:\?[^" ]*)?"/g))if(withFixes||f!=='runtime_play_fixes.js')vm.runInContext(fs.readFileSync(dir+'/'+f,'utf8'),c,{filename:f});return c;}
const ctx=stack(),R=ctx.CRPGRuntime.Runtime,DB=JSON.parse(raw),R0=stack(false).CRPGRuntime.Runtime,DB0=JSON.parse(raw);
const report={version:'0.13.30',runtimeDir,scope:'personal-story exits, fallen protagonist wins, defeat penalty, enemy target spread, equipment screen, item wording and icons',checks:[]};
function test(n,f){try{report.checks.push({name:n,passed:true,evidence:f()||null});console.log('PASS '+n);}catch(e){report.checks.push({name:n,passed:false,error:e.stack});console.error('FAIL '+n+'\n'+e.stack);}}
const L=x=>JSON.parse(JSON.stringify(x));let seq=0;// values from the VM realm compare by content
function fresh(route='ROUTE_TRAVELER',map='MAP_MOND_CITY',Runtime=R,db=DB){const r=new Runtime(db);r.newGame({name:'점검',route,seed:1330+seq,saveId:'FIX-'+(++seq)});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,WORLD_TIME:'12:00',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION',MORA:1000});delete r.s.storyJourney;delete r.s.storyBreak;try{r.prepareStory();}catch{}return r;}
function join(r,ids){const own=JSON.parse(r.s.global.COMPANION_ELIGIBILITY_JSON||'{}');ids.forEach((id,i)=>{own[id]={state:'JOINED'};r.s.party[i+1]={slot:'PARTY_'+(i+2),type:'CHAR',source:id,control:'AI',active:true,tactic:'균형'};});r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);}
function battle(r){const group=r.rows('33_ENCOUNTER_GROUP_DB').find(x=>/EG_/.test(x[0]))[0];r.startBattle(group,'RANDOM');const b=r.s.runtime;if(b.opening)r.action('COMBAT_BEGIN',{battle:b.id});return r.s.runtime;}
function lose(r){for(const a of battle(r).actors)if(a.side==='ALLY')a.hp=0;r.autoUntilPlayer();}

// Every authored "prepare later" answer to a personal (legend) mission's cost prompt.
const T='57_MOND_STORY_SCENE_DB';
function deferPaths(){const rows=DB[T].slice(1).filter(x=>x&&x[18]==='ACTIVE'),out=[];
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI'])for(const d of fresh(route).storyIndex().legends.values()){if(d.ROUTE_SCOPE!==route||!d.COST_COMMIT_NODE_ID)continue;const accept=rows.find(x=>x[0]===route&&x[4]===d.COST_COMMIT_NODE_ID);if(!accept?.[14])continue;
  for(const defer of rows.filter(x=>x[0]===route&&x[5]==='CHOICE'&&x[14]===accept[14]&&!/LEGEND_ACCEPT_AND_PAY/.test(x[12]||'')))out.push({route,d,accept,defer});}
 return out;}
function playDefer({route,d,accept,defer},Runtime=R,db=DB){const r=fresh(route,d.MAP_ID||'MAP_MOND_CITY',Runtime,db);r.s.storyReturnStack=[r.storyFrame()];r.s.storyContext={kind:'LEGEND',entry:d.id,node:'CHOICE_GROUP:'+accept[14],table:T};r.s.global.SCREEN_MODE='STORY';r.prepareStory();if(!r.storyChoices().some(x=>x[4]===defer[4]))return null;
 const mora=r.s.global.MORA;r.action('STORY_CHOICE',{node:defer[4],choice:true});for(let n=0;n<40&&r.s.storyContext;n++){if(r.s.global.PENDING_CHOICE_GROUP_ID||r.storyNode()?.[5]==='MENU_GATE')break;r.action('STORY_NEXT',{node:r.storyActiveNodeId()});}
 return {r,mora,stuck:!!r.s.storyContext||r.playPhase()!=='FREE'||r.s.global.MORA!==mora};}
const paths=deferPaths();let oldStuck=null;

test('"prepare later" in a personal mission ends the story and frees the player',()=>{let checked=0,before=0;const stuck=[];
 for(const p of paths){const run=playDefer(p);if(!run)continue;checked++;if(run.stuck)stuck.push(p.d.id+' | '+p.defer[4]+' | '+run.r.storyActiveNodeId());
  let old=null;try{old=playDefer(p,R0,DB0);}catch{}if(old?.stuck){before++;oldStuck??=old;}}
 assert(checked>=60,'paths checked: '+checked);assert.deepEqual(stuck,[]);return {checked,stuckWithoutFix:before,stuckWithFix:0};});
test('a save left on the finished story gate opens with the story closed',()=>{assert(oldStuck,'no stuck save to reload');const {r,mora}=oldStuck;assert(r.s.storyContext);
 const again=new R(DB,JSON.parse(r.serialize()));assert(!again.s.storyContext);assert.equal(again.playPhase(),'FREE');assert.equal(again.s.global.MORA,mora);assert.equal(again.actionReason('TITLE'),'');return {node:r.storyActiveNodeId(),phaseBefore:r.playPhase(),blockedBefore:r.actionReason('TITLE'),phaseAfter:again.playPhase()};});

test('the protagonist falling does not lose a battle the companions win',()=>{const r=fresh('ROUTE_TRAVELER','MAP_MOND_PLAINS');join(r,['MOND_AMBER']);
 for(const a of battle(r).actors){if(a.source==='PLAYER_CUSTOM')a.hp=0;if(a.side==='ENEMY')a.hp=0;}r.autoUntilPlayer();
 const g=r.s.global,result=JSON.parse(g.LAST_BATTLE_RESULT_JSON);assert(!r.s.runtime);assert.equal(result.victory,true);assert.equal(g.PLAYER_HP_CURRENT,Math.ceil(g.PLAYER_HP_MAX*.1));assert.equal(result.protagonistRevived,g.PLAYER_HP_CURRENT);assert.equal(r.playPhase(),'FREE');assert.equal(r.actionReason('TITLE'),'');assert(!r.s.defeatPenalty);
 const old=fresh('ROUTE_TRAVELER','MAP_MOND_PLAINS',R0,DB0);join(old,['MOND_AMBER']);for(const a of battle(old).actors){if(a.source==='PLAYER_CUSTOM')a.hp=0;if(a.side==='ENEMY')a.hp=0;}old.autoUntilPlayer();
 return {hp:g.PLAYER_HP_CURRENT+'/'+g.PLAYER_HP_MAX,phase:r.playPhase(),phaseWithoutFix:old.playPhase()};});

test('a defeat costs 10% of Mora and locks actions for 60 real seconds',()=>{const r=fresh('ROUTE_TRAVELER','MAP_MOND_PLAINS');r.s.global.MORA=1234;lose(r);
 const g=r.s.global,p=r.s.defeatPenalty,result=JSON.parse(g.LAST_BATTLE_RESULT_JSON);assert.equal(g.MORA,1111);assert.deepEqual(L(p),{version:1,battle:result.id,mora:123,until:clock+60000,story:false});assert.deepEqual(L(result.defeatPenalty),{mora:123,seconds:60});assert.deepEqual(L(r.s.log.findLast(x=>x?.id===result.id).defeatPenalty),{mora:123,seconds:60});
 assert.match(r.actionReason('RECOVER'),/60초 남음/);assert.throws(()=>r.action('RECOVER'),/정신을 차리는 중/);assert.equal(r.actionReason('MENU',{screen:'SYSTEM'}),'');
 clock+=45000;assert.match(r.actionReason('RECOVER'),/15초 남음/);
 const saved=new R(DB,JSON.parse(r.serialize()));assert.equal(saved.defeatLockRemaining(),15000);
 clock+=15001;assert.equal(r.actionReason('RECOVER'),'');r.action('RECOVER');const after=r.s.global;assert(!r.s.defeatPenalty);assert.equal(r.playPhase(),'FREE');assert.equal(after.PLAYER_HP_CURRENT,after.PLAYER_HP_MAX);assert.equal(after.MORA,1111);
 const poor=fresh('ROUTE_TRAVELER','MAP_MOND_PLAINS');poor.s.global.MORA=9;lose(poor);assert.equal(poor.s.global.MORA,9);assert.equal(poor.s.defeatPenalty.mora,0);clock+=60001;
 return {mora:'1234 -> 1111',lockSeconds:60,afterReload:'15초 남음 유지'};});
test('retrying a story battle keeps the Mora lost to the defeat',()=>{const r=fresh('ROUTE_TRAVELER','MAP_MOND_PLAINS');r.s.global.MORA=5000;const group=r.rows('33_ENCOUNTER_GROUP_DB').find(x=>/EG_/.test(x[0]))[0];
 r.startBattle(group,'STORY:TEST',{confirmed:true});const b=r.s.runtime;if(b.opening)r.action('COMBAT_BEGIN',{battle:b.id});for(const a of r.s.runtime.actors)if(a.side==='ALLY')a.hp=0;r.autoUntilPlayer();
 assert.equal(r.s.defeatPenalty.story,true);assert.equal(r.s.global.MORA,4500);r.s.storyRecovery??={node:'TEST',map:'MAP_MOND_PLAINS',group};
 assert.match(r.actionReason('STORY_RETRY'),/초 남음/);clock+=60001;assert.equal(r.actionReason('STORY_RETRY'),'');const out=r.action('STORY_RETRY');
 assert.equal(r.s.global.MORA,4500);assert(!r.s.defeatPenalty);assert.equal(r.s.global.SCREEN_MODE,'COMBAT_PREP');return {checkpointMora:5000,afterRetry:r.s.global.MORA,result:L(out.defeatPenalty||out.result?.defeatPenalty||null)};});
test('damaged or invalid defeat records are refused on load',()=>{const r=fresh('ROUTE_TRAVELER','MAP_MOND_PLAINS');lose(r);const s=JSON.parse(r.serialize());
 for(const bad of [{...s.defeatPenalty,version:2},{...s.defeatPenalty,mora:-1},{...s.defeatPenalty,until:'soon'},{...s.defeatPenalty,story:'no'}])assert.throws(()=>new R(DB,{...s,defeatPenalty:bad}),/패배 기록/);clock+=60001;return {rejected:4};});

test('enemies spread their first target instead of always hitting the weakest ally',()=>{
 const spread=(Runtime,db)=>{const r=fresh('ROUTE_TRAVELER','MAP_MOND_PLAINS',Runtime,db);join(r,['MOND_AMBER','MOND_KAEYA','MOND_LISA']);const b=battle(r),allies=b.actors.filter(a=>a.side==='ALLY'),enemy=b.actors.find(a=>a.side==='ENEMY'),hits={};
  for(let n=0;n<40;n++){for(const a of allies)a.hp=a.maxHp;enemy.hp=enemy.maxHp;r.aiTurn(enemy,allies.slice().sort((x,y)=>x.hp-y.hp||x.id.localeCompare(y.id)));for(const a of allies)if(a.hp<a.maxHp)hits[a.source]=(hits[a.source]||0)+1;}return hits;};
 const now=spread(R,DB),before=spread(R0,DB0),counts=Object.values(now),total=counts.reduce((a,b)=>a+b,0);
 assert.equal(Object.keys(now).length,4,JSON.stringify(now));assert(Math.max(...counts)/total<=.45,JSON.stringify(now));return {withFix:now,withoutFix:before};});
test('taunts still decide the target',()=>{const r=fresh('ROUTE_TRAVELER','MAP_MOND_PLAINS');join(r,['MOND_AMBER']);const b=battle(r),enemy=b.actors.find(a=>a.side==='ENEMY'),allies=b.actors.filter(a=>a.side==='ALLY');
 enemy.statuses=[...(enemy.statuses||[]),{id:'STATUS_TAUNT',turns:2}];delete enemy.lastTargetId;r.aiTurn(enemy,allies);assert.equal(enemy.lastTargetId,undefined);return {skippedSpread:true};});

test('leaving the party takes that companion\'s gear back to the bag',()=>{const r=fresh();const own={MOND_AMBER:{state:'JOINED'},MOND_KAEYA:{state:'JOINED'}};r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);r.action('PARTY',{char:'MOND_AMBER',slot:2});
 const hood=r.giveEquipment('EQ_CRPG_PADDED_VEST'),charm=r.giveEquipment('EQ_CRPG_WOODEN_CHARM');r.action('EQUIP',{slot:hood,owner:'MOND_AMBER'});r.action('EQUIP',{slot:charm,owner:'MOND_AMBER'});
 const worn=id=>L(r.s.inventory.filter(i=>i.equip&&i.equipped&&i.owner===id).map(i=>i.equip).sort());assert.deepEqual(worn('MOND_AMBER'),['EQ_CRPG_PADDED_VEST','EQ_CRPG_WOODEN_CHARM']);
 r.action('PARTY_REPLACE',{char:'MOND_KAEYA',slot:2});assert.deepEqual(worn('MOND_AMBER'),[]);assert(r.s.inventory.find(i=>i.slot===hood));
 r.action('EQUIP',{slot:hood,owner:'MOND_KAEYA'});r.action('PARTY_REMOVE',{slot:2});assert.deepEqual(worn('MOND_KAEYA'),[]);assert.equal(r.s.party.filter(p=>p.active).length,1);return {replaced:'엠버 → 케이아',removed:'케이아'};});

test('player-facing wording for the hood and the field pack',()=>{const r=fresh(),head=r.db['16_EQUIP_DB'][0],col=n=>head.indexOf(n);
 const hood=r.row('16_EQUIP_DB','EQ_CRPG_PADDED_VEST'),pack=r.row('16_EQUIP_DB','EQ_SPECIAL_FIELD_PACK');assert.equal(hood[col('장비명')],'누빔 두건');assert.equal(hood[2],'방어구');assert.match(hood[col('비고')],/두건/);
 assert.equal(r.row('19_SHOP_STOCK_DB','STK_CRPG_V011_MOND_EQUIP_EQ_CRPG_PADDED_VEST')[4],'누빔 두건');assert.match(pack[col('고유 효과')],/전투 도구가 2종에서 3종으로/);assert.equal(pack[col('기타 보조 스탯')],'전투 도구 +1종');
 assert.equal(new R(DB,JSON.parse(r.serialize())).row('16_EQUIP_DB','EQ_CRPG_PADDED_VEST')[col('장비명')],'누빔 두건');
 assert(!raw.includes('누빔 두건')&&!JSON.stringify(DB).includes('누빔 두건'),'content sheet stays untouched');return {hood:hood[col('장비명')],pack:pack[col('고유 효과')]};});

test('item icons: the reworked textures ship and match their hashes',()=>{const icons=JSON.parse(fs.readFileSync(path.join(root,'content/item-icons.json'),'utf8')).icons,sources=JSON.parse(fs.readFileSync(path.join(root,'content/item-icon-sources.json'),'utf8')).items;
 const want={EQ_ACC_VITAL_RING:'UI_EquipIcon_Catalyst_Isikhulu',EQ_CRPG_WOODEN_CHARM:'UI_ItemIcon_114037',EQ_CRPG_PADDED_VEST:'UI_RelicIcon_10013_3',TRPG_HYDRO_FIBER:'UI_ItemIcon_101247',TRPG_DRAGON_BLOOD_CRYSTAL:'UI_ItemIcon_113018',TRPG_FLAME_ALLOY:'UI_ItemIcon_107010',KEY_CRPG_GEOCULUS:'UI_ItemIcon_107003',CRPG_FRUIT_BAIT:'UI_ItemIcon_111023',MAT_AZHDAHA_ARTIFACT_CRYSTAL:'UI_ItemIcon_113017',EQ_ARTIFACT_EDGE:'UI_RelicIcon_15001_4',EQ_ARTIFACT_TIDE:'UI_RelicIcon_15016_4',EQ_ARTIFACT_GUARD:'UI_RelicIcon_15017_4',EQ_ARTIFACT_VITAL:'UI_RelicIcon_15022_4',EQ_ARTIFACT_SWIFT:'UI_RelicIcon_15002_4',EQ_ARTIFACT_BALANCE:'UI_RelicIcon_10001_4'};
 for(const[id,tex]of Object.entries(want)){const x=icons[id],file=path.join(root,x.path);assert.equal(x.path,'assets/icons/'+tex+'.webp',id);assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),x.sha256,id);assert(sources.find(s=>s.id===id)?.sha256===x.sha256,id+' source record');}
 const used=new Set(Object.values(icons).map(x=>x.path));for(const gone of ['UI_ItemIcon_113005','UI_ItemIcon_113007','UI_ItemIcon_114077'])assert(!used.has('assets/icons/'+gone+'.webp')&&!fs.existsSync(path.join(root,'assets/icons',gone+'.webp')),gone);
 const P=vm.createContext({});vm.runInContext(fs.readFileSync(path.join(root,'source/inventory_presenter.js'),'utf8'),P);const presenter=P.CRPGInventoryPresenter.create(DB,{itemIcons:JSON.parse(fs.readFileSync(path.join(root,'content/item-icons.json'),'utf8'))});
 assert.equal(presenter.itemDetail({equip:'EQ_ACC_VITAL_RING',quantity:1,enhance:0}).icon.url,'assets/icons/UI_EquipIcon_Catalyst_Isikhulu.webp');return {reworked:Object.keys(want).length};});

test('equipment screen, party notice and defeat timer are wired (source)',()=>{const read=f=>fs.readFileSync(path.join(dir,f),'utf8'),html=read('index.html'),gear=read('app_gear.js'),party=read('app_party.js'),app=read('app.js'),css=read('style.css');
 for(const f of ['app_gear.js','app_party.js','app.js','app_equipment.js','app_experience.js','app_tutorial.js','app_liyue_artifacts.js','runtime_play_fixes.js'])new vm.Script(read(f),{filename:f});
 assert(!html.includes('\\n<script'),'no stray \\n in index.html');const at=f=>html.indexOf('"'+f);assert(at('runtime_play_fixes.js')>at('runtime_liyue_encounters.js')&&at('runtime_play_fixes.js')<at('save_adapter.js'));assert(at('app_gear.js')>at('app_liyue_areas.js'));assert.equal(html.lastIndexOf('<script'),html.indexOf('<script src="app_gear.js'));
 assert(gear.includes("el('h1','','장비 장착')")&&gear.includes("spans[1].textContent='장비 장착'")&&gear.includes('gear-tip')&&gear.includes('window.openGear')&&gear.includes('dataset.defeatCountdown'));
 assert(party.includes('function confirmPartyRemoval')&&party.includes("'장비를 풀고 편성에서 빼기'")&&!party.includes('equipmentScreen('));assert(app.includes("'계속 읽기':'다음 활동 선택'"));
 assert(css.includes('.gear-cell:hover>.gear-tip')&&css.includes('.gear-effect')&&css.includes('.defeat-card'));assert(/entryAssets=.*matchAll\(.*src\|href/.test(read('sw.js')),'offline cache picks up the new scripts from index.html');
 if(runtimeDir==='source'){const build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');assert(build.includes("'runtime_play_fixes.js'")&&build.includes("'app_gear.js'"));}});

report.total=report.checks.length;report.passed=report.checks.filter(x=>x.passed).length;fs.mkdirSync(root+'/reports/play_fixes',{recursive:true});fs.writeFileSync(root+'/reports/play_fixes/runtime-tests.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({total:report.total,passed:report.passed}));if(report.total!==report.passed)process.exitCode=1;
