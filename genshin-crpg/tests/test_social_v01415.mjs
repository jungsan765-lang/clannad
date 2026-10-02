// 0.14.15 social layer on the Seoul account server: Spiral Abyss season records (medals, last season's chat frame,
// the old ABYSS_01 records moved to their month), public profiles, the market with its fee, and live trades.
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';
import {migrateRankingSeasons,MARKET} from '../server/social-v01415.mjs';

const pepper='social-v01415-test-pepper-'.padEnd(64,'x'),password='correct-horse-battery-social';
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port;
async function api(path,{method='GET',body,token}={}){
 const headers={};if(token)headers.authorization='Bearer '+token;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
const checks=[];const check=(name,fn)=>fn().then(()=>{checks.push(name);console.log('PASS '+name);});
async function player(username,display){
 const reg=await api('/register',{method:'POST',body:{username,password,displayName:display}});assert.equal(reg.status,200,JSON.stringify(reg.json));
 const token=reg.json.token;assert.equal((await api('/game/new',{method:'POST',token,body:{name:display,route:'ROUTE_TRAVELER'}})).status,200);
 const p={token,row:app.store.account(username)};await edit(p,[{op:'teleport',map:'MAP_MOND_CITY'}]);return p; // free play: trading is for free time
}
// 0.15.1: what the console gives arrives in the mailbox; these tests take it at once.
const edit=(p,ops)=>app.adminConsole.editSave(p.row,r=>{const out=app.adminConsole.applyOps(r,ops);if(r.s.mail?.list.some(x=>x.kind==='GIFT'&&!x.claimed))r.mailClaim('ALL');return out;},'test');
const count=(p,item)=>app.store.runtimeOf(p.row.id).itemCount(item);
const mora=p=>Number(app.store.runtimeOf(p.row.id).s.global.MORA);
// An SSE reader that collects the events one account receives.
async function listen(token){
 const res=await fetch(base+'/chat/stream',{headers:{authorization:'Bearer '+token}});assert.equal(res.status,200);
 const reader=res.body.getReader(),dec=new TextDecoder(),events=[];let buf='',stop=false;
 (async()=>{try{while(!stop){const {value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let i;while((i=buf.indexOf('\n\n'))>=0){const block=buf.slice(0,i);buf=buf.slice(i+2);const data=block.split('\n').filter(l=>l.startsWith('data: ')).map(l=>l.slice(6)).join('\n');if(data)try{events.push(JSON.parse(data));}catch{}}}}catch{}})();
 return {events,close:()=>{stop=true;reader.cancel().catch(()=>{});},wait:async(test,ms=3000)=>{const t=Date.now();while(Date.now()-t<ms){const e=events.find(test);if(e)return e;await new Promise(r=>setTimeout(r,25));}throw new Error('no event');}};
}

const A=await player('seller_01','바람상인'),B=await player('buyer_02','리월손님'),C=await player('offline_03','먼곳');
const pidA=(await api('/chat/recent',{token:A.token})).json.me,pidB=(await api('/chat/recent',{token:B.token})).json.me,pidC=(await api('/chat/recent',{token:C.token})).json.me;

await check('capabilities list profiles, the market and live trades',async()=>{
 const h=(await api('/health')).json;for(const c of ['profile-v1','market-v1','deal-v1'])assert(h.capabilities.includes(c),c);
});

await check('profiles: protagonist, companions, the party with its gear and the Abyss season; unknown ids fail',async()=>{
 await edit(A,[{op:'recruit',char:'MOND_AMBER'},{op:'level',target:'PLAYER_CUSTOM',value:9},{op:'constellation',char:'MOND_AMBER',value:2}]);
 const p=(await api('/profile?pid='+pidA,{token:B.token}));assert.equal(p.status,200,JSON.stringify(p.json));
 const v=p.json;assert.equal(v.name,'바람상인');assert.equal(v.you,false);assert.equal(v.journey,true);assert.equal(v.player.level,9);
 const amber=v.companions.find(x=>x.id==='MOND_AMBER');assert(amber&&amber.constellation===2&&amber.rarity===4,'Amber C2 4★');
 assert(Array.isArray(v.party)&&v.party.some(x=>x.id==='PLAYER_CUSTOM'),'party with the protagonist');assert(v.abyss&&/^ABYSS_\d{4}_\d{2}$/.test(v.abyss.season));
 assert(!('username' in v)&&!JSON.stringify(v).includes('seller_01'),'login ids stay private');
 assert.equal((await api('/profile?pid=000000000000',{token:B.token})).status,404);
});

await check('seasons: ABYSS_01 records move to the month they were reached; medals and last season\'s frame ride on chat lines',async()=>{
 const db=new DatabaseSync(':memory:');db.exec('CREATE TABLE ranking(account_id TEXT NOT NULL,season TEXT NOT NULL,display_name TEXT NOT NULL,floor INTEGER NOT NULL,rounds INTEGER NOT NULL,attempts INTEGER NOT NULL,achieved_at INTEGER NOT NULL,PRIMARY KEY(account_id,season)) STRICT');
 db.prepare('INSERT INTO ranking VALUES(?,?,?,?,?,?,?)').run('x','ABYSS_01','x',10,30,2,Date.UTC(2026,8,20));assert.equal(migrateRankingSeasons(db),1);
 assert.deepEqual(db.prepare('SELECT season,floor FROM ranking').all().map(r=>({...r})),[{season:'ABYSS_2026_09',floor:10}]);
 const S=globalThis.CRPGRuntime.abyssSeason,cur=S.of(Date.now()),prev=S.previous(cur);
 const put=app.store.db.prepare('INSERT INTO ranking VALUES(?,?,?,?,?,?,?)');put.run(A.row.id,prev,'바람상인',11,40,3,Date.now()-86400000*40);put.run(A.row.id,cur,'바람상인',10,35,2,Date.now());put.run(A.row.id,S.previous(prev),'바람상인',9,40,3,Date.now()-86400000*70);
 app.store.dropHonours(A.row.id);
 assert.equal((await api('/chat/send',{method:'POST',token:A.token,body:{text:'거래하실 분'}})).status,200);
 const line=(await api('/chat/recent',{token:B.token})).json.messages.find(m=>m.pid===pidA);
 assert.equal(line.medals,2,'floor 10+ in two seasons');assert.equal(line.top,11);assert.equal(line.frame,11,'last season reached floor 11');
 const p=(await api('/profile?pid='+pidA,{token:B.token})).json;assert.equal(p.honours.count,2);assert.deepEqual(p.honours.medals.map(m=>m.floor),[11,10]);
 const r=(await api('/ranking')).json;assert.equal(r.season,cur);assert.equal(r.previous.season,prev);assert(r.entries.some(e=>e.name==='바람상인'&&e.floor===10));
});

await check('market: listing takes the goods, a purchase pays the seller less 5%, the seller collects; bound items stay home',async()=>{
 await edit(A,[{op:'item',id:'ORE_CRYSTAL',count:10},{op:'equipment_give',id:'EQ_SWORD_HARBINGER',enhance:3,count:1}]);await edit(B,[{op:'currency',key:'MORA',mode:'set',value:50000}]);
 const ore=count(A,'ORE_CRYSTAL');
 const bound=await api('/market/sell',{method:'POST',token:A.token,body:{entry:{item:'MAT_CHAR_EXP_HERO',qty:1},price:500}});assert.equal(bound.status,400);
 assert.equal((await api('/market/sell',{method:'POST',token:A.token,body:{entry:{item:'ORE_CRYSTAL',qty:4},price:5}})).status,400,'below the lowest price');
 const sold=await api('/market/sell',{method:'POST',token:A.token,body:{entry:{item:'ORE_CRYSTAL',qty:4},price:1000}});assert.equal(sold.status,200,JSON.stringify(sold.json));
 assert.equal(count(A,'ORE_CRYSTAL'),ore-4,'listed goods leave the bag');const id=sold.json.listing.id;
 const list=(await api('/market',{token:B.token})).json;const row=list.listings.find(x=>x.id===id);assert(row&&row.price===1000&&row.qty===4&&row.fee===50&&row.seller.name==='바람상인');
 assert.equal((await api('/market/buy',{method:'POST',token:A.token,body:{id}})).status,400,'not from one\'s own shop');
 const before=mora(B),bought=await api('/market/buy',{method:'POST',token:B.token,body:{id,price:1000}});assert.equal(bought.status,200,JSON.stringify(bought.json));
 assert.equal(mora(B),before-1000);assert.equal(count(B,'ORE_CRYSTAL')>=4,true);
 assert.equal((await api('/market/buy',{method:'POST',token:B.token,body:{id}})).status,409,'sold only once');
 const wallet=(await api('/market',{token:A.token})).json.wallet;assert.equal(wallet.mora,950);
 const m0=mora(A),got=await api('/market/collect',{method:'POST',token:A.token,body:{}});assert.equal(got.status,200);assert.equal(got.json.mora,950);assert.equal(mora(A),m0+950);
 assert.equal((await api('/market/collect',{method:'POST',token:A.token,body:{}})).status,409);
 // gear: list, then take it back
 const slot=app.store.runtimeOf(A.row.id).s.inventory.find(i=>i.equip==='EQ_SWORD_HARBINGER'&&!i.equipped).slot;
 const gear=await api('/market/sell',{method:'POST',token:A.token,body:{entry:{slot},price:20000}});assert.equal(gear.status,200,JSON.stringify(gear.json));assert.equal(gear.json.listing.kind,'GEAR');assert.equal(gear.json.listing.enhance,3);
 assert(!app.store.runtimeOf(A.row.id).s.inventory.some(i=>i.slot===slot));
 const back=await api('/market/cancel',{method:'POST',token:A.token,body:{id:gear.json.listing.id}});assert.equal(back.status,200);
 assert(app.store.runtimeOf(A.row.id).s.inventory.some(i=>i.equip==='EQ_SWORD_HARBINGER'&&i.enhance===3),'returned with its enhancement');
 assert.equal(MARKET.fee,0.05);
});

await check('live trade: only with someone online; invite, both offer, both fix, both confirm, both saves change at once',async()=>{
 assert.equal((await api('/deal/invite',{method:'POST',token:A.token,body:{toPid:pidC}})).status,409,'offline adventurers cannot be invited');
 const la=await listen(A.token),lb=await listen(B.token);
 try{
  await edit(B,[{op:'item',id:'ING_APPLE',count:6}]);
  const inv=await api('/deal/invite',{method:'POST',token:A.token,body:{toPid:pidB}});assert.equal(inv.status,200,JSON.stringify(inv.json));const id=inv.json.deal.id;
  const seen=await lb.wait(e=>e.type==='deal'&&e.deal.id===id&&e.deal.status==='INVITED');assert.equal(seen.deal.other.name,'바람상인');
  assert.equal((await api('/deal/respond',{method:'POST',token:A.token,body:{id,accept:true}})).status,403,'only the invited one answers');
  assert.equal((await api('/deal/respond',{method:'POST',token:B.token,body:{id,accept:true}})).status,200);
  const aOre=count(A,'ORE_CRYSTAL'),bApple=count(B,'ING_APPLE'),bOre=count(B,'ORE_CRYSTAL'),aApple=count(A,'ING_APPLE');
  assert.equal((await api('/deal/update',{method:'POST',token:A.token,body:{id,items:[{item:'ORE_CRYSTAL',qty:2}]}})).status,200);
  assert.equal((await api('/deal/update',{method:'POST',token:B.token,body:{id,items:[{item:'ING_APPLE',qty:3}]}})).status,200);
  assert.equal((await api('/deal/update',{method:'POST',token:B.token,body:{id,items:[{item:'MAT_CHAR_EXP_HERO',qty:1}]}})).status,400,'bound items cannot be offered');
  assert.equal((await api('/deal/confirm',{method:'POST',token:A.token,body:{id}})).status,409,'both must fix their offer first');
  for(const t of [A.token,B.token])assert.equal((await api('/deal/lock',{method:'POST',token:t,body:{id,locked:true}})).status,200);
  const one=await api('/deal/confirm',{method:'POST',token:A.token,body:{id}});assert.equal(one.status,200);assert.equal(one.json.deal.status,'OPEN');
  const done=await api('/deal/confirm',{method:'POST',token:B.token,body:{id}});assert.equal(done.status,200,JSON.stringify(done.json));assert.equal(done.json.deal.status,'DONE');
  assert.equal(count(A,'ORE_CRYSTAL'),aOre-2);assert.equal(count(B,'ORE_CRYSTAL'),bOre+2);assert.equal(count(B,'ING_APPLE'),bApple-3);assert.equal(count(A,'ING_APPLE'),aApple+3);
  await la.wait(e=>e.type==='deal'&&e.deal.id===id&&e.deal.status==='DONE'&&e.sync===true);
  // changing an offer releases both sides' 확정
  const inv2=(await api('/deal/invite',{method:'POST',token:B.token,body:{toPid:pidA}})).json.deal.id;await api('/deal/respond',{method:'POST',token:A.token,body:{id:inv2,accept:true}});
  await api('/deal/lock',{method:'POST',token:A.token,body:{id:inv2,locked:true}});const upd=(await api('/deal/update',{method:'POST',token:B.token,body:{id:inv2,items:[{item:'ING_APPLE',qty:1}]}})).json.deal;
  assert.equal(upd.other.locked,false,'a new offer unlocks the other side');
  assert.equal((await api('/deal/cancel',{method:'POST',token:A.token,body:{id:inv2}})).json.deal.status,'CANCELLED');
  assert.equal((await api('/online',{token:A.token})).json.players.some(p=>p.pid===pidB),true,'online list shows connected adventurers');
 }finally{la.close();lb.close();}
});

await app.close();
console.log(JSON.stringify({ok:true,checks}));
