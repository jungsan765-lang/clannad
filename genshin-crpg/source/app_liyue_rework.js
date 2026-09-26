/* Field objectives remain visible alongside a pinned personal/commission objective. */
(function(){
'use strict';
const baseObjective=mainObjective;
mainObjective=function(parent){
 const view=game.liyueFieldView?.();
 if(!view){baseObjective(parent);return;}
 if(game.s.pinnedObjective)baseObjective(parent);
 const {state:f,mission,step,target}=view,box=el('section','main-objective liyue-field-objective');
 box.append(el('small','eyebrow','리월 본편 · 현장 임무 '+Math.min(f.stage+1,mission.steps.length)+' / '+mission.steps.length),el('h2','',mission.title));
 if(!f.stage)box.append(el('p','',mission.intro));
 if(step)box.append(el('h3','',step.title),el('p','',step.prompt));
 else box.append(el('p','','현장 목표를 마쳤다. '+mapName(target)+'에서 다음 사건을 이어간다.'));
 if(game.s.global.CURRENT_MAP_ID!==target){box.append(el('p','muted','목적지 · '+mapName(target)));travelGuide(box,target);}
 else if(!step)box.append(actionButton('현장 결과를 가지고 이야기 계속','LIYUE_FIELD_FINISH',{},true));
 else if(f.done){box.append(el('p','field-result',f.feedback),actionButton('다음 목표 확인','LIYUE_FIELD_CONTINUE',{},true));}
 else{
  if(f.feedback)box.append(el('p','field-result',f.feedback));
  if(step.clues){for(const clue of step.clues){box.append(actionButton((f.clues.includes(clue.id)?'✓ ':'')+clue.label,'LIYUE_FIELD_INSPECT',{clue:clue.id}));if(f.clues.includes(clue.id))box.append(el('small','journal-note',clue.text));}}
  if(step.options)for(const [answer,label]of step.options.entries())box.append(actionButton(label,'LIYUE_FIELD_ANSWER',{answer}));
  else {box.append(el('p','choice-note',step.kind==='DESTROY'?'구조물의 내구도를 공격으로 깎으세요.':'드발린 토벌 이후의 파티를 기준으로 한 전투입니다. 동료 편성과 회복·장비를 확인하세요.'),actionButton(step.kind==='DESTROY'?'통로의 구조물 공격하기':'현장 전투 시작','LIYUE_FIELD_BATTLE',{},true));}
 }
 box.append(el('small','muted',f.mission.startsWith('rescue_')?'현재 위기 장면의 목표를 먼저 해결하세요. 진행 도중 저장할 수 있습니다.':'지도·편성·장비·시설은 메인 화면에서 이용할 수 있습니다. 현장 진행은 자동 저장됩니다.'));parent.append(box);
};
const baseStory=story;
story=function(parent,v){if(game.s.liyueField&&!game.s.storyContext){mainObjective(parent);parent.append(actionButton('메인 화면에서 이동·준비','MENU',{screen:'LOCATION'}));return;}baseStory(parent,v);
 const rows=CRPGLiyueRework.archive[game.storyActiveNodeId()];if(rows){const detail=el('details','story-transcript');detail.append(el('summary','','이 장면 자세히 읽기'));for(const r of rows)detail.append(el('p','',(r.speaker?r.speaker+': ':'')+displayText(r.text)));parent.append(detail);}
};
const baseCombat=combat;
combat=function(parent,v){baseCombat(parent,v);const b=game.s.runtime,o=b?.fieldObjective;if(!o)return;const box=el('section','card field-combat-objective');box.append(el('h3','',o.kind==='DESTROY'?'파괴 목표 · 구조물의 내구도를 0으로':o.kind==='BATTLE'?'현장 목표 · 습격자 제압':'보호 목표 · '+o.integrity+' / '+o.maxIntegrity));
 if(b.liyueEvacuation)box.append(el('p','','안전하게 이동한 라운드 '+b.liyueEvacuation.completedRounds+' / 3 · 남은 적도 모두 제압해야 합니다. 방어 행동은 목표가 받는 피해를 줄입니다.'));
 if(o.kind==='DESTROY')box.append(el('p','','구조물은 공격하지 않습니다. 파티의 공격으로 내구도를 깎아 통로를 여세요.'));
 parent.prepend(box);
};
const baseAffection=affectionProgressRow;
affectionProgressRow=function(parent,m){baseAffection(parent,m);parent.lastElementChild?.append(el('small','muted','하트마다 공격력·방어력 +1% · 5하트 최대 +5%'));};
})();
