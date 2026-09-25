/* Shared, data-driven 55/57 story interpreter. Load after runtime_story.js. */
(function (root) {
'use strict';
const api = typeof module !== 'undefined' && module.exports ? require('./runtime_story.js') : root.CRPGRuntime;
const {Runtime, RuleError} = api, P = Runtime.prototype;
const copy = x => JSON.parse(JSON.stringify(x));
const readJSON = (s, fallback = {}) => { if (s == null || s === '') return fallback; if (typeof s === 'object') return s; try { return JSON.parse(s); } catch { throw new RuleError('STORY_JSON', '콘텐츠의 JSON 형식이 올바르지 않습니다.'); } };
const fail = (code, message) => { throw new RuleError(code, message); };
const scalar = s => s === 'TRUE' ? true : s === 'FALSE' ? false : /^[-+]?\d+(?:\.\d+)?$/.test(s) ? Number(s) : /^(["']).*\1$/.test(s) ? s.slice(1,-1) : s;
const truth = x => x === true || x === 'TRUE' || x === 'Y';
const NODE_COLUMNS = ['ROUTE_ID','QUEST_ID','ARC_ID','SCENE_ID','NODE_ID','NODE_TYPE','SPEAKER_REF','SPEAKER_NAME','MAP_ID','TEXT_KO','CHOICE_LABEL','PRECONDITION','EFFECT_ON_RESOLVE','NEXT_NODE_ID','CHOICE_GROUP_ID','ASSET_ROW_ID','CANON_SCOPE','ORDER_INDEX','STATUS','NOTE'];
const TABLE_MAIN = '55_MAIN_STORY_DB', TABLE_PERSONAL = '57_MOND_STORY_SCENE_DB';
const NO_EFFECT = new Set(['NO_COST_NO_PROGRESS','NO_PENALTY','NO_CARD','NO_AUTO_HEART','NO_FORCED_RECRUIT','KEEP_EXISTING_CARD_NO_DUPLICATE','NO_ADULT_COMMIT','NO_AFFECTION_COMPLETE']);

// Parse all input first; unsupported syntax is an error, never a false condition.
function parseCondition(source) {
  const text = String(source ?? '').trim();
  if (!text || text === 'NONE' || text === '없음') return {type:'literal',value:true};
  const tokens = []; let i = 0;
  while (i < text.length) {
    if (/\s/.test(text[i])) { i++; continue; }
    const match = /^(?:&&|\|\||>=|<=|!=|==|[(),.!:<> =]|[-+]?\d+(?:\.\d+)?|[A-Za-z_가-힣][A-Za-z_0-9가-힣]*|"[^"\n]*"|'[^'\n]*')/.exec(text.slice(i));
    if (!match) fail('CONDITION_SYNTAX','해석할 수 없는 조건식: '+text.slice(i));
    tokens.push(match[0]); i += match[0].length;
  }
  let p = 0;
  const take = token => { if (tokens[p++] !== token) fail('CONDITION_SYNTAX','조건식 기호가 올바르지 않습니다: '+text); };
  function atom() {
    if (tokens[p] === '(') { p++; const v=or(); take(')'); return v; }
    if (tokens[p] === '!' || tokens[p] === 'NOT') { p++; return {type:'not',value:atom()}; }
    let name=tokens[p++]; if (!name) fail('CONDITION_SYNTAX','조건식이 중간에 끝났습니다.');
    let lhs;
    if (name==='FLAG' && tokens[p] === ':') { p++; name=tokens[p++]; }
    if (tokens[p] === '(') {
      p++; const args=[];
      if(tokens[p]!==')') { do { const arg=tokens[p++]; if (!arg || /[(),!<>=]/.test(arg)) fail('CONDITION_SYNTAX','조건 함수 인수가 올바르지 않습니다.'); args.push(scalar(arg)); if(tokens[p]!==',')break; p++; } while (p<tokens.length); }
      take(')'); lhs={type:'call',name,args};
      if(tokens[p]==='.') {p++;lhs.property=tokens[p++];}
    } else lhs = ['TRUE','FALSE'].includes(name)||/^[-+]?\d/.test(name)||/^["']/.test(name) ? {type:'literal',value:scalar(name)} : {type:'var',name};
    if (['=','==','!=','>=','<=','>','<'].includes(tokens[p])) {
      const op=tokens[p++], rhs=tokens[p++]; if(rhs===undefined) fail('CONDITION_SYNTAX','비교할 값이 없습니다.');
      return {type:'compare',op,left:lhs,right:scalar(rhs)};
    }
    return lhs;
  }
  function and() { let n=atom(); while(['&&','AND'].includes(tokens[p])) {p++;n={type:'and',left:n,right:atom()};} return n; }
  function or() { let n=and(); while(['||','OR'].includes(tokens[p])) {p++;n={type:'or',left:n,right:and()};} return n; }
  const ast=or(); if(p!==tokens.length)fail('CONDITION_SYNTAX','남은 조건식이 있습니다: '+text); return ast;
}
function parseEffects(source) {
  return String(source??'').split(';').map(x=>x.trim()).filter(x=>x && x!=='NONE').map(raw=>{
    let m;
    if(NO_EFFECT.has(raw))return {type:'guard',name:raw,raw};
    if((m=/^(?:FLAG:)?([A-Za-z_][A-Za-z_0-9]*)=(.+)$/.exec(raw)))return {type:'assign',key:m[1],value:scalar(m[2]),raw};
    if((m=/^(EVENT|UNLOCK_CARD|JOIN_ACCEPTED|COMPANION_ELIGIBLE|ENSURE_PLAYER_CARD|ENSURE_PLAYER_PARTY_SLOT|COMPLETE_QUEST|COMPLETE_LEGEND|LEGEND_ACCEPT_AND_PAY|COMPLETE_AFFECTION|START_FIXED_COMBAT):([A-Za-z_][A-Za-z_0-9]*)$/.exec(raw)))return {type:m[1],id:m[2],raw};
    if((m=/^UNLOCK_CARD_ONCE:(\w+):(\w+)$/.exec(raw)))return {type:'UNLOCK_CARD_ONCE',id:m[1],flag:m[2],raw};
    if((m=/^ADD_HEART:(?:(PROFILE_\w+):)?([-+]?\d+)$/.exec(raw)))return {type:'ADD_HEART',profile:m[1]||null,amount:Number(m[2]),raw};
    if((m=/^LOCAL_CHOICE:(\w+):(.+)$/.exec(raw)))return {type:'LOCAL_CHOICE',id:m[1],value:m[2],raw};
    if((m=/^SCENE_MEMORY:(\w+)=(\w+)$/.exec(raw)))return {type:'SCENE_MEMORY',id:m[1],value:m[2],raw};
    if((m=/^SET_SCENE_CONSENT:(TRUE|FALSE)$/.exec(raw)))return {type:'SET_SCENE_CONSENT',value:m[1]==='TRUE',raw};
    if((m=/^ADULT_EVENT_COMMIT:(ROUTE_\w+):(PROFILE_\w+):(\w+)$/.exec(raw)))return {type:'ADULT_EVENT_COMMIT',route:m[1],profile:m[2],id:m[3],raw};
    if((m=/^ON_VICTORY:(.+)$/.exec(raw)))return {type:'ON_VICTORY',effects:parseEffects(m[1]),raw};
    if(raw==='ON_DEFEAT:RETRY_SAME_NODE')return {type:'ON_DEFEAT',mode:'RETRY_SAME_NODE',raw};
    fail('STORY_EFFECT','지원하지 않는 콘텐츠 명령: '+raw);
  });
}
P.storyIndex = function () {
  if(this._sharedStoryIndex)return this._sharedStoryIndex;
  const index={nodes:new Map(),byTable:{},legends:new Map(),affections:new Map(),knownFlags:new Set(),entries:new Map()};
  for(const name of [TABLE_MAIN,TABLE_PERSONAL]) {
    const rows=this.db[name]||[], headers=rows[0]||[];
    index.byTable[name]=[];
    for(let k=1;k<rows.length;k++) {
      const src=rows[k]; if(!src?.length||!src[headers.indexOf('NODE_ID')])continue;
      const row=NODE_COLUMNS.map(h=>src[headers.indexOf(h)]??'');
      Object.defineProperties(row,{table:{value:name},sourceRow:{value:k+1}});
      const key=row[0]+':'+row[4];
      if(index.nodes.has(key))fail('STORY_DUPLICATE','중복된 이야기 노드: '+row[4]);
      index.nodes.set(key,row);index.byTable[name].push(row);
      for(const flag of String(row[11]+' '+row[12]).match(/FLAG_[A-Z0-9_]+/g)||[])index.knownFlags.add(flag);
    }
  }
  for(const [name,kind,dest] of [['56_MOND_LEGEND_DB','LEGEND',index.legends],['58_MOND_AFFECTION_DB','AFFECTION',index.affections]]) {
    const rows=this.db[name]||[], headers=rows[0]||[];
    for(let k=1;k<rows.length;k++){const r=rows[k];if(!r?.[0])continue;const def=Object.fromEntries(headers.map((h,i)=>[h,r[i]??'']));def.kind=kind;def.id=r[0];def.sourceRow=k+1;dest.set(r[0],def);index.entries.set(def.ENTRY_NODE_ID,def);for(const flag of JSON.stringify(def).match(/FLAG_[A-Z0-9_]+/g)||[])index.knownFlags.add(flag);}
  }
  for(const r of this.db['23_FLAG_DB']?.slice(1)||[])if(r[0])index.knownFlags.add(r[0]);
  this._sharedStoryIndex=index;return index;
};
P.storyDefinition = function(id) { const ix=this.storyIndex(); return ix.legends.get(id)||ix.affections.get(id)||[...ix.legends.values()].find(x=>x.QUEST_ID===id)||null; };
P.storyActiveNodeId = function () { return this.s.storyContext?.node || this.s.global.STORY_CURSOR_NODE_ID || this.s.global.CURRENT_STORY_NODE_ID; };
P.storySetCursor = function (id) {if(this.s.storyContext)this.s.storyContext.node=id;else this.s.global.STORY_CURSOR_NODE_ID=id;this.s.global.CURRENT_STORY_NODE_ID=this.s.global.STORY_CURSOR_NODE_ID||id;};
P.storyNode = function() {return this.storyIndex().nodes.get(this.s.global.STORY_ROUTE_ID+':'+this.storyActiveNodeId());};
P.storyRelation = function(profile) {return typeof this.relation==='function'?this.relation(profile):this.markContact(profile);};
P.storyBond = function(profile) {const r=this.s.relations[profile];return Number(r?.BOND_SCORE??r?.bondScore??((r?.heart||0)*20));};
P.storyDone = function(id) {
  const def=this.storyDefinition(id),ids=def?.kind==='LEGEND'?[def.id,def.QUEST_ID]:[id];
  if(ids.some(key=>this.relationshipEventComplete?.(key)||this.s.storyEventReceipts?.[key]||this.s.quests[key]?.state==='완료'||this.s.quests[key]?.claimed===true))return true;
  if(def?.kind!=='LEGEND')return false;
  if(def.COMPLETE_FLAG_ID&&truth(this.s.flags[def.COMPLETE_FLAG_ID]))return true;
  const applied=readJSON(this.s.global.STORY_NODE_EFFECTS_JSON);
  const nodes=def.completionNodes||(def.completionNodes=this.storyIndex().byTable[TABLE_PERSONAL].filter(row=>row[0]===def.ROUTE_SCOPE&&row[1]===def.QUEST_ID&&parseEffects(row[12]).some(c=>c.type==='COMPLETE_LEGEND'&&ids.includes(c.id))).map(row=>row[4]));
  return nodes.some(node=>applied[def.ROUTE_SCOPE+':'+node]||applied[node]);
};
P.storyAutomaticNode=function(row){return !!row&&(['META','NOTE','CONDITIONAL'].includes(row[5])||row[5]==='EVENT'&&!String(row[9]??'').trim());};
P.storyConditionValue = function(name,args,property) {
  const g=this.s.global,ctx=this.s.storyContext,def=ctx&&this.storyDefinition(ctx.entry);
  if(!args) {
    if(name==='ROUTE_ID')return g.STORY_ROUTE_ID;
    if(name==='MAP_ID')return g.CURRENT_MAP_ID;
    if(name==='NEW_GAME')return true;
    if(name==='MENU_ACCESS')return g.STORY_MENU_POLICY==='SAVE_LOAD_ONLY'?'SAVE_LOAD_ONLY':'CRPG_MAIN';
    if(name==='QUEST_COST_COMMITTED')return !!this.s.storyCostReceipts?.[def?.QUEST_ID];
    if(name==='BATTLE_CONTEXT')return this.s.runtime?.group||'';
    if(name==='PENDING_INTERLUDE')return this.s.runtime?.pendingInterlude||'';
    if(name.startsWith('Q_'))return this.s.quests[name]?.state||'미수락';
    if(name.startsWith('FLAG_')&&this.storyIndex().knownFlags.has(name))return this.s.flags[name]??false;
    if(/^SEPARATE_DAILY_INTERACTION_SINCE_H0[1-5]$/.test(name)){const prev=def?.PREV_EVENT_ID;return prev?this.storyAfterDaily(prev):false;}
    if(Object.prototype.hasOwnProperty.call(g,name))return g[name];
    if(Object.prototype.hasOwnProperty.call(this.s.flags,name))return this.s.flags[name];
    if(['CURRENT_PLAYER_AGE_CONFIRMED_18_PLUS','ADULT_CONSENT_FLAG'].includes(name))return false;
    if(/^CE_155_/.test(name))return 'UNVERIFIED';
    fail('CONDITION_UNKNOWN','정의되지 않은 조건 변수: '+name);
  }
  const profile=args.at(-1);
  switch(name) {
    case 'FLAG':return this.storyConditionValue(String(args[0]));
    case 'HEART':return Math.min(5,Math.floor(Math.max(0,this.storyBond(profile))/20));
    case 'BOND':case 'BOND_SCORE':if(args.length===2&&args[0]!==g.STORY_ROUTE_ID)return 0;return this.storyBond(profile);
    case 'DONE':return this.storyDone(args[0]);
    case 'ITEM':case 'INVENTORY':return this.itemCount(args[0]);
    case 'LOCAL_CHOICE':return this.s.storyLocalChoices?.[args[0]]||'';
    case 'SCENE_MEMORY':return this.s.storySceneMemories?.[args[0]]||'';
    case 'AFTER_PRIOR_DAILY':return this.storyAfterDaily(args[0]);
    case 'WORLD_DAY_AFTER_PREV_UPPER_EVENT_END':return Number(g.WORLD_DAY)>Number(this.s.storyEventReceipts?.[args[0]]?.day??Infinity);
    case 'PROJECT_AGE_CLASS':case 'ADULT_CONTENT_ELIGIBLE':case 'ADULT_ROUTE_ENABLED':return this.storyMatureCondition?.(name,args)??(name==='PROJECT_AGE_CLASS'?'UNVERIFIED':false);
    case 'COMMIT_RECEIPT':return this.storyMatureCondition?.(name,args,property)??false;
    default:fail('CONDITION_FUNCTION','지원하지 않는 조건 함수: '+name);
  }
};
P.storyAfterDaily=function(id){
  if(typeof this.relationshipAfterDaily==='function')return this.relationshipAfterDaily(id);
  const def=this.storyDefinition(id),r=def&&this.s.relations[def.PROFILE_ID],event=this.s.storyEventReceipts?.[id]||r?.eventCompletedAt?.[id];
  const activity=def&&this.lastRelationshipActivity?.(def.PROFILE_ID);
  return !!event && Number(activity?.turn??r?.lastDailyTurn??-1)>Number(event.turn);
};
P.storyCondition = function(source,definition) {
  const ast=parseCondition(source),def=definition||(this.s.storyContext&&this.storyDefinition(this.s.storyContext.entry));
  const evaluate=n=>{
    if(n.type==='literal')return n.value;
    if(n.type==='var')return this.storyConditionValue(n.name);
    if(n.type==='call')return this.storyConditionValue(n.name,n.args,n.property);
    if(n.type==='not')return !truth(evaluate(n.value));
    if(n.type==='and'||n.type==='or'){const a=truth(evaluate(n.left)),b=truth(evaluate(n.right));return n.type==='and'?a&&b:a||b;}
    let lhs=evaluate(n.left),rhs=n.right;
    // Legacy upper relationship conditions asked for a sixth heart; the product
    // contract retains five hearts and gates the separate continuous score.
    if(def?.kind==='AFFECTION'&&n.left.type==='call'&&n.left.name==='HEART'&&typeof rhs==='number'&&rhs>5)rhs=5;
    if(def?.kind==='AFFECTION'&&n.left.type==='call'&&n.left.name==='BOND_SCORE'&&Number(def.BOND_SCORE_MIN)>100&&rhs>=100)rhs=Number(def.BOND_SCORE_MIN);
    return n.op==='='||n.op==='=='?lhs===rhs:n.op==='!='?lhs!==rhs:n.op==='>='?lhs>=rhs:n.op==='<='?lhs<=rhs:n.op==='>'?lhs>rhs:lhs<rhs;
  };
  return truth(evaluate(ast));
};
P.storyChoices = function () {
  const group=this.s.global.PENDING_CHOICE_GROUP_ID;if(!group)return[];
  const table=this.s.storyContext?.table||TABLE_MAIN;
  return this.storyIndex().byTable[table].filter(r=>r[0]===this.s.global.STORY_ROUTE_ID&&r[5]==='CHOICE'&&r[14]===group&&r[18]==='ACTIVE'&&this.storyCondition(r[11]));
};
P.storyFrame = function () {const g=this.s.global;return copy({main:g.STORY_CURSOR_NODE_ID||g.CURRENT_STORY_NODE_ID,context:this.s.storyContext||null,choice:g.PENDING_CHOICE_GROUP_ID,input:g.PENDING_INPUT_JSON,screen:g.SCREEN_MODE,map:g.CURRENT_MAP_ID,policy:g.STORY_MENU_POLICY||''});};
P.storyRestoreFrame = function(frame) {if(!frame)fail('STORY_RETURN','복귀할 이야기 문맥이 없습니다.');const g=this.s.global;this.s.storyContext=frame.context;Object.assign(g,{STORY_CURSOR_NODE_ID:frame.main,CURRENT_STORY_NODE_ID:frame.main,PENDING_CHOICE_GROUP_ID:frame.choice||'',PENDING_INPUT_JSON:frame.input||'{}',SCREEN_MODE:frame.screen||'STORY',CURRENT_MAP_ID:frame.map,STORY_MENU_POLICY:frame.policy||''});};
P.storyReturn=function(){if(this.s.runtime&&this.s.storyContext?.kind!=='COMBAT_INTERLUDE')fail('COMBAT','전투를 먼저 마쳐 주세요.');const combat=this.s.storyContext?.kind==='COMBAT_INTERLUDE',frame=this.s.storyReturnStack?.pop();this.storyRestoreFrame(frame);if(combat){if(this.resumeCombatInterlude)this.resumeCombatInterlude();else {this.s.runtime.pendingInterlude='';this.s.runtime.phase='RESOLVING';this.autoUntilPlayer();}}return{screen:this.s.global.SCREEN_MODE,node:this.storyActiveNodeId()};};
P.prepareStory = function () {
  const g=this.s.global;if(!g.STORY_CURSOR_NODE_ID||g.STORY_CURSOR_NODE_ID==='NONE')g.STORY_CURSOR_NODE_ID=g.CURRENT_STORY_NODE_ID;
  g.CURRENT_STORY_NODE_ID=g.STORY_CURSOR_NODE_ID;
  for(let loop=0;loop<1000;loop++) {
    const id=String(this.storyActiveNodeId()||'');
    if(id.startsWith('CHOICE_GROUP:')){g.PENDING_CHOICE_GROUP_ID=id.slice(13);const arrivalChoice=this.storyChoices()[0];if(arrivalChoice&&this.storyArrivalGate?.(arrivalChoice)){this.s.storyJourney.choiceGroup=id;return;}g.PENDING_INPUT_JSON=JSON.stringify({group:g.PENDING_CHOICE_GROUP_ID,node:id,choices:this.storyChoices().map(r=>r[4]),...(g.PENDING_CHOICE_GROUP_ID==='ISK_M01_G_U_KIT'?{quote:this.quote()}:{} )});g.SCREEN_MODE='STORY';return;}
    if(id.startsWith('CONDITION_GROUP:')){const group=id.slice(16),table=this.s.storyContext?.table||TABLE_MAIN,rows=this.storyIndex().byTable[table].filter(r=>r[0]===g.STORY_ROUTE_ID&&r[14]===group&&r[18]==='ACTIVE'&&this.storyCondition(r[11]));if(rows.length!==1)fail('CONDITION_GROUP','조건 분기는 정확히 한 장면을 선택해야 합니다: '+group);this.storySetCursor(rows[0][4]);continue;}
    if(id.startsWith('RETURN:')){if(id!=='RETURN:CURRENT_COMBAT'&&id!=='RETURN:STORY'&&id!=='RETURN:MAIN')fail('STORY_RETURN','알 수 없는 복귀 명령: '+id);this.storyReturn();return;}
    if(id.startsWith('SCREEN:')){if(this.s.storyContext){this.storyReturn();return;}g.SCREEN_MODE=id==='SCREEN:CRPG_MAIN'?'MAIN_MENU':id.slice(7);g.STORY_WAITING=true;return;}
    if(['END','PAUSE','HUB',''].includes(id)){g.SCREEN_MODE='MAIN_MENU';g.STORY_WAITING=true;return;}
    const r=this.storyNode();if(!r)fail('STORY_NODE','이야기 노드를 찾을 수 없습니다: '+id);
    if(r[18]!=='ACTIVE'){g.STORY_WAITING=true;g.STORY_WAIT_REASON='CONTENT_NOT_ACTIVE';g.SCREEN_MODE='STORY_WAIT';return;}
    if(!this.storyCondition(r[11])){this.storySetCursor(r[13]);continue;}
    if(this.storyArrivalGate?.(r))return;
    if(this.storyAutomaticNode(r)){const receipts=readJSON(g.STORY_NODE_EFFECTS_JSON),key=g.STORY_ROUTE_ID+':'+r[4];if(!receipts[key]&&!receipts[r[4]]){this.storyApplyEffects(r[12],r);receipts[key]=true;g.STORY_NODE_EFFECTS_JSON=JSON.stringify(receipts);}this.storySetCursor(r[13]);continue;}
    // Event-bearing travel rows commit their map change in the event transaction.
    if(!this.storyArrivalGate&&r[8]&&!parseEffects(r[12]).some(c=>c.type==='EVENT'))g.CURRENT_MAP_ID=r[8];g.STORY_WAITING=false;g.SCREEN_MODE=['MENU_GATE'].includes(r[5])?'MAIN_MENU':'STORY';return;
  }
  fail('STORY_LOOP','이야기 자동 진행 순환을 발견했습니다.');
};
P.storyApplyEffects = function(source,node) {
  const commands=Array.isArray(source)?source:parseEffects(source),g=this.s.global,definition=this.s.storyContext&&this.storyDefinition(this.s.storyContext.entry);
  for(const c of commands){
    switch(c.type){
      case 'guard':break;
      case 'assign':if(c.key==='ADULT_CONSENT_FLAG'){if(c.value)fail('CONSENT','현재 장면의 명시적 동의 API가 필요합니다.');if(this.clearSceneConsent)this.clearSceneConsent();break;}if(c.key.startsWith('FLAG_')){this.s.flags[c.key]=c.value;}else if(c.key==='PLAYER_ENTITY_ID')g.PLAYER_NARRATIVE_ENTITY_ID=c.value;else if(c.key==='STORY_ROUTE_ID'){if(c.value!==g.STORY_ROUTE_ID)fail('STORY_ROUTE','진행 중인 루트를 바꿀 수 없습니다.');}else if(c.key.startsWith('Q_')&&c.value==='COMPLETED')this.storyCompleteQuest(c.key);else fail('STORY_ASSIGN','지원하지 않는 상태 대입: '+c.key);break;
      case 'EVENT':this.storyEvent(c.id);break;
      case 'ENSURE_PLAYER_CARD':if(!g.PLAYER_CARD_CREATED||g.PLAYER_CARD_ID!=='PLAYER_CUSTOM')fail('PLAYER_CARD','주인공 카드를 확인할 수 없습니다.');break;
      case 'ENSURE_PLAYER_PARTY_SLOT':if(!this.s.party.some(p=>p.active&&p.source==='PLAYER_CUSTOM'))fail('PARTY','주인공이 파티에 없습니다.');break;
      case 'UNLOCK_CARD':this.storySetCompanion(c.id,'AVAILABLE');break;
      case 'COMPANION_ELIGIBLE':this.storySetCompanion(c.id,'ELIGIBLE');break;
      case 'JOIN_ACCEPTED':this.storySetCompanion(c.id,'JOINED');break;
      case 'UNLOCK_CARD_ONCE':this.storySetCompanion(c.id,'JOINED');this.s.flags[c.flag]=true;break;
      case 'COMPLETE_QUEST':this.storyCompleteQuest(c.id);break;
      case 'LEGEND_ACCEPT_AND_PAY':this.storyAcceptLegend(c.id,node);break;
      case 'COMPLETE_LEGEND':this.storyCompleteLegend(c.id);break;
      // Legacy content commands remain parseable; only legend completion and battle settlement award bond.
      case 'ADD_HEART':break;
      case 'COMPLETE_AFFECTION':{const def=this.storyDefinition(c.id);if(!def||def.kind!=='AFFECTION'||this.s.storyContext?.entry!==c.id)fail('AFFECTION_SOURCE','현재 관계 사건의 완료점이 아닙니다.');if(this.completeAffection)this.completeAffection(c.id,{profileId:def.PROFILE_ID,stage:def.id.match(/_(H0[1-5])$/)?.[1]});this.s.storyEventReceipts||={};this.s.storyEventReceipts[c.id]||={day:g.WORLD_DAY,turn:g.TURN,node:node?.[4]};if(def.INFO_UNLOCK_KEY){const r=this.storyRelation(def.PROFILE_ID);r.unlocked||=[];if(!r.unlocked.includes(def.INFO_UNLOCK_KEY))r.unlocked.push(def.INFO_UNLOCK_KEY);}break;}
      case 'LOCAL_CHOICE':this.s.storyLocalChoices||={};this.s.storyLocalChoices[c.id]=c.value;break;
      case 'SCENE_MEMORY':if(c.value==='SHARED_NIGHT'&&!this.s.storyMatureReceipts?.[c.id])fail('MATURE_COMMIT','관계 사건의 확정 기록이 필요합니다.');this.s.storySceneMemories||={};this.s.storySceneMemories[c.id]=c.value;break;
      case 'SET_SCENE_CONSENT':if(c.value)fail('CONSENT','장면 동의는 별도 명시적 입력으로 확인해야 합니다.');if(this.clearSceneConsent)this.clearSceneConsent();break;
      case 'ADULT_EVENT_COMMIT':if(!this.storyMatureCommit)fail('MATURE_HANDLER','확인된 관계 사건 처리기가 없습니다.');this.storyMatureCommit(c,node);break;
      case 'START_FIXED_COMBAT':case 'ON_VICTORY':case 'ON_DEFEAT':fail('BATTLE_EFFECT','전투 결과 전용 명령이 잘못된 위치에 있습니다.');
      default:fail('STORY_EFFECT','지원하지 않는 명령: '+c.type);
    }
  }
};
P.storySetCompanion=function(id,state){this.row('07_CHAR_DB',id);const g=this.s.global,owned=readJSON(g.COMPANION_ELIGIBILITY_JSON);if(owned[id]?.state!=='JOINED')owned[id]={state,event:this.storyActiveNodeId()};g.COMPANION_ELIGIBILITY_JSON=JSON.stringify(owned);const p=(this.db['04_CHAR_DB']||[]).find(r=>r[1]===id);if(p&&this.s.relations[p[0]])this.s.relations[p[0]].companion=owned[id].state;};
P.storyCompleteQuest=function(id){Object.assign(this.questState(id),{state:'완료',claimed:true,completedTurn:this.s.global.TURN});};
P.storyAcceptLegend=function(id,node){const def=this.storyDefinition(id);if(!def||def.kind!=='LEGEND'||this.s.storyContext?.entry!==def.id)fail('LEGEND_SOURCE','현재 개인 임무의 수락점이 아닙니다.');if(this.storyDone(def.id))fail('LEGEND_COMPLETE','이미 마친 개인 임무입니다.');if(def.COST_COMMIT_NODE_ID&&node[4]!==def.COST_COMMIT_NODE_ID)fail('LEGEND_COST_NODE','개인 임무 비용 확정 지점이 아닙니다.');this.s.storyCostReceipts||={};if(this.s.storyCostReceipts[id])return;this.pay({mora:Number(def.COST_MORA||0),items:readJSON(def.COST_ITEMS_JSON)});this.s.storyCostReceipts[id]={node:node[4],turn:this.s.global.TURN};Object.assign(this.questState(id),{state:'진행중',acceptedTurn:this.s.global.TURN});};
P.storyCompleteLegend=function(id){
  const def=this.storyDefinition(id);if(!def||def.kind!=='LEGEND'||this.s.storyContext?.entry!==def.id)fail('LEGEND_SOURCE','현재 개인 임무의 완료점이 아닙니다.');
  if(this.storyDone(def.id))return {complete:true,duplicate:true};
  const quest=def.QUEST_ID;if(!this.s.storyCostReceipts?.[quest])fail('LEGEND_ACCEPT','개인 임무를 먼저 수락해야 합니다.');
  let bond;
  if(this.changeBond)bond=this.changeBond(def.PROFILE_ID,10,{source:'LEGEND:'+def.id});
  else {const r=this.storyRelation(def.PROFILE_ID),before=this.storyBond(def.PROFILE_ID);r.BOND_SCORE=Math.min(120,before+10);r.heart=r.HEART_STATE=Math.min(5,Math.floor(r.BOND_SCORE/20));bond={profileId:def.PROFILE_ID,previous:before,score:r.BOND_SCORE,change:r.BOND_SCORE-before};}
  this.storyCompleteQuest(quest);if(def.COMPLETE_FLAG_ID)this.s.flags[def.COMPLETE_FLAG_ID]=true;
  const receipt={day:this.s.global.WORLD_DAY,turn:this.s.global.TURN,legend:def.id,quest,bond};this.s.storyEventReceipts||={};this.s.storyEventReceipts[quest]=receipt;this.s.storyEventReceipts[def.id]=copy(receipt);return receipt;
};
P.storyEntryReason=function(def){
  if(!def)return '준비되지 않은 이야기입니다.';
  if(this.s.runtime)return '전투를 먼저 마쳐 주세요.';
  if(this.s.storyContext)return '현재 개인 장면을 먼저 마쳐 주세요.';
  if(this.s.global.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '현재 장면에서는 저장과 불러오기만 할 수 있습니다.';
  if(def.STATUS!=='ACTIVE'||!String(def.ROUTE_SCOPE).split(/[;,|]/).includes(this.s.global.STORY_ROUTE_ID))return '현재 이야기에서 열리지 않습니다.';
  if(def.MAP_ID&&def.MAP_ID!==this.s.global.CURRENT_MAP_ID)return '해당 인물이 있는 장소에서 진행할 수 있습니다.';
  if(def.kind==='LEGEND'){if(this.storyDone(def.id))return '이미 마친 개인 임무입니다.';if(!this.storyCondition(def.START_CONDITION,def))return '개인 임무의 선행 진행이 필요합니다.';}
  else {
    if(this.storyDone(def.id))return '이미 마친 이야기입니다.';
    if(/ADULT|MATURE/.test(def.RELATION_KIND)||/ADULT|MATURE/.test(def.ADULT_SCENE_POLICY)&&!String(def.ADULT_SCENE_POLICY).startsWith('NONSEXUAL')){const reason=this.storyMatureEntryReason?.(def);if(reason!==null&&reason!=='')return reason||'확인된 관계 조건이 필요합니다.';}
    if(def.REQUIRED_QUEST_ID&&!this.storyDone(def.REQUIRED_QUEST_ID))return '개인 임무를 먼저 마쳐 주세요.';
    if(def.PREV_EVENT_ID&&!this.storyDone(def.PREV_EVENT_ID))return '앞선 관계 이야기를 먼저 마쳐 주세요.';
    if(readJSON(def.REQUIRED_FLAGS,[]).some(f=>!truth(this.s.flags[f])))return '선행 이야기의 진행이 필요합니다.';
    if(this.storyBond(def.PROFILE_ID)<Number(def.BOND_SCORE_MIN||Number(def.HEART_MIN||0)*20))return '함께 활동하며 관계를 더 쌓아 주세요.';
  }
  const first=this.storyIndex().nodes.get(this.s.global.STORY_ROUTE_ID+':'+def.ENTRY_NODE_ID);if(!first||first[18]!=='ACTIVE')return '이야기 원고가 아직 준비되지 않았습니다.';
  if(!this.storyCondition(first[11],def))return '이야기 시작 조건이 아직 충족되지 않았습니다.';
  return '';
};
P.storyEntries=function(){return [...this.storyIndex().legends.values(),...this.storyIndex().affections.values()].filter(d=>d.ROUTE_SCOPE===this.s.global.STORY_ROUTE_ID).map(def=>{let reason;try{reason=this.storyEntryReason(def);}catch(e){reason='이야기 조건 지원을 준비 중입니다.';}return {id:def.id,kind:def.kind,profile:def.PROFILE_ID,title:def.DISPLAY_NAME||def.DAILY_ACTIVITY_KEY||def.id,label:def.DISPLAY_NAME||def.DAILY_ACTIVITY_KEY||def.id,reason,definition:def};});};
P.storyChapterEntries=function(){const g=this.s.global;return this.storyIndex().byTable[TABLE_MAIN].filter(r=>r[0]===g.STORY_ROUTE_ID&&(!r[1].includes('_LIYUE_')||!!this.liyueChapterOffers)&&r[5]==='META'&&r[18]==='ACTIVE'&&Number(r[17])===1&&!this.storyDone(r[1])&&this.storyCondition(r[11])).map(r=>({id:r[4],quest:r[1],kind:'CHAPTER',title:this.tables['22_QUEST_DB']?.get(r[1])?.[1]||'메인 이야기 계속',reason:''}));};
P.storyLegendEntryNode=function(def){
  const entry=def.ENTRY_NODE_ID,g=this.s.global;
  if(def.kind!=='LEGEND'||this.s.storyCostReceipts?.[def.QUEST_ID]||this.storyDone(def.QUEST_ID))return entry;
  const rows=this.storyIndex().byTable[TABLE_PERSONAL];
  const accept=rows.find(r=>r[0]===g.STORY_ROUTE_ID&&r[1]===def.QUEST_ID&&r[2]===def.id&&r[4]===def.COST_COMMIT_NODE_ID&&r[5]==='CHOICE'&&r[18]==='ACTIVE');
  if(!accept||!accept[14]||!parseEffects(accept[12]).some(c=>c.type==='LEGEND_ACCEPT_AND_PAY'&&c.id===def.QUEST_ID))return entry;
  const target='CHOICE_GROUP:'+accept[14],applied=readJSON(g.STORY_NODE_EFFECTS_JSON);
  const seen=rows.some(r=>r[0]===g.STORY_ROUTE_ID&&r[1]===def.QUEST_ID&&r[2]===def.id&&r[18]==='ACTIVE'&&r[13]===target&&!!(applied[g.STORY_ROUTE_ID+':'+r[4]]||applied[r[4]]));
  return seen?target:entry;
};

P.enterStory=function(id){const def=this.storyDefinition(id),reason=this.storyEntryReason(def);if(reason)fail('STORY_ENTRY',reason);this.s.storyReturnStack||=[];this.s.storyReturnStack.push(this.storyFrame());this.s.storyContext={kind:def.kind,entry:def.id,node:this.storyLegendEntryNode(def),table:TABLE_PERSONAL};Object.assign(this.s.global,{PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'STORY'});this.prepareStory();return {id,node:this.storyActiveNodeId()};};
P.storyNext=function(id,choice=false){
  const g=this.s.global;if(this.s.runtime&&this.s.storyContext?.kind!=='COMBAT_INTERLUDE')fail('COMBAT','현재 전투를 먼저 진행해 주세요.');
  const r=choice?this.storyChoices().find(n=>n[4]===id):this.storyNode();
  if(!r||r[4]!==id||r[18]!=='ACTIVE'||(!choice&&r[5]==='CHOICE')||!this.storyCondition(r[11]))fail('STORY_CHOICE','현재 장면에서 실행할 수 없는 선택입니다.');
  if(g.PENDING_CHOICE_GROUP_ID&&!choice)fail('STORY_CHOICE','제시된 선택지에서 직접 골라 주세요.');
  if(choice&&g.PENDING_CHOICE_GROUP_ID==='ISK_M01_G_U_KIT'){const progress=readJSON(g.EVENT_PROGRESS_JSON);progress.starterQuote=readJSON(g.PENDING_INPUT_JSON).quote;g.EVENT_PROGRESS_JSON=JSON.stringify(progress);}
  // The selected row becomes the resolving cursor inside the same transaction.
  // Exact-source event guards therefore see the authored CHOICE node, while a
  // rejected effect rolls the cursor and its pending group back together.
  if(choice)this.storySetCursor(r[4]);
  const commands=parseEffects(r[12]);
  if(r[5]==='COMBAT_GATE') {const start=commands.find(c=>c.type==='START_FIXED_COMBAT');if(!start)fail('COMBAT_GATE','고정 전투 정의가 없습니다.');this.s.storyBattleFrame={node:r[4],context:copy(this.s.storyContext||null),main:g.STORY_CURSOR_NODE_ID};return this.startBattle(start.id,'STORY:'+id);}
  const applied=readJSON(g.STORY_NODE_EFFECTS_JSON),key=g.STORY_ROUTE_ID+':'+id;
  if(!applied[key]&&!applied[id]){this.storyApplyEffects(commands,r);applied[key]=true;g.STORY_NODE_EFFECTS_JSON=JSON.stringify(applied);}
  if(r[5]==='DIALOGUE'&&String(r[6]).startsWith('PROFILE_'))this.markContact(r[6]);
  g.PENDING_CHOICE_GROUP_ID='';g.PENDING_INPUT_JSON='{}';
  if(r[13]==='SCREEN:CRPG_MAIN'){if(this.s.storyContext)this.storyReturn();else {g.SCREEN_MODE='MAIN_MENU';g.STORY_WAITING=true;g.STORY_NEXT_PREPARED='';}return{resolved:id,next:g.SCREEN_MODE};}
  if(this.storyNaturalPause?.(r))return{resolved:id,waiting:true,next:r[13]};
  if(r[5]==='STORY_PAUSE'){g.STORY_WAITING=true;g.STORY_NEXT_PREPARED=r[13];g.SCREEN_MODE='STORY_WAIT';return{resolved:id,waiting:true,next:r[13]};}
  this.storySetCursor(r[13]);this.prepareStory();return{resolved:id,next:this.storyActiveNodeId()};
};
const previousMenu=P.menu,previousApply=P.apply,previousFinish=P.finishBattle;
P.menu=function(screen){const g=this.s.global;if(g.STORY_MENU_POLICY==='SAVE_LOAD_ONLY'&&!['SYSTEM','SAVE','LOAD','STORY'].includes(screen))fail('MENU_LOCK','현재 장면에서는 저장과 불러오기만 할 수 있습니다.');if(this.s.runtime&&this.s.storyContext?.kind!=='COMBAT_INTERLUDE'&&screen!=='COMBAT'&&screen!=='SYSTEM')fail('COMBAT','전투 화면에서 계속 진행해 주세요.');if(screen==='STORY'&&this.s.storyMenuFrame){this.storyRestoreFrame(this.s.storyMenuFrame);this.s.storyMenuFrame=null;return;}if(screen==='STORY'){g.SCREEN_MODE='STORY';return;}if(!['MAIN_MENU','HUB','LOCATION','INVENTORY','SHOP','CRAFT','QUEST','SYSTEM','BOSS_INTRO','PARTY','RELATIONS','SAVE','LOAD','SETTINGS','COMBAT'].includes(screen))fail('SCREEN','알 수 없는 화면입니다.');if(['STORY','STORY_WAIT'].includes(g.SCREEN_MODE)&&!this.s.storyMenuFrame)this.s.storyMenuFrame=this.storyFrame();g.SCREEN_MODE=screen;};
P.apply=function(a){if(this.s?.global.STORY_MENU_POLICY==='SAVE_LOAD_ONLY'&&!['STORY_NEXT','STORY_CHOICE','STORY_NAME','STORY_RESUME','MENU'].includes(a.type))fail('MENU_LOCK','현재 장면에서는 이야기를 계속하거나 저장할 수 있습니다.');if(a.type==='LEGEND_ENTER')return this.enterStory(a.quest||a.id);if(a.type==='AFFECTION_ENTER')return this.enterStory(a.event||a.id);if(a.type==='STORY_RETURN')return this.storyReturn();if(a.type==='STORY_CHAPTER'){if(this.s.runtime||this.s.storyContext||!this.s.global.STORY_WAITING)fail('STORY_CHAPTER','현재 이야기의 대기 지점에서 시작해 주세요.');const entry=this.storyChapterEntries().find(x=>x.id===a.node);if(!entry)fail('STORY_CHAPTER','시작할 수 없는 장입니다.');this.questState(entry.quest).state='진행중';this.storySetCursor(entry.id);this.prepareStory();return{node:this.storyActiveNodeId()};}if(a.type==='STORY_RESUME'){const next=this.s.global.STORY_NEXT_PREPARED;if(!next)fail('STORY_WAIT','아직 이어질 이야기가 준비되지 않았습니다.');this.s.global.STORY_NEXT_PREPARED='';this.storySetCursor(next);this.prepareStory();return{node:this.storyActiveNodeId()};}return previousApply.call(this,a);};
P.storyBattleResolved=function(victory,node){const frame=this.s.storyBattleFrame;if(!node||!frame)return;this.s.storyContext=frame.context;this.s.global.STORY_CURSOR_NODE_ID=frame.main;this.s.global.CURRENT_STORY_NODE_ID=frame.main;if(victory){for(const c of parseEffects(node[12]).filter(c=>c.type==='ON_VICTORY'))this.storyApplyEffects(c.effects,node);this.storySetCursor(node[13]);this.prepareStory();this.s.global.SCREEN_MODE='REWARD';}else this.storySetCursor(node[4]);this.s.storyBattleFrame=null;};
P.finishBattle=function(victory){const battle=this.s.runtime,node=battle?.origin?.startsWith('STORY:')?this.storyNode():null;const result=previousFinish.call(this,victory);this.storyBattleResolved(victory,node);return result;};
P.storyInterlude=function(id){if(!this.s.runtime)fail('COMBAT_INTERLUDE','현재 전투가 없습니다.');this.s.storyReturnStack||=[];this.s.storyReturnStack.push(this.storyFrame());this.s.storyContext={kind:'COMBAT_INTERLUDE',entry:id,node:id,table:TABLE_MAIN};this.s.runtime.pendingInterlude=id;this.s.runtime.phase='WAIT_PLAYER';this.prepareStory();};
P.startCombatInterlude=function(id,scene){this.storyInterlude(id);this.s.storyContext.scene=scene;};
const previousValidate=P.validateSave;
P.validateSave=function(s){
  previousValidate.call(this,s);
  const index=this.storyIndex(),context=s.storyContext,active=context?.node||s.global.STORY_CURSOR_NODE_ID;
  const row=index.nodes.get(s.global.STORY_ROUTE_ID+':'+active);
  const definition=context?this.storyDefinition(context.entry):null;
  const embedded=[...index.affections.values()].find(d=>d.ROUTE_SCOPE===s.global.STORY_ROUTE_ID&&String(active).startsWith(d.id+'_')&&/ADULT|MATURE/.test(d.RELATION_KIND));
  if((definition&&/ADULT|MATURE/.test(definition.RELATION_KIND)||embedded)&&!this.storyMatureSaveAllowed?.(s,definition||embedded)){
    s.storySuspendedContext=copy({context:context||null,node:active,reason:'MATURE_POLICY_UNVERIFIED'});
    const frame=s.storyReturnStack?.pop();
    if(frame&&index.nodes.get(s.global.STORY_ROUTE_ID+':'+frame.main)?.table===TABLE_MAIN){s.global.STORY_CURSOR_NODE_ID=frame.main;s.global.CURRENT_STORY_NODE_ID=frame.main;s.global.PENDING_CHOICE_GROUP_ID=frame.choice||'';s.global.PENDING_INPUT_JSON=frame.input||'{}';s.global.CURRENT_MAP_ID=frame.map;}
    else if(index.nodes.get(s.global.STORY_ROUTE_ID+':'+s.global.STORY_CURSOR_NODE_ID)?.table!==TABLE_MAIN){s.global.STORY_CURSOR_NODE_ID='PAUSE';s.global.CURRENT_STORY_NODE_ID='PAUSE';s.global.PENDING_CHOICE_GROUP_ID='';s.global.PENDING_INPUT_JSON='{}';}
    s.storyContext=null;s.global.SCREEN_MODE='SYSTEM';s.global.STORY_EXPOSURE_NOTICE='확인되지 않은 관계 장면을 중단했습니다. 저장된 완료 기록은 유지됩니다.';
  }else if(row&&row.table!==(context?.table||TABLE_MAIN))fail('SAVE_STORY_CONTEXT','저장된 개인 장면의 복귀 문맥이 없습니다.');
  // Work on the candidate save only. Constructor validation precedes this.s, and
  // serialize() validates a clone: loading old saves never regrants or claws back bond.
  const facade=Object.create(this);facade.s=s;
  for(const def of index.legends.values())if(def.ROUTE_SCOPE===s.global.STORY_ROUTE_ID&&facade.storyDone(def.id)){
    const existing=s.storyEventReceipts?.[def.QUEST_ID]||s.storyEventReceipts?.[def.id];
    const receipt=existing||{day:s.global.WORLD_DAY,turn:s.quests[def.QUEST_ID]?.completedTurn??s.global.TURN,legend:def.id,quest:def.QUEST_ID,legacy:true};
    s.storyEventReceipts||={};s.storyEventReceipts[def.QUEST_ID]||=copy(receipt);s.storyEventReceipts[def.id]||=copy(receipt);
    Object.assign(facade.questState(def.QUEST_ID),{state:'완료',claimed:true});if(def.COMPLETE_FLAG_ID)s.flags[def.COMPLETE_FLAG_ID]=true;
  }
  if(!s.runtime&&s.storyContext?.kind==='LEGEND'&&facade.storyDone(s.storyContext.entry)){
    const frame=s.storyReturnStack?.pop();
    if(frame)facade.storyRestoreFrame(frame);
    else {s.storyContext=null;s.global.PENDING_CHOICE_GROUP_ID='';s.global.PENDING_INPUT_JSON='{}';facade.prepareStory();}
  }
  if(!s.runtime&&facade.storyAutomaticNode(facade.storyNode())){
    const screen=s.global.SCREEN_MODE;facade.prepareStory();
    if(!['STORY','STORY_WAIT'].includes(screen))s.global.SCREEN_MODE=screen;
  }
  return s;
};
api.StoryParser={parseCondition,parseEffects,NODE_COLUMNS};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.CRPGRuntime=api;
})(typeof globalThis!=='undefined'?globalThis:this);
