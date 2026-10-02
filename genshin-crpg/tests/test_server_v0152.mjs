// 0.15.2 on the Seoul account server: letters, the market and live trades start at protagonist Lv.10, and one connection
// makes at most three accounts a day (user: 「우편도 레벨제한 걸어놔. 계정 무한 생성해서 돈 모으려는 버그 … 아이피별로 계정
// 생성에 제한을 걸어두던가」).
import assert from 'node:assert/strict';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';

const pepper='server-v0152-test-pepper-'.padEnd(64,'s'),password='correct-horse-battery-v0152';
const app=await startLiveRegionStaging({dbPath:':memory:',pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port;
async function api(path,{body,token,ip}={}){
 const headers={};if(token)headers.authorization='Bearer '+token;if(ip)headers['x-forwarded-for']=ip;if(body!==undefined)headers['content-type']='application/json';
 const r=await fetch(base+path,{method:body===undefined?'GET':'POST',headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await r.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}return {status:r.status,json};
}
const checks=[];const check=(name,fn)=>{app.store.rates.clear();return fn().then(()=>{checks.push(name);console.log('PASS '+name);});};
const edit=(p,ops)=>app.adminConsole.editSave(p.row,r=>{const out=app.adminConsole.applyOps(r,ops);if(r.s.mail?.list.some(x=>x.kind==='GIFT'&&!x.claimed))r.mailClaim('ALL');return out;},'test');
async function player(username,display,level){
 const reg=await api('/register',{body:{username,password,displayName:display}});assert.equal(reg.status,200,JSON.stringify(reg.json));
 const token=reg.json.token;assert.equal((await api('/game/new',{token,body:{name:display,route:'ROUTE_TRAVELER'}})).status,200);
 const p={token,row:app.store.account(username)};p.pid=(await api('/chat/recent',{token})).json.me;
 await edit(p,[{op:'level',target:'PLAYER_CUSTOM',value:level},{op:'teleport',map:'MAP_MOND_CITY'},{op:'currency',key:'MORA',mode:'set',value:20000},{op:'item',id:'ING_APPLE',count:10}]);return p;
}

await check('one connection makes at most three accounts a day; other connections and the local loopback are not held back',async()=>{
 for(let i=1;i<=3;i++)assert.equal((await api('/register',{ip:'203.0.113.7',body:{username:'ipcap_'+i,password}})).status,200,'account '+i);
 const fourth=await api('/register',{ip:'203.0.113.7',body:{username:'ipcap_4',password}});assert.equal(fourth.status,429);assert.equal(fourth.json.code,'REGISTER_LIMIT');assert.match(fourth.json.error,/하루에 계정을 3개까지/);
 assert.equal((await api('/register',{ip:'198.51.100.9',body:{username:'ipcap_other',password}})).status,200,'another connection');
 const rows=app.store.db.prepare('SELECT ip FROM register_log').all();assert.equal(rows.length,4);assert(rows.every(r=>/^[a-f0-9]{32}$/.test(r.ip)&&!r.ip.includes('203')),'only a hash of the address is kept');
 app.store.db.prepare('UPDATE register_log SET at=at-86400001').run();
 assert.equal((await api('/register',{ip:'203.0.113.7',body:{username:'ipcap_5',password}})).status,200,'a day later it opens again');
});

await check('letters, the market and live trades start at Lv.10; taking what others send needs no level',async()=>{
 const low=await player('low_level','새내기',5),high=await player('high_level','선배',10);
 const why=/주인공 Lv\.10부터/;
 const letter=await api('/mail/send',{token:low.token,body:{to:high.pid,title:'안녕',items:[{item:'ING_APPLE',qty:1}]}});assert.equal(letter.status,403);assert.match(letter.json.error,why);assert.equal(letter.json.code,'LEVEL');
 const sell=await api('/market/sell',{token:low.token,body:{entry:{item:'ING_APPLE',qty:1},price:100}});assert.equal(sell.status,403);assert.match(sell.json.error,why);
 const listing=(await api('/market/sell',{token:high.token,body:{entry:{item:'ING_APPLE',qty:1},price:100}})).json.listing;
 const buy=await api('/market/buy',{token:low.token,body:{id:listing.id,price:100}});assert.equal(buy.status,403);assert.match(buy.json.error,why);
 const gift=(await api('/mail/send',{token:high.token,body:{to:low.pid,title:'선물',items:[{item:'ING_APPLE',qty:2}],mora:500}})).json.letter;
 const a0=app.store.runtimeOf(low.row.id).itemCount('ING_APPLE');assert.equal((await api('/mail/take',{token:low.token,body:{id:gift.id}})).status,200,'a Lv.5 adventurer takes a parcel');
 assert.equal(app.store.runtimeOf(low.row.id).itemCount('ING_APPLE'),a0+2);
 // live trade: the other side's level is checked too (both must be online)
 const s1=await fetch(base+'/chat/stream',{headers:{authorization:'Bearer '+low.token}}),s2=await fetch(base+'/chat/stream',{headers:{authorization:'Bearer '+high.token}});
 try{
  const inv=await api('/deal/invite',{token:high.token,body:{toPid:low.pid}});assert.equal(inv.status,403);assert.match(inv.json.error,/새내기 님의 주인공이 아직 Lv\.10이 되지 않았습니다/);
  const mine=await api('/deal/invite',{token:low.token,body:{toPid:high.pid}});assert.equal(mine.status,403);assert.match(mine.json.error,why);
  await edit(low,[{op:'level',target:'PLAYER_CUSTOM',value:10}]);
  assert.equal((await api('/mail/send',{token:low.token,body:{to:high.pid,title:'고마워'}})).status,200,'at Lv.10 the letter goes');
  assert.equal((await api('/deal/invite',{token:high.token,body:{toPid:low.pid}})).status,200,'and live trades open');
 }finally{s1.body.cancel().catch(()=>{});s2.body.cancel().catch(()=>{});}
});

// ---------- 공동 토벌전 (server/raid-v0152.mjs) ----------
let seq=0;
async function act(p,type,params={}){
 const m=app.store.meta(p.row.id),requestId='raid-test-'+String(++seq).padStart(6,'0'),body={version:p.version,engineVersion:p.engineVersion,type,params,revision:m.revision,requestId,responseMode:'state-parts-v1'};
 const out=await api('/game/action',{token:p.token,body});return {...out,requestId,revision:m.revision,body};
}
async function raider(username,display,level){
 const reg=await api('/register',{body:{username,password,displayName:display}});assert.equal(reg.status,200);const token=reg.json.token;
 const created=await api('/game/new',{token,body:{name:display,route:'ROUTE_TRAVELER'}});assert.equal(created.status,200);
 const p={token,row:app.store.account(username),version:created.json.version,engineVersion:created.json.engineVersion};
 await edit(p,[{op:'level',target:'PLAYER_CUSTOM',value:level},{op:'teleport',map:'MAP_MOND_CITY'}]);return p;
}
// One sortie through the real actions: enter, begin, then the protagonist strikes (or guards) until the eight rounds end.
async function sortie(p){
 const enter=await act(p,'RAID_ENTER');assert.equal(enter.status,200,JSON.stringify(enter.json));
 const r0=app.store.runtimeOf(p.row.id);if(r0.combatOpening?.())assert.equal((await act(p,'COMBAT_BEGIN')).status,200);
 let last=null;
 for(let i=0;i<60;i++){const r=app.store.runtimeOf(p.row.id);if(!r.s.runtime)break;const boss=r.s.runtime.actors.find(a=>a.raidBoss);
  const hit=r.combatCards().find(c=>c.id==='PLAYER_BASIC_ATTACK'&&!c.reason);last=await act(p,'COMBAT',hit?{card:hit.id,target:boss.id}:{card:'PLAYER_BASIC_GUARD'});assert.equal(last.status,200,JSON.stringify(last.json));}
 assert(!app.store.runtimeOf(p.row.id).s.runtime,'the sortie ends');return last;
}
await check('공동 토벌전: a sortie adds its hits once (a replayed request never counts twice); Lv.9 cannot sortie',async()=>{
 const low=await raider('raid_low','막내기사',9);const refused=await act(low,'RAID_ENTER');assert.notEqual(refused.status,200);assert.match(JSON.stringify(refused.json),/Lv\.10부터/);
 const p=await raider('raid_one','토벌대원',12),last=await sortie(p);
 const rows=app.store.db.prepare('SELECT * FROM raid_hits WHERE account_id=?').all(p.row.id);assert.equal(rows.length,1);assert(rows[0].hits>0,'hits counted');
 const replay=await api('/game/action',{token:p.token,body:last.body});
 assert.equal(replay.status,200,JSON.stringify(replay.json).slice(0,200));assert.equal(replay.json.replayed,true);assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM raid_hits').get().n,1,'a replay does not add again');
 const st=(await api('/raid',{token:p.token})).json;assert.equal(st.current.total,rows[0].hits);assert.equal(st.current.me.runs,1);assert.equal(st.current.players,1);
 assert.equal(app.store.runtimeOf(p.row.id).raidView().sortiesLeft,2,'three sorties a day');
});
await check('공동 토벌전: stage rewards need the shared total and one sortie, are paid once into the save, and a rollback lets them be taken again',async()=>{
 const p=app.store.account('raid_one'),me={token:null,row:p};me.token=(await api('/login',{body:{username:'raid_one',password}})).json.token;
 const watcher=await raider('raid_none','구경꾼',12),cfg=globalThis.CRPGRuntime.raidV0152,ev=cfg.eventOf(Date.now());
 const early=await api('/raid/claim',{token:me.token,body:{event:ev.id,reward:'S25'}});assert.equal(early.status,409);assert.match(early.json.error,/25%/);
 app.store.db.prepare('INSERT INTO raid_hits VALUES(?,?,?,?,?,?)').run('test-battle-1',ev.id,watcher.row.id+'-other','다른 모험가',Math.ceil(cfg.target*.3),Date.now());
 const none=await api('/raid/claim',{token:watcher.token,body:{event:ev.id,reward:'S25'}});assert.equal(none.status,409);assert.match(none.json.error,/한 번 이상 출격/);
 const mora0=app.store.runtimeOf(p.id).s.global.MORA,ok=await api('/raid/claim',{token:me.token,body:{event:ev.id,reward:'S25'}});assert.equal(ok.status,200,JSON.stringify(ok.json));
 assert.equal(app.store.runtimeOf(p.id).s.global.MORA-mora0,5000,'paid into the save');
 const again=await api('/raid/claim',{token:me.token,body:{event:ev.id,reward:'S25'}});assert.equal(again.status,409);assert.match(again.json.error,/이미 받은/);
 const tier=await api('/raid/claim',{token:me.token,body:{event:ev.id,reward:'P600'}});assert.equal(tier.status,409);assert.match(tier.json.error,/600번/);
 await app.adminConsole.rollback({id:p.id,steps:1},'test','127.0.0.1');
 assert.equal(app.store.db.prepare('SELECT COUNT(*) AS n FROM raid_claims WHERE account_id=?').get(p.id).n,0,'the claim is undone with the save');
 const back=await api('/raid/claim',{token:me.token,body:{event:ev.id,reward:'S25'}});assert.equal(back.status,200,'taken again after the rollback: '+JSON.stringify(back.json));
});

await app.close();
console.log(JSON.stringify({ok:true,checks}));
