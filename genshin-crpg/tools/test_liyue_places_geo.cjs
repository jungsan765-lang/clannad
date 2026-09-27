'use strict';
// v0.13.45 review items 14-17: Liyue district roles, Liyue region board, Traveler Geo resonance, Geo oculus trails.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),runtimeDir=process.env.CRPG_RUNTIME_DIR||'source',dir=path.join(root,runtimeDir),DB=JSON.parse(fs.readFileSync(root+'/content/db.json','utf8'));
let clock=1790355600000;
const ctx=vm.createContext({console,Date:class extends Date{static now(){return clock;}},setTimeout,clearTimeout,TextEncoder,TextDecoder});
for(const[,f]of fs.readFileSync(dir+'/index.html','utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ?]*)\.js)(?:\?[^" ]*)?"/g))vm.runInContext(fs.readFileSync(dir+'/'+f,'utf8'),ctx,{filename:f});
const api=ctx.CRPGRuntime,R=api.Runtime,L=x=>JSON.parse(JSON.stringify(x));
const report={version:'0.13.45',runtimeDir,scope:'Liyue district roles, region board, Traveler Geo resonance, Geo oculus trails',checks:[]};
function test(n,f){try{report.checks.push({name:n,passed:true,evidence:f()||null});console.log('PASS '+n);}catch(e){report.checks.push({name:n,passed:false,error:e.stack});console.error('FAIL '+n+'\n'+e.stack);}}
let seq=0;
function fresh(route='ROUTE_TRAVELER',map='MAP_LIYUE_HARBOR',level=6){const r=new R(DB);r.newGame({name:'점검',route,seed:5100+seq,saveId:'LYP-'+(++seq)});Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:map,WORLD_TIME:'12:00',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION',MORA:99999});for(const k of ['storyJourney','storyBreak','storyArrival','storyMenuFrame','storyContext','battlePreparation','storyRecovery','liyueField'])delete r.s[k];r.s.flags.FLAG_ACCESS_REGION_LIYUE=true;while(r.s.global.PLAYER_LEVEL_STATE<level)r.addXp('PLAYER_CUSTOM',r.growth().remaining);return r;}
const eq=(a,b,m)=>assert.deepEqual(L(a),L(b),m);
const reload=r=>{const s=r.serialize(),x=new R(DB,JSON.parse(s));assert.equal(x.serialize(),s,'save round trip changed state');return x;};
const rejects=(r,type,params,pattern)=>{const before=r.serialize();assert.throws(()=>r.action(type,params),e=>!pattern||pattern.test(e.message));assert.equal(r.serialize(),before,'rejected action changed state');};
const at=(r,map)=>r.placeEntries().filter(e=>e.kind==='FACILITY').map(e=>e.id);
const CITY=['MAP_LY_DETAIL_FEIYUN','MAP_LY_DETAIL_YUJING','MAP_LY_DETAIL_CHIHU','MAP_LY_DETAIL_WHARF','MAP_LY_DETAIL_NORTH_GATE'];

// ---- 14 · districts and Wangshu Inn --------------------------------------------------------------------------------
test('every Liyue Harbor district and Wangshu Inn now lists its own places; the centre keeps guild, goods, gear and lodging',()=>{
 const r=fresh(),seen={};
 for(const map of ['MAP_LIYUE_HARBOR',...CITY,'MAP_LY_DETAIL_WANGSHU']){r.s.global.CURRENT_MAP_ID=map;seen[map]=at(r);assert(seen[map].length,'empty place list at '+map);}
 eq(seen.MAP_LIYUE_HARBOR.sort(),['EVT_CRPG_LIYUE_GUILD','EVT_SCHEDULE_MRC_BLACKSMITH_COMMON','EVT_SCHEDULE_MRC_LIYUE_EQUIP','EVT_SCHEDULE_MRC_LIYUE_GENERAL','EVT_SCHEDULE_MRC_LIYUE_INN'].sort());
 eq(seen.MAP_LY_DETAIL_FEIYUN.sort(),['EVT_CRPG_LIYUE_BUBU','EVT_CRPG_LIYUE_FEIYUN','EVT_CRPG_LIYUE_NORTHLAND'].sort());
 eq(seen.MAP_LY_DETAIL_CHIHU.sort(),['EVT_CRPG_LIYUE_HEYU','EVT_CRPG_LIYUE_WANMIN','EVT_CRPG_LIYUE_YANSHANG','EVT_SCHEDULE_SERVICE_LIYUE_COOK'].sort());
 eq(seen.MAP_LY_DETAIL_WHARF.sort(),['EVT_CRPG_LIYUE_DOCKS','EVT_SCHEDULE_SERVICE_LIYUE_SUPPLY'].sort());
 eq(seen.MAP_LY_DETAIL_NORTH_GATE.sort(),['EVT_CRPG_LIYUE_ARTISAN','EVT_CRPG_LIYUE_WANGSHENG'].sort());
 eq(seen.MAP_LY_DETAIL_YUJING,['EVT_CRPG_LIYUE_YUJING']);
 eq(seen.MAP_LY_DETAIL_WANGSHU.sort(),['EVT_CRPG_LIYUE_WANGSHU_DINING','EVT_CRPG_LIYUE_WANGSHU_INN'].sort());
 return seen;
});
test('roles are divided, not copied: each service merchant stands in exactly one Liyue place',()=>{
 const r=fresh(),counts={};
 for(const map of ['MAP_LIYUE_HARBOR',...CITY,'MAP_LY_DETAIL_WANGSHU']){r.s.global.CURRENT_MAP_ID=map;for(const e of r.placeEntries())if(e.merchant)counts[e.merchant]=(counts[e.merchant]||0)+1;}
 for(const [m,n]of Object.entries(counts))assert.equal(n,1,m+' appears in '+n+' Liyue places');
 const kitchens=[];for(const map of ['MAP_LIYUE_HARBOR',...CITY]){r.s.global.CURRENT_MAP_ID=map;for(const e of r.placeEntries())if(String(e.facility).split('/').includes('조리시설'))kitchens.push(map);}
 eq(kitchens,['MAP_LY_DETAIL_CHIHU']);
 const roles=r.liyueCityDirectory().map(d=>d.role);assert.equal(new Set(roles).size,roles.length);
 return counts;
});
test('Wanmin sells meals, the Chihu kitchen cooks and Bubu keeps the full alchemy counter',()=>{
 const r=fresh('ROUTE_TRAVELER','MAP_LY_DETAIL_CHIHU');
 r.action('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_WANMIN',mode:'SHOP'});const menu=r.placeStocks().map(s=>s.row[3]);assert(menu.includes('FOOD_MATSUTAKE_ROLL')&&menu.includes('FOOD_JADE_PARCELS'));
 r.action('BUY',{stock:'STK_LY_WANMIN_MATSUTAKE',quantity:2});assert.equal(r.itemCount('FOOD_MATSUTAKE_ROLL'),2);r.action('PLACE_LEAVE');
 r.action('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_LIYUE_COOK',mode:'CRAFT'});const cooking=r.placeRecipes().length;assert(cooking>=30);r.action('PLACE_LEAVE');
 r.s.global.CURRENT_MAP_ID='MAP_LY_DETAIL_FEIYUN';r.action('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_BUBU',mode:'SHOP'});r.action('BUY',{stock:'STK_ALCH_MED_001',quantity:1});assert.equal(r.itemCount('TRPG_HEALING_POTION'),1);
 r.action('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_BUBU',mode:'CRAFT'});const alchemy=r.placeRecipes().map(x=>x.row[0]).sort();
 eq(alchemy,['REC_ALCH_HEALING_POTION','REC_MEDICAL_MEDKIT','REC_SPECIAL_LENS','REC_TACTICAL_ELEMENT_CONVERTER']);
 r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';r.s.placeVisit=null;assert(r.placeEntries().some(e=>e.id==='EVT_SCHEDULE_MRC_ALCHEMY_COMMON'),'other cities keep the shared alchemy counter');
 return {menu,cooking,alchemy};
});
test('Wangshu Inn rests the party for 150 Mora and its dining room serves meals',()=>{
 const r=fresh('ROUTE_TRAVELER','MAP_LY_DETAIL_WANGSHU');r.s.global.PLAYER_HP_CURRENT=1;const mora=r.s.global.MORA;
 r.action('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_WANGSHU_INN'});r.action('BUY',{stock:'STK_INN_LIYUE_WANGSHU',quantity:1});
 assert.equal(r.s.global.PLAYER_HP_CURRENT,r.s.global.PLAYER_HP_MAX);assert.equal(mora-r.s.global.MORA,150);assert.equal(r.s.global.WORLD_TIME,'20:00');
 r.s.global.WORLD_TIME='12:00';r.action('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_WANGSHU_DINING'});r.action('BUY',{stock:'STK_LY_WANGSHU_ADEPTUS',quantity:1});assert.equal(r.itemCount('FOOD_ADEPTUS_TEMPTATION'),1);
 rejects(r,'BUY',{stock:'STK_LY_WANGSHU_ADEPTUS',quantity:1});
 return {rested:true};
});
test('introductions stand in their district: Xiangling at Wanmin only, Zhongli at Wangsheng, Xiao also at Wangshu Inn',()=>{
 const r=fresh(),d=ch=>[...r.storyIndex().legends.values()].find(x=>x.ROUTE_SCOPE==='ROUTE_TRAVELER'&&x.CHAR_ID===ch),places=ch=>r.legendIntroductionPlaces(d(ch)).map(p=>p.id+'@'+p.maps.join('+'));
 eq(places('LIYUE_XIANGLING'),['EVT_CRPG_LIYUE_WANMIN@MAP_LY_DETAIL_CHIHU']);
 eq(places('LIYUE_ZHONGLI'),['EVT_CRPG_LIYUE_WANGSHENG@MAP_LY_DETAIL_NORTH_GATE']);
 eq(places('LIYUE_XIAO').sort(),['EVT_CRPG_LIYUE_JUEYUN_CONTACT@MAP_LIYUE_JUEYUN','EVT_CRPG_LIYUE_WANGSHU_INN@MAP_LY_DETAIL_WANGSHU']);
 eq(places('LIYUE_KEQING'),['EVT_CRPG_LIYUE_YUJING@MAP_LY_DETAIL_YUJING']);
 eq(places('LIYUE_QIQI'),['EVT_CRPG_LIYUE_BUBU@MAP_LY_DETAIL_FEIYUN']);
 r.s.global.CURRENT_MAP_ID='MAP_LY_DETAIL_WANGSHU';r.action('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_WANGSHU_INN'});
 assert(r.legendContactEntries().some(e=>e.definition.CHAR_ID==='LIYUE_XIAO'));assert(!r.legendContactEntries().some(e=>e.definition.CHAR_ID==='LIYUE_XIANGLING'));
 return {xiangling:places('LIYUE_XIANGLING'),xiao:places('LIYUE_XIAO')};
});
test('the Isekai harbor restriction covers the districts exactly like the centre',()=>{
 const r=fresh('ROUTE_ISEKAI','MAP_LY_DETAIL_CHIHU');r.ensureLiyue();r.s.liyue.activeQuest='Q_ISK_LIYUE_02';delete r.s.liyue.harborAccessReceipt;
 assert.match(r.actionReason('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_LIYUE_COOK',mode:'CRAFT'}),/허가된 본편 구역/);
 r.s.global.CURRENT_MAP_ID='MAP_LIYUE_HARBOR';assert.match(r.actionReason('PLACE_ENTER',{place:'EVT_SCHEDULE_MRC_LIYUE_INN',mode:'SHOP'}),/허가된 본편 구역/);
 r.noteLiyueHarborAccess('TEST');r.s.global.CURRENT_MAP_ID='MAP_LY_DETAIL_CHIHU';assert.equal(r.actionReason('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_LIYUE_COOK',mode:'CRAFT'}),'');
 // Between chapters an introduction place may be visited even before the harbor opens; other facilities may not.
 delete r.s.liyue.harborAccessReceipt;r.s.liyue.activeQuest='Q_ISK_LIYUE_01';Object.assign(r.questState('Q_ISK_LIYUE_01'),{state:'완료',claimed:true,completedTurn:0,acceptedTurn:0});
 assert.equal(r.actionReason('PLACE_ENTER',{place:'EVT_CRPG_LIYUE_HEYU',mode:'TALK'}),'');
 assert.match(r.actionReason('PLACE_ENTER',{place:'EVT_SCHEDULE_SERVICE_LIYUE_COOK',mode:'CRAFT'}),/허가된 본편 구역/);
 return {ok:true};
});
test('saves made inside the old centre facilities load and simply leave the moved place',()=>{
 const r=fresh();const s=L(JSON.parse(r.serialize())),g=s.global;
 const visit=(place,mode,entity,merchant)=>({schema:1,place,kind:'FACILITY',mode,map:'MAP_LIYUE_HARBOR',entity,merchant,saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,enteredDay:g.WORLD_DAY,enteredTime:'12:00',enteredAction:g.SAVE_ID+':1'});
 const cases=[visit('EVT_CRPG_LIYUE_WANMIN','TALK',null,null),visit('EVT_CRPG_LIYUE_BUBU','TALK',null,null),visit('EVT_SCHEDULE_MRC_ALCHEMY_COMMON','SHOP','SERVICE_ALCHEMY_COMMON','MRC_ALCHEMY_COMMON'),visit('EVT_SCHEDULE_SERVICE_LIYUE_COOK','CRAFT','SERVICE_LIYUE_COOK',null),visit('EVT_CRPG_LIYUE_DOCKS','TALK',null,null)];
 for(const v of cases){const x=L(s);x.placeVisit=v;x.global.SCREEN_MODE=v.mode==='TALK'?'DIALOGUE':v.mode;const loaded=new R(DB,x);assert.equal(loaded.s.placeVisit,null,v.place);assert.equal(loaded.s.global.SCREEN_MODE,'LOCATION');}
 return {cases:cases.map(v=>v.place)};
});

// ---- 15 · Liyue region board ---------------------------------------------------------------------------------------
test('every Liyue encounter map has a board built from its live pools',()=>{
 const r=fresh(),maps=r.rows('32_MAP_DB').filter(m=>m[1]==='리월'&&m[8]==='Y'&&m[12]!=='Y').map(m=>m[0]);assert.equal(maps.length,23);
 for(const map of maps){r.s.global.CURRENT_MAP_ID=map;const g=r.liyueRegionGuide(),pool=r.rows('34_MAP_ENCOUNTER_POOL').filter(x=>x[1]===map);
  assert(g&&g.label&&g.entries.length===pool.length,map);assert.equal(g.entries.reduce((n,e)=>n+e.weight,0),100);
  for(const e of g.entries){const row=pool.find(x=>x[5]===e.group);assert(row,'group '+e.group);assert.equal(Number(row[4])-Number(row[3])+1,e.weight);}
  assert(g.rewards.drops.length>0);assert.equal(g.encounterChance,Number(r.row('32_MAP_DB',map)[9]));}
 return {maps:maps.length};
});
test('board reward ranges contain what a real battle pays on that map',()=>{
 const out=[];
 for(const [map,level] of [['MAP_LY_DETAIL_DIHUA',5],['MAP_LY_DETAIL_HULAO',7],['MAP_CHASM_DEEP',11]]){
  const r=fresh('ROUTE_TRAVELER',map,level);r.s.party.forEach(p=>p.active=p.type==='PLAYER');r.recalculate();
  const g=r.liyueRegionGuide();
  for(const e of g.entries){const x=new R(DB,JSON.parse(r.serialize()));x.startBattle(e.group,'RANDOM');const b=x.s.runtime;for(const a of b.actors.filter(a=>a.side==='ENEMY'))a.hp=0;const res=x.finishBattle(true),receipt=x.s.combatReceipts[res.battleId||res.id];
   assert(receipt.xp>=e.xp[0]&&receipt.xp<=e.xp[1],map+' '+e.group+' xp '+receipt.xp+' not in '+e.xp);assert(receipt.mora>=e.mora[0]&&receipt.mora<=e.mora[1],map+' '+e.group+' mora '+receipt.mora+' not in '+e.mora);
   for(const id of Object.keys(receipt.loot||{}))assert(g.rewards.drops.some(d=>d.id===id)||/BOSS_ESSENCE/.test(id),'unlisted drop '+id);
   out.push({map,group:e.group,xp:receipt.xp,range:e.xp,mora:receipt.mora});}
 }
 return out;
});
test('low-level warning, over-level tier chances and the local field boss are shown',()=>{
 const low=fresh('ROUTE_TRAVELER','MAP_CHASM_DEEP',1),g1=low.liyueRegionGuide();assert(g1.underLevel);assert.equal(g1.label,'최고 위험');
 const high=fresh('ROUTE_TRAVELER','MAP_LY_DETAIL_DIHUA',12),g2=high.liyueRegionGuide(),base=fresh('ROUTE_TRAVELER','MAP_LY_DETAIL_DIHUA',5).liyueRegionGuide();
 assert(g2.overLevel);assert(g2.tiers.enhanced>base.tiers.enhanced);assert.equal(g2.enemyLevels[1],6);
 assert.equal(base.boss.name,'물의 정령');assert.equal(fresh('ROUTE_TRAVELER','MAP_LY_DETAIL_HULAO').liyueRegionGuide().boss,null);
 return {low:g1.label,tiers:[base.tiers,g2.tiers]};
});

// ---- 16 · Traveler Geo resonance ------------------------------------------------------------------------------------
const trv=(map='MAP_LIYUE_PLAINS')=>{const r=fresh('ROUTE_TRAVELER',map);r.s.flags.FLAG_TRV_ANEMO_UNLOCKED=true;r.migrateProtagonist(r.s);return r;};
test('Geo resonance at the Liyue statue swaps the Traveler E/Q and is saved',()=>{
 const r=trv();assert.match(r.actionReason('TRAVELER_RESONATE',{element:'GEO'}),/신상 앞/);
 r.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_GEO'});r.action('TRAVELER_RESONATE',{element:'GEO'});
 eq(r.protagonistAllowedIds(),['PLAYER_TRAVELER_GEO_E','PLAYER_TRAVELER_GEO_Q']);
 const cards=r.s.global.PLAYER_SKILL_CARD_IDS.split(';');assert(cards.includes('PLAYER_TRAVELER_GEO_E')&&!cards.includes('PLAYER_TRAVELER_ANEMO_E'));
 rejects(r,'TRAVELER_RESONATE',{element:'GEO'},/이미/);const x=reload(r);assert.equal(x.travelerElement(),'GEO');
 return {cards};
});
test('the Mond statue switches back to Anemo and Liyue switches again without a second receipt',()=>{
 const r=trv();r.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_GEO'});r.action('TRAVELER_RESONATE',{element:'GEO'});const receipt=L(r.s.travelerElements.receipts.GEO);r.action('PLACE_LEAVE');
 r.s.global.CURRENT_MAP_ID='MAP_MOND_CITY';rejects(r,'TRAVELER_RESONATE',{element:'GEO'});r.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_ANEMO'});r.action('TRAVELER_RESONATE',{element:'ANEMO'});
 eq(r.protagonistAllowedIds(),['PLAYER_TRAVELER_ANEMO_E','PLAYER_TRAVELER_ANEMO_Q']);assert(!r.s.global.PLAYER_SKILL_CARD_IDS.includes('GEO'));
 r.action('PLACE_LEAVE');r.s.global.CURRENT_MAP_ID='MAP_LIYUE_PLAINS';r.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_GEO'});r.action('TRAVELER_RESONATE',{element:'GEO'});
 eq(r.s.travelerElements.receipts.GEO,receipt);eq(r.s.travelerElements.unlocked,['ANEMO','GEO']);reload(r);
 return {unlocked:r.s.travelerElements.unlocked};
});
test('Isekai protagonist and a Traveler without Anemo cannot resonate; Isekai skills stay separate',()=>{
 const i=fresh('ROUTE_ISEKAI','MAP_LIYUE_PLAINS');i.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_GEO'});rejects(i,'TRAVELER_RESONATE',{element:'GEO'},/이세계인/);
 eq(i.protagonistAllowedIds(),['PLAYER_ISEKAI_E','PLAYER_ISEKAI_Q']);assert(!i.s.global.PLAYER_SKILL_CARD_IDS.includes('GEO'));
 const t=fresh('ROUTE_TRAVELER','MAP_LIYUE_PLAINS');t.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_GEO'});rejects(t,'TRAVELER_RESONATE',{element:'GEO'},/바람 신상/);
 return {isekai:i.protagonistAllowedIds()};
});
test('Starfell Sword and Wake of Earth fight with Geo damage, a meteor shield and cooldowns',()=>{
 const r=trv();r.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_GEO'});r.action('TRAVELER_RESONATE',{element:'GEO'});r.action('PLACE_LEAVE');r.s.party.forEach(p=>p.active=p.type==='PLAYER');
 r.startBattle('EG_LIYUE_LOCAL_LIYUE_PLAINS_1','RANDOM');const b=r.s.runtime,me=b.actors.find(a=>a.source==='PLAYER_CUSTOM');
 const cards=r.combatCards().filter(c=>c.protagonistKind==='GEO');eq(cards.map(c=>c.key),['E','Q']);
 const enemy=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0),hp=enemy.hp;r.executeCard(me,r.cardDefinition(r.row('08_SKILL_CARD_DB','PLAYER_TRAVELER_GEO_E')),enemy.id);
 assert(enemy.hp<hp);assert(b.log.some(l=>l.element==='바위'&&l.card==='PLAYER_TRAVELER_GEO_E'));assert.equal(me.shields.find(s=>s.source==='TRAVELER_GEO_METEOR').value,Math.round(me.maxHp*.12));assert.equal(me.cooldowns.PLAYER_TRAVELER_GEO_E,3);
 for(const e of b.actors.filter(a=>a.side==='ENEMY'))e.hp=Math.max(e.hp,1);const target=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0);r.executeCard(me,r.cardDefinition(r.row('08_SKILL_CARD_DB','PLAYER_TRAVELER_GEO_Q')),target.id);
 assert.equal(b.log.filter(l=>l.card==='PLAYER_TRAVELER_GEO_Q'&&l.element==='바위').length>=1,true);assert.equal(me.cooldowns.PLAYER_TRAVELER_GEO_Q,4);
 assert.equal(r.protagonistCombatView().kind,'GEO');
 return {log:b.log.filter(l=>/GEO/.test(l.card||'')).length};
});
test('tampered element records are rejected on load',()=>{
 const r=trv();r.action('PLACE_ENTER',{place:'EVT_CRPG_STATUE_GEO'});r.action('TRAVELER_RESONATE',{element:'GEO'});const good=JSON.parse(r.serialize());
 for(const [name,edit] of [['active not unlocked',s=>{s.travelerElements.unlocked=['ANEMO'];}],['receipt elsewhere',s=>{s.travelerElements.receipts.GEO.place='EVT_CRPG_STATUE_ANEMO';}],['future day',s=>{s.travelerElements.receipts.GEO.day=s.global.WORLD_DAY+1;}],['unknown element',s=>{s.travelerElements.unlocked.push('PYRO');}],['isekai route',s=>{s.global.STORY_ROUTE_ID='ROUTE_ISEKAI';}]]){
  const s=L(good);edit(s);assert.throws(()=>new R(DB,s),e=>/TRAVELER_ELEMENT_SAVE|ROUTE|저장|기록/.test(e.code+e.message),name);}
 const old=fresh();old.s.flags.FLAG_TRV_ANEMO_UNLOCKED=true;old.migrateProtagonist(old.s);const x=reload(old);assert.equal(x.travelerElement(),'ANEMO');assert(x.s.global.PLAYER_SKILL_CARD_IDS.includes('PLAYER_TRAVELER_ANEMO_E'));
 return {ok:true};
});

// ---- 17 · Geo oculus trails ------------------------------------------------------------------------------------------
const T=api.geoTrails;
test('eleven clues are investigated at their detail place; the old region map points there',()=>{
 const r=fresh();assert.equal(Object.keys(T.sites).length,11);
 for(const [id,site] of Object.entries(T.sites)){const p=r.oculusPoint(id);r.s.global.CURRENT_MAP_ID=p.map;r.s.placeVisit=null;assert.match(r.worldRequirement(p),/단서는 .+에 있습니다/,id);assert(!r.oculusEntries().some(x=>x.id===id));
  r.s.global.CURRENT_MAP_ID=site;assert(r.oculusEntries().some(x=>x.id===id),id+' missing at '+site);assert.doesNotMatch(r.worldRequirement(p),/단서는|단서가 있는 장소/);}
 return T.sites;
});
test('a clue found at its detail place keeps the original record format',()=>{
 const r=fresh('ROUTE_TRAVELER','MAP_LY_DETAIL_WHARF'),id='GEO_HARBOR_CRATES';
 for(let i=0;i<4&&!r.s.geoOculi.receipts[id];i++){r.action('WORLD_WORK_START',{kind:'OCULUS',point:id});if(r.s.worldJob){const j=L(r.s.worldJob);clock+=j.duration+5;r.action('WORLD_WORK_FINISH',{job:j.id});}}
 const receipt=r.s.geoOculi.receipts[id];assert.equal(receipt.map,'MAP_LIYUE_HARBOR');assert.equal(r.itemCount('KEY_CRPG_GEOCULUS'),1);reload(r);
 return receipt;
});
test('an investigation already running at the old spot can still finish there',()=>{
 const r=fresh('ROUTE_TRAVELER','MAP_LIYUE_HARBOR'),p=r.oculusPoint('GEO_HARBOR_CRATES'),s=JSON.parse(r.serialize()),g=s.global;
 s.worldJob={kind:'OCULUS',point:p.id,stage:p.steps[0].id,label:p.steps[0].label,duration:p.steps[0].duration,map:'MAP_LIYUE_HARBOR',startedAt:clock-10,id:g.SAVE_ID+':W'+g.LAST_COMMITTED_ACTION_SEQ};
 const x=new R(DB,s);clock+=p.steps[0].duration+5;x.action('WORLD_WORK_FINISH',{job:s.worldJob.id});assert.equal(x.oculusProgress(p.id),1);
 assert.match(x.worldRequirement(p),/리월항 · 부두/);
 return {progress:x.oculusProgress(p.id)};
});
test('the collected 16-oculus fixture loads unchanged, zone goals can be claimed once, and Zhongli still needs all 16',()=>{
 const fixture=JSON.parse(fs.readFileSync(root+'/tests/fixtures/geo-collected-v013.json','utf8')),r=new R(DB,L(fixture));
 const view=r.geoTrailView();assert.equal(view.collected,16);eq(view.zones.map(z=>[z.id,z.collected,z.total]),[['HARBOR',5,5],['BISHUI',6,6],['MINLIN',5,5]]);
 const receipts=L(r.s.geoOculi.receipts);Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',STORY_MENU_POLICY:''});
 const mora=r.s.global.MORA;for(const z of view.zones)r.action('GEO_TRAIL_CLAIM',{zone:z.id});assert.equal(r.s.global.MORA-mora,700);
 rejects(r,'GEO_TRAIL_CLAIM',{zone:'HARBOR'},/이미/);eq(L(r.s.geoOculi.receipts),receipts);const x=reload(r);assert.equal(Object.keys(x.s.geoTrail.claims).length,3);
 const partial=L(fixture);delete partial.geoOculi.receipts.GEO_JUEYUN_TRAIL;partial.geoOculi.progress.GEO_JUEYUN_TRAIL=0;partial.inventory.find(i=>i.item==='KEY_CRPG_GEOCULUS').quantity-=1;
 const p=new R(DB,partial);Object.assign(p.s.global,{CURRENT_MAP_ID:'MAP_LIYUE_JUEYUN'});p.s.placeVisit=null;assert.match(p.geoOfferReason('GEO_TIER_1'),/전량 수집 필요 · 15 \/ 16/);
 assert.match(p.geoTrailClaimReason('MINLIN'),/4 \/ 5/);
 const forged=JSON.parse(p.serialize());forged.geoTrail={version:1,route:forged.global.STORY_ROUTE_ID,claims:{MINLIN:{day:1,turn:1,action:forged.global.SAVE_ID+':1'}}};assert.throws(()=>new R(DB,forged),/중간 목표/);
 return {claimed:Object.keys(x.s.geoTrail.claims)};
});
report.total=report.checks.length;report.passed=report.checks.filter(x=>x.passed).length;
fs.mkdirSync(root+'/reports/liyue_places_geo',{recursive:true});fs.writeFileSync(root+'/reports/liyue_places_geo/runtime-tests.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({total:report.total,passed:report.passed}));if(report.total!==report.passed)process.exitCode=1;
