// 0.15.1 편지 between adventurers (server/letters-v0151.mjs) and the operator's rollback following letters and the market
// (server/admin-api.mjs), against the Seoul server in memory.
import assert from 'node:assert/strict';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';
import {consoleSecret} from '../server/admin-console-setup.mjs';
import {POST,postage} from '../server/letters-v0151.mjs';

const pepper='letters-v0151-test-pepper-'.padEnd(64,'l'),password='correct-horse-battery-letters',consolePassword='console-letters-pass';
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop',adminConsoleId:'CLANNAD',adminConsoleHash:await consoleSecret(consolePassword,pepper)}),base='http://127.0.0.1:'+app.address.port;
async function api(path,{method='GET',body,token,admin}={}){
 const headers={};if(token)headers.authorization='Bearer '+token;if(admin)headers.authorization='Admin '+admin;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?method:'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
const checks=[];const check=(name,fn)=>{app.store.rates.clear();return fn().then(()=>{checks.push(name);console.log('PASS '+name);});};
// What the console gives arrives by mail (0.15.1); these tests take it at once.
const edit=(p,ops)=>app.adminConsole.editSave(p.row,r=>{const out=app.adminConsole.applyOps(r,ops);if(r.s.mail?.list.some(x=>x.kind==='GIFT'&&!x.claimed))r.mailClaim('ALL');return out;},'test');
async function player(username,display,{free=true}={}){
 const reg=await api('/register',{body:{username,password,displayName:display}});assert.equal(reg.status,200,JSON.stringify(reg.json));
 const token=reg.json.token;assert.equal((await api('/game/new',{token,body:{name:display,route:'ROUTE_TRAVELER'}})).status,200);
 const p={token,row:app.store.account(username)};p.pid=(await api('/chat/recent',{token})).json.me;if(free)await edit(p,[{op:'teleport',map:'MAP_MOND_CITY'}]);return p; // a new journey starts in its opening story
}
const R=p=>app.store.runtimeOf(p.row.id),count=(p,item)=>R(p).itemCount(item),mora=p=>Number(R(p).s.global.MORA)||0;
const sword=p=>R(p).s.inventory.find(i=>i.equip==='EQ_SWORD_HARBINGER'&&!i.equipped);
const send=(p,body)=>api('/mail/send',{token:p.token,body});
const box=async p=>(await api('/mail/letters',{token:p.token})).json;
const row=id=>app.store.db.prepare('SELECT * FROM letters WHERE id=?').get(id);
async function listen(token){
 const res=await fetch(base+'/chat/stream',{headers:{authorization:'Bearer '+token}});assert.equal(res.status,200);
 const reader=res.body.getReader(),dec=new TextDecoder(),events=[];let buf='',stop=false;
 (async()=>{try{while(!stop){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n\n'))>=0){const block=buf.slice(0,i);buf=buf.slice(i+2);const data=block.split('\n').filter(l=>l.startsWith('data: ')).map(l=>l.slice(6)).join('\n');if(data)try{events.push(JSON.parse(data));}catch{}}}}catch{}})();
 return {events,close:()=>{stop=true;reader.cancel().catch(()=>{});},wait:async(test,ms=3000)=>{const t=Date.now();while(Date.now()-t<ms){const e=events.find(test);if(e)return e;await new Promise(r=>setTimeout(r,25));}throw new Error('no event');}};
}

const A=await player('letter_a','편지쓴이'),B=await player('letter_b','받는이'),C=await player('letter_c','셋째'),D=await player('letter_d','이야기중',{free:false});
await edit(A,[{op:'currency',key:'MORA',mode:'set',value:20000},{op:'item',id:'ING_APPLE',count:20},{op:'equipment_give',id:'EQ_SWORD_HARBINGER',enhance:4,count:1}]);
await edit(B,[{op:'currency',key:'MORA',mode:'set',value:20000}]);
const la=await listen(A.token),lb=await listen(B.token);

await check('letters are on the server with trades; adventurers are found by the name everyone sees',async()=>{
 assert((await api('/health')).json.capabilities.includes('mail-v1'));
 const found=(await api('/mail/find?q='+encodeURIComponent('받는'),{token:A.token})).json.players;
 assert.deepEqual(found.map(x=>x.pid),[B.pid]);assert.equal(found[0].name,'받는이');assert(!JSON.stringify(found).includes('letter_b'),'login IDs stay private');
 assert.deepEqual((await api('/mail/find?q='+encodeURIComponent('편지쓴'),{token:A.token})).json.players,[],'not oneself');
 assert.deepEqual((await api('/mail/find?q=',{token:A.token})).json.players,[]);
 assert.equal(postage(0,0),POST.base);assert.equal(postage(2,1000),50+200+50);assert.equal(postage(1,10),50+100+1);
});

await check('sending: checked first, then the parcel and the postage leave the sender in one save',async()=>{
 const slot=sword(A).slot,m0=mora(A),a0=count(A,'ING_APPLE');
 assert.equal((await send(A,{to:B.pid,title:'  ',body:'x'})).status,400,'a title is needed');
 assert.equal((await send(A,{to:A.pid,title:'나에게'})).status,400,'not to oneself');
 assert.equal((await send(A,{to:'000000000000',title:'누구'})).status,404);
 assert.equal((await send(A,{to:B.pid,title:'많이',items:Array.from({length:7},(_,i)=>({item:'ING_APPLE',qty:i+1}))})).status,400,'six kinds at most');
 const bound=await send(A,{to:B.pid,title:'책',items:[{item:'MAT_CHAR_EXP_HERO',qty:1}]});assert.equal(bound.status,400);assert.match(bound.json.error,/경험치 책/);
 const poor=await send(A,{to:B.pid,title:'부자',mora:30000});assert.equal(poor.status,409);assert.match(poor.json.error,/모라가 부족/);
 assert.equal(mora(A),m0);assert.equal(count(A,'ING_APPLE'),a0,'nothing moved');
 const sent=await send(A,{to:B.pid,title:'선물이야',body:'첫 줄\n\n\n\n둘째 줄‮',items:[{item:'ING_APPLE',qty:3},{slot}],mora:1000});assert.equal(sent.status,200,JSON.stringify(sent.json));
 const l=sent.json.letter;assert.equal(sent.json.fee,300);assert.equal(l.fee,300);assert.equal(l.status,'SENT');assert.equal(l.parcel,true);assert.equal(l.waiting,false,'it waits for the receiver');
 assert.equal(l.body,'첫 줄\n\n둘째 줄','plain text: no direction marks, at most one empty line');
 assert.equal(mora(A),m0-1000-300);assert.equal(count(A,'ING_APPLE'),a0-3);assert(!R(A).s.inventory.some(i=>i.slot===slot),'the sword left the bag');
 const receipt=JSON.parse(app.store.db.prepare("SELECT result FROM receipts WHERE account_id=? AND request_id=?").get(A.row.id,'letter-send-'+l.id).result).result;
 assert.deepEqual(receipt,{type:'MAIL_SEND',letter:l.id,parcel:true,fee:300});
 const ev=await lb.wait(e=>e.type==='mail'&&e.status==='NEW'&&e.id===l.id);assert.equal(ev.from,'편지쓴이');assert.equal(ev.parcel,true);
});

await check('receiving: the box lists it, reading is remembered, the parcel is taken once; a waiting parcel keeps its letter',async()=>{
 const inB=await box(B),l=inB.inbox[0],id=l.id;assert.equal(l.box,'IN');assert.equal(l.waiting,true);assert.equal(l.read,false);assert.equal(inB.new,1);
 assert.deepEqual(l.goods.map(g=>g.kind+':'+g.ref+':'+g.qty+(g.kind==='GEAR'?'+'+g.enhance:'')),['ITEM:ING_APPLE:3','GEAR:EQ_SWORD_HARBINGER:1+4']);assert.equal(l.mora,1000);
 assert.equal((await box(A)).inbox.length,0,'the sender\'s box has nothing new');
 assert.deepEqual((await api('/mail/delete',{token:B.token,body:{ids:[id]}})).json,{deleted:0,kept:1},'take or send back first');
 assert.equal((await api('/mail/read',{token:B.token,body:{ids:[id]}})).json.read,1);assert.equal((await box(A)).sent[0].read,true,'the sender sees it was read');
 const b0=count(B,'ING_APPLE'),m0=mora(B),took=await api('/mail/take',{token:B.token,body:{id}});assert.equal(took.status,200,JSON.stringify(took.json));
 assert.equal(count(B,'ING_APPLE'),b0+3);assert.equal(mora(B),m0+1000);assert.equal(sword(B)?.enhance,4,'gear keeps its enhancement');
 assert.equal(row(id).status,'TAKEN');await la.wait(e=>e.type==='mail'&&e.status==='TAKEN'&&e.id===id);
 assert.equal((await api('/mail/take',{token:B.token,body:{id}})).status,409,'only once');
 assert.equal((await api('/mail/take',{token:C.token,body:{id}})).status,409,'nobody else');
 assert.deepEqual((await api('/mail/delete',{token:B.token,body:{ids:[id]}})).json,{deleted:1,kept:0});
 assert.equal((await box(B)).inbox.length,0);assert.equal((await box(A)).sent[0].status,'TAKEN','the sender still sees where it went');
});

await check('sending back: the parcel goes home and its sender takes it back; the postage stays paid',async()=>{
 const a0=count(A,'ING_APPLE'),m0=mora(A),l=(await send(A,{to:B.pid,title:'또 사과',items:[{item:'ING_APPLE',qty:2}]})).json.letter;
 assert.equal(mora(A),m0-150);assert.equal(count(A,'ING_APPLE'),a0-2);
 assert.equal((await api('/mail/return',{token:A.token,body:{id:l.id}})).status,404,'only the receiver sends it back');
 assert.equal((await api('/mail/return',{token:B.token,body:{id:l.id}})).status,200);await la.wait(e=>e.type==='mail'&&e.status==='RETURNED'&&e.id===l.id);
 assert.equal((await api('/mail/take',{token:B.token,body:{id:l.id}})).status,409,'the receiver no longer has it');assert.equal((await api('/mail/return',{token:B.token,body:{id:l.id}})).status,409);
 const back=(await box(A)).inbox.find(x=>x.id===l.id);assert.equal(back.box,'BACK');assert.equal(back.waiting,true);assert.match(back.note,/돌려보냈/);
 assert.deepEqual((await api('/mail/delete',{token:A.token,body:{ids:[l.id]}})).json,{deleted:0,kept:1},'take it back first');
 const took=await api('/mail/take',{token:A.token,body:{all:true}});assert.equal(took.status,200);assert.deepEqual(took.json.back,[l.id]);
 assert.equal(count(A,'ING_APPLE'),a0);assert.equal(mora(A),m0-150,'postage is not refunded');assert.equal(row(l.id).status,'BACK');
});

await check('free time only; blocking; plain letters; a parcel left 30 days, or for someone who left, goes home',async()=>{
 const busy=await send(D,{to:A.pid,title:'이야기 중'});assert.equal(busy.status,409);assert.equal(busy.json.code,'NOT_FREE');assert.match(busy.json.error,/편지를 보낼/);
 const m0=mora(A),plain=await send(A,{to:D.pid,title:'안부',body:'잘 지내?'});assert.equal(plain.status,200);assert.equal(mora(A),m0-POST.base);assert.equal(plain.json.letter.parcel,false);
 const parcel=(await send(A,{to:D.pid,title:'사과',items:[{item:'ING_APPLE',qty:1}]})).json.letter;
 const wait=await api('/mail/take',{token:D.token,body:{id:parcel.id}});assert.equal(wait.status,409);assert.match(wait.json.error,/물건을 받을/);
 assert.equal((await api('/mail/block',{token:B.token,body:{pid:A.pid}})).json.blocked,true);
 const no=await send(A,{to:B.pid,title:'차단됨'});assert.equal(no.status,403);assert.match(no.json.error,/받지 않습니다/);
 assert.deepEqual((await box(B)).blocked.map(x=>x.pid),[A.pid]);
 assert.equal((await api('/mail/block',{token:B.token,body:{pid:A.pid,blocked:false}})).json.blocked,false);assert.equal((await send(A,{to:B.pid,title:'다시'})).status,200);
 const old=(await send(A,{to:B.pid,title:'오래됨',items:[{item:'ING_APPLE',qty:1}]})).json.letter;
 app.store.db.prepare('UPDATE letters SET expires_at=? WHERE id=?').run(Date.now()-1000,old.id);app.store.letterSweep(true);
 assert.equal(row(old.id).status,'RETURNED');assert.match(row(old.id).note,/보관 기간/);
 const gone=(await send(A,{to:C.pid,title:'떠난 친구',items:[{item:'ING_APPLE',qty:1}]})).json.letter;
 app.store.db.prepare('DELETE FROM accounts WHERE id=?').run(C.row.id);app.store.letterSweep(true);
 assert.equal(row(gone.id).status,'RETURNED');assert.match(row(gone.id).note,/떠나/);
 const a0=count(A,'ING_APPLE');assert.equal((await api('/mail/take',{token:A.token,body:{all:true}})).status,200);assert.equal(count(A,'ING_APPLE'),a0+2);
});

await check('operator rollback: letters and the market follow the journey, or the rollback stops when another player is involved',async()=>{
 const login=await api('/admin/login',{body:{id:'CLANNAD',password:consolePassword}});assert.equal(login.status,200);const admin=login.json.token;
 const back=(p,steps=1)=>api('/admin/rollback',{admin,body:{id:p.row.id,steps}});
 const notice=p=>R(p).s.mail.list.filter(x=>x.kind==='NOTICE').at(-1)?.body||'';
 // a letter not yet taken comes back into the sender's journey
 let a0=count(A,'ING_APPLE'),m0=mora(A);const l1=(await send(A,{to:B.pid,title:'되돌릴 편지',items:[{item:'ING_APPLE',qty:2}],mora:500})).json.letter;
 let r=await back(A);assert.equal(r.status,200,JSON.stringify(r.json));assert.equal(row(l1.id),undefined,'the letter is gone');
 assert.equal(count(A,'ING_APPLE'),a0);assert.equal(mora(A),m0,'goods, Mora and postage are back');assert.match(notice(A),/거둬들임/);
 assert(!(await box(B)).inbox.some(x=>x.id===l1.id));await lb.wait(e=>e.type==='mail'&&e.status==='CHANGED');
 // taken by the receiver: the sender's rollback stops; the receiver's own rollback puts the parcel back in the letter
 const l2=(await send(A,{to:B.pid,title:'받은 편지',items:[{item:'ING_APPLE',qty:1}]})).json.letter;await api('/mail/take',{token:B.token,body:{id:l2.id}});
 a0=count(A,'ING_APPLE');r=await back(A);assert.equal(r.status,409);assert.match(r.json.error,/이미 받았습니다/);assert.equal(count(A,'ING_APPLE'),a0);
 const b0=count(B,'ING_APPLE');r=await back(B);assert.equal(r.status,200,JSON.stringify(r.json));assert.equal(row(l2.id).status,'SENT');assert.equal(count(B,'ING_APPLE'),b0-1);
 assert.equal((await api('/mail/take',{token:B.token,body:{id:l2.id}})).status,200);assert.equal(count(B,'ING_APPLE'),b0,'taken again, counted once');
 // a parcel taken back after a return waits again after the sender's rollback
 const l3=(await send(A,{to:B.pid,title:'돌아온 편지',items:[{item:'ING_APPLE',qty:1}]})).json.letter;await api('/mail/return',{token:B.token,body:{id:l3.id}});await api('/mail/take',{token:A.token,body:{id:l3.id}});
 a0=count(A,'ING_APPLE');r=await back(A);assert.equal(r.status,200);assert.equal(row(l3.id).status,'RETURNED');assert.equal(count(A,'ING_APPLE'),a0-1);
 assert.equal((await api('/mail/take',{token:A.token,body:{id:l3.id}})).status,200);assert.equal(count(A,'ING_APPLE'),a0);
 // market: a listing made in the reverted step leaves the market
 a0=count(A,'ING_APPLE');const s1=(await api('/market/sell',{token:A.token,body:{entry:{item:'ING_APPLE',qty:2},price:100}})).json.listing;
 r=await back(A);assert.equal(r.status,200);assert.equal(app.store.db.prepare('SELECT * FROM market WHERE id=?').get(s1.id),undefined);assert.equal(count(A,'ING_APPLE'),a0);assert.match(notice(A),/등록을 지움/);
 // a sold listing stops the seller's rollback; the buyer's rollback undoes the purchase while the money waits
 const s2=(await api('/market/sell',{token:A.token,body:{entry:{item:'ING_APPLE',qty:1},price:200}})).json.listing;const bm=mora(B);
 assert.equal((await api('/market/buy',{token:B.token,body:{id:s2.id,price:200}})).status,200);
 r=await back(A);assert.equal(r.status,409);assert.match(r.json.error,/팔렸습니다/);
 r=await back(B);assert.equal(r.status,200,JSON.stringify(r.json));assert.equal(mora(B),bm);
 const wallet=()=>app.store.db.prepare('SELECT mora FROM market_wallet WHERE account_id=?').get(A.row.id)?.mora||0;
 assert.equal(app.store.db.prepare('SELECT status FROM market WHERE id=?').get(s2.id).status,'ACTIVE');assert.equal(wallet(),0);
 // collected sale money goes back into the wallet
 assert.equal((await api('/market/buy',{token:B.token,body:{id:s2.id,price:200}})).status,200);m0=mora(A);
 assert.equal((await api('/market/collect',{token:A.token,body:{}})).json.mora,190);r=await back(A);assert.equal(r.status,200);assert.equal(mora(A),m0);assert.equal(wallet(),190);
 // a listing taken down goes back up
 const s3=(await api('/market/sell',{token:A.token,body:{entry:{item:'ING_APPLE',qty:1},price:300}})).json.listing;a0=count(A,'ING_APPLE');
 await api('/market/cancel',{token:A.token,body:{id:s3.id}});assert.equal(count(A,'ING_APPLE'),a0+1);
 r=await back(A);assert.equal(r.status,200);assert.equal(app.store.db.prepare('SELECT status FROM market WHERE id=?').get(s3.id).status,'ACTIVE');assert.equal(count(A,'ING_APPLE'),a0);
 // a live trade involves the other save: stop
 const inv=(await api('/deal/invite',{token:A.token,body:{toPid:B.pid}})).json.deal.id;await api('/deal/respond',{token:B.token,body:{id:inv,accept:true}});
 await api('/deal/update',{token:A.token,body:{id:inv,items:[{item:'ING_APPLE',qty:1}]}});for(const t of [A.token,B.token])await api('/deal/lock',{token:t,body:{id:inv,locked:true}});
 await api('/deal/confirm',{token:A.token,body:{id:inv}});assert.equal((await api('/deal/confirm',{token:B.token,body:{id:inv}})).json.deal.status,'DONE');
 r=await back(A);assert.equal(r.status,409);assert.match(r.json.error,/직접 거래/);
 // the console's trade log shows letters, the market and live trades
 const log=(await api('/admin/trades',{admin})).json;
 const kept=log.letters.find(x=>x.title==='받은 편지');assert(kept&&kept.status==='TAKEN'&&kept.fee===150&&/사과/.test(kept.label),'letters with what they carried');
 assert(log.letters.some(x=>x.title==='돌아온 편지'&&x.status==='BACK'));assert(!log.letters.some(x=>x.title==='되돌릴 편지'),'a letter taken back by a rollback is gone');
 assert(log.market.some(x=>x.id===s2.id&&x.status==='SOLD'));assert(log.deals.some(x=>x.id===inv));
});

la.close();lb.close();
await app.close();
console.log(JSON.stringify({ok:true,checks}));
