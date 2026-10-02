// 0.15.3 다인 모드 on the Seoul account server (the fight itself is source/runtime_coop_v0153.js). Rooms live in memory only:
// a restart drops them, and a fight that was running goes on by the AI for the guests (the host's save holds it).
//  - A host opens a room (public, in the list, or invite-only) for up to three guests. A guest joins with one of their own
//    characters; the snapshot is read from the guest's own save on the server (never from the request).
//  - Every action on the host's save gets the room as `coopContext` (fixed-region-live.mjs action(), and coopHostAction
//    below): who is present (ready, and online or seen within a minute) and, for a guest's command, who sent it.
//  - A guest's command (/coop/act) and the 20-second auto turn (/coop/auto) are applied to the HOST's save here, with the
//    same persistence as a normal action (parts, backup, receipt, revision). The host's client is told to fetch its save.
//  - Room members get {type:'coop', ...} events on the live stream: the room, and a battle view made for each of them
//    (never the host's save).
//  - When a shared fight is won, each guest still in it gets a coop_rewards row inside the same transaction as the action
//    that ended the fight (INSERT OR IGNORE by battle and account), and is paid into their own save later, once: the row
//    turns PAID in the same transaction as the save write (receipt 'coop-reward-<time>-<random>', so it survives an
//    operator rollback; coopUndo lets a rolled-back reward be paid again). The guest's save also records the battle.
// Follows the server's 'coop' switch (CRPG_FEATURES); the table is made only when it is on.
import {randomBytes,randomUUID} from 'node:crypto';
import {R,DB as GAME_DB} from './generated/engine.mjs';
import {pidOf} from './social-v01415.mjs';
import {splitState,joinState,diffParts} from './state-parts.mjs';
import {compact} from './game-core.mjs';

const now=()=>Date.now();
const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const PLAYER='PLAYER_CUSTOM',ROOM=/^R[a-f0-9]{8,16}$/,PID=/^[a-f0-9]{12}$/,RID=/^[a-zA-Z0-9_-]{8,80}$/;
// awayMs: a member neither on the live stream nor heard from for a minute is not waited for (their fighter is played by
// the AI); goneMs: after five minutes they leave the room. The host's room closes two minutes after the host is gone.
export const COOP={maxGuests:3,minLevel:5,turnMs:20000,inviteMs:120000,awayMs:60000,goneMs:300000,hostGoneMs:120000,idleMs:30*60000,list:30,rewardsPerPay:10};
const rules=()=>globalThis.CRPGRuntime?.coopV0153||null;
const short=s=>s?{id:s.id,name:s.name,level:s.level,rarity:s.rarity,constellation:s.constellation,element:s.element||'',route:s.route||'',player:!!s.player,
 hp:s.hp,atk:s.atk,def:s.def,talents:s.talents||null,gear:(s.gear||[]).slice(0,6).map(g=>({name:g.name,type:g.type,enhance:g.enhance,artifact:!!g.artifact}))}:null;

export function installCoopSchema(db,features){
 if(!features.has('coop'))return;
 db.exec([
  // host_id is kept without a foreign key: a guest's reward stays payable when the host's account is gone.
  "CREATE TABLE IF NOT EXISTS coop_rewards(battle_id TEXT NOT NULL,account_id TEXT NOT NULL,host_id TEXT NOT NULL,room TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,paid_at INTEGER,PRIMARY KEY(battle_id,account_id),FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT",
  'CREATE INDEX IF NOT EXISTS coop_rewards_due_idx ON coop_rewards(account_id,status)'
 ].join(';')+';');
}

export const coopMethods={
 coopOn(){return this.features.has('coop');},
 coopNeed(){if(!this.coopOn()||!rules())throw err(404,'지원하지 않는 요청입니다.');},
 coopRooms(){return this.coopRoomMap??=new Map();},
 coopWhere(){return this.coopWhereMap??=new Map();},
 coopRoomOf(accountId){const id=this.coopWhere().get(accountId),room=id&&this.coopRooms().get(id);if(id&&!room)this.coopWhere().delete(accountId);return room||null;},
 coopRules(){const x=rules();return {maxGuests:COOP.maxGuests,minLevel:COOP.minLevel,turnSeconds:COOP.turnMs/1000,shared:x?.text?.shared||'',solo:x?.text?.solo||''};},
 // ---------- presence ----------
 coopTouch(room,accountId){const t=now();if(room.host.id===accountId)room.hostSeen=t;const m=room.members.find(x=>x.id===accountId);if(m)m.seen=t;},
 coopHere(m){return this.isOnline(m.id)||now()-m.seen<COOP.awayMs;},
 coopPresent(m){return !!m.ready&&this.coopHere(m);},
 // The room as the game rules see it, on every action on the host's save (fixed-region-live.mjs and coopHostAction).
 coopContextFor(hostId){
  if(!this.coopOn())return null;const room=this.coopRoomOf(hostId);if(!room||room.host.id!==hostId)return null;room.hostSeen=now();
  return {version:1,room:room.id,members:room.members.filter(m=>this.coopPresent(m)).map(m=>({pid:m.pid,name:m.name,snap:m.snap}))};
 },
 // Lazy cleanup (no timers): expired invites, members long gone, rooms whose host is gone or that stood empty too long.
 coopSweep(){
  const t=now();if(this.coopSwept>t-2000)return;this.coopSwept=t;
  for(const room of [...this.coopRooms().values()]){
   for(const [id,x] of room.invites)if(t-x.at>COOP.inviteMs)room.invites.delete(id);
   if(!this.db.prepare('SELECT 1 FROM accounts WHERE id=?').get(room.host.id)){this.coopEnd(room,'방장이 떠나 방이 닫혔습니다.');continue;}
   if(!this.isOnline(room.host.id)&&t-room.hostSeen>COOP.hostGoneMs){this.coopEnd(room,'방장이 자리를 비워 방이 닫혔습니다.');continue;}
   for(const m of room.members.slice())if(!this.isOnline(m.id)&&t-m.seen>COOP.goneMs)this.coopRemove(room,m,'자리를 오래 비워 방에서 나갔습니다.');
   if(!room.members.length&&t-room.updated>COOP.idleMs)this.coopEnd(room,'아무도 들어오지 않아 방이 닫혔습니다.');
  }
 },
 // ---------- views ----------
 coopHostRuntime(room){try{const m=this.meta(room.host.id);if(!m||m.revision==null)return null;const e=this.cached(room.host.id,m.revision);return e?.r||this.profileRuntime(room.host.id);}catch{return null;}},
 coopBattleState(room,r){
  const b=r?.s?.runtime;if(!b)return null;
  if(b.coop?.room===room.id)return {running:true,shared:true,id:b.id,round:b.round,opening:b.opening?.state==='PENDING',title:r.tables['33_ENCOUNTER_GROUP_DB']?.get(b.group)?.[1]||''};
  return {running:true,shared:false,id:b.id,round:b.round,solo:r.coopSoloReason?.(b.origin)||'다음 라운드부터 함께 싸울 수 있습니다.'};
 },
 coopView(room,viewer,r=undefined){
  if(r===undefined)r=this.coopHostRuntime(room);if(r)room.battle=this.coopBattleState(room,r);
  const host=room.host.id===viewer;
  return {id:room.id,visibility:room.visibility,you:host?'HOST':'GUEST',max:COOP.maxGuests,count:room.members.length,created:room.created,
   host:{name:room.host.name,pid:room.host.pid,char:short(room.hostSummary),online:this.isOnline(room.host.id)},
   members:room.members.map(m=>({pid:m.pid,name:m.name,char:short(m.summary),ready:!!m.ready,present:this.coopPresent(m),here:this.coopHere(m),me:m.id===viewer,joined:m.joined})),
   invites:host?[...room.invites.values()].map(x=>({pid:x.pid,name:x.name})):[],battle:room.battle?{...room.battle}:null};
 },
 // What one member sees of the host's fight: made from a copy of the state (views never touch the cached runtime).
 coopBattleFor(room,r,viewer,facade=null){
  const b=r?.s?.runtime;if(!b?.coop||b.coop.room!==room.id)return null;
  const f=facade||Object.assign(Object.create(r),{s:JSON.parse(JSON.stringify(r.s)),coopContext:null});
  try{return f.coopBattleView(pidOf(viewer));}catch{return null;}
 },
 // Everyone in the room gets the room, and their own view of the fight.
 coopPush(room,r=undefined,extra={}){
  if(r===undefined)r=this.coopHostRuntime(room);const people=[room.host.id,...room.members.map(m=>m.id)];
  const f=r?.s?.runtime?.coop?Object.assign(Object.create(r),{s:JSON.parse(JSON.stringify(r.s)),coopContext:null}):null;
  for(const id of people){const ev={type:'coop',kind:extra.kind||'room',room:this.coopView(room,id,r),battle:f?this.coopBattleFor(room,r,id,f):null};if(extra.ended)ev.ended=extra.ended;this.broadcast(ev,s=>s.account===id);}
 },
 // ---------- leaving and closing ----------
 coopRemove(room,m,reason,kind='left'){
  room.members=room.members.filter(x=>x!==m);this.coopWhere().delete(m.id);room.updated=now();
  this.broadcast({type:'coop',kind,room:null,reason},s=>s.account===m.id);
  this.coopPush(room);this.coopRelease(room);
 },
 coopEnd(room,reason){
  if(!this.coopRooms().has(room.id))return;this.coopRooms().delete(room.id);
  for(const id of [room.host.id,...room.members.map(m=>m.id)])if(this.coopWhere().get(id)===room.id)this.coopWhere().delete(id);
  for(const m of room.members)this.broadcast({type:'coop',kind:'closed',room:null,reason},s=>s.account===m.id);
  this.broadcast({type:'coop',kind:'closed',room:null,reason},s=>s.account===room.host.id);
  room.closed=true;room.members=[];this.coopRelease(room);
 },
 // A fight that waits on someone who is no longer in the room moves on at once (the rules let them fight by the AI).
 coopRelease(room){
  this.coopJob((async()=>{
   const r=this.coopHostRuntime(room),t=r?.s?.runtime?.coop?.turn;if(!t||r.s.runtime.coop.room!==room.id)return;
   const ctx=this.coopContextFor(room.host.id);if(ctx?.members.some(x=>x.pid===t.owner))return;
   await this.coopHostAction(room,'COOP_AUTO',{room:room.id},null);
  })());
 },
 coopJob(p){this.coopJobs??=new Set();const q=Promise.resolve(p).catch(()=>{}).finally(()=>this.coopJobs.delete(q));this.coopJobs.add(q);return q;},
 // Tests (and a clean shutdown) wait for the background work.
 async coopSettled(){for(let i=0;i<20&&this.coopJobs?.size;i++)await Promise.all([...this.coopJobs]);},
 // ---------- the host's save, changed by someone else ----------
 async coopHostAction(room,type,params,caller){
  const hostId=room.host.id,host=this.db.prepare('SELECT * FROM accounts WHERE id=?').get(hostId);if(!host)throw err(404,'방장을 찾을 수 없습니다.');
  const out=await this.serial(hostId,async()=>{
   this.db.exec('BEGIN IMMEDIATE');
   try{
    const m=this.meta(hostId);if(!m||m.revision==null)throw err(409,'방장의 여정을 찾을 수 없습니다.');
    const entry=this.cached(hostId,m.revision),before=entry?.parts||this.loadParts(hostId);let r;
    try{r=entry?.r||new R(GAME_DB,joinState(before),true);}catch{throw err(503,'방장의 저장 기록을 열지 못했습니다.');}
    const hadBattle=!!r.s.runtime;
    r.actionStartedAt=Math.max(now(),m.updated_at||0);r.coopContext={...(this.coopContextFor(hostId)||{version:1,room:room.id,members:[]}),caller:caller||null};
    let result;try{result=r.action(type,params);}finally{delete r.actionStartedAt;r.coopContext=null;}
    compact(r.s);const after=splitState(r.s),d=diffParts(before,after),t=now(),requestId='coop-'+type.toLowerCase().replace(/_/g,'')+'-'+randomUUID();
    const del=this.db.prepare('DELETE FROM parts WHERE account_id=? AND path=?'),up=this.db.prepare('INSERT INTO parts VALUES(?,?,?) ON CONFLICT(account_id,path) DO UPDATE SET value=excluded.value');
    for(const p of d.remove)del.run(hostId,p);for(const [p,v] of d.set)up.run(hostId,p,v);
    this.db.prepare('INSERT INTO backups VALUES(?,?,?,?)').run(hostId,m.revision,JSON.stringify(d.undo),t);this.db.prepare('DELETE FROM backups WHERE account_id=? AND revision<?').run(hostId,m.revision-3);
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(hostId,requestId,m.revision+1,m.revision,'coop',JSON.stringify({result:{type,by:caller||'',result:result?.result??null}}),t);
    this.db.prepare('UPDATE metadata SET revision=?,last_request_id=?,updated_at=? WHERE account_id=?').run(m.revision+1,requestId,t,hostId);
    const done=this.coopRecord(host,r,hadBattle);
    this.db.exec('COMMIT');this.touch(hostId,{revision:m.revision+1,parts:after,r});
    return {result,r,done,revision:m.revision+1};
   }catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');this.invalidate(hostId);throw e;}
  });
  // Committed: telling the room and paying rewards never turn the command into a failure.
  try{this.coopAfter(host,out.r,out.done,{byOther:true,revision:out.revision});}catch{}
  return out;
 },
 // Inside the transaction of the action that ended a shared fight: one PENDING reward per guest still in it.
 coopRecord(host,r,hadBattle){
  if(!this.coopOn()||!hadBattle||r.s.runtime)return null;
  let res;try{res=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'null');}catch{return null;}
  const c=res?.coop,id=String(res?.battleId||res?.id||'');if(!c||c.version!==1||!id||!ROOM.test(String(c.room)))return null;
  const accounts=[],t=now();
  if(c.victory)for(const g of c.guests||[]){
   if(g.left||!PID.test(String(g.owner)))continue;const acc=this.accountByPid(g.owner);if(!acc||acc.id===host.id)continue;
   const payload={battle:id,room:c.room,host:host.display_name,hostPid:pidOf(host.id),char:g.char,name:g.name,xp:c.xp,mora:c.mora,loot:c.loot||{},fieldBoss:c.fieldBoss||null,leyLine:c.leyLine||null,origin:c.origin};
   if(Number(this.db.prepare("INSERT OR IGNORE INTO coop_rewards(battle_id,account_id,host_id,room,payload,status,created_at) VALUES(?,?,?,?,?,'PENDING',?)").run(id,acc.id,host.id,c.room,JSON.stringify(payload),t).changes))accounts.push(acc.id);
  }
  return {battle:id,room:c.room,victory:!!c.victory,accounts,info:{victory:!!c.victory,xp:c.xp,mora:c.mora,loot:c.loot||{},guests:(c.guests||[]).map(g=>({name:g.ownerName,char:g.name,left:!!g.left}))}};
 },
 // After any change to the host's save (its own action, or a guest's): tell the room, and pay what is due.
 coopAfter(host,r,done,{byOther=false,revision=null}={}){
  if(!this.coopOn())return;
  const room=this.coopRoomOf(host.id);
  if(room&&room.host.id===host.id){
   const b=r?.s?.runtime,sig=b?[b.id,b.round,b.cursor,b.log.length,b.coop?.turn?.actor||'',b.actors.filter(a=>a.coop).length].join(':'):'none',ended=done&&done.room===room.id?done.info:null;
   if(sig!==room.sig||ended||byOther){room.sig=sig;room.updated=now();this.coopPush(room,r,ended?{kind:'ended',ended}:{});}
  }
  else if(room&&!byOther)this.coopRefresh(host.id,r);
  if(byOther)this.broadcast({type:'coop',kind:'sync',revision},s=>s.account===host.id);
  for(const id of done?.accounts||[])this.coopJob(this.coopPay(id));
 },
 // A guest's fighter follows their own save: after their own actions and after a reward, the next fight (or the next
 // round they step into) uses the new level and gear. A fighter already in a fight keeps what it came with.
 coopRefresh(accountId,r){
  const room=this.coopRoomOf(accountId),m=room?.members.find(x=>x.id===accountId);if(!m||!r?.s||r.s.runtime)return;
  let snap,summary;try{snap=r.coopSnapshot(m.snap.char);summary=r.coopCharSummary(m.snap.char);}catch{return;}
  const changed=JSON.stringify(summary)!==JSON.stringify(m.summary||null);m.snap=snap;m.summary=summary;
  if(changed){room.updated=now();this.coopPush(room);}
 },
 // ---------- paying a guest, once ----------
 async coopPay(accountId){
  if(!this.coopOn())return [];
  const due=this.db.prepare("SELECT 1 FROM coop_rewards WHERE account_id=? AND status='PENDING' LIMIT 1").get(accountId);if(!due)return [];
  const paid=await this.serial(accountId,()=>{
   const rows=this.db.prepare("SELECT * FROM coop_rewards WHERE account_id=? AND status='PENDING' ORDER BY created_at,battle_id LIMIT ?").all(accountId,COOP.rewardsPerPay);if(!rows.length)return [];
   const m=this.meta(accountId);if(!m||m.revision==null)return [];
   const r=this.runtimeOf(accountId);if(!r)return [];const out=[],failed=[];
   // Each reward is applied to a copy first: one that cannot be paid is set aside and never blocks the others.
   r.actionStartedAt=now();
   try{for(const row of rows){const keep=JSON.parse(JSON.stringify(r.s));try{const p=JSON.parse(row.payload);const result=r.coopApplyReward({...p,battle:row.battle_id});r.validateSave(r.s);out.push({row,result});}catch(e){r.s=keep;failed.push({row,note:String(e?.message||'보상을 줄 수 없습니다.').slice(0,200)});}}}
   finally{delete r.actionStartedAt;}
   if(!out.length&&!failed.length)return [];const t=now();
   this.commit(()=>{
    for(const {row,result} of out){const n=Number(this.db.prepare("UPDATE coop_rewards SET status='PAID',note=?,paid_at=? WHERE battle_id=? AND account_id=? AND status='PENDING'").run(JSON.stringify(result).slice(0,2000),t,row.battle_id,accountId).changes);if(!n)throw err(409,'이미 받은 보상입니다.');}
    for(const {row,note} of failed)this.db.prepare("UPDATE coop_rewards SET status='FAILED',note=?,paid_at=? WHERE battle_id=? AND account_id=? AND status='PENDING'").run(note,t,row.battle_id,accountId);
    if(out.length)this.writeSave(accountId,r,'coop-reward-'+t+'-'+randomBytes(4).toString('hex'),{type:'COOP_REWARD',battles:out.map(x=>x.row.battle_id)});
   });
   this.invalidate(accountId);
   if(out.length)try{this.coopRefresh(accountId,r);}catch{}
   return out.map(x=>({...x.result,host:x.result.host||JSON.parse(x.row.payload).host||''}));
  });
  if(paid.length)this.broadcast({type:'coop',kind:'reward',rewards:paid,sync:true},s=>s.account===accountId);
  return paid;
 },
 // The operator's rollback: a reward taken in the reverted steps can be paid again.
 coopUndo(id,receipts){
  const battles=[],lines=[];
  for(const rc of receipts){let res;try{res=JSON.parse(rc.result)?.result;}catch{continue;}if(res?.type!=='COOP_REWARD')continue;for(const b of res.battles||[])battles.push(String(b));lines.push('다인 모드 보상 '+(res.battles||[]).length+'건을 다시 받을 수 있게 돌려놓음');}
  return {lines,changed:battles.length>0,apply:db=>{if(!this.coopOn())return;const q=db.prepare("UPDATE coop_rewards SET status='PENDING',note='',paid_at=NULL WHERE account_id=? AND battle_id=?");for(const b of battles)q.run(id,b);}};
 },
 // ---------- requests ----------
 coopJourney(accountId){const m=this.meta(accountId);if(!m||m.revision==null)throw err(409,'먼저 여정을 시작해 주세요.');const r=this.runtimeOf(accountId);if(!r)throw err(409,'먼저 여정을 시작해 주세요.');return r;},
 coopInvitesFor(accountId){const out=[];for(const room of this.coopRooms().values()){const x=room.invites.get(accountId);if(x&&!room.closed)out.push({room:room.id,from:{name:room.host.name,pid:room.host.pid},at:x.at});}return out;},
 async coopStatus(a){
  this.coopNeed();this.rate('coop-view:'+a.id,300,60000);this.coopSweep();
  const room=this.coopRoomOf(a.id);if(room)this.coopTouch(room,a.id);
  let rewards=[];try{rewards=await this.coopPay(a.id);}catch{}
  const r=room?this.coopHostRuntime(room):null;
  return {enabled:true,rules:this.coopRules(),me:{pid:pidOf(a.id)},room:room?this.coopView(room,a.id,r):null,battle:room&&r?this.coopBattleFor(room,r,a.id):null,rewards,invites:this.coopInvitesFor(a.id)};
 },
 coopList(a){
  this.coopNeed();this.rate('coop-view:'+a.id,300,60000);this.coopSweep();
  const rows=[];
  for(const room of this.coopRooms().values()){
   if(room.closed||room.host.id===a.id)continue;const invited=room.invites.has(a.id);if(room.visibility!=='PUBLIC'&&!invited)continue;
   rows.push({id:room.id,host:{name:room.host.name,pid:room.host.pid,level:room.hostSummary?.level||0},visibility:room.visibility,invited,count:room.members.length,max:COOP.maxGuests,full:room.members.length>=COOP.maxGuests,
    fighting:!!room.battle?.running,members:room.members.map(m=>({name:m.name,char:m.summary?.name||'',level:m.summary?.level||0})),created:room.created});
  }
  rows.sort((x,y)=>Number(y.invited)-Number(x.invited)||Number(x.full)-Number(y.full)||y.created-x.created);
  return {rooms:rows.slice(0,COOP.list),mine:this.coopRoomOf(a.id)?.id||null};
 },
 coopOpen(a,b){
  this.coopNeed();this.rate('coop-open:'+a.id,10,600000);this.coopSweep();
  const visibility=b?.visibility==='INVITE'?'INVITE':'PUBLIC',cur=this.coopRoomOf(a.id);
  if(cur){if(cur.host.id!==a.id)throw err(409,'이미 다른 방에 들어가 있습니다. 먼저 그 방에서 나와 주세요.');cur.visibility=visibility;cur.updated=now();this.coopPush(cur);return {room:this.coopView(cur,a.id)};}
  const r=this.coopJourney(a.id),why=r.coopLevelReason();if(why)throw err(403,why,'LEVEL');
  const id='R'+randomBytes(6).toString('hex'),t=now();
  const room={id,host:{id:a.id,name:a.display_name,pid:pidOf(a.id)},hostSummary:r.coopCharSummary(PLAYER),visibility,invites:new Map(),members:[],created:t,updated:t,hostSeen:t,sig:'',battle:null,closed:false};
  this.coopRooms().set(id,room);this.coopWhere().set(a.id,id);
  return {room:this.coopView(room,a.id,r)};
 },
 coopFind(b){const id=String(b?.room||'');if(ROOM.test(id))return this.coopRooms().get(id)||null;const host=b?.host&&this.accountByPid(b.host);const room=host&&this.coopRoomOf(host.id);return room&&room.host.id===host.id?room:null;},
 // A guest's own save gives the fighter they bring.
 coopSnapFor(a,char,room){
  const r=this.coopJourney(a.id);if(r.s.runtime)throw err(409,'진행 중인 내 전투를 먼저 마쳐 주세요.');
  const id=typeof char==='string'&&char?char:PLAYER;let snap;
  try{snap=r.coopSnapshot(id);}catch(e){throw err(403,e.message,/Lv\./.test(e.message)?'LEVEL':'COOP_CHAR');}
  if(id!==PLAYER&&room.members.some(m=>m.id!==a.id&&m.snap.char===id))throw err(409,'다른 모험가가 이미 '+snap.name+'을(를) 데려왔습니다. 다른 캐릭터를 골라 주세요.');
  return {snap,summary:r.coopCharSummary(id)};
 },
 coopJoin(a,b){
  this.coopNeed();this.rate('coop-join:'+a.id,20,600000);this.coopSweep();
  const room=this.coopFind(b);if(!room||room.closed)throw err(404,'방을 찾을 수 없습니다. 이미 닫혔을 수 있습니다.');
  if(room.host.id===a.id)throw err(400,'내가 연 방입니다.');
  const cur=this.coopRoomOf(a.id);if(cur&&cur!==room)throw err(409,'이미 다른 방에 들어가 있습니다. 먼저 그 방에서 나와 주세요.');
  if(cur===room)return this.coopChar(a,b);
  if(room.visibility!=='PUBLIC'&&!room.invites.has(a.id))throw err(403,'초대받은 모험가만 들어갈 수 있는 방입니다.');
  if(room.members.length>=COOP.maxGuests)throw err(409,'방이 가득 찼습니다. (최대 '+COOP.maxGuests+'명)');
  const {snap,summary}=this.coopSnapFor(a,b?.char,room),t=now();
  room.members.push({id:a.id,name:a.display_name,pid:pidOf(a.id),snap,summary,ready:true,joined:t,seen:t,lastAct:null});
  room.invites.delete(a.id);this.coopWhere().set(a.id,room.id);room.updated=t;this.coopPush(room);
  return {room:this.coopView(room,a.id)};
 },
 coopMember(a){const room=this.coopRoomOf(a.id),m=room?.members.find(x=>x.id===a.id);if(!room||!m)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');m.seen=now();return {room,m};},
 coopChar(a,b){
  this.coopNeed();this.rate('coop-misc:'+a.id,60,60000);const {room,m}=this.coopMember(a);
  const {snap,summary}=this.coopSnapFor(a,b?.char,room);m.snap=snap;m.summary=summary;room.updated=now();this.coopPush(room);
  return {room:this.coopView(room,a.id)};
 },
 coopReady(a,b){this.coopNeed();this.rate('coop-misc:'+a.id,60,60000);const {room,m}=this.coopMember(a);m.ready=b?.ready!==false;room.updated=now();this.coopPush(room);if(!m.ready)this.coopRelease(room);return {room:this.coopView(room,a.id)};},
 coopLeave(a){
  this.coopNeed();const room=this.coopRoomOf(a.id);if(!room)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');
  if(room.host.id===a.id){this.coopEnd(room,'방장이 방을 닫았습니다.');return {left:true,closed:true};}
  const m=room.members.find(x=>x.id===a.id);if(m)this.coopRemove(room,m,'방에서 나왔습니다.');return {left:true};
 },
 coopClose(a){this.coopNeed();const room=this.coopRoomOf(a.id);if(!room||room.host.id!==a.id)throw err(403,'방장만 방을 닫을 수 있습니다.');this.coopEnd(room,'방장이 방을 닫았습니다.');return {closed:true};},
 coopKick(a,b){
  this.coopNeed();this.rate('coop-misc:'+a.id,60,60000);const room=this.coopRoomOf(a.id);if(!room||room.host.id!==a.id)throw err(403,'방장만 내보낼 수 있습니다.');
  const m=room.members.find(x=>x.pid===String(b?.pid||''));if(!m)throw err(404,'방에 없는 모험가입니다.');
  this.coopRemove(room,m,'방장이 방에서 내보냈습니다.','kicked');return {room:this.coopView(room,a.id)};
 },
 coopInvite(a,b){
  this.coopNeed();this.rate('coop-invite:'+a.id,20,300000);const room=this.coopRoomOf(a.id);if(!room||room.host.id!==a.id)throw err(403,'방을 연 모험가만 초대할 수 있습니다.');
  const t=this.accountByPid(b?.pid);if(!t)throw err(404,'모험가를 찾을 수 없습니다.');if(t.id===a.id)throw err(400,'나는 초대할 수 없습니다.');
  if(room.members.some(m=>m.id===t.id))throw err(409,t.display_name+' 님은 이미 방에 있습니다.');
  if(room.members.length>=COOP.maxGuests)throw err(409,'방이 가득 찼습니다. (최대 '+COOP.maxGuests+'명)');
  if(!this.isOnline(t.id))throw err(409,t.display_name+' 님은 지금 접속해 있지 않습니다.');
  if(this.coopRoomOf(t.id))throw err(409,t.display_name+' 님은 다른 방에 있습니다.');
  const m=this.meta(t.id);if(!m||m.revision==null)throw err(409,t.display_name+' 님은 아직 여정을 시작하지 않았습니다.');
  room.invites.set(t.id,{at:now(),pid:pidOf(t.id),name:t.display_name});room.updated=now();
  this.broadcast({type:'coop',kind:'invite',invite:{room:room.id,from:{name:room.host.name,pid:room.host.pid}}},s=>s.account===t.id);
  return {invited:{pid:pidOf(t.id),name:t.display_name},room:this.coopView(room,a.id)};
 },
 coopDecline(a,b){
  this.coopNeed();const room=this.coopFind(b);if(!room||!room.invites.has(a.id))throw err(404,'받은 초대가 없습니다.');room.invites.delete(a.id);
  this.broadcast({type:'coop',kind:'declined',from:{name:a.display_name,pid:pidOf(a.id)}},s=>s.account===room.host.id);return {declined:true};
 },
 // A guest's command for their own fighter, applied to the host's save (only on that fighter's turn; the rules check it).
 async coopAct(a,b){
  this.coopNeed();this.rate('coop-act:'+a.id,90,60000);const {room,m}=this.coopMember(a);
  const rid=typeof b?.requestId==='string'&&RID.test(b.requestId)?b.requestId:null;if(rid&&m.lastAct?.requestId===rid)return {...m.lastAct.out,replayed:true};
  const params={room:room.id,card:String(b?.card||'').slice(0,64)};
  if(b?.target!==undefined&&b?.target!==null&&b?.target!=='')params.target=String(b.target).slice(0,64);if(b?.branch)params.branch=String(b.branch).slice(0,24);
  const res=await this.coopHostAction(room,'COOP_COMBAT',params,m.pid);
  const out={ok:true,result:res.result?.result??null,battle:this.coopBattleFor(room,res.r,a.id)};if(rid)m.lastAct={requestId:rid,out};return out;
 },
 // The 20-second auto turn: any room member (or the host) may ask; the rules check the deadline on the server clock.
 async coopAutoTurn(a){
  this.coopNeed();this.rate('coop-auto:'+a.id,60,60000);const room=this.coopRoomOf(a.id);if(!room)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');this.coopTouch(room,a.id);
  const res=await this.coopHostAction(room,'COOP_AUTO',{room:room.id},room.host.id===a.id?null:pidOf(a.id));
  return {ok:true,battle:this.coopBattleFor(room,res.r,a.id)};
 },
 async coopClaim(a){this.coopNeed();this.rate('coop-misc:'+a.id,60,60000);return {rewards:await this.coopPay(a.id)};},
 // For an adventurer's card (social-v01415.mjs profile()): 「같이 하기」.
 coopProfileInfo(targetId,viewerId){
  if(!this.coopOn())return null;const theirs=this.coopRoomOf(targetId),mine=this.coopRoomOf(viewerId);
  const hosting=theirs&&theirs.host.id===targetId?theirs:null;
  return {hosting:!!hosting,room:hosting?.id||null,visibility:hosting?.visibility||null,count:hosting?.members.length||0,max:COOP.maxGuests,fighting:!!hosting?.battle?.running,
   joined:!!hosting&&hosting===mine,invited:!!hosting?.invites.has(viewerId),canInvite:!!mine&&mine.host.id===viewerId&&targetId!==viewerId&&!theirs&&mine.members.length<COOP.maxGuests,busy:!!theirs&&!hosting};
 }
};

export async function coopRoute(store,a,path,req,url,body){
 if(!path.startsWith('/coop/'))return undefined;
 if(req.method==='GET'){if(path==='/coop/room')return await store.coopStatus(a);if(path==='/coop/list')return store.coopList(a);return undefined;}
 if(req.method!=='POST')return undefined;
 const call={'/coop/open':'coopOpen','/coop/join':'coopJoin','/coop/char':'coopChar','/coop/ready':'coopReady','/coop/leave':'coopLeave','/coop/close':'coopClose','/coop/kick':'coopKick',
  '/coop/invite':'coopInvite','/coop/decline':'coopDecline','/coop/act':'coopAct','/coop/auto':'coopAutoTurn','/coop/claim':'coopClaim'}[path];
 if(!call)return undefined;
 return await store[call](a,await body(req));
}
