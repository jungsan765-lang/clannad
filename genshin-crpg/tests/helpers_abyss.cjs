// Synthetic QA setup uses native stat formulas and actual equipment. No boosted combat stats.
const {fresh,R,db,c}=require('./helpers_v011.cjs'),{equip,artifacts}=require('./helpers_abyss_artifacts.cjs');
function fixture(level=15,team=['MOND_DILUC','MOND_NOELLE','MOND_JEAN'],enh=6,route='ROUTE_ISEKAI'){const r=fresh('MAP_V141_MUSK_REEF',route);r.serverAdmin=true;r.action('OPERATOR_DEBUG',{op:'level',value:level});for(const [i,id]of team.entries()){r.adminApply({op:'recruit',char:id});r.action('PARTY',{char:id,slot:i+2});}for(const id of ['PLAYER_CUSTOM',...team]){
 for(const cat of ['WEAPON','ARMOR','ACCESSORY']){const types={WEAPON:r.equipmentProficiencies(id),ARMOR:['방어구'],ACCESSORY:['장신구']}[cat];const rows=r.rows('16_EQUIP_DB').filter(x=>types.includes(x[2])&&(!String(x[30]||'').match(/^(MOND_|LIYUE_)/)||x[30]===id)&&Number(x[19]||1)<=level&&!/장착 불가/.test(String(x[3])+' '+String(x[30])));let best=null,bestScore=-1;for(const x of rows){const score=Number(x[4]||0)+Number(x[5]||0)+Number(x[6]||0)*.15;if(score>bestScore){best=x;bestScore=score;}} if(best){const slot=r.giveEquipment(best[0]),inv=r.s.inventory.find(i=>i.slot===slot);inv.enhance=enh;if(enh>10)inv.enhancementCap=12;try{r.action('EQUIP',{slot,owner:id});}catch{}}}
 }
 for(const id of ['PLAYER_CUSTOM',...team]){const cap=r.growth(id).talentCap;r.s.talents??={};r.s.talents[id]={na:cap,e:cap,q:cap};}r.action('OPERATOR_DEBUG',{op:'heal'});return r;}
/* Reference parties for Spiral Abyss v2. Floors 1-3: Lv.10-15 with +7 gear. From floor 4 the party needs
   levels, enhancement and artifacts; floors 8+ need the room's specific approach (gear swaps between rooms). */
const HEAL=['FOOD_SWEET_MADAME','FOOD_HASH_BROWN','FOOD_MATSUTAKE_ROLL','FOOD_SNEZ_ZHARKOYE'];
const SETUPS={
 1:{lv:15,enh:7,team:['MOND_AMBER','MOND_KLEE','MOND_ALBEDO'],formation:'LINE_AHEAD',roles:['공격우선','공격우선','균형']},
 2:{lv:20,enh:7,team:['MOND_FISCHL','LIYUE_XINGQIU','MOND_DIONA'],formation:'DOUBLE_LINE',roles:['균형','연계우선','지원우선']},
 3:{lv:25,enh:7,team:['LIYUE_XIANGLING','MOND_NOELLE','MOND_LISA'],formation:'DOUBLE_LINE',roles:['연계우선','균형','연계우선']},
 4:{ex:1,lv:30,enh:9,art:1,team:['LIYUE_GAMING','LIYUE_YUNJIN','MOND_ROSARIA'],formation:'LINE_AHEAD',roles:['공격우선','균형','공격우선'],food:{2:{ALL:'FOOD_JADE_PARCELS'}}},
 5:{ex:1,lv:35,enh:9,art:1,team:['MOND_VENTI','LIYUE_CHONGYUN','LIYUE_YAOYAO'],formation:'DOUBLE_LINE',roles:['연계우선','균형','지원우선'],gear:{ALL:['EQ_LY_ACC_STARGAZER',6]}},
 6:{ex:1,lv:40,enh:10,art:1,team:['MOND_EULA','LIYUE_XIAO','LIYUE_BAIZHU'],formation:'DIAMOND',roles:['균형','공격우선','지원우선'],food:{3:{ALL:'FOOD_ADEPTUS_TEMPTATION'}}},
 7:{ex:1,lv:45,enh:10,art:1,team:['LIYUE_YANFEI','MOND_MIKA','LIYUE_BEIDOU'],formation:'DOUBLE_LINE',roles:['연계우선','균형','공격우선'],food:{2:{PLAYER_CUSTOM:'FOOD_ALMOND_TOFU'}}},
 8:{ex:1,lv:50,enh:10,art:1,team:['MOND_RAZOR','LIYUE_TARTAGLIA','LIYUE_XIANYUN'],formation:'DOUBLE_LINE',roles:['연계우선','연계우선','균형'],gear:{ALL:['EQ_LY_SPECIAL_LEYLINE_STAKE',10]},swapBack:3,food:{3:{ALL:'FOOD_PILE_EM_UP'}}},
 9:{ex:1,lv:55,enh:10,art:1,team:['MOND_DAHLIA','LIYUE_XINYAN','LIYUE_LANYAN'],formation:'DOUBLE_LINE',roles:['지원우선','균형','지원우선'],gear:{ALL:['EQ_ACC_STEADFAST',9]},swapAcc:{2:['EQ_LY_ACC_STARGAZER',0],3:['EQ_ACC_STEADFAST',9]},hitArtifacts:2,swapBack:3},
 10:{ex:1,lv:60,enh:12,art:1,team:['MOND_MONA','LIYUE_KEQING','MOND_SUCROSE'],formation:'DOUBLE_LINE',roles:['연계우선','공격우선','연계우선'],gear:{ALL:['EQ_LY_ACC_STARGAZER',10]},food:{3:{ALL:'FOOD_ADEPTUS_TEMPTATION'}}},
 11:{ex:1,lv:60,enh:12,art:1,team:['LIYUE_HUTAO','LIYUE_GANYU','LIYUE_NINGGUANG'],formation:'LINE_AHEAD',roles:['공격우선','공격우선','균형'],gear:{ALL:['EQ_LY_ACC_QINGXIN_SACHET',10]}},
 12:{lv:60,enh:12,art:1,mastery:1,team:['MOND_DILUC','MOND_JEAN','LIYUE_ZHONGLI'],formation:'DOUBLE_LINE',roles:['연계우선','공격우선','지원우선']}
};
// The artifact with the most accuracy out of many natural rolls, enhanced to +5 (for fog rooms).
function hitArtifact(r,id){let best=null,score=-1;for(let n=0;n<900;n++){const d=r.rollArtifact(),i=r.artifactInstance(d.slot);i.artifact.level=5;const h=r.artifactStats(i).HIT||0;if(h>score){if(best)r.s.inventory=r.s.inventory.filter(x=>x!==best);best=i;score=h;}else r.s.inventory=r.s.inventory.filter(x=>x!==i);}r.action('EQUIP',{slot:best.slot,owner:id});return score;}
const hpOf=(r,id)=>id==='PLAYER_CUSTOM'?[r.s.global.PLAYER_HP_CURRENT,r.s.global.PLAYER_HP_MAX]:[r.s.chars[id].hp,r.character(id).maxHp];
/* Eat heal dishes (never the same one twice in a row) until 75% HP, then the room's buff dish. */
function eat(r,extra={}){
 for(const id of r.abyssParty()){
  for(let n=0;n<6;n++){const [hp,max]=hpOf(r,id);if(hp<=0||hp>=max*.75)break;const last=id==='PLAYER_CUSTOM'?r.s.global.LAST_RECOVERY_MEAL_ITEM_ID:r.s.chars[id].lastRecoveryMeal,dish=HEAL.find(x=>x!==last);if(!r.itemCount(dish))r.giveItem(dish,3);r.action('USE_ITEM',{item:dish,owner:id});}
  const buff=extra[id]||extra.ALL;if(buff&&hpOf(r,id)[0]>0){if(!r.itemCount(buff))r.giveItem(buff,3);r.action('USE_ITEM',{item:buff,owner:id});}
 }
}
function buildSetup(f,o={}){
 const s={...SETUPS[f],...o},r=fixture(s.lv,s.team,s.enh),ids=r.abyssParty();
 if(s.art)artifacts(r,ids);
 const arts=Object.fromEntries(ids.map(id=>[id,r.s.inventory.find(i=>i.equipped&&i.owner===id&&i.artifact)?.slot]).filter(x=>x[1]));
 // v0.14.4: from floor 4 the companions hold their exclusive weapons (the late-game reference).
 if(s.ex&&!s.mastery)for(const id of ids.slice(1))equip(r,id,'EQ_EX_'+id,s.enh);
 if(s.mastery){equip(r,'PLAYER_CUSTOM','EQ_CLAYMORE_ARCHAIC');for(const id of ids.slice(1))equip(r,id,'EQ_EX_'+id);}
 for(const [who,[g,enh]] of Object.entries(s.gear||{}))for(const id of who==='ALL'?ids:[who])equip(r,id,g,enh);
 if(s.formation)r.action('FORMATION_SET',{formation:s.formation});
 (s.roles||[]).forEach((t,i)=>{if(t&&ids[i+1])r.action('PARTY_TACTIC',{slot:i+2,tactic:t});});
 const kept={};
 const breakHook=(ch,r)=>{
  if(s.swapBack===ch)for(const [id,slot] of Object.entries(arts))r.action('EQUIP',{slot,owner:id});
  if(s.hitArtifacts===ch)for(const id of r.abyssParty())hitArtifact(r,id);
  const want=s.swapAcc?.[ch];if(want)for(const id of r.abyssParty()){const key=id+':'+want[0];let slot=kept[key];if(!slot){slot=r.giveEquipment(want[0]);const i=r.s.inventory.find(x=>x.slot===slot);i.enhance=want[1];i.enhancementCap=12;kept[key]=slot;}r.action('EQUIP',{slot,owner:id});}
 };
 r.action('OPERATOR_DEBUG',{op:'heal'});return {r,s,breakHook};
}
/* The protagonist uses basic attacks on a reachable, currently open target; companions act on their own. */
function bot(r){
 const b=r.s.runtime,room=c.CRPGRuntime.abyssConfig.floors[b.abyss.floor-1].rooms[b.abyss.chamber-1];
 let foes=b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0);if(room.alternate&&foes.length>1)foes=foes.filter(x=>x.abyssIndex===(b.round%2?0:1));
 const order=[...foes.filter(x=>x.abyssHealer),...foes.filter(x=>!x.abyssHealer).sort((x,y)=>x.hp-y.hp)],me=b.actors.find(x=>x.source==='PLAYER_CUSTOM');
 if(me&&me.hp<me.maxHp*.3){r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});return;}
 if(r.combatCards().some(x=>x.id==='PLAYER_BASIC_ATTACK'&&!x.reason))for(const e of order){try{r.action('COMBAT',{card:'PLAYER_BASIC_ATTACK',target:e.id});return;}catch(err){if(!/대상|닿지/.test(err.message))throw err;}}
 r.action('COMBAT',{card:'PLAYER_BASIC_GUARD'});
}
function fight(r){r.action('COMBAT_BEGIN');for(let n=0;r.s.runtime&&n<300;n++)bot(r);return JSON.parse(r.s.global.LAST_BATTLE_RESULT_JSON||'{}');}
function runFloor(r,f,{food={},breakHook}={}){
 const rooms=[];
 for(let ch=1;ch<=3;ch++){
  breakHook?.(ch,r);eat(r,food[ch]||{});
  r.action('ABYSS_ENTER',{floor:f});const res=fight(r);rooms.push({chamber:ch,outcome:res.abyss?.outcome,rounds:res.rounds,xp:res.xp,party:r.abyssParty().map(id=>[id,...hpOf(r,id)])});
  if(res.abyss?.outcome!=='NEXT')break;
 }
 return {cleared:rooms.at(-1)?.outcome==='CLEARED',rooms};
}
function run(r,f){const s=SETUPS[f]||{};return runFloor(r,f,{food:s.food||{}});}
module.exports={fixture,run,runFloor,buildSetup,SETUPS,eat,bot,fight,hpOf};
