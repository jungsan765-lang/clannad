// Server-owned balance profiles. A revision is immutable; applying or restoring a
// profile appends a revision and moves the current pointer in one SQLite transaction.
// The authored content database and player saves are never rewritten by this tool.
import {R,DB as GAME_DB,ENGINE_FINGERPRINT} from './generated/engine.mjs';
import {canonical} from './state-parts.mjs';

const err=(status,message,code)=>Object.assign(new Error(message),{status,code});
const copy=x=>structuredClone(x);
const empty=()=>engine()?.emptyConfig?.()||({tables:[],enemies:{},characters:{},cards:{},economy:{},encounters:{}});
const engine=()=>globalThis.CRPGRuntime?.adminBalance;
const MAX_CONFIG_BYTES=480*1024,MAX_NOTE=500;

export function installBalanceSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS balance_profiles(
  revision INTEGER PRIMARY KEY CHECK(revision>=0),config TEXT NOT NULL,actor TEXT NOT NULL,note TEXT NOT NULL,
  source_revision INTEGER,engine_version TEXT NOT NULL,created_at INTEGER NOT NULL
 ) STRICT;
 CREATE TABLE IF NOT EXISTS balance_current(singleton INTEGER PRIMARY KEY CHECK(singleton=1),revision INTEGER NOT NULL,
  FOREIGN KEY(revision) REFERENCES balance_profiles(revision)) STRICT;`);
 db.prepare('INSERT OR IGNORE INTO balance_profiles VALUES(?,?,?,?,?,?,?)').run(0,JSON.stringify(empty()),'system','기본 밸런스',null,ENGINE_FINGERPRINT,0);
 db.prepare('INSERT OR IGNORE INTO balance_current VALUES(1,0)').run();
}

// IDs and fields, rather than array positions, make the preview readable and stable.
function cells(config){
 const map=new Map();
 for(const row of config.tables||[])map.set('tables/'+row.table+'/'+row.id+'/'+row.column,row.value);
 for(const section of ['enemies','characters','cards'])for(const [id,values]of Object.entries(config[section]||{}))for(const [field,value]of Object.entries(values))map.set(section+'/'+id+'/'+field,value);
 for(const [field,value]of Object.entries(config.economy||{}))map.set('economy/'+field,value);
 for(const [id,values]of Object.entries(config.encounters||{}))map.set('encounters/'+id,values);
 const growth=(value,path=['growth'])=>{for(const[key,entry]of Object.entries(value||{})){if(entry&&typeof entry==='object'&&!Array.isArray(entry))growth(entry,[...path,key]);else map.set([...path,key].join('/'),entry);}};growth(config.growth);
 return map;
}
export function balanceChanges(before,after,metadata=new Map()){
 const a=cells(before),b=cells(after),paths=[...new Set([...a.keys(),...b.keys()])].sort();
 return paths.filter(path=>canonical(a.get(path)??null)!==canonical(b.get(path)??null)).map(path=>{const field=metadata.get(path);return{path,label:field?.label||path,before:copy(a.has(path)?a.get(path):field?.base??null),after:copy(b.has(path)?b.get(path):field?.base??null),resetToDefault:!b.has(path)};});
}

export class AdminBalanceStore{
 constructor(store){this.store=store;this.db=store.db;this.profiles=new Map();this.baseCatalog=null;this.runtimeDB={...GAME_DB};installBalanceSchema(this.db);}
 currentRevision(){return this.db.prepare('SELECT revision FROM balance_current WHERE singleton=1').get().revision;}
 profile(revision=this.currentRevision()){
  if(!Number.isSafeInteger(revision)||revision<0)throw err(400,'밸런스 판 번호를 확인해 주세요.','BALANCE_INVALID');
  let profile=this.profiles.get(revision);
  if(!profile){const row=this.db.prepare('SELECT revision,config FROM balance_profiles WHERE revision=?').get(revision);if(!row)throw err(404,'해당 밸런스 판을 찾을 수 없습니다.','BALANCE_NOT_FOUND');profile={revision:row.revision,config:JSON.parse(row.config)};}
  this.profiles.delete(revision);this.profiles.set(revision,profile);while(this.profiles.size>32)this.profiles.delete(this.profiles.keys().next().value);
  // Identity remains identity when a later release adds an optional editor area.
  // Old SQLite revision-0 rows need no data migration or history rewrite.
  return revision===0?{revision:0,config:empty()}:copy(profile);
 }
 revisionForState(state){
  // A pre-tool battle has the identity profile. A later profile cannot change a
  // fight's damage, healing, enemy lineup or prices halfway through that fight.
  const battle=state?.runtime;if(!battle||typeof battle!=='object')return this.currentRevision();
  if(battle.adminBalanceRevision===undefined)return 0;
  if(!Number.isSafeInteger(battle.adminBalanceRevision)||battle.adminBalanceRevision<0)throw err(503,'전투의 밸런스 판 기록을 확인할 수 없습니다. 원본 저장은 보존되어 있습니다.','BALANCE_SAVE_INVALID');
  return battle.adminBalanceRevision;
 }
 revisionForParts(parts){
  // State shards keep runtime children separate; no full save decode is needed.
  const marker=parts?.get('["runtime"]');
  if(!marker||marker==='null')return this.currentRevision();
  const value=parts.get('["runtime","adminBalanceRevision"]');
  if(value===undefined)return 0;
  let revision;try{revision=JSON.parse(value);}catch{throw err(503,'전투의 밸런스 판 기록을 확인할 수 없습니다.','BALANCE_SAVE_INVALID');}
  if(!Number.isSafeInteger(revision)||revision<0)throw err(503,'전투의 밸런스 판 기록을 확인할 수 없습니다.','BALANCE_SAVE_INVALID');
  return revision;
 }
 responseForParts(parts){return this.profile(this.revisionForParts(parts));}
 runtimeRevision(runtime){return engine()?.profileOf(runtime)?.revision??0;}
 runtime(DB=GAME_DB,state=null,takeOwnership=false){
  return this.runtimeAtRevision(DB,state,this.revisionForState(state),takeOwnership);
 }
 runtimeAtRevision(DB=GAME_DB,state=null,revision=0,takeOwnership=false){
  const profile=this.profile(revision),api=engine();
  // Each server/store owns a DB identity. Two test servers can both have revision
  // 1 with different numbers without sharing prepared profile/cache entries.
  const runtimeDB=DB===GAME_DB?this.runtimeDB:DB;
  if(api)return api.createRuntime(runtimeDB,state,profile,takeOwnership);
  if(profile.revision!==0)throw err(503,'이 서버의 게임 규칙에 밸런스 도구가 아직 포함되지 않았습니다.','BALANCE_ENGINE_MISSING');
  return new R(runtimeDB,state,takeOwnership);
 }
 catalog(){
  if(!this.baseCatalog){const api=engine();if(!api)throw err(503,'게임 규칙을 다시 빌드한 뒤 밸런스 도구를 이용해 주세요.','BALANCE_ENGINE_MISSING');const r=new R(this.runtimeDB);r.newGame({name:'밸런스 목록',route:'ROUTE_TRAVELER',saveId:'BALANCE-CATALOG',seed:1});this.baseCatalog=api.catalog(r);}
  return copy(this.baseCatalog);
 }
 validate(config){
  if(config===null||typeof config!=='object'||Array.isArray(config))throw err(400,'밸런스 수치를 확인해 주세요.','BALANCE_INVALID');
  let text;try{text=JSON.stringify(config);}catch{throw err(400,'밸런스 수치 형식을 확인해 주세요.','BALANCE_INVALID');}
  if(Buffer.byteLength(text)>MAX_CONFIG_BYTES)throw err(413,'밸런스 수치가 너무 많습니다.');
  const api=engine();if(!api)throw err(503,'게임 규칙을 다시 빌드한 뒤 이용해 주세요.','BALANCE_ENGINE_MISSING');
  try{return api.validateConfig(config,this.catalog());}catch(e){throw err(400,e.message||'적용할 수 없는 밸런스 수치입니다.','BALANCE_INVALID');}
 }
 changes(before,after){
  if(!this.changeMetadata){const c=this.catalog(),map=new Map();for(const row of c.tables)for(const f of row.fields)map.set('tables/'+row.table+'/'+row.id+'/'+f.key,{label:row.name+' · '+f.label,base:f.base});for(const section of ['enemies','characters','cards'])for(const row of c[section])for(const f of row.fields)map.set(section+'/'+row.id+'/'+f.key,{label:row.name+' · '+f.label,base:f.base});for(const f of c.economy)map.set('economy/'+f.key,{label:f.label,base:f.base});for(const row of c.encounters)map.set('encounters/'+row.id,{label:row.name+' · 적 편성',base:row.members});for(const row of c.growth||[])for(const f of row.fields)map.set(['growth',...f.path].join('/'),{label:row.name+' · '+f.label,base:f.base});this.changeMetadata=map;}
  return balanceChanges(before,after,this.changeMetadata);
 }
 expect(expectedRevision){if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0)throw err(400,'현재 밸런스 판 번호가 필요합니다. 목록을 다시 열어 주세요.','BALANCE_INVALID');if(expectedRevision!==this.currentRevision())throw err(409,'다른 창에서 밸런스가 변경되었습니다. 최신 수치를 다시 확인해 주세요.','BALANCE_REVISION_CONFLICT');}
 expectAction(expectedRevision,parts=null){
  const actual=parts?this.revisionForParts(parts):this.currentRevision();
  // Existing clients remain valid on the identity profile. Once edited, all real
  // transactions must declare the profile used for their displayed quote/rules.
  if(expectedRevision===undefined&&actual===0)return;
  if(!Number.isSafeInteger(expectedRevision)||expectedRevision!==actual)throw err(409,'밸런스가 변경되었습니다. 최신 화면을 다시 받아 주세요.','BALANCE_REVISION_CONFLICT');
 }
 history(){return this.db.prepare('SELECT revision,actor,note,source_revision AS sourceRevision,engine_version AS engineVersion,created_at AS at FROM balance_profiles ORDER BY revision DESC LIMIT 100').all();}
 view(){return {...this.profile(),catalog:this.catalog(),history:this.history()};}
 preview(body){this.expect(body?.expectedRevision);const config=this.validate(body?.config),current=this.profile(),changes=this.changes(current.config,config);return {revision:current.revision,config,changes,unchanged:changes.length===0};}
 apply(body,actor,ip,{targetRevision=null}={}){
  this.expect(body?.expectedRevision);
  if(body.note!==undefined&&(typeof body.note!=='string'||[...body.note].length>MAX_NOTE))throw err(400,'변경 메모는 500자까지 입력해 주세요.','BALANCE_INVALID');
  const note=String(body.note||'').replace(/[\x00-\x1f\x7f]/g,' ').trim(),config=this.validate(body.config),changes=this.changes(this.profile().config,config),db=this.db;
  db.exec('BEGIN IMMEDIATE');let revision;
  try{
   this.expect(body.expectedRevision);revision=body.expectedRevision+1;
   db.prepare('INSERT INTO balance_profiles VALUES(?,?,?,?,?,?,?)').run(revision,JSON.stringify(config),String(actor),note,targetRevision,ENGINE_FINGERPRINT,Date.now());
   const moved=db.prepare('UPDATE balance_current SET revision=? WHERE singleton=1 AND revision=?').run(revision,body.expectedRevision);
   if(moved.changes!==1)throw err(409,'다른 창에서 밸런스가 변경되었습니다.','BALANCE_REVISION_CONFLICT');
   db.prepare('INSERT INTO admin_audit(actor,ip,target_id,target_name,op,detail,created_at) VALUES(?,?,NULL,NULL,?,?,?)').run(String(actor),String(ip||''),targetRevision===null?'balance-apply':'balance-rollback',JSON.stringify({revision,previousRevision:body.expectedRevision,sourceRevision:targetRevision,note,changes}),Date.now());
   db.exec('COMMIT');
  }catch(e){if(db.isTransaction)db.exec('ROLLBACK');throw e;}
  this.store.cache.clear();this.store.profileCache?.clear();
  this.store.broadcast({type:'balance',sync:true,revision});
  return {...this.view(),changes};
 }
 rollback(body,actor,ip){
  this.expect(body?.expectedRevision);if(!Number.isSafeInteger(body?.targetRevision)||body.targetRevision<0)throw err(400,'복원할 밸런스 판 번호를 확인해 주세요.','BALANCE_INVALID');
  const target=this.profile(body.targetRevision);return this.apply({...body,config:target.config},actor,ip,{targetRevision:target.revision});
 }
}
