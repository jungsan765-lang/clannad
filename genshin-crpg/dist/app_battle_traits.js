/* v0.13.33: battlefield hazards, battle-line positions and enemy target habits in the combat screen. Load after app_gear.js. */
(function(){'use strict';
const TARGETS={ALL:'파티 전원',FRONT:'전열(1·2번)',BACK:'후열(3·4번)',LEAD:'선두',TAIL:'후미'};
const targetLabel=t=>TARGETS[t]||(String(t).startsWith('RANDOM:')?'무작위 '+String(t).slice(7)+'명':String(t));
const traitRow=battleActorRow;
battleActorRow=function(a,...args){const row=traitRow(a,...args);if(a.side!=='ALLY'||!a.slot)return row;
 const copy=row.querySelector('.combatant-copy');copy?.insertBefore(el('small','battle-position '+(a.slot<=2?'front':'back'),a.slot+'번 · '+(a.slot<=2?'전열':'후열')),copy.children[1]||null);return row;};
const traitCombat=combat;
combat=function(p){traitCombat(p);const hazards=game.hazardView?.()||[];if(!hazards.length)return;
 const box=el('section','battle-hazards');box.setAttribute('aria-label','전장 효과');box.append(el('h2','','전장 효과'));
 for(const h of hazards){const line=el('p','hazard hazard-'+h.kind.toLowerCase()+(h.pending?' pending':''));line.append(el('strong','',h.label),el('span','',(h.pending?'다음 라운드부터 · ':'')+targetLabel(h.targets)+' · 라운드 끝마다 최대 HP '+Math.round(h.power*100)+'%'+(h.rounds?' · '+h.rounds+'R 남음':' · 계속')),el('small','muted',h.trait+' 장비로 줄일 수 있습니다.'));box.append(line);}
 const stage=p.querySelector('.compact-battle-stage');if(stage)stage.before(box);else p.append(box);};
if(typeof EnemyIntel!=='undefined'){const detail=EnemyIntel.detail.bind(EnemyIntel);EnemyIntel.detail=function(info,opts){const box=detail(info,opts);if(info?.targetRuleLabel){const line=el('p','intel-cue info','공격 성향 · '+info.targetRuleLabel);box.insertBefore(line,box.querySelector('.intel-stats')?.nextSibling||null);}return box;};}
})();
