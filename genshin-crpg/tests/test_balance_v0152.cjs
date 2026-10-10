'use strict';
// 0.15.2 balance check (runtime_balance_v0152.js, runtime_boss_rematch.js; user: 「타르탈리아 존나 약한데 이건 또 뭐냐 전체적으로
// 밸런스 안맞는 적들 다 체크해. 이번에 돌파가 생겼으니 그것도 생각정도는 해놓고」). Reference parties fight through the real
// entry actions with the game's own AI; story levels with story gear, Lv.20 with +10 gear or broken-through +12 gear.
const assert=require('node:assert/strict'),path=require('path');
const {c,fs,root}=require('./helpers_v011.cjs'),{fixture}=require('./helpers_abyss.cjs'),{equip}=require('./helpers_abyss_artifacts.cjs');
const {play}=require('../tools/audit_protagonist_v01618.cjs');
const api=c.CRPGRuntime,results=[];
function check(name,fn){try{const evidence=fn();results.push({name,ok:true,evidence:evidence??null});console.log('PASS '+name);}catch(e){results.push({name,ok:false,error:e.stack});console.error('FAIL '+name+'\n'+e.stack);process.exitCode=1;}}
const TEAMS={four:['LIYUE_XIANGLING','LIYUE_XINGQIU','LIYUE_BEIDOU'],five:['LIYUE_HUTAO','LIYUE_ZHONGLI','LIYUE_XIAO'],mond:['MOND_AMBER','MOND_LISA','MOND_BENNETT']};
// the best of n natural artifact rolls at +lv for every member
function arts(r,ids,n,lv){for(const id of ids){let best=null,score=-1;for(let k=0;k<n;k++){const d=r.rollArtifact(),i=r.artifactInstance(d.slot);i.artifact.level=lv;const s=r.artifactStats(i);const v=(s.ATK||0)+(s.MAX_HP||0)*.05+(s.DEF||0)*.4+(s.CRIT||0)*3;if(v>score){if(best)r.s.inventory=r.s.inventory.filter(x=>x.slot!==best.slot);best=i;score=v;}else r.s.inventory=r.s.inventory.filter(x=>x!==i);}r.action('EQUIP',{slot:best.slot,owner:id});}}
function party({level,team,enh,ex=false,art=null,cons=0}){const t=TEAMS[team],r=fixture(level,t,Math.min(enh,12));if(ex)for(const m of t)equip(r,m,'EQ_EX_'+m,enh);if(art)arts(r,['PLAYER_CUSTOM',...t],art[0],art[1]);if(cons)for(const id of t){r.giveItem('STELLA_'+id,cons);for(let n=0;n<cons;n++)r.action('CONSTELLATION_UNLOCK',{char:id});}r.action('FORMATION_SET',{formation:'DOUBLE_LINE'});r.recalculate();r.action('OPERATOR_DEBUG',{op:'heal'});return r;}
function fight(r,{manual=false}={}){
 const inputs=[];
 if(manual){
  // The live game gives the protagonist to the player. The former all-AI
  // fixture never used exposure/joint strikes and predates the daily-boss
  // pressure adjustment. Keep its loss probe below, rather than weakening
  // the current boss to make that obsolete automatic party win.
  const action=r.action;r.action=function(type,args){if(type==='COMBAT')inputs.push(args.card);return action.call(this,type,args);};
  try{play(r);}finally{r.action=action;}
 }else{
 if(r.s.runtime&&r.combatOpening?.())r.action('COMBAT_BEGIN');
 const wind=r.combatCards().find(x=>x.id==='SYS_MOND_WIND_ROUTE'&&!x.reason);if(wind)r.action('COMBAT',{card:wind.id,target:wind.targets[0].id});
 for(let i=0;i<300&&r.s.runtime;i++){for(const a of r.s.runtime.actors)if(a.side==='ALLY')a.control='AI';if(r.s.runtime.liyueInterlude){r.action('LIYUE_INTERLUDE_ACK');continue;}r.autoUntilPlayer();}
 }
 assert(!r.s.runtime,'the fight ends');const res=JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON);
 let hp=0,max=0;for(const id of r.abyssParty()){if(id==='PLAYER_CUSTOM'){hp+=r.s.global.PLAYER_HP_CURRENT;max+=r.s.global.PLAYER_HP_MAX;}else{hp+=r.s.chars[id].hp;max+=r.character(id).maxHp;}}
 return {victory:!!res.victory,rounds:res.rounds,hp:Math.round(hp/max*100),...(manual?{inputs}: {})};
}
const boss=(r,id)=>r.s.runtime.actors.find(a=>a.side==='ENEMY'&&a.source===id);
const ENTER={
 story:(group)=>r=>r.startBattle(group,'EXPLICIT'),
 farm:(kind)=>r=>{if(kind==='TARTAGLIA'){r.s.flags.FLAG_TRV_LY_TARTAGLIA_WON=true;Object.assign(r.s.global,{CURRENT_MAP_ID:'MAP_LIYUE_GOLDEN_HOUSE',SCREEN_MODE:'LOCATION'});}else{r.s.flags[r.row('35_BOSS_ROUTE_DB','BRT_AZHDAHA')[13]]=true;Object.assign(r.s.global,{CURRENT_MAP_ID:'MAP_AZHDAHA_DOMAIN',SCREEN_MODE:'LOCATION'});}r.action('LIYUE_ARTIFACT_CHALLENGE',{kind});},
 rematch:(id)=>r=>{const c0=api.enhancementConfig.bosses[id];r.s.flags[r.row('35_BOSS_ROUTE_DB',c0.route)[13]]=true;Object.assign(r.s.global,{CURRENT_MAP_ID:c0.map,SCREEN_MODE:'LOCATION'});r.action('MOND_MATERIAL_CHALLENGE',{boss:id});}
};
function runs(profile,enter,seeds=[717,9031,4242]){return seeds.map(seed=>{const r=party(profile);r.s.global.PRNG_STATE=seed;enter(r);return fight(r,{manual:profile.manual});});}
const wins=list=>list.filter(x=>x.victory);
const avgHp=list=>{const w=wins(list);return w.length?Math.round(w.reduce((a,x)=>a+x.hp,0)/w.length):0;};

check('타르탈리아 (Liyue act 3, Lv.50): a fixed Lv.50 boss; a Lv.50 party wins after a long fight with real damage',()=>{
 const r=party({level:50,team:'four',enh:6});ENTER.story('EG_BOSS_TARTAGLIA')(r);const b=boss(r,'BOSS_TARTAGLIA');
 assert(b.maxHp>=7000&&b.atk>=500,'the numbers of a Lv.12 boss: '+b.maxHp+'/'+b.atk);
 const out=runs({level:50,team:'four',enh:6},ENTER.story('EG_BOSS_TARTAGLIA'));
 assert.equal(wins(out).length,3,JSON.stringify(out));assert(out.every(x=>x.rounds>=5),'no quick win: '+JSON.stringify(out));assert(avgHp(out)<=60,'the party takes real damage: '+avgHp(out));
 return {stats:{hp:b.maxHp,atk:b.atk,def:b.def},fights:out};
});
check('타르탈리아 of the 이세계 route (Lv.50 subdue fight): no longer falls in one round',()=>{
 const out=runs({level:50,team:'mond',enh:3},ENTER.story('EG_ISK_L03_GOLDEN'));
 assert.equal(wins(out).length,3,JSON.stringify(out));assert(out.every(x=>x.rounds>=4),'a real fight: '+JSON.stringify(out));assert(avgHp(out)<=85);
 return out;
});
check('야타용왕 (Lv.60): a Lv.60 party wins most fights and has to work for it',()=>{
 const out=runs({level:60,team:'four',enh:8},ENTER.story('EG_BOSS_AZHDAHA'));
 assert(wins(out).length>=2,JSON.stringify(out));assert(avgHp(out)<=50,'not a stroll: '+avgHp(out));
 return out;
});
check('repeat challenges: level gates remain; prepared 4★ C6 and 5★ C0 parties win through public protagonist skills',()=>{
 const low=party({level:44,team:'four',enh:9});low.s.flags.FLAG_TRV_LY_TARTAGLIA_WON=true;Object.assign(low.s.global,{CURRENT_MAP_ID:'MAP_LIYUE_GOLDEN_HOUSE',SCREEN_MODE:'LOCATION'});
 assert.match(low.actionReason('LIYUE_ARTIFACT_CHALLENGE',{kind:'TARTAGLIA'}),/권장 Lv\. 50.*Lv\. 45/);
 const lowA=party({level:54,team:'four',enh:9});lowA.s.flags[lowA.row('35_BOSS_ROUTE_DB','BRT_AZHDAHA')[13]]=true;Object.assign(lowA.s.global,{CURRENT_MAP_ID:'MAP_AZHDAHA_DOMAIN',SCREEN_MODE:'LOCATION'});
 assert.match(lowA.actionReason('LIYUE_ARTIFACT_CHALLENGE',{kind:'AZHDAHA'}),/권장 Lv\. 60.*Lv\. 55/);
 const uninvested={level:50,team:'four',enh:12,ex:true,art:[60,5]},strong={...uninvested,cons:6,manual:true},best={level:50,team:'five',enh:12,ex:true,art:[60,5],manual:true};
 const r=party(strong);ENTER.farm('TARTAGLIA')(r);const t=boss(r,'BOSS_TARTAGLIA');assert.equal(t.level,50);assert(t.maxHp>=11000,'an endgame fight: '+t.maxHp);
 const four=runs(strong,ENTER.farm('TARTAGLIA')),five=runs(best,ENTER.farm('TARTAGLIA'));
 assert.equal(wins(four).length,3,JSON.stringify(four));assert.equal(wins(five).length,3,JSON.stringify(five));
 assert([...four,...five].every(x=>x.inputs.some(id=>/^PLAYER_ISEKAI_[EQ]$/.test(id))),'wins use public exposure/joint strikes');
 assert([...four,...five].every(x=>x.rounds>=2&&x.hp<100),'a prepared daily challenge still costs combat time and HP');
 const automatic=runs(uninvested,ENTER.farm('TARTAGLIA'));
 assert.equal(wins(automatic).length,0,'the old uninvested basic-only automatic fixture must not imply a guaranteed current clear: '+JSON.stringify(automatic));
 const a=party({...best,level:60});ENTER.farm('AZHDAHA')(a);assert.equal(boss(a,'BOSS_AZHDAHA').level,60);
 const az=runs({...best,level:60},ENTER.farm('AZHDAHA'));assert.equal(wins(az).length,3,JSON.stringify(az));
 return {tartaglia:{fourC6:four,fiveC0:five,uninvestedAutomatic:automatic,stats:{hp:t.maxHp,atk:t.atk,def:t.def}},azhdaha:az};
});
check('daily rematches: recommended-level public counterplay wins; Dvalin uses an invested 4★ C6 party and the wind route',()=>{
 const an=runs({level:25,team:'four',enh:8,manual:true},ENTER.rematch('BOSS_ANDRIUS')),dv=runs({level:28,team:'four',enh:10,ex:true,art:[60,5],cons:6,manual:true},ENTER.rematch('BOSS_DVALIN'));
 assert(wins(an).length>=2,JSON.stringify(an));assert(wins(dv).length>=2,JSON.stringify(dv));
 assert(dv.every(x=>x.inputs.includes('SYS_MOND_WIND_ROUTE')),'Dvalin counterplay actually uses the public wind route');
 const inadequate=runs({level:28,team:'mond',enh:9,art:[10,3],manual:true},ENTER.rematch('BOSS_DVALIN'));
 assert.equal(wins(inadequate).length,0,'the former uninvested starting party cannot simply outlast current Dvalin: '+JSON.stringify(inadequate));
 assert.deepEqual([api.bossRematch.BOSS_ANDRIUS.level,api.bossRematch.BOSS_DVALIN.level],[25,28]);
 return {andrius:an,dvalin:dv,inadequateDvalin:inadequate};
});
check('stat outliers: the hatchlings and the husk archers are brought into line; saved fights keep their numbers',()=>{
 const B=JSON.parse(JSON.stringify(api.balanceV0152.base));assert.deepEqual(B.MON_GEOVISHAP_HATCHLING,[.55,1,1]);assert.deepEqual(B.MON_HUSK_BOW,[1.7,1,1]);
 const r=party({level:14,team:'four',enh:7});r.s.global.CURRENT_MAP_ID='MAP_LIYUE_MOUNTAINS';r.startBattle('EG_LIYUE_VISHAP','RANDOM');
 // 0.16.6: a fixed Lv42 normal enemy for four characters uses the current enemy-level HP anchors.
 const h=r.s.runtime.actors.find(a=>a.source==='MON_GEOVISHAP_HATCHLING');assert.equal(h.level,42);assert(h.maxHp>=8500&&h.maxHp<12000,'four-party hatchling health '+h.maxHp);assert.equal(r.s.runtime.balanceV0152.kind,'BASE');
 const saved=JSON.parse(r.serialize());saved.runtime.balanceV0152={version:1,kind:'FARM',boss:'BOSS_TARTAGLIA',level:3};
 assert.throws(()=>new api.Runtime(r.db,saved,true),/전투 밸런스 기록/);
 return {hatchling:h.maxHp};
});
const out=path.join(root,'reports/workflow-v01626/v0152');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'balance-tests.json'),JSON.stringify({version:'0.16.26',scope:'Historical story and level-gate contracts plus current daily-boss prepared public counterplay; diagnostic ownership/investment, not natural acquisition or every composition.',total:results.length,passed:results.filter(r=>r.ok).length,results},null,1));
console.log(JSON.stringify({total:results.length,passed:results.filter(r=>r.ok).length}));
