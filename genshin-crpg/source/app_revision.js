/* Current game interface: all navigation and gameplay controls use the public policy. */
function actionButton(label,type,params={},primary=false){
  const reason=game?.actionReason(type,params)||'';
  const b=button(label,()=>act(type,params),!!reason||busy,primary);
  if(reason){b.title=reason;b.setAttribute('aria-description',reason);}
  return b;
}
function xpMeter(parent,owner='PLAYER_CUSTOM'){
  const growth=game.growth(owner),box=el('div','xp-block');
  if(growth.max)box.append(el('div','stat','Lv. 20 · 최대 레벨'));
  else {box.append(el('div','stat','경험치 '+growth.xp.toLocaleString()+' / '+growth.next.toLocaleString()));
    const bar=el('progress','xp-progress');bar.max=growth.next;bar.value=growth.xp;bar.setAttribute('aria-label','다음 레벨까지의 경험치');box.append(bar);}
  parent.append(box);
}
sidebar=function(g,v){
  const side=el('aside'),p=el('section','player-card');
  p.append(el('div','eyebrow','DAY '+g.WORLD_DAY+' · '+g.WORLD_TIME),el('h2','',g.PLAYER_NAME),el('p','muted player-location',v.map[2]));
  const actor=game.s.runtime?.actors.find(a=>a.source==='PLAYER_CUSTOM');
  meter(p,'HP',actor?.hp??g.PLAYER_HP_CURRENT,actor?.maxHp??g.PLAYER_HP_MAX);
  p.append(el('div','stat','Lv. '+g.PLAYER_LEVEL_STATE+' · '+routeName(g.STORY_ROUTE_ID)));xpMeter(p);
  p.append(el('div','stat',Number(g.MORA).toLocaleString()+' 모라'));side.append(p);
  const phase=game.playPhase(),message={STORY:'이야기 진행 중',STORY_LOCKED:'이야기 진행 중',CUTIN:'전투 대화 진행 중',COMBAT:'전투 중',COMBAT_OPENING:'전투 시작 대기',PREPARATION:'전투 준비',RECOVERY:'전투 직전부터 재도전',FREE:'자유행동',DOWNED:'전투불능 · 회복 필요',LIFE:'생활 작업 중'}[phase];
  side.append(el('div','phase-note',message));
  const nav=el('nav');nav.setAttribute('aria-label','게임 메뉴');
  for(const [screen,label,icon]of [['STORY','이야기','✧'],['STATUS','성장·능력치','◈'],['LOCATION','메인 화면','⌂'],['PARTY','편성','♙'],['INVENTORY','아이템','▣'],['QUEST','임무','♢'],['RELATIONS','호감도','♡'],['SYSTEM','저장·설정','⚙']]){
    const b=actionButton('', 'MENU',{screen});b.append(el('span','nav-icon',icon),el('span','',label));b.dataset.screen=screen;
    if(g.SCREEN_MODE===screen)b.classList.add('active');nav.append(b);
  }
  side.append(nav);return side;
};
function growthScreen(p){
  p.append(el('h1','','성장·능력치'));
  const owners=game.s.party.filter(x=>x.active).map(x=>x.source);
  for(const id of owners){const growth=game.growth(id),a=game.s.runtime?.actors.find(a=>a.source===id)||(id==='PLAYER_CUSTOM'?game.player():game.character(id)),c=el('section','card');
    c.append(el('h2','',growth.name+' · Lv. '+growth.level));meter(c,'HP',a.hp,a.maxHp);xpMeter(c,id);
    const dl=el('dl','stat-grid');for(const [label,value]of [['공격력',a.atk],['방어력',a.def],['속도',a.spd],['치명타 확률',a.crit+'%'],['명중',a.hit+'%'],['회피',a.eva+'%']])dl.append(el('dt','',label),el('dd','',typeof value==='number'?Math.round(value):value));c.append(dl);p.append(c);
  }
  p.append(actionButton(game.s.runtime?'전투로 돌아가기':'이야기로 돌아가기','MENU',{screen:game.s.runtime&&!game.s.runtime.interlude?'COMBAT':'STORY'},true));
}
const revisionStory=story;
story=function(p,v){
  if(game.isStoryWaiting()){p.append(el('h1','','이야기의 쉼표'),el('p','story',displayText(game.storyDisplayText?.(v.node)||'현재 이야기 구간을 마쳤습니다.')));chapterActions(p);if(game.playPhase()==='FREE')p.append(actionButton('주변 둘러보기','MENU',{screen:'LOCATION'}));return;}
  if(v.node?.[5]!=='INPUT_TEXT'){revisionStory(p,v);return;}
  const node=v.node;
  p.append(el('p','speaker',node[7]||'이야기'),el('p','story',displayText(game.storyDisplayText?.(node)??node[9])),el('p','chosen-name',game.s.global.PLAYER_NAME));
  p.append(actionButton('정한 이름을 알려준다','STORY_NAME',{name:game.s.global.PLAYER_NAME},true));
};
fresh=async function(){
  if(busy)return;
  const reason=game?.actionReason('TITLE');if(reason){say(reason);return;}
  busy=true;try{if(game)await storeSave();game=null;selectedNPC=null;activeSaveSlot=null;sceneHistory.length=0;}catch{}finally{busy=false;render();}
};
const beginRevision=begin;begin=async function(name,route){if(game){say('현재 여정을 마친 뒤 제목 화면에서 새 여정을 시작해 주세요.');return;}selectedNPC=null;return beginRevision(name,route);};
let saveQueue=Promise.resolve();
storeSave=function(){
  const sourceGame=game;if(!sourceGame)return Promise.resolve();
  const slot=activeSaveSlot||'auto:'+sourceGame.s.global.SAVE_ID,snapshot=JSON.parse(sourceGame.serialize());
  const task=saveQueue.catch(()=>{}).then(async()=>{
    if(!saveStore)throw Error('자동 저장소를 사용할 수 없습니다.');
    const record=await saveStore.save(slot,snapshot,{expectedSlotRevision:slotRevisions.get(slot)||0,name:'자동 저장'});
    slotRevisions.set(slot,record.slotRevision);if(game===sourceGame){saveFailed=false;lastSaveError='';updateQuick();}return record;
  }).catch(e=>{if(game===sourceGame){saveFailed=true;lastSaveError='저장하지 못했습니다. '+e.message+' 백업 파일 내보내기로 현재 진행을 보관할 수 있습니다.';say('');}throw e;});
  saveQueue=task;return task;
};
async function storeStoryCheckpoint(snapshot){
  if(!saveStore)return;
  const id='checkpoint:latest:'+(activeSaveSlot||'auto:'+snapshot.global.SAVE_ID);
  const previous=(await saveStore.list()).find(x=>x.slotId===id);
  const record=await saveStore.save(id,snapshot,{expectedSlotRevision:previous?.slotRevision||0,name:snapshot.global.PLAYER_NAME+' · 최근 이야기 시작 전'});
  slotRevisions.set(id,record.slotRevision);
}
function restoreUIState(){selectedNPC=game?.s.global.CURRENT_NPC_ENTITY_ID||null;if(!selectedNPC&&game?.s.global.SCREEN_MODE==='DIALOGUE'){const receipt=parseUI(game.s.global.LAST_ACTION_RECEIPT_JSON);if(receipt.type==='NPC')selectedNPC=receipt.result?.entity||null;}selectedCard='PLAYER_BASIC_ATTACK';selectedTarget=null;}
const loadSlotRevision=loadSlot;
loadSlot=async function(id){if(busy)return;busy=true;try{await saveQueue.catch(()=>{});await loadSlotRevision(id);restoreUIState();}finally{busy=false;render();}};
const manualSaveRevision=manualSave;
manualSave=async function(){if(busy)return;busy=true;try{await saveQueue.catch(()=>{});await manualSaveRevision();}finally{busy=false;render();}};
loadFile=function(){
  if(busy)return;const f=el('input');f.type='file';f.accept='.json,application/json';
  f.onchange=async()=>{if(!f.files[0]||busy)return;busy=true;
    try{await saveQueue.catch(()=>{});const text=await f.files[0].text();if(!saveStore)throw Error('저장소를 사용할 수 없습니다. 현재 게임은 유지됩니다.');
      const parsed=saveStore.parseImport(text),candidate=new Runtime(DB,parsed.state),slot='branch:'+candidate.s.global.SAVE_ID+':'+Date.now();
      const record=await saveStore.importJSON(slot,text,{expectedSlotRevision:0,name:candidate.s.global.PLAYER_NAME+' · 가져온 여정'});
      game=candidate;activeSaveSlot=slot;autoSavePaused=false;slotRevisions.set(slot,record.slotRevision);applySettings();restoreUIState();sceneHistory.length=0;saveFailed=false;lastSaveError='';say('기존 슬롯을 보존하고 저장 파일을 불러왔습니다.');
    }catch(e){say('불러오지 못했습니다. '+e.message);}finally{busy=false;render();}
  };f.click();
};
function downloadText(data,filename){const a=el('a');a.href=URL.createObjectURL(new Blob([data],{type:'application/json'}));a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
const slotsRevision=slotsUI;
slotsUI=async function(container){await slotsRevision(container);if(!container.isConnected||!saveStore)return;const list=await saveStore.list();const cards=[...container.querySelectorAll('.slot')];list.forEach((rec,i)=>cards[i]?.append(button('원본 백업 파일 내보내기',async()=>{try{downloadText(await saveStore.exportSlot(rec.slotId), 'CRPG_'+rec.saveId+'.json');}catch(e){say(e.message);}})));};
const systemRevision=system;
system=function(p){systemRevision(p);const reason=game.actionReason('TITLE');for(const b of p.querySelectorAll('button'))if(b.textContent==='제목 화면으로'){b.disabled=!!reason;b.title=reason;}p.append(el('h2','','게임 규칙'),button('전투 규칙 보기',showRules));};
function showRules(){const box=el('div');for(const rule of CRPGRuntime.rulesSummary||[])box.append(el('h3','',rule.title),el('p','',rule.text));showModal('전투 규칙',box);}
const inventoryRevision=inventory;
inventory=function(p){inventoryRevision(p);const reason=game.actionReason('EQUIP');if(reason){p.prepend(el('p','phase-note','내용을 확인할 수 있습니다. 사용·편성·장착은 현재 장면을 마친 뒤 가능합니다.'));for(const b of p.querySelectorAll('button')){b.disabled=true;b.title=reason;}for(const input of p.querySelectorAll('select,input'))input.disabled=true;}};
const questsRevision=quests;
quests=function(p,v){questsRevision(p,v);const reason=game.actionReason('QUEST_CHOICE');if(reason){p.prepend(el('p','phase-note','현재 이야기와 임무 기록을 확인하는 화면입니다. 진행 중인 장면으로 돌아가 주세요.'));for(const b of p.querySelectorAll('button')){b.disabled=true;b.title=reason;}}};
const rewardRevision=reward;
reward=function(p){rewardRevision(p);if(game.s.storyRecovery)p.append(actionButton('전투 직전으로 돌아가 재도전','STORY_RETRY',{},true));for(const b of p.querySelectorAll('button')){const label=b.textContent;const screen=label==='장소로 돌아가기'?'LOCATION':label==='이곳의 의뢰·보상 확인'?'QUEST':null;if(screen){const reason=game.actionReason('MENU',{screen});b.disabled=!!reason;b.title=reason;}}};
const renderRevision=render;
render=function(){
  if(game?.s.global.SCREEN_MODE==='STATUS'){
    enforceExposure();root.replaceChildren();updateQuick();const main=el('main'),body=el('div','content'),p=panel();main.append(sidebar(game.s.global,game.view()),body);body.append(p);root.append(main);growthScreen(p);return;
  }
  renderRevision();const link=document.querySelector('.wordmark'),reason=game?.actionReason('TITLE')||'';link.setAttribute('aria-disabled',String(!!reason));link.title=reason;
};
boot=async function(){
  try{settings={...settings,...parseUI(localStorage.getItem('crpg-preferences-v3'))};}catch{}applySettings();
  if(window.CRPGSave?.SaveAdapter){
    saveStore=new CRPGSave.SaveAdapter({contentVersion:MANIFEST.saveCompatibilityVersion||MANIFEST.contentVersion,compatibleContentVersions:MANIFEST.compatibleSaveVersions||[],migrate:CRPGRelationships.migrateState,validate:s=>new Runtime(DB,s).s});
    try{await saveStore.open();}catch(e){saveStore=null;saveFailed=true;lastSaveError='자동 저장소를 열지 못했습니다. 백업 파일 내보내기를 이용해 주세요.';say('');}
    if(saveStore)try{const existing=await saveStore.list(),legacy=localStorage.getItem('crpg-latest');if(legacy&&!existing.some(x=>x.saveId===legacy))await saveStore.importLegacyLocalStorage('legacy:'+legacy,{key:'crpg-save:'+legacy,name:'이전 저장'});}catch(e){say('이전 저장을 자동으로 가져오지 못했습니다. 현재 저장소는 정상 사용할 수 있습니다.');}
  }
  render();
  if('serviceWorker'in navigator&&location.protocol!=='file:')try{const reg=await navigator.serviceWorker.register('sw.js');await navigator.serviceWorker.ready;navigator.serviceWorker.addEventListener('message',e=>{if(e.data?.type==='PACK_READY')window.CRPG_OFFLINE_READY=true;});reg.active?.postMessage({type:'PACK_STATUS'});}catch(e){say('오프라인 기능을 시작하지 못했습니다. '+e.message);}
};
window.CRPG_APP={get game(){return game;},begin:(...a)=>begin(...a),act:(...a)=>act(...a),render:()=>render(),get settings(){return settings;},get saveStore(){return saveStore;}};
// Boot runs after the formation and presentation modules have installed.
// Player-facing status names cover runtime effects as well as database rows.
const combatStatusNames={LIFTED:'띄워짐',LEVITATION:'부양',ANEMO_VULN:'바람 피해 취약',REACTION_BOOST:'반응 강화',BOSS_CONTROL:'행동 둔화',PHYS_VULN:'물리 피해 취약',ILLUSORY_BUBBLE:'포영',OMEN:'성이',QUICKEN:'활성',SKILL_COEFF:'스킬 강화',DILUC_INFUSION:'불 원소 부여',FALLBACK_DEFENSE:'피해 감소',NOELLE_SWEEP:'대청소',MIKA_SPEED:'속도 증가',HAWK_FEATHER:'매의 깃털',THUNDERWOLF:'늑대의 영혼',ENCOURAGEMENT_ATK:'공격력 격려',ENCOURAGEMENT_TAG:'격려',ROSARIA_NIGHT:'밤의 은혜',ROSARIA_BEHIND:'후방 치명타 증가',ROSARIA_CRIT_SHARE:'치명타 공유',EULA_GRIMHEART:'냉혹한 마음',EULA_CRYO_PHYSICAL_VULN:'얼음·물리 피해 취약',STATUS_ELECTROCHARGED:'감전',STATUS_BURN:'연소'};
const safeNameRevision=safeName;
safeName=function(table,id,col=1){return table==='13_STATUS_EFFECT_DB'&&combatStatusNames[id]?combatStatusNames[id]:safeNameRevision(table,id,col);};
const growthRevision=growthScreen;
growthScreen=function(p){growthRevision(p);const eligibility=parseUI(game.s.global.COMPANION_ELIGIBILITY_JSON),owners=game.s.party.filter(x=>x.active).map(x=>x.source);
  for(const id of ['MAT_CHAR_EXP_WANDERER','MAT_CHAR_EXP_ADVENTURER','MAT_CHAR_EXP_HERO']){const count=game.itemCount(id);if(!count)continue;const card=el('section','card');card.append(el('h2','',safeName('14_ITEM_DB',id)+' · '+count+'개'),el('p','muted','경험치 '+({MAT_CHAR_EXP_WANDERER:50,MAT_CHAR_EXP_ADVENTURER:250,MAT_CHAR_EXP_HERO:1000}[id]).toLocaleString()+' · 1개 사용'));
    for(const owner of owners){const g=game.growth(owner),b=actionButton(g.name+'에게 사용','USE_ITEM',{item:id,quantity:1,owner});if(g.max){b.disabled=true;b.title='최대 레벨입니다.';}card.append(b);}p.append(card);
  }
};
const combatRevision=combat;
combat=function(p){combatRevision(p);const b=game.s.runtime,box=el('section','battle-map-panel');box.append(el('h2','','전장 위치'),el('p','muted','같은 칸과 상하좌우 한 칸이 인접 범위입니다.'));
 const grid=el('div','battle-map');grid.setAttribute('aria-label','6열 4행 전장 위치');
 const fieldNames={KLEE_MINE:'통통 폭탄',MIST_TRACE:'안개 흔적',PHANTOM:'물의 허영',DENDRO_CORE:'풀 원핵',OZ:'오즈',WIND_SPIRIT:'바람 정령',ICE:'얼음 고드름',DANDELION:'민들레 영역',ROSE:'장미의 뇌광',BUNNY:'폭탄 인형'};
 for(let y=0;y<4;y++)for(let x=0;x<6;x++){const cell=el('div','battle-cell');cell.setAttribute('aria-label',(x+1)+'열 '+(y+1)+'행');for(const a of b.actors.filter(a=>a.hp>0&&a.position?.x===x&&a.position?.y===y)){const tag=el('span','map-actor '+a.side.toLowerCase(),a.name);tag.title=a.name+' · '+({SMALL:'소형',MEDIUM:'중형',LARGE:'대형',BOSS:'보스'}[a.size]||'중형');cell.append(tag);}for(const f of b.fields.filter(f=>!f.done&&f.position?.x===x&&f.position?.y===y&&fieldNames[f.kind]))cell.append(el('small','map-field',fieldNames[f.kind]));grid.append(cell);}box.append(grid);p.append(box);
};

const prepareRevision=battlePrepare;
battlePrepare=function(p){prepareRevision(p);const group=game.row('33_ENCOUNTER_GROUP_DB',game.s.battlePreparation.group),members=game.combatRows('49_ENCOUNTER_MEMBER_DB').filter(r=>r[1]===group[0]);
 const note=el('section','card preparation-guide');note.append(el('h2','','전투 전 확인'),el('p','',members.map(m=>{const e=game.row('09_MONSTER_DB',m[3]);return e[1]+' · '+(group[6]==='PARTY_BANDED'?'파티 레벨에 맞춰 등장':'Lv. '+e[18]);}).join(' / ')),el('p','muted','편성·장비에서 동료와 장비를, 소지품에서 식사와 전술 도구를 준비할 수 있습니다. 패배하면 전투 직전 상태로 돌아가 편성을 바꾸어 재도전할 수 있습니다.'));
 if(game.combatStoryConfig(group[0]))note.append(el('p','muted','공중의 적에게는 원거리 공격 또는 부양·발판이 필요합니다. 지형이 모두 무너지기 전에 전투를 마쳐야 합니다.'));
 note.append(actionButton('편성·장비 확인','MENU',{screen:'PARTY'}),actionButton('소지품 확인','MENU',{screen:'INVENTORY'}),actionButton('성장 확인','MENU',{screen:'STATUS'}));p.prepend(note);
};
