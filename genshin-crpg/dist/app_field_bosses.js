/* v0.13.41 step 12-6: field boss entrance (recommended level, drops, discovered gimmicks, the party's counter
 * traits, respawn time) and the in-battle boss panel (next telegraphed move, boss state). View-only. Load after
 * app_battle_traits.js. */
(function(){'use strict';
// Traits that answer each boss (shown only for gimmicks the player has already seen).
const COUNTER_TRAITS={ANEMO:{RISE:['ANTI_AIR','AIR_ACCESS'],PULL:['STAGGER_RES','HEAVY'],REVIVE:['WEAK_POINT']},ELECTRO:{STORM:['INSULATE'],HAMMER:['HEAVY']},CRYO_VINE:{SHELL:['SHIELD_BREAK'],SPREAD:['COLD'],ORBS:['CONTROL_RES','COLD']},
 CRYO_HYPO:{LANCE:['CONTROL_RES'],BLAST:['COLD'],WALL:['SHIELD_BREAK']},GEO_HYPO:{ROCKFALL:['HEAVY'],UPHEAVAL:['STAGGER_RES','HEAVY'],PILLARS:['ARMOR_BREAK']},PYRO_VINE:{SHELL:['SHIELD_BREAK'],HEATWAVE:['HEAT'],VINE:['HEAT'],LASH:['HEAVY']},
 OCEANID:{WAVE:['WATERPROOF'],FORMS:['ANTI_AIR','AIR_ACCESS']},PRIMO:{BEAM:['SHIELD_BOOST'],LEAP:['STAGGER_RES','HEAVY']},SERPENT:{WAVE:['ANTITOXIN','PURIFY'],BIND:['CONTROL_RES'],CHARGE:['HEAVY','WEAK_POINT']}};
const TRAIT_LABEL=k=>globalThis.CRPGRuntime?.traitCatalog?.[k]?.label||k;
function routeOfVisit(){const v=game.currentPlace?.();return v?.valid&&v.entry?.kind==='BOSS'?v.entry.route:null;}
const priorBoss=boss;
boss=function(p,...args){
 priorBoss(p,...args);const route=routeOfVisit(),info=route&&game.fieldBossRouteInfo?.(route);if(!info)return;
 for(const x of p.querySelectorAll('p'))if(/48시간/.test(x.textContent)){x.textContent='필드 보스 토벌입니다. 쓰러뜨리면 게임 내 24시간 뒤에 다시 나타납니다. 지면 바로 다시 도전할 수 있으니, 기믹을 확인한 뒤 장비·편성·대열을 바꿔 다시 도전해 보세요.';break;}
 const box=el('section','field-boss-info');box.setAttribute('aria-label','필드 보스 정보');
 box.append(el('h2','',info.name+' · 권장 Lv.'+info.level+' · 4인'),el('p','',info.summary));
 box.append(el('p','field-boss-drop','주요 보상 · '+info.material.name+' 2~3개 (첫 토벌 +1) · 강적의 잔향 20%'));
 const X=globalThis.CRPGRuntime?.exclusiveWeapons;if(X){const who=X.weapons.filter(w=>w.material===info.material.id).map(w=>game.tables['07_CHAR_DB'].get(w.owner)?.[1]||w.owner),gear=X.bossGear.filter(g=>g.material===info.material.id).map(g=>g.name);
  if(who.length||gear.length)box.append(el('p','field-boss-uses','재료 쓰임새 (리월 장비점) · '+[who.length?'전용 무기: '+who.join(', '):'',gear.length?'보스 장비: '+gear.join(', '):''].filter(Boolean).join(' · ')));}
 if(info.cooldown.reason)box.append(el('p','choice-note',info.cooldown.reason));
 if(info.low.length)box.append(el('p','choice-note','권장 레벨 미만 · '+info.low.join(', ')));
 const n=info.notes;box.append(el('small','muted','도전 '+n.attempts+'회 · 토벌 '+n.wins+'회'+(n.best?' · 최단 '+n.best+'라운드':'')));
 if(info.immune.length)box.append(el('p','field-boss-immune','면역 · '+info.immune.join(', ')));
 const list=el('ul','field-boss-gimmicks');list.setAttribute('aria-label','알려진 기믹');
 for(const g of info.gimmicks){const li=el('li',g.known?'known':'unknown');li.append(el('strong','',g.label),el('span','',' · '+g.text));if(g.known&&g.counter)li.append(el('small','',' 대응: '+g.counter));list.append(li);}
 box.append(el('h3','','관찰 기록'),list);
 if(!info.gimmicks.some(g=>g.known))box.append(el('small','muted','처음 도전하면 겪은 기믹이 여기에 기록됩니다.'));
 const kind=Object.values(globalThis.CRPGRuntime?.fieldBosses?.bosses||{}).find(b=>b.name===info.name)?.kind,needs=COUNTER_TRAITS[kind]||{},keys=[...new Set(info.gimmicks.filter(g=>g.known).flatMap(g=>needs[g.id]||[]))];
 if(keys.length){const party=el('p','field-boss-traits');party.append(el('strong','','파티 대비 '),el('span','',keys.map(k=>TRAIT_LABEL(k)+' '+(info.traits[k]||0)).join(' · ')));box.append(party);}
 const anchor=p.querySelector('.boss-readiness');if(anchor)anchor.after(box);else{const h=p.querySelector('h1,h2');if(h)h.after(box);else p.prepend(box);}
};
const priorCombat=combat;
combat=function(p){priorCombat(p);const v=game.fieldBossView?.();if(!v)return;
 const box=el('section','field-boss-panel');box.setAttribute('aria-label','보스 기믹');box.append(el('h2','',v.twin?v.name+' · 재도전 기믹':v.name+' · 보스 기믹'));
 if(v.telegraph){const t=el('p','boss-telegraph');t.append(el('strong','','예고 · '+v.telegraph.label),el('span','',' '+v.telegraph.text),el('small','',' 대응: '+v.telegraph.counter));box.append(t);}
 if(v.mark)box.append(el('p','boss-state','사냥 표식 · '+v.mark));
 for(const s of v.state||[])box.append(el('p','boss-state',s));
 if(v.seen?.length){const d=el('details','boss-seen');d.append(el('summary','','이번 전투에서 본 기믹 '+v.seen.length+'개'));for(const g of v.seen)d.append(el('p','',g.label+' · '+g.text+' — 대응: '+g.counter));box.append(d);}
 const stage=p.querySelector('.compact-battle-stage');if(stage)stage.before(box);else p.append(box);};
})();
