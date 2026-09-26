/* Party/equipment candidate. Load after runtime_flow.js; no content definitions are mutated. */
(function(root){
  'use strict';
  const api=root.CRPGRuntime;if(!api)throw Error('CRPGRuntime must be loaded first');
  const P=api.Runtime.prototype;
  if(P.partyModuleVersion)return;
  const old=Object.fromEntries(['apply','character','battlePreparation','confirmBattlePreparation','useItem','meal','removeParty','storyEvent','finishBattle','startBattle','validateSave'].map(k=>[k,P[k]]));
  const copy=x=>JSON.parse(JSON.stringify(x));
  const parse=(s,d={})=>{try{return JSON.parse(s)||d;}catch{return d;}};
  const fail=(code,message)=>{throw new api.RuleError(code,message);};
  const weapons=['한손검','양손검','장병기','활','법구'];
  const eligible=s=>['JOINED'].includes(s?.state);
  const categories={방어구:'ARMOR',장신구:'ACCESSORY',특수:'SPECIAL'};
  function category(row){return weapons.includes(row[2])?'WEAPON':categories[row[2]]||null;}
  function ownerKnown(r,id){return id==='PLAYER_CUSTOM'||!!(r.s.chars[id]&&r.tables['07_CHAR_DB']?.has(id));}
  function actor(r,id){return id==='PLAYER_CUSTOM'?r.player():r.character(id);}
  function stats(r,id){const a=actor(r,id),out={id,name:a.name};for(const k of ['level','hp','maxHp','atk','def','spd','crit','critDmg','hit','eva','resist','range'])out[k]=a[k];return out;}
  function hpOf(r,id){return id==='PLAYER_CUSTOM'?r.s.global.PLAYER_HP_CURRENT:r.s.chars[id].hp;}
  function snapshots(r,owners){return Object.fromEntries([...new Set(owners)].filter(id=>ownerKnown(r,id)).map(id=>[id,hpOf(r,id)]));}
  function recalculate(r,before){
    // Player globals are a derived cache and must also change when an item leaves the player.
    r.recalculate();
    for(const [id,hp]of Object.entries(before)){
      const next=Math.min(hp,actor(r,id).maxHp);
      if(id==='PLAYER_CUSTOM')r.s.global.PLAYER_HP_CURRENT=next;else r.s.chars[id].hp=next;
    }
  }
  P.ownedActors=function(){
    const ownership=parse(this.s.global.COMPANION_ELIGIBILITY_JSON),ids=['PLAYER_CUSTOM',...Object.keys(ownership).filter(id=>eligible(ownership[id])&&ownerKnown(this,id))];
    return ids.map(id=>{const p=this.s.party.find(p=>p.active&&p.source===id);return {id,name:id==='PLAYER_CUSTOM'?this.s.global.PLAYER_NAME:this.row('07_CHAR_DB',id)[1],state:id==='PLAYER_CUSTOM'?'PLAYER':ownership[id].state,active:!!p,slot:p?Number(p.slot.split('_').pop()):null,level:id==='PLAYER_CUSTOM'?this.s.global.PLAYER_LEVEL_STATE:this.s.chars[id].level};});
  };
  // Ownership is for roster selection; equipment and consumables require current membership.
  P.activePartyActors=function(){return this.ownedActors().filter(a=>a.active);};
  P.partyTargetReason=function(owner){return this.activePartyActors().some(a=>a.id===owner)?'':'현재 활성 파티에 편성한 캐릭터를 선택해 주세요.';};
  P.releaseInactiveEquipment=function(){
    const active=new Set(this.activePartyActors().map(a=>a.id));
    const items=this.s.inventory.filter(i=>i.equip&&i.owner&&i.owner!=='공용'&&!active.has(i.owner));
    if(!items.length)return {slots:[],owners:[]};
    const owners=[...new Set(items.map(i=>i.owner))],before=snapshots(this,['PLAYER_CUSTOM',...owners]);
    for(const i of items){i.equipped=false;i.owner='공용';}
    recalculate(this,before);
    return {slots:items.map(i=>i.slot),owners};
  };
  // Fixed Mond weapon classes: source provenance in content/weapon-proficiencies.json.
  P.equipmentProficiencies=function(owner){
    if(owner==='PLAYER_CUSTOM')return this.s.global.STORY_ROUTE_ID==='ROUTE_ISEKAI'?weapons.slice():['한손검'];
    const explicit={"MOND_ALBEDO":["한손검"],"MOND_BARBARA":["법구"],"MOND_BENNETT":["한손검"],"MOND_VENTI":["활"],"MOND_DIONA":["활"],"MOND_DAHLIA":["한손검"],"MOND_DILUC":["양손검"],"MOND_AMBER":["활"],"MOND_JEAN":["한손검"],"MOND_KAEYA":["한손검"],"MOND_KLEE":["법구"],"MOND_MIKA":["장병기"],"MOND_MONA":["법구"],"MOND_NOELLE":["양손검"],"MOND_FISCHL":["활"],"MOND_LISA":["법구"],"MOND_RAZOR":["양손검"],"MOND_ROSARIA":["장병기"],"MOND_SUCROSE":["법구"],"MOND_EULA":["양손검"]};
    return explicit[owner]||[...new Set(this.rows('08_SKILL_CARD_DB').filter(c=>c[2]===owner).flatMap(c=>weapons.filter(type=>String(c[5]).includes(type))))];
  };
  P.equipmentDefinition=function(slot,owner){
    if(this.s.runtime)fail('COMBAT','전투 중 장비를 바꿀 수 없습니다.');
    const inv=this.s.inventory.find(i=>i.slot===slot&&i.equip);if(!inv)fail('EQUIP','소지 장비를 선택해 주세요.');
    if(this.partyTargetReason(owner))fail('OWNER',this.partyTargetReason(owner));
    const row=this.row('16_EQUIP_DB',inv.equip),kind=category(row);
    if(!kind||/장착 불가/.test(String(row[3])+' '+String(row[30])))fail('EQUIP_CATEGORY','이 물건은 장착할 수 없습니다.');
    const level=owner==='PLAYER_CUSTOM'?this.s.global.PLAYER_LEVEL_STATE:this.s.chars[owner].level;
    if(level<Number(row[19]||1))fail('LEVEL','장비 요구 레벨이 부족합니다.');
    if(kind==='WEAPON'&&!this.equipmentProficiencies(owner).includes(row[2]))fail('PROFICIENCY','이 무기를 사용하는 장착 대상이 아닙니다.');
    return {inv,row,category:kind};
  };
  P.character=function(id){
    const a=old.character.call(this,id),e=this.equipmentStats(id),row=this.row('07_CHAR_DB',id),prof=2+Math.floor((a.level-1)/4);
    // These five equipment modifiers were absent from the legacy character calculation.
    a.crit=Number(row[16])+e.CRIT;a.critDmg=Number(row[17])+e.CRIT_DMG;
    a.hit=Math.min(95,75+prof*2)+e.HIT;
    a.eva=Math.max(3,5+Math.round((a.spd-60)/10))+e.EVA;
    a.resist=5+prof*2+e.STATUS_RESIST;
    return a;
  };
  P.equip=function(slot,owner='PLAYER_CUSTOM'){
    const def=this.equipmentDefinition(slot,owner),inv=def.inv;
    const displacedOwner=inv.equipped&&inv.owner!==owner?inv.owner:null;
    const before=snapshots(this,['PLAYER_CUSTOM',owner,...(inv.equipped?[inv.owner]:[])]);
    const removed=[];
    for(const i of this.s.inventory)if(i!==inv&&i.equipped&&i.owner===owner&&category(this.row('16_EQUIP_DB',i.equip))===def.category){removed.push(i.slot);i.equipped=false;i.owner='공용';}
    Object.assign(inv,{equipped:true,owner,category:def.category});recalculate(this,before);
    return {slot,owner,category:def.category,displacedOwner,displacedSlots:removed};
  };
  P.unequip=function(slot,owner){
    if(this.s.runtime)fail('COMBAT','전투 중 장비를 바꿀 수 없습니다.');
    const inv=this.s.inventory.find(i=>i.slot===slot&&i.equip);
    if(!inv||!inv.equipped)fail('EQUIP_EMPTY','해제할 장착 장비를 선택해 주세요.');
    if(owner&&owner!==inv.owner)fail('OWNER','현재 장착 대상이 달라졌습니다. 다시 선택해 주세요.');
    const previousOwner=inv.owner,before=snapshots(this,['PLAYER_CUSTOM',previousOwner]);
    inv.equipped=false;inv.owner='공용';recalculate(this,before);
    return {slot,owner:previousOwner,category:category(this.row('16_EQUIP_DB',inv.equip))};
  };
  P.equipmentPreview=function(slot,owner='PLAYER_CUSTOM'){
    const result={before:null,after:null,reason:'',displacedOwner:null,displacedSlot:null,category:null};
    try{
      if(this.partyTargetReason(owner))fail('OWNER',this.partyTargetReason(owner));
      result.before=stats(this,owner);
      const candidate=new api.Runtime(this.db,copy(this.s)),def=candidate.equipmentDefinition(slot,owner);
      result.category=def.category;result.displacedOwner=def.inv.equipped&&def.inv.owner!==owner?def.inv.owner:null;
      result.displacedSlot=candidate.s.inventory.find(i=>i.slot!==slot&&i.equipped&&i.owner===owner&&category(candidate.row('16_EQUIP_DB',i.equip))===def.category)?.slot||null;
      candidate.equip(slot,owner);result.after=stats(candidate,owner);
      result.reason=this.actionReason?.('EQUIP',{slot,owner})||'';
    }catch(e){result.reason=e.message||'장비를 비교할 수 없습니다.';result.code=e.code||'PREVIEW';}
    return result;
  };
  P.swapParty=function(from,to){
    if(this.s.runtime)fail('COMBAT','전투 중 편성을 바꿀 수 없습니다.');
    if(!Number.isInteger(from)||!Number.isInteger(to)||from<2||from>4||to<2||to>4)fail('SLOT','동료는 2~4번 슬롯을 사용합니다.');
    if(from===to)fail('SLOT','서로 다른 동료 슬롯을 선택해 주세요.');
    const a=this.s.party[from-1],b=this.s.party[to-1];
    if(!a?.active||a.type!=='CHAR'||b?.active&&b.type!=='CHAR')fail('PARTY_EMPTY','이동할 동료와 대상 슬롯을 확인해 주세요.');
    this.s.party[from-1]={...b,slot:'PARTY_'+from};this.s.party[to-1]={...a,slot:'PARTY_'+to};
    return {from,to,moved:a.source,swapped:b?.active?b.source:null};
  };
  P.selectBattlePreparation=function(group,companions){
    const pending=this.s.battlePreparation;
    if(this.s.runtime||!pending||pending.group!==group||this.playPhase?.()!=='PREPARATION'||pending.node&&pending.node!==this.storyNode()?.[4])fail('PREPARATION','현재 전투 준비와 선택한 전투가 일치하지 않습니다.');
    const cfg=this.combatStoryConfig?.(group),max=Math.min(3,Math.max(0,Number(cfg?.party_max||4)-1));
    if(!Array.isArray(companions)||companions.length>max||new Set(companions).size!==companions.length)fail('PARTY','동료는 중복 없이 최대 '+max+'명까지 선택해 주세요.');
    const allowed=new Set(this.ownedActors().filter(a=>a.id!=='PLAYER_CUSTOM').map(a=>a.id));
    
    for(const id of companions)if(typeof id!=='string'||!allowed.has(id)||!ownerKnown(this,id))fail('OWNER','이번 전투에 참가할 수 없는 인물입니다.');
    pending.selectedCompanions=companions.slice();
    return {group,companions:companions.slice()};
  };
  P.battlePreparation=function(group){const view=old.battlePreparation.call(this,group);return view?{...view,...(Array.isArray(this.s.battlePreparation?.selectedCompanions)?{selectedCompanions:this.s.battlePreparation.selectedCompanions.slice()}: {})}:view;};
  P.confirmBattlePreparation=function(group,companions){
    if(companions===undefined)companions=this.s.battlePreparation?.selectedCompanions?.slice()||[];
    return old.confirmBattlePreparation.call(this,group,companions);
  };
  P.useItem=function(id,n=1,owner='PLAYER_CUSTOM'){
    // Combat medicines already validate their runtime ally/guest target in combatAction.
    if(!this.s.runtime&&this.partyTargetReason(owner))fail('OWNER',this.partyTargetReason(owner));
    return old.useItem.call(this,id,n,owner);
  };
  P.meal=function(meals){
    if(Array.isArray(meals))for(const entry of meals){const owner=entry?.owner||'PLAYER_CUSTOM';if(this.partyTargetReason(owner))fail('OWNER',this.partyTargetReason(owner));}
    return old.meal.call(this,meals);
  };
  P.removeParty=function(slot){const result=old.removeParty.call(this,slot);result.returnedEquipment=this.releaseInactiveEquipment().slots;return result;};
  P.storyEvent=function(id){const result=old.storyEvent.call(this,id);this.releaseInactiveEquipment();return result;};
  P.finishBattle=function(victory){const result=old.finishBattle.call(this,victory);this.releaseInactiveEquipment();return result;};
  P.startBattle=function(...args){
    // General preparation may replace the permanent roster immediately before this call.
    // Return departed members' equipment before the retry checkpoint and battle snapshot.
    this.releaseInactiveEquipment();return old.startBattle.apply(this,args);
  };
  P.validateSave=function(s){
    old.validateSave.call(this,s);
    // Constructor validation runs before this.s exists. Normalize the validated clone only.
    // Old saves keep every instance, enhancement, progression value and battle snapshot.
    const facade=Object.create(this);facade.s=s;facade.releaseInactiveEquipment();
    return s;
  };
  P.apply=function(a){
    let result;
    if(a.type==='UNEQUIP')result=this.unequip(a.slot,a.owner);
    else if(a.type==='PARTY_SWAP')result=this.swapParty(a.from,a.to);
    else if(a.type==='PREP_SELECT')result=this.selectBattlePreparation(a.group,a.companions);
    else if(a.type==='COMBAT_PREPARE')result=this.confirmBattlePreparation(a.group,a.companions??a.guests??this.s.battlePreparation?.selectedCompanions);
    else if(a.type==='PARTY_REPLACE'&&Number.isInteger(a.slot)&&a.slot>=2&&a.slot<=4&&this.s.party[a.slot-1]?.active&&this.s.party[a.slot-1].source===a.char){
      if(this.s.runtime)fail('COMBAT','전투 중 편성을 바꿀 수 없습니다.');
      result={char:a.char,slot:a.slot,unchanged:true};
    }else result=old.apply.call(this,a);
    // Covers restored story frames/checkpoints and future authored departure actions.
    this.releaseInactiveEquipment();return result;
  };
  P.partyModuleVersion=2;api.partyModuleVersion=2;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
