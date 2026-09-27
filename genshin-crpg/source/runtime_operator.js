/* Operator tools are an explicit unranked boundary, never a client permission claim. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,apply=P.apply,reason=P.actionReason;
const fail=m=>{throw new api.RuleError('OPERATOR',m);};
P.actionReason=function(type,a={}){if(type==='OPERATOR_DEBUG')return this.serverAdmin===true?'':'운영자 권한이 필요합니다.';return reason.call(this,type,a);};
P.apply=function(a){if(a.type!=='OPERATOR_DEBUG')return apply.call(this,a);if(this.serverAdmin!==true)fail('운영자 권한이 필요합니다.');
 const g=this.s.global;this.s.operatorModified=true;
 const integer=(x,min,max)=>{if(!Number.isInteger(x)||x<min||x>max)fail('수치 범위를 확인해 주세요.');return x;};
 if(a.op==='heal'){this.recalculate();g.PLAYER_HP_CURRENT=g.PLAYER_HP_MAX;for(const id of Object.keys(this.s.chars))this.s.chars[id].hp=this.character(id).maxHp;if(this.s.runtime)for(const x of this.s.runtime.actors.filter(x=>x.side==='ALLY'))x.hp=x.maxHp;}
 else if(a.op==='level'){const n=integer(a.value,1,20);g.PLAYER_LEVEL_STATE=n;g.PLAYER_XP=0;for(const x of Object.values(this.s.chars)){x.level=n;x.xp=0;}this.recalculate();g.PLAYER_HP_CURRENT=g.PLAYER_HP_MAX;for(const id of Object.keys(this.s.chars))this.s.chars[id].hp=this.character(id).maxHp;}
 else if(a.op==='mora')g.MORA=integer(a.value,0,10000000);
 else if(a.op==='recruit'){const ids=a.char==='ALL'?this.rows('07_CHAR_DB').map(x=>x[0]):[a.char];const own=JSON.parse(g.COMPANION_ELIGIBILITY_JSON||'{}');for(const id of ids){if(!this.tables['07_CHAR_DB'].has(id)||!this.s.chars[id])continue;own[id]={state:'JOINED',source:'OPERATOR'};}g.COMPANION_ELIGIBILITY_JSON=JSON.stringify(own);}
 else if(a.op==='equipment'){this.row('16_EQUIP_DB',a.equipment);const slot=this.giveEquipment(a.equipment),inv=this.s.inventory.find(i=>i.slot===slot);inv.enhance=integer(a.value||0,0,12);if(inv.enhance>10)inv.enhancementCap=12;}
 else if(a.op==='artifact'){for(let i=0;i<integer(a.value||1,1,50);i++)this.rollArtifact();}
 else if(a.op==='travel'){if(this.s.runtime)fail('전투를 종료한 뒤 이동해 주세요.');this.row('32_MAP_DB',a.map);this.s.storyContext=null;this.s.storyJourney=null;this.s.storyBreak=null;this.s.placeVisit=null;this.s.lifeJob=null;this.s.worldJob=null;this.s.battlePreparation=null;this.s.storyRecovery=null;this.s.storyMenuFrame=null;this.s.storyReturnStack=[];this.s.liyueField=null;this.s.bossRouteProgress=null;Object.assign(g,{CURRENT_MAP_ID:a.map,CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',STORY_MENU_POLICY:'',STORY_WAITING:true,STORY_NEXT_PREPARED:'',SCREEN_MODE:'LOCATION'});}
 else if(a.op==='story'){if(this.s.runtime)fail('전투를 종료한 뒤 장면을 선택해 주세요.');const node=this.storyIndex().nodes.get(g.STORY_ROUTE_ID+':'+a.node);if(!node||node.table!=='55_MAIN_STORY_DB')fail('현재 루트의 메인 장면을 선택해 주세요.');this.s.storyContext=null;this.s.storyJourney=null;this.s.storyBreak=null;this.storySetCursor(a.node);this.prepareStory();}
 else if(a.op==='battle_end'){if(!this.s.runtime)fail('진행 중인 전투가 없습니다.');this.finishBattle(a.win===true);}
 else if(a.op==='abyss_unlock'){if(this.s.runtime)fail('전투 중에는 변경할 수 없습니다.');const s=this.ensureAbyss(),f=integer(a.value,1,12);s.tags={};for(let n=1;n<f;n++)s.clears[n]={rounds:1,attempt:s.attempts,party:[],run:s.run};}
 else fail('지원하지 않는 운영 도구입니다.');return {operator:true,op:a.op,ranked:false};};
})(globalThis);
