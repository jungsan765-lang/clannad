'use strict';
// 0.16.62 오류 찾기 (user, 2026-10-18: 「오류나 버그 있는지도 잘 체크해보고」): about 86,000 random and junk-parameter actions found three
// places where a name every object answers to (「constructor」, 「toString」, 「__proto__」) passed a table check.
//  1. FORMATION_SET took it, and the saved formation then broke every battle start (no game reason; the server would answer 500).
//  2. TRAVELER_RESONATE took it and failed on the next line without a game reason.
//  3. TALENT_UPGRADE with an unknown kind was refused with a raw script error as its text.
const assert=require('node:assert/strict'),{R,db,fresh}=require('./helpers_v011.cjs');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
const PROTO=['constructor','toString','__proto__','hasOwnProperty','valueOf'];
function city(route='ROUTE_TRAVELER'){const r=fresh(route);Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION',WORLD_TIME:'12:00'});delete r.s.storyJourney;delete r.s.storyBreak;r.prepareStory?.();return r;}
const refused=(r,type,params,text)=>{assert.equal(r.actionReason(type,params),text,type+' '+JSON.stringify(params));let e=null;try{r.action(type,params);}catch(x){e=x;}assert(e&&e.code,'a game refusal with a code');assert.equal(e.message,text);};

check('진형: only the table\'s own names are taken',()=>{
 const r=city();for(const f of PROTO)refused(r,'FORMATION_SET',{formation:f},'진형을 선택해 주세요.');
 assert.equal(r.partyFormation(),r.s.partyFormation);assert(!PROTO.includes(r.s.partyFormation));
});
check('진형: a save that took such a name before opens with the usual formation, and a fight starts',()=>{
 const r=city();r.s.partyFormation='constructor';const s=JSON.parse(JSON.stringify(r.s));const again=new R(db,s);
 assert.equal(again.s.partyFormation,undefined,'the name is dropped on load');assert.equal(typeof again.partyFormation(),'string');
 const group=again.rows('33_ENCOUNTER_GROUP_DB').find(x=>String(x[0]).includes('CRYO_REGISVINE'));again.startBattle(group[0],'EXPLICIT');assert(again.s.runtime?.formationV1,'a fight starts with a formation');
 const bad=JSON.parse(JSON.stringify(r.s));bad.partyFormation='NOT_A_FORMATION';assert.throws(()=>new R(db,bad),/진형 기록이 올바르지 않습니다/,'an unknown name is still a broken save');
});
check('일곱신상 공명: such an element is refused with the game\'s reason',()=>{
 const r=city('ROUTE_TRAVELER');for(const e of PROTO)refused(r,'TRAVELER_RESONATE',{element:e},'공명할 원소를 선택해 주세요.');
});
check('특성 훈련: an unknown kind is refused with the game\'s reason, the three kinds still answer',()=>{
 const r=city();for(const kind of ['ALL','constructor',3,null])refused(r,'TALENT_UPGRADE',{owner:'PLAYER_CUSTOM',kind},'올릴 특성을 골라 주세요.');
 for(const kind of ['na','e','q',undefined]){const why=r.actionReason('TALENT_UPGRADE',{owner:'PLAYER_CUSTOM',kind});assert.notEqual(why,'올릴 특성을 골라 주세요.');assert(!/undefined|iterable|Cannot read/.test(why),why);}
});
// 0.16.63 오류 찾기 2차 (runtime_reading.js 끝, app_journey.js)
const assert2=assert;
check('2차: requests the screens never send are refused in the game\'s words',()=>{
 const r=city();
 refused(r,'MOVE',{},'갈 곳을 골라 주세요.');refused(r,'MOVE',{edge:'constructor'},'갈 곳을 골라 주세요.');
 refused(r,'TOOL_PREPARE',{items:[null],element:'PYRO'},'준비할 도구를 골라 주세요.');
 for(const boss of ['constructor',['BOSS_ANDRIUS'],7])refused(r,'MOND_MATERIAL_CHALLENGE',{boss},'몬드의 일일 보스는 안드리우스와 드발린입니다.');
 for(const kind of ['constructor','__proto__',['AZHDAHA']])refused(r,'LIYUE_ARTIFACT_CHALLENGE',{kind},'반복 도전할 보스를 골라 주세요.');
 assert2.notEqual(r.actionReason('MOND_MATERIAL_CHALLENGE',{boss:'BOSS_ANDRIUS'}),'몬드의 일일 보스는 안드리우스와 드발린입니다.','a real boss is not turned away by the guard');
 const edge=r.rows('47_MAP_EDGE_DB').find(e=>e[1]==='MAP_MOND_CITY');if(edge)assert2.notEqual(r.actionReason('MOVE',{edge:edge[0]}),'갈 곳을 골라 주세요.');
});
check('2차: the tutorial\'s first battle preparation says it cannot be left, and the screen does not offer it',()=>{
 const r=fresh('ROUTE_TRAVELER');r.s.tutorialV2.intro={id:'MOND_AMBER',group:'EG_MOND_SLIME_SMALL',node:'PRO_TRVM01_평원_028'};r.s.battlePreparation={group:'EG_MOND_SLIME_SMALL',node:'PRO_TRVM01_평원_028'};
 assert2.equal(r.actionReason('PREP_LEAVE',{}),'첫 전투는 물러날 수 없습니다. 준비를 마치고 시작해 주세요.');
 r.s.battlePreparation={group:'EG_OTHER',node:'X'};assert2.notEqual(r.actionReason('PREP_LEAVE',{}),'첫 전투는 물러날 수 없습니다. 준비를 마치고 시작해 주세요.');
 const ui=require('node:fs').readFileSync(require('node:path').join(__dirname,'../source/app_journey.js'),'utf8');
 assert2(/const intro=game\.s\.tutorialV2\?\.intro;if\(!\(intro&&game\.s\.battlePreparation\.group===intro\.group&&game\.s\.battlePreparation\.node===intro\.node\)\)p\.append\(actionButton\('지금은 물러나서 더 준비하기','PREP_LEAVE'\)\)/.test(ui));
});
console.log(JSON.stringify({ok:!process.exitCode,total:6,passed}));
