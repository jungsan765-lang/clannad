/* Liyue events keep authored facts inside the current save, quest and branch. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype;
const old=Object.fromEntries(['newGame','validateSave','storyEvent','storyConditionValue','mainStoryEntries','acceptMainStory','storyChapterEntries','storyArrivalGate','actionReason','apply','storyEntryReason','storyNext'].map(k=>[k,P[k]]));
const copy=x=>JSON.parse(JSON.stringify(x)),json=x=>{try{return JSON.parse(x||'{}');}catch{return {};}};
const fail=(c,m)=>{throw new api.RuleError(c,m);},yes=x=>x===true||x==='TRUE'||x==='Y';
const leafPattern=/^(K|AA|AB|B)[12]$/;
P.ensureLiyue=function(s=this.s){return s.liyue??={version:1,route:s.global.STORY_ROUTE_ID,activeQuest:null,accepts:{},events:{},chapters:{},travels:{},battles:{},access:{phase:'OUTSIDE'},regionReceipt:null};};
P.liyueParent=function(){const f=this.s.flags;return f.FLAG_ISK_META_KNOWLEDGE==='KNOWN'?'K':f.FLAG_ISK_MOND_BRANCH==='GUILD'?'B':f.FLAG_ISK_MOND_BRANCH==='EXPEDITION'?(f.FLAG_ISK_EXPEDITION_FORK==='RIDE'?'AA':f.FLAG_ISK_EXPEDITION_FORK==='RETURN'?'AB':null):null;};
P.liyueLeaf=function(){return this.s.flags.FLAG_ISK_L01_LEAF||'NONE';};
P.liyueDefinitions=function(){return this._liyueEvents??=new Map(this.storyEventDefinitions().filter(e=>/^isk_l0[1-4]$/.test(json(e.EXEC_PAYLOAD_JSON).handler)).map(e=>[e.EVENT_ID,{...e,p:json(e.EXEC_PAYLOAD_JSON)}]));};
P.liyueReceipt=function(id){const r=this.s.liyue?.events[id]||this.storyEventReceipt(id);return r&&r.saveId===this.s.global.SAVE_ID&&r.route===this.s.global.STORY_ROUTE_ID?r:null;};
P.liyuePersonalReady=function(){
 const s=this.s;if(s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER')return yes(s.flags.FLAG_TRV_LIYUE_CLEAR)&&this.storyDone('Q_TRV_LIYUE_04');
 const r=s.liyue?.regionReceipt;return !!r&&r.saveId===s.global.SAVE_ID&&r.route===s.global.STORY_ROUTE_ID&&r.leaf===this.liyueLeaf()&&yes(s.flags.FLAG_ISK_L04_REGION_CLEAR)&&s.liyue.access.phase==='OPEN'&&this.storyDone('Q_ISK_LIYUE_04');
};
P.storyConditionValue=function(name,args,property){
 const g=this.s.global,l=this.ensureLiyue();
 if(!args){
  if(name==='LIYUE_PERSONAL_READY'||name==='FUTURE_MAIN_HANDOFF_BRANCH_RECEIPT_VERIFIED')return this.liyuePersonalReady();
  if(name==='ACTIVE_STORY_QUEST')return l.activeQuest||'';
  if(/^L0[1-4]_EXPLICIT_(ENTRY|RESUME)_GUARD_CE\d+$/.test(name)){const q='Q_ISK_LIYUE_'+name.slice(1,3),a=l.accepts[q];return !!a&&a.saveId===g.SAVE_ID&&a.route===g.STORY_ROUTE_ID&&a.entry===this.storyActiveNodeId();}
  if(name==='EXACT_STORY_CURSOR')return true;
  if(name==='ISK_LIYUE_MAIN_PERSONAL_RELEASE')return this.liyuePersonalReady()?'CONFIRMED':'PENDING';
  if(name==='CUR_MORA')return g.MORA;
  if(name.startsWith('FLAG_')&&!Object.hasOwn(this.s.flags,name)){const r=this.tables['23_FLAG_DB'].get(name),v=r?.[2];if(v==='NONE')return 'NONE';}
 }
 if(args&&name==='QUEST_ACCEPTED')return !!(l.accepts[args[0]]||this.s.quests[args[0]]?.acceptedTurn!=null);
 if(args&&name==='ENCOUNTER_WON')return Object.values(this.s.combatReceipts||{}).some(r=>r.saveId===g.SAVE_ID&&r.victory&&r.group===args[0]&&String(r.origin).startsWith('STORY:TRV_LY'));
 if(args&&name==='AFFECTION_DONE')return this.storyDone(args[0]);
 return old.storyConditionValue.call(this,name,args,property);
};
P.liyueMondBoundaryReason=function(){
 const s=this.s,g=s.global,branch=this.liyueParent(),progress=json(g.EVENT_PROGRESS_JSON),q=s.quests.Q_ISK_MOND_03,id='EVT_ISK_M05_'+branch+'_END',r=this.liyueReceipt(id),finish=progress.Q_ISK_MOND_03?.m05?.[branch]?.finish_receipt;
 if(q?.state!=='완료'||!q.claimed||!yes(s.flags.FLAG_ISK_M05_CLEAR))return '몬드 본편의 마지막 장면과 완료 처리를 먼저 마쳐 주세요.';
 if(!r||r.branch!==branch||r.event!==id||r.resolvedNode!=='ISK_M05_'+branch+'_END'||finish?.saveId!==g.SAVE_ID||finish?.branch!==branch||finish?.event!==id)return '현재 저장과 같은 갈래의 몬드 완료 기록이 필요합니다.';
 if(this.itemCount('KEY_ISK_MYSTERY_ORB')!==(branch==='K'?0:1)||yes(s.flags.FLAG_ISK_ORB_OWNED)!==(branch!=='K'))return '몬드에서 이어진 구슬 소유 기록을 확인해 주세요.';
 return '';
};
P.liyueChapterOffers=function(){
 const g=this.s.global,l=this.ensureLiyue(),isk=g.STORY_ROUTE_ID==='ROUTE_ISEKAI',prefix=isk?'Q_ISK_LIYUE_':'Q_TRV_LIYUE_',out=[];
 for(let n=1;n<=4;n++){
  const quest=prefix+'0'+n,q=this.s.quests[quest];if(q?.claimed||q?.handedOffTo||l.accepts[quest])continue;
  let entry,map,reason='';
  if(isk){const e=[...this.liyueDefinitions().values()].find(e=>e.p.quest_id===quest&&e.p.kind==='chapter_enter'&&e.p.branch===this.liyueParent()&&(!e.p.leaf||e.p.leaf===this.liyueLeaf()));entry=e?.SOURCE_ID_OR_FILTER;map=e?.p.required_map;if(!e)reason=n===1?'몬드에서 선택한 여정이 확정되어야 합니다.':'이전 장에서 선택한 갈래를 이어갑니다.';else if(n===1&&this.liyueMondBoundaryReason())reason=this.liyueMondBoundaryReason();else if(!this.liyueReceipt(e.p.prior_end_event))reason=n===1?'몬드 본편을 끝내고 돌아오세요.':'이전 장의 마지막 장면을 먼저 마쳐 주세요.';}
  else {entry='TRV_LY'+n+'_START';map=n===1?'MAP_MOND_CITY':'MAP_LIYUE_HARBOR';if(n===1&&!yes(this.s.flags.FLAG_TRV_MON_CH2_CLEAR))reason='몬드 본편을 먼저 마쳐 주세요.';else if(n>1&&!this.storyDone(prefix+'0'+(n-1)))reason='이전 장을 먼저 마쳐 주세요.';}
  if(!reason&&map!==g.CURRENT_MAP_ID)reason=(this.tables['32_MAP_DB'].get(map)?.[2]||'이야기를 멈춘 장소')+'에서 시작할 수 있습니다.';
  if(!reason&&(this.s.storyContext||this.s.runtime||this.s.lifeJob||this.s.worldJob||this.s.storyJourney||this.s.storyBreak||!this.isStoryWaiting()))reason='현재 진행 중인 장면을 먼저 마쳐 주세요.';
  out.push({quest,entry,map,title:this.tables['22_QUEST_DB'].get(quest)?.[1]||'리월의 다음 장',label:'리월 본편 '+n+'장',reason,available:!reason,state:'미시작'});break;
 }
 return out;
};
P.mainStoryEntries=function(){return [...old.mainStoryEntries.call(this),...this.liyueChapterOffers()];};
P.storyChapterEntries=function(){return old.storyChapterEntries.call(this).filter(e=>!e.quest.includes('_LIYUE_'));};
P.acceptMainStory=function(id){
 if(!/^Q_(ISK|TRV)_LIYUE_0[1-4]$/.test(id))return old.acceptMainStory.call(this,id);
 const o=this.liyueChapterOffers().find(o=>o.quest===id);if(!o?.available)fail('LIYUE_START',o?.reason||'시작할 수 없는 장입니다.');
 const s=this.s,g=s.global,l=this.ensureLiyue();l.accepts[id]={saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,entry:o.entry,leaf:this.liyueLeaf(),parent:this.liyueParent(),day:g.WORLD_DAY,turn:g.TURN};l.activeQuest=id;
 Object.assign(this.questState(id),{state:'진행중',claimed:false,acceptedTurn:g.TURN});
 if(g.STORY_ROUTE_ID==='ROUTE_TRAVELER'){s.flags.FLAG_ACCESS_REGION_LIYUE=true;if(id==='Q_TRV_LIYUE_03')s.flags.FLAG_TRV_LY_GOLDEN_ACCESS=true;}
 Object.assign(g,{STORY_WAITING:false,STORY_MENU_POLICY:'',STORY_NEXT_PREPARED:'',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'STORY'});s.storyMenuFrame=null;delete s.storyJourney;delete s.storyArrival;this.storySetCursor(o.entry);this.prepareStory();return {quest:id,node:this.storyActiveNodeId()};
};
P.liyueEventGuard=function(e,{travel=false}={}){
 const p=e.p,g=this.s.global,l=this.ensureLiyue(),n=this.storyNode();
 if(!n||g.STORY_ROUTE_ID!=='ROUTE_ISEKAI'||n[4]!==e.SOURCE_ID_OR_FILTER||n[1]!==p.quest_id||!String(n[12]).includes('EVENT:'+e.EVENT_ID))fail('LIYUE_SOURCE','현재 장면의 사건만 실행할 수 있습니다.');
 if(l.activeQuest!==p.quest_id||!l.accepts[p.quest_id]||p.branch!==this.liyueParent())fail('LIYUE_ROUTE','현재 여정과 사건의 갈래가 일치하지 않습니다.');
 const leaf=this.liyueLeaf();for(const key of ['required_leaf','required_l01_leaf','required_l02_leaf','required_l03_leaf'])if(p[key]&&p[key]!==leaf)fail('LIYUE_LEAF','다른 선택 갈래의 사건을 실행할 수 없습니다.');
 if(p.kind==='fork'&&(leaf!==(p.required_previous_leaf||'NONE')||n[5]!=='CHOICE'))fail('LIYUE_FORK','이 갈래 선택은 이미 확정되었습니다.');
 if(!travel&&p.required_map&&g.CURRENT_MAP_ID!==p.required_map)fail('LIYUE_MAP','이야기의 지정 장소에서 진행해 주세요.');
 const chapterState=l.chapters[p.quest_id];if(p.requires_crisis_resolved_evidence&&!chapterState?.evidence[p.requires_crisis_resolved_evidence])fail('LIYUE_EVIDENCE','현재 현장의 대피 조사를 먼저 마쳐 주세요.');if(p.requires_treatment_receipt&&!chapterState?.treatment)fail('LIYUE_TREATMENT','전투에 앞서 치료 장면을 마쳐 주세요.');
 const phase=l.access.phase;if(p.required_access_phase&&p.required_access_phase!==phase)fail('LIYUE_ACCESS','현재의 출입 허가와 이동 구간이 일치하지 않습니다.');
 if(p.previous_phase&&p.previous_phase!==phase)fail('LIYUE_ACCESS','출입 허가의 앞선 단계를 확인해 주세요.');
 for(const id of p.required_event_ids||[])if(!this.liyueReceipt(id))fail('LIYUE_RECEIPT','아직 해결하지 않은 앞선 사건이 있습니다.');
 const chapter=l.chapters[p.quest_id],evidence=chapter?.evidence||{};for(const key of p.required_evidence||[])if(!evidence[key])fail('LIYUE_EVIDENCE','현재 갈래의 조사 기록이 더 필요합니다.');
 const applied=json(g.STORY_NODE_EFFECTS_JSON),chosen=ids=>ids.filter(id=>applied[g.STORY_ROUTE_ID+':'+id]||applied[id]);
 if(p.requires_exact_prior_consent_choice_receipt&&chosen(p.consent_choice_candidates||[p.consent_node]).length!==1)fail('LIYUE_CONSENT','치료를 받겠다는 선택을 먼저 해 주세요.');
 if(p.requires_exact_prior_reward_acceptance_choice_receipt&&chosen(p.reward_acceptance_choice_candidates||[]).length!==1)fail('LIYUE_REWARD','보상을 받겠다는 선택이 필요합니다.');
 if(p.requires_player_alive&&g.PLAYER_HP_CURRENT<=0)fail('LIYUE_ALIVE','이야기를 계속하려면 주인공이 회복해야 합니다.');
 if(p.required_flag_false&&yes(this.s.flags[p.required_flag_false]))fail('LIYUE_ONCE','이미 처리한 시간 경과입니다.');
 if(p.requires_access_phase&&p.requires_access_phase!==phase)fail('LIYUE_ACCESS','지역 개방 장면을 먼저 마쳐 주세요.');
 return n;
};
P.storyEvent=function(id){
 const e=this.liyueDefinitions().get(id);if(!e)return old.storyEvent.call(this,id);
 const s=this.s,g=s.global,l=this.ensureLiyue(),p=e.p,existing=l.events[id];
 if(existing){if(existing.saveId!==g.SAVE_ID||existing.route!==g.STORY_ROUTE_ID)fail('LIYUE_RECEIPT','사건 기록의 저장 출처가 다릅니다.');return copy(existing);}
 const n=this.liyueEventGuard(e,{travel:p.kind==='travel'}),q=l.chapters[p.quest_id]??={evidence:{},events:{},entryDay:g.WORLD_DAY,entryTime:g.WORLD_TIME,leaf:this.liyueLeaf(),parent:p.branch};
 if(p.kind==='chapter_enter'){
  if(p.quest_id==='Q_ISK_LIYUE_01'&&this.liyueMondBoundaryReason())fail('LIYUE_BOUNDARY',this.liyueMondBoundaryReason());
  const prior=this.liyueReceipt(p.prior_end_event);if(!prior||prior.resolvedNode!==p.prior_end_node)fail('LIYUE_HANDOFF','앞선 장의 실제 완료 지점이 필요합니다.');
  q.prior=copy(prior);q.snapshot={flags:copy(s.flags),priorSummary:copy(l.chapters[p.prior_quest]?.summary||{}),orb:this.itemCount('KEY_ISK_MYSTERY_ORB')};
  if(p.prior_quest.startsWith('Q_ISK_LIYUE_')){const prev=l.chapters[p.prior_quest];if(!prev?.gate||prev.gate.leaf!==p.leaf)fail('LIYUE_HANDOFF','앞선 장의 같은 갈래에서 이어가야 합니다.');this.questState(p.prior_quest).handedOffTo=p.quest_id;prev.handedOffTo=p.quest_id;}
  l.access={phase:p.set_flags?.['FLAG_ISK_'+p.handler.slice(4).toUpperCase()+'_ACCESS_PHASE']||'OUTSIDE',quest:p.quest_id,leaf:p.leaf||null,event:id};
 }else if(p.kind==='travel'){
  if(g.CURRENT_MAP_ID!==p.from_map)fail('LIYUE_TRAVEL','이 장면의 출발 위치를 확인해 주세요.');
  if(p.movement_mode!=='STORY_SCRIPTED'||(p.from_map!==p.to_map&&!p.cross_map_authorization))fail('LIYUE_TRAVEL','장면 이동의 허가가 없습니다.');
  this.storyElapsedMinutes(Number(p.minutes||0));const m=this.row('32_MAP_DB',p.to_map);Object.assign(g,{CURRENT_MAP_ID:p.to_map,LOCATION:p.location||m[2],LOCATION_PROFILE:m[5]});this.ensureExplorationState();
 }else if(p.kind==='overnight'||p.kind==='day_skip'){
  const [h,m]=String(g.WORLD_TIME).split(':').map(Number),now=(g.WORLD_DAY-1)*1440+h*60+m;
  const targetTime=p.kind==='overnight'?'07:00':p.target_time||'08:00',[th,tm]=targetTime.split(':').map(Number),day=p.kind==='overnight'?g.WORLD_DAY+1:q.entryDay+Number(p.days||5),elapsed=(day-1)*1440+th*60+tm-now;
  this.storyElapsedMinutes(Math.max(0,elapsed)); // A free journey must not rewind time or soft-lock a missed date.
 }else if(p.kind==='elapsed')this.storyElapsedMinutes(Number(p.minutes||0));
 else if(p.kind==='recovery'){g.PLAYER_HP_CURRENT=Math.max(g.PLAYER_HP_CURRENT,Math.ceil(g.PLAYER_HP_MAX*.7));this.storyElapsedMinutes(Number(p.minutes??p.time_delta_minutes??0));q.treatment=id;}
 else if(p.kind==='evidence'){q.evidence[p.key]={facts:copy(p.facts),event:id,leaf:this.liyueLeaf()};}
 else if(p.kind==='access'){l.access={phase:p.phase,quest:p.quest_id,leaf:this.liyueLeaf(),event:id,allowedMaps:copy(p.allowed_maps||[])};}
 else if(p.kind==='blockade'){l.access={phase:'OUTSIDE',quest:p.quest_id,leaf:this.liyueLeaf(),event:id};}
 else if(p.kind==='combat_gate'){
  const b=json(g.LAST_BATTLE_RESULT_JSON),r=s.combatReceipts?.[b.id];if(!r?.victory||r.saveId!==g.SAVE_ID||r.group!==p.encounter_group_id||r.gate!==n[4]||r.branch!==this.liyueLeaf())fail('LIYUE_BATTLE','현재 갈래의 실제 전투 승리가 필요합니다.');
  q.battle={...copy(r),leaf:this.liyueLeaf()};l.battles[n[4]]=q.battle;
 }else if(!['fork','gate','chapter_enter'].includes(p.kind))fail('LIYUE_HANDLER','연결되지 않은 리월 사건입니다.');
 if(p.requires_real_golden_battle_win_receipt||p.requires_real_battle_win_receipt){if(!q.battle?.victory||q.battle.leaf!==this.liyueLeaf())fail('LIYUE_BATTLE','이번 장의 실제 전투 완료 기록이 필요합니다.');}
 Object.assign(s.flags,p.set_flags||{});
 if(p.kind==='gate'){
  q.summary=copy(p.summary);q.gate={...copy(p.content_gate),event:id,leaf:this.liyueLeaf()};
  if(p.quest_complete){for(const prev of p.historical_quest_finalization?.quests||[]){if(!l.chapters[prev]?.handedOffTo)fail('LIYUE_HISTORY','앞선 장의 인계 기록이 없습니다.');this.storyCompleteQuest(prev);}this.storyCompleteQuest(p.quest_id);const rw=p.reward||{};g.MORA+=Number(rw.mora||0);for(const [item,count]of Object.entries(rw.items||{}))this.giveItem(item,count);l.access={phase:'OPEN',quest:p.quest_id,leaf:this.liyueLeaf(),event:id};s.flags.FLAG_ACCESS_REGION_LIYUE=true;}
  g.STORY_MENU_POLICY='';g.STORY_NEXT_PREPARED='';
 }
 const receipt={event:id,resolvedNode:n[4],saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,quest:p.quest_id,branch:p.branch,leaf:this.liyueLeaf(),kind:p.kind,day:g.WORLD_DAY,turn:g.TURN,action:g.SAVE_ID+':'+(g.LAST_COMMITTED_ACTION_SEQ+1)};
 l.events[id]=receipt;q.events[id]=receipt;if(p.kind==='travel')l.travels[id]=receipt;if(p.kind==='gate'&&p.quest_complete)l.regionReceipt=copy(receipt);
 const progress=json(g.EVENT_PROGRESS_JSON);progress[id]=receipt;progress[p.quest_id]??={};progress[p.quest_id].events??={};progress[p.quest_id].events[id]=receipt;const key=p.handler.slice(4);progress[p.quest_id][key]??={};progress[p.quest_id][key][key==='l01'?p.branch:this.liyueLeaf()]=copy(q);g.EVENT_PROGRESS_JSON=JSON.stringify(progress);s.storyEventReceipts??={};s.storyEventReceipts[id]=receipt;
 return copy(receipt);
};
if(old.storyArrivalGate)P.storyArrivalGate=function(r){
 const travelerTravel=r?.[0]==='ROUTE_TRAVELER'&&r[1]==='Q_TRV_LIYUE_04'?({TRV_LY4_D01:['MAP_LIYUE_HARBOR','MAP_OSIAL_BATTLE'],TRV_LY4_S04:['MAP_OSIAL_BATTLE','MAP_LIYUE_HARBOR']}[r[4]]):null;
 if(travelerTravel&&this.s.global.CURRENT_MAP_ID!==travelerTravel[1]){const g=this.s.global;this.s.storyJourney={node:r[4],route:g.STORY_ROUTE_ID,from:travelerTravel[0],target:travelerTravel[1],minutes:0,policy:g.STORY_MENU_POLICY||'',scripted:true,traveler:true};Object.assign(g,{STORY_MENU_POLICY:'',STORY_WAITING:true,PENDING_CHOICE_GROUP_ID:'',SCREEN_MODE:'LOCATION'});return true;}
 const t=this.storyTravelFor?.(r);if(t&&this.liyueDefinitions().has(t.event)){
  if(this.s.liyue?.travels[t.event])return false;
  if(this.s.runtime)return false;const g=this.s.global;this.s.storyJourney={node:r[4],route:g.STORY_ROUTE_ID,from:t.from_map,target:t.to_map,event:t.event,minutes:t.minutes||0,policy:g.STORY_MENU_POLICY||'',scripted:true};Object.assign(g,{STORY_MENU_POLICY:'',STORY_WAITING:true,PENDING_CHOICE_GROUP_ID:'',SCREEN_MODE:'LOCATION'});return true;
 }
 return old.storyArrivalGate?.call(this,r)||false;
};
P.storyEntryReason=function(d){if(d?.REGION==='리월'||String(d?.CHAR_ID).startsWith('LIYUE_')){if(d?.kind==='LEGEND'&&d.CHAR_ID!=='LIYUE_ZHONGLI'&&this.liyueLegendProgress){const gate=this.liyueLegendProgress(d);if(gate&&!gate.ready)return gate.label+' 후 시작할 수 있습니다.';return old.storyEntryReason.call(this,d);}if(!this.liyuePersonalReady())return '리월 본편을 끝내고 자유롭게 만날 수 있을 때 시작합니다.';}return old.storyEntryReason.call(this,d);};
P.actionReason=function(type,a={}){
 const l=this.s.liyue,g=this.s.global,j=this.s.storyJourney;
 if(type==='STORY_SCRIPTED_TRAVEL'){if(!j?.scripted||this.s.runtime||this.s.placeVisit||this.s.lifeJob||this.s.worldJob)return '현재 이야기의 이동을 선택해 주세요.';try{if(j.traveler){if(g.STORY_ROUTE_ID!=='ROUTE_TRAVELER'||this.storyActiveNodeId()!==j.node||!this.s.liyue?.accepts.Q_TRV_LIYUE_04)fail('LIYUE_TRAVEL','현재 여행자 본편의 이동이 아닙니다.');if(j.node==='TRV_LY4_S04'&&!Object.values(this.s.combatReceipts||{}).some(r=>r.saveId===g.SAVE_ID&&r.group==='EG_BOSS_OSIAL'&&r.victory))fail('LIYUE_TRAVEL','해역 방어를 먼저 마쳐 주세요.');}else this.liyueEventGuard(this.liyueDefinitions().get(j.event),{travel:true});}catch(e){return e.message;}return g.CURRENT_MAP_ID===j.from?'':'이야기의 출발 위치를 확인해 주세요.';}
 if(type==='MAIN_STORY_ACCEPT'&&String(a.quest).includes('_LIYUE_'))return this.liyueChapterOffers().find(o=>o.quest===a.quest)?.reason||(!this.liyueChapterOffers().some(o=>o.quest===a.quest)?'현재 시작할 수 없는 장입니다.':'');
 if(g.STORY_ROUTE_ID==='ROUTE_ISEKAI'&&l?.activeQuest&&!l.regionReceipt){
  const chapter=l.chapters[l.activeQuest];if(chapter?.gate&&!chapter.handedOffTo&&['STORY_NEXT','STORY_CHOICE'].includes(type))return '다음 장을 선택해서 현재 이야기의 갈래를 이어가세요.';
  if(type==='MOVE'){const e=this.tables['47_MAP_EDGE_DB'].get(a.edge);if(e?.[2]==='MAP_LIYUE_HARBOR'&&!this.liyueReturnAllowed?.(e[2]))return '지금은 도시 출입이 제한됩니다. 본편의 안내에 따라 이동하세요.';}
  const betweenChapters=this.storyDone(l.activeQuest),stagedSidePass=betweenChapters&&(type==='LEGEND_REGISTER'||type==='PLACE_ENTER'&&a.place==='EVT_CRPG_LIYUE_GUILD');
  if(!stagedSidePass&&['PLACE_ENTER','NPC','BUY','SELL','CRAFT','COMMISSION_ACCEPT','LEGEND_REGISTER'].includes(type)&&g.CURRENT_MAP_ID==='MAP_LIYUE_HARBOR')return '현재는 허가된 본편 구역에서만 활동할 수 있습니다.';
 }
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){if(a.type==='STORY_SCRIPTED_TRAVEL'){const j=copy(this.s.storyJourney);let result;if(j.traveler){const g=this.s.global,m=this.row('32_MAP_DB',j.target);this.ensureLiyue().travelerTravels??={};this.s.liyue.travelerTravels[j.node]={saveId:g.SAVE_ID,route:g.STORY_ROUTE_ID,from:j.from,target:j.target,day:g.WORLD_DAY,turn:g.TURN};Object.assign(g,{CURRENT_MAP_ID:j.target,LOCATION:m[2],LOCATION_PROFILE:m[5]});this.ensureExplorationState();result={traveler:true};}else result=this.storyEvent(j.event);this.s.storyArrival={...j,target:this.s.global.CURRENT_MAP_ID};delete this.s.storyJourney;this.s.global.STORY_WAITING=false;this.s.global.STORY_MENU_POLICY=j.policy||'';this.storySetCursor(j.choiceGroup||j.node);this.prepareStory();return {...result,travel:true};}return old.apply.call(this,a);};
P.newGame=function(o){old.newGame.call(this,o);this.ensureLiyue();return copy(this.s);};
P.validateSave=function(s){
 const l=this.ensureLiyue(s);if(l.version!==1||l.route!==s.global.STORY_ROUTE_ID||!l.events||!l.chapters||!l.accepts||!l.access)fail('LIYUE_SAVE','리월 진행 기록을 확인해 주세요.');
 for(const [id,r]of Object.entries(l.events)){const e=this.liyueDefinitions().get(id);if(!e||r.saveId!==s.global.SAVE_ID||r.route!==s.global.STORY_ROUTE_ID||r.resolvedNode!==e.SOURCE_ID_OR_FILTER||r.quest!==e.p.quest_id||r.leaf!=='NONE'&&!leafPattern.test(r.leaf))fail('LIYUE_SAVE','리월 사건의 출처가 일치하지 않습니다.');}
 if(l.regionReceipt){const r=l.regionReceipt;if(!l.events[r.event]||r.leaf!==s.flags.FLAG_ISK_L01_LEAF||!yes(s.flags.FLAG_ISK_L04_REGION_CLEAR))fail('LIYUE_SAVE','리월 종결 기록이 일치하지 않습니다.');}
 return old.validateSave.call(this,s);
};
})(globalThis);
