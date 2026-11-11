/* 0.15.1 우편 (user: 「우편을 만들어서, 재화 지급은 우편으로 들어오게 하고, 회수나 값을 바꾸게 되면 운영자가 바꿨다고
 * 알리는 우편이 날아가게」).
 *  - What the operator console gives (재화·아이템·장비 지급, 전체 지급) arrives as one gift mail per change; the player
 *    opens it and presses 「받기」.
 *  - Every other change the console makes (회수, 값 정하기, 레벨, 운명의 자리, 이동, 되돌리기 …) is applied at once and
 *    a notice mail says what the operator changed.
 * Mail lives in the save (s.mail). Only the server's operator path writes it (adminApply → adminMailFlush, mailAdd);
 * a player can only claim, mark as read and throw away what is read. Letters between adventurers live on the account
 * server instead (server/letters-v0151.mjs). */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.mailV0151)return;P.mailV0151=true;
const fail=m=>{throw new api.RuleError('MAIL',m);};
const old=Object.fromEntries(['adminApply','adminSummary','apply','actionReason','validateSave'].map(k=>[k,P[k]]));
const CUR=api.adminV01412?.currencies||{MORA:'모라',PRIMOGEM:'원석',STARGLITTER:'스타라이트',STARDUST:'스타더스트',INTERTWINED_FATE:'뒤얽힌 인연',ACQUAINT_FATE:'만남의 인연'};
const KEEP=100,fmt=n=>Number(n||0).toLocaleString('ko-KR');
const whole=(x,min,max,what)=>{if(!Number.isInteger(x)||x<min||x>max)throw new api.RuleError('ADMIN',what+'은(는) '+fmt(min)+'~'+fmt(max)+' 사이의 정수여야 합니다.');return x;};
api.mailRules={keep:KEEP,currencies:{...CUR}};
P.mailState=function(){return this.s.mail??={version:1,seq:0,list:[]};};
// Server side only: put a mail in this journey's box. The oldest read mails go when the box is full; a gift not yet
// taken is never dropped.
P.mailAdd=function({kind,title,body,gifts=null}){
 const box=this.mailState();box.seq+=1;
 const mail={id:'M'+box.seq,kind:kind==='GIFT'?'GIFT':'NOTICE',title:String(title||'').slice(0,60),body:String(body||'').slice(0,2000),from:'운영자',at:Number(this.actionStartedAt??Date.now()),gifts:kind==='GIFT'?gifts:null,claimed:false,read:false};
 box.list.push(mail);
 while(box.list.length>KEEP){const i=box.list.findIndex(x=>x.read&&(x.kind!=='GIFT'||x.claimed));if(i<0)break;box.list.splice(i,1);}
 return mail;
};
P.mailView=function(){
 const box=this.s.mail||{list:[]};
 return {list:[...box.list].reverse().map(x=>({...x,gifts:x.gifts?JSON.parse(JSON.stringify(x.gifts)):null})),unread:box.list.filter(x=>!x.read).length,unclaimed:box.list.filter(x=>x.kind==='GIFT'&&!x.claimed).length};
};
P.mailUnread=function(){return (this.s.mail?.list||[]).filter(x=>!x.read||(x.kind==='GIFT'&&!x.claimed)).length;};
// What a gift holds, in words (for the console and the mail itself).
P.mailGiftLines=function(g){
 const lines=[];for(const [k,n] of Object.entries(g?.currency||{}))lines.push((CUR[k]||k)+' '+fmt(n));
 for(const [id,n] of Object.entries(g?.items||{}))lines.push((this.tables['14_ITEM_DB']?.get(id)?.[1]||id)+' '+fmt(n)+'개');
 for(const e of g?.equipment||[])lines.push((this.tables['16_EQUIP_DB']?.get(e.id)?.[1]||e.id)+(e.enhance?' +'+e.enhance:'')+' '+e.count+'개');
 return lines;
};
// The operator console: grants are gathered into one gift mail, every other change into one notice mail
// (adminMailFlush, called by the server after all the changes of one request).
P.adminApply=function(op={}){
 const draft=this.adminMailDraft??={gifts:{currency:{},items:{},equipment:[]},notes:[]},g=draft.gifts;
 if(op.op==='currency'&&op.mode!=='set'&&Number(op.value)>0){
  if(!CUR[op.key])throw new api.RuleError('ADMIN','재화를 골라 주세요.');const n=whole(op.value,1,1e9,'수량');
  g.currency[op.key]=(g.currency[op.key]||0)+n;return CUR[op.key]+' '+fmt(n)+' · 우편으로 보냄';
 }
 if(op.op==='item'&&Number(op.count)>0){
  const row=this.tables['14_ITEM_DB']?.get(op.id);if(!row||String(op.id).startsWith('CUR_'))throw new api.RuleError('ADMIN','아이템을 찾을 수 없습니다.');
  const n=whole(op.count,1,99999,'수량');g.items[op.id]=(g.items[op.id]||0)+n;return row[1]+' '+fmt(n)+'개 · 우편으로 보냄';
 }
 if(op.op==='equipment_give'){
  const row=this.tables['16_EQUIP_DB']?.get(op.id);if(!row)throw new api.RuleError('ADMIN','장비를 찾을 수 없습니다.');
  const n=whole(op.count??1,1,20,'개수'),lv=whole(op.enhance??0,0,12,'강화');g.equipment.push({id:op.id,enhance:lv,count:n});
  return row[1]+(lv?' +'+lv:'')+' '+n+'개 · 우편으로 보냄';
 }
 const line=old.adminApply.call(this,op);draft.notes.push(line);return line;
};
// The console shows the gifts still waiting in the box.
P.adminSummary=function(){
 const out=old.adminSummary.call(this),list=this.s.mail?.list||[],waiting=list.filter(x=>x.kind==='GIFT'&&!x.claimed);
 out.mail={total:list.length,unclaimed:waiting.length,gifts:waiting.map(x=>({id:x.id,title:x.title,at:x.at,lines:this.mailGiftLines(x.gifts)}))};
 return out;
};
P.adminMailFlush=function({title,body}={}){
 const draft=this.adminMailDraft;delete this.adminMailDraft;if(!draft)return [];
 const out=[],g=draft.gifts,given=Object.keys(g.currency).length||Object.keys(g.items).length||g.equipment.length;
 if(given)out.push(this.mailAdd({kind:'GIFT',title:title||'운영자의 선물',body:body||'운영자가 보낸 선물입니다. 「받기」를 누르면 재화와 가방에 들어갑니다.',gifts:{currency:g.currency,items:g.items,equipment:g.equipment}}).id);
 if(draft.notes.length)out.push(this.mailAdd({kind:'NOTICE',title:'운영자가 여정을 바꿨습니다',body:'운영자가 이 여정을 아래와 같이 바꿨습니다.\n'+draft.notes.map(x=>'· '+x).join('\n')}).id);
 return out;
};
// A player takes a gift (one, or every gift not yet taken).
P.mailClaim=function(id){
 const box=this.mailState(),list=id==='ALL'?box.list.filter(x=>x.kind==='GIFT'&&!x.claimed):box.list.filter(x=>x.id===id);
 if(!list.length)fail(id==='ALL'?'받을 선물이 없습니다.':'우편을 찾을 수 없습니다.');
 const got={currency:{},items:{},equipment:[]};
 for(const mail of list){
  if(mail.kind!=='GIFT')fail('받을 선물이 없는 우편입니다.');if(mail.claimed)fail('이미 받은 우편입니다.');
  const g=mail.gifts||{};
  for(const [k,n] of Object.entries(g.currency||{})){this.s.global[k]=(Number(this.s.global[k])||0)+n;got.currency[k]=(got.currency[k]||0)+n;}
  for(const [item,n] of Object.entries(g.items||{})){this.giveItem(item,n);got.items[item]=(got.items[item]||0)+n;}
  for(const e of g.equipment||[]){for(let i=0;i<e.count;i++){const slot=this.giveEquipment(e.id),inv=this.s.inventory.find(x=>x.slot===slot);if(inv){inv.enhance=e.enhance;if(e.enhance>10)inv.enhancementCap=12;}}got.equipment.push({id:e.id,enhance:e.enhance,count:e.count});}
  mail.claimed=true;mail.read=true;
 }
 return {claimed:list.map(x=>x.id),got,lines:this.mailGiftLines(got)};
};
P.mailRead=function(ids){
 const box=this.mailState(),want=new Set(Array.isArray(ids)?ids.slice(0,KEEP).map(String):[]);let n=0;
 for(const x of box.list)if(want.has(x.id)&&!x.read){x.read=true;n++;}
 return {read:n};
};
// 「읽은 우편 정리」: read notices and taken gifts can be thrown away; a gift not yet taken stays.
P.mailDelete=function(ids){
 const box=this.mailState(),want=new Set(Array.isArray(ids)?ids.slice(0,KEEP*2).map(String):[]);let deleted=0,kept=0;
 box.list=box.list.filter(x=>{if(!want.has(x.id))return true;if(x.kind==='GIFT'&&!x.claimed){kept++;return true;}deleted++;return false;});
 return {deleted,kept};
};
P.actionReason=function(type,a={}){
 if(type==='MAIL_CLAIM')return this.s.runtime?'전투가 끝난 뒤 우편을 받을 수 있습니다.':'';
 if(type==='MAIL_READ'||type==='MAIL_DELETE')return '';
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(a.type==='MAIL_CLAIM'){const why=this.actionReason('MAIL_CLAIM',a);if(why)fail(why);return this.mailClaim(String(a.mail||''));}
 if(a.type==='MAIL_READ')return this.mailRead(a.ids);
 if(a.type==='MAIL_DELETE')return this.mailDelete(a.ids);
 return old.apply.call(this,a);
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s),box=out.mail;
 if(box!==undefined){
  const bad=()=>fail('우편 기록이 손상되었습니다.');
  if(!box||box.version!==1||!Number.isInteger(box.seq)||box.seq<0||!Array.isArray(box.list)||box.list.length>KEEP*2)bad();
  const ids=new Set();
  for(const x of box.list){
   if(!x||typeof x.id!=='string'||!/^M\d+$/.test(x.id)||ids.has(x.id)||!['GIFT','NOTICE'].includes(x.kind)||typeof x.title!=='string'||typeof x.body!=='string'||x.title.length>60||x.body.length>2000)bad();
   if(!Number.isFinite(x.at)||typeof x.claimed!=='boolean'||typeof x.read!=='boolean')bad();ids.add(x.id);
   if(x.kind==='NOTICE'){if(x.gifts!==null||x.claimed)bad();continue;}
   const g=x.gifts;if(!g||typeof g!=='object')bad();
   for(const [k,n] of Object.entries(g.currency||{}))if(!CUR[k]||!Number.isInteger(n)||n<1||n>1e9)bad();
   for(const [id,n] of Object.entries(g.items||{}))if(!this.tables['14_ITEM_DB']?.has(id)||!Number.isInteger(n)||n<1||n>99999)bad();
   if(!Array.isArray(g.equipment||[]))bad();
   for(const e of g.equipment||[])if(!e||!this.tables['16_EQUIP_DB']?.has(e.id)||!Number.isInteger(e.enhance)||e.enhance<0||e.enhance>12||!Number.isInteger(e.count)||e.count<1||e.count>20)bad();
  }
 }
 return out;
};
})(globalThis);
