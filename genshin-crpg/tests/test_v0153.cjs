'use strict';
// 0.15.3: starter kit (user: 「튜토리얼 하면서 장비같은것도 좀 나눠주고 그렇게 해」) and early story fights (user: 「전 컨텐츠
// 한번씩 해보면서 뭔가 막히는게 있나? 싶은게 있으면 해결하면 돼」). Runtime rules in a node VM, same code as the game.
const assert=require('node:assert/strict'),path=require('path');
const {R,db,c,fs,root,fresh}=require('./helpers_v011.cjs');
const api=c.CRPGRuntime,results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const copy=x=>JSON.parse(JSON.stringify(x));
const gear=r=>r.s.inventory.filter(i=>i.equip).map(i=>({equip:i.equip,equipped:!!i.equipped,owner:i.owner}));
const join=(r,id)=>{r.adminApply({op:'recruit',char:id});r.action('MENU',{screen:'STATUS'});};
const fight=r=>{for(let i=0;i<600&&r.s.runtime;i++){const b=r.s.runtime;if(b.opening?.state==='PENDING'){r.action('COMBAT_BEGIN');continue;}if(b.interlude){const n=r.storyNode(),cs=r.storyChoices();if(cs.length)r.action('STORY_CHOICE',{node:cs[0][4]});else r.action('STORY_NEXT',{node:n[4]});continue;}for(const a of b.actors)if(a.side==='ALLY')a.control='AI';r.autoUntilPlayer();}return JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}');};

check('a new journey starts with the Traveler\'s Handy Sword and a travel coat in the bag, two of each dish, and the equipment guide',()=>{
 const out={};
 for(const route of ['ROUTE_TRAVELER','ROUTE_ISEKAI']){
  const r=new R(db);r.newGame({name:'새벽하늘',route,seed:7,saveId:'KIT-'+route});
  assert.deepEqual(copy(gear(r)),[{equip:'EQ_SWORD_TRAVELER',equipped:false,owner:'공용'},{equip:'EQ_ARMOR_TRAVEL_COAT',equipped:false,owner:'공용'}]);
  assert.equal(r.itemCount('FOOD_SWEET_MADAME'),2);assert.equal(r.itemCount('FOOD_HASH_BROWN'),2);
  assert.equal(r.s.equipmentGuide.pendingAcquired?.equip,'EQ_SWORD_TRAVELER','the 「장비를 얻었습니다」 guide points at the sword');
  assert.equal(r.s.starterKit.player,true);out[route]=r.s.global.MORA;
 }
 return out;
});
check('a companion who joins brings one plain weapon of their kind, once; leaving and rejoining brings nothing new',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_TRAVELER');
 for(const id of ['MOND_AMBER','MOND_KAEYA','MOND_LISA','MOND_NOELLE','MOND_MIKA'])join(r,id);
 assert.deepEqual(copy(r.s.starterKit.companions),{MOND_AMBER:'EQ_BOW_SLINGSHOT',MOND_KAEYA:'EQ_SWORD_HARBINGER',MOND_LISA:'EQ_CATALYST_MAGIC_GUIDE',MOND_NOELLE:'EQ_CLAYMORE_DEBATE',MOND_MIKA:'EQ_POLEARM_WHITE_TASSEL'});
 r.storySetCompanion('MOND_AMBER','DEPARTED');r.action('MENU',{screen:'STATUS'});r.storySetCompanion('MOND_AMBER','JOINED');r.action('MENU',{screen:'STATUS'});
 assert.equal(r.s.inventory.filter(i=>i.equip==='EQ_BOW_SLINGSHOT').length,1,'one bow only');
 r.adminApply({op:'recruit',char:'LIYUE_XIANGLING'});assert.equal(r.s.starterKit.companions.LIYUE_XIANGLING,'EQ_POLEARM_WHITE_TASSEL','unlockCharacter path too');
 return copy(r.s.starterKit.companions);
});
check('gifts are put on once: when the owner first stands in the active party or a battle starts; taking them off is respected',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_TRAVELER');join(r,'MOND_AMBER');
 const bow=()=>r.s.inventory.find(i=>i.equip==='EQ_BOW_SLINGSHOT');assert.equal(bow().equipped,false,'waits in the bag while Amber is not in the party');
 const atk0=r.character('MOND_AMBER').atk;r.action('PARTY',{char:'MOND_AMBER',slot:2});
 assert.equal(bow().equipped,true);assert.equal(bow().owner,'MOND_AMBER');assert(r.character('MOND_AMBER').atk>atk0,'the bow counts');
 r.action('UNEQUIP',{slot:bow().slot});assert.equal(bow().equipped,false);
 join(r,'MOND_KAEYA');r.action('PARTY',{char:'MOND_KAEYA',slot:3});assert.equal(bow().equipped,false,'not put on again');
 assert.equal(r.s.inventory.find(i=>i.equip==='EQ_SWORD_HARBINGER').owner,'MOND_KAEYA','Kaeya puts his own on when he enters');
 const sword=()=>r.s.inventory.find(i=>i.equip==='EQ_SWORD_TRAVELER');assert.equal(sword().equipped,false);
 r.startBattle('EG_MOND_HILI_PATROL','EXPLICIT');assert.equal(sword().equipped,true,'the protagonist does not fight bare-handed');
 assert.equal(r.s.inventory.find(i=>i.equip==='EQ_ARMOR_TRAVEL_COAT').equipped,true);
 return {amberAtk:[atk0,r.character('MOND_AMBER').atk]};
});
check('starter gear is bound to the journey; dishes stay tradeable; journeys started before 0.15.3 get nothing',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_TRAVELER');
 assert.deepEqual(copy(r.tradeRule(r.s.inventory.find(i=>i.equip==='EQ_SWORD_TRAVELER'))),{ok:false,reason:'처음 받은 기본 장비는 교환할 수 없습니다.'});
 assert.equal(r.tradeRule({item:'FOOD_SWEET_MADAME'}).ok,true);
 const slot=r.giveEquipment('EQ_BOW_SLINGSHOT');assert.equal(r.tradeRule(r.s.inventory.find(i=>i.slot===slot)).ok,true,'the same bow bought elsewhere trades');
 const legacy=new R(db,(()=>{const s=JSON.parse(r.serialize());delete s.starterKit;return s;})());join(legacy,'MOND_AMBER');
 assert.equal(legacy.s.starterKit,undefined);assert(!legacy.s.inventory.some(i=>i.equip==='EQ_BOW_SLINGSHOT'&&i.slot!==slot),'no gift for an old journey');
});
check('save validation rejects a malformed starter kit record',()=>{
 const r=fresh('MAP_MOND_CITY','ROUTE_TRAVELER'),good=JSON.parse(r.serialize());new R(db,copy(good));
 for(const bad of [s=>{s.starterKit.version=2;},s=>{s.starterKit.companions.NOBODY='EQ_BOW_SLINGSHOT';},s=>{s.starterKit.companions.MOND_AMBER='EQ_NOPE';},s=>{s.starterKit.worn={MOND_AMBER:'yes'};},s=>{s.starterKit.slots='EQI_1';}]){
  const s=copy(good);bad(s);assert.throws(()=>new R(db,s),/시작 장비 기록이 올바르지 않습니다/);
 }
});
check('story hilichurl patrols keep the authored count and fixed regional stats for solo and party',()=>{const out=[];for(const withAmber of [false,true])for(const origin of ['STORY:TEST_PATROL','EXPLICIT']){const r=fresh('MAP_MOND_PLAINS','ROUTE_ISEKAI');if(withAmber){join(r,'MOND_AMBER');r.action('PARTY',{char:'MOND_AMBER',slot:2});}r.s.global.PRNG_STATE=77;r.startBattle('EG_MOND_HILI_PATROL',origin,{confirmed:true,companions:withAmber?['MOND_AMBER']:[]});out.push(copy(r.s.runtime.actors.filter(a=>a.side==='ENEMY').map(a=>[a.source,a.level,a.maxHp,a.atk])));}for(const row of out)assert.deepEqual(row,out[0]);return out[0];});
check('the 이세계 route\'s first story fight is won at Lv.1 by the AI-played party on both opening branches',()=>{
 const out=[];
 for(const [branch,pick] of [['K','ISK_M01_A031'],['UNKNOWN','ISK_M01_A030']])for(const seed of [11,58214,90210]){
  const r=new R(db);r.newGame({name:'새벽하늘',route:'ROUTE_ISEKAI',seed,saveId:'ISK-FIRST-'+branch+'-'+seed});const g=()=>r.s.global;let res=null;
  for(let i=0;i<900&&!res;i++){
   if(r.s.runtime){const b=r.s.runtime;res={group:b.group,origin:b.origin,lv:g().PLAYER_LEVEL_STATE,allies:b.actors.filter(a=>a.side==='ALLY').length,...fight(r)};break;}
   if(r.s.battlePreparation){const p=r.s.battlePreparation,e=JSON.parse(g().COMPANION_ELIGIBILITY_JSON||'{}');r.action('COMBAT_PREPARE',{group:p.group,companions:Object.keys(e).filter(k=>e[k]?.state==='JOINED').slice(0,3)});continue;}
   if(r.s.storyJourney){const j=r.s.storyJourney;if(j.scripted)r.action('STORY_SCRIPTED_TRAVEL');else if(g().CURRENT_MAP_ID===j.target)r.action('JOURNEY_RESUME');else if(j.special)r.action('STORY_RIDE');else r.action('MOVE',{edge:r.navigationRoute(j.target).edges[0][0]});continue;}
   if(r.s.storyBreak){r.action('JOURNEY_RESUME');continue;}
   if(g().SCREEN_MODE==='REWARD'){r.action('MENU',{screen:'STORY'});continue;}
   const cs=r.storyChoices();if(cs.length){const c0=cs.find(x=>x[4]===pick)||cs[0];r.action('STORY_CHOICE',{node:c0[4]});continue;}
   if(r.isStoryWaiting()){if(g().STORY_NEXT_PREPARED){r.action('STORY_RESUME');continue;}const ch=r.storyChapterEntries?.().find(x=>!x.reason);if(ch){r.action('STORY_CHAPTER',{node:ch.id});continue;}const m=r.mainStoryEntries().find(e=>e.available&&!e.reason);if(m){r.action('MAIN_STORY_ACCEPT',{quest:m.quest||m.id});continue;}break;}
   const n=r.storyNode();r.action(n[5]==='INPUT_TEXT'?'STORY_NAME':'STORY_NEXT',n[5]==='INPUT_TEXT'?{name:'새벽하늘'}:{node:n[4]});
  }
  assert(res,'reached a story fight on '+branch);assert.equal(res.lv,1);assert(res.victory,'won '+JSON.stringify(res));out.push([branch,seed,res.group,res.allies,res.rounds]);
 }
 return out;
});
check('the Dvalin preparation note shows the real recommended level, not the old 「권장 Lv. 4」',()=>{
 const src=fs.readFileSync(path.join(root,'source/app_party.js'),'utf8');assert(!src.includes("'권장 Lv. 4'"));assert(src.includes('growthRegionData?.bosses?.[m[3]]'));
 assert.equal(fresh().mondBossProfiles().BOSS_DVALIN.recommended,28);
});
check('journal rows (호감도 임무 and the rest) wrap by their own width: the text keeps 200 px and the buttons drop below',()=>{
 // 0.15.4, user: 「이거 고치라고 했잖아」 — on PC the 호감도 임무 column squeezed the text to one letter a line.
 const css=fs.readFileSync(path.join(root,'source/shell.css'),'utf8'),cut=css.indexOf('/* ---------- 리월 색 (generated');
 const own=css.slice(0,cut);assert(cut>0);
 assert(/body\.teyvat \.journal-row\{display:flex;flex-wrap:wrap/.test(own));assert(/\.journal-row>\.journal-row-copy\{flex:1 1 200px;min-width:min\(200px,100%\)\}/.test(own));
 assert(/\.journal-row>\.journal-row-actions\{flex:1 1 auto;display:flex;flex-wrap:wrap/.test(own));
});
check('the modules are wired into the page and the build in load order (early story and pacing before the kit)',()=>{
 const html=fs.readFileSync(path.join(root,'source/index.html'),'utf8'),build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');
 for(const text of [html,build]){const a=text.indexOf('runtime_early_story_v0153.js'),p=text.indexOf('runtime_story_pacing_v0153.js'),b=text.indexOf('runtime_starter_kit_v0153.js');assert(a>0&&p>a&&b>p,'order');}
});
// Walk the 이세계 K route (the one that stopped after nearly every line) to its end with a boosted party and record what
// the story shows between two stops (user: 「단어 하나만 나오고 휴식 취하고 이딴게 있어서 이걸 바꿔야됨」).
function walkSegments(leaf){
 const r=new R(db);r.newGame({name:'새벽하늘',route:'ROUTE_ISEKAI',seed:58214,saveId:'PACE-'+leaf});
 Object.assign(r.s.global,{PLAYER_LEVEL_STATE:20,PLAYER_XP_STATE:0,PLAYER_BASE_HP:100000,PLAYER_BASE_ATK:10000,PLAYER_BASE_DEF:1000});r.s.ascensions.PLAYER_CUSTOM=1;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
 const g=()=>r.s.global,segs=[];let cur={lines:0,from:'START'},inBattle=false,lastStop='';
 // One stop per travel leg or rest, however many map steps it takes to reach it.
 const close=(to,key=to+':'+i)=>{if(key===lastStop)return;lastStop=key;segs.push({...cur,to});cur={lines:0,from:to};};let i=0;
 const wants=[leaf==='K'?'FLAG_ISK_META_KNOWLEDGE=KNOWN':'FLAG_ISK_META_KNOWLEDGE=UNKNOWN',leaf==='B'?'FLAG_ISK_MOND_BRANCH=GUILD':'FLAG_ISK_MOND_BRANCH=EXPEDITION',leaf==='AB'?'FLAG_ISK_EXPEDITION_FORK=RETURN':'FLAG_ISK_EXPEDITION_FORK=RIDE'];
 for(i=0;i<12000;i++){
  if(r.s.runtime){if(!inBattle){close('BATTLE');inBattle=true;}const b=r.s.runtime;if(b.opening?.state==='PENDING'){r.action('COMBAT_BEGIN');continue;}if(b.interlude){const n=r.storyNode(),cs=r.storyChoices();if(cs.length)r.action('STORY_CHOICE',{node:cs[0][4]});else r.action('STORY_NEXT',{node:n[4]});continue;}if(b.liyueInterlude){r.action('LIYUE_INTERLUDE_ACK');continue;}
   const m=r.combatCards().find(c=>c.system&&!c.reason&&[b.storyConfig?.orb_action?.id,b.storyConfig?.field_access_action?.id,'SYS_MOND_WIND_ROUTE'].includes(c.id));if(m&&b.phase==='WAIT_PLAYER'){r.action('COMBAT',{card:m.id,target:m.targets?.[0]?.id});continue;}
   for(const a of b.actors)if(a.side==='ALLY')a.control='AI';r.autoUntilPlayer();continue;}
  inBattle=false;
  if(r.s.battlePreparation){const p=r.s.battlePreparation,e=JSON.parse(g().COMPANION_ELIGIBILITY_JSON||'{}');r.action('COMBAT_PREPARE',{group:p.group,companions:Object.keys(e).filter(k=>e[k]?.state==='JOINED').slice(0,3)});continue;}
  if(r.s.storyRecovery){r.action('STORY_RETRY');continue;}
  if(r.s.liyueField){close('FIELD','F:'+r.s.liyueField.mission+':'+r.s.liyueField.stage);const view=r.liyueFieldView(),f=view.state,step=view.step;if(g().CURRENT_MAP_ID!==view.target){r.action('MOVE',{edge:r.navigationRoute(view.target).edges[0][0]});continue;}if(!step){r.action('LIYUE_FIELD_FINISH');continue;}if(f.done){r.action('LIYUE_FIELD_CONTINUE');continue;}
   if(step.kind==='SEARCH')r.action('LIYUE_FIELD_INSPECT',{clue:step.clues.find(x=>!f.clues.includes(x.id)).id});else if(step.kind==='INVESTIGATE'){const clue=step.clues.find(x=>!f.clues.includes(x.id));r.action(clue?'LIYUE_FIELD_INSPECT':'LIYUE_FIELD_ANSWER',clue?{clue:clue.id}:{answer:step.answer});}else if(step.kind==='SEQUENCE')r.action('LIYUE_FIELD_ANSWER',{answer:step.sequence[f.sequence.length]});else if(step.kind==='CHOICE')r.action('LIYUE_FIELD_ANSWER',{answer:0});else r.action('LIYUE_FIELD_BATTLE');continue;}
  if(r.s.storyJourney){const j=r.s.storyJourney;close(j.scripted?'TRAVEL_SCRIPTED':'TRAVEL','J:'+j.node+':'+j.target);if(j.scripted)r.action('STORY_SCRIPTED_TRAVEL');else if(g().CURRENT_MAP_ID===j.target)r.action('JOURNEY_RESUME');else if(j.special)r.action('STORY_RIDE');else r.action('MOVE',{edge:r.navigationRoute(j.target).edges[0][0]});continue;}
  if(r.s.storyBreak){close('REST:'+r.s.storyBreak.title,'B:'+r.s.storyBreak.node);if(g().CURRENT_MAP_ID!==r.s.storyBreak.map)r.action('MOVE',{edge:r.navigationRoute(r.s.storyBreak.map).edges[0][0]});else r.action('JOURNEY_RESUME');continue;}
  if(g().SCREEN_MODE==='REWARD'){close('REWARD');r.action('MENU',{screen:'STORY'});continue;}
  const cs=r.storyChoices();if(cs.length){const pick=wants.map(w=>cs.find(x=>String(x[12]).includes(w))).find(Boolean)||cs[0];r.action('STORY_CHOICE',{node:pick[4]});continue;}
  if(r.isStoryWaiting()){if(r.s.quests.Q_ISK_LIYUE_04?.claimed){close('END');break;}if(g().STORY_NEXT_PREPARED){close('PAUSE');r.action('STORY_RESUME');continue;}const ch=r.storyChapterEntries?.().find(x=>!x.reason);if(ch){close('CHAPTER');r.action('STORY_CHAPTER',{node:ch.id});continue;}const m=r.mainStoryEntries().find(e=>e.available&&!e.reason);if(m){close('CHAPTER');r.action('MAIN_STORY_ACCEPT',{quest:m.quest||m.id});continue;}const o=(r.liyueChapterOffers?.()||[]).find(x=>x.available);if(o){close('CHAPTER');if(o.map&&g().CURRENT_MAP_ID!==o.map&&r.navigationRoute(o.map)?.edges?.length){r.action('MOVE',{edge:r.navigationRoute(o.map).edges[0][0]});continue;}r.action('MAIN_STORY_ACCEPT',{quest:o.quest});continue;}close('STUCK');break;}
  const n=r.storyNode();if(!n){close('NO_NODE');break;}if(['DIALOGUE','NARRATION'].includes(n[5])&&n[9])cur.lines++;
  r.action(n[5]==='INPUT_TEXT'?'STORY_NAME':'STORY_NEXT',n[5]==='INPUT_TEXT'?{name:'새벽하늘'}:{node:n[4]});
 }
 return {segs,r};
}
check('story pacing: Liyue scene rests come only after four lines and before four more; choices are made where the player stands',()=>{
 const {segs,r}=walkSegments('K');assert.equal(segs.at(-1).to,'END','the K route still reaches its end');
 const rests=segs.filter(s=>s.to==='REST:잠시 정비할 시간');assert(rests.every(s=>s.lines>=4),'a rest after fewer than four lines: '+JSON.stringify(rests.filter(s=>s.lines<4)));
 for(let i=0;i+1<segs.length;i++)if(segs[i].to==='REST:잠시 정비할 시간'&&segs[i+1].to!=='END')assert(segs[i+1].lines>=4,'four more lines after a rest: '+JSON.stringify(segs[i+1]));
 const pingPong=segs.filter(s=>s.from==='TRAVEL'&&s.to==='TRAVEL'&&s.lines<=1);assert(pingPong.length<=2,'line → travel → line → travel for one line each: '+pingPong.length);
 assert(rests.length<=15,'K used to stop 70 times for a scene change; now '+rests.length);
 const bad=JSON.parse(r.serialize());bad.storyPace={version:1,lines:-1};assert.throws(()=>new R(db,bad),/이야기 진행 기록이 올바르지 않습니다/);
 return {segments:segs.length,sceneRests:rests.length,travel:segs.filter(s=>s.to==='TRAVEL').length};
});
const out=path.join(root,'reports/v0153');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'tests.json'),JSON.stringify({version:'0.15.3',total:results.length,passed:results.filter(r=>r.ok).length,results},null,1));
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
