/* 0.14.7 테이바트 UI: a Genshin-style frame around the existing screens.
 * - The sidebar becomes a top HUD (place, time, level, HP, Mora, play phase) with an icon menu; phones get the
 *   same icons in a bottom dock. PC hotkeys follow the original game: Esc menu, F1 handbook, J quests, L party,
 *   C characters, B bag, O bonds, M map, T story. In the story, Space/Enter continue and 1-9 pick a choice.
 * - Long screens are split into regions and tabs, so neither a 1280x720 screen nor a phone scrolls the page.
 * - View-only: every control is an existing button (moved, never rebuilt) or goes through the same nav buttons
 *   and act() paths, so rules, saves and online commits stay exactly where they were. Load last. */
(function(){
'use strict';
if(typeof render!=='function'||typeof act!=='function')return;
const S=window.CRPGShell={version:1,tabs:{},screen:null,menu:null,mobile:false,backdrop:null,extraTools:[],extraTiles:[],sceneryHooks:[],menuHooks:[]};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const $=(sel,root=document)=>root.querySelector(sel),$$=(sel,root=document)=>[...root.querySelectorAll(sel)];
const NS='http://www.w3.org/2000/svg';
// Line icons drawn for this game (24x24, stroke). No copied game assets.
const ICON={
 STORY:'M3 5.5C6 4 9 4 12 6c3-2 6-2 9-.5V19c-3-1.5-6-1.5-9 .5-3-2-6-2-9-.5z M12 6v13.5',
 LOCATION:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M15.5 8.5l-2 5-5 2 2-5z',
 PARTY:'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5 M16 10.5a2.5 2.5 0 1 0 0-5 M17 14c2 .4 3.3 2 3.7 4.5',
 STATUS:'M14.5 3.5h6v6L10 20l-6-6z M4 20l3-3 M13 7l4 4',
 INVENTORY:'M5.5 8h13l-1.2 12H6.7z M9 8V6.5a3 3 0 0 1 6 0V8 M9 12h6',
 QUEST:'M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z M12 8v5 M12 16v.01',
 RELATIONS:'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
 SYSTEM:'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z M12 2.5v3 M12 18.5v3 M2.5 12h3 M18.5 12h3 M5.3 5.3l2.1 2.1 M16.6 16.6l2.1 2.1 M5.3 18.7l2.1-2.1 M16.6 7.4l2.1-2.1',
 HANDBOOK:'M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3z M5 18a3 3 0 0 1 3-3h11 M11.5 6.2l.9 1.9 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z',
 MAP:'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z M9 4v14 M15 6v14',
 HISTORY:'M4 5h16v11H9l-5 4z M8 9h8 M8 12h5',
 HELP:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M9.6 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.5 M12 16.8v.01',
 SOUND:'M4 9h4l5-4v14l-5-4H4z M16 9a4 4 0 0 1 0 6 M18.5 6.5a7.5 7.5 0 0 1 0 11',
 MUTE:'M4 9h4l5-4v14l-5-4H4z M16.5 9.5l5 5 M21.5 9.5l-5 5',
 MENU:'M12 2.8l2 5.2 5.2 2-5.2 2-2 5.2-2-5.2-5.2-2 5.2-2z M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z',
 CLOSE:'M6 6l12 12 M18 6L6 18',
 BACK:'M15 5l-7 7 7 7',
 MORA:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7l3.5 5L12 17l-3.5-5z',
 TITLE:'M14 4h5v16h-5 M10 8l-4 4 4 4 M6 12h10',
 LOGOUT:'M10 4H5v16h5 M14 8l4 4-4 4 M18 12H9',
 DEBUG:'M9 9h6v8H9z M12 4v3 M5 10h4 M15 10h4 M5 15h4 M15 15h4',
 STAR:'M12 3l2.3 6.4L21 12l-6.7 2.6L12 21l-2.3-6.4L3 12l6.7-2.6z',
 CLOCK:'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18z M12 7v5l3 2',
 PIN:'M12 21s-6-5.6-6-11a6 6 0 0 1 12 0c0 5.4-6 11-6 11z M12 7.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
 SWORDS:'M4 4l9 9 M4 4h4 M4 4v4 M20 4l-9 9 M20 4h-4 M20 4v4 M7 17l-3 3 M17 17l3 3 M9 15l-2 2 M15 15l2 2',
 SWORD:'M14.5 3.5h6v6L10 20l-6-6z M4 20l3-3 M13 7l4 4',
 SHIELD:'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z M12 7v10',
 DIAMOND:'M12 3l6 9-6 9-6-9z M12 8l2.7 4L12 16l-2.7-4z',
 DOT:'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
 CHAT:'M4 5h16v11H11l-5 4v-4H4z M8 9.5h8 M8 12.5h5',
 MAIL:'M3.5 6h17v12h-17z M3.5 6.5l8.5 6.5 8.5-6.5',
 LOCK:'M7.5 11V8a4.5 4.5 0 0 1 9 0v3 M5.5 11h13v9.5h-13z M12 14.5v2.5',
 EYE:'M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12s-3.5 6.5-9.5 6.5S2.5 12 2.5 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
 PRIMO:'M12 2.5l6.5 7-6.5 12-6.5-12z M5.5 9.5h13 M12 2.5l-2.5 7 2.5 12 2.5-12z',
 SHOP:'M4 9.5h16l-1.2 10.5H5.2z M7.5 9.5V7a4.5 4.5 0 0 1 9 0v2.5 M9.5 14h5',
 STARS:'M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z M6 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
 TRADE:'M4 8h13l-3-3 M20 16H7l3 3 M17 8l-3 3 M7 16l3-3',
 ANVIL:'M3 7h12.5a4.5 4.5 0 0 0 4.5-3v5a4 4 0 0 1-4 4h-2v3l3 3H7l3-3v-3H8a5 5 0 0 1-5-5z',
 POT:'M3 10h18 M5 10l1.3 8.4A2 2 0 0 0 8.3 20h7.4a2 2 0 0 0 2-1.6L19 10 M9.5 6.8c0-1.1 1.2-1.4 1.2-2.6 M13.5 6.8c0-1.1 1.2-1.4 1.2-2.6',
 FLASK:'M9 3h6 M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.5V3 M7 15.5h10'
};
function icon(name,cls='shell-icon'){const s=document.createElementNS(NS,'svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');s.setAttribute('class',cls);const p=document.createElementNS(NS,'path');p.setAttribute('d',ICON[name]||ICON.DOT);s.append(p);return s;}
S.icon=icon;
// data-screen of the nav buttons -> icon, hotkey and the short label shown on phones and in the menu.
// One name per screen everywhere (bar, menu, page title): 캐릭터 = equipment, talents and constellations, 가방 = items.
const NAV={STORY:{icon:'STORY',key:'T',label:'이야기',short:'이야기'},LOCATION:{icon:'LOCATION',key:'',label:'메인 화면',short:'메인'},PARTY:{icon:'PARTY',key:'L',label:'편성',short:'편성'},STATUS:{icon:'STATUS',key:'C',label:'캐릭터',short:'캐릭터'},INVENTORY:{icon:'INVENTORY',key:'B',label:'가방',short:'가방'},QUEST:{icon:'QUEST',key:'J',label:'임무',short:'임무'},RELATIONS:{icon:'RELATIONS',key:'O',label:'호감도',short:'호감도'},SYSTEM:{icon:'SYSTEM',key:'',label:'설정',short:'설정'}};
// Plain names for labels made by the online and sound layers (those files are not edited here).
const RELABEL={'소리 시작':'소리 켜기','게임 시작 화면':'시작 화면으로','상위 20위':'나선비경 랭킹','자동저장·계정':'설정','저장':'설정'};
const relabel=s=>RELABEL[String(s||'').trim()]||String(s||'').trim();
const HOTKEYS={t:'STORY',l:'PARTY',c:'STATUS',b:'INVENTORY',j:'QUEST',o:'RELATIONS'};
const MENU_SCREENS=new Set(['PARTY','STATUS','INVENTORY','QUEST','RELATIONS','SYSTEM','SHOP','CRAFT','COOKING','MARKET','RECRUITMENT','ABYSS','ENHANCE','FORGE']);
const isMobile=()=>matchMedia('(max-width: 760px)').matches;
try{matchMedia('(max-width: 760px)').addEventListener('change',()=>{if(game)render();});}catch{}
function navButton(screen){return $('main > aside nav [data-screen="'+screen+'"]');}
function openScreen(screen){const b=navButton(screen);if(b){if(b.disabled){toast(b.title||b.getAttribute('aria-description')||'지금은 이 메뉴를 열 수 없습니다.');return false;}b.click();return true;}if(game&&!busy){act('MENU',{screen});return true;}return false;}
S.open=openScreen;
function toast(text){if(!text)return;let t=$('#shell-toast');if(!t){t=mk('div','shell-toast');t.id='shell-toast';t.setAttribute('role','status');document.body.append(t);}t.textContent=text;t.classList.remove('show');void t.offsetWidth;t.classList.add('show');clearTimeout(S.toastTimer);S.toastTimer=setTimeout(()=>t.classList.remove('show'),2600);window.CRPGSound?.play('toast');}
S.toast=toast;
const sound=name=>window.CRPGSound?.play(name);
// 모험 등급 상승: a short banner when the protagonist levels up (any action that grants experience).
S.levelUp=function(from,to){const old=$('.shell-levelup');old?.remove();const b=mk('div','shell-levelup');b.setAttribute('role','status');b.append(mk('small','','LEVEL UP'),mk('strong','','모험 등급 상승'),mk('span','','Lv. '+from+' → Lv. '+to));document.body.append(b);setTimeout(()=>b.remove(),2900);};
function fmt(n){return Math.round(Number(n)||0).toLocaleString('ko-KR');}
function screenKey(){
 if(!game)return 'TITLE';
 if($('#root .content .combat-panel'))return 'COMBAT';
 const g=game.s.global;return g.SCREEN_MODE||'LOCATION';
}
// ---------- backdrop ----------
function setBackdrop(src){const b=$('.world-backdrop');if(!b)return;if(src){if(S.backdrop!==src){b.style.backgroundImage='url("'+src+'")';S.backdrop=src;}b.classList.add('shell-lit');}else b.classList.remove('shell-lit');}
function mapBackground(){try{const id=game.s.global.CURRENT_MAP_ID,m=MANIFEST.maps?.[id];return m?.url||(m?.file_name?assetPath(m.file_name):null)||null;}catch{return null;}}
// ---------- HUD ----------
function buildHUD(aside,key){
 aside.classList.add('shell-hud');
 const g=game.s.global,card=$('.player-card',aside),phase=$('.phase-note',aside),nav=$('nav',aside);
 if(card)card.classList.add('shell-hidden-card');
 const info=mk('div','hud-info');
 const place=mk('button','hud-place');place.type='button';place.title='지도 열기 (M)';place.append(icon('PIN'),mk('span','hud-place-name',safeMap(g.CURRENT_MAP_ID)));place.onclick=()=>openMap();
 const line=mk('div','hud-subline');line.append(mk('span','hud-time',(g.WORLD_DAY||1)+'일차 '+(g.WORLD_TIME||'')));if(phase){phase.classList.add('hud-phase');line.append(phase);}
 info.append(place,line);
 const me=mk('div','hud-me');let hp=g.PLAYER_HP_CURRENT,max=g.PLAYER_HP_MAX;const actor=game.s.runtime?.actors?.find(a=>a.source==='PLAYER_CUSTOM');if(actor){hp=actor.hp;max=actor.maxHp;}
 let growth=null;try{growth=game.growth('PLAYER_CUSTOM');}catch{}
 const lv=mk('div','hud-level');lv.title=growth&&!growth.max?'경험치 '+fmt(growth.xp)+' / '+fmt(growth.next):'최대 레벨';const ring=mk('span','hud-level-ring');ring.style.setProperty('--p',growth?.max?100:Math.max(0,Math.min(100,(growth?.xp||0)/(growth?.next||1)*100)).toFixed(1));ring.append(mk('b','',g.PLAYER_LEVEL_STATE||1));lv.append(ring,mk('span','hud-name',g.PLAYER_NAME||'모험가'));
 const hpBox=mk('div','hud-hp');hpBox.title='체력 '+fmt(hp)+' / '+fmt(max);const bar=mk('span','hud-bar'),fill=mk('i');fill.style.width=Math.max(0,Math.min(100,hp/(max||1)*100))+'%';if(hp/(max||1)<.3)hpBox.classList.add('low');bar.append(fill);hpBox.append(bar,mk('small','',fmt(hp)+' / '+fmt(max)));
 // 0.15.1: the Mora coin from the game, like the Primogem beside it (user: 「이쪽 모라는 안바꿔?」).
 const mora=mk('div','hud-mora');mora.title='모라';mora.append(window.currencyIcon?.('MORA','hud-mora-icon')||icon('MORA'),mk('span','',fmt(g.MORA)));
 me.append(lv,hpBox,mora);
 if(nav){nav.classList.add('hud-nav');for(const b of $$('button',nav)){const scr=b.dataset.screen,def=NAV[scr];if(def){b.classList.add('hud-nav-button');const old=$('.nav-icon',b);if(old)old.replaceWith(icon(def.icon,'shell-icon nav-glyph'));const label=b.lastElementChild;if(label&&label.tagName==='SPAN'){label.classList.add('hud-nav-label');label.textContent=def.label;}b.setAttribute('aria-label',def.label);b.append(mk('span','hud-nav-short',def.short));b.title=(b.title?b.title+' · ':'')+def.label+(def.key?' ('+def.key+')':'');}else{b.classList.add('hud-extra');b.hidden=true;}}}
 const tools=mk('div','hud-tools');
 if(window.CRPGHandbook){const hb=toolButton('HANDBOOK','모험가 핸드북 (F1)',()=>CRPGHandbook.open());hb.classList.add('hud-handbook');tools.append(hb);}
 tools.append(toolButton('MAP','지도 (M)',openMap));
 if(WORLD_SCREENS.has(key))tools.append(toolButton('EYE','풍경 보기 (V)',()=>toggleScenery(true),'hud-scenery'));
 for(const make of S.extraTools){try{const b=make(toolButton);if(b)tools.append(b);}catch{}}
 const snd=quickButton(b=>b.dataset.audioToggle==='true');if(snd){const on=/끄기/.test(snd.textContent);tools.append(toolButton(on?'SOUND':'MUTE',relabel(snd.textContent),()=>{quickButton(b=>b.dataset.audioToggle==='true')?.click();}));}
 tools.append(toolButton('MENU','메뉴 (Esc)',()=>toggleMenu(true),'hud-menu-button'));
 const guideSlot=mk('div','hud-guide-slot');
 aside.replaceChildren(...[info,guideSlot,me,nav,tools,card].filter(Boolean));
 aside.dataset.shellScreen=key;
}
// The learning guide lives behind a HUD pill; its popover opens once per step and never covers play for long.
function placeGuide(){
 const guide=$('#tutorial-tour'),slot=$('main > aside .hud-guide-slot');
 $$('.hud-guide-pop').forEach(n=>{if(!guide||!n.contains(guide))n.remove();});
 if(!guide||!document.body.classList.contains('teyvat')&&!slot){slot?.replaceChildren();return;}
 const step=(guide.querySelector('h2')||guide.querySelector('strong'))?.textContent.trim()||'여행 안내',count=guide.querySelector('.eyebrow')?.textContent.replace('직접 해 보기 · ','').trim()||'';
 if(S.guideStep!==step){S.guideStep=step;S.guideOpen=!S.guideMin;}
 let pop=guide.closest('.hud-guide-pop');if(!pop){pop=mk('div','hud-guide-pop');pop.setAttribute('role','region');pop.setAttribute('aria-label','여행 안내');document.body.append(pop);pop.append(guide);}
 const min=mk('button','hud-guide-min');min.type='button';min.setAttribute('aria-label','안내 잠시 숨기기');min.title='안내 잠시 숨기기 (HUD의 안내 버튼으로 다시 열기)';min.append(icon('CLOSE'));min.onclick=()=>{S.guideOpen=false;S.guideMin=true;placeGuide();};
 pop.querySelector('.hud-guide-min')?.remove();pop.prepend(min);
 // A save confirmation or a dialog always wins over the guide.
 pop.hidden=!S.guideOpen||!slot||!!$('#root > .pending-action-notice')||!!$('dialog[open]');
 if(!slot)return;
 const pill=mk('button','hud-guide'+(S.guideOpen?' open':''));pill.type='button';pill.setAttribute('aria-expanded',String(!!S.guideOpen));pill.title='여행 안내 · '+step;
 pill.append(icon('HELP'),mk('span','hud-guide-count',count||'안내'),mk('span','hud-guide-step',step));
 pill.onclick=()=>{S.guideOpen=!S.guideOpen;if(S.guideOpen)S.guideMin=false;placeGuide();};
 slot.replaceChildren(pill);
}
if(typeof renderTutorial==='function'){const priorTutorial=renderTutorial;renderTutorial=function(){priorTutorial();try{placeGuide();}catch{}};}
function toolButton(name,label,fn,cls=''){const b=mk('button','hud-tool '+cls);b.type='button';b.title=label;b.setAttribute('aria-label',label);b.append(icon(name));b.onclick=fn;return b;}
function quickButton(test){return $$('#quick-actions button').find(test)||null;}
function safeMap(id){try{return game.tables['32_MAP_DB'].get(id)?.[2]||'여행 중';}catch{return '여행 중';}}
// ---------- Paimon menu ----------
function toggleMenu(open=!S.menu){if(open){if(S.menu)return;S.menu=buildMenu();document.body.append(S.menu);document.body.classList.add('shell-menu-open');requestAnimationFrame(()=>S.menu?.classList.add('open'));$('.pm-tile:not([disabled])',S.menu)?.focus({preventScroll:true});sound('menu_open');}else if(S.menu){const m=S.menu;S.menu=null;document.body.classList.remove('shell-menu-open');m.classList.remove('open');setTimeout(()=>m.remove(),160);sound('menu_close');}}
S.menuToggle=toggleMenu;
function buildMenu(){
 const g=game?.s.global||{},wrap=mk('div','paimon-menu');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','메뉴');
 wrap.addEventListener('click',e=>{if(e.target===wrap)toggleMenu(false);});
 const box=mk('div','pm-box'),card=mk('section','pm-card');
 if(game){const who=mk('div','pm-who');who.append(mk('small','','모험가'),mk('strong','',g.PLAYER_NAME||'모험가'),mk('span','',routeName(g.STORY_ROUTE_ID)+' · Lv. '+(g.PLAYER_LEVEL_STATE||1)));
  const facts=mk('dl','pm-facts');for(const [k,v]of [['위치',safeMap(g.CURRENT_MAP_ID)],['시간',(g.WORLD_DAY||1)+'일차 '+(g.WORLD_TIME||'')],['모라',fmt(g.MORA)],['상태',$('main > aside .phase-note')?.textContent||'']])if(v){facts.append(mk('dt','',k),mk('dd','',v));}
  card.append(who,facts);}
 const grid=mk('div','pm-grid');
 for(const [screen,def]of Object.entries(NAV)){const src=navButton(screen);if(!src)continue;const t=tile(def.icon,src.querySelector('.hud-nav-label')?.textContent||def.label,def.key,()=>{toggleMenu(false);src.click();});t.disabled=src.disabled;if(src.disabled&&src.title)t.title=src.title;grid.append(t);}
 if(window.CRPGHandbook)grid.append(tile('HANDBOOK','모험가 핸드북','F1',()=>{toggleMenu(false);CRPGHandbook.open();}));
 grid.append(tile('MAP','지도','M',()=>{toggleMenu(false);openMap();}));
 // 0.14.13: the phone top bar has room for the menu button only, so 풍경 보기 is here too.
 if(isMobile()&&WORLD_SCREENS.has(S.screen))grid.append(tile('EYE','풍경 보기','V',()=>{toggleMenu(false);toggleScenery(true);}));
 for(const x of S.extraTiles){try{if(x.show&&!x.show())continue;const t=tile(x.icon,x.label,x.key||'',()=>{toggleMenu(false);x.run();});grid.append(t);}catch{}}
 const foot=mk('div','pm-foot');
 // The quick 설정 button only repeats the 설정 tile above, so it is left out here.
 for(const q of $$('#quick-actions button')){const label=q.textContent.trim();if(!label)continue;const kind=/기록/.test(label)?'HISTORY':/도움말/.test(label)?'HELP':q.dataset.audioToggle?(/끄기/.test(label)?'SOUND':'MUTE'):/계정|저장|설정/.test(label)?'SYSTEM':'DOT';if(kind==='SYSTEM')continue;const b=footButton(kind,relabel(label),()=>{toggleMenu(false);q.click();});b.disabled=q.disabled;foot.append(b);}
 for(const x of $$('main > aside nav .hud-extra')){const label=x.textContent.trim(),kind=/로그아웃/.test(label)?'LOGOUT':/시작 화면/.test(label)?'TITLE':/디버그/.test(label)?'DEBUG':'DOT';const b=footButton(kind,relabel(label),()=>{toggleMenu(false);x.click();});b.disabled=x.disabled;foot.append(b);}
 const close=mk('button','pm-close');close.type='button';close.setAttribute('aria-label','메뉴 닫기');close.append(icon('CLOSE'));close.onclick=()=>toggleMenu(false);
 box.append(close,card,grid,foot);wrap.append(box);
 for(const add of S.menuHooks)try{add(box,{close:()=>toggleMenu(false)});}catch{}
 wrap.addEventListener('keydown',e=>{if(e.key==='Tab'){const f=$$('button:not([disabled])',wrap);if(!f.length)return;const i=f.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();f.at(-1).focus();}else if(!e.shiftKey&&i===f.length-1){e.preventDefault();f[0].focus();}}});
 return wrap;
}
function tile(name,label,key,fn){const b=mk('button','pm-tile');b.type='button';b.append(icon(name,'shell-icon pm-glyph'),mk('span','pm-label',label));if(key)b.append(mk('kbd','',key));b.onclick=fn;return b;}
function footButton(name,label,fn){const b=mk('button','pm-foot-button');b.type='button';b.append(icon(name),mk('span','',label));b.onclick=fn;return b;}
// ---------- 풍경 보기 ----------
// Every field and town can be looked at without the interface, dragged left and right. A hidden oculus glints
// somewhere in that view and nowhere else, so finding it means actually looking around.
const WORLD_SCREENS=new Set(['LOCATION','HUB']);
const GLINT_AT={'scene-bottom-right':[90,74],default:[87,70]};
function hiddenGlints(){try{return (game.oculusEntries?.()||[]).filter(p=>p.method==='HIDDEN'&&!game.oculusProgress(p.id)&&!p.reason);}catch{return [];}}
function sceneryImage(){const c=$('#root > main > .content');return $('.scene img.scene-back',c)?.src||$('.scene img',c)?.src||mapBackground();}
function toggleScenery(open=!S.scenery){
 if(!open){const v=S.scenery;if(!v)return;S.scenery=null;document.body.classList.remove('shell-scenery-open');v.classList.remove('open');setTimeout(()=>v.remove(),230);return;}
 if(S.scenery||!game||busy||!WORLD_SCREENS.has(screenKey()))return;
 const src=sceneryImage();if(!src){toast('이곳은 둘러볼 풍경이 없습니다.');return;}
 const view=mk('div','shell-scenery');view.setAttribute('role','dialog');view.setAttribute('aria-modal','true');view.setAttribute('aria-label','풍경 보기');
 const pan=mk('div','scenery-pan'),stage=mk('div','scenery-stage'),img=mk('img','scenery-img');img.src=src;img.alt='';img.decoding='async';img.draggable=false;stage.append(img);
 for(const p of hiddenGlints()){const b=mk('button','scenery-glint','✧'),at=GLINT_AT[p.hotspot?.zone]||GLINT_AT.default;b.type='button';b.setAttribute('aria-label',p.hotspot?.accessibleLabel||'희미하게 반짝이는 곳 살펴보기');b.style.left=at[0]+'%';b.style.top=at[1]+'%';b.onclick=e=>{e.stopPropagation();toggleScenery(false);act('WORLD_WORK_START',{kind:'OCULUS',point:p.id});};stage.append(b);}
 // 0.14.15: other things placed in the view (treasure chests, app_chests_v01415.js).
 for(const add of S.sceneryHooks)try{add(stage,{close:()=>toggleScenery(false),image:src});}catch{}
 pan.append(stage);
 const bar=mk('div','scenery-bar'),close=mk('button','scenery-close');close.type='button';close.setAttribute('aria-label','풍경 보기 닫기 (Esc)');close.title='닫기 (Esc)';close.append(icon('CLOSE'));close.onclick=()=>toggleScenery(false);
 bar.append(mk('strong','',safeMap(game.s.global.CURRENT_MAP_ID)),mk('small','','끌거나 휠을 돌려 둘러보기 · Esc 닫기'),close);
 view.append(pan,bar);document.body.append(view);document.body.classList.add('shell-scenery-open');S.scenery=view;
 let drag=null;
 pan.addEventListener('pointerdown',e=>{if(e.target.closest('button'))return;drag={x:e.clientX,left:pan.scrollLeft,id:e.pointerId};try{pan.setPointerCapture(e.pointerId);}catch{}pan.classList.add('dragging');});
 pan.addEventListener('pointermove',e=>{if(drag&&e.pointerId===drag.id)pan.scrollLeft=drag.left-(e.clientX-drag.x);});
 const end=e=>{if(drag&&e.pointerId===drag.id){drag=null;pan.classList.remove('dragging');}};pan.addEventListener('pointerup',end);pan.addEventListener('pointercancel',end);
 pan.addEventListener('wheel',e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){pan.scrollLeft+=e.deltaY;e.preventDefault();}},{passive:false});
 view.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();pan.scrollBy({left:(e.key==='ArrowLeft'?-1:1)*Math.round(pan.clientWidth*.25),behavior:settings.reducedMotion?'instant':'smooth'});}});
 requestAnimationFrame(()=>{view.classList.add('open');pan.scrollLeft=Math.round((pan.scrollWidth-pan.clientWidth)/2);close.focus({preventScroll:true});});
 sound('menu_open');
}
S.toggleScenery=toggleScenery;
function openMap(){if(!game)return;S.tabs.LOCATION_MOBILE='move';if(screenKey()!=='LOCATION'){if(!openScreen('LOCATION'))return;}else if(isMobile())render();requestAnimationFrame(()=>{const m=$('#journey-map');if(m){m.classList.add('shell-flash');m.scrollIntoView({block:'nearest'});setTimeout(()=>m.classList.remove('shell-flash'),900);$('.terrain-destination:not([disabled])',m)?.focus({preventScroll:true});}});}
S.openMap=openMap;
// ---------- regions and tabs ----------
function classify(children,rules,fallback){
 const out=new Map(rules.map(r=>[r.name,[]]));if(!out.has(fallback))out.set(fallback,[]);let heading=null;
 for(const c of children){
  if(c.tagName==='H2'&&!c.className){heading=c;continue;}
  const r=rules.find(r=>r.sel.some(s=>{try{return c.matches(s);}catch{return false;}})||(r.test&&r.test(c)));const name=r?r.name:fallback;
  if(heading){out.get(name).push(heading);heading=null;}out.get(name).push(c);
 }
 if(heading)out.get(fallback).push(heading);return out;
}
function tabset(key,defs,cls=''){
 const live=defs.filter(d=>d.nodes&&d.nodes.length);if(!live.length)return null;
 let current=S.tabs[key];if(!live.some(d=>d.id===current))current=live[0].id;
 const root=mk('div','shell-tabs '+cls),bar=mk('div','shell-tabbar'),body=mk('div','shell-panes');bar.setAttribute('role','tablist');
 const select=(id,focus)=>{S.tabs[key]=id;for(const b of bar.children){const on=b.dataset.tab===id;b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;b.classList.toggle('active',on);if(on&&focus)b.focus();}for(const p of body.children){const on=p.dataset.tab===id;p.hidden=!on;if(on){p.classList.remove('shell-enter');void p.offsetWidth;p.classList.add('shell-enter');}}};
 live.forEach(d=>{const b=mk('button','shell-tab');b.type='button';b.setAttribute('role','tab');b.dataset.tab=d.id;if(d.icon)b.append(icon(d.icon));b.append(mk('span','',d.label));if(d.badge)b.append(mk('small','shell-tab-badge',d.badge));b.onclick=()=>{if(S.tabs[key]!==d.id)sound('tab');select(d.id);};bar.append(b);const pane=mk('div','shell-pane');pane.dataset.tab=d.id;pane.setAttribute('role','tabpanel');pane.append(...d.nodes);body.append(pane);});
 bar.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;const ids=live.map(d=>d.id),i=ids.indexOf(S.tabs[key]);const next=ids[(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?ids.length-1:1))%ids.length];e.preventDefault();select(next,true);});
 select(current);root.append(bar,body);if(live.length===1)root.classList.add('single');return root;
}
S.tabset=tabset;
function region(cls,nodes){const r=mk('div','shell-region '+cls);for(const n of nodes)r.append(n);return r;}
// Split a flat panel into tabs at its h2 headings (the part before the first h2 keeps the page title).
function sectionsByHeading(nodes,firstLabel){const groups=[];let cur={label:firstLabel,nodes:[]};for(const n of nodes){if(n.tagName==='H2'){if(cur.nodes.length)groups.push(cur);cur={label:n.textContent.trim(),nodes:[n]};}else cur.nodes.push(n);}if(cur.nodes.length)groups.push(cur);return groups;}
// ---------- page frame for menu screens ----------
const BACK_LABELS=/^(메인 화면으로|이야기로 돌아가기|전투로 돌아가기|장소로 돌아가기|돌아가기)$/;
function pageHead(key,p,{title,iconName}={}){
 const head=mk('header','shell-page-head'),h1=[...p.children].find(c=>c.tagName==='H1');const eyebrow=[...p.children].find(c=>c.classList?.contains('eyebrow'));
 if(h1&&['STATUS','INVENTORY','SYSTEM'].includes(key))h1.textContent=NAV[key].label;
 const t=mk('div','shell-page-title');t.append(icon(iconName||NAV[key]?.icon||'STAR','shell-icon page-glyph'));const words=mk('div','shell-page-words');if(h1){h1.classList.add('shell-h1');words.append(h1);}else words.append(mk('h1','shell-h1',title||NAV[key]?.label||''));if(eyebrow){eyebrow.classList.add('shell-eyebrow');words.prepend(eyebrow);}t.append(words);head.append(t);
 const tools=mk('div','shell-page-tools');head.append(tools);
 let back=[...p.children].filter(c=>c.tagName==='BUTTON'&&BACK_LABELS.test(c.textContent.trim())).at(-1);
 if(back){back.classList.add('shell-back');back.setAttribute('aria-label',back.textContent.trim()+' (Esc)');const label=back.textContent.trim();back.replaceChildren(icon('CLOSE'),mk('span','shell-back-label',label));tools.append(back);}
 else{const target=returnScreen();if(target&&target!==key){const src=navButton(target);back=mk('button','shell-back');back.type='button';back.append(icon('CLOSE'),mk('span','shell-back-label',target==='STORY'?'이야기로 돌아가기':target==='COMBAT'?'전투로 돌아가기':'메인 화면으로'));back.setAttribute('aria-label',back.textContent+' (Esc)');back.disabled=!!src?.disabled&&target!=='COMBAT';back.onclick=()=>target==='COMBAT'?act('MENU',{screen:'COMBAT'}):openScreen(target);tools.append(back);}}
 // 0.14.12: inside a facility (바그너의 대장간 and the rest) 「메인 화면으로」 and Esc leave it exactly like 「밖으로 나가기」,
 // with the same exit and save, instead of switching screens on the spot.
 if(back&&!back.disabled&&game?.s?.placeVisit&&!game.s.runtime&&back.textContent.trim()==='메인 화면으로'&&!game.actionReason('PLACE_LEAVE',{}))back.onclick=()=>act('PLACE_LEAVE',{});
 return {head,tools,back};
}
S.pageHead=pageHead;
// Where a menu returns to: the running battle, the story in progress, or the main screen.
function returnScreen(){if(!game)return null;if(game.s.runtime&&!game.s.runtime.interlude)return 'COMBAT';const l=navButton('LOCATION');if(l&&!l.disabled)return 'LOCATION';return 'STORY';}
// ---------- screen layouts ----------
function layoutLocation(content,p){
 content.classList.add('shell-world');setBackdrop(mapBackground()||$('.scene img',content)?.src);
 const scene=$(':scope > .scene',content);if(scene)scene.classList.add('shell-offscreen');
 // A hidden oculus here turns the place picture into scenery to scroll through (app_discovery.js). In this frame the
 // oculus only glints inside 풍경 보기, which every field and town has, so nothing on screen gives it away.
 const discovery=$(':scope > .discovery-scene',content);if(discovery)discovery.classList.add('shell-offscreen');
 const kids=[...p.children];
 const groups=classify(kids,[
  {name:'head',sel:['.eyebrow','h1','.area-level']},
  {name:'objective',sel:['.main-objective','.pinned-objective','.next-chapter','.field-objective'],test:c=>c.tagName==='BUTTON'&&/이야기 계속/.test(c.textContent)},
  {name:'map',sel:['#journey-map','.terrain-navigation']},
  {name:'wait',sel:['.wait-controls']},
  {name:'places',sel:['.location-places','.liyue-city-directory','.city-directory','.place-directory']},
  {name:'activity',sel:['.ley-line-card','.material-challenge','.liyue-artifact-farm','.field-boss-card','.field-boss-entry','.boss-entry','.traveler-statue','.statue-card']},
  {name:'info',sel:['.mond-region-guide','.liyue-region-guide','.geo-trail','.region-guide']}
 ],'todo');
 // A muted line right under the header describes the place.
 const todo=groups.get('todo'),head=groups.get('head');while(todo[0]?.matches?.('p.muted')&&kids.indexOf(todo[0])<=kids.indexOf(head.at(-1))+1)head.push(todo.shift());
 const header=mk('header','shell-loc-head');header.append(...head.filter(n=>!n.matches('.eyebrow')));
 p.classList.add('shell-loc');p.replaceChildren();
 const mapId=game.s.global.CURRENT_MAP_ID,hub=game.tables['32_MAP_DB']?.get(mapId)?.[12]==='Y';
 const places=groups.get('places'),activity=groups.get('activity'),info=groups.get('info');
 const placeCount=places.reduce((n,x)=>n+(x.matches('.location-places')?x.children.length:1),0);
 // Facilities become small tiles (icon and name) and the whole tile enters, so a town fits without scrolling.
 for(const box of places)for(const entry of $$('.place-entry',box)){const btns=$$(':scope > button',entry);if(btns.length!==1)continue;
  const name=$('h3',entry)?.textContent.trim()||'',b=btns[0];entry.classList.add('shell-place-tile');entry.classList.toggle('locked',b.disabled&&!!$('.choice-note',entry));b.setAttribute('aria-label',(name?name+' · ':'')+b.textContent.trim());
  entry.title=$$('.place-entry-copy > *',entry).map(n=>n.textContent.trim()).filter(Boolean).join(' · ');}
 const tabs=[{id:'todo',label:'할 일',icon:'STAR',nodes:todo},{id:'places',label:'시설',icon:'PIN',nodes:places,badge:placeCount?String(placeCount):''},{id:'activity',label:'지맥·보스',icon:'SWORDS',nodes:activity},{id:'info',label:'지역 정보',icon:'HANDBOOK',nodes:info}];
 const key='LOC:'+mapId;if(!S.tabs[key])S.tabs[key]=hub&&places.length?'places':todo.length?'todo':places.length?'places':'activity';
 if(isMobile()){
  const mkey='LOCM:'+mapId;if(!S.tabs[mkey])S.tabs[mkey]=S.tabs.LOCATION_MOBILE==='move'?'move':'here';S.tabs.LOCATION_MOBILE=null;
  const here=[header,...groups.get('objective'),...(hub?[]:todo),...groups.get('wait')];
  const t=tabset(mkey,[{id:'here',label:'주변',icon:'LOCATION',nodes:here},{id:'move',label:'이동',icon:'MAP',nodes:groups.get('map')},...(hub?[{id:'todo',label:'할 일',icon:'STAR',nodes:todo}]:[]),...tabs.slice(1)],'shell-loc-tabs');if(t)p.append(t);return;
 }
 const side=tabset(key,tabs,'shell-loc-side');
 const left=region('shell-loc-left',[header,...groups.get('objective'),...(side?[side]:[]),...groups.get('wait')]),main=region('shell-loc-main',groups.get('map'));
 p.append(left,main);
}
function layoutStory(content,p){
 content.classList.add('shell-story');
 const fig=$('.portrait-frame',p),img=fig?.querySelector('img');
 const bg=mapBackground();setBackdrop(bg||img?.src);
 const scene=$(':scope > .scene',content);if(scene)scene.classList.add('shell-offscreen');
 if(fig){const stage=mk('div','shell-story-figure');stage.append(fig);content.prepend(stage);}
 p.classList.add('shell-dialogue');
 const copy=$('.story-copy',p)||p;const choices=$$('.choice',p);
 if(choices.length){p.classList.add('has-choices');choices.forEach((c,i)=>{c.dataset.hotkey=String(i+1);c.title=(c.title?c.title+' · ':'')+'숫자 키 '+(i+1);});
  // Like the original, the line being answered stays on screen above the choices.
  const last=typeof sceneHistory!=='undefined'&&Array.isArray(sceneHistory)?sceneHistory.at(-1):null,label=$(':scope > .speaker',copy);
  if(last?.text&&label){label.textContent=last.speaker||'이야기';label.classList.add('shell-recall-speaker');const line=mk('p','story shell-recall',last.text);label.after(line);}
 }
 const cont=continueButton(p);if(cont){cont.classList.add('shell-continue');p.classList.add('can-continue');cont.title=(cont.title?cont.title+' · ':'')+'Space / Enter';}
 p.addEventListener('click',e=>{if(e.target.closest('button,a,input,select,textarea,summary,label,details'))return;const b=continueButton(p);if(b&&!b.disabled)b.click();});
 // 자동 재생: reads on by itself like the original's auto button; it always stops at a choice.
 const bar=$('.story-toolbar',p);if(bar){const auto=mk('button','shell-auto'+(S.auto?' on':''));auto.type='button';auto.setAttribute('aria-pressed',String(!!S.auto));auto.append(icon('CLOCK'),mk('span','',S.auto?'자동 재생 중':'자동 재생'));auto.title='대사를 일정한 간격으로 넘깁니다. 선택지에서는 멈춥니다.';auto.onclick=e=>{e.stopPropagation();S.auto=!S.auto;try{localStorage.setItem('crpg-shell-auto',S.auto?'1':'0');}catch{}render();};bar.append(auto);}
 scheduleAuto(p,choices.length);
 void copy;
}
function scheduleAuto(p,hasChoices){
 clearTimeout(S.autoTimer);if(!S.auto||hasChoices)return;const b=continueButton(p);if(!b||!/계속 읽기/.test(b.textContent))return;
 const text=$('p.story',p)?.textContent||'',wait=Math.min(9000,1400+text.length*55);const node=game?.storyActiveNodeId?.();
 S.autoTimer=setTimeout(()=>{if(!S.auto||busy||!game||game.storyActiveNodeId?.()!==node||document.hidden||S.menu||window.CRPGHandbook?.isOpen?.())return;const now=continueButton($('.content .panel')||document);if(now&&!now.disabled)now.click();},wait);
}
try{S.auto=localStorage.getItem('crpg-shell-auto')==='1';}catch{}
function continueButton(p){const primary=$$('.story-copy .actions button.primary, :scope > .actions button.primary',p).filter(b=>!b.disabled);return primary.find(b=>/계속 읽기|전투 시작|다음 활동 선택|정한 이름 알려 주기/.test(b.textContent))||null;}
function layoutCombat(content,p){
 content.classList.add('shell-battle');setBackdrop(mapBackground());
 const extras=[];for(const c of [...p.children]){if(c.matches('.battle-heading,.battle-order,.combat-duo,.battle-details,.combat-playback,.battle-command,.compact-battle-stage'))continue;extras.push(c);}
 if(extras.length){const info=mk('aside','shell-battle-info');const toggle=mk('button','shell-battle-info-toggle');toggle.type='button';toggle.append(icon('HANDBOOK'),mk('span','','전투 정보 '+extras.length));toggle.setAttribute('aria-expanded',String(!!S.battleInfoOpen));toggle.onclick=()=>{S.battleInfoOpen=!S.battleInfoOpen;info.classList.toggle('open',S.battleInfoOpen);toggle.setAttribute('aria-expanded',String(S.battleInfoOpen));};info.classList.toggle('open',!!S.battleInfoOpen);const body=mk('div','shell-battle-info-body');body.append(...extras);info.append(toggle,body);p.append(info);p.classList.add('with-info');}
 const teams=$('.battle-teams',p);if(teams){const [ally,enemy]=teams.children;ally?.classList.add('shell-allies');enemy?.classList.add('shell-enemies');}
 const log=$('.battle-details',p),cmd=$('.combat-duo > .battle-command',p);if(log&&cmd){const lines=$$('.log p',log).slice(-3);const feed=mk('div','shell-battle-feed');feed.setAttribute('aria-hidden','true');for(const l of lines)feed.append(mk('p','',l.textContent));if(lines.length)cmd.before(feed);}
 const cur=$('.battle-order li.current',p);if(cur){const id=cur.dataset.actorId;const row=id&&$('.combatant-row[data-actor-id="'+CSS.escape(id)+'"]',p);row?.classList.add('shell-acting');}
 // Level beside an enemy's name and a coloured mark for the element on each fighter, as in the original.
 const b=game.s.runtime;if(b){for(const row of $$('.combatant-row[data-actor-id]',p)){const a=b.actors.find(x=>x.id===row.dataset.actorId);if(!a)continue;
  const name=$('.combatant-copy strong',row);if(a.side==='ENEMY'&&a.level&&name&&!$('.shell-level',name))name.prepend(mk('small','shell-level','Lv.'+a.level));
  // 0.14.11: the element on a fighter is a labelled badge on the card (it was a small dot after the name).
  const aura=AURA[a.aura]||AURA[String(a.aura||'').toUpperCase()];$(':scope > .shell-aura-badge',row)?.remove();
  if(aura){row.dataset.aura=aura;const badge=mk('span','shell-aura-badge aura-'+aura,AURA_LABEL[aura]+' 부착');badge.title=AURA_LABEL[aura]+' 원소가 붙어 있습니다';row.append(badge);}else delete row.dataset.aura;}
  const order=$('.battle-order',p);if(order)for(const li of $$('li[data-actor-id]',order)){const a=b.actors.find(x=>x.id===li.dataset.actorId);if(a&&a.hp<=0)li.classList.add('down');}}
 // Skill buttons: a round glyph (E/Q, attack, guard or a card), and the turns left on a cooldown.
 for(const btn of $$('.battle-cards button[data-card-id]',p)){
  let glyph=$('.skill-key',btn);if(glyph)glyph.classList.add('shell-card-glyph');
  else{const id=btn.dataset.cardId;glyph=mk('span','shell-card-glyph');glyph.setAttribute('aria-hidden','true');glyph.append(icon(id==='PLAYER_BASIC_ATTACK'?'SWORD':id==='PLAYER_BASIC_GUARD'?'SHIELD':'DIAMOND'));btn.prepend(glyph);}
  const m=(btn.querySelector('small')?.textContent||'').match(/(\d+)\s*차례/);if(btn.disabled&&m)btn.dataset.cd=m[1];
  if(btn.classList.contains('skill-q'))btn.closest('.battle-card-choice')?.classList.add('shell-burst');
 }
}
const AURA={'불':'pyro','물':'hydro','얼음':'cryo','번개':'electro','바람':'anemo','바위':'geo','풀':'dendro',PYRO:'pyro',HYDRO:'hydro',CRYO:'cryo',ELECTRO:'electro',ANEMO:'anemo',GEO:'geo',DENDRO:'dendro'};
const AURA_LABEL={pyro:'불',hydro:'물',cryo:'얼음',electro:'번개',anemo:'바람',geo:'바위',dendro:'풀'};
function layoutMenu(key,content,p){
 content.classList.add('shell-menu');setBackdrop(mapBackground());
 const {head}=pageHead(key,p);
 const body=mk('div','shell-page-body');
 const rest=[...p.children].filter(c=>c!==head);
 const fn=MENU_LAYOUT[key]||genericBody;
 p.replaceChildren(head,body);fn(body,rest,head,key);
 p.classList.add('shell-page','shell-page-'+key.toLowerCase());
}
function genericBody(body,nodes,head,key){
 const h2s=nodes.filter(n=>n.tagName==='H2');
 if(h2s.length>=2&&!isMobile()){const groups=sectionsByHeading(nodes,'기본');const t=tabset('PAGE_'+key,groups.map((g,i)=>({id:'s'+i+':'+g.label,label:g.label,nodes:g.nodes})),'shell-page-tabs vertical');if(t){body.append(t);return;}}
 if(h2s.length>=2){const groups=sectionsByHeading(nodes,'기본');const t=tabset('PAGE_'+key,groups.map((g,i)=>({id:'s'+i+':'+g.label,label:g.label,nodes:g.nodes})),'shell-page-tabs');if(t){body.append(t);return;}}
 body.append(...nodes);
}
const MENU_LAYOUT={
 PARTY(body,nodes,head){
  const intro=nodes.find(n=>n.matches('p.muted'));if(intro){intro.classList.add('shell-page-intro');head.querySelector('.shell-page-words')?.append(intro);}
  const links=nodes.filter(n=>n.matches('.recruitment-link')||(n.tagName==='BUTTON'&&!n.classList.contains('shell-back')));for(const l of links)head.querySelector('.shell-page-tools')?.prepend(l);
  const groups=classify(nodes.filter(n=>n!==intro&&!links.includes(n)),[{name:'team',sel:['.formation-grid']},{name:'plan',sel:['.formation-choice','.formation-line']}],'plan');
  body.classList.add('shell-cols','party-cols');body.append(region('shell-col-main',groups.get('team')),region('shell-col-side',groups.get('plan')));
 },
 STATUS(body,nodes,head){
  const intro=nodes.find(n=>n.matches('p.muted'));if(intro){intro.classList.add('shell-page-intro');head.querySelector('.shell-page-words')?.append(intro);}
  const links=nodes.find(n=>n.matches('.gear-links'));if(links)head.querySelector('.shell-page-tools')?.prepend(links);
  const members=nodes.find(n=>n.matches('.gear-members'));const books=nodes.filter(n=>n.matches('.gear-books'));const rest=nodes.filter(n=>n!==intro&&n!==links&&n!==members&&!books.includes(n));
  body.classList.add('shell-cols','gear-cols');
  if(members){const cards=[...members.children].filter(c=>c.matches('.gear-member'));
   // Like the character screen of the original: the selected member's art fills the middle, details on the right.
   const splash=mk('div','shell-splash');splash.setAttribute('aria-hidden','true');
   const paint=c=>{const src=$('img.gear-portrait',c)?.getAttribute('src');splash.replaceChildren();splash.classList.toggle('empty',!src);if(src){const img=mk('img');img.src=src;img.alt='';img.decoding='async';splash.append(img);}else splash.append(mk('span','shell-splash-mark','✧'));};
   if(cards.length>1){const list=mk('div','shell-roster');list.setAttribute('role','tablist');list.setAttribute('aria-label','파티원');let cur=Math.min(S.gearIndex||0,cards.length-1);
    const show=(i,user)=>{if(user&&S.gearIndex!==i)sound('tab');S.gearIndex=i;cards.forEach((c,j)=>{c.hidden=j!==i;});[...list.children].forEach((b,j)=>{b.setAttribute('aria-selected',String(j===i));b.classList.toggle('active',j===i);});paint(cards[i]);};
    cards.forEach((c,i)=>{const b=mk('button','shell-roster-item');b.type='button';b.setAttribute('role','tab');const face=$('.gear-portrait',c);const pic=face?face.cloneNode(true):mk('span','gear-portrait portrait-placeholder','✧');pic.classList.add('shell-roster-face');b.append(pic,mk('span','',$('h2',c)?.textContent||'파티원'));b.onclick=()=>show(i,true);list.append(b);});
    show(cur);body.append(region('shell-col-roster',[list]));}
   else if(cards[0])paint(cards[0]);
   body.append(region('shell-col-main gear-stage',[splash,members,...rest]));}
  else body.append(region('shell-col-main',rest));
  if(books.length)body.append(region('shell-col-side',books));
 },
 INVENTORY(body,nodes,head){
  const tabs=nodes.find(n=>n.matches('.bag-tabs'));if(tabs){tabs.classList.add('shell-subtabs');head.append(tabs);}
  // 0.15.1: 거래 가능 · 거래 불가 sits under the kinds, not in the side tabs.
  const trade=nodes.find(n=>n.matches('.bag-trade-filter'));if(trade){trade.classList.add('shell-subtabs');head.append(trade);}
  const layout=nodes.find(n=>n.matches('.bag-layout'));const extra=nodes.filter(n=>n!==tabs&&n!==layout&&n!==trade);
  body.classList.add('shell-cols','bag-cols');if(layout)body.append(region('shell-col-main',[layout]));
  if(extra.length){const t=tabset('BAG_SIDE',[{id:'artifacts',label:'성유물',nodes:extra.filter(n=>n.matches('.artifact-inventory'))},{id:'tools',label:'전투 도구',nodes:extra.filter(n=>n.matches('.tool-preparation'))},{id:'more',label:'기타',nodes:extra.filter(n=>!n.matches('.artifact-inventory,.tool-preparation'))}],'shell-bag-side');if(t){for(const d of $$('details',t))d.open=true;body.append(region('shell-col-side',[t]));}}
 },
 QUEST(body,nodes,head){
  const obj=nodes.filter(n=>n.matches('.main-objective,.next-chapter,.pinned-objective'));const tabs=nodes.find(n=>n.matches('.journal-tabs'));if(tabs){tabs.classList.add('shell-subtabs');head.append(tabs);}
  const rest=nodes.filter(n=>!obj.includes(n)&&n!==tabs);
  body.classList.add('shell-cols','quest-cols');body.append(region('shell-col-side quest-track',obj),region('shell-col-main quest-list',rest));
 },
 RELATIONS(body,nodes){body.classList.add('relations-body');body.append(...nodes);},
 SHOP(body,nodes,head){
  const tools=head.querySelector('.shell-page-tools'),words=head.querySelector('.shell-page-words');
  const crumb=nodes.find(n=>n.matches('.place-breadcrumb'));if(crumb){for(const b of [...crumb.querySelectorAll(':scope > button')].reverse())tools?.prepend(b);const where=crumb.querySelector('p');if(where){where.classList.add('shell-page-intro');words?.append(where);}}
  const tabs=nodes.find(n=>n.matches('.market-tabs'));if(tabs){tabs.classList.add('shell-subtabs');head.append(tabs);}
  const filter=nodes.find(n=>n.matches('.market-filter')),layout=nodes.find(n=>n.matches('.market-layout'));
  const notes=nodes.filter(n=>n.matches('p.muted')),rest=nodes.filter(n=>![crumb,tabs,filter,layout].includes(n)&&!notes.includes(n));
  if(filter&&notes.length){const hint=notes.at(-1);hint.classList.add('shell-hint');filter.append(hint);}
  body.classList.add('shell-cols','shop-cols');if(!layout){body.append(...nodes.filter(n=>n!==crumb&&n!==tabs));return;}
  const main=region('shell-col-main shop-main',[filter,layout].filter(Boolean));
  // 0.14.11: a shop that also introduces companion missions (디어 헌터 식당, 만민당, 불복려…) shows them as their own
  // tab; squeezed under the goods they made a short box with a very long scroll.
  const stories=rest.filter(n=>n.matches?.('section.contact-stories'));
  if(stories.length){
   const count=stories.reduce((n,s)=>n+s.querySelectorAll(':scope > section.card').length,0),others=rest.filter(n=>!stories.includes(n)&&!n.matches?.('.contact-entry-link')),storyNodes=[];
   for(const s of stories){const cards=[...s.children].filter(n=>n.matches('section.card')),top=mk('div','shell-place-notes'),grid=mk('div','shell-place-grid');top.append(...[...s.children].filter(n=>!cards.includes(n)));grid.append(...cards);storyNodes.push(top,grid);}
   const t=tabset('SHOP:'+(game.s.placeVisit?.place||''),[{id:'shop',label:'상점',icon:'SHOP',nodes:[main]},{id:'stories',label:'동료 영입 임무',badge:String(count),icon:'PARTY',nodes:storyNodes},{id:'more',label:'그 밖',icon:'DOT',nodes:others}],'shell-shop-tabs');
   body.classList.remove('shell-cols');body.classList.add('shop-with-stories');body.append(t);return;
  }
  body.append(main);
  if(rest.length){body.classList.add('with-side');body.append(region('shell-col-side',rest));}
 },
 SYSTEM(body,nodes,head,key){
  // Plain names for the online layer's buttons and screen names (가방, not 아이템).
  for(const n of nodes){for(const b of [n,...(n.querySelectorAll?.('button')||[])])if(b.tagName==='BUTTON'&&!b.children.length&&RELABEL[b.textContent.trim()])b.textContent=relabel(b.textContent);
   if(n.tagName==='P'&&n.textContent.includes('·아이템·'))n.textContent=n.textContent.replace('·아이템·','·가방·');}
  // The display rows are appended after the sound section by the settings code; put them back under 표시 설정.
  const displayHead=nodes.find(n=>n.tagName==='H2'&&/표시 설정/.test(n.textContent));
  if(displayHead){const rows=nodes.filter(n=>n.matches?.('label.settings-row')&&/성인 모드|글자 크기|화면 크기|인물 일러스트/.test(n.textContent));for(const r of rows)nodes.splice(nodes.indexOf(r),1);nodes.splice(nodes.indexOf(displayHead)+1,0,...rows);}
  const groups=sectionsByHeading(nodes,'계정·저장');const t=tabset('PAGE_SYSTEM',groups.map((g,i)=>({id:'s'+i+':'+g.label,label:g.label,nodes:g.nodes})),'shell-page-tabs'+(isMobile()?'':' vertical'));if(t)body.append(t);else body.append(...nodes);void key;}
};
// Battle results: a banner, the rewards as tiles, and the next steps as large buttons at the bottom.
function layoutReward(content,p){
 content.classList.add('shell-result-screen');setBackdrop(mapBackground());
 let r={};try{r=JSON.parse(game.s.global.LAST_BATTLE_RESULT_JSON||'{}');}catch{}
 const kids=[...p.children],h1=kids.find(c=>c.tagName==='H1');
 const banner=mk('header','shell-result-banner');banner.append(mk('small','',r.victory?'VICTORY':'BATTLE END'));if(h1)banner.append(h1);else banner.append(mk('h1','',r.victory?'전투 승리':'전투 종료'));
 const actions=mk('div','shell-result-actions');
 for(const c of kids){if(c===h1)continue;if(c.tagName==='BUTTON')actions.append(c);else if(c.matches?.('.actions')&&!c.closest('.card'))actions.append(...c.children);}
 const rest=kids.filter(c=>c!==h1&&c.parentNode===p);
 const body=mk('div','shell-result-body');body.append(...rest);
 p.replaceChildren(banner,body,actions);p.classList.add('shell-result',r.victory?'victory':'defeat');
 if(r.victory&&content.classList.contains('shell-screen-enter'))sound('item_receive');
}
function layoutGeneric(key,content,p){
 content.classList.add('shell-plain');setBackdrop(mapBackground());
 if(p.classList.contains('shell-page'))return;
 const {head}=pageHead(key,p,{title:''});const body=mk('div','shell-page-body');const rest=[...p.children].filter(c=>c!==head);p.replaceChildren(head,body);genericBody(body,rest,head,key);p.classList.add('shell-page','shell-page-'+String(key).toLowerCase());
 if(!head.querySelector('.shell-h1')?.textContent)head.classList.add('untitled');
}
// ---------- main hook ----------
const priorRender=render;
render=function(){
 priorRender();
 try{shell();}catch(e){console.error('[shell]',e);}
};
function shell(){
 const body=document.body;
 if(!game||!$('#root > main')){body.classList.remove('teyvat','shell-mobile');delete body.dataset.shellScreen;delete body.dataset.mode;S.screen=null;setBackdrop(null);if(S.menu)toggleMenu(false);if(S.scenery)toggleScenery(false);$$('.hud-guide-pop').forEach(n=>n.remove());return;}
 body.classList.add('teyvat');S.mobile=isMobile();body.classList.toggle('shell-mobile',S.mobile);
 const key=screenKey(),main=$('#root > main'),aside=$(':scope > aside',main),content=$(':scope > .content',main),p=content&&[...content.children].find(c=>c.classList.contains('panel'));
 if(S.scenery&&!WORLD_SCREENS.has(key))toggleScenery(false);
 if(S.screen!==key){S.screen=key;if(content)content.classList.add('shell-screen-enter');}
 body.dataset.shellScreen=key;body.dataset.phase=game.playPhase?.()||'';
 if(aside)buildHUD(aside,key);
 placeGuide();
 if(!content||!p)return;
 content.classList.add('shell-content');
 let mode='plain';
 if(key==='COMBAT'){mode='battle';layoutCombat(content,p);}
 else if(key==='LOCATION'||key==='HUB'||key==='MAIN_MENU'){mode='world';layoutLocation(content,p);}
 // 0.14.11: a facility you talk in (guild, tavern, offices, statues) has its own page (app_places_v01411.js).
 else if(key==='DIALOGUE'&&game.s.placeVisit&&S.placeLayout&&$(':scope > .place-breadcrumb',p)){mode='menu';S.placeLayout(content,p);}
 else if(['STORY','STORY_WAIT','COMBAT_INTERLUDE','DIALOGUE'].includes(key)&&$('.story-layout,.story,.choice,.story-copy',p)){mode='story';layoutStory(content,p);}
 else if(key==='REWARD'&&$('h1',p)){mode='battle';layoutReward(content,p);}
 else if(MENU_SCREENS.has(key)){mode='menu';layoutMenu(key,content,p);}
 else layoutGeneric(key,content,p);
 if(mode!=='story')clearTimeout(S.autoTimer);
 body.dataset.mode=mode;
}
S.relayout=shell;
// ---------- hotkeys ----------
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.ctrlKey||e.metaKey||e.altKey||!game)return;
 const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)||e.target?.isContentEditable;
 const dialog=$('dialog[open]');
 if(S.scenery){if(e.key==='Escape'||e.key.toLowerCase()==='v'){e.preventDefault();toggleScenery(false);}return;}
 if(e.key==='Escape'){if(dialog||typing)return;if(window.CRPGHandbook?.isOpen?.()){e.preventDefault();CRPGHandbook.close();return;}if(window.CRPGTrade?.isOpen?.()){e.preventDefault();CRPGTrade.close();return;}if(window.CRPGChat?.open){e.preventDefault();CRPGChat.toggle(false);return;}if(S.menu){e.preventDefault();toggleMenu(false);return;}const back=$('.shell-back');if(back&&!back.disabled&&!e.repeat){e.preventDefault();back.click();return;}e.preventDefault();toggleMenu(true);return;}
 if(typing||dialog||S.menu||e.repeat)return;
 if(e.key==='F1'){e.preventDefault();window.CRPGHandbook?.open();return;}
 if(window.CRPGHandbook?.isOpen?.())return;
 const k=e.key.toLowerCase(),screen=S.screen;
 if(screen==='COMBAT')return; // combat keys belong to the battle screen (E/Q select a skill)
 if(k==='m'){e.preventDefault();openMap();return;}
 if(k==='v'&&WORLD_SCREENS.has(screen)){e.preventDefault();toggleScenery(true);return;}
 if(HOTKEYS[k]){e.preventDefault();const target=HOTKEYS[k];if(S.screen===target&&target!=='STORY')openScreen(game.s.runtime?'STORY':'LOCATION');else openScreen(target);return;}
 const onButton=e.target?.closest?.('button,a,summary');
 if(['STORY','STORY_WAIT','COMBAT_INTERLUDE','DIALOGUE'].includes(screen)){
  if((e.key===' '||e.key==='Enter'||k==='f')&&!onButton){const b=continueButton($('.content .panel')||document);if(b&&!b.disabled&&!busy){e.preventDefault();b.click();}return;}
  if(/^[1-9]$/.test(e.key)){const c=$$('.content .choice')[Number(e.key)-1];if(c&&!c.disabled&&!busy){e.preventDefault();c.click();}}
 }
});
// Keep the HUD sound icon honest when the quick actions change without a render.
try{const q=$('#quick-actions');if(q)new MutationObserver(()=>{if(!game)return;const snd=quickButton(b=>b.dataset.audioToggle==='true'),tool=$('main > aside .hud-tools .hud-tool[title]:not(.hud-menu-button):not(.hud-handbook)+.hud-tool');void tool;const holder=$$('main > aside .hud-tools .hud-tool').find(b=>/소리/.test(b.title));if(snd&&holder){const on=/끄기/.test(snd.textContent);holder.title=relabel(snd.textContent);holder.setAttribute('aria-label',relabel(snd.textContent));holder.replaceChildren(icon(on?'SOUND':'MUTE'));}}).observe(q,{childList:true,subtree:true,characterData:true});}catch{}
// The bag's detail opens with the item itself: a large icon on its tier colour and its stars.
if(typeof itemDetailView==='function'){const priorDetail=itemDetailView;itemDetailView=function(box,d){priorDetail(box,d);try{const rank=Math.max(1,Math.min(5,d?.tier?.rank||1)),hero=mk('div','shell-item-hero tier-'+rank);hero.append(typeof itemGlyph==='function'?itemGlyph(d):mk('span','item-glyph','◆'),mk('span','shell-item-stars','★'.repeat(rank)));box.prepend(hero);}catch{}};}
// Settings (title screen and in game) end with what this project is, and where the original lives.
// 효과음 고르기: every sound is a Genshin recording with one or more candidates; pressing a candidate plays it and
// keeps it.
function soundGallery(){
 // 0.15.1: folded until opened (user: 「설정 부분에 효과음 고르기 너무 길어서 접어놔」).
 const SND=window.CRPGSound,gallery=mk('details','card shell-sound-gallery'),sum=mk('summary','shell-sound-summary');sum.append(mk('strong','','효과음 고르기'),mk('small','','눌러서 펼치기 · 소리마다 후보를 들어 보고 고릅니다'));
 gallery.append(sum,mk('p','muted','효과음은 원신 본편 녹음과 공식 웹 이벤트 소리입니다(「이전」·「새로 만든」이라고 적힌 것은 이 게임에서 만든 소리). 후보를 누르면 바로 들리고 그 소리로 정해집니다. 고른 소리는 이 기기에 저장됩니다.'));
 const groups=[['전투 결과',[['승리','victory'],['패배','defeat']]],
  ['결과·보상',[['레벨업','level_up'],['임무 완료','quest_complete'],['의뢰 수락','commission_accept'],['의뢰 완료','commission_complete'],['획득','item_receive'],['해금','unlock'],['장착 (장비)','equip'],['장착 (성유물)','equip_artifact'],['요리 완료','cook_complete'],['단조 완료','forge_complete'],['합성 완료','craft_complete']]],
  ['전투',[['전투 시작','battle_start'],['타격 (검·창)','hit'],['활 공격','bow_hit'],['츄츄족 공격','hili_hit'],['슬라임 공격','slime_hit'],['방어 (피격)','guard'],['회복','heal'],['츄츄족 조우','encounter_hilichurl']]],
  ['원소',[['불','fire'],['물','water'],['얼음','ice'],['번개','lightning'],['바람','wind'],['바위','rock'],['풀','dendro']]],
  ['원소 반응',[['융해','melt'],['증발','vaporize'],['과부하','overload'],['빙결','freeze']]],
  ['메뉴',[['버튼','click'],['마우스 올림','hover'],['탭','tab'],['선택지','choice'],['알림','toast'],['메뉴 열기','menu_open'],['메뉴 닫기','menu_close'],['쪽 넘김','page'],['핸드북','handbook_open'],['이동','travel'],['안 될 때','error']]],
  ['기원·운명의 자리',[['기원 화면 열기','wish_open'],['기원 버튼','wish_click'],['유성 (3★)','wish_3'],['유성 (4★)','wish_4'],['유성 (5★)','wish_5'],['결과 등장 (3★)','wish_reveal3'],['결과 등장 (4★)','wish_reveal4'],['결과 등장 (5★)','wish_reveal5'],['결과 목록','wish_result'],['결과에서 돌아가기','wish_return'],['기원 화면 닫기','wish_close'],['운명의 자리 활성화','constellation'],['운명의 자리 열기','constellation_open'],['운명의 자리 고르기','constellation_node']]]];
 for(const [title,list]of groups){const box=mk('div','shell-sound-group');box.append(mk('h4','',title));
  for(const [label,id]of list){const options=SND.options?.(id)||[];if(!options.length)continue;
   const row=mk('div','shell-sound-pick variants'),pick=mk('div','shell-sound-variants'),mark=()=>{for(const x of pick.children)x.classList.toggle('active',x.dataset.which===SND.choice(id));};
   row.append(mk('span','shell-sound-name',label));
   for(const [which,text]of options){const b=mk('button','shell-sound-opt',text);b.type='button';b.dataset.which=which;b.title=options.length>1?'눌러서 듣고 이 소리로 정하기':'눌러서 듣기';b.onclick=()=>{SND.setChoice(id,which);mark();SND.audition(id,which);};pick.append(b);}
   const stop=mk('button','shell-sound-chip','■');stop.type='button';stop.title='멈춤';stop.setAttribute('aria-label',label+' 멈춤');stop.onclick=()=>SND.stopAudition?.();mark();row.append(pick,stop);box.append(row);}
  gallery.append(box);}
 return gallery;
}
if(typeof settingsControls==='function'){const priorSettings=settingsControls;settingsControls=function(p){priorSettings(p);try{
 // 화면 크기 (PC frame only): how much page the frame shows, read by the frame host in index.html.
 if(document.documentElement.classList.contains('crpg-framed')){
  const row=mk('label','settings-row shell-ui-scale'),copy=mk('div','copy'),select=mk('select'),hint=mk('small','shell-ui-scale-hint');
  copy.append(mk('p','','화면 크기'),mk('small','','컴퓨터에서 게임 화면 전체의 크기입니다. 작게 할수록 한 화면에 더 많이 보입니다.'),hint);
  // Each choice shows what it gives in this window: a small window cannot grow the game and a huge one has a limit.
  const NAMES=[['small','작게'],['normal','보통'],['large','크게']];
  const measure=n=>{try{return window.parent.CRPGFrameMeasure?.(n)||null;}catch{return null;}};
  const label=()=>{const m=Object.fromEntries(NAMES.map(([v])=>[v,measure(v)])),pct=x=>Math.round(x.s*100);
   for(const o of select.options){const name=NAMES.find(n=>n[0]===o.value)[1];o.textContent=m[o.value]?name+' · '+pct(m[o.value])+'%':name;}
   const cur=m[select.value];if(!cur){hint.textContent='';return;}
   let t='지금 창에서는 '+pct(cur)+'% 크기로 보입니다.';
   if(m.large&&m.normal&&pct(m.large)===pct(m.normal))t+=' 창이 작아 「크게」로 더 키울 수 없습니다. 창을 넓히거나 글자 크기를 올려 보세요.';
   else if(m.small&&m.normal&&pct(m.small)===pct(m.normal))t+=' 창이 아주 커서 「작게」로 더 줄일 수 없습니다.';
   hint.textContent=t;};
  for(const [v,t]of NAMES){const o=mk('option','',t);o.value=v;select.append(o);}
  select.value=['small','large'].includes(settings.uiScale)?settings.uiScale:'normal';label();
  select.onchange=()=>{settings.uiScale=select.value;persistSettings();try{window.parent.CRPGFrameFit?.();}catch{}label();};
  row.append(copy,select);
  const font=[...p.querySelectorAll('label.settings-row')].find(r=>/글자 크기/.test(r.textContent));
  if(font)font.after(row);else p.prepend(row);
 }
}catch{}try{
 // The sound credits say where the sounds come from, and the gallery follows the sound section.
 for(const n of p.querySelectorAll('p.muted'))if(/공식 웹 이벤트 원소 효과음/.test(n.textContent))n.textContent='원신 OST · 지역별 순환 재생 · 효과음은 원신 본편 녹음과 공식 웹 이벤트 소리를 씁니다(「이전」·「새로 만든」이라고 적힌 전투 시작·타격·풀 소리는 이 게임에서 만든 소리). 아래 「효과음 고르기」에서 소리마다 후보를 들어 보고 바꿀 수 있습니다.';
 const credit=[...p.querySelectorAll('a')].find(a=>/genshin-sfx\/CREDITS/.test(a.getAttribute('href')||''));
 if(credit&&window.CRPGSound){const note=credit.nextElementSibling?.matches?.('.choice-note')?credit.nextElementSibling:credit;note.after(soundGallery());}
}catch{}try{const head=mk('h2','','정보'),note=mk('p','shell-disclaimer','본 게임은 비영리 비공식 팬 프로젝트이며 HoYoverse의 공식 게임이 아닙니다. 원신 및 관련 캐릭터, 음악, 이미지 등의 권리는 각 권리자에게 있습니다. 권리자의 요청이 있는 경우 해당 콘텐츠는 즉시 제거 또는 교체될 수 있습니다.'),link=mk('a','shell-official','원신 공식 홈페이지 바로가기');link.href='https://genshin.hoyoverse.com/ko/';link.target='_blank';link.rel='noopener noreferrer';p.append(head,note,link);}catch{}};}
// 0.15.1: the original currency pictures (모라, 원석 …) wherever a reward shows one, instead of a ◈ or ✧ glyph
// (user: 「모라도 이제 아이콘 좀 쓰고… 획득한 보상에 마름모만 있는 거 보기 좀 그렇다」).
window.currencyIcon=function(key,cls='cur-icon'){const p=(window.CRPG_MANIFEST||{}).itemIcons?.icons?.['CUR_'+key]?.path;if(!p)return null;const i=document.createElement('img');i.className=cls;i.src=p;i.alt='';i.draggable=false;return i;};
// 0.15.1: the fan-project notice also sits at the bottom of the title (login) screen, which app_online.js draws.
const LEGAL='본 게임은 비영리 비공식 팬 프로젝트이며 HoYoverse의 공식 게임이 아닙니다. 원신 및 관련 캐릭터, 음악, 이미지 등의 권리는 각 권리자에게 있습니다. 권리자의 요청이 있는 경우 해당 콘텐츠는 즉시 제거 또는 교체될 수 있습니다.';
const titleLegal=()=>{for(const t of document.querySelectorAll('section.game-title:not(.has-legal)')){t.classList.add('has-legal');t.append(mk('p','title-legal',LEGAL));}};
new MutationObserver(titleLegal).observe(document.body,{childList:true,subtree:true});titleLegal();
// Formation and role effects are runtime statuses without a table row; name them instead of "알 수 없는 항목".
if(typeof safeName==='function'){const priorSafeName=safeName;safeName=function(table,id,col=1){if(table==='13_STATUS_EFFECT_DB'){if(id==='FORMATION')return '진형 효과';if(id==='ROLE')return '역할 효과';}return priorSafeName(table,id,col);};}
})();
