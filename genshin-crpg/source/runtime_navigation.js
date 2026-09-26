/* v0.13.11: safe Liyue intermissions and save-aware navigation; no plot unlocks. */
(function(root){
'use strict';const api=root.CRPGRuntime,P=api.Runtime.prototype;
const old=Object.fromEntries(['newGame','validateSave','edgeReason','actionReason','apply','storyNaturalPause','storyAutomaticNode','storyDisplayText','oculusEntries'].map(k=>[k,P[k]]));
const yes=v=>v===true||v==='TRUE'||v==='Y';
const liyue=r=>r&&/^Q_(ISK|TRV)_LIYUE_/.test(r[1]||'');
P.navigationKnownLiyue=function(){const s=this.s,g=s.global;return yes(s.flags.FLAG_ACCESS_REGION_LIYUE)||Object.values(s.liyue?.accepts||{}).some(a=>a.saveId===g.SAVE_ID&&a.route===g.STORY_ROUTE_ID);};
P.installNavigation=function(){
 if(this._navigationInstalled)return;this.db={...this.db};const key='47_MAP_EDGE_DB',rows=this.db[key].map(r=>r.slice());
 // CRPG overland transit, not a claim about original geographic adjacency.
 for(const [id,from,to,back] of [
 ['EDGE_NAV_MOND_TO_LIYUE_ROAD','MAP_MOND_CITY','MAP_LIYUE_PLAINS','EDGE_NAV_LIYUE_ROAD_TO_MOND'],
 ['EDGE_NAV_LIYUE_ROAD_TO_MOND','MAP_LIYUE_PLAINS','MAP_MOND_CITY','EDGE_NAV_MOND_TO_LIYUE_ROAD']
 ])if(!rows.some(r=>r[0]===id))rows.push([id,from,to,'REGION_TRANSIT',6,180,'NAV_LIYUE_VISITED','', 'Y',(to==='MAP_MOND_CITY'?'몬드성':'리월 외곽 도로')+' 방향',back,'ACTIVE','CRPG_NAV_REPAIR','도시 봉쇄를 해제하지 않는 외곽 귀환로']);
 this.db[key]=rows;this.tables[key]=new Map(rows.slice(1).filter(r=>r[0]).map(r=>[r[0],r]));this._navigationInstalled=true;
};
P.liyueReturnAllowed=function(target){
 if(!this.navigationKnownLiyue())return false;
 const s=this.s,j=s.storyJourney,b=s.storyBreak,n=this.storyNode();
 // Returning to an accepted story checkpoint does not open shops or other chapters.
 if(b?.map===target||j?.from===target)return true;
 if(j&&!j.scripted&&j.target===target)return true;
 if(liyue(n)&&n[8]===target&&s.global.STORY_WAITING)return true;
 return false;
};
P.edgeReason=function(row){
 let r=row;
 if(row?.[6]==='NAV_LIYUE_VISITED'){
  if(!this.navigationKnownLiyue())return '리월 본편의 첫 여정을 시작한 뒤 이용할 수 있습니다.';
  r=row.slice();r[6]='';r[7]='';
 }else if(row?.[6]==='FLAG_TRUE'&&row[7]==='FLAG_ACCESS_REGION_LIYUE'&&this.navigationKnownLiyue()){
  if(row[2]==='MAP_MOND_CITY'||this.liyueReturnAllowed(row[2])){r=row.slice();r[6]='';r[7]='';}
 }
 const reason=old.edgeReason.call(this,r);if(reason)return reason;
 const s=this.s,l=s.liyue;
 if(s.global.STORY_ROUTE_ID==='ROUTE_ISEKAI'&&l?.activeQuest&&!l.regionReceipt&&row[2]==='MAP_LIYUE_HARBOR'&&!this.liyueReturnAllowed(row[2]))return '리월항 출입 통제 중 · 본편의 안내 이동을 이용하세요.';
 return '';
};
P.navigationGoal=function(){const s=this.s,j=s.storyJourney,b=s.storyBreak;if(j)return j.scripted&&s.global.CURRENT_MAP_ID!==j.from?j.from:j.target;if(b)return b.map;const n=this.storyNode();if(n&&!this.isStoryWaiting())return n[8];return this.mainStoryEntries().find(x=>x.map)?.map||null;};
P.navigationRoute=function(target){
 const start=this.s.global.CURRENT_MAP_ID;if(!this.tables['32_MAP_DB'].has(target))return null;if(start===target)return {maps:[start],edges:[],minutes:0};
 const costs=new Map([[start,0]]),paths=new Map([[start,[]]]),queue=[start],done=new Set();
 while(queue.length){queue.sort((a,b)=>costs.get(a)-costs.get(b));const map=queue.shift();if(done.has(map))continue;done.add(map);if(map===target){const edges=paths.get(map);return {maps:[start,...edges.map(r=>r[2])],edges,minutes:costs.get(map)};}
  const view=Object.create(this);view.s={...this.s,global:{...this.s.global,CURRENT_MAP_ID:map}};
  for(const r of this.rows('47_MAP_EDGE_DB')){if(r[1]!==map||view.edgeReason(r))continue;const cost=costs.get(map)+Math.max(0,Number(r[5])||0);if(cost<(costs.get(r[2])??Infinity)){costs.set(r[2],cost);paths.set(r[2],[...paths.get(map),r]);queue.push(r[2]);}}
 }return null;
};
P.storyPauseReason=function(){const s=this.s,n=this.storyNode();if(s.runtime||s.battlePreparation||s.storyRecovery||s.storyContext||s.storyJourney||s.storyBreak||s.lifeJob||s.worldJob||s.placeVisit)return '현재 진행 중인 장면을 먼저 마쳐 주세요.';if(s.global.STORY_MENU_POLICY==='SAVE_LOAD_ONLY')return '이 장면은 이어서 진행해야 합니다.';if(!liyue(n)||!['NARRATION','DIALOGUE'].includes(n[5])||s.global.PENDING_CHOICE_GROUP_ID||this.isStoryWaiting())return '대화나 서술 장면에서 잠시 나갈 수 있습니다.';return '';};
P.actionReason=function(type,a={}){if(type==='STORY_PAUSE_FREE')return this.storyPauseReason();return old.actionReason.call(this,type,a);};
P.apply=function(a){if(a.type==='STORY_PAUSE_FREE'){const reason=this.storyPauseReason();if(reason)throw new api.RuleError('STORY_PAUSE',reason);const g=this.s.global,n=this.storyNode();this.s.storyBreak={node:n[4],next:n[4],map:g.CURRENT_MAP_ID,title:'리월 이야기 · 잠시 쉬기',prompt:'대화와 선택은 그대로 보관됩니다. 이 장소로 돌아오면 멈춘 장면부터 이어갑니다.',policy:g.STORY_MENU_POLICY||''};this.s.storyMenuFrame=null;delete this.s.storyArrival;Object.assign(g,{STORY_WAITING:true,STORY_NEXT_PREPARED:'',STORY_MENU_POLICY:'',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'LOCATION'});return {paused:true,node:n[4]};}return old.apply.call(this,a);};
P.storyNaturalPause=function(row){if(old.storyNaturalPause?.call(this,row))return true;const g=this.s.global,next=this.storyIndex().nodes.get(g.STORY_ROUTE_ID+':'+row[13]);
 if(!this.s.storyContext&&g.STORY_MENU_POLICY!=='SAVE_LOAD_ONLY'&&liyue(row)&&['DIALOGUE','NARRATION'].includes(row[5])&&next&&next[1]===row[1]&&next[3]!==row[3]&&['DIALOGUE','NARRATION'].includes(next[5])){
  this.s.storyBreak={node:row[4],next:row[13],map:g.CURRENT_MAP_ID,title:'잠시 정비할 시간',prompt:'주변을 둘러보거나 편성을 정비한 뒤 이야기를 계속할 수 있습니다.',policy:g.STORY_MENU_POLICY||''};Object.assign(g,{STORY_WAITING:true,STORY_NEXT_PREPARED:'',STORY_MENU_POLICY:'',SCREEN_MODE:'LOCATION'});return true;
 }return false;};
// A chapter-end housekeeping/recap row still commits its receipt once, but is not dialogue.
P.storyAutomaticNode=function(row){return liyue(row)&&row[5]==='STORY_PAUSE'||old.storyAutomaticNode.call(this,row);};
P.storyDisplayText=function(row){row??=this.storyNode();return liyue(row)&&row[5]==='STORY_PAUSE'?'':old.storyDisplayText.call(this,row);};
P.oculusEntries=function(){return old.oculusEntries.call(this).map(p=>{
 if(p.id==='GEO_QINGCE_BARTER'){const asked=this.oculusProgress(p.id)>0;return {...p,clue:asked?'주민이 돌을 천 위에 꺼내 놓고 교환을 기다리고 있다.':'한 주민이 밭을 정리하다 주웠다는 반짝이는 돌을 보여 준다.',context:asked?'돌은 평범한 광석과 달리 은은한 빛을 머금고 있다. 주민은 오늘 식사에 쓸 쌀 4개와 새우살 2개를 가져오면 돌을 넘기겠다고 한다. 재료를 건네면 바위 눈동자 1개를 얻으며, 지금은 떠났다가 나중에 돌아와도 된다.':'주민은 돌의 정체를 몰라 보관해 두었다고 한다. 먼저 발견한 경위를 듣고, 돌을 받을 방법을 물어볼 수 있다. 이야기를 듣는 동안에는 아이템을 소비하지 않는다.'};}
 return p;
});};
P.newGame=function(o){old.newGame.call(this,o);this.installNavigation();return JSON.parse(JSON.stringify(this.s));};
P.validateSave=function(s){const result=old.validateSave.call(this,s);this.installNavigation();return result;};
})(globalThis);
