/* Spiral Abyss (0.14.3): twelve floors of three chambers with rest breaks in between.
   Server and browser share the same combat rules. No client score submissions. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,cp=x=>JSON.parse(JSON.stringify(x));
const fail=(c,m)=>{throw new api.RuleError(c,m);};
const old=Object.fromEntries(['installMarketContent','newGame','validateSave','startBattle','damage','applyDamage','aiTurn','roundEnd','liyueBattleOutcome','finishBattle','actionReason','apply','enemyIntel','supportsLiyueBoss'].map(k=>[k,P[k]]));
P.supportsLiyueBoss=function(id){return id==='MON_ABYSS_WARDEN'||old.supportsLiyueBoss.call(this,id);};
const LEGACY='ABYSS_01',VERSION=2,MARK='나선 각인';
/* 0.14.15 seasons (user: 「시즌별로 10층 이상 깬 사람은 훈장, 전 시즌 10층 이상이면 채팅에 테두리」). A season is a calendar
   month in Korea. When a new one starts the floors, marks and runs start over (only after a run under way has ended);
   the floor reached is kept in the season history, and first-clear rewards stay claimed for good. Saves from before
   seasons (ABYSS_01) carry their progress into the first real season. The account server keeps the official records. */
const KST=9*3600000,SEASON_RE=/^ABYSS_(\d{4})_(\d{2})$/;
const seasonOf=ms=>{const d=new Date(Number(ms)+KST);return 'ABYSS_'+d.getUTCFullYear()+'_'+String(d.getUTCMonth()+1).padStart(2,'0');};
const seasonParts=id=>{const m=SEASON_RE.exec(String(id||''));return m?[Number(m[1]),Number(m[2])]:null;};
const seasonShift=(id,n)=>{const p=seasonParts(id);if(!p)return null;const t=p[0]*12+p[1]-1+n;return 'ABYSS_'+Math.floor(t/12)+'_'+String(t%12+1).padStart(2,'0');};
const seasonStart=id=>{const p=seasonParts(id);return p?Date.UTC(p[0],p[1]-1,1)-KST:0;};
api.abyssSeason={of:seasonOf,previous:id=>seasonShift(id,-1),next:id=>seasonShift(id,1),start:seasonStart,end:id=>seasonStart(seasonShift(id,1)),
 label:id=>{const p=seasonParts(id);return p?p[0]+'년 '+p[1]+'월 시즌':'첫 시즌';},valid:id=>id===LEGACY||!!seasonParts(id),legacy:LEGACY,medalFloor:10};
const bestOf=s=>{const floors=Object.keys(s?.clears||{}).map(Number).filter(Number.isInteger),floor=floors.length?Math.max(...floors):0;return {floor,rounds:Object.values(s?.clears||{}).reduce((n,x)=>n+(x?.rounds||0),0)};};
/* The record as it stands in `season`: a finished season moves into the history and the floors start over. A first-clear
   reward not yet taken stays claimable (owed), on the screen as in the save. */
function seasonal(s,season){
 if(!s||s.season===season||s.active||!seasonParts(season))return s;
 if(s.season===LEGACY||!seasonParts(s.season))return {...s,season};
 const best=bestOf(s),history=[...(s.history||[]).filter(h=>h.season!==s.season),...(best.floor?[{season:s.season,floor:best.floor,rounds:best.rounds,attempts:s.attempts||0}]:[])].slice(-36);
 const unclaimed=Object.keys(s.clears||{}).map(Number).filter(f=>Number.isInteger(f)&&!s.claimed?.[f]),owed=[...new Set([...(s.owed||[]),...unclaimed])].sort((a,b)=>a-b);
 const next={...s,season,tags:{},clears:{},active:null,attempts:0,run:(s.run||1)+1,history};if(owed.length)next.owed=owed;return next;
}
const INAZUMA=['EQ_SWORD_AMENOMA','EQ_CLAYMORE_KATSURAGI','EQ_POLEARM_KITAIN','EQ_BOW_HAMAYUMI','EQ_CATALYST_HAKUSHIN','EQ_POLEARM_CATCH','EQ_ACC_SWIFT_TALISMAN'];
const ATTACK_FOOD=['STATUS_FOOD_ATK','STATUS_FOOD_FEAST'],FEAST_FOOD=['STATUS_FOOD_FEAST'],ADEPTUS_DISH=['FOOD_ADEPTUS_TEMPTATION','FOOD_ALMOND_TOFU'];
const foe=(n,o={})=>({n,...o});
/* One room per chamber. hp/atk multiply the floor base; the rest are the room's rules. */
const FLOORS=[
 {floor:1,name:'입구의 잔향',level:10,hp:3000,atk:265,def:120,reward:{primogem:100,mora:800},rooms:[
  {name:'잔향의 문지기',hint:'입구를 지키는 잔향 둘이 창끝을 겨눈다.',foes:[foe('잔향 파수꾼'),foe('잔향 창병')],limit:14},
  {name:'떠오른 잔향',hint:'발끝이 바닥에 닿지 않는 잔향들이 천장 가까이에서 흔들린다.',foes:[foe('떠오른 사수',{air:true}),foe('떠오른 척후',{air:true})],limit:15,hp:.6},
  {name:'되살리는 잔향',hint:'뒤쪽의 잔향 하나가 쉬지 않고 무언가를 읊조린다.',foes:[foe('잔향 파수꾼'),foe('잔향 치유사',{heal:true,hp:.8})],limit:14,healPct:.12}]},
 {floor:2,name:'엇갈린 회랑',level:12,hp:3600,atk:520,def:150,reward:{primogem:120,mora:1000,items:{ORE_WHITE_IRON:3}},rooms:[
  {name:'회랑의 사수',hint:'회랑 높은 곳에 사수들이 자리를 잡았고, 아래에서는 파수꾼이 길을 막는다.',foes:[foe('회랑 사수',{air:true}),foe('회랑 사수',{air:true}),foe('회랑 파수꾼')],limit:14,hp:.6},
  {name:'불꽃 장막',hint:'두 적이 일렁이는 불꽃의 막을 두르고 있다.',foes:[foe('불꽃 장막 술사'),foe('불꽃 장막 창병')],limit:14,el:'PYRO',shield:{element:'불',pct:.4,weak:{물:2,얼음:1.5}}},
  {name:'엇갈린 쌍둥이',hint:'서로의 이름을 부르며 싸우는 쌍둥이.',foes:[foe('쌍둥이 · 해'),foe('쌍둥이 · 달')],limit:15,twin:true}]},
 {floor:3,name:'무너지는 발판',level:15,hp:5000,atk:530,def:185,reward:{primogem:140,mora:1200,items:{ORE_WHITE_IRON:5}},rooms:[
  {name:'갈라지는 발판',hint:'발밑의 돌판이 조금씩 갈라지며 기운을 빨아들인다.',foes:[foe('발판 파수꾼'),foe('발판 창병'),foe('발판 사수')],limit:14,hp:.65,erosion:.02},
  {name:'추격하는 그림자',hint:'그림자들은 지쳐 보이는 쪽을 끈질기게 쫓는다.',foes:[foe('그림자 추격자'),foe('그림자 사냥꾼')],limit:14,pursuit:true},
  {name:'무너지는 왕좌',hint:'시간이 흐를수록 왕좌를 지키는 자들의 숨소리가 거칠어진다.',foes:[foe('왕좌의 파수꾼'),foe('왕좌의 근위병')],limit:12,enrage:[6,1.6]}]},
 {floor:4,name:'분리된 문',level:16,hp:5200,atk:670,def:215,reward:{primogem:180,mora:1500,items:{ORE_CRYSTAL:3}},rooms:[
  {name:'얼음 장막',hint:'두 적이 서늘한 얼음의 막을 두르고 있다.',foes:[foe('얼음 장막 술사'),foe('얼음 장막 창병')],limit:13,el:'CRYO',shield:{element:'얼음',pct:.4,weak:{불:2,바위:1.5}}},
  {name:'굶주린 문',hint:'문지기의 배에서 꼬르륵 소리가 난다. 빈손으로 온 자는 쳐다보지도 않는다.',foes:[foe('굶주린 문지기'),foe('굶주린 창병')],limit:13,food:ATTACK_FOOD},
  {name:'분리된 두 문',hint:'두 문이 번갈아 빗장을 건다.',foes:[foe('왼쪽 문지기'),foe('오른쪽 문지기')],limit:15,hp:.7,alternate:true}]},
 {floor:5,name:'되돌아오는 파수꾼',level:17,hp:5700,atk:720,def:245,reward:{primogem:200,mora:1800,items:{ORE_CRYSTAL:4}},rooms:[
  {name:'안개 낀 제단',hint:'짙은 안개가 제단을 감쌌다. 적의 윤곽조차 흐릿하다.',foes:[foe('안개 파수꾼'),foe('안개 사수')],limit:13,accuracy:100},
  {name:'치유의 사제',hint:'물의 막 뒤에서 사제가 조용히 기도를 올린다.',foes:[foe('제단 파수꾼'),foe('제단 사제',{heal:true,hp:.8,shield:true})],limit:13,hp:.75,el:'HYDRO',healPct:.1,shield:{element:'물',pct:.45,weak:{얼음:2,번개:1.5}}},
  {name:'되돌아오는 파수꾼',hint:'두 파수꾼이 서로를 등지고 선다.',foes:[foe('되돌아오는 파수꾼'),foe('되돌아오는 추격자')],limit:14,hp:.8,twin:true}]},
 {floor:6,name:'침식의 회랑',level:18,hp:6200,atk:700,def:275,reward:{primogem:240,mora:2100,items:{ORE_CRYSTAL:5}},rooms:[
  {name:'침식의 숨결',hint:'회랑의 공기가 살갗을 조금씩 갉아먹는다.',foes:[foe('침식 파수꾼'),foe('침식 창병'),foe('침식 사수')],limit:13,hp:.65,erosion:.03},
  {name:'가시 갑주',hint:'갑주 곳곳에 가시가 돋아 있다.',foes:[foe('가시 갑주 기사'),foe('가시 갑주 창병')],limit:13,reflect:.3},
  {name:'만찬의 결계',hint:'결계 너머로 잔칫상 냄새가 흘러나온다.',foes:[foe('만찬의 문지기'),foe('만찬의 시종')],limit:13,food:FEAST_FOOD}]},
 {floor:7,name:'멈추지 않는 추격',level:18,hp:6800,atk:800,def:310,reward:{primogem:280,mora:2400,items:{TRPG_BOSS_ESSENCE:2}},rooms:[
  {name:'사냥개의 추격',hint:'사냥개는 지칠 줄 모르고, 시간이 지날수록 사나워진다.',foes:[foe('심연 사냥개'),foe('심연 몰이꾼')],limit:12,pursuit:true,enrage:[5,1.4]},
  {name:'선인의 환영',hint:'안개 속 형상은 보일 듯 말 듯하다. 아주 오래된 맛을 그리워하는 것 같다.',foes:[foe('선인의 환영',{hp:1})],limit:13,dish:ADEPTUS_DISH},
  {name:'희생의 제단',hint:'제단은 무언가를 바라고 있다.',foes:[foe('제단의 집행자'),foe('제단의 수호자')],limit:15,hp:.5,sacrifice:2}]},
 {floor:8,name:'침묵의 벽',level:19,hp:3900,atk:840,def:330,reward:{primogem:340,mora:2800,items:{TRPG_BOSS_ESSENCE:3}},rooms:[
  {name:'침묵의 벽',hint:'칼날도 원소도 이 벽 앞에서는 소리를 잃는다.',foes:[foe('침묵의 벽'),foe('침묵의 파수꾼')],limit:14,fixedOnly:true},
  {name:'독이 고인 정원',hint:'벽은 여전히 침묵하고, 발밑에서 독이 스며 오른다.',foes:[foe('정원의 벽'),foe('정원의 파수꾼')],limit:14,fixedOnly:true,erosion:.03},
  {name:'이음새 없는 갑주',hint:'틈 하나 보이지 않는 갑주.',foes:[foe('틈을 감춘 기사'),foe('틈을 감춘 창병')],limit:15,hp:.4,critOnly:1}]},
 {floor:9,name:'거울의 제단',level:19,hp:5500,atk:860,def:330,reward:{mora:3200,items:{TRPG_BOSS_ESSENCE:3,ORE_CRYSTAL:5}},rooms:[
  {name:'거울 방패',hint:'거울이 모든 공격을 비춰 흘려보낸다.',foes:[foe('거울 방패병'),foe('거울 사제')],limit:14,shieldHolder:true,dmgMult:2.5},
  {name:'안개의 제단',hint:'안개가 한층 더 짙어졌다.',foes:[foe('안개 제단의 파수꾼'),foe('안개 제단의 사수')],limit:13,hp:.6,accuracy:110},
  {name:'거울의 제단',hint:'거울은 이제 더 많은 것을 비춘다.',foes:[foe('거울 제단의 수호자'),foe('거울 제단의 사제')],limit:14,shieldHolder:true,gear:['EQ_ACC_STEADFAST',9],dmgMult:2.75}]},
 {floor:10,name:'폭풍의 닫힌 고리',level:20,hp:20000,atk:780,def:370,reward:{mora:3600,items:{TRPG_BOSS_CORE:1,TRPG_BOSS_ESSENCE:3}},rooms:[
  {name:'폭풍의 입구',hint:'폭풍이 길을 막아선다.',foes:[foe('폭풍의 문지기'),foe('폭풍의 창병')],limit:11,elements:['HYDRO','ELECTRO','ANEMO'],weapons:10,dmgMult:1.6},
  {name:'닫힌 고리',hint:'세 개의 고리가 맞물려 돌아간다.',foes:[foe('고리의 파수꾼'),foe('고리의 사수')],limit:11,hp:.8,elements:['HYDRO','ELECTRO','ANEMO'],sequence:['HYDRO','ELECTRO','ANEMO'],dmgMult:2.2},
  {name:'폭풍의 눈',hint:'폭풍의 눈은 하늘 너머에 있다.',foes:[foe('폭풍의 눈'),foe('폭풍의 사도')],limit:12,elements:['HYDRO','ELECTRO','ANEMO'],sequence:['HYDRO','ELECTRO','ANEMO'],weapons:10,teamGear:['EQ_LY_ACC_STARGAZER',10],dmgMult:2.75}]},
 {floor:11,name:'서로 잠긴 왕좌',level:20,hp:11200,atk:740,def:410,reward:{mora:4000,items:{TRPG_BOSS_CORE:1,ORE_CRYSTAL:8}},rooms:[
  {name:'서리 왕좌',hint:'왕좌에서 뿜어 나오는 한기에 갑옷이 삐걱거린다.',foes:[foe('서리 왕좌의 기사'),foe('서리 왕좌의 시종')],limit:13,elements:['PYRO','CRYO','GEO'],armor:10,dmgMult:3.2},
  {name:'잠긴 왕좌',hint:'두 왕좌가 번갈아 숨을 죽인다.',foes:[foe('해의 왕좌'),foe('달의 왕좌')],limit:10,hp:.55,elements:['PYRO','CRYO','GEO'],alternate:true,reflect:.2,dmgMult:5},
  {name:'서로 잠긴 왕좌',hint:'왕좌의 속삭임이 마음을 흔든다.',foes:[foe('잠긴 왕좌의 주인'),foe('잠긴 왕좌의 그림자')],limit:11,hp:.72,elements:['PYRO','CRYO','GEO'],alternate:true,armor:10,teamGear:['EQ_LY_ACC_QINGXIN_SACHET',10],dmgMult:4.85}]},
 {floor:12,name:'끝을 삼키는 별',level:20,hp:16800,atk:1060,def:450,reward:{mora:6000,artifact:true,items:{TRPG_BOSS_CORE:1}},rooms:[
  {name:'별의 파편',hint:'정점에 선 자들만이 별에 닿는다.',foes:[foe('별의 파편'),foe('파편의 그림자')],limit:12,mastery:true,critOnly:3,dmgMult:2.65},
  {name:'삼키는 별',hint:'별이 빛을 삼키며 곁에 선 모든 것을 갉아먹는다.',foes:[foe('삼키는 별'),foe('별을 삼킨 자')],limit:12,mastery:true,erosion:.03,dmgMult:2.65},
  {name:'끝을 삼키는 별',hint:'정점의 끝.',foes:[foe('끝을 삼키는 별'),foe('별의 잔해')],limit:12,hp:.85,mastery:true,critOnly:3,erosion:.045,dmgMult:2.65}]}
];
const ROOM_HP=[.8,.9,1],ROOM_ATK=[.9,.95,1],ELEMENT_KO={PYRO:'불',HYDRO:'물',CRYO:'얼음',ELECTRO:'번개',ANEMO:'바람',GEO:'바위',DENDRO:'풀'};
// 0.14.12: 5★ companions gained 10% base HP/ATK/DEF (runtime_rarity_v01412.js); the Abyss keeps its edge with stronger
// wardens, so a mixed party stands where it stood and an all-5★ party keeps only part of its new margin.
// Floor 10 stays as it was: it is already the tightest damage race, and its reference party clears it only with a meal.
const POWER={hp:1.07,atk:1.05},powerOf=f=>f===10?{hp:1,atk:1}:POWER;
// 0.15.22: level ranges and explicit room tuning, independent of party size or average level.
for(const [i,f]of FLOORS.entries()){const prior=f.level,l=[15,20,25,30,35,40,45,50,55,60,60,60][i],p=[10,20,30,40,50,55,60].findIndex(x=>x>=l),hp=1+.13*(l-1)+.002*(l-1)**2,ad=1+.12*(l-1)+.003*(l-1)**2;f.level=l;f.hp=Math.round(f.hp*(1+Math.max(0,l-20)*.04)*(1+p*.10)*[1.2,1.2,1.6,1,1.3,1.3,1.2,1.5,1.8,1.5,2.2,3][i]);f.atk=Math.round(f.atk*hp/(1+.04*(prior-1))*(1+p*.10)*Math.sqrt(ad)/2);f.def=Math.round(f.def*ad/(1+.025*(prior-1)));}
// 0.14.12 (user): Inazuma gear from floor 9 on; floors 1–8 pay Primogems instead, 1,600 for all eight.
const PRIMOGEM_TOTAL=1600;
api.abyssConfig={season:'MONTHLY',version:VERSION,markName:MARK,rewards:INAZUMA.slice(),floors:cp(FLOORS)};
api.abyssVersion=VERSION;
const groupId=(f,c)=>'EG_ABYSS_'+f+'_'+c,originId=(f,c)=>'ABYSS:'+f+':'+c;
const roomOf=b=>b?.abyss?FLOORS[b.abyss.floor-1]?.rooms[b.abyss.chamber-1]:null;
const jong=s=>{const c=String(s).charCodeAt(String(s).length-1)-0xAC00;return c>=0&&c<=11171&&c%28!==0;};
const josa=(s,a,b)=>s+(jong(s)?a:b);
function table(r,key,rows){r.db={...r.db,[key]:rows};r.tables[key]=new Map(rows.slice(1).filter(x=>x[0]).map(x=>[x[0],x]));}
P.installAbyssContent=function(){
 if(this._abyssInstalled)return;
 for(const key of ['09_MONSTER_DB','33_ENCOUNTER_GROUP_DB','49_ENCOUNTER_MEMBER_DB','16_EQUIP_DB'])table(this,key,this.db[key].map(x=>x.slice()));
 const monster=this.row('09_MONSTER_DB','MON_LY_R39_RAIDER').slice();
 monster[0]='MON_ABYSS_WARDEN';monster[1]='나선의 파수꾼';monster[2]='나선비경';monster[3]='보스';monster[5]='[나선비경]';monster[6]=1000;monster[7]=145;monster[8]=95;monster[14]='';monster[18]=10;monster[19]=28;monster[20]=98;monster[21]=8;monster[22]=90;monster[23]='전장';
 this.db['09_MONSTER_DB'].push(monster);this.tables['09_MONSTER_DB'].set(monster[0],monster);
 const baseGroup=this.row('33_ENCOUNTER_GROUP_DB','EG_LY_R39_BATTLE'),baseMember=this.rows('49_ENCOUNTER_MEMBER_DB').find(x=>x[1]==='EG_LY_R39_BATTLE');
 const add=(id,title,count)=>{const group=baseGroup.slice();group[0]=id;group[1]=title;this.db['33_ENCOUNTER_GROUP_DB'].push(group);this.tables['33_ENCOUNTER_GROUP_DB'].set(id,group);
  const m=baseMember.slice();m[0]=id.replace('EG_','MEM_');m[1]=id;m[3]=monster[0];m[4]=m[5]=count;this.db['49_ENCOUNTER_MEMBER_DB'].push(m);this.tables['49_ENCOUNTER_MEMBER_DB'].set(m[0],m);};
 for(const f of FLOORS){
  add('EG_ABYSS_'+f.floor,'나선비경 '+f.floor+'층 · '+f.name,2); // battles saved by 0.14.2 and earlier
  f.rooms.forEach((r,i)=>add(groupId(f.floor,i+1),'나선비경 '+f.floor+'층 '+(i+1)+'번 방 · '+r.name,r.foes.length));
 }
 this.row('16_EQUIP_DB','EQ_CATALYST_HAKUSHIN')[1]='백진의 고리';
 const artifact=this.row('16_EQUIP_DB','EQ_ARTIFACT_EDGE').slice();artifact[0]='EQ_ABYSS_INAZUMA_ARTIFACT';artifact[1]='이나즈마 성유물 · 나선의 유산';artifact[26]='나선비경 12층 최초 정복';artifact[27]='CRPG 전용 이나즈마 선행 보상. 개별 품질과 능력치는 획득 시 결정된다.';
 this.db['16_EQUIP_DB'].push(artifact);this.tables['16_EQUIP_DB'].set(artifact[0],artifact);
 this._abyssInstalled=true;
};
P.installMarketContent=function(...args){const out=old.installMarketContent.apply(this,args);this.installAbyssContent();return out;};
/* 0.14.2 saves kept one battle per floor and tagged companions at entry. The rules changed, so the
   floor progress starts over; claimed rewards stay on record and a battle already running becomes chamber 1. */
function migrate(s){
 const a=s?.abyss;if(!a||a.version!==1)return;
 const act=a.active,b=s.runtime?.abyss&&s.runtime.origin===('ABYSS:'+act?.floor)?s.runtime:null;
 s.abyss={version:VERSION,season:LEGACY,tags:{},clears:{},claimed:{},legacyClaimed:cp(a.claimed||{}),attempts:a.attempts||0,resets:a.resets||0,totalRounds:a.totalRounds||0,run:(a.run||1)+1,active:null};
 if(b){s.abyss.active={floor:act.floor,chamber:1,phase:'BATTLE',party:act.party.slice(),attempt:act.attempt,run:s.abyss.run,rounds:[]};b.origin=originId(act.floor,1);b.abyss={version:VERSION,floor:act.floor,chamber:1,limit:b.abyss.roundLimit,marks:b.abyss.marks||[],settled:b.abyss.settled||[],pulse:b.abyss.pulse||{},broken:false,legacy:true};}
}
P.ensureAbyss=function(){migrate(this.s);return this.s.abyss??={version:VERSION,season:this.abyssSeasonNow(),tags:{},clears:{},claimed:{},attempts:0,resets:0,totalRounds:0,run:1,active:null};};
// Server time during an action, the device clock otherwise (as for ley lines and the weekly exchange).
P.abyssNow=function(){return Number(this.actionStartedAt??Date.now());};
P.abyssSeasonNow=function(){return seasonOf(this.abyssNow());};
// The record as the current season sees it, without changing the save (screens and reasons).
P.abyssCurrent=function(){return seasonal(this.ensureAbyss(),this.abyssSeasonNow());};
// Apply a season change to the save; Spiral Abyss actions call this first.
P.abyssRoll=function(){
 const s=this.ensureAbyss(),next=seasonal(s,this.abyssSeasonNow());if(next===s)return false;
 this.s.abyss=next;return true;
};
// Seasons whose best floor reached the medal floor (10), this one included once reached.
P.abyssMedals=function(){
 const s=this.abyssCurrent(),list=(s.history||[]).filter(h=>h.floor>=10).map(h=>({season:h.season,label:api.abyssSeason.label(h.season),floor:h.floor}));
 const now=bestOf(s);if(now.floor>=10&&seasonParts(s.season))list.push({season:s.season,label:api.abyssSeason.label(s.season),floor:now.floor,current:true});
 return list;
};
P.abyssParty=function(){return this.s.party.filter(x=>x.active).map(x=>x.source);};
const hpOf=(r,id)=>id==='PLAYER_CUSTOM'?r.s.global.PLAYER_HP_CURRENT:r.s.chars[id]?.hp;
const nameOf=(r,id)=>id==='PLAYER_CUSTOM'?r.s.global.PLAYER_NAME||'주인공':r.row('07_CHAR_DB',id)[1];
P.abyssFloorReason=function(floor){
 const f=Number.isInteger(floor)&&FLOORS[floor-1];if(!f)return '등록되지 않은 층입니다.';
 if(this.s.runtime||this.s.battlePreparation||this.s.lifeJob||this.s.worldJob||this.s.storyContext||this.playPhase()!=='FREE')return '현재 장면과 작업을 마친 뒤 입장해 주세요.';
 if(this.s.global.CURRENT_MAP_ID!=='MAP_V141_MUSK_REEF')return '맹세의 갑각의 통로를 지나 머스크 암초로 이동해 주세요.';
 const s=this.abyssCurrent(),act=s.active,party=this.abyssParty();
 if(act){
  if(act.floor!==floor)return act.floor+'층 도전이 진행 중입니다. 그 층을 마치거나 도전을 포기해 주세요.';
  if(act.phase!=='BREAK')return '전투가 이미 진행 중입니다.';
  if(party.length!==act.party.length||party.some(id=>!act.party.includes(id)))return '도전을 시작한 파티 그대로 다음 방에 들어가야 합니다.';
  return hpOf(this,'PLAYER_CUSTOM')>0?'':'주인공이 쓰러져 더 나아갈 수 없습니다.';
 }
 const levelOf=id=>id==='PLAYER_CUSTOM'?this.s.global.PLAYER_LEVEL_STATE:this.s.chars[id]?.level;
 if(party.some(id=>levelOf(id)<Math.max(10,f.level-5)))return '이 층은 파티 전원 Lv. '+Math.max(10,f.level-5)+'부터 입장할 수 있습니다.';
 if(floor>=10&&party.some(id=>levelOf(id)<60))return '10층부터는 파티 전원이 Lv. 60이어야 입장할 수 있습니다.';
 if(floor>1&&!s.clears[floor-1])return '앞선 층을 먼저 정복해야 합니다.';
 if(party.length!==4)return '주인공과 동료 세 명을 편성해 주세요.';
 if(party.some(id=>hpOf(this,id)<=0))return '전투불능 파티원을 회복해 주세요.';
 const marked=party.filter(id=>id!=='PLAYER_CUSTOM'&&s.tags[id]&&s.tags[id]!==floor);
 if(marked.length)return marked.map(id=>nameOf(this,id)+'('+s.tags[id]+'층)').join(', ')+'에게 다른 층의 '+MARK+'이 새겨져 있어 이 층에는 나설 수 없습니다.';
 return '';
};
function rewardView(r,F){
 const w=F.reward,parts=[];
 if(w.artifact)parts.push('이나즈마 성유물 · 나선의 유산 1개(품질 90% 이상)');else if(w.primogem)parts.push('원석 '+w.primogem+'개');else parts.push('이나즈마 장비 1종 선택');
 if(w.mora)parts.push(String(w.mora).replace(/\B(?=(\d{3})+(?!\d))/g,',')+' 모라');
 for(const [id,n] of Object.entries(w.items||{}))parts.push((r.tables['14_ITEM_DB'].get(id)?.[1]||id)+' '+n+'개');
 return {text:parts.join(' · '),choice:w.artifact||w.primogem?null:INAZUMA.slice(),mora:w.mora||0,primogem:w.primogem||0,items:cp(w.items||{}),artifact:!!w.artifact};
}
P.abyssView=function(){
 const s=this.abyssCurrent(),act=s.active,owed=new Set(s.owed||[]),timed=!!seasonParts(s.season);
 return {season:s.season,seasonLabel:api.abyssSeason.label(s.season),seasonEnds:timed?api.abyssSeason.end(s.season):null,seasonTimed:timed,
  history:cp(s.history||[]).map(h=>({...h,label:api.abyssSeason.label(h.season)})),medals:this.abyssMedals(),best:bestOf(s),
  version:VERSION,markName:MARK,progress:cp(s),
  active:act?{...cp(act),room:cp(FLOORS[act.floor-1].rooms[act.chamber-1]),floorName:FLOORS[act.floor-1].name}:null,
  floors:FLOORS.map(F=>({floor:F.floor,name:F.name,level:F.level,riddle:F.floor>=8,
   rooms:F.rooms.map((r,i)=>({chamber:i+1,name:r.name,hint:r.hint,limit:r.limit,foes:r.foes.length})),
   reward:rewardView(this,F),cleared:!!s.clears[F.floor],owed:owed.has(F.floor)&&!s.claimed[F.floor],best:s.clears[F.floor]?.rounds||null,claimed:!!s.claimed[F.floor],reason:this.abyssFloorReason(F.floor)}))};
};
P.startAbyss=function(floor){
 const why=this.abyssFloorReason(floor);if(why)fail('ABYSS_ENTRY',why);
 const s=this.ensureAbyss();
 if(!s.active){s.attempts++;s.active={floor,chamber:1,phase:'BATTLE',party:this.abyssParty(),attempt:s.attempts,run:s.run,rounds:[]};}
 else s.active.phase='BATTLE';
 this.s.placeVisit=null;
 const out=this.startBattle(groupId(floor,s.active.chamber),originId(floor,s.active.chamber));
 return {...out,abyss:{floor,chamber:s.active.chamber}};
};
P.startBattle=function(group,origin='EXPLICIT',options={}){
 const act=this.s.abyss?.active;
 if(String(group).startsWith('EG_ABYSS_')&&(!act||act.phase!=='BATTLE'||group!==groupId(act.floor,act.chamber)||origin!==originId(act.floor,act.chamber)))fail('ABYSS_SOURCE','현재 입장 기록과 전투가 일치하지 않습니다.');
 const result=old.startBattle.call(this,group,origin,options),b=this.s.runtime;
 if(b&&String(origin).startsWith('ABYSS:')&&!b.abyss){
  const F=FLOORS[act.floor-1],c=act.chamber-1,r=F.rooms[c],names={};
  b.abyss={version:VERSION,floor:F.floor,chamber:act.chamber,limit:r.limit,marks:[],settled:[],pulse:{},broken:false};b.storyConfig={noRewards:true};
  for(const x of r.foes)names[x.n]=(names[x.n]||0)+1;const seen={};
  b.actors.filter(a=>a.side==='ENEMY').forEach((a,i)=>{
   const spec=r.foes[i]||r.foes[0],pw=powerOf(F.floor),hp=Math.round(F.hp*(r.hp??1)*ROOM_HP[c]*(spec.hp||1)*pw.hp),atk=Math.round(F.atk*ROOM_ATK[c]*(spec.atk||1)*pw.atk);
   seen[spec.n]=(seen[spec.n]||0)+1;const name=names[spec.n]>1?spec.n+' '+seen[spec.n]:spec.n;
   Object.assign(a,{name,hp,maxHp:hp,atk,def:F.def,level:F.level,spd:26+F.floor*2,hit:98,eva:Math.min(25,6+F.floor),resist:95,abyssWarden:true,abyssIndex:i,abyssHealer:!!spec.heal,abyssAir:!!spec.air,airborne:!!spec.air,tags:['[나선비경]'],hasDedicatedCards:false});
   if(r.shield&&(spec.shield||!r.foes.some(x=>x.shield)))this.shield(a,a.maxHp*r.shield.pct,'ABYSS_SHIELD',null,{element:r.shield.element,damageMultipliers:r.shield.weak});
  });
 }
 return result;
};
const equipped=(r,owner,id,min=0)=>r.s.inventory.some(i=>i.equipped&&i.owner===owner&&i.equip===id&&i.enhance>=min);
const elem=a=>({불:'PYRO',물:'HYDRO',얼음:'CRYO',번개:'ELECTRO',바람:'ANEMO',바위:'GEO',풀:'DENDRO'}[a.element||((a.tags||[]).join('').match(/\[(불|물|얼음|번개|바람|바위|풀)\]/)||[])[1]]||a.element);
const hasElements=(b,els)=>els.every(e=>b.actors.some(a=>a.side==='ALLY'&&a.source!=='PLAYER_CUSTOM'&&elem(a)===e));
const allGear=(r,b,category,min)=>b.actors.filter(x=>x.side==='ALLY').every(x=>r.s.inventory.some(i=>i.equipped&&i.owner===x.source&&i.category===category&&i.enhance>=min));
const downed=b=>b.actors.filter(x=>x.side==='ALLY'&&x.source!=='PLAYER_CUSTOM'&&x.hp<=0).length;
P.abyssMasteryReady=function(){
 const b=this.s.runtime,party=b.actors.filter(a=>a.side==='ALLY');
 if(!party.some(a=>a.source==='LIYUE_ZHONGLI')||!party.some(a=>a.source==='MOND_JEAN')||!party.some(a=>elem(a)==='PYRO'))return false;
 return party.every(a=>{
  const gear=this.s.inventory.filter(i=>i.equipped&&i.owner===a.source),art=gear.find(i=>i.artifact);
  const stats=art?this.artifactStats(art):{};
  return a.level===60&&['WEAPON','ARMOR','ACCESSORY'].every(c=>gear.some(i=>i.category===c&&i.enhance===12&&i.enhancementCap===12))&&art?.artifact.quality>=900&&art.artifact.level===5&&(a.source==='LIYUE_ZHONGLI'?stats.MAX_HP>=200&&stats.DEF>=20:a.source==='MOND_JEAN'?stats.ATK>=25&&stats.MAX_HP>=100:stats.ATK>=35&&(stats.CRIT||0)>=2);
 });
};
/* Returns why an ally's hit does nothing to a warden, or '' when the room's rule is satisfied. */
P.abyssBlock=function(a,t,d={}){
 const b=this.s.runtime,ab=b?.abyss,r=roomOf(b);if(!r||!t?.abyssWarden||a?.side!=='ALLY')return '';
 const fixed=d.sourceKind==='ABYSS_FIXED',sources=b.actors.filter(x=>x.side==='ALLY');
 if(r.fixedOnly&&!fixed&&d.sourceKind!=='REACTION_DOT')return '고정 피해와 지속 피해만 통합니다.';
 if(r.critOnly&&b.round%r.critOnly===0&&d.critical!==true&&!fixed)return '치명타만 통합니다.';
 if(r.food&&!(a.statuses||[]).some(s=>r.food.includes(s.id)))return '요리 효과가 없는 공격은 결계에 막힙니다.';
 if(r.dish&&!sources.some(x=>(x.statuses||[]).some(s=>r.dish.includes(s.sourceItem))))return '환영이 아직 모습을 드러내지 않았습니다.';
 if(r.sacrifice&&downed(b)<r.sacrifice)return '결계가 아직 깨지지 않았습니다.';
 if(r.alternate&&b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0).length>1&&t.abyssIndex!==(b.round%2?0:1))return '지금은 잠긴 쪽입니다.';
 if(r.shieldHolder&&!(a.shields||[]).some(s=>s.value>0))return '보호막을 두른 동료의 공격만 통합니다.';
 if(r.gear&&!equipped(this,a.source,r.gear[0],r.gear[1]))return '무적입니다.';
 if(r.elements&&!hasElements(b,r.elements))return '무적입니다.';
 if(r.weapons&&!allGear(this,b,'WEAPON',r.weapons))return '무적입니다.';
 if(r.armor&&!allGear(this,b,'ARMOR',r.armor))return '무적입니다.';
 if(r.teamGear&&!sources.some(x=>equipped(this,x.source,r.teamGear[0],r.teamGear[1])))return '무적입니다.';
 if(r.sequence&&r.sequence.some(e=>!ab.marks.includes(e)))return '고리가 아직 열리지 않았습니다.';
 if(r.mastery&&!this.abyssMasteryReady())return '무적입니다.';
 return '';
};
P.abyssDamageAllowed=function(a,t,d){return !this.abyssBlock(a,t,d);};
P.applyDamage=function(a,t,n,d={}){
 const b=this.s.runtime,r=b?.abyss&&t?.abyssWarden?roomOf(b):null;
 if(!r)return old.applyDamage.call(this,a,t,n,d);
 const why=this.abyssBlock(a,t,d);
 // The player works the rule out; the log never explains which condition failed.
 if(why){b.log.push({actor:a.name,target:t.name,damage:0,text:'무적입니다.',immune:true,element:d.element,card:d.card});return 0;}
 if(a.side==='ALLY'){n*=r.dmgMult||1;if(r.sacrifice)n*=2;}
 const dealt=old.applyDamage.call(this,a,t,n,d);
 if(r.reflect&&a.side==='ALLY'&&a.hp>0&&dealt>0&&!['ABYSS_FIXED','REACTION_DOT','ABYSS_REFLECT'].includes(d.sourceKind))old.applyDamage.call(this,t,a,Math.max(1,Math.round(dealt*r.reflect)),{element:'반사',sourceKind:'ABYSS_REFLECT',card:'ABYSS_THORNS'});
 return dealt;
};
P.damage=function(a,t,k,e,o={}){
 const b=this.s.runtime,ab=b?.abyss,r=roomOf(b);
 if(r&&a.side==='ALLY'&&t?.abyssWarden&&t.hp>0){
  if(r.accuracy&&this.combatStat(a,'hit')<r.accuracy){b.log.push({actor:a.name,target:t.name,miss:true});return false;}
  if(r.sequence){const code=({물:'HYDRO',번개:'ELECTRO',바람:'ANEMO',불:'PYRO',얼음:'CRYO',바위:'GEO'}[e]||e);if(r.sequence.includes(code)&&!ab.marks.includes(code))ab.marks.push(code);}
 }
 const result=old.damage.call(this,a,t,k,e,o);
 if(ab&&a.side==='ALLY'&&t?.hp>0&&t.abyssWarden&&equipped(this,a.source,'EQ_LY_SPECIAL_LEYLINE_STAKE',8)){
  const key=a.id+':'+(a.turns||0);if(!ab.pulse[key]){ab.pulse[key]=true;const inv=this.s.inventory.find(i=>i.equipped&&i.owner===a.source&&i.equip==='EQ_LY_SPECIAL_LEYLINE_STAKE');this.applyDamage(a,t,80+12*inv.enhance,{element:'고정',sourceKind:'ABYSS_FIXED',card:'LEYLINE_STAKE_PULSE'});}
 }
 return result;
};
P.aiTurn=function(a,targets){
 const b=this.s.runtime,ab=b?.abyss;if(!ab||!a.abyssWarden)return old.aiTurn.call(this,a,targets);
 const r=roomOf(b),living=b.actors.filter(x=>x.side==='ALLY'&&x.hp>0);if(!living.length)return;
 const f=ab.floor,round=b.round;
 if(a.abyssHealer&&round%2===0){for(const x of b.actors.filter(x=>x.side==='ENEMY'&&x.hp>0))this.heal(x,x.maxHp*(r.healPct||.14),a.name);b.log.push({actor:a.name,text:josa(a.name,'이','가')+' 파수꾼들의 상처를 되돌렸다.'});return;}
 const el=r.el||['PHYSICAL','PYRO','CRYO','ELECTRO','HYDRO'][f%5];
 if(r.sacrifice&&downed(b)<r.sacrifice){const mates=living.filter(x=>x.source!=='PLAYER_CUSTOM').sort((x,y)=>x.hp-y.hp);if(mates.length){this.damage(a,mates[0],2+.6*round,el,{range:'전장',card:'ABYSS_EXECUTION',sureHit:true});return;}}
 const t=living.slice().sort((x,y)=>f>=6?x.def-y.def:x.hp-y.hp)[0],rage=(r.enrage&&round>=r.enrage[0]?r.enrage[1]:1)*(r.sacrifice?.5:1);
 if(rage>1&&!ab.enraged){ab.enraged=true;b.log.push({text:'나선의 기운이 거세져 적의 공격이 강해졌다.'});}
 const aoe=round%3===0,hit=aoe?living:[t];
 for(const x of hit)this.damage(a,x,(aoe?.80:1.2)*rage,el,{range:'전장',card:'ABYSS_ASSAULT',aoe,sureHit:f>=10});
 if(r.pursuit&&round%2===0&&t.hp>0)this.damage(a,t,.55*rage,'PHYSICAL',{range:'전장',card:'ABYSS_PURSUIT'});
};
P.roundEnd=function(){
 const b=this.s.runtime,ab=b?.abyss,r=roomOf(b);
 if(ab&&!ab.settled.includes(b.round)){
  ab.settled.push(b.round);
  const foes=b.actors.filter(x=>x.side==='ENEMY');
  if(r.twin){const fallen=foes.filter(x=>x.hp<=0),standing=foes.filter(x=>x.hp>0),call=Math.max(0,...standing.map(x=>x.hp));if(fallen.length&&standing.length)for(const x of fallen){x.hp=Math.max(1,Math.round(call*.5));x.statuses=[];b.log.push({target:x.name,text:josa(x.name,'이','가')+' 짝의 부름에 되살아났다.'});}}
  if(r.erosion){const enemy=foes.find(x=>x.hp>0);if(enemy)for(const a of b.actors.filter(x=>x.side==='ALLY'&&x.hp>0))old.applyDamage.call(this,enemy,a,Math.max(1,Math.round(a.maxHp*r.erosion)),{element:'침식',sourceKind:'ABYSS_EROSION'});}
  if(r.sacrifice&&!ab.broken&&downed(b)>=r.sacrifice){ab.broken=true;for(const x of foes.filter(x=>x.hp>0))x.hp=Math.ceil(x.hp*.5);b.log.push({text:'희생의 결계가 깨지며 제단의 적들도 큰 상처를 입었다.'});}
  if(r.sequence&&b.round%2===0)ab.marks=[];
  const flyers=foes.filter(x=>x.abyssAir&&x.hp>0);for(const x of flyers)x.airborne=(b.round+1)%3!==0;
  if(flyers.length&&(b.round+1)%3===0)b.log.push({text:'떠 있던 적들이 잠시 땅으로 내려왔다.'});
  if(b.round>=ab.limit&&foes.some(x=>x.hp>0)){ab.expired=true;b.log.push({text:'나선의 문이 닫혔다.'});}
 }
 return old.roundEnd.call(this);
};
P.liyueBattleOutcome=function(b){if(b?.abyss){if(b.abyss.expired||!b.actors.some(a=>a.side==='ALLY'&&a.hp>0))return false;if(!b.actors.some(a=>a.side==='ENEMY'&&a.hp>0))return true;}return old.liyueBattleOutcome?.call(this,b);};
P.finishBattle=function(win){
 const b=this.s.runtime,ab=b?.abyss,act=this.s.abyss?.active;const result=old.finishBattle.call(this,win);
 if(ab&&act){
  const s=this.ensureAbyss(),F=FLOORS[ab.floor-1],info={floor:ab.floor,chamber:ab.chamber,room:F.rooms[ab.chamber-1].name,rounds:b.round};
  s.totalRounds+=b.round;act.rounds.push(b.round);
  if(!win){s.active=null;info.outcome=ab.expired?'TIMEOUT':'DEFEAT';}
  else if(ab.chamber<3&&this.s.global.PLAYER_HP_CURRENT<=0){s.active=null;info.outcome='DOWNED';}
  else if(ab.chamber<3){act.chamber++;act.phase='BREAK';info.outcome='NEXT';info.next={chamber:act.chamber,room:F.rooms[act.chamber-1].name,hint:F.rooms[act.chamber-1].hint};}
  else{
   const total=act.rounds.reduce((n,x)=>n+x,0),prev=s.clears[ab.floor],marked=act.party.filter(id=>id!=='PLAYER_CUSTOM');
   s.clears[ab.floor]=prev&&prev.rounds<=total?prev:{rounds:total,attempt:act.attempt,party:act.party.slice(),run:s.run,chambers:act.rounds.slice()};
   for(const id of marked)s.tags[id]=ab.floor;
   s.active=null;Object.assign(info,{outcome:'CLEARED',total,marked,firstClear:!s.claimed[ab.floor]});
  }
  const last=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'{}');last.abyss={...info,cleared:info.outcome==='CLEARED'};last.xp=0;last.loot={};this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(last);
 }
 return result;
};
P.claimAbyss=function(floor,equipment){
 const s=this.ensureAbyss(),F=Number.isInteger(floor)&&FLOORS[floor-1];if(!F)fail('ABYSS_REWARD','등록되지 않은 층입니다.');
 // A floor cleared last season but not yet claimed stays claimable (owed).
 if(!s.clears[floor]&&!(s.owed||[]).includes(floor)||s.claimed[floor])fail('ABYSS_REWARD','받을 수 있는 첫 정복 보상이 없습니다.');
 if(s.owed)s.owed=s.owed.filter(f=>f!==floor);
 const w=F.reward,out={floor,mora:w.mora||0,items:cp(w.items||{})};
 if(!w.artifact&&!w.primogem&&!INAZUMA.includes(equipment))fail('ABYSS_REWARD','받을 이나즈마 장비를 골라 주세요.');
 if(w.mora)this.s.global.MORA+=w.mora;
 if(w.primogem){this.s.global.PRIMOGEM=(Number(this.s.global.PRIMOGEM)||0)+w.primogem;out.primogem=w.primogem;for(const [id,n] of Object.entries(w.items||{}))this.giveItem(id,n);s.claimed[floor]={...out,run:s.run};return {abyssReward:true,...out};}
 for(const [id,n] of Object.entries(w.items||{}))this.giveItem(id,n);
 if(w.artifact){const roll=this.rollArtifact(),inv=this.artifactInstance(roll.slot);inv.equip='EQ_ABYSS_INAZUMA_ARTIFACT';const previousScale=.22+2.78*Math.pow(inv.artifact.quality/1000,1.8);inv.artifact.quality=900+Math.floor(this.random()*101);const rewardScale=(.22+2.78*Math.pow(inv.artifact.quality/1000,1.8))/previousScale;inv.artifact.grade=this.artifactGrade(inv.artifact.quality);for(const k of Object.keys(inv.artifact.stats))inv.artifact.stats[k]=Math.round(inv.artifact.stats[k]*rewardScale*1.18*10)/10;Object.assign(out,{slot:inv.slot,equip:inv.equip,quality:inv.artifact.quality});}
 else Object.assign(out,{slot:this.giveEquipment(equipment),equip:equipment});
 s.claimed[floor]={...out,run:s.run};return {abyssReward:true,...out};
};
/* Between chambers the party may only eat, treat wounds, and adjust gear or formation. */
const BREAK_ACTIONS=new Set(['ABYSS_ENTER','ABYSS_RESET','USE_ITEM','EQUIP','UNEQUIP','MENU','FORMATION_SET','PARTY_TACTIC','TOOL_PREPARE','TUTORIAL_ACK','EQUIPMENT_GUIDE_ACK','OPERATOR_DEBUG']);
P.abyssBreakReason=function(type,a={}){
 const act=this.s?.abyss?.active;if(!act||act.phase!=='BREAK'||this.s.runtime)return null;
 if(!BREAK_ACTIONS.has(type))return '나선비경 '+act.floor+'층 도전 중입니다. 다음 방에 들어가거나 도전을 포기해 주세요.';
 if(type==='USE_ITEM'&&!['음식','전투 치료품'].includes(this.tables['14_ITEM_DB'].get(a.item)?.[2]))return '방 사이에서는 음식과 치료품만 쓸 수 있습니다.';
 return null;
};
const priorAssert=P.assertActionAllowed;
P.assertActionAllowed=function(a){const locked=this.abyssBreakReason(a.type,a);if(locked)throw new api.RuleError('ACTION_LOCK',locked);return priorAssert.call(this,a);};
P.actionReason=function(type,a={}){
 if(type==='ABYSS_ENTER')return this.abyssFloorReason(a.floor);
 if(type==='ABYSS_RESET'||type==='ABYSS_REWARD'){
  if(this.s.runtime||this.playPhase()!=='FREE')return '현재 전투와 장면을 먼저 마쳐 주세요.';
  const s=this.abyssCurrent();
  if(type==='ABYSS_RESET')return a.retreat&&!s.active?'포기할 도전이 없습니다.':'';
  if(s.active?.phase==='BREAK')return '진행 중인 층을 먼저 마쳐 주세요.';
  return (!s.clears[a.floor]&&!(s.owed||[]).includes(a.floor))||s.claimed[a.floor]?'받을 수 있는 첫 정복 보상이 없습니다.':'';
 }
 const locked=this.abyssBreakReason(type,a);if(locked)return locked;
 return old.actionReason.call(this,type,a);
};
P.apply=function(a){
 if(/^ABYSS_/.test(a.type))this.abyssRoll();
 if(a.type==='ABYSS_ENTER')return this.startAbyss(a.floor);
 if(a.type==='ABYSS_REWARD')return this.claimAbyss(a.floor,a.equipment);
 if(a.type==='ABYSS_RESET'){
  const s=this.ensureAbyss();
  if(a.retreat){if(a.confirm!==true)fail('ABYSS_RETREAT','도전을 포기할지 확인해 주세요.');const floor=s.active.floor;s.active=null;return {retreat:true,floor};}
  if(a.confirm!==true)fail('ABYSS_RESET',MARK+'과 모든 층의 정복 기록을 함께 초기화할지 확인해 주세요.');
  s.tags={};s.clears={};s.active=null;s.resets++;s.run++;return {reset:true,run:s.run};
 }
 return old.apply.call(this,a);
};
P.enemyIntel=function(a,...rest){
 const info=old.enemyIntel?.call(this,a,...rest),b=this.s.runtime,target=typeof a==='string'?b?.actors.find(x=>x.id===a):a,r=roomOf(b);
 if(target?.abyssWarden&&r&&info){const text=r.hint;info.cards=[{id:'ABYSS_RULE',name:r.name,kind:'특성',passive:true,supported:true,description:text,condition:'',counter:'',element:'',target:''}];info.cues=[];info.counters=[];info.opportunities=[];info.warnings=[text];info.description=text;}
 return info;
};
P.newGame=function(...args){const out=old.newGame.apply(this,args);this.ensureAbyss();return out;};
const limitSum=f=>FLOORS[f-1].rooms.reduce((n,r)=>n+r.limit,0);
P.validateSave=function(s){
 this.installMarketContent();migrate(s);const out=old.validateSave.call(this,s);migrate(out);const a=out.abyss;
 if(a){
  const bad=m=>fail('ABYSS_SAVE',m);
  if(a.version!==VERSION||!api.abyssSeason.valid(a.season)||!a.tags||!a.clears||!a.claimed||!Number.isInteger(a.attempts)||a.attempts<0||!Number.isInteger(a.run)||a.run<1)bad('나선비경 기록이 손상되었습니다.');
  if(a.history!==undefined&&(!Array.isArray(a.history)||a.history.length>36||a.history.some(h=>!seasonParts(h?.season)||!Number.isInteger(h.floor)||h.floor<1||h.floor>12||!Number.isInteger(h.rounds)||h.rounds<0)))bad('나선비경 시즌 기록이 손상되었습니다.');
  if(a.owed!==undefined&&(!Array.isArray(a.owed)||a.owed.some(f=>!Number.isInteger(f)||f<1||f>12)))bad('나선비경 보상 기록이 손상되었습니다.');
  for(const [key,clear]of Object.entries(a.clears)){const f=Number(key);if(!Number.isInteger(f)||f<1||f>12||!Number.isInteger(clear.rounds)||clear.rounds<1||clear.rounds>limitSum(f)+3||f>1&&!a.clears[f-1])bad('층 정복 기록이 손상되었습니다.');}
  for(const key of Object.keys(a.claimed))if(!/^(?:[1-9]|1[0-2])$/.test(key))bad('보상 기록이 손상되었습니다.');
  for(const [id,f]of Object.entries(a.tags))if(!this.tables['07_CHAR_DB'].has(id)||!Number.isInteger(f)||f<1||f>12)fail('ABYSS_TAG',MARK+' 기록이 손상되었습니다.');
  const act=a.active,rb=out.runtime?.abyss;
  if(act&&(!FLOORS[act.floor-1]||![1,2,3].includes(act.chamber)||!['BATTLE','BREAK'].includes(act.phase)||!Array.isArray(act.party)||!act.party.includes('PLAYER_CUSTOM')||!Array.isArray(act.rounds)||act.rounds.length!==act.chamber-1))bad('진행 중인 층 기록이 손상되었습니다.');
  if(rb&&(!act||act.phase!=='BATTLE'||act.floor!==rb.floor||act.chamber!==rb.chamber||out.runtime.origin!==originId(act.floor,act.chamber)))bad('입장 기록과 진행 중인 전투가 일치하지 않습니다.');
  if(act?.phase==='BATTLE'&&!rb)bad('진행 중인 방 전투 기록이 없습니다.');
  // 0.14.12: a floor among 1–8 claimed under the old rule (an Inazuma pick) also pays its Primogems, once.
  for(const [key,c]of Object.entries(a.claimed)){const w=FLOORS[Number(key)-1]?.reward;if(w?.primogem&&c&&typeof c==='object'&&c.primogem===undefined){out.global.PRIMOGEM=(Number(out.global.PRIMOGEM)||0)+w.primogem;c.primogem=w.primogem;c.primogemLater=true;}}
 }
 return out;
};
})(globalThis);
