import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from '../server/worker.mjs';
import {R,DB,ENGINE_VERSION} from '../server/generated/engine.mjs';

// Isolated real Worker + SQLite, never production D1. The browser uses the same HTTP contract.
export function onlineFixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));
 class Statement{
  constructor(query,args=[]){this.query=query;this.args=args;}
  bind(...args){return new Statement(this.query,args);}
  async first(){return sql.prepare(this.query).get(...this.args)||null;}
  async all(){return {results:sql.prepare(this.query).all(...this.args)};}
  async run(){return {meta:{changes:Number(sql.prepare(this.query).run(...this.args).changes)}};}
 }
 const env={DB:{prepare:q=>new Statement(q),batch:async qs=>{sql.exec('BEGIN');try{const results=[];for(const q of qs)results.push(await q.run());sql.exec('COMMIT');return results;}catch(e){sql.exec('ROLLBACK');throw e;}}},PASSWORD_PEPPER:'isolated-test-only-'.repeat(4),ALLOWED_ORIGIN:'http://127.0.0.1:4173'};
 let token='',account;
 async function call(path,data){const response=await worker.fetch(new Request('https://test.invalid'+path,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})}),env);return {status:response.status,...await response.json()};}
 return {sql,env,call,get account(){return account;},get token(){return token;},
  async start(route='ROUTE_ISEKAI'){const auth=await call('/register',{username:'fixture_user',password:'isolated-fixture-password'});account=auth.account;token=auth.token;const created=await call('/game/new',{name:'검증',route});const state=JSON.parse(this.read().state);state.global.PRNG_STATE=7317;this.seed(state);return created;},
  read(){return sql.prepare('SELECT * FROM games WHERE account_id=?').get(account.id);},
  seed(state){sql.prepare('UPDATE games SET state=? WHERE account_id=?').run(JSON.stringify(state),account.id);},
  async action(type,params={},extra={}){return call('/game/action',{version:ENGINE_VERSION,revision:this.read().revision,requestId:crypto.randomUUID(),type,params,...extra});}
 };
}
export {R,DB,ENGINE_VERSION};
