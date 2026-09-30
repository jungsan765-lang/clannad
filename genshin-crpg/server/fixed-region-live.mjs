import {createServer} from 'node:http';
import {mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {R,DB as GAME_DB,ENGINE_VERSION,ENGINE_FINGERPRINT,SERVER_BUILD} from './generated/engine.mjs';
import {compact,executeAction,hash,same,passwordHash,token} from './game-core.mjs';
import {splitState,joinState,diffParts,publicParts,wirePatch,intent} from './state-parts.mjs';

const TRANSPORT_BUILD='fixed-region-live-sqlite-v1',MAX_BODY=65536,SESSION_MS=7*86400000,MAX_CACHE=16,now=()=>Date.now();
const RID=/^[a-zA-Z0-9_-]{10,80}$/,JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const view=(a,admins)=>({id:a.id,username:a.username,displayName:a.display_name,admin:admins.has(a.id)});
const publicState=parts=>joinState(publicParts(parts));
function cors(origin,allowed){return origin?{'access-control-allow-origin':allowed,'access-control-expose-headers':'X-Server-Time, Server-Timing, X-CRPG-State-Bytes, X-CRPG-Response-Bytes','vary':'Origin'}:{};}
function send(res,status,payload,headers={}){const text=JSON.stringify(payload);res.writeHead(status,{...JSON_HEADERS,'content-length':Buffer.byteLength(text),'x-content-type-options':'nosniff','x-server-time':String(now()),...headers});res.end(text);}
function timing(t,c={}){const h={...c},v=[];if(t.runtimeMs!=null)v.push('runtime;dur='+t.runtimeMs);if(t.engineMs!=null)v.push('engine;dur='+t.engineMs);if(t.persistMs!=null)v.push('persist;dur='+t.persistMs);v.push('total;dur='+(t.totalMs||0));h['server-timing']=v.join(',');if(t.stateBytes!=null)h['x-crpg-state-bytes']=String(t.stateBytes);if(t.responseBytes!=null)h['x-crpg-response-bytes']=String(t.responseBytes);return h;}
async function body(req){let n=0,chunks=[];for await(const x of req){n+=x.length;if(n>MAX_BODY)throw err(413,'요청이 너무 큽니다.');chunks.push(x);}try{return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}');}catch{throw err(400,'요청 형식을 확인해 주세요.');}}
const uname=v=>String(v||'').normalize('NFKC').trim().toLowerCase();
const ip=req=>String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'local').split(',')[0].trim().slice(0,96);
function score(state){const a=state?.abyss||{},floor=Math.max(0,...Object.keys(a.clears||{}).map(Number)),rounds=Object.values(a.clears||{}).reduce((n,x)=>n+(x?.rounds||0),0);return {season:a.season||'ABYSS_01',floor,rounds,attempts:a.attempts||0};}

export class LiveRegionStore{
 constructor(path=':memory:',{pepper,adminIds=''}={}){
  if(typeof pepper!=='string'||pepper.length<32)throw new Error('PASSWORD_PEPPER must be at least 32 characters.');
  this.pepper=pepper;this.admins=new Set(String(adminIds||'').split(',').map(x=>x.trim()).filter(Boolean));this.locks=new Map();this.cache=new Map();this.rates=new Map();
  if(path!==':memory:')mkdirSync(dirname(resolve(path)),{recursive:true});this.db=new DatabaseSync(path,{timeout:5000});
  const pragmas=['PRAGMA foreign_keys=ON','PRAGMA busy_timeout=5000','PRAGMA synchronous=FULL',path===':memory:'?'':'PRAGMA journal_mode=WAL','PRAGMA temp_store=MEMORY','PRAGMA cache_size=-16384'].filter(Boolean).join(';')+';';
  const ddl=[
   'CREATE TABLE IF NOT EXISTS accounts(id TEXT PRIMARY KEY,username TEXT NOT NULL UNIQUE,display_name TEXT NOT NULL,salt TEXT NOT NULL,password_hash TEXT NOT NULL,created_at INTEGER NOT NULL) STRICT',
   'CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,account_id TEXT NOT NULL,expires_at INTEGER NOT NULL,FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT',
   'CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions(account_id)',
   'CREATE TABLE IF NOT EXISTS metadata(account_id TEXT PRIMARY KEY,revision INTEGER,ranked INTEGER NOT NULL,last_request_id TEXT NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT',
   'CREATE TABLE IF NOT EXISTS parts(account_id TEXT NOT NULL,path TEXT NOT NULL,value TEXT NOT NULL,PRIMARY KEY(account_id,path),FOREIGN KEY(account_id) REFERENCES metadata(account_id) ON DELETE CASCADE) STRICT',
   'CREATE TABLE IF NOT EXISTS receipts(account_id TEXT NOT NULL,request_id TEXT NOT NULL,revision INTEGER NOT NULL,base_revision INTEGER NOT NULL,intent_hash TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(account_id,request_id),FOREIGN KEY(account_id) REFERENCES metadata(account_id) ON DELETE CASCADE) STRICT',
   'CREATE TABLE IF NOT EXISTS backups(account_id TEXT NOT NULL,revision INTEGER NOT NULL,undo TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(account_id,revision),FOREIGN KEY(account_id) REFERENCES metadata(account_id) ON DELETE CASCADE) STRICT',
   'CREATE TABLE IF NOT EXISTS ranking(account_id TEXT NOT NULL,season TEXT NOT NULL,display_name TEXT NOT NULL,floor INTEGER NOT NULL,rounds INTEGER NOT NULL,attempts INTEGER NOT NULL,achieved_at INTEGER NOT NULL,PRIMARY KEY(account_id,season),FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT'
  ].join(';')+';';
  this.db.exec(pragmas+ddl);
 }
 close(){this.db.close();}
 rate(key,limit,windowMs){const t=now(),old=this.rates.get(key),r=!old||old.until<=t?{count:0,until:t+windowMs}:old;r.count++;this.rates.set(key,r);if(r.count>limit)throw err(429,'시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주세요.');}
 async serial(id,fn){const prev=this.locks.get(id)||Promise.resolve(),next=prev.then(fn),guard=next.catch(()=>{});this.locks.set(id,guard);try{return await next;}finally{if(this.locks.get(id)===guard)this.locks.delete(id);}}
 account(username){return this.db.prepare('SELECT * FROM accounts WHERE username=?').get(username);}
 meta(id){return this.db.prepare('SELECT * FROM metadata WHERE account_id=?').get(id);}
 loadParts(id){return new Map(this.db.prepare('SELECT path,value FROM parts WHERE account_id=?').all(id).map(x=>[x.path,x.value]));}
 touch(id,e){e.lastUsed=now();this.cache.delete(id);this.cache.set(id,e);while(this.cache.size>MAX_CACHE)this.cache.delete(this.cache.keys().next().value);}
 cached(id,revision){const e=this.cache.get(id);if(!e||e.revision!==revision){if(e)this.cache.delete(id);return null;}this.touch(id,e);return e;}
 invalidate(id){this.cache.delete(id);}
 envelope(a,m,result=null){return {account:view(a,this.admins),version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD,transportBuild:TRANSPORT_BUILD,revision:m?.revision??0,ranked:m?.ranked===1,result};}
 output(a,m,parts,result=null){return {...this.envelope(a,m,result),state:m?.revision==null?null:publicState(parts)};}
 async register(b,addr){
  const username=uname(b.username),password=String(b.password||'');this.rate('auth-ip:'+addr,30,600000);this.rate('auth-user:'+username,10,600000);this.rate('register:'+addr,5,3600000);
  if(!/^[a-z0-9가-힣_]{3,24}$/.test(username)||password.length<8||password.length>128)throw err(400,'아이디는 한글·영문·숫자·밑줄 3~24자, 비밀번호는 8~128자로 입력해 주세요.');
  if(this.account(username))throw err(409,'이미 사용 중인 아이디입니다.');
  const id=crypto.randomUUID(),salt=token(),ph=await passwordHash(password,salt,this.pepper),display=String(b.displayName||username).trim().slice(0,24)||username;
  try{this.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,username,display,salt,ph,now());}catch{throw err(409,'이미 사용 중인 아이디입니다.');}
  return this.issue(this.account(username));
 }
 async login(b,addr){
  const username=uname(b.username),password=String(b.password||'');this.rate('auth-ip:'+addr,30,600000);this.rate('auth-user:'+username,10,600000);
  const a=this.account(username),ph=await passwordHash(password,a?.salt||'0'.repeat(64),this.pepper);if(!a||!same(ph,a.password_hash))throw err(401,'아이디 또는 비밀번호를 확인해 주세요.');return this.issue(a);
 }
 async issue(a){const secret=token(),th=await hash(secret);this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(th,a.id,now()+SESSION_MS);return {token:secret,account:view(a,this.admins),version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT};}
 async auth(raw){if(!/^[a-f0-9]{64}$/.test(raw||''))throw err(401,'로그인해 주세요.');const th=await hash(raw),a=this.db.prepare('SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').get(th,now());if(!a)throw err(401,'로그인이 만료되었습니다.');return {a,th};}
 me(a){const m=this.meta(a.id),e=m&&this.cached(a.id,m.revision),parts=e?.parts||(m?this.loadParts(a.id):new Map());return this.output(a,m,parts);}
 logout(th){this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(th);return {ok:true};}
 async remove(a,b){this.rate('delete:'+a.id,5,900000);if(b.confirm!==a.username||!same(await passwordHash(String(b.password||''),a.salt,this.pepper),a.password_hash))throw err(403,'아이디와 비밀번호로 삭제를 확인해 주세요.');this.db.prepare('DELETE FROM accounts WHERE id=?').run(a.id);this.invalidate(a.id);return {deleted:true};}
 async newGame(a,b){
  return this.serial(a.id,async()=>{const old=this.meta(a.id);if(old?.revision!=null)throw err(409,'이미 자동저장된 여정이 있습니다.');
   const r=new R(GAME_DB);r.newGame({name:String(b.name||a.display_name),route:b.route==='ROUTE_TRAVELER'?'ROUTE_TRAVELER':'ROUTE_ISEKAI',saveId:crypto.randomUUID(),seed:crypto.getRandomValues(new Uint32Array(1))[0]});compact(r.s);const parts=splitState(r.s),t=now();
   this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('INSERT INTO metadata VALUES(?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET revision=excluded.revision,ranked=excluded.ranked,last_request_id=excluded.last_request_id,updated_at=excluded.updated_at').run(a.id,0,1,'NEW',t);this.db.prepare('DELETE FROM parts WHERE account_id=?').run(a.id);const ins=this.db.prepare('INSERT INTO parts VALUES(?,?,?)');for(const [p,v] of parts)ins.run(a.id,p,v);this.db.exec('COMMIT');}catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');throw e;}
   const m=this.meta(a.id);this.touch(a.id,{revision:0,parts,r});return this.output(a,m,parts);
  });
 }
 rank(a,ranked,state){if(!ranked){this.db.prepare('DELETE FROM ranking WHERE account_id=?').run(a.id);return;}const x=score(state);if(!x.floor)return;this.db.prepare('INSERT INTO ranking VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id,season) DO UPDATE SET display_name=excluded.display_name,floor=excluded.floor,rounds=excluded.rounds,attempts=excluded.attempts,achieved_at=excluded.achieved_at WHERE excluded.floor>ranking.floor OR (excluded.floor=ranking.floor AND (excluded.rounds<ranking.rounds OR (excluded.rounds=ranking.rounds AND excluded.attempts<ranking.attempts)))').run(a.id,x.season,a.display_name,x.floor,x.rounds,x.attempts,now());}
 async action(a,b){
  if(!RID.test(b?.requestId||''))throw err(400,'행동 식별자가 잘못되었습니다.');this.rate('action:'+a.id,240,60000);const digest=await hash(intent(b));
  return this.serial(a.id,async()=>{const started=performance.now();let persistence=false;this.db.exec('BEGIN IMMEDIATE');
   try{const m=this.meta(a.id);if(!m||m.revision==null)throw err(409,'먼저 여정을 시작해 주세요.');const receipt=this.db.prepare('SELECT * FROM receipts WHERE account_id=? AND request_id=?').get(a.id,b.requestId),entry=this.cached(a.id,m.revision),before=entry?.parts||this.loadParts(a.id);
    if(receipt){if(receipt.intent_hash!==digest)throw err(409,'같은 행동 식별자를 다른 행동에 사용할 수 없습니다.','REQUEST_ID_REUSED');this.db.exec('COMMIT');return {payload:{...this.output(a,m,before,JSON.parse(receipt.result).result),replayed:true,receiptRevision:receipt.revision},timing:{totalMs:Math.round((performance.now()-started)*10)/10,persistMs:0}};}
    const warm=entry?.r||null,row={state:warm?'':JSON.stringify(joinState(before)),revision:m.revision,ranked:m.ranked,updated_at:m.updated_at},env={ADMIN_ACCOUNT_IDS:[...this.admins].join(',')};
    const {r,result,isDebug,runtimeMs,engineMs}=executeAction(b,row,a,env,now(),warm);compact(r.s);const after=splitState(r.s),rough=[...after].reduce((n,[p,v])=>n+p.length+v.length+8,2);let stateBytes=rough*3;if(stateBytes>1900000){stateBytes=Buffer.byteLength(JSON.stringify(r.s));if(stateBytes>1900000)throw err(507,'저장 크기 한도에 도달했습니다.');}
    const d=diffParts(before,after),next={...m,revision:m.revision+1,ranked:isDebug?0:m.ranked,last_request_id:b.requestId,updated_at:now()},payload=b.responseMode==='state-parts-v1'?{...this.envelope(a,next,result),baseRevision:m.revision,statePatch:wirePatch(publicParts(before),publicParts(after))}:this.output(a,next,after,result);
    persistence=true;const ps=performance.now(),del=this.db.prepare('DELETE FROM parts WHERE account_id=? AND path=?'),up=this.db.prepare('INSERT INTO parts VALUES(?,?,?) ON CONFLICT(account_id,path) DO UPDATE SET value=excluded.value');
    for(const p of d.remove)del.run(a.id,p);for(const [p,v] of d.set)up.run(a.id,p,v);this.db.prepare('INSERT INTO backups VALUES(?,?,?,?)').run(a.id,m.revision,JSON.stringify(d.undo),next.updated_at);this.db.prepare('DELETE FROM backups WHERE account_id=? AND revision<?').run(a.id,m.revision-3);this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(a.id,b.requestId,next.revision,m.revision,digest,JSON.stringify({result}),next.updated_at);this.db.prepare('UPDATE metadata SET revision=?,ranked=?,last_request_id=?,updated_at=? WHERE account_id=?').run(next.revision,next.ranked,b.requestId,next.updated_at,a.id);this.rank(a,next.ranked,r.s);this.db.exec('COMMIT');this.touch(a.id,{revision:next.revision,parts:after,r});
    return {payload,timing:{runtimeMs,engineMs,persistMs:Math.round((performance.now()-ps)*10)/10,totalMs:Math.round((performance.now()-started)*10)/10,stateBytes,responseBytes:Buffer.byteLength(JSON.stringify(payload))}};
   }catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');this.invalidate(a.id);if(!persistence)e.outcome='REJECTED';throw e;}
  });
 }
 ranking(){const rows=this.db.prepare('SELECT display_name AS name,floor,rounds,attempts FROM ranking WHERE season=? ORDER BY floor DESC,rounds,attempts,achieved_at,account_id LIMIT 20').all('ABYSS_01');return {season:'ABYSS_01',entries:rows.map((r,i)=>({rank:i+1,...r}))};}
}

export function createLiveRegionHandler({store,allowedOrigin='https://clannad.shop'}){
 return async(req,res)=>{const origin=req.headers.origin||'',host=req.headers.host||'',sameOrigin=!!origin&&!!host&&(origin===`https://${host}`||origin===`http://${host}`);if(origin&&origin!==allowedOrigin&&!sameOrigin)return send(res,403,{error:'허용되지 않은 접속 경로입니다.'},{vary:'Origin'});const c=cors(origin,sameOrigin?origin:allowedOrigin);
  if(req.method==='OPTIONS'){res.writeHead(204,{...c,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,Authorization','access-control-max-age':'86400'});return res.end();}
  const path=new URL(req.url,'http://fixed-region-live.local').pathname;
  try{
   if(path==='/health'&&req.method==='GET')return send(res,200,{ok:true,version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD,transportBuild:TRANSPORT_BUILD,storage:'sqlite-node-accounts',configured:true,synthetic:false,staging:true,capabilities:['state-parts-v1']},c);
   if(path==='/ranking'&&req.method==='GET')return send(res,200,store.ranking(),c);
   if((path==='/register'||path==='/login')&&req.method==='POST'){const b=await body(req),out=path==='/register'?await store.register(b,ip(req)):await store.login(b,ip(req));return send(res,200,out,c);}
   const raw=(req.headers.authorization||'').replace(/^Bearer /,''),auth=await store.auth(raw),a=auth.a;
   if(path==='/me'&&req.method==='GET')return send(res,200,store.me(a),c);
   if(path==='/logout'&&req.method==='POST')return send(res,200,store.logout(auth.th),c);
   if(path==='/account/delete'&&req.method==='POST')return send(res,200,await store.remove(a,await body(req)),c);
   if(path==='/game/new'&&req.method==='POST')return send(res,200,await store.newGame(a,await body(req)),c);
   if(path==='/game/action'&&req.method==='POST'){const out=await store.action(a,await body(req));return send(res,200,out.payload,timing(out.timing||{},c));}
   return send(res,404,{error:'지원하지 않는 요청입니다.'},c);
  }catch(e){const rule=!!(globalThis.CRPGRuntime?.RuleError&&e instanceof globalThis.CRPGRuntime.RuleError)||!!(globalThis.CRPGRelationships?.RelationshipError&&e instanceof globalThis.CRPGRelationships.RelationshipError);return send(res,e.status||(rule?400:500),{error:e.status||rule?e.message:'이 행동을 처리하지 못했습니다. 다른 행동을 선택하거나 잠시 뒤 다시 시도해 주세요.',...(e.code?{code:e.code}:{}),...(e.outcome?{outcome:e.outcome}:{}),...(e.code==='VERSION_MISMATCH'?{version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD}:{})},c);}
 };
}
export async function startLiveRegionStaging({dbPath=':memory:',pepper,adminIds='',allowedOrigin='https://clannad.shop',host='127.0.0.1',port=0}={}){
 const store=new LiveRegionStore(dbPath,{pepper,adminIds}),server=createServer(createLiveRegionHandler({store,allowedOrigin}));await new Promise((ok,bad)=>{server.once('error',bad);server.listen(port,host,ok);});return {store,server,address:server.address(),close:async()=>{await new Promise((ok,bad)=>server.close(e=>e?bad(e):ok()));store.close();}};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){const started=await startLiveRegionStaging({dbPath:process.env.CRPG_SQLITE_PATH||'./data/fixed-region-live.sqlite3',pepper:process.env.PASSWORD_PEPPER,adminIds:process.env.ADMIN_ACCOUNT_IDS||'',allowedOrigin:process.env.ALLOWED_ORIGIN||'https://clannad.shop',host:process.env.HOST||'127.0.0.1',port:Number(process.env.PORT||8789)});console.log(JSON.stringify({kind:'crpg_fixed_region_live_started',port:started.address.port,transportBuild:TRANSPORT_BUILD}));}
