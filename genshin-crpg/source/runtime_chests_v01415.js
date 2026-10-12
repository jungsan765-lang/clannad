/* 0.14.15 보물상자. User: 「보물상자를 만들 때가 됐어. 원석도 조금(적당히). 몬드는 쉬운 편, 몇 개는 숨기고 나머지는
 * 미니게임 퍼즐(틀린그림 찾기, 그림 퍼즐, 스도쿠…). 처음에는 V로 보면 바로 찾을 수 있게, 나중에는 V만으로는 볼 수 없게.
 * 진짜 구석구석 숨겨 — 지도의 일그러짐, 페이몬 메뉴, 기원, 설정… 어느 장소에 있을 때만 보이게.」
 *  - 퍼즐 상자 (몬드 18, 리월 18): 그 장소의 풍경(V)에 보이고, 미니게임을 풀면 열린다. 몬드는 쉬운 판, 리월은 어려운 판.
 *  - 숨은 상자 (몬드 6, 리월 6): 처음 두 개는 풍경(V)에 그대로 보이고, 나머지는 밤에만 보이거나, 그 장소에 서 있을 때만
 *    지도·페이몬 메뉴·설정·기원·핸드북·가방·캐릭터 화면 한구석에 나타난다.
 * 원석은 몬드 580, 리월 690 (모두 1,270, 기원 약 8회). 2.0 레이드 보상을 위해 이보다 늘리지 않는다.
 * 퍼즐은 상자와 여정마다 다른 씨앗으로 만들어지고, 서버가 같은 규칙으로 답을 확인한다. */
(function(root){
'use strict';
const api=root.CRPGRuntime,P=api.Runtime.prototype,fail=(c,m)=>{throw new api.RuleError(c,m);};
const old=Object.fromEntries(['actionReason','apply','validateSave','newGame','startBattle','finishBattle','fieldBattlePolicy'].map(k=>[k,P[k]]));
// 0.16.33: the 진귀한 보물상자 (HoYoLAB map's official name) sits between 정교한 and 화려한, as in the game.
const TIER={COMMON:{name:'평범한 보물상자',icon:'common'},EXQUISITE:{name:'정교한 보물상자',icon:'exquisite'},PRECIOUS:{name:'진귀한 보물상자',icon:'precious'},LUXURIOUS:{name:'화려한 보물상자',icon:'luxurious'}};
const GAME={SPOT:'틀린 그림 찾기',SWAP:'그림 맞추기',SLIDE:'밀어서 그림 맞추기',SUDOKU:'스도쿠',LIGHTS:'석판 밝히기'};
const HOW={SCENERY:'풍경',SCENERY_NIGHT:'밤 풍경',MENU:'페이몬 메뉴',MAP:'지도',SETTINGS:'설정',WISH:'기원',HANDBOOK:'모험가 핸드북',BAG:'가방',STATUS:'캐릭터 화면',
 CHALLENGE:'도전',TOTEM:'원소 비석',SCENERY_DAWN:'새벽 풍경',SCENERY_NOON:'한낮 풍경',SCENERY_DUSK:'노을 풍경'};
// The hours a time chest shows in the scenery (the world's clock; 「1시간 대기」 brings them).
const TIMES={SCENERY_DAWN:[5,8,'새벽(5시~8시)'],SCENERY_NOON:[11,14,'한낮(11시~14시)'],SCENERY_DUSK:[17,19,'노을(17시~19시)']};
const ELEMENT_NAME={PYRO:'불',HYDRO:'물',ANEMO:'바람',ELECTRO:'번개',CRYO:'얼음',GEO:'바위',DENDRO:'풀'};
const CH_ORIGIN='CHEST:';
// Puzzle sizes: Mond is the gentle region, Liyue the harder one.
const LEVEL={MOND:{SPOT:3,SWAP:3,SUDOKU:4,LIGHTS:3},LIYUE:{SPOT:5,SLIDE:3,SUDOKU:6,LIGHTS:4}};
const M_ITEMS=[{MAT_CHAR_EXP_ADVENTURER:1},{ORE_WHITE_IRON:2},{ORE_CRYSTAL:1}],L_ITEMS=[{MAT_CHAR_EXP_ADVENTURER:2},{ORE_CRYSTAL:2},{MAT_CHAR_EXP_HERO:1}];
const puzzle=(region,list)=>list.map(([map,game],i)=>({region,map,game,tier:'EXQUISITE',how:'SCENERY',reward:region==='MOND'?{primogem:20,mora:1200,items:M_ITEMS[i%3]}:{primogem:25,mora:2000,items:L_ITEMS[i%3]}}));
// 0.15.2: the 18 puzzle chests of each region use the new games too (runtime_puzzles_v0152.js; user: 「퍼즐도 종류를 좀 확
// 늘려서 재미를 붙이게 해줘」). Spot-the-difference stays in the two cities.
const MOND_PUZZLES=puzzle('MOND',[['MAP_MOND_CITY','SPOT'],['MAP_MOND_PLAINS','ROTATE'],['MAP_MOND_FOREST','NONOGRAM'],['MAP_MOND_WINDRISE','LIGHTS'],['MAP_MOND_SPRINGVALE','PAIRS'],['MAP_MOND_WOLVENDOM','MAZE'],
 ['MAP_MOND_DAWN_WINERY','SUDOKU'],['MAP_CRPG_STARFELL_LAKE','CONSTELLATION'],['MAP_MOND_THOUSAND_WINDS','MEMGRID'],['MAP_CRPG_STORMBEARER_MOUNTAINS','PIPES'],['MAP_CRPG_FALCON_COAST','WORD'],['MAP_CRPG_DADAUPA_GORGE','HANOI'],
 ['MAP_CRPG_CAPE_OATH','MINES'],['MAP_CRPG_BRIGHTCROWN_CANYON','SWAP'],['MAP_CRPG_DRAGONSPINE_CAMP','FLOOD'],['MAP_CRPG_SNOW_COVERED_PATH','SIMON'],['MAP_CRPG_WYRMREST_VALLEY','MASTERMIND'],['MAP_CRPG_STARGLOW_CAVERN','MIRRORS']]);
const LIYUE_PUZZLES=puzzle('LIYUE',[['MAP_LIYUE_HARBOR','SPOT'],['MAP_LIYUE_PLAINS','SLIDE'],['MAP_LIYUE_MOUNTAINS','SUDOKU'],['MAP_LIYUE_QINGCE','LIGHTS'],['MAP_LIYUE_JUEYUN','CONSTELLATION'],['MAP_CHASM_SURFACE','MINES'],
 ['MAP_LY_DETAIL_FEIYUN','WORD'],['MAP_LY_DETAIL_YUJING','NONOGRAM'],['MAP_LY_DETAIL_WANGSHU','QUIZ'],['MAP_LY_DETAIL_DIHUA','PAIRS'],['MAP_LY_DETAIL_GUILI','MASTERMIND'],['MAP_LY_DETAIL_MINGYUN','PIPES'],
 ['MAP_LY_DETAIL_LUHUA','SYMMETRY'],['MAP_LY_DETAIL_AOCANG','MIRRORS'],['MAP_LY_DETAIL_QINGYUN','DIALS'],['MAP_LY_DETAIL_HUAGUANG','LIGHTS_X'],['MAP_LY_DETAIL_TIANHENG','HANOI'],['MAP_LY_DETAIL_GUYUN','FLOOD']]);
// Hidden chests. The game never says where they are (user: 「보물이 어딨는지 다 알려줘? 그건 안 알려줘도 돼」).
// `spot` places the map shimmer on the region atlas (source/terrain_map.js coordinates).
const hidden=(region,map,how,tier,primogem,extra={})=>({region,map,game:null,tier,how,reward:{primogem,mora:region==='MOND'?2500:4000,items:region==='MOND'?{MAT_CHAR_EXP_HERO:1}:{MAT_CHAR_EXP_HERO:2}},...extra});
const MOND_HIDDEN=[
 hidden('MOND','MAP_CRPG_CIDER_BANK','SCENERY','COMMON',30),
 hidden('MOND','MAP_CRPG_WHISPER_HUNT','SCENERY','COMMON',30),
 hidden('MOND','MAP_MOND_STARSNATCH_CLIFF','SCENERY_NIGHT','LUXURIOUS',40),
 hidden('MOND','MAP_MOND_WINDRISE','MENU','LUXURIOUS',40),
 hidden('MOND','MAP_CRPG_CAPE_OATH','MAP','LUXURIOUS',40,{spot:['mond',716,566]}),
 hidden('MOND','MAP_CRPG_SPRING_POOL','SETTINGS','LUXURIOUS',40)];
const LIYUE_HIDDEN=[
 hidden('LIYUE','MAP_LIYUE_HARBOR','WISH','LUXURIOUS',40,{night:true}),
 hidden('LIYUE','MAP_LY_DETAIL_YAOGUANG','HANDBOOK','LUXURIOUS',40),
 hidden('LIYUE','MAP_LY_DETAIL_QINGXU','MAP','LUXURIOUS',40,{spot:['liyue',244,712]}),
 hidden('LIYUE','MAP_LY_DETAIL_NANTIANMEN','BAG','LUXURIOUS',40),
 hidden('LIYUE','MAP_LY_DETAIL_DUNYU','STATUS','LUXURIOUS',40),
 hidden('LIYUE','MAP_LY_DETAIL_TIANQIU','SCENERY_NIGHT','LUXURIOUS',40)];
// 0.16.33 (TODO 4-7, user: 「4장 하면서 이거 다 개선해」): 24 more chests in each region, about twice as many, and more 원석
// (Mond 580→1,210, Liyue 690→1,435). Three new kinds, all found in the place's scenery (V) and never named on any list:
//  - 도전 상자: a fight against the place's monsters; won within its rounds, the chest appears there to be opened.
//  - 원소 비석 상자: stones of elements; each is lit by a party member of that element, so the party has to be brought.
//  - 때를 맞춘 상자: seen only at dawn, at noon or at dusk (the night ones already existed).
// Rounds: about what a level-matched 4★ party with the place's gear needs (fights of tests/test_chests_v01633.cjs).
const challenge=(region,map,rounds,primogem,mora,items)=>({region,map,game:null,tier:'PRECIOUS',how:'CHALLENGE',kind:'CHALLENGE',rounds,reward:{primogem,mora,items}});
const totem=(region,map,elements,primogem,mora,items)=>({region,map,game:null,tier:'PRECIOUS',how:'TOTEM',kind:'TOTEM',totem:elements,reward:{primogem,mora,items}});
const timed=(region,map,how,tier,primogem,mora,items)=>({region,map,game:null,tier,how,kind:'TIME',reward:{primogem,mora,items}});
const MOND_NEW=[
 ...[['MAP_MOND_PLAINS',3],['MAP_MOND_FOREST',3],['MAP_MOND_WINDRISE',4],['MAP_V141_STORMBEARER_PASS',7],['MAP_MOND_WOLVENDOM',7],['MAP_CRPG_SWORD_CEMETERY',6],['MAP_CRPG_ENTOMBED_OUTSKIRTS',6],['MAP_CRPG_LAIR_WEST_RUINS',5]]
  .map(([map,rounds],i)=>challenge('MOND',map,rounds,25,1500,M_ITEMS[i%3])),
 ...[['MAP_CRPG_WHISPER_HUNT',['PYRO','CRYO']],['MAP_CRPG_STORMBEARER_MOUNTAINS',['ELECTRO','PYRO']],['MAP_CRPG_STORMBEARER_POINT',['CRYO','ELECTRO','PYRO']],['MAP_CRPG_DADAUPA_GORGE',['PYRO','HYDRO']],
   ['MAP_V141_THOUSAND_RAVINE',['CRYO','GEO']],['MAP_CRPG_BRIGHTCROWN_CANYON',['ELECTRO','CRYO','HYDRO']],['MAP_CRPG_WYRMREST_VALLEY',['PYRO','CRYO','GEO']],['MAP_CRPG_LAIR_EAST_RUINS',['ANEMO','ELECTRO','PYRO']]]
  .map(([map,elements],i)=>totem('MOND',map,elements,30,1800,M_ITEMS[(i+1)%3])),
 timed('MOND','MAP_MOND_CITY','SCENERY_DAWN','EXQUISITE',20,1200,M_ITEMS[0]),timed('MOND','MAP_MOND_SPRINGVALE','SCENERY_NOON','COMMON',15,1000,M_ITEMS[1]),
 timed('MOND','MAP_MOND_DAWN_WINERY','SCENERY_DUSK','LUXURIOUS',40,2500,{MAT_CHAR_EXP_HERO:1}),timed('MOND','MAP_CRPG_FALCON_COAST','SCENERY_DAWN','EXQUISITE',20,1200,M_ITEMS[2]),
 timed('MOND','MAP_CRPG_STARFELL_LAKE','SCENERY_DUSK','EXQUISITE',20,1200,M_ITEMS[0]),timed('MOND','MAP_V141_MUSK_REEF','SCENERY_NOON','PRECIOUS',30,1800,M_ITEMS[1]),
 timed('MOND','MAP_CRPG_DAWN_BANK','SCENERY_DAWN','COMMON',15,1000,M_ITEMS[2]),timed('MOND','MAP_MOND_TEMPLE_LION','SCENERY_DUSK','PRECIOUS',30,1800,M_ITEMS[0])];
const LIYUE_NEW=[
 ...[['MAP_LIYUE_PLAINS',4],['MAP_LY_DETAIL_DIHUA',4],['MAP_LY_DETAIL_GUILI',5],['MAP_LY_DETAIL_YAOGUANG',5],['MAP_LY_DETAIL_HULAO',5],['MAP_LY_DETAIL_LINGJU',6],['MAP_LY_DETAIL_CHASM_GATE',7],['MAP_V141_GUYUN_WRECK',5]]
  .map(([map,rounds],i)=>challenge('LIYUE',map,rounds,30,2500,L_ITEMS[i%3])),
 ...[['MAP_LY_DETAIL_MINGYUN',['GEO','ELECTRO']],['MAP_LY_DETAIL_LUHUA',['HYDRO','GEO','CRYO']],['MAP_LY_DETAIL_TIANHENG',['GEO','PYRO','HYDRO']],['MAP_LIYUE_JUEYUN',['ANEMO','GEO','CRYO']],
   ['MAP_LY_DETAIL_AOCANG',['CRYO','HYDRO','ELECTRO','GEO']],['MAP_LY_DETAIL_HUAGUANG',['PYRO','ELECTRO','GEO','HYDRO']],['MAP_LY_DETAIL_CHASM_RIM',['GEO','PYRO','CRYO','ELECTRO']],['MAP_V141_GUYUN_CHANNEL',['HYDRO','ANEMO','GEO','PYRO']]]
  .map(([map,elements],i)=>totem('LIYUE',map,elements,35,3000,L_ITEMS[(i+1)%3])),
 timed('LIYUE','MAP_LY_DETAIL_WHARF','SCENERY_DAWN','EXQUISITE',25,2000,L_ITEMS[0]),timed('LIYUE','MAP_LY_DETAIL_CHIHU','SCENERY_DUSK','PRECIOUS',30,2500,L_ITEMS[1]),
 timed('LIYUE','MAP_LIYUE_QINGCE','SCENERY_NOON','EXQUISITE',25,2000,L_ITEMS[2]),timed('LIYUE','MAP_LY_DETAIL_QINGCE_FIELDS','SCENERY_DUSK','LUXURIOUS',40,4000,{MAT_CHAR_EXP_HERO:2}),
 timed('LIYUE','MAP_LY_DETAIL_SHIMEN','SCENERY_DAWN','COMMON',20,1500,L_ITEMS[0]),timed('LIYUE','MAP_LY_DETAIL_WANGSHU','SCENERY_NOON','PRECIOUS',30,2500,L_ITEMS[1]),
 timed('LIYUE','MAP_LY_DETAIL_NORTH_GATE','SCENERY_DAWN','EXQUISITE',25,2000,L_ITEMS[2]),timed('LIYUE','MAP_CRPG_LIYUE_BANK','SCENERY_DUSK','PRECIOUS',30,2500,L_ITEMS[0])];
const CHESTS=[...MOND_PUZZLES.map((c,i)=>({...c,id:'CHEST_M'+String(i+1).padStart(2,'0')})),...MOND_HIDDEN.map((c,i)=>({...c,id:'CHEST_M'+String(i+19)})),
 ...LIYUE_PUZZLES.map((c,i)=>({...c,id:'CHEST_L'+String(i+1).padStart(2,'0')})),...LIYUE_HIDDEN.map((c,i)=>({...c,id:'CHEST_L'+String(i+19)})),
 ...MOND_NEW.map((c,i)=>({...c,id:'CHEST_M'+String(i+25)})),...LIYUE_NEW.map((c,i)=>({...c,id:'CHEST_L'+String(i+25)}))];
const BY_ID=new Map(CHESTS.map(c=>[c.id,c]));
// ---------- deterministic randomness ----------
function hash(str){let h=2166136261;for(const ch of String(str)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function rng(seed){let a=seed>>>0;return ()=>{a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
const shuffle=(list,r)=>{const a=list.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
// Where a chest sits in the panorama (percent of the picture): low enough to stand on the ground.
const place=c=>{const h=hash(c.id+':place');return {x:12+h%74,y:64+(h>>>8)%20};};
// ---------- the four games ----------
const BOX={4:[2,2],6:[2,3]};
function makeSudoku(n,r){
 const [br,bc]=BOX[n],grid=[];
 for(let y=0;y<n;y++){const row=[];for(let x=0;x<n;x++)row.push((bc*(y%br)+Math.floor(y/br)+x)%n);grid.push(row);}
 const bands=shuffle([...Array(n/br).keys()],r),stacks=shuffle([...Array(n/bc).keys()],r);
 const rows=bands.flatMap(b=>shuffle([...Array(br).keys()],r).map(i=>b*br+i)),cols=stacks.flatMap(s=>shuffle([...Array(bc).keys()],r).map(i=>s*bc+i)),digits=shuffle([...Array(n).keys()],r);
 const solution=rows.map(y=>cols.map(x=>digits[grid[y][x]]+1)).flat();
 const blanks=n===4?9:20,hide=new Set(shuffle([...Array(n*n).keys()],r).slice(0,blanks));
 return {n,box:[br,bc],givens:solution.map((v,i)=>hide.has(i)?0:v)};
}
function sudokuOk(p,answer){
 const {n,box:[br,bc],givens}=p;if(!Array.isArray(answer)||answer.length!==n*n)return false;
 if(answer.some((v,i)=>!Number.isInteger(v)||v<1||v>n||givens[i]&&givens[i]!==v))return false;
 const ok=cells=>new Set(cells.map(i=>answer[i])).size===n;
 for(let k=0;k<n;k++){if(!ok([...Array(n).keys()].map(x=>k*n+x))||!ok([...Array(n).keys()].map(y=>y*n+k)))return false;}
 for(let by=0;by<n;by+=br)for(let bx=0;bx<n;bx+=bc){const cells=[];for(let y=0;y<br;y++)for(let x=0;x<bc;x++)cells.push((by+y)*n+bx+x);if(!ok(cells))return false;}
 return true;
}
function makeSwap(n,r){let board;do{board=shuffle([...Array(n*n).keys()],r);}while(board.filter((v,i)=>v!==i).length<Math.min(6,n*n-2));return {n,board};}
function swapOk(p,answer){
 if(!Array.isArray(answer)||answer.length>80)return false;const b=p.board.slice();
 for(const m of answer){if(!Array.isArray(m)||m.length!==2)return false;const [i,j]=m;if(![i,j].every(k=>Number.isInteger(k)&&k>=0&&k<b.length)||i===j)return false;[b[i],b[j]]=[b[j],b[i]];}
 return b.every((v,i)=>v===i);
}
const neighbours=(n,i)=>{const x=i%n,y=Math.floor(i/n),out=[];if(x>0)out.push(i-1);if(x<n-1)out.push(i+1);if(y>0)out.push(i-n);if(y<n-1)out.push(i+n);return out;};
function makeSlide(n,r){
 // Random legal moves from the solved picture, so the scramble can always be undone.
 const N=n*n;let board,tries=0;
 do{board=[...Array(N).keys()];let blank=N-1,prev=-1;for(let k=0;k<70;k++){const opts=neighbours(n,blank).filter(i=>i!==prev);const pick=opts[Math.floor(r()*opts.length)];board[blank]=board[pick];board[pick]=N-1;prev=blank;blank=pick;}tries++;}
 while(board.reduce((d,v,i)=>v===N-1?d:d+Math.abs(v%n-i%n)+Math.abs(Math.floor(v/n)-Math.floor(i/n)),0)<8&&tries<20);
 return {n,board};
}
function slideOk(p,answer){
 if(!Array.isArray(answer)||answer.length>400)return false;const n=p.n,N=n*n,b=p.board.slice();
 for(const i of answer){if(!Number.isInteger(i)||i<0||i>=N)return false;const blank=b.indexOf(N-1);if(!neighbours(n,blank).includes(i))return false;b[blank]=b[i];b[i]=N-1;}
 return b.every((v,i)=>v===i);
}
const press=(n,state,i)=>{for(const k of [i,...neighbours(n,i)])state[k]^=1;};
function makeLights(n,r){
 let state;do{state=Array(n*n).fill(1);for(const i of shuffle([...Array(n*n).keys()],r).slice(0,n===3?3:5))press(n,state,i);}while(state.every(v=>v===1));
 return {n,state};
}
function lightsOk(p,answer){if(!Array.isArray(answer)||answer.length>80)return false;const s=p.state.slice();for(const i of answer){if(!Number.isInteger(i)||i<0||i>=s.length)return false;press(p.n,s,i);}return s.every(v=>v===1);}
// Changes that look like part of the scene: an object that was not there, a mirrored piece, a recoloured piece. They sit
// in the lower part of the picture (land, roofs, water), not in the open sky where any change looks like a stain.
// Mond (3) is meant to be easy. Liyue (5) is subtle (user: 「틀린그림 찾기가 너무 쉬운데… 몬드는 이 정도가 맞을지도」):
// smaller pieces, a slight colour shift, small faded objects.
const SPOT_KINDS=['icon','flip','hue'];
function makeSpot(count,r){
 const subtle=count>3,cells=shuffle([...Array(24).keys()],r).slice(0,count),kinds=[...shuffle(SPOT_KINDS,r),...shuffle(SPOT_KINDS,r)];
 return {count,subtle,radius:subtle?4.5:7,diffs:cells.map((cell,i)=>({x:Math.round(10+(cell%6)*15.5+r()*6),y:Math.round(40+Math.floor(cell/6)*14+r()*5),kind:kinds[i%kinds.length],turn:subtle?35+Math.floor(r()*55):60+Math.floor(r()*240),icon:Math.floor(r()*1000)}))};
}
function spotOk(p,answer){return Array.isArray(answer)&&answer.length===p.count&&new Set(answer).size===p.count&&answer.every(i=>Number.isInteger(i)&&i>=0&&i<p.count);}
const MAKE={SUDOKU:makeSudoku,SWAP:makeSwap,SLIDE:makeSlide,LIGHTS:makeLights,SPOT:makeSpot},CHECK={SUDOKU:sudokuOk,SWAP:swapOk,SLIDE:slideOk,LIGHTS:lightsOk,SPOT:spotOk};
// 0.15.2: the regional events (runtime_events_v0152.js) reuse the games and sizes.
api.chestRules={version:1,tiers:TIER,games:GAME,hows:HOW,chests:CHESTS.map(c=>({...c,reward:{...c.reward,items:{...c.reward.items}}})),check:CHECK,make:MAKE,level:LEVEL};
// ---------- state ----------
P.chestState=function(){return this.s.chests??={version:1,opened:{}};};
P.chestOpened=function(id){return !!this.s.chests?.opened?.[id];};
P.chestNight=function(){const h=Number(String(this.s.global.WORLD_TIME||'12:00').split(':')[0]);return h>=19||h<5;};
P.chestPuzzle=function(id){
 const c=BY_ID.get(id);if(!c?.game)return null;const r=rng(hash(id+'|'+(this.s.global.SAVE_ID||'save'))),size=LEVEL[c.region][c.game];
 return {id,game:c.game,name:GAME[c.game],region:c.region,...MAKE[c.game](size,r)};
};
// Why the chest cannot be opened now ('' = it can). 0.15.2: a main story in progress no longer keeps the chests shut
// (user: 「메인스토리 안밀면 그냥 아예 열 수가 없네」); only a battle, its preparation or work in hand does.
P.chestReason=function(id){
 const c=BY_ID.get(id);if(!c)return '보물상자를 찾을 수 없습니다.';if(this.chestOpened(id))return '이미 연 보물상자입니다.';
 if(this.s.runtime||this.s.battlePreparation||this.s.storyRecovery)return '전투를 마친 뒤 열 수 있습니다.';
 if(this.s.lifeJob||this.s.worldJob)return '하고 있는 일을 마친 뒤 열 수 있습니다.';
 if(this.s.global.CURRENT_MAP_ID!==c.map)return '이 보물상자가 있는 곳에 가야 열 수 있습니다.';
 if((c.how==='SCENERY_NIGHT'||c.night)&&!this.chestNight())return '밤(19시~5시)에만 보이는 보물상자입니다.';
 if(TIMES[c.how]&&!this.chestHourOk(c))return TIMES[c.how][2]+'에만 보이는 보물상자입니다.';
 return '';
};
// 0.16.33: the world's hour against a time chest's window.
P.chestHourOk=function(c){const t=TIMES[c?.how];if(!t)return true;const h=Number(String(this.s.global.WORLD_TIME||'12:00').split(':')[0]);return h>=t[0]&&h<t[1];};
// A challenge won within its rounds leaves its chest standing there (until it is opened).
P.chestWon=function(id){return !!this.s.chests?.won?.[id];};
// Who of the party can light a stone: each active member and their element (the traveller's chosen one; the 이세계인 has none).
P.chestPartyElements=function(){
 const out=[];for(const slot of this.s.party||[]){if(!slot?.active||!slot.source)continue;const id=slot.source;
  let element=null;if(slot.type==='PLAYER'){if(this.s.global.STORY_ROUTE_ID==='ROUTE_TRAVELER')element=this.travelerElement?.()||'ANEMO';}
  else{const tag=String(this.tables['07_CHAR_DB']?.get(id)?.[3]||'').match(/\[(불|물|얼음|번개|바람|바위|풀)\]/)?.[1];element=Object.keys(ELEMENT_NAME).find(k=>ELEMENT_NAME[k]===tag)||null;}
  out.push({id,element});}
 return out;
};
// Why the stones cannot all be lit with this party ('' = they can).
P.chestTotemReason=function(c){const have=new Set(this.chestPartyElements().map(m=>m.element).filter(Boolean));const lack=[...new Set(c.totem.filter(e=>!have.has(e)))];return lack.length?'파티에 '+lack.map(e=>ELEMENT_NAME[e]).join('·')+' 원소 동료가 있어야 비석을 밝힐 수 있습니다.':'';};
const rewardText=(r,c)=>{const parts=['원석 '+c.reward.primogem+'개',c.reward.mora.toLocaleString('ko-KR')+' 모라'];for(const [id,n] of Object.entries(c.reward.items))parts.push((r.tables['14_ITEM_DB'].get(id)?.[1]||id)+' '+n+'개');return parts.join(' · ');};
// The scenery (V) shows the place's own chests: the old two kinds and, since 0.16.33, the challenge device, the stones and the time chests.
const SCENE_HOWS=new Set(['SCENERY','SCENERY_NIGHT','CHALLENGE','TOTEM','SCENERY_DAWN','SCENERY_NOON','SCENERY_DUSK']);
P.chestView=function(c){
 const pos=SCENE_HOWS.has(c.how)?place(c):null;
 const v={id:c.id,region:c.region,map:c.map,mapName:this.tables['32_MAP_DB'].get(c.map)?.[2]||c.map,tier:c.tier,tierName:TIER[c.tier].name,icon:TIER[c.tier].icon,
  game:c.game,gameName:c.game?GAME[c.game]:'',how:c.how,howName:HOW[c.how],hidden:!c.game&&!c.kind,night:c.how==='SCENERY_NIGHT'||!!c.night,spot:c.spot||null,pos,kind:c.kind||null,
  reward:{primogem:c.reward.primogem,mora:c.reward.mora,items:{...c.reward.items},text:rewardText(this,c)},opened:this.chestOpened(c.id),reason:this.chestReason(c.id)};
 if(c.kind==='CHALLENGE'){v.rounds=c.rounds;v.won=this.chestWon(c.id);}
 if(c.kind==='TOTEM'){v.totem=c.totem.map(e=>({element:e,name:ELEMENT_NAME[e]}));v.party=this.chestPartyElements();v.totemReason=this.chestTotemReason(c);}
 if(TIMES[c.how])v.timeName=TIMES[c.how][2];
 return v;
};
// The chests a screen should show right now: here, unopened, and visible at this hour.
P.chestsHere=function(how){return CHESTS.filter(c=>c.map===this.s.global.CURRENT_MAP_ID&&(!how||c.how===how||how==='SCENERY'&&SCENE_HOWS.has(c.how))&&!this.chestOpened(c.id)&&!this.chestReason(c.id)).map(c=>this.chestView(c));};
// The handbook's treasure page: how many chests each region holds and how many are found, never where.
P.chestJournal=function(){
 return ['MOND','LIYUE'].map(region=>{
  const list=CHESTS.filter(c=>c.region===region),open=list.filter(c=>this.chestOpened(c.id)),count=f=>({found:open.filter(f).length,total:list.filter(f).length});
  return {region,name:region==='MOND'?'몬드':'리월',found:open.length,total:list.length,primogem:list.reduce((n,c)=>n+c.reward.primogem,0),gained:open.reduce((n,c)=>n+c.reward.primogem,0),
   puzzles:count(c=>!!c.game),hidden:count(c=>!c.game&&!c.kind),challenge:count(c=>c.kind==='CHALLENGE'),totem:count(c=>c.kind==='TOTEM'),time:count(c=>c.kind==='TIME'),
   tiers:Object.keys(TIER).map(t=>({tier:t,name:TIER[t].name,icon:TIER[t].icon,...count(c=>c.tier===t)})).filter(t=>t.total)};});
};
// A challenge chest not yet won starts its fight: one of the place's own groups, picked by the chest (the same each time).
P.chestChallengeStart=function(c){
 const m=this.tables['32_MAP_DB'].get(c.map);let rows=[];try{rows=this.encounterPoolRows?.(m)||[];}catch{}
 if(!rows.length)fail('CHEST','이곳에는 도전할 상대가 없습니다.');
 const group=rows[hash(c.id+'|group')%rows.length][5];
 this._chestChallenge={id:c.id,rounds:c.rounds};try{this.startBattle(group,CH_ORIGIN+c.id);}finally{this._chestChallenge=null;}
 if(!this.s.runtime?.chestChallenge)fail('CHEST','도전을 시작하지 못했습니다.');
 return {chest:c.id,challenge:true,outcome:'BATTLE',rounds:c.rounds};
};
P.chestOpen=function(id,answer){
 const why=this.chestReason(id);if(why)fail('CHEST',why);const c=BY_ID.get(id);
 if(c.kind==='CHALLENGE'&&!this.chestWon(id))return this.chestChallengeStart(c);
 if(c.kind==='TOTEM'){
  // `answer` names who lit each stone, in the stones' order: someone in the party now, of that stone's element.
  const party=this.chestPartyElements();
  if(!Array.isArray(answer)||answer.length!==c.totem.length||!answer.every((who,i)=>party.some(m=>m.id===who&&m.element===c.totem[i])))fail('CHEST',this.chestTotemReason(c)||'비석이 아직 모두 밝혀지지 않았습니다.');
 }
 if(c.game&&!CHECK[c.game](this.chestPuzzle(id),answer))fail('CHEST','퍼즐이 아직 풀리지 않았습니다.');
 const g=this.s.global,w=c.reward;g.PRIMOGEM=(Number(g.PRIMOGEM)||0)+w.primogem;g.MORA=(Number(g.MORA)||0)+w.mora;
 for(const [item,n] of Object.entries(w.items))this.giveItem(item,n);
 const st=this.chestState();st.opened[id]={day:Number(g.WORLD_DAY)||1};
 if(st.won?.[id]){delete st.won[id];if(!Object.keys(st.won).length)delete st.won;}
 const list=CHESTS.filter(x=>x.region===c.region);
 return {chest:id,tier:c.tier,tierName:TIER[c.tier].name,icon:TIER[c.tier].icon,primogem:w.primogem,mora:w.mora,items:{...w.items},found:list.filter(x=>this.chestOpened(x.id)).length,total:list.length,region:c.region};
};
P.actionReason=function(type,a={}){if(type==='CHEST_OPEN')return this.chestReason(a.chest);return old.actionReason.call(this,type,a);};
P.apply=function(a){if(a.type==='CHEST_OPEN')return this.chestOpen(String(a.chest||''),a.answer);return old.apply.call(this,a);};
// ---------- 0.16.33 the challenge fight ----------
// Counted like the place's own fights for the party-size balance (as the regional events' fights are).
P.fieldBattlePolicy=function(groupRow,origin,allies,members){return old.fieldBattlePolicy.call(this,groupRow,String(origin).startsWith(CH_ORIGIN)?'RANDOM':origin,allies,members);};
P.startBattle=function(group,origin='EXPLICIT',...rest){
 const before=this.s.runtime,out=old.startBattle.call(this,group,origin,...rest),b=this.s.runtime,e=this._chestChallenge;
 if(!b||b===before||!e||!String(origin).startsWith(CH_ORIGIN))return out;
 b.chestChallenge={version:1,chest:e.id,rounds:e.rounds};
 b.log.push({card:'CHEST_CHALLENGE',cardName:'도전',text:'도전 · '+e.rounds+'라운드 안에 모두 쓰러뜨리세요!',round:b.round});
 if(b.encounter){b.encounter.label='도전 · '+e.rounds+'라운드 안에';b.encounter.text=e.rounds+'라운드 안에 모두 쓰러뜨리면 보물상자가 나타납니다. 늦게 이기거나 지면 상자는 나오지 않고, 다시 도전할 수 있습니다.';}
 return out;
};
// Won within the rounds: the chest stands there, ready to be opened. Too slow or lost: try again.
P.finishBattle=function(victory){
 const b=this.s.runtime,e=b?.chestChallenge?{...b.chestChallenge}:null,round=Number(b?.round)||0,result=old.finishBattle.call(this,victory);
 if(!e||!result||typeof result!=='object')return result;
 const c=BY_ID.get(e.chest),won=!!victory&&round<=e.rounds&&!!c&&!this.chestOpened(e.chest);
 if(won){const st=this.chestState();st.won??={};st.won[e.chest]={day:Number(this.s.global.WORLD_DAY)||1,rounds:round};}
 const info={chest:e.chest,limit:e.rounds,rounds:round,victory:!!victory,won,tier:c?.tier||null,tierName:c?TIER[c.tier].name:'',icon:c?TIER[c.tier].icon:'common'};
 const key=result.battleId||result.id,add=x=>{if(x&&typeof x==='object')x.chestChallenge={...info};};
 add(result);if(this.s.combatReceipts?.[key]&&this.s.combatReceipts[key]!==result)add(this.s.combatReceipts[key]);
 let settled=null;try{settled=JSON.parse(this.s.global.LAST_BATTLE_RESULT_JSON||'null');}catch{}
 if(settled&&(settled.battleId||settled.id)===key){add(settled);this.s.global.LAST_BATTLE_RESULT_JSON=JSON.stringify(settled);}
 return result;
};
P.validateSave=function(s){
 const out=old.validateSave.call(this,s),c=out.chests;
 if(c!==undefined){
  if(!c||typeof c!=='object'||c.version!==1||!c.opened||typeof c.opened!=='object'||Array.isArray(c.opened))fail('CHEST_SAVE','보물상자 기록이 손상되었습니다.');
  for(const [id,v] of Object.entries(c.opened))if(!BY_ID.has(id)||!v||!Number.isInteger(v.day)||v.day<1)fail('CHEST_SAVE','보물상자 기록이 손상되었습니다.');
  if(c.won!==undefined){if(!c.won||typeof c.won!=='object'||Array.isArray(c.won))fail('CHEST_SAVE','보물상자 기록이 손상되었습니다.');
   for(const [id,v] of Object.entries(c.won))if(BY_ID.get(id)?.kind!=='CHALLENGE'||c.opened[id]||!v||!Number.isInteger(v.day)||v.day<1||!Number.isInteger(v.rounds)||v.rounds<0)fail('CHEST_SAVE','보물상자 기록이 손상되었습니다.');}
 }
 const r=out.runtime?.chestChallenge;
 if(r!==undefined&&(!r||r.version!==1||BY_ID.get(r.chest)?.kind!=='CHALLENGE'||!Number.isInteger(r.rounds)||r.rounds<1))fail('CHEST_SAVE','보물상자 도전 기록이 손상되었습니다.');
 return out;
};
})(globalThis);
