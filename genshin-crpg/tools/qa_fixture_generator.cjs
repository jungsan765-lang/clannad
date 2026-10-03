#!/usr/bin/env node
'use strict';
// Local, disposable QA only. This tool and its output are outside the production build's copy list.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),http=require('node:http'),assert=require('node:assert/strict');
const project=path.resolve(__dirname,'..');
function args(argv){
 const out={output:path.join(os.tmpdir(),'crpg-qa-preview'),gameDir:path.join(project,'dist'),gameUrl:'http://127.0.0.1:4177/game/',serve:false};
 for(let i=0;i<argv.length;i++){
  const k=argv[i];if(k==='--help'){console.log('node tools/qa_fixture_generator.cjs [--output DIR] [--game-dir DIR] [--game-url http://127.0.0.1:4177/game/] [--serve]\nGenerates twelve disposable QA fixtures and an isolated same-origin preview. --serve reads game files without modifying them; open /qa/qa.html. Loopback HTTP only.');process.exit(0);}
  if(k==='--serve'){out.serve=true;continue;}
  const key={'--output':'output','--game-dir':'gameDir','--game-url':'gameUrl'}[k];if(!key||!argv[i+1])throw Error('Unknown or incomplete argument: '+k);out[key]=argv[++i];
 }return out;
}
function canonical(p){p=path.resolve(p);if(fs.existsSync(p))return fs.realpathSync(p);return path.join(canonical(path.dirname(p)),path.basename(p));}
function inside(parent,child){const rel=path.relative(parent,child);return !rel||(!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));}
const opt=args(process.argv.slice(2)),url=new URL(opt.gameUrl);
if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.search||url.hash||!url.pathname.endsWith('/')||url.pathname==='/qa/'||url.pathname.startsWith('/qa/'))throw Error('--game-url must be an HTTP loopback directory URL without credentials, query or hash, outside /qa/.');
opt.gameUrl=url.href;opt.gameDir=canonical(opt.gameDir);opt.output=canonical(opt.output);
for(const p of [opt.gameDir,...['source','dist','.local/dist','assets','content','server','public'].map(x=>canonical(path.join(project,x)))])if(inside(p,opt.output))throw Error('QA output must be outside game/build/source directories: '+p);
if(!fs.existsSync(path.join(opt.gameDir,'index.html')))throw Error('Build the game separately first, or pass --game-dir pointing to an existing local build.');
if(fs.existsSync(opt.output)&&fs.readdirSync(opt.output).length&&!fs.existsSync(path.join(opt.output,'.crpg-qa-output')))throw Error('Refusing to overwrite a non-QA output directory.');
fs.mkdirSync(path.join(opt.output,'fixtures'),{recursive:true});fs.writeFileSync(path.join(opt.output,'.crpg-qa-output'),'Disposable local QA output\n');

const {c,db,R,fresh}=require('../tests/helpers_v011.cjs'),{fixture}=require('../tests/helpers_abyss.cjs');
c.CRPGRelationships.install(c.CRPGRuntime,{events:c.CRPGRelationships.catalogFromDB(db),activities:c.CRPGRelationships.activitiesFromDB(db),preferences:{adultModeEnabled:false},eligibility:{profiles:{},protagonists:{}}});
const TEAM=['MOND_AMBER','MOND_KAEYA','MOND_LISA'],catalog=[],nativeBase=new Map(['ROUTE_TRAVELER','ROUTE_ISEKAI'].map(route=>{const r=new R(db);r.newGame({name:'기준',route,seed:71247,saveId:'QA-BASE-'+route});return [route,Object.fromEntries(['PLAYER_BASE_HP','PLAYER_BASE_ATK','PLAYER_BASE_DEF','PLAYER_BASE_SPD'].map(k=>[k,r.s.global[k]]))];}));
function basic(level=5,map='MAP_MOND_CITY',route='ROUTE_TRAVELER'){
 const r=fresh(map,route);r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'level',value:level});delete r.serverAdmin;
 Object.assign(r.s.global,{SCREEN_MODE:'LOCATION',STORY_WAITING:true,STORY_NEXT_PREPARED:''});
 r.s.flags.FLAG_TRV_MON_PROLOGUE_CLEAR=true;r.s.flags.FLAG_ISK_MON_PROLOGUE_CLEAR=true;r.s.flags.FLAG_ISK_MAIN_UNLOCKED=true;return r;
}
function party(level=12,enhance=4){
 const r=fixture(level,TEAM,enhance,'ROUTE_TRAVELER');
 // helpers_abyss uses real level/gear formulas; no base-stat, enemy-stat, rarity or talent overrides.
 delete r.serverAdmin;Object.assign(r.s.global,{CURRENT_MAP_ID:'MAP_MOND_CITY',SCREEN_MODE:'LOCATION',STORY_WAITING:true,STORY_NEXT_PREPARED:''});
 r.s.flags.FLAG_TRV_MON_PROLOGUE_CLEAR=true;return r;
}
function add(id,title,r,notes,ui=null){
 const state=r?JSON.parse(r.serialize()):null;
 if(r){const loaded=new R(db,state);for(const [key,value]of Object.entries(nativeBase.get(state.global.STORY_ROUTE_ID)))assert.equal(loaded.s.global[key],value,'Native base stat changed: '+key);assert(loaded.s.global.PLAYER_ATK_CURRENT<10000);assert(loaded.s.global.PLAYER_LEVEL_STATE<=20);}
 const item={id,title,file:'fixtures/'+id+'.json',notes,ui,level:state?.global.PLAYER_LEVEL_STATE??null,attack:state?.global.PLAYER_ATK_CURRENT??null,screen:state?.global.SCREEN_MODE||'TITLE'};
 fs.writeFileSync(path.join(opt.output,item.file),JSON.stringify({fixture:id,state,ui},null,2)+'\n');catalog.push(item);
}
add('00-title','제목·새 게임',null,'제목, 루트 선택, 이름 입력, 설정. 이 래퍼는 온라인 로그인 화면을 포함하지 않습니다.');
for(const [id,title,route]of [['01-traveler','여행자 도입 대화','ROUTE_TRAVELER'],['02-isekai','이세계인 도입 대화','ROUTE_ISEKAI']]){
 const r=new R(db);r.newGame({name:'화면 검사',route,seed:71247,saveId:'QA-'+id});add(id,title,r,'실제 신규 저장의 첫 장면. 대화·선택지·초상·뒤로 가기·기록을 확인합니다.');
}
add('03-field','Lv.5 메인·지도',basic(5,'MAP_MOND_PLAINS'),'지도 이동 버튼, 핸드북, 메뉴, 야외 작업, 작업 중 취소/복귀를 확인합니다.');
{
 const r=party();r.action('MENU',{screen:'PARTY'});add('04-party','Lv.12 편성·캐릭터',r,'4인 편성. 레벨 공식과 실제 +4 장비. 교체·전술·장비·프리셋을 화면에서 조작합니다.');
}
{
 const r=party(15,6);for(const id of ['ORE_IRON','ORE_CRYSTAL','ING_APPLE','ING_RICE','FOOD_HASH_BROWN','MAT_CHAR_EXP_HERO'])r.giveItem(id,8);
 r.giveEquipment('EQ_SWORD_HARBINGER');r.action('MENU',{screen:'INVENTORY'});add('05-inventory','Lv.15 가방·상세',r,'일반 장비·재료·음식의 검색, 정렬, 상세창, 사용 대상을 확인합니다.');
}
{
 const r=basic(10,'MAP_LIYUE_HARBOR'),d=r.storyDefinition('LEG_LIYUE_XIANGLING');
 Object.assign(r.questState('Q_TRV_LIYUE_01'),{state:'완료',claimed:true,completedTurn:0,acceptedTurn:0});r.ensureLiyue().access={phase:'OPEN'};r.s.flags.FLAG_ACCESS_REGION_LIYUE=true;
 r.s.guildLegends={[d.id]:{day:r.s.global.WORLD_DAY}};r.s.inventory=r.s.inventory.filter(i=>!i.item);
 const cost=r.legendEffectiveCost(d);r.s.global.MORA=cost.mora;for(const [id,n]of Object.entries(cost.items))r.giveItem(id,n);
 r.action('LEGEND_ENTER',{quest:d.id});
 for(let i=0;i<100&&!r.storyChoices().some(n=>/LEGEND_ACCEPT_AND_PAY/.test(n[12]));i++){
  const choices=r.storyChoices();if(choices.length)r.action('STORY_CHOICE',{node:choices[0][4]});else{const n=r.storyNode();assert(n&&!r.s.storyJourney);r.action('STORY_NEXT',{node:n[4]});}
 }
 assert(r.storyChoices().some(n=>/LEGEND_ACCEPT_AND_PAY/.test(n[12])));
 add('06-personal','Lv.10 개인 임무 수락',r,'현재 목록의 비용만 가진 수락 직전 상태. 긴 비용 표시, 수락·보류, 실제 차감과 다음 장면을 확인합니다.');
}
{
 const r=party(20,6);r.s.global.MORA=20000;
 for(const id of ['ORE_IRON','ORE_CRYSTAL','TRPG_SCRAP_METAL'])r.giveItem(id,20);
 const eq=r.s.inventory.find(i=>i.equip&&i.owner==='PLAYER_CUSTOM'&&i.category==='WEAPON');eq.enhance=10;r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.s.global.PLAYER_HP_MAX;
 const p=r.placeEntries().find(p=>p.merchant==='MRC_MOND_EQUIP');assert(p);r.action('PLACE_ENTER',{place:p.id,mode:'CRAFT'});
 add('07-forge','Lv.20 제작·강화·돌파',r,'실제 대장간 입장. +6 장비와 주인공 무기 +10. 강화·돌파 탭, 확률표·재료 부족·확인창을 검사합니다.');
}
{
 const r=basic(8);r.s.global.MORA=5000;const p=r.placeEntries().find(p=>p.merchant==='MRC_MOND_GENERAL');assert(p);r.action('PLACE_ENTER',{place:p.id,mode:'SHOP'});
 add('08-shop','Lv.8 상점',r,'실제 상점 입장. 구매 수량, 잔액, 품목 설명, 부족 상태와 뒤로 가기를 검사합니다.');
}
{
 const r=party(10,4);r.s.global.CURRENT_MAP_ID='MAP_MOND_PLAINS';r.startBattle('EG_MOND_HILI_PATROL','RANDOM');
 add('09-combat','Lv.10 일반 전투',r,'Lv.10 4인·+4 장비와 원래 적 수치. 전투 시작, 카드/대상 선택, 차례·연출·이탈·결과를 직접 진행합니다.');
}
{
 const r=basic(10),chest=c.CRPGRuntime.chestRules.chests.find(x=>x.how==='SCENERY'&&x.game==='ROTATE');assert(chest);
 r.s.global.CURRENT_MAP_ID=chest.map;assert.equal(r.chestReason(chest.id),'');
 add('10-puzzle','공개 퍼즐 UI',r,'공개 퍼즐 하나의 버튼·힌트·확대 글꼴·닫기·정답 후 연출. 비밀상자 위치/정답은 안내하지 않습니다.',{kind:'PUBLIC_PUZZLE',id:chest.id});
}
{
 const r=party(12,4),d=r.storyDefinition('AFF_MOND_AMBER_H01');Object.assign(r.questState(d.REQUIRED_QUEST_ID),{state:'완료',claimed:true,completedTurn:0,acceptedTurn:0});
 for(const flag of JSON.parse(d.REQUIRED_FLAGS||'[]'))r.s.flags[flag]=true;
 r.markContact(d.PROFILE_ID);const relation=r.s.relations[d.PROFILE_ID];relation.BOND_SCORE=Number(d.BOND_SCORE_MIN);relation.bondScore=relation.BOND_SCORE;relation.heart=1;
 r.action('AFFECTION_ENTER',{event:d.id});add('11-affection','관계 이야기',r,'선행 조건만 합성한 일반 H01. 실제 대사/선택/보류/완료 화면을 확인합니다. 서사 내용은 보고서에 옮기지 않습니다.');
}
const manifest={createdAt:new Date().toISOString(),gameUrl:opt.gameUrl,appVersion:JSON.parse(fs.readFileSync(path.join(project,'package.json'))).version,scope:'Local synthetic UI fixtures. No production accounts or persistence. Logic/visual QA only, not a full-play or balance certification.',widths:[320,360,390,412,430,768,1100,1920,2560,3840],heights:[568,640,740,800,844,900,1080,1440,2160],fonts:[100,125,150],fixtures:catalog};
fs.writeFileSync(path.join(opt.output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');

function qaEnvironment(){
 // Per-frame in-memory preferences; do not read or overwrite a developer's local saves/settings.
 const memory=()=>{const entries=new Map();return {get length(){return entries.size;},getItem:k=>entries.has(String(k))?entries.get(String(k)):null,setItem:(k,v)=>entries.set(String(k),String(v)),removeItem:k=>entries.delete(String(k)),clear:()=>entries.clear(),key:i=>[...entries.keys()][i]??null};};
 Object.defineProperty(window,'localStorage',{value:memory(),configurable:true});
 Object.defineProperty(window,'sessionStorage',{value:memory(),configurable:true});
 // Keep the actual version badge UI, but never update/register an existing worker from this preview.
 Object.defineProperty(navigator,'serviceWorker',{value:{controller:null,getRegistration:async()=>undefined,getRegistrations:async()=>[],register:async()=>{throw Error('QA preview does not register service workers.');},addEventListener(){},removeEventListener(){}},configurable:true});
}
function qaPreboot(){
 // Replace only the preview's boot/persistence hooks, before app_av invokes boot.
 window.CRPG_QA_LOCAL=true;
 boot=async function(){saveStore=null;activeSaveSlot=null;settings.uiTutorialVersion=1;settings.audioEnabled=false;settings.reducedMotion=true;applySettings();render();};
 storeSave=async function(){};storeStoryCheckpoint=async function(){};persistSettings=async function(){applySettings();};
}
function qaBridge(){
 if(!['127.0.0.1','localhost','[::1]'].includes(location.hostname)||location.origin!==parent.location.origin)throw Error('QA requires same-origin loopback hosting.');
 window.CRPG_QA_READY=false;
 // app_revision replaces the app.js facade; restore its original loadState behavior only in this generated wrapper.
 CRPG_APP.loadState=function(state){
  if(busy)throw Error('진행 중인 활동이 끝난 뒤 상태를 바꿔 주세요.');
  document.querySelectorAll('dialog,[role="dialog"],.wish-screen').forEach(n=>{if(n.id==='modal')n.close?.();else n.remove();});
  window.CRPGChests?.close?.();window.CRPGHandbook?.close?.();window.CRPGShell?.menuToggle?.(false);
  game=state===null?null:new Runtime(DB,JSON.parse(JSON.stringify(state)));activeSaveSlot=null;saveFailed=false;sceneHistory.length=0;
  if(window.CRPGShell){CRPGShell.screen=null;CRPGShell.tabs={};CRPGShell.restoreView=null;}
  applySettings();render();
 };
 window.CRPG_QA={
  font(value){if(![100,125,150].includes(value))throw Error('Unsupported font size');settings.fontScale=value;applySettings();render();},
  puzzle(id){const chest=game?.chestsHere('SCENERY').find(x=>x.id===id&&x.how==='SCENERY');if(!chest)throw Error('Public puzzle is not available in this state.');CRPGChests.start(chest);},
  inspect(){
   const ww=innerWidth,hh=innerHeight,visible=e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden';
   const overflow=[...document.querySelectorAll('body *')].filter(e=>visible(e)&&e.children.length===0).map(e=>({e,r:e.getBoundingClientRect()})).filter(x=>x.r.width>0&&(x.r.left< -2||x.r.right>ww+2)).slice(0,40).map(x=>({tag:x.e.tagName,cls:x.e.className,left:Math.round(x.r.left),right:Math.round(x.r.right)}));
   const occluded=[...document.querySelectorAll('button,a,input,select')].filter(e=>visible(e)&&!e.disabled).map(e=>({e,r:e.getBoundingClientRect()})).filter(x=>x.r.top>=0&&x.r.bottom<=hh&&x.r.left>=0&&x.r.right<=ww).filter(x=>{const top=document.elementFromPoint(x.r.left+x.r.width/2,x.r.top+x.r.height/2);return top&&!x.e.contains(top)&&!top.contains(x.e);}).slice(0,40).map(x=>({tag:x.e.tagName,cls:x.e.className}));
   return {viewport:{width:ww,height:hh,dpr:devicePixelRatio},font:settings.fontScale,screen:game?.s.global.SCREEN_MODE||'TITLE',overflowCandidates:overflow,occludedCandidates:occluded,brokenImages:[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>new URL(i.src).pathname).slice(0,40)};
  }
 };
 window.CRPG_QA_READY=true;
}
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let gameHtml=fs.readFileSync(path.join(opt.gameDir,'index.html'),'utf8');
gameHtml=gameHtml.replace(/<base\b[^>]*>/gi,'').replace(/<head([^>]*)>/i,'<head$1><base href="'+esc(opt.gameUrl)+'"><meta name="robots" content="noindex,nofollow"><meta http-equiv="Content-Security-Policy" content="connect-src \'self\'; form-action \'none\'; worker-src \'none\'">');
gameHtml=gameHtml.replace(/(<head[^>]*>)/i,'$1<script>('+qaEnvironment.toString()+')();</script>');
gameHtml=gameHtml.replace(/<script\b[^>]*src=["'](?:online_config|app_online)\.js(?:\?[^"']*)?["'][^>]*><\/script>/gi,'');
const bootScript='<script>('+qaPreboot.toString()+')();</script>';
if(!/<script\b[^>]*src=["']app_av\.js/.test(gameHtml))throw Error('Preview bootstrap insertion point app_av.js is absent.');
gameHtml=gameHtml.replace(/(<script\b[^>]*src=["']app_av\.js[^>]*>)/,bootScript+'$1');
gameHtml=gameHtml.replace('</body>','<script>('+qaBridge.toString()+')();</script></body>');
fs.writeFileSync(path.join(opt.output,'qa-game.html'),gameHtml);

function previewController(){
 const $=s=>document.querySelector(s),frame=$('#game'),status=$('#status');let manifest,current=null;
 function note(s){status.textContent=s;}
 function local(){return ['127.0.0.1','localhost','[::1]'].includes(location.hostname)&&location.protocol==='http:';}
 function game(){const w=frame.contentWindow;if(!w?.CRPG_QA_READY)throw Error('게임 로딩을 기다려 주세요.');if(w.location.origin!==location.origin)throw Error('같은 출처에서 열어야 합니다.');return w;}
 async function load(id){
  try{const item=manifest.fixtures.find(x=>x.id===id),payload=await fetch(item.file,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('합성 저장 파일을 읽지 못했습니다.');return r.json();});
   game().CRPG_APP.loadState(payload.state);current=item;game().CRPG_QA.font(Number($('#font').value));$('#notes').textContent=item.notes;$('#puzzle').disabled=item.ui?.kind!=='PUBLIC_PUZZLE';
   note(item.title+' 불러옴 · 메모리에서만 실행');await new Promise(requestAnimationFrame);inspect();
  }catch(e){note(e.message);}
 }
 function inspect(){try{$('#result').textContent=JSON.stringify(game().CRPG_QA.inspect(),null,2);}catch(e){note(e.message);}}
 function size(width=Number($('#width').value),height=Number($('#height').value)){if(!Number.isInteger(width)||!Number.isInteger(height)||width<240||width>5120||height<240||height>2880){note('너비 240~5120, 높이 240~2880의 정수를 입력하세요.');return;}frame.style.width=width+'px';frame.style.height=height+'px';$('#custom-width').value=width;$('#custom-height').value=height;$('#size-note').textContent=width+' × '+height+' CSS px · 물리 기기/DPR/브라우저 확대와 별개';}
 function options(select,values){for(const value of values){const o=document.createElement('option');o.value=value;o.textContent=value;select.append(o);}}
 async function init(){
  if(!local())throw Error('127.0.0.1 / localhost / [::1]의 로컬 HTTP에서만 열 수 있습니다.');
  manifest=await fetch('manifest.json',{cache:'no-store'}).then(r=>r.json());if(new URL(manifest.gameUrl).origin!==location.origin)throw Error('--game-url과 QA 페이지를 같은 origin으로 제공해야 합니다.');
  options($('#width'),manifest.widths);options($('#height'),manifest.heights);options($('#font'),manifest.fonts);$('#width').value='390';$('#height').value='844';$('#font').value='100';size();
  for(const item of manifest.fixtures){const b=document.createElement('button');b.textContent=item.title;b.dataset.fixture=item.id;b.onclick=()=>load(item.id);$('#fixtures').append(b);}
  $('#resize').onclick=()=>size();$('#custom-size').onclick=()=>size(Number($('#custom-width').value),Number($('#custom-height').value));$('#apply-font').onclick=()=>{try{game().CRPG_QA.font(Number($('#font').value));inspect();}catch(e){note(e.message);}};
  $('#inspect').onclick=inspect;$('#reload').onclick=()=>current&&load(current.id);$('#puzzle').onclick=()=>{try{game().CRPG_QA.puzzle(current.ui.id);}catch(e){note(e.message);}};
  $('#download').onclick=()=>{try{const report={fixture:current?.id||'TITLE',...game().CRPG_QA.inspect(),note:$('#qa-note').value,at:new Date().toISOString()},a=document.createElement('a'),blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});a.href=URL.createObjectURL(blob);a.download='qa-'+(current?.id||'title')+'-'+parseInt(frame.style.width)+'x'+parseInt(frame.style.height)+'-'+$('#font').value+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}catch(e){note(e.message);}};
  frame.src='qa-game.html';frame.onload=()=>{try{game();note('로컬 게임 로딩 완료. 위 합성 상태 버튼을 눌러 시작하세요.');}catch(e){note('QA 로딩 실패: '+e.message+' 브라우저 콘솔과 게임 빌드 경로를 확인하세요.');}};
 }
 init().catch(e=>note(e.message));
}
const css='body{margin:0;background:#eef1f5;color:#162230;font:15px/1.5 system-ui,sans-serif}header{padding:16px;background:white}h1{margin:0 0 8px;font-size:22px}.controls,#fixtures{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}button,select,input{font:inherit;padding:8px;min-height:40px}#notes,#status{margin:8px 0}#viewport{overflow:auto;max-width:100vw;padding:8px;box-sizing:border-box}iframe{display:block;border:2px solid #65758b;background:#101722;max-width:none}details{padding:12px}pre{max-height:340px;overflow:auto;white-space:pre-wrap}#qa-note{width:min(600px,85vw)}';
const page=['<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>로컬 종합 화면 QA</title><style>'+css+'</style></head><body>',
 '<header><h1>로컬 종합 화면 QA</h1><p>합성 저장 · 운영 계정 연결 없음 · 자동 저장 없음. 스크린샷은 브라우저 도구로 찍고 아래 조건·결과 JSON을 함께 보관하세요.</p><div id="fixtures"></div>',
 '<div class="controls"><label>너비 <select id="width"></select></label><label>높이 <select id="height"></select></label><button id="resize">화면 크기 적용</button><label>직접 너비 <input id="custom-width" type="number" min="240" max="5120" style="width:6em"></label><label>직접 높이 <input id="custom-height" type="number" min="240" max="2880" style="width:6em"></label><button id="custom-size">지정 크기 적용</button><label>글꼴 % <select id="font"></select></label><button id="apply-font">글꼴 적용</button><button id="reload">현재 상태 초기화</button><button id="puzzle" disabled>공개 퍼즐 열기</button></div>',
 '<p id="size-note"></p><p id="notes"></p><p id="status" role="status">로딩 중</p></header><div id="viewport"><iframe id="game" title="격리된 로컬 게임 화면"></iframe></div>',
 '<details><summary>넘침·클릭 가림 후보와 결과 기록</summary><p>자동 후보는 오류 확정이 아닙니다. 모달 뒤의 버튼, 의도한 스크롤 영역은 제외하고 화면에서 재확인하세요.</p><button id="inspect">현재 화면 검사</button><input id="qa-note" aria-label="검사 메모" placeholder="증상·재현 단계·스크린샷 파일명"><button id="download">결과 JSON 저장</button><pre id="result"></pre></details>',
 '<script>('+previewController.toString()+')();</script></body></html>'].join('\n');
fs.writeFileSync(path.join(opt.output,'qa.html'),page);
fs.writeFileSync(path.join(opt.output,'README.txt'),'LOCAL QA ONLY\nOpen '+url.origin+'/qa/qa.html with this generator --serve.\nGame directory is read-only: '+opt.gameDir+'\nTwelve fixtures are validated through Runtime.serialize and a new Runtime load.\nNo online accounts, server mutations, service worker registration or automatic saves are used.\nThe isolated wrapper restores app.js loadState because app_revision replaces that facade.\nWidth/height are CSS viewport sizes; font scale uses the actual game setting. Real devices, browser zoom, touch keyboards and online flows still need separate tests.\n');
console.log(JSON.stringify({output:opt.output,fixtures:catalog.length,preview:url.origin+'/qa/qa.html',levels:catalog.map(x=>({id:x.id,level:x.level,attack:x.attack}))},null,2));
if(opt.serve){
 const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.css':'text/css; charset=utf-8','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff':'font/woff','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg','.mp4':'video/mp4'};
 const server=http.createServer((req,res)=>{try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  const pathname=decodeURIComponent(new URL(req.url,'http://local.invalid').pathname),isQa=pathname.startsWith('/qa/'),base=isQa?opt.output:opt.gameDir,prefix=isQa?'/qa/':url.pathname;
  if(!pathname.startsWith(prefix)){res.writeHead(404).end();return;}
  const file=canonical(path.join(base,pathname.slice(prefix.length)||'index.html'));if(!inside(base,file)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.setHeader('Cache-Control','no-store');res.setHeader('X-Robots-Tag','noindex,nofollow');
  if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
 }catch{res.writeHead(400).end();}});
 server.on('error',error=>{console.error('QA HTTP server could not start: '+error.message+' (choose an unused local port / permitted environment).');process.exitCode=1;});
 const bind=url.hostname==='[::1]'?'::1':'127.0.0.1';server.listen(Number(url.port||80),bind,()=>console.log('QA preview listening: '+url.origin+'/qa/qa.html'));
}
