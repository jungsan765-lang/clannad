import {R,DB as GAME_DB,ENGINE_VERSION,ENGINE_FINGERPRINT,SERVER_BUILD} from './generated/engine.mjs';
import {now,elapsed,json,token,hash,error,same,passwordHash,admin,compact,body,executeAction} from './game-core.mjs';
import {splitState,joinState,diffParts,publicParts,wirePatch,intent,compress} from './state-parts.mjs';

const UUID='[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}';
const routed=new RegExp('^v2\\.('+UUID+')\\.([a-f0-9]{64})$');
const allowedPaths=new Set(['/me','/game/new','/game/action','/logout','/account/delete']);
const REJECTED={outcome:'REJECTED'};
const accountView=(a,env)=>({id:a.id,username:a.username,displayName:a.display_name,admin:admin(env,a.id)});
function stub(env,id){return env.GAME_ACCOUNTS.get(env.GAME_ACCOUNTS.idFromName(id),{locationHint:env.DO_LOCATION_HINT||'apac-ne'});}
export async function enrollSession(env,account,tokenHash,expires){
 const res=await stub(env,account.id).fetch('https://account.internal/enroll',{method:'POST',body:JSON.stringify({account,tokenHash,expires})});
 if(!res.ok)throw error(503,'계정 저장 공간을 준비하지 못했습니다. 기존 기록은 유지됩니다.');
}
export async function durableDispatch(request,env){
 const path=new URL(request.url).pathname;
 if(!allowedPaths.has(path)&&!path.startsWith('/ops/storage/'))throw error(404,'지원하지 않는 요청입니다.');
 const raw=(request.headers.get('authorization')||'').replace(/^Bearer /,''),match=raw.match(routed);
 let id,secret,bootstrap;
 if(match){[,id,secret]=match;}
 else if(/^[a-f0-9]{64}$/.test(raw)){
  secret=raw;const th=await hash(secret);
  const a=await env.DB.prepare('SELECT a.*,s.expires_at FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').bind(th,now()).first();
  if(!a)throw error(401,'로그인이 만료되었습니다.');id=a.id;bootstrap={account:a,tokenHash:th,expires:a.expires_at};
 }else throw error(401,'로그인해 주세요.');
 const th=await hash(secret),data=request.method==='POST'?await body(request):null;
 // Operator requests are authorized by the operator's OWN object before targeting another account.
 if(path.startsWith('/ops/storage/')){
  if(request.method!=='POST')throw error(405,'POST 요청이 필요합니다.');
  const auth=await stub(env,id).fetch('https://account.internal/authorize',{method:'POST',body:JSON.stringify({tokenHash:th,bootstrap})});
  if(!auth.ok)return auth;const verified=await auth.json();if(!verified.admin)throw error(403,'운영자 전용 기능입니다.');
  if(!new RegExp('^'+UUID+'$').test(data?.accountId||''))throw error(400,'계정 ID를 확인해 주세요.');
  const op=path.slice('/ops/storage/'.length);if(!['status','rollback','export'].includes(op))throw error(404,'지원하지 않는 요청입니다.');
  return stub(env,data.accountId).fetch('https://account.internal/operator',{method:'POST',body:JSON.stringify({op})});
 }
 let res=await stub(env,id).fetch('https://account.internal/request',{method:'POST',body:JSON.stringify({path,method:request.method,tokenHash:th,bootstrap,data})});
 if(!match&&res.ok){res=new Response(res.body,res);res.headers.set('X-CRPG-Session','v2.'+id+'.'+secret);}
 return res;
}

// No public URL is mapped directly to this class. Only the Worker binding can reach its internal operations.
export class GameAccount {
 constructor(ctx,env){
  this.ctx=ctx;this.env=env;this.sql=ctx.storage.sql;this.tail=Promise.resolve();this.partsCache=null;
  this.sql.exec(`CREATE TABLE IF NOT EXISTS metadata(id INTEGER PRIMARY KEY CHECK(id=1),account TEXT NOT NULL,epoch TEXT NOT NULL,status TEXT NOT NULL,revision INTEGER,ranked INTEGER,last_request_id TEXT,updated_at INTEGER);
   CREATE TABLE IF NOT EXISTS parts(path TEXT PRIMARY KEY,value TEXT NOT NULL);
   CREATE TABLE IF NOT EXISTS receipts(request_id TEXT PRIMARY KEY,revision INTEGER NOT NULL,base_revision INTEGER NOT NULL,intent_hash TEXT,result TEXT NOT NULL,created_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS backups(revision INTEGER PRIMARY KEY,undo TEXT NOT NULL,created_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY,expires_at INTEGER NOT NULL,revoked INTEGER NOT NULL DEFAULT 0);
   CREATE TABLE IF NOT EXISTS action_rate(id INTEGER PRIMARY KEY,count INTEGER NOT NULL,until_at INTEGER NOT NULL);
   CREATE TABLE IF NOT EXISTS outbox(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,acked_revision INTEGER NOT NULL DEFAULT -1,last_error TEXT);`);
 }
 serial(fn){const next=this.tail.then(fn);this.tail=next.catch(()=>{});return next;}
 rows(q,...args){return this.sql.exec(q,...args).toArray();}
 meta(){return this.rows('SELECT * FROM metadata WHERE id=1')[0];}
 parts(){if(this.partsCache)return this.partsCache;this.partsCache=new Map(this.rows('SELECT path,value FROM parts').map(x=>[x.path,x.value]));return this.partsCache;}
 async initialize(account){
  const existing=this.meta();if(existing){if(JSON.parse(existing.account).id!==account.id)throw error(403,'계정 경로가 일치하지 않습니다.');if(existing.status==='IMPORTING')await this.activate(account.id,existing.epoch);return;}
  if(this.env.GAME_IMPORT_DISABLED==='1')throw error(503,'새 저장 공간으로의 이전을 잠시 중단했습니다. 기존 기록은 유지됩니다.','IMPORT_DISABLED');
  const t=now(),epoch=crypto.randomUUID(),db=this.env.DB;
  // The D1 batch is the ownership linearization point. Old Worker writes are fenced before reading the snapshot.
  const result=await db.batch([
   db.prepare("INSERT INTO game_owners(account_id,owner,epoch,updated_at) VALUES(?,'DO',?,?) ON CONFLICT(account_id) DO NOTHING").bind(account.id,epoch,t),
   db.prepare('SELECT * FROM game_owners WHERE account_id=?').bind(account.id),
   db.prepare('SELECT * FROM games WHERE account_id=?').bind(account.id),
   db.prepare('SELECT * FROM receipts WHERE account_id=?').bind(account.id)
  ]);
  const owner=result[1].results[0],game=result[2].results[0];
  if(owner.owner!=='DO')throw error(503,'이 계정은 이전 저장 경로로 복구되어 있습니다.','ACCOUNT_DRAINED');
  if(owner.activated)throw error(503,'기존 저장 공간을 복구해야 합니다. 오래된 원본으로 덮어쓰지 않습니다.','DURABLE_STATE_MISSING');
  // Parse/validate BEFORE importing. Corrupt data stays untouched in the fenced D1 original.
  const state=game?JSON.parse(game.state):null;if(state)new R(GAME_DB,structuredClone(state),true);const importedParts=state?splitState(state):new Map();
  this.ctx.storage.transactionSync(()=>{
   this.sql.exec('INSERT INTO metadata VALUES(1,?,?,?,?,?,?,?)',JSON.stringify(account),owner.epoch,'IMPORTING',game?.revision??null,game?.ranked??1,game?.last_request_id??'',game?.updated_at??t);
   for(const [path,value] of importedParts)this.sql.exec('INSERT INTO parts VALUES(?,?)',path,value);
   for(const receipt of result[3].results)this.sql.exec('INSERT OR IGNORE INTO receipts VALUES(?,?,?,?,?,?)',receipt.request_id,receipt.revision,receipt.revision-1,null,receipt.response,receipt.created_at);
  });
  await this.ctx.storage.sync();this.partsCache=importedParts;await this.activate(account.id,owner.epoch);
 }
 async activate(id,epoch){
  const result=await this.env.DB.prepare("UPDATE game_owners SET activated=1 WHERE account_id=? AND epoch=? AND owner='DO'").bind(id,epoch).run();
  if(!result.meta.changes)throw error(503,'저장 소유권을 확인하지 못했습니다.');
  this.sql.exec("UPDATE metadata SET status='ACTIVE' WHERE id=1");await this.ctx.storage.sync();
 }
 async enroll(b){
  await this.initialize(b.account);const m=this.meta();if(m.status==='DELETED')throw error(401,'삭제된 계정입니다.');
  // Never resurrect a revoked token, even if its D1 deletion was delayed or failed.
  this.sql.exec('INSERT INTO sessions(token_hash,expires_at,revoked) VALUES(?,?,0) ON CONFLICT(token_hash) DO NOTHING',b.tokenHash,b.expires);
  await this.ctx.storage.sync();
 }
 authenticate(th){const s=this.rows('SELECT * FROM sessions WHERE token_hash=?',th)[0];if(!s||s.revoked||s.expires_at<=now())throw error(401,'로그인이 만료되었습니다.');return JSON.parse(this.meta().account);}
 active(){const m=this.meta();if(!m)throw error(401,'계정에 다시 로그인해 주세요.');if(m.status==='ROLLED_BACK')throw error(503,'이 계정은 이전 저장 경로로 복구되어 있습니다.','ACCOUNT_DRAINED');if(m.status!=='ACTIVE')throw error(503,'저장 기록 복구 작업 중입니다. 잠시 뒤 다시 연결해 주세요.','STORAGE_FROZEN');return m;}
 envelope(m,result=null){return {account:accountView(JSON.parse(m.account),this.env),version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD,revision:m.revision??0,ranked:!!m.ranked,result};}
 output(m,parts,result=null){return {...this.envelope(m,result),state:m.revision===null?null:joinState(publicParts(parts))};}
 async schedule(){if(await this.ctx.storage.getAlarm()===null)await this.ctx.storage.setAlarm(now()+10000);}
 bumpRate(){const t=now(),r=this.rows('SELECT * FROM action_rate WHERE id=1')[0];if(r&&r.until_at>t&&r.count>=240)throw error(429,'시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주세요.');this.sql.exec('INSERT INTO action_rate VALUES(1,1,?) ON CONFLICT(id) DO UPDATE SET count=CASE WHEN until_at<=? THEN 1 ELSE count+1 END,until_at=CASE WHEN until_at<=? THEN excluded.until_at ELSE until_at END',t+60000,t,t);}
 async action(b,account){
  const started=performance.now(),m=this.active();let persistenceStarted=false;
  try{
   if(!/^[a-zA-Z0-9_-]{10,80}$/.test(b.requestId||''))throw error(400,'행동 식별자가 잘못되었습니다.');
   const digest=await hash(intent(b)),receipt=this.rows('SELECT * FROM receipts WHERE request_id=?',b.requestId)[0];
   if(receipt){
    if(receipt.intent_hash&&receipt.intent_hash!==digest)throw error(409,'같은 행동 식별자를 다른 행동에 사용할 수 없습니다.','REQUEST_ID_REUSED');
    return json({...this.output(m,this.parts(),JSON.parse(receipt.result).result),replayed:true,receiptRevision:receipt.revision});
   }
   if(m.revision===null)throw error(409,'먼저 여정을 시작해 주세요.');
   this.bumpRate();const before=this.parts(),warm=this.runtime?.revision===m.revision?this.runtime.r:null;
   const row={state:warm?'':JSON.stringify(joinState(before)),revision:m.revision,ranked:m.ranked,updated_at:m.updated_at};
   const {r,result,isDebug}=executeAction(b,row,account,this.env,now(),warm);compact(r.s);
   const after=splitState(r.s),delta=diffParts(before,after),next={...m,revision:m.revision+1,ranked:isDebug?0:m.ranked,last_request_id:b.requestId,updated_at:now()};
   // Fast-path size guard: current saves are far below 1.9 MiB, so avoid rebuilding/UTF-8 encoding the whole state.
   const roughChars=[...after].reduce((n,[path,value])=>n+path.length+value.length+8,2);let stateBytes;
   if(roughChars*3<=1900000)stateBytes=roughChars*3;
   else {const stateText=JSON.stringify(r.s);stateBytes=new TextEncoder().encode(stateText).length;if(stateBytes>1900000)throw error(507,'저장 크기 한도에 도달했습니다.');}
   let output;
   if(b.responseMode==='state-parts-v1'){
    // A delta-capable client asked for a patch; do not construct the ~400 KiB full public state just to discard it.
    output={...this.envelope(next,result),baseRevision:m.revision,statePatch:wirePatch(publicParts(before),publicParts(after))};
   }else output=this.output(next,after,result);
   const outputText=JSON.stringify(output),responseBytes=new TextEncoder().encode(outputText).length;
   // Alarm is durable before the outbox commit. Failure here cannot acknowledge an unscheduled projection.
   await this.schedule();const commitStart=performance.now();persistenceStarted=true;
   this.ctx.storage.transactionSync(()=>{
    for(const path of delta.remove)this.sql.exec('DELETE FROM parts WHERE path=?',path);
    for(const [path,value] of delta.set)this.sql.exec('INSERT INTO parts VALUES(?,?) ON CONFLICT(path) DO UPDATE SET value=excluded.value',path,value);
    this.sql.exec('INSERT INTO backups VALUES(?,?,?)',m.revision,JSON.stringify(delta.undo),next.updated_at);
    this.sql.exec('DELETE FROM backups WHERE revision<?',m.revision-3);
    this.sql.exec('INSERT INTO receipts VALUES(?,?,?,?,?,?)',b.requestId,next.revision,m.revision,digest,JSON.stringify({result}),next.updated_at);
    this.sql.exec('UPDATE metadata SET revision=?,ranked=?,last_request_id=?,updated_at=? WHERE id=1',next.revision,next.ranked,b.requestId,next.updated_at);
    this.sql.exec('INSERT INTO outbox(id,revision) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision',next.revision);
   });
   await this.ctx.storage.sync();
   this.partsCache=after;this.runtime={revision:next.revision,r};
   const persistMs=elapsed(commitStart),totalMs=elapsed(started),out=new Response(outputText,{headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','Server-Timing':`durable;dur=${persistMs},total;dur=${totalMs}`,'X-CRPG-State-Bytes':String(stateBytes),'X-CRPG-Response-Bytes':String(responseBytes)}});
   console.log(JSON.stringify({kind:'crpg_durable_timing',action:b.type,revision:next.revision,d1CallsOnAction:0,stateBytes,changedBytes:delta.bytes,changedParts:delta.set.length,responseBytes,persistMs,totalMs,serverBuild:SERVER_BUILD}));return out;
  }catch(e){this.runtime=null;if(!persistenceStarted)Object.assign(e,REJECTED);throw e;}
 }
 async request(b){
  if(b.bootstrap)await this.enroll(b.bootstrap);
  const account=this.authenticate(b.tokenHash);
  if(b.path==='/logout'&&b.method==='POST'){
   this.sql.exec('UPDATE sessions SET revoked=1 WHERE token_hash=?',b.tokenHash);await this.ctx.storage.sync();
   // Revocation is already authoritative locally, including any delayed legacy bootstrap.
   this.ctx.waitUntil(this.env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(b.tokenHash).run().catch(()=>{}));return json({ok:true});
  }
  if(b.path==='/account/delete'&&b.method==='POST')return this.deleteAccount(account,b.data);
  const m=this.active();
  if(b.path==='/me'&&b.method==='GET')return json(this.output(m,this.parts()));
  if(b.path==='/game/new'&&b.method==='POST'){
   if(m.revision!==null)throw error(409,'이미 자동저장된 여정이 있습니다.');
   const r=new R(GAME_DB);r.newGame({name:String(b.data.name||account.display_name),route:b.data.route==='ROUTE_TRAVELER'?'ROUTE_TRAVELER':'ROUTE_ISEKAI',saveId:crypto.randomUUID(),seed:crypto.getRandomValues(new Uint32Array(1))[0]});compact(r.s);
   await this.schedule();const parts=splitState(r.s),t=now();this.ctx.storage.transactionSync(()=>{
    for(const [p,v] of parts)this.sql.exec('INSERT INTO parts VALUES(?,?)',p,v);
    this.sql.exec("UPDATE metadata SET revision=0,ranked=1,last_request_id='NEW',updated_at=? WHERE id=1",t);this.sql.exec('INSERT INTO outbox(id,revision) VALUES(1,0)');
   });await this.ctx.storage.sync();this.partsCache=parts;this.runtime={revision:0,r};return json(this.output(this.meta(),parts));
  }
  if(b.path==='/game/action'&&b.method==='POST')return this.action(b.data,account);
  throw error(404,'지원하지 않는 요청입니다.');
 }
 async deleteAccount(account,b){
  if(b.confirm!==account.username||!same(await passwordHash(String(b.password||''),account.salt,this.env.PASSWORD_PEPPER),account.password_hash))throw error(403,'아이디와 비밀번호로 삭제를 확인해 주세요.');
  this.sql.exec("UPDATE metadata SET status='DELETING' WHERE id=1");await this.ctx.storage.sync();
  const db=this.env.DB;
  // Removing ownership and the account directory is one transaction; no old game writer can race between them.
  await db.batch([db.prepare('DELETE FROM game_owners WHERE account_id=?').bind(account.id),db.prepare('DELETE FROM accounts WHERE id=?').bind(account.id)]);
  this.ctx.storage.transactionSync(()=>{for(const table of ['parts','receipts','backups','sessions','outbox'])this.sql.exec('DELETE FROM '+table);this.sql.exec("UPDATE metadata SET status='DELETED',account=?,revision=NULL WHERE id=1",JSON.stringify({id:account.id}));});
  this.partsCache=null;this.runtime=null;await this.ctx.storage.deleteAlarm();await this.ctx.storage.sync();return json({deleted:true});
 }
 async snapshot(){const m=this.meta();if(!m||m.revision===null)return null;return {metadata:m,state:joinState(this.parts()),receipts:this.rows('SELECT * FROM receipts ORDER BY revision')};}
 async rollback(){
  let m=this.meta();if(!m)throw error(404,'이전된 기록이 없습니다.');if(m.status==='ROLLED_BACK')return json({ok:true,revision:m.revision,drained:true});if(!['ACTIVE','ROLLING_BACK'].includes(m.status))throw error(409,'현재 상태에서는 복구할 수 없습니다.');
  this.sql.exec("UPDATE metadata SET status='ROLLING_BACK' WHERE id=1");await this.ctx.storage.sync();
  const snap=await this.snapshot(),stateText=snap?JSON.stringify(snap.state):'',handoffHash=await hash(stateText),a=JSON.parse(m.account),db=this.env.DB,owner=await db.prepare('SELECT * FROM game_owners WHERE account_id=?').bind(a.id).first();
  if(!owner||owner.epoch!==m.epoch)throw error(409,'저장 소유권 확인에 실패했습니다.');
  if(owner.owner==='DO'){
   // Complete delayed logout before the legacy session directory becomes authoritative again.
   const revoked=this.rows('SELECT token_hash FROM sessions WHERE revoked=1 OR expires_at<=?',now());
   for(let i=0;i<revoked.length;i+=40)await db.batch(revoked.slice(i,i+40).map(x=>db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(x.token_hash)));
   // Stage receipts while both game writers are fenced. Batches are bounded and retryable.
   for(let i=0;i<(snap?.receipts.length||0);i+=40)await db.batch(snap.receipts.slice(i,i+40).map(x=>db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?) ON CONFLICT(account_id,request_id) DO UPDATE SET revision=excluded.revision,response=excluded.response,created_at=excluded.created_at').bind(a.id,x.request_id,x.revision,x.result,x.created_at)));
   const statements=[db.prepare("UPDATE game_owners SET owner='D1',updated_at=?,handoff_revision=?,handoff_checksum=? WHERE account_id=? AND epoch=? AND owner='DO'").bind(now(),m.revision,handoffHash,a.id,m.epoch)];
   if(snap)statements.push(db.prepare('INSERT INTO games VALUES(?,?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET state=excluded.state,revision=excluded.revision,last_request_id=excluded.last_request_id,ranked=excluded.ranked,updated_at=excluded.updated_at').bind(a.id,JSON.stringify(snap.state),m.revision,m.last_request_id,m.ranked,m.updated_at));
   await db.batch(statements);
  }
  const proof=await db.prepare('SELECT * FROM game_owners WHERE account_id=?').bind(a.id).first(),restored=await db.prepare('SELECT * FROM games WHERE account_id=?').bind(a.id).first();
  if(proof?.owner!=='D1'||proof?.epoch!==m.epoch||proof?.handoff_revision!==m.revision||proof?.handoff_checksum!==handoffHash||snap&&(!restored||restored.revision<m.revision||restored.revision===m.revision&&restored.state!==stateText))throw error(503,'복구 검증에 실패했습니다. 계정은 잠금 상태를 유지합니다.');
  this.sql.exec("UPDATE metadata SET status='ROLLED_BACK' WHERE id=1");await this.ctx.storage.deleteAlarm();await this.ctx.storage.sync();return json({ok:true,revision:m.revision,drained:true});
 }
 async alarm(){
  // Take a consistent immutable snapshot under the short local lock. D1 I/O must NOT hold the action queue.
  const snap=await this.serial(async()=>{const m=this.meta(),job=this.rows('SELECT * FROM outbox WHERE id=1')[0];if(!m||m.status!=='ACTIVE'||!job||job.revision<=job.acked_revision)return null;return {metadata:m,state:joinState(this.parts()),receipts:this.rows('SELECT * FROM receipts WHERE revision>? ORDER BY revision',job.acked_revision),ackedRevision:job.acked_revision};});
  if(!snap)return;
  try{
   const {metadata:m,state}=snap,a=JSON.parse(m.account),payload=await compress({format:1,revision:m.revision,ranked:m.ranked,lastRequestId:m.last_request_id,state}),checksum=await hash(payload),db=this.env.DB;
   const guard='EXISTS(SELECT 1 FROM game_owners WHERE account_id=? AND owner=\'DO\' AND epoch=?)';
   const statements=[db.prepare(`INSERT INTO game_checkpoints SELECT ?,?,?,?,? WHERE ${guard} ON CONFLICT(account_id) DO UPDATE SET revision=excluded.revision,state_gzip=excluded.state_gzip,checksum=excluded.checksum,updated_at=excluded.updated_at WHERE excluded.revision>=game_checkpoints.revision`).bind(a.id,m.revision,payload.buffer,checksum,now(),a.id,m.epoch)];
   const abyss=state.abyss,floor=Math.max(0,...Object.keys(abyss?.clears||{}).map(Number)),rounds=Object.values(abyss?.clears||{}).reduce((n,x)=>n+x.rounds,0);
   if(!m.ranked)statements.push(db.prepare(`DELETE FROM ranking WHERE account_id=? AND ${guard}`).bind(a.id,a.id,m.epoch));
   else if(floor)statements.push(db.prepare(`INSERT INTO ranking SELECT ?,?,?,?,?,?,? WHERE ${guard} ON CONFLICT(account_id,season) DO UPDATE SET display_name=excluded.display_name,floor=excluded.floor,rounds=excluded.rounds,attempts=excluded.attempts,achieved_at=excluded.achieved_at WHERE excluded.floor>ranking.floor OR (excluded.floor=ranking.floor AND (excluded.rounds<ranking.rounds OR (excluded.rounds=ranking.rounds AND excluded.attempts<ranking.attempts)))`).bind(a.id,abyss?.season||'ABYSS_01',a.display_name,floor,rounds,abyss?.attempts||0,m.updated_at,a.id,m.epoch));
   for(let i=0,rows=snap.receipts.filter(x=>x.revision>snap.ackedRevision);i<rows.length;i+=40)await db.batch(rows.slice(i,i+40).map(x=>db.prepare(`INSERT INTO receipts SELECT ?,?,?,?,? WHERE ${guard} ON CONFLICT(account_id,request_id) DO NOTHING`).bind(a.id,x.request_id,x.revision,x.result,x.created_at,a.id,m.epoch)));
   await db.batch(statements);
   await this.serial(async()=>{this.sql.exec('UPDATE outbox SET acked_revision=MAX(acked_revision,?),last_error=NULL WHERE id=1',m.revision);const job=this.rows('SELECT * FROM outbox WHERE id=1')[0];if(this.meta()?.status==='ACTIVE'&&job&&job.revision>job.acked_revision)await this.ctx.storage.setAlarm(now()+10000);});
  }catch(e){await this.serial(async()=>{this.sql.exec('UPDATE outbox SET last_error=? WHERE id=1','D1 projection failed');if(this.meta()?.status==='ACTIVE')await this.ctx.storage.setAlarm(now()+30000);});throw e;}
 }
 async fetch(request){
  return this.serial(async()=>{try{
   const b=await request.json(),path=new URL(request.url).pathname;
   if(path==='/enroll'){await this.enroll(b);return json({ok:true});}
   if(path==='/authorize'){if(b.bootstrap)await this.enroll(b.bootstrap);const a=this.authenticate(b.tokenHash);return json(accountView(a,this.env));}
   if(path==='/operator'){
    if(b.op==='status'){const m=this.meta();return json({status:m?.status||'UNMIGRATED',revision:m?.revision??null,outbox:this.rows('SELECT * FROM outbox WHERE id=1')[0]||null});}
    if(b.op==='export'){const snapshot=await this.snapshot();if(snapshot)delete snapshot.metadata.account;return json(snapshot);}
    if(b.op==='rollback')return await this.rollback();
   }
   if(path==='/request')return await this.request(b);
   throw error(404,'지원하지 않는 요청입니다.');
  }catch(e){const rule=e instanceof globalThis.CRPGRuntime.RuleError||e instanceof globalThis.CRPGRelationships.RelationshipError;return json({error:e.status||rule?e.message:'저장 결과를 확인하지 못했습니다. 같은 행동으로 다시 연결해 주세요.',...(e.code?{code:e.code}:{}),...(e.outcome?{outcome:e.outcome}:{})},e.status||(rule?400:500));}});
 }
}
