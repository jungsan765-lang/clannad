/* 0.14.7 모험가 핸드북 (F1). One place for "what can I do now": the next step of the journey, field bosses and
 * two-day bosses with today's limits, this hour's ley line blossoms, the Spiral Abyss record and how to meet each
 * companion. Read-only views of the existing rules. The only controls are 길 안내 (the travel map's destination,
 * the same NavigationUI.choose the ley line card uses) and buttons that open existing screens through the menu. */
(function(){
'use strict';
const H=window.CRPGHandbook={tab:'journey',node:null,isOpen(){return !!H.node;},open,close,refresh};
const mk=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined&&text!==null)e.textContent=String(text);return e;};
const fmt=n=>Math.round(Number(n)||0).toLocaleString('ko-KR');
const mapRow=id=>game.tables['32_MAP_DB']?.get(id);
const mapLabel=id=>mapRow(id)?.[2]||'알 수 없는 장소';
const regionOf=id=>mapRow(id)?.[1]||'';
const itemName=id=>game.tables['14_ITEM_DB']?.get(id)?.[1]||id;
const charName=id=>game.tables['07_CHAR_DB']?.get(id)?.[1]||id;
const icon=(n,c)=>window.CRPGShell?.icon?CRPGShell.icon(n,c):mk('span');
const TABS=[['journey','여정','STORY'],['bosses','토벌','SWORDS'],['ley','지맥의 꽃','STAR'],['abyss','나선비경','CLOCK'],['companions','동료','PARTY']];
function guide(map){
 if(!map||!game)return;close();
 if(game.s.global.CURRENT_MAP_ID===map){window.CRPGShell?.toast?.('이미 '+mapLabel(map)+'에 있습니다.');return;}
 const go=()=>{if(typeof NavigationUI!=='undefined'){NavigationUI.choose(map);}window.CRPGShell?.openMap?.();window.CRPGShell?.toast?.('길 안내 · '+mapLabel(map)+' · 지도에서 다음 구역을 확인하세요.');};
 if(window.CRPGShell?.screen!=='LOCATION'){if(window.CRPGShell?.open?.('LOCATION')===false)return;setTimeout(go,60);}else go();
}
function guideButton(map,label='길 안내'){
 const here=game.s.global.CURRENT_MAP_ID===map,b=mk('button','hb-guide'+(here?' here':''));b.type='button';
 b.append(icon(here?'PIN':'MAP'),mk('span','',here?'현재 위치':label));b.disabled=here||!!game.s.runtime;
 if(game.s.runtime)b.title='전투 중에는 길 안내를 바꿀 수 없습니다.';b.onclick=()=>guide(map);return b;
}
function row(cls,title,sub,side){const r=mk('article','hb-row '+(cls||''));const copy=mk('div','hb-copy');copy.append(mk('strong','',title));for(const s of [].concat(sub||[]))if(s)copy.append(typeof s==='string'?mk('small','',s):s);r.append(copy);if(side)r.append(side);return r;}
function section(title,note){const s=mk('section','hb-section');s.append(mk('h3','',title));if(note)s.append(mk('p','hb-note',note));return s;}
function chip(text,kind=''){return mk('span','hb-chip '+kind,text);}
// ---------- tabs ----------
function journey(box){
 const g=game.s.global;
 const top=mk('div','hb-hero');
 let growth=null;try{growth=game.growth('PLAYER_CUSTOM');}catch{}
 const lv=mk('div','hb-level');lv.append(mk('small','','모험 등급'),mk('b','',g.PLAYER_LEVEL_STATE||1),mk('span','',growth?.max?'최대 레벨':'다음 레벨까지 경험치 '+fmt((growth?.next||0)-(growth?.xp||0))));
 const bar=mk('div','hb-xp'),fill=mk('i');fill.style.width=(growth?.max?100:Math.max(0,Math.min(100,(growth?.xp||0)/(growth?.next||1)*100)))+'%';bar.append(fill);lv.append(bar);
 top.append(lv);
 const party=mk('div','hb-party');for(const m of game.s.party.filter(x=>x.active)){let gr=null;try{gr=game.growth(m.source);}catch{}party.append(chip((m.source==='PLAYER_CUSTOM'?g.PLAYER_NAME:charName(m.source))+' Lv.'+(gr?.level||'?')));}
 top.append(party);box.append(top);
 // The current objective, from the same data the location screen uses.
 const obj=section('지금 할 일');
 let info=null;try{info=game.objectiveInfo?.();}catch{}
 const goal=(()=>{try{return game.navigationGoal?.();}catch{return null;}})();
 if(info&&(info.title||info.text)){obj.append(row('hb-goal',info.title||'다음 여정',[info.text||'',info.target?'목적지 · '+mapLabel(info.target):''],info.target?guideButton(info.target):null));}
 else if(goal)obj.append(row('hb-goal','다음 여정',['목적지 · '+mapLabel(goal)],guideButton(goal)));
 const offers=(game.mainStoryEntries?.()||[]).filter(c=>c.available&&!c.reason&&(c.state||'미시작')==='미시작');
 for(const c of offers.slice(0,3))obj.append(row('hb-offer','새 이야기 · 「'+(c.title||c.name||c.label||'이야기')+'」',['임무 화면이나 메인 화면에서 시작할 수 있습니다.']));
 if(obj.children.length<3)obj.append(mk('p','hb-note','지금 이어지는 본편 목표가 없습니다. 개인 임무·의뢰·토벌로 성장한 뒤 다음 이야기를 기다려 보세요.'));
 box.append(obj);
 // Today's limits at a glance.
 const today=section('오늘의 기록','게임 내 하루와 현실 시간을 따로 셉니다.');const list=mk('div','hb-grid');
 try{const d=game.fieldBossDaily?.();if(d)list.append(stat('필드 보스 토벌',d.wins+' / '+d.limit,d.left?'이번 12시간 동안 '+d.left+'번 더 토벌할 수 있습니다 · '+(d.resetAt||'')+' 초기화':'한국 시간 '+(d.resetAt||'0시·12시')+'에 다시 토벌할 수 있습니다.',d.left?'':'spent'));}catch{}
 try{const st=game.leyLineStatus?.();if(st)list.append(stat('지맥의 꽃',st.unlocked?st.blossoms.filter(b=>b.claimed).length+' / '+st.blossoms.length:'Lv. '+st.minLevel+'부터',st.unlocked?'정각까지 '+st.minutesLeft+'분 · 꽃마다 한 시간에 한 번 받습니다.':'주인공 레벨이 오르면 매시 정각에 핍니다.'));}catch{}
 try{const cfg=CRPGRuntime.enhancementConfig,ids=Object.keys(cfg?.bosses||{});if(ids.length){const used=ids.filter(id=>game.bossAdmission?.(id)?.reason).length;list.append(stat('일일 보스',used+' / '+ids.length+' 입장','보스마다 현실 시간으로 하루에 한 번 · 한국 시간 0시에 초기화',used===ids.length?'spent':''));}}catch{}
 today.append(list);box.append(today);
}
function stat(title,value,note,cls=''){const c=mk('div','hb-stat '+cls);c.append(mk('small','',title),mk('strong','',value),mk('p','',note));return c;}
function bosses(box){
 const fb=CRPGRuntime.fieldBosses,routes=game.rows('35_BOSS_ROUTE_DB').filter(r=>String(r[0]).startsWith('BRT_FB_'));
 const daily=(()=>{try{return game.fieldBossDaily?.();}catch{return null;}})();
 const s1=section('필드 보스','보스마다 고정된 레벨입니다. 낮은 레벨부터 차례로 도전하세요. 모두 합쳐 12시간마다(한국 시간 0시·12시 초기화) '+(daily?.limit||3)+'번까지 토벌할 수 있습니다.'+(daily?' 이번 토벌 '+daily.wins+'/'+daily.limit+'.':''));
 const items=routes.map(r=>{const id=String(r[0]).slice(4);let info=null;try{info=game.fieldBossRouteInfo?.(r[0]);}catch{}return {r,id,map:r[2],level:info?.level||fb?.levels?.[id]||fb?.bosses?.[id]?.level||0,info};}).sort((a,b)=>a.level-b.level);
 for(const x of items){const i=x.info;const subs=[regionOf(x.map)+' · '+mapLabel(x.map)];if(i?.material?.name)subs.push('보상 · '+i.material.name);
  const state=i?.cooldown?.reason?chip('재등장 대기','wait'):i?.daily&&!i.daily.left?chip('횟수 소진','wait'):i?.low?.length?chip('레벨 부족','warn'):chip('도전 가능','ok');
  const r=row('hb-boss',(i?.name||x.r[1])+' · Lv.'+x.level,subs,guideButton(x.map));r.querySelector('.hb-copy strong').after(state);
  if(i?.cooldown?.reason)r.querySelector('.hb-copy').append(mk('small','hb-reason',i.cooldown.reason));
  s1.append(r);}
 if(!items.length)s1.append(mk('p','hb-note','아직 알려진 필드 보스가 없습니다.'));
 box.append(s1);
 const s2=section('일일 보스','본편에서 쓰러뜨린 보스와 다시 싸웁니다. 보스마다 현실 시간으로 하루에 한 번 입장할 수 있고, 한국 시간 0시에 다시 열립니다.');
 const cfg=CRPGRuntime.enhancementConfig;
 for(const [id,b]of Object.entries(cfg?.bosses||{})){let reason='',adm=null,rm=null;try{reason=game.materialChallengeReason?.(id)||'';adm=game.bossAdmission?.(id);rm=game.bossRematchInfo?.(id);}catch{}
  const name=game.tables['09_MONSTER_DB']?.get(id)?.[1]||id;const r=row('hb-boss',name+(rm?' · Lv.'+rm.level:''),[mapLabel(b.map),rm?'보상 · 영웅의 경험 '+Object.values(rm.books||{}).reduce((a,n)=>a+n,0)+'권 · 강적의 잔향':'보상 · 강적의 잔향'],guideButton(b.map));
  r.querySelector('.hb-copy strong').after(adm?.reason?chip('오늘 입장함','wait'):reason?chip('조건 미충족','warn'):chip('입장 가능','ok'));
  if(adm?.reason)r.querySelector('.hb-copy').append(mk('small','hb-reason',adm.reason));else if(reason)r.querySelector('.hb-copy').append(mk('small','hb-reason',reason));
  s2.append(r);}
 const farm=CRPGRuntime.liyueArtifactConfig?.farm;
 for(const [kind,f]of Object.entries(farm||{})){let reason='';try{reason=game.liyueArtifactFarmReason?.(kind)||'';}catch{}
  const r=row('hb-boss',f.name+' · 반복 도전',[mapLabel(f.map),f.reward==='ARTIFACT'?'보상 · 성유물':'보상 · 성유물 강화 재료'],guideButton(f.map));
  r.querySelector('.hb-copy strong').after(/하루에 한 번/.test(reason)?chip('오늘 입장함','wait'):reason?chip('조건 미충족','warn'):chip('입장 가능','ok'));if(reason)r.querySelector('.hb-copy').append(mk('small','hb-reason',reason));s2.append(r);}
 box.append(s2);
}
function ley(box){
 let st=null;try{st=game.leyLineStatus?.();}catch{}
 const L=CRPGRuntime.leyLines;
 const s=section('이번 시간의 지맥의 꽃',st?(st.unlocked?'매시 정각에 자리를 옮깁니다 · 정각까지 '+st.minutesLeft+'분':'주인공 Lv. '+st.minLevel+'부터 핍니다.'):'지맥의 꽃 정보를 불러오지 못했습니다.');
 if(st?.unlocked){for(const b of st.blossoms){const r=row('hb-ley '+String(b.kind||'').toLowerCase(),b.name,[b.region+' · '+b.mapName,b.claimed?'이번 시간 보상 받음':'보상을 받을 수 있습니다'],b.claimed?null:guideButton(b.map));r.querySelector('.hb-copy strong').after(chip(b.kind==='REVELATION'?'경험치 책':'모라',b.kind==='REVELATION'?'blue':'gold'));s.append(r);}}
 box.append(s);
 if(L?.tiers){const t=section('단계','높은 단계일수록 적이 강하고 보상이 큽니다. 단계마다 도전할 수 있는 주인공 레벨이 정해져 있습니다.');const table=mk('table','hb-table');const head=mk('tr');for(const h of ['단계','적 레벨','도전 조건','계시의 꽃','부의 꽃'])head.append(mk('th','',h));table.append(head);
  const lv=Number(game.s.global.PLAYER_LEVEL_STATE)||1;
  for(const x of L.tiers){const tr=mk('tr',lv>=x.minLevel?'open':'locked');for(const v of [x.tier+'단계','Lv. '+x.level,'주인공 Lv. '+x.minLevel,Object.entries(x.books||{}).map(([id,n])=>itemName(id)+' '+n).join(' · ')||'-',fmt(x.mora)+' 모라'])tr.append(mk('td','',v));table.append(tr);}
  t.append(table);box.append(t);}
}
function abyss(box){
 let v=null;try{v=game.abyssView?.();}catch{}
 if(!v){box.append(mk('p','hb-note','나선비경 기록이 없습니다.'));return;}
 const cleared=v.floors.filter(f=>f.cleared).length;
 const mark=v.markName||'나선 각인';
 const s=section('나선비경 기록','층마다 방 세 개를 연달아 공략합니다. 층을 정복하면 함께 싸운 동료에게 「'+mark+'」이 새겨지고, 각인된 동료는 도전을 전부 초기화하기 전까지 다른 층에 나설 수 없습니다(주인공은 새겨지지 않습니다). 10~12층은 파티 전원이 Lv. 20이어야 도전할 수 있습니다.');
 const hero=mk('div','hb-grid');hero.append(stat('클리어한 층',cleared+' / '+v.floors.length,cleared?'최고 기록을 갱신해 보세요.':'1층부터 도전할 수 있습니다.'));
 if(v.active)hero.append(stat('진행 중',v.active.floor+'층 '+v.active.chamber+'번 방',v.active.floorName||''));
 s.append(hero);
 const list=mk('div','hb-floors');for(const f of v.floors){const c=mk('div','hb-floor'+(f.cleared?' cleared':'')+(f.reason?' locked':''));c.append(mk('b','',f.floor+'층'),mk('small','',f.cleared?(f.best?f.best+'라운드':'클리어'):f.reason?'잠김':'도전 가능'));c.title=f.name+(f.reason?' · '+f.reason:'');list.append(c);}
 s.append(list);box.append(s);
}
function companions(box){
 let list=[];try{list=game.recruitmentEntries?.()||[];}catch{}
 if(!list.length){box.append(mk('p','hb-note','동료 정보를 불러오지 못했습니다.'));return;}
 const owned=list.filter(x=>x.owned).length;
 const s=section('동료 '+owned+' / '+list.length,'각 동료의 개인 임무를 마치면 동행을 제안받습니다. 조건을 모두 채운 임무는 임무 화면에서 시작할 수 있습니다.');
 const filter=mk('div','hb-filter');let mode=H.companionFilter||'todo';
 const grid=mk('div','hb-companions');
 const draw=()=>{grid.replaceChildren();for(const x of list.filter(x=>mode==='all'||(mode==='todo'?!x.owned:x.owned))){const c=mk('article','hb-companion'+(x.owned?' owned':''));const met=(x.requirements||[]).filter(r=>r.met).length,total=(x.requirements||[]).length;
  c.append(mk('strong','',x.name),mk('small','',x.region+' · '+(x.owned?'동행 중':x.complete?'임무 완료':met+' / '+total+' 조건')));
  if(!x.owned){const ul=mk('ul','hb-reqs');for(const r of (x.requirements||[]).slice(0,4))ul.append(mk('li',r.met?'met':'unmet',r.label));c.append(ul);}
  grid.append(c);}if(!grid.children.length)grid.append(mk('p','hb-note',mode==='todo'?'모든 동료가 함께하고 있습니다.':'아직 함께하는 동료가 없습니다.'));};
 for(const [id,label]of [['todo','합류 전'],['owned','합류함'],['all','전체']]){const b=mk('button','hb-filter-button'+(mode===id?' active':''),label);b.type='button';b.onclick=()=>{mode=H.companionFilter=id;for(const x of filter.children)x.classList.toggle('active',x===b);draw();};filter.append(b);}
 s.append(filter,grid);draw();box.append(s);
}
const DRAW={journey,bosses,ley,abyss,companions};
// ---------- frame ----------
function open(tab){
 if(!game)return;if(tab)H.tab=tab;if(H.node){refresh();return;}
 const wrap=mk('div','handbook');wrap.setAttribute('role','dialog');wrap.setAttribute('aria-modal','true');wrap.setAttribute('aria-label','모험가 핸드북');
 wrap.addEventListener('click',e=>{if(e.target===wrap)close();});
 const book=mk('div','hb-book'),side=mk('nav','hb-side'),page=mk('div','hb-page');
 const title=mk('div','hb-title');title.append(icon('HANDBOOK','shell-icon hb-glyph'),mk('strong','','모험가 핸드북'),mk('small','','F1'));side.append(title);
 const tabs=mk('div','hb-tabs');tabs.setAttribute('role','tablist');
 for(const [id,label,ic]of TABS){const b=mk('button','hb-tab');b.type='button';b.dataset.tab=id;b.setAttribute('role','tab');b.append(icon(ic),mk('span','',label));b.onclick=()=>{if(H.tab!==id)window.CRPGSound?.play('page');H.tab=id;refresh();};tabs.append(b);}
 side.append(tabs);
 const close_=mk('button','hb-close');close_.type='button';close_.setAttribute('aria-label','핸드북 닫기 (Esc)');close_.append(icon('CLOSE'));close_.onclick=close;
 book.append(side,page,close_);wrap.append(book);document.body.append(wrap);H.node=wrap;document.body.classList.add('shell-menu-open');
 refresh();requestAnimationFrame(()=>wrap.classList.add('open'));window.CRPGSound?.play('handbook_open');
 wrap.querySelector('.hb-tab.active')?.focus({preventScroll:true});
}
function refresh(){
 if(!H.node||!game)return;const page=H.node.querySelector('.hb-page');page.replaceChildren();
 for(const b of H.node.querySelectorAll('.hb-tab')){const on=b.dataset.tab===H.tab;b.classList.toggle('active',on);b.setAttribute('aria-selected',String(on));}
 const [,label]=TABS.find(t=>t[0]===H.tab)||TABS[0];const head=mk('header','hb-head');head.append(mk('h2','',label));page.append(head);
 const body=mk('div','hb-body');try{(DRAW[H.tab]||journey)(body);}catch(e){body.append(mk('p','hb-note','이 항목을 표시하지 못했습니다. '+e.message));}page.append(body);
}
function close(){const n=H.node;if(!n)return;H.node=null;n.classList.remove('open');window.CRPGSound?.play('menu_close');if(!window.CRPGShell?.menu)document.body.classList.remove('shell-menu-open');setTimeout(()=>n.remove(),160);}
// A new render (an action finished) may change the numbers; keep an open handbook current.
if(typeof render==='function'){const prior=render;render=function(){prior();if(H.node){if(!game)close();else refresh();}};}
})();
