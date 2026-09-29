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
const measured=await benchmark({base:'http://local',secret:'test-benchmark-only-secret',fetcher:mf.dispatchFetch.bind(mf),samples:30,environment:'local workerd loopback'});writeFileSync(resolve(evidence,'latency-local.json'),JSON.stringify(measured,null,2));
}finally{await mf.dispose();}
