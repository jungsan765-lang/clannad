// 0.16.66 운영자 이벤트 on the Seoul server (server/op-events-v01666.mjs): the operator opens and closes events, players read them,
// and the engine gets the open ones with each action (env.OP_EVENTS).
import assert from 'node:assert/strict';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';
import {consoleSecret} from '../server/admin-console-setup.mjs';
import {ENGINE_VERSION} from '../server/generated/engine.mjs';

const pepper='op-events-test-pepper-'.padEnd(64,'p'),password='correct-horse-battery-events',consolePassword='console-test-pass';
let checks=0;const ok=(cond,msg)=>{assert(cond,msg);checks++;};
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,adminConsoleId:'CLANNAD',adminConsoleHash:await consoleSecret(consolePassword,pepper),features:['chat','trade','coop']}),base='http://127.0.0.1:'+app.address.port;
async function api(path,{body,token,admin}={}){
 const headers={'x-forwarded-for':'10.1.0.'+(1+Math.floor(Math.random()*200))};if(token)headers.authorization='Bearer '+token;if(admin)headers.authorization='Admin '+admin;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
try{
 const admin=(await api('/admin/login',{body:{id:'CLANNAD',password:consolePassword}})).json.token,A=(path,body)=>api(path,{admin,body});
 const reg=await api('/register',{body:{username:'event_one',password,displayName:'하나'}});const token=reg.json.token;
 const started=await api('/game/new',{token,body:{name:'하나',route:'ROUTE_TRAVELER'}});ok(started.status===200,'journey started');const rev=Number(started.json.revision??started.json.journey?.revision??1);
 let list=(await A('/admin/events')).json;ok(list.kinds.map(k=>k.id).join()==='LEY_DOUBLE,DOMAIN_SUPPLY,BOSS_DOUBLE,FESTIVAL'&&list.active.length===0,'four kinds, none open');
 ok((await api('/events',{token})).json.events.length===0,'players see none');
 let r=await A('/admin/events',{op:'open',kind:'FESTIVAL',days:3});ok(r.status===200&&r.json.event.kind==='FESTIVAL'&&r.json.event.name==='축제 교환','opened 축제 교환 for three days');
 ok((await A('/admin/events',{op:'open',kind:'FESTIVAL',days:3})).status===409,'one event of a kind at a time');
 ok((await A('/admin/events',{op:'open',kind:'LEY_DOUBLE',days:31})).status===400,'one to thirty days');
 ok((await A('/admin/events',{op:'open',kind:'nothing',days:3})).status===400,'only the four kinds');
 ok((await A('/admin/events',{op:'open',kind:'LEY_DOUBLE',days:7})).status===200,'two kinds may run together');
 const seen=(await api('/events',{token})).json;ok(seen.events.map(e=>e.kind).sort().join()==='FESTIVAL,LEY_DOUBLE'&&seen.shop.length===8&&seen.tokens.win===2,'players see both, with the exchange list');
 const audit=JSON.stringify((await A('/admin/audit')).json);ok(audit.includes('event-open'),'the operator log records it');
 // the engine gets the open events with an action: a shop exists in the save's view only while the event runs
 const fest=seen.events.find(e=>e.kind==='FESTIVAL');
 const act=await api('/game/action',{token,body:{type:'EVENT_EXCHANGE',params:{event:fest.id,item:'HERO'},requestId:'event-exchange-0001-abcd',revision:rev,version:ENGINE_VERSION}});
 ok(act.status===400&&/축제 증표가 모자랍니다/.test(act.json.error),'the exchange reaches the engine with the open event (no tokens yet): '+act.json.error);
 // close: gone for players and for the engine
 list=(await A('/admin/events')).json;const num=list.events.find(e=>e.kind==='FESTIVAL').num;ok((await A('/admin/events',{op:'close',num})).status===200,'closed early');
 ok(!(await api('/events',{token})).json.events.some(e=>e.kind==='FESTIVAL'),'gone for players');
 const after=await api('/game/action',{token,body:{type:'EVENT_EXCHANGE',params:{event:fest.id,item:'HERO'},requestId:'event-exchange-0002-abcd',revision:rev,version:ENGINE_VERSION}});
 ok(after.status===400&&/열린 축제 교환이 없습니다/.test(after.json.error),'and for the engine');
 ok((await A('/admin/events',{op:'close',num})).status===409,'closing twice is refused');
}finally{await app.close();}
console.log(JSON.stringify({ok:true,checks}));
