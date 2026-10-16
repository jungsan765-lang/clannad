/* 0.16.48 비경 피로 on screen (user, 2026-10-16: 「어떤 비경을 가더라도, 효율적 측면에서 반드시 돌아가거나 요리를 이용해서 회복을
 * 해야한다」). The rules are at the end of runtime_reading.js (0.16.49: 비경 안 공격력·방어력, 레벨에 맞는 요리만). A tired fighter carries a 「피로 N」 chip in battle; a domain result shows
 * each member's 피로 with their face; the quick meal and the KO/inn party rows (app_gear.js) show it too. View only.
 * Load after app_gear.js and app_growth_v01522.js (it wraps the result screen after them). */
(function(){'use strict';
if(typeof battleStatusList!=='function'||typeof reward!=='function')return;
const PER=()=>Number(window.CRPGRuntime?.fatigueV01648?.perStack)||.15;
const cut=n=>Math.round(PER()*n*100);
// The battle chip: name 「피로 N」, the detail says what it does and what clears it.
const priorList=battleStatusList;
battleStatusList=function(a,...rest){const list=priorList(a,...rest);try{const n=Number(a?.fatigue)||0;if(n>0)list.unshift({id:'FATIGUE',name:'피로 '+n,kind:'debuff',text:'비경 피로 · 비경 안에서 공격력·방어력 −'+cut(n)+'% · 여관에서 쉬거나 레벨에 맞는 회복 요리를 먹으면 풀립니다',rounds:null});}catch{}return list;};
// One small badge under a member's HP (the quick meal and the KO/inn party rows use it).
// With a dish picked (the quick meal), it also says what the dish leaves: 「피로 2→0」.
window.CRPGFatigueBadge=function(id,clear=0){const n=Number(game?.fatigueStacks?.(id))||0;if(!n)return null;const left=Math.max(0,n-(Number(clear)||0)),b=el('b','fatigue-badge'+(left<n?' easing':''),'피로 '+n+(left<n?'→'+left:''));b.title='비경 피로 '+n+' · 비경 안에서 공격력·방어력 −'+cut(n)+'%'+(left<n?' · 이 요리를 먹으면 피로 '+left:'');return b;};
// A recovery dish's text in the bag and the shops says how much 피로 it clears for the protagonist's level (nothing when the
// dish is too easy for that level).
const withClear=d=>{try{const n=d&&!d.equip&&game?.foodFatigueClear?.(d.id);if(n>0&&d.effect&&!/피로 −/.test(d.effect))d.effect+=' · 피로 −'+n;}catch{}return d;};
const IP=window.CRPGInventoryPresenter;
if(IP?.create&&!IP.fatigueV01648){const make=IP.create;IP.create=function(...a){const p=make.apply(this,a);
 if(typeof p?.itemDetail==='function'){const one=p.itemDetail;p.itemDetail=function(...b){return withClear(one.apply(this,b));};}
 if(typeof p?.inventoryEntries==='function'){const all=p.inventoryEntries;p.inventoryEntries=function(...b){const list=all.apply(this,b);if(Array.isArray(list))list.forEach(withClear);return list;};}
 return p;};IP.fatigueV01648=true;}
// A domain result: who came out tired, and how much ATK/DEF that costs in the next domain fight.
const priorReward=reward;
reward=function(p,...rest){priorReward(p,...rest);
 try{const r=parseUI(game.s.global.LAST_BATTLE_RESULT_JSON),f=r?.fatigue;if(!f||!f.stacks||!Object.keys(f.stacks).length||p.querySelector('.fatigue-strip'))return;
  const box=el('section','fatigue-strip');box.setAttribute('aria-label','비경 피로');
  const head=el('div','fatigue-head');head.append(el('strong','','비경 피로'),el('small','','1마다 비경 안 공격력·방어력 −'+cut(1)+'% · 여관·회복 요리로 풀림'));box.append(head);
  const row=el('div','fatigue-people');
  for(const [id,n] of Object.entries(f.stacks)){const m=el('span','fatigue-member'+(n>=(Number(f.max)||4)?' full':''));if(typeof actorPortrait==='function')m.append(actorPortrait(id,'fatigue-face'));
   const copy=el('span','fatigue-copy');copy.append(el('small','',typeof ownerName==='function'?ownerName(id):id),el('b','','피로 '+n+(f.added?.includes(id)?' (+1)':'')));m.append(copy);row.append(m);}
  box.append(row);
  const anchor=p.querySelector('.quick-meal')||p.querySelector('.result-retry')||null;if(anchor)p.insertBefore(box,anchor);else p.append(box);
 }catch(e){console.error('[fatigue]',e);}
};
})();
