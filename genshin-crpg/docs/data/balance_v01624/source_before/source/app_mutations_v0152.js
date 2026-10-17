/* 0.15.2 변이 보스 화면 (runtime_mutations_v0152.js; user: 「보상 살짝 올라가고 변이보스 내는거? 나쁘지 않다」). This week's rules for
 * each field boss and the four daily bosses: on the boss's place screen beside the usual challenge (「변이 도전」), on the
 * daily boss cards, over the battle field, on the reward screen (the extra experience, Mora and material) and in the
 * handbook's 토벌 tab. Every action is the usual entry with mutation:true.
 * Load after app_field_bosses.js, app_ley_lines.js, app_enhancement.js and app_liyue_artifacts.js. */
(function(){'use strict';
const API=window.CRPGRuntime,M=API?.mutationsV0152;if(!M||typeof boss!=='function'||typeof combat!=='function'||typeof drawLocation!=='function')return;
const pct=Math.round(M.bonus*100);
const itemsText=items=>Object.entries(items||{}).map(([id,n])=>safeName('14_ITEM_DB',id)+' '+n+'개').join(' · ');
const left=h=>h>48?Math.ceil(h/24)+'일':Math.max(1,h)+'시간';
function modList(view){const ul=el('ul','mut-mods');for(const m of view.mods){const li=el('li','mut-mod');li.append(el('strong','',m.label+(m.element?' · '+m.element:'')),el('span','',m.text));ul.append(li);}return ul;}
function panel(view,button){
 const box=el('section','mut-panel');box.setAttribute('aria-label','이번 주 변이');
 const head=el('div','mut-head');head.append(el('span','mut-badge','변이'),el('h3','',view.name+' · 이번 주 변이'),el('small','mut-time','월요일 0시(한국 시간)까지 '+left(view.hoursLeft)));
 box.append(head,modList(view),el('p','mut-bonus','변이 도전에서 이기면 경험치·모라 +'+pct+'% · '+itemsText(view.bonus.items)+' 추가'+(view.wins?' · 이번 주 '+view.wins+'번 이김':'')));
 if(button){box.append(button);const why=button.getAttribute('data-reason');if(why)box.append(el('small','choice-note',why));}
 return box;
}
// ---------- the field boss's place ----------
const priorBoss=boss;
boss=function(p,...args){
 priorBoss(p,...args);
 try{
  const prog=game.s.bossRouteProgress;
  if(['AWAIT_NEXT','RETRY'].includes(prog?.phase)){if(prog.mutation){const n=el('p','mut-note','변이 도전 중 · 다시 도전해도 이번 주 변이가 그대로 적용됩니다.');(p.querySelector('h1')||p.firstChild)?.after(n);}return;}
  const v=game.currentPlace?.(),route=v?.valid&&v.entry?.kind==='BOSS'?String(v.entry.route||''):'';if(!route.startsWith('BRT_FB_'))return;
  const view=game.mutationOf?.(route.slice(4));if(!view)return;
  const b=actionButton('변이 도전','BOSS_ROUTE',{route,entry:'DIRECT',mutation:true});b.classList.add('mut-go');
  const why=game.placeBossReason?.(route,'DIRECT')||'';if(why){b.disabled=true;withReason(b,why);}
  const box=panel(view,b),anchor=p.querySelector('.field-boss-info');if(anchor)anchor.after(box);else p.append(box);
 }catch{}
};
// ---------- the daily boss cards on the location screen ----------
const priorLocation=drawLocation;
drawLocation=function(p,v){
 priorLocation(p,v);
 try{
  if(!game||game.s.runtime||game.s.placeVisit)return;const here=game.s.global.CURRENT_MAP_ID;
  const ids=Object.entries(API.enhancementConfig?.bosses||{}).filter(([,b])=>b.map===here).map(([id])=>id);
  p.querySelectorAll('.material-challenge').forEach((card,i)=>{const id=ids[i],view=id&&game.mutationOf?.(id);if(!view||card.querySelector('.mut-panel'))return;
   const b=actionButton('변이 재도전','MOND_MATERIAL_CHALLENGE',{boss:id,mutation:true});b.classList.add('mut-go');card.append(panel(view,b));});
  p.querySelectorAll('.liyue-artifact-farm[data-liyue-artifact-farm]').forEach(card=>{const kind=card.dataset.liyueArtifactFarm,view=game.mutationOf?.('LIYUE_'+kind+'_FARM');if(!view||card.querySelector('.mut-panel'))return;
   const b=actionButton(kind==='TARTAGLIA'?'타르탈리아 변이 도전':'야타용왕 변이 도전','LIYUE_ARTIFACT_CHALLENGE',{kind,mutation:true});b.classList.add('mut-go');card.append(panel(view,b));});
 }catch{}
};
// ---------- in battle ----------
const priorCombat=combat;
combat=function(p,...args){
 const out=priorCombat(p,...args);
 try{
  const m=game.s.runtime?.mutation;if(!m)return out;const view=game.mutationOf?.(m.key,m.week);
  const box=el('section','mut-combat');box.setAttribute('aria-label','변이 보스');box.append(el('span','mut-badge','변이'));
  for(const x of view?.mods||[]){const c=el('span','mut-chip',x.label+(x.element?' · '+x.element:''));c.title=x.text;box.append(c);}
  if(m.secondWind)box.append(el('span','mut-chip used','두 번째 숨결 사용함'));
  const stage=p.querySelector('.compact-battle-stage'),fb=p.querySelector('.field-boss-panel');if(fb)fb.before(box);else if(stage)stage.before(box);else p.append(box);
 }catch{}
 return out;
};
// ---------- the reward screen ----------
if(typeof reward==='function'){const priorReward=reward;reward=function(p,...args){
 const out=priorReward(p,...args);
 try{
  const r=JSON.parse(game.s.global.LAST_BATTLE_RESULT_JSON||'{}'),m=r.mutation;if(!m)return out;
  const card=el('section','card mut-result');card.append(el('small','eyebrow','변이 보스'),el('h2','',m.name+(m.victory?' · 변이 토벌':' · 변이 도전 실패')));
  card.append(el('p','muted',m.mods.map(x=>x.label+(x.element?'('+x.element+')':'')).join(' · ')));
  if(m.bonus)card.append(el('p','mut-bonus','변이 추가 보상 · 경험치 +'+m.bonus.xp+' · 모라 +'+Number(m.bonus.mora).toLocaleString('ko-KR')+(Object.keys(m.bonus.items||{}).length?' · '+itemsText(m.bonus.items):'')));
  else if(!m.victory)card.append(el('p','muted','변이는 이번 주 월요일 0시(한국 시간)까지 그대로입니다. 장비와 편성을 바꿔 다시 도전해 보세요.'));
  p.append(card);
 }catch{}
 return out;
};}
// ---------- the handbook's 토벌 tab ----------
window.CRPGMutations={journal(box,{section,row,chip,guideButton}){
 let list=[];try{list=game.mutationList?.()||[];}catch{}if(!list.length)return;
 const s=section('이번 주 변이 보스','매주 월요일 0시(한국 시간)에 보스마다 2~3가지 변이가 새로 정해집니다. 보스 앞에서 「변이 도전」을 고르면 변이가 적용되고, 이기면 경험치·모라 +'+pct+'%와 재료 1개를 더 받습니다. 토벌 횟수 제한은 보통 도전과 같습니다.');
 const maps={};for(const [id,d] of Object.entries(API.fieldBosses?.bosses||{}))maps[id]=d.map;for(const [id,b] of Object.entries(API.enhancementConfig?.bosses||{}))maps[id]=b.map;for(const [k,f] of Object.entries(API.liyueArtifactConfig?.farm||{}))maps['LIYUE_'+k+'_FARM']=f.map;
 for(const v of list){
  const r=row('hb-boss mut-row',v.name+' · '+(v.kind==='FIELD'?'필드 보스':'일일 보스'),[v.mods.map(m=>m.label+(m.element?'('+m.element+')':'')).join(' · '),v.mods.map(m=>m.text).join(' / ')],maps[v.key]?guideButton(maps[v.key]):null);
  r.querySelector('.hb-copy strong').after(v.wins?chip('이번 주 '+v.wins+'승','ok'):chip('변이','warn'));s.append(r);
 }
 box.append(s);
}};
})();
