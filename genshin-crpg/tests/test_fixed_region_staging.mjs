import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {startFixedRegionStaging} from '../server/fixed-region-staging.mjs';
import {splitState,joinState,applyParts} from '../server/state-parts.mjs';

const token='synthetic-staging-token-'.padEnd(64,'x');
async function open(dbPath=':memory:'){
 const app=await startFixedRegionStaging({dbPath,token,host:'127.0.0.1',port:0,allowedOrigin:'https://clannad.shop'}),base=`http://127.0.0.1:${app.address.port}`;
 async function api(path,{method='GET',body,auth=true}={}){
  const headers={};if(auth)headers.authorization=`Bearer ${token}`;if(body!==undefined)headers['content-type']='application/json';
  const response=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});return {status:response.status,headers:response.headers,json:await response.json()};
 }
 return {...app,api};
}

let app=await open();
const health=await app.api('/health',{auth:false});assert.equal(health.status,200);assert.equal(health.json.storage,'sqlite-node');assert.equal(health.json.synthetic,true);
const ping=await app.api('/ping',{auth:false});assert.equal(ping.status,200);assert.equal(ping.json.ok,true);
assert.equal((await app.api('/game/state',{auth:false})).status,401);

const reset=await app.api('/synthetic/reset',{method:'POST',body:{scenario:'move'}});assert.equal(reset.status,200);assert.equal(reset.json.revision,0);assert.equal(reset.json.scenario,'move');
const move={...reset.json.suggestedAction,requestId:'move-request-0001',responseMode:'state-parts-v1'};
const first=await app.api('/game/action',{method:'POST',body:move});assert.equal(first.status,200,JSON.stringify(first.json));assert.equal(first.json.baseRevision,0);assert.equal(first.json.revision,1);assert(first.json.statePatch);
const merged=joinState(applyParts(splitState(reset.json.state),first.json.statePatch)),current=await app.api('/game/state');assert.deepEqual(merged,current.json.state);
const replay=await app.api('/game/action',{method:'POST',body:move});assert.equal(replay.status,200);assert.equal(replay.json.replayed,true);assert.equal(replay.json.revision,1);
const reused=await app.api('/game/action',{method:'POST',body:{...move,params:{edge:'DIFFERENT_EDGE'}}});assert.equal(reused.status,409);assert.equal(reused.json.code,'REQUEST_ID_REUSED');
const stale=await app.api('/game/action',{method:'POST',body:{...move,requestId:'stale-request-0001'}});assert.equal(stale.status,409);assert.equal(stale.json.code,'REVISION_CONFLICT');

const resetParallel=await app.api('/synthetic/reset',{method:'POST',body:{scenario:'move'}}),parallelBody={...resetParallel.json.suggestedAction,requestId:'parallel-duplicate-0001',responseMode:'state-parts-v1'};
const parallel=await Promise.all([app.api('/game/action',{method:'POST',body:parallelBody}),app.api('/game/action',{method:'POST',body:parallelBody})]);assert(parallel.every(x=>x.status===200));assert.equal(parallel.filter(x=>x.json.replayed).length,1);assert.equal((await app.api('/game/state')).json.revision,1);

const combat=await app.api('/synthetic/reset',{method:'POST',body:{scenario:'combat'}}),hit=await app.api('/game/action',{method:'POST',body:{...combat.json.suggestedAction,requestId:'combat-request-0001',responseMode:'state-parts-v1'}});assert.equal(hit.status,200,JSON.stringify(hit.json));assert(hit.json.statePatch);
await app.close();

const dir=await mkdtemp(join(tmpdir(),'crpg-fixed-region-')),dbPath=join(dir,'staging.sqlite3');
app=await open(dbPath);const persistentReset=await app.api('/synthetic/reset',{method:'POST',body:{scenario:'move'}}),persistentMove={...persistentReset.json.suggestedAction,requestId:'persistent-move-0001',responseMode:'state-parts-v1'};assert.equal((await app.api('/game/action',{method:'POST',body:persistentMove})).status,200);await app.close();
app=await open(dbPath);assert.equal((await app.api('/game/state')).json.revision,1);await app.close();await rm(dir,{recursive:true,force:true});

console.log(JSON.stringify({ok:true,checks:['health','ping','auth gate','MOVE delta','delta reconstruction','requestId replay','requestId collision','revision conflict','parallel duplicate','COMBAT delta','SQLite restart persistence']}));
