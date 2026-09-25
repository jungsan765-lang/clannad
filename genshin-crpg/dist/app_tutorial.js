/* A guided tour highlights the real controls without advancing the journey. */
let activeTutorial=null;
const tutorialSteps=[
 {title:'내 상태부터 확인하세요',target:'.player-card',text:'HP와 레벨, 다음 레벨까지의 경험치입니다. 레벨이 오르면 HP가 모두 회복됩니다. 체력이 낮으면 음식이나 숙박으로 준비하세요.'},
 {title:'다음 목적지는 메인 화면',target:'[data-screen="LOCATION"]',text:'이야기가 쉬어 가는 지점에서는 직접 이동하고 자유롭게 준비할 수 있습니다. 목적지의 권장 레벨과 이동 시간을 확인하세요. 도착한 뒤 이야기 계속을 눌러 재개합니다.'},
 {title:'임무는 여기서 확인',target:'[data-screen="QUEST"]',text:'메인 임무의 다음 장소, 수락한 의뢰, 개인 임무의 준비물을 볼 수 있습니다. 일반 의뢰는 캐서린에게, 개인 이야기는 소개하는 인물에게 받으세요.'},
 {title:'동료와 장비를 준비하세요',target:'[data-screen="PARTY"]',text:'정식으로 합류한 동료만 편성합니다. 동료를 선택하면 장비를 비교하고 장착할 수 있습니다. 파티를 나가면 장비는 소지품으로 돌아옵니다. 2번 자리는 개인 임무를 마친 동료의 전투 호감도가 오릅니다.'},
 {title:'재료가 어디 쓰이는지 궁금하다면',target:'[data-screen="INVENTORY"]',text:'아이템을 누르면 효과와 사용처가 나옵니다. 음식·성장책은 현재 파티에 사용하고, 마을에서는 재료 상세에서 맞는 제작시설로 바로 갈 수 있습니다.'},
 {title:'인물을 다시 만나는 방법',target:'[data-screen="RELATIONS"]',text:'호감도 화면에는 다음 만남 장소가 표시됩니다. 개인 임무 최초 완료는 호감도 10점, 이후 2번 자리에서 전투 승리 시 1점입니다.'},
 {title:'저장과 불러오기를 구분하세요',target:'[data-screen="SYSTEM"]',text:'진행은 자동 저장됩니다. 게임 불러오기는 이 기기의 여정을 이어 하는 기능입니다. 백업 파일 가져오기는 따로 보관한 파일을 여는 기능이며, 저장 삭제는 확인 후 처리합니다.'}
];
function closeTutorial(mark=true){
 document.querySelectorAll('.tutorial-target').forEach(n=>n.classList.remove('tutorial-target'));
 document.getElementById('tutorial-tour')?.remove();activeTutorial=null;
 if(mark){settings.uiTutorialVersion=1;persistSettings();}
}
function renderTutorial(){
 if(!activeTutorial||!game)return;document.getElementById('tutorial-tour')?.remove();document.querySelectorAll('.tutorial-target').forEach(n=>n.classList.remove('tutorial-target'));
 const step=tutorialSteps[activeTutorial.index],target=document.querySelector(step.target),box=el('section','tutorial-tour');box.id='tutorial-tour';box.setAttribute('role','dialog');box.setAttribute('aria-label','게임 화면 튜토리얼');
 box.append(el('small','eyebrow','화면 안내 '+(activeTutorial.index+1)+' / '+tutorialSteps.length),el('h2','',step.title),el('p','',step.text));
 const controls=el('div','tutorial-controls');if(activeTutorial.index)controls.append(button('이전',()=>{activeTutorial.index--;renderTutorial();}));controls.append(button(activeTutorial.index===tutorialSteps.length-1?'안내 마치기':'다음',()=>{if(activeTutorial.index===tutorialSteps.length-1)closeTutorial();else{activeTutorial.index++;renderTutorial();}},false,true),button('나중에 보기',()=>closeTutorial()));box.append(controls);document.body.append(box);
 target?.classList.add('tutorial-target');if(target)target.scrollIntoView({block:'center',behavior:settings.reducedMotion?'auto':'smooth'});
}
function openTutorial(){if(!game)return;activeTutorial={index:0};renderTutorial();}
function openGameHelp(){
 const box=el('div','game-help');box.append(el('p','','화면 안내는 실제 메뉴를 차례로 강조합니다. 언제든 닫고 다시 볼 수 있습니다.'));
 if(game)box.append(button('화면 튜토리얼 시작',()=>{document.getElementById('modal').close();openTutorial();},false,true));
 for(const [title,text]of [
  ['이야기와 직접 이동','대화 중에는 이동할 수 없습니다. 목적지 안내나 휴식 지점이 나오면 메인 화면에서 이동·의뢰·육성을 진행한 뒤, 표시된 장소에서 이야기를 다시 시작합니다.'],
  ['전투 준비','합류한 동료를 선택하고 장비·체력을 확인하세요. 준비가 부족하면 현장으로 돌아가 육성할 수 있습니다. 전투 시작 전 행동 순서를 확인하며, 진행 속도는 전투 화면에서 조절합니다.'],
  ['생활과 현장 조사','구역마다 채광·채집·사냥·낚시 중 한 종류가 가능합니다. 작업 게이지가 끝나야 보상을 받습니다. 채집과 사냥은 5% 확률로 적과 마주칩니다. 의뢰 조사도 현장에서 직접 진행하세요.'],
  ['낚시','낚싯대와 미끼를 갖추고 시작합니다. 입질 후 당기기 버튼을 누르면 장력이 오른쪽, 놓으면 왼쪽으로 움직입니다. 금색 구간 안에 유지하면 성공 게이지가 찹니다.'],
  ['숨겨진 바람의 흔적','주변 단서와 지형, 만난 인물의 이야기를 살펴보세요. 흔적마다 필요한 행동이 다릅니다. 접근 방법을 해결한 뒤 회수할 수 있습니다.']
 ])box.append(el('h2','',title),el('p','',text));showModal('여행 안내',box);
}
const tutorialQuick=updateQuick;
updateQuick=function(){tutorialQuick();document.getElementById('quick-actions').append(button('도움말',openGameHelp,busy));};
const tutorialRender=render;
render=function(){tutorialRender();if(!game){closeTutorial(false);return;}if(activeTutorial)renderTutorial();else if(!busy&&game.playPhase()==='FREE'&&settings.uiTutorialVersion!==1){queueMicrotask(()=>{if(game&&!busy&&!activeTutorial&&!document.getElementById('modal').open){activeTutorial={index:0};renderTutorial();}});}};
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&activeTutorial)closeTutorial();});
