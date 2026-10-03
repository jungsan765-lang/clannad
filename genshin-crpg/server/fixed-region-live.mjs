import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {mkdirSync,realpathSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
import {R,DB as GAME_DB,ENGINE_VERSION,ENGINE_FINGERPRINT,SERVER_BUILD} from './generated/engine.mjs';
import {compact,executeAction,hash,same,passwordHash,token} from './game-core.mjs';
import {splitState,joinState,diffParts,publicParts,wirePatch,intent} from './state-parts.mjs';
import {AdminConsole,installAdminSchema,banOf,banMessage,SYSTEM_ACCOUNT} from './admin-api.mjs';
import {installSocialSchema,migrateRankingSeasons,socialMethods,socialRoute} from './social-v01415.mjs';
import {installLetterSchema,letterMethods,letterRoute} from './letters-v0151.mjs';
import {installRaidSchema,raidMethods,raidRoute} from './raid-v0152.mjs';
import {installCoopSchema,coopMethods,coopRoute} from './coop-v0153.mjs';

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
// 0.14.7 social features. Chat and trade are switched on per server (CRPG_FEATURES), so the production
// database gains no new tables until they are approved there.
const CHAT_MAX=140,CHAT_KEEP=400,CHAT_CHANNELS=new Set(['world']),TRADE_PENDING=5;
const pidOf=id=>createHash('sha256').update('crpg-chat:'+id).digest('hex').slice(0,12);
const cleanText=v=>[...String(v??'')].map(ch=>{const c=ch.codePointAt(0);return c<32||c===127||(c>=0x200b&&c<=0x200f)||(c>=0x2028&&c<=0x202e)||(c>=0x2060&&c<=0x206f)||c===0xfeff?' ':ch;}).join('').replace(/\s+/g,' ').trim();
// 0.15.3: names other adventurers see follow each journey's protagonist (see syncName). Rows written earlier with the login
// id are rewritten once at start; rows that already carry the name are left alone. Tables of switched-off features are skipped.
const HERO_NAME_PATH='["global","PLAYER_NAME"]';
const NAME_COLUMNS=[['accounts','display_name','id'],['chat','author','account_id'],['market','seller_name','seller_id'],['letters','from_name','from_id'],['letters','to_name','to_id'],['raid_hits','name','account_id'],['ranking','display_name','account_id']];
export function migrateHeroNames(db){
 const rows=db.prepare('SELECT account_id,value FROM parts WHERE path=?').all(HERO_NAME_PATH);if(!rows.length)return;
 const stmts=NAME_COLUMNS.map(([table,col,key])=>{try{return db.prepare('UPDATE '+table+' SET '+col+'=? WHERE '+key+'=? AND '+col+'<>?');}catch{return null;}}).filter(Boolean);
 db.exec('BEGIN IMMEDIATE');
 try{for(const r of rows){let name='';try{name=String(JSON.parse(r.value)||'').trim().slice(0,24);}catch{}if(name)for(const s of stmts)s.run(name,r.account_id,name);}db.exec('COMMIT');}
 catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}
}
// 0.15.5: 'coop' (다인 모드, files named v0153) joins the switches; test databases have it on, production needs
// CRPG_FEATURES=chat,trade,coop.
export function defaultFeatures(dbPath,env=process.env){const raw=env.CRPG_FEATURES;if(raw!==undefined)return String(raw).split(',').map(x=>x.trim()).filter(Boolean);return /live-staging|:memory:/.test(String(dbPath))?['chat','trade','coop']:[];}
const ip=req=>String(req.headers['x-forwarded-for']||req.socket?.remoteAddress||'local').split(',')[0].trim().slice(0,96);
// 0.15.2: at most three new accounts a day from one connection (user: 「계정 무한 생성해서 돈 모으려는 버그 … 아이피별로 계정
// 생성에 제한을 걸어두던가」). The server only listens behind Caddy, which names the visitor; a loopback address without it (tests,
// the local preview) is not counted.
const REGISTER_PER_DAY=3,LOOPBACK=/^(local|seed|127\.|::1$|::ffff:127\.)/;
// 0.15.8: what a sign-up form gets wrong, in the player's words (the ID is already NFKC + lower case).
const ID_CHAR=/^[a-z0-9가-힣_]$/u;
export function signupReason(username,password){
 const bad=[...new Set([...String(username)].filter(ch=>!ID_CHAR.test(ch)))];
 if(bad.length)return '아이디에 쓸 수 없는 글자가 있습니다: '+bad.slice(0,6).map(ch=>/\s/u.test(ch)?'띄어쓰기':'「'+ch+'」').join(' ')+'. 아이디는 한글 · 영문 · 숫자 · 밑줄(_)만 쓸 수 있습니다. (비밀번호에는 특수문자를 써도 됩니다.)';
 const n=[...String(username)].length;if(n<3||n>24)return '아이디는 3~24자로 정해 주세요. (지금 '+n+'자)';
 if(String(password).length<8)return '비밀번호는 8자 이상으로 정해 주세요.';
 if(String(password).length>128)return '비밀번호는 128자까지 쓸 수 있습니다.';
 return '';
}
// 0.14.15: records count per monthly season; a save from before seasons counts in the month it is played.
function score(state){const a=state?.abyss||{},floor=Math.max(0,...Object.keys(a.clears||{}).map(Number)),rounds=Object.values(a.clears||{}).reduce((n,x)=>n+(x?.rounds||0),0),S=globalThis.CRPGRuntime?.abyssSeason,season=!a.season||a.season==='ABYSS_01'?(S?S.of(now()):'ABYSS_01'):a.season;return {season,floor,rounds,attempts:a.attempts||0};}

export class LiveRegionStore{
 constructor(path=':memory:',{pepper,adminIds='',features=[]}={}){
  if(typeof pepper!=='string'||pepper.length<32)throw new Error('PASSWORD_PEPPER must be at least 32 characters.');
  this.pepper=pepper;this.admins=new Set(String(adminIds||'').split(',').map(x=>x.trim()).filter(Boolean));this.locks=new Map();this.cache=new Map();this.rates=new Map();
  this.features=new Set(features);this.subscribers=new Set();
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
   'CREATE TABLE IF NOT EXISTS ranking(account_id TEXT NOT NULL,season TEXT NOT NULL,display_name TEXT NOT NULL,floor INTEGER NOT NULL,rounds INTEGER NOT NULL,attempts INTEGER NOT NULL,achieved_at INTEGER NOT NULL,PRIMARY KEY(account_id,season),FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT',
   // 0.15.2: new accounts per connection (only a peppered hash of the address is kept, for a week).
   'CREATE TABLE IF NOT EXISTS register_log(ip TEXT NOT NULL,at INTEGER NOT NULL) STRICT','CREATE INDEX IF NOT EXISTS register_log_idx ON register_log(ip,at)'
  ].join(';')+';';
  this.db.exec(pragmas+ddl);installAdminSchema(this.db);migrateRankingSeasons(this.db);
  if(this.features.has('chat'))this.db.exec('CREATE TABLE IF NOT EXISTS chat(id INTEGER PRIMARY KEY AUTOINCREMENT,channel TEXT NOT NULL,account_id TEXT NOT NULL,author TEXT NOT NULL,text TEXT NOT NULL,created_at INTEGER NOT NULL,deleted INTEGER NOT NULL DEFAULT 0,FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT;CREATE INDEX IF NOT EXISTS chat_channel_idx ON chat(channel,id);');
  if(this.features.has('trade'))this.db.exec("CREATE TABLE IF NOT EXISTS trades(id INTEGER PRIMARY KEY AUTOINCREMENT,from_id TEXT NOT NULL,to_id TEXT NOT NULL,give TEXT NOT NULL,want TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(from_id) REFERENCES accounts(id) ON DELETE CASCADE,FOREIGN KEY(to_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT;CREATE INDEX IF NOT EXISTS trades_to_idx ON trades(to_id,status);CREATE INDEX IF NOT EXISTS trades_from_idx ON trades(from_id,status);");
  installSocialSchema(this.db,this.features);installLetterSchema(this.db,this.features);installRaidSchema(this.db);installCoopSchema(this.db,this.features);migrateHeroNames(this.db);
  this.heartbeat=setInterval(()=>this.push(': ping\n\n'),25000);this.heartbeat.unref?.();
 }
 close(){clearInterval(this.heartbeat);for(const s of this.subscribers){try{s.res.end();}catch{}}this.subscribers.clear();this.db.close();}
 need(feature){if(!this.features.has(feature))throw err(404,'지원하지 않는 요청입니다.');}
 capabilities(){return ['state-parts-v1',...(this.features.has('chat')?['chat-v1','profile-v1']:[]),...(this.features.has('trade')?['trade-v1','market-v1','deal-v1','mail-v1']:[]),'raid-v1',...(this.features.has('coop')?['coop-v1']:[])];}
 // ---------- chat ----------
 push(text,filter){for(const s of this.subscribers){if(filter&&!filter(s))continue;try{s.res.write(text);}catch{this.subscribers.delete(s);}}}
 broadcast(event,filter){this.push('data: '+JSON.stringify(event)+'\n\n',filter);}
 subscribe(a,res){if(this.subscribers.size>=500)throw err(503,'채팅 연결이 많습니다. 잠시 뒤 다시 시도해 주세요.');const s={res,account:a.id};this.subscribers.add(s);return ()=>this.subscribers.delete(s);}
 // 0.14.15: Spiral Abyss medals and last season's frame travel with every line.
 chatView(row){const staff=this.admins.has(row.account_id)||row.account_id===SYSTEM_ACCOUNT,h=row.account_id===SYSTEM_ACCOUNT?null:this.honours(row.account_id);return {id:row.id,channel:row.channel,author:row.author,pid:pidOf(row.account_id),text:row.deleted?'':row.text,deleted:row.deleted===1,at:row.created_at,staff,medals:h?.count||0,top:h?.top||0,frame:h?.frame||0};}
 chatRecent(a,after,channel){
  this.need('chat');const ch=CHAT_CHANNELS.has(channel)?channel:'world',from=Number(after);
  const rows=Number.isSafeInteger(from)&&from>0?this.db.prepare('SELECT * FROM chat WHERE channel=? AND id>? ORDER BY id LIMIT 60').all(ch,from):this.db.prepare('SELECT * FROM (SELECT * FROM chat WHERE channel=? ORDER BY id DESC LIMIT 40) ORDER BY id').all(ch);
  return {channel:ch,messages:rows.map(r=>this.chatView(r)),max:CHAT_MAX,me:pidOf(a.id)};
 }
 chatSend(a,b){
  this.need('chat');const ch=CHAT_CHANNELS.has(b?.channel)?b.channel:'world',text=cleanText(b?.text);
  if(!text)throw err(400,'보낼 내용을 입력해 주세요.');if([...text].length>CHAT_MAX)throw err(400,'채팅은 '+CHAT_MAX+'자까지 보낼 수 있습니다.');
  try{this.rate('chat-gap:'+a.id,1,1200);this.rate('chat-burst:'+a.id,8,30000);}catch(e){throw err(429,'채팅을 조금 천천히 보내 주세요.');}
  const author=this.syncName(a)||'새 모험가';
  const t=now(),info=this.db.prepare('INSERT INTO chat(channel,account_id,author,text,created_at) VALUES(?,?,?,?,?)').run(ch,a.id,author,text,t),id=Number(info.lastInsertRowid);
  if(id%50===0)this.db.prepare('DELETE FROM chat WHERE channel=? AND id<=?').run(ch,id-CHAT_KEEP);
  const message=this.chatView({id,channel:ch,account_id:a.id,author,text,created_at:t,deleted:0});this.broadcast({type:'chat',message});return {message};
 }
 chatDelete(a,b){
  this.need('chat');if(!this.admins.has(a.id))throw err(403,'운영자 전용 기능입니다.');const id=Number(b?.id);if(!Number.isSafeInteger(id))throw err(400,'메시지를 확인해 주세요.');
  this.db.prepare('UPDATE chat SET deleted=1 WHERE id=?').run(id);this.broadcast({type:'chat-delete',id});return {deleted:true};
 }
 // ---------- trade ----------
 tradeView(t){const who=id=>{const x=this.db.prepare('SELECT display_name FROM accounts WHERE id=?').get(id);return {name:x?x.display_name:'떠난 모험가',pid:pidOf(id)};};return {id:t.id,from:who(t.from_id),to:who(t.to_id),give:JSON.parse(t.give),want:JSON.parse(t.want),status:t.status,note:t.note,at:t.created_at,updated:t.updated_at};}
 tradeList(a){this.need('trade');const q=col=>this.db.prepare('SELECT * FROM trades WHERE '+col+'=? ORDER BY CASE status WHEN \'PENDING\' THEN 0 ELSE 1 END,id DESC LIMIT 20').all(a.id).map(t=>this.tradeView(t));return {incoming:q('to_id'),outgoing:q('from_id'),limit:TRADE_PENDING};}
 runtimeOf(id){const m=this.meta(id);if(!m||m.revision==null)return null;return new R(GAME_DB,joinState(this.loadParts(id)),true);}
 tradeOffer(a,b){
  this.need('trade');this.rate('trade-offer:'+a.id,12,600000);
  // The receiver is named by login ID, or picked from the chat by the public chat id (login IDs stay private).
  let target=b?.to?this.account(uname(b.to)):null;
  if(!target&&b?.toPid&&this.features.has('chat')){const pid=String(b.toPid);for(const row of this.db.prepare('SELECT DISTINCT account_id FROM chat').all())if(pidOf(row.account_id)===pid){target=this.db.prepare('SELECT * FROM accounts WHERE id=?').get(row.account_id);break;}}
  if(!target)throw err(404,'받는 모험가를 찾을 수 없습니다. 아이디를 확인해 주세요.');if(target.id===a.id)throw err(400,'자신에게는 교환을 제안할 수 없습니다.');
  if(this.db.prepare("SELECT COUNT(*) AS n FROM trades WHERE from_id=? AND status='PENDING'").get(a.id).n>=TRADE_PENDING)throw err(409,'응답을 기다리는 제안이 '+TRADE_PENDING+'건입니다. 정리한 뒤 다시 제안해 주세요.');
  const r=this.runtimeOf(a.id);if(!r)throw err(409,'먼저 여정을 시작해 주세요.');if(!this.meta(target.id)||this.meta(target.id).revision==null)throw err(409,'상대가 아직 여정을 시작하지 않았습니다.');
  let give,want;try{give=r.tradeNormalize(b.give||[]);want=r.tradeNormalize(b.want||[]);}catch(e){throw err(400,e.message);}
  if(!give.length&&!want.length)throw err(400,'주거나 받을 아이템을 고르세요.');
  const why=r.tradeCheck(give);if(why)throw err(400,why);
  for(const w of want){if(w.slot)throw err(400,'상대의 장비는 이름으로 요청할 수 없습니다.');const rule=r.tradeRule(w.item);if(!rule.ok)throw err(400,rule.reason);}
  const shown=give.map(x=>x.slot?{slot:x.slot,label:r.tradeLabel([x])}:{item:x.item,qty:x.qty,label:r.tradeLabel([x])}),asked=want.map(x=>({item:x.item,qty:x.qty,label:r.tradeLabel([x])})),t=now(),note=cleanText(b.note).slice(0,60);
  const id=Number(this.db.prepare("INSERT INTO trades(from_id,to_id,give,want,status,note,created_at,updated_at) VALUES(?,?,?,?,'PENDING',?,?,?)").run(a.id,target.id,JSON.stringify(shown),JSON.stringify(asked),note,t,t).lastInsertRowid);
  const trade=this.tradeView(this.db.prepare('SELECT * FROM trades WHERE id=?').get(id));this.broadcast({type:'trade',id,status:'PENDING'},s=>s.account===target.id);return {trade};
 }
 async tradeRespond(a,b,decision){
  this.need('trade');const id=Number(b?.id),t=Number.isSafeInteger(id)&&this.db.prepare('SELECT * FROM trades WHERE id=?').get(id);if(!t)throw err(404,'교환 제안을 찾을 수 없습니다.');
  if(t.status!=='PENDING')throw err(409,'이미 처리된 제안입니다.');
  const mark=(status,note=t.note)=>{this.db.prepare('UPDATE trades SET status=?,note=?,updated_at=? WHERE id=?').run(status,note,now(),t.id);this.broadcast({type:'trade',id:t.id,status},s=>s.account===t.from_id||s.account===t.to_id);return {trade:this.tradeView(this.db.prepare('SELECT * FROM trades WHERE id=?').get(t.id))};};
  if(decision==='cancel'){if(t.from_id!==a.id)throw err(403,'보낸 사람만 취소할 수 있습니다.');return mark('CANCELLED');}
  if(t.to_id!==a.id)throw err(403,'받은 사람만 응답할 수 있습니다.');
  if(decision==='decline')return mark('DECLINED');
  const [first,second]=[t.from_id,t.to_id].sort();
  return this.serial(first,()=>this.serial(second,()=>this.applyTrade(t,mark)));
 }
 applyTrade(t,mark){
  const giver=this.runtimeOf(t.from_id),taker=this.runtimeOf(t.to_id);if(!giver||!taker)throw err(409,'여정 기록을 찾을 수 없습니다.');
  for(const [r,who]of [[giver,'보낸 모험가'],[taker,'받는 모험가']])if((r.playPhase?.()||'FREE')!=='FREE'||r.s.runtime)throw err(409,who+'가 이야기나 전투를 진행 중입니다. 자유행동 중일 때 다시 수락해 주세요.');
  const give=JSON.parse(t.give).map(x=>x.slot?{slot:x.slot}:{item:x.item,qty:x.qty}),want=JSON.parse(t.want).map(x=>({item:x.item,qty:x.qty}));
  let sent,returned;try{sent=giver.tradeTake(give);returned=want.length?taker.tradeTake(want):[];}catch(e){mark('FAILED',cleanText(e.message).slice(0,60));throw err(409,'교환할 수 없습니다. '+e.message,'TRADE_FAILED');}
  taker.tradeGive(sent);giver.tradeGive(returned);compact(giver.s);compact(taker.s);
  const t2=now(),write=(id,r)=>{const m=this.meta(id),before=this.loadParts(id),after=splitState(r.s),d=diffParts(before,after),del=this.db.prepare('DELETE FROM parts WHERE account_id=? AND path=?'),up=this.db.prepare('INSERT INTO parts VALUES(?,?,?) ON CONFLICT(account_id,path) DO UPDATE SET value=excluded.value');
   for(const p of d.remove)del.run(id,p);for(const [p,v] of d.set)up.run(id,p,v);
   this.db.prepare('INSERT INTO backups VALUES(?,?,?,?)').run(id,m.revision,JSON.stringify(d.undo),t2);this.db.prepare('DELETE FROM backups WHERE account_id=? AND revision<?').run(id,m.revision-3);
   this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(id,'trade-'+t.id,m.revision+1,m.revision,'trade',JSON.stringify({result:{type:'TRADE',trade:t.id}}),t2);
   this.db.prepare('UPDATE metadata SET revision=?,last_request_id=?,updated_at=? WHERE account_id=?').run(m.revision+1,'trade-'+t.id,t2,id);};
  this.db.exec('BEGIN IMMEDIATE');
  try{const still=this.db.prepare('SELECT status FROM trades WHERE id=?').get(t.id);if(still?.status!=='PENDING')throw err(409,'이미 처리된 제안입니다.');write(t.from_id,giver);write(t.to_id,taker);this.db.prepare("UPDATE trades SET status='ACCEPTED',updated_at=? WHERE id=?").run(t2,t.id);this.db.exec('COMMIT');}
  catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');throw e;}
  finally{this.invalidate(t.from_id);this.invalidate(t.to_id);}
  this.broadcast({type:'trade',id:t.id,status:'ACCEPTED',sync:true},s=>s.account===t.from_id||s.account===t.to_id);
  return {trade:this.tradeView(this.db.prepare('SELECT * FROM trades WHERE id=?').get(t.id)),received:taker.tradeLabel(sent),given:taker.tradeLabel(returned)};
 }
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
  const username=uname(b.username),password=String(b.password||'');this.rate('auth-ip:'+addr,30,600000);
  // 0.15.8: say exactly what is wrong (a tester's ID with 「!」 「@」 「♡」 got one sentence about both fields and gave up),
  // and only a well-formed request uses one of the connection's five sign-up tries an hour.
  const why=signupReason(username,password);if(why)throw err(400,why,'SIGNUP_FORM');
  this.rate('auth-user:'+username,10,600000);this.rate('register:'+addr,5,3600000);
  if(!/^[a-z0-9가-힣_]{3,24}$/.test(username)||password.length<8||password.length>128)throw err(400,'아이디는 한글·영문·숫자·밑줄 3~24자, 비밀번호는 8~128자로 입력해 주세요.');
  if(this.account(username))throw err(409,'이미 사용 중인 아이디입니다.');
  const ipKey=LOOPBACK.test(String(addr))?null:createHash('sha256').update('crpg-register:'+this.pepper+':'+addr).digest('hex').slice(0,32);
  if(ipKey&&this.db.prepare('SELECT COUNT(*) AS n FROM register_log WHERE ip=? AND at>?').get(ipKey,now()-86400000).n>=REGISTER_PER_DAY)throw err(429,'이 연결에서는 하루에 계정을 '+REGISTER_PER_DAY+'개까지 만들 수 있습니다. 내일 다시 시도해 주세요.','REGISTER_LIMIT');
  const id=crypto.randomUUID(),salt=token(),ph=await passwordHash(password,salt,this.pepper),display=String(b.displayName||username).trim().slice(0,24)||username;
  try{this.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(id,username,display,salt,ph,now());}catch{throw err(409,'이미 사용 중인 아이디입니다.');}
  if(ipKey){this.db.prepare('INSERT INTO register_log VALUES(?,?)').run(ipKey,now());this.db.prepare('DELETE FROM register_log WHERE at<?').run(now()-7*86400000);}
  return this.issue(this.account(username));
 }
 async login(b,addr){
  const username=uname(b.username),password=String(b.password||'');this.rate('auth-ip:'+addr,30,600000);this.rate('auth-user:'+username,10,600000);
  const a=this.account(username),ph=await passwordHash(password,a?.salt||'0'.repeat(64),this.pepper);if(!a||a.id===SYSTEM_ACCOUNT||!same(ph,a.password_hash))throw err(401,'아이디 또는 비밀번호를 확인해 주세요.');
  const ban=banOf(this.db,a.id);if(ban)throw err(403,banMessage(ban),'ACCOUNT_BANNED');return this.issue(a);
 }
 async issue(a){const secret=token(),th=await hash(secret);this.db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(th,a.id,now()+SESSION_MS);return {token:secret,account:view(a,this.admins),version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT};}
 async auth(raw){if(!/^[a-f0-9]{64}$/.test(raw||''))throw err(401,'로그인해 주세요.');const th=await hash(raw),a=this.db.prepare('SELECT a.* FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>?').get(th,now());if(!a)throw err(401,'로그인이 만료되었습니다.');const ban=banOf(this.db,a.id);if(ban)throw err(401,banMessage(ban),'ACCOUNT_BANNED');this.syncName(a);return {a,th};}
 // 0.15.3: other adventurers see the name chosen for the journey, never the login id (user: 「채팅은 플레이어 아이디 말고
 // 이름으로 나오게 해줘」). The account's display name follows the protagonist's name, so chat, profiles, letters, trades,
 // the market and the rankings show it. An account without a journey yet has no public name.
 heroName(id){const row=this.db.prepare('SELECT value FROM parts WHERE account_id=? AND path=?').get(id,'["global","PLAYER_NAME"]');try{return row?String(JSON.parse(row.value)||'').trim().slice(0,24):'';}catch{return '';}}
 syncName(a){const name=this.heroName(a.id);if(name&&name!==a.display_name){this.db.prepare('UPDATE accounts SET display_name=? WHERE id=?').run(name,a.id);a.display_name=name;}return name;}
 me(a){const m=this.meta(a.id),e=m&&this.cached(a.id,m.revision),parts=e?.parts||(m?this.loadParts(a.id):new Map());
  // 0.15.4: build the journey's runtime while the player is still on the title screen, so the first action is quick.
  if(m&&m.revision!=null&&!e){try{this.touch(a.id,{revision:m.revision,parts,r:new R(GAME_DB,joinState(parts),true)});}catch{}}
  return this.output(a,m,parts);}
 logout(th){this.db.prepare('DELETE FROM sessions WHERE token_hash=?').run(th);return {ok:true};}
 async remove(a,b){this.rate('delete:'+a.id,5,900000);if(b.confirm!==a.username||!same(await passwordHash(String(b.password||''),a.salt,this.pepper),a.password_hash))throw err(403,'아이디와 비밀번호로 삭제를 확인해 주세요.');this.db.prepare('DELETE FROM accounts WHERE id=?').run(a.id);this.invalidate(a.id);return {deleted:true};}
 async newGame(a,b){
  return this.serial(a.id,async()=>{const old=this.meta(a.id);if(old?.revision!=null)throw err(409,'이미 자동저장된 여정이 있습니다.');
   const r=new R(GAME_DB);r.newGame({name:String(b.name||a.display_name),route:b.route==='ROUTE_TRAVELER'?'ROUTE_TRAVELER':'ROUTE_ISEKAI',saveId:crypto.randomUUID(),seed:crypto.getRandomValues(new Uint32Array(1))[0]});compact(r.s);const parts=splitState(r.s),t=now();
   this.db.exec('BEGIN IMMEDIATE');try{this.db.prepare('INSERT INTO metadata VALUES(?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET revision=excluded.revision,ranked=excluded.ranked,last_request_id=excluded.last_request_id,updated_at=excluded.updated_at').run(a.id,0,1,'NEW',t);this.db.prepare('DELETE FROM parts WHERE account_id=?').run(a.id);const ins=this.db.prepare('INSERT INTO parts VALUES(?,?,?)');for(const [p,v] of parts)ins.run(a.id,p,v);this.db.exec('COMMIT');}catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');throw e;}
   this.syncName(a);const m=this.meta(a.id);this.touch(a.id,{revision:0,parts,r});return this.output(a,m,parts);
  });
 }
 rank(a,ranked,state){if(!ranked){this.db.prepare('DELETE FROM ranking WHERE account_id=?').run(a.id);return;}const x=score(state);if(!x.floor)return;this.db.prepare('INSERT INTO ranking VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id,season) DO UPDATE SET display_name=excluded.display_name,floor=excluded.floor,rounds=excluded.rounds,attempts=excluded.attempts,achieved_at=excluded.achieved_at WHERE excluded.floor>ranking.floor OR (excluded.floor=ranking.floor AND (excluded.rounds<ranking.rounds OR (excluded.rounds=ranking.rounds AND excluded.attempts<ranking.attempts)))').run(a.id,x.season,a.display_name,x.floor,x.rounds,x.attempts,now());this.dropHonours(a.id);}
 async action(a,b){
  if(!RID.test(b?.requestId||''))throw err(400,'행동 식별자가 잘못되었습니다.');this.rate('action:'+a.id,240,60000);const digest=await hash(intent(b));
  return this.serial(a.id,async()=>{const started=performance.now();let persistence=false,refused=null;this.db.exec('BEGIN IMMEDIATE');
   try{const m=this.meta(a.id);if(!m||m.revision==null)throw err(409,'먼저 여정을 시작해 주세요.');const receipt=this.db.prepare('SELECT * FROM receipts WHERE account_id=? AND request_id=?').get(a.id,b.requestId),entry=this.cached(a.id,m.revision),before=entry?.parts||this.loadParts(a.id);
    if(receipt){if(receipt.intent_hash!==digest)throw err(409,'같은 행동 식별자를 다른 행동에 사용할 수 없습니다.','REQUEST_ID_REUSED');this.db.exec('COMMIT');return {payload:{...this.output(a,m,before,JSON.parse(receipt.result).result),replayed:true,receiptRevision:receipt.revision},timing:{totalMs:Math.round((performance.now()-started)*10)/10,persistMs:0}};}
    // 0.15.4: the cached runtime works on a copy of its state, so a refused action puts the copy back instead of throwing
    // the cache away (building a runtime from the save costs about a quarter of a second; user: 「장비 장착할때 렉이」).
    const warm=entry?.r||null,pristine=warm?warm.s:null;if(warm){warm.s=structuredClone(pristine);refused={warm,pristine};}
    const row={state:warm?'':JSON.stringify(joinState(before)),revision:m.revision,ranked:m.ranked,updated_at:m.updated_at},env={ADMIN_ACCOUNT_IDS:[...this.admins].join(','),RAID_EVENT:this.raidActive?.()||null};
    const {r,result,isDebug,runtimeMs,engineMs}=executeAction(b,row,a,env,now(),warm,this.coopContextFor?.(a.id)||null);compact(r.s);const after=splitState(r.s),rough=[...after].reduce((n,[p,v])=>n+p.length+v.length+8,2);let stateBytes=rough*3;if(stateBytes>1900000){stateBytes=Buffer.byteLength(JSON.stringify(r.s));if(stateBytes>1900000)throw err(507,'저장 크기 한도에 도달했습니다.');}
    const d=diffParts(before,after),next={...m,revision:m.revision+1,ranked:isDebug?0:m.ranked,last_request_id:b.requestId,updated_at:now()},payload=b.responseMode==='state-parts-v1'?{...this.envelope(a,next,result),baseRevision:m.revision,statePatch:wirePatch(publicParts(before),publicParts(after))}:this.output(a,next,after,result);
    persistence=true;const ps=performance.now(),del=this.db.prepare('DELETE FROM parts WHERE account_id=? AND path=?'),up=this.db.prepare('INSERT INTO parts VALUES(?,?,?) ON CONFLICT(account_id,path) DO UPDATE SET value=excluded.value');
    for(const p of d.remove)del.run(a.id,p);for(const [p,v] of d.set)up.run(a.id,p,v);this.db.prepare('INSERT INTO backups VALUES(?,?,?,?)').run(a.id,m.revision,JSON.stringify(d.undo),next.updated_at);this.db.prepare('DELETE FROM backups WHERE account_id=? AND revision<?').run(a.id,m.revision-3);this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(a.id,b.requestId,next.revision,m.revision,digest,JSON.stringify({result}),next.updated_at);this.db.prepare('UPDATE metadata SET revision=?,ranked=?,last_request_id=?,updated_at=? WHERE account_id=?').run(next.revision,next.ranked,b.requestId,next.updated_at,a.id);this.rank(a,next.ranked,r.s);const raided=this.raidRecord?.(a,r,next),shared=this.coopRecord?.(a,r,before.get('["runtime"]')==='{}');this.db.exec('COMMIT');this.touch(a.id,{revision:next.revision,parts:after,r});if(raided)this.broadcast({type:'raid',event:raided.event,hits:raided.hits},()=>true);try{this.coopAfter?.(a,r,shared);}catch{}
    return {payload,timing:{runtimeMs,engineMs,persistMs:Math.round((performance.now()-ps)*10)/10,totalMs:Math.round((performance.now()-started)*10)/10,stateBytes,responseBytes:Buffer.byteLength(JSON.stringify(payload))}};
   }catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');if(!persistence&&refused&&this.cache.get(a.id)?.r===refused.warm)refused.warm.s=refused.pristine;else this.invalidate(a.id);if(!persistence)e.outcome='REJECTED';throw e;}
  });
 }
 // 0.14.15: the current monthly season, with last season alongside.
 ranking(){const S=globalThis.CRPGRuntime?.abyssSeason,cur=this.seasonNow(),prev=S?.previous(cur),top=season=>this.db.prepare('SELECT display_name AS name,floor,rounds,attempts FROM ranking WHERE season=? ORDER BY floor DESC,rounds,attempts,achieved_at,account_id LIMIT 20').all(season).map((r,i)=>({rank:i+1,...r}));return {season:cur,label:S?.label(cur)||cur,endsAt:S?.end(cur)||null,entries:top(cur),previous:prev?{season:prev,label:S.label(prev),entries:top(prev)}:null};}
}

Object.assign(LiveRegionStore.prototype,socialMethods,letterMethods,raidMethods,coopMethods);

export function createLiveRegionHandler({store,allowedOrigin='https://clannad.shop',adminConsole=null}){
 return async(req,res)=>{const origin=req.headers.origin||'',host=req.headers.host||'',sameOrigin=!!origin&&!!host&&(origin===`https://${host}`||origin===`http://${host}`);if(origin&&origin!==allowedOrigin&&!sameOrigin)return send(res,403,{error:'허용되지 않은 접속 경로입니다.'},{vary:'Origin'});const c=cors(origin,sameOrigin?origin:allowedOrigin);
  if(req.method==='OPTIONS'){res.writeHead(204,{...c,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'Content-Type,Authorization','access-control-max-age':'86400'});return res.end();}
  const path=new URL(req.url,'http://fixed-region-live.local').pathname;
  try{
   if(path==='/health'&&req.method==='GET')return send(res,200,{ok:true,version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD,transportBuild:TRANSPORT_BUILD,storage:'sqlite-node-accounts',configured:true,synthetic:false,staging:true,capabilities:store.capabilities()},c);
   if(path==='/ranking'&&req.method==='GET')return send(res,200,store.ranking(),c);
   if((path==='/register'||path==='/login')&&req.method==='POST'){const b=await body(req),out=path==='/register'?await store.register(b,ip(req)):await store.login(b,ip(req));return send(res,200,out,c);}
   // 0.14.12 operator console: its own login (server/admin-api.mjs), never a game session.
   if(path.startsWith('/admin/')){if(!adminConsole)throw err(404,'지원하지 않는 요청입니다.');return send(res,200,await adminConsole.handle({path,method:req.method,url:new URL(req.url,'http://fixed-region-live.local'),authorization:req.headers.authorization,readBody:()=>body(req),ip:ip(req)}),c);}
   const raw=(req.headers.authorization||'').replace(/^Bearer /,''),auth=await store.auth(raw),a=auth.a;
   if(path==='/me'&&req.method==='GET')return send(res,200,store.me(a),c);
   if(path==='/logout'&&req.method==='POST')return send(res,200,store.logout(auth.th),c);
   if(path==='/account/delete'&&req.method==='POST')return send(res,200,await store.remove(a,await body(req)),c);
   if(path==='/game/new'&&req.method==='POST')return send(res,200,await store.newGame(a,await body(req)),c);
   if(path==='/game/action'&&req.method==='POST'){const out=await store.action(a,await body(req));return send(res,200,out.payload,timing(out.timing||{},c));}
   if(path==='/chat/recent'&&req.method==='GET'){const q=new URL(req.url,'http://fixed-region-live.local').searchParams;return send(res,200,store.chatRecent(a,q.get('after'),q.get('channel')||'world'),c);}
   if(path==='/chat/send'&&req.method==='POST')return send(res,200,store.chatSend(a,await body(req)),c);
   if(path==='/chat/delete'&&req.method==='POST')return send(res,200,store.chatDelete(a,await body(req)),c);
   if(path==='/chat/stream'&&req.method==='GET'){
    // Server-sent events over an authorised fetch: new chat lines for everyone, trade news only for its two players.
    if(!store.features.has('chat')&&!store.features.has('trade')&&!store.features.has('coop'))throw err(404,'지원하지 않는 요청입니다.');
    const leave=store.subscribe(a,res);res.writeHead(200,{...c,'content-type':'text/event-stream; charset=utf-8','cache-control':'no-store','x-accel-buffering':'no'});res.write(': connected\n\n');req.on('close',leave);return;
   }
   if(path==='/trade/list'&&req.method==='GET')return send(res,200,store.tradeList(a),c);
   if(path==='/trade/offer'&&req.method==='POST')return send(res,200,store.tradeOffer(a,await body(req)),c);
   if(['/trade/accept','/trade/decline','/trade/cancel'].includes(path)&&req.method==='POST')return send(res,200,await store.tradeRespond(a,await body(req),path.slice(7)),c);
   // 0.14.15 profiles, the market and live trades (server/social-v01415.mjs).
   const social=await socialRoute(store,a,path,req,new URL(req.url,'http://fixed-region-live.local'),body);if(social!==undefined)return send(res,200,social,c);
   // 0.15.1 letters between adventurers (server/letters-v0151.mjs).
   const letters=await letterRoute(store,a,path,req,new URL(req.url,'http://fixed-region-live.local'),body);if(letters!==undefined)return send(res,200,letters,c);
   // 0.15.2 공동 토벌전 (server/raid-v0152.mjs).
   const raid=await raidRoute(store,a,path,req,new URL(req.url,'http://fixed-region-live.local'),body);if(raid!==undefined)return send(res,200,raid,c);
   // 0.15.3 다인 모드 (server/coop-v0153.mjs).
   const coop=await coopRoute(store,a,path,req,new URL(req.url,'http://fixed-region-live.local'),body);if(coop!==undefined)return send(res,200,coop,c);
   return send(res,404,{error:'지원하지 않는 요청입니다.'},c);
  }catch(e){const rule=!!(globalThis.CRPGRuntime?.RuleError&&e instanceof globalThis.CRPGRuntime.RuleError)||!!(globalThis.CRPGRelationships?.RelationshipError&&e instanceof globalThis.CRPGRelationships.RelationshipError);return send(res,e.status||(rule?400:500),{error:e.status||rule?e.message:'이 행동을 처리하지 못했습니다. 다른 행동을 선택하거나 잠시 뒤 다시 시도해 주세요.',...(e.code?{code:e.code}:{}),...(e.outcome?{outcome:e.outcome}:{}),...(e.code==='VERSION_MISMATCH'?{version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD}:{})},c);}
 };
}
export async function startLiveRegionStaging({dbPath=':memory:',pepper,adminIds='',allowedOrigin='https://clannad.shop',host='127.0.0.1',port=0,features=defaultFeatures(dbPath),adminConsoleId='',adminConsoleHash=''}={}){
 const store=new LiveRegionStore(dbPath,{pepper,adminIds,features}),adminConsole=new AdminConsole(store,{id:adminConsoleId,secret:adminConsoleHash,pepper}),server=createServer(createLiveRegionHandler({store,allowedOrigin,adminConsole}));await new Promise((ok,bad)=>{server.once('error',bad);server.listen(port,host,ok);});
 return {store,adminConsole,server,address:server.address(),close:async()=>{for(const s of store.subscribers){try{s.res.end();}catch{}}server.closeIdleConnections?.();await new Promise((ok,bad)=>server.close(e=>e?bad(e):ok()));store.close();}};
}
// Started directly (compare real paths: the servers run it through a current symlink).
const startedDirectly=()=>{try{return !!process.argv[1]&&realpathSync(fileURLToPath(import.meta.url))===realpathSync(resolve(process.argv[1]));}catch{return false;}};
if(startedDirectly()){const dbPath=process.env.CRPG_SQLITE_PATH||'./data/fixed-region-live.sqlite3',started=await startLiveRegionStaging({dbPath,pepper:process.env.PASSWORD_PEPPER,adminIds:process.env.ADMIN_ACCOUNT_IDS||'',allowedOrigin:process.env.ALLOWED_ORIGIN||'https://clannad.shop',host:process.env.HOST||'127.0.0.1',port:Number(process.env.PORT||8789),adminConsoleId:process.env.ADMIN_CONSOLE_ID||'',adminConsoleHash:process.env.ADMIN_CONSOLE_HASH||''});console.log(JSON.stringify({kind:'crpg_fixed_region_live_started',port:started.address.port,transportBuild:TRANSPORT_BUILD,features:[...started.store.features],adminConsole:started.adminConsole.configured()}));}
