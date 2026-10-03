/* 0.15.2 업적 (user: 「탐험 도감. 이거. 업적이거든? 업적도 충~~~~분히 많이 만들어도 돼. 진짜 한 수백개는 만들어서 모으는 재미도
 * 붙이자.」). About three hundred achievements in eighteen groups, read from what the save already records (levels, maps,
 * oculi, chests, companions, bond, constellations, wishes, battles, bosses, the Abyss, commissions, gear) and from a few new
 * counters (cooking, crafting, life work, meals, 5★/4★ wishes, letters and trades). A finished achievement pays 원석 like
 * the original: 5, 10 or 20 by difficulty, taken with ACHIEVEMENT_CLAIM {achievement} (one id, or 'ALL').
 * Load last among the runtime modules: its counters wrap the other actions. */
(function(root){'use strict';
const api=root.CRPGRuntime,P=api?.Runtime?.prototype;if(!P||P.achievementsV0152)return;P.achievementsV0152=true;
const fail=(c,m)=>{throw new api.RuleError(c,m);},copy=x=>JSON.parse(JSON.stringify(x));
const REWARD={1:5,2:10,3:20},num=x=>Number(x)||0,json=(x,f={})=>{try{return JSON.parse(x||'')||f;}catch{return f;}};
const fmt=n=>Number(n).toLocaleString('ko-KR');
const jong=s=>{const c=String(s).charCodeAt(String(s).length-1)-0xAC00;return c>=0&&c<=11171&&c%28!==0;};
const wa=s=>s+(jong(s)?'과':'와'),ga=s=>s+(jong(s)?'이':'가'),eul=s=>s+(jong(s)?'을':'를');
const CATS=[['ADVENTURE','모험가의 길'],['MOND','몬드의 바람'],['LIYUE','리월의 바위'],['COMPANION','함께하는 동료'],['BOND','깊어지는 인연'],['CONSTELLATION','운명의 자리'],['WISH','소원의 별'],
 ['BATTLE','전투의 기록'],['BOSS','강적 토벌'],['MUTATION','변이 보스'],['ABYSS','나선비경'],['EVENT','지역 사건'],['RAID','공동 토벌전'],['QUEST','의뢰와 이야기'],['GEAR','무기와 장비'],
 ['LIFE','요리와 생활'],['SOCIAL','모험가 교류'],['TREASURE','보물 사냥']];
const LIFE={GATHER:'채집',MINE:'채광',FISH:'낚시',HUNT:'사냥'};
const old=Object.fromEntries(['apply','actionReason','validateSave','wishGrant'].map(k=>[k,P[k]]));
// ---------- the list ----------
// Built from the game's own tables, so the server and every game see the same ids.
function build(rt){
 const defs=[],add=(id,cat,name,desc,target,fact,tier=1,hidden=false)=>defs.push({id,cat,name,desc,target,fact,tier,hidden});
 const series=(id,cat,steps,desc,fact)=>steps.forEach(([n,name,tier],i)=>add(id+'_'+(i+1),cat,name,desc(n),n,fact,tier));
 // 모험가의 길
 series('LEVEL','ADVENTURE',[[2,'첫걸음',1],[5,'길 위의 모험가',1],[10,'이름이 알려지기 시작',2],[15,'두 나라를 잇는 발걸음',2],[20,'티바트를 누비는 자',3]],n=>'주인공 레벨 '+n+' 달성',f=>f.level);
 series('MORA','ADVENTURE',[[10000,'모라는 돌고 돈다',1],[50000,'두둑한 지갑',1],[100000,'모라 부자',2],[500000,'부의 신의 눈길',3]],n=>'모라 '+fmt(n)+' 모으기',f=>f.mora);
 series('TURN','ADVENTURE',[[100,'모험 일지 100쪽',1],[1000,'모험 일지 1,000쪽',2],[5000,'끝나지 않는 이야기',3]],n=>'행동 '+fmt(n)+'번 하기',f=>f.turn);
 series('CHAPTER','ADVENTURE',[[1,'이야기의 시작',1],[3,'이어지는 장',1],[5,'한 권의 책',2],[9,'두 나라의 이야기',3]],n=>'메인 스토리 '+n+'장 마치기',f=>f.chapters);
 series('VISIT','ADVENTURE',[[10,'발 닿는 대로',1],[30,'지도 위의 점들',1],[60,'티바트 여행자',2]],n=>'서로 다른 장소 '+n+'곳 가 보기',f=>f.visited);
 add('BROKE','ADVENTURE','빈털터리','주인공 Lv.5 이상일 때 모라를 모두 쓰기',1,f=>f.level>=5&&f.mora===0?1:0,1,true);
 // 몬드 · 리월
 for(const [cat,region,R] of [['MOND','몬드',{visit:['바람이 머무는 곳','몬드 산책','몬드의 지도 그리기','몬드 구석구석'],eye:['바람의 눈동자','바람 모으기','바람 신의 흔적','모든 바람의 눈동자'],eyes:[1,4,8,12],
  offer:['바람 신상에 바치다','더 깊은 공양','바람의 축복'],chest:['몬드의 첫 보물','보물 냄새','몬드의 보물 사냥꾼','몬드의 보물 전부'],hidden:'바람이 감춘 보물',boss:'몬드의 강적 토벌'}],
  ['LIYUE','리월',{visit:['바위가 지키는 땅','리월 나들이','리월의 지도 그리기','리월 구석구석'],eye:['바위의 눈동자','바위 모으기','바위 신의 흔적','모든 바위의 눈동자'],eyes:[1,4,8,16],
  offer:['바위 신상에 바치다','더 깊은 공양','바위의 축복'],chest:['리월의 첫 보물','반짝이는 모라 냄새','천암의 보물 사냥꾼','리월의 보물 전부'],hidden:'바위가 감춘 보물',boss:'리월의 강적 토벌'}]]){
  const r=cat;series(r+'_VISIT',cat,[[5,R.visit[0],1],[10,R.visit[1],1],[20,R.visit[2],2],[30,R.visit[3],3]],n=>region+'에서 서로 다른 장소 '+n+'곳 가 보기',f=>f.visitedBy[region]||0);
  series(r+'_EYE',cat,R.eyes.map((n,i)=>[n,R.eye[i],i<2?1:i===2?2:3]),n=>(cat==='MOND'?'바람':'바위')+'의 신의 눈동자 '+n+'개 찾기',f=>cat==='MOND'?f.anemo:f.geo);
  series(r+'_OFFER',cat,[[1,R.offer[0],1],[2,R.offer[1],2],[3,R.offer[2],3]],n=>(cat==='MOND'?'바람':'바위')+'의 신상에 '+n+'단계까지 공양하기',f=>cat==='MOND'?f.anemoTiers:f.geoTiers);
  series(r+'_CHEST',cat,[[1,R.chest[0],1],[6,R.chest[1],1],[12,R.chest[2],2],[24,R.chest[3],3]],n=>region+' 보물상자 '+n+'개 열기',f=>f.chestsBy[cat]||0);
  add(r+'_HIDDEN',cat,R.hidden,region+'의 숨은 보물 6개 모두 찾기',6,f=>f.hiddenBy[cat]||0,3);
  const bosses=Object.entries(api.fieldBosses?.bosses||{}).filter(([,d])=>d.region===region).map(([id])=>id);
  if(bosses.length)add(r+'_BOSSES',cat,R.boss,region+'의 필드 보스 '+bosses.length+'종 모두 토벌하기',bosses.length,f=>bosses.filter(id=>(f.fieldWins[id]||0)>0).length,2);
 }
 series('GEO_TRAIL','LIYUE',[[1,'바위의 길을 따라',1],[3,'모든 바위의 길',2]],n=>'바위의 길 '+n+'곳 완주하기',f=>f.trails);
 // 동료
 series('JOINED','COMPANION',[[1,'혼자가 아니야',1],[4,'파티 결성',1],[8,'든든한 동료들',1],[15,'모험가 길드의 인기인',2],[25,'발 넓은 모험가',2],[40,'모두가 친구',3]],n=>'동료 '+n+'명과 함께하기',f=>f.joined.size);
 series('FIVE_STAR','COMPANION',[[1,'빛나는 별',2],[5,'별들의 모임',3]],n=>'5★ 동료 '+n+'명과 함께하기',f=>f.joined5);
 const people=rt.rows('04_CHAR_DB').filter(r=>['몬드','리월'].includes(r[3])&&rt.tables['07_CHAR_DB'].has(r[1]));
 for(const r of people)add('JOIN_'+r[1],'COMPANION',wa(r[2])+' 함께',ga(r[2])+' 동료로 합류',1,f=>f.joined.has(r[1])?1:0,1);
 // 인연
 series('HEART','BOND',[[1,'첫 번째 하트',1],[5,'다섯 명의 친구',1],[10,'열 명의 친구',2]],n=>'호감도 하트가 1개 이상인 동료 '+n+'명',f=>f.hearts1);
 series('HEART5','BOND',[[1,'최고의 파트너',2],[3,'믿음직한 동료들',2],[10,'깊은 인연의 모험가',3]],n=>'호감도 하트 5개인 동료 '+n+'명',f=>f.hearts5);
 series('AFFECTION','BOND',[[1,'함께한 이야기',1],[5,'추억 쌓기',1],[15,'수많은 추억',2],[40,'이야기 수집가',3]],n=>'호감도 이야기 '+n+'편 마치기',f=>f.affections);
 series('LEGEND','BOND',[[1,'첫 개인 임무',1],[5,'동료의 사정',1],[10,'모두의 이야기',2],[20,'개인 임무의 달인',3]],n=>'동료 개인 임무 '+n+'개 마치기',f=>f.legends);
 // 운명의 자리
 add('CONS_FIRST','CONSTELLATION','첫 번째 별자리','동료의 운명의 자리를 처음으로 열기',1,f=>f.consCount,1);
 series('CONS_MANY','CONSTELLATION',[[3,'별자리 수집가',1],[10,'밤하늘을 수놓다',2]],n=>'운명의 자리를 연 동료 '+n+'명',f=>f.consCount);
 series('CONS_MAX','CONSTELLATION',[[3,'세 번째 별',2],[6,'완성된 운명',3]],n=>'한 동료의 운명의 자리 '+n+'단계 열기',f=>f.consMax);
 series('CONS_HERO','CONSTELLATION',[[1,'주인공의 별',1],[3,'빛나는 주인공',2],[6,'운명을 개척한 자',3]],n=>'주인공의 운명의 자리 '+n+'단계 열기',f=>f.consHero);
 // 기원
 series('WISH','WISH',[[1,'첫 번째 소원',1],[10,'열 번의 소원',1],[50,'소원의 무게',1],[100,'백 번의 기도',2],[300,'별이 쏟아지는 밤',3]],n=>'기원 '+n+'번 하기',f=>f.wishes);
 series('WISH5','WISH',[[1,'금빛 행운',2],[3,'세 번의 금빛',2],[5,'운명의 총아',3]],n=>'기원에서 5★ '+n+'번 만나기',f=>f.wish5);
 series('WISH4','WISH',[[5,'보랏빛 행운',1],[20,'보라색 수집가',1],[50,'보랏빛 밤하늘',2]],n=>'기원에서 4★ '+n+'번 만나기',f=>f.wish4);
 // 전투
 series('WIN','BATTLE',[[1,'첫 승리',1],[10,'익숙해진 칼끝',1],[50,'백전노장의 시작',1],[100,'백 번의 승리',2],[300,'전장의 지배자',2],[1000,'천 번의 승리',3]],n=>'전투 '+fmt(n)+'번 이기기',f=>f.wins);
 series('LOSS','BATTLE',[[1,'실패는 성공의 어머니',1],[10,'넘어져도 다시',1]],n=>'전투에서 '+n+'번 지기',f=>f.losses);
 series('ROAD','BATTLE',[[10,'길 위의 싸움',1],[50,'길목의 수호자',2],[150,'마물 사냥꾼',2]],n=>'이동 중 만난 마물과 '+n+'번 싸워 이기기',f=>f.randomWins);
 // 강적
 series('FB_TOTAL','BOSS',[[1,'첫 토벌',1],[10,'토벌 전문가',2],[30,'강적 사냥꾼',2],[100,'필드 보스의 천적',3]],n=>'필드 보스 '+n+'번 토벌하기',f=>Object.values(f.fieldWins).reduce((a,b)=>a+b,0));
 for(const [id,d] of Object.entries(api.fieldBosses?.bosses||{})){add('FB_'+id,'BOSS',d.name+' 토벌',eul(d.name)+' 처음으로 토벌',1,f=>f.fieldWins[id]||0,1);add('FB10_'+id,'BOSS',d.name+'의 천적',eul(d.name)+' 10번 토벌',10,f=>f.fieldWins[id]||0,2);}
 const DAILY=[['BOSS_ANDRIUS','안드리우스'],['BOSS_DVALIN','드발린'],['LIYUE_TARTAGLIA_FARM','타르탈리아'],['LIYUE_AZHDAHA_FARM','야타용왕']];
 for(const [key,n] of DAILY){add('DAILY_'+key,'BOSS',n+' 재도전',n+'의 재도전에서 이기기',1,f=>f.dailyWins[key]||0,1);add('DAILY10_'+key,'BOSS','다시 만난 '+n,n+'의 재도전에서 10번 이기기',10,f=>f.dailyWins[key]||0,2);}
 // 변이 보스
 series('MUT','MUTATION',[[1,'변이를 꺾다',1],[5,'변이 사냥꾼',1],[15,'변이 전문가',2],[50,'변이의 천적',3]],n=>'변이 도전에서 '+n+'번 이기기',f=>f.mutTotal);
 for(const [key,b] of Object.entries(api.mutationsV0152?.bosses||{}))add('MUT_'+key,'MUTATION','변이한 '+b.name,'변이 도전에서 '+eul(b.name)+' 이기기',1,f=>f.mutWins[key]||0,2);
 // 나선비경
 for(let n=1;n<=12;n++)add('ABYSS_'+n,'ABYSS','나선비경 '+n+'층','나선비경 '+n+'층 처음으로 정복',1,f=>f.abyss.has(n)?1:0,n<=4?1:n<=8?2:3);
 series('MEDAL','ABYSS',[[1,'나선 문장',2],[3,'빛나는 나선 문장',3]],n=>'나선 문장 '+n+'개 받기',f=>f.medals);
 // 지역 사건
 series('EVENT','EVENT',[[1,'무슨 일이지?',1],[10,'오지랖 모험가',1],[30,'지역의 해결사',2],[100,'티바트의 해결사',3]],n=>'지역 사건 '+n+'번 해결하기',f=>f.events);
 const EV={AMBUSH:['매복 격퇴','매복 사냥꾼'],ELITE:['거친 마물 사냥','거친 마물의 천적'],INJURED:['다친 사람을 돕다','길 위의 의사'],CHEST:['수상한 상자를 열다','상자 감별사'],PUZZLE:['원소 장치를 풀다','장치의 달인'],
  LOST:['길 안내','친절한 길잡이'],MERCHANT:['떠돌이 상인의 손님','상인의 단골'],CACHE:['흩어진 화물 줍기','화물 수색대'],REQUEST:['부탁을 들어주다','믿음직한 해결사']};
 for(const [kind,[a,b]] of Object.entries(EV)){const nm=api.regionEventsV0152?.kinds?.[kind]?.name||kind;add('EVENT1_'+kind,'EVENT',a,'지역 사건 「'+nm+'」 해결하기',1,f=>f.eventBy[kind]||0,1);add('EVENT10_'+kind,'EVENT',b,'지역 사건 「'+nm+'」 10번 해결하기',10,f=>f.eventBy[kind]||0,2);}
 // 공동 토벌전
 series('RAID_RUN','RAID',[[1,'함께 싸우는 힘',1],[10,'꾸준한 참전',1],[30,'토벌의 선봉',2],[100,'공동 토벌의 기둥',3]],n=>'공동 토벌전에 '+n+'번 출격하기',f=>f.raidRuns);
 series('RAID_HIT','RAID',[[100,'백 번의 일격',1],[500,'쉬지 않는 손',1],[1000,'천 번의 일격',2],[5000,'끝없는 연타',3]],n=>'공동 토벌전에서 모두 '+fmt(n)+'번 맞히기',f=>f.raidHits);
 series('RAID_BEST','RAID',[[30,'연타의 시작',1],[60,'폭풍 연타',2],[100,'백 연타',3]],n=>'공동 토벌전 한 번의 출격에서 '+n+'번 맞히기',f=>f.raidBest);
 // 의뢰
 series('COMMISSION','QUEST',[[1,'첫 의뢰',1],[10,'믿음직한 모험가',1],[30,'길드의 단골',2],[60,'게시판을 비우다',3]],n=>'의뢰 '+n+'개 마치기',f=>f.commissions);
 series('PERFECT','QUEST',[[1,'깔끔한 현장 조사',1],[10,'완벽주의자',2]],n=>'현장 조사를 실수 없이 '+n+'번 마치기',f=>f.perfect);
 // 장비
 series('GEAR_OWN','GEAR',[[5,'무기 수집',1],[15,'무기고',1],[30,'장비 박물관',2]],n=>'장비 '+n+'개 가지기',f=>f.gear);
 series('ENHANCE','GEAR',[[5,'단련된 무기',1],[10,'극한의 담금질',2],[12,'전설의 단련',3]],n=>'장비 하나를 +'+n+'까지 강화하기',f=>f.enhance);
 series('ARTIFACT','GEAR',[[1,'첫 성유물',1],[5,'성유물 수집가',2]],n=>'성유물 '+n+'개 가지기',f=>f.artifacts);
 add('ARTIFACT_MAX','GEAR','완성된 성유물','성유물 하나를 +5까지 강화하기',5,f=>f.artifactMax,2);
 series('EXCLUSIVE','GEAR',[[1,'나만의 무기',2],[3,'전용 무기 수집가',3]],n=>'전용 무기 '+n+'개 가지기',f=>f.exclusive);
 // 생활
 series('COOK','LIFE',[[1,'첫 요리',1],[10,'요리 입문',1],[50,'주방의 주인',2],[150,'티바트의 미식가',3]],n=>'요리 '+n+'번 하기',f=>f.cooked);
 series('CRAFT','LIFE',[[1,'첫 제작',1],[10,'손재주',1],[50,'장인의 손',2]],n=>'요리가 아닌 제작 '+n+'번 하기',f=>f.crafted);
 series('MEAL','LIFE',[[5,'든든한 식사',1],[30,'밥심',1]],n=>'식사 '+n+'번 하기',f=>f.meals);
 const LF={GATHER:['풀잎 줍기','채집 습관','채집의 달인'],MINE:['광석 캐기','광부의 하루','광맥의 주인'],FISH:['첫 입질','낚시꾼','강태공'],HUNT:['사냥 입문','숲의 사냥꾼','명사수']};
 for(const [k,names] of Object.entries(LF))series('LIFE_'+k,'LIFE',[[5,names[0],1],[30,names[1],1],[100,names[2],2]],n=>LIFE[k]+' '+n+'번 하기',f=>f.life[k]||0);
 // 교류
 series('LETTER','SOCIAL',[[1,'첫 편지',1],[10,'편지 친구',1]],n=>'편지 '+n+'통 보내기',f=>f.social.letters||0);
 series('BUY','SOCIAL',[[1,'시장의 첫 손님',1],[10,'단골 손님',1]],n=>'시장에서 '+n+'번 사기',f=>f.social.bought||0);
 series('LIST','SOCIAL',[[1,'가게 개업',1],[10,'번창하는 상점',1]],n=>'내 상점에 물건 '+n+'번 올리기',f=>f.social.listed||0);
 series('DEAL','SOCIAL',[[1,'첫 거래',1],[10,'거래의 달인',2]],n=>'직접 거래 '+n+'번 하기',f=>f.social.deals||0);
 // 보물
 series('CHEST','TREASURE',[[1,'첫 보물상자',1],[12,'보물상자 열두 개',1],[24,'보물 사냥꾼',2],[48,'티바트의 보물 전부',3]],n=>'보물상자 '+n+'개 열기',f=>f.chests);
 // Puzzles (chests and regional events; 0.15.2 has 28 kinds).
 const GAMES=api.chestRules?.games||{},kinds=Object.keys(GAMES).length;
 series('PUZZLE','TREASURE',[[1,'첫 수수께끼',1],[10,'퍼즐 애호가',1],[50,'수수께끼 사냥꾼',2],[150,'퍼즐의 현자',3]],n=>'퍼즐 '+n+'개 풀기',f=>f.puzzleTotal);
 series('PUZZLE_KINDS','TREASURE',[[5,'다양한 수수께끼',1],[15,'퍼즐 박사',2],[kinds,'모든 퍼즐을 풀다',3]],n=>'서로 다른 퍼즐 '+n+'종류 풀기',f=>f.puzzleKinds);
 for(const [g,n] of Object.entries(GAMES))add('PUZZLE_'+g,'TREASURE',n+' 해결','「'+n+'」 퍼즐 풀기',1,f=>f.puzzles[g]||0,1);
 series('HIDDEN','TREASURE',[[1,'숨은 보물',1],[6,'숨은 보물 사냥꾼',2],[12,'모든 숨은 보물',3]],n=>'숨은 보물 '+n+'개 찾기',f=>f.hidden);
 return defs;
}
P.achievementDefs=function(){return this._achDefs??=build(this);};
// ---------- what the save says ----------
P.achievementFacts=function(){
 const s=this.s,g=s.global,f={level:num(g.PLAYER_LEVEL_STATE)||1,mora:num(g.MORA),turn:num(g.TURN)};
 const maps=this.tables['32_MAP_DB'],visited=Object.keys(s.exploration?.visitedMaps||{});f.visited=visited.length;f.visitedBy={};for(const id of visited){const reg=maps.get(id)?.[1];if(reg)f.visitedBy[reg]=(f.visitedBy[reg]||0)+1;}
 f.anemo=Object.keys(s.exploration?.oculi||{}).length;f.anemoTiers=(s.exploration?.tiers||[]).length;f.geo=Object.keys(s.geoOculi?.receipts||{}).length;f.geoTiers=(s.geoOculi?.tiers||[]).length;f.trails=Object.keys(s.geoTrail?.claims||{}).length;
 const chestInfo=new Map((api.chestRules?.chests||[]).map(c=>[c.id,c])),opened=Object.keys(s.chests?.opened||{});f.chests=opened.length;f.chestsBy={};f.hiddenBy={};f.hidden=0;f.games={};
 for(const id of opened){const c=chestInfo.get(id);if(!c)continue;f.chestsBy[c.region]=(f.chestsBy[c.region]||0)+1;if(c.game)f.games[c.game]=(f.games[c.game]||0)+1;else{f.hidden++;f.hiddenBy[c.region]=(f.hiddenBy[c.region]||0)+1;}}
 const elig=json(g.COMPANION_ELIGIBILITY_JSON);f.joined=new Set(Object.entries(elig).filter(([,v])=>v?.state==='JOINED').map(([k])=>k));f.joined5=[...f.joined].filter(id=>(this.rarityOf?.(id)||4)>=5).length;
 f.hearts1=0;f.hearts5=0;f.affections=0;for(const r of Object.values(s.relations||{})){const score=num(r?.BOND_SCORE??num(r?.heart)*20);if(score>=20)f.hearts1++;if(score>=100)f.hearts5++;f.affections+=Object.values(r?.events||{}).filter(v=>v==='COMPLETE').length;}
 try{const route=g.STORY_ROUTE_ID;f.legends=[...this.storyIndex().legends.values()].filter(d=>d.ROUTE_SCOPE===route&&this.storyDone(d.id)).length;}catch{f.legends=0;}
 const cons=s.constellations||{};f.consCount=Object.entries(cons).filter(([k,v])=>k!=='PLAYER_CUSTOM'&&num(v)>0).length;f.consMax=Math.max(0,...Object.entries(cons).filter(([k])=>k!=='PLAYER_CUSTOM').map(([,v])=>num(v)));f.consHero=num(cons.PLAYER_CUSTOM);
 const st=this.achievementStats(false);f.wishes=num(s.wish?.EVENT?.total)+num(s.wish?.STANDARD?.total);f.wish5=st.wish5;f.wish4=st.wish4;
 f.wins=0;f.losses=0;f.randomWins=0;f.dailyWins={};
 for(const r of Object.values(s.combatReceipts||{})){if(!r)continue;if(r.victory){f.wins++;const o=String(r.origin||'');if(o==='RANDOM')f.randomWins++;if(o.startsWith('MATERIAL_CHALLENGE:')){const k=o.slice(19);f.dailyWins[k]=(f.dailyWins[k]||0)+1;}}else if(r.result==='DEFEAT')f.losses++;}
 f.fieldWins=Object.fromEntries(Object.entries(s.fieldBossNotes||{}).map(([k,v])=>[k,num(v?.wins)]));
 f.mutTotal=num(s.mutations?.total);f.mutWins=copy(s.mutations?.ever||{});
 f.abyss=new Set(Object.keys(s.abyss?.claimed||{}).map(Number));try{f.medals=(this.abyssView?.()?.medals||[]).length;}catch{f.medals=0;}
 f.events=num(s.regionEvents?.count);f.eventBy=copy(s.regionEvents?.total||{});
 f.raidRuns=num(s.raid?.lifetime?.runs);f.raidHits=num(s.raid?.lifetime?.hits);f.raidBest=num(s.raid?.lifetime?.best);
 f.commissions=0;f.perfect=0;for(const [id,q] of Object.entries(s.quests||{})){if(!q?.claimed)continue;let c=false;try{c=this.isCommission?.(id);}catch{}if(c){f.commissions++;if(q.scene&&q.scene.mistakes===0)f.perfect++;}}
 f.chapters=Object.entries(s.quests||{}).filter(([id,q])=>/^Q_(TRV|ISK)_/.test(id)&&q?.state==='완료').length;
 const eq=this.tables['16_EQUIP_DB'],inv=(s.inventory||[]).filter(i=>i.equip);f.gear=inv.length;f.enhance=Math.max(0,...inv.map(i=>num(i.enhance)));
 f.artifacts=inv.filter(i=>i.artifact).length;f.artifactMax=Math.max(0,...inv.filter(i=>i.artifact).map(i=>num(i.artifact.level)));
 f.exclusive=new Set(inv.filter(i=>{const r=eq.get(i.equip);return /^EQ_EX_/.test(i.equip)||/^(MOND|LIYUE)_/.test(String(r?.[30]||''));}).map(i=>i.equip)).size;
 f.cooked=st.cooked;f.crafted=st.crafted;f.meals=st.meals;f.life=copy(st.life);f.social=copy(st.social);f.puzzles=copy(st.puzzles||{});f.puzzleTotal=Object.values(f.puzzles).reduce((a,b)=>a+b,0);f.puzzleKinds=Object.values(f.puzzles).filter(n=>n>0).length;
 return f;
};
// New counters; the 5★/4★ tally starts from the wishes still in the history.
P.achievementStats=function(create=true){
 const s=this.s.stats;if(s?.version===1)return s;
 const h=this.s.wish?.history||[],fresh={version:1,cooked:0,crafted:0,meals:0,life:{},wish5:h.filter(x=>x.rarity===5).length,wish4:h.filter(x=>x.rarity===4).length,social:{},puzzles:{}};
 for(const id of Object.keys(this.s.chests?.opened||{})){const g=(api.chestRules?.chests||[]).find(c=>c.id===id)?.game;if(g)fresh.puzzles[g]=(fresh.puzzles[g]||0)+1;}
 if(create)this.s.stats=fresh;return fresh;
};
P.achievementCount=function(key,n=1){const st=this.achievementStats();st.social[key]=num(st.social[key])+n;};
// ---------- views and claims ----------
P.achievementView=function(){
 const f=this.achievementFacts(),claimed=this.s.achievements?.claimed||{},list=this.achievementDefs().map(d=>{const v=Math.max(0,num(d.fact(f)));return {id:d.id,cat:d.cat,name:d.name,desc:d.desc,tier:d.tier,reward:REWARD[d.tier],target:d.target,progress:Math.min(v,d.target),done:v>=d.target,claimed:!!claimed[d.id],hidden:d.hidden&&v<d.target};});
 const cats=CATS.map(([id,name])=>{const items=list.filter(x=>x.cat===id);return {id,name,total:items.length,done:items.filter(x=>x.done).length,claimable:items.filter(x=>x.done&&!x.claimed).length};}).filter(c=>c.total);
 return {list,cats,total:list.length,done:list.filter(x=>x.done).length,claimable:list.filter(x=>x.done&&!x.claimed).length,primogem:{gained:list.filter(x=>x.claimed).reduce((n,x)=>n+x.reward,0),all:list.reduce((n,x)=>n+x.reward,0)}};
};
P.achievementReason=function(id){
 if(this.s.runtime)return '전투가 끝난 뒤 받을 수 있습니다.';
 const v=this.achievementView(),ready=v.list.filter(x=>x.done&&!x.claimed);
 if(id==='ALL')return ready.length?'':'받을 업적 보상이 없습니다.';
 const a=v.list.find(x=>x.id===id);if(!a)return '업적을 찾을 수 없습니다.';if(a.claimed)return '이미 받은 업적 보상입니다.';if(!a.done)return '아직 달성하지 않은 업적입니다.';return '';
};
P.achievementClaim=function(id){
 const why=this.achievementReason(id);if(why)fail('ACHIEVEMENT',why);
 const v=this.achievementView(),targets=id==='ALL'?v.list.filter(x=>x.done&&!x.claimed):v.list.filter(x=>x.id===id),box=this.s.achievements??={version:1,claimed:{}};
 let primogem=0;for(const a of targets){box.claimed[a.id]=1;primogem+=a.reward;}
 this.s.global.PRIMOGEM=num(this.s.global.PRIMOGEM)+primogem;
 return {claimed:targets.map(a=>a.id),names:targets.map(a=>a.name),primogem};
};
// ACHIEVEMENT_CLAIM {achievement: id | 'ALL'} (not `id`: that is the action's own id).
P.actionReason=function(type,a={}){if(type==='ACHIEVEMENT_CLAIM')return this.achievementReason(String(a.achievement||''));return old.actionReason.call(this,type,a);};
P.apply=function(a){
 if(a?.type==='ACHIEVEMENT_CLAIM')return this.achievementClaim(String(a.achievement||''));
 // Counters for what the save keeps no history of. The record is made before the action (its first tally reads the
 // opened chests, which would count this chest twice).
 const t=a?.type,counted=['CRAFT','LIFE_FINISH','MEAL_BATCH','CHEST_OPEN','REGION_EVENT'].includes(t);if(counted)this.achievementStats();
 const out=old.apply.call(this,a);
 try{
  if(!counted)return out;const st=this.achievementStats();st.puzzles??={};
  const solved=t==='CHEST_OPEN'?(api.chestRules?.chests||[]).find(c=>c.id===out?.chest)?.game:t==='REGION_EVENT'?out?.game:null;if(solved)st.puzzles[solved]=num(st.puzzles[solved])+1;
  if(t==='CRAFT'){if(this.tables['17_RECIPE_DB'].get(a.recipe)?.[1]==='요리')st.cooked++;else st.crafted++;}
  if(t==='LIFE_FINISH'&&LIFE[out?.kind])st.life[out.kind]=num(st.life[out.kind])+1;
  if(t==='MEAL_BATCH')st.meals+=Array.isArray(a.meals)?Math.min(10,a.meals.length):1;
 }catch{}
 return out;
};
if(old.wishGrant)P.wishGrant=function(r){const st=this.achievementStats(),out=old.wishGrant.call(this,r);if(r?.rarity===5)st.wish5++;else if(r?.rarity===4)st.wish4++;return out;};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s)||s,bad=()=>fail('ACHIEVEMENT_SAVE','업적 기록이 올바르지 않습니다.');
 const a=out.achievements;if(a!==undefined){if(!a||a.version!==1||!a.claimed||typeof a.claimed!=='object')bad();const ids=new Set(this.achievementDefs().map(d=>d.id));for(const [k,v] of Object.entries(a.claimed))if(!ids.has(k)||v!==1)bad();}
 const st=out.stats;if(st!==undefined){const ok=n=>Number.isInteger(n)&&n>=0;if(!st||st.version!==1||![st.cooked,st.crafted,st.meals,st.wish5,st.wish4].every(ok)||!st.life||!st.social||Object.values(st.life).some(n=>!ok(n))||Object.values(st.social).some(n=>!ok(n))||(st.puzzles!==undefined&&(!st.puzzles||typeof st.puzzles!=='object'||Object.entries(st.puzzles).some(([g,n])=>!api.chestRules?.games?.[g]||!ok(n)))))bad();}
 return out;
};
api.achievementsV0152={cats:copy(CATS),reward:copy(REWARD)};
})(globalThis);
