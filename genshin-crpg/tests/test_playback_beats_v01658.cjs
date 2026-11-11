'use strict';
// 0.16.58 (user: 「토끼백작이 너무 빨리 나오잖아 전체적으로 전투 순서부분에서 드러나는걸 좀 다 체크해봐 스킬별로 전부 다; 과부하인가 초전도인가
// 그거도 뭔가 하나씩 하나씩 터지는 문제가 있던거같은데 그냥 다~~ 체크해봐」): real fights, played through the real presentation and the
// playback's own beat tidying (app_summons_v01652.js) and turn rule (app_battle_fx_v01521.js).
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'..'),src=f=>fs.readFileSync(path.join(ROOT,f),'utf8');
const H=require(path.join(ROOT,'tools/audit_protagonist_v01618.cjs')),env=H.load(ROOT),P=env.c.CRPGPresentation;
let passed=0;const check=(name,fn)=>{try{fn();passed++;console.log('PASS '+name);}catch(e){process.exitCode=1;console.log('FAIL '+name);console.log(e);}};
// the page's tidying, run on its own
const tidy=(()=>{const ctx={console,window:{CRPGPresentation:{actionFrames:x=>x}}};ctx.window.window=ctx.window;vm.createContext(ctx);vm.runInContext('var window=this.window;'+src('source/app_summons_v01652.js'),ctx);return ctx.window.CRPGPresentation.tidyBeats;})();
const turnFrame=(()=>{const m=src('source/app_battle_fx_v01521.js').match(/const turnFrame=(f=>[^\n]*);\n/);assert(m,'turnFrame');return vm.runInNewContext('('+m[1]+')');})();
const S=r=>r.s.runtime,beats=events=>P.actionFrames(tidy(events)).filter(f=>f.kind==='action'),old=events=>P.actionFrames(events).filter(f=>f.kind==='action');
function fight(team,group,seed=717){const r=H.setup(env,{level:50,team,map:'MAP_MOND_PLAINS',seed});r.startBattle(group,'EXPLICIT');for(const a of S(r).actors)if(a.side==='ENEMY'){a.maxHp=a.hp=5e6;}if(r.combatOpening?.())r.action('COMBAT_BEGIN',{});return r;}
// the hero guards; companions use only the cards named (others wait), and the foes carry the aura given
function turns(r,{aura,cards=[],n=3}){const out=[];for(let i=0;i<n&&S(r);i++){
 for(const a of S(r).actors){if(a.side==='ENEMY'){if(aura)r.setAura(a,aura);}else if(a.source!=='PLAYER_CUSTOM')for(const s of ['_E','_Q'])a.cooldowns[a.source+s]=cards.includes(a.source+s)?0:99;}
 const me=S(r).actors.find(a=>a.source==='PLAYER_CUSTOM'),before=P.snapshot(r.s);r.action('COMBAT',{card:'PLAYER_BASIC_GUARD',target:me.id});out.push(P.delta(before,r.s));}return out;}
const byTurn=frames=>{const m=new Map();for(const f of frames){const k=f.round+':'+f.action+':'+f.actorId+':'+(f.periodic?f.sourceKind+':'+f.cardId:'');m.set(k,(m.get(k)||0)+1);}return m;};

check('초전도: a basic hit and the debuff it leaves are one beat — no 「적 · 효과」 beat between the hits',()=>{
 const r=fight(['MOND_LISA','MOND_NOELLE','MOND_BARBARA'],'EG_MOND_HILI_ELITE');let foeBeats=0,newFoeBeats=0,lisa=0;
 for(const ev of turns(r,{aura:'얼음'})){
  const foe=f=>String(f.actorId).startsWith('MON_')&&f.events.every(e=>e.kind==='status');
  foeBeats+=old(ev).filter(foe).length;newFoeBeats+=beats(ev).filter(foe).length;
  for(const f of beats(ev))if(f.actorId==='MOND_LISA'&&f.reactions.includes('초전도')&&f.events.some(e=>e.kind==='status'&&e.statusApplied))lisa++;}
 assert(foeBeats>0,'the old beats had the foe\'s own 「효과」 beat (the case this guards)');assert.equal(newFoeBeats,0);assert(lisa>0,'리사\'s beat carries the hit, 초전도 and the debuff');
});
check('과부하 from a field\'s tick: every foe the tick hits bursts in one beat (클레 · 원소폭발)',()=>{
 const r=fight(['MOND_KLEE','MOND_NOELLE','MOND_BARBARA'],'EG_MOND_HILI_ELITE');let oldSplit=0,newSplit=0,ticks=0;
 for(const ev of turns(r,{aura:'번개',cards:['MOND_KLEE_Q'],n:4})){
  const tick=f=>f.periodic&&f.cardId==='MOND_KLEE_Q',count=list=>{let s=0;for(const [,n] of byTurn(list.filter(tick)))if(n>1)s++;return s;};
  oldSplit+=count(P.actionFrames(ev).filter(f=>f.kind==='action'||f.periodic));newSplit+=count(beats(ev));ticks+=beats(ev).filter(tick).length;
  // the reactions ride with the tick, not as beats of their own
  assert.equal(beats(ev).filter(f=>f.actorId==='MOND_KLEE'&&!f.periodic&&f.events.every(e=>e.kind==='reaction'||e.sourceKind==='REACTION')).length,0);}
 assert(ticks>0,'클레\'s 원소폭발 ticked');assert(oldSplit>0,'the old beats split the tick (the case this guards)');assert.equal(newSplit,0);
});
check('토끼 백작\'s blast and the 과부하 it sets off are one blast, not 토끼 백작 · 엠버 · 토끼 백작',()=>{
 const r=fight(['MOND_AMBER','MOND_NOELLE','MOND_BARBARA'],'EG_MOND_HILI_ELITE');let blasts=0;
 for(const ev of turns(r,{aura:'번개',cards:['MOND_AMBER_E'],n:4})){const list=beats(ev);
  list.forEach((f,i)=>{if(!String(f.actorId).startsWith('SUMMON:BUNNY'))return;blasts++;const next=list[i+1];
   assert(!(next&&next.actorId==='MOND_AMBER'&&next.round===f.round&&next.action===f.action&&next.events.every(e=>e.kind==='reaction'||e.sourceKind==='REACTION'||e.kind==='state')),'엠버 shows no reaction-only beat after the blast');
   assert.equal(list.filter(g=>g.actorId===f.actorId&&g.round===f.round&&g.action===f.action).length,1,'one blast');});
  for(const f of list)if(f.actorId==='MOND_AMBER')assert.notEqual(f.cardName,'폭발','엠버\'s own blow is not captioned with the bunny\'s blast');}
 assert(blasts>0,'토끼 백작 burst');
});
check('the turn mark: each action is one fighter\'s turn, a turn that only heals is a turn, nothing is ×2 for one action',()=>{
 const teams=[['MOND_BARBARA','MOND_JEAN','MOND_QIQI'],['MOND_FISCHL','MOND_JEAN','LIYUE_XINGQIU'],['LIYUE_XIAO','LIYUE_XIANYUN','LIYUE_YELAN'],['MOND_KAEYA','MOND_MONA','LIYUE_BEIDOU']].map(t=>t.map(x=>x.replace('MOND_QIQI','LIYUE_QIQI')));
 let healTurns=0,turnsSeen=0;
 for(const team of teams){const r=fight(team,'EG_MOND_HILI_ELITE');
  for(let i=0;i<6&&S(r);i++){const cards=r.combatCards().filter(c=>!c.reason),c=cards.find(c=>/_Q$/.test(c.id))||cards.find(c=>/_E$/.test(c.id))||cards[0];const foes=S(r).actors.filter(a=>a.side==='ENEMY'&&a.hp>0),t=(c.targets||[]).find(x=>foes.some(f=>f.id===x.id))||c.targets?.[0];
   const before=P.snapshot(r.s);r.action('COMBAT',{card:c.id,...(t?{target:t.id}:{})});const list=beats(P.delta(before,r.s));
   const by=new Map();for(const f of list)if(turnFrame(f)){const k=f.round+':'+f.action;(by.get(k)||by.set(k,new Set()).get(k)).add(f.actorId);}
   for(const [k,set] of by){turnsSeen++;assert.equal(set.size,1,'one fighter takes action '+k+': '+[...set]);}
   const times={};for(const f of list)if(turnFrame(f))(times[f.round+'|'+f.actorId]??=new Set()).add(f.action);
   for(const f of list)if(turnFrame(f)&&f.events.every(e=>e.kind==='heal'||e.kind==='state'||e.kind==='status'))healTurns++;
   // a follow-up, a reaction, a passive heal or a status on a foe is never a turn
   for(const f of list)if(f.events.every(e=>['FOLLOWUP','BUBBLE','LIGHTFALL_EXPLOSION','REACTION','STATUS_APPLY','JOINT_ATTACK'].includes(e.sourceKind)||e.kind==='reaction'||e.kind==='heal'&&!e.cardId&&!e.presentationActorsAfter?.some(x=>x.id===f.actorId&&Object.hasOwn(x,'turns'))))assert(!turnFrame(f),'side effect taken as a turn: '+f.actorId+' '+f.events.map(e=>e.kind+'/'+e.sourceKind).join(','));}}
 assert(turnsSeen>40);assert(healTurns>0,'바바라 · 진\'s heal-only turn is a turn');
});
check('every HP shown stays in the order it happened and ends the same, across the roster',()=>{
 const roster=['MOND_AMBER','MOND_BARBARA','MOND_BENNETT','MOND_DIONA','MOND_FISCHL','MOND_JEAN','MOND_KAEYA','MOND_KLEE','MOND_LISA','MOND_MONA','MOND_SUCROSE','MOND_VENTI','LIYUE_GANYU','LIYUE_XIANGLING','LIYUE_XIANYUN','LIYUE_XIAO','LIYUE_XINGQIU','LIYUE_YELAN','LIYUE_ZHONGLI','LIYUE_NINGGUANG','LIYUE_YAOYAO'];
 const seq=list=>{const m={};for(const f of P.actionFrames(list))for(const t of f.targets||[])for(const e of t.events||[])if(Number.isFinite(e.hpAfter)&&!(e.kind==='state'&&e.hpBefore===e.hpAfter))(m[t.targetId]??=[]).push(e.hpAfter);return JSON.stringify(Object.entries(m).sort());};
 let n=0,before=0,after=0;
 for(let i=0;i<roster.length;i+=3){const r=fight(roster.slice(i,i+3),i%2?'EG_MOND_SLIME_SMALL':'EG_MOND_HILI_ELITE');
  for(let k=0;k<8&&S(r);k++){const cards=r.combatCards().filter(c=>!c.reason),c=cards.find(c=>/_Q$/.test(c.id))||cards.find(c=>/_E$/.test(c.id))||cards[0];const foes=S(r).actors.filter(a=>a.side==='ENEMY'&&a.hp>0),t=(c.targets||[]).find(x=>foes.some(f=>f.id===x.id))||c.targets?.[0];
   const snap=P.snapshot(r.s);r.action('COMBAT',{card:c.id,...(t?{target:t.id}:{})});const ev=P.delta(snap,r.s);n++;
   assert.equal(seq(tidy(ev)),seq(ev),'HP steps unchanged');
   const split=list=>{const m=new Map();for(const f of P.actionFrames(list).filter(f=>f.kind==='action')){const key=f.round+':'+f.action+':'+f.actorId;m.set(key,(m.get(key)||0)+1);}return [...m.values()].filter(v=>v>1).length;};
   before+=split(ev);after+=split(tidy(ev));}}
 assert(n>40);assert(after*3<before,'a blow split over beats: '+before+' → '+after);
});
check('a summon comes with the skill that makes it, and leaves when spent; 토끼 백작\'s next-round blast joins the order as it is cast',()=>{
 const s=src('source/app_summons_v01652.js'),combat=src('source/runtime_combat.js'),liyue=src('source/runtime_liyue_cards.js');
 const makers=JSON.parse(s.match(/const MAKERS=(\{[^;]*\});/)[1].replace(/([A-Z_]+):/g,'"$1":').replace(/'/g,'"'));
 for(const [kind,cards] of Object.entries(makers))for(const card of cards){const short=card.replace(/^(MOND|LIYUE)_/,'');
  const made=new RegExp("case ?'"+card+"':[^\\n]*addField\\('"+kind+"'").test(combat)||new RegExp("case ?'"+short+"':[^\\n]*"+kind).test(liyue);assert(made,card+' makes '+kind);}
 assert.match(s,/cast&&f\.actor===actor&&makes\(f\.kind,card\)/);assert.doesNotMatch(s,/\/\(_E\|_Q\|SUMMON\)\//,'not any E or Q of the owner');
 assert.match(s,/const BOSS_SUMMONING=new Set\(\['FB_PRISM','FB_PILLARS','FB_REVIVE','FB_OCEANID_FORMS'\]\)/);
 const boss=src('source/runtime_field_bosses.js');for(const id of ['PRISM','PILLARS','REVIVE'])assert(boss.includes("this.fbLog(boss,'"+id+"'")||boss.includes("this.fbLog(t,'"+id+"'"),id);assert(boss.includes("card:'FB_OCEANID_FORMS'"));
 assert.match(s,/function madeNow\(b,kind,owner\)/);assert.match(s,/function sweep\(index\)/);assert.match(s,/orderEntry\(f,frame\.round\)/);
 const fx=src('source/app_battle_fx_v01521.js');assert.match(fx,/const shown=window\.ActorPlayback\?\.currentActor\?\.\(a\.id\),hp=shown&&Number\.isFinite\(shown\.hp\)\?shown\.hp:a\.hp;/,'greyed out only once it has fallen on screen');
 assert.match(fx,/li\.next\[data-actor-id=/,'a bunny struck down says what it does now');
});
console.log(JSON.stringify({passed,ok:!process.exitCode}));
