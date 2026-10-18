// 0.16.66 운영자 이벤트 (user, 2026-10-18: 「중반 재료 벽을 오히려 이벤트같은곳에서 뿌려주면 되겠지. 한번 운영자 이벤트 아이디어좀 생각해서
// 만들어봐」). Like 공동 토벌전 (raid-v0152.mjs) nothing opens by itself: the operator opens an event of one kind for some days from the
// console and may close it early. One event of a kind at a time; different kinds may run together. The open ones are handed to the
// engine with each action (opEventsActive → env.OP_EVENTS → r.opServerEvents, runtime_reading.js 0.16.66), and players read them
// from GET /events. Opening and closing are announced on the live streams ({type:'op-event'}), so screens refresh at once.
const now=()=>Date.now();
const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const K=()=>globalThis.CRPGRuntime?.opEventsV01666;
const DAY=86400000,ID_BASE=1000000;

export function installOpEventSchema(db){
 db.exec('CREATE TABLE IF NOT EXISTS op_events(id INTEGER PRIMARY KEY AUTOINCREMENT,kind TEXT NOT NULL,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,opened_by TEXT NOT NULL DEFAULT \'\',closed_at INTEGER) STRICT;'
  +'CREATE INDEX IF NOT EXISTS op_events_time_idx ON op_events(ends_at,starts_at);');
}
const view=row=>{const k=K()?.kinds?.[row.kind]||{};return {id:'EVT_'+(ID_BASE+row.id),kind:row.kind,name:k.name||row.kind,text:k.text||'',daily:k.daily||0,startsAt:row.starts_at,endsAt:row.ends_at,closed:row.closed_at!==null&&row.closed_at!==undefined};};

export const opEventMethods={
 // The events open right now (what the engine gets with an action).
 opEventsActive(t=now()){
  if(!K())return [];
  return this.db.prepare('SELECT * FROM op_events WHERE starts_at<=? AND ends_at>? AND closed_at IS NULL ORDER BY id').all(t,t).map(view).filter(e=>K().kinds[e.kind]);
 },
 // What a player's screen shows: the open events and the rules that go with them.
 opEventsStatus(){const k=K();return {now:now(),events:this.opEventsActive(),tokens:k?.tokens||{},shop:k?.shop||[]};},
 // ---------- the operator ----------
 opEventsAdminList(){
  const k=K(),t=now();if(!k)throw err(404,'지원하지 않는 요청입니다.');
  const rows=this.db.prepare('SELECT * FROM op_events ORDER BY id DESC LIMIT 20').all();
  return {now:t,kinds:Object.entries(k.kinds).map(([id,x])=>({id,name:x.name,text:x.text,daily:x.daily||0})),defaults:{days:7},active:this.opEventsActive(t),
   events:rows.map(row=>({...view(row),num:row.id,openedBy:row.opened_by,closedAt:row.closed_at,state:row.closed_at!==null?'CLOSED':row.starts_at>t?'SCHEDULED':row.ends_at<=t?'ENDED':'OPEN'}))};
 },
 opEventsAdminOpen(b,actor){
  const k=K();if(!k)throw err(404,'지원하지 않는 요청입니다.');
  const kind=String(b?.kind||'');if(!Object.hasOwn(k.kinds,kind))throw err(400,'열 이벤트를 골라 주세요.');
  const days=Number(b?.days);if(!Number.isInteger(days)||days<1||days>30)throw err(400,'기간은 1~30일로 정해 주세요.');
  if(this.opEventsActive().some(e=>e.kind===kind))throw err(409,'이미 열린 같은 이벤트가 있습니다. 먼저 닫아 주세요.');
  const t=now(),id=Number(this.db.prepare('INSERT INTO op_events(kind,starts_at,ends_at,opened_by) VALUES(?,?,?,?)').run(kind,t,t+days*DAY,String(actor||'')).lastInsertRowid);
  const event=view(this.db.prepare('SELECT * FROM op_events WHERE id=?').get(id));
  this.invalidateAll?.();this.broadcast({type:'op-event',open:true,event:event.id,kind},()=>true);return {event};
 },
 opEventsAdminClose(b){
  const n=Number(b?.num),row=Number.isSafeInteger(n)?this.db.prepare('SELECT * FROM op_events WHERE id=?').get(n):null;
  if(!row)throw err(404,'닫을 이벤트를 찾을 수 없습니다.');if(row.closed_at!==null)throw err(409,'이미 닫힌 이벤트입니다.');
  const t=now();this.db.prepare('UPDATE op_events SET closed_at=?,ends_at=MIN(ends_at,?) WHERE id=?').run(t,t,n);
  const event=view(this.db.prepare('SELECT * FROM op_events WHERE id=?').get(n));
  this.broadcast({type:'op-event',open:false,event:event.id,kind:event.kind},()=>true);return {event};
 }
};

export async function opEventRoute(store,a,path,req){
 if(path==='/events'&&req.method==='GET')return store.opEventsStatus();
 return undefined;
}
