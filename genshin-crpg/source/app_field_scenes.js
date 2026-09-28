/* v0.14.0 field scene UI: the current step on the field screen, spoken options,
 * a field log, and a narrated result card with exact costs after every choice. */
(function(){
'use strict';
function costChips(parent,e){
 const box=el('div','scene-chips');
 if(e.minutes)box.append(el('span','scene-chip time','⏱ '+e.minutes+'분 경과'));
 if(e.hp)box.append(el('span','scene-chip loss','♥ 체력 −'+e.hp+(e.hpPct?' (최대 체력의 '+e.hpPct+'%)':'')));
 if(e.mora)box.append(el('span','scene-chip loss','◈ 보상 모라 −'+e.mora));
 if(box.children.length)parent.append(box);
}
function bonusText(b){
 const parts=[];if(b?.mora)parts.push('모라 +'+b.mora);
 for(const [id,n]of Object.entries(b?.items||{}))parts.push(safeName('14_ITEM_DB',id)+' ×'+n);
 return parts.join(' · ');
}
function paimonLine(parent,text){
 if(!text)return;const line=el('p','scene-paimon');line.append(el('strong','','페이몬'),el('span','',text));parent.append(line);
}
function render(card,q){
 const s=q.scene;card.classList.add('field-scene-card');
 const steps=el('ol','scene-steps');
 s.titles.forEach((t,i)=>steps.append(el('li',i<s.index?'done':i===s.index?'current':'',t)));
 card.append(steps);
 const bonus=bonusText(s.bonus);
 if(s.perfect)card.append(el('p','scene-goal',bonus?'실수 없이 마치면 보고할 때 추가 보상 · '+bonus:'실수 없이 마쳐 보자.'));
 else card.append(el('p','scene-goal missed','실수 '+s.mistakes+'회 · 추가 보상은 놓쳤다'+(s.penalty?' · 보고할 때 보상 모라 −'+s.penalty:'')));
 if(s.step){
  const box=el('div','scene-step');
  box.append(el('h4','',s.step.title),el('p','story',s.step.text));
  paimonLine(box,s.step.paimon);
  const opts=el('div','scene-options');
  for(const o of s.step.options){
   const b=actionButton('“'+o.say+'”','COMMISSION_PUZZLE',{quest:q.row[0],answer:o.index,step:s.index});
   b.classList.add('scene-option');if(o.battle)b.classList.add('battle');if(o.tried)b.classList.add('tried');
   opts.append(b);
  }
  box.append(opts);card.append(box);
 }
 if(s.log.length){
  const log=el('details','scene-log');log.append(el('summary','','현장 기록 · '+s.log.length+'건'));
  for(const e of s.log){
   const row=el('div','scene-log-row '+(e.ok?'ok':'miss'));
   row.append(el('strong','',(e.ok?'✓ ':'✗ ')+e.title),el('p','scene-say','“'+e.say+'”'),el('p','',e.text));
   costChips(row,e);log.append(row);
  }
  card.append(log);
 }
}
function showResult(res,title){
 const box=el('div','scene-result '+(res.ok?'ok':res.pass?'pass':'miss'));
 box.append(el('p','scene-say','“'+res.say+'”'),el('p','story',res.text));
 paimonLine(box,res.paimon);
 box.append(el('p','scene-verdict',res.ok?(res.battle?'싸움이 시작된다.':'좋은 판단이었다.'):res.battle?'준비가 틀어진 채 싸움이 시작된다.':res.pass?'일은 해냈지만 대가를 치렀다.':'이 방법으로는 안 된다. 다른 방법을 찾아보자.'));
 costChips(box,{minutes:res.minutes,hp:res.hpLoss,hpPct:res.hpPct,mora:res.moraPenalty});
 if(res.done){
  const end=el('section','scene-finale');
  end.append(el('h3','','현장 일 완료'),el('p','story',res.finale||''));
  const sum=res.summary||{};
  end.append(el('p','scene-summary','걸린 시간 '+(sum.minutes||0)+'분 · 실수 '+(sum.mistakes||0)+'회'+(sum.hpLost?' · 잃은 체력 '+sum.hpLost:'')));
  if(sum.perfect){const b=bonusText(sum.bonus);end.append(el('p','scene-bonus','완벽하게 해냈다!'+(b?' 캐서린에게 보고하면 추가 보상 · '+b:'')));}
  else if(sum.penalty)end.append(el('p','scene-penalty','망가진 물자 값으로, 보고할 때 받을 모라에서 '+sum.penalty+'모라가 빠진다.'));
  end.append(el('p','muted','이제 캐서린에게 가서 보고하자.'));
  box.append(end);
 }else if(res.next)box.append(el('p','scene-next','다음 · '+res.next));
 showModal(title+' · '+(res.step+1)+' / '+res.steps,box);
 if(window.GameAudio)GameAudio.play(res.done?'quest_complete':res.ok?'unlock':'hit');
}
function claimNote(scene){
 const body=document.getElementById('modal-body');if(!body)return;
 const b=bonusText(scene.bonus);
 const note=scene.perfect?el('p','scene-bonus','완벽한 현장 처리 · 추가 보상 포함'+(b?' ('+b+')':'')):el('p','scene-penalty','현장 실수 '+scene.mistakes+'회 · 추가 보상 없음'+(scene.penalty?' · 망가진 물자만큼 보상 모라 −'+scene.penalty:''));
 if(document.getElementById('modal')?.open)body.append(note);else{const box=el('div');box.append(note);showModal('의뢰 완료',box);}
}
const priorAct=act;
act=async function(type,params={}){
 const out=await priorAct(type,params);
 const res=out?.result?.scene!==undefined?out.result:out?.result?.result?.scene!==undefined?out.result.result:null;
 if(!res||out?.ok===false)return out;
 if(type==='COMMISSION_PUZZLE'&&res.scene===true){const title=game?.tables['22_QUEST_DB'].get(params.quest)?.[1]||'현장 의뢰';showResult(res,title);}
 if(type==='CLAIM_QUEST'&&res.scene&&typeof res.scene==='object')claimNote(res.scene);
 return out;
};
window.CRPGFieldScenes={render,showResult};
})();
