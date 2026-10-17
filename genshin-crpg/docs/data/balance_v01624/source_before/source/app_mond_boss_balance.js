/* Explicit battle access is a runtime flag, not a DB status row. */
const bossStatusName=safeName;safeName=function(table,id,col=1){if(table==='13_STATUS_EFFECT_DB'&&id==='EXPLICIT_ACCESS_TO_BOSS_DVALIN')return '공중 접근';return bossStatusName(table,id,col);};
/* Boss readiness and all-side technique headings. View-only; no RNG/actions. */
const BattleTechnique={
 actors:new Map(),current:null,banner:null,dialog:null,resumeToken:null,
 capture(){const b=game?.s.runtime;if(b)this.actors=new Map(b.actors.map(a=>[a.id,{id:a.id,name:a.name,side:a.side,source:a.source}]));},
 // 0.15.25 (user: 「이거 그냥 격동의 바람에 힐이 붙어있는겨? 머라머라 씨부려싸고 있는 글만 적혀있으니 못알아쳐먹겠네」): a heal or hit
 // that is not a fighter's own action — a gear trait such as 처치 회복, a lasting status — says plainly what it is, where it
 // comes from and what it did this time, instead of a paragraph about the playback.
 results(events){return events.map(e=>Number(e.heal)>0?e.target+' 체력 +'+e.heal:Number(e.damage)>0?e.target+' 피해 '+e.damage:Number(e.shield)>0?e.target+' 보호막 +'+e.shield:'').filter(Boolean);},
 effect(frame,events){
  const label=String(frame.actor||''),catalog=globalThis.CRPGRuntime?.traitCatalog||{},key=Object.keys(catalog).find(k=>catalog[k].label===label);
  const names=[...new Set(events.map(e=>e.target).filter(Boolean))],who=[...this.actors.values()].find(a=>a.name===names[0]);
  if(key&&who){const gear=game.s.inventory.filter(i=>i.equipped&&i.owner===who.source&&i.equip).map(i=>({i,line:(game.gearTraitLines?.(i.equip)||[]).find(l=>l.key===key)})).find(x=>x.line);
   return {frame,effect:true,cardId:null,name:label,state:'발동',actor:who,side:who.side,owner:who.name,source:gear?safeName('16_EQUIP_DB',gear.i.equip):'장비 효과',description:gear?gear.line.text.replace(/^[^·]*·\s*/,''):label,trigger:frame.cardName||'',results:this.results(events),targets:names,events,cooldown:0,coefficient:''};}
  const status=game.rows?.('13_STATUS_EFFECT_DB')?.find(r=>r[1]===label);
  if(status)return {frame,effect:true,cardId:null,name:label,state:'지속 효과',actor:who||null,side:who?.side||'EFFECT',owner:who?.name||'전장',source:'상태 효과',description:status[3]||'',trigger:'',results:this.results(events),targets:names,events,cooldown:0,coefficient:''};
  return null;
 },
 definition(frame){const events=frame.events||[frame],actor=this.actors.get(frame.actorId),cardId=events.find(e=>e.cardId)?.cardId||frame.cardId;
  if(!actor&&frame.actor&&![...this.actors.values()].some(a=>a.name===frame.actor)){const fx=this.effect(frame,events);if(fx)return fx;}
  const own=game?.combatRows('08_SKILL_CARD_DB').find(r=>r[0]===cardId),enemy=own?null:game?.combatRows('12_ENEMY_CARD_DB').find(r=>r[0]===cardId);
  let name=frame.cardName||own?.[3]||enemy?.[2];
  if(cardId==='SYS_MOND_WIND_ROUTE')name='상승 기류 · 바람길 확보';
  if(!name)name=events.some(e=>e.kind==='guard')?'방어 태세':events.some(e=>e.kind==='heal')?'회복 효과':frame.periodic?'지속 효과':'기본 공격';
  const state=events.some(e=>e.interrupted)?'중단':events.some(e=>e.charging)?'준비':events.some(e=>e.released)?'발동':frame.periodic?'지속 효과':'사용';
  return {frame,cardId,name,state,actor,side:actor?.side||events.find(e=>e.actorSide)?.actorSide||'EFFECT',owner:actor?.name||frame.actor||'전장 효과',description:own?.[16]||enemy?.[17]||'',coefficient:own?.[7]||enemy?.[6]||'',cooldown:own?(game.cardDefinition?.(own)?.cooldown??own[9]):enemy?.[8],targets:[...new Set((frame.targets||[]).map(t=>t.target).filter(Boolean))],events};
 },
 // 0.16.7 (user: 「전투 로그중에, 지금 당장 아군이나 적이 어떤 기술을 쓰는지 보여주는 그거 있잖아. 그것도 좀 없애고, 차라리 기술명만 탁
 // 나오고 어떤 기술인지 확인하는건 정보창에서 보게 하자. 기술명 나오는건 전투화면에서 나오는게 더 좋아보여.」): the box at the left of
 // the playback dock (who · 사용 · name · 대상 · 「기술 정보」) is gone. A skill's name pops up over the battlefield for a
 // moment — the ally's in teal, the foe's in red, 「…준비」 when it is wound up — and what it does is read in the
 // fighter's 「정보」 window. Plain attacks, guarding and lasting ticks say nothing.
 // (user: 「전투할때 추가적인 효과라던지 이런게 전투표현에 들어가니 적 쪽에서 공격을 하는것으로 착각하게끔 보이는 것 같기도 해.」) Only a
 // fighter's own chosen skill is named, over its own side: follow-up hits, fields, summons, hazards, reactions, gear traits
 // and lasting effects say nothing, and an ally's name never shows over the foes.
 extra(frame){const ev=frame.events||[],id=String(frame.actorId||'');
  return !!frame.periodic||['FOLLOWUP','FIELD','OBJECT','SUMMON','HAZARD','SHIELD_BREAK','REACTION','TRAIT','STATUS'].includes(frame.sourceKind)||/^(SUMMON|HAZARD):/.test(id)||ev.length>0&&ev.every(e=>(e.sourceKind&&e.sourceKind!=='JOINT_ATTACK')||e.kind==='reaction');},
 show(frame){if(!frame||['victory','defeat'].includes(frame.kind)){this.callout?.remove();this.callout=null;return;}
  const d=this.definition(frame);this.current=d;this.banner?.remove();this.banner=null;
  if(d.effect||!d.actor||!['ALLY','ENEMY'].includes(d.side)||this.extra(frame)||['기본 공격','방어 태세','회복 효과','지속 효과'].includes(d.name))return;
  this.pop(d);
 },
 pop(d){
  const panel=document.querySelector('.combat-panel'),field=panel?.querySelector(d.side==='ENEMY'?'.shell-enemies':'.shell-allies');if(!field)return;
  this.callout?.remove();const box=el('div','skill-callout '+(d.side==='ENEMY'?'enemy':'ally')+(d.state==='준비'?' ready':''));box.setAttribute('role','status');box.setAttribute('aria-live','polite');
  box.append(el('strong','skill-callout-name',d.name+(d.state==='준비'?' · 준비':'')),el('small','skill-callout-who',d.owner));
  // Over the side that uses it: the top of the foes' half, or the top of the party's.
  const r=field.getBoundingClientRect();box.style.left=Math.round(r.left+r.width/2)+'px';box.style.top=Math.round(Math.max(d.side==='ENEMY'?56:4,r.top+6))+'px';
  document.body.append(box);this.callout=box;
  const speed=Number(typeof settings!=='undefined'&&settings.combatSpeed)||1,reduce=document.documentElement.classList.contains('reduce-motion')||(typeof settings!=='undefined'&&!!settings.reducedMotion);
  if(box.animate&&!reduce){const a=box.animate([{opacity:0,transform:'translate(-50%,-6px) scale(.86)'},{offset:.12,opacity:1,transform:'translate(-50%,0) scale(1.04)'},{offset:.2,transform:'translate(-50%,0) scale(1)'},{offset:.82,opacity:1},{opacity:0,transform:'translate(-50%,-4px) scale(1)'}],{duration:1500/speed,easing:'ease-out',fill:'both'});a.finished.then(()=>{if(this.callout===box){box.remove();this.callout=null;}},()=>{});}
  else setTimeout(()=>{if(this.callout===box){box.remove();this.callout=null;}},1400/speed);
 },
 keepDamageSeparate(){const dock=GameEffects.dock;if(!dock)return;const bounds=dock.getBoundingClientRect();
  for(const impact of document.querySelectorAll('.combat-effects .impact')){const r=impact.getBoundingClientRect();if(r.bottom>bounds.top-18){const y=bounds.top-24-r.height/2;if(y<115)impact.hidden=true;else impact.style.top=y+'px';}}
 },
 open(){const d=this.current;if(!d)return;if(d.side==='ENEMY'&&EnemyIntel.cache.has(d.frame.actorId)){EnemyIntel.open(d.frame.actorId,d.cardId);return;}
  if(!this.dialog){const dialog=el('dialog','enemy-intel-dialog combat-technique-dialog');dialog.id='combat-technique-dialog';dialog.setAttribute('aria-labelledby','combat-technique-title');document.body.append(dialog);this.dialog=dialog;dialog.addEventListener('close',()=>{const t=this.resumeToken;this.resumeToken=null;if(t&&GameEffects.active&&GameEffects.generation===t.generation&&!t.wasPaused){GameEffects.paused=false;CombatFX.pause(false);GameEffects.reschedule();}});}
  if(GameEffects.active&&!this.dialog.open){this.resumeToken={generation:GameEffects.generation,wasPaused:GameEffects.paused};GameEffects.paused=true;CombatFX.pause(true);GameEffects.reschedule();}
  const head=el('header','intel-dialog-head'),title=el('h2','',d.name);title.id='combat-technique-title';const close=button('닫기',()=>this.dialog.close());close.setAttribute('aria-label','기술 정보 닫기');head.append(title,close);
  const body=el('div','intel-dialog-scroll');
  if(d.effect){
   // Where it comes from, what it does, what it did now: three short lines.
   body.append(el('p','technique-source',d.owner+' · '+d.source),el('p','technique-does',d.description));
   const now=d.results.join(' · ');if(now)body.append(el('p','technique-now','이번 · '+(d.trigger?d.trigger+' → ':'')+now));
  }else{
   body.append(el('p','technique-source',d.owner+' · '+(d.side==='ALLY'?'아군 기술':d.side==='ENEMY'?'적 기술':'전장 효과')));
   const text=d.cardId==='SYS_MOND_WIND_ROUTE'?'전장에 생긴 상승 기류를 이용하는 행동이며 주인공의 새 원소 기술이 아닙니다. 1행동으로 생존 아군 전체의 이번 전투 공중 접근을 확보합니다. 근접·중거리 공격은 최종 피해가 15% 감소합니다. 지형 파괴와 제한시간은 그대로입니다.':d.description;
   if(text)body.append(el('p','technique-does',text));if(d.coefficient)body.append(el('p','technique-coefficient',d.coefficient));
   const now=this.results(d.events).join(' · ');if(now)body.append(el('p','technique-now','이번 · '+now));
   if(Number(d.cooldown)>0)body.append(el('p','technique-cooldown','재사용 · '+d.cooldown+'차례'));
  }
  body.append(el('small','intel-replay-note','닫으면 이어서 재생합니다.'));
  this.dialog.replaceChildren(head,body);if(!this.dialog.open)this.dialog.showModal();close.focus({preventScroll:true});
 },
 clear(){this.banner?.remove();this.banner=null;this.callout?.remove();this.callout=null;this.current=null;this.resumeToken=null;if(this.dialog?.open)this.dialog.close();}
};
const bossIntelCapture=EnemyIntel.capture;EnemyIntel.capture=function(){bossIntelCapture.call(this);BattleTechnique.capture();};
// Replaces the old enemy-only floating toast; no duplicate layer over damage.
EnemyIntel.showSkill=function(frame){BattleTechnique.show(frame);};
const bossWindup=CombatFX.windup;CombatFX.windup=function(frame,effects){bossWindup.call(this,frame,effects);BattleTechnique.show(frame);};
const bossEffectsCancel=GameEffects.cancel;GameEffects.cancel=function(...args){BattleTechnique.clear();return bossEffectsCancel.apply(this,args);};
window.addEventListener('resize',()=>BattleTechnique.keepDamageSeparate());
const bossCombat=combat;combat=function(p){bossCombat(p);const b=game.s.runtime;if(!b?.mondBossBalance)return;
 const box=el('section','boss-readiness');box.setAttribute('aria-label','보스 전투 현황');
 for(const id of b.mondBossBalance.bosses){const r=game.mondBossReadiness(id);box.append(el('h2','',r.name+' · 권장 Lv.'+r.recommended+' / 4인 장비 파티'));
  if(id==='BOSS_DVALIN')box.append(el('strong','boss-clock','남은 지형 '+b.terrain+'/4 · 현재 '+b.round+'라운드'));
  
 }
 const heading=p.querySelector('.battle-heading');if(heading)heading.after(box);else p.prepend(box);
};
function appendBossPreparation(p,ids){
 if(!ids.length)return;const box=el('section','boss-readiness');box.setAttribute('aria-label','입장 전 보스 준비 확인');
 for(const id of ids){const r=game.mondBossReadiness(id);if(!r)continue;box.append(el('h2','',r.name+' · 권장 Lv.'+r.recommended+' / 4인'));
  box.append(el('p','','체력 '+r.hp+' · 공격력 '+r.atk+' · 방어력 '+r.def+' · 장비·레벨에 따라 자동 상승하지 않는 고정 보스'));
  
  box.append(el('small','muted','장비 착용은 승리 보장이 아닙니다. 입장 후에는 장비 교체가 불가능하며, 보스마다 현실 시간으로 하루에 한 번(한국 시간 0시 초기화) 입장할 수 있습니다.'));
 }p.prepend(box);
}
const bossPrepareScreen=battlePrepare;battlePrepare=function(p,...args){bossPrepareScreen(p,...args);const group=game.s.battlePreparation?.group;const row=game.combatRows('33_ENCOUNTER_GROUP_DB').find(r=>r[0]===group);appendBossPreparation(p,row&&['BOSS_DVALIN','BOSS_ANDRIUS'].includes(row[7])?[row[7]]:[]);};
const bossEntryScreen=boss;boss=function(p,...args){bossEntryScreen(p,...args);const routes=game.rows('35_BOSS_ROUTE_DB').filter(r=>r[2]===game.s.global.CURRENT_MAP_ID);appendBossPreparation(p,routes.map(r=>({BRT_DVALIN:'BOSS_DVALIN',BRT_ANDRIUS:'BOSS_ANDRIUS'}[r[0]])).filter(Boolean));};
