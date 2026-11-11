// 0.16.61 서버 문과 대화 채널 (user, 2026-10-18: 「서버 닫거나 여는걸 운영자에 추가해준다거나」, 「서버 인원이 너무 많아서 병목이 생기면 알아서
// 막아준다거나」, 「대화창이 사람이 많아지면 문제가 발생할 수 있으니 여럿으로 나눈다거나?」), against the Seoul server in memory.
import assert from 'node:assert/strict';
import {request as httpRequest} from 'node:http';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';
import {consoleSecret} from '../server/admin-console-setup.mjs';

const pepper='server-gate-test-pepper-'.padEnd(64,'p'),password='correct-horse-battery-staging',consolePassword='console-test-pass';
let checks=0;const ok=(cond,msg)=>{assert(cond,msg);checks++;};
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,adminConsoleId:'CLANNAD',adminConsoleHash:await consoleSecret(consolePassword,pepper),features:['chat','trade','coop']}),base='http://127.0.0.1:'+app.address.port;
async function api(path,{body,token,admin}={}){
 const headers={'x-forwarded-for':'10.0.0.'+(1+Math.floor(Math.random()*200))};if(token)headers.authorization='Bearer '+token;if(admin)headers.authorization='Admin '+admin;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
try{
 const admin=(await api('/admin/login',{body:{id:'CLANNAD',password:consolePassword}})).json.token,A=(path,body)=>api(path,{admin,body});
 const reg=async name=>{const r=await api('/register',{body:{username:name,password,displayName:name}});assert.equal(r.status,200,JSON.stringify(r.json));return r.json.token;};
 const one=await reg('gate_one'),two=await reg('gate_two');
 ok((await api('/game/new',{token:one,body:{name:'하나',route:'ROUTE_TRAVELER'}})).status===200,'journey started');

 // ---------- the operator's view ----------
 let g=(await A('/admin/server')).json;ok(g.open===true&&g.maxOnline>=1&&g.online>=2&&g.busy===false,'open, a limit, two online after registering');

 // ---------- closed (점검) ----------
 g=(await A('/admin/server',{open:false,message:'오전 9시까지 점검합니다.'})).json;ok(g.open===false&&g.message==='오전 9시까지 점검합니다.','closed with a message');
 let r=await api('/login',{body:{username:'gate_two',password}});ok(r.status===503&&r.json.code==='SERVER_CLOSED'&&/오전 9시까지 점검합니다/.test(r.json.error),'a player cannot log in, and reads why');
 r=await api('/register',{body:{username:'gate_three',password,displayName:'셋'}});ok(r.status===503&&r.json.code==='SERVER_CLOSED','nor make an account');
 r=await api('/game/action',{token:one,body:{type:'MENU',params:{screen:'SYSTEM'},requestId:'gate-closed-1-abcdef',revision:1}});ok(r.status===503&&r.json.code==='SERVER_CLOSED'&&r.json.outcome==='REJECTED','a logged-in player cannot act; the action is refused, not left pending');
 ok((await api('/me',{token:one})).status===200,'reading still works (the screen can show what happened)');
 const audit=(await A('/admin/audit')).json;ok(JSON.stringify(audit).includes('server-gate'),'the operator log records it');
 g=(await A('/admin/server',{open:true})).json;ok(g.open===true,'opened again');
 ok((await api('/login',{body:{username:'gate_two',password}})).status===200,'logging in works again');

 // ---------- full ----------
 g=(await A('/admin/server',{maxOnline:2})).json;ok(g.maxOnline===2,'at most two at once');
 r=await api('/register',{body:{username:'gate_four',password,displayName:'넷'}});ok(r.status===503&&r.json.code==='SERVER_FULL'&&/2 \/ 2명/.test(r.json.error),'a third cannot come in, and sees the count');
 ok((await api('/login',{body:{username:'gate_one',password}})).status===200,'one already online can log in again');
 r=await api('/admin/server',{admin,body:{maxOnline:0}});ok(r.status===400,'a limit below one is refused');
 await A('/admin/server',{maxOnline:300});

 // ---------- busy ----------
 app.store.gate.busy=true;r=await api('/register',{body:{username:'gate_five',password,displayName:'다섯'}});ok(r.status===503&&r.json.code==='SERVER_BUSY','a busy server turns away newcomers');
 ok((await api('/game/action',{token:one,body:{type:'MENU',params:{screen:'SYSTEM'},requestId:'gate-busy-1-abcdefgh',revision:1}})).json.code!=='SERVER_BUSY','but the players already in keep playing');
 app.store.gate.busy=false;

 // ---------- chat channels ----------
 const ch=(await api('/chat/channels',{token:one})).json;ok(ch.channels.length===5&&ch.channels[0].name==='채널 1'&&ch.pick==='world','five channels; a quiet server talks in 채널 1');
 const lines={world:[],'world-2':[]},streams=[];
 for(const [token,channel] of [[one,'world'],[two,'world-2']])await new Promise((done,bad)=>{const req=httpRequest(base+'/chat/stream?channel='+channel,{headers:{authorization:'Bearer '+token}},res=>{res.setEncoding('utf8');res.on('data',x=>{for(const m of x.matchAll(/data: (.*)/g)){try{const ev=JSON.parse(m[1]);if(ev.type==='chat')lines[channel].push(ev.message.text);}catch{}}});streams.push(req);done();});req.on('error',bad);req.end();});
 await new Promise(r=>setTimeout(r,100));
 const counts=(await api('/chat/channels',{token:one})).json.channels;ok(counts[0].count===1&&counts[1].count===1,'each channel counts who is in it');
 ok((await api('/chat/send',{token:two,body:{text:'채널 2 인사',channel:'world-2'}})).status===200,'a line in 채널 2');
 await new Promise(r=>setTimeout(r,1300));
 ok((await api('/chat/send',{token:one,body:{text:'채널 1 인사',channel:'world'}})).status===200,'a line in 채널 1');
 await A('/admin/notice',{text:'모든 채널 공지'});
 await new Promise(r=>setTimeout(r,200));
 ok(lines.world.includes('채널 1 인사')&&!lines.world.includes('채널 2 인사'),'채널 1 hears only its own lines');
 ok(lines['world-2'].includes('채널 2 인사')&&!lines['world-2'].includes('채널 1 인사'),'채널 2 hears only its own lines');
 ok(lines.world.includes('모든 채널 공지')&&lines['world-2'].includes('모든 채널 공지'),'an operator notice reaches every channel live');
 const recent2=(await api('/chat/recent?channel=world-2',{token:two})).json;ok(recent2.messages.some(m=>m.text==='모든 채널 공지')&&recent2.messages.some(m=>m.text==='채널 2 인사')&&!recent2.messages.some(m=>m.text==='채널 1 인사'),'a channel\'s recent lines: its own and the notices');
 ok((await api('/chat/recent?channel=nowhere',{token:two})).json.channel==='world','an unknown channel falls back to 채널 1');
 const first=(await api('/chat/recent',{token:two})).json;ok(first.channel==='world'&&first.channels?.length===5&&first.messages.some(m=>m.text==='모든 채널 공지'),'a device that never chose a channel asks once: the pick of the server, its lines and the counts');
 for(const s of streams)s.destroy();
 // A server that is full fills 채널 1 to 60 first (pick), then the quietest.
 const store=app.store,fake=[];for(let i=0;i<60;i++){const s={account:'fake'+i,channel:'world',send(){},res:{}};fake.push(s);store.subscribers.add(s);}
 ok(store.chatChannels().pick==='world-2','with 60 in 채널 1 a newcomer goes to 채널 2');ok((await api('/chat/recent',{token:one})).json.channel==='world-2','and its first request lands there');for(const s of fake)store.subscribers.delete(s);
}finally{await app.close();}
console.log(JSON.stringify({ok:true,checks}));
