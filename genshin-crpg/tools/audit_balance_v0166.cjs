'use strict';
// Reproducible observations from the current authoritative runtime, not forced wins or adaptive enemies.
const {measure,REFERENCE_TEAM}=require('./audit_balance_v0161.cjs');
const {setup,G,api}=require('./audit_balance_v01522.cjs');
const {profile,SEEDS,ASSUMPTIONS}=require('./audit_growth_pacing_v0166.cjs');
const fs=require('node:fs'),path=require('node:path');
const TEAMS={story4:REFERENCE_TEAM,support4:['MOND_FISCHL','LIYUE_XIANGLING','MOND_BARBARA'],standard5:['MOND_DILUC','MOND_MONA','MOND_JEAN'],limited5:['LIYUE_HUTAO','LIYUE_YELAN','LIYUE_ZHONGLI']};
function scenarios(mode){
 const r=setup({level:60}),out=[],mapLevel=map=>Number(r.row('32_MAP_DB',map)[6])||1;
 if(mode==='field')for(const [map,level]of Object.entries(api.growthRegionData.maps)){
  const area=r.row('32_MAP_DB',map);if(area[8]!=='Y'||area[12]==='Y')continue;
  // Native pools also cover alias maps that reuse another area's group at their own fixed level.
  for(const group of new Set(r.encounterPoolRows(area).map(x=>x[5])))out.push({name:map+'/'+group,level,map,group,origin:'RANDOM',...profile(level)});
 }
 if(mode==='commissions')for(const q of r.rows('22_QUEST_DB').filter(q=>r.isCommission(q[0]))){
  const p=JSON.parse(q[10]||'{}'),map=p.map_id||p.conditions?.map_id;
  function walk(x){if(!x||typeof x!=='object')return;for(const [k,v]of Object.entries(x)){if(k==='combat_group'&&v){const level=mapLevel(map);out.push({name:q[0]+'/'+v,quest:q[0],level,map,group:v,origin:'QUEST:'+q[0],...profile(level)});}else if(v&&typeof v==='object')walk(v);}}
  walk(p);
 }
 if(mode==='story')for(const n of r.storyIndex().byTable['55_MAIN_STORY_DB'].filter(n=>n[5]==='COMBAT_GATE'&&!n[4].startsWith('PRO_'))){
  const group=String(n[12]).match(/START_FIXED_COMBAT:(\w+)/)?.[1];if(!group||/DVALIN/.test(group))continue;
  const map=n[8],route=n[0],storyNode=n[4],special=api.growthRegionData.story?.[storyNode],level=/OSIAL/.test(group)?60:special||mapLevel(map);
  out.push({name:storyNode,route,storyNode,storyLeaf:storyNode.match(/^ISK_L0[34]_(K[12]|AA[12]|AB[12]|B[12])_/ )?.[1],group,map,level,...profile(level),...(/OSIAL/.test(group)?{team:TEAMS.support4,enhance:10,talent:8}:{})});
 }
 if(mode==='domains')for(const [key,d]of Object.entries(G.domains))for(const level of d.levels)for(const element of d.kind==='ASCENSION'?Object.values(G.gems).map(x=>x[0]):['NEUTRAL'])out.push({name:key+':'+level+'/'+element,level,domain:key+':'+level,element,...profile(level),seeds:[717]});
 if(mode==='ley')for(const t of api.leyLines.tiers)for(const site of api.leyLines.sites)for(const level of [...new Set([t.minLevel,t.level])])out.push({name:site.kind+'/'+site.map+'/tier'+t.tier+'/Lv'+level,level,map:site.map,kind:site.kind,tier:t.tier,...profile(level),seeds:[717]});
 if(mode==='rarity')for(const [name,team]of Object.entries(TEAMS))for(const [level,group,map]of [[50,'EG_BOSS_TARTAGLIA','MAP_LIYUE_GOLDEN_HOUSE'],[60,'EG_BOSS_AZHDAHA','MAP_AZHDAHA_DOMAIN']])out.push({name,level,group,map,team,gear:'craft',enhance:10,talent:8});
 if(mode==='bosses')for(const [boss,level]of Object.entries(api.growthRegionData.bosses)){
  if(/OSIAL/.test(boss))continue;const group=boss==='BOSS_ISK_L03_GOLDEN'?'EG_ISK_L03_GOLDEN':'EG_'+boss;if(!r.tables['33_ENCOUNTER_GROUP_DB'].has(group))continue;
  const map=api.fieldBosses.bosses[boss]?.map||{BOSS_DVALIN:'MAP_STORMTERROR_LAIR',BOSS_ANDRIUS:'MAP_WOLF_ARENA',BOSS_TARTAGLIA:'MAP_LIYUE_GOLDEN_HOUSE',BOSS_ISK_L03_GOLDEN:'MAP_LIYUE_GOLDEN_HOUSE',BOSS_AZHDAHA:'MAP_AZHDAHA_DOMAIN'}[boss];
  for(const team of [TEAMS.story4,TEAMS.support4])out.push({name:boss+'/'+(team===TEAMS.story4?'story4':'support4'),boss,level,group,map,...profile(level),team});
 }
 return out;
}
function run(mode,{smoke=false,outFile}={}){
 const allowed=['field','commissions','story','domains','ley','rarity','bosses','raid'];if(!allowed.includes(mode))throw Error('Choose audit mode: '+allowed.join(', '));
 const result={version:require('../package.json').version,mode,assumptions:ASSUMPTIONS,rows:[],excluded:[]};
 if(mode==='raid'){result.excluded.push('Event fixture was lost during workspace recovery. Use existing native raid regression tests; this tool does not open live events.');}
 else{
  let cases=scenarios(mode);if(smoke)cases=cases.slice(0,1);
  const checkpoint=()=>{if(outFile){fs.mkdirSync(path.dirname(outFile),{recursive:true});fs.writeFileSync(outFile,JSON.stringify(result,null,2)+'\n');}};
  for(const scenario of cases){const {seeds=SEEDS,name,...options}=scenario;
   for(const seed of smoke?seeds.slice(0,1):seeds){try{result.rows.push({name,...measure({...options,seed,saveId:'BALANCE-V0166-'+seed})});}catch(error){result.rows.push({name,...options,seed,result:{victory:false,error:error.code||error.name,message:error.message}});}checkpoint();}
   console.log(JSON.stringify({mode,name,samples:result.rows.filter(x=>x.name===name).length,wins:result.rows.filter(x=>x.name===name&&x.result.victory).length}));
  }
 }
 result.summary={samples:result.rows.length,wins:result.rows.filter(x=>x.result.victory).length,errors:result.rows.filter(x=>x.result.error).length,losses:result.rows.filter(x=>!x.result.victory).map(x=>({name:x.name,level:x.level,seed:x.seed,rounds:x.result.rounds,error:x.result.error}))};
 if(mode==='story')result.excluded.push('Five authored Dvalin gates require their existing dedicated story/combat regression fixtures.');
 if(mode==='bosses')result.excluded.push('Generic crafted parties do not prove boss gimmick or elemental-counter solvability; dedicated prepared-party tests remain separate.');
 if(outFile){fs.mkdirSync(path.dirname(outFile),{recursive:true});fs.writeFileSync(outFile,JSON.stringify(result,null,2)+'\n');}return result;
}
if(require.main===module){const mode=process.argv.slice(2).find(x=>!x.startsWith('--'));if(!mode)throw Error('Specify a mode; full audits are intentionally opt-in.');const outFile=process.env.CRPG_BALANCE_OUT||path.resolve(__dirname,'../evidence/v0166/'+mode+'-current.json');console.log(JSON.stringify(run(mode,{smoke:process.argv.includes('--smoke'),outFile}).summary));}
module.exports={run,scenarios,TEAMS};
