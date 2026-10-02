// 0.14.15 social layer on the Seoul account server: Spiral Abyss season records (medals and the chat frame),
// public adventurer profiles, the market (shops with a fee) and live trades between two online adventurers.
// Each part follows the server's feature switches: profiles need 'chat'; the market and live trades need 'trade'.
// Saves change only here, server side, on the accounts' own state, in one transaction per change.
import {createHash} from 'node:crypto';
import {splitState,diffParts} from './state-parts.mjs';
import {compact} from './game-core.mjs';

const now=()=>Date.now();
const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
export const pidOf=id=>createHash('sha256').update('crpg-chat:'+id).digest('hex').slice(0,12);
const season=()=>globalThis.CRPGRuntime?.abyssSeason;
// Market rules (user: 「상점을 열어서 판매하는 서비스, 수수료까지」).
export const MARKET={fee:0.05,minPrice:10,maxPrice:9999999,maxListings:8,page:60};
export const DEAL={inviteMs:60000,idleMs:15*60000,maxEntries:6};

export function installSocialSchema(db,features){
 if(!features.has('trade'))return;
 db.exec([
  'CREATE TABLE IF NOT EXISTS market(id INTEGER PRIMARY KEY AUTOINCREMENT,seller_id TEXT NOT NULL,seller_name TEXT NOT NULL,goods TEXT NOT NULL,label TEXT NOT NULL,kind TEXT NOT NULL,ref TEXT NOT NULL,qty INTEGER NOT NULL,enhance INTEGER NOT NULL DEFAULT 0,category TEXT NOT NULL DEFAULT \'\',price INTEGER NOT NULL,status TEXT NOT NULL,buyer_id TEXT,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(seller_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT',
  'CREATE INDEX IF NOT EXISTS market_status_idx ON market(status,id)',
  'CREATE INDEX IF NOT EXISTS market_seller_idx ON market(seller_id,status)',
  'CREATE TABLE IF NOT EXISTS market_wallet(account_id TEXT PRIMARY KEY,mora INTEGER NOT NULL,sales INTEGER NOT NULL,updated_at INTEGER NOT NULL,FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT',
  // 0.15.1: finished live trades, for the operator console's trade log (kept when an account goes).
  'CREATE TABLE IF NOT EXISTS deal_log(id TEXT PRIMARY KEY,a_id TEXT NOT NULL,a_name TEXT NOT NULL,b_id TEXT NOT NULL,b_name TEXT NOT NULL,a_gave TEXT NOT NULL,b_gave TEXT NOT NULL,at INTEGER NOT NULL) STRICT',
  'CREATE INDEX IF NOT EXISTS deal_log_at_idx ON deal_log(at)'
 ].join(';')+';');
}
// Records kept before seasons (ABYSS_01) move to the month they were reached in.
export function migrateRankingSeasons(db){
 const S=season();if(!S)return 0;
 const rows=db.prepare("SELECT * FROM ranking WHERE season='ABYSS_01'").all();if(!rows.length)return 0;
 const put=db.prepare('INSERT INTO ranking VALUES(?,?,?,?,?,?,?) ON CONFLICT(account_id,season) DO UPDATE SET display_name=excluded.display_name,floor=excluded.floor,rounds=excluded.rounds,attempts=excluded.attempts,achieved_at=excluded.achieved_at WHERE excluded.floor>ranking.floor OR (excluded.floor=ranking.floor AND excluded.rounds<ranking.rounds)');
 db.exec('BEGIN IMMEDIATE');
 try{for(const r of rows)put.run(r.account_id,S.of(r.achieved_at||now()),r.display_name,r.floor,r.rounds,r.attempts,r.achieved_at);db.prepare("DELETE FROM ranking WHERE season='ABYSS_01'").run();db.exec('COMMIT');}
 catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}
 return rows.length;
}

const free=r=>!r.s.runtime&&(r.playPhase?.()||'FREE')==='FREE';
const int=v=>Number.isSafeInteger(Number(v))?Number(v):NaN;

export const socialMethods={
 // ---------- seasons, medals and the chat frame ----------
 seasonNow(){return season()?.of(now())||'ABYSS_01';},
 // Ranked records only (operator-edited journeys are not ranked): every season reaching floor 10 is a medal, and
 // last season's floor (10–12) draws the chat frame.
 honours(accountId){
  this.honourCache??=new Map();const hit=this.honourCache.get(accountId);if(hit&&hit.at>now()-60000)return hit.value;
  const S=season(),cur=this.seasonNow(),prev=S?.previous(cur),rows=this.db.prepare('SELECT season,floor FROM ranking WHERE account_id=?').all(accountId);
  const medals=rows.filter(r=>r.floor>=10&&r.season!=='ABYSS_01').sort((a,b)=>a.season<b.season?-1:1).map(r=>({season:r.season,label:S?.label(r.season)||r.season,floor:r.floor,current:r.season===cur}));
  const last=rows.find(r=>r.season===prev),value={medals,count:medals.length,top:Math.max(0,...medals.map(m=>m.floor)),frame:last&&last.floor>=10?last.floor:0,
   now:rows.find(r=>r.season===cur)?.floor||0,last:last?.floor||0};
  this.honourCache.set(accountId,{at:now(),value});return value;
 },
 dropHonours(accountId){this.honourCache?.delete(accountId);},
 // ---------- who is who ----------
 accountByPid(pid){
  pid=String(pid||'');if(!/^[a-f0-9]{12}$/.test(pid))return null;
  this.pidCache??=new Map();let id=this.pidCache.get(pid);
  if(!id&&(!this.pidBuilt||this.pidBuilt<now()-5000)){this.pidBuilt=now();for(const row of this.db.prepare('SELECT id FROM accounts').all())this.pidCache.set(pidOf(row.id),row.id);id=this.pidCache.get(pid);}
  return id?this.db.prepare('SELECT * FROM accounts WHERE id=?').get(id):null;
 },
 isOnline(accountId){for(const s of this.subscribers)if(s.account===accountId)return true;return false;},
 onlineList(a){
  this.need('chat');const seen=new Map();
  for(const s of this.subscribers)if(s.account!==a.id&&!seen.has(s.account)){const x=this.db.prepare('SELECT id,display_name FROM accounts WHERE id=?').get(s.account);if(x)seen.set(x.id,{name:x.display_name,pid:pidOf(x.id),honours:this.honours(x.id),busy:!!this.dealOf(x.id)});}
  return {players:[...seen.values()].sort((x,y)=>x.name.localeCompare(y.name,'ko')).slice(0,80)};
 },
 // A runtime per account and revision, kept briefly (profiles are looked at in bursts).
 profileRuntime(id){
  const m=this.meta(id);if(!m||m.revision==null)return null;this.profileCache??=new Map();
  const hit=this.profileCache.get(id);if(hit&&hit.revision===m.revision)return hit.r;
  const r=this.runtimeOf(id);this.profileCache.set(id,{revision:m.revision,r});if(this.profileCache.size>24)this.profileCache.delete(this.profileCache.keys().next().value);return r;
 },
 // Public card: protagonist, companions (rarity, level, 운명의 자리), the party with its gear, Abyss records.
 profile(a,pid){
  this.need('chat');this.rate('profile:'+a.id,40,60000);
  const t=this.accountByPid(pid);if(!t)throw err(404,'모험가를 찾을 수 없습니다.');
  const out={name:t.display_name,pid:pidOf(t.id),you:t.id===a.id,online:this.isOnline(t.id),staff:this.admins.has(t.id),honours:this.honours(t.id),listings:0};
  if(this.features.has('trade'))out.listings=this.db.prepare("SELECT COUNT(*) AS n FROM market WHERE seller_id=? AND status='ACTIVE'").get(t.id).n;
  const r=this.profileRuntime(t.id);if(!r)return {...out,journey:false};
  const g=r.s.global,ids=(r.adminCompanions?.()||[]).filter(id=>r.adminJoined?.(id));
  const gearOf=owner=>(r.s.inventory||[]).filter(i=>i.equipped&&i.owner===owner&&i.equip).map(i=>{const row=r.tables['16_EQUIP_DB'].get(i.equip);return {equip:i.equip,name:row?.[1]||i.equip,category:i.category||row?.[2]||'',enhance:Number(i.enhance)||0,artifact:!!i.artifact};});
  const levelOf=id=>id==='PLAYER_CUSTOM'?Number(g.PLAYER_LEVEL_STATE)||1:Number(r.s.chars?.[id]?.level)||1;
  const charView=id=>({id,name:r.premiumCharName?.(id)||id,rarity:r.rarityOf?.(id)||4,level:levelOf(id),constellation:r.constellationLevel?.(id)||0});
  const abyss=r.abyssView?.();
  return {...out,journey:true,player:{name:g.PLAYER_NAME||'',level:levelOf('PLAYER_CUSTOM'),route:g.STORY_ROUTE_ID==='ROUTE_ISEKAI'?'이세계인':'여행자',constellation:r.constellationLevel?.('PLAYER_CUSTOM')||0},
   companions:ids.map(charView).sort((x,y)=>y.rarity-x.rarity||y.constellation-x.constellation||y.level-x.level||x.name.localeCompare(y.name,'ko')),companionTotal:(r.adminCompanions?.()||[]).length,
   party:(r.s.party||[]).filter(x=>x.active).map(x=>({...charView(x.source),gear:gearOf(x.source)})),
   abyss:abyss?{season:abyss.season,label:abyss.seasonLabel,best:abyss.best.floor}:null};
 },
 // ---------- saving a changed journey from the server side ----------
 // A receipt id is used once per account; ids that could repeat after an operator rollback (buying or taking down the
 // same listing again) carry the time.
 writeSave(id,r,requestId,result){
  compact(r.s);const m=this.meta(id),before=this.loadParts(id),after=splitState(r.s),d=diffParts(before,after),t=now();
  const del=this.db.prepare('DELETE FROM parts WHERE account_id=? AND path=?'),up=this.db.prepare('INSERT INTO parts VALUES(?,?,?) ON CONFLICT(account_id,path) DO UPDATE SET value=excluded.value');
  for(const p of d.remove)del.run(id,p);for(const [p,v] of d.set)up.run(id,p,v);
  this.db.prepare('INSERT INTO backups VALUES(?,?,?,?)').run(id,m.revision,JSON.stringify(d.undo),t);this.db.prepare('DELETE FROM backups WHERE account_id=? AND revision<?').run(id,m.revision-3);
  this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(id,requestId,m.revision+1,m.revision,requestId.split('-')[0],JSON.stringify({result}),t);
  this.db.prepare('UPDATE metadata SET revision=?,last_request_id=?,updated_at=? WHERE account_id=?').run(m.revision+1,requestId,t,id);
 },
 liveRuntime(id,who='모험가',what='거래할'){
  const r=this.runtimeOf(id);if(!r)throw err(409,'먼저 여정을 시작해 주세요.');
  if(!free(r))throw err(409,who+'가 이야기나 전투를 진행 중입니다. 자유행동 중에만 '+what+' 수 있습니다.','NOT_FREE');
  return r;
 },
 commit(fn){this.db.exec('BEGIN IMMEDIATE');try{const out=fn();this.db.exec('COMMIT');return out;}catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');throw e;}},
 // ---------- market ----------
 marketView(row,viewer){
  const goods=JSON.parse(row.goods),g=goods[0]||{};
  return {id:row.id,seller:{name:row.seller_name,pid:pidOf(row.seller_id)},mine:row.seller_id===viewer,kind:row.kind,ref:row.ref,qty:row.qty,enhance:row.enhance,category:row.category,
   artifact:!!g.gear?.artifact,label:row.label,price:row.price,fee:Math.max(1,Math.ceil(row.price*MARKET.fee)),status:row.status,at:row.created_at};
 },
 marketList(a,q={}){
  this.need('trade');
  const text=String(q.q||'').trim().slice(0,30),kind=['ITEM','GEAR'].includes(q.kind)?q.kind:'';
  let rows=this.db.prepare("SELECT * FROM market WHERE status='ACTIVE' ORDER BY id DESC LIMIT 400").all();
  if(kind)rows=rows.filter(r=>r.kind===kind);if(text)rows=rows.filter(r=>r.label.includes(text)||r.seller_name.includes(text));
  const seller=q.seller?this.accountByPid(q.seller):null;if(q.seller)rows=rows.filter(r=>seller&&r.seller_id===seller.id);
  const sort=q.sort==='price'?(x,y)=>x.price/x.qty-y.price/y.qty:q.sort==='expensive'?(x,y)=>y.price-x.price:null;if(sort)rows.sort(sort);
  const mine=this.db.prepare("SELECT * FROM market WHERE seller_id=? AND status IN ('ACTIVE','SOLD') ORDER BY CASE status WHEN 'ACTIVE' THEN 0 ELSE 1 END,updated_at DESC LIMIT 30").all(a.id);
  const w=this.db.prepare('SELECT * FROM market_wallet WHERE account_id=?').get(a.id);
  return {listings:rows.slice(0,MARKET.page).map(r=>this.marketView(r,a.id)),total:rows.length,mine:mine.map(r=>this.marketView(r,a.id)),wallet:{mora:w?.mora||0,sales:w?.sales||0},rules:{...MARKET}};
 },
 async marketSell(a,b){
  this.need('trade');this.rate('market-sell:'+a.id,20,600000);
  const price=int(b?.price);if(!Number.isInteger(price)||price<MARKET.minPrice||price>MARKET.maxPrice)throw err(400,'가격은 '+MARKET.minPrice+'~'+MARKET.maxPrice.toLocaleString('ko-KR')+' 모라로 정해 주세요.');
  if(this.db.prepare("SELECT COUNT(*) AS n FROM market WHERE seller_id=? AND status='ACTIVE'").get(a.id).n>=MARKET.maxListings)throw err(409,'상점에는 한 번에 '+MARKET.maxListings+'개까지 올릴 수 있습니다.');
  const entry=b?.entry;if(!entry||typeof entry!=='object')throw err(400,'판매할 물건을 골라 주세요.');
  return this.serial(a.id,()=>{
   const r=this.liveRuntime(a.id,'판매하는 모험가');let moved;
   try{moved=r.tradeTake([entry.slot?{slot:String(entry.slot)}:{item:String(entry.item||''),qty:int(entry.qty)}]);}catch(e){throw err(400,e.message);}
   const m=moved[0],label=r.tradeLabel(moved),kind=m.gear?'GEAR':'ITEM',ref=m.gear?m.gear.equip:m.item,qty=m.gear?1:m.qty,enhance=m.gear?Number(m.gear.enhance)||0:0;
   const category=m.gear?(r.tables['16_EQUIP_DB'].get(ref)?.[2]||''):(r.tables['14_ITEM_DB'].get(ref)?.[2]||'');
   const t=now(),id=this.commit(()=>{const id=Number(this.db.prepare("INSERT INTO market(seller_id,seller_name,goods,label,kind,ref,qty,enhance,category,price,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,'ACTIVE',?,?)").run(a.id,a.display_name,JSON.stringify(moved),label,kind,ref,qty,enhance,category,price,t,t).lastInsertRowid);this.writeSave(a.id,r,'market-sell-'+id,{type:'MARKET_SELL',listing:id});return id;});
   this.invalidate(a.id);this.broadcast({type:'market',id,status:'ACTIVE'},s=>s.account!==a.id);
   return {listing:this.marketView(this.db.prepare('SELECT * FROM market WHERE id=?').get(id),a.id),sync:true};
  });
 },
 async marketCancel(a,b){
  this.need('trade');const id=int(b?.id),row=Number.isInteger(id)&&this.db.prepare('SELECT * FROM market WHERE id=?').get(id);
  if(!row)throw err(404,'판매 물건을 찾을 수 없습니다.');if(row.seller_id!==a.id)throw err(403,'내 상점의 물건만 내릴 수 있습니다.');if(row.status!=='ACTIVE')throw err(409,'이미 팔렸거나 내린 물건입니다.');
  return this.serial(a.id,()=>{
   const r=this.liveRuntime(a.id,'판매하는 모험가');r.tradeGive(JSON.parse(row.goods));
   this.commit(()=>{const still=this.db.prepare('SELECT status FROM market WHERE id=?').get(id);if(still?.status!=='ACTIVE')throw err(409,'이미 팔렸거나 내린 물건입니다.');this.db.prepare("UPDATE market SET status='CANCELLED',updated_at=? WHERE id=?").run(now(),id);this.writeSave(a.id,r,'market-cancel-'+id+'-'+now(),{type:'MARKET_CANCEL',listing:id});});
   this.invalidate(a.id);this.broadcast({type:'market',id,status:'CANCELLED'},s=>s.account!==a.id);return {cancelled:id,returned:row.label,sync:true};
  });
 },
 async marketBuy(a,b){
  this.need('trade');this.rate('market-buy:'+a.id,30,600000);
  const id=int(b?.id),row=Number.isInteger(id)&&this.db.prepare('SELECT * FROM market WHERE id=?').get(id);
  if(!row||row.status!=='ACTIVE')throw err(409,'이미 팔렸거나 내린 물건입니다.');if(row.seller_id===a.id)throw err(400,'내 상점의 물건은 살 수 없습니다.');
  if(b?.price!==undefined&&int(b.price)!==row.price)throw err(409,'가격이 바뀌었습니다. 다시 확인해 주세요.');
  return this.serial(a.id,()=>{
   const r=this.liveRuntime(a.id,'사는 모험가');if((Number(r.s.global.MORA)||0)<row.price)throw err(409,'모라가 부족합니다.');
   r.s.global.MORA=(Number(r.s.global.MORA)||0)-row.price;r.tradeGive(JSON.parse(row.goods));
   const fee=Math.max(1,Math.ceil(row.price*MARKET.fee)),gain=row.price-fee,t=now();
   this.commit(()=>{
    const still=this.db.prepare('SELECT status FROM market WHERE id=?').get(id);if(still?.status!=='ACTIVE')throw err(409,'방금 다른 모험가가 샀습니다.');
    this.db.prepare("UPDATE market SET status='SOLD',buyer_id=?,updated_at=? WHERE id=?").run(a.id,t,id);
    this.db.prepare('INSERT INTO market_wallet VALUES(?,?,1,?) ON CONFLICT(account_id) DO UPDATE SET mora=market_wallet.mora+excluded.mora,sales=market_wallet.sales+1,updated_at=excluded.updated_at').run(row.seller_id,gain,t);
    this.writeSave(a.id,r,'market-buy-'+id+'-'+t,{type:'MARKET_BUY',listing:id});
   });
   this.invalidate(a.id);
   this.broadcast({type:'market',id,status:'SOLD',label:row.label,gain},s=>s.account===row.seller_id);this.broadcast({type:'market',id,status:'SOLD'},s=>s.account!==row.seller_id&&s.account!==a.id);
   return {bought:id,label:row.label,price:row.price,sync:true};
  });
 },
 async marketCollect(a){
  this.need('trade');const w=this.db.prepare('SELECT * FROM market_wallet WHERE account_id=?').get(a.id);if(!w||w.mora<=0)throw err(409,'받을 판매 대금이 없습니다.');
  return this.serial(a.id,()=>{
   const r=this.liveRuntime(a.id,'판매 대금을 받는 모험가');let got=0;
   this.commit(()=>{const cur=this.db.prepare('SELECT * FROM market_wallet WHERE account_id=?').get(a.id);got=cur?.mora||0;if(got<=0)throw err(409,'받을 판매 대금이 없습니다.');
    r.s.global.MORA=(Number(r.s.global.MORA)||0)+got;this.db.prepare('UPDATE market_wallet SET mora=0,updated_at=? WHERE account_id=?').run(now(),a.id);this.writeSave(a.id,r,'market-collect-'+now(),{type:'MARKET_COLLECT',mora:got});});
   this.invalidate(a.id);return {mora:got,sync:true};
  });
 },
 // ---------- live trade between two online adventurers ----------
 dealOf(accountId){
  this.deals??=new Map();const t=now();
  for(const d of this.deals.values()){
   const stale=d.status==='INVITED'?t-d.created>DEAL.inviteMs:t-d.updated>DEAL.idleMs;
   if((d.status==='INVITED'||d.status==='OPEN')&&stale)this.dealEnd(d,'EXPIRED','시간이 지나 거래가 닫혔습니다.');
   else if(d.status==='OPEN'&&(!this.isOnline(d.a.id)||!this.isOnline(d.b.id))&&t-d.updated>20000)this.dealEnd(d,'CANCELLED','상대가 접속을 끊어 거래가 닫혔습니다.');
  }
  for(const [id,d] of this.deals)if(!['INVITED','OPEN'].includes(d.status)&&t-d.updated>60000)this.deals.delete(id);
  for(const d of this.deals.values())if(['INVITED','OPEN'].includes(d.status)&&(d.a.id===accountId||d.b.id===accountId))return d;
  return null;
 },
 dealView(d,viewer){
  const side=x=>({name:x.name,pid:x.pid,items:x.items.map(i=>({...i})),locked:x.locked,confirmed:x.confirmed});
  const me=d.a.id===viewer?d.a:d.b,other=me===d.a?d.b:d.a;
  return {id:d.id,status:d.status,note:d.note||'',inviter:d.a.id===viewer,me:side(me),other:side(other),updated:d.updated};
 },
 dealPush(d,extra={}){for(const x of [d.a,d.b])this.broadcast({type:'deal',deal:this.dealView(d,x.id),...extra},s=>s.account===x.id);},
 dealEnd(d,status,note){d.status=status;d.note=note||'';d.updated=now();this.dealPush(d);},
 dealGet(a,id){const d=this.dealOf(a.id);if(!d||d.id!==String(id||''))throw err(404,'진행 중인 거래가 없습니다.');return d;},
 dealCurrent(a){this.need('trade');const d=this.dealOf(a.id);return {deal:d?this.dealView(d,a.id):null};},
 dealInvite(a,b){
  this.need('trade');this.need('chat');this.rate('deal-invite:'+a.id,10,300000);
  const t=this.accountByPid(b?.toPid);if(!t)throw err(404,'모험가를 찾을 수 없습니다.');if(t.id===a.id)throw err(400,'자신과는 거래할 수 없습니다.');
  if(!this.isOnline(t.id))throw err(409,t.display_name+' 님은 지금 접속해 있지 않습니다. 접속 중인 모험가와만 거래할 수 있습니다.');
  if(this.dealOf(a.id))throw err(409,'이미 진행 중인 거래가 있습니다.');if(this.dealOf(t.id))throw err(409,t.display_name+' 님은 다른 거래를 하고 있습니다.');
  for(const id of [a.id,t.id]){const m=this.meta(id);if(!m||m.revision==null)throw err(409,'두 모험가 모두 여정을 시작해야 거래할 수 있습니다.');}
  const side=x=>({id:x.id,name:x.display_name,pid:pidOf(x.id),items:[],locked:false,confirmed:false});
  const d={id:createHash('sha256').update(a.id+':'+t.id+':'+now()+':'+Math.random()).digest('hex').slice(0,16),status:'INVITED',a:side(a),b:side(t),created:now(),updated:now()};
  this.deals.set(d.id,d);this.dealPush(d);return {deal:this.dealView(d,a.id)};
 },
 dealRespond(a,b){
  this.need('trade');const d=this.dealGet(a,b?.id);if(d.status!=='INVITED')throw err(409,'이미 시작된 거래입니다.');
  if(d.b.id!==a.id)throw err(403,'초대받은 모험가만 답할 수 있습니다.');
  if(b?.accept===true){d.status='OPEN';d.updated=now();this.dealPush(d);}else this.dealEnd(d,'DECLINED',a.display_name+' 님이 거래를 거절했습니다.');
  return {deal:this.dealView(d,a.id)};
 },
 dealUpdate(a,b){
  this.need('trade');const d=this.dealGet(a,b?.id);if(d.status!=='OPEN')throw err(409,'거래가 열려 있지 않습니다.');
  const me=d.a.id===a.id?d.a:d.b,r=this.runtimeOf(a.id);if(!r)throw err(409,'먼저 여정을 시작해 주세요.');
  const list=Array.isArray(b?.items)?b.items.slice(0,DEAL.maxEntries):[];let norm;try{norm=r.tradeNormalize(list);}catch(e){throw err(400,e.message);}
  const why=r.tradeCheck(norm);if(why)throw err(400,why);
  me.items=norm.map(x=>{if(x.slot){const inv=r.s.inventory.find(i=>i.slot===x.slot);return {slot:x.slot,kind:'GEAR',ref:inv.equip,qty:1,enhance:Number(inv.enhance)||0,label:r.tradeLabel([x])};}return {item:x.item,kind:'ITEM',ref:x.item,qty:x.qty,label:r.tradeLabel([x])};});
  for(const x of [d.a,d.b]){x.locked=false;x.confirmed=false;}d.updated=now();this.dealPush(d);return {deal:this.dealView(d,a.id)};
 },
 dealLock(a,b){
  this.need('trade');const d=this.dealGet(a,b?.id);if(d.status!=='OPEN')throw err(409,'거래가 열려 있지 않습니다.');
  const me=d.a.id===a.id?d.a:d.b;me.locked=b?.locked!==false;if(!me.locked)for(const x of [d.a,d.b])x.confirmed=false;
  d.updated=now();this.dealPush(d);return {deal:this.dealView(d,a.id)};
 },
 async dealConfirm(a,b){
  this.need('trade');const d=this.dealGet(a,b?.id);if(d.status!=='OPEN')throw err(409,'거래가 열려 있지 않습니다.');
  if(!d.a.locked||!d.b.locked)throw err(409,'두 사람 모두 「확정」을 눌러야 거래할 수 있습니다.');
  if(!d.a.items.length&&!d.b.items.length)throw err(400,'주고받을 물건을 하나 이상 올려 주세요.');
  const me=d.a.id===a.id?d.a:d.b;me.confirmed=true;d.updated=now();
  if(!d.a.confirmed||!d.b.confirmed){this.dealPush(d);return {deal:this.dealView(d,a.id)};}
  const [first,second]=[d.a.id,d.b.id].sort(),entries=x=>x.items.map(i=>i.slot?{slot:i.slot}:{item:i.item,qty:i.qty});
  try{
   await this.serial(first,()=>this.serial(second,()=>{
    const ra=this.liveRuntime(d.a.id,d.a.name+' 님'),rb=this.liveRuntime(d.b.id,d.b.name+' 님');let fromA,fromB;
    try{fromA=ra.tradeTake(entries(d.a));fromB=rb.tradeTake(entries(d.b));}catch(e){throw err(409,'거래할 수 없습니다. '+e.message,'TRADE_FAILED');}
    ra.tradeGive(fromB);rb.tradeGive(fromA);
    this.commit(()=>{this.writeSave(d.a.id,ra,'deal-'+d.id+'-a',{type:'DEAL',deal:d.id});this.writeSave(d.b.id,rb,'deal-'+d.id+'-b',{type:'DEAL',deal:d.id});
     this.db.prepare('INSERT INTO deal_log VALUES(?,?,?,?,?,?,?,?)').run(d.id,d.a.id,d.a.name,d.b.id,d.b.name,fromA.length?ra.tradeLabel(fromA):'없음',fromB.length?rb.tradeLabel(fromB):'없음',now());});
    this.invalidate(d.a.id);this.invalidate(d.b.id);
   }));
  }catch(e){for(const x of [d.a,d.b]){x.locked=false;x.confirmed=false;}d.note=e.message;d.updated=now();this.dealPush(d);throw e;}
  d.status='DONE';d.note='거래가 끝났습니다.';d.updated=now();this.dealPush(d,{sync:true});
  return {deal:this.dealView(d,a.id),sync:true};
 },
 dealCancel(a,b){this.need('trade');const d=this.dealGet(a,b?.id);this.dealEnd(d,'CANCELLED',a.display_name+' 님이 거래를 닫았습니다.');return {deal:this.dealView(d,a.id)};}
};

// Routes: answers a request, or returns undefined when the path is not one of these.
export async function socialRoute(store,a,path,req,url,body){
 const q=url.searchParams;
 if(req.method==='GET'){
  if(path==='/profile')return store.profile(a,q.get('pid'));
  if(path==='/online')return store.onlineList(a);
  if(path==='/market')return store.marketList(a,{q:q.get('q'),kind:q.get('kind'),sort:q.get('sort'),seller:q.get('seller')});
  if(path==='/deal')return store.dealCurrent(a);
  return undefined;
 }
 if(req.method!=='POST')return undefined;
 const call={'/market/sell':'marketSell','/market/cancel':'marketCancel','/market/buy':'marketBuy','/market/collect':'marketCollect',
  '/deal/invite':'dealInvite','/deal/respond':'dealRespond','/deal/update':'dealUpdate','/deal/lock':'dealLock','/deal/confirm':'dealConfirm','/deal/cancel':'dealCancel'}[path];
 if(!call)return undefined;
 return await store[call](a,await body(req));
}
