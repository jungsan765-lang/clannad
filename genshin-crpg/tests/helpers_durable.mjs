import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {splitState,joinState} from '../server/state-parts.mjs';
import worker,{GameAccount} from '../server/worker.mjs';
// Actions carry the app version the engine was built from, so a version bump does not break the fixture.
const APP_VERSION=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
export function durableFixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(readFileSync(new URL('../server/schema.sql',import.meta.url),'utf8'));sql.exec(readFileSync(new URL('../server/migrations/0001-durable-ownership.sql',import.meta.url),'utf8'));
 let d1Calls=0;const handles=new Map(),objects=new Map(),pending=[];
 class Statement{
  constructor(query,args=[]){this.query=query;this.args=args;}bind(...args){return new Statement(this.query,args.map(x=>x instanceof ArrayBuffer?new Uint8Array(x):x));}
  async first(){d1Calls++;return sql.prepare(this.query).get(...this.args)||null;}
  async all(){d1Calls++;return {results:sql.prepare(this.query).all(...this.args)};}
  async run(){d1Calls++;return {meta:{changes:Number(sql.prepare(this.query).run(...this.args).changes)}};}
 }
 const env={PASSWORD_PEPPER:'durable-test-only-'.repeat(4),ALLOWED_ORIGIN:'http://127.0.0.1:4173',GAME_STATE_BACKEND:'do',DB:{prepare:q=>new Statement(q),batch:async qs=>{
  d1Calls++;sql.exec('BEGIN');try{const out=[];for(const q of qs){if(/^\s*(SELECT|WITH|PRAGMA)\b/i.test(q.query)||/\bRETURNING\b/i.test(q.query))out.push({results:sql.prepare(q.query).all(...q.args),meta:{changes:0}});else out.push({meta:{changes:Number(sql.prepare(q.query).run(...q.args).changes)}});}sql.exec('COMMIT');return out;}catch(e){sql.exec('ROLLBACK');throw e;}
 }}};
 const get=id=>{
  if(objects.has(id))return objects.get(id);
  if(!handles.has(id))handles.set(id,{db:new DatabaseSync(':memory:'),alarm:null,failSync:false,failSql:null});
  const h=handles.get(id),storage={sql:{exec:(q,...args)=>{if(h.failSql&&q.includes(h.failSql))throw Error('injected SQLite failure');if(q.includes(';')){h.db.exec(q);return {toArray:()=>[]};}const rows=h.db.prepare(q).all(...args);return {toArray:()=>rows};}},transactionSync:fn=>{h.db.exec('BEGIN');try{const x=fn();h.db.exec('COMMIT');return x;}catch(e){h.db.exec('ROLLBACK');throw e;}},sync:async()=>{if(h.failSync){h.failSync=false;throw Error('injected response loss after durable commit');}},getAlarm:async()=>h.alarm,setAlarm:async t=>{h.alarm=t;},deleteAlarm:async()=>{h.alarm=null;}};
  const o=new GameAccount({storage,waitUntil:p=>pending.push(p)},env);objects.set(id,o);return o;
 };
 env.GAME_ACCOUNTS={idFromName:id=>id,get:id=>({fetch:(url,init)=>get(id).fetch(url instanceof Request?url:new Request(url,init))})};
 let token='',account;
 async function call(path,data,using=token){const res=await worker.fetch(new Request('https://test.invalid'+path,{method:data===undefined?'GET':'POST',headers:{'content-type':'application/json',...(using?{authorization:'Bearer '+using}:{})},...(data===undefined?{}:{body:JSON.stringify(data)})}),env,{waitUntil:p=>pending.push(p)});return {status:res.status,...await res.json()};}
 return {sql,env,call,handles,objects,get,get d1Calls(){return d1Calls;},get token(){return token;},get account(){return account;},
  async start(){const a=await call('/register',{username:'durabletest',password:'test-only-password'});if(a.status!==200)throw Error(JSON.stringify(a));account=a.account;token=a.token;return call('/game/new',{name:'검증',route:'ROUTE_ISEKAI'});},
  async action(type,params={},extra={}){return call('/game/action',{version:APP_VERSION,revision:get(account.id).meta().revision,requestId:crypto.randomUUID(),type,params,...extra});},
  read(){const o=get(account.id),m=o.meta();return {...m,state:JSON.stringify(joinState(o.parts()))};},
  restart(){objects.delete(account.id);return get(account.id);},
  async flush(){const o=get(account.id);handles.get(account.id).alarm=null;await o.alarm();await Promise.all(pending);},
  seed(state){const o=get(account.id);o.runtime=null;o.partsCache=null;o.sql.exec('DELETE FROM parts');for(const [p,v] of splitState(state))o.sql.exec('INSERT INTO parts VALUES(?,?)',p,v);}
 };
}
