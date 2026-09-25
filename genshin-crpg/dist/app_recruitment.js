/* Acquisition is visible before the player meets or recruits a character. */
let recruitmentRegion='전체',recruitmentOnlyMissing=false;
function requirementList(parent,requirements){const list=el('ul','acquisition-requirements');for(const r of requirements){const item=el('li',r.met?'requirement-met':'requirement-unmet',(r.met?'✓ ':'필요 · ')+r.label);list.append(item);}parent.append(list);}
function recruitmentIntroductionGuide(parent,d){
 if(!d||game.legendRegistered(d.id))return;
 const guide=el('div','recruitment-introduction');guide.append(el('p','muted','임무 소개처 · '+game.legendIntroductionLabel(d)+' · 소개만 받을 때는 재화를 소모하지 않습니다.'));
 for(const place of game.legendIntroductionPlaces(d)){
  if(place.maps.includes(game.s.global.CURRENT_MAP_ID)){
   if(game.currentPlace()?.place!==place.id)guide.append(actionButton(place.name+' · 소개받으러 가기','PLACE_ENTER',{place:place.id,mode:place.modes[0]}));
  }else travelGuide(guide,place.maps[0]);
 }
 const first=game.mondFirstContact?.(d);
 if(first&&!first.complete)guide.append(actionButton('첫 만남의 이야기를 듣는다','MOND_FIRST_CONTACT',{quest:d.id},true));
 parent.append(guide);
}
function recruitmentScreen(p){
 const all=game.recruitmentEntries(),controls=el('div','bag-tabs');
 p.append(el('h2','','동료 획득'),el('p','muted','합류 '+all.filter(e=>e.owned).length+' / '+all.length+'명 · 붉은 조건을 확인하고 임무를 준비하세요.'));
 for(const label of ['전체','몬드','리월']){const b=button(label,()=>{recruitmentRegion=label;render();});b.classList.toggle('selected',recruitmentRegion===label);b.setAttribute('aria-pressed',String(recruitmentRegion===label));controls.append(b);}
 const only=button(recruitmentOnlyMissing?'미획득만 표시 중':'미획득만 보기',()=>{recruitmentOnlyMissing=!recruitmentOnlyMissing;render();});only.setAttribute('aria-pressed',String(recruitmentOnlyMissing));controls.append(only);p.append(controls);
 for(const e of all.filter(e=>(recruitmentRegion==='전체'||e.region===recruitmentRegion)&&(!recruitmentOnlyMissing||!e.owned))){
  const card=el('details','card acquisition-card'),summary=el('summary'),name=el('strong','',e.name),status=el('span',e.owned?'requirement-met':'requirement-unmet',e.owned?'합류 완료':e.complete?'동행 제안 확인':'미획득');summary.append(name,status);if(!e.owned){const needed=e.requirements.find(r=>!r.met);if(needed)summary.append(el('small','requirement-unmet',needed.label));}card.append(summary,el('p','',e.method));
  if(!e.owned){requirementList(card,e.requirements);recruitmentIntroductionGuide(card,e.definition);if(e.definition&&!e.archon){const d=e.definition;if(!game.legendRegistered(d.id))card.append(actionButton('개인 임무 소개받기','LEGEND_REGISTER',{quest:d.id}));else if(!e.complete)card.append(actionButton('개인 임무 시작','LEGEND_ENTER',{quest:d.id},true));if(e.complete&&game.recruitmentRejoinEntry?.(d))card.append(actionButton('동행 제안 다시 듣기','RECRUIT_REJOIN',{quest:d.id},true));if(d.MAP_ID)travelGuide(card,e.complete?(game.recruitmentRejoinEntry(d)?.map||d.MAP_ID):d.MAP_ID);}}
  else card.append(el('p','muted','편성·장비에서 빈 슬롯에 배치할 수 있습니다.'));p.append(card);
 }
}
const recruitmentPartyScreen=partyScreen;
partyScreen=function(p){const lead=el('section','recruitment-link');lead.append(button('동료 획득 방법·조건 보기',()=>{missionTab='동료 획득';act('MENU',{screen:'QUEST'});},busy,true));p.append(lead);recruitmentPartyScreen(p);};
const recruitmentJournalEntry=journalEntry;
journalEntry=function(parent,entry){recruitmentJournalEntry(parent,entry);const card=parent.lastElementChild,d=entry.definition;if(!card||!d)return;card.classList.add('acquisition-objective');requirementList(card,game.legendRequirements(d));recruitmentIntroductionGuide(card,d);if(!game.legendRegistered(d.id))card.append(actionButton('개인 임무 소개받기','LEGEND_REGISTER',{quest:d.id}));};

const geoLocation=drawLocation;
drawLocation=function(p,v){geoLocation(p,v);if(v.map[0]!=='MAP_LIYUE_JUEYUN')return;const t=game.geoExchangeEntry(),summary=game.geoOculusSummary(),card=el('section','card');card.append(el('h2','','바위 눈동자 공양'),el('p','','발견 '+summary.collected+' / '+summary.total+' · 보유 '+summary.balance+'개'));if(t){if(t.reason)card.append(el('p','requirement-unmet',t.reason));if(t.reward.character)card.append(el('p','','마지막 공양을 마치고 종려와 동행을 약속합니다.'));else rewardPreview(card,t.reward);card.append(actionButton(t.reward.character?'눈동자 '+t.cost+'개 공양 · 동행 약속':'눈동자 '+t.cost+'개 공양','GEO_OCULUS_OFFER',{tier:t.id},true));}else card.append(el('p','requirement-met','모든 공양과 동행 약속을 마쳤습니다.'));p.append(card);};

const liyueCombatView=combat;
combat=function(p){const b=game.s.runtime;if(b?.liyueInterlude){p.append(el('h1','','전투 중 · 변한 태세'));for(const line of b.liyueInterlude.lines){p.append(el('strong','',line.speaker),el('p','story',displayText(line.text)));}p.append(actionButton('대화를 확인하고 전투 계속','LIYUE_INTERLUDE_ACK',{},true));return;}if(b?.liyueObjective){const o=b.liyueObjective,box=el('section','card defense-objective');box.append(el('h2','','선인 진법을 지켜라'),el('p','','진법 HP '+o.hp+' / '+o.maxHp+' · 충전 '+o.charge+' / 8'),el('p','muted','본체는 무적입니다. 증원 병력을 막으며 8라운드 충전을 지키세요. 3라운드마다 아군 전체를 공격합니다.'));if(b.defenseAwaitingRecovery)box.append(el('p','requirement-unmet','진법 방어는 성공했지만 주인공이 전투불능입니다. 저장을 불러와 다시 준비할 수 있습니다.'));p.append(box);}liyueCombatView(p);};
const returnLocation=drawLocation;
drawLocation=function(p,v){returnLocation(p,v);if(v.map[0]!=='MAP_LIYUE_MOUNTAINS'||game.s.flags.FLAG_WORLD_ZIBAI_RETURNED)return;const step=game.s.liyueSideStories?.zibai?.step||0,scenes=[['산길에 남은 흔적','산길의 오래된 이정표 옆에 누군가 돌아온 흔적이 있다. 표식과 이어지는 발자국을 확인해 보자.','이정표와 발자국을 살핀다'],['끊기지 않은 길','발자국은 무너진 길을 돌아 조용한 바위턱으로 이어진다. 일행은 돌아갈 길을 확인하며 흔적을 따라갔다.','안전한 길을 따라간다'],['귀환을 확인하다','바위턱에서 자백을 만났다. 자백은 돌아왔다는 인사를 건넸다. 오늘의 만남을 길드에 알리고, 별도의 개인 임무에서 이야기를 더 나눌 수 있다.','인사를 나누고 귀환을 확인한다']],scene=scenes[step];if(!scene)return;const c=el('section','card');c.append(el('small','eyebrow','지역 이야기 · 귀환 확인 '+(step+1)+' / 3'),el('h2','',scene[0]),el('p','story',scene[1]));const why=game.actionReason('ZIBAI_RETURN_CHECK',{step});if(why)c.append(el('p','requirement-unmet',why));c.append(actionButton(scene[2],'ZIBAI_RETURN_CHECK',{step},true));p.append(c);};
const geoJournalQuests=quests;
quests=function(p,v){geoJournalQuests(p,v);const geo=game.geoOculusSummary(),c=el('section','card');c.append(el('h2','','리월의 바위 눈동자'),el('p','','발견 '+geo.collected+' / '+geo.total+' · 보유 '+geo.balance),el('p','muted','지역마다 탐사·준비물·동료 능력·의뢰·전투로 단서를 해결할 수 있습니다. 16개 출처를 모두 찾은 뒤 절운간에서 공양하세요.'));p.append(c);};
const evacuationCombat=combat;
combat=function(p){const e=game.s.runtime?.liyueEvacuation;if(e){const c=el('section','card defense-objective');c.append(el('h2','','대피가 끝날 때까지 지켜라'),el('p','','완료 라운드 '+e.completedRounds+' / '+e.target),el('p','muted','적을 제압한 뒤에도 4라운드가 끝날 때까지 방어하며 대피로를 지켜 주세요.'));p.append(c);}evacuationCombat(p);};

const themedScenePanel=scenePanel;
scenePanel=function(v){const box=themedScenePanel(v);if(v.map[0]==='MAP_LIYUE_GOLDEN_HOUSE'){box.classList.add('golden-house-scene');box.setAttribute('aria-label','황금옥의 금빛 실내');}return box;};
