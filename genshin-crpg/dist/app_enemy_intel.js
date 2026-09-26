/* Enemy inspection is a view: no action(), random(), mutation or save calls. */
const EnemyIntel={
 cache:new Map(),battleId:null,selected:null,pinned:false,lastSkill:null,toast:null,toastTimer:null,panel:null,dialog:null,resumeToken:null,
 small(){return matchMedia('(max-width: 1100px)').matches;},
 capture(){
  const b=game?.s.runtime;if(!b)return;
  if(this.battleId!==b.id){this.battleId=b.id;this.selected=null;this.pinned=false;this.lastSkill=null;}
  this.cache=new Map(b.actors.filter(a=>a.side==='ENEMY').map(a=>[a.id,game.enemyIntel(a.id)]));
  if(!this.cache.has(this.selected))this.selected=b.actors.find(a=>a.side==='ENEMY'&&a.hp>0)?.id||this.cache.keys().next().value;
 },
 detail(info,{compact=false,skill=null,replay=false}={}){
  const box=el('div','enemy-intel-content');if(!info){box.append(el('p','muted','적의 이름에 마우스를 올리거나 정보 버튼을 누르세요.'));return box;}
  box.append(el('small','eyebrow','적 정보 · '+(info.grade||'')+' · Lv.'+info.level),el('h2','enemy-intel-name',info.name));
  if(replay)box.append(el('p','intel-replay-note','재생 시작 시점의 상태입니다. 이번 행동은 아래 기술 알림으로 확인하세요. 다음 조작 차례에 상태가 갱신됩니다.'));
  const stats=el('dl','intel-stats');for(const [key,value]of [['HP',Math.ceil(info.hp)+' / '+Math.ceil(info.maxHp)],['공격',Math.round(info.atk)],['방어',Math.round(info.def)],['속도',Math.round(info.spd)],['사거리',info.range],['보호막',Math.ceil(info.shield)]]){const pair=el('div');pair.append(el('dt','',key),el('dd','',String(value||0)));stats.append(pair);}box.append(stats);
  if(info.airborne&&info.grade!=='보스')box.append(el('p','intel-cue warning','공중 목표 · 원거리·대공 또는 명시적 접근 기술이 필요합니다.'));
  for(const cue of (info.grade==='보스'?[]:info.cues||[])){const line=el('div','intel-cue '+cue.kind);line.append(el('strong','',cue.text),el('small','',cue.detail));box.append(line);}
  for(const shield of info.shields||[]){const line=el('p','intel-shield');line.append(el('strong','',shield.element+' 보호막 '+shield.value));if(info.grade!=='보스'&&shield.weakness.length)line.append(el('span','','보호막 추가 피해 · '+shield.weakness.join(' / ')));box.append(line);}
  if(info.statuses.length)box.append(el('p','intel-status','상태 · '+info.statuses.map(s=>s.name+(Number.isFinite(s.rounds)?' '+s.rounds+'R':'')).join(' / ')));
  if(info.legacy)box.append(el('p','intel-replay-note','업데이트 전부터 진행 중인 전투입니다. 새로운 적 패턴은 다음 전투부터 적용됩니다.'));
  const list=el('div','intel-skill-list');
  const sorted=info.cards.slice().sort((a,b)=>Number(b.charging)-Number(a.charging)||Number(b.id===skill)-Number(a.id===skill)||Number(a.passive)-Number(b.passive));
  for(const c of sorted){
   const entry=el('details','intel-skill'+(!c.supported?' unsupported':''));entry.dataset.skillId=c.id;entry.open=c.id===skill||c.charging;
   const summary=el('summary');summary.append(el('strong','',c.name));
   const availability=!c.supported?'실행 미지원':c.passive?'자동·상시':c.charging?'준비 중':c.remaining>0?'대기 '+c.remaining+'차례':c.available?'사용 가능':'조건 미충족';summary.append(el('span','intel-badge'+(c.charging?' danger':''),availability));entry.append(summary);
   const body=el('div','intel-skill-body');body.append(el('p','intel-skill-meta',[c.element,c.target,c.cooldown?'재사용 '+c.cooldown+'차례':c.passive?'자동 발동':'재사용 없음'].filter(Boolean).join(' · ')));
   if(c.coefficient)body.append(el('p','',c.coefficient));
   body.append(el('p','',c.description),el('p','intel-condition','발동 조건 · '+(c.condition||'조건 없음')));
   if(c.unavailableReason)body.append(el('p','intel-condition','현재 제한 · '+c.unavailableReason));
   if(info.grade!=='보스'){const counter=el('div','intel-counter');counter.append(el('strong','','대응 방법'),el('p','',c.counter));body.insertBefore(counter,body.children[1]||null);}
   if(c.authored)body.append(el('small','muted','기존 몬스터의 행동을 카드화한 CRPG 전용 명칭·수치입니다.'));
   if(!c.supported)body.append(el('small','muted',c.reason||'정의만 존재하는 기술입니다.'));
   entry.append(body);list.append(entry);
  }
  box.append(el('h3','intel-section-title','보유 기술 · '+info.cards.length),list,el('p','intel-footnote','대기시간은 이 적의 자기 차례에 감소합니다. 사용 가능 표시는 조건 충족 여부이며 다음 행동을 확정 예고하지는 않습니다.'));
  return box;
 },
 refreshPanel(){
  if(!this.panel?.isConnected)return;
  const info=this.cache.get(this.selected);this.panel.replaceChildren();
  const top=el('div','intel-panel-top');top.append(el('h2','','적 기술 정보'),button(this.pinned?'고정 해제':'정보 고정',()=>{this.pinned=!this.pinned;this.refreshPanel();}));
  this.panel.append(top,el('p','intel-help',this.pinned?'정보 고정 중 · 다른 적은 정보 버튼으로 선택':'적 이름에 마우스를 올리면 미리보기 · 클릭하면 고정'));
  const body=el('div','intel-panel-scroll');body.append(this.detail(info));this.panel.append(body);this.highlight();
 },
 highlight(){for(const n of root.querySelectorAll('.combatant-row[data-side="ENEMY"]'))n.classList.toggle('intel-selected',n.dataset.actorId===this.selected);},
 select(id,pin=false){if(!this.cache.has(id)||(!pin&&this.pinned))return;this.selected=id;if(pin)this.pinned=true;this.refreshPanel();},
 open(id=this.selected,skill=null){
  this.select(id,true);const info=this.cache.get(id);if(!info)return;
  if(!this.dialog){const dialog=el('dialog','enemy-intel-dialog');dialog.id='enemy-intel-dialog';dialog.setAttribute('aria-labelledby','enemy-intel-dialog-title');document.body.append(dialog);this.dialog=dialog;dialog.addEventListener('close',()=>this.restorePlayback());dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();}});}
  if(GameEffects.active&&!this.dialog.open){this.resumeToken={generation:GameEffects.generation,wasPaused:GameEffects.paused};GameEffects.paused=true;CombatFX.pause(true);GameEffects.reschedule();}
  const head=el('header','intel-dialog-head'),title=el('h2','','적 기술 정보');title.id='enemy-intel-dialog-title';const close=button('닫기',()=>this.dialog.close());close.setAttribute('aria-label','적 정보 닫기');head.append(title,close);
  const content=el('div','intel-dialog-scroll');content.append(this.detail(info,{skill,replay:GameEffects.active}));this.dialog.replaceChildren(head,content);
  if(!this.dialog.open)this.dialog.showModal();close.focus({preventScroll:true});
  if(skill)requestAnimationFrame(()=>content.querySelector('[data-skill-id="'+CSS.escape(skill)+'"]')?.scrollIntoView({block:'nearest'}));
 },
 restorePlayback(){const token=this.resumeToken;this.resumeToken=null;if(token&&GameEffects.active&&token.generation===GameEffects.generation&&!token.wasPaused){GameEffects.paused=false;CombatFX.pause(false);GameEffects.reschedule();}},
 attach(p){
  const stage=p.querySelector('.compact-battle-stage');if(!stage)return;stage.classList.remove('with-enemy-intel');this.panel=null;
  const toolbar=el('div','enemy-intel-toolbar combat-info-tools');toolbar.append(button('적 기술 정보',()=>this.open()),el('small','','적 카드의 상세 설명은 필요할 때만 엽니다.'));
  const controls=p.querySelector('.battle-command');if(controls)controls.prepend(toolbar);else p.insertBefore(toolbar,stage);
  const recent=el('details','enemy-skill-history');recent.append(el('summary','','최근 적 기술 다시 보기'));
  const b=game.s.runtime,entries=(b.log||[]).filter(e=>e.card&&(e.actorId?this.cache.has(e.actorId):[...this.cache.values()].some(a=>a.name===e.actor))).slice(-12).reverse();
  if(!entries.length)recent.append(el('p','muted','아직 사용한 적 기술이 없습니다.'));
  for(const e of entries){const id=e.actorId||[...this.cache].find(([,a])=>a.name===e.actor)?.[0];if(!id)continue;const name=e.cardName||this.cache.get(id).cards.find(c=>c.id===e.card)?.name||'기본 공격';recent.append(button('R'+e.round+' · '+this.cache.get(id).name+' — '+name+(e.charging?' 준비':e.interrupted?' 중단':''),()=>this.open(id,e.card)));}
  p.append(recent);
 },
 hideToast(){clearTimeout(this.toastTimer);this.toast?.remove();this.toast=null;},
 showSkill(frame){
  if(!this.cache.has(frame.actorId)){this.hideToast();return;}
  const info=this.cache.get(frame.actorId),events=frame.events||[frame],cardId=events.find(e=>e.cardId)?.cardId,card=info.cards.find(c=>c.id===cardId);
  const state=events.some(e=>e.interrupted)?'기술 중단':events.some(e=>e.charging)?'기술 준비':events.some(e=>e.released)?'준비 기술 발동':'적 기술';
  this.lastSkill={id:frame.actorId,card:cardId};this.hideToast();
  const toast=el('section','enemy-skill-toast');toast.setAttribute('aria-label','현재 적 기술');toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  const caption=el('div','enemy-skill-caption');caption.append(el('small','',state+' · '+info.name),el('strong','',frame.cardName||card?.name||'기본 공격'));
  const summary=events.find(e=>e.charging||e.interrupted)?.skillText||[card?.element,card?.target,card?.cooldown?'재사용 '+card.cooldown+'차례':''].filter(Boolean).join(' · ');
  caption.append(el('span','',summary));toast.append(caption,button('기술 확인',()=>this.open(frame.actorId,cardId)),button('×',()=>this.hideToast()));toast.lastChild.setAttribute('aria-label','기술 알림 닫기');document.body.append(toast);this.toast=toast;
  const updatePosition=()=>{if(!this.toast)return;const dock=GameEffects.dock,r=dock?.getBoundingClientRect();if(r)this.toast.style.bottom=(innerHeight-r.top+10)+'px';};updatePosition();
  const dismiss=()=>{if(this.toast!==toast)return;if(GameEffects.paused||toast.matches(':hover')||toast.contains(document.activeElement))this.toastTimer=setTimeout(dismiss,400);else this.hideToast();};this.toastTimer=setTimeout(dismiss,2300/(settings.combatSpeed||1));
  if(GameEffects.dock&&!GameEffects.dock.querySelector('.playback-enemy-info')){const btn=button('적 기술 확인',()=>this.open(this.lastSkill?.id||this.selected,this.lastSkill?.card));btn.classList.add('playback-enemy-info');GameEffects.dock.querySelector('.playback-buttons')?.append(btn);}
 }
};
const intelActorRow=battleActorRow;
battleActorRow=function(a,...args){const row=intelActorRow(a,...args);if(a.side!=='ENEMY')return row;
 const info=button('정보',()=>{EnemyIntel.select(a.id,true);if(EnemyIntel.small())EnemyIntel.open(a.id);});info.classList.add('enemy-info-button');info.setAttribute('aria-label',a.name+' 기술과 대응 정보');info.addEventListener('focus',()=>EnemyIntel.select(a.id));row.append(info);
 const name=row.querySelector('.combatant-copy strong');if(name){name.classList.add('enemy-inspect-name');name.tabIndex=0;name.setAttribute('role','button');name.setAttribute('aria-label',a.name+' 정보 열기');name.addEventListener('mouseenter',()=>EnemyIntel.select(a.id));name.addEventListener('focus',()=>EnemyIntel.select(a.id));name.addEventListener('click',()=>{EnemyIntel.select(a.id,true);EnemyIntel.open(a.id);});name.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();EnemyIntel.open(a.id);}});}
 if(a.enemyCharge){const cue=el('small','enemy-charge-chip','준비 중 · '+a.enemyCharge.name);row.querySelector('.combatant-copy')?.append(cue);}
 return row;
};
const intelCombat=combat;combat=function(p){EnemyIntel.capture();intelCombat(p);EnemyIntel.attach(p);};
const intelShow=GameEffects.showAction;GameEffects.showAction=function(frame){intelShow.call(this,frame);EnemyIntel.showSkill(frame);};
const intelCancel=GameEffects.cancel;GameEffects.cancel=function(...args){EnemyIntel.hideToast();if(EnemyIntel.dialog?.open){EnemyIntel.resumeToken=null;EnemyIntel.dialog.close();}return intelCancel.apply(this,args);};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!EnemyIntel.dialog?.open){EnemyIntel.hideToast();if(EnemyIntel.pinned){EnemyIntel.pinned=false;EnemyIntel.refreshPanel();}}});
