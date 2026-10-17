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
console.log(JSON.stringify({ok:!process.exitCode,total:4,passed}));
