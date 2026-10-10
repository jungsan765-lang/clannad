/* 0.15.24 설치해서, 가로로 (docs/handoffs/UI_INSTALLED_LANDSCAPE_KO.md: 「휴대폰 홈페이지에서 그대로 플레이하는 방향을 중단한다.
 * 설치해서 실행하는 형태를 요구하고 가로 화면을 기준으로 UI를 전면 개편한다 … 설치 안내와 설치 후 실행 흐름, 세로로 들었을 때 가로
 * 회전을 요구하는 화면까지」). On a phone:
 *  - in a browser tab the game does not open: a full-screen guide installs it first. Android browsers that offer their own
 *    install prompt get a 「설치하기」 button (beforeinstallprompt); others get the steps of their menu. iPhone browsers have no
 *    install prompt for pages: Share → 홈 화면에 추가. A chat app's built-in browser cannot install at all, so it is sent
 *    to Chrome/Safari first (KakaoTalk and LINE can open the page outside; other Android apps through a Chrome intent).
 *  - opened from the home-screen icon the game runs sideways: the manifest asks Android for landscape, the page asks to
 *    lock it where the browser allows (Android, installed or full screen), and an upright phone shows 「가로로 돌려 주세요」
 *    until it is turned. iPhone web apps cannot lock the screen, so its rotation lock has to be off.
 * Tablets and desktop browsers keep playing in the browser. `?display=app` opens the installed layout in a browser tab,
 * for testing only. Load after app_install_v0157.js. */
(function(){'use strict';
const I=window.CRPGInstall;if(!I||typeof render!=='function')return;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const media=q=>{try{return !!window.matchMedia?.(q).matches;}catch{return false;}};
const ua=()=>String(navigator.userAgent||'');
const ios=()=>/iPad|iPhone|iPod/.test(ua())||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const android=()=>/Android/i.test(ua());
const iosSafari=()=>ios()&&!/CriOS|FxiOS|EdgiOS|OPiOS|Whale/i.test(ua());
const samsung=()=>/SamsungBrowser/i.test(ua());
const kakao=()=>/KAKAOTALK/i.test(ua());
const line=()=>/\bLine\//.test(ua());
// Chat and social apps open links in their own browser, which cannot install a page (Android WebView: "; wv)").
const inApp=()=>/KAKAOTALK|Discord|Instagram|FBAN|FBAV|\bLine\/|NAVER\(inapp|everytimeApp|Twitter|DaumApps|; wv\)/i.test(ua());
const query=()=>{try{return new URLSearchParams(window.location?.search||'');}catch{return null;}};
const testApp=()=>query()?.get('display')==='app';
// A phone: the 0.15.7 touch test, and a short side of a phone (tablets are 600 px and wider).
const shortSide=()=>{const s=window.screen,a=s?Math.min(s.width||0,s.height||0):0;return a||Math.min(window.innerWidth||0,window.innerHeight||0);};
const isPhone=()=>I.phone()&&shortSide()>0&&shortSide()<600;
const installed=()=>I.standalone()||testApp();
const upright=()=>media('(orientation: portrait)');
I.mustInstall=()=>isPhone()&&!installed();
I.mustRotate=()=>isPhone()&&installed()&&upright();
I.testApp=testApp;
// ---------- the install guide ----------
const SHARE='M12 3v11 M8 7l4-4 4 4 M6 11v8h12v-8';
function glyph(d,cls='gate-glyph'){const ns='http://www.w3.org/2000/svg',s=document.createElementNS?.(ns,'svg');if(!s||!s.setAttribute)return mk('span',cls,'□↑');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('class',cls);s.setAttribute('aria-hidden','true');const p=document.createElementNS(ns,'path');p.setAttribute('d',d);s.append(p);return s;}
function step(...parts){const li=mk('li');for(const x of parts)li.append(typeof x==='string'?document.createTextNode?.(x)||mk('span','',x):x);return li;}
function outsideUrl(){
 const here=String(window.location?.href||'');if(!here)return null;
 if(kakao())return 'kakaotalk://web/openExternal?url='+encodeURIComponent(here);
 if(line())return here+(here.includes('?')?'&':'?')+'openExternalBrowser=1';
 if(android()){const u=new URL(here);return 'intent://'+u.host+u.pathname+u.search+u.hash+'#Intent;scheme='+u.protocol.replace(':','')+';package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(here)+';end';}
 return null;
}
async function copyAddress(button){
 const here=String(window.location?.href||'');let ok=false;
 try{await navigator.clipboard.writeText(here);ok=true;}catch{}
 button.textContent=ok?'주소를 복사했습니다':'주소: '+here;
}
// What this browser can do: the browser's own prompt, its menu steps, or leave the chat app first.
function guide(box){
 const ol=mk('ol','gate-steps'),actions=mk('div','gate-actions');
 if(I.installed){
  box.append(mk('p','gate-done','설치했습니다!'));
  ol.append(step('홈 화면(또는 앱 목록)에서 「원신 CRPG」 아이콘을 누릅니다.'),step('휴대폰을 가로로 들고 플레이합니다. 이 창은 닫아도 됩니다.'));
  box.append(ol);return;
 }
 if(inApp()){
  const browser=ios()?'Safari':'Chrome';
  box.append(mk('p','gate-why','지금은 채팅·SNS 앱 안의 브라우저라 설치할 수 없습니다. '+browser+'에서 열어 주세요.'));
  const out=outsideUrl();
  if(out){const go=mk('button','gate-go',browser+'로 열기');go.type='button';go.onclick=()=>{window.location.href=out;};actions.append(go);}
  ol.append(step('오른쪽 위(또는 아래)의 ⋯ 메뉴에서 「다른 브라우저로 열기」 또는 「'+browser+'로 열기」를 누릅니다.'),step(browser+'에서 열린 이 화면의 안내대로 설치합니다.'));
  const copy=mk('button','gate-copy','주소 복사');copy.type='button';copy.onclick=()=>copyAddress(copy);actions.append(copy);
  box.append(actions,ol);return;
 }
 if(ios()){
  ol.append(iosSafari()?step('주소창 옆 공유 버튼(',glyph(SHARE),')을 누릅니다. 안 보이면 ⋯ 버튼을 먼저 누릅니다.'):step('주소창의 공유 버튼(',glyph(SHARE),')을 누릅니다. 없으면 이 주소를 Safari에서 열어 주세요.'));
  ol.append(step('「홈 화면에 추가」를 누르고, 「웹 앱으로 열기」가 켜진 채로 「추가」를 누릅니다.'),step('홈 화면의 「원신 CRPG」 아이콘으로 실행합니다. 처음 한 번은 다시 로그인해 주세요.'));
  box.append(ol);return;
 }
 if(I.prompt){
  const go=mk('button','gate-go','설치하기');go.type='button';
  go.onclick=async()=>{const p=I.prompt;if(!p)return;I.prompt=null;try{await p.prompt();const choice=await p.userChoice;if(choice?.outcome==='accepted')I.installed=true;}catch{}update(true);};
  actions.append(go);box.append(actions);
  ol.append(step('「설치하기」를 누르고 「설치」를 고릅니다.'),step('홈 화면(또는 앱 목록)의 「원신 CRPG」 아이콘으로 실행합니다.'));
  box.append(ol);return;
 }
 if(samsung())ol.append(step('아래쪽 ≡ 메뉴에서 「현재 페이지 추가」 → 「홈 화면」을 누릅니다.'));
 else ol.append(step('오른쪽 위 ⋮ 메뉴에서 「앱 설치」 또는 「홈 화면에 추가」 → 「설치」를 누릅니다.'));
 ol.append(step('홈 화면(또는 앱 목록)의 「원신 CRPG」 아이콘으로 실행합니다.'));
 box.append(ol,mk('p','gate-hint','이미 설치했다면 홈 화면의 아이콘으로 열어 주세요. 메뉴에 설치가 없으면 Chrome에서 열어 주세요.'));
}
function buildInstall(){
 const card=mk('div','gate-card');
 const icon=mk('img','gate-icon');icon.src='icon-192.png';icon.alt='';card.append(icon,mk('p','gate-kicker','원신 CRPG'));
 const h=mk('h1','',I.installed?'이제 앱으로 실행하세요':'앱으로 설치해서 플레이해요');h.id='crpg-gate-title';card.append(h);
 if(!I.installed)card.append(mk('p','gate-lead','휴대폰에서는 홈 화면에 설치한 앱으로, 가로 화면으로 플레이합니다. 주소창 없이 화면을 넓게 씁니다.'));
 guide(card);
 card.append(mk('p','gate-note','설치해도 계정과 진행은 그대로입니다.'));
 return card;
}
// ---------- the rotate screen ----------
function buildRotate(){
 const card=mk('div','gate-rotate'),phone=mk('div','gate-phone');phone.setAttribute('aria-hidden','true');phone.append(mk('i'));
 const h=mk('h1','','가로로 돌려 주세요');h.id='crpg-gate-title';
 card.append(phone,h,mk('p','','원신 CRPG는 휴대폰을 가로로 들고 플레이합니다.'));
 card.append(mk('small','',ios()?'돌려도 화면이 그대로라면 제어 센터에서 자물쇠 모양의 「화면 세로 방향 고정」을 꺼 주세요.':'돌려도 화면이 그대로라면 빠른 설정에서 「자동 회전」을 켜 주세요.'));
 return card;
}
// ---------- showing it ----------
let gate=null,shown='';
function raise(){if(!gate)return;try{if(gate.matches?.(':popover-open'))gate.hidePopover();gate.showPopover?.();}catch{}}
function update(force=false){
 const want=I.mustInstall()?'install':I.mustRotate()?'rotate':'';
 const root=document.documentElement;root?.classList?.toggle('crpg-gate-install',want==='install');root?.classList?.toggle('crpg-gate-rotate',want==='rotate');
 const app=document.getElementById?.('root');if(app&&'inert' in app)app.inert=!!want;
 const key=want+'|'+(I.prompt?1:0)+'|'+(I.installed?1:0);
 if(!want){if(gate){try{gate.hidePopover?.();}catch{}gate.remove?.();}gate=null;shown='';return;}
 if(gate&&shown===key&&!force){return;}
 if(gate)gate.remove?.();
 gate=mk('div','crpg-gate '+want);gate.id='crpg-gate';gate.setAttribute('role','dialog');gate.setAttribute('aria-modal','true');gate.setAttribute('aria-labelledby','crpg-gate-title');gate.setAttribute('popover','manual');
 gate.append(want==='install'?buildInstall():buildRotate());shown=key;document.body?.append(gate);raise();
}
I.updateGate=update;
// Android: ask for landscape where it can be locked (installed or full screen); a refusal is fine, the rotate screen stays.
async function lock(){if(!isPhone()||!installed()&&!document.fullscreenElement)return;try{await window.screen?.orientation?.lock?.('landscape');}catch{}}
I.lockLandscape=lock;
for(const k of ['resize','orientationchange','appinstalled','beforeinstallprompt'])window.addEventListener?.(k,()=>setTimeout(()=>{try{update();lock();}catch{}},0));
try{window.matchMedia?.('(orientation: portrait)').addEventListener?.('change',()=>{update();lock();});}catch{}
document.addEventListener?.('fullscreenchange',()=>lock());
document.addEventListener?.('visibilitychange',()=>{if(document.visibilityState==='visible')lock();});
window.addEventListener?.('pointerdown',()=>lock(),{once:true});
// The guide stays above a window the screen opens later (the tutorial's own layer is hidden by the style sheet meanwhile).
const prior=render;
render=function(...args){const out=prior.apply(this,args);try{update();if(gate&&document.querySelector?.('dialog[open]'))raise();}catch{}return out;};
// First start from the home screen: say where the player is.
try{if(isPhone()&&I.standalone()&&!localStorage.getItem('crpg-app-opened')){localStorage.setItem('crpg-app-opened','1');setTimeout(()=>{try{if(typeof say==='function')say('설치한 앱으로 열었습니다. 휴대폰을 가로로 들고 플레이해 주세요.');}catch{}},600);}}catch{}
try{update();lock();}catch{}
})();
/* 0.15.25 휴대폰 자판 (handoff 「남은 것」 4): with the keyboard up a sideways phone keeps about 150 px. Android shrinks the
   page itself (index.html: interactive-widget=resizes-content), so 100dvh and the fixed windows follow. iOS only shrinks
   the visible area: its top and height go to --vv-top / --vv-h and html.kb-open lets the windows with a text box (chat,
   letters, sign-in, prices) sit inside it, with the box being typed in kept in view. */
(function(){'use strict';
const vv=typeof window!=='undefined'&&window.visualViewport;if(!vv||typeof document==='undefined'||!document.documentElement)return;
const root=document.documentElement;let raf=0;
const typing=()=>{const a=document.activeElement;return !!a&&(a.tagName==='TEXTAREA'||a.isContentEditable||a.tagName==='INPUT'&&!/^(checkbox|radio|range|button|submit|reset|color|file|image)$/i.test(a.type||'text'));};
function sync(){raf=0;const h=Math.round(vv.height),top=Math.max(0,Math.round(vv.offsetTop)),gap=Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop));
 root.style.setProperty('--vv-h',h+'px');root.style.setProperty('--vv-top',top+'px');root.style.setProperty('--kb',gap+'px');
 const open=typing()&&gap>80;root.classList.toggle('kb-open',open);if(open)document.activeElement?.scrollIntoView?.({block:'nearest',inline:'nearest'});}
const later=()=>{if(!raf)raf=requestAnimationFrame(sync);};
vv.addEventListener('resize',later,{passive:true});vv.addEventListener('scroll',later,{passive:true});
document.addEventListener('focusin',later);document.addEventListener('focusout',()=>setTimeout(later,80));sync();
window.CRPGKeyboard={sync};
})();