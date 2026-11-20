/* v0.14.8: the first companion's personal mission opens by itself. Amber joins through the main story, so she is
 * never listed where personal missions are introduced (동료 획득) and her mission could not be found from 호감도 or
 * 임무. Once Amber has joined and the Mondstadt prologue is behind the player, her personal mission is registered as
 * if it had been introduced: it then waits in 임무 → 진행 중 → 동료 획득 임무, and the learning guide points at it.
 * The mission itself, its cost, its +10 bond on first completion and the battle bond rule are unchanged. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.storyDefinition||!P.legendRegistered||P.personalV0148)return;
const AUTO=['LEG_MOND_AMBER','LEG_ISK_MOND_AMBER'];
const truth=x=>x===true||x==='TRUE'||x==='Y';
const old={apply:P.apply};
P.autoPersonalMissionIds=function(s=this.s){
 const g=s?.global;if(!g||s.runtime)return [];
 return AUTO.filter(id=>{let d=null;try{d=this.storyDefinition(id);}catch{return false;}
  return !!d&&d.kind==='LEGEND'&&d.STATUS==='ACTIVE'&&d.ROUTE_SCOPE===g.STORY_ROUTE_ID&&truth(s.flags?.[d.RECRUIT_FLAG_ID])&&truth(s.flags?.[d.MAIN_FLAG_GATE])&&!this.legendRegistered(d.id);});
};
P.openedPersonalMissions=function(){const reg=this.s?.guildLegends||{};return AUTO.filter(id=>reg[id]?.auto&&!this.storyDone?.(id));};
P.apply=function(a){
 const out=old.apply.call(this,a);
 for(const id of this.autoPersonalMissionIds())(this.s.guildLegends??={})[id]={day:Math.max(1,Number(this.s.global.WORLD_DAY)||1),auto:true};
 return out;
};
P.personalV0148=true;api.personalV0148={auto:AUTO.slice()};
})(typeof window!=='undefined'?window:globalThis);
