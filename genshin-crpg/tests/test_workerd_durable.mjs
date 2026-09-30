import {benchmark} from '../tools/latency-benchmark.mjs';
// Real local workerd + SQLite Durable Objects. No production credentials or remote bindings.
import {buildSync} from 'esbuild';
import assert from 'node:assert/strict';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
const root=resolve(import.meta.dirname,'..'),evidence=resolve(root,'evidence/durable');mkdirSync(evidence,{recursive:true});
buildSync({entryPoints:[resolve(root,'server/benchmark-worker.mjs')],outfile:resolve(evidence,'worker.mjs'),bundle:true,format:'esm',platform:'browser',minify:true});
const mf=new Miniflare(convertV4MiniflareOptions({name:'entry',scriptPath:resolve(evidence,'worker.mjs'),modules:true,modulesRoot:evidence,compatibilityDate:'2026-09-01',bindings:{PASSWORD_PEPPER:'local-workerd-only-test-secret-123456789',BENCHMARK_ONLY:'1',BENCHMARK_TOKEN:'test-benchmark-only-secret',GAME_STATE_BACKEND:'do',ALLOWED_ORIGIN:'http://localhost'},d1Databases:{DB:'workerd-durable-test'},durableObjects:{GAME_ACCOUNTS:{className:'GameAccount',useSQLite:true}}}));
try{
 const d1=await mf.getD1Database('DB');
 await d1.exec(readFileSync(resolve(root,'server/schema.sql'),'utf8'));
 const migration=readFileSync(resolve(root,'server/migrations/0001-durable-ownership.sql'),'utf8').replace(/--[^\n]*/g,'').replace(/\n/g,' ');
 // SQLite parser boundaries: tables and complete triggers, not semicolons inside trigger bodies.
 const statements=migration.match(/CREATE TABLE[^;]+;|CREATE TRIGGER.*?END;/g);for(const q of statements)await d1.prepare(q).run();
 await d1.prepare('CREATE TABLE IF NOT EXISTS benchmark_payloads(id INTEGER PRIMARY KEY,payload BLOB)').run();
 let token='',account;
 async function call(path,data){const start=performance.now(),res=await mf.dispatchFetch('http://local'+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})}),out=await res.json();assert.equal(res.status,200,JSON.stringify(out));return {out,ms:performance.now()-start,bytes:Number(res.headers.get('X-CRPG-Response-Bytes'))};}
 const login=await call('/register',{username:'workerd_test',password:'local-test-password'});token=login.out.token;account=login.out.account;
 let {out:game}=await call('/game/new',{name:'성능시험',route:'ROUTE_ISEKAI'});const engineVersion=game.engineVersion;
 const samples=[];
 for(let i=0;i<25;i++){
  const payload={requestId:crypto.randomUUID(),revision:game.revision,engineVersion,type:'MENU',params:{screen:'SYSTEM'},responseMode:'state-parts-v1'};
  const response=await call('/game/action',payload);game=response.out;samples.push({action:'MENU',ms:response.ms,bytes:response.bytes});
  if(i===0){const replay=await call('/game/action',payload);assert.equal(replay.out.revision,game.revision);assert.equal(replay.out.replayed,true);}
 }
 const dbGame=await d1.prepare('SELECT * FROM games WHERE account_id=?').bind(account.id).first();assert.equal(dbGame,null,'DO game must not silently write through to legacy D1 games');
 const sorted=samples.slice(1).map(x=>x.ms).sort((a,b)=>a-b),summary={environment:'local workerd; loopback; no Korea/Cloudflare network latency',samples:samples.length,warmP50:sorted[Math.floor(sorted.length*.5)],warmP95:sorted[Math.floor(sorted.length*.95)],responseBytes:samples[1].bytes,localSqlite:true,replay:true};
 writeFileSync(resolve(evidence,'workerd.json'),JSON.stringify({summary,samples},null,2));console.log(JSON.stringify(summary));
let syntheticSession;
const measured=await benchmark({base:'http://local',secret:'test-benchmark-only-secret',fetcher:async(url,options)=>{const res=await mf.dispatchFetch(url,options);if(url.endsWith('/bench/setup')&&res.ok)syntheticSession=await res.clone().json();return res;},samples:30,environment:'local workerd loopback'});writeFileSync(resolve(evidence,'latency-local.json'),JSON.stringify(measured,null,2));
assert.equal(measured.status,'complete');assert.equal(measured.koreanGatePassed,false);
assert.ok(measured.storage.observedSqlRows<12000,'complete test must fit comfortably below the daily free allowance');
assert.ok(measured.storage.reservedRows<=25000);
const headers={'Content-Type':'application/json',Authorization:'Bearer test-benchmark-only-secret'};
const bench=async(path,data)=>mf.dispatchFetch('http://local/bench/'+path,{method:'POST',headers,body:JSON.stringify(data)});
const accountsBefore=await d1.prepare('SELECT COUNT(*) n FROM accounts').first();
const repeat=await bench('setup',{});assert.equal(repeat.status,429);assert.equal((await repeat.json()).code,'BENCHMARK_ALREADY_RUN');
assert.deepEqual(await d1.prepare('SELECT COUNT(*) n FROM accounts').first(),accountsBefore,'repeat setup must not create accounts');
const reset=()=>bench('reset',{accountId:syntheticSession.accountId,kind:'combat-log',large:false});
const readState=async()=>{const res=await mf.dispatchFetch('http://local/me',{headers:{Authorization:'Bearer '+syntheticSession.token}});assert.equal(res.status,200);return (await res.json()).state;};
assert.equal((await reset()).status,200);const firstState=await readState();
const unchangedReset=await reset();assert.equal(unchangedReset.status,200);assert.ok(Number(unchangedReset.headers.get('X-Benchmark-SQL-Rows-Written'))<=3,'unchanged reset must not rewrite all parts');
assert.deepEqual(await readState(),firstState,'differential reset must reproduce the entire normalized fixture');
let blocked=false,attempts=0;
for(;attempts<300;attempts++){const res=await reset();if(res.status===429){assert.equal((await res.json()).code,'BENCHMARK_WRITE_BUDGET');assert.equal(Number(res.headers.get('X-Benchmark-SQL-Rows-Written')),0,'budget rejection must happen before state writes');blocked=true;break;}assert.equal(res.status,200);}
assert.ok(blocked,'write budget must stop a runaway reset loop');assert.deepEqual(await readState(),firstState);
const stillBlocked=await reset();assert.equal(stillBlocked.status,429);assert.equal(Number(stillBlocked.headers.get('X-Benchmark-SQL-Rows-Written')),0);
writeFileSync(resolve(evidence,'quota-validation.json'),JSON.stringify({status:'passed',environment:'local workerd SQLite only; no remote Cloudflare writes',serverBuild:measured.serverBuild,storage:measured.storage,checks:['128 actions complete','daily duplicate setup rejected before D1 account creation','unchanged fixture reset avoids full rewrite','full normalized state preserved across reset','budget exhausted safely; rejected requests write zero SQL rows','replay preserved'],extraLocalResetsBeforeBudgetStop:attempts},null,2));
console.log('PASS: full benchmark write count, once-daily setup, exact reset, budget rejection without writes.');
}finally{await mf.dispose();}
