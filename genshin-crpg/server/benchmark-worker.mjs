// STAGING ONLY. Production config must always use worker.mjs.
import production from './worker.mjs';
import {GameAccount as ProductionAccount,enrollSession} from './durable-account.mjs';
import {fixture} from './benchmark-fixtures.mjs';
import {R,DB,ENGINE_FINGERPRINT,SERVER_BUILD} from './generated/engine.mjs';
import {splitState,compress} from './state-parts.mjs';
import {hash,token,same,json} from './game-core.mjs';
export class GameAccount extends ProductionAccount {
 async fetch(request){
  if(new URL(request.url).pathname!=='/benchmark-reset')return super.fetch(request);
  return this.serial(async()=>{
   const {kind,large}=await request.json(),f=fixture(kind,large),r=new R(DB,f.state,true),parts=splitState(r.s);
   this.ctx.storage.transactionSync(()=>{for(const table of ['parts','receipts','backups','outbox','action_rate'])this.sql.exec('DELETE FROM '+table);for(const [p,v] of parts)this.sql.exec('INSERT INTO parts VALUES(?,?)',p,v);this.sql.exec("UPDATE metadata SET revision=0,ranked=0,last_request_id='BENCHMARK',updated_at=? WHERE id=1",Date.now());});
   await this.ctx.storage.deleteAlarm();await this.ctx.storage.sync();this.runtime={revision:0,r};return json({action:f.action,revision:0,engineVersion:ENGINE_FINGERPRINT,stateBytes:new TextEncoder().encode(JSON.stringify(r.s)).length});
  });
 }
}
export default {async fetch(request,env,ctx){
 const path=new URL(request.url).pathname;
 if(!path.startsWith('/bench/'))return production.fetch(request,env,ctx);
 if(env.BENCHMARK_ONLY!=='1'||!env.BENCHMARK_TOKEN||!same(request.headers.get('authorization')||'','Bearer '+env.BENCHMARK_TOKEN))return json({error:'Forbidden'},403);
 if(request.method!=='POST')return json({error:'POST required'},405);
 const b=await request.json();
 if(path==='/bench/setup'){
  const id=crypto.randomUUID(),secret=token(),th=await hash(secret),a={id,username:'perf_'+id.slice(0,18),display_name:'성능시험용',salt:token(),password_hash:token(),created_at:Date.now()};
  await env.DB.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').bind(a.id,a.username,a.display_name,a.salt,a.password_hash,a.created_at).run();await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(th,id,Date.now()+3600000).run();await enrollSession(env,a,th,Date.now()+3600000);
  return json({accountId:id,token:'v2.'+id+'.'+secret,serverBuild:SERVER_BUILD,clientCountry:request.cf?.country||null,edgeColo:request.cf?.colo||null});
 }
 if(path==='/bench/reset'){
  if(!['move','combat','combat-log'].includes(b.kind)||!/^[-a-f0-9]{36}$/.test(b.accountId||''))return json({error:'Invalid fixture'},400);
  return env.GAME_ACCOUNTS.get(env.GAME_ACCOUNTS.idFromName(b.accountId),{locationHint:env.DO_LOCATION_HINT||'apac-ne'}).fetch('https://internal/benchmark-reset',{method:'POST',body:JSON.stringify({kind:b.kind,large:b.large!==false})});
 }
 if(path==='/bench/d1'){
  if(!['json','gzip','small'].includes(b.mode))return json({error:'Invalid mode'},400);
  const state=JSON.stringify(fixture('move',true).state),value=b.mode==='gzip'?(await compress(JSON.parse(state))).buffer:b.mode==='small'?'small-state-control':state;
  const start=performance.now();const result=await env.DB.prepare('INSERT INTO benchmark_payloads(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(value).run();return json({bindingMs:performance.now()-start,sqlMs:result.meta?.duration,bytes:typeof value==='string'?new TextEncoder().encode(value).length:value.byteLength});
 }
 return json({error:'Not found'},404);
}};
