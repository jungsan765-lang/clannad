(function(root){
'use strict';
const copy=x=>JSON.parse(JSON.stringify(x)), ENVELOPE_SCHEMA=1;
class SaveError extends Error{constructor(code,message,cause){super(message);this.name='SaveError';this.code=code;this.cause=cause;}}
const fail=(code,message)=>{throw new SaveError(code,message)};
function cleanTransient(value){
 const state=copy(value);
 for(const key of ['relationshipConsent','consent','consentToken','matureSceneSession','adultModeEnabled'])delete state[key];
 if(state.global)for(const key of ['ADULT_CONSENT_FLAG','ADULT_CONSENT_STATE','CURRENT_SCENE_CONSENT','adultModeEnabled'])delete state.global[key];
 for(const r of Object.values(state.relations||{}))for(const key of ['consent','consentToken','ADULT_CONSENT_FLAG','ADULT_CONSENT_STATE'])delete r[key];
 return state;
}
function validateState(state){
 if(state?.schema!==2||state.global?.SAVE_SCHEMA_VERSION!==2)fail('SAVE_SCHEMA','지원하지 않는 게임 저장 버전입니다.');
 const g=state.global;
 if(!g.SAVE_ID||!g.STORY_ROUTE_ID||!Number.isSafeInteger(g.SAVE_REVISION)||g.SAVE_REVISION<0||!Number.isInteger(g.PRNG_STATE))fail('SAVE_INVALID','저장 식별자·루트·진행·난수 정보가 올바르지 않습니다.');
 if(!Array.isArray(state.party)||!Array.isArray(state.inventory)||!state.quests||!state.relations||!state.flags)fail('SAVE_INVALID','저장 데이터가 불완전합니다.');
 if(g.MODE==='COMBAT'&&(!state.runtime||state.runtime.id!==g.ACTIVE_BATTLE_ID||state.runtime.phase!=='WAIT_PLAYER'))fail('SAVE_BOUNDARY','전투 행동이 끝난 뒤 저장할 수 있습니다.');
 return state;
}
function summary(state,name){const g=state.global;return {name:name||g.PLAYER_NAME||'이름 없는 저장',playerName:g.PLAYER_NAME||'',route:g.STORY_ROUTE_ID,map:g.CURRENT_MAP_ID,day:g.WORLD_DAY,time:g.WORLD_TIME,revision:g.SAVE_REVISION};}
function assertSafeJSON(value){
 if(!value||typeof value!=='object')return;
 for(const [k,v]of Object.entries(value)){if(['__proto__','prototype','constructor'].includes(k))fail('SAVE_INVALID','가져올 저장에 허용되지 않는 속성이 있습니다.');assertSafeJSON(v);}
}
class SaveAdapter{
 constructor({indexedDB=root.indexedDB,dbName='crpg-player-saves',contentVersion='unknown',compatibleContentVersions=[],validate=validateState,migrate=s=>s,maxImportBytes=20*1024*1024,onError}={}){
  this.indexedDB=indexedDB;this.dbName=dbName;this.contentVersion=contentVersion;this.compatibleContentVersions=new Set(compatibleContentVersions);this.validate=validate;this.migrate=migrate;this.maxImportBytes=maxImportBytes;this.onError=onError;this.db=null;this.lastError=null;this.listeners=new Set();this.channel=null;
  if(typeof root.BroadcastChannel==='function'){this.channel=new root.BroadcastChannel(dbName);this.channel.onmessage=e=>this.emit({...e.data,type:e.data?.operation==='delete'?'external-delete':'external-save'});}
 }
 subscribe(fn){this.listeners.add(fn);return()=>this.listeners.delete(fn);}
 emit(event){for(const fn of this.listeners)try{fn(event)}catch{}}
 clearError(){this.lastError=null;this.emit({type:'error-cleared'});}
 report(error){const e=error instanceof SaveError?error:new SaveError(error?.name==='QuotaExceededError'?'SAVE_QUOTA':'SAVE_FAILED',error?.name==='QuotaExceededError'?'저장 용량이 부족합니다. 이전 저장은 유지됩니다. 파일로 내보내 주세요.':'저장에 실패했습니다. 이전 저장은 유지됩니다. 파일로 내보내 주세요.',error);this.lastError={code:e.code,message:e.message,at:new Date().toISOString(),canExport:true};this.emit({type:'save-error',error:this.lastError});if(this.onError)this.onError(this.lastError);return e;}
 async open(){
  if(this.db)return this.db;
  if(!this.indexedDB)throw this.report(new SaveError('INDEXEDDB_UNAVAILABLE','이 환경에서 브라우저 저장소를 사용할 수 없습니다. 파일로 내보내 주세요.'));
  return new Promise((resolve,reject)=>{
   const req=this.indexedDB.open(this.dbName,1);
   req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('slots'))db.createObjectStore('slots',{keyPath:'slotId'});if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings',{keyPath:'key'});if(!db.objectStoreNames.contains('backups'))db.createObjectStore('backups',{keyPath:'id'});};
   req.onsuccess=()=>{this.db=req.result;this.db.onversionchange=()=>{this.db.close();this.db=null;this.emit({type:'storage-version-change'});};resolve(this.db);};
   req.onerror=()=>reject(this.report(req.error));
   req.onblocked=()=>{reject(this.report(new SaveError('SAVE_BLOCKED','다른 탭이 저장소 갱신을 막고 있습니다. 해당 탭을 닫고 다시 시도해 주세요.')));};
  });
 }
 async transact(stores,mode,work){
  const db=await this.open();return new Promise((resolve,reject)=>{
   let tx,result,reported;
   try{tx=db.transaction(stores,mode);}catch(e){reject(this.report(e));return;}
   tx.oncomplete=()=>resolve(result);
   tx.onabort=()=>reject(this.report(reported||tx.error||new SaveError('SAVE_ABORTED','저장이 중단됐습니다. 이전 저장은 유지됩니다.')));
   tx.onerror=()=>{};
   const set=value=>{result=value;};const abort=error=>{reported=error;tx.abort();};
   try{work(tx,set,abort)}catch(error){abort(error)}
  });
 }
 prepare(input){assertSafeJSON(input);const state=this.migrate(cleanTransient(input));validateState(state);const validated=this.validate(state);return validated||state;}
 validateContentVersion(version){if(version&&version!=='legacy'&&version!=='unknown'&&this.contentVersion!=='unknown'&&version!==this.contentVersion&&!this.compatibleContentVersions.has(version))fail('SAVE_CONTENT_VERSION','이 저장에 사용된 콘텐츠 버전의 호환 확인이 필요합니다. 원본 저장은 유지됩니다.');}
 async save(slotId,input,{expectedSlotRevision=0,name,replace=false,backup}={}){
  try{
   if(typeof slotId!=='string'||!slotId||slotId.length>100||!Number.isSafeInteger(expectedSlotRevision)||expectedSlotRevision<0)fail('SAVE_SLOT','저장 슬롯 정보가 올바르지 않습니다.');
   const state=this.prepare(input), savedAt=new Date().toISOString();
   const envelope={envelopeSchema:ENVELOPE_SCHEMA,runtimeSchema:2,contentVersion:this.contentVersion,slotId,slotRevision:expectedSlotRevision+1,saveId:state.global.SAVE_ID,savedAt,summary:summary(state,name),state};
   const result=await this.transact(['slots','backups'],'readwrite',(tx,set,abort)=>{
    const store=tx.objectStore('slots'),request=store.get(slotId);
    request.onsuccess=()=>{
     const previous=request.result;
     if((previous?.slotRevision||0)!==expectedSlotRevision){abort(new SaveError('SAVE_CONFLICT','다른 탭에서 이 슬롯이 변경됐습니다. 최신 저장을 불러오거나 새 슬롯에 저장해 주세요.'));return;}
     if(previous&&!replace&&previous.saveId!==envelope.saveId){abort(new SaveError('SAVE_IDENTITY','다른 게임의 슬롯입니다. 새 슬롯을 선택해 주세요.'));return;}
     if(previous&&previous.saveId===envelope.saveId&&previous.state.global.SAVE_REVISION>state.global.SAVE_REVISION&&!replace){abort(new SaveError('SAVE_STALE','이전 진행 상태로 최신 저장을 덮어쓸 수 없습니다.'));return;}
     if(backup)tx.objectStore('backups').put({id:slotId+':import:'+envelope.slotRevision,source:backup,createdAt:savedAt});
     if(previous&&(replace||previous.contentVersion!==this.contentVersion))tx.objectStore('backups').put({id:slotId+':before:'+envelope.slotRevision,envelope:previous,createdAt:savedAt});
     store.put(envelope);set(copy(envelope));
    };
   });
   this.emit({type:'saved',slotId,slotRevision:result.slotRevision});this.channel?.postMessage({slotId,slotRevision:result.slotRevision,saveId:result.saveId});return result;
  }catch(e){throw e instanceof SaveError&&this.lastError?.code===e.code?e:this.report(e);}
 }
 async load(slotId){
  try{
   const envelope=await this.transact(['slots'],'readonly',(tx,set)=>{const req=tx.objectStore('slots').get(slotId);req.onsuccess=()=>set(req.result);});
   if(!envelope)fail('SAVE_MISSING','저장된 슬롯을 찾을 수 없습니다.');
   if(envelope.envelopeSchema!==ENVELOPE_SCHEMA)fail('SAVE_SCHEMA','지원하지 않는 저장 파일 버전입니다.');
   this.validateContentVersion(envelope.contentVersion);
   const original=copy(envelope.state);envelope.state=this.prepare(envelope.state);
   envelope.migrationChanged=JSON.stringify(original)!==JSON.stringify(envelope.state);
   if(envelope.migrationChanged)envelope.preMigrationState=original;
   // Display preference is intentionally not taken from imported or loaded data.
   this.emit({type:'loaded',slotId,slotRevision:envelope.slotRevision});return envelope;
  }catch(e){throw this.report(e);}
 }
 async list(){return this.transact(['slots'],'readonly',(tx,set)=>{const req=tx.objectStore('slots').getAll();req.onsuccess=()=>set(req.result.map(({state,...meta})=>meta).sort((a,b)=>b.savedAt.localeCompare(a.savedAt)));});}
 exportState(state,{name}={}){try{const s=this.prepare(state);return JSON.stringify({envelopeSchema:ENVELOPE_SCHEMA,runtimeSchema:2,contentVersion:this.contentVersion,exportedAt:new Date().toISOString(),saveId:s.global.SAVE_ID,summary:summary(s,name),state:s},null,2);}catch(e){throw this.report(e);}}
 async exportSlot(slotId){const envelope=await this.transact(['slots'],'readonly',(tx,set)=>{const req=tx.objectStore('slots').get(slotId);req.onsuccess=()=>set(req.result);});if(!envelope)fail('SAVE_MISSING','저장된 슬롯을 찾을 수 없습니다.');return JSON.stringify(envelope,null,2);}
 parseImport(text){
  try{
   if(typeof text!=='string'||new TextEncoder().encode(text).length>this.maxImportBytes)fail('SAVE_IMPORT_SIZE','저장 파일의 크기가 올바르지 않습니다.');
   const raw=JSON.parse(text);assertSafeJSON(raw);
   if(raw.envelopeSchema!==undefined&&raw.envelopeSchema!==ENVELOPE_SCHEMA)fail('SAVE_SCHEMA','지원하지 않는 저장 파일 버전입니다.');
   this.validateContentVersion(raw.contentVersion);
   const original=raw.state||raw, state=this.prepare(original);return {state,original,contentVersion:raw.contentVersion||'legacy',migrationChanged:JSON.stringify(original)!==JSON.stringify(state)};
  }catch(e){throw this.report(e instanceof SyntaxError?new SaveError('SAVE_CORRUPT','저장 파일을 읽을 수 없습니다. 원본 파일은 변경하지 않았습니다.',e):e);}
 }
 async importJSON(slotId,text,options={}){const parsed=this.parseImport(text);const saved=await this.save(slotId,parsed.state,{...options,backup:{format:'JSON',text,contentVersion:parsed.contentVersion,migrationChanged:parsed.migrationChanged}});return {...saved,migrationChanged:parsed.migrationChanged};}
 async importLegacyLocalStorage(slotId,{storage=root.localStorage,key,expectedSlotRevision=0,name}={}){
  if(!key)throw this.report(new SaveError('LEGACY_KEY','기존 저장의 정확한 키를 지정해 주세요.'));
  let raw;try{raw=storage.getItem(key);}catch(e){throw this.report(e);}
  if(!raw)throw this.report(new SaveError('LEGACY_MISSING','이전 브라우저 저장을 찾을 수 없습니다.'));
  // Never remove the original localStorage save or import its mode setting.
  return this.importJSON(slotId,raw,{expectedSlotRevision,name});
 }
 async getPreferences(){return this.transact(['settings'],'readonly',(tx,set)=>{const req=tx.objectStore('settings').get('display');req.onsuccess=()=>set({adultModeEnabled:req.result?.value?.adultModeEnabled===true,fontSize:Number(req.result?.value?.fontSize)||18});});}
 async setPreferences(value){const prefs={adultModeEnabled:value.adultModeEnabled===true,fontSize:Math.max(16,Math.min(28,Number(value.fontSize)||18))};return this.transact(['settings'],'readwrite',(tx,set)=>{tx.objectStore('settings').put({key:'display',value:prefs});set(prefs);});}
 async remove(slotId,{expectedSlotRevision}={}){
  try{
   if(typeof slotId!=='string'||!slotId||slotId.length>100||!Number.isSafeInteger(expectedSlotRevision)||expectedSlotRevision<1)fail('SAVE_SLOT','삭제할 저장 슬롯 정보가 올바르지 않습니다.');
   const deletedAt=new Date().toISOString();
   const result=await this.transact(['slots','backups'],'readwrite',(tx,set,abort)=>{
    const store=tx.objectStore('slots'),req=store.get(slotId);
    req.onsuccess=()=>{
     const old=req.result;
     if(!old||old.slotRevision!==expectedSlotRevision){abort(new SaveError('SAVE_CONFLICT','슬롯이 변경됐습니다. 목록을 다시 확인해 주세요.'));return;}
     tx.objectStore('backups').put({id:slotId+':deleted:'+old.slotRevision+':'+old.savedAt,envelope:old,createdAt:deletedAt,operation:'DELETE'});
     store.delete(slotId);set(true);
    };
   });
   // Notify only after the atomic transaction commits. A closed channel must not
   // turn a completed deletion into an apparent storage failure.
   this.emit({type:'removed',slotId,slotRevision:expectedSlotRevision,deletedAt});
   try{this.channel?.postMessage({operation:'delete',slotId,slotRevision:expectedSlotRevision,deletedAt});}catch{}
   return result;
  }catch(e){throw e instanceof SaveError&&this.lastError?.code===e.code?e:this.report(e);}
 }
 close(){this.db?.close();this.db=null;this.channel?.close();this.channel=null;}
}
const api={SaveAdapter,SaveError,validateState,cleanTransient,ENVELOPE_SCHEMA};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.CRPGSave=api;
})(typeof globalThis!=='undefined'?globalThis:this);
