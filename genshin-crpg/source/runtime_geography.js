/* Route-qualified scene geography. Old saves travel from their actual location. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype,C=root.CRPGWorldContent?.geography;if(!C)return;
const old=Object.fromEntries(['newGame','validateSave','apply','storyRestoreFrame'].map(k=>[k,P[k]]));
const copy=x=>JSON.parse(JSON.stringify(x));
P.installGeography=function(){
 if(this._geographyInstalled)return;this.installMarketContent();this.db={...this.db};const changed=new Map();
 const table=name=>{if(!changed.has(name))changed.set(name,this.db[name].map(r=>r.slice()));return changed.get(name);};
 for(const fix of C.nodeMapChanges){const rows=table(fix.table),h=rows[0],row=rows.find(r=>r[h.indexOf('ROUTE_ID')]===fix.route&&r[h.indexOf('NODE_ID')]===fix.node);if(!row)throw new api.RuleError('GEOGRAPHY','이야기 장소 연결을 찾을 수 없습니다.');row[h.indexOf('MAP_ID')]=fix.to;}
 for(const fix of C.eventPayloadChanges){const rows=table('51_EVENT_DB'),h=rows[0],row=rows.find(r=>r[0]===fix.event),col=h.indexOf('EXEC_PAYLOAD_JSON'),p=JSON.parse(row[col]);for(const u of fix.updates){const keys=u.path.split('.'),last=keys.pop();let parent=p;for(const k of keys)parent=parent[k];parent[last]=u.to;}row[col]=JSON.stringify(p);}
 for(const fix of C.definitionChanges){const rows=table(fix.table),row=rows.find(r=>r[0]===fix.id);row[rows[0].indexOf(fix.column)]=fix.to;}
 for(const fix of C.edgeChanges){const rows=table('47_MAP_EDGE_DB'),row=rows.find(r=>r[0]===fix.id);if(row){row[8]='N';row[11]='INACTIVE';}}
 const quests=table('22_QUEST_DB'),q=quests.find(r=>r[0]==='Q_ISK_MOND_03');if(q){const p=JSON.parse(q[10]);if(p.entry_maps){p.entry_maps.K='MAP_CRPG_SKYFROST_NAIL';p.entry_maps.B='MAP_CRPG_DRAGONSPINE_CAMP';q[10]=JSON.stringify(p);}}
 for(const id of ['TRV_M02_N270','TRV_M02_N277']){const r=table('55_MAIN_STORY_DB').find(r=>r[0]==='ROUTE_TRAVELER'&&r[4]===id);if(r)r[9]=r[9].replaceAll('다다우파 협곡','타타우파 협곡');}
 for(const [name,rows]of changed){this.db[name]=rows;this.tables[name]=new Map(rows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));}
 this._sharedStoryIndex=null;this._explorationTravelDefinitions=null;this._geographyInstalled=true;
};
P.geographyRow=function(){return this.storyNode()||this.storyChoices()?.[0]||null;};
P.geographyTarget=function(route,node){const row=this.storyIndex().nodes.get(route+':'+node);return row?this.storyTravelFor(row)?.to_map||row[8]:null;};
P.normalizeGeographyFrame=function(frame,route){
 if(!frame)return;for(const key of ['journey','arrival']){const value=frame[key];if(value){const target=this.geographyTarget(value.route||route,value.node);if(target)value.target=target;}}
 if(frame.break){const target=this.geographyTarget(route,frame.break.node);if(target)frame.break.map=target;}
 // An old acknowledgement remains an acknowledgement only at the actual destination.
 if(frame.arrival&&frame.arrival.target!==frame.map){frame.journey={...frame.arrival,from:frame.map};frame.arrival=null;frame.policy='';frame.waiting=true;frame.screen='LOCATION';}
};
P.geographyGate=function(){
 const s=this.s,g=s.global;if(!s.geographyPending||s.runtime||s.lifeJob||s.worldJob||s.placeVisit)return;
 const pending=s.battlePreparation||s.storyRecovery;
 if(pending){const node=pending.node,target=this.geographyTarget(g.STORY_ROUTE_ID,node);if(target&&target!==g.CURRENT_MAP_ID){s.storyBreak={node,next:node,map:target,title:'결전 준비',prompt:'표시된 장소에서 준비한 전투를 이어갈 수 있습니다.',policy:g.STORY_MENU_POLICY||''};delete s.battlePreparation;delete s.storyRecovery;delete s.storyBattleCheckpoint;g.STORY_MENU_POLICY='';g.STORY_WAITING=true;g.SCREEN_MODE='LOCATION';}}
 if(!s.storyJourney&&!s.storyBreak&&!s.battlePreparation&&!s.storyRecovery){const row=this.geographyRow(),fix=row&&C.nodeMapChanges.find(x=>x.route===g.STORY_ROUTE_ID&&x.node===row[4]);if(fix&&row[8]!==g.CURRENT_MAP_ID){const choice=this.storyActiveNodeId(),travel=this.storyTravelFor(row);s.storyJourney={node:row[4],route:g.STORY_ROUTE_ID,from:g.CURRENT_MAP_ID,target:travel?.to_map||row[8],event:travel?.event||null,minutes:travel?.minutes||0,policy:g.STORY_MENU_POLICY||'',resumeWaiting:!!g.STORY_WAITING&&!!g.STORY_NEXT_PREPARED,...(String(choice).startsWith('CHOICE_GROUP:')?{choiceGroup:choice}:{})};g.STORY_MENU_POLICY='';g.STORY_WAITING=true;g.PENDING_CHOICE_GROUP_ID='';g.SCREEN_MODE='LOCATION';}}
 delete s.geographyPending;
};
P.migrateGeography=function(s){
 if(s.geographyVersion===1)return;const view=Object.create(this);view.s=s;const route=s.global.STORY_ROUTE_ID;
 for(const key of ['storyJourney','storyArrival']){const v=s[key];if(v){const target=view.geographyTarget(v.route||route,v.node);if(target&&target!==v.target){v.target=target;if(key==='storyArrival'){s.storyJourney={...v,from:s.global.CURRENT_MAP_ID};delete s.storyArrival;}}}}
 if(s.storyJourney){s.storyJourney.policy=s.storyJourney.policy||s.global.STORY_MENU_POLICY||'';s.global.STORY_MENU_POLICY='';s.global.STORY_WAITING=true;if(!s.runtime)s.global.SCREEN_MODE='LOCATION';}
 if(s.storyBreak){const target=view.geographyTarget(route,s.storyBreak.node);if(target)s.storyBreak.map=target;}
 for(const frame of [...s.storyReturnStack||[],s.storyMenuFrame,s.storyBattleFrame])view.normalizeGeographyFrame(frame,route);
 if(s.storyBattleCheckpoint)view.migrateGeography(s.storyBattleCheckpoint);
 s.geographyVersion=1;s.geographyPending=true;view.geographyGate();
};
P.newGame=function(o){this.installGeography();const result=old.newGame.call(this,o);this.s.geographyVersion=1;return copy(this.s);};
P.validateSave=function(s){this.installGeography();this.migrateGeography(s);return old.validateSave.call(this,s);};
P.apply=function(a){const waiting=a.type==='JOURNEY_RESUME'&&this.s.storyJourney?.resumeWaiting;const result=old.apply.call(this,a);if(waiting){this.s.global.STORY_WAITING=true;this.s.global.SCREEN_MODE='STORY_WAIT';delete this.s.storyArrival;}this.geographyGate();return result;};
P.storyRestoreFrame=function(f){old.storyRestoreFrame.call(this,f);this.s.geographyPending=true;this.geographyGate();};
})(globalThis);
