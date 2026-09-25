/* Encounter context is descriptive: it never rolls dice or starts another turn. */
(function(root){
'use strict';const P=root.CRPGRuntime.Runtime.prototype;
const apply=P.apply,start=P.startBattle,opening=P.combatOpening;
P.apply=function(a){const previous=this._encounterAction;this._encounterAction={type:a.type,map:this.s.global.CURRENT_MAP_ID,kind:this.s.lifeJob?.kind};try{return apply.call(this,a);}finally{this._encounterAction=previous;}};
P.describeEncounter=function(b,action={}){
 const map=this.tables['32_MAP_DB'].get(this.s.global.CURRENT_MAP_ID),place=map?.[2]||'이곳',origin=b.origin||'',id=origin.slice(origin.indexOf(':')+1);
 let kind='ENCOUNTER',label='적과 마주쳤습니다',text=place+'에서 적 무리를 마주쳤습니다. 아래의 적과 행동 순서를 확인하고 전투를 시작하세요.';
 if(origin.startsWith('STORY:')){kind='STORY';label='이야기 속 전투';const row=this.storyIndex().nodes.get(this.s.global.STORY_ROUTE_ID+':'+id);text=row?.[9]||place+'에서 이어진 사건으로 적과 맞서게 되었습니다.';}
 else if(origin.startsWith('QUEST:')){kind='QUEST';label='의뢰 대상 발견';text='「'+(this.tables['22_QUEST_DB'].get(id)?.[1]||'진행 중인 의뢰')+'」의 적을 '+place+'에서 발견했습니다. 전투에서 승리한 뒤 의뢰 진행 상황을 확인하세요.';}
 else if((origin.startsWith('WORLD_OCULUS:')||origin.startsWith('GEO_OCULUS:'))){kind='DISCOVERY';label='단서를 지키는 적';text=place+'에서 발견한 단서를 조사하던 중 적과 마주쳤습니다. 적을 물리치면 조사를 이어갈 수 있습니다.';}
 else if(origin==='RANDOM'){kind='FIELD';label=action.type==='LIFE_FINISH'?'탐색 중 조우':action.type==='MOVE'?'이동 중 조우':'주변의 적과 조우';text=action.type==='LIFE_FINISH'?(action.kind==='HUNT'?'사냥':'자원 탐색')+'을 마치던 중 '+place+'의 적 무리와 마주쳤습니다.':action.type==='MOVE'?'이동 도중 '+place+'에서 적 무리와 마주쳤습니다.':place+'에서 활동하던 중 적 무리와 마주쳤습니다.';}
 else if(origin.startsWith('BOSS')){kind='BOSS';label='강적에게 도전';text=place+'의 강적에게 도전했습니다. 파티와 행동 순서를 확인한 뒤 결전을 시작하세요.';}
 return {version:1,kind,label,text,map:map?.[0]||this.s.global.CURRENT_MAP_ID,from:action.map||null};
};
P.startBattle=function(...args){const previous=this.s.runtime,result=start.apply(this,args),b=this.s.runtime;if(b&&b!==previous)b.encounter=this.describeEncounter(b,this._encounterAction);return result;};
P.combatOpening=function(){const value=opening.call(this);return value?{...value,encounter:this.s.runtime.encounter||this.describeEncounter(this.s.runtime)}:null;};
})(globalThis);
