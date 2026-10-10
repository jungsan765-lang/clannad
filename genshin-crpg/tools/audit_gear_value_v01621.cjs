'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {loadEnvironment,setup,cloneRuntime}=require('./audit_food_lodging_v01617.cjs');
const ROOT=path.resolve(__dirname,'..'),copy=x=>JSON.parse(JSON.stringify(x));
function audit({sourceRoot=ROOT,out=null}={}){
 const e=loadEnvironment(sourceRoot),r=setup(e,{levels:60}),owners=['PLAYER_CUSTOM',...r.rows('07_CHAR_DB').map(x=>x[0]).filter(id=>r.s.chars[id])];
 r.s.global.COMPANION_ELIGIBILITY_JSON=JSON.stringify(Object.fromEntries(owners.slice(1).map(id=>[id,{state:'JOINED'}])));
 for(const id of owners.slice(1)){r.s.chars[id].level=60;r.s.ascensions[id]=e.G.phaseFor(60);r.s.chars[id].hp=r.character(id).maxHp;}
 r.s.inventory=[];r.recalculate();r.s.global.PLAYER_HP_CURRENT=r.player().maxHp;
 const rows=[],issues=[],checks=[];
 for(const raw of r.rows('16_EQUIP_DB')){
  const t=cloneRuntime(r),slot=t.giveEquipment(raw[0]),candidates=raw[0].startsWith('EQ_EX_')?[raw[0].slice(6)]:owners;
  let owner=null,reason=null;for(const id of candidates){if(!owners.includes(id))continue;const p=t.equipmentPreview(slot,id);if(!p.reason){owner=id;break;}reason=p.reason;}
  if(!owner){rows.push({id:raw[0],name:raw[1],kind:raw[2],supported:false,reason});continue;}
  const before=t.equipmentContribution(owner),hp=owner==='PLAYER_CUSTOM'?t.player().hp:t.character(owner).hp,receipt=t.action('EQUIP',{slot,owner}).result,after=t.equipmentContribution(owner),inv=t.s.inventory.find(x=>x.slot===slot),variants=[];
  assert((owner==='PLAYER_CUSTOM'?t.player().hp:t.character(owner).hp)<=hp,'Equipping never restores HP');
  const supported=t.isMondEnhanceable(raw[0])&&t.enhancementHasGain(inv);
  for(const enhance of supported?[0,3,6,10,12]:[0]){inv.enhance=enhance;if(enhance>10)inv.enhancementCap=12;t.recalculate();const stats=owner==='PLAYER_CUSTOM'?t.player():t.character(owner),traits=t.actorTraits(owner),quote=t.enhancementQuote(slot);for(const key of ['atk','def','maxHp','spd','crit','critDmg','hit','eva','resist'])if(!Number.isFinite(stats[key])||stats[key]<0)issues.push({id:raw[0],enhance,key,value:stats[key]});variants.push({enhance,stats:Object.fromEntries(['atk','def','maxHp','spd','crit','critDmg','hit','eva','resist'].map(k=>[k,stats[k]])),traits:copy(traits),nextQuote:copy(quote)});}
  rows.push({id:raw[0],name:raw[1],kind:raw[2],rarity:raw[13],minimumLevel:Number(raw[19]),owner,supported:true,before:copy(before),after:copy(after),nativeEquip:copy(receipt),variants});
 }
 assert.equal(issues.length,0);checks.push({name:'All supported catalog equipment: native equip and legal+0/+3/+6/+10/+12 stat previews remain finite/nonnegative',pass:true});
 const progression=[];for(const level of [5,10,20,30,40,50,60]){
  const template=setup(e,{levels:level});template.s.inventory=[];template.recalculate();
  for(const equipment of ['EQ_SWORD_COOL_STEEL','EQ_SWORD_RANCOUR','EQ_SWORD_FAVONIUS','EQ_LY_SWORD_PROTO','EQ_FB_ARMOR_JADE_BULWARK','EQ_ACC_HEALER_BROOCH']){
   if(!template.tables['16_EQUIP_DB'].has(equipment))continue;const t=cloneRuntime(template),slot=t.giveEquipment(equipment),p=t.equipmentPreview(slot,'PLAYER_CUSTOM');if(p.reason){progression.push({level,equipment,blocked:p.reason});continue;}
   t.action('EQUIP',{slot,owner:'PLAYER_CUSTOM'});const inv=t.s.inventory.find(x=>x.slot===slot);for(const enhancement of [0,6,10,12]){inv.enhance=enhancement;if(enhancement>10)inv.enhancementCap=12;t.recalculate();const stats=t.equipmentContribution('PLAYER_CUSTOM');progression.push({level,equipment,enhancement,stats:copy(stats),ratios:{atkGain:stats.bonus.atk/stats.base.atk,hpGain:stats.bonus.maxHp/stats.base.maxHp,defGain:stats.bonus.def/stats.base.def},traits:copy(t.actorTraits('PLAYER_CUSTOM'))});}
  }
 }
 const report={schema:1,version:'0.16.21',provenance:e.provenance,assumptions:['Declared synthetic all-character ownership/levels60 and empty gear, used only to find a legal owner for every catalog row. Every supported row executes native EQUIP.','Enhancement levels are explicit owned-gear fixtures to inspect native values; no successful random-upgrade or natural acquisition claim.','Low-level progression uses the actual minimum-level/proficiency checks. Fixed flat stats naturally lose relative value with leveling; owner traits, counters, shields and skill support require their separate native combat tests.','Artifact rows without a rolled artifact instance are only their zero base row; actual random artifact value is covered separately.'],checks,rows,progression,issues,counts:{catalogRows:rows.length,nativeEquipActions:rows.filter(x=>x.supported).length,unsupported:rows.filter(x=>!x.supported).length,previewVariants:rows.reduce((n,x)=>n+(x.variants?.length||0),0),progressionRows:progression.length,issues:issues.length}};
 if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}return report;
}
if(require.main===module){const a=process.argv.slice(2),v=k=>a.includes(k)?a[a.indexOf(k)+1]:null;const r=audit({sourceRoot:v('--source-root')||ROOT,out:v('--out')||path.join(ROOT,'docs/data/full_balance_v01621/economy/gear_before.json')});console.log(JSON.stringify(r.counts));}
module.exports={audit};
