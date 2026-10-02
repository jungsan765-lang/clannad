// 0.15.2 공동 토벌전 on the Seoul account server (the fight itself is runtime_raid_v0152.js). 0.15.4: the raid is an event
// the operator opens from the console (boss, length in days, goal) and may close early (user: 「공동 토벌전은 이벤트로
// 열거였는데 왜 니 맘대로 열었지?」); nothing opens by itself. The open event is handed to the engine with each action
// (raidActive → env.RAID_EVENT → r.raidServerEvent). Each sortie's hits are added to the event's shared total when the
// action that ends the battle commits (raidRecord, called inside that transaction, so a replayed request never counts twice).
// Rewards are paid into the save on request: everyone who sortied when the total reaches 25/50/75/100% of the goal, and
// each adventurer's own hits (100/300/600). A finished event's rewards can still be taken for seven days.
import {pidOf} from './social-v01415.mjs';

const now=()=>Date.now();
const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const R=()=>globalThis.CRPGRuntime?.raidV0152;
const DAY=86400000,CLAIM_DAYS=7,ID_BASE=1000000;

export function installRaidSchema(db){
 db.exec([
  'CREATE TABLE IF NOT EXISTS raid_hits(battle_id TEXT PRIMARY KEY,event TEXT NOT NULL,account_id TEXT NOT NULL,name TEXT NOT NULL,hits INTEGER NOT NULL,at INTEGER NOT NULL) STRICT',
  'CREATE INDEX IF NOT EXISTS raid_hits_event_idx ON raid_hits(event,account_id)',
  'CREATE TABLE IF NOT EXISTS raid_claims(event TEXT NOT NULL,account_id TEXT NOT NULL,reward TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(event,account_id,reward)) STRICT',
  // 0.15.4: events the operator opened. Engine ids are 'RAID_'+(1000000+id), apart from the 0.15.2 weekly ids (RAID_<week>).
  'CREATE TABLE IF NOT EXISTS raid_events(id INTEGER PRIMARY KEY AUTOINCREMENT,boss TEXT NOT NULL,starts_at INTEGER NOT NULL,ends_at INTEGER NOT NULL,target INTEGER NOT NULL,opened_by TEXT NOT NULL DEFAULT \'\',closed_at INTEGER) STRICT'
 ].join(';')+';');
}
const eventId=row=>'RAID_'+(ID_BASE+row.id);
function eventView(row){
 const cfg=R(),boss=cfg?.bosses.find(b=>b.id===row.boss);
 return {id:eventId(row),boss:row.boss,name:boss?.name||row.boss,text:boss?.text||'',startsAt:row.starts_at,endsAt:row.ends_at,target:row.target,closed:row.closed_at!==null&&row.closed_at!==undefined};
}

export const raidMethods={
 // The event open right now, or null.
 raidActive(t=now()){const row=this.db.prepare('SELECT * FROM raid_events WHERE starts_at<=? AND ends_at>? AND closed_at IS NULL ORDER BY id DESC LIMIT 1').get(t,t);return row?eventView(row):null;},
 // The latest event that has ended within the claim window (for rewards still waiting).
 raidRecent(t=now()){const row=this.db.prepare('SELECT * FROM raid_events WHERE (ends_at<=? OR closed_at IS NOT NULL) AND ends_at>? ORDER BY id DESC LIMIT 1').get(t,t-CLAIM_DAYS*DAY);return row?eventView(row):null;},
 raidById(id){const m=/^RAID_(\d+)$/.exec(String(id||''));if(!m)return null;const n=Number(m[1])-ID_BASE;if(!Number.isSafeInteger(n)||n<1)return null;const row=this.db.prepare('SELECT * FROM raid_events WHERE id=?').get(n);return row?eventView(row):null;},
 // Inside the action's transaction: a sortie that just ended adds its hits once (keyed by battle id). Only sorties of an
 // event the operator opened count; journeys changed by the operator's debug tools (unranked) do not count.
 raidRecord(a,r,next){
  if(!R()||!next?.ranked)return null;let res;try{res=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'null');}catch{return null;}
  const raid=res?.raid,id=res?.battleId||res?.id;if(!raid||!id||!this.raidById(raid.event)||!Number.isInteger(raid.hits)||raid.hits<0)return null;
  const n=Number(this.db.prepare('INSERT OR IGNORE INTO raid_hits VALUES(?,?,?,?,?,?)').run(String(id),raid.event,a.id,a.display_name,raid.hits,now()).changes);
  return n?{event:raid.event,hits:raid.hits}:null;
 },
 raidEventStatus(a,event){
  const cfg=R(),target=event.target||cfg.target,total=this.db.prepare('SELECT COALESCE(SUM(hits),0) AS n FROM raid_hits WHERE event=?').get(event.id).n;
  const mine=this.db.prepare('SELECT COALESCE(SUM(hits),0) AS hits,COUNT(*) AS runs FROM raid_hits WHERE event=? AND account_id=?').get(event.id,a.id);
  const claimed=new Set(this.db.prepare('SELECT reward FROM raid_claims WHERE event=? AND account_id=?').all(event.id,a.id).map(x=>x.reward));
  const top=this.db.prepare('SELECT account_id,MAX(name) AS name,SUM(hits) AS hits,COUNT(*) AS runs FROM raid_hits WHERE event=? GROUP BY account_id ORDER BY hits DESC,MIN(at) LIMIT 10').all(event.id).map((x,i)=>({rank:i+1,name:x.name,pid:pidOf(x.account_id),hits:x.hits,runs:x.runs,me:x.account_id===a.id}));
  const players=this.db.prepare('SELECT COUNT(DISTINCT account_id) AS n FROM raid_hits WHERE event=?').get(event.id).n;
  return {...event,target,total,players,ratio:Math.min(1,total/target),me:{hits:mine.hits,runs:mine.runs},top,
   stages:cfg.stages.map(s=>({key:s.key,at:s.at,need:Math.ceil(target*s.at),reward:s.reward,reached:total>=Math.ceil(target*s.at),claimed:claimed.has(s.key),canClaim:total>=Math.ceil(target*s.at)&&mine.runs>0&&!claimed.has(s.key)})),
   tiers:cfg.tiers.map(t=>({key:t.key,hits:t.hits,reward:t.reward,reached:mine.hits>=t.hits,claimed:claimed.has(t.key),canClaim:mine.hits>=t.hits&&!claimed.has(t.key)}))};
 },
 raidStatus(a){
  const cfg=R();if(!cfg)throw err(404,'지원하지 않는 요청입니다.');
  const cur=this.raidActive(),prev=this.raidRecent();
  return {open:!!cur,current:cur?this.raidEventStatus(a,cur):null,previous:prev?this.raidEventStatus(a,prev):null,closedReason:cur?'':cfg.closed,rules:{rounds:cfg.rounds,sorties:cfg.sorties,minLevel:cfg.minLevel,claimDays:CLAIM_DAYS}};
 },
 async raidClaim(a,b){
  const cfg=R();if(!cfg)throw err(404,'지원하지 않는 요청입니다.');this.rate('raid-claim:'+a.id,30,600000);
  const cur=this.raidActive(),prev=this.raidRecent(),event=[cur,prev].find(e=>e&&e.id===String(b?.event||''));
  if(!event)throw err(400,'지금 열린 토벌이나 끝난 지 '+CLAIM_DAYS+'일이 지나지 않은 토벌만 보상을 받을 수 있습니다.');
  return this.serial(a.id,()=>{
   const st=this.raidEventStatus(a,event),key=String(b?.reward||''),item=st.stages.find(s=>s.key===key)||st.tiers.find(t=>t.key===key);
   if(!item)throw err(400,'받을 보상을 골라 주세요.');if(item.claimed)throw err(409,'이미 받은 보상입니다.');
   if(!item.reached)throw err(409,item.at?'아직 모두의 토벌이 '+Math.round(item.at*100)+'%에 이르지 않았습니다.':'이번 토벌에서 '+item.hits+'번을 맞혀야 받을 수 있습니다.');
   if(item.at&&!st.me.runs)throw err(409,'이 토벌에 한 번 이상 출격해야 받을 수 있습니다.');
   const r=this.liveRuntime(a.id,'보상을 받는 모험가','보상을 받을'),granted=r.raidGrant(item.reward),t=now();
   this.commit(()=>{this.db.prepare('INSERT INTO raid_claims VALUES(?,?,?,?)').run(event.id,a.id,key,t);this.writeSave(a.id,r,'raid-claim-'+event.id+'-'+key+'-'+t,{type:'RAID_CLAIM',event:event.id,reward:key});});
   this.invalidate(a.id);return {event:event.id,reward:key,granted,sync:true};
  });
 },
 // ---------- the operator ----------
 raidAdminList(){
  const cfg=R(),t=now();if(!cfg)throw err(404,'지원하지 않는 요청입니다.');
  const rows=this.db.prepare('SELECT * FROM raid_events ORDER BY id DESC LIMIT 12').all();
  const total=id=>this.db.prepare('SELECT COALESCE(SUM(hits),0) AS hits,COUNT(DISTINCT account_id) AS players FROM raid_hits WHERE event=?').get(id);
  return {now:t,active:this.raidActive(t),bosses:cfg.bosses,defaults:{days:7,target:cfg.target},events:rows.map(row=>{const e=eventView(row),x=total(e.id);return {...e,num:row.id,openedBy:row.opened_by,closedAt:row.closed_at,state:row.closed_at!==null?'CLOSED':row.starts_at>t?'SCHEDULED':row.ends_at<=t?'ENDED':'OPEN',hits:x.hits,players:x.players};})};
 },
 raidAdminOpen(b,actor){
  const cfg=R();if(!cfg)throw err(404,'지원하지 않는 요청입니다.');
  if(this.raidActive())throw err(409,'이미 열린 공동 토벌전이 있습니다. 먼저 닫아 주세요.');
  const boss=cfg.bosses.find(x=>x.id===b?.boss);if(!boss)throw err(400,'토벌할 보스를 골라 주세요.');
  const days=Number(b?.days),target=b?.target===undefined||b?.target===''?cfg.target:Number(b?.target);
  if(!Number.isInteger(days)||days<1||days>30)throw err(400,'기간은 1~30일로 정해 주세요.');
  if(!Number.isInteger(target)||target<100||target>1000000)throw err(400,'목표는 100~1,000,000번으로 정해 주세요.');
  const t=now(),id=Number(this.db.prepare('INSERT INTO raid_events(boss,starts_at,ends_at,target,opened_by) VALUES(?,?,?,?,?)').run(boss.id,t,t+days*DAY,target,String(actor||'')).lastInsertRowid);
  const event=eventView(this.db.prepare('SELECT * FROM raid_events WHERE id=?').get(id));
  this.broadcast({type:'raid-event',open:true,event:event.id},()=>true);return {event};
 },
 raidAdminClose(b){
  const n=Number(b?.num),row=Number.isSafeInteger(n)?this.db.prepare('SELECT * FROM raid_events WHERE id=?').get(n):null;
  if(!row)throw err(404,'닫을 토벌을 찾을 수 없습니다.');if(row.closed_at!==null)throw err(409,'이미 닫힌 토벌입니다.');
  const t=now();this.db.prepare('UPDATE raid_events SET closed_at=?,ends_at=MIN(ends_at,?) WHERE id=?').run(t,t,n);
  const event=eventView(this.db.prepare('SELECT * FROM raid_events WHERE id=?').get(n));
  this.broadcast({type:'raid-event',open:false,event:event.id},()=>true);return {event};
 },
 // The operator's rollback: a reward taken in the reverted steps can be taken again.
 raidUndo(id,receipts){
  const ops=[],lines=[];
  for(const rc of receipts){let res;try{res=JSON.parse(rc.result)?.result;}catch{continue;}if(res?.type!=='RAID_CLAIM')continue;
   ops.push(db=>db.prepare('DELETE FROM raid_claims WHERE event=? AND account_id=? AND reward=?').run(res.event,id,res.reward));lines.push('공동 토벌전 보상('+res.reward+')을 다시 받을 수 있게 돌려놓음');}
  return {lines,changed:ops.length>0,apply:db=>{for(const f of ops)f(db);}};
 }
};

export async function raidRoute(store,a,path,req,url,body){
 if(path==='/raid'&&req.method==='GET')return store.raidStatus(a);
 if(path==='/raid/claim'&&req.method==='POST')return await store.raidClaim(a,await body(req));
 return undefined;
}
