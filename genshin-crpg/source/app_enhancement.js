/* Exact-instance forge UI. Reuses packaged item icons; no generated imagery. */
(function(){'use strict';
 const pct=n=>Number(n/100).toLocaleString('ko-KR',{maximumFractionDigits:2})+'%';
 const names={ATK:'공격력',DEF:'방어력',MAX_HP:'최대 HP',EVA:'회피',SPD:'속도',CRIT:'치명타 확률',CRIT_DMG:'치명타 피해',HIT:'명중',STATUS_RESIST:'상태 저항'};
 function ensurePresenter(){if(presenterDB!==game.db){itemPresenter=CRPGInventoryPresenter.create(game.db,MANIFEST);presenterDB=game.db;}}
 function statTable(box,before,after){
  const t=el('table','enhance-comparison'),h=el('tr');for(const text of ['장비 능력치','현재','성공 후'])h.append(el('th','',text));t.append(h);
  for(const key of new Set([...Object.keys(before||{}),...Object.keys(after||{})])){const b=before?.[key]||0,a=after?.[key]||0;if(!b&&!a)continue;const row=el('tr');row.append(el('th','',names[key]||key),el('td','',String(b)),el('td',a>b?'stat-up':a<b?'stat-down':'',String(a)));t.append(row);}box.append(t);
 }
 function probabilities(box,q){
  if(q.success===undefined)return;
  const row=el('div','enhance-probabilities');row.setAttribute('aria-label','1회 시도 기준 결과 확률');
  for(const [label,key,cls]of [['성공','success','success'],['실패·유지','hold','hold'],['실패·1단계 하락','down','down']]){const c=el('div','enhance-prob '+cls);c.append(el('span','',label),el('strong','',pct(q[key])));row.append(c);}box.append(row);
  box.append(el('p','muted','모두 1회 시도 기준 확률입니다. 장비 파괴는 없으며, 실패해도 시도 비용은 소비됩니다.'));
 }
 function costs(box,cost){if(!cost)return;const c=el('div','enhance-cost');c.append(el('strong','','필요 비용 · '+cost.mora.toLocaleString()+' 모라'),el('small','', '보유 '+Number(game.s.global.MORA).toLocaleString()+' 모라'));
  for(const [id,n]of Object.entries(cost.items||{})){const line=el('div','enhance-material'),d=itemPresenter.itemDetail({item:id,quantity:n});line.append(itemGlyph(d),el('span','',d.name+' ×'+n),el('small',game.itemCount(id)<n?'stat-down':'','보유 '+game.itemCount(id)));c.append(line);}box.append(c);}
 function quoteArgs(q,type){return {slot:q.slot,expectedLevel:q.level,expectedCap:q.cap,instanceRevision:q.instanceRevision};}
 function openConfirm(slot,kind='ENHANCE'){
  ensurePresenter();const q=game.enhancementQuote(slot,kind),type=kind==='ASCEND'?'EQUIP_ASCEND':'ENHANCE',args=quoteArgs(q,type),box=el('div','enhance-confirm');box.dataset.enhanceConfirm=kind;
  box.append(el('h2','',q.name+' +'+q.level+(kind==='ASCEND'?' · 한도 +12 개방':' → +'+q.target)));
  if(kind==='ASCEND')box.append(el('p','','돌파 성공률 100%. 강화도는 +10 그대로이며, 이 장비 한 개의 최대 강화 한도만 +12로 열립니다. 하락해도 해금은 유지됩니다.'));
  else{probabilities(box,q);statTable(box,q.statsBefore,q.statsAfter);if(q.down)box.append(el('p','enhance-warning','하락 시 +'+q.level+' → +'+(q.level-1)+' · 시도당 '+pct(q.down)));}
  costs(box,q.cost);box.append(el('p','muted',kind==='ASCEND'?'소요 시간 1시간 · 보스 재료는 이 돌파에만 사용합니다.':'소요 시간 30분 · 완료한 결과는 자동 저장됩니다.'));
  const reason=game.actionReason(type,args);if(reason)box.append(el('p','choice-note',reason));
  const controls=el('div','row');controls.append(button('취소',()=>document.getElementById('modal').close()),button(kind==='ASCEND'?'재료를 사용해 한도 돌파':'비용을 사용해 1회 강화',async()=>{
   if(busy)return;document.getElementById('modal').close();const receipt=await act(type,args);if(receipt?.ok)showResult(receipt.result);
  },busy||!!reason,true));box.append(controls);showModal(kind==='ASCEND'?'장비 한도 돌파 확인':'장비 강화 확인',box);
 }
 function showResult(r){
  const labels={SUCCESS:'강화 성공',HOLD:'강화 실패 · 단계 유지',DOWN:'강화 실패 · 1단계 하락',ASCENDED:'돌파 완료 · +12 해금'},box=el('div','enhance-result '+r.outcome.toLowerCase());box.dataset.enhanceOutcome=r.outcome;box.setAttribute('role','status');
  box.append(el('small','','장비 강화 결과'),el('h2','',labels[r.outcome]),el('strong','enhance-level',r.name+' +'+r.from+' → +'+r.level));
  if(r.outcome==='ASCENDED')box.append(el('p','','이제 +11과 +12에 도전할 수 있습니다. 강화도는 +10이며, 돌파는 이 장비에 영구히 유지됩니다.'));
  else box.append(el('p','',r.outcome==='HOLD'?'능력치는 그대로입니다. 장비는 파괴되지 않았습니다.':r.outcome==='DOWN'?'강화도만 한 단계 내려갔습니다. 장비와 돌파 해금은 보존됩니다.':'장비 능력치가 올랐습니다. 최대 HP가 늘어도 현재 HP는 자동 회복되지 않습니다.'));
  const cost=r.cost;box.append(el('p','muted','사용 비용 · '+cost.mora.toLocaleString()+' 모라'+Object.entries(cost.items).map(([id,n])=>' · '+safeName('14_ITEM_DB',id)+' ×'+n).join('')));
  if(saveFailed)box.append(el('p','enhance-warning','자동 저장에 실패했습니다. 추가 강화를 중단하고 저장 상태를 확인해 주세요.'));
  box.append(button('확인',()=>document.getElementById('modal').close(),false,true));showModal(labels[r.outcome],box);
 }
 globalThis.renderEnhancementPanel=function(p){
  ensurePresenter();const section=el('section','enhance-panel');section.append(el('h2','','장비 강화·돌파'),el('p','','+10까지 강화한 뒤 보스 재료로 +12 한도를 해금합니다. 임시 입문 장비는 강화하지 않고 상위 장비로 교체하세요.'));
  const info=el('details','enhance-rules'),summary=el('summary','','전체 강화 확률·돌파 재료 보기');info.append(summary);const table=el('table','enhance-chance-table'),head=el('tr');for(const x of ['단계','성공','유지','하락'])head.append(el('th','',x));table.append(head);
  const cfg=CRPGRuntime.enhancementConfig;for(let lv=1;lv<=12;lv++){const tr=el('tr');for(const text of ['+'+(lv-1)+' → +'+lv,pct(cfg.success[lv]),pct(10000-cfg.success[lv]-cfg.down[lv]),pct(cfg.down[lv])])tr.append(el('td','',text));table.append(tr);}info.append(table,el('p','','기본 공격력·방어력·최대 HP는 +1당 5%, +10에서 +50%, +11은 +65%, +12는 +80% 증가합니다. 기존 수치형 단계 보너스는 별도로 유지합니다.'),el('p','','고유 효과의 기존 실행 범위는 유지합니다. 준비 중인 전용 고유 효과를 이번 강화로 새로 구현한 것은 아닙니다.'));
  costs(info,cfg.ascensionCost);info.append(el('p','','드발린·안드리우스 승리: 강적의 잔향 1~2개 확정, 강적의 핵 1개 35%. 본편·첫 도전 완료 후 해당 현장에서 재도전할 수 있습니다. 보스별 입장 간격은 게임 내 48시간이며 패배·이탈해도 유지됩니다. 확률과 드롭은 이 CRPG의 규칙입니다.'));section.append(info);
  const grid=el('div','enhance-grid');for(const inv of game.s.inventory.filter(i=>i.equip)){
   const row=game.row('16_EQUIP_DB',inv.equip),q=game.enhancementQuote(inv.slot),card=el('section','card enhance-card');card.dataset.enhanceSlot=inv.slot;
   card.append(itemGlyph(itemPresenter.itemDetail(inv)),el('h3','',row[1]+' +'+inv.enhance),el('small','',inv.equipped?ownerName(inv.owner)+' 장착 중':'보관 중 · '+inv.slot));
   if(!q.supported){
    card.append(el('p','muted',q.reason));
    // Preserve old supported non-Mond operations, without widening this stage.
    if(!Object.hasOwn(CRPGRuntime.equipmentValueConfig.stats,inv.equip)){
     const pr=parseUI(row[32]),lv=inv.enhance+3,m=pr.milestones?.[lv],cost=pr.costs?.[lv];if(cost&&m&&!Object.keys(m.effect_override||{}).length&&lv<=Number(row[34])){costs(card,cost);card.append(actionButton('기존 방식 +'+lv+' 강화','ENHANCE',{slot:inv.slot}));}
    }
   }else{
    card.append(el('span','enhance-cap',q.cap===12?'돌파 완료 · 최대 +12':'기본 한도 +10'));
    if(q.target<=q.cap){probabilities(card,q);statTable(card,q.statsBefore,q.statsAfter);costs(card,q.cost);}
    const args=quoteArgs(q,'ENHANCE'),reason=game.actionReason('ENHANCE',args);if(reason)card.append(el('p','choice-note',reason));
    if(q.target<=q.cap)card.append(button('+'+q.target+' 강화 확인',()=>openConfirm(inv.slot),busy||!!reason,true));
    if(inv.enhance===10&&q.cap===10){const aq=game.enhancementQuote(inv.slot,'ASCEND'),ar=game.actionReason('EQUIP_ASCEND',quoteArgs(aq,'EQUIP_ASCEND'));costs(card,aq.cost);if(ar)card.append(el('p','choice-note',ar));card.append(button('+12 한도 돌파 확인',()=>openConfirm(inv.slot,'ASCEND'),busy||!!ar,true));}
   }
   grid.append(card);
  }
  if(!grid.children.length)grid.append(el('p','muted','소지한 장비가 없습니다.'));section.append(grid);p.append(section);
 };
 const oldLocation=drawLocation;drawLocation=function(p,v){oldLocation(p,v);if(!game)return;const cfg=CRPGRuntime.enhancementConfig;
  for(const [id,boss]of Object.entries(cfg.bosses)){if(game.s.global.CURRENT_MAP_ID!==boss.map)continue;const c=el('section','card material-challenge'),reason=game.materialChallengeReason(id);c.append(el('h2','',safeName('09_MONSTER_DB',id)+' · 재료 재도전'),el('p','','완료한 전투를 다시 도전합니다. 보스별 게임 내 48시간에 1회 입장하며, 패배·이탈해도 대기시간은 유지됩니다. 본편의 사건·클리어 상태를 되돌리지 않습니다. 승리 시 잔향 1~2개 확정, 핵 1개 35%.'),actionButton('보스 재도전','MOND_MATERIAL_CHALLENGE',{boss:id},true));if(reason)c.append(el('p','choice-note',reason));p.append(c);}
 };
})();
