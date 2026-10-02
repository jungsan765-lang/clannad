// 0.15.3 다인 모드 on the Seoul account server (server/coop-v0153.mjs): rooms (open, list, join, invite, kick, leave, close),
// a guest fighter in a real random encounter, commands only from the right guest on their own turn, the 20-second auto
// turn, joining mid-fight, rewards paid into both saves exactly once (replays included), the guest's field-boss limit,
// solo-only content, the Lv.5 rule, events for room members only, the profile card and the operator's rollback.
import assert from 'node:assert/strict';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';

const pepper='server-coop-v0153-test-pepper-'.padEnd(64,'c'),password='correct-horse-battery-coop';
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port,store=app.store;
async function api(path,{body,token}={}){
 const headers={};if(token)headers.authorization='Bearer '+token;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
const checks=[];const check=(name,fn)=>{store.rates.clear();return fn().then(()=>{checks.push(name);console.log('PASS '+name);});};
const edit=(p,fn)=>app.adminConsole.editSave(p.row,r=>{const out=typeof fn==='function'?fn(r):app.adminConsole.applyOps(r,fn);if(r.s.mail?.list.some(x=>x.kind==='GIFT'&&!x.claimed))r.mailClaim('ALL');return out;},'test');
const rt=p=>store.runtimeOf(p.row.id);
let seq=0;
async function act(p,type,params={}){const m=store.meta(p.row.id),body={version:p.version,engineVersion:p.engineVersion,type,params,revision:m.revision,requestId:'coop-test-'+String(++seq).padStart(6,'0'),responseMode:'state-parts-v1'};return {...await api('/game/action',{token:p.token,body}),body};}
async function player(username,display,{level=10,route='ROUTE_TRAVELER',recruit=[],party=[],ops=[]}={}){
 store.rates.clear();const reg=await api('/register',{body:{username,password,displayName:display}});assert.equal(reg.status,200,JSON.stringify(reg.json));const token=reg.json.token;
 const created=await api('/game/new',{token,body:{name:display,route}});assert.equal(created.status,200);
 const p={token,row:store.account(username),version:created.json.version,engineVersion:created.json.engineVersion,name:display};
 await edit(p,[{op:'level',target:'PLAYER_CUSTOM',value:level},{op:'teleport',map:'MAP_MOND_CITY'},...recruit.map(char=>({op:'recruit',char})),...ops]);
 for(const [i,char] of party.entries())assert.equal((await act(p,'PARTY',{char,slot:i+2})).status,200);
 p.pid=(await api('/coop/room',{token})).json.me.pid;return p;
}
// An SSE reader collecting what one account receives.
async function listen(p){
 const res=await fetch(base+'/chat/stream',{headers:{authorization:'Bearer '+p.token}});assert.equal(res.status,200);
 const reader=res.body.getReader(),dec=new TextDecoder(),events=[];let buf='',stop=false;
 (async()=>{try{while(!stop){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n\n'))>=0){const block=buf.slice(0,i);buf=buf.slice(i+2);const data=block.split('\n').filter(l=>l.startsWith('data: ')).map(l=>l.slice(6)).join('\n');if(data)try{events.push(JSON.parse(data));}catch{}}}}catch{}})();
 return {events,close:()=>{stop=true;reader.cancel().catch(()=>{});},wait:async(test,ms=3000)=>{const t=Date.now();while(Date.now()-t<ms){const e=events.find(test);if(e)return e;await new Promise(r=>setTimeout(r,20));}throw new Error('no event');}};
}
const room=p=>api('/coop/room',{token:p.token});
const battle=p=>rt(p).s.runtime;
// The host's own turn: a basic attack on a living enemy, or a guard.
async function hostTurn(h){const r=rt(h),foe=r.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.hp>0),atk=r.combatCards().find(x=>x.id==='PLAYER_BASIC_ATTACK'&&!x.reason);const out=await act(h,'COMBAT',atk&&foe?{card:atk.id,target:atk.targets[0]?.id||foe.id}:{card:'PLAYER_BASIC_GUARD'});assert.equal(out.status,200,JSON.stringify(out.json).slice(0,300));return out;}
// Moves the host until a guest's fighter is up; guests not under test are played by their owner handing the turn over.
async function untilTurnOf(h,owner,members,max=40){
 for(let i=0;i<max;i++){const b=battle(h);if(!b)return null;const t=b.coop?.turn;if(t&&t.owner===owner)return t;
  if(t){const m=members.find(x=>x.pid===t.owner);assert(m,'a member owns the waiting fighter');assert.equal((await api('/coop/auto',{token:m.token,body:{}})).status,200);}else await hostTurn(h);}
 return null;
}
const tough=h=>edit(h,r=>{for(const e of r.s.runtime.actors.filter(a=>a.side==='ENEMY')){e.maxHp*=40;e.hp=e.maxHp;}});
const fell=h=>edit(h,r=>{for(const e of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))e.hp=0;});
// A random encounter through real moves: back and forth between Mond City and a wild neighbour.
async function encounter(h){
 const r0=rt(h),city=r0.s.global.CURRENT_MAP_ID,edges=m=>r0.rows('47_MAP_EDGE_DB').filter(e=>e[1]===m&&e[11]==='ACTIVE'&&e[8]==='Y'&&!e[6]);
 const out=edges(city).find(e=>{const t=r0.tables['32_MAP_DB'].get(e[2]);return t&&t[8]==='Y'&&t[12]!=='Y'&&edges(e[2]).some(x=>x[2]===city);});assert(out,'a wild neighbour of the city');const back=edges(out[2]).find(x=>x[2]===city);
 for(let i=0;i<120;i++){const r=rt(h);if(r.s.runtime)return r.s.runtime;const res=await act(h,'MOVE',{edge:r.s.global.CURRENT_MAP_ID===city?out[0]:back[0]});assert.equal(res.status,200,JSON.stringify(res.json).slice(0,300));}
 throw new Error('no random encounter in 120 moves');
}

const lv=(ids,value)=>ids.map(target=>({op:'level',target,value}));
const H=await player('coop_host','방장님',{level:12,recruit:['MOND_AMBER','MOND_KAEYA','MOND_LISA'],party:['MOND_AMBER','MOND_KAEYA','MOND_LISA'],ops:lv(['MOND_AMBER','MOND_KAEYA','MOND_LISA'],12)});
const G1=await player('coop_guest1','첫손님',{level:10,route:'ROUTE_ISEKAI',recruit:['MOND_AMBER','MOND_DILUC'],ops:[...lv(['MOND_AMBER'],10),{op:'constellation',char:'MOND_AMBER',value:2},{op:'talent',char:'MOND_AMBER',kind:'e',value:4}]});
const G2=await player('coop_guest2','둘째손님',{level:9});
const G3=await player('coop_guest3','셋째손님',{level:11,recruit:['MOND_NOELLE'],ops:lv(['MOND_NOELLE'],11)});
const G4=await player('coop_guest4','넷째손님',{level:8});
const LOW=await player('coop_low','새내기',{level:4});
let ROOM=null;

await check('the capability and the Lv.5 rule: a protagonist under Lv.5 can neither open a room nor join one',async()=>{
 assert((await api('/health')).json.capabilities.includes('coop-v1'));
 const open=await api('/coop/open',{token:LOW.token,body:{visibility:'PUBLIC'}});assert.equal(open.status,403);assert.equal(open.json.code,'LEVEL');assert.match(open.json.error,/Lv\.5부터/);
});

await check('rooms: open (public), list, join with a character of one\'s own (read from one\'s own save), at most three guests',async()=>{
 const opened=await api('/coop/open',{token:H.token,body:{visibility:'PUBLIC'}});assert.equal(opened.status,200,JSON.stringify(opened.json));ROOM=opened.json.room.id;assert.match(ROOM,/^R[a-f0-9]{12}$/);
 assert.equal(opened.json.room.you,'HOST');assert.equal(opened.json.room.host.char.level,12);
 assert.equal((await api('/coop/open',{token:H.token,body:{visibility:'PUBLIC'}})).json.room.id,ROOM,'one room per host');
 const list=(await api('/coop/list',{token:G1.token})).json;assert(list.rooms.some(x=>x.id===ROOM&&x.host.name==='방장님'&&x.count===0));
 const low=await api('/coop/join',{token:LOW.token,body:{room:ROOM}});assert.equal(low.status,403);assert.match(low.json.error,/Lv\.5부터/);
 const notJoined=await api('/coop/join',{token:G1.token,body:{room:ROOM,char:'MOND_VENTI'}});assert.equal(notJoined.status,403);assert.match(notJoined.json.error,/합류한 동료/);
 const j1=await api('/coop/join',{token:G1.token,body:{room:ROOM,char:'MOND_AMBER'}});assert.equal(j1.status,200,JSON.stringify(j1.json));
 const me=j1.json.room.members.find(m=>m.me);assert.equal(me.char.name,'엠버');assert.equal(me.char.constellation,2);assert.equal(me.char.level,10);assert.equal(j1.json.room.you,'GUEST');
 const taken=await api('/coop/join',{token:G2.token,body:{room:ROOM,char:'MOND_AMBER'}});assert.notEqual(taken.status,200,'G2 has no Amber anyway');
 assert.equal((await api('/coop/join',{token:G2.token,body:{room:ROOM,char:'PLAYER_CUSTOM'}})).status,200);
 assert.equal((await api('/coop/join',{token:G3.token,body:{room:ROOM,char:'PLAYER_CUSTOM'}})).status,200,'protagonists may be brought by everyone');
 const full=await api('/coop/join',{token:G4.token,body:{room:ROOM}});assert.equal(full.status,409);assert.match(full.json.error,/가득 찼습니다/);
 const twice=await api('/coop/open',{token:G1.token,body:{}});assert.equal(twice.status,409,'a guest cannot open a second room');
 const st=(await room(H)).json;assert.equal(st.room.count,3);assert.deepEqual(st.room.members.map(m=>m.name),['첫손님','둘째손님','셋째손님']);
});

await check('leaving and kicking: members go, the kicked guest is told, others in the room are told, outsiders hear nothing',async()=>{
 const sH=await listen(H),s3=await listen(G3),s4=await listen(G4);
 try{
  const kick=await api('/coop/kick',{token:H.token,body:{pid:G3.pid}});assert.equal(kick.status,200);assert.equal(kick.json.room.count,2);
  const told=await s3.wait(e=>e.type==='coop'&&e.kind==='kicked');assert.match(told.reason,/내보냈습니다/);
  await sH.wait(e=>e.type==='coop'&&e.room?.count===2);
  assert.equal((await api('/coop/kick',{token:G1.token,body:{pid:G2.pid}})).status,403,'only the host kicks');
  assert.equal((await api('/coop/leave',{token:G2.token,body:{}})).status,200);assert.equal((await room(H)).json.room.count,1);
  assert.equal((await room(G2)).json.room,null);
  await new Promise(r=>setTimeout(r,80));assert(!s4.events.some(e=>e.type==='coop'),'not a member: no room news');
 }finally{sH.close();s3.close();s4.close();}
 assert.equal((await api('/coop/join',{token:G2.token,body:{room:ROOM,char:'PLAYER_CUSTOM'}})).status,200,'and come back');
});

await check('invite-only: only invited adventurers (online) get in; an invitation arrives on their stream',async()=>{
 assert.equal((await api('/coop/open',{token:H.token,body:{visibility:'INVITE'}})).json.room.visibility,'INVITE');
 assert(!(await api('/coop/list',{token:G4.token})).json.rooms.some(x=>x.id===ROOM),'not in the public list');
 assert.equal((await api('/coop/join',{token:G4.token,body:{room:ROOM}})).status,403);
 const offline=await api('/coop/invite',{token:H.token,body:{pid:G4.pid}});assert.equal(offline.status,409);assert.match(offline.json.error,/접속해 있지 않습니다/);
 const s4=await listen(G4);
 try{const inv=await api('/coop/invite',{token:H.token,body:{pid:G4.pid}});assert.equal(inv.status,200,JSON.stringify(inv.json));const e=await s4.wait(x=>x.type==='coop'&&x.kind==='invite');assert.equal(e.invite.room,ROOM);
  assert((await api('/coop/list',{token:G4.token})).json.rooms.some(x=>x.id===ROOM&&x.invited));
  const prof=(await api('/profile?pid='+H.pid,{token:G4.token})).json.coop;assert.equal(prof.hosting,true);assert.equal(prof.invited,true);
  const mine=(await api('/profile?pid='+G4.pid,{token:H.token})).json.coop;assert.equal(mine.canInvite,true,'「같이 하기」 from the host\'s side invites');
  assert.equal((await api('/coop/decline',{token:G4.token,body:{room:ROOM}})).status,200);assert.equal((await api('/coop/join',{token:G4.token,body:{room:ROOM}})).status,403,'a declined invitation is gone');
 }finally{s4.close();}
 assert.equal((await api('/coop/open',{token:H.token,body:{visibility:'PUBLIC'}})).json.room.visibility,'PUBLIC');
});

await check('between fights a guest\'s fighter follows their own save: a level gained shows in the room after their next step',async()=>{
 const level=async()=>(await room(H)).json.room.members.find(m=>m.name==='첫손님').char.level;
 await edit(G1,[{op:'level',target:'MOND_AMBER',value:11}]);assert.equal(await level(),10,'an operator edit alone changes nothing yet');
 assert.equal((await act(G1,'PARTY',{char:'MOND_AMBER',slot:2})).status,200);assert.equal(await level(),11,'the guest\'s own next step refreshes the fighter');
 await edit(G1,[{op:'level',target:'MOND_AMBER',value:10}]);assert.equal((await act(G1,'PARTY',{char:'MOND_DILUC',slot:3})).status,200);assert.equal(await level(),10);
});

let FIRST=null;
await check('a real random encounter: the guest\'s fighter joins with its own stats; the host keeps the protagonist; room members get their own battle view',async()=>{
 const s1=await listen(G1),s4=await listen(G4);
 try{
  await room(G1);await room(G2);
  const b=await encounter(H);assert(b.coop?.room===ROOM,'a shared fight');
  const guests=b.actors.filter(a=>a.coop);assert.equal(guests.length,2);const amber=guests.find(a=>a.coop.owner===G1.pid),own=rt(G1).character('MOND_AMBER');
  assert(amber,'G1\'s Amber');assert.equal(amber.level,10);assert.equal(amber.atk,Math.round(own.atk*100)/100);assert.equal(amber.def,Math.round(own.def*100)/100);assert.equal(amber.consSnapshot.level,2);assert.equal(amber.talentSnapshot.e,4);
  assert.equal(b.actors.filter(a=>a.side==='ALLY'&&a.source==='MOND_AMBER').length,1,'the host\'s Amber stepped back');
  assert(b.actors.some(a=>a.id==='PLAYER_CUSTOM'&&a.control==='PLAYER'));assert(b.actors.filter(a=>a.side==='ALLY').length<=4);
  const ev=await s1.wait(e=>e.type==='coop'&&e.battle?.battle===b.id);assert.equal(ev.battle.me.id,amber.id);assert(!('global' in ev.battle)&&!JSON.stringify(ev).includes('PRNG_STATE'),'a battle view, never the save');
  await new Promise(r=>setTimeout(r,60));assert(!s4.events.some(e=>e.type==='coop'&&e.battle),'outsiders get nothing');
  await tough(H);assert.equal((await act(H,'COMBAT_BEGIN',{battle:b.id})).status,200);FIRST=b.id;
 }finally{s1.close();s4.close();}
});

await check('only that guest acts, only on that turn: the host and other members are refused; a repeated command is not applied twice',async()=>{
 const t=await untilTurnOf(H,G1.pid,[G1,G2]);assert(t,'G1\'s turn came');
 const host=await hostTurn(H).catch(e=>e);assert(host instanceof Error&&/첫손님 님의 차례/.test(host.message),'the host waits: '+host?.message);
 const forged=await act(H,'COOP_COMBAT',{room:ROOM,card:'MOND_AMBER_E'});assert.equal(forged.status,400);assert.match(forged.json.error,/첫손님 님의 차례/,'the host cannot act for a guest');
 const other=await api('/coop/act',{token:G2.token,body:{card:'MOND_AMBER_E'}});assert.equal(other.status,400);assert.match(other.json.error,/첫손님 님의 차례/);
 const outsider=await api('/coop/act',{token:G4.token,body:{card:'MOND_AMBER_E'}});assert.equal(outsider.status,404);
 const view=(await room(G1)).json.battle;assert.equal(view.turn.mine,true);const card=view.cards.find(x=>!x.reason);assert(card,'a usable card');
 const rev=store.meta(H.row.id).revision,body={card:card.id,target:card.targets[0]?.id,requestId:'coop-act-test-0001'};
 const done=await api('/coop/act',{token:G1.token,body});assert.equal(done.status,200,JSON.stringify(done.json));assert.equal(store.meta(H.row.id).revision,rev+1,'applied to the host\'s save');
 const again=await api('/coop/act',{token:G1.token,body});assert.equal(again.status,200);assert.equal(again.json.replayed,true);assert.equal(store.meta(H.row.id).revision,rev+1,'not twice');
 const rc=store.db.prepare("SELECT * FROM receipts WHERE account_id=? AND request_id LIKE 'coop-coopcombat-%'").all(H.row.id);assert.equal(rc.length,1);
});

await check('after 20 seconds (server clock) any member may let the waiting fighter act by the AI; a member who leaves is not waited for',async()=>{
 const t=await untilTurnOf(H,G2.pid,[G1,G2]);assert(t,'G2\'s turn came');
 const early=await api('/coop/auto',{token:G1.token,body:{}});assert.equal(early.status,400);assert.match(early.json.error,/초 뒤에 자동으로/);
 const hostEarly=await api('/coop/auto',{token:H.token,body:{}});assert.equal(hostEarly.status,400);
 const real=Date.now;Date.now=()=>real()+21000;
 try{const late=await api('/coop/auto',{token:G1.token,body:{}});assert.equal(late.status,200,JSON.stringify(late.json));}finally{Date.now=real;}
 const g2=battle(H).actors.find(a=>a.coop?.owner===G2.pid);assert.equal(g2.control,'GUEST','still G2\'s to command later');
 // G2 leaves while it is their turn: the fight moves on at once and G2's fighter fights on by the AI.
 const t2=await untilTurnOf(H,G2.pid,[G1,G2]);assert(t2);
 assert.equal((await api('/coop/leave',{token:G2.token,body:{}})).status,200);await store.coopSettled();
 const b=battle(H);assert(!b.coop.turn||b.coop.turn.owner!==G2.pid,'not waiting for someone who left');const left=b.actors.find(a=>a.coop?.owner===G2.pid);assert.equal(left.control,'AI');assert.equal(left.coop.left,true);
});

await check('joining mid-fight: the newcomer enters at the start of the next round',async()=>{
 assert.equal((await api('/coop/join',{token:G3.token,body:{room:ROOM,char:'MOND_NOELLE'}})).status,200);
 const r0=battle(H).round;for(let i=0;i<30&&battle(H)&&battle(H).round===r0;i++){const t=battle(H).coop.turn;if(t){const m=[G1,G3].find(x=>x.pid===t.owner);assert.equal((await api('/coop/auto',{token:m.token,body:{}})).status,200);}else await hostTurn(H);}
 const b=battle(H);assert(b,'the fight goes on');const noelle=b.actors.find(a=>a.coop?.owner===G3.pid);assert(noelle,'G3 stepped in');assert.equal(noelle.source,'MOND_NOELLE');assert.equal(noelle.coop.joinedRound,b.round);
 assert(b.actors.filter(a=>a.side==='ALLY').length<=4);
});

await check('the win pays every guest still in the fight into their own save, once; the host keeps its own reward; replays pay nothing more',async()=>{
 const before={g1:{mora:rt(G1).s.global.MORA,xp:rt(G1).s.chars.MOND_AMBER.xp,lv:rt(G1).s.chars.MOND_AMBER.level},g2:rt(G2).s.global.MORA,g3:rt(G3).s.global.MORA,host:rt(H).s.global.MORA};
 const s1=await listen(G1);
 try{
  // On the host's own turn the enemies fall; the host's next command ends the fight (and is replayed below).
  for(let i=0;i<20&&battle(H)?.coop?.turn;i++){const t=battle(H).coop.turn,m=[G1,G3].find(x=>x.pid===t.owner);assert.equal((await api('/coop/auto',{token:m.token,body:{}})).status,200);}
  assert(battle(H)&&!battle(H).coop.turn,'the host\'s turn');await fell(H);const last=await hostTurn(H);
  assert(!battle(H),'the fight is over');await store.coopSettled();
  const res=JSON.parse(rt(H).s.global.LAST_BATTLE_RESULT_JSON);assert.equal(res.battleId,FIRST);assert.equal(res.victory,true);
  assert.deepEqual(res.coop.guests.map(g=>g.owner).sort(),[G1.pid,G3.pid].sort(),'G2 left (G3 took that place)');
  const rows=store.db.prepare('SELECT * FROM coop_rewards WHERE battle_id=? ORDER BY account_id').all(FIRST);assert.equal(rows.length,2,'G1 and G3');assert(rows.every(r=>r.status==='PAID'));
  assert.equal(rt(G1).s.global.MORA-before.g1.mora,res.coop.mora,'the battle Mora');const a=rt(G1).s.chars.MOND_AMBER;assert(a.level>before.g1.lv||a.xp===before.g1.xp+res.coop.xp,'the battle experience on the guest\'s Amber');
  for(const [id,n] of Object.entries(res.coop.loot))assert(rt(G1).itemCount(id)>=n,'loot '+id);
  assert.equal(rt(G2).s.global.MORA,before.g2,'nothing for the one who left');assert(rt(G1).s.coop.received[FIRST]>0);
  const ev=await s1.wait(e=>e.type==='coop'&&e.kind==='reward');assert.equal(ev.rewards[0].battle,FIRST);assert.equal(ev.sync,true);
  // Replays: the host's last action, a claim, a direct payment — nothing more.
  const mora=rt(G1).s.global.MORA;
  const replay=await api('/game/action',{token:H.token,body:last.body});assert.equal(replay.status,200);assert.equal(replay.json.replayed,true,'the command that ended the fight, sent again');
  assert.equal((await api('/coop/claim',{token:G1.token,body:{}})).json.rewards.length,0);assert.deepEqual(await store.coopPay(G1.row.id),[]);await store.coopSettled();
  assert.equal(rt(G1).s.global.MORA,mora,'never twice');assert.equal(store.db.prepare('SELECT COUNT(*) AS n FROM coop_rewards').get().n,2);
  assert.equal(store.db.prepare("SELECT COUNT(*) AS n FROM receipts WHERE account_id=? AND request_id LIKE 'coop-reward-%'").get(G1.row.id).n,1);
  // The operator rolls the guest's journey back one step: the reward can be paid again, once.
  await app.adminConsole.rollback({id:G1.row.id,steps:1},'test','127.0.0.1');assert.equal(rt(G1).s.global.MORA,before.g1.mora);
  assert.equal(store.db.prepare("SELECT status FROM coop_rewards WHERE battle_id=? AND account_id=?").get(FIRST,G1.row.id).status,'PENDING');
  assert.equal((await api('/coop/claim',{token:G1.token,body:{}})).json.rewards.length,1);assert.equal(rt(G1).s.global.MORA,mora,'paid again after the rollback, once');
 }finally{s1.close();}
});

await check('field bosses count against the guest\'s own 12-hour limit: with none left the guest gets experience only, and the result says why',async()=>{
 await edit(G1,r=>{r.s.fieldBossWindow={window:r.fieldBossWindow(),wins:3};});await room(G1);await room(G3);
 const FB=globalThis.CRPGRuntime.fieldBosses,boss='FB_CRYO_REGISVINE',route=FB.route(boss);
 await edit(H,[{op:'teleport',map:FB.bosses[boss].map}]);
 assert.equal((await act(H,'PLACE_ENTER',{place:'BOSS:'+route,mode:'BOSS'})).status,200);const go=await act(H,'BOSS_ROUTE',{route,entry:'DIRECT'});assert.equal(go.status,200,JSON.stringify(go.json).slice(0,300));
 const b=battle(H);assert(b.fieldBoss&&b.actors.some(a=>a.coop?.owner===G1.pid),'a shared field boss fight');
 const mora=rt(G1).s.global.MORA,xp=rt(G1).s.chars.MOND_AMBER.xp,lv=rt(G1).s.chars.MOND_AMBER.level;
 await fell(H);assert.equal((await act(H,'COMBAT_BEGIN',{battle:b.id})).status,200);assert(!battle(H),'won at once');await store.coopSettled();
 const row=store.db.prepare('SELECT * FROM coop_rewards WHERE battle_id=? AND account_id=?').get(b.id,G1.row.id);assert.equal(row.status,'PAID');const note=JSON.parse(row.note);
 assert.equal(note.mora,0);assert.deepEqual(note.items,{});assert(note.xp>0);assert.match(note.notes.join(' '),/12시간마다 3번까지라 이번에는 경험치만/);
 assert.equal(rt(G1).s.global.MORA,mora,'no Mora');assert(rt(G1).s.chars.MOND_AMBER.xp!==xp||rt(G1).s.chars.MOND_AMBER.level>lv,'but the experience');
 const g3=JSON.parse(store.db.prepare('SELECT note FROM coop_rewards WHERE battle_id=? AND account_id=?').get(b.id,G3.row.id).note);assert(g3.fieldBoss.counted,'G3 still had wins left');assert.equal(rt(G3).s.fieldBossWindow.wins,1);
});

await check('solo content: a raid sortie with the room open takes no guest; the room says why; guests cannot act in it',async()=>{
 // 0.15.4: the raid is open only during an event the operator opened.
 const ev=store.raidAdminOpen({boss:globalThis.CRPGRuntime.raidV0152.bosses[0].id,days:1},'test').event;
 await edit(H,[{op:'teleport',map:'MAP_MOND_CITY'}]);const go=await act(H,'RAID_ENTER');assert.equal(go.status,200,JSON.stringify(go.json).slice(0,300));
 const b=battle(H);assert(b.raid&&!b.coop&&!b.actors.some(a=>a.coop));
 const v=(await room(G1)).json;assert.equal(v.room.battle.shared,false);assert.match(v.room.battle.solo,/공동 토벌전은 각자 출격합니다/);assert.equal(v.battle,null);
 const no=await api('/coop/act',{token:G1.token,body:{card:'MOND_AMBER_E'}});assert.equal(no.status,400);assert.match(no.json.error,/함께 싸우는 전투가 아닙니다/);
 assert.equal((await act(H,'COMBAT_FORFEIT',{reason:'TEST'})).status,200);
 store.raidAdminClose({num:Number(ev.id.slice(5))-1000000});
});

await check('closing: the host closes the room, every guest is told, and nothing of it is left',async()=>{
 const s1=await listen(G1);
 try{assert.equal((await api('/coop/close',{token:H.token,body:{}})).status,200);const e=await s1.wait(x=>x.type==='coop'&&x.kind==='closed');assert.match(e.reason,/방장이 방을 닫았습니다/);}finally{s1.close();}
 for(const p of [H,G1,G3])assert.equal((await room(p)).json.room,null);assert.equal(store.coopRooms().size,0);assert.equal((await api('/coop/act',{token:G1.token,body:{card:'x'}})).status,404);
});

await check('a host who goes away closes the room after a grace period; a guest who goes away is not waited for, then leaves',async()=>{
 for(let i=0;i<100&&(store.isOnline(G4.row.id)||store.isOnline(H.row.id));i++)await new Promise(r=>setTimeout(r,20));
 const id=(await api('/coop/open',{token:H.token,body:{}})).json.room.id;assert.equal((await api('/coop/join',{token:G4.token,body:{room:id}})).status,200);
 const r=store.coopRooms().get(id),m=r.members[0];m.seen=Date.now()-61000;assert.equal(store.coopContextFor(H.row.id).members.length,0,'away for a minute: not waited for');
 m.seen=Date.now()-301000;store.coopSwept=0;store.coopSweep();assert.equal(r.members.length,0,'gone for five minutes: out of the room');
 r.hostSeen=Date.now()-121000;store.coopSwept=0;store.coopSweep();assert.equal(store.coopRooms().has(id),false,'the host gone for two minutes: the room closes');
});

await store.coopSettled();await app.close();
console.log(JSON.stringify({ok:true,checks}));
