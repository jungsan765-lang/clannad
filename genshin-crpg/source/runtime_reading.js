/* Conversation journals contain commands, never client-authored saves or rewards. */
(function(root){
'use strict';
const P=root.CRPGRuntime.Runtime.prototype;
P.previewStoryRead=function(node,type='STORY_NEXT',params={node}){
 const before=this.s,n=type==='STORY_CHOICE'?this.storyChoices().find(x=>x[4]===node):this.storyNode();
 if(!['STORY_NEXT','STORY_CHOICE','STORY_NAME'].includes(type)||before.global.SCREEN_MODE!=='STORY'||before.runtime&&!before.runtime.interlude||before.lifeJob||before.worldJob||before.battlePreparation||before.storyJourney||before.storyBreak||!n||n[4]!==node||!['DIALOGUE','NARRATION','CHOICE','INPUT_TEXT'].includes(n[5]))return null;
 if(type==='STORY_NAME'&&(n[5]!=='INPUT_TEXT'||params.name!==before.global.PLAYER_NAME))return null;
 try{
  const result=this.action(type,type==='STORY_NAME'?{name:params.name}:{node}),state=this.s;
  // Server randomness is private. Battle resolution and random rewards remain boundaries.
  // Deterministic dialogue flags, costs and choices are replayed and validated atomically.
  if(state.global.PRNG_STATE!==before.global.PRNG_STATE||!!state.runtime!==!!before.runtime||state.battlePreparation||state.lifeJob||state.worldJob)return null;
  if(before.runtime&&JSON.stringify(before.runtime)!==JSON.stringify(state.runtime))return null;
  const boundary=state.global.SCREEN_MODE!=='STORY'||!!state.storyJourney||!!state.storyBreak||state.storyContext?.entry!==before.storyContext?.entry;
  return {state,result,boundary};
 }catch{return null;}finally{this.s=before;}
};
})(globalThis);

/* Authored speech variants for the 002.01 farewell only. Read-only presentation.
 * Project choice, not a claim about the original game's voice-unlock rules. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;
if(api.mainStorySpeechVersion===1)return;
const previous=P.storyDisplayText,PROFILE='PROFILE_MOND_JEAN',BOND_MIN=60;
const FAMILIAR=Object.freeze({"ISK_L01_K_002":"잠깐. 가방끈이 뒤집혔어. 그대로 걸으면 어깨가 쓸릴 거야. 짐 좀 내려 봐.","ISK_L01_K_004":"이쪽을 잡아 줘. 안에 든 천을 받치면 낫겠네. 먼 길 갈 건데, 이런 건 참지 말고.","ISK_L01_K_007":"다행이네. 가다가 다시 불편하면 바로 고쳐. 리월에 도착하면 편지 보내 줘. 잘 도착했는지 궁금할 테니까.","ISK_L01_K_009":"물론이지. 음식 이야기 전에 잘 도착했다는 말부터 써 줘. 기다리는 사람부터 안심시켜야지.","ISK_L01_K_012":"물론이야. 나도 그 자리에 있었잖아. 죽어 있었던 일도, 다시 살아난 일도 남길게. 이유를 모른다고 본 것까지 지우지는 않아.","ISK_L01_K_014":"필요하면 내게 연락해. 몬드에서 함께 겪은 일은 내가 증언할게. 오늘은 도착해서 쉴 곳부터 찾고. 편지 기다릴게."});
P.storyDisplayText=function(row){
 const n=row||this.storyNode(),text=previous.call(this,n);
 if(this.s?.global?.STORY_ROUTE_ID!=='ROUTE_ISEKAI'||this.s.storyContext||n?.[0]!=='ROUTE_ISEKAI'||n?.[1]!=='Q_ISK_LIYUE_01'||n?.[5]!=='DIALOGUE'||n?.[6]!==PROFILE||!Object.hasOwn(FAMILIAR,n[4]))return text;
 const bond=this.storyBond(PROFILE);
 return Number.isFinite(bond)&&bond>=BOND_MIN?FAMILIAR[n[4]]:text;
};
api.mainStorySpeechVersion=1;
api.mainStorySpeechPolicy=Object.freeze({profile:PROFILE,bondMin:BOND_MIN,scope:'002.01',readOnly:true});
})(globalThis);
