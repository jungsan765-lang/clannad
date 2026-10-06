/* 0.14.12 운영자 도구 (admin.html). A separate page beside the game: its own login (checked by the server, which also
 * locks itself after wrong passwords), automatic locking after 15 idle minutes, and every tool for a player's account
 * and journey. The page keeps only the console login, in this tab's sessionStorage; all rules and records live on the
 * server (server/admin-api.mjs, runtime_admin_v01412.js). Text from players is always shown as plain text. */
(function(){
'use strict';
const cfg=window.CRPG_ONLINE_CONFIG||{},BASE=String(cfg.apiBase||'').replace(/\/$/,'');
const KEY='crpg-admin-console-v1',IDLE_MS=15*60000;
const root=document.getElementById('admin-root');
const A={token:'',admin:'',server:null,catalog:null,tab:'accounts',account:null,detail:null,sub:'summary',list:null,q:'',page:0,seen:Date.now(),tick:null,busy:false,auditPage:0,bulkRows:null};
try{const s=JSON.parse(sessionStorage.getItem(KEY)||'null');if(s&&/^[a-f0-9]{64}$/.test(s.token||'')){A.token=s.token;A.admin=String(s.admin||'');}}catch{}
const CUR={MORA:['모라','UI_ItemIcon_202'],PRIMOGEM:['원석','UI_ItemIcon_201'],STARGLITTER:['스타라이트','UI_ItemIcon_221'],STARDUST:['스타더스트','UI_ItemIcon_222'],INTERTWINED_FATE:['뒤얽힌 인연','UI_ItemIcon_223'],ACQUAINT_FATE:['만남의 인연','UI_ItemIcon_224']};
const OPS={login:'운영자 로그인','login-fail':'운영자 로그인 실패','logout-console':'운영자 로그아웃',save:'여정 변경',rollback:'되돌리기',password:'비밀번호 변경',logout:'강제 로그아웃',ban:'이용 제한',unban:'제한 해제',profile:'이름·아이디 변경','rank-on':'랭킹 포함','rank-off':'랭킹 제외','reset-journey':'여정 초기화','delete-account':'계정 삭제',bulk:'전체 지급',notice:'공지','chat-delete':'채팅 가리기'};
const TABS=[['accounts','모험가 계정'],['bulk','전체 지급'],['chat','채팅·공지'],['raid','공동 토벌전'],['trades','교환 기록'],['audit','운영 기록'],['server','서버 상태']];
const SUBS=[['summary','요약'],['wallet','재화·아이템'],['gear','장비'],['chars','캐릭터'],['world','위치·진행'],['account','계정 관리'],['log','기록']];
const TALENT={na:'일반 공격',e:'원소전투 스킬',q:'원소폭발'};
const PHASE={FREE:'자유행동',STORY:'이야기 진행 중',STORY_LOCKED:'이야기 진행 중 (메뉴 잠김)',COMBAT:'전투 중',CUTIN:'전투 연출 중',PREPARATION:'전투 준비 중',COMBAT_OPENING:'전투 시작 전',RECOVERY:'패배 뒤 회복 대기',DOWNED:'쓰러짐 (회복 필요)',LIFE:'생활 작업 중'};

// ---------- small helpers ----------
const PROPS=new Set(['value','checked','disabled','selected','hidden','min','max','step']);
function h(tag,props,...kids){
 const e=document.createElement(tag);
 for(const [k,v] of Object.entries(props||{})){
  if(v===null||v===undefined||v===false)continue;
  if(k==='class')e.className=v;else if(k==='text')e.textContent=String(v);
  else if(k.startsWith('on')&&typeof v==='function')e.addEventListener(k.slice(2),v);
  else if(PROPS.has(k))e[k]=v;else e.setAttribute(k,v===true?'':String(v));
 }
 for(const kid of kids.flat(Infinity))if(kid!==null&&kid!==undefined&&kid!==false)e.append(kid instanceof Node?kid:String(kid));
 return e;
}
const fmt=n=>Number(n||0).toLocaleString('ko-KR');
const when=at=>at?new Date(at).toLocaleString('ko-KR',{year:'2-digit',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}):'-';
function ago(at){if(!at)return '-';const s=Math.round((Date.now()-at)/1000);if(s<60)return '방금';if(s<3600)return Math.floor(s/60)+'분 전';if(s<86400)return Math.floor(s/3600)+'시간 전';if(s<86400*30)return Math.floor(s/86400)+'일 전';return when(at);}
const int=input=>{const v=Number(String(input.value).trim());return Number.isFinite(v)?Math.trunc(v):NaN;};
const icon=key=>h('img',{class:'adm-cur-icon',src:'assets/icons/'+CUR[key][1]+'.webp',alt:'',loading:'lazy'});
const badge=(text,kind='')=>h('span',{class:'adm-badge '+kind,text});
const field=(label,control,hint)=>h('label',{class:'adm-field'},h('span',{},label),control,hint?h('small',{},hint):null);
const button=(text,onclick,kind='')=>h('button',{type:'button',class:'adm-btn '+kind,onclick,text});
function envName(){if(cfg.localDev)return '로컬 개발';if(cfg.environment==='production')return '운영 서버';if(cfg.environment==='seoul-test')return '서울 테스트 서버';return cfg.environment||'게임 서버';}
function toast(text,kind=''){const box=document.getElementById('adm-toast')||document.body.appendChild(h('div',{id:'adm-toast',class:'adm-toast-box','aria-live':'polite'}));const t=h('div',{class:'adm-toast '+kind,role:kind==='error'?'alert':'status',text});box.append(t);setTimeout(()=>t.classList.add('out'),kind==='error'?6500:4200);setTimeout(()=>t.remove(),kind==='error'?7000:4700);}
// A searchable picker: the list shows names, the value is the ID; the chosen name is shown under the box.
let pickers=0;
function picker(list,placeholder){
 const id='adm-list-'+(++pickers),input=h('input',{type:'text',list:id,placeholder,autocomplete:'off',spellcheck:'false',class:'adm-pick'});
 const dl=h('datalist',{id},list.map(x=>h('option',{value:x.id,label:x.label||x.name})));
 const hint=h('small',{class:'adm-pick-hint'});
 const find=()=>{const v=input.value.trim();return list.find(x=>x.id===v)||list.find(x=>x.name===v)||null;};
 input.addEventListener('input',()=>{const x=find();hint.textContent=x?(x.label||x.name):input.value?'목록에서 골라 주세요':'';hint.classList.toggle('bad',!x&&!!input.value);});
 return {node:h('span',{class:'adm-pick-wrap'},input,dl,hint),get:()=>find()?.id||'',input,clear:()=>{input.value='';hint.textContent='';}};
}

// ---------- server ----------
async function api(path,data){
 if(!BASE)throw Object.assign(Error('이 페이지에 게임 서버 주소(online_config.js)가 없습니다.'),{status:0});
 let res;
 try{res=await fetch(BASE+path,{method:data===undefined?'GET':'POST',headers:{'Content-Type':'application/json',...(A.token?{Authorization:'Admin '+A.token}:{})},...(data===undefined?{}:{body:JSON.stringify(data)}),cache:'no-store',credentials:'omit',referrerPolicy:'no-referrer'});}
 catch{throw Object.assign(Error('게임 서버와 연결하지 못했습니다. 잠시 뒤 다시 시도해 주세요.'),{status:0});}
 let out={};try{out=await res.json();}catch{}
 if(!res.ok){
  const e=Object.assign(Error(out.error||('요청을 처리하지 못했습니다. ('+res.status+')')),{status:res.status,code:out.code});
  if(res.status===401&&path!=='/admin/login')lock(e.message);
  throw e;
 }
 return out;
}
function persist(){try{if(A.token)sessionStorage.setItem(KEY,JSON.stringify({token:A.token,admin:A.admin}));else sessionStorage.removeItem(KEY);}catch{}}
// Changes run one at a time (a second click while one is on its way does nothing); reads never wait for them.
async function run(task,done){
 if(A.busy)return null;A.busy=true;document.body.classList.add('adm-busy');
 try{const out=await task();if(done)toast(typeof done==='function'?done(out):done);return out;}
 catch(e){if(e.status!==401)toast(e.message,'error');return null;}
 finally{A.busy=false;document.body.classList.remove('adm-busy');}
}
async function read(path){try{return await api(path);}catch(e){if(e.status!==401)toast(e.message,'error');return null;}}

// ---------- login and locking ----------
function lock(message=''){
 A.token='';A.admin='';A.detail=null;A.account=null;A.list=null;A.reveal=null;persist();clearInterval(A.tick);A.tick=null;drawLogin(message);
}
async function logout(message){try{if(A.token)await api('/admin/logout',{});}catch{}lock(message||'로그아웃했습니다.');}
function idle(){A.seen=Date.now();}
for(const type of ['pointerdown','keydown','wheel','touchstart'])addEventListener(type,idle,{passive:true});
function startClock(){
 clearInterval(A.tick);A.seen=Date.now();
 A.tick=setInterval(()=>{
  const left=IDLE_MS-(Date.now()-A.seen),out=document.getElementById('adm-clock');
  if(left<=0){logout('15분 동안 사용하지 않아 자동으로 잠갔습니다. 다시 로그인해 주세요.');return;}
  if(out){const m=Math.floor(left/60000),s=Math.floor(left%60000/1000);out.textContent='자동 잠금 '+m+':'+String(s).padStart(2,'0');out.classList.toggle('soon',left<120000);}
 },1000);
}
function drawLogin(message=''){
 document.title='운영자 도구 · 원신 CRPG';
 const id=h('input',{type:'text',autocomplete:'username',required:true,maxlength:'32',placeholder:'운영자 아이디',autocapitalize:'none',spellcheck:'false'});
 const pw=h('input',{type:'password',autocomplete:'current-password',required:true,maxlength:'128',placeholder:'비밀번호'});
 const msg=h('p',{class:'adm-login-msg',role:'alert',text:message});
 const go=h('button',{type:'submit',class:'adm-btn primary wide',text:'로그인'});
 const form=h('form',{class:'adm-login',onsubmit:async e=>{
  e.preventDefault();if(go.disabled)return;go.disabled=true;msg.textContent='확인하고 있습니다…';msg.className='adm-login-msg';
  try{const out=await api('/admin/login',{id:id.value.trim(),password:pw.value});A.token=out.token;A.admin=out.admin;A.server=out.server;pw.value='';persist();msg.textContent='';await enter();}
  catch(err){msg.textContent=err.status===404?'이 서버에는 운영자 도구가 없습니다. 서울 서버에서 사용해 주세요.':err.message;msg.className='adm-login-msg bad';pw.value='';pw.focus();}
  finally{go.disabled=false;}
 }},
  h('div',{class:'adm-crest','aria-hidden':'true',text:'✦'}),h('h1',{text:'운영자 도구'}),h('p',{class:'adm-sub',text:'원신 CRPG · '+envName()}),
  field('아이디',id),field('비밀번호',pw),go,msg,
  h('p',{class:'adm-fine',text:'비밀번호를 여러 번 틀리면 잠깁니다. 15분 동안 아무 조작이 없으면 자동으로 잠깁니다.'}));
 root.replaceChildren(h('main',{class:'adm-login-wrap'},form));id.focus();
}
async function enter(){
 const catalog=await read('/admin/catalog');if(!catalog)return;
 A.catalog=catalog;A.catalog.itemList=catalog.items.map(x=>({id:x.id,name:x.name,label:x.name+' · '+(x.kind||'')+(x.grade?' · '+x.grade:'')}));
 A.catalog.equipList=catalog.equipment.map(x=>({id:x.id,name:x.name,label:x.name+' · '+(x.type||'')+(x.grade?' · '+x.grade:'')}));
 A.catalog.flagList=catalog.flags.map(x=>({id:x.id,name:x.id,label:x.name}));
 startClock();drawShell();show(A.tab);
}

// ---------- shell ----------
function drawShell(){
 document.title='운영자 도구 · '+envName();
 const nav=h('nav',{class:'adm-nav','aria-label':'운영 메뉴'},TABS.map(([id,label])=>h('button',{type:'button',class:'adm-tab','data-tab':id,onclick:()=>show(id),text:label})));
 const top=h('header',{class:'adm-top'},
  h('div',{class:'adm-brand'},h('span',{class:'adm-crest small','aria-hidden':'true',text:'✦'}),h('strong',{text:'운영자 도구'}),badge(envName(),cfg.environment==='production'?'danger':'info')),
  h('div',{class:'adm-who'},h('span',{class:'adm-admin',text:A.admin}),h('span',{id:'adm-clock',class:'adm-clock'}),button('잠그기',()=>logout('잠갔습니다. 다시 로그인해 주세요.'),'ghost')));
 root.replaceChildren(h('div',{class:'adm-app'},top,nav,h('main',{id:'adm-main',class:'adm-main'})));
}
function show(tab){
 A.tab=tab;for(const b of document.querySelectorAll('.adm-tab'))b.classList.toggle('active',b.dataset.tab===tab);
 const main=document.getElementById('adm-main');if(!main)return;main.replaceChildren(h('p',{class:'adm-empty',text:'불러오는 중…'}));
 ({accounts:drawAccounts,bulk:drawBulk,chat:drawChat,raid:drawRaid,trades:drawTrades,audit:drawAudit,server:drawServer})[tab](main);
}

// ---------- accounts ----------
async function loadList(){const out=await read('/admin/accounts?q='+encodeURIComponent(A.q)+'&page='+A.page);if(out)A.list=out;return out;}
async function drawAccounts(main){
 const search=h('input',{type:'search',placeholder:'아이디·표시 이름·계정 ID로 찾기',value:A.q,autocomplete:'off'});
 const listBox=h('div',{class:'adm-list'}),detail=h('section',{class:'adm-detail',id:'adm-detail'});
 const form=h('form',{class:'adm-search',onsubmit:async e=>{e.preventDefault();A.q=search.value.trim();A.page=0;await loadList();drawList(listBox);}},search,h('button',{type:'submit',class:'adm-btn',text:'찾기'}));
 main.replaceChildren(h('div',{class:'adm-split'},h('aside',{class:'adm-side'},form,listBox),detail));
 if(!A.list)await loadList();drawList(listBox);
 if(A.account)await openAccount(A.account);else detail.replaceChildren(h('div',{class:'adm-placeholder'},h('p',{text:'왼쪽 목록에서 모험가를 고르세요.'}),h('small',{text:'재화·아이템 지급과 회수, 장비, 캐릭터, 순간이동, 비밀번호, 이용 제한, 되돌리기를 모두 여기서 합니다.'})));
}
function drawList(box){
 const list=A.list?.accounts||[];
 if(!list.length){box.replaceChildren(h('p',{class:'adm-empty',text:A.q?'찾는 모험가가 없습니다.':'아직 가입한 모험가가 없습니다.'}));return;}
 box.replaceChildren(...list.map(a=>h('button',{type:'button',class:'adm-row'+(a.id===A.account?' active':''),'data-id':a.id,'aria-label':a.displayName+' @'+a.username+(a.banned?' 이용 제한':''),onclick:()=>openAccount(a.id)},
  h('span',{class:'adm-row-main'},h('strong',{text:a.displayName}),h('small',{text:'@'+a.username})),
  h('span',{class:'adm-row-meta'},a.journey?h('span',{text:(a.name||'이름 없음')+' · Lv.'+(a.level||1)}):h('span',{class:'muted',text:'여정 없음'}),h('small',{text:(a.map||'')+(a.lastActive?' · '+ago(a.lastActive):'')})),
  h('span',{class:'adm-row-flags'},a.banned?badge('제한','danger'):null,a.journey&&!a.ranked?badge('랭킹 제외','warn'):null))),
  h('div',{class:'adm-pager'},A.page>0?button('이전',async()=>{A.page--;await loadList();drawList(box);},'ghost'):null,A.list.more?button('다음',async()=>{A.page++;await loadList();drawList(box);},'ghost'):null));
}
async function openAccount(id,keepSub){
 const out=await read('/admin/account?id='+encodeURIComponent(id));if(!out)return;
 if(A.reveal?.id!==id)A.reveal=null;
 A.account=id;A.detail=out;if(!keepSub&&!out.summary&&A.sub!=='account'&&A.sub!=='log')A.sub='summary';
 for(const r of document.querySelectorAll('.adm-row'))r.classList.toggle('active',r.dataset.id===id);
 drawDetail();
}
async function refresh(){if(A.account)await openAccount(A.account,true);}
function drawDetail(){
 const box=document.getElementById('adm-detail');if(!box||!A.detail)return;const d=A.detail,a=d.account,s=d.summary;
 const head=h('header',{class:'adm-detail-head'},
  h('div',{},h('h2',{},a.displayName,' ',h('small',{text:'@'+a.username})),h('p',{class:'adm-id',text:'계정 ID '+a.id})),
  h('div',{class:'adm-flags'},d.flags.banned?badge('이용 제한 중','danger'):null,d.journey?(d.journey.ranked?badge('랭킹 포함','ok'):badge('랭킹 제외','warn')):badge('여정 없음'),d.sessions.active?badge('로그인 '+d.sessions.active,'info'):null,a.gameAdmin?badge('게임 운영자','info'):null));
 const subs=h('nav',{class:'adm-subs'},SUBS.map(([id,label])=>h('button',{type:'button',class:'adm-sub-tab'+(A.sub===id?' active':''),disabled:!s&&!['account','log','summary'].includes(id),onclick:()=>{A.sub=id;drawDetail();},text:label})));
 const body=h('div',{class:'adm-detail-body'});
 box.replaceChildren(head,subs,body);
 if(d.summaryError)body.append(h('p',{class:'adm-warn',text:'이 저장 기록을 여는 중 문제가 있었습니다: '+d.summaryError}));
 ({summary:subSummary,wallet:subWallet,gear:subGear,chars:subChars,world:subWorld,account:subAccount,log:subLog})[A.sub](body,d,s);
}
async function change(ops,ask){
 if(ask&&!confirm(ask))return null;
 const out=await run(()=>api('/admin/save',{id:A.account,ops}),o=>(o.changes||[]).join(' · ')||'적용했습니다.');
 if(out)await refresh();return out;
}
const card=(title,...kids)=>h('section',{class:'adm-card'},h('h3',{text:title}),...kids);
const dl=rows=>h('dl',{class:'adm-dl'},rows.filter(Boolean).map(([k,v])=>[h('dt',{text:k}),h('dd',{},v)]));

// ----- 요약 -----
function subSummary(body,d,s){
 const a=d.account,cards=h('div',{class:'adm-grid'});
 cards.append(card('계정',dl([['아이디','@'+a.username],['표시 이름',a.displayName],['가입',when(a.createdAt)],['로그인 중',d.sessions.active+'곳'],['상태',d.flags.banned?'이용 제한'+(d.flags.reason?' · '+d.flags.reason:'')+(d.flags.until?' · '+when(d.flags.until)+'까지':' · 무기한'):'정상']])));
 if(!s){cards.append(card('여정',h('p',{class:'adm-empty',text:d.journey?'저장 기록을 읽지 못했습니다.':'아직 여정을 시작하지 않았습니다.'})));body.append(cards);return;}
 cards.append(card('여정',dl([['주인공',s.name+' · '+s.route],['날짜',s.day+'일째 '+(s.time||'')],['위치',(s.map.region?s.map.region+' · ':'')+s.map.name],['상태',PHASE[s.phase]||s.phase||'-'],['이야기',s.story.node||'-'],['저장 번호',d.journey.revision+' · '+ago(d.journey.updatedAt)],s.operatorModified?['표시','운영 도구 사용 기록 있음']:null])));
 cards.append(card('재화',h('ul',{class:'adm-cur-list'},Object.keys(CUR).map(k=>h('li',{},icon(k),h('span',{text:CUR[k][0]}),h('strong',{text:fmt(s.currencies[k])}))))));
 cards.append(card('파티',h('ul',{class:'adm-party'},s.party.map(c=>h('li',{},h('strong',{text:c.name}),h('span',{text:'Lv.'+c.level+' · HP '+fmt(c.hp)+'/'+fmt(c.maxHp)+(c.constellation?' · C'+c.constellation:'')}))))));
 const joined=s.companions.filter(c=>c.joined).length;
 cards.append(card('기록',dl([['동료',joined+'명 합류 / '+s.companions.length+'명'],['가방',s.items.length+'종 · 장비 '+s.equipment.length+'개 · 성유물 '+s.artifacts+'개'],['나선비경',s.abyss.floor?s.abyss.floor+'층 정복 · 도전 '+s.abyss.attempts+'번':'기록 없음'],['기원',s.wish?s.wish.count+'번 · 이벤트 천장 '+s.wish.EVENT.pity5+' · 상시 천장 '+s.wish.STANDARD.pity5:'기록 없음']])));
 // 0.15.1 우편: gifts the player has not taken yet.
 if(s.mail)cards.append(card('우편함',s.mail.unclaimed?h('ul',{class:'adm-party'},s.mail.gifts.map(g=>h('li',{},h('strong',{text:g.title}),h('span',{text:g.lines.join(', ')+' · '+when(g.at)})))):h('p',{class:'adm-empty',text:'받지 않은 선물이 없습니다. (우편 '+s.mail.total+'통)'})));
 body.append(cards);
}
// ----- 재화·아이템 -----
function subWallet(body,d,s){
 const rows=Object.keys(CUR).map(k=>{
  const n=h('input',{type:'number',min:'0',step:'1',placeholder:'수량',class:'adm-num'});
  const go=async mode=>{const v=int(n);if(!Number.isInteger(v)||v<0||(mode!=='set'&&v===0)){toast('수량을 확인해 주세요.','error');return;}if(await change([{op:'currency',key:k,mode:mode==='set'?'set':'add',value:mode==='take'?-v:v}],mode==='set'?CUR[k][0]+'을(를) '+fmt(v)+'(으)로 바꿀까요?':null))n.value='';};
  return h('tr',{},h('td',{},icon(k),' ',CUR[k][0]),h('td',{class:'num',text:fmt(s.currencies[k])}),h('td',{},n),h('td',{class:'adm-actions'},button('지급',()=>go('give'),'ok'),button('회수',()=>go('take'),'warn'),button('이 값으로',()=>go('set'),'ghost')));
 });
 body.append(card('재화',h('p',{class:'adm-fine',text:'지급(재화·아이템·장비)은 우편으로 보내져 모험가가 우편함에서 「받기」를 눌러야 들어갑니다. 회수·「이 값으로」 등 다른 변경은 바로 적용되고, 무엇을 바꿨는지 알림 우편이 갑니다.'}),h('table',{class:'adm-table'},h('thead',{},h('tr',{},['재화','보유','수량',''].map(t=>h('th',{text:t})))),h('tbody',{},rows))));
 const pick=picker(A.catalog.itemList,'아이템 이름이나 ID'),count=h('input',{type:'number',min:'1',max:'99999',step:'1',value:'1',class:'adm-num'});
 const give=async sign=>{const id=pick.get(),n=int(count);if(!id){toast('아이템을 목록에서 골라 주세요.','error');return;}if(!(n>0)){toast('수량을 확인해 주세요.','error');return;}if(await change([{op:'item',id,count:sign*n}]))pick.clear();};
 body.append(card('아이템 지급·회수',h('div',{class:'adm-form-row'},field('아이템',pick.node),field('수량',count),h('div',{class:'adm-actions'},button('지급',()=>give(1),'ok'),button('회수',()=>give(-1),'warn')))));
 const filter=h('input',{type:'search',placeholder:'가방에서 찾기',class:'adm-filter'}),tbody=h('tbody');
 const draw=()=>{const q=filter.value.trim();tbody.replaceChildren(...s.items.filter(x=>!q||x.name.includes(q)||x.id.includes(q.toUpperCase())).map(x=>{const n=h('input',{type:'number',min:'1',step:'1',value:'1',class:'adm-num small'});return h('tr',{},h('td',{},x.name,h('small',{class:'adm-code',text:' '+x.id})),h('td',{class:'num',text:fmt(x.count)}),h('td',{class:'adm-actions'},n,button('+',()=>{const v=int(n);if(v>0)change([{op:'item',id:x.id,count:v}]);},'ok small'),button('−',()=>{const v=int(n);if(v>0)change([{op:'item',id:x.id,count:-v}]);},'warn small'),button('전부 회수',()=>change([{op:'item',id:x.id,count:-x.count}],x.name+' '+fmt(x.count)+'개를 모두 회수할까요?'),'ghost small')));}));if(!tbody.children.length)tbody.append(h('tr',{},h('td',{colspan:'3',class:'adm-empty',text:'가방이 비어 있습니다.'})));};
 filter.addEventListener('input',draw);draw();
 body.append(card('가방 ('+s.items.length+'종)',filter,h('table',{class:'adm-table'},h('thead',{},h('tr',{},['아이템','보유',''].map(t=>h('th',{text:t})))),tbody)));
}
// ----- 장비 -----
function subGear(body,d,s){
 const pick=picker(A.catalog.equipList,'장비 이름이나 ID'),lv=h('select',{},Array.from({length:13},(_,i)=>h('option',{value:String(i),text:'+'+i}))),count=h('input',{type:'number',min:'1',max:'20',step:'1',value:'1',class:'adm-num'});
 body.append(card('장비 지급',h('div',{class:'adm-form-row'},field('장비',pick.node),field('강화',lv),field('개수',count),h('div',{class:'adm-actions'},button('지급',async()=>{const id=pick.get(),n=int(count);if(!id){toast('장비를 목록에서 골라 주세요.','error');return;}if(!(n>=1&&n<=20)){toast('개수는 1~20개입니다.','error');return;}if(await change([{op:'equipment_give',id,enhance:Number(lv.value),count:n}]))pick.clear();},'ok')))));
 const rows=s.equipment.map(x=>h('tr',{},h('td',{},x.name,h('small',{class:'adm-code',text:' '+x.id})),h('td',{text:x.type}),h('td',{text:x.rarity}),h('td',{class:'num',text:'+'+x.enhance}),h('td',{text:x.equipped?x.owner:''}),h('td',{class:'adm-actions'},button('회수',()=>change([{op:'equipment_remove',slot:x.slot}],x.name+(x.enhance?' +'+x.enhance:'')+(x.equipped?' ('+x.owner+' 장착 중)':'')+'을(를) 회수할까요?'),'warn small'))));
 body.append(card('보유 장비 ('+s.equipment.length+'개)',h('table',{class:'adm-table'},h('thead',{},h('tr',{},['장비','종류','등급','강화','장착',''].map(t=>h('th',{text:t})))),h('tbody',{},rows.length?rows:h('tr',{},h('td',{colspan:'6',class:'adm-empty',text:'장비가 없습니다.'}))))));
}
// ----- 캐릭터 -----
function subChars(body,d,s){
 const all=h('input',{type:'number',min:'1',max:'60',step:'1',value:'60',class:'adm-num'});
 body.append(card('한 번에',h('div',{class:'adm-form-row'},button('모든 동료 합류',()=>change([{op:'recruit',char:'ALL'}],'몬드·리월의 모든 동료를 합류시킬까요?'),'ok'),button('모두 HP 회복',()=>change([{op:'heal'}]),'ok'),field('모두의 레벨',all),button('모두 이 레벨로',()=>{const v=int(all);if(v>=1&&v<=60)change([{op:'level',target:'ALL',value:v}],'주인공과 모든 동료를 Lv.'+v+'(으)로 바꿀까요?');else toast('레벨은 1~60입니다.','error');},'ghost'))));
 const onlyJoined=h('input',{type:'checkbox',checked:true}),filter=h('input',{type:'search',placeholder:'이름으로 찾기',class:'adm-filter'}),tbody=h('tbody');
 const sel=(n,from,to,prefix)=>h('select',{},Array.from({length:to-from+1},(_,i)=>h('option',{value:String(from+i),selected:from+i===n,text:prefix+(from+i)})));
 const row=c=>{
  const lv=h('input',{type:'number',min:'1',max:'60',step:'1',value:String(c.level),class:'adm-num small'}),cons=sel(c.constellation,0,6,'C'),tal={na:sel(c.talents.na||1,1,10,''),e:sel(c.talents.e||1,1,10,''),q:sel(c.talents.q||1,1,10,'')};
  const save=async()=>{
   const ops=[];if(!c.joined&&c.id!=='PLAYER_CUSTOM'&&join.checked)ops.push({op:'recruit',char:c.id});
   const v=int(lv);if(v!==c.level){if(!(v>=1&&v<=60)){toast('레벨은 1~60입니다.','error');return;}ops.push({op:'level',target:c.id,value:v});}
   if(Number(cons.value)!==c.constellation)ops.push({op:'constellation',char:c.id,value:Number(cons.value)});
   for(const k of Object.keys(TALENT))if(Number(tal[k].value)!==(c.talents[k]||1))ops.push({op:'talent',char:c.id,kind:k,value:Number(tal[k].value)});
   if(!ops.length){toast('바뀐 내용이 없습니다.');return;}await change(ops);
  };
  const join=h('input',{type:'checkbox',checked:c.joined,disabled:c.joined||c.id==='PLAYER_CUSTOM',title:'합류'});
  return h('tr',{class:c.joined?'':'muted'},h('td',{},h('strong',{text:c.name}),h('small',{class:'adm-code',text:' '+c.id})),h('td',{},join),h('td',{},lv),h('td',{class:'num',text:fmt(c.hp)+'/'+fmt(c.maxHp)}),h('td',{},cons),h('td',{},tal.na),h('td',{},tal.e),h('td',{},tal.q),h('td',{},button('저장',save,'ok small')));
 };
 const list=[s.player,...s.companions];
 const draw=()=>{const q=filter.value.trim();tbody.replaceChildren(...list.filter(c=>(!onlyJoined.checked||c.joined)&&(!q||c.name.includes(q))).map(row));if(!tbody.children.length)tbody.append(h('tr',{},h('td',{colspan:'9',class:'adm-empty',text:'보일 캐릭터가 없습니다.'})));};
 onlyJoined.addEventListener('change',draw);filter.addEventListener('input',draw);draw();
 body.append(card('캐릭터',h('div',{class:'adm-form-row'},filter,h('label',{class:'adm-check'},onlyJoined,' 합류한 동료만')),h('p',{class:'adm-fine',text:'합류하지 않은 동료는 합류 칸에 표시한 뒤 저장하면 합류합니다. 줄마다 바꾼 칸만 저장됩니다.'}),
  h('div',{class:'adm-scroll'},h('table',{class:'adm-table'},h('thead',{},h('tr',{},['이름','합류','레벨','HP','운명의 자리',TALENT.na,TALENT.e,TALENT.q,''].map(t=>h('th',{text:t})))),tbody))));
}
// ----- 위치·진행 -----
function subWorld(body,d,s){
 const regions=[...new Set(A.catalog.maps.map(m=>m.region||'기타'))];
 const region=h('select',{},regions.map(r=>h('option',{value:r,selected:r===s.map.region,text:r}))),map=h('select');
 const fill=()=>map.replaceChildren(...A.catalog.maps.filter(m=>(m.region||'기타')===region.value).map(m=>h('option',{value:m.id,selected:m.id===s.map.id,text:m.name})));
 region.addEventListener('change',fill);fill();
 body.append(card('순간이동',h('p',{class:'adm-fine',text:'지금 위치: '+(s.map.region?s.map.region+' · ':'')+s.map.name+(s.inBattle?' (전투 중에는 이동할 수 없습니다)':'')}),
  h('div',{class:'adm-form-row'},field('지역',region),field('장소',map),h('div',{class:'adm-actions'},button('이동',()=>change([{op:'teleport',map:map.value}],map.selectedOptions[0]?.text+'(으)로 이동할까요? 진행 중인 이야기 장면은 정리되고 자유행동이 됩니다.'),'ok'),button('막힌 장면 정리',()=>change([{op:'unstick'}],'진행 중인 장면을 정리하고 지금 장소에서 자유행동으로 돌려놓을까요?'),'ghost')))));
 if(s.inBattle)body.append(card('진행 중인 전투',h('div',{class:'adm-form-row'},button('승리로 끝내기',()=>change([{op:'battle_end',win:true}],'이 전투를 승리로 끝낼까요?'),'ok'),button('패배로 끝내기',()=>change([{op:'battle_end',win:false}],'이 전투를 패배로 끝낼까요?'),'warn'))));
 const node=h('input',{type:'text',placeholder:'예: '+(s.story.node||'TRV_M01_E002'),value:'',class:'adm-text',spellcheck:'false'});
 body.append(card('메인 이야기',h('p',{class:'adm-fine',text:'지금 장면: '+(s.story.node||'-')+(s.story.quest?' · '+s.story.quest:'')}),h('div',{class:'adm-form-row'},field('장면 ID',node),button('이 장면으로',()=>{const v=node.value.trim();if(v)change([{op:'story',node:v}],v+' 장면으로 옮길까요?');},'ghost'))));
 const floor=h('input',{type:'number',min:'2',max:'12',step:'1',value:String(Math.min(12,(s.abyss.floor||0)+2)),class:'adm-num'});
 body.append(card('나선비경·필드 보스·주간 한도',h('div',{class:'adm-form-row'},field('이 층까지 열기',floor,'그 아래 층을 정복한 것으로 표시'),button('적용',()=>{const v=int(floor);if(v>=2&&v<=12)change([{op:'abyss_unlock',value:v}]);else toast('2~12층으로 입력해 주세요.','error');},'ghost'),button('필드 보스 횟수 초기화',()=>change([{op:'field_boss_reset'}]),'ghost'),button('주간 교환 한도 초기화',()=>change([{op:'weekly_reset'}]),'ghost'))));
 const w=s.wish||{EVENT:{pity5:0,pity4:0,guarantee5:false},STANDARD:{pity5:0,pity4:0}},banner=h('select',{},h('option',{value:'EVENT',text:'이벤트 기원'}),h('option',{value:'STANDARD',text:'세상 유람'}));
 const p5=h('input',{type:'number',min:'0',max:'89',step:'1',class:'adm-num'}),p4=h('input',{type:'number',min:'0',max:'9',step:'1',class:'adm-num'}),g5=h('input',{type:'checkbox'});
 const sync=()=>{const b=w[banner.value];p5.value=String(b.pity5||0);p4.value=String(b.pity4||0);g5.checked=!!b.guarantee5;g5.disabled=banner.value!=='EVENT';};banner.addEventListener('change',sync);sync();
 body.append(card('기원 천장',h('div',{class:'adm-form-row'},field('기원',banner),field('5★ 천장 횟수',p5,'0~89'),field('4★ 천장 횟수',p4,'0~9'),h('label',{class:'adm-check'},g5,' 다음 5★ 픽업 확정'),button('적용',()=>change([{op:'wish_pity',banner:banner.value,pity5:int(p5),pity4:int(p4),...(banner.value==='EVENT'?{guarantee5:g5.checked}:{})}]),'ghost'))));
 const flag=picker(A.catalog.flagList,'FLAG_...'),flagValue=h('select',{},h('option',{value:'1',text:'켬'}),h('option',{value:'0',text:'끔'}));
 const name=h('input',{type:'text',maxlength:'24',value:s.name,class:'adm-text'});
 body.append(card('이야기 표시·이름',h('div',{class:'adm-form-row'},field('이야기 표시',flag.node),field('값',flagValue),button('적용',()=>{const id=flag.get();if(!id){toast('목록에서 골라 주세요.','error');return;}change([{op:'flag',key:id,value:flagValue.value==='1'}],id+'을(를) '+(flagValue.value==='1'?'켤까요?':'끌까요?'));},'ghost')),
  h('div',{class:'adm-form-row'},field('주인공 이름',name),button('이름 바꾸기',()=>{const v=name.value.trim();if(v&&v!==s.name)change([{op:'name',value:v}]);},'ghost'))));
}
// ----- 계정 관리 -----
function subAccount(body,d){
 const a=d.account,target={id:a.id};
 const pw=h('input',{type:'text',minlength:'8',maxlength:'128',placeholder:'새 비밀번호 (8자 이상)',autocomplete:'off',spellcheck:'false',class:'adm-text'}),shown=h('div',{class:'adm-secret',hidden:true});
 const setPw=async generate=>{
  const value=generate?undefined:pw.value;if(!generate&&(!value||value.length<8)){toast('비밀번호는 8자 이상입니다.','error');return;}
  if(!confirm((generate?'임시 비밀번호를 새로 만들까요?':'비밀번호를 입력한 값으로 바꿀까요?')+' 이 계정의 모든 로그인이 끝납니다.'))return;
  const out=await run(()=>api('/admin/password',{...target,...(generate?{}:{password:value})}),'비밀번호를 바꿨습니다.');if(!out)return;pw.value='';
  A.reveal=out.password?{id:a.id,password:out.password}:null;await refreshKeep();
 };
 // A made-up password is shown once, until another account is opened or the console locks.
 if(A.reveal?.id===a.id){const p=A.reveal.password;shown.hidden=false;shown.append(h('span',{text:'임시 비밀번호'}),h('code',{text:p}),button('복사',()=>navigator.clipboard?.writeText(p).then(()=>toast('복사했습니다.'),()=>toast('복사하지 못했습니다. 직접 선택해 복사해 주세요.','error')),'ghost small'),h('small',{text:'다른 계정을 열거나 잠그면 다시 볼 수 없습니다. 모험가에게 전달한 뒤 바꾸도록 안내해 주세요.'}));}
 body.append(card('비밀번호',h('p',{class:'adm-fine',text:'비밀번호는 해시로만 저장되어 운영자도 볼 수 없습니다. 새로 정해 줄 수만 있습니다.'}),
  h('div',{class:'adm-form-row'},field('새 비밀번호',pw),button('이 비밀번호로 바꾸기',()=>setPw(false),'ghost'),button('임시 비밀번호 만들기',()=>setPw(true),'ok')),shown));
 body.append(card('로그인',h('div',{class:'adm-form-row'},h('p',{text:'지금 로그인된 곳: '+d.sessions.active+'곳'}),button('모든 기기에서 로그아웃',async()=>{if(!confirm('이 계정의 모든 로그인을 끝낼까요?'))return;if(await run(()=>api('/admin/logout-account',target),o=>o.loggedOut+'곳에서 로그아웃시켰습니다.'))await refreshKeep();},'warn'))));
 const reason=h('input',{type:'text',maxlength:'120',placeholder:'사유 (모험가에게 보입니다)',class:'adm-text',value:d.flags.banned?d.flags.reason:''}),hours=h('select',{},[['1','1시간'],['24','1일'],['72','3일'],['168','7일'],['720','30일'],['0','무기한']].map(([v,t])=>h('option',{value:v,text:t,selected:v==='168'})));
 body.append(card('이용 제한',h('p',{class:'adm-fine',text:d.flags.banned?'지금 이용 제한 중'+(d.flags.reason?' · '+d.flags.reason:'')+(d.flags.until?' · '+when(d.flags.until)+'까지':' · 무기한'):'제한하면 바로 로그아웃되고, 기간 동안 로그인할 수 없습니다.'}),
  h('div',{class:'adm-form-row'},field('사유',reason),field('기간',hours),button(d.flags.banned?'제한 다시 걸기':'이용 제한',async()=>{if(!confirm('@'+a.username+' 계정의 이용을 제한할까요?'))return;if(await run(()=>api('/admin/ban',{...target,banned:true,reason:reason.value,hours:Number(hours.value)}),'이용을 제한했습니다.'))await refreshKeep();},'danger'),d.flags.banned?button('제한 풀기',async()=>{if(await run(()=>api('/admin/ban',{...target,banned:false}),'제한을 풀었습니다.'))await refreshKeep();},'ok'):null)));
 const display=h('input',{type:'text',maxlength:'24',value:a.displayName,class:'adm-text'}),username=h('input',{type:'text',maxlength:'24',value:a.username,class:'adm-text',spellcheck:'false'});
 body.append(card('이름·아이디',h('div',{class:'adm-form-row'},field('표시 이름',display),button('바꾸기',async()=>{if(display.value.trim()===a.displayName)return;if(await run(()=>api('/admin/profile',{...target,displayName:display.value}),'표시 이름을 바꿨습니다.'))await afterProfile();},'ghost')),
  h('div',{class:'adm-form-row'},field('로그인 아이디',username,'한글·영문·숫자·밑줄 3~24자'),button('바꾸기',async()=>{if(username.value.trim().toLowerCase()===a.username)return;if(!confirm('로그인 아이디를 바꾸면 모험가는 새 아이디로 로그인해야 합니다. 바꿀까요?'))return;if(await run(()=>api('/admin/profile',{...target,username:username.value}),'로그인 아이디를 바꿨습니다.'))await afterProfile();},'ghost'))));
 if(d.journey)body.append(card('랭킹',h('div',{class:'adm-form-row'},h('p',{text:d.journey.ranked?'나선비경 랭킹에 오릅니다.':'랭킹에서 빠져 있습니다.'}),button(d.journey.ranked?'랭킹에서 빼기':'랭킹에 다시 넣기',async()=>{if(await run(()=>api('/admin/ranked',{...target,ranked:!d.journey.ranked}),'랭킹 설정을 바꿨습니다.'))await refreshKeep();},'ghost'))));
 if(d.journey){
  const steps=d.backups.length;
  body.append(card('되돌리기',h('p',{class:'adm-fine',text:'최근 저장 '+steps+'개까지 되돌릴 수 있습니다. 되돌리기도 새 저장으로 남으므로, 잘못 되돌리면 다시 1단계 되돌리기로 원래대로 돌아옵니다.'}),
   h('ul',{class:'adm-backups'},d.backups.map((b,i)=>h('li',{},h('span',{text:(i+1)+'단계 전 · 저장 '+b.revision}),h('small',{text:when(b.created_at)}),button((i+1)+'단계 되돌리기',async()=>{if(!confirm((i+1)+'단계 전(저장 '+b.revision+') 상태로 되돌릴까요?'))return;if(await run(()=>api('/admin/rollback',{...target,steps:i+1}),o=>(o.changes||[]).join(' · ')))await refreshKeep();},'warn small'))))));
 }
 const confirmBox=h('input',{type:'text',placeholder:'확인: '+a.username,class:'adm-text',autocomplete:'off',spellcheck:'false'});
 body.append(card('위험 구역',h('p',{class:'adm-fine',text:'아래 두 기능은 되돌릴 수 없습니다. 실행하려면 이 계정의 아이디('+a.username+')를 똑같이 입력하세요.'}),
  h('div',{class:'adm-form-row'},field('아이디 확인',confirmBox),d.journey?button('여정 초기화',async()=>{if(!confirm('여정을 지우고 처음부터 시작하게 할까요? 되돌릴 수 없습니다.'))return;if(await run(()=>api('/admin/reset-journey',{...target,confirm:confirmBox.value.trim()}),'여정을 초기화했습니다.'))await refreshKeep();},'danger'):null,
   button('계정 삭제',async()=>{if(!confirm('@'+a.username+' 계정을 완전히 지울까요? 되돌릴 수 없습니다.'))return;if(await run(()=>api('/admin/delete-account',{...target,confirm:confirmBox.value.trim()}),'계정을 삭제했습니다.')){A.account=null;A.detail=null;await loadList();show('accounts');}},'danger'))));
}
async function refreshKeep(){await refresh();}
async function afterProfile(){await refresh();await loadList();const box=document.querySelector('.adm-list');if(box)drawList(box);}
// ----- 기록 -----
function auditText(x){
 const d=x.detail||{};
 if(x.op==='save'||x.op==='rollback')return (d.changes||[]).join(' · ')||(d.steps?d.steps+'단계':'');
 if(x.op==='ban')return (d.reason||'사유 없음')+' · '+(d.hours?d.hours+'시간':'무기한');
 if(x.op==='profile')return Object.entries(d).map(([k,v])=>(k==='username'?'아이디 ':'표시 이름 ')+v[0]+' → '+v[1]).join(' · ');
 if(x.op==='password')return d.generated?'임시 비밀번호 발급':'지정한 비밀번호로 변경';
 if(x.op==='bulk')return (d.ops||[]).map(op=>op.op==='currency'?(CUR[op.key]?.[0]||op.key)+' +'+fmt(op.value):(A.catalog?.items.find(i=>i.id===op.id)?.name||op.id)+' +'+fmt(op.count)).join(', ')+' · '+d.done+'/'+d.targets+'명';
 if(x.op==='notice')return d.text||'';
 if(x.op==='logout')return (d.sessions||0)+'곳';
 if(x.op==='chat-delete')return '메시지 #'+d.id;
 return '';
}
function auditTable(entries,withTarget){
 return h('div',{class:'adm-scroll'},h('table',{class:'adm-table'},h('thead',{},h('tr',{},['시각','작업',withTarget?'대상':null,'내용','운영자 · 주소'].filter(Boolean).map(t=>h('th',{text:t})))),
  h('tbody',{},entries.length?entries.map(x=>h('tr',{class:x.op==='login-fail'?'bad':''},h('td',{class:'nowrap',text:when(x.created_at)}),h('td',{text:OPS[x.op]||x.op}),withTarget?h('td',{text:x.target_name?'@'+x.target_name:'-'}):null,h('td',{text:auditText(x)}),h('td',{class:'muted',text:x.actor+' · '+x.ip}))):h('tr',{},h('td',{colspan:'5',class:'adm-empty',text:'기록이 없습니다.'})))));
}
function subLog(body,d){
 body.append(card('이 계정의 운영 기록',auditTable(d.audit,false)));
 body.append(card('최근 저장',h('div',{class:'adm-scroll'},h('table',{class:'adm-table'},h('thead',{},h('tr',{},['저장','행동','시각'].map(t=>h('th',{text:t})))),h('tbody',{},d.receipts.length?d.receipts.map(r=>h('tr',{},h('td',{class:'num',text:String(r.revision)}),h('td',{text:r.type==='ADMIN'?'운영자 변경':(r.type||'-')}),h('td',{text:when(r.at)}))):h('tr',{},h('td',{colspan:'3',class:'adm-empty',text:'저장 기록이 없습니다.'})))))));
}

// ---------- 전체 지급 ----------
function drawBulk(main){
 A.bulkRows=A.bulkRows||[{kind:'currency',key:'PRIMOGEM',value:160}];
 const rowsBox=h('div',{class:'adm-bulk-rows'}),days=h('input',{type:'number',min:'0',max:'3650',step:'1',placeholder:'비우면 전체',class:'adm-num'}),ok=h('input',{type:'text',placeholder:'전체 지급',class:'adm-text',autocomplete:'off'}),result=h('div',{class:'adm-result'});
 // 0.15.1: grants arrive as a gift mail; the operator may name it and add a line (e.g. 점검 보상).
 const mailTitle=h('input',{type:'text',maxlength:'60',placeholder:'운영자의 선물',class:'adm-text'}),mailBody=h('input',{type:'text',maxlength:'300',placeholder:'비우면 기본 문구',class:'adm-text wide'});
 const draw=()=>rowsBox.replaceChildren(...A.bulkRows.map((r,i)=>{
  const kind=h('select',{onchange:()=>{r.kind=kind.value;draw();}},h('option',{value:'currency',selected:r.kind==='currency',text:'재화'}),h('option',{value:'item',selected:r.kind==='item',text:'아이템'}));
  const amount=h('input',{type:'number',min:'1',step:'1',value:String(r.value||1),class:'adm-num',oninput:()=>{r.value=int(amount);}});
  let what;
  if(r.kind==='currency'){if(!CUR[r.key])r.key='PRIMOGEM';what=h('select',{onchange:()=>{r.key=what.value;}},Object.keys(CUR).map(k=>h('option',{value:k,selected:k===r.key,text:CUR[k][0]})));}
  else{const p=picker(A.catalog.itemList,'아이템 이름이나 ID');p.input.value=r.id||'';p.input.dispatchEvent(new Event('input'));p.input.addEventListener('input',()=>{r.id=p.get();});what=p.node;}
  return h('div',{class:'adm-form-row'},field('종류',kind),field(r.kind==='currency'?'재화':'아이템',what),field('수량',amount),A.bulkRows.length>1?button('빼기',()=>{A.bulkRows.splice(i,1);draw();},'ghost small'):null);
 }));
 draw();
 main.replaceChildren(h('div',{class:'adm-page'},card('전체 지급',h('p',{class:'adm-fine',text:'여정을 시작한 모든 모험가(또는 최근 며칠 안에 플레이한 모험가)에게 재화·아이템을 우편으로 보냅니다. 모험가가 우편함에서 「받기」를 누르면 들어갑니다. 회수와 장비는 계정마다 따로 하세요. 지급 기록은 운영 기록에 남습니다.'}),
  rowsBox,h('div',{class:'adm-form-row'},field('우편 제목',mailTitle,'비우면 「운영자의 선물」'),field('우편 내용',mailBody,'선택')),
  h('div',{class:'adm-form-row'},button('줄 추가',()=>{A.bulkRows.push({kind:'currency',key:'MORA',value:1000});draw();},'ghost'),field('최근 며칠 안에 플레이',days,'비우면 전원'),field('확인 문구',ok,'「전체 지급」이라고 입력'),
   button('전체 지급',async()=>{
    const ops=[];for(const r of A.bulkRows){const v=Number(r.value);if(!(v>0)){toast('수량을 확인해 주세요.','error');return;}if(r.kind==='currency')ops.push({op:'currency',key:r.key,mode:'add',value:v});else{if(!r.id){toast('아이템을 목록에서 골라 주세요.','error');return;}ops.push({op:'item',id:r.id,count:v});}}
    const n=int(days);if(!confirm('정말 '+(n>0?'최근 '+n+'일 안에 플레이한 ':'모든 ')+'모험가에게 지급할까요?'))return;
    const out=await run(()=>api('/admin/bulk',{ops,days:n>0?n:0,confirm:ok.value.trim(),mailTitle:mailTitle.value.trim(),mailBody:mailBody.value.trim()}),o=>o.done+'명에게 우편으로 보냈습니다.');
    if(out){ok.value='';result.replaceChildren(h('p',{text:'대상 '+out.targets+'명 · 지급 '+out.done+'명'+(out.failed.length?' · 실패 '+out.failed.length+'명':'')}),...out.failed.map(f=>h('p',{class:'bad',text:'@'+f.username+': '+f.error})));}
   },'danger')),result)));
}
// ---------- 채팅·공지 ----------
async function drawChat(main){
 const out=await read('/admin/chat');if(!out){main.replaceChildren();return;}
 if(!out.enabled){main.replaceChildren(h('div',{class:'adm-page'},card('채팅',h('p',{class:'adm-empty',text:'이 서버는 채팅을 켜지 않았습니다.'}))));return;}
 const text=h('input',{type:'text',maxlength:'140',placeholder:'모든 모험가에게 보일 공지 (140자)',class:'adm-text wide'});
 const list=out.messages.map(m=>h('li',{class:m.deleted?'deleted':''},h('span',{class:'adm-chat-who'},h('strong',{text:m.author}),h('small',{text:(m.username?'@'+m.username+' · ':'')+when(m.at)})),h('span',{class:'adm-chat-text',text:m.deleted?'(가린 메시지) '+m.text:m.text}),!m.deleted?button('가리기',async()=>{if(await run(()=>api('/admin/chat-delete',{id:m.id}),'메시지를 가렸습니다.'))show('chat');},'warn small'):null));
 main.replaceChildren(h('div',{class:'adm-page'},card('공지 보내기',h('div',{class:'adm-form-row'},text,button('보내기',async()=>{const v=text.value.trim();if(!v)return;if(await run(()=>api('/admin/notice',{text:v}),'공지를 보냈습니다.'))show('chat');},'ok'))),
  card('최근 채팅',button('새로고침',()=>show('chat'),'ghost small'),h('ul',{class:'adm-chat'},list.length?list:h('li',{class:'adm-empty',text:'대화가 없습니다.'})))));
}
// ---------- 공동 토벌전 (0.15.4: opened only as an event from here) ----------
async function drawRaid(main){
 const out=await read('/admin/raid');if(!out){main.replaceChildren();return;}
 const STATE={OPEN:['열림','ok'],SCHEDULED:['예정','info'],ENDED:['끝남',''],CLOSED:['닫음','warn']},num=n=>Number(n||0).toLocaleString('ko-KR');
 const active=out.events.find(e=>e.state==='OPEN');
 const status=active?card('지금 열린 토벌전',h('p',{text:active.name+' · '+when(active.startsAt)+' ~ '+when(active.endsAt)}),h('p',{text:'맞힌 횟수 '+num(active.hits)+' / 목표 '+num(active.target)+' · 참여 '+active.players+'명'}),
  button('지금 닫기',async()=>{if(!confirm(active.name+' 토벌전을 지금 닫을까요? 닫은 뒤에도 '+7+'일 동안 보상은 받을 수 있습니다.'))return;if(await run(()=>api('/admin/raid',{op:'close',num:active.num}),'토벌전을 닫았습니다.'))show('raid');},'warn'))
  :card('지금 열린 토벌전',h('p',{class:'adm-empty',text:'열린 공동 토벌전이 없습니다. 모험가에게는 출격 버튼이 잠겨 보입니다.'}));
 const boss=h('select',{class:'adm-text'},out.bosses.map(b=>h('option',{value:b.id,text:b.name})));
 const days=h('input',{type:'number',min:'1',max:'30',value:String(out.defaults.days),class:'adm-text small'}),target=h('input',{type:'number',min:'100',max:'1000000',step:'100',value:String(out.defaults.target),class:'adm-text small'});
 const notice=h('input',{type:'checkbox',checked:true});
 const open=card('토벌전 열기',h('div',{class:'adm-form-row'},h('label',{},h('span',{text:'보스 '}),boss),h('label',{},h('span',{text:'기간(일) '}),days),h('label',{},h('span',{text:'모두의 목표(맞힌 횟수) '}),target),h('label',{},notice,h('span',{text:' 채팅에 공지'})),
  button('열기',async()=>{if(active){alert('이미 열린 토벌전이 있습니다. 먼저 닫아 주세요.');return;}const b={op:'open',boss:boss.value,days:Number(days.value),target:Number(target.value),notice:notice.checked};if(!confirm(boss.selectedOptions[0].textContent+' 토벌전을 '+b.days+'일 동안 열까요?'))return;if(await run(()=>api('/admin/raid',b),'토벌전을 열었습니다.'))show('raid');},'ok')),
  h('p',{class:'adm-hint',text:'열면 바로 시작합니다. Lv.10 이상 모험가가 하루 3번 출격하고, 끝난 뒤 7일 동안 보상을 받을 수 있습니다.'}));
 const rows=out.events.map(e=>h('tr',{},h('td',{class:'nowrap',text:'#'+e.num}),h('td',{text:e.name}),h('td',{class:'nowrap',text:when(e.startsAt)+' ~ '+when(e.endsAt)}),h('td',{},badge(...(STATE[e.state]||[e.state,'']))),h('td',{class:'nowrap',text:num(e.hits)+' / '+num(e.target)}),h('td',{text:String(e.players)}),h('td',{text:e.openedBy||'-'})));
 const list=card('최근 토벌전',h('div',{class:'adm-scroll'},h('table',{class:'adm-table'},h('thead',{},h('tr',{},['번호','보스','기간','상태','맞힌 횟수','참여','연 사람'].map(t=>h('th',{text:t})))),h('tbody',{},rows.length?rows:h('tr',{},h('td',{colspan:'7',class:'adm-empty',text:'아직 연 토벌전이 없습니다.'}))))));
 main.replaceChildren(h('div',{class:'adm-page'},status,active?null:open,list));
}
// ---------- 교환 기록 ----------
async function drawTrades(main){
 const out=await read('/admin/trades');if(!out){main.replaceChildren();return;}
 const STATUS={PENDING:'대기',ACCEPTED:'완료',DECLINED:'거절',CANCELLED:'취소',FAILED:'실패'},SALE={ACTIVE:['판매 중','info'],SOLD:['팔림','ok'],CANCELLED:['내림','']};
 if(!out.enabled){main.replaceChildren(h('div',{class:'adm-page'},card('교환 기록',h('p',{class:'adm-empty',text:'이 서버는 교환을 켜지 않았습니다.'}))));return;}
 const money=n=>Number(n||0).toLocaleString('ko-KR');
 const table=(heads,rows,empty)=>h('div',{class:'adm-scroll'},h('table',{class:'adm-table'},h('thead',{},h('tr',{},heads.map(t=>h('th',{text:t})))),h('tbody',{},rows.length?rows:h('tr',{},h('td',{colspan:String(heads.length),class:'adm-empty',text:empty})))));
 // 0.15.1: the market (shops with a fee) and live trades between online players.
 const market=table(['올린 시각','판매자','물건','가격','수수료','상태','산 모험가','마지막 변경'],(out.market||[]).map(x=>h('tr',{},h('td',{class:'nowrap',text:when(x.at)}),h('td',{text:x.seller}),h('td',{text:x.label}),h('td',{class:'nowrap',text:money(x.price)+' 모라'}),h('td',{class:'nowrap',text:money(x.fee)}),h('td',{},badge(...(SALE[x.status]||[x.status,'']))),h('td',{text:x.buyer||'-'}),h('td',{class:'nowrap',text:when(x.updated)}))),'시장 기록이 없습니다.');
 const deals=table(['시각','모험가 A','A가 준 것','모험가 B','B가 준 것'],(out.deals||[]).map(d=>h('tr',{},h('td',{class:'nowrap',text:when(d.at)}),h('td',{text:d.a}),h('td',{text:d.aGave}),h('td',{text:d.b}),h('td',{text:d.bGave}))),'직접 거래 기록이 없습니다.');
 const old=table(['시각','보낸 모험가','받는 모험가','준 것','요청한 것','상태'],out.trades.map(t=>h('tr',{},h('td',{class:'nowrap',text:when(t.at)}),h('td',{text:t.from}),h('td',{text:t.to}),h('td',{text:t.give||'-'}),h('td',{text:t.want||'-'}),h('td',{},badge(STATUS[t.status]||t.status,t.status==='ACCEPTED'?'ok':t.status==='FAILED'?'danger':'')))),'예전 교환 기록이 없습니다.');
 // 0.15.1 letters between adventurers: what each carried, the postage, and where the parcel is now. The text opens below
 // the title (for reports).
 const LETTER={TAKEN:['받아 감','ok'],RETURNED:['돌아옴 · 되찾기 전','warn'],BACK:['돌아옴 · 되찾음','']};
 const carried=x=>[x.label,x.mora?money(x.mora)+' 모라':''].filter(Boolean).join(', ')||'-';
 const letters=table(['보낸 시각','보낸 모험가','받는 모험가','제목 · 내용','넣은 것','수수료','상태','마지막 변경'],(out.letters||[]).map(x=>h('tr',{},h('td',{class:'nowrap',text:when(x.at)}),h('td',{text:x.from}),h('td',{text:x.to}),
  h('td',{},h('details',{class:'adm-letter'},h('summary',{text:x.title}),h('p',{class:'adm-letter-body',text:x.body||'(내용 없음)'}))),h('td',{text:carried(x)}),h('td',{class:'nowrap',text:money(x.fee)}),
  h('td',{},badge(...(x.status==='SENT'?(x.label||x.mora?['받기 전','info']:['배달됨','']):LETTER[x.status]||[x.status,''])),x.note?h('small',{class:'adm-fine',text:' '+x.note}):null),h('td',{class:'nowrap',text:when(x.updated)}))),'편지 기록이 없습니다.');
 main.replaceChildren(h('div',{class:'adm-page'},card('시장 (상점 판매)',h('p',{class:'adm-fine',text:'최근 80건. 팔리면 가격에서 수수료를 뺀 모라가 판매자의 판매 대금으로 쌓입니다.'}),market),card('직접 거래',h('p',{class:'adm-fine',text:'두 모험가가 모두 확정하고 거래를 마친 기록 최근 60건.'}),deals),
  card('편지',h('p',{class:'adm-fine',text:'최근 80통. 넣은 물건·모라는 받는 모험가가 「받기」를 누를 때까지 서버에 보관되고, 돌려보내거나 30일이 지나면 보낸 모험가에게 돌아갑니다. 수수료는 보낼 때 빠지고 돌려주지 않습니다. 제목을 누르면 내용이 보입니다.'}),letters),
  out.trades.length?card('예전 교환 기록',old):null));
}
// ---------- 운영 기록 ----------
async function drawAudit(main){
 const out=await read('/admin/audit?page='+A.auditPage);if(!out){main.replaceChildren();return;}
 main.replaceChildren(h('div',{class:'adm-page'},card('운영 기록',h('p',{class:'adm-fine',text:'운영자 도구로 한 모든 일과 로그인 시도가 남습니다. 비밀번호는 남기지 않습니다.'}),auditTable(out.entries,true),
  h('div',{class:'adm-pager'},A.auditPage>0?button('최근 쪽',()=>{A.auditPage--;show('audit');},'ghost'):null,out.entries.length===100?button('이전 기록',()=>{A.auditPage++;show('audit');},'ghost'):null))));
}
// ---------- 서버 상태 ----------
async function drawServer(main){
 const o=await read('/admin/overview');if(!o){main.replaceChildren();return;}
 const stat=(label,value)=>h('div',{class:'adm-stat'},h('strong',{text:value}),h('span',{text:label}));
 main.replaceChildren(h('div',{class:'adm-page'},card('한눈에',h('div',{class:'adm-stats'},stat('가입한 모험가',fmt(o.accounts)),stat('여정',fmt(o.journeys)),stat('24시간 안에 플레이',fmt(o.activeDay)),stat('7일 안에 플레이',fmt(o.activeWeek)),stat('로그인 중',fmt(o.sessions)),stat('이용 제한',fmt(o.banned)),stat('랭킹 제외',fmt(o.unranked)),stat('저장소',(o.dbBytes/1048576).toFixed(1)+' MB'))),
  card('서버',dl([['게임 버전',o.server.version],['엔진',o.server.engineVersion],['서버 빌드',o.server.serverBuild],['켜진 기능',o.server.features.join(', ')||'없음'],['운영자 로그인',o.consoleSessions+'곳'],['잠금',o.lockedUntil&&o.lockedUntil>Date.now()?when(o.lockedUntil)+'까지':'없음'],['서버 주소',BASE]]))));
}

// ---------- start ----------
async function boot(){
 if(!A.token){drawLogin(BASE?'':'이 페이지에 게임 서버 주소가 없습니다.');return;}
 try{const s=await api('/admin/session');A.admin=s.admin;A.server=s.server;await enter();}
 catch(e){if(e.status!==401)drawLogin(e.message);}
}
boot();
})();
