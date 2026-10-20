// 0.16.61 서버 문 (user, 2026-10-18: 「서버 닫거나 여는걸 운영자에 추가해준다거나」, 「서버 인원이 너무 많아서 병목이 생기면 알아서
// 막아준다거나」). One gate in front of the game server:
//  - open / closed: the operator closes the server (점검). Players cannot log in or act; operator accounts still can. Everyone
//    with a live stream hears it at once ({type:'server'}).
//  - full: at most `maxOnline` players at once (seen in the last 5 minutes). A player already in keeps playing; a new login waits.
//  - busy: when the event loop keeps falling behind (its average delay over two 2-second windows in a row — one long task is not
//    a crowd), new logins and new accounts are turned away until it recovers, so the players already in keep their speed.
// The state lives in SQLite (server_gate), so a restart keeps a closed server closed. A refused action is never applied:
// its error says so (outcome REJECTED), and the client drops it instead of retrying it.
import {monitorEventLoopDelay} from 'node:perf_hooks';

const ONLINE_MS=5*60*1000,SAMPLE_MS=2000,RESOLUTION_MS=20,BUSY_MEAN_MS=120,CALM_MEAN_MS=40,WARMUP_MS=20000,DEFAULT_MAX=Number(process.env.CRPG_MAX_ONLINE||300);
const err=(status,message,code)=>Object.assign(new Error(message),{status,code,outcome:'REJECTED'});
const clean=x=>String(x??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,120);

export class ServerGate{
 constructor(store){
  this.store=store;this.db=store.db;this.seen=new Map();this.busy=false;this.p99=0;this.mean=0;this.slow=0;this.lastSample=0;this.started=Date.now();
  this.db.exec('CREATE TABLE IF NOT EXISTS server_gate(id INTEGER PRIMARY KEY CHECK(id=1),open INTEGER NOT NULL,message TEXT NOT NULL,max_online INTEGER NOT NULL,updated_at INTEGER NOT NULL,updated_by TEXT NOT NULL)');
  const row=this.db.prepare('SELECT * FROM server_gate WHERE id=1').get();
  this.state=row?{open:row.open===1,message:row.message,maxOnline:row.max_online,updatedAt:row.updated_at,updatedBy:row.updated_by}:{open:true,message:'',maxOnline:Math.max(1,Math.min(5000,Math.round(DEFAULT_MAX)||300)),updatedAt:0,updatedBy:''};
  this.loop=monitorEventLoopDelay({resolution:RESOLUTION_MS});this.loop.enable();
  this.timer=setInterval(()=>this.sample(),SAMPLE_MS);this.timer.unref?.();
 }
 close(){clearInterval(this.timer);this.loop.disable();}
 sample(){
  const p99=this.loop.percentile(99)/1e6,mean=this.loop.mean/1e6;this.loop.reset();this.p99=Math.round(p99);this.mean=Math.round(mean);this.lastSample=Date.now();
  // the sampler's own 20ms resolution is in every reading; a busy server is behind on average, window after window
  this.slow=mean>BUSY_MEAN_MS?this.slow+1:0;if(Date.now()-this.started<WARMUP_MS)return;
  if(!this.busy&&this.slow>=2)this.busy=true;else if(this.busy&&mean<CALM_MEAN_MS)this.busy=false;
  const t=Date.now();for(const [id,at] of this.seen)if(t-at>ONLINE_MS)this.seen.delete(id);
 }
 admin(id){return this.store.admins?.has?.(id);}
 online(){const t=Date.now();let n=0;for(const at of this.seen.values())if(t-at<=ONLINE_MS)n++;return n;}
 // An authorised request from an account: it is online now.
 touch(id){if(id)this.seen.set(id,Date.now());}
 closedText(){return '서버 점검 중입니다.'+(this.state.message?' '+this.state.message:' 잠시 뒤 다시 들어와 주세요.');}
 // Before a login or a new account: the operator's closed server, a full server, a busy server.
 admitLogin(id){
  if(!this.state.open&&!this.admin(id))throw err(503,this.closedText(),'SERVER_CLOSED');
  if(this.admin(id)||(id&&this.seen.has(id)))return;
  const n=this.online();if(n>=this.state.maxOnline)throw err(503,'접속 인원이 가득 찼습니다 ('+n+' / '+this.state.maxOnline+'명). 잠시 뒤 다시 들어와 주세요.','SERVER_FULL');
  if(this.busy)throw err(503,'서버가 붐빕니다. 지금 접속한 모험가들이 먼저 플레이하고 있어요. 1~2분 뒤 다시 들어와 주세요.','SERVER_BUSY');
 }
 admitRegister(){
  if(!this.state.open)throw err(503,this.closedText(),'SERVER_CLOSED');
  const n=this.online();if(n>=this.state.maxOnline)throw err(503,'접속 인원이 가득 찼습니다 ('+n+' / '+this.state.maxOnline+'명). 잠시 뒤 다시 시도해 주세요.','SERVER_FULL');
  if(this.busy)throw err(503,'서버가 붐빕니다. 1~2분 뒤 다시 시도해 주세요.','SERVER_BUSY');
 }
 // Before anything a logged-in player does in the game (actions, chat lines, trades): only a closed server stops it.
 admitPlay(id){if(!this.state.open&&!this.admin(id))throw err(503,this.closedText(),'SERVER_CLOSED');}
 // The delays shown are past the sampler's own 20ms tick (an idle server shows about 0).
 view(){return {...this.state,online:this.online(),busy:this.busy,eventLoopP99Ms:this.p99,eventLoopMeanMs:this.mean,eventLoopDelayMs:Math.max(0,this.mean-RESOLUTION_MS),eventLoopP99DelayMs:Math.max(0,this.p99-RESOLUTION_MS),sampledAt:this.lastSample,rssMiB:Math.round(process.memoryUsage().rss/1048576),streams:this.store.subscribers?.size||0,cachedRuntimes:this.store.cache?.size||0};}
 set(b,actor){
  const open=b?.open===undefined?this.state.open:!!b.open,message=b?.message===undefined?this.state.message:clean(b.message),max=b?.maxOnline===undefined?this.state.maxOnline:Number(b.maxOnline);
  if(!Number.isSafeInteger(max)||max<1||max>5000)throw Object.assign(new Error('최대 접속 인원은 1~5000명입니다.'),{status:400});
  const changed=open!==this.state.open;this.state={open,message,maxOnline:max,updatedAt:Date.now(),updatedBy:String(actor||'')};
  this.db.prepare('INSERT INTO server_gate VALUES(1,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET open=excluded.open,message=excluded.message,max_online=excluded.max_online,updated_at=excluded.updated_at,updated_by=excluded.updated_by').run(open?1:0,message,max,this.state.updatedAt,this.state.updatedBy);
  if(changed)this.store.broadcast?.({type:'server',open,message:open?'서버가 열렸습니다.':this.closedText()});
  return this.view();
 }
}
