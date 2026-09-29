import {R,DB as GAME_DB,ENGINE_VERSION,ENGINE_FINGERPRINT} from './generated/engine.mjs';
const encoder=new TextEncoder(),now=()=>Date.now(),elapsed=t=>Math.round((performance.now()-t)*10)/10,JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'},json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:JSON_HEADERS}),jsonText=(text,status=200)=>new Response(text,{status,headers:JSON_HEADERS});
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
const bytes=x=>Uint8Array.from(x.match(/.{2}/g)||[],h=>parseInt(h,16));
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async x=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(x)));
const error=(status,message,code)=>Object.assign(new Error(message),{status,code});
const same=(a,b)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
async function passwordHash(password,salt,pepper){const key=await crypto.subtle.importKey('raw',encoder.encode(password+'\0'+pepper),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:100000},key,256));}
const admin=(env,id)=>String(env.ADMIN_ACCOUNT_IDS||'').split(',').map(x=>x.trim()).includes(id);
function publicState(state){return {...state,global:{...state.global,PRNG_STATE:1},processed:{}};}
function compact(state){state.log=state.log.slice(-240);const ids=Object.keys(state.processed||{});for(const id of ids.slice(0,-32))delete state.processed[id];return state;}
const backupStores=new WeakMap();
let hotRuntime=null;
function takeRuntime(account,row){
 const hit=hotRuntime&&hotRuntime.accountId===account.id&&hotRuntime.revision===row.revision&&hotRuntime.state===row.state;
 const runtime=hit?hotRuntime.runtime:null;hotRuntime=null;
 return runtime||new R(GAME_DB,JSON.parse(row.state),true);
}
function rememberRuntime(account,revision,state,runtime){hotRuntime={accountId:account.id,revision,state,runtime};}
function forgetRuntime(accountId){if(!accountId||hotRuntime?.accountId===accountId)hotRuntime=null;}
async function ensureBackups(db){
 if(!backupStores.has(db))backupStores.set(db,db.prepare('CREATE TABLE IF NOT EXISTS game_backups(account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,revision INTEGER NOT NULL,state TEXT NOT NULL,engine_version TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(account_id,revision))').run().catch(e=>{backupStores.delete(db);throw e;}));
 await backupStores.get(db);
}
function responseGame(row,account,env,result,parsedState){const state=parsedState||JSON.parse(row.state);return {account:{id:account.id,username:account.username,displayName:account.display_name,admin:admin(env,account.id)},version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,revision:row.revision,ranked:!!row.ranked,state:publicState(state),result:result||null};}
const UI_SCREENS=new Set(['STORY','STATUS','COMBAT_PREP','COMBAT','SYSTEM','MAIN_MENU','HUB','LOCATION','INVENTORY','PARTY','SHOP','CRAFT','QUEST','RELATIONS','DIALOGUE','BOSS_INTRO','SAVE','LOAD','SETTINGS']);
const ALLOWED=new Set(); // Filled from the checked-in UI action inventory below.

for(const type of ["ABYSS_ENTER", "ABYSS_RESET", "ABYSS_REWARD", "AFFECTION_ENTER", "ARTIFACT_ENHANCE", "BOSS_CONTINUE", "BOSS_LEAVE", "BOSS_ROUTE", "BUY", "CLAIM_QUEST", "COMBAT", "COMBAT_FORFEIT", "COMBAT_BEGIN", "COMBAT_PREPARE", "COMMISSION_ACCEPT", "COMMISSION_PUZZLE", "CRAFT", "CRAFT_STAGE", "ENHANCE", "EQUIP", "EQUIPMENT_GUIDE_ACK", "FORMATION_SET", "GEO_OCULUS_OFFER", "GEO_TRAIL_CLAIM", "JOURNEY_RESUME", "LEGEND_ENTER", "LEGEND_REGISTER", "LIFE_CANCEL", "LIFE_FINISH", "LIFE_START", "LIYUE_ARTIFACT_CHALLENGE", "LIYUE_FIELD_ANSWER", "LIYUE_FIELD_BATTLE", "LIYUE_FIELD_CONTINUE", "LIYUE_FIELD_FINISH", "LIYUE_FIELD_INSPECT", "LIYUE_INTERLUDE_ACK", "MAIN_STORY_ACCEPT", "MASTERY", "MENU", "MOND_FIRST_CONTACT", "MOND_MATERIAL_CHALLENGE", "MOVE", "NPC", "OBJECTIVE_PIN", "OBJECTIVE_CLEAR", "COMBAT_FLEE", "TUTORIAL_ACK", "OCULUS_COLLECT", "OCULUS_OFFER", "PARTY", "PARTY_REMOVE", "PARTY_REPLACE", "PARTY_SWAP", "PARTY_TACTIC", "PERSONAL", "PLACE_ENTER", "PLACE_LEAVE", "PREP_LEAVE", "PREP_SELECT", "QUEST_CHOICE", "RECOVER", "RECRUIT_REJOIN", "RELATION_ACTIVITY", "SELL", "STORY_BATTLE_CONFIRM", "STORY_CHAPTER", "STORY_CHOICE", "STORY_NAME", "STORY_NEXT", "STORY_PAUSE_FREE", "STORY_RESUME", "STORY_RETRY", "STORY_RIDE", "STORY_SCRIPTED_TRAVEL", "TOOL_PREPARE", "TRAVELER_RESONATE", "UNEQUIP", "USE_ITEM", "WAIT", "WORLD_WORK_CANCEL", "WORLD_WORK_FINISH", "WORLD_WORK_START", "ZIBAI_RETURN_CHECK"])ALLOWED.add(type);
async function body(request){const raw=await request.text();if(encoder.encode(raw).length>65536)throw error(413,'요청이 너무 큽니다.');try{return JSON.parse(raw||'{}');}catch{throw error(400,'요청 형식을 확인해 주세요.');}}
async function rate(env,key,limit,span){const t=now(),bucket=await hash(key),row=await env.DB.prepare('INSERT INTO rate_limits(bucket,count,until_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN until_at<? THEN 1 ELSE count+1 END,until_at=CASE WHEN until_at<? THEN excluded.until_at ELSE until_at END RETURNING count').bind(bucket,t+span,t,t).first();if(Number(row?.count||0)>limit)throw error(429,'시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주세요.');}
async function authHash(request){const auth=request.headers.get('authorization')||'';if(!/^Bearer [a-f0-9]{64}$/.test(auth))throw error(401,'로그인해 주세요.');return hash(auth.slice(7));}
async function sessionByHash(env,th,requestId=''){
 const receipt=requestId?',rr.response AS receipt_response':'',join=requestId?' LEFT JOIN receipts rr ON rr.account_id=a.id AND rr.request_id=?':'';
 const sql='SELECT a.id,a.username,a.display_name,a.salt,a.password_hash,a.created_at,g.account_id AS game_account_id,g.state AS game_state,g.revision AS game_revision,g.last_request_id AS game_last_request_id,g.ranked AS game_ranked,g.updated_at AS game_updated_at'+receipt+' FROM sessions s JOIN accounts a ON a.id=s.account_id LEFT JOIN games g ON g.account_id=a.id'+join+' WHERE s.token_hash=? AND s.expires_at>?';
 const x=requestId?await env.DB.prepare(sql).bind(requestId,th,now()).first():await env.DB.prepare(sql).bind(th,now()).first();if(!x)throw error(401,'로그인이 만료되었습니다.');
 const account={id:x.id,username:x.username,display_name:x.display_name,salt:x.salt,password_hash:x.password_hash,created_at:x.created_at},row=x.game_account_id?{account_id:x.game_account_id,state:x.game_state,revision:x.game_revision,last_request_id:x.game_last_request_id,ranked:x.game_ranked,updated_at:x.game_updated_at}:null;
 return {account,tokenHash:th,row,receipt:x.receipt_response?{response:x.receipt_response}:null};
}
async function session(request,env){return sessionByHash(env,await authHash(request));}
async function actionPrelude(env,th,requestId){
 const t=now(),sessionStmt=env.DB.prepare('SELECT a.id,a.username,a.display_name,a.salt,a.password_hash,a.created_at,g.account_id AS game_account_id,g.state AS game_state,g.revision AS game_revision,g.last_request_id AS game_last_request_id,g.ranked AS game_ranked,g.updated_at AS game_updated_at,rr.response AS receipt_response FROM sessions s JOIN accounts a ON a.id=s.account_id LEFT JOIN games g ON g.account_id=a.id LEFT JOIN receipts rr ON rr.account_id=a.id AND rr.request_id=? WHERE s.token_hash=? AND s.expires_at>?').bind(requestId,th,t),
  rateStmt=env.DB.prepare("INSERT INTO rate_limits(bucket,count,until_at) SELECT 'action:'||a.id,1,? FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? ON CONFLICT(bucket) DO UPDATE SET count=CASE WHEN until_at<? THEN 1 ELSE count+1 END,until_at=CASE WHEN until_at<? THEN excluded.until_at ELSE until_at END RETURNING count").bind(t+60000,th,t,t,t),
  [sessionResult,rateResult]=await env.DB.batch([sessionStmt,rateStmt]),x=sessionResult.results?.[0];
 if(!x)throw error(401,'로그인이 만료되었습니다.');if(Number(rateResult.results?.[0]?.count||0)>240)throw error(429,'시도가 너무 잦습니다. 잠시 뒤 다시 시도해 주세요.');
 const account={id:x.id,username:x.username,display_name:x.display_name,salt:x.salt,password_hash:x.password_hash,created_at:x.created_at},row=x.game_account_id?{account_id:x.game_account_id,state:x.game_state,revision:x.game_revision,last_request_id:x.game_last_request_id,ranked:x.game_ranked,updated_at:x.game_updated_at}:null;
 return {account,tokenHash:th,row,receipt:x.receipt_response?{response:x.receipt_response}:null};
}

async function loginResult(env,account){const t=token(),h=await hash(t);await env.DB.prepare('INSERT INTO sessions VALUES(?,?,?)').bind(h,account.id,now()+7*86400000).run();return {token:t,account:{id:account.id,username:account.username,displayName:account.display_name,admin:admin(env,account.id)},version:ENGINE_VERSION};}
function scoreStatement(env,account,row,requestId,abyss){const a=abyss||JSON.parse(row.state).abyss;if(!row.ranked)return env.DB.prepare('DELETE FROM ranking WHERE account_id=? AND EXISTS(SELECT 1 FROM games WHERE account_id=? AND ranked=0 AND revision=? AND last_request_id=?)').bind(account.id,account.id,row.revision,requestId);const floor=Math.max(0,...Object.keys(a?.clears||{}).map(Number)),rounds=Object.values(a?.clears||{}).reduce((n,x)=>n+x.rounds,0);if(!floor)return null;
return env.DB.prepare('INSERT INTO ranking SELECT account_id,?,?,?,?,?,? FROM games WHERE account_id=? AND ranked=1 AND revision=? AND last_request_id=? AND ?>0 ON CONFLICT(account_id,season) DO UPDATE SET display_name=excluded.display_name,floor=excluded.floor,rounds=excluded.rounds,attempts=excluded.attempts,achieved_at=excluded.achieved_at WHERE excluded.floor>ranking.floor OR (excluded.floor=ranking.floor AND (excluded.rounds<ranking.rounds OR (excluded.rounds=ranking.rounds AND excluded.attempts<ranking.attempts)))').bind(a?.season||'ABYSS_01',account.display_name,floor,rounds,a?.attempts||0,now(),account.id,row.revision,requestId,floor);}
async function route(request,env,ctx){
 const perfStart=performance.now(),receivedAt=now(),url=new URL(request.url),path=url.pathname;
 if(path==='/health')return json({ok:true,version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,configured:!!env.PASSWORD_PEPPER});
 if(path==='/ranking'&&request.method==='GET'){const q=await env.DB.prepare('SELECT display_name AS name,floor,rounds,attempts FROM ranking WHERE season=? ORDER BY floor DESC,rounds,attempts,achieved_at,account_id LIMIT 20').bind('ABYSS_01').all();return json({season:'ABYSS_01',entries:q.results.map((r,i)=>({rank:i+1,...r}))});}
 if(!env.PASSWORD_PEPPER||env.PASSWORD_PEPPER.length<32)throw error(503,'계정 서버의 운영 설정이 아직 완료되지 않았습니다.');
 if(['/register','/login'].includes(path)&&request.method==='POST'){
  const b=await body(request),username=String(b.username||'').normalize('NFKC').trim().toLowerCase(),password=String(b.password||'');
  if(!/^[a-z0-9가-힣_]{3,24}$/.test(username)||password.length<8||password.length>128)throw error(400,'아이디는 한글·영문·숫자·밑줄 3~24자, 비밀번호는 8~128자로 입력해 주세요.');
  const ip=request.headers.get('CF-Connecting-IP')||'local';await rate(env,'auth-ip:'+ip,30,600000);await rate(env,'auth-user:'+username,10,600000);
  let a=await env.DB.prepare('SELECT * FROM accounts WHERE username=?').bind(username).first();
  if(path==='/register'){
   if(a)throw error(409,'이미 사용 중인 아이디입니다.');await rate(env,'register:'+ip,5,3600000);const salt=token(),id=crypto.randomUUID(),h=await passwordHash(password,salt,env.PASSWORD_PEPPER);
   try{await env.DB.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').bind(id,username,String(b.displayName||username).trim().slice(0,24)||username,salt,h,now()).run();}catch{throw error(409,'이미 사용 중인 아이디입니다.');}
   a=await env.DB.prepare('SELECT * FROM accounts WHERE id=?').bind(id).first();
  }else {const h=await passwordHash(password,a?.salt||'0'.repeat(64),env.PASSWORD_PEPPER);if(!a||!same(h,a.password_hash))throw error(401,'아이디 또는 비밀번호를 확인해 주세요.');}
  return json(await loginResult(env,a));
 }
 let account,tokenHash,row,receipt=null,b=null,bodyMs=0,preludeMs=0,sessionMs=0,gateMs=0;
 if(path==='/game/action'&&request.method==='POST'){
  const th=await authHash(request),bodyStart=performance.now();b=await body(request);bodyMs=elapsed(bodyStart);
  if(!/^[a-zA-Z0-9_-]{10,80}$/.test(b.requestId||''))throw error(400,'행동 식별자가 잘못되었습니다.');
  const preludeStart=performance.now(),auth=await actionPrelude(env,th,b.requestId);({account,tokenHash,row,receipt}=auth);preludeMs=elapsed(preludeStart);
 }else{
  const sessionStart=performance.now(),auth=await session(request,env);({account,tokenHash,row}=auth);sessionMs=elapsed(sessionStart);
 }
 if(path==='/me'&&request.method==='GET')return json(row?responseGame(row,account,env):{account:{id:account.id,username:account.username,displayName:account.display_name,admin:admin(env,account.id)},version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,state:null,revision:0});
 if(path==='/logout'&&request.method==='POST'){await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(tokenHash).run();forgetRuntime(account.id);return json({ok:true});}
 if(path==='/account/delete'&&request.method==='POST'){await rate(env,'delete:'+account.id,5,900000);const b=await body(request);if(b.confirm!==account.username||!same(await passwordHash(String(b.password||''),account.salt,env.PASSWORD_PEPPER),account.password_hash))throw error(403,'아이디와 비밀번호로 삭제를 확인해 주세요.');await ensureBackups(env.DB);await env.DB.batch(['game_backups','receipts','ranking','games','sessions'].map(table=>env.DB.prepare('DELETE FROM '+table+' WHERE account_id=?').bind(account.id)).concat(env.DB.prepare('DELETE FROM accounts WHERE id=?').bind(account.id)));forgetRuntime(account.id);return json({deleted:true});}
 if(path==='/game/new'&&request.method==='POST'){if(row)throw error(409,'이미 자동저장된 여정이 있습니다. 이어서 진행해 주세요.');const b=await body(request),r=new R(GAME_DB);r.newGame({name:String(b.name||account.display_name),route:b.route==='ROUTE_TRAVELER'?'ROUTE_TRAVELER':'ROUTE_ISEKAI',saveId:crypto.randomUUID(),seed:crypto.getRandomValues(new Uint32Array(1))[0]});const state=JSON.stringify(compact(r.s));try{await env.DB.prepare('INSERT INTO games VALUES(?,?,0,?,1,?)').bind(account.id,state,'NEW',now()).run();}catch{throw error(409,'이미 자동저장된 여정이 있습니다.');}rememberRuntime(account,0,state,r);return json(responseGame({state,revision:0,ranked:1},account,env,null,r.s));}
 if(path==='/game/action'&&request.method==='POST'){
  if(!row)throw error(409,'먼저 여정을 시작해 주세요.');
  if(receipt){const cached=JSON.parse(receipt.response),out=json(responseGame(row,account,env,cached.result));out.headers.set('Server-Timing',`body;dur=${bodyMs},prelude;dur=${preludeMs},total;dur=${elapsed(perfStart)}`);return out;}
  let persistenceStarted=false;try{
  if(b.engineVersion?b.engineVersion!==ENGINE_FINGERPRINT:b.version!==ENGINE_VERSION)throw error(409,'게임 업데이트를 맞추고 있습니다. 저장 기록은 유지됩니다. 새 버전을 적용한 뒤 다시 시작해 주세요.','VERSION_MISMATCH');
  if(b.revision!==row.revision)throw error(409,'다른 화면에서 진행되었습니다. 최신 자동저장을 이어 받아 주세요.');
  const isDebug=b.type==='OPERATOR_DEBUG',isReading=b.type==='STORY_READ';if(!ALLOWED.has(b.type)&&!isDebug&&!isReading)throw error(400,'지원하지 않는 게임 행동입니다.');if(isDebug&&!admin(env,account.id))throw error(403,'운영자 전용 기능입니다.');
  const runtimeStart=performance.now();let r;try{r=takeRuntime(account,row);}catch{throw error(503,'저장 기록을 새 버전에서 여는 데 문제가 있습니다. 원본은 보존되어 있습니다. 운영자에게 알려 주세요.','SAVE_COMPATIBILITY');}const runtimeMs=elapsed(runtimeStart);
  r.serverAdmin=isDebug;const params={...(b.params||{})};for(const key of ['type','id','revision','__proto__','constructor','prototype'])delete params[key];
  // MENU navigation is client-local. Apply its current screen only as part of the next real transaction,
  // preserving story/place menu side effects without creating a standalone save revision.
  const uiScreen=typeof b.uiScreen==='string'&&UI_SCREENS.has(b.uiScreen)?b.uiScreen:'';
  if(b.uiActions!==undefined){
   if(!Array.isArray(b.uiActions)||b.uiActions.length>128||b.uiActions.some(screen=>!UI_SCREENS.has(screen)))throw error(400,'화면 이동 기록을 확인해 주세요.');
   for(const screen of b.uiActions){const reason=r.actionReason('MENU',{screen});if(reason)throw error(409,'현재 화면 상태를 다시 맞춰 주세요.','UI_CONTEXT');r.apply({type:'MENU',screen});}
  }
  if(uiScreen&&uiScreen!==r.s.global.SCREEN_MODE){const menuReason=r.actionReason('MENU',{screen:uiScreen});if(menuReason)throw error(409,'현재 화면 상태를 다시 맞춰 주세요.','UI_CONTEXT');r.apply({type:'MENU',screen:uiScreen});}
  const reading=b.reading??[];
  if(!Array.isArray(reading)||reading.length>64||(isReading&&!reading.length))throw error(400,'읽기 기록 형식을 확인해 주세요.');
  for(const step of reading){
   if(step?.route!==r.s.global.STORY_ROUTE_ID||step.context!==(r.s.storyContext?.entry||''))throw error(409,'이야기 문맥이 달라졌습니다. 최신 기록을 확인해 주세요.','READING_CONTEXT');
   const preview=r.previewStoryRead(step.node,step.type||'STORY_NEXT',step.params||{node:step.node});if(!preview)throw error(409,'읽기 기록을 현재 이야기에서 확인할 수 없습니다.','READING_CONTEXT');r.s=preview.state;
  }
  // Work time begins when this request reaches the Worker, including database/engine work.
  // Client timestamps never authorize elapsed time or rewards.
  r.actionStartedAt=Math.max(receivedAt,row.updated_at||0);
  const engineStart=performance.now();let result;try{result=isReading?{ok:true,type:'STORY_READ',result:{read:reading.length,node:r.storyActiveNodeId()}}:r.action(b.type,params);}finally{delete r.actionStartedAt;}const engineMs=elapsed(engineStart);
  const serializeStart=performance.now(),state=JSON.stringify(compact(r.s)),stateBytes=encoder.encode(state).length;if(stateBytes>1900000)throw error(507,'저장 크기 한도에 도달했습니다. 운영자에게 문의해 주세요.');
  const next={state,revision:row.revision+1,ranked:isDebug?0:row.ranked},output=responseGame(next,account,env,result,r.s),outputText=JSON.stringify(output),responseBytes=encoder.encode(outputText).length,receiptText=JSON.stringify({result}),serializeMs=elapsed(serializeStart);
  await ensureBackups(env.DB);
  const statements=[
   env.DB.prepare('INSERT OR IGNORE INTO game_backups SELECT account_id,revision,state,?,? FROM games WHERE account_id=? AND revision=?').bind(ENGINE_VERSION,now(),account.id,row.revision),
   env.DB.prepare('UPDATE games SET state=?,revision=?,last_request_id=?,ranked=?,updated_at=? WHERE account_id=? AND revision=?').bind(state,next.revision,b.requestId,next.ranked,now(),account.id,row.revision),
   env.DB.prepare('INSERT INTO receipts SELECT account_id,?,revision,?,? FROM games WHERE account_id=? AND revision=? AND last_request_id=?').bind(b.requestId,receiptText,now(),account.id,next.revision,b.requestId)
  ],ranking=scoreStatement(env,account,next,b.requestId,r.s.abyss);if(ranking)statements.push(ranking);
  persistenceStarted=true;const persistStart=performance.now(),batch=await env.DB.batch(statements),persistMs=elapsed(persistStart);
  if(!batch[1].meta.changes)throw error(409,'다른 화면에서 먼저 진행되었습니다. 최신 자동저장을 이어 받아 주세요.');
  // Cache only an already committed revision. It is consumed before the next mutation, so overlapping requests cannot share a mutable Runtime.
  rememberRuntime(account,next.revision,state,r);
  // Cleanup is retention-only. Running it every third revision reduces D1 work without changing committed state or retry receipts.
  if(next.revision%3===0){const cleanup=env.DB.batch([env.DB.prepare('DELETE FROM receipts WHERE account_id=? AND revision<?').bind(account.id,next.revision-4),env.DB.prepare('DELETE FROM game_backups WHERE account_id=? AND revision<?').bind(account.id,next.revision-3)]).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(cleanup);else await cleanup;}
  const totalMs=elapsed(perfStart),timing=`session;dur=${sessionMs},body;dur=${bodyMs},prelude;dur=${preludeMs},gate;dur=${gateMs},runtime;dur=${runtimeMs},engine;dur=${engineMs},serialize;dur=${serializeMs},persist;dur=${persistMs},total;dur=${totalMs}`,sql=batch.map(x=>({duration:x.meta?.duration??null,rowsRead:x.meta?.rows_read??null,rowsWritten:x.meta?.rows_written??null,servedByRegion:x.meta?.served_by_region??null,servedByColo:x.meta?.served_by_colo??null,servedByPrimary:x.meta?.served_by_primary??null})),placement=request.headers.get('cf-placement')||null;console.log(JSON.stringify({kind:'crpg_server_timing',action:b.type,revision:next.revision,sessionMs,bodyMs,preludeMs,gateMs,runtimeMs,engineMs,serializeMs,persistMs,totalMs,stateBytes,responseBytes,placement,sql}));
  const out=jsonText(outputText);out.headers.set('Server-Timing',timing);out.headers.set('X-CRPG-State-Bytes',String(stateBytes));out.headers.set('X-CRPG-Response-Bytes',String(responseBytes));return out;
  }catch(e){if(!persistenceStarted)e.outcome='REJECTED';throw e;}
 }
 throw error(404,'지원하지 않는 요청입니다.');
}
export default {async fetch(request,env,ctx){
 const origin=request.headers.get('Origin'),allowed=env.ALLOWED_ORIGIN||'https://clannad.shop';
 if(origin&&origin!==allowed)return json({error:'허용되지 않은 접속 경로입니다.'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':allowed,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Access-Control-Max-Age':'86400','Vary':'Origin'}});
 let res;try{res=await route(request,env,ctx);}catch(e){const rule=e instanceof globalThis.CRPGRuntime.RuleError||e instanceof globalThis.CRPGRelationships.RelationshipError;res=json({error:e.status||rule?e.message:'이 행동을 처리하지 못했습니다. 다른 행동을 선택하거나 잠시 뒤 다시 시도해 주세요.',...(e.code?{code:e.code}:{}),...(e.outcome?{outcome:e.outcome}:{}),...(e.code==='VERSION_MISMATCH'?{version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT}:{})},e.status||(rule?400:500));}
 res.headers.set('Access-Control-Allow-Origin',allowed);res.headers.set('Access-Control-Expose-Headers','X-Server-Time, Server-Timing, X-CRPG-State-Bytes, X-CRPG-Response-Bytes');res.headers.set('X-Server-Time',String(now()));res.headers.set('Vary','Origin');res.headers.set('X-Content-Type-Options','nosniff');return res;
}};
export {passwordHash,publicState,ALLOWED};
