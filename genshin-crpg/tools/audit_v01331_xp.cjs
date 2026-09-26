'use strict';
const h=require('../tests/helpers_v011.cjs'),{R,db}=h;
const r=new R(db);r.newGame({name:'XP감사',route:'ROUTE_TRAVELER',seed:1231,saveId:'XP-AUDIT'});
Object.assign(r.s.global,{CURRENT_STORY_NODE_ID:'END',STORY_CURSOR_NODE_ID:'END',PENDING_CHOICE_GROUP_ID:'',PENDING_INPUT_JSON:'{}',SCREEN_MODE:'LOCATION',STORY_MENU_POLICY:'',WORLD_TIME:'12:00',PLAYER_LEVEL_STATE:1});
delete r.s.storyContext;try{r.prepareStory();}catch{}
const levelRows=r.rows('26_LEVEL_RULES').slice(0,10).map(x=>({level:x[0],need:Number(x[2])}));
const books=r.rows('14_ITEM_DB').filter(x=>String(x[0]).startsWith('MAT_CHAR_EXP_')).map(x=>({id:x[0],name:x[1],xp:Number(x[8]||x[7]||0),effect:x[7],desc:x[5]}));
const quests=r.rows('22_QUEST_DB').filter(x=>{try{const p=JSON.parse(x[10]||'{}'),rw=JSON.parse(x[11]||'{}');return ['exploration','supply'].includes(p.kind)||rw.xp||rw.player_xp||rw.exp;}catch{return false;}}).map(x=>{let rw={};try{rw=JSON.parse(x[11]||'{}')}catch{}return{id:x[0],name:x[1],minLevel:x[4],reward:rw};}).slice(0,80);
const combatFormula=r.rows('09_MONSTER_DB').filter(x=>['일반','정예','강적','보스'].includes(x[3])).map(x=>({id:x[0],name:x[1],grade:x[3],baseLevel:Number(x[4]||1)})).slice(0,20);
const samples=[];
for(const map of ['MAP_MOND_PLAINS','MAP_MOND_FOREST','MAP_MOND_MOUNTAINS','MAP_LIYUE_PLAINS','MAP_LY_DETAIL_GUILI']){
 r.s.global.CURRENT_MAP_ID=map;let entries=[];try{entries=r.rows('34_MAP_ENCOUNTER_POOL').filter(x=>x[1]===map).slice(0,4)}catch{}
 for(const e of entries){const group=r.tables['33_ENCOUNTER_GROUP_DB'].get(e[5]);if(!group)continue;const members=r.rows('49_ENCOUNTER_MEMBER_DB').filter(x=>x[1]===e[5]),grades=members.map(m=>r.row('09_MONSTER_DB',m[3])[3]),minCount=members.reduce((n,m)=>n+Number(m[4]||0),0),maxCount=members.reduce((n,m)=>n+Number(m[5]||0),0);samples.push({map,group:e[5],groupName:group[1],level:[group[4],group[5]],grades,minCount,maxCount});}
}
console.log(JSON.stringify({levels:levelRows,books,quests,monsterPreview:combatFormula,samples},null,2));
