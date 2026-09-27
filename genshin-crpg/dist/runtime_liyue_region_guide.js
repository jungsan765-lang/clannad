/* Liyue region guide: danger, enemy levels, surviving party, appearance groups and rewards.
 * Read-only. Everything is derived from the live encounter pools, field battle rules, loot tables,
 * enemy tier chances and field boss routes, so the board cannot drift from what battles do.
 */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.liyueAreaThreat||P.liyueRegionGuideVersion)return;
const LABELS={1:'낮음',2:'주의',3:'경계',4:'위험',5:'고위험',6:'최고 위험'};
// Same factors as finishBattle (XP) and liyueFieldMoraPlan (Mora) for Liyue random battles.
const XP_GRADE={일반:1,정예:3,강적:6},MORA_GRADE={일반:1,정예:1.35,강적:1.75},MORA_RISK=[0,1,1.03,1.06,1.10,1.15,1.20];
const WEIGHT={일반:1,정예:2,강적:3};
const pct=x=>Math.round(x*100);
// limitFieldBattle keeps the strongest bodies first, then different species before duplicates.
function fielded(members,key,size){
 const bodies=[];members.forEach((m,index)=>{for(let n=0;n<m[key];n++)bodies.push({m,index});});
 const ranked=bodies.sort((a,b)=>(WEIGHT[b.m.grade]||1)-(WEIGHT[a.m.grade]||1)||a.index-b.index),unique=[],duplicates=[],seen=new Set();
 for(const x of ranked){if(seen.has(x.m.id))duplicates.push(x);else{seen.add(x.m.id);unique.push(x);}}
 return [...unique,...duplicates].slice(0,size).map(x=>x.m);
}
P.liyueRegionGuide=function(mapId=this.s?.global?.CURRENT_MAP_ID){
 const threat=this.liyueAreaThreat(mapId),map=this.tables['32_MAP_DB'].get(mapId);if(!threat||!map)return null;
 const party=this.s.party.filter(p=>p.active).map(p=>p.type==='PLAYER'?this.player():this.character(p.source)).filter(a=>a.hp>0);
 const size=Math.max(1,Math.min(4,party.length)),avg=party.length?party.reduce((n,a)=>n+Number(a.level||1),0)/party.length:1;
 const min=threat.minLevel,max=threat.maxLevel,clamp=v=>Math.max(min,Math.min(max,v)),levels=[clamp(Math.round(avg)-1),clamp(Math.round(avg)+1)];
 const risk=Math.max(1,Math.min(6,Math.round(min)-1)),over=Math.max(0,Math.round(avg-max));
 const c=api.enemyTiers?.chance,tiers=c?{
  enhanced:pct(Math.min(c.enhanced.max,c.enhanced.perRisk*risk+c.enhanced.perOver*over)),
  strongElite:pct(Math.min(c.strongElite.max,c.strongElite.perRisk*risk+c.strongElite.perOver*over)),
  danger:pct(risk>=c.danger.fromRisk?Math.min(c.danger.max,c.danger.perRisk*(risk-2)+c.danger.perOver*over):(over>=2?c.danger.overOnly:0))
 }:null;
 const moraRisk=Math.max(1,Math.min(6,Math.ceil(((min+max)/2)/2))),riskMult=MORA_RISK[moraRisk];
 const xp=(list,level)=>Math.max(1,Math.round(list.reduce((n,m)=>n+Math.round((30+15*level)*(XP_GRADE[m.grade]||1)),0)*.4));
 const mora=(list,level,group)=>list.reduce((n,m)=>n+Math.round((4+2*level)*(MORA_GRADE[m.grade]||1)*riskMult*group),0);
 const monsters=new Map();
 const entries=threat.entries.map(e=>{
  const row=this.tables['33_ENCOUNTER_GROUP_DB'].get(e.group),group=Math.max(.5,Math.min(2,Number(row?.[24]||1)));
  const members=e.members.map(m=>{const r=this.row('09_MONSTER_DB',m.id);const x={...m,grade:r[3],table:r[14]};monsters.set(m.id,x);return x;});
  const low=fielded(members,'min',size),high=fielded(members,'max',size);
  return {...e,members:members.map(({table,...m})=>m),bodies:[low.length,high.length],xp:[xp(low,levels[0]),xp(high,levels[1])],mora:[mora(low,levels[0],group),mora(high,levels[1],group)]};
 });
 // Loot rows exactly as finishBattle filters them on this map.
 const view=Object.create(this);view.s={...this.s,global:{...this.s.global,CURRENT_MAP_ID:mapId}};
 const loot=this.combatRows?this.combatRows('20_LOOT_TABLE'):this.rows('20_LOOT_TABLE'),drops=new Map();
 for(const m of monsters.values())for(const d of loot.filter(x=>x[0]===m.table&&(!x[1]||x[1]===m.id)&&this.tables['14_ITEM_DB'].has(x[2]))){
  const open=['','없음'].includes(d[6]||'')||view.liyueLootConditionAllowed?.({origin:'RANDOM'},{source:m.id,grade:m.grade},d);if(!open)continue;
  const item=drops.get(d[2])||{id:d[2],name:this.row('14_ITEM_DB',d[2])[1],chance:0,min:Infinity,max:0,from:[]};
  item.chance=Math.max(item.chance,Number(d[5])||0);item.min=Math.min(item.min,Number(d[3])||1);item.max=Math.max(item.max,Number(d[4])||1);if(!item.from.includes(m.name))item.from.push(m.name);drops.set(d[2],item);
 }
 const boss=this.rows('35_BOSS_ROUTE_DB').filter(r=>/^BRT_FB_/.test(r[0])&&r[2]===mapId).map(r=>this.fieldBossRouteInfo?.(r[0])).filter(Boolean).map(b=>({route:b.route,name:b.name,level:b.level,material:b.material?.name||'',cooldown:b.cooldown?.left||0,cooldownReason:b.cooldown?.reason||''}))[0]||null;
 const span=key=>[Math.min(...entries.map(e=>e[key][0])),Math.max(...entries.map(e=>e[key][1]))];
 const reward=api.enemyTiers?.reward||{};
 return {map:mapId,name:threat.name,biome:threat.biome,notes:threat.notes,risk,label:LABELS[risk],minLevel:min,maxLevel:max,
  encounterChance:Number(map[9])||0,party:{size,average:Math.round(avg*10)/10,alive:party.length},underLevel:avg<min,overLevel:avg>max,enemyLevels:levels,
  tiers,entries,rewards:{xp:span('xp'),mora:span('mora'),drops:[...drops.values()].sort((a,b)=>b.chance-a.chance),
   tierBonus:{enhanced:pct(reward[2]?.rolls?.[0]||0),strongElite:(reward[4]?.rolls||[]).map(pct),danger:(reward[5]?.rolls||[]).map(pct),essence:reward[5]?.essence||0}},
  boss};
};
P.liyueRegionGuideVersion=1;api.liyueRegionGuideVersion=1;
})(globalThis);
