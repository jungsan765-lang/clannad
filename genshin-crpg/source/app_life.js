/* Life activity surfaces, fishing controls, and useful item destinations. */
const lifePriorPanel=lifePanel;
lifePanel=function(parent){
 const entries=game.lifeEntries();if(!entries.length)return;const section=el('section','life-panel');section.append(el('h2','','이 구역의 생활 행동'));
 for(const entry of entries){const c=el('section','card life-resource');c.append(el('h3','',entry.label+' 전용 구역'),el('p','','오늘 남은 자원 '+entry.remaining+' / '+entry.limit+' · 다음 날 다시 생성'));
  if(entry.kind==='FISH'){c.append(el('p','','낚싯대와 과일 미끼 1개가 필요합니다. 입질 후 버튼을 눌렀다 놓으며 장력을 맞추세요.'),el('small','muted','기본 낚싯대 '+(game.itemCount('TRPG_FISHING_ROD')?'보유':'없음')+' · 미끼 '+game.itemCount(CRPGRuntime.lifeCatalog.bait)+'개'));
   if(!game.itemCount('TRPG_FISHING_ROD')||!game.itemCount(CRPGRuntime.lifeCatalog.bait))materialSources(c,game.itemCount('TRPG_FISHING_ROD')?CRPGRuntime.lifeCatalog.bait:'TRPG_FISHING_ROD');
  }else c.append(el('p','muted','작업 10초 · 게임 시간 10분'+(['GATHER','HUNT'].includes(entry.kind)?' · 적 조우 5%':'')));
  c.append(el('p','resource-preview',entry.pool.map(x=>safeName('14_ITEM_DB',x.item)+' '+x.min+(x.max!==x.min?'–'+x.max:'')+'개').join(' / ')));
  if(entry.kind==='MINE'&&game.view().map[1]==='몬드')c.append(el('small','muted',(game.s.global.CURRENT_MAP_ID==='MAP_DRAGONSPINE'?'성은 광석':'철광')+' 65% · 백철 30% · 수정덩이 5%'));
  if(entry.kind==='GATHER')c.append(el('small','muted','한 번에 두 묶음을 모읍니다.'));
  c.append(actionButton(entry.remaining?(entry.kind==='FISH'?'미끼 달고 낚싯줄 던지기':entry.label+' 시작 · 10초'):'오늘 자원 고갈','LIFE_START',{kind:entry.kind},true));section.append(c);
 }parent.append(section);
};
let fishingSession=null,fishingFrame=null;
const ordinaryLifeUI=updateLifeUI;
updateLifeUI=function(){
 cancelAnimationFrame(fishingFrame);const job=game?.s.lifeJob;
 if(!job||job.kind!=='FISH'){fishingSession=null;return ordinaryLifeUI();}
 clearTimeout(lifeUITimer);document.getElementById('life-work-status')?.remove();
 if(fishingSession?.id!==job.id)fishingSession={id:job.id,controls:[],holding:false,finishing:false};const session=fishingSession;
 // A restored fishing cast keeps its timer; it never grants a fish on reload.
 const box=el('section','fishing-panel');box.id='life-work-status';box.setAttribute('aria-label','낚시');
 const title=el('h2','','입질을 기다리는 중'),status=el('p','','물고기가 미끼를 물면 낚싯줄을 조절하세요.'),track=el('div','fishing-tension'),zone=el('div','fishing-zone'),cursor=el('div','fishing-cursor'),progress=el('progress'),percent=el('p','fishing-progress-label');
 track.setAttribute('role','meter');track.setAttribute('aria-label','낚싯줄 장력');track.setAttribute('aria-valuemin','0');track.setAttribute('aria-valuemax','100');track.append(zone,cursor);progress.max=100;progress.value=0;progress.setAttribute('aria-label','물고기 끌어올리기');
 const hold=button('길게 눌러 당기기',()=>{});hold.className='primary fishing-hold';hold.setAttribute('aria-pressed','false');
 const setHold=value=>{if(busy||session.finishing||session.holding===value)return;session.holding=value;session.controls.push({at:Math.min(job.duration,Math.max(0,Date.now()-job.startedAt)),hold:value});hold.setAttribute('aria-pressed',String(value));hold.textContent=value?'당기는 중 · 놓으면 장력이 내려갑니다':'길게 눌러 당기기';};
 hold.onpointerdown=e=>{e.preventDefault();hold.focus();hold.setPointerCapture?.(e.pointerId);setHold(true);};hold.onpointerup=hold.onpointercancel=()=>setHold(false);hold.onlostpointercapture=()=>setHold(false);hold.onkeydown=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();setHold(true);}};hold.onkeyup=e=>{if([' ','Enter'].includes(e.key)){e.preventDefault();setHold(false);}};hold.onblur=()=>setHold(false);
 box.append(el('small','eyebrow','낚시터'),title,status,el('p','muted','표시를 금색 구간 안에 유지하세요. 누르면 오른쪽, 놓으면 왼쪽으로 움직입니다. 키보드는 Space 또는 Enter.'),track,progress,percent,hold,actionButton('낚싯줄 걷기 · 미끼는 소모됩니다','LIFE_CANCEL'));document.querySelector('.content')?.prepend(box);if(!session.scrolled)queueMicrotask(()=>{if(box.isConnected){box.scrollIntoView({block:'start'});session.scrolled=true;}});
 const tick=()=>{if(game?.s.lifeJob?.id!==job.id||!box.isConnected)return;const elapsed=Math.min(job.duration,Math.max(0,Date.now()-job.startedAt)),s=CRPGFishing.simulate(job,session.controls,elapsed);zone.style.left=(s.target-.16)*100+'%';cursor.style.left=s.cursor*100+'%';track.setAttribute('aria-valuenow',String(Math.round(s.cursor*100)));progress.value=s.progress;percent.textContent='끌어올리기 '+Math.round(s.progress)+'% · '+Math.ceil(s.remaining/1000)+'초';title.textContent=s.bite?'물고기가 물었습니다!':'입질을 기다리는 중';status.textContent=!s.bite?'잠시 기다려 주세요.':Math.abs(s.cursor-s.target)<=.16?'장력이 알맞습니다. 이대로 유지하세요.':'금색 구간으로 장력을 맞춰 주세요.';hold.disabled=!s.bite||busy||session.finishing;
  if((s.caught||elapsed>=job.duration)&&!busy&&!session.finishing){session.finishing=true;act('LIFE_FINISH',{job:job.id,controls:session.controls,elapsed:Math.floor(elapsed)}).then(result=>{if(!result?.ok)session.finishing=false;});return;}fishingFrame=requestAnimationFrame(tick);
 };tick();
};
async function playWaitProgress(minutes){
 const overlay=el('div','travel-overlay wait-overlay');overlay.setAttribute('role','status');overlay.append(el('strong','','시간을 보내는 중'),el('span','',minutes+'분 기다리기'));const bar=el('progress');bar.max=3000;bar.value=0;bar.setAttribute('aria-label','기다리기 진행');overlay.append(bar);document.body.append(overlay);const started=performance.now();
 await new Promise(resolve=>{const tick=()=>{const elapsed=performance.now()-started;bar.value=Math.min(3000,elapsed);if(elapsed>=3000){overlay.remove();resolve();}else setTimeout(tick,30);};tick();});
}
function itemUses(id){return game.rows('48_RECIPE_INGREDIENT_DB').filter(r=>r[3]===id).map(r=>{try{return {recipe:game.recipeDefinition(r[1]),quantity:Number(r[4])};}catch{return null;}}).filter(x=>x&&x.recipe[1]!=='강화'&&!/레거시|사용 금지/.test(x.recipe[18]||''));}
function appendItemUses(box,d){
 if(d.kind==='EQUIPMENT')return;const uses=itemUses(d.id),section=el('section','item-uses');
 if(d.id==='TRPG_FISHING_ROD'||d.id===CRPGRuntime.lifeCatalog.bait)section.append(el('p','',d.id==='TRPG_FISHING_ROD'?'낚시터에서 낚시를 시작할 때 사용합니다. 낚싯대는 소모되지 않습니다.':'낚싯줄을 던질 때 1개 소모됩니다. 실패하거나 걷어도 사용한 미끼는 돌아오지 않습니다.'));
 if(uses.length){section.append(el('h3','','사용할 수 있는 제작법'));const list=el('div','item-use-list'),destinations=new Map();for(const {recipe:r,quantity}of uses){const row=el('div','item-use-row');row.append(el('strong','',safeName(r[2]==='EQUIP'?'16_EQUIP_DB':'14_ITEM_DB',r[3])+' ×'+r[4]),el('span','muted',r[1]+' · '+d.name+' '+quantity+'개 사용'));list.append(row);for(const place of game.placeEntries().filter(e=>e.modes.includes('CRAFT'))){const joint=game.jointCraftDefinition?.(r[0]),fits=!game.placeRecipeFacilityReason(r,place,game.s.global.CURRENT_MAP_ID)||(joint&&game.jointCraftEntryParts(joint,place,game.s.global.CURRENT_MAP_ID).length);if(fits&&!destinations.has(place.id))destinations.set(place.id,{place,recipe:r[0]});}}section.append(list);
  for(const {place,recipe}of destinations.values())section.append(button(placeName(place)+' · 제작하러 가기',()=>{focusedRecipe=recipe;act('PLACE_ENTER',{place:place.id,mode:'CRAFT'});},busy||!!game.actionReason('PLACE_ENTER',{place:place.id,mode:'CRAFT'}),true));
  if(!destinations.size)section.append(el('p','muted','마을의 해당 제작·조리시설에서 사용할 수 있습니다.'));
 }
 if(d.id.startsWith('ORE_'))section.append(el('p','muted','장비 제작·강화 재료입니다. 강화 단계마다 필요한 광물은 대장간에서 확인할 수 있습니다.'));
 if(section.children.length)box.append(section);
}
let focusedRecipe=null;
const lifeItemDetail=itemDetailView;
itemDetailView=function(box,d){lifeItemDetail(box,d);appendItemUses(box,d);};
const lifeItemSummary=itemSummary;
itemSummary=function(d){const uses=game&&d.kind!=='EQUIPMENT'?itemUses(d.id):[];return lifeItemSummary(d)+(uses.length?'\n제작 용도 · '+uses.slice(0,3).map(x=>safeName(x.recipe[2]==='EQUIP'?'16_EQUIP_DB':'14_ITEM_DB',x.recipe[3])).join(', ')+(uses.length>3?' 외 '+(uses.length-3)+'개':''):'');};
const lifeCrafting=crafting;
crafting=function(p){lifeCrafting(p);if(focusedRecipe){const target=p.querySelector('[data-recipe-id="'+focusedRecipe+'"]');if(target){target.classList.add('focused-recipe');queueMicrotask(()=>target.scrollIntoView({block:'center',behavior:'smooth'}));}focusedRecipe=null;}};
function contactStories(parent){const place=game.currentPlace();if(!place?.valid||![CRPGRuntime.lifeCatalog.sara,CRPGRuntime.lifeCatalog.tavern].includes(place.place))return;
 const tavern=place.place===CRPGRuntime.lifeCatalog.tavern,section=el('section','contact-stories');section.append(el('h2','',tavern?'술집에서 들려오는 이야기':'식탁에 남겨진 이야기'),el('p','story',tavern?'찰스: “도움이 필요한 분들의 이야기를 전해 드릴 수 있습니다. 당사자를 만나 부탁을 듣고, 동행할지는 직접 정하시면 됩니다.”':'사라: “도움이 필요한 사람들의 부탁을 모아 두었어요. 식사를 주문하지 않아도 이야기는 들으실 수 있답니다.”'),el('p','muted','몬드 도입부 이후부터 소개받을 수 있습니다. 본편을 끝낼 필요는 없으며, 준비 비용은 개인 임무에서 수락할 때만 사용됩니다.'));
 const offers=game.legendContactEntries();for(const entry of offers){const d=entry.definition,c=el('section','card'),registered=game.legendRegistered(entry.id);c.append(el('h3','',game.tables['22_QUEST_DB'].get(d.QUEST_ID)?.[1]||entry.title),el('p','',game.tables['22_QUEST_DB'].get(d.QUEST_ID)?.[5]||'당사자를 만나 이야기를 듣습니다.'));
  if(!registered){
   if(typeof requirementList==='function')requirementList(c,game.legendRequirements(d,{cost:false,location:false}));
   const first=game.mondFirstContact?.(d);if(first&&!first.complete)c.append(actionButton('첫 만남의 이야기를 듣는다','MOND_FIRST_CONTACT',{quest:d.id},true));
   const reason=game.legendIntroductionReason(d);if(reason)c.append(el('p','requirement-unmet',reason));
   c.append(actionButton('이야기를 듣고 개인 임무 소개받기','LEGEND_REGISTER',{quest:entry.id},true));
  }else{
   c.append(el('p','muted','소개받은 개인 임무 · 임무 현장으로 이동한 뒤 시작할 수 있습니다.'));travelGuide(c,d.MAP_ID);
   c.append(button('임무에서 이야기 열기',()=>{missionTab='개인 임무';act('MENU',{screen:'QUEST'});},busy||!!game.actionReason('MENU',{screen:'QUEST'}),true));
  }section.append(c);
 }
 if(!offers.length)section.append(el('p','muted','이곳에서 소개하는 개인 임무를 모두 마쳤습니다. 임무의 동료 획득 화면에서 동행 제안과 다른 소개처를 확인할 수 있습니다.'));parent.append(section);
 const shortcut=el('div','contact-entry-link');shortcut.append(button('동료 영입 임무 소개 · '+offers.length+'개',()=>section.scrollIntoView({block:'start',behavior:'smooth'}),false,true));parent.insertBefore(shortcut,parent.firstChild);
}
const lifeShop=shop,lifeDialogue=dialogue;
shop=function(p,v){lifeShop(p,v);contactStories(p);};
dialogue=function(p,v){lifeDialogue(p,v);contactStories(p);};
function characterMeetingPlace(pid,entries){
 const owner=game.tables['04_CHAR_DB'].get(pid)?.[1];if(game.s.party.some(p=>p.active&&p.source===owner))return {label:'현재 파티에서 함께 이동 중',map:game.s.global.CURRENT_MAP_ID};
 const normal=entries.filter(e=>e.profile===pid&&e.kind==='AFFECTION'&&/_H0[1-5]$/.test(e.id)&&!/ADULT/.test(e.definition?.RELATION_KIND||'')&&!game.storyDone(e.id)).sort((a,b)=>a.id.localeCompare(b.id));
 const next=normal[0]||entries.find(e=>e.profile===pid&&e.kind==='LEGEND'&&!game.storyDone(e.id));if(next?.definition?.MAP_ID)return {label:'다음 만남 장소',map:next.definition.MAP_ID};
 const entities=new Set([owner,'NPC_'+pid.replace(/^PROFILE_/, '')].filter(Boolean)),scheduled=game.placeCatalog().find(p=>entities.has(p.entity));if(scheduled?.maps?.length)return {label:'활동 장소 · '+scheduled.facility,map:scheduled.maps[0]};
 const field=game.rows('51_EVENT_DB').map(r=>parseUI(r[13])).find(d=>d.kind==='personal_event'&&d.profile_id===pid&&d.map_id);return field?{label:'현장 대화 장소',map:field.map_id}:null;
}

function savedMapName(id){return game?.tables['32_MAP_DB'].get(id)?.[2]||CRPGRuntime.lifeCatalog.sites.find(s=>s.id===id)?.name||DB['32_MAP_DB'].find(r=>r[0]===id)?.[2]||'알 수 없는 구역';}
function growthSnapshot(){
 const result={};for(const owner of new Set([...game.s.party.filter(p=>p.active).map(p=>p.source),...(game.s.runtime?.actors||[]).filter(a=>a.side==='ALLY'&&!a.guest).map(a=>a.source)])){try{result[owner]=game.growth(owner);}catch{}}
 const gate=game.s.runtime?.storyConfig?.node_id;for(const a of game.s.runtime?.actors||[]){if(a.side==='ALLY'&&a.guest&&gate){const state=game.s.guestSnapshots?.[gate]?.[a.source];if(state)result['GUEST:'+a.source]={owner:a.source,name:a.name,level:state.level,guestGate:gate};}}return result;
}
const lifeRestoreUI=restoreUIState;
restoreUIState=function(){cancelAnimationFrame(fishingFrame);fishingFrame=null;fishingSession=null;lifeRestoreUI();};
