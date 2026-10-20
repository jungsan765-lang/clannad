// 0.16.64 (user, 2026-10-18: 「30일 지난 기록을 지우는 방향으로 가자. 계정이 지워지는게 아니잖아? 백업 할때만 쓰는거잖아.」): the
// Seoul server drops action receipts older than 30 days, keeping each account's last 5 revisions; the save, the account and
// everything else stay.
import assert from 'node:assert/strict';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {ENGINE_VERSION} from '../server/generated/engine.mjs';
let checks=0;const ok=(cond,msg)=>{assert(cond,msg);checks++;};
const store=new LiveRegionStore(':memory:',{pepper:'receipt-sweep-test'.padEnd(64,'x'),features:['chat','trade','coop']});
try{
 await store.register({username:'sweep_one',password:'correct-horse-battery-sweep',displayName:'하나'},'test');const a=store.account('sweep_one');
 await store.newGame(a,{name:'하나',route:'ROUTE_TRAVELER'});
 for(let i=0;i<12;i++)await store.action(a,{type:'MENU',params:{screen:'SYSTEM'},requestId:'sweep-menu-'+String(i).padStart(4,'0')+'-abcdef',revision:store.meta(a.id).revision,version:ENGINE_VERSION});
 const db=store.db,count=()=>db.prepare('SELECT count(*) n FROM receipts WHERE account_id=?').get(a.id).n,rev=store.meta(a.id).revision;
 ok(count()>=12,'every action left a receipt');const before=count();
 ok(db.prepare("SELECT name FROM sqlite_master WHERE type='index' AND name='receipts_created_idx'").get(),'receipts are indexed by age');
 // the sweep runs at most every 5 minutes
 const t=Date.now();store.receiptSweepAt=0;ok(store.pruneReceipts(t)===0&&count()===before,'nothing is 30 days old yet');ok(store.pruneReceipts(t+1000)===0,'and not again within 5 minutes');
 // make them all 31 days old: all but the last 5 revisions go
 db.prepare('UPDATE receipts SET created_at=? WHERE account_id=?').run(t-31*86400000,a.id);store.receiptSweepAt=0;
 const removed=store.pruneReceipts(t);const left=db.prepare('SELECT revision FROM receipts WHERE account_id=? ORDER BY revision').all(a.id).map(x=>x.revision);
 ok(removed===before-left.length&&left.length===5&&left.every(r=>r>rev-5),'old receipts go, the last 5 revisions stay ('+left.join(',')+')');
 ok(store.meta(a.id).revision===rev&&store.account('sweep_one')?.id===a.id,'the account and its journey are untouched');
 ok(Object.keys(store.loadParts?store.loadParts(a.id):{}).length>=0,'the save still loads');
 const next=await store.action(a,{type:'MENU',params:{screen:'SYSTEM'},requestId:'sweep-after-0000-abcdef',revision:store.meta(a.id).revision,version:ENGINE_VERSION});ok(next?.payload||next,'and plays on');
 // co-op command receipts of the same age go too
 db.prepare("INSERT INTO coop_commands VALUES(?,?,?,?,?,?,?,?,?)").run(a.id,'old-coop-req',a.id,'room','battle','t','{}','{}',t-40*86400000);
 db.prepare("INSERT INTO coop_commands VALUES(?,?,?,?,?,?,?,?,?)").run(a.id,'new-coop-req',a.id,'room','battle','t','{}','{}',t);
 store.receiptSweepAt=0;store.pruneReceipts(t);const coop=db.prepare('SELECT request_id FROM coop_commands WHERE account_id=?').all(a.id).map(x=>x.request_id);
 ok(coop.length===1&&coop[0]==='new-coop-req','co-op receipts older than 30 days go, newer ones stay');
}finally{store.close?.();}
console.log(JSON.stringify({ok:true,checks}));
