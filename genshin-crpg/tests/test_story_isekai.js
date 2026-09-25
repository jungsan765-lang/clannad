'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict'),path=require('path');
const root=process.env.CRPG_ROOT||path.resolve(__dirname,'..'),ctx=vm.createContext({console});
for(const f of ['source/runtime.js','source/runtime_extensions.js','source/runtime_story.js','source/runtime_nodes.js','source/runtime_events.js','source/runtime_combat.js','source/runtime_economy.js']){const p=process.env.CRPG_SOURCE?path.join(process.env.CRPG_SOURCE,path.basename(f)):path.join(root,f);vm.runInContext(fs.readFileSync(p,'utf8'),ctx,{filename:f});}
const {Runtime}=ctx.CRPGRuntime,db=JSON.parse(fs.readFileSync(process.env.CRPG_DB||root+'/content/db.json','utf8'));
for(const branch of ['K','AA','AB','B']){
 const r=new Runtime(db);r.newGame({name:'통합검증',route:'ROUTE_ISEKAI',saveId:'STORY-ISEKAI-'+branch,seed:993823});const history=[];
 for(let tick=0;tick<1500;tick++){
  try{
   if(r.s.runtime||r.s.battlePreparation)break;
   if(r.s.global.STORY_NEXT_PREPARED){r.action('STORY_RESUME');continue;}
   if(r.s.global.STORY_WAITING||r.s.global.SCREEN_MODE==='MAIN_MENU'){const e=r.mainStoryEntries().find(x=>x.quest==='Q_ISK_MOND_02'||x.id==='Q_ISK_MOND_02'||x.questId==='Q_ISK_MOND_02');if(e){r.action('MAIN_STORY_ACCEPT',{quest:'Q_ISK_MOND_02'});continue;}if(!r.storyNode())break;}
   const choices=r.storyChoices();if(choices.length){let wanted=branch==='K'?'FLAG_ISK_META_KNOWLEDGE=KNOWN':'FLAG_ISK_META_KNOWLEDGE=UNKNOWN';if(!choices.some(x=>String(x[12]).includes(wanted)))wanted=branch==='B'?'FLAG_ISK_MOND_BRANCH=GUILD':'FLAG_ISK_MOND_BRANCH=EXPEDITION';if(!choices.some(x=>String(x[12]).includes(wanted)))wanted=branch==='AB'?'FLAG_ISK_EXPEDITION_FORK=RETURN':'FLAG_ISK_EXPEDITION_FORK=RIDE';const chosen=choices.find(x=>String(x[12]).includes(wanted))||choices[0];history.push(chosen[4]);r.action('STORY_CHOICE',{node:chosen[4]});continue;}
   const n=r.storyNode();assert.ok(n,'missing node '+r.storyActiveNodeId());history.push(n[4]);if(n[5]==='INPUT_TEXT')r.action('STORY_NAME',{name:'통합검증'});else r.action('STORY_NEXT',{node:n[4]});
  }catch(e){console.error({branch,cursor:r.storyActiveNodeId(),map:r.s.global.CURRENT_MAP_ID,history:history.slice(-8)});throw e;}
 }
 assert.ok(r.s.runtime||r.s.battlePreparation,'should reach authored battle gate for '+branch);
 console.log(JSON.stringify({branch,steps:history.length,battle:r.s.battlePreparation?.group||r.s.runtime.group,node:r.storyActiveNodeId(),lastMap:r.s.global.CURRENT_MAP_ID}));
}
