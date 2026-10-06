/* One current situation and its actual controls. No checklist advances the lesson. */
let activeTutorial=null;
function closeTutorial(mark=true){document.querySelectorAll('.tutorial-target').forEach(n=>n.classList.remove('tutorial-target'));document.getElementById('tutorial-tour')?.remove();activeTutorial=null;if(mark&&game)act('TUTORIAL_GUIDE',{enabled:false});}
function tutorialDone(){return game?.tutorialState().done||{};}
function renderTutorial(){
 document.getElementById('tutorial-tour')?.remove();document.querySelectorAll('.tutorial-target').forEach(n=>n.classList.remove('tutorial-target'));if(!game)return;const step=game.tutorialDirective();activeTutorial=step;if(!step)return;
 // Ordinary story dialogue owns the screen. Its next action leads into the lesson when free play opens.
 if(['STORY','CUTIN','STORY_LOCKED'].includes(game.playPhase())||game.s.battlePreparation||game.s.lifeJob)return;
 const host=document.querySelector('.content');if(!host)return;const box=el('section','scenario-guide');box.id='tutorial-tour';box.dataset.step=step.id;box.setAttribute('aria-label','현재 실습 목표');
 const words=el('div','scenario-guide-copy');words.append(el('small','eyebrow','여행 실습'),el('strong','',step.title),el('p','',step.text));box.append(words);
 const go=async()=>{
  if(step.command==='wish'){if(typeof window.CRPGWish?.open==='function')window.CRPGWish.open('STANDARD');else if(typeof openWish==='function')openWish();else document.querySelector('[data-menu="WISH"]')?.click();}
  else if(step.command==='resume')act('JOURNEY_RESUME');
  else if(step.command==='scripted')act('STORY_SCRIPTED_TRAVEL');
  else if(step.command==='ride')act('STORY_RIDE');
  else if(step.command==='life')act('LIFE_START',{kind:step.kind});
  else if(['guild','smith'].includes(step.command)){const e=game.placeEntries().find(x=>step.command==='guild'?x.entity==='NPC_MOND_KATHERYNE':x.modes?.includes('CRAFT')&&/대장|바그너/.test(x.name||x.facility||''));if(e)act('PLACE_ENTER',{place:e.id,mode:step.command==='guild'?'TALK':'CRAFT'});else act('MENU',{screen:'LOCATION'});}
  else if(step.command==='quest')act('MENU',{screen:'QUEST'});
  else if(step.command==='drill')act('TUTORIAL_DRILL');
  else if(step.command==='domain')openGrowthDomain(step.domain);
  else if(step.command==='ascend')openCharacterAscension();
  else if(step.command==='talent')openCharacterTalent();
  else if(step.command==='complete')closeTutorial();
  else if(step.screen){await act('MENU',{screen:step.screen});if(step.destination&&typeof NavigationUI!=='undefined')NavigationUI.choose(step.destination);}
 };
 if(!step.battle){const label={resume:'도착한 이야기 계속',scripted:'안내된 길로 이동',ride:'탑승해 이동',life:'생활 실습 시작',guild:'캐서린 만나기',smith:'대장간 열기',quest:'의뢰 확인',wish:'상시 기원 열기',drill:'훈련 시작',domain:'비경 준비',ascend:'돌파 준비',talent:'특성 강화',complete:'실습 마치기'}[step.command]||'다음 행동으로';box.append(button(label,go,busy,true));box.append(button('나중에 계속',()=>closeTutorial(),busy));host.prepend(box);}
 else {box.classList.add('battle-lesson');document.querySelector('.combat-panel')?.append(box);const id={guard:'PLAYER_BASIC_GUARD',attack:'PLAYER_BASIC_ATTACK'}[step.id];const target=id?document.querySelector('[data-card-id="'+id+'"]'):step.id==='skill'?[...document.querySelectorAll('[data-card-id]')].find(n=>/_E(?:_CHARGE)?$/.test(n.dataset.cardId)):null;target?.classList.add('tutorial-target');}
 if(step.target)document.querySelector(step.target)?.classList.add('tutorial-target');
}
async function openTutorial(){if(!game)return;await act('TUTORIAL_GUIDE',{enabled:true});activeTutorial={};renderTutorial();}
function openGameHelp(){const box=el('div','game-help');box.append(el('p','','여행 실습은 이동부터 시설·의뢰·생활·기원·편성·전투·비경·돌파까지 직접 진행하도록 안내합니다. 이전에 마친 실습은 이어서 진행합니다.'));if(game)box.append(button('여행 실습 이어가기',()=>{document.getElementById('modal').close();openTutorial();},false,true));for(const [title,text]of [['성장','최대 Lv. 60. Lv. 10·20·30·40·50·55에서 캐릭터를 돌파합니다. 몬드의 적은 Lv. 1~30, 리월은 Lv. 30~60이며 지역과 비경 단계에 고정됩니다.'],['동료','캐릭터는 기원으로 소유합니다. 개인 임무 첫 완료에는 경험치 책 5개와 만남의 인연 2개, 호감도 10을 받습니다. 대기 동료는 전투 경험치 25%를 받고 책도 쓸 수 있습니다.'],['호감도','개인 임무와 함께한 승리로 만남이 열립니다. H01~H05 이야기를 마칠 때마다 공격·방어가 1%씩, 최대 5% 증가합니다.'],['비경','몬드성과 리월항에서 경험치·돌파·특성·장비 비경에 바로 입장합니다. 한국 시간 하루 첫 3승 재료·추가 모라가 2배이며 그 뒤에도 기본 보상으로 반복할 수 있습니다.']])box.append(el('h2','',title),el('p','',text));showModal('여행 안내',box);}
const tutorialQuick=updateQuick;updateQuick=function(){tutorialQuick();document.getElementById('quick-actions').append(button('도움말',openGameHelp,busy));};
const tutorialRender=render;render=function(){tutorialRender();renderTutorial();};
