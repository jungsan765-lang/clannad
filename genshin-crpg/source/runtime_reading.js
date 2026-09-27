/* A reading checkpoint is an ordered list of validated commands, never a client save. */
(function(root){
'use strict';
const P=root.CRPGRuntime.Runtime.prototype,encode=JSON.stringify;
const readingGlobals=new Set(['CURRENT_STORY_NODE_ID','STORY_CURSOR_NODE_ID','PENDING_CHOICE_GROUP_ID','PENDING_INPUT_JSON','STORY_NODE_EFFECTS_JSON','TURN','SAVE_REVISION','LAST_COMMITTED_ACTION_SEQ','LAST_COMMITTED_ACTION_ID','LAST_ACTION_RECEIPT_JSON']);
P.previewStoryRead=function(node){
 const before=this.s,n=this.storyNode();
 if(before.global.SCREEN_MODE!=='STORY'||before.runtime||before.lifeJob||before.worldJob||before.battlePreparation||before.storyJourney||before.storyBreak||!n||n[4]!==node||!['DIALOGUE','NARRATION'].includes(n[5]))return null;
 // Explicit effects, choices, rewards, travel and battle gates remain immediate transactions.
 if(String(n[12]||'').split(';').some(x=>x.trim()&&!['NONE','NO_COST_NO_PROGRESS','NO_PENALTY','NO_CARD','NO_AUTO_HEART','NO_FORCED_RECRUIT','KEEP_EXISTING_CARD_NO_DUPLICATE','NO_ADULT_COMMIT','NO_AFFECTION_COMPLETE'].includes(x.trim())))return null;
 try{
  const result=this.action('STORY_NEXT',{node}),state=this.s;
  for(const k of new Set([...Object.keys(before.global),...Object.keys(state.global)]))if(!readingGlobals.has(k)&&encode(before.global[k])!==encode(state.global[k]))return null;
  for(const k of new Set([...Object.keys(before),...Object.keys(state)])){
   if(['global','relations','storyMenuFrame'].includes(k))continue;
   if(k==='storyContext'){
    if(encode(before[k]&&{...before[k],node:null})!==encode(state[k]&&{...state[k],node:null}))return null;
   }else if(encode(before[k])!==encode(state[k]))return null;
  }
  // Contact discovery is caused by reading a speaker's line. No affection/reward changes may be deferred.
  for(const id of new Set([...Object.keys(before.relations),...Object.keys(state.relations)])){
   const a=before.relations[id],b=state.relations[id];
   if(a&&encode(a)!==encode(b))return null;
   if(!a&&id!==n[6])return null;
  }
  return {state,result};
 }catch{return null;}finally{this.s=before;}
};
})(globalThis);
