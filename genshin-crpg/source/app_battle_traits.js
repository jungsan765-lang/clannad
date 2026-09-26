/* v0.13.33: battlefield hazards, battle-line positions and enemy target habits in the combat screen.
 * v0.13.40: enemy tiers (강화 일반 · 강한 정예 · 지역 위험 개체), their affixes and enemy line-up hints. Load after app_gear.js. */
(function(){'use strict';
const TARGETS={ALL:'파티 전원',FRONT:'전열(1·2번)',BACK:'후열(3·4번)',LEAD:'선두',TAIL:'후미'};
const targetLabel=t=>TARGETS[t]||(String(t).startsWith('RANDOM:')?'무작위 '+String(t).slice(7)+'명':String(t));
const traitRow=battleActorRow;
battleActorRow=function(a,...args){const row=traitRow(a,...args),copy=row.querySelector('.combatant-copy');
 if(a.side==='ALLY'&&a.slot){copy?.insertBefore(el('small','battle-position '+(a.slot<=2?'front':'back'),a.slot+'번 · '+(a.slot<=2?'전열':'후열')),copy.children[1]||null);return row;}
 if(a.side==='ENEMY'&&(a.variant?.tier||a.lineRole)&&copy){const info=game.enemyIntel?.(a.id),labels=(info?.affixes||[]).map(x=>x.label).join('·');
  const badge=el('small','enemy-tier tier-'+(a.variant?.tier||0),(a.variant?.tier?info?.variant?.label||'':'편성 역할')+(labels?' · '+labels:''));badge.title=(info?.affixes||[]).map(x=>x.label+': '+x.text+' — 대응: '+x.counter).join('\n');copy.insertBefore(badge,copy.children[1]||null);}
 return row;};
const traitCombat=combat;
combat=function(p){traitCombat(p);const stage=p.querySelector('.compact-battle-stage'),place=node=>{if(stage)stage.before(node);else p.append(node);};
 const lineup=game.enemyLineupView?.();
 if(lineup&&(lineup.combos.length||lineup.promoted.some(x=>x.tier===5))){const box=el('section','enemy-lineup');box.setAttribute('aria-label','적 편성');box.append(el('h2','','적 편성'));
  const danger=lineup.promoted.find(x=>x.tier===5&&x.alive);if(danger)box.append(el('p','lineup-danger','위험 개체 · '+danger.name+' — '+danger.affixes.map(x=>x.label+'('+x.counter+')').join(', ')));
  for(const c of lineup.combos){const line=el('p','lineup-combo');line.append(el('strong','',c.label+(c.pair?' · '+c.pair.join('+'):'')),el('span','',c.hint));box.append(line);}
  place(box);}
 const hazards=game.hazardView?.()||[];if(!hazards.length)return;
 const box=el('section','battle-hazards');box.setAttribute('aria-label','전장 효과');box.append(el('h2','','전장 효과'));
 for(const h of hazards){const line=el('p','hazard hazard-'+h.kind.toLowerCase()+(h.pending?' pending':''));line.append(el('strong','',h.label),el('span','',(h.pending?'다음 라운드부터 · ':'')+targetLabel(h.targets)+' · 라운드 끝마다 최대 HP '+Math.round(h.power*100)+'%'+(h.rounds?' · '+h.rounds+'R 남음':' · 계속')),el('small','muted',h.trait+' 장비로 줄일 수 있습니다.'));box.append(line);}
 place(box);};
if(typeof EnemyIntel!=='undefined'){const detail=EnemyIntel.detail.bind(EnemyIntel);EnemyIntel.detail=function(info,opts){const box=detail(info,opts),anchor=()=>box.querySelector('.intel-stats')?.nextSibling||null;
 if(info?.targetRuleLabel)box.insertBefore(el('p','intel-cue info','공격 성향 · '+info.targetRuleLabel),anchor());
 if(info?.variant)box.insertBefore(el('p','intel-cue warning','등급 · '+info.variant.label),anchor());
 for(const x of info?.affixes||[]){const line=el('p','intel-cue '+(x.role?'info':'warning'),(x.role?'편성 역할 · ':'강화 · ')+x.label+' — '+x.text);line.append(el('small','muted',' 대응: '+x.counter));box.insertBefore(line,anchor());}
 return box;};}
})();
