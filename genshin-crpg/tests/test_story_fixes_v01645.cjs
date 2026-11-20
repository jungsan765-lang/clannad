'use strict';
// 0.16.45 (user: 「이미 읽은 이야기 부분까지 1,2,3번으로 나누는건 좀」, 「스토리 처음부터 진행하다보니 여기서 막히네」, 「이전엔 스토리 하면서
// 맵사진이 보였던거같은데」, 「몬드성에 들어갔다가 나왔다가 다시 들어가는」, 「내가 스토리 직접 수정할 수 있게」).
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
const {R,db}=require('./helpers_v011.cjs');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};

check('the 이세계인 starter kit buys the coat and bow even when the tutorial already put a coat on',()=>{
 assert(!src('runtime_story.js').includes("fail('ARMOR_REPLACE'"));
 // walk the unknown-Mondstadt opening to the kit with the starter coat worn
 const r=new R(db);r.newGame({name:'새벽하늘',route:'ROUTE_ISEKAI',seed:3,saveId:'QA-KIT45'});
 const coat=r.s.inventory.find(i=>i.equip==='EQ_ARMOR_TRAVEL_COAT'&&!i.equipped);r.equip(coat.slot,'PLAYER_CUSTOM');// as the tutorial's step does
 for(let i=0;i<800&&!r.s.flags.FLAG_ISK_STARTER_KIT_BOUGHT;i++){
  if(r.s.runtime){if(r.s.runtime.opening?.state==='PENDING'){r.action('COMBAT_BEGIN');continue;}r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'battle_end',win:true});r.serverAdmin=false;continue;}
  if(r.s.battlePreparation){const prep=r.s.battlePreparation,v=r.battlePreparation(prep.group),g=(v?.guests||[]).map(x=>x.id).slice(0,3);if(r.tutorialState().intro?.group===prep.group){if(!r.s.party.some(p=>p.active&&p.source==='MOND_AMBER'))r.action('PARTY',{char:'MOND_AMBER',slot:2});const bow=r.s.inventory.find(i=>i.equip==='EQ_BOW_SLINGSHOT'&&!i.equipped);if(bow&&!r.s.inventory.some(i=>i.owner==='MOND_AMBER'&&i.equipped&&i.category==='WEAPON'))r.action('EQUIP',{slot:bow.slot,owner:'MOND_AMBER'});g.push('MOND_AMBER');}r.action('COMBAT_PREPARE',{group:prep.group,companions:[...new Set(g)]});continue;}
  if(r.s.storyJourney){const j=r.s.storyJourney;if(j.scripted)r.action('STORY_SCRIPTED_TRAVEL');else if(r.s.global.CURRENT_MAP_ID===j.target)r.action('JOURNEY_RESUME');else r.action('MOVE',{edge:r.navigationRoute(j.target).edges[0][0]});continue;}
  if(r.s.global.SCREEN_MODE==='REWARD'){r.action('MENU',{screen:'STORY'});continue;}
  const cs=r.storyChoices();if(cs.length){const pick=cs.find(x=>String(x[12]).includes('FLAG_ISK_META_KNOWLEDGE=UNKNOWN'))||cs[0];r.action('STORY_CHOICE',{node:pick[4]});continue;}
  const n=r.storyNode();if(!n)break;if(n[5]==='INPUT_TEXT')r.action('STORY_NAME',{name:'새벽하늘'});else r.action('STORY_NEXT',{node:n[4]});
 }
 assert.equal(r.s.flags.FLAG_ISK_STARTER_KIT_BOUGHT,true,'the kit was bought');
 assert(r.s.inventory.some(i=>i.equipped&&i.owner==='PLAYER_CUSTOM'&&i.equip==='EQ_ARMOR_TRAVEL_COAT'),'a coat is worn');
 assert.equal(r.s.inventory.filter(i=>i.equip==='EQ_ARMOR_TRAVEL_COAT').length,2,'the bought coat waits in the bag');
});

check('the whole Mondstadt story is walked as a player walks it (tests/test_story_player_walk_v01645.cjs is in the gate)',()=>{
 assert(src('tools/verify_release.py').includes("'tests/test_story_player_walk_v01645.cjs'"));
});

check('the traveler\'s temple talks, Tatawuppa, the ruins and Liyue\'s mountain road stay where they happen',()=>{
 const m=src('tools/editorial/main_story_k/trv_mond_ch2.md');
 for(const [map,keep] of [['MAP_MOND_TEMPLE_FALCON','TRV_M02_JOIN_AMBER_01'],['MAP_MOND_TEMPLE_WOLF','TRV_M02_JOIN_KAEYA_01'],['MAP_MOND_TEMPLE_LION','TRV_M02_JOIN_LISA_01'],['MAP_MOND_ECLIPSE_CAMP','TRV_M02_N270'],['MAP_MOND_DAWN_WINERY','TRV_M02_N279'],['MAP_CRPG_LAIR_OUTER_GATE','TRV_M02_N335'],['MAP_CRPG_LAIR_WEST_RUINS','TRV_M02_N355'],['MAP_CRPG_LAIR_EAST_RUINS','TRV_M02_N359'],['MAP_STORMTERROR_LAIR','TRV_M02_N364']])
  assert(new RegExp('@map '+map+'\\r?\\n@keep '+keep+'\\b').test(m),map+' before '+keep);
 assert(/@map MAP_LIYUE_MOUNTAINS\r?\n@keep ISK_L02_K1_066/.test(src('tools/editorial/main_story_k/ch2_k1_wait.md')));
 assert(/@keep ISK_L02_K2_073\r?\n>[^\n]*\r?\n\/\/[^\n]*\r?\n@map MAP_LIYUE_MOUNTAINS/.test(src('tools/editorial/main_story_k/ch2_k2_wait.md')));
});

check('읽은 이야기 is one list scrolled with the wheel; the place\'s picture shows behind every screen again',()=>{
 assert(src('app.js').includes("box.classList?.add('history-scroll');showModal('읽은 이야기',box);"));
 assert(src('app_screen_v01629.js').includes("if(box.querySelector(':scope>.history-scroll'))continue;"));
 assert(src('screen_v01629.css').includes('body.teyvat #modal-body>.history-scroll{flex:1 1 auto;min-height:0;max-height:calc(100vh - 230px);overflow-y:auto'));
 assert(src('shell.css').includes('html:has(>body.teyvat)>body.teyvat{background:transparent}'));
 const fit=src('tests/test_screen_fit_v01629.mjs');assert(fit.includes("view('story-history'"));assert(fit.includes("e.matches('.history-scroll')"));
});

check('the story workbench export lists every main chain in play order with places, fights and choices',()=>{
 const t=src('tools/editorial/export_story_workbench.cjs');
 for(const x of ["t:'move'","k:'combat'","t:'choice'","t:'say'","merge=sets[0].order.find"])assert(t.includes(x),x);
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
