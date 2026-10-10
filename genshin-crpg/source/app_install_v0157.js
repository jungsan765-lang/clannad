/* 0.15.7 앱처럼 하기 (user: 「휴대폰으로 인게임 들어갈 때 위아래가 잘리는 느낌이 없지 않아서 apk가 필요할 것 같다」 → 「일단 A
 * 해봐」). The game already fits the visible screen (100dvh, the bottom bar above the home indicator); the room a phone loses
 * is the browser's own address and tool bars. Two ways out, no APK:
 *  - 홈 화면에 추가 / 앱 설치: the installed game opens without browser bars (manifest display: fullscreen, standalone as the
 *    fallback). The title screen's 「앱으로 설치」 uses the browser's own install prompt when it offers one (Android Chrome),
 *    otherwise it shows the steps for this browser (iPhone Safari, Samsung Internet, in-app browsers of chat apps).
 *  - 전체 화면: where the browser allows it (Android), a toggle on Paimon's menu and in the install window hides the bars
 *    without installing. iPhone Safari has no full screen for pages, so the toggle is not shown there.
 * Phones only (desktop browsers run the game in the PC frame). Load after app_shell.js and app_online.js. */
(function(){'use strict';
if(typeof render!=='function')return;
const S=window.CRPGShell;
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const I=window.CRPGInstall={prompt:null,installed:false};
const media=q=>{try{return !!window.matchMedia?.(q).matches;}catch{return false;}};
const ua=()=>String(navigator.userAgent||'');
// A touch screen without hover (phones, tablets) or a mobile browser; never a desktop window, however small.
const phone=()=>(media('(pointer: coarse)')&&media('(hover: none)'))||/Android|iPhone|iPad|iPod|Mobile/i.test(ua());
const standalone=()=>media('(display-mode: fullscreen)')||media('(display-mode: standalone)')||navigator.standalone===true;
const ios=()=>/iPad|iPhone|iPod/.test(ua())||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const inApp=()=>/KAKAOTALK|Discord|Instagram|FBAN|FBAV|Line\/|NAVER\(inapp|everytimeApp|Twitter/i.test(ua());
const fullscreenOk=()=>!!(document.fullscreenEnabled&&document.documentElement.requestFullscreen)&&!media('(display-mode: fullscreen)');
const isFull=()=>!!document.fullscreenElement;
I.phone=phone;I.standalone=standalone;I.fullscreenOk=fullscreenOk;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();I.prompt=e;});
window.addEventListener('appinstalled',()=>{I.prompt=null;I.installed=true;try{render();}catch{}});
async function toggleFull(){
 try{if(isFull())await document.exitFullscreen();else await document.documentElement.requestFullscreen({navigationUI:'hide'});}
 catch{note('이 브라우저에서는 전체 화면을 켤 수 없습니다. 홈 화면에 추가해 보세요.');}
}
function note(text){try{if(typeof say==='function')say(text);}catch{}}
// The steps for this browser, when it does not offer its own install prompt.
function steps(){
 if(inApp())return ['지금은 채팅 앱 안의 브라우저라 설치할 수 없습니다.','오른쪽 위(또는 아래) 메뉴에서 「브라우저로 열기」를 눌러 '+(ios()?'사파리':'크롬')+'로 연 뒤 다시 「앱으로 설치」를 눌러 주세요.'];
 if(ios())return ['사파리 아래쪽의 공유 버튼(네모 위 화살표)을 누릅니다.','「홈 화면에 추가」 → 「추가」를 누릅니다.','홈 화면의 「원신 CRPG」 아이콘으로 열면 주소창 없이 열립니다. 처음 한 번은 다시 로그인해 주세요.'];
 if(/SamsungBrowser/i.test(ua()))return ['아래쪽 ≡ 메뉴 → 「현재 페이지 추가」 → 「홈 화면」을 누릅니다.','홈 화면의 「원신 CRPG」 아이콘으로 열면 주소창 없이 열립니다.'];
 return ['오른쪽 위 점 세 개(⋮) 메뉴에서 「앱 설치」 또는 「홈 화면에 추가」를 누릅니다.','홈 화면의 「원신 CRPG」 아이콘으로 열면 주소창 없이 전체 화면으로 열립니다.'];
}
function openInstall(){
 const box=mk('div','install-guide');
 box.append(mk('p','install-lead','홈 화면에 추가하면 브라우저 주소창과 아래 막대 없이 넓은 화면으로 할 수 있습니다. 게임이 바뀌면 저절로 새 판이 열립니다.'));
 if(I.prompt){const go=mk('button','install-go','앱으로 설치하기');go.type='button';go.onclick=async()=>{const p=I.prompt;I.prompt=null;try{await p.prompt();const choice=await p.userChoice;if(choice?.outcome==='accepted'){document.getElementById('modal')?.close();note('설치했습니다. 홈 화면의 「원신 CRPG」 아이콘으로 열어 주세요.');}}catch{}};box.append(go);}
 else{const ol=mk('ol','install-steps');for(const s of steps())ol.append(mk('li','',s));box.append(ol);
  if(!inApp())box.append(mk('small','muted','디스코드·카카오톡 안에서 링크를 열었다면 먼저 메뉴의 「브라우저로 열기」('+(ios()?'사파리':'크롬')+')를 눌러 주세요.'));}
 if(fullscreenOk()){
  const full=mk('button','install-full',isFull()?'전체 화면 끄기':'설치하지 않고 지금 전체 화면으로');full.type='button';
  full.onclick=async()=>{document.getElementById('modal')?.close();await toggleFull();};box.append(full);
  box.append(mk('small','muted','전체 화면은 뒤로 가기(또는 화면 끝에서 쓸기)로 풀립니다.'));
 }
 if(typeof showModal==='function')showModal('앱처럼 하기',box);
}
I.open=openInstall;I.toggleFull=toggleFull;
// The title screen: 「앱으로 설치」 next to 나선비경 랭킹 · 설정 (phones, not already installed).
function decorateTitle(){
 const footer=document.querySelector('.title-footer');if(!footer||footer.querySelector('.title-install'))return;
 if(!phone()||standalone()||I.installed||I.testApp?.())return;
 const b=mk('button','title-install','앱으로 설치');b.type='button';b.onclick=openInstall;footer.append(b);
}
// Paimon's menu: 전체 화면 / 전체 화면 끄기 (where the browser allows it).
S?.menuHooks?.push((box,{close})=>{
 if(!phone()||!fullscreenOk())return;const foot=box.querySelector('.pm-foot');if(!foot)return;
 const b=mk('button','pm-foot-button pm-fullscreen');b.type='button';b.append(S.icon?S.icon('FULLSCREEN'):mk('span'),mk('span','',isFull()?'전체 화면 끄기':'전체 화면'));
 b.onclick=async()=>{close();await toggleFull();};foot.append(b);
});
document.addEventListener('fullscreenchange',()=>{for(const b of document.querySelectorAll('.pm-fullscreen span:last-child'))b.textContent=isFull()?'전체 화면 끄기':'전체 화면';});
const prior=render;
render=function(...args){const out=prior.apply(this,args);try{decorateTitle();}catch{}return out;};
// The first title screen can be drawn before this file loads (the save store opens while later scripts still load),
// so look now and whenever the page changes.
try{decorateTitle();}catch{}
try{new MutationObserver(()=>{try{decorateTitle();}catch{}}).observe(document.body,{childList:true,subtree:true});}catch{}
})();
