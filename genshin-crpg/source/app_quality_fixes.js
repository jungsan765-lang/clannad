/* v0.13.35 UI: commission work belongs on the field screen; rewards belong at Katheryne. */
(function(){
'use strict';

function guildGuide(parent,q){
  const place=game.commissionGuildPlace?.(q.row?.[2]);
  if(!place){
    parent.append(el('small','choice-note','캐서린에게 결과를 보고해 주세요.'));
    return;
  }
  const target=place.maps?.[0];
  if(target===game.s.global.CURRENT_MAP_ID){
    parent.append(actionButton('캐서린에게 보고하러 가기','PLACE_ENTER',{place:place.id,mode:'TALK'},true));
  }else{
    parent.append(el('small','journal-note','현장 완료 · '+mapName(target)+'의 캐서린에게 보고'));
    travelGuide(parent,target);
  }
}

function reportButtons(parent,q){
  if(q.reward?.equipment_choice){
    for(const id of q.reward.equipment_choice){
      parent.append(actionButton(safeName('16_EQUIP_DB',id)+' 수령','CLAIM_QUEST',{quest:q.row[0],equipment:id},true));
    }
  }else{
    parent.append(actionButton('임무 보고 · 보상 수령','CLAIM_QUEST',{quest:q.row[0]},true));
  }
}

function fieldCommissionCard(parent,q){
  const c=el('section','card commission-card field-commission-card');
  const d=q.definition;
  c.append(
    el('small','eyebrow','현장 의뢰'),
    el('h3','',q.row[1]),
    el('p','',q.row[5]||d.text)
  );
  rewardPreview(c,q.reward);

  if(q.readyToReport){
    c.append(el('p','mission-ready','현장 목표 완료 · 보상은 캐서린에게 직접 보고한 뒤 받습니다.'));
    guildGuide(c,q);
    parent.append(c);
    return;
  }
  if(q.awaitingBattle){
    c.append(el('p','choice-note','현장 전투가 진행 중입니다. 전투를 마치면 보고할 수 있습니다.'));
    parent.append(c);
    return;
  }

  const letter=globalThis.CRPGWorldContent?.letterCommission?.quest;
  if(q.row[0]===letter&&game.letterStage){
    const stage=game.letterStage();
    if(stage){
      c.append(el('p','field-step',stage.label+(stage.duration?' · '+stage.duration/1000+'초':'')));
      if(stage.requiresPlace){
        guildGuide(c,q);
      }else{
        c.append(actionButton(stage.label+(stage.duration?' · '+stage.duration/1000+'초':''),'WORLD_WORK_START',{kind:'COMMISSION',quest:q.row[0]},true));
      }
    }
    parent.append(c);
    return;
  }

  if(q.reason){
    c.append(el('p','choice-note',q.reason));
    parent.append(c);
    return;
  }

  if(q.puzzle){
    c.append(el('p','field-puzzle-question',q.puzzle.prompt));
    const opts=el('div','field-puzzle-options');
    for(const [i,label] of q.puzzle.options.entries()){
      opts.append(actionButton(label,'COMMISSION_PUZZLE',{quest:q.row[0],answer:i}));
    }
    c.append(opts);
    parent.append(c);
    return;
  }

  const choices=(d.choices||[]).filter(x=>!['leave','requirements'].includes(x.id));
  if(!choices.length){
    c.append(el('p','muted','현장에서 확인할 행동이 없습니다.'));
  }else{
    for(const choice of choices){
      const label=choice.combat_group?'현장 전투 시작 · '+choice.label:choice.label;
      c.append(actionButton(label,'QUEST_CHOICE',{quest:q.row[0],choice:choice.id},!!choice.combat_group));
    }
  }
  parent.append(c);
}

function fieldCommissionPanel(parent){
  const entries=game.commissionFieldEntries?.()||[];
  if(!entries.length)return;
  const section=el('section','field-commission-panel');
  section.append(
    el('h2','','현재 장소의 의뢰'),
    el('p','muted','수락한 의뢰의 조사·퍼즐·전투는 여기서 진행합니다. 임무 목록은 진행 상황 확인용입니다.')
  );
  for(const q of entries)fieldCommissionCard(section,q);
  parent.append(section);
}

const qualityLocation=drawLocation;
drawLocation=function(p,v){
  qualityLocation(p,v);
  if(!game.needsRecovery())fieldCommissionPanel(p);
};

commissionCard=function(parent,q,guild=false){
  const c=el('section','card commission-card');
  const r=q.row,d=q.definition,state=q.state;
  c.append(
    el('small','',state?.claimed?'완료':q.accepted?'진행 중':'미수락'),
    el('h3','',r[1]),
    el('p','',r[5]||d.text)
  );
  travelGuide(c,d.map_id);
  rewardPreview(c,q.reward);

  if(state?.claimed){
    c.append(el('p','muted','보상 수령 완료'));
  }else if(!q.accepted){
    if(guild)c.append(actionButton('의뢰 수락','COMMISSION_ACCEPT',{quest:r[0]},true));
    else c.append(el('p','muted','캐서린에게 의뢰를 먼저 받아 주세요.'));
  }else if(state?.node==='READY_TO_CLAIM'){
    if(game.atCommissionGuild?.(r[2])){
      reportButtons(c,q);
    }else{
      c.append(el('p','mission-ready','현장 목표를 완료했습니다. 캐서린에게 보고하면 보상을 받을 수 있습니다.'));
      guildGuide(c,q);
    }
  }else{
    c.append(el('p','muted','실제 수행은 진행 장소의 메인 화면에서 합니다. 임무 목록에서는 진행 상황만 확인합니다.'));
    if(game.s.global.CURRENT_MAP_ID===d.map_id){
      c.append(actionButton('메인 화면에서 현장 진행','MENU',{screen:'LOCATION'},true));
    }
  }
  parent.append(c);
};

const qualityTravel=playTravel;
playTravel=async function(before,type,params={}){
  if(['QUEST_CHOICE','COMMISSION_PUZZLE'].includes(type)&&!game?.s.runtime&&lastResult?.ok!==false){
    let minutes=Number(lastResult?.result?.minutes||0);
    if(!minutes&&type==='QUEST_CHOICE'){
      try{
        const d=parseUI(game.row('22_QUEST_DB',params.quest)[10]);
        const ch=(d.choices||[]).find(x=>x.id===params.choice);
        minutes=Number(ch?.minutes||0);
      }catch{}
    }
    const overlay=el('div','travel-overlay task-progress-overlay');
    overlay.setAttribute('role','status');
    overlay.append(
      el('span','travel-mark','✧'),
      el('strong','',type==='COMMISSION_PUZZLE'?'현장 단서 확인 중':'현장 작업 중'),
      el('span','',minutes?'게임 시간 '+minutes+'분':'현장 확인')
    );
    const bar=el('progress');
    bar.max=100;
    bar.value=0;
    bar.setAttribute('aria-label','의뢰 현장 진행');
    overlay.append(bar);
    document.body.append(overlay);
    const duration=Math.max(900,Math.min(2300,850+minutes*18));
    const start=performance.now();
    await new Promise(resolve=>{
      const tick=()=>{
        const elapsed=performance.now()-start;
        bar.value=Math.min(100,elapsed/duration*100);
        if(elapsed>=duration){
          overlay.remove();
          resolve();
        }else{
          setTimeout(tick,30);
        }
      };
      tick();
    });
  }
  return qualityTravel(before,type,params);
};

})();