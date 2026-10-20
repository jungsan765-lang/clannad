/* 0.16.2 (user: 「옛날에 드발린 스토리상에서 전투도중에 대사가 있다거나 그런게 있었던거같은데 그거 없앴나? 그런거 괜찮은거같던데.
 * 오셀전까지 그런게 있으면 추가하면 좋기도 하겠다」): short lines spoken during the story's boss fights that had none — the
 * traveller's Dvalin, the isekai K branch's Dvalin, the isekai Tartaglia in the Golden House and both routes' Osial. The isekai
 * AA/AB/B Dvalin fights keep their own interlude scenes (runtime_combat.js checkBattleInterludes) and the traveller's
 * Tartaglia keeps its phase-three lines (runtime_liyue_combat.js).
 * The lines are battle-log entries, so the playback shows each one at the moment it happens (a co-op guest sees them too)
 * and the fight never waits for them. Only story fights speak (origin STORY:…); a rematch stays silent.
 * Voices follow tools/editorial/personal_k/VOICE_BIBLE.md. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,old=Object.fromEntries(['checkBattleInterludes','beginCombat'].map(k=>[k,P[k]]));
// [speaker, face (profile id for the portrait, or a ui avatar key), text]
const L=(speaker,face,text)=>({speaker,face,text});
const VENTI='PROFILE_MOND_VENTI',PAIMON='PAIMON',JEAN='PROFILE_MOND_JEAN',ALBEDO='PROFILE_MOND_ALBEDO',CHILDE='PROFILE_LIYUE_TARTAGLIA',
 NINGGUANG='PROFILE_LIYUE_NINGGUANG',GANYU='PROFILE_LIYUE_GANYU',XIAO='PROFILE_LIYUE_XIAO',KEQING='PROFILE_LIYUE_KEQING',HANYUN='CLOUD_RETAINER';
// when: {start:true} as the fight opens · {hp:[source, ratio]} once that enemy falls to the ratio · {round:n} from round n.
const LINES={
 EG_BOSS_DVALIN:[
  {id:'start',when:{start:true},lines:[L('벤티',VENTI,'바람은 내가 붙잡고 있을게. 드발린 등에 박힌 붉은 가시만 노려!'),L('페이몬',PAIMON,'날개가 크게 휘면 숨결이 온다구! 그때는 몸을 낮춰!')]},
  {id:'hp70',when:{hp:['BOSS_DVALIN',.7]},lines:[L('페이몬',PAIMON,'가시 하나가 부서졌어! 드발린이 비틀거려!'),L('벤티',VENTI,'그 아픔은 네 것이 아니야, 드발린. 조금만 더 버텨 줘.')]},
  {id:'hp35',when:{hp:['BOSS_DVALIN',.35]},lines:[L('벤티',VENTI,'마지막 가시야. 이 바람에 실어서…… 돌아와, 드발린!'),L('페이몬',PAIMON,'거의 다 왔어, 여행자! 떨어지지만 마!')]}],
 EG_ISK_M04_K_DVALIN:[
  {id:'start',when:{start:true},lines:[L('진',JEAN,'제가 앞을 받을게요. 숨결이 오면 제 뒤로 들어오세요!'),L('알베도',ALBEDO,'발판이 계속 갈라지고 있어. 공격이 끝나면 옆으로 자리를 옮겨.')]},
  {id:'hp70',when:{hp:['BOSS_DVALIN',.7]},lines:[L('알베도',ALBEDO,'흥미롭군. 날개를 접은 다음에 틈이 생겨. 그 순간을 노려.'),L('진',JEAN,'물러서지 않네요……. 그래도 공세는 분명히 꺾이고 있어요!')]},
  {id:'hp35',when:{hp:['BOSS_DVALIN',.35]},lines:[L('진',JEAN,'조금만 더요! 이 공격만 넘기면 다음 걸음을 정할 수 있어요!')]}],
 EG_ISK_L03_GOLDEN:[
  {id:'start',when:{start:true},lines:[L('타르탈리아',CHILDE,'망설이면 그 틈이 마지막이 될 거야. 제대로 와.')]},
  {id:'hp60',when:{hp:['BOSS_ISK_L03_GOLDEN',.6]},lines:[L('타르탈리아',CHILDE,'좋아, 이제야 몸이 풀리네. 다음은 조금 더 가까이서 해 볼까?')]},
  {id:'hp30',when:{hp:['BOSS_ISK_L03_GOLDEN',.3]},lines:[L('타르탈리아',CHILDE,'……이 정도면 알겠어. 그런데 방금 그 소리, 위에서 난 건가?')]}],
 EG_BOSS_OSIAL:[
  {id:'start',when:{start:true},lines:[L('응광',NINGGUANG,'본체는 선인들에게 맡겨. 당신은 이 발판과 진법이 완성될 시간을 지켜.'),L('페이몬',PAIMON,'물기둥이 올라온다! 여행자, 발판에서 떨어지지 마!')]},
  {id:'round3',when:{round:3},lines:[L('감우',GANYU,'진법의 기운이 모이고 있습니다. 조금만 더 버텨 주십시오!')]},
  {id:'round5',when:{round:5},lines:[L('소',XIAO,'물러서지 마. 바다가 또 일어선다.')]},
  {id:'round7',when:{round:7},lines:[L('응광',NINGGUANG,'곧 진법이 완성돼. 모두 포격에 대비해!'),L('페이몬',PAIMON,'조금만 더! 선인들이 한꺼번에 쏠 거래!')]}],
 EG_ISK_L04_OSIAL:[
  {id:'start',when:{start:true},lines:[L('류운차풍진군',HANYUN,'정면은 이 몸이 받아 내겠네. 연결로만 지키게.')]},
  {id:'round3',when:{round:3},lines:[L('각청',KEQING,'습격자가 또 붙었어. 장치에서 떼어 내!')]},
  {id:'round5',when:{round:5},lines:[L('응광',NINGGUANG,'조금만 더 버텨. 진법이 거의 다 모였어.')]},
  {id:'round7',when:{round:7},lines:[L('류운차풍진군',HANYUN,'이제 곧이네! 선 자리에서 한 걸음도 물러서지 말게나!')]}]
};
const storyFight=b=>/^STORY:/.test(String(b?.origin||''));
// One set at a time (the first that is due), so the lines never pile up in one beat.
P.battleLineCheck=function(){
 const b=this.s.runtime,sets=b&&storyFight(b)&&LINES[b.group];if(!sets)return;
 const seen=(b.battleLines??={seen:[]}).seen;
 for(const set of sets){
  if(seen.includes(set.id))continue;const w=set.when;let due=false;
  if(w.start)due=true;else if(w.round)due=b.round>=w.round;else if(w.hp){const a=b.actors.find(x=>x.source===w.hp[0]);due=!!a&&a.hp>0&&a.maxHp>0&&a.hp/a.maxHp<=w.hp[1];}
  if(!due)continue;seen.push(set.id);
  for(const [i,l] of set.lines.entries())b.log.push({battleLine:set.id+':'+i,speaker:l.speaker,face:l.face,text:l.text,round:b.round,actionSequence:b.actionSequence||0});
  return;
 }
};
P.beginCombat=function(...args){this.battleLineCheck();return old.beginCombat.apply(this,args);};
P.checkBattleInterludes=function(...args){this.battleLineCheck();return old.checkBattleInterludes.apply(this,args);};
api.battleLines={lines:LINES};
})(globalThis);
