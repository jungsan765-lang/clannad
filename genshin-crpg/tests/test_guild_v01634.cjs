'use strict';
// 0.16.34 (TODO 5): Catherine's lesson at her desk, the commissions' titles/requests/chips, giving a commission back.
const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
const {c,fresh,root}=require('./helpers_v011.cjs');
const api=c.CRPGRuntime,T=api.tasksV01612,ROOT=T.rootId,plain=x=>JSON.parse(JSON.stringify(x));
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}};
const refused=(fn,pattern)=>{try{fn();}catch(e){if(pattern)assert.match(e.message,pattern);return true;}return false;};
const guild=g=>{const k=g.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');g.action('PLACE_ENTER',{place:k.id,mode:'TALK'});};
const reported=()=>{const g=fresh();g.serverAdmin=true;g.action('OPERATOR_DEBUG',{op:'level',value:20});guild(g);g.action('COMMISSION_ACCEPT',{quest:ROOT});g.action('CLAIM_QUEST',{quest:ROOT});return g;};
// The first commissions that open once the practice one is reported (series ones, not lessons).
const open=(g,learning=false)=>T.chains.filter(t=>!!t.learning===learning&&t.id!==ROOT&&!g.questUnlockReason(t.id)).map(t=>t.id);

check('every one-time commission has a title and who asks; the series and deliveries say why; titles are all different',()=>{
 const g=fresh(),names=[];
 for(const t of T.chains){const d=g.taskPresentation(t);names.push(d.name);assert(d.name&&!/undefined|null/.test(d.name),t.id);assert(d.requester,t.id+' requester');
  if(!t.learning)assert(d.story&&d.story.length>8,t.id+' story');
  for(const chip of d.chips)assert(chip.text&&!/undefined|null|NaN/.test(chip.text),t.id+' chip '+JSON.stringify(chip));
  if(!t.learning)assert(d.chips.length>0,t.id+' has chips');}
 assert.equal(new Set(names).size,names.length,'no two commissions share a title');
 const d=g.taskPresentation(T.chains.find(t=>t.id==='Q_TASK_HILICHURL_05'));
 assert.equal(d.name,'길목의 얼음 화살');assert.equal(d.requester,'서풍 기사단');assert.deepEqual(plain(d.chips.map(x=>x.text)),['2승','츄츄 얼음 궁수','불']);
 const del=g.taskPresentation(T.chains.find(t=>t.id==='Q_TASK_SUPPLIES_01'));assert.deepEqual(plain(del.chips.map(x=>x.text)),['달콤달콤꽃 ×8']);
});

check('only the words change: the accepted objective, its goal and reward stay as stored; the quest list shows the new title',()=>{
 const g=reported(),id=open(g)[0]||open(g,true)[0],t=T.chains.find(x=>x.id===id),title=g.taskPresentation(t).name;assert(id,'something opens');
 g.action('COMMISSION_ACCEPT',{quest:id});const stored=g.s.quests[id].taskObjective.definition;
 assert.equal(stored.name,t.name,'the stored definition keeps its catalog name');assert.equal(stored.goal,t.goal);assert.deepEqual(plain(stored.reward),plain(t.reward));
 const row=g.commissionEntries().find(q=>q.row[0]===id);assert.equal(row.row[1],title);assert(row.taskDisplay.requester);
 assert(g.questConditions(id).startsWith(title+' ('),g.questConditions(id));
});

check('의뢰 포기: a taken commission can be given back and taken again; the practice one, an untaken one and a finished one cannot',()=>{
 const g=reported(),id=open(g)[0]||open(g,true)[0];
 assert(refused(()=>g.action('COMMISSION_ABANDON',{quest:id}),/받아 둔 의뢰만/));
 g.action('COMMISSION_ACCEPT',{quest:id});assert.equal(g.commissionAbandonReason(id),'');
 const out=g.action('COMMISSION_ABANDON',{quest:id});assert.equal(out.result.abandoned,true);assert.equal(out.result.lost,null);assert(!g.s.quests[id],'progress is gone');
 g.validateSave(plain(g.s));g.action('COMMISSION_ACCEPT',{quest:id});assert(g.s.quests[id].guildAccepted,'taken again');
 assert(refused(()=>g.action('COMMISSION_ABANDON',{quest:ROOT}),/받아 둔 의뢰만|보고하면 끝납니다/));
 const h=fresh();guild(h);h.action('COMMISSION_ACCEPT',{quest:ROOT});assert.match(h.commissionAbandonReason(ROOT),/보고하면 끝납니다/);
 assert(fs.readFileSync(path.join(root,'server/game-core.mjs'),'utf8').includes('"COMMISSION_ABANDON"'),'the account server accepts the action');
});

check('의뢰 포기: goods paid to start a Liyue commission\'s step are named as lost',()=>{
 const g=reported(),id='Q_CRPG_LIYUE_EXP_TREASURE_PROOF';g.s.quests[id]={guildAccepted:true,state:'진행중',node:'INVESTIGATE',localLiyueRequirementPaid:true};
 assert.deepEqual(plain(g.commissionAbandonLoss(id)),{MAT_TREASURE_INSIGNIA:5});
 const out=g.action('COMMISSION_ABANDON',{quest:id});assert.deepEqual(plain(out.result.lost),{MAT_TREASURE_INSIGNIA:5});
});

check('캐서린의 안내: accept, report, then the day\'s and week\'s tab once; away from her desk, nothing',()=>{
 const g=fresh();g.tutorialState().enabled=false;
 assert.equal(g.tutorialDirective(),null,'not at the desk');
 guild(g);assert.equal(g.tutorialDirective().id,'guildAccept');assert.equal(g.tutorialDirective().quest,ROOT);
 g.action('COMMISSION_ACCEPT',{quest:ROOT});assert.equal(g.tutorialDirective().id,'guildReport');
 g.action('CLAIM_QUEST',{quest:ROOT});assert.equal(g.tutorialDirective().id,'guildTasks');
 assert(refused(()=>g.action('TUTORIAL_GUIDE',{seen:'other'})));
 g.action('TUTORIAL_GUIDE',{seen:'guildTasks'});assert.equal(g.tutorialDirective(),null);assert.equal(g.tutorialState().done.guildTasks,true);
 g.validateSave(plain(g.s));
 const ui=fs.readFileSync(path.join(root,'source/app_tutorial.js'),'utf8');for(const say of ['guild.accept','guild.report','guild.tasks'])assert(ui.includes("'"+say+"'"),say);
 assert(ui.includes("['의뢰·임무'"),'the help has the commissions topic');
});

console.log(JSON.stringify({ok:!process.exitCode,passed}));
