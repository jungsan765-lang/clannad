// Actual local HTTP + SQLite, synthetic accounts. Inflated HP keeps this retry fixture running; this is not a balance test.
import assert from 'node:assert/strict';

import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';

const app=await startLiveRegionStaging({dbPath:':memory:',pepper:'v016-readonly-review-synthetic-pepper'.padEnd(64,'r'),host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'});
const store=app.store,base='http://127.0.0.1:'+app.address.port,results=[];
let seq=0;
async function api(path,{body,token}={}){
 const headers={connection:'close'};if(token)headers.authorization='Bearer '+token;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)});
 return {status:r.status,json:await r.json()};
}
const rt=p=>store.runtimeOf(p.row.id);
const edit=(p,fn)=>app.adminConsole.editSave(p.row,r=>{
 const out=typeof fn==='function'?fn(r):app.adminConsole.applyOps(r,fn);
 if(r.s.mail?.list.some(x=>x.kind==='GIFT'&&!x.claimed))r.mailClaim('ALL');return out;
},'read-only review fixture');
async function player(username,display){
 store.rates.clear();const reg=await api('/register',{body:{username,password:'synthetic-review-only-password-016',displayName:display}});assert.equal(reg.status,200,JSON.stringify(reg.json));
 const made=await api('/game/new',{token:reg.json.token,body:{name:display,route:'ROUTE_TRAVELER'}});assert.equal(made.status,200);
 const p={token:reg.json.token,row:store.account(username),version:made.json.version,engineVersion:made.json.engineVersion};
 await edit(p,[{op:'level',target:'PLAYER_CUSTOM',value:20},{op:'teleport',map:'MAP_MOND_CITY'}]);
 p.pid=(await api('/coop/room',{token:p.token})).json.me.pid;return p;
}
async function act(p,type,params={}){
 store.rates.clear();const m=store.meta(p.row.id);
 return api('/game/action',{token:p.token,body:{version:p.version,engineVersion:p.engineVersion,type,params,revision:m.revision,requestId:'review-action-'+String(++seq).padStart(6,'0'),responseMode:'state-parts-v1'}});
}
const view=async p=>(await api('/coop/room',{token:p.token})).json;
try{
 const H=await player('review_host_016','검사방장'),G=await player('review_guest_016','검사손님');
 const roomId=(await api('/coop/open',{token:H.token,body:{}})).json.room.id;
 assert.equal((await api('/coop/join',{token:G.token,body:{room:roomId}})).status,200);
 // A persisted guest-owned roaming fight fixture. API joins and commands below are real local HTTP requests.
 await edit(G,r=>{
  r.coopContext={version:1,room:roomId,members:[]};r.coopAwayStart(roomId,'MAP_MOND_PLAINS');
  try{r.startBattle('EG_MOND_HILI_PATROL','RANDOM');}finally{r.coopContext=null;}
  for(const a of r.s.runtime.actors){a.maxHp=100000;a.hp=100000;if(a.side==='ENEMY')a.atk=1;}
 });
 const battle=rt(G).s.runtime.id;
 store.coopAfter(G.row,rt(G),null);
 await edit(H,[{op:'teleport',map:'MAP_MOND_PLAINS'}]);
 const join=await api('/coop/fight',{token:H.token,body:{owner:G.pid}});assert.equal(join.status,200,JSON.stringify(join.json));assert.equal(join.json.admitted,true);
 assert.equal((await act(G,'COMBAT_BEGIN',{battle})).status,200);
 for(let i=0;i<40&&rt(G).s.runtime?.coop?.turn?.owner!==H.pid;i++){
  assert(rt(G).s.runtime);const out=await act(G,'COMBAT',{card:'PLAYER_BASIC_GUARD'});assert.equal(out.status,200,JSON.stringify(out.json));
 }
 const v=(await view(H)).battle;assert(v?.turn?.mine);assert.equal(v.owner.pid,G.pid);
 const card=v.cards.find(x=>!x.reason&&x.id==='PLAYER_BASIC_GUARD')||v.cards.find(x=>!x.reason);assert(card);
 const command={requestId:'review-coop-retry-0001',card:card.id,target:card.targets?.[0]?.id,battle:v.battle,turn:{actor:v.turn.actor,deadline:v.turn.deadline,round:v.round}};
 const first=await api('/coop/act',{token:H.token,body:command});assert.equal(first.status,200,JSON.stringify(first.json));
 const revisionAfterFirst=store.meta(G.row.id).revision;
 const replay=await api('/coop/act',{token:H.token,body:command});assert.equal(replay.status,200,JSON.stringify(replay.json));assert.equal(replay.json.replayed,true);
 const after=(await view(H)).battle;
 const record={case:'replayed-command-on-guest-owned-fight',version:H.version,first:{status:first.status,battle:first.json.battle?.battle||null,owner:first.json.battle?.owner?.pid||null},replay:{status:replay.status,replayed:replay.json.replayed,battle:replay.json.battle?.battle||null},statusAfter:{battle:after?.battle||null,owner:after?.owner?.pid||null},guestFightStillRunning:rt(G).s.runtime?.id===battle,ownerSaveRevision:store.meta(G.row.id).revision};
 results.push(record);console.log(JSON.stringify(record));
 assert(first.json.battle?.battle===battle);assert(after?.battle===battle);assert(rt(G).s.runtime?.id===battle);
 assert.equal(replay.json.battle?.battle,battle,'retry must return the actual owner’s running fight');
 assert.equal(replay.json.battle.owner.pid,G.pid);
 assert.equal(store.meta(G.row.id).revision,revisionAfterFirst,'retry does not execute or pay twice');
 const reused=await api('/coop/act',{token:H.token,body:{...command,card:'PLAYER_BASIC_ATTACK'}});assert.equal(reused.status,409);assert.equal(reused.json.code,'REQUEST_ID_REUSED');
 console.log('PASS guest-owned co-op retry preserves the battle, owner and save revision; changed intent is rejected');
}finally{
 await app.close();
}
