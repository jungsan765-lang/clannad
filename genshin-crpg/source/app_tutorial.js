/* Mandatory, action-led spotlight. The game board never reserves a tutorial row. */
let activeTutorial=null;
let tutorialTarget=null,tutorialOverlay=null,tutorialFrame=0,tutorialBattlePick=null,tutorialKey='',tutorialAttributes=null;
const tutorialVisible=n=>!!n&&n.getClientRects().length>0&&getComputedStyle(n).visibility!=='hidden';
const tutorialFind=(selector,root=document)=>[...root.querySelectorAll(selector)].find(tutorialVisible);
const tutorialAction=(type,test=()=>true)=>[...document.querySelectorAll('[data-action="'+type+'"]')].find(n=>!n.disabled&&test(n.crpgAction?.params||{})&&tutorialVisible(n));
function tutorialDone(){return game?.tutorialState().done||{};}
function removeTutorialSpotlight(){if(tutorialTarget){tutorialTarget.classList.remove('tutorial-target');for(const [name,value]of Object.entries(tutorialAttributes||{})){if(value===null)tutorialTarget.removeAttribute(name);else tutorialTarget.setAttribute(name,value);}}tutorialAttributes=null;tutorialTarget=null;tutorialOverlay?.remove();tutorialOverlay=null;}
function closeTutorial(){removeTutorialSpotlight();activeTutorial=null;}
function scheduleTutorial(){if(tutorialFrame)return;tutorialFrame=requestAnimationFrame(()=>{tutorialFrame=0;renderTutorial();});}
function tutorialTabFor(node){const pane=node?.closest('.shell-pane[hidden]');if(!pane)return node;return tutorialFind('.shell-tab[data-tab="'+CSS.escape(pane.dataset.tab)+'"]',pane.closest('.shell-tabs'));}
function tutorialByText(selector,pattern,root=document){return [...root.querySelectorAll(selector)].find(n=>tutorialVisible(n)&&!n.disabled&&pattern.test((n.textContent+' '+(n.getAttribute('aria-label')||'')+' '+n.title).trim()));}
function tutorialNav(screen){return tutorialFind('[data-screen="'+screen+'"]:not(:disabled)');}
function tutorialPosition(){
 if(!tutorialTarget?.isConnected||!tutorialOverlay?.isConnected)return;
 const r=tutorialTarget.getBoundingClientRect(),w=innerWidth,h=innerHeight,pad=4,x=Math.max(0,r.left-pad),y=Math.max(0,r.top-pad),right=Math.min(w,r.right+pad),bottom=Math.min(h,r.bottom+pad);
 const areas=[[0,0,w,y],[0,y,x,bottom-y],[right,y,w-right,bottom-y],[0,bottom,w,h-bottom]];
 tutorialOverlay.querySelectorAll('.tutorial-veil').forEach((n,i)=>{const [left,top,width,height]=areas[i];Object.assign(n.style,{left:left+'px',top:top+'px',width:Math.max(0,width)+'px',height:Math.max(0,height)+'px'});});
 Object.assign(tutorialOverlay.querySelector('.tutorial-ring').style,{left:x+'px',top:y+'px',width:(right-x)+'px',height:(bottom-y)+'px'});
 const text=tutorialOverlay.querySelector('#tutorial-tour'),tw=Math.min(330,w-32);text.style.width=tw+'px';const th=text.getBoundingClientRect().height;
 let top=y-th-18;if(top<12)top=bottom+18;if(top+th>h-12)top=Math.max(12,h-th-12);
 Object.assign(text.style,{left:Math.max(16,Math.min((x+right-tw)/2,w-tw-16))+'px',top:top+'px'});
}
function showTutorialSpotlight(target,step,title=step.title,text=step.text){
 if(!target||!tutorialVisible(target))return;
 const key=game.s.global.SAVE_ID+':'+step.id+':'+(target.dataset.cardId||target.dataset.action||target.dataset.tab||target.className)+':'+title;
 tutorialTarget=target;tutorialAttributes=Object.fromEntries(['tabindex','aria-hidden','aria-describedby','role','aria-label'].map(n=>[n,target.getAttribute(n)]));target.classList.add('tutorial-target');target.removeAttribute('aria-hidden');target.setAttribute('aria-describedby','tutorial-tour');
 if(!target.matches('button,select,input')){target.tabIndex=0;if(target.matches('.combatant-row'))target.setAttribute('role','button');}else if(target.tabIndex<0)target.tabIndex=0;
 if(target.matches('button')&&!target.textContent.trim()&&!target.getAttribute('aria-label'))target.setAttribute('aria-label',target.title||title);
 const overlay=el('div');overlay.id='tutorial-spotlight';overlay.setAttribute('popover','manual');overlay.dataset.step=step.id;
 for(let i=0;i<4;i++)overlay.append(el('div','tutorial-veil'));
 overlay.append(el('div','tutorial-ring'));const copy=el('div','tutorial-callout');copy.id='tutorial-tour';copy.dataset.step=step.id;copy.setAttribute('role','status');copy.setAttribute('aria-live','polite');copy.append(el('small','','여행 안내'),el('strong','',title),el('p','',text));overlay.append(copy);document.body.append(overlay);tutorialOverlay=overlay;overlay.showPopover?.();
 const r=target.getBoundingClientRect();if(r.top<8||r.bottom>innerHeight-8)target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 tutorialPosition();if(tutorialKey!==key||!target.contains(document.activeElement)){tutorialKey=key;const focus=target.matches('button,select,input,[tabindex]')?target:target.querySelector('button:not(:disabled),select:not(:disabled),input:not(:disabled)');focus?.focus({preventScroll:true});}
}
function tutorialBattleTarget(step){
 const opening=tutorialAction('COMBAT_BEGIN');if(opening)return {...step,target:opening,title:'전투를 시작하세요',text:'위쪽은 이번 라운드의 행동 순서입니다. 지금은 「전투 시작」만 누를 수 있습니다.'};
 const cardId=step.card||({guard:'PLAYER_BASIC_GUARD',attack:'PLAYER_BASIC_ATTACK'})[step.id]||(step.id==='skill'?game.combatCards().find(c=>/_E(?:_CHARGE)?$/.test(c.id)&&!c.reason)?.id:null);
 if(!cardId)return null;
 const key=game.s.runtime.id+':'+step.id+':'+cardId;
 if(tutorialBattlePick?.key!==key)tutorialBattlePick={key,card:false,target:false};
 const selected=game.combatCards().find(c=>c.id===cardId),button=tutorialFind('[data-card-id="'+cardId+'"]:not(:disabled)');if(!button)return null;
 if(!button.tutorialTracked){button.tutorialTracked=true;button.addEventListener('click',()=>{tutorialBattlePick.card=true;scheduleTutorial();},{capture:true});}
 if(!tutorialBattlePick.card||selectedCard!==cardId)return {...step,target:button,title:step.title,text:'먼저 밝게 표시된 「'+selected.name+'」을 누르세요.'};
 if(cardId!=='PLAYER_BASIC_GUARD'&&selected.targets?.length&&!tutorialBattlePick.target){
  const target=tutorialFind('.combatant-row[data-actor-id="'+CSS.escape(selected.targets[0].id)+'"]');if(!target)return null;
  if(!target.tutorialTracked){target.tutorialTracked=true;target.addEventListener('click',e=>{if(e.target.closest('button'))return;tutorialBattlePick.target=true;scheduleTutorial();},{capture:true});}
  return {...step,target,title:'공격할 대상을 고르세요',text:'밝게 표시된 적의 그림을 누르세요. 금색 테두리가 선택한 대상입니다.'};
 }
 return {...step,target:tutorialAction('COMBAT'),title:'선택한 행동을 실행하세요',text:cardId==='PLAYER_BASIC_GUARD'?'실행을 누르면 방어하고 차례를 마칩니다.':'실행을 누르면 선택한 대상에게 행동합니다. 동료와 적의 차례는 자동으로 이어집니다.'};
}
function tutorialControl(step){
 if(step.battle)return tutorialBattleTarget(step);
 const modal=document.querySelector('#modal[open]');
 if(modal){const body=modal.querySelector('#modal-body')||modal;
  if(step.id==='party'&&body.querySelector('.member-picker'))return {...step,target:tutorialFind('.member-pick[data-owner="'+step.actor+'"]:not(:disabled)',body),title:'엠버를 선택하세요',text:'엠버의 그림을 누르면 함께 싸울 자리에 들어갑니다.'};
  if(step.id==='equip'&&body.querySelector('.gear-picker'))return {...step,target:tutorialAction('EQUIP',p=>p.owner===step.owner)||tutorialByText('.gear-option button',/^장착$/,body),title:'무기를 장착하세요',text:'밝게 표시된 장착 버튼을 누르세요.'};
  return {...step,target:tutorialFind('#modal-close'),title:'창을 닫고 안내를 이어가세요',text:'닫기를 누르면 필요한 조작으로 돌아갑니다.'};
 }
 if(document.querySelector('.wish-screen'))return {...step,target:tutorialFind('.wish-close'),title:'기원 창을 닫으세요',text:'이야기 속 조작 안내로 돌아갑니다.'};
 if(step.destination){
  if(!document.querySelector('#journey-map'))return {...step,target:tutorialNav('LOCATION'),title:'지도로 이동하세요',text:'메인을 눌러 현재 위치와 이어지는 길을 확인하세요.'};
  if(NavigationUI.target!==step.destination)return {...step,target:tutorialFind('.terrain-node[data-map-id="'+step.destination+'"]'),title:'밝게 표시된 목적지를 누르세요',text:mapName(step.destination)+'까지 이어지는 길을 지도에서 확인합니다.'};
  return {...step,target:tutorialFind('.terrain-travel:not(:disabled)'),title:'이 길을 따라 이동하세요',text:'이동 버튼을 누르면 다음 구역으로 출발합니다.'};
 }
 if(step.id==='prepare')return {...step,target:tutorialAction('COMBAT_PREPARE')||tutorialAction('MENU',p=>p.screen==='STORY')||tutorialByText('.shell-back',/전투 준비|이야기/)||tutorialNav('STORY')};
 const direct={resume:'JOURNEY_RESUME',scripted:'STORY_SCRIPTED_TRAVEL',ride:'STORY_RIDE'}[step.command];
 if(direct){const target=tutorialAction(direct);if(target)return {...step,target};const hidden=[...document.querySelectorAll('[data-action="'+direct+'"]')].find(n=>!n.disabled);return {...step,target:tutorialTabFor(hidden)||tutorialNav('LOCATION')};}
 if(step.id==='party')return {...step,target:tutorialFind('.formation-slot:not([data-owner]) .member-add')||tutorialFind('.formation-slot[data-party-slot="2"] .member-select')||tutorialNav('PARTY')||tutorialAction('MENU',p=>p.screen==='PARTY')};
 if(step.id==='equip'){
  const owner=step.owner||'PLAYER_CUSTOM';
  return {...step,target:tutorialFind('.gear-member[data-owner="'+owner+'"] .gear-slot[data-category="WEAPON"]')||tutorialFind('.shell-roster-item[data-owner="'+owner+'"]')||tutorialFind('.formation-slot[data-owner="'+owner+'"] .party-gear')||tutorialNav('STATUS')||tutorialAction('MENU',p=>p.screen==='STATUS')};
 }
 return null;
}
function renderTutorial(){
 removeTutorialSpotlight();if(!game){activeTutorial=null;return;}const step=game.tutorialDirective();activeTutorial=step;if(!step)return;
 if(busy||['STORY','CUTIN','STORY_LOCKED'].includes(game.playPhase()))return;
 if(game.s.lifeJob){const target=tutorialFind('.life-mini');if(target)showTutorialSpotlight(target,step,'밝은 영역에서 직접 조작하세요','채집은 표시된 대상을 고르고, 채광·사냥은 금색 구간에 맞춰 누릅니다.');return;}
 const focus=tutorialControl(step);if(focus?.target)showTutorialSpotlight(focus.target,step,focus.title,focus.text);
}
async function openTutorial(){if(!game)return;await act('TUTORIAL_GUIDE',{enabled:true});renderTutorial();}
// Block outside clicks and keyboard shortcuts, including controls underneath a transparent hole.
for(const type of ['pointerdown','click','change','keydown'])document.addEventListener(type,e=>{
 if(!tutorialTarget?.isConnected||!tutorialOverlay?.isConnected)return;
 const inside=(tutorialTarget===e.target||tutorialTarget.contains(e.target))&&!e.target.closest?.('.enemy-info-button');
 if(type==='keydown'){
  if(e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();const f=tutorialTarget.matches('button,select,input,[tabindex]')?[tutorialTarget]:[...tutorialTarget.querySelectorAll('button:not(:disabled),select,input,[tabindex]')];if(f.length)f[(Math.max(-1,f.indexOf(document.activeElement))+(e.shiftKey?f.length-1:1))%f.length].focus();return;}
  if(inside&&['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.stopPropagation();if(['Enter',' '].includes(e.key)&&e.target===tutorialTarget&&tutorialTarget.matches('.combatant-row')){e.preventDefault();tutorialTarget.click();}return;}
 }
 if(!inside||type==='keydown'){e.preventDefault();e.stopImmediatePropagation();return;}
 if(type==='click'||type==='change')scheduleTutorial();
},true);
window.addEventListener('resize',tutorialPosition,{passive:true});window.visualViewport?.addEventListener('resize',tutorialPosition,{passive:true});document.addEventListener('scroll',tutorialPosition,{capture:true,passive:true});
new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('#tutorial-spotlight')&&[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&n.id!=='tutorial-spotlight'))||records.some(r=>r.type==='attributes'&&!r.target.closest?.('#tutorial-spotlight')))scheduleTutorial();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','aria-selected']});
function openGameHelp(){const box=el('div','game-help');box.append(el('p','','첫 이동과 이야기 속 전투에서 필요한 편성·장비·전투 조작을 안내합니다. 밝게 표시된 곳을 직접 조작하면 다음 단계로 이어집니다. 채집·채광·사냥은 처음 이용할 때 조작을 배웁니다.'));if(game)box.append(button('여행 실습 이어가기',()=>{document.getElementById('modal').close();openTutorial();},false,true));for(const [title,text]of [['성장','최대 Lv. 60. Lv. 10·20·30·40·50·55에서 캐릭터를 돌파합니다. 몬드의 적은 Lv. 1~30, 리월은 Lv. 30~60이며 지역과 비경 단계에 고정됩니다.'],['동료','캐릭터는 기원으로 소유합니다. 개인 임무 첫 완료에는 경험치 책 5개와 만남의 인연 2개, 호감도 10을 받습니다. 대기 동료는 전투 경험치 25%를 받고 책도 쓸 수 있습니다.'],['호감도','개인 임무와 함께한 승리로 만남이 열립니다. H01~H05 이야기를 마칠 때마다 공격·방어가 1%씩, 최대 5% 증가합니다.'],['비경','몬드성과 리월항에서 경험치·돌파·특성·장비 비경에 바로 입장합니다. 한국 시간 하루 첫 3승 재료·추가 모라가 2배이며 그 뒤에도 기본 보상으로 반복할 수 있습니다.']])box.append(el('h2','',title),el('p','',text));showModal('여행 안내',box);}
const tutorialQuick=updateQuick;updateQuick=function(){tutorialQuick();document.getElementById('quick-actions').append(button('도움말',openGameHelp,busy));};
const tutorialRender=render;render=function(){tutorialRender();renderTutorial();};
