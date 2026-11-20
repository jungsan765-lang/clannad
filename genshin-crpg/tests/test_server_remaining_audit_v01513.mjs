// Deleted public-ID entries must not accumulate across rebuilds. Isolated in-memory SQLite only.
import assert from 'node:assert/strict';
import {LiveRegionStore} from '../server/fixed-region-live.mjs';
import {AdminConsole} from '../server/admin-api.mjs';
import {pidOf} from '../server/social-v01415.mjs';

const store=new LiveRegionStore(':memory:',{pepper:'local-pid-cache-regression'.padEnd(64,'x'),features:['chat']}),admin=new AdminConsole(store),checks=[];
const insert=id=>store.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'salt','hash',Date.now());
try{
 insert('survivor');insert('deleted');
 assert.equal(store.accountByPid(pidOf('deleted')).id,'deleted');assert.equal(store.pidCache.size,2);
 await admin.deleteAccount({id:'deleted',confirm:'deleted'},'local','local');
 assert(!store.accountByPid(pidOf('deleted')));assert(!store.pidCache.has(pidOf('deleted')));assert.equal(store.accountByPid(pidOf('survivor')).id,'survivor');
 checks.push('a deleted known public ID is discarded on lookup while other accounts remain available');

 // Save invalidation must not remove valid public-ID mappings: the rebuild throttle would hide them briefly.
 store.invalidate('survivor');assert.equal(store.accountByPid(pidOf('survivor')).id,'survivor');
 checks.push('ordinary save-cache invalidation preserves live public-ID lookup');

 insert('newcomer');store.pidBuilt=Date.now();const originalMap=store.pidCache;
 assert.equal(store.accountByPid(pidOf('newcomer')),null);assert.equal(store.pidCache,originalMap);
 store.pidBuilt=Date.now()-5001;const prepare=store.db.prepare.bind(store.db);let scans=0;
 store.db.prepare=sql=>{if(sql==='SELECT id FROM accounts')scans++;return prepare(sql);};
 try{
  const lookups=await Promise.all(Array.from({length:20},()=>Promise.resolve().then(()=>store.accountByPid(pidOf('newcomer')))));
  assert(lookups.every(x=>x?.id==='newcomer'));assert.equal(scans,1);assert.notEqual(store.pidCache,originalMap);
 }finally{store.db.prepare=prepare;}
 checks.push('the existing five-second rebuild throttle stays intact and overlapping lookup tasks scan once');

 for(let i=0;i<200;i++)insert('removed_'+i);store.pidBuilt=0;store.accountByPid(pidOf('removed_199'));
 assert.equal(store.pidCache.size,202);for(let i=0;i<200;i++)await admin.deleteAccount({id:'removed_'+i,confirm:'removed_'+i},'local','local');
 const audits=store.db.prepare('SELECT COUNT(*) n FROM admin_audit').get().n;
 store.pidBuilt=0;assert.equal(store.accountByPid('ffffffffffff'),null);
 assert.equal(store.pidCache.size,2);assert.equal(store.accountByPid(pidOf('survivor')).id,'survivor');assert.equal(store.accountByPid(pidOf('newcomer')).id,'newcomer');
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM admin_audit').get().n,audits);
 assert.equal(store.db.prepare('SELECT COUNT(*) n FROM accounts').get().n,2);
 checks.push('rebuild removes 200 deleted entries without changing remaining accounts or durable audit history');
 console.log(JSON.stringify({ok:true,checks}));
}finally{await store.coopSettled();store.close();}
