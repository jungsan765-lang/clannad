// 0.15.2 공동 토벌전 on the Seoul account server (the fight itself is runtime_raid_v0152.js). Each sortie's hits are added
// to the week's shared total when the action that ends the battle commits (raidRecord, called inside that transaction, so a
// replayed request never counts twice). Rewards are paid into the save on request: everyone who sortied this week when the
// total reaches 25/50/75/100%, and each adventurer's own hits (100/300/600). The previous week's rewards can still be taken.
import {pidOf} from './social-v01415.mjs';

const now=()=>Date.now();
const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const R=()=>globalThis.CRPGRuntime?.raidV0152;

export function installRaidSchema(db){
 db.exec([
  'CREATE TABLE IF NOT EXISTS raid_hits(battle_id TEXT PRIMARY KEY,event TEXT NOT NULL,account_id TEXT NOT NULL,name TEXT NOT NULL,hits INTEGER NOT NULL,at INTEGER NOT NULL) STRICT',
  'CREATE INDEX IF NOT EXISTS raid_hits_event_idx ON raid_hits(event,account_id)',
  'CREATE TABLE IF NOT EXISTS raid_claims(event TEXT NOT NULL,account_id TEXT NOT NULL,reward TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(event,account_id,reward)) STRICT'
 ].join(';')+';');
}

export const raidMethods={
 // Inside the action's transaction: a sortie that just ended adds its hits once (keyed by battle id). Journeys changed by
 // the operator's debug tools (unranked) do not count.
 raidRecord(a,r,next){
  if(!R()||!next?.ranked)return null;let res;try{res=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'null');}catch{return null;}
  const raid=res?.raid,id=res?.battleId||res?.id;if(!raid||!id||!/^RAID_\d+$/.test(raid.event)||!Number.isInteger(raid.hits)||raid.hits<0)return null;
  const n=Number(this.db.prepare('INSERT OR IGNORE INTO raid_hits VALUES(?,?,?,?,?,?)').run(String(id),raid.event,a.id,a.display_name,raid.hits,now()).changes);
  return n?{event:raid.event,hits:raid.hits}:null;
 },
 raidEventStatus(a,event){
  const cfg=R(),total=this.db.prepare('SELECT COALESCE(SUM(hits),0) AS n FROM raid_hits WHERE event=?').get(event.id).n;
  const mine=this.db.prepare('SELECT COALESCE(SUM(hits),0) AS hits,COUNT(*) AS runs FROM raid_hits WHERE event=? AND account_id=?').get(event.id,a.id);
  const claimed=new Set(this.db.prepare('SELECT reward FROM raid_claims WHERE event=? AND account_id=?').all(event.id,a.id).map(x=>x.reward));
  const top=this.db.prepare('SELECT account_id,MAX(name) AS name,SUM(hits) AS hits,COUNT(*) AS runs FROM raid_hits WHERE event=? GROUP BY account_id ORDER BY hits DESC,MIN(at) LIMIT 10').all(event.id).map((x,i)=>({rank:i+1,name:x.name,pid:pidOf(x.account_id),hits:x.hits,runs:x.runs,me:x.account_id===a.id}));
  const players=this.db.prepare('SELECT COUNT(DISTINCT account_id) AS n FROM raid_hits WHERE event=?').get(event.id).n;
  return {...event,target:cfg.target,total,players,ratio:Math.min(1,total/cfg.target),me:{hits:mine.hits,runs:mine.runs},top,
   stages:cfg.stages.map(s=>({key:s.key,at:s.at,need:Math.ceil(cfg.target*s.at),reward:s.reward,reached:total>=Math.ceil(cfg.target*s.at),claimed:claimed.has(s.key),canClaim:total>=Math.ceil(cfg.target*s.at)&&mine.runs>0&&!claimed.has(s.key)})),
   tiers:cfg.tiers.map(t=>({key:t.key,hits:t.hits,reward:t.reward,reached:mine.hits>=t.hits,claimed:claimed.has(t.key),canClaim:mine.hits>=t.hits&&!claimed.has(t.key)}))};
 },
 raidStatus(a){
  const cfg=R();if(!cfg)throw err(404,'지원하지 않는 요청입니다.');
  const cur=cfg.eventOf(now()),prev=cfg.eventOf(now()-7*86400000);
  return {current:this.raidEventStatus(a,cur),previous:prev.id!==cur.id?this.raidEventStatus(a,prev):null,rules:{rounds:cfg.rounds,sorties:cfg.sorties,minLevel:cfg.minLevel,target:cfg.target}};
 },
 async raidClaim(a,b){
  const cfg=R();if(!cfg)throw err(404,'지원하지 않는 요청입니다.');this.rate('raid-claim:'+a.id,30,600000);
  const cur=cfg.eventOf(now()),prev=cfg.eventOf(now()-7*86400000),event=[cur,prev].find(e=>e.id===String(b?.event||cur.id));if(!event)throw err(400,'이번 주나 지난주의 토벌만 보상을 받을 수 있습니다.');
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
