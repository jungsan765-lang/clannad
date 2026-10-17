'use strict';
// Observation of an existing hidden legacy API; no product code is changed.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ROOT=path.resolve(__dirname,'../../../..'),H=require(path.join(ROOT,'tools/audit_protagonist_v01618.cjs'));
const scripts=[...fs.readFileSync(path.join(ROOT,'source/index.html'),'utf8').matchAll(/<script src="((?:world_content|liyue_card_content|runtime[^" ]*)\.js)"/g)].map(m=>m[1]);
const changed=['runtime_abyss.js','runtime_formations.js','runtime_growth_v01522.js','runtime_balance_admin_v01623.js'];
function load(old){const c=vm.createContext({console,Date,setTimeout,clearTimeout});for(const f of scripts){const p=old&&changed.includes(f)?'docs/data/abyss_fixes_v01626/baseline/'+f:'source/'+f;vm.runInContext(fs.readFileSync(path.join(ROOT,p),'utf8'),c,{filename:f});}return{c,db:JSON.parse(fs.readFileSync(path.join(ROOT,'content/db.json'),'utf8')),R:c.CRPGRuntime.Runtime,api:c.CRPGRuntime,root:ROOT};}
const out=[];
for(const [name,old]of [['published_before',true],['current',false]]){
 const e=load(old),r=H.setup(e,{level:20,team:['MOND_AMBER','MOND_KAEYA','MOND_LISA'],seed:717,map:'MAP_MOND_PLAINS',gear:'none',talent:1});
 try{const action=r.action('TUTORIAL_DRILL'),b=r.s.runtime;out.push({name,callable:true,noAppEntryFound:true,origin:b.origin,rows:b.order.map(q=>{const a=b.actors.find(a=>a.id===q.id);return{id:q.id,side:a.side,finalSpeed:r.combatStat(a,'spd'),score:q.score,scoreMinusFinalSpeed:q.score-r.combatStat(a,'spd')};}),publicOrderMatchesFinal:JSON.stringify(action.result.order)===JSON.stringify(r.combatOrderView())});}
 catch(err){out.push({name,callable:false,code:err.code,error:err.message});}
}
fs.writeFileSync(path.join(__dirname,'OPTIONAL_LEGACY_DRILL.json'),JSON.stringify({scope:'Read-only observation of the older hidden training API. App call sites for TUTORIAL_DRILL were not found. This is separate from required story/movement tutorial and remains outside the frozen four-source patch.',observations:out},null,2)+'\n');
console.log(JSON.stringify(out));
