/* Online actions commit on the server before combat playback. Local journeys stay separate. */
(function(){
'use strict';
const key='crpg-online-session-v1',pendingKey='crpg-online-pending-v1',pendingAccountsKey='crpg-online-pending-accounts-v2',productionApi='https://genshin-crpg-online.jungsan765.workers.dev',configuredApi=String(window.CRPG_ONLINE_CONFIG?.apiBase||'').trim(),isLocal=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname),base=String(configuredApi||(!isLocal?productionApi:'')).replace(/\/$/,'');
let saved={};try{saved=JSON.parse(localStorage.getItem(key)||'{}');}catch{}
const LOCAL_ONLY_ACTIONS=new Set(['MENU']),KEEP_LOCAL_SCREEN_AFTER_COMMIT=new Set(['PARTY','PARTY_REMOVE','PARTY_REPLACE','PARTY_SWAP','PARTY_TACTIC','EQUIP','UNEQUIP','TOOL_PREPARE','USE_ITEM','FORMATION_SET','MASTERY','EQUIPMENT_GUIDE_ACK']);
const O=window.CRPGOnline={account:saved.account||null,token:saved.token||'',revision:0,ranked:false,active:false,configured:!!base,pending:null};
let uiActions=[],uiStates=[];
O.now=()=>Date.now()+(O.clockOffset||0);
// Saving is opt-out, not opt-in: future gameplay actions (including raid actions) default to an authoritative server commit.
O.savePolicy=type=>LOCAL_ONLY_ACTIONS.has(type)?'LOCAL_UI':'IMMEDIATE_SERVER';
let pendingAccounts={};try{pendingAccounts=JSON.parse(localStorage.getItem(pendingAccountsKey)||'{}');if(!pendingAccounts||Array.isArray(pendingAccounts)||typeof pendingAccounts!=='object')pendingAccounts={};const legacy=JSON.parse(localStorage.getItem(pendingKey)||'null');if(legacy?.account)pendingAccounts[legacy.account]??=legacy;}catch{}
function pendingForAccount(){O.pending=pendingAccounts[O.account?.id]||null;if(O.pending&&LOCAL_ONLY_ACTIONS.has(O.pending.type)){const next={...pendingAccounts};delete next[O.account.id];pendingAccounts=next;O.pending=null;localStorage.setItem(pendingAccountsKey,JSON.stringify(next));localStorage.removeItem(pendingKey);}}
function savePending(value){const id=O.account?.id;if(!id)throw Error('먼저 로그인해 주세요.');const next={...pendingAccounts};if(value)next[id]=value;else delete next[id];localStorage.setItem(pendingAccountsKey,JSON.stringify(next));localStorage.removeItem(pendingKey);pendingAccounts=next;O.pending=value;}
pendingForAccount();
const persist=()=>localStorage.setItem(key,JSON.stringify({account:O.account,token:O.token}));
async function request(path,data){
 if(!base)throw Error('계정 서버에 연결할 수 없습니다. 잠시 뒤 다시 시도해 주세요.');
 const sentAt=Date.now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);let res,out;
 try{
  res=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(O.token?{Authorization:'Bearer '+O.token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)}),cache:'no-store',signal:controller.signal});
  try{out=await res.json();}catch(e){if(e.name==='AbortError')throw e;throw Object.assign(Error('계정 서버 응답을 확인하지 못했습니다. 같은 행동의 저장을 다시 확인해 주세요.'),{transient:true,retryable:true});}
 }catch(e){if(e.transient)throw e;throw Object.assign(Error(e.name==='AbortError'?'서버 응답이 늦어지고 있습니다. 진행 기록은 유지됩니다. 다시 연결해 주세요.':'서버와 연결하지 못했습니다. 연결을 확인한 뒤 다시 시도해 주세요.'),{transient:true,retryable:e.name!=='AbortError'});}finally{clearTimeout(timer);}
 const serverTime=Number(res.headers?.get('X-Server-Time'));if(serverTime>0){const lower=serverTime-Date.now(),upper=serverTime-sentAt;O.clockOffset=Math.max(lower,Math.min(upper,O.clockOffset??lower));}
 if(!res.ok)throw Object.assign(Error(out.error||'요청을 완료하지 못했습니다.'),{status:res.status,code:out.code,version:out.version});return out;
}
function checkVersion(out){if(out.version&&out.version!==MANIFEST.appVersion)throw Object.assign(Error('게임 업데이트를 맞추고 있습니다. 저장 기록은 유지됩니다. 화면 아래 버전 버튼에서 업데이트를 확인해 주세요.'),{code:'VERSION_MISMATCH',version:out.version});}
async function actionRequest(payload){
 try{return await request('/game/action',payload);}
 catch(e){if(!e.retryable)throw e;await new Promise(resolve=>setTimeout(resolve,350));return request('/game/action',payload);}
}
function install(out,{preservePresentation=false}={}){
 checkVersion(out);
 // Construct and validate before replacing the current journey or account metadata.
 let candidate=null;
 if(out.state&&preservePresentation&&game?.s.global.SAVE_ID===out.state.global.SAVE_ID){
  // An acknowledged action changes the save, not the content database. Reuse installed indexes,
  // but validate the whole candidate and restore the previous state atomically on any failure.
  const previous=game.s;try{game.s=out.state;game.s=game.validateSave(out.state);candidate=game;}catch(e){game.s=previous;throw e;}
 }else if(out.state)candidate=new Runtime(DB,out.state);
 O.account=out.account;O.revision=out.revision||0;O.ranked=out.ranked===true;O.active=!!candidate;
 game=candidate;if(candidate){activeSaveSlot=null;applySettings();if(!preservePresentation)restoreUIState();}persist();return out;
}
O.sync=async()=>{const out=await request('/me');install(out);uiActions=[];uiStates=[];pendingForAccount();render();return out;};
function localAction(type,params={}){
 if(type!=='MENU')throw Error('저장하지 않는 화면 행동이 정의되지 않았습니다.');const reason=game.actionReason(type,params);if(reason)throw Error(reason);
 if(uiActions.length>=128)throw Error('서버 기록 동기화 후 화면을 이동해 주세요.');
 if(!uiStates.length)uiStates.push(game.serialize());
 game.apply({type:'MENU',screen:params.screen});
 // Remove only exact state cycles: repeatedly opening menus stays local and bounded,
 // while leaving a shop/place remains in the ordered context sent with the next action.
 const state=game.serialize(),cycle=uiStates.indexOf(state);
 if(cycle>=0){uiActions.length=cycle;uiStates.length=cycle+1;}else{uiActions.push(params.screen);uiStates.push(state);}
 return {ok:true,local:true,screen:game.s.global.SCREEN_MODE};
}
function restoreLocalScreen(screen,type){if(!KEEP_LOCAL_SCREEN_AFTER_COMMIT.has(type)||!screen||!game)return;try{if(!game.actionReason('MENU',{screen}))game.menu(screen);}catch{}}
O.execute=async(type,params)=>{
 if(!O.token||!O.account){game=null;O.active=false;persist();throw Error('로그인 후 게임을 시작해 주세요.');}
 if(!O.active||!game)throw Error('게임 시작 화면에서 계정 여정을 먼저 시작해 주세요.');
 if(LOCAL_ONLY_ACTIONS.has(type)){if(O.pending)throw Error('이전 진행의 저장 확인을 먼저 마쳐 주세요.');return localAction(type,params);}
 const localScreen=game.s.global.SCREEN_MODE;
 let p=O.pending;if(p&&p.account!==O.account.id)throw Error('다른 계정의 미확정 행동이 있습니다. 해당 계정으로 로그인해 주세요.');
 if(!p){p={account:O.account.id,requestId:crypto.randomUUID(),revision:O.revision,version:MANIFEST.appVersion,uiScreen:localScreen,uiActions:uiActions.slice(),type,params};savePending(p);}
 const retryingDifferent=p.type!==type||JSON.stringify(p.params)!==JSON.stringify(params);
 try{const out=await actionRequest({...p,version:MANIFEST.appVersion});install(out,{preservePresentation:true});savePending(null);uiActions=[];uiStates=[];restoreLocalScreen(localScreen,p.type);if(retryingDifferent)throw Object.assign(Error('이전 행동의 저장을 확인했습니다. 방금 선택한 행동은 다시 눌러 주세요.'),{resolved:true});return out.result;}
 catch(e){if(e.status&&e.status<500&&e.status!==429&&e.status!==401&&e.code!=='VERSION_MISMATCH'){savePending(null);if(e.status===409)await O.sync();}if(e.status===401){O.token='';O.active=false;persist();game=null;auth(false,true);}if(e.code==='VERSION_MISMATCH')GameVersion.check();throw e;}
};
const originalStore=storeSave;storeSave=function(){if(O.active){saveFailed=false;lastSaveError='';updateQuick();return Promise.resolve({revision:O.revision});}return originalStore();};
const originalCheckpoint=storeStoryCheckpoint;storeStoryCheckpoint=async snapshot=>{if(!O.active)return originalCheckpoint(snapshot);};
manualSave=()=>say('진행·보상·전투·편성 변경은 자동저장됩니다. 화면 이동만으로는 저장하지 않습니다.');
loadFile=()=>say('저장 파일 가져오기는 공식 여정에서 지원하지 않습니다.');
function field(p,label,type='text',value=''){const l=el('label','form-label',label),input=el('input');input.type=type;input.value=value;l.append(input);p.append(l);return input;}
function select(p,label,rows){const l=el('label','form-label',label),s=el('select');for(const [id,name]of rows){const o=el('option','',name);o.value=id;s.append(o);}l.append(s);p.append(l);return s;}
async function safely(task){if(busy)return;busy=true;render();try{await task();say('');}catch(e){say(e.message);if(e.code==='VERSION_MISMATCH')GameVersion.check();if(e.status===401){O.token='';O.active=false;game=null;persist();auth(false,true);}}finally{busy=false;render();}}
function auth(signup=false,startAfter=false){
 const p=el('form','account-form'),banner=el('div','account-banner'),img=el('img');img.src=assetPath('bg_mondstadt_windrise_day.png')||assetPath('bg_mondstadt_city_day.png');img.alt='';banner.append(img,el('span','','✦  '+(signup?'새로운 인연의 시작':'다시, 모험 속으로')));p.append(banner);
 p.append(el('p','account-intro',signup?'당신의 여정을 담을 계정을 만드세요. 외부 인증은 필요하지 않습니다.':'아이디와 비밀번호를 입력하고, 함께하던 여정을 이어가세요.'));
 if(!base)p.append(el('p','account-service-note','계정 서버에 연결해야 로그인하고 게임을 시작할 수 있습니다.'));
 const u=field(p,'아이디'),pw=field(p,'비밀번호','password');u.autocomplete='username';u.autocapitalize='none';u.spellcheck=false;u.minLength=3;u.maxLength=24;u.required=true;u.placeholder='아이디를 입력하세요';pw.autocomplete=signup?'new-password':'current-password';pw.minLength=8;pw.maxLength=128;pw.required=true;pw.placeholder=signup?'8자 이상 입력하세요':'비밀번호를 입력하세요';
 const confirm=signup?field(p,'비밀번호 확인','password'):null;if(confirm){confirm.autocomplete='new-password';confirm.required=true;confirm.placeholder='비밀번호를 한 번 더 입력하세요';}
 const status=el('p','account-status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');p.append(status);
 const b=button(signup?'계정 만들기':'로그인',()=>{},!base,true);b.type='submit';p.append(b);
 const switcher=button(signup?'이미 계정이 있나요? 로그인':'처음 오셨나요? 계정 만들기',()=>auth(!signup,startAfter));switcher.type='button';switcher.className='account-switch';p.append(switcher);
 p.onsubmit=async e=>{e.preventDefault();if(busy)return;if(confirm&&confirm.value!==pw.value){status.textContent='비밀번호가 서로 다릅니다.';return;}busy=true;b.disabled=true;status.textContent='연결하고 있습니다…';let loggedIn=false;try{const out=await request(signup?'/register':'/login',{username:u.value,password:pw.value});pw.value='';if(confirm)confirm.value='';O.token=out.token;O.account=out.account;O.active=false;pendingForAccount();persist();game=null;document.getElementById('modal').close();say('');loggedIn=true;}catch(err){status.textContent=err.message;}finally{busy=false;b.disabled=!base;render();}if(loggedIn&&startAfter)await startGame();};
 showModal(signup?'회원가입':'로그인',p);
}
async function logout(){
 if(busy)return;
 busy=true;let remote=true;
 try{if(O.token)await request('/logout',{});}catch{remote=false;}
 finally{O.token='';O.account=null;O.active=false;O.pending=null;O.revision=0;O.ranked=false;game=null;selectedNPC=null;activeSaveSlot=null;sceneHistory.length=0;persist();document.getElementById('modal').close();busy=false;render();say(remote?'로그아웃했습니다.':'이 기기에서 로그아웃했습니다. 서버 연결이 끊겨 서버의 로그인 종료는 확인하지 못했습니다.');}
}
function accountPanel(){
 if(!O.account||!O.token){auth();return;}
 const p=el('div');p.append(el('p','',O.account.username+' · '+(O.account.admin?'운영자':'모험가')),el('small','','계정 ID: '+O.account.id));
 p.append(button('로그아웃',logout),button('계정 삭제',()=>{
  const box=el('div');box.append(el('p','','계정, 자동저장, 랭킹 기록이 영구 삭제됩니다. 복구할 수 없습니다.'));
  const user=field(box,'삭제할 아이디'),password=field(box,'비밀번호','password');password.autocomplete='current-password';
  box.append(button('계정과 기록 영구 삭제',()=>safely(async()=>{await request('/account/delete',{confirm:user.value,password:password.value});savePending(null);O.token='';O.account=null;O.active=false;persist();game=null;sceneHistory.length=0;document.getElementById('modal').close();}),false,true));showModal('계정 삭제 확인',box);
 }));showModal('계정 관리',p);
}
async function ranking(){const p=el('div');p.append(el('p','','최고 정복 층 → 누적 소요 라운드 → 입장 횟수 순으로 1~20위만 표시합니다. 운영 도구를 사용한 여정은 집계하지 않습니다.'));showModal('나선비경 · 상위 20위',p);try{const out=await request('/ranking');if(!out.entries.length)p.append(el('p','muted','아직 등록된 정복 기록이 없습니다.'));const table=el('table','ranking-table');const head=el('tr');for(const x of ['순위','모험가','층','라운드','입장'])head.append(el('th','',x));table.append(head);for(const x of out.entries.slice(0,20)){const tr=el('tr');for(const v of [x.rank,x.name,x.floor,x.rounds,x.attempts])tr.append(el('td','',String(v)));table.append(tr);}p.append(table);}catch(e){p.append(el('p','muted',e.message));}}
function abyss(){if(!game)return;const p=el('div','abyss-list'),v=game.abyssView();p.append(el('p','','네 명의 파티로 도전합니다. 4~12층은 입장 순간 동료에게 해당 층의 출전 딱지가 붙습니다. 같은 층 재도전은 가능하며 주인공은 딱지에서 제외됩니다.'));p.append(el('p','muted',O.active&&O.ranked?'공식 랭킹 집계 중':'연습 기록 · 공식 랭킹 집계 제외'));for(const f of v.floors){const c=el('section','card');c.append(el('h2','',f.floor+'층 · '+f.name),el('p','', '권장 Lv. '+f.level+' · 제한 '+f.roundLimit+'라운드'+(f.cleared?' · 정복':'')));const b=button(f.cleared?'다시 도전':'입장',async()=>{document.getElementById('modal').close();await act('ABYSS_ENTER',{floor:f.floor});},!!f.reason);b.title=f.reason;c.append(b);if(f.reason)c.append(el('small','muted',f.reason));if(f.cleared&&!f.claimed){if(f.floor===12)c.append(button('이나즈마 성유물 받기',async()=>{await act('ABYSS_REWARD',{floor:12});abyss();}));else{const s=select(c,'첫 정복 보상',CRPGRuntime.abyssConfig.rewards.map(id=>[id,safeName('16_EQUIP_DB',id)]));c.append(button('선택한 장비 받기',async()=>{await act('ABYSS_REWARD',{floor:f.floor,equipment:s.value});abyss();}));}}p.append(c);}
 const tags=Object.entries(v.progress.tags);if(tags.length)p.append(el('p','',tags.map(([id,n])=>safeName('07_CHAR_DB',id)+': '+n+'층').join(' · ')));p.append(button('도전 초기화',()=>{const box=el('div');box.append(el('p','','이번 도전의 층 진행과 동료 딱지가 모두 초기화됩니다. 이미 받은 첫 정복 보상은 다시 받을 수 없습니다. 최고 랭킹 기록은 유지됩니다.'));box.append(button('초기화 확정',async()=>{await act('ABYSS_RESET',{confirm:true});abyss();},false,true));showModal('도전 초기화',box);}));showModal('나선비경',p);}
function debug(){if(!O.active||O.account?.admin!==true){say('운영자 계정으로 로그인해 주세요.');return;}const p=el('div','operator-tools');p.append(el('p','','도구를 한 번이라도 사용한 여정은 영구적으로 랭킹에서 제외됩니다.'));const run=async params=>{await act('OPERATOR_DEBUG',params);debug();};const lv=field(p,'전체 레벨 (1~20)','number','20');p.append(button('레벨 적용',()=>run({op:'level',value:Number(lv.value)})),button('전체 회복',()=>run({op:'heal'})),button('모든 동료 해금',()=>run({op:'recruit',char:'ALL'})));const mora=field(p,'모라 (0~10,000,000)','number','1000000');p.append(button('모라 적용',()=>run({op:'mora',value:Number(mora.value)})));const maps=select(p,'이동 위치',game.rows('32_MAP_DB').filter(x=>x[0]).map(x=>[x[0],x[2]||x[0]]));p.append(button('자유행동으로 이동',()=>run({op:'travel',map:maps.value})));const gear=select(p,'지급 장비',game.rows('16_EQUIP_DB').filter(x=>x[0]).map(x=>[x[0],x[1]]));const enh=field(p,'강화 (0~12)','number','10');p.append(button('장비 지급',()=>run({op:'equipment',equipment:gear.value,value:Number(enh.value)})),button('성유물 10개 생성',()=>run({op:'artifact',value:10})));const floor=field(p,'시험할 나선비경 층 (1~12)','number','1');p.append(button('앞선 층 정복 처리',()=>run({op:'abyss_unlock',value:Number(floor.value)})));const node=field(p,'메인 스토리 장면 ID');p.append(button('장면으로 이동',()=>run({op:'story',node:node.value})));if(game.s.runtime)p.append(button('현재 전투 승리 처리',()=>run({op:'battle_end',win:true})),button('현재 전투 패배 처리',()=>run({op:'battle_end',win:false})));showModal('운영자 디버그',p);}
const localLoad=loadSlot;
begin=async function(name,route){
 if(!O.account||!O.token){game=null;O.active=false;persist();auth(false,true);return;}
 await safely(async()=>{const out=await request('/game/new',{name,route});install(out);});
};
loadSlot=async function(id){
 if(!O.account||!O.token){game=null;O.active=false;persist();auth(false,true);return;}
 O.active=false;await localLoad(id);
};
function newJourney(){
 const p=el('form','new-journey-form');p.append(el('p','','처음 시작할 이야기와 모험가 이름을 정하세요. 진행을 바꾸는 행동은 자동저장되고, 화면 이동만으로는 저장하지 않습니다.'));
 const name=field(p,'모험가 이름');name.maxLength=24;name.required=true;name.autocomplete='off';name.placeholder='게임에서 사용할 이름';
 const route=select(p,'출발할 이야기',[['ROUTE_ISEKAI','이세계인 · 낯선 세계에 도착한 당신'],['ROUTE_TRAVELER','여행자 · 페이몬과 함께 떠나는 여정']]);
 const b=button('모험 시작',()=>{},false,true);b.type='submit';p.append(b);
 p.onsubmit=async e=>{e.preventDefault();if(busy)return;await begin(name.value,route.value);if(game)document.getElementById('modal').close();};
 showModal('당신의 이야기',p);
}
async function startGame(){
 if(busy)return;if(!O.token||!O.account){game=null;O.active=false;persist();auth(false,true);return;}
 let abandoned=false;
 await safely(async()=>{
  sceneHistory.length=0;const out=await O.sync();
  if(O.active&&O.pending)await O.execute(O.pending.type,O.pending.params);
  if(O.active&&game?.s.runtime){const receipt=await O.execute('COMBAT_FORFEIT',{reason:'SESSION_RESUME'});abandoned=receipt?.result?.victory===false&&receipt?.result?.abandoned===true;}
  if(!out.state)newJourney();
 });
 if(abandoned)say('전투 중 새로고침·브라우저 종료·다른 기기 재접속이 확인되어 해당 전투는 패배 처리되었습니다.');
}
// Returning to the title never abandons an unconfirmed server action or erases a save.
// Refresh also begins here; authentication is requested only after pressing Game Start.
fresh=async function(){if(busy)return;await safely(async()=>{if(game)await storeSave();game=null;O.active=false;selectedNPC=null;activeSaveSlot=null;sceneHistory.length=0;document.getElementById('modal').close();});};
setup=function(){
 const wrap=el('section','game-title'),photo=el('img','title-landscape');photo.src=assetPath('bg_mondstadt_windrise_day.png')||assetPath('bg_mondstadt_city_day.png');photo.alt='';photo.fetchPriority='high';wrap.append(photo,el('div','title-shade'));
 const top=el('div','title-top');top.append(el('span','title-edition','AN ADVENTURE OF YOUR OWN'));
 const account=el('div','title-account');if(O.token&&O.account)account.append(el('span','',O.account.username),button('계정',accountPanel),button('로그아웃',logout));else account.append(button('로그인',()=>auth()),button('회원가입',()=>auth(true)));top.append(account);wrap.append(top);
 const center=el('div','title-center');center.append(el('div','title-star','✦'),el('p','title-kicker','TEYVAT · YOUR STORY'),el('h1','title-logo','원신'),el('div','title-crpg','C R P G'),el('p','title-tagline','당신의 선택으로 이어지는 새로운 여정'));
 const loggedIn=!!(O.token&&O.account),start=button(busy?'여정을 여는 중…':'게임 시작',startGame,busy||!loggedIn,true);start.classList.add('title-start');if(!loggedIn)start.title='로그인 후 게임을 시작할 수 있습니다.';center.append(start,el('p','title-save-note',loggedIn?'모험은 자동으로 기록됩니다.':'로그인 후 게임을 시작할 수 있습니다.'));wrap.append(center);
 const footer=el('div','title-footer');footer.append(el('span','','몬드에서 시작되는 이야기'),button('나선비경 랭킹',ranking),button('설정',()=>{const p=el('div');settingsControls(p);p.append(button('이전 기기 저장 관리',()=>{const list=el('div');slotsUI(list);showModal('이전 기기 저장',list);}));showModal('설정',p);}));wrap.append(footer);root.append(wrap);
};
O.start=startGame;O.logout=logout;O.request=request;
const onlineRender=render;render=function(){onlineRender();if(O.active&&O.pending&&!busy&&game){const box=el('section','pending-action-notice');box.setAttribute('role','status');box.append(el('p','','이전 행동의 저장 확인이 필요합니다. 같은 기록을 다시 확인하며 보상을 중복 지급하지 않습니다.'),button('진행 확인 다시 시도',()=>act(O.pending.type,O.pending.params)));root.prepend(box);}};
const onlineQuick=updateQuick;updateQuick=function(){onlineQuick();for(const b of document.querySelectorAll('#quick-actions button'))if(b.textContent==='저장')b.textContent='자동저장·계정';};
system=function(p){p.append(el('h1','','자동저장·계정'),el('p','',O.active?'진행·보상·전투·편성/장비 변경은 서버에 즉시 자동저장됩니다. 메인 화면·편성·아이템·임무 등 화면 사이를 오가는 것만으로는 저장하지 않습니다.':'진행 변경은 이 기기에 자동저장됩니다. 공식 랭킹은 계정 여정에서 이용할 수 있습니다.'));p.append(button('게임 시작 화면',fresh),button('상위 20위',ranking),button(O.token?'계정 관리':'로그인',()=>O.token?accountPanel():auth()));if(O.token)p.append(button('로그아웃',logout,busy));if(O.active)p.append(button('서버 기록 동기화',()=>safely(async()=>{if(O.pending)await O.execute(O.pending.type,O.pending.params);else await O.sync();})));if(O.active&&O.account?.admin)p.append(button('운영자 디버그',debug));p.append(el('h2','','표시 설정'));settingsControls(p);};
const side=sidebar;sidebar=function(...args){const out=side(...args),nav=out.querySelector('nav');const sys=out.querySelector('[data-screen="SYSTEM"]');if(sys)sys.lastChild.textContent='자동저장·계정';nav?.append(button('나선비경',abyss,!!game.s.runtime),button('게임 시작 화면',fresh,busy));if(O.token)nav?.append(button('로그아웃',logout,busy));if(O.active&&O.account?.admin)nav?.append(button('디버그',debug));return out;};
// Cached scripts can finish after the asynchronous save-store boot has rendered.
// Logged-out visitors must never inherit an old local journey into gameplay.
if(!O.token||!O.account){game=null;O.active=false;activeSaveSlot=null;}
// Refresh once all final hub overrides are installed, regardless of that ordering.
render();
if(new URLSearchParams(location.search).get('view')==='ranking')ranking();
})();
