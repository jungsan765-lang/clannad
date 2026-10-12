'use strict';
// 0.16.36 (TODO 7): the conveniences — report every finished commission at once, the result window's 다시 도전 · 빠른 식사
// · 메인으로, a missing material pinned from the enhance window, the map's gold rings and the bag's sort chips.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {c,fresh,root,advance}=require('./helpers_v011.cjs');
// 0.16.36: the clock starts on a Wednesday noon (Korean time), whatever hour or weekday the run begins (a run near midnight
// or on a Sunday night changed the day under the checks — see docs/WORKFLOW_309_CALENDAR_FIX_KO.md).
advance(Date.parse('2026-10-07T12:00:00+09:00')-c.Date.now());
const src=f=>fs.readFileSync(path.join(root,f.includes('/')?f:'source/'+f),'utf8');
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};

// At Catherine's desk with the practice reported and `n` commissions taken; the first `done` of them finished.
function desk(n,done){
 const r=fresh('MAP_MOND_CITY');r.serverAdmin=true;
 const k=r.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');r.action('PLACE_ENTER',{place:k.id,mode:'TALK'});
 r.action('COMMISSION_ACCEPT',{quest:'Q_TASK_LEARN_01'});r.action('CLAIM_QUEST',{quest:'Q_TASK_LEARN_01'});
 const took=[];for(const q of r.commissionEntries().filter(q=>!q.accepted&&/^Q_TASK_/.test(q.row[0])&&!r.questUnlockReason(q.row[0])&&!q.reward?.equipment_choice).slice(0,n)){r.action('COMMISSION_ACCEPT',{quest:q.row[0]});took.push(q.row[0]);}
 for(const id of took.slice(0,done)){const s=r.s.quests[id],d=JSON.parse(r.tables['22_QUEST_DB'].get(id)[10]);s.node=d.claim_node||'READY_TO_CLAIM';if(s.taskObjective)s.taskObjective.progress=s.taskObjective.definition.goal;}
 return {r,took};
}

check('모두 보고: two or more finished commissions are reported at once, each with its own reward; one alone is reported by itself',()=>{
 const {r,took}=desk(3,2);assert.deepEqual([...r.commissionReportAllList()],took.slice(0,2));assert.equal(r.actionReason('COMMISSION_REPORT_ALL',{}),'');
 const pay=took.slice(0,2).map(id=>r.commissionEntries().find(q=>q.row[0]===id).reward),mora=Number(r.s.global.MORA),primo=Number(r.s.global.PRIMOGEM)||0;
 const out=r.action('COMMISSION_REPORT_ALL',{}).result;
 assert.deepEqual([...out.reported],took.slice(0,2));assert.equal(out.names.length,2);
 for(const id of took.slice(0,2))assert.equal(r.s.quests[id].claimed,true,id);
 assert.notEqual(r.s.quests[took[2]].claimed,true,'the one still going stays');
 assert.equal(Number(r.s.global.MORA)-mora,pay.reduce((n,x)=>n+(x.mora||0),0));assert.equal(out.mora,Number(r.s.global.MORA)-mora);
 assert.equal(out.primogem,(Number(r.s.global.PRIMOGEM)||0)-primo);
 r.validateSave(JSON.parse(JSON.stringify(r.s)));
 const one=desk(2,1).r;assert.equal(one.commissionReportAllList().length,1);assert.match(one.actionReason('COMMISSION_REPORT_ALL',{}),/두 개 이상/);
 assert.throws(()=>one.action('COMMISSION_REPORT_ALL',{}),/두 개 이상/);
 assert(src('server/game-core.mjs').includes('"COMMISSION_REPORT_ALL"'),'the server allows it');
});

check('모두 보고 on screen: a bar above the list, the finished and the going rows first, the reward band after',()=>{
 const g=src('app_guild_v0167.js');assert(g.includes("actionButton('모두 보고 · '+ids.length,'COMMISSION_REPORT_ALL',{},true)"));assert(g.includes("for(const st of ['s-going','s-ready'])list.prepend("));
 const t=src('app_tasks_v0167.js');assert(t.includes("type==='COMMISSION_REPORT_ALL'&&out&&out.ok!==false")&&t.includes("title:'의뢰 보상 획득'"));assert(t.includes("'task-mini-chip ready','보고 '+ready"),'the main screen line counts them');assert(t.includes("'주간 '+wd+'/'+wk.length"));
});

check('결과 창: 다시 도전 beside 메인 화면으로 for domains, field bosses and ley lines; a daily boss says when it opens',()=>{
 const g=src('app_growth_v01522.js');
 for(const s of ["o.startsWith('DOMAIN:')","o.startsWith('MATERIAL_CHALLENGE:')","/^BRT_(FB_|LEY_)/","act('PLACE_ENTER',{place,mode:'BOSS'})","act('BOSS_ROUTE',params)","'일일 보스는 하루 한 번 · 한국 시간 0시에 다시 열립니다'","await act('BOSS_LEAVE')"])assert(g.includes(s),s);
 assert(!g.includes('같은 비경 다시 도전'),'one 다시 도전 for every kind');
 assert(src('app_protagonist.js').includes(".shell-result-actions button.primary:not(:disabled)"),'Space skips a shut retry');
 // the lost step's own retry (it steps back through the entrance) is the one shown
 assert(src('app_experience.js').includes("const go=async()=>{if(reenter&&!game.s.placeVisit){await act('PLACE_ENTER',{place,mode:'BOSS'});if(!game.s.placeVisit)return;}await act('BOSS_CONTINUE');};"));
});

check('강화 창 📌, the map\'s gold rings and the bag\'s sort chips',()=>{
 const e=src('app_enhancement.js');assert(e.includes("if(lack)pinButton(line,id,n);")&&e.includes("if(have<cost.mora)pinButton(mora,'MORA',cost.mora);")&&e.includes('window.CRPGTrack.pin(id,need)'));
 const c=src('app_character_v0167.js');assert(c.includes('places:trackedPlaces'));
 const n=src('app_navigation.js');assert(n.includes("tracked=new Set(window.CRPGTrack?.places?.()||[])")&&n.includes("(tracked.has(id)?' tracked':'')"));
 assert(src('screen_v01629.css').includes('.terrain-node.tracked:not(.current)'));
 const x=src('app_experience.js');assert(x.includes("const BAG_SORTS=[['기본','INVENTORY','들어온 순서'],['새 것','CLOCK','최근에 얻은 것부터'],['등급','STAR','등급이 높은 것부터'],['종류','DIAMOND','종류별로']]"));assert(x.includes('shown=sortBag(shown);'));
 assert(!/<select|createElement\('select'\)/.test(x),'no drop-down');
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
