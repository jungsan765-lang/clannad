// 0.16 다인 모드 · 함께 돌아다니기 on the Seoul account server (server/coop-v0153.mjs + source/runtime_coop_world_v0160.js).
// User: 「그냥 손님이 방장 맵에 아예 들어가는 원신처럼 맵 알아서 돌아다니다가 방장이나 손님이 쌈 나면 전투 시작 전에 끼고 그런거
// 안돼?」, 「그래야 상자도 대신 좀 퍼즐같은것도 풀어줄 수 있고」. A guest walks the host's world on their own, meets a fight there
// (in their own save, back home afterwards), the host steps in before 「전투 시작」 and fights it with one character, the
// rewards reach both saves, a roaming guest steps into the host's fight, and a guest opens one of the host's chests.
import assert from 'node:assert/strict';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';

const pepper='server-coop-roam-v0160-pepper-'.padEnd(64,'r'),password='correct-horse-battery-roam';
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port,store=app.store;
async function api(path,{body,token}={}){
 const headers={connection:'close'};if(token)headers.authorization='Bearer '+token;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
const checks=[];const check=(name,fn)=>{store.rates.clear();return fn().then(()=>{checks.push(name);console.log('PASS '+name);});};
const edit=(p,fn)=>app.adminConsole.editSave(p.row,r=>{const out=typeof fn==='function'?fn(r):app.adminConsole.applyOps(r,fn);if(r.s.mail?.list.some(x=>x.kind==='GIFT'&&!x.claimed))r.mailClaim('ALL');return out;},'test');
const rt=p=>store.runtimeOf(p.row.id);
let seq=0;
async function act(p,type,params={}){const m=store.meta(p.row.id),body={version:p.version,engineVersion:p.engineVersion,type,params,revision:m.revision,requestId:'coop-roam-'+String(++seq).padStart(6,'0'),responseMode:'state-parts-v1'};return api('/game/action',{token:p.token,body});}
async function player(username,display,level=12){
 store.rates.clear();const reg=await api('/register',{body:{username,password,displayName:display}});assert.equal(reg.status,200,JSON.stringify(reg.json));const token=reg.json.token;
 const made=await api('/game/new',{token,body:{name:display,route:'ROUTE_TRAVELER'}});assert.equal(made.status,200);
 const p={token,row:store.account(username),version:made.json.version,engineVersion:made.json.engineVersion,name:display};
 await edit(p,[{op:'level',target:'PLAYER_CUSTOM',value:level},{op:'teleport',map:'MAP_MOND_CITY'}]);
 p.pid=(await api('/coop/room',{token})).json.me.pid;return p;
}
async function listen(p){
 const res=await fetch(base+'/chat/stream',{headers:{authorization:'Bearer '+p.token}});assert.equal(res.status,200);
 const reader=res.body.getReader(),dec=new TextDecoder(),events=[];let buf='',stop=false;
 (async()=>{try{while(!stop){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n\n'))>=0){const block=buf.slice(0,i);buf=buf.slice(i+2);const data=block.split('\n').filter(l=>l.startsWith('data: ')).map(l=>l.slice(6)).join('\n');if(data)try{events.push(JSON.parse(data));}catch{}}}}catch{}})();
 return {events,close:()=>{stop=true;reader.cancel().catch(()=>{});},wait:async(test,ms=4000)=>{const t=Date.now();while(Date.now()-t<ms){const e=events.find(test);if(e)return e;await new Promise(r=>setTimeout(r,20));}throw new Error('no event');}};
}
const view=async p=>(await api('/coop/room',{token:p.token})).json;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

try{
const H=await player('roam_host_01','길잡이'),G=await player('roam_guest_02','나그네'),G2=await player('roam_guest_03','따라쟁이');
const roomId=(await api('/coop/open',{token:H.token,body:{}})).json.room.id;
assert.equal((await api('/coop/join',{token:G.token,body:{room:roomId}})).status,200);
const wild=(()=>{const r=rt(H);return r.rows('47_MAP_EDGE_DB').find(e=>e[1]==='MAP_MOND_CITY'&&e[11]==='ACTIVE'&&e[8]==='Y'&&!e[6]&&r.tables['32_MAP_DB'].get(e[2])?.[8]==='Y'&&r.tables['32_MAP_DB'].get(e[2])?.[12]!=='Y')[2];})();

await check('a guest arrives where the host is, following them, and sees the ways one step from there in the host’s world',async()=>{
 const v=(await view(G)).room;assert.equal(v.at.map,'MAP_MOND_CITY');assert.equal(v.at.follow,true);
 assert(v.near.some(x=>x.map===wild),'a wild neighbour is one step away');assert(v.positions.some(p=>p.host&&p.map==='MAP_MOND_CITY')&&v.positions.some(p=>p.me&&p.map==='MAP_MOND_CITY'));
 assert.deepEqual((await view(H)).room.near,[],'the host walks their own world');
});

await check('a step of one’s own: only one step at a time through open ways; the guest’s own journey stays where it was',async()=>{
 await edit(G,r=>{r.s.global.ENCOUNTER_COOLDOWN=9;});
 const far=(await api('/coop/move',{token:G.token,body:{map:'MAP_LIYUE_HARBOR'}}));assert.equal(far.status,409);assert.equal(far.json.code,'COOP_WAY');
 assert.equal((await api('/coop/move',{token:H.token,body:{map:wild}})).status,400,'the host moves by playing');
 const s=await listen(H);
 try{
  const ok=await api('/coop/move',{token:G.token,body:{map:wild}});assert.equal(ok.status,200,JSON.stringify(ok.json));assert.equal(ok.json.encounter,null);
  assert.equal(rt(G).s.global.CURRENT_MAP_ID,'MAP_MOND_CITY','the guest’s own journey did not move');assert(!rt(G).s.coopAway);
  const v=(await view(G)).room;assert.equal(v.at.map,wild);assert.equal(v.at.follow,false);assert(v.near.some(x=>x.map==='MAP_MOND_CITY'));
  await s.wait(e=>e.type==='coop'&&e.room?.positions?.some(p=>p.pid===G.pid&&p.map===wild));
 }finally{s.close();}
});

await check('the host’s world for the guest’s own main screen (GET /coop/world): where they stand, every way open in the host’s world, the host’s places and hour, never the host’s save',async()=>{
 const w=(await api('/coop/world',{token:G.token})).json,r=rt(H);
 assert.equal(w.room,roomId);assert.deepEqual(w.at,{map:wild,name:r.tables['32_MAP_DB'].get(wild)[2],follow:false});assert.equal(w.host.map,r.s.global.CURRENT_MAP_ID);
 // Exactly the ways the host could take, each judged standing at its start with the host's own map and flags.
 const open=r.rows('47_MAP_EDGE_DB').filter(e=>{const v=Object.create(r);v.s={...r.s,global:{...r.s.global,CURRENT_MAP_ID:e[1]}};try{return !v.edgeReason(e);}catch{return false;}}).map(e=>e[0]);
 assert.deepEqual([...w.open].sort(),[...new Set(open)].sort());assert(open.length>3&&open.length<r.rows('47_MAP_EDGE_DB').length,'some ways open, some still shut');
 assert(w.visited.includes(r.s.global.CURRENT_MAP_ID));assert.equal(w.day,Number(r.s.global.WORLD_DAY));assert.equal(w.time,r.s.global.WORLD_TIME);assert.equal(typeof w.rev,'string');
 assert(w.positions.some(p=>p.me&&p.map===wild)&&w.positions.some(p=>p.host));
 assert(!JSON.stringify(w).includes('"inventory"')&&!('global' in w)&&!('s' in w),'never the host’s save');
 const hw=(await api('/coop/world',{token:H.token})).json;assert.equal(hw.at.map,r.s.global.CURRENT_MAP_ID);assert.equal(hw.at.follow,true);
 assert.equal((await api('/coop/world',{token:G2.token})).status,404,'only for those in the room');
});

let guestFight=null;
await check('a fight met on the way is the guest’s own (in their save, at that place); the host hears of it and steps in before 「전투 시작」',async()=>{
 const s=await listen(H);
 try{
  for(let i=0;i<120&&!rt(G).s.runtime;i++){store.rates.clear();await edit(G,r=>{r.s.global.ENCOUNTER_COOLDOWN=0;});const here=(await view(G)).room.at.map;const res=await api('/coop/move',{token:G.token,body:{map:here===wild?'MAP_MOND_CITY':wild}});assert.equal(res.status,200,JSON.stringify(res.json));}
  const b=rt(G).s.runtime;assert(b,'a fight came on the way');guestFight=b.id;
  assert.equal(b.coop?.room,roomId);assert(rt(G).s.coopAway);assert.equal(rt(G).s.global.CURRENT_MAP_ID,rt(G).s.coopAway.map);assert.equal(b.opening?.state,'PENDING');
  const note=await s.wait(e=>e.type==='coop'&&e.kind==='fight');assert.equal(note.fight.owner.pid,G.pid);assert.equal(note.fight.opening,true);
  const room=(await view(H)).room;assert(room.fights.some(f=>f.owner.pid===G.pid&&f.opening));
  await edit(G,r=>{for(const e of r.s.runtime.actors.filter(a=>a.side==='ENEMY')){e.maxHp*=40;e.hp=e.maxHp;}});
  // User: 「다른 사람 전투는 그쪽으로 가야 할 수 있는것으로」 — the host walks there in their own world first.
  const fightMap=rt(G).s.coopAway.map,far=fightMap==='MAP_MOND_CITY'?wild:'MAP_MOND_CITY';
  await edit(H,[{op:'teleport',map:far}]);
  const away=await api('/coop/fight',{token:H.token,body:{owner:G.pid}});assert.equal(away.status,409);assert.equal(away.json.code,'COOP_FAR');assert.match(away.json.error||away.json.message||'',/가야/);
  await edit(H,[{op:'teleport',map:fightMap}]);
  const join=await api('/coop/fight',{token:H.token,body:{owner:G.pid}});assert.equal(join.status,200,JSON.stringify(join.json));assert.equal(join.json.admitted,true);
  const actor=rt(G).s.runtime.actors.find(a=>a.coop?.owner===H.pid);assert(actor&&actor.source==='PLAYER_CUSTOM','the host brings their protagonist');
  assert.deepEqual(rt(G).s.runtime.order,rt(G).s.runtime.opening.initialOrder);
  const hv=await view(H);assert(hv.battle&&hv.battle.owner.pid===G.pid,'the host sees the guest’s fight as a fighter in it');
  // 「그냥 모든 부분을 다 똑같이」: the fight itself for the host's own battle screen, and the blows to play.
  assert.equal(hv.battle.state.map,fightMap);assert(hv.battle.state.runtime.actors.some(a=>a.id===actor.id),'the fight as it is');assert(!JSON.stringify(hv.battle.state).includes('RNG_STATE'),'never the dice');
  assert(Number.isInteger(hv.battle.fx.len)&&Array.isArray(hv.battle.fx.entries)&&hv.battle.fx.entries.length<=40);
  assert.equal((await api('/coop/fight',{token:G2.token,body:{owner:G.pid}})).status,404,'not in the room');
 }finally{s.close();}
});

await check('the host fights their fighter in the guest’s fight (commands go to the guest’s save); a win pays both, and the guest goes home',async()=>{
 const xp0=rt(H).growth().xp+rt(H).growth().level*1e6,home=rt(G).s.coopAway.home.map,hs=await listen(H);
 assert.equal((await act(G,'COMBAT_BEGIN',{battle:guestFight})).status,200);
 let acted=false;
 for(let i=0;i<60&&rt(G).s.runtime&&!acted;i++){
  const t=rt(G).s.runtime.coop?.turn;
  if(t&&t.owner===H.pid){const v=(await view(H)).battle,card=v.cards.find(x=>!x.reason);assert(card);const out=await api('/coop/act',{token:H.token,body:{card:card.id,target:card.targets?.[0]?.id,battle:v.battle,turn:{actor:v.turn.actor,deadline:v.turn.deadline,round:v.round}}});assert.equal(out.status,200,JSON.stringify(out.json));acted=true;break;}
  const r=rt(G),foe=r.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.hp>0),atk=r.combatCards().find(x=>x.id==='PLAYER_BASIC_ATTACK'&&!x.reason);
  const res=await act(G,'COMBAT',atk&&foe?{card:atk.id,target:atk.targets[0]?.id||foe.id}:{card:'PLAYER_BASIC_GUARD'});assert.equal(res.status,200,JSON.stringify(res.json).slice(0,300));
 }
 assert(acted,'the host’s fighter had a turn and the host played it');
 await edit(G,r=>{for(const e of r.s.runtime.actors.filter(a=>a.side==='ENEMY'))e.hp=0;});
 for(let i=0;i<20&&rt(G).s.runtime;i++){const t=rt(G).s.runtime.coop?.turn;if(t)assert.equal((await api('/coop/auto',{token:H.token,body:{}})).status,200);else assert.equal((await act(G,'COMBAT',{card:'PLAYER_BASIC_GUARD'})).status,200);}
 assert(!rt(G).s.runtime);assert(JSON.parse(rt(G).s.global.LAST_BATTLE_RESULT_JSON).victory);
 assert.equal(rt(G).s.global.CURRENT_MAP_ID,home,'home again');assert(!rt(G).s.coopAway);
 const end=await hs.wait(e=>e.type==='coop'&&e.kind==='ended');hs.close();assert(end.ended.victory);assert(end.ended.fx?.len>0&&end.ended.fx.entries.length,'the last blows come with the result');
 await store.coopSettled();
 const paid=store.db.prepare("SELECT status FROM coop_rewards WHERE account_id=?").all(H.row.id);assert.deepEqual(paid.map(x=>x.status),['PAID'],'the host is paid into their own save');
 assert(rt(H).growth().xp+rt(H).growth().level*1e6>xp0);assert(rt(H).s.coop?.received?.[guestFight],'the host’s save records the fight');
 assert.deepEqual((await view(H)).room.fights,[]);
});

await check('a guest who roams is not pulled into the host’s fight; they hear of it, walk there and step in, going with the host again',async()=>{
 const s=await listen(G);
 try{
  // The host meets a fight walking their own world, somewhere else than the guest stands.
  const r0=rt(H),city='MAP_MOND_CITY',edges=m=>r0.rows('47_MAP_EDGE_DB').filter(e=>e[1]===m&&e[11]==='ACTIVE'&&e[8]==='Y'&&!e[6]);
  const out=edges(city).find(e=>e[2]===wild),back=edges(wild).find(x=>x[2]===city);
  for(let i=0;i<120&&!rt(H).s.runtime;i++){const res=await act(H,'MOVE',{edge:rt(H).s.global.CURRENT_MAP_ID===city?out[0]:back[0]});assert.equal(res.status,200,JSON.stringify(res.json).slice(0,300));}
  const b=rt(H).s.runtime;assert(b?.coop,'a shared fight');assert(!b.actors.some(a=>a.coop),'the roaming guest was not pulled in');
  const note=await s.wait(e=>e.type==='coop'&&e.kind==='fight'&&e.fight.owner.host);assert.equal(note.fight.opening,true);
  const hostMap=rt(H).s.global.CURRENT_MAP_ID;
  if((await view(G)).room.at.map!==hostMap){
   const far=await api('/coop/fight',{token:G.token,body:{owner:H.pid}});assert.equal(far.status,409);assert.equal(far.json.code,'COOP_FAR','go there first');
   await edit(G,r=>{r.s.global.ENCOUNTER_COOLDOWN=9;});assert.equal((await api('/coop/move',{token:G.token,body:{map:hostMap}})).status,200,'a step to the fight');
  }
  const join=await api('/coop/fight',{token:G.token,body:{owner:H.pid}});assert.equal(join.status,200,JSON.stringify(join.json));
  assert(rt(H).s.runtime.actors.some(a=>a.coop?.owner===G.pid),'in the host’s fight at once');
  const v=(await view(G)).room;assert.equal(v.at.follow,true,'with the host again');assert.equal(v.at.map,rt(H).s.global.CURRENT_MAP_ID);
  const off=await api('/coop/move',{token:G.token,body:{map:v.near[0].map}});assert.equal(off.status,409,'no walking off while fighting');assert.equal(off.json.code,'COOP_BUSY');
  assert.equal((await act(H,'COMBAT_FORFEIT',{reason:'TEST'})).status,200);
 }finally{s.close();}
});

await check('같이 풀기: one board per chest for everyone standing there; each move goes to everyone on it in one order; a later comer gets them all',async()=>{
 const sh=await listen(H),sg=await listen(G);
 try{
  assert.equal((await api('/coop/follow',{token:G.token,body:{}})).status,200);
  if(rt(H).s.global.CURRENT_MAP_ID!=='MAP_MOND_CITY')await edit(H,[{op:'teleport',map:'MAP_MOND_CITY'}]);await view(H);
  const chest=(await api('/coop/chests',{token:G.token,body:{}})).json.chests.find(c=>c.puzzle?.game==='SPOT');assert(chest);
  const g=await api('/coop/puzzle',{token:G.token,body:{op:'join',chest:chest.id}});assert.equal(g.status,200,JSON.stringify(g.json));
  assert.deepEqual(g.json.session.events,[]);assert.equal(g.json.chest.puzzle.game,'SPOT','the host’s puzzle');assert.equal(g.json.session.map,'MAP_MOND_CITY');
  const told=await sh.wait(e=>e.type==='coop'&&e.kind==='puzzle'&&e.op==='join'&&e.by?.pid===G.pid);assert.equal(told.chest,chest.id,'the host hears someone started a board where they stand');
  const h=await api('/coop/puzzle',{token:H.token,body:{op:'join',chest:chest.id}});assert.equal(h.status,200,JSON.stringify(h.json));assert.equal(h.json.session.players.length,2);
  const move=await api('/coop/puzzle',{token:G.token,body:{op:'event',chest:chest.id,ev:{t:'click',path:[2,0],x:.4,y:.6}}});assert.equal(move.status,200);assert.equal(move.json.event.seq,1);
  const seen=await sh.wait(e=>e.type==='coop'&&e.kind==='puzzle'&&e.op==='event'&&e.event?.seq===1);assert.deepEqual(seen.event.ev,{t:'click',path:[2,0],x:.4,y:.6},'the host’s board plays the guest’s press');
  assert.equal((await api('/coop/puzzle',{token:H.token,body:{op:'event',chest:chest.id,ev:{t:'key',k:'1'}}})).json.event.seq,2,'one order for everyone');
  await sg.wait(e=>e.type==='coop'&&e.kind==='puzzle'&&e.op==='event'&&e.event?.seq===2);
  assert.equal((await api('/coop/puzzle',{token:G.token,body:{op:'event',chest:chest.id,ev:{t:'x',big:'y'.repeat(500)}}})).status,400,'small moves only');
  // Leaving keeps the board; coming back gets every move so far.
  assert.equal((await api('/coop/puzzle',{token:G.token,body:{op:'leave',chest:chest.id}})).status,200);
  assert.equal((await api('/coop/puzzle',{token:G.token,body:{op:'event',chest:chest.id,ev:{t:'key',k:'2'}}})).status,409,'off the board');
  const back=await api('/coop/puzzle',{token:G.token,body:{op:'join',chest:chest.id}});assert.deepEqual(back.json.session.events.map(e=>e.seq),[1,2]);
  assert.equal((await api('/coop/puzzle',{token:G2.token,body:{op:'join',chest:chest.id}})).status,404,'only the room');
  // One must stand where the chest is.
  await edit(H,[{op:'teleport',map:wild}]);assert.equal((await api('/coop/puzzle',{token:H.token,body:{op:'join',chest:chest.id}})).status,409,'the host goes there');
  await edit(H,[{op:'teleport',map:'MAP_MOND_CITY'}]);await api('/coop/puzzle',{token:G.token,body:{op:'leave',chest:chest.id}});await api('/coop/puzzle',{token:H.token,body:{op:'leave',chest:chest.id}});
 }finally{sh.close();sg.close();}
});

await check('a guest unseals one of the host’s chests where they stand; it stays there and the host opens it there without the puzzle (「클리어 따로, 상자 먹는거 따로」)',async()=>{
 const s=await listen(H);
 try{
  assert.equal((await api('/coop/follow',{token:G.token,body:{}})).status,200);
  const hostMap=rt(H).s.global.CURRENT_MAP_ID;if(hostMap!=='MAP_MOND_CITY')await edit(H,[{op:'teleport',map:'MAP_MOND_CITY'}]);
  await view(H);const list=(await api('/coop/chests',{token:G.token,body:{}})).json;assert.equal(list.map,'MAP_MOND_CITY');
  const chest=list.chests.find(c=>c.puzzle?.game==='SPOT');assert(chest,'the city’s spot-the-difference chest');
  const prim=Number(rt(H).s.global.PRIMOGEM)||0,answer=[...Array(chest.puzzle.count).keys()];
  assert.equal((await api('/coop/chest',{token:G.token,body:{chest:chest.id,answer:[0]}})).status,400,'unsolved');
  const ok=await api('/coop/chest',{token:G.token,body:{chest:chest.id,answer}});assert.equal(ok.status,200,JSON.stringify(ok.json));assert.equal(ok.json.result.unsealed,true);
  assert.equal(Number(rt(H).s.global.PRIMOGEM)||0,prim,'solving takes nothing');assert.equal(rt(H).s.chests.unsealed[chest.id].by,'나그네');assert(!rt(H).chestOpened(chest.id));
  const e=await s.wait(x=>x.type==='coop'&&x.kind==='chest');assert.equal(e.chest.by.name,'나그네');assert.equal(e.chest.unsealed,true);assert.equal(e.chest.mapName,'몬드성');
  const done=await s.wait(x=>x.type==='coop'&&x.kind==='puzzle'&&x.op==='end'&&x.chest===chest.id);assert.equal(done.unsealed,true,'the shared board of that chest ends');
  assert.equal((await api('/coop/chest',{token:G.token,body:{chest:chest.id,answer}})).status,400,'once');
  assert(!(await api('/coop/chests',{token:G.token,body:{}})).json.chests.some(c=>c.id===chest.id),'no longer there for guests');
  // The host takes it where it lies, with no puzzle; the record keeps who solved it.
  const got=await act(H,'CHEST_OPEN',{chest:chest.id});assert.equal(got.status,200,JSON.stringify(got.json).slice(0,300));
  assert.equal(Number(rt(H).s.global.PRIMOGEM),prim+chest.reward.primogem,'the chest is the host’s');assert.equal(rt(H).s.chests.opened[chest.id].by,'나그네');assert(!rt(H).s.chests.unsealed?.[chest.id]);
  assert.equal((await api('/coop/chests',{token:H.token,body:{}})).status,400,'the host finds their own');
 }finally{s.close();}
});

await check('a step through the host’s world puts the guest’s own save on the field screen, so the sync after it never brings back an old result screen',async()=>{
 const s=await listen(G);
 try{
  await edit(G,r=>{r.s.global.SCREEN_MODE='REWARD';r.s.global.ENCOUNTER_COOLDOWN=9;});
  const to=(await view(G)).room.near[0]?.map;assert(to);
  assert.equal((await api('/coop/move',{token:G.token,body:{map:to}})).status,200);
  await s.wait(e=>e.type==='coop'&&e.kind==='sync');
  assert.equal(rt(G).s.global.SCREEN_MODE,'LOCATION','the field, not the last battle’s result');
 }finally{s.close();}
});

await check('one battle speed for the room (「배속도 공유하게 해야겠는데」): whoever changes it changes it for everyone; the room keeps it and counts its changes',async()=>{
 assert.equal((await view(G)).room.speed,null,'nobody has changed it yet');
 const sh=await listen(H),sg=await listen(G);
 try{
  for(const bad of [0.25,2.5,0.6,'x',null])assert.equal((await api('/coop/speed',{token:G.token,body:{speed:bad}})).status,400,'speed '+bad);
  const out=await api('/coop/speed',{token:G.token,body:{speed:0.75}});assert.equal(out.status,200,JSON.stringify(out.json));assert.equal(out.json.speed,0.75);
  const heard=await sh.wait(e=>e.type==='coop'&&e.kind==='speed');assert.equal(heard.speed,0.75);assert.equal(heard.rev,out.json.rev);assert.equal(heard.by.pid,G.pid);assert.equal(heard.room,roomId);
  await sg.wait(e=>e.type==='coop'&&e.kind==='speed'&&e.rev===out.json.rev);
  const again=await api('/coop/speed',{token:H.token,body:{speed:1}});assert.equal(again.status,200);assert(again.json.rev>out.json.rev,'each change counts');
  for(const p of [H,G]){const v=(await view(p)).room;assert.equal(v.speed,1);assert.equal(v.speedRev,again.json.rev);}
  assert.equal((await api('/coop/speed',{token:G2.token,body:{speed:1}})).status,404,'only those in the room');
 }finally{sh.close();sg.close();}
});

console.log(JSON.stringify({ok:true,checks}));
}finally{await store.coopSettled?.();await app.close?.();}
