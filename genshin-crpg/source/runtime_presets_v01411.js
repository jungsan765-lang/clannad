/* v0.14.11 편성·장비 프리셋: up to six saved loadouts, so the party can be switched to suit the enemy ahead.
 * A preset keeps who is in the party, their order in the battle line, their roles, the party's 진형 and every member's
 * equipment (the exact pieces, by their instance). PRESET_SAVE stores the current party into a slot (optionally named);
 * PRESET_APPLY rebuilds it with the ordinary party and equip steps, so every rule of those steps still holds, and a
 * member who is no longer with the party or a piece of gear that is gone is skipped and reported, never invented;
 * PRESET_DELETE clears a slot. Presets may be used wherever the party may change, battle preparation included. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.formationOrder||!P.ownedActors||P.presetsV01411)return;
const SLOTS=6,NAME_MAX=16,PLAYER='PLAYER_CUSTOM',TYPES=new Set(['PRESET_SAVE','PRESET_APPLY','PRESET_DELETE']);
const fail=(code,message)=>{throw new api.RuleError(code,message);};
const copy=x=>JSON.parse(JSON.stringify(x));
const clean=name=>String(name??'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,NAME_MAX);
const old={actionReason:P.actionReason,apply:P.apply,validateSave:P.validateSave};
P.presetList=function(){const out=[];for(let i=1;i<=SLOTS;i++){const p=this.s.presets?.[i];out.push(p?{slot:i,...copy(p)}:{slot:i,empty:true});}return out;};
P.presetSnapshot=function(){
 const order=this.formationOrder(),tactics={},gear={};
 for(const m of this.s.party.filter(p=>p.active&&p.source!==PLAYER))tactics[m.source]=m.tactic||null;
 for(const id of order)gear[id]=this.s.inventory.filter(i=>i.equip&&i.equipped&&i.owner===id).map(i=>({slot:i.slot,equip:i.equip}));
 return {members:order.slice(),tactics,formation:this.s.partyFormation||null,gear};
};
P.presetReason=function(type,a={}){
 const n=Number(a.slot);if(!Number.isInteger(n)||n<1||n>SLOTS)return '프리셋 칸(1~'+SLOTS+')을 골라 주세요.';
 if(this.s.runtime)return '전투 중에는 편성을 바꿀 수 없습니다.';
 // The same gate as moving party members around (story scenes, defeat recovery and so on).
 const base=old.actionReason.call(this,'PARTY_SWAP',{});if(base)return base;
 if(type==='PRESET_SAVE')return a.name!==undefined&&!clean(a.name)?'프리셋 이름을 적어 주세요.':'';
 if(!this.s.presets?.[n])return '이 칸에는 저장된 프리셋이 없습니다.';
 return '';
};
P.actionReason=function(type,a={}){if(TYPES.has(type))return this.presetReason(type,a);return old.actionReason.call(this,type,a);};
function freeSlot(r){for(let n=2;n<=4;n++)if(!r.s.party.some(p=>p.slot==='PARTY_'+n&&p.active))return n;return null;}
function slotOf(r,id){const m=r.s.party.find(p=>p.active&&p.source===id);return m?Number(String(m.slot).replace('PARTY_','')):null;}
P.applyPreset=function(n){
 const p=this.s.presets[n],skipped=[],owned=new Set(this.ownedActors().map(x=>x.id)),name=id=>this.tables['07_CHAR_DB']?.get(id)?.[1]||id;
 const step=(a,label)=>{const why=this.actionReason(a.type,a);if(why){skipped.push(label+' · '+why);return false;}this.apply(a);return true;};
 const want=p.members.filter(id=>id===PLAYER||owned.has(id));
 for(const id of p.members)if(!want.includes(id))skipped.push(name(id)+' · 함께하지 않는 동료입니다.');
 // Members: leave first, then join.
 for(const m of this.s.party.filter(x=>x.active&&x.source!==PLAYER))if(!want.includes(m.source))step({type:'PARTY_REMOVE',slot:slotOf(this,m.source)},name(m.source)+' 빼기');
 for(const id of want){if(id===PLAYER||slotOf(this,id))continue;const n2=freeSlot(this);if(!n2){skipped.push(name(id)+' · 빈 칸이 없습니다.');continue;}step({type:'PARTY',char:id,slot:n2},name(id)+' 넣기');}
 // Roles, the 진형 and the battle line.
 const tactics=new Set(this.partyTactics?.()||[]);
 for(const [id,tactic]of Object.entries(p.tactics||{})){const n2=slotOf(this,id),m=this.s.party.find(x=>x.active&&x.source===id);if(!n2||!tactic||!tactics.has(tactic)||m?.tactic===tactic)continue;step({type:'PARTY_TACTIC',slot:n2,tactic},name(id)+' 역할');}
 if(p.formation&&p.formation!==this.s.partyFormation)step({type:'FORMATION_SET',formation:p.formation},'진형');
 const now=this.formationOrder(),order=p.members.filter(id=>now.includes(id));for(const id of now)if(!order.includes(id))order.push(id);
 if(order.join()!==now.join())step({type:'FORMATION_SET',order},'전투 대열');
 // Equipment: put on each saved piece, then take off what the preset did not have.
 for(const id of this.formationOrder()){
  const saved=(p.gear?.[id]||[]),keep=new Set();
  for(const g of saved){const inv=this.s.inventory.find(i=>i.slot===g.slot&&i.equip===g.equip);
   if(!inv){skipped.push(name(id)+' · '+(this.tables['16_EQUIP_DB']?.get(g.equip)?.[1]||g.equip)+' · 가방에 없습니다.');continue;}
   keep.add(inv.slot);if(inv.equipped&&inv.owner===id)continue;
   step({type:'EQUIP',slot:inv.slot,owner:id},name(id)+' · '+(this.tables['16_EQUIP_DB']?.get(inv.equip)?.[1]||inv.equip));}
  for(const inv of this.s.inventory.filter(i=>i.equip&&i.equipped&&i.owner===id&&!keep.has(i.slot)))step({type:'UNEQUIP',slot:inv.slot,owner:id},name(id)+' 장비 해제');
 }
 return {preset:n,name:p.name,applied:true,skipped};
};
P.apply=function(a){
 if(a.type==='PRESET_SAVE'){const n=Number(a.slot),prev=this.s.presets?.[n];(this.s.presets??={})[n]={name:clean(a.name)||prev?.name||'프리셋 '+n,...this.presetSnapshot(),day:Math.max(1,Number(this.s.global.WORLD_DAY)||1)};return {preset:n,saved:true,name:this.s.presets[n].name};}
 if(a.type==='PRESET_DELETE'){const n=Number(a.slot);delete this.s.presets[n];if(!Object.keys(this.s.presets).length)delete this.s.presets;return {preset:n,deleted:true};}
 if(a.type==='PRESET_APPLY')return this.applyPreset(Number(a.slot));
 return old.apply.call(this,a);
};
P.validateSave=function(s){
 old.validateSave.call(this,s);const ps=s.presets;if(ps===undefined)return s;
 const bad=()=>fail('PRESET_SAVE','저장된 편성 프리셋을 확인할 수 없습니다.');
 if(!ps||typeof ps!=='object'||Array.isArray(ps))bad();
 for(const [k,p]of Object.entries(ps)){
  const n=Number(k);if(!Number.isInteger(n)||n<1||n>SLOTS||!p||typeof p!=='object')bad();
  if(typeof p.name!=='string'||!p.name||p.name.length>NAME_MAX||!Number.isInteger(p.day)||p.day<1)bad();
  if(!Array.isArray(p.members)||!p.members.length||p.members.length>4||new Set(p.members).size!==p.members.length||!p.members.includes(PLAYER)||p.members.some(id=>typeof id!=='string'))bad();
  if(p.formation!==null&&typeof p.formation!=='string')bad();
  if(!p.tactics||typeof p.tactics!=='object'||Array.isArray(p.tactics)||Object.keys(p.tactics).some(id=>!p.members.includes(id)))bad();
  if(!p.gear||typeof p.gear!=='object'||Array.isArray(p.gear))bad();
  for(const [id,list]of Object.entries(p.gear)){if(!p.members.includes(id)||!Array.isArray(list)||list.length>8)bad();for(const g of list)if(!g||typeof g.slot!=='string'||typeof g.equip!=='string')bad();}
 }
 return s;
};
P.presetsV01411=true;api.presetsV01411={slots:SLOTS,nameMax:NAME_MAX};
})(typeof window!=='undefined'?window:globalThis);
