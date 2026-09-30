import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startLiveRegionStaging} from '../server/fixed-region-live.mjs';
import {splitState,joinState,applyParts} from '../server/state-parts.mjs';

const pepper='fixed-region-live-test-pepper-'.padEnd(64,'x'),password='correct-horse-battery-staging';
async function open(dbPath=':memory:'){
 const app=await startLiveRegionStaging({dbPath,pepper,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base='http://127.0.0.1:'+app.address.port;
 async function api(path,{method='GET',body,token,origin}={}){
  const headers={};if(token)headers.authorization='Bearer '+token;if(origin)headers.origin=origin;if(body!==undefined)headers['content-type']='application/json';
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)}),text=await response.text();let json;try{json=JSON.parse(text);}catch{json={raw:text};}
  return {status:response.status,headers:response.headers,json};
 }
 return {...app,api};
}
let app=await open();
const health=await app.api('/health');assert.equal(health.status,200);assert.equal(health.json.storage,'sqlite-node-accounts');assert.equal(health.json.synthetic,false);assert(health.json.capabilities.includes('state-parts-v1'));
assert.equal((await app.api('/ranking')).status,200);
assert.equal((await app.api('/register',{method:'POST',origin:'https://evil.example',body:{username:'baduser',password}})).status,403);
const reg=await app.api('/register',{method:'POST',body:{username:'tester_01',password,displayName:'서울시험'}});assert.equal(reg.status,200,JSON.stringify(reg.json));const token=reg.json.token;assert.equal(token.length,64);
const empty=await app.api('/me',{token});assert.equal(empty.status,200);assert.equal(empty.json.state,null);assert(Number(empty.headers.get('x-server-time'))>0);
const created=await app.api('/game/new',{method:'POST',token,body:{name:'서울시험',route:'ROUTE_ISEKAI'}});assert.equal(created.status,200,JSON.stringify(created.json));assert.equal(created.json.revision,0);assert(created.json.state);
const action={version:'0.14.5',engineVersion:created.json.engineVersion,type:'MENU',params:{screen:'SYSTEM'},revision:0,requestId:'live-request-0001',responseMode:'state-parts-v1'};
const first=await app.api('/game/action',{method:'POST',token,body:action});assert.equal(first.status,200,JSON.stringify(first.json));assert(first.json.statePatch);assert.equal(first.json.revision,1);assert.equal(first.json.baseRevision,0);
const merged=joinState(applyParts(splitState(created.json.state),first.json.statePatch)),current=await app.api('/me',{token});assert.deepEqual(merged,current.json.state);assert.equal(current.json.revision,1);
const replay=await app.api('/game/action',{method:'POST',token,body:action});assert.equal(replay.status,200);assert.equal(replay.json.replayed,true);assert.equal(replay.json.revision,1);
const reused=await app.api('/game/action',{method:'POST',token,body:{...action,params:{screen:'STORY'}}});assert.equal(reused.status,409);assert.equal(reused.json.code,'REQUEST_ID_REUSED');
const stale=await app.api('/game/action',{method:'POST',token,body:{...action,requestId:'stale-request-0001'}});assert.equal(stale.status,409);assert.equal(stale.json.code,'REVISION_CONFLICT');
const current2=await app.api('/me',{token}),parallelBody={...action,revision:current2.json.revision,requestId:'parallel-live-0001'};
const parallel=await Promise.all([app.api('/game/action',{method:'POST',token,body:parallelBody}),app.api('/game/action',{method:'POST',token,body:parallelBody})]);assert(parallel.every(x=>x.status===200));assert.equal(parallel.filter(x=>x.json.replayed).length,1);
assert.equal((await app.api('/logout',{method:'POST',token,body:{}})).status,200);assert.equal((await app.api('/me',{token})).status,401);
const login=await app.api('/login',{method:'POST',body:{username:'tester_01',password}});assert.equal(login.status,200);const token2=login.json.token;assert.equal((await app.api('/me',{token:token2})).json.revision,2);
await app.close();

const dir=await mkdtemp(join(tmpdir(),'crpg-live-region-')),dbPath=join(dir,'live.sqlite3');
app=await open(dbPath);
const persistent=await app.api('/register',{method:'POST',body:{username:'persist_01',password}}),pt=persistent.json.token;
const newGame=await app.api('/game/new',{method:'POST',token:pt,body:{name:'지속시험',route:'ROUTE_ISEKAI'}});
const move={version:'0.14.5',engineVersion:newGame.json.engineVersion,type:'MENU',params:{screen:'SYSTEM'},revision:0,requestId:'persistent-live-0001',responseMode:'state-parts-v1'};
assert.equal((await app.api('/game/action',{method:'POST',token:pt,body:move})).status,200);await app.close();
app=await open(dbPath);
const relog=await app.api('/login',{method:'POST',body:{username:'persist_01',password}});assert.equal(relog.status,200);const restored=await app.api('/me',{token:relog.json.token});assert.equal(restored.status,200);assert.equal(restored.json.revision,1);
assert.equal((await app.api('/account/delete',{method:'POST',token:relog.json.token,body:{confirm:'persist_01',password}})).status,200);
assert.equal((await app.api('/login',{method:'POST',body:{username:'persist_01',password}})).status,401);
await app.close();await rm(dir,{recursive:true,force:true});
console.log(JSON.stringify({ok:true,checks:['health','CORS gate','register','login','session','new game','delta reconstruction','requestId replay','requestId collision','revision conflict','parallel duplicate','logout','file restart persistence','account delete']}));
