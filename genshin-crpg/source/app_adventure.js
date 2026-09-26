/* Main map, quest journal, timed work, bounded saves and committed rewards. */
function mapName(id){return game.tables['32_MAP_DB'].get(id)?.[2]||'진행 장소';}
function levelLabel(id){const m=game.tables['32_MAP_DB'].get(id);return m?'권장 Lv. '+m[6]+'–'+m[7]:'';}
function firstTravelEdge(target){
 const start=game.s.global.CURRENT_MAP_ID;if(start===target)return null;
 const queue=[{map:start,first:null}],seen=new Set([start]);
 while(queue.length){const v=queue.shift();for(const row of game.rows('47_MAP_EDGE_DB').filter(r=>r[1]===v.map&&r[11]==='ACTIVE'&&r[8]==='Y')){
  if(row[6]&&!(row[6]==='FLAG_TRUE'&&[true,'Y','TRUE'].includes(game.s.flags[row[7]])))continue;
  if(seen.has(row[2]))continue;const first=v.first||row;if(row[2]===target)return first;seen.add(row[2]);queue.push({map:row[2],first});
 }}return null;
}
function travelGuide(parent,target){
 const current=game.s.global.CURRENT_MAP_ID;parent.append(el('p','objective-location','진행 장소 · '+mapName(target)+' · '+levelLabel(target)));
 if(target===current)return;
 const edge=firstTravelEdge(target);if(edge)parent.append(actionButton(mapName(edge[2])+' 방향으로 이동','MOVE',{edge:edge[0]}));else parent.append(el('small','muted','이야기에서 이동 경로가 열리면 진행할 수 있습니다.'));
}
function mainObjective(parent){
 const g=game.s.global,box=el('section','main-objective'),node=game.storyIndex().byTable['55_MAIN_STORY_DB'].find(r=>r[0]===g.STORY_ROUTE_ID&&r[4]===g.CURRENT_STORY_NODE_ID),title=game.tables['22_QUEST_DB'].get(node?.[1])?.[1];
 box.append(el('small','eyebrow','메인 임무'),el('h2','',title||'다음 여정'));
 if(game.s.storyContext){box.append(el('p','','개인 이야기를 마치면 메인 임무로 돌아갑니다.'),actionButton('진행 중인 이야기로','MENU',{screen:'STORY'},true));}
 else if(game.s.storyRecovery){box.append(el('p','','이야기 전투에서 패배했습니다. 전투 직전 상태로 돌아가 편성을 준비할 수 있습니다.'),actionButton('전투 직전부터 다시 준비','STORY_RETRY',{},true));}
 else if(!game.isStoryWaiting()){
  box.append(el('p','',game.s.battlePreparation?'전투 준비와 편성을 확인해 주세요.':node?.[5]==='MENU_GATE'?'자유행동을 마쳤다면 이야기에서 다음 장면을 진행하세요.':'이야기 화면에서 현재 대화와 선택을 이어갈 수 있습니다.'),actionButton(game.s.battlePreparation?'전투 준비 계속':'메인 이야기 계속','MENU',{screen:'STORY'},true));
 }else{
  const offers=game.mainStoryEntries?.()||[],chapters=game.storyChapterEntries?.()||[];let count=0;
  if(g.STORY_NEXT_PREPARED){box.append(actionButton('메인 이야기 계속','STORY_RESUME',{},true));count++;}
  for(const c of offers.filter(x=>x.available)){box.append(actionButton(c.title||c.label||c.name||'메인 임무 시작','MAIN_STORY_ACCEPT',{quest:c.quest||c.id},true));if(c.reason)box.append(el('p','choice-note',c.reason));count++;}
  if(!g.STORY_NEXT_PREPARED)for(const c of chapters){box.append(actionButton(c.title,'STORY_CHAPTER',{node:c.id},true));count++;}
  if(!count&&offers.length){const pending=offers[0];box.append(el('h3','',pending.title||pending.label||'다음 메인 임무'),el('p','',pending.reason||'이야기 화면에서 다음 진행 조건을 확인하세요.'));if(pending.map&&pending.map!==g.CURRENT_MAP_ID)travelGuide(box,pending.map);else if(pending.quest==='Q_ISK_MOND_02'&&g.CURRENT_MAP_ID!=='MAP_MOND_CITY')travelGuide(box,'MAP_MOND_CITY');count++;}
  if(!count)box.append(el('p','',g.STORY_WAIT_REASON||'현재 공개된 본편 구간을 마쳤습니다. 의뢰와 개인 임무를 확인해 주세요.'));
 }
 parent.append(box);
}
function placeVisual(entry){
 const map=game.tables['32_MAP_DB'].get(game.s.global.CURRENT_MAP_ID),region=map?.[1]||'',text=(entry.id||'')+' '+(entry.name||'')+' '+(entry.facility||'')+' '+(entry.merchantType||'')+' '+(entry.merchantName||'');
 const base='assets/icons/facility/';let icon=base+'UI_Icon_Intee_Shop.png',kind='이용 시설';
 if(['NPC_MOND_KATHERYNE','NPC_LIYUE_KATHERYNE'].includes(entry.entity)){icon=base+'UI_Icon_Intee_DailyEvent_0.png';kind='의뢰 접수';}
 else if(isInn(entry)){icon=base+'UI_Icon_Intee_Comfort.png';kind='숙박시설';}
 else if(/디어 헌터|만민당|식당/.test(text)){icon=base+'UI_Icon_Intee_Restaurant.png';kind='식당';}
 else if(/공용 조리|조리시설/.test(text)){icon=base+'UI_Icon_Intee_Cooking.png';kind='조리시설';}
 else if(/불복려|연금|의료|약제/.test(text)){icon=base+'UI_Icon_Intee_Combine.png';kind='연금·의료';}
 else if(entry.kind==='BOSS'){icon=base+'UI_Icon_Intee_DailyEvent_0.png';kind='도전 입구';}
 else if(game.placeCanEnhance?.(entry)||/대장간|대장장이/.test(text)){icon=base+'UI_Icon_Intee_Blacksmith.png';kind='대장간';}
 else if(/잡화|보급|General|GENERAL/.test(text)){icon=base+'UI_Icon_Intee_GeneralCargo.png';kind='잡화·보급';}
 else if(/장비점|장비 판매/.test(text)){icon=base+'UI_Icon_Intee_Shop.png';kind='장비 상점';}
 else if(entry.modes.includes('CRAFT')){icon=base+'UI_Icon_Intee_Combine.png';kind='작업 시설';}
 else if(entry.modes.includes('SHOP')){icon=base+'UI_Icon_Intee_Shop.png';kind='상점';}
 else if(entry.modes.includes('TALK')){icon=base+'UI_Icon_Intee_Talk.png';kind='이야기·소개';}
 return {region,icon,kind};
}
function recoveryCard(parent){const c=el('section','card recovery-card');c.append(el('h2','','전투불능'),el('p','','이 상태에서는 이동하거나 전투할 수 없습니다. 회복하면 파티의 HP가 복구되며 1시간이 지납니다.'),actionButton('회복하고 다시 출발','RECOVER',{},true));parent.append(c);}
function lifePanel(parent){
 const entries=game.lifeEntries();if(!entries.length)return;
 const section=el('section','life-panel');section.append(el('h2','','생활 행동'),el('p','muted','작업 10초 · 게임 시간 10분 · 구역별 자원은 게임 내 다음 날 다시 생성됩니다.'));
 const grid=el('div','life-grid');for(const entry of entries){const c=el('section','card life-resource');c.append(el('h3','',entry.label),el('p','','오늘 남은 자원 '+entry.remaining+' / '+entry.limit));if(entry.kind==='MINE')c.append(el('small','muted','철광 65% · 백철 30% · 수정덩이 5%'));
  c.append(actionButton(entry.remaining?entry.label+' 시작 · 10초':'오늘 자원 고갈','LIFE_START',{kind:entry.kind}));grid.append(c);
 }section.append(grid);parent.append(section);
}
drawLocation=function(p,v){
 p.classList.add('adventure-main');p.append(el('div','eyebrow','메인 화면'),el('h1','',v.map[2]),el('p','area-level',levelLabel(v.map[0])+(v.map[12]==='Y'?' · 안전지대':' · 야외 구역')));
 if(game.needsRecovery()){recoveryCard(p);return;}mainObjective(p);
 p.append(el('h2','','주변 시설'));const grid=el('div','grid location-places');
 for(const entry of game.placeEntries()){const visual=placeVisual(entry),card=el('section','card place-entry region-'+(visual.region==='리월'?'liyue':visual.region==='몬드'?'mond':'other')),body=el('div','place-entry-copy'),icon=el('img','place-entry-icon');icon.src=visual.icon;icon.alt='';icon.loading='lazy';body.append(el('small','place-entry-kind',(visual.region?visual.region+' · ':'')+visual.kind),el('h3','',placeName(entry)));if(entry.facility&&entry.facility!==v.map[2])body.append(el('p','muted',entry.facility));if(entry.reason)body.append(el('small','choice-note',entry.reason));card.append(icon,body,actionButton(entry.kind==='BOSS'?'입구로 가기':isInn(entry)?'숙박 안내':entry.modes[0]==='TALK'?'찾아가기':'들어가기','PLACE_ENTER',{place:entry.id}));grid.append(card);}
 if(grid.children.length)p.append(grid);else p.append(el('p','muted','이곳에는 이용할 시설이 없습니다.'));
 lifePanel(p);const waiting=el('section','wait-controls');waiting.append(actionButton('1시간 기다리기','WAIT',{minutes:60}));if(v.map[12]!=='Y')waiting.append(el('small','muted','기다리는 동안 '+v.map[9]+'% 확률로 적과 조우합니다. 전투 직후에는 한 번 보호됩니다.'));p.append(waiting);bossProgressControls(p);
};
function materialSources(parent,id){
 const stocks=game.rows('19_SHOP_STOCK_DB').filter(r=>r[2]==='ITEM'&&r[3]===id&&!/SYSTEM_DISABLED|레거시/.test(r[8]||''));
 const seen=new Set();for(const stock of stocks){let entry=game.placeCatalog().find(e=>e.merchant===stock[1]);const merged=game.placeMergedInto(entry);if(merged)entry=game.placeCatalog().find(e=>e.id===merged);if(!entry||seen.has(entry.merchant))continue;seen.add(entry.merchant);const here=entry.maps.includes(game.s.global.CURRENT_MAP_ID),map=here?game.s.global.CURRENT_MAP_ID:entry.maps[0];if(!here&&!firstTravelEdge(map))continue;parent.append(el('small','material-source',mapName(map)+' · '+placeName(entry)+' · '+stock[5]+' 모라'));
  if(here)parent.append(actionButton(placeName(entry)+' 방문','PLACE_ENTER',{place:entry.id,mode:'SHOP'}));else{const edge=firstTravelEdge(map);if(edge)parent.append(actionButton(mapName(edge[2])+' 방향으로','MOVE',{edge:edge[0]}));}if(seen.size>=2)break;
 }
 if(['ORE_IRON','ORE_WHITE_IRON','ORE_CRYSTAL'].includes(id))parent.append(el('small','material-source','광맥이 있는 야외 구역 → 메인 화면 → 채광'));
}
journalEntry=function(parent,entry){
 const d=entry.definition||{},c=el('section','card personal-objective');c.append(el('small','','개인 임무'),el('h3','',game.tables['22_QUEST_DB'].get(d.QUEST_ID)?.[1]||entry.title));
 const state=CRPGJournalPresenter.progress(game,entry);if(state.status==='active'){c.append(el('p','journal-status','진행 중'));journalContinue(c,state);parent.append(c);return;}
 if(d.MAP_ID)travelGuide(c,d.MAP_ID);
 const costs=parseUI(d.COST_ITEMS_JSON),mora=Number(d.COST_MORA||0);if(game.s.storyCostReceipts?.[d.QUEST_ID])c.append(el('p','muted','준비물을 전달하고 수락한 임무입니다.'));else if(mora||Object.keys(costs).length){c.append(el('h4','','수락 준비물'));if(mora)c.append(el('p','','모라 '+mora+' · 보유 '+game.s.global.MORA));for(const [id,n]of Object.entries(costs)){const material=el('div','material-requirement');material.append(el('strong','',safeName('14_ITEM_DB',id)+' '+game.itemCount(id)+' / '+n));materialSources(material,id);c.append(material);}c.append(el('small','muted','소개는 무료이며, 이야기에서 수락할 때 준비물을 한 번 사용합니다.'));}
 if(entry.reason)c.append(el('p','choice-note',entry.reason));const start=actionButton(game.storyLegendEntryNode(d)!==d.ENTRY_NODE_ID?'준비물 확인부터 계속':'개인 이야기 열기','LEGEND_ENTER',{quest:entry.id},true);start.disabled=start.disabled||!!entry.reason;c.append(start);parent.append(c);
};
function rewardPreview(parent,rewards){
 const box=el('div','reward-preview');if(rewards.mora)box.append(el('span','','◈ '+rewards.mora+' 모라'));if(rewards.xp)box.append(el('span','','✦ 경험치 '+rewards.xp));for(const [id,n]of Object.entries(rewards.items||{}))box.append(el('span','',safeName('14_ITEM_DB',id)+' ×'+n));if(rewards.equipment_choice)box.append(el('span','','장비 1개 선택'));parent.append(box);
}
function commissionCard(parent,q,guild=false){
 const c=el('section','card commission-card'),r=q.row,d=q.definition,state=q.state;c.append(el('small','',state?.claimed?'완료':q.accepted?'진행 중':'미수락'),el('h3','',r[1]),el('p','',r[5]||d.text));travelGuide(c,d.map_id);rewardPreview(c,q.reward);
 if(state?.claimed){c.append(el('p','muted','보상을 수령했습니다.'));}
 else if(!q.accepted){if(guild)c.append(actionButton('의뢰 수락','COMMISSION_ACCEPT',{quest:r[0]},true));else c.append(el('p','muted','안내원에게 찾아가 의뢰를 받아 주세요.'));}
 else if(q.reason)c.append(el('p','choice-note',q.reason));
 else if(state?.node==='READY_TO_CLAIM'){if(q.reward.equipment_choice)for(const id of q.reward.equipment_choice)c.append(actionButton(safeName('16_EQUIP_DB',id)+' 수령','CLAIM_QUEST',{quest:r[0],equipment:id}));else c.append(actionButton('의뢰 완료 · 보상 수령','CLAIM_QUEST',{quest:r[0]},true));}
 else for(const choice of d.choices||[]){if(['leave','requirements'].includes(choice.id))continue;c.append(actionButton(choice.label,'QUEST_CHOICE',{quest:r[0],choice:choice.id}));}parent.append(c);
}
const previousGuildDialogue=dialogue;
dialogue=function(p,v){
 previousGuildDialogue(p,v);if(!game.atGuild())return;p.append(el('h2','','의뢰 접수'));
 const currentRegion=game.view().map[1],offers=game.commissionEntries().filter(q=>!q.state?.claimed),regions=[...new Set(offers.map(q=>q.row[2]))].sort((a,b)=>Number(b===currentRegion)-Number(a===currentRegion));
 for(const region of regions){const section=el('details','guild-region');section.open=region===currentRegion;const rows=offers.filter(q=>q.row[2]===region);section.append(el('summary','',region+' 의뢰 · '+rows.length));for(const q of rows)commissionCard(section,q,true);p.append(section);}
 if(!offers.length)p.append(el('p','muted','현재 새로 받을 의뢰가 없습니다.'));
 p.append(el('p','muted','몬드 동료 영입 임무는 디어 헌터의 사라 또는 천사의 몫에서 소개받을 수 있습니다.'));
 p.append(el('h2','','개인 임무 소개'));for(const entry of game.storyEntries().filter(e=>e.kind==='LEGEND'&&!game.legendRegistered(e.id)&&game.legendContactAllowed(e.definition))){const c=el('section','card');if(typeof requirementList==='function')requirementList(c,game.legendRequirements(entry.definition));c.append(el('h3','',game.tables['22_QUEST_DB'].get(entry.definition.QUEST_ID)?.[1]||entry.title),el('p','muted','소개받은 뒤 임무 → 진행 중에서 준비물과 진행 장소를 확인할 수 있습니다.'),actionButton('개인 임무 소개받기','LEGEND_REGISTER',{quest:entry.id}));p.append(c);}
};
function journalSection(parent,title,count,hint=''){const box=el('section','journal-section'),head=el('div','journal-head');head.append(el('h2','',title),el('span','journal-count',String(count)));box.append(head);if(hint)box.append(el('p','muted journal-hint',hint));parent.append(box);return box;}
function journalTravel(parent,map){if(!map||map===game.s.global.CURRENT_MAP_ID)return;const edge=firstTravelEdge(map);if(edge)parent.append(actionButton(mapName(edge[2])+' 방향으로 이동','MOVE',{edge:edge[0]}));else parent.append(el('small','muted','이야기에서 이동 경로가 열리면 갈 수 있습니다.'));}
const JOURNAL_STATUS={active:'진행 중',ready:'지금 시작 가능',travel:'장소로 이동 필요',locked:'조건 확인 필요'};
// The story being played: continue it where it left off instead of offering to start it.
function journalContinue(parent,m){if(!m.map){parent.append(actionButton('이야기로 돌아가기','MENU',{screen:'STORY'},true));return;}if(m.arrived){parent.append(actionButton('도착 · 이야기 계속','JOURNEY_RESUME',{},true));return;}parent.append(el('small','journal-note',mapName(m.map)+'에 도착하면 이어집니다.'));journalTravel(parent,m.map);}
// The entry itself may be open while the current scene still blocks every action; the journal
// collects those reasons and says them once above the lists instead of under every card.
let journalBlocked=null;
function journalStart(parent,label,type,params){parent.append(actionButton(label,type,params,true));const why=game.actionReason(type,params);if(!why)return;if(journalBlocked)journalBlocked.add(why);else parent.append(el('small','choice-note journal-why',why));}
function legendProgressCard(parent,m){
 const d=m.definition,c=el('article','card journal-card status-'+m.status),head=el('div','journal-card-head');
 head.append(el('small','journal-kind','동료 획득'+(m.region?' · '+m.region:'')),el('span','journal-status',JOURNAL_STATUS[m.status]+(m.accepted?' · 수락 완료':'')));c.append(head,el('h3','',m.title));
 if(m.status==='active'){const actions=el('div','journal-actions');c.append(el('p','journal-place',m.map?'다음 장면 · '+mapName(m.map):'진행 장소 · '+mapName(game.s.global.CURRENT_MAP_ID)));journalContinue(actions,m);c.append(actions);parent.append(c);return;}
 if(d.MAP_ID)c.append(el('p','journal-place','진행 장소 · '+mapName(d.MAP_ID)));
 const unmet=m.requirements.filter(r=>!r.met&&r.kind!=='map');if(unmet.length){const chips=el('ul','journal-chips');for(const r of unmet)chips.append(el('li','requirement-unmet','필요 · '+r.label));c.append(chips);}
 else if(m.status==='locked'&&m.reason)c.append(el('p','choice-note',m.reason));
 const actions=el('div','journal-actions');if(m.status==='ready')journalStart(actions,game.storyLegendEntryNode(d)!==d.ENTRY_NODE_ID?'준비물 확인부터 계속':'개인 이야기 열기','LEGEND_ENTER',{quest:m.id});else if(m.status==='travel')journalTravel(actions,d.MAP_ID);if(actions.children.length)c.append(actions);
 const missing=m.accepted?[]:Object.entries(parseUI(d.COST_ITEMS_JSON)).filter(([id,n])=>game.itemCount(id)<Number(n));
 if(missing.length){const more=el('details','journal-more');more.append(el('summary','','준비물 구하는 곳 · '+missing.length+'종'));for(const [id]of missing){const row=el('div','material-requirement');row.append(el('strong','',safeName('14_ITEM_DB',id)));materialSources(row,id);more.append(row);}c.append(more);}
 parent.append(c);
}
function affectionProgressRow(parent,m){
 const row=el('article','journal-row status-'+m.next.status),photo=portraitFor(m.profile),copy=el('div','journal-row-copy'),actions=el('div','journal-row-actions');
 if(photo){const img=el('img','journal-thumb');img.src=photo;img.alt='';img.loading='lazy';row.append(img);}else row.append(el('span','journal-thumb journal-thumb-empty','♡'));
 const active=m.next.status==='active';
 copy.append(el('strong','',m.name+' · '+m.next.label),el('small','muted',active?'진행 중'+(m.next.map?' · '+mapName(m.next.map)+'에서 이어짐':''):(m.next.map?mapName(m.next.map)+' · ':'')+(m.next.status==='ready'?'지금 진행 가능':'장소로 이동하면 진행 가능')));
 if(active)journalContinue(actions,m.next);else if(m.next.status==='ready')journalStart(actions,'이야기 시작','AFFECTION_ENTER',{event:m.next.id});else journalTravel(actions,m.next.map);
 row.append(copy,actions);parent.append(row);
}
function journalDone(parent,kind,title,note){const row=el('div','journal-done');row.append(el('small','journal-kind',kind),el('strong','',title));if(note)row.append(el('small','muted',note));parent.append(row);}
function completedJournal(p,linked){
 const quests=game.tables['22_QUEST_DB'],done=game.commissionEntries().filter(q=>q.state?.claimed),story=linked.filter(x=>x.state.claimed);
 const guild=journalSection(p,'의뢰',done.length+story.length);for(const q of done)journalDone(guild,(q.row[2]?q.row[2]+' ':'')+'의뢰',q.row[1],'보상 수령 완료');for(const {row}of story)journalDone(guild,'본편 연동 의뢰',row[1],'');
 if(!done.length&&!story.length)guild.append(el('p','empty','아직 완료한 의뢰가 없습니다.'));
 const legends=game.storyEntries().filter(e=>e.kind==='LEGEND'&&game.storyDone(e.id)),recruit=journalSection(p,'동료 획득 임무',legends.length);
 for(const e of legends)journalDone(recruit,'동료 획득'+(e.definition.REGION?' · '+e.definition.REGION:''),quests.get(e.definition.QUEST_ID)?.[1]||e.title,'');
 if(!legends.length)recruit.append(el('p','empty','아직 마친 동료 획득 임무가 없습니다.'));
 const people=CRPGJournalPresenter.relations(game).filter(x=>x.done),bonds=journalSection(p,'호감도 임무',people.reduce((n,x)=>n+x.done,0));
 for(const x of people)journalDone(bonds,'호감도',x.name,'호감도 이야기 '+x.done+' / '+x.track.length+' 완료');
 if(!people.length)bonds.append(el('p','empty','아직 마친 호감도 이야기가 없습니다.'));
}
let missionTab='진행 중';
quests=function(p){
 p.append(el('div','eyebrow','모험 기록'),el('h1','','임무'));mainObjective(p);
 // The old "개인 임무" tab listed every personal mission in full; received ones now live in 진행 중.
 if(missionTab==='개인 임무')missionTab='진행 중';
 const tabs=el('div','bag-tabs journal-tabs');for(const label of ['진행 중','동료 획득','완료']){const b=button(label,()=>{missionTab=label;render();});b.setAttribute('aria-pressed',String(missionTab===label));b.classList.toggle('selected',missionTab===label);tabs.append(b);}p.append(tabs);
 if(missionTab==='동료 획득'){recruitmentScreen(p);returnToJourney(p);return;}
 const linked=game.rows('22_QUEST_DB').filter(r=>parseUI(r[10]).handler==='isk_m04_side_quest').map(row=>({row,state:game.s.quests[row[0]]})).filter(x=>x.state&&x.state.state!=='미시작');
 if(missionTab==='완료'){completedJournal(p,linked);returnToJourney(p);return;}
 const journal=CRPGJournalPresenter.inProgress(game),commissions=game.commissionEntries().filter(q=>q.accepted&&!q.state?.claimed),story=linked.filter(x=>!x.state.claimed);journalBlocked=new Set();
 const guild=journalSection(p,'의뢰',commissions.length+story.length);for(const q of commissions)commissionCard(guild,q);
 for(const {row}of story){const c=el('section','card');c.append(el('small','','본편 연동 의뢰'),el('h3','',row[1]),el('p','',row[5]),el('p','muted',row[6]),actionButton('이야기에서 진행 확인','MENU',{screen:'STORY'}));guild.append(c);}
 if(!commissions.length&&!story.length)guild.append(el('p','empty','받은 의뢰가 없습니다. 안내원의 의뢰 접수에서 시작하세요.'));
 const k=game.placeCatalog().find(e=>e.entity==='NPC_MOND_KATHERYNE');if(k){if(k.maps.includes(game.s.global.CURRENT_MAP_ID))guild.append(actionButton(placeName(k)+' · 의뢰 받으러 가기','PLACE_ENTER',{place:k.id},!commissions.length));else{guild.append(el('small','journal-note','의뢰 접수 · '+placeName(k)+' · '+mapName(k.maps[0])));journalTravel(guild,k.maps[0]);}}
 const recruit=journalSection(p,'동료 획득 임무',journal.legends.length,journal.legends.length?'소개받은 임무만 표시합니다. 새 임무는 동료 획득 탭에서 소개받을 수 있습니다.':''),list=el('div','journal-list');
 for(const m of journal.legends)legendProgressCard(list,m);if(list.children.length)recruit.append(list);
 else recruit.append(el('p','empty','진행 중인 동료 획득 임무가 없습니다.'),button('동료 획득에서 소개처 보기',()=>{missionTab='동료 획득';render();},busy));
 const bonds=journalSection(p,'호감도 임무',journal.affections.length);for(const m of journal.affections)affectionProgressRow(bonds,m);
 if(!journal.affections.length)bonds.append(el('p','empty','지금 진행할 수 있는 호감도 임무가 없습니다.'));
 if(journal.waiting){const more=el('div','journal-waiting');more.append(el('p','muted','조건이 남아 아직 열리지 않은 인물 '+journal.waiting+'명'),actionButton('호감도 화면에서 보기','MENU',{screen:'RELATIONS'}));bonds.append(more);}
 if(journalBlocked.size)guild.before(el('p','choice-note journal-banner',[...journalBlocked].join(' ')));journalBlocked=null;
 returnToJourney(p);
};
const adventureReturn=returnToJourney;
returnToJourney=function(p){if(game.currentPlace()?.valid||game.playPhase()!=='FREE')return adventureReturn(p);p.append(actionButton('메인 화면으로','MENU',{screen:'LOCATION'},true));};
reward=function(p){
 if(game.needsRecovery()){recoveryCard(p);return;}const r=parseUI(game.s.global.LAST_BATTLE_RESULT_JSON);p.append(el('h1','',r.victory?'전투 승리':'전투 종료'));
 if(r.victory){p.append(el('p','','참가 캐릭터 경험치 +'+(r.xp||0)));rewardPreview(p,{mora:r.mora||0,items:r.loot||{}});}
 if(game.s.storyRecovery)p.append(actionButton('전투 직전부터 다시 준비','STORY_RETRY',{},true));else if(r.origin?.startsWith('STORY:'))p.append(actionButton('이야기 계속','MENU',{screen:'STORY'},true));else p.append(actionButton('메인 화면으로','MENU',{screen:'LOCATION'},true));
 if(r.victory&&r.origin?.startsWith('QUEST:'))p.append(actionButton('완료한 의뢰 확인','MENU',{screen:'QUEST'},true));bossProgressControls(p);
};
let saveListTab='자동 저장';
slotsUI=async function(container){
 if(!saveStore){container.append(el('p','muted','저장소를 사용할 수 없습니다.'));return;}
 try{const records=await saveStore.list();if(!container.isConnected)return;container.replaceChildren();const tabs=el('div','save-tabs');
  for(const name of ['자동 저장','수동 저장']){const count=records.filter(r=>(r.slotId.startsWith('manual:')?'수동 저장':'자동 저장')===name).length,b=button(name+' '+count,()=>{saveListTab=name;slotsUI(container);});b.setAttribute('aria-pressed',String(saveListTab===name));b.classList.toggle('selected',saveListTab===name);tabs.append(b);}container.append(tabs);
  const list=el('div','save-scroll');list.setAttribute('role','region');list.setAttribute('aria-label',saveListTab+' 목록');list.tabIndex=0;
  for(const rec of records.filter(r=>(r.slotId.startsWith('manual:')?'수동 저장':'자동 저장')===saveListTab)){const c=el('section','card slot'),m=rec.summary||{},copy=el('div','slot-copy'),type=rec.slotId.startsWith('checkpoint:')?'이야기 시작 전':saveListTab;
   copy.append(el('small','',type+(game&&(activeSaveSlot||'auto:'+game.s.global.SAVE_ID)===rec.slotId?' · 현재 사용 중':'')),el('h3','',m.playerName||m.name||'게임 불러오기'),el('p','muted',routeName(m.route)+' · '+savedMapName(m.map)+' · '+m.day+'일 '+m.time),el('small','',new Date(rec.savedAt).toLocaleString('ko-KR')));
   const controls=el('div','slot-actions');controls.append(button('불러오기',()=>{document.getElementById('modal').close();loadSlot(rec.slotId);},busy),button('백업 파일 내보내기',async()=>{try{downloadText(await saveStore.exportSlot(rec.slotId),'CRPG_'+rec.saveId+'.json');}catch(e){say(e.message);}},busy),button('삭제',()=>confirmDeleteSave(rec,container),busy));c.append(copy,controls);list.append(c);
  }if(!list.children.length)list.append(el('p','empty','이 분류에는 저장된 게임이 없습니다.'));container.append(list);
 }catch(e){container.append(el('p','',e.message));}
};
function adventureSnapshot(){return {map:game.s.global.CURRENT_MAP_ID,place:game.s.placeVisit?.place,inventory:JSON.parse(JSON.stringify(game.s.inventory)),mora:game.s.global.MORA,level:game.growth(),growth:growthSnapshot(),relations:Object.fromEntries(Object.entries(game.s.relations).map(([id,r])=>[id,r.BOND_SCORE??r.heart*20])),completed:Object.keys(game.s.quests).filter(id=>game.s.quests[id].claimed),battle:game.s.runtime?.id};}
function receivedLoot(before,type){
 if(!['USE_ITEM','CRAFT','BUY','OCULUS_COLLECT','OCULUS_OFFER','CLAIM_QUEST','LIFE_FINISH','STORY_NEXT','STORY_CHOICE','COMBAT','COMBAT_BEGIN'].includes(type))return null;
 const entries=[],prior=new Map(before.inventory.filter(i=>i.item).map(i=>[i.item+'|'+(i.variant||''),0]));for(const i of before.inventory)if(i.item){const key=i.item+'|'+(i.variant||'');prior.set(key,(prior.get(key)||0)+i.quantity);}
 const now=new Map();for(const i of game.s.inventory)if(i.item){const key=i.item+'|'+(i.variant||'');const x=now.get(key)||{instance:i,quantity:0};x.quantity+=i.quantity;now.set(key,x);}
 for(const [key,x]of now){const quantity=x.quantity-(prior.get(key)||0);if(quantity>0)entries.push(itemPresenter.itemDetail(x.instance,{quantity}));}
 const gear=new Set(before.inventory.filter(i=>i.equip).map(i=>i.slot));for(const i of game.s.inventory)if(i.equip&&!gear.has(i.slot))entries.push(itemPresenter.itemDetail(i));
 const mora=game.s.global.MORA-before.mora,receipt=game.s.global.LAST_COMMITTED_ACTION_ID,growth=game.growth();let xp=growth.xp-before.level.xp;for(let lv=before.level.level;lv<growth.level;lv++)xp+=Number(game.row('26_LEVEL_RULES',lv)[2]);const bonds=Object.entries(game.s.relations).map(([id,r])=>({id,delta:(r.BOND_SCORE??r.heart*20)-(before.relations[id]||0)})).filter(x=>x.delta>0);const completed=Object.keys(game.s.quests).filter(id=>game.s.quests[id].claimed&&!before.completed.includes(id));
 const levelUps=Object.entries(before.growth||{}).flatMap(([owner,prior])=>{let now;try{now=prior.guestGate?{...game.s.guestSnapshots?.[prior.guestGate]?.[prior.owner],name:prior.name}:game.growth(owner);}catch{return [];}return now.level>prior.level?[{owner,name:now.name,from:prior.level,to:now.level}]:[];});
 const recruited=type==='OCULUS_OFFER'&&lastResult?.ok?lastResult.result?.character:null;
 const purchase=type==='BUY'&&lastResult?.ok?lastResult.result:null,stock=purchase&&game.tables['19_SHOP_STOCK_DB'].get(purchase.stock);
 if(!entries.length&&mora<=0&&xp<=0&&!bonds.length&&!completed.length&&!purchase&&!recruited&&!levelUps.length&&!['CLAIM_QUEST','LIFE_FINISH'].includes(type))return null;return {entries,recruited,levelUps,mora:Math.max(0,mora),xp:Math.max(0,xp),bonds,receipt,purchase:purchase?{...purchase,name:stock?.[4]||'상품',kind:stock?.[2]||'',product:stock?.[3]||''}:null,title:levelUps.length?'레벨 업!':purchase?.service==='INN_REST'?'숙박 완료':purchase?'구매 완료':type==='CLAIM_QUEST'?'의뢰 완료':type==='LIFE_FINISH'?(lastResult?.result?.caught===false?'물고기를 놓쳤습니다':lastResult?.result?.kind==='FISH'?'낚시 성공':'채취 완료'):'획득한 보상'};
}
function showReceivedLoot(loot){if(!loot)return;const box=el('div','loot-summary'),grid=el('div','loot-grid');for(const d of loot.entries){const c=el('div','loot-item');c.append(itemGlyph(d),el('strong','',d.name),el('span','',d.kind==='EQUIPMENT'?'+0':'×'+d.quantity));c.title=itemSummary(d);grid.append(c);}if(loot.mora){const c=el('div','loot-item');c.append(el('span','item-glyph','◈'),el('strong','','모라'),el('span','','+'+loot.mora));grid.append(c);}box.append(grid);for(const up of loot.levelUps||[])box.append(el('h2','level-up-notice',up.name+' · Lv. '+up.from+' → '+up.to),el('p','','레벨 업! HP가 모두 회복되었습니다.'));if(loot.title==='물고기를 놓쳤습니다')box.append(el('p','','다음에는 장력을 금색 구간에 유지해 보세요. 사용한 미끼는 소모되었습니다.'));if(loot.recruited)box.append(el('h2','',ownerName(loot.recruited)+' · 동행 약속'),el('p','','편성에서 파티에 추가할 수 있습니다.'));if(loot.purchase?.service==='INN_REST')box.append(el('h2','','숙박 완료'),el('p','recovery-complete','파티 HP가 모두 회복되었습니다.'),el('p','muted','8시간 휴식을 마치고 마을로 돌아왔습니다.'));else if(loot.purchase)box.append(el('p','purchase-receipt',loot.purchase.name+' '+loot.purchase.quantity+'개 구매 완료 · '+Number(loot.purchase.cost).toLocaleString()+' 모라 사용'));if(loot.xp)box.append(el('p','',game.s.global.PLAYER_NAME+' 경험치 획득 +'+loot.xp));for(const bond of loot.bonds||[])box.append(el('p','',safeName('04_CHAR_DB',bond.id,2)+' 호감도 +'+bond.delta));if(!grid.children.length&&!loot.xp&&!(loot.bonds||[]).length&&!loot.purchase&&!loot.recruited&&!loot.levelUps?.length&&loot.title!=='물고기를 놓쳤습니다')box.append(el('p','','임무 완료 기록을 반영했습니다.'));showModal(loot.title,box);}
async function playTravel(before,type,params={}){
 const result=lastResult?.result||{},timed=type==='CRAFT'||['ENHANCE','EQUIP_ASCEND','ARTIFACT_ENHANCE'].includes(type)||type==='BUY'&&result.service==='INN_REST';
 if(timed){
  let title='작업 중',label='작업 진행',minutes=Number(result.minutes||0);
  if(type==='BUY'){title='숙박 중';label='8시간 휴식';minutes=480;}
  else if(type==='CRAFT'){let kind='제작';try{kind=game.recipeDefinition(params.recipe)[1]||'제작';}catch{}title=kind==='요리'?'요리 중':'제작 중';label=(kind==='요리'?'요리':'제작')+' 진행';}
  else if(type==='ARTIFACT_ENHANCE'){title='성유물 강화 중';label='성유물 강화 진행';}
  else if(type==='EQUIP_ASCEND'){title='한도 돌파 중';label='장비 돌파 진행';}
  else {title='장비 강화 중';label='장비 강화 진행';}
  const overlay=el('div','travel-overlay task-progress-overlay');overlay.setAttribute('role','status');overlay.append(el('span','travel-mark','✧'),el('strong','',title),el('span','',label+(minutes?' · 게임 시간 '+minutes+'분':'')));const progress=el('progress');progress.max=100;progress.value=0;progress.setAttribute('aria-label',label);overlay.append(progress);document.body.append(overlay);
  const duration=Math.max(1200,Math.min(3000,900+minutes*5)),start=performance.now();await new Promise(resolve=>{const step=()=>{const elapsed=performance.now()-start;progress.value=Math.min(100,elapsed/duration*100);if(elapsed>=duration){overlay.remove();resolve();}else setTimeout(step,30);};step();});return;
 }
 if(!['MOVE','PLACE_ENTER','PLACE_LEAVE','RECOVER','STORY_SCRIPTED_TRAVEL','STORY_RIDE'].includes(type)&&before.map===game.s.global.CURRENT_MAP_ID)return;
 const overlay=el('div','travel-overlay');overlay.setAttribute('role','status');overlay.append(el('span','travel-mark','✧'),el('strong','','이동 중'),el('span','',game.currentPlace()?.entry?.name||mapName(game.s.global.CURRENT_MAP_ID)));const progress=el('progress');progress.max=100;progress.value=0;progress.setAttribute('aria-label','이동 진행');overlay.append(progress);document.body.append(overlay);
 const start=performance.now();await new Promise(resolve=>{const step=()=>{const elapsed=performance.now()-start;progress.value=Math.min(100,elapsed/10);if(elapsed>=1000){overlay.remove();resolve();}else setTimeout(step,30);};step();});
}
let lifeUITimer=null;
function updateLifeUI(){
 clearTimeout(lifeUITimer);document.getElementById('life-work-status')?.remove();const job=game?.s.lifeJob;if(!job)return;
 const box=el('section','life-work-status');box.id='life-work-status';box.setAttribute('role','status');const name=game.lifeEntries().find(e=>e.kind===job.kind)?.label||'작업',title=el('strong','',name+' 중'),bar=el('progress'),remaining=el('span');bar.max=job.duration;bar.setAttribute('aria-label',name+' 진행');box.append(title,bar,remaining,actionButton('작업 취소','LIFE_CANCEL'));document.querySelector('.content')?.prepend(box);
 const tick=()=>{if(game?.s.lifeJob?.id!==job.id||!box.isConnected)return;const elapsed=Math.max(0,Date.now()-job.startedAt);bar.value=Math.min(elapsed,job.duration);remaining.textContent=Math.max(0,Math.ceil((job.duration-elapsed)/1000))+'초';if(elapsed>=job.duration&&!busy){act('LIFE_FINISH',{job:job.id});return;}lifeUITimer=setTimeout(tick,100);};tick();
}
const adventureRender=render;
render=function(){adventureRender();if(game){document.body.classList.toggle('on-main-map',['LOCATION','MAIN_MENU','HUB'].includes(game.s.global.SCREEN_MODE));if(game.needsRecovery()&&!['REWARD','LOCATION','MAIN_MENU','HUB','SYSTEM'].includes(game.s.global.SCREEN_MODE)){const c=el('div');recoveryCard(c);document.querySelector('.content')?.prepend(c);}updateLifeUI();}else{clearTimeout(lifeUITimer);document.body.classList.remove('on-main-map');}};
