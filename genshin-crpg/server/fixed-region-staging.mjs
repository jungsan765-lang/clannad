import {createServer} from 'node:http';
import {mkdirSync} from 'node:fs';
import {dirname, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {R, DB as GAME_DB, ENGINE_VERSION, ENGINE_FINGERPRINT, SERVER_BUILD} from './generated/engine.mjs';
import {compact, executeAction, hash, same} from './game-core.mjs';
import {fixture} from './benchmark-fixtures.mjs';
import {splitState, joinState, diffParts, publicParts, wirePatch, intent} from './state-parts.mjs';
import {diagnosticHtml} from './fixed-region-diagnostic-page.mjs';

const TRANSPORT_BUILD='fixed-region-node-sqlite-v3-warm-runtime';
const ACCOUNT={id:'00000000-0000-4000-8000-000000000001',username:'synthetic',display_name:'성능시험용'};
const ENV={ADMIN_ACCOUNT_IDS:''};
const MAX_BODY=65536;
const now=()=>Date.now();
const jsonHeaders={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const accountView=()=>({id:ACCOUNT.id,username:ACCOUNT.username,displayName:ACCOUNT.display_name,admin:false});

function clonePublic(parts){return joinState(publicParts(parts));}
function ensureScenario(value){if(!['move','combat','combat-log'].includes(value))throw Object.assign(new Error('지원하지 않는 synthetic 시나리오입니다.'),{status:400});return value;}
function ensureRequestId(value){if(!/^[a-zA-Z0-9_-]{10,80}$/.test(value||''))throw Object.assign(new Error('행동 식별자가 잘못되었습니다.'),{status:400});}

export class FixedRegionStore{
 constructor(path=':memory:'){
  if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true});
  this.db=new DatabaseSync(path,{timeout:5000});
  this.tail=Promise.resolve();
  this.runtime=null;
  this.db.exec(`PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL; ${path===':memory:'?'':'PRAGMA journal_mode=WAL;'}
   CREATE TABLE IF NOT EXISTS metadata(account_id TEXT PRIMARY KEY,account_json TEXT NOT NULL,revision INTEGER NOT NULL,ranked INTEGER NOT NULL,last_request_id TEXT NOT NULL,updated_at INTEGER NOT NULL) STRICT;
   CREATE TABLE IF NOT EXISTS parts(account_id TEXT NOT NULL,path TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(account_id,path),FOREIGN KEY(account_id) REFERENCES metadata(account_id) ON DELETE CASCADE) STRICT;
   CREATE TABLE IF NOT EXISTS receipts(account_id TEXT NOT NULL,request_id TEXT NOT NULL,revision INTEGER NOT NULL,base_revision INTEGER NOT NULL,intent_hash TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(account_id,request_id),FOREIGN KEY(account_id) REFERENCES metadata(account_id) ON DELETE CASCADE) STRICT;
   CREATE TABLE IF NOT EXISTS backups(account_id TEXT NOT NULL,revision INTEGER NOT NULL,undo TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(account_id,revision),FOREIGN KEY(account_id) REFERENCES metadata(account_id) ON DELETE CASCADE) STRICT;`);
  if(!this.meta())this.reset('move',false);
 }
 close(){this.db.close();}
 serial(fn){const next=this.tail.then(fn);this.tail=next.catch(()=>{});return next;}
 meta(){return this.db.prepare('SELECT * FROM metadata WHERE account_id=?').get(ACCOUNT.id);}
 parts(){return new Map(this.db.prepare('SELECT path,value FROM parts WHERE account_id=?').all(ACCOUNT.id).map(x=>[x.path,x.value]));}
 envelope(meta,result=null){return {account:accountView(),version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD,transportBuild:TRANSPORT_BUILD,revision:meta.revision,ranked:!!meta.ranked,result};}
 output(meta,parts,result=null){return {...this.envelope(meta,result),state:clonePublic(parts)};}
 state(){const meta=this.meta();return this.output(meta,this.parts());}
 reset(kind='move',large=false){
  kind=ensureScenario(kind);const seeded=fixture(kind,!!large),state=compact(structuredClone(seeded.state)),parts=splitState(state),t=now();
  this.db.exec('BEGIN IMMEDIATE');
  try{
   this.db.prepare('DELETE FROM metadata WHERE account_id=?').run(ACCOUNT.id);
   this.db.prepare('INSERT INTO metadata VALUES(?,?,?,?,?,?)').run(ACCOUNT.id,JSON.stringify(ACCOUNT),0,1,'RESET',t);
   const insert=this.db.prepare('INSERT INTO parts VALUES(?,?,?)');for(const [path,value] of parts)insert.run(ACCOUNT.id,path,value);
   this.db.exec('COMMIT');
  }catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');throw e;}
  this.runtime={revision:0,r:new R(GAME_DB,structuredClone(state),true)};
  const meta=this.meta();return {...this.output(meta,parts),synthetic:true,scenario:kind,suggestedAction:{...seeded.action,version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,revision:0}};
 }
 async action(b){
  ensureRequestId(b?.requestId);const digest=await hash(intent(b));
  return this.serial(async()=>{
   const started=performance.now();this.db.exec('BEGIN IMMEDIATE');
   try{
    const meta=this.meta(),receipt=this.db.prepare('SELECT * FROM receipts WHERE account_id=? AND request_id=?').get(ACCOUNT.id,b.requestId),before=this.parts();
    if(receipt){
     if(receipt.intent_hash!==digest)throw Object.assign(new Error('같은 행동 식별자를 다른 행동에 사용할 수 없습니다.'),{status:409,code:'REQUEST_ID_REUSED'});
     this.db.exec('COMMIT');
     return {payload:{...this.output(meta,before,JSON.parse(receipt.result).result),replayed:true,receiptRevision:receipt.revision},timing:{totalMs:Math.round((performance.now()-started)*10)/10,persistMs:0}};
    }
    const warm=this.runtime?.revision===meta.revision?this.runtime.r:null;
    const row={state:warm?'':JSON.stringify(joinState(before)),revision:meta.revision,ranked:meta.ranked,updated_at:meta.updated_at};
    const {r,result,isDebug,runtimeMs,engineMs}=executeAction(b,row,ACCOUNT,ENV,now(),warm);compact(r.s);
    const stateBytes=Buffer.byteLength(JSON.stringify(r.s));if(stateBytes>1900000)throw Object.assign(new Error('저장 크기 한도에 도달했습니다.'),{status:507});
    const after=splitState(r.s),delta=diffParts(before,after),next={...meta,revision:meta.revision+1,ranked:isDebug?0:meta.ranked,last_request_id:b.requestId,updated_at:now()};
    let payload;if(b.responseMode==='state-parts-v1')payload={...this.envelope(next,result),baseRevision:meta.revision,statePatch:wirePatch(publicParts(before),publicParts(after))};else payload=this.output(next,after,result);
    const persistStart=performance.now();
    const del=this.db.prepare('DELETE FROM parts WHERE account_id=? AND path=?'),up=this.db.prepare('INSERT INTO parts VALUES(?,?,?) ON CONFLICT(account_id,path) DO UPDATE SET value=excluded.value');
    for(const path of delta.remove)del.run(ACCOUNT.id,path);for(const [path,value] of delta.set)up.run(ACCOUNT.id,path,value);
    this.db.prepare('INSERT INTO backups VALUES(?,?,?,?)').run(ACCOUNT.id,meta.revision,JSON.stringify(delta.undo),next.updated_at);
    this.db.prepare('DELETE FROM backups WHERE account_id=? AND revision<?').run(ACCOUNT.id,meta.revision-3);
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(ACCOUNT.id,b.requestId,next.revision,meta.revision,digest,JSON.stringify({result}),next.updated_at);
    this.db.prepare('UPDATE metadata SET revision=?,ranked=?,last_request_id=?,updated_at=? WHERE account_id=?').run(next.revision,next.ranked,b.requestId,next.updated_at,ACCOUNT.id);
    this.db.exec('COMMIT');
    this.runtime={revision:next.revision,r};
    return {payload,timing:{runtimeMs,engineMs,persistMs:Math.round((performance.now()-persistStart)*10)/10,totalMs:Math.round((performance.now()-started)*10)/10,stateBytes,responseBytes:Buffer.byteLength(JSON.stringify(payload))}};
   }catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');this.runtime=null;throw e;}
  });
 }
}

async function readJson(req){let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY)throw Object.assign(new Error('요청이 너무 큽니다.'),{status:413});chunks.push(chunk);}const raw=Buffer.concat(chunks).toString('utf8');try{return JSON.parse(raw||'{}');}catch{throw Object.assign(new Error('요청 형식을 확인해 주세요.'),{status:400});}}
function send(res,status,payload,headers={}){const text=JSON.stringify(payload);res.writeHead(status,{...jsonHeaders,'content-length':Buffer.byteLength(text),'x-content-type-options':'nosniff',...headers});res.end(text);}
function sendHtml(res,status,html,headers={}){res.writeHead(status,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-length':Buffer.byteLength(html),'x-content-type-options':'nosniff',...headers});res.end(html);}
function corsHeaders(origin){return origin?{'access-control-allow-origin':origin,'vary':'Origin'}:{};}
function timingHeaders(timing,cors={}){const headers={...cors};headers['server-timing']=[timing.runtimeMs!=null?`runtime;dur=${timing.runtimeMs}`:'',timing.engineMs!=null?`engine;dur=${timing.engineMs}`:'',timing.persistMs!=null?`persist;dur=${timing.persistMs}`:'',`total;dur=${timing.totalMs||0}`].filter(Boolean).join(',');if(timing.stateBytes!=null)headers['x-crpg-state-bytes']=String(timing.stateBytes);if(timing.responseBytes!=null)headers['x-crpg-response-bytes']=String(timing.responseBytes);return headers;}

export function createFixedRegionHandler({store,token,allowedOrigin='https://clannad.shop'}){
 if(typeof token!=='string'||token.length<32)throw new Error('STAGING_BEARER_TOKEN must be at least 32 characters.');
 let tokenDigestPromise=hash(token);const diagnosticRate=new Map();
 const takeDiagnostic=req=>{const key=req.socket?.remoteAddress||'unknown',t=now(),old=diagnosticRate.get(key),entry=!old||old.until<=t?{count:0,until:t+60000}:old;entry.count++;diagnosticRate.set(key,entry);if(entry.count>30)throw Object.assign(new Error('진단 요청이 너무 잦습니다. 잠시 뒤 다시 시도해 주세요.'),{status:429});};
 return async(req,res)=>{
  const url=new URL(req.url,'http://fixed-region.local'),origin=req.headers.origin||'',host=req.headers.host||'',diagnostic=url.pathname==='/diagnostic'||url.pathname.startsWith('/diagnostic/'),sameOrigin=!!origin&&!!host&&(origin===`https://${host}`||origin===`http://${host}`);
  if(origin&&origin!==allowedOrigin&&!(diagnostic&&sameOrigin))return send(res,403,{error:'허용되지 않은 접속 경로입니다.'},{vary:'Origin'});
  const cors=corsHeaders(origin);
  if(req.method==='OPTIONS'){res.writeHead(204,{...cors,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,Authorization','access-control-max-age':'86400'});return res.end();}
  try{
   if(url.pathname==='/health'&&req.method==='GET')return send(res,200,{ok:true,version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD,transportBuild:TRANSPORT_BUILD,storage:'sqlite-node',configured:true,synthetic:true},cors);
   if(url.pathname==='/ping'&&req.method==='GET')return send(res,200,{ok:true,serverTime:now(),transportBuild:TRANSPORT_BUILD},cors);
   if(url.pathname==='/diagnostic'&&req.method==='GET')return sendHtml(res,200,diagnosticHtml,cors);
   if(url.pathname==='/diagnostic/reset'&&req.method==='POST'){takeDiagnostic(req);const b=await readJson(req);return send(res,200,store.reset(b.scenario||'move',false),cors);}
   if(url.pathname==='/diagnostic/action'&&req.method==='POST'){takeDiagnostic(req);const b=await readJson(req),out=await store.action(b);return send(res,200,out.payload,timingHeaders(out.timing||{},cors));}
   const auth=(req.headers.authorization||'').replace(/^Bearer /,'');const supplied=await hash(auth),expected=await tokenDigestPromise;if(!auth||!same(supplied,expected))return send(res,401,{error:'로그인해 주세요.'},cors);
   if(url.pathname==='/game/state'&&req.method==='GET')return send(res,200,store.state(),cors);
   if(url.pathname==='/synthetic/reset'&&req.method==='POST'){const b=await readJson(req);return send(res,200,store.reset(b.scenario||'move',!!b.large),cors);}
   if(url.pathname==='/game/action'&&req.method==='POST'){const b=await readJson(req),out=await store.action(b);return send(res,200,out.payload,timingHeaders(out.timing||{},cors));}
   return send(res,404,{error:'지원하지 않는 요청입니다.'},cors);
  }catch(e){const rule=!!(globalThis.CRPGRuntime?.RuleError&&e instanceof globalThis.CRPGRuntime.RuleError)||!!(globalThis.CRPGRelationships?.RelationshipError&&e instanceof globalThis.CRPGRelationships.RelationshipError);return send(res,e.status||(rule?400:500),{error:e.status||rule?e.message:'이 행동을 처리하지 못했습니다.',...(e.code?{code:e.code}:{})},cors);}
 };
}

export async function startFixedRegionStaging({dbPath=':memory:',token,allowedOrigin='https://clannad.shop',host='127.0.0.1',port=0}={}){
 const store=new FixedRegionStore(dbPath),server=createServer(createFixedRegionHandler({store,token,allowedOrigin}));
 await new Promise((resolvePromise,reject)=>{server.once('error',reject);server.listen(port,host,resolvePromise);});
 return {store,server,address:server.address(),close:async()=>{await new Promise((resolvePromise,reject)=>server.close(e=>e?reject(e):resolvePromise()));store.close();}};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const token=process.env.STAGING_BEARER_TOKEN,dbPath=process.env.CRPG_SQLITE_PATH||'./data/fixed-region-staging.sqlite3',allowedOrigin=process.env.ALLOWED_ORIGIN||'https://clannad.shop',host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||8788);
 const started=await startFixedRegionStaging({dbPath,token,allowedOrigin,host,port});console.log(JSON.stringify({kind:'crpg_fixed_region_staging_started',host,port:started.address.port,dbPath,transportBuild:TRANSPORT_BUILD}));
}
