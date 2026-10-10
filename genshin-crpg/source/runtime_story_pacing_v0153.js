/* 0.15.3 story pacing (user: 「이야기 사이사이에 너무 쉬는게 많은 부분들도 좀 정리해야할 것 같아」, then 「휴식구간은 냅두고,
 * 단어 하나만 나오고 휴식 취하고 이딴게 있어서 이걸 바꿔야됨」). A walk through every route found stretches where the story
 * showed one line (sometimes a single word) and then handed control back again:
 *  - Liyue stops at every scene change (「잠시 정비할 시간」, runtime_navigation.js). The 이세계 K manuscript interleaves
 *    its own lines with kept lines of other scenes, so the scene changed after nearly every line and the story stopped
 *    each time. That rest now happens only between two real stretches of reading: at least four lines of narration or
 *    dialogue since the story last handed control back, and at least four more before its next stop (travel, battle,
 *    field gate, chapter end).
 *  - A choice row without a travel event of its own carries the chain's default map, so line (plains) → choice
 *    (mountains) → line (plains) sent the player walking back and forth for each line. A choice is now made where the
 *    player stands; rows with a real travel event and other rows still ask for the trip.
 * Rest points written into the story (runtime_journey naturalPauses), chapter ends, travel legs and battles are untouched.
 * s.storyPace counts the lines read since the last stop. Load after runtime_navigation.js, runtime_journey.js and the
 * story content modules. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.storyPacingV0153)return;P.storyPacingV0153=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const MIN_BEFORE=4,MIN_AFTER=4,SCENE_REST='잠시 정비할 시간',NARRATIVE=new Set(['DIALOGUE','NARRATION']);
const STOP_TYPES=new Set(['COMBAT_GATE','FIELD_GATE','STORY_PAUSE','CHAPTER_END','MENU_GATE','CARD_JOIN','INPUT_TEXT']);
const RESETS=new Set(['MAIN_STORY_ACCEPT','STORY_CHAPTER','STORY_RESUME','STORY_PAUSE_FREE','LEGEND_ENTER','AFFECTION_ENTER']);
const old=Object.fromEntries(['storyNaturalPause','storyArrivalGate','startBattle','apply','validateSave','newGame'].map(k=>[k,P[k]]));
const groups=new WeakMap();
const pace=s=>s.storyPace??={version:1,lines:0};
function firstOption(index,group){let map=groups.get(index);if(!map){map=new Map();for(const row of index.nodes.values())if(row[14]&&!map.has(row[14]))map.set(row[14],row);groups.set(index,map);}return map.get(group)||null;}
// Lines of narration/dialogue the story will show from row's successor before it next hands control back.
P.storyLinesAhead=function(row,limit=MIN_AFTER){
 const index=this.storyIndex(),route=this.s.global.STORY_ROUTE_ID,here=this.s.global.CURRENT_MAP_ID;let id=row?.[13],n=0;
 for(let guard=0;id&&guard<80;guard++){
  let r;const text=String(id);
  if(text.startsWith('CHOICE_GROUP:'))r=firstOption(index,text.slice(13));else r=index.nodes.get(route+':'+text);
  if(!r)break;
  if(STOP_TYPES.has(r[5])||this.storyTravelFor(r))break;
  if(r[5]!=='CHOICE'&&r[8]&&r[8]!==here&&this.tables['32_MAP_DB'].has(r[8]))break;
  if(NARRATIVE.has(r[5])&&++n>=limit)return n;
  id=r[13];
 }
 return n;
};
P.storyNaturalPause=function(row){
 const s=this.s,g=s.global,had=!!s.storyBreak,p=pace(s);
 if(NARRATIVE.has(row?.[5]))p.lines=Math.min(10000,p.lines+1);
 const saved={STORY_WAITING:g.STORY_WAITING,STORY_NEXT_PREPARED:g.STORY_NEXT_PREPARED,STORY_MENU_POLICY:g.STORY_MENU_POLICY,SCREEN_MODE:g.SCREEN_MODE};
 const paused=old.storyNaturalPause.call(this,row);
 if(!paused||had)return paused;
 if(s.storyBreak?.title===SCENE_REST&&(p.lines<MIN_BEFORE||this.storyLinesAhead(row)<MIN_AFTER)){delete s.storyBreak;Object.assign(g,saved);return false;}
 p.lines=0;return paused;
};
P.storyArrivalGate=function(r){
 if(r?.[5]==='CHOICE'&&!this.storyTravelFor(r))return false;
 const gated=old.storyArrivalGate.call(this,r);if(gated)pace(this.s).lines=0;return gated;
};
P.startBattle=function(group,origin='EXPLICIT',...rest){if(String(origin).startsWith('STORY:'))pace(this.s).lines=0;return old.startBattle.call(this,group,origin,...rest);};
P.apply=function(a){const out=old.apply.call(this,a);if(RESETS.has(a?.type))pace(this.s).lines=0;return out;};
P.newGame=function(...args){const out=old.newGame.apply(this,args);pace(this.s);return out;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,p=out?.storyPace;if(p===undefined)return out;
 if(!p||typeof p!=='object'||Array.isArray(p)||p.version!==1||!Number.isInteger(p.lines)||p.lines<0||p.lines>10000)fail('STORY_PACE_SAVE','이야기 진행 기록이 올바르지 않습니다.');
 return out;
};
api.storyPacingV0153={minBefore:MIN_BEFORE,minAfter:MIN_AFTER};
})(typeof globalThis!=='undefined'?globalThis:this);
