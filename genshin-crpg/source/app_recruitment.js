/* Acquisition is visible before the player meets or recruits a character. */
let recruitmentRegion='전체',recruitmentOnlyMissing=false;
const recruitmentExpanded=new Set();
function requirementList(parent,requirements){const list=el('ul','acquisition-requirements');for(const r of requirements){const item=el('li',r.met?'requirement-met':'requirement-unmet',(r.met?'✓ ':'필요 · ')+r.label);if(r.hint&&!r.met)item.append(el('small','requirement-hint',' — '+r.hint));list.append(item);}parent.append(list);}
function recruitmentIntroductionGuide(parent,d){
 if(!d||game.legendRegistered(d.id))return;
 const guide=el('div','recruitment-introduction');guide.append(el('p','muted','임무 소개처 · '+game.legendIntroductionLabel(d)+' · 소개만 받을 때는 재화를 소모하지 않습니다.'));
 for(const place of game.legendIntroductionPlaces(d)){
  if(place.maps.includes(game.s.global.CURRENT_MAP_ID)){
   if(game.currentPlace()?.place!==place.id)guide.append(actionButton(place.name+' · 소개받으러 가기','PLACE_ENTER',{place:place.id,mode:place.modes[0]}));
  }else travelGuide(guide,place.maps[0]);
 }
 const first=game.mondFirstContact?.(d);
 if(first&&!first.complete)guide.append(actionButton('첫 만남 이야기 듣기','MOND_FIRST_CONTACT',{quest:d.id},true));
 parent.append(guide);
}
// 0.16.30 (user: 「동행같은건 전부 다 뽑기여야」, 「영입임무 이런거랑, 나머지 핸드북에 있는것들 그런거 다 지우면 될거야」): companions come
// from wishes only, so there is no list of how to recruit anyone. What stays is each owned companion's personal story:
// the companions the player has, their story's name, and one button (start it, go where it happens, or what it still
// needs). A companion not met yet is not listed.
function personalStoryEntries(){return game.recruitmentEntries().filter(e=>e.owned&&e.definition&&e.definition.STATUS==='ACTIVE');}
function personalStoryCard(parent,e){
 const d=e.definition,c=el('article','card personal-story'+(e.complete?' done':'')),copy=el('div','personal-story-copy');
 // The quest's own title, without the companion's name and the route tag in front of and after it (the name is beside it).
 const raw=game.tables['22_QUEST_DB'].get(d.QUEST_ID)?.[1]||e.title||'개인 이야기',title=String(raw).replace(new RegExp('^'+e.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(\\s*(전설|개인)\\s*임무)?\\s*[·:]\\s*'),'').replace(/\s*\((이세계인|여행자)\)\s*$/,'')||raw;
 c.append(actorPortrait(e.character,'personal-story-face'));copy.append(el('strong','',e.name),el('small','',title));c.append(copy);
 const side=el('div','personal-story-side');
 if(e.complete)side.append(el('span','requirement-met','다 본 이야기'));
 else{const unmet=game.legendRequirements(d,{introduction:false}).filter(r=>!r.met&&r.kind!=='map');
  if(unmet.length)side.append(el('small','requirement-unmet',unmet[0].label));
  else if(d.MAP_ID&&game.s.global.CURRENT_MAP_ID!==d.MAP_ID)travelGuide(side,d.MAP_ID);
  else side.append(actionButton('개인 이야기 시작','LEGEND_ENTER',{quest:d.id},true));}
 c.append(side);parent.append(c);
}
function recruitmentScreen(p){
 const all=personalStoryEntries(),grid=el('div','personal-story-list');
 p.append(el('h2','','개인 이야기 · '+all.filter(e=>e.complete).length+' / '+all.length));
 for(const e of all.sort((a,b)=>Number(a.complete)-Number(b.complete)))personalStoryCard(grid,e);
 if(!all.length)grid.append(el('p','empty','기원에서 동료를 만나면 그 동료의 개인 이야기가 여기 열립니다.'));
 p.append(grid);
}
const recruitmentJournalEntry=journalEntry;
journalEntry=function(parent,entry){recruitmentJournalEntry(parent,entry);const card=parent.lastElementChild,d=entry.definition;if(!card||!d)return;
 // 0.16.30: an owned companion's story needs no introduction; one not met in a wish says where to meet them.
 const who=d.CHAR_ID||game.tables['04_CHAR_DB'].get(d.PROFILE_ID)?.[1];if(who&&game.premiumOwns?.(who)===false){card.append(el('p','muted','기원에서 만나면 열리는 개인 이야기입니다.'));return;}card.classList.add('acquisition-objective');requirementList(card,game.legendRequirements(d));recruitmentIntroductionGuide(card,d);if(!game.legendRegistered(d.id))card.append(actionButton('개인 임무 소개받기','LEGEND_REGISTER',{quest:d.id}));};

const geoLocation=drawLocation;
drawLocation=function(p,v){geoLocation(p,v);if(v.map[0]!=='MAP_LIYUE_JUEYUN')return;const t=game.geoExchangeEntry(),summary=game.geoOculusSummary(),card=el('section','card');card.append(el('h2','','바위 눈동자 공양'),el('p','','발견 '+summary.collected+' / '+summary.total+' · 보유 '+summary.balance+'개'));if(t){if(t.reason)card.append(el('p','requirement-unmet',t.reason));rewardPreview(card,t.reward);card.append(actionButton('눈동자 '+t.cost+'개 공양','GEO_OCULUS_OFFER',{tier:t.id},true));}else card.append(el('p','requirement-met','모든 공양을 마쳤습니다.'));p.append(card);};

const liyueCombatView=combat;
combat=function(p){const b=game.s.runtime;if(b?.liyueInterlude){p.append(el('h1','','전투 중 · 변한 태세'));for(const line of b.liyueInterlude.lines){p.append(el('strong','',line.speaker),el('p','story',displayText(line.text)));}p.append(actionButton('대화를 확인하고 전투 계속','LIYUE_INTERLUDE_ACK',{},true));return;}if(b?.liyueObjective){const o=b.liyueObjective,box=el('section','card defense-objective');box.append(el('h2','','선인 진법을 지켜라'),el('p','','진법 HP '+o.hp+' / '+o.maxHp+' · 충전 '+o.charge+' / 8'),el('p','muted','본체는 무적입니다. 증원 병력을 막으며 8라운드 충전을 지키세요. 3라운드마다 아군 전체를 공격합니다.'));if(b.defenseAwaitingRecovery)box.append(el('p','requirement-unmet','진법 방어는 성공했지만 주인공이 전투불능입니다. 저장을 불러와 다시 준비할 수 있습니다.'));p.append(box);}liyueCombatView(p);};
const returnLocation=drawLocation;
drawLocation=function(p,v){returnLocation(p,v);if(v.map[0]!=='MAP_LIYUE_MOUNTAINS'||game.s.flags.FLAG_WORLD_ZIBAI_RETURNED||game.recruitEventOnly?.('LIYUE_ZIBAI'))return;const step=game.s.liyueSideStories?.zibai?.step||0,scenes=[['산길에 남은 흔적','산길의 오래된 이정표 옆에 누군가 돌아온 흔적이 있다. 표식과 이어지는 발자국을 확인해 보자.','이정표와 발자국을 살핀다'],['끊기지 않은 길','발자국은 무너진 길을 돌아 조용한 바위턱으로 이어진다. 일행은 돌아갈 길을 확인하며 흔적을 따라갔다.','안전한 길을 따라간다'],['귀환을 확인하다','바위턱에서 자백을 만났다. 자백은 돌아왔다는 인사를 건넸다. 오늘의 만남을 길드에 알리고, 별도의 개인 임무에서 이야기를 더 나눌 수 있다.','인사를 나누고 귀환을 확인한다']],scene=scenes[step];if(!scene)return;const c=el('section','card');c.append(el('small','eyebrow','지역 이야기 · 귀환 확인 '+(step+1)+' / 3'),el('h2','',scene[0]),el('p','story',scene[1]));const why=game.actionReason('ZIBAI_RETURN_CHECK',{step});if(why)c.append(el('p','requirement-unmet',why));c.append(actionButton(scene[2],'ZIBAI_RETURN_CHECK',{step},true));p.append(c);};
const evacuationCombat=combat;
combat=function(p){const e=game.s.runtime?.liyueEvacuation;if(e&&!e.field){const c=el('section','card defense-objective');c.append(el('h2','','대피가 끝날 때까지 지켜라'),el('p','','완료 라운드 '+e.completedRounds+' / '+e.target),el('p','muted','적을 제압한 뒤에도 4라운드가 끝날 때까지 방어하며 대피로를 지켜 주세요.'));p.append(c);}evacuationCombat(p);};

const themedScenePanel=scenePanel;
scenePanel=function(v){const box=themedScenePanel(v);if(v.map[0]==='MAP_LIYUE_GOLDEN_HOUSE'){box.classList.add('golden-house-scene');box.setAttribute('aria-label','황금옥의 금빛 실내');}return box;};
