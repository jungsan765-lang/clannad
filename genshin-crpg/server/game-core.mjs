import {R,DB as GAME_DB,ENGINE_VERSION,ENGINE_FINGERPRINT,ENGINE_COMPATIBILITY} from './generated/engine.mjs';
const encoder=new TextEncoder(),now=()=>Date.now(),elapsed=t=>Math.round((performance.now()-t)*10)/10,JSON_HEADERS={'content-type':'application/json; charset=utf-8','cache-control':'no-store'},json=(x,status=200)=>new Response(JSON.stringify(x),{status,headers:JSON_HEADERS}),jsonText=(text,status=200)=>new Response(text,{status,headers:JSON_HEADERS});
const hex=bytes=>Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,'0')).join('');
const bytes=x=>Uint8Array.from(x.match(/.{2}/g)||[],h=>parseInt(h,16));
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const hash=async x=>hex(await crypto.subtle.digest('SHA-256',typeof x==='string'?encoder.encode(x):x));
const error=(status,message,code)=>Object.assign(new Error(message),{status,code});
const same=(a,b)=>{if(a.length!==b.length)return false;let n=0;for(let i=0;i<a.length;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
async function passwordHash(password,salt,pepper){const key=await crypto.subtle.importKey('raw',encoder.encode(password+'\0'+pepper),'PBKDF2',false,['deriveBits']);return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:bytes(salt),iterations:100000},key,256));}
const admin=(env,id)=>String(env.ADMIN_ACCOUNT_IDS||'').split(',').map(x=>x.trim()).includes(id);
function publicState(state){return {...state,global:{...state.global,PRNG_STATE:1},processed:{}};}
function compact(state){state.log=state.log.slice(-240);const ids=Object.keys(state.processed||{});for(const id of ids.slice(0,-32))delete state.processed[id];return state;}

const UI_SCREENS=new Set(['STORY','STATUS','COMBAT_PREP','COMBAT','SYSTEM','MAIN_MENU','HUB','LOCATION','INVENTORY','PARTY','SHOP','CRAFT','QUEST','RELATIONS','DIALOGUE','BOSS_INTRO','SAVE','LOAD','SETTINGS']);
const ALLOWED=new Set(); // Filled from the checked-in UI action inventory below.

for(const type of ["ABYSS_ENTER", "ABYSS_RESET", "ABYSS_REWARD", "AFFECTION_ENTER", "ARTIFACT_ENHANCE", "BOSS_CONTINUE", "BOSS_LEAVE", "BOSS_ROUTE", "BUY", "CLAIM_QUEST", "COMBAT", "COMBAT_FORFEIT", "COMBAT_BEGIN", "COMBAT_PREPARE", "COMMISSION_ACCEPT", "CONSTELLATION_UNLOCK", "COMMISSION_PUZZLE", "CRAFT", "CRAFT_STAGE", "ENHANCE", "EQUIP", "EQUIPMENT_GUIDE_ACK", "FORMATION_SET", "GEO_OCULUS_OFFER", "GEO_TRAIL_CLAIM", "JOURNEY_RESUME", "LEGEND_ENTER", "LEGEND_REGISTER", "LIFE_CANCEL", "LIFE_FINISH", "LIFE_START", "LIYUE_ARTIFACT_CHALLENGE", "LIYUE_FIELD_ANSWER", "LIYUE_FIELD_BATTLE", "LIYUE_FIELD_CONTINUE", "LIYUE_FIELD_FINISH", "LIYUE_FIELD_INSPECT", "LIYUE_INTERLUDE_ACK", "MAIN_STORY_ACCEPT", "MASTERY", "MENU", "MOND_FIRST_CONTACT", "MOND_MATERIAL_CHALLENGE", "MOVE", "NPC", "OBJECTIVE_PIN", "OBJECTIVE_CLEAR", "COMBAT_FLEE", "TUTORIAL_ACK", "OCULUS_COLLECT", "OCULUS_OFFER", "PARTY", "PARTY_REMOVE", "PARTY_REPLACE", "PARTY_SWAP", "PARTY_TACTIC", "PERSONAL", "PLACE_ENTER", "PLACE_LEAVE", "PREMIUM_BUY", "PREP_LEAVE", "PREP_SELECT", "PRESET_APPLY", "PRESET_DELETE", "PRESET_SAVE", "WISH","QUEST_CHOICE", "RECOVER", "RECRUIT_REJOIN", "RELATION_ACTIVITY", "SELL", "STORY_BATTLE_CONFIRM", "STORY_CHAPTER", "STORY_CHOICE", "STORY_NAME", "STORY_NEXT", "STORY_PAUSE_FREE", "STORY_RESUME", "STORY_RETRY", "STORY_RIDE", "STORY_SCRIPTED_TRAVEL", "TOOL_PREPARE", "TRAVELER_RESONATE", "UNEQUIP", "USE_ITEM", "WAIT", "WORLD_WORK_CANCEL", "WORLD_WORK_FINISH", "WORLD_WORK_START", "ZIBAI_RETURN_CHECK"])ALLOWED.add(type);
async function body(request){const raw=await request.text();if(encoder.encode(raw).length>65536)throw error(413,'요청이 너무 큽니다.');try{return JSON.parse(raw||'{}');}catch{throw error(400,'요청 형식을 확인해 주세요.');}}

function compatible(b){return b.engineVersion?ENGINE_COMPATIBILITY.includes(b.engineVersion):b.version===ENGINE_VERSION;}
function executeAction(b,row,account,env,receivedAt,cachedRuntime=null){
 if(!compatible(b))throw error(409,'게임 업데이트를 확인해 주세요. 저장 기록은 유지됩니다.','VERSION_MISMATCH');
 if(!Number.isSafeInteger(b.revision)||b.revision!==row.revision)throw error(409,'다른 화면에서 진행되었습니다. 최신 자동저장을 이어 받아 주세요.','REVISION_CONFLICT');
  const isDebug=b.type==='OPERATOR_DEBUG',isReading=b.type==='STORY_READ';if(!ALLOWED.has(b.type)&&!isDebug&&!isReading)throw error(400,'지원하지 않는 게임 행동입니다.');if(isDebug&&!admin(env,account.id))throw error(403,'운영자 전용 기능입니다.');
  const runtimeStart=performance.now();let r;try{r=cachedRuntime||new R(GAME_DB,JSON.parse(row.state),true);}catch{throw error(503,'저장 기록을 새 버전에서 여는 데 문제가 있습니다. 원본은 보존되어 있습니다. 운영자에게 알려 주세요.','SAVE_COMPATIBILITY');}const runtimeMs=elapsed(runtimeStart);
  r.serverAdmin=isDebug;const params={...(b.params||{})};for(const key of ['type','id','revision','__proto__','constructor','prototype'])delete params[key];
  // MENU navigation is client-local. Apply its current screen only as part of the next real transaction,
  // preserving story/place menu side effects without creating a standalone save revision.
  const uiScreen=typeof b.uiScreen==='string'&&UI_SCREENS.has(b.uiScreen)?b.uiScreen:'';
  if(b.uiActions!==undefined){
   if(!Array.isArray(b.uiActions)||b.uiActions.length>128||b.uiActions.some(screen=>!UI_SCREENS.has(screen)))throw error(400,'화면 이동 기록을 확인해 주세요.');
   for(const screen of b.uiActions){const reason=r.actionReason('MENU',{screen});if(reason)throw error(409,'현재 화면 상태를 다시 맞춰 주세요.','UI_CONTEXT');r.apply({type:'MENU',screen});}
  }
  if(uiScreen&&uiScreen!==r.s.global.SCREEN_MODE){const menuReason=r.actionReason('MENU',{screen:uiScreen});if(menuReason)throw error(409,'현재 화면 상태를 다시 맞춰 주세요.','UI_CONTEXT');r.apply({type:'MENU',screen:uiScreen});}
  const reading=b.reading??[];
  if(!Array.isArray(reading)||reading.length>64||(isReading&&!reading.length))throw error(400,'읽기 기록 형식을 확인해 주세요.');
  for(const step of reading){
   if(step?.route!==r.s.global.STORY_ROUTE_ID||step.context!==(r.s.storyContext?.entry||''))throw error(409,'이야기 문맥이 달라졌습니다. 최신 기록을 확인해 주세요.','READING_CONTEXT');
   const preview=r.previewStoryRead(step.node,step.type||'STORY_NEXT',step.params||{node:step.node});if(!preview)throw error(409,'읽기 기록을 현재 이야기에서 확인할 수 없습니다.','READING_CONTEXT');r.s=preview.state;
  }
  // Work time begins when this request reaches the Worker, including database/engine work.
  // Client timestamps never authorize elapsed time or rewards.
  r.actionStartedAt=Math.max(receivedAt,row.updated_at||0);
  const engineStart=performance.now();let result;try{result=isReading?{ok:true,type:'STORY_READ',result:{read:reading.length,node:r.storyActiveNodeId()}}:r.action(b.type,params);}finally{delete r.actionStartedAt;}const engineMs=elapsed(engineStart);

 return {r,result,isDebug,runtimeMs,engineMs};
}
export {encoder,now,elapsed,json,jsonText,hex,token,hash,error,same,passwordHash,admin,publicState,compact,ALLOWED,body,executeAction,compatible};
