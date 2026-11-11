// 0.15.9 다인 모드 · 함께 다니기 (user: 「호스트 서버 들어가서 같이 돌아다니고 전투도 참여 하고. 돌아다닐때 상대 위치도 보이고」):
// the room follows the host's world. Everyone sees where the party is and what the host is doing, the room is told when the
// host moves, a guest may suggest where to go next, and the room has its own short talk. The guest's own journey stays put.
import assert from 'node:assert/strict';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';

const pepper='server-coop-world-v0159-pepper-'.padEnd(64,'w'),password='correct-horse-battery-world';
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port,store=app.store;
async function api(path,{body,token}={}){
 const headers={};if(token)headers.authorization='Bearer '+token;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
const checks=[];const check=(name,fn)=>{store.rates.clear();return fn().then(()=>{checks.push(name);console.log('PASS '+name);});};
const edit=(p,ops)=>app.adminConsole.editSave(p.row,r=>app.adminConsole.applyOps(r,ops),'test');
const rt=p=>store.runtimeOf(p.row.id);
let seq=0;
async function act(p,type,params={}){const m=store.meta(p.row.id);return api('/game/action',{token:p.token,body:{version:p.version,engineVersion:p.engineVersion,type,params,revision:m.revision,requestId:'coop-world-'+String(++seq).padStart(6,'0'),responseMode:'state-parts-v1'}});}
async function player(username,display){
 store.rates.clear();const reg=await api('/register',{body:{username,password}});assert.equal(reg.status,200,JSON.stringify(reg.json));const token=reg.json.token;
 const made=await api('/game/new',{token,body:{name:display,route:'ROUTE_TRAVELER'}});assert.equal(made.status,200);
 const p={token,row:store.account(username),version:made.json.version,engineVersion:made.json.engineVersion,name:display};
 await edit(p,[{op:'level',target:'PLAYER_CUSTOM',value:10},{op:'teleport',map:'MAP_MOND_CITY'}]);
 p.pid=(await api('/coop/room',{token})).json.me.pid;return p;
}
async function listen(p){
 const res=await fetch(base+'/chat/stream',{headers:{authorization:'Bearer '+p.token}});assert.equal(res.status,200);
 const reader=res.body.getReader(),dec=new TextDecoder(),events=[];let buf='',stop=false;
 (async()=>{try{while(!stop){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n\n'))>=0){const block=buf.slice(0,i);buf=buf.slice(i+2);const data=block.split('\n').filter(l=>l.startsWith('data: ')).map(l=>l.slice(6)).join('\n');if(data)try{events.push(JSON.parse(data));}catch{}}}}catch{}})();
 return {events,close:()=>{stop=true;reader.cancel().catch(()=>{});},wait:async(test,ms=3000)=>{const t=Date.now();while(Date.now()-t<ms){const e=events.find(test);if(e)return e;await new Promise(r=>setTimeout(r,20));}throw new Error('no event');}};
}

try{
const H=await player('world_host_01','길잡이'),G=await player('world_guest_02','따라쟁이');
const roomId=(await api('/coop/open',{token:H.token,body:{}})).json.room.id;assert.equal((await api('/coop/join',{token:G.token,body:{room:roomId}})).status,200);

await check('the room shows the host’s world: where the party is and what the host is doing; the room list says where too',async()=>{
 const v=(await api('/coop/room',{token:G.token})).json.room;assert(v.world,'world in the room');
 assert.equal(v.world.map,'MAP_MOND_CITY');assert.equal(v.world.name,'몬드성');assert.equal(v.world.region,'몬드');assert.equal(v.world.doing,'FIELD');assert.equal(v.world.safe,true);
 assert.deepEqual(v.log,[]);assert.equal(v.suggest,null);
 const other=await player('world_watch_03','구경꾼'),list=(await api('/coop/list',{token:other.token})).json.rooms;const row=list.find(x=>x.id===roomId);assert.equal(row.where.name,'몬드성');
 const host=(await api('/coop/room',{token:H.token})).json.room;assert.equal(host.world.map,'MAP_MOND_CITY','the host sees the same');
});

await check('when the host moves, everyone in the room is told the new place (kind moved); the guest’s own journey stays where it was',async()=>{
 const s=await listen(G);
 try{
  const r=rt(H),edge=r.rows('47_MAP_EDGE_DB').find(e=>e[1]==='MAP_MOND_CITY'&&e[2]==='MAP_MOND_PLAINS'&&e[11]==='ACTIVE');assert(edge);
  const res=await act(H,'MOVE',{edge:edge[0]});assert.equal(res.status,200,JSON.stringify(res.json).slice(0,300));
  const e=await s.wait(x=>x.type==='coop'&&x.room?.world?.map===rt(H).s.global.CURRENT_MAP_ID&&x.room.world.map!=='MAP_MOND_CITY');
  const now=rt(H).s.global.CURRENT_MAP_ID;
  if(now==='MAP_MOND_PLAINS')assert.equal(e.kind,'moved');
  assert.equal(e.room.you,'GUEST');assert.equal(rt(G).s.global.CURRENT_MAP_ID,'MAP_MOND_CITY','the guest’s own journey did not move');
  if(rt(H).s.runtime){const fled=await act(H,'COMBAT_FORFEIT',{reason:'TEST'});assert.equal(fled.status,200);}
 }finally{s.close();}
});

await check('a guest suggests where to go; the host is told and sees it in the room; the host cannot suggest; an unknown place is refused',async()=>{
 const s=await listen(H);
 try{
  const ok=await api('/coop/suggest',{token:G.token,body:{map:'MAP_MOND_FOREST'}});assert.equal(ok.status,200,JSON.stringify(ok.json));
  const e=await s.wait(x=>x.type==='coop'&&x.kind==='suggest');assert.equal(e.room.you,'HOST');assert.equal(e.room.suggest.map,'MAP_MOND_FOREST');assert.equal(e.room.suggest.from.name,'따라쟁이');assert.equal(e.room.suggest.name,'속삭임의 숲');
  assert.equal((await api('/coop/room',{token:H.token})).json.room.suggest.map,'MAP_MOND_FOREST');
  assert.equal((await api('/coop/suggest',{token:H.token,body:{map:'MAP_MOND_FOREST'}})).status,400);
  assert.equal((await api('/coop/suggest',{token:G.token,body:{map:'MAP_NOWHERE'}})).status,400);
 }finally{s.close();}
});

await check('when the host gets to the suggested place, the suggestion is done for everyone',async()=>{
 if(rt(H).s.runtime)assert.equal((await act(H,'COMBAT_FORFEIT',{reason:'TEST'})).status,200);
 await edit(H,[{op:'teleport',map:'MAP_MOND_PLAINS'}]);
 const s=await listen(G);
 try{
  assert.equal((await api('/coop/suggest',{token:G.token,body:{map:'MAP_MOND_CITY'}})).status,200);
  assert.equal((await api('/coop/room',{token:H.token})).json.room.suggest.map,'MAP_MOND_CITY');
  const edge=rt(H).rows('47_MAP_EDGE_DB').find(e=>e[1]==='MAP_MOND_PLAINS'&&e[2]==='MAP_MOND_CITY'&&e[11]==='ACTIVE');assert(edge,'a way back to the city');
  const res=await act(H,'MOVE',{edge:edge[0]});assert.equal(res.status,200,JSON.stringify(res.json).slice(0,300));
  assert.equal(rt(H).s.global.CURRENT_MAP_ID,'MAP_MOND_CITY');
  const e=await s.wait(x=>x.type==='coop'&&x.room?.world?.map==='MAP_MOND_CITY');assert.equal(e.room.suggest,null);
  assert.equal((await api('/coop/room',{token:H.token})).json.room.suggest,null);
 }finally{s.close();}
});

await check('the room’s talk reaches everyone in the room only; it is cleaned, kept short and keeps the last twenty lines',async()=>{
 const sh=await listen(H),sg=await listen(G),outsider=await player('world_out_04','바깥사람'),so=await listen(outsider);
 try{
  const sent=await api('/coop/say',{token:G.token,body:{text:'  같이   가요​!  '}});assert.equal(sent.status,200,JSON.stringify(sent.json));assert.equal(sent.json.line.text,'같이 가요 !');
  const eh=await sh.wait(x=>x.type==='coop'&&x.kind==='say');assert.equal(eh.line.from.name,'따라쟁이');assert.equal(eh.line.from.host,false);assert.equal(eh.room,roomId);
  await sg.wait(x=>x.type==='coop'&&x.kind==='say');
  await new Promise(r=>setTimeout(r,150));assert(!so.events.some(x=>x.type==='coop'&&x.kind==='say'),'not outside the room');
  const long=await api('/coop/say',{token:H.token,body:{text:'가'.repeat(200)}});assert.equal(long.json.line.text.length,80);assert.equal(long.json.line.from.host,true);
  assert.equal((await api('/coop/say',{token:G.token,body:{text:'   '}})).status,400);
  assert.equal((await api('/coop/say',{token:outsider.token,body:{text:'안녕'}})).status,404);
  store.rates.clear();for(let i=0;i<22;i++){store.rates.clear();assert.equal((await api('/coop/say',{token:H.token,body:{text:'줄 '+i}})).status,200);}
  const log=(await api('/coop/room',{token:G.token})).json.room.log;assert.equal(log.length,20);assert.equal(log.at(-1).text,'줄 21');
 }finally{sh.close();sg.close();so.close();}
});
console.log(JSON.stringify({ok:true,checks}));
}finally{await store.coopSettled?.();await app.close?.();}
