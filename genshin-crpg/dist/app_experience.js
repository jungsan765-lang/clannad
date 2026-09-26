/* Location-first exploration, separated journals and compact battle controls. */
let itemPresenter=CRPGInventoryPresenter.create(DB,MANIFEST),presenterDB=DB;
function isInn(entry){return !!entry?.merchant&&game.rows('19_SHOP_STOCK_DB').some(r=>r[1]===entry.merchant&&r[2]==='SERVICE'&&r[3]==='SERVICE_INN_REST_8H');}
function placeName(entry){return entry.name.replace(/\(시스템\)/g,'').trim();}
function placeHeader(p,mode){
  const visit=game.currentPlace?.(),entry=visit?.entry;
  if(!visit?.valid||visit.mode!==mode){p.append(el('h1','','방문할 장소를 선택해 주세요'),el('p','',visit?.reason||'장소 화면에서 상점이나 시설로 들어갈 수 있습니다.'),actionButton('주변 둘러보기','MENU',{screen:'LOCATION'},true));return null;}
  const breadcrumb=el('div','place-breadcrumb');breadcrumb.append(el('p','muted',game.view().map[2]+' / '+placeName(entry)),actionButton('밖으로 나가기','PLACE_LEAVE'));p.append(breadcrumb,el('h1','',placeName(entry)),el('p','muted',entry.facility));
  if(entry.modes.length>1){const modes=el('div','row');for(const m of entry.modes){const b=actionButton({SHOP:'판매 상품',CRAFT:'제작·강화',TALK:'대화',BOSS:'도전 안내'}[m],'PLACE_ENTER',{place:entry.id,mode:m});b.classList.toggle('selected',mode===m);modes.append(b);}p.append(modes);}return entry;
}
drawLocation=function(p,v){
  p.append(el('div','eyebrow','EXPLORATION'),el('h1','',v.map[2]));chapterActions(p);
  p.append(el('h2','','주변 둘러보기'));const places=game.placeEntries?.()||[],grid=el('div','grid location-places');
  for(const entry of places){const c=el('section','card place-entry'),copy=el('div','place-entry-copy');copy.append(el('small','',entry.kind==='BOSS'?'도전 입구':entry.modes.includes('SHOP')?'상점':entry.modes.includes('CRAFT')?'작업 시설':'만날 수 있는 사람'),el('h3','',placeName(entry)),el('p','muted',entry.facility));if(entry.reason)copy.append(el('small','choice-note',entry.reason));c.append(copy,actionButton(entry.kind==='BOSS'?'입구로 가기':entry.modes[0]==='TALK'?'찾아가기':'들어가기','PLACE_ENTER',{place:entry.id}));grid.append(c);}
  if(!places.length)grid.append(el('p','muted','이곳에는 방문할 시설이 없습니다.'));p.append(grid,el('h2','','다른 장소로 이동'));
  const edges=el('div','location-edges');for(const {row:r,reason}of v.edges){const c=el('div');const b=actionButton(r[9]+' · '+r[5]+'분','MOVE',{edge:r[0]});b.disabled=b.disabled||!!reason;c.append(b);if(reason)c.append(el('small','choice-note',reason));edges.append(c);}p.append(edges);
  p.append(actionButton('이곳의 임무','MENU',{screen:'QUEST'}),actionButton('1시간 기다리기','WAIT',{minutes:60}));
  bossProgressControls(p);
};
dialogue=function(p,v){
  const entry=placeHeader(p,'TALK');if(!entry)return;art(p,entry.entity);for(const img of p.querySelectorAll('img'))img.alt=entry.name;p.append(actionButton('임무 확인','MENU',{screen:'QUEST'}),actionButton('호감도 확인','MENU',{screen:'RELATIONS'}));
};
function shopStockDetail(row){return row[2]==='EQUIP'?itemPresenter.itemDetail({equip:row[3],quantity:1,enhance:0}):row[2]==='ITEM'?itemPresenter.itemDetail({item:row[3],quantity:1}):null;}
function shopStockGroup(row){
 if(row[2]==='RECIPE')return '제작법';const d=shopStockDetail(row);if(!d)return '기타';
 if(row[2]==='EQUIP'){if(['법구','장신구'].includes(d.category))return '법구·장신구';if(d.category==='방어구')return '방어구';return game.row('16_EQUIP_DB',row[3])[14]==='Y'?'단조 무기':'기본 무기';}
 return d.group==='음식'?'음식':d.material?'제작 재료':'소모품';
}
function shopQuantityLimit(row){const stock=game.stockRemaining(row),affordable=Number(row[5])>0?Math.floor(game.s.global.MORA/Number(row[5])):Number.MAX_SAFE_INTEGER;return Math.max(0,Math.min(stock,affordable));}
function showPurchaseQuantity(id){
 const row=game.tables['19_SHOP_STOCK_DB'].get(id);if(!row||!['ITEM','EQUIP'].includes(row[2])||busy)return;
 const box=el('div','purchase-quantity'),field=el('label','','구매 수량'),input=el('input');input.type='number';input.min='2';input.max=String(shopQuantityLimit(row));input.step='1';input.value='2';input.setAttribute('aria-label','구매 수량');field.append(input);
 const total=el('p','purchase-total'),limit=el('p','muted'),reason=el('p','choice-note');reason.setAttribute('role','status');
 const confirm=button('선택한 수량 구매',()=>{const quantity=Number(input.value);if(!Number.isSafeInteger(quantity)||quantity<2||game.stockReason(row,quantity))return;document.getElementById('modal').close();act('BUY',{stock:id,quantity});},false,true);
 const refresh=()=>{const quantity=Number(input.value),remaining=game.stockRemaining(row);const why=!Number.isSafeInteger(quantity)||quantity<2?'2 이상의 정수 수량을 입력해 주세요.':game.stockReason(row,quantity);total.textContent='총 금액 · '+(Number.isSafeInteger(quantity)&&quantity>=2?(Number(row[5])*quantity).toLocaleString():'—')+' 모라';limit.textContent='보유 '+Number(game.s.global.MORA).toLocaleString()+' 모라 · 재고 '+(remaining===Infinity?'상시':remaining+'개')+' · 구매 가능 '+shopQuantityLimit(row)+'개';reason.textContent=why;confirm.disabled=busy||!!why;};
 input.oninput=refresh;refresh();box.append(field,total,limit,reason,confirm);showModal(row[4]+' · 여러 개 구매',box);input.focus();
}
shop=function(p){
 const entry=placeHeader(p,'SHOP');if(!entry)return;
 if(isInn(entry)){const c=el('section','card inn-service'),stock=game.placeStocks().find(s=>s.row[3]==='SERVICE_INN_REST_8H');if(stock){c.append(el('h2','','숙박하기'),el('p','','8시간 숙박 후 현재 파티 전원의 HP를 모두 회복합니다.'),el('p','',stock.row[5]+' 모라 · 보유 '+game.s.global.MORA+' 모라'));if(stock.reason)c.append(el('p','choice-note',stock.reason));const b=actionButton('숙박하기 · '+stock.row[5]+' 모라','BUY',{stock:stock.row[0],quantity:1},true);b.disabled=b.disabled||!!stock.reason;c.append(b);}p.append(c);return;}
 p.append(el('p','shop-balance','보유 '+Number(game.s.global.MORA).toLocaleString()+' 모라'));
 if(entry.entity==='NPC_MOND_SARA')p.append(el('p','','사라에게 완성된 음식을 구입할 수 있습니다. 음식은 아이템 화면에서 파티원에게 사용합니다.'));
 const stocks=game.placeStocks().filter(s=>!/SYSTEM_DISABLED|사용 금지|레거시/.test(s.row[8]||'')),groups=['기본 무기','단조 무기','방어구','법구·장신구','제작 재료','음식','소모품','제작법','기타'];
 for(const group of groups){const rows=stocks.filter(s=>shopStockGroup(s.row)===group).sort((a,b)=>Number(a.row[5])-Number(b.row[5])||a.row[4].localeCompare(b.row[4],'ko'));if(!rows.length)continue;
  p.append(el('h2','',group));const grid=el('div','grid facility-stock');
  for(const stock of rows){const r=stock.row,c=el('section','card'),d=shopStockDetail(r);c.dataset.stockId=r[0];c.append(el('h3','',d?.name||r[4]),el('small','',d?.category||'제작법'),el('p','',Number(r[5]).toLocaleString()+' 모라'),el('small','',stock.remaining===Infinity?'상시 판매':'남은 재고 '+stock.remaining));
   if(d?.stats.length)c.append(el('p','shop-stats',d.stats.map(s=>s.label+' '+s.value+s.unit).join(' · ')));if(d?.effect)c.append(el('p','item-effect',d.effect));
   const level=String(r[8]||'').match(/LEVEL>=(\d+)/)?.[1];if(level)c.append(el('small','', '구매 Lv. '+level+' 이상'));if(d?.minimumLevel)c.append(el('small','', '장착 Lv. '+d.minimumLevel+' 이상'));if(stock.reason)c.append(el('p','choice-note',stock.reason));
   const buy=actionButton('1개 구매','BUY',{stock:r[0],quantity:1});buy.disabled=buy.disabled||!!stock.reason;const controls=el('div','row shop-buy-controls');controls.append(buy);
   if(['ITEM','EQUIP'].includes(r[2])){const why=game.stockReason(r,2),multi=button('여러 개 구매',()=>showPurchaseQuantity(r[0]),busy||!!why);multi.title=why;controls.append(multi);}c.append(controls);grid.append(c);
  }p.append(grid);
 }
 if(!stocks.length)p.append(el('p','empty','현재 판매 중인 상품이 없습니다.'));
};
function costBlock(card,cost){
  card.append(el('p','muted',Number(cost.mora||0).toLocaleString()+' 모라'));
  for(const [id,n]of Object.entries(cost.items||{}))card.append(el('small','material-cost',safeName('14_ITEM_DB',id)+' '+n+'개 · 보유 '+game.itemCount(id)+'개'));
  return game.s.global.MORA<cost.mora?'모라가 부족합니다.':Object.entries(cost.items||{}).some(([id,n])=>game.itemCount(id)<n)?'재료가 부족합니다.':'';
}
crafting=function(p){
  const entry=placeHeader(p,'CRAFT');if(!entry)return;
  if(presenterDB!==game.db){itemPresenter=CRPGInventoryPresenter.create(game.db,MANIFEST);presenterDB=game.db;}
  if(game.placeCanEnhance(entry))renderEnhancementPanel(p,entry);
  p.append(el('h2','','제작법'));const grid=el('div','grid');
  for(const recipe of game.placeRecipes().filter(x=>x.row[1]!=='강화'&&!/사용 금지|레거시/.test(x.row[18]||''))){
    const r=recipe.row,c=el('section','card'),d=r[2]==='EQUIP'?itemPresenter.itemDetail({equip:r[3],quantity:1,enhance:0}):itemPresenter.itemDetail({item:r[3],quantity:Number(r[4])||1}),output=el('div','craft-output');c.dataset.recipeId=r[0];output.append(itemGlyph(d),el('h3','',d.name||safeName(r[2]==='EQUIP'?'16_EQUIP_DB':'14_ITEM_DB',r[3])));c.append(output);let blocked=recipe.reason;
    try{const cost=game.recipeCost(r,1),missing=costBlock(c,cost);blocked=blocked||missing;c.append(el('small','muted','제작 시간 '+r[19]));}catch(e){blocked=blocked||e.message;}
    if(recipe.stages){
      const stages=el('ol','craft-stages');stages.setAttribute('aria-label','공동 제작 준비');
      for(const stage of recipe.stages){const names=stage.facilities.map(f=>f.name.replace(/\(시스템\)/g,'').trim()).join(' / ');stages.append(el('li',stage.prepared?'stage-ready':'',(stage.prepared?'준비 완료 · ':'준비 필요 · ')+(names||'이 지도에 필요한 시설 없음')));}
      c.append(stages,el('small','muted','각 시설에서 준비한 뒤 제작합니다. 재료·모라·시간은 완성할 때 한 번만 소비합니다.'));
      if(recipe.canStage)c.append(actionButton('이 시설에서 준비','CRAFT_STAGE',{recipe:r[0]}));
    }
    if(blocked)c.append(el('p','choice-note',blocked));const b=actionButton(recipe.stages?'공동 제작 완료':'제작','CRAFT',{recipe:r[0]});b.disabled=b.disabled||!!blocked;c.append(b);grid.append(c);
  }
  if(!grid.children.length)grid.append(el('p','muted','이 시설에서 사용할 제작법이 없습니다.'));p.append(grid);
};
boss=function(p){
  const entry=placeHeader(p,'BOSS');if(!entry)return;
  if(['AWAIT_NEXT','RETRY'].includes(game.s.bossRouteProgress?.phase)){bossProgressControls(p);return;}
  const row=game.row('35_BOSS_ROUTE_DB',entry.route);p.append(el('p','','이 장소에서 시작하는 현장 도전입니다. 보스별 게임 내 48시간에 1회 입장하며, 패배·이탈해도 제한은 유지됩니다. 완료한 도전은 재료 재도전 메뉴를 이용하세요.'));
  for(const mode of ['DIRECT','GAUNTLET']){if(mode==='GAUNTLET'&&row[3]==='DIRECT')continue;const reason=game.placeBossReason(entry.route,mode),b=actionButton(mode==='DIRECT'?'보스에게 도전':'전초전부터 도전','BOSS_ROUTE',{route:entry.route,entry:mode},true);b.disabled=b.disabled||!!reason;p.append(b);if(reason)p.append(el('small','choice-note',reason));}
};
returnToJourney=function(p){
  const visit=game.currentPlace?.();if(visit?.valid){p.append(actionButton(placeName(visit.entry)+' · 돌아가기','MENU',{screen:{SHOP:'SHOP',CRAFT:'CRAFT',BOSS:'BOSS_INTRO',TALK:'DIALOGUE'}[visit.mode]},true));return;}
  p.append(actionButton(game.playPhase()==='PREPARATION'?'전투 준비로 돌아가기':'이야기로 돌아가기','MENU',{screen:'STORY'},true));
};
let bagCategory='전체',bagSelection=null;
function itemGlyph(d){
  if(d.icon?.url){const img=el('img','item-icon');img.src=d.icon.url;img.alt='';return img;}
  const icons={한손검:'🗡',양손검:'⚔',장병기:'🔱',활:'🏹',법구:'📖',방어구:'🛡',장신구:'💍',특수:'💠',음식:'🍲',광물:'💎',전술도구:'🧰'};
  const icon=el('span','item-glyph',d.actionHint==='EXPERIENCE'?'📚':icons[d.category]||(d.group==='음식'?'🍲':d.group==='재료'?'💎':d.group==='퀘스트/핵심'?'🔑':'🧰'));icon.setAttribute('aria-hidden','true');return icon;
}
function itemSummary(d){return [d.questLabel?'관련 임무 · '+d.questLabel:'',d.description,d.effect,...d.stats.map(s=>s.label+' '+s.value+s.unit),d.fields.find(f=>f.label==='사용 제한')?.value].filter(Boolean).join('\n');}
function itemDetailView(box,d){
  box.replaceChildren();box.append(el('small','',d.category),el('h2','',d.name+(d.kind==='EQUIPMENT'?' +'+d.enhance:'')));
  if(d.kind==='EQUIPMENT')box.append(el('p','muted',d.equipped?ownerName(d.owner)+' 장착 중':'미장착'));
  else box.append(el('p','muted',d.quantity+'개 보유'));
  if(d.description)box.append(el('p','',d.description));if(d.effect)box.append(el('p','item-effect',d.effect));
  const dl=el('dl','item-detail-fields');for(const s of d.stats)dl.append(el('dt','',s.label),el('dd','',s.value+s.unit));
  for(const f of d.fields.filter(f=>!['설명','효과','기본 고유 효과','획득처','판매가','구매가'].includes(f.label)))dl.append(el('dt','',f.label),el('dd','',f.value.replace(/지정 CHAR_ID/g,'선택한 캐릭터')));box.append(dl);
  if(['FOOD','EXPERIENCE'].includes(d.actionHint)){
    const select=el('select');select.setAttribute('aria-label','아이템 사용 대상');for(const member of game.s.party.filter(x=>x.active))select.append(new Option(ownerName(member.source),member.source));
    const use=button('1개 사용',()=>act('USE_ITEM',{item:d.id,quantity:1,owner:select.value,variant:d.variant||undefined}),false,true),reason=el('p','choice-note');
    const refresh=()=>{let message=game.actionReason('USE_ITEM')||'';if(!message)try{if(d.actionHint==='FOOD'){const spec=game.foodSpec(d.id,{variant:d.variant}),a=game.economyOwner(select.value);if(a.hp<=0)message='전투불능 대상은 일반 음식을 먹을 수 없습니다.';else if(spec.heal&&a.lastMeal===d.id)message='직전에 먹은 회복 음식과 다른 음식을 골라 주세요.';else if(!spec.status&&a.hp>=a.maxHp&&!a.statuses.some(s=>s.id==='STATUS_BOND_OF_LIFE'))message='이미 HP가 가득 찬 대상입니다.';}else if(game.growth(select.value).max)message='최대 레벨입니다.';}catch(e){message=e.message;}use.disabled=busy||!!message;use.title=message;reason.textContent=message;};select.onchange=refresh;refresh();box.append(select,use,reason,el('small','muted','현재 파티에 편성된 캐릭터만 사용할 수 있습니다.'));
  }else if(d.kind==='EQUIPMENT'){const b=button('편성에서 장착하기',()=>{equipmentCategory=d.equipmentCategory||'SPECIAL';equipmentCandidate=d.slot;act('MENU',{screen:'PARTY'});},!!game.actionReason('MENU',{screen:'PARTY'}));box.append(b);}
  else if(d.actionHint==='COMBAT_MEDICINE')box.append(el('p','muted','전투 중 행동 카드에서 사용합니다.'));
  else if(d.actionHint==='TACTICAL_PREPARATION')box.append(el('p','muted','아래 전투 도구 준비에서 선택할 수 있습니다.'));
}
inventory=function(p){
  p.append(el('div','eyebrow','INVENTORY'),el('h1','','아이템'));
  const entries=itemPresenter.inventoryEntries(game.s),tabs=el('div','bag-tabs');tabs.setAttribute('aria-label','아이템 분류');
  for(const category of ['전체',...CRPGInventoryPresenter.GROUPS]){const count=entries.filter(d=>category==='전체'||d.group===category).length;if(!count&&category!=='전체')continue;const b=button(category+' '+count,()=>{bagCategory=category;bagSelection=null;render();});b.classList.toggle('selected',bagCategory===category);b.setAttribute('aria-pressed',String(bagCategory===category));tabs.append(b);}p.append(tabs);
  let shown=entries.filter(d=>bagCategory==='전체'||d.group===bagCategory);if(!shown.length&&entries.length){bagCategory='전체';shown=entries;}
  const layout=el('div','bag-layout'),grid=el('div','bag-grid'),detail=el('section','card bag-detail');detail.setAttribute('aria-label','선택한 아이템 상세');
  const chosen=shown.find(d=>d.key===bagSelection)||shown[0];bagSelection=chosen?.key||null;
  for(const d of shown){const wrap=el('div','bag-cell'),b=button('',()=>{bagSelection=d.key;for(const x of grid.querySelectorAll('button'))x.setAttribute('aria-pressed',String(x.dataset.itemKey===d.key));itemDetailView(detail,d);});b.className='bag-item';b.dataset.itemKey=d.key;b.setAttribute('aria-pressed',String(d.key===bagSelection));b.setAttribute('aria-label',d.name+(d.kind==='EQUIPMENT'?' +'+d.enhance:' '+d.quantity+'개'));b.append(itemGlyph(d),el('strong','item-count',d.kind==='EQUIPMENT'?'+'+d.enhance:'×'+d.quantity),el('span','item-name',d.name));if(d.equipped)b.append(el('small','item-worn','장착'));
    const tooltip=el('div','item-tooltip');tooltip.id='item-tip-'+grid.children.length;tooltip.setAttribute('role','tooltip');tooltip.append(el('strong','',d.name),el('p','',itemSummary(d)||d.category));b.setAttribute('aria-describedby',tooltip.id);wrap.append(b,tooltip);grid.append(wrap);
  }
  if(chosen)itemDetailView(detail,chosen);else detail.append(el('p','empty','아직 보유한 아이템이 없습니다.'));layout.append(grid,detail);p.append(layout);
  const tools=el('details','tool-preparation');tools.append(el('summary','','전투 도구 준비'));toolPreparation(tools);lockControls(tools,game.actionReason('TOOL_PREPARE'));if(tools.children.length>1)p.append(tools);returnToJourney(p);
};

function journalEntry(parent,entry){
  const c=el('section','card');c.append(el('h3','',entry.title||entry.name||'개인 임무'));
  if(entry.reason)c.append(el('p','choice-note',entry.reason));
  c.append(actionButton('이야기 시작',entry.kind==='AFFECTION'?'AFFECTION_ENTER':'LEGEND_ENTER',entry.kind==='AFFECTION'?{event:entry.id}:{quest:entry.id}));
  if(entry.reason)c.lastChild.disabled=true;parent.append(c);
}
quests=function(p,v){
  p.append(el('div','eyebrow','QUESTS'),el('h1','','임무'));chapterActions(p);
  const list=el('div','grid');
  for(const q of v.quests){const def=parseUI(q.row[10]),c=el('section','card');if(def.map_id!==game.s.global.CURRENT_MAP_ID)continue;
    c.append(el('h2','',q.row[1]),el('p','',q.state?.claimed?def.revisit:def.text));
    if(q.reason)c.append(el('small','choice-note',q.reason));
    else if(q.state?.node==='READY_TO_CLAIM'){const r=parseUI(q.row[11]);if(r.equipment_choice)for(const id of r.equipment_choice)c.append(actionButton(safeName('16_EQUIP_DB',id)+' 수령','CLAIM_QUEST',{quest:q.row[0],equipment:id}));else c.append(actionButton('보상 수령','CLAIM_QUEST',{quest:q.row[0]},true));}
    else for(const ch of def.choices||[])c.append(actionButton(ch.label,'QUEST_CHOICE',{quest:q.row[0],choice:ch.id}));list.append(c);
  }
  if(!list.children.length)list.append(el('p','muted','현재 장소에서 받을 수 있는 의뢰가 없습니다.'));p.append(list);
  const entries=(game.storyEntries?.()||[]).filter(e=>e.kind==='LEGEND'&&!game.storyDone?.(e.id));
  if(entries.length){p.append(el('h2','','개인 임무'));for(const entry of entries)journalEntry(p,entry);}
  returnToJourney(p);
};
function relationsScreen(p){
  p.append(el('div','eyebrow','RELATIONSHIPS'),el('h1','','호감도'));
  const entries=game.storyEntries?.()||[],activities=game.relationshipActivityEntries?.()||[],grid=el('div','relationship-grid');
  for(const [pid,r]of Object.entries(game.s.relations)){if(r.firstContact===null)continue;const def=game.tables['04_CHAR_DB'].get(pid);if(!def)continue;
    const c=el('section','card relationship-card'),photo=portraitFor(pid);if(photo){const img=el('img','relationship-photo');img.src=photo;img.alt=def[2];c.append(img);}
    c.append(el('h2','',def[2]));const meeting=characterMeetingPlace(pid,entries);if(meeting){c.append(el('p','meeting-place',meeting.label+' · '+mapName(meeting.map)));if(meeting.map!==game.s.global.CURRENT_MAP_ID)travelGuide(c,meeting.map);}else c.append(el('p','muted','아직 다음 만남 장소를 알 수 없습니다.'));const score=r.BOND_SCORE??r.heart*20,h=Math.min(5,Math.floor(score/20));
    c.append(el('p','heart-row','♥'.repeat(h)+'♡'.repeat(5-h)),el('p','','호감도 '+score+'점 · '+(h?'유대 '+h+'단계':'첫 만남')));
    for(const e of entries.filter(e=>e.profile===pid&&e.kind==='AFFECTION'&&!/ADULT/.test(e.definition?.RELATION_KIND||'')&&!game.storyDone?.(e.id))){const stage=e.id.match(/_H0([1-5])$/)?.[1];const b=actionButton(stage?'일상 교류 · '+stage+'단계':'유대 이야기','AFFECTION_ENTER',{event:e.id});b.disabled=b.disabled||!!e.reason;c.append(b);if(e.reason)c.append(el('small','choice-note',e.reason));}
    for(const a of activities.filter(a=>a.profileId===pid)){const b=actionButton((a.title||a.name)+' · 30분','RELATION_ACTIVITY',{activityId:a.id});b.disabled=b.disabled||!!a.reason;c.append(b);if(a.reason)c.append(el('small','choice-note',a.reason));}grid.append(c);
  }
  if(!grid.children.length)p.append(el('p','empty','여정에서 만난 인물들이 여기에 기록됩니다.'));p.append(grid);returnToJourney(p);
}

let autoSavePaused=false;
const experienceSidebar=sidebar;sidebar=function(g,v){const side=experienceSidebar(g,v);if(autoSavePaused)side.append(el('p','phase-note','자동 저장 일시중지 · 저장·설정에서 다시 시작'));return side;};
const experienceStoreSave=storeSave;
storeSave=function(){return autoSavePaused?Promise.resolve():experienceStoreSave();};
async function resumeAutoSave(){
  if(!game||busy)return;busy=true;
  try{activeSaveSlot='branch:'+game.s.global.SAVE_ID+':'+Date.now();autoSavePaused=false;await storeSave();say('새 자동 저장을 시작했습니다.');}
  catch(e){autoSavePaused=true;say(e.message);}finally{busy=false;render();}
}
const experienceSystem=system;
system=function(p){experienceSystem(p);if(autoSavePaused){const note=el('section','card save-paused');note.append(el('h2','','자동 저장 일시중지'),el('p','','현재 저장을 삭제했습니다. 플레이는 계속할 수 있으며, 다시 저장하려면 아래 버튼을 눌러 주세요.'),button('새 자동 저장 시작',resumeAutoSave,false,true));p.prepend(note);}};
const experienceBegin=begin;begin=async function(...args){if(!game)autoSavePaused=false;return experienceBegin(...args);};
const experienceLoad=loadSlot;loadSlot=async function(id){const before=game;await experienceLoad(id);if(game!==before)autoSavePaused=false;render();};
const experienceRestore=restoreUIState;restoreUIState=function(){experienceRestore();};
function confirmDeleteSave(rec,container){
  if(busy)return;const dialog=el('dialog','save-delete-confirm');dialog.setAttribute('aria-labelledby','delete-save-title');dialog.setAttribute('role','alertdialog');
  const title=el('h2','','이 저장을 삭제할까요?');title.id='delete-save-title';
  const current=!!game&&(activeSaveSlot||'auto:'+game.s.global.SAVE_ID)===rec.slotId;
  dialog.append(title,el('p','',rec.summary?.playerName+' · '+(rec.summary?.name||'게임 불러오기')),el('p','',current?'현재 플레이는 유지됩니다. 자동 저장은 일시중지되며, 저장·설정에서 새 자동 저장을 시작할 수 있습니다.':'선택한 저장만 삭제합니다. 다른 저장과 현재 플레이는 유지됩니다.'));
  const cancel=button('취소',()=>dialog.close()),confirm=button('저장 삭제',async()=>{
    if(busy)return;busy=true;confirm.disabled=true;cancel.disabled=true;
    try{await saveQueue.catch(()=>{});await saveStore.remove(rec.slotId,{expectedSlotRevision:rec.slotRevision});slotRevisions.delete(rec.slotId);
      if(current){autoSavePaused=true;activeSaveSlot=null;saveFailed=false;lastSaveError='';}
      dialog.close();say(current?'저장을 삭제했습니다. 자동 저장은 일시중지되었습니다.':'선택한 저장을 삭제했습니다.');
      if(document.getElementById('modal').open){showSavePicker();}else render();
    }catch(e){say('삭제하지 못했습니다. '+e.message);dialog.close();if(container.isConnected){container.replaceChildren();slotsUI(container);}}
    finally{busy=false;render();}
  });confirm.classList.add('danger-button');const controls=el('div','row');controls.append(cancel,confirm);dialog.append(controls);dialog.addEventListener('close',()=>dialog.remove(),{once:true});document.body.append(dialog);dialog.showModal();cancel.focus();
}
slotsUI=async function(container){
  if(!saveStore){container.append(el('p','muted','저장소를 사용할 수 없습니다.'));return;}
  try{const list=await saveStore.list();if(!container.isConnected)return;container.replaceChildren();
    if(!list.length)container.append(el('p','empty','게임 불러오기이 없습니다.'));
    for(const rec of list){const c=el('section','card slot'),m=rec.summary||{},copy=el('div','slot-copy'),type=rec.slotId.startsWith('manual:')?'수동 저장':rec.slotId.startsWith('checkpoint:')?'이야기 시작 전':'자동 저장';
      copy.append(el('small','',type+(game&&(activeSaveSlot||'auto:'+game.s.global.SAVE_ID)===rec.slotId?' · 현재 사용 중':'')),el('h3','',m.playerName||m.name||'게임 불러오기'),el('p','muted',routeName(m.route)+' · '+(DB['32_MAP_DB'].find(r=>r[0]===m.map)?.[2]||'')+' · '+m.day+'일 '+m.time),el('small','',new Date(rec.savedAt).toLocaleString('ko-KR')));
      const controls=el('div','slot-actions');controls.append(button('불러오기',()=>{document.getElementById('modal').close();loadSlot(rec.slotId);},busy),button('백업 파일 내보내기',async()=>{try{downloadText(await saveStore.exportSlot(rec.slotId),'CRPG_'+rec.saveId+'.json');}catch(e){say(e.message);}},busy),button('삭제',()=>confirmDeleteSave(rec,container),busy));c.append(copy,controls);container.append(c);
    }
  }catch(e){container.append(el('p','',e.message));}
};

function combatDisplayName(b,a){const same=b.actors.filter(x=>x.name===a.name&&x.side===a.side);return a.name+(same.length>1?' '+(same.indexOf(a)+1):'');}
function battleOrder(p,b){
  const order=el('ol','battle-order compact-order');order.setAttribute('aria-label','이번 라운드 행동 순서');
  for(const [i,x]of b.order.entries()){const a=b.actors.find(t=>t.id===x.id);if(!a||a.hp<=0)continue;const entry=el('li',(a.side==='ALLY'?'ally':'enemy')+(i===b.cursor?' current':''));entry.dataset.actorId=a.id;entry.append(el('small','',String(i+1)),el('span','',combatDisplayName(b,a)));if(i===b.cursor&&!b.opening?.state?.includes('PENDING'))entry.append(el('small','','현재'));order.append(entry);}p.append(order);
}
function battleActorRow(a,chosen,index){
  const c=el('div','actor combatant-row'+(a.hp<=0?' dead':'')+(a.id===selectedTarget?' selected':''));c.dataset.actorId=a.id;c.dataset.maxHp=a.maxHp;c.dataset.side=a.side;
  if(showArt){let src;if(a.side==='ENEMY'){const row=game.tables['09_MONSTER_DB'].get(a.source);src=row&&assetPath('enemy_'+row[15]+'.png');}else{const profile=game.rows('04_CHAR_DB').find(r=>r[1]===a.source);src=profile&&portraitFor(profile[0]);}if(src){const image=el('img','combat-portrait');image.src=src;image.alt='';c.append(image);}else if(a.id==='PLAYER_CUSTOM')c.append(el('span','combat-player-mark','✦'));}
  const copy=el('div','combatant-copy');copy.append(el('strong','',a.name+(index>0?' '+index:'')));meter(copy,'HP',a.hp,a.maxHp);
  const status=[a.aura&&({PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀'}[a.aura]||a.aura),a.airborne?'공중':null,...(a.statuses||[]).map(s=>safeName('13_STATUS_EFFECT_DB',s.id))].filter(Boolean);if(status.length)copy.append(el('small','',status.join(' · ')));c.append(copy);
  if(chosen?.targets?.some(t=>t.id===a.id))c.append(button(a.id===selectedTarget?'선택됨':'선택',()=>{selectedTarget=a.id;render();}));return c;
}
function battleDetails(p,b){
  const details=el('details','battle-details');details.open=false;details.append(el('summary','','전투 기록 · '+b.log.length+'건'));
  const log=el('div','log');log.setAttribute('role','log');log.setAttribute('aria-live','polite');
  for(const e of b.log){const actor=b.actors.find(a=>a.id===e.actorId),target=b.actors.find(a=>a.id===e.targetId),an=actor?combatDisplayName(b,actor):e.actor,tn=target?combatDisplayName(b,target):e.target;
    const action=e.immune?'면역':e.miss?'공격 빗나감':Object.hasOwn(e,'damage')?(tn||'대상')+'에게 '+e.damage+' 피해'+(e.critical?' · 치명타':''):e.heal?tn+' '+e.heal+' 회복':e.reaction?e.reactionName||'원소 반응':e.guard?'방어':e.card?e.cardName||'스킬 사용':e.reason||'';
    const text=e.text||e.message||[an,action].filter(Boolean).join(' · ');if(text)log.append(el('p','',text));}details.append(log);
  p.append(details);
}
function combatCardEffect(card,b){
  const box=el('div','combat-effect-detail'),desc=card.description||(card.id==='PLAYER_BASIC_ATTACK'?'선택한 적 1명을 기본 공격합니다.':card.id==='PLAYER_BASIC_GUARD'?'이번 행동 동안 받는 피해를 줄입니다.':'세부 효과 설명이 없습니다.');
  box.append(el('h2','',card.name||'행동'),el('p','combat-effect-description',desc));
  const meta=[];if(card.cooldown)meta.push('현재 재사용 대기 '+card.cooldown+'차례');if(card.targets?.length)meta.push('선택 가능 대상 '+card.targets.length+'명');if(card.reason)meta.push('현재 사용 불가 · '+card.reason);
  if(meta.length)box.append(el('p','muted',meta.join(' · ')));
  if(game.protagonistCombatView&&['PLAYER_ISEKAI_E','PLAYER_ISEKAI_Q'].includes(card.id)){
    const v=game.protagonistCombatView();
    if(card.id==='PLAYER_ISEKAI_E'){const t=v.windowTargets?.find(x=>x.id===selectedTarget);if(t)box.append(el('p','skill-preview',t.reason||t.name+' · 현재 선택 시 최대 HP −'+t.amount+' · 다음 자기 차례까지'));}
    if(card.id==='PLAYER_ISEKAI_Q'){box.append(el('p','skill-preview','현재 합동 공격 추가 배율 +'+v.bonusPct+'% · 행동 가능한 동료가 기본 공격에 참가합니다.'));if(v.members?.length)box.append(el('p','muted',v.members.map(a=>a.name+(a.reason?' · 불참('+a.reason+')':' · 참가')).join(' / ')));}
  }
  showModal('효과 · '+(card.name||'행동'),box);
}
combat=function(p){
  const b=game.s.runtime,opening=game.combatOpening?.(),cards=opening?[]:(game.combatCards?.()||[]);
  if(!cards.some(c=>c.id===selectedCard&&!c.reason))selectedCard=cards.find(c=>!c.reason)?.id||cards[0]?.id;
  const chosen=cards.find(c=>c.id===selectedCard);if(!chosen?.targets?.some(x=>x.id===selectedTarget))selectedTarget=chosen?.targets?.[0]?.id||null;
  p.classList.add('combat-panel');const head=el('div','battle-heading');head.append(el('span','eyebrow',opening?'전투 시작 전':'ROUND '+b.round),el('h1','',safeName('33_ENCOUNTER_GROUP_DB',b.group)));p.append(head);
  if(opening?.encounter){const e=opening.encounter,card=el('section','encounter-intro');card.setAttribute('aria-label','전투에 들어온 이유');card.append(el('small','eyebrow',e.label+' · '+mapName(e.map)),el('p','encounter-reason',displayText(e.text)));const foes=b.actors.filter(a=>a.side==='ENEMY'),preview=el('div','encounter-opponents');for(const name of [...new Set(foes.map(a=>a.name))]){const group=foes.filter(a=>a.name===name);preview.append(el('span','',name+' × '+group.length));}card.append(preview);p.append(card);}
  battleOrder(p,b);
  const controls=el('section','battle-command');controls.setAttribute('aria-label','전투 행동');
  if(opening){controls.append(el('h2','','준비되면 전투를 시작하세요'),el('p','','아직 누구도 공격하지 않았습니다. 시작하면 위 순서대로 행동합니다. 주인공의 차례에는 행동 → 대상 → 실행을 선택하세요.'),actionButton('전투 시작','COMBAT_BEGIN',{battle:b.id},true));}
  else{
    const buttons=el('div','battle-cards');for(const card of cards){const slot=el('div','battle-card-choice'),btn=button('',()=>{selectedCard=card.id;selectedBranch=card.branches?.[0]||'';render();},!!card.reason||busy);btn.dataset.cardId=card.id;btn.classList.toggle('selected',selectedCard===card.id);btn.append(el('strong','',card.name),el('small','',card.reason||(card.cooldown?'재사용 '+card.cooldown+'차례':'사용 가능')));const effect=button('효과',()=>combatCardEffect(card,b));effect.className='battle-effect-button';effect.setAttribute('aria-label',(card.name||'행동')+' 효과 보기');slot.append(btn,effect);buttons.append(slot);}controls.append(buttons);
    const execute=el('div','battle-execute');if(chosen?.branches?.length){const select=el('select');select.setAttribute('aria-label','스킬 방식');for(const branch of chosen.branches)select.append(new Option(({TAP:'짧게 사용',HOLD:'길게 사용',CHARGE:'차지'})[branch]||branch,branch));if(!chosen.branches.includes(selectedBranch))selectedBranch=chosen.branches[0];select.value=selectedBranch;select.onchange=()=>{selectedBranch=select.value;};execute.append(select);}
    if(chosen?.targets?.length){const targetSelect=el('select');targetSelect.setAttribute('aria-label','행동 대상');for(const t of chosen.targets){const a=b.actors.find(a=>a.id===t.id);targetSelect.append(new Option((a?combatDisplayName(b,a):t.name)+' · HP '+(a?.hp??''),t.id));}targetSelect.value=selectedTarget;targetSelect.onchange=()=>{selectedTarget=targetSelect.value;render();};execute.append(targetSelect);}
    const run=actionButton(chosen?.id==='PLAYER_BASIC_ATTACK'?'공격 실행':'선택한 행동 실행','COMBAT',{card:selectedCard,target:selectedTarget,branch:selectedBranch},true);run.disabled=run.disabled||!chosen||!!chosen.reason;execute.append(run);controls.append(execute);
  }controls.append(combatSpeedControl());p.append(controls);
  const stage=el('div','compact-battle-stage'),foes=b.actors.filter(a=>a.side==='ENEMY'),representative=foes.find(a=>a.hp>0)||foes[0];

  const teams=el('div','battle-teams compact-teams');for(const side of ['ALLY','ENEMY']){const col=el('section');col.append(el('h2','',side==='ALLY'?'우리 파티':'적'));const actors=b.actors.filter(a=>a.side===side);for(const a of actors){const same=actors.filter(x=>x.name===a.name);col.append(battleActorRow(a,chosen,same.length>1?same.indexOf(a)+1:0));}teams.append(col);}stage.append(teams);p.append(stage);
  if(b.terrain!==null&&b.terrain!==undefined)p.append(el('p','muted','남은 지형 '+b.terrain+' / '+(b.terrainMax||4)));battleDetails(p,b);
};
