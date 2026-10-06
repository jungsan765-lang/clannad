/* v0.14.4 지맥의 꽃 (ley line blossoms): repeatable battles with five difficulty steps (regional enemy Lv.6-58).
 * Every real-time hour at :00 the blossoms move: each region (Mond, Liyue) gets one 계시의 꽃 (experience books)
 * and one 부의 꽃 (Mora) on maps the DB marks as ley line ground (32_MAP_DB "지맥 이벤트 허용" = Y). The player picks
 * a step the protagonist has reached; higher steps hit harder and pay more. Each kind pays out once per hour, whatever
 * the step; a defeat can be retried inside the same hour. Real time comes from the server's action clock
 * (actionStartedAt) and falls back to the device clock offline. Labels and numbers are CRPG rules.
 * Load after runtime_formations.js. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype;if(P.leyLineVersion)return;
const copy=x=>JSON.parse(JSON.stringify(x)),fail=(c,m)=>{throw new api.RuleError(c,m);};
const HOUR=3600000,FLAG='FLAG_CRPG_LEYLINE_CLEAR';
const KINDS={
 REVELATION:{name:'계시의 꽃',reward:'경험치 책'},
 WEALTH:{name:'부의 꽃',reward:'모라'}
};
// Difficulty steps: enemy level, the protagonist level that opens the step, and what each blossom pays.
const TIERS=[
 {tier:1,level:6,minLevel:5,books:{MAT_CHAR_EXP_ADVENTURER:2,MAT_CHAR_EXP_WANDERER:3}},
 {tier:2,level:10,minLevel:9,books:{MAT_CHAR_EXP_HERO:1,MAT_CHAR_EXP_ADVENTURER:2}},
 {tier:3,level:12,minLevel:11,books:{MAT_CHAR_EXP_HERO:1,MAT_CHAR_EXP_ADVENTURER:4}},
 {tier:4,level:16,minLevel:15,books:{MAT_CHAR_EXP_HERO:2,MAT_CHAR_EXP_ADVENTURER:2}},
 {tier:5,level:20,minLevel:18,books:{MAT_CHAR_EXP_HERO:3,MAT_CHAR_EXP_ADVENTURER:1}}
].map(t=>({...t,mora:600+100*t.level}));
const MIN_LEVEL=TIERS[0].minLevel;
// One elite with two regulars (or the local equivalent) per site, taken from each area's own encounters.
const SITES=[
 {map:'MAP_MOND_PLAINS',region:'몬드',members:[['MON_MITACHURL_WOOD',1],['MON_HILI_FIGHTER',1],['MON_HILI_SHOOTER',1]]},
 {map:'MAP_MOND_FOREST',region:'몬드',members:[['MON_HILI_GRENADIER',1],['MON_HILI_PYRO_SHOOTER',1],['MON_HILI_FIGHTER',2]]},
 {map:'MAP_MOND_WINDRISE',region:'몬드',members:[['MON_SLIME_LARGE_CRYO',1],['MON_SLIME_HYDRO',1],['MON_SLIME_ELECTRO',1]]},
 {map:'MAP_MOND_WOLVENDOM',region:'몬드',members:[['MON_MITACHURL_WOOD',1],['MON_HILI_CRYO_SHOOTER',1],['MON_HILI_FIGHTER',1]]},
 {map:'MAP_DRAGONSPINE',region:'몬드',members:[['MON_MITACHURL_ICE',1],['MON_HILI_CRYO_SHOOTER',1],['MON_HILI_FIGHTER',1]]},
 {map:'MAP_LIYUE_PLAINS',region:'리월',members:[['MON_TH_SCOUT',2],['MON_TH_MARKSMAN',1],['MON_TH_POTION_PYRO',1]]},
 {map:'MAP_LIYUE_MOUNTAINS',region:'리월',members:[['MON_MITACHURL_ROCK',1],['MON_HILI_FIGHTER',1],['MON_HILI_SHOOTER',1]]},
 {map:'MAP_LIYUE_JUEYUN',region:'리월',members:[['MON_MITACHURL_ROCK',1],['MON_GEOVISHAP_HATCHLING',2]]},
 {map:'MAP_CHASM_SURFACE',region:'리월',members:[['MON_RUIN_GUARD_VARIANT',1],['MON_TH_SCOUT',2]]},
 {map:'MAP_CHASM_DEEP',region:'리월',members:[['MON_HUSK_STANDARD',1],['MON_HUSK_BOW',1]]}
];
const REGIONS=['몬드','리월'];
// Enemies are built at the step's level; the blossom trades some of their HP for attack, and adds this much per
// level above 5 so that geared parties still have to pay attention.
const SCALE={hp:.7,atk:2.8},GROWTH={hp:.03,atk:.1,def:.03};
const BOOK_XP={MAT_CHAR_EXP_WANDERER:50,MAT_CHAR_EXP_ADVENTURER:250,MAT_CHAR_EXP_HERO:1000};
// Both regions use the same five level-selected difficulties, with the existing selection flow.
const LEVELS=[6,15,30,45,60],HERO_BOOKS=[6,18,50,100,180],DIRECT_XP=[20,50,90,220,400],WEALTH_MORA=[1800,5000,14000,27000,40000];
const tierOf=n=>{const base=TIERS.find(t=>t.tier===Number(n));if(!base)return null;const i=base.tier-1,level=LEVELS[i];return {...base,level,minLevel:Math.max(5,level-5),books:{MAT_CHAR_EXP_HERO:HERO_BOOKS[i]},mora:WEALTH_MORA[i],directXp:DIRECT_XP[i]};};
// Battles already saved by 0.16.0 retain the difficulty and blossom payout they entered with.
const legacyTierOf=(n,region)=>{const base=TIERS.find(t=>t.tier===Number(n));if(!base)return null;const level=(region==='리월'?[30,38,44,50,58]:[6,10,15,20,28])[base.tier-1];return {...base,level,minLevel:Math.max(5,level-5),books:{MAT_CHAR_EXP_HERO:Math.ceil(level/3)},mora:Math.round(600+level*80+level*level*2)};};
const regionalTiers=region=>TIERS.map(t=>tierOf(t.tier,region));
const route=(kind,map)=>'BRT_LEY_'+kind+'_'+map.replace(/^MAP_/,''),group=map=>'EG_LEY_'+map.replace(/^MAP_/,'');
const ROUTES=Object.fromEntries(SITES.flatMap(s=>Object.keys(KINDS).map(k=>[route(k,s.map),{kind:k,map:s.map,region:s.region}])));
const hash=s=>{let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h;};
// The same hour always gives the same places, on every device and on the server.
function sitesAt(hour){
 const out=[];
 for(const region of REGIONS){const list=SITES.filter(s=>s.region===region),a=hash('LEY|'+hour+'|'+region)%list.length,b=(a+1+hash('LEY|'+hour+'|'+region+'|W')%(list.length-1))%list.length;
  out.push({kind:'REVELATION',map:list[a].map,region},{kind:'WEALTH',map:list[b].map,region});}
 return out;
}
api.leyLines={version:2,hourMs:HOUR,minLevel:MIN_LEVEL,kinds:copy(KINDS),tiers:copy(regionalTiers('몬드')),regionalTiers,sites:copy(SITES),scale:copy(SCALE),growth:copy(GROWTH),bookXp:copy(BOOK_XP),route,sitesAt};

const old=Object.fromEntries(['installMarketContent','placeBossReason','placeEntries','actionReason','apply','startBattle','finishBattle','validateSave'].map(k=>[k,P[k]]));
P.installLeyLines=function(){
 if(this._leyLinesInstalled)return;
 const names=['33_ENCOUNTER_GROUP_DB','49_ENCOUNTER_MEMBER_DB','35_BOSS_ROUTE_DB','50_BOSS_ROUTE_STEP_DB'],rows=Object.fromEntries(names.map(n=>[n,this.db[n].map(r=>r.slice())]));
 const has=(n,id)=>rows[n].some(r=>r[0]===id);
 for(const s of SITES){
  if(!this.tables['32_MAP_DB'].has(s.map))continue;const mapName=this.row('32_MAP_DB',s.map)[2],g=group(s.map);
  if(!has('33_ENCOUNTER_GROUP_DB',g)){const r=Array(rows['33_ENCOUNTER_GROUP_DB'][0].length).fill('');Object.assign(r,{0:g,1:mapName+' · 지맥의 꽃',2:'LEYLINE',3:'지맥',4:TIERS[0].level,5:TIERS.at(-1).level,6:'PARTY_BANDED',22:'없음',23:'기존 몬스터 AI · 고른 단계의 레벨로 등장',24:1,25:'Y',26:'Y',27:'지맥의 꽃을 지키는 적. 고른 단계에 따라 강해진다.',28:'LEYLINE_V1'});
   s.members.slice(0,5).forEach(([id,n],i)=>{r[7+i*3]=id;r[8+i*3]=n;r[9+i*3]=n;});rows['33_ENCOUNTER_GROUP_DB'].push(r);}
  s.members.forEach(([id,n],i)=>{const mid='EM_'+g+'_'+(i+1);if(!has('49_ENCOUNTER_MEMBER_DB',mid))rows['49_ENCOUNTER_MEMBER_DB'].push([mid,g,i+1,id,n,n,'MON'+(i+1),'CRPG_LEYLINE_V1','지맥의 꽃 · 지역 기존 몬스터']);});
  for(const [k,d]of Object.entries(KINDS)){const id=route(k,s.map);
   if(!has('35_BOSS_ROUTE_DB',id))rows['35_BOSS_ROUTE_DB'].push([id,'지맥 · '+d.name,s.map,'DIRECT','','','',g,'Y','N','CURRENT_STEP','N','',FLAG,'Y','매시 정각에 자리를 옮기는 지맥의 꽃 · '+d.reward+' 보상은 한 시간에 한 번']);
   if(!has('50_BOSS_ROUTE_STEP_DB','BRS_'+id+'_1'))rows['50_BOSS_ROUTE_STEP_DB'].push(['BRS_'+id+'_1',id,1,'BOSS',g,'지맥']);}
 }
 this.db={...this.db,...rows};for(const n of names)this.tables[n]=new Map(rows[n].slice(1).filter(r=>r[0]).map(r=>[r[0],r]));
 this._placeCatalog=null;this._leyLinesInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installLeyLines();return out;};

P.leyLineNow=function(){return Number(this.actionStartedAt??Date.now());};
P.leyLineHour=function(now=this.leyLineNow()){return Math.floor(now/HOUR);};
P.leyLineClaimed=function(kind,hour=this.leyLineHour()){return this.s.leyLine?.[kind]===hour;};
P.leyLineTierReason=function(n,region=this.row('32_MAP_DB',this.s.global.CURRENT_MAP_ID)[1]){const t=tierOf(n,region);if(!t)return '지맥의 꽃 단계를 확인해 주세요.';return (Number(this.s.global.PLAYER_LEVEL_STATE)||1)<t.minLevel?t.tier+'단계는 주인공 Lv. '+t.minLevel+'부터 도전할 수 있습니다.':'';};
P.leyLineTopTier=function(region=this.row('32_MAP_DB',this.s.global.CURRENT_MAP_ID)[1]){return regionalTiers(region).filter(t=>!this.leyLineTierReason(t.tier,region)).at(-1)?.tier||1;};
P.leyLineStatus=function(now=this.leyLineNow()){
 const hour=this.leyLineHour(now),level=Number(this.s.global.PLAYER_LEVEL_STATE)||1,map=this.s.global.CURRENT_MAP_ID;
 const blossoms=sitesAt(hour).filter(x=>this.tables['32_MAP_DB'].has(x.map)).map(x=>({...x,route:route(x.kind,x.map),name:KINDS[x.kind].name,reward:KINDS[x.kind].reward,mapName:this.row('32_MAP_DB',x.map)[2],claimed:this.leyLineClaimed(x.kind,hour),here:x.map===map}));
 return {hour,endsAt:(hour+1)*HOUR,minutesLeft:Math.max(1,Math.ceil(((hour+1)*HOUR-now)/60000)),unlocked:level>=MIN_LEVEL,minLevel:MIN_LEVEL,topTier:this.leyLineTopTier(),blossoms};
};
P.leyLineRouteInfo=function(id){
 const r=ROUTES[id];if(!r)return null;const st=this.leyLineStatus(),top=this.leyLineTopTier(r.region);
 return {route:id,kind:r.kind,name:KINDS[r.kind].name,reward:KINDS[r.kind].reward,map:r.map,active:st.blossoms.some(b=>b.route===id),claimed:this.leyLineClaimed(r.kind),minutesLeft:st.minutesLeft,unlocked:st.unlocked,
  tiers:regionalTiers(r.region).map(t=>({tier:t.tier,level:t.level,minLevel:t.minLevel,books:r.kind==='REVELATION'?copy(t.books):null,mora:r.kind==='WEALTH'?t.mora:null,reason:this.leyLineTierReason(t.tier,r.region),recommended:t.tier===top}))};
};
P.placeBossReason=function(id,entry,options={}){
 const r=ROUTES[id];if(!r)return old.placeBossReason.call(this,id,entry,options);
 const base=old.placeBossReason.call(this,id,entry,options);if(base)return base;
 if((Number(this.s.global.PLAYER_LEVEL_STATE)||1)<MIN_LEVEL)return '지맥의 꽃은 주인공 Lv. '+MIN_LEVEL+'부터 도전할 수 있습니다.';
 const st=this.leyLineStatus();if(!st.blossoms.some(b=>b.route===id))return '지맥의 꽃이 다른 곳으로 옮겨 갔습니다. 매시 정각에 새 자리에 핍니다.';
 if(this.leyLineClaimed(r.kind))return '이번 시간의 '+KINDS[r.kind].name+' 보상은 이미 받았습니다. '+st.minutesLeft+'분 뒤 정각에 새 꽃이 핍니다.';
 return '';
};
// Only this hour's blossoms show up among the places of a map.
P.placeEntries=function(...args){const out=old.placeEntries.apply(this,args);const live=new Set(this.leyLineStatus().blossoms.map(b=>'BOSS:'+b.route));return out.filter(x=>!(x.kind==='BOSS'&&ROUTES[x.route])||live.has(x.id));};
P.actionReason=function(type,a={}){
 if(type==='BOSS_ROUTE'&&ROUTES[a.route]&&a.tier!==undefined){const why=this.leyLineTierReason(a.tier,ROUTES[a.route].region);if(why)return why;}
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(a.type!=='BOSS_ROUTE'||!ROUTES[a.route])return old.apply.call(this,a);
 const tier=a.tier===undefined?this.leyLineTopTier(ROUTES[a.route].region):Number(a.tier),why=this.leyLineTierReason(tier,ROUTES[a.route].region);if(why)fail('LEYLINE_TIER',why);
 // The chosen step is kept on the route progress, so a retry after a defeat fights the same step.
 this._leyTier=tier;try{const out=old.apply.call(this,a),p=this.s.bossRouteProgress;if(p&&p.route===a.route)p.leyTier=tier;return out;}finally{this._leyTier=null;}
};
// Rebuild an enemy made at one level (the engine's party band) at another, with the same level table the engine uses.
function relevel(rt,a,to){
 const from=Number(a.level)||to;if(from===to)return;const A=rt.row('26_LEVEL_RULES',from),B=rt.row('26_LEVEL_RULES',to),hp=Number(B[4])/Number(A[4]),ad=Number(B[5])/Number(A[5]);
 a.maxHp=Math.max(1,Math.round(a.maxHp*hp));a.hp=a.maxHp;a.atk=Math.round(a.atk*ad);a.def=Math.round(a.def*ad);a.spd=Number(a.spd||0)+Number(B[6]||0)-Number(A[6]||0);a.hit=Math.min(95,75+Number(B[3])*2);a.level=to;
 for(const s of a.shields||[])if(Number.isFinite(s.value))s.value=Math.round(s.value*hp);
}
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime;
 const id=String(origin).startsWith('BOSS:')?String(origin).slice(5):null,r=id&&ROUTES[id];
 if(!r||!b||b===before||b.leyLine)return out;
 const p=this.s.bossRouteProgress,t=tierOf(this._leyTier,r.region)||(p?.route===id&&tierOf(p.leyTier,r.region))||tierOf(this.leyLineTopTier(r.region),r.region),level=t.level,k=level-MIN_LEVEL,foes=b.actors.filter(a=>a.side==='ENEMY');
 for(const a of foes){relevel(this,a,level);a.maxHp=Math.max(1,Math.round(a.maxHp*SCALE.hp*(1+GROWTH.hp*k)));a.hp=a.maxHp;a.atk=Math.round(a.atk*SCALE.atk*(1+GROWTH.atk*k));a.def=Math.round(a.def*(1+GROWTH.def*k));
  for(const s of a.shields||[])if(Number.isFinite(s.value))s.value=Math.round(s.value*SCALE.hp*(1+GROWTH.hp*k));}
 b.leyLine={version:2,kind:r.kind,route:id,map:r.map,hour:this.leyLineHour(),tier:t.tier,level};
 const parts=foes.map((a,i)=>({source:a.source,level:a.level,grade:a.grade,xp:Math.floor(t.directXp/foes.length)+(i<t.directXp%foes.length?1:0),mora:0}));
 if(!b.storyConfig?.noRewards)b.mondBalance={version:1,kind:'BOSS',risk:0,rewards:{xp:parts.reduce((n,x)=>n+x.xp,0),mora:parts.reduce((n,x)=>n+x.mora,0),parts}};
 return out;
};
P.finishBattle=function(victory){
 const b=this.s.runtime,ley=b?.leyLine?copy(b.leyLine):null,result=old.finishBattle.call(this,victory);
 if(!ley||!result||typeof result!=='object')return result;
 const t=ley.version===1?legacyTierOf(ley.tier,ROUTES[ley.route].region):tierOf(ley.tier);result.leyLine={kind:ley.kind,name:KINDS[ley.kind].name,tier:ley.tier,level:ley.level,claimed:false};
 if(victory&&t&&!b.storyConfig?.noRewards&&this.s.leyLine?.[ley.kind]!==ley.hour){
  (this.s.leyLine??={version:1})[ley.kind]=ley.hour;const loot={};
  if(ley.kind==='REVELATION')for(const [id,n]of Object.entries(t.books)){this.giveItem(id,n);loot[id]=n;}
  else{this.s.global.MORA+=t.mora;result.mora=(Number(result.mora)||0)+t.mora;result.leyLine.mora=t.mora;}
  result.loot={...(result.loot||{})};for(const [id,n]of Object.entries(loot))result.loot[id]=(result.loot[id]||0)+n;
  result.leyLine.claimed=true;result.leyLine.books=Object.keys(loot).length?loot:null;
 }
 const key=result.battleId||result.id;this.s.combatReceipts[key]=copy(result);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(result);
 const log=this.s.log.findLast(x=>x.battleId===key);if(log)Object.assign(log,copy(result));
 return result;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,l=out.leyLine;
 if(l!==undefined&&(!l||typeof l!=='object'||Array.isArray(l)||l.version!==1||Object.entries(l).some(([k,v])=>k!=='version'&&(!KINDS[k]||!Number.isSafeInteger(v)||v<0))))fail('LEYLINE_SAVE','지맥의 꽃 기록이 올바르지 않습니다.');
 const b=out.runtime?.leyLine,t=b&&(b.version===1?legacyTierOf(b.tier,ROUTES[b.route]?.region):tierOf(b.tier));if(b&&(![1,2].includes(b.version)||!KINDS[b.kind]||!ROUTES[b.route]||!Number.isSafeInteger(b.hour)||!t||b.level!==t.level))fail('LEYLINE_SAVE','지맥의 꽃 전투 기록이 올바르지 않습니다.');
 return out;
};
P.leyLineVersion=2;
})(globalThis);
