/* Learn through real controls: no modal, backdrop, forced scroll or fake rewards. */
let activeTutorial=null;
const tutorialSteps=[
 {id:'equip',title:'직접 무기를 장착해 보세요',screen:'STATUS',target:'.gear-slot[data-category="WEAPON"]',text:'캐릭터 화면(C)에서 이름 아래의 무기 칸을 누르세요. 쓸 수 있는 무기를 골라 장착하면 완료됩니다. 장비 이름을 누르면 효과와 바뀌는 능력치도 볼 수 있습니다.'},
 {id:'party',title:'동료와 함께 싸울 준비',screen:'PARTY',target:'.party-grid',text:'합류한 동료를 편성에 넣어 보세요. 앞쪽은 튼튼한 동료, 뒤쪽은 활·회복 동료가 맡으면 좋습니다. 아직 합류한 동료가 없다면 본편을 조금 더 진행하세요.'},
 {id:'personal',title:'동료의 개인 임무',screen:'QUEST',target:'.acquisition-objective',text:'엠버의 개인 임무가 열렸습니다. 임무(J) → 진행 중 → 「동료 획득 임무」에서 시작하세요. 동료마다 개인 임무가 있고, 처음 마치면 그 동료의 호감도가 10 오릅니다. 그 뒤로는 함께 싸워 이길 때마다 1씩 오릅니다. 다른 동료의 개인 임무는 임무의 「동료 획득」 탭에서 소개받습니다.'},
 {id:'battle',title:'첫 전투를 직접 마쳐 보세요',screen:'LOCATION',target:'.battle-command',text:'전투 시작 → 사용할 행동 → 대상 → 실행 순서입니다. 동료들은 정한 전술대로 싸웁니다. 적의 예고를 보고 방어하거나 회복하세요. 일반 조우가 10라운드까지 이어지면 도망칠 수도 있습니다.'},
 {id:'commission',title:'첫 의뢰 받기',screen:'QUEST',target:'.commission-card',text:'몬드성 모험가 길드에서 캐서린을 만나 의뢰를 받으세요. 임무에 적힌 사연과 진행 장소를 먼저 확인하면 무엇을 해야 할지 알 수 있습니다.'},
 {id:'pin',title:'내가 할 임무를 고정하세요',screen:'QUEST',target:'.objective-pin-actions',text:'받은 의뢰에서 「이 임무 고정」을 누르세요. 메인 화면 맨 위와 지도 목적지가 그 의뢰로 바뀝니다. 보상을 받거나 고정을 해제하면 본편 안내로 돌아갑니다.'},
 {id:'travel',title:'지도를 따라 현장으로',screen:'LOCATION',target:'.terrain-destination-list',text:'목적지 카드에서 연결된 길을 골라 한 구역씩 이동하세요. 새 장소에 도착하면 다음 길이 보입니다. 다른 지역으로 가는 길도 지도 아래에서 바로 확인할 수 있습니다.'},
 {id:'claim',title:'보고하고 첫 보상 받기',screen:'QUEST',target:'.commission-card',text:'현장 목표를 마쳤다면 길드로 돌아와 보상을 받으세요. 의뢰 경험치는 보상을 받을 때 편성된 파티원 모두에게 같은 양으로 지급됩니다.'},
 {id:'craft',title:'첫 제작',screen:'LOCATION',target:'.location-places',text:'몬드성 대장간에 들어가 제작을 선택하세요. 만들 수 있는 제작법의 재료와 비용을 확인하고 하나를 직접 만드세요. 재료가 부족하면 의뢰 보상이나 지도에 표시된 채광처를 이용하세요.'},
 {id:'enhance',title:'장비를 한 번 강화해 보세요',screen:'LOCATION',target:'.location-places',text:'대장간의 강화에서 사용할 장비를 고르세요. 필요한 모라·광석과 강화 전후 능력치를 보고 결정하면 됩니다. 무기뿐 아니라 버티는 데 필요한 방어구도 챙기세요.'},
 {id:'books',title:'경험치 책은 필요한 만큼',screen:'STATUS',target:'.gear-books',text:'장비 장착 아래의 경험치 책에서 캐릭터를 고른 뒤 수량을 정하세요. 여러 개를 한 번에 쓸 수 있습니다. 레벨과 강화, 서로 맞는 동료 조합을 함께 준비하세요.'}
];
function closeTutorial(mark=true){
 document.querySelectorAll('.tutorial-target').forEach(n=>n.classList.remove('tutorial-target'));
 document.getElementById('tutorial-tour')?.remove();activeTutorial=null;
 if(mark&&game)act('TUTORIAL_ACK',{dismissed:true});
}
function tutorialDone(){
 const done={...game.s.learningGuide?.done};
 if(Object.values(game.s.combatReceipts||{}).some(r=>r.victory))done.battle=true;
 // 0.14.8: the personal mission step waits until Amber's mission has opened, and ends once it is started or done.
 const open=game.openedPersonalMissions?.()||[];if(!open.length||open.some(id=>game.s.storyContext?.entry===id))done.personal=true;
 return done;
}
// An incomplete lesson can be pending without asking for an action the current story or inventory forbids.
function tutorialPresentation(step){
 if(step?.id!=='equip')return step;
 const locked=game.actionReason('EQUIP');
 if(locked)return {...step,title:'이야기를 마친 뒤 장비를 갖춰 보세요',text:locked+' 지금은 장비와 능력치를 살펴볼 수 있습니다. 장비를 바꿀 수 있게 되면 무기 장착을 안내할게요.',target:null,screen:null};
 const owners=(game.s.party||[]).filter(x=>x.active).map(x=>x.source);if(!owners.includes('PLAYER_CUSTOM'))owners.unshift('PLAYER_CUSTOM');
 const weapons=(game.s.inventory||[]).filter(i=>i.equip&&(typeof itemCategory==='function'?itemCategory(i):i.category)==='WEAPON');
 const available=weapons.some(i=>owners.some(owner=>!(i.equipped&&i.owner===owner)&&!game.actionReason('EQUIP',{slot:i.slot,owner})&&!game.equipmentPreview?.(i.slot,owner)?.reason));
 if(!available)return {...step,title:'먼저 사용할 무기를 준비하세요',text:'아직 새로 장착할 수 있는 무기가 없습니다. 이야기의 보상이나 상점·제작에서 사용할 무기를 얻으면 장착을 안내할게요. 이미 장착한 무기는 그대로 사용해도 됩니다.',target:null,screen:null};
 return step;
}
function renderTutorial(){
 document.getElementById('tutorial-tour')?.remove();document.querySelectorAll('.tutorial-target').forEach(n=>n.classList.remove('tutorial-target'));
 if(!game||!activeTutorial||game.s.global.SCREEN_MODE==='STORY'||game.s.runtime||game.s.battlePreparation||game.s.lifeJob||game.s.worldJob)return;
 const done=tutorialDone(),battle=game.s.runtime,step=tutorialPresentation(battle?tutorialSteps.find(x=>x.id==='battle'):tutorialSteps.find(x=>!done[x.id]));
 const host=document.querySelector('.content');if(!host)return;
 const box=el('section','learning-guide');box.id='tutorial-tour';box.setAttribute('aria-label','직접 해 보는 여행 안내');
 if(!step){box.append(el('strong','','기초 여행 안내 완료'),el('p','','직접 장비를 갖추고, 싸우고, 의뢰와 제작까지 해 봤습니다. 다음 목표는 지도와 임무에서 찾아보세요.'),button('안내 접기',()=>closeTutorial()));host.prepend(box);return;}
 const head=el('div','learning-guide-heading');head.append(el('small','eyebrow','직접 해 보기 · '+tutorialSteps.filter(x=>done[x.id]).length+' / '+tutorialSteps.length),button('안내 접기',()=>closeTutorial(),busy));
 box.append(head,el('h2','',step.title),el('p','',step.text));
 if(!battle&&step.screen&&game.s.global.SCREEN_MODE!==step.screen&&!game.actionReason('MENU',{screen:step.screen}))box.append(actionButton(step.screen==='STATUS'?'장비 장착 열기':step.screen==='PARTY'?'편성 열기':step.screen==='QUEST'?'임무 열기':'메인 화면 열기','MENU',{screen:step.screen},true));
 const list=el('details','learning-checklist');list.append(el('summary','','배울 내용 확인'));for(const s of tutorialSteps)list.append(el('p',done[s.id]?'done':'',(done[s.id]?'✓ ':'○ ')+s.title));box.append(list);host.prepend(box);
 if(step.target)document.querySelector(step.target)?.classList.add('tutorial-target');
}
async function openTutorial(){if(!game)return;if(game.s.learningGuide?.dismissed)await act('TUTORIAL_ACK',{dismissed:false});activeTutorial={};renderTutorial();}
function openGameHelp(){
 const box=el('div','game-help');box.append(el('p','','여행 안내는 화면을 가리지 않습니다. 실제 장비·편성·전투·의뢰·제작 행동을 마치면 해당 항목이 완료됩니다. 순서와 상관없이 먼저 한 행동도 기억합니다.'));
 if(game)box.append(button('직접 해 보는 여행 안내',()=>{document.getElementById('modal').close();openTutorial();},false,true));
 for(const [title,text]of [
 ['자동저장','일반 대사와 대화 선택은 읽는 동안 이 기기에 보관하고 장면이 끝나면 묶어서 저장합니다. 보상·전투·장비 변경은 즉시 확정됩니다. 저장이 끝나기 전에는 창을 닫지 마세요.'],
 ['장비와 원소','무기에는 사용할 수 있는 캐릭터와 장착 레벨이 있습니다. 공중의 적에게는 활·법구·대공 공격 또는 공중 접근 효과가 필요합니다. 보스는 그에 맞는 편성을 준비해야 합니다.'],
 ['필드보스와 나선비경','지도의 필드보스 표시를 따라 찾아가세요. 몬드의 보스(Lv. 10~13)부터 리월의 보스(Lv. 14~20)까지 보스마다 권장 레벨이 다르니 낮은 보스부터 차례로 도전하고, 보스마다 요구하는 원소와 장비를 확인하세요. 나선비경은 맹세의 갑각을 거쳐 머스크 암초에서 들어갑니다.'],
 ['호감도','동료 개인 임무와 함께한 전투로 호감도가 오릅니다. 하트마다 공격력·방어력이 1%씩, 5하트까지 합계 5% 증가합니다.']
 ])box.append(el('h2','',title),el('p','',text));showModal('여행 안내',box);
}
const tutorialQuick=updateQuick;updateQuick=function(){tutorialQuick();document.getElementById('quick-actions').append(button('도움말',openGameHelp,busy));};
// A one-time notice when a personal mission opens by itself (0.14.8), even with the guide closed.
function personalNotice(){try{for(const id of game.openedPersonalMissions?.()||[]){const key='crpg-personal-open:'+game.s.global.SAVE_ID+':'+id;if(localStorage.getItem(key))continue;localStorage.setItem(key,'1');const name=game.storyDefinition?.(id)?.DISPLAY_NAME||'동료';window.CRPGShell?.toast?.(name+'의 개인 임무가 열렸습니다 · 임무(J) → 진행 중');}}catch{}}
const tutorialRender=render;render=function(){tutorialRender();if(game)personalNotice();if(!game){closeTutorial(false);return;}const guide=game.s.learningGuide;if(guide?.dismissed){activeTutorial=null;document.getElementById('tutorial-tour')?.remove();return;}if(!activeTutorial&&guide?.auto)activeTutorial={};if(activeTutorial)renderTutorial();};
