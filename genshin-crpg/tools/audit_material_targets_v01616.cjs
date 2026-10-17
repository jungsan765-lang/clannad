'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
// Reproduce the final material targets using native current-source rewards.
// The baseline chooses comparison stages; target duration is measured anew.
const ROOT=path.resolve(__dirname,'..');
const {runCases}=require(path.join(ROOT,'tools/audit_material_rewards_v01616.cjs'));
const {G}=require(path.join(ROOT,'tools/audit_balance_v01522.cjs'));
const baseline=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/data/material_rewards_v01616_baseline.json')));
const route=process.argv[2]||'ROUTE_TRAVELER';
const supplement=process.argv.includes('--supplement');
const out=process.argv[3]||path.join(ROOT,'docs/data/material_rewards_v01616_final_'+(route==='ROUTE_TRAVELER'?'traveler':'isekai')+'.json');
const elements=['NEUTRAL','PYRO','HYDRO','ANEMO','ELECTRO','CRYO','GEO','DENDRO'];
const pay=r=>r.kind==='ASCENSION'?G.domainAscensionGems[r.element][r.stage]:G.domainTalentBooks[r.region==='몬드'?'MOND':'LIYUE'][r.stage];
function bestLower({kind,element,region,maxStage}){return baseline.rows.filter(r=>r.route===route&&r.level===55&&r.kind===kind&&r.stage<maxStage&&(!element||r.element===element)&&(!region||r.region===region)&&r.stop==='VICTORY_LIMIT'&&r.wins===r.limit&&r.losses===0).map(r=>({...r,adjustedMaterialsPerMinute:pay(r)*r.wins*60/r.seconds})).sort((a,b)=>b.adjustedMaterialsPerMinute-a.adjustedMaterialsPerMinute||b.stage-a.stage)[0];}
const cases=[];
if(supplement){
 for(const seed of [4242,9031]){for(const element of ['HYDRO','CRYO'])cases.push({kind:'ASCENSION',level:55,stage:60,element,route,seed,target:G.ascensionGemCosts[element][5],limit:100,recovery:true,mode:'FINAL_NATIVE_SUPPLEMENT_4STAR_TARGET'});cases.push({kind:'TALENT',level:55,stage:60,route,seed,target:1992,limit:100,recovery:true,mode:'FINAL_NATIVE_SUPPLEMENT_LIYUE_TALENT_1TO8'});}
}else{
 for(const element of elements){const target=G.ascensionGemCosts[element][5],payout=G.domainAscensionGems[element][60],lower=bestLower({kind:'ASCENSION',element,maxStage:60});assert.equal(target,25*payout);for(const [mode,stage,demand]of [['FINAL_NATIVE_ASCENSION_4STAR_HIGHEST',60,target],['FINAL_NATIVE_ASCENSION_5STAR_HIGHEST',60,target*2],['FINAL_NATIVE_ASCENSION_4STAR_BEST_LOWER',lower.stage,target]])cases.push({kind:'ASCENSION',level:55,stage,element,route,seed:717,target:demand,limit:Math.ceil(demand/G.domainAscensionGems[element][stage])+5,recovery:true,mode});}
 for(const [region,stage,target]of [['몬드',25,996],['리월',60,1992]]){const lower=bestLower({kind:'TALENT',region,maxStage:stage});for(const [label,n]of [['HIGHEST',stage],['BEST_LOWER',lower.stage]])cases.push({kind:'TALENT',level:55,stage:n,route,seed:717,target,limit:Math.ceil(target/G.domainTalentBooks[region==='몬드'?'MOND':'LIYUE'][n])+5,recovery:true,mode:'FINAL_NATIVE_'+(region==='몬드'?'MOND':'LIYUE')+'_TALENT_1TO8_'+label});}
 for(const stage of [10,15])cases.push({kind:'TALENT',level:20,stage,route,seed:717,target:54,limit:Math.ceil(54/G.domainTalentBooks.MOND[stage])+5,recovery:true,mode:'FINAL_NATIVE_EARLY_MOND_TALENT_1TO4'});
}
fs.writeFileSync(out.replace(/\.json$/,'_cases.json'),JSON.stringify(cases,null,2)+'\n');
if(process.argv.includes('--cases-only')){console.log(JSON.stringify({cases:cases.length,route,supplement,caseFile:out.replace(/\.json$/,'_cases.json')}));process.exit();}
runCases(cases,{out,label:supplement?'FINAL_NATIVE_SUPPLEMENT':'FINAL_NATIVE_TARGET_COMPLETION'});
