// 0.14.12 운영자 도구 API for the Seoul server (server/fixed-region-live.mjs).
// - Its own login, separate from game accounts: ADMIN_CONSOLE_ID and ADMIN_CONSOLE_HASH come from the server's
//   environment file (written by server/admin-console-setup.mjs on the server). The repository is public, so the
//   password never appears in it; the hash is salted and mixed with the server's PASSWORD_PEPPER.
// - Locks: five wrong passwords from one address block it for 15 minutes; ten wrong passwords in 15 minutes from
//   anywhere lock the console for 30 minutes (restarting the service clears the lock). A console login expires after
//   30 idle minutes and after 8 hours in any case, and lives only in the server's memory.
// - Every change is written to an audit log (admin_audit), and save changes keep the usual backups, so the last three
//   changes of a journey can be rolled back.
import {R,DB as GAME_DB,ENGINE_VERSION,ENGINE_FINGERPRINT,SERVER_BUILD} from './generated/engine.mjs';
import {compact,passwordHash,token,hash,same} from './game-core.mjs';
import {splitState,joinState,diffParts} from './state-parts.mjs';
import {MARKET} from './social-v01415.mjs';

const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const now=()=>Date.now();
const IDLE_MS=30*60000,MAX_MS=8*3600000,IP_TRIES=5,IP_WINDOW=15*60000,LOCK_TRIES=10,LOCK_WINDOW=15*60000,LOCK_MS=30*60000,MAX_SESSIONS=5;
export const SYSTEM_ACCOUNT='00000000-0000-0000-0000-000000000000',SYSTEM_USERNAME='#system';
const CONFIRM_BULK='전체 지급';
const BULK_OPS=new Set(['currency','item']);
const uname=v=>String(v||'').normalize('NFKC').trim().toLowerCase();
const clean=v=>[...String(v??'')].map(ch=>{const c=ch.codePointAt(0);return c<32||c===127||(c>=0x200b&&c<=0x200f)||(c>=0x2028&&c<=0x202e)||(c>=0x2060&&c<=0x206f)||c===0xfeff?' ':ch;}).join('').replace(/\s+/g,' ').trim();
const minutes=ms=>Math.max(1,Math.ceil(ms/60000));

export function installAdminSchema(db){
 db.exec([
  'CREATE TABLE IF NOT EXISTS admin_audit(id INTEGER PRIMARY KEY AUTOINCREMENT,actor TEXT NOT NULL,ip TEXT NOT NULL,target_id TEXT,target_name TEXT,op TEXT NOT NULL,detail TEXT NOT NULL,created_at INTEGER NOT NULL) STRICT',
  'CREATE INDEX IF NOT EXISTS admin_audit_target_idx ON admin_audit(target_id,id)',
  'CREATE TABLE IF NOT EXISTS account_flags(account_id TEXT PRIMARY KEY,banned INTEGER NOT NULL DEFAULT 0,reason TEXT NOT NULL DEFAULT \'\',until INTEGER,updated_at INTEGER NOT NULL,FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT'
 ].join(';')+';');
}
// A ban that has not run out, or null.
export function banOf(db,id){const f=db.prepare('SELECT banned,reason,until FROM account_flags WHERE account_id=?').get(id);if(!f||!f.banned)return null;if(f.until&&f.until<=now())return null;return f;}
export function banMessage(f){return '이용이 제한된 계정입니다.'+(f.reason?' 사유: '+f.reason:'')+(f.until?' (해제 예정: '+new Date(f.until).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+')':'');}

export class AdminConsole{
 constructor(store,{id='',secret='',pepper=''}={}){
  this.store=store;this.db=store.db;this.id=String(id||'').trim();this.secret=String(secret||'').trim();this.pepper=pepper;
  this.sessions=new Map();this.ipFails=new Map();this.fails=[];this.lockedUntil=0;this.catalogCache=null;
  installAdminSchema(this.db);
 }
 configured(){return /^[A-Za-z0-9_.-]{3,32}$/.test(this.id)&&/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(this.secret);}
 audit(actor,ip,target,op,detail={}){this.db.prepare('INSERT INTO admin_audit(actor,ip,target_id,target_name,op,detail,created_at) VALUES(?,?,?,?,?,?,?)').run(actor,ip,target?.id||null,target?.username||null,op,JSON.stringify(detail),now());}
 // ---------- login, lock and expiry ----------
 async login(b,ip){
  if(!this.configured())throw err(503,'운영자 도구가 아직 설정되지 않았습니다. 서버에서 설정 명령(admin-console-setup)을 먼저 실행해 주세요.','ADMIN_NOT_CONFIGURED');
  const t=now();
  if(this.lockedUntil>t)throw err(423,'비밀번호가 여러 번 틀려 운영자 도구가 잠겼습니다. '+minutes(this.lockedUntil-t)+'분 뒤 다시 시도하거나 서버를 다시 시작해 주세요.','ADMIN_LOCKED');
  const mine=(this.ipFails.get(ip)||[]).filter(x=>x>t-IP_WINDOW);
  if(mine.length>=IP_TRIES)throw err(429,'이 접속 주소에서 비밀번호를 여러 번 틀렸습니다. '+minutes(mine[0]+IP_WINDOW-t)+'분 뒤 다시 시도해 주세요.','ADMIN_THROTTLED');
  const [salt,want]=this.secret.split('.'),got=await passwordHash(String(b?.password||''),salt,this.pepper),okId=uname(b?.id)===uname(this.id);
  if(!okId||!same(got,want)){
   mine.push(t);this.ipFails.set(ip,mine);this.fails=this.fails.filter(x=>x>t-LOCK_WINDOW);this.fails.push(t);
   if(this.fails.length>=LOCK_TRIES){this.lockedUntil=t+LOCK_MS;this.fails=[];}
   this.audit(String(b?.id||'').slice(0,40)||'-',ip,null,'login-fail',{});
   throw err(401,'아이디 또는 비밀번호가 맞지 않습니다.'+(IP_TRIES-mine.length>0?' (이 주소에서 '+(IP_TRIES-mine.length)+'번 더 틀리면 15분 동안 막힙니다)':''),'ADMIN_LOGIN');
  }
  this.ipFails.delete(ip);
  const secret=token(),th=await hash(secret);this.sessions.set(th,{created:t,seen:t,ip});
  while(this.sessions.size>MAX_SESSIONS)this.sessions.delete(this.sessions.keys().next().value);
  this.audit(this.id,ip,null,'login',{});
  return {token:secret,admin:this.id,idleMinutes:IDLE_MS/60000,maxHours:MAX_MS/3600000,server:this.serverInfo()};
 }
 async session(header){
  const raw=String(header||'').replace(/^Admin /,'');if(!/^[a-f0-9]{64}$/.test(raw))throw err(401,'운영자 로그인이 필요합니다.','ADMIN_AUTH');
  const th=await hash(raw),s=this.sessions.get(th),t=now();
  if(!s||s.seen+IDLE_MS<t||s.created+MAX_MS<t){this.sessions.delete(th);throw err(401,'운영자 로그인이 만료되었습니다. 다시 로그인해 주세요.','ADMIN_AUTH');}
  s.seen=t;return {th,s};
 }
 serverInfo(){return {version:ENGINE_VERSION,engineVersion:ENGINE_FINGERPRINT,serverBuild:SERVER_BUILD,features:[...this.store.features]};}
 // ---------- reads ----------
 accountRow(id){const a=this.db.prepare('SELECT * FROM accounts WHERE id=?').get(String(id||''));if(!a||a.id===SYSTEM_ACCOUNT)throw err(404,'계정을 찾을 수 없습니다.');return a;}
 part(id,path){const row=this.db.prepare('SELECT value FROM parts WHERE account_id=? AND path=?').get(id,JSON.stringify(path));if(!row)return null;try{return JSON.parse(row.value);}catch{return null;}}
 overview(){
  const t=now(),q=(sql,...p)=>this.db.prepare(sql).get(...p).n;
  const pages=this.db.prepare('PRAGMA page_count').get(),size=this.db.prepare('PRAGMA page_size').get();
  return {server:this.serverInfo(),accounts:q('SELECT COUNT(*) AS n FROM accounts WHERE id<>?',SYSTEM_ACCOUNT),journeys:q('SELECT COUNT(*) AS n FROM metadata WHERE revision IS NOT NULL'),
   activeDay:q('SELECT COUNT(*) AS n FROM metadata WHERE updated_at>?',t-86400000),activeWeek:q('SELECT COUNT(*) AS n FROM metadata WHERE updated_at>?',t-7*86400000),
   sessions:q('SELECT COUNT(*) AS n FROM sessions WHERE expires_at>?',t),banned:q('SELECT COUNT(*) AS n FROM account_flags WHERE banned=1 AND (until IS NULL OR until>?)',t),
   unranked:q('SELECT COUNT(*) AS n FROM metadata WHERE ranked=0'),dbBytes:(Object.values(pages)[0]||0)*(Object.values(size)[0]||0),consoleSessions:this.sessions.size,lockedUntil:this.lockedUntil||null};
 }
 catalog(){
  if(this.catalogCache)return this.catalogCache;
  // Read from a fresh journey's tables, so rows that the runtime adds on top of the data sheets are listed too.
  const r=new R(GAME_DB);r.newGame({name:'운영 목록',route:'ROUTE_TRAVELER',saveId:'ADMIN-CATALOG',seed:1});
  const rows=n=>[...(r.tables[n]?.values()||[])].filter(x=>x&&x[0]&&!/_SAMPLE$/.test(x[0]));
  this.catalogCache={
   currencies:{...(globalThis.CRPGRuntime?.adminV01412?.currencies||{})},
   items:rows('14_ITEM_DB').filter(x=>!String(x[0]).startsWith('CUR_')).map(x=>({id:x[0],name:x[1]||x[0],kind:x[2]||'',grade:x[3]||''})),
   equipment:rows('16_EQUIP_DB').map(x=>({id:x[0],name:x[1]||x[0],type:x[2]||'',grade:x[13]||''})),
   maps:rows('32_MAP_DB').map(x=>({id:x[0],region:x[1]||'',name:x[2]||x[0]})),
   characters:[{id:'PLAYER_CUSTOM',name:'주인공',region:''},...r.adminCompanions().map(id=>({id,name:r.tables['07_CHAR_DB'].get(id)[1],region:r.tables['07_CHAR_DB'].get(id)[2]||''}))],
   flags:rows('23_FLAG_DB').map(x=>({id:x[0],name:x[1]||''}))
  };
  return this.catalogCache;
 }
 accounts(q,page){
  const term=clean(q).slice(0,40),like='%'+term.replace(/[%_]/g,'')+'%',off=Math.max(0,Math.min(1000,Number(page)||0))*50;
  const rows=this.db.prepare(`SELECT a.id,a.username,a.display_name,a.created_at,m.revision,m.ranked,m.updated_at,f.banned,f.reason,f.until,
   (SELECT MAX(expires_at) FROM sessions s WHERE s.account_id=a.id) AS last_session FROM accounts a LEFT JOIN metadata m ON m.account_id=a.id LEFT JOIN account_flags f ON f.account_id=a.id
   WHERE a.id<>? AND (?='' OR a.username LIKE ? OR a.display_name LIKE ? OR a.id=?) ORDER BY COALESCE(m.updated_at,a.created_at) DESC LIMIT 51 OFFSET ?`).all(SYSTEM_ACCOUNT,term,like,like,term,off);
  const t=now();
  return {page:off/50,more:rows.length>50,accounts:rows.slice(0,50).map(x=>({id:x.id,username:x.username,displayName:x.display_name,createdAt:x.created_at,lastActive:x.updated_at||null,
   lastLogin:x.last_session?x.last_session-7*86400000:null,journey:x.revision!=null,ranked:x.ranked!==0,banned:!!x.banned&&(!x.until||x.until>t),
   level:x.revision!=null?this.part(x.id,['global','PLAYER_LEVEL_STATE']):null,name:x.revision!=null?this.part(x.id,['global','PLAYER_NAME']):null,
   map:x.revision!=null?this.mapName(this.part(x.id,['global','CURRENT_MAP_ID'])):null}))};
 }
 mapName(id){return this.catalog().maps.find(m=>m.id===id)?.name||id||null;}
 account(id){
  const a=this.accountRow(id),m=this.store.meta(a.id),t=now(),f=this.db.prepare('SELECT * FROM account_flags WHERE account_id=?').get(a.id);
  let summary=null,summaryError=null;
  if(m?.revision!=null){try{summary=new R(GAME_DB,joinState(this.store.loadParts(a.id)),true).adminSummary();}catch(e){summaryError=e.message;}}
  const receipts=m?this.db.prepare('SELECT request_id,revision,result,created_at FROM receipts WHERE account_id=? ORDER BY revision DESC LIMIT 30').all(a.id).map(x=>{let type='';try{const r=JSON.parse(x.result).result;type=r?.type||r?.result?.type||'';}catch{}return {id:x.request_id,revision:x.revision,type,at:x.created_at};}):[];
  const backups=m?this.db.prepare('SELECT revision,created_at FROM backups WHERE account_id=? ORDER BY revision DESC').all(a.id):[];
  return {account:{id:a.id,username:a.username,displayName:a.display_name,createdAt:a.created_at,gameAdmin:this.store.admins.has(a.id)},
   flags:f?{banned:!!f.banned&&(!f.until||f.until>t),reason:f.reason,until:f.until}:{banned:false,reason:'',until:null},
   sessions:{active:this.db.prepare('SELECT COUNT(*) AS n FROM sessions WHERE account_id=? AND expires_at>?').get(a.id,t).n},
   journey:m?.revision!=null?{revision:m.revision,ranked:m.ranked!==0,updatedAt:m.updated_at}:null,summary,summaryError,receipts,backups,
   audit:this.db.prepare('SELECT * FROM admin_audit WHERE target_id=? ORDER BY id DESC LIMIT 40').all(a.id).map(x=>({...x,detail:JSON.parse(x.detail)}))};
 }
 auditList(target,page){const off=Math.max(0,Number(page)||0)*100,rows=target?this.db.prepare('SELECT * FROM admin_audit WHERE target_id=? ORDER BY id DESC LIMIT 100 OFFSET ?').all(String(target),off):this.db.prepare('SELECT * FROM admin_audit ORDER BY id DESC LIMIT 100 OFFSET ?').all(off);return {entries:rows.map(x=>({...x,detail:JSON.parse(x.detail)}))};}
 chat(){
  if(!this.store.features.has('chat'))return {enabled:false,messages:[]};
  const rows=this.db.prepare('SELECT c.*,a.username FROM chat c LEFT JOIN accounts a ON a.id=c.account_id ORDER BY c.id DESC LIMIT 100').all();
  return {enabled:true,messages:rows.map(x=>({id:x.id,channel:x.channel,accountId:x.account_id,username:x.account_id===SYSTEM_ACCOUNT?null:x.username,author:x.author,text:x.text,deleted:x.deleted===1,at:x.created_at}))};
 }
 // 0.15.1: the market (listings, sales, fees) and finished live trades are listed too, next to the old exchange log.
 trades(){
  if(!this.store.features.has('trade'))return {enabled:false,trades:[],market:[],deals:[],letters:[]};
  const name=id=>this.db.prepare('SELECT username,display_name FROM accounts WHERE id=?').get(id),who=(id,fallback)=>{const x=id?name(id):null;return x?x.display_name+' (@'+x.username+')':fallback;};
  const table=t=>!!this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(t);
  const trades=table('trades')?this.db.prepare('SELECT * FROM trades ORDER BY id DESC LIMIT 60').all().map(t=>({id:t.id,from:who(t.from_id,'떠난 모험가'),to:who(t.to_id,'떠난 모험가'),give:JSON.parse(t.give).map(x=>x.label).join(', '),want:JSON.parse(t.want).map(x=>x.label).join(', '),status:t.status,note:t.note,at:t.created_at,updated:t.updated_at})):[];
  const market=table('market')?this.db.prepare('SELECT * FROM market ORDER BY updated_at DESC,id DESC LIMIT 80').all().map(x=>({id:x.id,seller:who(x.seller_id,x.seller_name+' (떠난 모험가)'),buyer:x.buyer_id?who(x.buyer_id,'떠난 모험가'):'',label:x.label,price:x.price,fee:Math.max(1,Math.ceil(x.price*MARKET.fee)),status:x.status,at:x.created_at,updated:x.updated_at})):[];
  const deals=table('deal_log')?this.db.prepare('SELECT * FROM deal_log ORDER BY at DESC LIMIT 60').all().map(d=>({id:d.id,a:who(d.a_id,d.a_name+' (떠난 모험가)'),b:who(d.b_id,d.b_name+' (떠난 모험가)'),aGave:d.a_gave,bGave:d.b_gave,at:d.at})):[];
  const letters=table('letters')?this.db.prepare('SELECT * FROM letters ORDER BY id DESC LIMIT 80').all().map(x=>({id:x.id,from:who(x.from_id,x.from_name+' (떠난 모험가)'),to:who(x.to_id,x.to_name+' (떠난 모험가)'),title:x.title,body:x.body,label:x.label,mora:x.mora,fee:x.fee,status:x.status,note:x.note,at:x.created_at,updated:x.updated_at})):[];
  return {enabled:true,trades,market,deals,letters};
 }
 // ---------- save changes ----------
 // Load, change through the game's own rules, check that the result opens again, then commit as one revision with
 // a backup and a receipt, exactly like a player's action.
 async editSave(a,fn,label,reason='change'){
  return this.store.serial(a.id,async()=>{
   const m=this.store.meta(a.id);if(!m||m.revision==null)throw err(409,'이 계정은 아직 여정을 시작하지 않았습니다.');
   const before=this.store.loadParts(a.id);let r;try{r=new R(GAME_DB,joinState(before),true);}catch(e){throw err(409,'저장 기록을 열지 못했습니다: '+e.message);}
   const out=fn(r);compact(r.s);
   try{new R(GAME_DB,JSON.parse(JSON.stringify(r.s)),true);}catch(e){throw err(400,'바꾼 뒤의 저장이 검사를 통과하지 못해 적용하지 않았습니다: '+e.message);}
   const after=splitState(r.s);return this.commit(a,m,before,after,label,out,r.s,reason);
  });
 }
 commit(a,m,before,after,label,out,state,reason='change',extra=null){
  const d=diffParts(before,after),t=now(),rid='admin-'+t+'-'+token().slice(0,8),db=this.db;
  db.exec('BEGIN IMMEDIATE');
  try{
   const del=db.prepare('DELETE FROM parts WHERE account_id=? AND path=?'),up=db.prepare('INSERT INTO parts VALUES(?,?,?) ON CONFLICT(account_id,path) DO UPDATE SET value=excluded.value');
   for(const p of d.remove)del.run(a.id,p);for(const [p,v] of d.set)up.run(a.id,p,v);
   extra?.(db);
   db.prepare('INSERT INTO backups VALUES(?,?,?,?)').run(a.id,m.revision,JSON.stringify(d.undo),t);db.prepare('DELETE FROM backups WHERE account_id=? AND revision<?').run(a.id,m.revision-3);
   db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(a.id,rid,m.revision+1,m.revision,'admin',JSON.stringify({result:{type:'ADMIN',label}}),t);
   db.prepare('UPDATE metadata SET revision=?,last_request_id=?,updated_at=? WHERE account_id=?').run(m.revision+1,rid,t,a.id);
   this.store.rank(a,m.ranked,state);db.exec('COMMIT');
  }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}
  finally{this.store.invalidate(a.id);}
  this.notify(a.id,reason);
  return {revision:m.revision+1,...out};
 }
 // Tell an open game of that player to fetch its journey again (a change, a gift, a reset, or a logout that ends its
 // session). Without the chat stream the game finds out at its next action, which the revision check turns into a sync.
 notify(id,reason='change'){this.store.broadcast({type:'admin',sync:true,reason},s=>s.account===id);}
 // 0.15.1: grants go to the player's mailbox as one gift mail, every other change sends one notice mail
 // (runtime_mail_v0151.js).
 applyOps(r,ops,mail={}){
  if(!Array.isArray(ops)||!ops.length||ops.length>40)throw err(400,'작업을 1~40개 골라 주세요.');
  const lines=[];for(const op of ops){try{lines.push(r.adminApply(op));}catch(e){throw err(400,(e.message||'적용하지 못했습니다.'),'ADMIN_OP');}}
  const sent=r.adminMailFlush?.({title:clean(mail.title).slice(0,60),body:String(mail.body||'').slice(0,600)})||[];
  return {changes:lines,mail:sent};
 }
 async save(b,actor,ip){const a=this.accountRow(b?.id),ops=b?.ops;const out=await this.editSave(a,r=>this.applyOps(r,ops,{title:b?.mailTitle,body:b?.mailBody}),'운영자 변경');this.audit(actor,ip,a,'save',{ops,changes:out.changes});return out;}
 // A rollback puts the journey back, so the market has to follow (user report: 되돌리기가 시장 판매 등록을 함께 되돌리지
 // 않음). Newest step first: a listing made in a reverted step is taken off the market (its goods are back in the bag),
 // a listing taken down is put back up, collected sale money goes back into the wallet, and a purchase is undone when the
 // seller has not taken the money yet. A sold listing or a live trade involves another player and stops the rollback.
 marketUndo(id,receipts){
  const lines=[],ops=[],status=new Map(),wallet=new Map(),has=this.store.features.has('trade');
  const row=lid=>has?this.db.prepare('SELECT * FROM market WHERE id=?').get(lid):null;
  const money=n=>Number(n||0).toLocaleString('ko-KR');
  for(const rc of receipts){
   let res;try{res=JSON.parse(rc.result)?.result;}catch{continue;}const t=res?.type;if(!t||!/^(MARKET_|DEAL$)/.test(t))continue;
   if(t==='DEAL')throw err(409,'되돌릴 단계 안에 직접 거래(저장 '+rc.revision+')가 있습니다. 상대 모험가의 저장도 함께 바뀌어 되돌릴 수 없으니 그보다 적은 단계로 되돌려 주세요.');
   if(!has)throw err(409,'시장 기록이 있는 단계는 거래 기능이 꺼진 서버에서 되돌릴 수 없습니다.');
   if(t==='MARKET_COLLECT'){const n=Number(res.mora)||0;if(n>0){ops.push(db=>db.prepare('INSERT INTO market_wallet VALUES(?,?,0,?) ON CONFLICT(account_id) DO UPDATE SET mora=market_wallet.mora+excluded.mora,updated_at=excluded.updated_at').run(id,n,now()));lines.push('받았던 판매 대금 '+money(n)+' 모라를 다시 받을 수 있게 돌려놓음');}continue;}
   const lid=Number(res.listing),x=row(lid);if(!x)throw err(409,'시장 기록(물건 '+lid+')을 찾을 수 없어 되돌릴 수 없습니다.');
   const cur=status.get(lid)??x.status;
   if(t==='MARKET_CANCEL'){
    if(cur!=='CANCELLED')throw err(409,'시장에서 내렸던 「'+x.label+'」의 상태가 바뀌어 되돌릴 수 없습니다.');
    status.set(lid,'ACTIVE');ops.push(db=>db.prepare("UPDATE market SET status='ACTIVE',updated_at=? WHERE id=?").run(now(),lid));lines.push('내렸던 「'+x.label+'」을(를) 다시 시장에 올림');
   }else if(t==='MARKET_SELL'){
    if(cur==='SOLD')throw err(409,'되돌릴 단계 안에 올린 「'+x.label+'」이(가) 이미 팔렸습니다. 산 모험가가 있으므로 그 단계는 되돌릴 수 없습니다.');
    if(cur!=='ACTIVE')throw err(409,'시장에 올린 「'+x.label+'」의 상태가 바뀌어 되돌릴 수 없습니다.');
    status.set(lid,'GONE');ops.push(db=>db.prepare('DELETE FROM market WHERE id=?').run(lid));lines.push('시장에 올린 「'+x.label+'」 등록을 지움(물건은 가방으로 돌아감)');
   }else if(t==='MARKET_BUY'){
    if(cur!=='SOLD'||x.buyer_id!==id)throw err(409,'산 「'+x.label+'」의 시장 기록이 바뀌어 되돌릴 수 없습니다.');
    const gain=x.price-Math.max(1,Math.ceil(x.price*MARKET.fee)),left=wallet.get(x.seller_id)??(this.db.prepare('SELECT mora FROM market_wallet WHERE account_id=?').get(x.seller_id)?.mora||0);
    if(left<gain)throw err(409,'되돌릴 단계 안의 구매(「'+x.label+'」)는 판매자가 이미 대금을 받아 가서 되돌릴 수 없습니다.');
    wallet.set(x.seller_id,left-gain);status.set(lid,'ACTIVE');
    ops.push(db=>{db.prepare("UPDATE market SET status='ACTIVE',buyer_id=NULL,updated_at=? WHERE id=?").run(now(),lid);db.prepare('UPDATE market_wallet SET mora=mora-?,sales=MAX(0,sales-1),updated_at=? WHERE account_id=?').run(gain,now(),x.seller_id);});
    lines.push('산 「'+x.label+'」을(를) 시장에 되돌리고 판매자 대금에서 '+money(gain)+' 모라를 뺌');
   }
  }
  return {lines,changed:ops.length>0,apply:db=>{for(const f of ops)f(db);}};
 }
 async rollback(b,actor,ip){
  // Every save keeps the undo of its last four changes (player actions and operator changes alike).
  const a=this.accountRow(b?.id),steps=Number(b?.steps||1);if(!Number.isInteger(steps)||steps<1||steps>4)throw err(400,'1~4단계까지 되돌릴 수 있습니다.');
  const out=await this.store.serial(a.id,async()=>{
   const m=this.store.meta(a.id);if(!m||m.revision==null)throw err(409,'이 계정은 아직 여정을 시작하지 않았습니다.');
   const before=this.store.loadParts(a.id);let state=new Map(before);
   for(let k=1;k<=steps;k++){const row=this.db.prepare('SELECT undo FROM backups WHERE account_id=? AND revision=?').get(a.id,m.revision-k);if(!row)throw err(404,'되돌릴 기록이 '+(k-1)+'단계까지만 남아 있습니다.');const undo=JSON.parse(row.undo);for(const [p,v] of undo.set)state.set(p,v);for(const p of undo.remove)state.delete(p);}
   let r;try{r=new R(GAME_DB,joinState(state),true);}catch(e){throw err(400,'되돌린 저장이 검사를 통과하지 못했습니다: '+e.message);}
   const receipts=this.db.prepare('SELECT revision,result FROM receipts WHERE account_id=? AND revision>? AND revision<=? ORDER BY revision DESC').all(a.id,m.revision-steps,m.revision);
   // Letters sent or taken in those steps follow too (server/letters-v0151.mjs).
   const market=this.marketUndo(a.id,receipts),letters=this.store.letterUndo?.(a.id,receipts)||{lines:[],changed:false,notify:[],apply:()=>{}},raid=this.store.raidUndo?.(a.id,receipts)||{lines:[],apply:()=>{}},lines=[...market.lines,...letters.lines,...raid.lines];
   const changes=[steps+'단계 전(저장 '+(m.revision-steps)+') 상태로 되돌림',...lines];
   r.mailAdd?.({kind:'NOTICE',title:'운영자가 여정을 되돌렸습니다',body:'운영자가 이 여정을 '+steps+'단계 전 상태로 되돌렸습니다.'+(lines.length?'\n'+lines.map(x=>'· '+x).join('\n'):'')});
   const out=this.commit(a,m,before,splitState(r.s),'운영자 되돌리기',{changes},r.s,'rollback',db=>{market.apply(db);letters.apply(db);raid.apply(db);});
   if(market.changed)this.store.broadcast({type:'market',status:'CHANGED'},()=>true);
   for(const id of letters.notify)this.store.broadcast({type:'mail',status:'CHANGED'},s=>s.account===id);
   return out;
  });
  this.audit(actor,ip,a,'rollback',{steps});return out;
 }
 // ---------- accounts ----------
 async password(b,actor,ip){
  const a=this.accountRow(b?.id),given=b?.password!==undefined&&b?.password!==null&&b?.password!=='';
  const pw=given?String(b.password):Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>'abcdefghjkmnpqrstuvwxyz23456789'[x%31]).join('');
  if(pw.length<8||pw.length>128)throw err(400,'비밀번호는 8~128자로 정해 주세요.');
  const salt=token(),ph=await passwordHash(pw,salt,this.store.pepper);
  this.db.prepare('UPDATE accounts SET salt=?,password_hash=? WHERE id=?').run(salt,ph,a.id);const n=this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(a.id).changes;this.notify(a.id,'logout');
  this.audit(actor,ip,a,'password',{generated:!given,loggedOut:n});return {password:given?null:pw,loggedOut:n};
 }
 logoutAccount(b,actor,ip){const a=this.accountRow(b?.id),n=this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(a.id).changes;this.notify(a.id,'logout');this.audit(actor,ip,a,'logout',{sessions:n});return {loggedOut:n};}
 ban(b,actor,ip){
  const a=this.accountRow(b?.id),banned=b?.banned===true,reason=clean(b?.reason).slice(0,120),hours=Number(b?.hours||0);
  if(banned&&(!Number.isFinite(hours)||hours<0||hours>24*3650))throw err(400,'정지 기간을 확인해 주세요.');
  const until=banned&&hours>0?now()+Math.round(hours*3600000):null;
  this.db.prepare('INSERT INTO account_flags(account_id,banned,reason,until,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(account_id) DO UPDATE SET banned=excluded.banned,reason=excluded.reason,until=excluded.until,updated_at=excluded.updated_at').run(a.id,banned?1:0,banned?reason:'',until,now());
  const n=banned?this.db.prepare('DELETE FROM sessions WHERE account_id=?').run(a.id).changes:0;if(banned)this.notify(a.id,'logout');
  this.audit(actor,ip,a,banned?'ban':'unban',{reason,hours,loggedOut:n});return {banned,until,loggedOut:n};
 }
 profile(b,actor,ip){
  const a=this.accountRow(b?.id),detail={};
  if(b?.displayName!==undefined){const v=clean(b.displayName).slice(0,24);if(!v)throw err(400,'표시 이름을 입력해 주세요.');this.db.prepare('UPDATE accounts SET display_name=? WHERE id=?').run(v,a.id);this.db.prepare('UPDATE ranking SET display_name=? WHERE account_id=?').run(v,a.id);detail.displayName=[a.display_name,v];}
  if(b?.username!==undefined){const v=uname(b.username);if(!/^[a-z0-9가-힣_]{3,24}$/.test(v))throw err(400,'아이디는 한글·영문·숫자·밑줄 3~24자로 입력해 주세요.');const other=this.db.prepare('SELECT id FROM accounts WHERE username=?').get(v);if(other&&other.id!==a.id)throw err(409,'이미 사용 중인 아이디입니다.');this.db.prepare('UPDATE accounts SET username=? WHERE id=?').run(v,a.id);detail.username=[a.username,v];}
  if(!Object.keys(detail).length)throw err(400,'바꿀 내용을 입력해 주세요.');this.notify(a.id,'profile');this.audit(actor,ip,a,'profile',detail);return {changed:detail};
 }
 async ranked(b,actor,ip){
  const a=this.accountRow(b?.id),ranked=b?.ranked===true;
  await this.store.serial(a.id,()=>{
   const m=this.store.meta(a.id);if(!m||m.revision==null)throw err(409,'이 계정은 아직 여정을 시작하지 않았습니다.');
   this.db.prepare('UPDATE metadata SET ranked=? WHERE account_id=?').run(ranked?1:0,a.id);
   if(ranked){try{this.store.rank(a,1,joinState(this.store.loadParts(a.id)));}catch{}}else this.db.prepare('DELETE FROM ranking WHERE account_id=?').run(a.id);
   this.store.invalidate(a.id);
  });
  this.notify(a.id,'profile');this.audit(actor,ip,a,ranked?'rank-on':'rank-off',{});return {ranked};
 }
 // Both need the account's own login ID typed again. A reset journey cannot be rolled back (its backups go with it).
 async resetJourney(b,actor,ip){const a=this.accountRow(b?.id);if(b?.confirm!==a.username)throw err(400,'확인을 위해 이 계정의 아이디를 정확히 입력해 주세요.');await this.store.serial(a.id,()=>{this.db.prepare('DELETE FROM metadata WHERE account_id=?').run(a.id);this.db.prepare('DELETE FROM ranking WHERE account_id=?').run(a.id);this.store.invalidate(a.id);});this.notify(a.id,'reset');this.audit(actor,ip,a,'reset-journey',{});return {reset:true};}
 async deleteAccount(b,actor,ip){const a=this.accountRow(b?.id);if(b?.confirm!==a.username)throw err(400,'확인을 위해 이 계정의 아이디를 정확히 입력해 주세요.');this.audit(actor,ip,a,'delete-account',{displayName:a.display_name});await this.store.serial(a.id,()=>{this.db.prepare('DELETE FROM accounts WHERE id=?').run(a.id);this.store.invalidate(a.id);});this.notify(a.id,'logout');return {deleted:true};}
 async bulk(b,actor,ip){
  if(b?.confirm!==CONFIRM_BULK)throw err(400,'전체 지급을 하려면 확인 칸에 「'+CONFIRM_BULK+'」이라고 입력해 주세요.');
  const ops=b?.ops;if(!Array.isArray(ops)||!ops.length||ops.length>10||ops.some(op=>!BULK_OPS.has(op?.op)||(op.op==='currency'&&(op.mode==='set'||!(op.value>0)))||(op.op==='item'&&!(op.count>0))))throw err(400,'전체 지급은 재화·아이템을 더하는 것만 할 수 있습니다.');
  const days=Number(b?.days||0),since=days>0?now()-days*86400000:0;
  const ids=this.db.prepare('SELECT m.account_id AS id FROM metadata m JOIN accounts a ON a.id=m.account_id WHERE m.revision IS NOT NULL AND m.updated_at>=? AND a.id<>?').all(since,SYSTEM_ACCOUNT).map(x=>x.id);
  let done=0;const failed=[];
  const mail={title:b?.mailTitle,body:b?.mailBody};
  for(const id of ids){const a=this.accountRow(id);try{await this.editSave(a,r=>this.applyOps(r,ops,mail),'운영자 전체 지급','gift');done++;}catch(e){failed.push({username:a.username,error:e.message});}}
  this.audit(actor,ip,null,'bulk',{ops,days,targets:ids.length,done,failed:failed.length});return {targets:ids.length,done,failed};
 }
 notice(b,actor,ip){
  this.store.need('chat');const text=clean(b?.text).slice(0,140);if(!text)throw err(400,'공지 내용을 입력해 주세요.');
  // Chat lines belong to an account, so notices use a fixed system account whose ID ('#system') no player can register
  // and which can never log in.
  if(!this.db.prepare('SELECT id FROM accounts WHERE id=?').get(SYSTEM_ACCOUNT))this.db.prepare('INSERT INTO accounts VALUES(?,?,?,?,?,?)').run(SYSTEM_ACCOUNT,SYSTEM_USERNAME,'운영자',token(),token(),now());
  const t=now(),id=Number(this.db.prepare('INSERT INTO chat(channel,account_id,author,text,created_at) VALUES(?,?,?,?,?)').run('world',SYSTEM_ACCOUNT,'운영자 공지',text,t).lastInsertRowid);
  const message=this.store.chatView({id,channel:'world',account_id:SYSTEM_ACCOUNT,author:'운영자 공지',text,created_at:t,deleted:0});this.store.broadcast({type:'chat',message});
  this.audit(actor,ip,null,'notice',{text});return {message};
 }
 chatDelete(b,actor,ip){this.store.need('chat');const id=Number(b?.id);if(!Number.isSafeInteger(id))throw err(400,'메시지를 확인해 주세요.');this.db.prepare('UPDATE chat SET deleted=1 WHERE id=?').run(id);this.store.broadcast({type:'chat-delete',id});this.audit(actor,ip,null,'chat-delete',{id});return {deleted:true};}
 // ---------- routes ----------
 async handle({path,method,url,authorization,readBody,ip}){
  if(path==='/admin/login'&&method==='POST')return this.login(await readBody(),ip);
  const {th}=await this.session(authorization),actor=this.id,q=url.searchParams;
  this.store.rate('admin:'+th.slice(0,16),900,60000);
  if(method==='GET'){
   if(path==='/admin/session')return {admin:this.id,server:this.serverInfo()};
   if(path==='/admin/overview')return this.overview();
   if(path==='/admin/catalog')return this.catalog();
   if(path==='/admin/accounts')return this.accounts(q.get('q'),q.get('page'));
   if(path==='/admin/account')return this.account(q.get('id'));
   if(path==='/admin/audit')return this.auditList(q.get('target'),q.get('page'));
   if(path==='/admin/chat')return this.chat();
   if(path==='/admin/trades')return this.trades();
  }
  if(method==='POST'){
   if(path==='/admin/logout'){this.sessions.delete(th);this.audit(actor,ip,null,'logout-console',{});return {ok:true};}
   const b=await readBody();
   if(path==='/admin/save')return this.save(b,actor,ip);
   if(path==='/admin/rollback')return this.rollback(b,actor,ip);
   if(path==='/admin/password')return this.password(b,actor,ip);
   if(path==='/admin/logout-account')return this.logoutAccount(b,actor,ip);
   if(path==='/admin/ban')return this.ban(b,actor,ip);
   if(path==='/admin/profile')return this.profile(b,actor,ip);
   if(path==='/admin/ranked')return this.ranked(b,actor,ip);
   if(path==='/admin/reset-journey')return this.resetJourney(b,actor,ip);
   if(path==='/admin/delete-account')return this.deleteAccount(b,actor,ip);
   if(path==='/admin/bulk')return this.bulk(b,actor,ip);
   if(path==='/admin/notice')return this.notice(b,actor,ip);
   if(path==='/admin/chat-delete')return this.chatDelete(b,actor,ip);
  }
  throw err(404,'지원하지 않는 운영자 요청입니다.');
 }
}
