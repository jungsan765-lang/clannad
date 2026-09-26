'use strict';
const h=require('../tests/helpers_v011.cjs'),{R,db}=h;
const r=new R(db);r.newGame({name:'step11-audit',route:'ROUTE_TRAVELER',seed:1311,saveId:'STEP11-AUDIT'});
Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'LOCATION',STORY_MENU_POLICY:'',WORLD_TIME:'12:00'});
delete r.s.storyJourney;delete r.s.storyBreak;try{r.prepareStory();}catch{}
const maps=r.rows('32_MAP_DB').filter(x=>x[1]==='리월'&&x[8]==='Y'&&x[12]!=='Y');
const pools=r.rows('34_MAP_ENCOUNTER_POOL').filter(x=>maps.some(m=>m[0]===x[1]));
const gids=[...new Set(pools.map(x=>x[5]))];
const groups=gids.map(id=>{
 const row=r.tables['33_ENCOUNTER_GROUP_DB'].get(id);
 const members=r.rows('49_ENCOUNTER_MEMBER_DB').filter(x=>x[1]===id).map(x=>{
  const m=r.row('09_MONSTER_DB',x[3]);
  return {id:x[3],name:m[1],family:m[2],grade:m[3],min:Number(x[4]),max:Number(x[5]),loot:m[14]};
 });
 return {id,name:row?.[1],kind:row?.[2],min:row?.[4],max:row?.[5],members};
});
const mapData=maps.map(m=>({id:m[0],name:m[2],parent:m[3],min:Number(m[6]),max:Number(m[7]),pool:m[11],entries:pools.filter(p=>p[1]===m[0]).map(p=>({d:p[2],from:p[3],to:p[4],group:p[5],note:p[10]}))}));
console.log(JSON.stringify({mapCount:maps.length,poolCount:pools.length,uniqueGroups:gids.length,maps:mapData,groups},null,2));
