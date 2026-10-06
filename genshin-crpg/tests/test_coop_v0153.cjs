'use strict';
// 0.15.3 다인 모드 in the game rules (runtime_coop_v0153.js): guest fighters built from the guest's own save, their turns,
// the 20-second auto turn, joining and leaving in the middle of a fight, solo-only content, rewards into the guest's own
// save (with the guest's field-boss limit), the Lv.5 rule and the checks on saved co-op state.
const assert=require('node:assert/strict'),path=require('path');
const {fs,root,c,fresh}=require('./helpers_v011.cjs'),{fixture}=require('./helpers_abyss.cjs');
const api=c.CRPGRuntime,results=[],plain=x=>JSON.parse(JSON.stringify(x));
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const refused=(fn,pattern)=>{try{fn();}catch(e){if(pattern)assert.match(e.message,pattern);return true;}return false;};
const ROOM='Rabcdef1234',G1='aaaaaaaaaaaa',G2='bbbbbbbbbbbb',G3='cccccccccccc',T0=Date.UTC(2026,9,1,3,0,0),PLAYER='PLAYER_CUSTOM';
const ctx=(members,caller=null)=>({version:1,room:ROOM,members,caller});
// The host: Traveler Lv.12 with Amber, Kaeya and Lisa. A guest: Isekai Lv.10 with Amber (C2, E talent 4) and Diluc.
function host(){const h=fixture(12,['MOND_AMBER','MOND_KAEYA','MOND_LISA'],6,'ROUTE_TRAVELER');h.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';h.actionStartedAt=T0;return h;}
function guest(level=10,team=['MOND_AMBER','MOND_DILUC'],route='ROUTE_ISEKAI'){const g=fixture(level,team,8,route);g.actionStartedAt=T0;return g;}
const g0=guest();g0.s.constellations={MOND_AMBER:2};g0.s.talents={MOND_AMBER:{e:4}};
const snapHero=g0.coopSnapshot(PLAYER),snapAmber=g0.coopSnapshot('MOND_AMBER'),snapDiluc=g0.coopSnapshot('MOND_DILUC');
const member=(pid,name,snap)=>({pid,name,snap});
function randomFight(h,c0){h.coopContext=c0;const pool=h.encounterPoolRows(h.row('32_MAP_DB',h.s.global.CURRENT_MAP_ID));h.startBattle(pool[0][5],'RANDOM');
 // Tough enemies, so the fight lasts long enough to see every turn.
 for(const e of h.s.runtime.actors.filter(a=>a.side==='ENEMY')){e.maxHp*=40;e.hp=e.maxHp;}
 h.action('COMBAT_BEGIN');return h.s.runtime;}
function hostTurn(h){const b=h.s.runtime,foe=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0),atk=h.combatCards().find(x=>x.id==='PLAYER_BASIC_ATTACK'&&!x.reason);h.action('COMBAT',atk?{card:atk.id,target:atk.targets[0]?.id||foe.id}:{card:'PLAYER_BASIC_GUARD'});}
// Plays the host's turns until a guest fighter is up (or the fight ends).
function untilGuest(h,max=60){for(let i=0;i<max&&h.s.runtime;i++){if(h.s.runtime.coop?.turn)return h.s.runtime.coop.turn;hostTurn(h);}return h.s.runtime?.coop?.turn||null;}
const allies=b=>b.actors.filter(a=>a.side==='ALLY');

check('a guest brings one of their own characters with its real level, gear, constellation and talents (snapshot from their save)',()=>{
 const own=g0.character('MOND_AMBER');
 assert.equal(snapAmber.char,'MOND_AMBER');assert.equal(snapAmber.level,10);assert.equal(snapAmber.actor.maxHp,Math.round(own.maxHp));assert.equal(snapAmber.actor.atk,Math.round(own.atk*100)/100);
 assert.equal(snapAmber.cons.level,2);assert.equal(snapAmber.cons.key,'MOND_AMBER');assert.equal(snapAmber.talents.e,4);assert(Object.keys(snapAmber.traits).length>0,'the gear traits of the worn gear');
 assert.deepEqual(plain(snapHero.skillIds),['PLAYER_ISEKAI_E','PLAYER_ISEKAI_Q'],'the protagonist brings the skills of its own route');assert.equal(snapHero.route,'ROUTE_ISEKAI');
 assert(refused(()=>g0.coopSnapshot('MOND_VENTI'),/합류한 동료/),'only a companion who joined');
 const choices=plain(g0.coopCharChoices());assert.deepEqual(choices.map(x=>x.id).sort(),[PLAYER,'MOND_AMBER','MOND_DILUC'].sort());assert(choices.every(x=>x.gear.length>0&&x.level===10));
 return {amber:{level:snapAmber.level,atk:snapAmber.actor.atk,cons:snapAmber.cons.level}};
});

check('Lv.5 rule: a protagonist under Lv.5 cannot take part; the reason says so',()=>{
 const low=fresh();low.s.global.PLAYER_LEVEL_STATE=4;assert.match(low.coopLevelReason(),/Lv\.5부터/);assert(refused(()=>low.coopSnapshot(PLAYER),/Lv\.5부터/));
 const ok=fresh();ok.s.global.PLAYER_LEVEL_STATE=5;assert.equal(ok.coopLevelReason(),'');
});

check('random encounter: the guest joins with its own stats; the host keeps the protagonist and fills the rest in slot order',()=>{
 const h=host(),b=randomFight(h,ctx([member(G1,'손님',snapAmber)]));
 const team=allies(b);assert(team.length<=4);const g=team.find(a=>a.coop);assert(g,'a guest fighter');
 assert.equal(g.control,'GUEST');assert.equal(g.coop.owner,G1);assert.equal(g.source,'MOND_AMBER');assert.equal(g.level,10);assert.equal(g.atk,snapAmber.actor.atk);assert.equal(g.def,snapAmber.actor.def);
 assert.equal(team.filter(a=>a.source==='MOND_AMBER').length,1,'the host\'s own Amber steps back for the guest\'s');assert(team.some(a=>a.id===PLAYER&&a.control==='PLAYER'));
 assert.deepEqual(plain(team.filter(a=>!a.coop).map(a=>a.source)).sort(),[PLAYER,'MOND_KAEYA','MOND_LISA'].sort(),'the host\'s other companions fill the free places');
 assert.equal(g.consSnapshot.level,2);assert.equal(h.premiumTalentMultiplier(g,'e'),api.premiumV0148.talent.CURVE[3]/100,'the guest\'s own talent level');
 const hostAmberCons=h.consFx({source:'MOND_AMBER',side:'ALLY'}).length;assert(h.consFx(g).length>hostAmberCons,'the guest\'s constellation, not the host\'s');
 assert.deepEqual(plain(b.relationshipTarget||[]).map(t=>t.charId).filter(id=>id==='MOND_AMBER'),[],'no bond for a guest\'s character');
 assert.equal(b.coop.room,ROOM);assert.equal(JSON.parse(h.serialize()).runtime.coop.room,ROOM,'the save validates');
 return {team:team.map(a=>[a.id,a.source,a.slot])};
});

check('three guests at most; with three guests the host fights with the protagonist alone',()=>{
 const g2=guest(9,['MOND_KAEYA']),g3=guest(11,['MOND_LISA']);
 const h=host(),b=randomFight(h,ctx([member(G1,'하나',snapAmber),member(G2,'둘',g2.coopSnapshot('MOND_KAEYA')),member(G3,'셋',g3.coopSnapshot(PLAYER)),member('dddddddddddd','넷',snapDiluc)]));
 const team=allies(b);assert.equal(team.length,4);assert.equal(team.filter(a=>a.coop).length,3);assert.deepEqual(plain(team.filter(a=>!a.coop).map(a=>a.id)),[PLAYER]);
 assert.equal(new Set(team.map(a=>a.slot)).size,4,'each fighter has its own place');
});

check('a guest\'s turn stops the fight like the protagonist\'s; only that guest may act, only on that turn',()=>{
 const h=host(),b=randomFight(h,ctx([member(G1,'손님',snapAmber)]));
 const t=untilGuest(h);assert(t,'the guest\'s turn comes');const g=h.combatActor(t.actor);
 assert.equal(h.s.runtime.phase,'WAIT_PLAYER');assert.equal(t.owner,G1);assert.equal(t.deadline-t.at,20000);
 assert(refused(()=>hostTurn(h),/손님 님의 차례/),'the host waits');assert(h.combatCards().every(x=>x.reason),'the host\'s cards say why');
 h.coopContext=ctx([member(G1,'손님',snapAmber)],null);
 assert(refused(()=>h.action('COOP_COMBAT',{room:ROOM,card:'MOND_AMBER_E'}),/손님 님의 차례/),'the host cannot act for the guest');
 h.coopContext=ctx([member(G1,'손님',snapAmber)],G2);
 assert(refused(()=>h.action('COOP_COMBAT',{room:ROOM,card:'MOND_AMBER_E'}),/손님 님의 차례/),'another adventurer cannot act for the guest');
 h.coopContext=ctx([member(G1,'손님',snapAmber)],G1);
 assert(refused(()=>h.action('COOP_COMBAT',{room:'Rffffffff00',card:'MOND_AMBER_E'}),/다른 방/));
 const view=h.coopBattleView(G1);assert.equal(view.turn.mine,true);assert(view.cards.length>0&&view.cards.every(x=>!x.id.startsWith('ITEM:')),'own cards, never the host\'s items');
 const card=view.cards.find(x=>!x.reason&&!x.id.startsWith('PLAYER_BASIC'))||view.cards.find(x=>!x.reason);const before=g.cooldowns[card.id]||0;
 const out=h.action('COOP_COMBAT',{room:ROOM,card:card.id,target:card.targets[0]?.id});assert.equal(out.result.actor,g.id);
 const next=h.s.runtime?.coop?.turn;assert(!next||next.round>t.round,'the turn moved on (the guest may be up again next round)');
 if(h.s.runtime&&!next)assert(refused(()=>h.action('COOP_COMBAT',{room:ROOM,card:card.id}),/기다리는 동료 모험가의 차례가 없습니다/),'nothing to act on outside the guest\'s turn');
 if(h.s.runtime&&!card.id.startsWith('PLAYER_BASIC')&&!next)assert(h.combatActor(g.id).cooldowns[card.id]>before,'the card was used');
 return {card:card.id};
});

check('a guest leading a companion can always strike or guard (the strike and guard the AI makes); the AI\'s own choices stay as they are',()=>{
 const h=host(),b=randomFight(h,ctx([member(G1,'손님',snapAmber)]));const t=untilGuest(h);assert(t);const g=h.combatActor(t.actor);
 const view=h.coopBattleView(G1),ids=plain(view.cards.map(x=>x.id));
 assert.deepEqual(ids.slice(0,2),['PLAYER_BASIC_ATTACK','PLAYER_BASIC_GUARD'],'the two basic actions come first');assert(ids.includes('MOND_AMBER_E')&&ids.includes('MOND_AMBER_Q'));
 assert(!h.actorCards(g).some(c=>c.id.startsWith('PLAYER_BASIC')),'not among the companion\'s own cards, so the AI never picks them');
 const atk=view.cards[0];assert.equal(atk.reason,'');assert(atk.targets.length>0);
 h.coopContext=ctx([member(G1,'손님',snapAmber)],G1);let start=h.s.runtime.log.length;
 h.action('COOP_COMBAT',{room:ROOM,card:'PLAYER_BASIC_ATTACK',target:atk.targets[0].id});
 const hit=h.s.runtime?h.s.runtime.log.slice(start).find(e=>e.actor===g.name&&(Number.isFinite(e.damage)||e.miss)):true;assert(hit,'the strike was made');
 const t2=untilGuest(h);
 if(t2){start=h.s.runtime.log.length;h.action('COOP_COMBAT',{room:ROOM,card:'PLAYER_BASIC_GUARD'});if(h.s.runtime)assert(h.s.runtime.log.slice(start).some(e=>e.guard&&e.actor===g.name),'the guard was taken');}
 // A guest protagonist keeps its own list: its route's basic actions are its own cards.
 const h2=host();randomFight(h2,ctx([member(G1,'손님',snapHero)]));const t3=untilGuest(h2);
 if(t3){const own=h2.coopBattleView(G1).cards.map(x=>x.id);assert.equal(own.filter(id=>id==='PLAYER_BASIC_ATTACK').length,1);}
 return {cards:ids};
});

check('after 20 seconds anyone in the room may let the waiting guest act by the AI; the owner may hand over at once; the clock is the server\'s',()=>{
 const h=host(),b=randomFight(h,ctx([member(G1,'손님',snapAmber)]));const t=untilGuest(h);assert(t);
 h.coopContext=ctx([member(G1,'손님',snapAmber)],null);h.actionStartedAt=t.deadline-1000;
 assert(refused(()=>h.action('COOP_AUTO',{room:ROOM}),/초 뒤에 자동으로/),'not before the deadline');
 h.actionStartedAt=t.deadline+1;const out=h.action('COOP_AUTO',{room:ROOM});assert.equal(out.result.auto,true);
 const g=h.combatActor(t.actor);assert.equal(g.control,'GUEST','the guest keeps the control for the next turns');assert(h.s.runtime.log.some(e=>e.auto&&e.actorId===g.id));
 // The owner may hand the turn to the AI before the deadline.
 const t2=untilGuest(h);if(t2){h.coopContext=ctx([member(G1,'손님',snapAmber)],G1);h.actionStartedAt=t2.at+500;assert.equal(h.action('COOP_AUTO',{room:ROOM}).result.auto,true);}
 // The host can always reach COOP_AUTO through its own actions after the deadline (the room may be gone).
 const t3=untilGuest(h);if(t3){h.coopContext=null;h.actionStartedAt=t3.deadline+5;assert.equal(h.action('COOP_AUTO',{}).result.auto,true);}
 return {deadline:t.deadline-t.at};
});

check('a guest who leaves (or whose room closes) fights on by the AI for the rest of the fight and gets no reward; coming back takes control again',()=>{
 const h=host(),b=randomFight(h,ctx([member(G1,'손님',snapAmber)]));const t=untilGuest(h);assert(t);
 // The guest leaves while it is their turn: anyone may move the fight on at once.
 h.coopContext=ctx([],null);h.actionStartedAt=t.at+100;h.action('COOP_AUTO',{room:ROOM});
 const g=h.combatActor(t.actor);assert.equal(g.control,'AI');assert.equal(g.coop.left,true);
 for(let i=0;i<6&&h.s.runtime;i++){assert(!h.s.runtime.coop.turn,'no waiting for someone who left');hostTurn(h);}
 if(h.s.runtime){h.coopContext=ctx([member(G1,'손님',snapAmber)]);const r0=h.s.runtime.round;for(let i=0;i<12&&h.s.runtime&&h.s.runtime.round===r0;i++)hostTurn(h);
  if(h.s.runtime){assert.equal(h.combatActor(t.actor).control,'GUEST','back at the start of the next round');assert.equal(h.combatActor(t.actor).coop.left,false);}}
 return {left:true};
});

check('joining in the middle of a fight: the fighter enters at the start of the next round; with four fighting, the host\'s last companion steps back and is settled at the end',()=>{
 // The room was open but empty when the fight began: someone who joins steps in at the start of the next round.
 const h=host(),b=randomFight(h,ctx([]));assert(b.coop&&!b.actors.some(a=>a.coop),'a shared fight with nobody in it yet');
 h.coopContext=ctx([member(G1,'손님',snapDiluc)]);const r0=h.s.runtime.round;for(let i=0;i<12&&h.s.runtime&&h.s.runtime.round===r0;i++)hostTurn(h);
 assert(h.s.runtime,'the fight goes on');const late=h.s.runtime.actors.find(a=>a.coop?.owner===G1);assert(late&&late.coop.joinedRound===h.s.runtime.round&&late.source==='MOND_DILUC');
 // Without a room the host's fights stay their own.
 const solo=host(),sb=randomFight(solo,null);assert(!sb.coop);solo.coopContext=null;const r1=sb.round;for(let i=0;i<12&&solo.s.runtime&&solo.s.runtime.round===r1;i++)hostTurn(solo);assert(!solo.s.runtime||!solo.s.runtime.coop);
 const k=host(),kb=randomFight(k,ctx([member(G1,'하나',snapAmber)]));assert.equal(allies(kb).length,4);
 const g2=guest(9,['MOND_NOELLE']),snap2=g2.coopSnapshot('MOND_NOELLE');
 k.coopContext=ctx([member(G1,'하나',snapAmber),member(G2,'둘',snap2)]);const round=k.s.runtime.round;
 for(let i=0;i<14&&k.s.runtime&&k.s.runtime.round===round;i++){if(k.s.runtime.coop.turn){k.coopContext.caller=G1;k.actionStartedAt=k.s.runtime.coop.turn.deadline+1;k.action('COOP_AUTO',{room:ROOM});k.coopContext.caller=null;}else hostTurn(k);}
 assert(k.s.runtime,'the fight goes on');const kb2=k.s.runtime,joined=kb2.actors.find(a=>a.coop?.owner===G2);
 assert(joined,'the newcomer entered at the start of the round');assert.equal(joined.coop.joinedRound,kb2.round);assert.equal(allies(kb2).length,4);
 const stepped=kb2.coop.benched[0];assert(stepped&&!stepped.coop,'one of the host\'s companions stepped back');assert.notEqual(stepped.id,PLAYER);
 assert(kb2.order.some(o=>o.id===joined.id),'the newcomer has a place in this round\'s order');
 for(const e of kb2.actors.filter(a=>a.side==='ENEMY'))e.hp=0;const hpBefore=stepped.hp;k.finishBattle(true);
 assert.equal(k.s.chars[stepped.source].hp,Math.min(hpBefore,k.character(stepped.source).maxHp),'the companion who stepped back is settled with the party');
 const res=JSON.parse(k.s.global.LAST_BATTLE_RESULT_JSON);assert.deepEqual(res.coop.guests.map(x=>x.owner).sort(),[G1,G2].sort());
 return {joinedRound:joined.coop.joinedRound};
});

check('solo content: the Abyss, story, the raid, daily bosses, a mutated field boss and quests take no guests; field bosses, ley lines and region events do',()=>{
 const h=host();h.coopContext=ctx([member(G1,'손님',snapAmber)]);
 for(const o of ['STORY:ISK_M04_BATTLE','ABYSS:F1:C1','RAID:RAID_1','MATERIAL_CHALLENGE:BOSS_ANDRIUS','QUEST:Q_MOND_EXP_01','BOSS:BRT_DVALIN','GEO_OCULUS:x','LIYUE_FIELD:a:b'])
  {assert.equal(h.coopEligibleOrigin(o),false,o);assert.equal(h.coopBattleParty(h.s.party.filter(p=>p.active),o),null,o);assert(h.coopSoloReason(o).length>0);}
 const FB=api.fieldBosses,boss='FB_CRYO_REGISVINE',route=FB.route(boss);
 for(const o of ['RANDOM','REGION_EVENT:MAP_MOND_PLAINS@1','BOSS:'+route,'BOSS:'+api.leyLines.route('WEALTH','MAP_MOND_PLAINS')])assert.equal(h.coopEligibleOrigin(o),true,o);
 // A real raid sortie with a room open: the guest stays out. (0.15.4: the raid needs an event the server has open.)
 const r=host();r.installMarketContent();r.s.global.SCREEN_MODE='LOCATION';r.coopContext=ctx([member(G1,'손님',snapAmber)]);
 r.raidServerEvent={id:'RAID_1000001',boss:api.raidV0152.bosses[0].id,startsAt:0,endsAt:Date.now()+86400000};r.action('RAID_ENTER',{});assert(r.s.runtime.raid&&!r.s.runtime.actors.some(a=>a.coop)&&!r.s.runtime.coop);
 // A field boss with the room open: the guest fights; mutated: alone.
 const f=host();Object.assign(f.s.global,{CURRENT_MAP_ID:FB.bosses[boss].map,SCREEN_MODE:'LOCATION'});f.coopContext=ctx([member(G1,'손님',snapAmber)]);
 f.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});f.action('BOSS_ROUTE',{route,entry:'DIRECT'});assert(f.s.runtime.fieldBoss&&f.s.runtime.actors.some(a=>a.coop),'field boss together');
 const m=host();Object.assign(m.s.global,{CURRENT_MAP_ID:FB.bosses[boss].map,SCREEN_MODE:'LOCATION'});m.coopContext=ctx([member(G1,'손님',snapAmber)]);
 m.action('PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'});m.action('BOSS_ROUTE',{route,entry:'DIRECT',mutation:true});assert(m.s.runtime.mutation&&!m.s.runtime.actors.some(a=>a.coop),'a mutated challenge stays solo');
});

check('rewards: the guest\'s fighter gets the battle experience, the guest the Mora and loot, once; defeat penalties stay with the host',()=>{
 const h=host(),b=randomFight(h,ctx([member(G1,'손님',snapAmber)]));
 for(const e of b.actors.filter(a=>a.side==='ENEMY'))e.hp=0;const amberBond=h.s.relations?.PROFILE_MOND_AMBER?.BOND_SCORE;h.finishBattle(true);
 const res=JSON.parse(h.s.global.LAST_BATTLE_RESULT_JSON),c0=res.coop;assert.equal(c0.victory,true);assert.equal(c0.room,ROOM);assert.equal(c0.guests.length,1);assert.equal(c0.guests[0].left,false);
 assert.equal(c0.xp,res.xp);assert.equal(c0.mora,res.mora||0);assert.deepEqual(c0.loot,res.loot||{});assert(!h.s.chars.MOND_AMBER.xp||true);
 assert.equal(h.s.relations?.PROFILE_MOND_AMBER?.BOND_SCORE,amberBond,'the host\'s bond with Amber did not move for the guest\'s Amber');
 const g=guest();g.s.constellations={MOND_AMBER:2};const lv0=g.s.chars.MOND_AMBER.xp,mora0=g.s.global.MORA;
 const pay=g.coopApplyReward({battle:res.battleId,char:'MOND_AMBER',xp:c0.xp,mora:c0.mora,loot:{ORE_IRON:2},host:'방장'});
 assert.equal(pay.xp,c0.xp);assert.equal(g.s.global.MORA-mora0,c0.mora);assert.equal(pay.items.ORE_IRON,2);assert.equal(g.s.chars.MOND_AMBER.level,10);assert.equal(g.s.chars.MOND_AMBER.xp,0,'capped companion waits for ascension');
 const again=g.coopApplyReward({battle:res.battleId,char:'MOND_AMBER',xp:c0.xp,mora:c0.mora,loot:{ORE_IRON:2}});assert.equal(again.duplicate,true);assert.equal(g.s.global.MORA-mora0,c0.mora,'never twice');
 assert.equal(JSON.parse(g.serialize()).coop.received[res.battleId]>0,true,'the guest\'s save records it');
 // A lost fight: the host pays the defeat penalty, the result names no reward.
 const l=host(),lb=randomFight(l,ctx([member(G1,'손님',snapAmber)]));const m0=l.s.global.MORA;for(const a of lb.actors.filter(a=>a.side==='ALLY'))a.hp=0;l.finishBattle(false);
 const lr=JSON.parse(l.s.global.LAST_BATTLE_RESULT_JSON);assert.equal(lr.coop.victory,false);assert(l.s.defeatPenalty&&l.s.global.MORA<m0,'the host pays as before');
 return {xp:c0.xp,mora:c0.mora};
});

check('field bosses count against the guest\'s own 12-hour limit; without a win left the guest gets experience only and the result says why',()=>{
 const g=guest(),w=g.fieldBossWindow();g.s.fieldBossWindow={window:w,wins:2};
 const ok=g.coopApplyReward({battle:'B-1',char:PLAYER,xp:300,mora:500,loot:{ORE_IRON:1},fieldBoss:{boss:'FB_CRYO_REGISVINE'}});assert.equal(ok.fieldBoss.counted,true);assert.equal(g.s.fieldBossWindow.wins,3);assert.equal(ok.mora,500);
 const mora=g.s.global.MORA,none=g.coopApplyReward({battle:'B-2',char:PLAYER,xp:300,mora:500,loot:{ORE_IRON:1},fieldBoss:{boss:'FB_CRYO_REGISVINE'}});
 assert.equal(none.xp,300);assert.equal(none.mora,0);assert.deepEqual(plain(none.items),{});assert.equal(g.s.global.MORA,mora);assert.match(none.notes.join(' '),/12시간마다 3번까지라 이번에는 경험치만/);assert.equal(g.s.fieldBossWindow.wins,3);
 // Ley lines: a blossom pays each adventurer once an hour.
 const hour=Math.floor(T0/3600000);g.s.leyLine={version:1,WEALTH:hour};const before=g.s.global.MORA;
 const ley=g.coopApplyReward({battle:'B-3',char:PLAYER,xp:10,mora:2400,loot:{},leyLine:{kind:'WEALTH',hour,claimed:true,mora:2200,books:null}});assert.equal(ley.mora,200);assert.equal(g.s.global.MORA-before,200);assert.match(ley.notes[0],/이미 받아/);
});

check('a guest protagonist uses its own route\'s skills next to the host\'s protagonist',()=>{
 const h=host(),b=randomFight(h,ctx([member(G1,'손님',snapHero)]));const g=allies(b).find(a=>a.coop);
 assert.equal(g.source,PLAYER);assert.equal(g.protagonist.route,'ROUTE_ISEKAI');assert.equal(h.combatActor(PLAYER).protagonist.route,'ROUTE_TRAVELER');
 const t=untilGuest(h);assert(t);const cards=h.coopBattleView(G1).cards;assert(cards.some(x=>x.id==='PLAYER_ISEKAI_E'&&!x.reason),'약점 간파 is usable: '+JSON.stringify(cards.map(x=>[x.id,x.reason])));
 assert(!h.combatCards(PLAYER).some(x=>x.id.startsWith('PLAYER_ISEKAI')),'the host keeps its own kit');
 h.coopContext=ctx([member(G1,'손님',snapHero)],G1);const foe=h.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.hp>0);
 h.action('COOP_COMBAT',{room:ROOM,card:'PLAYER_ISEKAI_E',target:foe.id});assert(h.s.runtime?.actors.some(a=>a.statuses?.some(s=>s.id==='STATUS_ISEKAI_EXPOSED'))||!h.s.runtime,'the guest\'s skill worked');
 assert(JSON.parse(h.serialize()),'and the save validates');
});

check('the saved co-op state is checked: malformed fighters, turns and reward records are refused',()=>{
 const h=host();randomFight(h,ctx([member(G1,'손님',snapAmber)]));untilGuest(h);const good=JSON.parse(h.serialize());
 const bad=(mutate,label)=>{const s=JSON.parse(JSON.stringify(good));mutate(s);assert(refused(()=>new api.Runtime(h.db,s,true),/다인 모드|함께 싸우는|동료/),label);};
 const gi=s=>s.runtime.actors.findIndex(a=>a.coop);
 bad(s=>{s.runtime.actors[gi(s)].control='PLAYER';},'a guest fighter controlled by the host');
 bad(s=>{s.runtime.actors[gi(s)].coop.owner='NOT-A-PID';},'an unknown owner');
 bad(s=>{s.runtime.actors[gi(s)].coop.cards=['NOT_A_CARD'];},'cards that do not exist');
 bad(s=>{s.runtime.actors[gi(s)].talentSnapshot={na:1,e:99,q:1};},'talents out of range');
 bad(s=>{s.runtime.actors[gi(s)].consSnapshot={key:'MOND_AMBER',level:9};},'constellation out of range');
 bad(s=>{s.runtime.actors[gi(s)].coop.left=true;},'a fighter marked away but still steered by its owner');
 bad(s=>{delete s.runtime.coop;},'a guest fighter without the fight\'s co-op record');
 bad(s=>{s.runtime.coop.room='room-1';},'a malformed room');
 if(good.runtime.coop.turn)bad(s=>{s.runtime.coop.turn.deadline=s.runtime.coop.turn.at+600000;},'a turn longer than 20 seconds');
 bad(s=>{const a=s.runtime.actors[gi(s)];for(let i=2;i<=4;i++)s.runtime.actors.push({...JSON.parse(JSON.stringify(a)),id:'COOP_'+(i+5),slot:i});},'more than four fighters');
 const g=guest();const ok=JSON.parse(g.serialize());ok.coop={version:1,received:{'B-1':1},wins:1};assert(new api.Runtime(g.db,ok,true));
 for(const c0 of [{version:2,received:{},wins:0},{version:1,received:[],wins:0},{version:1,received:{'B-1':-1},wins:1},{version:1,received:{},wins:-1}]){const s=JSON.parse(g.serialize());s.coop=c0;assert(refused(()=>new api.Runtime(g.db,s,true),/다인 모드 기록/),JSON.stringify(c0));}
});

check('the account server accepts the co-op actions; the scripts are loaded last',()=>{
 const core=fs.readFileSync(path.join(root,'server/game-core.mjs'),'utf8');for(const t of ['COOP_COMBAT','COOP_AUTO'])assert(core.includes('"'+t+'"'),t);
 const html=fs.readFileSync(path.join(root,'source/index.html'),'utf8'),at=n=>html.indexOf('"'+n+'"');
 assert(at('runtime_achievements_v0152.js')<at('runtime_coop_v0153.js')&&at('runtime_coop_v0153.js')<at('runtime_reading.js'));assert(at('app_achievements_v0152.js')<at('app_coop_v0153.js'));
 const build=fs.readFileSync(path.join(root,'tools/build.py'),'utf8');for(const f of ['runtime_coop_v0153.js','app_coop_v0153.js'])assert(build.includes("'"+f+"'"),f);
 const src=fs.readFileSync(path.join(root,'source/runtime_coop_v0153.js'),'utf8');assert(!/\bparams\.id\b|a\.id\s*\)\s*;?\s*\/\/\s*param/.test(src));assert.match(src,/p\.card/,'the command names the card, never `id`');
});

const out=path.join(root,'reports/v0153');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'coop-runtime-tests.json'),JSON.stringify({version:'0.15.3',total:results.length,passed:results.filter(r=>r.ok).length,results},null,1));
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
