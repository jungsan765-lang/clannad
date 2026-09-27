import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../server/worker.mjs';
import {R,DB as GAME_DB,ENGINE_VERSION} from '../server/generated/engine.mjs';
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
class Statement{constructor(query,args=[]){this.query=query;this.args=args;}bind(...args){return new Statement(this.query,args);}async first(){return sql.prepare(this.query).get(...this.args)||null;}async all(){return {results:sql.prepare(this.query).all(...this.args)};}async run(){return {meta:{changes:Number(sql.prepare(this.query).run(...this.args).changes)}};}}
const env={DB:{prepare:q=>new Statement(q),batch:async qs=>{sql.exec('BEGIN');try{const out=[];for(const q of qs)out.push(await q.run());sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}}},PASSWORD_PEPPER:'test-only-secret-'.repeat(4),ALLOWED_ORIGIN:'https://clannad.shop',ADMIN_ACCOUNT_IDS:''};
let tok='',ip=1;async function call(path,data,token=tok){const req=new Request('https://test.invalid'+path,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json','CF-Connecting-IP':String(ip),...(token?{authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})});const res=await worker.fetch(req,env);return {status:res.status,...await res.json()};}
const pass='a-secure-test-password';let a=await call('/register',{username:'testuser',password:pass});assert.equal(a.status,200,JSON.stringify(a));tok=a.token;assert.ok(!a.account.admin);const uid=a.account.id;
assert.equal((await call('/register',{username:'testuser',password:pass})).status,409);
assert.equal((await call('/login',{username:'testuser',password:'bad-password'})).status,401);
a=await call('/game/new',{name:'검증',route:'ROUTE_ISEKAI'});assert.equal(a.status,200,JSON.stringify(a));assert.equal(a.revision,0);assert.equal((await call('/game/new',{})).status,409);
const action=(type,params,revision,requestId=crypto.randomUUID())=>call('/game/action',{version:ENGINE_VERSION,type,params,revision,requestId});
assert.equal((await action('OPERATOR_DEBUG',{op:'mora',value:999999},0)).status,403);
assert.equal((await action('BATTLE_START',{group:'EG_ABYSS_12'},0)).status,400);
assert.equal((await call('/game/action',{version:'0',type:'MENU',params:{screen:'SYSTEM'},revision:0,requestId:crypto.randomUUID()})).status,409);
const req={version:ENGINE_VERSION,type:'MENU',params:{screen:'SYSTEM',type:'OPERATOR_DEBUG',op:'mora',value:999999},revision:0,requestId:crypto.randomUUID()};
const first=await call('/game/action',req);assert.equal(first.status,200,JSON.stringify(first));assert.notEqual(first.state.global.MORA,999999);assert.equal(first.revision,1);assert.equal(first.state.global.PRNG_STATE,1);
const replay=await call('/game/action',req);assert.deepEqual(replay,first);assert.equal(sql.prepare('SELECT revision FROM games WHERE account_id=?').get(uid).revision,1);
assert.equal((await action('MENU',{screen:'SYSTEM'},0)).status,409);
const concurrent=await Promise.all([action('MENU',{screen:'SYSTEM'},1),action('MENU',{screen:'SYSTEM'},1)]);assert.deepEqual(concurrent.map(x=>x.status).sort(),[200,409]);
// Seed server-owned synthetic abyss result; clients have no state-upload endpoint.
let saved=JSON.parse(sql.prepare('SELECT state FROM games WHERE account_id=?').get(uid).state);saved.abyss.clears={'1':{rounds:9,party:[],attempt:1,run:1}};saved.abyss.attempts=1;sql.prepare('UPDATE games SET state=? WHERE account_id=?').run(JSON.stringify(saved),uid);
let ranked=await action('MENU',{screen:'SYSTEM'},2);assert.equal(ranked.status,200,JSON.stringify(ranked));assert.equal((await call('/ranking')).entries[0].floor,1);
env.ADMIN_ACCOUNT_IDS=uid;let debug=await action('OPERATOR_DEBUG',{op:'mora',value:999999},3);assert.equal(debug.status,200,JSON.stringify(debug));assert.equal(debug.ranked,false);assert.equal((await call('/ranking')).entries.length,0);
assert.equal((await action('MENU',{screen:'SYSTEM'},4)).status,200);assert.equal((await call('/ranking')).entries.length,0);
// A past operator save cannot preserve privilege after the operator ID is removed.
env.ADMIN_ACCOUNT_IDS='';assert.equal((await action('OPERATOR_DEBUG',{op:'heal',admin:true,serverAdmin:true,localTest:true},5)).status,403);
assert.equal((await call('/me')).account.admin,false);assert.equal(sql.prepare('SELECT revision FROM games WHERE account_id=?').get(uid).revision,5);
// Public query hard-limits to twenty even when more valid rows exist.
for(let n=0;n<25;n++){const id='synthetic-'+n;sql.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,id,id,'x','x',n);sql.prepare('INSERT INTO ranking VALUES(?,?,?,?,?,?,?)').run(id,'ABYSS_01',id,n%12+1,10+n,1,n);}
let top=await call('/ranking');assert.equal(top.entries.length,20);assert.equal(top.entries[0].rank,1);assert.equal(top.entries[19].rank,20);assert.ok(top.entries.every((x,i,a)=>!i||a[i-1].floor>=x.floor));
assert.equal((await call('/account/delete',{confirm:'testuser',password:'wrong-password'})).status,403);assert.equal((await call('/account/delete',{confirm:'testuser',password:pass})).deleted,true);assert.equal((await call('/me')).status,401);for(const table of ['games','ranking','receipts','sessions'])assert.equal(sql.prepare('SELECT COUNT(*) n FROM '+table+' WHERE account_id=?').get(uid).n,0);
console.log('PASS accounts/passwords, server actions, parameter forgery, idempotent retry, concurrent revisions, operator exclusion, top20, account deletion');
