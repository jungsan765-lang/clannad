// 0.15.1 편지 (user: 「편지는 그냥 우리가 아는 RPG의 모든 기능을 쓸 수도 있게 하자 물건 보내기 이런것도 가능하게」,
// 「수수료 포함」). Adventurers write to each other, online or not: a title, a few lines, up to six tradeable things and
// some Mora. The postage (기본 + 물건 한 종마다 + 보낸 모라의 5%) is paid when the letter goes and is not refunded.
// What a letter carries waits on the server, like goods in a shop, until the receiver presses 「받기」 or sends it back;
// after 30 days it goes back by itself. The sender's save changes when the letter goes, the taker's when the parcel is
// taken; reading, sending back, deleting and blocking never touch a save. Follows the server's 'trade' switch.
import {pidOf} from './social-v01415.mjs';

const now=()=>Date.now();
const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const int=v=>Number.isSafeInteger(Number(v))?Number(v):NaN;
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
export const POST={base:50,perEntry:100,moraRate:0.05,maxMora:1000000,entries:6,titleMax:30,bodyMax:500,inbox:100,keepDays:30,sendLimit:10,sendWindowMs:600000,blockMax:100};
const KEEP_MS=POST.keepDays*86400000;
export const postage=(entries,mora)=>POST.base+POST.perEntry*entries+(mora>0?Math.max(1,Math.ceil(mora*POST.moraRate)):0);
// Plain text only: no control, zero-width or direction characters; a title is one line, a body keeps its line breaks.
const bad=c=>c<32||c===127||(c>=0x200b&&c<=0x200f)||(c>=0x2028&&c<=0x202e)||(c>=0x2060&&c<=0x206f)||c===0xfeff;
const line=v=>[...String(v??'')].map(ch=>bad(ch.codePointAt(0))?' ':ch).join('').replace(/\s+/g,' ').trim();
const text=v=>String(v??'').replace(/\r\n?/g,'\n').split('\n').map(l=>[...l].map(ch=>bad(ch.codePointAt(0))?' ':ch).join('').replace(/[ \t]+/g,' ').trimEnd()).join('\n').replace(/\n{3,}/g,'\n\n').trim();
const cut=(s,n)=>[...s].slice(0,n).join('');
const parcelOf=row=>row.goods!=='[]'||row.mora>0;

export function installLetterSchema(db,features){
 if(!features.has('trade'))return;
 db.exec([
  "CREATE TABLE IF NOT EXISTS letters(id INTEGER PRIMARY KEY AUTOINCREMENT,from_id TEXT NOT NULL,from_name TEXT NOT NULL,to_id TEXT NOT NULL,to_name TEXT NOT NULL,title TEXT NOT NULL,body TEXT NOT NULL,goods TEXT NOT NULL,label TEXT NOT NULL,mora INTEGER NOT NULL,fee INTEGER NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',reply_to INTEGER,read_at INTEGER,to_hidden INTEGER NOT NULL DEFAULT 0,from_hidden INTEGER NOT NULL DEFAULT 0,created_at INTEGER NOT NULL,updated_at INTEGER NOT NULL,expires_at INTEGER NOT NULL) STRICT",
  'CREATE INDEX IF NOT EXISTS letters_to_idx ON letters(to_id,id)',
  'CREATE INDEX IF NOT EXISTS letters_from_idx ON letters(from_id,id)',
  'CREATE INDEX IF NOT EXISTS letters_due_idx ON letters(status,expires_at)',
  'CREATE TABLE IF NOT EXISTS letter_block(account_id TEXT NOT NULL,blocked_id TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(account_id,blocked_id),FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE,FOREIGN KEY(blocked_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT'
 ].join(';')+';');
}

export const letterMethods={
 letterRow(id){const n=int(id);return Number.isInteger(n)&&n>0?this.db.prepare('SELECT * FROM letters WHERE id=?').get(n):null;},
 // Statuses: SENT (delivered; a parcel waits for the receiver), TAKEN (the receiver took it), RETURNED (back with the
 // sender; the parcel waits for them), BACK (the sender took it back). A letter without a parcel stays SENT.
 letterView(row,viewer){
  const goods=JSON.parse(row.goods).map(g=>g.gear?{kind:'GEAR',ref:g.gear.equip,enhance:Number(g.gear.enhance)||0,qty:1,artifact:!!g.gear.artifact}:{kind:'ITEM',ref:g.item,qty:g.qty});
  const parcel=parcelOf(row),toMe=row.to_id===viewer,fromMe=row.from_id===viewer;
  return {id:row.id,from:{name:row.from_name,pid:pidOf(row.from_id)},to:{name:row.to_name,pid:pidOf(row.to_id)},title:row.title,body:row.body,goods,label:row.label,mora:row.mora,fee:row.fee,
   status:row.status,note:row.note,parcel,read:row.read_at!==null,at:row.created_at,updated:row.updated_at,expires:row.expires_at,replyTo:row.reply_to,
   waiting:(toMe&&row.status==='SENT'&&parcel)||(fromMe&&row.status==='RETURNED')};
 },
 // Letters whose parcel waited 30 days, or whose receiver has left, go back to the sender. Old letters both sides have
 // deleted are forgotten after another 30 days (nothing waits in them).
 letterSweep(force=false){
  const t=now();if(!force&&this.letterSwept>t-30000)return;this.letterSwept=t;
  const due=this.db.prepare("SELECT l.id,l.from_id,l.title,l.expires_at,(SELECT COUNT(*) FROM accounts a WHERE a.id=l.to_id) AS here FROM letters l WHERE l.status='SENT' AND (l.goods<>'[]' OR l.mora>0) AND (l.expires_at<? OR NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=l.to_id))").all(t);
  const back=this.db.prepare("UPDATE letters SET status='RETURNED',note=?,from_hidden=0,updated_at=? WHERE id=? AND status='SENT'");
  for(const x of due){back.run(x.here?'보관 기간('+POST.keepDays+'일)이 지나 돌아왔습니다.':'받는 모험가가 떠나 돌아왔습니다.',t,x.id);this.broadcast({type:'mail',status:'RETURNED',id:x.id,title:x.title},s=>s.account===x.from_id);}
  this.db.prepare("DELETE FROM letters WHERE updated_at<? AND (to_hidden=1 OR NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=letters.to_id)) AND (from_hidden=1 OR NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=letters.from_id)) AND NOT (status='SENT' AND (goods<>'[]' OR mora>0)) AND NOT (status='RETURNED' AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=letters.from_id))").run(t-KEEP_MS);
 },
 letterList(a){
  this.need('trade');this.letterSweep();
  const recv=this.db.prepare('SELECT * FROM letters WHERE to_id=? AND to_hidden=0 ORDER BY id DESC LIMIT ?').all(a.id,POST.inbox);
  const back=this.db.prepare("SELECT * FROM letters WHERE from_id=? AND from_hidden=0 AND status IN ('RETURNED','BACK') ORDER BY updated_at DESC LIMIT 40").all(a.id);
  const sent=this.db.prepare('SELECT * FROM letters WHERE from_id=? AND from_hidden=0 ORDER BY id DESC LIMIT 60').all(a.id);
  const blocked=this.db.prepare('SELECT b.blocked_id AS id,x.display_name AS name FROM letter_block b JOIN accounts x ON x.id=b.blocked_id WHERE b.account_id=? ORDER BY b.at DESC').all(a.id).map(x=>({pid:pidOf(x.id),name:x.name}));
  const inbox=[...recv.map(r=>({...this.letterView(r,a.id),box:'IN'})),...back.map(r=>({...this.letterView(r,a.id),box:'BACK'}))];
  return {inbox,sent:sent.map(r=>this.letterView(r,a.id)),blocked,rules:{...POST},new:inbox.filter(x=>x.waiting||(x.box==='IN'&&!x.read)).length};
 },
 // Who can be written to: adventurers who have started a journey, found by the name everyone sees (login IDs stay private).
 letterFind(a,q){
  this.need('trade');this.rate('letter-find:'+a.id,60,60000);
  const want=line(q).normalize('NFKC').slice(0,24);if(!want)return {players:[]};
  const rows=this.db.prepare("SELECT a.id,a.display_name FROM accounts a JOIN metadata m ON m.account_id=a.id WHERE m.revision IS NOT NULL AND a.id<>? AND instr(lower(a.display_name),lower(?))>0 ORDER BY CASE WHEN lower(a.display_name)=lower(?) THEN 0 WHEN instr(lower(a.display_name),lower(?))=1 THEN 1 ELSE 2 END,length(a.display_name),a.display_name LIMIT 12").all(a.id,want,want,want);
  return {players:rows.map(x=>({name:x.display_name,pid:pidOf(x.id),online:this.isOnline(x.id)}))};
 },
 async letterSend(a,b){
  this.need('trade');
  const to=this.accountByPid(b?.to);if(!to||this.meta(to.id)?.revision==null)throw err(404,'받는 모험가를 찾을 수 없습니다.');if(to.id===a.id)throw err(400,'자신에게는 편지를 보낼 수 없습니다.');
  const title=cut(line(b?.title),POST.titleMax),body=cut(text(b?.body),POST.bodyMax);if(!title)throw err(400,'제목을 적어 주세요.');
  const items=Array.isArray(b?.items)?b.items:[];if(items.length>POST.entries)throw err(400,'물건은 '+POST.entries+'종류까지 넣을 수 있습니다.');
  const mora=b?.mora===undefined||b?.mora===null||b?.mora===''?0:int(b.mora);if(!Number.isInteger(mora)||mora<0||mora>POST.maxMora)throw err(400,'함께 보낼 모라는 0~'+fmt(POST.maxMora)+' 사이로 정해 주세요.');
  if(this.db.prepare('SELECT 1 FROM letter_block WHERE account_id=? AND blocked_id=?').get(to.id,a.id))throw err(403,to.display_name+' 님은 지금 편지를 받지 않습니다.');
  if(this.db.prepare('SELECT COUNT(*) AS n FROM letters WHERE to_id=? AND to_hidden=0').get(to.id).n>=POST.inbox)throw err(409,to.display_name+' 님의 우편함이 가득 찼습니다.');
  const reply=b?.replyTo?this.letterRow(b.replyTo):null,replyTo=reply&&reply.to_id===a.id?reply.id:null;
  this.rate('letter-send:'+a.id,POST.sendLimit,POST.sendWindowMs);
  return this.serial(a.id,()=>{
   const r=this.liveRuntime(a.id,'편지를 보내는 모험가','편지를 보낼');let moved=[];
   if(items.length){try{moved=r.tradeTake(items.map(x=>x?.slot?{slot:String(x.slot)}:{item:String(x?.item||''),qty:int(x?.qty)}));}catch(e){throw err(400,e.message);}}
   const fee=postage(moved.length,mora),have=Number(r.s.global.MORA)||0;
   if(have<mora+fee)throw err(409,'모라가 부족합니다. '+(mora?'보낼 모라 '+fmt(mora)+' + ':'')+'수수료 '+fmt(fee)+' = '+fmt(mora+fee)+' 모라가 필요합니다.');
   r.s.global.MORA=have-mora-fee;
   const label=moved.length?r.tradeLabel(moved):'',parcel=moved.length>0||mora>0,t=now();
   const id=this.commit(()=>{
    const id=Number(this.db.prepare("INSERT INTO letters(from_id,from_name,to_id,to_name,title,body,goods,label,mora,fee,status,reply_to,created_at,updated_at,expires_at) VALUES(?,?,?,?,?,?,?,?,?,?,'SENT',?,?,?,?)").run(a.id,a.display_name,to.id,to.display_name,title,body,JSON.stringify(moved),label,mora,fee,replyTo,t,t,t+KEEP_MS).lastInsertRowid);
    this.writeSave(a.id,r,'letter-send-'+id,{type:'MAIL_SEND',letter:id,parcel,fee});return id;
   });
   this.invalidate(a.id);this.broadcast({type:'mail',status:'NEW',id,from:a.display_name,title,parcel},s=>s.account===to.id);
   return {letter:this.letterView(this.letterRow(id),a.id),fee,sync:true};
  });
 },
 // Take what one letter carries, or every parcel waiting (received ones and ones that came back).
 async letterTake(a,b){
  this.need('trade');this.letterSweep(true);
  return this.serial(a.id,()=>{
   const rows=b?.all===true?this.db.prepare("SELECT * FROM letters WHERE (to_id=? AND to_hidden=0 AND status='SENT' AND (goods<>'[]' OR mora>0)) OR (from_id=? AND status='RETURNED') ORDER BY id LIMIT 30").all(a.id,a.id):[this.letterRow(b?.id)].filter(Boolean);
   if(!rows.length)throw err(409,b?.all===true?'받을 물건이 있는 편지가 없습니다.':'편지를 찾을 수 없습니다.');
   const mine=row=>(row.to_id===a.id&&row.status==='SENT'&&parcelOf(row))||(row.from_id===a.id&&row.status==='RETURNED');
   for(const row of rows)if(!mine(row))throw err(409,row.to_id===a.id||row.from_id===a.id?'이미 받았거나 받을 물건이 없는 편지입니다.':'편지를 찾을 수 없습니다.');
   const r=this.liveRuntime(a.id,'편지를 받는 모험가','편지의 물건을 받을'),got=[];let mora=0;
   for(const row of rows){const goods=JSON.parse(row.goods);r.tradeGive(goods);got.push(...goods);mora+=row.mora;}
   r.s.global.MORA=(Number(r.s.global.MORA)||0)+mora;
   const t=now(),taken=[],back=[];
   this.commit(()=>{
    for(const row of rows){
     const cur=this.letterRow(row.id);if(cur?.status!==row.status)throw err(409,'편지 상태가 바뀌었습니다. 우편함을 다시 열어 주세요.');
     if(row.status==='SENT'){this.db.prepare("UPDATE letters SET status='TAKEN',read_at=COALESCE(read_at,?),updated_at=? WHERE id=?").run(t,t,row.id);taken.push(row.id);}
     else{this.db.prepare("UPDATE letters SET status='BACK',updated_at=? WHERE id=?").run(t,row.id);back.push(row.id);}
    }
    this.writeSave(a.id,r,'letter-take-'+t+'-'+rows[0].id,{type:'MAIL_TAKE',taken,back,mora});
   });
   this.invalidate(a.id);
   for(const row of rows)if(row.status==='SENT')this.broadcast({type:'mail',status:'TAKEN',id:row.id},s=>s.account===row.from_id);
   return {taken,back,label:got.length?r.tradeLabel(got):'',mora,sync:true};
  });
 },
 // The receiver sends a parcel back to its sender (free; the postage already paid is not refunded).
 letterReturn(a,b){
  this.need('trade');const row=this.letterRow(b?.id);
  if(!row||row.to_id!==a.id||row.to_hidden)throw err(404,'편지를 찾을 수 없습니다.');
  if(row.status!=='SENT'||!parcelOf(row))throw err(409,'돌려보낼 물건이 없는 편지입니다.');
  if(!this.db.prepare('SELECT 1 FROM accounts WHERE id=?').get(row.from_id))throw err(409,'보낸 모험가가 떠나 돌려보낼 수 없습니다. 「받기」로 받아 주세요.');
  const t=now(),n=Number(this.db.prepare("UPDATE letters SET status='RETURNED',note=?,from_hidden=0,read_at=COALESCE(read_at,?),updated_at=? WHERE id=? AND status='SENT'").run(a.display_name+' 님이 돌려보냈습니다.',t,t,row.id).changes);
  if(!n)throw err(409,'이미 받았거나 돌려보낸 편지입니다.');
  this.broadcast({type:'mail',status:'RETURNED',id:row.id,from:a.display_name,title:row.title},s=>s.account===row.from_id);
  return {returned:row.id};
 },
 letterRead(a,b){
  this.need('trade');const ids=(Array.isArray(b?.ids)?b.ids:[]).slice(0,120).map(int).filter(Number.isInteger),t=now();
  const q=this.db.prepare('UPDATE letters SET read_at=? WHERE id=? AND to_id=? AND read_at IS NULL');let n=0;for(const id of ids)n+=Number(q.run(t,id,a.id).changes);
  return {read:n};
 },
 // Deleting only hides a letter from one side. A parcel still waiting keeps its letter until it is taken or sent back.
 letterDelete(a,b){
  this.need('trade');const ids=(Array.isArray(b?.ids)?b.ids:[]).slice(0,200).map(int).filter(Number.isInteger);let deleted=0,kept=0;
  for(const id of ids){
   const row=this.letterRow(id);if(!row)continue;
   if(row.to_id===a.id&&!row.to_hidden){if(row.status==='SENT'&&parcelOf(row)){kept++;continue;}this.db.prepare('UPDATE letters SET to_hidden=1 WHERE id=?').run(id);deleted++;}
   else if(row.from_id===a.id&&!row.from_hidden){if(row.status==='RETURNED'){kept++;continue;}this.db.prepare('UPDATE letters SET from_hidden=1 WHERE id=?').run(id);deleted++;}
  }
  return {deleted,kept};
 },
 letterBlock(a,b){
  this.need('trade');const t=this.accountByPid(b?.pid);if(!t)throw err(404,'모험가를 찾을 수 없습니다.');if(t.id===a.id)throw err(400,'자신은 차단할 수 없습니다.');
  const on=b?.blocked!==false;
  if(!on)this.db.prepare('DELETE FROM letter_block WHERE account_id=? AND blocked_id=?').run(a.id,t.id);
  else{if(this.db.prepare('SELECT COUNT(*) AS n FROM letter_block WHERE account_id=?').get(a.id).n>=POST.blockMax)throw err(409,'편지 차단은 '+POST.blockMax+'명까지 할 수 있습니다.');this.db.prepare('INSERT OR IGNORE INTO letter_block VALUES(?,?,?)').run(a.id,t.id,now());}
  return {pid:pidOf(t.id),name:t.display_name,blocked:on};
 },
 // The operator's rollback (admin-api.mjs) puts a journey back some steps; letters sent or taken in those steps follow,
 // newest step first. A letter taken by its receiver involves another player and stops the rollback.
 letterUndo(id,receipts){
  const lines=[],ops=[],notify=new Set(),status=new Map(),has=this.features.has('trade');
  for(const rc of receipts){
   let res;try{res=JSON.parse(rc.result)?.result;}catch{continue;}const type=res?.type;if(type!=='MAIL_SEND'&&type!=='MAIL_TAKE')continue;
   if(!has)throw err(409,'편지 기록이 있는 단계는 거래 기능이 꺼진 서버에서 되돌릴 수 없습니다.');
   if(type==='MAIL_TAKE'){
    for(const [list,from,to,side] of [[res.taken,'TAKEN','SENT','to'],[res.back,'BACK','RETURNED','from']])for(const lid of list||[]){
     const x=this.letterRow(lid),cur=status.get(lid)??x?.status;
     if(!x||cur!==from||x[side+'_id']!==id)throw err(409,'되돌릴 단계 안에서 받은 편지(저장 '+rc.revision+')의 기록이 바뀌어 되돌릴 수 없습니다.');
     status.set(lid,to);ops.push(db=>db.prepare('UPDATE letters SET status=?,'+side+'_hidden=0,updated_at=? WHERE id=?').run(to,now(),lid));
     lines.push(side==='to'?'편지 「'+x.title+'」의 물건을 다시 받을 수 있게 돌려놓음':'돌아온 편지 「'+x.title+'」의 물건을 다시 되찾을 수 있게 돌려놓음');
    }
    continue;
   }
   const lid=int(res.letter),x=this.letterRow(lid),cur=status.get(lid)??x?.status;
   if(!x){if(res.parcel)throw err(409,'되돌릴 단계 안에서 보낸 편지(저장 '+rc.revision+')의 기록을 찾을 수 없어 되돌릴 수 없습니다.');continue;}
   if(x.from_id!==id)throw err(409,'보낸 편지(저장 '+rc.revision+')의 기록이 바뀌어 되돌릴 수 없습니다.');
   if(cur==='TAKEN')throw err(409,'되돌릴 단계 안에서 보낸 편지 「'+x.title+'」의 물건을 '+x.to_name+' 님이 이미 받았습니다. 그 단계는 되돌릴 수 없으니 더 적은 단계로 되돌려 주세요.');
   if(cur==='BACK')throw err(409,'보낸 편지 「'+x.title+'」의 기록이 바뀌어 되돌릴 수 없습니다.');
   status.set(lid,'GONE');ops.push(db=>db.prepare('DELETE FROM letters WHERE id=?').run(lid));notify.add(x.to_id);
   lines.push(x.to_name+' 님에게 보낸 편지 「'+x.title+'」을(를) 거둬들임'+(parcelOf(x)?'(넣었던 물건·모라와 수수료가 함께 돌아감)':'(수수료가 돌아감)'));
  }
  return {lines,changed:ops.length>0,notify:[...notify],apply:db=>{for(const f of ops)f(db);}};
 }
};

export async function letterRoute(store,a,path,req,url,body){
 if(req.method==='GET'){
  if(path==='/mail/letters')return store.letterList(a);
  if(path==='/mail/find')return store.letterFind(a,url.searchParams.get('q'));
  return undefined;
 }
 if(req.method!=='POST')return undefined;
 const call={'/mail/send':'letterSend','/mail/take':'letterTake','/mail/return':'letterReturn','/mail/read':'letterRead','/mail/delete':'letterDelete','/mail/block':'letterBlock'}[path];
 if(!call)return undefined;
 return await store[call](a,await body(req));
}
