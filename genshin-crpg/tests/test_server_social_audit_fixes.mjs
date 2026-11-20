// Audit regressions: all-market search, every eligible past raid, and durable letter retries.
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {AdminConsole} from '../server/admin-api.mjs';
import {pidOf,MARKET} from '../server/social-v01415.mjs';
import {POST} from '../server/letters-v0151.mjs';

const dir=mkdtempSync(join(tmpdir(),'crpg-social-regression-')),path=join(dir,'accounts.sqlite');
const options={pepper:'social-audit-test-pepper'.padEnd(64,'x'),features:['chat','trade','coop']};
let store=new LiveRegionStore(path,options),admin=new AdminConsole(store);
const checks=[];
const check=async(name,fn)=>{store.rates.clear();await fn();checks.push(name);console.log('PASS '+name);};
const count=(a,item)=>store.runtimeOf(a.id).itemCount(item),mora=a=>store.runtimeOf(a.id).s.global.MORA;
function account(id){store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'0'.repeat(64),'0'.repeat(64),Date.now());return store.account(id);}
async function player(id){const a=account(id);await store.newGame(a,{name:id,route:'ROUTE_TRAVELER'});await admin.editSave(a,r=>{admin.applyOps(r,[{op:'level',target:'PLAYER_CUSTOM',value:10},{op:'teleport',map:'MAP_MOND_CITY'},{op:'currency',key:'MORA',mode:'set',value:50000},{op:'item',id:'ORE_CRYSTAL',count:50}]);r.mailClaim('ALL');return [];},'test fixture');return a;}
try{
 const A=await player('audit_sender'),B=await player('audit_receiver'),C=await player('audit_third');
 await check('old market listings remain searchable and correctly sorted beyond 400 active listings',async()=>{
  const put=store.db.prepare("INSERT INTO market(seller_id,seller_name,goods,label,kind,ref,qty,enhance,category,price,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,'ACTIVE',?,?)"),t=Date.now();
  const add=(a,label,price,qty=1,kind='ITEM')=>Number(put.run(a.id,a.display_name,kind==='GEAR'?'[{"gear":{"equip":"EQ_SWORD_HARBINGER"}}]':'[{"item":"ORE_CRYSTAL","qty":'+qty+'}]',label,kind,kind==='GEAR'?'EQ_SWORD_HARBINGER':'ORE_CRYSTAL',qty,0,kind==='GEAR'?'한손검':'광물',price,t,t).lastInsertRowid);
  const cheap=add(A,'오래된 유일 상품',10),expensive=add(A,'오래된 장비',9999999,1,'GEAR'),unit=add(A,'단위 가격 상품',15,3);
  for(let i=0;i<400;i++)add(account('market_'+i),'최근 상품 '+i,100);
  assert.equal(store.marketList(B).total,403);assert.equal(store.marketList(B).listings.length,MARKET.page);
  assert.deepEqual(store.marketList(B,{q:'오래된 유일 상품'}).listings.map(x=>x.id),[cheap]);
  assert.equal(store.marketList(B,{seller:pidOf(A.id)}).total,3);
  assert.equal(store.marketList(B,{kind:'GEAR'}).listings[0].id,expensive);
  assert.equal(store.marketList(B,{sort:'price'}).listings[0].id,unit,'unit prices use real division');
  assert.equal(store.marketList(B,{sort:'expensive'}).listings[0].id,expensive);
  assert.equal(store.marketList(B,{seller:'000000000000'}).total,0);
  assert.equal(store.marketList(B,{q:"' OR 1=1 --"}).total,0,'search text stays a bound literal');
 });
 await check('all ended raids in the seven-day window are listed and claimable, while old and future events remain blocked',async()=>{
  const cfg=globalThis.CRPGRuntime.raidV0152,t=Date.now(),day=86400000;
  const put=store.db.prepare('INSERT INTO raid_events(boss,starts_at,ends_at,target,opened_by,closed_at) VALUES(?,?,?,?,?,?)');
  const add=(start,end)=>'RAID_'+(1000000+Number(put.run(cfg.bosses[0].id,start,end,100,'test',null).lastInsertRowid));
  const older=add(t-4*day,t-2*day),newer=add(t-2*day,t-day),expired=add(t-10*day,t-8*day),future=add(t+day,t+2*day),current=add(t-day,t+day);
  for(const [i,event] of [older,newer,expired,future,current].entries())store.db.prepare('INSERT INTO raid_hits VALUES(?,?,?,?,?,?)').run('audit-raid-'+i,event,A.id,A.display_name,100,t-day);
  const status=store.raidStatus(A);assert.equal(status.current.id,current);assert.equal(status.previous.id,newer);assert.deepEqual(status.previousEvents.map(e=>e.id),[newer,older]);
  for(const event of [older,newer,current])assert.equal((await store.raidClaim(A,{event,reward:'S25'})).event,event);
  await assert.rejects(store.raidClaim(A,{event:older,reward:'S25'}),e=>e.status===409&&/이미 받은/.test(e.message));
  for(const event of [expired,future,'RAID_9999999'])await assert.rejects(store.raidClaim(A,{event,reward:'S25'}),e=>e.status===400);
  await assert.rejects(store.raidClaim(B,{event:older,reward:'S25'}),e=>e.status===409&&/한 번 이상/.test(e.message));
 });
 let original,draft;
 await check('one letter intention, including concurrent retries, deducts once and returns one durable result',async()=>{
  draft={requestId:'audit-mail-idempotent-001',to:pidOf(B.id),title:' 선물 ',body:'첫 줄\r\n둘째 줄',items:[{item:'ORE_CRYSTAL',qty:1}],mora:100};
  const m0=mora(A),n0=count(A,'ORE_CRYSTAL'),rev=store.meta(A.id).revision;
  const [first,retry]=await Promise.all([store.letterSend(A,draft),store.letterSend(A,draft)]);original=first;
  assert.equal(retry.replayed,true);assert.deepEqual(retry,{...first,replayed:true});
  assert.equal(mora(A),m0-first.fee-100);assert.equal(count(A,'ORE_CRYSTAL'),n0-1);assert.equal(store.meta(A.id).revision,rev+1);
  assert.equal(store.db.prepare('SELECT COUNT(*) n FROM letters WHERE from_id=?').get(A.id).n,1);
  const record=JSON.parse(store.db.prepare('SELECT result FROM receipts WHERE account_id=? AND request_id=?').get(A.id,'mail-send:'+draft.requestId).result).result;
  assert.equal(record.type,'MAIL_SEND');assert.equal(record.letter,first.letter.id);assert.equal(record.fee,first.fee);
  const normalized=await store.letterSend(A,{...draft,title:'선물',body:'첫 줄\n둘째 줄',mora:'100',items:[{qty:'1',item:'ORE_CRYSTAL'}]});assert.equal(normalized.replayed,true);
  for(const change of [{title:'다른 제목'},{to:pidOf(C.id)},{mora:101},{items:[{item:'ORE_CRYSTAL',qty:2}]}])await assert.rejects(store.letterSend(A,{...draft,...change}),e=>e.status===409&&e.code==='REQUEST_ID_REUSED');
  for(const requestId of ['',null,'short','bad:request-id','x'.repeat(81)])await assert.rejects(store.letterSend(A,{...draft,requestId}),e=>e.status===400);
 });
 await check('committed letter replay survives server restart and recipient changes without new charges or notifications',async()=>{
  const m0=mora(A),rev=store.meta(A.id).revision;await store.coopSettled();store.close();store=new LiveRegionStore(path,options);admin=new AdminConsole(store);
  await store.letterTake(B,{id:original.letter.id});store.letterBlock(B,{pid:pidOf(A.id),blocked:true});
  let notices=0;const broadcast=store.broadcast;store.broadcast=()=>{notices++;};
  try{assert.deepEqual(await store.letterSend(A,draft),{...original,replayed:true});}finally{store.broadcast=broadcast;}
  assert.equal(notices,0);assert.equal(mora(A),m0);assert.equal(store.meta(A.id).revision,rev);
  assert.equal(store.letterRow(original.letter.id).status,'TAKEN','replay does not restore the original letter state');
  store.letterBlock(B,{pid:pidOf(A.id),blocked:false});
 });
 await check('known replays do not consume the send quota; new sends still do, and legacy sends remain valid',async()=>{
  for(let i=0;i<POST.sendLimit+2;i++)assert.equal((await store.letterSend(A,draft)).replayed,true);
  for(let i=0;i<POST.sendLimit;i++)await store.letterSend(A,{to:pidOf(B.id),title:'새 편지 '+i});
  await assert.rejects(store.letterSend(A,{to:pidOf(B.id),title:'횟수 초과',requestId:'audit-new-over-limit'}),e=>e.status===429);
  assert.equal((await store.letterSend(A,draft)).replayed,true);
 });
 await check('rolled-back send IDs remain consumed and do not recreate or charge for the removed letter',async()=>{
  const body={requestId:'audit-rollback-mail-001',to:pidOf(B.id),title:'되돌릴 편지',items:[{item:'ORE_CRYSTAL',qty:1}],mora:100};
  const m0=mora(C),n0=count(C,'ORE_CRYSTAL'),sent=await store.letterSend(C,body);
  await admin.rollback({id:C.id,steps:1},'test','local');assert.equal(store.letterRow(sent.letter.id),undefined);
  const rev=store.meta(C.id).revision,replay=await store.letterSend(C,body);
  assert.deepEqual(replay,{...sent,replayed:true});assert.equal(store.meta(C.id).revision,rev);assert.equal(mora(C),m0);assert.equal(count(C,'ORE_CRYSTAL'),n0);
  assert.equal(store.letterRow(sent.letter.id),undefined);
 });
 console.log(JSON.stringify({ok:true,checks}));
}finally{await store.coopSettled();store.close();rmSync(dir,{recursive:true,force:true});}
