// STAGING ONLY. Production config must always use worker.mjs.
// Preflight gate revision: seoul-preflight-v1
import production from './worker.mjs';
import {GameAccount as ProductionAccount,enrollSession} from './durable-account.mjs';
import {fixture} from './benchmark-fixtures.mjs';
import {R,DB,ENGINE_FINGERPRINT,SERVER_BUILD} from './generated/engine.mjs';
import {splitState,diffParts,compress} from './state-parts.mjs';
import {hash,token,same,json} from './game-core.mjs';
export class GameAccount extends ProductionAccount {
 constructor(ctx,env){
  super(ctx,env);this.observedSqlRows=0;const sql=this.sql;
  // Read platform counters without adding a write to the timed production action.
  this.sql={exec:(...args)=>{const cursor=sql.exec(...args);this.observedSqlRows+=Number(cursor.rowsWritten)||0;return cursor;}};
 }
 async measured(fn){const start=this.observedSqlRows,res=await fn(),copy=new Response(res.body,res);copy.headers.set('X-Benchmark-SQL-Rows-Written',String(this.observedSqlRows-start));return copy;}
 async fetch(request){
  const path=new URL(request.url).pathname;
  if(path==='/benchmark-preflight')return this.measured(async()=>json({ok:true,sqlite:true,hasMetadata:!!this.meta()}));
  if(path==='/benchmark-start')return this.serial(()=>this.measured(async()=>{
   const day=new Date().toISOString().slice(0,10);
   this.sql.exec('CREATE TABLE IF NOT EXISTS benchmark_budget_seoul_v4(day TEXT PRIMARY KEY,runs INTEGER NOT NULL,reserved_rows INTEGER NOT NULL)');
   if(this.rows('SELECT * FROM benchmark_budget_seoul_v4 WHERE day=?',day)[0]?.runs)return json({error:'오늘 시험은 이미 시작했습니다. 자동 반복하지 않습니다. 남은 결과를 전달해 주세요.',code:'BENCHMARK_ALREADY_RUN'},429);
   this.sql.exec('INSERT INTO benchmark_budget_seoul_v4 VALUES(?,1,256)',day);await this.ctx.storage.sync();return json({ok:true,day,reservedRows:256,limit:25000});
  }));
  if(path!=='/benchmark-reset')return this.measured(()=>super.fetch(request));
  return this.serial(()=>this.measured(async()=>{
   const {kind,large}=await request.json(),f=fixture(kind,large),r=new R(DB,f.state,true),parts=splitState(r.s);
   const delta=diffParts(this.parts(),parts),tables=['receipts','backups','outbox','action_rate'],aux=tables.reduce((n,t)=>n+this.rows('SELECT COUNT(*) n FROM '+t)[0].n,0),day=new Date().toISOString().slice(0,10),budget=this.rows('SELECT * FROM benchmark_budget_seoul_v4 WHERE day=?',day)[0];
   // Include index writes, auxiliary cleanup, and a conservative allowance for the next action/alarm.
   const reserve=2*(delta.set.length+delta.remove.length+aux)+96;
   if(!budget||budget.reserved_rows+reserve>25000)return json({error:'시험 쓰기 예산에 도달해 중단했습니다. 다시 실행하지 말고 부분 결과를 전달해 주세요.',code:'BENCHMARK_WRITE_BUDGET'},429);
   this.ctx.storage.transactionSync(()=>{
    this.sql.exec('UPDATE benchmark_budget_seoul_v4 SET reserved_rows=reserved_rows+? WHERE day=?',reserve,day);
    for(const p of delta.remove)this.sql.exec('DELETE FROM parts WHERE path=?',p);
    for(const [p,v] of delta.set)this.sql.exec('INSERT INTO parts VALUES(?,?) ON CONFLICT(path) DO UPDATE SET value=excluded.value',p,v);
    for(const table of tables)this.sql.exec('DELETE FROM '+table);
    this.sql.exec("UPDATE metadata SET revision=0,ranked=0,last_request_id='BENCHMARK',updated_at=? WHERE id=1",Date.now());
   });
   if(await this.ctx.storage.getAlarm()!==null)await this.ctx.storage.deleteAlarm();await this.ctx.storage.sync();this.partsCache=parts;this.runtime={revision:0,r};return json({action:f.action,revision:0,engineVersion:ENGINE_FINGERPRINT,stateBytes:new TextEncoder().encode(JSON.stringify(r.s)).length,reservedRows:budget.reserved_rows+reserve});
  }));
 }
}
export default {async fetch(request,env,ctx){
 const path=new URL(request.url).pathname;
 if(path==='/bench/domain-ping'&&request.method==='POST')return json({ok:true,probe:'domain-v1',serverBuild:SERVER_BUILD,clientCountry:request.cf?.country||null,edgeColo:request.cf?.colo||null,placement:request.headers.get('cf-placement')||null});
 if(!path.startsWith('/bench/'))return production.fetch(request,env,ctx);
 const customToken=request.headers.get('x-crpg-benchmark-token')||'',auth=request.headers.get('authorization')||'',bearer=auth.startsWith('Bearer ')?auth.slice(7):'',supplied=customToken||bearer;
 if(env.BENCHMARK_ONLY!=='1'||!supplied||(customToken&&bearer&&!same(customToken,bearer)))return json({error:'Forbidden',code:'BENCH_AUTH',diagnostic:{benchmarkOnly:env.BENCHMARK_ONLY||null,customHeaderLength:customToken.length,bearerLength:bearer.length,headersMatch:!customToken||!bearer||same(customToken,bearer)}},403);
 if(request.method!=='POST')return json({error:'POST required'},405);
 const b=await request.json();
 if(path==='/bench/preflight'){
  try{
   const d1=await env.DB.prepare('SELECT 1 AS ok').first();
   const ph=await hash('crpg-benchmark-preflight-v1'),pid=[ph.slice(0,8),ph.slice(8,12),ph.slice(12,16),ph.slice(16,20),ph.slice(20,32)].join('-');
   const pres=await env.GAME_ACCOUNTS.get(env.GAME_ACCOUNTS.idFromName(pid),{locationHint:env.DO_LOCATION_HINT||'apac-ne'}).fetch('https://internal/benchmark-preflight',{method:'POST',body:'{}'});
   const pbody=await pres.json();
   if(!pres.ok||!pbody.ok)throw new Error('Durable Object preflight failed');
   return json({ok:true,benchmarkRevision:'seoul-preflight-v1',serverBuild:SERVER_BUILD,d1Ok:d1?.ok===1,doOk:true,clientCountry:request.cf?.country||null,edgeColo:request.cf?.colo||null});
  }catch(e){return json({error:'Benchmark preflight failed',code:'BENCH_PREFLIGHT',stage:'platform',detail:String(e?.message||e)},503);}
 }
 if(path==='/bench/setup'){
  const h=await hash('crpg-latency-seoul-v4:'+new Date().toISOString().slice(0,10)),id=[h.slice(0,8),h.slice(8,12),h.slice(12,16),h.slice(16,20),h.slice(20,32)].join('-');
  let stage='account-directory';
  try{
   const username='perf_'+id.slice(0,18),created=Date.now(),salt=token(),passwordHash=token();
   await env.DB.prepare('INSERT OR IGNORE INTO accounts VALUES(?,?,?,?,?,?)').bind(id,username,'성능시험용',salt,passwordHash,created).run();
   const a=await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(id).first();
   if(!a)throw new Error('benchmark account directory row missing');
   stage='session-directory';
   const sessionSecret=token(),th=await hash(sessionSecret),expires=Date.now()+3600000;
   await env.DB.prepare('INSERT OR REPLACE INTO sessions VALUES(?,?,?)').bind(th,id,expires).run();
   stage='durable-enroll';
   await enrollSession(env,a,th,expires);
   stage='daily-claim';
   const guard=await env.GAME_ACCOUNTS.get(env.GAME_ACCOUNTS.idFromName(id),{locationHint:env.DO_LOCATION_HINT||'apac-ne'}).fetch('https://internal/benchmark-start',{method:'POST',body:'{}'});
   if(!guard.ok)return guard;
   return json({accountId:id,token:'v2.'+id+'.'+sessionSecret,serverBuild:SERVER_BUILD,clientCountry:request.cf?.country||null,edgeColo:request.cf?.colo||null});
  }catch(e){
   return json({error:'Benchmark setup failed',code:'BENCH_SETUP_FAILED',stage,detail:String(e?.message||e)},503);
  }
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
