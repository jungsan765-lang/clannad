import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';
import {splitState,joinState,applyParts} from '../server/state-parts.mjs';

const pepper='fixed-region-live-test-pepper-'.padEnd(64,'x'),password='correct-horse-battery-staging';
async function open(dbPath=':memory:'){
 const app=await startLiveRegionStaging({dbPath,pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port;
 async function api(path,{method='GET',body,token,origin}={}){
  const headers={};if(token)headers.authorization='Bearer '+token;if(origin)headers.origin=origin;if(body!==undefined)headers['content-type']='application/json';
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await response.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}
  return {status:response.status,headers:response.headers,json};
 }
 return {...app,api,base};
}
let app=await open();
const health=await app.api('/health');assert.equal(health.status,200);assert.equal(health.json.storage,'sqlite-node-accounts');assert.equal(health.json.synthetic,false);assert(health.json.capabilities.includes('state-parts-v1'));
assert.equal((await app.api('/ranking')).status,200);
assert.equal((await app.api('/register',{method:'POST',origin:'https://evil.example',body:{username:'baduser',password}})).status,403);
const sameOrigin='http://127.0.0.1:'+app.address.port;const sameOriginReg=await app.api('/register',{method:'POST',origin:sameOrigin,body:{username:'mirror_01',password}});assert.equal(sameOriginReg.status,200,JSON.stringify(sameOriginReg.json));assert.equal(sameOriginReg.headers.get('access-control-allow-origin'),sameOrigin);
const reg=await app.api('/register',{method:'POST',body:{username:'tester_01',password,displayName:'서울시험'}});assert.equal(reg.status,200,JSON.stringify(reg.json));const token=reg.json.token;assert.equal(token.length,64);
const empty=await app.api('/me',{token});assert.equal(empty.status,200);assert.equal(empty.json.state,null);assert(Number(empty.headers.get('x-server-time'))>0);
const created=await app.api('/game/new',{method:'POST',token,body:{name:'서울시험',route:'ROUTE_ISEKAI'}});assert.equal(created.status,200,JSON.stringify(created.json));assert.equal(created.json.revision,0);assert(created.json.state);
const action={version:'0.14.5',engineVersion:created.json.engineVersion,type:'MENU',params:{screen:'SYSTEM'},revision:0,requestId:'live-request-0001',responseMode:'state-parts-v1'};
const first=await app.api('/game/action',{method:'POST',token,body:action});assert.equal(first.status,200,JSON.stringify(first.json));assert(first.json.statePatch);assert.equal(first.json.revision,1);assert.equal(first.json.baseRevision,0);
const merged=joinState(applyParts(splitState(created.json.state),first.json.statePatch)),current=await app.api('/me',{token});assert.deepEqual(merged,current.json.state);assert.equal(current.json.revision,1);
const replay=await app.api('/game/action',{method:'POST',token,body:action});assert.equal(replay.status,200);assert.equal(replay.json.replayed,true);assert.equal(replay.json.revision,1);
const reused=await app.api('/game/action',{method:'POST',token,body:{...action,params:{screen:'STORY'}}});assert.equal(reused.status,409);assert.equal(reused.json.code,'REQUEST_ID_REUSED');
const stale=await app.api('/game/action',{method:'POST',token,body:{...action,requestId:'stale-request-0001'}});assert.equal(stale.status,409);assert.equal(stale.json.code,'REVISION_CONFLICT');
const current2=await app.api('/me',{token}),parallelBody={...action,revision:current2.json.revision,requestId:'parallel-live-0001'};
const parallel=await Promise.all([app.api('/game/action',{method:'POST',token,body:parallelBody}),app.api('/game/action',{method:'POST',token,body:parallelBody})]);assert(parallel.every(x=>x.status===200));assert.equal(parallel.filter(x=>x.json.replayed).length,1);
assert.equal((await app.api('/logout',{method:'POST',token,body:{}})).status,200);assert.equal((await app.api('/me',{token})).status,401);
const login=await app.api('/login',{method:'POST',body:{username:'tester_01',password}});assert.equal(login.status,200);const token2=login.json.token;assert.equal((await app.api('/me',{token:token2})).json.revision,2);
// 0.14.7 chat: capability, validation, rate limit, live stream.
assert(health.json.capabilities.includes('chat-v1')&&health.json.capabilities.includes('trade-v1'),'test databases switch chat and trade on');
const friend=await app.api('/register',{method:'POST',body:{username:'friend_02',password,displayName:'동행시험'}}),ft=friend.json.token;
const stream=await fetch(app.base+'/chat/stream',{headers:{authorization:'Bearer '+ft}});assert.equal(stream.status,200);assert.match(stream.headers.get('content-type'),/event-stream/);
const reader=stream.body.getReader(),decoder=new TextDecoder();let streamed='';
const said=await app.api('/chat/send',{method:'POST',token:token2,body:{text:'  안녕하세요\n테이바트  '}});assert.equal(said.status,200,JSON.stringify(said.json));assert.equal(said.json.message.text,'안녕하세요 테이바트');assert.equal(said.json.message.author,'서울시험');assert.equal(said.json.message.pid.length,12);
for(let i=0;i<20&&!streamed.includes('안녕하세요 테이바트');i++){const {value}=await reader.read();streamed+=decoder.decode(value||new Uint8Array());}assert(streamed.includes('"type":"chat"'),'chat line arrives on the live stream');await reader.cancel();
assert.equal((await app.api('/chat/send',{method:'POST',token:token2,body:{text:'바로 또'}})).status,429,'one line per 1.2 seconds');
assert.equal((await app.api('/chat/send',{method:'POST',token:ft,body:{text:'   '}})).status,400);assert.equal((await app.api('/chat/send',{method:'POST',token:ft,body:{text:'가'.repeat(141)}})).status,400);
const recent=await app.api('/chat/recent',{token:ft});assert.equal(recent.status,200);assert.deepEqual(recent.json.messages.map(m=>m.text),['안녕하세요 테이바트']);assert.equal((await app.api('/chat/recent?after='+said.json.message.id,{token:ft})).json.messages.length,0);
assert.equal((await app.api('/chat/delete',{method:'POST',token:ft,body:{id:said.json.message.id}})).status,403,'only staff delete lines');
// 0.14.7 trade: bound items stay, tradeable stacks and gear move between two saves in one transaction.
const tester=app.store.account('tester_01'),buddy=app.store.account('friend_02');
assert.equal((await app.api('/game/new',{method:'POST',token:ft,body:{name:'동행시험',route:'ROUTE_TRAVELER'}})).status,200);
function freePlay(id,give=[]){const r=app.store.runtimeOf(id);Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',CURRENT_MAP_ID:'MAP_MOND_CITY',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION'});delete r.s.storyJourney;delete r.s.storyBreak;r.s.storyContext=null;r.prepareStory?.();for(const [item,n]of give)r.giveItem(item,n);
 const gear=r.giveEquipment('EQ_SWORD_HARBINGER');const parts=splitState(r.s);app.store.db.prepare('DELETE FROM parts WHERE account_id=?').run(id);const ins=app.store.db.prepare('INSERT INTO parts VALUES(?,?,?)');for(const [p,v] of parts)ins.run(id,p,v);app.store.invalidate(id);return {r,gear};}
const seeded=freePlay(tester.id,[['ING_APPLE',5],['MAT_CHAR_EXP_HERO',2]]);freePlay(buddy.id,[['ORE_IRON',4]]);assert.equal(seeded.r.playPhase(),'FREE');
assert.equal((await app.api('/trade/offer',{method:'POST',token:token2,body:{to:'friend_02',give:[{item:'MAT_CHAR_EXP_HERO',qty:1}]}})).status,400,'EXP books are bound');
assert.equal((await app.api('/trade/offer',{method:'POST',token:token2,body:{to:'tester_01',give:[{item:'ING_APPLE',qty:1}]}})).status,400,'no trade with yourself');
const offer=await app.api('/trade/offer',{method:'POST',token:token2,body:{to:'friend_02',give:[{item:'ING_APPLE',qty:3},{slot:seeded.gear}],want:[{item:'ORE_IRON',qty:2}],note:'철광 부탁해요'}});assert.equal(offer.status,200,JSON.stringify(offer.json));
const before=[app.store.meta(tester.id).revision,app.store.meta(buddy.id).revision],ironA=app.store.runtimeOf(tester.id).itemCount('ORE_IRON'),inbox=await app.api('/trade/list',{token:ft});assert.equal(inbox.json.incoming[0].status,'PENDING');assert.equal(inbox.json.incoming[0].from.name,'서울시험');assert.equal(inbox.json.incoming[0].from.username,undefined,'login IDs stay private');
assert.equal((await app.api('/trade/accept',{method:'POST',token:token2,body:{id:offer.json.trade.id}})).status,403,'only the receiver accepts');
const accepted=await app.api('/trade/accept',{method:'POST',token:ft,body:{id:offer.json.trade.id}});assert.equal(accepted.status,200,JSON.stringify(accepted.json));assert.equal(accepted.json.trade.status,'ACCEPTED');
const A=app.store.runtimeOf(tester.id),B=app.store.runtimeOf(buddy.id);assert.equal(A.itemCount('ING_APPLE'),2);assert.equal(B.itemCount('ING_APPLE'),3);assert.equal(A.itemCount('ORE_IRON')-ironA,2);assert.equal(B.itemCount('ORE_IRON'),2);
assert(!A.s.inventory.some(i=>i.slot===seeded.gear),'gear left the giver');assert(B.s.inventory.some(i=>i.equip==='EQ_SWORD_HARBINGER'&&!i.equipped),'gear arrived unequipped');
assert.deepEqual([app.store.meta(tester.id).revision,app.store.meta(buddy.id).revision],before.map(n=>n+1),'both saves advance one revision');
assert.equal((await app.api('/trade/accept',{method:'POST',token:ft,body:{id:offer.json.trade.id}})).status,409,'an offer settles once');
assert.equal((await app.api('/chat/send',{method:'POST',token:ft,body:{text:'교환해요'}})).status,200);const again=await app.api('/trade/offer',{method:'POST',token:token2,body:{toPid:recent.json.me,give:[{item:'ING_APPLE',qty:1}]}});assert.equal(again.status,200,'a chat partner can be picked by chat id');assert.equal(again.json.trade.to.name,'동행시험');assert.equal((await app.api('/trade/cancel',{method:'POST',token:token2,body:{id:again.json.trade.id}})).json.trade.status,'CANCELLED');
const third=await app.api('/trade/offer',{method:'POST',token:token2,body:{to:'friend_02',give:[{item:'ING_APPLE',qty:2}]}});assert.equal((await app.api('/trade/decline',{method:'POST',token:ft,body:{id:third.json.trade.id}})).json.trade.status,'DECLINED');
const afterTrade=app.store.meta(tester.id).revision;assert.equal((await app.api('/game/action',{method:'POST',token:token2,body:{...action,revision:afterTrade-1,requestId:'after-trade-stale'}})).status,409,'a client behind a trade resyncs');
await app.close();

const dir=await mkdtemp(join(tmpdir(),'crpg-live-region-')),dbPath=join(dir,'live.sqlite3');
app=await open(dbPath);
const persistent=await app.api('/register',{method:'POST',body:{username:'persist_01',password}}),pt=persistent.json.token;
const newGame=await app.api('/game/new',{method:'POST',token:pt,body:{name:'지속시험',route:'ROUTE_ISEKAI'}});
const move={version:'0.14.5',engineVersion:newGame.json.engineVersion,type:'MENU',params:{screen:'SYSTEM'},revision:0,requestId:'persistent-live-0001',responseMode:'state-parts-v1'};
assert.equal((await app.api('/game/action',{method:'POST',token:pt,body:move})).status,200);await app.close();
app=await open(dbPath);
const relog=await app.api('/login',{method:'POST',body:{username:'persist_01',password}});assert.equal(relog.status,200);const restored=await app.api('/me',{token:relog.json.token});assert.equal(restored.status,200);assert.equal(restored.json.revision,1);
assert.equal((await app.api('/account/delete',{method:'POST',token:relog.json.token,body:{confirm:'persist_01',password}})).status,200);
assert.equal((await app.api('/login',{method:'POST',body:{username:'persist_01',password}})).status,401);
await app.close();await rm(dir,{recursive:true,force:true});
// Production databases keep the social tables off until they are approved.
const prodDir=await mkdtemp(join(tmpdir(),'crpg-live-prod-')),prod=await open(join(prodDir,'production.sqlite3'));
assert.deepEqual(prod.store.capabilities(),['state-parts-v1']);const pr=await prod.api('/register',{method:'POST',body:{username:'prod_user',password}});assert.equal((await prod.api('/chat/recent',{token:pr.json.token})).status,404);assert.equal(prod.store.db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('chat','trades')").get().n,0);
await prod.close();await rm(prodDir,{recursive:true,force:true});
console.log(JSON.stringify({ok:true,checks:['health','CORS gate','same-origin gameplay mirror','register','login','session','new game','delta reconstruction','requestId replay','requestId collision','revision conflict','parallel duplicate','logout','chat send/stream/recent/limits','trade bound items','trade accept both saves','trade cancel/decline','file restart persistence','account delete','production social off']}));
