/* 0.14.11 기원 (wishes). Two banners, paid with fates (runtime_premium_v0148.js sells them for 원석 160 each):
 * - 캐릭터 이벤트 기원 (뒤얽힌 인연): one featured 5★ and three featured 4★ companions that change every week (Korean
 *   time, Monday 00:00). A 5★ is the featured one half the time; after a miss the next 5★ is. The same holds for the
 *   three featured 4★.
 * - 세상 유람 (만남의 인연): the standard 5★ (진, 다이루크, 모나, 치치, 각청) and every 4★ companion and weapon.
 * Rates follow the original: 5★ 0.6% rising from the 74th wish, certain by the 90th; 4★ or better 5.1%, certain within
 * every ten. On top of that, every 10-wish holds at least one companion. Companions come as their 운명의 별 (the
 * companion still joins through their own story; the 별 waits until then) plus 스타라이트 (4★ 2, 5★ 10; 5 and 25 once
 * all six 운명의 자리 are covered). 4★ weapons come with 스타라이트 2, 3★ weapons with 스타더스트 15; weapons go to the bag,
 * except a 3★ weapon the bag already holds three of, which comes as its 스타더스트 15 alone (0.15.1: it was 30, and with
 * the stardust shop capped that piled up with nothing to spend it on).
 * The draw mixes in the server's action time, so a result can't be worked out in advance from the save.
 * The pools are this game's companions and weapons; rarities are the original ones. Load after runtime_premium_v0148.js. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P?.premiumV0148||P.wishV01411)return;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const weekOf=api.premiumV0148.weekOf,KST=9*3600000,DAY=86400000,WEEK=7*DAY;
const STANDARD5=['MOND_JEAN','MOND_DILUC','MOND_MONA','LIYUE_QIQI','LIYUE_KEQING'];
// 자백 is met only through events (runtime_recruitment.js), so she is not in the weekly rotation for now.
const LIMITED5=['MOND_VENTI','LIYUE_ZHONGLI','MOND_KLEE','LIYUE_XIAO','MOND_ALBEDO','LIYUE_GANYU','MOND_EULA','LIYUE_HUTAO','LIYUE_TARTAGLIA','LIYUE_SHENHE','LIYUE_YELAN','LIYUE_BAIZHU','LIYUE_XIANYUN'];
const FOUR=['MOND_AMBER','MOND_BARBARA','MOND_BENNETT','MOND_DAHLIA','MOND_DIONA','MOND_FISCHL','MOND_KAEYA','MOND_LISA','MOND_MIKA','MOND_NOELLE','MOND_RAZOR','MOND_ROSARIA','MOND_SUCROSE','LIYUE_BEIDOU','LIYUE_CHONGYUN','LIYUE_GAMING','LIYUE_LANYAN','LIYUE_NINGGUANG','LIYUE_XIANGLING','LIYUE_XINGQIU','LIYUE_XINYAN','LIYUE_YANFEI','LIYUE_YAOYAO','LIYUE_YUNJIN'];
const WEAPON4=['EQ_SWORD_FAVONIUS','EQ_CLAYMORE_FAVONIUS','EQ_POLEARM_FAVONIUS','EQ_BOW_FAVONIUS','EQ_CATALYST_FAVONIUS','EQ_SWORD_SACRIFICIAL','EQ_CLAYMORE_SACRIFICIAL','EQ_BOW_SACRIFICIAL','EQ_CATALYST_SACRIFICIAL','EQ_POLEARM_DRAGONBANE','EQ_BOW_RUST','EQ_BOW_STRINGLESS','EQ_CATALYST_WIDSITH'];
const WEAPON3=['EQ_SWORD_COOL_STEEL','EQ_SWORD_HARBINGER','EQ_SWORD_TRAVELER','EQ_CLAYMORE_DEBATE','EQ_CLAYMORE_SKYRIDER','EQ_POLEARM_BLACK_TASSEL','EQ_BOW_SLINGSHOT','EQ_BOW_SHARPSHOOTER','EQ_CATALYST_MAGIC_GUIDE','EQ_CATALYST_TTDS'];
const BANNERS={EVENT:{id:'EVENT',name:'캐릭터 이벤트 기원',fate:'INTERTWINED_FATE',fateName:'뒤얽힌 인연'},STANDARD:{id:'STANDARD',name:'세상 유람',fate:'ACQUAINT_FATE',fateName:'만남의 인연'}};
// Rates in 1/10000: 5★ 60 (0.6%), +600 a wish from the 74th, certain at 90; 4★ 510 (5.1%), 5610 at the 9th, certain at 10.
const RATE={five:60,fiveSoft:73,fiveStep:600,fiveHard:90,four:510,fourSoft:8,fourStep:5100,fourHard:10};
const GLITTER={4:[2,5],5:[10,25]},DUST3=15,COPIES3=3,HISTORY=60;
api.wishV01411={banners:copy(BANNERS),pools:{STANDARD5,LIMITED5,FOUR,WEAPON4,WEAPON3},rate:copy(RATE)};
const old=Object.fromEntries(['apply','actionReason','validateSave'].map(k=>[k,P[k]]));
const int=x=>Math.max(0,Math.floor(Number(x)||0));
P.wishFeatured=function(week=this.premiumWeek()){const w=((week%LIMITED5.length)+LIMITED5.length)%LIMITED5.length;return {five:LIMITED5[w],four:[0,1,2].map(i=>FOUR[((week*3+i)%FOUR.length+FOUR.length)%FOUR.length]),week};};
P.wishState=function(){const w=this.s.wish||{};return {EVENT:{pity5:0,pity4:0,guarantee5:false,guarantee4:false,total:0,...(w.EVENT||{})},STANDARD:{pity5:0,pity4:0,total:0,...(w.STANDARD||{})},history:w.history||[],seq:int(w.seq)};};
P.wishView=function(){
 const now=this.premiumNow(),week=this.premiumWeek(),state=this.wishState(),next=(week+1)*WEEK-KST-3*DAY;
 return {week,featured:this.wishFeatured(week),nextFeatured:this.wishFeatured(week+1),endsAt:next,hoursLeft:Math.max(0,Math.ceil((next-now)/3600000)),
  banners:copy(BANNERS),standard5:STANDARD5.slice(),state:copy(state),balance:this.premiumBalance()};
};
P.wishReason=function(a={}){
 const banner=BANNERS[a.banner];if(!banner)return '기원을 골라 주세요.';
 if(this.s.runtime)return '전투 중에는 기원할 수 없습니다.';
 if(![1,10].includes(a.count))return '1회 또는 10회만 기원할 수 있습니다.';
 if(int(this.s.global[banner.fate])<a.count)return banner.fateName+'이(가) 부족합니다. (원석 160개로 1개 교환)';
 return '';
};
// A draw stream for one wish action: the save's generator advanced once, mixed with the server's action time.
function stream(seedText){let h=2166136261>>>0;for(let i=0;i<seedText.length;i++){h^=seedText.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}let x=h||0x9e3779b9;return ()=>{x^=x<<13;x^=x>>>17;x^=x<<5;x>>>=0;return x/4294967296;};}
P.wishRoll=function(bannerId,count){
 const g=this.s.global,state=this.wishState(),s=state[bannerId],featured=this.wishFeatured(),results=[];
 const rand=stream(String(Math.floor(this.random()*4294967296))+':'+this.premiumNow()+':'+(g.SAVE_ID||'')+':'+(g.LAST_COMMITTED_ACTION_SEQ||0)+':'+bannerId+':'+s.total);
 const pick=list=>list[Math.min(list.length-1,Math.floor(rand()*list.length))];
 for(let i=0;i<count;i++){
  const p5=s.pity5+1,p4=s.pity4+1;
  const r5=p5>=RATE.fiveHard?10000:p5>RATE.fiveSoft?RATE.five+RATE.fiveStep*(p5-RATE.fiveSoft):RATE.five;
  const r4=p4>=RATE.fourHard?10000:p4>RATE.fourSoft?RATE.four+RATE.fourStep*(p4-RATE.fourSoft):RATE.four;
  const roll=rand()*10000;let res;
  if(roll<r5){
   s.pity5=0;s.pity4=0;
   if(bannerId==='EVENT'){const win=s.guarantee5||rand()<.5;res={kind:'char',rarity:5,id:win?featured.five:pick(STANDARD5),featured:win};s.guarantee5=!win;}
   else res={kind:'char',rarity:5,id:pick(STANDARD5),featured:false};
  }else if(roll<Math.min(10000,r5+r4)){
   s.pity5=p5;s.pity4=0;
   if(bannerId==='EVENT'){const win=s.guarantee4||rand()<.5;if(win)res={kind:'char',rarity:4,id:pick(featured.four),featured:true};else res=rand()<.5?{kind:'char',rarity:4,id:pick(FOUR),featured:false}:{kind:'weapon',rarity:4,id:pick(WEAPON4),featured:false};s.guarantee4=!win;}
   else res=rand()<.5?{kind:'char',rarity:4,id:pick(FOUR),featured:false}:{kind:'weapon',rarity:4,id:pick(WEAPON4),featured:false};
  }else{s.pity5=p5;s.pity4=p4;res={kind:'weapon',rarity:3,id:pick(WEAPON3),featured:false};}
  s.total++;results.push(res);
 }
 // Every 10-wish holds at least one companion: the last 4★ weapon in it becomes a 4★ companion.
 if(count>=10&&!results.some(r=>r.kind==='char')){
  const k=results.map(r=>r.kind==='weapon'&&r.rarity===4).lastIndexOf(true);
  if(k>=0){if(bannerId==='EVENT'){results[k]={kind:'char',rarity:4,id:pick(featured.four),featured:true,promised:true};s.guarantee4=false;}else results[k]={kind:'char',rarity:4,id:pick(FOUR),featured:false,promised:true};}
 }
 return {state,results};
};
P.wishGrant=function(r){
 const g=this.s.global;
 if(r.kind==='char'){
  const stella='STELLA_'+r.id,full=this.constellationLevel(r.id)+this.itemCount(stella)>=6,[n,maxed]=GLITTER[r.rarity];
  if(full){g.STARGLITTER=int(g.STARGLITTER)+maxed;return {...r,stella:false,glitter:maxed};}
  this.giveItem(stella,1);g.STARGLITTER=int(g.STARGLITTER)+n;return {...r,stella:true,glitter:n};
 }
 if(r.rarity===4){const slot=this.giveEquipment(r.id);g.STARGLITTER=int(g.STARGLITTER)+2;return {...r,slot,glitter:2};}
 // A 3★ weapon the bag already holds three of comes as its 스타더스트 alone, so the bag never fills with copies.
 if(this.s.inventory.filter(i=>i.equip===r.id).length>=COPIES3){g.STARDUST=int(g.STARDUST)+DUST3;return {...r,converted:true,dust:DUST3};}
 const slot=this.giveEquipment(r.id);g.STARDUST=int(g.STARDUST)+DUST3;return {...r,slot,dust:DUST3};
};
P.actionReason=function(type,a={}){const base=old.actionReason.call(this,type,a);if(base)return base;if(type==='WISH')return this.wishReason(a);return '';};
P.apply=function(a){
 if(a?.type==='OPERATOR_DEBUG'&&a.op==='premium'){
  if(this.serverAdmin!==true)fail('OPERATOR','운영자 권한이 필요합니다.');
  const key=a.currency,value=a.value;if(!['PRIMOGEM','STARGLITTER','STARDUST','INTERTWINED_FATE','ACQUAINT_FATE'].includes(key))fail('OPERATOR','지급할 재화를 골라 주세요.');
  if(!Number.isInteger(value)||value<0||value>1000000)fail('OPERATOR','수치 범위를 확인해 주세요.');
  this.s.operatorModified=true;this.s.global[key]=int(this.s.global[key])+value;return {operator:true,op:'premium',currency:key,value,ranked:false};
 }
 if(a?.type!=='WISH')return old.apply.call(this,a);
 const why=this.wishReason(a);if(why)fail('WISH',why);
 const banner=BANNERS[a.banner],g=this.s.global;g[banner.fate]=int(g[banner.fate])-a.count;
 const {state,results}=this.wishRoll(a.banner,a.count),at=this.premiumNow(),granted=results.map(r=>this.wishGrant(r));
 let seq=state.seq;const entries=granted.map(r=>({seq:++seq,at,banner:a.banner,kind:r.kind,rarity:r.rarity,id:r.id,featured:!!r.featured,stella:!!r.stella,glitter:int(r.glitter),dust:int(r.dust),converted:!!r.converted}));
 this.s.wish={EVENT:state.EVENT,STANDARD:state.STANDARD,seq,history:state.history.concat(entries).slice(-HISTORY)};
 return {banner:a.banner,count:a.count,results:granted,seq,pity:{five:state[a.banner].pity5,four:state[a.banner].pity4}};
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,w=out.wish;if(w===undefined||w===null)return out;
 const bad=()=>fail('WISH_SAVE','기원 기록이 올바르지 않습니다.'),n=x=>Number.isInteger(x)&&x>=0;
 if(typeof w!=='object')bad();
 for(const id of ['EVENT','STANDARD']){const b=w[id];if(b===undefined)continue;if(!b||typeof b!=='object'||!n(b.pity5)||b.pity5>=RATE.fiveHard||!n(b.pity4)||b.pity4>=RATE.fourHard||!n(b.total))bad();if(id==='EVENT'&&(typeof b.guarantee5!=='boolean'||typeof b.guarantee4!=='boolean'))bad();}
 if(w.seq!==undefined&&!n(w.seq))bad();
 if(w.history!==undefined&&(!Array.isArray(w.history)||w.history.length>HISTORY||w.history.some(h=>!h||!n(h.seq)||!BANNERS[h.banner]||!['char','weapon'].includes(h.kind)||![3,4,5].includes(h.rarity)||typeof h.id!=='string')))bad();
 return out;
};
P.wishV01411=true;
})(typeof window!=='undefined'?window:globalThis);
