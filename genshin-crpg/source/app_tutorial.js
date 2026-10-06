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
// 0.15.24 (user: 「튜토리얼은 엠버가 도와주는 형식으로 자연스럽게 스토리상 흘러가면 더 좋겠네」): the guide is a person in the scene,
// in a speech bubble with their face. Amber is with the player from her first scene on (the Isekai route wakes up beside
// her); on the traveller route she first appears on the plains, so the very first move out of the forest is Paimon's.
// Lines follow tools/editorial/personal_k/VOICE_BIBLE.md (Amber: bright 반말, 「좋아!」「가자!」 sparingly; Paimon: 반말,
// 「~라구」 at most once). A key the table lacks falls back to the step's own title and text.
const TUTORIAL_SPEAKERS={AMBER:{name:'엠버',avatar:'MOND_AMBER'},PAIMON:{name:'페이몬',avatar:'PAIMON'}};
const TUTORIAL_LINES={
 PAIMON:{
  'move.map':'여행자, 이 숲부터 빠져나가자! 지도를 열어 봐.',
  'move.pick':'저기 빛나는 곳 보여? {place}! 눌러 보라구.',
  'move.go':'길이 이어졌어! 이동을 누르면 바로 출발이야.',
  'move.tab':'지도는 이 탭에 있어. 눌러 봐!',
  'storyTravel':'저쪽으로 가면 돼. 출발하자!',
  'arrival':'도착! 이제 이야기를 이어 가자.'
 },
 AMBER:{
  'move.map':'성까지는 내가 안내할게! 먼저 지도를 열어 봐.',
  'move.pick':'저기 반짝이는 곳 보이지? {place}야. 눌러 봐!',
  'move.go':'길이 보이지? 이동을 누르면 같이 출발이야!',
  'move.tab':'지도는 이 탭에 있어. 열어 봐!',
  'storyTravel':'이쪽이야, 따라와!',
  'arrival':'도착했다! 자, 이야기 계속하자.',
  'party.open':'슬라임이 길을 막았어! 나도 같이 싸울게. 편성에서 빈 동료 자리를 눌러 줘.',
  'party.pick':'나 여기 있어! 내 얼굴을 눌러 줘.',
  'equip.nav':'아차, 나 활을 안 들었어! 캐릭터 화면을 열어 줄래?',
  'equip.member':'목록에서 나를 골라 줘.',
  'equip.slot':'여기, 무기 칸을 눌러 줘.',
  'equip.pick':'이 활이면 충분해. 장착!',
  'equip.self.nav':'맨손으로 싸울 순 없지! 캐릭터 화면에서 무기를 챙기자.',
  'equip.self.slot':'무기 칸을 눌러 봐.',
  'equip.self.pick':'이걸 쥐고 가자. 장착!',
  'prepare':'준비 끝! 전투 준비로 돌아가자.',
  'modal.close':'이 창은 닫고, 하던 거 마저 하자!',
  'wish.close':'기원은 나중에! 일단 창을 닫자.',
  'battle.start':'위에 있는 게 이번 라운드 순서야. 준비됐으면 전투 시작!',
  'attack.card':'먼저 일반 공격! 이 버튼을 눌러 봐.',
  'attack.target':'노릴 상대를 눌러 줘. 금색 테두리가 네가 고른 상대야.',
  'attack.run':'좋아, 실행! 나머지는 차례대로 움직일 거야.',
  'guard.card':'이번엔 방어해 보자. 받는 피해가 줄어들어.',
  'guard.wave':'또 몰려온다! 이번엔 방어해 보자. 받는 피해가 줄어들어.',
  'skill.wave':'아직 더 있어! 원소전투 스킬로 한 번에 몰아붙이자. 쓰고 나면 몇 차례 기다려야 해.',
  'guard.run':'실행하면 이번 차례는 막기만 해.',
  'skill.card':'원소전투 스킬도 써 봐! 한 번 쓰면 몇 차례 기다려야 해.',
  'skill.target':'스킬로 노릴 상대를 눌러 줘.',
  'skill.run':'실행! 어떤 기술인지 잘 봐 둬.',
  'burst.card':'마지막은 원소폭발! 제일 센 기술이야. 한 번 쓰면 한참 기다려야 해.',
  'burst.wave':'아직 끝이 아니야! 이번엔 원소폭발로 한꺼번에 날려 버리자!',
  'burst.target':'원소폭발로 노릴 상대를 눌러 줘.',
  'burst.run':'실행! 이게 원소폭발이야.',
  'life':'채집은 표시된 걸 고르면 되고, 채광이랑 사냥은 금색 칸에 맞춰 눌러! 세 번 중 두 번이면 성공이야.',
  // 0.16.2 resource scenes (app_life_v0162.js): the first plant or vein, or the field the animals cross.
  'life.GATHER':'반짝이는 걸 눌러서 주워 봐! 시간 안에 다 모으면 돼.',
  'life.MINE':'광맥은 몇 번 두드려야 깨져. 연달아 눌러 봐!',
  'life.HUNT':'동물이 지나가면 그쪽을 눌러! 놓치기 전에 빨리!'
 }
};
function tutorialSpeaker(step){
 const traveller=game?.s?.global?.STORY_ROUTE_ID==='ROUTE_TRAVELER';
 return traveller&&['move','storyTravel','arrival'].includes(step.id)&&!game.tutorialState().done.arrival?'PAIMON':'AMBER';
}
function tutorialLine(speaker,say,step){
 const line=say&&TUTORIAL_LINES[speaker]?.[say];if(!line)return null;
 return line.replace('{place}',step.destination&&typeof mapName==='function'?mapName(step.destination):'목적지');
}
function tutorialAvatar(speaker){
 const rec=(typeof MANIFEST!=='undefined'?MANIFEST:{}).uiAssets?.avatars?.[TUTORIAL_SPEAKERS[speaker].avatar];
 if(rec?.path){const img=el('img','tutorial-avatar');img.src=rec.path;img.alt='';img.draggable=false;return img;}
 return el('span','tutorial-avatar fallback','✦');
}
function tutorialPosition(){
 if(!tutorialTarget?.isConnected||!tutorialOverlay?.isConnected)return;
 const r=tutorialTarget.getBoundingClientRect(),w=innerWidth,h=innerHeight,pad=4,x=Math.max(0,r.left-pad),y=Math.max(0,r.top-pad),right=Math.min(w,r.right+pad),bottom=Math.min(h,r.bottom+pad);
 const areas=[[0,0,w,y],[0,y,x,bottom-y],[right,y,w-right,bottom-y],[0,bottom,w,h-bottom]];
 tutorialOverlay.querySelectorAll('.tutorial-veil').forEach((n,i)=>{const [left,top,width,height]=areas[i];Object.assign(n.style,{left:left+'px',top:top+'px',width:Math.max(0,width)+'px',height:Math.max(0,height)+'px'});});
 Object.assign(tutorialOverlay.querySelector('.tutorial-ring').style,{left:x+'px',top:y+'px',width:(right-x)+'px',height:(bottom-y)+'px'});
 const text=tutorialOverlay.querySelector('#tutorial-tour');text.style.width=Math.min(390,w-24)+'px';const box=text.getBoundingClientRect(),tw=box.width,th=box.height;
 // 0.15.24 (user: 「위치를 잘 보고 해주고」): the bubble takes the side of the target (above, below, right, left) that fits on
 // screen and covers the fewest other places and controls — on the map, the fewest place names — and points at it. It never
 // covers the top bar (place, money, menu); a sideways phone has little room above a fighter.
 const hud=document.querySelector('main > aside.shell-hud')?.getBoundingClientRect(),top0=Math.max(8,hud&&hud.bottom<h/2?hud.bottom+6:8);
 // …nor the menu rail down the left edge of a sideways phone.
 const rail=document.querySelector('main > aside nav.hud-nav')?.getBoundingClientRect(),left0=rail&&rail.width&&rail.right<w/4&&rail.height>h/2?rail.right+6:8;
 const gap=16,clampX=v=>Math.max(left0,Math.min(v,w-tw-8)),clampY=v=>Math.max(top0,Math.min(v,h-th-8)),cx=(x+right)/2,cy=(y+bottom)/2;
 const sides=[['down',clampX(cx-tw/2),y-th-gap,y-th-gap>=top0],['up',clampX(cx-tw/2),bottom+gap,bottom+gap+th<=h-8],['left',right+gap,clampY(cy-th/2),right+gap+tw<=w-8],['right',x-gap-tw,clampY(cy-th/2),x-gap-tw>=left0]];
 const others=[...document.querySelectorAll('.terrain-node,.terrain-node-label,button:not(:disabled),.combatant-row')].filter(n=>n!==tutorialTarget&&!tutorialTarget.contains(n)&&!n.closest('#tutorial-spotlight')).map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.bottom>0&&r.top<h);
 const cost=(l,t)=>others.reduce((s,r)=>s+(r.right>l&&r.left<l+tw&&r.bottom>t&&r.top<t+th?1:0),0);
 const fit=sides.filter(s=>s[3]),pick=(fit.length?fit:[['up',clampX(cx-tw/2),clampY(h-th-8),true]]).map(s=>[...s,cost(s[1],s[2])]).sort((a,b)=>a[4]-b[4])[0];
 const [tail,left,top]=pick;text.dataset.tail=tail;
 // The tail sits on the edge facing the target, lined up with it.
 text.style.setProperty('--tail-x',Math.max(18,Math.min(cx-left,tw-18))+'px');text.style.setProperty('--tail-y',Math.max(18,Math.min(cy-top,th-18))+'px');
 Object.assign(text.style,{left:left+'px',top:top+'px'});
}
function showTutorialSpotlight(target,step,title=step.title,text=step.text,say=null){
 if(!target||!tutorialVisible(target))return;
 const speaker=tutorialSpeaker(step),line=tutorialLine(speaker,say,step);
 const key=game.s.global.SAVE_ID+':'+step.id+':'+(target.dataset.cardId||target.dataset.action||target.dataset.tab||target.className)+':'+(line||title);
 tutorialTarget=target;tutorialAttributes=Object.fromEntries(['tabindex','aria-hidden','aria-describedby','role','aria-label'].map(n=>[n,target.getAttribute(n)]));target.classList.add('tutorial-target');target.removeAttribute('aria-hidden');target.setAttribute('aria-describedby','tutorial-tour');
 if(!target.matches('button,select,input')){target.tabIndex=0;if(target.matches('.combatant-row'))target.setAttribute('role','button');}else if(target.tabIndex<0)target.tabIndex=0;
 if(target.matches('button')&&!target.textContent.trim()&&!target.getAttribute('aria-label'))target.setAttribute('aria-label',target.title||title);
 const overlay=el('div');overlay.id='tutorial-spotlight';overlay.setAttribute('popover','manual');overlay.dataset.step=step.id;
 for(let i=0;i<4;i++)overlay.append(el('div','tutorial-veil'));
 overlay.append(el('div','tutorial-ring'));const copy=el('div','tutorial-callout tutorial-say say-'+speaker.toLowerCase());copy.id='tutorial-tour';copy.dataset.step=step.id;copy.dataset.speaker=speaker;if(say)copy.dataset.say=say;copy.setAttribute('role','status');copy.setAttribute('aria-live','polite');
 const words=el('div','tutorial-words');words.append(el('small','tutorial-name',TUTORIAL_SPEAKERS[speaker].name),el('strong','',line||title));if(!line&&text)words.append(el('p','',text));copy.append(tutorialAvatar(speaker),words);overlay.append(copy);document.body.append(overlay);tutorialOverlay=overlay;overlay.showPopover?.();
 const r=target.getBoundingClientRect();if(r.top<8||r.bottom>innerHeight-8)target.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
 tutorialPosition();if(tutorialKey!==key||!target.contains(document.activeElement)){tutorialKey=key;const focus=target.matches('button,select,input,[tabindex]')?target:target.querySelector('button:not(:disabled),select:not(:disabled),input:not(:disabled)');focus?.focus({preventScroll:true});}
}
function tutorialBattleTarget(step){
 const opening=tutorialAction('COMBAT_BEGIN');if(opening)return {...step,target:opening,title:'전투를 시작하세요',text:'위쪽은 이번 라운드의 행동 순서입니다. 지금은 「전투 시작」만 누를 수 있습니다.',say:'battle.start'};
 const cardId=step.card||({guard:'PLAYER_BASIC_GUARD',attack:'PLAYER_BASIC_ATTACK'})[step.id]||(step.id==='skill'?game.combatCards().find(c=>/_E(?:_CHARGE)?$/.test(c.id)&&!c.reason)?.id:null);
 if(!cardId)return null;
 const key=game.s.runtime.id+':'+step.id+':'+cardId;
 if(tutorialBattlePick?.key!==key)tutorialBattlePick={key,card:false,target:false};
 const selected=game.combatCards().find(c=>c.id===cardId),button=tutorialFind('[data-card-id="'+cardId+'"]:not(:disabled)');if(!button)return null;
 const kind=cardId==='PLAYER_BASIC_GUARD'?'guard':cardId==='PLAYER_BASIC_ATTACK'?'attack':step.id==='skill'||step.id==='combatSkill'?'skill':step.id==='combatBurst'?'burst':null;
 if(!button.tutorialTracked){button.tutorialTracked=true;button.addEventListener('click',()=>{tutorialBattlePick.card=true;scheduleTutorial();},{capture:true});}
 // A new wave of slimes (runtime tutorial waves) is announced by the line that asks for the next lesson.
 const wave=game.s.runtime.tutorialWaves?.released>0&&kind!=='attack';
 if(!tutorialBattlePick.card||selectedCard!==cardId)return {...step,target:button,title:step.title,text:'먼저 밝게 표시된 「'+selected.name+'」을 누르세요.',say:kind&&kind+(wave?'.wave':'.card')};
 if(cardId!=='PLAYER_BASIC_GUARD'&&selected.targets?.length&&!tutorialBattlePick.target){
  const target=tutorialFind('.combatant-row[data-actor-id="'+CSS.escape(selected.targets[0].id)+'"]');if(!target)return null;
  if(!target.tutorialTracked){target.tutorialTracked=true;target.addEventListener('click',e=>{if(e.target.closest('button'))return;tutorialBattlePick.target=true;scheduleTutorial();},{capture:true});}
  return {...step,target,title:'공격할 대상을 고르세요',text:'밝게 표시된 적의 그림을 누르세요. 금색 테두리가 선택한 대상입니다.',say:kind==='skill'||kind==='burst'?kind+'.target':'attack.target'};
 }
 return {...step,target:tutorialAction('COMBAT'),title:'선택한 행동을 실행하세요',text:cardId==='PLAYER_BASIC_GUARD'?'실행을 누르면 방어하고 차례를 마칩니다.':'실행을 누르면 선택한 대상에게 행동합니다. 동료와 적의 차례는 자동으로 이어집니다.',say:kind&&kind+'.run'};
}
function tutorialControl(step){
 if(step.battle)return tutorialBattleTarget(step);
 const modal=document.querySelector('#modal[open]');
 const self=step.owner==='PLAYER_CUSTOM'||(!step.owner&&step.id==='equip');
 if(modal){const body=modal.querySelector('#modal-body')||modal;
  if(step.id==='party'&&body.querySelector('.member-picker'))return {...step,target:tutorialFind('.member-pick[data-owner="'+step.actor+'"]:not(:disabled)',body),title:'엠버를 선택하세요',text:'엠버의 그림을 누르면 함께 싸울 자리에 들어갑니다.',say:'party.pick'};
  if(step.id==='equip'&&body.querySelector('.gear-picker'))return {...step,target:tutorialAction('EQUIP',p=>p.owner===step.owner)||tutorialByText('.gear-option button',/^장착$/,body),title:'무기를 장착하세요',text:'밝게 표시된 장착 버튼을 누르세요.',say:self?'equip.self.pick':'equip.pick'};
  return {...step,target:tutorialFind('#modal-close'),title:'창을 닫고 안내를 이어가세요',text:'닫기를 누르면 필요한 조작으로 돌아갑니다.',say:'modal.close'};
 }
 if(document.querySelector('.wish-screen'))return {...step,target:tutorialFind('.wish-close'),title:'기원 창을 닫으세요',text:'이야기 속 조작 안내로 돌아갑니다.',say:'wish.close'};
 if(step.destination){
  if(!document.querySelector('#journey-map'))return {...step,target:tutorialNav('LOCATION'),title:'지도로 이동하세요',text:'메인을 눌러 현재 위치와 이어지는 길을 확인하세요.',say:'move.map'};
  if(NavigationUI.target!==step.destination){
   const node=tutorialFind('.terrain-node[data-map-id="'+step.destination+'"]'),map=document.querySelector('#journey-map'),hidden=!node&&map?.closest('.shell-pane[hidden]');
   return {...step,target:node||(hidden?tutorialTabFor(map):null),title:'밝게 표시된 목적지를 누르세요',text:mapName(step.destination)+'까지 이어지는 길을 지도에서 확인합니다.',say:node?'move.pick':'move.tab'};
  }
  return {...step,target:tutorialFind('.terrain-travel:not(:disabled)'),title:'이 길을 따라 이동하세요',text:'이동 버튼을 누르면 다음 구역으로 출발합니다.',say:'move.go'};
 }
 if(step.id==='prepare')return {...step,target:tutorialAction('COMBAT_PREPARE')||tutorialAction('MENU',p=>p.screen==='STORY')||tutorialByText('.shell-back',/전투 준비|이야기/)||tutorialNav('STORY'),say:'prepare'};
 const direct={resume:'JOURNEY_RESUME',scripted:'STORY_SCRIPTED_TRAVEL',ride:'STORY_RIDE'}[step.command];
 if(direct){const say=step.command==='resume'?'arrival':'storyTravel',target=tutorialAction(direct);if(target)return {...step,target,say};const hidden=[...document.querySelectorAll('[data-action="'+direct+'"]')].find(n=>!n.disabled);return {...step,target:tutorialTabFor(hidden)||tutorialNav('LOCATION'),say};}
 if(step.id==='party')return {...step,target:tutorialFind('.formation-slot:not([data-owner]) .member-add')||tutorialFind('.formation-slot[data-party-slot="2"] .member-select')||tutorialNav('PARTY')||tutorialAction('MENU',p=>p.screen==='PARTY'),say:'party.open'};
 if(step.id==='equip'){
  const owner=step.owner||'PLAYER_CUSTOM',slot=tutorialFind('.gear-member[data-owner="'+owner+'"] .gear-slot[data-category="WEAPON"]'),member=!slot&&tutorialFind('.shell-roster-item[data-owner="'+owner+'"]');
  const target=slot||member||tutorialFind('.formation-slot[data-owner="'+owner+'"] .party-gear')||tutorialNav('STATUS')||tutorialAction('MENU',p=>p.screen==='STATUS');
  return {...step,target,say:self?(slot?'equip.self.slot':'equip.self.nav'):(slot?'equip.slot':member?'equip.member':'equip.nav')};
 }
 return null;
}
function renderTutorial(){
 removeTutorialSpotlight();if(!game){activeTutorial=null;return;}const step=game.tutorialDirective();activeTutorial=step;if(!step)return;
 if(busy||['STORY','CUTIN','STORY_LOCKED'].includes(game.playPhase()))return;
 if(game.s.lifeJob){
  // 0.16.2: the scene marks what to press first (app_life_v0162.js) and drops the mark once something is collected.
  const scene=tutorialFind('[data-life-guide]');if(scene){showTutorialSpotlight(scene,step,step.title,'','life.'+game.s.lifeJob.kind);return;}
  const target=tutorialFind('.life-mini');if(target)showTutorialSpotlight(target,step,'밝은 영역에서 직접 조작하세요','채집은 표시된 대상을 고르고, 채광·사냥은 금색 구간에 맞춰 누릅니다.','life');return;
 }
 const focus=tutorialControl(step);if(focus?.target)showTutorialSpotlight(focus.target,step,focus.title,focus.text,focus.say);
}
async function openTutorial(){if(!game)return;await act('TUTORIAL_GUIDE',{enabled:true});renderTutorial();}
// Block outside clicks and keyboard shortcuts, including controls underneath a transparent hole.
for(const type of ['pointerdown','click','change','keydown'])document.addEventListener(type,e=>{
 if(!tutorialTarget?.isConnected||!tutorialOverlay?.isConnected)return;
 const inside=(tutorialTarget===e.target||tutorialTarget.contains(e.target))&&!e.target.closest?.('.enemy-info-button');
 if(type==='keydown'){
  if(e.key==='Tab'){e.preventDefault();e.stopImmediatePropagation();const f=tutorialTarget.matches('button,select,input,[tabindex]')?[tutorialTarget]:[...tutorialTarget.querySelectorAll('button:not(:disabled),select,input,[tabindex]')];if(f.length)f[(Math.max(-1,f.indexOf(document.activeElement))+(e.shiftKey?f.length-1:1))%f.length].focus();return;}
  if(inside&&['Enter',' ','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.stopPropagation();if(['Enter',' '].includes(e.key)&&e.target===tutorialTarget&&tutorialTarget.matches('.combatant-row,.life-node,.life-field')){e.preventDefault();tutorialTarget.click();}return;}
 }
 if(!inside||type==='keydown'){e.preventDefault();e.stopImmediatePropagation();return;}
 if(type==='click'||type==='change')scheduleTutorial();
},true);
window.addEventListener('resize',tutorialPosition,{passive:true});window.visualViewport?.addEventListener('resize',tutorialPosition,{passive:true});document.addEventListener('scroll',tutorialPosition,{capture:true,passive:true});
new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('#tutorial-spotlight')&&[...r.addedNodes,...r.removedNodes].some(n=>n.nodeType===1&&n.id!=='tutorial-spotlight'))||records.some(r=>r.type==='attributes'&&!r.target.closest?.('#tutorial-spotlight')))scheduleTutorial();}).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','aria-selected']});
function openGameHelp(){const box=el('div','game-help');box.append(el('p','','첫 이동과 이야기 속 전투에서 필요한 편성·장비·전투 조작을 안내합니다. 밝게 표시된 곳을 직접 조작하면 다음 단계로 이어집니다. 채집·채광·사냥은 처음 이용할 때 조작을 배웁니다.'));if(game)box.append(button('여행 실습 이어가기',()=>{document.getElementById('modal').close();openTutorial();},false,true));for(const [title,text]of [['성장','최대 Lv. 60. Lv. 10·20·30·40·50·55에서 캐릭터를 돌파합니다. 몬드의 적은 Lv. 1~30, 리월은 Lv. 30~60이며 지역과 비경 단계에 고정됩니다.'],['동료','캐릭터는 기원으로 소유합니다. 개인 임무 첫 완료에는 경험치 책 5개와 만남의 인연 2개, 호감도 10을 받습니다. 대기 동료는 전투 경험치 25%를 받고 책도 쓸 수 있습니다.'],['호감도','개인 임무와 함께한 승리로 만남이 열립니다. H01~H05 이야기를 마칠 때마다 공격·방어가 1%씩, 최대 5% 증가합니다.'],['비경','몬드성과 리월항에서 경험치·돌파·특성·장비 비경에 바로 입장합니다. 한국 시간 하루 첫 3승 재료·추가 모라가 2배이며 그 뒤에도 기본 보상으로 반복할 수 있습니다.']])box.append(el('h2','',title),el('p','',text));showModal('여행 안내',box);}
const tutorialQuick=updateQuick;updateQuick=function(){tutorialQuick();document.getElementById('quick-actions').append(button('도움말',openGameHelp,busy));};
const tutorialRender=render;render=function(){tutorialRender();renderTutorial();};
