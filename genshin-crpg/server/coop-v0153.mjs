// 0.15.3 다인 모드 on the Seoul account server (the fight itself is source/runtime_coop_v0153.js). Rooms live in memory only:
// a restart drops them; reopening during a saved shared fight restores its room ID so returning guests can resume it.
// Without a reopened room the existing AI fallback still lets the host finish alone.
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
// 0.16 함께 돌아다니기 (user: 「그냥 손님이 방장 맵에 아예 들어가는 원신처럼 맵 알아서 돌아다니다가 방장이나 손님이 쌈 나면 전투
// 시작 전에 끼고 그런거 안돼?」, 「그래야 상자도 대신 좀 퍼즐같은것도 풀어줄 수 있고」; rules in source/runtime_coop_world_v0160.js):
//  - Each guest stands somewhere in the host's world (member.at, memory only). A guest who follows the host (the default,
//    as in 0.15.9) walks with them and fights the host's fights; /coop/move takes one step through the host's world (the
//    way is checked with the host's own map and flags) and stops following. The step's dice are the guest's own save's.
//  - A fight is whoever's it is: the host's fights in the host's save, a fight a guest meets on the way in the guest's own
//    save. room.fights tracks them by owner. Everyone else in the room is told (kind 'fight') and may step in with
//    /coop/fight: at once before 「전투 시작」 (COOP_ADMIT), else at the next round. Commands and auto turns go to the save
//    of the fight they belong to (coopOwnerAction, the former coopHostAction for any owner); rewards go out as before.
//  - /coop/chests lists the host's chests where a guest stands (the host's puzzles); /coop/chest unseals one: the puzzle is
//    solved, the chest stays there for the host to open themselves (CHEST_OPEN without the puzzle).
//  - Stepping into someone's fight needs one to stand where it is (user: 「다른 사람 전투는 그쪽으로 가야 할 수 있는것으로」):
//    a guest walks there in the host's world, the host walks there in their own.
//  - /coop/puzzle 같이 풀기 (user: 「상자를 기회는 공유하고, 같이 풀 수도 있게」): one board per chest of the host's for everyone in
//    the room standing at its place. What each one does on the board is kept in one order (memory only) and sent to everyone
//    on it, so every board plays the same moves and the same chances; someone joining later gets them all. The answer is
//    still checked by the rules when the chest is unsealed (/coop/chest) or opened (the host's CHEST_OPEN).
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
export const COOP={maxGuests:3,minLevel:5,turnMs:20000,inviteMs:120000,awayMs:60000,goneMs:300000,hostGoneMs:120000,idleMs:30*60000,list:30,rewardsPerPay:10,
 // 0.15.9: a suggestion shows for ten minutes; the room keeps its last twenty lines of talk (memory only).
 suggestMs:10*60000,logKeep:20,sayMax:80,
 // 0.16 같이 풀기: a chest's shared board keeps ten minutes after its last move; at most this many moves on one board.
 puzzleMs:10*60000,puzzleMoves:3000};
const clean=v=>[...String(v??'')].map(ch=>{const c=ch.codePointAt(0);return c<32||c===127||(c>=0x200b&&c<=0x200f)||(c>=0x2028&&c<=0x202e)||(c>=0x2060&&c<=0x206f)||c===0xfeff?' ':ch;}).join('').replace(/\s+/g,' ').trim();
const rules=()=>globalThis.CRPGRuntime?.coopV0153||null;
const short=s=>s?{id:s.id,name:s.name,level:s.level,rarity:s.rarity,constellation:s.constellation,element:s.element||'',route:s.route||'',player:!!s.player,
 hp:s.hp,atk:s.atk,def:s.def,talents:s.talents||null,gear:(s.gear||[]).slice(0,6).map(g=>({name:g.name,type:g.type,enhance:g.enhance,artifact:!!g.artifact}))}:null;

export function installCoopSchema(db,features){
 if(!features.has('coop'))return;
 db.exec([
  // host_id is kept without a foreign key: a guest's reward stays payable when the host's account is gone.
  "CREATE TABLE IF NOT EXISTS coop_rewards(battle_id TEXT NOT NULL,account_id TEXT NOT NULL,host_id TEXT NOT NULL,room TEXT NOT NULL,payload TEXT NOT NULL,status TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',created_at INTEGER NOT NULL,paid_at INTEGER,PRIMARY KEY(battle_id,account_id),FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT",
  'CREATE INDEX IF NOT EXISTS coop_rewards_due_idx ON coop_rewards(account_id,status)',
  // Keep the compact command outcome after later turns, room changes and restarts. The host has no foreign key:
  // deleting that account must not let an old guest command become a new command in another host's room.
  'CREATE TABLE IF NOT EXISTS coop_commands(account_id TEXT NOT NULL,request_id TEXT NOT NULL,host_id TEXT NOT NULL,room TEXT NOT NULL,battle_id TEXT NOT NULL,turn TEXT NOT NULL,intent TEXT NOT NULL,result TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(account_id,request_id),FOREIGN KEY(account_id) REFERENCES accounts(id) ON DELETE CASCADE) STRICT'
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
 // 0.16: everyone in the room, the host first (the host brings their protagonist when they step into someone's fight).
 coopPeople(room){
  const out=[{id:room.host.id,pid:room.host.pid,name:room.host.name,host:true,snap:room.hostSnap||null,follow:true,m:null}];
  for(const m of room.members)out.push({id:m.id,pid:m.pid,name:m.name,host:false,snap:m.snap,follow:m.follow!==false,m});
  return out;
 },
 coopPersonReady(room,p){return p.host?(this.isOnline(room.host.id)||now()-room.hostSeen<COOP.awayMs):this.coopPresent(p.m);},
 coopFightsOf(room){return room.fights??=new Map();},
 // The fight someone fights in with their one character (not their own fight): {owner, f}.
 coopFightWith(room,pid){for(const [owner,f] of this.coopFightsOf(room))if(f.owner.pid!==pid&&f.joined.has(pid))return {owner,f};return null;},
 // In a fight other than the one of `ownerId` (their own, or one they stepped into).
 coopBusyElsewhere(room,pid,ownerId){for(const [owner,f] of this.coopFightsOf(room)){if(owner===ownerId)continue;if(f.owner.pid===pid||f.joined.has(pid))return true;}return false;},
 // The room as the game rules see it, on every action on a save whose fight the room shares (fixed-region-live.mjs and
 // coopOwnerAction): who may fight in it now — whoever stepped into it, and (the host's fights) the guests who follow the
 // host. A guest's own journey stays solo except for the fight they met in the host's world.
 coopContextFor(accountId){
  if(!this.coopOn())return null;const room=this.coopRoomOf(accountId);if(!room||room.closed)return null;
  const isHost=room.host.id===accountId;if(isHost)room.hostSeen=now();
  const fight=this.coopFightsOf(room).get(accountId)||null;if(!isHost&&!fight)return null;
  const members=[];
  const meta=this.balance?this.meta(accountId):null,entry=meta?this.cached(accountId,meta.revision):null,balanceRevision=this.balance?this.balance.revisionForParts(entry?.parts||this.loadParts(accountId)):0;
  for(const p of this.coopPeople(room)){
   if(p.id===accountId||!p.snap||!this.coopPersonReady(room,p)||this.coopBusyElsewhere(room,p.pid,accountId))continue;
   if(fight?.joined.has(p.pid)||(isHost&&!p.host&&p.follow)){const snap=this.coopBalancedSnapshot(room,p,balanceRevision);if(snap)members.push({pid:p.pid,name:p.name,snap});}
  }
  return {version:1,room:room.id,members};
 },
 // A new guest must be priced/stat-ed by the fight's frozen profile. Existing
 // fighters remain the actors already persisted in that fight. Rebuild only when
 // profiles differ; cache the small snapshot, never a second runtime per guest.
 coopBalancedSnapshot(room,p,revision){
  if(!this.balance||p.snap.adminBalanceRevision===revision||revision===0&&p.snap.adminBalanceRevision===undefined)return p.snap;
  const meta=this.meta(p.id);if(!meta||meta.revision==null)return null;
  const holder=p.host?room:p.m;holder.balanceSnaps??=new Map();const hit=holder.balanceSnaps.get(revision);if(hit?.saveRevision===meta.revision)return hit.snap;
  try{const state=joinState(this.loadParts(p.id));if(state.runtime)return null;const r=this.balance.runtimeAtRevision(GAME_DB,state,revision,true),snap={...r.coopSnapshot(p.snap.char),adminBalanceRevision:revision};holder.balanceSnaps.set(revision,{saveRevision:meta.revision,snap});while(holder.balanceSnaps.size>4)holder.balanceSnaps.delete(holder.balanceSnaps.keys().next().value);return snap;}catch{return null;}
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
 // 0.15.9 함께 다니기 (user: 「호스트 서버 들어가서 같이 돌아다니고 전투도 참여 하고. 돌아다닐때 상대 위치도 보이고」): the room
 // follows the host's world, as in the original's co-op. The host leads the party; everyone sees where it is and what the
 // host is doing, a guest may suggest where to go next, and the room has its own short talk. Guests keep their own
 // journey where it was. Made from the host's runtime, never from the save that is sent.
 coopWorld(r){
  if(!r?.s)return null;const g=r.s.global,id=String(g.CURRENT_MAP_ID||''),row=r.tables['32_MAP_DB']?.get(id);
  let place=null;try{const p=r.currentPlace?.();if(p?.valid)place=String(p.entry?.name||'').replace(/\(시스템\)/g,'').trim()||null;}catch{}
  let phase='FREE';try{phase=r.playPhase?.()||'FREE';}catch{}
  const screen=String(g.SCREEN_MODE||''),doing=r.s.runtime?'BATTLE':phase!=='FREE'||['STORY','DIALOGUE','STORY_WAIT','COMBAT_PREP'].includes(screen)?'STORY':place?'PLACE':'FIELD';
  // 0.16: `rev` changes when the host's known places, open flags or chests change, so a guest walking the host's world
  // fetches its ways again (/coop/world).
  const flags=r.s.flags||{},rev=[Object.keys(r.s.exploration?.visitedMaps||{}).length,Object.keys(flags).filter(k=>flags[k]===true||flags[k]==='TRUE').length,Object.keys(r.s.chests?.opened||{}).length,r.s.liyue?.access?.phase||''].join(':');
  return {map:id,name:row?.[2]||id,region:row?.[1]||'',safe:row?.[12]==='Y',levels:row?[Number(row[6])||0,Number(row[7])||0]:null,doing,place,day:Number(g.WORLD_DAY)||0,time:String(g.WORLD_TIME||''),rev};
 },
 // 0.16: where everyone stands. The host is where their save is; a guest who follows walks with the host.
 coopAt(room,p){const hostMap=room.world?.map||'';if(p.host||p.follow)return hostMap;return p.m?.at?.map||hostMap;},
 // One step from `from` in the host's world: the host's own map rows and flags decide which ways are open
 // (runtime_navigation.js does the same with a view standing elsewhere).
 coopNear(r,from){
  const out=new Map();if(!r?.tables?.['32_MAP_DB']?.has(from))return [];
  const view=Object.create(r);view.s={...r.s,global:{...r.s.global,CURRENT_MAP_ID:from}};
  for(const e of r.rows('47_MAP_EDGE_DB')){if(e[1]!==from||e[2]===from||out.has(e[2]))continue;let why='';try{why=view.edgeReason(e);}catch{why='x';}if(why)continue;const row=r.tables['32_MAP_DB'].get(e[2]);if(!row)continue;out.set(e[2],{map:e[2],name:row[2]||e[2],region:row[1]||'',minutes:Math.max(0,Number(e[5])||0),safe:row[12]==='Y'});}
  return [...out.values()];
 },
 coopRuntimeOf(id){try{const m=this.meta(id);if(!m||m.revision==null)return null;const e=this.cached(id,m.revision);return e?.r||this.profileRuntime(id);}catch{return null;}},
 coopFacade(r){return r?.s?.runtime?.coop?Object.assign(Object.create(r),{s:JSON.parse(JSON.stringify(r.s)),coopContext:null}):null;},
 // Keeps room.fights in step with one save's fight: made when it starts, the people in it, gone when it ends.
 // Returns 'new', 'changed', 'ended' or false.
 coopTrackFight(room,acct,r){
  const fights=this.coopFightsOf(room),b=r?.s?.runtime,cur=fights.get(acct.id)||null;
  if(b&&b.coop?.room===room.id){
   let owner=null;if(acct.id===room.host.id)owner={id:acct.id,pid:room.host.pid,name:room.host.name};else{const m=room.members.find(x=>x.id===acct.id);if(m)owner={id:m.id,pid:m.pid,name:m.name};}
   if(!owner)return false;
   let f=cur&&cur.battle===b.id?cur:null;const fresh=!f;
   if(!f)f={owner,battle:b.id,map:String(r.s.global.CURRENT_MAP_ID||''),joined:new Set(),created:now(),sig:''};
   for(const a of b.actors)if(a.coop&&!a.coop.left)f.joined.add(a.coop.owner);
   f.opening=b.opening?.state==='PENDING';f.round=Number(b.round)||1;f.title=r.tables['33_ENCOUNTER_GROUP_DB']?.get(b.group)?.[1]||'';f.mapName=r.tables['32_MAP_DB']?.get(f.map)?.[2]||f.map;
   const sig=[f.round,f.opening,b.actors.filter(a=>a.coop&&!a.coop.left).map(a=>a.coop.owner).join(',')].join(':'),changed=fresh||sig!==f.sig;f.sig=sig;fights.set(acct.id,f);
   return fresh?'new':changed?'changed':false;
  }
  if(cur){fights.delete(acct.id);return 'ended';}
  return false;
 },
 // A fight one is not in: everyone else in the room hears of it once (the 「참가」 note).
 coopAnnounce(room,ownerId){
  const f=this.coopFightsOf(room).get(ownerId);if(!f)return;
  const fight={owner:{pid:f.owner.pid,name:f.owner.name,host:ownerId===room.host.id},map:f.map,mapName:f.mapName,title:f.title,opening:!!f.opening,round:f.round};
  for(const p of this.coopPeople(room))if(p.id!==ownerId&&!f.joined.has(p.pid))this.broadcast({type:'coop',kind:'fight',fight},s=>s.account===p.id);
 },
 coopView(room,viewer,r=undefined){
  if(r===undefined)r=this.coopHostRuntime(room);if(r){room.battle=this.coopBattleState(room,r);room.world=this.coopWorld(r);this.coopTrackFight(room,{id:room.host.id},r);}
  const host=room.host.id===viewer,t=now(),people=this.coopPeople(room),me=people.find(p=>p.id===viewer)||null,mapName=id=>r?.tables?.['32_MAP_DB']?.get(id)?.[2]||id;
  const fightOf=pid=>{for(const [owner,f] of this.coopFightsOf(room))if(f.owner.pid===pid||f.joined.has(pid))return {pid:f.owner.pid,name:f.owner.name,own:f.owner.pid===pid};return null;};
  const at=me?this.coopAt(room,me):'';
  return {id:room.id,visibility:room.visibility,you:host?'HOST':'GUEST',max:COOP.maxGuests,count:room.members.length,created:room.created,
   host:{name:room.host.name,pid:room.host.pid,char:short(room.hostSummary),online:this.isOnline(room.host.id)},
   members:room.members.map(m=>({pid:m.pid,name:m.name,char:short(m.summary),ready:!!m.ready,present:this.coopPresent(m),here:this.coopHere(m),me:m.id===viewer,joined:m.joined,follow:m.follow!==false})),
   invites:host?[...room.invites.values()].map(x=>({pid:x.pid,name:x.name})):[],battle:room.battle?{...room.battle}:null,
   world:room.world?{...room.world}:null,suggest:room.suggest&&t-room.suggest.at<COOP.suggestMs?{...room.suggest}:null,log:(room.log||[]).slice(-COOP.logKeep),now:t,
   // 0.16: where everyone stands, the fights going on, and (for a guest) the ways one step from where they stand.
   positions:people.map(p=>{const map=this.coopAt(room,p);return {pid:p.pid,name:p.name,host:p.host,map,mapName:mapName(map),follow:p.host||p.follow,fight:fightOf(p.pid),me:p.id===viewer};}),
   fights:[...this.coopFightsOf(room)].map(([owner,f])=>({owner:{pid:f.owner.pid,name:f.owner.name,host:owner===room.host.id},map:f.map,mapName:f.mapName,title:f.title,opening:!!f.opening,round:f.round||1,count:[...f.joined].filter(x=>x!==f.owner.pid).length,mine:owner===viewer,joined:!!me&&f.joined.has(me.pid)})),
   at:at?{map:at,name:mapName(at),follow:!!me&&(me.host||me.follow)}:null,
   near:!host&&r&&at?this.coopNear(r,at):[],
   // 0.16: the room's battle playback speed (null until someone changes it).
   speed:Number.isFinite(room.speed)?room.speed:null,speedRev:room.speedRev||0,
   // 0.16 같이 풀기: the boards someone is on, so whoever comes to that place can join.
   boards:[...this.coopPuzzles(room).values()].filter(p=>p.players.size).map(p=>({chest:p.chest,map:p.map,mapName:p.mapName,players:[...p.players.values()].map(x=>x.name),mine:!!me&&p.players.has(me.pid)}))};
 },
 // What one member sees of a fight: made from a copy of the state (views never touch the cached runtime). `r` is the
 // runtime of the save the fight is in (the host's before 0.16; kept for the older callers).
 coopBattleFor(room,r,viewer,facade=null){
  const b=r?.s?.runtime;if(!b?.coop||b.coop.room!==room.id)return null;
  const f=facade||this.coopFacade(r);
  try{return f.coopBattleView(pidOf(viewer));}catch{return null;}
 },
 // 0.16: the fight `viewer` fights in with their one character, wherever it is (not their own fight, which their own game
 // screen shows); with whose fight it is.
 coopBattleOf(room,viewer,facades=null){
  const pid=pidOf(viewer);
  for(const [owner,f] of this.coopFightsOf(room)){
   if(owner===viewer||!f.joined.has(pid))continue;
   const facade=facades?.get(owner)||this.coopFacade(owner===room.host.id?this.coopHostRuntime(room):this.coopRuntimeOf(owner));if(!facade)continue;
   let v=null;try{v=facade.coopBattleView(pid);}catch{}
   if(v&&v.room===room.id){v.owner={pid:f.owner.pid,name:f.owner.name,host:owner===room.host.id};return v;}
  }
  return null;
 },
 // Everyone in the room gets the room, and their own view of the fight they are in. `extra.endedFor` limits a fight's
 // result to the people who fought it.
 coopPush(room,r=undefined,extra={}){
  if(r===undefined)r=this.coopHostRuntime(room);if(r)this.coopTrackFight(room,{id:room.host.id},r);
  const facades=new Map();for(const owner of this.coopFightsOf(room).keys()){const f=this.coopFacade(owner===room.host.id?r:this.coopRuntimeOf(owner));if(f)facades.set(owner,f);}
  for(const p of this.coopPeople(room)){
   const ev={type:'coop',kind:extra.kind||'room',room:this.coopView(room,p.id,r),battle:this.coopBattleOf(room,p.id,facades)};
   if(extra.ended&&(!extra.endedFor||extra.endedFor.has(p.pid)))ev.ended=extra.ended;if(extra.owner)ev.owner=extra.owner;
   this.broadcast(ev,s=>s.account===p.id);
  }
 },
 // ---------- leaving and closing ----------
 coopRemove(room,m,reason,kind='left'){
  room.members=room.members.filter(x=>x!==m);this.coopWhere().delete(m.id);room.updated=now();
  // 0.16: their fighters in others' fights fight on by the AI; their own fight in the host's world goes on alone.
  const fights=this.coopFightsOf(room),own=fights.get(m.id);for(const f of fights.values())f.joined.delete(m.pid);fights.delete(m.id);
  for(const p of this.coopPuzzles(room).values())if(p.players.delete(m.pid))this.coopPuzzleTell(room,p,{op:'leave',by:{pid:m.pid}},true);
  this.broadcast({type:'coop',kind,room:null,reason},s=>s.account===m.id);
  this.coopPush(room);this.coopRelease(room,own?[m.id]:[]);
 },
 coopEnd(room,reason){
  if(!this.coopRooms().has(room.id))return;this.coopRooms().delete(room.id);
  for(const id of [room.host.id,...room.members.map(m=>m.id)])if(this.coopWhere().get(id)===room.id)this.coopWhere().delete(id);
  for(const m of room.members)this.broadcast({type:'coop',kind:'closed',room:null,reason},s=>s.account===m.id);
  this.broadcast({type:'coop',kind:'closed',room:null,reason},s=>s.account===room.host.id);
  const owners=[...this.coopFightsOf(room).keys()];
  room.closed=true;room.members=[];this.coopRelease(room,owners);room.fights=new Map();
 },
 // A fight that waits on someone who is no longer in it moves on at once (the rules let them fight by the AI). Every
 // fight of the room (0.16: not only the host's), and `more` owners whose fight left the room's list.
 coopRelease(room,more=[]){
  this.coopJob((async()=>{
   const owners=new Set([room.host.id,...this.coopFightsOf(room).keys(),...more]);
   for(const owner of owners){
    try{
     const r=owner===room.host.id?this.coopHostRuntime(room):this.coopRuntimeOf(owner),t=r?.s?.runtime?.coop?.turn;if(!t||r.s.runtime.coop.room!==room.id)continue;
     const ctx=this.coopContextFor(owner);if(ctx?.members.some(x=>x.pid===t.owner))continue;
     await this.coopOwnerAction(room,owner,'COOP_AUTO',{room:room.id},null);
    }catch{}
   }
  })());
 },
 coopJob(p){this.coopJobs??=new Set();const q=Promise.resolve(p).catch(()=>{}).finally(()=>this.coopJobs.delete(q));this.coopJobs.add(q);return q;},
 // Tests (and a clean shutdown) wait for the background work.
 async coopSettled(){for(let i=0;i<20&&this.coopJobs?.size;i++)await Promise.all([...this.coopJobs]);},
 // ---------- a save whose fight the room shares (the host's, or since 0.16 a guest's), changed by someone else ----------
 coopHostAction(room,type,params,caller,command=null){return this.coopOwnerAction(room,room.host.id,type,params,caller,command);},
 // `extra` adds what only the server may say to the rules: the way of a step (away), where a guest opens a chest (chest).
 async coopOwnerAction(room,ownerId,type,params,caller,command=null,extra=null){
  const hostId=ownerId,host=this.db.prepare('SELECT * FROM accounts WHERE id=?').get(hostId);if(!host)throw err(404,ownerId===room.host.id?'방장을 찾을 수 없습니다.':'전투의 주인을 찾을 수 없습니다.');
  const out=await this.serial(hostId,async()=>{
   this.db.exec('BEGIN IMMEDIATE');
   try{
    // Joining, leaving or closing can happen while this action waits for the host's save lock.
    if(command&&(this.coopRoomOf(command.accountId)!==room||room.closed||(command.member?!room.members.includes(command.member):room.host.id!==command.accountId)))throw err(409,'방에 다시 들어온 뒤 행동을 골라 주세요.','NO_ROOM');
    if(command?.requestId){
     const receipt=this.db.prepare('SELECT * FROM coop_commands WHERE account_id=? AND request_id=?').get(command.accountId,command.requestId);
     if(receipt){
      if(receipt.host_id!==hostId||receipt.room!==room.id||receipt.intent!==command.intent)throw err(409,'이미 처리한 요청 번호입니다. 현재 차례에서 행동을 다시 골라 주세요.','REQUEST_ID_REUSED');
      const r=ownerId===room.host.id?this.coopHostRuntime(room):this.coopRuntimeOf(ownerId);this.db.exec('COMMIT');
      return {replayed:true,result:{result:JSON.parse(receipt.result)},r};
     }
    }
    const m=this.meta(hostId);if(!m||m.revision==null)throw err(409,'방장의 여정을 찾을 수 없습니다.');
    const entry=this.cached(hostId,m.revision),before=entry?.parts||this.loadParts(hostId);let r;
    try{r=entry?.r||(this.runtimeFactory?this.runtimeFactory(GAME_DB,joinState(before),true):new R(GAME_DB,joinState(before),true));}catch{throw err(503,'방장의 저장 기록을 열지 못했습니다.');}
    const hadBattle=!!r.s.runtime,battleId=r.s.runtime?.id||'',turn=r.s.runtime?.coop?.turn;
    if(command?.expected&&(command.expected.battle!==battleId||command.expected.actor!==turn?.actor||command.expected.deadline!==turn?.deadline||(command.expected.round!==undefined&&command.expected.round!==r.s.runtime?.round)))throw err(409,'전투 차례가 바뀌었습니다. 현재 차례에서 행동을 다시 골라 주세요.','COOP_STALE_TURN');
    r.actionStartedAt=Math.max(now(),m.updated_at||0);r.coopContext={...(this.coopContextFor(hostId)||{version:1,room:room.id,members:[]}),...(extra||{}),caller:caller||null};
    let result;try{result=r.action(type,params);}finally{delete r.actionStartedAt;r.coopContext=null;}
    compact(r.s);const after=splitState(r.s),d=diffParts(before,after),t=now(),requestId='coop-'+type.toLowerCase().replace(/_/g,'')+'-'+randomUUID();
    const del=this.db.prepare('DELETE FROM parts WHERE account_id=? AND path=?'),up=this.db.prepare('INSERT INTO parts VALUES(?,?,?) ON CONFLICT(account_id,path) DO UPDATE SET value=excluded.value');
    for(const p of d.remove)del.run(hostId,p);for(const [p,v] of d.set)up.run(hostId,p,v);
    this.db.prepare('INSERT INTO backups VALUES(?,?,?,?)').run(hostId,m.revision,JSON.stringify(d.undo),t);this.db.prepare('DELETE FROM backups WHERE account_id=? AND revision<?').run(hostId,m.revision-3);
    this.db.prepare('INSERT INTO receipts VALUES(?,?,?,?,?,?,?)').run(hostId,requestId,m.revision+1,m.revision,'coop',JSON.stringify({result:{type,by:caller||'',result:result?.result??null}}),t);
    this.db.prepare('UPDATE metadata SET revision=?,last_request_id=?,updated_at=? WHERE account_id=?').run(m.revision+1,requestId,t,hostId);
    if(command?.requestId)this.db.prepare('INSERT INTO coop_commands VALUES(?,?,?,?,?,?,?,?,?)').run(command.accountId,command.requestId,hostId,room.id,battleId,JSON.stringify(turn||null),command.intent,JSON.stringify(result?.result??null),t);
    const done=this.coopRecord(host,r,hadBattle);
    this.db.exec('COMMIT');this.touch(hostId,{revision:m.revision+1,parts:after,r});
    return {result,r,done,revision:m.revision+1};
   }catch(e){if(this.db.isTransaction)this.db.exec('ROLLBACK');this.invalidate(hostId);throw e;}
  });
  if(out.replayed)return out;
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
  // 0.16: the fight's last blows (its final log) go with the result, so the joined window plays them before 「승리」.
  let fx=null;try{fx=r.coopFx?.(r.s.lastCombatLog)||null;}catch{}
  return {battle:id,room:c.room,victory:!!c.victory,accounts,info:{battle:id,victory:!!c.victory,xp:c.xp,mora:c.mora,loot:c.loot||{},guests:(c.guests||[]).map(g=>({name:g.ownerName,char:g.name,left:!!g.left,pid:PID.test(String(g.owner))?g.owner:''})),owner:{name:host.display_name,pid:pidOf(host.id)},fx}};
 },
 // After any change to the host's save (its own action, or a guest's): tell the room, and pay what is due.
 coopAfter(host,r,done,{byOther=false,revision=null}={}){
  if(!this.coopOn())return;
  const room=this.coopRoomOf(host.id);
  if(room&&!room.closed){
   // 0.16: whoever's save it is, its fight joins the room's list (and the others hear of a new one).
   const ended=done&&done.room===room.id?done.info:null,endedFor=ended?new Set((ended.guests||[]).map(g=>g.pid).filter(Boolean)):null;
   if(room.host.id===host.id){
    // 0.15.9: the host's place, what they are doing and the hour are part of what the room is told about.
    const b=r?.s?.runtime,w=this.coopWorld(r),tracked=this.coopTrackFight(room,host,r);
    if(!b)this.coopRefreshHost(room,r);
    const sig=(b?[b.id,b.round,b.cursor,b.log.length,b.coop?.turn?.actor||'',b.actors.filter(a=>a.coop).length].join(':'):'none')+'#'+(w?[w.map,w.doing,w.place||'',w.day,w.time].join('|'):'');
    const moved=!!w&&!!room.world&&room.world.map!==w.map;
    // Once the party is at the suggested place, the suggestion is done.
    if(room.suggest&&w&&room.suggest.map===w.map)room.suggest=null;
    // 0.16: a chest the host opened ends its shared board.
    for(const id of [...this.coopPuzzles(room).keys()])if(r?.chestOpened?.(id))this.coopPuzzleEnd(room,id,{opened:true,by:{name:room.host.name,pid:room.host.pid}});
    if(sig!==room.sig||ended||byOther||tracked){room.sig=sig;room.updated=now();this.coopPush(room,r,ended?{kind:'ended',ended,endedFor,owner:room.host.pid}:moved?{kind:'moved'}:{});}
    if(tracked==='new')this.coopAnnounce(room,host.id);
   }else{
    if(!byOther)this.coopRefresh(host.id,r);
    const tracked=this.coopTrackFight(room,host,r);
    if(tracked||ended){room.updated=now();this.coopPush(room,undefined,ended?{kind:'ended',ended,endedFor,owner:pidOf(host.id)}:{});}
    if(tracked==='new')this.coopAnnounce(room,host.id);
   }
  }
  if(byOther)this.broadcast({type:'coop',kind:'sync',revision},s=>s.account===host.id);
  for(const id of done?.accounts||[])this.coopJob(this.coopPay(id));
 },
 // The host's protagonist as they would step into a guest's fight, kept up to date outside their own fights.
 coopRefreshHost(room,r){if(!r?.s||r.s.runtime)return;try{room.hostSnap={...r.coopSnapshot(PLAYER),adminBalanceRevision:this.balance?.runtimeRevision(r)??0};room.hostSummary=r.coopCharSummary(PLAYER);room.balanceSnaps?.clear();}catch{}},
 // A guest's fighter follows their own save: after their own actions and after a reward, the next fight (or the next
 // round they step into) uses the new level and gear. A fighter already in a fight keeps what it came with.
 coopRefresh(accountId,r){
  const room=this.coopRoomOf(accountId),m=room?.members.find(x=>x.id===accountId);if(!m||!r?.s||r.s.runtime)return;
  let snap,summary;try{snap=r.coopSnapshot(m.snap.char);summary=r.coopCharSummary(m.snap.char);}catch{return;}
  const changed=JSON.stringify(summary)!==JSON.stringify(m.summary||null);m.snap={...snap,adminBalanceRevision:this.balance?.runtimeRevision(r)??0};m.summary=summary;m.balanceSnaps?.clear();
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
  const r=room?this.coopHostRuntime(room):null,view=room?this.coopView(room,a.id,r):null;
  return {enabled:true,rules:this.coopRules(),me:{pid:pidOf(a.id)},room:view,battle:room?this.coopBattleOf(room,a.id):null,rewards,invites:this.coopInvitesFor(a.id)};
 },
 coopList(a){
  this.coopNeed();this.rate('coop-view:'+a.id,300,60000);this.coopSweep();
  const rows=[];
  for(const room of this.coopRooms().values()){
   if(room.closed||room.host.id===a.id)continue;const invited=room.invites.has(a.id);if(room.visibility!=='PUBLIC'&&!invited)continue;
   rows.push({id:room.id,host:{name:room.host.name,pid:room.host.pid,level:room.hostSummary?.level||0},visibility:room.visibility,invited,count:room.members.length,max:COOP.maxGuests,full:room.members.length>=COOP.maxGuests,
   where:room.world?{name:room.world.name,region:room.world.region,doing:room.world.doing}:null,
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
  const savedRoom=r.s.runtime?.coop?.room;
  // A running battle is already persisted with this ID. Giving its host a different room would strand every guest's
  // turn behind COOP_ROOM. Restore only the room's identity; the saved fighters, difficulty and rewards stay intact.
  const id=ROOM.test(String(savedRoom||''))?savedRoom:'R'+randomBytes(6).toString('hex'),t=now();
  if(this.coopRooms().has(id))throw err(409,'이전 전투의 방을 복원하지 못했습니다. 잠시 뒤 다시 시도해 주세요.','COOP_ROOM_CONFLICT');
  let hostSnap=null;try{hostSnap={...r.coopSnapshot(PLAYER),adminBalanceRevision:this.balance?.runtimeRevision(r)??0};}catch{}
  const room={id,host:{id:a.id,name:a.display_name,pid:pidOf(a.id)},hostSummary:r.coopCharSummary(PLAYER),hostSnap,visibility,invites:new Map(),members:[],created:t,updated:t,hostSeen:t,sig:'',battle:null,closed:false,
   world:this.coopWorld(r),suggest:null,log:[],fights:new Map()};
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
  return {snap:{...snap,adminBalanceRevision:this.balance?.runtimeRevision(r)??0},summary:r.coopCharSummary(id)};
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
  // 0.16: a guest arrives where the host is and follows them until they take a step of their own.
  room.members.push({id:a.id,name:a.display_name,pid:pidOf(a.id),snap,summary,ready:true,joined:t,seen:t,at:{map:room.world?.map||'',at:t},follow:true});
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
 // 0.16: the host or a guest, with the fight they fight in: the one they stepped into, else (a guest) the host's.
 coopPerson(a){
  const room=this.coopRoomOf(a.id);if(!room||room.closed)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');
  const isHost=room.host.id===a.id,m=isHost?null:room.members.find(x=>x.id===a.id);if(!isHost&&!m)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');
  if(m)m.seen=now();else room.hostSeen=now();return {room,m,isHost,pid:pidOf(a.id)};
 },
 coopOwnerFor(room,pid,isHost){const w=this.coopFightWith(room,pid);if(w)return w.owner;return isHost?null:room.host.id;},
 coopWithOwner(room,owner,v){if(!v)return v;const f=this.coopFightsOf(room).get(owner),name=f?.owner.name||(owner===room.host.id?room.host.name:room.members.find(x=>x.id===owner)?.name||'');v.owner={pid:pidOf(owner),name,host:owner===room.host.id};return v;},
 // A guest's command for their own fighter, applied to the save the fight is in (only on that fighter's turn; the rules
 // check it).
 async coopAct(a,b){
  this.coopNeed();this.rate('coop-act:'+a.id,90,60000);const {room,m,isHost,pid}=this.coopPerson(a);
  const rid=b?.requestId===undefined||b?.requestId===null?null:b.requestId;
  if(rid!==null&&(typeof rid!=='string'||!RID.test(rid)))throw err(400,'행동 요청 번호가 올바르지 않습니다. 다시 시도해 주세요.','REQUEST_ID');
  const params={room:room.id,card:String(b?.card||'').slice(0,64)};
  if(b?.target!==undefined&&b?.target!==null&&b?.target!=='')params.target=String(b.target).slice(0,64);if(b?.branch)params.branch=String(b.branch).slice(0,24);
  // Older clients send only a request ID. New clients also bind a first delivery to the turn they displayed, so a
  // delayed command that has never reached the server cannot consume a later turn even with a fresh request ID.
  let expected=null;
  if(b?.battle!==undefined||b?.turn!==undefined){
   if(typeof b?.battle!=='string'||!b.battle||b.battle.length>160||typeof b?.turn?.actor!=='string'||!b.turn.actor||b.turn.actor.length>64||!Number.isSafeInteger(b?.turn?.deadline))throw err(400,'전투 차례를 확인하지 못했습니다. 화면을 새로고침해 주세요.','COOP_TURN');
   expected={battle:b.battle,actor:b.turn.actor,deadline:b.turn.deadline};
   if(b.turn.round!==undefined){if(!Number.isSafeInteger(b.turn.round)||b.turn.round<1)throw err(400,'전투 라운드를 확인하지 못했습니다. 화면을 새로고침해 주세요.','COOP_TURN');expected.round=b.turn.round;}
  }
  // Capture this membership, not just the account: leaving and rejoining creates a new member while an old
  // command may still be waiting on the host's lock. That old intent must not act in the new membership.
  const command={accountId:a.id,member:m,requestId:rid,expected,intent:JSON.stringify({params,expected})};
  const battleFor=(owner,r)=>{
   const battle=r?.s?.runtime;
   if(this.coopRoomOf(owner)!==room||battle?.coop?.room!==room.id||!battle.actors.some(x=>x.coop?.owner===pid&&!x.coop.left))return null;
   return this.coopWithOwner(room,owner,this.coopBattleFor(room,r,a.id));
  };
  // The final action removes the fight's ownership link. Its account-scoped receipt must still be replayable before
  // looking for a current fight, and must never be routed to a different owner's save after a later room/fight change.
  const receipt=rid&&this.db.prepare('SELECT * FROM coop_commands WHERE account_id=? AND request_id=?').get(a.id,rid);
  if(receipt){
   if(receipt.room!==room.id||receipt.intent!==command.intent)throw err(409,'이미 처리한 요청 번호입니다. 현재 차례에서 행동을 다시 골라 주세요.','REQUEST_ID_REUSED');
   const owner=receipt.host_id,r=owner===room.host.id?this.coopHostRuntime(room):this.coopRuntimeOf(owner);
   return {ok:true,result:JSON.parse(receipt.result),battle:battleFor(owner,r),replayed:true};
  }
  const owner=this.coopOwnerFor(room,pid,isHost);if(!owner)throw err(409,'함께 싸우는 전투가 없습니다.','NO_FIGHT');
  const res=await this.coopOwnerAction(room,owner,'COOP_COMBAT',params,pid,command);
  return {ok:true,result:res.result?.result??null,battle:battleFor(owner,res.r),...(res.replayed?{replayed:true}:{})};
 },
 // The 20-second auto turn: any room member (or the host) may ask; the rules check the deadline on the server clock.
 // 0.16: for the fight one fights in; the one whose fight it is asks for their own.
 async coopAutoTurn(a){
  this.coopNeed();this.rate('coop-auto:'+a.id,60,60000);const room=this.coopRoomOf(a.id);if(!room)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');this.coopTouch(room,a.id);
  const member=room.host.id===a.id?null:room.members.find(m=>m.id===a.id);
  if(room.host.id!==a.id&&!member)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');
  const pid=pidOf(a.id),joined=this.coopFightWith(room,pid),owner=joined?joined.owner:this.coopFightsOf(room).has(a.id)?a.id:room.host.id;
  // User requests obey the same queued membership check as manual cards. Internal departure fallback calls
  // coopOwnerAction without a command guard so it can still release a fighter after its room has closed.
  const res=await this.coopOwnerAction(room,owner,'COOP_AUTO',{room:room.id},owner===a.id?null:pid,{accountId:a.id,member});
  return {ok:true,battle:this.coopWithOwner(room,owner,this.coopBattleFor(room,res.r,a.id))};
 },
 // ---------- 0.16 함께 돌아다니기 ----------
 // One step through the host's world: the way must be open from where the guest stands (the host's own map and flags);
 // the dice of the way are the guest's own save's (COOP_ROAM), and a fight met there is the guest's own.
 async coopMove(a,b){
  this.coopNeed();this.rate('coop-move:'+a.id,40,60000);const {room,m,isHost}=this.coopPerson(a);if(isHost)throw err(400,'방장은 직접 이동합니다.');
  const r=this.coopHostRuntime(room);if(!r)throw err(409,'방장의 세계를 불러오지 못했습니다.');room.world=this.coopWorld(r);
  const from=this.coopAt(room,{host:false,follow:m.follow!==false,m}),to=String(b?.map||'').slice(0,80);
  if(!to||to===from)throw err(400,'갈 곳을 골라 주세요.');
  const step=this.coopNear(r,from).find(x=>x.map===to);if(!step)throw err(409,'지금 있는 곳에서 바로 갈 수 없는 곳입니다.','COOP_WAY');
  if(this.coopBusyElsewhere(room,m.pid,null))throw err(409,'함께 싸우는 동안에는 움직일 수 없습니다.','COOP_BUSY');
  const res=await this.coopOwnerAction(room,a.id,'COOP_ROAM',{room:room.id},null,{accountId:a.id,member:m},{away:{room:room.id,from,to,host:room.host.name}});
  m.at={map:to,at:now()};m.follow=false;room.updated=now();this.coopPush(room,r);
  const out=res.result?.result||{};
  return {at:{map:to,name:step.name},encounter:out.encounter||null,battle:out.battle||null,room:this.coopView(room,a.id,r)};
 },
 // Back to the host's side, following them again.
 coopFollow(a){
  this.coopNeed();this.rate('coop-move:'+a.id,40,60000);const {room,m,isHost}=this.coopPerson(a);if(isHost)throw err(400,'방장은 직접 이동합니다.');
  if(this.coopBusyElsewhere(room,m.pid,null))throw err(409,'함께 싸우는 동안에는 움직일 수 없습니다.','COOP_BUSY');
  m.follow=true;m.at={map:room.world?.map||'',at:now()};room.updated=now();this.coopPush(room);return {room:this.coopView(room,a.id)};
 },
 // 「참가」: step into someone's fight with one's character (the host brings their protagonist). Before 「전투 시작」 at once,
 // after it at the next round. One must stand where the fight is: a guest walks there in the host's world (following the
 // host keeps them there), the host walks there in their own; stepping into the host's fight, a guest follows the host again.
 async coopJoinFight(a,b){
  this.coopNeed();this.rate('coop-fight:'+a.id,30,60000);const {room,m,isHost,pid}=this.coopPerson(a);
  const ownerPid=String(b?.owner||''),owner=this.coopPeople(room).find(p=>p.pid===ownerPid);if(!owner)throw err(404,'함께할 전투를 찾을 수 없습니다.','NO_FIGHT');
  if(owner.id===a.id)throw err(400,'내 전투입니다.');
  const r0=owner.host?this.coopHostRuntime(room):this.coopRuntimeOf(owner.id);if(r0)this.coopTrackFight(room,{id:owner.id},r0);
  const f=this.coopFightsOf(room).get(owner.id);if(!f)throw err(404,'이미 끝난 전투입니다.','NO_FIGHT');
  if(f.joined.has(pid))return {ok:true,already:true,room:this.coopView(room,a.id),battle:this.coopBattleOf(room,a.id)};
  const snap=isHost?room.hostSnap:m.snap;if(!snap)throw err(409,'함께 데려갈 캐릭터를 불러오지 못했습니다.');
  if(this.coopBusyElsewhere(room,pid,owner.id))throw err(409,'다른 전투에 함께하는 중입니다.','COOP_BUSY');
  if(!isHost&&!this.coopPresent(m))throw err(409,'「준비 완료」로 바꾼 뒤 함께할 수 있습니다.');
  const mine=isHost?this.coopHostRuntime(room):this.coopRuntimeOf(a.id);if(mine?.s?.runtime)throw err(409,'진행 중인 내 전투를 먼저 마쳐 주세요.','COOP_BUSY');
  const at=isHost?String(mine?.s?.global?.CURRENT_MAP_ID||room.world?.map||''):this.coopAt(room,{host:false,follow:m.follow!==false,m});
  if(at!==f.map)throw err(409,(f.mapName||'전투가 벌어진 곳')+'에 가야 함께 싸울 수 있습니다.','COOP_FAR');
  if([...f.joined].filter(x=>x!==f.owner.pid).length>=COOP.maxGuests)throw err(409,'함께 싸우는 모험가가 가득 찼습니다.','COOP_FULL');
  f.joined.add(pid);
  if(m&&owner.host)m.follow=true;
  let admitted=null;
  if(f.opening){try{const res=await this.coopOwnerAction(room,owner.id,'COOP_ADMIT',{room:room.id,pid},null);admitted=res.result?.result||null;}catch(e){f.joined.delete(pid);throw e;}}
  room.updated=now();this.coopPush(room);
  return {ok:true,admitted:!!admitted?.admitted||!!admitted?.already,nextRound:!f.opening||!!admitted?.nextRound,room:this.coopView(room,a.id),battle:this.coopBattleOf(room,a.id)};
 },
 // 0.16 (user: 「전투만 하는게 아니라 시발 그냥 맵을 같이 돌아다녀야된다고 아예」): what a guest's own field screen needs to stand in
 // the host's world and walk it with the travel map — where they stand, the host's day and hour, the places the host has
 // been, every way that is open in the host's world (the host's own map rows and flags decide, from each place), the
 // host's chests already opened, and where everyone is. Never the host's save itself.
 coopWorldFor(a){
  this.coopNeed();this.rate('coop-world:'+a.id,120,60000);const {room,m,isHost}=this.coopPerson(a);
  const r=this.coopHostRuntime(room);if(!r)throw err(409,'방장의 세계를 불러오지 못했습니다.');room.world=this.coopWorld(r);
  const at=isHost?room.world.map:this.coopAt(room,{host:false,follow:m.follow!==false,m}),g=r.s.global,open=[],views=new Map();
  for(const e of r.rows('47_MAP_EDGE_DB')){
   let view=views.get(e[1]);if(!view){view=Object.create(r);view.s={...r.s,global:{...g,CURRENT_MAP_ID:e[1]}};views.set(e[1],view);}
   let why='';try{why=view.edgeReason(e);}catch{why='x';}if(!why)open.push(e[0]);
  }
  const visited=Object.keys(r.s.exploration?.visitedMaps||{}).filter(id=>r.tables['32_MAP_DB']?.has(id));if(!visited.includes(room.world.map))visited.push(room.world.map);
  const view=this.coopView(room,a.id,r);
  return {room:room.id,host:{name:room.host.name,pid:room.host.pid,map:room.world.map},at:{map:at,name:r.tables['32_MAP_DB']?.get(at)?.[2]||at,follow:isHost||m.follow!==false},
   day:Number(g.WORLD_DAY)||1,time:String(g.WORLD_TIME||'12:00'),route:String(g.STORY_ROUTE_ID||''),open,visited,opened:Object.keys(r.s.chests?.opened||{}),
   positions:view.positions,fights:view.fights,near:view.near,rev:room.world.rev||''};
 },
 // The host's chests where a guest stands, with the host's puzzles (the host's seed): the ones lying in the place itself.
 coopChests(a){
  this.coopNeed();this.rate('coop-chest:'+a.id,60,60000);const {room,m,isHost}=this.coopPerson(a);if(isHost)throw err(400,'방장은 직접 찾습니다.');
  const r=this.coopHostRuntime(room);if(!r)throw err(409,'방장의 세계를 불러오지 못했습니다.');room.world=this.coopWorld(r);
  const at=this.coopAt(room,{host:false,follow:m.follow!==false,m}),f=Object.assign(Object.create(r),{s:JSON.parse(JSON.stringify(r.s))});
  let chests=[];try{chests=f.coopChestsAt(at);}catch{}
  return {map:at,name:r.tables['32_MAP_DB']?.get(at)?.[2]||at,chests};
 },
 async coopChest(a,b){
  this.coopNeed();this.rate('coop-chest:'+a.id,60,60000);const {room,m,isHost}=this.coopPerson(a);if(isHost)throw err(400,'방장은 직접 엽니다.');
  const chest=String(b?.chest||'').slice(0,24),answer=b?.answer;if(JSON.stringify(answer??null).length>8000)throw err(400,'퍼즐 답이 너무 깁니다.');
  room.world=this.coopWorld(this.coopHostRuntime(room));const at=this.coopAt(room,{host:false,follow:m.follow!==false,m});
  const res=await this.coopOwnerAction(room,room.host.id,'COOP_CHEST_UNSEAL',{room:room.id,chest,answer},m.pid,{accountId:a.id,member:m},{chest:{map:at,pid:m.pid,name:m.name}});
  const out=res.result?.result||{},mapName=res.r?.tables?.['32_MAP_DB']?.get(out.map)?.[2]||out.map||'';
  // The chest stays there, unsealed, for the host to open (everyone in the room hears who solved it, and where).
  for(const p of this.coopPeople(room))this.broadcast({type:'coop',kind:'chest',room:room.id,chest:{by:{name:m.name,pid:m.pid},id:out.chest,tier:out.tier,unsealed:true,puzzle:!!out.puzzle,map:out.map,mapName,region:out.region}},s=>s.account===p.id);
  this.coopPuzzleEnd(room,out.chest,{unsealed:true,by:{name:m.name,pid:m.pid}});
  return {ok:true,result:{...out,mapName}};
 },
 // ---------- 0.16 같이 풀기: a chest's board shared by everyone at its place ----------
 coopPuzzles(room){return room.puzzles??=new Map();},
 coopPuzzleSweep(room){const t=now();for(const [id,p] of this.coopPuzzles(room))if(!p.players.size&&t-p.updated>COOP.puzzleMs)this.coopPuzzles(room).delete(id);},
 // The chest, seen from where one stands: the host in their own world (as CHEST_OPEN would see it), a guest in the host's.
 coopPuzzleChest(room,isHost,m,chest){
  const r=this.coopHostRuntime(room);if(!r)throw err(409,'방장의 세계를 불러오지 못했습니다.');
  const def=(globalThis.CRPGRuntime?.chestRules?.chests||[]).find(c=>c.id===chest);if(!def?.game)throw err(400,'함께 풀 퍼즐이 없는 상자입니다.','NO_PUZZLE');
  const f=Object.assign(Object.create(r),{s:JSON.parse(JSON.stringify(r.s)),coopContext:null});
  const at=isHost?String(r.s.global.CURRENT_MAP_ID||''):this.coopAt(room,{host:false,follow:m.follow!==false,m});
  const why=isHost?f.chestReason(chest):f.coopChestReason(chest,at);if(why)throw err(409,why,'COOP_CHEST');
  if(isHost&&f.s.chests?.unsealed?.[chest])throw err(409,'이미 암호를 풀어 둔 상자입니다. 바로 열 수 있습니다.','COOP_CHEST');
  const view=f.chestView(def);delete view.reason;view.puzzle=f.chestPuzzle(chest);return {at,view};
 },
 coopPuzzleView(p,pid){return {chest:p.chest,map:p.map,seq:p.seq,events:p.events,players:[...p.players].map(([id,x])=>({pid:id,name:x.name,host:x.host,me:id===pid}))};},
 // Everyone on the board hears each move; a new board is told to the whole room (the ones standing there may join).
 coopPuzzleTell(room,p,msg,all=false){
  const players=[...p.players].map(([pid,x])=>({pid,name:x.name,host:x.host}));
  for(const person of this.coopPeople(room)){if(!all&&!p.players.has(person.pid))continue;this.broadcast({type:'coop',kind:'puzzle',room:room.id,chest:p.chest,map:p.map,mapName:p.mapName,players,...msg},s=>s.account===person.id);}
 },
 coopPuzzleEnd(room,chest,how){const p=this.coopPuzzles(room).get(chest);if(!p)return;this.coopPuzzles(room).delete(chest);this.coopPuzzleTell(room,p,{op:'end',...how},true);},
 async coopPuzzle(a,b){
  this.coopNeed();this.rate('coop-puzzle:'+a.id,900,60000);const {room,m,isHost,pid}=this.coopPerson(a);this.coopPuzzleSweep(room);
  const op=String(b?.op||''),chest=String(b?.chest||'').slice(0,24),boards=this.coopPuzzles(room);let p=boards.get(chest)||null;
  if(op==='join'){
   const {at,view}=this.coopPuzzleChest(room,isHost,m,chest),fresh=!p;
   if(!p){p={chest,map:at,mapName:view.mapName,events:[],seq:0,players:new Map(),created:now(),updated:now()};boards.set(chest,p);}
   const name=isHost?room.host.name:m.name;p.players.set(pid,{name,host:isHost});p.updated=now();
   this.coopPuzzleTell(room,p,{op:'join',by:{pid,name,host:isHost},fresh},true);
   return {session:this.coopPuzzleView(p,pid),chest:view};
  }
  if(!p)throw err(404,'함께 풀던 퍼즐이 끝났습니다.','NO_PUZZLE');
  if(op==='leave'){if(p.players.delete(pid)){p.updated=now();this.coopPuzzleTell(room,p,{op:'leave',by:{pid}},true);}return {left:true};}
  if(!p.players.has(pid))throw err(409,'퍼즐에 먼저 들어와 주세요.','NO_PUZZLE');
  if(op==='event'){
   const ev=b?.ev,size=JSON.stringify(ev??null).length;if(!ev||typeof ev!=='object'||Array.isArray(ev)||size>400)throw err(400,'퍼즐 조작을 확인하지 못했습니다.');
   if(p.events.length>=COOP.puzzleMoves)throw err(409,'이 퍼즐은 조작이 너무 많았습니다. 닫았다가 다시 열어 주세요.');
   const e={seq:++p.seq,pid,at:now(),ev};p.events.push(e);p.updated=e.at;this.coopPuzzleTell(room,p,{op:'event',event:e});
   return {event:e};
  }
  throw err(400,'알 수 없는 요청입니다.');
 },
 async coopClaim(a){this.coopNeed();this.rate('coop-misc:'+a.id,60,60000);return {rewards:await this.coopPay(a.id)};},
 // 0.16 (user: 「배속도 공유하게 해야겠는데」): the battle playback's speed is the room's: whoever changes it changes it for all.
 coopSpeed(a,b){
  this.coopNeed();this.rate('coop-speed:'+a.id,60,60000);const {room,m,isHost,pid}=this.coopPerson(a);
  const v=Number(b?.speed);if(!Number.isFinite(v)||v<0.5||v>2||Math.round(v*4)!==v*4)throw err(400,'전투 속도를 확인하지 못했습니다.');
  room.speed=v;room.speedRev=(room.speedRev||0)+1;room.updated=now();const by={name:isHost?room.host.name:m.name,pid},rev=room.speedRev;
  for(const p of this.coopPeople(room))this.broadcast({type:'coop',kind:'speed',room:room.id,speed:v,rev,by},s=>s.account===p.id);
  return {speed:v,rev};
 },
 // 0.15.9: a guest suggests where the party goes next (any place on the host's map list); the host decides and moves.
 coopSuggest(a,b){
  this.coopNeed();this.rate('coop-suggest:'+a.id,10,60000);if(this.coopRoomOf(a.id)?.host.id===a.id)throw err(400,'방장은 직접 이동합니다.');const {room,m}=this.coopMember(a);
  const r=this.coopHostRuntime(room),map=String(b?.map||'').slice(0,80),row=r?.tables['32_MAP_DB']?.get(map);if(!row)throw err(400,'갈 곳을 골라 주세요.');
  room.suggest={from:{name:m.name,pid:m.pid},map,name:row[2]||map,region:row[1]||'',at:now()};room.updated=now();
  this.coopPush(room,r,{kind:'suggest'});return {room:this.coopView(room,a.id,r)};
 },
 // 0.15.9: the room's own short talk (everyone in the room; kept in memory with the room, the last twenty lines).
 coopSay(a,b){
  this.coopNeed();this.rate('coop-say:'+a.id,12,60000);const room=this.coopRoomOf(a.id);if(!room)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');
  const text=clean(b?.text).slice(0,COOP.sayMax);if(!text)throw err(400,'보낼 말을 적어 주세요.');
  const isHost=room.host.id===a.id,m=isHost?null:room.members.find(x=>x.id===a.id);if(!isHost&&!m)throw err(404,'들어가 있는 방이 없습니다.','NO_ROOM');
  this.coopTouch(room,a.id);const line={from:{name:isHost?room.host.name:m.name,pid:pidOf(a.id),host:isHost},text,at:now()};
  room.log=[...(room.log||[]),line].slice(-COOP.logKeep);room.updated=now();
  for(const id of [room.host.id,...room.members.map(x=>x.id)])this.broadcast({type:'coop',kind:'say',room:room.id,line},s=>s.account===id);
  return {line};
 },
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
 if(req.method==='GET'){if(path==='/coop/room')return await store.coopStatus(a);if(path==='/coop/list')return store.coopList(a);if(path==='/coop/world')return store.coopWorldFor(a);return undefined;}
 if(req.method!=='POST')return undefined;
 const call={'/coop/open':'coopOpen','/coop/join':'coopJoin','/coop/char':'coopChar','/coop/ready':'coopReady','/coop/leave':'coopLeave','/coop/close':'coopClose','/coop/kick':'coopKick',
  '/coop/invite':'coopInvite','/coop/decline':'coopDecline','/coop/act':'coopAct','/coop/auto':'coopAutoTurn','/coop/claim':'coopClaim',
  '/coop/suggest':'coopSuggest','/coop/say':'coopSay',
  // 0.16 함께 돌아다니기
  '/coop/move':'coopMove','/coop/follow':'coopFollow','/coop/fight':'coopJoinFight','/coop/chests':'coopChests','/coop/chest':'coopChest','/coop/puzzle':'coopPuzzle','/coop/speed':'coopSpeed'}[path];
 if(!call)return undefined;
 return await store[call](a,await body(req));
}
